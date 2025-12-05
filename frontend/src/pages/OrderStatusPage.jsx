import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { ArrowLeftIcon, PlusCircleIcon, HomeIcon } from '@heroicons/react/24/outline';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * OrderStatusPage Component
 * Real-time order tracking with context-aware navigation
 * URL: /order-status/:orderNumber
 */
const OrderStatusPage = () => {
  const { orderNumber: rawOrderNumber } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { socket, isConnected } = useSocket();

  // Normalize order number (guard against undefined / empty)
  const orderNumber = rawOrderNumber && rawOrderNumber !== 'undefined'
    ? String(rawOrderNumber)
    : null;

  // Get navigation context from state
  const { from, restaurantId, tableNumber, orderId } = location.state || {};

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch order details
  const fetchOrderStatus = async () => {
    try {
      // Only show the full-page loader on the first load.
      setLoading((prev) => (order ? prev : true));
      setError('');

      let response;
      let data;

      // 1) If we came directly from confirmation and have an orderId, prefer that.
      if (from === 'confirmation' && orderId) {
        response = await fetch(`${API_URL}/api/orders/${orderId}`);
        data = await response.json();

        if (response.ok && data.success) {
          setOrder(data.data);
          return;
        }
      }

      // 2) Try lookup by order number (for QR "check existing order" path)
      response = await fetch(`${API_URL}/api/orders/by-number/${orderNumber}`);
      data = await response.json();

      if (response.ok && data.success) {
        setOrder(data.data);
        return;
      }

      // 3) Fallback: if orderNumber is numeric, try treating it as an ID
      const numericId = Number(orderNumber);
      if (Number.isInteger(numericId)) {
        const idResponse = await fetch(`${API_URL}/api/orders/${numericId}`);
        const idData = await idResponse.json();
        if (idResponse.ok && idData.success) {
          setOrder(idData.data);
          return;
        }
      }

      setError(data?.message || 'Order not found');
    } catch (err) {
      console.error('Error fetching order:', err);
      setError('Unable to load order status');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (orderNumber) {
      fetchOrderStatus();
    } else {
      setLoading(false);
      setError('Missing order number in URL');
    }
  }, [orderNumber]);

  // Real-time updates via Socket.IO (full order + status fallback)
  useEffect(() => {
    if (!socket || !orderNumber) return;

    const handleOrderUpdated = (updated) => {
      const updatedNumber = updated.order_number || String(updated.id);
      if (updatedNumber !== orderNumber) return;

      setOrder((prev) => ({
        ...(prev || {}),
        ...updated
      }));
    };

    const handleStatusUpdate = (data) => {
      if (data.orderNumber !== orderNumber) return;

      setOrder((prev) => ({
        ...(prev || {}),
        status: data.status,
        estimated_completion: data.estimatedTime ?? prev?.estimated_completion
      }));
    };

    socket.on('order-updated', handleOrderUpdated);
    socket.on('order-status-update', handleStatusUpdate);

    return () => {
      socket.off('order-updated', handleOrderUpdated);
      socket.off('order-status-update', handleStatusUpdate);
    };
  }, [socket, orderNumber]);

  // Join the table room once we know the table_id
  useEffect(() => {
    if (!socket || !isConnected || !order?.table_id) return;

    const tableId = order.table_id;
    socket.emit('join-table', tableId);

    return () => {
      socket.emit('leave-table', tableId);
    };
  }, [socket, isConnected, order?.table_id]);

  /**
   * Manually refresh order status without full-page reload
   */
  const handleRefresh = async () => {
    if (!orderNumber) return;

    try {
      setIsRefreshing(true);
      await fetchOrderStatus();
    } finally {
      setIsRefreshing(false);
    }
  };

  /**
   * Context-aware back navigation
   */
  const handleBack = () => {
    if (from === 'qr-check' && restaurantId && tableNumber) {
      // From QR check, go back to menu
      navigate(`/restaurant/${restaurantId}/menu`, {
        state: {
          orderType: 'dine-in',
          tableNumber: tableNumber,
          restaurantId: restaurantId
        }
      });
    } else {
      // Default: go to home
      navigate('/');
    }
  };

  /**
   * Handle ordering more items (dine-in only)
   */
  const handleOrderMore = () => {
    if (restaurantId && tableNumber) {
      navigate(`/restaurant/${restaurantId}/menu`, {
        state: {
          orderType: 'dine-in',
          tableNumber: tableNumber,
          restaurantId: restaurantId
        }
      });
    }
  };

  // Status display configuration
  const statusConfig = {
    'pending': { label: 'Received', icon: '⏳', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
    'confirmed': { label: 'Confirmed', icon: '✓', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    'preparing': { label: 'Preparing', icon: '👨‍🍳', color: 'text-brand-orange', bgColor: 'bg-brand-orange/10' },
    'ready': { label: 'Ready', icon: '✓', color: 'text-brand-lime', bgColor: 'bg-brand-lime/10' },
    'served': { label: 'Served', icon: '🍽️', color: 'text-green-500', bgColor: 'bg-green-500/10' },
    'completed': { label: 'Completed', icon: '✓', color: 'text-green-500', bgColor: 'bg-green-500/10' }
  };

  const currentStatus = order?.status || 'pending';
  const statusInfo = statusConfig[currentStatus] || statusConfig['pending'];

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-text-secondary">Loading order status...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center px-4">
        <div className="bg-dark-card rounded-2xl p-8 max-w-md w-full border border-dark-surface">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-2">Error</h2>
            <p className="text-text-secondary">{error}</p>
          </div>

          <button
            onClick={handleBack}
            className="w-full bg-brand-lime text-dark-bg px-6 py-3 rounded-full font-bold hover:bg-brand-lime/90 transition-all"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-text-secondary">Order not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#000000] pb-24">
      {/* BACKGROUND GRADIENT */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at center,
              #E35504ff 0%,
              #E35504aa 15%,
              #000000 35%,
              #5F2F14aa 55%,
              #B5FF00ff 80%,
              #000000 100%
            )
          `,
          filter: "blur(40px)",
          backgroundSize: "180% 180%",
          opacity: 0.55,
        }}
      ></div>

      {/* Header */}
      <div className="container mx-auto px-4 pt-24 pb-8 max-w-3xl relative z-10">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={handleBack}
            className="hover:bg-white/10 rounded-xl p-2 transition-all flex items-center gap-2 text-white"
          >
            <ArrowLeftIcon className="w-6 h-6" />
            <span className="hidden sm:inline">
              {from === 'qr-check' ? 'Back to Menu' : 'Back to Home'}
            </span>
          </button>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white font-display">Order Status</h1>
            <p className="text-white/60 text-sm">Order #{order.order_number || order.id}</p>
          </div>
          <div className="w-20"></div>
        </div>
        {/* Status Tracker */}
        <div className={`${statusInfo.bgColor} border-2 border-${statusInfo.color.replace('text-', '')} rounded-2xl p-6 sm:p-8 mb-6`}>
          <div className="text-center">
            <div className="text-6xl mb-4">{statusInfo.icon}</div>
            <h2 className={`text-3xl font-bold ${statusInfo.color} mb-2`}>
              {statusInfo.label}
            </h2>
            {order.estimated_completion && currentStatus === 'preparing' && (
              <p className="text-text-secondary">
                Estimated time: {order.estimated_completion}
              </p>
            )}
          </div>
        </div>

        {/* Progress Steps */}
        <div className="bg-dark-card rounded-2xl p-6 mb-6 border border-dark-surface">
          <div className="space-y-4">
            {Object.entries(statusConfig).map(([status, config], index) => {
              const isActive = currentStatus === status;
              const isPast = Object.keys(statusConfig).indexOf(currentStatus) > index;
              const isCompleted = isActive || isPast;

              return (
                <div key={status} className="flex items-center gap-4">
                  <div className={`
                    flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                    ${isCompleted ? config.bgColor + ' border-2 border-' + config.color.replace('text-', '') : 'bg-dark-surface border-2 border-dark-surface'}
                  `}>
                    {isCompleted ? (
                      <span className={`text-xl ${config.color}`}>{config.icon}</span>
                    ) : (
                      <span className="text-text-secondary text-sm">{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold ${isCompleted ? config.color : 'text-text-secondary'}`}>
                      {config.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Details */}
        <div className="bg-dark-card rounded-2xl p-6 mb-6 border border-dark-surface">
          <h3 className="text-xl font-bold text-text-primary mb-4">Order Details</h3>

          {order.items && order.items.length > 0 ? (
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-brand-orange text-white text-xs font-bold rounded-full">
                        {item.quantity}
                      </span>
                      <span className="font-semibold text-text-primary">
                        {item.menu_item_name || `Item ${item.menu_item_id}`}
                      </span>
                    </div>
                    {item.special_instructions && (
                      <p className="text-sm text-brand-orange italic ml-8 mt-1">
                        Note: {item.special_instructions}
                      </p>
                    )}
                  </div>
                  <span className="text-text-primary font-semibold ml-4">
                    {(() => {
                      const raw =
                        item.subtotal ??
                        (Number(item.menu_item_price || 0) * Number(item.quantity || 0));
                      const value = Number(raw);
                      return isNaN(value) ? '$0.00' : `$${value.toFixed(2)}`;
                    })()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-secondary text-center">No items found</p>
          )}

          <div className="border-t border-dark-surface mt-4 pt-4">
            <div className="flex justify-between items-center text-xl font-bold">
              <span className="text-text-primary">Total</span>
              <span className="text-brand-lime">${parseFloat(order.total_amount || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="
              flex-1 bg-dark-surface text-text-primary px-6 py-4 rounded-xl font-bold border-2 border-dark-surface
              hover:border-text-secondary disabled:opacity-50 disabled:cursor-not-allowed
              transition-all flex items-center justify-center gap-2
            "
          >
            {isRefreshing ? 'Refreshing…' : 'Refresh Status'}
          </button>

          {order.order_type === 'dine-in' && restaurantId && tableNumber && (
            <button
              onClick={handleOrderMore}
              className="
                flex-1 bg-brand-orange text-white px-6 py-4 rounded-xl font-bold
                hover:bg-brand-orange/90 transition-all flex items-center justify-center gap-2
                shadow-lg hover:shadow-brand-orange/30
              "
            >
              <PlusCircleIcon className="w-5 h-5" />
              Order More Items
            </button>
          )}

          <button
            onClick={() => navigate('/')}
            className="
              flex-1 bg-dark-surface text-text-primary px-6 py-4 rounded-xl font-bold border-2 border-dark-surface
              hover:border-text-secondary transition-all flex items-center justify-center gap-2
            "
          >
            <HomeIcon className="w-5 h-5" />
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderStatusPage;

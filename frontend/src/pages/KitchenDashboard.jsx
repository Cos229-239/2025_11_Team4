import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket, useSocketEvent, useSocketEmit } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import OrderCard from '../components/OrderCard';
import Logo from '../components/Logo';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * KitchenDashboard Component
 * Real-time order management for kitchen staff
 * Updated to match Team Vision dark theme design
 */
const KitchenDashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, pending, preparing, ready

  const { socket, isConnected } = useSocket();
  const emit = useSocketEmit();

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/kitchen-login');
  };

  // Fetch initial active orders on mount
  const fetchActiveOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/orders/active`);
      const data = await response.json();

      if (data.success) {
        setOrders(data.data);
      } else {
        setError('Failed to load orders');
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // Join kitchen room when socket connects
  useEffect(() => {
    if (socket && isConnected) {
      console.log('🔌 Joining kitchen room...');
      emit('join-kitchen');

      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [socket, isConnected, emit]);

  // Fetch orders on mount
  useEffect(() => {
    fetchActiveOrders();
  }, []);

  // Handle new order event - adds order to state
  const handleNewOrder = useCallback((newOrder) => {
    console.log('📥 New order received:', newOrder);

    setOrders((prevOrders) => {
      // Check if order already exists (avoid duplicates)
      const exists = prevOrders.some((order) => order.id === newOrder.id);
      if (exists) {
        return prevOrders;
      }

      // Add new order to the beginning of the list
      return [newOrder, ...prevOrders];
    });

    // Show browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🔔 New Order!', {
        body: `Table ${newOrder.table_id} - ${newOrder.items.length} item(s) - $${parseFloat(newOrder.total_amount).toFixed(2)}`,
        icon: '/restaurant-icon.png',
        tag: `order-${newOrder.id}`,
      });
    }

    // Play sound notification (optional)
    try {
      const audio = new Audio('/notification.mp3');
      audio.play().catch((e) => console.log('Audio play failed:', e));
    } catch (e) {
      console.log('Audio not available');
    }
  }, []);

  // Handle order update event - updates order status
  const handleOrderUpdated = useCallback((updatedOrder) => {
    console.log('🔄 Order updated:', updatedOrder);

    setOrders((prevOrders) => {
      // If order is completed or cancelled, remove it from active orders
      if (updatedOrder.status === 'completed' || updatedOrder.status === 'cancelled') {
        return prevOrders.filter((order) => order.id !== updatedOrder.id);
      }

      // Otherwise, update the order in the list
      const orderIndex = prevOrders.findIndex(
        (order) => order.id === updatedOrder.id
      );

      if (orderIndex !== -1) {
        const newOrders = [...prevOrders];
        newOrders[orderIndex] = updatedOrder;
        return newOrders;
      }

      // If order doesn't exist but is active, add it
      return [updatedOrder, ...prevOrders];
    });
  }, []);

  // Listen for Socket.IO events
  useSocketEvent('new-order', handleNewOrder);
  useSocketEvent('order-updated', handleOrderUpdated);

  // Handle status update from OrderCard (optimistic update)
  const handleStatusUpdate = (updatedOrder) => {
    setOrders((prevOrders) => {
      // If order is completed or cancelled, remove it
      if (updatedOrder.status === 'completed' || updatedOrder.status === 'cancelled') {
        return prevOrders.filter((order) => order.id !== updatedOrder.id);
      }

      // Update the order
      return prevOrders.map((order) =>
        order.id === updatedOrder.id ? updatedOrder : order
      );
    });
  };

  // Filter orders based on status
  const filteredOrders = orders.filter((order) => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  // Count orders by status
  const orderCounts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    preparing: orders.filter((o) => o.status === 'preparing').length,
    ready: orders.filter((o) => o.status === 'ready').length,
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-brand-orange/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-text-secondary text-lg font-medium">Loading kitchen orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="bg-gradient-to-r from-brand-orange to-brand-orange/80 text-white shadow-2xl sticky top-0 z-20">
        <div className="container mx-auto px-6 py-3">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-4">
              <Logo size="sm" />
              <div>
                <h1 className="text-2xl font-bold">Kitchen Dashboard</h1>
                <p className="text-sm opacity-90 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Real-time Order Management
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Connection Status */}
              <div className={`flex items-center gap-2 backdrop-blur-sm rounded-xl px-4 py-2 border-2 ${
                isConnected
                  ? 'bg-status-success/20 border-status-success'
                  : 'bg-status-danger/20 border-status-danger'
              }`}>
                <div
                  className={`w-3 h-3 rounded-full ${
                    isConnected ? 'bg-status-success animate-pulse shadow-lg shadow-status-success/50' : 'bg-status-danger'
                  }`}
                ></div>
                <span className="text-sm font-bold">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              {/* Refresh Button */}
              <button
                onClick={fetchActiveOrders}
                className="bg-brand-orange text-white px-4 py-2 rounded-xl font-bold hover:bg-brand-orange/90 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="bg-status-danger text-white px-4 py-2 rounded-xl font-bold hover:bg-status-danger/90 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                title="Logout"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-3 overflow-x-auto pb-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-6 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                filter === 'all'
                  ? 'bg-brand-orange text-white shadow-lg scale-105'
                  : 'bg-dark-card text-text-secondary hover:bg-dark-card/60 border border-dark-surface'
              }`}
            >
              All Orders <span className="ml-2 inline-flex items-center justify-center text-xs font-bold px-2 py-0.5 rounded-full bg-dark-surface text-text-secondary border border-dark-surface/60">{orderCounts.all}</span>
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-6 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                filter === 'pending'
                  ? 'bg-brand-orange text-white shadow-lg scale-105'
                  : 'bg-dark-card text-text-secondary hover:bg-dark-card/60 border border-dark-surface'
              }`}
            >
              🆕 New ({orderCounts.pending})
            </button>
            <button
              onClick={() => setFilter('preparing')}
              className={`px-6 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                filter === 'preparing'
                  ? 'bg-brand-orange text-white shadow-lg scale-105'
                  : 'bg-dark-card text-text-secondary hover:bg-dark-card/60 border border-dark-surface'
              }`}
            >
              👨‍🍳 Preparing ({orderCounts.preparing})
            </button>
            <button
              onClick={() => setFilter('ready')}
              className={`px-6 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                filter === 'ready'
                  ? 'bg-brand-orange text-white shadow-lg scale-105'
                  : 'bg-dark-card text-text-secondary hover:bg-dark-card/60 border border-dark-surface'
              }`}
            >
              ✅ Ready ({orderCounts.ready})
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        {/* Error Message */}
        {error && (
          <div className="bg-status-danger/10 border border-status-danger/20 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-status-danger flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-status-danger font-semibold">{error}</p>
              </div>
              <button
                onClick={fetchActiveOrders}
                className="bg-status-danger/20 hover:bg-status-danger/30 text-status-danger px-4 py-2 rounded-lg font-semibold transition-all"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredOrders.length === 0 ? (
          <div className="bg-dark-card rounded-2xl shadow-xl p-12 text-center border border-dark-surface">
            <div className="text-8xl mb-6">
              {filter === 'all' ? '🍽️' : filter === 'pending' ? '🆕' : filter === 'preparing' ? '👨‍🍳' : '✅'}
            </div>
            <h2 className="text-3xl font-bold text-text-primary mb-3">
              {filter === 'all'
                ? 'No Active Orders'
                : `No ${filter.charAt(0).toUpperCase() + filter.slice(1)} Orders`}
            </h2>
            <p className="text-text-secondary mb-8 text-lg">
              {filter === 'all'
                ? 'New orders will appear here automatically'
                : `Orders in "${filter}" status will appear here`}
            </p>
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="bg-brand-orange text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-orange/90 transition-all shadow-lg hover:shadow-brand-orange/30 pulse-once-orange"
              >
                View All Orders
              </button>
            )}
          </div>
        ) : (
          /* Orders Grid */
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusUpdate={handleStatusUpdate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Stats Footer */}
      {orders.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-dark-surface/95 backdrop-blur-lg border-t border-dark-card shadow-2xl z-10">
          <div className="container mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex gap-8">
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-brand-orange">{orderCounts.pending}</span>
                  <span className="text-text-secondary text-sm">New</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-status-warning">{orderCounts.preparing}</span>
                  <span className="text-text-secondary text-sm">Preparing</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-status-success">{orderCounts.ready}</span>
                  <span className="text-text-secondary text-sm">Ready</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-text-secondary">Total Active:</span>
                <span className="text-3xl font-bold text-brand-lime">
                  {orderCounts.all}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KitchenDashboard;




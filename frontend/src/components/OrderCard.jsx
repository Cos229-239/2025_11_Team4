import React, { useState, useEffect } from 'react';
import { timeAgo, formatTime } from '../utils/timeAgo';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Status configurations with dark theme
 */
const STATUS_CONFIG = {
  pending: {
    label: 'New Order',
    bgColor: 'bg-brand-orange/10',
    borderColor: 'border-brand-orange',
    textColor: 'text-brand-orange',
    badgeColor: 'bg-brand-orange',
    nextStatus: 'preparing',
    actionLabel: 'Start Preparing',
    actionColor: 'bg-brand-orange hover:bg-brand-orange/90',
    icon: '🆕',
  },
  preparing: {
    label: 'Preparing',
    bgColor: 'bg-status-warning/10',
    borderColor: 'border-status-warning',
    textColor: 'text-status-warning',
    badgeColor: 'bg-status-warning',
    nextStatus: 'ready',
    actionLabel: 'Mark as Ready',
    actionColor: 'bg-brand-lime hover:bg-brand-lime/90 text-dark-bg',
    icon: '👨‍🍳',
  },
  ready: {
    label: 'Ready',
    bgColor: 'bg-status-success/10',
    borderColor: 'border-status-success',
    textColor: 'text-status-success',
    badgeColor: 'bg-status-success',
    nextStatus: 'completed',
    actionLabel: 'Mark Completed',
    actionColor: 'bg-status-success hover:bg-status-success/90',
    icon: '✅',
  },
  completed: {
    label: 'Completed',
    bgColor: 'bg-dark-surface/50',
    borderColor: 'border-dark-surface',
    textColor: 'text-text-secondary',
    badgeColor: 'bg-dark-surface',
    nextStatus: null,
    actionLabel: null,
    actionColor: null,
    icon: '✓',
  },
  cancelled: {
    label: 'Cancelled',
    bgColor: 'bg-status-danger/10',
    borderColor: 'border-status-danger',
    textColor: 'text-status-danger',
    badgeColor: 'bg-status-danger',
    nextStatus: null,
    actionLabel: null,
    actionColor: null,
    icon: '❌',
  },
};

/**
 * OrderCard Component
 * Displays a single order with items and status actions
 * Updated to match Team Vision dark theme design
 */
const OrderCard = ({ order, onStatusUpdate }) => {
  const [timeDisplay, setTimeDisplay] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);

  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
// Preparing timer hooks  
  const startTime = order.preparing_at || order.status_updated_at || order.created_at;
  const [preparingElapsed, setPreparingElapsed] = useState(() =>
    Math.floor((Date.now() - new Date(startTime)) / 1000)
  );

  useEffect(() => {
    if (order.status !== 'preparing') return;
    const interval = setInterval(() => {
      setPreparingElapsed(Math.floor((Date.now() - new Date(startTime)) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [order.status, startTime]);

  function formatElapsed(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

// Update time display every minute
  useEffect(() => {
    const updateTime = () => {
      setTimeDisplay(timeAgo(order.created_at));
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [order.created_at]);

  // Handle status update
  const handleStatusUpdate = async () => {
    if (!config.nextStatus || isUpdating) return;

    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/orders/${order.id}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: config.nextStatus }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update order status');
      }

      // Callback to parent to update state
      if (onStatusUpdate) {
        onStatusUpdate(data.data);
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      setError(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle cancel order
  const handleCancel = async () => {
    if (order.status !== 'pending' || isUpdating) return;

    if (!confirm('Are you sure you want to cancel this order?')) return;

    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/orders/${order.id}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'cancelled' }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to cancel order');
      }

      if (onStatusUpdate) {
        onStatusUpdate(data.data);
      }
    } catch (err) {
      console.error('Error cancelling order:', err);
      setError(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div
      className={`rounded-2xl shadow-xl border-2 ${config.borderColor} ${config.bgColor} overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-102 bg-dark-card`}
    >
      {/* Header */}
      <div className="p-5 border-b border-dark-surface bg-dark-card">
        <div className="flex justify-between items-start mb-3">
          {/* Table Number - Large and Prominent */}
          <div className="flex items-center gap-3">
            <span className="text-4xl">{config.icon}</span>
            <div>
              <h2 className="text-4xl font-bold text-text-primary">
                Table {order.table_id}
              </h2>
              <span className="text-sm text-text-secondary">Order #{order.id}</span>
            </div>
          </div>

          {/* Status Badge */}
          <span
            className={`px-4 py-1.5 rounded-full text-xs font-bold text-white ${config.badgeColor} shadow-lg`}
          >
            {config.label}
          </span>
        </div>

        {/* Time Info */}
        <div className="flex justify-between items-center text-sm mt-3 pt-3 border-t border-dark-surface">
          <span className="text-text-secondary">
            ⏰ {formatTime(order.created_at)}
          </span>
          <span className={`font-semibold ${config.textColor}`}>{timeDisplay}</span>
        </div>
            {/* Preparing Timer */}
    {order.status === 'preparing' && (
      <div className="text-xs text-yellow-400 mt-1 pl-5 pb-2">
        Preparing for: {formatElapsed(preparingElapsed)}
      </div>
    )}
    
      </div>

      {/* Order Items */}
      <div className="p-5">
        <h3 className="font-bold text-text-primary text-sm mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-brand-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          ORDER ITEMS
        </h3>
        <div className="space-y-2">
          {order.items && order.items.map((item, index) => (
            <div
              key={item.id}
              className="flex justify-between items-start bg-dark-surface rounded-xl p-3 shadow-md hover:bg-dark-surface/80 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xl text-brand-lime bg-brand-lime/10 px-2 py-1 rounded-lg">
                    {item.quantity}×
                  </span>
                  <span className="font-semibold text-text-primary">
                    {item.menu_item_name}
                  </span>
                </div>
                {item.special_instructions && (
                  <div className="mt-2 text-sm text-brand-orange bg-brand-orange/10 px-3 py-1.5 rounded-lg">
                    💬 {item.special_instructions}
                  </div>
                )}
              </div>
              <span className="text-sm text-brand-lime font-bold ml-3">
                ${parseFloat(item.subtotal).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Customer Notes */}
        {order.customer_notes && (
          <div className="mt-4 p-4 bg-status-warning/10 border border-status-warning/20 rounded-xl">
            <p className="text-xs font-bold text-status-warning mb-1 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              CUSTOMER NOTES:
            </p>
            <p className="text-sm text-status-warning">{order.customer_notes}</p>
          </div>
        )}

        {/* Total */}
        <div className="mt-4 pt-4 border-t border-dark-surface flex justify-between items-center">
          <span className="font-bold text-text-primary text-lg">TOTAL:</span>
          <span className="text-3xl font-bold text-brand-orange">
            ${parseFloat(order.total_amount).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-5 mb-4 p-3 bg-status-danger/10 border border-status-danger/20 text-status-danger rounded-xl text-sm flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="p-5 bg-dark-surface border-t border-dark-card space-y-2">
        {config.nextStatus && (
          <button
            onClick={handleStatusUpdate}
            disabled={isUpdating}
            className={`w-full py-4 rounded-xl font-bold transition-all shadow-lg ${
              isUpdating
                ? 'bg-dark-card text-text-secondary cursor-not-allowed'
                : `${config.actionColor} text-white hover:shadow-${config.textColor}/30`
            }`}
          >
            {isUpdating ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin h-5 w-5 mr-2"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Updating...
              </span>
            ) : (
              config.actionLabel
            )}
          </button>
        )}

        {/* Cancel Button - Only for pending orders */}
        {order.status === 'pending' && (
          <button
            onClick={handleCancel}
            disabled={isUpdating}
            className={`w-full py-3 rounded-xl font-bold text-status-danger border-2 border-status-danger/30 bg-status-danger/10 transition-all ${
              isUpdating
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-status-danger/20 hover:border-status-danger'
            }`}
          >
            Cancel Order
          </button>
        )}
      </div>
    </div>
  );
};

export default OrderCard;

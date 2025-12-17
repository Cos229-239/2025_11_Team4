import React, { useState, useEffect } from 'react';
import { timeAgo, formatTime } from '../utils/timeAgo';
import { useConfirm } from '../hooks/useConfirm';
import { ShoppingBagIcon, CalendarDaysIcon, UsersIcon } from '@heroicons/react/24/outline';
import { fetchWithAuth } from '../utils/api';

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
    bgColor: 'bg-[#B7EC2F20]',
    borderColor: 'border-[#B7EC2F]',
    textColor: 'text-[#B7EC2F]',
    badgeColor: 'bg-[#B7EC2F]',
    nextStatus: 'completed',
    actionLabel: 'Mark Completed',
    actionColor: 'bg-[#B7EC2F] hover:bg-[#a2d72b]',
    icon: '✓',
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
  const { confirm } = useConfirm();

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

    try {
      const response = await fetchWithAuth(
        `${API_URL}/api/orders/${order.id}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
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
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle cancel order
  const handleCancel = async () => {
    if (order.status !== 'pending' || isUpdating) return;

    if (!await confirm('Cancel Order', 'Are you sure you want to cancel this order?', { variant: 'danger', confirmText: 'Yes, Cancel' })) return;

    setIsUpdating(true);

    try {
      const response = await fetchWithAuth(
        `${API_URL}/api/orders/${order.id}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
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
    } finally {
      setIsUpdating(false);
    }
  };

  // Determine order type label and icon
  const getOrderTypeInfo = () => {
    if (order.order_type === 'takeout') {
      return { label: 'Takeout', Icon: ShoppingBagIcon, subLabel: `Order #${order.id}` };
    }

    if (order.order_type === 'pre-order') {
      return { label: 'Pre-Order', Icon: CalendarDaysIcon, subLabel: `Scheduled: ${formatTime(order.scheduled_for)}` };
    }

    return {
      label: `Table ${order.table_id || '?'}`,
      Icon: UsersIcon,
      subLabel: `Order #${order.id}`
    };
  };


  const typeInfo = getOrderTypeInfo();

  return (
    <div className="
  relative group overflow-hidden rounded-2xl 
  transition-all duration-300 hover:shadow-xl 
  flex flex-col h-full 
  bg-white/10 backdrop-blur-xl 
  border border-white/15 
  shadow-lg
">

      {/* Status Accent Line (Left) */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${config.badgeColor} shadow-[0_0_15px_rgba(0,0,0,0.5)]`}></div>

      {/* Header */}
      <div className="p-6 pb-4 border-b border-white/5 relative bg-white/5 backdrop-blur-xl">
        <div className="flex justify-between items-start mb-4 pl-3">
          {/* Order Type & ID */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300">
              <typeInfo.Icon className="w-8 h-8 text-white/90" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white leading-tight tracking-tight">
                {typeInfo.label}
              </h2>
              <span className="text-sm text-gray-400 font-medium flex items-center gap-2">
                {typeInfo.subLabel}
              </span>
            </div>
          </div>

          {/* Status Badge */}
          <span
            className={`px-4 py-1.5 rounded-xl text-xs font-bold text-white ${config.badgeColor} shadow-lg border border-white/20 backdrop-blur-md`}
          >
            {config.label}
          </span>
        </div>

        {/* Time Info */}
        <div className="flex justify-between items-center text-sm pt-2 pl-3">
          <div className="flex items-center gap-2 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">{formatTime(order.created_at)}</span>
          </div>
          <span className={`font-bold ${config.textColor} bg-black/40 px-3 py-1 rounded-lg text-xs border border-white/5`}>
            {timeDisplay}
          </span>
        </div>
        {/* Preparing Timer */}
        {order.status === 'preparing' && (
          <div className="text-xs text-yellow-400 mt-1 pl-5 pb-2">
            Preparing for: {formatElapsed(preparingElapsed)}
          </div>
        )}

      </div>

      {/* Order Items */}
      <div className="p-6 pl-9 flex-1">
        <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
          Order Items
          <span className="h-px flex-1 bg-white/10"></span>
        </h3>
        <div className="space-y-3">
          {order.items && order.items.map((item) => (
            <div
              key={item.id}
              className="group/item flex justify-between items-start"
            >
              <div className="flex-1">
                <div className="flex items-baseline gap-3">
                  <span className="font-bold text-brand-lime text-lg">
                    {item.quantity}×
                  </span>
                  <span className="font-medium text-gray-200 text-lg leading-snug">
                    {item.menu_item_name}
                  </span>
                </div>
                {item.special_instructions && (
                  <div className="mt-1.5 text-sm text-brand-orange/90 italic pl-8 border-l-2 border-brand-orange/30">
                    "{item.special_instructions}"
                  </div>
                )}
              </div>
              <span className="text-sm text-gray-500 font-medium ml-4 mt-1">
                ${parseFloat(item.subtotal).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Customer Notes */}
        {order.customer_notes && (
          <div className="mt-6 p-4 bg-brand-orange/5 border border-brand-orange/20 rounded-xl relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-orange/50"></div>
            <p className="text-xs font-bold text-brand-orange mb-1 flex items-center gap-2 uppercase tracking-wider">
              Customer Notes
            </p>
            <p className="text-sm text-gray-300 italic">"{order.customer_notes}"</p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 pl-9 bg-black/20 border-t border-white/5 space-y-3">
        <div className="flex justify-between items-center mb-2">
          <span className="font-medium text-gray-400 text-sm">Total Amount</span>
          <span className="text-2xl font-bold text-white tracking-tight">
            ${parseFloat(order.total_amount).toFixed(2)}
          </span>
        </div>

        {config.nextStatus && (
          <button
            onClick={handleStatusUpdate}
            disabled={isUpdating}
            aria-label={`Mark order #${order.id} as ${config.nextStatus}`}
            className={`w-full py-3.5 rounded-xl font-bold transition-all shadow-lg relative overflow-hidden group/btn ${isUpdating
              ? 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
              : `${config.actionColor} text-white shadow-lg shadow-${config.textColor}/20 border border-white/10`
              }`}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isUpdating ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Updating...
                </>
              ) : (
                config.actionLabel
              )}
            </span>
          </button>
        )}

        {/* Cancel Button - Only for pending orders */}
        {order.status === 'pending' && (
          <button
            onClick={handleCancel}
            disabled={isUpdating}
            aria-label={`Cancel order #${order.id}`}
            className={`w-full py-3 rounded-xl font-bold text-red-400 border border-red-500/20 bg-red-500/5 transition-all ${isUpdating
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-300'
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

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ConfirmationPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAnimation, setShowAnimation] = useState(false);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/api/orders/${orderId}`);
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch order');
      }
      setOrder(data.data);
      // Trigger success animation
      setTimeout(() => setShowAnimation(true), 100);
    } catch (err) {
      setError(err.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) fetchOrder();
  }, [orderId]);

  const estimatedPrep = useMemo(() => {
    // Simple heuristic: 10 min base + 4 min per item, clamped 10–35
    const count = order?.items?.reduce((sum, it) => sum + (it.quantity || 1), 0) || 0;
    const mins = Math.max(10, Math.min(35, 10 + count * 4));
    return `${mins} minutes`;
  }, [order]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <LoadingSpinner label="Fetching your order..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
        <div className="bg-dark-card rounded-lg shadow-lg p-6 max-w-md w-full border border-dark-surface">
          <ErrorMessage message={error} onRetry={fetchOrder} />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="bg-dark-card rounded-lg shadow p-8 text-center border border-dark-surface">
          <h2 className="text-xl font-semibold text-text-primary">Order not found</h2>
          <p className="text-text-secondary mt-2">We couldn't find order #{orderId}.</p>
        </div>
      </div>
    );
  }

  const total = Number(order.total_amount || 0);
  const tableId = order.table_id;

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center py-8 px-4">
      <div
        className={`bg-dark-card rounded-2xl shadow-2xl p-6 sm:p-10 max-w-2xl w-full border border-dark-surface transform transition-all duration-700 ${
          showAnimation ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Success Header with Animation */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full mb-4 animate-bounce shadow-lg shadow-green-500/50">
            <svg
              className="w-10 h-10 sm:w-12 sm:h-12 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary mb-2">
            🎉 Order Received!
          </h1>
          <p className="text-lg text-text-secondary">
            Your delicious food is being prepared right now
          </p>
        </div>

        {/* Order Details Card */}
        <div className="bg-gradient-to-br from-brand-orange/20 to-brand-orange/10 rounded-xl p-5 sm:p-6 mb-6 border-2 border-brand-orange/30">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="bg-dark-surface rounded-lg p-4 shadow-md border border-dark-card">
              <div className="text-xs sm:text-sm text-text-secondary uppercase tracking-wide mb-1">
                Order Number
              </div>
              <div className="text-3xl sm:text-4xl font-black text-brand-orange">
                #{order.id}
              </div>
            </div>
            <div className="bg-dark-surface rounded-lg p-4 shadow-md border border-dark-card">
              <div className="text-xs sm:text-sm text-text-secondary uppercase tracking-wide mb-1">
                Table
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-text-primary">
                Table {tableId}
              </div>
            </div>
            <div className="bg-dark-surface rounded-lg p-4 shadow-md border border-dark-card">
              <div className="text-xs sm:text-sm text-text-secondary uppercase tracking-wide mb-1">
                Prep Time
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-brand-lime flex items-center justify-center gap-1">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {estimatedPrep}
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-brand-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Your Order
          </h2>
          {order.items && order.items.length > 0 ? (
            <div className="bg-dark-surface rounded-xl overflow-hidden border border-dark-card shadow-lg">
              <div className="divide-y divide-dark-card">
                {order.items.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between p-4 hover:bg-dark-card transition"
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center justify-center w-7 h-7 bg-brand-orange text-white text-sm font-bold rounded-full">
                          {it.quantity}
                        </span>
                        <span className="font-semibold text-text-primary truncate">
                          {it.menu_item_name || `Item ${it.menu_item_id}`}
                        </span>
                      </div>
                      {it.special_instructions && (
                        <div className="text-sm text-brand-orange italic ml-9 bg-brand-orange/10 px-2 py-1 rounded">
                          Note: {it.special_instructions}
                        </div>
                      )}
                    </div>
                    <div className="text-lg font-bold text-brand-lime">
                      ${Number(it.subtotal ?? (Number(it.menu_item_price || 0) * Number(it.quantity || 0))).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between p-5 bg-gradient-to-r from-brand-orange to-brand-orange/80">
                <span className="text-xl font-bold text-white">Total</span>
                <span className="text-3xl font-black text-white">${total.toFixed(2)}</span>
              </div>
            </div>
          ) : (
            <div className="text-center text-text-secondary bg-dark-surface p-8 rounded-xl border border-dark-card">
              No items found for this order.
            </div>
          )}
        </div>

        {/* Customer Notes if any */}
        {order.customer_notes && (
          <div className="mb-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-yellow-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <div>
                <div className="text-sm font-semibold text-yellow-400 mb-1">Your Note:</div>
                <div className="text-sm text-yellow-300">{order.customer_notes}</div>
              </div>
            </div>
          </div>
        )}

        {/* Status Message */}
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-green-400">
                Order Status: <span className="uppercase">{order.status}</span>
              </p>
              <p className="text-xs text-green-300 mt-1">
                We'll notify the kitchen staff immediately. You can relax and enjoy your time!
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate(`/menu/${tableId}`)}
            className="flex-1 bg-gradient-to-r from-brand-orange to-brand-orange/80 text-white py-4 px-6 rounded-xl font-bold text-lg hover:shadow-xl hover:shadow-brand-orange/30 hover:scale-105 transform transition-all duration-200 flex items-center justify-center gap-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Order More
          </button>
        </div>

        {/* Thank You Message */}
        <div className="text-center mt-6 pt-6 border-t border-dark-surface">
          <p className="text-text-secondary text-sm">
            Thank you for your order! We hope you enjoy your meal. 🍽️
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationPage;

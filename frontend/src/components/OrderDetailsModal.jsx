import React from 'react';
import DateTimeDisplay from './DateTimeDisplay';

const OrderDetailsModal = ({ order, onClose }) => {
    if (!order) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-dark-card w-full max-w-md rounded-3xl overflow-hidden border border-dark-surface shadow-2xl animate-scaleIn">
                {/* Header */}
                <div className="p-6 border-b border-dark-surface flex justify-between items-center bg-brand-orange">
                    <h3 className="text-xl font-bold text-white">Order Details</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-full text-white/80 hover:text-white transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {/* Order Info & Status */}
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <p className="text-text-secondary text-sm">Order Number</p>
                            <p className="text-xl font-bold text-text-primary mb-2">#{order.id}</p>
                            <DateTimeDisplay
                                timestamp={order.created_at}
                                restaurantTimezone={order.restaurant_timezone}
                            />
                        </div>
                        <div className="text-right">
                            <p className="text-text-secondary text-sm mb-1">Status</p>
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase border
                                ${order.status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                    order.status === 'cancelled' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                        'bg-brand-orange/10 text-brand-orange border-brand-orange/20'}`}>
                                {order.status}
                            </span>
                            <p className="text-xs text-text-secondary mt-1 capitalize">{order.order_type}</p>
                        </div>
                    </div>

                    {/* Restaurant Info */}
                    {order.restaurant_name && (
                        <div className="mb-6 flex items-center gap-3 p-3 bg-dark-surface/50 rounded-xl border border-dark-surface">
                            {order.restaurant_image && (
                                <img src={order.restaurant_image} alt={order.restaurant_name} className="w-10 h-10 rounded-lg object-cover" />
                            )}
                            <div>
                                <p className="font-bold text-text-primary">{order.restaurant_name}</p>
                            </div>
                        </div>
                    )}

                    {/* Items */}
                    <div className="space-y-4 mb-6">
                        <h4 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Items</h4>
                        {order.items && order.items.map((item, index) => (
                            <div key={index} className="flex justify-between items-start py-2 border-b border-dark-surface last:border-0">
                                <div className="flex gap-3">
                                    <div className="w-6 h-6 bg-dark-surface rounded-md flex items-center justify-center text-xs font-bold text-text-secondary shrink-0 mt-0.5">
                                        {item.quantity}x
                                    </div>
                                    <div>
                                        <p className="text-text-primary font-medium">{item.menu_item_name}</p>
                                        {item.special_instructions && (
                                            <p className="text-xs text-text-secondary italic mt-1">"{item.special_instructions}"</p>
                                        )}
                                    </div>
                                </div>
                                <p className="text-text-primary font-mono">${parseFloat(item.subtotal || (item.menu_item_price * item.quantity)).toFixed(2)}</p>
                            </div>
                        ))}
                    </div>

                    {/* Summary */}
                    <div className="border-t border-dark-surface pt-4 space-y-2">
                        <div className="flex justify-between text-text-secondary">
                            <span>Subtotal</span>
                            <span>${parseFloat(order.total_amount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xl font-bold text-text-primary pt-2">
                            <span>Total</span>
                            <span className="text-brand-orange">${parseFloat(order.total_amount).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-dark-surface bg-dark-surface/30 text-center">
                    <button
                        onClick={onClose}
                        className="text-text-secondary hover:text-text-primary font-bold text-sm transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderDetailsModal;

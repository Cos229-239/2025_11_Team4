import React from 'react';
import DateTimeDisplay from './DateTimeDisplay';

const ReservationDetailsModal = ({ reservation, onClose }) => {
    if (!reservation) return null;

    // Construct a timestamp for the reservation
    const reservationTimestamp = new Date(`${reservation.reservation_date.split('T')[0]}T${reservation.reservation_time}`).toISOString();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-dark-card w-full max-w-md rounded-3xl overflow-hidden border border-dark-surface shadow-2xl animate-scaleIn">
                {/* Header */}
                <div className="p-6 border-b border-dark-surface flex justify-between items-center bg-brand-orange">
                    <h3 className="text-xl font-bold text-white">Reservation Details</h3>
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
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {/* Restaurant Info */}
                    <div className="mb-6">
                        <h4 className="text-lg font-bold text-text-primary">{reservation.restaurant_name}</h4>
                        <div className="mt-2">
                            <DateTimeDisplay
                                timestamp={reservationTimestamp}
                                restaurantTimezone={reservation.restaurant_timezone || 'UTC'}
                            />
                        </div>
                    </div>

                    {/* Status & Details */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-dark-surface/50 p-3 rounded-xl border border-dark-surface">
                            <p className="text-xs text-text-secondary uppercase font-bold mb-1">Status</p>
                            <span className={`inline-block px-2 py-1 rounded-lg text-xs font-bold uppercase border
                ${reservation.status === 'confirmed' ? 'bg-brand-lime/10 text-brand-lime border-brand-lime/20' :
                                    reservation.status === 'cancelled' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                        'bg-brand-orange/10 text-brand-orange border-brand-orange/20'}`}>
                                {reservation.status}
                            </span>
                        </div>
                        <div className="bg-dark-surface/50 p-3 rounded-xl border border-dark-surface">
                            <p className="text-xs text-text-secondary uppercase font-bold mb-1">Party Size</p>
                            <p className="text-text-primary font-bold flex items-center gap-2">
                                <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                {reservation.party_size} Guests
                            </p>
                        </div>
                        <div className="bg-dark-surface/50 p-3 rounded-xl border border-dark-surface">
                            <p className="text-xs text-text-secondary uppercase font-bold mb-1">Table</p>
                            <p className="text-text-primary font-bold">
                                {reservation.table_number ? `Table ${reservation.table_number}` : 'Not Assigned'}
                            </p>
                        </div>
                    </div>

                    {/* Pre-Order Items */}
                    {reservation.orders && reservation.orders.length > 0 && (
                        <div className="border-t border-dark-surface pt-6">
                            <h4 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-4">Pre-Ordered Items</h4>
                            {reservation.orders.map((order, oIdx) => (
                                <div key={oIdx} className="space-y-3">
                                    {order.items && order.items.map((item, iIdx) => (
                                        <div key={`${oIdx}-${iIdx}`} className="flex justify-between items-start py-2 border-b border-dark-surface last:border-0">
                                            <div className="flex gap-3">
                                                <div className="w-6 h-6 bg-dark-surface rounded-md flex items-center justify-center text-xs font-bold text-text-secondary shrink-0 mt-0.5">
                                                    {item.quantity}x
                                                </div>
                                                <div>
                                                    <p className="text-text-primary font-medium">{item.name}</p>
                                                </div>
                                            </div>
                                            <p className="text-text-primary font-mono">${parseFloat(item.subtotal || (item.price * item.quantity)).toFixed(2)}</p>
                                        </div>
                                    ))}
                                    <div className="flex justify-between items-center pt-2">
                                        <p className="text-sm text-text-secondary">Order Total</p>
                                        <p className="font-bold text-brand-orange">${parseFloat(order.total_amount).toFixed(2)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
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

export default ReservationDetailsModal;

import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Search } from 'lucide-react';
import { useUserAuth } from '../../../hooks/useUserAuth';

const OrdersSection = ({ restaurantId }) => {
    const { token } = useUserAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
    });

    const fetchOrders = useCallback(async (page = 1) => {
        if (!token) return;
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page,
                limit: pagination.limit,
                restaurant_id: restaurantId
            });

            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/orders?${queryParams}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setOrders(data.data);
                setPagination(prev => ({
                    ...prev,
                    page: data.pagination.page,
                    total: data.pagination.total,
                    totalPages: data.pagination.totalPages
                }));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [token, pagination.limit, restaurantId]);

    useEffect(() => {
        fetchOrders(1); // Reset to page 1 on mount or restaurant change
    }, [restaurantId, fetchOrders]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchOrders(newPage);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Orders History</h2>
                <div className="text-sm text-zinc-400">
                    Total: {pagination.total} orders
                </div>
            </div>

            <div className="glass-panel overflow-hidden rounded-2xl border border-white/5">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white/5 text-zinc-400 text-xs uppercase font-medium">
                            <tr>
                                <th className="px-6 py-4">Order ID</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Total</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Items</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan="6" className="text-center py-8">Loading...</td></tr>
                            ) : orders.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-8 text-zinc-500">No orders found.</td></tr>
                            ) : (
                                orders.map(order => (
                                    <tr key={order.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 font-mono text-zinc-300">#{order.id}</td>
                                        <td className="px-6 py-4 capitalize">{order.order_type}</td>
                                        <td className="px-6 py-4 font-bold text-brand-lime">${parseFloat(order.total_amount).toFixed(2)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${order.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                                                order.status === 'cancelled' ? 'bg-red-500/10 text-red-400' :
                                                    'bg-brand-orange/10 text-brand-orange'
                                                }`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-zinc-400">
                                            {new Date(order.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-zinc-400 max-w-xs truncate">
                                            {order.items?.length || 0} items
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {pagination.totalPages > 1 && (
                    <div
                        className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-white/5"
                        role="navigation"
                        aria-label="Pagination"
                    >
                        <button
                            onClick={() => handlePageChange(pagination.page - 1)}
                            disabled={pagination.page === 1}
                            className="text-sm px-3 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-lime/50"
                            aria-label="Go to previous page"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-zinc-400" aria-current="page">
                            Page {pagination.page} of {pagination.totalPages}
                        </span>
                        <button
                            onClick={() => handlePageChange(pagination.page + 1)}
                            disabled={pagination.page === pagination.totalPages}
                            className="text-sm px-3 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-lime/50"
                            aria-label="Go to next page"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrdersSection;

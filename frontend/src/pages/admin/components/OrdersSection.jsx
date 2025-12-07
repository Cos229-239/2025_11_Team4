import React, { useState, useEffect } from 'react';
import { ClipboardList, Search } from 'lucide-react';
import { useUserAuth } from '../../../hooks/useUserAuth';

const OrdersSection = ({ restaurantId }) => {
    const { token } = useUserAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Ideally use query params for pagination and restaurant_id
        // But getAllOrders usually returns everything, so we might need client-side filter 
        // OR update backend to support restaurant_id filter if not already present.
        // For now, let's assume we fetch and filter or the endpoint is smart.
        // The admin analytics endpoint might suffer from overfetching if generic API is used.
        // However, existing backend generally returns all orders.
        const fetchOrders = async () => {
            if (!token) return;
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/orders`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    // Client-side filter for now if API doesn't support it explicitly in query
                    // Assuming orders have restaurant_id
                    const filtered = data.orders.filter(o => o.restaurant_id === parseInt(restaurantId));
                    setOrders(filtered);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, [restaurantId]);

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Orders History</h2>

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
            </div>
        </div>
    );
};

export default OrdersSection;

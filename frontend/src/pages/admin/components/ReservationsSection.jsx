import React, { useState, useEffect } from 'react';
import { Calendar, Search, Filter, CheckCircle, XCircle } from 'lucide-react';
import { showToast } from '../../../utils/toast';
import { useUserAuth } from '../../../hooks/useUserAuth';

const ReservationsSection = ({ restaurantId }) => {
    const { token } = useUserAuth();
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

    const fetchReservations = async () => {
        setLoading(true);
        if (!token) return;
        try {
            let url = `${import.meta.env.VITE_API_URL}/api/v1/reservations?restaurant_id=${restaurantId}`;
            if (filterStatus !== 'all') url += `&status=${filterStatus}`;
            if (filterDate) url += `&date=${filterDate}`;

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setReservations(data.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReservations();
    }, [restaurantId, filterStatus, filterDate]);

    const updateStatus = async (id, newStatus) => {
        if (!token) return;
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/reservations/${id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });
            const data = await res.json();
            if (data.success) {
                showToast.success('Reservation status updated');
                fetchReservations();
            } else showToast.error(data.message);
        } catch (err) { console.error(err); }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold">Reservations</h2>
                <div className="flex items-center gap-3">
                    <input
                        type="date"
                        value={filterDate}
                        onChange={e => setFilterDate(e.target.value)}
                        className="bg-black/50 border border-white/10 rounded-xl px-4 py-2 focus:border-brand-lime outline-none"
                    />
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="bg-black/50 border border-white/10 rounded-xl px-4 py-2 focus:border-brand-lime outline-none"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="seated">Seated</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
            </div>

            <div className="glass-panel overflow-hidden rounded-2xl border border-white/5">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white/5 text-zinc-400 text-xs uppercase font-medium">
                            <tr>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Time</th>
                                <th className="px-6 py-4">Party</th>
                                <th className="px-6 py-4">Table</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan="6" className="text-center py-8">Loading...</td></tr>
                            ) : reservations.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-8 text-zinc-500">No reservations found for this date.</td></tr>
                            ) : (
                                reservations.map((r) => (
                                    <tr key={r.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-white">{r.customer_name}</p>
                                            <p className="text-xs text-zinc-500">{r.customer_phone || r.customer_email}</p>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-sm">
                                            {r.reservation_time}
                                        </td>
                                        <td className="px-6 py-4">
                                            {r.party_size} ppl
                                        </td>
                                        <td className="px-6 py-4">
                                            {r.table_number ? `T-${r.table_number}` : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${r.status === 'confirmed' ? 'bg-green-500/10 text-green-400' :
                                                r.status === 'seated' ? 'bg-blue-500/10 text-blue-400' :
                                                    r.status === 'cancelled' ? 'bg-red-500/10 text-red-400' :
                                                        'bg-zinc-800 text-zinc-400'
                                                }`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {r.status === 'confirmed' && (
                                                    <button
                                                        onClick={() => updateStatus(r.id, 'seated')}
                                                        className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20"
                                                        title="Mark Seated"
                                                    >
                                                        <CheckCircle size={16} />
                                                    </button>
                                                )}
                                                {r.status === 'seated' && (
                                                    <button
                                                        onClick={() => updateStatus(r.id, 'completed')}
                                                        className="p-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20"
                                                        title="Mark Completed"
                                                    >
                                                        <CheckCircle size={16} />
                                                    </button>
                                                )}
                                                {['pending', 'confirmed'].includes(r.status) && (
                                                    <button
                                                        onClick={() => updateStatus(r.id, 'cancelled')}
                                                        className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20"
                                                        title="Cancel"
                                                    >
                                                        <XCircle size={16} />
                                                    </button>
                                                )}
                                            </div>
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

export default ReservationsSection;

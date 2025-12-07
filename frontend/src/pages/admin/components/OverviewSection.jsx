import React, { useState, useEffect } from 'react';
import { DollarSign, Users, Calendar, Utensils, TrendingUp } from 'lucide-react';
import { useUserAuth } from '../../../hooks/useUserAuth';

const OverviewSection = ({ restaurantId }) => {
    const { token } = useUserAuth();
    const [stats, setStats] = useState({
        revenue: 0,
        orders: 0,
        reservations: 0,
        activeTables: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            if (!restaurantId || !token) return;

            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/analytics/${restaurantId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    const today = new Date().toISOString().split('T')[0];
                    // Find today's revenue stats from the array. Note: Postgres dates might vary in format, string match is safe enough for "Y-M-D"
                    const todayStats = data.revenueByDay?.find(d => {
                        // Handle potential date format differences (e.g. 2023-10-25T00:00...)
                        const dStr = typeof d.date === 'string' ? d.date : new Date(d.date).toISOString();
                        return dStr.startsWith(today);
                    }) || { revenue: 0, order_count: 0 };

                    setStats({
                        revenue: parseFloat(todayStats.revenue || 0),
                        orders: parseInt(todayStats.order_count || 0),
                        reservations: data.summary?.reservationsToday || 0,
                        activeTables: data.summary?.activeTables || 0
                    });
                }
            } catch (err) {
                console.error("Failed to load stats", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [restaurantId, token]);


    const StatCard = ({ title, value, icon: Icon, color, prefix = '' }) => (
        <div className="glass-panel p-6 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-white/10 transition-all">
            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
                <Icon size={64} />
            </div>
            <div>
                <p className="text-zinc-400 text-sm font-medium mb-1">{title}</p>
                <h3 className="text-3xl font-bold bg-white bg-clip-text text-transparent">
                    {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
                </h3>
            </div>
        </div>
    );

    return (
        <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Today's Revenue"
                    value={stats.revenue}
                    prefix="$"
                    icon={DollarSign}
                    color="text-brand-lime"
                />
                <StatCard
                    title="Total Orders"
                    value={stats.orders}
                    icon={Utensils}
                    color="text-brand-orange"
                />
                <StatCard
                    title="Reservations"
                    value={stats.reservations}
                    icon={Calendar}
                    color="text-blue-400"
                />
                <StatCard
                    title="Active Tables"
                    value={stats.activeTables}
                    icon={Users}
                    color="text-purple-400"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart Area - Placeholder */}
                <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-white/5 h-[400px] flex flex-col">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <TrendingUp size={20} className="text-brand-lime" />
                        Guest Flow & Revenue
                    </h3>
                    <div className="flex-1 flex items-center justify-center border-2 border-dashed border-white/5 rounded-xl text-zinc-500">
                        Chart Visualization Component Placeholder
                    </div>
                </div>

                {/* Live Activity / Recent Orders */}
                <div className="glass-panel p-6 rounded-2xl border border-white/5 h-[400px] flex flex-col">
                    <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                                <div>
                                    <p className="text-sm font-medium text-white">Order #{1000 + i}</p>
                                    <p className="text-xs text-zinc-400">Table {i} • 2 mins ago</p>
                                </div>
                                <span className="text-brand-lime text-sm font-bold">$45.00</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OverviewSection;

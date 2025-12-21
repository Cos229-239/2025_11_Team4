import { useState, useEffect } from 'react';
import { useUserAuth } from '../../../hooks/useUserAuth';
import { DollarSign, Utensils, Calendar, Users, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const OverviewSection = ({ restaurantId }) => {
    const { token } = useUserAuth();
    const [timeRange, setTimeRange] = useState('week');
    const [stats, setStats] = useState({
        revenue: 0,
        orders: 0,
        reservations: 0,
        activeTables: 0
    });
    const [chartData, setChartData] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);

    useEffect(() => {
        const fetchStats = async () => {
            if (!restaurantId || !token) return;

            try {
                // Ensure no double slash if VITE_API_URL has one
                const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
                const res = await fetch(`${baseUrl}/api/admin/analytics/${restaurantId}?range=${timeRange}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    setChartData(data.chartData);

                    const today = new Date().toISOString().split('T')[0];
                    const todayStats = data.chartData?.find(d => d.date.startsWith(today)) || { revenue: 0 };

                    setStats({
                        revenue: todayStats.revenue || 0,
                        orders: todayStats.order_count || 0,
                        reservations: data.summary?.reservationsToday || 0,
                        activeTables: data.summary?.activeTables || 0
                    });
                    setRecentActivity(data.recentOrders || []);
                }
            } catch (err) {
                console.error("Failed to load stats", err);
            }
        };

        fetchStats();
    }, [restaurantId, token, timeRange]);


    const StatCard = ({ title, value, icon, color, prefix = '' }) => {
        const Icon = icon;
        return (
            <div className="glass-panel p-6 rounded-2xl border border-white/5 relative overflow-hidden group hover:bg-zinc-800 hover:border-brand-orange transition-all duration-300 cursor-pointer">
                <div className={`absolute top-0 right-0 p-4 opacity-100 group-hover:opacity-20 transition-opacity ${color}`}>
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
    };

    return (
        <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Today's Revenue" value={stats.revenue} prefix="$" icon={DollarSign} color="text-brand-lime" />
                <StatCard title="Today's Orders" value={stats.orders} icon={Utensils} color="text-brand-orange" />
                <StatCard title="Reservations" value={stats.reservations} icon={Calendar} color="text-blue-400" />
                <StatCard title="Active Tables" value={stats.activeTables} icon={Users} color="text-purple-400" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart Area */}
                <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-brand-orange/50 h-[450px] flex flex-col group transition-all duration-300">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <TrendingUp size={20} className="text-brand-lime" />
                            Guest Flow & Revenue
                        </h3>
                        <div className="flex bg-white/5 rounded-lg p-1 gap-1">
                            {['day', 'week', 'month', 'year'].map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${timeRange === range
                                        ? 'bg-brand-orange text-white shadow-lg'
                                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    {range.charAt(0).toUpperCase() + range.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="h-px bg-white/80 w-full mb-6"></div>

                    <div className="flex-1 w-full min-h-0 bg-zinc-600/65 rounded-xl border border-white/5 p-4 mx-1">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#71717a"
                                        tickFormatter={(str) => {
                                            const date = new Date(str);
                                            if (timeRange === 'day') return date.getHours() + ':00';
                                            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                                        }}
                                        tick={{ fontSize: 12 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis yAxisId="left" stroke="#71717a" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <YAxis yAxisId="right" orientation="right" stroke="#71717a" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px' }}
                                        itemStyle={{ color: '#e4e4e7' }}
                                        formatter={(value, name) => [
                                            name === 'revenue' ? `$${value}` : value,
                                            name === 'revenue' ? 'Revenue' : 'Guests'
                                        ]}
                                        labelFormatter={(label) => new Date(label).toLocaleString()}
                                    />
                                    <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#B5FF00" strokeWidth={3} dot={{ r: 4, fill: '#B5FF00' }} activeDot={{ r: 6 }} />
                                    <Line yAxisId="right" type="monotone" dataKey="guests" stroke="#E35504" strokeWidth={3} dot={{ r: 4, fill: '#E35504' }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-zinc-500">
                                {chartData.length === 0 ? "No data for this period" : "Loading Chart..."}
                            </div>
                        )}
                    </div>
                    <div className="h-px bg-white/80 w-full mt-6"></div>
                </div>

                {/* Live Activity / Recent Orders */}
                <div className="glass-panel p-6 rounded-2xl border border-white/5 h-[400px] flex flex-col group hover:bg-zinc-800 hover:border-brand-orange transition-all duration-300">
                    <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                        {recentActivity.length > 0 ? (
                            recentActivity.map((order) => (
                                <div key={order.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                                    <div>
                                        <p className="text-sm font-medium text-white">Order #{order.id}</p>
                                        <p className="text-xs text-zinc-400">
                                            {order.table_number ? `Table ${order.table_number}` : 'Takeout'} • {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <span className="text-brand-lime text-sm font-bold">${parseFloat(order.total_amount).toFixed(2)}</span>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-zinc-500 py-4">No recent activity</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OverviewSection;

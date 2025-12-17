import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserAuth } from '../../hooks/useUserAuth';
import {
    BarChart2, Users, Layout, Coffee, Calendar,
    ClipboardList, Settings, LogOut, Store
} from 'lucide-react';
import OverviewSection from './components/OverviewSection';
import EmployeeSection from './components/EmployeeSection';
import RestaurantProfileSection from './components/RestaurantProfileSection';
import ReservationsSection from './components/ReservationsSection';
import OrdersSection from './components/OrdersSection';
import SettingsSection from './components/SettingsSection';
import MenuSection from './components/MenuSection';
import TablesSection from './components/TablesSection';

const OwnerDashboard = () => {
    const [activeSection, setActiveSection] = useState('overview');
    const { user, token, logout } = useUserAuth();
    const navigate = useNavigate();
    // In a real multi-tenancy setup, we'd fetch the list of restaurants owned by the user.
    // For now, we assume single restaurant or select the first one.
    const [restaurants, setRestaurants] = useState([]);
    const [restaurantId, setRestaurantId] = useState(null);


    useEffect(() => {
        const fetchRestaurants = async () => {
            try {
                // Fetch owned restaurants

                // Fix possible double slash in URL
                const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
                const res = await fetch(`${baseUrl}/api/admin/my-restaurants`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success && data.restaurants.length > 0) {
                    setRestaurants(data.restaurants);
                    // Select first one by default if not set
                    setRestaurantId(data.restaurants[0].id);
                }
            } catch (err) {
                console.error("Failed to fetch restaurants", err);
            }
        };
        if (user) fetchRestaurants();
    }, [user, token]);

    const menuItems = [
        { id: 'overview', label: 'Overview', icon: BarChart2 },
        { id: 'employees', label: 'Staff', icon: Users },
        { id: 'restaurant', label: 'Restaurant', icon: Store },
        { id: 'menu', label: 'Menu', icon: Coffee },
        { id: 'tables', label: 'Tables', icon: Layout },
        { id: 'reservations', label: 'Reservations', icon: Calendar },
        { id: 'orders', label: 'Orders', icon: ClipboardList },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    const handleNavigation = (item) => {
        if (item.link) {
            navigate(item.link);
        } else {
            setActiveSection(item.id);
        }
    };

    const renderContent = () => {
        switch (activeSection) {
            case 'overview': return <OverviewSection restaurantId={restaurantId} />;
            case 'employees': return <EmployeeSection restaurantId={restaurantId} />;
            case 'restaurant': return <RestaurantProfileSection restaurantId={restaurantId} />;
            case 'menu': return <MenuSection restaurantId={restaurantId} />;
            case 'tables': return <TablesSection restaurantId={restaurantId} />;
            case 'reservations': return <ReservationsSection restaurantId={restaurantId} />;
            case 'orders': return <OrdersSection restaurantId={restaurantId} />;
            case 'settings': return <SettingsSection restaurantId={restaurantId} />;
            default: return <OverviewSection restaurantId={restaurantId} />;
        }
    };

    return (
        <div className="flex h-screen bg-[#141414] text-white overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 bg-zinc-900/50 backdrop-blur-xl border-r border-white/10 flex flex-col">
                <div className="p-6">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-brand-lime to-brand-orange bg-clip-text text-transparent">
                        Owner Portal
                    </h1>
                    <p className="text-sm text-zinc-500 mt-1">Manage your restaurant</p>
                </div>

                <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleNavigation(item)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeSection === item.id
                                ? 'bg-brand-lime/10 text-brand-lime border border-brand-lime/20'
                                : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <item.icon size={20} />
                            <span className="font-medium">{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-white/10">
                    <div className="flex items-center gap-3 px-4 py-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-lime to-brand-orange flex items-center justify-center text-black font-bold">
                            {user?.name?.[0] || 'O'}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium truncate">{user?.name}</p>
                            <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/profile')}
                        className="w-full flex items-center gap-3 px-4 py-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-sm mb-1"
                    >
                        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back to Profile
                    </button>
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
                    >
                        <LogOut size={18} />
                        Sign Out
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Background Effects */}
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-brand-orange/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-brand-lime/10 rounded-full blur-[100px] pointer-events-none" />

                <header className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-black/20 backdrop-blur-sm z-10">
                    <h2 className="text-xl font-semibold capitalize">{activeSection}</h2>
                    <div className="flex items-center gap-4">
                        {restaurants.length > 1 ? (
                            <select
                                value={restaurantId || ''}
                                onChange={(e) => setRestaurantId(parseInt(e.target.value))}
                                className="bg-zinc-900 border border-white/10 text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:border-brand-lime"
                            >
                                {restaurants.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-zinc-400">
                                {restaurants.find(r => r.id === restaurantId)?.name || 'Loading...'}
                            </div>
                        )}
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-8 relative z-0 scrollbar-hide">
                    <div className="max-w-7xl mx-auto">
                        {restaurantId ? renderContent() : (
                            <div className="text-center py-20">
                                <h3 className="text-xl font-bold mb-2">No Restaurants Found</h3>
                                <p className="text-zinc-500">You don't have any restaurants assigned to your account.</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default OwnerDashboard;

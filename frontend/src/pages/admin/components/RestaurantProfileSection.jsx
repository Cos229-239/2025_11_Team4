import React, { useState, useEffect } from 'react';
import {
    Save, MapPin, Phone, Mail, Clock, Plus, Trash2, X, Edit2, ArrowLeft,
    Globe, DollarSign, Percent, Truck, UtensilsCrossed, Calendar,
    Instagram, Facebook, Twitter, Upload
} from 'lucide-react';
import { showToast } from '../../../utils/toast';
import { useUserAuth } from '../../../hooks/useUserAuth';

const SERVICE_TYPES = [
    { value: 'dine-in', label: 'Dine-in', icon: UtensilsCrossed },
    { value: 'takeout', label: 'Takeout', icon: UtensilsCrossed },
    { value: 'delivery', label: 'Delivery', icon: Truck },
    { value: 'curbside', label: 'Curbside Pickup', icon: UtensilsCrossed },
];

const RestaurantProfileSection = ({ restaurantId }) => {
    const { user, token } = useUserAuth();

    if (user?.role === 'developer') {
        return <DeveloperRestaurantManager token={token} />;
    }

    return <OwnerProfileEditor restaurantId={restaurantId} token={token} />;
};

// ==========================================
// Developer View: Manage Logic
// ==========================================
const DeveloperRestaurantManager = ({ token }) => {
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isaddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [newRestaurant, setNewRestaurant] = useState({
        name: '', description: '', email: '', phone: '', address: '', cuisine_type: '', logo_url: '', cover_image_url: ''
    });

    const fetchRestaurants = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/my-restaurants`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setRestaurants(data.restaurants);
            }
        } catch (err) {
            console.error("Failed to fetch restaurants", err);
            showToast.error("Failed to load restaurants");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRestaurants();
    }, [token]);

    const handleAddRestaurant = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/restaurants`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newRestaurant)
            });
            const data = await res.json();
            if (data.success) {
                showToast.success("Restaurant created successfully");
                setIsAddModalOpen(false);
                setNewRestaurant({ name: '', description: '', email: '', phone: '', address: '', cuisine_type: '' });
                fetchRestaurants();
            } else {
                showToast.error(data.message || "Failed to create restaurant");
            }
        } catch (err) {
            console.error(err);
            showToast.error("Error creating restaurant");
        }
    };

    const handleDeleteRestaurant = async (id) => {
        if (!window.confirm("Are you sure you want to delete this restaurant? This cannot be undone.")) return;

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/restaurants/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                showToast.success("Restaurant deleted");
                fetchRestaurants();
            } else {
                showToast.error(data.message || "Failed to delete");
            }
        } catch (err) {
            console.error(err);
            showToast.error("Error deleting restaurant");
        }
    };

    if (editingId) {
        return (
            <div className="space-y-4">
                <button
                    onClick={() => setEditingId(null)}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white px-4 py-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                    <ArrowLeft size={20} /> Back to List
                </button>
                <OwnerProfileEditor restaurantId={editingId} token={token} />
            </div>
        );
    }

    if (loading) return <div className="text-center py-10">Loading restaurants...</div>;

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Manage Restaurants</h2>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 bg-brand-lime text-black px-4 py-2 rounded-lg font-bold hover:bg-opacity-90 transition-colors"
                >
                    <Plus size={20} /> Add Restaurant
                </button>
            </div>

            <div className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-zinc-400">
                        <tr>
                            <th className="p-4">Name</th>
                            <th className="p-4">Cuisine</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Address</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {restaurants.map(r => (
                            <tr key={r.id} className="hover:bg-white/5 transition-colors">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        {r.logo_url ? (
                                            <img
                                                src={r.logo_url.startsWith('/') ? `${import.meta.env.VITE_API_URL}${r.logo_url}` : r.logo_url}
                                                alt={r.name}
                                                className="w-10 h-10 rounded-lg object-cover"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-zinc-500">
                                                <UtensilsCrossed size={20} />
                                            </div>
                                        )}
                                        <span className="font-medium">{r.name}</span>
                                    </div>
                                </td>
                                <td className="p-4 text-zinc-400">{r.cuisine_type || '-'}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${r.status === 'active' ? 'bg-green-500/20 text-green-400' :
                                        r.status === 'inactive' ? 'bg-yellow-500/20 text-yellow-400' :
                                            'bg-red-500/20 text-red-400'}`}>
                                        {r.status || 'active'}
                                    </span>
                                </td>
                                <td className="p-4 text-zinc-400 max-w-xs truncate">{r.address || '-'}</td>
                                <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => setEditingId(r.id)}
                                            className="p-2 text-brand-lime hover:bg-brand-lime/10 rounded-lg transition-colors"
                                            title="Edit Restaurant"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteRestaurant(r.id)}
                                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Delete Restaurant"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {restaurants.length === 0 && (
                            <tr>
                                <td colSpan="5" className="p-8 text-center text-zinc-500">No restaurants found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add Modal */}
            {isaddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md p-6 relative">
                        <button
                            onClick={() => setIsAddModalOpen(false)}
                            className="absolute top-4 right-4 text-zinc-400 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                        <h3 className="text-xl font-bold mb-4">Add New Restaurant</h3>
                        <form onSubmit={handleAddRestaurant} className="space-y-4">
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1">Name *</label>
                                <input
                                    required
                                    type="text"
                                    value={newRestaurant.name}
                                    onChange={e => setNewRestaurant({ ...newRestaurant, name: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-brand-lime"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1">Cuisine Type</label>
                                <input
                                    type="text"
                                    value={newRestaurant.cuisine_type}
                                    onChange={e => setNewRestaurant({ ...newRestaurant, cuisine_type: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-brand-lime"
                                    placeholder="e.g., Italian, Mexican, American"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={newRestaurant.email}
                                        onChange={e => setNewRestaurant({ ...newRestaurant, email: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-brand-lime"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-1">Phone</label>
                                    <input
                                        type="text"
                                        value={newRestaurant.phone}
                                        onChange={e => setNewRestaurant({ ...newRestaurant, phone: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-brand-lime"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1">Address</label>
                                <input
                                    type="text"
                                    value={newRestaurant.address}
                                    onChange={e => setNewRestaurant({ ...newRestaurant, address: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-brand-lime"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-brand-lime text-black font-bold py-2 rounded-lg hover:bg-opacity-90 mt-4"
                            >
                                Create Restaurant
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// ==========================================
// Owner View: Edit Profile Logic (Enhanced)
// ==========================================
const OwnerProfileEditor = ({ restaurantId, token }) => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('general');

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/restaurants/${restaurantId}`);
                const data = await res.json();
                if (data.success) {
                    setProfile({
                        ...data.restaurant,
                        service_types: data.restaurant.service_types || ['dine-in'],
                        social_media: data.restaurant.social_media || {}
                    });
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        if (restaurantId) fetchProfile();
    }, [restaurantId]);

    const handleImageUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
            setSaving(true);
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                const field = type === 'logo' ? 'logo_url' : 'cover_image_url';
                setProfile(prev => ({ ...prev, [field]: data.url }));
                showToast.success(`${type === 'logo' ? 'Logo' : 'Cover image'} uploaded`);
            } else {
                showToast.error(data.message || 'Upload failed');
            }
        } catch (err) {
            console.error(err);
            showToast.error('Error uploading image');
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        if (!token) return;
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/restaurants/${restaurantId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(profile)
            });
            const data = await res.json();
            if (data.success) {
                showToast.success("Profile updated successfully");
                setProfile(data.restaurant);
            } else {
                showToast.error(data.message);
            }
        } catch (err) {
            console.error(err);
            showToast.error("Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    const toggleServiceType = (type) => {
        setProfile(prev => ({
            ...prev,
            service_types: prev.service_types?.includes(type)
                ? prev.service_types.filter(t => t !== type)
                : [...(prev.service_types || []), type]
        }));
    };

    if (loading) return <div>Loading...</div>;
    if (!profile) return <div>Restaurant not found</div>;

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Restaurant Profile</h2>
                <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="flex items-center gap-2 bg-brand-lime text-black px-6 py-2.5 rounded-xl font-bold hover:bg-opacity-90 transition-colors disabled:opacity-50"
                >
                    <Save size={20} />
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-white/10 pb-2">
                {[
                    { id: 'general', label: 'General Info' },
                    { id: 'services', label: 'Services & Fees' },
                    { id: 'hours', label: 'Operating Hours' },
                    { id: 'social', label: 'Social Media' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${activeTab === tab.id
                            ? 'bg-white/10 text-white border-b-2 border-brand-lime'
                            : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* General Info Tab */}
            {activeTab === 'general' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Images Section */}
                        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6">
                            <h3 className="text-lg font-bold border-b border-white/5 pb-4">Restaurant Images</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Logo Upload */}
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2">Logo</label>
                                    <div className="flex flex-col items-center gap-4 p-4 border-2 border-dashed border-white/10 rounded-xl hover:border-brand-lime/50 transition-colors">
                                        {profile.logo_url ? (
                                            <img
                                                src={profile.logo_url.startsWith('/') ? `${import.meta.env.VITE_API_URL}${profile.logo_url}` : profile.logo_url}
                                                alt="Logo"
                                                className="w-32 h-32 object-contain rounded-lg bg-black/50"
                                            />
                                        ) : (
                                            <div className="w-32 h-32 flex items-center justify-center bg-white/5 rounded-lg text-zinc-500">
                                                No Logo
                                            </div>
                                        )}
                                        <label className="cursor-pointer bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                                            <Upload size={16} /> Upload Logo
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => handleImageUpload(e, 'logo')}
                                            />
                                        </label>
                                    </div>
                                </div>

                                {/* Cover Image Upload */}
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2">Cover Image</label>
                                    <div className="flex flex-col items-center gap-4 p-4 border-2 border-dashed border-white/10 rounded-xl hover:border-brand-lime/50 transition-colors">
                                        {profile.cover_image_url ? (
                                            <img
                                                src={profile.cover_image_url.startsWith('/') ? `${import.meta.env.VITE_API_URL}${profile.cover_image_url}` : profile.cover_image_url}
                                                alt="Cover"
                                                className="w-full h-32 object-cover rounded-lg"
                                            />
                                        ) : (
                                            <div className="w-full h-32 flex items-center justify-center bg-white/5 rounded-lg text-zinc-500">
                                                No Cover Image
                                            </div>
                                        )}
                                        <label className="cursor-pointer bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                                            <Upload size={16} /> Upload Cover
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => handleImageUpload(e, 'cover')}
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Basic Info */}
                        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
                            <h3 className="text-lg font-bold border-b border-white/5 pb-4">General Information</h3>

                            <div>
                                <label className="block text-sm text-zinc-400 mb-2">Restaurant Name *</label>
                                <input
                                    type="text"
                                    value={profile.name || ''}
                                    onChange={e => setProfile({ ...profile, name: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-zinc-400 mb-2">Description</label>
                                <textarea
                                    rows={4}
                                    value={profile.description || ''}
                                    onChange={e => setProfile({ ...profile, description: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none resize-none"
                                    placeholder="Tell customers about your restaurant..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-zinc-400 mb-2">Cuisine Type</label>
                                <input
                                    type="text"
                                    value={profile.cuisine_type || ''}
                                    onChange={e => setProfile({ ...profile, cuisine_type: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none"
                                    placeholder="e.g., Italian, Mexican, American, Fusion"
                                />
                            </div>
                        </div>

                        {/* Contact & Location */}
                        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
                            <h3 className="text-lg font-bold border-b border-white/5 pb-4 flex items-center gap-2">
                                <MapPin size={20} />
                                Location & Contact
                            </h3>

                            <div>
                                <label className="block text-sm text-zinc-400 mb-2">Address</label>
                                <input
                                    type="text"
                                    value={profile.address || ''}
                                    onChange={e => setProfile({ ...profile, address: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2 flex items-center gap-2">
                                        <Phone size={14} /> Phone
                                    </label>
                                    <input
                                        type="text"
                                        value={profile.phone || ''}
                                        onChange={e => setProfile({ ...profile, phone: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2 flex items-center gap-2">
                                        <Mail size={14} /> Email
                                    </label>
                                    <input
                                        type="email"
                                        value={profile.email || ''}
                                        onChange={e => setProfile({ ...profile, email: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2">Latitude</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={profile.latitude || ''}
                                        onChange={e => setProfile({ ...profile, latitude: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2">Longitude</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={profile.longitude || ''}
                                        onChange={e => setProfile({ ...profile, longitude: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-zinc-400 mb-2 flex items-center gap-2">
                                    <Globe size={14} /> Website
                                </label>
                                <input
                                    type="url"
                                    value={profile.website_url || ''}
                                    onChange={e => setProfile({ ...profile, website_url: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none"
                                    placeholder="https://yourrestaurant.com"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Side Panel - Status */}
                    <div className="space-y-6">
                        <div className="glass-panel p-6 rounded-2xl border border-white/5">
                            <h3 className="text-lg font-bold border-b border-white/5 pb-4 mb-4">Status</h3>
                            <select
                                value={profile.status || 'active'}
                                onChange={e => setProfile({ ...profile, status: e.target.value })}
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none"
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="closed">Temporarily Closed</option>
                                <option value="archived">Archived</option>
                            </select>
                            <p className="text-xs text-zinc-500 mt-2">
                                {profile.status === 'active' && 'Restaurant is visible and accepting orders'}
                                {profile.status === 'inactive' && 'Restaurant is hidden from customers'}
                                {profile.status === 'closed' && 'Restaurant is temporarily closed'}
                                {profile.status === 'archived' && 'Restaurant has been archived'}
                            </p>
                        </div>

                        <div className="glass-panel p-6 rounded-2xl border border-white/5">
                            <h3 className="text-lg font-bold border-b border-white/5 pb-4 mb-4">Quick Stats</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-zinc-400">Rating</span>
                                    <span className="font-bold text-yellow-400">{profile.rating || '0.0'} / 5.0</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-zinc-400">Prep Time</span>
                                    <span>{profile.estimated_prep_time_minutes || 30} min</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-zinc-400">Tax Rate</span>
                                    <span>{((profile.tax_rate || 0.0875) * 100).toFixed(2)}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Services & Fees Tab */}
            {activeTab === 'services' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
                        <h3 className="text-lg font-bold border-b border-white/5 pb-4">Service Types</h3>
                        <p className="text-sm text-zinc-400 mb-4">Select which services your restaurant offers</p>

                        <div className="grid grid-cols-2 gap-3">
                            {SERVICE_TYPES.map(service => (
                                <button
                                    key={service.value}
                                    type="button"
                                    onClick={() => toggleServiceType(service.value)}
                                    className={`p-4 rounded-xl border transition-all flex items-center gap-3 ${profile.service_types?.includes(service.value)
                                        ? 'bg-brand-lime/10 border-brand-lime/50 text-brand-lime'
                                        : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'}`}
                                >
                                    <service.icon size={20} />
                                    <span className="font-medium">{service.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="pt-4 space-y-4">
                            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                                <input
                                    type="checkbox"
                                    id="accepts_reservations"
                                    className="w-5 h-5 accent-brand-lime"
                                    checked={profile.accepts_reservations !== false}
                                    onChange={e => setProfile({ ...profile, accepts_reservations: e.target.checked })}
                                />
                                <label htmlFor="accepts_reservations" className="font-medium cursor-pointer flex items-center gap-2">
                                    <Calendar size={18} /> Accept Reservations
                                </label>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                                <input
                                    type="checkbox"
                                    id="accepts_online_orders"
                                    className="w-5 h-5 accent-brand-lime"
                                    checked={profile.accepts_online_orders !== false}
                                    onChange={e => setProfile({ ...profile, accepts_online_orders: e.target.checked })}
                                />
                                <label htmlFor="accepts_online_orders" className="font-medium cursor-pointer flex items-center gap-2">
                                    <Globe size={18} /> Accept Online Orders
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Delivery Settings */}
                        {profile.service_types?.includes('delivery') && (
                            <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
                                <h3 className="text-lg font-bold border-b border-white/5 pb-4 flex items-center gap-2">
                                    <Truck size={20} /> Delivery Settings
                                </h3>

                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2">Delivery Radius (km)</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        value={profile.delivery_radius_km || ''}
                                        onChange={e => setProfile({ ...profile, delivery_radius_km: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none"
                                        placeholder="e.g., 5"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2">Minimum Order Amount ($)</label>
                                    <div className="relative">
                                        <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={profile.minimum_order_amount || ''}
                                            onChange={e => setProfile({ ...profile, minimum_order_amount: e.target.value })}
                                            className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:border-brand-lime outline-none"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2">Delivery Fee ($)</label>
                                    <div className="relative">
                                        <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={profile.delivery_fee || ''}
                                            onChange={e => setProfile({ ...profile, delivery_fee: e.target.value })}
                                            className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:border-brand-lime outline-none"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Fees & Taxes */}
                        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
                            <h3 className="text-lg font-bold border-b border-white/5 pb-4 flex items-center gap-2">
                                <Percent size={20} /> Fees & Taxes
                            </h3>

                            <div>
                                <label className="block text-sm text-zinc-400 mb-2">Tax Rate (%)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={profile.tax_rate ? (profile.tax_rate * 100).toFixed(2) : ''}
                                    onChange={e => setProfile({ ...profile, tax_rate: parseFloat(e.target.value) / 100 || 0 })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none"
                                    placeholder="8.75"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-zinc-400 mb-2">Service Charge (%)</label>
                                <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    max="50"
                                    value={profile.service_charge_percent || ''}
                                    onChange={e => setProfile({ ...profile, service_charge_percent: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none"
                                    placeholder="0"
                                />
                                <p className="text-xs text-zinc-500 mt-1">Optional service charge added to orders</p>
                            </div>

                            <div>
                                <label className="block text-sm text-zinc-400 mb-2">Estimated Prep Time (minutes)</label>
                                <input
                                    type="number"
                                    min="5"
                                    step="5"
                                    value={profile.estimated_prep_time_minutes || ''}
                                    onChange={e => setProfile({ ...profile, estimated_prep_time_minutes: parseInt(e.target.value) || 30 })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none"
                                    placeholder="30"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Operating Hours Tab */}
            {activeTab === 'hours' && (
                <div className="glass-panel p-6 rounded-2xl border border-white/5">
                    <h3 className="text-lg font-bold border-b border-white/5 pb-4 mb-6 flex items-center gap-2">
                        <Clock size={20} />
                        Operating Hours
                    </h3>

                    <div className="space-y-4">
                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                            const hours = profile.opening_hours?.[day];
                            const isClosed = hours === 'closed' || hours?.closed;

                            return (
                                <div key={day} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
                                    <div className="w-28">
                                        <span className="font-medium capitalize">{day}</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={!isClosed}
                                            onChange={e => {
                                                const newHours = { ...profile.opening_hours };
                                                if (e.target.checked) {
                                                    newHours[day] = { open: '09:00', close: '21:00' };
                                                } else {
                                                    newHours[day] = 'closed';
                                                }
                                                setProfile({ ...profile, opening_hours: newHours });
                                            }}
                                            className="w-5 h-5 accent-brand-lime"
                                        />
                                        <span className="text-sm text-zinc-400">Open</span>
                                    </div>

                                    {!isClosed && (
                                        <>
                                            <input
                                                type="time"
                                                value={hours?.open || '09:00'}
                                                onChange={e => {
                                                    const newHours = {
                                                        ...profile.opening_hours,
                                                        [day]: { ...profile.opening_hours?.[day], open: e.target.value }
                                                    };
                                                    setProfile({ ...profile, opening_hours: newHours });
                                                }}
                                                className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brand-lime outline-none"
                                            />
                                            <span className="text-zinc-500">to</span>
                                            <input
                                                type="time"
                                                value={hours?.close || '21:00'}
                                                onChange={e => {
                                                    const newHours = {
                                                        ...profile.opening_hours,
                                                        [day]: { ...profile.opening_hours?.[day], close: e.target.value }
                                                    };
                                                    setProfile({ ...profile, opening_hours: newHours });
                                                }}
                                                className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brand-lime outline-none"
                                            />
                                        </>
                                    )}

                                    {isClosed && (
                                        <span className="text-red-400 text-sm font-medium">Closed</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Social Media Tab */}
            {activeTab === 'social' && (
                <div className="glass-panel p-6 rounded-2xl border border-white/5 max-w-xl">
                    <h3 className="text-lg font-bold border-b border-white/5 pb-4 mb-6">Social Media Links</h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-zinc-400 mb-2 flex items-center gap-2">
                                <Instagram size={16} /> Instagram
                            </label>
                            <input
                                type="text"
                                value={profile.social_media?.instagram || ''}
                                onChange={e => setProfile({
                                    ...profile,
                                    social_media: { ...profile.social_media, instagram: e.target.value }
                                })}
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none"
                                placeholder="@yourrestaurant"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-zinc-400 mb-2 flex items-center gap-2">
                                <Facebook size={16} /> Facebook
                            </label>
                            <input
                                type="text"
                                value={profile.social_media?.facebook || ''}
                                onChange={e => setProfile({
                                    ...profile,
                                    social_media: { ...profile.social_media, facebook: e.target.value }
                                })}
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none"
                                placeholder="https://facebook.com/yourrestaurant"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-zinc-400 mb-2 flex items-center gap-2">
                                <Twitter size={16} /> Twitter / X
                            </label>
                            <input
                                type="text"
                                value={profile.social_media?.twitter || ''}
                                onChange={e => setProfile({
                                    ...profile,
                                    social_media: { ...profile.social_media, twitter: e.target.value }
                                })}
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none"
                                placeholder="@yourrestaurant"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RestaurantProfileSection;

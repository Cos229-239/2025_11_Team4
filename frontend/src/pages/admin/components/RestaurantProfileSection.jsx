import React, { useState, useEffect } from 'react';
import { Save, MapPin, Phone, Mail, Clock } from 'lucide-react';
import { useUserAuth } from '../../../hooks/useUserAuth';

const RestaurantProfileSection = ({ restaurantId }) => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { token } = useUserAuth();

    useEffect(() => {
        // Ideally we have a specific endpoint or just GET /api/v1/restaurants/:id public/private
        // Admin routes might use PUT /api/admin/restaurants/:id but needed GET.
        // The prompt implies we can just use the public restaurant endpoint for GET, but maybe an admin specialized one?
        // Let's assume we can GET /api/restaurants/:id
        const fetchProfile = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/restaurants/${restaurantId}`);
                const data = await res.json();
                if (data.success) {
                    setProfile(data.restaurant);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [restaurantId]);

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
                alert("Profile updated successfully");
                setProfile(data.restaurant);
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!profile) return <div>Restaurant not found</div>;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
                        <h3 className="text-lg font-bold border-b border-white/5 pb-4">General Information</h3>

                        <div>
                            <label className="block text-sm text-zinc-400 mb-2">Restaurant Name</label>
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
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-zinc-400 mb-2">Cuisine Type</label>
                            <input
                                type="text"
                                value={profile.cuisine_type || ''}
                                onChange={e => setProfile({ ...profile, cuisine_type: e.target.value })}
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none"
                            />
                        </div>
                    </div>

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
                    </div>
                </div>

                {/* Side Panel - Hours */}
                <div className="space-y-6">
                    <div className="glass-panel p-6 rounded-2xl border border-white/5">
                        <h3 className="text-lg font-bold border-b border-white/5 pb-4 mb-4 flex items-center gap-2">
                            <Clock size={20} />
                            Operating Hours
                        </h3>

                        <div className="space-y-4">
                            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                                <div key={day} className="flex flex-col gap-1">
                                    <label className="text-sm font-medium capitalize text-zinc-300">{day}</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="time"
                                            value={profile.opening_hours?.[day]?.open || ''}
                                            onChange={e => {
                                                const newHours = { ...profile.opening_hours, [day]: { ...profile.opening_hours?.[day], open: e.target.value } };
                                                setProfile({ ...profile, opening_hours: newHours });
                                            }}
                                            className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-xs focus:border-brand-lime outline-none"
                                        />
                                        <span className="text-zinc-500">-</span>
                                        <input
                                            type="time"
                                            value={profile.opening_hours?.[day]?.close || ''}
                                            onChange={e => {
                                                const newHours = { ...profile.opening_hours, [day]: { ...profile.opening_hours?.[day], close: e.target.value } };
                                                setProfile({ ...profile, opening_hours: newHours });
                                            }}
                                            className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-xs focus:border-brand-lime outline-none"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RestaurantProfileSection;

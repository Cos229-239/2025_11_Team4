import React, { useState, useEffect } from 'react';
import { Save, Clock } from 'lucide-react';
import { showToast } from '../../../utils/toast';
import { useUserAuth } from '../../../hooks/useUserAuth';

const SettingsSection = ({ restaurantId }) => {
    const { token } = useUserAuth();
    const [settings, setSettings] = useState({ cancellation_window_hours: 12, reservation_duration_minutes: 90 });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            if (!token) return;
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/settings?restaurant_id=${restaurantId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success && data.settings) {
                    setSettings(data.settings);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, [restaurantId, token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        if (!token) return;
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ ...settings, restaurant_id: restaurantId })
            });
            const data = await res.json();
            if (data.success) showToast.success("Settings saved successfully");
            else showToast.error(data.message);
        } catch (err) { console.error(err); }
        finally { setSaving(false); }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="max-w-2xl">
            <h2 className="text-2xl font-bold mb-8">Reservation Settings</h2>

            <div className="glass-panel p-8 rounded-2xl border border-white/5 space-y-8">
                <div>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Clock size={20} className="text-brand-orange" />
                        Duration & Cancellation
                    </h3>
                    <p className="text-sm text-zinc-400 mb-6">Manage how long tables are reserved for and when customers can cancel.</p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium mb-2">Reservation Duration (minutes)</label>
                            <div className="flex items-center gap-4">
                                <input
                                    type="number"
                                    min="30"
                                    step="15"
                                    value={settings.reservation_duration_minutes}
                                    onChange={e => setSettings({ ...settings, reservation_duration_minutes: parseInt(e.target.value) })}
                                    className="w-32 bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none text-center font-bold text-lg"
                                />
                                <span className="text-zinc-500 text-sm">Typical status is 90 mins</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Cancellation Window (hours)</label>
                            <div className="flex items-center gap-4">
                                <input
                                    type="number"
                                    min="0"
                                    max="72"
                                    value={settings.cancellation_window_hours}
                                    onChange={e => setSettings({ ...settings, cancellation_window_hours: parseInt(e.target.value) })}
                                    className="w-32 bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none text-center font-bold text-lg"
                                />
                                <span className="text-zinc-500 text-sm">Hours before reservation</span>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-white/5">
                            <button
                                type="submit"
                                disabled={saving}
                                className="bg-brand-lime text-black px-6 py-3 rounded-xl font-bold hover:bg-opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                <Save size={18} />
                                {saving ? 'Saving...' : 'Save Configuration'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SettingsSection;

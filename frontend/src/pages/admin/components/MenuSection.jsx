import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Tag, DollarSign, Image as ImageIcon } from 'lucide-react';
import { useUserAuth } from '../../../hooks/useUserAuth';
import { useConfirm } from '../../../hooks/useConfirm';

const MenuSection = ({ restaurantId }) => {
    const { token } = useUserAuth();
    const { confirm } = useConfirm();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [showModal, setShowModal] = useState(false);

    // Form state
    const [currentItem, setCurrentItem] = useState({
        name: '',
        description: '',
        price: '',
        category: '',
        available: true,
        restaurant_id: ''
    });

    const fetchMenu = async () => {
        if (!restaurantId) return;
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/restaurants/${restaurantId}/menu`);
            const data = await res.json();
            if (data.success) setItems(data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMenu();
    }, [restaurantId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (!token) return;

            const url = isEditing
                ? `${import.meta.env.VITE_API_URL}/api/menu-items/${currentItem.id}`
                : `${import.meta.env.VITE_API_URL}/api/menu-items`;

            const method = isEditing ? 'PUT' : 'POST';
            const body = {
                ...currentItem,
                restaurant_id: restaurantId,
                price: parseFloat(currentItem.price)
            };

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            const data = await res.json();
            if (data.success) {
                fetchMenu();
                setShowModal(false);
                setCurrentItem({
                    name: '', description: '', price: '', category: '', available: true, restaurant_id: ''
                });
                setIsEditing(false);
            } else {
                alert(data.message || 'Operation failed');
            }
        } catch (err) {
            console.error(err);
            alert('Operation failed');
        }
    };

    const handleDelete = async (id) => {
        if (!await confirm('Delete Menu Item', 'Are you sure you want to delete this menu item?')) return;
        if (!token) return;
        try {
            await fetch(`${import.meta.env.VITE_API_URL}/api/menu-items/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setItems(items.filter(i => i.id !== id));
        } catch (err) {
            console.error(err);
            alert('Delete failed');
        }
    };

    const openModal = (item = null) => {
        if (item) {
            setIsEditing(true);
            setCurrentItem(item);
        } else {
            setIsEditing(false);
            setCurrentItem({
                name: '', description: '', price: '', category: '', available: true, restaurant_id: restaurantId
            });
        }
        setShowModal(true);
    };

    if (loading) return <div>Loading menu...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Menu Management</h2>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 bg-brand-lime text-black px-4 py-2 rounded-xl font-bold hover:bg-opacity-90 transition-colors"
                >
                    <Plus size={20} />
                    Add Item
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                        <p className="text-zinc-500">No menu items found. Add one to get started!</p>
                    </div>
                ) : (
                    items.map(item => (
                        <div key={item.id} className={`glass-panel p-5 rounded-2xl border transition-all hover:shadow-lg group ${!item.available ? 'border-red-900/30 opacity-75' : 'border-white/5 hover:border-brand-orange/30'}`}>
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-lg text-white">{item.name}</h3>
                                        {!item.available && (
                                            <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-xs rounded-full font-bold border border-red-500/20">
                                                Sold Out
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-brand-lime font-bold font-mono">${Number(item.price).toFixed(2)}</p>
                                </div>
                                <span className="px-2 py-1 bg-white/10 text-zinc-300 text-xs rounded-lg font-medium">
                                    {item.category}
                                </span>
                            </div>

                            <p className="text-zinc-400 text-sm mb-4 line-clamp-2 min-h-[40px]">
                                {item.description || <span className="italic opacity-50">No description</span>}
                            </p>

                            <div className="flex gap-2 pt-4 border-t border-white/5">
                                <button
                                    onClick={() => openModal(item)}
                                    className="flex-1 py-2 rounded-lg bg-white/5 text-blue-400 font-medium hover:bg-blue-500/10 transition text-sm flex items-center justify-center gap-2"
                                >
                                    <Edit2 size={16} /> Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(item.id)}
                                    className="flex-1 py-2 rounded-lg bg-white/5 text-red-400 font-medium hover:bg-red-500/10 transition text-sm flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={16} /> Delete
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel w-full max-w-lg p-8 rounded-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-6">{isEditing ? 'Edit Item' : 'Add New Item'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1">Item Name</label>
                                <input
                                    required
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none"
                                    value={currentItem.name}
                                    onChange={e => setCurrentItem({ ...currentItem, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-zinc-400 mb-1">Description</label>
                                <textarea
                                    rows={3}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none resize-none"
                                    value={currentItem.description}
                                    onChange={e => setCurrentItem({ ...currentItem, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-1">Price ($)</label>
                                    <div className="relative">
                                        <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                        <input
                                            type="number" step="0.01" required
                                            className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:border-brand-lime outline-none"
                                            value={currentItem.price}
                                            onChange={e => setCurrentItem({ ...currentItem, price: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-1">Category</label>
                                    <div className="relative">
                                        <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                        <input
                                            required
                                            className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:border-brand-lime outline-none"
                                            value={currentItem.category}
                                            onChange={e => setCurrentItem({ ...currentItem, category: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                                <input
                                    type="checkbox"
                                    id="available"
                                    className="w-5 h-5 accent-brand-lime"
                                    checked={currentItem.available}
                                    onChange={e => setCurrentItem({ ...currentItem, available: e.target.checked })}
                                />
                                <label htmlFor="available" className="font-medium cursor-pointer">Available for ordering</label>
                            </div>

                            <div className="flex gap-4 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-3 rounded-xl font-medium hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-brand-orange text-white py-3 rounded-xl font-bold hover:bg-opacity-90 transition-colors shadow-lg shadow-brand-orange/20"
                                >
                                    {isEditing ? 'Save Changes' : 'Create Item'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MenuSection;

import React, { useState, useEffect, useCallback } from 'react';
import {
    Plus, Edit2, Trash2, Tag, DollarSign, Image as ImageIcon,
    Clock, Flame, Star, Sparkles, AlertTriangle, Leaf, Upload,
    X, ChevronDown, ChevronUp, Settings2, GripVertical
} from 'lucide-react';
import { showToast } from '../../../utils/toast';
import { useUserAuth } from '../../../hooks/useUserAuth';
import { useConfirm } from '../../../hooks/useConfirm';

// Common dietary tags
const DIETARY_OPTIONS = [
    { value: 'vegetarian', label: 'Vegetarian', icon: Leaf },
    { value: 'vegan', label: 'Vegan', icon: Leaf },
    { value: 'gluten-free', label: 'Gluten-Free', icon: null },
    { value: 'gluten-free-option', label: 'GF Option', icon: null },
    { value: 'dairy-free', label: 'Dairy-Free', icon: null },
    { value: 'nut-free', label: 'Nut-Free', icon: null },
    { value: 'keto', label: 'Keto', icon: null },
    { value: 'halal', label: 'Halal', icon: null },
    { value: 'kosher', label: 'Kosher', icon: null },
];

// Common allergens
const ALLERGEN_OPTIONS = [
    'dairy', 'eggs', 'gluten', 'wheat', 'soy', 'peanuts',
    'tree-nuts', 'fish', 'shellfish', 'sesame'
];

const MenuSection = ({ restaurantId }) => {
    const { token } = useUserAuth();
    const { confirm } = useConfirm();
    const [items, setItems] = useState([]);
    const [modifierGroups, setModifierGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showModifierModal, setShowModifierModal] = useState(false);
    const [activeTab, setActiveTab] = useState('basic'); // basic, nutrition, modifiers
    const [uploading, setUploading] = useState(false);

    // Form state
    const [currentItem, setCurrentItem] = useState({
        name: '',
        description: '',
        price: '',
        category: '',
        available: true,
        restaurant_id: '',
        image_url: '',
        dietary_tags: [],
        allergens: [],
        calories: '',
        prep_time_minutes: '',
        spice_level: 0,
        is_featured: false,
        is_new: false,
        modifier_group_ids: []
    });

    // Modifier group form state
    const [currentModifierGroup, setCurrentModifierGroup] = useState({
        name: '',
        description: '',
        selection_type: 'single',
        min_selections: 0,
        max_selections: 1,
        is_required: false,
        modifiers: []
    });

    const fetchMenu = useCallback(async () => {
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
    }, [restaurantId]);

    const fetchModifierGroups = useCallback(async () => {
        if (!restaurantId) return;
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/modifiers/groups?restaurant_id=${restaurantId}`);
            const data = await res.json();
            if (data.success) setModifierGroups(data.data);
        } catch (err) {
            console.error('Failed to fetch modifier groups:', err);
        }
    }, [restaurantId]);

    useEffect(() => {
        fetchMenu();
        fetchModifierGroups();
    }, [fetchMenu, fetchModifierGroups]);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
            setUploading(true);
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                setCurrentItem(prev => ({ ...prev, image_url: data.url }));
                showToast.success('Image uploaded');
            } else {
                showToast.error(data.message || 'Upload failed');
            }
        } catch (err) {
            console.error(err);
            showToast.error('Error uploading image');
        } finally {
            setUploading(false);
        }
    };

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
                price: parseFloat(currentItem.price),
                calories: currentItem.calories ? parseInt(currentItem.calories) : null,
                prep_time_minutes: currentItem.prep_time_minutes ? parseInt(currentItem.prep_time_minutes) : null,
                spice_level: currentItem.spice_level || null
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
                // Update modifier links if needed
                if (currentItem.modifier_group_ids?.length >= 0) {
                    const itemId = data.data.id;
                    await fetch(`${import.meta.env.VITE_API_URL}/api/modifiers/menu-item/${itemId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ modifier_group_ids: currentItem.modifier_group_ids })
                    });
                }

                fetchMenu();
                setShowModal(false);
                resetForm();
                showToast.success(isEditing ? 'Item updated' : 'Item added');
            } else {
                showToast.error(data.message || 'Operation failed');
            }
        } catch (err) {
            console.error(err);
            showToast.error('Operation failed');
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
            showToast.success('Item deleted');
        } catch (err) {
            console.error(err);
            showToast.error('Delete failed');
        }
    };

    const resetForm = () => {
        setCurrentItem({
            name: '', description: '', price: '', category: '', available: true,
            restaurant_id: restaurantId, image_url: '', dietary_tags: [], allergens: [],
            calories: '', prep_time_minutes: '', spice_level: 0, is_featured: false, is_new: false,
            modifier_group_ids: []
        });
        setIsEditing(false);
        setActiveTab('basic');
    };

    const openModal = async (item = null) => {
        if (item) {
            setIsEditing(true);
            // Fetch modifier groups for this item
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/modifiers/menu-item/${item.id}`);
                const data = await res.json();
                const groupIds = data.success ? data.data.map(g => g.id) : [];
                setCurrentItem({
                    ...item,
                    modifier_group_ids: groupIds,
                    dietary_tags: item.dietary_tags || [],
                    allergens: item.allergens || []
                });
            } catch {
                setCurrentItem({
                    ...item,
                    modifier_group_ids: [],
                    dietary_tags: item.dietary_tags || [],
                    allergens: item.allergens || []
                });
            }
        } else {
            resetForm();
        }
        setShowModal(true);
    };

    // Modifier Group Management
    const handleSaveModifierGroup = async (e) => {
        e.preventDefault();
        try {
            const url = currentModifierGroup.id
                ? `${import.meta.env.VITE_API_URL}/api/modifiers/groups/${currentModifierGroup.id}`
                : `${import.meta.env.VITE_API_URL}/api/modifiers/groups`;

            const res = await fetch(url, {
                method: currentModifierGroup.id ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...currentModifierGroup,
                    restaurant_id: restaurantId
                })
            });

            const data = await res.json();
            if (data.success) {
                // Save modifiers for this group
                const groupId = data.data.id;
                for (const modifier of currentModifierGroup.modifiers) {
                    if (modifier.name.trim()) {
                        const modUrl = modifier.id
                            ? `${import.meta.env.VITE_API_URL}/api/modifiers/${modifier.id}`
                            : `${import.meta.env.VITE_API_URL}/api/modifiers`;

                        await fetch(modUrl, {
                            method: modifier.id ? 'PUT' : 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                ...modifier,
                                group_id: groupId,
                                price_adjustment: parseFloat(modifier.price_adjustment) || 0
                            })
                        });
                    }
                }

                fetchModifierGroups();
                setShowModifierModal(false);
                setCurrentModifierGroup({
                    name: '', description: '', selection_type: 'single',
                    min_selections: 0, max_selections: 1, is_required: false, modifiers: []
                });
                showToast.success('Modifier group saved');
            } else {
                showToast.error(data.message || 'Failed to save');
            }
        } catch (err) {
            console.error(err);
            showToast.error('Failed to save modifier group');
        }
    };

    const handleDeleteModifierGroup = async (id) => {
        if (!await confirm('Delete Modifier Group', 'This will remove the modifier group and all its options. Continue?')) return;
        try {
            await fetch(`${import.meta.env.VITE_API_URL}/api/modifiers/groups/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchModifierGroups();
            showToast.success('Modifier group deleted');
        } catch (err) {
            showToast.error('Failed to delete');
        }
    };

    const openModifierModal = (group = null) => {
        if (group) {
            setCurrentModifierGroup({
                ...group,
                modifiers: group.modifiers || []
            });
        } else {
            setCurrentModifierGroup({
                name: '', description: '', selection_type: 'single',
                min_selections: 0, max_selections: 1, is_required: false, modifiers: []
            });
        }
        setShowModifierModal(true);
    };

    const addModifierOption = () => {
        setCurrentModifierGroup(prev => ({
            ...prev,
            modifiers: [...prev.modifiers, { name: '', price_adjustment: 0, is_default: false, is_available: true }]
        }));
    };

    const removeModifierOption = (index) => {
        setCurrentModifierGroup(prev => ({
            ...prev,
            modifiers: prev.modifiers.filter((_, i) => i !== index)
        }));
    };

    const toggleDietaryTag = (tag) => {
        setCurrentItem(prev => ({
            ...prev,
            dietary_tags: prev.dietary_tags.includes(tag)
                ? prev.dietary_tags.filter(t => t !== tag)
                : [...prev.dietary_tags, tag]
        }));
    };

    const toggleAllergen = (allergen) => {
        setCurrentItem(prev => ({
            ...prev,
            allergens: prev.allergens.includes(allergen)
                ? prev.allergens.filter(a => a !== allergen)
                : [...prev.allergens, allergen]
        }));
    };

    const toggleModifierGroup = (groupId) => {
        setCurrentItem(prev => ({
            ...prev,
            modifier_group_ids: prev.modifier_group_ids.includes(groupId)
                ? prev.modifier_group_ids.filter(id => id !== groupId)
                : [...prev.modifier_group_ids, groupId]
        }));
    };

    // Group items by category
    const groupedItems = items.reduce((acc, item) => {
        const cat = item.category || 'Uncategorized';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    if (loading) return <div>Loading menu...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <h2 className="text-2xl font-bold">Menu Management</h2>
                <div className="flex gap-3">
                    <button
                        onClick={() => openModifierModal()}
                        className="flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-xl font-medium hover:bg-white/20 transition-colors"
                    >
                        <Settings2 size={20} />
                        Manage Modifiers
                    </button>
                    <button
                        onClick={() => openModal()}
                        className="flex items-center gap-2 bg-brand-lime text-black px-4 py-2 rounded-xl font-bold hover:bg-opacity-90 transition-colors"
                    >
                        <Plus size={20} />
                        Add Item
                    </button>
                </div>
            </div>

            {/* Modifier Groups Summary */}
            {modifierGroups.length > 0 && (
                <div className="glass-panel p-4 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wide">Modifier Groups</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {modifierGroups.map(group => (
                            <div
                                key={group.id}
                                onClick={() => openModifierModal(group)}
                                className="px-3 py-1.5 bg-white/5 rounded-lg text-sm cursor-pointer hover:bg-white/10 transition-colors flex items-center gap-2"
                            >
                                <span className="font-medium">{group.name}</span>
                                <span className="text-zinc-500 text-xs">({group.modifiers?.length || 0} options)</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Menu Items by Category */}
            {Object.keys(groupedItems).length === 0 ? (
                <div className="col-span-full text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                    <p className="text-zinc-500">No menu items found. Add one to get started!</p>
                </div>
            ) : (
                Object.entries(groupedItems).map(([category, categoryItems]) => (
                    <div key={category} className="space-y-4">
                        <h3 className="text-lg font-bold text-zinc-300 border-b border-white/10 pb-2">{category}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {categoryItems.map(item => (
                                <div
                                    key={item.id}
                                    className={`glass-panel p-0 rounded-2xl border transition-all hover:shadow-lg group overflow-hidden ${!item.available ? 'border-red-900/30 opacity-75' : 'border-white/5 hover:border-brand-orange/30'}`}
                                >
                                    {/* Image */}
                                    {item.image_url && (
                                        <div className="h-40 bg-black/50 overflow-hidden">
                                            <img
                                                src={item.image_url.startsWith('/') ? `${import.meta.env.VITE_API_URL}${item.image_url}` : item.image_url}
                                                alt={item.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}

                                    <div className="p-5">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <h3 className="font-bold text-lg text-white">{item.name}</h3>
                                                    {item.is_new && (
                                                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full font-bold">NEW</span>
                                                    )}
                                                    {item.is_featured && (
                                                        <Star size={14} className="text-yellow-400 fill-yellow-400" />
                                                    )}
                                                    {!item.available && (
                                                        <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-xs rounded-full font-bold border border-red-500/20">
                                                            Sold Out
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-brand-lime font-bold font-mono">${Number(item.price).toFixed(2)}</p>
                                            </div>
                                        </div>

                                        <p className="text-zinc-400 text-sm mb-3 line-clamp-2 min-h-[40px]">
                                            {item.description || <span className="italic opacity-50">No description</span>}
                                        </p>

                                        {/* Tags */}
                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                            {item.dietary_tags?.map(tag => (
                                                <span key={tag} className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded-full">
                                                    {tag}
                                                </span>
                                            ))}
                                            {item.spice_level > 0 && (
                                                <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-xs rounded-full flex items-center gap-1">
                                                    <Flame size={10} /> {item.spice_level}/5
                                                </span>
                                            )}
                                            {item.calories && (
                                                <span className="px-2 py-0.5 bg-white/10 text-zinc-400 text-xs rounded-full">
                                                    {item.calories} cal
                                                </span>
                                            )}
                                            {item.prep_time_minutes && (
                                                <span className="px-2 py-0.5 bg-white/10 text-zinc-400 text-xs rounded-full flex items-center gap-1">
                                                    <Clock size={10} /> {item.prep_time_minutes}m
                                                </span>
                                            )}
                                        </div>

                                        {/* Allergens warning */}
                                        {item.allergens?.length > 0 && (
                                            <div className="text-xs text-orange-400 flex items-center gap-1 mb-3">
                                                <AlertTriangle size={12} />
                                                Contains: {item.allergens.join(', ')}
                                            </div>
                                        )}

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
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}

            {/* Menu Item Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel w-full max-w-2xl p-0 rounded-2xl border border-white/10 max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-xl font-bold">{isEditing ? 'Edit Item' : 'Add New Item'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-white/10">
                            {[
                                { id: 'basic', label: 'Basic Info' },
                                { id: 'nutrition', label: 'Nutrition & Tags' },
                                { id: 'modifiers', label: 'Modifiers' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-white/5 text-white border-b-2 border-brand-lime' : 'text-zinc-400 hover:text-white'}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                            {/* Basic Info Tab */}
                            {activeTab === 'basic' && (
                                <>
                                    {/* Image Upload */}
                                    <div>
                                        <label className="block text-sm text-zinc-400 mb-2">Item Image</label>
                                        <div className="flex items-center gap-4">
                                            {currentItem.image_url ? (
                                                <div className="relative">
                                                    <img
                                                        src={currentItem.image_url.startsWith('/') ? `${import.meta.env.VITE_API_URL}${currentItem.image_url}` : currentItem.image_url}
                                                        alt="Preview"
                                                        className="w-24 h-24 object-cover rounded-lg"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setCurrentItem(prev => ({ ...prev, image_url: '' }))}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="w-24 h-24 bg-white/5 rounded-lg flex items-center justify-center text-zinc-500">
                                                    <ImageIcon size={32} />
                                                </div>
                                            )}
                                            <label className="cursor-pointer bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                                                <Upload size={16} />
                                                {uploading ? 'Uploading...' : 'Upload Image'}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handleImageUpload}
                                                    disabled={uploading}
                                                />
                                            </label>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm text-zinc-400 mb-1">Item Name *</label>
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
                                            <label className="block text-sm text-zinc-400 mb-1">Price ($) *</label>
                                            <div className="relative">
                                                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                                <input
                                                    type="number" step="0.01" required min="0"
                                                    className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:border-brand-lime outline-none"
                                                    value={currentItem.price}
                                                    onChange={e => setCurrentItem({ ...currentItem, price: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm text-zinc-400 mb-1">Category *</label>
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

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                                            <input
                                                type="checkbox"
                                                id="available"
                                                className="w-5 h-5 accent-brand-lime"
                                                checked={currentItem.available}
                                                onChange={e => setCurrentItem({ ...currentItem, available: e.target.checked })}
                                            />
                                            <label htmlFor="available" className="font-medium cursor-pointer">Available</label>
                                        </div>
                                        <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                                            <input
                                                type="checkbox"
                                                id="is_featured"
                                                className="w-5 h-5 accent-yellow-500"
                                                checked={currentItem.is_featured}
                                                onChange={e => setCurrentItem({ ...currentItem, is_featured: e.target.checked })}
                                            />
                                            <label htmlFor="is_featured" className="font-medium cursor-pointer flex items-center gap-2">
                                                <Star size={16} /> Featured
                                            </label>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                                        <input
                                            type="checkbox"
                                            id="is_new"
                                            className="w-5 h-5 accent-blue-500"
                                            checked={currentItem.is_new}
                                            onChange={e => setCurrentItem({ ...currentItem, is_new: e.target.checked })}
                                        />
                                        <label htmlFor="is_new" className="font-medium cursor-pointer flex items-center gap-2">
                                            <Sparkles size={16} /> Mark as NEW
                                        </label>
                                    </div>
                                </>
                            )}

                            {/* Nutrition & Tags Tab */}
                            {activeTab === 'nutrition' && (
                                <>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm text-zinc-400 mb-1">Calories</label>
                                            <input
                                                type="number" min="0"
                                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none"
                                                value={currentItem.calories}
                                                onChange={e => setCurrentItem({ ...currentItem, calories: e.target.value })}
                                                placeholder="kcal"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-zinc-400 mb-1">Prep Time</label>
                                            <div className="relative">
                                                <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                                <input
                                                    type="number" min="0"
                                                    className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:border-brand-lime outline-none"
                                                    value={currentItem.prep_time_minutes}
                                                    onChange={e => setCurrentItem({ ...currentItem, prep_time_minutes: e.target.value })}
                                                    placeholder="min"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm text-zinc-400 mb-1">Spice Level</label>
                                            <div className="flex items-center gap-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3">
                                                {[1, 2, 3, 4, 5].map(level => (
                                                    <button
                                                        key={level}
                                                        type="button"
                                                        onClick={() => setCurrentItem({ ...currentItem, spice_level: currentItem.spice_level === level ? 0 : level })}
                                                        className={`p-1 transition-colors ${currentItem.spice_level >= level ? 'text-red-400' : 'text-zinc-600'}`}
                                                    >
                                                        <Flame size={18} fill={currentItem.spice_level >= level ? 'currentColor' : 'none'} />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm text-zinc-400 mb-2">Dietary Tags</label>
                                        <div className="flex flex-wrap gap-2">
                                            {DIETARY_OPTIONS.map(opt => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => toggleDietaryTag(opt.value)}
                                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${currentItem.dietary_tags.includes(opt.value)
                                                        ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                                                        : 'bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10'}`}
                                                >
                                                    {opt.icon && <opt.icon size={14} />}
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm text-zinc-400 mb-2 flex items-center gap-2">
                                            <AlertTriangle size={14} className="text-orange-400" /> Allergens
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {ALLERGEN_OPTIONS.map(allergen => (
                                                <button
                                                    key={allergen}
                                                    type="button"
                                                    onClick={() => toggleAllergen(allergen)}
                                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${currentItem.allergens.includes(allergen)
                                                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                                                        : 'bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10'}`}
                                                >
                                                    {allergen}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Modifiers Tab */}
                            {activeTab === 'modifiers' && (
                                <div className="space-y-4">
                                    <p className="text-sm text-zinc-400">
                                        Select which modifier groups apply to this item (e.g., size options, add-ons, cooking preferences)
                                    </p>

                                    {modifierGroups.length === 0 ? (
                                        <div className="p-6 text-center bg-white/5 rounded-xl border border-dashed border-white/10">
                                            <p className="text-zinc-500 mb-3">No modifier groups created yet</p>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowModal(false);
                                                    openModifierModal();
                                                }}
                                                className="text-brand-lime text-sm font-medium hover:underline"
                                            >
                                                Create your first modifier group
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {modifierGroups.map(group => (
                                                <div
                                                    key={group.id}
                                                    onClick={() => toggleModifierGroup(group.id)}
                                                    className={`p-4 rounded-xl border cursor-pointer transition-all ${currentItem.modifier_group_ids.includes(group.id)
                                                        ? 'bg-brand-lime/10 border-brand-lime/50'
                                                        : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <h4 className="font-medium">{group.name}</h4>
                                                            <p className="text-sm text-zinc-400">
                                                                {group.selection_type === 'single' ? 'Choose one' : 'Choose multiple'}
                                                                {group.is_required && <span className="text-red-400 ml-2">Required</span>}
                                                            </p>
                                                        </div>
                                                        <input
                                                            type="checkbox"
                                                            checked={currentItem.modifier_group_ids.includes(group.id)}
                                                            onChange={() => { }}
                                                            className="w-5 h-5 accent-brand-lime"
                                                        />
                                                    </div>
                                                    {group.modifiers?.length > 0 && (
                                                        <div className="mt-2 flex flex-wrap gap-1">
                                                            {group.modifiers.map(mod => (
                                                                <span key={mod.id} className="text-xs px-2 py-0.5 bg-white/10 rounded-full">
                                                                    {mod.name}
                                                                    {mod.price_adjustment !== 0 && (
                                                                        <span className={mod.price_adjustment > 0 ? 'text-green-400' : 'text-red-400'}>
                                                                            {' '}({mod.price_adjustment > 0 ? '+' : ''}{mod.price_adjustment.toFixed(2)})
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </form>

                        <div className="p-6 border-t border-white/10 flex gap-4">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="flex-1 py-3 rounded-xl font-medium hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="flex-1 bg-brand-orange text-white py-3 rounded-xl font-bold hover:bg-opacity-90 transition-colors shadow-lg shadow-brand-orange/20"
                            >
                                {isEditing ? 'Save Changes' : 'Create Item'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modifier Group Modal */}
            {showModifierModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel w-full max-w-xl p-0 rounded-2xl border border-white/10 max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-xl font-bold">{currentModifierGroup.id ? 'Edit Modifier Group' : 'Create Modifier Group'}</h3>
                            <button onClick={() => setShowModifierModal(false)} className="text-zinc-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveModifierGroup} className="flex-1 overflow-y-auto p-6 space-y-4">
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1">Group Name *</label>
                                <input
                                    required
                                    placeholder="e.g., Size, Toppings, Cooking Level"
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none"
                                    value={currentModifierGroup.name}
                                    onChange={e => setCurrentModifierGroup({ ...currentModifierGroup, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-zinc-400 mb-1">Description</label>
                                <input
                                    placeholder="e.g., Choose your preferred size"
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none"
                                    value={currentModifierGroup.description}
                                    onChange={e => setCurrentModifierGroup({ ...currentModifierGroup, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-1">Selection Type</label>
                                    <select
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none"
                                        value={currentModifierGroup.selection_type}
                                        onChange={e => setCurrentModifierGroup({ ...currentModifierGroup, selection_type: e.target.value })}
                                    >
                                        <option value="single">Single (Radio)</option>
                                        <option value="multiple">Multiple (Checkbox)</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                                    <input
                                        type="checkbox"
                                        id="is_required"
                                        className="w-5 h-5 accent-brand-lime"
                                        checked={currentModifierGroup.is_required}
                                        onChange={e => setCurrentModifierGroup({ ...currentModifierGroup, is_required: e.target.checked })}
                                    />
                                    <label htmlFor="is_required" className="font-medium cursor-pointer">Required</label>
                                </div>
                            </div>

                            {currentModifierGroup.selection_type === 'multiple' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-zinc-400 mb-1">Min Selections</label>
                                        <input
                                            type="number" min="0"
                                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none"
                                            value={currentModifierGroup.min_selections}
                                            onChange={e => setCurrentModifierGroup({ ...currentModifierGroup, min_selections: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-zinc-400 mb-1">Max Selections</label>
                                        <input
                                            type="number" min="1"
                                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none"
                                            value={currentModifierGroup.max_selections}
                                            onChange={e => setCurrentModifierGroup({ ...currentModifierGroup, max_selections: parseInt(e.target.value) || 1 })}
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm text-zinc-400">Options</label>
                                    <button
                                        type="button"
                                        onClick={addModifierOption}
                                        className="text-brand-lime text-sm font-medium hover:underline flex items-center gap-1"
                                    >
                                        <Plus size={14} /> Add Option
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {currentModifierGroup.modifiers.map((mod, index) => (
                                        <div key={index} className="flex items-center gap-2 p-3 bg-white/5 rounded-xl">
                                            <GripVertical size={16} className="text-zinc-600" />
                                            <input
                                                placeholder="Option name"
                                                className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brand-lime outline-none"
                                                value={mod.name}
                                                onChange={e => {
                                                    const newMods = [...currentModifierGroup.modifiers];
                                                    newMods[index].name = e.target.value;
                                                    setCurrentModifierGroup({ ...currentModifierGroup, modifiers: newMods });
                                                }}
                                            />
                                            <div className="relative w-24">
                                                <DollarSign size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
                                                <input
                                                    type="number" step="0.01"
                                                    placeholder="+0.00"
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg pl-7 pr-2 py-2 text-sm focus:border-brand-lime outline-none"
                                                    value={mod.price_adjustment}
                                                    onChange={e => {
                                                        const newMods = [...currentModifierGroup.modifiers];
                                                        newMods[index].price_adjustment = e.target.value;
                                                        setCurrentModifierGroup({ ...currentModifierGroup, modifiers: newMods });
                                                    }}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newMods = [...currentModifierGroup.modifiers];
                                                    newMods[index].is_default = !newMods[index].is_default;
                                                    setCurrentModifierGroup({ ...currentModifierGroup, modifiers: newMods });
                                                }}
                                                className={`px-2 py-1 rounded text-xs font-medium ${mod.is_default ? 'bg-brand-lime/20 text-brand-lime' : 'bg-white/10 text-zinc-400'}`}
                                            >
                                                Default
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeModifierOption(index)}
                                                className="p-1 text-red-400 hover:bg-red-500/10 rounded"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </form>

                        <div className="p-6 border-t border-white/10 flex gap-4">
                            {currentModifierGroup.id && (
                                <button
                                    type="button"
                                    onClick={() => handleDeleteModifierGroup(currentModifierGroup.id)}
                                    className="px-4 py-3 rounded-xl font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                    Delete Group
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setShowModifierModal(false)}
                                className="flex-1 py-3 rounded-xl font-medium hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveModifierGroup}
                                className="flex-1 bg-brand-lime text-black py-3 rounded-xl font-bold hover:bg-opacity-90 transition-colors"
                            >
                                Save Modifier Group
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MenuSection;

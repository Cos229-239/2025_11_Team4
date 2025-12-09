import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Printer, Download, Edit2, X, Users, MapPin, Accessibility, Save } from 'lucide-react';
import { showToast } from '../../../utils/toast';
import { useUserAuth } from '../../../hooks/useUserAuth';
import { useConfirm } from '../../../hooks/useConfirm';

const TABLE_STATUSES = [
    { value: 'available', label: 'Available', color: 'bg-green-500/10 text-green-400' },
    { value: 'occupied', label: 'Occupied', color: 'bg-red-500/10 text-red-400' },
    { value: 'reserved', label: 'Reserved', color: 'bg-blue-500/10 text-blue-400' },
    { value: 'unavailable', label: 'Unavailable', color: 'bg-yellow-500/10 text-yellow-400' },
    { value: 'out-of-service', label: 'Out of Service', color: 'bg-zinc-500/10 text-zinc-400' },
];

const TABLE_SHAPES = [
    { value: 'square', label: 'Square' },
    { value: 'round', label: 'Round' },
    { value: 'rectangle', label: 'Rectangle' },
    { value: 'booth', label: 'Booth' },
];

const SECTIONS = ['Main', 'Patio', 'Bar', 'Private', 'VIP', 'Outdoor'];

const TablesSection = ({ restaurantId }) => {
    const { token } = useUserAuth();
    const { confirm } = useConfirm();
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentTable, setCurrentTable] = useState({
        table_number: '',
        capacity: 4,
        min_capacity: 1,
        status: 'available',
        section: '',
        shape: 'square',
        notes: '',
        is_accessible: false
    });

    const fetchTables = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/tables?restaurant_id=${restaurantId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                // Filter by restaurantId since API returns all
                const filtered = data.data.filter(t => t.restaurant_id === parseInt(restaurantId));
                setTables(filtered);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [restaurantId, token]);

    useEffect(() => {
        if (restaurantId && token) fetchTables();
    }, [fetchTables, restaurantId, token]);

    const resetForm = () => {
        setCurrentTable({
            table_number: '',
            capacity: 4,
            min_capacity: 1,
            status: 'available',
            section: '',
            shape: 'square',
            notes: '',
            is_accessible: false
        });
        setIsEditing(false);
    };

    const openModal = (table = null) => {
        if (table) {
            setIsEditing(true);
            setCurrentTable({
                ...table,
                min_capacity: table.min_capacity || 1
            });
        } else {
            resetForm();
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!token) return;

        try {
            const url = isEditing
                ? `${import.meta.env.VITE_API_URL}/api/tables/${currentTable.id}`
                : `${import.meta.env.VITE_API_URL}/api/tables`;

            const method = isEditing ? 'PATCH' : 'POST';
            const body = {
                ...currentTable,
                restaurant_id: restaurantId,
                table_number: parseInt(currentTable.table_number),
                capacity: parseInt(currentTable.capacity),
                min_capacity: parseInt(currentTable.min_capacity) || 1
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
                fetchTables();
                setShowModal(false);
                resetForm();
                showToast.success(isEditing ? 'Table updated' : 'Table created');
            } else {
                showToast.error(data.error || 'Operation failed');
            }
        } catch (err) {
            console.error(err);
            showToast.error('Operation failed');
        }
    };

    const handleDelete = async (id) => {
        if (!await confirm('Delete Table', 'Are you sure you want to delete this table? This action cannot be undone.')) return;
        if (!token) return;
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/tables/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setTables(tables.filter(t => t.id !== id));
                showToast.success('Table deleted');
            } else {
                showToast.error(data.error || 'Failed to delete table');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDownloadQR = (table) => {
        if (!table.qr_code) return;
        const link = document.createElement('a');
        link.href = table.qr_code;
        link.download = `table-${table.table_number}-qr.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrintQR = (table) => {
        if (!table.qr_code) return;
        const w = window.open('', '_blank');
        w.document.write(`
            <html>
                <body style="display:flex;flex-direction:column;align-items:center;padding:40px;font-family:sans-serif;">
                    <h1 style="margin-bottom:10px;">Table ${table.table_number}</h1>
                    <img src="${table.qr_code}" style="width:300px;height:300px;" />
                    <p style="margin-top:20px;">Scan to Order</p>
                </body>
            </html>
        `);
        w.document.close();
        w.focus();
        setTimeout(() => { w.print(); w.close(); }, 500);
    };

    const getStatusConfig = (status) => {
        return TABLE_STATUSES.find(s => s.value === status) || TABLE_STATUSES[0];
    };

    // Group tables by section
    const groupedTables = tables.reduce((acc, table) => {
        const section = table.section || 'Unassigned';
        if (!acc[section]) acc[section] = [];
        acc[section].push(table);
        return acc;
    }, {});

    // Statistics
    const stats = {
        total: tables.length,
        available: tables.filter(t => t.status === 'available').length,
        occupied: tables.filter(t => t.status === 'occupied').length,
        reserved: tables.filter(t => t.status === 'reserved').length,
        totalCapacity: tables.reduce((sum, t) => sum + (t.capacity || 0), 0)
    };

    if (loading) return <div>Loading tables...</div>;

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <h2 className="text-2xl font-bold">Table Management</h2>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 bg-brand-lime text-black px-4 py-2 rounded-xl font-bold hover:bg-opacity-90 transition-colors"
                >
                    <Plus size={20} />
                    Add Table
                </button>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="glass-panel p-4 rounded-xl border border-white/5 text-center">
                    <p className="text-3xl font-bold">{stats.total}</p>
                    <p className="text-sm text-zinc-400">Total Tables</p>
                </div>
                <div className="glass-panel p-4 rounded-xl border border-white/5 text-center">
                    <p className="text-3xl font-bold text-green-400">{stats.available}</p>
                    <p className="text-sm text-zinc-400">Available</p>
                </div>
                <div className="glass-panel p-4 rounded-xl border border-white/5 text-center">
                    <p className="text-3xl font-bold text-red-400">{stats.occupied}</p>
                    <p className="text-sm text-zinc-400">Occupied</p>
                </div>
                <div className="glass-panel p-4 rounded-xl border border-white/5 text-center">
                    <p className="text-3xl font-bold text-blue-400">{stats.reserved}</p>
                    <p className="text-sm text-zinc-400">Reserved</p>
                </div>
                <div className="glass-panel p-4 rounded-xl border border-white/5 text-center">
                    <p className="text-3xl font-bold text-brand-lime">{stats.totalCapacity}</p>
                    <p className="text-sm text-zinc-400">Total Seats</p>
                </div>
            </div>

            {/* Tables by Section */}
            {tables.length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                    <p className="text-zinc-400 mb-2">No tables exist yet.</p>
                    <p className="text-zinc-600 text-sm">Create your first table to get started.</p>
                </div>
            ) : (
                Object.entries(groupedTables).map(([section, sectionTables]) => (
                    <div key={section} className="space-y-4">
                        <h3 className="text-lg font-bold text-zinc-300 border-b border-white/10 pb-2 flex items-center gap-2">
                            <MapPin size={18} />
                            {section}
                            <span className="text-sm font-normal text-zinc-500">({sectionTables.length} tables)</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {sectionTables.map(table => {
                                const statusConfig = getStatusConfig(table.status);
                                return (
                                    <div key={table.id} className="glass-panel p-0 rounded-2xl border border-white/5 overflow-hidden group hover:border-brand-orange/30 transition-all">
                                        <div className="p-5 border-b border-white/5 bg-white/5 flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-xl font-bold">Table {table.table_number}</h3>
                                                    {table.is_accessible && (
                                                        <Accessibility size={16} className="text-blue-400" title="Accessible" />
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Users size={14} className="text-zinc-500" />
                                                    <span className="text-sm text-zinc-400">
                                                        {table.min_capacity && table.min_capacity !== table.capacity
                                                            ? `${table.min_capacity}-${table.capacity}`
                                                            : table.capacity
                                                        } Seats
                                                    </span>
                                                    {table.shape && table.shape !== 'square' && (
                                                        <span className="text-xs text-zinc-500 capitalize">({table.shape})</span>
                                                    )}
                                                </div>
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${statusConfig.color}`}>
                                                {statusConfig.label}
                                            </span>
                                        </div>

                                        <div className="p-6 flex flex-col items-center">
                                            {table.qr_code ? (
                                                <img src={table.qr_code} alt="QR" className="w-32 h-32 bg-white p-2 rounded-lg mb-4" />
                                            ) : (
                                                <div className="w-32 h-32 bg-white/5 rounded-lg mb-4 flex items-center justify-center text-zinc-500 text-xs">
                                                    No QR
                                                </div>
                                            )}

                                            {table.notes && (
                                                <p className="text-xs text-zinc-500 text-center mb-4 line-clamp-2">{table.notes}</p>
                                            )}

                                            <div className="grid grid-cols-2 w-full gap-2">
                                                <button
                                                    onClick={() => handleDownloadQR(table)}
                                                    disabled={!table.qr_code}
                                                    className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 disabled:opacity-50 flex justify-center"
                                                    title="Download QR"
                                                >
                                                    <Download size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handlePrintQR(table)}
                                                    disabled={!table.qr_code}
                                                    className="p-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 disabled:opacity-50 flex justify-center"
                                                    title="Print QR"
                                                >
                                                    <Printer size={18} />
                                                </button>
                                                <button
                                                    onClick={() => openModal(table)}
                                                    className="p-2 bg-brand-lime/10 text-brand-lime rounded-lg hover:bg-brand-lime/20 flex justify-center"
                                                    title="Edit Table"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(table.id)}
                                                    className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 flex justify-center"
                                                    title="Delete Table"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))
            )}

            {/* Table Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel w-full max-w-lg p-0 rounded-2xl border border-white/10 max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-xl font-bold">{isEditing ? 'Edit Table' : 'Add New Table'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2">Table Number *</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={currentTable.table_number}
                                        onChange={e => setCurrentTable({ ...currentTable, table_number: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none"
                                        placeholder="#"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2">Status</label>
                                    <select
                                        value={currentTable.status}
                                        onChange={e => setCurrentTable({ ...currentTable, status: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none"
                                    >
                                        {TABLE_STATUSES.map(status => (
                                            <option key={status.value} value={status.value}>{status.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2">Min Capacity</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={currentTable.min_capacity}
                                        onChange={e => setCurrentTable({ ...currentTable, min_capacity: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none"
                                        placeholder="1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2">Max Capacity *</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={currentTable.capacity}
                                        onChange={e => setCurrentTable({ ...currentTable, capacity: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none"
                                        placeholder="4"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2">Section</label>
                                    <select
                                        value={currentTable.section}
                                        onChange={e => setCurrentTable({ ...currentTable, section: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none"
                                    >
                                        <option value="">-- Select Section --</option>
                                        {SECTIONS.map(section => (
                                            <option key={section} value={section}>{section}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2">Shape</label>
                                    <select
                                        value={currentTable.shape}
                                        onChange={e => setCurrentTable({ ...currentTable, shape: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none"
                                    >
                                        {TABLE_SHAPES.map(shape => (
                                            <option key={shape.value} value={shape.value}>{shape.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-zinc-400 mb-2">Notes</label>
                                <textarea
                                    rows={3}
                                    value={currentTable.notes || ''}
                                    onChange={e => setCurrentTable({ ...currentTable, notes: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none resize-none"
                                    placeholder="e.g., Near window, best for couples, etc."
                                />
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                                <input
                                    type="checkbox"
                                    id="is_accessible"
                                    className="w-5 h-5 accent-brand-lime"
                                    checked={currentTable.is_accessible}
                                    onChange={e => setCurrentTable({ ...currentTable, is_accessible: e.target.checked })}
                                />
                                <label htmlFor="is_accessible" className="font-medium cursor-pointer flex items-center gap-2">
                                    <Accessibility size={18} /> Wheelchair Accessible
                                </label>
                            </div>
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
                                className="flex-1 bg-brand-lime text-black py-3 rounded-xl font-bold hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2"
                            >
                                <Save size={18} />
                                {isEditing ? 'Save Changes' : 'Create Table'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TablesSection;

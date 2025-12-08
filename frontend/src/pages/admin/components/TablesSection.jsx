import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Printer, Download, Layout } from 'lucide-react';
import { useUserAuth } from '../../../hooks/useUserAuth';
import { useConfirm } from '../../../hooks/useConfirm';

const TablesSection = ({ restaurantId }) => {
    const { token } = useUserAuth();
    const { confirm } = useConfirm();
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newTable, setNewTable] = useState({ table_number: '', capacity: 4 });

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

    const handleCreateTable = async (e) => {
        e.preventDefault();
        if (!newTable.table_number || !newTable.capacity) return;
        if (!token) return;
        setIsCreating(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/tables`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    restaurant_id: restaurantId,
                    table_number: parseInt(newTable.table_number),
                    capacity: parseInt(newTable.capacity),
                    status: 'available'
                })
            });
            const data = await res.json();
            if (data.success) {
                setTables([...tables, data.data]);
                setNewTable({ table_number: '', capacity: 4 });
                alert('Table created successfully!');
            } else {
                alert(data.error || 'Failed to create table');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsCreating(false);
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
            } else {
                alert(data.error || 'Failed to delete table');
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

    if (loading) return <div>Loading tables...</div>;

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold">Table Management</h2>

            {/* Create Table Form */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Plus size={20} className="text-brand-orange" />
                    Add New Table
                </h3>
                <form onSubmit={handleCreateTable} className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-sm text-zinc-400 mb-2">Table Number</label>
                        <input
                            type="number"
                            required
                            min="1"
                            value={newTable.table_number}
                            onChange={e => setNewTable({ ...newTable, table_number: e.target.value })}
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none"
                            placeholder="#"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm text-zinc-400 mb-2">Capacity</label>
                        <input
                            type="number"
                            required
                            min="1"
                            value={newTable.capacity}
                            onChange={e => setNewTable({ ...newTable, capacity: e.target.value })}
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none"
                            placeholder="Seats"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isCreating}
                        className="bg-brand-lime text-black px-6 py-3 rounded-xl font-bold hover:bg-opacity-90 transition-all disabled:opacity-50"
                    >
                        {isCreating ? 'Creating...' : 'Create Table'}
                    </button>
                </form>
            </div>

            {/* Tables Grid */}
            {tables.length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                    <p className="text-zinc-400 mb-2">No tables exist yet.</p>
                    <p className="text-zinc-600 text-sm">Create your first table above to get started.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {tables.map(table => (
                        <div key={table.id} className="glass-panel p-0 rounded-2xl border border-white/5 overflow-hidden group hover:border-brand-orange/30 transition-all">
                            <div className="p-5 border-b border-white/5 bg-white/5 flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold">Table {table.table_number}</h3>
                                    <p className="text-sm text-zinc-400">{table.capacity} Seats</p>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${table.status === 'available' ? 'bg-green-500/10 text-green-400' :
                                    table.status === 'occupied' ? 'bg-red-500/10 text-red-400' : 'bg-zinc-800 text-zinc-400'
                                    }`}>
                                    {table.status}
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

                                <div className="grid grid-cols-2 w-full gap-2">
                                    <button
                                        onClick={() => handleDownloadQR(table)}
                                        disabled={!table.qr_code}
                                        className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 disabled:opacity-50 flex justify-center"
                                        title="Download"
                                    >
                                        <Download size={18} />
                                    </button>
                                    <button
                                        onClick={() => handlePrintQR(table)}
                                        disabled={!table.qr_code}
                                        className="p-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 disabled:opacity-50 flex justify-center"
                                        title="Print"
                                    >
                                        <Printer size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(table.id)}
                                        className="col-span-2 p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 flex items-center justify-center gap-2 mt-2"
                                    >
                                        <Trash2 size={16} /> Delete Table
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TablesSection;

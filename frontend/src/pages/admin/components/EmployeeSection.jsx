import React, { useState, useEffect } from 'react';
import { UserPlus, Search, MoreVertical, Shield, Mail, Phone, Trash2, Edit2 } from 'lucide-react';
import { useUserAuth } from '../../../hooks/useUserAuth';
import { useConfirm } from '../../../hooks/useConfirm';

const EmployeeSection = ({ restaurantId }) => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', role: 'employee' });
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const { token } = useUserAuth();
    const { confirm } = useConfirm();

    const fetchEmployees = async () => {
        try {
            if (!token) return;
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/employees?restaurant_id=${restaurantId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setEmployees(data.employees);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, [restaurantId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!token) return;
        const url = isEditing
            ? `${import.meta.env.VITE_API_URL}/api/admin/employees/${editId}`
            : `${import.meta.env.VITE_API_URL}/api/admin/employees`;
        const method = isEditing ? 'PUT' : 'POST';
        const body = isEditing ? { ...formData } : { ...formData, restaurant_id: restaurantId };

        try {
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
                setShowModal(false);
                setFormData({ name: '', email: '', phone: '', password: '', role: 'employee' });
                setIsEditing(false);
                setEditId(null);
                fetchEmployees();
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (!await confirm('Remove Employee', 'Are you sure you want to remove this employee?')) return;
        if (!token) return;
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/employees/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) fetchEmployees();
            else alert(data.message);
        } catch (err) { console.error(err); }
    };

    const handleEdit = (emp) => {
        setFormData({ name: emp.name, email: emp.email, phone: emp.phone || '', password: '', role: emp.role }); // Password purposely empty
        setIsEditing(true);
        setEditId(emp.id);
        setShowModal(true);
    }

    const toggleDuty = async (id, status) => {
        if (!token) return;
        try {
            await fetch(`${import.meta.env.VITE_API_URL}/api/admin/employees/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ on_duty: !status })
            });
            fetchEmployees();
        } catch (err) { console.error(err); }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Staff Management</h2>
                <button
                    onClick={() => { setShowModal(true); setIsEditing(false); setFormData({ name: '', email: '', phone: '', password: '', role: 'employee' }); }}
                    className="flex items-center gap-2 bg-brand-lime text-black px-4 py-2 rounded-xl font-bold hover:bg-opacity-90 transition-colors"
                >
                    <UserPlus size={20} />
                    Add Employee
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <p>Loading...</p>
                ) : employees.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                        <p className="text-zinc-400 mb-2">No employees found.</p>
                        <p className="text-zinc-600 text-sm">Add your first employee to start managing staff.</p>
                    </div>
                ) : (
                    employees.map((emp) => (
                        <div key={emp.id} className="glass-panel p-6 rounded-2xl border border-white/5 relative group">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center text-xl font-bold border border-white/10">
                                    {emp.name[0]}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(emp)} className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(emp.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-400 hover:text-red-400 transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold mb-1">{emp.name}</h3>
                            <div className="space-y-2 text-sm text-zinc-400 mb-6">
                                <div className="flex items-center gap-2">
                                    <Mail size={14} /> {emp.email}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone size={14} /> {emp.phone || 'N/A'}
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${emp.on_duty
                                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                    }`}>
                                    {emp.on_duty ? 'On Duty' : 'Off Duty'}
                                </span>
                                <button
                                    onClick={() => toggleDuty(emp.id, emp.on_duty)}
                                    className="text-xs font-medium text-brand-lime hover:underline"
                                >
                                    {emp.on_duty ? 'Clock Out' : 'Clock In'}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel w-full max-w-md p-8 rounded-2xl border border-white/10">
                        <h3 className="text-xl font-bold mb-6">{isEditing ? 'Edit Employee' : 'Add New Employee'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 focus:border-brand-lime outline-none"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 focus:border-brand-lime outline-none"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1">Phone</label>
                                <input
                                    type="tel"
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 focus:border-brand-lime outline-none"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            {!isEditing && (
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-1">Password</label>
                                    <input
                                        type="password"
                                        required={!isEditing}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 focus:border-brand-lime outline-none"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                            )}

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
                                    className="flex-1 bg-brand-lime text-black py-3 rounded-xl font-bold hover:bg-opacity-90 transition-colors"
                                >
                                    {isEditing ? 'Save Changes' : 'Create Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeSection;

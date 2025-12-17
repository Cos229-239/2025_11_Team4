import React, { useState, useEffect, useCallback } from 'react';
import {
    Plus, Edit2, Trash2, X, Save, UserCheck, UserX, Phone, Mail,
    Calendar, DollarSign, Briefcase, AlertCircle
} from 'lucide-react';
import { showToast } from '../../../utils/toast';
import { useUserAuth } from '../../../hooks/useUserAuth';
import { useConfirm } from '../../../hooks/useConfirm';

const POSITIONS = [
    'Server',
    'Host/Hostess',
    'Bartender',
    'Line Cook',
    'Prep Cook',
    'Chef',
    'Sous Chef',
    'Dishwasher',
    'Busser',
    'Manager',
    'Assistant Manager',
    'Cashier'
];

const EmployeeSection = ({ restaurantId }) => {
    const { token } = useUserAuth();
    const { confirm } = useConfirm();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentEmployee, setCurrentEmployee] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        position: '',
        hourly_rate: '',
        hire_date: '',
        emergency_contact: '',
        on_duty: false
    });

    const fetchEmployees = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/employees?restaurant_id=${restaurantId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setEmployees(data.employees || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [restaurantId, token]);

    useEffect(() => {
        if (restaurantId && token) fetchEmployees();
    }, [fetchEmployees, restaurantId, token]);

    const resetForm = () => {
        setCurrentEmployee({
            name: '',
            email: '',
            phone: '',
            password: '',
            position: '',
            hourly_rate: '',
            hire_date: '',
            emergency_contact: '',
            on_duty: false
        });
        setIsEditing(false);
    };

    const openModal = (employee = null) => {
        if (employee) {
            setIsEditing(true);
            setCurrentEmployee({
                ...employee,
                password: '',
                hire_date: employee.hire_date ? new Date(employee.hire_date).toISOString().split('T')[0] : ''
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
                ? `${import.meta.env.VITE_API_URL}/api/admin/employees/${currentEmployee.id}`
                : `${import.meta.env.VITE_API_URL}/api/admin/employees`;

            const method = isEditing ? 'PUT' : 'POST';
            const body = isEditing
                ? {
                    name: currentEmployee.name,
                    phone: currentEmployee.phone,
                    position: currentEmployee.position,
                    hourly_rate: currentEmployee.hourly_rate ? parseFloat(currentEmployee.hourly_rate) : null,
                    hire_date: currentEmployee.hire_date || null,
                    emergency_contact: currentEmployee.emergency_contact || null,
                    on_duty: currentEmployee.on_duty
                }
                : {
                    name: currentEmployee.name,
                    email: currentEmployee.email,
                    phone: currentEmployee.phone,
                    password: currentEmployee.password,
                    role: 'employee',
                    restaurant_id: restaurantId,
                    position: currentEmployee.position,
                    hourly_rate: currentEmployee.hourly_rate ? parseFloat(currentEmployee.hourly_rate) : null,
                    hire_date: currentEmployee.hire_date || null
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
                fetchEmployees();
                setShowModal(false);
                resetForm();
                showToast.success(isEditing ? 'Employee updated' : 'Employee added');
            } else {
                showToast.error(data.message || 'Operation failed');
            }
        } catch (err) {
            console.error(err);
            showToast.error('Operation failed');
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
            if (data.success) {
                setEmployees(employees.filter(e => e.id !== id));
                showToast.success('Employee removed');
            } else {
                showToast.error(data.error || 'Failed to remove employee');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const toggleDutyStatus = async (employee) => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/employees/${employee.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ on_duty: !employee.on_duty })
            });
            const data = await res.json();
            if (data.success) {
                setEmployees(employees.map(e => e.id === employee.id ? { ...e, on_duty: !e.on_duty } : e));
                showToast.success(`${employee.name} is now ${!employee.on_duty ? 'on duty' : 'off duty'}`);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Statistics
    const stats = {
        total: employees.length,
        onDuty: employees.filter(e => e.on_duty).length,
        offDuty: employees.filter(e => !e.on_duty).length
    };

    if (loading) return <div>Loading employees...</div>;

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <h2 className="text-2xl font-bold">Employee Management</h2>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 bg-brand-lime text-black px-4 py-2 rounded-xl font-bold hover:bg-opacity-90 transition-colors"
                >
                    <Plus size={20} />
                    Add Employee
                </button>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-3 gap-4">
                <div className="glass-panel p-4 rounded-xl border border-white/5 text-center">
                    <p className="text-3xl font-bold">{stats.total}</p>
                    <p className="text-sm text-zinc-400">Total Staff</p>
                </div>
                <div className="glass-panel p-4 rounded-xl border border-white/5 text-center">
                    <p className="text-3xl font-bold text-green-400">{stats.onDuty}</p>
                    <p className="text-sm text-zinc-400">On Duty</p>
                </div>
                <div className="glass-panel p-4 rounded-xl border border-white/5 text-center">
                    <p className="text-3xl font-bold text-zinc-400">{stats.offDuty}</p>
                    <p className="text-sm text-zinc-400">Off Duty</p>
                </div>
            </div>

            {/* Employee List */}
            {employees.length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                    <p className="text-zinc-400 mb-2">No employees yet.</p>
                    <p className="text-zinc-600 text-sm">Add your first employee to get started.</p>
                </div>
            ) : (
                <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="text-left p-4 text-sm text-zinc-400 font-medium">Employee</th>
                                <th className="text-left p-4 text-sm text-zinc-400 font-medium">Contact</th>
                                <th className="text-left p-4 text-sm text-zinc-400 font-medium">Position</th>
                                <th className="text-left p-4 text-sm text-zinc-400 font-medium">Hourly Rate</th>
                                <th className="text-center p-4 text-sm text-zinc-400 font-medium">Status</th>
                                <th className="text-right p-4 text-sm text-zinc-400 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {employees.map(employee => (
                                <tr key={employee.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${employee.on_duty ? 'bg-green-500/20 text-green-400' : 'bg-zinc-500/20 text-zinc-400'}`}>
                                                {employee.name?.charAt(0)?.toUpperCase() || '?'}
                                            </div>
                                            <div>
                                                <p className="font-medium">{employee.name}</p>
                                                {employee.hire_date && (
                                                    <p className="text-xs text-zinc-500">
                                                        Since {new Date(employee.hire_date).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="space-y-1">
                                            {employee.email && (
                                                <p className="text-sm text-zinc-400 flex items-center gap-1">
                                                    <Mail size={12} /> {employee.email}
                                                </p>
                                            )}
                                            {employee.phone && (
                                                <p className="text-sm text-zinc-400 flex items-center gap-1">
                                                    <Phone size={12} /> {employee.phone}
                                                </p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="px-2 py-1 bg-white/10 rounded-full text-sm">
                                            {employee.position || 'Not assigned'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        {employee.hourly_rate ? (
                                            <span className="text-brand-lime font-mono">${parseFloat(employee.hourly_rate).toFixed(2)}/hr</span>
                                        ) : (
                                            <span className="text-zinc-500">-</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        <button
                                            onClick={() => toggleDutyStatus(employee)}
                                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-colors ${employee.on_duty
                                                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                                : 'bg-zinc-500/20 text-zinc-400 hover:bg-zinc-500/30'}`}
                                        >
                                            {employee.on_duty ? <UserCheck size={14} /> : <UserX size={14} />}
                                            {employee.on_duty ? 'On Duty' : 'Off Duty'}
                                        </button>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => openModal(employee)}
                                                className="p-2 text-brand-lime hover:bg-brand-lime/10 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(employee.id)}
                                                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                title="Remove"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Employee Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel w-full max-w-lg p-0 rounded-2xl border border-white/10 max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-xl font-bold">{isEditing ? 'Edit Employee' : 'Add New Employee'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                            <div>
                                <label className="block text-sm text-zinc-400 mb-2">Full Name *</label>
                                <input
                                    required
                                    type="text"
                                    value={currentEmployee.name}
                                    onChange={e => setCurrentEmployee({ ...currentEmployee, name: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none"
                                    placeholder="John Doe"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2">Email {!isEditing && '*'}</label>
                                    <div className="relative">
                                        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                        <input
                                            type="email"
                                            required={!isEditing}
                                            disabled={isEditing}
                                            value={currentEmployee.email}
                                            onChange={e => setCurrentEmployee({ ...currentEmployee, email: e.target.value })}
                                            className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:border-brand-lime outline-none disabled:opacity-50"
                                            placeholder="john@example.com"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2">Phone</label>
                                    <div className="relative">
                                        <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                        <input
                                            type="tel"
                                            value={currentEmployee.phone}
                                            onChange={e => setCurrentEmployee({ ...currentEmployee, phone: e.target.value })}
                                            className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:border-brand-lime outline-none"
                                            placeholder="(555) 123-4567"
                                        />
                                    </div>
                                </div>
                            </div>

                            {!isEditing && (
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2">Password *</label>
                                    <input
                                        type="password"
                                        required={!isEditing}
                                        value={currentEmployee.password}
                                        onChange={e => setCurrentEmployee({ ...currentEmployee, password: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-lime outline-none"
                                        placeholder="Create a password"
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2">Position</label>
                                    <div className="relative">
                                        <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                        <select
                                            value={currentEmployee.position}
                                            onChange={e => setCurrentEmployee({ ...currentEmployee, position: e.target.value })}
                                            className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:border-brand-lime outline-none"
                                        >
                                            <option value="">Select position...</option>
                                            {POSITIONS.map(pos => (
                                                <option key={pos} value={pos}>{pos}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2">Hourly Rate</label>
                                    <div className="relative">
                                        <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={currentEmployee.hourly_rate || ''}
                                            onChange={e => setCurrentEmployee({ ...currentEmployee, hourly_rate: e.target.value })}
                                            className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:border-brand-lime outline-none"
                                            placeholder="15.00"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-zinc-400 mb-2">Hire Date</label>
                                <div className="relative">
                                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                    <input
                                        type="date"
                                        value={currentEmployee.hire_date || ''}
                                        onChange={e => setCurrentEmployee({ ...currentEmployee, hire_date: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:border-brand-lime outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-zinc-400 mb-2">Emergency Contact</label>
                                <div className="relative">
                                    <AlertCircle size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                    <input
                                        type="text"
                                        value={currentEmployee.emergency_contact || ''}
                                        onChange={e => setCurrentEmployee({ ...currentEmployee, emergency_contact: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:border-brand-lime outline-none"
                                        placeholder="Name: Jane Doe, Phone: (555) 987-6543"
                                    />
                                </div>
                            </div>

                            {isEditing && (
                                <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                                    <input
                                        type="checkbox"
                                        id="on_duty"
                                        className="w-5 h-5 accent-brand-lime"
                                        checked={currentEmployee.on_duty}
                                        onChange={e => setCurrentEmployee({ ...currentEmployee, on_duty: e.target.checked })}
                                    />
                                    <label htmlFor="on_duty" className="font-medium cursor-pointer flex items-center gap-2">
                                        <UserCheck size={18} /> Currently On Duty
                                    </label>
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
                                className="flex-1 bg-brand-lime text-black py-3 rounded-xl font-bold hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2"
                            >
                                <Save size={18} />
                                {isEditing ? 'Save Changes' : 'Add Employee'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeSection;

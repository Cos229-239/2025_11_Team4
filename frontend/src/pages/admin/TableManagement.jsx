import { useState, useEffect } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import ConfirmationModal from '../../components/ConfirmationModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * TableManagement Component
 * Admin page for managing restaurant tables and QR codes
 */
const TableManagement = () => {
  const [tables, setTables] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  // Modal state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    tableId: null,
    tableNumber: null
  });

  // Create table form state
  const [newTable, setNewTable] = useState({
    table_number: '',
    capacity: 4,
  });

  // Fetch all restaurants
  const fetchRestaurants = async () => {
    try {
      const response = await fetch(`${API_URL}/api/restaurants`);
      const data = await response.json();
      if (data.success && data.data.length > 0) {
        setRestaurants(data.data);
        setSelectedRestaurant(data.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching restaurants:', err);
      setError('Failed to load restaurants');
    }
  };

  // Fetch tables for selected restaurant
  const fetchTables = async () => {
    if (!selectedRestaurant) return;

    try {
      setLoading(true);
      setError(null);

      // Note: ideally the API should support filtering by restaurant_id
      // For now we fetch all and filter client side, or update API
      // Assuming API returns all tables for now
      const response = await fetch(`${API_URL}/api/tables`);
      const data = await response.json();

      if (data.success) {
        // Filter tables by selected restaurant
        const restaurantTables = data.data.filter(
          (table) => table.restaurant_id === selectedRestaurant
        );
        setTables(restaurantTables);
      } else {
        setError('Failed to load tables');
      }
    } catch (err) {
      console.error('Error fetching tables:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchRestaurants();
  }, []);

  // Fetch tables when restaurant changes
  useEffect(() => {
    if (selectedRestaurant) {
      fetchTables();
    }
  }, [selectedRestaurant]);

  // Handle create table
  const handleCreateTable = async (e) => {
    e.preventDefault();

    if (!selectedRestaurant) {
      alert('Please select a restaurant first');
      return;
    }

    // Validate inputs
    if (!newTable.table_number || newTable.table_number < 1) {
      alert('Please enter a valid table number');
      return;
    }

    if (!newTable.capacity || newTable.capacity < 1) {
      alert('Please enter a valid capacity');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/tables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurant_id: selectedRestaurant,
          table_number: parseInt(newTable.table_number),
          capacity: parseInt(newTable.capacity),
          status: 'available',
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Add new table to list
        setTables([...tables, data.data]);

        // Reset form
        setNewTable({
          table_number: '',
          capacity: 4,
        });

        alert('Table created successfully!');
      } else {
        alert(data.error || 'Failed to create table');
      }
    } catch (err) {
      console.error('Error creating table:', err);
      alert('Failed to create table');
    } finally {
      setIsCreating(false);
    }
  };

  // Handle delete table click
  const handleDeleteClick = (tableId, tableNumber) => {
    setDeleteModal({
      isOpen: true,
      tableId,
      tableNumber
    });
  };

  // Confirm delete table
  const handleConfirmDelete = async () => {
    const { tableId, tableNumber } = deleteModal;

    try {
      console.log(`Attempting to delete table ${tableNumber} (ID: ${tableId})`);

      const response = await fetch(`${API_URL}/api/tables/${tableId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        // Remove table from list
        setTables(tables.filter((table) => table.id !== tableId));
        // Close modal
        setDeleteModal({ isOpen: false, tableId: null, tableNumber: null });
        // Optional: Show success toast instead of alert if available, keeping alert for now but it's less intrusive after modal
        // alert(data.message); 
      } else {
        alert(data.error || 'Failed to delete table');
      }
    } catch (err) {
      console.error('Error deleting table:', err);
      alert('Failed to delete table');
    }
  };

  // Handle download QR code
  const handleDownloadQRCode = (table) => {
    if (!table.qr_code) {
      alert('QR code not available for this table');
      return;
    }

    try {
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = table.qr_code;
      link.download = `table-${table.table_number}-qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error downloading QR code:', err);
      alert('Failed to download QR code');
    }
  };

  // Handle print QR code
  const handlePrintQRCode = (table) => {
    if (!table.qr_code) {
      alert('QR code not available for this table');
      return;
    }

    try {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Table ${table.table_number} - QR Code</title>
            <style>
              body {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                padding: 20px;
                font-family: Arial, sans-serif;
              }
              .container {
                text-align: center;
                max-width: 600px;
              }
              h1 {
                font-size: 48px;
                margin: 0 0 20px 0;
                color: #FF6B35;
              }
              p {
                font-size: 24px;
                margin: 10px 0;
                color: #333;
              }
              img {
                max-width: 400px;
                height: auto;
                margin: 20px 0;
                border: 2px solid #ddd;
                border-radius: 8px;
              }
              @media print {
                body {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Table ${table.table_number}</h1>
              <p>Scan to Order</p>
              <img src="${table.qr_code}" alt="QR Code for Table ${table.table_number}" />
              <p>OrderEasy</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    } catch (err) {
      console.error('Error printing QR code:', err);
      alert('Failed to print QR code');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg text-text-primary flex items-center justify-center">
        <LoadingSpinner label="Loading tables..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg text-text-primary">
      {/* Header */}
      <header className="bg-brand-orange text-white shadow-md">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center gap-4 mb-2">
            <a
              href="/admin"
              className="p-2 rounded-full hover:bg-white/20 transition text-white"
              title="Back to Dashboard"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </a>
            <h1 className="text-3xl font-bold">Table Management</h1>
          </div>
          <p className="text-sm opacity-90 ml-12">
            Manage restaurant tables and QR codes
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        {/* Error Message */}
        {error && (
          <ErrorMessage message={error} onRetry={fetchTables} className="mb-6" />
        )}

        {/* Restaurant Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Select Restaurant
          </label>
          <select
            value={selectedRestaurant || ''}
            onChange={(e) => setSelectedRestaurant(parseInt(e.target.value))}
            className="w-full md:w-1/3 px-4 py-2 bg-dark-card border border-dark-surface rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent text-text-primary"
          >
            {restaurants.map((restaurant) => (
              <option key={restaurant.id} value={restaurant.id}>
                {restaurant.name}
              </option>
            ))}
          </select>
        </div>

        {/* Create Table Form */}
        <div className="bg-dark-card rounded-2xl shadow-xl border border-dark-surface p-6 mb-6">
          <h2 className="text-xl font-bold text-text-primary mb-4">
            Create New Table
          </h2>
          <form onSubmit={handleCreateTable} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Table Number <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={newTable.table_number}
                onChange={(e) =>
                  setNewTable({ ...newTable, table_number: e.target.value })
                }
                placeholder="Enter table number"
                className="w-full px-4 py-2 border border-dark-surface rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Capacity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={newTable.capacity}
                onChange={(e) =>
                  setNewTable({ ...newTable, capacity: e.target.value })
                }
                placeholder="Number of seats"
                className="w-full px-4 py-2 border border-dark-surface rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isCreating}
              className={`px-6 py-2 rounded-lg font-semibold text-white transition ${isCreating
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-brand-orange hover:opacity-90 pulse-once-orange'
                }`}
            >
              {isCreating ? 'Creating...' : 'Create Table'}
            </button>
          </form>
        </div>

        {/* Tables Grid */}
        {tables.length === 0 ? (
          <div className="bg-dark-card rounded-2xl shadow-xl border border-dark-surface p-12 text-center">
            <div className="text-6xl mb-4">🍽️</div>
            <h2 className="text-2xl font-bold text-text-secondary mb-2">
              No Tables Yet
            </h2>
            <p className="text-text-secondary mb-6">
              Create your first table to get started with QR code ordering
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {tables.map((table) => (
              <div
                key={table.id}
                className="bg-dark-card rounded-2xl shadow-xl border border-dark-surface overflow-hidden hover:shadow-xl transition-shadow"
              >
                {/* Card Header */}
                <div className="bg-gradient-to-r from-brand-orange to-brand-orange/80 text-white p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-2xl font-bold">
                        Table {table.table_number}
                      </h3>
                      <p className="text-sm opacity-90">
                        Capacity: {table.capacity} seats
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${table.status === 'available'
                        ? 'bg-green-500'
                        : table.status === 'occupied'
                          ? 'bg-red-500'
                          : 'bg-dark-surface0'
                        }`}
                    >
                      {table.status}
                    </span>
                  </div>
                </div>

                {/* QR Code Display */}
                <div className="p-6">
                  {table.qr_code ? (
                    <div className="flex flex-col items-center">
                      <img
                        src={table.qr_code}
                        alt={`QR Code for Table ${table.table_number}`}
                        className="w-48 h-48 object-contain border-2 border-dark-surface/80 rounded-lg mb-4"
                      />
                      <p className="text-xs text-text-secondary text-center mb-4">
                        Scan to order from Table {table.table_number}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-48 bg-dark-surface rounded-lg mb-4">
                      <p className="text-text-secondary text-sm">No QR Code</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <button
                      onClick={() => handleDownloadQRCode(table)}
                      disabled={!table.qr_code}
                      className={`w-full py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${table.qr_code
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-600 text-text-secondary cursor-not-allowed'
                        }`}
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      Download PNG
                    </button>

                    <button
                      onClick={() => handlePrintQRCode(table)}
                      disabled={!table.qr_code}
                      className={`w-full py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${table.qr_code
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-600 text-text-secondary cursor-not-allowed'
                        }`}
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                        />
                      </svg>
                      Print QR Code
                    </button>

                    <button
                      onClick={() =>
                        handleDeleteClick(table.id, table.table_number)
                      }
                      className="w-full py-2 rounded-lg font-semibold text-red-600 border-2 border-red-600 hover:bg-red-600 hover:text-white transition flex items-center justify-center gap-2"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      Delete Table
                    </button>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="bg-dark-surface px-4 py-3 border-t border-dark-surface/80">
                  <p className="text-xs text-text-secondary">
                    Created: {new Date(table.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        {tables.length > 0 && (
          <div className="mt-6 bg-dark-card rounded-2xl shadow-xl border border-dark-surface p-6">
            <h3 className="text-lg font-bold text-text-primary mb-4">Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-brand-orange">
                  {tables.length}
                </p>
                <p className="text-sm text-text-secondary">Total Tables</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">
                  {tables.filter((t) => t.status === 'available').length}
                </p>
                <p className="text-sm text-text-secondary">Available</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">
                  {tables.filter((t) => t.status === 'occupied').length}
                </p>
                <p className="text-sm text-text-secondary">Occupied</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">
                  {tables.reduce((sum, t) => sum + t.capacity, 0)}
                </p>
                <p className="text-sm text-text-secondary">Total Capacity</p>
              </div>
            </div>
          </div>
        )}
      </div>



      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={handleConfirmDelete}
        title="Delete Table"
        message={`Are you sure you want to delete Table ${deleteModal.tableNumber}? This action cannot be undone.`}
        confirmText="Delete"
        isDangerous={true}
      />
    </div >
  );
};

export default TableManagement;

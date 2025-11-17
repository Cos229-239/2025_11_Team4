import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * TableSelectPage Component
 * Allows customer to select their table if not in QR code
 * URL: /table-select (requires restaurantId in state)
 */
const TableSelectPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { restaurantId } = location.state || {};

  const [tableNumber, setTableNumber] = useState('');
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [restaurantName, setRestaurantName] = useState('');

  // Redirect if no restaurant ID
  useEffect(() => {
    if (!restaurantId) {
      navigate('/qr-check');
    }
  }, [restaurantId, navigate]);

  // Fetch restaurant and tables data
  useEffect(() => {
    if (!restaurantId) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch restaurant details
        const restaurantRes = await fetch(`${API_URL}/api/restaurants/${restaurantId}`);
        const restaurantData = await restaurantRes.json();
        if (restaurantData.success) {
          setRestaurantName(restaurantData.data.name);
        }

        // Fetch available tables
        const tablesRes = await fetch(`${API_URL}/api/restaurants/${restaurantId}/tables`);
        const tablesData = await tablesRes.json();
        if (tablesData.success) {
          setTables(tablesData.data || []);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load tables');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [restaurantId]);

  /**
   * Handle table selection and navigate to menu
   */
  const handleContinue = () => {
    if (!tableNumber || tableNumber.trim() === '') {
      setError('Please select a table number');
      return;
    }

    navigate(`/restaurant/${restaurantId}/menu`, {
      state: {
        orderType: 'dine-in',
        tableNumber: tableNumber,
        restaurantId: restaurantId
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-text-secondary">Loading tables...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col px-4 py-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 right-10 w-96 h-96 bg-brand-lime/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-1/4 left-10 w-96 h-96 bg-brand-orange/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-8">
        <button
          onClick={() => navigate(-1)}
          className="text-text-secondary hover:text-brand-lime transition-colors flex items-center gap-2"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          <span>Back</span>
        </button>
        <div className="w-20"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-2xl w-full mx-auto flex-grow flex flex-col justify-center">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-2">
            Select Your Table
          </h1>
          <p className="text-text-secondary text-lg">
            {restaurantName}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-2xl p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Table Selection */}
        <div className="bg-dark-card rounded-3xl p-6 sm:p-8 border border-dark-surface mb-6">
          <h2 className="text-xl font-bold text-text-primary mb-4 text-center">
            Choose Your Table Number
          </h2>

          {/* Manual Input */}
          <div className="mb-6">
            <label htmlFor="tableNumber" className="block text-text-secondary text-sm mb-2">
              Table Number
            </label>
            <input
              id="tableNumber"
              type="number"
              min="1"
              placeholder="e.g., 5"
              value={tableNumber}
              onChange={(e) => {
                setTableNumber(e.target.value);
                setError('');
              }}
              className="
                w-full
                bg-dark-surface
                text-text-primary text-center text-2xl
                border-2 border-dark-surface
                focus:border-brand-lime
                rounded-xl
                px-6 py-4
                outline-none
                transition-colors
              "
              autoFocus
            />
          </div>

          {/* Quick Select Buttons */}
          {tables.length > 0 && (
            <div>
              <p className="text-text-secondary text-sm text-center mb-3">
                Quick Select:
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {tables.slice(0, 12).map((table) => (
                  <button
                    key={table.id}
                    onClick={() => {
                      setTableNumber(table.table_number.toString());
                      setError('');
                    }}
                    className={`
                      px-4 py-3 rounded-lg
                      font-semibold text-sm
                      transition-all
                      transform hover:scale-105
                      ${tableNumber === table.table_number.toString()
                        ? 'bg-brand-lime text-dark-bg'
                        : 'bg-dark-surface text-text-primary hover:bg-brand-lime hover:text-dark-bg'
                      }
                    `}
                  >
                    Table {table.table_number}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={!tableNumber}
          className="
            w-full
            bg-brand-lime text-dark-bg
            px-8 py-4 rounded-full
            text-lg font-bold uppercase tracking-wide
            hover:bg-brand-lime/90
            disabled:opacity-50 disabled:cursor-not-allowed
            transform hover:scale-105 active:scale-95
            transition-all duration-200
            shadow-xl shadow-brand-lime/30 hover:shadow-brand-lime/50
            flex items-center justify-center gap-2
          "
        >
          <CheckCircleIcon className="w-5 h-5" />
          Continue to Menu
        </button>
      </div>
    </div>
  );
};

export default TableSelectPage;

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket, useSocketEvent, useSocketEmit } from '../hooks/useSocket';
import { useUserAuth } from '../hooks/useUserAuth';
import OrderCard from '../components/OrderCard';
import Logo from '../components/Logo';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * KitchenDashboard Component
 * Real-time order management for kitchen staff
 * Updated to match Team Vision dark theme design
 */
const KitchenDashboard = () => {
  const navigate = useNavigate();
  const { logout } = useUserAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [openSidebarPanel, setOpenSidebarPanel] = useState(null);

  const { socket, isConnected } = useSocket();
  const emit = useSocketEmit();

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Fetch initial active orders on mount
  const fetchActiveOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/orders/active`);
      const data = await response.json();

      if (data.success) {
        setOrders(data.data);
      } else {
        setError('Failed to load orders');
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, []);

  // Join kitchen room when socket connects
  useEffect(() => {
    if (socket && isConnected) {
      console.log('🔌 Joining kitchen room...');
      emit('join-kitchen');

      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [socket, isConnected, emit]);

  // Fetch orders on mount
  useEffect(() => {
    fetchActiveOrders();
  }, [fetchActiveOrders]);

  // Handle new order event - adds order to state
  const handleNewOrder = useCallback((newOrder) => {
    console.log('📥 New order received:', newOrder);

    setOrders((prevOrders) => {
      // Check if order already exists (avoid duplicates)
      const exists = prevOrders.some((order) => order.id === newOrder.id);
      if (exists) {
        return prevOrders;
      }

      // Add new order to the beginning of the list
      return [newOrder, ...prevOrders];
    });

    // Show browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🔔 New Order!', {
        body: `Table ${newOrder.table_id} - ${newOrder.items.length} item(s) - $${parseFloat(newOrder.total_amount).toFixed(2)}`,
        icon: '/restaurant-icon.png',
        tag: `order-${newOrder.id}`,
      });
    }

    // Play sound notification (optional)
    try {
      const audio = new Audio('/notification.mp3');
      audio.play().catch(() => console.log('Audio play failed'));
    } catch {
      console.log('Audio not available');
    }
  }, []);

  // Handle order update event - updates order status
  const handleOrderUpdated = useCallback((updatedOrder) => {
    console.log('🔄 Order updated:', updatedOrder);

    setOrders((prevOrders) => {
      // If order is completed or cancelled, remove it from active orders
      if (updatedOrder.status === 'completed' || updatedOrder.status === 'cancelled') {
        return prevOrders.filter((order) => order.id !== updatedOrder.id);
      }

      // Otherwise, update the order in the list
      const orderIndex = prevOrders.findIndex(
        (order) => order.id === updatedOrder.id
      );

      if (orderIndex !== -1) {
        const newOrders = [...prevOrders];
        newOrders[orderIndex] = updatedOrder;
        return newOrders;
      }

      // If order doesn't exist but is active, add it
      return [updatedOrder, ...prevOrders];
    });
  }, []);

  // Listen for Socket.IO events
  useSocketEvent('new-order', handleNewOrder);
  useSocketEvent('order-updated', handleOrderUpdated);

  // Handle status update from OrderCard (optimistic update)
  const handleStatusUpdate = (updatedOrder) => {
    setOrders((prevOrders) => {
      // If order is completed or cancelled, remove it
      if (updatedOrder.status === 'completed' || updatedOrder.status === 'cancelled') {
        return prevOrders.filter((order) => order.id !== updatedOrder.id);
      }

      // Update the order
      return prevOrders.map((order) =>
        order.id === updatedOrder.id ? updatedOrder : order
      );
    });
  };

  // Filter orders based on status
  const filteredOrders = orders.filter((order) => {
    if (filter === 'all') return true;
    return order.status === filter;
  });
  // If the preparing tab is selected, sort by FIFO
  if (filter === 'preparing') {
    filteredOrders.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }

  // Count orders by status
  const orderCounts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    preparing: orders.filter((o) => o.status === 'preparing').length,
    ready: orders.filter((o) => o.status === 'ready').length,
  };

  // Live analytics calculations
  const totalOrders = orders.length;
  const totalPending = orders.filter(o => o.status === 'pending').length;
  const totalPreparing = orders.filter(o => o.status === 'preparing').length;
  const totalReady = orders.filter(o => o.status === 'ready').length;
  const totalCompleted = orders.filter(o => o.status === 'completed').length;

  // Calculate average preparing time for orders with both preparing_at + completed_at/ready_at
  const avgPreparingTime = (() => {
    const times = orders
      .filter(o => o.preparing_at && (o.completed_at || o.ready_at))
      .map(o => {
        const end = new Date(o.completed_at || o.ready_at);
        const start = new Date(o.preparing_at);
        return (end - start) / 1000; // get duration in seconds
      });
    if (times.length === 0) return '-';
    const avgSeconds = times.reduce((a, b) => a + b, 0) / times.length;
    const m = Math.floor(avgSeconds / 60);
    const s = Math.floor(avgSeconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  })();

  // LIVE OCCUPANCY & RESERVATION ANALYTICS
  const totalOccupancy = orders
    .filter(order => order.order_type === 'dine-in' && ['pending', 'preparing', 'ready'].includes(order.status))
    .reduce((sum, order) => sum + (order.number_of_guests || 0), 0);

  const totalToGo = orders
    .filter(order => order.order_type === 'to-go' && ['pending', 'preparing', 'ready'].includes(order.status))
    .length;

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  const totalReservationsToday = orders
    .filter(order =>
      order.order_type === 'reservation' &&
      order.reservation_date &&
      order.reservation_date.startsWith(todayStr)
    )
    .length;
  // Replace this with our real fetch later!
  const [employees] = useState([]);
  // Collapsible states for panels


  // This is our example data, to be replaced with real API data in further production stages
  // Category lists
  // In production we will fetch() from our API, similar to how we did the orders.
  const managerCount = employees.filter(e => e.role === "manager").length;
  const onDutyManagers = employees.filter(e => e.role === "manager" && e.on_duty).length;

  const bartenderCount = employees.filter(e => e.role === "bartender").length;
  const onDutyBartenders = employees.filter(e => e.role === "bartender" && e.on_duty).length;

  const barBackCount = employees.filter(e => e.role === "bar_back").length;
  const onDutyBarBacks = employees.filter(e => e.role === "bar_back" && e.on_duty).length;

  const busboyCount = employees.filter(e => e.role === "busboy").length;
  const onDutyBusboys = employees.filter(e => e.role === "busboy" && e.on_duty).length;

  const waiterCount = employees.filter(e => e.role === "waiter").length;
  const onDutyWaiters = employees.filter(e => e.role === "waiter" && e.on_duty).length;

  const hostessCount = employees.filter(e => e.role === "hostess").length;
  const onDutyHostess = employees.filter(e => e.role === "hostess" && e.on_duty).length;

  // Total
  const totalEmployees = employees.length;
  const totalOnDuty = employees.filter(e => e.on_duty).length;

  // Example inventory data
  const [inventory] = useState([
    { category: 'Produce', item: 'Tomatoes', quantity: 18, unit: 'lbs' },
    { category: 'Produce', item: 'Lettuce', quantity: 6, unit: 'heads' },
    { category: 'Dairy', item: 'Milk', quantity: 8, unit: 'gallons' },
    { category: 'Dairy', item: 'Cheese', quantity: 3, unit: 'blocks' },
    { category: 'To-Go', item: 'To-go Boxes', quantity: 120, unit: 'pcs' },
    { category: 'To-Go', item: 'Straws', quantity: 350, unit: 'pcs' },
    // Add more items/categories as needed!
  ]);
  const [sidebarOpen, setSidebarOpen] = useState(true);




  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-brand-orange/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-text-secondary text-lg font-medium">Loading kitchen orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#000000]">
      {/* BACKGROUND GRADIENT */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at center,
              #E35504ff 0%,
              #E35504aa 15%,
              #000000 35%,
              #5F2F14aa 55%,
              #B5FF00ff 80%,
              #000000 100%
            )
          `,
          filter: "blur(40px)",
          backgroundSize: "180% 180%",
          opacity: 0.55,
        }}
      ></div>

      {/* Header */}
      <header className="glass-panel sticky top-0 z-20 border-b border-white/10 shadow-2xl backdrop-blur-xl">
        <div className="container mx-auto px-6 py-3">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-4">
              <Logo size="sm" />
              <div>
                <h1 className="text-2xl font-bold text-white drop-shadow-md">Kitchen Dashboard</h1>
                <p className="text-sm text-gray-300 flex items-center gap-2 font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Real-time Order Management
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Connection Status */}
              <div className={`flex items-center gap-2 backdrop-blur-md rounded-xl px-4 py-2 border ${isConnected
                ? 'bg-green-500/20 border-green-500/50 text-green-400'
                : 'bg-red-500/20 border-red-500/50 text-red-400'
                }`}>
                <div
                  className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'
                    }`}
                ></div>
                <span className="text-sm font-bold drop-shadow-sm">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              {/* Refresh Button */}
              <button
                onClick={fetchActiveOrders}
                className="bg-brand-orange text-white px-4 py-2 rounded-xl font-bold hover:bg-brand-orange/90 transition-all shadow-lg hover:shadow-brand-orange/30 flex items-center gap-2 border border-brand-orange/50"
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
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </button>

              {/* Back to Home Button */}
              <button
                onClick={() => navigate('/')}
                className="bg-white/10 text-white px-4 py-2 rounded-xl font-bold hover:bg-white/20 transition-all shadow-lg hover:shadow-white/10 flex items-center gap-2 border border-white/10 backdrop-blur-sm"
                title="Back to Home"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="hidden sm:inline">Home</span>
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="bg-red-500/20 text-red-400 px-4 py-2 rounded-xl font-bold hover:bg-red-500/30 transition-all shadow-lg hover:shadow-red-500/20 flex items-center gap-2 border border-red-500/30 backdrop-blur-sm"
                title="Logout"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-3 overflow-x-auto pb-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-6 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all border ${filter === 'all'
                ? 'bg-brand-orange text-white shadow-lg scale-105 border-brand-orange'
                : 'bg-white/5 text-gray-300 hover:bg-white/10 border-white/10 hover:border-white/20 backdrop-blur-sm'
                }`}
            >
              All Orders <span className={`ml-2 inline-flex items-center justify-center text-xs font-bold px-2 py-0.5 rounded-full border ${filter === 'all' ? 'bg-white/20 text-white border-white/20' : 'bg-black/30 text-gray-400 border-white/5'}`}>{orderCounts.all}</span>
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-6 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all border ${filter === 'pending'
                ? 'bg-brand-orange text-white shadow-lg scale-105 border-brand-orange'
                : 'bg-white/5 text-gray-300 hover:bg-white/10 border-white/10 hover:border-white/20 backdrop-blur-sm'
                }`}
            >
              🆕 New ({orderCounts.pending})
            </button>
            <button
              onClick={() => setFilter('preparing')}
              className={`px-6 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all border ${filter === 'preparing'
                ? 'bg-brand-orange text-white shadow-lg scale-105 border-brand-orange'
                : 'bg-white/5 text-gray-300 hover:bg-white/10 border-white/10 hover:border-white/20 backdrop-blur-sm'
                }`}
            >
              👨‍🍳 Preparing ({orderCounts.preparing})
            </button>
            <button
              onClick={() => setFilter('ready')}
              className={`px-6 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all border ${filter === 'ready'
                ? 'bg-brand-orange text-white shadow-lg scale-105 border-brand-orange'
                : 'bg-white/5 text-gray-300 hover:bg-white/10 border-white/10 hover:border-white/20 backdrop-blur-sm'
                }`}
            >
              ✅ Ready ({orderCounts.ready})
            </button>
          </div>
        </div>
      </header>

      {/* SIDEBAR WITH TOGGLE */}
      <div
        className={`fixed right-6 bottom-24 z-40 transition-all duration-300
        ${sidebarOpen ? 'w-80 opacity-100' : 'w-12 opacity-80'}
      `}
      >
        {/* Toggle button */}
        <button
          onClick={() => setSidebarOpen(open => !open)}
          className="mb-3 w-full flex items-center justify-center bg-black/60 rounded-2xl text-white py-2 shadow hover:bg-black/80"
        >
          {sidebarOpen ? '◀ Close' : '▶ Open'}
        </button>

        {/* Sidebar content only when open */}
        {sidebarOpen && (
          <div className="flex flex-col gap-3">
            {/* Employees */}
            <div>
              <button
                className="w-full px-5 py-3 bg-dark-card rounded-2xl font-bold text-left text-white shadow hover:bg-brand-orange/90 transition"
                onClick={() =>
                  setOpenSidebarPanel(
                    openSidebarPanel === 'employees' ? null : 'employees'
                  )
                }
              >
                🧑‍🍳 Employees
              </button>
              {openSidebarPanel === 'employees' && (
                <div className="bg-dark-card/90 border-l-4 border-orange-400 rounded-xl mt-2 px-5 py-4 shadow-xl">
                  <ul className="text-sm space-y-2">
                    <li>
                      <span className="font-bold">Total Employees:</span>{' '}
                      {totalEmployees}{' '}
                      (<span className="text-green-500">{totalOnDuty} on duty</span>)
                    </li>
                    <hr className="my-2 border-dark-surface" />
                    <li>
                      <span className="font-bold text-orange-400">Managers:</span>{' '}
                      {managerCount}{' '}
                      (<span className="text-green-500">{onDutyManagers} on duty</span>)
                    </li>
                    <li>
                      <span className="font-bold text-brand-orange">Bartenders:</span>{' '}
                      {bartenderCount}{' '}
                      (<span className="text-green-500">{onDutyBartenders} on duty</span>)
                    </li>
                    <li>
                      <span className="font-bold text-yellow-400">Bar Backs:</span>{' '}
                      {barBackCount}{' '}
                      (<span className="text-green-500">{onDutyBarBacks} on duty</span>)
                    </li>
                    <li>
                      <span className="font-bold text-blue-400">Busboys:</span>{' '}
                      {busboyCount}{' '}
                      (<span className="text-green-500">{onDutyBusboys} on duty</span>)
                    </li>
                    <li>
                      <span className="font-bold text-fuchsia-400">Waiters:</span>{' '}
                      {waiterCount}{' '}
                      (<span className="text-green-500">{onDutyWaiters} on duty</span>)
                    </li>
                    <li>
                      <span className="font-bold text-pink-400">Hostess:</span>{' '}
                      {hostessCount}{' '}
                      (<span className="text-green-500">{onDutyHostess} on duty</span>)
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* Analytics */}
            <div>
              <button
                className="w-full px-5 py-3 bg-dark-card rounded-2xl font-bold text-left text-white shadow hover:bg-yellow-500/90 transition"
                onClick={() =>
                  setOpenSidebarPanel(
                    openSidebarPanel === 'analytics' ? null : 'analytics'
                  )
                }
              >
                📊 Analytics
              </button>
              {openSidebarPanel === 'analytics' && (
                <div className="bg-dark-card/90 border-l-4 border-yellow-400 rounded-xl mt-2 px-5 py-4 shadow-xl">
                  <ul className="text-sm space-y-2">
                    <li>
                      <span className="font-semibold text-brand-orange">Total Orders:</span>{' '}
                      {totalOrders}
                    </li>
                    <li>
                      <span className="font-semibold text-brand-orange">Pending:</span>{' '}
                      {totalPending}
                    </li>
                    <li>
                      <span className="font-semibold text-yellow-500">Preparing:</span>{' '}
                      {totalPreparing}
                    </li>
                    <li>
                      <span className="font-semibold text-green-500">Ready:</span>{' '}
                      {totalReady}
                    </li>
                    <li>
                      <span className="font-semibold text-green-400">Completed:</span>{' '}
                      {totalCompleted}
                    </li>
                    <li className="pt-2 border-t border-dark-surface">
                      <span className="font-semibold text-brand-lime">Avg Prep Time:</span>{' '}
                      {avgPreparingTime === '-' ? 'N/A' : avgPreparingTime + ' min'}
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* Occupancy & Reservations */}
            <div>
              <button
                className="w-full px-5 py-3 bg-dark-card rounded-2xl font-bold text-left text-white shadow hover:bg-lime-500/90 transition"
                onClick={() =>
                  setOpenSidebarPanel(
                    openSidebarPanel === 'occupancy' ? null : 'occupancy'
                  )
                }
              >
                🪑 Occupancy & Reservations
              </button>
              {openSidebarPanel === 'occupancy' && (
                <div className="bg-dark-card/90 border-l-4 border-lime-400 rounded-xl mt-2 px-5 py-4 shadow-xl">
                  <ul className="text-sm space-y-2">
                    <li>
                      <span className="font-semibold text-brand-lime">
                        Current Occupancy:
                      </span>{' '}
                      {totalOccupancy}
                    </li>
                    <li>
                      <span className="font-semibold text-brand-orange">
                        To-Go Orders:
                      </span>{' '}
                      {totalToGo}
                    </li>
                    <li>
                      <span className="font-semibold text-text-secondary">
                        Today's Reservations:
                      </span>{' '}
                      {totalReservationsToday}
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* Inventory */}
            <div>
              <button
                className="w-full px-5 py-3 bg-dark-card rounded-2xl font-bold text-left text-white shadow hover:bg-cyan-500/90 transition"
                onClick={() =>
                  setOpenSidebarPanel(
                    openSidebarPanel === 'inventory' ? null : 'inventory'
                  )
                }
              >
                🗃️ Inventory
              </button>
              {openSidebarPanel === 'inventory' && (
                <div className="bg-dark-card/90 border-l-4 border-cyan-400 rounded-xl mt-2 px-5 py-4 shadow-xl">
                  <ul className="text-sm space-y-2">
                    <li>
                      <span className="font-semibold text-cyan-400">Categories:</span>{' '}
                      {Array.from(new Set(inventory.map(i => i.category))).join(', ')}
                    </li>
                    <hr className="my-2 border-t-2 border-orange-400" />
                    {['Produce', 'Dairy', 'To-Go'].map(cat => (
                      <div key={cat}>
                        <div className="font-bold text-brand-orange mt-2">{cat}</div>
                        <ul>
                          {inventory
                            .filter(i => i.category === cat)
                            .map(item => (
                              <li key={item.item} className="ml-2 flex justify-between">
                                <span>{item.item}</span>
                                <span className="font-mono">
                                  {item.quantity} {item.unit}
                                </span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {/* == END SIDEBAR == */}

      {/* Main Content */}
      <div className="container mx-auto px-6 pt-6 pb-32 relative z-10">
        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 backdrop-blur-md shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-400 font-semibold drop-shadow-sm">{error}</p>
              </div>
              <button
                onClick={fetchActiveOrders}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg font-semibold transition-all border border-red-500/30"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Empty State / Orders Grid */}
        {filteredOrders.length === 0 ? (
          <div className="glass-panel rounded-3xl shadow-2xl p-12 text-center border border-white/10">
            <div className="text-8xl mb-6 drop-shadow-lg">
              {filter === 'all' ? '🍽️' : filter === 'pending' ? '🆕' : filter === 'preparing' ? '👨‍🍳' : '✅'}
            </div>
            <h2 className="text-3xl font-bold text-white mb-3 drop-shadow-md">
              {filter === 'all'
                ? 'No Active Orders'
                : `No ${filter.charAt(0).toUpperCase() + filter.slice(1)} Orders`}
            </h2>
            <p className="text-gray-300 mb-8 text-lg font-medium">
              {filter === 'all'
                ? 'New orders will appear here automatically'
                : `Orders in "${filter}" status will appear here`}
            </p>
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="bg-brand-orange text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-orange/90 transition-all shadow-lg hover:shadow-brand-orange/30 pulse-once-orange border border-brand-orange/50"
              >
                View All Orders
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusUpdate={handleStatusUpdate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Stats Footer */}
      {orders.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 glass-panel border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] z-10 backdrop-blur-xl">
          <div className="container mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex gap-8">
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-brand-orange drop-shadow-sm">{orderCounts.pending}</span>
                  <span className="text-gray-300 text-sm font-medium">New</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-yellow-400 drop-shadow-sm">{orderCounts.preparing}</span>
                  <span className="text-gray-300 text-sm font-medium">Preparing</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-green-400 drop-shadow-sm">{orderCounts.ready}</span>
                  <span className="text-gray-300 text-sm font-medium">Ready</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-300 font-medium">Total Active:</span>
                <span className="text-3xl font-bold text-brand-lime drop-shadow-sm">
                  {orderCounts.all}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KitchenDashboard;




// want to make sure my changes are saved

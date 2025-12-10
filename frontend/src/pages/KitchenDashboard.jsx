import { useState, useEffect, useCallback } from 'react';
import { fetchEmployees } from '../api/users';
import { useNavigate } from 'react-router-dom';
import { useSocket, useSocketEvent, useSocketEmit } from '../hooks/useSocket';
import { useUserAuth } from '../hooks/useUserAuth';
import OrderCard from '../components/OrderCard';
import Logo from '../components/Logo';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import yukonImage from '../assets/yukon.png';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { fetchActiveOrders } from '../api/orders';


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
  const [activePanel, setActivePanel] = useState(null); // 'orders' | 'employees' | 'analytics' | 'occupancy' | 'inventory' | null


  const { socket, isConnected } = useSocket();
  const emit = useSocketEmit();


  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };


  // Fetch initial active orders on mount
  const fetchActiveOrdersFromApi = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchActiveOrders(); // <- from ../api/orders

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
  };


  // Join kitchen room when socket connects
  useEffect(() => {
    if (socket && isConnected) {
      emit('join-kitchen');


      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [socket, isConnected, emit]);


  // Fetch orders on mount
  useEffect(() => {
    fetchActiveOrdersFromApi();
  }, []);


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

  const activeDineIn = orders.filter(order =>
    order.order_type === 'dine-in' &&
    ['pending', 'preparing', 'ready'].includes(order.status)
  );

  const activeToGo = orders.filter(order =>
    order.order_type === 'to-go' &&
    ['pending', 'preparing', 'ready'].includes(order.status)
  );

  const LEGAL_CAPACITY = 100; // legal occupancy limit for the restaurant
  const occupancyPercent = LEGAL_CAPACITY ? Math.min((totalOccupancy / LEGAL_CAPACITY) * 100, 100) : 0;

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

  const todaysReservations = orders
    .filter(order =>
      order.order_type === 'reservation' &&
      order.reservation_date &&
      order.reservation_date.startsWith(todayStr),
    );


  // LIVE EMPLOYEE MANAGEMENT DATA

  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    const loadEmployees = async () => {
      const result = await fetchEmployees();
      if (result.success) {
        setEmployees(result.data);
      }
    };
    loadEmployees();
  }, []);

  const [selectedRole, setSelectedRole] = useState(null);

  const handleRoleClick = (role) => {
    // For now just set which role is active; later we can show a detail view
    setSelectedRole(role);
  };
  const handleEmployeeOnDutyChange = (id, checked) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === id ? { ...emp, on_duty: checked } : emp
      )
    );
    // TODO: Call API to update status
  };

  // This is our example data, to be replaced with real API data in further production stages
  // Category lists
  // In production we will fetch() from our API, similar to how we did the orders.


  const onDutyManagers = employees.filter(e => e.role === "manager" && e.on_duty).length;
  const onDutyBusboys = employees.filter(e => e.role === "busboy" && e.on_duty).length;
  const onDutyWaiters = employees.filter(e => e.role === "waiter" && e.on_duty).length;
  const onDutyHostess = employees.filter(e => e.role === "hostess" && e.on_duty).length;
  const onDutyBartenders = employees.filter(e => e.role === "bartender" && e.on_duty).length;
  const onDutyBarBacks = employees.filter(e => e.role === "bar_back" && e.on_duty).length;

  // Total
  const totalEmployees = employees.length;
  const totalOnDuty = employees.filter(e => e.on_duty).length;

  // Example inventory data
  const [inventory, setInventory] = useState([
    //Grains
    { category: 'Grains', item: 'All-Purpose Flour', unit: 'lbs', quantity: 50 },
    { category: 'Grains', item: 'Rice (long grain)', unit: 'lbs', quantity: 40 },
    { category: 'Grains', item: 'Pasta (spaghetti)', unit: 'lbs', quantity: 30 },
    { category: 'Grains', item: 'Bread Loaves', unit: 'loaves', quantity: 20 },
    { category: 'Grains', item: 'Cornmeal', unit: 'lbs', quantity: 15 },
    { category: 'Grains', item: 'Oats', unit: 'lbs', quantity: 25 },
    // Spices
    { category: 'Spices', item: 'Sea Salt', unit: 'lbs', quantity: 5 },
    { category: 'Spices', item: 'Black Peppercorns', unit: 'oz', quantity: 24 },
    { category: 'Spices', item: 'Paprika', unit: 'oz', quantity: 16 },
    { category: 'Spices', item: 'Ground Cumin', unit: 'oz', quantity: 12 },
    { category: 'Spices', item: 'Dried Oregano', unit: 'oz', quantity: 10 },
    { category: 'Spices', item: 'Garlic Powder', unit: 'oz', quantity: 10 },
    { category: 'Spices', item: 'Onion Powder', unit: 'oz', quantity: 10 },
    { category: 'Spices', item: 'Chili Flakes', unit: 'oz', quantity: 8 },

    // Veggies / Produce
    { category: 'Veggies', item: 'Roma Tomatoes', unit: 'lbs', quantity: 30 },
    { category: 'Veggies', item: 'Romaine Lettuce', unit: 'heads', quantity: 18 },
    { category: 'Veggies', item: 'Mixed Greens', unit: 'lbs', quantity: 10 },
    { category: 'Veggies', item: 'Red Onions', unit: 'lbs', quantity: 20 },
    { category: 'Veggies', item: 'Yellow Onions', unit: 'lbs', quantity: 20 },
    { category: 'Veggies', item: 'Russet Potatoes', unit: 'lbs', quantity: 50 },
    { category: 'Veggies', item: 'Garlic (fresh)', unit: 'lbs', quantity: 8 },
    { category: 'Veggies', item: 'Carrots', unit: 'lbs', quantity: 25 },
    { category: 'Veggies', item: 'Celery', unit: 'bunches', quantity: 10 },

    // Dairy
    { category: 'Dairy', item: 'Whole Milk', unit: 'gal', quantity: 6 },
    { category: 'Dairy', item: 'Heavy Cream', unit: 'qt', quantity: 8 },
    { category: 'Dairy', item: 'Unsalted Butter', unit: 'lbs', quantity: 10 },
    { category: 'Dairy', item: 'Cheddar Cheese', unit: 'lbs', quantity: 8 },
    { category: 'Dairy', item: 'Mozzarella Cheese', unit: 'lbs', quantity: 8 },
    { category: 'Dairy', item: 'Parmesan Cheese', unit: 'lbs', quantity: 5 },
    { category: 'Dairy', item: 'Eggs', unit: 'dozen', quantity: 10 },

    // Meats
    { category: 'Meats', item: 'Chicken Breast', unit: 'lbs', quantity: 40 },
    { category: 'Meats', item: 'Ground Beef', unit: 'lbs', quantity: 30 },
    { category: 'Meats', item: 'Pork Loin', unit: 'lbs', quantity: 20 },
    { category: 'Meats', item: 'Bacon', unit: 'lbs', quantity: 15 },
    { category: 'Meats', item: 'Salmon Fillet', unit: 'lbs', quantity: 18 },
    { category: 'Meats', item: 'Shrimp (peeled)', unit: 'lbs', quantity: 15 },

    // Liquor
    { category: 'Liquor', item: 'Vodka', unit: 'bottles', quantity: 10 },
    { category: 'Liquor', item: 'Gin', unit: 'bottles', quantity: 8 },
    { category: 'Liquor', item: 'White Rum', unit: 'bottles', quantity: 6 },
    { category: 'Liquor', item: 'Dark Rum', unit: 'bottles', quantity: 4 },
    { category: 'Liquor', item: 'Tequila', unit: 'bottles', quantity: 6 },
    { category: 'Liquor', item: 'Whiskey', unit: 'bottles', quantity: 12 },
    { category: 'Liquor', item: 'Brandy/Cognac', unit: 'bottles', quantity: 4 },

    // Wine
    { category: 'Wine', item: 'House Red', unit: 'bottles', quantity: 24 },
    { category: 'Wine', item: 'House White', unit: 'bottles', quantity: 24 },
    { category: 'Wine', item: 'Rosé', unit: 'bottles', quantity: 12 },
    { category: 'Wine', item: 'Sparkling Wine', unit: 'bottles', quantity: 12 },

    // Fine dining exclusives
    { category: 'Fine Dining', item: 'Black Truffle', unit: 'oz', quantity: 6 },
    { category: 'Fine Dining', item: 'Saffron Threads', unit: 'g', quantity: 30 },
    { category: 'Fine Dining', item: 'Foie Gras', unit: 'lbs', quantity: 4 },
    { category: 'Fine Dining', item: 'Wagyu Striploin', unit: 'lbs', quantity: 10 },
    { category: 'Fine Dining', item: 'Caviar', unit: 'oz', quantity: 12 },
    { category: 'Fine Dining', item: 'Black Garlic', unit: 'bulbs', quantity: 20 },

    // Silver-Ware
    { category: 'Silver-Ware', item: 'Forks', unit: 'pieces', quantity: 200 },
    { category: 'Silver-Ware', item: 'Knives', unit: 'pieces', quantity: 200 },
    { category: 'Silver-Ware', item: 'Spoons', unit: 'pieces', quantity: 200 },
    { category: 'Silver-Ware', item: 'Soup Spoons', unit: 'pieces', quantity: 100 },
    { category: 'Silver-Ware', item: 'Teaspoons', unit: 'pieces', quantity: 150 },
    { category: 'Silver-Ware', item: 'Serving Spoons', unit: 'pieces', quantity: 50 },
    { category: 'Silver-Ware', item: 'Tongs', unit: 'pieces', quantity: 30 },
    { category: 'Silver-Ware', item: 'Ladles', unit: 'pieces', quantity: 20 },
    { category: 'Silver-Ware', item: 'Cake Servers', unit: 'pieces', quantity: 15 },
    { category: 'Silver-Ware', item: 'Cheese Knives', unit: 'pieces', quantity: 25 },
    { category: 'Silver-Ware', item: 'Butter Knives', unit: 'pieces', quantity: 100 },
    { category: 'Silver-Ware', item: 'Steak Knives', unit: 'pieces', quantity: 150 },
    { category: 'Silver-Ware', item: 'Salad Forks', unit: 'pieces', quantity: 100 },
  ]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleInventoryQuantityChange = (itemName, newQuantity) => {
    setInventory((prev) =>
      prev.map((item) =>
        item.item === itemName
          ? { ...item, quantity: Number(newQuantity) || 0 }
          : item
      )
    );
  };

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
                onClick={fetchActiveOrdersFromApi}
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
          onClick={() => setSidebarOpen((open) => !open)}
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
                onClick={() => setActivePanel('employees')}
              >
                🧑‍🍳 Employees
              </button>
            </div>

            {/* Analytics */}
            <div>
              <button
                className="w-full px-5 py-3 bg-dark-card rounded-2xl font-bold text-left text-white shadow hover:bg-yellow-500/90 transition"
                onClick={() => setActivePanel('analytics')}
              >
                📊 Analytics
              </button>
            </div>

            {/* Occupancy */}
            <div>
              <button
                className="w-full px-5 py-3 bg-dark-card rounded-2xl font-bold text-left text-white shadow hover:bg-lime-500/90 transition"
                onClick={() => setActivePanel('occupancy')}
              >
                🪑 Occupancy & Reservations
              </button>
            </div>

            {/* Inventory */}
            <div>
              <button
                className="w-full px-5 py-3 bg-dark-card rounded-2xl font-bold text-left text-white shadow hover:bg-cyan-500/90 transition"
                onClick={() => setActivePanel('inventory')}
              >
                🗃️ Inventory
              </button>
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
                <svg
                  className="w-6 h-6 text-red-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-red-400 font-semibold drop-shadow-sm">
                  {error}
                </p>
              </div>
              <button
                onClick={fetchActiveOrdersFromApi}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg font-semibold transition-all border border-red-500/30"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Yukon hero header */}
        <div className="glass-panel rounded-3xl p-6 mb-6 flex flex-col items-center gap-4">
          <div className="w-40 h-40 md:w-48 md:h-48 rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
            <img src={yukonImage} alt="Yukon kitchen assistant" className="w-full h-full object-cover" />
          </div>
          <div className="w-full text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white">Yukon Kitchen Assistant</h2>
            <p className="text-sm md:text-base text-gray-300">
              Real-time overview of all active orders and kitchen activity in your toggleable sidebar.
            </p>
          </div>
        </div>

        {/* Empty State / Orders Grid */}
        {filteredOrders.length === 0 ? (
          <div className="glass-panel rounded-3xl shadow-2xl p-12 text-center border border-white/10">
            <div className="text-8xl mb-6 drop-shadow-lg">
              {filter === 'all'
                ? '🍽️'
                : filter === 'pending'
                  ? '🆕'
                  : filter === 'preparing'
                    ? '👨‍🍳'
                    : '✅'}
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


      {activePanel && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center">
          <div className="relative w-full h-full max-w-6xl max-h-[95vh] bg-[#050202] rounded-3xl border border-orange-500/70 shadow-2xl overflow-hidden">
            <button
              onClick={() => setActivePanel(null)}
              className="absolute top-4 right-4 text-white/80 hover:text-white text-xl"
            >
              ✕
            </button>

            {activePanel === 'employees' && (
              <div className="p-6 text-white h-full flex flex-col">
                <h2 className="text-2xl font-bold mb-4 text-center">Employee Overview</h2>

                <div className="flex-1 flex items-center justify-center">
                  <div className="bg-dark-card/90 border-l-4 border-orange-400 rounded-2xl px-6 py-5 shadow-xl w-full max-w-2xl">
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      {/* Header row */}
                      <div className="font-bold">Role</div>
                      <div className="font-bold text-right">On duty</div>

                      <div className="col-span-2 border-t border-dark-surface my-1" />

                      {/* Total employees row */}
                      <button
                        type="button"
                        onClick={() => handleRoleClick('all')}
                        className={`col-span-2 flex items-center justify-between px-2 py-1 rounded-lg transition ${selectedRole === 'all' ? 'bg-white/10' : 'hover:bg-white/5'
                          }`}
                      >
                        <span className="font-bold">Total Employees:</span>
                        <span className="text-right">
                          {totalEmployees}{' '}
                          <span className="text-green-500">({totalOnDuty} on duty)</span>
                        </span>
                      </button>

                      {/* Managers */}
                      <button
                        type="button"
                        onClick={() => handleRoleClick('manager')}
                        className={`col-span-2 flex items-center justify-between px-2 py-1 rounded-lg transition ${selectedRole === 'manager' ? 'bg-white/10' : 'hover:bg-white/5'
                          }`}
                      >
                        <span className="font-bold text-orange-400">Managers:</span>
                        <span className="text-right text-green-500">
                          {onDutyManagers} on duty
                        </span>
                      </button>

                      {/* Bartenders */}
                      <button
                        type="button"
                        onClick={() => handleRoleClick('bartender')}
                        className={`col-span-2 flex items-center justify-between px-2 py-1 rounded-lg transition ${selectedRole === 'bartender' ? 'bg-white/10' : 'hover:bg-white/5'
                          }`}
                      >
                        <span className="font-bold text-brand-orange">Bartenders:</span>
                        <span className="text-right text-green-500">
                          {onDutyBartenders} on duty
                        </span>
                      </button>

                      {/* Bar backs */}
                      <button
                        type="button"
                        onClick={() => handleRoleClick('bar_back')}
                        className={`col-span-2 flex items-center justify-between px-2 py-1 rounded-lg transition ${selectedRole === 'bar_back' ? 'bg-white/10' : 'hover:bg-white/5'
                          }`}
                      >
                        <span className="font-bold text-yellow-400">Bar Backs:</span>
                        <span className="text-right text-green-500">
                          {onDutyBarBacks} on duty
                        </span>
                      </button>

                      {/* Busboys */}
                      <button
                        type="button"
                        onClick={() => handleRoleClick('busboy')}
                        className={`col-span-2 flex items-center justify-between px-2 py-1 rounded-lg transition ${selectedRole === 'busboy' ? 'bg-white/10' : 'hover:bg-white/5'
                          }`}
                      >
                        <span className="font-bold text-blue-400">Busboys:</span>
                        <span className="text-right text-green-500">
                          {onDutyBusboys} on duty
                        </span>
                      </button>

                      {/* Waiters */}
                      <button
                        type="button"
                        onClick={() => handleRoleClick('waiter')}
                        className={`col-span-2 flex items-center justify-between px-2 py-1 rounded-lg transition ${selectedRole === 'waiter' ? 'bg-white/10' : 'hover:bg-white/5'
                          }`}
                      >
                        <span className="font-bold text-fuchsia-400">Waiters:</span>
                        <span className="text-right text-green-500">
                          {onDutyWaiters} on duty
                        </span>
                      </button>

                      {/* Hostess */}
                      <button
                        type="button"
                        onClick={() => handleRoleClick('hostess')}
                        className={`col-span-2 flex items-center justify-between px-2 py-1 rounded-lg transition ${selectedRole === 'hostess' ? 'bg-white/10' : 'hover:bg-white/5'
                          }`}
                      >
                        <span className="font-bold text-pink-400">Hostess:</span>
                        <span className="text-right text-green-500">
                          {onDutyHostess} on duty
                        </span>
                      </button>
                    </div>

                    {selectedRole && (
                      <div className="mt-4 border-t border-dark-surface pt-3">
                        <h3 className="text-sm font-semibold text-gray-300 mb-2">
                          {selectedRole === 'all'
                            ? 'All employees'
                            : `Employees: ${selectedRole}`}
                        </h3>

                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {employees
                            .filter((emp) =>
                              selectedRole === 'all'
                                ? true
                                : emp.role === selectedRole
                            )
                            .map((emp) => (
                              <label
                                key={emp.id}
                                className="flex items-center justify-between bg-black/40 rounded-lg px-3 py-2 text-xs"
                              >
                                <span className="font-medium text-gray-100">
                                  {emp.name || 'Unnamed'}
                                </span>
                                <span className="flex items-center gap-2">
                                  <span className="text-gray-400">On duty</span>
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4 accent-brand-orange"
                                    checked={!!emp.on_duty}
                                    onChange={(e) =>
                                      handleEmployeeOnDutyChange(
                                        emp.id,
                                        e.target.checked
                                      )
                                    }
                                  />
                                </span>
                              </label>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}


            {/* Analytics fullscreen content */}
            {activePanel === 'analytics' && (
              <div className="p-6 text-white h-full flex flex-col">
                <h2 className="text-2xl font-bold mb-4 text-center">Order Analytics</h2>

                {/* Bar chart container */}

                <div className="flex-1 flex items-end justify-center gap-6">
                  {[
                    { label: 'Total', value: totalOrders, color: 'bg-white' },
                    { label: 'Pending', value: totalPending, color: 'bg-yellow-400' },
                    { label: 'Preparing', value: totalPreparing, color: 'bg-amber-300' },
                    { label: 'Ready', value: totalReady, color: 'bg-green-400' },
                    { label: 'Completed', value: totalCompleted, color: 'bg-emerald-400' },
                  ].map((entry) => {
                    const maxVal =
                      Math.max(
                        totalOrders,
                        totalPending,
                        totalPreparing,
                        totalReady,
                        totalCompleted
                      ) || 1;

                    let heightPct = (entry.value / maxVal) * 100;
                    if (entry.value > 0 && heightPct < 10) heightPct = 10;
                    if (entry.value === 0) heightPct = 3;

                    return (
                      <div
                        key={entry.label}
                        className="flex flex-col items-center justify-end gap-2"
                      >
                        {/* give the track a fixed height */}
                        <div className="relative w-15 h-56 flex items-end">
                          <div
                            className={`w-full rounded-t-2xl ${entry.color} transition-all duration-300`}
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>
                        <div className="text-center text-xs mt-1">
                          <div className="font-bold">{entry.value}</div>
                          <div className="text-gray-300">{entry.label}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>


                {/* Im keeping the numeric summary below chart */}
                <div className="mt-6 bg-dark-card/80 rounded-2xl px-5 py-4 border border-yellow-400/40 shadow-xl max-w-xl">
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
              </div>
            )}


            {activePanel === 'occupancy' && (
              <div className="p-4 text-white h-full flex flex-col">
                <h2 className="text-2xl font-bold mb-4 text-center">
                  Occupancy & Reservations
                </h2>

                <div className="flex-1 flex items-center justify-center">
                  <div className="bg-dark-card/90 border-l-4 border-lime-400 rounded-xl px-5 py-45 shadow-xl max-w-2xl w-full">
                    {/* Circle graph + summary */}
                    <div className="flex items-center justify-center">
                      <div className="w-38 h-40 mr-16">
                        <CircularProgressbar
                          value={occupancyPercent}
                          text={`${occupancyPercent}%`}
                          styles={buildStyles({
                            pathColor:
                              occupancyPercent >= 100
                                ? '#f87171' // red
                                : occupancyPercent >= 90
                                  ? '#facc15' // yellow
                                  : '#22c55e', // green
                            textColor: '#ffffff',
                            trailColor: '#111827',
                          })}
                        />
                      </div>
                      <div className="text-lg text-gray-200">
                        <div>
                          {totalOccupancy} guests / {LEGAL_CAPACITY} legal capacity
                        </div>
                        <div
                          className={
                            occupancyPercent >= 100
                              ? 'text-red-400 font-semibold'
                              : 'text-brand-lime'
                          }
                        >
                          {occupancyPercent >= 100
                            ? 'At or over legal capacity'
                            : 'Below legal capacity'}
                        </div>
                      </div>
                    </div>

                    {/* Summary numbers */}
                    <ul className="text-sm space-y-2 mb-4 text-center mt-16">
                      <li>
                        <span className="font-semibold text-brand-lime">Current Occupancy:</span>{' '}
                        {totalOccupancy}
                      </li>
                      <li>
                        <span className="font-semibold text-brand-orange">To-Go Orders:</span>{' '}
                        {totalToGo}
                      </li>
                      <li>
                        <span className="font-semibold text-text-secondary">Today's Reservations:</span>{' '}
                        {totalReservationsToday}
                      </li>
                    </ul>

                    {/* Reservations list */}
                    {todaysReservations.length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-xs font-semibold text-gray-300 mb-1">
                          Today&apos;s Reservations
                        </h3>
                        <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                          {todaysReservations.map((res) => (
                            <div
                              key={res.id}
                              className="flex items-center justify-between text-xs bg-black/40 rounded-lg px-3 py-2"
                            >
                              <span className="font-medium text-gray-100">
                                {res.reservation_name || 'Unnamed Party'}
                              </span>
                              <span className="font-mono text-brand-lime">
                                {res.number_of_guests || 0} guest
                                {(res.number_of_guests || 0) === 1 ? '' : 's'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Current dine-in guests list */}
                    {activeDineIn.length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-xs font-semibold text-gray-300 mb-1">
                          Current Dine-In Guests
                        </h3>
                        <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                          {activeDineIn.map((order) => (
                            <div
                              key={order.id}
                              className="flex items-center justify-between text-xs bg-black/40 rounded-lg px-3 py-2"
                            >
                              <span className="font-medium text-gray-100">
                                {order.reservation_name ||
                                  order.guest_name ||
                                  `Table ${order.table_id || 'N/A'}`}
                              </span>
                              <span className="font-mono text-brand-lime">
                                {order.number_of_guests || 0} guest
                                {(order.number_of_guests || 0) === 1 ? '' : 's'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* To-go orders list */}
                    {activeToGo.length > 0 && (
                      <div className="mb-2">
                        <h3 className="text-xs font-semibold text-gray-300 mb-1">
                          Active To-Go Orders
                        </h3>
                        <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                          {activeToGo.map((order) => (
                            <div
                              key={order.id}
                              className="flex items-center justify-between text-xs bg-black/40 rounded-lg px-3 py-2"
                            >
                              <span className="font-medium text-gray-100">
                                {order.guest_name ||
                                  order.reservation_name ||
                                  `Order #${order.id}`}
                              </span>
                              <span className="font-mono text-brand-orange">
                                {order.number_of_guests || 0} item
                                {(order.number_of_guests || 0) === 1 ? '' : 's'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}


            {activePanel === 'inventory' && (
              <div className="p-6 text-white h-full flex flex-col">
                <h2 className="text-2xl font-bold mb-4">Inventory</h2>

                <div className="space-y-6 flex-1 overflow-y-auto pr-2">
                  {['Grains', 'Spices', 'Veggies', 'Dairy', 'Meats', 'Liquor', 'Wine', 'Fine Dining', 'Silver-Ware'].map((cat) => (
                    <div key={cat}>
                      <h3 className="text-lg font-semibold text-brand-orange mb-2">{cat}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                        {inventory
                          .filter((i) => i.category === cat)
                          .map((item) => (
                            <div
                              key={item.item}
                              className="glass-panel rounded-2xl px-3 py-2 flex justify-between items-center"
                            >
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  className="w-16 px-2 py-1 rounded-md bg-black/60 text-lime-300 border border-cyan-500/60 text-left font-mono focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleInventoryQuantityChange(item.item, e.target.value)
                                  }
                                />
                                <span className="text-gray-300 text-xs">{item.unit}</span>
                              </div>
                              <span className="font-medium text-white">{item.item}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}


          </div>
        </div>
      )}




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
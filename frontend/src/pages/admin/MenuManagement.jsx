import { useState, useEffect } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const MenuManagement = () => {
  const [items, setItems] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form state
  const [currentItem, setCurrentItem] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    available: true,
    restaurant_id: ''
  });

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch restaurants for dropdown
        const restRes = await fetch(`${API_URL}/api/restaurants`);
        const restData = await restRes.json();
        if (restData.success) {
          setRestaurants(restData.data);
          if (restData.data.length > 0) {
            setSelectedRestaurant(restData.data[0].id);
          }
        }
      } catch (err) {
        setError('Failed to load initial data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch menu items when restaurant changes
  useEffect(() => {
    if (!selectedRestaurant) return;
    
    const fetchMenu = async () => {
      try {
        const res = await fetch(`${API_URL}/api/restaurants/${selectedRestaurant}/menu`);
        const data = await res.json();
        if (data.success) setItems(data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchMenu();
  }, [selectedRestaurant]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = isEditing 
        ? `${API_URL}/api/menu/${currentItem.id}`
        : `${API_URL}/api/menu`;
      
      const method = isEditing ? 'PUT' : 'POST';
      const body = {
        ...currentItem,
        restaurant_id: selectedRestaurant,
        price: parseFloat(currentItem.price)
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (data.success) {
        // Refresh list
        const menuRes = await fetch(`${API_URL}/api/restaurants/${selectedRestaurant}/menu`);
        const menuData = await menuRes.json();
        setItems(menuData.data);
        
        // Reset form
        setIsEditing(false);
        setCurrentItem({
          name: '', description: '', price: '', category: '', available: true, restaurant_id: ''
        });
      }
    } catch (err) {
      alert('Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this item?')) return;
    try {
      await fetch(`${API_URL}/api/menu/${id}`, { method: 'DELETE' });
      setItems(items.filter(i => i.id !== id));
    } catch (err) {
      alert('Delete failed');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-dark-bg text-text-primary p-6">
      <h1 className="text-3xl font-bold mb-6">Menu Management</h1>
      
      <div className="mb-6">
        <label className="mr-3">Select Restaurant:</label>
        <select 
          className="bg-dark-surface p-2 rounded"
          value={selectedRestaurant}
          onChange={(e) => setSelectedRestaurant(e.target.value)}
        >
          {restaurants.map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="bg-dark-card p-6 rounded-xl h-fit">
          <h2 className="text-xl font-bold mb-4">{isEditing ? 'Edit Item' : 'Add New Item'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Name</label>
              <input 
                required
                className="w-full bg-dark-surface p-2 rounded border border-gray-700"
                value={currentItem.name}
                onChange={e => setCurrentItem({...currentItem, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Description</label>
              <textarea 
                className="w-full bg-dark-surface p-2 rounded border border-gray-700"
                value={currentItem.description}
                onChange={e => setCurrentItem({...currentItem, description: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Price ($)</label>
                <input 
                  type="number" step="0.01" required
                  className="w-full bg-dark-surface p-2 rounded border border-gray-700"
                  value={currentItem.price}
                  onChange={e => setCurrentItem({...currentItem, price: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Category</label>
                <input 
                  required
                  className="w-full bg-dark-surface p-2 rounded border border-gray-700"
                  value={currentItem.category}
                  onChange={e => setCurrentItem({...currentItem, category: e.target.value})}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="checkbox"
                checked={currentItem.available}
                onChange={e => setCurrentItem({...currentItem, available: e.target.checked})}
              />
              <label>Available</label>
            </div>
            
            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 bg-brand-orange py-2 rounded font-bold hover:opacity-90">
                {isEditing ? 'Update' : 'Create'}
              </button>
              {isEditing && (
                <button 
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setCurrentItem({ name: '', description: '', price: '', category: '', available: true });
                  }}
                  className="px-4 bg-gray-600 rounded hover:opacity-90"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* List */}
        <div className="lg:col-span-2 space-y-4">
          {items.map(item => (
            <div key={item.id} className="bg-dark-card p-4 rounded-xl flex justify-between items-center border border-dark-surface">
              <div>
                <h3 className="font-bold text-lg">{item.name}</h3>
                <p className="text-text-secondary text-sm">{item.description}</p>
                <div className="flex gap-3 mt-2 text-sm">
                  <span className="text-brand-lime">${Number(item.price).toFixed(2)}</span>
                  <span className="bg-gray-700 px-2 rounded text-xs flex items-center">{item.category}</span>
                  <span className={`px-2 rounded text-xs flex items-center ${item.available ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
                    {item.available ? 'Available' : 'Unavailable'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setIsEditing(true);
                    setCurrentItem(item);
                  }}
                  className="p-2 hover:bg-gray-700 rounded text-blue-400"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDelete(item.id)}
                  className="p-2 hover:bg-gray-700 rounded text-red-400"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MenuManagement;
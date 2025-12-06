const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function fetchActiveOrders() {
    const response = await fetch(`${API_URL}/orders/active`);
    if (!response.ok) {
        throw new Error('Failed to fetch active orders');
    }
    return response.json();
}
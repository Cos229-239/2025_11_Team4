import { fetchWithAuth } from '../utils/api';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = `${BASE_URL}/api`;

export async function fetchActiveOrders() {
    const response = await fetchWithAuth(`${API_URL}/orders/active`);
    if (!response.ok) {
        throw new Error('Failed to fetch active orders');
    }
    return response.json();
}

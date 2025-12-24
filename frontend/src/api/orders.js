const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = `${BASE_URL}/api`;

export async function fetchActiveOrders() {
    const response = await fetch(`${API_URL}/orders/active`);
    if (!response.ok) {
        throw new Error('Failed to fetch active orders');
    }
    return response.json();
}

export async function updateOrderStatus(id, status) {
    const response = await fetch(`${API_URL}/orders/${id}/status`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to update order status: ${text}`);
    }

    return response.json();
}
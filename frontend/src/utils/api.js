/**
 * Custom API wrapper to handle authentication and session expiration
 */
export const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem('token');

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers,
    };

    try {
        const response = await fetch(url, config);

        if (response.status === 401) {
            // Dispatch custom event for session expiration
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }

        return response;
    } catch (error) {
        throw error;
    }
};

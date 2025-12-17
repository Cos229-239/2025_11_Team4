/**
 * Custom API wrapper to handle authentication and session expiration
 */
const getToken = () => {
    // Prefer sessionStorage (short-lived, safer); fall back to legacy localStorage key if present.
    return (
        sessionStorage.getItem('ordereasy_token') ||
        localStorage.getItem('token') ||
        localStorage.getItem('ordereasy_token') ||
        null
    );
};

export const fetchWithAuth = async (url, options = {}) => {
    const token = getToken();

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

    const response = await fetch(url, config);

    if (response.status === 401) {
        // Dispatch custom event for session expiration
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }

    return response;
};

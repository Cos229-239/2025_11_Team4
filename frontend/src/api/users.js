const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const fetchEmployees = async () => {
    try {
        const response = await fetch(`${API_URL}/api/users/employees`);
        if (!response.ok) {
            throw new Error('Failed to fetch employees');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching employees:', error);
        return { success: false, message: error.message };
    }
};

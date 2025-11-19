import { createContext, useContext, useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * AuthContext
 * Manages authentication state for Kitchen Dashboard access using backend verification
 */

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing auth session on mount
  useEffect(() => {
    const checkAuth = () => {
      try {
        const authData = sessionStorage.getItem('kitchen_auth');
        if (authData) {
          const { authenticated, timestamp } = JSON.parse(authData);
          const now = new Date().getTime();
          const sessionDuration = 8 * 60 * 60 * 1000; // 8 hours

          // Check if session is still valid
          if (authenticated && (now - timestamp) < sessionDuration) {
            setIsAuthenticated(true);
          } else {
            // Session expired, clear storage
            sessionStorage.removeItem('kitchen_auth');
            setIsAuthenticated(false);
          }
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  /**
   * Login with PIN via Backend
   * @param {string} pin - 4-digit PIN entered by user
   * @returns {Promise<boolean>} - true if login successful, false otherwise
   */
  const login = async (pin) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/kitchen-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin }),
      });

      const data = await response.json();

      if (data.success) {
        const authData = {
          authenticated: true,
          timestamp: new Date().getTime(),
          token: data.token // In a real app, store this securely (HttpOnly cookie preferred)
        };
        sessionStorage.setItem('kitchen_auth', JSON.stringify(authData));
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  /**
   * Logout - clears authentication
   */
  const logout = () => {
    sessionStorage.removeItem('kitchen_auth');
    setIsAuthenticated(false);
  };

  const value = {
    isAuthenticated,
    isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
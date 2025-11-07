import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * AuthContext
 * Manages authentication state for Kitchen Dashboard access
 * Uses sessionStorage to persist auth across page refreshes
 */

const AuthContext = createContext();

// Hardcoded PIN (will be configurable later)
const KITCHEN_PIN = '1234';

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
   * Login with PIN
   * @param {string} pin - 4-digit PIN entered by user
   * @returns {boolean} - true if login successful, false otherwise
   */
  const login = (pin) => {
    if (pin === KITCHEN_PIN) {
      const authData = {
        authenticated: true,
        timestamp: new Date().getTime()
      };
      sessionStorage.setItem('kitchen_auth', JSON.stringify(authData));
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  /**
   * Logout - clears authentication
   */
  const logout = () => {
    sessionStorage.removeItem('kitchen_auth');
    setIsAuthenticated(false);
  };

  /**
   * Check if current session is still valid
   * @returns {boolean}
   */
  const isSessionValid = () => {
    try {
      const authData = sessionStorage.getItem('kitchen_auth');
      if (!authData) return false;

      const { authenticated, timestamp } = JSON.parse(authData);
      const now = new Date().getTime();
      const sessionDuration = 8 * 60 * 60 * 1000; // 8 hours

      return authenticated && (now - timestamp) < sessionDuration;
    } catch (error) {
      return false;
    }
  };

  const value = {
    isAuthenticated,
    isLoading,
    login,
    logout,
    isSessionValid,
    kitchenPin: KITCHEN_PIN // Exposed for testing/development (remove in production)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to use auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

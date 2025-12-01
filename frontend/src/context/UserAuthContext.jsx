import { createContext, useContext, useEffect, useState } from 'react';

const UserAuthContext = createContext(null);

export const UserAuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('ordereasy_token'));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('ordereasy_user');
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  });

  useEffect(() => {
    if (token) localStorage.setItem('ordereasy_token', token); else localStorage.removeItem('ordereasy_token');
  }, [token]);
  useEffect(() => {
    if (user) {
      localStorage.setItem('ordereasy_user', JSON.stringify(user));
      // Maintain compatibility with older flows
      if (user.id) sessionStorage.setItem('ordereasy_user_id', String(user.id));
    } else {
      localStorage.removeItem('ordereasy_user');
    }
  }, [user]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
      localStorage.removeItem('ordereasy_token');
      localStorage.removeItem('ordereasy_user');
      alert('Your session has expired. Please log in again.');
      window.location.href = '/login';
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const value = { token, setToken, user, setUser, logout: () => { setToken(null); setUser(null); localStorage.removeItem('ordereasy_token'); localStorage.removeItem('ordereasy_user'); } };
  return <UserAuthContext.Provider value={value}>{children}</UserAuthContext.Provider>;
};

export const useUserAuth = () => {
  const ctx = useContext(UserAuthContext);
  if (!ctx) throw new Error('useUserAuth must be used within UserAuthProvider');
  return ctx;
};


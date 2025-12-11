import { useState, useEffect } from 'react';
import UserAuthContext from './UserAuthContext';

export const UserAuthProvider = ({ children }) => {
    const [token, setToken] = useState(() => sessionStorage.getItem('ordereasy_token'));
    const [user, setUser] = useState(() => {
        const raw = sessionStorage.getItem('ordereasy_user');
        try { return raw ? JSON.parse(raw) : null; } catch { return null; }
    });

    const parseJwt = (token) => {
        try {
            return JSON.parse(atob(token.split('.')[1]));
        } catch {
            return null;
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        sessionStorage.removeItem('ordereasy_token');
        sessionStorage.removeItem('ordereasy_user');
        sessionStorage.removeItem('ordereasy_user_id');
    };

    const login = (newToken, newUser) => {
        setToken(newToken);
        setUser(newUser);
        sessionStorage.setItem('ordereasy_token', newToken);
        sessionStorage.setItem('ordereasy_user', JSON.stringify(newUser));
        if (newUser.id) sessionStorage.setItem('ordereasy_user_id', String(newUser.id));
    };

    useEffect(() => {
        if (token) {
            const decoded = parseJwt(token);
            if (decoded && decoded.exp * 1000 < Date.now()) {
                logout();
            } else {
                sessionStorage.setItem('ordereasy_token', token);
            }
        } else {
            sessionStorage.removeItem('ordereasy_token');
        }
    }, [token]);

    useEffect(() => {
        if (user) {
            sessionStorage.setItem('ordereasy_user', JSON.stringify(user));
            if (user.id) sessionStorage.setItem('ordereasy_user_id', String(user.id));
        } else {
            sessionStorage.removeItem('ordereasy_user');
            sessionStorage.removeItem('ordereasy_user_id');
        }
    }, [user]);

    useEffect(() => {
        const handleUnauthorized = () => {
            logout();
            alert('Your session has expired. Please log in again.');
            window.location.href = '/login';
        };

        window.addEventListener('auth:unauthorized', handleUnauthorized);
        return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
    }, []);

    const value = { token, setToken, user, setUser, login, logout };
    return <UserAuthContext.Provider value={value}>{children}</UserAuthContext.Provider>;
};

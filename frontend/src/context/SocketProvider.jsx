import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import SocketContext from './SocketContext';
import { useUserAuth } from '../hooks/useUserAuth';

// Socket server URL from environment or default
const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * SocketProvider Component
 * Manages Socket.IO connection and provides socket instance to children
 */
export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState(null);
    const { token } = useUserAuth();

    useEffect(() => {
        // Initialize Socket.IO connection


        const socketInstance = io(SOCKET_URL, {
            auth: token ? { token } : {},
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 10000,
        });

        // Connection successful
        socketInstance.on('connect', () => {

            setIsConnected(true);
            setConnectionError(null);
        });

        // Connection error
        socketInstance.on('connect_error', (error) => {
            console.error('❌ Socket connection error:', error.message);
            setIsConnected(false);
            setConnectionError(error.message);
        });

        // Disconnected
        socketInstance.on('disconnect', () => {
            setIsConnected(false);
        });

        // Reconnection attempt
        socketInstance.on('reconnect_attempt', () => {
        });

        // Reconnection successful
        socketInstance.on('reconnect', () => {
            setIsConnected(true);
            setConnectionError(null);
        });

        // Reconnection failed
        socketInstance.on('reconnect_failed', () => {
            console.error('❌ Failed to reconnect to Socket.IO server');
            setConnectionError('Failed to reconnect to server');
        });

        setSocket(socketInstance);

        // Cleanup on unmount
        return () => {
            if (socketInstance) {
                // Remove listeners to prevent memory leaks
                socketInstance.off('connect');
                socketInstance.off('connect_error');
                socketInstance.off('disconnect');
                socketInstance.disconnect();
            }
        };
    }, [token]);

    const value = {
        socket,
        isConnected,
        connectionError,
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};

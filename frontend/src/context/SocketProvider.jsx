import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import SocketContext from './SocketContext';

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

    useEffect(() => {
        // Initialize Socket.IO connection
        console.log('🔌 Connecting to Socket.IO server:', SOCKET_URL);

        const socketInstance = io(SOCKET_URL, {
            transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 10000,
        });

        // Connection successful
        socketInstance.on('connect', () => {
            console.log('✅ Connected to Socket.IO server:', socketInstance.id);
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
        socketInstance.on('disconnect', (reason) => {
            console.log('⚠️  Disconnected from Socket.IO server:', reason);
            setIsConnected(false);
        });

        // Reconnection attempt
        socketInstance.on('reconnect_attempt', (attemptNumber) => {
            console.log(`🔄 Reconnection attempt ${attemptNumber}...`);
        });

        // Reconnection successful
        socketInstance.on('reconnect', (attemptNumber) => {
            console.log(`✅ Reconnected after ${attemptNumber} attempts`);
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
            console.log('🔌 Disconnecting from Socket.IO server...');
            socketInstance.disconnect();
        };
    }, []);

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

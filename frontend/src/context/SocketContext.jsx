import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

// Create Socket Context
const SocketContext = createContext(null);

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

/**
 * useSocket Hook
 * Provides access to socket instance and connection status
 *
 * @returns {Object} { socket, isConnected, connectionError }
 */
export const useSocket = () => {
  const context = useContext(SocketContext);

  if (context === null) {
    throw new Error('useSocket must be used within a SocketProvider');
  }

  return context;
};

/**
 * useSocketEvent Hook
 * Subscribe to a socket event and handle it with a callback
 *
 * @param {string} eventName - The name of the socket event to listen for
 * @param {Function} callback - The callback function to handle the event
 */
export const useSocketEvent = (eventName, callback) => {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;

    console.log(`👂 Listening for socket event: ${eventName}`);
    socket.on(eventName, callback);

    // Cleanup
    return () => {
      console.log(`🔇 Stopped listening for socket event: ${eventName}`);
      socket.off(eventName, callback);
    };
  }, [socket, isConnected, eventName, callback]);
};

/**
 * useSocketEmit Hook
 * Returns a function to emit socket events
 *
 * @returns {Function} emit function (eventName, data)
 */
export const useSocketEmit = () => {
  const { socket, isConnected } = useSocket();

  const emit = (eventName, data) => {
    if (!socket || !isConnected) {
      console.warn('⚠️  Socket not connected, cannot emit event:', eventName);
      return false;
    }

    console.log(`📤 Emitting socket event: ${eventName}`, data);
    socket.emit(eventName, data);
    return true;
  };

  return emit;
};

export default SocketContext;

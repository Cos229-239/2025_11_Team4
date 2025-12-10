import { useContext, useEffect } from 'react';
import SocketContext from '../context/SocketContext';

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


        socket.on(eventName, callback);

        // Cleanup
        return () => {

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


        socket.emit(eventName, data);
        return true;
    };

    return emit;
};


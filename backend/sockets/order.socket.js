/**
 * Socket.IO Order Event Handlers
 * Manages real-time order updates for OrderEasy
 */

const setupOrderSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    const isStaff = () => ['developer', 'owner', 'employee'].includes(socket.user?.role);

    socket.on('join-kitchen', () => {
      if (!isStaff()) {
        socket.emit('unauthorized', { success: false, message: 'Kitchen access requires staff role' });
        return;
      }
      socket.join('kitchen');
      socket.emit('joined-kitchen', { success: true, socketId: socket.id });
    });

    socket.on('join-admin', () => {
      if (!isStaff()) {
        socket.emit('unauthorized', { success: false, message: 'Admin access requires staff role' });
        return;
      }
      socket.join('admin');
      socket.emit('joined-admin', { success: true, socketId: socket.id });
    });

    // Public: used for customer order tracking updates scoped to a specific table room.
    socket.on('join-table', (tableId) => {
      const normalized = String(tableId || '').replace(/[^\d]/g, '');
      if (!normalized) return;
      socket.join(`table-${normalized}`);
      socket.emit('joined-table', { success: true, tableId: normalized, socketId: socket.id });
    });

    socket.on('leave-kitchen', () => {
      if (!isStaff()) return;
      socket.leave('kitchen');
    });

    socket.on('leave-table', (tableId) => {
      const normalized = String(tableId || '').replace(/[^\d]/g, '');
      if (!normalized) return;
      socket.leave(`table-${normalized}`);
    });

    // These are legacy/manual broadcast events. Only staff can emit them.
    socket.on('update-order-status', (data) => {
      if (!isStaff()) {
        socket.emit('unauthorized', { success: false, message: 'Staff role required' });
        return;
      }
      io.to(`table-${data.tableId}`).emit('order-updated', data);
      io.to('kitchen').emit('order-updated', data);
      io.to('admin').emit('order-updated', data);
    });

    socket.on('order-ready', (data) => {
      if (!isStaff()) {
        socket.emit('unauthorized', { success: false, message: 'Staff role required' });
        return;
      }
      io.to(`table-${data.tableId}`).emit('order-ready', data);
      io.to('admin').emit('order-ready', data);
    });

    socket.on('disconnect', (reason) => {
      console.log(`Client disconnected: ${socket.id} (${reason})`);
    });
  });

  console.log('Socket.IO server initialized');
};

module.exports = { setupOrderSocket };


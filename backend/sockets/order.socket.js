/**
 * Socket.IO Order Event Handlers
 * Manages real-time order updates for OrderEasy
 */

const setupOrderSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    // Join kitchen room - for kitchen dashboard
    socket.on('join-kitchen', () => {
      socket.join('kitchen');
      console.log(`👨‍🍳 Socket ${socket.id} joined kitchen room`);

      // Send confirmation back to client
      socket.emit('joined-kitchen', {
        success: true,
        message: 'Successfully joined kitchen room',
        socketId: socket.id
      });
    });

    // Join table room - for customer order tracking
    socket.on('join-table', (tableId) => {
      socket.join(`table-${tableId}`);
      console.log(`🍽️  Socket ${socket.id} joined table-${tableId} room`);

      socket.emit('joined-table', {
        success: true,
        tableId: tableId,
        message: `Successfully joined table ${tableId} room`,
        socketId: socket.id
      });
    });

    // Join admin room - for admin panel
    socket.on('join-admin', () => {
      socket.join('admin');
      console.log(`👨‍💼 Socket ${socket.id} joined admin room`);

      socket.emit('joined-admin', {
        success: true,
        message: 'Successfully joined admin room',
        socketId: socket.id
      });
    });

    // Handle manual order status updates (from kitchen/admin)
    socket.on('update-order-status', (data) => {
      console.log('📝 Order status update request:', data);

      // Broadcast to relevant rooms
      io.to(`table-${data.tableId}`).emit('order-updated', data);
      io.to('kitchen').emit('order-updated', data);
      io.to('admin').emit('order-updated', data);
    });

    // Handle order ready notification
    socket.on('order-ready', (data) => {
      console.log('✅ Order ready:', data);

      // Notify customer's table
      io.to(`table-${data.tableId}`).emit('order-ready', data);
      io.to('admin').emit('order-ready', data);
    });

    // Leave rooms on explicit request
    socket.on('leave-kitchen', () => {
      socket.leave('kitchen');
      console.log(`Socket ${socket.id} left kitchen room`);
    });

    socket.on('leave-table', (tableId) => {
      socket.leave(`table-${tableId}`);
      console.log(`Socket ${socket.id} left table-${tableId} room`);
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`❌ Client disconnected: ${socket.id} - Reason: ${reason}`);
    });

    // Handle connection errors
    socket.on('error', (error) => {
      console.error(`⚠️  Socket error for ${socket.id}:`, error);
    });
  });

  // Log when Socket.IO server is ready
  console.log('🔌 Socket.IO server initialized');
};

module.exports = { setupOrderSocket };

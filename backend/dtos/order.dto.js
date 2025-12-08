class OrderDTO {
    constructor(order) {
        this.id = order.id;
        this.table_id = order.table_id;
        this.restaurant_id = order.restaurant_id;
        this.user_id = order.user_id;
        this.order_number = order.order_number || String(order.id); // Fallback

        this.status = order.status;
        this.order_type = order.order_type;

        this.total_amount = parseFloat(order.total_amount);
        this.payment_status = order.payment_status;
        this.payment_method = order.payment_method;
        this.tip_amount = parseFloat(order.tip_amount || 0);

        this.customer_notes = order.customer_notes;
        this.created_at = order.created_at;
        this.updated_at = order.updated_at;

        // Optional/Joined fields
        if (order.reservation_id) this.reservation_id = order.reservation_id;
        if (order.scheduled_for) this.scheduled_for = order.scheduled_for;
        if (order.estimated_completion) this.estimated_completion = order.estimated_completion;

        if (order.restaurant_name) this.restaurant_name = order.restaurant_name;
        if (order.restaurant_image) this.restaurant_image = order.restaurant_image;
        if (order.table_number) this.table_number = order.table_number;

        // Items
        if (order.items && Array.isArray(order.items)) {
            this.items = order.items.map(item => ({
                id: item.id,
                menu_item_id: item.menu_item_id,
                name: item.menu_item_name || item.name, // Handle different field names from joins
                price: parseFloat(item.menu_item_price || item.price),
                quantity: item.quantity,
                special_instructions: item.special_instructions,
                subtotal: parseFloat(item.subtotal)
            }));
        }
    }
}

module.exports = OrderDTO;

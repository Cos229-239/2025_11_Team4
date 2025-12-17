class PublicOrderDTO {
    constructor(order) {
        this.id = order.id;
        this.order_number = order.order_number || String(order.id);
        this.status = order.status;
        this.order_type = order.order_type;

        this.table_id = order.table_id;
        this.restaurant_id = order.restaurant_id;

        this.total_amount = order.total_amount !== undefined ? parseFloat(order.total_amount) : undefined;
        this.created_at = order.created_at;
        this.updated_at = order.updated_at;

        if (order.reservation_id) this.reservation_id = order.reservation_id;
        if (order.scheduled_for) this.scheduled_for = order.scheduled_for;
        if (order.estimated_completion) this.estimated_completion = order.estimated_completion;

        if (order.table_number) this.table_number = order.table_number;
        if (order.restaurant_name) this.restaurant_name = order.restaurant_name;

        if (order.items && Array.isArray(order.items)) {
            this.items = order.items.map(item => ({
                id: item.id,
                menu_item_id: item.menu_item_id,
                name: item.menu_item_name || item.name,
                quantity: item.quantity,
                subtotal: item.subtotal !== undefined ? parseFloat(item.subtotal) : undefined
            }));
        }
    }
}

module.exports = PublicOrderDTO;


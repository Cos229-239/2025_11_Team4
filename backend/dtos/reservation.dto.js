class ReservationDTO {
    constructor(data) {
        this.id = data.id;
        this.restaurant_id = data.restaurant_id;
        this.table_id = data.table_id;
        this.user_id = data.user_id;
        this.customer_name = data.customer_name;
        this.customer_phone = data.customer_phone;
        this.customer_email = data.customer_email;
        this.party_size = data.party_size;
        this.reservation_date = data.reservation_date;
        this.reservation_time = data.reservation_time;
        this.special_requests = data.special_requests;
        this.status = data.status;
        this.has_pre_order = data.has_pre_order;
        this.kitchen_notified = data.kitchen_notified;
        this.customer_arrived = data.customer_arrived;
        this.arrival_time = data.arrival_time;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        this.expires_at = data.expires_at;
        this.confirmed_at = data.confirmed_at;

        // Joined fields (optional, depend on query)
        if (data.restaurant_name) this.restaurant_name = data.restaurant_name;
        if (data.restaurant_address) this.restaurant_address = data.restaurant_address;
        if (data.restaurant_phone) this.restaurant_phone = data.restaurant_phone;
        if (data.restaurant_timezone) this.restaurant_timezone = data.restaurant_timezone;
        if (data.table_number) this.table_number = data.table_number;
        if (data.table_capacity) this.table_capacity = data.table_capacity;

        // Nested objects (e.g. orders)
        if (data.orders) {
            this.orders = data.orders; // Assuming orders are already formatted or just pass through
        }
    }
}

module.exports = ReservationDTO;

class TableDTO {
    constructor(table) {
        this.id = table.id;
        this.table_number = table.table_number;
        this.capacity = table.capacity;
        this.min_capacity = table.min_capacity;
        this.status = table.status;
        this.qr_code = table.qr_code;
        this.restaurant_id = table.restaurant_id;
        this.section = table.section;
        this.shape = table.shape;
        this.notes = table.notes;
        this.is_accessible = table.is_accessible;
        this.created_at = table.created_at;
        this.updated_at = table.updated_at;
    }
}

module.exports = TableDTO;

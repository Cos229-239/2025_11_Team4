class TableDTO {
    constructor(table) {
        this.id = table.id;
        this.table_number = table.table_number;
        this.capacity = table.capacity;
        this.status = table.status;
        this.qr_code = table.qr_code;
        this.restaurant_id = table.restaurant_id;
    }
}

module.exports = TableDTO;

class MenuDTO {
    constructor(menuItem) {
        this.id = menuItem.id;
        this.name = menuItem.name;
        this.description = menuItem.description;
        this.price = Number(menuItem.price);
        this.category = menuItem.category;
        this.image_url = menuItem.image_url;
        this.available = menuItem.available;
        this.restaurant_id = menuItem.restaurant_id;
    }
}

module.exports = MenuDTO;

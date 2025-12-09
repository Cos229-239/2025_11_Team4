class MenuDTO {
    constructor(menuItem) {
        this.id = menuItem.id;
        this.name = menuItem.name;
        this.description = menuItem.description;
        this.price = Number(menuItem.price);
        this.category = menuItem.category;
        this.category_id = menuItem.category_id;
        this.image_url = menuItem.image_url;
        this.available = menuItem.available;
        this.restaurant_id = menuItem.restaurant_id;

        // Enhanced fields
        this.dietary_tags = menuItem.dietary_tags || [];
        this.allergens = menuItem.allergens || [];
        this.calories = menuItem.calories;
        this.prep_time_minutes = menuItem.prep_time_minutes;
        this.spice_level = menuItem.spice_level;
        this.is_featured = menuItem.is_featured || false;
        this.is_new = menuItem.is_new || false;
        this.sort_order = menuItem.sort_order || 0;

        // Modifier groups if included
        if (menuItem.modifier_groups) {
            this.modifier_groups = menuItem.modifier_groups;
        }

        // Timestamps
        this.created_at = menuItem.created_at;
        this.updated_at = menuItem.updated_at;
    }
}

module.exports = MenuDTO;

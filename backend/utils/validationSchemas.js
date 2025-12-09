const { z } = require('zod');

const createEmployeeSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    restaurant_id: z.coerce.number().int().positive('Restaurant ID is required')
});

const createReservationSchema = z.object({
    restaurant_id: z.coerce.number().int().positive(),
    table_id: z.coerce.number().optional().nullable(),
    customer_name: z.string().min(1),
    customer_phone: z.string().optional().nullable(),
    customer_email: z.string().email().optional().nullable(),
    party_size: z.coerce.number().int().positive(),
    reservation_date: z.string().datetime({ offset: false }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)), // Allow YYYY-MM-DD
    reservation_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format (HH:MM)'),
    special_requests: z.string().optional().nullable()
});

const createOrderSchema = z.object({
    restaurant_id: z.coerce.number().int().positive('Restaurant ID is required'),
    table_id: z.coerce.number().int().positive().optional().nullable(),
    items: z.array(z.object({
        menu_item_id: z.coerce.number().int().positive(),
        quantity: z.coerce.number().int().min(1),
        special_instructions: z.string().optional()
    })).min(1, 'At least one item is required'),
    order_type: z.enum(['dine-in', 'pre-order', 'walk-in', 'takeout']).default('dine-in'),
    customer_notes: z.string().optional(),
    scheduled_for: z.string().datetime({ offset: false }).optional().nullable(),
    reservation_id: z.coerce.number().int().positive().optional().nullable(),
    payment_status: z.enum(['pending', 'completed', 'failed']).optional(),
    payment_method: z.string().optional(),
    payment_intent_id: z.string().optional(),
    payment_amount: z.coerce.number().nonnegative().optional(),
    tip_amount: z.coerce.number().nonnegative().optional()
});

const createMenuItemSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    price: z.coerce.number().positive('Price must be positive'),
    category: z.string().min(1, 'Category is required'),
    category_id: z.coerce.number().int().positive().optional().nullable(),
    image_url: z.string().url().optional().nullable().or(z.literal('')),
    available: z.boolean().optional().default(true),
    restaurant_id: z.coerce.number().int().positive('Restaurant ID is required'),
    // Enhanced fields
    dietary_tags: z.array(z.string()).optional().default([]),
    allergens: z.array(z.string()).optional().default([]),
    calories: z.coerce.number().int().nonnegative().optional().nullable(),
    prep_time_minutes: z.coerce.number().int().nonnegative().optional().nullable(),
    spice_level: z.coerce.number().int().min(0).max(5).optional().nullable(),
    is_featured: z.boolean().optional().default(false),
    is_new: z.boolean().optional().default(false),
    sort_order: z.coerce.number().int().optional().default(0),
    modifier_group_ids: z.array(z.coerce.number().int().positive()).optional()
});

const createTableSchema = z.object({
    table_number: z.coerce.number().int(),
    capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1'),
    min_capacity: z.coerce.number().int().min(1).optional().default(1),
    status: z.enum(['available', 'occupied', 'reserved', 'unavailable', 'out-of-service']).optional().default('available'),
    restaurant_id: z.coerce.number().int().positive('Restaurant ID is required'),
    section: z.string().optional().nullable(),
    shape: z.enum(['square', 'round', 'rectangle', 'booth']).optional().default('square'),
    notes: z.string().optional().nullable(),
    is_accessible: z.boolean().optional().default(false)
});

const updateRestaurantSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    cuisine_type: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    opening_hours: z.any().optional(),
    status: z.enum(['active', 'inactive', 'closed', 'archived']).optional(),
    latitude: z.coerce.number().optional(),
    longitude: z.coerce.number().optional(),
    logo_url: z.string().optional().nullable(),
    cover_image_url: z.string().optional().nullable(),
    // Enhanced service fields
    service_types: z.array(z.string()).optional(),
    accepts_reservations: z.boolean().optional(),
    accepts_online_orders: z.boolean().optional(),
    delivery_radius_km: z.coerce.number().nonnegative().optional().nullable(),
    minimum_order_amount: z.coerce.number().nonnegative().optional().nullable(),
    delivery_fee: z.coerce.number().nonnegative().optional().nullable(),
    estimated_prep_time_minutes: z.coerce.number().int().nonnegative().optional().nullable(),
    tax_rate: z.coerce.number().min(0).max(100).optional().nullable(),
    service_charge_percent: z.coerce.number().min(0).max(100).optional().nullable(),
    website_url: z.string().url().optional().nullable().or(z.literal('')),
    social_media: z.object({
        instagram: z.string().optional().nullable(),
        facebook: z.string().optional().nullable(),
        twitter: z.string().optional().nullable()
    }).optional().nullable()
});

module.exports = {
    createEmployeeSchema,
    createReservationSchema,
    createOrderSchema,
    createMenuItemSchema,
    createTableSchema,
    updateRestaurantSchema
};

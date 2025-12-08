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

module.exports = {
    createEmployeeSchema,
    createReservationSchema
};

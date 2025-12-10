/**
 * Reservation Routes
 * API endpoints for managing table reservations
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const { createReservationSchema } = require('../utils/validationSchemas');
const reservationController = require('../controllers/reservation.controller');

/**
 * POST /api/reservations
 * Create a new reservation (legacy / tentative flow)
 *
 * Note: For new integrations that require "no reservation without payment",
 * prefer the intent-based flow:
 *   - POST /api/reservations/intent
 *   - POST /api/payments/create-intent
 *   - POST /api/payments/confirm (with reservationIntent)
 * which only creates a real reservation row after payment succeeds.
 */


/**
 * POST /api/reservations
 * Create a new tentative reservation
 */
/**
 * @swagger
 * tags:
 *   name: Reservations
 *   description: Reservation management
 */

/**
 * @swagger
 * /reservations:
 *   post:
 *     summary: Create a new reservation
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reservation_date
 *               - party_size
 *             properties:
 *               restaurant_id:
 *                 type: integer
 *               reservation_date:
 *                 type: string
 *               party_size:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Reservation created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.post('/', authenticateToken, validate(createReservationSchema), reservationController.create);

/**
 * POST /api/reservations/:id/confirm
 * Confirm a tentative reservation after successful payment
 */
router.post('/:id/confirm', authenticateToken, reservationController.confirm);

/**
 * POST /api/reservations/intent
 * Create a reservation intent WITHOUT inserting into the reservations table.
 *
 * Body: {
 *   restaurant_id, table_id, customer_name, customer_phone,
 *   customer_email, party_size, reservation_date, reservation_time,
 *   special_requests
 * }
 *
 * Returns: { intentToken, expiresAt }
 * The client must pass this token to /api/payments/confirm, which will
 * atomically create a confirmed reservation after successful payment.
 */
/**
 * POST /api/reservations/intent
 * Create a reservation intent
 */
router.post('/intent', authenticateToken, reservationController.createIntent);

/**
 * POST /api/reservations/intent/verify
 * Verify a reservation intent
 */
router.post('/intent/verify', reservationController.checkIntent);

/**
 * GET /api/reservations/me
 * Returns reservations for the authenticated user
 */
router.get('/me', authenticateToken, reservationController.getMe);

/**
 * GET /api/reservations/:id
 * Get a specific reservation by ID
 */
router.get('/:id', reservationController.get);

/**
 * GET /api/reservations
 * Get all reservations with filters
 */
router.get('/', reservationController.list);

/**
 * PATCH /api/reservations/:id/status
 * Update reservation status
 */
router.patch('/:id/status', reservationController.updateStatus);

/**
 * DELETE /api/reservations/:id
 * Cancel a reservation
 */
router.delete('/:id', reservationController.cancel);

/**
 * POST /api/reservations/:id/verify
 * Verify reservation is still valid before payment (CRITICAL FLOW PER FLOWCHART)
 */
router.post('/:id/verify', reservationController.verify);


/**
 * POST /api/reservations/:id/checkin
 * Customer marks "I'm Here" - triggers kitchen to start preparing pre-order
 */
router.post('/:id/checkin', reservationController.checkIn);

/**
 * GET /api/reservations/restaurant/:restaurant_id/today
 * Get today's reservations for a specific restaurant
 */
router.get('/restaurant/:restaurant_id/today', reservationController.getToday);



module.exports = router;

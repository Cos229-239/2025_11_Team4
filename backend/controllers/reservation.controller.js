const reservationService = require('../services/reservation.service');
const ReservationDTO = require('../dtos/reservation.dto');
const logger = require('../utils/logger');
const { pool } = require('../config/database');
const { sendEmail } = require('../utils/email.service');
const { reservationCreated } = require('../utils/email.templates');
const { buildReservationICS } = require('../utils/ics');

class ReservationController {

    async create(req, res) {
        try {
            const user_id = req.user.sub;
            const { reservation, expiresAt } = await reservationService.createTentative(req.body, user_id);

            const { customer_email, restaurant_id } = req.body;

            // Fire-and-forget email (Controller responsibility: Orchestrating response + side effects like email that don't block DB)
            if (customer_email) {
                pool.query('SELECT name, address FROM restaurants WHERE id = $1', [restaurant_id])
                    .then(rest => {
                        const restaurant = rest.rows[0];
                        const tmpl = reservationCreated({ reservation, restaurant });
                        const ics = buildReservationICS({ reservation, restaurant });
                        sendEmail({
                            to: customer_email,
                            subject: tmpl.subject,
                            text: tmpl.text,
                            html: tmpl.html,
                            attachments: ics ? [{ filename: ics.filename, content: ics.content, contentType: ics.contentType }] : undefined
                        });
                    })
                    .catch(e => logger.warn('Email dispatch error', { error: e.message }));
            }

            res.status(201).json({
                success: true,
                message: 'Tentative reservation created. Complete payment within 15 minutes to confirm.',
                data: new ReservationDTO(reservation),
                expiresIn: '15 minutes',
                expiresAt: expiresAt.toISOString()
            });

        } catch (error) {
            logger.error('Error in create reservation controller', { error });
            const status = error.status || 500;
            res.status(status).json({
                success: false,
                message: error.message || 'Failed to create reservation',
                error: error.status ? undefined : error.message
            });
        }
    }

    async confirm(req, res) {
        try {
            const { id } = req.params;
            const user_id = req.user.sub;
            const { payment_id, restaurant_id } = req.body || {};

            if (!payment_id) {
                return res.status(400).json({ success: false, message: 'payment_id is required' });
            }

            const { updated, alreadyConfirmed } = await reservationService.confirmReservation(id, user_id, payment_id, restaurant_id);

            if (alreadyConfirmed) {
                return res.json({ success: true, message: 'Already confirmed', data: new ReservationDTO(updated), alreadyConfirmed: true });
            }

            res.json({ success: true, message: 'Reservation confirmed', data: new ReservationDTO(updated) });

        } catch (error) {
            logger.error('Error in confirm reservation controller', { error });
            const status = error.status || 500;
            res.status(status).json({
                success: false,
                message: error.message || 'Failed to confirm reservation',
                error: error.status ? undefined : error.message
            });
        }
    }

    async get(req, res) {
        try {
            const { id } = req.params;
            const reservation = await reservationService.getReservationById(id);
            res.json({ success: true, data: new ReservationDTO(reservation) });
        } catch (error) {
            logger.error('Error fetching reservation', { error });
            res.status(error.status || 500).json({ success: false, message: error.message });
        }
    }

    async getMe(req, res) {
        try {
            const user_id = req.user.sub;
            const reservations = await reservationService.getUserReservations(user_id);
            res.json({ success: true, data: reservations.map(r => new ReservationDTO(r)), count: reservations.length });
        } catch (error) {
            logger.error('Error fetching user reservations', { error });
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async list(req, res) {
        try {
            const filters = req.query;
            const reservations = await reservationService.listReservations(filters);
            res.json({ success: true, data: reservations.map(r => new ReservationDTO(r)), count: reservations.length });
        } catch (error) {
            logger.error('Error listing reservations', { error });
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async updateStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const result = await reservationService.updateStatus(id, status);
            res.json({ success: true, message: 'Status updated', data: new ReservationDTO(result) });
        } catch (error) {
            logger.error('Error updating status', { error });
            res.status(error.status || 500).json({ success: false, message: error.message });
        }
    }

    async createIntent(req, res) {
        try {
            const user_id = req.user.sub;
            const result = await reservationService.createIntent(req.body, user_id);
            res.json({
                success: true,
                message: 'Reservation intent created. Complete payment within 15 minutes to confirm.',
                data: result
            });
        } catch (error) {
            logger.error('Error creating intent', { error });
            res.status(error.status || 500).json({ success: false, message: error.message });
        }
    }

    async checkIntent(req, res) {
        try {
            const { intentToken } = req.body;
            const result = await reservationService.verifyIntent(intentToken);
            res.json({ success: true, message: 'Valid intent', data: result });
        } catch (error) {
            const status = error.status || 400;
            res.status(status).json({ success: false, code: error.code, message: error.message });
        }
    }
    async verify(req, res) {
        try {
            const { id } = req.params;
            const { restaurant_id } = req.body;
            // Measure performance start
            const startTime = Date.now();

            const result = await reservationService.verifyReservationAvailability(id, restaurant_id);

            const verificationTime = `${Date.now() - startTime}ms`;
            res.json({
                success: true,
                message: 'Reservation is available. Proceed to payment.',
                data: new ReservationDTO(result.reservation),
                alreadyConfirmed: result.alreadyConfirmed,
                verificationTime
            });
        } catch (error) {
            logger.error('Error verifying reservation', { error });
            res.status(error.status || 500).json({
                success: false,
                code: error.code,
                message: error.message,
                conflictingReservation: error.conflictingReservation,
                expiredAt: error.expiresAt ? error.expiresAt.toISOString() : undefined,
                expiredMinutesAgo: error.expiredMinutesAgo
            });
        }
    }

    async checkIn(req, res) {
        try {
            const { id } = req.params;
            const io = req.app.get('io');
            const { reservation, kitchenNotified } = await reservationService.checkInReservation(id, io);

            res.json({
                success: true,
                message: 'Checked in successfully',
                data: { reservation: new ReservationDTO(reservation), kitchenNotified }
            });
        } catch (error) {
            logger.error('Error checking in', { error });
            res.status(error.status || 500).json({ success: false, message: error.message });
        }
    }

    async getToday(req, res) {
        try {
            const { restaurant_id } = req.params;
            const { reservations, date } = await reservationService.getTodayReservations(restaurant_id);
            res.json({ success: true, data: reservations.map(r => new ReservationDTO(r)), count: reservations.length, date });
        } catch (error) {
            logger.error('Error fetching today reservations', { error });
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async cancel(req, res) {
        try {
            const { id } = req.params;
            const result = await reservationService.updateStatus(id, 'cancelled');
            res.json({ success: true, message: 'Reservation cancelled successfully', data: new ReservationDTO(result) });
        } catch (error) {
            logger.error('Error cancelling reservation', { error });
            res.status(error.status || 500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new ReservationController();

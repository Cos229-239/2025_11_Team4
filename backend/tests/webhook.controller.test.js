const request = require('supertest');
const express = require('express');

// Mock dependencies
const mockConstructEvent = jest.fn();
const mockConfirmPaymentLogic = jest.fn();

jest.mock('stripe', () => {
    return jest.fn(() => ({
        webhooks: {
            constructEvent: mockConstructEvent
        }
    }));
});

jest.mock('../services/payment.service', () => ({
    confirmPaymentLogic: mockConfirmPaymentLogic
}));

const webhookController = require('../controllers/webhook.controller');

const app = express();
// Use raw body parser for webhook route as in server.js
app.post('/api/webhook', express.raw({ type: 'application/json' }), webhookController.handleStripeWebhook);

describe('Webhook Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should handle payment_intent.succeeded event', async () => {
        const event = {
            type: 'payment_intent.succeeded',
            data: {
                object: {
                    id: 'pi_test_123',
                    metadata: { reservationId: '10' }
                }
            }
        };

        mockConstructEvent.mockReturnValue(event);
        mockConfirmPaymentLogic.mockResolvedValue({ success: true });

        const res = await request(app)
            .post('/api/webhook')
            .set('Stripe-Signature', 'test_sig')
            .set('Content-Type', 'application/json')
            .send(JSON.stringify(event)); // Send as string to simulate raw body if parser handles it, but supertest sends json by default. 
        // Actually, with express.raw, we should send a buffer or string.

        expect(res.statusCode).toBe(200);
        expect(res.body.received).toBe(true);
        expect(mockConfirmPaymentLogic).toHaveBeenCalledWith({
            paymentIntentId: 'pi_test_123',
            paymentStatus: 'succeeded',
            reservationId: 10,
            reservationIntent: undefined,
            userId: null
        });
    });

    it('should return 400 for invalid signature', async () => {
        mockConstructEvent.mockImplementation(() => {
            throw new Error('Invalid signature');
        });

        const res = await request(app)
            .post('/api/webhook')
            .set('Stripe-Signature', 'invalid_sig')
            .send({});

        expect(res.statusCode).toBe(400);
        expect(res.text).toContain('Webhook Error: Invalid signature');
    });
});

const request = require('supertest');
const express = require('express');

// Mock dependencies
const mockCreate = jest.fn();
const mockRetrieve = jest.fn();
const mockRefund = jest.fn();

jest.mock('stripe', () => {
    return jest.fn(() => ({
        paymentIntents: {
            create: mockCreate,
            retrieve: mockRetrieve
        },
        refunds: {
            create: mockRefund
        }
    }));
});

// Mock database pool
const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockConnect = jest.fn();

jest.mock('../config/database', () => ({
    pool: {
        connect: mockConnect
    }
}));

// Mock Payment Service
const mockConfirmPaymentLogic = jest.fn();
jest.mock('../services/payment.service', () => ({
    confirmPaymentLogic: mockConfirmPaymentLogic
}));

// Initialize mocks
mockCreate.mockResolvedValue({
    id: 'pi_test_123',
    client_secret: 'secret_test_123',
    amount: 1000,
    status: 'pending'
});
mockRetrieve.mockResolvedValue({
    id: 'pi_test_123',
    status: 'succeeded'
});
mockRefund.mockResolvedValue({
    id: 're_test_123',
    status: 'succeeded'
});
mockConnect.mockResolvedValue({
    query: mockQuery,
    release: mockRelease
});
mockConfirmPaymentLogic.mockResolvedValue({
    success: true,
    data: { status: 'succeeded' }
});

// Require controller AFTER mocks are defined
const paymentController = require('../controllers/payment.controller');

// Setup Express app for testing
const app = express();
app.use(express.json());
app.post('/api/payments/create-intent', paymentController.createPaymentIntent);
app.post('/api/payments/confirm', paymentController.confirmPayment);

describe('Payment Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset default mock implementations if needed
        mockConnect.mockResolvedValue({
            query: mockQuery,
            release: mockRelease
        });
        mockConfirmPaymentLogic.mockResolvedValue({
            success: true,
            data: { status: 'succeeded' }
        });
    });

    describe('POST /api/payments/create-intent', () => {
        it('should create a payment intent successfully', async () => {
            // Mock DB response for menu item price
            mockQuery.mockResolvedValueOnce({
                rows: [{ price: '10.00' }] // $10.00
            });

            const res = await request(app)
                .post('/api/payments/create-intent')
                .send({
                    items: [{ id: 1, quantity: 1 }]
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.clientSecret).toBe('secret_test_123');
            expect(res.body.amount).toBe(10); // 1000 cents = $10
        });

        it('should return 400 if no items provided', async () => {
            const res = await request(app)
                .post('/api/payments/create-intent')
                .send({ items: [] });

            expect(res.statusCode).toBe(400);
        });
    });

    describe('POST /api/payments/confirm', () => {
        it('should confirm payment successfully via service', async () => {
            const res = await request(app)
                .post('/api/payments/confirm')
                .send({
                    paymentIntentId: 'pi_test_123'
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(mockConfirmPaymentLogic).toHaveBeenCalledWith(expect.objectContaining({
                paymentIntentId: 'pi_test_123',
                paymentStatus: 'succeeded'
            }));
        });

        it('should return 400 if paymentIntentId is missing', async () => {
            const res = await request(app)
                .post('/api/payments/confirm')
                .send({});

            expect(res.statusCode).toBe(400);
        });
    });
});

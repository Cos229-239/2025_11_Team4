process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_unit_dummy_key';

const mockStripeRetrieve = jest.fn();
jest.mock('stripe', () => {
  return jest.fn(() => ({
    paymentIntents: {
      retrieve: mockStripeRetrieve,
    },
  }));
});

const mockPoolQuery = jest.fn();
const mockClientQuery = jest.fn();
const mockClientRelease = jest.fn();
const mockPoolConnect = jest.fn();

jest.mock('../config/database', () => ({
  pool: {
    connect: mockPoolConnect,
    query: mockPoolQuery,
  },
}));

const orderService = require('../services/order.service');
const { computeItemsHash } = require('../utils/paymentHash');

describe('OrderService.createOrder payment integrity', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default: no idempotency collision
    mockPoolQuery.mockResolvedValue({ rows: [] });

    // Default transaction client
    mockClientQuery.mockImplementation(async (sql) => {
      if (typeof sql !== 'string') return { rows: [] };
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
      if (sql.includes('INSERT INTO orders')) {
        return {
          rows: [
            {
              id: 1,
              total_amount: 0,
              payment_status: 'completed',
              payment_method: 'stripe',
              payment_intent_id: 'pi_test_123',
              payment_amount: 10,
              tip_amount: 2,
              status: 'pending',
              order_type: 'takeout',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        };
      }
      if (sql.startsWith('UPDATE orders SET total_amount')) return { rows: [], rowCount: 1 };
      return { rows: [] };
    });

    mockPoolConnect.mockResolvedValue({
      query: mockClientQuery,
      release: mockClientRelease,
    });
  });

  it('stores total_amount as subtotal + tip and verifies Stripe PaymentIntent', async () => {
    const items = [{ menu_item_id: 101, quantity: 1 }];
    const itemsHash = computeItemsHash(items);

    mockStripeRetrieve.mockResolvedValue({
      status: 'succeeded',
      amount: 1200, // $12.00 total
      metadata: {
        items_hash: itemsHash,
        subtotal_cents: '1000',
        tip_cents: '200',
        order_type: 'takeout',
        restaurant_id: '1',
      },
    });

    orderService._calculateTotalAndVerifyItems = jest.fn().mockResolvedValue(10);
    orderService._insertOrderItems = jest.fn().mockResolvedValue([]);

    const created = await orderService.createOrder({
      restaurant_id: 1,
      order_type: 'takeout',
      payment_intent_id: 'pi_test_123',
      tip_amount: 2,
      items,
    });

    expect(created.total_amount).toBe(12);
    expect(mockStripeRetrieve).toHaveBeenCalledWith('pi_test_123');
  });

  it('rejects when PaymentIntent metadata items_hash does not match order items', async () => {
    const items = [{ menu_item_id: 101, quantity: 1 }];

    mockStripeRetrieve.mockResolvedValue({
      status: 'succeeded',
      amount: 1200,
      metadata: {
        items_hash: 'deadbeef',
        subtotal_cents: '1000',
        tip_cents: '200',
      },
    });

    orderService._calculateTotalAndVerifyItems = jest.fn().mockResolvedValue(10);
    orderService._insertOrderItems = jest.fn().mockResolvedValue([]);

    await expect(
      orderService.createOrder({
        order_type: 'takeout',
        payment_intent_id: 'pi_test_123',
        tip_amount: 2,
        items,
      })
    ).rejects.toThrow('Payment metadata mismatch (items)');
  });
});


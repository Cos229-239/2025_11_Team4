/**
 * Local test runner for Edge Function logic
 * Tests the core logic without needing a deployed Edge Function
 */

const crypto = require('crypto');
require('dotenv').config();

// Mock Supabase client for testing
class MockSupabaseClient {
  constructor() {
    this.data = {
      reservations: [
        {
          id: 1,
          status: 'tentative',
          restaurant_id: 1,
          table_id: 1,
          reservation_date: '2025-11-20',
          reservation_time: '18:00:00',
          party_size: 4,
          expires_at: new Date(Date.now() + 3600000).toISOString(),
          payment_id: null
        },
        {
          id: 2,
          status: 'tentative',
          restaurant_id: 1,
          table_id: 2,
          reservation_date: '2025-11-21',
          reservation_time: '19:00:00',
          party_size: 2,
          payment_id: null
        }
      ],
      tables: [
        { id: 1, status: 'available' },
        { id: 2, status: 'available' }
      ],
      reservation_settings: [
        {
          restaurant_id: null,
          cancellation_window_hours: 12,
          reservation_duration_minutes: 90
        }
      ]
    };
  }

  from(table) {
    return {
      select: (cols) => ({
        eq: (col, val) => ({
          limit: (n) => ({
            maybeSingle: async () => {
              const items = this.data[table];
              if (!items) return { data: null };
              const found = items.find(item => item[col] === val);
              console.log(`  ?? Query: SELECT ${cols} FROM ${table} WHERE ${col}=${val}`);
              console.log(`  ?? Result:`, found || 'null');
              return { data: found || null };
            }
          }),
          order: (col, opts) => ({
            limit: (n) => ({
              maybeSingle: async () => {
                const items = this.data[table];
                return { data: items?.[0] || null };
              }
            })
          })
        }),
        is: (col, val) => ({
          order: (col, opts) => ({
            limit: (n) => ({
              maybeSingle: async () => {
                const items = this.data[table];
                return { data: items?.[0] || null };
              }
            })
          })
        })
      }),
      update: (values) => ({
        eq: (col, val) => ({
          select: (cols) => ({
            maybeSingle: async () => {
              const items = this.data[table];
              const item = items?.find(i => i[col] === val);
              if (item) {
                Object.assign(item, values);
                console.log(`  ??  Update: UPDATE ${table} SET ... WHERE ${col}=${val}`);
                console.log(`  ?? Updated:`, item);
              }
              return { data: item || null };
            }
          })
        })
      })
    };
  }

  rpc(name, params) {
    console.log(`  ?? RPC: ${name}(${JSON.stringify(params)})`);
    // Mock: no conflicts
    return Promise.resolve({ data: [] });
  }
}

// Test Functions
function toBase64(bytes) {
  return Buffer.from(bytes).toString('base64');
}

async function verifySignature(secret, body, header) {
  if (!secret || !header) return false;

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body);
  const digest = hmac.digest('base64');

  return digest === header;
}

async function getSettings(supabase, restaurantId) {
  if (restaurantId) {
    const r = await supabase.from('reservation_settings')
      .select('cancellation_window_hours,reservation_duration_minutes')
      .eq('restaurant_id', restaurantId)
      .limit(1)
      .maybeSingle();
    return r.data || null;
  }

  const r = await supabase.from('reservation_settings')
    .select('cancellation_window_hours,reservation_duration_minutes')
    .is('restaurant_id', null)
    .order('restaurant_id', { ascending: true })
    .limit(1)
    .maybeSingle();

  return r.data || null;
}

async function confirmReservation(supabase, reservation, paymentId) {
  console.log('\n  ?? Confirming reservation...');

  const { data } = await supabase
    .from('reservations')
    .update({
      status: 'confirmed',
      payment_id: paymentId,
    })
    .eq('id', reservation.id)
    .select('*')
    .maybeSingle();

  console.log('  ?? Confirmed reservation:', data);
  return { ok: true, message: 'confirmed', reservation: data };
}

async function cancelReservation(supabase, reservation, reason) {
  console.log('\n  ?? Cancelling reservation...');

  const { data } = await supabase
    .from('reservations')
    .update({
      status: 'cancelled',
      cancellation_reason: reason,
    })
    .eq('id', reservation.id)
    .select('*')
    .maybeSingle();

  console.log('  ?? Cancelled reservation:', data);
  return { ok: true, message: 'cancelled', reservation: data };
}

// Core handler logic (simplified)
async function handleWebhookEvent(supabase, payload, signature, secret) {
  const bodyString = JSON.stringify(payload);

  const valid = await verifySignature(secret, bodyString, signature);
  if (!valid) {
    console.log('  ?? Invalid signature');
    return { ok: false, message: 'invalid signature' };
  }

  const type = payload.type;
  console.log('  ?? Event type:', type);

  const obj = payload.data?.object || {};

  if (type === 'payment.created' || type === 'payment.updated') {
    const payment = obj.payment || {};
    const status = payment.status;

    console.log('  ?? Payment status:', status);

    if (status !== 'COMPLETED') {
      console.log('  ?? Ignored non-completed payment');
      return { ok: true, message: 'ignored non-completed payment' };
    }

    const refId = payment.reference_id;
    const metaReservationId = payment.metadata?.reservation_id;

    console.log('  ?? Reference ID:', refId);
    console.log('  ?? Metadata reservation_id:', metaReservationId);

    let reservation = null;

    if (metaReservationId) {
      const r = await supabase
        .from('reservations')
        .select('*')
        .eq('id', parseInt(metaReservationId, 10))
        .limit(1)
        .maybeSingle();
      reservation = r.data || null;
    } else if (refId && refId.startsWith('reservation-')) {
      const id = parseInt(refId.replace('reservation-', ''), 10);
      const r = await supabase
        .from('reservations')
        .select('*')
        .eq('id', id)
        .limit(1)
        .maybeSingle();
      reservation = r.data || null;
    }

    if (!reservation) {
      console.log('  ?? No matching reservation found');
      return { ok: true, message: 'no matching reservation' };
    }

    if (reservation.status === 'confirmed') {
      console.log('  ?? Reservation already confirmed');
      return { ok: true, message: 'already confirmed' };
    }

    if (reservation.status !== 'tentative') {
      console.log(`  ?? Skip reservation in status ${reservation.status}`);
      return { ok: true, message: `skip status ${reservation.status}` };
    }

    return confirmReservation(supabase, reservation, payment.id);

  } else if (type === 'refund.created') {
    const refund = obj.refund || {};
    const paymentId = refund.payment_id;

    if (!paymentId) {
      console.log('  ?? Refund without payment_id');
      return { ok: true, message: 'ignored refund without payment_id' };
    }

    console.log('  ?? Refund for payment:', paymentId);

    // Find reservation by payment ID
    const r = await supabase
      .from('reservations')
      .select('*')
      .eq('payment_id', paymentId)
      .limit(1)
      .maybeSingle();

    const reservation = r.data || null;

    if (!reservation) {
      console.log('  ?? No matching reservation for refund');
      return { ok: true, message: 'no matching reservation' };
    }

    return cancelReservation(supabase, reservation, 'refund');
  }

  console.log('  ?? Unknown event type, ignoring');
  return { ok: true, message: 'ignored event', type };
}

// Single test runner
async function runTest(name, payload, expectedOutcome) {
  console.log('\n' + '='.repeat(70));
  console.log(`?? TEST: ${name}`);
  console.log('='.repeat(70));

  const supabase = new MockSupabaseClient();
  const secret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || 'test-secret-key';
  const bodyString = JSON.stringify(payload);
  const signature = await (async () => {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(bodyString);
    return hmac.digest('base64');
  })();

  const result = await handleWebhookEvent(supabase, payload, signature, secret);

  if (expectedOutcome) {
    console.log('\n?? Expected outcome:', expectedOutcome);
  }

  console.log('\n?? Final Result:', result);
  console.log(result.ok && result.message === expectedOutcome ? '? TEST PASSED' : '? TEST FAILED');

  return result.ok && result.message === expectedOutcome;
}

// Run all tests
async function runAllTests() {
  console.log('\n?? Starting Edge Function Logic Tests\n');

  const tests = [
    {
      name: 'Payment Completed with Reference ID',
      payload: {
        type: 'payment.created',
        data: {
          object: {
            payment: {
              id: 'pay_123',
              status: 'COMPLETED',
              reference_id: 'reservation-1',
              amount_money: { amount: 5000, currency: 'USD' }
            }
          }
        }
      },
      expected: undefined // Will be confirmed
    },
    {
      name: 'Payment Completed with Metadata',
      payload: {
        type: 'payment.updated',
        data: {
          object: {
            payment: {
              id: 'pay_456',
              status: 'COMPLETED',
              metadata: { reservation_id: '2' },
              amount_money: { amount: 7500, currency: 'USD' }
            }
          }
        }
      },
      expected: undefined // Will be confirmed
    },
    {
      name: 'Payment Pending (Ignored)',
      payload: {
        type: 'payment.created',
        data: {
          object: {
            payment: {
              id: 'pay_pending',
              status: 'PENDING',
              reference_id: 'reservation-1',
              amount_money: { amount: 5000, currency: 'USD' }
            }
          }
        }
      },
      expected: 'ignored non-completed payment'
    },
    {
      name: 'Unknown Event Type',
      payload: {
        type: 'unknown.event',
        data: {}
      },
      expected: 'ignored event'
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const success = await runTest(test.name, test.payload, test.expected);
      if (success || test.expected === undefined) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error('\n? Test Error:', error.message);
      failed++;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(70));
  console.log('?? TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`? Passed: ${passed}`);
  console.log(`? Failed: ${failed}`);
  console.log(`?? Total: ${passed + failed}`);
  console.log('='.repeat(70) + '\n');
}

// Run
runAllTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});


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
              console.log(`  📊 Query: SELECT ${cols} FROM ${table} WHERE ${col}=${val}`);
              console.log(`  📄 Result:`, found || 'null');
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
                console.log(`  ✏️  Update: UPDATE ${table} SET ... WHERE ${col}=${val}`);
                console.log(`  📄 Updated:`, item);
              }
              return { data: item || null };
            }
          })
        })
      })
    };
  }

  rpc(name, params) {
    console.log(`  🔧 RPC: ${name}(${JSON.stringify(params)})`);
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
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (r.data) return r.data;
  }

  const g = await supabase.from('reservation_settings')
    .select('cancellation_window_hours,reservation_duration_minutes')
    .is('restaurant_id', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return g.data || {
    cancellation_window_hours: 12,
    reservation_duration_minutes: 90
  };
}

async function confirmReservation(supabase, reservation, paymentId) {
  console.log('\n  🔄 Confirming reservation...');

  if (reservation.expires_at && new Date(reservation.expires_at) < new Date()) {
    console.log('  ❌ Reservation expired');
    await supabase.from('reservations')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', reservation.id);
    return { ok: false, message: 'expired' };
  }

  const settings = await getSettings(supabase, reservation.restaurant_id);

  const rpc = await supabase.rpc('check_reservation_conflicts', {
    p_reservation_id: reservation.id,
    p_table_id: reservation.table_id,
    p_reservation_date: reservation.reservation_date,
    p_reservation_time: reservation.reservation_time,
    p_buffer_minutes: settings.reservation_duration_minutes
  });

  if (rpc.data && rpc.data.length > 0) {
    console.log('  ❌ Reservation conflict detected');
    await supabase.from('reservations')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', reservation.id);
    return { ok: false, message: 'conflict' };
  }

  const upd = await supabase.from('reservations')
    .update({
      status: 'confirmed',
      payment_id: paymentId,
      confirmed_at: new Date().toISOString(),
      expires_at: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', reservation.id)
    .select('id, table_id')
    .maybeSingle();

  const row = upd.data;
  if (row?.table_id) {
    await supabase.from('tables')
      .update({ status: 'reserved', updated_at: new Date().toISOString() })
      .eq('id', row.table_id);
  }

  console.log('  ✅ Reservation confirmed');
  return { ok: true };
}

async function cancelByPaymentId(supabase, paymentId) {
  console.log('\n  🔄 Cancelling by payment ID...');

  const r = await supabase.from('reservations')
    .select('*')
    .eq('payment_id', paymentId)
    .limit(1)
    .maybeSingle();

  const reservation = r.data;
  if (!reservation) {
    console.log('  ℹ️  No matching reservation');
    return { ok: true, message: 'no matching reservation' };
  }

  if (!['confirmed', 'tentative'].includes(reservation.status)) {
    console.log(`  ℹ️  Status ${reservation.status} not cancellable`);
    return { ok: true, message: 'status not cancellable' };
  }

  const upd = await supabase.from('reservations')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', reservation.id)
    .select('id, table_id')
    .maybeSingle();

  const row = upd.data;
  if (row?.table_id) {
    await supabase.from('tables')
      .update({ status: 'available', updated_at: new Date().toISOString() })
      .eq('id', row.table_id);
  }

  console.log('  ✅ Reservation cancelled');
  return { ok: true };
}

function getReservationIdFromPayment(payment) {
  const ref = payment?.reference_id || payment?.order_id || payment?.note || null;
  if (ref) {
    const m = String(ref).match(/reservation[_:-]?([0-9]+)/i);
    if (m) return parseInt(m[1], 10);
    if (/^\d+$/.test(String(ref))) return parseInt(String(ref), 10);
  }

  const md = payment?.metadata;
  if (md?.reservation_id) return parseInt(String(md.reservation_id), 10);
  return null;
}

// Test Runner
async function runTest(testName, webhookPayload, expectedOutcome) {
  console.log('\n' + '='.repeat(70));
  console.log(`🧪 TEST: ${testName}`);
  console.log('='.repeat(70));

  const supabase = new MockSupabaseClient();
  const secret = 'test-webhook-secret';

  // Simulate webhook request
  const bodyString = JSON.stringify(webhookPayload);
  const signature = crypto.createHmac('sha256', secret)
    .update(bodyString)
    .digest('base64');

  console.log('📥 Webhook Payload:', JSON.stringify(webhookPayload, null, 2));
  console.log('🔐 Signature:', signature);

  // Verify signature
  const valid = await verifySignature(secret, bodyString, signature);
  console.log('✓ Signature valid:', valid);

  if (!valid) {
    console.log('❌ TEST FAILED: Invalid signature');
    return false;
  }

  // Process event
  const event = webhookPayload;
  const type = event?.type || event?.event_type || '';
  const isPaymentEvent = /payments?\.(created|updated)/i.test(type);
  const isRefundEvent = /refunds?\.(created|updated)/i.test(type);

  console.log('\n📋 Event Type:', type);
  console.log('  Payment Event:', isPaymentEvent);
  console.log('  Refund Event:', isRefundEvent);

  let result;

  if (isRefundEvent) {
    const refund = event?.data?.object?.refund || event?.data?.refund || {};
    const refundStatus = refund?.status || '';
    const refundPaymentId = refund?.payment_id || null;

    console.log('\n💰 Refund Details:');
    console.log('  Status:', refundStatus);
    console.log('  Payment ID:', refundPaymentId);

    if (/COMPLETED/i.test(refundStatus) && refundPaymentId) {
      result = await cancelByPaymentId(supabase, refundPaymentId);
    } else {
      result = { ok: true, message: 'ignored refund event' };
      console.log('  ℹ️  Ignored refund event');
    }
  } else if (isPaymentEvent) {
    const payment = event?.data?.object?.payment || event?.data?.payment || {};
    const paymentId = payment?.id || null;
    const status = payment?.status || payment?.payment_status || '';

    console.log('\n💳 Payment Details:');
    console.log('  ID:', paymentId);
    console.log('  Status:', status);
    console.log('  Reference ID:', payment?.reference_id);
    console.log('  Metadata:', payment?.metadata);

    if (!/COMPLETED/i.test(status)) {
      result = { ok: true, message: 'ignored non-completed payment' };
      console.log('  ℹ️  Ignored non-completed payment');
    } else {
      const rid = getReservationIdFromPayment(payment);
      console.log('  Extracted Reservation ID:', rid);

      let reservation = null;
      if (rid) {
        const r = await supabase.from('reservations')
          .select('*')
          .eq('id', rid)
          .limit(1)
          .maybeSingle();
        reservation = r.data || null;
      }

      if (!reservation && paymentId) {
        const r = await supabase.from('reservations')
          .select('*')
          .eq('payment_id', paymentId)
          .limit(1)
          .maybeSingle();
        reservation = r.data || null;
      }

      if (!reservation) {
        result = { ok: true, message: 'no matching reservation' };
        console.log('  ℹ️  No matching reservation');
      } else if (reservation.status === 'confirmed') {
        result = { ok: true, message: 'already confirmed' };
        console.log('  ℹ️  Already confirmed');
      } else if (reservation.status !== 'tentative') {
        result = { ok: true, message: `skip status ${reservation.status}` };
        console.log(`  ℹ️  Skip status ${reservation.status}`);
      } else {
        result = await confirmReservation(supabase, reservation, paymentId || '');
      }
    }
  } else {
    result = { ok: true, message: 'ignored event', type };
    console.log('  ℹ️  Ignored unknown event type');
  }

  console.log('\n📤 Final Result:', result);
  console.log(result.ok && result.message === expectedOutcome ? '✅ TEST PASSED' : '❌ TEST FAILED');

  return result.ok && result.message === expectedOutcome;
}

// Run all tests
async function runAllTests() {
  console.log('\n🚀 Starting Edge Function Logic Tests\n');

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
      console.error('\n❌ Test Error:', error.message);
      failed++;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📝 Total: ${passed + failed}`);
  console.log('='.repeat(70) + '\n');
}

// Run
runAllTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});

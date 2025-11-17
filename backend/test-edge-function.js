/**
 * Test script for Supabase Edge Function (Square Webhook Handler)
 * This simulates Square webhook requests to test the edge function locally
 */

const crypto = require('crypto');

// Configuration - Update these with your actual values
const EDGE_FUNCTION_URL = process.env.EDGE_FUNCTION_URL || 'http://localhost:54321/functions/v1/square-webhook';
const WEBHOOK_SECRET = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || 'test-secret-key';

/**
 * Generate HMAC SHA-256 signature for webhook verification
 */
function generateSignature(body, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body);
  return hmac.digest('base64');
}

/**
 * Send a test webhook request
 */
async function sendWebhook(payload, description) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${description}`);
  console.log('='.repeat(60));

  const bodyString = JSON.stringify(payload);
  const signature = generateSignature(bodyString, WEBHOOK_SECRET);

  console.log('Payload:', JSON.stringify(payload, null, 2));
  console.log('Signature:', signature);

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-square-hmacsha256-signature': signature
      },
      body: bodyString
    });

    const result = await response.json();
    console.log('\nResponse Status:', response.status);
    console.log('Response Body:', JSON.stringify(result, null, 2));

    return { success: response.ok, result };
  } catch (error) {
    console.error('\nError:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test Cases
 */
async function runTests() {
  console.log('\n🧪 Starting Edge Function Tests\n');
  console.log('Edge Function URL:', EDGE_FUNCTION_URL);
  console.log('Using Webhook Secret:', WEBHOOK_SECRET ? '***' + WEBHOOK_SECRET.slice(-4) : 'NOT SET');

  // Test 1: Payment Completed Event
  await sendWebhook({
    type: 'payment.created',
    data: {
      object: {
        payment: {
          id: 'test-payment-123',
          status: 'COMPLETED',
          reference_id: 'reservation-1',
          amount_money: {
            amount: 5000,
            currency: 'USD'
          },
          created_at: new Date().toISOString()
        }
      }
    }
  }, 'Payment Completed - Should confirm reservation');

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 2: Payment with metadata
  await sendWebhook({
    type: 'payment.updated',
    data: {
      object: {
        payment: {
          id: 'test-payment-456',
          status: 'COMPLETED',
          metadata: {
            reservation_id: '2'
          },
          amount_money: {
            amount: 7500,
            currency: 'USD'
          },
          created_at: new Date().toISOString()
        }
      }
    }
  }, 'Payment with Metadata - Should confirm reservation 2');

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 3: Refund Completed Event
  await sendWebhook({
    type: 'refund.created',
    data: {
      object: {
        refund: {
          id: 'test-refund-789',
          payment_id: 'test-payment-123',
          status: 'COMPLETED',
          amount_money: {
            amount: 5000,
            currency: 'USD'
          },
          created_at: new Date().toISOString()
        }
      }
    }
  }, 'Refund Completed - Should cancel reservation');

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 4: Pending Payment (should be ignored)
  await sendWebhook({
    type: 'payment.created',
    data: {
      object: {
        payment: {
          id: 'test-payment-pending',
          status: 'PENDING',
          reference_id: 'reservation-3',
          amount_money: {
            amount: 5000,
            currency: 'USD'
          },
          created_at: new Date().toISOString()
        }
      }
    }
  }, 'Pending Payment - Should be ignored');

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 5: Invalid Signature
  console.log(`\n${'='.repeat(60)}`);
  console.log('Testing: Invalid Signature - Should fail');
  console.log('='.repeat(60));

  const invalidPayload = { type: 'payment.created', data: {} };
  const bodyString = JSON.stringify(invalidPayload);

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-square-hmacsha256-signature': 'invalid-signature-12345'
      },
      body: bodyString
    });

    const result = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response Body:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 6: Unknown Event Type
  await sendWebhook({
    type: 'unknown.event',
    data: {}
  }, 'Unknown Event Type - Should be ignored');

  console.log('\n✅ All tests completed!\n');
}

// Run tests
runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});

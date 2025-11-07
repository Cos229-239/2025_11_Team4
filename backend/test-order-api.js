// Test script for Order API endpoints
// Run this with: node test-order-api.js

const BASE_URL = 'http://localhost:5000/api';

// Helper function to make requests
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    console.error('Request failed:', error.message);
    return { error: error.message };
  }
}

async function testOrderAPI() {
  console.log('🧪 Testing OrderEasy Order API\n');
  console.log('='.repeat(50));

  let createdOrderId;

  // Test 1: Create new order
  console.log('\n✅ Test 1: POST /api/orders (Create new order)');
  console.log('-'.repeat(50));
  const orderData = {
    table_id: 5,
    customer_notes: "Test order - please rush!",
    items: [
      {
        menu_item_id: 1,
        quantity: 2,
        special_instructions: "Extra cheese"
      },
      {
        menu_item_id: 9,
        quantity: 3,
        special_instructions: ""
      }
    ]
  };

  let result = await makeRequest(`${BASE_URL}/orders`, {
    method: 'POST',
    body: JSON.stringify(orderData)
  });
  console.log(`Status: ${result.status}`);
  console.log('Created order ID:', result.data.data?.id);
  console.log('Total amount:', result.data.data?.total_amount);
  console.log('Items count:', result.data.data?.items.length);
  console.log('Order status:', result.data.data?.status);
  createdOrderId = result.data.data?.id;

  // Test 2: Get all orders
  console.log('\n✅ Test 2: GET /api/orders (Get all orders)');
  console.log('-'.repeat(50));
  result = await makeRequest(`${BASE_URL}/orders`);
  console.log(`Status: ${result.status}`);
  console.log(`Total orders: ${result.data.count}`);

  // Test 3: Get single order by ID
  if (createdOrderId) {
    console.log(`\n✅ Test 3: GET /api/orders/${createdOrderId} (Get single order)`);
    console.log('-'.repeat(50));
    result = await makeRequest(`${BASE_URL}/orders/${createdOrderId}`);
    console.log(`Status: ${result.status}`);
    console.log('Order details:', {
      id: result.data.data?.id,
      table_id: result.data.data?.table_id,
      status: result.data.data?.status,
      total: result.data.data?.total_amount,
      items_count: result.data.data?.items.length
    });
  }

  // Test 4: Get active orders
  console.log('\n✅ Test 4: GET /api/orders/active (Get active orders)');
  console.log('-'.repeat(50));
  result = await makeRequest(`${BASE_URL}/orders/active`);
  console.log(`Status: ${result.status}`);
  console.log(`Active orders: ${result.data.count}`);

  // Test 5: Get orders by table
  console.log('\n✅ Test 5: GET /api/orders/table/5 (Get orders by table)');
  console.log('-'.repeat(50));
  result = await makeRequest(`${BASE_URL}/orders/table/5`);
  console.log(`Status: ${result.status}`);
  console.log(`Orders for table 5: ${result.data.count}`);

  // Test 6: Update order status - pending to preparing
  if (createdOrderId) {
    console.log(`\n✅ Test 6: PATCH /api/orders/${createdOrderId}/status (Update to preparing)`);
    console.log('-'.repeat(50));
    result = await makeRequest(`${BASE_URL}/orders/${createdOrderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'preparing' })
    });
    console.log(`Status: ${result.status}`);
    console.log('Updated status:', result.data.data?.status);
  }

  // Test 7: Update order status - preparing to ready
  if (createdOrderId) {
    console.log(`\n✅ Test 7: PATCH /api/orders/${createdOrderId}/status (Update to ready)`);
    console.log('-'.repeat(50));
    result = await makeRequest(`${BASE_URL}/orders/${createdOrderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'ready' })
    });
    console.log(`Status: ${result.status}`);
    console.log('Updated status:', result.data.data?.status);
  }

  // Test 8: Update order status - ready to completed
  if (createdOrderId) {
    console.log(`\n✅ Test 8: PATCH /api/orders/${createdOrderId}/status (Update to completed)`);
    console.log('-'.repeat(50));
    result = await makeRequest(`${BASE_URL}/orders/${createdOrderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed' })
    });
    console.log(`Status: ${result.status}`);
    console.log('Updated status:', result.data.data?.status);
  }

  // Test 9: Error handling - Invalid status transition
  if (createdOrderId) {
    console.log(`\n✅ Test 9: Error Handling (Invalid status transition)`);
    console.log('-'.repeat(50));
    result = await makeRequest(`${BASE_URL}/orders/${createdOrderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'preparing' })
    });
    console.log(`Status: ${result.status}`);
    console.log('Error response:', result.data.error);
  }

  // Test 10: Error handling - Create order with missing items
  console.log('\n✅ Test 10: Error Handling (Missing items)');
  console.log('-'.repeat(50));
  result = await makeRequest(`${BASE_URL}/orders`, {
    method: 'POST',
    body: JSON.stringify({
      table_id: 5,
      items: []
    })
  });
  console.log(`Status: ${result.status}`);
  console.log('Error response:', result.data.error);

  // Test 11: Error handling - Create order with invalid menu item
  console.log('\n✅ Test 11: Error Handling (Invalid menu item)');
  console.log('-'.repeat(50));
  result = await makeRequest(`${BASE_URL}/orders`, {
    method: 'POST',
    body: JSON.stringify({
      table_id: 5,
      items: [{ menu_item_id: 99999, quantity: 1 }]
    })
  });
  console.log(`Status: ${result.status}`);
  console.log('Error response:', result.data.error);

  // Test 12: Create another order to test active orders
  console.log('\n✅ Test 12: Create second order (for active orders test)');
  console.log('-'.repeat(50));
  result = await makeRequest(`${BASE_URL}/orders`, {
    method: 'POST',
    body: JSON.stringify({
      table_id: 3,
      customer_notes: "Second test order",
      items: [
        { menu_item_id: 2, quantity: 1 },
        { menu_item_id: 5, quantity: 2 }
      ]
    })
  });
  console.log(`Status: ${result.status}`);
  console.log('Created order ID:', result.data.data?.id);

  // Test 13: Verify active orders count
  console.log('\n✅ Test 13: GET /api/orders/active (Verify count after new order)');
  console.log('-'.repeat(50));
  result = await makeRequest(`${BASE_URL}/orders/active`);
  console.log(`Status: ${result.status}`);
  console.log(`Active orders: ${result.data.count}`);
  console.log('Active order statuses:', result.data.data.map(o => ({ id: o.id, status: o.status })));

  console.log('\n' + '='.repeat(50));
  console.log('✅ All tests completed!\n');
}

// Run tests
console.log('Starting Order API tests...\n');
console.log('Make sure:');
console.log('1. The server is running on http://localhost:5000');
console.log('2. The database tables are created (run schema.sql)');
console.log('3. Menu items exist in the database\n');

testOrderAPI().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});

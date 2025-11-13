// Test script for Menu API endpoints
// Run this with: node test-menu-api.js

const BASE_URL = 'http://localhost:5000/api/menu';

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

async function testMenuAPI() {
  console.log('🧪 Testing OrderEasy Menu API\n');
  console.log('=' .repeat(50));

  // Test 1: Get all menu items
  console.log('\n✅ Test 1: GET /api/menu (Get all menu items)');
  console.log('-'.repeat(50));
  let result = await makeRequest(BASE_URL);
  console.log(`Status: ${result.status}`);
  console.log(`Found ${result.data.count} menu items`);
  console.log('Sample item:', result.data.data[0]);

  // Test 2: Get categories
  console.log('\n✅ Test 2: GET /api/menu/categories');
  console.log('-'.repeat(50));
  result = await makeRequest(`${BASE_URL}/categories`);
  console.log(`Status: ${result.status}`);
  console.log('Categories:', result.data.data);

  // Test 3: Filter by category
  console.log('\n✅ Test 3: GET /api/menu?category=Pizza');
  console.log('-'.repeat(50));
  result = await makeRequest(`${BASE_URL}?category=Pizza`);
  console.log(`Status: ${result.status}`);
  console.log(`Found ${result.data.count} pizza items`);

  // Test 4: Get single item
  console.log('\n✅ Test 4: GET /api/menu/1 (Get single item)');
  console.log('-'.repeat(50));
  result = await makeRequest(`${BASE_URL}/1`);
  console.log(`Status: ${result.status}`);
  console.log('Item:', result.data.data);

  // Test 5: Create new menu item
  console.log('\n✅ Test 5: POST /api/menu (Create new item)');
  console.log('-'.repeat(50));
  const newItem = {
    name: `Test Pizza ${Date.now()}`,
    description: 'This is a test pizza created by the test script',
    price: 19.99,
    category: 'Pizza',
    available: true
  };
  result = await makeRequest(BASE_URL, {
    method: 'POST',
    body: JSON.stringify(newItem)
  });
  console.log(`Status: ${result.status}`);
  console.log('Created item:', result.data.data);
  const createdItemId = result.data.data?.id;

  // Test 6: Update menu item
  if (createdItemId) {
    console.log('\n✅ Test 6: PUT /api/menu/:id (Update item)');
    console.log('-'.repeat(50));
    result = await makeRequest(`${BASE_URL}/${createdItemId}`, {
      method: 'PUT',
      body: JSON.stringify({
        price: 22.99,
        available: false
      })
    });
    console.log(`Status: ${result.status}`);
    console.log('Updated item:', result.data.data);

    // Test 7: Delete menu item
    console.log('\n✅ Test 7: DELETE /api/menu/:id (Delete item)');
    console.log('-'.repeat(50));
    result = await makeRequest(`${BASE_URL}/${createdItemId}`, {
      method: 'DELETE'
    });
    console.log(`Status: ${result.status}`);
    console.log('Deleted item:', result.data.data);
  }

  // Test 8: Error handling - Get non-existent item
  console.log('\n✅ Test 8: Error Handling (Get non-existent item)');
  console.log('-'.repeat(50));
  result = await makeRequest(`${BASE_URL}/99999`);
  console.log(`Status: ${result.status}`);
  console.log('Error response:', result.data);

  // Test 9: Error handling - Create with missing fields
  console.log('\n✅ Test 9: Error Handling (Missing required fields)');
  console.log('-'.repeat(50));
  result = await makeRequest(BASE_URL, {
    method: 'POST',
    body: JSON.stringify({ name: 'Incomplete Item' })
  });
  console.log(`Status: ${result.status}`);
  console.log('Error response:', result.data);

  console.log('\n' + '='.repeat(50));
  console.log('✅ All tests completed!\n');
}

// Run tests
console.log('Starting Menu API tests...\n');
console.log('Make sure the server is running on http://localhost:5000\n');

testMenuAPI().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});

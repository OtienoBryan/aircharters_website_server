const axios = require('axios');

// Test the charter deals endpoint
async function testCharterDealsEndpoint() {
  try {
    console.log('🔍 Testing Charter Deals Endpoint...\n');
    
    // Test the main endpoint
    const response = await axios.get('http://localhost:5000/api/charter-deals', {
      headers: {
        'Authorization': 'Bearer test-token' // You'll need a real token
      },
      params: {
        page: 1,
        limit: 5
      }
    });

    console.log('✅ Response Status:', response.status);
    console.log('📊 Response Structure:');
    console.log(JSON.stringify(response.data, null, 2));

    // Check if we have deals
    if (response.data.data && response.data.data.length > 0) {
      console.log('\n🎯 Sample Deal Data:');
      const sampleDeal = response.data.data[0];
      console.log('ID:', sampleDeal.id);
      console.log('Route:', `${sampleDeal.origin} - ${sampleDeal.destination}`);
      console.log('Date:', sampleDeal.date);
      console.log('Time:', sampleDeal.time);
      console.log('Aircraft:', sampleDeal.aircraftName);
      console.log('Price Per Seat:', sampleDeal.pricePerSeat);
      console.log('Price Per Hour:', sampleDeal.pricePerHour);
      console.log('Available Seats:', sampleDeal.availableSeats);
      console.log('Deal Type:', sampleDeal.dealType);
      console.log('Company:', sampleDeal.companyName);
      console.log('Aircraft Images:', sampleDeal.aircraftImages);
      console.log('Route Images:', sampleDeal.routeImages);
      console.log('Duration:', sampleDeal.duration);
      console.log('Amenities:', sampleDeal.amenities);
    } else {
      console.log('\n⚠️ No deals found in response');
    }

  } catch (error) {
    console.error('❌ Error testing endpoint:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Test without authentication first
async function testWithoutAuth() {
  try {
    console.log('🔍 Testing without authentication...\n');
    
    const response = await axios.get('http://localhost:5000/api/charter-deals', {
      params: {
        page: 1,
        limit: 5
      }
    });

    console.log('✅ Response Status:', response.status);
    console.log('📊 Response Structure:');
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ Error (expected without auth):', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Charter Deals Endpoint Tests\n');
  
  await testWithoutAuth();
  console.log('\n' + '='.repeat(50) + '\n');
  await testCharterDealsEndpoint();
}

runTests(); 
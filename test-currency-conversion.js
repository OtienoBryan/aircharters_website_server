const axios = require('axios');

// Test currency conversion endpoints
async function testCurrencyConversion() {
  const baseUrl = 'http://localhost:5000/api/payments/exchange-rate';
  
  console.log('🧪 Testing Currency Conversion API...\n');

  try {
    // Test 1: Get USD to KES rate
    console.log('1. Testing USD to KES rate...');
    const usdToKesResponse = await axios.get(`${baseUrl}/usd-to-kes`);
    console.log('✅ USD to KES:', usdToKesResponse.data);
    console.log('');

    // Test 2: Get KES to USD rate
    console.log('2. Testing KES to USD rate...');
    const kesToUsdResponse = await axios.get(`${baseUrl}/kes-to-usd`);
    console.log('✅ KES to USD:', kesToUsdResponse.data);
    console.log('');

    // Test 3: Convert $100 USD to KES
    console.log('3. Testing $100 USD to KES conversion...');
    const conversionResponse = await axios.get(`${baseUrl}/convert?amount=100&from=USD&to=KES`);
    console.log('✅ $100 USD conversion:', conversionResponse.data);
    console.log('');

    // Test 4: Get general exchange rate
    console.log('4. Testing general exchange rate...');
    const generalRateResponse = await axios.get(`${baseUrl}?from=USD&to=KES`);
    console.log('✅ General rate:', generalRateResponse.data);
    console.log('');

    // Test 5: Cache statistics
    console.log('5. Testing cache statistics...');
    const cacheStatsResponse = await axios.get(`${baseUrl}/cache/stats`);
    console.log('✅ Cache stats:', cacheStatsResponse.data);
    console.log('');

    console.log('🎉 All currency conversion tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      console.log('\n💡 Make sure the backend server is running on port 5000');
      console.log('💡 Run: npm run start:dev');
    }
  }
}

// Test Paystack payment with currency conversion
async function testPaystackPayment() {
  console.log('\n🧪 Testing Paystack Payment with Currency Conversion...\n');
  
  try {
    const paymentData = {
      amount: 1624, // $1,624 USD
      currency: 'USD',
      bookingId: 'TEST_BOOKING_123',
      userId: 1,
      metadata: {
        companyId: 1,
        customerEmail: 'test@example.com'
      }
    };

    console.log('Payment request:', paymentData);
    
    const response = await axios.post('http://localhost:5000/api/payments/paystack/initialize', paymentData);
    console.log('✅ Paystack payment initialized:', response.data);
    
    if (response.data.data?.metadata?.convertedAmount) {
      console.log(`💰 Original: $${paymentData.amount} USD`);
      console.log(`💰 Converted: ${response.data.data.metadata.convertedAmount} KES`);
      console.log(`💰 Exchange Rate: ${response.data.data.metadata.exchangeRate}`);
    }

  } catch (error) {
    console.error('❌ Paystack test failed:', error.response?.data || error.message);
  }
}

// Run tests
async function runTests() {
  await testCurrencyConversion();
  await testPaystackPayment();
}

runTests();


const axios = require('axios');

// Test Paystack integration
async function testPaystackIntegration() {
  const baseUrl = 'http://localhost:5000';
  
  console.log('🧪 Testing Paystack Integration...\n');

  try {
    // Test 1: Get Paystack info (public key)
    console.log('1️⃣ Testing Paystack Info Endpoint...');
    const infoResponse = await axios.get(`${baseUrl}/api/payments/paystack/info`);
    
    if (infoResponse.data.success) {
      console.log('✅ Paystack Info Endpoint Working');
      console.log(`   Public Key: ${infoResponse.data.data.publicKey.substring(0, 20)}...`);
      console.log(`   Supported Currencies: ${infoResponse.data.data.supportedCurrencies.join(', ')}`);
      console.log(`   Supported Methods: ${infoResponse.data.data.supportedPaymentMethods.join(', ')}\n`);
    } else {
      console.log('❌ Paystack Info Endpoint Failed');
      console.log(`   Error: ${infoResponse.data.message}\n`);
    }

    // Test 2: Initialize Payment
    console.log('2️⃣ Testing Payment Initialization...');
    const paymentData = {
      amount: 100.00,
      currency: 'KES',
      email: 'test@example.com',
      bookingId: 'test_booking_123',
      companyId: 1,
      userId: 'test_user_456',
      description: 'Test payment for charter flight',
      metadata: {
        test: true,
        source: 'integration_test'
      }
    };

    const initResponse = await axios.post(`${baseUrl}/api/payments/paystack/initialize`, paymentData);
    
    if (initResponse.data.success) {
      console.log('✅ Payment Initialization Working');
      console.log(`   Reference: ${initResponse.data.data.reference}`);
      console.log(`   Authorization URL: ${initResponse.data.data.authorizationUrl ? 'Generated' : 'Not generated'}`);
      console.log(`   Amount: ${initResponse.data.data.amount}`);
      console.log(`   Currency: ${initResponse.data.data.currency}\n`);
    } else {
      console.log('❌ Payment Initialization Failed');
      console.log(`   Error: ${initResponse.data.message}\n`);
    }

    // Test 3: Test with different currencies
    console.log('3️⃣ Testing Different Currencies...');
    const currencies = ['KES', 'USD', 'NGN'];
    
    for (const currency of currencies) {
      try {
        const testData = { ...paymentData, currency, amount: 50.00 };
        const response = await axios.post(`${baseUrl}/api/payments/paystack/initialize`, testData);
        
        if (response.data.success) {
          console.log(`   ✅ ${currency}: Working`);
        } else {
          console.log(`   ❌ ${currency}: ${response.data.message}`);
        }
      } catch (error) {
        console.log(`   ❌ ${currency}: ${error.response?.data?.message || error.message}`);
      }
    }

    console.log('\n🎉 Paystack Integration Test Complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. Set up Paystack subaccounts for each airline vendor');
    console.log('2. Configure webhooks in Paystack dashboard');
    console.log('3. Test with real payment flows in Flutter app');
    console.log('4. Add IP whitelist for production');

  } catch (error) {
    console.error('❌ Test Failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure your backend server is running:');
      console.log('   npm run start:dev');
    }
  }
}

// Run the test
testPaystackIntegration();

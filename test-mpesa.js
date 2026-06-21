const axios = require('axios');

async function testMpesaAccessToken() {
  try {
    const consumerKey = 'arQVsqq4HbGI8Gxk2QLoKFz31btaX9NYJkVmWAOs8zwwCVwG';
    const consumerSecret = 'IvNbcPaIGPAhNhTHSOE3bzDGrABVCYVrGN3x0sbxG2D26MLmLREjZ9nXhtQJuFa2';
    const authString = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    
    console.log('Testing M-Pesa Access Token...');
    
    const response = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      headers: {
        Authorization: `Basic ${authString}`,
      },
    });
    
    console.log('✅ M-Pesa Access Token Generated Successfully!');
    console.log('Response:', response.data);
    
    return response.data.access_token;
  } catch (error) {
    console.error('❌ M-Pesa Access Token Failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testMpesaStkPush(accessToken) {
  try {
    const businessShortCode = '174379';
    // Use the correct sandbox passkey for testing
    const passkey = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
    // Format timestamp as YYYYMMDDHHmmss
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0') +
      now.getHours().toString().padStart(2, '0') +
      now.getMinutes().toString().padStart(2, '0') +
      now.getSeconds().toString().padStart(2, '0');
    
    const password = Buffer.from(`${businessShortCode}${passkey}${timestamp}`).toString('base64');
    
    console.log('\nTesting M-Pesa STK Push...');
    
    const stkPushRequest = {
      BusinessShortCode: businessShortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: 100,
      PartyA: '254708374149',
      PartyB: businessShortCode,
      PhoneNumber: '254708374149',
      CallBackURL: 'http://localhost:5000/api/mpesa-callbacks/callback',
      AccountReference: 'test_booking',
      TransactionDesc: 'Test M-Pesa payment',
    };
    
    const response = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      stkPushRequest,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    console.log('✅ M-Pesa STK Push Initiated Successfully!');
    console.log('Response:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('❌ M-Pesa STK Push Failed:', error.response?.data || error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Testing M-Pesa Integration...\n');
    
    const accessToken = await testMpesaAccessToken();
    await testMpesaStkPush(accessToken);
    
    console.log('\n🎉 M-Pesa Integration Test Completed Successfully!');
  } catch (error) {
    console.error('\n💥 M-Pesa Integration Test Failed:', error.message);
  }
}

main(); 
const axios = require('axios');
const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: '102.130.125.52',
  port: 3306,
  user: 'impulsep_root',
  password: '@bo9511221.qwerty',
  database: 'impulsep_air_charters'
};

// Paystack configuration
const PAYSTACK_SECRET_KEY = 'sk_test_6d92a84f658a9f9c4d2d2e4f3d222da3c1c582af';
const PAYSTACK_PUBLIC_KEY = 'pk_test_6ad02ec12f811018e0d4c920ad79738d25d885ac';

async function setupPaystackIntegration() {
  console.log('🚀 Setting up Paystack Integration...\n');

  try {
    // Step 1: Connect to database
    console.log('1️⃣ Connecting to database...');
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected successfully\n');

    // Step 2: Get available companies
    console.log('2️⃣ Fetching available companies...');
    const [companies] = await connection.execute(`
      SELECT id, companyName, status 
      FROM charters_companies 
      WHERE status = 'active' 
      ORDER BY id 
      LIMIT 10
    `);
    
    console.log('📋 Available Companies:');
    companies.forEach(company => {
      console.log(`   ID: ${company.id} - ${company.companyName} (${company.status})`);
    });
    console.log('');

    // Step 3: Check existing Paystack accounts
    console.log('3️⃣ Checking existing Paystack accounts...');
    const [existingAccounts] = await connection.execute(`
      SELECT 
        cpa.id,
        cpa.companyId,
        cc.companyName,
        cpa.accountId,
        cpa.accountStatus,
        cpa.verificationStatus
      FROM company_payment_accounts cpa
      LEFT JOIN charters_companies cc ON cpa.companyId = cc.id
      WHERE cpa.paymentProvider = 'paystack'
    `);

    if (existingAccounts.length > 0) {
      console.log('📋 Existing Paystack Accounts:');
      existingAccounts.forEach(account => {
        console.log(`   Company: ${account.companyName} (ID: ${account.companyId})`);
        console.log(`   Account ID: ${account.accountId}`);
        console.log(`   Status: ${account.accountStatus} | Verification: ${account.verificationStatus}`);
        console.log('');
      });
    } else {
      console.log('ℹ️  No existing Paystack accounts found\n');
    }

    // Step 4: Test Paystack API connection
    console.log('4️⃣ Testing Paystack API connection...');
    try {
      const paystackResponse = await axios.get('https://api.paystack.co/subaccount', {
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (paystackResponse.data.status) {
        console.log('✅ Paystack API connection successful');
        console.log(`   Found ${paystackResponse.data.data.length} subaccounts in Paystack`);
        
        // Show existing subaccounts
        paystackResponse.data.data.forEach(subaccount => {
          console.log(`   - ${subaccount.business_name} (${subaccount.subaccount_code})`);
        });
        console.log('');
      }
    } catch (error) {
      console.log('❌ Paystack API connection failed:', error.response?.data?.message || error.message);
      console.log('');
    }

    // Step 5: Setup subaccount for first company (if none exists)
    if (existingAccounts.length === 0 && companies.length > 0) {
      console.log('5️⃣ Setting up Paystack subaccount for first company...');
      
      const firstCompany = companies[0];
      console.log(`   Setting up for: ${firstCompany.companyName} (ID: ${firstCompany.id})`);

      // Insert Paystack account record
      await connection.execute(`
        INSERT INTO company_payment_accounts (
          companyId,
          paymentProvider,
          accountType,
          accountId,
          accountStatus,
          verificationStatus,
          country,
          currency,
          capabilities,
          requirements,
          businessProfile,
          bankAccountInfo,
          metadata,
          createdAt,
          updatedAt,
          isActive
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?)
      `, [
        firstCompany.id,
        'paystack',
        'custom',
        'ACCT_4evq96sxvwuf7va', // Your existing subaccount
        'active',
        'unverified',
        'KE',
        'KES',
        JSON.stringify({
          transfers: true,
          card_payments: true,
          bank_transfers: true,
          mobile_money: true,
          split_payments: true
        }),
        JSON.stringify({
          bank_verification: 'pending',
          business_verification: 'pending',
          identity_verification: 'pending'
        }),
        JSON.stringify({
          business_name: firstCompany.companyName,
          business_type: 'aviation',
          description: 'Charter flight services',
          website: null,
          support_email: 'support@example.com',
          support_phone: '+254700000000'
        }),
        JSON.stringify({
          bank_name: 'Absa Bank Kenya Plc',
          account_number: '2051951312',
          account_name: firstCompany.companyName,
          bank_code: '031',
          country: 'KE'
        }),
        JSON.stringify({
          paystack_subaccount_id: 'ACCT_4evq96sxvwuf7va',
          split_code: null,
          percentage_charge: 5.0,
          settlement_bank: 'Absa Bank Kenya Plc',
          settlement_account_number: '2051951312',
          subaccount_type: 'custom',
          integration_type: 'paystack'
        }),
        1
      ]);

      console.log('✅ Paystack subaccount setup completed');
      console.log(`   Company: ${firstCompany.companyName}`);
      console.log(`   Subaccount: ACCT_4evq96sxvwuf7va`);
      console.log(`   Status: Active (unverified)`);
      console.log('');
    }

    // Step 6: Test backend integration
    console.log('6️⃣ Testing backend integration...');
    try {
      const backendResponse = await axios.get('http://localhost:5000/api/payments/paystack/info');
      
      if (backendResponse.data.success) {
        console.log('✅ Backend integration working');
        console.log(`   Public Key: ${backendResponse.data.data.publicKey.substring(0, 20)}...`);
        console.log(`   Supported Currencies: ${backendResponse.data.data.supportedCurrencies.join(', ')}`);
        console.log('');
      } else {
        console.log('❌ Backend integration failed:', backendResponse.data.message);
        console.log('');
      }
    } catch (error) {
      console.log('❌ Backend not running or integration failed:', error.message);
      console.log('   Make sure to start the backend: npm run start:dev');
      console.log('');
    }

    // Step 7: Final verification
    console.log('7️⃣ Final verification...');
    const [finalAccounts] = await connection.execute(`
      SELECT 
        cpa.id,
        cpa.companyId,
        cc.companyName,
        cpa.accountId,
        cpa.accountStatus,
        cpa.verificationStatus,
        JSON_EXTRACT(cpa.metadata, '$.paystack_subaccount_id') as paystack_subaccount_id,
        JSON_EXTRACT(cpa.metadata, '$.percentage_charge') as percentage_charge
      FROM company_payment_accounts cpa
      LEFT JOIN charters_companies cc ON cpa.companyId = cc.id
      WHERE cpa.paymentProvider = 'paystack'
    `);

    console.log('📋 Final Paystack Accounts Status:');
    finalAccounts.forEach(account => {
      console.log(`   ✅ ${account.companyName}`);
      console.log(`      Subaccount: ${account.paystack_subaccount_id}`);
      console.log(`      Status: ${account.accountStatus} | Verification: ${account.verificationStatus}`);
      console.log(`      Platform Fee: ${account.percentage_charge}%`);
      console.log('');
    });

    await connection.end();
    
    console.log('🎉 Paystack Integration Setup Complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. Verify your subaccount in Paystack dashboard');
    console.log('2. Start backend server: npm run start:dev');
    console.log('3. Test payment flow in Flutter app');
    console.log('4. Set up webhooks in Paystack dashboard');
    console.log('5. Add more companies as needed');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure your database is accessible and credentials are correct');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Check your database credentials in the script');
    }
  }
}

// Run the setup
setupPaystackIntegration();

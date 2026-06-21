const mysql = require('mysql2/promise');

async function checkTransactionLedger() {
  const connection = await mysql.createConnection({
    host: '102.130.125.52',
    user: 'impulsep_root',
    password: '@bo9511221.qwerty',
    database: 'impulsep_air_charters'
  });

  try {
    console.log('🔍 Checking transaction ledger for Paystack payments...\n');
    
    // Check recent Paystack transactions
    const [rows] = await connection.execute(`
      SELECT 
        transactionId,
        bookingId,
        userId,
        amount,
        currency,
        status,
        transactionType,
        paymentProvider,
        exchangeRate,
        baseAmount,
        createdAt
      FROM transaction_ledger 
      WHERE transactionId LIKE 'PAYSTACK_%' 
      ORDER BY createdAt DESC 
      LIMIT 10
    `);

    if (rows.length === 0) {
      console.log('❌ No Paystack transactions found in ledger');
    } else {
      console.log(`✅ Found ${rows.length} Paystack transactions:\n`);
      
      rows.forEach((row, index) => {
        console.log(`${index + 1}. Transaction ID: ${row.transactionId}`);
        console.log(`   Booking ID: ${row.bookingId}`);
        console.log(`   User ID: ${row.userId}`);
        console.log(`   Amount: ${row.amount} ${row.currency}`);
        console.log(`   Status: ${row.status}`);
        console.log(`   Type: ${row.transactionType}`);
        console.log(`   Provider: ${row.paymentProvider}`);
        console.log(`   Exchange Rate: ${row.exchangeRate}`);
        console.log(`   Base Amount: ${row.baseAmount}`);
        console.log(`   Created: ${row.createdAt}`);
        console.log('');
      });
    }

    // Check total count
    const [countRows] = await connection.execute(`
      SELECT COUNT(*) as total FROM transaction_ledger WHERE paymentProvider = 'paystack'
    `);
    
    console.log(`📊 Total Paystack transactions in ledger: ${countRows[0].total}`);

  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await connection.end();
  }
}

checkTransactionLedger();

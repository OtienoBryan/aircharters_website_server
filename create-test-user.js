const mysql = require('mysql2');
const bcrypt = require('bcrypt');
require('dotenv').config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

async function createTestUser() {
  try {
    console.log('🔧 Creating test user...');
    
    const testEmail = 'test@aircharters.com';
    const testPassword = 'password123';
    const firstName = 'Test';
    const lastName = 'User';
    
    // Check if user already exists
    const [existingUsers] = await connection.promise().query(
      'SELECT id FROM users WHERE email = ?',
      [testEmail]
    );
    
    if (existingUsers.length > 0) {
      console.log('⚠️  User already exists, updating password...');
      
      // Hash the password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(testPassword, saltRounds);
      
      // Update the password
      await connection.promise().query(
        'UPDATE users SET password = ? WHERE email = ?',
        [hashedPassword, testEmail]
      );
      
      console.log('✅ Password updated successfully');
    } else {
      console.log('🆕 Creating new user...');
      
      // Hash the password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(testPassword, saltRounds);
      
      // Generate user ID
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Insert new user
      await connection.promise().query(
        `INSERT INTO users (
          id, email, password, first_name, last_name, 
          loyalty_points, wallet_balance, is_active, 
          email_verified, phone_verified, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [userId, testEmail, hashedPassword, firstName, lastName, 0, 0.00, true, false, false]
      );
      
      console.log('✅ User created successfully');
    }
    
    console.log('\n📋 Test User Credentials:');
    console.log(`  - Email: ${testEmail}`);
    console.log(`  - Password: ${testPassword}`);
    console.log('\n💡 Use these credentials to test login in your Flutter app');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    connection.end();
  }
}

createTestUser(); 
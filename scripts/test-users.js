const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

async function testUsers() {
  try {
    console.log('🔍 Checking users table...');
    
    // Check if users table exists
    const [tables] = await connection.promise().query('SHOW TABLES LIKE "users"');
    if (tables.length === 0) {
      console.log('❌ Users table does not exist!');
      return;
    }
    
    console.log('✅ Users table exists');
    
    // Check table structure
    const [columns] = await connection.promise().query('DESCRIBE users');
    console.log('📋 Users table structure:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(not null)'}`);
    });
    
    // Count users
    const [countResult] = await connection.promise().query('SELECT COUNT(*) as count FROM users');
    const userCount = countResult[0].count;
    console.log(`👥 Total users in database: ${userCount}`);
    
    if (userCount > 0) {
      // Get first few users (without passwords)
      const [users] = await connection.promise().query('SELECT id, email, first_name, last_name, created_at FROM users LIMIT 5');
      console.log('📋 Sample users:');
      users.forEach(user => {
        console.log(`  - ${user.id}: ${user.email} (${user.first_name} ${user.last_name}) - Created: ${user.created_at}`);
      });
    } else {
      console.log('⚠️  No users found in database');
      console.log('💡 You may need to register a user first');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    connection.end();
  }
}

testUsers(); 
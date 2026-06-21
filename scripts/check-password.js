const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

async function checkUserPassword() {
  try {
    console.log('🔍 Checking user password for: bennjiokwama@gmail.com');
    
    const [users] = await connection.promise().query(
      'SELECT id, email, password, first_name, last_name FROM users WHERE email = ?',
      ['bennjiokwama@gmail.com']
    );
    
    if (users.length === 0) {
      console.log('❌ User not found');
      return;
    }
    
    const user = users[0];
    console.log('✅ User found:');
    console.log(`  - ID: ${user.id}`);
    console.log(`  - Email: ${user.email}`);
    console.log(`  - Name: ${user.first_name} ${user.last_name}`);
    console.log(`  - Password hash: ${user.password ? user.password.substring(0, 20) + '...' : 'NULL'}`);
    console.log(`  - Has password: ${user.password ? 'Yes' : 'No'}`);
    
    if (!user.password) {
      console.log('⚠️  User has no password set!');
      console.log('💡 You may need to register this user with a password first');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    connection.end();
  }
}

checkUserPassword(); 
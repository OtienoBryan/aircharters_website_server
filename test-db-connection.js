const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
  const config = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    charset: 'utf8mb4_unicode_ci',
    connectionLimit: 20,
    multipleStatements: false,
    dateStrings: true,
    supportBigNumbers: true,
    bigNumberStrings: true,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  };

  console.log('Testing database connection...');
  console.log('Host:', config.host);
  console.log('Database:', config.database);
  console.log('User:', config.user);
  console.log('Port:', config.port);

  try {
    const connection = await mysql.createConnection(config);
    console.log('✅ Database connection successful!');
    
    // Test a simple query
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Query test successful:', rows);
    
    await connection.end();
    console.log('✅ Connection closed successfully');
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    console.error('Errno:', error.errno);
    
    if (error.code === 'ETIMEDOUT') {
      console.log('\n💡 Connection timeout suggestions:');
      console.log('1. Check if the database server is running');
      console.log('2. Verify the IP address is correct');
      console.log('3. Check firewall settings');
      console.log('4. Verify database credentials');
    }
  }
}

testConnection();

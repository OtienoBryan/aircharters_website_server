# cPanel Database Setup Guide

This guide will help you configure your NestJS backend to work with your cPanel MySQL database.

## 🔧 **Step 1: Get Your cPanel Database Credentials**

### 1.1 Access cPanel
- Log into your cPanel account
- Navigate to **Databases** > **MySQL Databases**

### 1.2 Create Database (if not exists)
1. **Create Database:**
   - Database Name: `your_username_citlogis_air_charters`
   - Click "Create Database"

2. **Create Database User:**
   - Username: `your_username_dbuser`
   - Password: Create a strong password
   - Click "Create User"

3. **Add User to Database:**
   - Select your database and user
   - Grant **ALL PRIVILEGES**
   - Click "Add"

### 1.3 Get Connection Details
From your cPanel, note down:
- **Database Host:** Usually `localhost` or your domain
- **Database Name:** `your_username_citlogis_air_charters`
- **Database User:** `your_username_dbuser`
- **Database Password:** The password you created

## 🔧 **Step 2: Import Your Database Schema**

### 2.1 Using phpMyAdmin
1. Go to **Databases** > **phpMyAdmin**
2. Select your database
3. Click **Import**
4. Choose your `citlogis_air_charters.sql` file
5. Click **Go**

### 2.2 Using cPanel File Manager
1. Upload your SQL file to your home directory
2. Go to **Databases** > **MySQL Databases**
3. Click **phpMyAdmin**
4. Select your database
5. Click **SQL** tab
6. Copy and paste the contents of your SQL file
7. Click **Go**

## 🔧 **Step 3: Configure Environment Variables**

### 3.1 Create .env file
```bash
cd backend
cp env.example .env
```

### 3.2 Update Database Configuration
```env
# cPanel Database Configuration
DB_HOST=your-cpanel-host.com
DB_PORT=3306
DB_USERNAME=your_username_dbuser
DB_PASSWORD=your_database_password
DB_DATABASE=your_username_citlogis_air_charters
```

### 3.3 Example Configuration
```env
# Example for domain: mydomain.com
DB_HOST=mydomain.com
DB_PORT=3306
DB_USERNAME=mydomain_dbuser
DB_PASSWORD=MySecurePassword123!
DB_DATABASE=mydomain_citlogis_air_charters
```

## 🔧 **Step 4: Test Database Connection**

### 4.1 Install Dependencies
```bash
cd backend
npm install
```

### 4.2 Test Connection
```bash
# Create a test script
echo "
const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

connection.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
  console.log('✅ Database connected successfully!');
  connection.end();
});
" > test-db.js

# Run test
node test-db.js
```

## 🔧 **Step 5: Common cPanel Issues & Solutions**

### 5.1 Connection Refused
**Problem:** `ECONNREFUSED` error
**Solution:**
- Check if your hosting allows external database connections
- Use `localhost` instead of domain name
- Contact your hosting provider

### 5.2 Access Denied
**Problem:** `ER_ACCESS_DENIED_ERROR`
**Solution:**
- Verify username and password
- Check if user has proper privileges
- Ensure database name is correct

### 5.3 Database Not Found
**Problem:** `ER_BAD_DB_ERROR`
**Solution:**
- Verify database name includes your cPanel username prefix
- Check if database was created successfully

### 5.4 Connection Timeout
**Problem:** Connection times out
**Solution:**
- Add connection timeout settings in your config
- Check hosting provider's database limits

## 🔧 **Step 6: Production Deployment**

### 6.1 Environment Variables for Production
```env
NODE_ENV=production
DB_HOST=your-cpanel-host.com
DB_PORT=3306
DB_USERNAME=your_username_dbuser
DB_PASSWORD=your_database_password
DB_DATABASE=your_username_citlogis_air_charters
```

### 6.2 Security Considerations
- Use strong database passwords
- Limit database user privileges
- Enable SSL connections if available
- Regular database backups

## 🔧 **Step 7: Database Migration (Optional)**

If you want to use TypeORM migrations:

### 7.1 Generate Migration
```bash
npm run migration:generate -- src/database/migrations/InitialMigration
```

### 7.2 Run Migration
```bash
npm run migration:run
```

## 🔧 **Step 8: Verify Setup**

### 8.1 Start the Application
```bash
npm run start:dev
```

### 8.2 Test API Endpoints
```bash
# Test database connection via API
curl http://localhost:3000/api/health

# Check Swagger documentation
open http://localhost:3000/api/docs
```

## 🔧 **Step 9: Troubleshooting**

### 9.1 Check Database Tables
```sql
-- In phpMyAdmin, run:
SHOW TABLES;
DESCRIBE users;
DESCRIBE bookings;
```

### 9.2 Check User Privileges
```sql
-- In phpMyAdmin, run:
SHOW GRANTS FOR 'your_username_dbuser'@'%';
```

### 9.3 Common Error Messages
- `ER_ACCESS_DENIED_ERROR`: Wrong credentials
- `ER_BAD_DB_ERROR`: Database doesn't exist
- `ECONNREFUSED`: Connection issues
- `ETIMEDOUT`: Network timeout

## 🔧 **Step 10: Performance Optimization**

### 10.1 Database Indexes
Your SQL file already includes proper indexes, but verify:
```sql
SHOW INDEX FROM bookings;
SHOW INDEX FROM users;
SHOW INDEX FROM aircraft;
```

### 10.2 Connection Pooling
The configuration includes connection pooling settings:
```typescript
extra: {
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
}
```

## 📞 **Need Help?**

If you encounter issues:
1. Check your hosting provider's documentation
2. Verify all credentials are correct
3. Test connection with a simple script first
4. Contact your hosting provider for database access issues

## ✅ **Success Checklist**

- [ ] Database created in cPanel
- [ ] Database user created with proper privileges
- [ ] SQL schema imported successfully
- [ ] Environment variables configured
- [ ] Database connection test passed
- [ ] Application starts without errors
- [ ] API endpoints responding correctly 
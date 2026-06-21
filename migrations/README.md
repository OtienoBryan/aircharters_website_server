# Database Refactor Migrations

This directory contains migration scripts to refactor your database structure, adding loyalty points and wallet functionality while eliminating redundancy.

## 🚨 Important Notes

- **BACKUP YOUR DATABASE** before running these migrations
- Run migrations in order (01 through 08)
- Test thoroughly after each migration
- Only run cleanup migration (09) after confirming everything works

## 📋 Migration Overview

### Migration 01: Enhance Users Table
- Adds loyalty points, wallet balance, and enhanced profile fields
- Adds loyalty tier system
- Adds language, currency, timezone preferences

### Migration 02: Enhance User Preferences
- Comprehensive travel preferences (seat, meal, special assistance)
- Notification preferences (email, SMS, push)
- Privacy settings and data sharing controls

### Migration 03: Enhance Bookings Table
- Adds loyalty points earned/redeemed tracking
- Adds wallet amount used tracking
- Maintains existing booking functionality

### Migration 04: Refactor User Trip History
- Simplifies structure using proper foreign keys
- Removes redundant data (aircraft_name, company_name stored as strings)
- Adds proper relationships to deals and pilots

### Migration 05: Enhance User Documents
- Adds document status (draft, published, archived)
- Adds expiration dates
- Adds better file metadata tracking
- Adds loyalty card document type

### Migration 06: Create Loyalty Transactions
- Tracks all loyalty point transactions
- Maintains balance history
- Supports expiration dates
- Links to bookings and users

### Migration 07: Create Wallet Transactions
- Tracks all wallet transactions
- Maintains balance history
- Supports multiple payment methods
- Links to bookings and users

### Migration 08: Create Loyalty Tiers
- Defines loyalty tier rules and benefits
- Pre-configured Bronze, Silver, Gold, Platinum tiers
- Configurable points multipliers and discounts

### Migration 09: Cleanup (Optional)
- Removes old redundant tables
- Only run after confirming all migrations work

## 🚀 How to Run

### Option 1: Run All Migrations at Once
```bash
mysql -u your_username -p citlogis_air_charters < backend/migrations/run-all-migrations.sql
```

### Option 2: Run Migrations Individually
```bash
# Run each migration in order
mysql -u your_username -p citlogis_air_charters < backend/migrations/01-enhance-users-table.sql
mysql -u your_username -p citlogis_air_charters < backend/migrations/02-enhance-user-preferences.sql
# ... continue for all migrations
```

### Option 3: Using phpMyAdmin
1. Open phpMyAdmin
2. Select your database
3. Go to SQL tab
4. Copy and paste each migration file content
5. Execute in order

## ✅ Verification

After running migrations, verify:

1. **All tables exist:**
```sql
SHOW TABLES LIKE '%user%';
SHOW TABLES LIKE '%loyalty%';
SHOW TABLES LIKE '%wallet%';
```

2. **Users table has new columns:**
```sql
DESCRIBE users;
```

3. **Loyalty tiers are populated:**
```sql
SELECT * FROM loyalty_tiers;
```

4. **Foreign keys are working:**
```sql
SELECT 
  TABLE_NAME,
  COLUMN_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE REFERENCED_TABLE_SCHEMA = 'citlogis_air_charters';
```

## 🔧 Troubleshooting

### Common Issues:

1. **Foreign Key Errors:**
   - Ensure referenced tables exist
   - Check data types match
   - Verify referenced data exists

2. **Duplicate Key Errors:**
   - Check for existing data conflicts
   - Clear conflicting data before migration

3. **Permission Errors:**
   - Ensure database user has ALTER, CREATE, DROP permissions

### Rollback Plan:
If something goes wrong, you can restore from your backup:
```bash
mysql -u your_username -p citlogis_air_charters < your_backup.sql
```

## 📊 New Features Added

### Loyalty System:
- Points earning and redemption
- Tier-based benefits
- Transaction history
- Expiration management

### Wallet System:
- Balance tracking
- Transaction history
- Multiple payment methods
- Refund support

### Enhanced User Experience:
- Comprehensive preferences
- Document management
- Trip history with proper relationships
- Privacy controls

## 🎯 Next Steps

After successful migration:
1. Update TypeORM entities
2. Create loyalty and wallet services
3. Update booking service to integrate loyalty
4. Test all functionality
5. Update API documentation

## 📞 Support

If you encounter issues:
1. Check the error messages carefully
2. Verify database permissions
3. Ensure all referenced tables exist
4. Check for data conflicts 
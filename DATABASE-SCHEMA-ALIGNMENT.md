# Database Schema Alignment - Bookings Table

## 🎯 **Overview**
This document explains the alignment of the TypeORM entities with the actual database schema, specifically for the bookings table.

## ✅ **Issues Found and Fixed**

### **1. Column Name Mismatch**
**Issue:** Entity expected `companyId` but database has `company_id`
**Fix:** Updated entity to map `companyId` property to `company_id` column

### **2. Missing Loyalty and Wallet Fields**
**Issue:** Database had loyalty and wallet fields that weren't in the entity
**Fix:** Added missing fields to the booking entity:
- `loyaltyPointsEarned` → `loyalty_points_earned`
- `loyaltyPointsRedeemed` → `loyalty_points_redeemed`
- `walletAmountUsed` → `wallet_amount_used`

### **3. Missing Foreign Key Constraint**
**Issue:** No foreign key constraint for `company_id` column
**Fix:** Created migration to add proper foreign key constraint

### **4. Missing Index**
**Issue:** No index on `company_id` column for performance
**Fix:** Created migration to add index for better query performance

## 📊 **Current Database Schema**

```sql
CREATE TABLE `bookings` (
  `id` varchar(255) NOT NULL,
  `userId` varchar(255) NOT NULL,
  `dealId` int(11) NOT NULL,
  `company_id` int(10) NOT NULL,           -- ← NEW FIELD
  `totalPrice` decimal(10,2) NOT NULL,
  `onboardDining` tinyint(1) DEFAULT 0,
  `groundTransportation` tinyint(1) DEFAULT 0,
  `billingRegion` varchar(100) DEFAULT NULL,
  `paymentMethod` enum('card','mpesa','wallet') DEFAULT NULL,
  `bookingStatus` enum('pending','confirmed','cancelled','completed') NOT NULL DEFAULT 'pending',
  `paymentStatus` enum('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  `referenceNumber` varchar(50) NOT NULL,
  `paymentTransactionId` varchar(255) DEFAULT NULL,
  `loyalty_points_earned` int(11) DEFAULT 0,      -- ← LOYALTY FIELD
  `loyalty_points_redeemed` int(11) DEFAULT 0,    -- ← LOYALTY FIELD
  `wallet_amount_used` decimal(10,2) DEFAULT 0.00, -- ← WALLET FIELD
  `specialRequirements` text DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6)
);
```

## 🔧 **Updated Entity Mapping**

```typescript
@Entity('bookings')
export class Booking {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  id: string;

  @Column({ name: 'userId', type: 'varchar', length: 255 })
  userId: string;

  @Column({ name: 'dealId' })
  dealId: number;

  @Column({ name: 'company_id', type: 'int' })  // ← CORRECT MAPPING
  companyId: number;

  @Column({ name: 'totalPrice', type: 'decimal', precision: 10, scale: 2 })
  totalPrice: number;

  // ... other fields ...

  @Column({ name: 'loyalty_points_earned', type: 'int', default: 0 })  // ← NEW FIELD
  loyaltyPointsEarned: number;

  @Column({ name: 'loyalty_points_redeemed', type: 'int', default: 0 })  // ← NEW FIELD
  loyaltyPointsRedeemed: number;

  @Column({ name: 'wallet_amount_used', type: 'decimal', precision: 10, scale: 2, default: 0.0 })  // ← NEW FIELD
  walletAmountUsed: number;

  // Relations
  @ManyToOne(() => ChartersCompany)
  @JoinColumn({ name: 'company_id' })  // ← CORRECT JOIN COLUMN
  company: ChartersCompany;
}
```

## 🚀 **Enhanced Features**

### **1. Loyalty Points Integration**
- **Automatic calculation:** 1 USD = 5 miles earned
- **Tracking:** Points earned and redeemed per booking
- **Timeline events:** Loyalty updates tracked in booking timeline

### **2. Wallet Integration**
- **Amount tracking:** Wallet amount used per booking
- **Net calculation:** Total price minus wallet amount used
- **Payment integration:** Seamless wallet payment processing

### **3. Company Relationship**
- **Direct access:** Company information without complex JOINs
- **Performance:** Indexed queries for company-based filtering
- **Integrity:** Foreign key constraints ensure data consistency

## 📋 **Migration Steps**

### **1. Run the Fix Migration:**
```bash
mysql -u your_username -p citlogis_air_charters < backend/migrations/15-fix-bookings-company-constraints.sql
```

### **2. Verify the Changes:**
```sql
-- Check if foreign key constraint exists
SHOW CREATE TABLE bookings;

-- Check if index exists
SHOW INDEX FROM bookings WHERE Key_name = 'idx_bookings_company_id';

-- Verify data integrity
SELECT COUNT(*) as bookings_with_company 
FROM bookings 
WHERE company_id IS NOT NULL AND company_id > 0;
```

### **3. Test the New Functionality:**
```bash
# Test booking creation with loyalty points
curl -X POST /bookings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"dealId": 123, "totalPrice": 100.00}'

# Check booking summary with loyalty info
curl -X GET /bookings/YOUR_BOOKING_ID/summary \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🎮 **Usage Examples**

### **1. Create Booking with Loyalty Tracking**
```typescript
const booking = await bookingsService.create({
  dealId: 123,
  totalPrice: 250.00, // Will earn 1,250 loyalty points (250 * 5)
  passengers: [
    { firstName: "John", lastName: "Doe", age: 30, nationality: "US" }
  ]
}, userId);

console.log(`Booking will earn ${booking.loyaltyPointsEarned} loyalty points`);
```

### **2. Update Loyalty and Wallet Usage**
```typescript
// When user redeems loyalty points or uses wallet
await bookingsService.updateLoyaltyAndWallet(
  bookingId,
  500, // loyalty points redeemed
  50.00 // wallet amount used
);
```

### **3. Get Booking Summary**
```typescript
const summary = await bookingsService.getBookingSummary(bookingId);
console.log(`Total: $${summary.totalPrice}`);
console.log(`Wallet used: $${summary.walletAmountUsed}`);
console.log(`Net amount: $${summary.netAmount}`);
console.log(`Loyalty earned: ${summary.loyaltyPointsEarned}`);
console.log(`Loyalty redeemed: ${summary.loyaltyPointsRedeemed}`);
```

## 🔒 **Business Rules**

### **Loyalty Points:**
1. **Earning:** 1 USD spent = 5 loyalty points earned
2. **Redemption:** 100 loyalty points = $1 off
3. **Tracking:** Both earned and redeemed points tracked per booking
4. **Timeline:** All loyalty activities logged in booking timeline

### **Wallet Integration:**
1. **Usage tracking:** Wallet amount used per booking
2. **Net calculation:** Total price minus wallet amount
3. **Payment flow:** Seamless integration with payment system
4. **Audit trail:** All wallet transactions tracked

### **Company Relationship:**
1. **Direct access:** Company information available directly
2. **Performance:** Indexed queries for fast company filtering
3. **Integrity:** Foreign key constraints ensure data consistency
4. **Cascade updates:** Company changes propagate correctly

## 🚀 **Benefits Achieved**

1. **Schema Alignment:** Entity matches actual database structure
2. **Enhanced Features:** Loyalty points and wallet integration
3. **Better Performance:** Indexed company queries
4. **Data Integrity:** Proper foreign key constraints
5. **Complete Tracking:** All loyalty and wallet activities logged
6. **Simplified Queries:** Direct company relationship access

---

**Status: ✅ COMPLETED**
The booking system is now fully aligned with the database schema and includes enhanced loyalty and wallet functionality! 
I'll analyze your current database schema and explain what tables I'll use for the Paystack integration with vendor subaccounts.



[8 tools called]

## �� **DATABASE SCHEMA ANALYSIS FOR PAYSTACK INTEGRATION**

Based on my analysis of your `db.sql`, here's what you **already have** and what I'll **use/modify** for Paystack integration:

### ✅ **EXISTING TABLES I'LL USE**

#### 1. **`charters_companies` (Vendor Airlines)**
- **ID**: `id` (int) - This will be your **vendor ID**
- **Current Data**: 24 active airline companies (Aib Aviation, SPAir Services, Entebbe Airways, etc.)
- **Key Fields**:
  - `companyName` - Airline name
  - `email` - Contact email
  - `revenueShareRate` - Commission rate (0.00-12.00%)
  - `status` - 'active' companies only

#### 2. **`company_payment_accounts` (Payment Provider Accounts)**
- **Current**: Supports Stripe and M-Pesa
- **What I'll modify**: Add Paystack support
- **Key Fields**:
  - `companyId` - Links to `charters_companies.id`
  - `paymentProvider` - Currently 'stripe','mpesa' → Add 'paystack'
  - `accountId` - Will store Paystack subaccount ID
  - `accountStatus` - 'pending','active','suspended','rejected'

#### 3. **`payments` (Transaction Records)**
- **Current**: Tracks all payments
- **What I'll modify**: Add Paystack-specific fields
- **Key Fields**:
  - `bookingId` - Links to booking
  - `company_id` - Vendor airline ID
  - `totalAmount` - Total payment
  - `platformFee` - Your commission
  - `companyAmount` - Vendor's share
  - `paymentMethod` - Currently 'card','mpesa','wallet' → Add 'paystack'

#### 4. **`bookings` & `charter_bookings`**
- **Current**: Booking records
- **What I'll use**: Link payments to bookings

### 🔧 **MODIFICATIONS NEEDED**

#### 1. **Update `company_payment_accounts` table**:
```sql
ALTER TABLE `company_payment_accounts` 
MODIFY COLUMN `paymentProvider` enum('stripe','mpesa','paystack') NOT NULL;
```

#### 2. **Update `payments` table**:
```sql
ALTER TABLE `payments` 
MODIFY COLUMN `paymentMethod` enum('card','mpesa','wallet','paystack') NOT NULL;
```

#### 3. **Add Paystack-specific fields to `company_payment_accounts`**:
```sql
ALTER TABLE `company_payment_accounts` 
ADD COLUMN `paystackSubaccountId` varchar(255) DEFAULT NULL,
ADD COLUMN `paystackSubaccountCode` varchar(255) DEFAULT NULL,
ADD COLUMN `paystackSplitCode` varchar(255) DEFAULT NULL;
```

### 🏢 **VENDOR IDS I'LL USE**

From your existing data, here are the **active vendor airline IDs**:

| ID | Company Name | Revenue Share | Status |
|----|-------------|---------------|---------|
| 5 | Aib Aviation | 12.00% | active |
| 11 | SPAir Services | 0.00% | active |
| 12 | Entebbe Airways | 0.00% | active |
| 13 | Ralex Aviation | 0.00% | active |
| 15 | Yellow Wings | 0.00% | active |
| 16 | Transonic Aviation | 0.00% | active |
| 17 | Scenic Air Safaris | 0.00% | active |
| 18 | Aberdair Aviation | 0.00% | active |
| 19 | Tropicair | 0.00% | active |
| 20 | AirKenya | 0.00% | active |
| 21 | Aero Link | 0.00% | active |
| 22 | Safarilink | 0.00% | active |
| 23 | AMREF Aviation | 0.00% | active |
| 24 | 748 Air Services | 0.00% | active |
| 25 | Phoenix Aviation | 0.00% | active |
| 26 | Misk Air | 0.00% | active |
| 27 | Bar Aviation | 0.00% | active |
| 28 | Fly KEA | 0.00% | active |

### �� **PAYSTACK SUBACCOUNT STRATEGY**

For each vendor airline, I'll create:
1. **Paystack Subaccount** - Each airline gets their own subaccount
2. **Split Code** - Automatic commission splitting
3. **Payment Flow**: 
   - User pays → Paystack splits automatically
   - Vendor gets their share directly
   - Your platform gets commission

### 🔄 **PAYMENT FLOW WITH EXISTING SCHEMA**

```
User Payment → Paystack → Split Payment:
├── Vendor Airline (company_id) → Gets companyAmount
└── Your Platform → Gets platformFee
```

**Example**: $100 payment for Aib Aviation (12% commission)
- Total: $100
- Platform Fee: $12 (12%)
- Company Amount: $88 (88%)

Would you like me to proceed with implementing the Paystack integration using this existing schema structure?
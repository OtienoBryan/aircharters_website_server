# Loyalty Points System Documentation

## 🎯 **Overview**
Our loyalty points system uses **miles** as the currency, with a simple and transparent conversion rate system.

## 💰 **Conversion Rates**

### **Earning Miles:**
- **1 USD spent = 5 miles earned**
- Standard rate regardless of booking type
- Miles are earned on the total booking amount

### **Redeeming Miles:**
- **100 miles = $1 off future bookings**
- Minimum redemption: 100 miles
- Maximum redemption: Based on available miles

## 📊 **Examples**

### **Earning Examples:**
| USD Spent | Miles Earned | Description |
|-----------|--------------|-------------|
| $10       | 50 miles     | Small booking |
| $50       | 250 miles    | Medium booking |
| $100      | 500 miles    | Large booking |
| $500      | 2,500 miles  | Premium booking |

### **Redemption Examples:**
| Miles Redeemed | USD Discount | Description |
|----------------|--------------|-------------|
| 100 miles      | $1 off       | Minimum redemption |
| 500 miles      | $5 off       | Medium discount |
| 1,000 miles    | $10 off      | Large discount |
| 2,500 miles    | $25 off      | Premium discount |

## 🔧 **API Endpoints**

### **Loyalty Summary**
```http
GET /wallet/loyalty/summary
```
**Response:**
```json
{
  "currentMiles": 1250,
  "potentialUsdDiscount": 12.50,
  "milesNeededForNextDollar": 50,
  "conversionRates": {
    "milesPerUsd": 5,
    "usdPer100Miles": 1
  },
  "examples": {
    "spending10Usd": 50,
    "spending100Usd": 500,
    "redeeming100Miles": 1,
    "redeeming500Miles": 5
  }
}
```

### **Earn Miles from Spending**
```http
POST /wallet/loyalty/earn-from-spending
Content-Type: application/json

{
  "usdAmount": 100,
  "description": "Flight booking from NYC to LAX",
  "bookingId": "booking_123",
  "expiresAt": "2024-12-31T23:59:59Z"
}
```
**Response:**
```json
{
  "id": "tx_1234567890_abc123",
  "transactionType": "loyalty_earned",
  "amount": 0,
  "pointsAmount": 500,
  "description": "Flight booking from NYC to LAX - Earned 500 miles from $100 spending",
  "status": "completed",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### **Redeem Miles for Discount**
```http
POST /wallet/loyalty/redeem
Content-Type: application/json

{
  "miles": 500,
  "description": "Discount on flight booking",
  "bookingId": "booking_456"
}
```
**Response:**
```json
{
  "id": "tx_1234567890_def456",
  "transactionType": "loyalty_redeemed",
  "amount": 5,
  "pointsAmount": -500,
  "description": "Discount on flight booking - Redeemed 500 miles for $5 discount",
  "status": "completed",
  "createdAt": "2024-01-15T11:00:00Z"
}
```

### **Get Loyalty Transactions**
```http
GET /wallet/loyalty/transactions?page=1&limit=10
```
**Response:**
```json
{
  "transactions": [
    {
      "id": "tx_1234567890_abc123",
      "type": "loyalty_earned",
      "pointsAmount": 500,
      "description": "Flight booking - Earned 500 miles from $100 spending",
      "pointsBefore": 0,
      "pointsAfter": 500,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

## 🎮 **Integration Examples**

### **1. Booking Completion (Earn Miles)**
```javascript
// When a booking is completed
const bookingAmount = 250; // USD
const response = await fetch('/wallet/loyalty/earn-from-spending', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({
    usdAmount: bookingAmount,
    description: `Flight booking ${bookingId}`,
    bookingId: bookingId
  })
});

// User earns 1,250 miles (250 * 5)
```

### **2. Apply Discount to New Booking**
```javascript
// Before creating a new booking
const loyaltySummary = await fetch('/wallet/loyalty/summary', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const { currentMiles, potentialUsdDiscount } = await loyaltySummary.json();

if (currentMiles >= 100) {
  // Offer discount to user
  const discountAmount = Math.min(potentialUsdDiscount, bookingAmount * 0.1); // Max 10% discount
  const milesToRedeem = Math.ceil(discountAmount * 100); // Convert USD to miles
  
  if (milesToRedeem <= currentMiles) {
    // Apply discount
    const response = await fetch('/wallet/loyalty/redeem', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        miles: milesToRedeem,
        description: `Discount on booking ${newBookingId}`,
        bookingId: newBookingId
      })
    });
  }
}
```

### **3. Display Loyalty Status**
```javascript
// Show user their loyalty status
const summary = await fetch('/wallet/loyalty/summary', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const { currentMiles, potentialUsdDiscount, milesNeededForNextDollar } = await summary.json();

console.log(`You have ${currentMiles} miles`);
console.log(`Worth $${potentialUsdDiscount} in discounts`);
console.log(`Need ${milesNeededForNextDollar} more miles for next $1 discount`);
```

## ⚙️ **Configuration**

### **System Constants:**
```typescript
MILES_PER_USD = 5;           // 1 USD = 5 miles
USD_PER_100_MILES = 1;       // 100 miles = $1 off
MILES_PER_DOLLAR_OFF = 100;  // 100 miles = $1 off
```

### **Currency Support:**
- **Base currency:** USD
- **Other currencies:** Converted to USD at current exchange rate
- **Miles earned:** Based on USD equivalent

## 🔒 **Business Rules**

### **Earning Rules:**
1. Miles earned on total booking amount (excluding taxes/fees)
2. Minimum earning: 1 mile (any amount > $0.20)
3. Miles earned immediately upon booking completion
4. Miles can expire (configurable per transaction)

### **Redemption Rules:**
1. Minimum redemption: 100 miles
2. Maximum redemption: Available miles
3. Discount applied to wallet balance
4. Can be used for any future booking
5. No partial redemptions (must be in 100-mile increments)

### **Expiration Rules:**
1. Miles expire after 12 months (configurable)
2. FIFO (First In, First Out) expiration
3. Expired miles are automatically removed
4. Users notified before expiration

## 📈 **Loyalty Tiers**

### **Bronze (0-999 miles):**
- Basic earning rate (1 USD = 5 miles)
- Standard support

### **Silver (1,000-4,999 miles):**
- 25% bonus miles (1 USD = 6.25 miles)
- 5% discount on bookings
- Priority email support

### **Gold (5,000-19,999 miles):**
- 50% bonus miles (1 USD = 7.5 miles)
- 10% discount on bookings
- Free upgrades
- Priority booking
- Phone support

### **Platinum (20,000+ miles):**
- 100% bonus miles (1 USD = 10 miles)
- 15% discount on bookings
- Free upgrades
- Priority booking
- Dedicated support
- Exclusive deals

## 🚀 **Benefits**

1. **Simple & Transparent:** Clear conversion rates
2. **Immediate Value:** Miles earned on every booking
3. **Flexible Redemption:** Use on any future booking
4. **Tier Benefits:** Additional perks for frequent travelers
5. **Complete Audit Trail:** All transactions tracked
6. **Real-time Updates:** Instant balance updates

---

**Status: ✅ IMPLEMENTED**
The loyalty points system is fully functional and ready for production use! 
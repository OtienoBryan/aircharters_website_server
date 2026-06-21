# Service Modularization & Payment-Based Points/Reference Population

## Overview

This document outlines the modularization of service files and the implementation of payment-based points and reference number population for the Air Charters booking system.

## Key Changes

### 1. Service Modularization

The large service files have been broken down into smaller, focused services:

#### Bookings Module
- **`BookingPaymentService`** - Handles payment processing, points earning, and reference generation
- **`BookingTimelineService`** - Manages booking timeline events and history
- **`BookingQueryService`** - Handles all booking queries and data retrieval
- **`BookingsService`** - Main orchestrator service that coordinates other services

#### Users Module
- **`UserProfileService`** - Manages user profile and preferences
- **`UsersService`** - Main service that coordinates profile operations

### 2. Payment-Based Points & Reference Population

**Before**: Points and reference numbers were generated immediately when creating a booking
**After**: Points and reference numbers are only generated when payment is successfully processed

#### Benefits:
- **Data Integrity**: No orphaned reference numbers for unpaid bookings
- **Accurate Points**: Points are only earned when money is actually spent
- **Better UX**: Users see actual earned points, not potential points
- **Audit Trail**: Clear separation between booking creation and payment confirmation

## Implementation Details

### Booking Creation Flow

1. **Create Booking** (`BookingsService.create()`)
   - Generates booking ID only
   - Sets `referenceNumber: null`
   - Sets `loyaltyPointsEarned: 0`
   - Status: `PENDING`
   - Payment Status: `PENDING`

2. **Payment Processing** (`BookingPaymentService.processPayment()`)
   - Generates reference number
   - Calculates and assigns loyalty points (1 USD = 5 miles)
   - Updates user's loyalty points balance
   - Creates timeline events
   - Status: `CONFIRMED`
   - Payment Status: `PAID`

### Service Architecture

```
BookingsController
    ↓
BookingsService (Orchestrator)
    ↓
├── BookingPaymentService (Payment & Points)
├── BookingTimelineService (Timeline Events)
└── BookingQueryService (Data Retrieval)
```

### Key Methods

#### BookingPaymentService
- `processPayment()` - Process payment and populate points/reference
- `updatePaymentStatus()` - Update payment status without processing
- `processRefund()` - Handle refunds and adjust loyalty points

#### BookingTimelineService
- `createTimelineEvent()` - Create timeline events
- `getBookingTimeline()` - Retrieve booking timeline
- `getTimelineEventsByType()` - Filter timeline by event type

#### BookingQueryService
- `findAll()` - Get all bookings with filters
- `findOne()` - Get booking by ID
- `findByReference()` - Get booking by reference number
- `hasExistingBooking()` - Check for duplicate bookings
- `getBookingStats()` - Get booking statistics

## Database Changes

### Booking Entity Updates
- `referenceNumber` can be null initially
- `loyaltyPointsEarned` starts at 0
- `paymentTransactionId` stores payment reference

### Timeline Events
- `PAYMENT_PROCESSED` - When payment is successful
- `LOYALTY_UPDATED` - When points are earned/redeemed
- `BOOKING_CONFIRMED` - When booking is confirmed after payment

## API Endpoints

### New Payment Processing Endpoints

#### Process Payment
```http
POST /bookings/:id/process-payment
{
  "paymentTransactionId": "tx_123456",
  "paymentMethod": "card",
  "amount": 1500.00
}
```

#### Process Refund
```http
POST /bookings/:id/refund
{
  "refundAmount": 750.00,
  "refundReason": "Customer cancellation"
}
```

## Loyalty Points System

### Earning Points
- **Rate**: 1 USD spent = 5 miles earned
- **When**: Only when payment is successfully processed
- **Storage**: Updated in user's loyalty_points field
- **Transaction**: Recorded in wallet_transactions table

### Redeeming Points
- **Rate**: 100 miles = $1 discount
- **Process**: Points are deducted from user balance
- **Validation**: Check sufficient points before redemption

### Refund Handling
- **Proportional Deduction**: Points deducted proportionally to refund amount
- **Example**: $1000 booking earns 5000 miles, $500 refund deducts 2500 miles

## Error Handling

### Duplicate Booking Prevention
- Check for existing pending/confirmed bookings before creation
- Prevents double-clicking issues

### Payment Validation
- Verify booking exists and is in pending status
- Check payment hasn't already been processed
- Validate payment amount matches booking total

### Transaction Safety
- All payment operations use database transactions
- Rollback on any failure
- Timeline events created within same transaction

## Testing Scenarios

### 1. Normal Booking Flow
1. Create booking (no reference, no points)
2. Process payment (generate reference, earn points)
3. Verify user loyalty points increased
4. Check timeline events created

### 2. Refund Flow
1. Process refund for confirmed booking
2. Verify loyalty points deducted proportionally
3. Check booking status updated to CANCELLED
4. Verify timeline events recorded

### 3. Duplicate Prevention
1. Try to create booking for same deal/user
2. Verify error returned
3. Check no duplicate bookings created

## Migration Notes

### Existing Data
- Existing bookings with reference numbers will continue to work
- Loyalty points will be calculated on next payment
- Timeline events will be created for new operations

### Backward Compatibility
- All existing API endpoints remain functional
- New endpoints are additive
- No breaking changes to existing functionality

## Performance Considerations

### Database Queries
- Optimized queries with proper joins
- Indexed fields for fast lookups
- Pagination for large result sets

### Transaction Management
- Minimal transaction scope
- Proper error handling and rollback
- Connection pooling for concurrent requests

## Security

### Payment Processing
- Validate user ownership of booking
- Verify payment amounts match booking totals
- Audit trail for all payment operations

### Data Access
- User can only access their own bookings
- Admin endpoints properly protected
- Input validation on all endpoints

## Future Enhancements

### Potential Improvements
1. **Async Payment Processing** - Handle webhook callbacks
2. **Partial Refunds** - Support for partial booking cancellations
3. **Points Expiration** - Automatic expiration of old points
4. **Tier System** - Different earning rates based on user tier
5. **Promotional Points** - Bonus points for special events

### Monitoring
1. **Payment Success Rate** - Track payment processing success
2. **Points Redemption Rate** - Monitor loyalty program usage
3. **Booking Conversion Rate** - Track pending to confirmed ratio
4. **Error Rates** - Monitor for payment processing issues

## Conclusion

The modularization provides better code organization and maintainability, while the payment-based points system ensures data accuracy and provides a better user experience. The system is now more robust, scalable, and ready for production use. 
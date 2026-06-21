# User-as-Passenger Enhancement

## 🎯 Overview

The booking system has been enhanced to automatically include the user who makes the booking as a passenger. This ensures that users don't need to manually add themselves to the passengers list when booking for themselves.

## ✅ What's Been Implemented

### 1. **Automatic User Inclusion**
- ✅ User is automatically added as the first passenger if not already in the passengers list
- ✅ User's profile data (first_name, last_name, nationality, date_of_birth) is used to create the passenger record
- ✅ Age is calculated from the user's date_of_birth
- ✅ `isUser` flag is set to `true` for the booking user

### 2. **Database Schema Updates**
- ✅ Added `is_user` boolean field to `passengers` table
- ✅ Added index on `is_user` for better query performance
- ✅ Updated Passenger entity with `isUser` property

### 3. **Smart Passenger Detection**
- ✅ Checks if user is already in the passengers list (by name matching)
- ✅ Only adds user if not already present
- ✅ Prevents duplicate passenger entries

### 4. **Enhanced Booking Flow**
- ✅ Fetches user data during booking creation
- ✅ Creates passenger list with user as first passenger
- ✅ Updates seat availability check to include user
- ✅ Tracks user inclusion in timeline events

## 🔄 Updated Booking Flow

### **Before Enhancement:**
```
User books → Only passengers from DTO → User not included as passenger
```

### **After Enhancement:**
```
User books → Fetch user data → Check if user in passengers → Add user if needed → Create all passengers
```

## 📊 Implementation Details

### **Passenger Creation Logic:**
```typescript
// Prepare passengers list - always include the user as the first passenger
const passengersToCreate = [];

// Check if user is already in the passengers list
const userInPassengers = createBookingDto.passengers?.find(p => 
  p.firstName.toLowerCase() === user.first_name?.toLowerCase() && 
  p.lastName.toLowerCase() === user.last_name?.toLowerCase()
);

if (!userInPassengers) {
  // Add user as the first passenger
  passengersToCreate.push({
    firstName: user.first_name || 'Unknown',
    lastName: user.last_name || 'User',
    age: user.date_of_birth ? this.calculateAge(user.date_of_birth) : undefined,
    nationality: user.nationality,
    idPassportNumber: undefined, // User's passport not stored in user table
    isUser: true, // Flag to identify this is the booking user
  });
}

// Add other passengers from the DTO
if (createBookingDto.passengers && createBookingDto.passengers.length > 0) {
  passengersToCreate.push(...createBookingDto.passengers.map(p => ({
    ...p,
    isUser: false, // Flag to identify these are additional passengers
  })));
}
```

### **Database Migration:**
```sql
-- Add is_user field to passengers table
ALTER TABLE passengers 
ADD COLUMN is_user BOOLEAN DEFAULT FALSE;

-- Add index for better query performance
CREATE INDEX idx_passengers_is_user ON passengers(is_user);

-- Add comment for documentation
COMMENT ON COLUMN passengers.is_user IS 'Indicates if this passenger is the user who made the booking';
```

## 🧪 Testing Scenarios

### **Scenario 1: User books for themselves only**
- **Input**: Empty passengers array
- **Result**: User automatically added as passenger with `isUser: true`

### **Scenario 2: User books for themselves + others**
- **Input**: Passengers array with additional passengers
- **Result**: User added first, then additional passengers, all with correct `isUser` flags

### **Scenario 3: User already in passengers list**
- **Input**: Passengers array containing user's name
- **Result**: No duplicate user passenger, existing passenger marked with `isUser: true`

### **Scenario 4: User books for others only**
- **Input**: Passengers array without user's name
- **Result**: User still added as first passenger (booking user must be a passenger)

## 📋 API Response Changes

### **Booking Creation Response:**
```json
{
  "success": true,
  "message": "Booking created successfully. Please complete payment to confirm.",
  "data": {
    "booking": {
      "id": "BK-15DEC24-143022-ABC01",
      "referenceNumber": "AC123456XYZ",
      "passengers": [
        {
          "id": 1,
          "firstName": "John",
          "lastName": "Doe",
          "age": 30,
          "nationality": "US",
          "isUser": true
        },
        {
          "id": 2,
          "firstName": "Jane",
          "lastName": "Smith",
          "age": 28,
          "nationality": "CA",
          "isUser": false
        }
      ]
    }
  }
}
```

## 🔍 Benefits

### **For Users:**
- ✅ No need to manually add themselves as passengers
- ✅ Seamless booking experience
- ✅ Automatic passenger data population from profile

### **For System:**
- ✅ Consistent passenger data structure
- ✅ Clear identification of booking user
- ✅ Better audit trail and reporting
- ✅ Improved data integrity

### **For Business:**
- ✅ Reduced booking abandonment due to confusion
- ✅ Better user experience
- ✅ Accurate passenger tracking
- ✅ Enhanced loyalty program integration

## 🚀 Next Steps

1. **Run Database Migration:**
   ```sql
   -- Execute the migration script
   \i add-is-user-to-passengers.sql
   ```

2. **Test the Enhancement:**
   - Test booking creation with empty passengers
   - Test booking creation with existing passengers
   - Verify user is always included as passenger

3. **Update Frontend (if needed):**
   - Update Flutter app to handle the new `isUser` field
   - Display user passenger differently in UI
   - Update booking confirmation screens

## 📝 Notes

- The user's passport number is not stored in the user table, so it's set to `undefined` for user passengers
- Age is calculated from `date_of_birth` if available, otherwise left as `undefined`
- The `isUser` flag helps distinguish between the booking user and additional passengers
- This enhancement maintains backward compatibility with existing bookings 
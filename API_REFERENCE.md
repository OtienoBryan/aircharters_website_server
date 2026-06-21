# Air Charters API Reference

## 🔗 Base URL
```
http://localhost:3000/api
```

## 🔐 Authentication

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## 📋 API Endpoints

### Authentication

#### POST `/auth/login`
Authenticate user with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "USER"
    },
    "accessToken": "jwt_token_here",
    "refreshToken": "refresh_token_here"
  }
}
```

#### POST `/auth/register`
Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "accessToken": "jwt_token_here",
    "refreshToken": "refresh_token_here"
  }
}
```

#### POST `/auth/refresh`
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "new_jwt_token_here"
  }
}
```

#### GET `/auth/profile`
Get current user profile (requires authentication).

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "role": "USER",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### POST `/auth/logout`
Logout user (requires authentication).

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Users

#### GET `/users`
Get all users (admin only).

**Query Parameters:**
- `page` (number): Page number for pagination
- `limit` (number): Number of items per page
- `search` (string): Search term for filtering

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "role": "USER",
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

#### GET `/users/:id`
Get user by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "role": "USER",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### PUT `/users/:id`
Update user information.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "role": "USER",
    "isActive": true,
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### DELETE `/users/:id`
Delete user (admin only).

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

### Bookings

#### GET `/bookings`
Get all bookings for authenticated user.

**Query Parameters:**
- `page` (number): Page number for pagination
- `limit` (number): Number of items per page
- `status` (string): Filter by booking status
- `dateFrom` (string): Filter by departure date from
- `dateTo` (string): Filter by departure date to

**Response:**
```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "id": "uuid",
        "charterDeal": {
          "id": "uuid",
          "title": "Luxury Charter to Paris",
          "aircraft": {
            "name": "Gulfstream G650",
            "capacity": 12
          }
        },
        "status": "CONFIRMED",
        "totalAmount": 50000.00,
        "departureDate": "2024-01-15",
        "returnDate": "2024-01-20",
        "passengers": [
          {
            "id": "uuid",
            "firstName": "John",
            "lastName": "Doe",
            "passportNumber": "A12345678"
          }
        ],
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5
    }
  }
}
```

#### GET `/bookings/:id`
Get booking details by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "charterDeal": {
      "id": "uuid",
      "title": "Luxury Charter to Paris",
      "description": "Experience luxury travel to Paris",
      "aircraft": {
        "id": "uuid",
        "name": "Gulfstream G650",
        "capacity": 12,
        "images": ["image_url_1", "image_url_2"]
      },
      "route": {
        "departure": "JFK",
        "destination": "CDG",
        "duration": "7h 30m"
      }
    },
    "status": "CONFIRMED",
    "totalAmount": 50000.00,
    "departureDate": "2024-01-15",
    "returnDate": "2024-01-20",
    "passengers": [
      {
        "id": "uuid",
        "firstName": "John",
        "lastName": "Doe",
        "passportNumber": "A12345678",
        "dateOfBirth": "1990-01-01"
      }
    ],
    "payment": {
      "id": "uuid",
      "status": "SUCCESS",
      "amount": 50000.00,
      "currency": "USD",
      "paymentMethod": "card"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### POST `/bookings`
Create new booking.

**Request Body:**
```json
{
  "charterDealId": "uuid",
  "passengers": [
    {
      "firstName": "John",
      "lastName": "Doe",
      "passportNumber": "A12345678",
      "dateOfBirth": "1990-01-01"
    }
  ],
  "departureDate": "2024-01-15",
  "returnDate": "2024-01-20"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "PENDING",
    "totalAmount": 50000.00,
    "departureDate": "2024-01-15",
    "returnDate": "2024-01-20",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### PUT `/bookings/:id`
Update booking status (admin only).

**Request Body:**
```json
{
  "status": "CONFIRMED"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "CONFIRMED",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Charter Deals

#### GET `/charter-deals`
Get all available charter deals.

**Query Parameters:**
- `page` (number): Page number for pagination
- `limit` (number): Number of items per page
- `search` (string): Search term for filtering
- `departure` (string): Filter by departure location
- `destination` (string): Filter by destination
- `dateFrom` (string): Filter by available date from
- `dateTo` (string): Filter by available date to
- `priceMin` (number): Minimum price filter
- `priceMax` (number): Maximum price filter

**Response:**
```json
{
  "success": true,
  "data": {
    "deals": [
      {
        "id": "uuid",
        "title": "Luxury Charter to Paris",
        "description": "Experience luxury travel to Paris",
        "price": 50000.00,
        "currency": "USD",
        "aircraft": {
          "id": "uuid",
          "name": "Gulfstream G650",
          "capacity": 12,
          "images": ["image_url_1", "image_url_2"]
        },
        "route": {
          "departure": "JFK",
          "destination": "CDG",
          "duration": "7h 30m"
        },
        "availability": [
          {
            "date": "2024-01-15",
            "available": true
          }
        ],
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

#### GET `/charter-deals/:id`
Get specific charter deal details.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Luxury Charter to Paris",
    "description": "Experience luxury travel to Paris",
    "price": 50000.00,
    "currency": "USD",
    "aircraft": {
      "id": "uuid",
      "name": "Gulfstream G650",
      "capacity": 12,
      "images": ["image_url_1", "image_url_2"],
      "amenities": ["WiFi", "Luxury Seating", "Catering"]
    },
    "route": {
      "departure": "JFK",
      "destination": "CDG",
      "duration": "7h 30m",
      "distance": "3635 miles"
    },
    "availability": [
      {
        "date": "2024-01-15",
        "available": true,
        "price": 50000.00
      }
    ],
    "terms": "Terms and conditions...",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### POST `/charter-deals`
Create new charter deal (admin only).

**Request Body:**
```json
{
  "title": "Luxury Charter to Paris",
  "description": "Experience luxury travel to Paris",
  "price": 50000.00,
  "currency": "USD",
  "aircraftId": "uuid",
  "departure": "JFK",
  "destination": "CDG",
  "duration": "7h 30m",
  "terms": "Terms and conditions..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Luxury Charter to Paris",
    "price": 50000.00,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Payments

#### POST `/payments/create-payment-intent`
Create Stripe payment intent.

**Request Body:**
```json
{
  "amount": 5000000,
  "currency": "usd",
  "bookingId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "clientSecret": "pi_1234567890_secret_1234567890",
    "paymentIntentId": "pi_1234567890"
  }
}
```

#### POST `/payments/confirm-payment`
Confirm payment with payment method.

**Request Body:**
```json
{
  "paymentIntentId": "pi_1234567890",
  "bookingId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "SUCCESS",
    "amount": 50000.00,
    "currency": "USD",
    "paymentMethod": "card",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### GET `/payments/history`
Get payment history for user.

**Query Parameters:**
- `page` (number): Page number for pagination
- `limit` (number): Number of items per page
- `status` (string): Filter by payment status

**Response:**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "uuid",
        "amount": 50000.00,
        "currency": "USD",
        "status": "SUCCESS",
        "paymentMethod": "card",
        "booking": {
          "id": "uuid",
          "title": "Luxury Charter to Paris"
        },
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

### Passengers

#### GET `/passengers`
Get passengers for authenticated user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "passportNumber": "A12345678",
      "dateOfBirth": "1990-01-01",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### POST `/passengers`
Add new passenger.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "passportNumber": "A12345678",
  "dateOfBirth": "1990-01-01"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "passportNumber": "A12345678",
    "dateOfBirth": "1990-01-01",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### PUT `/passengers/:id`
Update passenger information.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "passportNumber": "A12345678",
  "dateOfBirth": "1990-01-01"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "passportNumber": "A12345678",
    "dateOfBirth": "1990-01-01",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### DELETE `/passengers/:id`
Delete passenger.

**Response:**
```json
{
  "success": true,
  "message": "Passenger deleted successfully"
}
```

### Aircraft Availability

#### GET `/aircraft-availability`
Get aircraft availability for specific dates.

**Query Parameters:**
- `dateFrom` (string): Start date (YYYY-MM-DD)
- `dateTo` (string): End date (YYYY-MM-DD)
- `aircraftId` (string): Filter by specific aircraft

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "aircraft": {
        "id": "uuid",
        "name": "Gulfstream G650",
        "capacity": 12
      },
      "date": "2024-01-15",
      "available": true,
      "price": 50000.00,
      "currency": "USD"
    }
  ]
}
```

#### POST `/aircraft-availability`
Create availability slot (admin only).

**Request Body:**
```json
{
  "aircraftId": "uuid",
  "date": "2024-01-15",
  "available": true,
  "price": 50000.00,
  "currency": "USD"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "date": "2024-01-15",
    "available": true,
    "price": 50000.00,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Locations

#### GET `/locations`
Get all locations (airports).

**Query Parameters:**
- `search` (string): Search term for filtering
- `type` (string): Filter by location type (airport, city)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "John F. Kennedy International Airport",
      "code": "JFK",
      "city": "New York",
      "country": "United States",
      "type": "airport"
    }
  ]
}
```

### Wallet

#### GET `/wallet/balance`
Get user wallet balance.

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": 1000.00,
    "currency": "USD"
  }
}
```

#### GET `/wallet/transactions`
Get wallet transaction history.

**Query Parameters:**
- `page` (number): Page number for pagination
- `limit` (number): Number of items per page
- `type` (string): Filter by transaction type

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "uuid",
        "type": "CREDIT",
        "amount": 1000.00,
        "currency": "USD",
        "description": "Payment for booking",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5
    }
  }
}
```

## 🔄 Error Responses

### Standard Error Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": "Additional error details"
  }
}
```

### Common Error Codes

#### Authentication Errors
- `UNAUTHORIZED` (401): Invalid or missing authentication token
- `FORBIDDEN` (403): Insufficient permissions
- `TOKEN_EXPIRED` (401): JWT token has expired
- `INVALID_CREDENTIALS` (401): Invalid email or password

#### Validation Errors
- `VALIDATION_ERROR` (400): Request validation failed
- `MISSING_REQUIRED_FIELD` (400): Required field is missing
- `INVALID_FORMAT` (400): Invalid data format

#### Resource Errors
- `NOT_FOUND` (404): Resource not found
- `ALREADY_EXISTS` (409): Resource already exists
- `CONFLICT` (409): Resource conflict

#### Payment Errors
- `PAYMENT_FAILED` (400): Payment processing failed
- `INSUFFICIENT_FUNDS` (400): Insufficient funds
- `PAYMENT_METHOD_INVALID` (400): Invalid payment method

#### Server Errors
- `INTERNAL_SERVER_ERROR` (500): Internal server error
- `SERVICE_UNAVAILABLE` (503): Service temporarily unavailable

## 📊 Rate Limiting

### Rate Limits
- **Authentication endpoints**: 5 requests per minute
- **General API endpoints**: 100 requests per minute
- **Payment endpoints**: 10 requests per minute

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## 🔐 Security Headers

### CORS Headers
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

### Security Headers
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## 📝 Pagination

### Pagination Format
```json
{
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Pagination Headers
```
X-Pagination-Page: 1
X-Pagination-Limit: 10
X-Pagination-Total: 100
X-Pagination-TotalPages: 10
```

## 🔍 Search and Filtering

### Search Parameters
- `search`: General search term
- `q`: Alternative search parameter
- `query`: Query string for complex searches

### Filtering Parameters
- `status`: Filter by status
- `dateFrom`: Filter by start date
- `dateTo`: Filter by end date
- `priceMin`: Minimum price filter
- `priceMax`: Maximum price filter

### Sorting Parameters
- `sort`: Field to sort by
- `order`: Sort order (asc, desc)

### Example Query
```
GET /api/bookings?page=1&limit=10&status=CONFIRMED&dateFrom=2024-01-01&sort=createdAt&order=desc
```

---

*Last Updated: [Current Date]*
*API Version: 1.0.0* 
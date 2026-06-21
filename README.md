# Air Charters Backend API

A comprehensive NestJS backend API for the Air Charters platform, providing robust booking management, payment processing, and multi-tenant architecture.

## 🚀 Features

- **Firebase Authentication Integration** - Secure user authentication with Firebase
- **Multi-tenant Architecture** - Support for multiple charter companies
- **Role-based Access Control** - Superadmin, CIT Admin, Company Admin, Agent roles
- **Payment Processing** - Stripe and Flutterwave integration
- **Booking Management** - Complete booking workflow with validation
- **Aircraft Management** - Aircraft registration, availability, and scheduling
- **Pilot Management** - Pilot assignments, calendar, and payments
- **File Upload** - Cloudinary integration for image/document storage
- **Email Notifications** - Automated email notifications
- **Real-time Notifications** - WebSocket support for real-time updates
- **Analytics & Reporting** - Comprehensive analytics for admins
- **API Documentation** - Swagger/OpenAPI documentation

## 🏗️ Architecture

```
src/
├── common/                 # Shared components
│   ├── entities/          # TypeORM entities
│   ├── guards/            # Authentication guards
│   ├── decorators/        # Custom decorators
│   └── interceptors/      # Request/response interceptors
├── config/                # Configuration files
│   └── database/          # Database configuration
├── modules/               # Feature modules
│   ├── auth/              # Authentication & authorization
│   ├── users/             # User management
│   ├── companies/         # Company management
│   ├── aircraft/          # Aircraft management
│   ├── bookings/          # Booking management
│   ├── payments/          # Payment processing
│   ├── pilots/            # Pilot management
│   ├── admin/             # Admin operations
│   ├── notifications/     # Notification system
│   ├── file-upload/       # File upload service
│   └── email/             # Email service
└── database/              # Database migrations & seeds
```

## 🛠️ Tech Stack

- **Framework**: NestJS
- **Database**: MySQL with TypeORM
- **Authentication**: Firebase Admin SDK + JWT
- **Payment**: Stripe + Flutterwave
- **File Storage**: Cloudinary
- **Email**: Nodemailer
- **Caching**: Redis
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest

## 📋 Prerequisites

- Node.js (v18 or higher)
- MySQL (v8.0 or higher)
- Redis (optional, for caching)
- Firebase project
- Stripe account
- Flutterwave account
- Cloudinary account

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd air-charters-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Database setup**
   ```bash
   # Create database
   mysql -u root -p
   CREATE DATABASE citlogis_air_charters;
   
   # Run migrations
   npm run migration:run
   
   # Seed data (optional)
   npm run seed
   ```

5. **Start the application**
   ```bash
   # Development
   npm run start:dev
   
   # Production
   npm run build
   npm run start:prod
   ```

## 🔧 Configuration

### Environment Variables

Key environment variables to configure:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=citlogis_air_charters

# Firebase
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email

# Payment Gateways
STRIPE_SECRET_KEY=sk_test_...
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST_...

# File Storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## 📚 API Documentation

Once the server is running, visit:
- **Swagger UI**: `http://localhost:3000/api/docs`
- **API Base URL**: `http://localhost:3000/api`

## 🔐 Authentication

The API uses Firebase Authentication with JWT tokens:

1. **Firebase Token Verification**: Verify Firebase ID tokens
2. **JWT Generation**: Generate custom JWT tokens for API access
3. **Role-based Authorization**: Enforce role-based access control

### Authentication Flow

```typescript
// 1. Verify Firebase token
POST /api/auth/firebase/verify
{
  "firebaseToken": "firebase_id_token"
}

// 2. Use JWT token for API calls
Authorization: Bearer <jwt_token>
```

## 💳 Payment Integration

### Stripe Integration
- Payment intents for card payments
- Webhook handling for payment status updates
- Saved payment methods

### Flutterwave Integration
- Payment initialization
- Payment verification
- Webhook handling

## 🏢 Multi-tenant Architecture

The system supports multiple charter companies:

- **Company Registration**: Companies can register and get approved
- **Isolated Data**: Each company's data is isolated
- **Role-based Access**: Different roles for different company users
- **Commission Tracking**: Platform commission calculation

## 📊 Admin Features

- **Dashboard Analytics**: Revenue, bookings, user statistics
- **Company Approval**: Review and approve new companies
- **User Management**: Manage users across the platform
- **System Monitoring**: Health checks and maintenance mode

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📦 Deployment

### Docker Deployment

```bash
# Build image
docker build -t air-charters-backend .

# Run container
docker run -p 3000:3000 air-charters-backend
```

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure production database
- [ ] Set up SSL certificates
- [ ] Configure reverse proxy (nginx)
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Set up CI/CD pipeline

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the API documentation

## 🔄 Database Migrations

```bash
# Generate migration
npm run migration:generate -- src/database/migrations/MigrationName

# Run migrations
npm run migration:run

# Revert migration
npm run migration:revert
```

## 📈 Performance Optimization

- Database indexing for frequently queried fields
- Redis caching for session management
- Rate limiting to prevent abuse
- Connection pooling for database
- File compression and optimization 
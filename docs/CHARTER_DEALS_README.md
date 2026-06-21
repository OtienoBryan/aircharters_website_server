# Charter Deals API Implementation

This document describes the implementation of the Charter Deals API for the Air Charters application.

## 🏗️ Architecture Overview

The charter deals system consists of:

### Backend (NestJS)
- **Entities**: CharterDeal, ChartersCompany, FixedRoute, Aircraft
- **Service**: CharterDealsService with complex queries and joins
- **Controller**: CharterDealsController with RESTful endpoints
- **Module**: CharterDealsModule for dependency injection

### Frontend (Flutter)
- **Model**: CharterDealModel with computed properties
- **Service**: CharterDealsService for API communication
- **Provider**: CharterDealsProvider for state management

## 📊 Database Schema

Based on the `citlogis_air_charters.sql` file, the system uses these tables:

### Core Tables
- `charter_deals` - Main deals table
- `charters_companies` - Company information
- `fixed_routes` - Route definitions
- `aircrafts` - Aircraft information

### Relationships
- Charter deals belong to companies
- Charter deals use fixed routes
- Charter deals use aircraft
- Companies have multiple deals
- Routes have multiple deals
- Aircraft have multiple deals

## 🔧 Backend Implementation

### Entities

#### CharterDeal Entity
```typescript
@Entity('charter_deals')
export class CharterDeal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'companyId', type: 'int' })
  companyId: number;

  @Column({ name: 'fixedRouteId', type: 'int' })
  fixedRouteId: number;

  @Column({ name: 'aircraftId', type: 'int' })
  aircraftId: number;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'time' })
  time: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  pricePerSeat: number;

  @Column({ type: 'int', default: 0 })
  discountPerSeat: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  priceFullCharter: number;

  @Column({ type: 'int', default: 0 })
  discountFullCharter: number;

  @Column({ type: 'int' })
  availableSeats: number;

  @Column({ 
    type: 'enum', 
    enum: ['privateCharter', 'jetSharing'],
    default: 'privateCharter'
  })
  dealType: string;

  // Relations
  @ManyToOne(() => ChartersCompany, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company: ChartersCompany;

  @ManyToOne(() => FixedRoute, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fixedRouteId' })
  fixedRoute: FixedRoute;

  @ManyToOne(() => Aircraft, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'aircraftId' })
  aircraft: Aircraft;
}
```

### Service Methods

#### findAllWithRelations()
Complex query with joins to get deals with related data:
- Filters by active companies only
- Filters by available aircraft only
- Supports search, deal type, and date filters
- Includes pagination
- Returns transformed data with all related information

#### findById()
Get single deal with all related data

#### findByCompany()
Get deals for a specific company

#### findByRoute()
Get deals for a specific route with date filters

### API Endpoints

#### GET /api/charter-deals
- **Query Parameters**: page, limit, search, dealType, fromDate, toDate
- **Response**: Paginated list of deals with related data
- **Authentication**: Required

#### GET /api/charter-deals/:id
- **Path Parameters**: id (deal ID)
- **Response**: Single deal with related data
- **Authentication**: Required

#### GET /api/charter-deals/company/:companyId
- **Path Parameters**: companyId
- **Query Parameters**: page, limit
- **Response**: Paginated list of deals for company
- **Authentication**: Required

#### GET /api/charter-deals/route/:origin/:destination
- **Path Parameters**: origin, destination
- **Query Parameters**: page, limit, fromDate, toDate
- **Response**: Paginated list of deals for route
- **Authentication**: Required

## 📱 Frontend Implementation

### CharterDealModel
```dart
class CharterDealModel {
  final int id;
  final int companyId;
  final int fixedRouteId;
  final int aircraftId;
  final DateTime date;
  final String time;
  final double? pricePerSeat;
  final int discountPerSeat;
  final double? priceFullCharter;
  final int discountFullCharter;
  final int availableSeats;
  final String dealType;
  
  // Related data from joins
  final String? companyName;
  final String? companyLogo;
  final String? origin;
  final String? destination;
  final String? routeImageUrl;
  final String? aircraftName;
  final String? aircraftType;
  final int? aircraftCapacity;

  // Computed properties
  String get routeDisplay => '$origin - $destination';
  String get priceDisplay => // Calculated price with discounts
  String get dateDisplay => // Human-readable date
  String get flightsAvailableDisplay => // Deal type specific display
  String get imageUrl => // Route image or fallback
  bool get hasDiscount => // Check if any discounts apply
}
```

### CharterDealsService
- **Base URL**: http://localhost:3000/api
- **Caching**: 5-minute cache for performance
- **Error Handling**: Network, server, and auth exceptions
- **Methods**:
  - `fetchCharterDeals()` - Get paginated deals with filters
  - `fetchDealsForCompany()` - Get company-specific deals
  - `fetchDealById()` - Get single deal
  - `fetchDealsForRoute()` - Get route-specific deals

### CharterDealsProvider
- **State Management**: Loading, loaded, error, loadingMore states
- **Pagination**: Automatic page loading
- **Caching**: Local state management
- **Filtering**: Search and filter capabilities
- **Methods**:
  - `loadDeals()` - Load initial deals
  - `loadMoreDeals()` - Load additional pages
  - `refreshDeals()` - Force refresh
  - `loadDealsForRoute()` - Load route-specific deals
  - `loadDealsForCompany()` - Load company-specific deals

## 🚀 Usage Examples

### Backend Testing
```bash
# Start the server
npm run start:dev

# Test the API
node test-charter-deals.js
```

### Frontend Usage
```dart
// Initialize provider
final provider = CharterDealsProvider();

// Load deals
await provider.loadDeals(
  searchQuery: 'Nairobi',
  dealType: 'jetSharing',
  fromDate: DateTime.now(),
  toDate: DateTime.now().add(Duration(days: 30)),
);

// Load more deals
await provider.loadMoreDeals();

// Load deals for specific route
await provider.loadDealsForRoute(
  origin: 'Nairobi',
  destination: 'Mombasa',
);

// Get specific deal
final deal = await provider.getDealById(7);
```

## 🔍 API Response Format

### Success Response
```json
{
  "success": true,
  "data": [
    {
      "id": 7,
      "companyId": 9,
      "fixedRouteId": 10,
      "aircraftId": 1,
      "date": "2025-07-11",
      "time": "19:07:00",
      "pricePerSeat": null,
      "discountPerSeat": 0,
      "priceFullCharter": 3000.00,
      "discountFullCharter": 5,
      "availableSeats": 11,
      "dealType": "privateCharter",
      "createdAt": "2025-07-10T13:07:30.000Z",
      "updatedAt": "2025-07-10T13:07:30.000Z",
      "companyName": "Flight abc",
      "companyLogo": "https://...",
      "origin": "Nairobi",
      "destination": "Kisumu",
      "routeImageUrl": "https://...",
      "aircraftName": "Citation Mustang",
      "aircraftType": "jet",
      "aircraftCapacity": 11
    }
  ],
  "total": 4,
  "page": 1,
  "limit": 10
}
```

### Error Response
```json
{
  "success": false,
  "message": "Deal not found"
}
```

## 🛡️ Security & Performance

### Security
- JWT authentication required for all endpoints
- Input validation and sanitization
- SQL injection protection via TypeORM

### Performance
- Database indexes on frequently queried fields
- Query optimization with proper joins
- Client-side caching for better UX
- Pagination to limit data transfer

### Caching Strategy
- **Backend**: No caching (real-time data)
- **Frontend**: 5-minute cache for deals list
- **Provider**: Local state management

## 🔧 Configuration

### Environment Variables
```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=
DB_DATABASE=citlogis_air_charters
```

### Database Setup
1. Import the `citlogis_air_charters.sql` file
2. Configure environment variables
3. Start the NestJS server
4. Test with the provided test script

## 📝 Next Steps

1. **Authentication**: Add JWT token handling in Flutter service
2. **Error Handling**: Improve error messages and retry logic
3. **Caching**: Implement more sophisticated caching strategies
4. **Testing**: Add unit and integration tests
5. **Documentation**: Add Swagger documentation
6. **Monitoring**: Add logging and monitoring

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection**
   - Check environment variables
   - Verify database is running
   - Ensure schema is imported

2. **API Errors**
   - Check server logs
   - Verify authentication
   - Test with provided test script

3. **Flutter Issues**
   - Check network connectivity
   - Verify API base URL
   - Check authentication tokens

### Debug Commands
```bash
# Test backend
node test-charter-deals.js

# Check database
mysql -u root -p citlogis_air_charters

# Check server logs
npm run start:dev
``` 
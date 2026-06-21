-- Migration: Create aircraft_calendar table for direct charter bookings
-- Date: 2024-01-XX

CREATE TABLE `aircraft_calendar` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  
  -- Core Aircraft Reference
  `aircraftId` int(11) NOT NULL,
  `companyId` int(11) NOT NULL,
  
  -- Time Period
  `startDateTime` datetime NOT NULL,
  `endDateTime` datetime NOT NULL,
  
  -- Calendar Event Type
  `eventType` enum(
    'available',           -- Aircraft available for immediate booking
    'booked',              -- Aircraft booked for a direct charter
    'maintenance',         -- Aircraft under maintenance
    'blocked'              -- Aircraft blocked by admin
  ) NOT NULL DEFAULT 'available',
  
  -- Booking Details (for booked events)
  `bookingId` varchar(255) NULL,
  `originAirport` varchar(100) NULL,
  `destinationAirport` varchar(100) NULL,
  `passengerCount` int(11) NULL,
  
  -- Pricing
  `totalPrice` decimal(10,2) NULL,
  `pricePerHour` decimal(10,2) NULL,
  `repositioningCost` decimal(10,2) NULL,
  
  -- Metadata
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  KEY `idx_aircraft_time` (`aircraftId`, `startDateTime`, `endDateTime`),
  KEY `idx_event_type` (`eventType`),
  KEY `idx_booking` (`bookingId`),
  
  FOREIGN KEY (`aircraftId`) REFERENCES `aircrafts`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`companyId`) REFERENCES `charters_companies`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add indexes for performance
CREATE INDEX `idx_aircraft_calendar_search` ON `aircraft_calendar` (`aircraftId`, `startDateTime`, `endDateTime`, `eventType`);
CREATE INDEX `idx_aircraft_calendar_availability` ON `aircraft_calendar` (`eventType`, `startDateTime`, `endDateTime`); 
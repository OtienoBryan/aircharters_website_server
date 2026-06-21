-- Add performance indexes for charter deals and aircraft tables
-- This migration adds indexes to improve query performance

-- Indexes for charter_deals table
CREATE INDEX idx_charter_deals_company_id ON charter_deals(companyId);
CREATE INDEX idx_charter_deals_aircraft_id ON charter_deals(aircraftId);
CREATE INDEX idx_charter_deals_date ON charter_deals(date);
CREATE INDEX idx_charter_deals_origin_destination ON charter_deals(originName, destinationName);
CREATE INDEX idx_charter_deals_company_date ON charter_deals(companyId, date);
CREATE INDEX idx_charter_deals_aircraft_date ON charter_deals(aircraftId, date);

-- Indexes for aircrafts table
CREATE INDEX idx_aircrafts_company_id ON aircrafts(companyId);
CREATE INDEX idx_aircrafts_type ON aircrafts(type);
CREATE INDEX idx_aircrafts_is_available ON aircrafts(isAvailable);
CREATE INDEX idx_aircrafts_maintenance_status ON aircrafts(maintenanceStatus);
CREATE INDEX idx_aircrafts_available_maintenance ON aircrafts(isAvailable, maintenanceStatus);
CREATE INDEX idx_aircrafts_type_available ON aircrafts(type, isAvailable);

-- Indexes for charters_companies table
CREATE INDEX idx_charters_companies_status ON charters_companies(status);
CREATE INDEX idx_charters_companies_name ON charters_companies(companyName);

-- Indexes for aircraft_images table
CREATE INDEX idx_aircraft_images_aircraft_id ON aircraft_images(aircraftId);

-- Composite indexes for common query patterns
CREATE INDEX idx_charter_deals_complete ON charter_deals(companyId, aircraftId, date, availableSeats);
CREATE INDEX idx_aircrafts_complete ON aircrafts(companyId, type, isAvailable, maintenanceStatus);

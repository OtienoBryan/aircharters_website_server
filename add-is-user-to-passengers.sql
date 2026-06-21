-- Add is_user column to passengers table
-- This column identifies if the passenger is the user who made the booking

ALTER TABLE passengers 
ADD COLUMN is_user BOOLEAN DEFAULT FALSE;

-- Add index for better query performance
CREATE INDEX idx_passengers_is_user ON passengers(is_user);

-- Add comment for documentation
COMMENT ON COLUMN passengers.is_user IS 'Indicates if this passenger is the user who made the booking'; 
-- Check current payments table structure
DESCRIBE payments;

-- Add missing columns if they don't exist
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS company_id INT(11) AFTER userId,
ADD COLUMN IF NOT EXISTS payment_gateway_response JSON NULL;

-- Add indexes for better performance (using correct column names)
ALTER TABLE payments 
ADD INDEX IF NOT EXISTS idx_payments_booking_id (bookingId),
ADD INDEX IF NOT EXISTS idx_payments_user_id (userId),
ADD INDEX IF NOT EXISTS idx_payments_company_id (company_id),
ADD INDEX IF NOT EXISTS idx_payments_status (paymentStatus);

-- Show updated structure
DESCRIBE payments; 
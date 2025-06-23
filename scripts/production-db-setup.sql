-- =============================================================================
-- SiteNest Production Database Setup and Optimization
-- =============================================================================
-- This script sets up production-optimized database configurations
-- Run this after initial migration to optimize for production workloads

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- Users table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active 
ON users(email) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_active 
ON users(role) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at 
ON users(created_at DESC);

-- Properties table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_status_active 
ON properties(status) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_location 
ON properties USING GIN(location);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_price_range 
ON properties(price_per_night) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_amenities 
ON properties USING GIN(amenities);

-- Bookings table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_user_id 
ON bookings(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_property_id 
ON bookings(property_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_status 
ON bookings(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_dates 
ON bookings(check_in_date, check_out_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_created_at 
ON bookings(created_at DESC);

-- Reviews table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_property_id 
ON reviews(property_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_user_id 
ON reviews(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_rating 
ON reviews(rating);

-- Affiliate system indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_affiliate_links_user_id 
ON affiliate_links(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_affiliate_links_property_id 
ON affiliate_links(property_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_affiliate_links_code 
ON affiliate_links(affiliate_code);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_affiliate_earnings_user_id 
ON affiliate_earnings(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_affiliate_earnings_status 
ON affiliate_earnings(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_affiliate_metrics_user_id_date 
ON affiliate_metrics(user_id, date);

-- Withdrawal requests indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_withdrawal_requests_user_id 
ON withdrawal_requests(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_withdrawal_requests_status 
ON withdrawal_requests(status);

-- =============================================================================
-- FULL-TEXT SEARCH INDEXES
-- =============================================================================

-- Properties full-text search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_search 
ON properties USING GIN(
  to_tsvector('english', 
    COALESCE(title, '') || ' ' || 
    COALESCE(description, '') || ' ' || 
    COALESCE(location->>'address', '')
  )
);

-- =============================================================================
-- PERFORMANCE OPTIMIZATIONS
-- =============================================================================

-- Update table statistics
ANALYZE users;
ANALYZE properties;
ANALYZE bookings;
ANALYZE reviews;
ANALYZE affiliate_links;
ANALYZE affiliate_earnings;
ANALYZE affiliate_metrics;
ANALYZE withdrawal_requests;

-- =============================================================================
-- CONSTRAINTS AND VALIDATIONS
-- =============================================================================

-- Add production constraints
ALTER TABLE users 
ADD CONSTRAINT check_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE properties 
ADD CONSTRAINT check_price_positive 
CHECK (price_per_night > 0);

ALTER TABLE bookings 
ADD CONSTRAINT check_dates_valid 
CHECK (check_out_date > check_in_date);

ALTER TABLE reviews 
ADD CONSTRAINT check_rating_range 
CHECK (rating >= 1 AND rating <= 5);

-- =============================================================================
-- SECURITY SETTINGS
-- =============================================================================

-- Enable row level security on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for data access
CREATE POLICY user_own_data ON users 
FOR ALL USING (id = current_setting('app.current_user_id')::uuid);

CREATE POLICY booking_access ON bookings 
FOR ALL USING (
  user_id = current_setting('app.current_user_id')::uuid OR
  current_setting('app.user_role') = 'admin'
);

-- =============================================================================
-- MONITORING VIEWS
-- =============================================================================

-- Create view for monitoring active bookings
CREATE OR REPLACE VIEW active_bookings AS
SELECT 
  b.id,
  b.user_id,
  b.property_id,
  b.status,
  b.check_in_date,
  b.check_out_date,
  b.total_amount,
  p.title as property_title,
  u.email as user_email
FROM bookings b
JOIN properties p ON b.property_id = p.id
JOIN users u ON b.user_id = u.id
WHERE b.status IN ('confirmed', 'checked_in')
AND b.check_out_date >= CURRENT_DATE;

-- Create view for affiliate performance
CREATE OR REPLACE VIEW affiliate_performance AS
SELECT 
  u.id as user_id,
  u.email,
  COUNT(DISTINCT al.id) as total_links,
  COUNT(DISTINCT b.id) as total_bookings,
  COALESCE(SUM(ae.amount), 0) as total_earnings,
  COALESCE(SUM(CASE WHEN ae.status = 'pending' THEN ae.amount END), 0) as pending_earnings
FROM users u
LEFT JOIN affiliate_links al ON u.id = al.user_id
LEFT JOIN bookings b ON al.id = b.affiliate_link_id
LEFT JOIN affiliate_earnings ae ON u.id = ae.user_id
WHERE u.role = 'affiliate'
GROUP BY u.id, u.email;

-- =============================================================================
-- MAINTENANCE FUNCTIONS
-- =============================================================================

-- Function to clean up old sessions
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM session 
  WHERE expire < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Function to update affiliate metrics
CREATE OR REPLACE FUNCTION update_affiliate_metrics()
RETURNS void AS $$
BEGIN
  INSERT INTO affiliate_metrics (user_id, date, clicks, conversions, earnings)
  SELECT 
    al.user_id,
    CURRENT_DATE,
    COUNT(DISTINCT al.id) as clicks,
    COUNT(DISTINCT b.id) as conversions,
    COALESCE(SUM(ae.amount), 0) as earnings
  FROM affiliate_links al
  LEFT JOIN bookings b ON al.id = b.affiliate_link_id 
    AND DATE(b.created_at) = CURRENT_DATE
  LEFT JOIN affiliate_earnings ae ON al.user_id = ae.user_id 
    AND DATE(ae.created_at) = CURRENT_DATE
  GROUP BY al.user_id
  ON CONFLICT (user_id, date) 
  DO UPDATE SET 
    clicks = EXCLUDED.clicks,
    conversions = EXCLUDED.conversions,
    earnings = EXCLUDED.earnings,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SCHEDULED MAINTENANCE
-- =============================================================================

-- Note: These would typically be set up as cron jobs or scheduled tasks
-- SELECT cleanup_old_sessions(); -- Run daily
-- SELECT update_affiliate_metrics(); -- Run daily

-- =============================================================================
-- BACKUP PREPARATION
-- =============================================================================

-- Create backup user with limited permissions
CREATE USER backup_user WITH PASSWORD 'secure_backup_password';
GRANT CONNECT ON DATABASE sitenest_prod TO backup_user;
GRANT USAGE ON SCHEMA public TO backup_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;

-- Grant permissions for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
GRANT SELECT ON TABLES TO backup_user;

COMMIT;

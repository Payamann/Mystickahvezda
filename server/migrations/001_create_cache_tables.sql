-- Migration: Create cache tables for persistent storage
-- Purpose: Replace file-based cache with database storage to prevent data loss on server restart

-- ============================================
-- HOROSCOPE CACHE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS cache_horoscopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  sign TEXT NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly')),
  response TEXT NOT NULL,
  period_label TEXT,
  generated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cache_horoscopes_key ON cache_horoscopes(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_horoscopes_date ON cache_horoscopes(generated_at);
CREATE INDEX IF NOT EXISTS idx_cache_horoscopes_sign_period ON cache_horoscopes(sign, period, generated_at);

-- Comment
COMMENT ON TABLE cache_horoscopes IS 'Stores cached horoscope responses to avoid regenerating identical requests';
COMMENT ON COLUMN cache_horoscopes.cache_key IS 'Unique hash key generated from sign, period, and date';
COMMENT ON COLUMN cache_horoscopes.generated_at IS 'Timestamp used for TTL cleanup of old entries';

-- ============================================
-- NUMEROLOGY CACHE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS cache_numerology (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  name TEXT,
  birth_date TEXT,
  birth_time TEXT,
  life_path INTEGER,
  destiny INTEGER,
  soul INTEGER,
  personality INTEGER,
  response TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cache_numerology_key ON cache_numerology(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_numerology_date ON cache_numerology(generated_at);

-- Comment
COMMENT ON TABLE cache_numerology IS 'Stores cached numerology interpretations for deterministic results';
COMMENT ON COLUMN cache_numerology.cache_key IS 'MD5 hash of all input parameters for deterministic caching';

-- ============================================
-- OPTIONAL: CLEANUP FUNCTION FOR OLD CACHE
-- ============================================
-- Daily horoscopes: Keep for 2 days
-- Weekly horoscopes: Keep for 14 days  
-- Monthly horoscopes: Keep for 60 days
-- Numerology: Keep indefinitely (or 1 year)

-- Function to clean up old cache entries
CREATE OR REPLACE FUNCTION cleanup_old_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
  row_count_temp INTEGER;
BEGIN
  -- Delete old daily horoscopes (older than 2 days)
  DELETE FROM cache_horoscopes 
  WHERE period = 'daily' 
    AND generated_at < NOW() - INTERVAL '2 days';
  
  GET DIAGNOSTICS row_count_temp = ROW_COUNT;
  deleted_count := deleted_count + row_count_temp;
  
  -- Delete old weekly horoscopes (older than 14 days)
  DELETE FROM cache_horoscopes 
  WHERE period = 'weekly' 
    AND generated_at < NOW() - INTERVAL '14 days';
  
  GET DIAGNOSTICS row_count_temp = ROW_COUNT;
  deleted_count := deleted_count + row_count_temp;
  
  -- Delete old monthly horoscopes (older than 60 days)
  DELETE FROM cache_horoscopes 
  WHERE period = 'monthly' 
    AND generated_at < NOW() - INTERVAL '60 days';
  
  GET DIAGNOSTICS row_count_temp = ROW_COUNT;
  deleted_count := deleted_count + row_count_temp;
  
  -- Delete old numerology cache (older than 1 year)
  DELETE FROM cache_numerology 
  WHERE generated_at < NOW() - INTERVAL '1 year';
  
  GET DIAGNOSTICS row_count_temp = ROW_COUNT;
  deleted_count := deleted_count + row_count_temp;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_cache() IS 'Removes stale cache entries based on TTL rules';

-- Grant permissions (adjust based on your RLS policies)
-- ALTER TABLE cache_horoscopes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE cache_numerology ENABLE ROW LEVEL SECURITY;

-- Service role bypass (cache is public, no user-specific data)
-- CREATE POLICY "Public read access" ON cache_horoscopes FOR SELECT USING (true);
-- CREATE POLICY "Public read access" ON cache_numerology FOR SELECT USING (true);

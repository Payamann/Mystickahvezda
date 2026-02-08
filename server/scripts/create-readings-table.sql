-- ============================================
-- READINGS TABLE FOR USER HISTORY
-- Run this in Supabase SQL Editor
-- ============================================

-- Create readings table
CREATE TABLE IF NOT EXISTS readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'tarot', 'horoscope', 'natal', 'numerology', 'synastry', 'crystal'
    data JSONB NOT NULL, -- Stores the reading data (cards, interpretation, etc.)
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries by user
CREATE INDEX IF NOT EXISTS idx_readings_user_id ON readings(user_id);
CREATE INDEX IF NOT EXISTS idx_readings_created_at ON readings(created_at DESC);

-- Enable Row Level Security
ALTER TABLE readings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own readings
CREATE POLICY "Users can view own readings" ON readings
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own readings
CREATE POLICY "Users can insert own readings" ON readings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own readings
CREATE POLICY "Users can delete own readings" ON readings
    FOR DELETE USING (auth.uid() = user_id);

-- Policy: Users can update their own readings (for favorites)
CREATE POLICY "Users can update own readings" ON readings
    FOR UPDATE USING (auth.uid() = user_id);

-- Grant service role full access (for server-side operations)
-- This is handled by using the service_role key in the server

-- Blog Comments Table
-- Run in Supabase SQL editor

CREATE TABLE IF NOT EXISTS blog_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_slug TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_email TEXT NOT NULL,
    content TEXT NOT NULL CHECK (length(content) BETWEEN 10 AND 1000),
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON blog_comments(post_slug, is_approved, created_at);

ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read approved comments
CREATE POLICY "Read approved comments" ON blog_comments
    FOR SELECT USING (is_approved = true);

-- Anyone can insert (server validates)
CREATE POLICY "Insert comments" ON blog_comments
    FOR INSERT WITH CHECK (true);

-- Only service role can update/delete
CREATE POLICY "Service role manage" ON blog_comments
    FOR ALL USING (true);

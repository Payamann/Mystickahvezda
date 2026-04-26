
-- Indexes for performance optimization

-- Users table: frequent lookups by email (login)
create index if not exists idx_users_email on users(email);

-- Subscriptions: prevent full table scans when checking premium status
create index if not exists idx_subscriptions_user_id on subscriptions(user_id);
create index if not exists idx_subscriptions_stripe_id on subscriptions(stripe_subscription_id);

-- Readings: allow fast retrieval of user history
create index if not exists idx_readings_user_id on readings(user_id);
create index if not exists idx_readings_created_at on readings(created_at desc);

-- Cache tables: ensure fast cache hits
create index if not exists idx_cache_horoscopes_key on cache_horoscopes(cache_key);
create index if not exists idx_cache_numerology_key on cache_numerology(cache_key);

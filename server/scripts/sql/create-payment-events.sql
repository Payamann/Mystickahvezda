
-- Table to track processed Stripe events for idempotency
create table if not exists payment_events (
  id uuid default uuid_generate_v4() primary key,
  event_id text not null unique,
  event_type text not null,
  processed_at timestamp with time zone default now(),
  status text default 'success'
);

-- Index for fast lookups
create index if not exists idx_payment_events_event_id on payment_events(event_id);

-- First-party analytics and client error events.
-- Public clients post through the Node API; direct user access stays blocked by RLS.

create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  event_type varchar(50) not null,
  feature varchar(100),
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

create index if not exists idx_analytics_events_type on analytics_events(event_type);
create index if not exists idx_analytics_events_user on analytics_events(user_id);
create index if not exists idx_analytics_events_feature on analytics_events(feature);
create index if not exists idx_analytics_events_created on analytics_events(created_at);

alter table analytics_events enable row level security;

drop policy if exists analytics_service_role on analytics_events;
create policy analytics_service_role
  on analytics_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

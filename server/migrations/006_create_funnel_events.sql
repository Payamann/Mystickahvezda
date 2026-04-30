create table if not exists funnel_events (
    id uuid primary key default gen_random_uuid(),
    user_id uuid,
    event_name text not null,
    source text,
    feature text,
    plan_id text,
    plan_type text,
    stripe_session_id text,
    stripe_event_id text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists idx_funnel_events_event_created
    on funnel_events (event_name, created_at desc);

create index if not exists idx_funnel_events_user_created
    on funnel_events (user_id, created_at desc);

create index if not exists idx_funnel_events_plan_created
    on funnel_events (plan_id, plan_type, created_at desc);

create index if not exists idx_funnel_events_stripe_session
    on funnel_events (stripe_session_id);

alter table funnel_events enable row level security;

drop policy if exists "No direct access to funnel_events" on funnel_events;
create policy "No direct access to funnel_events"
    on funnel_events
    for all
    using (false)
    with check (false);

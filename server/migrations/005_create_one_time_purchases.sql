create table if not exists one_time_purchases (
    id uuid primary key default gen_random_uuid(),
    stripe_session_id text not null unique,
    stripe_payment_intent_id text,
    customer_email text not null,
    product_type text not null,
    product_id text not null,
    amount_total integer,
    currency text not null default 'czk',
    status text not null default 'paid',
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists idx_one_time_purchases_customer_email
    on one_time_purchases (customer_email);

create index if not exists idx_one_time_purchases_product_type_created_at
    on one_time_purchases (product_type, created_at desc);

alter table one_time_purchases enable row level security;

drop policy if exists "No direct access to one_time_purchases" on one_time_purchases;
create policy "No direct access to one_time_purchases"
    on one_time_purchases
    for all
    using (false)
    with check (false);

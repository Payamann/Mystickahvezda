-- Create mentor_messages table for chat history
create table if not exists mentor_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  role text check (role in ('user', 'mentor')) not null,
  content text not null,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists mentor_messages_user_id_idx on mentor_messages(user_id);
create index if not exists mentor_messages_created_at_idx on mentor_messages(created_at);

-- RLS (Row Level Security)
alter table mentor_messages enable row level security;

-- Policy: Users can view their own messages
create policy "Users can view own mentor messages"
  on mentor_messages for select
  using (auth.uid() = user_id);

-- Policy: Users (and Server acting as User) can insert messages
create policy "Users can insert mentor messages"
  on mentor_messages for insert
  with check (auth.uid() = user_id);
  
-- Note: Service Role (Server) bypasses RLS, so it can always read/write.

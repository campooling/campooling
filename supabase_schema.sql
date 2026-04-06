-- ==========================================
-- 1. PROFILES (Linked to Supabase Auth)
-- ==========================================
create table public.profiles (
  -- The 'id' must exactly match the 'id' in auth.users
  id uuid references auth.users on delete cascade not null primary key,
  nickname text unique,
  role text check (role in ('KATUSA', 'USA_ARMY')),
  avatar_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- 2. PODS (Ride-sharing sessions)
-- ==========================================
create table public.pods (
  id uuid default gen_random_uuid() primary key,
  creator_id uuid references public.profiles(id) not null,
  origin text not null,
  destination text not null,
  departure_time timestamp with time zone not null,
  capacity int not null default 4,
  -- A pod can be active, full (capacity reached), completed (ride done), or cancelled
  status text check (status in ('active', 'full', 'completed', 'cancelled')) default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- 3. POD MEMBERS (Who is in which pod)
-- ==========================================
create table public.pod_members (
  pod_id uuid references public.pods(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  -- A user can only join a specific pod once
  primary key (pod_id, user_id)
);

-- ==========================================
-- 4. MESSAGES (Chat history for each pod)
-- ==========================================
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  pod_id uuid references public.pods(id) on delete cascade,
  user_id uuid references public.profiles(id),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- 5. ENABLE REALTIME
-- ==========================================
-- This tells Supabase to broadcast changes to these tables to listening clients
alter publication supabase_realtime add table public.pods;
alter publication supabase_realtime add table public.pod_members;
alter publication supabase_realtime add table public.messages;

-- ==========================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.pods enable row level security;
alter table public.pod_members enable row level security;
alter table public.messages enable row level security;

-- Profiles: Anyone can view profiles, but users can only update their own
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Pods: Anyone can view pods, but only authenticated users can create them
create policy "Pods are viewable by everyone" on public.pods for select using (true);
create policy "Authenticated users can create pods" on public.pods for insert with check (auth.role() = 'authenticated');
-- Only the creator can update a pod (e.g., to cancel it)
create policy "Creators can update their pods" on public.pods for update using (auth.uid() = creator_id);

-- Pod Members: Anyone can view members, users can join/leave
create policy "Pod members are viewable by everyone" on public.pod_members for select using (true);
create policy "Users can join pods" on public.pod_members for insert with check (auth.uid() = user_id);
create policy "Users can leave pods" on public.pod_members for delete using (auth.uid() = user_id);

-- Messages: Anyone can view messages in a pod, users can send messages
create policy "Messages are viewable by everyone" on public.messages for select using (true);
create policy "Authenticated users can send messages" on public.messages for insert with check (auth.role() = 'authenticated');

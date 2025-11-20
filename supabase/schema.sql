-- Supabase schema for IT Colloseum online features
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique,
  avatar_url text,
  status text default 'offline',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cards (
  id text primary key,
  name text not null,
  description text not null,
  color text not null,
  type text not null,
  mana_cost integer not null,
  value integer not null,
  meta jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type public.match_status as enum ('waiting', 'active', 'finished', 'abandoned');
create type public.deck_archetype as enum ('custom', 'firewall_guardian', 'quantum_burst', 'pulse_vanguard', 'shadow_infiltrator');
create type public.sigil_type as enum ('overload', 'override');

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  title text,
  status match_status not null default 'waiting',
  is_public boolean not null default true,
  host_id uuid not null references profiles(id) on delete cascade,
  guest_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_action_at timestamptz,
  state jsonb
);

create index if not exists matches_status_idx on public.matches(status);
create index if not exists matches_host_idx on public.matches(host_id);
create index if not exists matches_guest_idx on public.matches(guest_id);

alter table public.matches enable row level security;
alter table public.profiles enable row level security;
alter table public.cards enable row level security;

create policy "Public profiles are readable" on public.profiles for select using ( true );
create policy "Users can insert own profile" on public.profiles
  for insert with check ( auth.uid() = id );
create policy "Users can update own profile" on public.profiles
  for update using ( auth.uid() = id ) with check ( auth.uid() = id );
create policy "Cards readable to everyone" on public.cards for select using ( true );
create policy "Matches readable to signed in users" on public.matches for select using ( auth.role() = 'authenticated' );
create policy "Hosts manage their matches" on public.matches
  for insert with check ( auth.uid() = host_id );
create policy "Hosts update their matches" on public.matches
  for update using ( auth.uid() = host_id )
  with check ( auth.uid() = host_id );
create policy "Guests update their matches" on public.matches
  for update using ( auth.uid() = guest_id )
  with check ( auth.uid() = guest_id );
create policy "Guests can join open matches" on public.matches
  for update using ( guest_id is null and status = 'waiting' )
  with check ( guest_id = auth.uid() );

create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  archetype deck_archetype not null default 'custom',
  sigil sigil_type not null default 'overload',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deck_cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  card_id text not null references public.cards(id),
  order_index integer not null check (order_index between 1 and 30),
  created_at timestamptz not null default now(),
  unique(deck_id, order_index),
  unique(deck_id, card_id)
);

alter table public.decks enable row level security;
alter table public.deck_cards enable row level security;

create policy "Decks readable by owner" on public.decks
  for select using ( auth.uid() = owner_id );
create policy "Decks manageable by owner" on public.decks
  for insert with check ( auth.uid() = owner_id )
  using ( auth.uid() = owner_id );

create policy "Deck cards readable by owner" on public.deck_cards
  for select using (
    exists (
      select 1 from public.decks d
      where d.id = deck_id and d.owner_id = auth.uid()
    )
  );
create policy "Deck cards manageable by owner" on public.deck_cards
  for all using (
    exists (
      select 1 from public.decks d
      where d.id = deck_id and d.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.decks d
      where d.id = deck_id and d.owner_id = auth.uid()
    )
  );

alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists default_deck_id uuid references public.decks(id);
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'waiting',
  is_public boolean not null default true,
  host_user_id uuid,
  created_at timestamptz default now()
);

create table if not exists public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade,
  user_id uuid not null,
  joined_at timestamptz default now()
);

create table if not exists public.player_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null,
  display_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.card_collection (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  card_id text not null,
  quantity int not null default 1,
  constraint fk_user foreign key(user_id) references auth.users(id) on delete cascade
);


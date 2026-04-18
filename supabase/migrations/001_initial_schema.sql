-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =====================
-- USERS
-- =====================
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null default '',
  avatar_url text,
  timezone text not null default 'Asia/Jakarta',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

-- =====================
-- HABIT CATEGORIES (static seed data)
-- =====================
create table public.habit_categories (
  id serial primary key,
  name text not null,
  color text not null,
  icon text not null
);

-- No RLS needed — categories are public/read-only
alter table public.habit_categories enable row level security;

create policy "Anyone can read categories"
  on public.habit_categories for select
  using (true);

-- Seed categories
insert into public.habit_categories (name, color, icon) values
  ('Soulset', '#8B5CF6', 'Heart'),
  ('Mindset', '#3B82F6', 'Brain'),
  ('Healthset', '#10B981', 'Dumbbell'),
  ('Familyset', '#F59E0B', 'Home'),
  ('Socialset', '#EC4899', 'Users'),
  ('Wealthset', '#6366F1', 'TrendingUp');

-- =====================
-- HABITS
-- =====================
create type habit_frequency as enum ('daily', 'weekly');

create table public.habits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  category_id integer references public.habit_categories(id) not null,
  title text not null,
  frequency habit_frequency not null default 'daily',
  weekly_target integer, -- nullable, only for weekly habits
  is_active boolean not null default true,
  deleted_at timestamptz, -- soft delete
  created_at timestamptz not null default now()
);

alter table public.habits enable row level security;

create policy "Users can manage own habits"
  on public.habits for all
  using (auth.uid() = user_id);

-- =====================
-- HABIT LOGS
-- =====================
create table public.habit_logs (
  id uuid primary key default uuid_generate_v4(),
  habit_id uuid references public.habits(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  logged_date date not null, -- local date of user
  completed boolean not null default true,
  created_at timestamptz not null default now(),
  unique(habit_id, logged_date) -- one log per habit per day
);

alter table public.habit_logs enable row level security;

create policy "Users can manage own habit logs"
  on public.habit_logs for all
  using (auth.uid() = user_id);

-- =====================
-- SPRINTS
-- =====================
create type sprint_status as enum ('planning', 'active', 'completed');

create table public.sprints (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  start_date date not null,
  end_date date not null,
  duration_days integer not null check (duration_days in (7, 14)),
  status sprint_status not null default 'planning',
  reward text not null default '',
  punishment text not null default '',
  completion_rate float, -- calculated when sprint completes
  reflection text,
  created_at timestamptz not null default now()
);

alter table public.sprints enable row level security;

create policy "Users can manage own sprints"
  on public.sprints for all
  using (auth.uid() = user_id);

-- =====================
-- SPRINT HABITS
-- =====================
create table public.sprint_habits (
  id uuid primary key default uuid_generate_v4(),
  sprint_id uuid references public.sprints(id) on delete cascade not null,
  habit_id uuid references public.habits(id) on delete cascade not null,
  is_locked boolean not null default false,
  completed_days integer not null default 0,
  unique(sprint_id, habit_id)
);

alter table public.sprint_habits enable row level security;

create policy "Users can manage own sprint habits"
  on public.sprint_habits for all
  using (
    exists (
      select 1 from public.sprints
      where sprints.id = sprint_habits.sprint_id
      and sprints.user_id = auth.uid()
    )
  );

-- =====================
-- BADGES
-- =====================
create table public.badges (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  badge_type text not null,
  earned_at timestamptz not null default now(),
  unique(user_id, badge_type) -- one badge per type per user
);

alter table public.badges enable row level security;

create policy "Users can view own badges"
  on public.badges for select
  using (auth.uid() = user_id);

create policy "System can insert badges"
  on public.badges for insert
  with check (auth.uid() = user_id);

-- =====================
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- =====================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

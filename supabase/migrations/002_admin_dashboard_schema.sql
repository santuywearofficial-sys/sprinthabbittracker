-- =====================
-- ADMIN DASHBOARD SCHEMA
-- =====================

-- Create user_roles table
create table public.user_roles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create index on user_id for fast lookups
create index user_roles_user_id_idx on public.user_roles(user_id);

-- Create activity_logs table
create table public.activity_logs (
  id uuid primary key default uuid_generate_v4(),
  admin_user_id uuid references auth.users(id) on delete set null,
  action_type text not null,
  affected_user_id uuid references auth.users(id) on delete set null,
  details jsonb,
  created_at timestamptz not null default now()
);

-- Create indexes for query performance
create index activity_logs_admin_user_id_idx on public.activity_logs(admin_user_id);
create index activity_logs_created_at_idx on public.activity_logs(created_at desc);
create index activity_logs_affected_user_id_idx on public.activity_logs(affected_user_id);

-- Function to automatically update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to update updated_at on user_roles
create trigger update_user_roles_updated_at
  before update on public.user_roles
  for each row
  execute procedure public.update_updated_at_column();

-- Insert default role for existing admin user
insert into public.user_roles (user_id, role)
select id, 'admin'
from auth.users
where email = 'admin@sprinttracker.com'
on conflict (user_id) do nothing;


-- =====================
-- ROW LEVEL SECURITY POLICIES
-- =====================

-- Enable RLS on user_roles table
alter table public.user_roles enable row level security;

-- Enable RLS on activity_logs table
alter table public.activity_logs enable row level security;

-- Helper function to check if user is admin
create or replace function public.is_admin(user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.user_roles
    where user_roles.user_id = is_admin.user_id
    and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- RLS Policy: Admins can view all users
create policy "Admins can view all users"
  on public.users for select
  using (
    auth.uid() = id or public.is_admin(auth.uid())
  );

-- RLS Policy: Admins can view all user roles
create policy "Admins can view all user roles"
  on public.user_roles for select
  using (public.is_admin(auth.uid()));

-- RLS Policy: Admins can update user roles
create policy "Admins can update user roles"
  on public.user_roles for update
  using (public.is_admin(auth.uid()));

-- RLS Policy: Admins can insert user roles
create policy "Admins can insert user roles"
  on public.user_roles for insert
  with check (public.is_admin(auth.uid()));

-- RLS Policy: Admins can view activity logs
create policy "Admins can view activity logs"
  on public.activity_logs for select
  using (public.is_admin(auth.uid()));

-- RLS Policy: Admins can insert activity logs
create policy "Admins can insert activity logs"
  on public.activity_logs for insert
  with check (public.is_admin(auth.uid()));

-- RLS Policy: Admins can view all habits
create policy "Admins can view all habits"
  on public.habits for select
  using (
    auth.uid() = user_id or public.is_admin(auth.uid())
  );

-- RLS Policy: Admins can view all sprints
create policy "Admins can view all sprints"
  on public.sprints for select
  using (
    auth.uid() = user_id or public.is_admin(auth.uid())
  );

-- RLS Policy: Admins can view all habit logs
create policy "Admins can view all habit logs"
  on public.habit_logs for select
  using (
    auth.uid() = user_id or public.is_admin(auth.uid())
  );


-- =====================
-- SEARCH USERS RPC FUNCTION
-- =====================

create or replace function public.search_users(
  query_text text default '',
  role_filter text default 'all'
)
returns table (
  id uuid,
  email text,
  full_name text,
  avatar_url text,
  timezone text,
  onboarding_completed boolean,
  created_at timestamptz,
  role text
) as $$
begin
  return query
  select 
    u.id,
    u.email,
    u.full_name,
    u.avatar_url,
    u.timezone,
    u.onboarding_completed,
    u.created_at,
    coalesce(ur.role, 'user') as role
  from public.users u
  left join public.user_roles ur on u.id = ur.user_id
  where 
    -- Only admins can call this function (enforced by RLS)
    public.is_admin(auth.uid())
    -- Search filter
    and (
      query_text = ''
      or u.email ilike '%' || query_text || '%'
      or u.full_name ilike '%' || query_text || '%'
    )
    -- Role filter
    and (
      role_filter = 'all'
      or coalesce(ur.role, 'user') = role_filter
    )
  order by u.created_at desc;
end;
$$ language plpgsql security definer;

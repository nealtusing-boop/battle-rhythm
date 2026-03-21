-- Battle Rhythm schema
-- Run this entire file in Supabase SQL editor.

create extension if not exists pgcrypto;

create type public.app_role as enum ('soldier', 'admin');
create type public.alert_priority as enum ('high', 'medium', 'low');
create type public.period_type as enum ('leave', 'donsa');
create type public.jump_type as enum ('Hollywood', 'Combat');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  rank text not null,
  role public.app_role not null default 'soldier',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  priority public.alert_priority not null default 'medium',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.weekly_training_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  start_time text,
  end_time text,
  location text,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.long_range_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  location text,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.leave_donsa_periods (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  period_type public.period_type not null,
  start_date date not null,
  end_date date not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.jumps (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text not null,
  jump_date date not null,
  jump_type public.jump_type not null,
  equipment_list text[] not null default '{}',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.jump_manifest (
  id uuid primary key default gen_random_uuid(),
  jump_id uuid not null references public.jumps(id) on delete cascade,
  soldier_id uuid not null references public.profiles(id) on delete cascade,
  sort_order integer not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  unique (jump_id, soldier_id)
);

create table if not exists public.cq_shifts (
  id uuid primary key default gen_random_uuid(),
  shift_date date not null unique,
  soldier_one_id uuid not null references public.profiles(id) on delete restrict,
  soldier_two_id uuid not null references public.profiles(id) on delete restrict,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint cq_two_distinct_soldiers check (soldier_one_id <> soldier_two_id)
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, rank)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'rank', 'PVT')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.alerts enable row level security;
alter table public.weekly_training_events enable row level security;
alter table public.long_range_events enable row level security;
alter table public.leave_donsa_periods enable row level security;
alter table public.jumps enable row level security;
alter table public.jump_manifest enable row level security;
alter table public.cq_shifts enable row level security;
alter table public.push_subscriptions enable row level security;

create policy "authenticated users can read profiles"
on public.profiles for select
using (auth.role() = 'authenticated');

create policy "users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "admins can update any profile"
on public.profiles for update
using (public.is_admin())
with check (public.is_admin());

create policy "authenticated users can read alerts"
on public.alerts for select
using (auth.role() = 'authenticated');

create policy "admins manage alerts"
on public.alerts for all
using (public.is_admin())
with check (public.is_admin());

create policy "authenticated users can read weekly training"
on public.weekly_training_events for select
using (auth.role() = 'authenticated');

create policy "admins manage weekly training"
on public.weekly_training_events for all
using (public.is_admin())
with check (public.is_admin());

create policy "authenticated users can read long range events"
on public.long_range_events for select
using (auth.role() = 'authenticated');

create policy "admins manage long range events"
on public.long_range_events for all
using (public.is_admin())
with check (public.is_admin());

create policy "authenticated users can read leave periods"
on public.leave_donsa_periods for select
using (auth.role() = 'authenticated');

create policy "admins manage leave periods"
on public.leave_donsa_periods for all
using (public.is_admin())
with check (public.is_admin());

create policy "authenticated users can read jumps"
on public.jumps for select
using (auth.role() = 'authenticated');

create policy "admins manage jumps"
on public.jumps for all
using (public.is_admin())
with check (public.is_admin());

create policy "authenticated users can read jump manifest"
on public.jump_manifest for select
using (auth.role() = 'authenticated');

create policy "admins manage jump manifest"
on public.jump_manifest for all
using (public.is_admin())
with check (public.is_admin());

create policy "authenticated users can read cq shifts"
on public.cq_shifts for select
using (auth.role() = 'authenticated');

create policy "admins manage cq shifts"
on public.cq_shifts for all
using (public.is_admin())
with check (public.is_admin());

create policy "users manage own push subscriptions"
on public.push_subscriptions for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

insert into public.weekly_training_events (title, event_date, start_time, end_time, location, description)
values
  ('Physical Training', current_date + 1, '06:30', '08:00', 'Company Area', 'APFT prep and conditioning'),
  ('Weapons Maintenance', current_date + 1, '09:00', '12:00', 'Arms Room', 'M4 cleaning and inspection'),
  ('Airborne Training', current_date + 2, '08:00', '16:00', 'Drop Zone Alpha', 'Static line refresher training')
on conflict do nothing;

insert into public.long_range_events (title, event_date, location, description)
values
  ('Field Training Exercise', current_date + 21, 'Training Area 8', '3-day FTX'),
  ('Battalion Run', current_date + 28, 'Main Parade Field', 'Company formation run')
on conflict do nothing;

insert into public.leave_donsa_periods (title, period_type, start_date, end_date)
values
  ('Spring Break Leave', 'leave', current_date + 7, current_date + 20),
  ('Memorial Day Weekend', 'donsa', current_date + 60, current_date + 63)
on conflict do nothing;

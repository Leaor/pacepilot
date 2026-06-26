create extension if not exists pgcrypto;

do $$
begin
  create type public.activity_source as enum (
    'pacepilot_manual',
    'pacepilot_gps',
    'strava_cache',
    'garmin_import',
    'apple_health_import',
    'user_provided_import'
  );
exception
  when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  name text,
  age_range text,
  timezone text not null default 'America/Toronto',
  units text not null default 'km',
  experience_level text,
  current_weekly_mileage numeric,
  longest_recent_run numeric,
  goal text,
  race_date date,
  goal_time_seconds integer,
  available_run_days text[] not null default '{}',
  preferred_long_run_day text,
  strength_preference text,
  equipment text,
  injury_caution boolean not null default false,
  coaching_tone text,
  onboarding_answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tier text not null default 'free' check (tier in ('free', 'pro', 'elite')),
  status text not null default 'inactive',
  provider text not null default 'revenuecat',
  provider_customer_id text,
  entitlement_snapshot jsonb not null default '{}'::jsonb,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  goal text not null,
  race_date date,
  status text not null default 'active',
  plan_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  training_plan_id uuid references public.training_plans(id) on delete cascade,
  scheduled_date date not null,
  title text not null,
  workout_type text not null,
  status text not null default 'planned',
  distance_km numeric,
  duration_minutes integer,
  target_pace jsonb,
  steps jsonb not null default '[]'::jsonb,
  purpose text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id uuid references public.workouts(id) on delete set null,
  source public.activity_source not null,
  started_at timestamptz not null,
  distance_km numeric not null,
  duration_seconds integer not null,
  elevation_meters numeric,
  average_pace_seconds_per_km integer,
  heart_rate_average integer,
  perceived_effort integer check (perceived_effort between 1 and 10),
  fatigue_after integer check (fatigue_after between 1 and 5),
  notes text,
  route_json jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.strava_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  athlete_id text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  expires_at timestamptz,
  last_sync_at timestamptz,
  cache_expires_at timestamptz,
  connected_at timestamptz not null default now(),
  disconnected_at timestamptz
);

create table if not exists public.garmin_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  garmin_user_id text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  last_sync_at timestamptz,
  connected_at timestamptz not null default now(),
  disconnected_at timestamptz,
  coaching_use_permitted boolean not null default false
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  region text,
  country text not null,
  location text,
  event_date date not null,
  distance_km numeric not null,
  terrain text,
  elevation_meters numeric,
  vibe text,
  registration_url text,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  training_plan_id uuid not null references public.training_plans(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  race_priority text not null check (race_priority in ('a_race', 'b_race')),
  created_at timestamptz not null default now()
);

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  fatigue integer not null check (fatigue between 1 and 5),
  soreness integer not null check (soreness between 1 and 5),
  sleep_hours numeric,
  motivation integer check (motivation between 1 and 5),
  week_difficulty integer check (week_difficulty between 1 and 5),
  next_week_preference text check (next_week_preference in ('push', 'maintain', 'recover')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  achievement_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  awarded_at timestamptz not null default now()
);

create table if not exists public.user_privacy_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ai_coach_enabled boolean not null default false,
  ai_can_use_pacepilot_activity_history boolean not null default false,
  ai_can_use_checkins boolean not null default false,
  ai_can_use_race_goals boolean not null default false,
  ai_can_use_chat_history boolean not null default false,
  ai_can_use_user_provided_imports boolean not null default false,
  ai_can_use_garmin_data boolean not null default false,
  ai_can_use_apple_health_data boolean not null default false,
  profile_private boolean not null default true,
  activity_private boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.data_source_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source public.activity_source not null,
  permitted_for_import boolean not null default false,
  permitted_for_ai boolean not null default false,
  permitted_for_analytics boolean not null default false,
  consented_at timestamptz,
  revoked_at timestamptz
);

create table if not exists public.activity_import_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source public.activity_source not null,
  imported_count integer not null default 0,
  skipped_count integer not null default 0,
  status text not null default 'started',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.shoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand text not null,
  model text not null,
  nickname text,
  purchase_date date,
  starting_mileage numeric not null default 0,
  current_mileage numeric not null default 0,
  retirement_mileage_target numeric not null default 650,
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_shoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  shoe_id uuid not null references public.shoes(id) on delete cascade,
  assigned_at timestamptz not null default now()
);

create table if not exists public.race_strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  goal_time_seconds integer not null,
  pacing_style text not null,
  split_unit text not null,
  strategy_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.race_readiness_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  training_plan_id uuid references public.training_plans(id) on delete cascade,
  score integer not null check (score between 0 and 100),
  label text not null,
  explanations jsonb not null default '[]'::jsonb,
  recommended_next_action text,
  generated_at timestamptz not null default now()
);

create table if not exists public.race_checklists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.life_mode_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  option text not null,
  suggestion_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.weekly_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  training_plan_id uuid references public.training_plans(id) on delete cascade,
  checkin_id uuid references public.checkins(id) on delete set null,
  adjustment_summary text not null,
  adjustment_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.connected_service_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service text not null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid not null references public.ai_chat_threads(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  used_sources jsonb not null default '[]'::jsonb,
  excluded_sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  model text not null,
  input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  latency_ms integer,
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_data_access_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  used_sources jsonb not null default '[]'::jsonb,
  excluded_sources jsonb not null default '[]'::jsonb,
  privacy_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_analysis_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_type text not null,
  content jsonb not null default '{}'::jsonb,
  data_categories_used jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_data_export_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  export_scope text not null,
  status text not null default 'requested',
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.user_data_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  deletion_scope text not null,
  status text not null default 'requested',
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.app_error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  severity text not null default 'error',
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists name text;
alter table public.profiles add column if not exists age_range text;
alter table public.profiles add column if not exists units text not null default 'km';
alter table public.profiles add column if not exists experience_level text;
alter table public.profiles add column if not exists current_weekly_mileage numeric;
alter table public.profiles add column if not exists longest_recent_run numeric;
alter table public.profiles add column if not exists race_date date;
alter table public.profiles add column if not exists goal_time_seconds integer;
alter table public.profiles add column if not exists available_run_days text[] not null default '{}';
alter table public.profiles add column if not exists preferred_long_run_day text;
alter table public.profiles add column if not exists strength_preference text;
alter table public.profiles add column if not exists equipment text;
alter table public.profiles add column if not exists injury_caution boolean not null default false;
alter table public.profiles add column if not exists coaching_tone text;
alter table public.profiles add column if not exists onboarding_answers jsonb not null default '{}'::jsonb;

alter table public.training_plans add column if not exists plan_json jsonb not null default '{}'::jsonb;

alter table public.workouts add column if not exists training_plan_id uuid references public.training_plans(id) on delete cascade;
alter table public.workouts add column if not exists target_pace jsonb;

alter table public.activities add column if not exists elevation_meters numeric;
alter table public.activities add column if not exists heart_rate_average integer;
alter table public.activities add column if not exists route_json jsonb;

alter table public.events drop constraint if exists events_country_check;
alter table public.events add column if not exists location text;
alter table public.events add column if not exists event_date date;
alter table public.events add column if not exists terrain text;
alter table public.events add column if not exists elevation_meters numeric;
alter table public.events add column if not exists vibe text;
alter table public.events add column if not exists registration_url text;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'subscriptions',
    'training_plans',
    'workouts',
    'activities',
    'strava_connections',
    'garmin_connections',
    'plan_events',
    'checkins',
    'achievements',
    'data_source_consents',
    'activity_import_logs',
    'shoes',
    'activity_shoes',
    'race_strategies',
    'race_readiness_scores',
    'race_checklists',
    'life_mode_requests',
    'weekly_adjustments',
    'connected_service_audit_logs',
    'ai_chat_threads',
    'ai_chat_messages',
    'ai_usage_logs',
    'ai_data_access_logs',
    'ai_analysis_reports',
    'user_data_export_requests',
    'user_data_deletion_requests'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists "Users manage own rows" on public.%I', table_name);
    execute format(
      'create policy "Users manage own rows" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      table_name
    );
  end loop;
end $$;

alter table public.profiles enable row level security;
drop policy if exists "Users manage own profile" on public.profiles;
create policy "Users manage own profile"
on public.profiles
for all
using (auth.uid() = id)
with check (auth.uid() = id);

alter table public.user_privacy_preferences enable row level security;
drop policy if exists "Users manage own privacy preferences" on public.user_privacy_preferences;
create policy "Users manage own privacy preferences"
on public.user_privacy_preferences
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

alter table public.events enable row level security;
drop policy if exists "Events are publicly readable" on public.events;
create policy "Events are publicly readable"
on public.events
for select
using (true);

drop policy if exists "Admins manage events" on public.events;
create policy "Admins manage events"
on public.events
for all
using (public.is_admin())
with check (public.is_admin());

alter table public.admin_audit_logs enable row level security;
drop policy if exists "Admins manage admin audit logs" on public.admin_audit_logs;
create policy "Admins manage admin audit logs"
on public.admin_audit_logs
for all
using (public.is_admin())
with check (public.is_admin());

alter table public.app_error_logs enable row level security;
drop policy if exists "Users insert own app errors" on public.app_error_logs;
create policy "Users insert own app errors"
on public.app_error_logs
for insert
with check (auth.uid() = user_id);

drop policy if exists "Admins read app errors" on public.app_error_logs;
create policy "Admins read app errors"
on public.app_error_logs
for select
using (public.is_admin());

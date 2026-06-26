create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  timezone text not null default 'America/Toronto',
  onboarding jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.privacy_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile_private boolean not null default true,
  activity_private boolean not null default true,
  marketing_opt_in boolean not null default false,
  analytics_opt_in boolean not null default false,
  ai_coach_enabled boolean not null default false,
  allow_activity_data_for_ai boolean not null default false,
  allow_check_ins_for_ai boolean not null default false,
  allow_profile_for_ai boolean not null default false,
  save_ai_chat_history boolean not null default false,
  gps_route_storage_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tier text not null default 'free' check (tier in ('free', 'pro', 'elite')),
  provider text not null default 'revenuecat',
  provider_customer_id text,
  status text not null default 'inactive',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create table public.training_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  goal jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('draft', 'active', 'completed', 'archived')),
  current_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.plan_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.training_plans(id) on delete cascade,
  version_number integer not null,
  plan_snapshot jsonb not null,
  generated_by text not null default 'deterministic' check (generated_by in ('deterministic', 'ai_assisted', 'manual')),
  created_at timestamptz not null default now(),
  unique (plan_id, version_number)
);

alter table public.training_plans
  add constraint training_plans_current_version_id_fkey
  foreign key (current_version_id) references public.plan_versions(id) on delete set null;

create table public.plan_change_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.training_plans(id) on delete cascade,
  plan_version_id uuid references public.plan_versions(id) on delete set null,
  change_type text not null,
  what_changed text not null,
  why_changed text not null,
  next_step text not null,
  safety_rules_applied jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid references public.training_plans(id) on delete cascade,
  plan_version_id uuid references public.plan_versions(id) on delete set null,
  scheduled_date date not null,
  title text not null,
  workout_type text not null,
  intensity text not null check (intensity in ('easy', 'moderate', 'hard')),
  purpose text not null,
  status text not null default 'planned' check (status in ('planned', 'completed', 'missed', 'swapped')),
  distance_km numeric,
  duration_minutes integer,
  steps jsonb not null default '[]'::jsonb,
  completion_notes text,
  perceived_effort integer check (perceived_effort between 1 and 10),
  fatigue_after integer check (fatigue_after between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id uuid references public.workouts(id) on delete set null,
  source text not null check (source in ('pacepilot_gps', 'pacepilot_manual', 'strava_cache', 'garmin_import', 'apple_health_import', 'user_provided_import')),
  started_at timestamptz not null,
  distance_km numeric not null,
  duration_seconds integer not null,
  average_pace_seconds_per_km integer,
  perceived_effort integer check (perceived_effort between 1 and 10),
  fatigue_after integer check (fatigue_after between 1 and 5),
  notes text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activity_route_points (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  recorded_at timestamptz not null,
  latitude double precision not null,
  longitude double precision not null,
  altitude_meters double precision,
  sequence_index integer not null,
  created_at timestamptz not null default now()
);

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  fatigue integer not null check (fatigue between 1 and 5),
  soreness integer not null check (soreness between 1 and 5),
  sleep_hours numeric not null,
  motivation integer not null check (motivation between 1 and 5),
  injury_concern boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create table public.training_readiness_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id uuid references public.workouts(id) on delete cascade,
  fatigue integer not null check (fatigue between 1 and 5),
  soreness integer not null check (soreness between 1 and 5),
  sleep_hours numeric not null,
  motivation integer not null check (motivation between 1 and 5),
  injury_concern boolean not null default false,
  recommended_action text not null check (recommended_action in ('proceed', 'reduce', 'swap_easy', 'rest')),
  created_at timestamptz not null default now()
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_type text not null,
  title text not null,
  metadata jsonb not null default '{}'::jsonb,
  awarded_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  region text,
  country text not null check (country in ('US', 'CA')),
  race_date date not null,
  distance_km numeric not null,
  terrain_tags text[] not null default '{}',
  vibe_tags text[] not null default '{}',
  featured boolean not null default false,
  import_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.event_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_event_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.event_admins
    where user_id = auth.uid()
  );
$$;

create table public.strava_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  athlete_id text not null,
  access_token_encrypted text,
  refresh_token_encrypted text,
  expires_at timestamptz,
  connected_at timestamptz not null default now(),
  disconnected_at timestamptz,
  unique (user_id, athlete_id)
);

create table public.strava_activity_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  strava_activity_id text not null,
  payload jsonb not null,
  cached_at timestamptz not null default now(),
  unique (user_id, strava_activity_id)
);

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  feature text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content jsonb not null,
  data_categories_used text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.ai_analysis_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_type text not null check (report_type in ('weekly', 'workout', 'race_strategy', 'goal_progress', 'fatigue_readiness', 'load_trend')),
  related_plan_id uuid references public.training_plans(id) on delete set null,
  related_workout_id uuid references public.workouts(id) on delete set null,
  content jsonb not null,
  data_categories_used text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  model text not null,
  fallback_used boolean not null default false,
  input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  latency_ms integer,
  status text not null check (status in ('success', 'error', 'blocked')),
  created_at timestamptz not null default now()
);

create table public.ai_prompt_audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  model text not null,
  data_categories_used text[] not null default '{}',
  token_usage jsonb not null default '{}'::jsonb,
  latency_ms integer,
  status text not null check (status in ('success', 'error', 'blocked')),
  error_category text,
  raw_content_stored boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.coach_memory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  value text not null,
  source text not null check (source in ('onboarding', 'race_result', 'check_in', 'plan_adjustment', 'user_edit')),
  user_editable boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'requested' check (status in ('requested', 'processing', 'completed', 'cancelled')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.data_source_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null,
  ai_allowed boolean not null default false,
  coaching_allowed boolean not null default false,
  analytics_allowed boolean not null default false,
  consented_at timestamptz not null default now(),
  revoked_at timestamptz,
  consent_text text,
  created_at timestamptz not null default now(),
  unique (user_id, source)
);

create table public.activity_import_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null,
  original_filename text,
  imported_count integer not null default 0,
  rejected_count integer not null default 0,
  ai_allowed boolean not null default false,
  coaching_allowed boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.shoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand text not null,
  model text not null,
  nickname text,
  purchase_date date,
  starting_distance_km numeric not null default 0,
  current_distance_km numeric not null default 0,
  retirement_distance_km numeric not null default 650,
  retired boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activity_shoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  shoe_id uuid not null references public.shoes(id) on delete cascade,
  distance_km numeric not null,
  created_at timestamptz not null default now(),
  unique (activity_id, shoe_id)
);

create table public.race_strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  plan_id uuid references public.training_plans(id) on delete set null,
  race_distance text not null,
  goal_time_seconds integer not null,
  pacing_style text not null,
  strategy_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.race_readiness_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid references public.training_plans(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  score integer not null check (score between 0 and 100),
  label text not null,
  explanations text[] not null default '{}',
  recommended_action text not null,
  input_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.race_checklists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  title text not null,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.life_mode_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid references public.training_plans(id) on delete set null,
  workout_id uuid references public.workouts(id) on delete set null,
  mode text not null,
  user_note text,
  suggested_action text not null,
  applied boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.weekly_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid references public.training_plans(id) on delete cascade,
  week_start date not null,
  fatigue integer check (fatigue between 1 and 5),
  soreness integer check (soreness between 1 and 5),
  sleep_quality integer check (sleep_quality between 1 and 5),
  motivation integer check (motivation between 1 and 5),
  perceived_difficulty text,
  desired_next_week text,
  adjustment_json jsonb not null default '{}'::jsonb,
  applied boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.garmin_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  garmin_user_id text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  connected_at timestamptz not null default now(),
  disconnected_at timestamptz,
  last_sync_at timestamptz,
  unique (user_id, garmin_user_id)
);

create table public.connected_service_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.ai_chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid not null references public.ai_chat_threads(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  allowed_data_sources text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.ai_data_access_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  data_sources_used text[] not null default '{}',
  excluded_sources text[] not null default '{}',
  reason text,
  created_at timestamptz not null default now()
);

create table public.user_data_export_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'requested',
  requested_categories text[] not null default '{}',
  export_url text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.user_data_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'requested',
  requested_categories text[] not null default '{}',
  reason text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  message text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.app_error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  area text not null,
  error_message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_route_points_activity_id_idx on public.activity_route_points(activity_id, sequence_index);
create index workouts_user_date_idx on public.workouts(user_id, scheduled_date);
create index activities_user_started_at_idx on public.activities(user_id, started_at desc);
create index ai_usage_events_user_feature_created_idx on public.ai_usage_events(user_id, feature, created_at desc);

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger privacy_preferences_set_updated_at before update on public.privacy_preferences for each row execute function public.set_updated_at();
create trigger subscriptions_set_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();
create trigger training_plans_set_updated_at before update on public.training_plans for each row execute function public.set_updated_at();
create trigger workouts_set_updated_at before update on public.workouts for each row execute function public.set_updated_at();
create trigger activities_set_updated_at before update on public.activities for each row execute function public.set_updated_at();
create trigger events_set_updated_at before update on public.events for each row execute function public.set_updated_at();
create trigger ai_conversations_set_updated_at before update on public.ai_conversations for each row execute function public.set_updated_at();
create trigger coach_memory_items_set_updated_at before update on public.coach_memory_items for each row execute function public.set_updated_at();
create trigger shoes_set_updated_at before update on public.shoes for each row execute function public.set_updated_at();
create trigger race_strategies_set_updated_at before update on public.race_strategies for each row execute function public.set_updated_at();
create trigger race_checklists_set_updated_at before update on public.race_checklists for each row execute function public.set_updated_at();
create trigger ai_chat_threads_set_updated_at before update on public.ai_chat_threads for each row execute function public.set_updated_at();
create trigger support_requests_set_updated_at before update on public.support_requests for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.privacy_preferences enable row level security;
alter table public.subscriptions enable row level security;
alter table public.training_plans enable row level security;
alter table public.plan_versions enable row level security;
alter table public.plan_change_events enable row level security;
alter table public.workouts enable row level security;
alter table public.activities enable row level security;
alter table public.activity_route_points enable row level security;
alter table public.check_ins enable row level security;
alter table public.training_readiness_checkins enable row level security;
alter table public.achievements enable row level security;
alter table public.events enable row level security;
alter table public.event_admins enable row level security;
alter table public.strava_connections enable row level security;
alter table public.strava_activity_cache enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_analysis_reports enable row level security;
alter table public.ai_usage_events enable row level security;
alter table public.ai_prompt_audit_events enable row level security;
alter table public.coach_memory_items enable row level security;
alter table public.account_deletion_requests enable row level security;
alter table public.data_source_consents enable row level security;
alter table public.activity_import_logs enable row level security;
alter table public.shoes enable row level security;
alter table public.activity_shoes enable row level security;
alter table public.race_strategies enable row level security;
alter table public.race_readiness_scores enable row level security;
alter table public.race_checklists enable row level security;
alter table public.life_mode_requests enable row level security;
alter table public.weekly_adjustments enable row level security;
alter table public.garmin_connections enable row level security;
alter table public.connected_service_audit_logs enable row level security;
alter table public.ai_chat_threads enable row level security;
alter table public.ai_chat_messages enable row level security;
alter table public.ai_data_access_logs enable row level security;
alter table public.user_data_export_requests enable row level security;
alter table public.user_data_deletion_requests enable row level security;
alter table public.support_requests enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.app_error_logs enable row level security;

create policy "Users manage own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "Users manage own privacy preferences" on public.privacy_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own subscriptions" on public.subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own training plans" on public.training_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own plan versions" on public.plan_versions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own plan changes" on public.plan_change_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own workouts" on public.workouts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own activities" on public.activities for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own route points" on public.activity_route_points for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own check-ins" on public.check_ins for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own readiness check-ins" on public.training_readiness_checkins for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own achievements" on public.achievements for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own Strava connections" on public.strava_connections for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own Strava cache" on public.strava_activity_cache for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own AI conversations" on public.ai_conversations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own AI messages" on public.ai_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own AI reports" on public.ai_analysis_reports for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own AI usage" on public.ai_usage_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own AI audit metadata" on public.ai_prompt_audit_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own coach memory" on public.coach_memory_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own deletion requests" on public.account_deletion_requests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own data source consents" on public.data_source_consents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own import logs" on public.activity_import_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own shoes" on public.shoes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own activity shoes" on public.activity_shoes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own race strategies" on public.race_strategies for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own race readiness" on public.race_readiness_scores for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own race checklists" on public.race_checklists for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own life mode requests" on public.life_mode_requests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own weekly adjustments" on public.weekly_adjustments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own Garmin connections" on public.garmin_connections for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own connected service audit logs" on public.connected_service_audit_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own AI chat threads" on public.ai_chat_threads for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own AI chat messages" on public.ai_chat_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own AI data access logs" on public.ai_data_access_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own data export requests" on public.user_data_export_requests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own data deletion requests" on public.user_data_deletion_requests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own support requests" on public.support_requests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Admins read admin audit logs" on public.admin_audit_logs for select using (public.is_event_admin());
create policy "Admins insert admin audit logs" on public.admin_audit_logs for insert with check (public.is_event_admin());
create policy "Users insert own app error logs" on public.app_error_logs for insert with check (auth.uid() = user_id or user_id is null);
create policy "Users read own app error logs" on public.app_error_logs for select using (auth.uid() = user_id);
create policy "Admins read app error logs" on public.app_error_logs for select using (public.is_event_admin());

create policy "Events are publicly readable" on public.events for select using (true);
create policy "Admins insert events" on public.events for insert with check (public.is_event_admin());
create policy "Admins update events" on public.events for update using (public.is_event_admin()) with check (public.is_event_admin());
create policy "Admins delete events" on public.events for delete using (public.is_event_admin());
create policy "Admins read event admins" on public.event_admins for select using (public.is_event_admin());

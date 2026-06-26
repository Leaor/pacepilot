-- Demo seed data for local Supabase development.
-- Do not run this in production. Replace the demo auth user with a real Supabase Auth account.

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'michael@example.com',
  crypt('pacepilot-demo-password', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Michael"}'::jsonb,
  now(),
  now()
)
on conflict (id) do nothing;

insert into public.profiles (
  id,
  email,
  display_name,
  name,
  timezone,
  units,
  experience_level,
  current_weekly_mileage,
  longest_recent_run,
  goal,
  race_date,
  goal_time_seconds,
  available_run_days,
  preferred_long_run_day,
  strength_preference,
  equipment,
  injury_caution,
  coaching_tone
)
values (
  '11111111-1111-1111-1111-111111111111',
  'michael@example.com',
  'Michael',
  'Michael',
  'America/Toronto',
  'km',
  'intermediate',
  34,
  14,
  '10K',
  current_date + interval '62 days',
  2820,
  array['Mon','Tue','Thu','Sat','Sun'],
  'Sun',
  '2 days',
  'dumbbells',
  false,
  'encouraging'
)
on conflict (id) do update set updated_at = now();

insert into public.user_privacy_preferences (
  user_id,
  ai_coach_enabled,
  ai_can_use_pacepilot_activity_history,
  ai_can_use_checkins,
  ai_can_use_race_goals,
  ai_can_use_chat_history,
  ai_can_use_user_provided_imports
)
values (
  '11111111-1111-1111-1111-111111111111',
  true,
  true,
  true,
  true,
  false,
  true
)
on conflict (user_id) do update set updated_at = now();

insert into public.subscriptions (user_id, tier, status, provider, entitlement_snapshot)
values (
  '11111111-1111-1111-1111-111111111111',
  'elite',
  'trial',
  'revenuecat',
  '{"mock":true}'::jsonb
);

insert into public.events (name, city, region, country, location, race_date, event_date, distance_km, terrain, elevation_meters, vibe, registration_url, featured)
values
  ('Toronto Waterfront 10K', 'Toronto', 'Ontario', 'CA', 'Toronto, Ontario', current_date + interval '62 days', current_date + interval '62 days', 10, 'road', 48, 'fast', 'https://example.com/toronto-waterfront-10k', true),
  ('Hamilton Bayfront Half', 'Hamilton', 'Ontario', 'CA', 'Hamilton, Ontario', current_date + interval '91 days', current_date + interval '91 days', 21.1, 'mixed', 115, 'scenic', 'https://example.com/hamilton-half', true),
  ('Berlin Autumn Marathon', 'Berlin', null, 'DE', 'Berlin, Germany', current_date + interval '124 days', current_date + interval '124 days', 42.195, 'road', 34, 'destination', 'https://example.com/berlin-autumn-marathon', true)
on conflict do nothing;

with plan as (
  insert into public.training_plans (user_id, name, goal, race_date, status, plan_json)
  values (
    '11111111-1111-1111-1111-111111111111',
    'Sample 10K Plan',
    '{"goal":"10K"}'::jsonb,
    current_date + interval '62 days',
    'active',
    '{"source":"demo","weeks":10}'::jsonb
  )
  returning id
)
insert into public.workouts (user_id, training_plan_id, scheduled_date, title, workout_type, distance_km, target_pace, purpose)
select
  '11111111-1111-1111-1111-111111111111',
  plan.id,
  current_date + offset_days,
  title,
  workout_type,
  distance_km,
  target_pace,
  purpose
from plan,
(values
  (1, 'Easy Run', 'easy_run', 7.2, '{"range":"5:50/km - 6:30/km"}'::jsonb, 'Build aerobic capacity.'),
  (3, 'Tempo Run', 'tempo_run', 8.0, '{"range":"4:55/km - 5:10/km"}'::jsonb, 'Practice controlled threshold rhythm.'),
  (6, 'Long Run', 'long_run', 14.0, '{"range":"6:00/km - 6:50/km"}'::jsonb, 'Extend endurance.')
) as w(offset_days, title, workout_type, distance_km, target_pace, purpose);

insert into public.shoes (user_id, brand, model, nickname, purchase_date, current_mileage, retirement_mileage_target, notes)
values
  ('11111111-1111-1111-1111-111111111111', 'PacePilot', 'Fleet Trainer', 'Orange pair', current_date - interval '90 days', 286, 650, 'Daily trainer.'),
  ('11111111-1111-1111-1111-111111111111', 'PacePilot', 'Race Wing', 'Race day', current_date - interval '30 days', 42, 320, 'Workouts and races.');

insert into public.activities (user_id, source, started_at, distance_km, duration_seconds, elevation_meters, average_pace_seconds_per_km, perceived_effort, fatigue_after, notes)
values
  ('11111111-1111-1111-1111-111111111111', 'pacepilot_gps', now() - interval '1 day', 8.2, 2886, 42, 352, 4, 2, 'Smooth aerobic run by feel.'),
  ('11111111-1111-1111-1111-111111111111', 'pacepilot_manual', now() - interval '3 days', 6.0, 2070, 12, 345, 6, 3, 'Tempo felt controlled.'),
  ('11111111-1111-1111-1111-111111111111', 'strava_cache', now() - interval '5 days', 10.1, 3650, 88, 361, 5, 3, 'Display-only Strava sync. Excluded from AI.');

insert into public.checkins (user_id, fatigue, soreness, sleep_hours, motivation, week_difficulty, next_week_preference, notes)
values ('11111111-1111-1111-1111-111111111111', 2, 2, 7.3, 4, 3, 'maintain', 'Feeling steady.');

insert into public.race_readiness_scores (user_id, score, label, explanations, recommended_next_action)
values (
  '11111111-1111-1111-1111-111111111111',
  82,
  'race_ready',
  '[{"title":"Consistency","detail":"Plan adherence is steady."},{"title":"Endurance","detail":"Long run progression is on track."},{"title":"Freshness","detail":"Fatigue is manageable."}]'::jsonb,
  'Stay patient and protect the next key workout.'
);

with thread as (
  insert into public.ai_chat_threads (user_id, title)
  values ('11111111-1111-1111-1111-111111111111', '10K pacing')
  returning id
)
insert into public.ai_chat_messages (user_id, thread_id, role, content, used_sources, excluded_sources)
select
  '11111111-1111-1111-1111-111111111111',
  thread.id,
  'assistant',
  'Your 10K plan should feel controlled through 7 km, then gradually tighten effort if breathing is stable.',
  '["profile","training_plans","activities:pacepilot_gps"]'::jsonb,
  '["activities:strava_cache"]'::jsonb
from thread;

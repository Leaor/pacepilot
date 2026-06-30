alter table public.training_plans
  add column if not exists race_date date;

alter table public.training_plans
  add column if not exists plan_json jsonb not null default '{}'::jsonb;

alter table public.workouts
  add column if not exists plan_id uuid references public.training_plans(id) on delete cascade;

alter table public.workouts
  add column if not exists training_plan_id uuid references public.training_plans(id) on delete cascade;

alter table public.workouts
  add column if not exists target_pace jsonb;

create index if not exists training_plans_user_status_idx
on public.training_plans(user_id, status);

create index if not exists workouts_training_plan_id_idx
on public.workouts(training_plan_id);

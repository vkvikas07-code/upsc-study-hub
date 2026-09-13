-- =========================================================
-- UPSC STUDY HUB
-- 008 - Personal Study Time Preferences
-- =========================================================

create extension if not exists pgcrypto;


-- =========================================================
-- 1. STUDY TIME PREFERENCES
-- =========================================================

create table if not exists public.study_time_preferences (

  user_id uuid primary key
    references auth.users(id)
    on delete cascade,

  morning_start time not null
    default '06:00',

  morning_end time not null
    default '11:30',

  afternoon_start time not null
    default '12:00',

  afternoon_end time not null
    default '17:00',

  evening_start time not null
    default '17:00',

  evening_end time not null
    default '23:59',

  created_at timestamptz
    not null default now(),

  updated_at timestamptz
    not null default now()
);


-- =========================================================
-- 2. SUPPORT EXISTING DATABASES
-- =========================================================

alter table public.study_time_preferences
add column if not exists morning_start time;

alter table public.study_time_preferences
add column if not exists morning_end time;

alter table public.study_time_preferences
add column if not exists afternoon_start time;

alter table public.study_time_preferences
add column if not exists afternoon_end time;

alter table public.study_time_preferences
add column if not exists evening_start time;

alter table public.study_time_preferences
add column if not exists evening_end time;

alter table public.study_time_preferences
add column if not exists created_at timestamptz;

alter table public.study_time_preferences
add column if not exists updated_at timestamptz;


-- =========================================================
-- 3. BACKFILL
-- =========================================================

update public.study_time_preferences
set morning_start = '06:00'
where morning_start is null;

update public.study_time_preferences
set morning_end = '11:30'
where morning_end is null;

update public.study_time_preferences
set afternoon_start = '12:00'
where afternoon_start is null;

update public.study_time_preferences
set afternoon_end = '17:00'
where afternoon_end is null;

update public.study_time_preferences
set evening_start = '17:00'
where evening_start is null;

update public.study_time_preferences
set evening_end = '23:59'
where evening_end is null;

update public.study_time_preferences
set created_at = now()
where created_at is null;

update public.study_time_preferences
set updated_at = now()
where updated_at is null;


-- =========================================================
-- 4. DEFAULTS + NOT NULL
-- =========================================================

alter table public.study_time_preferences
alter column morning_start
set default '06:00';

alter table public.study_time_preferences
alter column morning_start
set not null;


alter table public.study_time_preferences
alter column morning_end
set default '11:30';

alter table public.study_time_preferences
alter column morning_end
set not null;


alter table public.study_time_preferences
alter column afternoon_start
set default '12:00';

alter table public.study_time_preferences
alter column afternoon_start
set not null;


alter table public.study_time_preferences
alter column afternoon_end
set default '17:00';

alter table public.study_time_preferences
alter column afternoon_end
set not null;


alter table public.study_time_preferences
alter column evening_start
set default '17:00';

alter table public.study_time_preferences
alter column evening_start
set not null;


alter table public.study_time_preferences
alter column evening_end
set default '23:59';

alter table public.study_time_preferences
alter column evening_end
set not null;


alter table public.study_time_preferences
alter column created_at
set default now();

alter table public.study_time_preferences
alter column created_at
set not null;


alter table public.study_time_preferences
alter column updated_at
set default now();

alter table public.study_time_preferences
alter column updated_at
set not null;


-- =========================================================
-- 5. TIME VALIDATION
-- =========================================================

do $$
begin

  if not exists (
    select 1
    from pg_constraint
    where conname =
      'study_time_morning_check'
  ) then

    alter table public.study_time_preferences
    add constraint
    study_time_morning_check
    check (
      morning_start <
      morning_end
    );

  end if;


  if not exists (
    select 1
    from pg_constraint
    where conname =
      'study_time_afternoon_check'
  ) then

    alter table public.study_time_preferences
    add constraint
    study_time_afternoon_check
    check (
      afternoon_start <
      afternoon_end
    );

  end if;


  if not exists (
    select 1
    from pg_constraint
    where conname =
      'study_time_evening_check'
  ) then

    alter table public.study_time_preferences
    add constraint
    study_time_evening_check
    check (
      evening_start <
      evening_end
    );

  end if;


  if not exists (
    select 1
    from pg_constraint
    where conname =
      'study_time_period_order_check'
  ) then

    alter table public.study_time_preferences
    add constraint
    study_time_period_order_check
    check (
      morning_end <=
        afternoon_start

      and

      afternoon_end <=
        evening_start
    );

  end if;

end;
$$;


-- =========================================================
-- 6. ROW LEVEL SECURITY
-- =========================================================

alter table public.study_time_preferences
enable row level security;


grant select, insert, update, delete
on table public.study_time_preferences
to authenticated;


drop policy if exists
"users own study time preferences"
on public.study_time_preferences;

drop policy if exists
"users read own study time preferences"
on public.study_time_preferences;

drop policy if exists
"users create own study time preferences"
on public.study_time_preferences;

drop policy if exists
"users update own study time preferences"
on public.study_time_preferences;

drop policy if exists
"users delete own study time preferences"
on public.study_time_preferences;


create policy
"users read own study time preferences"
on public.study_time_preferences
for select
to authenticated
using (
  auth.uid() = user_id
);


create policy
"users create own study time preferences"
on public.study_time_preferences
for insert
to authenticated
with check (
  auth.uid() = user_id
);


create policy
"users update own study time preferences"
on public.study_time_preferences
for update
to authenticated
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);


create policy
"users delete own study time preferences"
on public.study_time_preferences
for delete
to authenticated
using (
  auth.uid() = user_id
);


-- =========================================================
-- 7. UPDATED_AT TRIGGER
-- =========================================================

create or replace function
public.set_study_time_updated_at()
returns trigger
language plpgsql
as $$
begin

  new.updated_at := now();

  return new;

end;
$$;


drop trigger if exists
study_time_preferences_updated_at_trigger
on public.study_time_preferences;


create trigger
study_time_preferences_updated_at_trigger
before update
on public.study_time_preferences
for each row
execute function
public.set_study_time_updated_at();


-- =========================================================
-- END OF MIGRATION
-- =========================================================

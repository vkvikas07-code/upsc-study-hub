-- =========================================================
-- UPSC STUDY HUB
-- 006 - Prelims Practice History
-- =========================================================

create extension if not exists pgcrypto;


-- =========================================================
-- 1. PRACTICE ATTEMPTS
-- =========================================================

create table if not exists public.practice_attempts (

  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  mode text not null default 'practice',

  total_questions integer not null default 0,
  attempted_questions integer not null default 0,
  correct_answers integer not null default 0,
  incorrect_answers integer not null default 0,
  unanswered_questions integer not null default 0,

  score_percent numeric not null default 0,

  subject text,

  answers jsonb not null default '[]'::jsonb,

  marks_obtained numeric,
  max_marks numeric,
  negative_marks numeric,

  duration_seconds integer,
  time_limit_seconds integer,

  practice_config jsonb,

  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);


-- =========================================================
-- 2. ENSURE REQUIRED COLUMNS EXIST
--    FOR OLDER DATABASES
-- =========================================================

alter table public.practice_attempts
add column if not exists mode text;

alter table public.practice_attempts
add column if not exists total_questions integer;

alter table public.practice_attempts
add column if not exists attempted_questions integer;

alter table public.practice_attempts
add column if not exists correct_answers integer;

alter table public.practice_attempts
add column if not exists incorrect_answers integer;

alter table public.practice_attempts
add column if not exists unanswered_questions integer;

alter table public.practice_attempts
add column if not exists score_percent numeric;

alter table public.practice_attempts
add column if not exists subject text;

alter table public.practice_attempts
add column if not exists answers jsonb;

alter table public.practice_attempts
add column if not exists marks_obtained numeric;

alter table public.practice_attempts
add column if not exists max_marks numeric;

alter table public.practice_attempts
add column if not exists negative_marks numeric;

alter table public.practice_attempts
add column if not exists duration_seconds integer;

alter table public.practice_attempts
add column if not exists time_limit_seconds integer;

alter table public.practice_attempts
add column if not exists practice_config jsonb;

alter table public.practice_attempts
add column if not exists completed_at timestamptz;

alter table public.practice_attempts
add column if not exists created_at timestamptz;


-- =========================================================
-- 3. BACKFILL OLD ROWS
-- =========================================================

update public.practice_attempts
set mode = 'practice'
where mode is null;


update public.practice_attempts
set total_questions = 0
where total_questions is null;


update public.practice_attempts
set attempted_questions = 0
where attempted_questions is null;


update public.practice_attempts
set correct_answers = 0
where correct_answers is null;


update public.practice_attempts
set incorrect_answers = 0
where incorrect_answers is null;


update public.practice_attempts
set unanswered_questions = 0
where unanswered_questions is null;


update public.practice_attempts
set score_percent = 0
where score_percent is null;


update public.practice_attempts
set answers = '[]'::jsonb
where answers is null;


update public.practice_attempts
set completed_at =
  coalesce(
    completed_at,
    created_at,
    now()
  )
where completed_at is null;


update public.practice_attempts
set created_at =
  coalesce(
    created_at,
    completed_at,
    now()
  )
where created_at is null;


-- =========================================================
-- 4. DEFAULTS + NOT NULL
-- =========================================================

alter table public.practice_attempts
alter column mode
set default 'practice';

alter table public.practice_attempts
alter column mode
set not null;


alter table public.practice_attempts
alter column total_questions
set default 0;

alter table public.practice_attempts
alter column total_questions
set not null;


alter table public.practice_attempts
alter column attempted_questions
set default 0;

alter table public.practice_attempts
alter column attempted_questions
set not null;


alter table public.practice_attempts
alter column correct_answers
set default 0;

alter table public.practice_attempts
alter column correct_answers
set not null;


alter table public.practice_attempts
alter column incorrect_answers
set default 0;

alter table public.practice_attempts
alter column incorrect_answers
set not null;


alter table public.practice_attempts
alter column unanswered_questions
set default 0;

alter table public.practice_attempts
alter column unanswered_questions
set not null;


alter table public.practice_attempts
alter column score_percent
set default 0;

alter table public.practice_attempts
alter column score_percent
set not null;


alter table public.practice_attempts
alter column answers
set default '[]'::jsonb;

alter table public.practice_attempts
alter column answers
set not null;


alter table public.practice_attempts
alter column completed_at
set default now();

alter table public.practice_attempts
alter column completed_at
set not null;


alter table public.practice_attempts
alter column created_at
set default now();

alter table public.practice_attempts
alter column created_at
set not null;


-- =========================================================
-- 5. DATA SAFETY CHECKS
-- =========================================================

do $$
begin

  if not exists (
    select 1
    from pg_constraint
    where conname =
      'practice_attempts_mode_check'
  ) then

    alter table public.practice_attempts
    add constraint
    practice_attempts_mode_check
    check (
      mode in (
        'practice',
        'exam'
      )
    );

  end if;


  if not exists (
    select 1
    from pg_constraint
    where conname =
      'practice_attempts_counts_check'
  ) then

    alter table public.practice_attempts
    add constraint
    practice_attempts_counts_check
    check (
      total_questions >= 0
      and attempted_questions >= 0
      and correct_answers >= 0
      and incorrect_answers >= 0
      and unanswered_questions >= 0
    );

  end if;


  if not exists (
    select 1
    from pg_constraint
    where conname =
      'practice_attempts_duration_check'
  ) then

    alter table public.practice_attempts
    add constraint
    practice_attempts_duration_check
    check (
      duration_seconds is null
      or duration_seconds >= 0
    );

  end if;


  if not exists (
    select 1
    from pg_constraint
    where conname =
      'practice_attempts_time_limit_check'
  ) then

    alter table public.practice_attempts
    add constraint
    practice_attempts_time_limit_check
    check (
      time_limit_seconds is null
      or time_limit_seconds >= 0
    );

  end if;


  if not exists (
    select 1
    from pg_constraint
    where conname =
      'practice_attempts_negative_marks_check'
  ) then

    alter table public.practice_attempts
    add constraint
    practice_attempts_negative_marks_check
    check (
      negative_marks is null
      or negative_marks >= 0
    );

  end if;

end;
$$;


-- =========================================================
-- 6. ROW LEVEL SECURITY
-- =========================================================

alter table public.practice_attempts
enable row level security;


grant select, insert, update, delete
on table public.practice_attempts
to authenticated;


drop policy if exists
"users own practice attempts"
on public.practice_attempts;

drop policy if exists
"users read own practice attempts"
on public.practice_attempts;

drop policy if exists
"users create own practice attempts"
on public.practice_attempts;

drop policy if exists
"users update own practice attempts"
on public.practice_attempts;

drop policy if exists
"users delete own practice attempts"
on public.practice_attempts;


create policy
"users read own practice attempts"
on public.practice_attempts
for select
to authenticated
using (
  auth.uid() = user_id
);


create policy
"users create own practice attempts"
on public.practice_attempts
for insert
to authenticated
with check (
  auth.uid() = user_id
);


create policy
"users update own practice attempts"
on public.practice_attempts
for update
to authenticated
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);


create policy
"users delete own practice attempts"
on public.practice_attempts
for delete
to authenticated
using (
  auth.uid() = user_id
);


-- =========================================================
-- 7. INDEXES
-- =========================================================

create index if not exists
practice_attempts_user_completed_idx
on public.practice_attempts (
  user_id,
  completed_at desc
);


create index if not exists
practice_attempts_user_mode_idx
on public.practice_attempts (
  user_id,
  mode
);


create index if not exists
practice_attempts_user_subject_idx
on public.practice_attempts (
  user_id,
  subject
);


-- =========================================================
-- END OF MIGRATION
-- =========================================================

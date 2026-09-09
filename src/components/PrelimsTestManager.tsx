-- =========================================================
-- UPSC STUDY HUB
-- PRELIMS TEST SERIES FOUNDATION
-- Safe upgrade for existing tables
-- =========================================================


-- =========================================================
-- 1. UPGRADE TESTS TABLE
-- =========================================================

alter table public.tests
  add column if not exists exam_stage text default 'prelims',
  add column if not exists paper text default 'GS Paper I',
  add column if not exists test_type text default 'sectional',
  add column if not exists marks_per_question numeric(10,4) default 2,
  add column if not exists negative_marks numeric(10,4) default 0.6667,
  add column if not exists instructions text,
  add column if not exists created_by uuid references auth.users(id),
  add column if not exists updated_at timestamptz default now();


-- =========================================================
-- 2. SAFE CHECK CONSTRAINTS
-- =========================================================

do $$
begin

  if not exists (
    select 1
    from pg_constraint
    where conname = 'tests_exam_stage_check'
  ) then

    alter table public.tests
      add constraint tests_exam_stage_check
      check (
        exam_stage in (
          'prelims',
          'mains'
        )
      );

  end if;


  if not exists (
    select 1
    from pg_constraint
    where conname = 'tests_test_type_check'
  ) then

    alter table public.tests
      add constraint tests_test_type_check
      check (
        test_type in (
          'sectional',
          'full_length',
          'pyq',
          'custom'
        )
      );

  end if;

end
$$;


-- =========================================================
-- 3. TEST QUESTION ORDER
-- =========================================================

create unique index if not exists
  test_questions_test_position_unique
on public.test_questions (
  test_id,
  position
);


-- =========================================================
-- 4. UPGRADE TEST ATTEMPTS
-- =========================================================

alter table public.test_attempts
  add column if not exists total_questions integer default 0,
  add column if not exists attempted_questions integer default 0,
  add column if not exists correct_answers integer default 0,
  add column if not exists incorrect_answers integer default 0,
  add column if not exists unanswered_questions integer default 0,
  add column if not exists marks_obtained numeric(10,4),
  add column if not exists max_marks numeric(10,4),
  add column if not exists negative_marks numeric(10,4) default 0,
  add column if not exists duration_seconds integer,
  add column if not exists time_limit_seconds integer;


-- =========================================================
-- 5. ADMIN / EDITOR POLICIES FOR TESTS
-- =========================================================

drop policy if exists
  "editors manage tests"
on public.tests;


create policy
  "editors manage tests"
on public.tests
for all
using (
  public.is_editor_or_admin()
)
with check (
  public.is_editor_or_admin()
);


-- =========================================================
-- 6. ADMIN / EDITOR POLICIES FOR TEST QUESTION MAPPING
-- =========================================================

drop policy if exists
  "editors manage test questions"
on public.test_questions;


create policy
  "editors manage test questions"
on public.test_questions
for all
using (
  public.is_editor_or_admin()
)
with check (
  public.is_editor_or_admin()
);


-- =========================================================
-- 7. INDEXES
-- =========================================================

create index if not exists
  tests_exam_stage_idx
on public.tests (
  exam_stage
);


create index if not exists
  tests_published_idx
on public.tests (
  published
);


create index if not exists
  test_attempts_user_id_idx
on public.test_attempts (
  user_id
);


create index if not exists
  test_attempts_test_id_idx
on public.test_attempts (
  test_id
);


-- =========================================================
-- 8. VERIFY STRUCTURE
-- =========================================================

select
  column_name,
  data_type
from
  information_schema.columns
where
  table_schema = 'public'
  and
  table_name = 'tests'
order by
  ordinal_position;

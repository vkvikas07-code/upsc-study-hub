-- =========================================================
-- UPSC STUDY HUB
-- 005 - Prelims Question Bank + Test Series
-- =========================================================


-- =========================================================
-- 1. EXPAND QUESTION BANK
-- =========================================================

alter table public.questions
add column if not exists exam_stage text;

alter table public.questions
add column if not exists paper text;

alter table public.questions
add column if not exists topic text;

alter table public.questions
add column if not exists tags text[] default '{}';

alter table public.questions
add column if not exists is_pyq boolean default false;

alter table public.questions
add column if not exists pyq_year integer;

alter table public.questions
add column if not exists upsc_exam_name text;

alter table public.questions
add column if not exists upsc_exam_cycle text;

alter table public.questions
add column if not exists upsc_exam_stage text;

alter table public.questions
add column if not exists upsc_exam_paper text;

alter table public.questions
add column if not exists upsc_exam_year integer;

alter table public.questions
add column if not exists state_psc_state text;

alter table public.questions
add column if not exists state_psc_name text;

alter table public.questions
add column if not exists state_psc_exam_name text;

alter table public.questions
add column if not exists state_psc_year integer;

alter table public.questions
add column if not exists state_psc_stage text;

alter table public.questions
add column if not exists state_psc_paper text;

alter table public.questions
add column if not exists source_url text;

alter table public.questions
add column if not exists status text;

alter table public.questions
add column if not exists updated_at timestamptz;


-- Backfill older rows

update public.questions
set exam_stage = 'prelims'
where exam_stage is null;


update public.questions
set tags = '{}'
where tags is null;


update public.questions
set is_pyq = false
where is_pyq is null;


update public.questions
set status = 'published'
where status is null;


update public.questions
set updated_at = created_at
where updated_at is null;


alter table public.questions
alter column exam_stage
set default 'prelims';

alter table public.questions
alter column exam_stage
set not null;


alter table public.questions
alter column tags
set default '{}';

alter table public.questions
alter column tags
set not null;


alter table public.questions
alter column is_pyq
set default false;

alter table public.questions
alter column is_pyq
set not null;


alter table public.questions
alter column status
set default 'draft';

alter table public.questions
alter column status
set not null;


alter table public.questions
alter column updated_at
set default now();

alter table public.questions
alter column updated_at
set not null;


-- Add checks safely

do $$
begin

  if not exists (
    select 1
    from pg_constraint
    where conname =
      'questions_exam_stage_check'
  ) then

    alter table public.questions
    add constraint
    questions_exam_stage_check
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
    where conname =
      'questions_status_check'
  ) then

    alter table public.questions
    add constraint
    questions_status_check
    check (
      status in (
        'draft',
        'published',
        'archived'
      )
    );

  end if;

end;
$$;


create index if not exists
questions_exam_status_idx
on public.questions (
  exam_stage,
  status
);


create index if not exists
questions_subject_topic_idx
on public.questions (
  subject,
  topic
);


create index if not exists
questions_pyq_idx
on public.questions (
  is_pyq,
  pyq_year
);


-- =========================================================
-- 2. QUESTION BANK RLS
-- =========================================================

alter table public.questions
enable row level security;


grant select
on table public.questions
to authenticated;


grant insert, update, delete
on table public.questions
to authenticated;


drop policy if exists
"questions readable by signed in users"
on public.questions;

drop policy if exists
"published questions readable"
on public.questions;

drop policy if exists
"editors manage questions"
on public.questions;


create policy
"published questions readable"
on public.questions
for select
to authenticated
using (
  status = 'published'
  or public.is_editor_or_admin()
);


create policy
"editors manage questions"
on public.questions
for all
to authenticated
using (
  public.is_editor_or_admin()
)
with check (
  public.is_editor_or_admin()
);


-- =========================================================
-- 3. EXPAND TEST SERIES TABLE
-- =========================================================

alter table public.tests
add column if not exists exam_stage text;

alter table public.tests
add column if not exists paper text;

alter table public.tests
add column if not exists test_type text;

alter table public.tests
add column if not exists marks_per_question numeric;

alter table public.tests
add column if not exists negative_marks numeric;

alter table public.tests
add column if not exists instructions text;

alter table public.tests
add column if not exists created_by uuid
references auth.users(id)
on delete set null;

alter table public.tests
add column if not exists updated_at timestamptz;


-- Backfill older tests

update public.tests
set exam_stage = 'prelims'
where exam_stage is null;


update public.tests
set test_type = 'sectional'
where test_type is null;


update public.tests
set marks_per_question = 2
where marks_per_question is null;


update public.tests
set negative_marks = 0.6667
where negative_marks is null;


update public.tests
set updated_at = created_at
where updated_at is null;


alter table public.tests
alter column exam_stage
set default 'prelims';

alter table public.tests
alter column exam_stage
set not null;


alter table public.tests
alter column test_type
set default 'sectional';

alter table public.tests
alter column test_type
set not null;


alter table public.tests
alter column marks_per_question
set default 2;

alter table public.tests
alter column marks_per_question
set not null;


alter table public.tests
alter column negative_marks
set default 0.6667;

alter table public.tests
alter column negative_marks
set not null;


alter table public.tests
alter column updated_at
set default now();

alter table public.tests
alter column updated_at
set not null;


do $$
begin

  if not exists (
    select 1
    from pg_constraint
    where conname =
      'tests_exam_stage_check'
  ) then

    alter table public.tests
    add constraint
    tests_exam_stage_check
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
    where conname =
      'tests_test_type_check'
  ) then

    alter table public.tests
    add constraint
    tests_test_type_check
    check (
      test_type in (
        'sectional',
        'full_length',
        'pyq',
        'custom'
      )
    );

  end if;


  if not exists (
    select 1
    from pg_constraint
    where conname =
      'tests_marks_positive_check'
  ) then

    alter table public.tests
    add constraint
    tests_marks_positive_check
    check (
      marks_per_question > 0
    );

  end if;


  if not exists (
    select 1
    from pg_constraint
    where conname =
      'tests_negative_marks_check'
  ) then

    alter table public.tests
    add constraint
    tests_negative_marks_check
    check (
      negative_marks >= 0
    );

  end if;

end;
$$;


create index if not exists
tests_exam_published_idx
on public.tests (
  exam_stage,
  published
);


-- =========================================================
-- 4. TEST TABLE RLS
-- =========================================================

alter table public.tests
enable row level security;


grant select
on table public.tests
to anon, authenticated;


grant insert, update, delete
on table public.tests
to authenticated;


drop policy if exists
"published tests readable"
on public.tests;

drop policy if exists
"editors manage tests"
on public.tests;


create policy
"published tests readable"
on public.tests
for select
to anon, authenticated
using (
  published = true
  or public.is_editor_or_admin()
);


create policy
"editors manage tests"
on public.tests
for all
to authenticated
using (
  public.is_editor_or_admin()
)
with check (
  public.is_editor_or_admin()
);


-- =========================================================
-- 5. TEST QUESTION MAPPING
-- =========================================================

alter table public.test_questions
enable row level security;


grant select
on table public.test_questions
to anon, authenticated;


grant insert, update, delete
on table public.test_questions
to authenticated;


drop policy if exists
"test mapping readable"
on public.test_questions;

drop policy if exists
"editors manage test mapping"
on public.test_questions;


create policy
"test mapping readable"
on public.test_questions
for select
to anon, authenticated
using (true);


create policy
"editors manage test mapping"
on public.test_questions
for all
to authenticated
using (
  public.is_editor_or_admin()
)
with check (
  public.is_editor_or_admin()
);


create index if not exists
test_questions_test_position_idx
on public.test_questions (
  test_id,
  position
);


create index if not exists
test_questions_question_idx
on public.test_questions (
  question_id
);


-- =========================================================
-- 6. EXPAND TEST ATTEMPT RESULTS
-- =========================================================

alter table public.test_attempts
add column if not exists total_questions integer;

alter table public.test_attempts
add column if not exists attempted_questions integer;

alter table public.test_attempts
add column if not exists correct_answers integer;

alter table public.test_attempts
add column if not exists incorrect_answers integer;

alter table public.test_attempts
add column if not exists unanswered_questions integer;

alter table public.test_attempts
add column if not exists marks_obtained numeric;

alter table public.test_attempts
add column if not exists max_marks numeric;

alter table public.test_attempts
add column if not exists negative_marks numeric;

alter table public.test_attempts
add column if not exists duration_seconds integer;

alter table public.test_attempts
add column if not exists time_limit_seconds integer;


-- Backfill older attempts

update public.test_attempts
set total_questions = 0
where total_questions is null;


update public.test_attempts
set attempted_questions = 0
where attempted_questions is null;


update public.test_attempts
set correct_answers = 0
where correct_answers is null;


update public.test_attempts
set incorrect_answers = 0
where incorrect_answers is null;


update public.test_attempts
set unanswered_questions = 0
where unanswered_questions is null;


update public.test_attempts
set negative_marks = 0
where negative_marks is null;


alter table public.test_attempts
alter column total_questions
set default 0;

alter table public.test_attempts
alter column total_questions
set not null;


alter table public.test_attempts
alter column attempted_questions
set default 0;

alter table public.test_attempts
alter column attempted_questions
set not null;


alter table public.test_attempts
alter column correct_answers
set default 0;

alter table public.test_attempts
alter column correct_answers
set not null;


alter table public.test_attempts
alter column incorrect_answers
set default 0;

alter table public.test_attempts
alter column incorrect_answers
set not null;


alter table public.test_attempts
alter column unanswered_questions
set default 0;

alter table public.test_attempts
alter column unanswered_questions
set not null;


alter table public.test_attempts
alter column negative_marks
set default 0;

alter table public.test_attempts
alter column negative_marks
set not null;


create index if not exists
test_attempts_user_completed_idx
on public.test_attempts (
  user_id,
  completed_at desc
);


create index if not exists
test_attempts_user_test_idx
on public.test_attempts (
  user_id,
  test_id
);


-- =========================================================
-- 7. TEST ATTEMPT RLS
-- =========================================================

alter table public.test_attempts
enable row level security;


grant select, insert, update, delete
on table public.test_attempts
to authenticated;


drop policy if exists
"users own attempts"
on public.test_attempts;

drop policy if exists
"users read own test attempts"
on public.test_attempts;

drop policy if exists
"users create own test attempts"
on public.test_attempts;

drop policy if exists
"users update own test attempts"
on public.test_attempts;

drop policy if exists
"users delete own test attempts"
on public.test_attempts;


create policy
"users read own test attempts"
on public.test_attempts
for select
to authenticated
using (
  auth.uid() = user_id
);


create policy
"users create own test attempts"
on public.test_attempts
for insert
to authenticated
with check (
  auth.uid() = user_id
);


create policy
"users update own test attempts"
on public.test_attempts
for update
to authenticated
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);


create policy
"users delete own test attempts"
on public.test_attempts
for delete
to authenticated
using (
  auth.uid() = user_id
);


-- =========================================================
-- 8. UPDATED_AT TRIGGER
-- =========================================================

create or replace function
public.set_prelims_content_updated_at()
returns trigger
language plpgsql
as $$
begin

  new.updated_at := now();

  return new;

end;
$$;


drop trigger if exists
questions_updated_at_trigger
on public.questions;


create trigger
questions_updated_at_trigger
before update
on public.questions
for each row
execute function
public.set_prelims_content_updated_at();


drop trigger if exists
tests_updated_at_trigger
on public.tests;


create trigger
tests_updated_at_trigger
before update
on public.tests
for each row
execute function
public.set_prelims_content_updated_at();


-- =========================================================
-- END OF MIGRATION
-- =========================================================

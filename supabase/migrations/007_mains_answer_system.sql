-- =========================================================
-- UPSC STUDY HUB
-- 007 - Mains Answer Writing + Evaluation System
-- =========================================================

create extension if not exists pgcrypto;


-- =========================================================
-- 1. MAINS QUESTION BANK
-- =========================================================

create table if not exists public.mains_questions (

  id uuid primary key
    default gen_random_uuid(),

  question text not null,

  question_type text not null
    default 'practice'
    check (
      question_type in (
        'practice',
        'pyq'
      )
    ),

  section_type text not null
    default 'gs'
    check (
      section_type in (
        'gs',
        'optional'
      )
    ),

  gs_paper text,

  optional_subject text,
  optional_paper text,

  subject text not null,
  topic text,

  syllabus_link text,

  directive text,

  marks numeric,
  word_limit integer,

  pyq_year integer,

  answer_framework text,
  key_points text,

  introduction_hint text,
  conclusion_hint text,

  source text,
  source_url text,

  tags text[] not null
    default '{}',

  difficulty text not null
    default 'medium'
    check (
      difficulty in (
        'easy',
        'medium',
        'hard'
      )
    ),

  status text not null
    default 'draft'
    check (
      status in (
        'draft',
        'published',
        'archived'
      )
    ),

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz
    not null default now(),

  updated_at timestamptz
    not null default now()
);


create index if not exists
mains_questions_status_created_idx
on public.mains_questions (
  status,
  created_at desc
);


create index if not exists
mains_questions_section_status_idx
on public.mains_questions (
  section_type,
  status
);


create index if not exists
mains_questions_subject_idx
on public.mains_questions (
  subject
);


create index if not exists
mains_questions_pyq_idx
on public.mains_questions (
  question_type,
  pyq_year
);


-- =========================================================
-- 2. STUDENT MAINS ATTEMPTS
-- =========================================================

create table if not exists public.mains_attempts (

  id uuid primary key
    default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  question_id uuid not null
    references public.mains_questions(id),

  answer_text text not null
    default '',

  word_count integer not null
    default 0,

  elapsed_seconds integer not null
    default 0,

  submission_mode text not null
    default 'text'
    check (
      submission_mode in (
        'text',
        'pdf',
        'both'
      )
    ),

  pdf_path text,
  pdf_file_name text,

  status text not null
    default 'draft'
    check (
      status in (
        'draft',
        'submitted'
      )
    ),

  evaluation_requested boolean
    not null default false,

  submitted_at timestamptz,

  created_at timestamptz
    not null default now(),

  updated_at timestamptz
    not null default now(),

  constraint
  mains_attempts_word_count_check
  check (
    word_count >= 0
  ),

  constraint
  mains_attempts_elapsed_check
  check (
    elapsed_seconds >= 0
  )
);


create index if not exists
mains_attempts_user_status_idx
on public.mains_attempts (
  user_id,
  status,
  updated_at desc
);


create index if not exists
mains_attempts_question_idx
on public.mains_attempts (
  question_id
);


create index if not exists
mains_attempts_evaluation_queue_idx
on public.mains_attempts (
  status,
  evaluation_requested,
  submitted_at desc
);


create unique index if not exists
mains_attempts_one_draft_idx
on public.mains_attempts (
  user_id,
  question_id
)
where status = 'draft';


-- =========================================================
-- 3. MAINS EVALUATIONS
-- =========================================================

create table if not exists public.mains_evaluations (

  id uuid primary key
    default gen_random_uuid(),

  attempt_id uuid not null
    references public.mains_attempts(id)
    on delete cascade,

  student_id uuid not null
    references auth.users(id)
    on delete cascade,

  evaluator_id uuid
    references auth.users(id)
    on delete set null,

  status text not null
    default 'pending'
    check (
      status in (
        'pending',
        'in_review',
        'completed'
      )
    ),

  score numeric,
  max_marks numeric,

  overall_feedback text,

  strengths text,
  improvements text,

  structure_feedback text,
  content_feedback text,
  presentation_feedback text,

  evaluated_at timestamptz,

  created_at timestamptz
    not null default now(),

  updated_at timestamptz
    not null default now(),

  constraint
  mains_evaluations_score_check
  check (
    score is null
    or score >= 0
  ),

  constraint
  mains_evaluations_max_marks_check
  check (
    max_marks is null
    or max_marks >= 0
  )
);


create unique index if not exists
mains_evaluations_attempt_unique_idx
on public.mains_evaluations (
  attempt_id
);


create index if not exists
mains_evaluations_student_status_idx
on public.mains_evaluations (
  student_id,
  status
);


create index if not exists
mains_evaluations_evaluator_idx
on public.mains_evaluations (
  evaluator_id,
  status
);


-- =========================================================
-- 4. ROW LEVEL SECURITY
-- =========================================================

alter table public.mains_questions
enable row level security;

alter table public.mains_attempts
enable row level security;

alter table public.mains_evaluations
enable row level security;


-- =========================================================
-- 5. TABLE PERMISSIONS
-- =========================================================

grant select
on table public.mains_questions
to anon, authenticated;


grant insert, update, delete
on table public.mains_questions
to authenticated;


grant select, insert, update, delete
on table public.mains_attempts
to authenticated;


grant select, insert, update, delete
on table public.mains_evaluations
to authenticated;


-- =========================================================
-- 6. MAINS QUESTION POLICIES
-- =========================================================

drop policy if exists
"published mains questions readable"
on public.mains_questions;

drop policy if exists
"editors manage mains questions"
on public.mains_questions;


create policy
"published mains questions readable"
on public.mains_questions
for select
to anon, authenticated
using (
  status = 'published'
  or public.is_editor_or_admin()
);


create policy
"editors manage mains questions"
on public.mains_questions
for all
to authenticated
using (
  public.is_editor_or_admin()
)
with check (
  public.is_editor_or_admin()
);


-- =========================================================
-- 7. STUDENT ATTEMPT POLICIES
-- =========================================================

drop policy if exists
"students read own mains attempts"
on public.mains_attempts;

drop policy if exists
"students create own mains attempts"
on public.mains_attempts;

drop policy if exists
"students update own mains attempts"
on public.mains_attempts;

drop policy if exists
"students delete own mains attempts"
on public.mains_attempts;

drop policy if exists
"editors read mains attempts"
on public.mains_attempts;


create policy
"students read own mains attempts"
on public.mains_attempts
for select
to authenticated
using (
  auth.uid() = user_id
);


create policy
"students create own mains attempts"
on public.mains_attempts
for insert
to authenticated
with check (
  auth.uid() = user_id
);


create policy
"students update own mains attempts"
on public.mains_attempts
for update
to authenticated
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);


create policy
"students delete own mains attempts"
on public.mains_attempts
for delete
to authenticated
using (
  auth.uid() = user_id
);


create policy
"editors read mains attempts"
on public.mains_attempts
for select
to authenticated
using (
  public.is_editor_or_admin()
);


-- =========================================================
-- 8. EVALUATION POLICIES
-- =========================================================

drop policy if exists
"students read own mains evaluations"
on public.mains_evaluations;

drop policy if exists
"editors manage mains evaluations"
on public.mains_evaluations;


create policy
"students read own mains evaluations"
on public.mains_evaluations
for select
to authenticated
using (
  auth.uid() = student_id
);


create policy
"editors manage mains evaluations"
on public.mains_evaluations
for all
to authenticated
using (
  public.is_editor_or_admin()
)
with check (
  public.is_editor_or_admin()
);


-- =========================================================
-- 9. UPDATED_AT HELPER
-- =========================================================

create or replace function
public.set_mains_updated_at()
returns trigger
language plpgsql
as $$
begin

  new.updated_at := now();

  return new;

end;
$$;


drop trigger if exists
mains_questions_updated_at_trigger
on public.mains_questions;


create trigger
mains_questions_updated_at_trigger
before update
on public.mains_questions
for each row
execute function
public.set_mains_updated_at();


drop trigger if exists
mains_attempts_updated_at_trigger
on public.mains_attempts;


create trigger
mains_attempts_updated_at_trigger
before update
on public.mains_attempts
for each row
execute function
public.set_mains_updated_at();


drop trigger if exists
mains_evaluations_updated_at_trigger
on public.mains_evaluations;


create trigger
mains_evaluations_updated_at_trigger
before update
on public.mains_evaluations
for each row
execute function
public.set_mains_updated_at();


-- =========================================================
-- 10. PRIVATE PDF STORAGE BUCKET
-- =========================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'mains-answer-pdfs',
  'mains-answer-pdfs',
  false,
  10485760,
  array[
    'application/pdf'
  ]::text[]
)
on conflict (id)
do update set

  public =
    excluded.public,

  file_size_limit =
    excluded.file_size_limit,

  allowed_mime_types =
    excluded.allowed_mime_types;


-- =========================================================
-- 11. PDF STORAGE POLICIES
-- =========================================================

drop policy if exists
"students read own mains pdfs"
on storage.objects;

drop policy if exists
"students upload own mains pdfs"
on storage.objects;

drop policy if exists
"students update own mains pdfs"
on storage.objects;

drop policy if exists
"students delete own mains pdfs"
on storage.objects;

drop policy if exists
"editors read mains pdfs"
on storage.objects;


create policy
"students read own mains pdfs"
on storage.objects
for select
to authenticated
using (
  bucket_id =
    'mains-answer-pdfs'

  and
  (
    storage.foldername(name)
  )[1] =
    auth.uid()::text
);


create policy
"students upload own mains pdfs"
on storage.objects
for insert
to authenticated
with check (
  bucket_id =
    'mains-answer-pdfs'

  and
  (
    storage.foldername(name)
  )[1] =
    auth.uid()::text
);


create policy
"students update own mains pdfs"
on storage.objects
for update
to authenticated
using (
  bucket_id =
    'mains-answer-pdfs'

  and
  (
    storage.foldername(name)
  )[1] =
    auth.uid()::text
)
with check (
  bucket_id =
    'mains-answer-pdfs'

  and
  (
    storage.foldername(name)
  )[1] =
    auth.uid()::text
);


create policy
"students delete own mains pdfs"
on storage.objects
for delete
to authenticated
using (
  bucket_id =
    'mains-answer-pdfs'

  and
  (
    storage.foldername(name)
  )[1] =
    auth.uid()::text
);


create policy
"editors read mains pdfs"
on storage.objects
for select
to authenticated
using (
  bucket_id =
    'mains-answer-pdfs'

  and
  public.is_editor_or_admin()
);


-- =========================================================
-- END OF MIGRATION
-- =========================================================

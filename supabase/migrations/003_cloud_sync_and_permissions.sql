-- =========================================================
-- UPSC STUDY HUB
-- 003 - Cloud Sync and Permission Fixes
-- =========================================================

create extension if not exists pgcrypto;

grant usage on schema public
to anon, authenticated;


-- =========================================================
-- 1. STUDENT NOTES
-- =========================================================

create table if not exists public.student_notes (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  title text not null,
  content text not null default '',

  subject text,
  topic text,

  exam_stage text not null default 'general',
  note_type text not null default 'general',
  language text not null default 'English',

  tags text[] not null default '{}',

  is_pinned boolean not null default false,
  is_archived boolean not null default false,

  source_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


alter table public.student_notes
enable row level security;


grant select, insert, update, delete
on table public.student_notes
to authenticated;


drop policy if exists
"users own student notes"
on public.student_notes;

drop policy if exists
"users read own student notes"
on public.student_notes;

drop policy if exists
"users create own student notes"
on public.student_notes;

drop policy if exists
"users update own student notes"
on public.student_notes;

drop policy if exists
"users delete own student notes"
on public.student_notes;


create policy
"users read own student notes"
on public.student_notes
for select
to authenticated
using (
  auth.uid() = user_id
);


create policy
"users create own student notes"
on public.student_notes
for insert
to authenticated
with check (
  auth.uid() = user_id
);


create policy
"users update own student notes"
on public.student_notes
for update
to authenticated
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);


create policy
"users delete own student notes"
on public.student_notes
for delete
to authenticated
using (
  auth.uid() = user_id
);


create index if not exists
student_notes_user_updated_idx
on public.student_notes (
  user_id,
  updated_at desc
);


-- =========================================================
-- 2. REVISION BANK / BOOKMARKS
-- =========================================================

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  content_type text not null,
  content_id uuid not null,

  created_at timestamptz not null default now()
);


alter table public.bookmarks
enable row level security;


grant select, insert, update, delete
on table public.bookmarks
to authenticated;


drop policy if exists
"users own bookmarks"
on public.bookmarks;

drop policy if exists
"users read own bookmarks"
on public.bookmarks;

drop policy if exists
"users create own bookmarks"
on public.bookmarks;

drop policy if exists
"users update own bookmarks"
on public.bookmarks;

drop policy if exists
"users delete own bookmarks"
on public.bookmarks;


create policy
"users read own bookmarks"
on public.bookmarks
for select
to authenticated
using (
  auth.uid() = user_id
);


create policy
"users create own bookmarks"
on public.bookmarks
for insert
to authenticated
with check (
  auth.uid() = user_id
);


create policy
"users update own bookmarks"
on public.bookmarks
for update
to authenticated
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);


create policy
"users delete own bookmarks"
on public.bookmarks
for delete
to authenticated
using (
  auth.uid() = user_id
);


create index if not exists
bookmarks_user_content_idx
on public.bookmarks (
  user_id,
  content_type,
  content_id
);


-- =========================================================
-- 3. DAILY STUDY TASK CLOUD SYNC
-- =========================================================

create table if not exists public.daily_task_progress (

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  task_date date not null,

  task_id text not null,

  done boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (
    user_id,
    task_date,
    task_id
  )
);


alter table public.daily_task_progress
enable row level security;


grant select, insert, update, delete
on table public.daily_task_progress
to authenticated;


drop policy if exists
"users read own daily tasks"
on public.daily_task_progress;

drop policy if exists
"users create own daily tasks"
on public.daily_task_progress;

drop policy if exists
"users update own daily tasks"
on public.daily_task_progress;

drop policy if exists
"users delete own daily tasks"
on public.daily_task_progress;


create policy
"users read own daily tasks"
on public.daily_task_progress
for select
to authenticated
using (
  auth.uid() = user_id
);


create policy
"users create own daily tasks"
on public.daily_task_progress
for insert
to authenticated
with check (
  auth.uid() = user_id
);


create policy
"users update own daily tasks"
on public.daily_task_progress
for update
to authenticated
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);


create policy
"users delete own daily tasks"
on public.daily_task_progress
for delete
to authenticated
using (
  auth.uid() = user_id
);


create index if not exists
daily_task_progress_user_date_idx
on public.daily_task_progress (
  user_id,
  task_date
);


-- =========================================================
-- 4. SYLLABUS READ PERMISSIONS
-- =========================================================

grant select
on table public.syllabus_topics
to anon, authenticated;


alter table public.syllabus_topics
enable row level security;


drop policy if exists
"syllabus readable by everyone"
on public.syllabus_topics;


create policy
"syllabus readable by everyone"
on public.syllabus_topics
for select
to anon, authenticated
using (true);


-- =========================================================
-- 5. PERSONAL SYLLABUS PROGRESS
-- =========================================================

grant select, insert, update, delete
on table public.user_progress
to authenticated;


alter table public.user_progress
enable row level security;


drop policy if exists
"users own progress"
on public.user_progress;


create policy
"users own progress"
on public.user_progress
for all
to authenticated
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);


-- =========================================================
-- END OF MIGRATION
-- =========================================================

-- =========================================================
-- UPSC STUDY HUB
-- 013 - PERSONAL SYLLABUS TOPIC WORKSPACE
--
-- Adds:
--   * Topic bookmark
--   * Personal topic notes
--
-- One private workspace row per:
--   user + exam stage + subject + topic + paper
-- =========================================================


create extension if not exists pgcrypto;


-- =========================================================
-- 1. TABLE
-- =========================================================

create table if not exists
public.syllabus_topic_workspace
(

  id uuid primary key
    default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  exam_stage text not null
    check (
      exam_stage in (
        'prelims',
        'mains'
      )
    ),

  subject text not null,

  topic text not null,

  paper text not null
    default '',

  bookmarked boolean not null
    default false,

  notes text not null
    default '',

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  unique
  (
    user_id,
    exam_stage,
    subject,
    topic,
    paper
  )

);


-- =========================================================
-- 2. INDEXES
-- =========================================================

create index if not exists
syllabus_topic_workspace_user_idx

on public.syllabus_topic_workspace
(
  user_id,
  exam_stage
);


create index if not exists
syllabus_topic_workspace_bookmark_idx

on public.syllabus_topic_workspace
(
  user_id,
  bookmarked
);


create index if not exists
syllabus_topic_workspace_subject_idx

on public.syllabus_topic_workspace
(
  user_id,
  exam_stage,
  subject
);


-- =========================================================
-- 3. UPDATED AT FUNCTION
-- =========================================================

create or replace function
public.set_syllabus_topic_workspace_updated_at()

returns trigger

language plpgsql

security invoker

set search_path = public

as $$

begin

  new.updated_at =
    now();

  return new;

end;

$$;


-- =========================================================
-- 4. UPDATED AT TRIGGER
-- =========================================================

drop trigger if exists
syllabus_topic_workspace_updated_at_trigger

on public.syllabus_topic_workspace;


create trigger
syllabus_topic_workspace_updated_at_trigger

before update

on public.syllabus_topic_workspace

for each row

execute function
public.set_syllabus_topic_workspace_updated_at();


-- =========================================================
-- 5. ROW LEVEL SECURITY
-- =========================================================

alter table
public.syllabus_topic_workspace

enable row level security;


revoke all
on table
public.syllabus_topic_workspace
from anon;


grant
select,
insert,
update,
delete

on table
public.syllabus_topic_workspace

to authenticated;


-- =========================================================
-- 6. RLS POLICIES
-- =========================================================

drop policy if exists
"users read own syllabus workspace"

on public.syllabus_topic_workspace;


drop policy if exists
"users insert own syllabus workspace"

on public.syllabus_topic_workspace;


drop policy if exists
"users update own syllabus workspace"

on public.syllabus_topic_workspace;


drop policy if exists
"users delete own syllabus workspace"

on public.syllabus_topic_workspace;


-- SELECT

create policy
"users read own syllabus workspace"

on public.syllabus_topic_workspace

for select

to authenticated

using
(
  user_id =
  auth.uid()
);


-- INSERT

create policy
"users insert own syllabus workspace"

on public.syllabus_topic_workspace

for insert

to authenticated

with check
(
  user_id =
  auth.uid()
);


-- UPDATE

create policy
"users update own syllabus workspace"

on public.syllabus_topic_workspace

for update

to authenticated

using
(
  user_id =
  auth.uid()
)

with check
(
  user_id =
  auth.uid()
);


-- DELETE

create policy
"users delete own syllabus workspace"

on public.syllabus_topic_workspace

for delete

to authenticated

using
(
  user_id =
  auth.uid()
);


-- =========================================================
-- 7. COMMENT
-- =========================================================

comment on table
public.syllabus_topic_workspace
is
'Private user bookmark and notes workspace for each UPSC syllabus topic.';


-- =========================================================
-- END
-- =========================================================

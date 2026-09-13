-- =========================================================
-- UPSC STUDY HUB
-- 004 - Book Progress + Revision System
-- =========================================================

create extension if not exists pgcrypto;


-- =========================================================
-- 1. STUDY RESOURCES
-- =========================================================

create table if not exists public.study_resources (

  id uuid primary key default gen_random_uuid(),

  title text not null,
  description text,

  resource_type text not null default 'standard_book'
    check (
      resource_type in (
        'standard_book',
        'official_source',
        'monthly_current_affairs',
        'notes',
        'report',
        'pyq_resource',
        'syllabus_resource'
      )
    ),

  exam_stage text not null default 'both'
    check (
      exam_stage in (
        'prelims',
        'mains',
        'both'
      )
    ),

  paper text,
  subject text not null default 'General',

  author text,
  publisher text,
  source_name text,

  external_url text,
  file_path text,

  language text not null default 'English',

  edition_year integer,
  month_year date,

  is_free boolean not null default true,

  status text not null default 'draft'
    check (
      status in (
        'draft',
        'published',
        'archived'
      )
    ),

  sort_order integer not null default 0,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


alter table public.study_resources
enable row level security;


grant select
on table public.study_resources
to anon, authenticated;


grant insert, update, delete
on table public.study_resources
to authenticated;


drop policy if exists
"published study resources readable"
on public.study_resources;

drop policy if exists
"editors manage study resources"
on public.study_resources;


create policy
"published study resources readable"
on public.study_resources
for select
to anon, authenticated
using (
  status = 'published'
  or public.is_editor_or_admin()
);


create policy
"editors manage study resources"
on public.study_resources
for all
to authenticated
using (
  public.is_editor_or_admin()
)
with check (
  public.is_editor_or_admin()
);


create index if not exists
study_resources_type_status_idx
on public.study_resources (
  resource_type,
  status
);


create index if not exists
study_resources_subject_idx
on public.study_resources (
  subject
);


-- =========================================================
-- 2. BOOK TOPICS / CHAPTER STRUCTURE
-- =========================================================

create table if not exists public.book_topics (

  id uuid primary key default gen_random_uuid(),

  book_id uuid not null
    references public.study_resources(id)
    on delete cascade,

  subject text not null,

  topic_name text not null,

  parent_id uuid
    references public.book_topics(id)
    on delete cascade,

  sort_order integer not null default 0,

  is_active boolean not null default true,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


alter table public.book_topics
enable row level security;


grant select
on table public.book_topics
to anon, authenticated;


grant insert, update, delete
on table public.book_topics
to authenticated;


drop policy if exists
"book topics readable"
on public.book_topics;

drop policy if exists
"editors manage book topics"
on public.book_topics;


create policy
"book topics readable"
on public.book_topics
for select
to anon, authenticated
using (true);


create policy
"editors manage book topics"
on public.book_topics
for all
to authenticated
using (
  public.is_editor_or_admin()
)
with check (
  public.is_editor_or_admin()
);


create index if not exists
book_topics_book_idx
on public.book_topics (
  book_id,
  sort_order
);


create index if not exists
book_topics_parent_idx
on public.book_topics (
  parent_id
);


create unique index if not exists
book_topics_unique_root_name_idx
on public.book_topics (
  book_id,
  lower(topic_name)
)
where parent_id is null;


create unique index if not exists
book_topics_unique_child_name_idx
on public.book_topics (
  book_id,
  parent_id,
  lower(topic_name)
)
where parent_id is not null;


-- =========================================================
-- 3. PERSONAL REVISION SETTINGS
-- =========================================================

create table if not exists public.book_revision_preferences (

  user_id uuid primary key
    references auth.users(id)
    on delete cascade,

  revision_1_days smallint not null default 1
    check (
      revision_1_days between 1 and 365
    ),

  revision_2_days smallint not null default 7
    check (
      revision_2_days between 1 and 365
    ),

  final_revision_days smallint not null default 21
    check (
      final_revision_days between 1 and 365
    ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


alter table public.book_revision_preferences
enable row level security;


grant select, insert, update, delete
on table public.book_revision_preferences
to authenticated;


drop policy if exists
"users read own revision preferences"
on public.book_revision_preferences;

drop policy if exists
"users create own revision preferences"
on public.book_revision_preferences;

drop policy if exists
"users update own revision preferences"
on public.book_revision_preferences;

drop policy if exists
"users delete own revision preferences"
on public.book_revision_preferences;


create policy
"users read own revision preferences"
on public.book_revision_preferences
for select
to authenticated
using (
  auth.uid() = user_id
);


create policy
"users create own revision preferences"
on public.book_revision_preferences
for insert
to authenticated
with check (
  auth.uid() = user_id
);


create policy
"users update own revision preferences"
on public.book_revision_preferences
for update
to authenticated
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);


create policy
"users delete own revision preferences"
on public.book_revision_preferences
for delete
to authenticated
using (
  auth.uid() = user_id
);


-- =========================================================
-- 4. BOOK READING + REVISION PROGRESS
-- =========================================================

create table if not exists public.book_topic_progress (

  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  book_topic_id uuid not null
    references public.book_topics(id)
    on delete cascade,

  completed boolean not null default false,

  completed_at timestamptz,

  revision_count smallint not null default 0
    check (
      revision_count between 0 and 3
    ),

  revision_1_at timestamptz,
  revision_2_at timestamptz,
  final_revision_at timestamptz,

  next_revision_due_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (
    user_id,
    book_topic_id
  )
);


alter table public.book_topic_progress
enable row level security;


grant select, insert, update, delete
on table public.book_topic_progress
to authenticated;


drop policy if exists
"users read own book progress"
on public.book_topic_progress;

drop policy if exists
"users create own book progress"
on public.book_topic_progress;

drop policy if exists
"users update own book progress"
on public.book_topic_progress;

drop policy if exists
"users delete own book progress"
on public.book_topic_progress;


create policy
"users read own book progress"
on public.book_topic_progress
for select
to authenticated
using (
  auth.uid() = user_id
);


create policy
"users create own book progress"
on public.book_topic_progress
for insert
to authenticated
with check (
  auth.uid() = user_id
);


create policy
"users update own book progress"
on public.book_topic_progress
for update
to authenticated
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);


create policy
"users delete own book progress"
on public.book_topic_progress
for delete
to authenticated
using (
  auth.uid() = user_id
);


create index if not exists
book_topic_progress_user_idx
on public.book_topic_progress (
  user_id
);


create index if not exists
book_topic_progress_due_idx
on public.book_topic_progress (
  user_id,
  next_revision_due_at
);


-- =========================================================
-- 5. UPDATED_AT HELPERS
-- =========================================================

create or replace function
public.set_book_system_updated_at()
returns trigger
language plpgsql
as $$
begin

  new.updated_at := now();

  return new;

end;
$$;


drop trigger if exists
study_resources_updated_at_trigger
on public.study_resources;


create trigger
study_resources_updated_at_trigger
before update
on public.study_resources
for each row
execute function
public.set_book_system_updated_at();


drop trigger if exists
book_topics_updated_at_trigger
on public.book_topics;


create trigger
book_topics_updated_at_trigger
before update
on public.book_topics
for each row
execute function
public.set_book_system_updated_at();


drop trigger if exists
book_revision_preferences_updated_at_trigger
on public.book_revision_preferences;


create trigger
book_revision_preferences_updated_at_trigger
before update
on public.book_revision_preferences
for each row
execute function
public.set_book_system_updated_at();


-- =========================================================
-- 6. NORMALISE + SCHEDULE REVISION PROGRESS
-- =========================================================

create or replace function
public.normalize_book_topic_revision_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$

declare

  first_days integer := 1;
  second_days integer := 7;
  final_days integer := 21;

begin

  new.updated_at := now();


  -- -----------------------------------------
  -- NOT READ
  -- -----------------------------------------

  if new.completed = false then

    new.completed_at := null;

    new.revision_count := 0;

    new.revision_1_at := null;
    new.revision_2_at := null;
    new.final_revision_at := null;

    new.next_revision_due_at := null;

    return new;

  end if;


  -- -----------------------------------------
  -- READ DATE
  -- -----------------------------------------

  if new.completed_at is null then

    new.completed_at := now();

  end if;


  -- -----------------------------------------
  -- SAFE REVISION COUNT
  -- -----------------------------------------

  new.revision_count :=
    greatest(
      0,
      least(
        3,
        coalesce(
          new.revision_count,
          0
        )
      )
    );


  -- -----------------------------------------
  -- LOAD PERSONAL REVISION SETTINGS
  -- -----------------------------------------

  select

    revision_1_days,
    revision_2_days,
    final_revision_days

  into

    first_days,
    second_days,
    final_days

  from public.book_revision_preferences

  where user_id = new.user_id;


  first_days :=
    coalesce(
      first_days,
      1
    );

  second_days :=
    coalesce(
      second_days,
      7
    );

  final_days :=
    coalesce(
      final_days,
      21
    );


  -- -----------------------------------------
  -- READ, NO REVISION YET
  -- -----------------------------------------

  if new.revision_count = 0 then

    new.revision_1_at := null;
    new.revision_2_at := null;
    new.final_revision_at := null;

    new.next_revision_due_at :=
      new.completed_at
      + make_interval(
          days => first_days
        );

    return new;

  end if;


  -- -----------------------------------------
  -- REVISION 1
  -- -----------------------------------------

  if new.revision_count = 1 then

    if new.revision_1_at is null then

      new.revision_1_at := now();

    end if;

    new.revision_2_at := null;
    new.final_revision_at := null;

    new.next_revision_due_at :=
      new.revision_1_at
      + make_interval(
          days => second_days
        );

    return new;

  end if;


  -- -----------------------------------------
  -- REVISION 2
  -- -----------------------------------------

  if new.revision_count = 2 then

    if new.revision_1_at is null then

      new.revision_1_at := now();

    end if;


    if new.revision_2_at is null then

      new.revision_2_at := now();

    end if;

    new.final_revision_at := null;

    new.next_revision_due_at :=
      new.revision_2_at
      + make_interval(
          days => final_days
        );

    return new;

  end if;


  -- -----------------------------------------
  -- FINAL REVISION
  -- -----------------------------------------

  if new.revision_count = 3 then

    if new.revision_1_at is null then
      new.revision_1_at := now();
    end if;

    if new.revision_2_at is null then
      new.revision_2_at := now();
    end if;

    if new.final_revision_at is null then
      new.final_revision_at := now();
    end if;

    new.next_revision_due_at := null;

    return new;

  end if;


  return new;

end;
$$;


drop trigger if exists
normalize_book_topic_revision_progress_trigger
on public.book_topic_progress;


create trigger
normalize_book_topic_revision_progress_trigger
before insert or update
on public.book_topic_progress
for each row
execute function
public.normalize_book_topic_revision_progress();


-- =========================================================
-- 7. RECALCULATE DUE DATES WHEN USER CHANGES
--    THEIR REVISION SCHEDULE
-- =========================================================

create or replace function
public.recalculate_book_revision_schedule()
returns trigger
language plpgsql
security definer
set search_path = public
as $$

begin

  update public.book_topic_progress

  set
    updated_at = now()

  where
    user_id = new.user_id
    and completed = true
    and revision_count < 3;

  return new;

end;
$$;


drop trigger if exists
recalculate_book_revision_schedule_trigger
on public.book_revision_preferences;


create trigger
recalculate_book_revision_schedule_trigger
after insert or update
on public.book_revision_preferences
for each row
execute function
public.recalculate_book_revision_schedule();


-- =========================================================
-- END OF MIGRATION
-- =========================================================

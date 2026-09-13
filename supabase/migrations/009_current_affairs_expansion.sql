-- =========================================================
-- UPSC STUDY HUB
-- 009 - Expanded Current Affairs Structure
-- =========================================================

create extension if not exists pgcrypto;


-- =========================================================
-- 1. ENSURE CURRENT AFFAIRS TABLE EXISTS
-- =========================================================

create table if not exists public.current_affairs (

  id uuid primary key
    default gen_random_uuid(),

  title text not null,

  source text not null,

  subject text not null,

  summary text not null,

  body text,

  tags text[] not null
    default '{}',

  prelims boolean not null
    default true,

  mains boolean not null
    default true,

  status text not null
    default 'draft',

  published_at timestamptz,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz
    not null default now(),

  updated_at timestamptz
    not null default now()
);


-- =========================================================
-- 2. ADD EXPANDED UPSC ANALYSIS FIELDS
-- =========================================================

alter table public.current_affairs
add column if not exists
source_url text;

alter table public.current_affairs
add column if not exists
background text;

alter table public.current_affairs
add column if not exists
key_facts text;

alter table public.current_affairs
add column if not exists
prelims_points text;

alter table public.current_affairs
add column if not exists
mains_relevance text;

alter table public.current_affairs
add column if not exists
issues text;

alter table public.current_affairs
add column if not exists
way_forward text;


-- =========================================================
-- 3. ENSURE CORE COLUMNS EXIST
-- =========================================================

alter table public.current_affairs
add column if not exists body text;

alter table public.current_affairs
add column if not exists tags text[];

alter table public.current_affairs
add column if not exists prelims boolean;

alter table public.current_affairs
add column if not exists mains boolean;

alter table public.current_affairs
add column if not exists status text;

alter table public.current_affairs
add column if not exists published_at timestamptz;

alter table public.current_affairs
add column if not exists created_at timestamptz;

alter table public.current_affairs
add column if not exists updated_at timestamptz;


-- =========================================================
-- 4. BACKFILL SAFE DEFAULTS
-- =========================================================

update public.current_affairs
set tags = '{}'
where tags is null;

update public.current_affairs
set prelims = true
where prelims is null;

update public.current_affairs
set mains = true
where mains is null;

update public.current_affairs
set status = 'draft'
where status is null;

update public.current_affairs
set created_at = now()
where created_at is null;

update public.current_affairs
set updated_at = now()
where updated_at is null;


-- =========================================================
-- 5. DEFAULTS + NOT NULL
-- =========================================================

alter table public.current_affairs
alter column tags
set default '{}';

alter table public.current_affairs
alter column tags
set not null;


alter table public.current_affairs
alter column prelims
set default true;

alter table public.current_affairs
alter column prelims
set not null;


alter table public.current_affairs
alter column mains
set default true;

alter table public.current_affairs
alter column mains
set not null;


alter table public.current_affairs
alter column status
set default 'draft';

alter table public.current_affairs
alter column status
set not null;


alter table public.current_affairs
alter column created_at
set default now();

alter table public.current_affairs
alter column created_at
set not null;


alter table public.current_affairs
alter column updated_at
set default now();

alter table public.current_affairs
alter column updated_at
set not null;


-- =========================================================
-- 6. STATUS VALIDATION
-- =========================================================

do $$
begin

  if not exists (
    select 1
    from pg_constraint
    where conname =
      'current_affairs_status_check'
  ) then

    alter table public.current_affairs
    add constraint
    current_affairs_status_check
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


-- =========================================================
-- 7. INDEXES
-- =========================================================

create index if not exists
current_affairs_status_published_idx
on public.current_affairs (
  status,
  published_at desc
);


create index if not exists
current_affairs_subject_idx
on public.current_affairs (
  subject
);


create index if not exists
current_affairs_created_idx
on public.current_affairs (
  created_at desc
);


-- =========================================================
-- 8. ROW LEVEL SECURITY
-- =========================================================

alter table public.current_affairs
enable row level security;


grant select
on table public.current_affairs
to anon, authenticated;


grant insert, update, delete
on table public.current_affairs
to authenticated;


drop policy if exists
"published current affairs are readable"
on public.current_affairs;

drop policy if exists
"editors manage current affairs"
on public.current_affairs;


create policy
"published current affairs are readable"
on public.current_affairs
for select
to anon, authenticated
using (
  status = 'published'
  or
  public.is_editor_or_admin()
);


create policy
"editors manage current affairs"
on public.current_affairs
for all
to authenticated
using (
  public.is_editor_or_admin()
)
with check (
  public.is_editor_or_admin()
);


-- =========================================================
-- 9. UPDATED_AT TRIGGER
-- =========================================================

create or replace function
public.set_current_affairs_updated_at()
returns trigger
language plpgsql
as $$
begin

  new.updated_at := now();

  return new;

end;
$$;


drop trigger if exists
current_affairs_updated_at_trigger
on public.current_affairs;


create trigger
current_affairs_updated_at_trigger
before update
on public.current_affairs
for each row
execute function
public.set_current_affairs_updated_at();


-- =========================================================
-- END OF MIGRATION
-- =========================================================

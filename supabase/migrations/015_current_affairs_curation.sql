-- =========================================================
-- UPSC STUDY HUB
-- 015 - Current Affairs Monthly + Yearly Curation
-- =========================================================


-- =========================================================
-- 1. ADD CURATION FIELDS
-- =========================================================

alter table public.current_affairs
add column if not exists
monthly_selected boolean;


alter table public.current_affairs
add column if not exists
yearly_selected boolean;


-- =========================================================
-- 2. BACKFILL EXISTING RECORDS
-- =========================================================

update public.current_affairs
set monthly_selected = false
where monthly_selected is null;


update public.current_affairs
set yearly_selected = false
where yearly_selected is null;


-- =========================================================
-- 3. DEFAULTS + NOT NULL
-- =========================================================

alter table public.current_affairs
alter column monthly_selected
set default false;


alter table public.current_affairs
alter column monthly_selected
set not null;


alter table public.current_affairs
alter column yearly_selected
set default false;


alter table public.current_affairs
alter column yearly_selected
set not null;


-- =========================================================
-- 4. YEARLY MUST COME FROM MONTHLY
-- =========================================================

do $$
begin

  if not exists (
    select
      1
    from
      pg_constraint
    where
      conname =
        'current_affairs_yearly_requires_monthly_check'
  ) then

    alter table public.current_affairs
    add constraint
    current_affairs_yearly_requires_monthly_check
    check (
      yearly_selected = false
      or
      monthly_selected = true
    );

  end if;

end;
$$;


-- =========================================================
-- 5. MONTHLY CURATION INDEX
-- =========================================================

create index if not exists
current_affairs_monthly_selected_idx
on public.current_affairs (
  monthly_selected,
  published_at desc
);


-- =========================================================
-- 6. YEARLY CURATION INDEX
-- =========================================================

create index if not exists
current_affairs_yearly_selected_idx
on public.current_affairs (
  yearly_selected,
  published_at desc
);


-- =========================================================
-- END OF MIGRATION
-- =========================================================

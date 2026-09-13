-- =========================================================
-- UPSC STUDY HUB
-- 010 - Student Note Context Links
-- =========================================================

create extension if not exists pgcrypto;


-- =========================================================
-- 1. LINK NOTES TO BOOK TOPICS
-- =========================================================

alter table public.student_notes
add column if not exists
book_topic_id uuid
references public.book_topics(id)
on delete set null;


-- =========================================================
-- 2. LINK NOTES TO CURRENT AFFAIRS
-- =========================================================

alter table public.student_notes
add column if not exists
current_affair_id uuid
references public.current_affairs(id)
on delete set null;


-- =========================================================
-- 3. INDEXES
-- =========================================================

create index if not exists
student_notes_book_topic_idx
on public.student_notes (
  user_id,
  book_topic_id
)
where book_topic_id is not null;


create index if not exists
student_notes_current_affair_idx
on public.student_notes (
  user_id,
  current_affair_id
)
where current_affair_id is not null;


-- =========================================================
-- 4. UPDATED_AT TRIGGER
-- =========================================================

create or replace function
public.set_student_notes_updated_at()
returns trigger
language plpgsql
as $$
begin

  new.updated_at := now();

  return new;

end;
$$;


drop trigger if exists
student_notes_updated_at_trigger
on public.student_notes;


create trigger
student_notes_updated_at_trigger
before update
on public.student_notes
for each row
execute function
public.set_student_notes_updated_at();


-- =========================================================
-- END OF MIGRATION
-- =========================================================

-- UPSC Study Hub starter schema
-- Run in a Supabase project after reviewing policies for your production needs.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'student' check (role in ('student','editor','admin')),
  city text,
  created_at timestamptz not null default now()
);

create table if not exists public.current_affairs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source text not null,
  subject text not null,
  summary text not null,
  body text,
  tags text[] not null default '{}',
  prelims boolean not null default true,
  mains boolean not null default true,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  published_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.syllabus_topics (
  id uuid primary key default gen_random_uuid(),
  exam_stage text not null check (exam_stage in ('prelims','mains')),
  paper text,
  subject text not null,
  topic text not null,
  parent_id uuid references public.syllabus_topics(id),
  sort_order int not null default 0
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  options jsonb not null,
  correct_index int not null,
  explanation text not null,
  subject text not null,
  difficulty text not null default 'medium' check (difficulty in ('easy','medium','hard')),
  source text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.tests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  published boolean not null default false,
  duration_minutes int not null default 30,
  created_at timestamptz not null default now()
);

create table if not exists public.test_questions (
  test_id uuid references public.tests(id) on delete cascade,
  question_id uuid references public.questions(id) on delete cascade,
  position int not null,
  primary key (test_id, question_id)
);

create table if not exists public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_id uuid not null references public.tests(id) on delete cascade,
  score numeric,
  answers jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.user_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null references public.syllabus_topics(id) on delete cascade,
  completion int not null default 0 check (completion between 0 and 100),
  revised_at timestamptz,
  primary key (user_id, topic_id)
);

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_type text not null,
  content_id uuid not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.current_affairs enable row level security;
alter table public.syllabus_topics enable row level security;
alter table public.questions enable row level security;
alter table public.tests enable row level security;
alter table public.test_questions enable row level security;
alter table public.test_attempts enable row level security;
alter table public.user_progress enable row level security;
alter table public.bookmarks enable row level security;

create or replace function public.is_editor_or_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('editor','admin')
  );
$$;

create policy "published current affairs are readable" on public.current_affairs for select using (status = 'published' or public.is_editor_or_admin());
create policy "editors manage current affairs" on public.current_affairs for all using (public.is_editor_or_admin()) with check (public.is_editor_or_admin());
create policy "syllabus readable by everyone" on public.syllabus_topics for select using (true);
create policy "questions readable by signed in users" on public.questions for select to authenticated using (true);
create policy "published tests readable" on public.tests for select using (published = true or public.is_editor_or_admin());
create policy "test mapping readable" on public.test_questions for select using (true);
create policy "users own attempts" on public.test_attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own progress" on public.user_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own bookmarks" on public.bookmarks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user profile readable by owner" on public.profiles for select using (auth.uid() = id or public.is_editor_or_admin());
create policy "user profile updatable by owner" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

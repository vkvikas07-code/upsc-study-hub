-- UPSC Study Hub: account creation + protected roles
-- Run AFTER 001_initial_schema.sql.

-- 1) Automatically create a student profile whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    display_name,
    role
  )
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Aspirant'
    ),
    'student'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;


drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();


-- 2) Backfill profiles for users who existed before this migration.
insert into public.profiles (
  id,
  display_name,
  role
)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    'Aspirant'
  ),
  'student'
from auth.users u
left join public.profiles p
  on p.id = u.id
where p.id is null;


-- 3) Students may edit only ordinary profile fields, never their role.
-- RLS alone is row-oriented; column privileges close the role-escalation gap.
revoke update on table public.profiles from authenticated;
grant update (display_name, city) on table public.profiles to authenticated;


drop policy if exists "user profile updatable by owner" on public.profiles;

create policy "user profile updatable by owner"
on public.profiles
for update
to authenticated
using (
  auth.uid() = id
)
with check (
  auth.uid() = id
);


-- 4) Separate admin check for privileged role management.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;


-- 5) Admin-only RPC for changing another user's role.
-- This avoids granting normal browser clients direct UPDATE permission on profiles.role.
create or replace function public.set_user_role(
  target_user_id uuid,
  new_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if new_role not in ('student', 'editor', 'admin') then
    raise exception 'Invalid role';
  end if;

  update public.profiles
  set role = new_role
  where id = target_user_id;

  if not found then
    raise exception 'Profile not found';
  end if;
end;
$$;


revoke all on function public.set_user_role(uuid, text) from public;
grant execute on function public.set_user_role(uuid, text) to authenticated;

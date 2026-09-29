-- =========================================================
-- UPSC STUDY HUB
-- 018 - MAINS FRAMEWORK / EXPLANATION IMAGES
-- =========================================================


-- =========================================================
-- 1. ADD IMAGE PATHS TO MAINS QUESTIONS
-- =========================================================

alter table public.mains_questions
add column if not exists
framework_image_paths text[] not null
default '{}'::text[];


-- Maximum 6 visual explanation images per question.

do $$
begin

  if not exists (
    select 1
    from pg_constraint
    where conname =
      'mains_questions_framework_image_count_check'
  ) then

    alter table public.mains_questions
    add constraint
      mains_questions_framework_image_count_check
    check (
      cardinality(
        framework_image_paths
      ) <= 6
    );

  end if;

end;
$$;


-- =========================================================
-- 2. STORAGE BUCKET
-- =========================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'mains-framework-images',
  'mains-framework-images',
  false,
  5242880,
  array[
    'image/jpeg',
    'image/png',
    'image/webp'
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
-- 3. DROP OLD POLICIES IF THEY EXIST
-- =========================================================

drop policy if exists
"read mains framework images"
on storage.objects;

drop policy if exists
"editors upload mains framework images"
on storage.objects;

drop policy if exists
"editors update mains framework images"
on storage.objects;

drop policy if exists
"editors delete mains framework images"
on storage.objects;


-- =========================================================
-- 4. READ PUBLISHED STUDY IMAGES
-- =========================================================
--
-- Mains questions themselves may be read by anon/authenticated
-- users when published. The image bucket therefore allows read
-- access, while write access stays restricted to editor/admin.
-- =========================================================

create policy
"read mains framework images"
on storage.objects
for select
to anon, authenticated
using (

  bucket_id =
    'mains-framework-images'

);


-- =========================================================
-- 5. EDITOR / ADMIN UPLOAD
-- =========================================================

create policy
"editors upload mains framework images"
on storage.objects
for insert
to authenticated
with check (

  bucket_id =
    'mains-framework-images'

  and

  public.is_editor_or_admin()

);


-- =========================================================
-- 6. EDITOR / ADMIN UPDATE
-- =========================================================

create policy
"editors update mains framework images"
on storage.objects
for update
to authenticated
using (

  bucket_id =
    'mains-framework-images'

  and

  public.is_editor_or_admin()

)
with check (

  bucket_id =
    'mains-framework-images'

  and

  public.is_editor_or_admin()

);


-- =========================================================
-- 7. EDITOR / ADMIN DELETE
-- =========================================================

create policy
"editors delete mains framework images"
on storage.objects
for delete
to authenticated
using (

  bucket_id =
    'mains-framework-images'

  and

  public.is_editor_or_admin()

);


-- =========================================================
-- END
-- =========================================================

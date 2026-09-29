-- =========================================================
-- UPSC STUDY HUB
-- 016 - PRIVATE STUDENT NOTE IMAGES
-- =========================================================


-- =========================================================
-- 1. ADD IMAGE PATHS TO STUDENT NOTES
-- =========================================================

alter table public.student_notes
add column if not exists
image_paths text[] not null
default '{}'::text[];


-- Maximum 6 images per note.

do $$
begin

  if not exists (
    select 1
    from pg_constraint
    where conname =
      'student_notes_image_count_check'
  ) then

    alter table public.student_notes
    add constraint
      student_notes_image_count_check
    check (
      cardinality(image_paths) <= 6
    );

  end if;

end;
$$;


-- =========================================================
-- 2. PRIVATE STORAGE BUCKET
-- =========================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'student-note-images',
  'student-note-images',
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
-- 3. REMOVE OLD POLICIES
-- =========================================================

drop policy if exists
"students read own note images"
on storage.objects;

drop policy if exists
"students upload own note images"
on storage.objects;

drop policy if exists
"students update own note images"
on storage.objects;

drop policy if exists
"students delete own note images"
on storage.objects;


-- =========================================================
-- 4. READ OWN IMAGES
-- =========================================================

create policy
"students read own note images"
on storage.objects
for select
to authenticated
using (

  bucket_id =
    'student-note-images'

  and

  (
    storage.foldername(name)
  )[1] =
    auth.uid()::text

);


-- =========================================================
-- 5. UPLOAD OWN IMAGES
-- =========================================================

create policy
"students upload own note images"
on storage.objects
for insert
to authenticated
with check (

  bucket_id =
    'student-note-images'

  and

  (
    storage.foldername(name)
  )[1] =
    auth.uid()::text

);


-- =========================================================
-- 6. UPDATE OWN IMAGES
-- =========================================================

create policy
"students update own note images"
on storage.objects
for update
to authenticated
using (

  bucket_id =
    'student-note-images'

  and

  (
    storage.foldername(name)
  )[1] =
    auth.uid()::text

)
with check (

  bucket_id =
    'student-note-images'

  and

  (
    storage.foldername(name)
  )[1] =
    auth.uid()::text

);


-- =========================================================
-- 7. DELETE OWN IMAGES
-- =========================================================

create policy
"students delete own note images"
on storage.objects
for delete
to authenticated
using (

  bucket_id =
    'student-note-images'

  and

  (
    storage.foldername(name)
  )[1] =
    auth.uid()::text

);


-- =========================================================
-- END
-- =========================================================

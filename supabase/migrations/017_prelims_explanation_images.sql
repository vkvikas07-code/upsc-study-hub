-- =========================================================
-- UPSC STUDY HUB
-- 017 - PRELIMS EXPLANATION IMAGES
-- =========================================================


-- =========================================================
-- 1. ADD IMAGE PATHS TO QUESTIONS
-- =========================================================

alter table public.questions
add column if not exists
explanation_image_paths text[] not null
default '{}'::text[];


-- Maximum 6 explanation images per question.

do $$
begin

  if not exists (
    select 1
    from pg_constraint
    where conname =
      'questions_explanation_image_count_check'
  ) then

    alter table public.questions
    add constraint
      questions_explanation_image_count_check
    check (
      cardinality(
        explanation_image_paths
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
  'prelims-explanation-images',
  'prelims-explanation-images',
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
"authenticated read prelims explanation images"
on storage.objects;

drop policy if exists
"editors upload prelims explanation images"
on storage.objects;

drop policy if exists
"editors update prelims explanation images"
on storage.objects;

drop policy if exists
"editors delete prelims explanation images"
on storage.objects;


-- =========================================================
-- 4. STUDENTS READ EXPLANATION IMAGES
-- =========================================================

create policy
"authenticated read prelims explanation images"
on storage.objects
for select
to authenticated
using (

  bucket_id =
    'prelims-explanation-images'

);


-- =========================================================
-- 5. EDITOR / ADMIN UPLOAD
-- =========================================================

create policy
"editors upload prelims explanation images"
on storage.objects
for insert
to authenticated
with check (

  bucket_id =
    'prelims-explanation-images'

  and

  public.is_editor_or_admin()

);


-- =========================================================
-- 6. EDITOR / ADMIN UPDATE
-- =========================================================

create policy
"editors update prelims explanation images"
on storage.objects
for update
to authenticated
using (

  bucket_id =
    'prelims-explanation-images'

  and

  public.is_editor_or_admin()

)
with check (

  bucket_id =
    'prelims-explanation-images'

  and

  public.is_editor_or_admin()

);


-- =========================================================
-- 7. EDITOR / ADMIN DELETE
-- =========================================================

create policy
"editors delete prelims explanation images"
on storage.objects
for delete
to authenticated
using (

  bucket_id =
    'prelims-explanation-images'

  and

  public.is_editor_or_admin()

);


-- =========================================================
-- END
-- =========================================================

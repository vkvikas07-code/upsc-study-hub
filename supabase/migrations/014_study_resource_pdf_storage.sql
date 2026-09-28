-- =========================================================
-- UPSC STUDY HUB
-- 014 - Study Resource PDF Storage
-- =========================================================


-- =========================================================
-- 1. PRIVATE STUDY RESOURCE PDF BUCKET
-- =========================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'study-resource-pdfs',
  'study-resource-pdfs',
  false,
  26214400,
  array[
    'application/pdf'
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
-- 2. REMOVE OLD POLICIES IF PRESENT
-- =========================================================

drop policy if exists
"published study resource pdfs readable"
on storage.objects;

drop policy if exists
"editors upload study resource pdfs"
on storage.objects;

drop policy if exists
"editors update study resource pdfs"
on storage.objects;

drop policy if exists
"editors delete study resource pdfs"
on storage.objects;

drop policy if exists
"editors read study resource pdfs"
on storage.objects;


-- =========================================================
-- 3. STUDENT READ POLICY
-- =========================================================

create policy
"published study resource pdfs readable"
on storage.objects
for select
to authenticated
using (
  bucket_id =
    'study-resource-pdfs'

  and exists (
    select
      1
    from
      public.study_resources
        as resource
    where
      resource.file_path =
        storage.objects.name

      and
      resource.status =
        'published'
  )
);


-- =========================================================
-- 4. EDITOR READ POLICY
-- =========================================================

create policy
"editors read study resource pdfs"
on storage.objects
for select
to authenticated
using (
  bucket_id =
    'study-resource-pdfs'

  and
  public.is_editor_or_admin()
);


-- =========================================================
-- 5. EDITOR UPLOAD POLICY
-- =========================================================

create policy
"editors upload study resource pdfs"
on storage.objects
for insert
to authenticated
with check (
  bucket_id =
    'study-resource-pdfs'

  and
  public.is_editor_or_admin()
);


-- =========================================================
-- 6. EDITOR UPDATE POLICY
-- =========================================================

create policy
"editors update study resource pdfs"
on storage.objects
for update
to authenticated
using (
  bucket_id =
    'study-resource-pdfs'

  and
  public.is_editor_or_admin()
)
with check (
  bucket_id =
    'study-resource-pdfs'

  and
  public.is_editor_or_admin()
);


-- =========================================================
-- 7. EDITOR DELETE POLICY
-- =========================================================

create policy
"editors delete study resource pdfs"
on storage.objects
for delete
to authenticated
using (
  bucket_id =
    'study-resource-pdfs'

  and
  public.is_editor_or_admin()
);


-- =========================================================
-- END OF MIGRATION
-- =========================================================

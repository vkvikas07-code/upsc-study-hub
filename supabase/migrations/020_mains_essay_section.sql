-- 020 - Essay as a first-class Mains section

alter table public.mains_questions
drop constraint if exists
mains_questions_section_type_check;

alter table public.mains_questions
add constraint
mains_questions_section_type_check
check (
  section_type in (
    'gs',
    'essay',
    'optional',
    'language',
    'other'
  )
);

comment on column
public.mains_questions.section_type
is
'Mains section: gs, essay, optional, language or other.';

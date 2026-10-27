alter table public.mains_questions
add column if not exists gs_relevance_papers text[]
not null
default '{}'::text[];

alter table public.mains_questions
drop constraint if exists
mains_questions_gs_relevance_papers_check;

alter table public.mains_questions
add constraint
mains_questions_gs_relevance_papers_check
check (
  gs_relevance_papers <@
  array[
    'GS-I',
    'GS-II',
    'GS-III',
    'GS-IV'
  ]::text[]
  and
  cardinality(gs_relevance_papers) <= 4
  and
  (
    section_type = 'optional'
    or cardinality(gs_relevance_papers) = 0
  )
);

create index if not exists
mains_questions_gs_relevance_idx
on public.mains_questions
using gin (gs_relevance_papers);

comment on column
public.mains_questions.gs_relevance_papers
is
'GS papers for which an Optional-subject Mains question is also useful.';

import {
  useEffect,
  useMemo,
  useState
} from 'react';

import type {
  FormEvent
} from 'react';

import {
  supabase
} from '../lib/supabase';


type PaperTab =
  | 'essay'
  | 'GS-I'
  | 'GS-II'
  | 'GS-III'
  | 'GS-IV'
  | 'optional';


type QuestionStatus =
  | 'draft'
  | 'published';


type PaperStatus =
  | 'draft'
  | 'published';


type MainsOrigin =
  | 'cse'
  | 'upsc'
  | 'state';


type PyqRow = {
  id: string;
  question: string;

  section_type:
    | 'essay'
    | 'gs'
    | 'optional';

  gs_paper: string | null;

  optional_subject:
    string | null;

  optional_paper:
    string | null;

  subject: string;

  topic:
    string | null;

  subtopic:
    string | null;

  question_number:
    string | null;

  marks:
    number | null;

  word_limit:
    number | null;

  pyq_year:
    number | null;

  essay_section:
    string | null;

  relevant_gs_papers:
    string[];

  status:
    | 'draft'
    | 'published'
    | 'archived';

  created_at: string;
};


type MainsAppearance = {
  appearance_id?: string | null;
  appearance_type?: string | null;
  question_number?: string | null;

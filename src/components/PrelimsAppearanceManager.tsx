import {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


type Origin =
  | 'cse'
  | 'upsc'
  | 'state';


type QuestionRow = {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  subject: string;
  topic: string | null;
  difficulty: string;
  paper: string | null;
  pyq_year: number | null;
  source: string | null;
  source_url: string | null;
  status: string;
};


type Appearance = {
  id: string;
  question_id: string;
  canonical_question_id: string | null;
  question_number: string | null;
  appearance_type: string | null;

  exam_paper_id: string | null;
  exam_family: string | null;
  commission: string | null;
  state: string | null;
  exam_name: string | null;
  exam_cycle: string | null;
  exam_year: number | null;
  exam_stage: string | null;
  paper: string | null;
  source: string | null;
  source_url: string | null;
};


const QUESTION_SELECT = `
  id,
  question,
  options,
  correct_index,
  explanation,
  subject,
  topic,
  difficulty,
  paper,
  pyq_year,
  source,
  source_url,
  status
`;


function safeStringArray(
  value: unknown
): string[] {

  if (
    !Array.isArray(
      value
    )
  ) {

    return [];
  }


  return value.map(
    item =>
      String(
        item
      )
  );
}


function appearanceLabel(

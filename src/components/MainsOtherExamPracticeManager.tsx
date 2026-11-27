import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { normalizeMainsQuestionText } from '../lib/mainsQuestionDuplicate';
import {
  createMainsFrameworkImageUrls,
  removeMainsFrameworkImages,
  uploadMainsFrameworkImages
} from '../lib/mainsImages';
import { StudentNoteImagePicker } from './StudentNoteImagePicker';
import type { PendingNoteImage } from './StudentNoteImagePicker';

type ExamScope = 'upsc_other' | 'state_psc';
type QuestionType = 'practice' | 'pyq';
type SectionType = 'gs' | 'essay' | 'optional' | 'language' | 'other';
type Difficulty = 'easy' | 'medium' | 'hard';
type QuestionStatus = 'draft' | 'published' | 'archived';

type StoredQuestion = {
  id: string;
  question: string;
  question_type: QuestionType;
  section_type: SectionType;
  exam_authority: string | null;
  exam_name: string | null;
  state_name: string | null;
  paper_name: string | null;
  gs_paper: string | null;
  optional_subject: string | null;
  optional_paper: string | null;
  gs_relevance_papers: string[] | null;
  subject: string;
  topic: string | null;
  syllabus_link: string | null;
  directive: string | null;
  marks: number | null;
  word_limit: number | null;
  pyq_year: number | null;
  answer_framework: string | null;
  key_points: string | null;
  introduction_hint: string | null;
  conclusion_hint: string | null;
  framework_image_paths: string[] | null;
  source: string | null;
  source_url: string | null;
  tags: string[] | null;
  difficulty: Difficulty;
  status: QuestionStatus;
  updated_at: string;
};

const PAGE_SIZE = 1000;
const MAX_FRAMEWORK_IMAGES = 6;
const GS_PAPERS = ['GS-I', 'GS-II', 'GS-III', 'GS-IV'];
const EDIT_SELECT = `id, question, question_type, section_type,
  exam_authority, exam_name, state_name, paper_name, gs_paper,
  optional_subject, optional_paper, gs_relevance_papers, subject,
  topic, syllabus_link, directive, marks, word_limit, pyq_year,
  answer_framework, key_points, introduction_hint, conclusion_hint,
  framework_image_paths, source, source_url, tags, difficulty, status,
  updated_at`;

function errorMessage(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (value && typeof value === 'object' && 'message' in value)
    return String(value.message);
  return String(value || 'Unexpected error');
}

function strings(value: string[] | null | undefined): string[] {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function belongsToScope(item: StoredQuestion, scope: ExamScope): boolean {
  const authority = (item.exam_authority || '').toUpperCase();
  const isOtherUpsc = authority === 'UPSC' &&
    !['civil services examination', 'cse'].includes(
      (item.exam_name || '').trim().toLowerCase()
    );
  return scope === 'upsc_other'
    ? isOtherUpsc
    : Boolean(authority && authority !== 'UPSC');
}

function numberOrNull(raw: string): number | null {
  return raw.trim() ? Number(raw) : null;
}

export function MainsOtherExamPracticeManager() {
  const [scope, setScope] = useState<ExamScope>('upsc_other');
  const [authority, setAuthority] = useState('');
  const [stateName, setStateName] = useState('');
  const [examName, setExamName] = useState('');
  const [section, setSection] = useState<SectionType>('gs');
  const [questionType, setQuestionType] = useState<QuestionType>('practice');
  const [optionalSubject, setOptionalSubject] = useState('');
  const [optionalPaper, setOptionalPaper] = useState('Paper-I');

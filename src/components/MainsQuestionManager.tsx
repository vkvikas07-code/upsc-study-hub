import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { normalizeMainsQuestionText } from '../lib/mainsQuestionDuplicate';
import { StudentNoteImagePicker } from './StudentNoteImagePicker';
import type { PendingNoteImage } from './StudentNoteImagePicker';
import {
  createMainsFrameworkImageUrls,
  removeMainsFrameworkImages,
  uploadMainsFrameworkImages
} from '../lib/mainsImages';

type Section = 'gs' | 'essay' | 'optional' | 'language';
type QuestionType = 'practice' | 'pyq';
type Status = 'draft' | 'published' | 'archived';
type Difficulty = 'easy' | 'medium' | 'hard';
type FilterSection = 'all' | Section;
type ValueChangeEvent = { target: { value: string } };

type Question = {
  id: string; question: string; question_type: QuestionType; section_type: Section;
  exam_authority: string | null; exam_name: string | null; state_name: string | null; paper_name: string | null;
  gs_paper: string | null; optional_subject: string | null; optional_paper: string | null;
  gs_relevance_papers: string[] | null; subject: string; topic: string | null;
  syllabus_link: string | null; directive: string | null; marks: number | null;
  word_limit: number | null; pyq_year: number | null; answer_framework: string | null;
  key_points: string | null; introduction_hint: string | null;
  conclusion_hint: string | null; framework_image_paths: string[] | null;
  source: string | null; source_url: string | null; tags: string[] | null;
  difficulty: Difficulty; status: Status; created_at: string;
};

type FormData = {
  section: Section; questionType: QuestionType; gsPaper: string;
  optionalSubject: string; optionalPaper: string; compulsoryLanguage: string;
  gsRelevant: boolean; relevantPapers: string[]; question: string; subject: string;
  topic: string; syllabus: string; directive: string; marks: string;
  wordLimit: string; pyqYear: string; framework: string; keyPoints: string;
  introduction: string; conclusion: string; source: string; sourceUrl: string;
  tags: string; difficulty: Difficulty; status: Status;
};

const GS = ['GS-I', 'GS-II', 'GS-III', 'GS-IV'];
const LANGUAGES = [
  'Assamese', 'Bengali', 'Bodo', 'Dogri', 'English', 'Gujarati', 'Hindi',
  'Kannada', 'Kashmiri', 'Konkani', 'Maithili', 'Malayalam', 'Manipuri',
  'Marathi', 'Nepali', 'Odia', 'Punjabi', 'Sanskrit', 'Santhali', 'Sindhi',
  'Tamil', 'Telugu', 'Urdu'
];
const OPTIONALS = [
  'Agriculture', 'Animal Husbandry & Veterinary Science', 'Anthropology',
  'Botany', 'Chemistry', 'Civil Engineering', 'Commerce & Accountancy',
  'Economics', 'Electrical Engineering', 'Geography', 'Geology', 'History',
  'Law', 'Management', 'Mathematics', 'Mechanical Engineering',
  'Medical Science', 'Philosophy', 'Physics',
  'Political Science & International Relations', 'Psychology',
  'Public Administration', 'Sociology', 'Statistics', 'Zoology',
  ...LANGUAGES.map(language => `${language} Literature`)
];
const SELECT = `id,question,question_type,section_type,exam_authority,exam_name,state_name,
  paper_name,gs_paper,optional_subject,optional_paper,gs_relevance_papers,
  subject,topic,syllabus_link,directive,marks,word_limit,pyq_year,
  answer_framework,key_points,introduction_hint,conclusion_hint,
  framework_image_paths,source,source_url,tags,difficulty,status,created_at`;
const PAGE_SIZE = 500;
const MAX_IMAGES = 6;

function initialForm(): FormData {
  return {
    section: 'gs', questionType: 'practice', gsPaper: 'GS-I',
    optionalSubject: 'Geography', optionalPaper: 'Paper-I',
    compulsoryLanguage: 'Hindi', gsRelevant: false, relevantPapers: [],
    question: '', subject: '', topic: '', syllabus: '', directive: 'Discuss',
    marks: '10', wordLimit: '150', pyqYear: '', framework: '', keyPoints: '',
    introduction: '', conclusion: '', source: '', sourceUrl: '', tags: '',
    difficulty: 'medium', status: 'draft'
  };
}
function list(value: string[] | null | undefined): string[] {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}
function errorText(value: unknown): string {
  return value instanceof Error ? value.message :
    value && typeof value === 'object' && 'message' in value
      ? String(value.message) : String(value || 'Unexpected error');
}
function isCse(row: Question): boolean {
  if (row.state_name) return false;
  const authority = (row.exam_authority || '').trim().toUpperCase();
  const exam = (row.exam_name || '').trim().toLowerCase();
  return !authority || (authority === 'UPSC' &&
    (!exam || exam === 'cse' || exam.includes('civil services')));
}
function sectionLabel(section: Section): string {
  return section === 'gs' ? 'General Studies' : section === 'essay' ? 'Essay' :
    section === 'optional' ? 'Optional Subject' : 'Compulsory Language';
}

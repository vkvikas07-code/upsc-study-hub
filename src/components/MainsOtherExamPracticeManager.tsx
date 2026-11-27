import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { normalizeMainsQuestionText } from '../lib/mainsQuestionDuplicate';

type ExamScope = 'upsc_other' | 'state_psc';
type SectionType = 'gs' | 'essay' | 'optional' | 'language' | 'other';
type Difficulty = 'easy' | 'medium' | 'hard';
type QuestionStatus = 'draft' | 'published' | 'archived';

type StoredQuestion = {
  id: string;
  question: string;
  question_type: 'practice' | 'pyq';
  section_type: SectionType;
  exam_authority: string | null;
  exam_name: string | null;
  state_name: string | null;
  paper_name: string | null;
  gs_paper: string | null;
  optional_subject: string | null;
  optional_paper: string | null;
  subject: string;
  topic: string | null;
  syllabus_link: string | null;
  directive: string | null;
  marks: number | null;
  word_limit: number | null;
  answer_framework: string | null;
  key_points: string | null;
  introduction_hint: string | null;
  conclusion_hint: string | null;
  source: string | null;
  source_url: string | null;
  tags: string[] | null;
  difficulty: Difficulty;
  status: QuestionStatus;
  updated_at: string;
};

const PAGE_SIZE = 1000;

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected error occurred.';
}

function positiveNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function MainsOtherExamPracticeManager() {
  const [scope, setScope] = useState<ExamScope>('upsc_other');
  const [authority, setAuthority] = useState('');
  const [stateName, setStateName] = useState('');
  const [examName, setExamName] = useState('');
  const [section, setSection] = useState<SectionType>('gs');
  const [paperName, setPaperName] = useState('');
  const [gsPaper, setGsPaper] = useState('');
  const [optionalSubject, setOptionalSubject] = useState('');
  const [optionalPaper, setOptionalPaper] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [syllabusLink, setSyllabusLink] = useState('');
  const [question, setQuestion] = useState('');
  const [directive, setDirective] = useState('Discuss');
  const [marks, setMarks] = useState('10');
  const [wordLimit, setWordLimit] = useState('150');
  const [answerFramework, setAnswerFramework] = useState('');
  const [keyPoints, setKeyPoints] = useState('');
  const [introductionHint, setIntroductionHint] = useState('');
  const [conclusionHint, setConclusionHint] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [status, setStatus] = useState<QuestionStatus>('draft');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [recent, setRecent] = useState<StoredQuestion[]>([]);
  const [search, setSearch] = useState('');

  const resolvedAuthority = scope === 'upsc_other' ? 'UPSC' : authority.trim();

  const shown = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return recent.filter(item => {
      const belongsToScope = scope === 'upsc_other'
        ? (item.exam_authority || '').toUpperCase() === 'UPSC' &&
          item.exam_name !== 'Civil Services Examination'
        : (item.exam_authority || '').toUpperCase() !== 'UPSC';
      if (!belongsToScope) return false;
      return !keyword || [item.question, item.exam_name, item.state_name,
        item.paper_name, item.subject, item.topic]
        .some(value => (value || '').toLowerCase().includes(keyword));

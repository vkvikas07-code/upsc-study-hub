import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { TopBar } from '../components/TopBar';
import { MainsPyqArchive } from '../components/MainsPyqArchive';
import type { MainsPyqArchiveQuestion } from '../components/MainsPyqArchive';
import { supabase } from '../lib/supabase';
import { dedupeMainsQuestions } from '../lib/mainsQuestionDuplicate';
import { MainsAnswerWorkspace } from '../MainsAnswerWorkspace';
import type { MainsWorkspaceQuestion } from '../MainsAnswerWorkspace';
import { MyMainsEvaluations } from '../components/MyMainsEvaluations';

type QuestionType = 'practice' | 'pyq';
type SectionFilter = 'all' | 'gs' | 'essay' | 'optional' | 'language' | 'other';
type ExamScope = 'all' | 'cse' | 'upsc_other' | 'state_psc';
type WorkspaceView = 'practice' | 'pyq' | 'evaluations';
type QuestionTypeFilter = 'all' | QuestionType;

type MainsQuestion = MainsWorkspaceQuestion & {
  question_type: QuestionType;
  pyq_year: number | null;
  gs_relevance_papers: string[];
  tags: string[];
  difficulty: string;
  created_at: string;
  exam_authority: string | null;
  exam_name: string | null;
  state_name: string | null;
  paper_name: string | null;
  original_section: Exclude<SectionFilter, 'all'>;
};

const PAGE_SIZE = 500;
const controlStyle: CSSProperties = {
  width: '100%', minHeight: 46, padding: '0 12px', borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.14)', background: '#0e1525',
  color: '#f8fafc', fontSize: '0.94rem', colorScheme: 'dark'
};
const labelStyle: CSSProperties = {
  display: 'grid', gap: 7, marginBottom: 12, color: '#cbd5e1',
  fontSize: '0.84rem', fontWeight: 700
};
const actionStyle: CSSProperties = {
  minHeight: 42, padding: '0 16px', borderRadius: 10,
  border: '1px solid rgba(45,212,191,0.55)',
  background: 'rgba(20,184,166,0.04)', color: '#5eead4', fontWeight: 700
};

function getScope(question: MainsQuestion): Exclude<ExamScope, 'all'> {
  const authority = (question.exam_authority || '').trim().toUpperCase();
  const state = (question.state_name || '').trim();
  const exam = (question.exam_name || '').trim().toLowerCase();

  if (state || (authority && authority !== 'UPSC')) return 'state_psc';
  if (!exam || exam === 'cse' || exam.includes('civil services')) return 'cse';
  return 'upsc_other';
}

function uniqueValues(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map(value => (value || '').trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b));
}

function sectionLabel(item: MainsQuestion): string {
  switch (item.original_section) {
    case 'gs': return item.gs_paper || item.paper_name || 'General Studies';
    case 'essay': return 'Essay';
    case 'optional': return [item.optional_subject || 'Optional Subject', item.optional_paper]
      .filter(Boolean).join(' • ');
    case 'language': return item.paper_name || 'Compulsory Language';
    case 'other': return item.paper_name || 'Other Paper';
    default: return item.paper_name || 'Mains Question';
  }
}

function WorkspaceTabs({
  active,
  onChange
}: {
  active: WorkspaceView;
  onChange: (value: WorkspaceView) => void;
}) {
  return (
    <section className="panel" style={{ marginBottom: 16, padding: 12 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 8
        }}
      >
        <button
          type="button"
          className={active === 'practice' ? 'filter active' : 'filter'}
          onClick={() => onChange('practice')}
        >
          Answer Practice
        </button>

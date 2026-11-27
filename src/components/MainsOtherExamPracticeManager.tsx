import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { TopBar } from '../components/TopBar';
import { MainsPyqArchive } from '../components/MainsPyqArchive';
import type { MainsPyqArchiveQuestion } from '../components/MainsPyqArchive';
import { MainsAnswerWorkspace } from '../MainsAnswerWorkspace';
import type { MainsWorkspaceQuestion } from '../MainsAnswerWorkspace';
import { MyMainsEvaluations } from '../components/MyMainsEvaluations';
import { dedupeMainsQuestions } from '../lib/mainsQuestionDuplicate';
import { supabase } from '../lib/supabase';

type Section = 'gs' | 'essay' | 'optional' | 'language' | 'other';
type Source = 'all' | 'cse' | 'other_upsc' | 'state_psc';
type Tab = 'practice' | 'pyq' | 'evaluations';
type Item = MainsWorkspaceQuestion & {
  question_type: 'practice' | 'pyq';
  original_section: Section;
  exam_authority: string | null;
  exam_name: string | null;
  state_name: string | null;
  paper_name: string | null;
  gs_relevance_papers: string[];
  tags: string[];
  difficulty: string;
  pyq_year: number | null;
  created_at: string;
};
type Choice = { value: string; label: string };
const PAGE_SIZE = 500;
const inputStyle: CSSProperties = {
  width: '100%', minHeight: 44, padding: '8px 12px', borderRadius: 10,
  border: '1px solid rgba(255,255,255,.15)', background: '#0e1525',
  color: '#f8fafc', colorScheme: 'dark'
};
const fieldStyle: CSSProperties = { display: 'grid', gap: 6, marginBottom: 12 };

function choices(values: Array<string | number | null | undefined>): Choice[] {
  return [...new Set(values.filter((v): v is string | number =>
    v !== null && v !== undefined && String(v).trim() !== ''))]
    .map(v => ({ value: String(v), label: String(v) }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
}
function sourceOf(item: Item): Exclude<Source, 'all'> {
  const authority = (item.exam_authority || '').trim().toUpperCase();
  const exam = (item.exam_name || '').trim().toLowerCase();
  if (item.state_name || (authority && authority !== 'UPSC')) return 'state_psc';
  if (!exam || exam === 'cse' || exam.includes('civil services')) return 'cse';
  return 'other_upsc';
}
function paperOf(item: Item): string {
  if (item.original_section === 'essay') return 'Essay';
  if (item.original_section === 'optional') {
    return [item.optional_subject, item.optional_paper].filter(Boolean).join(' / ') || 'Optional';
  }
  return item.paper_name || item.gs_paper || item.original_section.toUpperCase();
}
function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (value: string) => void; options: Choice[];
}) {
  return <label style={fieldStyle}>{label}
    <select style={inputStyle} value={value} onChange={e => onChange(e.target.value)}>
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </label>;
}
function allOption(label: string, values: Choice[]): Choice[] {
  return [{ value: 'all', label }, ...values];
}

export function MainsPracticePage() {
  const [tab, setTab] = useState<Tab>('practice');
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<MainsWorkspaceQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scope, setScope] = useState<Source>('all');
  const [exam, setExam] = useState('all');
  const [state, setState] = useState('all');
  const [paper, setPaper] = useState('all');
  const [section, setSection] = useState('all');
  const [kind, setKind] = useState('all');
  const [gs, setGs] = useState('all');
  const [optional, setOptional] = useState('all');
  const [optionalPaper, setOptionalPaper] = useState('all');
  const [marks, setMarks] = useState('all');
  const [year, setYear] = useState('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    if (!supabase) {
      setError('Supabase is not configured.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');

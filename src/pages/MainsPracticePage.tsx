
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

const fieldStyle: CSSProperties = {
  display: 'grid', gap: 6, marginBottom: 12
};

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
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Choice[];
}) {
  return <label style={fieldStyle}>{label}
    <select style={inputStyle} value={value} onChange={e => onChange(e.target.value)}>
      {options.map(option =>
        <option key={option.value} value={option.value}>{option.label}</option>
      )}
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

    try {
      const raw: Array<Record<string, unknown>> = [];

      for (let offset = 0; ; offset += PAGE_SIZE) {
        const { data, error: queryError } = await supabase
          .from('mains_questions')
          .select(`id,question,question_type,section_type,exam_authority,exam_name,
            state_name,paper_name,gs_paper,optional_subject,optional_paper,
            gs_relevance_papers,subject,topic,syllabus_link,directive,marks,
            word_limit,pyq_year,answer_framework,key_points,introduction_hint,
            conclusion_hint,framework_image_paths,source,source_url,tags,
            difficulty,created_at`)
          .eq('status', 'published')
          .in('section_type', ['gs', 'essay', 'optional', 'language', 'other'])
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1);

        if (queryError) throw queryError;

        const page = (data || []) as Array<Record<string, unknown>>;
        raw.push(...page);

        if (page.length < PAGE_SIZE) break;
      }

      const prepared = raw.map(row => {
        const original = String(row.section_type || 'gs') as Section;
        const special = original === 'language' || original === 'other';

        return {
          ...row,
          original_section: original,
          section_type: special ? 'optional' : original,
          optional_subject: special
            ? row.optional_subject || row.paper_name || row.subject || 'Specialised Paper'
            : row.optional_subject,
          gs_relevance_papers: Array.isArray(row.gs_relevance_papers)
            ? row.gs_relevance_papers.map(String) : [],
          framework_image_paths: Array.isArray(row.framework_image_paths)
            ? row.framework_image_paths.map(String) : [],
          tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
          exam_authority: row.exam_authority || null,
          exam_name: row.exam_name || null,
          state_name: row.state_name || null,
          paper_name: row.paper_name || null,
          difficulty: row.difficulty || 'medium'
        } as Item;
      });

      const cse = dedupeMainsQuestions(prepared.filter(q => sourceOf(q) === 'cse'));
      const other = prepared.filter(q => sourceOf(q) !== 'cse');

      setItems([...cse, ...other].sort((a, b) =>
        (b.created_at || '').localeCompare(a.created_at || '')));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const scoped = useMemo(() =>
    items.filter(q => scope === 'all' || sourceOf(q) === scope), [items, scope]);

  const examNames = useMemo(() => choices(scoped.map(q =>
    q.exam_name || (sourceOf(q) === 'cse' ? 'Civil Services Examination' : null))), [scoped]);

  const states = useMemo(() => choices(scoped.map(q => q.state_name)), [scoped]);

  const narrowed = useMemo(() => scoped.filter(q => {
    const name = q.exam_name || (sourceOf(q) === 'cse' ? 'Civil Services Examination' : '');
    return (exam === 'all' || name === exam) && (state === 'all' || q.state_name === state);
  }), [scoped, exam, state]);

  const papers = useMemo(() => choices(narrowed.map(q => q.paper_name)), [narrowed]);

  const optionalSubjects = useMemo(() =>
    choices(narrowed.filter(q => q.original_section === 'optional')
      .map(q => q.optional_subject)), [narrowed]);

  const optionalPapers = useMemo(() =>
    choices(narrowed.filter(q => q.original_section === 'optional')
      .map(q => q.optional_paper)), [narrowed]);

  const gsPapers = useMemo(() => choices(['GS-I', 'GS-II', 'GS-III', 'GS-IV',
    ...narrowed.map(q => q.gs_paper),
    ...narrowed.flatMap(q => q.gs_relevance_papers)]), [narrowed]);

  const marksChoices = useMemo(() => choices(narrowed.map(q => q.marks)), [narrowed]);
  const yearChoices = useMemo(() => choices(narrowed.map(q => q.pyq_year)), [narrowed]);

  const results = useMemo(() => narrowed.filter(q => {
    if (paper !== 'all' && q.paper_name !== paper) return false;
    if (section === 'gs') {
      if (q.original_section !== 'gs' &&
        !(q.original_section === 'optional' && q.gs_relevance_papers.length)) return false;
    } else if (section !== 'all' && q.original_section !== section) return false;

    if (kind !== 'all' && q.question_type !== kind) return false;
    if (gs !== 'all' && section !== 'essay' && section !== 'optional' &&
      q.gs_paper !== gs && !q.gs_relevance_papers.includes(gs)) return false;
    if (optional !== 'all' && q.original_section === 'optional' &&
      q.optional_subject !== optional) return false;
    if (optionalPaper !== 'all' && q.original_section === 'optional' &&
      q.optional_paper !== optionalPaper) return false;
    if (marks !== 'all' && String(q.marks) !== marks) return false;
    if (year !== 'all' && String(q.pyq_year) !== year) return false;

    const haystack = [q.question, q.subject, q.topic, q.directive,
      q.exam_authority, q.exam_name, q.state_name, q.paper_name,
      q.gs_paper, q.optional_subject, q.optional_paper,
      ...q.tags].filter(Boolean).join(' ').toLowerCase();

    return haystack.includes(search.trim().toLowerCase());
  }), [narrowed, paper, section, kind, gs, optional, optionalPaper, marks, year, search]);

  function reset() {
    setScope('all'); setExam('all'); setState('all'); setPaper('all');
    setSection('all'); setKind('all'); setGs('all'); setOptional('all');
    setOptionalPaper('all'); setMarks('all'); setYear('all'); setSearch('');
  }

  function goTop() {
    document.querySelector('.main-area')?.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function answerPyq(q: MainsPyqArchiveQuestion) {
    setSelected({
      id: q.id, question: q.question, section_type: q.section_type,
      gs_paper: q.gs_paper, optional_subject: q.optional_subject,
      optional_paper: q.optional_paper, subject: q.subject, topic: q.topic,
      syllabus_link: q.syllabus_link, directive: q.directive, marks: q.marks,
      word_limit: q.word_limit, answer_framework: q.answer_framework,
      key_points: q.key_points, introduction_hint: q.introduction_hint,
      conclusion_hint: q.conclusion_hint, framework_image_paths: [],
      source: q.source, source_url: q.source_url
    });
    goTop();
  }

  if (selected) return <MainsAnswerWorkspace question={selected}
    onBack={() => { setSelected(null); goTop(); }} />;

  return <div className="page-wrap mains-practice-page">
    <TopBar title="Mains Practice" subtitle="UPSC CSE, Other UPSC and State PSC preparation" />

    <section className="panel" style={{ marginBottom: 16, padding: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8 }}>
        {([['practice', 'Answer Practice'], ['pyq', 'Previous Year Papers'],
          ['evaluations', 'My Evaluations']] as Array<[Tab, string]>).map(([id, label]) =>
          <button key={id} type="button" className={tab === id ? 'filter active' : 'filter'}
            onClick={() => setTab(id)}>{label}</button>)}
      </div>
    </section>

    {tab === 'evaluations' ? <MyMainsEvaluations /> : tab === 'pyq' ?
      <MainsPyqArchive onStartAnswerWriting={answerPyq} /> : <>
      <section className="panel" style={{ marginBottom: 20 }}>
        <span className="eyebrow">MAINS QUESTION BANK</span>
        <h2>Find questions for your examination</h2>
        <p>Choose a question to write your answer or upload a handwritten PDF.</p>

        <label style={fieldStyle}>Search
          <input style={inputStyle} value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search exam, question, topic, subject..." />
        </label>

        <div className="form-two">
          <SelectField label="Examination Category" value={scope} onChange={value => {
            setScope(value as Source); setExam('all'); setState('all'); setPaper('all');
          }} options={[{ value: 'all', label: 'All Examinations' },
            { value: 'cse', label: 'UPSC Civil Services (CSE)' },
            { value: 'other_upsc', label: 'Other UPSC Examinations' },
            { value: 'state_psc', label: 'State PSC Examinations' }]} />

          <SelectField label="Examination Name" value={exam} onChange={value => {
            setExam(value); setPaper('all');
          }} options={allOption('All Examination Names', examNames)} />

          {(scope === 'all' || scope === 'state_psc') &&
            <SelectField label="State / UT" value={state} onChange={value => {
              setState(value); setPaper('all');
            }} options={allOption('All States / UTs', states)} />}

          <SelectField label="Paper Name" value={paper} onChange={setPaper}
            options={allOption('All Papers', papers)} />

          <SelectField label="Section" value={section} onChange={setSection}
            options={[{ value: 'all', label: 'All Sections' },
              { value: 'gs', label: 'General Studies' },
              { value: 'essay', label: 'Essay' },
              { value: 'optional', label: 'Optional Subject' },
              { value: 'language', label: 'Language / Compulsory Paper' },
              { value: 'other', label: 'Other Paper' }]} />

          <SelectField label="Question Type" value={kind} onChange={setKind}
            options={[{ value: 'all', label: 'All Questions' },
              { value: 'practice', label: 'Practice' },
              { value: 'pyq', label: 'Previous Year Question' }]} />

          <SelectField label="GS Paper" value={gs} onChange={setGs}
            options={allOption('All GS Papers', gsPapers)} />

          <SelectField label="Optional Subject" value={optional} onChange={setOptional}
            options={allOption('All Optional Subjects', optionalSubjects)} />

          <SelectField label="Optional Paper" value={optionalPaper} onChange={setOptionalPaper}
            options={allOption('Both Papers', optionalPapers)} />

          <SelectField label="Marks" value={marks} onChange={setMarks}
            options={allOption('All Marks', marksChoices)} />

          <SelectField label="PYQ Year" value={year} onChange={setYear}
            options={allOption('All Years', yearChoices)} />

          <button type="button" className="secondary-btn" onClick={reset}>Clear filters</button>
        </div>
      </section>

      {loading ? <section className="panel">Loading Mains questions...</section> :
        error ? <section className="panel">
          <h3>Unable to load questions</h3><p>{error}</p>
          <button type="button" className="primary-btn" onClick={() => void load()}>Try again</button>
        </section> :
        <section style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <h2>{results.length} {results.length === 1 ? 'question' : 'questions'}</h2>
            <button type="button" className="secondary-btn" onClick={() => void load()}>Refresh</button>
          </div>

          {results.length === 0 && <div className="panel">No published questions match the filters.</div>}

          {results.map(q => <article key={q.id} className="panel">
            <span className="eyebrow">{paperOf(q)}</span>

            <div className="tag-row" style={{ marginTop: 12 }}>
              <span className="tag">{sourceOf(q) === 'cse' ? 'UPSC CSE' :
                sourceOf(q) === 'other_upsc' ? 'Other UPSC' : 'State PSC'}</span>
              {[q.exam_name, q.state_name, q.paper_name, q.question_type === 'pyq'
                ? `PYQ ${q.pyq_year || ''}` : 'Practice', q.marks != null ? `${q.marks} marks` : '',
                q.word_limit != null ? `${q.word_limit} words` : '', q.difficulty]
                .filter(Boolean).map((text, i) => <span className="tag" key={i}>{text}</span>)}
            </div>

            <h3 style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.5 }}>
              {q.question}
            </h3>
            <p><strong>Subject:</strong> {q.subject}{q.topic ? ` / ${q.topic}` : ''}</p>

            {q.tags.length > 0 && <div className="tag-row">{q.tags.map(tag =>
              <span className="tag" key={tag}>{tag}</span>)}</div>}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
              <button type="button" className="primary-btn" onClick={() => {
                setSelected(q); goTop();
              }}>Start Answer Writing</button>

              <button type="button" className="secondary-btn"
                onClick={() => setExpanded(expanded === q.id ? null : q.id)}>
                {expanded === q.id ? 'Hide guidance' : 'View answer guidance'}
              </button>
            </div>

            {expanded === q.id && <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              {([['Syllabus', q.syllabus_link], ['Introduction', q.introduction_hint],
                ['Framework', q.answer_framework], ['Key points', q.key_points],
                ['Conclusion', q.conclusion_hint]] as Array<[string, string | null]>).filter(([, value]) =>
                  Boolean(value)).map(([heading, value]) =>
                  <div className="panel" key={heading}><strong>{heading}</strong>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{value}</p></div>)}
            </div>}
          </article>)}
        </section>}
    </>}
  </div>;
}

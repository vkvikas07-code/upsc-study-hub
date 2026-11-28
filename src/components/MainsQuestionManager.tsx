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

const DIRECTIVE_GROUPS: ReadonlyArray<{ label: string; values: readonly string[] }> = [
  { label: 'Core analytical and evaluative', values: [
    'Discuss', 'Critically Discuss', 'Examine', 'Critically Examine',
    'Analyse', 'Critically Analyse', 'Evaluate', 'Critically Evaluate',
    'Assess', 'Critically Assess', 'Comment', 'Critically Comment',
    'Review', 'Critically Review', 'Appraise', 'Critically Appraise',
    'Scrutinise', 'Investigate', 'Deliberate', 'Debate',
    'Interpret',
  ] },
  { label: 'Explanation and description', values: [
    'Explain', 'Elaborate', 'Elucidate', 'Illustrate',
    'Describe', 'Define', 'Enumerate', 'List',
    'State', 'Outline', 'Highlight', 'Bring Out',
    'Identify', 'Trace', 'Account For', 'Give Reasons',
    'Explain with Examples', 'Illustrate with Examples', 'Explain the Significance', 'Examine the Implications',
    'Write a Short Note', 'Write a Note',
  ] },
  { label: 'Comparison and argument', values: [
    'Compare', 'Contrast', 'Compare and Contrast', 'Differentiate',
    'Distinguish Between', 'Relate', 'Correlate', 'Establish the Relationship',
    'Justify', 'Substantiate', 'Demonstrate', 'Support with Examples',
    'To What Extent', 'How Far Do You Agree?', 'Do You Agree?', 'Examine the Validity',
    'Prove',
  ] },
  { label: 'Causes, impacts and solutions', values: [
    'Examine the Causes', 'Analyse the Causes', 'Examine the Consequences', 'Analyse the Impact',
    'Assess the Impact', 'Evaluate the Effectiveness', 'Discuss the Challenges', 'Identify the Issues',
    'Suggest Measures', 'Suggest Solutions', 'Suggest Reforms', 'Suggest a Way Forward',
    'Recommend', 'Propose', 'Suggest Remedies',
  ] },
  { label: 'Essay and compulsory languages', values: [
    'Write an Essay', 'Essay Writing', 'Write a Report', 'Report Writing',
    'Write a Letter', 'Letter Writing', 'Translate', 'Translation',
    'Summarise', 'Summarise the Passage', 'Précis Writing', 'Comprehension',
    'Paraphrase', 'Grammar', 'Correct the Sentences', 'Fill in the Blanks',
    'Explain in Context', 'Use in a Sentence',
  ] },
];

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

export function MainsQuestionManager() {
  const [form, setForm] = useState<FormData>(initialForm);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<PendingNoteImage[]>([]);
  const [savedPaths, setSavedPaths] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [filterSection, setFilterSection] = useState<FilterSection>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | Status>('all');
  const [filterType, setFilterType] = useState<'all' | QuestionType>('all');
  const [filterLanguage, setFilterLanguage] = useState('all');
  const [filterGs, setFilterGs] = useState('all');
  const [filterOptional, setFilterOptional] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');

  // Suggested directives include both standard command words and custom
  // directives previously saved in CSE questions. Nothing restricts typing.
  const directiveSuggestions = useMemo(() =>
    Array.from(new Set([
      ...DIRECTIVE_GROUPS.flatMap(group => group.values),
      ...questions.flatMap(item =>
        item.directive && item.directive.trim() ? [item.directive.trim()] : []
      )
    ])).sort((a, b) => a.localeCompare(b)),
    [questions]
  );

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(previous => ({ ...previous, [key]: value }));
  }
  function clearPending() {
    pendingImages.forEach(image => URL.revokeObjectURL(image.previewUrl));
    setPendingImages([]);
  }
  function resetForm() {
    clearPending(); setSavedPaths([]); setImageUrls({});
    setForm(initialForm()); setEditingId(null);
  }
  async function loadQuestions() {
    if (!supabase) { setMessage('Supabase is not configured.'); return; }
    setLoading(true);
    try {
      const records: Question[] = [];
      for (let offset = 0; ; offset += PAGE_SIZE) {
        const { data, error } = await supabase.from('mains_questions')
          .select(SELECT).order('created_at', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);
        if (error) throw error;
        records.push(...(data || []) as Question[]);
        if ((data || []).length < PAGE_SIZE) break;
      }
      setQuestions(records.filter(isCse));
    } catch (error) { setMessage(`Load failed: ${errorText(error)}`); }
    finally { setLoading(false); }
  }
  useEffect(() => { void loadQuestions(); }, []);

  const shown = useMemo(() => questions.filter(item => {
    if (filterSection !== 'all' && item.section_type !== filterSection) return false;
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    if (filterType !== 'all' && item.question_type !== filterType) return false;
    if (filterLanguage !== 'all' && item.section_type === 'language' && item.subject !== filterLanguage) return false;
    if (filterGs !== 'all' && item.section_type === 'gs' && item.gs_paper !== filterGs) return false;
    if (filterOptional !== 'all' && item.section_type === 'optional' && item.optional_subject !== filterOptional) return false;
    if (filterDifficulty !== 'all' && item.difficulty !== filterDifficulty) return false;
    const text = [item.question, item.subject, item.topic, item.source,
      item.gs_paper, item.optional_subject, item.paper_name].join(' ').toLowerCase();
    return text.includes(search.trim().toLowerCase());
  }), [questions, filterSection, filterStatus, filterType, filterLanguage, filterGs, filterOptional, filterDifficulty, search]);

  async function findDuplicate(): Promise<string | null> {
    if (!supabase) throw new Error('Supabase is not configured.');
    const target = normalizeMainsQuestionText(form.question);
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase.from('mains_questions')
        .select('id,question').order('id', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;
      const match = (data || []).find((row: { id: string; question: string }) => row.id !== editingId &&
        normalizeMainsQuestionText(row.question) === target);
      if (match) return String(match.id);
      if ((data || []).length < PAGE_SIZE) return null;
    }
  }

  async function saveQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || saving) return;
    const language = form.section === 'language';
    const subject = language ? form.compulsoryLanguage :
      form.section === 'essay' ? 'Essay' :
      form.section === 'optional' ? (form.subject.trim() || form.optionalSubject) : form.subject.trim();
    if (!form.question.trim() || !subject) { setMessage('Question and Subject are required.'); return; }
    if (form.section === 'optional' && form.gsRelevant && !form.relevantPapers.length) {
      setMessage('Select at least one GS paper or choose No, purely Optional.'); return;
    }
    const marks = form.marks.trim() ? Number(form.marks) : null;
    const words = form.wordLimit.trim() ? Number(form.wordLimit) : null;
    const year = form.pyqYear.trim() ? Number(form.pyqYear) : null;
    if ((marks !== null && (!Number.isFinite(marks) || marks <= 0)) ||
        (words !== null && (!Number.isInteger(words) || words <= 0)) ||
        (form.questionType === 'pyq' && (year === null || !Number.isInteger(year) || year < 1900 || year > new Date().getFullYear()))) {
      setMessage('Check Marks, Word Limit and Previous Year.'); return;
    }
    if (savedPaths.length + pendingImages.length > MAX_IMAGES) {
      setMessage(`Maximum ${MAX_IMAGES} framework images allowed.`); return;
    }
    const wasEditing = Boolean(editingId);
    setSaving(true); setMessage('Checking duplicate questions...');
    let rowSaved = false;
    let uploaded: string[] = [];
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error('Sign in with your admin/editor account.');
      if (await findDuplicate()) { setMessage('Duplicate blocked. This Mains question already exists.'); return; }
      const paperName = language
        ? form.compulsoryLanguage === 'English' ? 'Paper-B - English (Compulsory)' : `Paper-A - ${form.compulsoryLanguage} (Compulsory)`
        : form.section === 'gs' ? form.gsPaper : form.section === 'essay' ? 'Essay'
          : `${form.optionalSubject} ${form.optionalPaper}`;
      const payload = {
        question: form.question.trim(), question_type: form.questionType,
        section_type: form.section, exam_authority: 'UPSC',
        exam_name: 'Civil Services Examination', paper_name: paperName,
        gs_paper: form.section === 'gs' ? form.gsPaper : null,
        optional_subject: form.section === 'optional' ? form.optionalSubject : null,
        optional_paper: form.section === 'optional' ? form.optionalPaper : null,
        gs_relevance_papers: form.section === 'optional' && form.gsRelevant ? form.relevantPapers : [],
        subject, topic: form.topic.trim() || null, syllabus_link: form.syllabus.trim() || null,
        directive: form.directive || null, marks, word_limit: words,
        pyq_year: form.questionType === 'pyq' ? year : null,
        answer_framework: form.framework.trim() || null,
        key_points: form.keyPoints.trim() || null,
        introduction_hint: form.introduction.trim() || null,
        conclusion_hint: form.conclusion.trim() || null,
        source: form.source.trim() || null, source_url: form.sourceUrl.trim() || null,
        tags: form.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        difficulty: form.difficulty, status: form.status,
        updated_at: new Date().toISOString()
      };
      const originalPaths = editingId
        ? list(questions.find(item => item.id === editingId)?.framework_image_paths) : [];
      const result = editingId
        ? await supabase.from('mains_questions').update({ ...payload, framework_image_paths: savedPaths })
            .eq('id', editingId).select('id').single()
        : await supabase.from('mains_questions').insert({ ...payload,
            framework_image_paths: [], created_by: auth.user.id }).select('id').single();
      if (result.error || !result.data) throw result.error || new Error('Database save failed.');
      rowSaved = true;
      const id = String(result.data.id);
      if (pendingImages.length) {
        uploaded = await uploadMainsFrameworkImages({ questionId: id,
          files: pendingImages.map(image => image.file) });
        const { error } = await supabase.from('mains_questions')
          .update({ framework_image_paths: [...savedPaths, ...uploaded] }).eq('id', id);
        if (error) throw error;
      }
      const removed = originalPaths.filter(path => !savedPaths.includes(path));
      let warning = '';
      if (removed.length) {
        try { await removeMainsFrameworkImages(removed); }
        catch (error) { warning = ` Image cleanup warning: ${errorText(error)}`; }
      }
      resetForm(); await loadQuestions();
      setMessage((wasEditing ? 'Question updated.' : 'Question created.') + warning);
    } catch (error) {
      if (uploaded.length) {
        try { await removeMainsFrameworkImages(uploaded); }
        catch (cleanupError) { console.error(cleanupError); }
      }
      setMessage((rowSaved ? 'Question saved, but framework image upload/update failed: ' : 'Save failed: ') + errorText(error));
      if (rowSaved) await loadQuestions();
    } finally { setSaving(false); }
  }

  async function startEdit(item: Question) {
    const paths = list(item.framework_image_paths);
    clearPending(); setSavedPaths(paths); setImageUrls({});
    setEditingId(item.id);
    setForm({
      section: item.section_type, questionType: item.question_type,
      gsPaper: item.gs_paper || 'GS-I', optionalSubject: item.optional_subject || 'Geography',
      optionalPaper: item.optional_paper || 'Paper-I',
      compulsoryLanguage: LANGUAGES.includes(item.subject) ? item.subject : 'Hindi',
      gsRelevant: list(item.gs_relevance_papers).length > 0,
      relevantPapers: list(item.gs_relevance_papers), question: item.question,
      subject: item.subject, topic: item.topic || '', syllabus: item.syllabus_link || '',
      directive: item.directive || 'Discuss', marks: item.marks == null ? '' : String(item.marks),
      wordLimit: item.word_limit == null ? '' : String(item.word_limit),
      pyqYear: item.pyq_year == null ? '' : String(item.pyq_year),
      framework: item.answer_framework || '', keyPoints: item.key_points || '',
      introduction: item.introduction_hint || '', conclusion: item.conclusion_hint || '',
      source: item.source || '', sourceUrl: item.source_url || '',
      tags: list(item.tags).join(', '), difficulty: item.difficulty || 'medium',
      status: item.status || 'draft'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try { setImageUrls(await createMainsFrameworkImageUrls(paths)); }
    catch (error) { setMessage('Saved image preview unavailable: ' + errorText(error)); }
  }

  async function changeStatus(item: Question, next: Status) {
    if (!supabase) return;
    const { error } = await supabase.from('mains_questions')
      .update({ status: next, updated_at: new Date().toISOString() }).eq('id', item.id);
    if (error) { setMessage(error.message); return; }
    setMessage(`Status changed to ${next}.`); await loadQuestions();
  }
  async function deleteQuestion(item: Question) {
    if (!supabase || !window.confirm('Permanently delete this question?')) return;
    const { error } = await supabase.from('mains_questions').delete().eq('id', item.id);
    if (error) { setMessage(error.message); return; }
    if (list(item.framework_image_paths).length) {
      try { await removeMainsFrameworkImages(list(item.framework_image_paths)); }
      catch (error) { setMessage('Question deleted, but image cleanup failed: ' + errorText(error)); }
    }
    if (editingId === item.id) resetForm();
    await loadQuestions();
  }

  return (
    <section className="panel admin-form" style={{ marginTop: 12 }}>
      <span className="eyebrow">MAINS QUESTION MANAGER · UPSC CSE</span>
      <h2>{editingId ? 'Edit Mains Question' : 'Create Mains Question'}</h2>
      <form onSubmit={saveQuestion}>
        <div className="form-two">
          <label>Section
            <select value={form.section} onChange={(event: ValueChangeEvent) => set('section', event.target.value as Section)}>
              <option value="gs">General Studies</option><option value="essay">Essay</option>
              <option value="optional">Optional Subject</option>
              <option value="language">Compulsory Language Papers</option>
            </select>
          </label>
          <label>Question Type
            <select value={form.questionType} onChange={(event: ValueChangeEvent) => set('questionType', event.target.value as QuestionType)}>
              <option value="practice">Practice Question</option>
              <option value="pyq">Previous Year Question</option>
            </select>
          </label>
        </div>
        {form.section === 'gs' && <label>GS Paper
          <select value={form.gsPaper} onChange={(event: ValueChangeEvent) => set('gsPaper', event.target.value)}>
            {GS.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>}
        {form.section === 'optional' && <>
          <div className="form-two">
            <label>Optional Subject
              <select value={form.optionalSubject} onChange={(event: ValueChangeEvent) => set('optionalSubject', event.target.value)}>
                {OPTIONALS.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>Optional Paper
              <select value={form.optionalPaper} onChange={(event: ValueChangeEvent) => set('optionalPaper', event.target.value)}>
                <option value="Paper-I">Paper-I</option><option value="Paper-II">Paper-II</option>
              </select>
            </label>
          </div>
          <section className="panel" style={{ marginBottom: 16 }}>
            <h3>Is this Optional question also relevant to General Studies?</h3>
            <p>Select Yes to cross-list it under GS while retaining its Optional classification.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <button type="button" className={form.gsRelevant ? 'primary-btn' : 'secondary-btn'}
                onClick={() => set('gsRelevant', true)}>Yes, also useful for GS</button>
              <button type="button" className={!form.gsRelevant ? 'primary-btn' : 'secondary-btn'}
                onClick={() => setForm(previous => ({ ...previous, gsRelevant: false, relevantPapers: [] }))}>
                No, purely Optional</button>
            </div>
            {form.gsRelevant && <div className="tag-row" style={{ marginTop: 12 }}>
              {GS.map(paper => <button type="button" key={paper}
                className={form.relevantPapers.includes(paper) ? 'primary-btn' : 'secondary-btn'}
                onClick={() => set('relevantPapers', form.relevantPapers.includes(paper)
                  ? form.relevantPapers.filter(value => value !== paper) : [...form.relevantPapers, paper])}>
                {paper}</button>)}
            </div>}
          </section>
        </>}
        {form.section === 'language' && <div className="form-two">
          <label>Compulsory Language Subject
            <select value={form.compulsoryLanguage} onChange={(event: ValueChangeEvent) => set('compulsoryLanguage', event.target.value)}>
              {LANGUAGES.map(language => <option key={language} value={language}>{language} (Compulsory)</option>)}
            </select>
          </label>
          <label>Qualifying Paper
            <input readOnly value={form.compulsoryLanguage === 'English'
              ? 'Paper B — English (Qualifying)' : 'Paper A — Indian Language (Qualifying)'} />
          </label>
        </div>}
        {form.questionType === 'pyq' && <label>Previous Year
          <input type="number" min="1900" max={new Date().getFullYear()} value={form.pyqYear}
            onChange={(event: ValueChangeEvent) => set('pyqYear', event.target.value)} placeholder="2025" required />
        </label>}
        <label>Question
          <textarea rows={5} value={form.question} onChange={(event: ValueChangeEvent) => set('question', event.target.value)}
            placeholder="Enter UPSC CSE Mains question" required />
        </label>
        <div className="form-two">
          <label>Subject / Syllabus Area
            <input value={form.section === 'essay' ? 'Essay' :
              form.section === 'language' ? form.compulsoryLanguage : form.subject}
              disabled={form.section === 'essay' || form.section === 'language'}
              onChange={(event: ValueChangeEvent) => set('subject', event.target.value)}
              placeholder="Indian Society / Governance / Economy" />
          </label>
          <label>Topic
            <input value={form.topic} onChange={(event: ValueChangeEvent) => set('topic', event.target.value)}
              placeholder="Grammar / Comprehension / Federalism / Ethics" />
          </label>
        </div>
        <label>UPSC Syllabus Linkage
          <textarea rows={3} value={form.syllabus} onChange={(event: ValueChangeEvent) => set('syllabus', event.target.value)}
            placeholder="Mention exact examination syllabus linkage" />
        </label>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            alignItems: 'end'
          }}
        >
          <label>Directive
            <input
              type="text"
              list="cse-mains-directive-suggestions"
              value={form.directive}
              onChange={(event: ValueChangeEvent) =>
                set('directive', event.target.value)
              }
              placeholder="Choose a suggestion or type the exact directive"
              autoComplete="off"
              title="Select a suggested directive or type the exact command from the question"
            />
            <datalist id="cse-mains-directive-suggestions">
              {directiveSuggestions.map(value => (
                <option key={value} value={value} />
              ))}
            </datalist>
          </label>
          <label>Marks
            <input type="number" min="0.5" step="0.5" value={form.marks}
              onChange={(event: ValueChangeEvent) => set('marks', event.target.value)} />
          </label>
          <label>Word Limit
            <input type="number" min="1" step="1" value={form.wordLimit}
              onChange={(event: ValueChangeEvent) => set('wordLimit', event.target.value)} />
          </label>
        </div>
        <label>Answer Framework
          <textarea rows={5} value={form.framework} onChange={(event: ValueChangeEvent) => set('framework', event.target.value)}
            placeholder="Introduction → Main Body → Conclusion" />
        </label>
        <label>Key Points
          <textarea rows={4} value={form.keyPoints} onChange={(event: ValueChangeEvent) => set('keyPoints', event.target.value)} />
        </label>
        <label>Introduction Hint
          <textarea rows={3} value={form.introduction} onChange={(event: ValueChangeEvent) => set('introduction', event.target.value)} />
        </label>
        <label>Conclusion Hint
          <textarea rows={3} value={form.conclusion} onChange={(event: ValueChangeEvent) => set('conclusion', event.target.value)} />
        </label>
        <section className="panel" style={{ marginBottom: 18 }}>
          <span className="eyebrow">VISUAL ANSWER FRAMEWORK</span>
          <h3>Add Maps, Diagrams, Flowcharts or Graphs</h3>
          <p>These visuals can be shown with the suggested answer framework after the student attempts the question.</p>
          {savedPaths.length > 0 && <div className="tag-row">
            {savedPaths.map(path => <div key={path} style={{ maxWidth: 170 }}>
              {imageUrls[path]
                ? <img src={imageUrls[path]} alt="Answer framework visual"
                    style={{ width: '100%', maxHeight: 130, objectFit: 'contain' }} />
                : <small>Previously uploaded image</small>}
              <button type="button" className="secondary-btn"
                onClick={() => setSavedPaths(previous => previous.filter(item => item !== path))}>Remove</button>
            </div>)}
          </div>}
          <StudentNoteImagePicker images={pendingImages} onChange={setPendingImages}
            maxImages={Math.max(0, MAX_IMAGES - savedPaths.length)} disabled={saving} />
          <small>Maximum {MAX_IMAGES} images per question.</small>
        </section>
        <label>Tags (comma-separated)
          <input value={form.tags} onChange={(event: ValueChangeEvent) => set('tags', event.target.value)}
            placeholder="GS-II, Constitution, Language, Essay" />
        </label>
        <div className="form-two">
          <label>Source
            <input value={form.source} onChange={(event: ValueChangeEvent) => set('source', event.target.value)}
              placeholder="UPSC / NCERT / PIB" />
          </label>
          <label>Source URL
            <input type="url" value={form.sourceUrl} onChange={(event: ValueChangeEvent) => set('sourceUrl', event.target.value)}
              placeholder="https://..." />
          </label>
          <label>Difficulty
            <select value={form.difficulty} onChange={(event: ValueChangeEvent) => set('difficulty', event.target.value as Difficulty)}>
              <option value="easy">Easy</option><option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
          <label>Status
            <select value={form.status} onChange={(event: ValueChangeEvent) => set('status', event.target.value as Status)}>
              <option value="draft">Draft</option><option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>
        {message && <p role="status" style={{ whiteSpace: 'pre-wrap', color: '#5eead4' }}>{message}</p>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button type="submit" className="primary-btn" disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Update Question' :
              form.status === 'published' ? 'Publish Question' : 'Save Draft'}
          </button>
          <button type="button" className="secondary-btn" disabled={saving}
            onClick={() => { resetForm(); setMessage(''); }}>Clear / Cancel Edit</button>
        </div>
      </form>
      <hr style={{ margin: '26px 0', borderColor: '#334155' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div><span className="eyebrow">MAINS QUESTION BANK</span><h2>Existing Mains Questions</h2></div>
        <button type="button" className="secondary-btn" onClick={() => void loadQuestions()}>Refresh Questions</button>
      </div>
      <label>Search Mains Question Bank
        <input value={search} onChange={(event: ValueChangeEvent) => setSearch(event.target.value)}
          placeholder="Question / Topic / Subject / Language" />
      </label>
      <div className="form-two">
        <label>Section
          <select value={filterSection} onChange={(event: ValueChangeEvent) => setFilterSection(event.target.value as FilterSection)}>
            <option value="all">All Sections</option>
            {(['gs', 'essay', 'optional', 'language'] as Section[]).map(value =>
              <option key={value} value={value}>{sectionLabel(value)}</option>)}
          </select>
        </label>
        <label>Question Type
          <select value={filterType} onChange={(event: ValueChangeEvent) => setFilterType(event.target.value as 'all' | QuestionType)}>
            <option value="all">All Questions</option><option value="practice">Practice</option>
            <option value="pyq">Previous Year</option>
          </select>
        </label>
        <label>Status
          <select value={filterStatus} onChange={(event: ValueChangeEvent) => setFilterStatus(event.target.value as 'all' | Status)}>
            <option value="all">All Statuses</option><option value="draft">Draft</option>
            <option value="published">Published</option><option value="archived">Archived</option>
          </select>
        </label>
        {filterSection === 'gs' && <label>GS Paper
          <select value={filterGs} onChange={(event: ValueChangeEvent) => setFilterGs(event.target.value)}>
            <option value="all">All GS Papers</option>
            {GS.map(paper => <option key={paper} value={paper}>{paper}</option>)}
          </select>
        </label>}
        {filterSection === 'optional' && <label>Optional Subject
          <select value={filterOptional} onChange={(event: ValueChangeEvent) => setFilterOptional(event.target.value)}>
            <option value="all">All Optional Subjects</option>
            {OPTIONALS.map(item => <option value={item} key={item}>{item}</option>)}
          </select>
        </label>}
        <label>Difficulty
          <select value={filterDifficulty} onChange={(event: ValueChangeEvent) => setFilterDifficulty(event.target.value)}>
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option><option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
        {filterSection === 'language' && <label>Compulsory Language
          <select value={filterLanguage} onChange={(event: ValueChangeEvent) => setFilterLanguage(event.target.value)}>
            <option value="all">All Languages</option>
            {LANGUAGES.map(language => <option value={language} key={language}>{language}</option>)}
          </select>
        </label>}
      </div>
      {loading && <p>Loading Mains questions...</p>}
      {!loading && shown.length === 0 && <p>No questions match the filters.</p>}
      <p>{shown.length} question(s)</p>
      <div style={{ display: 'grid', gap: 12 }}>
        {shown.map(item => <article key={item.id} className="panel">
          <span className="eyebrow">
            {item.section_type === 'language' ? `${item.subject} (Compulsory)` :
              item.section_type === 'gs' ? item.gs_paper :
              item.section_type === 'essay' ? 'Essay' : `${item.optional_subject} · ${item.optional_paper}`}
          </span>
          <h3 style={{ whiteSpace: 'pre-wrap' }}>{item.question}</h3>
          <div className="tag-row">
            <span className="tag">{item.question_type === 'pyq' ? `PYQ ${item.pyq_year || ''}` : 'Practice'}</span>
            <span className="tag">{item.status}</span>
            {list(item.gs_relevance_papers).length > 0 &&
              <span className="tag">Also relevant to: {list(item.gs_relevance_papers).join(', ')}</span>}
            {list(item.framework_image_paths).length > 0 && <span className="tag">Visual framework available</span>}
          </div>
          <p>{item.subject}{item.topic ? ` · ${item.topic}` : ''}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button type="button" className="secondary-btn" onClick={() => void startEdit(item)}>Edit</button>
            {item.status !== 'published' && <button type="button" className="secondary-btn"
              onClick={() => void changeStatus(item, 'published')}>Publish</button>}
            {item.status !== 'archived' && <button type="button" className="secondary-btn"
              onClick={() => void changeStatus(item, 'archived')}>Archive</button>}
            <button type="button" className="secondary-btn" onClick={() => void deleteQuestion(item)}>Delete</button>
          </div>
        </article>)}
      </div>
    </section>
  );
}

export default MainsQuestionManager;

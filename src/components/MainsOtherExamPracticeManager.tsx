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
  const [paperName, setPaperName] = useState('');
  const [gsPaper, setGsPaper] = useState('');
  const [gsRelevant, setGsRelevant] = useState(false);
  const [relevantPapers, setRelevantPapers] = useState<string[]>([]);
  const [pyqYear, setPyqYear] = useState('');
  const [question, setQuestion] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [syllabusLink, setSyllabusLink] = useState('');
  const [directive, setDirective] = useState('Discuss');
  const [marks, setMarks] = useState('10');
  const [wordLimit, setWordLimit] = useState('150');
  const [answerFramework, setAnswerFramework] = useState('');
  const [keyPoints, setKeyPoints] = useState('');
  const [introductionHint, setIntroductionHint] = useState('');
  const [conclusionHint, setConclusionHint] = useState('');
  const [pendingImages, setPendingImages] = useState<PendingNoteImage[]>([]);
  const [savedImagePaths, setSavedImagePaths] = useState<string[]>([]);
  const [originalImagePaths, setOriginalImagePaths] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [source, setSource] = useState('');
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

  const filteredRecent = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return recent.filter(item => belongsToScope(item, scope) &&
      (!needle || [item.question, item.exam_name, item.exam_authority,
        item.state_name, item.paper_name, item.subject, item.topic, item.source]
        .some(v => String(v || '').toLowerCase().includes(needle))));
  }, [recent, scope, search]);

  function clearPending() {
    pendingImages.forEach(item => URL.revokeObjectURL(item.previewUrl));
    setPendingImages([]);
  }

  function clearQuestionForm() {
    setEditingId(null);
    setSection('gs');
    setQuestionType('practice');
    setOptionalSubject('');
    setOptionalPaper('Paper-I');
    setPaperName('');
    setGsPaper('');
    setGsRelevant(false);
    setRelevantPapers([]);
    setPyqYear('');
    setQuestion('');
    setSubject('');
    setTopic('');
    setSyllabusLink('');
    setDirective('Discuss');
    setMarks('10');
    setWordLimit('150');
    setAnswerFramework('');
    setKeyPoints('');
    setIntroductionHint('');
    setConclusionHint('');
    clearPending();
    setSavedImagePaths([]);
    setOriginalImagePaths([]);
    setImageUrls({});
    setSource('');
    setSourceUrl('');
    setTagsText('');
    setDifficulty('medium');
    setStatus('draft');
  }

  async function loadRecent() {
    if (!supabase) {
      setMessage('Supabase is not configured.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.from('mains_questions')
        .select(EDIT_SELECT)
        .not('exam_authority', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(300);
      if (error) throw error;
      setRecent((data || []) as StoredQuestion[]);
    } catch (err) {
      setMessage('Unable to load questions: ' + errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadRecent(); }, []);

  async function findDuplicate(exceptId: string | null): Promise<string | null> {
    if (!supabase) throw new Error('Supabase is not configured.');
    const normalized = normalizeMainsQuestionText(question);
    for (let start = 0; ; start += PAGE_SIZE) {
      const { data, error } = await supabase.from('mains_questions')
        .select('id,question').order('id', { ascending: true })
        .range(start, start + PAGE_SIZE - 1);
      if (error) throw error;
      const rows = data || [];
      const found = rows.find((row: { id: string; question: string }) => row.id !== exceptId &&
        normalizeMainsQuestionText(row.question) === normalized);
      if (found) return String(found.id);
      if (rows.length < PAGE_SIZE) return null;
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !supabase) return;
    if (!examName.trim() || !resolvedAuthority ||
      (scope === 'state_psc' && !stateName.trim())) {
      setMessage('Enter examination name and the PSC authority/state, if applicable.');
      return;
    }
    if (!question.trim() || !paperName.trim()) {
      setMessage('Paper Name and Question are required.');
      return;
    }
    if (section === 'optional' && !optionalSubject.trim()) {
      setMessage('Choose an Optional Subject.');
      return;
    }
    if (section === 'optional' && gsRelevant && relevantPapers.length === 0) {
      setMessage('Choose at least one relevant GS paper.');
      return;
    }
    const resolvedSubject = subject.trim() ||
      (section === 'essay' ? 'Essay' :
        section === 'optional' ? optionalSubject.trim() :
          section === 'language' ? paperName.trim() : '');
    if (!resolvedSubject) {
      setMessage('Enter Subject / Syllabus Area.');
      return;
    }
    const parsedMarks = numberOrNull(marks);
    const parsedWords = numberOrNull(wordLimit);
    const parsedYear = numberOrNull(pyqYear);
    if ((marks.trim() && (!parsedMarks || parsedMarks <= 0)) ||
      (wordLimit.trim() && (!parsedWords || !Number.isInteger(parsedWords) || parsedWords <= 0)) ||
      (questionType === 'pyq' && (!parsedYear || !Number.isInteger(parsedYear) || parsedYear < 1900 || parsedYear > new Date().getFullYear()))) {
      setMessage('Check Marks, Word Limit and PYQ Year values.');
      return;
    }
    if (savedImagePaths.length + pendingImages.length > MAX_FRAMEWORK_IMAGES) {
      setMessage(`Maximum ${MAX_FRAMEWORK_IMAGES} framework images are allowed.`);
      return;
    }

    setSaving(true);
    setMessage('Checking duplicates and saving...');
    let rowSaved = false;
    let uploadedPaths: string[] = [];
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error('Sign in as an editor/admin first.');
      const duplicate = await findDuplicate(editingId);
      if (duplicate) {
        setMessage('Duplicate blocked. The same Mains question already exists.');
        return;
      }
      const tagValues = [resolvedAuthority, examName.trim(),
        ...(scope === 'state_psc' ? [stateName.trim()] : []),
        ...tagsText.split(',').map(t => t.trim())].filter(Boolean);
      const payload = {
        question: question.trim(),
        question_type: questionType,
        section_type: section,
        exam_authority: resolvedAuthority,
        exam_name: examName.trim(),
        state_name: scope === 'state_psc' ? stateName.trim() : null,
        paper_name: paperName.trim(),
        gs_paper: section === 'gs' ? gsPaper.trim() || null : null,
        optional_subject: section === 'optional' ? optionalSubject.trim() : null,
        optional_paper: section === 'optional' ? optionalPaper.trim() || null : null,
        gs_relevance_papers: section === 'optional' && gsRelevant ? relevantPapers : [],
        subject: resolvedSubject,
        topic: topic.trim() || null,
        syllabus_link: syllabusLink.trim() || null,
        directive: directive.trim() || null,
        marks: parsedMarks,
        word_limit: parsedWords,
        pyq_year: questionType === 'pyq' ? parsedYear : null,
        answer_framework: answerFramework.trim() || null,
        key_points: keyPoints.trim() || null,
        introduction_hint: introductionHint.trim() || null,
        conclusion_hint: conclusionHint.trim() || null,
        source: source.trim() || `${resolvedAuthority} • ${examName.trim()}`,
        source_url: sourceUrl.trim() || null,
        tags: Array.from(new Set(tagValues)),
        difficulty,
        status
      };
      const wasEditing = Boolean(editingId);
      const result = editingId
        ? await supabase.from('mains_questions').update({
          ...payload, framework_image_paths: savedImagePaths
        }).eq('id', editingId).select('id').single()
        : await supabase.from('mains_questions').insert({
          ...payload, framework_image_paths: [], created_by: auth.user.id
        }).select('id').single();
      if (result.error || !result.data) throw result.error || new Error('Database save failed.');
      rowSaved = true;
      const id = String(result.data.id);
      const toDelete = originalImagePaths.filter(p => !savedImagePaths.includes(p));
      if (pendingImages.length) {
        uploadedPaths = await uploadMainsFrameworkImages({
          questionId: id, files: pendingImages.map(p => p.file)
        });
        const { error: imageError } = await supabase.from('mains_questions')
          .update({ framework_image_paths: [...savedImagePaths, ...uploadedPaths] })
          .eq('id', id);
        if (imageError) throw imageError;
      }
      let cleanupWarning = '';
      if (toDelete.length) {
        try { await removeMainsFrameworkImages(toDelete); }
        catch (err) { cleanupWarning = ` Old image cleanup: ${errorMessage(err)}`; }
      }
      clearQuestionForm();
      await loadRecent();
      setMessage((wasEditing ? 'Question updated successfully.' : 'Question saved successfully.') + cleanupWarning);
    } catch (err) {
      if (uploadedPaths.length) {
        try { await removeMainsFrameworkImages(uploadedPaths); }
        catch (cleanupError) { console.error('Upload rollback failed', cleanupError); }
      }
      setMessage((rowSaved
        ? 'Question details were saved, but image processing failed. Edit the question to retry. '
        : 'Save failed: ') + errorMessage(err));
      if (rowSaved) await loadRecent();
    } finally {
      setSaving(false);
    }
  }

  async function startEdit(item: StoredQuestion) {
    const isUpsc = (item.exam_authority || '').toUpperCase() === 'UPSC';
    setScope(isUpsc ? 'upsc_other' : 'state_psc');
    setAuthority(isUpsc ? '' : item.exam_authority || '');
    setStateName(item.state_name || '');
    setExamName(item.exam_name || '');
    setSection(item.section_type);
    setQuestionType(item.question_type);
    setOptionalSubject(item.optional_subject || '');
    setOptionalPaper(item.optional_paper || 'Paper-I');
    setPaperName(item.paper_name || '');
    setGsPaper(item.gs_paper || '');
    const gs = strings(item.gs_relevance_papers);
    setGsRelevant(gs.length > 0);
    setRelevantPapers(gs);
    setPyqYear(item.pyq_year == null ? '' : String(item.pyq_year));
    setQuestion(item.question);
    setSubject(item.subject || '');
    setTopic(item.topic || '');
    setSyllabusLink(item.syllabus_link || '');
    setDirective(item.directive || 'Discuss');
    setMarks(item.marks == null ? '' : String(item.marks));
    setWordLimit(item.word_limit == null ? '' : String(item.word_limit));
    setAnswerFramework(item.answer_framework || '');
    setKeyPoints(item.key_points || '');
    setIntroductionHint(item.introduction_hint || '');
    setConclusionHint(item.conclusion_hint || '');
    clearPending();
    const paths = strings(item.framework_image_paths);
    setSavedImagePaths(paths);
    setOriginalImagePaths(paths);
    setImageUrls({});
    setSource(item.source || '');
    setSourceUrl(item.source_url || '');
    const system = new Set([item.exam_authority || '', item.exam_name || '', item.state_name || '']);
    setTagsText(strings(item.tags).filter(t => !system.has(t)).join(', '));
    setDifficulty(item.difficulty || 'medium');
    setStatus(item.status || 'draft');
    setEditingId(item.id);
    setMessage('Editing selected question.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      setImageUrls(await createMainsFrameworkImageUrls(paths));
    } catch (err) {
      setMessage('Editing question; visual preview unavailable: ' + errorMessage(err));
    }
  }

  return <section className="panel admin-form" style={{ marginTop: 12 }}>
    <span className="eyebrow">OTHER UPSC &amp; STATE PSC</span>
    <h2>{editingId ? 'Edit Mains Question' : 'Create Mains Question'}</h2>
    <p style={{ color: '#94a3b8' }}>
      The question sequence matches the UPSC CSE manager. GS relevance and visual answer frameworks are supported.
    </p>

    <form onSubmit={save}>
      <div className="form-two">
        <label>Exam Source
          <select value={scope} onChange={e => {
            setScope(e.target.value as ExamScope);
            setAuthority(''); setStateName(''); setExamName('');
            clearQuestionForm();
          }}>
            <option value="upsc_other">Other UPSC Examinations</option>
            <option value="state_psc">State PSC Examinations</option>
          </select>
        </label>
        {scope === 'state_psc' && <>
          <label>State / UT
            <input value={stateName} onChange={e => setStateName(e.target.value)}
              placeholder="Maharashtra" required />
          </label>
          <label>PSC / Commission
            <input value={authority} onChange={e => setAuthority(e.target.value)}
              placeholder="MPSC / UPPSC / BPSC" required />
          </label>
        </>}
        <label>Examination Name
          <input value={examName} onChange={e => setExamName(e.target.value)}
            placeholder="Engineering Services / State Services" required />
        </label>
      </div>

      <div className="form-two">
        <label>Section
          <select value={section} onChange={e => {
            const next = e.target.value as SectionType;
            setSection(next);
            if (next !== 'optional') { setGsRelevant(false); setRelevantPapers([]); }
          }}>
            <option value="gs">General Studies</option>
            <option value="essay">Essay</option>
            <option value="optional">Optional Subject</option>
            <option value="language">Language / Compulsory Paper</option>
            <option value="other">Other Paper</option>
          </select>
        </label>
        <label>Question Type
          <select value={questionType} onChange={e => setQuestionType(e.target.value as QuestionType)}>
            <option value="practice">Practice Question</option>
            <option value="pyq">Previous Year Question</option>
          </select>
        </label>
      </div>

      {section === 'optional' && <div className="form-two">
        <label>Optional Subject
          <input value={optionalSubject} onChange={e => setOptionalSubject(e.target.value)}
            placeholder="Geography / Electrical Engineering" required />
        </label>
        <label>Optional Paper
          <select value={optionalPaper} onChange={e => setOptionalPaper(e.target.value)}>
            <option value="Paper-I">Paper-I</option><option value="Paper-II">Paper-II</option>
          </select>
        </label>
      </div>}

      {section === 'optional' && <section className="panel" style={{ marginBottom: 18, border: '1px solid rgba(45,212,191,0.35)' }}>
        <h3>Is this Optional question also relevant to General Studies?</h3>
        <p>Select Yes to cross-list this question in GS practice; it will remain an Optional question.</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <button type="button" className={gsRelevant ? 'primary-btn' : 'secondary-btn'}
            onClick={() => setGsRelevant(true)}>Yes, also useful for GS</button>
          <button type="button" className={!gsRelevant ? 'primary-btn' : 'secondary-btn'}
            onClick={() => { setGsRelevant(false); setRelevantPapers([]); }}>No, purely Optional</button>
        </div>
        {gsRelevant && <div className="tag-row">
          {GS_PAPERS.map(p => <button type="button" key={p}
            className={relevantPapers.includes(p) ? 'primary-btn' : 'secondary-btn'}
            onClick={() => setRelevantPapers(old => old.includes(p) ? old.filter(x => x !== p) : [...old, p])}>{p}</button>)}
        </div>}
      </section>}

      <div className="form-two">
        <label>Paper Name
          <input value={paperName} onChange={e => setPaperName(e.target.value)}
            placeholder="General Studies-I / Electrical Engineering Paper-I" required />
        </label>
        {section === 'gs' && <label>GS Paper
          <select value={gsPaper} onChange={e => setGsPaper(e.target.value)}>
            <option value="">Select GS Paper (optional)</option>
            {GS_PAPERS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>}
      </div>

      {questionType === 'pyq' && <label>Previous Year
        <input type="number" min="1900" max={new Date().getFullYear()}
          value={pyqYear} onChange={e => setPyqYear(e.target.value)} placeholder="2025" required />
      </label>}

      <label>Question
        <textarea rows={5} value={question} onChange={e => setQuestion(e.target.value)}
          placeholder="Enter the Mains question" required />
      </label>
      <div className="form-two">
        <label>Subject / Syllabus Area
          <input value={subject} onChange={e => setSubject(e.target.value)}
            placeholder="Indian Heritage & Culture / Governance / Energy" />
        </label>
        <label>Topic
          <input value={topic} onChange={e => setTopic(e.target.value)}
            placeholder="Federalism / Agriculture / Ethics" />
        </label>
      </div>
      <label>Syllabus Linkage
        <textarea rows={3} value={syllabusLink} onChange={e => setSyllabusLink(e.target.value)}
          placeholder="Mention the exact examination syllabus linkage." />
      </label>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '16px',
          alignItems: 'end',
          width: '100%'
        }}
      >
        <label>Directive
          <select value={directive} onChange={e => setDirective(e.target.value)}>
            {['Discuss','Examine','Evaluate','Analyse','Comment','Elucidate','Critically examine','Critically analyse'].map(v =>
              <option value={v} key={v}>{v}</option>)}
          </select>
        </label>
        <label>Marks
          <input type="number" step="0.5" min="0.5" value={marks}
            onChange={e => setMarks(e.target.value)} />
        </label>
        <label>Word Limit
          <input type="number" min="1" step="1" value={wordLimit}
            onChange={e => setWordLimit(e.target.value)} />
        </label>
      </div>
      <label>Answer Framework
        <textarea rows={5} value={answerFramework} onChange={e => setAnswerFramework(e.target.value)}
          placeholder="Suggested structure: Introduction → Main Body → Conclusion" />
      </label>
      <label>Key Points
        <textarea rows={4} value={keyPoints} onChange={e => setKeyPoints(e.target.value)}
          placeholder="Facts, examples, committees, judgements or reports" />
      </label>
      <label>Introduction Hint
        <textarea rows={3} value={introductionHint} onChange={e => setIntroductionHint(e.target.value)}
          placeholder="How a strong answer may begin" />
      </label>
      <label>Conclusion Hint
        <textarea rows={3} value={conclusionHint} onChange={e => setConclusionHint(e.target.value)}
          placeholder="Balanced conclusion or way forward" />
      </label>

      <section className="panel" style={{ marginBottom: 18 }}>
        <span className="eyebrow">VISUAL ANSWER FRAMEWORK</span>
        <h3>Add Maps, Diagrams, Flowcharts or Graphs</h3>
        <p>These visuals can be shown with the suggested answer framework after the student attempts the question.</p>
        {savedImagePaths.length > 0 && <div className="tag-row" style={{ marginBottom: 12 }}>
          {savedImagePaths.map(path => <div key={path} style={{ maxWidth: 170 }}>
            {imageUrls[path]
              ? <img src={imageUrls[path]} alt="Saved answer framework" style={{ width: '100%', maxHeight: 140, objectFit: 'contain' }} />
              : <small>Saved image</small>}
            <button type="button" className="secondary-btn"
              onClick={() => setSavedImagePaths(old => old.filter(p => p !== path))}>Remove</button>
          </div>)}
        </div>}
        <StudentNoteImagePicker images={pendingImages} onChange={setPendingImages}
          maxImages={Math.max(0, MAX_FRAMEWORK_IMAGES - savedImagePaths.length)} disabled={saving} />
        <small>Maximum {MAX_FRAMEWORK_IMAGES} images. Stored privately using the same CSE framework uploader.</small>
      </section>

      <label>Tags
        <input value={tagsText} onChange={e => setTagsText(e.target.value)}
          placeholder="GS-II, Federalism, Constitution" />
        <small>Separate tags using commas.</small>
      </label>
      <div className="form-two">
        <label>Source
          <input value={source} onChange={e => setSource(e.target.value)}
            placeholder="UPSC / PIB / NCERT / ARC" />
        </label>
        <label>Source URL
          <input type="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)}
            placeholder="https://..." />
        </label>
        <label>Difficulty
          <select value={difficulty} onChange={e => setDifficulty(e.target.value as Difficulty)}>
            <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
          </select>
        </label>
        <label>Status
          <select value={status} onChange={e => setStatus(e.target.value as QuestionStatus)}>
            <option value="draft">Draft</option><option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
      </div>
      {message && <p role="status" style={{ whiteSpace: 'pre-wrap', color: '#5eead4' }}>{message}</p>}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button type="submit" className="primary-btn" disabled={saving}>
          {saving ? 'Saving...' : editingId ? 'Update Question' : status === 'published' ? 'Publish Question' : 'Save Draft'}
        </button>
        <button type="button" className="secondary-btn" disabled={saving}
          onClick={() => { clearQuestionForm(); setMessage(''); }}>Clear / Cancel Edit</button>
      </div>
    </form>

    <hr style={{ margin: '26px 0', borderColor: '#334155' }} />
    <h3>Existing Other UPSC & State PSC Questions</h3>
    <label>Search Mains Question Bank
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search question, subject, topic or source" />
    </label>
    <button type="button" className="secondary-btn" onClick={() => void loadRecent()}>Refresh Questions</button>
    {loading && <p>Loading questions...</p>}
    {!loading && filteredRecent.length === 0 && <p>No matching questions among the most recent 300 entries.</p>}
    {filteredRecent.map(item => <article className="panel" key={item.id} style={{ marginTop: 10 }}>
      <div className="tag-row">
        <span className="tag">{item.exam_authority}</span>
        <span className="tag">{item.exam_name}</span>
        <span className="tag">{item.question_type === 'pyq' ? `PYQ ${item.pyq_year || ''}` : 'Practice'}</span>
        {strings(item.gs_relevance_papers).length > 0 &&
          <span className="tag">Relevant to {strings(item.gs_relevance_papers).join(', ')}</span>}
      </div>
      <p style={{ whiteSpace: 'pre-wrap' }}><strong>{item.question}</strong></p>
      <small>{item.subject} · {item.status}</small>
      <div style={{ marginTop: 10 }}>
        <button type="button" className="secondary-btn" onClick={() => void startEdit(item)}>Edit Question</button>
      </div>
    </article>)}
  </section>;
}

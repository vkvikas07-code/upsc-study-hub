
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent
} from 'react';

import { supabase } from '../lib/supabase';

type ExamScope = 'upsc_other' | 'state_psc';

type SectionType =
  | 'gs'
  | 'essay'
  | 'optional'
  | 'language'
  | 'other';

type Difficulty = 'easy' | 'medium' | 'hard';

type QuestionStatus =
  | 'draft'
  | 'published'
  | 'archived';

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
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error
  ) {
    return String(error.message);
  }

  return 'An unexpected error occurred.';
}

function positiveNumber(value: string): number | null {
  if (!value.trim()) return null;

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : null;
}

function normalizeQuestion(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function MainsOtherExamPracticeManager() {
  const [scope, setScope] =
    useState<ExamScope>('upsc_other');

  const [authority, setAuthority] = useState('');
  const [stateName, setStateName] = useState('');
  const [examName, setExamName] = useState('');

  const [section, setSection] =
    useState<SectionType>('gs');

  const [paperName, setPaperName] = useState('');
  const [gsPaper, setGsPaper] = useState('');

  const [optionalSubject, setOptionalSubject] =
    useState('');

  const [optionalPaper, setOptionalPaper] =
    useState('');

  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [syllabusLink, setSyllabusLink] = useState('');

  const [question, setQuestion] = useState('');
  const [directive, setDirective] = useState('Discuss');

  const [marks, setMarks] = useState('10');
  const [wordLimit, setWordLimit] = useState('150');

  const [answerFramework, setAnswerFramework] =
    useState('');

  const [keyPoints, setKeyPoints] = useState('');

  const [introductionHint, setIntroductionHint] =
    useState('');

  const [conclusionHint, setConclusionHint] =
    useState('');

  const [sourceUrl, setSourceUrl] = useState('');
  const [tagsText, setTagsText] = useState('');

  const [difficulty, setDifficulty] =
    useState<Difficulty>('medium');

  const [status, setStatus] =
    useState<QuestionStatus>('draft');

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState('');

  const [recent, setRecent] =
    useState<StoredQuestion[]>([]);

  const [search, setSearch] = useState('');

  const resolvedAuthority =
    scope === 'upsc_other'
      ? 'UPSC'
      : authority.trim();

  const shown = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return recent.filter(item => {
      const isUpsc =
        (item.exam_authority || '').toUpperCase() ===
        'UPSC';

      const belongsToScope =
        scope === 'upsc_other'
          ? isUpsc &&
            item.exam_name !==
              'Civil Services Examination'
          : !isUpsc;

      if (!belongsToScope) return false;

      if (!keyword) return true;

      return [
        item.question,
        item.exam_name,
        item.state_name,
        item.paper_name,
        item.subject,
        item.topic
      ].some(value =>
        (value || '').toLowerCase().includes(keyword)
      );
    });
  }, [recent, scope, search]);

  function clearQuestion() {
    setEditingId(null);
    setSection('gs');
    setPaperName('');
    setGsPaper('');
    setOptionalSubject('');
    setOptionalPaper('');
    setSubject('');
    setTopic('');
    setSyllabusLink('');
    setQuestion('');
    setDirective('Discuss');
    setMarks('10');
    setWordLimit('150');
    setAnswerFramework('');
    setKeyPoints('');
    setIntroductionHint('');
    setConclusionHint('');
    setSourceUrl('');
    setTagsText('');
    setDifficulty('medium');
    setStatus('draft');
    setMessage('');
  }

  async function loadRecent() {
    if (!supabase) {
      setMessage('Supabase is not configured.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('mains_questions')
        .select(`
          id,
          question,
          question_type,
          section_type,
          exam_authority,
          exam_name,
          state_name,
          paper_name,
          gs_paper,
          optional_subject,
          optional_paper,
          subject,
          topic,
          syllabus_link,
          directive,
          marks,
          word_limit,
          answer_framework,
          key_points,
          introduction_hint,
          conclusion_hint,
          source,
          source_url,
          tags,
          difficulty,
          status,
          updated_at
        `)
        .eq('question_type', 'practice')
        .not('exam_authority', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(300);

      if (error) throw error;

      setRecent((data || []) as StoredQuestion[]);
    } catch (error) {
      setMessage(
        `Unable to load questions: ${describeError(error)}`
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRecent();
  }, []);

  async function findDuplicate(
    exceptId: string | null
  ): Promise<string | null> {
    if (!supabase) {
      throw new Error('Supabase is not configured.');
    }

    const normalized = normalizeQuestion(question);

    for (
      let start = 0;
      ;
      start += PAGE_SIZE
    ) {
      const { data, error } = await supabase
        .from('mains_questions')
        .select('id, question')
        .order('id', { ascending: true })
        .range(start, start + PAGE_SIZE - 1);

      if (error) throw error;

      const rows = data || [];

      const found = rows.find(row =>
        row.id !== exceptId &&
        normalizeQuestion(row.question) === normalized
      );

      if (found) {
        return found.id as string;
      }

      if (rows.length < PAGE_SIZE) {
        return null;
      }
    }
  }

  async function save(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) return;

    if (!supabase) {
      setMessage('Supabase is not configured.');
      return;
    }

    if (
      !resolvedAuthority ||
      !examName.trim() ||
      (scope === 'state_psc' && !stateName.trim())
    ) {
      setMessage(
        'Enter authority, examination name and State for PSC.'
      );
      return;
    }

    if (!paperName.trim() || !question.trim()) {
      setMessage(
        'Paper Name and Question are required.'
      );
      return;
    }

    if (
      section === 'optional' &&
      !optionalSubject.trim()
    ) {
      setMessage(
        'Enter the Optional / Specialised Subject.'
      );
      return;
    }

    const resolvedSubject =
      subject.trim() ||
      (section === 'essay'
        ? 'Essay'
        : section === 'optional'
          ? optionalSubject.trim()
          : section === 'language'
            ? paperName.trim()
            : '');

    if (!resolvedSubject) {
      setMessage(
        'Enter Subject / Syllabus Area.'
      );
      return;
    }

    const parsedMarks = positiveNumber(marks);
    const parsedWordLimit = positiveNumber(wordLimit);

    if (
      (marks.trim() && parsedMarks === null) ||
      (
        wordLimit.trim() &&
        (
          parsedWordLimit === null ||
          !Number.isInteger(parsedWordLimit)
        )
      )
    ) {
      setMessage(
        'Marks must be positive and Word Limit must be a positive integer.'
      );
      return;
    }

    setSaving(true);
    setMessage('Checking duplicate questions...');

    try {
      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error(
          'Sign in using an editor/admin account.'
        );
      }

      const duplicateId =
        await findDuplicate(editingId);

      if (duplicateId) {
        setMessage(
          'Duplicate blocked. This question already exists in the Mains question bank.'
        );
        return;
      }

      const finalTags = Array.from(
        new Set(
          [
            resolvedAuthority,
            examName.trim(),
            ...(scope === 'state_psc'
              ? [stateName.trim()]
              : []),
            ...tagsText
              .split(',')
              .map(tag => tag.trim())
          ].filter(Boolean)
        )
      );

      const payload = {
        question: question.trim(),
        question_type: 'practice' as const,
        section_type: section,
        exam_authority: resolvedAuthority,
        exam_name: examName.trim(),

        state_name:
          scope === 'state_psc'
            ? stateName.trim()
            : null,

        paper_name: paperName.trim(),

        gs_paper:
          section === 'gs'
            ? gsPaper.trim() || null
            : null,

        optional_subject:
          section === 'optional'
            ? optionalSubject.trim()
            : null,

        optional_paper:
          section === 'optional'
            ? optionalPaper.trim() || null
            : null,

        subject: resolvedSubject,
        topic: topic.trim() || null,
        syllabus_link: syllabusLink.trim() || null,
        directive: directive.trim() || null,
        marks: parsedMarks,
        word_limit: parsedWordLimit,
        pyq_year: null,

        answer_framework:
          answerFramework.trim() || null,

        key_points:
          keyPoints.trim() || null,

        introduction_hint:
          introductionHint.trim() || null,

        conclusion_hint:
          conclusionHint.trim() || null,

        source:
          `${resolvedAuthority} • ${examName.trim()}`,

        source_url:
          sourceUrl.trim() || null,

        tags: finalTags,
        difficulty,
        status
      };

      const result = editingId
        ? await supabase
            .from('mains_questions')
            .update(payload)
            .eq('id', editingId)
            .select('id')
            .single()
        : await supabase
            .from('mains_questions')
            .insert({
              ...payload,
              created_by: user.id
            })
            .select('id')
            .single();

      if (result.error) {
        throw result.error;
      }

      const wasEditing = Boolean(editingId);

      clearQuestion();

      await loadRecent();

      setMessage(
        wasEditing
          ? 'Practice question updated successfully.'
          : 'Practice question saved successfully.'
      );
    } catch (error) {
      setMessage(
        `Save failed: ${describeError(error)}`
      );
    } finally {
      setSaving(false);
    }
  }

  function edit(item: StoredQuestion) {
    const isUpsc =
      (item.exam_authority || '').toUpperCase() ===
      'UPSC';

    setScope(isUpsc ? 'upsc_other' : 'state_psc');

    setAuthority(
      isUpsc ? '' : item.exam_authority || ''
    );

    setStateName(item.state_name || '');
    setExamName(item.exam_name || '');
    setEditingId(item.id);
    setSection(item.section_type);
    setPaperName(item.paper_name || '');
    setGsPaper(item.gs_paper || '');
    setOptionalSubject(item.optional_subject || '');
    setOptionalPaper(item.optional_paper || '');
    setSubject(item.subject || '');
    setTopic(item.topic || '');
    setSyllabusLink(item.syllabus_link || '');
    setQuestion(item.question);
    setDirective(item.directive || 'Discuss');

    setMarks(
      item.marks == null
        ? ''
        : String(item.marks)
    );

    setWordLimit(
      item.word_limit == null
        ? ''
        : String(item.word_limit)
    );

    setAnswerFramework(
      item.answer_framework || ''
    );

    setKeyPoints(item.key_points || '');

    setIntroductionHint(
      item.introduction_hint || ''
    );

    setConclusionHint(
      item.conclusion_hint || ''
    );

    setSourceUrl(item.source_url || '');

    const metadataTags = new Set([
      item.exam_authority,
      item.exam_name,
      item.state_name
    ]);

    setTagsText(
      (item.tags || [])
        .filter(tag => !metadataTags.has(tag))
        .join(', ')
    );

    setDifficulty(item.difficulty || 'medium');
    setStatus(item.status || 'draft');

    setMessage('Editing selected practice question.');

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  return (
    <section
      className="panel admin-form"
      style={{ marginTop: 12 }}
    >
      <span className="eyebrow">
        OTHER UPSC &amp; STATE PSC
      </span>

      <h2>
        {editingId
          ? 'Edit Practice Question'
          : 'Create Practice Question'}
      </h2>

      <p
        style={{
          color: '#94a3b8',
          marginTop: 6
        }}
      >
        Use this form for non-CSE UPSC examinations
        and State PSC Mains practice questions.
        These are practice questions, not official
        previous-year questions.
      </p>

      <form onSubmit={save}>
        <div className="form-two">
          <label>
            Exam Source

            <select
              value={scope}
              onChange={event => {
                setScope(
                  event.target.value as ExamScope
                );
                setAuthority('');
                setStateName('');
                setExamName('');
                clearQuestion();
              }}
            >
              <option value="upsc_other">
                Other UPSC Examinations
              </option>

              <option value="state_psc">
                State PSC Examinations
              </option>
            </select>
          </label>

          {scope === 'state_psc' && (
            <label>
              State / UT

              <input
                value={stateName}
                onChange={e =>
                  setStateName(e.target.value)
                }
                placeholder="Maharashtra"
                required
              />
            </label>
          )}

          {scope === 'state_psc' && (
            <label>
              PSC / Commission

              <input
                value={authority}
                onChange={e =>
                  setAuthority(e.target.value)
                }
                placeholder="MPSC / UPPSC / BPSC / RPSC"
                required
              />
            </label>
          )}

          <label>
            Examination Name

            <input
              value={examName}
              onChange={e =>
                setExamName(e.target.value)
              }
              placeholder={
                scope === 'upsc_other'
                  ? 'Engineering Services / Indian Forest Service / CMS'
                  : 'State Services / Combined Competitive Exam'
              }
              required
            />
          </label>

          <label>
            Section / Question Paper Type

            <select
              value={section}
              onChange={e =>
                setSection(
                  e.target.value as SectionType
                )
              }
            >
              <option value="gs">
                General Studies
              </option>

              <option value="essay">
                Essay
              </option>

              <option value="optional">
                Optional / Specialised Subject
              </option>

              <option value="language">
                Language / Compulsory Paper
              </option>

              <option value="other">
                Other Paper
              </option>
            </select>
          </label>

          <label>
            Paper Name

            <input
              value={paperName}
              onChange={e =>
                setPaperName(e.target.value)
              }
              placeholder="General Studies-I / Electrical Engineering / English"
              required
            />
          </label>

          {section === 'gs' && (
            <label>
              GS Paper (optional)

              <input
                value={gsPaper}
                onChange={e =>
                  setGsPaper(e.target.value)
                }
                placeholder="GS-I / General Studies-III"
              />
            </label>
          )}

          {section === 'optional' && (
            <>
              <label>
                Optional / Specialised Subject

                <input
                  value={optionalSubject}
                  onChange={e =>
                    setOptionalSubject(e.target.value)
                  }
                  placeholder="Geography / Electrical Engineering"
                  required
                />
              </label>

              <label>
                Optional Paper

                <input
                  value={optionalPaper}
                  onChange={e =>
                    setOptionalPaper(e.target.value)
                  }
                  placeholder="Paper-I / Paper-II"
                />
              </label>
            </>
          )}
        </div>

        <label>
          Question

          <textarea
            rows={5}
            value={question}
            onChange={e =>
              setQuestion(e.target.value)
            }
            placeholder="Enter the practice Mains question"
            required
          />
        </label>

        <div className="form-two">
          <label>
            Subject / Syllabus Area

            <input
              value={subject}
              onChange={e =>
                setSubject(e.target.value)
              }
              placeholder="History / Governance / Engineering"
            />
          </label>

          <label>
            Topic

            <input
              value={topic}
              onChange={e =>
                setTopic(e.target.value)
              }
              placeholder="Federalism / Machines / Agriculture"
            />
          </label>
        </div>

        <label>
          Syllabus Linkage

          <textarea
            rows={2}
            value={syllabusLink}
            onChange={e =>
              setSyllabusLink(e.target.value)
            }
            placeholder="Exam syllabus topic covered"
          />
        </label>

        <div className="form-two">
          <label>
            Directive

            <input
              value={directive}
              onChange={e =>
                setDirective(e.target.value)
              }
              placeholder="Discuss / Examine / Evaluate"
            />
          </label>

          <label>
            Marks

            <input
              type="number"
              min="1"
              value={marks}
              onChange={e =>
                setMarks(e.target.value)
              }
            />
          </label>

          <label>
            Word Limit

            <input
              type="number"
              min="1"
              value={wordLimit}
              onChange={e =>
                setWordLimit(e.target.value)
              }
            />
          </label>

          <label>
            Difficulty

            <select
              value={difficulty}
              onChange={e =>
                setDifficulty(
                  e.target.value as Difficulty
                )
              }
            >
              <option value="easy">
                Easy
              </option>

              <option value="medium">
                Medium
              </option>

              <option value="hard">
                Hard
              </option>
            </select>
          </label>

          <label>
            Status

            <select
              value={status}
              onChange={e =>
                setStatus(
                  e.target.value as QuestionStatus
                )
              }
            >
              <option value="draft">
                Draft
              </option>

              <option value="published">
                Published
              </option>

              <option value="archived">
                Archived
              </option>
            </select>
          </label>
        </div>

        <label>
          Answer Framework

          <textarea
            rows={4}
            value={answerFramework}
            onChange={e =>
              setAnswerFramework(e.target.value)
            }
          />
        </label>

        <label>
          Key Points

          <textarea
            rows={3}
            value={keyPoints}
            onChange={e =>
              setKeyPoints(e.target.value)
            }
          />
        </label>

        <div className="form-two">
          <label>
            Introduction Hint

            <textarea
              rows={3}
              value={introductionHint}
              onChange={e =>
                setIntroductionHint(e.target.value)
              }
            />
          </label>

          <label>
            Conclusion Hint

            <textarea
              rows={3}
              value={conclusionHint}
              onChange={e =>
                setConclusionHint(e.target.value)
              }
            />
          </label>

          <label>
            Reference URL (optional)

            <input
              type="url"
              value={sourceUrl}
              onChange={e =>
                setSourceUrl(e.target.value)
              }
              placeholder="https://..."
            />
          </label>

          <label>
            Tags (comma-separated)

            <input
              value={tagsText}
              onChange={e =>
                setTagsText(e.target.value)
              }
              placeholder="Governance, Essay, Science"
            />
          </label>
        </div>

        {message && (
          <p
            role="status"
            style={{
              whiteSpace: 'pre-wrap',
              color: '#5eead4'
            }}
          >
            {message}
          </p>
        )}

        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap'
          }}
        >
          <button
            type="submit"
            className="primary-btn"
            disabled={saving}
          >
            {saving
              ? 'Saving...'
              : editingId
                ? 'Update Practice Question'
                : 'Save Practice Question'}
          </button>

          <button
            type="button"
            className="secondary-btn"
            disabled={saving}
            onClick={clearQuestion}
          >
            Clear / Cancel Edit
          </button>
        </div>
      </form>

      <hr
        style={{
          borderColor: '#334155',
          margin: '26px 0'
        }}
      />

      <h3>Recently Saved Questions</h3>

      <label>
        Search Questions

        <input
          value={search}
          onChange={e =>
            setSearch(e.target.value)
          }
          placeholder="Search exam, paper, topic or question"
        />
      </label>

      {loading && (
        <p>Loading...</p>
      )}

      {!loading && shown.length === 0 && (
        <p>
          No matching questions in the most recent
          300 entries.
        </p>
      )}

      {shown.map(item => (
        <article
          key={item.id}
          style={{
            border: '1px solid #334155',
            padding: 14,
            marginTop: 10,
            borderRadius: 12
          }}
        >
          <strong>
            {[
              item.exam_authority,
              item.exam_name,
              item.paper_name
            ]
              .filter(Boolean)
              .join(' • ')}
          </strong>

          <p
            style={{
              whiteSpace: 'pre-wrap'
            }}
          >
            {item.question}
          </p>

          <small>
            {item.status} • {item.subject}
          </small>

          <div style={{ marginTop: 10 }}>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => edit(item)}
            >
              Edit Question
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}

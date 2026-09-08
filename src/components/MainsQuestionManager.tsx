import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { supabase } from '../lib/supabase';

type QuestionStatus =
  | 'draft'
  | 'published'
  | 'archived';

type QuestionType =
  | 'practice'
  | 'pyq';

type SectionType =
  | 'gs'
  | 'optional';

type Difficulty =
  | 'easy'
  | 'medium'
  | 'hard';

type MainsQuestion = {
  id: string;
  question: string;

  question_type: QuestionType;
  section_type: SectionType;

  gs_paper: string | null;

  optional_subject: string | null;
  optional_paper: string | null;

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

  source: string | null;
  source_url: string | null;

  tags: string[];

  difficulty: Difficulty;
  status: QuestionStatus;

  created_at: string;
  updated_at: string;
};

const MAINS_SELECT = `
  id,
  question,
  question_type,
  section_type,
  gs_paper,
  optional_subject,
  optional_paper,
  subject,
  topic,
  syllabus_link,
  directive,
  marks,
  word_limit,
  pyq_year,
  answer_framework,
  key_points,
  introduction_hint,
  conclusion_hint,
  source,
  source_url,
  tags,
  difficulty,
  status,
  created_at,
  updated_at
`;

const optionalSubjects = [
  'Agriculture',
  'Animal Husbandry & Veterinary Science',
  'Anthropology',
  'Botany',
  'Chemistry',
  'Civil Engineering',
  'Commerce & Accountancy',
  'Economics',
  'Electrical Engineering',
  'Geography',
  'Geology',
  'History',
  'Law',
  'Management',
  'Mathematics',
  'Mechanical Engineering',
  'Medical Science',
  'Philosophy',
  'Physics',
  'Political Science & International Relations',
  'Psychology',
  'Public Administration',
  'Sociology',
  'Statistics',
  'Zoology',

  'Assamese Literature',
  'Bengali Literature',
  'Bodo Literature',
  'Dogri Literature',
  'English Literature',
  'Gujarati Literature',
  'Hindi Literature',
  'Kannada Literature',
  'Kashmiri Literature',
  'Konkani Literature',
  'Maithili Literature',
  'Malayalam Literature',
  'Manipuri Literature',
  'Marathi Literature',
  'Nepali Literature',
  'Odia Literature',
  'Punjabi Literature',
  'Sanskrit Literature',
  'Santhali Literature',
  'Sindhi Literature',
  'Tamil Literature',
  'Telugu Literature',
  'Urdu Literature'
];

export function MainsQuestionManager() {
  const [questions, setQuestions] =
    useState<MainsQuestion[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState('');

  const [sectionType, setSectionType] =
    useState<SectionType>('gs');

  const [questionType, setQuestionType] =
    useState<QuestionType>('practice');

  const [question, setQuestion] =
    useState('');

  const [gsPaper, setGsPaper] =
    useState('GS-I');

  const [
    optionalSubject,
    setOptionalSubject
  ] = useState('Geography');

  const [
    optionalPaper,
    setOptionalPaper
  ] = useState('Paper-I');

  const [subject, setSubject] =
    useState('Indian Heritage & Culture');

  const [topic, setTopic] =
    useState('');

  const [
    syllabusLink,
    setSyllabusLink
  ] = useState('');

  const [directive, setDirective] =
    useState('Discuss');

  const [marks, setMarks] =
    useState('10');

  const [wordLimit, setWordLimit] =
    useState('150');

  const [pyqYear, setPyqYear] =
    useState('');

  const [
    answerFramework,
    setAnswerFramework
  ] = useState('');

  const [keyPoints, setKeyPoints] =
    useState('');

  const [
    introductionHint,
    setIntroductionHint
  ] = useState('');

  const [
    conclusionHint,
    setConclusionHint
  ] = useState('');

  const [source, setSource] =
    useState('');

  const [sourceUrl, setSourceUrl] =
    useState('');

  const [tagsText, setTagsText] =
    useState('');

  const [difficulty, setDifficulty] =
    useState<Difficulty>('medium');

  const [status, setStatus] =
    useState<QuestionStatus>('draft');
  const [
  searchText,
  setSearchText
] =
  useState('');


const [
  bankSection,
  setBankSection
] =
  useState<
    'all' |
    SectionType
  >('all');


const [
  bankQuestionType,
  setBankQuestionType
] =
  useState<
    'all' |
    QuestionType
  >('all');


const [
  bankStatus,
  setBankStatus
] =
  useState<
    'all' |
    QuestionStatus
  >('all');


const [
  bankDifficulty,
  setBankDifficulty
] =
  useState<
    'all' |
    Difficulty
  >('all');


const [
  bankGsPaper,
  setBankGsPaper
] =
  useState('all');


const [
  bankOptionalSubject,
  setBankOptionalSubject
] =
  useState('all');

  async function loadQuestions() {
    if (!supabase) {
      setMessage(
        'Supabase is not configured.'
      );
      return;
    }

    setLoading(true);

    const { data, error } =
      await supabase
        .from('mains_questions')
        .select(MAINS_SELECT)
        .order(
          'created_at',
          { ascending: false }
        );

    if (error) {
      console.error(
        'Unable to load Mains questions:',
        error
      );

      setMessage(error.message);
      setLoading(false);

      return;
    }

    setQuestions(
      ((data || []).map(item => ({
        ...item,
        tags: item.tags || []
      })) as MainsQuestion[])
    );

    setLoading(false);
  }

  useEffect(() => {
    loadQuestions();
  }, []);

  function resetForm() {
    setEditingId(null);

    setSectionType('gs');
    setQuestionType('practice');

    setQuestion('');

    setGsPaper('GS-I');

    setOptionalSubject(
      'Geography'
    );

    setOptionalPaper(
      'Paper-I'
    );

    setSubject(
      'Indian Heritage & Culture'
    );

    setTopic('');
    setSyllabusLink('');

    setDirective('Discuss');

    setMarks('10');
    setWordLimit('150');

    setPyqYear('');

    setAnswerFramework('');
    setKeyPoints('');
    setIntroductionHint('');
    setConclusionHint('');

    setSource('');
    setSourceUrl('');

    setTagsText('');

    setDifficulty('medium');
    setStatus('draft');
  }

  function startEdit(
    item: MainsQuestion
  ) {
    setEditingId(item.id);

    setQuestion(item.question);

    setQuestionType(
      item.question_type
    );

    setSectionType(
      item.section_type
    );

    setGsPaper(
      item.gs_paper || 'GS-I'
    );

    setOptionalSubject(
      item.optional_subject ||
        'Geography'
    );

    setOptionalPaper(
      item.optional_paper ||
        'Paper-I'
    );

    setSubject(item.subject);

    setTopic(
      item.topic || ''
    );

    setSyllabusLink(
      item.syllabus_link || ''
    );

    setDirective(
      item.directive || ''
    );

    setMarks(
      item.marks
        ? String(item.marks)
        : ''
    );

    setWordLimit(
      item.word_limit
        ? String(item.word_limit)
        : ''
    );

    setPyqYear(
      item.pyq_year
        ? String(item.pyq_year)
        : ''
    );

    setAnswerFramework(
      item.answer_framework || ''
    );

    setKeyPoints(
      item.key_points || ''
    );

    setIntroductionHint(
      item.introduction_hint || ''
    );

    setConclusionHint(
      item.conclusion_hint || ''
    );

    setSource(
      item.source || ''
    );

    setSourceUrl(
      item.source_url || ''
    );

    setTagsText(
      (item.tags || [])
        .join(', ')
    );

    setDifficulty(
      item.difficulty
    );

    setStatus(
      item.status
    );

    setMessage(
      'Editing Mains question.'
    );

    const mainArea =
      document.querySelector(
        '.main-area'
      );

    if (mainArea) {
      mainArea.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }

  async function saveQuestion(
    e: FormEvent
  ) {
    e.preventDefault();

    if (!supabase) {
      setMessage(
        'Supabase is not configured.'
      );
      return;
    }

    if (!question.trim()) {
      setMessage(
        'Enter the Mains question.'
      );
      return;
    }

    if (!subject.trim()) {
      setMessage(
        'Enter the subject.'
      );
      return;
    }

    if (
      questionType === 'pyq' &&
      !pyqYear.trim()
    ) {
      setMessage(
        'Previous Year Question requires a year.'
      );
      return;
    }

    if (
      sectionType === 'optional' &&
      !optionalSubject
    ) {
      setMessage(
        'Select the Optional Subject.'
      );
      return;
    }

    setSaving(true);

    setMessage(
      editingId
        ? 'Updating Mains question...'
        : 'Saving Mains question...'
    );

    const {
      data: { user }
    } =
      await supabase.auth.getUser();

    if (!user) {
      setSaving(false);

      setMessage(
        'Admin session expired. Sign in again.'
      );

      return;
    }

    const tags =
      tagsText
        .split(',')
        .map(
          tag => tag.trim()
        )
        .filter(Boolean);

    const payload = {
      question:
        question.trim(),

      question_type:
        questionType,

      section_type:
        sectionType,

      gs_paper:
        sectionType === 'gs'
          ? gsPaper
          : null,

      optional_subject:
        sectionType === 'optional'
          ? optionalSubject
          : null,

      optional_paper:
        sectionType === 'optional'
          ? optionalPaper
          : null,

      subject:
        subject.trim(),

      topic:
        topic.trim() ||
        null,

      syllabus_link:
        syllabusLink.trim() ||
        null,

      directive:
        directive.trim() ||
        null,

      marks:
        marks.trim()
          ? Number(marks)
          : null,

      word_limit:
        wordLimit.trim()
          ? Number(wordLimit)
          : null,

      pyq_year:
        questionType === 'pyq' &&
        pyqYear.trim()
          ? Number(pyqYear)
          : null,

      answer_framework:
        answerFramework.trim() ||
        null,

      key_points:
        keyPoints.trim() ||
        null,

      introduction_hint:
        introductionHint.trim() ||
        null,

      conclusion_hint:
        conclusionHint.trim() ||
        null,

      source:
        source.trim() ||
        null,

      source_url:
        sourceUrl.trim() ||
        null,

      tags,

      difficulty,

      status,

      updated_at:
        new Date().toISOString()
    };

    if (editingId) {
      const { data, error } =
        await supabase
          .from('mains_questions')
          .update(payload)
          .eq(
            'id',
            editingId
          )
          .select(
            MAINS_SELECT
          )
          .single();

      if (
        error ||
        !data
      ) {
        console.error(
          'Mains update failed:',
          error
        );

        setMessage(
          error?.message ||
            'Mains question update failed.'
        );

        setSaving(false);
        return;
      }

      const updated = {
        ...data,
        tags: data.tags || []
      } as MainsQuestion;

      setQuestions(
        current =>
          current.map(
            item =>
              item.id ===
              updated.id
                ? updated
                : item
          )
      );

      setSaving(false);
      resetForm();

      setMessage(
        'Mains question updated successfully.'
      );

      return;
    }

    const { data, error } =
      await supabase
        .from('mains_questions')
        .insert({
          ...payload,

          created_by:
            user.id
        })
        .select(
          MAINS_SELECT
        )
        .single();

    if (
      error ||
      !data
    ) {
      console.error(
        'Mains question creation failed:',
        error
      );

      setMessage(
        error?.message ||
          'Unable to save Mains question.'
      );

      setSaving(false);
      return;
    }

    const created = {
      ...data,
      tags: data.tags || []
    } as MainsQuestion;

    setQuestions(
      current => [
        created,
        ...current
      ]
    );

    setSaving(false);
    resetForm();

    setMessage(
      created.status ===
        'published'
        ? 'Mains question published successfully.'
        : 'Mains question saved as draft.'
    );
  }

  async function changeStatus(
    item: MainsQuestion,
    nextStatus: QuestionStatus
  ) {
    if (!supabase) return;

    const { data, error } =
      await supabase
        .from('mains_questions')
        .update({
          status:
            nextStatus,

          updated_at:
            new Date().toISOString()
        })
        .eq(
          'id',
          item.id
        )
        .select(
          MAINS_SELECT
        )
        .single();

    if (
      error ||
      !data
    ) {
      setMessage(
        error?.message ||
          'Unable to change status.'
      );

      return;
    }

    const updated = {
      ...data,
      tags: data.tags || []
    } as MainsQuestion;

    setQuestions(
      current =>
        current.map(
          questionItem =>
            questionItem.id ===
            updated.id
              ? updated
              : questionItem
        )
    );

    setMessage(
      `Mains question changed to ${nextStatus}.`
    );
  }

  async function deleteQuestion(
    item: MainsQuestion
  ) {
    if (!supabase) return;

    const confirmed =
      window.confirm(
        'Delete this Mains question permanently?'
      );

    if (!confirmed) return;

    const { error } =
      await supabase
        .from('mains_questions')
        .delete()
        .eq(
          'id',
          item.id
        );

    if (error) {
      setMessage(
        error.message
      );
      return;
    }

    setQuestions(
      current =>
        current.filter(
          questionItem =>
            questionItem.id !==
            item.id
        )
    );

    if (
      editingId ===
      item.id
    ) {
      resetForm();
    }

    setMessage(
      'Mains question deleted.'
    );
  }

  return (
    <section
      style={{
        marginTop: '30px'
      }}
    >
      <div
        className="panel admin-form"
      >
        <span className="eyebrow">
          MAINS QUESTION MANAGER
        </span>

        <h2>
          {editingId
            ? 'Edit Mains Question'
            : 'Create Mains Question'}
        </h2>

        <form
          onSubmit={
            saveQuestion
          }
        >
          <div className="form-two">
            <label>
              Section

              <select
                value={sectionType}
                onChange={
                  e =>
                    setSectionType(
                      e.target
                        .value as SectionType
                    )
                }
              >
                <option value="gs">
                  General Studies
                </option>

                <option value="optional">
                  Optional Subject
                </option>
              </select>
            </label>

            <label>
              Question Type

              <select
                value={questionType}
                onChange={
                  e =>
                    setQuestionType(
                      e.target
                        .value as QuestionType
                    )
                }
              >
                <option value="practice">
                  Practice Question
                </option>

                <option value="pyq">
                  Previous Year Question
                </option>
              </select>
            </label>
          </div>

          {sectionType === 'gs' && (
            <label>
              GS Paper

              <select
                value={gsPaper}
                onChange={
                  e =>
                    setGsPaper(
                      e.target.value
                    )
                }
              >
                <option value="GS-I">
                  GS-I
                </option>

                <option value="GS-II">
                  GS-II
                </option>

                <option value="GS-III">
                  GS-III
                </option>

                <option value="GS-IV">
                  GS-IV
                </option>
              </select>
            </label>
          )}

          {sectionType ===
            'optional' && (
            <div className="form-two">
              <label>
                Optional Subject

                <select
                  value={
                    optionalSubject
                  }
                  onChange={
                    e =>
                      setOptionalSubject(
                        e.target.value
                      )
                  }
                >
                  {optionalSubjects.map(
                    item => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                Optional Paper

                <select
                  value={
                    optionalPaper
                  }
                  onChange={
                    e =>
                      setOptionalPaper(
                        e.target.value
                      )
                  }
                >
                  <option value="Paper-I">
                    Paper-I
                  </option>

                  <option value="Paper-II">
                    Paper-II
                  </option>
                </select>
              </label>
            </div>
          )}

          {questionType ===
            'pyq' && (
            <label>
              Previous Year

              <input
                type="number"
                min="1979"
                max="2100"
                value={pyqYear}
                onChange={
                  e =>
                    setPyqYear(
                      e.target.value
                    )
                }
                placeholder="2025"
              />
            </label>
          )}

          <label>
            Question

            <textarea
              rows={5}
              value={question}
              onChange={
                e =>
                  setQuestion(
                    e.target.value
                  )
              }
              placeholder="Enter UPSC Mains question"
            />
          </label>

          <div className="form-two">
            <label>
              Subject / Syllabus Area

              <input
                value={subject}
                onChange={
                  e =>
                    setSubject(
                      e.target.value
                    )
                }
                placeholder="Indian Society / Governance / Economy..."
              />
            </label>

            <label>
              Topic

              <input
                value={topic}
                onChange={
                  e =>
                    setTopic(
                      e.target.value
                    )
                }
                placeholder="Federalism / Agriculture / Ethics..."
              />
            </label>
          </div>

          <label>
            UPSC Syllabus Linkage

            <textarea
              rows={3}
              value={syllabusLink}
              onChange={
                e =>
                  setSyllabusLink(
                    e.target.value
                  )
              }
              placeholder="Mention the exact syllabus linkage."
            />
          </label>

          <label>
            Directive

            <select
              value={directive}
              onChange={
                e =>
                  setDirective(
                    e.target.value
                  )
              }
            >
              <option>
                Discuss
              </option>

              <option>
                Examine
              </option>

              <option>
                Analyse
              </option>

              <option>
                Critically Analyse
              </option>

              <option>
                Critically Examine
              </option>

              <option>
                Evaluate
              </option>

              <option>
                Comment
              </option>

              <option>
                Explain
              </option>

              <option>
                Elucidate
              </option>

              <option>
                Justify
              </option>

              <option>
                Assess
              </option>
            </select>
          </label>

          <div className="form-two">
            <label>
              Marks

              <select
                value={marks}
                onChange={
                  e =>
                    setMarks(
                      e.target.value
                    )
                }
              >
                <option value="10">
                  10 Marks
                </option>

                <option value="15">
                  15 Marks
                </option>

                <option value="20">
                  20 Marks
                </option>
              </select>
            </label>

            <label>
              Word Limit

              <select
                value={wordLimit}
                onChange={
                  e =>
                    setWordLimit(
                      e.target.value
                    )
                }
              >
                <option value="150">
                  150 Words
                </option>

                <option value="250">
                  250 Words
                </option>

                <option value="300">
                  300 Words
                </option>

                <option value="400">
                  400 Words
                </option>
              </select>
            </label>
          </div>

          <label>
            Answer Framework

            <textarea
              rows={6}
              value={
                answerFramework
              }
              onChange={
                e =>
                  setAnswerFramework(
                    e.target.value
                  )
              }
              placeholder="Suggested structure: Introduction → Main Body → Conclusion"
            />
          </label>

          <label>
            Key Points

            <textarea
              rows={6}
              value={keyPoints}
              onChange={
                e =>
                  setKeyPoints(
                    e.target.value
                  )
              }
              placeholder="Important arguments, facts, examples, committees, judgments or reports."
            />
          </label>

          <label>
            Introduction Hint

            <textarea
              rows={3}
              value={
                introductionHint
              }
              onChange={
                e =>
                  setIntroductionHint(
                    e.target.value
                  )
              }
              placeholder="How a strong answer may begin."
            />
          </label>

          <label>
            Conclusion Hint

            <textarea
              rows={3}
              value={
                conclusionHint
              }
              onChange={
                e =>
                  setConclusionHint(
                    e.target.value
                  )
              }
              placeholder="Balanced conclusion or way forward."
            />
          </label>

          <label>
            Tags

            <input
              value={tagsText}
              onChange={
                e =>
                  setTagsText(
                    e.target.value
                  )
              }
              placeholder="GS-II, Federalism, Constitution"
            />

            <small>
              Separate tags using commas.
            </small>
          </label>

          <div className="form-two">
            <label>
              Source

              <input
                value={source}
                onChange={
                  e =>
                    setSource(
                      e.target.value
                    )
                }
                placeholder="UPSC / PIB / NCERT / ARC..."
              />
            </label>

            <label>
              Source URL

              <input
                type="url"
                value={sourceUrl}
                onChange={
                  e =>
                    setSourceUrl(
                      e.target.value
                    )
                }
                placeholder="https://..."
              />
            </label>
          </div>

          <div className="form-two">
            <label>
              Difficulty

              <select
                value={difficulty}
                onChange={
                  e =>
                    setDifficulty(
                      e.target
                        .value as Difficulty
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
                onChange={
                  e =>
                    setStatus(
                      e.target
                        .value as QuestionStatus
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

          <div
            style={{
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap',
              marginTop: '16px'
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
                ? 'Save changes'
                : status ===
                    'published'
                ? 'Publish question'
                : 'Save draft'}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
              >
                Cancel edit
              </button>
            )}
          </div>

          {message && (
            <p className="form-message">
              {message}
            </p>
          )}
        </form>
      </div>

      <div
        className="panel"
        style={{
          marginTop: '22px'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems:
              'center',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <div>
            <span className="eyebrow">
              MAINS QUESTION BANK
            </span>

            <h2>
              Existing Mains Questions
            </h2>
          </div>

          <button
            type="button"
            onClick={loadQuestions}
          >
            Refresh questions
          </button>
        </div>

        {loading && (
          <p>
            Loading Mains questions...
          </p>
        )}

        {!loading &&
          questions.length === 0 && (
            <p>
              No Mains questions created yet.
            </p>
          )}

        <div
          style={{
            display: 'grid',
            gap: '14px',
            marginTop: '18px'
          }}
        >
          {questions.map(
            item => (
              <article
                key={item.id}
                style={{
                  border:
                    '1px solid rgba(255,255,255,.10)',
                  borderRadius:
                    '14px',
                  padding: '18px'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    gap: '18px',
                    flexWrap: 'wrap'
                  }}
                >
                  <div
                    style={{
                      flex: '1 1 500px'
                    }}
                  >
                    <span className="eyebrow">
                      {item.section_type ===
                      'gs'
                        ? item.gs_paper
                        : `${item.optional_subject} • ${item.optional_paper}`}
                    </span>

                    <h3>
                      {item.question}
                    </h3>

                    <p>
                      {item.question_type ===
                      'pyq'
                        ? `PYQ ${item.pyq_year || ''}`
                        : 'Practice Question'}
                    </p>

                    <p>
                      {item.marks
                        ? `${item.marks} marks`
                        : ''}

                      {item.word_limit
                        ? ` • ${item.word_limit} words`
                        : ''}
                    </p>

                    <p>
                      Status:{' '}
                      <strong>
                        {item.status}
                      </strong>
                    </p>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      flexWrap: 'wrap',
                      alignItems:
                        'flex-start'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        startEdit(item)
                      }
                    >
                      Edit
                    </button>

                    {item.status !==
                      'published' && (
                      <button
                        type="button"
                        onClick={() =>
                          changeStatus(
                            item,
                            'published'
                          )
                        }
                      >
                        Publish
                      </button>
                    )}

                    {item.status !==
                      'draft' && (
                      <button
                        type="button"
                        onClick={() =>
                          changeStatus(
                            item,
                            'draft'
                          )
                        }
                      >
                        Draft
                      </button>
                    )}

                    {item.status !==
                      'archived' && (
                      <button
                        type="button"
                        onClick={() =>
                          changeStatus(
                            item,
                            'archived'
                          )
                        }
                      >
                        Archive
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        deleteQuestion(
                          item
                        )
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            )
          )}
        </div>
      </div>
    </section>
  );
}

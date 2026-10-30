import { useEffect, useMemo, useState } from 'react';
import { TopBar } from '../components/TopBar';
import { MathText } from '../components/MathText';
import { supabase } from '../lib/supabase';
import { PRELIMS_SUBJECTS } from '../lib/prelimsSubjects';

type Difficulty = 'easy' | 'medium' | 'hard';
type SessionMode = 'practice' | 'exam';
type SessionSize = '10' | '20' | '50' | '100' | 'all';

type PracticeQuestion = {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  subject: string;
  topic: string | null;
  difficulty: Difficulty;
  paper: string | null;
  tags: string[];
  source: string | null;
  source_url: string | null;
  is_pyq: boolean;
};

type ExamResult = {
  correct: number;
  incorrect: number;
  unanswered: number;
  marks: number;
  maxMarks: number;
};

const MARKS_PER_QUESTION = 2;
const NEGATIVE_MARK = MARKS_PER_QUESTION / 3;

function cleanText(value: unknown): string {
  return String(value ?? '').replace(/\r\n?/g, '\n').trim();
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function toDifficulty(value: unknown): Difficulty {
  if (value === 'easy' || value === 'hard') return value;
  return 'medium';
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));

    [copy[i], copy[j]] = [
      copy[j],
      copy[i]
    ];
  }

  return copy;
}

function ReadableMathText({
  text,
  className
}: {
  text: unknown;
  className?: string;
}) {
  const value = cleanText(text);

  if (!value) {
    return null;
  }

  return (
    <div
      className={className}
      style={{
        width: '100%',
        minWidth: 0,
        whiteSpace: 'pre-wrap',
        wordBreak: 'normal',
        overflowWrap: 'break-word',
        lineHeight: 1.75
      }}
    >
      <MathText text={value} />
    </div>
  );
}

export function PracticePage() {
  const [questions, setQuestions] =
    useState<PracticeQuestion[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState('');

  const [searchText, setSearchText] =
    useState('');

  const [subject, setSubject] =
    useState('all');

  const [topic, setTopic] =
    useState('all');

  const [difficulty, setDifficulty] =
    useState<'all' | Difficulty>('all');

  const [questionType, setQuestionType] =
    useState<'all' | 'practice' | 'pyq'>('all');

  const [sessionMode, setSessionMode] =
    useState<SessionMode>('practice');

  const [sessionSize, setSessionSize] =
    useState<SessionSize>('10');

  const [sessionQuestions, setSessionQuestions] =
    useState<PracticeQuestion[]>([]);

  const [currentIndex, setCurrentIndex] =
    useState(0);

  const [
    selectedPracticeOption,
    setSelectedPracticeOption
  ] = useState<number | null>(null);

  const [examAnswers, setExamAnswers] =
    useState<Record<string, number>>({});

  const [practiceScore, setPracticeScore] =
    useState(0);

  const [finished, setFinished] =
    useState(false);

  const [examResult, setExamResult] =
    useState<ExamResult | null>(null);

  async function loadQuestions() {
    if (!supabase) {
      setQuestions([]);

      setErrorMessage(
        'Supabase is not configured.'
      );

      setLoading(false);

      return;
    }

    setLoading(true);
    setErrorMessage('');

    const {
      data,
      error
    } = await supabase.rpc(
      'get_canonical_prelims_questions'
    );

    if (error) {
      console.error(
        'Unable to load Prelims questions:',
        error
      );

      setQuestions([]);

      setErrorMessage(
        error.message ||
        'Unable to load Prelims questions.'
      );

      setLoading(false);

      return;
    }

    const rows =
      Array.isArray(data)
        ? data
        : [];

    const normalized: PracticeQuestion[] =
      rows
        .map((raw) => {
          const item =
            raw as Record<string, unknown>;

          return {
            id:
              cleanText(
                item.id
              ),

            question:
              cleanText(
                item.question
              ),

            options:
              toStringArray(
                item.options
              ),

            correct_index:
              Number.isFinite(
                Number(
                  item.correct_index
                )
              )
                ? Number(
                    item.correct_index
                  )
                : 0,

            explanation:
              cleanText(
                item.explanation
              ),

            subject:
              cleanText(
                item.subject
              ) ||
              'General Studies',

            topic:
              cleanText(
                item.topic
              ) ||
              null,

            difficulty:
              toDifficulty(
                item.difficulty
              ),

            paper:
              cleanText(
                item.paper
              ) ||
              null,

            tags:
              toStringArray(
                item.tags
              ),

            source:
              cleanText(
                item.source
              ) ||
              null,

            source_url:
              cleanText(
                item.source_url
              ) ||
              null,

            is_pyq:
              Boolean(
                item.is_pyq
              )
          };
        })
        .filter(
          (item) =>
            Boolean(
              item.id &&
              item.question &&
              item.options.length >= 2
            )
        );

    setQuestions(normalized);
    setLoading(false);
  }

  useEffect(() => {
    void loadQuestions();
  }, []);

  const subjects =
    useMemo(
      () => {

        const configuredSubjects:
          string[] =
          [
            ...PRELIMS_SUBJECTS
          ];


        const additionalSubjects =
          Array.from(
            new Set(
              questions
                .map(
                  item =>
                    item.subject
                )
                .filter(
                  item =>
                    Boolean(
                      item
                    )
                )
            )
          )
            .filter(
              item =>
                !configuredSubjects.includes(
                  item
                )
            )
            .sort();


        return [
          ...configuredSubjects,
          ...additionalSubjects
        ];

      },
      [
        questions
      ]
    );

  const topics =
    useMemo(
      () =>
        Array.from(
          new Set(
            questions
              .filter(
                (item) =>
                  subject === 'all' ||
                  item.subject === subject
              )
              .map(
                (item) =>
                  item.topic
              )
              .filter(
                (
                  value
                ): value is string =>
                  Boolean(value)
              )
          )
        ).sort(),
      [
        questions,
        subject
      ]
    );

  const filteredQuestions =
    useMemo(() => {
      const search =
        searchText
          .trim()
          .toLowerCase();

      return questions.filter(
        (item) => {
          const searchable =
            [
              item.question,
              item.subject,
              item.topic || '',
              item.source || '',
              item.tags.join(' ')
            ]
              .join(' ')
              .toLowerCase();

          const matchesSearch =
            !search ||
            searchable.includes(search);

          const matchesSubject =
            subject === 'all' ||
            item.subject === subject;

          const matchesTopic =
            topic === 'all' ||
            item.topic === topic;

          const matchesDifficulty =
            difficulty === 'all' ||
            item.difficulty === difficulty;

          const matchesType =
            questionType === 'all' ||
            (
              questionType === 'pyq' &&
              item.is_pyq
            ) ||
            (
              questionType === 'practice' &&
              !item.is_pyq
            );

          return (
            matchesSearch &&
            matchesSubject &&
            matchesTopic &&
            matchesDifficulty &&
            matchesType
          );
        }
      );
    }, [
      questions,
      searchText,
      subject,
      topic,
      difficulty,
      questionType
    ]);

  const currentQuestion =
    sessionQuestions[
      currentIndex
    ];

  function clearSession() {
    setSessionQuestions([]);
    setCurrentIndex(0);
    setSelectedPracticeOption(null);
    setExamAnswers({});
    setPracticeScore(0);
    setFinished(false);
    setExamResult(null);
  }

  function startSession() {
    if (
      filteredQuestions.length === 0
    ) {
      return;
    }

    const shuffled =
      shuffle(
        filteredQuestions
      );

    const selected =
      sessionSize === 'all'
        ? shuffled
        : shuffled.slice(
            0,
            Number(
              sessionSize
            )
          );

    setSessionQuestions(
      selected
    );

    setCurrentIndex(0);

    setSelectedPracticeOption(
      null
    );

    setExamAnswers({});

    setPracticeScore(0);

    setFinished(false);

    setExamResult(null);
  }

  function selectPracticeOption(
    optionIndex: number
  ) {
    if (
      !currentQuestion ||
      selectedPracticeOption !== null
    ) {
      return;
    }

    setSelectedPracticeOption(
      optionIndex
    );

    if (
      optionIndex ===
      currentQuestion.correct_index
    ) {
      setPracticeScore(
        (value) =>
          value + 1
      );
    }
  }

  function selectExamOption(
    optionIndex: number
  ) {
    if (
      !currentQuestion
    ) {
      return;
    }

    setExamAnswers(
      (current) => ({
        ...current,

        [
          currentQuestion.id
        ]:
          optionIndex
      })
    );
  }

  function submitExam() {
    let correct = 0;
    let incorrect = 0;

    for (
      const question
      of sessionQuestions
    ) {
      const selected =
        examAnswers[
          question.id
        ];

      if (
        typeof selected !==
        'number'
      ) {
        continue;
      }

      if (
        selected ===
        question.correct_index
      ) {
        correct += 1;
      } else {
        incorrect += 1;
      }
    }

    const unanswered =
      sessionQuestions.length -
      correct -
      incorrect;

    const rawMarks =
      correct *
        MARKS_PER_QUESTION -
      incorrect *
        NEGATIVE_MARK;

    setExamResult({
      correct,

      incorrect,

      unanswered,

      marks:
        Math.round(
          rawMarks *
          100
        ) /
        100,

      maxMarks:
        sessionQuestions.length *
        MARKS_PER_QUESTION
    });

    setFinished(true);
  }

  function nextQuestion() {
    if (
      currentIndex >=
      sessionQuestions.length -
        1
    ) {
      if (
        sessionMode ===
        'exam'
      ) {
        submitExam();
      } else {
        setFinished(true);
      }

      return;
    }

    setCurrentIndex(
      (value) =>
        value + 1
    );

    setSelectedPracticeOption(
      null
    );
  }

  if (loading) {
    return (
      <>
        <TopBar
          title="Prelims Practice"
          subtitle="Loading question bank..."
        />

        <div className="page-wrap">
          <section className="panel">
            Loading questions...
          </section>
        </div>
      </>
    );
  }

  if (
    finished &&
    sessionQuestions.length >
      0
  ) {
    return (
      <>
        <TopBar
          title="Session Result"
          subtitle="Prelims practice summary"
        />

        <div className="page-wrap">
          <section
            className="panel"
            style={{
              maxWidth:
                '760px',

              margin:
                '0 auto'
            }}
          >
            {
              sessionMode ===
                'exam' &&
              examResult
                ? (
                  <>
                    <h2>
                      Exam Result
                    </h2>

                    <p>
                      Correct:{' '}
                      <strong>
                        {
                          examResult.correct
                        }
                      </strong>
                    </p>

                    <p>
                      Incorrect:{' '}
                      <strong>
                        {
                          examResult.incorrect
                        }
                      </strong>
                    </p>

                    <p>
                      Unanswered:{' '}
                      <strong>
                        {
                          examResult.unanswered
                        }
                      </strong>
                    </p>

                    <p>
                      Marks:{' '}

                      <strong>
                        {
                          examResult.marks
                        }
                        {' / '}
                        {
                          examResult.maxMarks
                        }
                      </strong>
                    </p>
                  </>
                )
                : (
                  <>
                    <h2>
                      Practice Complete
                    </h2>

                    <p>
                      You answered{' '}

                      <strong>
                        {
                          practiceScore
                        }
                      </strong>

                      {' '}out of{' '}

                      <strong>
                        {
                          sessionQuestions.length
                        }
                      </strong>

                      {' '}questions correctly.
                    </p>
                  </>
                )
            }

            <div
              style={{
                display:
                  'flex',

                gap:
                  '12px',

                flexWrap:
                  'wrap',

                marginTop:
                  '20px'
              }}
            >
              <button
                type="button"
                className="primary-btn"
                onClick={
                  startSession
                }
                disabled={
                  filteredQuestions.length ===
                    0
                }
              >
                Start Again
              </button>

              <button
                type="button"
                className="secondary-btn"
                onClick={
                  clearSession
                }
              >
                Back to Setup
              </button>
            </div>
          </section>
        </div>
      </>
    );
  }

  if (
    currentQuestion &&
    sessionQuestions.length >
      0
  ) {
    const examSelected =
      examAnswers[
        currentQuestion.id
      ];

    return (
      <>
        <TopBar
          title={
            sessionMode ===
              'exam'
              ? 'Prelims Exam Mode'
              : 'Prelims Practice'
          }
          subtitle={
            `Question ${
              currentIndex + 1
            } of ${
              sessionQuestions.length
            }`
          }
        />

        <div
          className="page-wrap"
          style={{
            paddingBottom:
              '110px'
          }}
        >
          <section
            className="panel"
            style={{
              maxWidth:
  '880px',

              margin:
                '0 auto'
            }}
          >
            <div
              style={{
                display:
                  'flex',

                justifyContent:
                  'space-between',

                gap:
                  '12px',

                flexWrap:
                  'wrap'
              }}
            >
              <div>
                <strong>
                  {
                    currentQuestion.subject
                  }
                </strong>

                {
                  currentQuestion.topic &&
                  (
                    <div
                      style={{
                        marginTop:
                          '4px',

                        color:
                          '#94a3b8',

                        fontSize:
                          '.82rem'
                      }}
                    >
                      {
                        currentQuestion.topic
                      }
                    </div>
                  )
                }
              </div>

              <span className="tag">
                {
                  currentQuestion.difficulty
                }
              </span>
            </div>

            <div
  className="practice-question-text"
  style={{
    marginTop:
      '20px',

    marginBottom:
      '18px',

    fontSize:
      '0.98rem',

    fontWeight:
      600,

    lineHeight:
      1.7,

    letterSpacing:
      '-0.005em'
  }}
>
              <ReadableMathText
                text={
                  currentQuestion.question
                }
              />
            </div>

            <div
              style={{
                display:
                  'grid',

                gap:
                  '12px'
              }}
            >
              {
                currentQuestion.options.map(
                  (
                    option,
                    optionIndex
                  ) => {
                    const practiceAnswered =
                      sessionMode ===
                        'practice' &&
                      selectedPracticeOption !==
                        null;

                    const isCorrect =
                      optionIndex ===
                      currentQuestion
                        .correct_index;

                    const isSelected =
                      sessionMode ===
                        'practice'
                        ? selectedPracticeOption ===
                          optionIndex
                        : examSelected ===
                          optionIndex;

                    let border =
                      '1px solid rgba(148,163,184,.22)';

                    let background =
                      'rgba(15,23,42,.72)';

                    if (
                      sessionMode ===
                        'practice' &&
                      practiceAnswered
                    ) {
                      if (
                        isCorrect
                      ) {
                        border =
                          '1px solid rgba(34,197,94,.75)';

                        background =
                          'rgba(34,197,94,.12)';
                      } else if (
                        isSelected
                      ) {
                        border =
                          '1px solid rgba(239,68,68,.75)';

                        background =
                          'rgba(239,68,68,.12)';
                      }
                    } else if (
                      isSelected
                    ) {
                      border =
                        '2px solid rgba(45,212,191,.85)';

                      background =
                        'rgba(20,184,166,.12)';
                    }

                    return (
                      <button
                        key={
                          `${
                            currentQuestion.id
                          }-${
                            optionIndex
                          }`
                        }
                        type="button"
                        className="practice-option-button"
                        onClick={() =>
                          sessionMode ===
                            'practice'
                            ? selectPracticeOption(
                                optionIndex
                              )
                            : selectExamOption(
                                optionIndex
                              )
                        }
                        disabled={
                          sessionMode ===
                            'practice' &&
                          selectedPracticeOption !==
                            null
                        }
                        style={{
                          width:
                            '100%',

                          display:
                            'grid',

                          gridTemplateColumns:
                            '44px minmax(0, 1fr)',

                          alignItems:
                            'start',

                          gap:
                            '14px',

                          border,

                          background,

                          color:
                            '#f8fafc',

                          borderRadius:
                            '14px',

                          padding:
                            '14px',

                          textAlign:
                            'left'
                        }}
                      >
                        <span
                          className="practice-option-badge"
                          style={{
                            width:
                              '38px',

                            height:
                              '38px',

                            display:
                              'grid',

                            placeItems:
                              'center',

                            borderRadius:
                              '10px',

                            background:
                              'rgba(148,163,184,.12)',

                            fontWeight:
                              800
                          }}
                        >
                          {
                            String.fromCharCode(
                              65 +
                              optionIndex
                            )
                          }
                        </span>

                        <div
  className="practice-option-text-wrap"
  style={{
    minWidth:
      0,

    width:
      '100%',

    paddingTop:
      '6px',

    fontSize:
      '0.94rem',

    fontWeight:
      500,

    lineHeight:
      1.6
  }}
>
                          <ReadableMathText
                            text={
                              option
                            }
                            className="practice-option-text"
                          />
                        </div>
                      </button>
                    );
                  }
                )
              }
            </div>

            {
              sessionMode ===
                'practice' &&
              selectedPracticeOption !==
                null &&
              (
                <div
                  style={{
                    marginTop:
                      '22px',

                    padding:
                      '18px',

                    borderRadius:
                      '14px',

                    border:
                      '1px solid rgba(45,212,191,.22)',

                    background:
                      'rgba(15,23,42,.58)'
                  }}
                >
                  <strong>
                    Explanation
                  </strong>

                  <div
                    style={{
                      marginTop:
                        '10px'
                    }}
                  >
                    <ReadableMathText
                      text={
                        currentQuestion.explanation ||
                        'No explanation has been added yet.'
                      }
                      className="practice-explanation-text"
                    />
                  </div>
                </div>
              )
            }

            <div
              style={{
                display:
                  'flex',

                justifyContent:
                  'space-between',

                gap:
                  '12px',

                flexWrap:
                  'wrap',

                marginTop:
                  '22px'
              }}
            >
              <button
                type="button"
                className="secondary-btn"
                onClick={
                  clearSession
                }
              >
                Exit Session
              </button>

              <button
                type="button"
                className="primary-btn"
                onClick={
                  nextQuestion
                }
                disabled={
                  sessionMode ===
                    'practice' &&
                  selectedPracticeOption ===
                    null
                }
              >
                {
                  currentIndex ===
                    sessionQuestions.length -
                      1
                    ? sessionMode ===
                        'exam'
                      ? 'Submit Exam'
                      : 'Finish Practice'
                    : 'Next Question'
                }
              </button>
            </div>
          </section>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar
        title="Prelims Practice"
        subtitle="Clean and readable UPSC-style MCQ practice"
      />

      <div className="page-wrap">
        {
          errorMessage &&
          (
            <section
              className="panel"
              style={{
                border:
                  '1px solid rgba(239,68,68,.35)',

                marginBottom:
                  '16px'
              }}
            >
              <strong>
                Practice data could not be loaded.
              </strong>

              <p>
                {
                  errorMessage
                }
              </p>

              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  void loadQuestions()
                }
              >
                Retry
              </button>
            </section>
          )
        }

        <section className="panel">
          <div
            style={{
              display:
                'flex',

              justifyContent:
                'space-between',

              alignItems:
                'flex-start',

              gap:
                '14px',

              flexWrap:
                'wrap'
            }}
          >
            <div>
              <h2
                style={{
                  margin:
                    0
                }}
              >
                Practice Setup
              </h2>

              <p
                style={{
                  marginBottom:
                    0,

                  color:
                    '#94a3b8'
                }}
              >
                {
                  questions.length ===
                    0
                    ? 'Question bank is empty. Add and publish questions from Admin Studio.'
                    : `${
                        filteredQuestions.length
                      } question${
                        filteredQuestions.length ===
                          1
                          ? ''
                          : 's'
                      } match your filters.`
                }
              </p>
            </div>

            <div
              style={{
                display:
                  'flex',

                gap:
                  '8px',

                flexWrap:
                  'wrap'
              }}
            >
              <button
                type="button"
                className={
                  sessionMode ===
                    'practice'
                    ? 'primary-btn'
                    : 'secondary-btn'
                }
                onClick={() =>
                  setSessionMode(
                    'practice'
                  )
                }
              >
                Practice Mode
              </button>

              <button
                type="button"
                className={
                  sessionMode ===
                    'exam'
                    ? 'primary-btn'
                    : 'secondary-btn'
                }
                onClick={() =>
                  setSessionMode(
                    'exam'
                  )
                }
              >
                Exam Mode
              </button>
            </div>
          </div>

          <div
            style={{
              display:
                'grid',

              gridTemplateColumns:
                'repeat(auto-fit, minmax(180px, 1fr))',

              gap:
                '12px',

              marginTop:
                '18px'
            }}
          >
            <label>
              Search

              <input
                type="search"
                value={
                  searchText
                }
                onChange={
                  (
                    event
                  ) =>
                    setSearchText(
                      event.target.value
                    )
                }
                placeholder="Question, topic, source..."
              />
            </label>

            <label>
              Subject

              <select
                value={
                  subject
                }
                onChange={
                  (
                    event
                  ) => {
                    setSubject(
                      event.target.value
                    );

                    setTopic(
                      'all'
                    );
                  }
                }
              >
                <option value="all">
                  All Subjects
                </option>

                {
                  subjects.map(
                    (
                      item
                    ) => (
                      <option
                        key={
                          item
                        }
                        value={
                          item
                        }
                      >
                        {
                          item
                        }
                      </option>
                    )
                  )
                }
              </select>
            </label>

            <label>
              Topic

              <select
                value={
                  topic
                }
                onChange={
                  (
                    event
                  ) =>
                    setTopic(
                      event.target.value
                    )
                }
              >
                <option value="all">
                  All Topics
                </option>

                {
                  topics.map(
                    (
                      item
                    ) => (
                      <option
                        key={
                          item
                        }
                        value={
                          item
                        }
                      >
                        {
                          item
                        }
                      </option>
                    )
                  )
                }
              </select>
            </label>

            <label>
              Difficulty

              <select
                value={
                  difficulty
                }
                onChange={
                  (
                    event
                  ) =>
                    setDifficulty(
                      event.target.value as
                        'all' |
                        Difficulty
                    )
                }
              >
                <option value="all">
                  All Levels
                </option>

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
              Question Type

              <select
                value={
                  questionType
                }
                onChange={
                  (
                    event
                  ) =>
                    setQuestionType(
                      event.target.value as
                        'all' |
                        'practice' |
                        'pyq'
                    )
                }
              >
                <option value="all">
                  All Questions
                </option>

                <option value="practice">
                  Practice
                </option>

                <option value="pyq">
                  PYQ
                </option>
              </select>
            </label>

            <label>
              Session Size

              <select
                value={
                  sessionSize
                }
                onChange={
                  (
                    event
                  ) =>
                    setSessionSize(
                      event.target.value as
                        SessionSize
                    )
                }
              >
                <option value="10">
                  10 Questions
                </option>

                <option value="20">
                  20 Questions
                </option>

                <option value="50">
                  50 Questions
                </option>

                <option value="100">
                  100 Questions
                </option>

                <option value="all">
                  All Matching
                </option>
              </select>
            </label>
          </div>

          <div
            style={{
              display:
                'flex',

              gap:
                '12px',

              flexWrap:
                'wrap',

              marginTop:
                '20px'
            }}
          >
            <button
              type="button"
              className="primary-btn"
              onClick={
                startSession
              }
              disabled={
                filteredQuestions.length ===
                  0
              }
            >
              {
                sessionMode ===
                  'exam'
                  ? 'Start Exam'
                  : 'Start Practice'
              }
            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                setSearchText('');
                setSubject('all');
                setTopic('all');
                setDifficulty('all');
                setQuestionType('all');
                setSessionSize('10');
              }}
            >
              Reset Filters
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

export default PracticePage;

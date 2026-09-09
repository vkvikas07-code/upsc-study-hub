import { useEffect, useMemo, useState } from 'react';
import { TopBar } from '../components/TopBar';
import { PrelimsBookmarkButton } from '../components/PrelimsBookmarkButton';
import { supabase } from '../lib/supabase';

type QuestionOrigin = 'cse' | 'upsc' | 'state';
type SessionMode = 'practice' | 'exam';
type SessionSize = '10' | '20' | '50' | '100' | 'all';
type Difficulty = 'easy' | 'medium' | 'hard';

type LiveQuestion = {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;

  subject: string;
  difficulty: Difficulty;
  topic: string | null;
  tags: string[];

  is_pyq: boolean;
  pyq_year: number | null;

  upsc_exam_name: string | null;
  upsc_exam_cycle: string | null;
  upsc_exam_stage: string | null;
  upsc_exam_paper: string | null;
  upsc_exam_year: number | null;

  state_psc_state: string | null;
  state_psc_name: string | null;
  state_psc_exam_name: string | null;
  state_psc_year: number | null;
  state_psc_stage: string | null;
  state_psc_paper: string | null;

  source: string | null;
  source_url: string | null;
};

type AnswerRecord = {
  question_id: string;
  selected_index: number | null;
  correct_index: number;
  is_correct: boolean;
};

type ExamResult = {
  attempted: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  markedForReview: number;

  positiveMarks: number;
  negativeMarks: number;
  marksObtained: number;
  maxMarks: number;

  timeUsedSeconds: number;
  timeLimitSeconds: number;

  answers: AnswerRecord[];
};

const QUESTION_SELECT = `
  id,
  question,
  options,
  correct_index,
  explanation,
  subject,
  difficulty,
  topic,
  tags,
  is_pyq,
  pyq_year,
  upsc_exam_name,
  upsc_exam_cycle,
  upsc_exam_stage,
  upsc_exam_paper,
  upsc_exam_year,
  state_psc_state,
  state_psc_name,
  state_psc_exam_name,
  state_psc_year,
  state_psc_stage,
  state_psc_paper,
  source,
  source_url
`;

const CSE_MARKS_PER_QUESTION = 2;
const CSE_NEGATIVE_MARK = CSE_MARKS_PER_QUESTION / 3;
const CSE_SECONDS_PER_QUESTION = 72;

function getQuestionOrigin(item: LiveQuestion): QuestionOrigin {
  if (item.state_psc_state) {
    return 'state';
  }

  if (item.upsc_exam_name) {
    return 'upsc';
  }

  return 'cse';
}

function shuffleQuestions(items: LiveQuestion[]) {
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [shuffled[i], shuffled[j]] = [
      shuffled[j],
      shuffled[i]
    ];
  }

  return shuffled;
}

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds);

  const hours = Math.floor(
    safeSeconds / 3600
  );

  const minutes = Math.floor(
    (safeSeconds % 3600) / 60
  );

  const remainingSeconds =
    safeSeconds % 60;

  if (hours > 0) {
    return (
      `${hours}:` +
      `${String(minutes).padStart(2, '0')}:` +
      `${String(remainingSeconds).padStart(2, '0')}`
    );
  }

  return (
    `${minutes}:` +
    `${String(remainingSeconds).padStart(2, '0')}`
  );
}

function roundNumber(
  value: number,
  decimals = 2
) {
  const multiplier =
    10 ** decimals;

  return (
    Math.round(
      value * multiplier
    ) / multiplier
  );
}

export function PracticePage() {
  const [
    allQuestions,
    setAllQuestions
  ] = useState<LiveQuestion[]>([]);

  const [
    questions,
    setQuestions
  ] = useState<LiveQuestion[]>([]);

  const [
    practiceStarted,
    setPracticeStarted
  ] = useState(false);

  const [
    sessionMode,
    setSessionMode
  ] = useState<SessionMode>('practice');

  const [
    index,
    setIndex
  ] = useState(0);

  const [
    selected,
    setSelected
  ] = useState<number | null>(null);

  const [
    score,
    setScore
  ] = useState(0);

  const [
    answers,
    setAnswers
  ] = useState<AnswerRecord[]>([]);

  const [
    finished,
    setFinished
  ] = useState(false);

  const [
    examSelections,
    setExamSelections
  ] = useState<
    Record<string, number>
  >({});

  const [
    markedForReview,
    setMarkedForReview
  ] = useState<
    Record<string, boolean>
  >({});

  const [
    timeLeft,
    setTimeLeft
  ] = useState<number | null>(null);

  const [
    timeLimitSeconds,
    setTimeLimitSeconds
  ] = useState(0);

  const [
    sessionStartedAt,
    setSessionStartedAt
  ] = useState<number | null>(null);

  const [
    examResult,
    setExamResult
  ] = useState<ExamResult | null>(null);

  const [
    showExamReview,
    setShowExamReview
  ] = useState(false);

  const [
    examSubmitting,
    setExamSubmitting
  ] = useState(false);

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    error,
    setError
  ] = useState('');

  const [
    setupMessage,
    setSetupMessage
  ] = useState('');

  const [
    savingResult,
    setSavingResult
  ] = useState(false);

  const [
    resultMessage,
    setResultMessage
  ] = useState('');

  const [
    attemptSaved,
    setAttemptSaved
  ] = useState(false);

  const [
    originFilter,
    setOriginFilter
  ] = useState<
    'all' | QuestionOrigin
  >('all');

  const [
    searchText,
    setSearchText
  ] = useState('');

  const [
    subjectFilter,
    setSubjectFilter
  ] = useState('all');

  const [
    topicFilter,
    setTopicFilter
  ] = useState('all');

  const [
    difficultyFilter,
    setDifficultyFilter
  ] = useState<
    'all' | Difficulty
  >('all');

  const [
    typeFilter,
    setTypeFilter
  ] = useState<
    'all' | 'practice' | 'pyq'
  >('all');

  const [
    csePyqYearFilter,
    setCsePyqYearFilter
  ] = useState('all');

  const [
    sessionSize,
    setSessionSize
  ] = useState<SessionSize>('10');

  const [
    upscExamFilter,
    setUpscExamFilter
  ] = useState('all');

  const [
    upscCycleFilter,
    setUpscCycleFilter
  ] = useState('all');

  const [
    upscYearFilter,
    setUpscYearFilter
  ] = useState('all');

  const [
    stateFilter,
    setStateFilter
  ] = useState('all');

  const [
    stateExamFilter,
    setStateExamFilter
  ] = useState('all');

  const [
    stateYearFilter,
    setStateYearFilter
  ] = useState('all');

  const [
    bookmarkedOnly,
    setBookmarkedOnly
  ] = useState(false);

  const [
    bookmarkedQuestionIds,
    setBookmarkedQuestionIds
  ] = useState<string[]>([]);

  const [
    bookmarkSignedIn,
    setBookmarkSignedIn
  ] = useState(false);

  function resetActiveSession() {
    setQuestions([]);
    setPracticeStarted(false);
    setIndex(0);
    setSelected(null);
    setScore(0);
    setAnswers([]);
    setFinished(false);

    setExamSelections({});
    setMarkedForReview({});

    setTimeLeft(null);
    setTimeLimitSeconds(0);
    setSessionStartedAt(null);

    setExamResult(null);
    setShowExamReview(false);
    setExamSubmitting(false);

    setAttemptSaved(false);
    setResultMessage('');
  }

  async function loadBookmarkedQuestionIds() {
    if (!supabase) {
      setBookmarkedQuestionIds([]);
      setBookmarkSignedIn(false);
      return;
    }

    const {
      data: {
        user
      }
    } =
      await supabase.auth.getUser();

    if (!user) {
      setBookmarkedQuestionIds([]);
      setBookmarkSignedIn(false);
      setBookmarkedOnly(false);
      return;
    }

    setBookmarkSignedIn(true);

    const {
      data,
      error: bookmarkError
    } =
      await supabase
        .from('bookmarks')
        .select('content_id')
        .eq(
          'user_id',
          user.id
        )
        .eq(
          'content_type',
          'prelims_question'
        );

    if (bookmarkError) {
      console.error(
        'Unable to load saved Prelims questions:',
        bookmarkError
      );

      setBookmarkedQuestionIds([]);
      return;
    }

    const ids =
      (data || [])
        .map(
          item =>
            String(
              item.content_id
            )
        )
        .filter(Boolean);

    setBookmarkedQuestionIds(
      Array.from(
        new Set(ids)
      )
    );
  }

  async function loadQuestions() {
    if (!supabase) {
      setError(
        'Practice database is not configured.'
      );

      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    setSetupMessage('');

    const {
      data,
      error: loadError
    } =
      await supabase
        .from('questions')
        .select(QUESTION_SELECT)
        .eq(
          'status',
          'published'
        )
        .eq(
          'exam_stage',
          'prelims'
        )
        .order(
          'created_at',
          {
            ascending: false
          }
        );

    if (loadError) {
      console.error(
        'Unable to load questions:',
        loadError
      );

      setError(
        loadError.message
      );

      setLoading(false);
      return;
    }

    const formatted:
      LiveQuestion[] =
        (data || []).map(
          item => ({
            id: item.id,

            question:
              item.question,

            options:
              Array.isArray(
                item.options
              )
                ? item.options.map(
                    option =>
                      String(
                        option
                      )
                  )
                : [],

            correct_index:
              item.correct_index,

            explanation:
              item.explanation,

            subject:
              item.subject,

            difficulty:
              item.difficulty as Difficulty,

            topic:
              item.topic,

            tags:
              Array.isArray(
                item.tags
              )
                ? item.tags.map(
                    tag =>
                      String(tag)
                  )
                : [],

            is_pyq:
              item.is_pyq,

            pyq_year:
              item.pyq_year,

            upsc_exam_name:
              item.upsc_exam_name,

            upsc_exam_cycle:
              item.upsc_exam_cycle,

            upsc_exam_stage:
              item.upsc_exam_stage,

            upsc_exam_paper:
              item.upsc_exam_paper,

            upsc_exam_year:
              item.upsc_exam_year,

            state_psc_state:
              item.state_psc_state,

            state_psc_name:
              item.state_psc_name,

            state_psc_exam_name:
              item.state_psc_exam_name,

            state_psc_year:
              item.state_psc_year,

            state_psc_stage:
              item.state_psc_stage,

            state_psc_paper:
              item.state_psc_paper,

            source:
              item.source,

            source_url:
              item.source_url
          })
        );

    setAllQuestions(
      formatted
    );

    await loadBookmarkedQuestionIds();

    resetActiveSession();

    setLoading(false);
  }

  useEffect(
    () => {
      void loadQuestions();
    },
    []
  );

  useEffect(
    () => {
      if (
        !practiceStarted ||
        sessionMode !== 'exam' ||
        finished
      ) {
        return;
      }

      const timer =
        window.setInterval(
          () => {
            setTimeLeft(
              current => {
                if (
                  current === null
                ) {
                  return null;
                }

                if (
                  current <= 1
                ) {
                  return 0;
                }

                return current - 1;
              }
            );
          },
          1000
        );

      return () =>
        window.clearInterval(
          timer
        );
    },
    [
      practiceStarted,
      sessionMode,
      finished
    ]
  );

  useEffect(
    () => {
      if (
        practiceStarted &&
        sessionMode === 'exam' &&
        !finished &&
        !examSubmitting &&
        timeLeft === 0
      ) {
        void submitExam(true);
      }
    },
    [
      timeLeft,
      practiceStarted,
      sessionMode,
      finished,
      examSubmitting
    ]
  );

  const subjects =
    useMemo(
      () =>
        Array.from(
          new Set(
            allQuestions
              .map(
                item =>
                  item.subject
              )
              .filter(Boolean)
          )
        ).sort(),
      [allQuestions]
    );

  const topics =
    useMemo(
      () =>
        Array.from(
          new Set(
            allQuestions
              .filter(
                item =>
                  subjectFilter ===
                    'all' ||
                  item.subject ===
                    subjectFilter
              )
              .map(
                item =>
                  item.topic
              )
              .filter(
                (
                  value
                ):
                  value is string =>
                    Boolean(value)
              )
          )
        ).sort(),
      [
        allQuestions,
        subjectFilter
      ]
    );

  const csePyqYears =
    useMemo(
      () =>
        Array.from(
          new Set(
            allQuestions
              .filter(
                item =>
                  getQuestionOrigin(
                    item
                  ) === 'cse' &&
                  item.is_pyq &&
                  (
                    subjectFilter ===
                      'all' ||
                    item.subject ===
                      subjectFilter
                  ) &&
                  (
                    topicFilter ===
                      'all' ||
                    item.topic ===
                      topicFilter
                  )
              )
              .map(
                item =>
                  item.pyq_year
              )
              .filter(
                (
                  value
                ):
                  value is number =>
                    value !== null
              )
          )
        ).sort(
          (a, b) =>
            b - a
        ),
      [
        allQuestions,
        subjectFilter,
        topicFilter
      ]
    );

  const upscExams =
    useMemo(
      () =>
        Array.from(
          new Set(
            allQuestions
              .map(
                item =>
                  item.upsc_exam_name
              )
              .filter(
                (
                  value
                ):
                  value is string =>
                    Boolean(value)
              )
          )
        ).sort(),
      [allQuestions]
    );

  const upscCycles =
    useMemo(
      () =>
        Array.from(
          new Set(
            allQuestions
              .filter(
                item =>
                  upscExamFilter ===
                    'all' ||
                  item.upsc_exam_name ===
                    upscExamFilter
              )
              .map(
                item =>
                  item.upsc_exam_cycle
              )
              .filter(
                (
                  value
                ):
                  value is string =>
                    Boolean(value)
              )
          )
        ).sort(),
      [
        allQuestions,
        upscExamFilter
      ]
    );

  const upscYears =
    useMemo(
      () =>
        Array.from(
          new Set(
            allQuestions
              .filter(
                item =>
                  upscExamFilter ===
                    'all' ||
                  item.upsc_exam_name ===
                    upscExamFilter
              )
              .map(
                item =>
                  item.upsc_exam_year
              )
              .filter(
                (
                  value
                ):
                  value is number =>
                    value !== null
              )
          )
        ).sort(
          (a, b) =>
            b - a
        ),
      [
        allQuestions,
        upscExamFilter
      ]
    );

  const states =
    useMemo(
      () =>
        Array.from(
          new Set(
            allQuestions
              .map(
                item =>
                  item.state_psc_state
              )
              .filter(
                (
                  value
                ):
                  value is string =>
                    Boolean(value)
              )
          )
        ).sort(),
      [allQuestions]
    );

  const stateExams =
    useMemo(
      () =>
        Array.from(
          new Set(
            allQuestions
              .filter(
                item =>
                  stateFilter ===
                    'all' ||
                  item.state_psc_state ===
                    stateFilter
              )
              .map(
                item =>
                  item.state_psc_exam_name
              )
              .filter(
                (
                  value
                ):
                  value is string =>
                    Boolean(value)
              )
          )
        ).sort(),
      [
        allQuestions,
        stateFilter
      ]
    );

  const stateYears =
    useMemo(
      () =>
        Array.from(
          new Set(
            allQuestions
              .filter(
                item =>
                  (
                    stateFilter ===
                      'all' ||
                    item.state_psc_state ===
                      stateFilter
                  ) &&
                  (
                    stateExamFilter ===
                      'all' ||
                    item.state_psc_exam_name ===
                      stateExamFilter
                  )
              )
              .map(
                item =>
                  item.state_psc_year
              )
              .filter(
                (
                  value
                ):
                  value is number =>
                    value !== null
              )
          )
        ).sort(
          (a, b) =>
            b - a
        ),
      [
        allQuestions,
        stateFilter,
        stateExamFilter
      ]
    );

  const filteredQuestions =
    useMemo(
      () =>
        allQuestions.filter(
          item => {
            const origin =
              getQuestionOrigin(
                item
              );

            const search =
              searchText
                .trim()
                .toLowerCase();

            const searchableText =
              [
                item.question,
                item.subject,
                item.topic || '',
                item.tags.join(' '),
                item.source || '',

                item.upsc_exam_name || '',
                item.upsc_exam_cycle || '',
                item.upsc_exam_stage || '',
                item.upsc_exam_paper || '',

                item.upsc_exam_year
                  ? String(
                      item.upsc_exam_year
                    )
                  : '',

                item.state_psc_state || '',
                item.state_psc_name || '',
                item.state_psc_exam_name || '',
                item.state_psc_stage || '',
                item.state_psc_paper || '',

                item.state_psc_year
                  ? String(
                      item.state_psc_year
                    )
                  : '',

                item.pyq_year
                  ? String(
                      item.pyq_year
                    )
                  : ''
              ]
                .join(' ')
                .toLowerCase();

            const matchesSearch =
              !search ||
              searchableText.includes(
                search
              );

            const matchesOrigin =
              originFilter ===
                'all' ||
              origin ===
                originFilter;

            const matchesSubject =
              subjectFilter ===
                'all' ||
              item.subject ===
                subjectFilter;

            const matchesTopic =
              topicFilter ===
                'all' ||
              item.topic ===
                topicFilter;

            const matchesDifficulty =
              difficultyFilter ===
                'all' ||
              item.difficulty ===
                difficultyFilter;

            const matchesType =
              typeFilter ===
                'all' ||
              (
                typeFilter ===
                  'pyq' &&
                item.is_pyq
              ) ||
              (
                typeFilter ===
                  'practice' &&
                !item.is_pyq
              );

            const matchesCsePyqYear =
              csePyqYearFilter ===
                'all' ||
              (
                origin ===
                  'cse' &&
                item.is_pyq &&
                String(
                  item.pyq_year ||
                  ''
                ) ===
                  csePyqYearFilter
              );

            const matchesUpscExam =
              upscExamFilter ===
                'all' ||
              item.upsc_exam_name ===
                upscExamFilter;

            const matchesUpscCycle =
              upscCycleFilter ===
                'all' ||
              item.upsc_exam_cycle ===
                upscCycleFilter;

            const matchesUpscYear =
              upscYearFilter ===
                'all' ||
              String(
                item.upsc_exam_year ||
                ''
              ) ===
                upscYearFilter;

            const matchesState =
              stateFilter ===
                'all' ||
              item.state_psc_state ===
                stateFilter;

            const matchesStateExam =
              stateExamFilter ===
                'all' ||
              item.state_psc_exam_name ===
                stateExamFilter;

            const matchesStateYear =
              stateYearFilter ===
                'all' ||
              String(
                item.state_psc_year ||
                ''
              ) ===
                stateYearFilter;

            const matchesBookmarked =
              !bookmarkedOnly ||
              bookmarkedQuestionIds.includes(
                item.id
              );

            return (
              matchesSearch &&
              matchesOrigin &&
              matchesSubject &&
              matchesTopic &&
              matchesDifficulty &&
              matchesType &&
              matchesCsePyqYear &&
              matchesUpscExam &&
              matchesUpscCycle &&
              matchesUpscYear &&
              matchesState &&
              matchesStateExam &&
              matchesStateYear &&
              matchesBookmarked
            );
          }
        ),
      [
        allQuestions,
        searchText,
        originFilter,
        subjectFilter,
        topicFilter,
        difficultyFilter,
        typeFilter,
        csePyqYearFilter,
        upscExamFilter,
        upscCycleFilter,
        upscYearFilter,
        stateFilter,
        stateExamFilter,
        stateYearFilter,
        bookmarkedOnly,
        bookmarkedQuestionIds
      ]
    );

  const sessionQuestionCount =
    sessionSize === 'all'
      ? filteredQuestions.length
      : Math.min(
          Number(sessionSize),
          filteredQuestions.length
        );

  function changeSessionMode(
    mode: SessionMode
  ) {
    setSessionMode(mode);

    if (mode === 'exam') {
      changeOriginFilter(
        'cse'
      );
    }
  }

  function changeOriginFilter(
    value:
      'all' | QuestionOrigin
  ) {
    setOriginFilter(value);

    if (value !== 'cse') {
      setSessionMode(
        'practice'
      );

      setCsePyqYearFilter(
        'all'
      );
    }

    if (value !== 'upsc') {
      setUpscExamFilter(
        'all'
      );

      setUpscCycleFilter(
        'all'
      );

      setUpscYearFilter(
        'all'
      );
    }

    if (value !== 'state') {
      setStateFilter(
        'all'
      );

      setStateExamFilter(
        'all'
      );

      setStateYearFilter(
        'all'
      );
    }
  }

  function changeTypeFilter(
    value:
      'all' |
      'practice' |
      'pyq'
  ) {
    setTypeFilter(value);

    if (value !== 'pyq') {
      setCsePyqYearFilter(
        'all'
      );
    }
  }

  function resetFilters() {
    setSessionMode(
      'practice'
    );

    setOriginFilter(
      'all'
    );

    setSearchText('');

    setSubjectFilter(
      'all'
    );

    setTopicFilter(
      'all'
    );

    setDifficultyFilter(
      'all'
    );

    setTypeFilter(
      'all'
    );

    setCsePyqYearFilter(
      'all'
    );

    setSessionSize(
      '10'
    );

    setUpscExamFilter(
      'all'
    );

    setUpscCycleFilter(
      'all'
    );

    setUpscYearFilter(
      'all'
    );

    setStateFilter(
      'all'
    );

    setStateExamFilter(
      'all'
    );

    setStateYearFilter(
      'all'
    );

    setBookmarkedOnly(
      false
    );

    setSetupMessage('');
  }

  function buildPracticeConfig() {
    return {
      session_mode:
        sessionMode,

      origin:
        originFilter,

      subject:
        subjectFilter,

      topic:
        topicFilter,

      difficulty:
        difficultyFilter,

      question_type:
        typeFilter,

      cse_pyq_year:
        csePyqYearFilter,

      upsc_exam:
        upscExamFilter,

      upsc_cycle:
        upscCycleFilter,

      upsc_year:
        upscYearFilter,

      state:
        stateFilter,

      state_exam:
        stateExamFilter,

      state_year:
        stateYearFilter,

      session_size:
        sessionSize,

      search:
        searchText,

      bookmarked_only:
        bookmarkedOnly,

      cse_pattern:
        sessionMode ===
          'exam'
          ? {
              marks_per_question:
                CSE_MARKS_PER_QUESTION,

              negative_mark:
                CSE_NEGATIVE_MARK,

              seconds_per_question:
                CSE_SECONDS_PER_QUESTION
            }
          : null
    };
  }

  function startPractice() {
    if (
      filteredQuestions.length === 0
    ) {
      setSetupMessage(
        bookmarkedOnly
          ? 'No saved questions match the selected filters.'
          : 'No published questions match these filters.'
      );

      return;
    }

    if (
      sessionMode === 'exam' &&
      originFilter !== 'cse'
    ) {
      setSetupMessage(
        'CSE Exam Mode can only use CSE / General questions.'
      );

      return;
    }

    const randomized =
      shuffleQuestions(
        filteredQuestions
      );

    const selectedSet =
      sessionSize === 'all'
        ? randomized
        : randomized.slice(
            0,
            Number(
              sessionSize
            )
          );

    setQuestions(
      selectedSet
    );

    setIndex(0);
    setSelected(null);
    setScore(0);
    setAnswers([]);
    setFinished(false);

    setExamSelections({});
    setMarkedForReview({});
    setExamResult(null);
    setShowExamReview(false);
    setExamSubmitting(false);

    setAttemptSaved(false);
    setResultMessage('');
    setSetupMessage('');

    setSessionStartedAt(
      Date.now()
    );

    if (sessionMode === 'exam') {
      const limit =
        selectedSet.length *
        CSE_SECONDS_PER_QUESTION;

      setTimeLimitSeconds(
        limit
      );

      setTimeLeft(
        limit
      );
    } else {
      setTimeLimitSeconds(0);
      setTimeLeft(null);
    }

    setPracticeStarted(true);
  }

  function answerPracticeQuestion(
    option: number
  ) {
    if (
      selected !== null ||
      !questions[index]
    ) {
      return;
    }

    const currentQuestion =
      questions[index];

    const isCorrect =
      option ===
      currentQuestion
        .correct_index;

    setSelected(option);

    if (isCorrect) {
      setScore(
        current =>
          current + 1
      );
    }

    setAnswers(
      current => [
        ...current,
        {
          question_id:
            currentQuestion.id,

          selected_index:
            option,

          correct_index:
            currentQuestion
              .correct_index,

          is_correct:
            isCorrect
        }
      ]
    );
  }

  function answerExamQuestion(
    option: number
  ) {
    const currentQuestion =
      questions[index];

    if (!currentQuestion) {
      return;
    }

    setExamSelections(
      current => ({
        ...current,
        [currentQuestion.id]:
          option
      })
    );
  }

  function clearExamResponse() {
    const currentQuestion =
      questions[index];

    if (!currentQuestion) {
      return;
    }

    setExamSelections(
      current => {
        const copy = {
          ...current
        };

        delete copy[
          currentQuestion.id
        ];

        return copy;
      }
    );
  }

  function toggleMarkForReview() {
    const currentQuestion =
      questions[index];

    if (!currentQuestion) {
      return;
    }

    setMarkedForReview(
      current => ({
        ...current,

        [currentQuestion.id]:
          !Boolean(
            current[
              currentQuestion.id
            ]
          )
      })
    );
  }

  function getDurationSeconds() {
    if (!sessionStartedAt) {
      return 0;
    }

    return Math.max(
      0,
      Math.floor(
        (
          Date.now() -
          sessionStartedAt
        ) /
          1000
      )
    );
  }

  async function saveAttempt(
    mode: SessionMode,
    records: AnswerRecord[],
    correct: number,
    incorrect: number,
    unanswered: number,
    marksObtained:
      number | null,
    maxMarks:
      number | null,
    negativeMarks:
      number | null,
    durationSeconds: number,
    limitSeconds:
      number | null
  ) {
    if (
      !supabase ||
      attemptSaved ||
      questions.length === 0
    ) {
      return;
    }

    setSavingResult(true);
    setResultMessage('');

    const {
      data: {
        user
      }
    } =
      await supabase.auth.getUser();

    if (!user) {
      setSavingResult(false);

      setResultMessage(
        'Result completed. Sign in as a student to save practice history.'
      );

      return;
    }

    const subjectsInSession =
      Array.from(
        new Set(
          questions.map(
            item =>
              item.subject
          )
        )
      );

    const sessionSubject =
      subjectsInSession.length === 1
        ? subjectsInSession[0]
        : 'Mixed';

    const attempted =
      correct + incorrect;

    const percentage =
      mode === 'exam' &&
      maxMarks !== null &&
      maxMarks > 0 &&
      marksObtained !== null
        ? roundNumber(
            (
              marksObtained /
              maxMarks
            ) *
              100
          )
        : roundNumber(
            (
              correct /
              questions.length
            ) *
              100
          );

    const {
      error: saveError
    } =
      await supabase
        .from(
          'practice_attempts'
        )
        .insert({
          user_id:
            user.id,

          total_questions:
            questions.length,

          attempted_questions:
            attempted,

          correct_answers:
            correct,

          incorrect_answers:
            incorrect,

          unanswered_questions:
            unanswered,

          score_percent:
            percentage,

          subject:
            sessionSubject,

          answers:
            records,

          mode,

          marks_obtained:
            marksObtained,

          max_marks:
            maxMarks,

          negative_marks:
            negativeMarks,

          duration_seconds:
            durationSeconds,

          time_limit_seconds:
            limitSeconds,

          practice_config:
            buildPracticeConfig()
        });

    if (saveError) {
      console.error(
        'Unable to save practice result:',
        saveError
      );

      setResultMessage(
        `Result could not be saved: ${saveError.message}`
      );

      setSavingResult(false);
      return;
    }

    setAttemptSaved(true);

    setResultMessage(
      mode === 'exam'
        ? 'Exam result saved successfully.'
        : 'Practice result saved successfully.'
    );

    setSavingResult(false);
  }

  async function finishPracticeMode() {
    const correct =
      answers.filter(
        item =>
          item.is_correct
      ).length;

    const incorrect =
      answers.filter(
        item =>
          !item.is_correct
      ).length;

    const unanswered =
      Math.max(
        0,
        questions.length -
          answers.length
      );

    setScore(correct);
    setFinished(true);

    await saveAttempt(
      'practice',
      answers,
      correct,
      incorrect,
      unanswered,
      null,
      null,
      null,
      getDurationSeconds(),
      null
    );
  }

  async function nextPracticeQuestion() {
    if (
      index ===
      questions.length - 1
    ) {
      await finishPracticeMode();
      return;
    }

    setIndex(
      current =>
        current + 1
    );

    setSelected(null);
  }

  async function submitExam(
    automatic = false
  ) {
    if (
      finished ||
      examSubmitting ||
      questions.length === 0
    ) {
      return;
    }

    if (!automatic) {
      const unansweredCount =
        questions.filter(
          item =>
            typeof
              examSelections[
                item.id
              ] !== 'number'
        ).length;

      const reviewCount =
        questions.filter(
          item =>
            Boolean(
              markedForReview[
                item.id
              ]
            )
        ).length;

      const confirmed =
        window.confirm(
          `Submit your exam now?\n\n` +
            `Unanswered: ${unansweredCount}\n` +
            `Marked for Review: ${reviewCount}\n\n` +
            `You will not be able to change answers after submission.`
        );

      if (!confirmed) {
        return;
      }
    }

    setExamSubmitting(true);

    const records:
      AnswerRecord[] =
        questions.map(
          item => {
            const chosen =
              examSelections[
                item.id
              ];

            const hasAnswer =
              typeof chosen ===
              'number';

            return {
              question_id:
                item.id,

              selected_index:
                hasAnswer
                  ? chosen
                  : null,

              correct_index:
                item.correct_index,

              is_correct:
                hasAnswer &&
                chosen ===
                  item.correct_index
            };
          }
        );

    const attempted =
      records.filter(
        item =>
          item.selected_index !==
          null
      ).length;

    const correct =
      records.filter(
        item =>
          item.is_correct
      ).length;

    const incorrect =
      records.filter(
        item =>
          item.selected_index !==
            null &&
          !item.is_correct
      ).length;

    const unanswered =
      questions.length -
      attempted;

    const reviewCount =
      questions.filter(
        item =>
          Boolean(
            markedForReview[
              item.id
            ]
          )
      ).length;

    const positiveMarks =
      correct *
      CSE_MARKS_PER_QUESTION;

    const negativeMarks =
      incorrect *
      CSE_NEGATIVE_MARK;

    const marksObtained =
      positiveMarks -
      negativeMarks;

    const maxMarks =
      questions.length *
      CSE_MARKS_PER_QUESTION;

    const duration =
      Math.min(
        timeLimitSeconds,
        getDurationSeconds()
      );

    const result:
      ExamResult = {
        attempted,
        correct,
        incorrect,
        unanswered,

        markedForReview:
          reviewCount,

        positiveMarks:
          roundNumber(
            positiveMarks,
            4
          ),

        negativeMarks:
          roundNumber(
            negativeMarks,
            4
          ),

        marksObtained:
          roundNumber(
            marksObtained,
            4
          ),

        maxMarks:
          roundNumber(
            maxMarks,
            4
          ),

        timeUsedSeconds:
          duration,

        timeLimitSeconds,

        answers:
          records
      };

    setScore(correct);
    setAnswers(records);
    setExamResult(result);
    setFinished(true);

    await saveAttempt(
      'exam',
      records,
      correct,
      incorrect,
      unanswered,
      result.marksObtained,
      result.maxMarks,
      result.negativeMarks,
      result.timeUsedSeconds,
      result.timeLimitSeconds
    );

    if (automatic) {
      setResultMessage(
        'Time expired. Your exam was submitted automatically.'
      );
    }
  }

  function restartSameSet() {
    setIndex(0);
    setSelected(null);
    setScore(0);
    setAnswers([]);
    setFinished(false);

    setExamSelections({});
    setMarkedForReview({});
    setExamResult(null);
    setShowExamReview(false);
    setExamSubmitting(false);

    setAttemptSaved(false);
    setResultMessage('');

    setSessionStartedAt(
      Date.now()
    );

    if (sessionMode === 'exam') {
      const limit =
        questions.length *
        CSE_SECONDS_PER_QUESTION;

      setTimeLimitSeconds(
        limit
      );

      setTimeLeft(
        limit
      );
    } else {
      setTimeLimitSeconds(0);
      setTimeLeft(null);
    }
  }

  function changePracticeSet() {
    resetActiveSession();

    void loadBookmarkedQuestionIds();
  }

  if (loading) {
    return (
      <div className="page-wrap">
        <TopBar
          title="Prelims Practice"
          subtitle="UPSC and State PSC question bank"
        />

        <section className="panel">
          <h2>
            Loading MCQs...
          </h2>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrap">
        <TopBar
          title="Prelims Practice"
          subtitle="UPSC and State PSC question bank"
        />

        <section className="panel">
          <h2>
            Unable to load questions
          </h2>

          <p>
            {error}
          </p>

          <button
            className="primary-btn"
            onClick={
              loadQuestions
            }
          >
            Try again
          </button>
        </section>
      </div>
    );
  }

  if (!practiceStarted) {
    return (
      <div className="page-wrap">
        <TopBar
          title="Prelims Practice"
          subtitle="Build your question set"
        />

        <section className="panel admin-form">
          <span className="eyebrow">
            PRELIMS QUESTION BANK
          </span>

          <h2>
            Build Your Practice Set
          </h2>

          <div
            style={{
              marginTop: '16px',
              padding: '16px',
              border:
                '1px solid rgba(255,255,255,.10)',
              borderRadius:
                '14px'
            }}
          >
            <span className="eyebrow">
              SESSION MODE
            </span>

            <label>
              Mode

              <select
                value={
                  sessionMode
                }
                onChange={
                  event =>
                    changeSessionMode(
                      event.target
                        .value as
                        SessionMode
                    )
                }
              >
                <option
                  value="practice"
                >
                  Practice Mode
                </option>

                <option value="exam">
                  CSE Exam Mode
                </option>
              </select>
            </label>

            {sessionMode ===
            'practice' ? (
              <div className="callout">
                <strong>
                  Practice Mode
                </strong>

                <p>
                  See the correct answer
                  and explanation after
                  every question.
                </p>
              </div>
            ) : (
              <div className="callout">
                <strong>
                  CSE Exam Simulation
                </strong>

                <p>
                  Correct: +2 marks
                </p>

                <p>
                  Wrong: -0.6667 marks
                </p>

                <p>
                  Unanswered: 0 marks
                </p>

                <p>
                  Answers and explanations
                  remain hidden until
                  submission.
                </p>
              </div>
            )}
          </div>

          <label>
            Question Origin

            <select
              value={
                originFilter
              }
              onChange={
                event =>
                  changeOriginFilter(
                    event.target
                      .value as
                      | 'all'
                      | QuestionOrigin
                  )
              }
            >
              <option value="all">
                All Prelims Questions
              </option>

              <option value="cse">
                CSE / General Practice
              </option>

              <option value="upsc">
                Other UPSC Examinations
              </option>

              <option value="state">
                State PSC Examinations
              </option>
            </select>
          </label>

          <label>
            Search Question Bank

            <input
              type="search"
              value={
                searchText
              }
              onChange={
                event =>
                  setSearchText(
                    event.target.value
                  )
              }
              placeholder="Article 21, monsoon, inflation, biodiversity..."
            />

            <small>
              Search by question,
              topic, tag, examination,
              year or source.
            </small>
          </label>

          <div className="form-two">
            <label>
              Subject

              <select
                value={
                  subjectFilter
                }
                onChange={
                  event => {
                    setSubjectFilter(
                      event.target.value
                    );

                    setTopicFilter(
                      'all'
                    );

                    setCsePyqYearFilter(
                      'all'
                    );
                  }
                }
              >
                <option value="all">
                  All Subjects
                </option>

                {subjects.map(
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
              Topic

              <select
                value={
                  topicFilter
                }
                onChange={
                  event => {
                    setTopicFilter(
                      event.target.value
                    );

                    setCsePyqYearFilter(
                      'all'
                    );
                  }
                }
              >
                <option value="all">
                  All Topics
                </option>

                {topics.map(
                  topic => (
                    <option
                      key={topic}
                      value={topic}
                    >
                      {topic}
                    </option>
                  )
                )}
              </select>
            </label>
          </div>

          <div className="form-two">
            <label>
              Difficulty

              <select
                value={
                  difficultyFilter
                }
                onChange={
                  event =>
                    setDifficultyFilter(
                      event.target
                        .value as
                        | 'all'
                        | Difficulty
                    )
                }
              >
                <option value="all">
                  All Difficulty
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
                  typeFilter
                }
                onChange={
                  event =>
                    changeTypeFilter(
                      event.target
                        .value as
                        | 'all'
                        | 'practice'
                        | 'pyq'
                    )
                }
              >
                <option value="all">
                  All Questions
                </option>

                <option value="pyq">
                  Previous Year Questions
                </option>

                <option value="practice">
                  Practice Questions
                </option>
              </select>
            </label>
          </div>

          <div
            style={{
              marginTop: '14px',
              padding: '16px',
              border:
                '1px solid rgba(255,255,255,.10)',
              borderRadius:
                '14px'
            }}
          >
            <span className="eyebrow">
              REVISION QUESTIONS
            </span>

            <label>
              Revision Set

              <select
                value={
                  bookmarkedOnly
                    ? 'saved'
                    : 'all'
                }
                onChange={
                  event => {
                    const nextValue =
                      event.target.value;

                    setBookmarkedOnly(
                      nextValue ===
                        'saved'
                    );

                    setSetupMessage('');
                  }
                }
              >
                <option value="all">
                  All Questions
                </option>

                <option
                  value="saved"
                  disabled={
                    !bookmarkSignedIn
                  }
                >
                  ★ Saved for Revision Only
                </option>
              </select>
            </label>

            {bookmarkSignedIn ? (
              <small>
                {
                  bookmarkedQuestionIds
                    .length
                }{' '}
                Prelims question
                {
                  bookmarkedQuestionIds
                    .length === 1
                    ? ''
                    : 's'
                }{' '}
                saved for revision.
              </small>
            ) : (
              <small>
                Sign in to use Saved for
                Revision.
              </small>
            )}
          </div>

          {originFilter ===
            'cse' &&
            typeFilter ===
              'pyq' && (
            <div
              style={{
                marginTop: '14px',
                padding: '16px',
                border:
                  '1px solid rgba(255,255,255,.10)',
                borderRadius:
                  '14px'
              }}
            >
              <span className="eyebrow">
                CSE PRELIMS PYQ
              </span>

              <label>
                PYQ Year

                <select
                  value={
                    csePyqYearFilter
                  }
                  onChange={
                    event =>
                      setCsePyqYearFilter(
                        event.target.value
                      )
                  }
                >
                  <option value="all">
                    All CSE PYQ Years
                  </option>

                  {csePyqYears.map(
                    year => (
                      <option
                        key={year}
                        value={
                          String(year)
                        }
                      >
                        {year}
                      </option>
                    )
                  )}
                </select>
              </label>
            </div>
          )}

          <div
            style={{
              marginTop: '14px',
              padding: '16px',
              border:
                '1px solid rgba(255,255,255,.10)',
              borderRadius:
                '14px'
            }}
          >
            <span className="eyebrow">
              SESSION SIZE
            </span>

            <label>
              Number of Questions

              <select
                value={
                  sessionSize
                }
                onChange={
                  event =>
                    setSessionSize(
                      event.target
                        .value as
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
                  All Available Questions
                </option>
              </select>
            </label>

            {sessionMode ===
              'exam' && (
              <p>
                Exam Time:{' '}

                <strong>
                  {
                    formatTime(
                      sessionQuestionCount *
                        CSE_SECONDS_PER_QUESTION
                    )
                  }
                </strong>
              </p>
            )}
          </div>

          {originFilter ===
            'upsc' && (
            <div
              style={{
                marginTop: '18px',
                padding: '16px',
                border:
                  '1px solid rgba(255,255,255,.10)',
                borderRadius:
                  '14px'
              }}
            >
              <span className="eyebrow">
                OTHER UPSC EXAMS
              </span>

              <div className="form-two">
                <label>
                  Examination

                  <select
                    value={
                      upscExamFilter
                    }
                    onChange={
                      event => {
                        setUpscExamFilter(
                          event.target.value
                        );

                        setUpscCycleFilter(
                          'all'
                        );

                        setUpscYearFilter(
                          'all'
                        );
                      }
                    }
                  >
                    <option value="all">
                      All UPSC Exams
                    </option>

                    {upscExams.map(
                      exam => (
                        <option
                          key={exam}
                          value={exam}
                        >
                          {exam}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label>
                  Cycle

                  <select
                    value={
                      upscCycleFilter
                    }
                    onChange={
                      event =>
                        setUpscCycleFilter(
                          event.target.value
                        )
                    }
                  >
                    <option value="all">
                      All Cycles
                    </option>

                    {upscCycles.map(
                      cycle => (
                        <option
                          key={cycle}
                          value={cycle}
                        >
                          {cycle}
                        </option>
                      )
                    )}
                  </select>
                </label>
              </div>

              <label>
                Examination Year

                <select
                  value={
                    upscYearFilter
                  }
                  onChange={
                    event =>
                      setUpscYearFilter(
                        event.target.value
                      )
                  }
                >
                  <option value="all">
                    All Years
                  </option>

                  {upscYears.map(
                    year => (
                      <option
                        key={year}
                        value={
                          String(year)
                        }
                      >
                        {year}
                      </option>
                    )
                  )}
                </select>
              </label>
            </div>
          )}

          {originFilter ===
            'state' && (
            <div
              style={{
                marginTop: '18px',
                padding: '16px',
                border:
                  '1px solid rgba(255,255,255,.10)',
                borderRadius:
                  '14px'
              }}
            >
              <span className="eyebrow">
                STATE PSC
              </span>

              <h3>
                Choose State Examination
              </h3>

              <label>
                State

                <select
                  value={
                    stateFilter
                  }
                  onChange={
                    event => {
                      setStateFilter(
                        event.target.value
                      );

                      setStateExamFilter(
                        'all'
                      );

                      setStateYearFilter(
                        'all'
                      );
                    }
                  }
                >
                  <option value="all">
                    All States
                  </option>

                  {states.map(
                    state => (
                      <option
                        key={state}
                        value={state}
                      >
                        {state}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                Examination

                <select
                  value={
                    stateExamFilter
                  }
                  onChange={
                    event => {
                      setStateExamFilter(
                        event.target.value
                      );

                      setStateYearFilter(
                        'all'
                      );
                    }
                  }
                >
                  <option value="all">
                    All Examinations
                  </option>

                  {stateExams.map(
                    exam => (
                      <option
                        key={exam}
                        value={exam}
                      >
                        {exam}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                Examination Year

                <select
                  value={
                    stateYearFilter
                  }
                  onChange={
                    event =>
                      setStateYearFilter(
                        event.target.value
                      )
                  }
                >
                  <option value="all">
                    All Years
                  </option>

                  {stateYears.map(
                    year => (
                      <option
                        key={year}
                        value={
                          String(year)
                        }
                      >
                        {year}
                      </option>
                    )
                  )}
                </select>
              </label>
            </div>
          )}

          <div
            className="callout"
            style={{
              marginTop: '18px'
            }}
          >
            <strong>
              {
                filteredQuestions.length
              }{' '}
              questions match
            </strong>

            <p>
              Session Questions:{' '}

              <strong>
                {
                  sessionQuestionCount
                }
              </strong>
            </p>

            {bookmarkedOnly && (
              <p>
                Revision mode is using
                only your saved questions.
              </p>
            )}

            {sessionMode ===
              'exam' && (
              <>
                <p>
                  Maximum Marks:{' '}

                  <strong>
                    {
                      sessionQuestionCount *
                        CSE_MARKS_PER_QUESTION
                    }
                  </strong>
                </p>

                <p>
                  Time Limit:{' '}

                  <strong>
                    {
                      formatTime(
                        sessionQuestionCount *
                          CSE_SECONDS_PER_QUESTION
                      )
                    }
                  </strong>
                </p>
              </>
            )}
          </div>

          {setupMessage && (
            <p className="form-message">
              {setupMessage}
            </p>
          )}

          <div
            style={{
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap',
              marginTop: '18px'
            }}
          >
            <button
              type="button"
              className="primary-btn"
              disabled={
                filteredQuestions.length ===
                0
              }
              onClick={
                startPractice
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
              onClick={
                resetFilters
              }
            >
              Reset Filters
            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={
                loadQuestions
              }
            >
              Refresh Questions
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (finished) {
    if (
      sessionMode === 'exam' &&
      examResult
    ) {
      const percentage =
        examResult.maxMarks > 0
          ? roundNumber(
              (
                examResult.marksObtained /
                examResult.maxMarks
              ) *
                100
            )
          : 0;

      return (
        <div className="page-wrap">
          <TopBar
            title="CSE Exam Result"
            subtitle="Prelims simulation completed"
          />

          <section className="result-card">
            <span className="result-icon">
              🎯
            </span>

            <h2>
              {
                examResult.marksObtained
              }
              /
              {
                examResult.maxMarks
              }
            </h2>

            <h3>
              {percentage}%
            </h3>

            <p>
              CSE-style negative
              marking applied.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit,minmax(125px,1fr))',
                gap: '10px',
                marginTop: '18px',
                textAlign: 'left'
              }}
            >
              <div className="callout">
                <strong>
                  {questions.length}
                </strong>

                <p>
                  Questions
                </p>
              </div>

              <div className="callout">
                <strong>
                  {
                    examResult.attempted
                  }
                </strong>

                <p>
                  Attempted
                </p>
              </div>

              <div className="callout">
                <strong>
                  {
                    examResult.correct
                  }
                </strong>

                <p>
                  Correct
                </p>
              </div>

              <div className="callout">
                <strong>
                  {
                    examResult.incorrect
                  }
                </strong>

                <p>
                  Incorrect
                </p>
              </div>

              <div className="callout">
                <strong>
                  {
                    examResult.unanswered
                  }
                </strong>

                <p>
                  Unanswered
                </p>
              </div>

              <div className="callout">
                <strong>
                  {
                    examResult
                      .markedForReview
                  }
                </strong>

                <p>
                  Marked Review
                </p>
              </div>

              <div className="callout">
                <strong>
                  -
                  {
                    examResult
                      .negativeMarks
                  }
                </strong>

                <p>
                  Negative Marks
                </p>
              </div>

              <div className="callout">
                <strong>
                  {
                    formatTime(
                      examResult
                        .timeUsedSeconds
                    )
                  }
                </strong>

                <p>
                  Time Used
                </p>
              </div>
            </div>

            {savingResult && (
              <p>
                Saving result...
              </p>
            )}

            {resultMessage && (
              <p className="form-message">
                {resultMessage}
              </p>
            )}

            <div
              style={{
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap',
                justifyContent:
                  'center',
                marginTop: '18px'
              }}
            >
              <button
                className="primary-btn"
                onClick={
                  () =>
                    setShowExamReview(
                      current =>
                        !current
                    )
                }
              >
                {
                  showExamReview
                    ? 'Hide Answer Review'
                    : 'Review Answers'
                }
              </button>

              <button
                className="secondary-btn"
                onClick={
                  restartSameSet
                }
              >
                Attempt Same Set Again
              </button>

              <button
                className="secondary-btn"
                onClick={
                  changePracticeSet
                }
              >
                Choose Another Set
              </button>
            </div>
          </section>

          {showExamReview && (
            <section
              className="panel"
              style={{
                marginTop: '18px'
              }}
            >
              <span className="eyebrow">
                ANSWER REVIEW
              </span>

              <h2>
                Review Your Exam
              </h2>

              <div
                style={{
                  display: 'grid',
                  gap: '16px'
                }}
              >
                {questions.map(
                  (
                    question,
                    questionIndex
                  ) => {
                    const record =
                      examResult.answers[
                        questionIndex
                      ];

                    const selectedIndex =
                      record
                        ?.selected_index ??
                      null;

                    const wasMarked =
                      Boolean(
                        markedForReview[
                          question.id
                        ]
                      );

                    return (
                      <article
                        key={
                          question.id
                        }
                        style={{
                          padding: '16px',
                          border:
                            '1px solid rgba(255,255,255,.10)',
                          borderRadius:
                            '14px'
                        }}
                      >
                        <div className="tag-row">
                          <span className="tag">
                            Question{' '}
                            {
                              questionIndex +
                              1
                            }
                          </span>

                          {wasMarked && (
                            <span
                              className="tag"
                              style={{
                                color:
                                  '#fbbf24',
                                border:
                                  '1px solid rgba(251,191,36,.45)'
                              }}
                            >
                              Marked for Review
                            </span>
                          )}
                        </div>

                        <h3>
                          {
                            question.question
                          }
                        </h3>

                        <p>
                          Your Answer:{' '}

                          <strong>
                            {
                              selectedIndex ===
                              null
                                ? 'Not Answered'
                                : `${String.fromCharCode(
                                    65 +
                                      selectedIndex
                                  )}. ${
                                    question
                                      .options[
                                      selectedIndex
                                    ] || ''
                                  }`
                            }
                          </strong>
                        </p>

                        <p>
                          Correct Answer:{' '}

                          <strong>
                            {
                              String.fromCharCode(
                                65 +
                                  question
                                    .correct_index
                              )
                            }.
                            {' '}
                            {
                              question.options[
                                question
                                  .correct_index
                              ] || ''
                            }
                          </strong>
                        </p>

                        <p>
                          Status:{' '}

                          <strong>
                            {
                              selectedIndex ===
                              null
                                ? 'Unanswered'
                                : record
                                    ?.is_correct
                                ? 'Correct'
                                : 'Incorrect'
                            }
                          </strong>
                        </p>

                        <div className="explanation">
                          <strong>
                            Explanation
                          </strong>

                          <p>
                            {
                              question
                                .explanation
                            }
                          </p>
                        </div>

                        <div
                          style={{
                            marginTop:
                              '14px'
                          }}
                        >
                          <PrelimsBookmarkButton
                            questionId={
                              question.id
                            }
                          />
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            </section>
          )}
        </div>
      );
    }

    const percentage =
      questions.length > 0
        ? Math.round(
            (
              score /
              questions.length
            ) *
              100
          )
        : 0;

    return (
      <div className="page-wrap">
        <TopBar
          title="Prelims Practice"
          subtitle="Your practice result"
        />

        <section className="result-card">
          <span className="result-icon">
            🎯
          </span>

          <h2>
            {score}/
            {questions.length}
          </h2>

          <h3>
            {percentage}%
          </h3>

          <p>
            Review explanations and
            strengthen the concepts
            you missed.
          </p>

          {savingResult && (
            <p>
              Saving your result...
            </p>
          )}

          {resultMessage && (
            <p className="form-message">
              {resultMessage}
            </p>
          )}

          <div
            style={{
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap',
              justifyContent:
                'center'
            }}
          >
            <button
              className="primary-btn"
              onClick={
                restartSameSet
              }
            >
              Practice Same Set Again
            </button>

            <button
              className="secondary-btn"
              onClick={
                changePracticeSet
              }
            >
              Choose Another Set
            </button>
          </div>
        </section>
      </div>
    );
  }

  const q =
    questions[index];

  if (!q) {
    return null;
  }

  const origin =
    getQuestionOrigin(q);

  if (sessionMode === 'exam') {
    const chosen =
      examSelections[
        q.id
      ];

    const currentMarked =
      Boolean(
        markedForReview[
          q.id
        ]
      );

    const answeredCount =
      questions.filter(
        item =>
          typeof
            examSelections[
              item.id
            ] === 'number'
      ).length;

    const reviewCount =
      questions.filter(
        item =>
          Boolean(
            markedForReview[
              item.id
            ]
          )
      ).length;

    const unansweredCount =
      questions.length -
      answeredCount;

    return (
      <div className="page-wrap">
        <TopBar
          title="CSE Exam Mode"
          subtitle="Prelims simulation"
        />

        <section
          className="panel"
          style={{
            marginBottom: '14px'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              alignItems: 'center',
              gap: '14px',
              flexWrap: 'wrap'
            }}
          >
            <div>
              <span className="eyebrow">
                TIME REMAINING
              </span>

              <h2
                style={{
                  marginBottom: 0
                }}
              >
                {
                  formatTime(
                    timeLeft ?? 0
                  )
                }
              </h2>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap'
              }}
            >
              <span
                className="tag"
                style={{
                  color: '#5eead4'
                }}
              >
                Answered {answeredCount}
              </span>

              <span
                className="tag"
                style={{
                  color: '#fbbf24'
                }}
              >
                Review {reviewCount}
              </span>

              <span className="tag">
                Unanswered{' '}
                {unansweredCount}
              </span>
            </div>

            <button
              type="button"
              className="secondary-btn"
              disabled={
                examSubmitting
              }
              onClick={
                () =>
                  submitExam(false)
              }
            >
              {
                examSubmitting
                  ? 'Submitting...'
                  : 'Submit Exam'
              }
            </button>
          </div>
        </section>

        <section
          className="panel"
          style={{
            marginBottom: '14px'
          }}
        >
          <span className="eyebrow">
            QUESTION PALETTE
          </span>

          <div
            style={{
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap',
              margin: '12px 0'
            }}
          >
            <span
              className="tag"
              style={{
                color: '#94a3b8'
              }}
            >
              ● Not Answered
            </span>

            <span
              className="tag"
              style={{
                color: '#5eead4'
              }}
            >
              ● Answered
            </span>

            <span
              className="tag"
              style={{
                color: '#fbbf24'
              }}
            >
              ● Review
            </span>

            <span
              className="tag"
              style={{
                color: '#c4b5fd'
              }}
            >
              ● Answered + Review
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px'
            }}
          >
            {questions.map(
              (
                item,
                paletteIndex
              ) => {
                const hasAnswer =
                  typeof
                    examSelections[
                      item.id
                    ] ===
                  'number';

                const isMarked =
                  Boolean(
                    markedForReview[
                      item.id
                    ]
                  );

                const isCurrent =
                  paletteIndex ===
                  index;

                let background =
                  'rgba(255,255,255,.035)';

                let border =
                  '1px solid rgba(255,255,255,.12)';

                let color =
                  '#94a3b8';

                if (
                  hasAnswer &&
                  !isMarked
                ) {
                  background =
                    'rgba(20,184,166,.18)';

                  border =
                    '1px solid rgba(45,212,191,.55)';

                  color =
                    '#5eead4';
                }

                if (
                  !hasAnswer &&
                  isMarked
                ) {
                  background =
                    'rgba(251,191,36,.15)';

                  border =
                    '1px solid rgba(251,191,36,.55)';

                  color =
                    '#fbbf24';
                }

                if (
                  hasAnswer &&
                  isMarked
                ) {
                  background =
                    'rgba(139,92,246,.20)';

                  border =
                    '1px solid rgba(167,139,250,.70)';

                  color =
                    '#ddd6fe';
                }

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={
                      () =>
                        setIndex(
                          paletteIndex
                        )
                    }
                    style={{
                      minWidth: '44px',
                      minHeight: '42px',
                      border,
                      borderRadius:
                        '10px',
                      background,
                      color,
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow:
                        isCurrent
                          ? '0 0 0 2px #f8fafc'
                          : 'none'
                    }}
                  >
                    {
                      paletteIndex +
                      1
                    }
                  </button>
                );
              }
            )}
          </div>

          <p
            style={{
              marginBottom: 0
            }}
          >
            White outline shows the
            current question.
          </p>
        </section>

        <section className="quiz-card">
          <div className="quiz-meta">
            <div>
              <span>
                {q.subject}
              </span>

              {q.topic && (
                <small
                  style={{
                    display: 'block',
                    marginTop: '4px'
                  }}
                >
                  {q.topic}
                </small>
              )}
            </div>

            <strong>
              Question{' '}
              {index + 1}/
              {questions.length}
            </strong>
          </div>

          <div className="progress-track">
            <span
              style={{
                width:
                  `${
                    (
                      (
                        index + 1
                      ) /
                      questions.length
                    ) *
                    100
                  }%`
              }}
            />
          </div>

          <div
            className="tag-row"
            style={{
              marginTop: '14px'
            }}
          >
            <span className="tag">
              {q.difficulty}
            </span>

            <span className="tag">
              CSE Exam
            </span>

            {q.is_pyq && (
              <span className="tag">
                PYQ{' '}
                {q.pyq_year || ''}
              </span>
            )}

            {currentMarked && (
              <span
                className="tag"
                style={{
                  color: '#fbbf24',
                  border:
                    '1px solid rgba(251,191,36,.55)'
                }}
              >
                ★ Marked for Review
              </span>
            )}
          </div>

          <h2>
            {q.question}
          </h2>

          <div className="option-list">
            {q.options.map(
              (
                option,
                optionIndex
              ) => {
                const isChosen =
                  chosen ===
                  optionIndex;

                return (
                  <button
                    key={
                      `${q.id}-${optionIndex}`
                    }
                    className="option"
                    onClick={
                      () =>
                        answerExamQuestion(
                          optionIndex
                        )
                    }
                    style={{
                      border:
                        isChosen
                          ? '2px solid #2dd4bf'
                          : undefined,

                      background:
                        isChosen
                          ? 'rgba(20,184,166,.12)'
                          : undefined
                    }}
                  >
                    <span>
                      {
                        String.fromCharCode(
                          65 +
                            optionIndex
                        )
                      }
                    </span>

                    {option}
                  </button>
                );
              }
            )}
          </div>

          <div
            style={{
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap',
              marginTop: '18px'
            }}
          >
            <button
              type="button"
              className="secondary-btn"
              disabled={
                index === 0
              }
              onClick={
                () =>
                  setIndex(
                    current =>
                      Math.max(
                        0,
                        current - 1
                      )
                  )
              }
            >
              Previous
            </button>

            <button
              type="button"
              className="secondary-btn"
              disabled={
                typeof chosen !==
                'number'
              }
              onClick={
                clearExamResponse
              }
            >
              Clear Response
            </button>

            <button
              type="button"
              onClick={
                toggleMarkForReview
              }
              style={{
                border:
                  currentMarked
                    ? '1px solid rgba(251,191,36,.70)'
                    : '1px solid rgba(251,191,36,.40)',

                borderRadius:
                  '12px',

                background:
                  currentMarked
                    ? 'rgba(251,191,36,.18)'
                    : 'transparent',

                color:
                  '#fbbf24',

                padding:
                  '10px 14px',

                fontWeight:
                  750,

                cursor:
                  'pointer'
              }}
            >
              {
                currentMarked
                  ? '★ Remove Review Mark'
                  : '☆ Mark for Review'
              }
            </button>

            {index <
            questions.length - 1 ? (
              <button
                type="button"
                className="primary-btn"
                onClick={
                  () =>
                    setIndex(
                      current =>
                        Math.min(
                          questions.length -
                            1,
                          current + 1
                        )
                    )
                }
              >
                Save & Next
              </button>
            ) : (
              <button
                type="button"
                className="primary-btn"
                disabled={
                  examSubmitting
                }
                onClick={
                  () =>
                    submitExam(false)
                }
              >
                {
                  examSubmitting
                    ? 'Submitting...'
                    : 'Submit Exam'
                }
              </button>
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-wrap">
      <TopBar
        title="Prelims Practice"
        subtitle="Learn from every answer"
      />

      <section className="quiz-card">
        <div className="quiz-meta">
          <div>
            <span>
              {q.subject}
            </span>

            {q.topic && (
              <small
                style={{
                  display: 'block',
                  marginTop: '4px'
                }}
              >
                {q.topic}
              </small>
            )}
          </div>

          <strong>
            {index + 1}/
            {questions.length}
          </strong>
        </div>

        <div className="progress-track">
          <span
            style={{
              width:
                `${
                  (
                    (
                      index + 1
                    ) /
                    questions.length
                  ) *
                  100
                }%`
            }}
          />
        </div>

        <div
          className="tag-row"
          style={{
            marginTop: '14px'
          }}
        >
          <span className="tag">
            {q.difficulty}
          </span>

          {origin === 'cse' && (
            <span className="tag">
              CSE / General
            </span>
          )}

          {origin === 'upsc' && (
            <span className="tag">
              UPSC Value Add
            </span>
          )}

          {origin === 'state' && (
            <span className="tag">
              State PSC
            </span>
          )}

          {q.is_pyq && (
            <span className="tag">
              PYQ{' '}
              {q.pyq_year || ''}
            </span>
          )}

          {q.upsc_exam_name && (
            <span className="tag">
              {q.upsc_exam_name}
            </span>
          )}

          {q.upsc_exam_cycle && (
            <span className="tag">
              Cycle{' '}
              {q.upsc_exam_cycle}
            </span>
          )}

          {q.upsc_exam_year && (
            <span className="tag">
              {q.upsc_exam_year}
            </span>
          )}

          {q.state_psc_state && (
            <span className="tag">
              {q.state_psc_state}
            </span>
          )}

          {q.state_psc_exam_name && (
            <span className="tag">
              {
                q.state_psc_exam_name
              }
            </span>
          )}

          {q.state_psc_year && (
            <span className="tag">
              {q.state_psc_year}
            </span>
          )}
        </div>

        <h2>
          {q.question}
        </h2>

        <div className="option-list">
          {q.options.map(
            (
              option,
              optionIndex
            ) => {
              const state =
                selected === null
                  ? ''
                  : optionIndex ===
                    q.correct_index
                  ? 'correct'
                  : selected ===
                    optionIndex
                  ? 'wrong'
                  : 'muted';

              return (
                <button
                  key={
                    `${q.id}-${optionIndex}`
                  }
                  className={
                    `option ${state}`
                  }
                  onClick={
                    () =>
                      answerPracticeQuestion(
                        optionIndex
                      )
                  }
                >
                  <span>
                    {
                      String.fromCharCode(
                        65 +
                          optionIndex
                      )
                    }
                  </span>

                  {option}
                </button>
              );
            }
          )}
        </div>

        {selected !== null && (
          <div className="explanation">
            <strong>
              Explanation
            </strong>

            <p>
              {q.explanation}
            </p>

            {q.upsc_exam_name && (
              <div
                style={{
                  marginTop: '12px'
                }}
              >
                <strong>
                  UPSC Examination
                  Reference
                </strong>

                <p>
                  {
                    q.upsc_exam_name
                  }

                  {
                    q.upsc_exam_cycle
                      ? ` ${q.upsc_exam_cycle}`
                      : ''
                  }

                  {
                    q.upsc_exam_year
                      ? ` • ${q.upsc_exam_year}`
                      : ''
                  }

                  {
                    q.upsc_exam_stage
                      ? ` • ${q.upsc_exam_stage}`
                      : ''
                  }

                  {
                    q.upsc_exam_paper
                      ? ` • ${q.upsc_exam_paper}`
                      : ''
                  }
                </p>
              </div>
            )}

            {q.state_psc_state && (
              <div
                style={{
                  marginTop: '12px'
                }}
              >
                <strong>
                  State PSC Reference
                </strong>

                <p>
                  {
                    q.state_psc_state
                  }

                  {
                    q.state_psc_name
                      ? ` • ${q.state_psc_name}`
                      : ''
                  }
                </p>

                {q.state_psc_exam_name && (
                  <p>
                    Examination:{' '}

                    <strong>
                      {
                        q.state_psc_exam_name
                      }
                    </strong>
                  </p>
                )}

                <p>
                  {
                    q.state_psc_year
                      ? `Year: ${q.state_psc_year}`
                      : ''
                  }

                  {
                    q.state_psc_stage
                      ? ` • ${q.state_psc_stage}`
                      : ''
                  }

                  {
                    q.state_psc_paper
                      ? ` • ${q.state_psc_paper}`
                      : ''
                  }
                </p>
              </div>
            )}

            {q.source && (
              <p>
                <small>
                  Source:{' '}
                  {q.source}
                </small>
              </p>
            )}

            {q.source_url && (
              <p>
                <a
                  href={
                    q.source_url
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Open source reference
                </a>
              </p>
            )}

            <div
              style={{
                marginTop: '16px',
                marginBottom:
                  '16px'
              }}
            >
              <PrelimsBookmarkButton
                questionId={
                  q.id
                }
              />
            </div>

            <button
              className="primary-btn"
              onClick={
                nextPracticeQuestion
              }
            >
              {
                index ===
                questions.length - 1
                  ? 'See Result'
                  : 'Next Question'
              }
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

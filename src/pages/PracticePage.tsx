import {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  TopBar
} from '../components/TopBar';

import {
  supabase
} from '../lib/supabase';


type QuestionOrigin =
  | 'cse'
  | 'upsc'
  | 'state';

type SessionMode =
  | 'practice'
  | 'exam';

type SessionSize =
  | '10'
  | '20'
  | '50'
  | '100'
  | 'all';

type Difficulty =
  | 'easy'
  | 'medium'
  | 'hard';


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


/*
 * CSE PRELIMS PATTERN
 *
 * 100 questions = 200 marks
 * 120 minutes
 * Correct = +2
 * Wrong = -1/3 of question marks
 */

const CSE_MARKS_PER_QUESTION = 2;

const CSE_NEGATIVE_MARK =
  CSE_MARKS_PER_QUESTION / 3;

const CSE_SECONDS_PER_QUESTION = 72;


/*
 * QUESTION ORIGIN
 */

function getQuestionOrigin(
  item: LiveQuestion
): QuestionOrigin {

  if (item.state_psc_state) {
    return 'state';
  }

  if (item.upsc_exam_name) {
    return 'upsc';
  }

  return 'cse';
}


/*
 * RANDOMIZE QUESTIONS
 */

function shuffleQuestions(
  items: LiveQuestion[]
) {

  const shuffled = [
    ...items
  ];

  for (
    let i =
      shuffled.length - 1;
    i > 0;
    i--
  ) {

    const j =
      Math.floor(
        Math.random() *
        (i + 1)
      );

    const temp =
      shuffled[i];

    shuffled[i] =
      shuffled[j];

    shuffled[j] =
      temp;
  }

  return shuffled;
}


/*
 * TIME DISPLAY
 */

function formatTime(
  seconds: number
) {

  const safeSeconds =
    Math.max(
      0,
      seconds
    );

  const hours =
    Math.floor(
      safeSeconds /
      3600
    );

  const minutes =
    Math.floor(
      (
        safeSeconds %
        3600
      ) /
      60
    );

  const remainingSeconds =
    safeSeconds %
    60;

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


/*
 * ROUND
 */

function roundNumber(
  value: number,
  decimals = 2
) {

  const multiplier =
    10 ** decimals;

  return (
    Math.round(
      value *
      multiplier
    ) /
    multiplier
  );
}


export function PracticePage() {

  /*
   * DATABASE
   */

  const [
    allQuestions,
    setAllQuestions
  ] =
    useState<LiveQuestion[]>([]);


  /*
   * ACTIVE SESSION
   */

  const [
    questions,
    setQuestions
  ] =
    useState<LiveQuestion[]>([]);

  const [
    practiceStarted,
    setPracticeStarted
  ] =
    useState(false);

  const [
    sessionMode,
    setSessionMode
  ] =
    useState<SessionMode>(
      'practice'
    );


  /*
   * QUIZ
   */

  const [
    index,
    setIndex
  ] =
    useState(0);

  const [
    selected,
    setSelected
  ] =
    useState<number | null>(
      null
    );

  const [
    score,
    setScore
  ] =
    useState(0);

  const [
    answers,
    setAnswers
  ] =
    useState<AnswerRecord[]>([]);

  const [
    finished,
    setFinished
  ] =
    useState(false);


  /*
   * EXAM MODE
   */

  const [
    examSelections,
    setExamSelections
  ] =
    useState<
      Record<string, number>
    >({});

  const [
    timeLeft,
    setTimeLeft
  ] =
    useState<number | null>(
      null
    );

  const [
    timeLimitSeconds,
    setTimeLimitSeconds
  ] =
    useState(0);

  const [
    sessionStartedAt,
    setSessionStartedAt
  ] =
    useState<number | null>(
      null
    );

  const [
    examResult,
    setExamResult
  ] =
    useState<ExamResult | null>(
      null
    );

  const [
    showExamReview,
    setShowExamReview
  ] =
    useState(false);


  /*
   * PAGE
   */

  const [
    loading,
    setLoading
  ] =
    useState(true);

  const [
    error,
    setError
  ] =
    useState('');

  const [
    setupMessage,
    setSetupMessage
  ] =
    useState('');

  const [
    savingResult,
    setSavingResult
  ] =
    useState(false);

  const [
    resultMessage,
    setResultMessage
  ] =
    useState('');

  const [
    attemptSaved,
    setAttemptSaved
  ] =
    useState(false);


  /*
   * MAIN FILTERS
   */

  const [
    originFilter,
    setOriginFilter
  ] =
    useState<
      'all' |
      QuestionOrigin
    >('all');

  const [
    searchText,
    setSearchText
  ] =
    useState('');

  const [
    subjectFilter,
    setSubjectFilter
  ] =
    useState('all');

  const [
    topicFilter,
    setTopicFilter
  ] =
    useState('all');

  const [
    difficultyFilter,
    setDifficultyFilter
  ] =
    useState<
      'all' |
      Difficulty
    >('all');

  const [
    typeFilter,
    setTypeFilter
  ] =
    useState<
      'all' |
      'practice' |
      'pyq'
    >('all');

  const [
    csePyqYearFilter,
    setCsePyqYearFilter
  ] =
    useState('all');

  const [
    sessionSize,
    setSessionSize
  ] =
    useState<SessionSize>(
      '10'
    );


  /*
   * OTHER UPSC FILTERS
   */

  const [
    upscExamFilter,
    setUpscExamFilter
  ] =
    useState('all');

  const [
    upscCycleFilter,
    setUpscCycleFilter
  ] =
    useState('all');

  const [
    upscYearFilter,
    setUpscYearFilter
  ] =
    useState('all');


  /*
   * STATE PSC FILTERS
   */

  const [
    stateFilter,
    setStateFilter
  ] =
    useState('all');

  const [
    stateExamFilter,
    setStateExamFilter
  ] =
    useState('all');

  const [
    stateYearFilter,
    setStateYearFilter
  ] =
    useState('all');


  /*
   * LOAD QUESTIONS
   */

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
        .select(
          QUESTION_SELECT
        )
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
        (
          data || []
        ).map(
          item => ({

            id:
              item.id,

            question:
              item.question,

            options:
              Array.isArray(
                item.options
              )
                ? item.options.map(
                    option =>
                      String(option)
                  )
                : [],

            correct_index:
              item.correct_index,

            explanation:
              item.explanation,

            subject:
              item.subject,

            difficulty:
              item.difficulty as
                Difficulty,

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

    resetActiveSession();

    setLoading(false);
  }


  useEffect(
    () => {
      loadQuestions();
    },
    []
  );


  /*
   * EXAM TIMER
   */

  useEffect(
    () => {

      if (
        !practiceStarted ||
        sessionMode !==
          'exam' ||
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

                return (
                  current - 1
                );
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


  /*
   * AUTOMATIC SUBMISSION
   */

  useEffect(
    () => {

      if (
        practiceStarted &&
        sessionMode ===
          'exam' &&
        !finished &&
        timeLeft === 0
      ) {

        submitExam(true);
      }

    },
    [
      timeLeft,
      practiceStarted,
      sessionMode,
      finished
    ]
  );


  /*
   * RESET ACTIVE SESSION ONLY
   */

  function resetActiveSession() {

    setQuestions([]);

    setPracticeStarted(false);

    setIndex(0);

    setSelected(null);

    setScore(0);

    setAnswers([]);

    setFinished(false);

    setExamSelections({});

    setTimeLeft(null);

    setTimeLimitSeconds(0);

    setSessionStartedAt(null);

    setExamResult(null);

    setShowExamReview(false);

    setAttemptSaved(false);

    setResultMessage('');
  }


  /*
   * SUBJECTS
   */

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
      [
        allQuestions
      ]
    );


  /*
   * TOPICS
   */

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


  /*
   * CSE PYQ YEARS
   */

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
                  ) ===
                    'cse' &&
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


  /*
   * UPSC OPTIONS
   */

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
      [
        allQuestions
      ]
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


  /*
   * STATE OPTIONS
   */

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
      [
        allQuestions
      ]
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


  /*
   * FILTER QUESTIONS
   */

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
                  item.pyq_year || ''
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
              matchesStateYear
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
        stateYearFilter
      ]
    );


  const sessionQuestionCount =
    sessionSize ===
      'all'
      ? filteredQuestions.length
      : Math.min(
          Number(sessionSize),
          filteredQuestions.length
        );


  /*
   * CHANGE MODE
   */

  function changeSessionMode(
    mode: SessionMode
  ) {

    setSessionMode(mode);

    /*
     * CSE Exam Mode must only
     * use CSE questions.
     */

    if (mode === 'exam') {

      changeOriginFilter(
        'cse'
      );
    }
  }


  /*
   * CHANGE ORIGIN
   */

  function changeOriginFilter(
    value:
      'all' |
      QuestionOrigin
  ) {

    setOriginFilter(value);

    /*
     * Leaving CSE automatically
     * returns to Practice Mode.
     */

    if (
      value !== 'cse'
    ) {

      setSessionMode(
        'practice'
      );

      setCsePyqYearFilter(
        'all'
      );
    }

    if (
      value !== 'upsc'
    ) {

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

    if (
      value !== 'state'
    ) {

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


  /*
   * CHANGE TYPE
   */

  function changeTypeFilter(
    value:
      'all' |
      'practice' |
      'pyq'
  ) {

    setTypeFilter(value);

    if (
      value !== 'pyq'
    ) {

      setCsePyqYearFilter(
        'all'
      );
    }
  }


  /*
   * RESET FILTERS
   */

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

    setSetupMessage('');
  }


  /*
   * PRACTICE CONFIG
   */

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


  /*
   * START SESSION
   */

  function startPractice() {

    if (
      filteredQuestions.length === 0
    ) {

      setSetupMessage(
        'No published questions match these filters.'
      );

      return;
    }

    if (
      sessionMode ===
        'exam' &&
      originFilter !==
        'cse'
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
      sessionSize ===
        'all'
        ? randomized
        : randomized.slice(
            0,
            Number(
              sessionSize
            )
          );

    const now =
      Date.now();

    setQuestions(
      selectedSet
    );

    setIndex(0);

    setSelected(null);

    setScore(0);

    setAnswers([]);

    setFinished(false);

    setExamSelections({});

    setExamResult(null);

    setShowExamReview(false);

    setAttemptSaved(false);

    setResultMessage('');

    setSetupMessage('');

    setSessionStartedAt(
      now
    );

    if (
      sessionMode ===
        'exam'
    ) {

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

    setPracticeStarted(
      true
    );
  }


  /*
   * PRACTICE MODE ANSWER
   */

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
      currentQuestion.correct_index;

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
            currentQuestion.correct_index,

          is_correct:
            isCorrect
        }
      ]
    );
  }


  /*
   * EXAM MODE ANSWER
   */

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


  /*
   * CLEAR EXAM RESPONSE
   */

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


  /*
   * SESSION DURATION
   */

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


  /*
   * SAVE ATTEMPT
   */

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
    durationSeconds:
      number,
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
      subjectsInSession.length ===
        1
        ? subjectsInSession[0]
        : 'Mixed';

    const attempted =
      correct +
      incorrect;

    const percentage =
      mode === 'exam' &&
      maxMarks &&
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


  /*
   * FINISH PRACTICE MODE
   */

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


  /*
   * NEXT PRACTICE QUESTION
   */

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


  /*
   * SUBMIT EXAM
   */

  async function submitExam(
    automatic = false
  ) {

    if (
      finished ||
      questions.length === 0
    ) {
      return;
    }

    if (!automatic) {

      const confirmed =
        window.confirm(
          'Submit your exam now? You will not be able to change answers after submission.'
        );

      if (!confirmed) {
        return;
      }
    }

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

    /*
     * Stop timer immediately
     */

    setTimeLeft(
      automatic
        ? 0
        : timeLeft
    );

    setScore(correct);

    setAnswers(records);

    setExamResult(result);

    setFinished(true);

    if (automatic) {

      setResultMessage(
        'Time expired. Your exam was submitted automatically.'
      );
    }

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
  }


  /*
   * RESTART SAME SET
   */

  function restartSameSet() {

    setIndex(0);

    setSelected(null);

    setScore(0);

    setAnswers([]);

    setFinished(false);

    setExamSelections({});

    setExamResult(null);

    setShowExamReview(false);

    setAttemptSaved(false);

    setResultMessage('');

    setSessionStartedAt(
      Date.now()
    );

    if (
      sessionMode ===
        'exam'
    ) {

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

      setTimeLeft(null);
    }
  }


  /*
   * CHANGE PRACTICE SET
   */

  function changePracticeSet() {

    resetActiveSession();
  }


  /*
   * LOADING
   */

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


  /*
   * ERROR
   */

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


  /*
   * SETUP SCREEN
   */

  if (!practiceStarted) {

    return (

      <div className="page-wrap">

        <TopBar
          title="Prelims Practice"
          subtitle="Build your question set"
        />

        <section
          className="panel admin-form"
        >

          <span className="eyebrow">
            PRELIMS QUESTION BANK
          </span>

          <h2>
            Build Your Practice Set
          </h2>


          {/* SESSION MODE */}

          <div
            style={{
              marginTop: '16px',
              padding: '16px',
              border:
                '1px solid rgba(255,255,255,.10)',
              borderRadius: '14px'
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

                <option value="practice">
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
                  +2 for correct,
                  -0.6667 for wrong,
                  no penalty for
                  unanswered questions.
                </p>

                <p>
                  Time is scaled from
                  the 100-question,
                  120-minute CSE
                  Prelims pattern.
                </p>

                <p>
                  Answers and explanations
                  remain hidden until
                  submission.
                </p>

              </div>

            )}

          </div>


          {/* ORIGIN */}

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


          {/* SEARCH */}

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
              Search question, topic,
              tag, examination, year
              or source.
            </small>

          </label>


          {/* SUBJECT + TOPIC */}

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


          {/* DIFFICULTY + TYPE */}

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


          {/* CSE PYQ */}

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
                borderRadius: '14px'
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


          {/* SESSION SIZE */}

          <div
            style={{
              marginTop: '14px',
              padding: '16px',
              border:
                '1px solid rgba(255,255,255,.10)',
              borderRadius: '14px'
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
                Estimated exam time:{' '}
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


          {/* OTHER UPSC */}

          {originFilter ===
            'upsc' && (

            <div
              style={{
                marginTop: '18px',
                padding: '16px',
                border:
                  '1px solid rgba(255,255,255,.10)',
                borderRadius: '14px'
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


          {/* STATE PSC */}

          {originFilter ===
            'state' && (

            <div
              style={{
                marginTop: '18px',
                padding: '16px',
                border:
                  '1px solid rgba(255,255,255,.10)',
                borderRadius: '14px'
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


          {/* COUNT */}

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
              questions match your filters
            </strong>

            <p>
              Session questions:{' '}

              <strong>
                {
                  sessionQuestionCount
                }
              </strong>
            </p>

            {sessionMode ===
              'exam' && (

              <>
                <p>
                  Maximum marks:{' '}
                  <strong>
                    {
                      sessionQuestionCount *
                      CSE_MARKS_PER_QUESTION
                    }
                  </strong>
                </p>

                <p>
                  Time limit:{' '}
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
              onClick={
                startPractice
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


  /*
   * RESULT SCREEN
   */

  if (finished) {

    /*
     * EXAM RESULT
     */

    if (
      sessionMode ===
        'exam' &&
      examResult
    ) {

      const markPercentage =
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
              {markPercentage}%
            </h3>

            <p>
              CSE-style negative
              marking has been applied.
            </p>


            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit,minmax(130px,1fr))',
                gap: '10px',
                marginTop: '18px',
                textAlign: 'left'
              }}
            >

              <div className="callout">
                <strong>
                  {
                    questions.length
                  }
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
                  -
                  {
                    examResult.negativeMarks
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
                      examResult.timeUsedSeconds
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
                Saving exam result...
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
                justifyContent: 'center',
                marginTop: '18px'
              }}
            >

              <button
                className="primary-btn"
                onClick={() =>
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
                      record?.selected_index ??
                      null;

                    return (

                      <article
                        key={
                          question.id
                        }
                        style={{
                          padding: '16px',
                          border:
                            '1px solid rgba(255,255,255,.10)',
                          borderRadius: '14px'
                        }}
                      >

                        <strong>
                          Question{' '}
                          {
                            questionIndex +
                            1
                          }
                        </strong>

                        <h3>
                          {
                            question.question
                          }
                        </h3>

                        <p>
                          Your answer:{' '}

                          <strong>
                            {
                              selectedIndex ===
                                null
                                ? 'Not Answered'
                                : String.fromCharCode(
                                    65 +
                                    selectedIndex
                                  )
                            }
                          </strong>
                        </p>

                        <p>
                          Correct answer:{' '}

                          <strong>
                            {
                              String.fromCharCode(
                                65 +
                                question.correct_index
                              )
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
                                : record?.is_correct
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
                              question.explanation
                            }
                          </p>

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


    /*
     * PRACTICE RESULT
     */

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
              justifyContent: 'center'
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


  /*
   * ACTIVE QUESTION
   */

  const q =
    questions[index];

  if (!q) {
    return null;
  }

  const origin =
    getQuestionOrigin(q);


  /*
   * EXAM MODE SCREEN
   */

  if (
    sessionMode ===
      'exam'
  ) {

    const chosen =
      examSelections[
        q.id
      ];

    const answeredCount =
      Object.keys(
        examSelections
      ).length;

    return (

      <div className="page-wrap">

        <TopBar
          title="CSE Exam Mode"
          subtitle="Prelims simulation"
        />


        {/* EXAM HEADER */}

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
              gap: '12px',
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
                    timeLeft || 0
                  )
                }
              </h2>

            </div>


            <div>

              <strong>
                Answered:{' '}
                {
                  answeredCount
                }
                /
                {
                  questions.length
                }
              </strong>

            </div>


            <button
              className="secondary-btn"
              onClick={() =>
                submitExam(false)
              }
            >
              Submit Exam
            </button>

          </div>

        </section>


        {/* QUESTION PALETTE */}

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
              flexWrap: 'wrap',
              gap: '8px',
              marginTop: '10px'
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

                const isCurrent =
                  paletteIndex ===
                  index;

                return (

                  <button
                    key={
                      item.id
                    }
                    type="button"
                    className="secondary-btn"
                    onClick={() =>
                      setIndex(
                        paletteIndex
                      )
                    }
                    style={{
                      minWidth: '44px',
                      padding: '8px',
                      opacity:
                        hasAnswer
                          ? 1
                          : 0.6,
                      outline:
                        isCurrent
                          ? '2px solid currentColor'
                          : 'none'
                    }}
                    title={
                      hasAnswer
                        ? 'Answered'
                        : 'Not answered'
                    }
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

          <small>
            Brighter numbers are answered.
            Outlined number is the current
            question.
          </small>

        </section>


        {/* QUESTION */}

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
              marginBottom: '12px'
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
                {
                  q.pyq_year || ''
                }
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
                    onClick={() =>
                      answerExamQuestion(
                        optionIndex
                      )
                    }
                    style={{
                      border:
                        isChosen
                          ? '2px solid currentColor'
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
              onClick={() =>
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
              onClick={
                clearExamResponse
              }
              disabled={
                typeof chosen !==
                'number'
              }
            >
              Clear Response
            </button>


            {index <
              questions.length -
                1 ? (

              <button
                type="button"
                className="primary-btn"
                onClick={() =>
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
                onClick={() =>
                  submitExam(false)
                }
              >
                Submit Exam
              </button>

            )}

          </div>

        </section>

      </div>
    );
  }


  /*
   * PRACTICE MODE SCREEN
   */

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
            marginBottom: '12px'
          }}
        >

          <span className="tag">
            {q.difficulty}
          </span>

          {origin ===
            'cse' && (

            <span className="tag">
              CSE / General
            </span>

          )}

          {origin ===
            'upsc' && (

            <span className="tag">
              UPSC Value Add
            </span>

          )}

          {origin ===
            'state' && (

            <span className="tag">
              State PSC
            </span>

          )}

          {q.is_pyq && (

            <span className="tag">
              PYQ{' '}
              {
                q.pyq_year || ''
              }
            </span>

          )}

          {q.upsc_exam_name && (

            <span className="tag">
              {
                q.upsc_exam_name
              }
            </span>

          )}

          {q.upsc_exam_cycle && (

            <span className="tag">
              Cycle{' '}
              {
                q.upsc_exam_cycle
              }
            </span>

          )}

          {q.upsc_exam_year && (

            <span className="tag">
              {
                q.upsc_exam_year
              }
            </span>

          )}

          {q.state_psc_state && (

            <span className="tag">
              {
                q.state_psc_state
              }
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
              {
                q.state_psc_year
              }
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
                  onClick={() =>
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
                  UPSC Examination Reference
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
                marginTop: '16px'
              }}
            >

              <button
                className="primary-btn"
                onClick={
                  nextPracticeQuestion
                }
              >
                {
                  index ===
                  questions.length - 1
                    ? 'See result'
                    : 'Next question'
                }
              </button>

            </div>

          </div>

        )}

      </section>

    </div>
  );
}

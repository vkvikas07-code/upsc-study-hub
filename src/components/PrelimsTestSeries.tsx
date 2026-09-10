import {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  PrelimsBookmarkButton
} from './PrelimsBookmarkButton';

import {
  supabase
} from '../lib/supabase';


type TestType =
  | 'sectional'
  | 'full_length'
  | 'pyq'
  | 'custom';


type ViewMode =
  | 'library'
  | 'instructions'
  | 'live'
  | 'result'
  | 'review';


type TestRow = {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  paper: string | null;
  test_type: TestType;
  marks_per_question: number;
  negative_marks: number;
  instructions: string | null;
  created_at: string;
};


type TestQuestionMapping = {
  question_id: string;
  position: number;
};


type LiveQuestion = {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;

  subject: string;
  topic: string | null;
  difficulty: string;

  is_pyq: boolean;
  pyq_year: number | null;

  source: string | null;
};


type AnswerRecord = {
  question_id: string;
  selected_index: number | null;
  correct_index: number;
  is_correct: boolean;
  marked_for_review: boolean;
};


type TestResult = {
  attempted: number;
  correct: number;
  incorrect: number;
  unanswered: number;

  positiveMarks: number;
  negativeMarks: number;
  marksObtained: number;
  maxMarks: number;

  scorePercent: number;

  durationSeconds: number;
  timeLimitSeconds: number;

  answers: AnswerRecord[];
};


type TestAttemptSummary = {
  attempts: number;
  bestScore: number | null;
  latestScore: number | null;
  lastCompletedAt: string | null;
};


const TEST_SELECT = `
  id,
  title,
  description,
  duration_minutes,
  paper,
  test_type,
  marks_per_question,
  negative_marks,
  instructions,
  created_at
`;


const QUESTION_SELECT = `
  id,
  question,
  options,
  correct_index,
  explanation,
  subject,
  topic,
  difficulty,
  is_pyq,
  pyq_year,
  source
`;


function safeNumber(
  value: unknown,
  fallback = 0
) {

  const number =
    Number(
      value
    );


  return Number.isFinite(
    number
  )
    ? number
    : fallback;
}


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


function formatScore(
  value:
    number |
    null
) {

  if (
    value ===
    null
  ) {

    return '—';
  }


  return (
    `${roundNumber(
      value,
      1
    )}%`
  );
}


function formatTime(
  seconds: number
) {

  const safe =
    Math.max(
      0,
      Math.floor(
        seconds
      )
    );


  const hours =
    Math.floor(
      safe /
      3600
    );


  const minutes =
    Math.floor(
      (
        safe %
        3600
      ) /
      60
    );


  const remaining =
    safe %
    60;


  if (
    hours >
    0
  ) {

    return (
      `${hours}:` +
      `${String(
        minutes
      ).padStart(
        2,
        '0'
      )}:` +
      `${String(
        remaining
      ).padStart(
        2,
        '0'
      )}`
    );
  }


  return (
    `${minutes}:` +
    `${String(
      remaining
    ).padStart(
      2,
      '0'
    )}`
  );
}


function testTypeLabel(
  type: TestType
) {

  switch (
    type
  ) {

    case 'sectional':
      return 'Sectional Test';

    case 'full_length':
      return 'Full-Length Mock';

    case 'pyq':
      return 'PYQ Test';

    case 'custom':
      return 'Custom Test';
  }
}


function formatDate(
  value:
    string |
    null
) {

  if (!value) {

    return '';
  }


  const date =
    new Date(
      value
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return '';
  }


  return date
    .toLocaleDateString(
      'en-IN',
      {
        day:
          '2-digit',

        month:
          'short',

        year:
          'numeric'
      }
    );
}


function optionLetter(
  index: number
) {

  return String
    .fromCharCode(
      65 +
      index
    );
}


export function PrelimsTestSeries() {

  /*
   * TEST LIBRARY
   */

  const [
    tests,
    setTests
  ] =
    useState<TestRow[]>(
      []
    );


  const [
    questionCounts,
    setQuestionCounts
  ] =
    useState<
      Record<
        string,
        number
      >
    >({});


  const [
    attemptSummaries,
    setAttemptSummaries
  ] =
    useState<
      Record<
        string,
        TestAttemptSummary
      >
    >({});


  const [
    signedIn,
    setSignedIn
  ] =
    useState(
      false
    );


  const [
    loading,
    setLoading
  ] =
    useState(
      true
    );


  const [
    loadingTestId,
    setLoadingTestId
  ] =
    useState<
      string |
      null
    >(
      null
    );


  const [
    message,
    setMessage
  ] =
    useState('');


  /*
   * FILTERS
   */

  const [
    search,
    setSearch
  ] =
    useState('');


  const [
    paperFilter,
    setPaperFilter
  ] =
    useState(
      'all'
    );


  const [
    typeFilter,
    setTypeFilter
  ] =
    useState(
      'all'
    );


  const [
    attemptFilter,
    setAttemptFilter
  ] =
    useState(
      'all'
    );


  /*
   * ACTIVE TEST
   */

  const [
    view,
    setView
  ] =
    useState<ViewMode>(
      'library'
    );


  const [
    activeTest,
    setActiveTest
  ] =
    useState<TestRow | null>(
      null
    );


  const [
    questions,
    setQuestions
  ] =
    useState<LiveQuestion[]>(
      []
    );


  const [
    index,
    setIndex
  ] =
    useState(
      0
    );


  /*
   * ANSWERS
   */

  const [
    selections,
    setSelections
  ] =
    useState<
      Record<
        string,
        number
      >
    >({});


  const [
    markedForReview,
    setMarkedForReview
  ] =
    useState<
      Record<
        string,
        boolean
      >
    >({});


  /*
   * TIMER
   */

  const [
    timeLeft,
    setTimeLeft
  ] =
    useState(
      0
    );


  const [
    startedAt,
    setStartedAt
  ] =
    useState<number | null>(
      null
    );


  const [
    submitting,
    setSubmitting
  ] =
    useState(
      false
    );


  /*
   * RESULT
   */

  const [
    result,
    setResult
  ] =
    useState<TestResult | null>(
      null
    );


  /*
   * LOAD PUBLISHED TESTS
   */

  async function loadTests() {

    if (!supabase) {

      setMessage(
        'Supabase is not configured.'
      );

      setLoading(
        false
      );

      return;
    }


    setLoading(
      true
    );

    setMessage('');


    const {
      data,
      error
    } =
      await supabase
        .from(
          'tests'
        )
        .select(
          TEST_SELECT
        )
        .eq(
          'published',
          true
        )
        .eq(
          'exam_stage',
          'prelims'
        )
        .order(
          'created_at',
          {
            ascending:
              false
          }
        );


    if (error) {

      console.error(
        'Unable to load Prelims tests:',
        error
      );


      setMessage(
        error.message
      );

      setLoading(
        false
      );

      return;
    }


    const rows:
      TestRow[] =
        (
          data ||
          []
        ).map(
          item => ({

            id:
              String(
                item.id
              ),

            title:
              String(
                item.title ||
                ''
              ),

            description:
              item.description
                ? String(
                    item.description
                  )
                : null,

            duration_minutes:
              safeNumber(
                item.duration_minutes,
                120
              ),

            paper:
              item.paper
                ? String(
                    item.paper
                  )
                : null,

            test_type:
              (
                item.test_type ||
                'sectional'
              ) as
                TestType,

            marks_per_question:
              safeNumber(
                item.marks_per_question,
                2
              ),

            negative_marks:
              safeNumber(
                item.negative_marks,
                0.6667
              ),

            instructions:
              item.instructions
                ? String(
                    item.instructions
                  )
                : null,

            created_at:
              String(
                item.created_at ||
                ''
              )
          })
        );


    setTests(
      rows
    );


    if (
      rows.length ===
      0
    ) {

      setQuestionCounts(
        {}
      );

      setAttemptSummaries(
        {}
      );

      setLoading(
        false
      );

      return;
    }


    const ids =
      rows.map(
        test =>
          test.id
      );


    /*
     * QUESTION COUNTS
     */

    const {
      data:
        mappingData,

      error:
        mappingError
    } =
      await supabase
        .from(
          'test_questions'
        )
        .select(
          'test_id'
        )
        .in(
          'test_id',
          ids
        );


    if (
      mappingError
    ) {

      console.error(
        'Unable to count test questions:',
        mappingError
      );

      setQuestionCounts(
        {}
      );

    } else {

      const counts:
        Record<
          string,
          number
        > = {};


      (
        mappingData ||
        []
      ).forEach(
        row => {

          const testId =
            String(
              row.test_id
            );


          counts[
            testId
          ] =
            (
              counts[
                testId
              ] ||
              0
            ) +
            1;
        }
      );


      setQuestionCounts(
        counts
      );
    }


    /*
     * CURRENT STUDENT
     */

    const {
      data: {
        user
      }
    } =
      await supabase
        .auth
        .getUser();


    setSignedIn(
      Boolean(
        user
      )
    );


    if (!user) {

      setAttemptSummaries(
        {}
      );

      setLoading(
        false
      );

      return;
    }


    /*
     * STUDENT'S COMPLETED
     * TEST SERIES ATTEMPTS
     */

    const {
      data:
        attemptData,

      error:
        attemptError
    } =
      await supabase
        .from(
          'test_attempts'
        )
        .select(
          `
          test_id,
          score,
          completed_at
          `
        )
        .eq(
          'user_id',
          user.id
        )
        .in(
          'test_id',
          ids
        )
        .not(
          'completed_at',
          'is',
          null
        )
        .order(
          'completed_at',
          {
            ascending:
              false
          }
        );


    if (
      attemptError
    ) {

      console.error(
        'Unable to load Test Series attempt summaries:',
        attemptError
      );

      setAttemptSummaries(
        {}
      );

      setLoading(
        false
      );

      return;
    }


    const summaries:
      Record<
        string,
        TestAttemptSummary
      > = {};


    (
      attemptData ||
      []
    ).forEach(
      item => {

        const testId =
          String(
            item.test_id
          );


        const score =
          safeNumber(
            item.score
          );


        const completedAt =
          item.completed_at
            ? String(
                item.completed_at
              )
            : null;


        const previous =
          summaries[
            testId
          ];


        if (!previous) {

          summaries[
            testId
          ] = {

            attempts:
              1,

            bestScore:
              score,

            latestScore:
              score,

            lastCompletedAt:
              completedAt
          };

          return;
        }


        previous.attempts +=
          1;


        previous.bestScore =
          previous.bestScore ===
            null
            ? score
            : Math.max(
                previous.bestScore,
                score
              );
      }
    );


    setAttemptSummaries(
      summaries
    );


    setLoading(
      false
    );
  }


  useEffect(
    () => {

      void loadTests();

    },
    []
  );


  /*
   * LIBRARY METRICS
   */

  const attemptedTests =
    useMemo(
      () =>
        tests.filter(
          test =>
            (
              attemptSummaries[
                test.id
              ]?.attempts ||
              0
            ) >
            0
        ).length,
      [
        tests,
        attemptSummaries
      ]
    );


  const totalStudentAttempts =
    useMemo(
      () =>
        Object.values(
          attemptSummaries
        ).reduce(
          (
            total,
            summary
          ) =>
            total +
            summary.attempts,
          0
        ),
      [
        attemptSummaries
      ]
    );


  /*
   * FILTER TEST LIBRARY
   */

  const visibleTests =
    useMemo(
      () => {

        const query =
          search
            .trim()
            .toLowerCase();


        return tests.filter(
          test => {

            if (
              paperFilter !==
                'all' &&
              test.paper !==
                paperFilter
            ) {

              return false;
            }


            if (
              typeFilter !==
                'all' &&
              test.test_type !==
                typeFilter
            ) {

              return false;
            }


            const attempted =
              (
                attemptSummaries[
                  test.id
                ]?.attempts ||
                0
              ) >
              0;


            if (
              attemptFilter ===
                'attempted' &&
              !attempted
            ) {

              return false;
            }


            if (
              attemptFilter ===
                'not_attempted' &&
              attempted
            ) {

              return false;
            }


            if (!query) {

              return true;
            }


            return (
              test.title
                .toLowerCase()
                .includes(
                  query
                ) ||

              (
                test.description ||
                ''
              )
                .toLowerCase()
                .includes(
                  query
                )
            );
          }
        );

      },
      [
        tests,
        search,
        paperFilter,
        typeFilter,
        attemptFilter,
        attemptSummaries
      ]
    );


  /*
   * LOAD QUESTIONS FOR TEST
   */

  async function openTest(
    test: TestRow
  ) {

    if (!supabase) {

      return;
    }


    setLoadingTestId(
      test.id
    );

    setMessage(
      'Loading test...'
    );


    const {
      data: {
        user
      }
    } =
      await supabase
        .auth
        .getUser();


    if (!user) {

      setLoadingTestId(
        null
      );

      setMessage(
        'Sign in before starting a Test Series paper.'
      );

      return;
    }


    const {
      data:
        mappingData,

      error:
        mappingError
    } =
      await supabase
        .from(
          'test_questions'
        )
        .select(
          `
          question_id,
          position
          `
        )
        .eq(
          'test_id',
          test.id
        )
        .order(
          'position',
          {
            ascending:
              true
          }
        );


    if (
      mappingError
    ) {

      setLoadingTestId(
        null
      );

      setMessage(
        mappingError.message
      );

      return;
    }


    const mappings =
      (
        mappingData ||
        []
      ) as
        TestQuestionMapping[];


    if (
      mappings.length ===
      0
    ) {

      setLoadingTestId(
        null
      );

      setMessage(
        'This test does not contain any questions yet.'
      );

      return;
    }


    const questionIds =
      mappings.map(
        mapping =>
          String(
            mapping.question_id
          )
      );


    const loadedQuestions:
      LiveQuestion[] = [];


    const chunkSize =
      200;


    for (
      let start = 0;
      start <
        questionIds.length;
      start +=
        chunkSize
    ) {

      const chunk =
        questionIds.slice(
          start,
          start +
            chunkSize
        );


      const {
        data:
          questionData,

        error:
          questionError
      } =
        await supabase
          .from(
            'questions'
          )
          .select(
            QUESTION_SELECT
          )
          .in(
            'id',
            chunk
          )
          .eq(
            'status',
            'published'
          );


      if (
        questionError
      ) {

        setLoadingTestId(
          null
        );

        setMessage(
          questionError.message
        );

        return;
      }


      (
        questionData ||
        []
      ).forEach(
        item => {

          loadedQuestions.push({

            id:
              String(
                item.id
              ),

            question:
              String(
                item.question ||
                ''
              ),

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
              safeNumber(
                item.correct_index,
                0
              ),

            explanation:
              String(
                item.explanation ||
                ''
              ),

            subject:
              String(
                item.subject ||
                'Other'
              ),

            topic:
              item.topic
                ? String(
                    item.topic
                  )
                : null,

            difficulty:
              String(
                item.difficulty ||
                'medium'
              ),

            is_pyq:
              item.is_pyq ===
              true,

            pyq_year:
              item.pyq_year
                ? safeNumber(
                    item.pyq_year
                  )
                : null,

            source:
              item.source
                ? String(
                    item.source
                  )
                : null
          });
        }
      );
    }


    const questionMap =
      new Map<
        string,
        LiveQuestion
      >();


    loadedQuestions.forEach(
      question => {

        questionMap.set(
          question.id,
          question
        );
      }
    );


    const ordered =
      questionIds
        .map(
          questionId =>
            questionMap.get(
              questionId
            )
        )
        .filter(
          (
            question
          ): question is
            LiveQuestion =>
              Boolean(
                question
              )
        );


    if (
      ordered.length !==
      questionIds.length
    ) {

      setLoadingTestId(
        null
      );

      setMessage(
        'Some questions in this test are unavailable. Please contact the administrator.'
      );

      return;
    }


    setActiveTest(
      test
    );

    setQuestions(
      ordered
    );

    setSelections(
      {}
    );

    setMarkedForReview(
      {}
    );

    setIndex(
      0
    );

    setResult(
      null
    );

    setStartedAt(
      null
    );

    setTimeLeft(
      Math.max(
        1,
        test.duration_minutes
      ) *
      60
    );

    setView(
      'instructions'
    );

    setLoadingTestId(
      null
    );

    setMessage('');


    window.scrollTo({
      top:
        0,

      behavior:
        'smooth'
    });
  }


  /*
   * START TEST
   */

  function startTest() {

    if (
      !activeTest ||
      questions.length ===
        0
    ) {

      return;
    }


    setSelections(
      {}
    );

    setMarkedForReview(
      {}
    );

    setIndex(
      0
    );

    setResult(
      null
    );

    setTimeLeft(
      Math.max(
        1,
        activeTest
          .duration_minutes
      ) *
      60
    );

    setStartedAt(
      Date.now()
    );

    setView(
      'live'
    );


    window.scrollTo({
      top:
        0,

      behavior:
        'smooth'
    });
  }


  /*
   * TIMER
   */

  useEffect(
    () => {

      if (
        view !==
        'live'
      ) {

        return;
      }


      const timer =
        window.setInterval(
          () => {

            setTimeLeft(
              current =>
                Math.max(
                  0,
                  current -
                  1
                )
            );

          },
          1000
        );


      return () => {

        window.clearInterval(
          timer
        );
      };

    },
    [
      view
    ]
  );


  /*
   * AUTO SUBMIT
   */

  useEffect(
    () => {

      if (
        view ===
          'live' &&
        timeLeft ===
          0 &&
        questions.length >
          0 &&
        !submitting
      ) {

        void submitTest(
          true
        );
      }

    },
    [
      timeLeft,
      view,
      submitting,
      questions.length
    ]
  );


  /*
   * ANSWERS
   */

  function selectAnswer(
    questionId:
      string,
    optionIndex:
      number
  ) {

    setSelections(
      current => ({
        ...current,

        [
          questionId
        ]:
          optionIndex
      })
    );
  }


  function clearAnswer(
    questionId:
      string
  ) {

    setSelections(
      current => {

        const next =
          {
            ...current
          };


        delete next[
          questionId
        ];


        return next;
      }
    );
  }


  function toggleReview(
    questionId:
      string
  ) {

    setMarkedForReview(
      current => ({
        ...current,

        [
          questionId
        ]:
          !current[
            questionId
          ]
      })
    );
  }


  /*
   * SUBMIT TEST
   */

  async function submitTest(
    automatic = false
  ) {

    if (
      !activeTest ||
      questions.length ===
        0 ||
      submitting
    ) {

      return;
    }


    if (
      !automatic
    ) {

      const confirmed =
        window.confirm(
          'Submit this test now? You will not be able to change your answers after submission.'
        );


      if (!confirmed) {

        return;
      }
    }


    setSubmitting(
      true
    );


    let attempted =
      0;


    let correct =
      0;


    let incorrect =
      0;


    const answerRecords:
      AnswerRecord[] =
        questions.map(
          question => {

            const selectedIndex =
              selections[
                question.id
              ];


            const selected =
              selectedIndex !==
              undefined;


            const isCorrect =
              selected &&
              selectedIndex ===
                question.correct_index;


            if (
              selected
            ) {

              attempted +=
                1;


              if (
                isCorrect
              ) {

                correct +=
                  1;

              } else {

                incorrect +=
                  1;
              }
            }


            return {

              question_id:
                question.id,

              selected_index:
                selected
                  ? selectedIndex
                  : null,

              correct_index:
                question.correct_index,

              is_correct:
                isCorrect,

              marked_for_review:
                markedForReview[
                  question.id
                ] ===
                true
            };
          }
        );


    const unanswered =
      questions.length -
      attempted;


    const positiveMarks =
      roundNumber(
        correct *
        activeTest
          .marks_per_question,
        4
      );


    const negativeMarks =
      roundNumber(
        incorrect *
        activeTest
          .negative_marks,
        4
      );


    const marksObtained =
      roundNumber(
        positiveMarks -
        negativeMarks,
        4
      );


    const maxMarks =
      roundNumber(
        questions.length *
        activeTest
          .marks_per_question,
        4
      );


    const scorePercent =
      maxMarks >
      0
        ? roundNumber(
            (
              marksObtained /
              maxMarks
            ) *
              100,
            2
          )
        : 0;


    const timeLimitSeconds =
      Math.max(
        1,
        activeTest
          .duration_minutes
      ) *
      60;


    const durationSeconds =
      Math.min(
        timeLimitSeconds,
        Math.max(
          0,
          timeLimitSeconds -
          timeLeft
        )
      );


    const finalResult:
      TestResult = {

      attempted,

      correct,

      incorrect,

      unanswered,

      positiveMarks,

      negativeMarks,

      marksObtained,

      maxMarks,

      scorePercent,

      durationSeconds,

      timeLimitSeconds,

      answers:
        answerRecords
    };


    /*
     * SAVE RESULT
     */

    if (
      supabase
    ) {

      const {
        data: {
          user
        }
      } =
        await supabase
          .auth
          .getUser();


      if (
        user
      ) {

        const completedAt =
          new Date()
            .toISOString();


        const {
          error
        } =
          await supabase
            .from(
              'test_attempts'
            )
            .insert({

              user_id:
                user.id,

              test_id:
                activeTest.id,

              score:
                scorePercent,

              answers:
                answerRecords,

              started_at:
                startedAt
                  ? new Date(
                      startedAt
                    )
                      .toISOString()
                  : completedAt,

              completed_at:
                completedAt,

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

              marks_obtained:
                marksObtained,

              max_marks:
                maxMarks,

              negative_marks:
                negativeMarks,

              duration_seconds:
                durationSeconds,

              time_limit_seconds:
                timeLimitSeconds
            });


        if (
          error
        ) {

          console.error(
            'Unable to save Test Series attempt:',
            error
          );


          setMessage(
            `Result calculated, but saving failed: ${error.message}`
          );

        } else {

          setAttemptSummaries(
            current => {

              const previous =
                current[
                  activeTest.id
                ];


              const previousBest =
                previous
                  ?.bestScore ??
                null;


              return {
                ...current,

                [
                  activeTest.id
                ]: {

                  attempts:
                    (
                      previous
                        ?.attempts ||
                      0
                    ) +
                    1,

                  bestScore:
                    previousBest ===
                      null
                      ? scorePercent
                      : Math.max(
                          previousBest,
                          scorePercent
                        ),

                  latestScore:
                    scorePercent,

                  lastCompletedAt:
                    completedAt
                }
              };
            }
          );


          if (
            automatic
          ) {

            setMessage(
              'Time finished. Your test was submitted automatically.'
            );

          } else {

            setMessage(
              'Test submitted successfully.'
            );
          }
        }

      } else {

        setMessage(
          'Result calculated, but the session expired before it could be saved.'
        );
      }
    }


    setResult(
      finalResult
    );

    setView(
      'result'
    );

    setSubmitting(
      false
    );


    window.scrollTo({
      top:
        0,

      behavior:
        'smooth'
    });
  }


  /*
   * RETURN TO LIBRARY
   */

  function backToLibrary() {

    if (
      view ===
      'live'
    ) {

      const confirmed =
        window.confirm(
          'Leave this test? Your current answers will be lost.'
        );


      if (!confirmed) {

        return;
      }
    }


    setView(
      'library'
    );

    setActiveTest(
      null
    );

    setQuestions(
      []
    );

    setSelections(
      {}
    );

    setMarkedForReview(
      {}
    );

    setResult(
      null
    );

    setStartedAt(
      null
    );

    setIndex(
      0
    );

    setMessage('');


    window.scrollTo({
      top:
        0,

      behavior:
        'smooth'
    });
  }


  const currentQuestion =
    questions[
      index
    ];


  const resultAnswerMap =
    useMemo(
      () => {

        const map =
          new Map<
            string,
            AnswerRecord
          >();


        (
          result
            ?.answers ||
          []
        ).forEach(
          answer => {

            map.set(
              answer.question_id,
              answer
            );
          }
        );


        return map;

      },
      [
        result
      ]
    );


  /*
   * TEST LIBRARY
   */

  if (
    view ===
    'library'
  ) {

    return (

      <div>

        <section
          className="panel"
        >

          <span
            className="eyebrow"
          >
            PRELIMS TEST SERIES
          </span>


          <h2>
            UPSC Mock Tests
          </h2>


          <p>
            Attempt published sectional,
            full-length, PYQ and custom
            Prelims tests under timed
            exam conditions.
          </p>


          {signedIn && (
            <div
              className="metrics-grid"
              style={{
                marginTop:
                  '16px'
              }}
            >

              <article
                className="metric-card"
              >
                <div>
                  <span>
                    Available Tests
                  </span>

                  <strong>
                    {tests.length}
                  </strong>
                </div>
              </article>


              <article
                className="metric-card"
              >
                <div>
                  <span>
                    Tests Attempted
                  </span>

                  <strong>
                    {attemptedTests}
                  </strong>
                </div>
              </article>


              <article
                className="metric-card"
              >
                <div>
                  <span>
                    Total Attempts
                  </span>

                  <strong>
                    {totalStudentAttempts}
                  </strong>
                </div>
              </article>

            </div>
          )}


          <button
            type="button"
            className="secondary-btn"

            onClick={() =>
              void loadTests()
            }

            style={{
              marginTop:
                '16px'
            }}
          >
            Refresh Tests
          </button>


          {message && (

            <div
              className="callout"
              style={{
                marginTop:
                  '14px'
              }}
            >
              {message}
            </div>

          )}

        </section>


        {/* FILTERS */}

        <section
          className="panel"
          style={{
            marginTop:
              '18px'
          }}
        >

          <span
            className="eyebrow"
          >
            FIND A TEST
          </span>


          <div
            style={{
              display:
                'grid',

              gridTemplateColumns:
                'repeat(auto-fit, minmax(160px, 1fr))',

              gap:
                '10px',

              marginTop:
                '12px'
            }}
          >

            <label>
              Search

              <input
                type="search"

                value={
                  search
                }

                onChange={
                  event =>
                    setSearch(
                      event
                        .target
                        .value
                    )
                }

                placeholder="Search tests"
              />
            </label>


            <label>
              Paper

              <select
                value={
                  paperFilter
                }

                onChange={
                  event =>
                    setPaperFilter(
                      event
                        .target
                        .value
                    )
                }
              >

                <option value="all">
                  All Papers
                </option>

                <option value="GS Paper I">
                  GS Paper I
                </option>

                <option value="CSAT Paper II">
                  CSAT Paper II
                </option>

              </select>
            </label>


            <label>
              Test Type

              <select
                value={
                  typeFilter
                }

                onChange={
                  event =>
                    setTypeFilter(
                      event
                        .target
                        .value
                    )
                }
              >

                <option value="all">
                  All Types
                </option>

                <option value="sectional">
                  Sectional
                </option>

                <option value="full_length">
                  Full-Length
                </option>

                <option value="pyq">
                  PYQ
                </option>

                <option value="custom">
                  Custom
                </option>

              </select>
            </label>


            <label>
              Attempt Status

              <select
                value={
                  attemptFilter
                }

                disabled={
                  !signedIn
                }

                onChange={
                  event =>
                    setAttemptFilter(
                      event
                        .target
                        .value
                    )
                }
              >

                <option value="all">
                  All Tests
                </option>

                <option value="attempted">
                  Attempted
                </option>

                <option value="not_attempted">
                  Not Attempted
                </option>

              </select>
            </label>

          </div>

        </section>


        {/* TEST LIST */}

        <section
          style={{
            display:
              'grid',

            gap:
              '14px',

            marginTop:
              '18px'
          }}
        >

          {loading && (

            <div
              className="panel"
            >
              Loading published tests...
            </div>

          )}


          {!loading &&
            visibleTests.length ===
              0 && (

            <div
              className="panel"
            >

              <h3>
                No published tests found
              </h3>


              <p>
                Try another filter or ask
                the administrator to publish
                a test.
              </p>

            </div>

          )}


          {!loading &&
            visibleTests.map(
              test => {

                const count =
                  questionCounts[
                    test.id
                  ] ||
                  0;


                const maximumMarks =
                  roundNumber(
                    count *
                    test
                      .marks_per_question,
                    2
                  );


                const summary =
                  attemptSummaries[
                    test.id
                  ];


                const attempted =
                  (
                    summary
                      ?.attempts ||
                    0
                  ) >
                  0;


                const isLoading =
                  loadingTestId ===
                  test.id;


                return (

                  <article
                    className="panel"
                    key={
                      test.id
                    }
                  >

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

                      <div
                        style={{
                          flex:
                            '1 1 280px'
                        }}
                      >

                        <div
                          style={{
                            display:
                              'flex',

                            gap:
                              '6px',

                            flexWrap:
                              'wrap'
                          }}
                        >

                          <span
                            className="tag"
                          >
                            {
                              test.paper ||
                              'GS Paper I'
                            }
                          </span>


                          <span
                            className="tag"
                          >
                            {
                              testTypeLabel(
                                test.test_type
                              )
                            }
                          </span>


                          {signedIn && (
                            <span
                              className="tag"
                            >
                              {
                                attempted
                                  ? 'Attempted'
                                  : 'Not Attempted'
                              }
                            </span>
                          )}

                        </div>


                        <h3
                          style={{
                            marginTop:
                              '10px'
                          }}
                        >
                          {test.title}
                        </h3>


                        {test.description && (

                          <p>
                            {
                              test.description
                            }
                          </p>

                        )}


                        <small
                          style={{
                            color:
                              '#94a3b8'
                          }}
                        >
                          {count} questions
                          {' • '}
                          {maximumMarks} marks
                          {' • '}
                          {test.duration_minutes} min
                          {' • '}
                          {formatDate(
                            test.created_at
                          )}
                        </small>


                        {signedIn &&
                          attempted &&
                          summary && (

                          <div
                            style={{
                              display:
                                'grid',

                              gridTemplateColumns:
                                'repeat(auto-fit, minmax(110px, 1fr))',

                              gap:
                                '10px',

                              marginTop:
                                '14px'
                            }}
                          >

                            <div>
                              <small>
                                Attempts
                              </small>

                              <div>
                                <strong>
                                  {
                                    summary.attempts
                                  }
                                </strong>
                              </div>
                            </div>


                            <div>
                              <small>
                                Best Score
                              </small>

                              <div>
                                <strong>
                                  {
                                    formatScore(
                                      summary.bestScore
                                    )
                                  }
                                </strong>
                              </div>
                            </div>


                            <div>
                              <small>
                                Latest Score
                              </small>

                              <div>
                                <strong>
                                  {
                                    formatScore(
                                      summary.latestScore
                                    )
                                  }
                                </strong>
                              </div>
                            </div>


                            <div>
                              <small>
                                Last Attempt
                              </small>

                              <div>
                                <strong>
                                  {
                                    formatDate(
                                      summary.lastCompletedAt
                                    ) ||
                                    '—'
                                  }
                                </strong>
                              </div>
                            </div>

                          </div>

                        )}


                        {!signedIn && (

                          <div
                            className="callout"
                            style={{
                              marginTop:
                                '12px'
                            }}
                          >
                            Sign in to start tests
                            and track your scores.
                          </div>

                        )}

                      </div>


                      <button
                        type="button"
                        className="primary-btn"

                        disabled={
                          loadingTestId !==
                            null ||
                          count ===
                            0
                        }

                        onClick={() =>
                          void openTest(
                            test
                          )
                        }
                      >

                        {
                          isLoading
                            ? 'Loading...'
                            : attempted
                            ? 'Retake Test'
                            : 'View Test'
                        }

                      </button>

                    </div>

                  </article>

                );
              }
            )}

        </section>

      </div>
    );
  }


  /*
   * TEST INSTRUCTIONS
   */

  if (
    view ===
      'instructions' &&
    activeTest
  ) {

    const previousSummary =
      attemptSummaries[
        activeTest.id
      ];


    return (

      <div>

        <section
          className="panel"
        >

          <button
            type="button"
            className="secondary-btn"

            onClick={
              backToLibrary
            }
          >
            ← Test Library
          </button>


          <span
            className="eyebrow"
            style={{
              display:
                'block',

              marginTop:
                '18px'
            }}
          >
            TEST INSTRUCTIONS
          </span>


          <h2>
            {activeTest.title}
          </h2>


          {activeTest.description && (

            <p>
              {
                activeTest.description
              }
            </p>

          )}


          {previousSummary &&
            previousSummary.attempts >
              0 && (

            <div
              className="callout"
              style={{
                marginTop:
                  '14px'
              }}
            >

              <strong>
                Previous Performance
              </strong>


              <p>
                Attempts:{' '}
                {previousSummary.attempts}
                {' • '}
                Best:{' '}
                {
                  formatScore(
                    previousSummary.bestScore
                  )
                }
                {' • '}
                Latest:{' '}
                {
                  formatScore(
                    previousSummary.latestScore
                  )
                }
              </p>

            </div>

          )}


          <div
            className="metrics-grid"
            style={{
              marginTop:
                '18px'
            }}
          >

            <article
              className="metric-card"
            >
              <div>
                <span>
                  Questions
                </span>

                <strong>
                  {questions.length}
                </strong>
              </div>
            </article>


            <article
              className="metric-card"
            >
              <div>
                <span>
                  Duration
                </span>

                <strong>
                  {
                    activeTest
                      .duration_minutes
                  } min
                </strong>
              </div>
            </article>


            <article
              className="metric-card"
            >
              <div>
                <span>
                  Maximum Marks
                </span>

                <strong>
                  {
                    roundNumber(
                      questions.length *
                      activeTest
                        .marks_per_question,
                      2
                    )
                  }
                </strong>
              </div>
            </article>

          </div>


          <div
            className="callout"
            style={{
              marginTop:
                '18px'
            }}
          >

            <strong>
              Marking Scheme
            </strong>


            <p>
              +{
                activeTest
                  .marks_per_question
              } for each correct answer
              {' • '}
              -{
                activeTest
                  .negative_marks
              } for each wrong answer
              {' • '}
              0 for unanswered questions
            </p>

          </div>


          {activeTest.instructions && (

            <div
              style={{
                marginTop:
                  '18px',

                whiteSpace:
                  'pre-wrap'
              }}
            >

              <h3>
                Instructions
              </h3>


              <p>
                {
                  activeTest.instructions
                }
              </p>

            </div>

          )}


          <div
            className="callout"
            style={{
              marginTop:
                '18px'
            }}
          >

            <strong>
              Exam Mode
            </strong>


            <p>
              Answers can be changed until
              final submission. Explanations
              and correct answers are shown
              only after the test is submitted.
            </p>

          </div>


          <button
            type="button"
            className="primary-btn"

            onClick={
              startTest
            }

            style={{
              marginTop:
                '18px'
            }}
          >
            {
              previousSummary &&
              previousSummary.attempts >
                0
                ? 'Retake Test'
                : 'Start Test'
            }
          </button>

        </section>

      </div>
    );
  }


  /*
   * LIVE TEST
   */

  if (
    view ===
      'live' &&
    activeTest &&
    currentQuestion
  ) {

    const selected =
      selections[
        currentQuestion.id
      ];


    const isMarked =
      markedForReview[
        currentQuestion.id
      ] ===
      true;


    return (

      <div>

        {/* EXAM HEADER */}

        <section
          className="panel"
        >

          <div
            style={{
              display:
                'flex',

              justifyContent:
                'space-between',

              gap:
                '14px',

              alignItems:
                'flex-start',

              flexWrap:
                'wrap'
            }}
          >

            <div>

              <span
                className="eyebrow"
              >
                LIVE TEST
              </span>


              <h3>
                {activeTest.title}
              </h3>


              <small
                style={{
                  color:
                    '#94a3b8'
                }}
              >
                Question {index + 1}
                {' of '}
                {questions.length}
              </small>

            </div>


            <div
              style={{
                textAlign:
                  'right'
              }}
            >

              <small>
                Time Left
              </small>


              <div
                style={{
                  fontSize:
                    '1.35rem',

                  fontWeight:
                    800,

                  marginTop:
                    '3px'
                }}
              >
                {
                  formatTime(
                    timeLeft
                  )
                }
              </div>

            </div>

          </div>

        </section>


        {/* QUESTION */}

        <section
          className="panel"
          style={{
            marginTop:
              '14px'
          }}
        >

          <div
            style={{
              display:
                'flex',

              gap:
                '6px',

              flexWrap:
                'wrap'
            }}
          >

            <span
              className="tag"
            >
              {
                currentQuestion
                  .subject
              }
            </span>


            <span
              className="tag"
            >
              {
                currentQuestion
                  .difficulty
              }
            </span>


            {currentQuestion.is_pyq && (

              <span
                className="tag"
              >
                PYQ
                {
                  currentQuestion
                    .pyq_year
                    ? ` ${currentQuestion.pyq_year}`
                    : ''
                }
              </span>

            )}

          </div>


          <h3
            style={{
              marginTop:
                '14px',

              lineHeight:
                1.5
            }}
          >
            {
              currentQuestion
                .question
            }
          </h3>


          <div
            style={{
              display:
                'grid',

              gap:
                '10px',

              marginTop:
                '16px'
            }}
          >

            {currentQuestion
              .options
              .map(
                (
                  option,
                  optionIndex
                ) => (

                  <button
                    type="button"

                    key={
                      optionIndex
                    }

                    onClick={() =>
                      selectAnswer(
                        currentQuestion.id,
                        optionIndex
                      )
                    }

                    style={{
                      textAlign:
                        'left',

                      padding:
                        '14px',

                      borderRadius:
                        '12px',

                      border:
                        selected ===
                          optionIndex
                          ? '1px solid #14b8a6'
                          : '1px solid rgba(255,255,255,.10)',

                      background:
                        selected ===
                          optionIndex
                          ? 'rgba(20,184,166,.12)'
                          : '#0e1525',

                      color:
                        '#f8fafc',

                      cursor:
                        'pointer'
                    }}
                  >

                    <strong>
                      {
                        optionLetter(
                          optionIndex
                        )
                      }.
                    </strong>
                    {' '}
                    {option}

                  </button>

                )
              )}

          </div>


          <div
            style={{
              display:
                'flex',

              gap:
                '8px',

              flexWrap:
                'wrap',

              marginTop:
                '16px'
            }}
          >

            <button
              type="button"
              className="secondary-btn"

              onClick={() =>
                clearAnswer(
                  currentQuestion.id
                )
              }
            >
              Clear Response
            </button>


            <button
              type="button"

              className={
                isMarked
                  ? 'primary-btn'
                  : 'secondary-btn'
              }

              onClick={() =>
                toggleReview(
                  currentQuestion.id
                )
              }
            >
              {
                isMarked
                  ? 'Marked for Review'
                  : 'Mark for Review'
              }
            </button>

          </div>

        </section>


        {/* NAVIGATION */}

        <section
          className="panel"
          style={{
            marginTop:
              '14px'
          }}
        >

          <div
            style={{
              display:
                'flex',

              justifyContent:
                'space-between',

              gap:
                '8px',

              flexWrap:
                'wrap'
            }}
          >

            <button
              type="button"
              className="secondary-btn"

              disabled={
                index ===
                0
              }

              onClick={() =>
                setIndex(
                  current =>
                    Math.max(
                      0,
                      current -
                      1
                    )
                )
              }
            >
              Previous
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
                        current +
                          1
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
                  submitting
                }

                onClick={() =>
                  void submitTest(
                    false
                  )
                }
              >
                {
                  submitting
                    ? 'Submitting...'
                    : 'Final Submit'
                }
              </button>

            )}

          </div>

        </section>


        {/* QUESTION PALETTE */}

        <section
          className="panel"
          style={{
            marginTop:
              '14px'
          }}
        >

          <span
            className="eyebrow"
          >
            QUESTION PALETTE
          </span>


          <div
            style={{
              display:
                'grid',

              gridTemplateColumns:
                'repeat(auto-fill, minmax(44px, 1fr))',

              gap:
                '8px',

              marginTop:
                '12px'
            }}
          >

            {questions.map(
              (
                question,
                questionIndex
              ) => {

                const answered =
                  selections[
                    question.id
                  ] !==
                  undefined;


                const marked =
                  markedForReview[
                    question.id
                  ] ===
                  true;


                return (

                  <button
                    type="button"

                    key={
                      question.id
                    }

                    onClick={() =>
                      setIndex(
                        questionIndex
                      )
                    }

                    style={{
                      minHeight:
                        '42px',

                      borderRadius:
                        '10px',

                      border:
                        index ===
                          questionIndex
                          ? '2px solid #f8fafc'
                          : '1px solid rgba(255,255,255,.10)',

                      background:
                        marked
                          ? 'rgba(168,85,247,.30)'
                          : answered
                          ? 'rgba(20,184,166,.28)'
                          : 'rgba(148,163,184,.10)',

                      color:
                        '#f8fafc',

                      fontWeight:
                        800,

                      cursor:
                        'pointer'
                    }}
                  >
                    {questionIndex + 1}
                  </button>

                );
              }
            )}

          </div>


          <small
            style={{
              display:
                'block',

              marginTop:
                '12px',

              color:
                '#94a3b8'
            }}
          >
            Teal = answered
            {' • '}
            Purple = marked for review
            {' • '}
            Outline = current question
          </small>

        </section>


        {/* FINAL SUBMIT */}

        <section
          className="panel"
          style={{
            marginTop:
              '14px'
          }}
        >

          <button
            type="button"
            className="primary-btn"

            disabled={
              submitting
            }

            onClick={() =>
              void submitTest(
                false
              )
            }
          >
            {
              submitting
                ? 'Submitting...'
                : 'Submit Test'
            }
          </button>

        </section>

      </div>
    );
  }


  /*
   * RESULT
   */

  if (
    view ===
      'result' &&
    activeTest &&
    result
  ) {

    const updatedSummary =
      attemptSummaries[
        activeTest.id
      ];


    return (

      <div>

        <section
          className="panel"
        >

          <span
            className="eyebrow"
          >
            TEST RESULT
          </span>


          <h2>
            {activeTest.title}
          </h2>


          {message && (

            <div
              className="callout"
              style={{
                marginTop:
                  '12px'
              }}
            >
              {message}
            </div>

          )}


          <div
            className="metrics-grid"
            style={{
              marginTop:
                '18px'
            }}
          >

            <article
              className="metric-card"
            >
              <div>
                <span>
                  Score
                </span>

                <strong>
                  {
                    result
                      .scorePercent
                  }%
                </strong>
              </div>
            </article>


            <article
              className="metric-card"
            >
              <div>
                <span>
                  Marks
                </span>

                <strong>
                  {
                    result
                      .marksObtained
                  }
                  /
                  {
                    result
                      .maxMarks
                  }
                </strong>
              </div>
            </article>


            <article
              className="metric-card"
            >
              <div>
                <span>
                  Correct
                </span>

                <strong>
                  {
                    result
                      .correct
                  }
                </strong>
              </div>
            </article>


            <article
              className="metric-card"
            >
              <div>
                <span>
                  Incorrect
                </span>

                <strong>
                  {
                    result
                      .incorrect
                  }
                </strong>
              </div>
            </article>


            <article
              className="metric-card"
            >
              <div>
                <span>
                  Unanswered
                </span>

                <strong>
                  {
                    result
                      .unanswered
                  }
                </strong>
              </div>
            </article>


            <article
              className="metric-card"
            >
              <div>
                <span>
                  Time Used
                </span>

                <strong>
                  {
                    formatTime(
                      result
                        .durationSeconds
                    )
                  }
                </strong>
              </div>
            </article>

          </div>


          <div
            className="callout"
            style={{
              marginTop:
                '18px'
            }}
          >

            <strong>
              Marks Calculation
            </strong>


            <p>
              Positive:{' '}
              {
                result
                  .positiveMarks
              }
              {' • '}
              Negative:{' '}
              -{
                result
                  .negativeMarks
              }
              {' • '}
              Final:{' '}
              {
                result
                  .marksObtained
              }
            </p>

          </div>


          {updatedSummary &&
            updatedSummary.attempts >
              0 && (

            <div
              className="callout"
              style={{
                marginTop:
                  '14px'
              }}
            >

              <strong>
                Test Series Record
              </strong>


              <p>
                Attempts:{' '}
                {
                  updatedSummary.attempts
                }
                {' • '}
                Best:{' '}
                {
                  formatScore(
                    updatedSummary.bestScore
                  )
                }
                {' • '}
                Latest:{' '}
                {
                  formatScore(
                    updatedSummary.latestScore
                  )
                }
              </p>

            </div>

          )}


          <div
            style={{
              display:
                'flex',

              gap:
                '10px',

              flexWrap:
                'wrap',

              marginTop:
                '18px'
            }}
          >

            <button
              type="button"
              className="primary-btn"

              onClick={() =>
                setView(
                  'review'
                )
              }
            >
              Review Answers
            </button>


            <button
              type="button"
              className="secondary-btn"

              onClick={() => {

                setView(
                  'instructions'
                );

                setSelections(
                  {}
                );

                setMarkedForReview(
                  {}
                );

                setResult(
                  null
                );
              }}
            >
              Retake Test
            </button>


            <button
              type="button"
              className="secondary-btn"

              onClick={
                backToLibrary
              }
            >
              Test Library
            </button>

          </div>

        </section>

      </div>
    );
  }


  /*
   * REVIEW ANSWERS
   */

  if (
    view ===
      'review' &&
    activeTest &&
    result
  ) {

    return (

      <div>

        <section
          className="panel"
        >

          <button
            type="button"
            className="secondary-btn"

            onClick={() =>
              setView(
                'result'
              )
            }
          >
            ← Result
          </button>


          <span
            className="eyebrow"
            style={{
              display:
                'block',

              marginTop:
                '18px'
            }}
          >
            ANSWER REVIEW
          </span>


          <h2>
            {activeTest.title}
          </h2>

        </section>


        <div
          style={{
            display:
              'grid',

            gap:
              '14px',

            marginTop:
              '14px'
          }}
        >

          {questions.map(
            (
              question,
              questionIndex
            ) => {

              const answer =
                resultAnswerMap.get(
                  question.id
                );


              const selected =
                answer
                  ?.selected_index ??
                null;


              const correct =
                question
                  .correct_index;


              return (

                <article
                  className="panel"

                  key={
                    question.id
                  }
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

                    <span
                      className="tag"
                    >
                      Question {
                        questionIndex +
                        1
                      }
                    </span>


                    <span
                      className="tag"
                    >
                      {
                        answer
                          ?.is_correct
                          ? 'Correct'
                          : selected ===
                            null
                          ? 'Unanswered'
                          : 'Incorrect'
                      }
                    </span>

                  </div>


                  <h3
                    style={{
                      marginTop:
                        '12px',

                      lineHeight:
                        1.5
                    }}
                  >
                    {question.question}
                  </h3>


                  <div
                    style={{
                      display:
                        'grid',

                      gap:
                        '8px',

                      marginTop:
                        '12px'
                    }}
                  >

                    {question
                      .options
                      .map(
                        (
                          option,
                          optionIndex
                        ) => {

                          const isCorrect =
                            optionIndex ===
                            correct;


                          const isSelected =
                            optionIndex ===
                            selected;


                          return (

                            <div
                              key={
                                optionIndex
                              }

                              style={{
                                padding:
                                  '11px 12px',

                                borderRadius:
                                  '10px',

                                border:
                                  isCorrect
                                    ? '1px solid rgba(20,184,166,.55)'
                                    : isSelected
                                    ? '1px solid rgba(245,158,11,.55)'
                                    : '1px solid rgba(255,255,255,.08)',

                                background:
                                  isCorrect
                                    ? 'rgba(20,184,166,.10)'
                                    : isSelected
                                    ? 'rgba(245,158,11,.08)'
                                    : '#0e1525'
                              }}
                            >

                              <strong>
                                {
                                  optionLetter(
                                    optionIndex
                                  )
                                }.
                              </strong>
                              {' '}
                              {option}


                              {isCorrect && (

                                <strong>
                                  {' '}
                                  ✓ Correct
                                </strong>

                              )}


                              {isSelected &&
                                !isCorrect && (

                                <strong>
                                  {' '}
                                  Your Answer
                                </strong>

                              )}

                            </div>

                          );
                        }
                      )}

                  </div>


                  <div
                    className="callout"
                    style={{
                      marginTop:
                        '14px'
                    }}
                  >

                    <strong>
                      Explanation
                    </strong>


                    <p>
                      {
                        question
                          .explanation ||
                        'No explanation available.'
                      }
                    </p>

                  </div>


                  {answer
                    ?.marked_for_review && (

                    <div
                      className="tag"
                      style={{
                        marginTop:
                          '12px'
                      }}
                    >
                      Marked for Review
                    </div>

                  )}


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


        <section
          className="panel"
          style={{
            marginTop:
              '14px'
          }}
        >

          <button
            type="button"
            className="secondary-btn"

            onClick={
              backToLibrary
            }
          >
            Back to Test Library
          </button>

        </section>

      </div>
    );
  }


  return null;
}

import {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  PrelimsTestAttemptReview
} from './PrelimsTestAttemptReview';

import {
  supabase
} from '../lib/supabase';


type TestType =
  | 'sectional'
  | 'full_length'
  | 'pyq'
  | 'custom';


type AttemptRow = {
  id: string;
  test_id: string;

  score: number;

  total_questions: number;
  attempted_questions: number;
  correct_answers: number;
  incorrect_answers: number;
  unanswered_questions: number;

  marks_obtained: number | null;
  max_marks: number | null;
  negative_marks: number;

  duration_seconds: number | null;
  time_limit_seconds: number | null;

  started_at: string | null;
  completed_at: string | null;
};


type TestRow = {
  id: string;
  title: string;
  paper: string | null;
  test_type: TestType;
};


type CombinedAttempt =
  AttemptRow & {
    testTitle: string;
    paper: string;
    testType: TestType;
  };


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
  decimals = 1
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


function formatDuration(
  seconds:
    number |
    null
) {

  if (
    seconds === null ||
    seconds < 0
  ) {

    return '—';
  }


  const total =
    Math.floor(
      seconds
    );


  const hours =
    Math.floor(
      total /
      3600
    );


  const minutes =
    Math.floor(
      (
        total %
        3600
      ) /
      60
    );


  const remainingSeconds =
    total %
    60;


  if (
    hours > 0
  ) {

    return (
      `${hours}h ` +
      `${minutes}m`
    );
  }


  if (
    minutes > 0
  ) {

    return (
      `${minutes}m ` +
      `${remainingSeconds}s`
    );
  }


  return (
    `${remainingSeconds}s`
  );
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
    .toLocaleString(
      'en-IN',
      {
        day:
          '2-digit',

        month:
          'short',

        year:
          'numeric',

        hour:
          '2-digit',

        minute:
          '2-digit'
      }
    );
}


function testTypeLabel(
  type: TestType
) {

  switch (
    type
  ) {

    case 'sectional':
      return 'Sectional';

    case 'full_length':
      return 'Full-Length';

    case 'pyq':
      return 'PYQ';

    case 'custom':
      return 'Custom';
  }
}


export function MyPrelimsTestHistory() {

  /*
   * HISTORY DATA
   */

  const [
    attempts,
    setAttempts
  ] =
    useState<
      CombinedAttempt[]
    >([]);


  const [
    loading,
    setLoading
  ] =
    useState(
      true
    );


  const [
    error,
    setError
  ] =
    useState('');


  /*
   * ATTEMPT REVIEW
   */

  const [
    selectedAttemptId,
    setSelectedAttemptId
  ] =
    useState<
      string |
      null
    >(
      null
    );


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


  /*
   * SCROLL TO THIS SECTION
   */

  function scrollToHistory() {

    window.setTimeout(
      () => {

        document
          .getElementById(
            'prelims-test-series-history'
          )
          ?.scrollIntoView({
            behavior:
              'smooth',

            block:
              'start'
          });

      },
      50
    );
  }


  /*
   * OPEN SAVED ATTEMPT
   */

  function openAttemptReview(
    attemptId: string
  ) {

    setSelectedAttemptId(
      attemptId
    );


    scrollToHistory();
  }


  /*
   * CLOSE SAVED ATTEMPT
   */

  function closeAttemptReview() {

    setSelectedAttemptId(
      null
    );


    scrollToHistory();
  }


  /*
   * LOAD HISTORY
   */

  async function loadHistory() {

    if (!supabase) {

      setError(
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

    setError('');


    /*
     * CURRENT USER
     */

    const {
      data: {
        user
      }
    } =
      await supabase
        .auth
        .getUser();


    if (!user) {

      setAttempts(
        []
      );

      setLoading(
        false
      );

      return;
    }


    /*
     * LOAD OWN TEST ATTEMPTS
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
          id,
          test_id,
          score,
          total_questions,
          attempted_questions,
          correct_answers,
          incorrect_answers,
          unanswered_questions,
          marks_obtained,
          max_marks,
          negative_marks,
          duration_seconds,
          time_limit_seconds,
          started_at,
          completed_at
          `
        )
        .eq(
          'user_id',
          user.id
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
        )
        .limit(
          100
        );


    if (
      attemptError
    ) {

      console.error(
        'Unable to load Test Series history:',
        attemptError
      );


      setError(
        attemptError.message
      );


      setLoading(
        false
      );

      return;
    }


    const rawAttempts =
      attemptData ||
      [];


    /*
     * NOTHING COMPLETED YET
     */

    if (
      rawAttempts.length ===
      0
    ) {

      setAttempts(
        []
      );


      setLoading(
        false
      );

      return;
    }


    /*
     * FIND TEST IDS
     */

    const testIds =
      Array.from(
        new Set(
          rawAttempts.map(
            attempt =>
              String(
                attempt.test_id
              )
          )
        )
      );


    /*
     * LOAD RELATED TEST INFO
     */

    const {
      data:
        testData,

      error:
        testError
    } =
      await supabase
        .from(
          'tests'
        )
        .select(
          `
          id,
          title,
          paper,
          test_type
          `
        )
        .in(
          'id',
          testIds
        );


    /*
     * Test metadata can be missing
     * for an old unpublished test.
     *
     * Do not block student's
     * attempt history because of it.
     */

    if (
      testError
    ) {

      console.warn(
        'Unable to load some Test Series metadata:',
        testError
      );
    }


    /*
     * TEST LOOKUP
     */

    const testMap =
      new Map<
        string,
        TestRow
      >();


    (
      testData ||
      []
    ).forEach(
      item => {

        testMap.set(
          String(
            item.id
          ),
          {
            id:
              String(
                item.id
              ),

            title:
              String(
                item.title ||
                'Prelims Test'
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
                'custom'
              ) as
                TestType
          }
        );
      }
    );


    /*
     * COMBINE ATTEMPT
     * + TEST INFORMATION
     */

    const combined:
      CombinedAttempt[] =
        rawAttempts.map(
          item => {

            const testId =
              String(
                item.test_id
              );


            const test =
              testMap.get(
                testId
              );


            return {

              id:
                String(
                  item.id
                ),

              test_id:
                testId,

              score:
                safeNumber(
                  item.score
                ),

              total_questions:
                safeNumber(
                  item.total_questions
                ),

              attempted_questions:
                safeNumber(
                  item.attempted_questions
                ),

              correct_answers:
                safeNumber(
                  item.correct_answers
                ),

              incorrect_answers:
                safeNumber(
                  item.incorrect_answers
                ),

              unanswered_questions:
                safeNumber(
                  item.unanswered_questions
                ),

              marks_obtained:
                item.marks_obtained ===
                  null
                  ? null
                  : safeNumber(
                      item.marks_obtained
                    ),

              max_marks:
                item.max_marks ===
                  null
                  ? null
                  : safeNumber(
                      item.max_marks
                    ),

              negative_marks:
                safeNumber(
                  item.negative_marks
                ),

              duration_seconds:
                item.duration_seconds ===
                  null
                  ? null
                  : safeNumber(
                      item.duration_seconds
                    ),

              time_limit_seconds:
                item.time_limit_seconds ===
                  null
                  ? null
                  : safeNumber(
                      item.time_limit_seconds
                    ),

              started_at:
                item.started_at
                  ? String(
                      item.started_at
                    )
                  : null,

              completed_at:
                item.completed_at
                  ? String(
                      item.completed_at
                    )
                  : null,

              testTitle:
                test?.title ||
                'Prelims Test',

              paper:
                test?.paper ||
                'Prelims',

              testType:
                test?.test_type ||
                'custom'
            };
          }
        );


    setAttempts(
      combined
    );


    setLoading(
      false
    );
  }


  /*
   * INITIAL LOAD
   */

  useEffect(
    () => {

      void loadHistory();

    },
    []
  );


  /*
   * FILTERED HISTORY
   */

  const visibleAttempts =
    useMemo(
      () => {

        const query =
          search
            .trim()
            .toLowerCase();


        return attempts.filter(
          attempt => {

            /*
             * PAPER FILTER
             */

            if (
              paperFilter !==
                'all' &&
              attempt.paper !==
                paperFilter
            ) {

              return false;
            }


            /*
             * TEST TYPE FILTER
             */

            if (
              typeFilter !==
                'all' &&
              attempt.testType !==
                typeFilter
            ) {

              return false;
            }


            /*
             * SEARCH
             */

            if (!query) {

              return true;
            }


            return (
              attempt.testTitle
                .toLowerCase()
                .includes(
                  query
                ) ||

              attempt.paper
                .toLowerCase()
                .includes(
                  query
                ) ||

              testTypeLabel(
                attempt.testType
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
        attempts,
        search,
        paperFilter,
        typeFilter
      ]
    );


  /*
   * TOTAL ATTEMPTS
   */

  const totalAttempts =
    attempts.length;


  /*
   * AVERAGE SCORE
   */

  const averageScore =
    useMemo(
      () => {

        if (
          attempts.length ===
          0
        ) {

          return 0;
        }


        const total =
          attempts.reduce(
            (
              sum,
              attempt
            ) =>
              sum +
              attempt.score,
            0
          );


        return roundNumber(
          total /
          attempts.length,
          1
        );

      },
      [
        attempts
      ]
    );


  /*
   * BEST SCORE
   */

  const bestScore =
    useMemo(
      () => {

        if (
          attempts.length ===
          0
        ) {

          return 0;
        }


        return roundNumber(
          Math.max(
            ...attempts.map(
              attempt =>
                attempt.score
            )
          ),
          1
        );

      },
      [
        attempts
      ]
    );


  /*
   * LATEST SCORE
   */

  const latestScore =
    attempts.length >
      0
      ? roundNumber(
          attempts[0]
            .score,
          1
        )
      : 0;


  /*
   * SAVED ATTEMPT REVIEW
   */

  if (
    selectedAttemptId
  ) {

    return (

      <div
        id="prelims-test-series-history"
        style={{
          scrollMarginTop:
            '20px'
        }}
      >

        <PrelimsTestAttemptReview

          attemptId={
            selectedAttemptId
          }

          onClose={
            closeAttemptReview
          }

        />

      </div>

    );
  }


  /*
   * HISTORY SCREEN
   */

  return (

    <section
      id="prelims-test-series-history"
      className="panel"
      style={{
        marginTop:
          '18px',

        scrollMarginTop:
          '20px'
      }}
    >

      {/* HEADER */}

      <div
        className="panel-head"
      >

        <div>

          <span
            className="eyebrow"
          >
            PRELIMS TEST SERIES
          </span>


          <h3>
            My Test History
          </h3>


          <p>
            Review your mock-test
            scores, marks, accuracy
            and complete answer analysis.
          </p>

        </div>


        <button
          type="button"
          className="secondary-btn"

          onClick={() =>
            void loadHistory()
          }
        >
          Refresh
        </button>

      </div>


      {/* ERROR */}

      {error && (

        <div
          className="callout"
          style={{
            marginTop:
              '12px'
          }}
        >
          {error}
        </div>

      )}


      {/* LOADING */}

      {loading && (

        <p>
          Loading Test Series history...
        </p>

      )}


      {/* EMPTY HISTORY */}

      {!loading &&
        !error &&
        attempts.length ===
          0 && (

        <div
          className="callout"
        >

          <strong>
            No Test Series attempts yet
          </strong>


          <p>
            Complete a published
            Prelims Test Series paper
            and the result will appear
            here.
          </p>

        </div>

      )}


      {/* HISTORY CONTENT */}

      {!loading &&
        attempts.length >
          0 && (

        <>

          {/* SUMMARY */}

          <div
            className="metrics-grid"
            style={{
              marginTop:
                '14px'
            }}
          >

            <article
              className="metric-card"
            >

              <div>

                <span>
                  Attempts
                </span>


                <strong>
                  {totalAttempts}
                </strong>

              </div>

            </article>


            <article
              className="metric-card"
            >

              <div>

                <span>
                  Average
                </span>


                <strong>
                  {averageScore}%
                </strong>

              </div>

            </article>


            <article
              className="metric-card"
            >

              <div>

                <span>
                  Best
                </span>


                <strong>
                  {bestScore}%
                </strong>

              </div>

            </article>


            <article
              className="metric-card"
            >

              <div>

                <span>
                  Latest
                </span>


                <strong>
                  {latestScore}%
                </strong>

              </div>

            </article>

          </div>


          {/* FILTERS */}

          <div
            style={{
              display:
                'grid',

              gridTemplateColumns:
                'repeat(auto-fit, minmax(170px, 1fr))',

              gap:
                '10px',

              marginTop:
                '16px'
            }}
          >

            {/* SEARCH */}

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

                placeholder="Search test"
              />

            </label>


            {/* PAPER */}

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


            {/* TEST TYPE */}

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

          </div>


          {/* ATTEMPT LIST */}

          <div
            style={{
              display:
                'grid',

              gap:
                '12px',

              marginTop:
                '16px'
            }}
          >

            {visibleAttempts.map(
              attempt => (

                <article
                  key={
                    attempt.id
                  }

                  style={{
                    padding:
                      '16px',

                    border:
                      '1px solid rgba(255,255,255,.08)',

                    borderRadius:
                      '14px',

                    background:
                      '#0e1525'
                  }}
                >

                  {/* CARD HEADER */}

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

                      alignItems:
                        'flex-start'
                    }}
                  >

                    <div
                      style={{
                        flex:
                          '1 1 260px'
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
                          {attempt.paper}
                        </span>


                        <span
                          className="tag"
                        >
                          {
                            testTypeLabel(
                              attempt.testType
                            )
                          }
                        </span>

                      </div>


                      <h3
                        style={{
                          margin:
                            '10px 0 5px'
                        }}
                      >
                        {attempt.testTitle}
                      </h3>


                      <small
                        style={{
                          color:
                            '#94a3b8'
                        }}
                      >
                        {
                          formatDate(
                            attempt.completed_at
                          )
                        }
                      </small>

                    </div>


                    {/* SCORE */}

                    <div
                      style={{
                        textAlign:
                          'right'
                      }}
                    >

                      <small>
                        Score
                      </small>


                      <div
                        style={{
                          fontSize:
                            '1.35rem',

                          fontWeight:
                            800
                        }}
                      >
                        {
                          roundNumber(
                            attempt.score,
                            1
                          )
                        }%
                      </div>

                    </div>

                  </div>


                  {/* ATTEMPT METRICS */}

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
                        Questions
                      </small>


                      <div>
                        <strong>
                          {
                            attempt
                              .total_questions
                          }
                        </strong>
                      </div>

                    </div>


                    <div>

                      <small>
                        Attempted
                      </small>


                      <div>
                        <strong>
                          {
                            attempt
                              .attempted_questions
                          }
                        </strong>
                      </div>

                    </div>


                    <div>

                      <small>
                        Correct
                      </small>


                      <div>
                        <strong>
                          {
                            attempt
                              .correct_answers
                          }
                        </strong>
                      </div>

                    </div>


                    <div>

                      <small>
                        Incorrect
                      </small>


                      <div>
                        <strong>
                          {
                            attempt
                              .incorrect_answers
                          }
                        </strong>
                      </div>

                    </div>


                    <div>

                      <small>
                        Unanswered
                      </small>


                      <div>
                        <strong>
                          {
                            attempt
                              .unanswered_questions
                          }
                        </strong>
                      </div>

                    </div>


                    <div>

                      <small>
                        Marks
                      </small>


                      <div>
                        <strong>

                          {
                            attempt
                              .marks_obtained ??
                            '—'
                          }

                          {
                            attempt
                              .max_marks !==
                              null
                              ? ` / ${attempt.max_marks}`
                              : ''
                          }

                        </strong>
                      </div>

                    </div>


                    <div>

                      <small>
                        Negative
                      </small>


                      <div>
                        <strong>
                          -
                          {
                            roundNumber(
                              attempt
                                .negative_marks,
                              2
                            )
                          }
                        </strong>
                      </div>

                    </div>


                    <div>

                      <small>
                        Time Used
                      </small>


                      <div>
                        <strong>
                          {
                            formatDuration(
                              attempt
                                .duration_seconds
                            )
                          }
                        </strong>
                      </div>

                    </div>

                  </div>


                  {/* REVIEW BUTTON */}

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
                      className="primary-btn"

                      onClick={() =>
                        openAttemptReview(
                          attempt.id
                        )
                      }
                    >
                      Review Attempt
                    </button>

                  </div>

                </article>

              )
            )}


            {/* NO FILTER MATCH */}

            {visibleAttempts.length ===
              0 && (

              <div
                className="callout"
              >
                No attempts match
                these filters.
              </div>

            )}

          </div>

        </>

      )}

    </section>
  );
}

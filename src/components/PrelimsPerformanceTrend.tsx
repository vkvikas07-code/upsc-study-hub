import {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


type PracticeConfig = {
  origin?: string;
  session_mode?: string;
  subject?: string;
  topic?: string;
  mistake_status?: string;
};


type AttemptRow = {
  id: string;

  mode:
    string | null;

  total_questions:
    number;

  correct_answers:
    number;

  incorrect_answers:
    number | null;

  score_percent:
    number | string;

  subject:
    string | null;

  marks_obtained:
    number | string | null;

  max_marks:
    number | string | null;

  duration_seconds:
    number | null;

  practice_config:
    PracticeConfig | null;

  completed_at:
    string;
};


function safeNumber(
  value:
    number |
    string |
    null |
    undefined
) {

  const number =
    Number(value);


  return Number.isFinite(
    number
  )
    ? number
    : 0;
}


function roundNumber(
  value: number,
  decimals = 1
) {

  const factor =
    10 ** decimals;


  return (
    Math.round(
      value *
      factor
    ) /
    factor
  );
}


function average(
  values: number[]
) {

  if (
    values.length ===
    0
  ) {

    return 0;
  }


  return (
    values.reduce(
      (
        total,
        value
      ) =>
        total +
        value,
      0
    ) /
    values.length
  );
}


function formatDate(
  value: string
) {

  return new Date(
    value
  ).toLocaleDateString(
    'en-IN',
    {
      day:
        '2-digit',

      month:
        'short'
    }
  );
}


function formatDuration(
  seconds:
    number | null
) {

  if (
    !seconds ||
    seconds <=
      0
  ) {

    return '—';
  }


  const minutes =
    Math.floor(
      seconds /
      60
    );


  const remaining =
    seconds %
    60;


  if (
    minutes ===
    0
  ) {

    return (
      `${remaining}s`
    );
  }


  return (
    `${minutes}m ${remaining}s`
  );
}


function sessionLabel(
  attempt:
    AttemptRow
) {

  if (
    attempt
      .practice_config
      ?.origin ===
    'mistake_book'
  ) {

    return 'Mistake Practice';
  }


  if (
    attempt.mode ===
    'exam'
  ) {

    return 'CSE Exam';
  }


  return 'Practice';
}


function clampBar(
  value: number
) {

  return Math.max(
    0,
    Math.min(
      100,
      value
    )
  );
}


export function PrelimsPerformanceTrend() {

  const [
    attempts,
    setAttempts
  ] =
    useState<
      AttemptRow[]
    >([]);


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


  /*
   * LOAD ATTEMPT HISTORY
   */

  async function loadTrend() {

    if (!supabase) {

      setError(
        'Supabase is not configured.'
      );

      setLoading(false);

      return;
    }


    setLoading(true);

    setError('');


    const {
      data: {
        user
      }
    } =
      await supabase
        .auth
        .getUser();


    if (!user) {

      setAttempts([]);

      setError(
        'Sign in to view your Prelims performance trend.'
      );

      setLoading(false);

      return;
    }


    const {
      data,
      error:
        loadError
    } =
      await supabase
        .from(
          'practice_attempts'
        )
        .select(`
          id,
          mode,
          total_questions,
          correct_answers,
          incorrect_answers,
          score_percent,
          subject,
          marks_obtained,
          max_marks,
          duration_seconds,
          practice_config,
          completed_at
        `)
        .eq(
          'user_id',
          user.id
        )
        .order(
          'completed_at',
          {
            ascending:
              false
          }
        )
        .limit(
          20
        );


    if (loadError) {

      console.error(
        'Unable to load Prelims trend:',
        loadError
      );


      setError(
        loadError.message
      );

      setLoading(false);

      return;
    }


    /*
     * Reverse so the graph
     * runs oldest → newest.
     */

    setAttempts(
      (
        data ||
        []
      )
        .map(
          item =>
            item as
              AttemptRow
        )
        .reverse()
    );


    setLoading(false);
  }


  useEffect(
    () => {

      void loadTrend();

    },
    []
  );


  /*
   * SCORES
   */

  const scores =
    useMemo(
      () =>
        attempts.map(
          attempt =>
            safeNumber(
              attempt.score_percent
            )
        ),
      [
        attempts
      ]
    );


  /*
   * OVERALL AVERAGE
   */

  const overallAverage =
    useMemo(
      () =>
        roundNumber(
          average(
            scores
          )
        ),
      [
        scores
      ]
    );


  /*
   * BEST SCORE
   */

  const bestScore =
    useMemo(
      () =>
        scores.length >
        0
          ? roundNumber(
              Math.max(
                ...scores
              )
            )
          : 0,
      [
        scores
      ]
    );


  /*
   * RECENT FIVE
   */

  const recentScores =
    useMemo(
      () =>
        scores.slice(
          -5
        ),
      [
        scores
      ]
    );


  const recentAverage =
    useMemo(
      () =>
        roundNumber(
          average(
            recentScores
          )
        ),
      [
        recentScores
      ]
    );


  /*
   * PREVIOUS FIVE
   */

  const previousScores =
    useMemo(
      () => {

        if (
          scores.length <=
          5
        ) {

          return [];
        }


        return scores.slice(
          Math.max(
            0,
            scores.length -
              10
          ),
          scores.length -
            5
        );
      },
      [
        scores
      ]
    );


  const previousAverage =
    useMemo(
      () =>
        roundNumber(
          average(
            previousScores
          )
        ),
      [
        previousScores
      ]
    );


  /*
   * TREND DIFFERENCE
   */

  const trendDifference =
    previousScores.length >
    0
      ? roundNumber(
          recentAverage -
          previousAverage
        )
      : 0;


  const trendLabel =
    previousScores.length ===
    0
      ? 'Building baseline'
      : trendDifference >=
        2
      ? 'Improving'
      : trendDifference <=
        -2
      ? 'Needs Attention'
      : 'Stable';


  /*
   * EXAM ATTEMPTS
   */

  const examAttempts =
    useMemo(
      () =>
        attempts.filter(
          attempt =>
            attempt.mode ===
            'exam'
        ),
      [
        attempts
      ]
    );


  const examAverage =
    useMemo(
      () =>
        roundNumber(
          average(
            examAttempts.map(
              attempt =>
                safeNumber(
                  attempt.score_percent
                )
            )
          )
        ),
      [
        examAttempts
      ]
    );


  /*
   * PRACTICE ATTEMPTS
   */

  const practiceAttempts =
    useMemo(
      () =>
        attempts.filter(
          attempt =>
            attempt.mode !==
            'exam'
        ),
      [
        attempts
      ]
    );


  const practiceAverage =
    useMemo(
      () =>
        roundNumber(
          average(
            practiceAttempts.map(
              attempt =>
                safeNumber(
                  attempt.score_percent
                )
            )
          )
        ),
      [
        practiceAttempts
      ]
    );


  return (

    <section
      className="panel"
      style={{
        marginTop:
          '22px'
      }}
    >

      {/* HEADER */}

      <div
        style={{
          display:
            'flex',

          justifyContent:
            'space-between',

          alignItems:
            'center',

          gap:
            '12px',

          flexWrap:
            'wrap'
        }}
      >

        <div>

          <span
            className="eyebrow"
          >
            PRELIMS ANALYTICS
          </span>


          <h2>
            Performance Trend
          </h2>


          <p>
            See whether your recent
            Prelims practice and exam
            performance is improving.
          </p>

        </div>


        <button
          type="button"
          className="secondary-btn"
          onClick={
            loadTrend
          }
        >
          Refresh Trend
        </button>

      </div>


      {/* LOADING */}

      {loading && (

        <p>
          Analysing your recent
          attempts...
        </p>

      )}


      {/* ERROR */}

      {error && (

        <div
          className="callout"
          style={{
            marginTop:
              '18px'
          }}
        >

          <strong>
            {error}
          </strong>

        </div>

      )}


      {/* EMPTY */}

      {!loading &&
        !error &&
        attempts.length ===
          0 && (

        <div
          className="callout"
          style={{
            marginTop:
              '18px'
          }}
        >

          <strong>
            No performance history yet
          </strong>


          <p>
            Complete some Prelims
            Practice or CSE Exam
            sessions to start building
            your performance trend.
          </p>

        </div>

      )}


      {/* TREND CONTENT */}

      {!loading &&
        !error &&
        attempts.length >
          0 && (

        <>

          {/* SUMMARY CARDS */}

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
                  Recent Average
                </span>


                <strong>
                  {
                    recentAverage
                  }%
                </strong>


                <small>
                  Last{' '}
                  {
                    recentScores.length
                  }{' '}
                  attempts
                </small>

              </div>

            </article>


            <article
              className="metric-card"
            >

              <div>

                <span>
                  Overall Average
                </span>


                <strong>
                  {
                    overallAverage
                  }%
                </strong>


                <small>
                  Last{' '}
                  {
                    attempts.length
                  }{' '}
                  attempts
                </small>

              </div>

            </article>


            <article
              className="metric-card"
            >

              <div>

                <span>
                  Best Score
                </span>


                <strong>
                  {
                    bestScore
                  }%
                </strong>


                <small>
                  Highest performance
                </small>

              </div>

            </article>


            <article
              className="metric-card"
            >

              <div>

                <span>
                  Trend
                </span>


                <strong>
                  {
                    trendLabel
                  }
                </strong>


                <small>
                  {
                    previousScores.length >
                    0
                      ? `${trendDifference >= 0 ? '+' : ''}${trendDifference}% vs previous 5`
                      : 'More attempts needed'
                  }
                </small>

              </div>

            </article>

          </div>


          {/* MODE COMPARISON */}

          <div
            style={{
              marginTop:
                '22px',

              padding:
                '16px',

              border:
                '1px solid rgba(255,255,255,.10)',

              borderRadius:
                '14px'
            }}
          >

            <span
              className="eyebrow"
            >
              MODE COMPARISON
            </span>


            <h3>
              Practice vs CSE Exam
            </h3>


            <div
              className="form-two"
              style={{
                marginTop:
                  '14px'
              }}
            >

              <div
                className="callout"
              >

                <strong>
                  {
                    practiceAverage
                  }%
                </strong>


                <p>
                  Practice Average
                </p>


                <small>
                  {
                    practiceAttempts.length
                  }{' '}
                  sessions
                </small>

              </div>


              <div
                className="callout"
              >

                <strong>
                  {
                    examAverage
                  }%
                </strong>


                <p>
                  CSE Exam Average
                </p>


                <small>
                  {
                    examAttempts.length
                  }{' '}
                  sessions
                </small>

              </div>

            </div>

          </div>


          {/* TREND GRAPH */}

          <div
            style={{
              marginTop:
                '22px'
            }}
          >

            <span
              className="eyebrow"
            >
              RECENT ATTEMPTS
            </span>


            <h3>
              Score Trend
            </h3>


            <p>
              Oldest attempt is shown
              first. Newest attempt is
              shown last.
            </p>


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

              {attempts.map(
                (
                  attempt,
                  attemptIndex
                ) => {

                  const score =
                    roundNumber(
                      safeNumber(
                        attempt.score_percent
                      )
                    );


                  const barWidth =
                    clampBar(
                      score
                    );


                  return (

                    <article
                      key={
                        attempt.id
                      }
                      style={{
                        padding:
                          '14px',

                        border:
                          '1px solid rgba(255,255,255,.08)',

                        borderRadius:
                          '12px'
                      }}
                    >

                      <div
                        style={{
                          display:
                            'flex',

                          justifyContent:
                            'space-between',

                          alignItems:
                            'center',

                          gap:
                            '10px',

                          flexWrap:
                            'wrap'
                        }}
                      >

                        <div>

                          <strong>
                            Attempt{' '}
                            {
                              attemptIndex +
                              1
                            }
                          </strong>


                          <small
                            style={{
                              display:
                                'block',

                              marginTop:
                                '3px'
                            }}
                          >
                            {
                              formatDate(
                                attempt.completed_at
                              )
                            }
                            {' • '}
                            {
                              sessionLabel(
                                attempt
                              )
                            }
                          </small>

                        </div>


                        <strong
                          style={{
                            fontSize:
                              '1.2rem'
                          }}
                        >
                          {
                            score
                          }%
                        </strong>

                      </div>


                      {/* SCORE BAR */}

                      <div
                        style={{
                          height:
                            '9px',

                          width:
                            '100%',

                          marginTop:
                            '10px',

                          background:
                            'rgba(255,255,255,.08)',

                          borderRadius:
                            '999px',

                          overflow:
                            'hidden'
                        }}
                      >

                        <div
                          style={{
                            width:
                              `${barWidth}%`,

                            height:
                              '100%',

                            background:
                              '#2dd4bf'
                          }}
                        />

                      </div>


                      <div
                        className="tag-row"
                        style={{
                          marginTop:
                            '10px'
                        }}
                      >

                        <span
                          className="tag"
                        >
                          {
                            attempt.subject ||
                            'Mixed'
                          }
                        </span>


                        <span
                          className="tag"
                        >
                          Correct{' '}
                          {
                            attempt.correct_answers
                          }/
                          {
                            attempt.total_questions
                          }
                        </span>


                        <span
                          className="tag"
                        >
                          {
                            formatDuration(
                              attempt.duration_seconds
                            )
                          }
                        </span>


                        {attempt.mode ===
                          'exam' &&
                          attempt.marks_obtained !==
                            null &&
                          attempt.max_marks !==
                            null && (

                          <span
                            className="tag"
                          >
                            Marks{' '}
                            {
                              roundNumber(
                                safeNumber(
                                  attempt.marks_obtained
                                )
                              )
                            }
                            /
                            {
                              roundNumber(
                                safeNumber(
                                  attempt.max_marks
                                )
                              )
                            }
                          </span>

                        )}

                      </div>

                    </article>

                  );
                }
              )}

            </div>

          </div>


          {/* GUIDANCE */}

          <div
            className="callout"
            style={{
              marginTop:
                '20px'
            }}
          >

            <strong>
              How to read your trend
            </strong>


            {trendLabel ===
              'Improving' && (

              <p>
                Your recent results are
                stronger than your
                previous attempts.
                Continue the same
                revision and practice
                cycle.
              </p>

            )}


            {trendLabel ===
              'Stable' && (

              <p>
                Your performance is
                steady. Use Weak Areas
                and Mistake Practice to
                push the next improvement.
              </p>

            )}


            {trendLabel ===
              'Needs Attention' && (

              <p>
                Recent scores have
                dropped. Review your
                weakest topics and
                Mistake Book before the
                next full test.
              </p>

            )}


            {trendLabel ===
              'Building baseline' && (

              <p>
                Complete a few more
                sessions before a reliable
                improvement trend can be
                calculated.
              </p>

            )}

          </div>

        </>

      )}

    </section>
  );
}

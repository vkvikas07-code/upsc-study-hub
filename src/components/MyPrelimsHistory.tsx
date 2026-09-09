import {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


type AttemptMode =
  | 'practice'
  | 'exam';


type PracticeConfig = {
  session_mode?: string;
  origin?: string;
  subject?: string;
  topic?: string;
  difficulty?: string;
  question_type?: string;
  cse_pyq_year?: string;

  upsc_exam?: string;
  upsc_cycle?: string;
  upsc_year?: string;

  state?: string;
  state_exam?: string;
  state_year?: string;

  session_size?: string;
  search?: string;
};


type PracticeAttempt = {
  id: string;

  mode:
    AttemptMode | null;

  total_questions:
    number;

  attempted_questions:
    number | null;

  correct_answers:
    number;

  incorrect_answers:
    number | null;

  unanswered_questions:
    number | null;

  score_percent:
    number | string;

  subject:
    string | null;

  marks_obtained:
    number | string | null;

  max_marks:
    number | string | null;

  negative_marks:
    number | string | null;

  duration_seconds:
    number | null;

  time_limit_seconds:
    number | null;

  practice_config:
    PracticeConfig | null;

  completed_at:
    string;
};


const ATTEMPT_SELECT = `
  id,
  mode,
  total_questions,
  attempted_questions,
  correct_answers,
  incorrect_answers,
  unanswered_questions,
  score_percent,
  subject,
  marks_obtained,
  max_marks,
  negative_marks,
  duration_seconds,
  time_limit_seconds,
  practice_config,
  completed_at
`;


function safeNumber(
  value:
    number |
    string |
    null |
    undefined
) {

  const parsed =
    Number(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
}


function roundNumber(
  value: number,
  decimals = 2
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


function formatDuration(
  totalSeconds:
    number | null
) {

  if (
    !totalSeconds ||
    totalSeconds <= 0
  ) {

    return '—';
  }

  const hours =
    Math.floor(
      totalSeconds /
      3600
    );

  const minutes =
    Math.floor(
      (
        totalSeconds %
        3600
      ) /
      60
    );

  const seconds =
    totalSeconds %
    60;


  if (hours > 0) {

    return (
      `${hours}h ` +
      `${minutes}m ` +
      `${seconds}s`
    );
  }


  if (minutes > 0) {

    return (
      `${minutes}m ` +
      `${seconds}s`
    );
  }


  return `${seconds}s`;
}


function getMode(
  attempt:
    PracticeAttempt
):
  AttemptMode {

  return (
    attempt.mode ===
      'exam'
      ? 'exam'
      : 'practice'
  );
}


function getAttemptedCount(
  attempt:
    PracticeAttempt
) {

  const stored =
    safeNumber(
      attempt
        .attempted_questions
    );

  if (stored > 0) {
    return stored;
  }


  const calculated =
    safeNumber(
      attempt.correct_answers
    ) +
    safeNumber(
      attempt.incorrect_answers
    );


  if (calculated > 0) {
    return calculated;
  }


  /*
   * Compatibility for old
   * practice-history rows.
   */

  if (
    getMode(attempt) ===
      'practice'
  ) {

    return safeNumber(
      attempt.total_questions
    );
  }


  return 0;
}


function originLabel(
  config:
    PracticeConfig | null
) {

  if (!config) {
    return '';
  }


  if (
    config.origin ===
      'cse'
  ) {

    return 'CSE';
  }


  if (
    config.origin ===
      'upsc'
  ) {

    return (
      config.upsc_exam &&
      config.upsc_exam !==
        'all'
        ? config.upsc_exam
        : 'Other UPSC'
    );
  }


  if (
    config.origin ===
      'state'
  ) {

    if (
      config.state &&
      config.state !==
        'all'
    ) {

      return config.state;
    }

    return 'State PSC';
  }


  return '';
}


export function MyPrelimsHistory() {

  const [
    attempts,
    setAttempts
  ] =
    useState<
      PracticeAttempt[]
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
   * HISTORY FILTER
   */

  const [
    modeFilter,
    setModeFilter
  ] =
    useState<
      'all' |
      AttemptMode
    >('all');


  /*
   * LOAD HISTORY
   */

  async function loadHistory() {

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
        'Sign in to view your Prelims practice history.'
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
        .select(
          ATTEMPT_SELECT
        )
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
        );


    if (loadError) {

      console.error(
        'Unable to load practice history:',
        loadError
      );

      setError(
        loadError.message
      );

      setLoading(false);

      return;
    }


    setAttempts(
      (
        data || []
      ) as PracticeAttempt[]
    );

    setLoading(false);
  }


  useEffect(
    () => {

      loadHistory();

    },
    []
  );


  /*
   * SPLIT MODES
   */

  const practiceAttempts =
    useMemo(
      () =>
        attempts.filter(
          attempt =>
            getMode(
              attempt
            ) ===
              'practice'
        ),
      [
        attempts
      ]
    );


  const examAttempts =
    useMemo(
      () =>
        attempts.filter(
          attempt =>
            getMode(
              attempt
            ) ===
              'exam'
        ),
      [
        attempts
      ]
    );


  /*
   * FILTERED HISTORY
   */

  const visibleAttempts =
    useMemo(
      () =>
        attempts.filter(
          attempt =>
            modeFilter ===
              'all' ||
            getMode(
              attempt
            ) ===
              modeFilter
        ),
      [
        attempts,
        modeFilter
      ]
    );


  /*
   * TOTAL QUESTIONS ATTEMPTED
   */

  const totalAttemptedQuestions =
    useMemo(
      () =>
        attempts.reduce(
          (
            total,
            attempt
          ) =>
            total +
            getAttemptedCount(
              attempt
            ),
          0
        ),
      [
        attempts
      ]
    );


  /*
   * PRACTICE AVERAGE
   */

  const practiceAverage =
    useMemo(
      () => {

        if (
          practiceAttempts
            .length ===
          0
        ) {

          return 0;
        }


        const total =
          practiceAttempts
            .reduce(
              (
                sum,
                attempt
              ) =>
                sum +
                safeNumber(
                  attempt
                    .score_percent
                ),
              0
            );


        return roundNumber(
          total /
          practiceAttempts.length
        );
      },
      [
        practiceAttempts
      ]
    );


  /*
   * EXAM AVERAGE
   */

  const examAverage =
    useMemo(
      () => {

        if (
          examAttempts.length ===
          0
        ) {

          return 0;
        }


        const total =
          examAttempts.reduce(
            (
              sum,
              attempt
            ) =>
              sum +
              safeNumber(
                attempt
                  .score_percent
              ),
            0
          );


        return roundNumber(
          total /
          examAttempts.length
        );
      },
      [
        examAttempts
      ]
    );


  /*
   * BEST CSE EXAM %
   */

  const bestExamScore =
    useMemo(
      () => {

        if (
          examAttempts.length ===
          0
        ) {

          return 0;
        }


        return roundNumber(
          Math.max(
            ...examAttempts.map(
              attempt =>
                safeNumber(
                  attempt
                    .score_percent
                )
            )
          )
        );
      },
      [
        examAttempts
      ]
    );


  /*
   * DATE
   */

  function formatDate(
    value: string
  ) {

    return new Date(
      value
    ).toLocaleString(
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


  /*
   * PRACTICE LABEL
   */

  function performanceLabel(
    scorePercent:
      number
  ) {

    if (
      scorePercent >= 80
    ) {

      return 'Strong';
    }


    if (
      scorePercent >= 60
    ) {

      return 'Good';
    }


    if (
      scorePercent >= 40
    ) {

      return 'Needs Revision';
    }


    return 'Revise Again';
  }


  return (

    <section
      className="panel"
      style={{
        marginTop: '22px'
      }}
    >

      {/* HEADER */}

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

          <span
            className="eyebrow"
          >
            PRELIMS PERFORMANCE
          </span>


          <h2>
            My Prelims History
          </h2>


          <p>
            Track Practice Mode and
            CSE Exam Mode separately.
          </p>

        </div>


        <button
          type="button"
          className="secondary-btn"
          onClick={
            loadHistory
          }
        >
          Refresh
        </button>

      </div>


      {/* SUMMARY */}

      {!loading && (

        <div
          className="metrics-grid"
          style={{
            marginTop: '18px'
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
                {
                  attempts.length
                }
              </strong>

              <small>
                All sessions
              </small>

            </div>

          </article>


          <article
            className="metric-card"
          >

            <div>

              <span>
                Questions
              </span>

              <strong>
                {
                  totalAttemptedQuestions
                }
              </strong>

              <small>
                Total attempted
              </small>

            </div>

          </article>


          <article
            className="metric-card"
          >

            <div>

              <span>
                Practice Avg
              </span>

              <strong>
                {
                  practiceAverage
                }%
              </strong>

              <small>
                {
                  practiceAttempts.length
                } practice sessions
              </small>

            </div>

          </article>


          <article
            className="metric-card"
          >

            <div>

              <span>
                Exam Avg
              </span>

              <strong>
                {
                  examAverage
                }%
              </strong>

              <small>
                {
                  examAttempts.length
                } exam sessions
              </small>

            </div>

          </article>


          <article
            className="metric-card"
          >

            <div>

              <span>
                Best Exam
              </span>

              <strong>
                {
                  bestExamScore
                }%
              </strong>

              <small>
                CSE Exam Mode
              </small>

            </div>

          </article>

        </div>

      )}


      {/* MODE FILTER */}

      {!loading &&
        attempts.length > 0 && (

        <div
          style={{
            marginTop: '20px',
            padding: '16px',
            border:
              '1px solid rgba(255,255,255,.10)',
            borderRadius: '14px'
          }}
        >

          <span
            className="eyebrow"
          >
            HISTORY FILTER
          </span>


         <div
  className="history-filter-control"
>
  <label
    htmlFor="prelims-history-session-type"
  >
    Session Type
  </label>

  <select
    id="prelims-history-session-type"
    value={
      modeFilter
    }
    onChange={
      event =>
        setModeFilter(
          event.target
            .value as
            | 'all'
            | AttemptMode
        )
    }
  >

    <option value="all">
      All Sessions
    </option>

    <option value="practice">
      Practice Mode
    </option>

    <option value="exam">
      CSE Exam Mode
    </option>

  </select>
</div>
              onChange={
                event =>
                  setModeFilter(
                    event.target
                      .value as
                      | 'all'
                      | AttemptMode
                  )
              }
            >

              <option value="all">
                All Sessions
              </option>

              <option value="practice">
                Practice Mode
              </option>

              <option value="exam">
                CSE Exam Mode
              </option>

            </select>

          </label>

        </div>

      )}


      {/* LOADING */}

      {loading && (

        <p>
          Loading Prelims
          history...
        </p>

      )}


      {/* ERROR */}

      {error && (

        <div
          className="callout"
          style={{
            marginTop: '18px'
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
        attempts.length === 0 && (

        <div
          className="callout"
          style={{
            marginTop: '18px'
          }}
        >

          <strong>
            No Prelims attempts yet
          </strong>

          <p>
            Complete a Practice Mode
            or CSE Exam Mode session
            and your result will appear
            here automatically.
          </p>

        </div>

      )}


      {!loading &&
        !error &&
        attempts.length > 0 &&
        visibleAttempts.length ===
          0 && (

        <div
          className="callout"
          style={{
            marginTop: '18px'
          }}
        >

          <strong>
            No sessions found
          </strong>

          <p>
            There are no attempts
            under this session type
            yet.
          </p>

        </div>

      )}


      {/* HISTORY CARDS */}

      <div
        style={{
          display: 'grid',
          gap: '14px',
          marginTop: '20px'
        }}
      >

        {visibleAttempts.map(
          attempt => {

            const mode =
              getMode(
                attempt
              );

            const scorePercent =
              roundNumber(
                safeNumber(
                  attempt
                    .score_percent
                )
              );


            const attempted =
              getAttemptedCount(
                attempt
              );


            const correct =
              safeNumber(
                attempt
                  .correct_answers
              );


            const incorrect =
              safeNumber(
                attempt
                  .incorrect_answers
              );


            const unanswered =
              safeNumber(
                attempt
                  .unanswered_questions
              );


            const marks =
              safeNumber(
                attempt
                  .marks_obtained
              );


            const maxMarks =
              safeNumber(
                attempt
                  .max_marks
              );


            const negativeMarks =
              safeNumber(
                attempt
                  .negative_marks
              );


            const config =
              attempt
                .practice_config;


            const sourceLabel =
              originLabel(
                config
              );


            return (

              <article
                key={
                  attempt.id
                }
                style={{
                  border:
                    '1px solid rgba(255,255,255,0.10)',
                  borderRadius:
                    '16px',
                  padding: '18px'
                }}
              >

                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    gap: '16px',
                    alignItems:
                      'flex-start',
                    flexWrap: 'wrap'
                  }}
                >

                  {/* LEFT */}

                  <div
                    style={{
                      flex:
                        '1 1 520px'
                    }}
                  >

                    <div
                      className="tag-row"
                    >

                      <span
                        className="tag"
                      >
                        {
                          mode ===
                            'exam'
                            ? 'CSE Exam Mode'
                            : 'Practice Mode'
                        }
                      </span>


                      <span
                        className="tag"
                      >
                        {
                          attempt.subject ||
                          'Mixed'
                        }
                      </span>


                      {sourceLabel && (

                        <span
                          className="tag"
                        >
                          {
                            sourceLabel
                          }
                        </span>

                      )}


                      {config?.topic &&
                        config.topic !==
                          'all' && (

                        <span
                          className="tag"
                        >
                          {
                            config.topic
                          }
                        </span>

                      )}


                      {config?.difficulty &&
                        config.difficulty !==
                          'all' && (

                        <span
                          className="tag"
                        >
                          {
                            config
                              .difficulty
                          }
                        </span>

                      )}


                      {config?.question_type &&
                        config.question_type !==
                          'all' && (

                        <span
                          className="tag"
                        >
                          {
                            config
                              .question_type ===
                              'pyq'
                              ? 'PYQ'
                              : 'Practice Questions'
                          }
                        </span>

                      )}


                      {config?.cse_pyq_year &&
                        config.cse_pyq_year !==
                          'all' && (

                        <span
                          className="tag"
                        >
                          CSE PYQ{' '}
                          {
                            config
                              .cse_pyq_year
                          }
                        </span>

                      )}


                      {config?.state_exam &&
                        config.state_exam !==
                          'all' && (

                        <span
                          className="tag"
                        >
                          {
                            config
                              .state_exam
                          }
                        </span>

                      )}

                    </div>


                    {/* PRACTICE */}

                    {mode ===
                      'practice' && (

                      <>

                        <h3
                          style={{
                            marginBottom:
                              '8px'
                          }}
                        >
                          {
                            correct
                          }
                          /
                          {
                            attempt
                              .total_questions
                          }{' '}
                          correct
                        </h3>


                        <div
                          className="tag-row"
                        >

                          <span
                            className="tag"
                          >
                            {
                              scorePercent
                            }%
                          </span>


                          <span
                            className="tag"
                          >
                            {
                              performanceLabel(
                                scorePercent
                              )
                            }
                          </span>


                          <span
                            className="tag"
                          >
                            {
                              attempt
                                .total_questions
                            }{' '}
                            questions
                          </span>


                          {attempt
                            .duration_seconds && (

                            <span
                              className="tag"
                            >
                              {
                                formatDuration(
                                  attempt
                                    .duration_seconds
                                )
                              }
                            </span>

                          )}

                        </div>

                      </>

                    )}


                    {/* EXAM */}

                    {mode ===
                      'exam' && (

                      <>

                        <h3
                          style={{
                            marginBottom:
                              '8px'
                          }}
                        >
                          {
                            roundNumber(
                              marks,
                              2
                            )
                          }
                          /
                          {
                            roundNumber(
                              maxMarks,
                              2
                            )
                          }{' '}
                          marks
                        </h3>


                        <div
                          className="tag-row"
                        >

                          <span
                            className="tag"
                          >
                            {
                              scorePercent
                            }%
                          </span>


                          <span
                            className="tag"
                          >
                            Attempted{' '}
                            {
                              attempted
                            }
                          </span>


                          <span
                            className="tag"
                          >
                            Correct{' '}
                            {
                              correct
                            }
                          </span>


                          <span
                            className="tag"
                          >
                            Incorrect{' '}
                            {
                              incorrect
                            }
                          </span>


                          <span
                            className="tag"
                          >
                            Unanswered{' '}
                            {
                              unanswered
                            }
                          </span>


                          <span
                            className="tag"
                          >
                            Negative -
                            {
                              roundNumber(
                                negativeMarks,
                                2
                              )
                            }
                          </span>

                        </div>


                        <div
                          style={{
                            marginTop:
                              '12px'
                          }}
                        >

                          <p>
                            Time used:{' '}

                            <strong>
                              {
                                formatDuration(
                                  attempt
                                    .duration_seconds
                                )
                              }
                            </strong>

                            {attempt
                              .time_limit_seconds
                              ? (
                                <>
                                  {' '}of{' '}

                                  <strong>
                                    {
                                      formatDuration(
                                        attempt
                                          .time_limit_seconds
                                      )
                                    }
                                  </strong>
                                </>
                              )
                              : null}
                          </p>

                        </div>

                      </>

                    )}


                    <p>
                      {
                        formatDate(
                          attempt
                            .completed_at
                        )
                      }
                    </p>

                  </div>


                  {/* RIGHT SCORE */}

                  <div
                    style={{
                      textAlign:
                        'center',
                      minWidth:
                        '120px'
                    }}
                  >

                    <span
                      className="eyebrow"
                    >
                      {
                        mode ===
                          'exam'
                          ? 'MARKS %'
                          : 'ACCURACY'
                      }
                    </span>


                    <h2
                      style={{
                        fontSize:
                          '2rem',
                        margin:
                          '6px 0'
                      }}
                    >
                      {
                        scorePercent
                      }%
                    </h2>


                    {mode ===
                      'exam' && (

                      <small>
                        {
                          roundNumber(
                            marks,
                            2
                          )
                        }/
                        {
                          roundNumber(
                            maxMarks,
                            2
                          )
                        }
                      </small>

                    )}

                  </div>

                </div>

              </article>
            );
          }
        )}

      </div>

    </section>
  );
}

import {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


type PracticeAttempt = {
  id: string;

  total_questions:
    number;

  correct_answers:
    number;

  score_percent:
    number;

  subject:
    string | null;

  completed_at:
    string;
};


const ATTEMPT_SELECT = `
  id,
  total_questions,
  correct_answers,
  score_percent,
  subject,
  completed_at
`;


export function MyPrelimsHistory() {
  const [
    attempts,
    setAttempts
  ] =
    useState<PracticeAttempt[]>([]);

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

    const rows =
      (data || []) as PracticeAttempt[];

    setAttempts(
      rows
    );

    setLoading(false);
  }


  useEffect(
    () => {
      loadHistory();
    },
    []
  );


  const totalQuestions =
    useMemo(
      () =>
        attempts.reduce(
          (
            total,
            attempt
          ) =>
            total +
            attempt
              .total_questions,
          0
        ),
      [
        attempts
      ]
    );


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
              Number(
                attempt
                  .score_percent
              ),
            0
          );

        return Math.round(
          total /
          attempts.length
        );
      },
      [
        attempts
      ]
    );


  const bestScore =
    useMemo(
      () => {
        if (
          attempts.length ===
          0
        ) {
          return 0;
        }

        return Math.max(
          ...attempts.map(
            attempt =>
              Number(
                attempt
                  .score_percent
              )
          )
        );
      },
      [
        attempts
      ]
    );


  function formatDate(
    value:
      string
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


  function performanceLabel(
    scorePercent:
      number
  ) {
    if (
      scorePercent >=
      80
    ) {
      return 'Strong';
    }

    if (
      scorePercent >=
      60
    ) {
      return 'Good';
    }

    if (
      scorePercent >=
      40
    ) {
      return 'Needs Revision';
    }

    return 'Revise Again';
  }


  return (
    <section
      className="panel"
      style={{
        marginTop:
          '22px'
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
            '12px',

          flexWrap:
            'wrap'
        }}
      >

        <div>

          <span className="eyebrow">
            PRELIMS PRACTICE
          </span>


          <h2>
            My MCQ History
          </h2>


          <p>
            Track your previous practice
            sessions and identify areas
            that need more revision.
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


      {!loading && (
        <div
          className="metrics-grid"
          style={{
            marginTop:
              '18px'
          }}
        >

          <article className="metric-card">

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
                Practice sessions
              </small>

            </div>

          </article>


          <article className="metric-card">

            <div>

              <span>
                Questions
              </span>

              <strong>
                {
                  totalQuestions
                }
              </strong>

              <small>
                Total attempted
              </small>

            </div>

          </article>


          <article className="metric-card">

            <div>

              <span>
                Average
              </span>

              <strong>
                {
                  averageScore
                }%
              </strong>

              <small>
                Average score
              </small>

            </div>

          </article>


          <article className="metric-card">

            <div>

              <span>
                Best
              </span>

              <strong>
                {
                  bestScore
                }%
              </strong>

              <small>
                Best performance
              </small>

            </div>

          </article>

        </div>
      )}


      {loading && (
        <p>
          Loading MCQ history...
        </p>
      )}


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
            No Prelims attempts yet
          </strong>

          <p>
            Complete an MCQ practice
            session and your result will
            appear here automatically.
          </p>

        </div>

      )}


      <div
        style={{
          display:
            'grid',

          gap:
            '14px',

          marginTop:
            '20px'
        }}
      >

        {attempts.map(
          attempt => {

            const scorePercent =
              Number(
                attempt
                  .score_percent
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

                  padding:
                    '18px'
                }}
              >

                <div
                  style={{
                    display:
                      'flex',

                    justifyContent:
                      'space-between',

                    gap:
                      '16px',

                    alignItems:
                      'center',

                    flexWrap:
                      'wrap'
                  }}
                >

                  <div>

                    <span className="eyebrow">
                      {
                        attempt.subject ||
                        'Mixed'
                      }
                    </span>


                    <h3
                      style={{
                        marginBottom:
                          '8px'
                      }}
                    >
                      {
                        attempt.correct_answers
                      }
                      /
                      {
                        attempt.total_questions
                      }{' '}
                      correct
                    </h3>


                    <div className="tag-row">

                      <span className="tag">
                        {
                          scorePercent
                        }%
                      </span>


                      <span className="tag">
                        {
                          performanceLabel(
                            scorePercent
                          )
                        }
                      </span>


                      <span className="tag">
                        {
                          attempt
                            .total_questions
                        }{' '}
                        questions
                      </span>

                    </div>


                    <p>
                      {
                        formatDate(
                          attempt.completed_at
                        )
                      }
                    </p>

                  </div>


                  <div
                    style={{
                      textAlign:
                        'center',

                      minWidth:
                        '110px'
                    }}
                  >

                    <span className="eyebrow">
                      SCORE
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

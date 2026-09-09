import {
  useEffect,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


type ParsedAnswer = {
  question_id: string;
  selected_index: number | null;
  is_correct: boolean;
};


type QuestionMeta = {
  id: string;
  subject: string;
  topic: string | null;
  difficulty: string | null;
};


type AreaStat = {
  key: string;
  name: string;
  subject: string | null;

  total: number;
  attempted: number;
  correct: number;
  incorrect: number;
  unanswered: number;

  accuracy: number;
};


type OverallStats = {
  total: number;
  attempted: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  accuracy: number;
};


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


/*
 * SAFELY READ ONE
 * STORED ANSWER RECORD
 */

function parseAnswer(
  value: unknown
):
  ParsedAnswer | null {

  if (
    !value ||
    typeof value !==
      'object'
  ) {

    return null;
  }


  const record =
    value as
      Record<
        string,
        unknown
      >;


  if (
    typeof
      record.question_id !==
      'string'
  ) {

    return null;
  }


  const selectedIndex =
    typeof
      record.selected_index ===
      'number'
      ? record.selected_index
      : null;


  return {

    question_id:
      record.question_id,

    selected_index:
      selectedIndex,

    is_correct:
      record.is_correct ===
      true
  };
}


/*
 * CALCULATE ACCURACY
 *
 * Unanswered questions are shown
 * separately and are not treated
 * as incorrect attempts.
 */

function calculateAccuracy(
  correct: number,
  attempted: number
) {

  if (
    attempted <= 0
  ) {

    return 0;
  }


  return roundNumber(
    (
      correct /
      attempted
    ) *
    100,
    1
  );
}


/*
 * PERFORMANCE LABEL
 */

function performanceLabel(
  accuracy: number,
  attempted: number
) {

  if (
    attempted === 0
  ) {

    return 'Not Attempted';
  }


  if (
    accuracy >= 80
  ) {

    return 'Strong';
  }


  if (
    accuracy >= 65
  ) {

    return 'Good';
  }


  if (
    accuracy >= 50
  ) {

    return 'Needs Revision';
  }


  return 'Weak Area';
}


export function PrelimsWeakAreaAnalysis() {

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
    overall,
    setOverall
  ] =
    useState<OverallStats>({
      total: 0,
      attempted: 0,
      correct: 0,
      incorrect: 0,
      unanswered: 0,
      accuracy: 0
    });


  const [
    subjectStats,
    setSubjectStats
  ] =
    useState<
      AreaStat[]
    >([]);


  const [
    topicStats,
    setTopicStats
  ] =
    useState<
      AreaStat[]
    >([]);


  /*
   * LOAD ATTEMPT ANSWERS
   */

  async function loadAnalysis() {

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

      setError(
        'Sign in to view your Prelims analysis.'
      );

      setLoading(false);

      return;
    }


    /*
     * LOAD PRACTICE ATTEMPTS
     *
     * Pagination avoids losing older
     * attempts when history becomes large.
     */

    const attemptRows:
      {
        id: string;
        answers: unknown;
      }[] = [];


    const pageSize =
      500;


    let from =
      0;


    while (true) {

      const {
        data,
        error:
          attemptError
      } =
        await supabase
          .from(
            'practice_attempts'
          )
          .select(
            'id, answers'
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
          )
          .range(
            from,
            from +
            pageSize -
            1
          );


      if (attemptError) {

        console.error(
          'Unable to load Prelims attempts:',
          attemptError
        );

        setError(
          attemptError.message
        );

        setLoading(false);

        return;
      }


      const rows =
        data || [];


      attemptRows.push(
        ...rows
      );


      if (
        rows.length <
        pageSize
      ) {

        break;
      }


      from +=
        pageSize;
    }


    /*
     * FLATTEN ALL ANSWERS
     */

    const allAnswers:
      ParsedAnswer[] = [];


    attemptRows.forEach(
      attempt => {

        if (
          !Array.isArray(
            attempt.answers
          )
        ) {

          return;
        }


        attempt.answers.forEach(
          item => {

            const parsed =
              parseAnswer(
                item
              );


            if (parsed) {

              allAnswers.push(
                parsed
              );
            }
          }
        );
      }
    );


    if (
      allAnswers.length ===
      0
    ) {

      setOverall({
        total: 0,
        attempted: 0,
        correct: 0,
        incorrect: 0,
        unanswered: 0,
        accuracy: 0
      });


      setSubjectStats([]);

      setTopicStats([]);

      setLoading(false);

      return;
    }


    /*
     * UNIQUE QUESTION IDS
     */

    const questionIds =
      Array.from(
        new Set(
          allAnswers.map(
            answer =>
              answer.question_id
          )
        )
      );


    /*
     * LOAD QUESTION METADATA
     *
     * Query in chunks so this remains
     * safe with a large question bank.
     */

    const questionRows:
      QuestionMeta[] = [];


    const questionChunkSize =
      200;


    for (
      let start = 0;
      start <
      questionIds.length;
      start +=
      questionChunkSize
    ) {

      const chunk =
        questionIds.slice(
          start,
          start +
          questionChunkSize
        );


      const {
        data,
        error:
          questionError
      } =
        await supabase
          .from(
            'questions'
          )
          .select(`
            id,
            subject,
            topic,
            difficulty
          `)
          .in(
            'id',
            chunk
          );


      if (questionError) {

        console.error(
          'Unable to load question metadata:',
          questionError
        );

        setError(
          questionError.message
        );

        setLoading(false);

        return;
      }


      (
        data || []
      ).forEach(
        item => {

          questionRows.push({

            id:
              String(
                item.id
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
              item.difficulty
                ? String(
                    item.difficulty
                  )
                : null
          });
        }
      );
    }


    /*
     * QUESTION LOOKUP
     */

    const questionMap =
      new Map<
        string,
        QuestionMeta
      >();


    questionRows.forEach(
      question => {

        questionMap.set(
          question.id,
          question
        );
      }
    );


    /*
     * OVERALL PERFORMANCE
     */

    let total =
      0;

    let attempted =
      0;

    let correct =
      0;

    let incorrect =
      0;

    let unanswered =
      0;


    /*
     * SUBJECT AGGREGATION
     */

    const subjectMap =
      new Map<
        string,
        AreaStat
      >();


    /*
     * TOPIC AGGREGATION
     */

    const topicMap =
      new Map<
        string,
        AreaStat
      >();


    /*
     * PROCESS EVERY ANSWER
     */

    allAnswers.forEach(
      answer => {

        const question =
          questionMap.get(
            answer.question_id
          );


        /*
         * Question may have been deleted
         * after an old attempt.
         */

        if (!question) {

          return;
        }


        total += 1;


        const hasAnswer =
          answer.selected_index !==
          null;


        if (hasAnswer) {

          attempted += 1;


          if (
            answer.is_correct
          ) {

            correct += 1;

          } else {

            incorrect += 1;
          }

        } else {

          unanswered += 1;
        }


        /*
         * SUBJECT
         */

        const subjectName =
          question.subject ||
          'Other';


        if (
          !subjectMap.has(
            subjectName
          )
        ) {

          subjectMap.set(
            subjectName,
            {
              key:
                subjectName,

              name:
                subjectName,

              subject:
                null,

              total:
                0,

              attempted:
                0,

              correct:
                0,

              incorrect:
                0,

              unanswered:
                0,

              accuracy:
                0
            }
          );
        }


        const subject =
          subjectMap.get(
            subjectName
          );


        if (subject) {

          subject.total +=
            1;


          if (hasAnswer) {

            subject.attempted +=
              1;


            if (
              answer.is_correct
            ) {

              subject.correct +=
                1;

            } else {

              subject.incorrect +=
                1;
            }

          } else {

            subject.unanswered +=
              1;
          }
        }


        /*
         * TOPIC
         */

        const topicName =
          question.topic ||
          'General';


        const topicKey =
          `${subjectName}::${topicName}`;


        if (
          !topicMap.has(
            topicKey
          )
        ) {

          topicMap.set(
            topicKey,
            {
              key:
                topicKey,

              name:
                topicName,

              subject:
                subjectName,

              total:
                0,

              attempted:
                0,

              correct:
                0,

              incorrect:
                0,

              unanswered:
                0,

              accuracy:
                0
            }
          );
        }


        const topic =
          topicMap.get(
            topicKey
          );


        if (topic) {

          topic.total +=
            1;


          if (hasAnswer) {

            topic.attempted +=
              1;


            if (
              answer.is_correct
            ) {

              topic.correct +=
                1;

            } else {

              topic.incorrect +=
                1;
            }

          } else {

            topic.unanswered +=
              1;
          }
        }
      }
    );


    /*
     * FINALIZE SUBJECT STATS
     */

    const subjects =
      Array.from(
        subjectMap.values()
      )
        .map(
          item => ({
            ...item,

            accuracy:
              calculateAccuracy(
                item.correct,
                item.attempted
              )
          })
        )
        .sort(
          (
            a,
            b
          ) => {

            if (
              a.accuracy !==
              b.accuracy
            ) {

              return (
                a.accuracy -
                b.accuracy
              );
            }


            return (
              b.attempted -
              a.attempted
            );
          }
        );


    /*
     * FINALIZE TOPIC STATS
     */

    const topics =
      Array.from(
        topicMap.values()
      )
        .map(
          item => ({
            ...item,

            accuracy:
              calculateAccuracy(
                item.correct,
                item.attempted
              )
          })
        )
        .sort(
          (
            a,
            b
          ) => {

            /*
             * Topics with no answers
             * are revision priority.
             */

            if (
              a.attempted ===
                0 &&
              b.attempted >
                0
            ) {

              return -1;
            }


            if (
              b.attempted ===
                0 &&
              a.attempted >
                0
            ) {

              return 1;
            }


            if (
              a.accuracy !==
              b.accuracy
            ) {

              return (
                a.accuracy -
                b.accuracy
              );
            }


            return (
              b.attempted -
              a.attempted
            );
          }
        );


    setOverall({

      total,

      attempted,

      correct,

      incorrect,

      unanswered,

      accuracy:
        calculateAccuracy(
          correct,
          attempted
        )
    });


    setSubjectStats(
      subjects
    );


    setTopicStats(
      topics
    );


    setLoading(false);
  }


  useEffect(
    () => {

      void loadAnalysis();

    },
    []
  );


  /*
   * TOP FIVE PRIORITY TOPICS
   */

  const priorityTopics =
    topicStats
      .filter(
        item =>
          item.total >
          0
      )
      .slice(
        0,
        5
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
            Weak Area Analysis
          </h2>


          <p>
            Identify subjects and
            topics that need more
            revision from your actual
            practice history.
          </p>

        </div>


        <button
          type="button"
          className="secondary-btn"
          onClick={
            loadAnalysis
          }
        >
          Refresh Analysis
        </button>

      </div>


      {/* LOADING */}

      {loading && (

        <p>
          Analysing your Prelims
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


      {/* NO DATA */}

      {!loading &&
        !error &&
        overall.total ===
          0 && (

        <div
          className="callout"
          style={{
            marginTop:
              '18px'
          }}
        >

          <strong>
            Not enough practice data yet
          </strong>


          <p>
            Complete Prelims Practice
            or CSE Exam sessions.
            Your weak-area analysis
            will appear automatically.
          </p>

        </div>

      )}


      {/* ANALYSIS */}

      {!loading &&
        !error &&
        overall.total >
          0 && (

        <>

          {/* OVERALL METRICS */}

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
                  Accuracy
                </span>


                <strong>
                  {
                    overall.accuracy
                  }%
                </strong>


                <small>
                  Correct among attempted
                </small>

              </div>

            </article>


            <article
              className="metric-card"
            >

              <div>

                <span>
                  Attempted
                </span>


                <strong>
                  {
                    overall.attempted
                  }
                </strong>


                <small>
                  Total answered
                </small>

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
                    overall.correct
                  }
                </strong>


                <small>
                  Correct responses
                </small>

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
                    overall.incorrect
                  }
                </strong>


                <small>
                  Revision opportunities
                </small>

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
                    overall.unanswered
                  }
                </strong>


                <small>
                  Exam questions skipped
                </small>

              </div>

            </article>

          </div>


          {/* PRIORITY TOPICS */}

          <div
            style={{
              marginTop:
                '22px',

              padding:
                '18px',

              border:
                '1px solid rgba(251,191,36,.25)',

              borderRadius:
                '16px',

              background:
                'rgba(251,191,36,.035)'
            }}
          >

            <span
              className="eyebrow"
            >
              REVISION PRIORITY
            </span>


            <h3>
              Topics to Focus on First
            </h3>


            <p>
              Lower accuracy and
              unanswered questions are
              placed higher in this list.
            </p>


            <div
              style={{
                display:
                  'grid',

                gap:
                  '10px',

                marginTop:
                  '14px'
              }}
            >

              {priorityTopics.map(
                (
                  topic,
                  topicIndex
                ) => (

                  <article
                    key={
                      topic.key
                    }
                    style={{
                      padding:
                        '14px',

                      border:
                        '1px solid rgba(255,255,255,.09)',

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

                        gap:
                          '12px',

                        alignItems:
                          'flex-start',

                        flexWrap:
                          'wrap'
                      }}
                    >

                      <div>

                        <span
                          className="tag"
                        >
                          Priority{' '}
                          {
                            topicIndex +
                            1
                          }
                        </span>


                        <h3
                          style={{
                            marginBottom:
                              '5px'
                          }}
                        >
                          {
                            topic.name
                          }
                        </h3>


                        <small>
                          {
                            topic.subject
                          }
                        </small>

                      </div>


                      <div
                        style={{
                          textAlign:
                            'right'
                        }}
                      >

                        <strong
                          style={{
                            fontSize:
                              '1.35rem'
                          }}
                        >
                          {
                            topic.accuracy
                          }%
                        </strong>


                        <small
                          style={{
                            display:
                              'block'
                          }}
                        >
                          {
                            performanceLabel(
                              topic.accuracy,
                              topic.attempted
                            )
                          }
                        </small>

                      </div>

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
                        Attempted{' '}
                        {
                          topic.attempted
                        }
                      </span>


                      <span
                        className="tag"
                      >
                        Correct{' '}
                        {
                          topic.correct
                        }
                      </span>


                      <span
                        className="tag"
                      >
                        Wrong{' '}
                        {
                          topic.incorrect
                        }
                      </span>


                      {topic.unanswered >
                        0 && (

                        <span
                          className="tag"
                        >
                          Unanswered{' '}
                          {
                            topic.unanswered
                          }
                        </span>

                      )}

                    </div>

                  </article>

                )
              )}

            </div>

          </div>


          {/* SUBJECT PERFORMANCE */}

          <div
            style={{
              marginTop:
                '22px'
            }}
          >

            <span
              className="eyebrow"
            >
              SUBJECT PERFORMANCE
            </span>


            <h3>
              Subject-wise Analysis
            </h3>


            <div
              style={{
                display:
                  'grid',

                gap:
                  '12px',

                marginTop:
                  '14px'
              }}
            >

              {subjectStats.map(
                subject => (

                  <article
                    key={
                      subject.key
                    }
                    style={{
                      padding:
                        '16px',

                      border:
                        '1px solid rgba(255,255,255,.10)',

                      borderRadius:
                        '14px'
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

                        <h3
                          style={{
                            marginBottom:
                              '5px'
                          }}
                        >
                          {
                            subject.name
                          }
                        </h3>


                        <small>
                          {
                            performanceLabel(
                              subject.accuracy,
                              subject.attempted
                            )
                          }
                        </small>

                      </div>


                      <strong
                        style={{
                          fontSize:
                            '1.4rem'
                        }}
                      >
                        {
                          subject.accuracy
                        }%
                      </strong>

                    </div>


                    {/* PROGRESS BAR */}

                    <div
                      style={{
                        width:
                          '100%',

                        height:
                          '8px',

                        background:
                          'rgba(255,255,255,.08)',

                        borderRadius:
                          '999px',

                        overflow:
                          'hidden',

                        marginTop:
                          '12px'
                      }}
                    >

                      <div
                        style={{
                          width:
                            `${
                              Math.min(
                                100,
                                subject.accuracy
                              )
                            }%`,

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
                          '12px'
                      }}
                    >

                      <span
                        className="tag"
                      >
                        Attempted{' '}
                        {
                          subject.attempted
                        }
                      </span>


                      <span
                        className="tag"
                      >
                        Correct{' '}
                        {
                          subject.correct
                        }
                      </span>


                      <span
                        className="tag"
                      >
                        Wrong{' '}
                        {
                          subject.incorrect
                        }
                      </span>


                      {subject.unanswered >
                        0 && (

                        <span
                          className="tag"
                        >
                          Unanswered{' '}
                          {
                            subject.unanswered
                          }
                        </span>

                      )}

                    </div>

                  </article>

                )
              )}

            </div>

          </div>


          <div
            className="callout"
            style={{
              marginTop:
                '18px'
            }}
          >

            <strong>
              How to use this analysis
            </strong>


            <p>
              Start revision with the
              lowest-performing topics,
              then practise those topics
              again using the Prelims
              question filters and your
              Revision Bank.
            </p>

          </div>

        </>

      )}

    </section>
  );
}

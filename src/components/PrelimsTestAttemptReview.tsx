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


type AnswerRecord = {
  question_id: string;
  selected_index: number | null;
  correct_index: number;
  is_correct: boolean;
  marked_for_review: boolean;
};


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
  completed_at: string | null;

  answers: AnswerRecord[];
};


type TestRow = {
  id: string;
  title: string;
  paper: string | null;
  test_type: string | null;
};


type MappingRow = {
  question_id: string;
  position: number;
};


type QuestionRow = {
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


type Props = {
  attemptId: string;
  onClose: () => void;
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


function formatDuration(
  seconds:
    number |
    null
) {

  if (
    seconds === null ||
    seconds <
      0
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
    hours >
    0
  ) {

    return (
      `${hours}h ` +
      `${minutes}m`
    );
  }


  if (
    minutes >
    0
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


function parseAnswers(
  value: unknown
): AnswerRecord[] {

  if (
    !Array.isArray(
      value
    )
  ) {

    return [];
  }


  return value
    .map(
      item => {

        if (
          !item ||
          typeof item !==
            'object'
        ) {

          return null;
        }


        const row =
          item as
            Record<
              string,
              unknown
            >;


        if (
          !row.question_id
        ) {

          return null;
        }


        const selectedIndex =
          row.selected_index ===
            null ||
          row.selected_index ===
            undefined
            ? null
            : safeNumber(
                row.selected_index
              );


        return {

          question_id:
            String(
              row.question_id
            ),

          selected_index:
            selectedIndex,

          correct_index:
            safeNumber(
              row.correct_index
            ),

          is_correct:
            row.is_correct ===
            true,

          marked_for_review:
            row.marked_for_review ===
            true
        };

      }
    )
    .filter(
      (
        item
      ): item is
        AnswerRecord =>
          item !==
          null
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


export function PrelimsTestAttemptReview({
  attemptId,
  onClose
}: Props) {

  /*
   * DATA
   */

  const [
    attempt,
    setAttempt
  ] =
    useState<AttemptRow | null>(
      null
    );


  const [
    test,
    setTest
  ] =
    useState<TestRow | null>(
      null
    );


  const [
    questions,
    setQuestions
  ] =
    useState<QuestionRow[]>(
      []
    );


  const [
    questionOrder,
    setQuestionOrder
  ] =
    useState<string[]>(
      []
    );


  /*
   * STATE
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


  /*
   * ANSWER LOOKUP
   */

  const answerMap =
    useMemo(
      () => {

        const map =
          new Map<
            string,
            AnswerRecord
          >();


        (
          attempt?.answers ||
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
        attempt
      ]
    );


  /*
   * QUESTION LOOKUP
   */

  const questionMap =
    useMemo(
      () => {

        const map =
          new Map<
            string,
            QuestionRow
          >();


        questions.forEach(
          question => {

            map.set(
              question.id,
              question
            );
          }
        );


        return map;

      },
      [
        questions
      ]
    );


  /*
   * LOAD ATTEMPT
   */

  async function loadAttempt() {

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

      setError(
        'Sign in to review this Test Series attempt.'
      );

      setLoading(
        false
      );

      return;
    }


    /*
     * LOAD OWN ATTEMPT
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
          answers,
          total_questions,
          attempted_questions,
          correct_answers,
          incorrect_answers,
          unanswered_questions,
          marks_obtained,
          max_marks,
          negative_marks,
          duration_seconds,
          completed_at
          `
        )
        .eq(
          'id',
          attemptId
        )
        .eq(
          'user_id',
          user.id
        )
        .single();


    if (
      attemptError ||
      !attemptData
    ) {

      console.error(
        'Unable to load Test Series attempt:',
        attemptError
      );


      setError(
        attemptError?.message ||
        'Attempt not found.'
      );

      setLoading(
        false
      );

      return;
    }


    const parsedAnswers =
      parseAnswers(
        attemptData.answers
      );


    const loadedAttempt:
      AttemptRow = {

      id:
        String(
          attemptData.id
        ),

      test_id:
        String(
          attemptData.test_id
        ),

      score:
        safeNumber(
          attemptData.score
        ),

      total_questions:
        safeNumber(
          attemptData.total_questions
        ),

      attempted_questions:
        safeNumber(
          attemptData.attempted_questions
        ),

      correct_answers:
        safeNumber(
          attemptData.correct_answers
        ),

      incorrect_answers:
        safeNumber(
          attemptData.incorrect_answers
        ),

      unanswered_questions:
        safeNumber(
          attemptData.unanswered_questions
        ),

      marks_obtained:
        attemptData.marks_obtained ===
          null
          ? null
          : safeNumber(
              attemptData.marks_obtained
            ),

      max_marks:
        attemptData.max_marks ===
          null
          ? null
          : safeNumber(
              attemptData.max_marks
            ),

      negative_marks:
        safeNumber(
          attemptData.negative_marks
        ),

      duration_seconds:
        attemptData.duration_seconds ===
          null
          ? null
          : safeNumber(
              attemptData.duration_seconds
            ),

      completed_at:
        attemptData.completed_at
          ? String(
              attemptData.completed_at
            )
          : null,

      answers:
        parsedAnswers
    };


    setAttempt(
      loadedAttempt
    );


    /*
     * LOAD TEST INFORMATION
     *
     * If an old test is no longer
     * published, the student's RLS
     * may not return the test row.
     * Review still continues.
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
        .eq(
          'id',
          loadedAttempt.test_id
        )
        .maybeSingle();


    if (
      testError
    ) {

      console.warn(
        'Unable to load test metadata:',
        testError
      );
    }


    if (
      testData
    ) {

      setTest({

        id:
          String(
            testData.id
          ),

        title:
          String(
            testData.title ||
            'Prelims Test'
          ),

        paper:
          testData.paper
            ? String(
                testData.paper
              )
            : null,

        test_type:
          testData.test_type
            ? String(
                testData.test_type
              )
            : null
      });

    } else {

      setTest(
        null
      );
    }


    /*
     * LOAD ORIGINAL TEST ORDER
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
          `
          question_id,
          position
          `
        )
        .eq(
          'test_id',
          loadedAttempt.test_id
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

      console.warn(
        'Unable to load original test order:',
        mappingError
      );
    }


    const mappings =
      (
        mappingData ||
        []
      ).map(
        row => ({

          question_id:
            String(
              row.question_id
            ),

          position:
            safeNumber(
              row.position
            )
        })
      );


    /*
     * ANSWER QUESTION IDS
     *
     * These are the questions
     * actually stored in this
     * student's attempt.
     */

    const answerIds =
      parsedAnswers.map(
        answer =>
          answer.question_id
      );


    /*
     * USE TEST ORDER FIRST,
     * THEN ANY ATTEMPT IDS
     * NOT FOUND IN MAPPING.
     */

    const orderedIds:
      string[] = [];


    mappings.forEach(
      mapping => {

        if (
          answerIds.includes(
            mapping.question_id
          ) &&
          !orderedIds.includes(
            mapping.question_id
          )
        ) {

          orderedIds.push(
            mapping.question_id
          );
        }
      }
    );


    answerIds.forEach(
      questionId => {

        if (
          !orderedIds.includes(
            questionId
          )
        ) {

          orderedIds.push(
            questionId
          );
        }
      }
    );


    setQuestionOrder(
      orderedIds
    );


    /*
     * LOAD QUESTION CONTENT
     */

    if (
      answerIds.length ===
      0
    ) {

      setQuestions(
        []
      );

      setLoading(
        false
      );

      return;
    }


    const loadedQuestions:
      QuestionRow[] = [];


    const chunkSize =
      200;


    for (
      let start = 0;
      start <
        answerIds.length;
      start +=
        chunkSize
    ) {

      const chunk =
        answerIds.slice(
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
            `
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
            `
          )
          .in(
            'id',
            chunk
          );


      if (
        questionError
      ) {

        console.error(
          'Unable to load review questions:',
          questionError
        );


        setError(
          questionError.message
        );

        setLoading(
          false
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
                item.correct_index
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


    setQuestions(
      loadedQuestions
    );


    setLoading(
      false
    );
  }


  useEffect(
    () => {

      void loadAttempt();

    },
    [
      attemptId
    ]
  );


  /*
   * LOADING
   */

  if (
    loading
  ) {

    return (

      <section
        className="panel"
      >

        <span
          className="eyebrow"
        >
          TEST SERIES REVIEW
        </span>


        <h3>
          Loading attempt...
        </h3>

      </section>
    );
  }


  /*
   * ERROR
   */

  if (
    error &&
    !attempt
  ) {

    return (

      <section
        className="panel"
      >

        <span
          className="eyebrow"
        >
          TEST SERIES REVIEW
        </span>


        <h3>
          Unable to open attempt
        </h3>


        <div
          className="callout"
        >
          {error}
        </div>


        <button
          type="button"
          className="secondary-btn"

          onClick={
            onClose
          }

          style={{
            marginTop:
              '14px'
          }}
        >
          Back to History
        </button>

      </section>
    );
  }


  if (!attempt) {

    return null;
  }


  const displayTitle =
    test?.title ||
    'Prelims Test';


  const displayPaper =
    test?.paper ||
    'Prelims';


  return (

    <div>

      {/* HEADER */}

      <section
        className="panel"
      >

        <button
          type="button"
          className="secondary-btn"

          onClick={
            onClose
          }
        >
          ← Back to Test History
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
          PAST TEST REVIEW
        </span>


        <h2>
          {displayTitle}
        </h2>


        <p>
          {displayPaper}

          {test?.test_type
            ? ` • ${test.test_type}`
            : ''
          }

          {attempt.completed_at
            ? ` • ${formatDate(
                attempt.completed_at
              )}`
            : ''
          }
        </p>


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

      </section>


      {/* RESULT SUMMARY */}

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
          ATTEMPT SUMMARY
        </span>


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
                Score
              </span>


              <strong>
                {
                  roundNumber(
                    attempt.score,
                    1
                  )
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
                  attempt.marks_obtained ??
                  '—'
                }

                {
                  attempt.max_marks !==
                    null
                    ? ` / ${attempt.max_marks}`
                    : ''
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
                  attempt.correct_answers
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
                  attempt.incorrect_answers
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
                  attempt.unanswered_questions
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
                  formatDuration(
                    attempt.duration_seconds
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
              '14px'
          }}
        >

          <strong>
            Negative Marks
          </strong>

          <p>
            -{
              roundNumber(
                attempt.negative_marks,
                2
              )
            }
          </p>

        </div>

      </section>


      {/* ANSWER REVIEW */}

      <section
        style={{
          display:
            'grid',

          gap:
            '14px',

          marginTop:
            '14px'
        }}
      >

        {questionOrder.map(
          (
            questionId,
            index
          ) => {

            const answer =
              answerMap.get(
                questionId
              );


            const question =
              questionMap.get(
                questionId
              );


            if (!answer) {

              return null;
            }


            /*
             * If question content
             * cannot be read anymore,
             * still show the saved
             * answer status.
             */

            if (!question) {

              return (

                <article
                  className="panel"
                  key={
                    questionId
                  }
                >

                  <span
                    className="tag"
                  >
                    Question {
                      index +
                      1
                    }
                  </span>


                  <h3>
                    Question content
                    is no longer available
                  </h3>


                  <p>
                    The result for this
                    question remains saved
                    in your attempt.
                  </p>


                  <div
                    className="callout"
                  >

                    Status:{' '}

                    <strong>

                      {
                        answer.selected_index ===
                          null
                          ? 'Unanswered'
                          : answer.is_correct
                          ? 'Correct'
                          : 'Incorrect'
                      }

                    </strong>

                  </div>

                </article>
              );
            }


            const selectedIndex =
              answer.selected_index;


            const correctIndex =
              answer.correct_index;


            return (

              <article
                className="panel"
                key={
                  questionId
                }
              >

                {/* META */}

                <div
                  style={{
                    display:
                      'flex',

                    justifyContent:
                      'space-between',

                    gap:
                      '10px',

                    alignItems:
                      'flex-start',

                    flexWrap:
                      'wrap'
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
                      Question {
                        index +
                        1
                      }
                    </span>


                    <span
                      className="tag"
                    >
                      {
                        question.subject
                      }
                    </span>


                    <span
                      className="tag"
                    >
                      {
                        question.difficulty
                      }
                    </span>


                    {question.is_pyq && (

                      <span
                        className="tag"
                      >
                        PYQ
                        {
                          question.pyq_year
                            ? ` ${question.pyq_year}`
                            : ''
                        }
                      </span>

                    )}

                  </div>


                  <span
                    className="tag"
                  >

                    {
                      selectedIndex ===
                        null
                        ? 'Unanswered'
                        : answer.is_correct
                        ? 'Correct'
                        : 'Incorrect'
                    }

                  </span>

                </div>


                {/* QUESTION */}

                <h3
                  style={{
                    marginTop:
                      '14px',

                    lineHeight:
                      1.5
                  }}
                >
                  {
                    question.question
                  }
                </h3>


                {question.topic && (

                  <small
                    style={{
                      color:
                        '#94a3b8'
                    }}
                  >
                    Topic: {
                      question.topic
                    }
                  </small>

                )}


                {/* OPTIONS */}

                <div
                  style={{
                    display:
                      'grid',

                    gap:
                      '8px',

                    marginTop:
                      '14px'
                  }}
                >

                  {question.options.map(
                    (
                      option,
                      optionIndex
                    ) => {

                      const isCorrect =
                        optionIndex ===
                        correctIndex;


                      const isSelected =
                        optionIndex ===
                        selectedIndex;


                      return (

                        <div
                          key={
                            optionIndex
                          }

                          style={{
                            padding:
                              '12px',

                            borderRadius:
                              '10px',

                            border:
                              isCorrect
                                ? '1px solid rgba(20,184,166,.60)'
                                : isSelected
                                ? '1px solid rgba(245,158,11,.60)'
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
                              ✓ Correct Answer
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


                {/* UNANSWERED */}

                {selectedIndex ===
                  null && (

                  <div
                    className="callout"
                    style={{
                      marginTop:
                        '14px'
                    }}
                  >

                    You did not attempt
                    this question.

                  </div>

                )}


                {/* MARKED REVIEW */}

                {answer.marked_for_review && (

                  <div
                    className="tag"
                    style={{
                      marginTop:
                        '14px'
                    }}
                  >
                    Marked for Review
                  </div>

                )}


                {/* EXPLANATION */}

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
                      question.explanation ||
                      'No explanation available.'
                    }
                  </p>

                </div>


                {/* SOURCE */}

                {question.source && (

                  <small
                    style={{
                      display:
                        'block',

                      marginTop:
                        '10px',

                      color:
                        '#94a3b8'
                    }}
                  >
                    Source: {
                      question.source
                    }
                  </small>

                )}


                {/* REVISION BOOKMARK */}

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


        {questionOrder.length ===
          0 && (

          <article
            className="panel"
          >

            <h3>
              No saved answer details
            </h3>


            <p>
              This older attempt does not
              contain question-level answer
              data.
            </p>

          </article>

        )}

      </section>


      {/* FOOTER */}

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
            onClose
          }
        >
          Back to Test History
        </button>

      </section>

    </div>
  );
}

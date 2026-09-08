import {
  useEffect,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


type StudentAttempt = {
  id: string;
  user_id: string;
  question_id: string;
  answer_text: string;
  word_count: number;
  elapsed_seconds: number;

  submission_mode:
    | 'text'
    | 'pdf'
    | 'both';

  pdf_path:
    string | null;

  pdf_file_name:
    string | null;

  submitted_at:
    string | null;
};


type StudentEvaluation = {
  id: string;
  attempt_id: string;
  student_id: string;

  status:
    | 'pending'
    | 'in_review'
    | 'completed';

  score:
    number | null;

  max_marks:
    number | null;

  overall_feedback:
    string | null;

  strengths:
    string | null;

  improvements:
    string | null;

  structure_feedback:
    string | null;

  content_feedback:
    string | null;

  presentation_feedback:
    string | null;

  evaluated_at:
    string | null;
};


type QuestionInfo = {
  id: string;
  question: string;

  section_type:
    | 'gs'
    | 'optional';

  gs_paper:
    string | null;

  optional_subject:
    string | null;

  optional_paper:
    string | null;

  subject: string;

  topic:
    string | null;

  directive:
    string | null;

  marks:
    number | null;

  word_limit:
    number | null;
};


type EvaluationItem = {
  attempt:
    StudentAttempt;

  evaluation:
    StudentEvaluation | null;

  question:
    QuestionInfo | null;
};


const ATTEMPT_SELECT = `
  id,
  user_id,
  question_id,
  answer_text,
  word_count,
  elapsed_seconds,
  submission_mode,
  pdf_path,
  pdf_file_name,
  submitted_at
`;


const EVALUATION_SELECT = `
  id,
  attempt_id,
  student_id,
  status,
  score,
  max_marks,
  overall_feedback,
  strengths,
  improvements,
  structure_feedback,
  content_feedback,
  presentation_feedback,
  evaluated_at
`;


const QUESTION_SELECT = `
  id,
  question,
  section_type,
  gs_paper,
  optional_subject,
  optional_paper,
  subject,
  topic,
  directive,
  marks,
  word_limit
`;


export function MyMainsEvaluations() {
  const [
    items,
    setItems
  ] =
    useState<EvaluationItem[]>([]);

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
    message,
    setMessage
  ] =
    useState('');

  const [
    expandedAttemptId,
    setExpandedAttemptId
  ] =
    useState<string | null>(null);


  async function loadEvaluations() {
    if (!supabase) {
      setError(
        'Supabase is not configured.'
      );

      setLoading(false);

      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    const {
      data: {
        user
      }
    } =
      await supabase
        .auth
        .getUser();

    if (!user) {
      setItems([]);

      setError(
        'Sign in to view your Mains evaluations.'
      );

      setLoading(false);

      return;
    }

    const {
      data: attemptData,
      error: attemptError
    } =
      await supabase
        .from(
          'mains_attempts'
        )
        .select(
          ATTEMPT_SELECT
        )
        .eq(
          'user_id',
          user.id
        )
        .eq(
          'status',
          'submitted'
        )
        .order(
          'submitted_at',
          {
            ascending: false
          }
        );

    if (attemptError) {
      console.error(
        'Unable to load Mains attempts:',
        attemptError
      );

      setError(
        attemptError.message
      );

      setLoading(false);

      return;
    }

    const attempts =
      (attemptData || []) as StudentAttempt[];

    if (
      attempts.length ===
      0
    ) {
      setItems([]);
      setLoading(false);
      return;
    }

    const attemptIds =
      attempts.map(
        attempt =>
          attempt.id
      );

    const questionIds =
      Array.from(
        new Set(
          attempts.map(
            attempt =>
              attempt.question_id
          )
        )
      );

    const {
      data: evaluationData,
      error: evaluationError
    } =
      await supabase
        .from(
          'mains_evaluations'
        )
        .select(
          EVALUATION_SELECT
        )
        .in(
          'attempt_id',
          attemptIds
        );

    if (evaluationError) {
      console.error(
        'Unable to load Mains evaluations:',
        evaluationError
      );

      setError(
        evaluationError.message
      );

      setLoading(false);

      return;
    }

    const {
      data: questionData,
      error: questionError
    } =
      await supabase
        .from(
          'mains_questions'
        )
        .select(
          QUESTION_SELECT
        )
        .in(
          'id',
          questionIds
        );

    if (questionError) {
      console.error(
        'Unable to load Mains questions:',
        questionError
      );

      setError(
        questionError.message
      );

      setLoading(false);

      return;
    }

    const evaluations =
      (evaluationData || []) as StudentEvaluation[];

    const questions =
      (questionData || []) as QuestionInfo[];

    const evaluationMap =
      new Map<
        string,
        StudentEvaluation
      >();

    evaluations.forEach(
      evaluation => {
        evaluationMap.set(
          evaluation.attempt_id,
          evaluation
        );
      }
    );

    const questionMap =
      new Map<
        string,
        QuestionInfo
      >();

    questions.forEach(
      question => {
        questionMap.set(
          question.id,
          question
        );
      }
    );

    const combined:
      EvaluationItem[] =
      attempts.map(
        attempt => ({
          attempt,

          evaluation:
            evaluationMap.get(
              attempt.id
            ) ||
            null,

          question:
            questionMap.get(
              attempt.question_id
            ) ||
            null
        })
      );

    setItems(
      combined
    );

    setLoading(false);
  }


  useEffect(
    () => {
      loadEvaluations();
    },
    []
  );


  function formatDate(
    value:
      string | null
  ) {
    if (!value) {
      return 'Not available';
    }

    return new Date(
      value
    ).toLocaleString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
    );
  }


  function formatTime(
    totalSeconds:
      number
  ) {
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

    return [
      hours,
      minutes,
      seconds
    ]
      .map(
        value =>
          String(value)
            .padStart(
              2,
              '0'
            )
      )
      .join(':');
  }


  function statusLabel(
    item:
      EvaluationItem
  ) {
    const status =
      item.evaluation
        ?.status;

    if (
      status ===
      'completed'
    ) {
      return 'Evaluated';
    }

    if (
      status ===
      'in_review'
    ) {
      return 'In Review';
    }

    return 'Pending';
  }


  async function openPdf(
    pdfPath:
      string
  ) {
    if (!supabase) {
      return;
    }

    const {
      data,
      error
    } =
      await supabase
        .storage
        .from(
          'mains-answer-pdfs'
        )
        .createSignedUrl(
          pdfPath,
          300
        );

    if (
      error ||
      !data
    ) {
      setMessage(
        error?.message ||
        'Unable to open PDF.'
      );

      return;
    }

    window.open(
      data.signedUrl,
      '_blank',
      'noopener,noreferrer'
    );
  }


  const submittedCount =
    items.length;

  const evaluatedCount =
    items.filter(
      item =>
        item.evaluation
          ?.status ===
        'completed'
    ).length;

  const pendingCount =
    submittedCount -
    evaluatedCount;


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
            MAINS ANSWER WRITING
          </span>

          <h2>
            My Mains Evaluations
          </h2>

          <p>
            View your submitted answers,
            marks and evaluator feedback.
          </p>

        </div>


        <button
          type="button"
          className="secondary-btn"
          onClick={
            loadEvaluations
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
                Submitted
              </span>

              <strong>
                {submittedCount}
              </strong>

              <small>
                Mains answers
              </small>

            </div>

          </article>


          <article className="metric-card">

            <div>

              <span>
                Evaluated
              </span>

              <strong>
                {evaluatedCount}
              </strong>

              <small>
                Feedback ready
              </small>

            </div>

          </article>


          <article className="metric-card">

            <div>

              <span>
                Pending
              </span>

              <strong>
                {pendingCount}
              </strong>

              <small>
                Awaiting review
              </small>

            </div>

          </article>

        </div>
      )}


      {loading && (
        <p>
          Loading your Mains evaluations...
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
        items.length ===
          0 && (

        <div
          className="callout"
          style={{
            marginTop:
              '18px'
          }}
        >

          <strong>
            No Mains submissions yet
          </strong>

          <p>
            Submit a Mains answer from
            Practice and your evaluation
            will appear here.
          </p>

        </div>

      )}


      <div
        style={{
          display:
            'grid',

          gap:
            '16px',

          marginTop:
            '20px'
        }}
      >

        {items.map(
          item => {

            const question =
              item.question;

            const evaluation =
              item.evaluation;

            const expanded =
              expandedAttemptId ===
              item.attempt.id;

            const completed =
              evaluation?.status ===
              'completed';


            return (
              <article
                key={
                  item.attempt.id
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
                      '14px',

                    flexWrap:
                      'wrap'
                  }}
                >

                  <div
                    style={{
                      flex:
                        '1 1 500px'
                    }}
                  >

                    <span className="eyebrow">

                      {
                        question
                          ?.section_type ===
                        'optional'
                          ? `${question.optional_subject} • ${question.optional_paper}`
                          : question
                              ?.gs_paper ||
                            'MAINS'
                      }

                    </span>


                    <h3>
                      {
                        question
                          ?.question ||
                        'Question unavailable'
                      }
                    </h3>


                    <div className="tag-row">

                      <span className="tag">
                        {
                          statusLabel(
                            item
                          )
                        }
                      </span>


                      <span className="tag">
                        {
                          item.attempt
                            .word_count
                        }{' '}
                        words
                      </span>


                      <span className="tag">
                        {
                          formatTime(
                            item.attempt
                              .elapsed_seconds
                          )
                        }
                      </span>


                      {question?.marks && (

                        <span className="tag">
                          {
                            question.marks
                          }{' '}
                          marks
                        </span>

                      )}


                      <span className="tag">
                        {
                          item.attempt
                            .submission_mode
                            .toUpperCase()
                        }
                      </span>

                    </div>


                    <p>
                      Submitted:{' '}
                      {
                        formatDate(
                          item.attempt
                            .submitted_at
                        )
                      }
                    </p>

                  </div>


                  {completed && (

                    <div
                      style={{
                        minWidth:
                          '120px',

                        textAlign:
                          'center'
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
                          evaluation
                            ?.score ??
                          '—'
                        }
                        /
                        {
                          evaluation
                            ?.max_marks ??
                          question
                            ?.marks ??
                          '—'
                        }
                      </h2>

                    </div>

                  )}

                </div>


                <div
                  style={{
                    display:
                      'flex',

                    gap:
                      '10px',

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
                      setExpandedAttemptId(
                        expanded
                          ? null
                          : item.attempt.id
                      )
                    }
                  >
                    {
                      expanded
                        ? 'Hide details'
                        : completed
                        ? 'View Evaluation'
                        : 'View Submission'
                    }
                  </button>


                  {item.attempt
                    .pdf_path && (

                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() =>
                        openPdf(
                          item.attempt
                            .pdf_path as string
                        )
                      }
                    >
                      Open PDF
                    </button>

                  )}

                </div>


                {expanded && (

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

                    {item.attempt
                      .answer_text
                      .trim() && (

                      <div className="callout">

                        <span className="eyebrow">
                          YOUR SUBMITTED ANSWER
                        </span>


                        <p
                          style={{
                            whiteSpace:
                              'pre-wrap',

                            lineHeight:
                              1.75
                          }}
                        >
                          {
                            item.attempt
                              .answer_text
                          }
                        </p>

                      </div>

                    )}


                    {!completed && (

                      <div className="callout">

                        <span className="eyebrow">
                          EVALUATION STATUS
                        </span>


                        <h3>
                          {
                            statusLabel(
                              item
                            )
                          }
                        </h3>


                        <p>
                          Your answer is being
                          reviewed. Marks and
                          feedback will appear
                          here after evaluation.
                        </p>

                      </div>

                    )}


                    {completed &&
                      evaluation && (
                      <>

                        <div
                          className="callout"
                          style={{
                            border:
                              '1px solid rgba(45,212,191,0.35)',

                            background:
                              'rgba(20,184,166,0.07)'
                          }}
                        >

                          <span className="eyebrow">
                            RESULT
                          </span>


                          <h2>
                            {
                              evaluation
                                .score ??
                              '—'
                            }
                            /
                            {
                              evaluation
                                .max_marks ??
                              question
                                ?.marks ??
                              '—'
                            }
                          </h2>


                          <p>
                            Evaluated:{' '}
                            {
                              formatDate(
                                evaluation
                                  .evaluated_at
                              )
                            }
                          </p>

                        </div>


                        {evaluation
                          .strengths && (

                          <div className="callout">

                            <span className="eyebrow">
                              STRENGTHS
                            </span>


                            <p
                              style={{
                                whiteSpace:
                                  'pre-wrap'
                              }}
                            >
                              {
                                evaluation
                                  .strengths
                              }
                            </p>

                          </div>

                        )}


                        {evaluation
                          .improvements && (

                          <div className="callout">

                            <span className="eyebrow">
                              AREAS TO IMPROVE
                            </span>


                            <p
                              style={{
                                whiteSpace:
                                  'pre-wrap'
                              }}
                            >
                              {
                                evaluation
                                  .improvements
                              }
                            </p>

                          </div>

                        )}


                        {evaluation
                          .content_feedback && (

                          <div className="callout">

                            <span className="eyebrow">
                              CONTENT FEEDBACK
                            </span>


                            <p
                              style={{
                                whiteSpace:
                                  'pre-wrap'
                              }}
                            >
                              {
                                evaluation
                                  .content_feedback
                              }
                            </p>

                          </div>

                        )}


                        {evaluation
                          .structure_feedback && (

                          <div className="callout">

                            <span className="eyebrow">
                              STRUCTURE FEEDBACK
                            </span>


                            <p
                              style={{
                                whiteSpace:
                                  'pre-wrap'
                              }}
                            >
                              {
                                evaluation
                                  .structure_feedback
                              }
                            </p>

                          </div>

                        )}


                        {evaluation
                          .presentation_feedback && (

                          <div className="callout">

                            <span className="eyebrow">
                              PRESENTATION FEEDBACK
                            </span>


                            <p
                              style={{
                                whiteSpace:
                                  'pre-wrap'
                              }}
                            >
                              {
                                evaluation
                                  .presentation_feedback
                              }
                            </p>

                          </div>

                        )}


                        {evaluation
                          .overall_feedback && (

                          <div
                            className="callout"
                            style={{
                              border:
                                '1px solid rgba(45,212,191,0.35)',

                              background:
                                'rgba(20,184,166,0.07)'
                            }}
                          >

                            <span className="eyebrow">
                              OVERALL FEEDBACK
                            </span>


                            <p
                              style={{
                                whiteSpace:
                                  'pre-wrap',

                                lineHeight:
                                  1.7
                              }}
                            >
                              {
                                evaluation
                                  .overall_feedback
                              }
                            </p>

                          </div>

                        )}

                      </>
                    )}

                  </div>

                )}

              </article>
            );
          }
        )}

      </div>


      {message && (

        <p
          className="form-message"
          style={{
            marginTop:
              '16px'
          }}
        >
          {message}
        </p>

      )}

    </section>
  );
}

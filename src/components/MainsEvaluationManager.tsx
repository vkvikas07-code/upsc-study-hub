import {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


type EvaluationStatus =
  | 'pending'
  | 'in_review'
  | 'completed';


type AttemptRow = {
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

  evaluation_requested:
    boolean;

  submitted_at:
    string | null;

  created_at:
    string;

  updated_at:
    string;
};


type QuestionRow = {
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

  subject:
    string;

  topic:
    string | null;

  directive:
    string | null;

  marks:
    number | null;

  word_limit:
    number | null;
};


type EvaluationRow = {
  id: string;

  attempt_id:
    string;

  student_id:
    string;

  evaluator_id:
    string | null;

  status:
    EvaluationStatus;

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

  created_at:
    string;

  updated_at:
    string;
};


type EvaluationItem = {
  attempt:
    AttemptRow;

  question:
    QuestionRow | null;

  evaluation:
    EvaluationRow | null;
};


type StatusFilter =
  | 'all'
  | EvaluationStatus;


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
  evaluation_requested,
  submitted_at,
  created_at,
  updated_at
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


const EVALUATION_SELECT = `
  id,
  attempt_id,
  student_id,
  evaluator_id,
  status,
  score,
  max_marks,
  overall_feedback,
  strengths,
  improvements,
  structure_feedback,
  content_feedback,
  presentation_feedback,
  evaluated_at,
  created_at,
  updated_at
`;


export function MainsEvaluationManager() {
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
    saving,
    setSaving
  ] =
    useState(false);

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
    statusFilter,
    setStatusFilter
  ] =
    useState<StatusFilter>('all');

  const [
    selectedAttemptId,
    setSelectedAttemptId
  ] =
    useState<string | null>(null);

  const [
    score,
    setScore
  ] =
    useState('');

  const [
    strengths,
    setStrengths
  ] =
    useState('');

  const [
    improvements,
    setImprovements
  ] =
    useState('');

  const [
    contentFeedback,
    setContentFeedback
  ] =
    useState('');

  const [
    structureFeedback,
    setStructureFeedback
  ] =
    useState('');

  const [
    presentationFeedback,
    setPresentationFeedback
  ] =
    useState('');

  const [
    overallFeedback,
    setOverallFeedback
  ] =
    useState('');


  async function loadQueue() {
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
          'status',
          'submitted'
        )
        .eq(
          'evaluation_requested',
          true
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
  (attemptData || []) as AttemptRow[];

    if (
      attempts.length ===
      0
    ) {
      setItems([]);
      setLoading(false);
      return;
    }

    const questionIds =
      Array.from(
        new Set(
          attempts.map(
            attempt =>
              attempt.question_id
          )
        )
      );

    const attemptIds =
      attempts.map(
        attempt =>
          attempt.id
      );

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
        'Unable to load questions:',
        questionError
      );

      setError(
        questionError.message
      );

      setLoading(false);

      return;
    }

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
        'Unable to load evaluations:',
        evaluationError
      );

      setError(
        evaluationError.message
      );

      setLoading(false);

      return;
    }

    const questions =
  (questionData || []) as QuestionRow[];

   const evaluations =
  (evaluationData || []) as EvaluationRow[];

    const questionMap =
      new Map<
        string,
        QuestionRow
      >();

    questions.forEach(
      question => {
        questionMap.set(
          question.id,
          question
        );
      }
    );

    const evaluationMap =
      new Map<
        string,
        EvaluationRow
      >();

    evaluations.forEach(
      evaluation => {
        evaluationMap.set(
          evaluation.attempt_id,
          evaluation
        );
      }
    );

    const combined:
      EvaluationItem[] =
      attempts.map(
        attempt => ({
          attempt,

          question:
            questionMap.get(
              attempt.question_id
            ) ||
            null,

          evaluation:
            evaluationMap.get(
              attempt.id
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
      loadQueue();
    },
    []
  );


  const filteredItems =
    useMemo(
      () => {
        if (
          statusFilter ===
          'all'
        ) {
          return items;
        }

        return items.filter(
          item => {
            const status =
              item.evaluation
                ?.status ||
              'pending';

            return (
              status ===
              statusFilter
            );
          }
        );
      },
      [
        items,
        statusFilter
      ]
    );


  const selectedItem =
    useMemo(
      () => {
        if (
          !selectedAttemptId
        ) {
          return null;
        }

        return (
          items.find(
            item =>
              item.attempt.id ===
              selectedAttemptId
          ) ||
          null
        );
      },
      [
        items,
        selectedAttemptId
      ]
    );


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


  function getItemStatus(
    item:
      EvaluationItem
  ): EvaluationStatus {
    return (
      item.evaluation
        ?.status ||
      'pending'
    );
  }


  function startReview(
    item:
      EvaluationItem
  ) {
    setSelectedAttemptId(
      item.attempt.id
    );

    setScore(
      item.evaluation
        ?.score !==
      null &&
      item.evaluation
        ?.score !==
      undefined
        ? String(
            item.evaluation
              .score
          )
        : ''
    );

    setStrengths(
      item.evaluation
        ?.strengths ||
      ''
    );

    setImprovements(
      item.evaluation
        ?.improvements ||
      ''
    );

    setContentFeedback(
      item.evaluation
        ?.content_feedback ||
      ''
    );

    setStructureFeedback(
      item.evaluation
        ?.structure_feedback ||
      ''
    );

    setPresentationFeedback(
      item.evaluation
        ?.presentation_feedback ||
      ''
    );

    setOverallFeedback(
      item.evaluation
        ?.overall_feedback ||
      ''
    );

    setMessage(
      'Evaluation opened.'
    );
  }


  function closeReview() {
    setSelectedAttemptId(
      null
    );

    setScore('');
    setStrengths('');
    setImprovements('');
    setContentFeedback('');
    setStructureFeedback('');
    setPresentationFeedback('');
    setOverallFeedback('');
    setMessage('');
  }


  async function openPdf(
    item:
      EvaluationItem
  ) {
    if (
      !supabase ||
      !item.attempt.pdf_path
    ) {
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
          item.attempt
            .pdf_path,
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


  async function saveEvaluation(
    nextStatus:
      EvaluationStatus
  ) {
    if (
      !supabase ||
      !selectedItem
    ) {
      return;
    }

    const parsedScore =
      score.trim()
        ? Number(score)
        : null;

    const maxMarks =
      selectedItem
        .question
        ?.marks ||
      selectedItem
        .evaluation
        ?.max_marks ||
      null;

    if (
      parsedScore !==
        null &&
      (
        Number.isNaN(
          parsedScore
        ) ||
        parsedScore <
          0
      )
    ) {
      setMessage(
        'Enter a valid score.'
      );

      return;
    }

    if (
      parsedScore !==
        null &&
      maxMarks !==
        null &&
      parsedScore >
        maxMarks
    ) {
      setMessage(
        `Score cannot exceed ${maxMarks}.`
      );

      return;
    }

    if (
      nextStatus ===
        'completed' &&
      parsedScore ===
        null
    ) {
      setMessage(
        'Enter a score before publishing the evaluation.'
      );

      return;
    }

    if (
      nextStatus ===
        'completed' &&
      !overallFeedback
        .trim()
    ) {
      setMessage(
        'Add overall feedback before publishing.'
      );

      return;
    }

    setSaving(true);

    setMessage(
      nextStatus ===
        'completed'
        ? 'Publishing evaluation...'
        : 'Saving evaluation...'
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
      setSaving(false);

      setMessage(
        'Admin session expired. Sign in again.'
      );

      return;
    }

    const now =
      new Date()
        .toISOString();

    const payload = {
      attempt_id:
        selectedItem
          .attempt.id,

      student_id:
        selectedItem
          .attempt
          .user_id,

      evaluator_id:
        user.id,

      status:
        nextStatus,

      score:
        parsedScore,

      max_marks:
        maxMarks,

      strengths:
        strengths
          .trim() ||
        null,

      improvements:
        improvements
          .trim() ||
        null,

      content_feedback:
        contentFeedback
          .trim() ||
        null,

      structure_feedback:
        structureFeedback
          .trim() ||
        null,

      presentation_feedback:
        presentationFeedback
          .trim() ||
        null,

      overall_feedback:
        overallFeedback
          .trim() ||
        null,

      evaluated_at:
        nextStatus ===
        'completed'
          ? now
          : null,

      updated_at:
        now
    };

    let saved:
      EvaluationRow |
      null =
      null;


    if (
      selectedItem
        .evaluation
    ) {
      const {
        data,
        error
      } =
        await supabase
          .from(
            'mains_evaluations'
          )
          .update(
            payload
          )
          .eq(
            'id',
            selectedItem
              .evaluation
              .id
          )
          .select(
            EVALUATION_SELECT
          )
          .single();

      if (
        error ||
        !data
      ) {
        console.error(
          'Evaluation update failed:',
          error
        );

        setSaving(false);

        setMessage(
          error?.message ||
          'Unable to save evaluation.'
        );

        return;
      }

      saved =
        data as EvaluationRow;

    } else {

      const {
        data,
        error
      } =
        await supabase
          .from(
            'mains_evaluations'
          )
          .insert({
            ...payload,

            created_at:
              now
          })
          .select(
            EVALUATION_SELECT
          )
          .single();

      if (
        error ||
        !data
      ) {
        console.error(
          'Evaluation creation failed:',
          error
        );

        setSaving(false);

        setMessage(
          error?.message ||
          'Unable to create evaluation.'
        );

        return;
      }

      saved =
        data as EvaluationRow;
    }


    setItems(
      current =>
        current.map(
          item =>
            item.attempt.id ===
            selectedItem
              .attempt.id
              ? {
                  ...item,
                  evaluation:
                    saved
                }
              : item
        )
    );

    setSaving(false);

    setMessage(
      nextStatus ===
        'completed'
        ? 'Evaluation published to student.'
        : 'Evaluation saved as In Review.'
    );
  }


  return (
    <section
      style={{
        marginTop:
          '30px'
      }}
    >

      <div className="panel">

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
              MAINS EVALUATION
            </span>

            <h2>
              Student Answer Evaluation Queue
            </h2>

            <p>
              Review typed answers and
              uploaded PDFs, award marks
              and publish structured
              feedback.
            </p>

          </div>


          <button
            type="button"
            className="secondary-btn"
            onClick={
              loadQueue
            }
          >
            Refresh Queue
          </button>

        </div>


        <div
          className="filter-row"
          style={{
            marginTop:
              '16px'
          }}
        >

          <button
            type="button"
            className={
              statusFilter ===
              'all'
                ? 'filter active'
                : 'filter'
            }
            onClick={() =>
              setStatusFilter(
                'all'
              )
            }
          >
            All
          </button>


          <button
            type="button"
            className={
              statusFilter ===
              'pending'
                ? 'filter active'
                : 'filter'
            }
            onClick={() =>
              setStatusFilter(
                'pending'
              )
            }
          >
            Pending
          </button>


          <button
            type="button"
            className={
              statusFilter ===
              'in_review'
                ? 'filter active'
                : 'filter'
            }
            onClick={() =>
              setStatusFilter(
                'in_review'
              )
            }
          >
            In Review
          </button>


          <button
            type="button"
            className={
              statusFilter ===
              'completed'
                ? 'filter active'
                : 'filter'
            }
            onClick={() =>
              setStatusFilter(
                'completed'
              )
            }
          >
            Completed
          </button>

        </div>


        {loading && (
          <p>
            Loading submitted answers...
          </p>
        )}


        {error && (
          <div className="callout">

            <strong>
              Unable to load evaluations
            </strong>

            <p>
              {error}
            </p>

          </div>
        )}


        {!loading &&
          !error &&
          filteredItems.length ===
            0 && (

          <div
            className="callout"
            style={{
              marginTop:
                '16px'
            }}
          >

            <strong>
              No submissions found
            </strong>

            <p>
              Student answers submitted
              for evaluation will appear
              here.
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
              '18px'
          }}
        >

          {filteredItems.map(
            item => {

              const status =
                getItemStatus(
                  item
                );

              const question =
                item.question;


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
                        '16px',

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
                            : question?.gs_paper ||
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


                      <p>
                        <strong>
                          Student:
                        </strong>{' '}

                        {
                          item.attempt
                            .user_id
                            .slice(
                              0,
                              8
                            )
                        }
                        …
                      </p>


                      <p>
                        <strong>
                          Submitted:
                        </strong>{' '}

                        {
                          formatDate(
                            item.attempt
                              .submitted_at
                          )
                        }
                      </p>


                      <div className="tag-row">

                        <span className="tag">
                          {
                            item.attempt
                              .submission_mode
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
                            status ===
                            'in_review'
                              ? 'In Review'
                              : status ===
                                'completed'
                              ? 'Completed'
                              : 'Pending'
                          }
                        </span>

                      </div>

                    </div>


                    <div
                      style={{
                        display:
                          'flex',

                        gap:
                          '8px',

                        flexWrap:
                          'wrap',

                        alignItems:
                          'flex-start'
                      }}
                    >

                      {item.attempt
                        .pdf_path && (

                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() =>
                            openPdf(
                              item
                            )
                          }
                        >
                          Open PDF
                        </button>

                      )}


                      <button
                        type="button"
                        className="primary-btn"
                        onClick={() =>
                          startReview(
                            item
                          )
                        }
                      >
                        {
                          status ===
                          'completed'
                            ? 'View / Edit Evaluation'
                            : 'Evaluate Answer'
                        }
                      </button>

                    </div>

                  </div>

                </article>
              );
            }
          )}

        </div>

      </div>


      {selectedItem && (

        <div
          className="panel admin-form"
          style={{
            marginTop:
              '22px'
          }}
        >

          <span className="eyebrow">
            EVALUATOR WORKSPACE
          </span>


          <h2>
            Evaluate Mains Answer
          </h2>


          {selectedItem.question && (

            <div
              className="callout"
              style={{
                marginBottom:
                  '18px'
              }}
            >

              <strong>
                {
                  selectedItem
                    .question
                    .question
                }
              </strong>


              <p>
                {
                  selectedItem
                    .question
                    .directive ||
                  'Answer Writing'
                }
                {' • '}

                {
                  selectedItem
                    .question
                    .marks ||
                  '—'
                }
                {' marks • '}

                {
                  selectedItem
                    .question
                    .word_limit ||
                  '—'
                }
                {' words'}
              </p>

            </div>

          )}


          <div
            style={{
              display:
                'grid',

              gridTemplateColumns:
                'repeat(3, minmax(0, 1fr))',

              gap:
                '10px',

              marginBottom:
                '18px'
            }}
          >

            <div className="callout">

              <strong>
                Words
              </strong>

              <p>
                {
                  selectedItem
                    .attempt
                    .word_count
                }
              </p>

            </div>


            <div className="callout">

              <strong>
                Time Taken
              </strong>

              <p>
                {
                  formatTime(
                    selectedItem
                      .attempt
                      .elapsed_seconds
                  )
                }
              </p>

            </div>


            <div className="callout">

              <strong>
                Mode
              </strong>

              <p>
                {
                  selectedItem
                    .attempt
                    .submission_mode
                    .toUpperCase()
                }
              </p>

            </div>

          </div>


          {selectedItem
            .attempt
            .answer_text
            .trim() && (

            <div
              className="callout"
              style={{
                marginBottom:
                  '18px'
              }}
            >

              <strong>
                Student Typed Answer
              </strong>


              <p
                style={{
                  whiteSpace:
                    'pre-wrap',

                  lineHeight:
                    1.75
                }}
              >
                {
                  selectedItem
                    .attempt
                    .answer_text
                }
              </p>

            </div>

          )}


          {selectedItem
            .attempt
            .pdf_path && (

            <button
              type="button"
              className="secondary-btn"
              onClick={() =>
                openPdf(
                  selectedItem
                )
              }
              style={{
                marginBottom:
                  '18px'
              }}
            >
              Open Student PDF
            </button>

          )}


          <label>

            Score

            <input
              type="number"
              min="0"
              max={
                selectedItem
                  .question
                  ?.marks ||
                undefined
              }
              step="0.5"
              value={
                score
              }
              onChange={
                event =>
                  setScore(
                    event.target.value
                  )
              }
              placeholder={
                selectedItem
                  .question
                  ?.marks
                  ? `Score out of ${selectedItem.question.marks}`
                  : 'Enter score'
              }
            />

          </label>


          <label>

            Strengths

            <textarea
              rows={4}
              value={
                strengths
              }
              onChange={
                event =>
                  setStrengths(
                    event.target.value
                  )
              }
              placeholder="What did the student do well?"
            />

          </label>


          <label>

            Areas for Improvement

            <textarea
              rows={4}
              value={
                improvements
              }
              onChange={
                event =>
                  setImprovements(
                    event.target.value
                  )
              }
              placeholder="What should the student improve?"
            />

          </label>


          <label>

            Content Feedback

            <textarea
              rows={5}
              value={
                contentFeedback
              }
              onChange={
                event =>
                  setContentFeedback(
                    event.target.value
                  )
              }
              placeholder="Accuracy, relevance, examples and analysis..."
            />

          </label>


          <label>

            Structure Feedback

            <textarea
              rows={5}
              value={
                structureFeedback
              }
              onChange={
                event =>
                  setStructureFeedback(
                    event.target.value
                  )
              }
              placeholder="Introduction, body organisation, headings, flow and conclusion..."
            />

          </label>


          <label>

            Presentation Feedback

            <textarea
              rows={4}
              value={
                presentationFeedback
              }
              onChange={
                event =>
                  setPresentationFeedback(
                    event.target.value
                  )
              }
              placeholder="Readability, diagrams, spacing and highlighting..."
            />

          </label>


          <label>

            Overall Feedback

            <textarea
              rows={6}
              value={
                overallFeedback
              }
              onChange={
                event =>
                  setOverallFeedback(
                    event.target.value
                  )
              }
              placeholder="Give the student an overall assessment and clear next steps."
            />

          </label>


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
              disabled={
                saving
              }
              onClick={() =>
                saveEvaluation(
                  'in_review'
                )
              }
            >
              {
                saving
                  ? 'Saving...'
                  : 'Save Evaluation'
              }
            </button>


            <button
              type="button"
              className="primary-btn"
              disabled={
                saving
              }
              onClick={() =>
                saveEvaluation(
                  'completed'
                )
              }
            >
              Publish Evaluation
            </button>


            <button
              type="button"
              className="secondary-btn"
              disabled={
                saving
              }
              onClick={
                closeReview
              }
            >
              Close
            </button>

          </div>


          {message && (

            <p className="form-message">
              {message}
            </p>

          )}

        </div>

      )}

    </section>
  );
}

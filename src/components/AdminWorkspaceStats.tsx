import {
  useEffect,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


type AdminTab =
  | 'current'
  | 'mcq'
  | 'mains'
  | 'evaluation';


type AttemptRow = {
  id: string;
};


type EvaluationRow = {
  attempt_id: string;

  status:
    | 'pending'
    | 'in_review'
    | 'completed';
};


export function AdminWorkspaceStats({
  onNavigate
}: {
  onNavigate:
    (tab: AdminTab) => void;
}) {
  const [
    loading,
    setLoading
  ] =
    useState(true);


  const [
    currentAffairs,
    setCurrentAffairs
  ] =
    useState(0);


  const [
    mcqs,
    setMcqs
  ] =
    useState(0);


  const [
    mainsQuestions,
    setMainsQuestions
  ] =
    useState(0);


  const [
    totalSubmissions,
    setTotalSubmissions
  ] =
    useState(0);


  const [
    pendingEvaluations,
    setPendingEvaluations
  ] =
    useState(0);


  const [
    inReviewEvaluations,
    setInReviewEvaluations
  ] =
    useState(0);


  const [
    completedEvaluations,
    setCompletedEvaluations
  ] =
    useState(0);


  async function loadStats() {
    if (!supabase) {
      setLoading(false);
      return;
    }


    setLoading(true);


    const {
      count:
        currentCount
    } =
      await supabase
        .from(
          'current_affairs'
        )
        .select(
          'id',
          {
            count:
              'exact',

            head:
              true
          }
        );


    const {
      count:
        mcqCount
    } =
      await supabase
        .from(
          'questions'
        )
        .select(
          'id',
          {
            count:
              'exact',

            head:
              true
          }
        )
        .eq(
          'exam_stage',
          'prelims'
        );


    const {
      count:
        mainsCount
    } =
      await supabase
        .from(
          'mains_questions'
        )
        .select(
          'id',
          {
            count:
              'exact',

            head:
              true
          }
        );


    setCurrentAffairs(
      currentCount ||
      0
    );


    setMcqs(
      mcqCount ||
      0
    );


    setMainsQuestions(
      mainsCount ||
      0
    );


    const {
      data:
        attemptData,
      error:
        attemptError
    } =
      await supabase
        .from(
          'mains_attempts'
        )
        .select(
          'id'
        )
        .eq(
          'status',
          'submitted'
        )
        .eq(
          'evaluation_requested',
          true
        );


    if (attemptError) {
      console.error(
        'Unable to load evaluation submissions:',
        attemptError
      );

      setLoading(false);

      return;
    }


    const attempts =
      (attemptData || []) as AttemptRow[];


    setTotalSubmissions(
      attempts.length
    );


    if (
      attempts.length ===
      0
    ) {
      setPendingEvaluations(0);
      setInReviewEvaluations(0);
      setCompletedEvaluations(0);

      setLoading(false);

      return;
    }


    const attemptIds =
      attempts.map(
        attempt =>
          attempt.id
      );


    const {
      data:
        evaluationData,
      error:
        evaluationError
    } =
      await supabase
        .from(
          'mains_evaluations'
        )
        .select(
          'attempt_id, status'
        )
        .in(
          'attempt_id',
          attemptIds
        );


    if (evaluationError) {
      console.error(
        'Unable to load evaluation status:',
        evaluationError
      );

      setLoading(false);

      return;
    }


    const evaluations =
      (evaluationData || []) as EvaluationRow[];


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


    let pending =
      0;

    let inReview =
      0;

    let completed =
      0;


    attempts.forEach(
      attempt => {
        const evaluation =
          evaluationMap.get(
            attempt.id
          );


        if (!evaluation) {
          pending +=
            1;

          return;
        }


        if (
          evaluation.status ===
          'completed'
        ) {
          completed +=
            1;

          return;
        }


        if (
          evaluation.status ===
          'in_review'
        ) {
          inReview +=
            1;

          return;
        }


        pending +=
          1;
      }
    );


    setPendingEvaluations(
      pending
    );


    setInReviewEvaluations(
      inReview
    );


    setCompletedEvaluations(
      completed
    );


    setLoading(false);
  }


  useEffect(
    () => {
      loadStats();
    },
    []
  );


  const cardStyle = {
    width:
      '100%',

    textAlign:
      'left' as const,

    cursor:
      'pointer',

    color:
      'inherit',

    font:
      'inherit'
  };


  return (
    <section
      style={{
        marginTop:
          '18px',

        marginBottom:
          '18px'
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
            'wrap',

          marginBottom:
            '12px'
        }}
      >

        <div>

          <span className="eyebrow">
            ADMIN OVERVIEW
          </span>


          <h3>
            Content & Evaluation Status
          </h3>


          <small>
            Click any card to open its workspace.
          </small>

        </div>


        <button
          type="button"
          className="secondary-btn"
          onClick={
            loadStats
          }
        >
          Refresh Counts
        </button>

      </div>


      <div className="metrics-grid">

        <button
          type="button"
          className="metric-card"
          style={
            cardStyle
          }
          onClick={() =>
            onNavigate(
              'current'
            )
          }
        >

          <div>

            <span>
              Current Affairs
            </span>


            <strong>
              {
                loading
                  ? '...'
                  : currentAffairs
              }
            </strong>


            <small>
              Open Current Affairs →
            </small>

          </div>

        </button>


        <button
          type="button"
          className="metric-card"
          style={
            cardStyle
          }
          onClick={() =>
            onNavigate(
              'mcq'
            )
          }
        >

          <div>

            <span>
              Prelims MCQs
            </span>


            <strong>
              {
                loading
                  ? '...'
                  : mcqs
              }
            </strong>


            <small>
              Open MCQ Manager →
            </small>

          </div>

        </button>


        <button
          type="button"
          className="metric-card"
          style={
            cardStyle
          }
          onClick={() =>
            onNavigate(
              'mains'
            )
          }
        >

          <div>

            <span>
              Mains Questions
            </span>


            <strong>
              {
                loading
                  ? '...'
                  : mainsQuestions
              }
            </strong>


            <small>
              Open Mains Manager →
            </small>

          </div>

        </button>


        <button
          type="button"
          className="metric-card"
          style={
            cardStyle
          }
          onClick={() =>
            onNavigate(
              'evaluation'
            )
          }
        >

          <div>

            <span>
              Submissions
            </span>


            <strong>
              {
                loading
                  ? '...'
                  : totalSubmissions
              }
            </strong>


            <small>
              Open Evaluation Queue →
            </small>

          </div>

        </button>


        <button
          type="button"
          className="metric-card"
          style={{
            ...cardStyle,

            border:
              pendingEvaluations >
              0
                ? '1px solid rgba(239,106,91,0.65)'
                : undefined
          }}
          onClick={() =>
            onNavigate(
              'evaluation'
            )
          }
        >

          <div>

            <span>
              Pending
            </span>


            <strong>
              {
                loading
                  ? '...'
                  : pendingEvaluations
              }
            </strong>


            <small>
              Need evaluation →
            </small>

          </div>

        </button>


        <button
          type="button"
          className="metric-card"
          style={
            cardStyle
          }
          onClick={() =>
            onNavigate(
              'evaluation'
            )
          }
        >

          <div>

            <span>
              In Review
            </span>


            <strong>
              {
                loading
                  ? '...'
                  : inReviewEvaluations
              }
            </strong>


            <small>
              Continue reviewing →
            </small>

          </div>

        </button>


        <button
          type="button"
          className="metric-card"
          style={
            cardStyle
          }
          onClick={() =>
            onNavigate(
              'evaluation'
            )
          }
        >

          <div>

            <span>
              Completed
            </span>


            <strong>
              {
                loading
                  ? '...'
                  : completedEvaluations
              }
            </strong>


            <small>
              View evaluations →
            </small>

          </div>

        </button>

      </div>

    </section>
  );
}

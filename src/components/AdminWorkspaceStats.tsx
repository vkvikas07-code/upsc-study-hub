import {
  useEffect,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


export function AdminWorkspaceStats() {
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
    evaluations,
    setEvaluations
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


    const {
      count:
        evaluationCount
    } =
      await supabase
        .from(
          'mains_attempts'
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
          'status',
          'submitted'
        )
        .eq(
          'evaluation_requested',
          true
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

    setEvaluations(
      evaluationCount ||
      0
    );


    setLoading(false);
  }


  useEffect(
    () => {
      loadStats();
    },
    []
  );


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
            Content Status
          </h3>

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

        <article className="metric-card">

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
              Total articles
            </small>

          </div>

        </article>


        <article className="metric-card">

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
              Question bank
            </small>

          </div>

        </article>


        <article className="metric-card">

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
              GS + Optional
            </small>

          </div>

        </article>


        <article className="metric-card">

          <div>

            <span>
              Evaluations
            </span>

            <strong>
              {
                loading
                  ? '...'
                  : evaluations
              }
            </strong>

            <small>
              Student submissions
            </small>

          </div>

        </article>

      </div>

    </section>
  );
}

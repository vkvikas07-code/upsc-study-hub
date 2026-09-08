import {
  useEffect,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


export function StudyOverview() {
  const [
    loading,
    setLoading
  ] =
    useState(true);

  const [
    mcqQuestions,
    setMcqQuestions
  ] =
    useState(0);

  const [
    mcqCorrect,
    setMcqCorrect
  ] =
    useState(0);

  const [
    mainsSubmitted,
    setMainsSubmitted
  ] =
    useState(0);

  const [
    mainsEvaluated,
    setMainsEvaluated
  ] =
    useState(0);

  const [
    bookmarks,
    setBookmarks
  ] =
    useState(0);


  async function loadOverview() {
    if (!supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const {
      data: {
        user
      }
    } =
      await supabase
        .auth
        .getUser();

    if (!user) {
      setLoading(false);
      return;
    }


    const {
      data:
        practiceData
    } =
      await supabase
        .from(
          'practice_attempts'
        )
        .select(
          'total_questions, correct_answers'
        )
        .eq(
          'user_id',
          user.id
        );


    const practiceRows =
      practiceData || [];


    const totalQuestions =
      practiceRows.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.total_questions ||
            0
          ),
        0
      );


    const totalCorrect =
      practiceRows.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.correct_answers ||
            0
          ),
        0
      );


    setMcqQuestions(
      totalQuestions
    );

    setMcqCorrect(
      totalCorrect
    );


    const {
      count:
        submittedCount
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
          'user_id',
          user.id
        )
        .eq(
          'status',
          'submitted'
        );


    setMainsSubmitted(
      submittedCount ||
      0
    );


    const {
      count:
        evaluatedCount
    } =
      await supabase
        .from(
          'mains_evaluations'
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
          'student_id',
          user.id
        )
        .eq(
          'status',
          'completed'
        );


    setMainsEvaluated(
      evaluatedCount ||
      0
    );


    const {
      count:
        bookmarkCount
    } =
      await supabase
        .from(
          'bookmarks'
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
          'user_id',
          user.id
        );


    setBookmarks(
      bookmarkCount ||
      0
    );


    setLoading(false);
  }


  useEffect(
    () => {
      loadOverview();
    },
    []
  );


  const accuracy =
    mcqQuestions >
    0
      ? Math.round(
          (
            mcqCorrect /
            mcqQuestions
          ) *
          100
        )
      : 0;


  return (
    <section
      style={{
        marginTop:
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
            STUDY OVERVIEW
          </span>

          <h3>
            Your Live Progress
          </h3>

        </div>


        <button
          type="button"
          className="secondary-btn"
          onClick={
            loadOverview
          }
        >
          Refresh
        </button>

      </div>


      <div className="metrics-grid">

        <article className="metric-card">

          <div>

            <span>
              MCQs
            </span>

            <strong>
              {
                loading
                  ? '...'
                  : mcqQuestions
              }
            </strong>

            <small>
              Questions attempted
            </small>

          </div>

        </article>


        <article className="metric-card">

          <div>

            <span>
              Accuracy
            </span>

            <strong>
              {
                loading
                  ? '...'
                  : `${accuracy}%`
              }
            </strong>

            <small>
              Prelims accuracy
            </small>

          </div>

        </article>


        <article className="metric-card">

          <div>

            <span>
              Mains
            </span>

            <strong>
              {
                loading
                  ? '...'
                  : mainsSubmitted
              }
            </strong>

            <small>
              Answers submitted
            </small>

          </div>

        </article>


        <article className="metric-card">

          <div>

            <span>
              Evaluated
            </span>

            <strong>
              {
                loading
                  ? '...'
                  : mainsEvaluated
              }
            </strong>

            <small>
              Mains feedback received
            </small>

          </div>

        </article>


        <article className="metric-card">

          <div>

            <span>
              Bookmarks
            </span>

            <strong>
              {
                loading
                  ? '...'
                  : bookmarks
              }
            </strong>

            <small>
              Saved for revision
            </small>

          </div>

        </article>

      </div>

    </section>
  );
}

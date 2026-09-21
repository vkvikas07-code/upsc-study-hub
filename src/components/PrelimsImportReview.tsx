import {
  useEffect,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


type ReviewRow = {
  id: string;
  question_number: string | null;
  question: string;
  subject: string | null;
  topic: string | null;
  difficulty: string;
  review_reason: string;
  status: string;
  origin: string;
  created_at: string;
};


export function PrelimsImportReview() {

  const [
    rows,
    setRows
  ] =
    useState<ReviewRow[]>([]);


  const [
    loading,
    setLoading
  ] =
    useState(true);


  const [
    message,
    setMessage
  ] =
    useState('');


  async function loadReviews():
    Promise<void> {

    if (!supabase) {

      setMessage(
        'Supabase is not configured.'
      );

      setLoading(false);

      return;
    }


    setLoading(true);
    setMessage('');


    const {
      data,
      error
    } =
      await supabase
        .from(
          'prelims_import_review_queue'
        )
        .select(
          `
          id,
          question_number,
          question,
          subject,
          topic,
          difficulty,
          review_reason,
          status,
          origin,
          created_at
          `
        )
        .eq(
          'status',
          'pending'
        )
        .order(
          'created_at',
          {
            ascending: false
          }
        )
        .limit(100);


    if (error) {

      console.error(
        'Unable to load review queue:',
        error
      );


      setRows([]);
      setMessage(error.message);
      setLoading(false);

      return;
    }


    setRows(
      (data || []) as ReviewRow[]
    );


    setLoading(false);
  }


  useEffect(
    () => {

      void loadReviews();

    },
    []
  );


  return (

    <section
      className="panel"
      style={{
        padding: '16px'
      }}
    >

      <div
        style={{
          display: 'flex',
          justifyContent:
            'space-between',
          alignItems:
            'flex-start',
          gap: '12px',
          flexWrap: 'wrap'
        }}
      >

        <div>

          <span className="eyebrow">
            IMPORT REVIEW
          </span>

          <h2
            style={{
              margin:
                '5px 0'
            }}
          >
            PYQ Review Queue
          </h2>

          <small
            style={{
              color: '#94a3b8'
            }}
          >
            Review possible duplicate
            or conflicting imported questions.
          </small>

        </div>


        <button
          type="button"
          className="secondary-btn"
          onClick={() =>
            void loadReviews()
          }
        >
          Refresh
        </button>

      </div>


      <div
        className="callout"
        style={{
          marginTop: '12px'
        }}
      >
        Pending review:{' '}

        <strong>
          {
            loading
              ? '...'
              : rows.length
          }
        </strong>
      </div>


      {
        message && (

          <div
            className="callout"
            style={{
              marginTop: '10px'
            }}
          >
            {message}
          </div>

        )
      }


      {
        loading && (

          <div
            style={{
              marginTop: '14px'
            }}
          >
            Loading review queue...
          </div>

        )
      }


      {
        !loading &&
        rows.length === 0 && (

          <div
            className="callout"
            style={{
              marginTop: '12px'
            }}
          >
            No questions currently
            require review.
          </div>

        )
      }


      {
        !loading &&
        rows.length > 0 && (

          <div
            style={{
              display: 'grid',
              gap: '10px',
              marginTop: '12px'
            }}
          >

            {
              rows.map(
                row => (

                  <article
                    key={row.id}
                    style={{
                      padding: '12px',
                      border:
                        '1px solid rgba(255,255,255,.09)',
                      borderRadius:
                        '12px'
                    }}
                  >

                    <div
                      style={{
                        display: 'flex',
                        justifyContent:
                          'space-between',
                        gap: '10px',
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

                        <span
                          className="eyebrow"
                        >
                          {
                            row.question_number
                              ? `Q${row.question_number}`
                              : 'QUESTION'
                          }

                          {' • '}

                          {
                            row.subject ||
                            'General Studies'
                          }
                        </span>


                        <p
                          style={{
                            margin:
                              '7px 0'
                          }}
                        >
                          {row.question}
                        </p>


                        <small
                          style={{
                            color:
                              '#94a3b8'
                          }}
                        >
                          {
                            row.topic ||
                            'No topic'
                          }

                          {' • '}

                          {
                            row.difficulty
                          }

                          {' • '}

                          {
                            row.origin
                          }
                        </small>

                      </div>


                      <span
                        className="tag"
                      >
                        {row.status}
                      </span>

                    </div>


                    <div
                      className="callout"
                      style={{
                        marginTop:
                          '9px',
                        padding:
                          '8px 10px'
                      }}
                    >
                      <strong>
                        Review reason:
                      </strong>

                      {' '}

                      {
                        row.review_reason
                      }
                    </div>

                  </article>

                )
              )
            }

          </div>

        )
      }

    </section>

  );
}


export default PrelimsImportReview;

import {
  useEffect,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


type ReviewRow = {
  id: string;

  matched_question_id: string;

  exam_paper_id: string | null;

  origin: string;

  paper_metadata:
    Record<string, unknown>;

  question_number: string | null;

  question: string;

  options: string[];

  correct_index: number;

  explanation: string | null;

  subject: string | null;

  topic: string | null;

  difficulty: string;

  tags: string[];

  review_reason: string;

  status: string;

  notes: string | null;

  created_at: string;
};


type ExistingQuestion = {
  id: string;

  question: string;

  options: string[];

  correct_index: number;

  explanation: string;

  subject: string;

  topic: string | null;

  difficulty: string;

  status: string;

  is_pyq: boolean;

  pyq_year: number | null;
};


type ReviewAction =
  | 'create_variant'
  | 'dismiss';


function isRecord(
  value: unknown
): value is Record<string, unknown> {

  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}


function safeStringArray(
  value: unknown
): string[] {

  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }


  return value.map(
    item =>
      String(item)
  );
}


function metadataValue(
  metadata:
    Record<string, unknown>,
  key:
    string
): string {

  const value =
    metadata[key];


  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }


  return String(value);
}


function answerLetter(
  index: number
): string {

  if (
    !Number.isInteger(index) ||
    index < 0
  ) {
    return '-';
  }


  return String.fromCharCode(
    65 +
    index
  );
}


function originLabel(
  row: ReviewRow
): string {

  if (
    row.origin ===
    'cse'
  ) {

    return 'UPSC CSE';
  }


  if (
    row.origin ===
    'upsc'
  ) {

    return (
      metadataValue(
        row.paper_metadata,
        'upsc_exam_name'
      ) ||
      'Other UPSC'
    );
  }


  if (
    row.origin ===
    'state'
  ) {

    return (
      metadataValue(
        row.paper_metadata,
        'state_psc_name'
      ) ||
      metadataValue(
        row.paper_metadata,
        'state_psc_state'
      ) ||
      'State PSC'
    );
  }


  return row.origin;
}


function paperLabel(
  row: ReviewRow
): string {

  if (
    row.origin ===
    'cse'
  ) {

    const year =
      metadataValue(
        row.paper_metadata,
        'pyq_year'
      );


    const paper =
      metadataValue(
        row.paper_metadata,
        'paper'
      );


    return [
      year,
      paper
    ]
      .filter(
        Boolean
      )
      .join(
        ' • '
      );
  }


  if (
    row.origin ===
    'upsc'
  ) {

    const year =
      metadataValue(
        row.paper_metadata,
        'upsc_exam_year'
      );


    const paper =
      metadataValue(
        row.paper_metadata,
        'upsc_exam_paper'
      );


    return [
      year,
      paper
    ]
      .filter(
        Boolean
      )
      .join(
        ' • '
      );
  }


  const year =
    metadataValue(
      row.paper_metadata,
      'state_psc_year'
    );


  const paper =
    metadataValue(
      row.paper_metadata,
      'state_psc_paper'
    );


  return [
    year,
    paper
  ]
    .filter(
      Boolean
    )
    .join(
      ' • '
    );
}


export function PrelimsImportReview() {

  const [
    rows,
    setRows
  ] =
    useState<ReviewRow[]>(
      []
    );


  const [
    existingMap,
    setExistingMap
  ] =
    useState<
      Record<
        string,
        ExistingQuestion
      >
    >(
      {}
    );


  const [
    loading,
    setLoading
  ] =
    useState(
      true
    );


  const [
    message,
    setMessage
  ] =
    useState(
      ''
    );


  const [
    workingId,
    setWorkingId
  ] =
    useState<string | null>(
      null
    );


  const [
    expandedId,
    setExpandedId
  ] =
    useState<string | null>(
      null
    );


  const [
    notesMap,
    setNotesMap
  ] =
    useState<
      Record<
        string,
        string
      >
    >(
      {}
    );


  /* =======================================================
     LOAD REVIEW QUEUE
  ======================================================= */

  async function loadReviews():
    Promise<void> {

    if (
      !supabase
    ) {

      setMessage(
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

    setMessage(
      ''
    );


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
            matched_question_id,
            exam_paper_id,
            origin,
            paper_metadata,
            question_number,
            question,
            options,
            correct_index,
            explanation,
            subject,
            topic,
            difficulty,
            tags,
            review_reason,
            status,
            notes,
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
            ascending:
              false
          }
        )
        .limit(
          100
        );


    if (
      error
    ) {

      console.error(
        'Unable to load review queue:',
        error
      );


      setRows(
        []
      );


      setMessage(
        error.message
      );


      setLoading(
        false
      );


      return;
    }


    const reviewRows:
      ReviewRow[] =
      (
        data ||
        []
      )
        .map(
          item => ({

            id:
              String(
                item.id
              ),

            matched_question_id:
              String(
                item.matched_question_id
              ),

            exam_paper_id:
              item.exam_paper_id
                ? String(
                    item.exam_paper_id
                  )
                : null,

            origin:
              String(
                item.origin ||
                ''
              ),

            paper_metadata:
              isRecord(
                item.paper_metadata
              )
                ? item.paper_metadata
                : {},

            question_number:
              item.question_number
                ? String(
                    item.question_number
                  )
                : null,

            question:
              String(
                item.question ||
                ''
              ),

            options:
              safeStringArray(
                item.options
              ),

            correct_index:
              Number(
                item.correct_index ||
                0
              ),

            explanation:
              item.explanation
                ? String(
                    item.explanation
                  )
                : null,

            subject:
              item.subject
                ? String(
                    item.subject
                  )
                : null,

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

            tags:
              safeStringArray(
                item.tags
              ),

            review_reason:
              String(
                item.review_reason ||
                ''
              ),

            status:
              String(
                item.status ||
                'pending'
              ),

            notes:
              item.notes
                ? String(
                    item.notes
                  )
                : null,

            created_at:
              String(
                item.created_at ||
                ''
              )

          })
        );


    setRows(
      reviewRows
    );


    /* =====================================================
       LOAD MATCHED MASTER QUESTIONS
    ===================================================== */

    const matchedIds =
      Array.from(
        new Set(
          reviewRows
            .map(
              row =>
                row.matched_question_id
            )
            .filter(
              Boolean
            )
        )
      );


    if (
      matchedIds.length ===
      0
    ) {

      setExistingMap(
        {}
      );

      setLoading(
        false
      );

      return;
    }


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
            status,
            is_pyq,
            pyq_year
          `
        )
        .in(
          'id',
          matchedIds
        );


    if (
      questionError
    ) {

      console.error(
        'Unable to load matched questions:',
        questionError
      );

    } else {

      const map:
        Record<
          string,
          ExistingQuestion
        > =
        {};


      (
        questionData ||
        []
      )
        .forEach(
          item => {

            const id =
              String(
                item.id
              );


            map[id] = {

              id,

              question:
                String(
                  item.question ||
                  ''
                ),

              options:
                safeStringArray(
                  item.options
                ),

              correct_index:
                Number(
                  item.correct_index ||
                  0
                ),

              explanation:
                String(
                  item.explanation ||
                  ''
                ),

              subject:
                String(
                  item.subject ||
                  'General Studies'
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

              status:
                String(
                  item.status ||
                  ''
                ),

              is_pyq:
                Boolean(
                  item.is_pyq
                ),

              pyq_year:
                item.pyq_year
                  ? Number(
                      item.pyq_year
                    )
                  : null

            };

          }
        );


      setExistingMap(
        map
      );
    }


    setLoading(
      false
    );
  }


  useEffect(
    () => {

      void loadReviews();

    },
    []
  );


  /* =======================================================
     LINK TO EXISTING MASTER
  ======================================================= */

  async function linkExisting(
    row: ReviewRow
  ):
    Promise<void> {

    if (
      !supabase
    ) {
      return;
    }


    const confirmed =
      window.confirm(
        'Link this imported paper question to the existing master question?'
      );


    if (
      !confirmed
    ) {
      return;
    }


    setWorkingId(
      row.id
    );


    setMessage(
      'Linking to existing question...'
    );


    const {
      data,
      error
    } =
      await supabase
        .rpc(
          'link_prelims_import_review_to_existing',
          {

            p_review_id:
              row.id,

            p_notes:
              notesMap[
                row.id
              ] ||
              null

          }
        );


    if (
      error
    ) {

      setMessage(
        error.message
      );

      setWorkingId(
        null
      );

      return;
    }


    const response =
      isRecord(data)
        ? data
        : {};


    setMessage(
      typeof response.message ===
        'string'
        ? response.message
        : 'Question linked successfully.'
    );


    setRows(
      current =>
        current.filter(
          item =>
            item.id !==
            row.id
        )
    );


    setExpandedId(
      null
    );


    setWorkingId(
      null
    );
  }


  /* =======================================================
     CREATE VARIANT OR DISMISS
  ======================================================= */

  async function resolveReview(
    row: ReviewRow,
    action: ReviewAction
  ):
    Promise<void> {

    if (
      !supabase
    ) {
      return;
    }


    const confirmed =
      window.confirm(
        action ===
          'create_variant'
          ? 'Create this imported version as a separate Draft variant?'
          : 'Dismiss this review case?'
      );


    if (
      !confirmed
    ) {
      return;
    }


    setWorkingId(
      row.id
    );


    setMessage(
      action ===
        'create_variant'
        ? 'Creating variant...'
        : 'Dismissing review...'
    );


    const {
      data,
      error
    } =
      await supabase
        .rpc(
          'resolve_prelims_import_review',
          {

            p_review_id:
              row.id,

            p_action:
              action,

            p_notes:
              notesMap[
                row.id
              ] ||
              null

          }
        );


    if (
      error
    ) {

      setMessage(
        error.message
      );

      setWorkingId(
        null
      );

      return;
    }


    const response =
      isRecord(data)
        ? data
        : {};


    setMessage(
      typeof response.message ===
        'string'
        ? response.message
        : action ===
            'create_variant'
          ? 'Variant created successfully.'
          : 'Review dismissed.'
    );


    setRows(
      current =>
        current.filter(
          item =>
            item.id !==
            row.id
        )
    );


    setExpandedId(
      null
    );


    setWorkingId(
      null
    );
  }


  /* =======================================================
     SUMMARY COUNTS
  ======================================================= */

  const cseCount =
    rows.filter(
      row =>
        row.origin ===
        'cse'
    ).length;


  const upscCount =
    rows.filter(
      row =>
        row.origin ===
        'upsc'
    ).length;


  const stateCount =
    rows.filter(
      row =>
        row.origin ===
        'state'
    ).length;


  /* =======================================================
     UI
  ======================================================= */

  return (

    <section
      className="panel"
      style={{
        padding:
          '16px'
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
            'flex-start',

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
              color:
                '#94a3b8'
            }}
          >
            Compare imported PYQs with the
            existing master question and resolve
            them quickly.
          </small>

        </div>


        <button
          type="button"
          className="secondary-btn"
          onClick={() =>
            void loadReviews()
          }
          disabled={
            loading
          }
        >
          Refresh
        </button>

      </div>


      {/* SUMMARY */}

      <div
        style={{
          display:
            'grid',

          gridTemplateColumns:
            'repeat(4, minmax(0, 1fr))',

          gap:
            '8px',

          marginTop:
            '12px'
        }}
      >

        <div className="callout">
          <small>
            Pending
          </small>

          <strong
            style={{
              display:
                'block'
            }}
          >
            {
              rows.length
            }
          </strong>
        </div>


        <div className="callout">
          <small>
            CSE
          </small>

          <strong
            style={{
              display:
                'block'
            }}
          >
            {
              cseCount
            }
          </strong>
        </div>


        <div className="callout">
          <small>
            Other UPSC
          </small>

          <strong
            style={{
              display:
                'block'
            }}
          >
            {
              upscCount
            }
          </strong>
        </div>


        <div className="callout">
          <small>
            State PSC
          </small>

          <strong
            style={{
              display:
                'block'
            }}
          >
            {
              stateCount
            }
          </strong>
        </div>

      </div>


      {/* MESSAGE */}

      {
        message && (

          <div
            className="callout"
            style={{
              marginTop:
                '10px'
            }}
          >
            {
              message
            }
          </div>

        )
      }


      {/* LOADING */}

      {
        loading && (

          <p>
            Loading review queue...
          </p>

        )
      }


      {/* EMPTY */}

      {
        !loading &&
        rows.length ===
          0 && (

          <div
            className="callout"
            style={{
              marginTop:
                '12px'
            }}
          >
            ✓ No imported questions currently
            require review.
          </div>

        )
      }


      {/* REVIEW LIST */}

      <div
        style={{
          display:
            'grid',

          gap:
            '10px',

          marginTop:
            '12px'
        }}
      >

        {
          rows.map(
            row => {

              const existing =
                existingMap[
                  row.matched_question_id
                ];


              const expanded =
                expandedId ===
                row.id;


              const busy =
                workingId ===
                row.id;


              return (

                <article
                  key={
                    row.id
                  }
                  style={{
                    padding:
                      '12px',

                    border:
                      '1px solid rgba(255,255,255,.09)',

                    borderRadius:
                      '12px'
                  }}
                >

                  {/* COMPACT HEADER */}

                  <div
                    style={{
                      display:
                        'grid',

                      gridTemplateColumns:
                        '1fr auto',

                      gap:
                        '12px',

                      alignItems:
                        'start'
                    }}
                  >

                    <div>

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
                          {
                            originLabel(
                              row
                            )
                          }
                        </span>


                        {
                          paperLabel(
                            row
                          ) && (

                            <span
                              className="tag"
                            >
                              {
                                paperLabel(
                                  row
                                )
                              }
                            </span>

                          )
                        }


                        {
                          row.question_number && (

                            <span
                              className="tag"
                            >
                              Q{
                                row.question_number
                              }
                            </span>

                          )
                        }


                        <span
                          className="tag"
                        >
                          {
                            row.subject ||
                            'General Studies'
                          }
                        </span>

                      </div>


                      <strong
                        style={{
                          display:
                            'block',

                          marginTop:
                            '7px',

                          lineHeight:
                            1.35
                        }}
                      >
                        {
                          row.question
                        }
                      </strong>


                      <small
                        style={{
                          display:
                            'block',

                          marginTop:
                            '5px',

                          color:
                            '#94a3b8'
                        }}
                      >
                        Review reason:{' '}

                        {
                          row.review_reason
                        }
                      </small>

                    </div>


                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() =>
                        setExpandedId(
                          current =>
                            current ===
                              row.id
                              ? null
                              : row.id
                        )
                      }
                    >
                      {
                        expanded
                          ? 'Hide Compare'
                          : 'Compare'
                      }
                    </button>

                  </div>


                  {/* COMPARISON */}

                  {
                    expanded && (

                      <div
                        style={{
                          display:
                            'grid',

                          gridTemplateColumns:
                            'repeat(auto-fit, minmax(280px, 1fr))',

                          gap:
                            '10px',

                          marginTop:
                            '12px'
                        }}
                      >

                        {/* IMPORTED VERSION */}

                        <div
                          style={{
                            padding:
                              '12px',

                            border:
                              '1px solid rgba(45,212,191,.20)',

                            borderRadius:
                              '12px'
                          }}
                        >

                          <span
                            className="eyebrow"
                          >
                            IMPORTED VERSION
                          </span>


                          <p
                            style={{
                              fontWeight:
                                700
                            }}
                          >
                            {
                              row.question
                            }
                          </p>


                          <div
                            style={{
                              display:
                                'grid',

                              gap:
                                '5px'
                            }}
                          >

                            {
                              row.options.map(
                                (
                                  option,
                                  index
                                ) => (

                                  <div
                                    key={
                                      `${row.id}-incoming-${index}`
                                    }
                                  >
                                    <strong>
                                      {
                                        answerLetter(
                                          index
                                        )
                                      }.
                                    </strong>

                                    {' '}

                                    {option}

                                    {
                                      row.correct_index ===
                                        index
                                        ? ' ✓'
                                        : ''
                                    }
                                  </div>

                                )
                              )
                            }

                          </div>


                          <small
                            style={{
                              display:
                                'block',

                              marginTop:
                                '8px',

                              color:
                                '#94a3b8'
                            }}
                          >
                            Correct answer:{' '}

                            <strong>
                              {
                                answerLetter(
                                  row.correct_index
                                )
                              }
                            </strong>

                            {' • '}

                            {
                              row.topic ||
                              'No topic'
                            }
                          </small>

                        </div>


                        {/* EXISTING MASTER */}

                        <div
                          style={{
                            padding:
                              '12px',

                            border:
                              '1px solid rgba(255,255,255,.10)',

                            borderRadius:
                              '12px'
                          }}
                        >

                          <span
                            className="eyebrow"
                          >
                            EXISTING MASTER
                          </span>


                          {
                            existing
                              ? (

                                <>

                                  <p
                                    style={{
                                      fontWeight:
                                        700
                                    }}
                                  >
                                    {
                                      existing.question
                                    }
                                  </p>


                                  <div
                                    style={{
                                      display:
                                        'grid',

                                      gap:
                                        '5px'
                                    }}
                                  >

                                    {
                                      existing.options.map(
                                        (
                                          option,
                                          index
                                        ) => (

                                          <div
                                            key={
                                              `${row.id}-existing-${index}`
                                            }
                                          >
                                            <strong>
                                              {
                                                answerLetter(
                                                  index
                                                )
                                              }.
                                            </strong>

                                            {' '}

                                            {
                                              option
                                            }

                                            {
                                              existing.correct_index ===
                                                index
                                                ? ' ✓'
                                                : ''
                                            }
                                          </div>

                                        )
                                      )
                                    }

                                  </div>


                                  <small
                                    style={{
                                      display:
                                        'block',

                                      marginTop:
                                        '8px',

                                      color:
                                        '#94a3b8'
                                    }}
                                  >
                                    Correct answer:{' '}

                                    <strong>
                                      {
                                        answerLetter(
                                          existing.correct_index
                                        )
                                      }
                                    </strong>

                                    {' • '}

                                    {
                                      existing.topic ||
                                      'No topic'
                                    }

                                    {' • '}

                                    {
                                      existing.status
                                    }
                                  </small>

                                </>

                              )

                              : (

                                <p>
                                  Matched master question
                                  could not be loaded.
                                </p>

                              )
                          }

                        </div>

                      </div>

                    )
                  }


                  {/* NOTES */}

                  {
                    expanded && (

                      <label
                        style={{
                          marginTop:
                            '10px'
                        }}
                      >
                        Review Notes

                        <input
                          value={
                            notesMap[
                              row.id
                            ] ||
                            ''
                          }
                          onChange={
                            event =>
                              setNotesMap(
                                current => ({
                                  ...current,

                                  [row.id]:
                                    event.target.value
                                })
                              )
                          }
                          placeholder="Optional note..."
                        />

                      </label>

                    )
                  }


                  {/* ACTIONS */}

                  <div
                    style={{
                      display:
                        'flex',

                      justifyContent:
                        'flex-end',

                      gap:
                        '8px',

                      flexWrap:
                        'wrap',

                      marginTop:
                        '10px'
                    }}
                  >

                    <button
                      type="button"
                      className="secondary-btn"
                      disabled={
                        busy
                      }
                      onClick={() =>
                        void resolveReview(
                          row,
                          'dismiss'
                        )
                      }
                    >
                      Dismiss
                    </button>


                    <button
                      type="button"
                      className="secondary-btn"
                      disabled={
                        busy ||
                        !existing
                      }
                      onClick={() =>
                        void linkExisting(
                          row
                        )
                      }
                    >
                      Link Existing
                    </button>


                    <button
                      type="button"
                      className="primary-btn"
                      disabled={
                        busy
                      }
                      onClick={() =>
                        void resolveReview(
                          row,
                          'create_variant'
                        )
                      }
                    >
                      {
                        busy
                          ? 'Working...'
                          : 'Create Variant'
                      }
                    </button>

                  </div>

                </article>

              );
            }
          )
        }

      </div>

    </section>

  );
}


export default PrelimsImportReview;

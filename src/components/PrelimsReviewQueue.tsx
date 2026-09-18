import {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


type ReviewStatus =
  | 'pending'
  | 'linked'
  | 'variant_created'
  | 'dismissed';


type ReviewRow = {

  id: string;

  matched_question_id: string;

  origin:
    | 'cse'
    | 'upsc'
    | 'state';

  paper_metadata:
    Record<
      string,
      unknown
    >;

  question_number:
    string | null;

  question:
    string;

  options:
    string[];

  correct_index:
    number;

  explanation:
    string | null;

  subject:
    string | null;

  topic:
    string | null;

  difficulty:
    string;

  tags:
    string[];

  review_reason:
    string;

  status:
    ReviewStatus;

  created_at:
    string;
};


type ExistingQuestion = {

  id:
    string;

  question:
    string;

  options:
    string[];

  correct_index:
    number;

  explanation:
    string;

  subject:
    string;

  topic:
    string | null;

  difficulty:
    string;

  status:
    string;
};


type ResolveAction =
  | 'create_variant'
  | 'dismiss';


type ResolveResult = {

  success?:
    boolean;

  action?:
    string;

  status?:
    string;

  review_id?:
    string;

  question_id?:
    string;

  question_status?:
    string;

  message?:
    string;
};



const REVIEW_SELECT = `
  id,
  matched_question_id,
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
  created_at
`;


const QUESTION_SELECT = `
  id,
  question,
  options,
  correct_index,
  explanation,
  subject,
  topic,
  difficulty,
  status
`;



function normalizeOptions(
  value:
    unknown
) {

  if (
    !Array.isArray(
      value
    )
  ) {

    return [];
  }


  return value.map(
    option =>
      String(
        option
      )
  );
}



function normalizeTags(
  value:
    unknown
) {

  if (
    !Array.isArray(
      value
    )
  ) {

    return [];
  }


  return value.map(
    tag =>
      String(
        tag
      )
  );
}



function formatDate(
  value:
    string
) {

  try {

    return new Date(
      value
    ).toLocaleString();

  } catch {

    return value;
  }
}



function formatPaperMetadata(
  row:
    ReviewRow
) {

  const metadata =
    row.paper_metadata ||
    {};


  if (
    row.origin ===
    'cse'
  ) {

    return [

      'UPSC CSE',

      metadata
        .pyq_year,

      metadata
        .paper

    ]
      .filter(
        value =>
          value !==
            null &&
          value !==
            undefined &&
          value !==
            ''
      )
      .join(
        ' · '
      );
  }


  if (
    row.origin ===
    'upsc'
  ) {

    return [

      metadata
        .upsc_exam_name,

      metadata
        .upsc_exam_cycle
        ? `Cycle ${metadata.upsc_exam_cycle}`
        : null,

      metadata
        .upsc_exam_year,

      metadata
        .upsc_exam_stage,

      metadata
        .upsc_exam_paper

    ]
      .filter(
        value =>
          value !==
            null &&
          value !==
            undefined &&
          value !==
            ''
      )
      .join(
        ' · '
      );
  }


  return [

    metadata
      .state_psc_state,

    metadata
      .state_psc_name,

    metadata
      .state_psc_exam_name,

    metadata
      .state_psc_year,

    metadata
      .state_psc_stage,

    metadata
      .state_psc_paper

  ]
    .filter(
      value =>
        value !==
          null &&
        value !==
          undefined &&
        value !==
          ''
    )
    .join(
      ' · '
    );
}



function optionLetter(
  index:
    number
) {

  return String.fromCharCode(
    65 +
    index
  );
}



export function PrelimsReviewQueue() {


  const [
    reviews,
    setReviews
  ] =
    useState<
      ReviewRow[]
    >([]);


  const [
    existingQuestions,
    setExistingQuestions
  ] =
    useState<
      Record<
        string,
        ExistingQuestion
      >
    >({});


  const [
    notes,
    setNotes
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});


  const [
    loading,
    setLoading
  ] =
    useState(
      true
    );


  const [
    processingId,
    setProcessingId
  ] =
    useState<
      string | null
    >(
      null
    );


  const [
    message,
    setMessage
  ] =
    useState(
      ''
    );


  const pendingCount =
    useMemo(
      () =>
        reviews.filter(
          item =>
            item.status ===
            'pending'
        ).length,
      [
        reviews
      ]
    );



  async function loadQueue() {

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
          REVIEW_SELECT
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
        );


    if (
      error
    ) {

      console.error(
        'Unable to load Prelims review queue:',
        error
      );


      setMessage(
        error.message ||
        'Unable to load review queue.'
      );


      setLoading(
        false
      );


      return;
    }


    const formatted:
      ReviewRow[] =

      (
        data ||
        []
      ).map(
        raw => {

          const item =
            raw as unknown as
              Record<
                string,
                unknown
              >;


          return {

            id:
              String(
                item.id
              ),


            matched_question_id:
              String(
                item
                  .matched_question_id
              ),


            origin:
              String(
                item.origin
              ) as
                ReviewRow[
                  'origin'
                ],


            paper_metadata:

              (
                item
                  .paper_metadata &&
                typeof
                  item
                    .paper_metadata ===
                  'object' &&
                !Array.isArray(
                  item
                    .paper_metadata
                )
              )

                ? item
                    .paper_metadata as
                      Record<
                        string,
                        unknown
                      >

                : {},


            question_number:

              item
                .question_number ==
              null

                ? null

                : String(
                    item
                      .question_number
                  ),


            question:
              String(
                item.question ||
                ''
              ),


            options:
              normalizeOptions(
                item.options
              ),


            correct_index:
              Number(
                item
                  .correct_index ??
                0
              ),


            explanation:

              item
                .explanation ==
              null

                ? null

                : String(
                    item
                      .explanation
                  ),


            subject:

              item.subject ==
              null

                ? null

                : String(
                    item.subject
                  ),


            topic:

              item.topic ==
              null

                ? null

                : String(
                    item.topic
                  ),


            difficulty:
              String(
                item.difficulty ||
                'medium'
              ),


            tags:
              normalizeTags(
                item.tags
              ),


            review_reason:
              String(
                item
                  .review_reason ||
                ''
              ),


            status:
              String(
                item.status
              ) as
                ReviewStatus,


            created_at:
              String(
                item
                  .created_at ||
                ''
              )

          };

        }
      );


    setReviews(
      formatted
    );



    const matchedIds =

      Array.from(
        new Set(

          formatted
            .map(
              item =>
                item
                  .matched_question_id
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

      setExistingQuestions(
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
          QUESTION_SELECT
        )
        .in(
          'id',
          matchedIds
        );


    if (
      questionError
    ) {

      console.error(
        'Unable to load matched master questions:',
        questionError
      );


      setMessage(
        questionError.message ||
        'Review queue loaded, but matched questions could not be loaded.'
      );


      setLoading(
        false
      );


      return;
    }



    const mapped:
      Record<
        string,
        ExistingQuestion
      > = {};


    (
      questionData ||
      []
    ).forEach(
      raw => {

        const item =
          raw as unknown as
            Record<
              string,
              unknown
            >;


        const id =
          String(
            item.id
          );


        mapped[
          id
        ] = {

          id,


          question:
            String(
              item.question ||
              ''
            ),


          options:
            normalizeOptions(
              item.options
            ),


          correct_index:
            Number(
              item
                .correct_index ??
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
              ''
            ),


          topic:

            item.topic ==
            null

              ? null

              : String(
                  item.topic
                ),


          difficulty:
            String(
              item.difficulty ||
              'medium'
            ),


          status:
            String(
              item.status ||
              ''
            )

        };

      }
    );


    setExistingQuestions(
      mapped
    );


    setLoading(
      false
    );
  }



  useEffect(
    () => {

      void loadQueue();

    },
    []
  );



  async function resolveReview(

    review:
      ReviewRow,

    action:
      ResolveAction

  ) {

    if (
      !supabase ||
      processingId
    ) {

      return;
    }


    if (
      action ===
      'create_variant'
    ) {

      const confirmed =
        window.confirm(

          'Create this as a separate variant question?\n\n' +

          'The new question will be saved as Draft so you can review it before publishing.'

        );


      if (
        !confirmed
      ) {

        return;
      }

    } else {

      const confirmed =
        window.confirm(

          'Dismiss this review case?\n\n' +

          'No new question will be created.'

        );


      if (
        !confirmed
      ) {

        return;
      }
    }



    setProcessingId(
      review.id
    );


    setMessage(
      action ===
        'create_variant'

        ? 'Creating variant question...'

        : 'Dismissing review case...'
    );



    const {
      data,
      error
    } =
      await supabase.rpc(
        'resolve_prelims_import_review',
        {

          p_review_id:
            review.id,

          p_action:
            action,

          p_notes:
            notes[
              review.id
            ]?.trim() ||
            null

        }
      );


    if (
      error
    ) {

      console.error(
        'Unable to resolve review case:',
        error
      );


      setMessage(
        error.message ||
        'Unable to resolve review case.'
      );


      setProcessingId(
        null
      );


      return;
    }



    const result =
      (
        data ||
        {}
      ) as
        ResolveResult;



    if (
      result.success ===
      false
    ) {

      setMessage(
        result.message ||
        'This review case could not be resolved.'
      );


      setProcessingId(
        null
      );


      await loadQueue();


      return;
    }



    setReviews(
      current =>
        current.filter(
          item =>
            item.id !==
            review.id
        )
    );


    setNotes(
      current => {

        const copy = {
          ...current
        };


        delete copy[
          review.id
        ];


        return copy;
      }
    );


    setProcessingId(
      null
    );


    if (
      action ===
      'create_variant'
    ) {

      setMessage(

        result
          .question_id

          ? `Variant created successfully as Draft. Question ID: ${result.question_id}`

          : 'Variant created successfully as Draft.'

      );

    } else {

      setMessage(
        'Review case dismissed successfully.'
      );
    }
  }



  return (

    <section
      className="panel"
    >

      <div
        style={{

          display:
            'flex',

          justifyContent:
            'space-between',

          alignItems:
            'flex-start',

          gap:
            '14px',

          flexWrap:
            'wrap'

        }}
      >

        <div>

          <span
            className="eyebrow"
          >
            PRELIMS REVIEW QUEUE
          </span>


          <h2>
            Duplicate / Variant Review
          </h2>


          <p>
            Review questions that have the same stem as an existing master question but different options or answer content.
          </p>

        </div>



        <div
          style={{

            display:
              'flex',

            gap:
              '10px',

            flexWrap:
              'wrap',

            alignItems:
              'center'

          }}
        >

          <span
            className="tag"
          >
            Pending {pendingCount}
          </span>


          <button
            type="button"
            className="secondary-btn"
            disabled={
              loading
            }
            onClick={
              () =>
                void loadQueue()
            }
          >

            {
              loading
                ? 'Loading...'
                : 'Refresh Queue'
            }

          </button>

        </div>

      </div>



      {
        message && (

          <p
            className="form-message"
          >
            {message}
          </p>

        )
      }



      {
        loading ? (

          <div
            className="callout"
          >

            <strong>
              Loading review queue...
            </strong>

          </div>

        ) : reviews.length ===
            0 ? (

          <div
            className="callout"
          >

            <strong>
              No pending review cases
            </strong>


            <p>
              Same-stem question variants detected during future bulk imports will appear here automatically.
            </p>

          </div>

        ) : (

          <div
            style={{

              display:
                'grid',

              gap:
                '20px',

              marginTop:
                '18px'

            }}
          >

            {
              reviews.map(
                (
                  review,
                  reviewIndex
                ) => {

                  const existing =
                    existingQuestions[
                      review
                        .matched_question_id
                    ];


                  const paperText =
                    formatPaperMetadata(
                      review
                    );


                  const isProcessing =

                    processingId ===
                    review.id;


                  return (

                    <article
                      key={
                        review.id
                      }
                      style={{

                        padding:
                          '18px',

                        border:
                          '1px solid rgba(255,255,255,.12)',

                        borderRadius:
                          '16px'

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

                          flexWrap:
                            'wrap',

                          marginBottom:
                            '16px'

                        }}
                      >

                        <div>

                          <span
                            className="eyebrow"
                          >

                            REVIEW CASE{' '}

                            {
                              reviewIndex +
                              1
                            }

                          </span>


                          <h3
                            style={{
                              marginBottom:
                                '6px'
                            }}
                          >
                            Possible Question Variant
                          </h3>


                          {
                            paperText && (

                              <p
                                style={{
                                  margin:
                                    0
                                }}
                              >
                                {paperText}
                              </p>

                            )
                          }


                          {
                            review
                              .question_number && (

                              <p
                                style={{
                                  marginTop:
                                    '6px'
                                }}
                              >

                                Paper Question:{' '}

                                <strong>
                                  {
                                    review
                                      .question_number
                                  }
                                </strong>

                              </p>

                            )
                          }

                        </div>



                        <div
                          className="tag-row"
                        >

                          <span
                            className="tag"
                          >
                            {
                              review.origin ===
                                'cse'

                                ? 'CSE'

                                : review.origin ===
                                  'upsc'

                                  ? 'Other UPSC'

                                  : 'State PSC'
                            }
                          </span>


                          <span
                            className="tag"
                          >
                            {review.difficulty}
                          </span>


                          <span
                            className="tag"
                          >
                            Pending Review
                          </span>

                        </div>

                      </div>



                      <div
                        style={{

                          display:
                            'grid',

                          gridTemplateColumns:
                            'repeat(auto-fit,minmax(280px,1fr))',

                          gap:
                            '16px'

                        }}
                      >

                        {/* EXISTING MASTER */}

                        <div
                          style={{

                            padding:
                              '16px',

                            border:
                              '1px solid rgba(45,212,191,.30)',

                            borderRadius:
                              '14px'

                          }}
                        >

                          <span
                            className="eyebrow"
                          >
                            EXISTING MASTER QUESTION
                          </span>


                          {
                            existing ? (

                              <>

                                <h3>
                                  {existing.question}
                                </h3>


                                <div
                                  style={{

                                    display:
                                      'grid',

                                    gap:
                                      '8px'

                                  }}
                                >

                                  {
                                    existing
                                      .options
                                      .map(
                                        (
                                          option,
                                          optionIndex
                                        ) => {

                                          const correct =

                                            optionIndex ===
                                            existing
                                              .correct_index;


                                          return (

                                            <div
                                              key={
                                                `${existing.id}-${optionIndex}`
                                              }
                                              style={{

                                                padding:
                                                  '9px 11px',

                                                borderRadius:
                                                  '10px',

                                                border:

                                                  correct

                                                    ? '1px solid rgba(45,212,191,.65)'

                                                    : '1px solid rgba(255,255,255,.08)'

                                              }}
                                            >

                                              <strong>

                                                {
                                                  optionLetter(
                                                    optionIndex
                                                  )
                                                }.

                                              </strong>{' '}

                                              {option}


                                              {
                                                correct && (

                                                  <small
                                                    style={{

                                                      display:
                                                        'block',

                                                      marginTop:
                                                        '4px'

                                                    }}
                                                  >
                                                    ✓ Correct answer
                                                  </small>

                                                )
                                              }

                                            </div>

                                          );

                                        }
                                      )
                                  }

                                </div>



                                <div
                                  className="callout"
                                  style={{
                                    marginTop:
                                      '14px'
                                  }}
                                >

                                  <strong>
                                    Existing Explanation
                                  </strong>


                                  <p>
                                    {
                                      existing
                                        .explanation ||
                                      'No explanation available.'
                                    }
                                  </p>

                                </div>


                                <div
                                  className="tag-row"
                                >

                                  <span
                                    className="tag"
                                  >
                                    {
                                      existing.subject
                                    }
                                  </span>


                                  {
                                    existing.topic && (

                                      <span
                                        className="tag"
                                      >
                                        {
                                          existing.topic
                                        }
                                      </span>

                                    )
                                  }


                                  <span
                                    className="tag"
                                  >
                                    Status: {
                                      existing.status
                                    }
                                  </span>

                                </div>

                              </>

                            ) : (

                              <p>
                                Existing matched question could not be loaded.
                              </p>

                            )
                          }

                        </div>



                        {/* IMPORTED VERSION */}

                        <div
                          style={{

                            padding:
                              '16px',

                            border:
                              '1px solid rgba(251,191,36,.35)',

                            borderRadius:
                              '14px'

                          }}
                        >

                          <span
                            className="eyebrow"
                          >
                            IMPORTED VERSION
                          </span>


                          <h3>
                            {review.question}
                          </h3>


                          <div
                            style={{

                              display:
                                'grid',

                              gap:
                                '8px'

                            }}
                          >

                            {
                              review
                                .options
                                .map(
                                  (
                                    option,
                                    optionIndex
                                  ) => {

                                    const correct =

                                      optionIndex ===
                                      review
                                        .correct_index;


                                    return (

                                      <div
                                        key={
                                          `${review.id}-${optionIndex}`
                                        }
                                        style={{

                                          padding:
                                            '9px 11px',

                                          borderRadius:
                                            '10px',

                                          border:

                                            correct

                                              ? '1px solid rgba(251,191,36,.70)'

                                              : '1px solid rgba(255,255,255,.08)'

                                        }}
                                      >

                                        <strong>

                                          {
                                            optionLetter(
                                              optionIndex
                                            )
                                          }.

                                        </strong>{' '}

                                        {option}


                                        {
                                          correct && (

                                            <small
                                              style={{

                                                display:
                                                  'block',

                                                marginTop:
                                                  '4px'

                                              }}
                                            >
                                              ✓ Imported correct answer
                                            </small>

                                          )
                                        }

                                      </div>

                                    );

                                  }
                                )
                            }

                          </div>



                          <div
                            className="callout"
                            style={{
                              marginTop:
                                '14px'
                            }}
                          >

                            <strong>
                              Imported Explanation
                            </strong>


                            <p>
                              {
                                review
                                  .explanation ||
                                'No explanation supplied.'
                              }
                            </p>

                          </div>


                          <div
                            className="tag-row"
                          >

                            {
                              review.subject && (

                                <span
                                  className="tag"
                                >
                                  {review.subject}
                                </span>

                              )
                            }


                            {
                              review.topic && (

                                <span
                                  className="tag"
                                >
                                  {review.topic}
                                </span>

                              )
                            }

                          </div>

                        </div>

                      </div>



                      <div
                        style={{
                          marginTop:
                            '16px'
                        }}
                      >

                        <label>

                          Review Notes

                          <textarea
                            rows={
                              3
                            }
                            value={
                              notes[
                                review.id
                              ] ||
                              ''
                            }
                            onChange={
                              event =>
                                setNotes(
                                  current => ({

                                    ...current,

                                    [
                                      review.id
                                    ]:
                                      event
                                        .target
                                        .value

                                  })
                                )
                            }
                            placeholder="Example: Options differ from master; verified as genuine paper variant."
                          />

                        </label>

                      </div>



                      <div
                        className="callout"
                      >

                        <strong>
                          Editor Decision
                        </strong>


                        <p>
                          <strong>
                            Create Variant
                          </strong>{' '}
                          creates a separate Draft question because its content differs from the existing master.
                        </p>


                        <p>
                          <strong>
                            Dismiss
                          </strong>{' '}
                          closes the case without creating another question.
                        </p>

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
                            '14px'

                        }}
                      >

                        <button
                          type="button"
                          className="primary-btn"
                          disabled={
                            isProcessing
                          }
                          onClick={
                            () =>
                              void resolveReview(
                                review,
                                'create_variant'
                              )
                          }
                        >

                          {
                            isProcessing

                              ? 'Processing...'

                              : 'Create Variant as Draft'
                          }

                        </button>


                        <button
                          type="button"
                          className="secondary-btn"
                          disabled={
                            isProcessing
                          }
                          onClick={
                            () =>
                              void resolveReview(
                                review,
                                'dismiss'
                              )
                          }
                        >
                          Dismiss
                        </button>

                      </div>



                      <p
                        style={{

                          marginTop:
                            '14px',

                          marginBottom:
                            0,

                          opacity:
                            0.75

                        }}
                      >

                        Detected:{' '}

                        {
                          formatDate(
                            review
                              .created_at
                          )
                        }

                      </p>

                    </article>

                  );

                }
              )
            }

          </div>

        )
      }

    </section>

  );
}

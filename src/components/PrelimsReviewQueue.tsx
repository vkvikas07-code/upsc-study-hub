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


type ReviewOrigin =
  | 'cse'
  | 'upsc'
  | 'state';


type ReviewRow = {
  id: string;
  matched_question_id: string;
  origin: ReviewOrigin;
  paper_metadata: Record<string, unknown>;
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
  status: ReviewStatus;
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
};


type ResolveAction =
  | 'create_variant'
  | 'dismiss';


type ResolveResult = {
  success?: boolean;
  action?: string;
  status?: string;
  review_id?: string;
  question_id?: string;
  question_status?: string;
  appearance_id?: string;
  message?: string;
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
      String(
        item
      )
  );
}


function normalizeTags(
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
      String(
        item
      )
  );
}


function optionLetter(
  index: number
) {

  return String.fromCharCode(
    65 + index
  );
}


function formatDate(
  value: string
) {

  if (
    !value
  ) {
    return '';
  }

  try {

    return new Date(
      value
    ).toLocaleString();

  } catch {

    return value;
  }
}


function metadataValue(
  metadata: Record<string, unknown>,
  key: string
) {

  const value =
    metadata[
      key
    ];

  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '';
  }

  return String(
    value
  );
}


function formatPaperMetadata(
  row: ReviewRow
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
      metadataValue(
        metadata,
        'pyq_year'
      ),
      metadataValue(
        metadata,
        'paper'
      )
    ]
      .filter(
        Boolean
      )
      .join(
        ' · '
      );
  }


  if (
    row.origin ===
    'upsc'
  ) {

    const cycle =
      metadataValue(
        metadata,
        'upsc_exam_cycle'
      );


    return [
      metadataValue(
        metadata,
        'upsc_exam_name'
      ),

      cycle
        ? `Cycle ${cycle}`
        : '',

      metadataValue(
        metadata,
        'upsc_exam_year'
      ),

      metadataValue(
        metadata,
        'upsc_exam_stage'
      ),

      metadataValue(
        metadata,
        'upsc_exam_paper'
      )
    ]
      .filter(
        Boolean
      )
      .join(
        ' · '
      );
  }


  return [
    metadataValue(
      metadata,
      'state_psc_state'
    ),

    metadataValue(
      metadata,
      'state_psc_name'
    ),

    metadataValue(
      metadata,
      'state_psc_exam_name'
    ),

    metadataValue(
      metadata,
      'state_psc_year'
    ),

    metadataValue(
      metadata,
      'state_psc_stage'
    ),

    metadataValue(
      metadata,
      'state_psc_paper'
    )
  ]
    .filter(
      Boolean
    )
    .join(
      ' · '
    );
}


function originLabel(
  origin: ReviewOrigin
) {

  if (
    origin ===
    'cse'
  ) {
    return 'CSE';
  }

  if (
    origin ===
    'upsc'
  ) {
    return 'Other UPSC';
  }

  return 'State PSC';
}


export function PrelimsReviewQueue() {


  const [
    reviews,
    setReviews
  ] =
    useState<
      ReviewRow[]
    >(
      []
    );


  const [
    existingQuestions,
    setExistingQuestions
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
    notes,
    setNotes
  ] =
    useState<
      Record<
        string,
        string
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


    const rows =
      Array.isArray(
        data
      )
        ? data
        : [];


    const formatted:
      ReviewRow[] =
      rows.map(
        raw => {

          const item =
            raw as unknown as
              Record<
                string,
                unknown
              >;


          const rawMetadata =
            item.paper_metadata;


          const paperMetadata =
            rawMetadata &&
            typeof rawMetadata ===
              'object' &&
            !Array.isArray(
              rawMetadata
            )

              ? rawMetadata as
                  Record<
                    string,
                    unknown
                  >

              : {};


          return {

            id:
              String(
                item.id ||
                ''
              ),

            matched_question_id:
              String(
                item.matched_question_id ||
                ''
              ),

            origin:
              String(
                item.origin ||
                'cse'
              ) as
                ReviewOrigin,

            paper_metadata:
              paperMetadata,

            question_number:
              item.question_number ==
              null

                ? null

                : String(
                    item.question_number
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
                item.correct_index ??
                0
              ),

            explanation:
              item.explanation ==
              null

                ? null

                : String(
                    item.explanation
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
                item.review_reason ||
                ''
              ),

            status:
              String(
                item.status ||
                'pending'
              ) as
                ReviewStatus,

            created_at:
              String(
                item.created_at ||
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
                item.matched_question_id
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


    const questionRows =
      Array.isArray(
        questionData
      )
        ? questionData
        : [];


    questionRows.forEach(
      raw => {

        const item =
          raw as unknown as
            Record<
              string,
              unknown
            >;


        const id =
          String(
            item.id ||
            ''
          );


        if (
          !id
        ) {
          return;
        }


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
              item.correct_index ??
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


  function removeResolvedReview(
    reviewId: string
  ) {

    setReviews(
      current =>
        current.filter(
          item =>
            item.id !==
            reviewId
        )
    );


    setNotes(
      current => {

        const copy = {
          ...current
        };

        delete copy[
          reviewId
        ];

        return copy;
      }
    );
  }


  async function resolveReview(
    review: ReviewRow,
    action: ResolveAction
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
          'No question or exam appearance will be created.'
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


    removeResolvedReview(
      review.id
    );


    setProcessingId(
      null
    );


    if (
      action ===
      'create_variant'
    ) {

      setMessage(
        result.question_id

          ? `Variant created successfully as Draft. Question ID: ${result.question_id}`

          : 'Variant created successfully as Draft.'
      );

    } else {

      setMessage(
        'Review case dismissed successfully.'
      );
    }
  }


  async function linkReviewToExisting(
    review: ReviewRow
  ) {

    if (
      !supabase ||
      processingId
    ) {
      return;
    }


    const confirmed =
      window.confirm(
        'Link this imported version to the existing master question?\n\n' +
        'No duplicate master question will be created.\n\n' +
        'The original paper wording, options, correct answer and question number will be preserved as an exam appearance.'
      );


    if (
      !confirmed
    ) {
      return;
    }


    setProcessingId(
      review.id
    );


    setMessage(
      'Linking imported version to existing master...'
    );


    const {
      data,
      error
    } =
      await supabase.rpc(
        'link_prelims_import_review_to_existing',
        {

          p_review_id:
            review.id,

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
        'Unable to link review case to existing master:',
        error
      );

      setMessage(
        error.message ||
        'Unable to link this question to the existing master.'
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
        'The question could not be linked.'
      );

      setProcessingId(
        null
      );

      await loadQueue();

      return;
    }


    removeResolvedReview(
      review.id
    );


    setProcessingId(
      null
    );


    setMessage(
      result.message ||
      'Question linked to existing master successfully. Original paper appearance preserved.'
    );
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
            Compare imported questions with their matched master question before deciding how they should be stored.
          </p>

        </div>


        <div
          style={{

            display:
              'flex',

            alignItems:
              'center',

            gap:
              '10px',

            flexWrap:
              'wrap'

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
              loading ||
              Boolean(
                processingId
              )
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
              Same-stem questions requiring an editor decision will appear here automatically after bulk import.
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
                      review.matched_question_id
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

                          alignItems:
                            'flex-start',

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
                            REVIEW CASE {reviewIndex + 1}
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
                            review.question_number && (

                              <p
                                style={{
                                  marginTop:
                                    '6px',
                                  marginBottom:
                                    0
                                }}
                              >
                                Paper Question:{' '}

                                <strong>
                                  {review.question_number}
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
                              originLabel(
                                review.origin
                              )
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

                        {/* EXISTING MASTER QUESTION */}

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
                                    existing.options.map(
                                      (
                                        option,
                                        optionIndex
                                      ) => {

                                        const correct =
                                          optionIndex ===
                                          existing.correct_index;


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
                                      existing.explanation ||
                                      'No explanation available.'
                                    }
                                  </p>

                                </div>


                                <div
                                  className="tag-row"
                                >

                                  {
                                    existing.subject && (

                                      <span
                                        className="tag"
                                      >
                                        {existing.subject}
                                      </span>

                                    )
                                  }


                                  {
                                    existing.topic && (

                                      <span
                                        className="tag"
                                      >
                                        {existing.topic}
                                      </span>

                                    )
                                  }


                                  <span
                                    className="tag"
                                  >
                                    Status: {existing.status}
                                  </span>

                                </div>

                              </>

                            ) : (

                              <div
                                className="callout"
                              >

                                <strong>
                                  Existing question unavailable
                                </strong>


                                <p>
                                  The matched master question could not be loaded.
                                </p>

                              </div>

                            )
                          }

                        </div>


                        {/* IMPORTED QUESTION */}

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
                              review.options.map(
                                (
                                  option,
                                  optionIndex
                                ) => {

                                  const correct =
                                    optionIndex ===
                                    review.correct_index;


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
                                review.explanation ||
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


                            {
                              review.tags.map(
                                tag => (

                                  <span
                                    className="tag"
                                    key={
                                      `${review.id}-${tag}`
                                    }
                                  >
                                    {tag}
                                  </span>

                                )
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
                                      event.target.value

                                  })
                                )
                            }
                            placeholder="Example: Same underlying question; only distractors differ."
                          />

                        </label>

                      </div>


                      <div
                        className="callout"
                        style={{
                          marginTop:
                            '16px'
                        }}
                      >

                        <strong>
                          Editor Decision
                        </strong>


                        <p>
                          <strong>
                            Link Existing Master
                          </strong>{' '}
                          when this is fundamentally the same question and only wording, option order or distractors differ. No duplicate master is created.
                        </p>


                        <p>
                          <strong>
                            Create Variant
                          </strong>{' '}
                          when the meaning, interpretation or correct answer is genuinely different. A separate Draft master question is created.
                        </p>


                        <p>
                          <strong>
                            Dismiss
                          </strong>{' '}
                          when this review case should not create or link any question.
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
                            isProcessing ||
                            !existing
                          }
                          onClick={
                            () =>
                              void linkReviewToExisting(
                                review
                              )
                          }
                        >

                          {
                            isProcessing

                              ? 'Processing...'

                              : 'Link to Existing Master'
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
                          {
                            isProcessing
                              ? 'Processing...'
                              : 'Dismiss'
                          }
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
                            review.created_at
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

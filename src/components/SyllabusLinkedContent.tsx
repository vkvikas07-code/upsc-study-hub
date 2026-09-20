import {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


/* =========================================================
   TYPES
========================================================= */

type ExamStage =
  | 'prelims'
  | 'mains';


type ResourceType =
  | 'standard_book'
  | 'official_source'
  | 'monthly_current_affairs'
  | 'notes'
  | 'report'
  | 'pyq_resource'
  | 'syllabus_resource';


type ResourceRow = {
  id: string;
  title: string;
  description: string | null;
  resource_type: ResourceType;

  exam_stage:
    | 'prelims'
    | 'mains'
    | 'both';

  paper: string | null;
  subject: string;

  author: string | null;
  publisher: string | null;
  source_name: string | null;

  external_url: string | null;

  language: string;

  is_free: boolean;

  sort_order: number;
};


type PrelimsPyqRow = {
  id: string;

  question: string;

  options: string[];

  correct_index: number;

  explanation: string;

  subject: string;

  topic: string | null;

  difficulty: string;

  pyq_year: number | null;

  source: string | null;
};


type MainsPyqRow = {
  id: string;

  question: string;

  section_type:
    | 'essay'
    | 'gs'
    | 'optional';

  gs_paper: string | null;

  optional_subject:
    string | null;

  optional_paper:
    string | null;

  subject: string;

  topic: string | null;

  subtopic: string | null;

  question_number:
    string | null;

  marks:
    number | null;

  word_limit:
    number | null;

  pyq_year:
    number | null;

  essay_section:
    string | null;

  relevant_gs_papers:
    string[];
};


type ContentTab =
  | 'resources'
  | 'prelims'
  | 'mains';


type SyllabusLinkedContentProps = {

  stage:
    ExamStage;

  subject:
    string;

  topic?:
    string | null;

  paper?:
    string | null;

};


/* =========================================================
   DATABASE SELECTS
========================================================= */

const RESOURCE_SELECT = `
  id,
  title,
  description,
  resource_type,
  exam_stage,
  paper,
  subject,
  author,
  publisher,
  source_name,
  external_url,
  language,
  is_free,
  sort_order
`;


const PRELIMS_SELECT = `
  id,
  question,
  options,
  correct_index,
  explanation,
  subject,
  topic,
  difficulty,
  pyq_year,
  source
`;


const MAINS_SELECT = `
  id,
  question,
  section_type,
  gs_paper,
  optional_subject,
  optional_paper,
  subject,
  topic,
  subtopic,
  question_number,
  marks,
  word_limit,
  pyq_year,
  essay_section,
  relevant_gs_papers
`;


/* =========================================================
   HELPERS
========================================================= */

function safeNumber(
  value: unknown,
  fallback = 0
): number {

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


function normalise(
  value:
    string |
    null |
    undefined
): string {

  return (
    value ||
    ''
  )
    .trim()
    .toLowerCase()
    .replace(
      /&/g,
      'and'
    )
    .replace(
      /[^a-z0-9]/g,
      ''
    )
    .replace(
      /economics/g,
      'economy'
    );

}


function resourceTypeLabel(
  type: ResourceType
): string {

  switch (
    type
  ) {

    case 'standard_book':
      return 'Standard Book';

    case 'official_source':
      return 'Official Source';

    case 'monthly_current_affairs':
      return 'Monthly CA';

    case 'notes':
      return 'Notes';

    case 'report':
      return 'Report';

    case 'pyq_resource':
      return 'PYQ Resource';

    case 'syllabus_resource':
      return 'Syllabus Resource';

    default:
      return 'Resource';

  }

}


function topicRelevant(
  targetTopic:
    string |
    null |
    undefined,

  ...candidates:
    Array<
      string |
      null |
      undefined
    >
): boolean {

  if (
    !targetTopic
  ) {

    return true;

  }


  const target =
    normalise(
      targetTopic
    );


  if (
    !target
  ) {

    return true;

  }


  return candidates.some(
    candidate => {

      const value =
        normalise(
          candidate
        );


      if (
        !value
      ) {

        return false;

      }


      return (
        value.includes(
          target
        ) ||
        target.includes(
          value
        )
      );

    }
  );

}


function safeUrl(
  value:
    string |
    null
): string | null {

  if (
    !value
  ) {

    return null;

  }


  try {

    const url =
      new URL(
        value
      );


    if (
      url.protocol !==
        'http:' &&
      url.protocol !==
        'https:'
    ) {

      return null;

    }


    return url.toString();

  } catch {

    return null;

  }

}


/* =========================================================
   COMPONENT
========================================================= */

export function SyllabusLinkedContent({

  stage,
  subject,
  topic = null,
  paper = null

}: SyllabusLinkedContentProps) {

  /* =======================================================
     ACTIVE TAB
  ======================================================= */

  const [
    activeTab,
    setActiveTab
  ] =
    useState<ContentTab>(

      stage ===
        'prelims'
        ? 'prelims'
        : 'mains'

    );


  /* =======================================================
     DATABASE DATA
  ======================================================= */

  const [
    resources,
    setResources
  ] =
    useState<ResourceRow[]>(
      []
    );


  const [
    prelimsPyqs,
    setPrelimsPyqs
  ] =
    useState<PrelimsPyqRow[]>(
      []
    );


  const [
    mainsPyqs,
    setMainsPyqs
  ] =
    useState<MainsPyqRow[]>(
      []
    );


  /* =======================================================
     UI STATE
  ======================================================= */

  const [
    loading,
    setLoading
  ] =
    useState(
      true
    );


  const [
    error,
    setError
  ] =
    useState(
      ''
    );


  /* =======================================================
     CHANGE DEFAULT TAB WHEN STAGE CHANGES
  ======================================================= */

  useEffect(
    () => {

      setActiveTab(

        stage ===
          'prelims'
          ? 'prelims'
          : 'mains'

      );

    },
    [
      stage
    ]
  );


  /* =======================================================
     LOAD CONTENT
  ======================================================= */

  async function loadLinkedContent():
    Promise<void> {

    if (
      !supabase
    ) {

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


    setError(
      ''
    );


    const [
      resourceResult,
      prelimsResult,
      mainsResult
    ] =
      await Promise.all([

        /* ===============================================
           RESOURCES
        =============================================== */

        supabase
          .from(
            'study_resources'
          )
          .select(
            RESOURCE_SELECT
          )
          .eq(
            'status',
            'published'
          )
          .ilike(
            'subject',
            subject
          )
          .in(
            'exam_stage',
            [
              stage,
              'both'
            ]
          )
          .order(
            'sort_order',
            {
              ascending:
                true
            }
          )
          .limit(
            50
          ),


        /* ===============================================
           PRELIMS PYQ
        =============================================== */

        supabase
          .from(
            'questions'
          )
          .select(
            PRELIMS_SELECT
          )
          .eq(
            'status',
            'published'
          )
          .eq(
            'exam_stage',
            'prelims'
          )
          .eq(
            'is_pyq',
            true
          )
          .ilike(
            'subject',
            subject
          )
          .order(
            'pyq_year',
            {
              ascending:
                false
            }
          )
          .limit(
            60
          ),


        /* ===============================================
           MAINS PYQ
        =============================================== */

        supabase
          .from(
            'mains_questions'
          )
          .select(
            MAINS_SELECT
          )
          .eq(
            'question_type',
            'pyq'
          )
          .eq(
            'status',
            'published'
          )
          .ilike(
            'subject',
            subject
          )
          .order(
            'pyq_year',
            {
              ascending:
                false
            }
          )
          .limit(
            60
          )

      ]);


    /* ===================================================
       RESOURCES
    =================================================== */

    if (
      resourceResult.error
    ) {

      console.error(
        'Unable to load linked resources:',
        resourceResult.error
      );


      setResources(
        []
      );

    } else {

      const loadedResources:
        ResourceRow[] =
        (
          resourceResult.data ||
          []
        )
          .map(
            item => ({

              id:
                String(
                  item.id
                ),

              title:
                String(
                  item.title ||
                  ''
                ),

              description:
                item.description
                  ? String(
                      item.description
                    )
                  : null,

              resource_type:
                (
                  item.resource_type ||
                  'notes'
                ) as
                  ResourceType,

              exam_stage:
                (
                  item.exam_stage ||
                  'both'
                ) as
                  | 'prelims'
                  | 'mains'
                  | 'both',

              paper:
                item.paper
                  ? String(
                      item.paper
                    )
                  : null,

              subject:
                String(
                  item.subject ||
                  ''
                ),

              author:
                item.author
                  ? String(
                      item.author
                    )
                  : null,

              publisher:
                item.publisher
                  ? String(
                      item.publisher
                    )
                  : null,

              source_name:
                item.source_name
                  ? String(
                      item.source_name
                    )
                  : null,

              external_url:
                item.external_url
                  ? String(
                      item.external_url
                    )
                  : null,

              language:
                String(
                  item.language ||
                  'English'
                ),

              is_free:
                item.is_free ===
                true,

              sort_order:
                safeNumber(
                  item.sort_order
                )

            })
          );


      setResources(
        loadedResources
      );

    }


    /* ===================================================
       PRELIMS PYQ
    =================================================== */

    if (
      prelimsResult.error
    ) {

      console.error(
        'Unable to load Prelims PYQs:',
        prelimsResult.error
      );


      setPrelimsPyqs(
        []
      );

    } else {

      const loadedPrelims:
        PrelimsPyqRow[] =
        (
          prelimsResult.data ||
          []
        )
          .map(
            item => ({

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
                  item.correct_index,
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

              pyq_year:
                item.pyq_year ===
                  null ||
                item.pyq_year ===
                  undefined
                  ? null
                  : safeNumber(
                      item.pyq_year
                    ),

              source:
                item.source
                  ? String(
                      item.source
                    )
                  : null

            })
          );


      setPrelimsPyqs(
        loadedPrelims
      );

    }


    /* ===================================================
       MAINS PYQ
    =================================================== */

    if (
      mainsResult.error
    ) {

      console.error(
        'Unable to load Mains PYQs:',
        mainsResult.error
      );


      setMainsPyqs(
        []
      );

    } else {

      const loadedMains:
        MainsPyqRow[] =
        (
          mainsResult.data ||
          []
        )
          .map(
            item => ({

              id:
                String(
                  item.id
                ),

              question:
                String(
                  item.question ||
                  ''
                ),

              section_type:
                (
                  item.section_type ||
                  'gs'
                ) as
                  | 'essay'
                  | 'gs'
                  | 'optional',

              gs_paper:
                item.gs_paper
                  ? String(
                      item.gs_paper
                    )
                  : null,

              optional_subject:
                item.optional_subject
                  ? String(
                      item.optional_subject
                    )
                  : null,

              optional_paper:
                item.optional_paper
                  ? String(
                      item.optional_paper
                    )
                  : null,

              subject:
                String(
                  item.subject ||
                  ''
                ),

              topic:
                item.topic
                  ? String(
                      item.topic
                    )
                  : null,

              subtopic:
                item.subtopic
                  ? String(
                      item.subtopic
                    )
                  : null,

              question_number:
                item.question_number
                  ? String(
                      item.question_number
                    )
                  : null,

              marks:
                item.marks ===
                  null ||
                item.marks ===
                  undefined
                  ? null
                  : safeNumber(
                      item.marks
                    ),

              word_limit:
                item.word_limit ===
                  null ||
                item.word_limit ===
                  undefined
                  ? null
                  : safeNumber(
                      item.word_limit
                    ),

              pyq_year:
                item.pyq_year ===
                  null ||
                item.pyq_year ===
                  undefined
                  ? null
                  : safeNumber(
                      item.pyq_year
                    ),

              essay_section:
                item.essay_section
                  ? String(
                      item.essay_section
                    )
                  : null,

              relevant_gs_papers:
                Array.isArray(
                  item.relevant_gs_papers
                )
                  ? item
                      .relevant_gs_papers
                      .map(
                        value =>
                          String(
                            value
                          )
                      )
                  : []

            })
          );


      setMainsPyqs(
        loadedMains
      );

    }


    /*
     * Show general error only if
     * every request failed.
     */

    if (
      resourceResult.error &&
      prelimsResult.error &&
      mainsResult.error
    ) {

      setError(
        'Unable to load linked study content.'
      );

    }


    setLoading(
      false
    );

  }


  /* =======================================================
     AUTO LOAD
  ======================================================= */

  useEffect(
    () => {

      void loadLinkedContent();

    },
    [
      stage,
      subject,
      topic,
      paper
    ]
  );


  /* =======================================================
     FILTER RESOURCES
  ======================================================= */

  const visibleResources =
    useMemo(
      () => {

        return resources.filter(
          resource => {

            if (
              paper &&
              resource.paper &&
              normalise(
                resource.paper
              ) !==
              normalise(
                paper
              )
            ) {

              return false;

            }


            return true;

          }
        );

      },
      [
        resources,
        paper
      ]
    );


  /* =======================================================
     FILTER PRELIMS PYQ
  ======================================================= */

  const visiblePrelims =
    useMemo(
      () => {

        return prelimsPyqs.filter(
          question =>

            topicRelevant(
              topic,
              question.topic
            )
        );

      },
      [
        prelimsPyqs,
        topic
      ]
    );


  /* =======================================================
     FILTER MAINS PYQ
  ======================================================= */

  const visibleMains =
    useMemo(
      () => {

        return mainsPyqs.filter(
          question => {

            if (
              !topicRelevant(
                topic,
                question.topic,
                question.subtopic
              )
            ) {

              return false;

            }


            if (
              paper &&
              question.gs_paper
            ) {

              const directMatch =
                normalise(
                  question.gs_paper
                ) ===
                normalise(
                  paper
                );


              const relevantMatch =
                question
                  .relevant_gs_papers
                  .some(
                    relevantPaper =>

                      normalise(
                        relevantPaper
                      ) ===
                      normalise(
                        paper
                      )
                  );


              if (
                !directMatch &&
                !relevantMatch
              ) {

                return false;

              }

            }


            return true;

          }
        );

      },
      [
        mainsPyqs,
        topic,
        paper
      ]
    );


  /* =======================================================
     PAGE
  ======================================================= */

  return (

    <section

      className="panel"

      style={{

        marginTop:
          '10px',

        padding:
          '14px'

      }}

    >

      {/* =================================================
          HEADER
      ================================================= */}

      <div
        className="panel-head"
      >

        <div>

          <span
            className="eyebrow"
          >
            LINKED STUDY
          </span>


          <h3
            style={{
              margin:
                '5px 0'
            }}
          >

            {
              topic ||
              subject
            }

          </h3>


          <small
            style={{
              color:
                '#94a3b8'
            }}
          >

            {
              subject
            }


            {
              paper
                ? ` • ${paper}`
                : ''
            }

          </small>

        </div>


        <button

          type="button"

          className="text-btn"

          onClick={() =>
            void loadLinkedContent()
          }

        >

          Refresh

        </button>

      </div>


      {/* =================================================
          METRICS
      ================================================= */}

      <div

        className="metrics-grid"

        style={{
          marginTop:
            '12px'
        }}

      >

        <article
          className="metric-card"
        >

          <div>

            <span>
              Resources
            </span>


            <strong>
              {
                visibleResources.length
              }
            </strong>

          </div>

        </article>


        <article
          className="metric-card"
        >

          <div>

            <span>
              Prelims PYQ
            </span>


            <strong>
              {
                visiblePrelims.length
              }
            </strong>

          </div>

        </article>


        <article
          className="metric-card"
        >

          <div>

            <span>
              Mains PYQ
            </span>


            <strong>
              {
                visibleMains.length
              }
            </strong>

          </div>

        </article>

      </div>


      {/* =================================================
          TABS
      ================================================= */}

      <div
        style={{

          display:
            'grid',

          gridTemplateColumns:
            'repeat(3, minmax(0, 1fr))',

          gap:
            '7px',

          marginTop:
            '12px'

        }}
      >

        <button

          type="button"

          className={
            activeTab ===
              'resources'
              ? 'filter active'
              : 'filter'
          }

          onClick={() =>
            setActiveTab(
              'resources'
            )
          }

        >

          Resources

        </button>


        <button

          type="button"

          className={
            activeTab ===
              'prelims'
              ? 'filter active'
              : 'filter'
          }

          onClick={() =>
            setActiveTab(
              'prelims'
            )
          }

        >

          Prelims PYQ

        </button>


        <button

          type="button"

          className={
            activeTab ===
              'mains'
              ? 'filter active'
              : 'filter'
          }

          onClick={() =>
            setActiveTab(
              'mains'
            )
          }

        >

          Mains PYQ

        </button>

      </div>


      {/* =================================================
          LOADING
      ================================================= */}

      {
        loading && (

          <div
            className="callout"

            style={{
              marginTop:
                '12px'
            }}
          >

            Loading linked study material...

          </div>

        )
      }


      {/* =================================================
          ERROR
      ================================================= */}

      {
        error && (

          <div
            className="callout"

            style={{
              marginTop:
                '12px'
            }}
          >

            {
              error
            }

          </div>

        )
      }


      {/* =================================================
          RESOURCES TAB
      ================================================= */}

      {
        !loading &&
        activeTab ===
          'resources' && (

          <div
            style={{

              display:
                'grid',

              gap:
                '9px',

              marginTop:
                '12px'

            }}
          >

            {
              visibleResources.length ===
              0
                ? (

                  <div
                    className="callout"
                  >

                    No linked resources found yet.

                  </div>

                )

                : visibleResources.map(
                    resource => {

                      const url =
                        safeUrl(
                          resource.external_url
                        );


                      const source =
                        resource.source_name ||
                        resource.publisher ||
                        resource.author;


                      return (

                        <article

                          key={
                            resource.id
                          }

                          style={{

                            padding:
                              '11px 12px',

                            border:
                              '1px solid rgba(255,255,255,.08)',

                            borderRadius:
                              '12px'

                          }}

                        >

                          <small
                            style={{
                              color:
                                '#94a3b8'
                            }}
                          >

                            {
                              resourceTypeLabel(
                                resource.resource_type
                              )
                            }

                            {' • '}

                            {
                              resource.language
                            }

                            {
                              resource.is_free
                                ? ' • Free'
                                : ''
                            }

                          </small>


                          <h4
                            style={{
                              margin:
                                '7px 0 4px'
                            }}
                          >

                            {
                              resource.title
                            }

                          </h4>


                          {
                            source && (

                              <small
                                style={{
                                  color:
                                    '#94a3b8'
                                }}
                              >

                                {
                                  source
                                }

                              </small>

                            )
                          }


                          {
                            resource.description && (

                              <p>
                                {
                                  resource.description
                                }
                              </p>

                            )
                          }


                          {
                            url && (

                              <button

                                type="button"

                                className="secondary-btn"

                                onClick={() =>

                                  window.open(
                                    url,
                                    '_blank',
                                    'noopener,noreferrer'
                                  )
                                }

                              >

                                Open Resource

                              </button>

                            )
                          }

                        </article>

                      );

                    }
                  )
            }

          </div>

        )
      }


      {/* =================================================
          PRELIMS PYQ TAB
      ================================================= */}

      {
        !loading &&
        activeTab ===
          'prelims' && (

          <div
            style={{

              display:
                'grid',

              gap:
                '9px',

              marginTop:
                '12px'

            }}
          >

            {
              visiblePrelims.length ===
              0
                ? (

                  <div
                    className="callout"
                  >

                    No linked Prelims PYQs found yet.

                  </div>

                )

                : visiblePrelims.map(
                    (
                      question,
                      index
                    ) => (

                      <details

                        key={
                          question.id
                        }

                        style={{

                          padding:
                            '11px 12px',

                          border:
                            '1px solid rgba(255,255,255,.08)',

                          borderRadius:
                            '12px'

                        }}

                      >

                        <summary
                          style={{
                            cursor:
                              'pointer'
                          }}
                        >

                          <strong>

                            {
                              question.pyq_year
                                ? `${question.pyq_year} • `
                                : ''
                            }

                            Q{
                              index + 1
                            }

                          </strong>


                          <div
                            style={{
                              marginTop:
                                '5px'
                            }}
                          >

                            {
                              question.question
                            }

                          </div>

                        </summary>


                        <div
                          style={{
                            marginTop:
                              '12px'
                          }}
                        >

                          {
                            question.options.map(
                              (
                                option,
                                optionIndex
                              ) => (

                                <div

                                  key={
                                    optionIndex
                                  }

                                  style={{

                                    padding:
                                      '7px 9px',

                                    marginTop:
                                      '5px',

                                    borderRadius:
                                      '9px',

                                    border:
                                      '1px solid rgba(255,255,255,.07)'

                                  }}

                                >

                                  {
                                    String.fromCharCode(
                                      65 +
                                      optionIndex
                                    )
                                  }.

                                  {' '}

                                  {
                                    option
                                  }

                                </div>

                              )
                            )
                          }


                          <div

                            className="callout"

                            style={{
                              marginTop:
                                '10px'
                            }}

                          >

                            <strong>
                              Correct Answer:
                            </strong>

                            {' '}

                            {
                              String.fromCharCode(
                                65 +
                                question.correct_index
                              )
                            }

                          </div>


                          {
                            question.explanation && (

                              <div
                                style={{
                                  marginTop:
                                    '10px'
                                }}
                              >

                                <strong>
                                  Explanation
                                </strong>


                                <p>
                                  {
                                    question.explanation
                                  }
                                </p>

                              </div>

                            )
                          }


                          <small
                            style={{
                              color:
                                '#94a3b8'
                            }}
                          >

                            {
                              question.topic ||
                              subject
                            }

                            {' • '}

                            {
                              question.difficulty
                            }

                          </small>

                        </div>

                      </details>

                    )
                  )
            }

          </div>

        )
      }


      {/* =================================================
          MAINS PYQ TAB
      ================================================= */}

      {
        !loading &&
        activeTab ===
          'mains' && (

          <div
            style={{

              display:
                'grid',

              gap:
                '9px',

              marginTop:
                '12px'

            }}
          >

            {
              visibleMains.length ===
              0
                ? (

                  <div
                    className="callout"
                  >

                    No linked Mains PYQs found yet.

                  </div>

                )

                : visibleMains.map(
                    (
                      question,
                      index
                    ) => (

                      <article

                        key={
                          question.id
                        }

                        style={{

                          padding:
                            '12px',

                          border:
                            '1px solid rgba(255,255,255,.08)',

                          borderRadius:
                            '12px'

                        }}

                      >

                        <small
                          style={{
                            color:
                              '#94a3b8'
                          }}
                        >

                          {
                            question.pyq_year ||
                            'Year unavailable'
                          }


                          {
                            question.gs_paper
                              ? ` • ${question.gs_paper}`
                              : ''
                          }


                          {
                            question.marks !==
                            null
                              ? ` • ${question.marks} Marks`
                              : ''
                          }


                          {
                            question.word_limit !==
                            null
                              ? ` • ${question.word_limit} Words`
                              : ''
                          }

                        </small>


                        <div
                          style={{
                            marginTop:
                              '8px'
                          }}
                        >

                          <strong>

                            {
                              question.question_number
                                ? `Q${question.question_number}. `
                                : `Q${index + 1}. `
                            }

                            {
                              question.question
                            }

                          </strong>

                        </div>


                        {
                          (
                            question.topic ||
                            question.subtopic
                          ) && (

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

                              {
                                question.topic ||
                                subject
                              }


                              {
                                question.subtopic
                                  ? ` → ${question.subtopic}`
                                  : ''
                              }

                            </small>

                          )
                        }

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

import {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  TopBar
} from '../components/TopBar';

import {
  supabase
} from '../lib/supabase';


type PreviewTab =
  | 'overview'
  | 'syllabus'
  | 'prelims'
  | 'mains';


type ExamStage =
  | 'prelims'
  | 'mains';


type SyllabusTopic = {
  id: string;
  exam_stage: ExamStage;
  paper: string | null;
  subject: string;
  topic: string;
  parent_id: string | null;
  sort_order: number;
};


type PreviewPrelimsQuestion = {
  id: string;
  question: string;
  options: unknown;
  subject: string | null;
  topic: string | null;
  paper: string | null;
  tags: string[];
  source: string | null;
  source_url: string | null;
  year: number | null;
};


type PreviewMainsQuestion = {
  id: string;
  question: string;
  section_type: string | null;
  gs_paper: string | null;
  subject: string | null;
  topic: string | null;
  subtopic: string | null;
  marks: number | null;
  word_limit: number | null;
  year: number | null;
  question_number: string | null;
  paper_name: string | null;
  exam_name: string | null;
  source: string | null;
  source_url: string | null;
};


type VisitorPreviewPageProps = {
  onOpenAccount:
    () => void;
};


/*
 * =========================================
 * HELPERS
 * =========================================
 */

function nullableString(
  value: unknown
) {

  if (
    typeof value !==
      'string'
  ) {

    return null;
  }


  const clean =
    value.trim();


  return clean ||
    null;
}


function nullableNumber(
  value: unknown
) {

  const next =
    Number(
      value
    );


  if (
    !Number.isFinite(
      next
    )
  ) {

    return null;
  }


  return next;
}


function optionList(
  value: unknown
): string[] {

  if (
    Array.isArray(
      value
    )
  ) {

    return value
      .map(
        item =>
          String(
            item ?? ''
          ).trim()
      )
      .filter(
        Boolean
      );
  }


  if (
    value &&
    typeof value ===
      'object'
  ) {

    return Object
      .values(
        value as
          Record<
            string,
            unknown
          >
      )
      .map(
        item =>
          String(
            item ?? ''
          ).trim()
      )
      .filter(
        Boolean
      );
  }


  return [];
}


/*
 * =========================================
 * VISITOR PREVIEW PAGE
 * =========================================
 */

export function VisitorPreviewPage({
  onOpenAccount
}: VisitorPreviewPageProps) {

  const currentYear =
    new Date()
      .getFullYear();


  const previewYears =
    useMemo(
      () =>
        Array.from(
          {
            length:
              10
          },
          (
            _,
            index
          ) =>
            currentYear -
            index
        ),
      [
        currentYear
      ]
    );


  const [
    tab,
    setTab
  ] =
    useState<PreviewTab>(
      'overview'
    );


  const [
    selectedYear,
    setSelectedYear
  ] =
    useState(
      currentYear
    );


  const [
    syllabusStage,
    setSyllabusStage
  ] =
    useState<ExamStage>(
      'prelims'
    );


  const [
    syllabus,
    setSyllabus
  ] =
    useState<
      SyllabusTopic[]
    >([]);


  const [
    prelimsQuestions,
    setPrelimsQuestions
  ] =
    useState<
      PreviewPrelimsQuestion[]
    >([]);


  const [
    mainsQuestions,
    setMainsQuestions
  ] =
    useState<
      PreviewMainsQuestion[]
    >([]);


  const [
    syllabusLoading,
    setSyllabusLoading
  ] =
    useState(
      true
    );


  const [
    pyqLoading,
    setPyqLoading
  ] =
    useState(
      true
    );


  const [
    syllabusError,
    setSyllabusError
  ] =
    useState('');


  const [
    pyqError,
    setPyqError
  ] =
    useState('');


  /*
   * =========================================
   * LOAD PUBLIC SYLLABUS
   * =========================================
   */

  useEffect(
    () => {

      const client =
  supabase;


if (
  !client
) {

  setSyllabusError(
    'Study database is not configured.'
  );

  setSyllabusLoading(
    false
  );

  return;
}


const safeClient =
  client;

      let cancelled =
        false;


      async function loadSyllabus() {

        setSyllabusLoading(
          true
        );

        setSyllabusError('');


        const {
          data,
          error
        } =
          await safeClient
  .from(
    'syllabus_topics'
  )
            .select(
              `
              id,
              exam_stage,
              paper,
              subject,
              topic,
              parent_id,
              sort_order
              `
            )
            .order(
              'sort_order',
              {
                ascending:
                  true
              }
            );


        if (
          cancelled
        ) {

          return;
        }


        if (
          error
        ) {

          setSyllabusError(
            error.message
          );

          setSyllabusLoading(
            false
          );

          return;
        }


        const clean:
          SyllabusTopic[] =
            (
              data ||
              []
            )
              .filter(
                item =>
                  item.exam_stage ===
                    'prelims' ||
                  item.exam_stage ===
                    'mains'
              )
              .map(
                item => ({

                  id:
                    String(
                      item.id
                    ),

                  exam_stage:
                    item.exam_stage as
                      ExamStage,

                  paper:
                    nullableString(
                      item.paper
                    ),

                  subject:
                    nullableString(
                      item.subject
                    ) ||
                    'Other',

                  topic:
                    nullableString(
                      item.topic
                    ) ||
                    'Untitled topic',

                  parent_id:
                    nullableString(
                      item.parent_id
                    ),

                  sort_order:
                    Number(
                      item.sort_order ||
                      0
                    )

                })
              );


        setSyllabus(
          clean
        );

        setSyllabusLoading(
          false
        );
      }


      void loadSyllabus();


      return () => {

        cancelled =
          true;
      };

    },
    []
  );


  /*
   * =========================================
   * LOAD PUBLIC 10-YEAR PYQ PREVIEW
   * =========================================
   */

  useEffect(
    () => {

      const client =
  supabase;


if (
  !client
) {

  setPyqError(
    'Study database is not configured.'
  );

  setPyqLoading(
    false
  );

  return;
}


const safeClient =
  client;

      let cancelled =
        false;


      async function loadPreviewPyqs() {

        setPyqLoading(
          true
        );

        setPyqError('');


        const [
          prelimsResult,
          mainsResult
        ] =
          await Promise.all([

            safeClient
  .from(
    'preview_prelims_pyqs'
  )
              .select(
                `
                id,
                question,
                options,
                subject,
                topic,
                paper,
                tags,
                source,
                source_url,
                year
                `
              )
              .eq(
                'year',
                selectedYear
              )
              .order(
                'subject',
                {
                  ascending:
                    true
                }
              )
              .limit(
                300
              ),


            safeClient
  .from(
    'preview_mains_pyqs'
  )
              .select(
                `
                id,
                question,
                section_type,
                gs_paper,
                subject,
                topic,
                subtopic,
                marks,
                word_limit,
                year,
                question_number,
                paper_name,
                exam_name,
                source,
                source_url
                `
              )
              .eq(
                'year',
                selectedYear
              )
              .order(
                'question_number',
                {
                  ascending:
                    true
                }
              )
              .limit(
                300
              )

          ]);


        if (
          cancelled
        ) {

          return;
        }


        if (
          prelimsResult.error
        ) {

          setPyqError(
            prelimsResult
              .error
              .message
          );

          setPrelimsQuestions(
            []
          );

        } else {

          setPrelimsQuestions(

            (
              prelimsResult.data ||
              []
            ).map(
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
                  item.options,

                subject:
                  nullableString(
                    item.subject
                  ),

                topic:
                  nullableString(
                    item.topic
                  ),

                paper:
                  nullableString(
                    item.paper
                  ),

                tags:
                  Array.isArray(
                    item.tags
                  )
                    ? item.tags.map(
                        tag =>
                          String(
                            tag
                          )
                      )
                    : [],

                source:
                  nullableString(
                    item.source
                  ),

                source_url:
                  nullableString(
                    item.source_url
                  ),

                year:
                  nullableNumber(
                    item.year
                  )

              })
            )

          );
        }


        if (
          mainsResult.error
        ) {

          setPyqError(
            current =>
              current ||
              mainsResult
                .error
                .message
          );

          setMainsQuestions(
            []
          );

        } else {

          setMainsQuestions(

            (
              mainsResult.data ||
              []
            ).map(
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
                  nullableString(
                    item.section_type
                  ),

                gs_paper:
                  nullableString(
                    item.gs_paper
                  ),

                subject:
                  nullableString(
                    item.subject
                  ),

                topic:
                  nullableString(
                    item.topic
                  ),

                subtopic:
                  nullableString(
                    item.subtopic
                  ),

                marks:
                  nullableNumber(
                    item.marks
                  ),

                word_limit:
                  nullableNumber(
                    item.word_limit
                  ),

                year:
                  nullableNumber(
                    item.year
                  ),

                question_number:
                  nullableString(
                    item.question_number
                  ),

                paper_name:
                  nullableString(
                    item.paper_name
                  ),

                exam_name:
                  nullableString(
                    item.exam_name
                  ),

                source:
                  nullableString(
                    item.source
                  ),

                source_url:
                  nullableString(
                    item.source_url
                  )

              })
            )

          );
        }


        setPyqLoading(
          false
        );
      }


      void loadPreviewPyqs();


      return () => {

        cancelled =
          true;
      };

    },
    [
      selectedYear
    ]
  );


  /*
   * =========================================
   * SYLLABUS STRUCTURE
   * =========================================
   */

  const syllabusForStage =
    useMemo(
      () =>
        syllabus.filter(
          item =>
            item.exam_stage ===
            syllabusStage
        ),
      [
        syllabus,
        syllabusStage
      ]
    );


  const syllabusMap =
    useMemo(
      () => {

        const map =
          new Map<
            string,
            SyllabusTopic
          >();


        syllabusForStage
          .forEach(
            item => {

              map.set(
                item.id,
                item
              );
            }
          );


        return map;

      },
      [
        syllabusForStage
      ]
    );


  const syllabusSubjects =
    useMemo(
      () => {

        const names =
          Array.from(
            new Set(
              syllabusForStage
                .map(
                  item =>
                    item.subject
                )
            )
          );


        return names.sort();

      },
      [
        syllabusForStage
      ]
    );


  function topicDepth(
    topic:
      SyllabusTopic
  ) {

    let depth =
      0;

    let parentId =
      topic.parent_id;

    const visited =
      new Set<string>();


    while (
      parentId &&
      depth <
        4 &&
      !visited.has(
        parentId
      )
    ) {

      visited.add(
        parentId
      );

      const parent =
        syllabusMap.get(
          parentId
        );


      if (
        !parent
      ) {

        break;
      }


      depth +=
        1;

      parentId =
        parent.parent_id;
    }


    return depth;
  }


  /*
   * =========================================
   * COMMON STYLES
   * =========================================
   */

  const tabButtonStyle = {

    width:
      '100%',

    minWidth:
      0,

    minHeight:
      '48px',

    whiteSpace:
      'normal' as const,

    textAlign:
      'center' as const,

    lineHeight:
      1.2,

    padding:
      '9px 6px'

  };


  /*
   * =========================================
   * PAGE
   * =========================================
   */

  return (

    <div
      className="page-wrap"
    >

      <TopBar

        title="UPSC Study Hub"

        subtitle="Explore the syllabus and latest 10 years of UPSC Previous Year Questions"

      />


      {/* =====================================
          ACCESS INFORMATION
      ===================================== */}

      <section
        className="panel"

        style={{
          marginTop:
            '16px'
        }}
      >

        <span
          className="eyebrow"
        >
          VISITOR PREVIEW
        </span>


        <h2
          style={{
            marginBottom:
              '8px'
          }}
        >
          Start before you sign in
        </h2>


        <p>
          You can freely explore the UPSC syllabus
          and the latest 10 years of published
          UPSC Prelims and Mains questions.
        </p>


        <div
          style={{
            padding:
              '12px 14px',

            marginTop:
              '14px',

            borderRadius:
              '12px',

            background:
              'rgba(59, 130, 246, 0.10)'
          }}
        >

          <strong>
            Public PYQ window:
          </strong>

          {' '}

          {currentYear - 9}
          {' – '}
          {currentYear}

        </div>


        <button

          type="button"

          className="primary-btn"

          style={{
            width:
              '100%',

            display:
              'flex',

            justifyContent:
              'center',

            alignItems:
              'center',

            textAlign:
              'center',

            marginTop:
              '16px'
          }}

          onClick={
            onOpenAccount
          }

        >
          Sign In / Create Account
        </button>

      </section>


      {/* =====================================
          PREVIEW NAVIGATION
      ===================================== */}

      <section
        className="panel"

        style={{
          marginTop:
            '16px'
        }}
      >

        <div
          style={{
            display:
              'grid',

            gridTemplateColumns:
              'repeat(2, minmax(0, 1fr))',

            gap:
              '8px'
          }}
        >

          <button

            type="button"

            className={
              tab ===
                'overview'
                ? 'filter active'
                : 'filter'
            }

            style={
              tabButtonStyle
            }

            onClick={() =>
              setTab(
                'overview'
              )
            }

          >
            Overview
          </button>


          <button

            type="button"

            className={
              tab ===
                'syllabus'
                ? 'filter active'
                : 'filter'
            }

            style={
              tabButtonStyle
            }

            onClick={() =>
              setTab(
                'syllabus'
              )
            }

          >
            UPSC Syllabus
          </button>


          <button

            type="button"

            className={
              tab ===
                'prelims'
                ? 'filter active'
                : 'filter'
            }

            style={
              tabButtonStyle
            }

            onClick={() =>
              setTab(
                'prelims'
              )
            }

          >
            Prelims PYQ
          </button>


          <button

            type="button"

            className={
              tab ===
                'mains'
                ? 'filter active'
                : 'filter'
            }

            style={
              tabButtonStyle
            }

            onClick={() =>
              setTab(
                'mains'
              )
            }

          >
            Mains PYQ
          </button>

        </div>

      </section>


      {/* =====================================
          OVERVIEW
      ===================================== */}

      {tab ===
        'overview' && (

        <>

          <section
            className="panel"

            style={{
              marginTop:
                '16px'
            }}
          >

            <span
              className="eyebrow"
            >
              FREE PREVIEW
            </span>


            <h3>
              Available without an account
            </h3>


            <div
              style={{
                display:
                  'grid',

                gap:
                  '10px',

                marginTop:
                  '14px'
              }}
            >

              <div>
                ✓ Complete UPSC syllabus
              </div>

              <div>
                ✓ Latest 10 years UPSC Prelims PYQs
              </div>

              <div>
                ✓ Latest 10 years UPSC Mains PYQs
              </div>

              <div>
                ✓ Question, year, paper and subject information
              </div>

            </div>

          </section>


          <section
            className="panel"

            style={{
              marginTop:
                '16px'
            }}
          >

            <span
              className="eyebrow"
            >
              SERIOUS LEARNER
            </span>


            <h3>
              Full preparation workspace
            </h3>


            <p>
              Students who complete Study Access
              activation can unlock the complete
              preparation system.
            </p>


            <div
              style={{
                display:
                  'grid',

                gap:
                  '9px',

                marginTop:
                  '14px'
              }}
            >

              <div>
                🔒 Complete available UPSC PYQ archive
              </div>

              <div>
                🔒 State PSC previous year papers
              </div>

              <div>
                🔒 Current Affairs
              </div>

              <div>
                🔒 Full question bank and explanations
              </div>

              <div>
                🔒 Prelims test series
              </div>

              <div>
                🔒 Mains answer writing
              </div>

              <div>
                🔒 Personal notes and revision tools
              </div>

              <div>
                🔒 Progress and performance tracking
              </div>

            </div>


            <button

              type="button"

              className="primary-btn"

              style={{
                width:
                  '100%',

                display:
                  'flex',

                justifyContent:
                  'center',

                alignItems:
                  'center',

                textAlign:
                  'center',

                marginTop:
                  '18px'
              }}

              onClick={
                onOpenAccount
              }

            >
              Create My Study Account
            </button>

          </section>

        </>

      )}


      {/* =====================================
          SYLLABUS
      ===================================== */}

      {tab ===
        'syllabus' && (

        <section
          className="panel"

          style={{
            marginTop:
              '16px'
          }}
        >

          <span
            className="eyebrow"
          >
            UPSC SYLLABUS
          </span>


          <h3>
            Civil Services Examination
          </h3>


          <div
            style={{
              display:
                'grid',

              gridTemplateColumns:
                'repeat(2, minmax(0, 1fr))',

              gap:
                '8px',

              marginTop:
                '14px'
            }}
          >

            <button

              type="button"

              className={
                syllabusStage ===
                  'prelims'
                  ? 'filter active'
                  : 'filter'
              }

              onClick={() =>
                setSyllabusStage(
                  'prelims'
                )
              }

            >
              Prelims
            </button>


            <button

              type="button"

              className={
                syllabusStage ===
                  'mains'
                  ? 'filter active'
                  : 'filter'
              }

              onClick={() =>
                setSyllabusStage(
                  'mains'
                )
              }

            >
              Mains
            </button>

          </div>


          {syllabusLoading && (

            <p
              style={{
                marginTop:
                  '16px'
              }}
            >
              Loading syllabus…
            </p>

          )}


          {syllabusError && (

            <div
              role="alert"

              style={{
                marginTop:
                  '16px',

                padding:
                  '12px',

                borderRadius:
                  '12px',

                background:
                  'rgba(220, 38, 38, 0.10)'
              }}
            >
              {syllabusError}
            </div>

          )}


          {!syllabusLoading &&
            !syllabusError &&
            syllabusSubjects.length ===
              0 && (

            <p
              style={{
                marginTop:
                  '16px'
              }}
            >
              Syllabus information has not been
              published yet.
            </p>

          )}


          {!syllabusLoading &&
            syllabusSubjects.map(
              subject => {

                const rows =
                  syllabusForStage
                    .filter(
                      item =>
                        item.subject ===
                        subject
                    )
                    .sort(
                      (
                        first,
                        second
                      ) =>
                        first.sort_order -
                        second.sort_order
                    );


                return (

                  <div

                    key={
                      subject
                    }

                    style={{
                      marginTop:
                        '18px',

                      paddingTop:
                        '14px',

                      borderTop:
                        '1px solid rgba(255,255,255,.08)'
                    }}

                  >

                    <h4
                      style={{
                        margin:
                          '0 0 10px'
                      }}
                    >
                      {subject}
                    </h4>


                    <div
                      style={{
                        display:
                          'grid',

                        gap:
                          '7px'
                      }}
                    >

                      {rows.map(
                        item => {

                          const depth =
                            topicDepth(
                              item
                            );


                          return (

                            <div

                              key={
                                item.id
                              }

                              style={{

                                padding:
                                  '10px 12px',

                                paddingLeft:
                                  `${12 + depth * 18}px`,

                                borderRadius:
                                  '10px',

                                background:
                                  depth === 0
                                    ? 'rgba(255,255,255,.05)'
                                    : 'rgba(255,255,255,.025)'

                              }}

                            >

                              <strong>
                                {item.topic}
                              </strong>


                              {item.paper && (

                                <small
                                  style={{
                                    display:
                                      'block',

                                    marginTop:
                                      '4px',

                                    opacity:
                                      0.75
                                  }}
                                >
                                  {item.paper}
                                </small>

                              )}

                            </div>

                          );
                        }
                      )}

                    </div>

                  </div>

                );
              }
            )}

        </section>

      )}


      {/* =====================================
          PRELIMS PYQ
      ===================================== */}

      {tab ===
        'prelims' && (

        <section
          className="panel"

          style={{
            marginTop:
              '16px'
          }}
        >

          <span
            className="eyebrow"
          >
            UPSC PRELIMS PYQ
          </span>


          <h3>
            Latest 10-year public archive
          </h3>


          <label
            style={{
              display:
                'grid',

              gap:
                '6px',

              marginTop:
                '14px'
            }}
          >

            <strong>
              Select year
            </strong>


            <select

              value={
                selectedYear
              }

              onChange={
                event =>
                  setSelectedYear(
                    Number(
                      event.target.value
                    )
                  )
              }

              style={{
                width:
                  '100%',

                boxSizing:
                  'border-box'
              }}

            >

              {previewYears.map(
                year => (

                  <option
                    key={
                      year
                    }
                    value={
                      year
                    }
                  >
                    {year}
                  </option>

                )
              )}

            </select>

          </label>


          {pyqLoading && (

            <p
              style={{
                marginTop:
                  '16px'
              }}
            >
              Loading questions…
            </p>

          )}


          {pyqError && (

            <div
              role="alert"

              style={{
                marginTop:
                  '16px',

                padding:
                  '12px',

                borderRadius:
                  '12px',

                background:
                  'rgba(220, 38, 38, 0.10)'
              }}
            >
              {pyqError}
            </div>

          )}


          {!pyqLoading &&
            prelimsQuestions.length ===
              0 && (

            <p
              style={{
                marginTop:
                  '16px'
              }}
            >
              No published UPSC Prelims questions
              are available for {selectedYear} yet.
            </p>

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

            {prelimsQuestions.map(
              (
                item,
                index
              ) => {

                const options =
                  optionList(
                    item.options
                  );


                return (

                  <article

                    key={
                      item.id
                    }

                    style={{
                      padding:
                        '14px',

                      border:
                        '1px solid rgba(255,255,255,.08)',

                      borderRadius:
                        '14px'
                    }}

                  >

                    <small>
                      Question {index + 1}

                      {' · '}

                      {item.year ||
                        selectedYear}

                      {item.subject
                        ? ` · ${item.subject}`
                        : ''}
                    </small>


                    <p
                      style={{
                        marginTop:
                          '10px',

                        fontWeight:
                          700
                      }}
                    >
                      {item.question}
                    </p>


                    {options.length >
                      0 && (

                      <div
                        style={{
                          display:
                            'grid',

                          gap:
                            '7px',

                          marginTop:
                            '10px'
                        }}
                      >

                        {options.map(
                          (
                            option,
                            optionIndex
                          ) => (

                            <div
                              key={
                                `${item.id}-${optionIndex}`
                              }

                              style={{
                                padding:
                                  '9px 11px',

                                borderRadius:
                                  '10px',

                                background:
                                  'rgba(255,255,255,.04)'
                              }}
                            >

                              {String.fromCharCode(
                                65 +
                                optionIndex
                              )}
                              .{' '}
                              {option}

                            </div>

                          )
                        )}

                      </div>

                    )}


                    {(item.topic ||
                      item.paper) && (

                      <small
                        style={{
                          display:
                            'block',

                          marginTop:
                            '10px',

                          opacity:
                            0.8
                        }}
                      >

                        {[
                          item.paper,
                          item.topic
                        ]
                          .filter(
                            Boolean
                          )
                          .join(
                            ' · '
                          )}

                      </small>

                    )}


                    {item.source_url && (

                      <a

                        href={
                          item.source_url
                        }

                        target="_blank"

                        rel="noreferrer"

                        style={{
                          display:
                            'inline-block',

                          marginTop:
                            '10px'
                        }}

                      >
                        Official source
                      </a>

                    )}

                  </article>

                );
              }
            )}

          </div>


          {prelimsQuestions.length >
            0 && (

            <div
              style={{
                marginTop:
                  '18px',

                padding:
                  '12px 14px',

                borderRadius:
                  '12px',

                background:
                  'rgba(245, 158, 11, 0.10)'
              }}
            >

              Correct answers, explanations,
              analytics and full practice tools
              are available after Serious Learner
              access is activated.

            </div>

          )}

        </section>

      )}


      {/* =====================================
          MAINS PYQ
      ===================================== */}

      {tab ===
        'mains' && (

        <section
          className="panel"

          style={{
            marginTop:
              '16px'
          }}
        >

          <span
            className="eyebrow"
          >
            UPSC MAINS PYQ
          </span>


          <h3>
            Latest 10-year public archive
          </h3>


          <label
            style={{
              display:
                'grid',

              gap:
                '6px',

              marginTop:
                '14px'
            }}
          >

            <strong>
              Select year
            </strong>


            <select

              value={
                selectedYear
              }

              onChange={
                event =>
                  setSelectedYear(
                    Number(
                      event.target.value
                    )
                  )
              }

              style={{
                width:
                  '100%',

                boxSizing:
                  'border-box'
              }}

            >

              {previewYears.map(
                year => (

                  <option
                    key={
                      year
                    }
                    value={
                      year
                    }
                  >
                    {year}
                  </option>

                )
              )}

            </select>

          </label>


          {pyqLoading && (

            <p
              style={{
                marginTop:
                  '16px'
              }}
            >
              Loading questions…
            </p>

          )}


          {pyqError && (

            <div
              role="alert"

              style={{
                marginTop:
                  '16px',

                padding:
                  '12px',

                borderRadius:
                  '12px',

                background:
                  'rgba(220, 38, 38, 0.10)'
              }}
            >
              {pyqError}
            </div>

          )}


          {!pyqLoading &&
            mainsQuestions.length ===
              0 && (

            <p
              style={{
                marginTop:
                  '16px'
              }}
            >
              No published UPSC Mains questions
              are available for {selectedYear} yet.
            </p>

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

            {mainsQuestions.map(
              (
                item,
                index
              ) => (

                <article

                  key={
                    item.id
                  }

                  style={{
                    padding:
                      '14px',

                    border:
                      '1px solid rgba(255,255,255,.08)',

                    borderRadius:
                      '14px'
                  }}

                >

                  <small>

                    {item.question_number
                      ? `Q.${item.question_number}`
                      : `Question ${index + 1}`}

                    {' · '}

                    {item.year ||
                      selectedYear}

                    {item.paper_name
                      ? ` · ${item.paper_name}`
                      : item.gs_paper
                      ? ` · ${item.gs_paper}`
                      : ''}

                  </small>


                  <p
                    style={{
                      marginTop:
                        '10px',

                      fontWeight:
                        700
                    }}
                  >
                    {item.question}
                  </p>


                  <small
                    style={{
                      display:
                        'block',

                      marginTop:
                        '8px',

                      opacity:
                        0.8
                    }}
                  >

                    {[
                      item.subject,
                      item.topic,
                      item.subtopic
                    ]
                      .filter(
                        Boolean
                      )
                      .join(
                        ' · '
                      )}

                  </small>


                  {(item.marks !==
                      null ||
                    item.word_limit !==
                      null) && (

                    <small
                      style={{
                        display:
                          'block',

                        marginTop:
                          '8px'
                      }}
                    >

                      {item.marks !==
                        null
                        ? `${item.marks} marks`
                        : ''}

                      {item.marks !==
                        null &&
                      item.word_limit !==
                        null
                        ? ' · '
                        : ''}

                      {item.word_limit !==
                        null
                        ? `${item.word_limit} words`
                        : ''}

                    </small>

                  )}


                  {item.source_url && (

                    <a

                      href={
                        item.source_url
                      }

                      target="_blank"

                      rel="noreferrer"

                      style={{
                        display:
                          'inline-block',

                        marginTop:
                          '10px'
                      }}

                    >
                      Official source
                    </a>

                  )}

                </article>

              )
            )}

          </div>


          {mainsQuestions.length >
            0 && (

            <div
              style={{
                marginTop:
                  '18px',

                padding:
                  '12px 14px',

                borderRadius:
                  '12px',

                background:
                  'rgba(245, 158, 11, 0.10)'
              }}
            >

              Answer writing, model frameworks,
              evaluation and the complete PYQ archive
              are available after Serious Learner
              access is activated.

            </div>

          )}

        </section>

      )}


      {/* =====================================
          BOTTOM ACCOUNT ACTION
      ===================================== */}

      <section
        className="panel"

        style={{
          marginTop:
            '18px',

          marginBottom:
            '20px',

          textAlign:
            'center'
        }}
      >

        <strong>
          Ready to start serious preparation?
        </strong>


        <p>
          Create your free study account and
          complete Study Access activation.
        </p>


        <button

          type="button"

          className="primary-btn"

          style={{
            width:
              '100%',

            display:
              'flex',

            alignItems:
              'center',

            justifyContent:
              'center',

            textAlign:
              'center'
          }}

          onClick={
            onOpenAccount
          }

        >
          Sign In / Create Account
        </button>

      </section>

    </div>

  );
}

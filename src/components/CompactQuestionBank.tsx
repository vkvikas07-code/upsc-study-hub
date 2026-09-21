import {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


type QuestionStatus =
  | 'draft'
  | 'published'
  | 'archived';


type Difficulty =
  | 'easy'
  | 'medium'
  | 'hard';


type QuestionRow = {
  id: string;

  question: string;

  options: string[];

  correct_index: number;

  explanation: string;

  subject: string;

  difficulty: Difficulty;

  exam_stage:
    | 'prelims'
    | 'mains';

  paper: string | null;

  topic: string | null;

  tags: string[];

  is_pyq: boolean;

  pyq_year: number | null;

  upsc_exam_name: string | null;

  upsc_exam_cycle: string | null;

  upsc_exam_stage: string | null;

  upsc_exam_paper: string | null;

  upsc_exam_year: number | null;

  state_psc_state: string | null;

  state_psc_name: string | null;

  state_psc_exam_name: string | null;

  state_psc_year: number | null;

  state_psc_stage: string | null;

  state_psc_paper: string | null;

  source: string | null;

  source_url: string | null;

  status: QuestionStatus;

  created_at: string;

  updated_at: string;
};


type OriginFilter =
  | 'all'
  | 'cse'
  | 'upsc'
  | 'state';


type TypeFilter =
  | 'all'
  | 'practice'
  | 'pyq';


const PAGE_SIZE =
  25;


const QUESTION_SELECT = `
  id,
  question,
  options,
  correct_index,
  explanation,
  subject,
  difficulty,
  exam_stage,
  paper,
  topic,
  tags,
  is_pyq,
  pyq_year,
  upsc_exam_name,
  upsc_exam_cycle,
  upsc_exam_stage,
  upsc_exam_paper,
  upsc_exam_year,
  state_psc_state,
  state_psc_name,
  state_psc_exam_name,
  state_psc_year,
  state_psc_stage,
  state_psc_paper,
  source,
  source_url,
  status,
  created_at,
  updated_at
`;


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


function getOrigin(
  item: QuestionRow
):
  | 'cse'
  | 'upsc'
  | 'state' {

  if (
    item.state_psc_state ||
    item.state_psc_name ||
    item.state_psc_exam_name
  ) {

    return 'state';
  }


  if (
    item.upsc_exam_name
  ) {

    return 'upsc';
  }


  return 'cse';
}


function originLabel(
  item: QuestionRow
): string {

  const origin =
    getOrigin(item);


  if (
    origin ===
    'state'
  ) {

    return (
      item.state_psc_name ||
      item.state_psc_state ||
      'State PSC'
    );
  }


  if (
    origin ===
    'upsc'
  ) {

    return (
      item.upsc_exam_name ||
      'UPSC'
    );
  }


  return 'CSE / General';
}


function displayDate(
  value: string
): string {

  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return '';
  }


  return date
    .toLocaleDateString(
      undefined,
      {
        day:
          '2-digit',

        month:
          'short',

        year:
          'numeric'
      }
    );
}


export function CompactQuestionBank() {

  const [
    questions,
    setQuestions
  ] =
    useState<QuestionRow[]>(
      []
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


  /* =======================================================
     FILTERS
  ======================================================= */

  const [
    search,
    setSearch
  ] =
    useState(
      ''
    );


  const [
    subjectFilter,
    setSubjectFilter
  ] =
    useState(
      'all'
    );


  const [
    statusFilter,
    setStatusFilter
  ] =
    useState<
      'all' |
      QuestionStatus
    >(
      'all'
    );


  const [
    difficultyFilter,
    setDifficultyFilter
  ] =
    useState<
      'all' |
      Difficulty
    >(
      'all'
    );


  const [
    originFilter,
    setOriginFilter
  ] =
    useState<OriginFilter>(
      'all'
    );


  const [
    typeFilter,
    setTypeFilter
  ] =
    useState<TypeFilter>(
      'all'
    );


  const [
    filtersOpen,
    setFiltersOpen
  ] =
    useState(
      false
    );


  const [
    page,
    setPage
  ] =
    useState(
      1
    );


  /* =======================================================
     LOAD QUESTIONS
  ======================================================= */

  async function loadQuestions():
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
          'questions'
        )
        .select(
          QUESTION_SELECT
        )
        .eq(
          'exam_stage',
          'prelims'
        )
        .order(
          'created_at',
          {
            ascending:
              false
          }
        )
        .limit(
          500
        );


    if (
      error
    ) {

      console.error(
        'Unable to load question bank:',
        error
      );


      setQuestions(
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


    const rows:
      QuestionRow[] =
      (
        data ||
        []
      )
        .map(
          item => ({

            ...item,

            options:
              safeStringArray(
                item.options
              ),

            tags:
              safeStringArray(
                item.tags
              )

          })
        ) as
        QuestionRow[];


    setQuestions(
      rows
    );


    setLoading(
      false
    );
  }


  useEffect(
    () => {

      void loadQuestions();

    },
    []
  );


  /* =======================================================
     FILTER OPTIONS
  ======================================================= */

  const subjects =
    useMemo(
      () =>

        Array
          .from(
            new Set(
              questions
                .map(
                  item =>
                    item.subject
                )
                .filter(
                  Boolean
                )
            )
          )
          .sort(),

      [
        questions
      ]
    );


  /* =======================================================
     FILTERED QUESTIONS
  ======================================================= */

  const filteredQuestions =
    useMemo(
      () => {

        const query =
          search
            .trim()
            .toLowerCase();


        return questions.filter(
          item => {

            if (
              subjectFilter !==
                'all' &&
              item.subject !==
                subjectFilter
            ) {

              return false;
            }


            if (
              statusFilter !==
                'all' &&
              item.status !==
                statusFilter
            ) {

              return false;
            }


            if (
              difficultyFilter !==
                'all' &&
              item.difficulty !==
                difficultyFilter
            ) {

              return false;
            }


            if (
              originFilter !==
                'all' &&
              getOrigin(item) !==
                originFilter
            ) {

              return false;
            }


            if (
              typeFilter ===
                'pyq' &&
              !item.is_pyq
            ) {

              return false;
            }


            if (
              typeFilter ===
                'practice' &&
              item.is_pyq
            ) {

              return false;
            }


            if (
              !query
            ) {

              return true;
            }


            const searchable =
              [
                item.question,
                item.subject,
                item.topic || '',
                item.paper || '',
                item.source || '',
                item.pyq_year || '',
                item.upsc_exam_name || '',
                item.state_psc_state || '',
                item.state_psc_name || '',
                item.state_psc_exam_name || '',
                ...(item.tags || [])
              ]
                .join(
                  ' '
                )
                .toLowerCase();


            return searchable
              .includes(
                query
              );
          }
        );

      },
      [
        questions,
        search,
        subjectFilter,
        statusFilter,
        difficultyFilter,
        originFilter,
        typeFilter
      ]
    );


  /* =======================================================
     PAGINATION
  ======================================================= */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredQuestions.length /
        PAGE_SIZE
      )
    );


  const safePage =
    Math.min(
      page,
      totalPages
    );


  const pageQuestions =
    filteredQuestions.slice(
      (
        safePage -
        1
      ) *
      PAGE_SIZE,

      safePage *
      PAGE_SIZE
    );


  useEffect(
    () => {

      setPage(
        1
      );

    },
    [
      search,
      subjectFilter,
      statusFilter,
      difficultyFilter,
      originFilter,
      typeFilter
    ]
  );


  /* =======================================================
     COUNTS
  ======================================================= */

  const publishedCount =
    questions.filter(
      item =>
        item.status ===
        'published'
    ).length;


  const draftCount =
    questions.filter(
      item =>
        item.status ===
        'draft'
    ).length;


  const pyqCount =
    questions.filter(
      item =>
        item.is_pyq
    ).length;


  /* =======================================================
     STATUS CHANGE
  ======================================================= */

  async function changeStatus(
    item: QuestionRow,
    nextStatus:
      QuestionStatus
  ):
    Promise<void> {

    if (
      !supabase
    ) {
      return;
    }


    setWorkingId(
      item.id
    );


    const {
      error
    } =
      await supabase
        .from(
          'questions'
        )
        .update({
          status:
            nextStatus,

          updated_at:
            new Date()
              .toISOString()
        })
        .eq(
          'id',
          item.id
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


    setQuestions(
      current =>
        current.map(
          row =>
            row.id ===
              item.id
              ? {
                  ...row,

                  status:
                    nextStatus
                }
              : row
        )
    );


    setWorkingId(
      null
    );
  }


  /* =======================================================
     DELETE
  ======================================================= */

  async function deleteQuestion(
    item: QuestionRow
  ):
    Promise<void> {

    if (
      !supabase
    ) {
      return;
    }


    const confirmed =
      window.confirm(
        'Delete this question permanently?'
      );


    if (
      !confirmed
    ) {
      return;
    }


    setWorkingId(
      item.id
    );


    const {
      error
    } =
      await supabase
        .from(
          'questions'
        )
        .delete()
        .eq(
          'id',
          item.id
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


    setQuestions(
      current =>
        current.filter(
          row =>
            row.id !==
            item.id
        )
    );


    setWorkingId(
      null
    );
  }


  /* =======================================================
     CLEAR FILTERS
  ======================================================= */

  function clearFilters():
    void {

    setSearch(
      ''
    );

    setSubjectFilter(
      'all'
    );

    setStatusFilter(
      'all'
    );

    setDifficultyFilter(
      'all'
    );

    setOriginFilter(
      'all'
    );

    setTypeFilter(
      'all'
    );

    setPage(
      1
    );
  }


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
            QUESTION BANK
          </span>


          <h2
            style={{
              margin:
                '5px 0'
            }}
          >
            Prelims MCQ Bank
          </h2>


          <small
            style={{
              color:
                '#94a3b8'
            }}
          >
            Search and manage questions without
            opening the full editor.
          </small>

        </div>


        <button
          type="button"
          className="secondary-btn"
          onClick={() =>
            void loadQuestions()
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
          <small>Total</small>

          <strong
            style={{
              display:
                'block'
            }}
          >
            {
              questions.length
            }
          </strong>
        </div>


        <div className="callout">
          <small>Published</small>

          <strong
            style={{
              display:
                'block'
            }}
          >
            {
              publishedCount
            }
          </strong>
        </div>


        <div className="callout">
          <small>Draft</small>

          <strong
            style={{
              display:
                'block'
            }}
          >
            {
              draftCount
            }
          </strong>
        </div>


        <div className="callout">
          <small>PYQ</small>

          <strong
            style={{
              display:
                'block'
            }}
          >
            {
              pyqCount
            }
          </strong>
        </div>

      </div>


      {/* SEARCH */}

      <div
        style={{
          display:
            'grid',

          gridTemplateColumns:
            'minmax(220px, 1fr) auto',

          gap:
            '8px',

          marginTop:
            '12px'
        }}
      >

        <input
          type="search"
          value={
            search
          }
          onChange={
            event =>
              setSearch(
                event.target.value
              )
          }
          placeholder="Search question, topic, source, year..."
        />


        <button
          type="button"
          className="secondary-btn"
          onClick={() =>
            setFiltersOpen(
              current =>
                !current
            )
          }
        >
          {
            filtersOpen
              ? 'Hide Filters'
              : 'Filters'
          }
        </button>

      </div>


      {/* FILTERS */}

      {
        filtersOpen && (

          <div
            style={{
              display:
                'grid',

              gridTemplateColumns:
                'repeat(auto-fit, minmax(150px, 1fr))',

              gap:
                '8px',

              marginTop:
                '10px',

              padding:
                '10px',

              border:
                '1px solid rgba(255,255,255,.08)',

              borderRadius:
                '12px'
            }}
          >

            <label>

              Origin

              <select
                value={
                  originFilter
                }
                onChange={
                  event =>
                    setOriginFilter(
                      event.target
                        .value as
                        OriginFilter
                    )
                }
              >
                <option value="all">
                  All Origins
                </option>

                <option value="cse">
                  CSE / General
                </option>

                <option value="upsc">
                  Other UPSC
                </option>

                <option value="state">
                  State PSC
                </option>
              </select>

            </label>


            <label>

              Subject

              <select
                value={
                  subjectFilter
                }
                onChange={
                  event =>
                    setSubjectFilter(
                      event.target.value
                    )
                }
              >
                <option value="all">
                  All Subjects
                </option>

                {
                  subjects.map(
                    item => (

                      <option
                        key={
                          item
                        }
                        value={
                          item
                        }
                      >
                        {item}
                      </option>

                    )
                  )
                }
              </select>

            </label>


            <label>

              Status

              <select
                value={
                  statusFilter
                }
                onChange={
                  event =>
                    setStatusFilter(
                      event.target
                        .value as
                        | 'all'
                        | QuestionStatus
                    )
                }
              >
                <option value="all">
                  All Status
                </option>

                <option value="published">
                  Published
                </option>

                <option value="draft">
                  Draft
                </option>

                <option value="archived">
                  Archived
                </option>
              </select>

            </label>


            <label>

              Difficulty

              <select
                value={
                  difficultyFilter
                }
                onChange={
                  event =>
                    setDifficultyFilter(
                      event.target
                        .value as
                        | 'all'
                        | Difficulty
                    )
                }
              >
                <option value="all">
                  All Difficulty
                </option>

                <option value="easy">
                  Easy
                </option>

                <option value="medium">
                  Medium
                </option>

                <option value="hard">
                  Hard
                </option>
              </select>

            </label>


            <label>

              Type

              <select
                value={
                  typeFilter
                }
                onChange={
                  event =>
                    setTypeFilter(
                      event.target
                        .value as
                        TypeFilter
                    )
                }
              >
                <option value="all">
                  All Questions
                </option>

                <option value="practice">
                  Practice
                </option>

                <option value="pyq">
                  PYQ
                </option>
              </select>

            </label>


            <button
              type="button"
              className="secondary-btn"
              style={{
                alignSelf:
                  'end'
              }}
              onClick={
                clearFilters
              }
            >
              Clear
            </button>

          </div>

        )
      }


      {/* STATUS */}

      {
        message && (

          <div
            className="callout"
            style={{
              marginTop:
                '10px'
            }}
          >
            {message}
          </div>

        )
      }


      {
        loading && (

          <p>
            Loading questions...
          </p>

        )
      }


      {
        !loading && (

          <div
            style={{
              display:
                'flex',

              justifyContent:
                'space-between',

              gap:
                '10px',

              flexWrap:
                'wrap',

              marginTop:
                '12px'
            }}
          >

            <small
              style={{
                color:
                  '#94a3b8'
              }}
            >
              Showing {
                pageQuestions.length
              } of {
                filteredQuestions.length
              } matching questions
            </small>


            <small
              style={{
                color:
                  '#94a3b8'
              }}
            >
              Page {
                safePage
              } of {
                totalPages
              }
            </small>

          </div>

        )
      }


      {/* QUESTIONS */}

      {
        !loading &&
        pageQuestions.length ===
          0 && (

          <div
            className="callout"
            style={{
              marginTop:
                '12px'
            }}
          >
            No questions match the
            selected filters.
          </div>

        )
      }


      <div
        style={{
          display:
            'grid',

          gap:
            '8px',

          marginTop:
            '10px'
        }}
      >

        {
          pageQuestions.map(
            item => (

              <article
                key={
                  item.id
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

                      <span className="tag">
                        {item.subject}
                      </span>

                      <span className="tag">
                        {item.difficulty}
                      </span>

                      <span className="tag">
                        {item.status}
                      </span>

                      {
                        item.is_pyq && (

                          <span className="tag">
                            PYQ {
                              item.pyq_year ||
                              ''
                            }
                          </span>

                        )
                      }

                      <span className="tag">
                        {
                          originLabel(
                            item
                          )
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
                      {item.question}
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

                      {
                        item.topic ||
                        'No topic'
                      }

                      {' • '}

                      Answer {
                        String.fromCharCode(
                          65 +
                          item.correct_index
                        )
                      }

                      {
                        item.source
                          ? ` • ${item.source}`
                          : ''
                      }

                      {
                        item.created_at
                          ? ` • ${displayDate(
                              item.created_at
                            )}`
                          : ''
                      }

                    </small>

                  </div>


                  <div
                    style={{
                      display:
                        'flex',

                      gap:
                        '6px',

                      flexWrap:
                        'wrap',

                      justifyContent:
                        'flex-end'
                    }}
                  >

                    {
                      item.status !==
                        'published' && (

                        <button
                          type="button"
                          className="secondary-btn"
                          disabled={
                            workingId ===
                            item.id
                          }
                          onClick={() =>
                            void changeStatus(
                              item,
                              'published'
                            )
                          }
                        >
                          Publish
                        </button>

                      )
                    }


                    {
                      item.status !==
                        'draft' && (

                        <button
                          type="button"
                          className="secondary-btn"
                          disabled={
                            workingId ===
                            item.id
                          }
                          onClick={() =>
                            void changeStatus(
                              item,
                              'draft'
                            )
                          }
                        >
                          Draft
                        </button>

                      )
                    }


                    {
                      item.status !==
                        'archived' && (

                        <button
                          type="button"
                          className="secondary-btn"
                          disabled={
                            workingId ===
                            item.id
                          }
                          onClick={() =>
                            void changeStatus(
                              item,
                              'archived'
                            )
                          }
                        >
                          Archive
                        </button>

                      )
                    }


                    <button
                      type="button"
                      className="secondary-btn"
                      disabled={
                        workingId ===
                        item.id
                      }
                      onClick={() =>
                        void deleteQuestion(
                          item
                        )
                      }
                    >
                      Delete
                    </button>

                  </div>

                </div>

              </article>

            )
          )
        }

      </div>


      {/* PAGINATION */}

      {
        !loading &&
        totalPages >
          1 && (

          <div
            style={{
              display:
                'flex',

              justifyContent:
                'center',

              alignItems:
                'center',

              gap:
                '10px',

              marginTop:
                '14px'
            }}
          >

            <button
              type="button"
              className="secondary-btn"
              disabled={
                safePage <=
                1
              }
              onClick={() =>
                setPage(
                  current =>
                    Math.max(
                      1,
                      current -
                      1
                    )
                )
              }
            >
              Previous
            </button>


            <strong>
              {
                safePage
              }
              {' / '}
              {
                totalPages
              }
            </strong>


            <button
              type="button"
              className="secondary-btn"
              disabled={
                safePage >=
                totalPages
              }
              onClick={() =>
                setPage(
                  current =>
                    Math.min(
                      totalPages,
                      current +
                      1
                    )
                )
              }
            >
              Next
            </button>

          </div>

        )
      }

    </section>

  );
}


export default CompactQuestionBank;

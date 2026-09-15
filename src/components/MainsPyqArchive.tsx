import {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


type PaperType =
  | 'essay'
  | 'gs'
  | 'optional'
  | 'language'
  | 'other';


type ArchiveQuestion = {

  id:
    string;

  question:
    string;

  section_type:
    PaperType;

  exam_authority:
    string |
    null;

  exam_name:
    string |
    null;

  state_name:
    string |
    null;

  paper_name:
    string |
    null;

  gs_paper:
    string |
    null;

  optional_subject:
    string |
    null;

  optional_paper:
    string |
    null;

  subject:
    string;

  topic:
    string |
    null;

  subtopic:
    string |
    null;

  question_number:
    string |
    null;

  marks:
    number |
    null;

  word_limit:
    number |
    null;

  pyq_year:
    number |
    null;

  essay_section:
    string |
    null;

  relevant_gs_papers:
    string[];

  source:
    string |
    null;

  source_url:
    string |
    null;

  syllabus_link:
    string |
    null;

  directive:
    string |
    null;

  answer_framework:
    string |
    null;

  key_points:
    string |
    null;

  introduction_hint:
    string |
    null;

  conclusion_hint:
    string |
    null;

  created_at:
    string;
};


/*
 * Keep this exported type limited to GS + Optional.
 *
 * The existing Mains answer-writing workspace currently
 * supports these two types directly.
 *
 * Essay, Language and Other papers remain fully browsable.
 */
export type MainsPyqArchiveQuestion =
  Omit<
    ArchiveQuestion,
    'section_type'
  > & {

    section_type:
      | 'gs'
      | 'optional';
  };


type SourceMode =
  | 'all'
  | 'upsc'
  | 'state';


type BrowseMode =
  | 'paper'
  | 'subject'
  | 'subtopic';


type UpscPaperTab =
  | 'essay'
  | 'GS-I'
  | 'GS-II'
  | 'GS-III'
  | 'GS-IV'
  | 'optional';


const PYQ_SELECT = `
  id,
  question,
  section_type,
  exam_authority,
  exam_name,
  state_name,
  paper_name,
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
  relevant_gs_papers,
  source,
  source_url,
  syllabus_link,
  directive,
  answer_framework,
  key_points,
  introduction_hint,
  conclusion_hint,
  created_at
`;


function clean(
  value:
    string |
    null |
    undefined
) {

  return (
    value ||
    ''
  ).trim();
}


function authorityOf(
  item:
    ArchiveQuestion
) {

  return (
    clean(
      item.exam_authority
    ) ||
    'UPSC'
  );
}


function examNameOf(
  item:
    ArchiveQuestion
) {

  return (
    clean(
      item.exam_name
    ) ||
    (
      authorityOf(
        item
      ).toUpperCase() ===
        'UPSC'
        ? 'Civil Services Examination'
        : 'Examination'
    )
  );
}


function paperNameOf(
  item:
    ArchiveQuestion
) {

  if (
    clean(
      item.paper_name
    )
  ) {

    return clean(
      item.paper_name
    );
  }


  if (
    item.section_type ===
    'essay'
  ) {

    return 'Essay';
  }


  if (
    item.section_type ===
    'optional'
  ) {

    return [
      item.optional_subject,
      item.optional_paper
    ]
      .filter(
        Boolean
      )
      .join(
        ' '
      );
  }


  if (
    item.section_type ===
    'language'
  ) {

    return (
      item.subject ||
      'Language'
    );
  }


  return (
    item.gs_paper ||
    'General Studies'
  );
}


function isUpsc(
  item:
    ArchiveQuestion
) {

  return (
    authorityOf(
      item
    )
      .toUpperCase() ===
    'UPSC'
  );
}


function isAnswerable(
  item:
    ArchiveQuestion
):
  item is
    MainsPyqArchiveQuestion {

  return (
    item.section_type ===
      'gs' ||
    item.section_type ===
      'optional'
  );
}


export function MainsPyqArchive({
  onStartAnswerWriting
}: {

  onStartAnswerWriting?:
    (
      question:
        MainsPyqArchiveQuestion
    ) => void;

}) {

  const [
    questions,
    setQuestions
  ] =
    useState<
      ArchiveQuestion[]
    >(
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
    error,
    setError
  ] =
    useState('');


  /*
   * TOP LEVEL SOURCE
   */

  const [
    sourceMode,
    setSourceMode
  ] =
    useState<SourceMode>(
      'upsc'
    );


  /*
   * BROWSE STYLE
   */

  const [
    browseMode,
    setBrowseMode
  ] =
    useState<BrowseMode>(
      'paper'
    );


  /*
   * UPSC PAPER
   */

  const [
    upscPaperTab,
    setUpscPaperTab
  ] =
    useState<UpscPaperTab>(
      'GS-I'
    );


  /*
   * COMMON FILTERS
   */

  const [
    commissionFilter,
    setCommissionFilter
  ] =
    useState(
      'all'
    );


  const [
    stateFilter,
    setStateFilter
  ] =
    useState(
      'all'
    );


  const [
    examFilter,
    setExamFilter
  ] =
    useState(
      'all'
    );


  const [
    paperNameFilter,
    setPaperNameFilter
  ] =
    useState(
      'all'
    );


  const [
    yearFilter,
    setYearFilter
  ] =
    useState(
      'all'
    );


  const [
    optionalSubjectFilter,
    setOptionalSubjectFilter
  ] =
    useState(
      'all'
    );


  const [
    optionalPaperFilter,
    setOptionalPaperFilter
  ] =
    useState(
      'all'
    );


  const [
    subjectFilter,
    setSubjectFilter
  ] =
    useState(
      'all'
    );


  const [
    subtopicFilter,
    setSubtopicFilter
  ] =
    useState(
      'all'
    );


  const [
    searchText,
    setSearchText
  ] =
    useState('');


  /*
   * LOAD PUBLISHED PYQs
   */

  async function loadPyqs() {

    if (
      !supabase
    ) {

      setError(
        'PYQ database is not configured.'
      );

      setLoading(
        false
      );

      return;
    }


    setLoading(
      true
    );

    setError('');


    const {
      data,
      error:
        loadError
    } =
      await supabase
        .from(
          'mains_questions'
        )
        .select(
          PYQ_SELECT
        )
        .eq(
          'question_type',
          'pyq'
        )
        .eq(
          'status',
          'published'
        )
        .order(
          'pyq_year',
          {
            ascending:
              false
          }
        )
        .order(
          'created_at',
          {
            ascending:
              true
          }
        );


    if (
      loadError
    ) {

      setError(
        loadError.message
      );

      setLoading(
        false
      );

      return;
    }


    const formatted =
      (
        data ||
        []
      ).map(
        item => ({

          ...item,

          relevant_gs_papers:
            item
              .relevant_gs_papers ||
            []

        })
      ) as ArchiveQuestion[];


    setQuestions(
      formatted
    );

    setLoading(
      false
    );
  }


  useEffect(
    () => {

      void loadPyqs();

    },
    []
  );


  /*
   * RESET DEPENDENT FILTERS
   */

  useEffect(
    () => {

      setCommissionFilter(
        'all'
      );

      setStateFilter(
        'all'
      );

      setExamFilter(
        'all'
      );

      setPaperNameFilter(
        'all'
      );

      setOptionalSubjectFilter(
        'all'
      );

      setOptionalPaperFilter(
        'all'
      );

      setSubjectFilter(
        'all'
      );

      setSubtopicFilter(
        'all'
      );

    },
    [
      sourceMode
    ]
  );


  /*
   * SOURCE-SCOPED QUESTIONS
   */

  const sourceQuestions =
    useMemo(
      () => {

        if (
          sourceMode ===
          'upsc'
        ) {

          return questions.filter(
            item =>
              isUpsc(
                item
              )
          );
        }


        if (
          sourceMode ===
          'state'
        ) {

          return questions.filter(
            item =>
              !isUpsc(
                item
              )
          );
        }


        return questions;

      },
      [
        questions,
        sourceMode
      ]
    );


  /*
   * STATE COMMISSIONS
   */

  const commissions =
    useMemo(
      () => {

        return Array.from(
          new Set(
            questions
              .filter(
                item =>
                  !isUpsc(
                    item
                  )
              )
              .map(
                item =>
                  authorityOf(
                    item
                  )
              )
              .filter(
                Boolean
              )
          )
        ).sort();

      },
      [
        questions
      ]
    );


  /*
   * STATES
   */

  const states =
    useMemo(
      () => {

        return Array.from(
          new Set(
            sourceQuestions
              .filter(
                item => {

                  if (
                    commissionFilter !==
                      'all' &&
                    authorityOf(
                      item
                    ) !==
                      commissionFilter
                  ) {

                    return false;
                  }


                  return Boolean(
                    item.state_name
                  );
                }
              )
              .map(
                item =>
                  clean(
                    item.state_name
                  )
              )
              .filter(
                Boolean
              )
          )
        ).sort();

      },
      [
        sourceQuestions,
        commissionFilter
      ]
    );


  /*
   * EXAMINATIONS
   */

  const examinations =
    useMemo(
      () => {

        return Array.from(
          new Set(
            sourceQuestions
              .filter(
                item => {

                  if (
                    commissionFilter !==
                      'all' &&
                    authorityOf(
                      item
                    ) !==
                      commissionFilter
                  ) {

                    return false;
                  }


                  if (
                    stateFilter !==
                      'all' &&
                    clean(
                      item.state_name
                    ) !==
                      stateFilter
                  ) {

                    return false;
                  }


                  return true;
                }
              )
              .map(
                item =>
                  examNameOf(
                    item
                  )
              )
          )
        ).sort();

      },
      [
        sourceQuestions,
        commissionFilter,
        stateFilter
      ]
    );


  /*
   * YEARS
   */

  const years =
    useMemo(
      () => {

        return Array.from(
          new Set(
            sourceQuestions
              .map(
                item =>
                  item.pyq_year
              )
              .filter(
                (
                  value
                ):
                  value is number =>
                  typeof value ===
                    'number'
              )
          )
        ).sort(
          (
            first,
            second
          ) =>
            second -
            first
        );

      },
      [
        sourceQuestions
      ]
    );


  /*
   * PAPER NAMES
   */

  const paperNames =
    useMemo(
      () => {

        return Array.from(
          new Set(
            sourceQuestions
              .filter(
                item => {

                  if (
                    commissionFilter !==
                      'all' &&
                    authorityOf(
                      item
                    ) !==
                      commissionFilter
                  ) {

                    return false;
                  }


                  if (
                    stateFilter !==
                      'all' &&
                    clean(
                      item.state_name
                    ) !==
                      stateFilter
                  ) {

                    return false;
                  }


                  if (
                    examFilter !==
                      'all' &&
                    examNameOf(
                      item
                    ) !==
                      examFilter
                  ) {

                    return false;
                  }


                  return true;
                }
              )
              .map(
                item =>
                  paperNameOf(
                    item
                  )
              )
              .filter(
                Boolean
              )
          )
        ).sort();

      },
      [
        sourceQuestions,
        commissionFilter,
        stateFilter,
        examFilter
      ]
    );


  /*
   * OPTIONAL SUBJECTS
   */

  const optionalSubjects =
    useMemo(
      () => {

        return Array.from(
          new Set(
            sourceQuestions
              .filter(
                item =>
                  item.section_type ===
                  'optional'
              )
              .map(
                item =>
                  item.optional_subject
              )
              .filter(
                (
                  value
                ):
                  value is string =>
                  Boolean(
                    value
                  )
              )
          )
        ).sort();

      },
      [
        sourceQuestions
      ]
    );


  /*
   * SUBJECTS
   */

  const subjects =
    useMemo(
      () => {

        return Array.from(
          new Set(
            sourceQuestions
              .map(
                item =>
                  clean(
                    item.subject
                  )
              )
              .filter(
                Boolean
              )
          )
        ).sort();

      },
      [
        sourceQuestions
      ]
    );


  /*
   * SUBTOPICS
   */

  const subtopics =
    useMemo(
      () => {

        return Array.from(
          new Set(
            sourceQuestions
              .filter(
                item => {

                  if (
                    subjectFilter !==
                      'all' &&
                    item.subject !==
                      subjectFilter
                  ) {

                    return false;
                  }


                  return Boolean(
                    item.subtopic
                  );
                }
              )
              .map(
                item =>
                  item.subtopic
              )
              .filter(
                (
                  value
                ):
                  value is string =>
                  Boolean(
                    value
                  )
              )
          )
        ).sort();

      },
      [
        sourceQuestions,
        subjectFilter
      ]
    );


  /*
   * FILTER QUESTIONS
   */

  const filteredQuestions =
    useMemo(
      () => {

        const search =
          searchText
            .trim()
            .toLowerCase();


        return sourceQuestions.filter(
          item => {

            /*
             * STATE / COMMISSION
             */

            if (
              commissionFilter !==
                'all' &&
              authorityOf(
                item
              ) !==
                commissionFilter
            ) {

              return false;
            }


            if (
              stateFilter !==
                'all' &&
              clean(
                item.state_name
              ) !==
                stateFilter
            ) {

              return false;
            }


            if (
              examFilter !==
                'all' &&
              examNameOf(
                item
              ) !==
                examFilter
            ) {

              return false;
            }


            /*
             * YEAR
             */

            if (
              yearFilter !==
                'all' &&
              String(
                item.pyq_year
              ) !==
                yearFilter
            ) {

              return false;
            }


            /*
             * PAPER-WISE
             */

            if (
              browseMode ===
              'paper'
            ) {

              if (
                sourceMode ===
                'upsc'
              ) {

                if (
                  upscPaperTab ===
                  'essay'
                ) {

                  if (
                    item.section_type !==
                    'essay'
                  ) {

                    return false;
                  }

                } else if (
                  upscPaperTab ===
                  'optional'
                ) {

                  if (
                    item.section_type !==
                    'optional'
                  ) {

                    return false;
                  }


                  if (
                    optionalSubjectFilter !==
                      'all' &&
                    item.optional_subject !==
                      optionalSubjectFilter
                  ) {

                    return false;
                  }


                  if (
                    optionalPaperFilter !==
                      'all' &&
                    item.optional_paper !==
                      optionalPaperFilter
                  ) {

                    return false;
                  }

                } else {

                  if (
                    item.section_type !==
                      'gs' ||
                    item.gs_paper !==
                      upscPaperTab
                  ) {

                    return false;
                  }
                }

              } else if (
                paperNameFilter !==
                  'all' &&
                paperNameOf(
                  item
                ) !==
                  paperNameFilter
              ) {

                return false;
              }
            }


            /*
             * SUBJECT-WISE
             */

            if (
              browseMode ===
                'subject' &&
              subjectFilter !==
                'all' &&
              item.subject !==
                subjectFilter
            ) {

              return false;
            }


            /*
             * SUBTOPIC-WISE
             */

            if (
              browseMode ===
              'subtopic'
            ) {

              if (
                subjectFilter !==
                  'all' &&
                item.subject !==
                  subjectFilter
              ) {

                return false;
              }


              if (
                subtopicFilter !==
                  'all' &&
                item.subtopic !==
                  subtopicFilter
              ) {

                return false;
              }
            }


            /*
             * SEARCH
             */

            if (
              search
            ) {

              const searchable =
                [
                  authorityOf(
                    item
                  ),
                  examNameOf(
                    item
                  ),
                  item.state_name ||
                    '',
                  paperNameOf(
                    item
                  ),
                  item.question,
                  item.subject,
                  item.topic ||
                    '',
                  item.subtopic ||
                    '',
                  item.gs_paper ||
                    '',
                  item.optional_subject ||
                    '',
                  item.optional_paper ||
                    '',
                  item.question_number ||
                    '',
                  ...(item.relevant_gs_papers ||
                    [])
                ]
                  .join(
                    ' '
                  )
                  .toLowerCase();


              if (
                !searchable.includes(
                  search
                )
              ) {

                return false;
              }
            }


            return true;

          }
        );

      },
      [
        sourceQuestions,
        sourceMode,
        browseMode,
        commissionFilter,
        stateFilter,
        examFilter,
        yearFilter,
        paperNameFilter,
        upscPaperTab,
        optionalSubjectFilter,
        optionalPaperFilter,
        subjectFilter,
        subtopicFilter,
        searchText
      ]
    );


  /*
   * GROUP BY YEAR
   */

  const questionsByYear =
    useMemo(
      () => {

        const grouped =
          new Map<
            number,
            ArchiveQuestion[]
          >();


        filteredQuestions.forEach(
          item => {

            const year =
              item.pyq_year ||
              0;


            const current =
              grouped.get(
                year
              ) ||
              [];


            current.push(
              item
            );


            grouped.set(
              year,
              current
            );
          }
        );


        return Array.from(
          grouped.entries()
        ).sort(
          (
            first,
            second
          ) =>
            second[0] -
            first[0]
        );

      },
      [
        filteredQuestions
      ]
    );


  function clearFilters() {

    setCommissionFilter(
      'all'
    );

    setStateFilter(
      'all'
    );

    setExamFilter(
      'all'
    );

    setPaperNameFilter(
      'all'
    );

    setYearFilter(
      'all'
    );

    setOptionalSubjectFilter(
      'all'
    );

    setOptionalPaperFilter(
      'all'
    );

    setSubjectFilter(
      'all'
    );

    setSubtopicFilter(
      'all'
    );

    setSearchText('');
  }


  if (
    loading
  ) {

    return (

      <section
        className="panel"
      >
        Loading Previous Year Mains Papers...
      </section>

    );
  }


  if (
    error
  ) {

    return (

      <section
        className="panel"
      >

        <h3>
          Unable to load Previous Year Papers
        </h3>


        <p>
          {error}
        </p>


        <button
          type="button"
          className="primary-btn"
          onClick={() =>
            void loadPyqs()
          }
        >
          Try again
        </button>

      </section>

    );
  }


  return (

    <section
      style={{
        display:
          'grid',

        gap:
          '14px'
      }}
    >

      {/* =====================================
          SOURCE
      ===================================== */}

      <section
        className="panel"
      >

        <span
          className="eyebrow"
        >
          MAINS PYQ ARCHIVE
        </span>


        <h2>
          Previous Year Mains Papers
        </h2>


        <p>
          Browse UPSC Civil Services and State PSC
          previous-year Mains questions from one archive.
        </p>


        <div
          style={{
            display:
              'grid',

            gridTemplateColumns:
              'repeat(3, minmax(0, 1fr))',

            gap:
              '8px',

            marginTop:
              '14px'
          }}
        >

          <button
            type="button"
            className={
              sourceMode ===
                'upsc'
                ? 'filter active'
                : 'filter'
            }
            onClick={() =>
              setSourceMode(
                'upsc'
              )
            }
          >
            UPSC
          </button>


          <button
            type="button"
            className={
              sourceMode ===
                'state'
                ? 'filter active'
                : 'filter'
            }
            onClick={() =>
              setSourceMode(
                'state'
              )
            }
          >
            State PSC
          </button>


          <button
            type="button"
            className={
              sourceMode ===
                'all'
                ? 'filter active'
                : 'filter'
            }
            onClick={() =>
              setSourceMode(
                'all'
              )
            }
          >
            All
          </button>

        </div>

      </section>


      {/* =====================================
          BROWSE MODE
      ===================================== */}

      <section
        className="panel"
      >

        <strong>
          Browse by
        </strong>


        <div
          style={{
            display:
              'grid',

            gridTemplateColumns:
              'repeat(3, minmax(0, 1fr))',

            gap:
              '8px',

            marginTop:
              '10px'
          }}
        >

          <button
            type="button"
            className={
              browseMode ===
                'paper'
                ? 'filter active'
                : 'filter'
            }
            onClick={() =>
              setBrowseMode(
                'paper'
              )
            }
          >
            Paper-wise
          </button>


          <button
            type="button"
            className={
              browseMode ===
                'subject'
                ? 'filter active'
                : 'filter'
            }
            onClick={() =>
              setBrowseMode(
                'subject'
              )
            }
          >
            Subject-wise
          </button>


          <button
            type="button"
            className={
              browseMode ===
                'subtopic'
                ? 'filter active'
                : 'filter'
            }
            onClick={() =>
              setBrowseMode(
                'subtopic'
              )
            }
          >
            Subtopic-wise
          </button>

        </div>

      </section>


      {/* =====================================
          FILTERS
      ===================================== */}

      <section
        className="panel"
      >

        <div
          style={{
            display:
              'grid',

            gridTemplateColumns:
              'repeat(auto-fit, minmax(180px, 1fr))',

            gap:
              '10px'
          }}
        >

          {sourceMode ===
            'state' && (

            <label>

              Commission

              <select
                value={
                  commissionFilter
                }
                onChange={
                  event => {

                    setCommissionFilter(
                      event
                        .target
                        .value
                    );

                    setStateFilter(
                      'all'
                    );

                    setExamFilter(
                      'all'
                    );

                    setPaperNameFilter(
                      'all'
                    );
                  }
                }
              >

                <option value="all">
                  All State PSCs
                </option>


                {commissions.map(
                  commission => (

                    <option
                      key={
                        commission
                      }
                      value={
                        commission
                      }
                    >
                      {commission}
                    </option>

                  )
                )}

              </select>

            </label>

          )}


          {sourceMode ===
            'state' && (

            <label>

              State / UT

              <select
                value={
                  stateFilter
                }
                onChange={
                  event => {

                    setStateFilter(
                      event
                        .target
                        .value
                    );

                    setExamFilter(
                      'all'
                    );

                    setPaperNameFilter(
                      'all'
                    );
                  }
                }
              >

                <option value="all">
                  All States
                </option>


                {states.map(
                  state => (

                    <option
                      key={
                        state
                      }
                      value={
                        state
                      }
                    >
                      {state}
                    </option>

                  )
                )}

              </select>

            </label>

          )}


          {(sourceMode ===
              'state' ||
            sourceMode ===
              'all') && (

            <label>

              Examination

              <select
                value={
                  examFilter
                }
                onChange={
                  event => {

                    setExamFilter(
                      event
                        .target
                        .value
                    );

                    setPaperNameFilter(
                      'all'
                    );
                  }
                }
              >

                <option value="all">
                  All examinations
                </option>


                {examinations.map(
                  examination => (

                    <option
                      key={
                        examination
                      }
                      value={
                        examination
                      }
                    >
                      {examination}
                    </option>

                  )
                )}

              </select>

            </label>

          )}


          <label>

            Year

            <select
              value={
                yearFilter
              }
              onChange={
                event =>
                  setYearFilter(
                    event
                      .target
                      .value
                  )
              }
            >

              <option value="all">
                All years
              </option>


              {years.map(
                year => (

                  <option
                    key={
                      year
                    }
                    value={
                      String(
                        year
                      )
                    }
                  >
                    {year}
                  </option>

                )
              )}

            </select>

          </label>


          {browseMode ===
              'subject' && (

            <label>

              Subject

              <select
                value={
                  subjectFilter
                }
                onChange={
                  event =>
                    setSubjectFilter(
                      event
                        .target
                        .value
                    )
                }
              >

                <option value="all">
                  All subjects
                </option>


                {subjects.map(
                  subject => (

                    <option
                      key={
                        subject
                      }
                      value={
                        subject
                      }
                    >
                      {subject}
                    </option>

                  )
                )}

              </select>

            </label>

          )}


          {browseMode ===
              'subtopic' && (

            <label>

              Subject

              <select
                value={
                  subjectFilter
                }
                onChange={
                  event => {

                    setSubjectFilter(
                      event
                        .target
                        .value
                    );

                    setSubtopicFilter(
                      'all'
                    );
                  }
                }
              >

                <option value="all">
                  All subjects
                </option>


                {subjects.map(
                  subject => (

                    <option
                      key={
                        subject
                      }
                      value={
                        subject
                      }
                    >
                      {subject}
                    </option>

                  )
                )}

              </select>

            </label>

          )}


          {browseMode ===
              'subtopic' && (

            <label>

              Subtopic

              <select
                value={
                  subtopicFilter
                }
                onChange={
                  event =>
                    setSubtopicFilter(
                      event
                        .target
                        .value
                    )
                }
              >

                <option value="all">
                  All subtopics
                </option>


                {subtopics.map(
                  subtopic => (

                    <option
                      key={
                        subtopic
                      }
                      value={
                        subtopic
                      }
                    >
                      {subtopic}
                    </option>

                  )
                )}

              </select>

            </label>

          )}

        </div>


        {/* =====================================
            UPSC PAPER TABS
        ===================================== */}

        {browseMode ===
            'paper' &&
          sourceMode ===
            'upsc' && (

          <div
            style={{
              display:
                'grid',

              gridTemplateColumns:
                'repeat(auto-fit, minmax(95px, 1fr))',

              gap:
                '8px',

              marginTop:
                '14px'
            }}
          >

            {(
              [
                [
                  'essay',
                  'Essay'
                ],
                [
                  'GS-I',
                  'GS-I'
                ],
                [
                  'GS-II',
                  'GS-II'
                ],
                [
                  'GS-III',
                  'GS-III'
                ],
                [
                  'GS-IV',
                  'GS-IV'
                ],
                [
                  'optional',
                  'Optional'
                ]
              ] as Array<
                [
                  UpscPaperTab,
                  string
                ]
              >
            ).map(
              (
                [
                  value,
                  label
                ]
              ) => (

                <button
                  key={
                    value
                  }
                  type="button"
                  className={
                    upscPaperTab ===
                      value
                      ? 'filter active'
                      : 'filter'
                  }
                  onClick={() =>
                    setUpscPaperTab(
                      value
                    )
                  }
                >
                  {label}
                </button>

              )
            )}

          </div>

        )}


        {/* =====================================
            UPSC OPTIONAL FILTERS
        ===================================== */}

        {browseMode ===
            'paper' &&
          sourceMode ===
            'upsc' &&
          upscPaperTab ===
            'optional' && (

          <div
            style={{
              display:
                'grid',

              gridTemplateColumns:
                'repeat(auto-fit, minmax(180px, 1fr))',

              gap:
                '10px',

              marginTop:
                '12px'
            }}
          >

            <label>

              Optional Subject

              <select
                value={
                  optionalSubjectFilter
                }
                onChange={
                  event =>
                    setOptionalSubjectFilter(
                      event
                        .target
                        .value
                    )
                }
              >

                <option value="all">
                  All optionals
                </option>


                {optionalSubjects.map(
                  subject => (

                    <option
                      key={
                        subject
                      }
                      value={
                        subject
                      }
                    >
                      {subject}
                    </option>

                  )
                )}

              </select>

            </label>


            <label>

              Optional Paper

              <select
                value={
                  optionalPaperFilter
                }
                onChange={
                  event =>
                    setOptionalPaperFilter(
                      event
                        .target
                        .value
                    )
                }
              >

                <option value="all">
                  Both papers
                </option>

                <option value="Paper-I">
                  Paper-I
                </option>

                <option value="Paper-II">
                  Paper-II
                </option>

              </select>

            </label>

          </div>

        )}


        {/* =====================================
            STATE / ALL PAPER FILTER
        ===================================== */}

        {browseMode ===
            'paper' &&
          sourceMode !==
            'upsc' && (

          <div
            style={{
              marginTop:
                '12px'
            }}
          >

            <label>

              Paper

              <select
                value={
                  paperNameFilter
                }
                onChange={
                  event =>
                    setPaperNameFilter(
                      event
                        .target
                        .value
                    )
                }
              >

                <option value="all">
                  All papers
                </option>


                {paperNames.map(
                  paper => (

                    <option
                      key={
                        paper
                      }
                      value={
                        paper
                      }
                    >
                      {paper}
                    </option>

                  )
                )}

              </select>

            </label>

          </div>

        )}


        <div
          style={{
            display:
              'grid',

            gridTemplateColumns:
              '1fr auto',

            gap:
              '8px',

            marginTop:
              '14px'
          }}
        >

          <input
            value={
              searchText
            }
            onChange={
              event =>
                setSearchText(
                  event
                    .target
                    .value
                )
            }
            placeholder="Search question, topic, paper, commission..."
          />


          <button
            type="button"
            className="secondary-btn"
            onClick={
              clearFilters
            }
          >
            Clear
          </button>

        </div>

      </section>


      {/* =====================================
          RESULT SUMMARY
      ===================================== */}

      <section
        className="panel"
        style={{
          padding:
            '12px 16px'
        }}
      >

        <strong>
          {filteredQuestions.length}
          {' '}
          question
          {filteredQuestions.length ===
            1
            ? ''
            : 's'}
        </strong>

        {' '}

        <span
          style={{
            color:
              '#94a3b8'
          }}
        >
          found in the archive
        </span>

      </section>


      {/* =====================================
          QUESTIONS
      ===================================== */}

      {questionsByYear.map(
        (
          [
            year,
            yearQuestions
          ]
        ) => (

          <section
            key={
              year
            }
            className="panel"
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

                marginBottom:
                  '12px'
              }}
            >

              <h3
                style={{
                  margin:
                    0
                }}
              >
                {year ||
                  'Year not specified'}
              </h3>


              <span
                style={{
                  color:
                    '#94a3b8'
                }}
              >
                {yearQuestions.length}
                {' '}
                question
                {yearQuestions.length ===
                  1
                  ? ''
                  : 's'}
              </span>

            </div>


            <div
              style={{
                display:
                  'grid',

                gap:
                  '12px'
              }}
            >

              {yearQuestions.map(
                item => {

                  const authority =
                    authorityOf(
                      item
                    );


                  const exam =
                    examNameOf(
                      item
                    );


                  const paper =
                    paperNameOf(
                      item
                    );


                  const canWrite =
                    Boolean(
                      onStartAnswerWriting
                    ) &&
                    isAnswerable(
                      item
                    );


                  return (

                    <article
                      key={
                        item.id
                      }
                      style={{
                        padding:
                          '14px',

                        borderRadius:
                          '12px',

                        border:
                          '1px solid rgba(255,255,255,.08)',

                        background:
                          'rgba(255,255,255,.02)'
                      }}
                    >

                      <div
                        style={{
                          display:
                            'flex',

                          justifyContent:
                            'space-between',

                          gap:
                            '10px',

                          flexWrap:
                            'wrap'
                        }}
                      >

                        <strong>
                          {authority}
                          {' • '}
                          {paper}
                        </strong>


                        {item.question_number && (

                          <span>
                            Q.
                            {item.question_number}
                          </span>

                        )}

                      </div>


                      <div
                        style={{
                          marginTop:
                            '4px',

                          color:
                            '#94a3b8',

                          fontSize:
                            '.82rem'
                        }}
                      >

                        {exam}

                        {item.state_name
                          ? ` • ${item.state_name}`
                          : ''}

                      </div>


                      <p
                        style={{
                          margin:
                            '12px 0',

                          lineHeight:
                            1.6
                        }}
                      >
                        {item.question}
                      </p>


                      <div
                        style={{
                          display:
                            'flex',

                          gap:
                            '8px',

                          flexWrap:
                            'wrap',

                          color:
                            '#94a3b8',

                          fontSize:
                            '.82rem'
                        }}
                      >

                        <span>
                          Subject:
                          {' '}
                          {item.subject}
                        </span>


                        {item.topic && (

                          <span>
                            • Topic:
                            {' '}
                            {item.topic}
                          </span>

                        )}


                        {item.subtopic && (

                          <span>
                            • Subtopic:
                            {' '}
                            {item.subtopic}
                          </span>

                        )}


                        {item.marks !==
                          null && (

                          <span>
                            •
                            {' '}
                            {item.marks}
                            {' '}
                            marks
                          </span>

                        )}


                        {item.word_limit !==
                          null && (

                          <span>
                            •
                            {' '}
                            {item.word_limit}
                            {' '}
                            words
                          </span>

                        )}

                      </div>


                      {item.relevant_gs_papers
                        .length >
                        0 && (

                        <div
                          style={{
                            marginTop:
                              '8px',

                            fontSize:
                              '.82rem'
                          }}
                        >

                          <strong>
                            Relevant to UPSC:
                          </strong>

                          {' '}

                          {item
                            .relevant_gs_papers
                            .join(
                              ', '
                            )}

                        </div>

                      )}


                      <div
                        style={{
                          display:
                            'flex',

                          gap:
                            '8px',

                          flexWrap:
                            'wrap',

                          marginTop:
                            '14px'
                        }}
                      >

                        {canWrite && (

                          <button
                            type="button"
                            className="primary-btn"
                            onClick={() => {

                              if (
                                isAnswerable(
                                  item
                                )
                              ) {

                                onStartAnswerWriting?.(
                                  item
                                );
                              }

                            }}
                          >
                            Start Answer Writing
                          </button>

                        )}


                        {item.source_url && (

                          <a
                            href={
                              item.source_url
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="secondary-btn"
                            style={{
                              display:
                                'inline-flex',

                              alignItems:
                                'center',

                              textDecoration:
                                'none'
                            }}
                          >
                            Official Source
                          </a>

                        )}


                        {!canWrite &&
                          (
                            item.section_type ===
                              'essay' ||
                            item.section_type ===
                              'language' ||
                            item.section_type ===
                              'other'
                          ) && (

                          <span
                            style={{
                              alignSelf:
                                'center',

                              color:
                                '#94a3b8',

                              fontSize:
                                '.8rem'
                            }}
                          >
                            Browse-only paper
                          </span>

                        )}

                      </div>

                    </article>

                  );
                }
              )}

            </div>

          </section>

        )
      )}


      {filteredQuestions.length ===
        0 && (

        <section
          className="panel"
        >

          <h3>
            No previous-year questions found
          </h3>


          <p>
            Try changing the commission, examination,
            paper, year or search filters.
          </p>

        </section>

      )}

    </section>

  );
}

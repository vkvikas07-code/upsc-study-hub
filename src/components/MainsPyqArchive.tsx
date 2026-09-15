import {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


type BrowseMode =
  | 'paper'
  | 'subject'
  | 'subtopic';


type PaperTab =
  | 'essay'
  | 'GS-I'
  | 'GS-II'
  | 'GS-III'
  | 'GS-IV'
  | 'optional';


type PyqQuestion = {
  id: string;

  question: string;

  section_type:
    | 'essay'
    | 'gs'
    | 'optional';

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

  source_url:
    string |
    null;

  created_at:
    string;
};


const PYQ_SELECT = `
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
  relevant_gs_papers,
  source_url,
  created_at
`;


export function MainsPyqArchive() {

  const [
    questions,
    setQuestions
  ] =
    useState<
      PyqQuestion[]
    >([]);


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


  const [
    browseMode,
    setBrowseMode
  ] =
    useState<BrowseMode>(
      'paper'
    );


  const [
    paperTab,
    setPaperTab
  ] =
    useState<PaperTab>(
      'GS-I'
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


  async function loadPyqs() {

    if (!supabase) {

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
            item.relevant_gs_papers ||
            []
        })
      ) as
        PyqQuestion[];


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


  const years =
    useMemo(
      () => {

        return Array.from(
          new Set(
            questions
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
        questions
      ]
    );


  const subjects =
    useMemo(
      () => {

        return Array.from(
          new Set(
            questions
              .map(
                item =>
                  item.subject
                    .trim()
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


  const optionalSubjects =
    useMemo(
      () => {

        return Array.from(
          new Set(
            questions
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
        questions
      ]
    );


  const availableSubtopics =
    useMemo(
      () => {

        return Array.from(
          new Set(
            questions
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
        questions,
        subjectFilter
      ]
    );


  const filteredQuestions =
    useMemo(
      () => {

        const search =
          searchText
            .trim()
            .toLowerCase();


        return questions.filter(
          item => {

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


            if (
              browseMode ===
              'paper'
            ) {

              if (
                paperTab ===
                'essay'
              ) {

                if (
                  item.section_type !==
                  'essay'
                ) {

                  return false;
                }

              } else if (
                paperTab ===
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
                    paperTab
                ) {

                  return false;
                }
              }
            }


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


            if (
              search
            ) {

              const searchable =
                [
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
        questions,
        yearFilter,
        browseMode,
        paperTab,
        optionalSubjectFilter,
        optionalPaperFilter,
        subjectFilter,
        subtopicFilter,
        searchText
      ]
    );


  const questionsByYear =
    useMemo(
      () => {

        const grouped =
          new Map<
            number,
            PyqQuestion[]
          >();


        filteredQuestions.forEach(
          item => {

            const year =
              item.pyq_year ||
              0;


            const existing =
              grouped.get(
                year
              ) ||
              [];


            existing.push(
              item
            );


            grouped.set(
              year,
              existing
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


  function getPaperName(
    item:
      PyqQuestion
  ) {

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


    return (
      item.gs_paper ||
      'General Studies'
    );
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

      <section
        className="panel"
        style={{
          padding:
            '16px'
        }}
      >

        <span
          className="eyebrow"
        >
          UPSC MAINS PYQ
        </span>


        <h2
          style={{
            marginBottom:
              '6px'
          }}
        >
          Previous Year Question Papers
        </h2>


        <p
          style={{
            marginTop:
              0
          }}
        >
          Browse complete papers or study questions
          subject-wise and subtopic-wise.
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


      {browseMode ===
        'paper' && (

        <section
          className="panel"
          style={{
            padding:
              '14px'
          }}
        >

          <div
            style={{
              display:
                'grid',

              gridTemplateColumns:
                'repeat(3, minmax(0, 1fr))',

              gap:
                '8px'
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
              ] as
                Array<
                  [
                    PaperTab,
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
                    paperTab ===
                      value
                      ? 'filter active'
                      : 'filter'
                  }
                  onClick={() => {

                    setPaperTab(
                      value
                    );

                    setOptionalSubjectFilter(
                      'all'
                    );

                    setOptionalPaperFilter(
                      'all'
                    );

                  }}
                >
                  {label}
                </button>

              )
            )}

          </div>

        </section>

      )}


      <section
        className="panel"
        style={{
          padding:
            '14px'
        }}
      >

        <div
          style={{
            display:
              'grid',

            gridTemplateColumns:
              'repeat(auto-fit, minmax(170px, 1fr))',

            gap:
              '10px'
          }}
        >

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
                All Years
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
            'paper' &&
            paperTab ===
              'optional' && (

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
                  All Optional Subjects
                </option>


                {optionalSubjects.map(
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
                )}

              </select>

            </label>

          )}


          {browseMode ===
            'paper' &&
            paperTab ===
              'optional' && (

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
                  Paper-I & Paper-II
                </option>

                <option value="Paper-I">
                  Paper-I
                </option>

                <option value="Paper-II">
                  Paper-II
                </option>

              </select>

            </label>

          )}


          {(browseMode ===
            'subject' ||
            browseMode ===
              'subtopic') && (

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

                  }}
              >

                <option value="all">
                  All Subjects
                </option>


                {subjects.map(
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
                  All Subtopics
                </option>


                {availableSubtopics.map(
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
                )}

              </select>

            </label>

          )}

        </div>


        <label
          style={{
            display:
              'block',

            marginTop:
              '12px'
          }}
        >

          Search Question / Topic

          <input
            type="search"
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
            placeholder="Example: Harappan Culture, federalism, inflation..."
            style={{
              width:
                '100%'
            }}
          />

        </label>


        <button
          type="button"
          className="text-btn"
          style={{
            marginTop:
              '10px'
          }}
          onClick={
            clearFilters
          }
        >
          Clear filters
        </button>

      </section>


      <section>

        <div
          style={{
            display:
              'flex',

            justifyContent:
              'space-between',

            gap:
              '10px',

            alignItems:
              'center',

            flexWrap:
              'wrap',

            marginBottom:
              '10px'
          }}
        >

          <strong>
            {filteredQuestions.length}
            {' '}
            questions found
          </strong>


          <button
            type="button"
            className="secondary-btn"
            onClick={() =>
              void loadPyqs()
            }
          >
            Refresh
          </button>

        </div>


        {questionsByYear.length ===
          0 && (

          <section
            className="panel"
          >

            <h3>
              No published PYQs found
            </h3>


            <p>
              Change the filters or publish questions
              from Admin Studio → Mains PYQ.
            </p>

          </section>

        )}


        <div
          style={{
            display:
              'grid',

            gap:
              '14px'
          }}
        >

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
                style={{
                  padding:
                    '14px'
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
                      '10px',

                    flexWrap:
                      'wrap',

                    marginBottom:
                      '12px'
                  }}
                >

                  <div>

                    <span
                      className="eyebrow"
                    >
                      UPSC MAINS
                    </span>


                    <h3
                      style={{
                        margin:
                          '3px 0 0'
                      }}
                    >
                      {year}
                    </h3>

                  </div>


                  <strong>
                    {yearQuestions.length}
                    {' '}
                    question{
                      yearQuestions.length ===
                        1
                        ? ''
                        : 's'
                    }
                  </strong>

                </div>


                <div
                  style={{
                    display:
                      'grid',

                    gap:
                      '9px'
                  }}
                >

                  {yearQuestions.map(
                    item => (

                      <article
                        key={
                          item.id
                        }
                        style={{
                          padding:
                            '12px',

                          border:
                            '1px solid rgba(255,255,255,.08)',

                          borderRadius:
                            '12px',

                          background:
                            'rgba(255,255,255,.025)'
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
                              '10px',

                            flexWrap:
                              'wrap'
                          }}
                        >

                          <strong>
                            {item.question_number
                              ? `Q. ${item.question_number}`
                              : 'Question'}
                          </strong>


                          <span
                            style={{
                              color:
                                '#5eead4',

                              fontWeight:
                                700
                            }}
                          >
                            {getPaperName(
                              item
                            )}
                          </span>

                        </div>


                        <p
                          style={{
                            margin:
                              '9px 0'
                          }}
                        >
                          {item.question}
                        </p>


                        <div
                          style={{
                            display:
                              'flex',

                            gap:
                              '6px',

                            flexWrap:
                              'wrap',

                            color:
                              '#94a3b8',

                            fontSize:
                              '.78rem'
                          }}
                        >

                          <span>
                            Subject:
                            {' '}
                            <strong>
                              {item.subject}
                            </strong>
                          </span>


                          {item.topic && (

                            <span>
                              • Topic:
                              {' '}
                              <strong>
                                {item.topic}
                              </strong>
                            </span>

                          )}


                          {item.subtopic && (

                            <span>
                              • Subtopic:
                              {' '}
                              <strong>
                                {item.subtopic}
                              </strong>
                            </span>

                          )}


                          {item.marks !==
                            null && (

                            <span>
                              • {item.marks} Marks
                            </span>

                          )}


                          {item.word_limit !==
                            null && (

                            <span>
                              • {item.word_limit} Words
                            </span>

                          )}


                          {item.essay_section && (

                            <span>
                              • {item.essay_section}
                            </span>

                          )}

                        </div>


                        {item.relevant_gs_papers
                          .length >
                          0 && (

                          <div
                            style={{
                              marginTop:
                                '9px',

                              padding:
                                '7px 9px',

                              borderRadius:
                                '9px',

                              background:
                                'rgba(45,212,191,.06)',

                              color:
                                '#5eead4',

                              fontSize:
                                '.78rem'
                            }}
                          >
                            Useful for:
                            {' '}
                            {item.relevant_gs_papers.join(
                              ', '
                            )}
                          </div>

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
                                '9px'
                            }}
                          >
                            Official source
                          </a>

                        )}

                      </article>

                    )
                  )}

                </div>

              </section>

            )
          )}

        </div>

      </section>

    </section>

  );
}

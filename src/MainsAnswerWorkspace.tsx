import {
  useEffect,
  useMemo,
  useState
} from 'react';

import type {
  CSSProperties
} from 'react';

import {
  TopBar
} from '../components/TopBar';

import {
  supabase
} from '../lib/supabase';

import {
  MainsAnswerWorkspace
} from '../MainsAnswerWorkspace';

import type {
  MainsWorkspaceQuestion
} from '../MainsAnswerWorkspace';


type QuestionType =
  | 'practice'
  | 'pyq';

type MainSectionFilter =
  | 'all'
  | 'gs'
  | 'optional';

type TypeFilter =
  | 'all'
  | 'practice'
  | 'pyq';


type MainsQuestion =
  MainsWorkspaceQuestion & {
    question_type:
      QuestionType;

    pyq_year:
      number | null;

    tags:
      string[];

    difficulty:
      string;

    created_at:
      string;
  };


const controlStyle:
  CSSProperties = {
    width:
      '100%',

    minHeight:
      '48px',

    padding:
      '0 14px',

    borderRadius:
      '12px',

    border:
      '1px solid rgba(255,255,255,0.12)',

    background:
      '#0e1525',

    color:
      '#f8fafc',

    fontSize:
      '0.92rem',

    outline:
      'none',

    colorScheme:
      'dark'
  };


const labelStyle:
  CSSProperties = {
    display:
      'grid',

    gap:
      '7px',

    marginBottom:
      '14px',

    color:
      '#cbd5e1',

    fontSize:
      '0.82rem',

    fontWeight:
      700
  };


const optionStyle:
  CSSProperties = {
    background:
      '#0e1525',

    color:
      '#f8fafc'
  };


const outlineButtonStyle:
  CSSProperties = {
    minHeight:
      '44px',

    padding:
      '0 16px',

    borderRadius:
      '12px',

    border:
      '1px solid rgba(45,212,191,0.55)',

    background:
      'rgba(20,184,166,0.04)',

    color:
      '#5eead4',

    fontWeight:
      750
  };


export function MainsPracticePage() {
  const [
    questions,
    setQuestions
  ] =
    useState<MainsQuestion[]>(
      []
    );

  const [
    selectedQuestion,
    setSelectedQuestion
  ] =
    useState<MainsQuestion | null>(
      null
    );

  const [
    loading,
    setLoading
  ] =
    useState(true);

  const [
    error,
    setError
  ] =
    useState('');

  const [
    sectionFilter,
    setSectionFilter
  ] =
    useState<MainSectionFilter>(
      'all'
    );

  const [
    gsFilter,
    setGsFilter
  ] =
    useState('all');

  const [
    typeFilter,
    setTypeFilter
  ] =
    useState<TypeFilter>(
      'all'
    );

  const [
    optionalSubjectFilter,
    setOptionalSubjectFilter
  ] =
    useState('all');

  const [
    optionalPaperFilter,
    setOptionalPaperFilter
  ] =
    useState('all');

  const [
    marksFilter,
    setMarksFilter
  ] =
    useState('all');

  const [
    yearFilter,
    setYearFilter
  ] =
    useState('all');

  const [
    searchText,
    setSearchText
  ] =
    useState('');

  const [
    expandedId,
    setExpandedId
  ] =
    useState<string | null>(
      null
    );


  async function loadQuestions() {
    if (!supabase) {
      setError(
        'Mains question database is not configured.'
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

    const {
      data,
      error:
        loadError
    } =
      await supabase
        .from(
          'mains_questions'
        )
        .select(`
          id,
          question,
          question_type,
          section_type,
          gs_paper,
          optional_subject,
          optional_paper,
          subject,
          topic,
          syllabus_link,
          directive,
          marks,
          word_limit,
          pyq_year,
          answer_framework,
          key_points,
          introduction_hint,
          conclusion_hint,
          source,
          source_url,
          tags,
          difficulty,
          created_at
        `)
        .eq(
          'status',
          'published'
        )
        .order(
          'created_at',
          {
            ascending:
              false
          }
        );


    if (loadError) {
      console.error(
        'Unable to load Mains questions:',
        loadError
      );

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

          tags:
            item.tags ||
            []
        })
      ) as MainsQuestion[];


    setQuestions(
      formatted
    );

    setLoading(
      false
    );
  }


  useEffect(
    () => {
      loadQuestions();
    },
    []
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
                Boolean
              ) as string[]
          )
        ).sort();
      },
      [
        questions
      ]
    );


  const years =
    useMemo(
      () => {
        return Array.from(
          new Set(
            questions
              .filter(
                item =>
                  item.pyq_year !==
                  null
              )
              .map(
                item =>
                  item.pyq_year as number
              )
          )
        ).sort(
          (
            a,
            b
          ) =>
            b -
            a
        );
      },
      [
        questions
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
              sectionFilter !==
                'all' &&
              item.section_type !==
                sectionFilter
            ) {
              return false;
            }


            if (
              item.section_type ===
                'gs' &&
              gsFilter !==
                'all' &&
              item.gs_paper !==
                gsFilter
            ) {
              return false;
            }


            if (
              typeFilter !==
                'all' &&
              item.question_type !==
                typeFilter
            ) {
              return false;
            }


            if (
              item.section_type ===
                'optional' &&
              optionalSubjectFilter !==
                'all' &&
              item.optional_subject !==
                optionalSubjectFilter
            ) {
              return false;
            }


            if (
              item.section_type ===
                'optional' &&
              optionalPaperFilter !==
                'all' &&
              item.optional_paper !==
                optionalPaperFilter
            ) {
              return false;
            }


            if (
              marksFilter !==
                'all' &&
              String(
                item.marks
              ) !==
                marksFilter
            ) {
              return false;
            }


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


            if (search) {
              const searchable =
                [
                  item.question,
                  item.subject,
                  item.topic,
                  item.directive,
                  item.gs_paper,
                  item.optional_subject,
                  item.optional_paper,
                  ...(
                    item.tags ||
                    []
                  )
                ]
                  .filter(
                    Boolean
                  )
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
        sectionFilter,
        gsFilter,
        typeFilter,
        optionalSubjectFilter,
        optionalPaperFilter,
        marksFilter,
        yearFilter,
        searchText
      ]
    );


  function clearFilters() {
    setSectionFilter(
      'all'
    );

    setGsFilter(
      'all'
    );

    setTypeFilter(
      'all'
    );

    setOptionalSubjectFilter(
      'all'
    );

    setOptionalPaperFilter(
      'all'
    );

    setMarksFilter(
      'all'
    );

    setYearFilter(
      'all'
    );

    setSearchText(
      ''
    );
  }


  function startWriting(
    question:
      MainsQuestion
  ) {
    setSelectedQuestion(
      question
    );

    const mainArea =
      document.querySelector(
        '.main-area'
      );


    if (mainArea) {
      mainArea.scrollTo({
        top:
          0,

        behavior:
          'smooth'
      });
    }
  }


  function closeWorkspace() {
    setSelectedQuestion(
      null
    );

    const mainArea =
      document.querySelector(
        '.main-area'
      );


    if (mainArea) {
      mainArea.scrollTo({
        top:
          0,

        behavior:
          'smooth'
      });
    }
  }


  /*
    When a student selects a question,
    show the dedicated answer-writing
    workspace instead of the question bank.
  */
  if (selectedQuestion) {
    return (
      <MainsAnswerWorkspace
        question={
          selectedQuestion
        }
        onBack={
          closeWorkspace
        }
      />
    );
  }


  if (loading) {
    return (
      <div className="page-wrap mains-practice-page">

        <TopBar
          title="Mains Practice"
          subtitle="Answer writing, PYQs and optional subjects"
        />

        <section className="panel">
          <h2>
            Loading Mains questions...
          </h2>
        </section>

      </div>
    );
  }


  if (error) {
    return (
      <div className="page-wrap mains-practice-page">

        <TopBar
          title="Mains Practice"
          subtitle="Answer writing, PYQs and optional subjects"
        />

        <section className="panel">

          <h2>
            Unable to load Mains questions
          </h2>

          <p>
            {error}
          </p>

          <button
            className="primary-btn"
            type="button"
            onClick={
              loadQuestions
            }
          >
            Try again
          </button>

        </section>

      </div>
    );
  }


  return (
    <div className="page-wrap mains-practice-page">

      <TopBar
        title="Mains Practice"
        subtitle="GS-I to GS-IV, PYQs, practice questions and optionals"
      />


      <section
        className="panel"
        style={{
          marginBottom:
            '22px'
        }}
      >

        <span className="eyebrow">
          MAINS QUESTION BANK
        </span>

        <h2>
          Find the right question to practise
        </h2>

        <p>
          Filter questions by General Studies
          paper, Optional Subject, PYQ,
          marks and year.
        </p>


        <label
          style={
            labelStyle
          }
        >
          Search

          <input
            style={
              controlStyle
            }
            value={
              searchText
            }
            onChange={
              e =>
                setSearchText(
                  e.target.value
                )
            }
            placeholder="Search topic, subject, directive or keyword..."
          />

        </label>


        <div
          className="form-two"
          style={{
            marginTop:
              '14px'
          }}
        >

          <label
            style={
              labelStyle
            }
          >
            Section

            <select
              style={
                controlStyle
              }
              value={
                sectionFilter
              }
              onChange={
                e =>
                  setSectionFilter(
                    e.target
                      .value as MainSectionFilter
                  )
              }
            >

              <option
                style={
                  optionStyle
                }
                value="all"
              >
                All Sections
              </option>

              <option
                style={
                  optionStyle
                }
                value="gs"
              >
                General Studies
              </option>

              <option
                style={
                  optionStyle
                }
                value="optional"
              >
                Optional Subject
              </option>

            </select>

          </label>


          <label
            style={
              labelStyle
            }
          >
            Question Type

            <select
              style={
                controlStyle
              }
              value={
                typeFilter
              }
              onChange={
                e =>
                  setTypeFilter(
                    e.target
                      .value as TypeFilter
                  )
              }
            >

              <option
                style={
                  optionStyle
                }
                value="all"
              >
                All Question Types
              </option>

              <option
                style={
                  optionStyle
                }
                value="practice"
              >
                Practice Question
              </option>

              <option
                style={
                  optionStyle
                }
                value="pyq"
              >
                Previous Year Question
              </option>

            </select>

          </label>

        </div>


        <div className="form-two">

          <label
            style={
              labelStyle
            }
          >
            GS Paper

            <select
              style={
                controlStyle
              }
              value={
                gsFilter
              }
              onChange={
                e =>
                  setGsFilter(
                    e.target.value
                  )
              }
            >

              <option value="all">
                All GS Papers
              </option>

              <option value="GS-I">
                GS-I
              </option>

              <option value="GS-II">
                GS-II
              </option>

              <option value="GS-III">
                GS-III
              </option>

              <option value="GS-IV">
                GS-IV
              </option>

            </select>

          </label>


          <label
            style={
              labelStyle
            }
          >
            Marks

            <select
              style={
                controlStyle
              }
              value={
                marksFilter
              }
              onChange={
                e =>
                  setMarksFilter(
                    e.target.value
                  )
              }
            >

              <option value="all">
                All Marks
              </option>

              <option value="10">
                10 Marks
              </option>

              <option value="15">
                15 Marks
              </option>

              <option value="20">
                20 Marks
              </option>

            </select>

          </label>

        </div>


        <div className="form-two">

          <label
            style={
              labelStyle
            }
          >
            Optional Subject

            <select
              style={
                controlStyle
              }
              value={
                optionalSubjectFilter
              }
              onChange={
                e =>
                  setOptionalSubjectFilter(
                    e.target.value
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


          <label
            style={
              labelStyle
            }
          >
            Optional Paper

            <select
              style={
                controlStyle
              }
              value={
                optionalPaperFilter
              }
              onChange={
                e =>
                  setOptionalPaperFilter(
                    e.target.value
                  )
              }
            >

              <option value="all">
                Both Papers
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


        <div className="form-two">

          <label
            style={
              labelStyle
            }
          >
            PYQ Year

            <select
              style={
                controlStyle
              }
              value={
                yearFilter
              }
              onChange={
                e =>
                  setYearFilter(
                    e.target.value
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
                      year
                    }
                  >
                    {year}
                  </option>
                )
              )}

            </select>

          </label>


          <div
            style={{
              display:
                'flex',

              alignItems:
                'flex-end',

              marginBottom:
                '14px'
            }}
          >

            <button
              type="button"
              style={
                outlineButtonStyle
              }
              onClick={
                clearFilters
              }
            >
              Clear filters
            </button>

          </div>

        </div>

      </section>


      <section
        style={{
          display:
            'grid',

          gap:
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
              'wrap'
          }}
        >

          <div>

            <span className="eyebrow">
              RESULTS
            </span>

            <h2>
              {
                filteredQuestions.length
              }{' '}
              {
                filteredQuestions.length ===
                1
                  ? 'question'
                  : 'questions'
              }
            </h2>

          </div>


          <button
            type="button"
            style={
              outlineButtonStyle
            }
            onClick={
              loadQuestions
            }
          >
            Refresh questions
          </button>

        </div>


        {filteredQuestions.length ===
          0 && (

          <div className="panel">

            <h3>
              No published Mains questions found
            </h3>

            <p>
              Draft questions remain hidden
              until they are published by the
              administrator.
            </p>

          </div>

        )}


        {filteredQuestions.map(
          item => {

            const expanded =
              expandedId ===
              item.id;


            return (
              <article
                key={
                  item.id
                }
                className="panel"
                style={{
                  padding:
                    '22px'
                }}
              >

                <div
                  style={{
                    display:
                      'flex',

                    justifyContent:
                      'space-between',

                    gap:
                      '16px',

                    flexWrap:
                      'wrap'
                  }}
                >

                  <div>

                    <span className="eyebrow">
                      {
                        item.section_type ===
                        'gs'
                          ? item.gs_paper
                          : `${item.optional_subject} • ${item.optional_paper}`
                      }
                    </span>


                    <div
                      className="tag-row"
                      style={{
                        marginTop:
                          '10px'
                      }}
                    >

                      <span className="tag">
                        {
                          item.question_type ===
                          'pyq'
                            ? `PYQ ${item.pyq_year || ''}`
                            : 'Practice'
                        }
                      </span>


                      {item.marks && (
                        <span className="tag">
                          {item.marks} marks
                        </span>
                      )}


                      {item.word_limit && (
                        <span className="tag">
                          {item.word_limit} words
                        </span>
                      )}


                      <span className="tag">
                        {item.difficulty}
                      </span>

                    </div>

                  </div>


                  {item.directive && (
                    <strong
                      style={{
                        color:
                          '#5eead4'
                      }}
                    >
                      {item.directive}
                    </strong>
                  )}

                </div>


                <h2
                  style={{
                    marginTop:
                      '18px',

                    lineHeight:
                      1.4
                  }}
                >
                  {item.question}
                </h2>


                <p>
                  <strong>
                    Subject:
                  </strong>{' '}
                  {item.subject}
                </p>


                {item.topic && (
                  <p>
                    <strong>
                      Topic:
                    </strong>{' '}
                    {item.topic}
                  </p>
                )}


                {item.tags.length >
                  0 && (

                  <div
                    className="tag-row"
                    style={{
                      marginTop:
                        '12px'
                    }}
                  >

                    {item.tags.map(
                      tag => (
                        <span
                          className="tag"
                          key={
                            tag
                          }
                        >
                          {tag}
                        </span>
                      )
                    )}

                  </div>

                )}


                <div
                  style={{
                    display:
                      'flex',

                    gap:
                      '10px',

                    flexWrap:
                      'wrap',

                    marginTop:
                      '18px'
                  }}
                >

                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() =>
                      startWriting(
                        item
                      )
                    }
                  >
                    Start Answer Writing
                  </button>


                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() =>
                      setExpandedId(
                        expanded
                          ? null
                          : item.id
                      )
                    }
                  >
                    {
                      expanded
                        ? 'Hide answer guidance'
                        : 'View answer guidance'
                    }
                  </button>

                </div>


                {expanded && (

                  <div
                    style={{
                      display:
                        'grid',

                      gap:
                        '14px',

                      marginTop:
                        '22px'
                    }}
                  >

                    {item.syllabus_link && (

                      <section
                        className="panel"
                        style={{
                          background:
                            'rgba(20,184,166,0.06)'
                        }}
                      >

                        <span className="eyebrow">
                          UPSC SYLLABUS LINKAGE
                        </span>

                        <p>
                          {item.syllabus_link}
                        </p>

                      </section>

                    )}


                    {item.introduction_hint && (

                      <section className="panel">

                        <span className="eyebrow">
                          INTRODUCTION HINT
                        </span>

                        <p
                          style={{
                            whiteSpace:
                              'pre-wrap'
                          }}
                        >
                          {
                            item.introduction_hint
                          }
                        </p>

                      </section>

                    )}


                    {item.answer_framework && (

                      <section className="panel">

                        <span className="eyebrow">
                          ANSWER FRAMEWORK
                        </span>

                        <p
                          style={{
                            whiteSpace:
                              'pre-wrap',

                            lineHeight:
                              1.75
                          }}
                        >
                          {
                            item.answer_framework
                          }
                        </p>

                      </section>

                    )}


                    {item.key_points && (

                      <section className="panel">

                        <span className="eyebrow">
                          KEY POINTS
                        </span>

                        <p
                          style={{
                            whiteSpace:
                              'pre-wrap',

                            lineHeight:
                              1.75
                          }}
                        >
                          {item.key_points}
                        </p>

                      </section>

                    )}


                    {item.conclusion_hint && (

                      <section className="panel">

                        <span className="eyebrow">
                          CONCLUSION HINT
                        </span>

                        <p
                          style={{
                            whiteSpace:
                              'pre-wrap'
                          }}
                        >
                          {
                            item.conclusion_hint
                          }
                        </p>

                      </section>

                    )}


                    {(
                      item.source ||
                      item.source_url
                    ) && (

                      <section className="panel">

                        <span className="eyebrow">
                          SOURCE
                        </span>

                        {item.source && (
                          <p>
                            {item.source}
                          </p>
                        )}


                        {item.source_url && (
                          <a
                            href={
                              item.source_url
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="primary-btn"
                            style={{
                              display:
                                'inline-flex',

                              textDecoration:
                                'none'
                            }}
                          >
                            Open official source ↗
                          </a>
                        )}

                      </section>

                    )}

                  </div>

                )}

              </article>
            );
          }
        )}

      </section>

    </div>
  );
}

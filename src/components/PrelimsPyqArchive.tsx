import {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


type ExamFamily =
  | 'all'
  | 'upsc_cse'
  | 'upsc_other'
  | 'state_psc';


type PaperRow = {

  exam_paper_id:
    string;

  exam_family:
    string;

  commission:
    string | null;

  state:
    string | null;

  exam_name:
    string | null;

  exam_cycle:
    string | null;

  exam_year:
    number | null;

  exam_stage:
    string | null;

  paper:
    string | null;

  paper_code:
    string | null;

  declared_total_questions:
    number | null;

  available_questions:
    number;

  source:
    string | null;

  source_url:
    string | null;
};


type PaperQuestion = {

  appearance_id:
    string;

  exam_paper_id:
    string;

  question_id:
    string;

  canonical_question_id:
    string;

  question_number:
    string | null;

  appearance_type:
    string | null;

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

  tags:
    string[];

  source:
    string | null;

  source_url:
    string | null;
};



function clean(
  value:
    unknown
) {

  return String(
    value ??
    ''
  ).trim();
}



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
    item =>
      String(
        item
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
    item =>
      String(
        item
      )
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



function familyLabel(
  family:
    string
) {

  if (
    family ===
    'upsc_cse'
  ) {

    return 'UPSC CSE';
  }


  if (
    family ===
    'upsc_other'
  ) {

    return 'Other UPSC';
  }


  if (
    family ===
    'state_psc'
  ) {

    return 'State PSC';
  }


  return family ||
    'Examination';
}



function questionNumberLabel(
  value:
    string | null,
  index:
    number
) {

  const number =
    clean(
      value
    );


  if (
    number
  ) {

    return number;
  }


  return String(
    index +
    1
  );
}



function paperTitle(
  paper:
    PaperRow
) {

  const parts:
    string[] = [];


  if (
    paper.exam_family ===
    'state_psc' &&
    clean(
      paper.state
    )
  ) {

    parts.push(
      clean(
        paper.state
      )
    );
  }


  if (
    clean(
      paper.exam_name
    )
  ) {

    parts.push(
      clean(
        paper.exam_name
      )
    );

  } else {

    parts.push(
      familyLabel(
        paper.exam_family
      )
    );
  }


  if (
    paper.exam_year
  ) {

    parts.push(
      String(
        paper.exam_year
      )
    );
  }


  if (
    clean(
      paper.paper
    )
  ) {

    parts.push(
      clean(
        paper.paper
      )
    );
  }


  return parts.join(
    ' · '
  );
}



export function PrelimsPyqArchive() {


  const [
    family,
    setFamily
  ] =
    useState<ExamFamily>(
      'all'
    );


  const [
    papers,
    setPapers
  ] =
    useState<
      PaperRow[]
    >(
      []
    );


  const [
    selectedPaper,
    setSelectedPaper
  ] =
    useState<
      PaperRow | null
    >(
      null
    );


  const [
    questions,
    setQuestions
  ] =
    useState<
      PaperQuestion[]
    >(
      []
    );


  const [
    revealedAnswers,
    setRevealedAnswers
  ] =
    useState<
      Record<
        string,
        boolean
      >
    >(
      {}
    );


  const [
    searchText,
    setSearchText
  ] =
    useState(
      ''
    );


  const [
    loadingPapers,
    setLoadingPapers
  ] =
    useState(
      true
    );


  const [
    loadingQuestions,
    setLoadingQuestions
  ] =
    useState(
      false
    );


  const [
    message,
    setMessage
  ] =
    useState(
      ''
    );



  async function loadPapers(
    requestedFamily:
      ExamFamily =
        family
  ) {

    if (
      !supabase
    ) {

      setMessage(
        'Supabase is not configured.'
      );

      setLoadingPapers(
        false
      );

      return;
    }


    setLoadingPapers(
      true
    );


    setMessage(
      ''
    );


    const {
      data,
      error
    } =
      await supabase.rpc(
        'get_prelims_exam_papers',
        {

          p_exam_family:

            requestedFamily ===
              'all'

              ? null

              : requestedFamily

        }
      );


    if (
      error
    ) {

      console.error(
        'Unable to load Prelims PYQ papers:',
        error
      );


      setMessage(
        error.message ||
        'Unable to load Prelims PYQ papers.'
      );


      setPapers(
        []
      );


      setLoadingPapers(
        false
      );


      return;
    }



    const formatted:
      PaperRow[] =

      (
        Array.isArray(
          data
        )
          ? data
          : []
      ).map(
        raw => {

          const item =
            raw as
              Record<
                string,
                unknown
              >;


          return {

            exam_paper_id:
              clean(
                item.exam_paper_id
              ),


            exam_family:
              clean(
                item.exam_family
              ),


            commission:

              item.commission ==
                null

                ? null

                : clean(
                    item.commission
                  ),


            state:

              item.state ==
                null

                ? null

                : clean(
                    item.state
                  ),


            exam_name:

              item.exam_name ==
                null

                ? null

                : clean(
                    item.exam_name
                  ),


            exam_cycle:

              item.exam_cycle ==
                null

                ? null

                : clean(
                    item.exam_cycle
                  ),


            exam_year:

              item.exam_year ==
                null

                ? null

                : Number(
                    item.exam_year
                  ),


            exam_stage:

              item.exam_stage ==
                null

                ? null

                : clean(
                    item.exam_stage
                  ),


            paper:

              item.paper ==
                null

                ? null

                : clean(
                    item.paper
                  ),


            paper_code:

              item.paper_code ==
                null

                ? null

                : clean(
                    item.paper_code
                  ),


            declared_total_questions:

              item
                .declared_total_questions ==
                null

                ? null

                : Number(
                    item
                      .declared_total_questions
                  ),


            available_questions:
              Number(
                item
                  .available_questions ??
                0
              ),


            source:

              item.source ==
                null

                ? null

                : clean(
                    item.source
                  ),


            source_url:

              item.source_url ==
                null

                ? null

                : clean(
                    item.source_url
                  )

          };

        }
      );


    setPapers(
      formatted
    );


    setLoadingPapers(
      false
    );
  }



  async function openPaper(
    paper:
      PaperRow
  ) {

    if (
      !supabase
    ) {

      return;
    }


    setSelectedPaper(
      paper
    );


    setQuestions(
      []
    );


    setRevealedAnswers(
      {}
    );


    setLoadingQuestions(
      true
    );


    setMessage(
      ''
    );


    const {
      data,
      error
    } =
      await supabase.rpc(
        'get_prelims_paper_questions',
        {

          p_exam_paper_id:
            paper.exam_paper_id

        }
      );


    if (
      error
    ) {

      console.error(
        'Unable to load paper questions:',
        error
      );


      setMessage(
        error.message ||
        'Unable to load questions for this paper.'
      );


      setLoadingQuestions(
        false
      );


      return;
    }



    const formatted:
      PaperQuestion[] =

      (
        Array.isArray(
          data
        )
          ? data
          : []
      ).map(
        raw => {

          const item =
            raw as
              Record<
                string,
                unknown
              >;


          return {

            appearance_id:
              clean(
                item.appearance_id
              ),


            exam_paper_id:
              clean(
                item.exam_paper_id
              ),


            question_id:
              clean(
                item.question_id
              ),


            canonical_question_id:
              clean(
                item.canonical_question_id
              ),


            question_number:

              item.question_number ==
                null

                ? null

                : clean(
                    item.question_number
                  ),


            appearance_type:

              item.appearance_type ==
                null

                ? null

                : clean(
                    item.appearance_type
                  ),


            question:
              clean(
                item.question
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
              clean(
                item.explanation
              ),


            subject:
              clean(
                item.subject
              ) ||
              'General Studies',


            topic:

              item.topic ==
                null

                ? null

                : clean(
                    item.topic
                  ),


            difficulty:
              clean(
                item.difficulty
              ) ||
              'medium',


            tags:
              normalizeTags(
                item.tags
              ),


            source:

              item.source ==
                null

                ? null

                : clean(
                    item.source
                  ),


            source_url:

              item.source_url ==
                null

                ? null

                : clean(
                    item.source_url
                  )

          };

        }
      );


    setQuestions(
      formatted
    );


    setLoadingQuestions(
      false
    );
  }



  useEffect(
    () => {

      void loadPapers(
        'all'
      );

    },
    []
  );



  const filteredPapers =
    useMemo(
      () => {

        const query =
          searchText
            .trim()
            .toLowerCase();


        if (
          !query
        ) {

          return papers;
        }


        return papers.filter(
          paper => {

            const searchable =
              [

                familyLabel(
                  paper.exam_family
                ),

                paper.commission,

                paper.state,

                paper.exam_name,

                paper.exam_cycle,

                paper.exam_year,

                paper.exam_stage,

                paper.paper,

                paper.paper_code

              ]
                .filter(
                  value =>
                    value !==
                      null &&
                    value !==
                      undefined
                )
                .join(
                  ' '
                )
                .toLowerCase();


            return searchable.includes(
              query
            );
          }
        );

      },
      [
        papers,
        searchText
      ]
    );



  const availableQuestionCount =
    selectedPaper
      ? questions.length
      : 0;



  function changeFamily(
    nextFamily:
      ExamFamily
  ) {

    setFamily(
      nextFamily
    );


    setSelectedPaper(
      null
    );


    setQuestions(
      []
    );


    setRevealedAnswers(
      {}
    );


    void loadPapers(
      nextFamily
    );
  }



  function goBackToPapers() {

    setSelectedPaper(
      null
    );


    setQuestions(
      []
    );


    setRevealedAnswers(
      {}
    );


    setMessage(
      ''
    );
  }



  function toggleAnswer(
    appearanceId:
      string
  ) {

    setRevealedAnswers(
      current => ({

        ...current,

        [
          appearanceId
        ]:
          !current[
            appearanceId
          ]

      })
    );
  }



  function revealAllAnswers() {

    const next:
      Record<
        string,
        boolean
      > = {};


    questions.forEach(
      item => {

        next[
          item.appearance_id
        ] =
          true;

      }
    );


    setRevealedAnswers(
      next
    );
  }



  function hideAllAnswers() {

    setRevealedAnswers(
      {}
    );
  }



  if (
    selectedPaper
  ) {

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
              PRELIMS PYQ PAPER
            </span>


            <h2>
              {
                paperTitle(
                  selectedPaper
                )
              }
            </h2>


            <p>

              Original-paper order with repeated questions linked to their master question records.

            </p>

          </div>



          <button
            type="button"
            className="secondary-btn"
            onClick={
              goBackToPapers
            }
          >
            ← Back to Papers
          </button>

        </div>



        <div
          className="tag-row"
          style={{
            marginTop:
              '12px'
          }}
        >

          <span
            className="tag"
          >
            {
              familyLabel(
                selectedPaper
                  .exam_family
              )
            }
          </span>


          {
            selectedPaper
              .commission && (

              <span
                className="tag"
              >
                {
                  selectedPaper
                    .commission
                }
              </span>

            )
          }


          {
            selectedPaper
              .state && (

              <span
                className="tag"
              >
                {
                  selectedPaper
                    .state
                }
              </span>

            )
          }


          {
            selectedPaper
              .exam_year && (

              <span
                className="tag"
              >
                {
                  selectedPaper
                    .exam_year
                }
              </span>

            )
          }


          {
            selectedPaper
              .paper && (

              <span
                className="tag"
              >
                {
                  selectedPaper
                    .paper
                }
              </span>

            )
          }


          <span
            className="tag"
          >
            {
              availableQuestionCount
            }{' '}
            Questions Available
          </span>

        </div>



        {
          selectedPaper
            .declared_total_questions !==
            null && (

            <div
              className="callout"
              style={{
                marginTop:
                  '16px'
              }}
            >

              <strong>
                Paper coverage
              </strong>


              <p>

                Database currently contains{' '}

                <strong>
                  {
                    availableQuestionCount
                  }
                </strong>{' '}

                of{' '}

                <strong>
                  {
                    selectedPaper
                      .declared_total_questions
                  }
                </strong>{' '}

                declared questions for this paper.

              </p>

            </div>

          )
        }



        <div
          style={{

            display:
              'flex',

            gap:
              '10px',

            flexWrap:
              'wrap',

            marginTop:
              '16px',

            marginBottom:
              '18px'

          }}
        >

          <button
            type="button"
            className="secondary-btn"
            disabled={
              questions.length ===
              0
            }
            onClick={
              revealAllAnswers
            }
          >
            Reveal All Answers
          </button>


          <button
            type="button"
            className="secondary-btn"
            disabled={
              questions.length ===
              0
            }
            onClick={
              hideAllAnswers
            }
          >
            Hide All Answers
          </button>


          {
            selectedPaper
              .source_url && (

              <a
                className="secondary-btn"
                href={
                  selectedPaper
                    .source_url
                }
                target="_blank"
                rel="noreferrer"
              >
                Official / Source Paper
              </a>

            )
          }

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
          loadingQuestions ? (

            <div
              className="callout"
            >

              <strong>
                Loading paper...
              </strong>

            </div>

          ) : questions.length ===
              0 ? (

            <div
              className="callout"
            >

              <strong>
                No questions available
              </strong>


              <p>

                This paper currently has no available question appearances.

              </p>

            </div>

          ) : (

            <div
              style={{

                display:
                  'grid',

                gap:
                  '18px'

              }}
            >

              {
                questions.map(
                  (
                    item,
                    index
                  ) => {

                    const answerVisible =
                      Boolean(
                        revealedAnswers[
                          item
                            .appearance_id
                        ]
                      );


                    return (

                      <article
                        key={
                          item
                            .appearance_id
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
                              'wrap'

                          }}
                        >

                          <div>

                            <span
                              className="eyebrow"
                            >
                              QUESTION{' '}
                              {
                                questionNumberLabel(
                                  item
                                    .question_number,
                                  index
                                )
                              }
                            </span>


                            <h3
                              style={{
                                marginBottom:
                                  '10px'
                              }}
                            >
                              {item.question}
                            </h3>

                          </div>



                          <div
                            className="tag-row"
                          >

                            <span
                              className="tag"
                            >
                              {
                                item.subject
                              }
                            </span>


                            {
                              item.topic && (

                                <span
                                  className="tag"
                                >
                                  {
                                    item.topic
                                  }
                                </span>

                              )
                            }


                            <span
                              className="tag"
                            >
                              {
                                item.difficulty
                              }
                            </span>


                            {
                              item
                                .appearance_type && (

                                <span
                                  className="tag"
                                >
                                  {
                                    item
                                      .appearance_type
                                  }
                                </span>

                              )
                            }

                          </div>

                        </div>



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
                            item.options.map(
                              (
                                option,
                                optionIndex
                              ) => {

                                const isCorrect =

                                  optionIndex ===
                                  item
                                    .correct_index;


                                return (

                                  <div
                                    key={
                                      `${item.appearance_id}-${optionIndex}`
                                    }
                                    style={{

                                      padding:
                                        '11px 13px',

                                      borderRadius:
                                        '11px',

                                      border:

                                        answerVisible &&
                                        isCorrect

                                          ? '1px solid rgba(45,212,191,.65)'

                                          : '1px solid rgba(255,255,255,.10)'

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
                                      answerVisible &&
                                      isCorrect && (

                                        <small
                                          style={{

                                            display:
                                              'block',

                                            marginTop:
                                              '5px'

                                          }}
                                        >
                                          ✓ Correct Answer
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
                            className="secondary-btn"
                            onClick={
                              () =>
                                toggleAnswer(
                                  item
                                    .appearance_id
                                )
                            }
                          >

                            {
                              answerVisible
                                ? 'Hide Answer'
                                : 'Show Answer'
                            }

                          </button>

                        </div>



                        {
                          answerVisible && (

                            <div
                              className="callout"
                              style={{
                                marginTop:
                                  '14px'
                              }}
                            >

                              <strong>
                                Correct Answer
                              </strong>


                              <p>

                                {
                                  optionLetter(
                                    item
                                      .correct_index
                                  )
                                }.{' '}

                                {
                                  item.options[
                                    item
                                      .correct_index
                                  ] ||
                                  'Answer unavailable'
                                }

                              </p>



                              <strong>
                                Explanation
                              </strong>


                              <p>

                                {
                                  item.explanation ||
                                  'Explanation is not available yet.'
                                }

                              </p>



                              {
                                item.tags.length >
                                0 && (

                                  <div
                                    className="tag-row"
                                  >

                                    {
                                      item.tags.map(
                                        tag => (

                                          <span
                                            className="tag"
                                            key={
                                              `${item.appearance_id}-${tag}`
                                            }
                                          >
                                            {tag}
                                          </span>

                                        )
                                      )
                                    }

                                  </div>

                                )
                              }

                            </div>

                          )
                        }



                        {
                          item.source_url && (

                            <p
                              style={{
                                marginTop:
                                  '12px',
                                marginBottom:
                                  0
                              }}
                            >

                              <a
                                href={
                                  item
                                    .source_url
                                }
                                target="_blank"
                                rel="noreferrer"
                              >
                                View question source
                              </a>

                            </p>

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

      </section>

    );
  }



  return (

    <section
      className="panel"
    >

      <div>

        <span
          className="eyebrow"
        >
          PREVIOUS YEAR QUESTIONS
        </span>


        <h2>
          Prelims PYQ Paper Archive
        </h2>


        <p>

          Browse complete Prelims papers by examination, year and paper while repeated questions remain connected to one master question bank.

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
            '16px'

        }}
      >

        <button
          type="button"
          className={
            family ===
              'all'
              ? 'primary-btn'
              : 'secondary-btn'
          }
          onClick={
            () =>
              changeFamily(
                'all'
              )
          }
        >
          All Papers
        </button>


        <button
          type="button"
          className={
            family ===
              'upsc_cse'
              ? 'primary-btn'
              : 'secondary-btn'
          }
          onClick={
            () =>
              changeFamily(
                'upsc_cse'
              )
          }
        >
          UPSC CSE
        </button>


        <button
          type="button"
          className={
            family ===
              'upsc_other'
              ? 'primary-btn'
              : 'secondary-btn'
          }
          onClick={
            () =>
              changeFamily(
                'upsc_other'
              )
          }
        >
          Other UPSC
        </button>


        <button
          type="button"
          className={
            family ===
              'state_psc'
              ? 'primary-btn'
              : 'secondary-btn'
          }
          onClick={
            () =>
              changeFamily(
                'state_psc'
              )
          }
        >
          State PSC
        </button>

      </div>



      <div
        style={{
          marginTop:
            '16px'
        }}
      >

        <label>

          Search Papers

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
            placeholder="Search by exam, state, commission, year or paper..."
          />

        </label>

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
        loadingPapers ? (

          <div
            className="callout"
            style={{
              marginTop:
                '18px'
            }}
          >

            <strong>
              Loading Prelims PYQ papers...
            </strong>

          </div>

        ) : filteredPapers.length ===
            0 ? (

          <div
            className="callout"
            style={{
              marginTop:
                '18px'
            }}
          >

            <strong>
              No papers found
            </strong>


            <p>

              Published Prelims papers will appear here after their question appearances are imported.

            </p>

          </div>

        ) : (

          <div
            style={{

              display:
                'grid',

              gridTemplateColumns:
                'repeat(auto-fit,minmax(280px,1fr))',

              gap:
                '16px',

              marginTop:
                '18px'

            }}
          >

            {
              filteredPapers.map(
                paper => (

                  <article
                    key={
                      paper
                        .exam_paper_id
                    }
                    style={{

                      padding:
                        '18px',

                      border:
                        '1px solid rgba(255,255,255,.12)',

                      borderRadius:
                        '16px',

                      display:
                        'flex',

                      flexDirection:
                        'column',

                      gap:
                        '12px'

                    }}
                  >

                    <div
                      className="tag-row"
                    >

                      <span
                        className="tag"
                      >
                        {
                          familyLabel(
                            paper
                              .exam_family
                          )
                        }
                      </span>


                      {
                        paper
                          .exam_year && (

                          <span
                            className="tag"
                          >
                            {
                              paper
                                .exam_year
                            }
                          </span>

                        )
                      }

                    </div>



                    <div>

                      <h3>
                        {
                          paperTitle(
                            paper
                          )
                        }
                      </h3>


                      {
                        paper
                          .commission && (

                          <p>
                            {
                              paper
                                .commission
                            }
                          </p>

                        )
                      }


                      {
                        paper
                          .exam_cycle && (

                          <p>
                            Cycle:{' '}
                            <strong>
                              {
                                paper
                                  .exam_cycle
                              }
                            </strong>
                          </p>

                        )
                      }


                      {
                        paper
                          .paper_code && (

                          <p>
                            Paper Code:{' '}
                            <strong>
                              {
                                paper
                                  .paper_code
                              }
                            </strong>
                          </p>

                        )
                      }

                    </div>



                    <div
                      className="callout"
                    >

                      <strong>
                        {
                          paper
                            .available_questions
                        }
                      </strong>{' '}
                      questions available


                      {
                        paper
                          .declared_total_questions !==
                          null && (

                          <p
                            style={{
                              marginBottom:
                                0
                            }}
                          >

                            Declared paper size:{' '}

                            {
                              paper
                                .declared_total_questions
                            }

                          </p>

                        )
                      }

                    </div>



                    <button
                      type="button"
                      className="primary-btn"
                      onClick={
                        () =>
                          void openPaper(
                            paper
                          )
                      }
                    >
                      Open Original Paper
                    </button>

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

import {
  useEffect,
  useMemo,
  useState
} from 'react';

import type {
  FormEvent
} from 'react';

import {
  supabase
} from '../lib/supabase';


type PaperTab =
  | 'essay'
  | 'GS-I'
  | 'GS-II'
  | 'GS-III'
  | 'GS-IV'
  | 'optional';


type SectionType =
  | 'essay'
  | 'gs'
  | 'optional';


type QuestionStatus =
  | 'draft'
  | 'published';


type FullQuestionStatus =
  | 'draft'
  | 'published'
  | 'archived';


type PaperStatus =
  | 'draft'
  | 'published';


type PyqRow = {
  id: string;
  question: string;
  section_type: SectionType;
  gs_paper: string | null;
  optional_subject: string | null;
  optional_paper: string | null;
  subject: string;
  topic: string | null;
  subtopic: string | null;
  question_number: string | null;
  marks: number | null;
  word_limit: number | null;
  pyq_year: number | null;
  essay_section: string | null;
  relevant_gs_papers: string[];
  status: FullQuestionStatus;
  created_at: string;
};


const OPTIONAL_SUBJECTS = [
  'Agriculture',
  'Animal Husbandry & Veterinary Science',
  'Anthropology',
  'Botany',
  'Chemistry',
  'Civil Engineering',
  'Commerce & Accountancy',
  'Economics',
  'Electrical Engineering',
  'Geography',
  'Geology',
  'History',
  'Law',
  'Management',
  'Mathematics',
  'Mechanical Engineering',
  'Medical Science',
  'Philosophy',
  'Physics',
  'Political Science & International Relations',
  'Psychology',
  'Public Administration',
  'Sociology',
  'Statistics',
  'Zoology',
  'Assamese Literature',
  'Bengali Literature',
  'Bodo Literature',
  'Dogri Literature',
  'English Literature',
  'Gujarati Literature',
  'Hindi Literature',
  'Kannada Literature',
  'Kashmiri Literature',
  'Konkani Literature',
  'Maithili Literature',
  'Malayalam Literature',
  'Manipuri Literature',
  'Marathi Literature',
  'Nepali Literature',
  'Odia Literature',
  'Punjabi Literature',
  'Sanskrit Literature',
  'Santhali Literature',
  'Sindhi Literature',
  'Tamil Literature',
  'Telugu Literature',
  'Urdu Literature'
];


const GS_RELEVANCE = [
  'GS-I',
  'GS-II',
  'GS-III',
  'GS-IV'
];


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
  status,
  created_at
`;


function paperLabel(
  paperTab: PaperTab,
  optionalSubject: string,
  optionalPaper: string
) {

  if (
    paperTab ===
    'essay'
  ) {

    return 'Essay';
  }


  if (
    paperTab ===
    'optional'
  ) {

    return `${optionalSubject} ${optionalPaper}`;
  }


  return paperTab;
}


function sectionFromPaper(
  paperTab: PaperTab
): SectionType {

  if (
    paperTab ===
    'essay'
  ) {

    return 'essay';
  }


  if (
    paperTab ===
    'optional'
  ) {

    return 'optional';
  }


  return 'gs';
}


export function MainsPyqManager() {

  const [
    paperTab,
    setPaperTab
  ] =
    useState<PaperTab>(
      'GS-I'
    );


  const [
    year,
    setYear
  ] =
    useState(
      String(
        new Date()
          .getFullYear()
      )
    );


  const [
    optionalSubject,
    setOptionalSubject
  ] =
    useState(
      'History'
    );


  const [
    optionalPaper,
    setOptionalPaper
  ] =
    useState(
      'Paper-I'
    );


  const [
    subject,
    setSubject
  ] =
    useState(
      'History'
    );


  const [
    topic,
    setTopic
  ] =
    useState('');


  const [
    subtopic,
    setSubtopic
  ] =
    useState('');


  const [
    questionNumber,
    setQuestionNumber
  ] =
    useState('');


  const [
    question,
    setQuestion
  ] =
    useState('');


  const [
    marks,
    setMarks
  ] =
    useState(
      '10'
    );


  const [
    wordLimit,
    setWordLimit
  ] =
    useState(
      '150'
    );


  const [
    essaySection,
    setEssaySection
  ] =
    useState(
      'Section A'
    );


  const [
    sourceUrl,
    setSourceUrl
  ] =
    useState('');


  const [
    relevantGsPapers,
    setRelevantGsPapers
  ] =
    useState<string[]>(
      []
    );


  const [
    paperStatus,
    setPaperStatus
  ] =
    useState<PaperStatus>(
      'draft'
    );


  const [
    questionStatus,
    setQuestionStatus
  ] =
    useState<QuestionStatus>(
      'draft'
    );


  const [
    saving,
    setSaving
  ] =
    useState(
      false
    );


  const [
    loading,
    setLoading
  ] =
    useState(
      false
    );


  const [
    changingStatusId,
    setChangingStatusId
  ] =
    useState<
      string |
      null
    >(
      null
    );


  const [
    message,
    setMessage
  ] =
    useState('');


  const [
    questions,
    setQuestions
  ] =
    useState<PyqRow[]>(
      []
    );


  const [
    filterYear,
    setFilterYear
  ] =
    useState(
      'all'
    );


  const [
    filterSubject,
    setFilterSubject
  ] =
    useState('');


  async function loadQuestions() {

    if (!supabase) {

      setMessage(
        'Supabase is not configured.'
      );

      return;
    }


    setLoading(
      true
    );


    setMessage('');


    const {
      data,
      error
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
              false
          }
        )
        .limit(
          500
        );


    if (
      error
    ) {

      setMessage(
        error.message
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
      ) as PyqRow[];


    setQuestions(
      formatted
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


  useEffect(
    () => {

      if (
        paperTab ===
        'essay'
      ) {

        setSubject(
          'Essay'
        );

        setMarks(
          '125'
        );

        setWordLimit('');

        return;
      }


      if (
        paperTab ===
        'optional'
      ) {

        setSubject(
          optionalSubject
        );

        setMarks(
          '10'
        );

        setWordLimit(
          '150'
        );

        return;
      }


      setMarks(
        '10'
      );

      setWordLimit(
        '150'
      );

    },
    [
      paperTab
    ]
  );


  useEffect(
    () => {

      if (
        paperTab ===
        'optional'
      ) {

        setSubject(
          optionalSubject
        );
      }

    },
    [
      optionalSubject,
      paperTab
    ]
  );


  function toggleRelevantGs(
    paper: string
  ) {

    setRelevantGsPapers(
      current =>
        current.includes(
          paper
        )
          ? current.filter(
              item =>
                item !==
                paper
            )
          : [
              ...current,
              paper
            ]
    );
  }


  function clearQuestionFields() {

    setQuestionNumber('');
    setQuestion('');
    setTopic('');
    setSubtopic('');
    setRelevantGsPapers([]);
  }


  async function findOrCreatePaper(
    userId: string
  ) {

    if (!supabase) {

      throw new Error(
        'Supabase is not configured.'
      );
    }


    const numericYear =
      Number(
        year
      );


    const paperType =
      sectionFromPaper(
        paperTab
      );


    let query =
      supabase
        .from(
          'mains_pyq_papers'
        )
        .select(
          'id'
        )
        .eq(
          'year',
          numericYear
        )
        .eq(
          'paper_type',
          paperType
        );


    if (
      paperType ===
      'essay'
    ) {

      query =
        query
          .is(
            'gs_paper',
            null
          )
          .is(
            'optional_subject',
            null
          )
          .is(
            'optional_paper',
            null
          );

    } else if (
      paperType ===
      'gs'
    ) {

      query =
        query
          .eq(
            'gs_paper',
            paperTab
          )
          .is(
            'optional_subject',
            null
          )
          .is(
            'optional_paper',
            null
          );

    } else {

      query =
        query
          .is(
            'gs_paper',
            null
          )
          .eq(
            'optional_subject',
            optionalSubject
          )
          .eq(
            'optional_paper',
            optionalPaper
          );
    }


    const {
      data:
        existing,
      error:
        existingError
    } =
      await query
        .maybeSingle();


    if (
      existingError
    ) {

      throw existingError;
    }


    if (
      existing?.id
    ) {

      const {
        error:
          updateError
      } =
        await supabase
          .from(
            'mains_pyq_papers'
          )
          .update({
            status:
              paperStatus,

            official_source_url:
              sourceUrl.trim() ||
              null
          })
          .eq(
            'id',
            existing.id
          );


      if (
        updateError
      ) {

        throw updateError;
      }


      return String(
        existing.id
      );
    }


    const title =
      `${numericYear} UPSC Mains ${paperLabel(
        paperTab,
        optionalSubject,
        optionalPaper
      )}`;


    const {
      data:
        created,
      error:
        createError
    } =
      await supabase
        .from(
          'mains_pyq_papers'
        )
        .insert({
          year:
            numericYear,

          paper_type:
            paperType,

          gs_paper:
            paperType ===
              'gs'
              ? paperTab
              : null,

          optional_subject:
            paperType ===
              'optional'
              ? optionalSubject
              : null,

          optional_paper:
            paperType ===
              'optional'
              ? optionalPaper
              : null,

          title,

          official_source_url:
            sourceUrl.trim() ||
            null,

          status:
            paperStatus,

          created_by:
            userId
        })
        .select(
          'id'
        )
        .single();


    if (
      createError ||
      !created
    ) {

      throw (
        createError ||
        new Error(
          'Unable to create PYQ paper.'
        )
      );
    }


    return String(
      created.id
    );
  }


  async function saveQuestion(
    event: FormEvent
  ) {

    event.preventDefault();


    if (!supabase) {

      setMessage(
        'Supabase is not configured.'
      );

      return;
    }


    const numericYear =
      Number(
        year
      );


    if (
      !Number.isInteger(
        numericYear
      ) ||
      numericYear <
        1950 ||
      numericYear >
        2100
    ) {

      setMessage(
        'Enter a valid UPSC paper year.'
      );

      return;
    }


    if (
      !subject.trim()
    ) {

      setMessage(
        'Enter the subject.'
      );

      return;
    }


    if (
      !question.trim()
    ) {

      setMessage(
        'Enter the exact UPSC question.'
      );

      return;
    }


    if (
      paperTab ===
        'optional' &&
      (
        !optionalSubject ||
        !optionalPaper
      )
    ) {

      setMessage(
        'Select Optional Subject and Paper.'
      );

      return;
    }


    setSaving(
      true
    );


    setMessage(
      'Saving PYQ...'
    );


    const {
      data: {
        user
      }
    } =
      await supabase
        .auth
        .getUser();


    if (!user) {

      setSaving(
        false
      );

      setMessage(
        'Admin session expired. Sign in again.'
      );

      return;
    }


    try {

      const paperId =
        await findOrCreatePaper(
          user.id
        );


      const sectionType =
        sectionFromPaper(
          paperTab
        );


      const cleanTags =
        [
          String(
            numericYear
          ),

          paperLabel(
            paperTab,
            optionalSubject,
            optionalPaper
          ),

          subject.trim(),

          topic.trim(),

          subtopic.trim(),

          'UPSC PYQ'
        ].filter(
          Boolean
        );


      const {
        data,
        error
      } =
        await supabase
          .from(
            'mains_questions'
          )
          .insert({
            question:
              question.trim(),

            question_type:
              'pyq',

            section_type:
              sectionType,

            gs_paper:
              sectionType ===
                'gs'
                ? paperTab
                : null,

            optional_subject:
              sectionType ===
                'optional'
                ? optionalSubject
                : null,

            optional_paper:
              sectionType ===
                'optional'
                ? optionalPaper
                : null,

            subject:
              subject.trim(),

            topic:
              topic.trim() ||
              null,

            subtopic:
              subtopic.trim() ||
              null,

            question_number:
              questionNumber.trim() ||
              null,

            essay_section:
              sectionType ===
                'essay'
                ? essaySection
                : null,

            marks:
              marks.trim()
                ? Number(
                    marks
                  )
                : null,

            word_limit:
              wordLimit.trim()
                ? Number(
                    wordLimit
                  )
                : null,

            pyq_year:
              numericYear,

            pyq_paper_id:
              paperId,

            relevant_gs_papers:
              relevantGsPapers,

            source:
              'UPSC',

            source_url:
              sourceUrl.trim() ||
              null,

            tags:
              cleanTags,

            difficulty:
              'medium',

            status:
              questionStatus,

            created_by:
              user.id
          })
          .select(
            PYQ_SELECT
          )
          .single();


      if (
        error ||
        !data
      ) {

        throw (
          error ||
          new Error(
            'Unable to save PYQ.'
          )
        );
      }


      const created = {
        ...data,

        relevant_gs_papers:
          data.relevant_gs_papers ||
          []
      } as PyqRow;


      setQuestions(
        current => [
          created,
          ...current
        ]
      );


      clearQuestionFields();


      setMessage(
        `Saved ${numericYear} ${paperLabel(
          paperTab,
          optionalSubject,
          optionalPaper
        )} question successfully.`
      );

    } catch (
      caughtError
    ) {

      const errorMessage =
        caughtError instanceof
          Error
          ? caughtError.message
          : 'Unable to save PYQ.';


      setMessage(
        errorMessage
      );

    } finally {

      setSaving(
        false
      );
    }
  }


  /*
   * IMPORTANT:
   * This function must remain OUTSIDE saveQuestion().
   */
  async function changeQuestionStatus(
    item: PyqRow,
    nextStatus: FullQuestionStatus
  ) {

    if (!supabase) {

      setMessage(
        'Supabase is not configured.'
      );

      return;
    }


    setChangingStatusId(
      item.id
    );


    setMessage(
      `Changing question to ${nextStatus}...`
    );


    const {
      data,
      error
    } =
      await supabase
        .from(
          'mains_questions'
        )
        .update({
          status:
            nextStatus
        })
        .eq(
          'id',
          item.id
        )
        .select(
          PYQ_SELECT
        )
        .single();


    if (
      error ||
      !data
    ) {

      setMessage(
        error?.message ||
        'Unable to change question status.'
      );

      setChangingStatusId(
        null
      );

      return;
    }


    const updated = {
      ...data,

      relevant_gs_papers:
        data.relevant_gs_papers ||
        []
    } as PyqRow;


    setQuestions(
      current =>
        current.map(
          questionItem =>
            questionItem.id ===
              updated.id
              ? updated
              : questionItem
        )
    );


    setChangingStatusId(
      null
    );


    setMessage(
      `Question moved to ${nextStatus}.`
    );
  }


  const years =
    useMemo(
      () =>
        Array.from(
          new Set(
            questions
              .map(
                item =>
                  item.pyq_year
              )
              .filter(
                (
                  item
                ):
                  item is number =>
                  typeof item ===
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
        ),
      [
        questions
      ]
    );


  const visibleQuestions =
    useMemo(
      () => {

        const subjectQuery =
          filterSubject
            .trim()
            .toLowerCase();


        return questions.filter(
          item => {

            if (
              filterYear !==
                'all' &&
              String(
                item.pyq_year
              ) !==
                filterYear
            ) {

              return false;
            }


            if (
              !subjectQuery
            ) {

              return true;
            }


            return [
              item.subject,
              item.topic ||
                '',
              item.subtopic ||
                '',
              item.question
            ]
              .join(
                ' '
              )
              .toLowerCase()
              .includes(
                subjectQuery
              );

          }
        );

      },
      [
        questions,
        filterYear,
        filterSubject
      ]
    );


  return (

    <section
      style={{
        display:
          'grid',

        gap:
          '16px'
      }}
    >

      {/* =====================================
          PAPER SELECTION
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
          Add complete UPSC Mains papers
        </h2>


        <p>
          Enter Essay, GS-I to GS-IV and Optional questions
          with subject, topic and subtopic classification.
        </p>


        <div
          style={{
            display:
              'grid',

            gridTemplateColumns:
              'repeat(auto-fit, minmax(110px, 1fr))',

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
                onClick={() =>
                  setPaperTab(
                    value
                  )
                }
              >
                {label}
              </button>

            )
          )}

        </div>

      </section>


      {/* =====================================
          MANUAL ENTRY FORM
      ===================================== */}

      <form
        className="panel admin-form"
        onSubmit={
          saveQuestion
        }
      >

        <div
          style={{
            display:
              'grid',

            gridTemplateColumns:
              'repeat(auto-fit, minmax(180px, 1fr))',

            gap:
              '12px'
          }}
        >

          <label>

            Year

            <input
              type="number"
              min="1950"
              max="2100"
              value={
                year
              }
              onChange={
                event =>
                  setYear(
                    event
                      .target
                      .value
                  )
              }
              required
            />

          </label>


          {paperTab ===
            'optional' && (

            <label>

              Optional Subject

              <select
                value={
                  optionalSubject
                }
                onChange={
                  event =>
                    setOptionalSubject(
                      event
                        .target
                        .value
                    )
                }
              >

                {OPTIONAL_SUBJECTS.map(
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


          {paperTab ===
            'optional' && (

            <label>

              Optional Paper

              <select
                value={
                  optionalPaper
                }
                onChange={
                  event =>
                    setOptionalPaper(
                      event
                        .target
                        .value
                    )
                }
              >

                <option
                  value="Paper-I"
                >
                  Paper-I
                </option>


                <option
                  value="Paper-II"
                >
                  Paper-II
                </option>

              </select>

            </label>

          )}


          {paperTab ===
            'essay' && (

            <label>

              Essay Section

              <select
                value={
                  essaySection
                }
                onChange={
                  event =>
                    setEssaySection(
                      event
                        .target
                        .value
                    )
                }
              >

                <option
                  value="Section A"
                >
                  Section A
                </option>


                <option
                  value="Section B"
                >
                  Section B
                </option>

              </select>

            </label>

          )}


          <label>

            Subject

            <input
              value={
                subject
              }
              onChange={
                event =>
                  setSubject(
                    event
                      .target
                      .value
                  )
              }
              placeholder="History"
              required
            />

          </label>


          <label>

            Topic

            <input
              value={
                topic
              }
              onChange={
                event =>
                  setTopic(
                    event
                      .target
                      .value
                  )
              }
              placeholder="Ancient India"
            />

          </label>


          <label>

            Subtopic

            <input
              value={
                subtopic
              }
              onChange={
                event =>
                  setSubtopic(
                    event
                      .target
                      .value
                  )
              }
              placeholder="Harappan Culture"
            />

          </label>


          <label>

            Question No.

            <input
              value={
                questionNumber
              }
              onChange={
                event =>
                  setQuestionNumber(
                    event
                      .target
                      .value
                  )
              }
              placeholder="3(a)"
            />

          </label>


          <label>

            Marks

            <input
              type="number"
              min="0"
              value={
                marks
              }
              onChange={
                event =>
                  setMarks(
                    event
                      .target
                      .value
                  )
              }
            />

          </label>


          <label>

            Word Limit

            <input
              type="number"
              min="0"
              value={
                wordLimit
              }
              onChange={
                event =>
                  setWordLimit(
                    event
                      .target
                      .value
                  )
              }
            />

          </label>


          <label>

            Question Status

            <select
              value={
                questionStatus
              }
              onChange={
                event =>
                  setQuestionStatus(
                    event
                      .target
                      .value as
                        QuestionStatus
                  )
              }
            >

              <option
                value="draft"
              >
                Draft
              </option>


              <option
                value="published"
              >
                Published
              </option>

            </select>

          </label>


          <label>

            Paper Status

            <select
              value={
                paperStatus
              }
              onChange={
                event =>
                  setPaperStatus(
                    event
                      .target
                      .value as
                        PaperStatus
                  )
              }
            >

              <option
                value="draft"
              >
                Draft / incomplete paper
              </option>


              <option
                value="published"
              >
                Published / complete paper
              </option>

            </select>

          </label>

        </div>


        <label
          style={{
            display:
              'block',

            marginTop:
              '12px'
          }}
        >

          Exact UPSC Question

          <textarea
            value={
              question
            }
            onChange={
              event =>
                setQuestion(
                  event
                    .target
                    .value
                )
            }
            rows={
              5
            }
            placeholder="Paste the exact question from the official UPSC paper."
            required
          />

        </label>


        <label
          style={{
            display:
              'block',

            marginTop:
              '12px'
          }}
        >

          Official UPSC Source URL

          <input
            type="url"
            value={
              sourceUrl
            }
            onChange={
              event =>
                setSourceUrl(
                  event
                    .target
                    .value
                )
            }
            placeholder="Official question paper URL"
          />

        </label>


        <div
          style={{
            marginTop:
              '14px'
          }}
        >

          <strong>
            Relevant to GS
          </strong>


          <p
            style={{
              margin:
                '4px 0 8px',

              color:
                '#94a3b8',

              fontSize:
                '.82rem'
            }}
          >
            Useful when an Optional PYQ overlaps with
            General Studies preparation.
          </p>


          <div
            style={{
              display:
                'flex',

              gap:
                '12px',

              flexWrap:
                'wrap'
            }}
          >

            {GS_RELEVANCE.map(
              item => (

                <label
                  key={
                    item
                  }
                  style={{
                    display:
                      'inline-flex',

                    alignItems:
                      'center',

                    gap:
                      '6px'
                  }}
                >

                  <input
                    type="checkbox"
                    checked={
                      relevantGsPapers.includes(
                        item
                      )
                    }
                    onChange={() =>
                      toggleRelevantGs(
                        item
                      )
                    }
                  />

                  {item}

                </label>

              )
            )}

          </div>

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
            type="submit"
            className="primary-btn"
            disabled={
              saving
            }
          >
            {saving
              ? 'Saving...'
              : 'Save PYQ Question'}
          </button>


          <button
            type="button"
            className="secondary-btn"
            onClick={
              clearQuestionFields
            }
          >
            Clear Question
          </button>


          <button
            type="button"
            className="secondary-btn"
            onClick={() =>
              void loadQuestions()
            }
          >
            Refresh Archive
          </button>

        </div>


        {message && (

          <p
            className="form-message"
          >
            {message}
          </p>

        )}

      </form>


      {/* =====================================
          SAVED QUESTION ARCHIVE
      ===================================== */}

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
              'end',

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
              SAVED PYQs
            </span>


            <h3>
              Question archive
            </h3>

          </div>


          <div
            style={{
              display:
                'flex',

              gap:
                '8px',

              flexWrap:
                'wrap'
            }}
          >

            <select
              value={
                filterYear
              }
              onChange={
                event =>
                  setFilterYear(
                    event
                      .target
                      .value
                  )
              }
            >

              <option
                value="all"
              >
                All years
              </option>


              {years.map(
                item => (

                  <option
                    key={
                      item
                    }
                    value={
                      String(
                        item
                      )
                    }
                  >
                    {item}
                  </option>

                )
              )}

            </select>


            <input
              value={
                filterSubject
              }
              onChange={
                event =>
                  setFilterSubject(
                    event
                      .target
                      .value
                  )
              }
              placeholder="Subject / topic / subtopic"
            />

          </div>

        </div>


        {loading ? (

          <p>
            Loading PYQs...
          </p>

        ) : (

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

            {visibleQuestions
              .slice(
                0,
                150
              )
              .map(
                item => {

                  const changing =
                    changingStatusId ===
                    item.id;


                  return (

                    <article
                      key={
                        item.id
                      }
                      style={{
                        border:
                          '1px solid rgba(255,255,255,.08)',

                        borderRadius:
                          '12px',

                        padding:
                          '12px',

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
                            '12px',

                          flexWrap:
                            'wrap'
                        }}
                      >

                        <strong>

                          {item.pyq_year}

                          {' • '}

                          {item.section_type ===
                            'essay'
                            ? 'Essay'
                            : item.section_type ===
                                'optional'
                              ? `${item.optional_subject || 'Optional'} ${item.optional_paper || ''}`
                              : item.gs_paper ||
                                'GS'}

                        </strong>


                        <span>
                          {item.status}
                        </span>

                      </div>


                      <p
                        style={{
                          margin:
                            '8px 0'
                        }}
                      >

                        {item.question_number
                          ? `${item.question_number}. `
                          : ''}

                        {item.question}

                      </p>


                      <small
                        style={{
                          color:
                            '#94a3b8'
                        }}
                      >

                        Subject:{' '}
                        {item.subject}

                        {item.topic
                          ? ` • Topic: ${item.topic}`
                          : ''}

                        {item.subtopic
                          ? ` • Subtopic: ${item.subtopic}`
                          : ''}

                        {item.marks !==
                          null
                          ? ` • ${item.marks} marks`
                          : ''}

                      </small>


                      <div
                        style={{
                          display:
                            'flex',

                          gap:
                            '8px',

                          flexWrap:
                            'wrap',

                          marginTop:
                            '12px'
                        }}
                      >

                        {item.status !==
                          'published' && (

                          <button
                            type="button"
                            className="primary-btn"
                            disabled={
                              changing
                            }
                            onClick={() =>
                              void changeQuestionStatus(
                                item,
                                'published'
                              )
                            }
                          >
                            {changing
                              ? 'Updating...'
                              : 'Publish'}
                          </button>

                        )}


                        {item.status !==
                          'draft' && (

                          <button
                            type="button"
                            className="secondary-btn"
                            disabled={
                              changing
                            }
                            onClick={() =>
                              void changeQuestionStatus(
                                item,
                                'draft'
                              )
                            }
                          >
                            Move to Draft
                          </button>

                        )}


                        {item.status !==
                          'archived' && (

                          <button
                            type="button"
                            className="secondary-btn"
                            disabled={
                              changing
                            }
                            onClick={() =>
                              void changeQuestionStatus(
                                item,
                                'archived'
                              )
                            }
                          >
                            Archive
                          </button>

                        )}

                      </div>

                    </article>

                  );
                }
              )}


            {visibleQuestions.length ===
              0 && (

              <p>
                No PYQs match the current filters.
              </p>

            )}

          </div>

        )}

      </section>

    </section>

  );
}

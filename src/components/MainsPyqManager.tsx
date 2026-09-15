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


type ExamMode =
  | 'upsc'
  | 'state';


type UpscPaperTab =
  | 'essay'
  | 'GS-I'
  | 'GS-II'
  | 'GS-III'
  | 'GS-IV'
  | 'optional';


type PaperType =
  | 'essay'
  | 'gs'
  | 'optional'
  | 'language'
  | 'other';


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

  section_type:
    PaperType;

  gs_paper:
    string |
    null;

  optional_subject:
    string |
    null;

  optional_paper:
    string |
    null;

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

  status:
    FullQuestionStatus;

  created_at:
    string;
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
  exam_authority,
  exam_name,
  state_name,
  paper_name,
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


function upscPaperName(
  tab: UpscPaperTab,
  optionalSubject: string,
  optionalPaper: string
) {

  if (
    tab ===
    'essay'
  ) {

    return 'Essay';
  }


  if (
    tab ===
    'optional'
  ) {

    return `${optionalSubject} ${optionalPaper}`;
  }


  return tab;
}


function upscPaperType(
  tab: UpscPaperTab
): PaperType {

  if (
    tab ===
    'essay'
  ) {

    return 'essay';
  }


  if (
    tab ===
    'optional'
  ) {

    return 'optional';
  }


  return 'gs';
}


export function MainsPyqManager() {

  /*
   * EXAM SOURCE
   */

  const [
    examMode,
    setExamMode
  ] =
    useState<ExamMode>(
      'upsc'
    );


  const [
    examAuthority,
    setExamAuthority
  ] =
    useState(
      'UPSC'
    );


  const [
    examName,
    setExamName
  ] =
    useState(
      'Civil Services Examination'
    );


  const [
    stateName,
    setStateName
  ] =
    useState('');


  /*
   * PAPER
   */

  const [
    upscTab,
    setUpscTab
  ] =
    useState<UpscPaperTab>(
      'GS-I'
    );


  const [
    statePaperType,
    setStatePaperType
  ] =
    useState<PaperType>(
      'gs'
    );


  const [
    statePaperName,
    setStatePaperName
  ] =
    useState(
      'General Studies-I'
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
    essaySection,
    setEssaySection
  ] =
    useState(
      'Section A'
    );


  /*
   * QUESTION CLASSIFICATION
   */

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


  /*
   * STATUS
   */

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


  /*
   * UI STATE
   */

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
    filterAuthority,
    setFilterAuthority
  ] =
    useState(
      'all'
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


  /*
   * DERIVED PAPER VALUES
   */

  const currentPaperType:
    PaperType =
      examMode ===
        'upsc'
        ? upscPaperType(
            upscTab
          )
        : statePaperType;


  const currentPaperName =
    examMode ===
      'upsc'
      ? upscPaperName(
          upscTab,
          optionalSubject,
          optionalPaper
        )
      : statePaperName
          .trim();


  const currentGsPaper =
    examMode ===
      'upsc' &&
    currentPaperType ===
      'gs'
      ? upscTab
      : null;


  /*
   * EXAM MODE DEFAULTS
   */

  useEffect(
    () => {

      if (
        examMode ===
        'upsc'
      ) {

        setExamAuthority(
          'UPSC'
        );

        setExamName(
          'Civil Services Examination'
        );

        setStateName('');

      } else {

        setExamAuthority(
          'MPSC'
        );

        setExamName(
          'State Services Examination'
        );

        setStateName(
          'Maharashtra'
        );
      }

    },
    [
      examMode
    ]
  );


  /*
   * PAPER DEFAULTS
   */

  useEffect(
    () => {

      if (
        currentPaperType ===
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
        currentPaperType ===
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


      if (
        currentPaperType ===
        'language'
      ) {

        setSubject(
          currentPaperName ||
          'Language'
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
      currentPaperType,
      currentPaperName,
      optionalSubject
    ]
  );


  /*
   * LOAD PYQs
   */

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
          1000
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


    setQuestions(
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
      ) as PyqRow[]
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


  /*
   * RELEVANT GS
   */

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


  /*
   * FIND OR CREATE PAPER MASTER
   */

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


    if (
      !currentPaperName
    ) {

      throw new Error(
        'Enter the paper name.'
      );
    }


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
          'exam_authority',
          examAuthority.trim()
        )
        .eq(
          'exam_name',
          examName.trim()
        )
        .eq(
          'paper_type',
          currentPaperType
        )
        .eq(
          'paper_name',
          currentPaperName
        );


    if (
      currentGsPaper
    ) {

      query =
        query.eq(
          'gs_paper',
          currentGsPaper
        );

    } else {

      query =
        query.is(
          'gs_paper',
          null
        );
    }


    if (
      currentPaperType ===
      'optional'
    ) {

      query =
        query
          .eq(
            'optional_subject',
            optionalSubject
          )
          .eq(
            'optional_paper',
            optionalPaper
          );

    } else {

      query =
        query
          .is(
            'optional_subject',
            null
          )
          .is(
            'optional_paper',
            null
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

            state_name:
              stateName.trim() ||
              null,

            official_source_url:
              sourceUrl.trim() ||
              null,

            status:
              paperStatus

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
      `${numericYear} ${examAuthority.trim()} ${examName.trim()} ${currentPaperName}`;


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

          exam_authority:
            examAuthority.trim(),

          exam_name:
            examName.trim(),

          state_name:
            stateName.trim() ||
            null,

          paper_type:
            currentPaperType,

          paper_name:
            currentPaperName,

          gs_paper:
            currentGsPaper,

          optional_subject:
            currentPaperType ===
              'optional'
              ? optionalSubject
              : null,

          optional_paper:
            currentPaperType ===
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


  /*
   * SAVE QUESTION
   */

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
        'Enter a valid examination year.'
      );

      return;
    }


    if (
      !examAuthority.trim()
    ) {

      setMessage(
        'Enter the examination authority.'
      );

      return;
    }


    if (
      !examName.trim()
    ) {

      setMessage(
        'Enter the examination name.'
      );

      return;
    }


    if (
      examMode ===
        'state' &&
      !stateName.trim()
    ) {

      setMessage(
        'Enter the State / UT.'
      );

      return;
    }


    if (
      !currentPaperName
    ) {

      setMessage(
        'Enter the paper name.'
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
        'Enter the exact question.'
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


      const cleanTags =
        [
          examAuthority.trim(),
          examName.trim(),
          stateName.trim(),
          String(
            numericYear
          ),
          currentPaperName,
          subject.trim(),
          topic.trim(),
          subtopic.trim(),
          'PYQ'
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
              currentPaperType,

            exam_authority:
              examAuthority.trim(),

            exam_name:
              examName.trim(),

            state_name:
              stateName.trim() ||
              null,

            paper_name:
              currentPaperName,

            gs_paper:
              currentGsPaper,

            optional_subject:
              currentPaperType ===
                'optional'
                ? optionalSubject
                : null,

            optional_paper:
              currentPaperType ===
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
              currentPaperType ===
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
              examAuthority.trim(),

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
          data
            .relevant_gs_papers ||
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
        `Saved ${numericYear} ${examAuthority.trim()} ${currentPaperName} question successfully.`
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
   * CHANGE QUESTION STATUS
   */

  async function changeQuestionStatus(
    item: PyqRow,
    nextStatus:
      FullQuestionStatus
  ) {

    if (!supabase) {

      return;
    }


    setChangingStatusId(
      item.id
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
        'Unable to update question status.'
      );

      setChangingStatusId(
        null
      );

      return;
    }


    const updated = {
      ...data,

      relevant_gs_papers:
        data
          .relevant_gs_papers ||
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


  /*
   * FILTER VALUES
   */

  const authorities =
    useMemo(
      () =>
        Array.from(
          new Set(
            questions
              .map(
                item =>
                  item
                    .exam_authority
              )
              .filter(
                (
                  item
                ):
                  item is string =>
                  Boolean(
                    item
                  )
              )
          )
        ).sort(),
      [
        questions
      ]
    );


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
            a,
            b
          ) =>
            b -
            a
        ),
      [
        questions
      ]
    );


  const visibleQuestions =
    useMemo(
      () => {

        const search =
          filterSubject
            .trim()
            .toLowerCase();


        return questions.filter(
          item => {

            if (
              filterAuthority !==
                'all' &&
              item.exam_authority !==
                filterAuthority
            ) {

              return false;
            }


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
              !search
            ) {

              return true;
            }


            return [
              item.exam_authority || '',
              item.exam_name || '',
              item.state_name || '',
              item.paper_name || '',
              item.subject,
              item.topic || '',
              item.subtopic || '',
              item.question
            ]
              .join(
                ' '
              )
              .toLowerCase()
              .includes(
                search
              );
          }
        );

      },
      [
        questions,
        filterAuthority,
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
          EXAMINATION SOURCE
      ===================================== */}

      <section
        className="panel"
      >

        <span
          className="eyebrow"
        >
          MAINS PREVIOUS YEAR PAPERS
        </span>


        <h2>
          UPSC + State PSC PYQ Manager
        </h2>


        <p>
          Store previous-year Mains questions from UPSC
          and State Public Service Commissions in one archive.
        </p>


        <div
          style={{
            display:
              'grid',

            gridTemplateColumns:
              'repeat(auto-fit, minmax(160px, 1fr))',

            gap:
              '10px',

            marginTop:
              '14px'
          }}
        >

          <button
            type="button"
            className={
              examMode ===
                'upsc'
                ? 'filter active'
                : 'filter'
            }
            onClick={() =>
              setExamMode(
                'upsc'
              )
            }
          >
            UPSC
          </button>


          <button
            type="button"
            className={
              examMode ===
                'state'
                ? 'filter active'
                : 'filter'
            }
            onClick={() =>
              setExamMode(
                'state'
              )
            }
          >
            State PSC
          </button>

        </div>

      </section>


      {/* =====================================
          EXAM + PAPER DETAILS
      ===================================== */}

      <section
        className="panel admin-form"
      >

        <div
          style={{
            display:
              'grid',

            gridTemplateColumns:
              'repeat(auto-fit, minmax(190px, 1fr))',

            gap:
              '12px'
          }}
        >

          <label>

            Examination Authority

            <input
              value={
                examAuthority
              }
              onChange={
                event =>
                  setExamAuthority(
                    event
                      .target
                      .value
                  )
              }
              placeholder="UPSC / MPSC / MPPSC / UPPSC"
            />

          </label>


          <label>

            Examination Name

            <input
              value={
                examName
              }
              onChange={
                event =>
                  setExamName(
                    event
                      .target
                      .value
                  )
              }
              placeholder="Civil Services Examination"
            />

          </label>


          {examMode ===
            'state' && (

            <label>

              State / UT

              <input
                value={
                  stateName
                }
                onChange={
                  event =>
                    setStateName(
                      event
                        .target
                        .value
                    )
                }
                placeholder="Maharashtra"
              />

            </label>

          )}


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
            />

          </label>

        </div>


        {examMode ===
          'upsc' ? (

          <div
            style={{
              display:
                'grid',

              gridTemplateColumns:
                'repeat(auto-fit, minmax(110px, 1fr))',

              gap:
                '8px',

              marginTop:
                '16px'
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
                    upscTab ===
                      value
                      ? 'filter active'
                      : 'filter'
                  }
                  onClick={() =>
                    setUpscTab(
                      value
                    )
                  }
                >
                  {label}
                </button>

              )
            )}

          </div>

        ) : (

          <div
            style={{
              display:
                'grid',

              gridTemplateColumns:
                'repeat(auto-fit, minmax(190px, 1fr))',

              gap:
                '12px',

              marginTop:
                '16px'
            }}
          >

            <label>

              Paper Type

              <select
                value={
                  statePaperType
                }
                onChange={
                  event =>
                    setStatePaperType(
                      event
                        .target
                        .value as
                          PaperType
                    )
                }
              >

                <option value="gs">
                  General Studies
                </option>

                <option value="essay">
                  Essay
                </option>

                <option value="optional">
                  Optional
                </option>

                <option value="language">
                  Language
                </option>

                <option value="other">
                  Other Paper
                </option>

              </select>

            </label>


            <label>

              Paper Name

              <input
                value={
                  statePaperName
                }
                onChange={
                  event =>
                    setStatePaperName(
                      event
                        .target
                        .value
                    )
                }
                placeholder="General Studies-I / GS-V / Marathi"
              />

            </label>

          </div>

        )}


        {currentPaperType ===
          'optional' && (

          <div
            style={{
              display:
                'grid',

              gridTemplateColumns:
                'repeat(auto-fit, minmax(190px, 1fr))',

              gap:
                '12px',

              marginTop:
                '12px'
            }}
          >

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

      </section>


      {/* =====================================
          QUESTION FORM
      ===================================== */}

      <form
        className="panel admin-form"
        onSubmit={
          saveQuestion
        }
      >

        <h3>
          Add Question
        </h3>


        <p>
          {examAuthority}
          {' • '}
          {examName}
          {' • '}
          {year}
          {' • '}
          {currentPaperName ||
            'Paper'}
        </p>


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

          {currentPaperType ===
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

                <option value="Section A">
                  Section A
                </option>

                <option value="Section B">
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
              placeholder="Modern India"
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
              placeholder="Social Reform Movement"
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
              placeholder="1 / 3(a)"
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

              <option value="draft">
                Draft
              </option>

              <option value="published">
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

              <option value="draft">
                Draft / Incomplete
              </option>

              <option value="published">
                Published / Complete
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

          Exact Question

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
            placeholder="Paste the exact question from the official paper."
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

          Official Source URL

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
            placeholder="Official commission question-paper URL"
          />

        </label>


        <div
          style={{
            marginTop:
              '14px'
          }}
        >

          <strong>
            Relevant to UPSC GS
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
            State PSC and Optional questions can also be tagged
            for useful UPSC GS overlap.
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
                      relevantGsPapers
                        .includes(
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
          SAVED PYQs
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
              Universal question archive
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
                filterAuthority
              }
              onChange={
                event =>
                  setFilterAuthority(
                    event
                      .target
                      .value
                  )
              }
            >

              <option value="all">
                All commissions
              </option>


              {authorities.map(
                authority => (

                  <option
                    key={
                      authority
                    }
                    value={
                      authority
                    }
                  >
                    {authority}
                  </option>

                )
              )}

            </select>


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

              <option value="all">
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
              placeholder="Search paper / subject / topic"
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
                200
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

                          {item.exam_authority ||
                            'UPSC'}

                          {' • '}

                          {item.pyq_year}

                          {' • '}

                          {item.paper_name ||
                            item.gs_paper ||
                            'Paper'}

                        </strong>


                        <span>
                          {item.status}
                        </span>

                      </div>


                      <small
                        style={{
                          color:
                            '#94a3b8'
                        }}
                      >

                        {item.exam_name ||
                          'Civil Services Examination'}

                        {item.state_name
                          ? ` • ${item.state_name}`
                          : ''}

                      </small>


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
                            Publish
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

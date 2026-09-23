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


type QuestionStatus =
  | 'draft'
  | 'published';


type PaperStatus =
  | 'draft'
  | 'published';


type MainsOrigin =
  | 'cse'
  | 'upsc'
  | 'state';


type PyqRow = {
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

  topic:
    string | null;

  subtopic:
    string | null;

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

  status:
    | 'draft'
    | 'published'
    | 'archived';

  created_at: string;
};


type MainsAppearance = {
  appearance_id?: string | null;
  appearance_type?: string | null;
  question_number?: string | null;
  marks?: number | null;
  word_limit?: number | null;

  exam_paper_id?: string | null;

  exam_family?: string | null;
  commission?: string | null;
  state?: string | null;

  exam_name?: string | null;
  exam_cycle?: string | null;

  year?: number | null;
  stage?: string | null;
  paper?: string | null;
};


type MainsMatch = {
  question_id: string;
  question: string;
  subject: string;
  topic: string | null;
  subtopic: string | null;
  status: string;
  appearance_count: number;
  appearances: MainsAppearance[];
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


function safeNumberOrNull(
  value:
    string
) {

  const trimmed =
    value.trim();


  if (!trimmed) {

    return null;
  }


  const numericValue =
    Number(
      trimmed
    );


  return Number.isFinite(
    numericValue
  )
    ? numericValue
    : null;
}


function safeIntegerOrNull(
  value:
    string
) {

  const numericValue =
    safeNumberOrNull(
      value
    );


  if (
    numericValue ===
    null
  ) {

    return null;
  }


  return Math.trunc(
    numericValue
  );
}


function legacyPaperName(
  item:
    PyqRow
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
      )
      .trim() ||
      'Optional';
  }


  return item.gs_paper ||
    'GS';
}


function appearanceLabel(
  appearance:
    MainsAppearance
) {

  const parts = [

    appearance.commission ||
      appearance.exam_family ||
      'Exam',

    appearance.state ||
      null,

    appearance.exam_name ||
      null,

    appearance.year !==
      null &&
    appearance.year !==
      undefined
      ? String(
          appearance.year
        )
      : null,

    appearance.paper ||
      null,

    appearance.question_number
      ? `Q${appearance.question_number}`
      : null,

    appearance.marks !==
      null &&
    appearance.marks !==
      undefined
      ? `${appearance.marks} marks`
      : null,

    appearance.word_limit !==
      null &&
    appearance.word_limit !==
      undefined
      ? `${appearance.word_limit} words`
      : null

  ].filter(
    Boolean
  );


  return parts.join(
    ' • '
  );
}


function parseMainsMatches(
  data:
    unknown
):
  MainsMatch[] {

  if (
    !Array.isArray(
      data
    )
  ) {

    return [];
  }


  return (
    data as Array<
      Record<
        string,
        unknown
      >
    >
  ).map(
    item => ({

      question_id:
        String(
          item.question_id
        ),

      question:
        String(
          item.question ||
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

      subtopic:
        item.subtopic
          ? String(
              item.subtopic
            )
          : null,

      status:
        String(
          item.status ||
          ''
        ),

      appearance_count:
        Number(
          item.appearance_count ||
          0
        ),

      appearances:
        Array.isArray(
          item.appearances
        )
          ? item.appearances as
              MainsAppearance[]
          : []

    })
  );
}


function parseArchiveAppearanceRows(
  data:
    unknown
):
  Record<
    string,
    MainsAppearance[]
  > {

  const grouped:
    Record<
      string,
      MainsAppearance[]
    > = {};


  if (
    !Array.isArray(
      data
    )
  ) {

    return grouped;
  }


  for (
    const rawRow of
      data as Array<
        Record<
          string,
          unknown
        >
      >
  ) {

    const questionId =
      rawRow.question_id
        ? String(
            rawRow.question_id
          )
        : '';


    if (!questionId) {

      continue;
    }


    const rawExamPaper =
      Array.isArray(
        rawRow.exam_papers
      )
        ? rawRow.exam_papers[0]
        : rawRow.exam_papers;


    const examPaper =
      rawExamPaper &&
      typeof rawExamPaper ===
        'object'
        ? rawExamPaper as
            Record<
              string,
              unknown
            >
        : {};


    const rawYear =
      examPaper.exam_year;


    const parsedYear =
      rawYear !==
        null &&
      rawYear !==
        undefined &&
      Number.isFinite(
        Number(
          rawYear
        )
      )
        ? Number(
            rawYear
          )
        : null;


    const rawMarks =
      rawRow.marks;


    const parsedMarks =
      rawMarks !==
        null &&
      rawMarks !==
        undefined &&
      Number.isFinite(
        Number(
          rawMarks
        )
      )
        ? Number(
            rawMarks
          )
        : null;


    const rawWordLimit =
      rawRow.word_limit;


    const parsedWordLimit =
      rawWordLimit !==
        null &&
      rawWordLimit !==
        undefined &&
      Number.isFinite(
        Number(
          rawWordLimit
        )
      )
        ? Number(
            rawWordLimit
          )
        : null;


    const appearance:
      MainsAppearance = {

        appearance_id:
          rawRow.id
            ? String(
                rawRow.id
              )
            : null,

        appearance_type:
          rawRow.appearance_type
            ? String(
                rawRow.appearance_type
              )
            : null,

        question_number:
          rawRow.question_number
            ? String(
                rawRow.question_number
              )
            : null,

        marks:
          parsedMarks,

        word_limit:
          parsedWordLimit,

        exam_paper_id:
          examPaper.id
            ? String(
                examPaper.id
              )
            : null,

        exam_family:
          examPaper.exam_family
            ? String(
                examPaper.exam_family
              )
            : null,

        commission:
          examPaper.commission
            ? String(
                examPaper.commission
              )
            : null,

        state:
          examPaper.state
            ? String(
                examPaper.state
              )
            : null,

        exam_name:
          examPaper.exam_name
            ? String(
                examPaper.exam_name
              )
            : null,

        exam_cycle:
          examPaper.exam_cycle
            ? String(
                examPaper.exam_cycle
              )
            : null,

        year:
          parsedYear,

        stage:
          examPaper.exam_stage
            ? String(
                examPaper.exam_stage
              )
            : null,

        paper:
          examPaper.paper
            ? String(
                examPaper.paper
              )
            : null

      };


    if (
      !grouped[
        questionId
      ]
    ) {

      grouped[
        questionId
      ] = [];
    }


    grouped[
      questionId
    ].push(
      appearance
    );
  }


  for (
    const appearances of
      Object.values(
        grouped
      )
  ) {

    appearances.sort(
      (
        first,
        second
      ) =>

        (
          second.year ||
          0
        ) -
        (
          first.year ||
          0
        )
    );
  }


  return grouped;
}


export function MainsPyqManager() {

  /*
   * =========================================
   * EXAM / PAPER
   * =========================================
   */

  const [
    origin,
    setOrigin
  ] =
    useState<MainsOrigin>(
      'cse'
    );


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
    essaySection,
    setEssaySection
  ] =
    useState(
      'Section A'
    );


  /*
   * OTHER UPSC
   */

  const [
    upscExamName,
    setUpscExamName
  ] =
    useState('');


  const [
    upscExamCycle,
    setUpscExamCycle
  ] =
    useState('');


  const [
    upscExamStage,
    setUpscExamStage
  ] =
    useState(
      'Mains'
    );


  const [
    upscExamPaper,
    setUpscExamPaper
  ] =
    useState('');


  /*
   * STATE PSC
   */

  const [
    statePscState,
    setStatePscState
  ] =
    useState(
      'Maharashtra'
    );


  const [
    statePscName,
    setStatePscName
  ] =
    useState(
      'MPSC'
    );


  const [
    statePscExamName,
    setStatePscExamName
  ] =
    useState(
      'State Services Examination'
    );


  const [
    statePscCycle,
    setStatePscCycle
  ] =
    useState('');


  const [
    statePscStage,
    setStatePscStage
  ] =
    useState(
      'Mains'
    );


  const [
    statePscPaper,
    setStatePscPaper
  ] =
    useState(
      'GS-II'
    );


  /*
   * =========================================
   * MASTER QUESTION
   * =========================================
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
    question,
    setQuestion
  ] =
    useState('');


  /*
   * =========================================
   * CURRENT APPEARANCE
   * =========================================
   */

  const [
    questionNumber,
    setQuestionNumber
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
    useState<
      string[]
    >([]);


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
   * =========================================
   * UI STATE
   * =========================================
   */

  const [
    saving,
    setSaving
  ] =
    useState(
      false
    );


  const [
    checking,
    setChecking
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
    message,
    setMessage
  ] =
    useState('');


  const [
    matches,
    setMatches
  ] =
    useState<
      MainsMatch[]
    >([]);


  const [
    questions,
    setQuestions
  ] =
    useState<
      PyqRow[]
    >([]);


  const [
    filterYear,
    setFilterYear
  ] =
    useState(
      'all'
    );


  const [
    filterCommission,
    setFilterCommission
  ] =
    useState(
      'all'
    );


  const [
    filterPaper,
    setFilterPaper
  ] =
    useState(
      'all'
    );


  const [
    archiveSort,
    setArchiveSort
  ] =
    useState(
      'latest'
    );


  const [
    filterLinkStatus,
    setFilterLinkStatus
  ] =
    useState(
      'all'
    );


  const [
    filterSubject,
    setFilterSubject
  ] =
    useState('');


  const [
    expandedQuestionId,
    setExpandedQuestionId
  ] =
    useState<
      string |
      null
    >(
      null
    );


  const [
    archiveAppearances,
    setArchiveAppearances
  ] =
    useState<
      Record<
        string,
        MainsAppearance[]
      >
    >({});


  const [
    loadingAppearanceId,
    setLoadingAppearanceId
  ] =
    useState<
      string |
      null
    >(
      null
    );


  const [
    editingAppearanceId,
    setEditingAppearanceId
  ] =
    useState<
      string |
      null
    >(
      null
    );


  const [
    appearanceActionId,
    setAppearanceActionId
  ] =
    useState<
      string |
      null
    >(
      null
    );


  const [
    repairingQuestionId,
    setRepairingQuestionId
  ] =
    useState<
      string |
      null
    >(
      null
    );


  const [
    appearanceEditQuestionNumber,
    setAppearanceEditQuestionNumber
  ] =
    useState('');


  const [
    appearanceEditOriginalQuestion,
    setAppearanceEditOriginalQuestion
  ] =
    useState('');


  const [
    appearanceEditMarks,
    setAppearanceEditMarks
  ] =
    useState('');


  const [
    appearanceEditWordLimit,
    setAppearanceEditWordLimit
  ] =
    useState('');


  const [
    appearanceEditSource,
    setAppearanceEditSource
  ] =
    useState('');


  const [
    appearanceEditSourceUrl,
    setAppearanceEditSourceUrl
  ] =
    useState('');


  const [
    appearanceEditNotes,
    setAppearanceEditNotes
  ] =
    useState('');


  /*
   * =========================================
   * DERIVED VALUES
   * =========================================
   */

  const numericYear =
    Number(
      year
    );


  const sectionType:
    'essay' |
    'gs' |
    'optional' =
      paperTab ===
        'essay'
        ? 'essay'
        : paperTab ===
            'optional'
          ? 'optional'
          : 'gs';


  const currentPaperName =
    origin ===
      'cse'
      ? paperLabel(
          paperTab,
          optionalSubject,
          optionalPaper
        )
      : origin ===
          'upsc'
        ? upscExamPaper.trim()
        : statePscPaper.trim();


  const currentSourceName =
    origin ===
      'state'
      ? (
          statePscName.trim() ||
          'State PSC'
        )
      : 'UPSC';


  /*
   * =========================================
   * LOAD LEGACY MASTER ARCHIVE
   * =========================================
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
          250
        );


    if (error) {

      setMessage(
        error.message
      );

      setLoading(
        false
      );

      return;
    }


    const loadedQuestions =
      (
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
        )
      ) as
        PyqRow[];


    setQuestions(
      loadedQuestions
    );


    const questionIds =
      loadedQuestions.map(
        item =>
          item.id
      );


    if (
      questionIds.length >
      0
    ) {

      const {
        data:
          appearanceData,
        error:
          appearanceError
      } =
        await supabase
          .from(
            'mains_question_appearances'
          )
          .select(
            `
              id,
              question_id,
              appearance_type,
              question_number,
              marks,
              word_limit,
              exam_papers (
                id,
                exam_family,
                commission,
                state,
                exam_name,
                exam_cycle,
                exam_year,
                exam_stage,
                paper
              )
            `
          )
          .in(
            'question_id',
            questionIds
          )
          .order(
            'created_at',
            {
              ascending:
                false
            }
          );


      if (
        appearanceError
      ) {

        setMessage(
          `Master questions loaded, but canonical appearance filters could not be prepared: ${appearanceError.message}`
        );

      } else {

        setArchiveAppearances(
          parseArchiveAppearanceRows(
            appearanceData
          )
        );
      }

    } else {

      setArchiveAppearances(
        {}
      );
    }


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
   * =========================================
   * PAPER DEFAULTS
   * =========================================
   */

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

        setWordLimit(
          ''
        );

      } else if (
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

      } else {

        setMarks(
          '10'
        );

        setWordLimit(
          '150'
        );
      }

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


  /*
   * =========================================
   * HELPERS
   * =========================================
   */

  function toggleRelevantGs(
    paper:
      string
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
    setMatches([]);
  }


  function prepareAnotherAppearance(
    item:
      PyqRow
  ) {

    if (
      item.section_type ===
      'essay'
    ) {

      setPaperTab(
        'essay'
      );

    } else if (
      item.section_type ===
      'optional'
    ) {

      setPaperTab(
        'optional'
      );


      if (
        item.optional_subject
      ) {

        setOptionalSubject(
          item.optional_subject
        );
      }


      if (
        item.optional_paper ===
          'Paper-I' ||
        item.optional_paper ===
          'Paper-II'
      ) {

        setOptionalPaper(
          item.optional_paper
        );
      }

    } else {

      const nextGsPaper:
        PaperTab =
          item.gs_paper ===
            'GS-II' ||
          item.gs_paper ===
            'GS-III' ||
          item.gs_paper ===
            'GS-IV'
            ? item.gs_paper
            : 'GS-I';


      setPaperTab(
        nextGsPaper
      );
    }


    setSubject(
      item.subject
    );

    setTopic(
      item.topic ||
      ''
    );

    setSubtopic(
      item.subtopic ||
      ''
    );

    setRelevantGsPapers(
      item.relevant_gs_papers ||
      []
    );


    /*
     * Appearance-specific fields must be entered
     * for the NEW paper/year, so do not copy the
     * old question number, marks or word limit.
     */

    setQuestion(
      item.question
    );

    setQuestionNumber('');
    setMarks('');
    setWordLimit('');
    setSourceUrl('');

    setMatches([]);


    setMessage(
      'Master question loaded. Now choose the new exam, year and paper, then enter that appearance\'s question number, marks and word limit.'
    );


    window.requestAnimationFrame(
      () => {

        document
          .getElementById(
            'mains-pyq-entry-form'
          )
          ?.scrollIntoView({
            behavior:
              'smooth',
            block:
              'start'
          });

      }
    );
  }


  function validateCurrentPaper() {

    if (
      !Number.isInteger(
        numericYear
      ) ||
      numericYear <
        1950 ||
      numericYear >
        2100
    ) {

      return 'Enter a valid examination year.';
    }


    if (
      !subject.trim()
    ) {

      return 'Enter the subject.';
    }


    if (
      !question.trim()
    ) {

      return 'Enter the exact Mains question.';
    }


    if (
      paperTab ===
        'optional' &&
      (
        !optionalSubject ||
        !optionalPaper
      )
    ) {

      return 'Select Optional Subject and Paper.';
    }


    if (
      origin ===
      'upsc'
    ) {

      if (
        !upscExamName.trim()
      ) {

        return 'Enter the UPSC examination name.';
      }


      if (
        !upscExamPaper.trim()
      ) {

        return 'Enter the UPSC paper name.';
      }
    }


    if (
      origin ===
      'state'
    ) {

      if (
        !statePscState.trim()
      ) {

        return 'Enter the State / UT.';
      }


      if (
        !statePscName.trim()
      ) {

        return 'Enter the PSC name.';
      }


      if (
        !statePscExamName.trim()
      ) {

        return 'Enter the State PSC examination name.';
      }


      if (
        !statePscPaper.trim()
      ) {

        return 'Enter the State PSC paper name.';
      }
    }


    return null;
  }


  function buildAppearanceMetadata() {

    const common = {

      source:
        currentSourceName,

      source_url:
        sourceUrl.trim() ||
        null,

      status:
        paperStatus
    };


    if (
      origin ===
      'cse'
    ) {

      return {

        ...common,

        pyq_year:
          String(
            numericYear
          ),

        exam_stage:
          'mains',

        paper:
          currentPaperName
      };
    }


    if (
      origin ===
      'upsc'
    ) {

      return {

        ...common,

        upsc_exam_name:
          upscExamName.trim(),

        upsc_exam_cycle:
          upscExamCycle.trim() ||
          null,

        upsc_exam_year:
          String(
            numericYear
          ),

        upsc_exam_stage:
          upscExamStage.trim() ||
          'Mains',

        upsc_exam_paper:
          upscExamPaper.trim()
      };
    }


    return {

      ...common,

      state_psc_state:
        statePscState.trim(),

      state_psc_name:
        statePscName.trim(),

      state_psc_exam_name:
        statePscExamName.trim(),

      state_psc_cycle:
        statePscCycle.trim() ||
        null,

      state_psc_year:
        String(
          numericYear
        ),

      state_psc_stage:
        statePscStage.trim() ||
        'Mains',

      state_psc_paper:
        statePscPaper.trim()
    };
  }


  async function findExistingMatches(
    showMessage:
      boolean
  ):
    Promise<
      MainsMatch[]
    > {

    if (!supabase) {

      if (showMessage) {

        setMessage(
          'Supabase is not configured.'
        );
      }

      return [];
    }


    if (
      !question.trim()
    ) {

      if (showMessage) {

        setMessage(
          'Enter a Mains question first.'
        );
      }

      return [];
    }


    setChecking(
      true
    );


    const {
      data,
      error
    } =
      await supabase
        .rpc(
          'find_mains_question_matches',
          {
            p_question:
              question.trim()
          }
        );


    setChecking(
      false
    );


    if (error) {

      if (showMessage) {

        setMessage(
          error.message
        );
      }

      return [];
    }


    const found =
      parseMainsMatches(
        data
      );


    setMatches(
      found
    );


    if (showMessage) {

      setMessage(
        found.length >
          0
          ? `Found ${found.length} existing master question${found.length === 1 ? '' : 's'}. You can link this paper instead of creating a duplicate.`
          : 'No exact existing master question found. This can be saved as a new master question.'
      );
    }


    return found;
  }


  async function toggleArchiveAppearances(
    item:
      PyqRow
  ) {

    if (!supabase) {

      setMessage(
        'Supabase is not configured.'
      );

      return;
    }


    if (
      expandedQuestionId ===
      item.id
    ) {

      setExpandedQuestionId(
        null
      );

      return;
    }


    setExpandedQuestionId(
      item.id
    );


    if (
      archiveAppearances[
        item.id
      ]
    ) {

      return;
    }


    setLoadingAppearanceId(
      item.id
    );


    const {
      data,
      error
    } =
      await supabase
        .rpc(
          'find_mains_question_matches',
          {
            p_question:
              item.question
          }
        );


    setLoadingAppearanceId(
      null
    );


    if (error) {

      setMessage(
        error.message
      );

      return;
    }


    const exactMatch =
      parseMainsMatches(
        data
      ).find(
        match =>
          match.question_id ===
          item.id
      );


    setArchiveAppearances(
      current => ({

        ...current,

        [item.id]:
          exactMatch
            ?.appearances ||
          []

      })
    );
  }


  function resetAppearanceEditor() {

    setEditingAppearanceId(
      null
    );

    setAppearanceEditQuestionNumber('');
    setAppearanceEditOriginalQuestion('');
    setAppearanceEditMarks('');
    setAppearanceEditWordLimit('');
    setAppearanceEditSource('');
    setAppearanceEditSourceUrl('');
    setAppearanceEditNotes('');
  }


  async function reloadArchiveAppearances(
    item:
      PyqRow
  ) {

    if (!supabase) {

      return;
    }


    setLoadingAppearanceId(
      item.id
    );


    const {
      data,
      error
    } =
      await supabase
        .rpc(
          'find_mains_question_matches',
          {
            p_question:
              item.question
          }
        );


    setLoadingAppearanceId(
      null
    );


    if (error) {

      setMessage(
        error.message
      );

      return;
    }


    const exactMatch =
      parseMainsMatches(
        data
      ).find(
        match =>
          match.question_id ===
          item.id
      );


    setArchiveAppearances(
      current => ({

        ...current,

        [item.id]:
          exactMatch
            ?.appearances ||
          []

      })
    );
  }


  async function startEditAppearance(
    item:
      PyqRow,
    appearance:
      MainsAppearance
  ) {

    if (!supabase) {

      setMessage(
        'Supabase is not configured.'
      );

      return;
    }


    const appearanceId =
      appearance
        .appearance_id;


    if (!appearanceId) {

      setMessage(
        'This appearance does not have a valid ID.'
      );

      return;
    }


    setAppearanceActionId(
      appearanceId
    );


    const {
      data,
      error
    } =
      await supabase
        .from(
          'mains_question_appearances'
        )
        .select(
          `
            id,
            question_number,
            original_question,
            marks,
            word_limit,
            source,
            source_url,
            notes
          `
        )
        .eq(
          'id',
          appearanceId
        )
        .single();


    setAppearanceActionId(
      null
    );


    if (
      error ||
      !data
    ) {

      setMessage(
        error?.message ||
        'Unable to load the appearance.'
      );

      return;
    }


    setEditingAppearanceId(
      appearanceId
    );


    setAppearanceEditQuestionNumber(
      data.question_number
        ? String(
            data.question_number
          )
        : ''
    );


    setAppearanceEditOriginalQuestion(
      data.original_question
        ? String(
            data.original_question
          )
        : item.question
    );


    setAppearanceEditMarks(
      data.marks !==
        null &&
      data.marks !==
        undefined
        ? String(
            data.marks
          )
        : ''
    );


    setAppearanceEditWordLimit(
      data.word_limit !==
        null &&
      data.word_limit !==
        undefined
        ? String(
            data.word_limit
          )
        : ''
    );


    setAppearanceEditSource(
      data.source
        ? String(
            data.source
          )
        : ''
    );


    setAppearanceEditSourceUrl(
      data.source_url
        ? String(
            data.source_url
          )
        : ''
    );


    setAppearanceEditNotes(
      data.notes
        ? String(
            data.notes
          )
        : ''
    );


    setMessage(
      'Edit only this appearance. The master question will remain unchanged.'
    );
  }


  async function saveAppearanceEdit(
    item:
      PyqRow
  ) {

    if (
      !supabase ||
      !editingAppearanceId
    ) {

      return;
    }


    const appearanceId =
      editingAppearanceId;


    setAppearanceActionId(
      appearanceId
    );


    const cleanOriginalQuestion =
      appearanceEditOriginalQuestion
        .trim();


    const {
      error
    } =
      await supabase
        .rpc(
          'update_mains_question_appearance',
          {

            p_appearance_id:
              appearanceId,

            p_question_number:
              appearanceEditQuestionNumber
                .trim() ||
              null,

            p_original_question:
              cleanOriginalQuestion &&
              cleanOriginalQuestion !==
                item.question.trim()
                ? cleanOriginalQuestion
                : null,

            p_marks:
              safeNumberOrNull(
                appearanceEditMarks
              ),

            p_word_limit:
              safeIntegerOrNull(
                appearanceEditWordLimit
              ),

            p_source:
              appearanceEditSource
                .trim() ||
              null,

            p_source_url:
              appearanceEditSourceUrl
                .trim() ||
              null,

            p_notes:
              appearanceEditNotes
                .trim() ||
              null

          }
        );


    setAppearanceActionId(
      null
    );


    if (error) {

      setMessage(
        error.message
      );

      return;
    }


    resetAppearanceEditor();


    await reloadArchiveAppearances(
      item
    );


    setMessage(
      'Appearance updated successfully. The master question was not changed.'
    );
  }


  async function removeAppearance(
    item:
      PyqRow,
    appearance:
      MainsAppearance
  ) {

    if (!supabase) {

      setMessage(
        'Supabase is not configured.'
      );

      return;
    }


    const appearanceId =
      appearance
        .appearance_id;


    if (!appearanceId) {

      setMessage(
        'This appearance does not have a valid ID.'
      );

      return;
    }


    const confirmed =
      window.confirm(
        'Remove only this paper/year appearance? The master Mains question will remain in the archive.'
      );


    if (!confirmed) {

      return;
    }


    setAppearanceActionId(
      appearanceId
    );


    const {
      data,
      error
    } =
      await supabase
        .rpc(
          'delete_mains_question_appearance',
          {
            p_appearance_id:
              appearanceId
          }
        );


    setAppearanceActionId(
      null
    );


    if (error) {

      setMessage(
        error.message
      );

      return;
    }


    if (
      editingAppearanceId ===
      appearanceId
    ) {

      resetAppearanceEditor();
    }


    await reloadArchiveAppearances(
      item
    );


    const result =
      Array.isArray(
        data
      )
        ? data[0]
        : data;


    const remaining =
      result?.remaining_appearances !==
        undefined
        ? Number(
            result.remaining_appearances
          )
        : null;


    setMessage(
      remaining ===
        null
        ? 'Appearance removed. The master question was kept.'
        : `Appearance removed. ${remaining} appearance${remaining === 1 ? '' : 's'} remain for this master question.`
    );
  }


  async function repairMissingCanonicalLink(
    item:
      PyqRow
  ) {

    if (!supabase) {

      setMessage(
        'Supabase is not configured.'
      );

      return;
    }


    if (
      item.pyq_year ===
        null ||
      item.pyq_year ===
        undefined
    ) {

      setMessage(
        'This legacy question has no PYQ year, so its canonical paper cannot be repaired automatically.'
      );

      return;
    }


    const existingAppearances =
      archiveAppearances[
        item.id
      ] || [];


    if (
      existingAppearances.length >
      0
    ) {

      setMessage(
        'This master question already has a canonical appearance.'
      );

      return;
    }


    setRepairingQuestionId(
      item.id
    );


    setMessage(
      'Repairing the canonical appearance from the legacy UPSC CSE fields...'
    );


    const {
      data,
      error
    } =
      await supabase
        .rpc(
          'link_existing_mains_question',
          {

            p_question_id:
              item.id,

            p_origin:
              'cse',

            p_metadata:
              {

                pyq_year:
                  String(
                    item.pyq_year
                  ),

                exam_stage:
                  'mains',

                paper:
                  legacyPaperName(
                    item
                  ),

                source:
                  'UPSC',

                status:
                  item.status

              },

            p_original_question:
              item.question,

            p_question_number:
              item.question_number,

            p_marks:
              item.marks,

            p_word_limit:
              item.word_limit,

            p_appearance_type:
              'original',

            p_notes:
              'Repaired from legacy Mains master-question fields'

          }
        );


    setRepairingQuestionId(
      null
    );


    if (error) {

      setMessage(
        error.message
      );

      return;
    }


    const result =
      Array.isArray(
        data
      )
        ? data[0]
        : data;


    const linkStatus =
      result?.link_status
        ? String(
            result.link_status
          )
        : 'linked';


    await loadQuestions();


    setMessage(
      linkStatus ===
        'already_linked'
        ? 'The canonical appearance already existed. Archive data has been refreshed.'
        : `Canonical appearance repaired successfully for ${item.pyq_year} ${legacyPaperName(item)}.`
    );
  }


  /*
   * =========================================
   * LEGACY UPSC CSE PAPER
   *
   * Kept only for the existing CSE archive
   * so old screens continue working.
   * =========================================
   */

  async function findOrCreateLegacyCsePaper(
    userId:
      string
  ) {

    if (
      !supabase ||
      origin !==
        'cse'
    ) {

      return null;
    }


    const paperType =
      paperTab ===
        'essay'
        ? 'essay'
        : paperTab ===
            'optional'
          ? 'optional'
          : 'gs';


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


    if (existingError) {

      throw existingError;
    }


    if (
      existing?.id
    ) {

      const {
        error:
          paperUpdateError
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
        paperUpdateError
      ) {

        throw paperUpdateError;
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
          'Unable to create legacy UPSC Mains paper.'
        )
      );
    }


    return String(
      created.id
    );
  }


  /*
   * =========================================
   * LINK EXISTING MASTER -> CURRENT PAPER
   * =========================================
   */

  async function linkMasterToCurrentPaper(
    questionId:
      string,
    appearanceType:
      'original' |
      'repeat'
  ) {

    if (!supabase) {

      throw new Error(
        'Supabase is not configured.'
      );
    }


    const metadata =
      buildAppearanceMetadata();


    const {
      data,
      error
    } =
      await supabase
        .rpc(
          'link_existing_mains_question',
          {

            p_question_id:
              questionId,

            p_origin:
              origin,

            p_metadata:
              metadata,

            p_original_question:
              question.trim(),

            p_question_number:
              questionNumber.trim() ||
              null,

            p_marks:
              safeNumberOrNull(
                marks
              ),

            p_word_limit:
              safeNumberOrNull(
                wordLimit
              ),

            p_appearance_type:
              appearanceType,

            p_notes:
              null
          }
        );


    if (error) {

      throw error;
    }


    const result =
      Array.isArray(
        data
      )
        ? data[0]
        : data;


    return result;
  }


  async function linkSelectedMatch(
    match:
      MainsMatch
  ) {

    const validationError =
      validateCurrentPaper();


    if (
      validationError
    ) {

      setMessage(
        validationError
      );

      return;
    }


    setSaving(
      true
    );


    setMessage(
      'Linking existing master question to this paper...'
    );


    try {

      const result =
        await linkMasterToCurrentPaper(
          match.question_id,
          'repeat'
        );


      const linkStatus =
        result?.link_status
          ? String(
              result.link_status
            )
          : 'linked';


      setMessage(
        linkStatus ===
          'already_linked'
          ? 'This master question is already linked to the selected paper and question number.'
          : `Existing master question linked successfully to ${currentSourceName} ${numericYear} ${currentPaperName}.`
      );


      clearQuestionFields();

      await loadQuestions();

    } catch (
      caughtError
    ) {

      setMessage(
        caughtError instanceof
          Error
          ? caughtError.message
          : 'Unable to link the existing Mains question.'
      );

    } finally {

      setSaving(
        false
      );
    }
  }


  /*
   * =========================================
   * SAVE
   *
   * 1. Find exact existing master.
   * 2. If found -> link another appearance.
   * 3. Otherwise -> create master + first appearance.
   * =========================================
   */

  async function saveQuestion(
    event:
      FormEvent
  ) {

    event.preventDefault();


    if (!supabase) {

      setMessage(
        'Supabase is not configured.'
      );

      return;
    }


    const validationError =
      validateCurrentPaper();


    if (
      validationError
    ) {

      setMessage(
        validationError
      );

      return;
    }


    setSaving(
      true
    );


    setMessage(
      'Checking for an existing Mains question...'
    );


    try {

      /*
       * ALWAYS CHECK BEFORE INSERTING.
       */

      const existingMatches =
        await findExistingMatches(
          false
        );


      if (
        existingMatches.length >
        0
      ) {

        const existing =
          existingMatches[0];


        const result =
          await linkMasterToCurrentPaper(
            existing.question_id,
            'repeat'
          );


        const linkStatus =
          result?.link_status
            ? String(
                result.link_status
              )
            : 'linked';


        setMessage(
          linkStatus ===
            'already_linked'
            ? 'This question is already linked to the selected paper. No duplicate was created.'
            : `Existing master question found and linked to ${currentSourceName} ${numericYear} ${currentPaperName}. No duplicate master question was created.`
        );


        clearQuestionFields();

        await loadQuestions();

        return;
      }


      /*
       * NEW MASTER QUESTION.
       */

      const {
        data: {
          user
        }
      } =
        await supabase
          .auth
          .getUser();


      if (!user) {

        throw new Error(
          'Admin session expired. Sign in again.'
        );
      }


      const legacyPaperId =
        await findOrCreateLegacyCsePaper(
          user.id
        );


      const cleanTags = [

        String(
          numericYear
        ),

        currentSourceName,

        currentPaperName,

        subject.trim(),

        topic.trim(),

        subtopic.trim(),

        'Mains PYQ'

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
              safeNumberOrNull(
                marks
              ),

            word_limit:
              safeNumberOrNull(
                wordLimit
              ),

            pyq_year:
              numericYear,

            pyq_paper_id:
              legacyPaperId,

            relevant_gs_papers:
              relevantGsPapers,

            source:
              currentSourceName,

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
            'Unable to save Mains master question.'
          )
        );
      }


      /*
       * FIRST GENERIC APPEARANCE.
       */

      try {

        await linkMasterToCurrentPaper(
          String(
            data.id
          ),
          'original'
        );

      } catch (
        linkError
      ) {

        const detail =
          linkError instanceof
            Error
            ? linkError.message
            : 'Unknown appearance-link error.';


        setMessage(
          `Master question was saved, but its paper appearance could not be linked: ${detail}`
        );


        await loadQuestions();

        return;
      }


      const created = {
        ...data,

        relevant_gs_papers:
          data.relevant_gs_papers ||
          []
      } as
        PyqRow;


      setQuestions(
        current => [
          created,
          ...current
        ]
      );


      clearQuestionFields();


      setMessage(
        `New master Mains question saved and linked to ${currentSourceName} ${numericYear} ${currentPaperName}.`
      );

    } catch (
      caughtError
    ) {

      setMessage(
        caughtError instanceof
          Error
          ? caughtError.message
          : 'Unable to save the Mains PYQ.'
      );

    } finally {

      setSaving(
        false
      );
    }
  }


  /*
   * =========================================
   * ARCHIVE FILTERS
   * =========================================
   */

  const years =
    useMemo(
      () => {

        const values =
          new Set<
            number
          >();


        for (
          const appearances of
            Object.values(
              archiveAppearances
            )
        ) {

          for (
            const appearance of
              appearances
          ) {

            if (
              typeof appearance.year ===
                'number'
            ) {

              values.add(
                appearance.year
              );
            }
          }
        }


        for (
          const item of
            questions
        ) {

          if (
            typeof item.pyq_year ===
              'number'
          ) {

            values.add(
              item.pyq_year
            );
          }
        }


        return Array.from(
          values
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
        archiveAppearances,
        questions
      ]
    );


  const commissions =
    useMemo(
      () =>

        Array.from(
          new Set(
            Object
              .values(
                archiveAppearances
              )
              .flat()
              .map(
                appearance =>
                  appearance.commission ||
                  appearance.exam_family ||
                  ''
              )
              .filter(
                Boolean
              )
          )
        ).sort(
          (
            first,
            second
          ) =>
            first.localeCompare(
              second
            )
        ),

      [
        archiveAppearances
      ]
    );


  const archivePapers =
    useMemo(
      () =>

        Array.from(
          new Set(
            Object
              .values(
                archiveAppearances
              )
              .flat()
              .map(
                appearance =>
                  appearance.paper ||
                  ''
              )
              .filter(
                Boolean
              )
          )
        ).sort(
          (
            first,
            second
          ) =>
            first.localeCompare(
              second
            )
        ),

      [
        archiveAppearances
      ]
    );


  const archiveStats =
    useMemo(
      () => {

        let totalAppearances =
          0;

        let repeatedMasters =
          0;

        let missingLinks =
          0;


        for (
          const item of
            questions
        ) {

          const count =
            (
              archiveAppearances[
                item.id
              ] || []
            ).length;


          totalAppearances +=
            count;


          if (
            count >=
            2
          ) {

            repeatedMasters +=
              1;
          }


          if (
            count ===
            0
          ) {

            missingLinks +=
              1;
          }
        }


        return {

          masters:
            questions.length,

          totalAppearances,

          repeatedMasters,

          missingLinks

        };

      },
      [
        questions,
        archiveAppearances
      ]
    );


  const visibleQuestions =
    useMemo(
      () => {

        const subjectQuery =
          filterSubject
            .trim()
            .toLowerCase();


        const filtered =
          questions.filter(
            item => {

              const appearances =
                archiveAppearances[
                  item.id
                ] || [];


              if (
                filterLinkStatus ===
                  'missing' &&
                appearances.length !==
                  0
              ) {

                return false;
              }


              if (
                filterLinkStatus ===
                  'single' &&
                appearances.length !==
                  1
              ) {

                return false;
              }


              if (
                filterLinkStatus ===
                  'repeated' &&
                appearances.length <
                  2
              ) {

                return false;
              }


              const hasCanonicalFilter =
                filterYear !==
                  'all' ||
                filterCommission !==
                  'all' ||
                filterPaper !==
                  'all';


              if (
                hasCanonicalFilter
              ) {

                const matchesAppearance =
                  appearances.some(
                    appearance => {

                      const appearanceCommission =
                        appearance.commission ||
                        appearance.exam_family ||
                        '';


                      return (
                        (
                          filterYear ===
                            'all' ||
                          String(
                            appearance.year
                          ) ===
                            filterYear
                        ) &&
                        (
                          filterCommission ===
                            'all' ||
                          appearanceCommission ===
                            filterCommission
                        ) &&
                        (
                          filterPaper ===
                            'all' ||
                          appearance.paper ===
                            filterPaper
                        )
                      );
                    }
                  );


                /*
                 * Legacy fallback:
                 * if a master has no canonical appearance yet,
                 * the old pyq_year can still satisfy a year-only
                 * filter. Commission / paper filters require the
                 * canonical appearance records.
                 */

                const legacyYearOnlyMatch =
                  appearances.length ===
                    0 &&
                  filterCommission ===
                    'all' &&
                  filterPaper ===
                    'all' &&
                  filterYear !==
                    'all' &&
                  String(
                    item.pyq_year
                  ) ===
                    filterYear;


                if (
                  !matchesAppearance &&
                  !legacyYearOnlyMatch
                ) {

                  return false;
                }
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


        const latestYear = (
          item:
            PyqRow
        ) => {

          const appearances =
            archiveAppearances[
              item.id
            ] || [];


          const canonicalYears =
            appearances
              .map(
                appearance =>
                  appearance.year
              )
              .filter(
                (
                  year
                ):
                  year is number =>
                    typeof year ===
                      'number'
              );


          if (
            canonicalYears.length >
            0
          ) {

            return Math.max(
              ...canonicalYears
            );
          }


          return item.pyq_year ||
            0;
        };


        const appearanceCount = (
          item:
            PyqRow
        ) =>
          (
            archiveAppearances[
              item.id
            ] || []
          ).length;


        return filtered.sort(
          (
            first,
            second
          ) => {

            if (
              archiveSort ===
              'oldest'
            ) {

              return (
                latestYear(
                  first
                ) -
                latestYear(
                  second
                )
              );
            }


            if (
              archiveSort ===
              'most_appearances'
            ) {

              const countDifference =
                appearanceCount(
                  second
                ) -
                appearanceCount(
                  first
                );


              if (
                countDifference !==
                0
              ) {

                return countDifference;
              }
            }


            return (
              latestYear(
                second
              ) -
              latestYear(
                first
              )
            );

          }
        );

      },
      [
        questions,
        archiveAppearances,
        filterYear,
        filterCommission,
        filterPaper,
        filterSubject,
        filterLinkStatus,
        archiveSort
      ]
    );


  /*
   * =========================================
   * RENDER
   * =========================================
   */

  return (

    <section
      style={{
        display:
          'grid',
        gap:
          '16px'
      }}
    >

      <section
        className="panel"
      >

        <span
          className="eyebrow"
        >
          MAINS PYQ ARCHIVE
        </span>


        <h2>
          Add UPSC and State PSC Mains PYQs
        </h2>


        <p>
          One master question can now be linked to multiple years,
          multiple papers and multiple commissions without creating
          duplicate question records.
        </p>


        <div
          style={{
            display:
              'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(150px, 1fr))',
            gap:
              '8px',
            marginTop:
              '14px'
          }}
        >

          <button
            type="button"
            className={
              origin ===
                'cse'
                ? 'filter active'
                : 'filter'
            }
            onClick={() =>
              setOrigin(
                'cse'
              )
            }
          >
            UPSC CSE
          </button>


          <button
            type="button"
            className={
              origin ===
                'upsc'
                ? 'filter active'
                : 'filter'
            }
            onClick={() =>
              setOrigin(
                'upsc'
              )
            }
          >
            Other UPSC
          </button>


          <button
            type="button"
            className={
              origin ===
                'state'
                ? 'filter active'
                : 'filter'
            }
            onClick={() =>
              setOrigin(
                'state'
              )
            }
          >
            State PSC
          </button>

        </div>


        <div
          style={{
            display:
              'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(110px, 1fr))',
            gap:
              '8px',
            marginTop:
              '10px'
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


      <form
        id="mains-pyq-entry-form"
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


          {origin ===
            'upsc' && (

            <>
              <label>
                UPSC Exam Name

                <input
                  value={
                    upscExamName
                  }
                  onChange={
                    event =>
                      setUpscExamName(
                        event
                          .target
                          .value
                      )
                  }
                  placeholder="CAPF (AC), CDS, ESE..."
                  required
                />
              </label>


              <label>
                Exam Cycle

                <input
                  value={
                    upscExamCycle
                  }
                  onChange={
                    event =>
                      setUpscExamCycle(
                        event
                          .target
                          .value
                      )
                  }
                  placeholder="Optional cycle / notification"
                />
              </label>


              <label>
                Stage

                <input
                  value={
                    upscExamStage
                  }
                  onChange={
                    event =>
                      setUpscExamStage(
                        event
                          .target
                          .value
                      )
                  }
                  placeholder="Mains"
                />
              </label>


              <label>
                Paper

                <input
                  value={
                    upscExamPaper
                  }
                  onChange={
                    event =>
                      setUpscExamPaper(
                        event
                          .target
                          .value
                      )
                  }
                  placeholder="General Studies / Paper II"
                  required
                />
              </label>
            </>

          )}


          {origin ===
            'state' && (

            <>
              <label>
                State / UT

                <input
                  value={
                    statePscState
                  }
                  onChange={
                    event =>
                      setStatePscState(
                        event
                          .target
                          .value
                      )
                  }
                  placeholder="Maharashtra"
                  required
                />
              </label>


              <label>
                PSC

                <input
                  value={
                    statePscName
                  }
                  onChange={
                    event =>
                      setStatePscName(
                        event
                          .target
                          .value
                      )
                  }
                  placeholder="MPSC"
                  required
                />
              </label>


              <label>
                Exam Name

                <input
                  value={
                    statePscExamName
                  }
                  onChange={
                    event =>
                      setStatePscExamName(
                        event
                          .target
                          .value
                      )
                  }
                  placeholder="State Services Examination"
                  required
                />
              </label>


              <label>
                Exam Cycle

                <input
                  value={
                    statePscCycle
                  }
                  onChange={
                    event =>
                      setStatePscCycle(
                        event
                          .target
                          .value
                      )
                  }
                  placeholder="Optional cycle"
                />
              </label>


              <label>
                Stage

                <input
                  value={
                    statePscStage
                  }
                  onChange={
                    event =>
                      setStatePscStage(
                        event
                          .target
                          .value
                      )
                  }
                  placeholder="Mains"
                />
              </label>


              <label>
                Paper

                <input
                  value={
                    statePscPaper
                  }
                  onChange={
                    event =>
                      setStatePscPaper(
                        event
                          .target
                          .value
                      )
                  }
                  placeholder="GS-II"
                  required
                />
              </label>
            </>

          )}


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
                <option value="Paper-I">
                  Paper-I
                </option>

                <option value="Paper-II">
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
              placeholder="Polity"
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
              placeholder="Democracy"
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
              placeholder="Civil Society"
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
              placeholder="5 or 3(a)"
            />
          </label>


          <label>
            Marks

            <input
              type="number"
              min="0"
              step="0.5"
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
                Draft / incomplete paper
              </option>

              <option value="published">
                Published / verified paper
              </option>
            </select>
          </label>

        </div>


        <label
          style={{
            marginTop:
              '12px'
          }}
        >
          Exact Mains Question

          <textarea
            value={
              question
            }
            onChange={
              event => {

                setQuestion(
                  event
                    .target
                    .value
                );

                setMatches(
                  []
                );
              }
            }
            rows={
              5
            }
            placeholder="Paste the exact question as printed in the paper."
            required
          />
        </label>


        <label
          style={{
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
            Useful when an Optional or State PSC question also helps UPSC GS preparation.
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
            type="button"
            className="secondary-btn"
            disabled={
              checking ||
              saving ||
              !question.trim()
            }
            onClick={() =>
              void findExistingMatches(
                true
              )
            }
          >
            {checking
              ? 'Checking...'
              : 'Check Existing Question'}
          </button>


          <button
            type="submit"
            className="primary-btn"
            disabled={
              saving
            }
          >
            {saving
              ? 'Saving...'
              : matches.length > 0
                ? 'Link Existing / Save'
                : 'Save PYQ'}
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


        {matches.length >
          0 && (

          <section
            style={{
              marginTop:
                '16px',
              padding:
                '14px',
              border:
                '1px solid rgba(45,212,191,.28)',
              borderRadius:
                '14px',
              background:
                'rgba(45,212,191,.05)'
            }}
          >

            <strong>
              Existing master question found
            </strong>


            <p
              style={{
                margin:
                  '6px 0 12px',
                color:
                  '#94a3b8'
              }}
            >
              Link the selected year / paper to the existing master instead of creating a duplicate.
            </p>


            <div
              style={{
                display:
                  'grid',
                gap:
                  '10px'
              }}
            >

              {matches.map(
                match => (

                  <article
                    key={
                      match.question_id
                    }
                    style={{
                      padding:
                        '12px',
                      borderRadius:
                        '12px',
                      border:
                        '1px solid rgba(255,255,255,.08)',
                      background:
                        'rgba(255,255,255,.025)'
                    }}
                  >

                    <strong>
                      {match.question}
                    </strong>


                    <small
                      style={{
                        display:
                          'block',
                        marginTop:
                          '6px',
                        color:
                          '#94a3b8'
                      }}
                    >
                      {match.subject}

                      {match.topic
                        ? ` • ${match.topic}`
                        : ''}

                      {match.subtopic
                        ? ` • ${match.subtopic}`
                        : ''}

                      {` • ${match.appearance_count} appearance${match.appearance_count === 1 ? '' : 's'}`}
                    </small>


                    {match.appearances.length >
                      0 && (

                      <div
                        style={{
                          display:
                            'grid',
                          gap:
                            '5px',
                          marginTop:
                            '10px'
                        }}
                      >

                        {match.appearances.map(
                          (
                            appearance,
                            index
                          ) => (

                            <small
                              key={
                                appearance.appearance_id ||
                                `${match.question_id}-${index}`
                              }
                              style={{
                                color:
                                  '#cbd5e1'
                              }}
                            >
                              {appearanceLabel(
                                appearance
                              )}
                            </small>

                          )
                        )}

                      </div>

                    )}


                    <button
                      type="button"
                      className="primary-btn"
                      disabled={
                        saving
                      }
                      onClick={() =>
                        void linkSelectedMatch(
                          match
                        )
                      }
                      style={{
                        marginTop:
                          '12px'
                      }}
                    >
                      Link This Existing Question
                    </button>

                  </article>

                )
              )}

            </div>

          </section>

        )}


        {message && (

          <p
            className="form-message"
          >
            {message}
          </p>

        )}

      </form>


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
              SAVED MASTER PYQs
            </span>


            <h3>
              Question archive
            </h3>


            <small
              style={{
                color:
                  '#94a3b8'
              }}
            >
              Filter by linked year, commission, paper or link health. The health summary also shows repeated masters and any legacy master questions still missing a canonical appearance.
            </small>

          </div>


          <div
            style={{
              display:
                'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(150px, 1fr))',
              gap:
                '8px',
              width:
                'min(100%, 780px)'
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
              <option value="all">
                All appearance years
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


            <select
              value={
                filterCommission
              }
              onChange={
                event =>
                  setFilterCommission(
                    event
                      .target
                      .value
                  )
              }
            >
              <option value="all">
                All commissions
              </option>

              {commissions.map(
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


            <select
              value={
                filterPaper
              }
              onChange={
                event =>
                  setFilterPaper(
                    event
                      .target
                      .value
                  )
              }
            >
              <option value="all">
                All papers
              </option>

              {archivePapers.map(
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
              placeholder="Subject / topic / question"
            />


            <select
              value={
                filterLinkStatus
              }
              onChange={
                event =>
                  setFilterLinkStatus(
                    event
                      .target
                      .value
                  )
              }
            >
              <option value="all">
                All link states
              </option>

              <option value="repeated">
                Repeated: 2+ appearances
              </option>

              <option value="single">
                Single appearance
              </option>

              <option value="missing">
                Missing canonical link
              </option>
            </select>


            <select
              value={
                archiveSort
              }
              onChange={
                event =>
                  setArchiveSort(
                    event
                      .target
                      .value
                  )
              }
            >
              <option value="latest">
                Sort: Latest appearance
              </option>

              <option value="oldest">
                Sort: Oldest appearance
              </option>

              <option value="most_appearances">
                Sort: Most appearances
              </option>
            </select>


            <button
              type="button"
              className="secondary-btn"
              onClick={() => {

                setFilterYear(
                  'all'
                );

                setFilterCommission(
                  'all'
                );

                setFilterPaper(
                  'all'
                );

                setArchiveSort(
                  'latest'
                );

                setFilterLinkStatus(
                  'all'
                );

                setFilterSubject('');

              }}
            >
              Clear Filters
            </button>

          </div>

        </div>


        {!loading && (

          <div
            style={{
              display:
                'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(145px, 1fr))',
              gap:
                '8px',
              marginTop:
                '14px'
            }}
          >

            <div
              style={{
                padding:
                  '10px',
                borderRadius:
                  '10px',
                border:
                  '1px solid rgba(255,255,255,.08)',
                background:
                  'rgba(255,255,255,.02)'
              }}
            >
              <strong>
                {archiveStats.masters}
              </strong>

              <small
                style={{
                  display:
                    'block',
                  color:
                    '#94a3b8'
                }}
              >
                Master questions
              </small>
            </div>


            <div
              style={{
                padding:
                  '10px',
                borderRadius:
                  '10px',
                border:
                  '1px solid rgba(255,255,255,.08)',
                background:
                  'rgba(255,255,255,.02)'
              }}
            >
              <strong>
                {archiveStats.totalAppearances}
              </strong>

              <small
                style={{
                  display:
                    'block',
                  color:
                    '#94a3b8'
                }}
              >
                Linked appearances
              </small>
            </div>


            <div
              style={{
                padding:
                  '10px',
                borderRadius:
                  '10px',
                border:
                  '1px solid rgba(255,255,255,.08)',
                background:
                  'rgba(255,255,255,.02)'
              }}
            >
              <strong>
                {archiveStats.repeatedMasters}
              </strong>

              <small
                style={{
                  display:
                    'block',
                  color:
                    '#94a3b8'
                }}
              >
                Repeated masters
              </small>
            </div>


            <div
              style={{
                padding:
                  '10px',
                borderRadius:
                  '10px',
                border:
                  archiveStats.missingLinks >
                    0
                    ? '1px solid rgba(245,158,11,.45)'
                    : '1px solid rgba(255,255,255,.08)',
                background:
                  archiveStats.missingLinks >
                    0
                    ? 'rgba(245,158,11,.06)'
                    : 'rgba(255,255,255,.02)'
              }}
            >
              <strong>
                {archiveStats.missingLinks}
              </strong>

              <small
                style={{
                  display:
                    'block',
                  color:
                    '#94a3b8'
                }}
              >
                Missing canonical links
              </small>
            </div>

          </div>

        )}


        {!loading && (

          <small
            style={{
              display:
                'block',
              marginTop:
                '12px',
              color:
                '#94a3b8'
            }}
          >
            Showing
            {' '}
            {visibleQuestions.length}
            {' '}
            of
            {' '}
            {questions.length}
            {' '}
            master questions
          </small>

        )}


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
                100
              )
              .map(
                item => (

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

                    {(() => {

                      const appearances =
                        archiveAppearances[
                          item.id
                        ] || [];


                      const latestAppearance =
                        appearances[0] ||
                        null;


                      return (

                        <>

                          <div
                            style={{
                              display:
                                'flex',
                              justifyContent:
                                'space-between',
                              gap:
                                '12px',
                              flexWrap:
                                'wrap',
                              alignItems:
                                'center'
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
                                  : item.gs_paper || 'GS'}
                            </strong>


                            <div
                              style={{
                                display:
                                  'flex',
                                gap:
                                  '8px',
                                flexWrap:
                                  'wrap',
                                alignItems:
                                  'center'
                              }}
                            >

                              <span
                                style={{
                                  padding:
                                    '3px 8px',
                                  borderRadius:
                                    '999px',
                                  border:
                                    '1px solid rgba(255,255,255,.10)',
                                  fontSize:
                                    '12px'
                                }}
                              >
                                {appearances.length}
                                {' '}
                                appearance
                                {appearances.length ===
                                  1
                                  ? ''
                                  : 's'}
                              </span>


                              <span>
                                {item.status}
                              </span>

                            </div>

                          </div>


                          <small
                            style={{
                              display:
                                'block',
                              marginTop:
                                '6px',
                              color:
                                '#94a3b8'
                            }}
                          >
                            {latestAppearance
                              ? `Latest: ${appearanceLabel(latestAppearance)}`
                              : item.pyq_year
                                ? `No canonical appearance linked yet. Legacy source: UPSC CSE ${item.pyq_year} ${legacyPaperName(item)}.`
                                : 'No canonical appearance linked yet. This legacy question is also missing its PYQ year.'}
                          </small>

                        </>

                      );

                    })()}


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
                      Subject:
                      {' '}
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
                          '10px'
                      }}
                    >

                      <button
                        type="button"
                        className="secondary-btn"
                        disabled={
                          loadingAppearanceId ===
                          item.id
                        }
                        onClick={() =>
                          void toggleArchiveAppearances(
                            item
                          )
                        }
                      >
                        {loadingAppearanceId ===
                          item.id
                          ? 'Loading appearances...'
                          : expandedQuestionId ===
                              item.id
                            ? 'Hide Appearances'
                            : 'View Appearances'}
                      </button>


                      <button
                        type="button"
                        className="primary-btn"
                        onClick={() =>
                          prepareAnotherAppearance(
                            item
                          )
                        }
                      >
                        + Add Another Appearance
                      </button>


                      {(archiveAppearances[
                        item.id
                      ] || []).length ===
                        0 && (

                        <button
                          type="button"
                          className="secondary-btn"
                          disabled={
                            repairingQuestionId ===
                            item.id
                          }
                          onClick={() =>
                            void repairMissingCanonicalLink(
                              item
                            )
                          }
                        >
                          {repairingQuestionId ===
                            item.id
                            ? 'Repairing...'
                            : 'Repair Missing Link'}
                        </button>

                      )}

                    </div>


                    {expandedQuestionId ===
                      item.id && (

                      <div
                        style={{
                          display:
                            'grid',
                          gap:
                            '7px',
                          marginTop:
                            '10px',
                          padding:
                            '10px',
                          borderRadius:
                            '10px',
                          border:
                            '1px solid rgba(255,255,255,.07)',
                          background:
                            'rgba(255,255,255,.02)'
                        }}
                      >

                        {(archiveAppearances[
                          item.id
                        ] || []).length >
                          0 ? (

                          (archiveAppearances[
                            item.id
                          ] || []).map(
                            (
                              appearance,
                              index
                            ) => {

                              const appearanceId =
                                appearance
                                  .appearance_id ||
                                null;


                              const isEditing =
                                appearanceId !==
                                  null &&
                                editingAppearanceId ===
                                  appearanceId;


                              const isWorking =
                                appearanceId !==
                                  null &&
                                appearanceActionId ===
                                  appearanceId;


                              return (

                                <div
                                  key={
                                    appearanceId ||
                                    `${item.id}-${index}`
                                  }
                                  style={{
                                    display:
                                      'grid',
                                    gap:
                                      '8px',
                                    padding:
                                      '10px',
                                    borderRadius:
                                      '10px',
                                    border:
                                      '1px solid rgba(255,255,255,.07)',
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
                                      alignItems:
                                        'center',
                                      gap:
                                        '10px',
                                      flexWrap:
                                        'wrap'
                                    }}
                                  >

                                    <small
                                      style={{
                                        color:
                                          '#cbd5e1'
                                      }}
                                    >
                                      {appearanceLabel(
                                        appearance
                                      )}
                                    </small>


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

                                      <button
                                        type="button"
                                        className="secondary-btn"
                                        disabled={
                                          !appearanceId ||
                                          isWorking
                                        }
                                        onClick={() =>
                                          void startEditAppearance(
                                            item,
                                            appearance
                                          )
                                        }
                                      >
                                        {isWorking
                                          ? 'Working...'
                                          : 'Edit'}
                                      </button>


                                      <button
                                        type="button"
                                        className="secondary-btn"
                                        disabled={
                                          !appearanceId ||
                                          isWorking
                                        }
                                        onClick={() =>
                                          void removeAppearance(
                                            item,
                                            appearance
                                          )
                                        }
                                      >
                                        Remove
                                      </button>

                                    </div>

                                  </div>


                                  {isEditing && (

                                    <div
                                      style={{
                                        display:
                                          'grid',
                                        gap:
                                          '10px',
                                        marginTop:
                                          '4px',
                                        paddingTop:
                                          '10px',
                                        borderTop:
                                          '1px solid rgba(255,255,255,.07)'
                                      }}
                                    >

                                      <div
                                        style={{
                                          display:
                                            'grid',
                                          gridTemplateColumns:
                                            'repeat(auto-fit, minmax(150px, 1fr))',
                                          gap:
                                            '10px'
                                        }}
                                      >

                                        <label>
                                          Question No.

                                          <input
                                            value={
                                              appearanceEditQuestionNumber
                                            }
                                            onChange={
                                              event =>
                                                setAppearanceEditQuestionNumber(
                                                  event
                                                    .target
                                                    .value
                                                )
                                            }
                                            placeholder="5 or 3(a)"
                                          />
                                        </label>


                                        <label>
                                          Marks

                                          <input
                                            type="number"
                                            min="0"
                                            step="0.5"
                                            value={
                                              appearanceEditMarks
                                            }
                                            onChange={
                                              event =>
                                                setAppearanceEditMarks(
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
                                              appearanceEditWordLimit
                                            }
                                            onChange={
                                              event =>
                                                setAppearanceEditWordLimit(
                                                  event
                                                    .target
                                                    .value
                                                )
                                            }
                                          />
                                        </label>


                                        <label>
                                          Source

                                          <input
                                            value={
                                              appearanceEditSource
                                            }
                                            onChange={
                                              event =>
                                                setAppearanceEditSource(
                                                  event
                                                    .target
                                                    .value
                                                )
                                            }
                                            placeholder="UPSC / MPSC"
                                          />
                                        </label>

                                      </div>


                                      <label>
                                        Exact Wording for This Appearance

                                        <textarea
                                          rows={4}
                                          value={
                                            appearanceEditOriginalQuestion
                                          }
                                          onChange={
                                            event =>
                                              setAppearanceEditOriginalQuestion(
                                                event
                                                  .target
                                                  .value
                                              )
                                          }
                                          placeholder="Leave as the master wording if unchanged."
                                        />
                                      </label>


                                      <label>
                                        Source URL

                                        <input
                                          type="url"
                                          value={
                                            appearanceEditSourceUrl
                                          }
                                          onChange={
                                            event =>
                                              setAppearanceEditSourceUrl(
                                                event
                                                  .target
                                                  .value
                                              )
                                          }
                                          placeholder="Official paper URL"
                                        />
                                      </label>


                                      <label>
                                        Notes

                                        <textarea
                                          rows={2}
                                          value={
                                            appearanceEditNotes
                                          }
                                          onChange={
                                            event =>
                                              setAppearanceEditNotes(
                                                event
                                                  .target
                                                  .value
                                              )
                                          }
                                          placeholder="Optional admin note"
                                        />
                                      </label>


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

                                        <button
                                          type="button"
                                          className="primary-btn"
                                          disabled={
                                            isWorking
                                          }
                                          onClick={() =>
                                            void saveAppearanceEdit(
                                              item
                                            )
                                          }
                                        >
                                          {isWorking
                                            ? 'Saving...'
                                            : 'Save Appearance'}
                                        </button>


                                        <button
                                          type="button"
                                          className="secondary-btn"
                                          disabled={
                                            isWorking
                                          }
                                          onClick={
                                            resetAppearanceEditor
                                          }
                                        >
                                          Cancel
                                        </button>

                                      </div>

                                    </div>

                                  )}

                                </div>

                              );
                            }
                          )

                        ) : loadingAppearanceId ===
                          item.id ? (

                          <small
                            style={{
                              color:
                                '#94a3b8'
                            }}
                          >
                            Loading...
                          </small>

                        ) : (

                          <small
                            style={{
                              color:
                                '#94a3b8'
                            }}
                          >
                            No canonical appearances are linked yet.
                          </small>

                        )}

                      </div>

                    )}

                  </article>

                )
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


export default MainsPyqManager;

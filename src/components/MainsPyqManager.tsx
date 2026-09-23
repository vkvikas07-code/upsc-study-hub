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
    filterSubject,
    setFilterSubject
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


    setQuestions(
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
        PyqRow[]
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
      (
        data ||
        []
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
      ) as
        MainsMatch[];


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
                  item is
                    number =>
                  typeof item ===
                    'number'
              )
          )
        ).sort(
          (
            first: number,
            second: number
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
              This is the master-question archive. Repeated years and papers are stored as appearances.
            </small>

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
              <option value="all">
                All master years
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
                            : item.gs_paper || 'GS'}
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

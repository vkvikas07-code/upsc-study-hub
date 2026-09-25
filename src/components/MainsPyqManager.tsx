import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabase';

type Origin = 'cse' | 'upsc' | 'state';
type SectionType = 'essay' | 'gs' | 'optional';

type PaperTab =
  | 'Essay'
  | 'GS-I'
  | 'GS-II'
  | 'GS-III'
  | 'GS-IV'
  | 'Optional';

type QuestionStatus =
  | 'draft'
  | 'published';

type MainsQuestion = {
  id: string;
  question: string;
  question_type: string;
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
  source: string | null;
  source_url: string | null;
  status: string;
  created_at: string;
};

type Appearance = {
  appearance_id: string | null;
  question_number: string | null;
  marks: number | null;
  word_limit: number | null;
  appearance_type: string | null;
  exam_paper_id: string | null;
  exam_family: string | null;
  commission: string | null;
  state: string | null;
  exam_name: string | null;
  exam_cycle: string | null;
  year: number | null;
  stage: string | null;
  paper: string | null;
};

type Match = {
  question_id: string;
  question: string;
  subject: string;
  topic: string | null;
  subtopic: string | null;
  status: string;
  appearance_count: number;
  appearances: Appearance[];
};

const OPTIONAL_SUBJECTS = [
  'Agriculture',
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
  'Zoology'
];

const GS_PAPERS = [
  'GS-I',
  'GS-II',
  'GS-III',
  'GS-IV'
];

const MASTER_SELECT = `
  id,
  question,
  question_type,
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
  source,
  source_url,
  status,
  created_at
`;

function numberOrNull(
  value: string
): number | null {
  const clean = value.trim();

  if (!clean) {
    return null;
  }

  const parsed = Number(clean);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function integerOrNull(
  value: string
): number | null {
  const parsed =
    numberOrNull(value);

  return parsed === null
    ? null
    : Math.trunc(parsed);
}

function parseMatches(
  value: unknown
): Match[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(raw => {
    const item =
      raw as Record<string, unknown>;

    const rawAppearances =
      Array.isArray(item.appearances)
        ? item.appearances
        : [];

    const appearances:
      Appearance[] =
        rawAppearances.map(
          rawAppearance => {
            const appearance =
              rawAppearance as Record<
                string,
                unknown
              >;

            return {
              appearance_id:
                appearance.appearance_id
                  ? String(
                      appearance.appearance_id
                    )
                  : null,

              question_number:
                appearance.question_number
                  ? String(
                      appearance.question_number
                    )
                  : null,

              marks:
                appearance.marks === null ||
                appearance.marks === undefined
                  ? null
                  : Number(
                      appearance.marks
                    ),

              word_limit:
                appearance.word_limit === null ||
                appearance.word_limit === undefined
                  ? null
                  : Number(
                      appearance.word_limit
                    ),

              appearance_type:
                appearance.appearance_type
                  ? String(
                      appearance.appearance_type
                    )
                  : null,

              exam_paper_id:
                appearance.exam_paper_id
                  ? String(
                      appearance.exam_paper_id
                    )
                  : null,

              exam_family:
                appearance.exam_family
                  ? String(
                      appearance.exam_family
                    )
                  : null,

              commission:
                appearance.commission
                  ? String(
                      appearance.commission
                    )
                  : null,

              state:
                appearance.state
                  ? String(
                      appearance.state
                    )
                  : null,

              exam_name:
                appearance.exam_name
                  ? String(
                      appearance.exam_name
                    )
                  : null,

              exam_cycle:
                appearance.exam_cycle
                  ? String(
                      appearance.exam_cycle
                    )
                  : null,

              year:
                appearance.year === null ||
                appearance.year === undefined
                  ? null
                  : Number(
                      appearance.year
                    ),

              stage:
                appearance.stage
                  ? String(
                      appearance.stage
                    )
                  : null,

              paper:
                appearance.paper
                  ? String(
                      appearance.paper
                    )
                  : null
            };
          }
        );

    return {
      question_id:
        String(
          item.question_id || ''
        ),

      question:
        String(
          item.question || ''
        ),

      subject:
        String(
          item.subject || ''
        ),

      topic:
        item.topic
          ? String(item.topic)
          : null,

      subtopic:
        item.subtopic
          ? String(item.subtopic)
          : null,

      status:
        String(
          item.status || ''
        ),

      appearance_count:
        Number(
          item.appearance_count || 0
        ),

      appearances
    };
  });
}

function appearanceText(
  appearance: Appearance
): string {
  return [
    appearance.commission ||
      appearance.exam_family ||
      'Exam',

    appearance.state,

    appearance.exam_name,

    appearance.year !== null
      ? String(
          appearance.year
        )
      : null,

    appearance.paper,

    appearance.question_number
      ? `Q${appearance.question_number}`
      : null,

    appearance.marks !== null
      ? `${appearance.marks} marks`
      : null,

    appearance.word_limit !== null
      ? `${appearance.word_limit} words`
      : null
  ]
    .filter(Boolean)
    .join(' • ');
}

export function MainsPyqManager() {
  const db =
    supabase as any;

  const [
    origin,
    setOrigin
  ] =
    useState<Origin>(
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
    upscExamPaper,
    setUpscExamPaper
  ] =
    useState('');

  const [
    stateName,
    setStateName
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
    stateExamName,
    setStateExamName
  ] =
    useState(
      'State Services Examination'
    );

  const [
    stateCycle,
    setStateCycle
  ] =
    useState('');

  const [
    statePaper,
    setStatePaper
  ] =
    useState(
      'GS-II'
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
    question,
    setQuestion
  ] =
    useState('');

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
    questionStatus,
    setQuestionStatus
  ] =
    useState<QuestionStatus>(
      'draft'
    );

  const [
    relevantGsPapers,
    setRelevantGsPapers
  ] =
    useState<string[]>(
      []
    );

  const [
    questions,
    setQuestions
  ] =
    useState<
      MainsQuestion[]
    >([]);

  const [
    matches,
    setMatches
  ] =
    useState<
      Match[]
    >([]);

  const [
    appearanceMap,
    setAppearanceMap
  ] =
    useState<
      Record<
        string,
        Appearance[]
      >
    >({});

  const [
    expandedId,
    setExpandedId
  ] =
    useState<
      string |
      null
    >(
      null
    );

  const [
    filterText,
    setFilterText
  ] =
    useState('');

  const [
    filterYear,
    setFilterYear
  ] =
    useState(
      'all'
    );

  const [
    loading,
    setLoading
  ] =
    useState(false);

  const [
    saving,
    setSaving
  ] =
    useState(false);

  const [
    checking,
    setChecking
  ] =
    useState(false);

  const [
    message,
    setMessage
  ] =
    useState('');

  const numericYear =
    Number(year);

  const sectionType:
    SectionType =
      paperTab === 'Essay'
        ? 'essay'
        : paperTab === 'Optional'
          ? 'optional'
          : 'gs';

  const currentPaper =
    origin === 'cse'
      ? paperTab === 'Optional'
        ? `${optionalSubject} ${optionalPaper}`
        : paperTab
      : origin === 'upsc'
        ? upscExamPaper.trim()
        : statePaper.trim();

  const currentSource =
    origin === 'state'
      ? statePscName.trim() ||
        'State PSC'
      : 'UPSC';

  function buildMetadata() {
    if (origin === 'cse') {
      return {
        pyq_year:
          String(
            numericYear
          ),

        exam_stage:
          'mains',

        paper:
          currentPaper,

        source:
          'UPSC',

        source_url:
          sourceUrl.trim() ||
          null,

        status:
          questionStatus
      };
    }

    if (origin === 'upsc') {
      return {
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
          'mains',

        upsc_exam_paper:
          upscExamPaper.trim(),

        source:
          'UPSC',

        source_url:
          sourceUrl.trim() ||
          null,

        status:
          questionStatus
      };
    }

    return {
      state_psc_state:
        stateName.trim(),

      state_psc_name:
        statePscName.trim(),

      state_psc_exam_name:
        stateExamName.trim(),

      state_psc_cycle:
        stateCycle.trim() ||
        null,

      state_psc_year:
        String(
          numericYear
        ),

      state_psc_stage:
        'mains',

      state_psc_paper:
        statePaper.trim(),

      source:
        statePscName.trim() ||
        'State PSC',

      source_url:
        sourceUrl.trim() ||
        null,

      status:
        questionStatus
    };
  }

  function validate():
    string |
    null {
    if (!db) {
      return 'Supabase is not configured.';
    }

    if (
      !Number.isInteger(
        numericYear
      ) ||
      numericYear < 1950 ||
      numericYear > 2100
    ) {
      return 'Enter a valid examination year.';
    }

    if (!subject.trim()) {
      return 'Enter the subject.';
    }

    if (!question.trim()) {
      return 'Enter the exact Mains question.';
    }

    if (
      origin === 'upsc' &&
      !upscExamName.trim()
    ) {
      return 'Enter the UPSC examination name.';
    }

    if (
      origin === 'upsc' &&
      !upscExamPaper.trim()
    ) {
      return 'Enter the UPSC paper name.';
    }

    if (
      origin === 'state' &&
      !stateName.trim()
    ) {
      return 'Enter the State / UT.';
    }

    if (
      origin === 'state' &&
      !statePscName.trim()
    ) {
      return 'Enter the PSC name.';
    }

    if (
      origin === 'state' &&
      !stateExamName.trim()
    ) {
      return 'Enter the State examination name.';
    }

    if (
      origin === 'state' &&
      !statePaper.trim()
    ) {
      return 'Enter the State Mains paper.';
    }

    return null;
  }

  function clearQuestionFields() {
    setQuestion('');
    setQuestionNumber('');
    setTopic('');
    setSubtopic('');
    setSourceUrl('');
    setMatches([]);
  }

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

  async function loadQuestions() {
    if (!db) {
      return;
    }

    setLoading(true);

    const {
      data,
      error
    } =
      await db
        .from(
          'mains_questions'
        )
        .select(
          MASTER_SELECT
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

      setLoading(false);

      return;
    }

    const rows =
      (
        (
          data ||
          []
        ).map(
          (
            row:
              Record<
                string,
                any
              >
          ) => ({
            ...row,

            relevant_gs_papers:
              Array.isArray(
                row.relevant_gs_papers
              )
                ? row.relevant_gs_papers
                : []
          })
        )
      ) as MainsQuestion[];

    setQuestions(
      rows
    );

    if (
      rows.length ===
      0
    ) {
      setAppearanceMap(
        {}
      );

      setLoading(
        false
      );

      return;
    }

    const ids =
      rows.map(
        item =>
          item.id
      );

    const {
      data:
        appearanceRows,
      error:
        appearanceError
    } =
      await db
        .from(
          'mains_question_appearances'
        )
        .select(
          `
            id,
            question_id,
            question_number,
            marks,
            word_limit,
            appearance_type,
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
          ids
        );

    if (
      appearanceError
    ) {
      setMessage(
        `Questions loaded, but appearances could not be loaded: ${appearanceError.message}`
      );

      setLoading(
        false
      );

      return;
    }

    const grouped:
      Record<
        string,
        Appearance[]
      > = {};

    for (
      const raw of
        appearanceRows ||
        []
    ) {
      const row =
        raw as Record<
          string,
          any
        >;

      const examRaw =
        Array.isArray(
          row.exam_papers
        )
          ? row.exam_papers[0]
          : row.exam_papers;

      const exam =
        (
          examRaw ||
          {}
        ) as Record<
          string,
          any
        >;

      const questionId =
        String(
          row.question_id ||
            ''
        );

      if (!questionId) {
        continue;
      }

      const appearance:
        Appearance = {
          appearance_id:
            row.id
              ? String(
                  row.id
                )
              : null,

          question_number:
            row.question_number
              ? String(
                  row.question_number
                )
              : null,

          marks:
            row.marks === null ||
            row.marks === undefined
              ? null
              : Number(
                  row.marks
                ),

          word_limit:
            row.word_limit === null ||
            row.word_limit === undefined
              ? null
              : Number(
                  row.word_limit
                ),

          appearance_type:
            row.appearance_type
              ? String(
                  row.appearance_type
                )
              : null,

          exam_paper_id:
            exam.id
              ? String(
                  exam.id
                )
              : null,

          exam_family:
            exam.exam_family
              ? String(
                  exam.exam_family
                )
              : null,

          commission:
            exam.commission
              ? String(
                  exam.commission
                )
              : null,

          state:
            exam.state
              ? String(
                  exam.state
                )
              : null,

          exam_name:
            exam.exam_name
              ? String(
                  exam.exam_name
                )
              : null,

          exam_cycle:
            exam.exam_cycle
              ? String(
                  exam.exam_cycle
                )
              : null,

          year:
            exam.exam_year === null ||
            exam.exam_year === undefined
              ? null
              : Number(
                  exam.exam_year
                ),

          stage:
            exam.exam_stage
              ? String(
                  exam.exam_stage
                )
              : null,

          paper:
            exam.paper
              ? String(
                  exam.paper
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
      const list of
        Object.values(
          grouped
        )
    ) {
      list.sort(
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

    setAppearanceMap(
      grouped
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
        paperTab === 'Essay'
      ) {
        setSubject('Essay');
        setMarks('125');
        setWordLimit('');
        return;
      }

      if (
        paperTab === 'Optional'
      ) {
        setSubject(
          optionalSubject
        );

        setMarks('10');
        setWordLimit('150');
        return;
      }

      setMarks('10');
      setWordLimit('150');
    },
    [
      paperTab,
      optionalSubject
    ]
  );

  async function findMatches(
    showMessage:
      boolean
  ): Promise<Match[]> {
    if (!db) {
      return [];
    }

    if (
      !question.trim()
    ) {
      if (
        showMessage
      ) {
        setMessage(
          'Enter the question first.'
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
      await db.rpc(
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
      if (
        showMessage
      ) {
        setMessage(
          error.message
        );
      }

      return [];
    }

    const parsed =
      parseMatches(
        data
      );

    setMatches(
      parsed
    );

    if (
      showMessage
    ) {
      setMessage(
        parsed.length > 0
          ? `${parsed.length} existing master question match${parsed.length === 1 ? '' : 'es'} found.`
          : 'No existing master question found.'
      );
    }

    return parsed;
  }

  async function linkMaster(
    questionId:
      string,
    appearanceType:
      'original' |
      'repeat'
  ) {
    if (!db) {
      throw new Error(
        'Supabase is not configured.'
      );
    }

    const {
      data,
      error
    } =
      await db.rpc(
        'link_existing_mains_question',
        {
          p_question_id:
            questionId,

          p_origin:
            origin,

          p_metadata:
            buildMetadata(),

          p_original_question:
            question.trim(),

          p_question_number:
            questionNumber.trim() ||
            null,

          p_marks:
            numberOrNull(
              marks
            ),

          p_word_limit:
            integerOrNull(
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

    return Array.isArray(
      data
    )
      ? data[0]
      : data;
  }

  async function findOrCreateLegacyCsePaper(
    userId:
      string
  ): Promise<
    string |
    null
  > {
    if (
      !db ||
      origin !==
        'cse'
    ) {
      return null;
    }

    const legacyType =
      paperTab ===
        'Essay'
        ? 'essay'
        : paperTab ===
            'Optional'
          ? 'optional'
          : 'gs';

    let query =
      db
        .from(
          'mains_pyq_papers'
        )
        .select('id')
        .eq(
          'year',
          numericYear
        )
        .eq(
          'paper_type',
          legacyType
        );

    if (
      legacyType ===
      'gs'
    ) {
      query =
        query.eq(
          'gs_paper',
          paperTab
        );
    } else if (
      legacyType ===
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
    }

    const {
      data:
        existing,
      error:
        existingError
    } =
      await query
        .limit(1)
        .maybeSingle();

    if (
      existingError
    ) {
      throw existingError;
    }

    if (
      existing?.id
    ) {
      return String(
        existing.id
      );
    }

    const {
      data:
        created,
      error:
        createError
    } =
      await db
        .from(
          'mains_pyq_papers'
        )
        .insert({
          year:
            numericYear,

          paper_type:
            legacyType,

          gs_paper:
            legacyType ===
              'gs'
              ? paperTab
              : null,

          optional_subject:
            legacyType ===
              'optional'
              ? optionalSubject
              : null,

          optional_paper:
            legacyType ===
              'optional'
              ? optionalPaper
              : null,

          title:
            `${numericYear} UPSC Mains ${currentPaper}`,

          official_source_url:
            sourceUrl.trim() ||
            null,

          status:
            questionStatus,

          created_by:
            userId
        })
        .select('id')
        .single();

    if (
      createError ||
      !created
    ) {
      throw (
        createError ||
        new Error(
          'Unable to create UPSC Mains paper.'
        )
      );
    }

    return String(
      created.id
    );
  }

  async function saveQuestion(
    event:
      FormEvent<
        HTMLFormElement
      >
  ) {
    event.preventDefault();

    const validationError =
      validate();

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

    try {
      const existing =
        await findMatches(
          false
        );

      if (
        existing.length >
        0
      ) {
        const result =
          await linkMaster(
            existing[0]
              .question_id,
            'repeat'
          );

        const status =
          result?.link_status
            ? String(
                result.link_status
              )
            : 'linked';

        setMessage(
          status ===
            'already_linked'
            ? 'This master question is already linked to the selected paper.'
            : 'Existing master question linked to the new appearance. No duplicate master was created.'
        );

        clearQuestionFields();

        await loadQuestions();

        return;
      }

      const {
        data:
          authData,
        error:
          authError
      } =
        await db.auth
          .getUser();

      if (
        authError ||
        !authData?.user
      ) {
        throw (
          authError ||
          new Error(
            'Admin session expired. Sign in again.'
          )
        );
      }

      const userId =
        String(
          authData.user.id
        );

      const legacyPaperId =
        await findOrCreateLegacyCsePaper(
          userId
        );

      const tags = [
        String(
          numericYear
        ),
        currentSource,
        currentPaper,
        subject.trim(),
        topic.trim(),
        subtopic.trim(),
        'Mains PYQ'
      ].filter(
        Boolean
      );

      const {
        data:
          created,
        error:
          insertError
      } =
        await db
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

            marks:
              numberOrNull(
                marks
              ),

            word_limit:
              integerOrNull(
                wordLimit
              ),

            pyq_year:
              numericYear,

            pyq_paper_id:
              legacyPaperId,

            essay_section:
              sectionType ===
                'essay'
                ? essaySection
                : null,

            relevant_gs_papers:
              relevantGsPapers,

            source:
              currentSource,

            source_url:
              sourceUrl.trim() ||
              null,

            tags,

            difficulty:
              'medium',

            status:
              questionStatus,

            created_by:
              userId
          })
          .select(
            MASTER_SELECT
          )
          .single();

      if (
        insertError ||
        !created
      ) {
        throw (
          insertError ||
          new Error(
            'Unable to save Mains master question.'
          )
        );
      }

      try {
        await linkMaster(
          String(
            created.id
          ),
          'original'
        );
      } catch (
        appearanceError
      ) {
        const detail =
          appearanceError instanceof
            Error
            ? appearanceError.message
            : 'Unknown appearance error.';

        setMessage(
          `Master question saved, but appearance linking failed: ${detail}`
        );

        await loadQuestions();

        return;
      }

      setMessage(
        'New master Mains question saved and linked to its first appearance.'
      );

      clearQuestionFields();

      await loadQuestions();

    } catch (
      error
    ) {
      setMessage(
        error instanceof
          Error
          ? error.message
          : 'Unable to save the Mains PYQ.'
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  async function linkSelectedMatch(
    match:
      Match
  ) {
    const validationError =
      validate();

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

    try {
      await linkMaster(
        match.question_id,
        'repeat'
      );

      setMessage(
        'Existing master question linked successfully.'
      );

      clearQuestionFields();

      await loadQuestions();

    } catch (
      error
    ) {
      setMessage(
        error instanceof
          Error
          ? error.message
          : 'Unable to link the existing question.'
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  async function repairMissingLink(
    item:
      MainsQuestion
  ) {
    if (!db) {
      return;
    }

    if (
      item.pyq_year ===
      null
    ) {
      setMessage(
        'This legacy question has no PYQ year, so it cannot be repaired automatically.'
      );

      return;
    }

    const paper =
      item.section_type ===
        'essay'
        ? 'Essay'
        : item.section_type ===
            'optional'
          ? [
              item.optional_subject,
              item.optional_paper
            ]
              .filter(
                Boolean
              )
              .join(
                ' '
              )
          : item.gs_paper ||
            'GS-I';

    const {
      data,
      error
    } =
      await db.rpc(
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

              paper,

              source:
                item.source ||
                'UPSC',

              source_url:
                item.source_url,

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
            'Repaired from legacy Mains fields'
        }
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

    setMessage(
      result?.link_status ===
        'already_linked'
        ? 'Canonical appearance already existed.'
        : 'Canonical appearance repaired.'
    );

    await loadQuestions();
  }

  function prepareAnotherAppearance(
    item:
      MainsQuestion
  ) {
    setQuestion(
      item.question
    );

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

    setQuestionNumber('');
    setMarks('');
    setWordLimit('');
    setSourceUrl('');
    setMatches([]);

    if (
      item.section_type ===
      'essay'
    ) {
      setPaperTab(
        'Essay'
      );
    } else if (
      item.section_type ===
      'optional'
    ) {
      setPaperTab(
        'Optional'
      );

      if (
        item.optional_subject
      ) {
        setOptionalSubject(
          item.optional_subject
        );
      }

      if (
        item.optional_paper
      ) {
        setOptionalPaper(
          item.optional_paper
        );
      }
    } else {
      const nextPaper =
        GS_PAPERS.includes(
          item.gs_paper ||
          ''
        )
          ? (
              item.gs_paper as
                PaperTab
            )
          : 'GS-I';

      setPaperTab(
        nextPaper
      );
    }

    window.scrollTo({
      top:
        0,
      behavior:
        'smooth'
    });

    setMessage(
      'Master question loaded. Select the new exam/year/paper and enter the new appearance details.'
    );
  }

  const years =
    useMemo(
      () => {
        const values =
          new Set<number>();

        for (
          const item of
            questions
        ) {
          if (
            item.pyq_year !==
            null
          ) {
            values.add(
              item.pyq_year
            );
          }

          for (
            const appearance of
              appearanceMap[
                item.id
              ] || []
          ) {
            if (
              appearance.year !==
              null
            ) {
              values.add(
                appearance.year
              );
            }
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
        questions,
        appearanceMap
      ]
    );

  const visibleQuestions =
    useMemo(
      () => {
        const search =
          filterText
            .trim()
            .toLowerCase();

        return questions.filter(
          item => {
            const appearances =
              appearanceMap[
                item.id
              ] || [];

            const yearMatches =
              filterYear ===
                'all' ||
              String(
                item.pyq_year
              ) ===
                filterYear ||
              appearances.some(
                appearance =>
                  String(
                    appearance.year
                  ) ===
                    filterYear
              );

            if (
              !yearMatches
            ) {
              return false;
            }

            if (
              !search
            ) {
              return true;
            }

            return [
              item.question,
              item.subject,
              item.topic ||
                '',
              item.subtopic ||
                '',
              item.gs_paper ||
                '',
              item.optional_subject ||
                ''
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
        appearanceMap,
        filterText,
        filterYear
      ]
    );

  return (
    <section
      style={{
        display:
          'grid',
        gap:
          '18px'
      }}
    >
      <section
        className="panel"
      >
        <h2>
          Mains PYQ Manager
        </h2>

        <p
          style={{
            color:
              '#94a3b8'
          }}
        >
          One master question can be linked to multiple UPSC or State PSC appearances.
        </p>

        {message && (
          <div
            style={{
              marginBottom:
                '12px',
              padding:
                '10px',
              border:
                '1px solid rgba(255,255,255,.10)',
              borderRadius:
                '10px'
            }}
          >
            {message}
          </div>
        )}

        <form
          onSubmit={
            saveQuestion
          }
          style={{
            display:
              'grid',
            gap:
              '12px'
          }}
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
            <label>
              Exam Source

              <select
                value={
                  origin
                }
                onChange={
                  event =>
                    setOrigin(
                      event
                        .target
                        .value as
                        Origin
                    )
                }
              >
                <option
                  value="cse"
                >
                  UPSC CSE
                </option>

                <option
                  value="upsc"
                >
                  Other UPSC
                </option>

                <option
                  value="state"
                >
                  State PSC
                </option>
              </select>
            </label>

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
              'cse' && (
              <label>
                Paper

                <select
                  value={
                    paperTab
                  }
                  onChange={
                    event =>
                      setPaperTab(
                        event
                          .target
                          .value as
                          PaperTab
                      )
                  }
                >
                  <option>
                    Essay
                  </option>

                  <option>
                    GS-I
                  </option>

                  <option>
                    GS-II
                  </option>

                  <option>
                    GS-III
                  </option>

                  <option>
                    GS-IV
                  </option>

                  <option>
                    Optional
                  </option>
                </select>
              </label>
            )}
          </div>

          {origin ===
            'upsc' && (
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
                  required
                />
              </label>

              <label>
                Cycle

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
                  required
                />
              </label>
            </div>
          )}

          {origin ===
            'state' && (
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
                  required
                />
              </label>

              <label>
                Exam Name

                <input
                  value={
                    stateExamName
                  }
                  onChange={
                    event =>
                      setStateExamName(
                        event
                          .target
                          .value
                      )
                  }
                  required
                />
              </label>

              <label>
                Cycle

                <input
                  value={
                    stateCycle
                  }
                  onChange={
                    event =>
                      setStateCycle(
                        event
                          .target
                          .value
                      )
                  }
                />
              </label>

              <label>
                Paper

                <input
                  value={
                    statePaper
                  }
                  onChange={
                    event =>
                      setStatePaper(
                        event
                          .target
                          .value
                      )
                  }
                  required
                />
              </label>
            </div>
          )}

          {origin ===
            'cse' &&
            paperTab ===
              'Optional' && (
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
                    <option>
                      Paper-I
                    </option>

                    <option>
                      Paper-II
                    </option>
                  </select>
                </label>
              </div>
            )}

          {origin ===
            'cse' &&
            paperTab ===
              'Essay' && (
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
                  <option>
                    Section A
                  </option>

                  <option>
                    Section B
                  </option>
                </select>
              </label>
            )}

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
              />
            </label>
          </div>

          <label>
            Exact Question

            <textarea
              rows={
                5
              }
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
              required
            />
          </label>

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
              Status

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
          </div>

          <label>
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
            />
          </label>

          <div>
            <strong>
              Relevant GS Papers
            </strong>

            <div
              style={{
                display:
                  'flex',
                gap:
                  '10px',
                flexWrap:
                  'wrap',
                marginTop:
                  '8px'
              }}
            >
              {GS_PAPERS.map(
                paper => (
                  <label
                    key={
                      paper
                    }
                  >
                    <input
                      type="checkbox"
                      checked={
                        relevantGsPapers.includes(
                          paper
                        )
                      }
                      onChange={() =>
                        toggleRelevantGs(
                          paper
                        )
                      }
                    />

                    {' '}
                    {paper}
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
                '8px',
              flexWrap:
                'wrap'
            }}
          >
            <button
              type="button"
              className="secondary-btn"
              disabled={
                checking ||
                !question.trim()
              }
              onClick={() =>
                void findMatches(
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
                : 'Save PYQ'}
            </button>
          </div>

          {matches.length >
            0 && (
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
                      border:
                        '1px solid rgba(255,255,255,.10)',
                      borderRadius:
                        '10px'
                    }}
                  >
                    <strong>
                      Existing master found
                    </strong>

                    <p>
                      {match.question}
                    </p>

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
                            display:
                              'block',
                            color:
                              '#94a3b8'
                          }}
                        >
                          {appearanceText(
                            appearance
                          )}
                        </small>
                      )
                    )}

                    <button
                      type="button"
                      className="primary-btn"
                      disabled={
                        saving
                      }
                      style={{
                        marginTop:
                          '10px'
                      }}
                      onClick={() =>
                        void linkSelectedMatch(
                          match
                        )
                      }
                    >
                      Link This Existing Question
                    </button>
                  </article>
                )
              )}
            </div>
          )}
        </form>
      </section>

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
              'center',
            gap:
              '10px',
            flexWrap:
              'wrap'
          }}
        >
          <div>
            <h2>
              Master Question Archive
            </h2>

            <small
              style={{
                color:
                  '#94a3b8'
              }}
            >
              Repeated years and papers stay linked to one master question.
            </small>
          </div>

          <button
            type="button"
            className="secondary-btn"
            disabled={
              loading
            }
            onClick={() =>
              void loadQuestions()
            }
          >
            Refresh
          </button>
        </div>

        <div
          style={{
            display:
              'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(180px, 1fr))',
            gap:
              '8px',
            marginTop:
              '12px'
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
              filterText
            }
            onChange={
              event =>
                setFilterText(
                  event
                    .target
                    .value
                )
            }
            placeholder="Search question / subject / topic"
          />
        </div>

        <small
          style={{
            display:
              'block',
            marginTop:
              '10px',
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

        {loading ? (
          <p>
            Loading Mains PYQs...
          </p>
        ) : (
          <div
            style={{
              display:
                'grid',
              gap:
                '10px',
              marginTop:
                '12px'
            }}
          >
            {visibleQuestions.map(
              item => {
                const appearances =
                  appearanceMap[
                    item.id
                  ] || [];

                const expanded =
                  expandedId ===
                  item.id;

                return (
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
                        '10px'
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
                        {item.pyq_year ||
                          'Year ?'}

                        {' • '}

                        {item.gs_paper ||
                          item.optional_subject ||
                          (
                            item.section_type ===
                              'essay'
                              ? 'Essay'
                              : 'Mains'
                          )}
                      </strong>

                      <span>
                        {appearances.length}
                        {' '}
                        appearance
                        {appearances.length ===
                          1
                          ? ''
                          : 's'}
                      </span>
                    </div>

                    <p>
                      {item.question}
                    </p>

                    <small
                      style={{
                        color:
                          '#94a3b8'
                      }}
                    >
                      {item.subject}

                      {item.topic
                        ? ` • ${item.topic}`
                        : ''}

                      {item.subtopic
                        ? ` • ${item.subtopic}`
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
                        onClick={() =>
                          setExpandedId(
                            expanded
                              ? null
                              : item.id
                          )
                        }
                      >
                        {expanded
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

                      {appearances.length ===
                        0 && (
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() =>
                            void repairMissingLink(
                              item
                            )
                          }
                        >
                          Repair Missing Link
                        </button>
                      )}
                    </div>

                    {expanded && (
                      <div
                        style={{
                          display:
                            'grid',
                          gap:
                            '6px',
                          marginTop:
                            '10px',
                          padding:
                            '10px',
                          border:
                            '1px solid rgba(255,255,255,.06)',
                          borderRadius:
                            '8px'
                        }}
                      >
                        {appearances.length >
                          0 ? (
                          appearances.map(
                            (
                              appearance,
                              index
                            ) => (
                              <small
                                key={
                                  appearance.appearance_id ||
                                  `${item.id}-${index}`
                                }
                                style={{
                                  color:
                                    '#cbd5e1'
                                }}
                              >
                                {appearanceText(
                                  appearance
                                )}
                              </small>
                            )
                          )
                        ) : (
                          <small
                            style={{
                              color:
                                '#94a3b8'
                            }}
                          >
                            No canonical appearance is linked yet.
                          </small>
                        )}
                      </div>
                    )}
                  </article>
                );
              }
            )}

            {visibleQuestions.length ===
              0 && (
              <p>
                No Mains PYQs match the current filters.
              </p>
            )}
          </div>
        )}
      </section>
    </section>
  );
}

export default MainsPyqManager;

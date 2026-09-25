import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabase';

type Origin = 'cse' | 'upsc' | 'state';
type PaperTab = 'Essay' | 'GS-I' | 'GS-II' | 'GS-III' | 'GS-IV' | 'Optional';
type Status = 'draft' | 'published';

type QuestionRow = {
  id: string;
  question: string;
  section_type: 'essay' | 'gs' | 'optional';
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
  commission: string | null;
  state: string | null;
  exam_name: string | null;
  year: number | null;
  paper: string | null;
};

type Match = {
  question_id: string;
  question: string;
  appearances: Appearance[];
};

const GS_PAPERS = ['GS-I', 'GS-II', 'GS-III', 'GS-IV'];

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

const QUESTION_SELECT = `
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
  relevant_gs_papers,
  source,
  source_url,
  status,
  created_at
`;

function toNumber(value: string): number | null {
  const clean = value.trim();

  if (!clean) {
    return null;
  }

  const n = Number(clean);

  return Number.isFinite(n)
    ? n
    : null;
}

function toInteger(value: string): number | null {
  const n = toNumber(value);

  return n === null
    ? null
    : Math.trunc(n);
}

function appearanceLabel(a: Appearance): string {
  return [
    a.commission,
    a.state,
    a.exam_name,
    a.year !== null
      ? String(a.year)
      : null,
    a.paper,
    a.question_number
      ? `Q${a.question_number}`
      : null,
    a.marks !== null
      ? `${a.marks} marks`
      : null,
    a.word_limit !== null
      ? `${a.word_limit} words`
      : null
  ]
    .filter(Boolean)
    .join(' • ');
}

function parseMatches(data: unknown): Match[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((raw: unknown) => {
    const row =
      raw as Record<string, unknown>;

    const rawAppearances =
      Array.isArray(row.appearances)
        ? row.appearances
        : [];

    return {
      question_id:
        String(
          row.question_id ||
            ''
        ),

      question:
        String(
          row.question ||
            ''
        ),

      appearances:
        rawAppearances.map((item: unknown) => {
          const a =
            item as Record<string, unknown>;

          return {
            appearance_id:
              a.appearance_id
                ? String(a.appearance_id)
                : null,

            question_number:
              a.question_number
                ? String(a.question_number)
                : null,

            marks:
              a.marks == null
                ? null
                : Number(a.marks),

            word_limit:
              a.word_limit == null
                ? null
                : Number(a.word_limit),

            commission:
              a.commission
                ? String(a.commission)
                : null,

            state:
              a.state
                ? String(a.state)
                : null,

            exam_name:
              a.exam_name
                ? String(a.exam_name)
                : null,

            year:
              a.year == null
                ? null
                : Number(a.year),

            paper:
              a.paper
                ? String(a.paper)
                : null
          };
        })
    };
  });
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
    paperTab,
    setPaperTab
  ] =
    useState<PaperTab>(
      'GS-I'
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
    status,
    setStatus
  ] =
    useState<Status>(
      'draft'
    );

  const [
    relevantGs,
    setRelevantGs
  ] =
    useState<string[]>(
      []
    );

  const [
    questions,
    setQuestions
  ] =
    useState<
      QuestionRow[]
    >([]);

  const [
    appearances,
    setAppearances
  ] =
    useState<
      Record<
        string,
        Appearance[]
      >
    >({});

  const [
    matches,
    setMatches
  ] =
    useState<
      Match[]
    >([]);

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
    filterYear,
    setFilterYear
  ] =
    useState(
      'all'
    );

  const [
    filterText,
    setFilterText
  ] =
    useState('');

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
    editQuestionNumber,
    setEditQuestionNumber
  ] =
    useState('');

  const [
    editMarks,
    setEditMarks
  ] =
    useState('');

  const [
    editWordLimit,
    setEditWordLimit
  ] =
    useState('');

  const [
    loading,
    setLoading
  ] =
    useState(false);

  const [
    checking,
    setChecking
  ] =
    useState(false);

  const [
    saving,
    setSaving
  ] =
    useState(false);

  const [
    busyAppearanceId,
    setBusyAppearanceId
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

  const numericYear =
    Number(year);

  const sectionType =
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

  useEffect(
    () => {
      if (
        paperTab ===
        'Essay'
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
        'Optional'
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
      paperTab,
      optionalSubject
    ]
  );

  useEffect(
    () => {
      void loadQuestions();
    },
    []
  );

  function buildMetadata() {
    if (
      origin ===
      'cse'
    ) {
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

        status
      };
    }

    if (
      origin ===
      'upsc'
    ) {
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

        status
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
        currentSource,

      source_url:
        sourceUrl.trim() ||
        null,

      status
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
      return 'Enter the exact question.';
    }

    if (
      origin ===
        'upsc' &&
      !upscExamName.trim()
    ) {
      return 'Enter UPSC exam name.';
    }

    if (
      origin ===
        'upsc' &&
      !upscExamPaper.trim()
    ) {
      return 'Enter UPSC paper.';
    }

    if (
      origin ===
        'state' &&
      !stateName.trim()
    ) {
      return 'Enter State / UT.';
    }

    if (
      origin ===
        'state' &&
      !statePscName.trim()
    ) {
      return 'Enter PSC name.';
    }

    if (
      origin ===
        'state' &&
      !stateExamName.trim()
    ) {
      return 'Enter exam name.';
    }

    if (
      origin ===
        'state' &&
      !statePaper.trim()
    ) {
      return 'Enter paper.';
    }

    return null;
  }

  function clearQuestionForm() {
    setQuestion('');
    setQuestionNumber('');
    setTopic('');
    setSubtopic('');
    setSourceUrl('');
    setMatches([]);
  }

  function toggleGs(
    paper: string
  ) {
    setRelevantGs(
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

    setLoading(
      true
    );

    const {
      data,
      error
    } =
      await db
        .from(
          'mains_questions'
        )
        .select(
          QUESTION_SELECT
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

    const rows:
      QuestionRow[] =
        (
          data ||
          []
        ).map(
          (
            row:
              any
          ) => ({
            ...row,

            relevant_gs_papers:
              Array.isArray(
                row.relevant_gs_papers
              )
                ? row.relevant_gs_papers
                : []
          })
        );

    setQuestions(
      rows
    );

    if (
      !rows.length
    ) {
      setAppearances(
        {}
      );

      setLoading(
        false
      );

      return;
    }

    const ids =
      rows.map(
        row =>
          row.id
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
            exam_papers (
              commission,
              state,
              exam_name,
              exam_year,
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
        raw as any;

      const examRaw =
        Array.isArray(
          row.exam_papers
        )
          ? row.exam_papers[0]
          : row.exam_papers;

      const exam =
        examRaw ||
        {};

      const questionId =
        String(
          row.question_id ||
          ''
        );

      if (!questionId) {
        continue;
      }

      const item:
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
            row.marks ==
              null
              ? null
              : Number(
                  row.marks
                ),

          word_limit:
            row.word_limit ==
              null
              ? null
              : Number(
                  row.word_limit
                ),

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

          year:
            exam.exam_year ==
              null
              ? null
              : Number(
                  exam.exam_year
                ),

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
        item
      );
    }

    Object.values(
      grouped
    ).forEach(
      list =>
        list.sort(
          (
            a,
            b
          ) =>
            (
              b.year ||
              0
            ) -
            (
              a.year ||
              0
            )
        )
    );

    setAppearances(
      grouped
    );

    setLoading(
      false
    );
  }

  async function findMatches(
    showMessage:
      boolean
  ): Promise<
    Match[]
  > {
    if (
      !db ||
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
        parsed.length
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
            toNumber(
              marks
            ),

          p_word_limit:
            toInteger(
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

  async function findOrCreateLegacyPaper(
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

    const paperType =
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
      'gs'
    ) {
      query =
        query.eq(
          'gs_paper',
          paperTab
        );
    } else if (
      paperType ===
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
        findError
    } =
      await query
        .limit(
          1
        )
        .maybeSingle();

    if (
      findError
    ) {
      throw findError;
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

          title:
            `${numericYear} UPSC Mains ${currentPaper}`,

          official_source_url:
            sourceUrl.trim() ||
            null,

          status,

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
          'Unable to create Mains paper.'
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
        existing.length
      ) {
        const result =
          await linkMaster(
            existing[0]
              .question_id,
            'repeat'
          );

        setMessage(
          result?.link_status ===
            'already_linked'
            ? 'This appearance is already linked.'
            : 'Existing master question linked. No duplicate master was created.'
        );

        clearQuestionForm();

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
        await findOrCreateLegacyPaper(
          userId
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
              toNumber(
                marks
              ),

            word_limit:
              toInteger(
                wordLimit
              ),

            pyq_year:
              numericYear,

            pyq_paper_id:
              legacyPaperId,

            relevant_gs_papers:
              relevantGs,

            source:
              currentSource,

            source_url:
              sourceUrl.trim() ||
              null,

            tags:
              [
                String(
                  numericYear
                ),
                currentSource,
                currentPaper,
                subject.trim(),
                'Mains PYQ'
              ],

            difficulty:
              'medium',

            status,

            created_by:
              userId
          })
          .select(
            QUESTION_SELECT
          )
          .single();

      if (
        insertError ||
        !created
      ) {
        throw (
          insertError ||
          new Error(
            'Unable to save master question.'
          )
        );
      }

      await linkMaster(
        String(
          created.id
        ),
        'original'
      );

      setMessage(
        'New master question saved and linked to its first appearance.'
      );

      clearQuestionForm();

      await loadQuestions();

    } catch (
      error
    ) {
      setMessage(
        error instanceof
          Error
          ? error.message
          : 'Unable to save Mains PYQ.'
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

      clearQuestionForm();

      await loadQuestions();

    } catch (
      error
    ) {
      setMessage(
        error instanceof
          Error
          ? error.message
          : 'Unable to link question.'
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  function startEditAppearance(
    a:
      Appearance
  ) {
    if (
      !a.appearance_id
    ) {
      return;
    }

    setEditingAppearanceId(
      a.appearance_id
    );

    setEditQuestionNumber(
      a.question_number ||
      ''
    );

    setEditMarks(
      a.marks ===
        null
        ? ''
        : String(
            a.marks
          )
    );

    setEditWordLimit(
      a.word_limit ===
        null
        ? ''
        : String(
            a.word_limit
          )
    );
  }

  async function saveAppearanceEdit(
    a:
      Appearance
  ) {
    if (
      !db ||
      !a.appearance_id
    ) {
      return;
    }

    setBusyAppearanceId(
      a.appearance_id
    );

    const {
      error
    } =
      await db.rpc(
        'update_mains_question_appearance',
        {
          p_appearance_id:
            a.appearance_id,

          p_question_number:
            editQuestionNumber.trim() ||
            null,

          p_original_question:
            null,

          p_marks:
            toNumber(
              editMarks
            ),

          p_word_limit:
            toInteger(
              editWordLimit
            ),

          p_source:
            null,

          p_source_url:
            null,

          p_notes:
            null
        }
      );

    setBusyAppearanceId(
      null
    );

    if (error) {
      setMessage(
        error.message
      );

      return;
    }

    setEditingAppearanceId(
      null
    );

    setMessage(
      'Appearance updated.'
    );

    await loadQuestions();
  }

  async function removeAppearance(
    a:
      Appearance
  ) {
    if (
      !db ||
      !a.appearance_id
    ) {
      return;
    }

    if (
      !window.confirm(
        'Remove this appearance only? The master question will remain.'
      )
    ) {
      return;
    }

    setBusyAppearanceId(
      a.appearance_id
    );

    const {
      error
    } =
      await db.rpc(
        'delete_mains_question_appearance',
        {
          p_appearance_id:
            a.appearance_id
        }
      );

    setBusyAppearanceId(
      null
    );

    if (error) {
      setMessage(
        error.message
      );

      return;
    }

    setMessage(
      'Appearance removed. Master question kept.'
    );

    await loadQuestions();
  }

  async function repairMissingLink(
    item:
      QuestionRow
  ) {
    if (
      !db ||
      item.pyq_year ===
        null
    ) {
      setMessage(
        'This question cannot be auto-repaired because its PYQ year is missing.'
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

    setMessage(
      'Canonical appearance repaired.'
    );

    await loadQuestions();
  }

  function prepareAnotherAppearance(
    item:
      QuestionRow
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

    setRelevantGs(
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
      setPaperTab(
        GS_PAPERS.includes(
          item.gs_paper ||
          ''
        )
          ? item.gs_paper as
              PaperTab
          : 'GS-I'
      );
    }

    window.scrollTo({
      top:
        0,
      behavior:
        'smooth'
    });

    setMessage(
      'Master question loaded. Enter the new appearance details.'
    );
  }

  const years =
    useMemo(
      () => {
        const set =
          new Set<number>();

        questions.forEach(
          item => {
            if (
              item.pyq_year !==
              null
            ) {
              set.add(
                item.pyq_year
              );
            }

            (
              appearances[
                item.id
              ] || []
            ).forEach(
              a => {
                if (
                  a.year !==
                  null
                ) {
                  set.add(
                    a.year
                  );
                }
              }
            );
          }
        );

        return Array.from(
          set
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
        questions,
        appearances
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
            const list =
              appearances[
                item.id
              ] || [];

            const yearOk =
              filterYear ===
                'all' ||
              String(
                item.pyq_year
              ) ===
                filterYear ||
              list.some(
                a =>
                  String(
                    a.year
                  ) ===
                    filterYear
              );

            if (
              !yearOk
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
        appearances,
        filterYear,
        filterText
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
              padding:
                '10px',
              marginBottom:
                '12px',
              border:
                '1px solid rgba(255,255,255,.1)',
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
                'repeat(auto-fit,minmax(180px,1fr))',
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
                  e =>
                    setOrigin(
                      e.target
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
                  e =>
                    setYear(
                      e.target
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
                    e =>
                      setPaperTab(
                        e.target
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
                  'repeat(auto-fit,minmax(180px,1fr))',
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
                    e =>
                      setUpscExamName(
                        e.target
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
                    e =>
                      setUpscExamCycle(
                        e.target
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
                    e =>
                      setUpscExamPaper(
                        e.target
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
                  'repeat(auto-fit,minmax(180px,1fr))',
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
                    e =>
                      setStateName(
                        e.target
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
                    e =>
                      setStatePscName(
                        e.target
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
                    e =>
                      setStateExamName(
                        e.target
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
                    e =>
                      setStateCycle(
                        e.target
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
                    e =>
                      setStatePaper(
                        e.target
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
                  'repeat(auto-fit,minmax(180px,1fr))',
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
                    e =>
                      setOptionalSubject(
                        e.target
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
                    e =>
                      setOptionalPaper(
                        e.target
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

          <div
            style={{
              display:
                'grid',
              gridTemplateColumns:
                'repeat(auto-fit,minmax(180px,1fr))',
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
                  e =>
                    setSubject(
                      e.target
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
                  e =>
                    setTopic(
                      e.target
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
                  e =>
                    setSubtopic(
                      e.target
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
                e =>
                  setQuestion(
                    e.target
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
                'repeat(auto-fit,minmax(150px,1fr))',
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
                  e =>
                    setQuestionNumber(
                      e.target
                        .value
                    )
                }
              />
            </label>

            <label>
              Marks

              <input
                type="number"
                step="0.5"
                min="0"
                value={
                  marks
                }
                onChange={
                  e =>
                    setMarks(
                      e.target
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
                  e =>
                    setWordLimit(
                      e.target
                        .value
                    )
                }
              />
            </label>

            <label>
              Status

              <select
                value={
                  status
                }
                onChange={
                  e =>
                    setStatus(
                      e.target
                        .value as
                        Status
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
                e =>
                  setSourceUrl(
                    e.target
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
                        relevantGs.includes(
                          paper
                        )
                      }
                      onChange={() =>
                        toggleGs(
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
                    '1px solid rgba(255,255,255,.1)',
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
                    a,
                    index
                  ) => (
                    <small
                      key={
                        a.appearance_id ||
                        `${match.question_id}-${index}`
                      }
                      style={{
                        display:
                          'block',
                        color:
                          '#94a3b8'
                      }}
                    >
                      {appearanceLabel(
                        a
                      )}
                    </small>
                  )
                )}

                <button
                  type="button"
                  className="primary-btn"
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
              One master question, multiple appearances.
            </small>
          </div>

          <button
            type="button"
            className="secondary-btn"
            onClick={() =>
              void loadQuestions()
            }
            disabled={
              loading
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
              'repeat(auto-fit,minmax(180px,1fr))',
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
              e =>
                setFilterYear(
                  e.target
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
              e =>
                setFilterText(
                  e.target
                    .value
                )
            }
            placeholder="Search question / subject / topic"
          />
        </div>

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
                const list =
                  appearances[
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
                        {list.length}
                        {' '}
                        appearance
                        {list.length ===
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

                      {!list.length && (
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
                            '8px',
                          marginTop:
                            '10px'
                        }}
                      >
                        {list.length ? (
                          list.map(
                            (
                              a,
                              index
                            ) => {
                              const editing =
                                editingAppearanceId ===
                                a.appearance_id;

                              const busy =
                                busyAppearanceId ===
                                a.appearance_id;

                              return (
                                <div
                                  key={
                                    a.appearance_id ||
                                    `${item.id}-${index}`
                                  }
                                  style={{
                                    padding:
                                      '10px',
                                    border:
                                      '1px solid rgba(255,255,255,.06)',
                                    borderRadius:
                                      '8px'
                                  }}
                                >
                                  <div
                                    style={{
                                      display:
                                        'flex',
                                      justifyContent:
                                        'space-between',
                                      gap:
                                        '8px',
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
                                        a
                                      )}
                                    </small>

                                    <div
                                      style={{
                                        display:
                                          'flex',
                                        gap:
                                          '6px'
                                      }}
                                    >
                                      <button
                                        type="button"
                                        className="secondary-btn"
                                        disabled={
                                          busy ||
                                          !a.appearance_id
                                        }
                                        onClick={() =>
                                          startEditAppearance(
                                            a
                                          )
                                        }
                                      >
                                        Edit
                                      </button>

                                      <button
                                        type="button"
                                        className="secondary-btn"
                                        disabled={
                                          busy ||
                                          !a.appearance_id
                                        }
                                        onClick={() =>
                                          void removeAppearance(
                                            a
                                          )
                                        }
                                      >
                                        {busy
                                          ? 'Working...'
                                          : 'Remove'}
                                      </button>
                                    </div>
                                  </div>

                                  {editing && (
                                    <div
                                      style={{
                                        display:
                                          'grid',
                                        gridTemplateColumns:
                                          'repeat(auto-fit,minmax(130px,1fr))',
                                        gap:
                                          '8px',
                                        marginTop:
                                          '8px'
                                      }}
                                    >
                                      <label>
                                        Question No.

                                        <input
                                          value={
                                            editQuestionNumber
                                          }
                                          onChange={
                                            e =>
                                              setEditQuestionNumber(
                                                e.target
                                                  .value
                                              )
                                          }
                                        />
                                      </label>

                                      <label>
                                        Marks

                                        <input
                                          type="number"
                                          step="0.5"
                                          value={
                                            editMarks
                                          }
                                          onChange={
                                            e =>
                                              setEditMarks(
                                                e.target
                                                  .value
                                              )
                                          }
                                        />
                                      </label>

                                      <label>
                                        Word Limit

                                        <input
                                          type="number"
                                          value={
                                            editWordLimit
                                          }
                                          onChange={
                                            e =>
                                              setEditWordLimit(
                                                e.target
                                                  .value
                                              )
                                          }
                                        />
                                      </label>

                                      <div
                                        style={{
                                          display:
                                            'flex',
                                          gap:
                                            '6px',
                                          alignItems:
                                            'end'
                                        }}
                                      >
                                        <button
                                          type="button"
                                          className="primary-btn"
                                          disabled={
                                            busy
                                          }
                                          onClick={() =>
                                            void saveAppearanceEdit(
                                              a
                                            )
                                          }
                                        >
                                          Save
                                        </button>

                                        <button
                                          type="button"
                                          className="secondary-btn"
                                          disabled={
                                            busy
                                          }
                                          onClick={() =>
                                            setEditingAppearanceId(
                                              null
                                            )
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

            {!visibleQuestions.length && (
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

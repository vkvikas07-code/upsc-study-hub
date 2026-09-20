import {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


type ExamStage =
  | 'prelims'
  | 'mains';


type ResourceType =
  | 'standard_book'
  | 'official_source'
  | 'monthly_current_affairs'
  | 'notes'
  | 'report'
  | 'pyq_resource'
  | 'syllabus_resource';


type ContentTab =
  | 'resources'
  | 'prelims'
  | 'mains'
  | 'practice'
  | 'notes';


type ResourceRow = {
  id: string;
  title: string;
  description: string | null;
  resource_type: ResourceType;
  exam_stage:
    | 'prelims'
    | 'mains'
    | 'both';
  paper: string | null;
  subject: string;
  author: string | null;
  publisher: string | null;
  source_name: string | null;
  external_url: string | null;
  language: string;
  is_free: boolean;
  sort_order: number;
};


type PrelimsQuestion = {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  subject: string;
  topic: string | null;
  difficulty: string;
  is_pyq: boolean;
  pyq_year: number | null;
  source: string | null;
};


type MainsQuestion = {
  id: string;
  question: string;

  section_type:
    | 'essay'
    | 'gs'
    | 'optional';

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
};


type SyllabusLinkedContentProps = {
  stage: ExamStage;
  subject: string;
  topic?: string | null;
  paper?: string | null;
};


const RESOURCE_SELECT = `
  id,
  title,
  description,
  resource_type,
  exam_stage,
  paper,
  subject,
  author,
  publisher,
  source_name,
  external_url,
  language,
  is_free,
  sort_order
`;


const PRELIMS_SELECT = `
  id,
  question,
  options,
  correct_index,
  explanation,
  subject,
  topic,
  difficulty,
  is_pyq,
  pyq_year,
  source
`;


const MAINS_SELECT = `
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
  relevant_gs_papers
`;


/* =========================================================
   HELPERS
========================================================= */

function safeNumber(
  value: unknown,
  fallback = 0
): number {

  const number =
    Number(
      value
    );


  return Number.isFinite(
    number
  )
    ? number
    : fallback;
}


function normalise(
  value:
    string |
    null |
    undefined
): string {

  return (
    value ||
    ''
  )
    .trim()
    .toLowerCase()
    .replace(
      /&/g,
      'and'
    )
    .replace(
      /[^a-z0-9]/g,
      ''
    )
    .replace(
      /economics/g,
      'economy'
    );
}


function topicRelevant(
  targetTopic:
    string |
    null |
    undefined,

  ...candidates:
    Array<
      string |
      null |
      undefined
    >
): boolean {

  if (
    !targetTopic
  ) {
    return true;
  }


  const target =
    normalise(
      targetTopic
    );


  if (
    !target
  ) {
    return true;
  }


  return candidates.some(
    candidate => {

      const current =
        normalise(
          candidate
        );


      if (
        !current
      ) {
        return false;
      }


      return (
        current.includes(
          target
        ) ||
        target.includes(
          current
        )
      );
    }
  );
}


function safeUrl(
  value: string | null
): string | null {

  if (
    !value
  ) {
    return null;
  }


  try {

    const url =
      new URL(
        value
      );


    if (
      url.protocol !==
        'http:' &&
      url.protocol !==
        'https:'
    ) {
      return null;
    }


    return url.toString();

  } catch {

    return null;

  }
}


function resourceTypeLabel(
  type: ResourceType
): string {

  switch (
    type
  ) {

    case 'standard_book':
      return 'Standard Book';

    case 'official_source':
      return 'Official Source';

    case 'monthly_current_affairs':
      return 'Monthly Current Affairs';

    case 'notes':
      return 'Notes';

    case 'report':
      return 'Report';

    case 'pyq_resource':
      return 'PYQ Resource';

    case 'syllabus_resource':
      return 'Syllabus Resource';

    default:
      return 'Resource';
  }
}


/* =========================================================
   COMPONENT
========================================================= */

export function SyllabusLinkedContent({
  stage,
  subject,
  topic = null,
  paper = null
}: SyllabusLinkedContentProps) {

  const [
    activeTab,
    setActiveTab
  ] =
    useState<ContentTab>(
      stage ===
        'prelims'
        ? 'prelims'
        : 'mains'
    );


  const [
    resources,
    setResources
  ] =
    useState<ResourceRow[]>(
      []
    );


  const [
    prelimsPyqs,
    setPrelimsPyqs
  ] =
    useState<PrelimsQuestion[]>(
      []
    );


  const [
    mainsPyqs,
    setMainsPyqs
  ] =
    useState<MainsQuestion[]>(
      []
    );


  const [
    practiceQuestions,
    setPracticeQuestions
  ] =
    useState<PrelimsQuestion[]>(
      []
    );


  const [
    userId,
    setUserId
  ] =
    useState<string | null>(
      null
    );


  const [
    signedIn,
    setSignedIn
  ] =
    useState(
      false
    );


  const [
    bookmarked,
    setBookmarked
  ] =
    useState(
      false
    );


  const [
    notes,
    setNotes
  ] =
    useState(
      ''
    );


  const [
    notesDirty,
    setNotesDirty
  ] =
    useState(
      false
    );


  const [
    workspaceSaving,
    setWorkspaceSaving
  ] =
    useState(
      false
    );


  const [
    workspaceMessage,
    setWorkspaceMessage
  ] =
    useState(
      ''
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
    useState(
      ''
    );


  const [
    practiceIndex,
    setPracticeIndex
  ] =
    useState(
      0
    );


  const [
    selectedOption,
    setSelectedOption
  ] =
    useState<number | null>(
      null
    );


  const [
    answerChecked,
    setAnswerChecked
  ] =
    useState(
      false
    );


  /* =======================================================
     RESET WHEN TOPIC CHANGES
  ======================================================= */

  useEffect(
    () => {

      setActiveTab(
        stage ===
          'prelims'
          ? 'prelims'
          : 'mains'
      );


      setPracticeIndex(
        0
      );


      setSelectedOption(
        null
      );


      setAnswerChecked(
        false
      );


      setWorkspaceMessage(
        ''
      );

    },
    [
      stage,
      subject,
      topic,
      paper
    ]
  );


  /* =======================================================
     PRIVATE WORKSPACE
  ======================================================= */

  async function loadWorkspace():
    Promise<void> {

    if (
      !supabase
    ) {
      return;
    }


    const {
      data:
        authData
    } =
      await supabase
        .auth
        .getUser();


    const user =
      authData.user;


    if (
      !user
    ) {

      setUserId(
        null
      );


      setSignedIn(
        false
      );


      setBookmarked(
        false
      );


      setNotes(
        ''
      );


      setNotesDirty(
        false
      );


      return;
    }


    setUserId(
      user.id
    );


    setSignedIn(
      true
    );


    const {
      data,
      error:
        loadError
    } =
      await supabase
        .from(
          'syllabus_topic_workspace'
        )
        .select(
          `
            bookmarked,
            notes
          `
        )
        .eq(
          'user_id',
          user.id
        )
        .eq(
          'exam_stage',
          stage
        )
        .eq(
          'subject',
          subject
        )
        .eq(
          'topic',
          topic ||
          subject
        )
        .eq(
          'paper',
          paper ||
          ''
        )
        .maybeSingle();


    if (
      loadError
    ) {

      console.error(
        'Unable to load topic workspace:',
        loadError
      );


      setWorkspaceMessage(
        loadError.message
      );


      return;
    }


    setBookmarked(
      data?.bookmarked ===
      true
    );


    setNotes(
      String(
        data?.notes ||
        ''
      )
    );


    setNotesDirty(
      false
    );
  }


  async function saveWorkspace(
    nextBookmarked: boolean,
    nextNotes: string
  ): Promise<boolean> {

    if (
      !supabase ||
      !userId
    ) {

      setWorkspaceMessage(
        'Sign in to save bookmarks and notes.'
      );


      return false;
    }


    setWorkspaceSaving(
      true
    );


    setWorkspaceMessage(
      ''
    );


    const {
      error:
        saveError
    } =
      await supabase
        .from(
          'syllabus_topic_workspace'
        )
        .upsert(
          {

            user_id:
              userId,

            exam_stage:
              stage,

            subject,

            topic:
              topic ||
              subject,

            paper:
              paper ||
              '',

            bookmarked:
              nextBookmarked,

            notes:
              nextNotes

          },
          {

            onConflict:
              'user_id,exam_stage,subject,topic,paper'

          }
        );


    setWorkspaceSaving(
      false
    );


    if (
      saveError
    ) {

      console.error(
        'Unable to save topic workspace:',
        saveError
      );


      setWorkspaceMessage(
        saveError.message
      );


      return false;
    }


    return true;
  }


  async function toggleBookmark():
    Promise<void> {

    if (
      !signedIn
    ) {

      setWorkspaceMessage(
        'Sign in to bookmark this topic.'
      );


      return;
    }


    const next =
      !bookmarked;


    const success =
      await saveWorkspace(
        next,
        notes
      );


    if (
      success
    ) {

      setBookmarked(
        next
      );


      setWorkspaceMessage(
        next
          ? 'Topic bookmarked.'
          : 'Bookmark removed.'
      );
    }
  }


  async function saveNotes():
    Promise<void> {

    if (
      !signedIn
    ) {

      setWorkspaceMessage(
        'Sign in to save notes.'
      );


      return;
    }


    const success =
      await saveWorkspace(
        bookmarked,
        notes
      );


    if (
      success
    ) {

      setNotesDirty(
        false
      );


      setWorkspaceMessage(
        'Notes saved.'
      );
    }
  }


  /* =======================================================
     LOAD STUDY DATA
  ======================================================= */

  async function loadStudyContent():
    Promise<void> {

    if (
      !supabase
    ) {

      setError(
        'Supabase is not configured.'
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


    const [
      resourceResult,
      prelimsResult,
      mainsResult
    ] =
      await Promise.all([

        supabase
          .from(
            'study_resources'
          )
          .select(
            RESOURCE_SELECT
          )
          .eq(
            'status',
            'published'
          )
          .ilike(
            'subject',
            subject
          )
          .in(
            'exam_stage',
            [
              stage,
              'both'
            ]
          )
          .order(
            'sort_order',
            {
              ascending:
                true
            }
          )
          .limit(
            50
          ),


        supabase
          .from(
            'questions'
          )
          .select(
            PRELIMS_SELECT
          )
          .eq(
            'status',
            'published'
          )
          .eq(
            'exam_stage',
            'prelims'
          )
          .eq(
            'is_pyq',
            true
          )
          .ilike(
            'subject',
            subject
          )
          .order(
            'pyq_year',
            {
              ascending:
                false
            }
          )
          .limit(
            75
          ),


        supabase
          .from(
            'mains_questions'
          )
          .select(
            MAINS_SELECT
          )
          .eq(
            'question_type',
            'pyq'
          )
          .eq(
            'status',
            'published'
          )
          .ilike(
            'subject',
            subject
          )
          .order(
            'pyq_year',
            {
              ascending:
                false
            }
          )
          .limit(
            75
          )

      ]);


    /* ===================================================
       RESOURCES
    =================================================== */

    if (
      resourceResult.error
    ) {

      console.error(
        'Resource load error:',
        resourceResult.error
      );


      setResources(
        []
      );

    } else {

      const rows:
        ResourceRow[] =
        (
          resourceResult.data ||
          []
        )
          .map(
            item => ({

              id:
                String(
                  item.id
                ),

              title:
                String(
                  item.title ||
                  ''
                ),

              description:
                item.description
                  ? String(
                      item.description
                    )
                  : null,

              resource_type:
                (
                  item.resource_type ||
                  'notes'
                ) as ResourceType,

              exam_stage:
                (
                  item.exam_stage ||
                  'both'
                ) as
                  | 'prelims'
                  | 'mains'
                  | 'both',

              paper:
                item.paper
                  ? String(
                      item.paper
                    )
                  : null,

              subject:
                String(
                  item.subject ||
                  ''
                ),

              author:
                item.author
                  ? String(
                      item.author
                    )
                  : null,

              publisher:
                item.publisher
                  ? String(
                      item.publisher
                    )
                  : null,

              source_name:
                item.source_name
                  ? String(
                      item.source_name
                    )
                  : null,

              external_url:
                item.external_url
                  ? String(
                      item.external_url
                    )
                  : null,

              language:
                String(
                  item.language ||
                  'English'
                ),

              is_free:
                item.is_free ===
                true,

              sort_order:
                safeNumber(
                  item.sort_order
                )

            })
          );


      setResources(
        rows
      );
    }


    /* ===================================================
       PRELIMS PYQ
    =================================================== */

    if (
      prelimsResult.error
    ) {

      console.error(
        'Prelims PYQ error:',
        prelimsResult.error
      );


      setPrelimsPyqs(
        []
      );

    } else {

      const rows:
        PrelimsQuestion[] =
        (
          prelimsResult.data ||
          []
        )
          .map(
            item => ({

              id:
                String(
                  item.id
                ),

              question:
                String(
                  item.question ||
                  ''
                ),

              options:
                Array.isArray(
                  item.options
                )
                  ? item.options.map(
                      option =>
                        String(
                          option
                        )
                    )
                  : [],

              correct_index:
                safeNumber(
                  item.correct_index,
                  0
                ),

              explanation:
                String(
                  item.explanation ||
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

              difficulty:
                String(
                  item.difficulty ||
                  'medium'
                ),

              is_pyq:
                item.is_pyq ===
                true,

              pyq_year:
                item.pyq_year ===
                  null ||
                item.pyq_year ===
                  undefined
                  ? null
                  : safeNumber(
                      item.pyq_year
                    ),

              source:
                item.source
                  ? String(
                      item.source
                    )
                  : null

            })
          );


      setPrelimsPyqs(
        rows
      );
    }


    /* ===================================================
       MAINS PYQ
    =================================================== */

    if (
      mainsResult.error
    ) {

      console.error(
        'Mains PYQ error:',
        mainsResult.error
      );


      setMainsPyqs(
        []
      );

    } else {

      const rows:
        MainsQuestion[] =
        (
          mainsResult.data ||
          []
        )
          .map(
            item => ({

              id:
                String(
                  item.id
                ),

              question:
                String(
                  item.question ||
                  ''
                ),

              section_type:
                (
                  item.section_type ||
                  'gs'
                ) as
                  | 'essay'
                  | 'gs'
                  | 'optional',

              gs_paper:
                item.gs_paper
                  ? String(
                      item.gs_paper
                    )
                  : null,

              optional_subject:
                item.optional_subject
                  ? String(
                      item.optional_subject
                    )
                  : null,

              optional_paper:
                item.optional_paper
                  ? String(
                      item.optional_paper
                    )
                  : null,

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

              question_number:
                item.question_number
                  ? String(
                      item.question_number
                    )
                  : null,

              marks:
                item.marks ===
                  null ||
                item.marks ===
                  undefined
                  ? null
                  : safeNumber(
                      item.marks
                    ),

              word_limit:
                item.word_limit ===
                  null ||
                item.word_limit ===
                  undefined
                  ? null
                  : safeNumber(
                      item.word_limit
                    ),

              pyq_year:
                item.pyq_year ===
                  null ||
                item.pyq_year ===
                  undefined
                  ? null
                  : safeNumber(
                      item.pyq_year
                    ),

              relevant_gs_papers:
                Array.isArray(
                  item.relevant_gs_papers
                )
                  ? item
                      .relevant_gs_papers
                      .map(
                        value =>
                          String(
                            value
                          )
                      )
                  : []

            })
          );


      setMainsPyqs(
        rows
      );
    }


    /* ===================================================
       REGULAR PRELIMS PRACTICE
    =================================================== */

    if (
      stage ===
      'prelims'
    ) {

      const {
        data:
          practiceData,

        error:
          practiceError
      } =
        await supabase
          .from(
            'questions'
          )
          .select(
            PRELIMS_SELECT
          )
          .eq(
            'status',
            'published'
          )
          .eq(
            'exam_stage',
            'prelims'
          )
          .eq(
            'is_pyq',
            false
          )
          .ilike(
            'subject',
            subject
          )
          .limit(
            100
          );


      if (
        practiceError
      ) {

        console.error(
          'Practice load error:',
          practiceError
        );


        setPracticeQuestions(
          []
        );

      } else {

        const rows:
          PrelimsQuestion[] =
          (
            practiceData ||
            []
          )
            .map(
              item => ({

                id:
                  String(
                    item.id
                  ),

                question:
                  String(
                    item.question ||
                    ''
                  ),

                options:
                  Array.isArray(
                    item.options
                  )
                    ? item.options.map(
                        option =>
                          String(
                            option
                          )
                      )
                    : [],

                correct_index:
                  safeNumber(
                    item.correct_index,
                    0
                  ),

                explanation:
                  String(
                    item.explanation ||
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

                difficulty:
                  String(
                    item.difficulty ||
                    'medium'
                  ),

                is_pyq:
                  item.is_pyq ===
                  true,

                pyq_year:
                  item.pyq_year ===
                    null ||
                  item.pyq_year ===
                    undefined
                    ? null
                    : safeNumber(
                        item.pyq_year
                      ),

                source:
                  item.source
                    ? String(
                        item.source
                      )
                    : null

              })
            );


        setPracticeQuestions(
          rows
        );
      }

    } else {

      setPracticeQuestions(
        []
      );
    }


    if (
      resourceResult.error &&
      prelimsResult.error &&
      mainsResult.error
    ) {

      setError(
        'Unable to load topic study content.'
      );
    }


    setLoading(
      false
    );
  }


  /* =======================================================
     AUTO LOAD
  ======================================================= */

  useEffect(
    () => {

      void loadStudyContent();

      void loadWorkspace();

    },
    [
      stage,
      subject,
      topic,
      paper
    ]
  );


  /* =======================================================
     FILTERED DATA
  ======================================================= */

  const visibleResources =
    useMemo(
      () => {

        return resources.filter(
          resource => {

            if (
              paper &&
              resource.paper &&
              normalise(
                resource.paper
              ) !==
              normalise(
                paper
              )
            ) {

              return false;
            }


            return true;
          }
        );

      },
      [
        resources,
        paper
      ]
    );


  const visiblePrelims =
    useMemo(
      () => {

        return prelimsPyqs.filter(
          question =>

            topicRelevant(
              topic,
              question.topic
            )
        );

      },
      [
        prelimsPyqs,
        topic
      ]
    );


  const visibleMains =
    useMemo(
      () => {

        return mainsPyqs.filter(
          question => {

            if (
              !topicRelevant(
                topic,
                question.topic,
                question.subtopic
              )
            ) {

              return false;
            }


            if (
              paper &&
              question.gs_paper
            ) {

              const directMatch =
                normalise(
                  question.gs_paper
                ) ===
                normalise(
                  paper
                );


              const relevantMatch =
                question
                  .relevant_gs_papers
                  .some(
                    relevantPaper =>

                      normalise(
                        relevantPaper
                      ) ===
                      normalise(
                        paper
                      )
                  );


              if (
                !directMatch &&
                !relevantMatch
              ) {

                return false;
              }
            }


            return true;
          }
        );

      },
      [
        mainsPyqs,
        topic,
        paper
      ]
    );


  const visiblePracticeQuestions =
    useMemo(
      () => {

        return practiceQuestions.filter(
          question =>

            topicRelevant(
              topic,
              question.topic
            )
        );

      },
      [
        practiceQuestions,
        topic
      ]
    );


  const currentPractice =
    visiblePracticeQuestions[
      practiceIndex
    ] ||
    null;


  function nextPracticeQuestion():
    void {

    if (
      visiblePracticeQuestions.length ===
      0
    ) {

      return;
    }


    setPracticeIndex(
      current =>

        (
          current +
          1
        ) %
        visiblePracticeQuestions.length
    );


    setSelectedOption(
      null
    );


    setAnswerChecked(
      false
    );
  }


  /* =======================================================
     UI
  ======================================================= */

  return (

    <section
      className="panel"

      style={{

        marginTop:
          '10px',

        padding:
          '14px'

      }}
    >

      {/* =================================================
          HEADER
      ================================================= */}

      <div
        className="panel-head"
      >

        <div>

          <span
            className="eyebrow"
          >
            TOPIC WORKSPACE
          </span>


          <h3
            style={{
              margin:
                '5px 0'
            }}
          >

            {
              topic ||
              subject
            }

          </h3>


          <small
            style={{
              color:
                '#94a3b8'
            }}
          >

            {
              subject
            }


            {
              paper
                ? ` • ${paper}`
                : ''
            }

          </small>

        </div>


        <button

          type="button"

          className={
            bookmarked
              ? 'filter active'
              : 'filter'
          }

          disabled={
            workspaceSaving
          }

          onClick={() =>
            void toggleBookmark()
          }

        >

          {
            bookmarked
              ? '★ Bookmarked'
              : '☆ Bookmark'
          }

        </button>

      </div>


      {
        workspaceMessage && (

          <div
            className="callout"

            style={{
              marginTop:
                '10px'
            }}
          >

            {
              workspaceMessage
            }

          </div>

        )
      }


      {/* =================================================
          METRICS
      ================================================= */}

      <div
        className="metrics-grid"

        style={{
          marginTop:
            '12px'
        }}
      >

        <article
          className="metric-card"
        >

          <div>

            <span>
              Resources
            </span>

            <strong>
              {
                visibleResources.length
              }
            </strong>

          </div>

        </article>


        <article
          className="metric-card"
        >

          <div>

            <span>
              Prelims PYQ
            </span>

            <strong>
              {
                visiblePrelims.length
              }
            </strong>

          </div>

        </article>


        <article
          className="metric-card"
        >

          <div>

            <span>
              Mains PYQ
            </span>

            <strong>
              {
                visibleMains.length
              }
            </strong>

          </div>

        </article>


        <article
          className="metric-card"
        >

          <div>

            <span>
              Practice
            </span>

            <strong>

              {
                stage ===
                  'prelims'
                  ? visiblePracticeQuestions.length
                  : visibleMains.length
              }

            </strong>

          </div>

        </article>

      </div>


      {/* =================================================
          TABS
      ================================================= */}

      <div
        style={{

          display:
            'grid',

          gridTemplateColumns:
            'repeat(auto-fit, minmax(105px, 1fr))',

          gap:
            '7px',

          marginTop:
            '12px'

        }}
      >

        <button

          type="button"

          className={
            activeTab ===
              'resources'
              ? 'filter active'
              : 'filter'
          }

          onClick={() =>
            setActiveTab(
              'resources'
            )
          }

        >
          Resources
        </button>


        <button

          type="button"

          className={
            activeTab ===
              'prelims'
              ? 'filter active'
              : 'filter'
          }

          onClick={() =>
            setActiveTab(
              'prelims'
            )
          }

        >
          Prelims PYQ
        </button>


        <button

          type="button"

          className={
            activeTab ===
              'mains'
              ? 'filter active'
              : 'filter'
          }

          onClick={() =>
            setActiveTab(
              'mains'
            )
          }

        >
          Mains PYQ
        </button>


        <button

          type="button"

          className={
            activeTab ===
              'practice'
              ? 'filter active'
              : 'filter'
          }

          onClick={() =>
            setActiveTab(
              'practice'
            )
          }

        >
          Practice
        </button>


        <button

          type="button"

          className={
            activeTab ===
              'notes'
              ? 'filter active'
              : 'filter'
          }

          onClick={() =>
            setActiveTab(
              'notes'
            )
          }

        >
          My Notes
        </button>

      </div>


      {/* =================================================
          LOADING / ERROR
      ================================================= */}

      {
        loading && (

          <div
            className="callout"

            style={{
              marginTop:
                '12px'
            }}
          >

            Loading topic workspace...

          </div>

        )
      }


      {
        error && (

          <div
            className="callout"

            style={{
              marginTop:
                '12px'
            }}
          >

            {
              error
            }

          </div>

        )
      }


      {/* =================================================
          RESOURCES
      ================================================= */}

      {
        !loading &&
        activeTab ===
          'resources' && (

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
              visibleResources.length ===
              0
                ? (

                  <div
                    className="callout"
                  >
                    No linked resources found yet.
                  </div>

                )

                : visibleResources.map(
                    resource => {

                      const url =
                        safeUrl(
                          resource.external_url
                        );


                      const source =
                        resource.source_name ||
                        resource.publisher ||
                        resource.author;


                      return (

                        <article

                          key={
                            resource.id
                          }

                          style={{

                            padding:
                              '11px 12px',

                            border:
                              '1px solid rgba(255,255,255,.08)',

                            borderRadius:
                              '12px'

                          }}

                        >

                          <small
                            style={{
                              color:
                                '#94a3b8'
                            }}
                          >

                            {
                              resourceTypeLabel(
                                resource.resource_type
                              )
                            }

                            {' • '}

                            {
                              resource.language
                            }

                            {
                              resource.is_free
                                ? ' • Free'
                                : ''
                            }

                          </small>


                          <h4
                            style={{
                              margin:
                                '7px 0 4px'
                            }}
                          >

                            {
                              resource.title
                            }

                          </h4>


                          {
                            source && (

                              <small
                                style={{
                                  color:
                                    '#94a3b8'
                                }}
                              >

                                {
                                  source
                                }

                              </small>

                            )
                          }


                          {
                            resource.description && (

                              <p>
                                {
                                  resource.description
                                }
                              </p>

                            )
                          }


                          {
                            url && (

                              <button

                                type="button"

                                className="secondary-btn"

                                onClick={() =>

                                  window.open(
                                    url,
                                    '_blank',
                                    'noopener,noreferrer'
                                  )
                                }

                              >

                                Open Resource

                              </button>

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


      {/* =================================================
          PRELIMS PYQ
      ================================================= */}

      {
        !loading &&
        activeTab ===
          'prelims' && (

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
              visiblePrelims.length ===
              0
                ? (

                  <div
                    className="callout"
                  >
                    No linked Prelims PYQs found yet.
                  </div>

                )

                : visiblePrelims.map(
                    (
                      question,
                      index
                    ) => (

                      <details

                        key={
                          question.id
                        }

                        style={{

                          padding:
                            '11px 12px',

                          border:
                            '1px solid rgba(255,255,255,.08)',

                          borderRadius:
                            '12px'

                        }}

                      >

                        <summary
                          style={{
                            cursor:
                              'pointer'
                          }}
                        >

                          <strong>

                            {
                              question.pyq_year
                                ? `${question.pyq_year} • `
                                : ''
                            }

                            Q{
                              index + 1
                            }

                          </strong>


                          <div
                            style={{
                              marginTop:
                                '5px'
                            }}
                          >

                            {
                              question.question
                            }

                          </div>

                        </summary>


                        <div
                          style={{
                            marginTop:
                              '12px'
                          }}
                        >

                          {
                            question.options.map(
                              (
                                option,
                                optionIndex
                              ) => (

                                <div

                                  key={
                                    optionIndex
                                  }

                                  style={{

                                    padding:
                                      '7px 9px',

                                    marginTop:
                                      '5px',

                                    border:
                                      '1px solid rgba(255,255,255,.08)',

                                    borderRadius:
                                      '9px'

                                  }}

                                >

                                  {
                                    String.fromCharCode(
                                      65 +
                                      optionIndex
                                    )
                                  }.

                                  {' '}

                                  {
                                    option
                                  }

                                </div>

                              )
                            )
                          }


                          <div
                            className="callout"

                            style={{
                              marginTop:
                                '10px'
                            }}
                          >

                            <strong>
                              Correct Answer:
                            </strong>

                            {' '}

                            {
                              String.fromCharCode(
                                65 +
                                question.correct_index
                              )
                            }

                          </div>


                          {
                            question.explanation && (

                              <p>
                                {
                                  question.explanation
                                }
                              </p>

                            )
                          }

                        </div>

                      </details>

                    )
                  )
            }

          </div>

        )
      }


      {/* =================================================
          MAINS PYQ
      ================================================= */}

      {
        !loading &&
        activeTab ===
          'mains' && (

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
              visibleMains.length ===
              0
                ? (

                  <div
                    className="callout"
                  >
                    No linked Mains PYQs found yet.
                  </div>

                )

                : visibleMains.map(
                    (
                      question,
                      index
                    ) => (

                      <article

                        key={
                          question.id
                        }

                        style={{

                          padding:
                            '12px',

                          border:
                            '1px solid rgba(255,255,255,.08)',

                          borderRadius:
                            '12px'

                        }}

                      >

                        <small
                          style={{
                            color:
                              '#94a3b8'
                          }}
                        >

                          {
                            question.pyq_year ||
                            'Year unavailable'
                          }

                          {
                            question.gs_paper
                              ? ` • ${question.gs_paper}`
                              : ''
                          }

                          {
                            question.marks !==
                              null
                              ? ` • ${question.marks} Marks`
                              : ''
                          }

                          {
                            question.word_limit !==
                              null
                              ? ` • ${question.word_limit} Words`
                              : ''
                          }

                        </small>


                        <p>

                          <strong>

                            {
                              question.question_number
                                ? `Q${question.question_number}. `
                                : `Q${index + 1}. `
                            }

                            {
                              question.question
                            }

                          </strong>

                        </p>


                        {
                          (
                            question.topic ||
                            question.subtopic
                          ) && (

                            <small
                              style={{
                                color:
                                  '#94a3b8'
                              }}
                            >

                              {
                                question.topic ||
                                subject
                              }

                              {
                                question.subtopic
                                  ? ` → ${question.subtopic}`
                                  : ''
                              }

                            </small>

                          )
                        }

                      </article>

                    )
                  )
            }

          </div>

        )
      }


      {/* =================================================
          PRACTICE
      ================================================= */}

      {
        !loading &&
        activeTab ===
          'practice' && (

          <div
            style={{
              marginTop:
                '12px'
            }}
          >

            {
              stage ===
                'prelims' && (

                <>

                  {
                    !currentPractice
                      ? (

                        <div
                          className="callout"
                        >
                          No regular practice questions are linked to this topic yet.
                        </div>

                      )

                      : (

                        <article
                          style={{

                            padding:
                              '14px',

                            border:
                              '1px solid rgba(255,255,255,.08)',

                            borderRadius:
                              '12px'

                          }}
                        >

                          <small
                            style={{
                              color:
                                '#94a3b8'
                            }}
                          >

                            Question {
                              practiceIndex +
                              1
                            } of {
                              visiblePracticeQuestions.length
                            }

                            {' • '}

                            {
                              currentPractice.difficulty
                            }

                          </small>


                          <h4>
                            {
                              currentPractice.question
                            }
                          </h4>


                          <div
                            style={{

                              display:
                                'grid',

                              gap:
                                '7px'

                            }}
                          >

                            {
                              currentPractice.options.map(
                                (
                                  option,
                                  optionIndex
                                ) => {

                                  const selected =
                                    selectedOption ===
                                    optionIndex;


                                  const correct =
                                    answerChecked &&
                                    optionIndex ===
                                    currentPractice.correct_index;


                                  return (

                                    <button

                                      key={
                                        optionIndex
                                      }

                                      type="button"

                                      className={
                                        selected ||
                                        correct
                                          ? 'filter active'
                                          : 'filter'
                                      }

                                      disabled={
                                        answerChecked
                                      }

                                      onClick={() =>
                                        setSelectedOption(
                                          optionIndex
                                        )
                                      }

                                      style={{

                                        textAlign:
                                          'left',

                                        whiteSpace:
                                          'normal'

                                      }}

                                    >

                                      {
                                        String.fromCharCode(
                                          65 +
                                          optionIndex
                                        )
                                      }.

                                      {' '}

                                      {
                                        option
                                      }

                                    </button>

                                  );
                                }
                              )
                            }

                          </div>


                          {
                            !answerChecked && (

                              <button

                                type="button"

                                className="primary-btn"

                                disabled={
                                  selectedOption ===
                                  null
                                }

                                onClick={() =>
                                  setAnswerChecked(
                                    true
                                  )
                                }

                                style={{
                                  marginTop:
                                    '12px'
                                }}

                              >

                                Check Answer

                              </button>

                            )
                          }


                          {
                            answerChecked && (

                              <div
                                className="callout"

                                style={{
                                  marginTop:
                                    '12px'
                                }}
                              >

                                <strong>

                                  {
                                    selectedOption ===
                                    currentPractice.correct_index

                                      ? 'Correct.'

                                      : `Correct answer: ${String.fromCharCode(
                                          65 +
                                          currentPractice.correct_index
                                        )}`
                                  }

                                </strong>


                                {
                                  currentPractice.explanation && (

                                    <p
                                      style={{
                                        marginBottom:
                                          0
                                      }}
                                    >

                                      {
                                        currentPractice.explanation
                                      }

                                    </p>

                                  )
                                }

                              </div>

                            )
                          }


                          {
                            answerChecked && (

                              <button

                                type="button"

                                className="secondary-btn"

                                onClick={
                                  nextPracticeQuestion
                                }

                                style={{
                                  marginTop:
                                    '10px'
                                }}

                              >

                                Next Question

                              </button>

                            )
                          }

                        </article>

                      )
                  }

                </>

              )
            }


            {
              stage ===
                'mains' && (

                <>

                  {
                    visibleMains.length ===
                    0
                      ? (

                        <div
                          className="callout"
                        >
                          No Mains answer-writing questions are linked to this topic yet.
                        </div>

                      )

                      : (

                        <div
                          style={{

                            display:
                              'grid',

                            gap:
                              '10px'

                          }}
                        >

                          {
                            visibleMains
                              .slice(
                                0,
                                10
                              )
                              .map(
                                (
                                  question,
                                  index
                                ) => (

                                  <article

                                    key={
                                      question.id
                                    }

                                    style={{

                                      padding:
                                        '12px',

                                      border:
                                        '1px solid rgba(255,255,255,.08)',

                                      borderRadius:
                                        '12px'

                                    }}

                                  >

                                    <small
                                      style={{
                                        color:
                                          '#94a3b8'
                                      }}
                                    >

                                      Answer Writing {
                                        index +
                                        1
                                      }

                                      {
                                        question.marks !==
                                          null
                                          ? ` • ${question.marks} Marks`
                                          : ''
                                      }

                                      {
                                        question.word_limit !==
                                          null
                                          ? ` • ${question.word_limit} Words`
                                          : ''
                                      }

                                    </small>


                                    <p
                                      style={{
                                        marginBottom:
                                          0
                                      }}
                                    >

                                      <strong>
                                        {
                                          question.question
                                        }
                                      </strong>

                                    </p>

                                  </article>

                                )
                              )
                          }

                        </div>

                      )
                  }

                </>

              )
            }

          </div>

        )
      }


      {/* =================================================
          NOTES
      ================================================= */}

      {
        !loading &&
        activeTab ===
          'notes' && (

          <div
            style={{
              marginTop:
                '12px'
            }}
          >

            {
              !signedIn && (

                <div
                  className="callout"

                  style={{
                    marginBottom:
                      '10px'
                  }}
                >

                  Sign in to create private notes for this topic.

                </div>

              )
            }


            <label>

              Personal Notes

              <textarea

                rows={
                  12
                }

                value={
                  notes
                }

                disabled={
                  !signedIn
                }

                onChange={
                  event => {

                    setNotes(
                      event.target.value
                    );


                    setNotesDirty(
                      true
                    );

                  }
                }

                placeholder={
                  `Write your notes for ${topic || subject}...`
                }

              />

            </label>


            <div
              style={{

                display:
                  'flex',

                alignItems:
                  'center',

                gap:
                  '10px',

                flexWrap:
                  'wrap',

                marginTop:
                  '10px'

              }}
            >

              <button

                type="button"

                className="primary-btn"

                disabled={
                  !signedIn ||
                  workspaceSaving ||
                  !notesDirty
                }

                onClick={() =>
                  void saveNotes()
                }

              >

                {
                  workspaceSaving
                    ? 'Saving...'
                    : 'Save Notes'
                }

              </button>


              {
                signedIn && (

                  <small
                    style={{
                      color:
                        '#94a3b8'
                    }}
                  >

                    {
                      notesDirty
                        ? 'Unsaved changes'
                        : 'Notes saved'
                    }

                  </small>

                )
              }

            </div>

          </div>

        )
      }

    </section>

  );
}

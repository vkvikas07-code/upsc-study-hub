import {
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';

import {
  supabase
} from '../lib/supabase';

import {
  SyllabusLinkedContent
} from '../components/SyllabusLinkedContent';


/* =========================================================
   TYPES
========================================================= */

type ExamStage =
  | 'prelims'
  | 'mains';


type SyllabusTopic = {
  id: string;
  exam_stage: ExamStage;
  paper: string | null;
  subject: string;
  topic: string;
  parent_id: string | null;
  sort_order: number;
};


type ProgressRow = {
  topic_id: string;
  completion: number;
  revised_at: string | null;
};


type StandardBook = {
  id: string;
  title: string;
  subject: string;
  author: string | null;
  publisher: string | null;
  sort_order: number;
};


type LearnPageProps = {
  initialSubject?: string | null;
};


type ProgressOption = {
  value: number;
  label: string;
};


/* =========================================================
   CONSTANTS
========================================================= */

const PROGRESS_OPTIONS: ProgressOption[] = [

  {
    value: 0,
    label: 'Not Started'
  },

  {
    value: 25,
    label: 'Started'
  },

  {
    value: 50,
    label: 'Studied'
  },

  {
    value: 75,
    label: 'Revision'
  },

  {
    value: 100,
    label: 'Completed'
  }

];


/* =========================================================
   HELPERS
========================================================= */

function clampProgress(
  value: number
): number {

  if (
    !Number.isFinite(
      value
    )
  ) {

    return 0;

  }


  return Math.min(
    100,
    Math.max(
      0,
      Math.round(
        value
      )
    )
  );

}


function average(
  values: number[]
): number {

  if (
    values.length ===
    0
  ) {

    return 0;

  }


  const total =
    values.reduce(
      (
        sum,
        value
      ) =>
        sum + value,
      0
    );


  return Math.round(
    total /
    values.length
  );

}


function progressLabel(
  value: number
): string {

  if (
    value >=
    100
  ) {

    return 'Completed';

  }


  if (
    value >=
    75
  ) {

    return 'Revision';

  }


  if (
    value >=
    50
  ) {

    return 'Studied';

  }


  if (
    value >
    0
  ) {

    return 'Started';

  }


  return 'Not Started';

}


function normalise(
  value: string
): string {

  return value
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


/* =========================================================
   COMPONENT
========================================================= */

export function LearnPage({
  initialSubject = null
}: LearnPageProps) {

  /* =======================================================
     DATABASE DATA
  ======================================================= */

  const [
    topics,
    setTopics
  ] =
    useState<SyllabusTopic[]>(
      []
    );


  const [
    books,
    setBooks
  ] =
    useState<StandardBook[]>(
      []
    );


  const [
    progressMap,
    setProgressMap
  ] =
    useState<
      Record<
        string,
        number
      >
    >(
      {}
    );


  /* =======================================================
     USER
  ======================================================= */

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


  /* =======================================================
     GENERAL UI
  ======================================================= */

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
    message,
    setMessage
  ] =
    useState(
      ''
    );


  const [
    savingTopicId,
    setSavingTopicId
  ] =
    useState<string | null>(
      null
    );


  /* =======================================================
     SYLLABUS FILTERS
  ======================================================= */

  const [
    stage,
    setStage
  ] =
    useState<ExamStage>(
      'prelims'
    );


  const [
    paperFilter,
    setPaperFilter
  ] =
    useState(
      'all'
    );


  const [
    searchText,
    setSearchText
  ] =
    useState(
      ''
    );


  const [
    filtersOpen,
    setFiltersOpen
  ] =
    useState(
      false
    );


  const [
    hideCompleted,
    setHideCompleted
  ] =
    useState(
      false
    );


  /* =======================================================
     EXPANSION STATE
  ======================================================= */

  const [
    expandedSubject,
    setExpandedSubject
  ] =
    useState<string | null>(
      null
    );


  const [
    expandedTopics,
    setExpandedTopics
  ] =
    useState<
      Set<string>
    >(
      new Set()
    );


  /*
   * Only one topic's linked content
   * will stay open at a time.
   */

  const [
    linkedTopicId,
    setLinkedTopicId
  ] =
    useState<string | null>(
      null
    );


  /* =======================================================
     LOAD SYLLABUS
  ======================================================= */

  async function loadSyllabus():
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

    setMessage(
      ''
    );


    /*
     * Load syllabus and standard books
     * together.
     */

    const [
      topicResult,
      bookResult
    ] =
      await Promise.all([

        supabase
          .from(
            'syllabus_topics'
          )
          .select(
            `
              id,
              exam_stage,
              paper,
              subject,
              topic,
              parent_id,
              sort_order
            `
          )
          .order(
            'sort_order',
            {
              ascending:
                true
            }
          ),


        supabase
          .from(
            'study_resources'
          )
          .select(
            `
              id,
              title,
              subject,
              author,
              publisher,
              sort_order
            `
          )
          .eq(
            'resource_type',
            'standard_book'
          )
          .eq(
            'status',
            'published'
          )
          .order(
            'subject',
            {
              ascending:
                true
            }
          )
          .order(
            'sort_order',
            {
              ascending:
                true
            }
          )

      ]);


    /* ===================================================
       SYLLABUS ERROR
    =================================================== */

    if (
      topicResult.error
    ) {

      console.error(
        'Unable to load syllabus:',
        topicResult.error
      );


      setError(
        topicResult.error.message
      );


      setLoading(
        false
      );


      return;

    }


    /* ===================================================
       CLEAN SYLLABUS DATA
    =================================================== */

    const cleanTopics:
      SyllabusTopic[] =
      (
        topicResult.data ||
        []
      )
        .filter(
          item =>

            item.exam_stage ===
              'prelims' ||

            item.exam_stage ===
              'mains'
        )
        .map(
          item => ({

            id:
              String(
                item.id
              ),

            exam_stage:
              item.exam_stage as
                ExamStage,

            paper:
              item.paper
                ? String(
                    item.paper
                  )
                : null,

            subject:
              String(
                item.subject ||
                'Other'
              ),

            topic:
              String(
                item.topic ||
                ''
              ),

            parent_id:
              item.parent_id
                ? String(
                    item.parent_id
                  )
                : null,

            sort_order:
              Number(
                item.sort_order ||
                0
              )

          })
        );


    setTopics(
      cleanTopics
    );


    /* ===================================================
       STANDARD BOOKS
    =================================================== */

    if (
      bookResult.error
    ) {

      console.error(
        'Unable to load standard books:',
        bookResult.error
      );


      setBooks(
        []
      );

    } else {

      const cleanBooks:
        StandardBook[] =
        (
          bookResult.data ||
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

              subject:
                String(
                  item.subject ||
                  'General'
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

              sort_order:
                Number(
                  item.sort_order ||
                  0
                )

            })
          );


      setBooks(
        cleanBooks
      );

    }


    /* ===================================================
       AUTH USER
    =================================================== */

    const {
      data:
        authData
    } =
      await supabase
        .auth
        .getUser();


    const user =
      authData.user;


    /*
     * Syllabus can still be read
     * without login.
     */

    if (
      !user
    ) {

      setSignedIn(
        false
      );

      setUserId(
        null
      );

      setProgressMap(
        {}
      );

      setLoading(
        false
      );

      return;

    }


    setSignedIn(
      true
    );


    setUserId(
      user.id
    );


    /* ===================================================
       USER PROGRESS
    =================================================== */

    const {
      data:
        progressData,

      error:
        progressError
    } =
      await supabase
        .from(
          'user_progress'
        )
        .select(
          `
            topic_id,
            completion,
            revised_at
          `
        )
        .eq(
          'user_id',
          user.id
        );


    if (
      progressError
    ) {

      console.error(
        'Unable to load syllabus progress:',
        progressError
      );


      setError(
        progressError.message
      );


      setLoading(
        false
      );


      return;

    }


    const nextProgress:
      Record<
        string,
        number
      > =
      {};


    (
      (
        progressData ||
        []
      ) as ProgressRow[]
    )
      .forEach(
        row => {

          nextProgress[
            row.topic_id
          ] =
            clampProgress(
              Number(
                row.completion ||
                0
              )
            );

        }
      );


    setProgressMap(
      nextProgress
    );


    setLoading(
      false
    );

  }


  /* =======================================================
     FIRST LOAD
  ======================================================= */

  useEffect(
    () => {

      void loadSyllabus();

    },
    []
  );


  /* =======================================================
     INITIAL SUBJECT
  ======================================================= */

  useEffect(
    () => {

      if (
        initialSubject
      ) {

        setStage(
          'prelims'
        );


        setSearchText(
          initialSubject
        );


        setFiltersOpen(
          true
        );

      } else {

        setSearchText(
          ''
        );

      }


      setPaperFilter(
        'all'
      );

    },
    [
      initialSubject
    ]
  );


  /* =======================================================
     RESET WHEN STAGE CHANGES
  ======================================================= */

  useEffect(
    () => {

      setPaperFilter(
        'all'
      );


      setExpandedSubject(
        null
      );


      setExpandedTopics(
        new Set()
      );


      setLinkedTopicId(
        null
      );


      setHideCompleted(
        false
      );

    },
    [
      stage
    ]
  );


  /* =======================================================
     SAVE TOPIC PROGRESS
  ======================================================= */

  async function saveProgress(
    topicId: string,
    nextValue: number
  ): Promise<void> {

    if (
      !supabase ||
      !userId
    ) {

      setMessage(
        'Sign in to save syllabus progress.'
      );

      return;

    }


    const value =
      clampProgress(
        nextValue
      );


    const previousValue =
      progressMap[
        topicId
      ] ||
      0;


    /*
     * Optimistic UI update.
     */

    setProgressMap(
      current => ({

        ...current,

        [topicId]:
          value

      })
    );


    setSavingTopicId(
      topicId
    );


    setMessage(
      ''
    );


    const {
      error:
        saveError
    } =
      await supabase
        .from(
          'user_progress'
        )
        .upsert(
          {

            user_id:
              userId,

            topic_id:
              topicId,

            completion:
              value,

            revised_at:
              new Date()
                .toISOString()

          },
          {

            onConflict:
              'user_id,topic_id'

          }
        );


    if (
      saveError
    ) {

      console.error(
        'Unable to save progress:',
        saveError
      );


      /*
       * Restore previous value.
       */

      setProgressMap(
        current => ({

          ...current,

          [topicId]:
            previousValue

        })
      );


      setMessage(
        `Unable to save progress: ${saveError.message}`
      );

    } else {

      setMessage(
        `${value}% progress saved.`
      );

    }


    setSavingTopicId(
      null
    );

  }


  /* =======================================================
     TOPICS FOR CURRENT EXAM STAGE
  ======================================================= */

  const stageTopics =
    useMemo(
      () =>

        topics.filter(
          topic =>
            topic.exam_stage ===
            stage
        ),

      [
        topics,
        stage
      ]
    );


  /* =======================================================
     CHILD TOPIC MAP
  ======================================================= */

  const childrenMap =
    useMemo(
      () => {

        const map =
          new Map<
            string,
            SyllabusTopic[]
          >();


        stageTopics.forEach(
          topic => {

            if (
              !topic.parent_id
            ) {

              return;

            }


            const current =
              map.get(
                topic.parent_id
              ) ||
              [];


            current.push(
              topic
            );


            map.set(
              topic.parent_id,
              current
            );

          }
        );


        /*
         * Keep children in database
         * sort order.
         */

        map.forEach(
          list => {

            list.sort(
              (
                first,
                second
              ) =>

                first.sort_order -
                second.sort_order
            );

          }
        );


        return map;

      },
      [
        stageTopics
      ]
    );


  /* =======================================================
     GET LEAF IDS

     Explicit return type is required
     because this function is recursive.
  ======================================================= */

  function getLeafIds(
    topicId: string
  ): string[] {

    const children =
      childrenMap.get(
        topicId
      ) ||
      [];


    if (
      children.length ===
      0
    ) {

      return [
        topicId
      ];

    }


    return children.flatMap(
      child =>
        getLeafIds(
          child.id
        )
    );

  }


  /* =======================================================
     CALCULATE TOPIC PROGRESS
  ======================================================= */

  function getTopicProgress(
    topicId: string
  ): number {

    const leafIds =
      getLeafIds(
        topicId
      );


    const values =
      leafIds.map(
        id =>
          progressMap[
            id
          ] ||
          0
      );


    return average(
      values
    );

  }


  /* =======================================================
     ROOT TOPICS
  ======================================================= */

  const rootTopics =
    useMemo(
      () =>

        stageTopics.filter(
          topic =>
            !topic.parent_id
        ),

      [
        stageTopics
      ]
    );


  /* =======================================================
     PAPER OPTIONS
  ======================================================= */

  const paperOptions =
    useMemo(
      () => {

        return Array
          .from(
            new Set(
              stageTopics
                .map(
                  topic =>
                    topic.paper
                      ?.trim()
                )
                .filter(
                  (
                    value
                  ): value is string =>
                    Boolean(
                      value
                    )
                )
            )
          )
          .sort(
            (
              first,
              second
            ) =>
              first.localeCompare(
                second
              )
          );

      },
      [
        stageTopics
      ]
    );


  /* =======================================================
     RECURSIVE SEARCH MATCH

     Explicit : boolean prevents
     TypeScript recursive inference error.
  ======================================================= */

  function topicMatchesSearch(
    topic: SyllabusTopic
  ): boolean {

    const query =
      searchText
        .trim()
        .toLowerCase();


    if (
      !query
    ) {

      return true;

    }


    const topicText =
      [
        topic.subject,
        topic.paper ||
          '',
        topic.topic
      ]
        .join(
          ' '
        )
        .toLowerCase();


    if (
      topicText.includes(
        query
      )
    ) {

      return true;

    }


    const children =
      childrenMap.get(
        topic.id
      ) ||
      [];


    return children.some(
      child =>
        topicMatchesSearch(
          child
        )
    );

  }


  /* =======================================================
     FILTER ROOT TOPICS
  ======================================================= */

  const visibleRootTopics =
    useMemo(
      () => {

        return rootTopics.filter(
          topic => {

            /* paper */

            if (
              paperFilter !==
                'all' &&

              topic.paper !==
                paperFilter
            ) {

              return false;

            }


            /* search */

            if (
              !topicMatchesSearch(
                topic
              )
            ) {

              return false;

            }


            /* completed */

            if (
              hideCompleted &&

              getTopicProgress(
                topic.id
              ) >=
                100
            ) {

              return false;

            }


            return true;

          }
        );

      },
      [
        rootTopics,
        paperFilter,
        searchText,
        hideCompleted,
        progressMap,
        childrenMap
      ]
    );


  /* =======================================================
     SUBJECT NAMES
  ======================================================= */

  const subjectNames =
    useMemo(
      () => {

        return Array
          .from(
            new Set(
              visibleRootTopics.map(
                topic =>
                  topic.subject
              )
            )
          )
          .sort(
            (
              first,
              second
            ) =>
              first.localeCompare(
                second
              )
          );

      },
      [
        visibleRootTopics
      ]
    );


  /* =======================================================
     ROOT TOPICS FOR SUBJECT
  ======================================================= */

  function rootTopicsForSubject(
    subject: string
  ): SyllabusTopic[] {

    return visibleRootTopics.filter(
      topic =>
        topic.subject ===
        subject
    );

  }


  /* =======================================================
     STANDARD BOOKS FOR SUBJECT
  ======================================================= */

  function booksForSubject(
    subject: string
  ): StandardBook[] {

    const target =
      normalise(
        subject
      );


    return books.filter(
      book =>
        normalise(
          book.subject
        ) ===
        target
    );

  }


  /* =======================================================
     SUBJECT PROGRESS
  ======================================================= */

  function getSubjectProgress(
    subject: string
  ): number {

    const roots =
      stageTopics.filter(
        topic =>

          !topic.parent_id &&

          topic.subject ===
            subject
      );


    const ids =
      roots.flatMap(
        topic =>
          getLeafIds(
            topic.id
          )
      );


    const values =
      ids.map(
        id =>
          progressMap[
            id
          ] ||
          0
      );


    return average(
      values
    );

  }


  /* =======================================================
     ALL LEAF TOPICS
  ======================================================= */

  const stageLeafIds =
    useMemo(
      () => {

        return stageTopics
          .filter(
            topic =>

              (
                childrenMap.get(
                  topic.id
                ) ||
                []
              ).length ===
              0
          )
          .map(
            topic =>
              topic.id
          );

      },
      [
        stageTopics,
        childrenMap
      ]
    );


  /* =======================================================
     OVERALL STAGE PROGRESS
  ======================================================= */

  const overallProgress =
    average(
      stageLeafIds.map(
        id =>
          progressMap[
            id
          ] ||
          0
      )
    );


  const completedTopics =
    stageLeafIds.filter(
      id =>

        (
          progressMap[
            id
          ] ||
          0
        ) >=
        100
    ).length;


  const startedTopics =
    stageLeafIds.filter(
      id =>

        (
          progressMap[
            id
          ] ||
          0
        ) >
        0
    ).length;


  /* =======================================================
     EXPAND / COLLAPSE TOPIC
  ======================================================= */

  function toggleTopic(
    id: string
  ): void {

    setExpandedTopics(
      current => {

        const next =
          new Set(
            current
          );


        if (
          next.has(
            id
          )
        ) {

          next.delete(
            id
          );

        } else {

          next.add(
            id
          );

        }


        return next;

      }
    );

  }


  /* =======================================================
     RECURSIVE TOPIC RENDERER

     Explicit ReactNode fixes TypeScript
     recursive return type error.
  ======================================================= */

  function renderTopic(
    topic: SyllabusTopic,
    depth = 0
  ): ReactNode {

    const children =
      childrenMap.get(
        topic.id
      ) ||
      [];


    const hasChildren =
      children.length >
      0;


    const expanded =
      expandedTopics.has(
        topic.id
      );


    const linkedOpen =
      linkedTopicId ===
      topic.id;


    const progress =
      hasChildren
        ? getTopicProgress(
            topic.id
          )
        : progressMap[
            topic.id
          ] ||
          0;


    const searchQuery =
      searchText
        .trim()
        .toLowerCase();


    const matchingChildren =
      children.filter(
        child =>

          !searchQuery ||

          topicMatchesSearch(
            child
          )
      );


    /*
     * Hide completed topic if
     * filter is enabled.
     */

    if (
      hideCompleted &&
      progress >=
      100
    ) {

      return null;

    }


    return (

      <div

        key={
          topic.id
        }

        style={{

          marginLeft:
            `${depth * 10}px`,

          marginTop:
            '8px',

          padding:
            '11px 12px',

          border:
            '1px solid rgba(255,255,255,.08)',

          borderRadius:
            '12px',

          background:
            depth >
            0
              ? 'rgba(255,255,255,.015)'
              : 'rgba(255,255,255,.025)'

        }}

      >

        {/* =============================================
            TOPIC HEADER
        ============================================= */}

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

          {/* ===========================================
              TOPIC TITLE
          =========================================== */}

          <button

            type="button"

            onClick={() => {

              if (
                hasChildren
              ) {

                toggleTopic(
                  topic.id
                );

              }

            }}

            style={{

              border:
                0,

              background:
                'transparent',

              color:
                'inherit',

              cursor:
                hasChildren
                  ? 'pointer'
                  : 'default',

              padding:
                0,

              textAlign:
                'left',

              flex:
                '1 1 220px',

              whiteSpace:
                'normal'

            }}

          >

            <strong>

              {
                hasChildren
                  ? (
                    expanded
                      ? '▾ '
                      : '▸ '
                  )
                  : '• '
              }

              {
                topic.topic
              }

            </strong>


            <small
              style={{

                display:
                  'block',

                color:
                  '#94a3b8',

                marginTop:
                  '3px'

              }}
            >

              {
                progressLabel(
                  progress
                )
              }

              {' • '}

              {
                progress
              }

              %

            </small>

          </button>


          {/* ===========================================
              ACTION AREA
          =========================================== */}

          <div
            style={{

              display:
                'flex',

              alignItems:
                'center',

              gap:
                '7px',

              flexWrap:
                'wrap'

            }}
          >

            {/* =========================================
                STUDY LINKS BUTTON
            ========================================= */}

            <button

              type="button"

              className={
                linkedOpen
                  ? 'filter active'
                  : 'filter'
              }

              onClick={() =>

                setLinkedTopicId(
                  current =>

                    current ===
                    topic.id

                      ? null

                      : topic.id
                )

              }

            >

              {
                linkedOpen
                  ? 'Hide Study'
                  : 'Study Links'
              }

            </button>


            {/* =========================================
                PROGRESS SELECT
            ========================================= */}

            {
              !hasChildren &&
              signedIn && (

                <select

                  value={
                    progress
                  }

                  disabled={
                    savingTopicId ===
                    topic.id
                  }

                  onChange={
                    event =>

                      void saveProgress(
                        topic.id,
                        Number(
                          event.target.value
                        )
                      )
                  }

                  style={{
                    minWidth:
                      '125px'
                  }}

                >

                  {
                    PROGRESS_OPTIONS.map(
                      option => (

                        <option

                          key={
                            option.value
                          }

                          value={
                            option.value
                          }

                        >

                          {
                            option.value
                          }

                          %

                          {' — '}

                          {
                            option.label
                          }

                        </option>

                      )
                    )
                  }

                </select>

              )
            }

          </div>

        </div>


        {/* =============================================
            TOPIC PROGRESS BAR
        ============================================= */}

        <div
          style={{

            height:
              '5px',

            borderRadius:
              '999px',

            overflow:
              'hidden',

            background:
              'rgba(255,255,255,.08)',

            marginTop:
              '8px'

          }}
        >

          <div
            style={{

              height:
                '100%',

              width:
                `${progress}%`,

              background:
                'currentColor',

              transition:
                'width .2s ease'

            }}
          />

        </div>


        {/* =============================================
            LINKED STUDY CONTENT

            Important:
            Component only mounts after
            user presses Study Links.
        ============================================= */}

        {
          linkedOpen && (

            <SyllabusLinkedContent

              stage={
                stage
              }

              subject={
                topic.subject
              }

              topic={
                topic.topic
              }

              paper={
                topic.paper
              }

            />

          )
        }


        {/* =============================================
            CHILD TOPICS
        ============================================= */}

        {
          hasChildren &&
          expanded && (

            <div
              style={{
                marginTop:
                  '7px'
              }}
            >

              {
                matchingChildren.map(
                  child =>

                    renderTopic(
                      child,
                      depth + 1
                    )
                )
              }

            </div>

          )
        }

      </div>

    );

  }


  /* =======================================================
     PAGE UI
  ======================================================= */

  return (

    <>

      {/* ===================================================
          SYLLABUS HEADER
      =================================================== */}

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
          UPSC SYLLABUS
        </span>


        <h2
          style={{
            margin:
              '6px 0 4px'
          }}
        >
          Syllabus Tracker
        </h2>


        <p>
          Track preparation from subject
          to topic and subtopic, then open
          linked study resources and PYQs.
        </p>


        {/* =================================================
            EXAM STAGE
        ================================================= */}

        <div
          style={{

            display:
              'grid',

            gridTemplateColumns:
              'repeat(2, minmax(0, 1fr))',

            gap:
              '8px',

            marginTop:
              '14px'

          }}
        >

          <button

            type="button"

            className={
              stage ===
              'prelims'
                ? 'filter active'
                : 'filter'
            }

            onClick={() =>
              setStage(
                'prelims'
              )
            }

          >

            Prelims

          </button>


          <button

            type="button"

            className={
              stage ===
              'mains'
                ? 'filter active'
                : 'filter'
            }

            onClick={() =>
              setStage(
                'mains'
              )
            }

          >

            Mains

          </button>

        </div>

      </section>


      {/* ===================================================
          PROGRESS OVERVIEW
      =================================================== */}

      <section

        className="panel"

        style={{
          marginTop:
            '10px'
        }}

      >

        <div
          className="panel-head"
        >

          <div>

            <span
              className="eyebrow"
            >
              YOUR PROGRESS
            </span>


            <h3>
              {
                stage ===
                  'prelims'
                  ? 'Prelims Preparation'
                  : 'Mains Preparation'
              }
            </h3>

          </div>

        </div>


        <div

          className="metrics-grid"

          style={{
            marginTop:
              '12px'
          }}

        >

          {/* OVERALL */}

          <article
            className="metric-card"
          >

            <div>

              <span>
                Overall
              </span>


              <strong>
                {
                  overallProgress
                }%
              </strong>

            </div>

          </article>


          {/* STARTED */}

          <article
            className="metric-card"
          >

            <div>

              <span>
                Started
              </span>


              <strong>
                {
                  startedTopics
                }
              </strong>

            </div>

          </article>


          {/* COMPLETED */}

          <article
            className="metric-card"
          >

            <div>

              <span>
                Completed
              </span>


              <strong>
                {
                  completedTopics
                }
              </strong>

            </div>

          </article>


          {/* TOTAL */}

          <article
            className="metric-card"
          >

            <div>

              <span>
                Total Topics
              </span>


              <strong>
                {
                  stageLeafIds.length
                }
              </strong>

            </div>

          </article>

        </div>


        {/* PROGRESS BAR */}

        <div
          style={{

            height:
              '8px',

            marginTop:
              '12px',

            borderRadius:
              '999px',

            background:
              'rgba(255,255,255,.08)',

            overflow:
              'hidden'

          }}
        >

          <div
            style={{

              width:
                `${overallProgress}%`,

              height:
                '100%',

              background:
                'currentColor',

              transition:
                'width .25s ease'

            }}
          />

        </div>


        {/* NOT LOGGED IN */}

        {
          !signedIn &&
          !loading && (

            <div

              className="callout"

              style={{
                marginTop:
                  '12px'
              }}

            >

              Sign in to save your personal
              syllabus progress.

            </div>

          )
        }

      </section>


      {/* ===================================================
          FILTERS
      =================================================== */}

      <section

        className="panel"

        style={{
          marginTop:
            '10px'
        }}

      >

        <button

          type="button"

          className="secondary-btn"

          style={{

            width:
              '100%',

            justifyContent:
              'space-between'

          }}

          onClick={() =>

            setFiltersOpen(
              current =>
                !current
            )

          }

        >

          <span>
            Search & Filters
          </span>


          <span>
            {
              filtersOpen
                ? 'Hide'
                : 'Open'
            }
          </span>

        </button>


        {
          filtersOpen && (

            <div
              style={{

                display:
                  'grid',

                gridTemplateColumns:
                  'repeat(auto-fit, minmax(170px, 1fr))',

                gap:
                  '10px',

                marginTop:
                  '12px'

              }}
            >

              {/* SEARCH */}

              <label>

                Search

                <input

                  type="search"

                  value={
                    searchText
                  }

                  onChange={
                    event =>

                      setSearchText(
                        event.target.value
                      )
                  }

                  placeholder="History, Parliament, Economy..."

                />

              </label>


              {/* PAPER */}

              <label>

                Paper

                <select

                  value={
                    paperFilter
                  }

                  onChange={
                    event =>

                      setPaperFilter(
                        event.target.value
                      )
                  }

                >

                  <option
                    value="all"
                  >
                    All Papers
                  </option>


                  {
                    paperOptions.map(
                      paper => (

                        <option

                          key={
                            paper
                          }

                          value={
                            paper
                          }

                        >

                          {
                            paper
                          }

                        </option>

                      )
                    )
                  }

                </select>

              </label>


              {/* DISPLAY */}

              <label>

                Display

                <select

                  value={
                    hideCompleted
                      ? 'pending'
                      : 'all'
                  }

                  onChange={
                    event =>

                      setHideCompleted(
                        event.target.value ===
                        'pending'
                      )
                  }

                >

                  <option
                    value="all"
                  >
                    All Topics
                  </option>


                  <option
                    value="pending"
                  >
                    Hide Completed
                  </option>

                </select>

              </label>


              {/* CLEAR */}

              <button

                type="button"

                className="secondary-btn"

                style={{
                  alignSelf:
                    'end'
                }}

                onClick={() => {

                  setSearchText(
                    ''
                  );

                  setPaperFilter(
                    'all'
                  );

                  setHideCompleted(
                    false
                  );

                  setLinkedTopicId(
                    null
                  );

                }}

              >

                Clear Filters

              </button>

            </div>

          )
        }

      </section>


      {/* ===================================================
          MESSAGE
      =================================================== */}

      {
        message && (

          <div

            className="callout"

            style={{
              marginTop:
                '10px'
            }}

          >

            {
              message
            }

          </div>

        )
      }


      {/* ===================================================
          ERROR
      =================================================== */}

      {
        error && (

          <div

            className="callout"

            style={{
              marginTop:
                '10px'
            }}

          >

            <strong>
              {
                error
              }
            </strong>

          </div>

        )
      }


      {/* ===================================================
          LOADING
      =================================================== */}

      {
        loading && (

          <section

            className="panel"

            style={{
              marginTop:
                '10px'
            }}

          >

            Loading UPSC syllabus...

          </section>

        )
      }


      {/* ===================================================
          EMPTY FILTER RESULT
      =================================================== */}

      {
        !loading &&
        subjectNames.length ===
        0 && (

          <section

            className="panel"

            style={{
              marginTop:
                '10px'
            }}

          >

            <h3>
              No syllabus topics found
            </h3>


            <p>
              Change your search,
              paper or display filter.
            </p>

          </section>

        )
      }


      {/* ===================================================
          SUBJECT LIST
      =================================================== */}

      {
        !loading &&

        subjectNames.map(
          subject => {

            const expanded =
              expandedSubject ===
              subject;


            const subjectTopics =
              rootTopicsForSubject(
                subject
              );


            const subjectProgress =
              getSubjectProgress(
                subject
              );


            const subjectBooks =
              booksForSubject(
                subject
              );


            return (

              <section

                className="panel"

                key={
                  subject
                }

                style={{

                  marginTop:
                    '10px',

                  padding:
                    '14px'

                }}

              >

                {/* =======================================
                    SUBJECT HEADER
                ======================================= */}

                <button

                  type="button"

                  onClick={() =>

                    setExpandedSubject(
                      current =>

                        current ===
                        subject

                          ? null

                          : subject
                    )

                  }

                  style={{

                    width:
                      '100%',

                    padding:
                      0,

                    border:
                      0,

                    background:
                      'transparent',

                    color:
                      'inherit',

                    display:
                      'grid',

                    gridTemplateColumns:
                      '1fr auto',

                    alignItems:
                      'center',

                    gap:
                      '12px',

                    textAlign:
                      'left',

                    cursor:
                      'pointer',

                    whiteSpace:
                      'normal'

                  }}

                >

                  <div>

                    <strong
                      style={{
                        fontSize:
                          '1rem'
                      }}
                    >

                      {
                        expanded
                          ? '▾ '
                          : '▸ '
                      }

                      {
                        subject
                      }

                    </strong>


                    <small
                      style={{

                        display:
                          'block',

                        marginTop:
                          '4px',

                        color:
                          '#94a3b8'

                      }}
                    >

                      {
                        subjectTopics.length
                      }

                      {' major topics • '}

                      {
                        progressLabel(
                          subjectProgress
                        )
                      }

                    </small>

                  </div>


                  <strong>
                    {
                      subjectProgress
                    }%
                  </strong>

                </button>


                {/* =======================================
                    SUBJECT PROGRESS
                ======================================= */}

                <div
                  style={{

                    height:
                      '6px',

                    marginTop:
                      '10px',

                    borderRadius:
                      '999px',

                    background:
                      'rgba(255,255,255,.08)',

                    overflow:
                      'hidden'

                  }}
                >

                  <div
                    style={{

                      width:
                        `${subjectProgress}%`,

                      height:
                        '100%',

                      background:
                        'currentColor',

                      transition:
                        'width .2s ease'

                    }}
                  />

                </div>


                {/* =======================================
                    SUBJECT CONTENT
                ======================================= */}

                {
                  expanded && (

                    <div
                      style={{
                        marginTop:
                          '14px'
                      }}
                    >

                      {/* =================================
                          STANDARD BOOKS
                      ================================= */}

                      <div
                        className="callout"
                      >

                        <small
                          style={{

                            fontWeight:
                              800,

                            letterSpacing:
                              '.04em'

                          }}
                        >

                          STANDARD BOOKS

                        </small>


                        {
                          subjectBooks.length >
                          0
                            ? (

                              <div
                                style={{

                                  display:
                                    'grid',

                                  gap:
                                    '7px',

                                  marginTop:
                                    '8px'

                                }}
                              >

                                {
                                  subjectBooks.map(
                                    book => (

                                      <div
                                        key={
                                          book.id
                                        }
                                      >

                                        <strong>
                                          {
                                            book.title
                                          }
                                        </strong>


                                        {
                                          (
                                            book.author ||
                                            book.publisher
                                          ) && (

                                            <small
                                              style={{

                                                display:
                                                  'block',

                                                color:
                                                  '#94a3b8',

                                                marginTop:
                                                  '2px'

                                              }}
                                            >

                                              {
                                                book.author ||
                                                book.publisher
                                              }

                                            </small>

                                          )
                                        }

                                      </div>

                                    )
                                  )
                                }

                              </div>

                            )

                            : (

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

                                No standard book is
                                assigned to this
                                subject yet.

                              </small>

                            )
                        }

                      </div>


                      {/* =================================
                          SYLLABUS TOPICS
                      ================================= */}

                      <div
                        style={{
                          marginTop:
                            '10px'
                        }}
                      >

                        {
                          subjectTopics.map(
                            topic =>

                              renderTopic(
                                topic
                              )
                          )
                        }

                      </div>

                    </div>

                  )
                }

              </section>

            );

          }
        )
      }

    </>

  );

}

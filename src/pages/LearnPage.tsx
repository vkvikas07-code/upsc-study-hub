import {
  useEffect,
  useMemo,
  useRef,
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
  initialStage?: ExamStage | null;
  initialTopic?: string | null;
  initialPaper?: string | null;
};


/* =========================================================
   CONSTANTS
========================================================= */

const PROGRESS_OPTIONS = [
  0,
  25,
  50,
  75,
  100
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


/* =========================================================
   LEARN PAGE
========================================================= */

export function LearnPage({

  initialSubject =
    null,

  initialStage =
    null,

  initialTopic =
    null,

  initialPaper =
    null

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
     AUTH
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
     FILTER STATE
  ======================================================= */

  const [
    stage,
    setStage
  ] =
    useState<ExamStage>(
      initialStage ||
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


  const [
    linkedTopicId,
    setLinkedTopicId
  ] =
    useState<string | null>(
      null
    );


  /*
   * Prevent initial saved-topic target
   * from being repeatedly applied.
   */

  const initialTargetApplied =
    useRef(
      false
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
            'sort_order',
            {
              ascending:
                true
            }
          )

      ]);


    /* ===================================================
       SYLLABUS RESULT
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


    const loadedTopics:
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
      loadedTopics
    );


    /* ===================================================
       STANDARD BOOKS RESULT
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

      const loadedBooks:
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
        loadedBooks
      );
    }


    /* ===================================================
       AUTH
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
            completion
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
        'Unable to load progress:',
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
      progressData ||
      []
    )
      .forEach(
        item => {

          nextProgress[
            String(
              item.topic_id
            )
          ] =
            clampProgress(
              Number(
                item.completion ||
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
     INITIAL LOAD
  ======================================================= */

  useEffect(
    () => {

      void loadSyllabus();

    },
    []
  );


  /* =======================================================
     CURRENT STAGE TOPICS
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
     CHILDREN MAP
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


        map.forEach(
          children => {

            children.sort(
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
     SAVED TOPIC / INITIAL SUBJECT NAVIGATION
  ======================================================= */

  useEffect(
    () => {

      if (
        initialTargetApplied.current
      ) {
        return;
      }


      if (
        topics.length ===
        0
      ) {
        return;
      }


      const desiredStage =
        initialStage ||
        'prelims';


      /*
       * If target is Mains but page started
       * on Prelims, change stage first.
       */

      if (
        stage !==
        desiredStage
      ) {

        setStage(
          desiredStage
        );

        return;
      }


      /* =================================================
         EXACT TOPIC TARGET
      ================================================= */

      if (
        initialTopic
      ) {

        let matchedTopic =
          topics.find(
            item =>

              item.exam_stage ===
                desiredStage &&

              normalise(
                item.topic
              ) ===
                normalise(
                  initialTopic
                ) &&

              (
                !initialSubject ||

                normalise(
                  item.subject
                ) ===
                  normalise(
                    initialSubject
                  )
              ) &&

              (
                !initialPaper ||

                normalise(
                  item.paper
                ) ===
                  normalise(
                    initialPaper
                  )
              )
          );


        /*
         * Fallback:
         * If paper value differs slightly,
         * match by stage + subject + topic.
         */

        if (
          !matchedTopic
        ) {

          matchedTopic =
            topics.find(
              item =>

                item.exam_stage ===
                  desiredStage &&

                normalise(
                  item.topic
                ) ===
                  normalise(
                    initialTopic
                  ) &&

                (
                  !initialSubject ||

                  normalise(
                    item.subject
                  ) ===
                    normalise(
                      initialSubject
                    )
                )
            );
        }


        if (
          matchedTopic
        ) {

          setExpandedSubject(
            matchedTopic.subject
          );


          setLinkedTopicId(
            matchedTopic.id
          );


          setPaperFilter(
            'all'
          );


          setSearchText(
            ''
          );


          setFiltersOpen(
            true
          );


          /*
           * Expand every parent in the hierarchy.
           */

          const ancestorIds =
            new Set<string>();


          let currentTopic:
            SyllabusTopic |
            undefined =
            matchedTopic;


          while (
            currentTopic?.parent_id
          ) {

            const parentId =
              currentTopic.parent_id;


            ancestorIds.add(
              parentId
            );


            currentTopic =
              topics.find(
                item =>
                  item.id ===
                  parentId
              );
          }


          setExpandedTopics(
            ancestorIds
          );


          /*
           * Scroll to exact topic after UI renders.
           */

          window.setTimeout(
            () => {

              const element =
                document.getElementById(
                  `syllabus-topic-${matchedTopic?.id}`
                );


              element?.scrollIntoView(
                {
                  behavior:
                    'smooth',

                  block:
                    'center'
                }
              );

            },
            350
          );

        } else {

          setMessage(
            `Saved topic "${initialTopic}" was not found in the current syllabus.`
          );
        }


        initialTargetApplied.current =
          true;

        return;
      }


      /* =================================================
         SUBJECT-ONLY TARGET
      ================================================= */

      if (
        initialSubject
      ) {

        const matchedSubject =
          topics.find(
            item =>

              item.exam_stage ===
                desiredStage &&

              normalise(
                item.subject
              ) ===
                normalise(
                  initialSubject
                )
          );


        if (
          matchedSubject
        ) {

          setExpandedSubject(
            matchedSubject.subject
          );


          setSearchText(
            matchedSubject.subject
          );


          setFiltersOpen(
            true
          );
        }
      }


      initialTargetApplied.current =
        true;

    },
    [
      topics,
      stage,
      initialStage,
      initialSubject,
      initialTopic,
      initialPaper
    ]
  );


  /* =======================================================
     GET ALL LEAF IDS
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
     TOPIC PROGRESS
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
     SAVE PROGRESS
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


    const previous =
      progressMap[
        topicId
      ] ||
      0;


    /*
     * Optimistic update.
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
        'Unable to save syllabus progress:',
        saveError
      );


      setProgressMap(
        current => ({

          ...current,

          [topicId]:
            previous

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
     SEARCH MATCH
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


    const searchable =
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
      searchable.includes(
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
     PAPER MATCH
  ======================================================= */

  function topicMatchesPaper(
    topic: SyllabusTopic
  ): boolean {

    if (
      paperFilter ===
      'all'
    ) {
      return true;
    }


    if (
      topic.paper ===
      paperFilter
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
        topicMatchesPaper(
          child
        )
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

        const values =
          new Set<string>();


        stageTopics.forEach(
          topic => {

            if (
              topic.paper
            ) {

              values.add(
                topic.paper
              );
            }

          }
        );


        return Array
          .from(
            values
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
     VISIBLE ROOT TOPICS
  ======================================================= */

  const visibleRootTopics =
    rootTopics.filter(
      topic => {

        if (
          !topicMatchesPaper(
            topic
          )
        ) {
          return false;
        }


        if (
          !topicMatchesSearch(
            topic
          )
        ) {
          return false;
        }


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


  /* =======================================================
     SUBJECT NAMES
  ======================================================= */

  const subjectNames =
    Array
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


  /* =======================================================
     STAGE LEAF TOPICS
  ======================================================= */

  const stageLeafIds =
    stageTopics
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


  /* =======================================================
     OVERALL PROGRESS
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
     BOOKS FOR SUBJECT
  ======================================================= */

  function booksForSubject(
    subject: string
  ): StandardBook[] {

    return books.filter(
      book =>
        normalise(
          book.subject
        ) ===
        normalise(
          subject
        )
    );
  }


  /* =======================================================
     SUBJECT PROGRESS
  ======================================================= */

  function getSubjectProgress(
    subject: string
  ): number {

    const leafIds =
      stageTopics
        .filter(
          topic =>

            topic.subject ===
              subject &&

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


    return average(
      leafIds.map(
        id =>
          progressMap[
            id
          ] ||
          0
      )
    );
  }


  /* =======================================================
     MANUAL STAGE CHANGE
  ======================================================= */

  function changeStage(
    nextStage: ExamStage
  ): void {

    /*
     * User has manually changed the stage,
     * so do not re-apply initial navigation.
     */

    initialTargetApplied.current =
      true;


    setStage(
      nextStage
    );


    setPaperFilter(
      'all'
    );


    setSearchText(
      ''
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


    setMessage(
      ''
    );
  }


  /* =======================================================
     TOGGLE TOPIC
  ======================================================= */

  function toggleTopic(
    topicId: string
  ): void {

    setExpandedTopics(
      current => {

        const next =
          new Set(
            current
          );


        if (
          next.has(
            topicId
          )
        ) {

          next.delete(
            topicId
          );

        } else {

          next.add(
            topicId
          );
        }


        return next;
      }
    );
  }


  /* =======================================================
     RECURSIVE TOPIC RENDERER
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


    if (
      hideCompleted &&
      progress >=
      100
    ) {

      return null;
    }


    const visibleChildren =
      children.filter(
        child =>

          topicMatchesSearch(
            child
          ) &&

          topicMatchesPaper(
            child
          )
      );


    return (

      <div

        id={
          `syllabus-topic-${topic.id}`
        }

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
              '8px',

            flexWrap:
              'wrap'

          }}
        >

          {/* ===========================================
              TOPIC NAME
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

              flex:
                '1 1 220px',

              border:
                0,

              padding:
                0,

              background:
                'transparent',

              color:
                'inherit',

              textAlign:
                'left',

              whiteSpace:
                'normal',

              cursor:
                hasChildren
                  ? 'pointer'
                  : 'default'

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

                marginTop:
                  '3px',

                color:
                  '#94a3b8'

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
              }%

            </small>

          </button>


          {/* ===========================================
              ACTIONS
          =========================================== */}

          <div
            style={{

              display:
                'flex',

              gap:
                '7px',

              alignItems:
                'center',

              flexWrap:
                'wrap'

            }}
          >

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

                >

                  {
                    PROGRESS_OPTIONS.map(
                      option => (

                        <option

                          key={
                            option
                          }

                          value={
                            option
                          }

                        >
                          {
                            option
                          }%
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
            PROGRESS BAR
        ============================================= */}

        <div
          style={{

            height:
              '5px',

            marginTop:
              '8px',

            borderRadius:
              '999px',

            overflow:
              'hidden',

            background:
              'rgba(255,255,255,.08)'

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
            LINKED STUDY WORKSPACE
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
                  '8px'
              }}
            >

              {
                visibleChildren.map(
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

      {/* =================================================
          PAGE HEADER
      ================================================= */}

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
          Track syllabus progress and open
          linked resources, PYQs, practice
          questions, bookmarks and notes.
        </p>


        {/* ===============================================
            PRELIMS / MAINS
        =============================================== */}

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
              changeStage(
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
              changeStage(
                'mains'
              )
            }

          >
            Mains
          </button>

        </div>

      </section>


      {/* =================================================
          OVERVIEW
      ================================================= */}

      <section

        className="panel"

        style={{
          marginTop:
            '10px'
        }}

      >

        <div
          className="metrics-grid"
        >

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


        {/* ===============================================
            OVERALL PROGRESS BAR
        =============================================== */}

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


        {
          !signedIn &&
          !loading && (

            <div

              className="callout"

              style={{
                marginTop:
                  '10px'
              }}

            >

              Sign in to save your personal
              syllabus progress.

            </div>

          )
        }

      </section>


      {/* =================================================
          SEARCH & FILTERS
      ================================================= */}

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
              '100%'
          }}

          onClick={() =>
            setFiltersOpen(
              current =>
                !current
            )
          }

        >

          {
            filtersOpen
              ? 'Hide Search & Filters'
              : 'Search & Filters'
          }

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
                  '10px'

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

                  placeholder="Subject or topic..."

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

                  setMessage(
                    ''
                  );

                }}

              >
                Clear Filters
              </button>

            </div>

          )
        }

      </section>


      {/* =================================================
          STATUS MESSAGE
      ================================================= */}

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


      {/* =================================================
          ERROR
      ================================================= */}

      {
        error && (

          <div

            className="callout"

            style={{
              marginTop:
                '10px'
            }}

          >

            {
              error
            }

          </div>

        )
      }


      {/* =================================================
          LOADING
      ================================================= */}

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


      {/* =================================================
          EMPTY RESULT
      ================================================= */}

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
              exam stage or filters.
            </p>

          </section>

        )
      }


      {/* =================================================
          SUBJECT LIST
      ================================================= */}

      {
        !loading &&
        subjectNames.map(
          subject => {

            const expanded =
              expandedSubject ===
              subject;


            const subjectRoots =
              visibleRootTopics.filter(
                topic =>
                  topic.subject ===
                  subject
              );


            const subjectBooks =
              booksForSubject(
                subject
              );


            const subjectProgress =
              getSubjectProgress(
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

                    border:
                      0,

                    padding:
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

                    <strong>

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
                        subjectRoots.length
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
                    SUBJECT PROGRESS BAR
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
                    EXPANDED SUBJECT
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
                          subjectBooks.length ===
                          0
                            ? (

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

                                No standard book
                                linked to this
                                subject yet.

                              </small>

                            )

                            : (

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

                                                marginTop:
                                                  '2px',

                                                color:
                                                  '#94a3b8'

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
                        }

                      </div>


                      {/* =================================
                          TOPICS
                      ================================= */}

                      <div
                        style={{
                          marginTop:
                            '10px'
                        }}
                      >

                        {
                          subjectRoots.map(
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


/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default LearnPage;

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


const PROGRESS_OPTIONS = [
  0,
  25,
  50,
  75,
  100
];


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
     DATA
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
     UI
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


  const targetAppliedRef =
    useRef(
      false
    );


  /* =======================================================
     LOAD DATABASE
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
       TOPICS
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
       PROGRESS
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
        row => {

          nextProgress[
            String(
              row.topic_id
            )
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
     CHILD MAP
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


            const children =
              map.get(
                topic.parent_id
              ) ||
              [];


            children.push(
              topic
            );


            map.set(
              topic.parent_id,
              children
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
     APPLY SAVED TOPIC TARGET
  ======================================================= */

  useEffect(
    () => {

      if (
        targetAppliedRef.current
      ) {
        return;
      }


      if (
        topics.length ===
        0
      ) {
        return;
      }


      const targetStage =
        initialStage ||
        'prelims';


      if (
        stage !==
        targetStage
      ) {

        setStage(
          targetStage
        );

        return;
      }


      if (
        initialTopic
      ) {

        const matched =
          topics.find(
            item =>

              item.exam_stage ===
                targetStage &&

              (
                !initialSubject ||

                normalise(
                  item.subject
                ) ===
                normalise(
                  initialSubject
                )
              ) &&

              normalise(
                item.topic
              ) ===
                normalise(
                  initialTopic
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


        if (
          matched
        ) {

          setExpandedSubject(
            matched.subject
          );


          if (
            matched.paper
          ) {

            setPaperFilter(
              matched.paper
            );

          } else {

            setPaperFilter(
              'all'
            );

          }


          const ancestors =
            new Set<string>();


          let current:
            SyllabusTopic |
            undefined =
            matched;


          while (
            current?.parent_id
          ) {

            ancestors.add(
              current.parent_id
            );


            const parentId =
              current.parent_id;


            current =
              topics.find(
                item =>
                  item.id ===
                  parentId
              );
          }


          setExpandedTopics(
            ancestors
          );


          setLinkedTopicId(
            matched.id
          );


          setSearchText(
            matched.topic
          );


          setFiltersOpen(
            true
          );


          window.setTimeout(
            () => {

              const element =
                document.getElementById(
                  `syllabus-topic-${matched.id}`
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
            300
          );

        }

      } else if (
        initialSubject
      ) {

        const matchedSubject =
          topics.find(
            item =>

              item.exam_stage ===
                targetStage &&

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


      targetAppliedRef.current =
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
     LEAF IDS
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
     SAVE PROGRESS
  ======================================================= */

  async function saveProgress(
    topicId: string,
    newValue: number
  ): Promise<void> {

    if (
      !supabase ||
      !userId
    ) {

      setMessage(
        'Sign in to save progress.'
      );

      return;
    }


    const value =
      clampProgress(
        newValue
      );


    const previous =
      progressMap[
        topicId
      ] ||
      0;


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
        saveError.message
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
     SEARCH
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


    const text =
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
      text.includes(
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
      () =>

        Array
          .from(
            new Set(
              stageTopics
                .map(
                  topic =>
                    topic.paper
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
          .sort(),

      [
        stageTopics
      ]
    );


  /* =======================================================
     VISIBLE ROOTS
  ======================================================= */

  const visibleRoots =
    rootTopics.filter(
      topic => {

        if (
          paperFilter !==
            'all' &&
          topic.paper !==
            paperFilter
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
     SUBJECTS
  ======================================================= */

  const subjectNames =
    Array
      .from(
        new Set(
          visibleRoots.map(
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
     OVERALL PROGRESS
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


  const completedCount =
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


  /* =======================================================
     BOOKS
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
     CHANGE STAGE MANUALLY
  ======================================================= */

  function changeStage(
    nextStage: ExamStage
  ): void {

    targetAppliedRef.current =
      true;


    setStage(
      nextStage
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


    setPaperFilter(
      'all'
    );


    setSearchText(
      ''
    );
  }


  /* =======================================================
     TOGGLE TOPIC
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
     RENDER TOPIC
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
            '12px'

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
              '8px',

            flexWrap:
              'wrap'

          }}
        >

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

              textAlign:
                'left',

              border:
                0,

              padding:
                0,

              background:
                'transparent',

              color:
                'inherit',

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
              }

              %

            </small>

          </button>


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


        <div
          style={{

            height:
              '5px',

            marginTop:
              '8px',

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

              height:
                '100%',

              width:
                `${progress}%`,

              background:
                'currentColor'

            }}
          />

        </div>


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
                children
                  .filter(
                    child =>
                      topicMatchesSearch(
                        child
                      )
                  )
                  .map(
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
     PAGE
  ======================================================= */

  return (

    <>

      {/* =================================================
          HEADER
      ================================================= */}

      <section
        className="panel"
      >

        <span
          className="eyebrow"
        >
          UPSC SYLLABUS
        </span>


        <h2>
          Syllabus Tracker
        </h2>


        <p>
          Track preparation, open study
          resources and practice each topic.
        </p>


        <div
          style={{

            display:
              'grid',

            gridTemplateColumns:
              'repeat(2, minmax(0, 1fr))',

            gap:
              '8px',

            marginTop:
              '12px'

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
                Completed
              </span>

              <strong>
                {
                  completedCount
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
              Sign in to save progress.
            </div>

          )
        }

      </section>


      {/* =================================================
          SEARCH AND FILTERS
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

          onClick={() =>
            setFiltersOpen(
              current =>
                !current
            )
          }

        >
          {
            filtersOpen
              ? 'Hide Filters'
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
                  '8px',

                marginTop:
                  '10px'

              }}
            >

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

                }}

              >
                Clear
              </button>

            </div>

          )
        }

      </section>


      {/* =================================================
          STATUS
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


      {
        loading && (

          <section

            className="panel"

            style={{
              marginTop:
                '10px'
            }}

          >
            Loading syllabus...
          </section>

        )
      }


      {/* =================================================
          EMPTY
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
              Change your search or filters.
            </p>

          </section>

        )
      }


      {/* =================================================
          SUBJECTS
      ================================================= */}

      {
        !loading &&

        subjectNames.map(
          subject => {

            const expanded =
              expandedSubject ===
              subject;


            const subjectRoots =
              visibleRoots.filter(
                topic =>
                  topic.subject ===
                  subject
              );


            const subjectBooks =
              booksForSubject(
                subject
              );


            const subjectProgress =
              average(
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
                      progressMap[
                        topic.id
                      ] ||
                      0
                  )
              );


            return (

              <section

                className="panel"

                key={
                  subject
                }

                style={{
                  marginTop:
                    '10px'
                }}

              >

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

                    background:
                      'transparent',

                    color:
                      'inherit',

                    display:
                      'flex',

                    justifyContent:
                      'space-between',

                    alignItems:
                      'center',

                    gap:
                      '10px',

                    textAlign:
                      'left',

                    cursor:
                      'pointer'

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

                  </div>


                  <strong>
                    {
                      subjectProgress
                    }%
                  </strong>

                </button>


                {
                  expanded && (

                    <div
                      style={{
                        marginTop:
                          '12px'
                      }}
                    >

                      {
                        subjectBooks.length >
                          0 && (

                          <div
                            className="callout"
                          >

                            <strong>
                              Standard Books
                            </strong>


                            <div
                              style={{
                                marginTop:
                                  '6px'
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

                                      {
                                        book.title
                                      }

                                      {
                                        book.author
                                          ? ` — ${book.author}`
                                          : ''
                                      }

                                    </div>

                                  )
                                )
                              }

                            </div>

                          </div>

                        )
                      }


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

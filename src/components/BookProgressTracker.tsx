import {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


type BookRow = {
  id: string;
  title: string;
  subject: string;

  description:
    string |
    null;

  author:
    string |
    null;

  publisher:
    string |
    null;

  source_name:
    string |
    null;

  sort_order: number;
};


type TopicRow = {
  id: string;
  book_id: string;
  subject: string;
  topic_name: string;

  parent_id:
    string |
    null;

  sort_order: number;

  is_active: boolean;
};


type ProgressRow = {
  book_topic_id: string;
  completed: boolean;
};


type BookProgressTrackerProps = {
  initialSubject?:
    string |
    null;
};


const BOOK_SELECT = `
  id,
  title,
  subject,
  description,
  author,
  publisher,
  source_name,
  sort_order
`;


const TOPIC_SELECT = `
  id,
  book_id,
  subject,
  topic_name,
  parent_id,
  sort_order,
  is_active
`;


/*
 * SAFE NUMBER
 */

function safeNumber(
  value: unknown,
  fallback = 0
) {

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


/*
 * NORMALISE TEXT
 *
 * Helps match:
 * Polity
 * with
 * Polity & Governance
 */

function normalise(
  value:
    string
) {

  return value
    .trim()
    .toLowerCase();
}


/*
 * BOOK PROGRESS TRACKER
 */

export function BookProgressTracker({
  initialSubject = null
}: BookProgressTrackerProps) {

  /*
   * DATA
   */

  const [
    books,
    setBooks
  ] =
    useState<
      BookRow[]
    >([]);


  const [
    topics,
    setTopics
  ] =
    useState<
      TopicRow[]
    >([]);


  /*
   * COMPLETED LEAF ITEMS
   */

  const [
    completedIds,
    setCompletedIds
  ] =
    useState<
      Set<string>
    >(
      new Set()
    );


  /*
   * CURRENTLY SAVING ITEMS
   */

  const [
    savingIds,
    setSavingIds
  ] =
    useState<
      Set<string>
    >(
      new Set()
    );


  /*
   * BOOK EXPANSION
   */

  const [
    expandedBooks,
    setExpandedBooks
  ] =
    useState<
      Record<
        string,
        boolean
      >
    >({});


  /*
   * FILTERS
   */

  const [
    subjectFilter,
    setSubjectFilter
  ] =
    useState(
      'all'
    );


  const [
    search,
    setSearch
  ] =
    useState('');


  /*
   * PAGE STATE
   */

  const [
    loading,
    setLoading
  ] =
    useState(
      true
    );


  const [
    signedIn,
    setSignedIn
  ] =
    useState(
      false
    );


  const [
    message,
    setMessage
  ] =
    useState('');


  /*
   * LOAD EVERYTHING
   */

  async function loadTracker() {

    const client =
      supabase;


    if (!client) {

      setMessage(
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


    setMessage('');


    /*
     * LOAD PUBLISHED BOOKS
     * AND ACTIVE TOPICS
     */

    const [
      booksResult,
      topicsResult
    ] =
      await Promise.all([

        client
          .from(
            'study_resources'
          )
          .select(
            BOOK_SELECT
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
          .order(
            'title',
            {
              ascending:
                true
            }
          ),

        client
          .from(
            'book_topics'
          )
          .select(
            TOPIC_SELECT
          )
          .eq(
            'is_active',
            true
          )
          .order(
            'sort_order',
            {
              ascending:
                true
            }
          )
          .order(
            'topic_name',
            {
              ascending:
                true
            }
          )

      ]);


    if (
      booksResult.error
    ) {

      console.error(
        'Unable to load books:',
        booksResult.error
      );


      setMessage(
        booksResult.error.message
      );


      setLoading(
        false
      );


      return;
    }


    if (
      topicsResult.error
    ) {

      console.error(
        'Unable to load book topics:',
        topicsResult.error
      );


      setMessage(
        topicsResult.error.message
      );


      setLoading(
        false
      );


      return;
    }


    /*
     * CLEAN BOOK DATA
     */

    const cleanBooks:
      BookRow[] =
        (
          booksResult.data ||
          []
        ).map(
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

            description:
              item.description
                ? String(
                    item.description
                  )
                : null,

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

            sort_order:
              safeNumber(
                item.sort_order
              )
          })
        );


    /*
     * CLEAN TOPIC DATA
     */

    const cleanTopics:
      TopicRow[] =
        (
          topicsResult.data ||
          []
        ).map(
          item => ({

            id:
              String(
                item.id
              ),

            book_id:
              String(
                item.book_id
              ),

            subject:
              String(
                item.subject ||
                ''
              ),

            topic_name:
              String(
                item.topic_name ||
                ''
              ),

            parent_id:
              item.parent_id
                ? String(
                    item.parent_id
                  )
                : null,

            sort_order:
              safeNumber(
                item.sort_order
              ),

            is_active:
              item.is_active !==
              false
          })
        );


    setBooks(
      cleanBooks
    );


    setTopics(
      cleanTopics
    );


    /*
     * CURRENT USER
     */

    const {
      data: {
        user
      }
    } =
      await client
        .auth
        .getUser();


    if (!user) {

      setSignedIn(
        false
      );


      setCompletedIds(
        new Set()
      );


      setLoading(
        false
      );


      return;
    }


    setSignedIn(
      true
    );


    /*
     * LOAD USER'S OWN
     * COMPLETION RECORDS
     */

    const {
      data:
        progressData,

      error:
        progressError
    } =
      await client
        .from(
          'book_topic_progress'
        )
        .select(
          `
          book_topic_id,
          completed
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
        'Unable to load book progress:',
        progressError
      );


      setMessage(
        progressError.message
      );


      setCompletedIds(
        new Set()
      );


      setLoading(
        false
      );


      return;
    }


    const completed =
      new Set<string>();


    (
      progressData ||
      []
    ).forEach(
      item => {

        const row =
          item as
            ProgressRow;


        if (
          row.completed
        ) {

          completed.add(
            String(
              row.book_topic_id
            )
          );
        }
      }
    );


    setCompletedIds(
      completed
    );


    setLoading(
      false
    );
  }


  /*
   * INITIAL LOAD
   */

  useEffect(
    () => {

      void loadTracker();

    },
    []
  );


  /*
   * SUBJECT LIST
   */

  const subjects =
    useMemo(
      () => {

        return Array
          .from(
            new Set(
              books
                .map(
                  book =>
                    book.subject
                      .trim()
                )
                .filter(
                  Boolean
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
        books
      ]
    );


  /*
   * MATCH INITIAL SUBJECT
   *
   * Example:
   * "Polity"
   * can match
   * "Polity & Governance"
   */

  useEffect(
    () => {

      if (
        !initialSubject ||
        subjects.length ===
          0
      ) {

        return;
      }


      const requested =
        normalise(
          initialSubject
        );


      const exact =
        subjects.find(
          subject =>
            normalise(
              subject
            ) ===
            requested
        );


      if (
        exact
      ) {

        setSubjectFilter(
          exact
        );


        return;
      }


      const partial =
        subjects.find(
          subject => {

            const candidate =
              normalise(
                subject
              );


            return (
              candidate.includes(
                requested
              ) ||
              requested.includes(
                candidate
              )
            );
          }
        );


      if (
        partial
      ) {

        setSubjectFilter(
          partial
        );
      }

    },
    [
      initialSubject,
      subjects
    ]
  );


  /*
   * CHILDREN MAP
   */

  const childrenMap =
    useMemo(
      () => {

        const map =
          new Map<
            string,
            TopicRow[]
          >();


        topics.forEach(
          topic => {

            if (
              !topic.parent_id
            ) {

              return;
            }


            const existing =
              map.get(
                topic.parent_id
              ) ||
              [];


            existing.push(
              topic
            );


            map.set(
              topic.parent_id,
              existing
            );
          }
        );


        map.forEach(
          children => {

            children.sort(
              (
                first,
                second
              ) => {

                if (
                  first.sort_order !==
                  second.sort_order
                ) {

                  return (
                    first.sort_order -
                    second.sort_order
                  );
                }


                return first
                  .topic_name
                  .localeCompare(
                    second.topic_name
                  );
              }
            );
          }
        );


        return map;

      },
      [
        topics
      ]
    );


  /*
   * ROOT TOPICS BY BOOK
   */

  const rootTopicsByBook =
    useMemo(
      () => {

        const map =
          new Map<
            string,
            TopicRow[]
          >();


        topics
          .filter(
            topic =>
              !topic.parent_id
          )
          .forEach(
            topic => {

              const existing =
                map.get(
                  topic.book_id
                ) ||
                [];


              existing.push(
                topic
              );


              map.set(
                topic.book_id,
                existing
              );
            }
          );


        map.forEach(
          rootTopics => {

            rootTopics.sort(
              (
                first,
                second
              ) => {

                if (
                  first.sort_order !==
                  second.sort_order
                ) {

                  return (
                    first.sort_order -
                    second.sort_order
                  );
                }


                return first
                  .topic_name
                  .localeCompare(
                    second.topic_name
                  );
              }
            );
          }
        );


        return map;

      },
      [
        topics
      ]
    );


  /*
   * GET ALL LEAF ITEMS
   * UNDER ANY TOPIC.
   *
   * If a topic has no
   * subtopics, the topic
   * itself is the leaf.
   */

  function getLeafIds(
    topicId:
      string,
    visited =
      new Set<string>()
  ):
    string[] {

    if (
      visited.has(
        topicId
      )
    ) {

      return [];
    }


    const nextVisited =
      new Set(
        visited
      );


    nextVisited.add(
      topicId
    );


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


    return children
      .flatMap(
        child =>
          getLeafIds(
            child.id,
            nextVisited
          )
      );
  }


  /*
   * ALL LEAF IDS
   * FOR ONE BOOK
   */

  function getBookLeafIds(
    bookId:
      string
  ) {

    const roots =
      rootTopicsByBook.get(
        bookId
      ) ||
      [];


    return roots
      .flatMap(
        topic =>
          getLeafIds(
            topic.id
          )
      );
  }


  /*
   * PROGRESS %
   */

  function getProgressPercent(
    ids:
      string[]
  ) {

    if (
      ids.length ===
      0
    ) {

      return 0;
    }


    const completed =
      ids.filter(
        id =>
          completedIds.has(
            id
          )
      ).length;


    return Math.round(
      (
        completed /
        ids.length
      ) *
      100
    );
  }


  /*
   * COMPLETED COUNT
   */

  function getCompletedCount(
    ids:
      string[]
  ) {

    return ids.filter(
      id =>
        completedIds.has(
          id
        )
    ).length;
  }


  /*
   * ALL ACTIVE LEAF UNITS
   */

  const allLeafIds =
    useMemo(
      () => {

        return topics
          .filter(
            topic => {

              const children =
                childrenMap.get(
                  topic.id
                ) ||
                [];


              return (
                children.length ===
                0
              );
            }
          )
          .map(
            topic =>
              topic.id
          );

      },
      [
        topics,
        childrenMap
      ]
    );


  /*
   * OVERALL PROGRESS
   */

  const overallProgress =
    getProgressPercent(
      allLeafIds
    );


  const overallCompleted =
    getCompletedCount(
      allLeafIds
    );


  /*
   * VISIBLE BOOKS
   */

  const visibleBooks =
    useMemo(
      () => {

        const query =
          normalise(
            search
          );


        return books.filter(
          book => {

            if (
              subjectFilter !==
                'all' &&
              book.subject !==
                subjectFilter
            ) {

              return false;
            }


            if (!query) {

              return true;
            }


            const bookText =
              [
                book.title,
                book.subject,
                book.description ||
                  '',
                book.author ||
                  '',
                book.publisher ||
                  '',
                book.source_name ||
                  ''
              ]
                .join(
                  ' '
                )
                .toLowerCase();


            if (
              bookText.includes(
                query
              )
            ) {

              return true;
            }


            return topics.some(
              topic =>
                topic.book_id ===
                  book.id &&
                normalise(
                  topic.topic_name
                ).includes(
                  query
                )
            );
          }
        );

      },
      [
        books,
        topics,
        search,
        subjectFilter
      ]
    );


  /*
   * SUBJECT GROUPS
   */

  const subjectGroups =
    useMemo(
      () => {

        return subjects
          .map(
            subject => ({

              subject,

              books:
                visibleBooks.filter(
                  book =>
                    book.subject ===
                    subject
                )

            })
          )
          .filter(
            group =>
              group.books.length >
              0
          );

      },
      [
        subjects,
        visibleBooks
      ]
    );


  /*
   * SUBJECT PROGRESS IDS
   */

  function getSubjectLeafIds(
    subject:
      string
  ) {

    return books
      .filter(
        book =>
          book.subject ===
          subject
      )
      .flatMap(
        book =>
          getBookLeafIds(
            book.id
          )
      );
  }


  /*
   * EXPAND / COLLAPSE BOOK
   */

  function toggleBook(
    bookId:
      string
  ) {

    setExpandedBooks(
      current => ({
        ...current,

        [
          bookId
        ]:
          !current[
            bookId
          ]
      })
    );
  }


  /*
   * CHECK WHETHER ANY
   * LEAF IS SAVING
   */

  function isSaving(
    ids:
      string[]
  ) {

    return ids.some(
      id =>
        savingIds.has(
          id
        )
    );
  }


  /*
   * SAVE COMPLETION
   *
   * Works for:
   * - one topic
   * - one subtopic
   * - all children of a topic
   */

  async function saveCompletion(
    ids:
      string[],
    completed:
      boolean
  ) {

    const client =
      supabase;


    if (!client) {

      setMessage(
        'Supabase is not configured.'
      );


      return;
    }


    if (
      ids.length ===
      0
    ) {

      return;
    }


    const {
      data: {
        user
      }
    } =
      await client
        .auth
        .getUser();


    if (!user) {

      setSignedIn(
        false
      );


      setMessage(
        'Sign in from the Me section to save book progress.'
      );


      return;
    }


    /*
     * SHOW SAVING STATE
     */

    setSavingIds(
      current => {

        const next =
          new Set(
            current
          );


        ids.forEach(
          id =>
            next.add(
              id
            )
        );


        return next;
      }
    );


    /*
     * SAVE ALL LEAF ITEMS
     */

    const payload =
      ids.map(
        id => ({

          user_id:
            user.id,

          book_topic_id:
            id,

          completed

        })
      );


    const {
      error
    } =
      await client
        .from(
          'book_topic_progress'
        )
        .upsert(
          payload,
          {
            onConflict:
              'user_id,book_topic_id'
          }
        );


    if (
      error
    ) {

      console.error(
        'Unable to save book progress:',
        error
      );


      setMessage(
        error.message
      );


      setSavingIds(
        current => {

          const next =
            new Set(
              current
            );


          ids.forEach(
            id =>
              next.delete(
                id
              )
          );


          return next;
        }
      );


      return;
    }


    /*
     * UPDATE SCREEN
     */

    setCompletedIds(
      current => {

        const next =
          new Set(
            current
          );


        ids.forEach(
          id => {

            if (
              completed
            ) {

              next.add(
                id
              );

            } else {

              next.delete(
                id
              );
            }
          }
        );


        return next;
      }
    );


    setSavingIds(
      current => {

        const next =
          new Set(
            current
          );


        ids.forEach(
          id =>
            next.delete(
              id
            )
        );


        return next;
      }
    );


    setMessage(
      completed
        ? 'Progress saved.'
        : 'Completion removed.'
    );
  }


  /*
   * TOGGLE TOPIC
   *
   * Main topic with children:
   * changes all its leaf subtopics.
   *
   * Topic without children:
   * changes itself.
   */

  async function toggleTopic(
    topic:
      TopicRow
  ) {

    const leafIds =
      getLeafIds(
        topic.id
      );


    if (
      leafIds.length ===
      0
    ) {

      return;
    }


    const allCompleted =
      leafIds.every(
        id =>
          completedIds.has(
            id
          )
      );


    await saveCompletion(
      leafIds,
      !allCompleted
    );
  }


  /*
   * RESET FILTER
   */

  function clearFilters() {

    setSearch('');


    if (
      initialSubject
    ) {

      const requested =
        normalise(
          initialSubject
        );


      const match =
        subjects.find(
          subject => {

            const candidate =
              normalise(
                subject
              );


            return (
              candidate ===
                requested ||
              candidate.includes(
                requested
              ) ||
              requested.includes(
                candidate
              )
            );
          }
        );


      setSubjectFilter(
        match ||
        'all'
      );

    } else {

      setSubjectFilter(
        'all'
      );
    }
  }


  /*
   * RENDER ONE TOPIC
   *
   * Recursive design means
   * future deeper subtopics
   * can also work.
   */

  function renderTopic(
    topic:
      TopicRow,
    depth =
      0
  ) {

    const children =
      childrenMap.get(
        topic.id
      ) ||
      [];


    const leafIds =
      getLeafIds(
        topic.id
      );


    const percent =
      getProgressPercent(
        leafIds
      );


    const completedCount =
      getCompletedCount(
        leafIds
      );


    const fullyCompleted =
      leafIds.length >
        0 &&
      completedCount ===
        leafIds.length;


    const currentlySaving =
      isSaving(
        leafIds
      );


    return (

      <div
        key={
          topic.id
        }

        style={{
          marginLeft:
            depth >
              0
              ? '18px'
              : '0',

          marginTop:
            depth >
              0
              ? '8px'
              : '12px',

          padding:
            depth >
              0
              ? '10px 12px'
              : '12px 14px',

          border:
            '1px solid rgba(255,255,255,.08)',

          borderRadius:
            '12px',

          background:
            depth >
              0
              ? '#0e1525'
              : 'rgba(255,255,255,.025)'
        }}
      >

        {/* TOPIC HEADER */}

        <div
          style={{
            display:
              'flex',

            justifyContent:
              'space-between',

            alignItems:
              'center',

            gap:
              '12px',

            flexWrap:
              'wrap'
          }}
        >

          <label
            style={{
              display:
                'flex',

              alignItems:
                'center',

              gap:
                '10px',

              flex:
                '1 1 240px',

              cursor:
                signedIn
                  ? 'pointer'
                  : 'default'
            }}
          >

            <input
              type="checkbox"

              checked={
                fullyCompleted
              }

              disabled={
                !signedIn ||
                currentlySaving
              }

              onChange={() =>
                void toggleTopic(
                  topic
                )
              }

              style={{
                width:
                  '18px',

                height:
                  '18px',

                accentColor:
                  '#14b8a6'
              }}
            />


            <span>

              <strong>
                {
                  topic
                    .topic_name
                }
              </strong>


              {children.length >
                0 && (

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

                  {completedCount}
                  /
                  {leafIds.length}
                  {' '}
                  portions completed

                </small>

              )}

            </span>

          </label>


          <div
            style={{
              minWidth:
                '54px',

              textAlign:
                'right'
            }}
          >

            <strong>
              {percent}%
            </strong>

          </div>

        </div>


        {/* TOPIC PROGRESS */}

        <div
          className="progress-track"

          style={{
            marginTop:
              '10px'
          }}
        >

          <span
            style={{
              width:
                `${percent}%`
            }}
          />

        </div>


        {/* CHILD TOPICS */}

        {children.length >
          0 && (

          <div
            style={{
              marginTop:
                '8px',

              borderLeft:
                '2px solid rgba(20,184,166,.22)'
            }}
          >

            {children.map(
              child =>
                renderTopic(
                  child,
                  depth +
                    1
                )
            )}

          </div>

        )}

      </div>

    );
  }


  /*
   * PAGE
   */

  return (

    <div
      className="study-resources-page"
    >

      {/* =====================================
          HEADER
      ===================================== */}

      <section
        className="panel"
      >

        <span
          className="eyebrow"
        >
          BOOK PROGRESS
        </span>


        <h2>
          My Book Progress Tracker
        </h2>


        <p>
          Mark each topic or subtopic after
          you finish reading it. Progress is
          calculated automatically from the
          smallest readable portions.
        </p>


        {/* OVERALL METRICS */}

        <div
          className="metrics-grid"

          style={{
            marginTop:
              '16px'
          }}
        >

          <article
            className="metric-card"
          >

            <div>

              <span>
                Overall Progress
              </span>


              <strong>

                {
                  loading
                    ? '...'
                    : signedIn
                    ? `${overallProgress}%`
                    : '—'
                }

              </strong>

            </div>

          </article>


          <article
            className="metric-card"
          >

            <div>

              <span>
                Subjects
              </span>


              <strong>

                {
                  loading
                    ? '...'
                    : subjects.length
                }

              </strong>

            </div>

          </article>


          <article
            className="metric-card"
          >

            <div>

              <span>
                Books
              </span>


              <strong>

                {
                  loading
                    ? '...'
                    : books.length
                }

              </strong>

            </div>

          </article>


          <article
            className="metric-card"
          >

            <div>

              <span>
                Portions Completed
              </span>


              <strong>

                {
                  loading
                    ? '...'
                    : signedIn
                    ? `${overallCompleted}/${allLeafIds.length}`
                    : '—'
                }

              </strong>

            </div>

          </article>

        </div>


        {/* OVERALL BAR */}

        {signedIn &&
          allLeafIds.length >
            0 && (

          <div
            style={{
              marginTop:
                '16px'
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

                marginBottom:
                  '7px'
              }}
            >

              <strong>
                Total Reading Progress
              </strong>


              <strong>
                {overallProgress}%
              </strong>

            </div>


            <div
              className="progress-track"
            >

              <span
                style={{
                  width:
                    `${overallProgress}%`
                }}
              />

            </div>

          </div>

        )}


        {!signedIn &&
          !loading && (

          <div
            className="callout"

            style={{
              marginTop:
                '16px'
            }}
          >

            <strong>
              Sign in to track completion
            </strong>


            <p>
              You can view the books and topics,
              but you need to sign in from the
              Me section before ticking completed
              portions.
            </p>

          </div>

        )}


        {message && (

          <div
            className="callout"

            style={{
              marginTop:
                '14px'
            }}
          >
            {message}
          </div>

        )}


        <button
          type="button"
          className="secondary-btn"

          onClick={() =>
            void loadTracker()
          }

          style={{
            marginTop:
              '14px'
          }}
        >
          Refresh Progress
        </button>

      </section>


      {/* =====================================
          FILTERS
      ===================================== */}

      <section
        className="panel"

        style={{
          marginTop:
            '18px'
        }}
      >

        <div
          className="panel-head"
        >

          <div>

            <span
              className="eyebrow"
            >
              FIND YOUR BOOK
            </span>


            <h3>
              Subject and Book Filter
            </h3>

          </div>


          <button
            type="button"
            className="text-btn"

            onClick={
              clearFilters
            }
          >
            Clear
          </button>

        </div>


        <div
          className="study-resource-filter-grid"
        >

          {/* SUBJECT */}

          <label>

            <span>
              Subject
            </span>


            <select
              value={
                subjectFilter
              }

              onChange={
                event =>
                  setSubjectFilter(
                    event
                      .target
                      .value
                  )
              }
            >

              <option value="all">
                All Subjects
              </option>


              {subjects.map(
                subject => (

                  <option
                    key={
                      subject
                    }

                    value={
                      subject
                    }
                  >
                    {subject}
                  </option>

                )
              )}

            </select>

          </label>


          {/* SEARCH */}

          <label>

            <span>
              Search
            </span>


            <input
              type="text"

              value={
                search
              }

              onChange={
                event =>
                  setSearch(
                    event
                      .target
                      .value
                  )
              }

              placeholder="Book, topic, subtopic..."
            />

          </label>

        </div>

      </section>


      {/* =====================================
          LOADING
      ===================================== */}

      {loading && (

        <section
          className="panel"

          style={{
            marginTop:
              '18px'
          }}
        >
          Loading book progress...
        </section>

      )}


      {/* =====================================
          EMPTY
      ===================================== */}

      {!loading &&
        books.length ===
          0 && (

        <section
          className="panel"

          style={{
            marginTop:
              '18px'
          }}
        >

          <h3>
            No published books yet
          </h3>


          <p>
            Add Standard Book resources from
            Admin Studio, publish them, and then
            create their topics in Book Structure.
          </p>

        </section>

      )}


      {!loading &&
        books.length >
          0 &&
        subjectGroups.length ===
          0 && (

        <section
          className="panel"

          style={{
            marginTop:
              '18px'
          }}
        >

          <h3>
            No matching books
          </h3>


          <p>
            Try another subject or search term.
          </p>

        </section>

      )}


      {/* =====================================
          SUBJECT GROUPS
      ===================================== */}

      {!loading &&
        subjectGroups.map(
          group => {

            const subjectLeafIds =
              getSubjectLeafIds(
                group.subject
              );


            const subjectPercent =
              getProgressPercent(
                subjectLeafIds
              );


            const subjectCompleted =
              getCompletedCount(
                subjectLeafIds
              );


            return (

              <section
                className="panel"

                key={
                  group.subject
                }

                style={{
                  marginTop:
                    '18px'
                }}
              >

                {/* SUBJECT HEADER */}

                <div
                  className="panel-head"
                >

                  <div>

                    <span
                      className="eyebrow"
                    >
                      SUBJECT
                    </span>


                    <h2>
                      {group.subject}
                    </h2>


                    <small
                      style={{
                        color:
                          '#94a3b8'
                      }}
                    >

                      {group.books.length}
                      {' '}
                      book{
                        group.books.length ===
                          1
                          ? ''
                          : 's'
                      }

                      {' • '}

                      {subjectCompleted}
                      /
                      {subjectLeafIds.length}
                      {' '}
                      portions completed

                    </small>

                  </div>


                  <strong
                    style={{
                      fontSize:
                        '1.35rem'
                    }}
                  >
                    {
                      signedIn
                        ? `${subjectPercent}%`
                        : '—'
                    }
                  </strong>

                </div>


                {/* SUBJECT BAR */}

                <div
                  className="progress-track"

                  style={{
                    marginTop:
                      '12px'
                  }}
                >

                  <span
                    style={{
                      width:
                        signedIn
                          ? `${subjectPercent}%`
                          : '0%'
                    }}
                  />

                </div>


                {/* BOOKS */}

                <div
                  style={{
                    display:
                      'grid',

                    gap:
                      '14px',

                    marginTop:
                      '18px'
                  }}
                >

                  {group.books.map(
                    book => {

                      const bookLeafIds =
                        getBookLeafIds(
                          book.id
                        );


                      const bookPercent =
                        getProgressPercent(
                          bookLeafIds
                        );


                      const bookCompleted =
                        getCompletedCount(
                          bookLeafIds
                        );


                      const rootTopics =
                        rootTopicsByBook.get(
                          book.id
                        ) ||
                        [];


                      const expanded =
                        expandedBooks[
                          book.id
                        ] ===
                        true;


                      const source =
                        book.author ||
                        book.publisher ||
                        book.source_name ||
                        '';


                      return (

                        <article
                          key={
                            book.id
                          }

                          style={{
                            border:
                              '1px solid rgba(255,255,255,.08)',

                            borderRadius:
                              '16px',

                            padding:
                              '15px',

                            background:
                              'rgba(255,255,255,.025)'
                          }}
                        >

                          {/* BOOK HEADER */}

                          <div
                            style={{
                              display:
                                'flex',

                              justifyContent:
                                'space-between',

                              gap:
                                '14px',

                              alignItems:
                                'flex-start',

                              flexWrap:
                                'wrap'
                            }}
                          >

                            <div
                              style={{
                                flex:
                                  '1 1 260px'
                              }}
                            >

                              <span
                                className="tag"
                              >
                                Standard Book
                              </span>


                              <h3
                                style={{
                                  marginTop:
                                    '9px'
                                }}
                              >
                                {book.title}
                              </h3>


                              {source && (

                                <small
                                  style={{
                                    color:
                                      '#94a3b8'
                                  }}
                                >
                                  {source}
                                </small>

                              )}


                              {book.description && (

                                <p>
                                  {book.description}
                                </p>

                              )}

                            </div>


                            <div
                              style={{
                                textAlign:
                                  'right'
                              }}
                            >

                              <strong
                                style={{
                                  fontSize:
                                    '1.25rem'
                                }}
                              >
                                {
                                  signedIn
                                    ? `${bookPercent}%`
                                    : '—'
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

                                {bookCompleted}
                                /
                                {bookLeafIds.length}
                                {' '}
                                portions

                              </small>

                            </div>

                          </div>


                          {/* BOOK BAR */}

                          <div
                            className="progress-track"

                            style={{
                              marginTop:
                                '12px'
                            }}
                          >

                            <span
                              style={{
                                width:
                                  signedIn
                                    ? `${bookPercent}%`
                                    : '0%'
                              }}
                            />

                          </div>


                          {/* OPEN BOOK */}

                          <button
                            type="button"
                            className={
                              expanded
                                ? 'primary-btn'
                                : 'secondary-btn'
                            }

                            onClick={() =>
                              toggleBook(
                                book.id
                              )
                            }

                            style={{
                              marginTop:
                                '14px'
                            }}
                          >

                            {
                              expanded
                                ? 'Hide Topics'
                                : 'Open Topics'
                            }

                          </button>


                          {/* TOPICS */}

                          {expanded && (

                            <div
                              style={{
                                marginTop:
                                  '14px'
                              }}
                            >

                              {rootTopics.length ===
                                0 && (

                                <div
                                  className="callout"
                                >
                                  No topics have been
                                  added to this book yet.
                                </div>

                              )}


                              {rootTopics.map(
                                topic =>
                                  renderTopic(
                                    topic
                                  )
                              )}

                            </div>

                          )}

                        </article>

                      );
                    }
                  )}

                </div>

              </section>

            );
          }
        )}

    </div>

  );
}

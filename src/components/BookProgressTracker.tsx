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

  revision_count:
    number |
    string |
    null;

  revision_1_at:
    string |
    null;

  revision_2_at:
    string |
    null;

  final_revision_at:
    string |
    null;
};


type ProgressState = {
  completed: boolean;
  revisionCount: number;

  revision1At:
    string |
    null;

  revision2At:
    string |
    null;

  finalRevisionAt:
    string |
    null;
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


const PROGRESS_SELECT = `
  book_topic_id,
  completed,
  revision_count,
  revision_1_at,
  revision_2_at,
  final_revision_at
`;


const EMPTY_PROGRESS:
  ProgressState = {

  completed:
    false,

  revisionCount:
    0,

  revision1At:
    null,

  revision2At:
    null,

  finalRevisionAt:
    null
};


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
 * REVISION COUNT
 */

function cleanRevisionCount(
  value: unknown
) {

  const number =
    Math.round(
      safeNumber(
        value,
        0
      )
    );


  return Math.min(
    3,
    Math.max(
      0,
      number
    )
  );
}


/*
 * NORMALISE TEXT
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
 * FORMAT DATE
 */

function formatDate(
  value:
    string |
    null
) {

  if (!value) {

    return '';
  }


  const date =
    new Date(
      value
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return '';
  }


  return date
    .toLocaleDateString(
      'en-IN',
      {
        day:
          '2-digit',

        month:
          'short',

        year:
          'numeric'
      }
    );
}


/*
 * BOOK PROGRESS TRACKER
 */

export function BookProgressTracker({
  initialSubject = null
}: BookProgressTrackerProps) {

  /*
   * =========================================
   * DATA
   * =========================================
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


  const [
    progressByTopic,
    setProgressByTopic
  ] =
    useState<
      Record<
        string,
        ProgressState
      >
    >({});


  /*
   * CURRENTLY SAVING
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
   * =========================================
   * PROGRESS HELPERS
   * =========================================
   */

  function getProgressState(
    topicId:
      string
  ):
    ProgressState {

    return (
      progressByTopic[
        topicId
      ] ||
      EMPTY_PROGRESS
    );
  }


  function rowToProgressState(
    row:
      ProgressRow
  ):
    ProgressState {

    return {

      completed:
        row.completed ===
        true,

      revisionCount:
        cleanRevisionCount(
          row.revision_count
        ),

      revision1At:
        row.revision_1_at ||
        null,

      revision2At:
        row.revision_2_at ||
        null,

      finalRevisionAt:
        row.final_revision_at ||
        null

    };
  }


  function setSaving(
    ids:
      string[],
    saving:
      boolean
  ) {

    setSavingIds(
      current => {

        const next =
          new Set(
            current
          );


        ids.forEach(
          id => {

            if (
              saving
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
  }


  /*
   * =========================================
   * LOAD TRACKER
   * =========================================
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
     * LOAD BOOKS
     */

    const {
      data:
        bookData,

      error:
        bookError
    } =
      await client
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
        );


    if (
      bookError
    ) {

      console.error(
        'Unable to load books:',
        bookError
      );


      setMessage(
        bookError.message
      );


      setLoading(
        false
      );


      return;
    }


    const cleanBooks:
      BookRow[] =
        (
          bookData ||
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


    setBooks(
      cleanBooks
    );


    /*
     * LOAD TOPICS
     */

    const {
      data:
        topicData,

      error:
        topicError
    } =
      await client
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
        );


    if (
      topicError
    ) {

      console.error(
        'Unable to load book topics:',
        topicError
      );


      setMessage(
        topicError.message
      );


      setLoading(
        false
      );


      return;
    }


    /*
     * ONLY TOPICS BELONGING
     * TO PUBLISHED BOOKS
     */

    const publishedBookIds =
      new Set(
        cleanBooks.map(
          book =>
            book.id
        )
      );


    const cleanTopics:
      TopicRow[] =
        (
          topicData ||
          []
        )
          .map(
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
          )
          .filter(
            item =>
              publishedBookIds.has(
                item.book_id
              )
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


      setProgressByTopic(
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


    /*
     * LOAD READ +
     * REVISION PROGRESS
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
          PROGRESS_SELECT
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


      setProgressByTopic(
        {}
      );


      setLoading(
        false
      );


      return;
    }


    const nextProgress:
      Record<
        string,
        ProgressState
      > = {};


    (
      progressData ||
      []
    ).forEach(
      item => {

        const row =
          item as
            ProgressRow;


        nextProgress[
          String(
            row.book_topic_id
          )
        ] =
          rowToProgressState(
            row
          );
      }
    );


    setProgressByTopic(
      nextProgress
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
   * =========================================
   * SUBJECTS
   * =========================================
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
   * MATCH HOME SUBJECT
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
   * =========================================
   * TOPIC TREE
   * =========================================
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
   * GET LEAF ITEMS
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


    return children.flatMap(
      child =>
        getLeafIds(
          child.id,
          nextVisited
        )
    );
  }


  /*
   * BOOK LEAF IDS
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


    return roots.flatMap(
      topic =>
        getLeafIds(
          topic.id
        )
    );
  }


  /*
   * SUBJECT LEAF IDS
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
   * ALL LEAF IDS
   */

  const allLeafIds =
    books.flatMap(
      book =>
        getBookLeafIds(
          book.id
        )
    );


  /*
   * =========================================
   * PROGRESS CALCULATIONS
   * =========================================
   */

  function getReadCount(
    ids:
      string[]
  ) {

    return ids.filter(
      id =>
        getProgressState(
          id
        ).completed
    ).length;
  }


  function getRevisionCount(
    ids:
      string[],
    minimumRevision:
      1 |
      2 |
      3
  ) {

    return ids.filter(
      id =>
        getProgressState(
          id
        ).revisionCount >=
        minimumRevision
    ).length;
  }


  function getPercent(
    completed:
      number,
    total:
      number
  ) {

    if (
      total <=
      0
    ) {

      return 0;
    }


    return Math.round(
      (
        completed /
        total
      ) *
      100
    );
  }


  function getReadPercent(
    ids:
      string[]
  ) {

    return getPercent(
      getReadCount(
        ids
      ),
      ids.length
    );
  }


  function getRevisionPercent(
    ids:
      string[],
    level:
      1 |
      2 |
      3
  ) {

    return getPercent(
      getRevisionCount(
        ids,
        level
      ),
      ids.length
    );
  }


  /*
   * OVERALL STATS
   */

  const overallReadCount =
    getReadCount(
      allLeafIds
    );


  const overallRevision1Count =
    getRevisionCount(
      allLeafIds,
      1
    );


  const overallRevision2Count =
    getRevisionCount(
      allLeafIds,
      2
    );


  const overallFinalCount =
    getRevisionCount(
      allLeafIds,
      3
    );


  const overallReadPercent =
    getPercent(
      overallReadCount,
      allLeafIds.length
    );


  const overallRevision1Percent =
    getPercent(
      overallRevision1Count,
      allLeafIds.length
    );


  const overallRevision2Percent =
    getPercent(
      overallRevision2Count,
      allLeafIds.length
    );


  const overallFinalPercent =
    getPercent(
      overallFinalCount,
      allLeafIds.length
    );


  /*
   * =========================================
   * SEARCH + FILTER
   * =========================================
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
   * =========================================
   * EXPAND BOOK
   * =========================================
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
   * SAVING CHECK
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
   * =========================================
   * SAVE READ STATUS
   * =========================================
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
        'Sign in from the Me section to save your reading progress.'
      );


      return;
    }


    setSaving(
      ids,
      true
    );


    const payload =
      ids.map(
        id => {

          const current =
            getProgressState(
              id
            );


          return {

            user_id:
              user.id,

            book_topic_id:
              id,

            completed,

            revision_count:
              completed
                ? current.revisionCount
                : 0

          };
        }
      );


    const {
      data,
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
        )
        .select(
          PROGRESS_SELECT
        );


    if (
      error
    ) {

      console.error(
        'Unable to save reading progress:',
        error
      );


      setMessage(
        error.message
      );


      setSaving(
        ids,
        false
      );


      return;
    }


    setProgressByTopic(
      current => {

        const next = {
          ...current
        };


        if (
          data &&
          data.length >
            0
        ) {

          data.forEach(
            item => {

              const row =
                item as
                  ProgressRow;


              next[
                String(
                  row.book_topic_id
                )
              ] =
                rowToProgressState(
                  row
                );
            }
          );

        } else {

          ids.forEach(
            id => {

              const old =
                current[
                  id
                ] ||
                EMPTY_PROGRESS;


              next[
                id
              ] = {

                ...old,

                completed,

                revisionCount:
                  completed
                    ? old.revisionCount
                    : 0,

                revision1At:
                  completed
                    ? old.revision1At
                    : null,

                revision2At:
                  completed
                    ? old.revision2At
                    : null,

                finalRevisionAt:
                  completed
                    ? old.finalRevisionAt
                    : null

              };
            }
          );
        }


        return next;
      }
    );


    setSaving(
      ids,
      false
    );


    setMessage(
      completed
        ? 'Reading progress saved.'
        : 'Reading and revision progress cleared.'
    );
  }


  /*
   * =========================================
   * SAVE REVISION
   * =========================================
   */

  async function saveRevision(
    topicId:
      string,
    revisionCount:
      number
  ) {

    const client =
      supabase;


    if (!client) {

      setMessage(
        'Supabase is not configured.'
      );


      return;
    }


    const current =
      getProgressState(
        topicId
      );


    if (
      !current.completed
    ) {

      setMessage(
        'Mark this portion as Read before adding a revision.'
      );


      return;
    }


    const nextRevision =
      cleanRevisionCount(
        revisionCount
      );


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
        'Sign in from the Me section to save revisions.'
      );


      return;
    }


    setSaving(
      [
        topicId
      ],
      true
    );


    const {
      data,
      error
    } =
      await client
        .from(
          'book_topic_progress'
        )
        .upsert(
          [
            {
              user_id:
                user.id,

              book_topic_id:
                topicId,

              completed:
                true,

              revision_count:
                nextRevision
            }
          ],
          {
            onConflict:
              'user_id,book_topic_id'
          }
        )
        .select(
          PROGRESS_SELECT
        );


    if (
      error
    ) {

      console.error(
        'Unable to save revision:',
        error
      );


      setMessage(
        error.message
      );


      setSaving(
        [
          topicId
        ],
        false
      );


      return;
    }


    if (
      data &&
      data.length >
        0
    ) {

      const row =
        data[
          0
        ] as
          ProgressRow;


      setProgressByTopic(
        existing => ({

          ...existing,

          [
            topicId
          ]:
            rowToProgressState(
              row
            )

        })
      );

    } else {

      setProgressByTopic(
        existing => {

          const old =
            existing[
              topicId
            ] ||
            EMPTY_PROGRESS;


          return {

            ...existing,

            [
              topicId
            ]: {

              ...old,

              completed:
                true,

              revisionCount:
                nextRevision

            }

          };
        }
      );
    }


    setSaving(
      [
        topicId
      ],
      false
    );


    if (
      nextRevision ===
      0
    ) {

      setMessage(
        'Revision progress reset.'
      );

    } else if (
      nextRevision ===
      1
    ) {

      setMessage(
        'Revision 1 completed.'
      );

    } else if (
      nextRevision ===
      2
    ) {

      setMessage(
        'Revision 2 completed.'
      );

    } else {

      setMessage(
        'Final revision completed.'
      );
    }
  }


  /*
   * =========================================
   * TOGGLE READ
   * =========================================
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


    const allRead =
      leafIds.every(
        id =>
          getProgressState(
            id
          ).completed
      );


    /*
     * REMOVING READ STATUS
     * ALSO REMOVES REVISION DATA.
     */

    if (
      allRead
    ) {

      const hasRevision =
        leafIds.some(
          id =>
            getProgressState(
              id
            ).revisionCount >
            0
        );


      if (
        hasRevision
      ) {

        const confirmed =
          window.confirm(
            'Marking this portion as unread will also clear its revision history. Continue?'
          );


        if (
          !confirmed
        ) {

          return;
        }
      }
    }


    await saveCompletion(
      leafIds,
      !allRead
    );
  }


  /*
   * =========================================
   * FILTER RESET
   * =========================================
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
   * =========================================
   * RENDER TOPIC
   * =========================================
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


    const isLeaf =
      children.length ===
      0;


    const leafIds =
      getLeafIds(
        topic.id
      );


    const readCount =
      getReadCount(
        leafIds
      );


    const revision1Count =
      getRevisionCount(
        leafIds,
        1
      );


    const revision2Count =
      getRevisionCount(
        leafIds,
        2
      );


    const finalCount =
      getRevisionCount(
        leafIds,
        3
      );


    const readPercent =
      getPercent(
        readCount,
        leafIds.length
      );


    const finalPercent =
      getPercent(
        finalCount,
        leafIds.length
      );


    const fullyRead =
      leafIds.length >
        0 &&
      readCount ===
        leafIds.length;


    const currentlySaving =
      isSaving(
        leafIds
      );


    const leafProgress =
      getProgressState(
        topic.id
      );


    let latestRevisionDate =
      '';


    if (
      isLeaf
    ) {

      if (
        leafProgress.revisionCount ===
        3
      ) {

        latestRevisionDate =
          formatDate(
            leafProgress.finalRevisionAt
          );

      } else if (
        leafProgress.revisionCount ===
        2
      ) {

        latestRevisionDate =
          formatDate(
            leafProgress.revision2At
          );

      } else if (
        leafProgress.revisionCount ===
        1
      ) {

        latestRevisionDate =
          formatDate(
            leafProgress.revision1At
          );
      }
    }


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
              ? '11px 12px'
              : '13px 14px',

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

        {/* =================================
            TOPIC HEADER
        ================================= */}

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
                fullyRead
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

              aria-label={
                `Mark ${topic.topic_name} as read`
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
                  topic.topic_name
                }
              </strong>


              {!isLeaf && (

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

                  Read {readCount}/{leafIds.length}

                  {' • '}

                  R1 {revision1Count}/{leafIds.length}

                  {' • '}

                  R2 {revision2Count}/{leafIds.length}

                  {' • '}

                  Final {finalCount}/{leafIds.length}

                </small>

              )}

            </span>

          </label>


          <div
            style={{
              textAlign:
                'right',

              minWidth:
                '84px'
            }}
          >

            <strong>
              {readPercent}% Read
            </strong>


            {!isLeaf && (

              <small
                style={{
                  display:
                    'block',

                  marginTop:
                    '3px',

                  color:
                    '#5eead4'
                }}
              >
                {finalPercent}% Final
              </small>

            )}

          </div>

        </div>


        {/* =================================
            READ PROGRESS BAR
        ================================= */}

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
                `${readPercent}%`
            }}
          />

        </div>


        {/* =================================
            LEAF REVISION CONTROLS
        ================================= */}

        {isLeaf && (

          <div
            style={{
              marginTop:
                '12px'
            }}
          >

            {/* STAGES */}

            <div
              style={{
                display:
                  'flex',

                gap:
                  '7px',

                flexWrap:
                  'wrap'
              }}
            >

              <span
                className="tag"
                style={{
                  opacity:
                    leafProgress.completed
                      ? 1
                      : 0.5
                }}
              >
                {
                  leafProgress.completed
                    ? '✓ Read'
                    : '○ Read'
                }
              </span>


              <span
                className="tag"
                style={{
                  opacity:
                    leafProgress.revisionCount >=
                      1
                      ? 1
                      : 0.5
                }}
              >
                {
                  leafProgress.revisionCount >=
                    1
                    ? '✓ Revision 1'
                    : '○ Revision 1'
                }
              </span>


              <span
                className="tag"
                style={{
                  opacity:
                    leafProgress.revisionCount >=
                      2
                      ? 1
                      : 0.5
                }}
              >
                {
                  leafProgress.revisionCount >=
                    2
                    ? '✓ Revision 2'
                    : '○ Revision 2'
                }
              </span>


              <span
                className="tag"
                style={{
                  opacity:
                    leafProgress.revisionCount >=
                      3
                      ? 1
                      : 0.5
                }}
              >
                {
                  leafProgress.revisionCount >=
                    3
                    ? '✓ Final'
                    : '○ Final'
                }
              </span>

            </div>


            {/* NEXT REVISION */}

            {leafProgress.completed &&
              leafProgress.revisionCount <
                3 && (

              <button
                type="button"
                className="secondary-btn"

                disabled={
                  currentlySaving
                }

                onClick={() =>
                  void saveRevision(
                    topic.id,
                    leafProgress.revisionCount +
                      1
                  )
                }

                style={{
                  marginTop:
                    '10px'
                }}
              >

                {
                  currentlySaving
                    ? 'Saving...'

                    : leafProgress.revisionCount ===
                      0
                    ? 'Mark Revision 1'

                    : leafProgress.revisionCount ===
                      1
                    ? 'Mark Revision 2'

                    : 'Mark Final Revision'
                }

              </button>

            )}


            {/* FULLY REVISED */}

            {leafProgress.completed &&
              leafProgress.revisionCount ===
                3 && (

              <div
                className="callout"

                style={{
                  marginTop:
                    '10px'
                }}
              >

                <strong>
                  ✓ Fully Revised
                </strong>


                {latestRevisionDate && (

                  <small
                    style={{
                      display:
                        'block',

                      marginTop:
                        '4px'
                    }}
                  >
                    Final revision: {latestRevisionDate}
                  </small>

                )}

              </div>

            )}


            {/* CURRENT REVISION DATE */}

            {leafProgress.completed &&
              leafProgress.revisionCount >
                0 &&
              leafProgress.revisionCount <
                3 &&
              latestRevisionDate && (

              <small
                style={{
                  display:
                    'block',

                  color:
                    '#94a3b8',

                  marginTop:
                    '8px'
                }}
              >
                Latest revision: {latestRevisionDate}
              </small>

            )}


            {/* UNDO REVISION */}

            {leafProgress.completed &&
              leafProgress.revisionCount >
                0 && (

              <button
                type="button"
                className="text-btn"

                disabled={
                  currentlySaving
                }

                onClick={() =>
                  void saveRevision(
                    topic.id,
                    leafProgress.revisionCount -
                      1
                  )
                }

                style={{
                  marginTop:
                    '8px'
                }}
              >
                Undo latest revision
              </button>

            )}


            {/* NOT READ */}

            {!leafProgress.completed &&
              signedIn && (

              <small
                style={{
                  display:
                    'block',

                  color:
                    '#94a3b8',

                  marginTop:
                    '9px'
                }}
              >
                Mark this portion as Read to unlock revision tracking.
              </small>

            )}

          </div>

        )}


        {/* =================================
            CHILD TOPICS
        ================================= */}

        {!isLeaf && (

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
   * =========================================
   * PAGE
   * =========================================
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
          Reading & Revision Tracker
        </h2>


        <p>
          Track each book from reading through
          Revision 1, Revision 2 and Final Revision.
          Progress is calculated from the smallest
          readable topics and subtopics.
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
                Read
              </span>


              <strong>

                {
                  loading
                    ? '...'
                    : signedIn
                    ? `${overallReadPercent}%`
                    : '—'
                }

              </strong>


              <small>
                {overallReadCount}/{allLeafIds.length} portions
              </small>

            </div>

          </article>


          <article
            className="metric-card"
          >

            <div>

              <span>
                Revision 1
              </span>


              <strong>

                {
                  loading
                    ? '...'
                    : signedIn
                    ? `${overallRevision1Percent}%`
                    : '—'
                }

              </strong>


              <small>
                {overallRevision1Count}/{allLeafIds.length} portions
              </small>

            </div>

          </article>


          <article
            className="metric-card"
          >

            <div>

              <span>
                Revision 2
              </span>


              <strong>

                {
                  loading
                    ? '...'
                    : signedIn
                    ? `${overallRevision2Percent}%`
                    : '—'
                }

              </strong>


              <small>
                {overallRevision2Count}/{allLeafIds.length} portions
              </small>

            </div>

          </article>


          <article
            className="metric-card"
          >

            <div>

              <span>
                Final Revision
              </span>


              <strong>

                {
                  loading
                    ? '...'
                    : signedIn
                    ? `${overallFinalPercent}%`
                    : '—'
                }

              </strong>


              <small>
                {overallFinalCount}/{allLeafIds.length} portions
              </small>

            </div>

          </article>

        </div>


        {/* OVERALL READ BAR */}

        {signedIn &&
          allLeafIds.length >
            0 && (

          <div
            style={{
              marginTop:
                '18px'
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
                Reading Progress
              </strong>


              <strong>
                {overallReadPercent}%
              </strong>

            </div>


            <div
              className="progress-track"
            >

              <span
                style={{
                  width:
                    `${overallReadPercent}%`
                }}
              />

            </div>

          </div>

        )}


        {/* FINAL REVISION BAR */}

        {signedIn &&
          allLeafIds.length >
            0 && (

          <div
            style={{
              marginTop:
                '14px'
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
                Final Revision Progress
              </strong>


              <strong>
                {overallFinalPercent}%
              </strong>

            </div>


            <div
              className="progress-track"
            >

              <span
                style={{
                  width:
                    `${overallFinalPercent}%`
                }}
              />

            </div>

          </div>

        )}


        {/* SIGNED OUT */}

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
              Sign in to track preparation
            </strong>


            <p>
              You can view books and topics without
              signing in, but reading and revision
              progress requires your account.
            </p>

          </div>

        )}


        {/* MESSAGE */}

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
          FILTER
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
                    event.target.value
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
                    event.target.value
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
          Loading reading and revision progress...
        </section>

      )}


      {/* =====================================
          NO BOOKS
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
            Admin Studio and create their topics
            in Book Structure.
          </p>

        </section>

      )}


      {/* =====================================
          NO FILTER RESULTS
      ===================================== */}

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
          SUBJECTS
      ===================================== */}

      {!loading &&
        subjectGroups.map(
          group => {

            const subjectLeafIds =
              getSubjectLeafIds(
                group.subject
              );


            const subjectReadCount =
              getReadCount(
                subjectLeafIds
              );


            const subjectFinalCount =
              getRevisionCount(
                subjectLeafIds,
                3
              );


            const subjectReadPercent =
              getPercent(
                subjectReadCount,
                subjectLeafIds.length
              );


            const subjectFinalPercent =
              getPercent(
                subjectFinalCount,
                subjectLeafIds.length
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

                      {subjectReadCount}/{subjectLeafIds.length}

                      {' '}

                      read

                    </small>

                  </div>


                  <div
                    style={{
                      textAlign:
                        'right'
                    }}
                  >

                    <strong
                      style={{
                        display:
                          'block',

                        fontSize:
                          '1.25rem'
                      }}
                    >
                      {
                        signedIn
                          ? `${subjectReadPercent}% Read`
                          : '—'
                      }
                    </strong>


                    {signedIn && (

                      <small
                        style={{
                          color:
                            '#5eead4'
                        }}
                      >
                        {subjectFinalPercent}% Final Revision
                      </small>

                    )}

                  </div>

                </div>


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
                          ? `${subjectReadPercent}%`
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


                      const bookReadCount =
                        getReadCount(
                          bookLeafIds
                        );


                      const bookFinalCount =
                        getRevisionCount(
                          bookLeafIds,
                          3
                        );


                      const bookReadPercent =
                        getPercent(
                          bookReadCount,
                          bookLeafIds.length
                        );


                      const bookFinalPercent =
                        getPercent(
                          bookFinalCount,
                          bookLeafIds.length
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
                                  display:
                                    'block',

                                  fontSize:
                                    '1.2rem'
                                }}
                              >
                                {
                                  signedIn
                                    ? `${bookReadPercent}% Read`
                                    : '—'
                                }
                              </strong>


                              {signedIn && (

                                <small
                                  style={{
                                    display:
                                      'block',

                                    color:
                                      '#5eead4',

                                    marginTop:
                                      '3px'
                                  }}
                                >
                                  {bookFinalPercent}% Final
                                </small>

                              )}


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
                                {bookReadCount}/{bookLeafIds.length} portions
                              </small>

                            </div>

                          </div>


                          {/* BOOK READ BAR */}

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
                                    ? `${bookReadPercent}%`
                                    : '0%'
                              }}
                            />

                          </div>


                          {/* BOOK REVISION SUMMARY */}

                          {signedIn &&
                            bookLeafIds.length >
                              0 && (

                            <div
                              style={{
                                display:
                                  'flex',

                                gap:
                                  '7px',

                                flexWrap:
                                  'wrap',

                                marginTop:
                                  '10px'
                              }}
                            >

                              <span
                                className="tag"
                              >
                                R1 {
                                  getRevisionCount(
                                    bookLeafIds,
                                    1
                                  )
                                }/{bookLeafIds.length}
                              </span>


                              <span
                                className="tag"
                              >
                                R2 {
                                  getRevisionCount(
                                    bookLeafIds,
                                    2
                                  )
                                }/{bookLeafIds.length}
                              </span>


                              <span
                                className="tag"
                              >
                                Final {bookFinalCount}/{bookLeafIds.length}
                              </span>

                            </div>

                          )}


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
                                  No topics have been added
                                  to this book yet.
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

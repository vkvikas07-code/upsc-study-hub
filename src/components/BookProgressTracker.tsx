import {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  QuickNoteComposer
} from './QuickNoteComposer';

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

  exam_stage:
    | 'prelims'
    | 'mains'
    | 'both'
    | null;

  external_url:
    string |
    null;

  sort_order:
    number;
};


type TopicRow = {
  id: string;
  book_id: string;
  subject: string;
  topic_name: string;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
};


type ProgressRow = {
  book_topic_id: string;
  completed: boolean;
  revision_count: number | string | null;
  revision_1_at: string | null;
  revision_2_at: string | null;
  final_revision_at: string | null;
  next_revision_due_at: string | null;
};


type ProgressState = {
  completed: boolean;
  revisionCount: number;
  revision1At: string | null;
  revision2At: string | null;
  finalRevisionAt: string | null;
  nextRevisionDueAt: string | null;
};


type DueInfo = {
  timestamp: number;
  nextLabel: string;
  dateLabel: string;
  statusLabel: string;
  color: string;
  borderColor: string;
  background: string;
  overdue: boolean;
  dueToday: boolean;
};


type DueSummary = {
  overdue: number;
  dueToday: number;
  scheduled: number;
  earliest: DueInfo | null;
};


type BookProgressTrackerProps = {
  initialSubject?: string | null;
};


const BOOK_SELECT = `
  id,
  title,
  subject,
  description,
  author,
  publisher,
  source_name,
  exam_stage,
  external_url,
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
  final_revision_at,
  next_revision_due_at
`;


const EMPTY_PROGRESS: ProgressState = {
  completed: false,
  revisionCount: 0,
  revision1At: null,
  revision2At: null,
  finalRevisionAt: null,
  nextRevisionDueAt: null
};


const DAY_MS =
  24 * 60 * 60 * 1000;


/*
 * HELPERS
 */

function safeNumber(
  value: unknown,
  fallback = 0
) {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}


function cleanRevisionCount(
  value: unknown
) {
  return Math.min(
    3,
    Math.max(
      0,
      Math.round(
        safeNumber(value)
      )
    )
  );
}


function normalise(
  value: string
) {
  return value
    .trim()
    .toLowerCase();
}


function formatDate(
  value: string | null
) {
  if (!value) {
    return '';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '';
  }

  return date.toLocaleDateString(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }
  );
}


function startOfDay(
  value: Date
) {
  const date =
    new Date(value);

  date.setHours(
    0,
    0,
    0,
    0
  );

  return date;
}


function nextRevisionLabel(
  revisionCount: number
) {
  if (
    revisionCount === 0
  ) {
    return 'Revision 1';
  }

  if (
    revisionCount === 1
  ) {
    return 'Revision 2';
  }

  return 'Final Revision';
}


function buildDueInfo(
  dueValue: string | null,
  revisionCount: number
): DueInfo | null {

  if (
    !dueValue ||
    revisionCount >= 3
  ) {
    return null;
  }

  const due =
    new Date(dueValue);

  if (
    Number.isNaN(
      due.getTime()
    )
  ) {
    return null;
  }

  const today =
    startOfDay(
      new Date()
    );

  const dueDay =
    startOfDay(due);

  const difference =
    Math.round(
      (
        dueDay.getTime() -
        today.getTime()
      ) /
      DAY_MS
    );

  let statusLabel =
    '';

  let color =
    '#5eead4';

  let borderColor =
    'rgba(20,184,166,.35)';

  let background =
    'rgba(20,184,166,.08)';


  if (
    difference < 0
  ) {
    const days =
      Math.abs(difference);

    statusLabel =
      `Overdue by ${days} ${
        days === 1
          ? 'day'
          : 'days'
      }`;

    color =
      '#fca5a5';

    borderColor =
      'rgba(248,113,113,.38)';

    background =
      'rgba(127,29,29,.14)';

  } else if (
    difference === 0
  ) {
    statusLabel =
      'Due today';

    color =
      '#fde68a';

    borderColor =
      'rgba(251,191,36,.38)';

    background =
      'rgba(120,53,15,.14)';

  } else if (
    difference === 1
  ) {
    statusLabel =
      'Due tomorrow';

  } else {
    statusLabel =
      `Due in ${difference} days`;
  }


  return {
    timestamp:
      due.getTime(),

    nextLabel:
      nextRevisionLabel(
        revisionCount
      ),

    dateLabel:
      formatDate(dueValue),

    statusLabel,

    color,

    borderColor,

    background,

    overdue:
      difference < 0,

    dueToday:
      difference === 0
  };
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
    useState<BookRow[]>([]);


  const [
    topics,
    setTopics
  ] =
    useState<TopicRow[]>([]);


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


  const [
    savingIds,
    setSavingIds
  ] =
    useState<Set<string>>(
      new Set()
    );


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


  const [
    subjectFilter,
    setSubjectFilter
  ] =
    useState('all');


  const [
    search,
    setSearch
  ] =
    useState('');


  const [
    loading,
    setLoading
  ] =
    useState(true);


  const [
    signedIn,
    setSignedIn
  ] =
    useState(false);


  const [
    message,
    setMessage
  ] =
    useState('');


  /*
   * PROGRESS HELPERS
   */

  function getProgressState(
    topicId: string
  ): ProgressState {

    return (
      progressByTopic[
        topicId
      ] ||
      EMPTY_PROGRESS
    );
  }


  function rowToProgressState(
    row: ProgressRow
  ): ProgressState {

    return {
      completed:
        row.completed === true,

      revisionCount:
        cleanRevisionCount(
          row.revision_count
        ),

      revision1At:
        row.revision_1_at || null,

      revision2At:
        row.revision_2_at || null,

      finalRevisionAt:
        row.final_revision_at || null,

      nextRevisionDueAt:
        row.next_revision_due_at || null
    };
  }


  function setSaving(
    ids: string[],
    saving: boolean
  ) {

    setSavingIds(
      current => {

        const next =
          new Set(current);

        ids.forEach(
          id => {

            if (saving) {
              next.add(id);
            } else {
              next.delete(id);
            }
          }
        );

        return next;
      }
    );
  }


  /*
   * LOAD TRACKER
   */

  async function loadTracker() {

    const client =
      supabase;

    if (!client) {
      setMessage(
        'Supabase is not configured.'
      );

      setLoading(false);

      return;
    }

    setLoading(true);
    setMessage('');


    /*
     * BOOKS
     */

    const {
      data: bookData,
      error: bookError
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
            ascending: true
          }
        )
        .order(
          'sort_order',
          {
            ascending: true
          }
        )
        .order(
          'title',
          {
            ascending: true
          }
        );


    if (bookError) {
      console.error(
        'Unable to load books:',
        bookError
      );

      setMessage(
        bookError.message
      );

      setLoading(false);

      return;
    }


    const :
      BookRow[] =
        (
          bookData || []
        ).map(
          item => ({
            id:
              String(item.id),

            title:
              String(
                item.title || ''
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

exam_stage:
  item.exam_stage ===
    'prelims' ||
  item.exam_stage ===
    'mains' ||
  item.exam_stage ===
    'both'
    ? item.exam_stage
    : null,

external_url:
  item.external_url
    ? String(
        item.external_url
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
     * TOPICS
     */

    const {
      data: topicData,
      error: topicError
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
            ascending: true
          }
        )
        .order(
          'topic_name',
          {
            ascending: true
          }
        );


    if (topicError) {
      console.error(
        'Unable to load book topics:',
        topicError
      );

      setMessage(
        topicError.message
      );

      setLoading(false);

      return;
    }


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
          topicData || []
        )
          .map(
            item => ({
              id:
                String(item.id),

              book_id:
                String(
                  item.book_id
                ),

              subject:
                String(
                  item.subject || ''
                ),

              topic_name:
                String(
                  item.topic_name || ''
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
                item.is_active !== false
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
     * USER
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
      setSignedIn(false);
      setProgressByTopic({});
      setLoading(false);

      return;
    }


    setSignedIn(true);


    /*
     * PROGRESS
     */

    const {
      data: progressData,
      error: progressError
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


    if (progressError) {
      console.error(
        'Unable to load book progress:',
        progressError
      );

      setMessage(
        progressError.message
      );

      setProgressByTopic({});
      setLoading(false);

      return;
    }


    const nextProgress:
      Record<
        string,
        ProgressState
      > = {};


    (
      progressData || []
    ).forEach(
      item => {

        const row =
          item as ProgressRow;

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

    setLoading(false);
  }


  useEffect(
    () => {
      void loadTracker();
    },
    []
  );


  /*
   * SUBJECTS
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
                    book.subject.trim()
                )
                .filter(Boolean)
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
      [books]
    );


  /*
   * INITIAL SUBJECT
   */

  useEffect(
    () => {

      if (
        !initialSubject ||
        subjects.length === 0
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
            ) === requested
        );


      if (exact) {
        setSubjectFilter(
          exact
        );

        return;
      }


      const partial =
        subjects.find(
          subject => {

            const candidate =
              normalise(subject);

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


      if (partial) {
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
   * TOPIC TREE
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
              ) || [];

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
      [topics]
    );


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
                ) || [];

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
      [topics]
    );


  /*
   * LEAF HELPERS
   */

  function getLeafIds(
    topicId: string,
    visited =
      new Set<string>()
  ): string[] {

    if (
      visited.has(topicId)
    ) {
      return [];
    }


    const nextVisited =
      new Set(visited);

    nextVisited.add(
      topicId
    );


    const children =
      childrenMap.get(
        topicId
      ) || [];


    if (
      children.length === 0
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


  function getBookLeafIds(
    bookId: string
  ) {

    const roots =
      rootTopicsByBook.get(
        bookId
      ) || [];


    return roots.flatMap(
      topic =>
        getLeafIds(
          topic.id
        )
    );
  }


  function getSubjectLeafIds(
    subject: string
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


  const allLeafIds =
    books.flatMap(
      book =>
        getBookLeafIds(
          book.id
        )
    );


  /*
   * PROGRESS CALCULATIONS
   */

  function getReadCount(
    ids: string[]
  ) {

    return ids.filter(
      id =>
        getProgressState(
          id
        ).completed
    ).length;
  }


  function getRevisionCount(
    ids: string[],
    minimumRevision:
      1 | 2 | 3
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
    completed: number,
    total: number
  ) {

    if (
      total <= 0
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


  /*
   * DUE SUMMARY
   */

  function getDueSummary(
    ids: string[]
  ): DueSummary {

    let overdue =
      0;

    let dueToday =
      0;

    let scheduled =
      0;

    let earliest:
      DueInfo | null =
        null;


    ids.forEach(
      id => {

        const progress =
          getProgressState(id);


        if (
          !progress.completed ||
          progress.revisionCount >= 3
        ) {
          return;
        }


        const due =
          buildDueInfo(
            progress.nextRevisionDueAt,
            progress.revisionCount
          );


        if (!due) {
          return;
        }


        scheduled += 1;


        if (
          due.overdue
        ) {
          overdue += 1;
        }


        if (
          due.dueToday
        ) {
          dueToday += 1;
        }


        if (
          !earliest ||
          due.timestamp <
          earliest.timestamp
        ) {
          earliest =
            due;
        }
      }
    );


    return {
      overdue,
      dueToday,
      scheduled,
      earliest
    };
  }


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


  const overallDue =
    getDueSummary(
      allLeafIds
    );


  /*
   * SEARCH
   */

  const visibleBooks =
    useMemo(
      () => {

        const query =
          normalise(search);


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
                book.description || '',
                book.author || '',
                book.publisher || '',
                book.source_name || ''
              ]
                .join(' ')
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
              group.books.length > 0
          );

      },
      [
        subjects,
        visibleBooks
      ]
    );


  /*
   * BOOK EXPANSION
   */

  function toggleBook(
    bookId: string
  ) {

    setExpandedBooks(
      current => ({
        ...current,

        [bookId]:
          !current[
            bookId
          ]
      })
    );
  }


  function isSaving(
    ids: string[]
  ) {

    return ids.some(
      id =>
        savingIds.has(id)
    );
  }


  /*
   * SAVE READ
   */

  async function saveCompletion(
    ids: string[],
    completed: boolean
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
      ids.length === 0
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
      setSignedIn(false);

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
            getProgressState(id);


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


    if (error) {
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
          data.length > 0
        ) {

          data.forEach(
            item => {

              const row =
                item as ProgressRow;

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
                current[id] ||
                EMPTY_PROGRESS;


              next[id] = {
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
                    : null,

                nextRevisionDueAt:
                  completed
                    ? old.nextRevisionDueAt
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
        ? 'Reading progress saved. Your next revision date has been scheduled automatically.'
        : 'Reading and revision progress cleared.'
    );
  }


  /*
   * SAVE REVISION
   */

  async function saveRevision(
    topicId: string,
    revisionCount: number
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
      setSignedIn(false);

      setMessage(
        'Sign in from the Me section to save revisions.'
      );

      return;
    }


    setSaving(
      [topicId],
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
          {
            user_id:
              user.id,

            book_topic_id:
              topicId,

            completed:
              true,

            revision_count:
              nextRevision
          },
          {
            onConflict:
              'user_id,book_topic_id'
          }
        )
        .select(
          PROGRESS_SELECT
        );


    if (error) {
      console.error(
        'Unable to save revision:',
        error
      );

      setMessage(
        error.message
      );

      setSaving(
        [topicId],
        false
      );

      return;
    }


    if (
      data &&
      data.length > 0
    ) {

      const row =
        data[0] as ProgressRow;


      setProgressByTopic(
        existing => ({
          ...existing,

          [topicId]:
            rowToProgressState(
              row
            )
        })
      );

    } else {

      setProgressByTopic(
        existing => ({
          ...existing,

          [topicId]: {
            ...(
              existing[
                topicId
              ] ||
              EMPTY_PROGRESS
            ),

            completed:
              true,

            revisionCount:
              nextRevision
          }
        })
      );
    }


    setSaving(
      [topicId],
      false
    );


    if (
      nextRevision === 0
    ) {
      setMessage(
        'Revision progress reset.'
      );

    } else if (
      nextRevision === 1
    ) {
      setMessage(
        'Revision 1 completed. Revision 2 has been scheduled automatically.'
      );

    } else if (
      nextRevision === 2
    ) {
      setMessage(
        'Revision 2 completed. Final Revision has been scheduled automatically.'
      );

    } else {
      setMessage(
        'Final Revision completed. This portion is fully revised.'
      );
    }
  }


  /*
   * TOGGLE READ
   */

  async function toggleTopic(
    topic: TopicRow
  ) {

    const leafIds =
      getLeafIds(
        topic.id
      );


    if (
      leafIds.length === 0
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


    if (allRead) {

      const hasRevision =
        leafIds.some(
          id =>
            getProgressState(
              id
            ).revisionCount > 0
        );


      if (hasRevision) {

        const confirmed =
          window.confirm(
            'Marking this portion as unread will also clear its revision history and future revision schedule. Continue?'
          );


        if (!confirmed) {
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
   * FILTER RESET
   */

  function clearFilters() {

    setSearch('');


    if (!initialSubject) {
      setSubjectFilter('all');

      return;
    }


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
            candidate === requested ||
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
      match || 'all'
    );
  }


  /*
   * RENDER TOPIC
   */

  function renderTopic(
    topic: TopicRow,
    depth = 0
  ) {

    const children =
      childrenMap.get(
        topic.id
      ) || [];


    const isLeaf =
      children.length === 0;
const book =
  books.find(
    item =>
      item.id ===
      topic.book_id
  );


const noteSubject =
  topic.subject.trim() ||
  book?.subject ||
  null;


const noteTags:
  string[] = [

    book?.title ||
      '',

    noteSubject ||
      '',

    topic.topic_name,

    'Book Note'

  ].filter(
    value =>
      value.length > 0
  );


const noteExamStage =
  book?.exam_stage ||
  'general';

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
      leafIds.length > 0 &&
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


    const dueSummary =
      getDueSummary(
        leafIds
      );


    const leafDue =
      isLeaf
        ? buildDueInfo(
            leafProgress
              .nextRevisionDueAt,

            leafProgress
              .revisionCount
          )
        : null;


    let latestRevisionDate =
      '';


    if (isLeaf) {

      if (
        leafProgress.revisionCount === 3
      ) {
        latestRevisionDate =
          formatDate(
            leafProgress.finalRevisionAt
          );

      } else if (
        leafProgress.revisionCount === 2
      ) {
        latestRevisionDate =
          formatDate(
            leafProgress.revision2At
          );

      } else if (
        leafProgress.revisionCount === 1
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
            depth > 0
              ? '18px'
              : '0',

          marginTop:
            depth > 0
              ? '8px'
              : '12px',

          padding:
            depth > 0
              ? '11px 12px'
              : '13px 14px',

          border:
            dueSummary.overdue > 0
              ? '1px solid rgba(248,113,113,.30)'
              : '1px solid rgba(255,255,255,.08)',

          borderRadius:
            '12px',

          background:
            depth > 0
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
                {topic.topic_name}
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


              {!isLeaf &&
                signedIn &&
                dueSummary.earliest && (

                <small
                  style={{
                    display:
                      'block',

                    marginTop:
                      '5px',

                    color:
                      dueSummary
                        .earliest
                        .color
                  }}
                >
                  Next due:
                  {' '}
                  {
                    dueSummary
                      .earliest
                      .nextLabel
                  }
                  {' • '}
                  {
                    dueSummary
                      .earliest
                      .statusLabel
                  }
                  {' • '}
                  {
                    dueSummary
                      .earliest
                      .dateLabel
                  }
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


        {/* READ BAR */}

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


        {/* LEAF REVISION CONTROLS */}

        {isLeaf && (

          <div
            style={{
              marginTop:
                '12px'
            }}
          >

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
                    leafProgress.revisionCount >= 1
                      ? 1
                      : 0.5
                }}
              >
                {
                  leafProgress.revisionCount >= 1
                    ? '✓ Revision 1'
                    : '○ Revision 1'
                }
              </span>


              <span
                className="tag"

                style={{
                  opacity:
                    leafProgress.revisionCount >= 2
                      ? 1
                      : 0.5
                }}
              >
                {
                  leafProgress.revisionCount >= 2
                    ? '✓ Revision 2'
                    : '○ Revision 2'
                }
              </span>


              <span
                className="tag"

                style={{
                  opacity:
                    leafProgress.revisionCount >= 3
                      ? 1
                      : 0.5
                }}
              >
                {
                  leafProgress.revisionCount >= 3
                    ? '✓ Final'
                    : '○ Final'
                }
              </span>

            </div>


            {/* NEXT REVISION DATE */}

            {leafProgress.completed &&
              leafProgress.revisionCount < 3 &&
              leafDue && (

              <div
                style={{
                  marginTop:
                    '10px',

                  padding:
                    '10px 12px',

                  border:
                    `1px solid ${leafDue.borderColor}`,

                  borderRadius:
                    '10px',

                  background:
                    leafDue.background
                }}
              >

                <strong
                  style={{
                    color:
                      leafDue.color
                  }}
                >
                  {leafDue.statusLabel}
                </strong>


                <small
                  style={{
                    display:
                      'block',

                    marginTop:
                      '4px',

                    color:
                      '#cbd5e1'
                  }}
                >
                  Next:
                  {' '}
                  {leafDue.nextLabel}
                  {' • '}
                  {leafDue.dateLabel}
                </small>

              </div>

            )}


            {/* NEXT REVISION ACTION */}

            {leafProgress.completed &&
              leafProgress.revisionCount < 3 && (

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

                    : leafProgress.revisionCount === 0
                    ? 'Mark Revision 1'

                    : leafProgress.revisionCount === 1
                    ? 'Mark Revision 2'

                    : 'Mark Final Revision'
                }
              </button>

            )}


            {/* FULLY REVISED */}

            {leafProgress.completed &&
              leafProgress.revisionCount === 3 && (

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
                    Final revision:
                    {' '}
                    {latestRevisionDate}
                  </small>

                )}

              </div>

            )}


            {/* LATEST REVISION */}

            {leafProgress.completed &&
              leafProgress.revisionCount > 0 &&
              leafProgress.revisionCount < 3 &&
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
                Latest revision:
                {' '}
                {latestRevisionDate}
              </small>

            )}


            {/* UNDO */}

            {leafProgress.completed &&
              leafProgress.revisionCount > 0 && (

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
                Mark this portion as Read to
                create its automatic revision
                schedule.
              </small>

            )}

          </div>

        )}

{/* BOOK TOPIC QUICK NOTE */}

{isLeaf &&
  signedIn && (

  <div
    style={{
      marginTop:
        '14px',

      paddingTop:
        '13px',

      borderTop:
        '1px solid rgba(94,234,212,.14)'
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
          'wrap',

        marginBottom:
          '8px'
      }}
    >

      <div>

        <small
          style={{
            display:
              'block',

            color:
              '#5eead4',

            fontWeight:
              800,

            letterSpacing:
              '.04em'
          }}
        >
          PERSONAL NOTE
        </small>


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
          Save your own points for this
          book topic.
        </small>

      </div>

    </div>


    <QuickNoteComposer

      buttonLabel="+ Add Topic Note"

      defaultTitle={
        book
          ? `${book.title}: ${topic.topic_name}`
          : topic.topic_name
      }

      defaultSubject={
        noteSubject
      }

      defaultTopic={
        topic.topic_name
      }

      defaultTags={
        noteTags
      }

      examStage={
        noteExamStage
      }

      noteType="book"

      bookTopicId={
        topic.id
      }

      sourceUrl={
        book?.external_url ||
        null
      }

    />

  </div>

)}
        {/* CHILDREN */}

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
                  depth + 1
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

      {/* HEADER */}

      <section
        className="panel"
      >

        <span
          className="eyebrow"
        >
          BOOK PROGRESS
        </span>


        <h2>
          Reading, Revision & Due Dates
        </h2>


        <p>
          Track every book from first reading
          through Revision 1, Revision 2 and
          Final Revision. The app automatically
          shows what is due, overdue or coming next.
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


        {/* DUE SUMMARY */}

        {signedIn &&
          allLeafIds.length > 0 && (

          <div
            style={{
              display:
                'flex',

              gap:
                '8px',

              flexWrap:
                'wrap',

              marginTop:
                '16px'
            }}
          >

            <span
              className="tag"
            >
              Due today:
              {' '}
              {overallDue.dueToday}
            </span>


            <span
              className="tag"
            >
              Overdue:
              {' '}
              {overallDue.overdue}
            </span>


            <span
              className="tag"
            >
              Scheduled:
              {' '}
              {overallDue.scheduled}
            </span>

          </div>

        )}


        {signedIn &&
          overallDue.earliest && (

          <div
            style={{
              marginTop:
                '12px',

              padding:
                '12px',

              border:
                `1px solid ${
                  overallDue
                    .earliest
                    .borderColor
                }`,

              borderRadius:
                '12px',

              background:
                overallDue
                  .earliest
                  .background
            }}
          >

            <strong
              style={{
                color:
                  overallDue
                    .earliest
                    .color
              }}
            >
              Next priority:
              {' '}
              {
                overallDue
                  .earliest
                  .statusLabel
              }
            </strong>


            <small
              style={{
                display:
                  'block',

                marginTop:
                  '5px'
              }}
            >
              {
                overallDue
                  .earliest
                  .nextLabel
              }
              {' • '}
              {
                overallDue
                  .earliest
                  .dateLabel
              }
            </small>

          </div>

        )}


        {/* READING BAR */}

        {signedIn &&
          allLeafIds.length > 0 && (

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


        {/* FINAL BAR */}

        {signedIn &&
          allLeafIds.length > 0 && (

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
              Books and topics are visible without
              signing in, but personal progress and
              revision dates require an account.
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


      {/* FILTER */}

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


      {/* LOADING */}

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


      {/* NO BOOKS */}

      {!loading &&
        books.length === 0 && (

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


      {/* NO FILTER RESULT */}

      {!loading &&
        books.length > 0 &&
        subjectGroups.length === 0 && (

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


      {/* SUBJECTS */}

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


            const subjectDue =
              getDueSummary(
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
                        group.books.length === 1
                          ? ''
                          : 's'
                      }
                      {' • '}
                      {subjectReadCount}/{subjectLeafIds.length}
                      {' '}
                      read
                    </small>


                    {signedIn &&
                      subjectDue.earliest && (

                      <small
                        style={{
                          display:
                            'block',

                          marginTop:
                            '5px',

                          color:
                            subjectDue
                              .earliest
                              .color
                        }}
                      >
                        Next due:
                        {' '}
                        {
                          subjectDue
                            .earliest
                            .nextLabel
                        }
                        {' • '}
                        {
                          subjectDue
                            .earliest
                            .statusLabel
                        }
                        {' • '}
                        {
                          subjectDue
                            .earliest
                            .dateLabel
                        }
                      </small>

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


                {signedIn &&
                  subjectLeafIds.length > 0 && (

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
                      Due today {subjectDue.dueToday}
                    </span>

                    <span
                      className="tag"
                    >
                      Overdue {subjectDue.overdue}
                    </span>
                  </div>

                )}


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


                      const bookDue =
                        getDueSummary(
                          bookLeafIds
                        );


                      const rootTopics =
                        rootTopicsByBook.get(
                          book.id
                        ) || [];


                      const expanded =
                        expandedBooks[
                          book.id
                        ] === true;


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
                              bookDue.overdue > 0
                                ? '1px solid rgba(248,113,113,.28)'
                                : '1px solid rgba(255,255,255,.08)',

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


                              {signedIn &&
                                bookDue.earliest && (

                                <small
                                  style={{
                                    display:
                                      'block',

                                    marginTop:
                                      '8px',

                                    color:
                                      bookDue
                                        .earliest
                                        .color
                                  }}
                                >
                                  Next due:
                                  {' '}
                                  {
                                    bookDue
                                      .earliest
                                      .nextLabel
                                  }
                                  {' • '}
                                  {
                                    bookDue
                                      .earliest
                                      .statusLabel
                                  }
                                  {' • '}
                                  {
                                    bookDue
                                      .earliest
                                      .dateLabel
                                  }
                                </small>

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
                                    ? `${bookReadPercent}%`
                                    : '0%'
                              }}
                            />
                          </div>


                          {/* BOOK SUMMARY */}

                          {signedIn &&
                            bookLeafIds.length > 0 && (

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

                              <span
                                className="tag"
                              >
                                Due today {bookDue.dueToday}
                              </span>

                              <span
                                className="tag"
                              >
                                Overdue {bookDue.overdue}
                              </span>

                            </div>

                          )}


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


                          {expanded && (

                            <div
                              style={{
                                marginTop:
                                  '14px'
                              }}
                            >

                              {rootTopics.length === 0 && (
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

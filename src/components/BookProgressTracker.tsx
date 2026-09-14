import {
  useEffect,
  useMemo,
  useState,
  type ReactNode
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
  description: string | null;
  author: string | null;
  publisher: string | null;
  source_name: string | null;
  exam_stage:
    | 'prelims'
    | 'mains'
    | 'both'
    | null;
  external_url: string | null;
  sort_order: number;
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
  revision_count:
    | number
    | string
    | null;
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
  overdue: boolean;
  dueToday: boolean;
};


type RevisionItem = {
  topic: TopicRow;
  book: BookRow;
  progress: ProgressState;
  due: DueInfo;
};


type BookStats = {
  ids: string[];
  total: number;
  read: number;
  final: number;
  readPercent: number;
  finalPercent: number;
  fullyComplete: boolean;
};


type TrackerView =
  | 'today'
  | 'books'
  | 'revisions'
  | 'completed';


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
  24 *
  60 *
  60 *
  1000;


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

  } else if (
    difference === 0
  ) {
    statusLabel =
      'Due today';

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

    overdue:
      difference < 0,

    dueToday:
      difference === 0
  };
}


function latestRevisionDate(
  progress: ProgressState
) {
  if (
    progress.revisionCount >= 3
  ) {
    return formatDate(
      progress.finalRevisionAt
    );
  }

  if (
    progress.revisionCount === 2
  ) {
    return formatDate(
      progress.revision2At
    );
  }

  if (
    progress.revisionCount === 1
  ) {
    return formatDate(
      progress.revision1At
    );
  }

  return '';
}


export function BookProgressTracker({
  initialSubject = null
}: BookProgressTrackerProps) {

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
    activeView,
    setActiveView
  ] =
    useState<TrackerView>(
      'today'
    );

  const [
    openBookId,
    setOpenBookId
  ] =
    useState<string | null>(
      null
    );

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
        row.revision_1_at ||
        null,

      revision2At:
        row.revision_2_at ||
        null,

      finalRevisionAt:
        row.final_revision_at ||
        null,

      nextRevisionDueAt:
        row.next_revision_due_at ||
        null
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

    const cleanBooks:
      BookRow[] =
        (
          bookData ||
          []
        ).map(
          item => ({
            id:
              String(item.id),

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
          book => book.id
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
                String(item.id),

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

    const {
      data: {
        user
      }
    } =
      await client.auth
        .getUser();

    if (!user) {
      setSignedIn(false);
      setProgressByTopic({});
      setLoading(false);
      return;
    }

    setSignedIn(true);

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
      progressData ||
      []
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


  const subjects =
    useMemo<string[]>(
      () =>
        Array
          .from(
            new Set(
              books
                .map(
                  book =>
                    book.subject
                      .trim()
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
          ),
      [
        books
      ]
    );


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

      if (match) {
        setSubjectFilter(
          match
        );
      }
    },
    [
      initialSubject,
      subjects
    ]
  );


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



  function getLeafIds(
    topicId: string,
    visited =
      new Set<string>()
  ): string[] {
    if (
      visited.has(
        topicId
      )
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
      ) ||
      [];

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
      ) ||
      [];

    return roots.flatMap(
      topic =>
        getLeafIds(
          topic.id
        )
    );
  }


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


  function getBookStats(
    bookId: string
  ): BookStats {
    const ids =
      getBookLeafIds(
        bookId
      );

    const read =
      getReadCount(ids);

    const final =
      getRevisionCount(
        ids,
        3
      );

    const total =
      ids.length;

    return {
      ids,
      total,
      read,
      final,

      readPercent:
        getPercent(
          read,
          total
        ),

      finalPercent:
        getPercent(
          final,
          total
        ),

      fullyComplete:
        total > 0 &&
        read === total &&
        final === total
    };
  }


  const allLeafIds =
    books.flatMap(
      book =>
        getBookLeafIds(
          book.id
        )
    );


  const overallReadCount =
    getReadCount(
      allLeafIds
    );

  const overallReadPercent =
    getPercent(
      overallReadCount,
      allLeafIds.length
    );


  const activeBooks =
    books.filter(
      book =>
        !getBookStats(
          book.id
        ).fullyComplete
    );


  const completedBooks =
    books.filter(
      book =>
        getBookStats(
          book.id
        ).fullyComplete
    );


  const revisionItems:
    RevisionItem[] =
      topics
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
        .flatMap(
          topic => {
            const progress =
              getProgressState(
                topic.id
              );

            if (
              !progress.completed ||
              progress.revisionCount >=
                3
            ) {
              return [];
            }

            const due =
              buildDueInfo(
                progress
                  .nextRevisionDueAt,
                progress
                  .revisionCount
              );

            if (!due) {
              return [];
            }

            const book =
              books.find(
                item =>
                  item.id ===
                  topic.book_id
              );

            if (!book) {
              return [];
            }

            return [
              {
                topic,
                book,
                progress,
                due
              }
            ];
          }
        )
        .sort(
          (
            first,
            second
          ) =>
            first.due.timestamp -
            second.due.timestamp
        );


  const overdueItems =
    revisionItems.filter(
      item =>
        item.due.overdue
    );

  const todayItems =
    revisionItems.filter(
      item =>
        item.due.dueToday
    );

  const upcomingItems =
    revisionItems.filter(
      item =>
        !item.due.overdue &&
        !item.due.dueToday
    );


  const dueNowCount =
    overdueItems.length +
    todayItems.length;


  const continueBook =
    activeBooks.find(
      book => {
        const stats =
          getBookStats(
            book.id
          );

        return (
          stats.total > 0 &&
          stats.read > 0 &&
          stats.read <
            stats.total
        );
      }
    ) ||
    activeBooks.find(
      book => {
        const stats =
          getBookStats(
            book.id
          );

        return (
          stats.total > 0 &&
          stats.read <
            stats.total
        );
      }
    ) ||
    null;


  const visibleActiveBooks =
    activeBooks.filter(
      book => {
        if (
          subjectFilter !==
            'all' &&
          book.subject !==
            subjectFilter
        ) {
          return false;
        }

        const query =
          normalise(
            search
          );

        if (!query) {
          return true;
        }

        const text =
          [
            book.title,
            book.subject,
            book.author || '',
            book.publisher || '',
            book.source_name || '',
            book.description || ''
          ]
            .join(' ')
            .toLowerCase();

        if (
          text.includes(
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


  function isSaving(
    ids: string[]
  ) {
    return ids.some(
      id =>
        savingIds.has(id)
    );
  }


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
      await client.auth
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
                ? current
                    .revisionCount
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
                    ? old
                        .revisionCount
                    : 0,

                revision1At:
                  completed
                    ? old
                        .revision1At
                    : null,

                revision2At:
                  completed
                    ? old
                        .revision2At
                    : null,

                finalRevisionAt:
                  completed
                    ? old
                        .finalRevisionAt
                    : null,

                nextRevisionDueAt:
                  completed
                    ? old
                        .nextRevisionDueAt
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
        ? 'Reading saved. The next revision has been scheduled automatically.'
        : 'Reading and revision progress cleared.'
    );
  }


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
        'Mark this topic as Read before adding a revision.'
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
      await client.auth
        .getUser();

    if (!user) {
      setSignedIn(false);
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
        [
          topicId
        ],
        false
      );
      return;
    }

    if (
      data &&
      data.length > 0
    ) {
      const row =
        data[0] as
          ProgressRow;

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

            completed: true,

            revisionCount:
              nextRevision
          }
        })
      );
    }

    setSaving(
      [
        topicId
      ],
      false
    );

    if (
      nextRevision === 1
    ) {
      setMessage(
        'Revision 1 completed. Revision 2 has been scheduled.'
      );

    } else if (
      nextRevision === 2
    ) {
      setMessage(
        'Revision 2 completed. Final Revision has been scheduled.'
      );

    } else if (
      nextRevision === 3
    ) {
      setMessage(
        'Final Revision completed.'
      );

    } else {
      setMessage(
        'Revision progress updated.'
      );
    }
  }


  async function toggleLeaf(
    topic: TopicRow
  ) {
    const progress =
      getProgressState(
        topic.id
      );

    if (
      progress.completed &&
      progress.revisionCount > 0
    ) {
      const confirmed =
        window.confirm(
          'Marking this topic as unread will also clear its revision history and future revision schedule. Continue?'
        );

      if (!confirmed) {
        return;
      }
    }

    await saveCompletion(
      [
        topic.id
      ],
      !progress.completed
    );
  }


  async function toggleGroup(
    topic: TopicRow
  ) {
    const ids =
      getLeafIds(
        topic.id
      );

    if (
      ids.length === 0
    ) {
      return;
    }

    const allRead =
      ids.every(
        id =>
          getProgressState(
            id
          ).completed
      );

    if (allRead) {
      const hasRevision =
        ids.some(
          id =>
            getProgressState(
              id
            ).revisionCount >
            0
        );

      if (hasRevision) {
        const confirmed =
          window.confirm(
            'Marking this chapter as unread will clear revision history for its topics. Continue?'
          );

        if (!confirmed) {
          return;
        }
      }
    }

    await saveCompletion(
      ids,
      !allRead
    );
  }


  function openBook(
    bookId: string
  ) {
    setActiveView(
      'books'
    );

    setOpenBookId(
      bookId
    );
  }


  function renderRevisionItem(
    item: RevisionItem,
    compact = false
  ) {
    const saving =
      savingIds.has(
        item.topic.id
      );

    return (
      <article
        key={
          `${item.topic.id}-${item.due.timestamp}`
        }
        style={{
          border:
            item.due.overdue
              ? '1px solid rgba(248,113,113,.32)'
              : item.due.dueToday
              ? '1px solid rgba(251,191,36,.32)'
              : '1px solid rgba(255,255,255,.08)',

          borderRadius:
            '14px',

          padding:
            compact
              ? '12px'
              : '14px',

          background:
            'rgba(255,255,255,.025)',

          display:
            'flex',

          gap:
            '12px',

          alignItems:
            'center',

          justifyContent:
            'space-between',

          flexWrap:
            'wrap'
        }}
      >
        <div
          style={{
            minWidth: 0,
            flex: '1 1 210px'
          }}
        >
          <small
            style={{
              display: 'block',
              color: '#94a3b8',
              marginBottom: '4px'
            }}
          >
            {item.book.title}
          </small>

          <strong>
            {item.topic.topic_name}
          </strong>

          <small
            style={{
              display: 'block',
              marginTop: '5px',
              color:
                item.due.overdue
                  ? '#fca5a5'
                  : item.due.dueToday
                  ? '#fde68a'
                  : '#5eead4'
            }}
          >
            {item.due.nextLabel}
            {' • '}
            {item.due.statusLabel}
            {' • '}
            {item.due.dateLabel}
          </small>
        </div>

        <button
          type="button"
          className="secondary-btn"
          disabled={saving}
          onClick={() =>
            void saveRevision(
              item.topic.id,
              item.progress
                .revisionCount +
                1
            )
          }
          style={{
            margin: 0
          }}
        >
          {
            saving
              ? 'Saving...'
              : 'Mark Revised'
          }
        </button>
      </article>
    );
  }


  function renderTopic(
    topic: TopicRow,
    depth = 0
  ): ReactNode {
    const children =
      childrenMap.get(
        topic.id
      ) ||
      [];

    const isLeaf =
      children.length === 0;

    const book =
      books.find(
        item =>
          item.id ===
          topic.book_id
      );

    if (isLeaf) {
      const progress =
        getProgressState(
          topic.id
        );

      const due =
        buildDueInfo(
          progress
            .nextRevisionDueAt,
          progress
            .revisionCount
        );

      const saving =
        savingIds.has(
          topic.id
        );

      const noteSubject =
        topic.subject
          .trim() ||
        book?.subject ||
        null;

      const noteTags =
        [
          book?.title || '',
          noteSubject || '',
          topic.topic_name,
          'Book Note'
        ].filter(
          value =>
            value.length >
            0
        );

      const noteExamStage:
        | 'general'
        | 'prelims'
        | 'mains'
        | 'both' =
          book?.exam_stage ||
          'general';

      return (
        <div
          key={
            topic.id
          }
          style={{
            marginLeft:
              depth > 0
                ? '12px'
                : 0,

            marginTop:
              '8px',

            padding:
              '11px 12px',

            border:
              due?.overdue
                ? '1px solid rgba(248,113,113,.26)'
                : '1px solid rgba(255,255,255,.07)',

            borderRadius:
              '12px',

            background:
              '#0e1525'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <input
              type="checkbox"
              checked={
                progress.completed
              }
              disabled={
                !signedIn ||
                saving
              }
              onChange={() =>
                void toggleLeaf(
                  topic
                )
              }
              aria-label={
                `Mark ${topic.topic_name} as read`
              }
              style={{
                width: '18px',
                height: '18px',
                flex: '0 0 auto',
                accentColor:
                  '#14b8a6'
              }}
            />

            <div
              style={{
                minWidth: 0,
                flex: 1
              }}
            >
              <strong
                style={{
                  display: 'block'
                }}
              >
                {topic.topic_name}
              </strong>

              {progress.completed && (
                <small
                  style={{
                    display: 'block',
                    marginTop: '4px',
                    color:
                      due?.overdue
                        ? '#fca5a5'
                        : due?.dueToday
                        ? '#fde68a'
                        : '#94a3b8'
                  }}
                >
                  {
                    progress.revisionCount >= 3
                      ? 'Fully revised'
                      : due
                      ? `${due.statusLabel} • ${due.nextLabel}`
                      : `Revision ${progress.revisionCount}/3`
                  }
                </small>
              )}
            </div>

            {progress.completed &&
              progress.revisionCount <
                3 && (
              <button
                type="button"
                className="text-btn"
                disabled={saving}
                onClick={() =>
                  void saveRevision(
                    topic.id,
                    progress
                      .revisionCount +
                      1
                  )
                }
                style={{
                  flex: '0 0 auto'
                }}
              >
                {
                  due?.overdue ||
                  due?.dueToday
                    ? 'Revise now'
                    : 'Revise'
                }
              </button>
            )}
          </div>

          <details
            style={{
              marginTop: '8px'
            }}
          >
            <summary
              style={{
                cursor: 'pointer',
                color: '#5eead4',
                fontSize: '.78rem',
                fontWeight: 750
              }}
            >
              Details
            </summary>

            <div
              style={{
                marginTop: '10px',
                paddingTop: '10px',
                borderTop:
                  '1px solid rgba(255,255,255,.07)'
              }}
            >
              <small
                style={{
                  display: 'block',
                  color: '#94a3b8'
                }}
              >
                {
                  progress.completed
                    ? `Read • Revision ${progress.revisionCount}/3`
                    : 'Not read yet'
                }
              </small>

              {progress.completed &&
                progress.revisionCount <
                  3 &&
                due && (
                <small
                  style={{
                    display: 'block',
                    marginTop: '5px',
                    color: '#cbd5e1'
                  }}
                >
                  Next:
                  {' '}
                  {due.nextLabel}
                  {' • '}
                  {due.dateLabel}
                </small>
              )}

              {
                latestRevisionDate(
                  progress
                ) && (
                <small
                  style={{
                    display: 'block',
                    marginTop: '5px',
                    color: '#94a3b8'
                  }}
                >
                  Latest revision:
                  {' '}
                  {
                    latestRevisionDate(
                      progress
                    )
                  }
                </small>
              )}

              {progress.completed &&
                progress.revisionCount >
                  0 && (
                <button
                  type="button"
                  className="text-btn"
                  disabled={saving}
                  onClick={() =>
                    void saveRevision(
                      topic.id,
                      progress
                        .revisionCount -
                        1
                    )
                  }
                  style={{
                    marginTop: '7px'
                  }}
                >
                  Undo latest revision
                </button>
              )}

              {signedIn && (
                <div
                  style={{
                    marginTop: '12px'
                  }}
                >
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
            </div>
          </details>
        </div>
      );
    }

    const leafIds =
      getLeafIds(
        topic.id
      );

    const readCount =
      getReadCount(
        leafIds
      );

    const readPercent =
      getPercent(
        readCount,
        leafIds.length
      );

    const allRead =
      leafIds.length > 0 &&
      readCount ===
        leafIds.length;

    const saving =
      isSaving(
        leafIds
      );

    return (
      <details
        key={
          topic.id
        }
        style={{
          marginTop:
            depth > 0
              ? '8px'
              : '10px',

          marginLeft:
            depth > 0
              ? '10px'
              : 0,

          padding:
            '11px 12px',

          border:
            '1px solid rgba(255,255,255,.08)',

          borderRadius:
            '12px',

          background:
            depth > 0
              ? '#0e1525'
              : 'rgba(255,255,255,.025)'
        }}
      >
        <summary
          style={{
            cursor: 'pointer',
            listStylePosition:
              'outside'
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              width:
                'calc(100% - 18px)',
              justifyContent:
                'space-between',
              gap: '10px',
              verticalAlign: 'middle'
            }}
          >
            <strong>
              {topic.topic_name}
            </strong>

            <small
              style={{
                color: '#94a3b8',
                flex: '0 0 auto'
              }}
            >
              {readCount}/{leafIds.length}
              {' • '}
              {readPercent}%
            </small>
          </span>
        </summary>

        <div
          style={{
            marginTop: '10px'
          }}
        >
          {signedIn && (
            <button
              type="button"
              className="text-btn"
              disabled={saving}
              onClick={() =>
                void toggleGroup(
                  topic
                )
              }
            >
              {
                saving
                  ? 'Saving...'
                  : allRead
                  ? 'Mark chapter unread'
                  : 'Mark chapter read'
              }
            </button>
          )}

          <div
            style={{
              marginTop: '4px'
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
        </div>
      </details>
    );
  }


  function renderBookCard(
    book: BookRow,
    completed = false
  ) {
    const stats =
      getBookStats(
        book.id
      );

    const expanded =
      openBookId ===
      book.id;

    const source =
      book.author ||
      book.publisher ||
      book.source_name ||
      '';

    const roots =
      rootTopicsByBook.get(
        book.id
      ) ||
      [];

    const bookDue =
      revisionItems.filter(
        item =>
          item.book.id ===
          book.id
      );

    const urgent =
      bookDue.filter(
        item =>
          item.due.overdue ||
          item.due.dueToday
      ).length;

    const completionDates =
      stats.ids
        .map(
          id =>
            getProgressState(
              id
            ).finalRevisionAt
        )
        .filter(
          (
            value
          ): value is string =>
            Boolean(value)
        )
        .map(
          value =>
            new Date(value)
        )
        .filter(
          date =>
            !Number.isNaN(
              date.getTime()
            )
        )
        .sort(
          (
            first,
            second
          ) =>
            second.getTime() -
            first.getTime()
        );

    return (
      <article
        key={
          book.id
        }
        style={{
          border:
            urgent > 0
              ? '1px solid rgba(251,191,36,.28)'
              : '1px solid rgba(255,255,255,.08)',

          borderRadius:
            '16px',

          padding:
            '15px',

          background:
            'rgba(255,255,255,.025)'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent:
              'space-between',
            gap: '14px',
            alignItems:
              'flex-start',
            flexWrap: 'wrap'
          }}
        >
          <div
            style={{
              minWidth: 0,
              flex: '1 1 220px'
            }}
          >
            <small
              style={{
                display: 'block',
                color: '#5eead4',
                fontWeight: 800
              }}
            >
              {book.subject}
            </small>

            <h3
              style={{
                margin:
                  '6px 0 4px'
              }}
            >
              {book.title}
            </h3>

            {source && (
              <small
                style={{
                  color: '#94a3b8'
                }}
              >
                {source}
              </small>
            )}
          </div>

          <div
            style={{
              textAlign: 'right'
            }}
          >
            <strong
              style={{
                display: 'block',
                fontSize: '1.15rem'
              }}
            >
              {
                signedIn
                  ? `${stats.readPercent}%`
                  : '—'
              }
            </strong>

            <small
              style={{
                color: '#94a3b8'
              }}
            >
              {
                completed
                  ? 'Complete'
                  : `${stats.read}/${stats.total} topics`
              }
            </small>
          </div>
        </div>

        {signedIn &&
          stats.total > 0 && (
          <div
            className="progress-track"
            style={{
              marginTop: '12px'
            }}
          >
            <span
              style={{
                width:
                  `${stats.readPercent}%`
              }}
            />
          </div>
        )}

        {!completed &&
          urgent > 0 && (
          <small
            style={{
              display: 'block',
              marginTop: '9px',
              color: '#fde68a'
            }}
          >
            {urgent}
            {' '}
            revision{
              urgent === 1
                ? ''
                : 's'
            }
            {' '}
            need attention
          </small>
        )}

        {completed &&
          completionDates[0] && (
          <small
            style={{
              display: 'block',
              marginTop: '9px',
              color: '#94a3b8'
            }}
          >
            Completed
            {' '}
            {
              completionDates[0]
                .toLocaleDateString(
                  'en-IN',
                  {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  }
                )
            }
          </small>
        )}

        <button
          type="button"
          className={
            expanded
              ? 'primary-btn'
              : 'secondary-btn'
          }
          onClick={() =>
            setOpenBookId(
              expanded
                ? null
                : book.id
            )
          }
          style={{
            marginTop: '12px'
          }}
        >
          {
            expanded
              ? 'Close'
              : completed
              ? 'View history'
              : stats.read > 0
              ? 'Continue'
              : 'Open Book'
          }
        </button>

        {expanded && (
          <div
            style={{
              marginTop: '14px',
              paddingTop: '14px',
              borderTop:
                '1px solid rgba(255,255,255,.08)'
            }}
          >
            {book.description && (
              <p
                style={{
                  marginTop: 0
                }}
              >
                {book.description}
              </p>
            )}

            {book.external_url && (
              <a
                href={
                  book.external_url
                }
                target="_blank"
                rel="noreferrer"
                style={{
                  color: '#5eead4',
                  fontSize: '.82rem'
                }}
              >
                Open book source
              </a>
            )}

            {roots.length === 0 ? (
              <div
                className="callout"
                style={{
                  marginTop: '12px'
                }}
              >
                No topics have been added
                to this book yet.
              </div>
            ) : (
              <div
                style={{
                  marginTop: '10px'
                }}
              >
                {roots.map(
                  topic =>
                    renderTopic(
                      topic
                    )
                )}
              </div>
            )}
          </div>
        )}
      </article>
    );
  }


  function renderToday() {
    const continueStats =
      continueBook
        ? getBookStats(
            continueBook.id
          )
        : null;

    const urgentItems =
      [
        ...overdueItems,
        ...todayItems
      ].slice(
        0,
        3
      );

    return (
      <>
        <section
          className="panel"
          style={{
            marginTop: '16px'
          }}
        >
          <span
            className="eyebrow"
          >
            CONTINUE READING
          </span>

          {continueBook &&
          continueStats ? (
            <>
              <h2
                style={{
                  marginBottom:
                    '6px'
                }}
              >
                {continueBook.title}
              </h2>

              <p
                style={{
                  marginTop: 0
                }}
              >
                {continueBook.subject}
                {' • '}
                {
                  continueStats.read
                }
                /
                {
                  continueStats.total
                }
                {' '}
                topics read
              </p>

              <div
                className="progress-track"
                style={{
                  marginTop: '12px'
                }}
              >
                <span
                  style={{
                    width:
                      `${continueStats.readPercent}%`
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  marginTop: '12px',
                  flexWrap: 'wrap'
                }}
              >
                <strong>
                  {
                    continueStats
                      .readPercent
                  }
                  % complete
                </strong>

                <button
                  type="button"
                  className="primary-btn"
                  onClick={() =>
                    openBook(
                      continueBook.id
                    )
                  }
                  style={{
                    margin: 0
                  }}
                >
                  Continue
                </button>
              </div>
            </>
          ) : (
            <>
              <h3>
                Reading is up to date
              </h3>

              <p>
                No unfinished reading is
                waiting right now. Check
                your revisions or open My
                Books.
              </p>
            </>
          )}
        </section>

        <section
          className="panel"
          style={{
            marginTop: '16px'
          }}
        >
          <div
            className="panel-head"
          >
            <div>
              <span
                className="eyebrow"
              >
                REVISION DUE
              </span>

              <h3>
                What needs attention
              </h3>
            </div>

            <button
              type="button"
              className="text-btn"
              onClick={() =>
                setActiveView(
                  'revisions'
                )
              }
            >
              View all
            </button>
          </div>

          {urgentItems.length ===
          0 ? (
            <p>
              Nothing is overdue or due
              today.
            </p>
          ) : (
            <div
              style={{
                display: 'grid',
                gap: '9px',
                marginTop: '10px'
              }}
            >
              {urgentItems.map(
                item =>
                  renderRevisionItem(
                    item,
                    true
                  )
              )}
            </div>
          )}

          {urgentItems.length >
            0 && (
            <small
              style={{
                display: 'block',
                marginTop: '10px',
                color: '#94a3b8'
              }}
            >
              {dueNowCount}
              {' '}
              topic{
                dueNowCount === 1
                  ? ''
                  : 's'
              }
              {' '}
              need attention today.
            </small>
          )}
        </section>

        <section
          className="panel"
          style={{
            marginTop: '16px'
          }}
        >
          <span
            className="eyebrow"
          >
            MY BOOKS
          </span>

          <h3>
            Keep the library simple
          </h3>

          <p>
            {
              activeBooks.length
            }
            {' '}
            active book{
              activeBooks.length === 1
                ? ''
                : 's'
            }
            {' • '}
            {
              completedBooks.length
            }
            {' '}
            completed
          </p>

          <button
            type="button"
            className="secondary-btn"
            onClick={() =>
              setActiveView(
                'books'
              )
            }
          >
            View My Books
          </button>
        </section>
      </>
    );
  }


  function renderBooks() {
    return (
      <>
        <details
          className="panel"
          style={{
            marginTop: '16px'
          }}
        >
          <summary
            style={{
              cursor: 'pointer',
              fontWeight: 800
            }}
          >
            Filter books
          </summary>

          <div
            className="study-resource-filter-grid"
            style={{
              marginTop: '14px'
            }}
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
                <option
                  value="all"
                >
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
                placeholder="Book or topic..."
              />
            </label>
          </div>

          <button
            type="button"
            className="text-btn"
            onClick={() => {
              setSearch('');
              setSubjectFilter(
                'all'
              );
            }}
            style={{
              marginTop: '8px'
            }}
          >
            Clear filters
          </button>
        </details>

        <section
          className="panel"
          style={{
            marginTop: '16px'
          }}
        >
          <div
            className="panel-head"
          >
            <div>
              <span
                className="eyebrow"
              >
                MY BOOKS
              </span>

              <h2>
                Active reading
              </h2>
            </div>

            <small
              style={{
                color: '#94a3b8'
              }}
            >
              {
                visibleActiveBooks
                  .length
              }
              {' '}
              book{
                visibleActiveBooks
                  .length === 1
                  ? ''
                  : 's'
              }
            </small>
          </div>

          {visibleActiveBooks.length ===
          0 ? (
            <p>
              No active books match this
              filter.
            </p>
          ) : (
            <div
              style={{
                display: 'grid',
                gap: '12px',
                marginTop: '12px'
              }}
            >
              {visibleActiveBooks.map(
                book =>
                  renderBookCard(
                    book
                  )
              )}
            </div>
          )}
        </section>
      </>
    );
  }


  function renderRevisions() {
    function section(
      title: string,
      items: RevisionItem[]
    ) {
      return (
        <section
          className="panel"
          style={{
            marginTop: '16px'
          }}
        >
          <div
            className="panel-head"
          >
            <div>
              <h3>
                {title}
              </h3>
            </div>

            <span
              className="tag"
            >
              {items.length}
            </span>
          </div>

          {items.length === 0 ? (
            <p>
              Nothing here.
            </p>
          ) : (
            <div
              style={{
                display: 'grid',
                gap: '9px',
                marginTop: '10px'
              }}
            >
              {items
                .slice(
                  0,
                  title ===
                    'Upcoming'
                    ? 10
                    : items.length
                )
                .map(
                  item =>
                    renderRevisionItem(
                      item
                    )
                )}

              {title ===
                'Upcoming' &&
                items.length >
                  10 && (
                <details>
                  <summary
                    style={{
                      cursor:
                        'pointer',
                      color:
                        '#5eead4',
                      fontWeight:
                        750,
                      padding:
                        '8px 0'
                    }}
                  >
                    Show
                    {' '}
                    {
                      items.length -
                      10
                    }
                    {' '}
                    more
                  </summary>

                  <div
                    style={{
                      display:
                        'grid',
                      gap: '9px',
                      marginTop:
                        '8px'
                    }}
                  >
                    {items
                      .slice(10)
                      .map(
                        item =>
                          renderRevisionItem(
                            item
                          )
                      )}
                  </div>
                </details>
              )}
            </div>
          )}
        </section>
      );
    }

    return (
      <>
        {section(
          'Overdue',
          overdueItems
        )}

        {section(
          'Today',
          todayItems
        )}

        {section(
          'Upcoming',
          upcomingItems
        )}
      </>
    );
  }


  function renderCompleted() {
    return (
      <section
        className="panel"
        style={{
          marginTop: '16px'
        }}
      >
        <div
          className="panel-head"
        >
          <div>
            <span
              className="eyebrow"
            >
              COMPLETED
            </span>

            <h2>
              Finished books
            </h2>
          </div>

          <span
            className="tag"
          >
            {
              completedBooks.length
            }
          </span>
        </div>

        {completedBooks.length ===
        0 ? (
          <p>
            Books will move here after
            every topic is read and the
            final revision is completed.
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gap: '12px',
              marginTop: '12px'
            }}
          >
            {completedBooks.map(
              book =>
                renderBookCard(
                  book,
                  true
                )
            )}
          </div>
        )}
      </section>
    );
  }


  return (
    <div
      className="study-resources-page"
    >
      <section
        className="panel"
      >
        <span
          className="eyebrow"
        >
          BOOK PROGRESS
        </span>

        <h2>
          What should I study next?
        </h2>

        <p>
          A simpler workspace for reading,
          revision and completed books.
        </p>

        {signedIn &&
          allLeafIds.length >
            0 && (
          <small
            style={{
              display: 'block',
              color: '#94a3b8',
              marginTop: '8px'
            }}
          >
            {overallReadCount}
            /
            {allLeafIds.length}
            {' '}
            topics read
            {' • '}
            {overallReadPercent}%
            {' • '}
            {dueNowCount}
            {' '}
            due now
            {' • '}
            {completedBooks.length}
            {' '}
            books completed
          </small>
        )}

        {!signedIn &&
          !loading && (
          <div
            className="callout"
            style={{
              marginTop: '14px'
            }}
          >
            Sign in from Me to save
            reading and revision progress.
          </div>
        )}

        {message && (
          <div
            className="callout"
            style={{
              marginTop: '14px'
            }}
          >
            {message}
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '8px',
            marginTop: '16px'
          }}
        >
          {(
            [
              [
                'today',
                'Today'
              ],
              [
                'books',
                'My Books'
              ],
              [
                'revisions',
                'Revisions'
              ],
              [
                'completed',
                'Completed'
              ]
            ] as Array<
              [
                TrackerView,
                string
              ]
            >
          ).map(
            (
              [
                key,
                label
              ]
            ) => (
              <button
                key={key}
                type="button"
                className={
                  activeView ===
                    key
                    ? 'filter active'
                    : 'filter'
                }
                onClick={() =>
                  setActiveView(
                    key
                  )
                }
                style={{
                  width: '100%',
                  minWidth: 0,
                  whiteSpace: 'normal',
                  textAlign: 'center'
                }}
              >
                {label}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          className="text-btn"
          onClick={() =>
            void loadTracker()
          }
          style={{
            marginTop: '10px'
          }}
        >
          Refresh
        </button>
      </section>

      {loading && (
        <section
          className="panel"
          style={{
            marginTop: '16px'
          }}
        >
          Loading book progress...
        </section>
      )}

      {!loading &&
        books.length ===
          0 && (
        <section
          className="panel"
          style={{
            marginTop: '16px'
          }}
        >
          <h3>
            No published books yet
          </h3>

          <p>
            Add Standard Book resources
            from Admin Studio and create
            their topics in Book Structure.
          </p>
        </section>
      )}

      {!loading &&
        books.length >
          0 &&
        activeView ===
          'today' &&
        renderToday()}

      {!loading &&
        books.length >
          0 &&
        activeView ===
          'books' &&
        renderBooks()}

      {!loading &&
        books.length >
          0 &&
        activeView ===
          'revisions' &&
        renderRevisions()}

      {!loading &&
        books.length >
          0 &&
        activeView ===
          'completed' &&
        renderCompleted()}
    </div>
  );
}

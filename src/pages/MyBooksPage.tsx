import {
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import type {
  FormEvent,
  ReactNode
} from 'react';

import {
  TopBar
} from '../components/TopBar';

import {
  PersonalBookBulkImporter
} from '../components/PersonalBookBulkImporter';

import {
  TopicProgressControls
} from '../components/TopicProgressControls';

import {
  TopicNotesEditor
} from '../components/TopicNotesEditor';

import {
  PersonalTopicRevisionControls
} from '../components/PersonalTopicRevisionControls';

import {
  BookTopicToolbar
} from '../components/BookTopicToolbar';

import type {
  ProgressFilter
} from '../components/BookTopicToolbar';

import {
  supabase
} from '../lib/supabase';


type ExamStage =
  | 'prelims'
  | 'mains'
  | 'both';


type ReadingStatus =
  | 'planned'
  | 'reading'
  | 'paused'
  | 'completed';


type TopicType =
  | 'part'
  | 'chapter'
  | 'topic'
  | 'subtopic'
  | 'custom';


type PersonalBook = {
  id: string;
  title: string;
  author: string | null;
  subject: string;
  edition: string | null;
  exam_stage: ExamStage;
  total_pages: number | null;
  current_page: number;
  reading_status: ReadingStatus;
  is_current: boolean;
  notes: string | null;
  sort_order: number;
};


type PersonalTopic = {
  id: string;
  user_id: string;
  book_id: string;
  parent_id: string | null;
  topic_name: string;
  topic_type: TopicType;

  progress_percent: number;

  is_current: boolean;

  page_start: number | null;
  page_end: number | null;

  notes: string | null;

  sort_order: number;

  completed_at: string | null;

  revision_count: number;

  revision_1_at: string | null;
  revision_2_at: string | null;
  final_revision_at: string | null;

  next_revision_due_at: string | null;
};


const BOOK_SELECT = `
  id,
  title,
  author,
  subject,
  edition,
  exam_stage,
  total_pages,
  current_page,
  reading_status,
  is_current,
  notes,
  sort_order
`;


const TOPIC_SELECT = `
  id,
  user_id,
  book_id,
  parent_id,
  topic_name,
  topic_type,
  progress_percent,
  is_current,
  page_start,
  page_end,
  notes,
  sort_order,
  completed_at,
  revision_count,
  revision_1_at,
  revision_2_at,
  final_revision_at,
  next_revision_due_at
`;


/* =========================================================
   HELPERS
========================================================= */

function safeNumber(
  value: unknown,
  fallback = 0
) {

  const number =
    Number(value);


  return Number.isFinite(
    number
  )
    ? number
    : fallback;
}


function clampPercent(
  value: number
) {

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


function cleanRevisionCount(
  value: unknown
) {

  return Math.min(
    3,
    Math.max(
      0,
      Math.round(
        safeNumber(
          value
        )
      )
    )
  );
}


function textOrNull(
  value: unknown
) {

  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {

    return null;
  }


  return String(
    value
  );
}


function statusLabel(
  status: ReadingStatus
) {

  switch (
    status
  ) {

    case 'reading':
      return 'Reading';


    case 'paused':
      return 'Paused';


    case 'completed':
      return 'Completed';


    default:
      return 'Planned';
  }
}


function normaliseBook(
  item: any
): PersonalBook {

  return {

    id:
      String(
        item.id
      ),

    title:
      String(
        item.title ||
        ''
      ),

    author:
      textOrNull(
        item.author
      ),

    subject:
      String(
        item.subject ||
        'General'
      ),

    edition:
      textOrNull(
        item.edition
      ),

    exam_stage:
      (
        item.exam_stage ||
        'both'
      ) as ExamStage,

    total_pages:
      item.total_pages ===
        null ||
      item.total_pages ===
        undefined
        ? null
        : safeNumber(
            item.total_pages
          ),

    current_page:
      safeNumber(
        item.current_page
      ),

    reading_status:
      (
        item.reading_status ||
        'planned'
      ) as ReadingStatus,

    is_current:
      item.is_current ===
      true,

    notes:
      textOrNull(
        item.notes
      ),

    sort_order:
      safeNumber(
        item.sort_order
      )

  };
}


function normaliseTopic(
  item: any
): PersonalTopic {

  return {

    id:
      String(
        item.id
      ),

    user_id:
      String(
        item.user_id
      ),

    book_id:
      String(
        item.book_id
      ),

    parent_id:
      textOrNull(
        item.parent_id
      ),

    topic_name:
      String(
        item.topic_name ||
        ''
      ),

    topic_type:
      (
        item.topic_type ||
        'topic'
      ) as TopicType,

    progress_percent:
      clampPercent(
        safeNumber(
          item.progress_percent
        )
      ),

    is_current:
      item.is_current ===
      true,

    page_start:
      item.page_start ===
        null ||
      item.page_start ===
        undefined
        ? null
        : safeNumber(
            item.page_start
          ),

    page_end:
      item.page_end ===
        null ||
      item.page_end ===
        undefined
        ? null
        : safeNumber(
            item.page_end
          ),

    notes:
      textOrNull(
        item.notes
      ),

    sort_order:
      safeNumber(
        item.sort_order
      ),

    completed_at:
      textOrNull(
        item.completed_at
      ),

    revision_count:
      cleanRevisionCount(
        item.revision_count
      ),

    revision_1_at:
      textOrNull(
        item.revision_1_at
      ),

    revision_2_at:
      textOrNull(
        item.revision_2_at
      ),

    final_revision_at:
      textOrNull(
        item.final_revision_at
      ),

    next_revision_due_at:
      textOrNull(
        item.next_revision_due_at
      )

  };
}


function revisionIsDueNow(
  topic:
    PersonalTopic
) {

  if (
    topic.progress_percent <
      100 ||
    topic.revision_count >=
      3 ||
    !topic.next_revision_due_at
  ) {

    return false;
  }


  const due =
    new Date(
      topic.next_revision_due_at
    );


  if (
    Number.isNaN(
      due.getTime()
    )
  ) {

    return false;
  }


  const endOfToday =
    new Date();


  endOfToday.setHours(
    23,
    59,
    59,
    999
  );


  return (
    due.getTime() <=
    endOfToday.getTime()
  );
}


/* =========================================================
   PAGE
========================================================= */

export function MyBooksPage() {

  const [
    books,
    setBooks
  ] =
    useState<
      PersonalBook[]
    >(
      []
    );


  const [
    topics,
    setTopics
  ] =
    useState<
      PersonalTopic[]
    >(
      []
    );


  const [
    selectedBookId,
    setSelectedBookId
  ] =
    useState<
      string |
      null
    >(
      null
    );


  const [
    loading,
    setLoading
  ] =
    useState(
      true
    );


  const [
    saving,
    setSaving
  ] =
    useState(
      false
    );


  const [
    message,
    setMessage
  ] =
    useState(
      ''
    );


  const [
    revisionSavingIds,
    setRevisionSavingIds
  ] =
    useState<
      Set<string>
    >(
      () =>
        new Set<
          string
        >()
    );


  /* =======================================================
     ADD BOOK FORM
  ======================================================= */

  const [
    showBookForm,
    setShowBookForm
  ] =
    useState(
      false
    );


  const [
    bookTitle,
    setBookTitle
  ] =
    useState(
      ''
    );


  const [
    bookAuthor,
    setBookAuthor
  ] =
    useState(
      ''
    );


  const [
    bookSubject,
    setBookSubject
  ] =
    useState(
      'World History'
    );


  const [
    bookEdition,
    setBookEdition
  ] =
    useState(
      ''
    );


  const [
    bookExamStage,
    setBookExamStage
  ] =
    useState<
      ExamStage
    >(
      'both'
    );


  const [
    bookTotalPages,
    setBookTotalPages
  ] =
    useState(
      ''
    );


  /* =======================================================
     TOPIC FORM
  ======================================================= */

  const [
    showTopicForm,
    setShowTopicForm
  ] =
    useState(
      false
    );


  const [
    topicName,
    setTopicName
  ] =
    useState(
      ''
    );


  const [
    topicType,
    setTopicType
  ] =
    useState<
      TopicType
    >(
      'chapter'
    );


  const [
    parentId,
    setParentId
  ] =
    useState(
      ''
    );


  const [
    pageStart,
    setPageStart
  ] =
    useState(
      ''
    );


  const [
    pageEnd,
    setPageEnd
  ] =
    useState(
      ''
    );


  /* =======================================================
     FAST IMPORT
  ======================================================= */

  const [
    showBulkImporter,
    setShowBulkImporter
  ] =
    useState(
      false
    );


  /* =======================================================
     SEARCH / FILTER
  ======================================================= */

  const [
    topicSearch,
    setTopicSearch
  ] =
    useState(
      ''
    );


  const [
    topicFilter,
    setTopicFilter
  ] =
    useState<
      ProgressFilter
    >(
      'all'
    );


  const [
    expandedTopicIds,
    setExpandedTopicIds
  ] =
    useState<
      Set<string>
    >(
      () =>
        new Set<
          string
        >()
    );


  const lastFocusedTopicRef =
    useRef<
      string |
      null
    >(
      null
    );


  function setRevisionSaving(
    topicId:
      string,

    value:
      boolean
  ) {

    setRevisionSavingIds(
      current => {

        const next =
          new Set(
            current
          );


        if (
          value
        ) {

          next.add(
            topicId
          );

        } else {

          next.delete(
            topicId
          );
        }


        return next;
      }
    );
  }


  /* =======================================================
     LOAD LIBRARY
  ======================================================= */

  async function loadLibrary(
    preferredBookId?:
      string |
      null
  ) {

    const client =
      supabase;


    if (
      !client
    ) {

      setMessage(
        'Study database is not configured.'
      );

      setLoading(
        false
      );

      return;
    }


    setLoading(
      true
    );


    const {
      data: {
        user
      }
    } =
      await client.auth
        .getUser();


    if (
      !user
    ) {

      setMessage(
        'Sign in to use My Books.'
      );

      setLoading(
        false
      );

      return;
    }


    const [
      bookResult,
      topicResult
    ] =
      await Promise.all([

        client
          .from(
            'personal_books'
          )
          .select(
            BOOK_SELECT
          )
          .eq(
            'user_id',
            user.id
          )
          .order(
            'sort_order',
            {
              ascending:
                true
            }
          )
          .order(
            'created_at',
            {
              ascending:
                true
            }
          ),

        client
          .from(
            'personal_book_topics'
          )
          .select(
            TOPIC_SELECT
          )
          .eq(
            'user_id',
            user.id
          )
          .order(
            'sort_order',
            {
              ascending:
                true
            }
          )
          .order(
            'created_at',
            {
              ascending:
                true
            }
          )

      ]);


    if (
      bookResult.error
    ) {

      setMessage(
        bookResult
          .error
          .message
      );

      setLoading(
        false
      );

      return;
    }


    if (
      topicResult.error
    ) {

      setMessage(
        topicResult
          .error
          .message
      );

      setLoading(
        false
      );

      return;
    }


    const cleanBooks =
      (
        bookResult.data ||
        []
      ).map(
        normaliseBook
      );


    const cleanTopics =
      (
        topicResult.data ||
        []
      ).map(
        normaliseTopic
      );


    setBooks(
      cleanBooks
    );


    setTopics(
      cleanTopics
    );


    setSelectedBookId(
      current => {

        if (
          preferredBookId &&
          cleanBooks.some(
            book =>
              book.id ===
              preferredBookId
          )
        ) {

          return preferredBookId;
        }


        if (
          current &&
          cleanBooks.some(
            book =>
              book.id ===
              current
          )
        ) {

          return current;
        }


        const currentBook =
          cleanBooks.find(
            book =>
              book.is_current
          );


        return (
          currentBook?.id ||
          cleanBooks[0]?.id ||
          null
        );
      }
    );


    setLoading(
      false
    );
  }


  useEffect(
    () => {

      void loadLibrary();

    },
    []
  );


  useEffect(
    () => {

      setTopicSearch(
        ''
      );

      setTopicFilter(
        'all'
      );

      setExpandedTopicIds(
        new Set<
          string
        >()
      );

      lastFocusedTopicRef.current =
        null;

    },
    [
      selectedBookId
    ]
  );


  /* =======================================================
     SELECTED BOOK
  ======================================================= */

  const selectedBook =
    useMemo(
      () =>
        books.find(
          book =>
            book.id ===
            selectedBookId
        ) ||
        null,
      [
        books,
        selectedBookId
      ]
    );


  const selectedBookTopics =
    useMemo(
      () => {

        if (
          !selectedBookId
        ) {

          return [];
        }


        return topics
          .filter(
            topic =>
              topic.book_id ===
              selectedBookId
          )
          .sort(
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

      },
      [
        topics,
        selectedBookId
      ]
    );


  /* =======================================================
     TOPIC MAPS
  ======================================================= */

  const topicMap =
    useMemo(
      () => {

        const map =
          new Map<
            string,
            PersonalTopic
          >();


        selectedBookTopics.forEach(
          topic =>
            map.set(
              topic.id,
              topic
            )
        );


        return map;

      },
      [
        selectedBookTopics
      ]
    );


  const childrenMap =
    useMemo(
      () => {

        const map =
          new Map<
            string,
            PersonalTopic[]
          >();


        selectedBookTopics.forEach(
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
        selectedBookTopics
      ]
    );


  function getChildren(
    topicId:
      string
  ) {

    return (
      childrenMap.get(
        topicId
      ) ||
      []
    );
  }


  function getLeafTopics(
    topic:
      PersonalTopic,

    visited =
      new Set<
        string
      >()
  ): PersonalTopic[] {

    if (
      visited.has(
        topic.id
      )
    ) {

      return [];
    }


    const nextVisited =
      new Set(
        visited
      );


    nextVisited.add(
      topic.id
    );


    const children =
      getChildren(
        topic.id
      );


    if (
      children.length ===
      0
    ) {

      return [
        topic
      ];
    }


    return children.flatMap(
      child =>
        getLeafTopics(
          child,
          nextVisited
        )
    );
  }


  function topicPath(
    topic:
      PersonalTopic
  ) {

    const parts:
      string[] = [
        topic.topic_name
      ];


    let currentParentId =
      topic.parent_id;


    const visited =
      new Set<
        string
      >();


    while (
      currentParentId &&
      !visited.has(
        currentParentId
      )
    ) {

      visited.add(
        currentParentId
      );


      const parent =
        topicMap.get(
          currentParentId
        );


      if (
        !parent
      ) {

        break;
      }


      parts.unshift(
        parent.topic_name
      );


      currentParentId =
        parent.parent_id;
    }


    return parts.join(
      ' → '
    );
  }


  function calculatedTopicProgress(
    topic:
      PersonalTopic
  ) {

    const leaves =
      getLeafTopics(
        topic
      );


    if (
      leaves.length ===
      0
    ) {

      return clampPercent(
        topic.progress_percent
      );
    }


    if (
      leaves.length ===
        1 &&
      leaves[0].id ===
        topic.id
    ) {

      return clampPercent(
        topic.progress_percent
      );
    }


    const total =
      leaves.reduce(
        (
          sum,
          leaf
        ) =>
          sum +
          leaf.progress_percent,
        0
      );


    return clampPercent(
      total /
      leaves.length
    );
  }


  const rootTopics =
    useMemo(
      () =>
        selectedBookTopics
          .filter(
            topic =>
              !topic.parent_id
          )
          .sort(
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
          ),
      [
        selectedBookTopics
      ]
    );


  const leafTopics =
    useMemo(
      () =>
        selectedBookTopics.filter(
          topic =>
            (
              childrenMap.get(
                topic.id
              ) ||
              []
            ).length ===
            0
        ),
      [
        selectedBookTopics,
        childrenMap
      ]
    );


  /* =======================================================
     BOOK STATS
  ======================================================= */

  const bookProgress =
    useMemo(
      () => {

        if (
          leafTopics.length >
          0
        ) {

          const total =
            leafTopics.reduce(
              (
                sum,
                topic
              ) =>
                sum +
                topic.progress_percent,
              0
            );


          return clampPercent(
            total /
            leafTopics.length
          );
        }


        if (
          selectedBook?.total_pages &&
          selectedBook.total_pages >
            0
        ) {

          return clampPercent(
            (
              selectedBook.current_page /
              selectedBook.total_pages
            ) *
            100
          );
        }


        return 0;

      },
      [
        leafTopics,
        selectedBook
      ]
    );


  const remainingPercent =
    100 -
    bookProgress;


  const completedLeafTopics =
    leafTopics.filter(
      topic =>
        topic.progress_percent >=
        100
    ).length;


  const readingLeafTopics =
    leafTopics.filter(
      topic =>
        topic.progress_percent >
          0 &&
        topic.progress_percent <
          100
    ).length;


  const notStartedLeafTopics =
    leafTopics.filter(
      topic =>
        topic.progress_percent <=
        0
    ).length;


  const fullyRevisedLeafTopics =
    leafTopics.filter(
      topic =>
        topic.progress_percent >=
          100 &&
        topic.revision_count >=
          3
    ).length;


  const dueRevisionTopics =
    leafTopics.filter(
      revisionIsDueNow
    ).length;


  const currentTopic =
    useMemo(
      () =>
        selectedBookTopics.find(
          topic =>
            topic.is_current
        ) ||
        null,
      [
        selectedBookTopics
      ]
    );


  /* =======================================================
     AUTO FOCUS CURRENT TOPIC
  ======================================================= */

  useEffect(
    () => {

      if (
        !currentTopic
      ) {

        return;
      }


      if (
        lastFocusedTopicRef
          .current ===
        currentTopic.id
      ) {

        return;
      }


      const ancestorIds =
        new Set<
          string
        >();


      const visited =
        new Set<
          string
        >();


      let currentParentId =
        currentTopic.parent_id;


      while (
        currentParentId &&
        !visited.has(
          currentParentId
        )
      ) {

        visited.add(
          currentParentId
        );


        ancestorIds.add(
          currentParentId
        );


        const parent =
          topicMap.get(
            currentParentId
          );


        if (
          !parent
        ) {

          break;
        }


        currentParentId =
          parent.parent_id;
      }


      setExpandedTopicIds(
        current => {

          const next =
            new Set(
              current
            );


          ancestorIds.forEach(
            id =>
              next.add(
                id
              )
          );


          return next;
        }
      );


      lastFocusedTopicRef.current =
        currentTopic.id;


      const timer =
        window.setTimeout(
          () => {

            document
              .getElementById(
                `personal-topic-${currentTopic.id}`
              )
              ?.scrollIntoView({

                behavior:
                  'smooth',

                block:
                  'center'

              });

          },
          300
        );


      return () =>
        window.clearTimeout(
          timer
        );

    },
    [
      currentTopic,
      topicMap
    ]
  );


  /* =======================================================
     SEARCH / FILTER
  ======================================================= */

  const normalizedSearch =
    topicSearch
      .trim()
      .toLowerCase();


  function matchesProgressFilter(
    topic:
      PersonalTopic
  ) {

    if (
      topicFilter ===
      'all'
    ) {

      return true;
    }


    if (
      topicFilter ===
      'not-started'
    ) {

      return (
        topic.progress_percent <=
        0
      );
    }


    if (
      topicFilter ===
      'completed'
    ) {

      return (
        topic.progress_percent >=
        100
      );
    }


    return (
      topic.progress_percent >
        0 &&
      topic.progress_percent <
        100
    );
  }


  function matchesSearch(
    topic:
      PersonalTopic
  ) {

    if (
      !normalizedSearch
    ) {

      return true;
    }


    return topicPath(
      topic
    )
      .toLowerCase()
      .includes(
        normalizedSearch
      );
  }


  const visibleLeafTopics =
    leafTopics.filter(
      topic =>
        matchesProgressFilter(
          topic
        ) &&
        matchesSearch(
          topic
        )
    );


  const visibleLeafIds =
    new Set(
      visibleLeafTopics.map(
        topic =>
          topic.id
      )
    );


  function topicHasVisibleContent(
    topic:
      PersonalTopic
  ) {

    return getLeafTopics(
      topic
    ).some(
      leaf =>
        visibleLeafIds.has(
          leaf.id
        )
    );
  }


  const visibleRootTopics =
    rootTopics.filter(
      topic =>
        topicHasVisibleContent(
          topic
        )
    );


  const isFiltering =
    Boolean(
      normalizedSearch
    ) ||
    topicFilter !==
      'all';


  function toggleExpanded(
    topicId:
      string
  ) {

    setExpandedTopicIds(
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


  function expandAllTopics() {

    const ids =
      selectedBookTopics
        .filter(
          topic =>
            getChildren(
              topic.id
            ).length >
            0
        )
        .map(
          topic =>
            topic.id
        );


    setExpandedTopicIds(
      new Set(
        ids
      )
    );
  }


  function collapseAllTopics() {

    setExpandedTopicIds(
      new Set<
        string
      >()
    );
  }


  /* =======================================================
     ADD BOOK
  ======================================================= */

  async function saveBook(
    event:
      FormEvent<
        HTMLFormElement
      >
  ) {

    event.preventDefault();


    const client =
      supabase;


    if (
      !client
    ) {

      setMessage(
        'Study database is not configured.'
      );

      return;
    }


    const cleanTitle =
      bookTitle.trim();


    if (
      !cleanTitle
    ) {

      setMessage(
        'Book title is required.'
      );

      return;
    }


    const {
      data: {
        user
      }
    } =
      await client.auth
        .getUser();


    if (
      !user
    ) {

      setMessage(
        'Sign in to add a book.'
      );

      return;
    }


    const totalPages =
      bookTotalPages.trim()
        ? Number(
            bookTotalPages
          )
        : null;


    if (
      totalPages !==
        null &&
      (
        !Number.isInteger(
          totalPages
        ) ||
        totalPages <=
          0
      )
    ) {

      setMessage(
        'Total pages must be a positive whole number.'
      );

      return;
    }


    setSaving(
      true
    );

    setMessage(
      ''
    );


    const nextSort =
      books.length ===
        0
        ? 10
        : Math.max(
            ...books.map(
              book =>
                book.sort_order
            )
          ) +
          10;


    const {
      data,
      error
    } =
      await client
        .from(
          'personal_books'
        )
        .insert({

          user_id:
            user.id,

          title:
            cleanTitle,

          author:
            bookAuthor.trim() ||
            null,

          subject:
            bookSubject.trim() ||
            'General',

          edition:
            bookEdition.trim() ||
            null,

          exam_stage:
            bookExamStage,

          total_pages:
            totalPages,

          reading_status:
            'planned',

          sort_order:
            nextSort

        })
        .select(
          'id'
        )
        .single();


    if (
      error
    ) {

      setMessage(
        error.message
      );

      setSaving(
        false
      );

      return;
    }


    const newBookId =
      data?.id
        ? String(
            data.id
          )
        : null;


    setBookTitle(
      ''
    );

    setBookAuthor(
      ''
    );

    setBookEdition(
      ''
    );

    setBookTotalPages(
      ''
    );


    setShowBookForm(
      false
    );


    setMessage(
      'Book added to your personal reading library.'
    );


    await loadLibrary(
      newBookId
    );


    setSaving(
      false
    );
  }


  /* =======================================================
     DELETE BOOK
  ======================================================= */

  async function deleteBook(
    book:
      PersonalBook
  ) {

    if (
      !supabase
    ) {

      return;
    }


    const confirmed =
      window.confirm(
        `Delete "${book.title}" and all its topics?`
      );


    if (
      !confirmed
    ) {

      return;
    }


    const {
      error
    } =
      await supabase
        .from(
          'personal_books'
        )
        .delete()
        .eq(
          'id',
          book.id
        );


    if (
      error
    ) {

      setMessage(
        error.message
      );

      return;
    }


    setShowTopicForm(
      false
    );

    setShowBulkImporter(
      false
    );


    setMessage(
      'Book deleted.'
    );


    await loadLibrary();
  }


  /* =======================================================
     RENAME BOOK
  ======================================================= */

  async function renameBook(
    book:
      PersonalBook
  ) {

    if (
      !supabase
    ) {

      return;
    }


    const nextTitle =
      window.prompt(
        'Book title',
        book.title
      );


    if (
      nextTitle ===
      null
    ) {

      return;
    }


    const cleanTitle =
      nextTitle.trim();


    if (
      !cleanTitle
    ) {

      return;
    }


    const {
      error
    } =
      await supabase
        .from(
          'personal_books'
        )
        .update({

          title:
            cleanTitle

        })
        .eq(
          'id',
          book.id
        );


    if (
      error
    ) {

      setMessage(
        error.message
      );

      return;
    }


    await loadLibrary(
      book.id
    );
  }


  /* =======================================================
     CURRENT BOOK
  ======================================================= */

  async function makeCurrentBook(
    bookId:
      string
  ) {

    const client =
      supabase;


    if (
      !client
    ) {

      setMessage(
        'Study database is not configured.'
      );

      return;
    }


    setSaving(
      true
    );

    setMessage(
      ''
    );


    const {
      error
    } =
      await client.rpc(
        'set_current_personal_book',
        {
          p_book_id:
            bookId
        }
      );


    if (
      error
    ) {

      setMessage(
        error.message
      );

      setSaving(
        false
      );

      return;
    }


    setMessage(
      'Current book updated.'
    );


    await loadLibrary(
      bookId
    );


    setSaving(
      false
    );
  }


  /* =======================================================
     CURRENT PAGE
  ======================================================= */

  async function updateCurrentPage(
    value:
      number
  ) {

    if (
      !supabase ||
      !selectedBook
    ) {

      return;
    }


    if (
      !Number.isFinite(
        value
      )
    ) {

      return;
    }


    const safePage =
      Math.max(
        0,
        Math.round(
          value
        )
      );


    if (
      selectedBook.total_pages &&
      safePage >
        selectedBook.total_pages
    ) {

      setMessage(
        `Page cannot exceed ${selectedBook.total_pages}.`
      );

      return;
    }


    const {
      error
    } =
      await supabase
        .from(
          'personal_books'
        )
        .update({

          current_page:
            safePage,

          reading_status:
            'reading'

        })
        .eq(
          'id',
          selectedBook.id
        );


    if (
      error
    ) {

      setMessage(
        error.message
      );

      return;
    }


    await loadLibrary(
      selectedBook.id
    );
  }


  /* =======================================================
     START ADD TOPIC
  ======================================================= */

  function startAddTopic(
    parent:
      PersonalTopic |
      null =
        null
  ) {

    setShowBulkImporter(
      false
    );

    setTopicName(
      ''
    );

    setParentId(
      parent?.id ||
      ''
    );


    if (
      parent?.topic_type ===
      'part'
    ) {

      setTopicType(
        'chapter'
      );

    } else if (
      parent?.topic_type ===
      'chapter'
    ) {

      setTopicType(
        'topic'
      );

    } else if (
      parent
    ) {

      setTopicType(
        'subtopic'
      );

    } else {

      setTopicType(
        'chapter'
      );
    }


    setPageStart(
      ''
    );

    setPageEnd(
      ''
    );


    setShowTopicForm(
      true
    );


    window.setTimeout(
      () => {

        document
          .getElementById(
            'personal-topic-form'
          )
          ?.scrollIntoView({

            behavior:
              'smooth',

            block:
              'start'

          });

      },
      50
    );
  }


  /* =======================================================
     SAVE TOPIC
  ======================================================= */

  async function saveTopic(
    event:
      FormEvent<
        HTMLFormElement
      >
  ) {

    event.preventDefault();


    const client =
      supabase;


    if (
      !client ||
      !selectedBook
    ) {

      return;
    }


    const cleanName =
      topicName.trim();


    if (
      !cleanName
    ) {

      setMessage(
        'Topic name is required.'
      );

      return;
    }


    const cleanPageStart =
      pageStart.trim()
        ? Number(
            pageStart
          )
        : null;


    const cleanPageEnd =
      pageEnd.trim()
        ? Number(
            pageEnd
          )
        : null;


    if (
      cleanPageStart !==
        null &&
      (
        !Number.isInteger(
          cleanPageStart
        ) ||
        cleanPageStart <
          0
      )
    ) {

      setMessage(
        'Start page must be a valid whole number.'
      );

      return;
    }


    if (
      cleanPageEnd !==
        null &&
      (
        !Number.isInteger(
          cleanPageEnd
        ) ||
        cleanPageEnd <
          0
      )
    ) {

      setMessage(
        'End page must be a valid whole number.'
      );

      return;
    }


    if (
      cleanPageStart !==
        null &&
      cleanPageEnd !==
        null &&
      cleanPageEnd <
        cleanPageStart
    ) {

      setMessage(
        'End page cannot be before start page.'
      );

      return;
    }


    const {
      data: {
        user
      }
    } =
      await client.auth
        .getUser();


    if (
      !user
    ) {

      return;
    }


    const selectedParent =
      parentId ||
      null;


    const siblings =
      selectedBookTopics.filter(
        topic =>
          topic.parent_id ===
          selectedParent
      );


    const nextSort =
      siblings.length ===
        0
        ? 10
        : Math.max(
            ...siblings.map(
              topic =>
                topic.sort_order
            )
          ) +
          10;


    setSaving(
      true
    );

    setMessage(
      ''
    );


    const {
      error
    } =
      await client
        .from(
          'personal_book_topics'
        )
        .insert({

          user_id:
            user.id,

          book_id:
            selectedBook.id,

          parent_id:
            selectedParent,

          topic_name:
            cleanName,

          topic_type:
            topicType,

          page_start:
            cleanPageStart,

          page_end:
            cleanPageEnd,

          sort_order:
            nextSort

        });


    if (
      error
    ) {

      setMessage(
        error.message
      );

      setSaving(
        false
      );

      return;
    }


    setTopicName(
      ''
    );

    setParentId(
      ''
    );

    setPageStart(
      ''
    );

    setPageEnd(
      ''
    );


    setShowTopicForm(
      false
    );


    setMessage(
      'Topic added.'
    );


    await loadLibrary(
      selectedBook.id
    );


    setSaving(
      false
    );
  }


  /* =======================================================
     TOPIC PROGRESS
  ======================================================= */

  async function updateTopicProgress(
    topic:
      PersonalTopic,

    value:
      number
  ) {

    if (
      !supabase
    ) {

      return;
    }


    const cleanPercent =
      clampPercent(
        value
      );


    /*
     * Protect existing revision history.
     */

    if (
      topic.progress_percent ===
        100 &&
      cleanPercent <
        100 &&
      (
        topic.revision_count >
          0 ||
        topic.completed_at !==
          null
      )
    ) {

      const confirmed =
        window.confirm(
          'Reducing this topic below 100% will reset its completion and revision schedule. Continue?'
        );


      if (
        !confirmed
      ) {

        return;
      }
    }


    const previousTopic = {
      ...topic
    };


    setTopics(
      current =>
        current.map(
          item =>
            item.id ===
              topic.id
              ? {

                  ...item,

                  progress_percent:
                    cleanPercent,

                  ...(cleanPercent <
                    100
                    ? {

                        completed_at:
                          null,

                        revision_count:
                          0,

                        revision_1_at:
                          null,

                        revision_2_at:
                          null,

                        final_revision_at:
                          null,

                        next_revision_due_at:
                          null

                      }
                    : {})

                }
              : item
        )
    );


    const {
      data,
      error
    } =
      await supabase
        .from(
          'personal_book_topics'
        )
        .update({

          progress_percent:
            cleanPercent

        })
        .eq(
          'id',
          topic.id
        )
        .select(
          TOPIC_SELECT
        )
        .single();


    if (
      error ||
      !data
    ) {

      setTopics(
        current =>
          current.map(
            item =>
              item.id ===
                topic.id
                ? previousTopic
                : item
          )
      );


      setMessage(
        error?.message ||
        'Unable to save topic progress.'
      );


      return;
    }


    const updatedTopic =
      normaliseTopic(
        data
      );


    setTopics(
      current =>
        current.map(
          item =>
            item.id ===
              updatedTopic.id
              ? updatedTopic
              : item
        )
    );


    if (
      previousTopic.progress_percent <
        100 &&
      updatedTopic.progress_percent >=
        100
    ) {

      setMessage(
        'Topic completed. Revision 1 has been scheduled automatically.'
      );
    }
  }


  /* =======================================================
     ADVANCE REVISION
  ======================================================= */

  async function advanceTopicRevision(
    topic:
      PersonalTopic,

    requestedRevision:
      1 |
      2 |
      3
  ) {

    if (
      !supabase
    ) {

      return;
    }


    if (
      topic.progress_percent <
      100
    ) {

      setMessage(
        'Complete the topic to 100% before recording a revision.'
      );

      return;
    }


    const expectedRevision =
      Math.min(
        3,
        topic.revision_count +
          1
      ) as
        1 |
        2 |
        3;


    const nextRevision =
      requestedRevision ===
        expectedRevision
        ? requestedRevision
        : expectedRevision;


    setRevisionSaving(
      topic.id,
      true
    );

    setMessage(
      ''
    );


    const {
      data,
      error
    } =
      await supabase
        .from(
          'personal_book_topics'
        )
        .update({

          revision_count:
            nextRevision

        })
        .eq(
          'id',
          topic.id
        )
        .select(
          TOPIC_SELECT
        )
        .single();


    if (
      error ||
      !data
    ) {

      setRevisionSaving(
        topic.id,
        false
      );


      setMessage(
        error?.message ||
        'Unable to save revision progress.'
      );


      return;
    }


    const updatedTopic =
      normaliseTopic(
        data
      );


    setTopics(
      current =>
        current.map(
          item =>
            item.id ===
              updatedTopic.id
              ? updatedTopic
              : item
        )
    );


    setRevisionSaving(
      topic.id,
      false
    );


    if (
      updatedTopic.revision_count ===
      1
    ) {

      setMessage(
        'Revision 1 completed. Revision 2 has been scheduled.'
      );

    } else if (
      updatedTopic.revision_count ===
      2
    ) {

      setMessage(
        'Revision 2 completed. Final Revision has been scheduled.'
      );

    } else if (
      updatedTopic.revision_count >=
      3
    ) {

      setMessage(
        'Final Revision completed. Revision cycle finished.'
      );
    }
  }


  /* =======================================================
     NOTES
  ======================================================= */

  async function updateTopicNote(
    topic:
      PersonalTopic,

    nextNotes:
      string |
      null
  ) {

    if (
      !supabase
    ) {

      throw new Error(
        'Study database is not configured.'
      );
    }


    const previousNotes =
      topic.notes;


    setTopics(
      current =>
        current.map(
          item =>
            item.id ===
              topic.id
              ? {

                  ...item,

                  notes:
                    nextNotes

                }
              : item
        )
    );


    const {
      error
    } =
      await supabase
        .from(
          'personal_book_topics'
        )
        .update({

          notes:
            nextNotes

        })
        .eq(
          'id',
          topic.id
        );


    if (
      error
    ) {

      setTopics(
        current =>
          current.map(
            item =>
              item.id ===
                topic.id
                ? {

                    ...item,

                    notes:
                      previousNotes

                  }
                : item
          )
      );


      throw new Error(
        error.message
      );
    }
  }


  /* =======================================================
     CURRENT TOPIC
     ATOMIC TOPIC + BOOK SWITCH
  ======================================================= */

  async function makeCurrentTopic(
    topic:
      PersonalTopic
  ) {

    const client =
      supabase;


    if (
      !client
    ) {

      setMessage(
        'Study database is not configured.'
      );

      return;
    }


    setSaving(
      true
    );

    setMessage(
      ''
    );


    /*
     * One secure database transaction:
     *
     * - verifies topic ownership
     * - clears old current topic
     * - sets selected topic current
     * - clears old current book
     * - sets this topic's book current
     */

    const {
      error
    } =
      await client.rpc(
        'set_current_personal_topic',
        {
          p_topic_id:
            topic.id
        }
      );


    if (
      error
    ) {

      setMessage(
        error.message
      );

      setSaving(
        false
      );

      return;
    }


    /*
     * Allow automatic focus to the newly
     * selected topic after data reload.
     */

    lastFocusedTopicRef.current =
      null;


    setMessage(
      'Current reading topic updated.'
    );


    await loadLibrary(
      topic.book_id
    );


    setSaving(
      false
    );
  }


  /* =======================================================
     RENAME TOPIC
  ======================================================= */

  async function renameTopic(
    topic:
      PersonalTopic
  ) {

    if (
      !supabase
    ) {

      return;
    }


    const nextName =
      window.prompt(
        'Topic name',
        topic.topic_name
      );


    if (
      nextName ===
      null
    ) {

      return;
    }


    const cleanName =
      nextName.trim();


    if (
      !cleanName
    ) {

      return;
    }


    const {
      error
    } =
      await supabase
        .from(
          'personal_book_topics'
        )
        .update({

          topic_name:
            cleanName

        })
        .eq(
          'id',
          topic.id
        );


    if (
      error
    ) {

      setMessage(
        error.message
      );

      return;
    }


    await loadLibrary(
      topic.book_id
    );
  }


  /* =======================================================
     DELETE TOPIC
  ======================================================= */

  async function deleteTopic(
    topic:
      PersonalTopic
  ) {

    if (
      !supabase
    ) {

      return;
    }


    const confirmed =
      window.confirm(
        `Delete "${topic.topic_name}" and its subtopics?`
      );


    if (
      !confirmed
    ) {

      return;
    }


    const {
      error
    } =
      await supabase
        .from(
          'personal_book_topics'
        )
        .delete()
        .eq(
          'id',
          topic.id
        );


    if (
      error
    ) {

      setMessage(
        error.message
      );

      return;
    }


    if (
      topic.is_current
    ) {

      lastFocusedTopicRef.current =
        null;
    }


    await loadLibrary(
      topic.book_id
    );
  }


  /* =======================================================
     RENDER TOPIC
  ======================================================= */

  function renderTopic(
    topic:
      PersonalTopic,

    depth =
      0
  ): ReactNode {

    if (
      !topicHasVisibleContent(
        topic
      )
    ) {

      return null;
    }


    const allChildren =
      getChildren(
        topic.id
      );


    const children =
      allChildren.filter(
        child =>
          topicHasVisibleContent(
            child
          )
      );


    const hasChildren =
      children.length >
      0;


    const isLeaf =
      allChildren.length ===
      0;


    const calculated =
      calculatedTopicProgress(
        topic
      );


    const expanded =
      isFiltering ||
      expandedTopicIds.has(
        topic.id
      );


    return (

      <div
        id={
          `personal-topic-${topic.id}`
        }

        key={
          topic.id
        }

        style={{

          marginLeft:
            depth ===
              0
              ? 0
              : Math.min(
                  depth *
                    18,
                  54
                ),

          marginTop:
            '10px'

        }}
      >

        <div
          style={{

            border:
              topic.is_current
                ? '1px solid rgba(94,234,212,.75)'
                : '1px solid rgba(255,255,255,.09)',

            background:
              topic.is_current
                ? 'rgba(20,184,166,.12)'
                : 'rgba(255,255,255,.025)',

            borderRadius:
              '14px',

            padding:
              '14px'

          }}
        >

          <div
            style={{

              display:
                'flex',

              justifyContent:
                'space-between',

              alignItems:
                'flex-start',

              gap:
                '12px'

            }}
          >

            <div
              style={{

                minWidth:
                  0,

                flex:
                  1

              }}
            >

              <div
                style={{

                  display:
                    'flex',

                  alignItems:
                    'center',

                  flexWrap:
                    'wrap',

                  gap:
                    '7px'

                }}
              >

                {hasChildren &&
                  !isFiltering && (

                  <button
                    type="button"

                    className="text-btn"

                    onClick={() =>
                      toggleExpanded(
                        topic.id
                      )
                    }

                    style={{
                      padding:
                        '3px 8px'
                    }}
                  >
                    {
                      expanded
                        ? '− Hide'
                        : '+ Show'
                    }
                  </button>

                )}


                <small
                  style={{

                    textTransform:
                      'uppercase',

                    color:
                      '#5eead4'

                  }}
                >
                  {
                    topic.topic_type
                  }
                </small>

              </div>


              <h4
                style={{
                  margin:
                    '5px 0 3px'
                }}
              >
                {
                  topic.topic_name
                }
              </h4>


              {(topic.page_start !==
                  null ||
                topic.page_end !==
                  null) && (

                <small
                  style={{
                    color:
                      '#94a3b8'
                  }}
                >
                  Pages{' '}

                  {
                    topic.page_start ??
                    '?'
                  }

                  {' – '}

                  {
                    topic.page_end ??
                    '?'
                  }
                </small>

              )}


              {topic.is_current && (

                <div
                  style={{
                    marginTop:
                      '7px'
                  }}
                >

                  <span
                    className="pill"
                  >
                    ● Currently Reading
                  </span>

                </div>

              )}

            </div>


            <strong
              style={{

                fontSize:
                  '1.1rem',

                color:
                  calculated ===
                    100
                    ? '#5eead4'
                    : '#f8fafc'

              }}
            >
              {
                calculated
              }%
            </strong>

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
                  `${calculated}%`
              }}
            />

          </div>


          {isLeaf ? (

            <>

              <TopicProgressControls

                progress={
                  topic.progress_percent
                }

                onChange={
                  value =>
                    void updateTopicProgress(
                      topic,
                      value
                    )
                }

              />


              <PersonalTopicRevisionControls

                progressPercent={
                  topic.progress_percent
                }

                revisionCount={
                  topic.revision_count
                }

                completedAt={
                  topic.completed_at
                }

                revision1At={
                  topic.revision_1_at
                }

                revision2At={
                  topic.revision_2_at
                }

                finalRevisionAt={
                  topic.final_revision_at
                }

                nextRevisionDueAt={
                  topic.next_revision_due_at
                }

                saving={
                  revisionSavingIds.has(
                    topic.id
                  )
                }

                onAdvanceRevision={
                  nextRevision =>
                    advanceTopicRevision(
                      topic,
                      nextRevision
                    )
                }

              />

            </>

          ) : (

            <small
              style={{

                display:
                  'block',

                marginTop:
                  '9px',

                color:
                  '#94a3b8'

              }}
            >
              Automatically calculated from{' '}

              {
                getLeafTopics(
                  topic
                ).length
              }{' '}

              underlying topic

              {
                getLeafTopics(
                  topic
                ).length ===
                  1
                  ? ''
                  : 's'
              }.
            </small>

          )}


          <TopicNotesEditor

            topicName={
              topic.topic_name
            }

            notes={
              topic.notes
            }

            onSave={
              nextNotes =>
                updateTopicNote(
                  topic,
                  nextNotes
                )
            }

          />


          <div
            style={{

              display:
                'flex',

              flexWrap:
                'wrap',

              gap:
                '8px',

              marginTop:
                '12px'

            }}
          >

            <button
              type="button"

              className={
                topic.is_current
                  ? 'primary-btn'
                  : 'secondary-btn'
              }

              disabled={
                saving
              }

              onClick={() =>
                void makeCurrentTopic(
                  topic
                )
              }
            >
              {
                saving &&
                !topic.is_current
                  ? 'Opening…'
                  : topic.is_current
                    ? 'Currently Reading'
                    : 'Read Now'
              }
            </button>


            <button
              type="button"

              className="secondary-btn"

              onClick={() =>
                startAddTopic(
                  topic
                )
              }
            >
              + Subtopic
            </button>


            <button
              type="button"

              className="text-btn"

              onClick={() =>
                void renameTopic(
                  topic
                )
              }
            >
              Rename
            </button>


            <button
              type="button"

              className="text-btn"

              onClick={() =>
                void deleteTopic(
                  topic
                )
              }
            >
              Delete
            </button>

          </div>

        </div>


        {hasChildren &&
          expanded && (

          <div>

            {
              children.map(
                child =>
                  renderTopic(
                    child,
                    depth +
                      1
                  )
              )
            }

          </div>

        )}

      </div>

    );
  }


  /* =======================================================
     LOADING
  ======================================================= */

  if (
    loading
  ) {

    return (

      <div
        className="page-wrap"
      >

        <TopBar
          title="My Books"
          subtitle="Personal reading and revision tracker"
        />


        <section
          className="panel"
        >
          Loading your reading library…
        </section>

      </div>

    );
  }


  /* =======================================================
     PAGE
  ======================================================= */

  return (

    <div
      className="page-wrap"
    >

      <TopBar
        title="My Books"
        subtitle="Reading, notes, progress and revision in one place"
      />


      <section
        className="panel intro-strip"
      >

        <span
          className="eyebrow"
        >
          PERSONAL READING TRACKER
        </span>


        <h2>
          Your books. Your topics. Your revision.
        </h2>


        <p>
          Add any book, create its chapter
          structure, track reading progress,
          save notes and automatically schedule
          revisions after completing a topic.
        </p>


        <button
          type="button"

          className="primary-btn"

          onClick={() =>
            setShowBookForm(
              current =>
                !current
            )
          }
        >
          + Add My Book
        </button>

      </section>


      {message && (

        <section
          className="panel"

          style={{
            marginTop:
              '14px'
          }}
        >
          {
            message
          }
        </section>

      )}


      {showBookForm && (

        <section
          className="panel admin-form"

          style={{
            marginTop:
              '14px'
          }}
        >

          <span
            className="eyebrow"
          >
            NEW PERSONAL BOOK
          </span>


          <h3>
            Add a book to your reading plan
          </h3>


          <form
            onSubmit={
              saveBook
            }
          >

            <label>
              Book Title

              <input
                value={
                  bookTitle
                }

                onChange={
                  event =>
                    setBookTitle(
                      event.target.value
                    )
                }

                placeholder="Example: World History"
              />
            </label>


            <div
              className="form-two"
            >

              <label>
                Author

                <input
                  value={
                    bookAuthor
                  }

                  onChange={
                    event =>
                      setBookAuthor(
                        event.target.value
                      )
                  }

                  placeholder="Author name"
                />
              </label>


              <label>
                Subject

                <input
                  value={
                    bookSubject
                  }

                  onChange={
                    event =>
                      setBookSubject(
                        event.target.value
                      )
                  }

                  placeholder="World History"
                />
              </label>

            </div>


            <div
              className="form-two"
            >

              <label>
                Edition

                <input
                  value={
                    bookEdition
                  }

                  onChange={
                    event =>
                      setBookEdition(
                        event.target.value
                      )
                  }

                  placeholder="Optional"
                />
              </label>


              <label>
                Total Pages

                <input
                  type="number"

                  min="1"

                  value={
                    bookTotalPages
                  }

                  onChange={
                    event =>
                      setBookTotalPages(
                        event.target.value
                      )
                  }

                  placeholder="Optional"
                />
              </label>

            </div>


            <label>
              Useful For

              <select
                value={
                  bookExamStage
                }

                onChange={
                  event =>
                    setBookExamStage(
                      event.target
                        .value as
                        ExamStage
                    )
                }
              >

                <option value="both">
                  Prelims + Mains
                </option>

                <option value="prelims">
                  Prelims
                </option>

                <option value="mains">
                  Mains
                </option>

              </select>

            </label>


            <div
              style={{

                display:
                  'flex',

                gap:
                  '10px',

                flexWrap:
                  'wrap'

              }}
            >

              <button
                type="submit"

                className="primary-btn"

                disabled={
                  saving
                }
              >
                {
                  saving
                    ? 'Saving…'
                    : 'Add Book'
                }
              </button>


              <button
                type="button"

                className="secondary-btn"

                onClick={() =>
                  setShowBookForm(
                    false
                  )
                }
              >
                Cancel
              </button>

            </div>

          </form>

        </section>

      )}


      {books.length ===
        0 && (

        <section
          className="panel"

          style={{

            marginTop:
              '14px',

            textAlign:
              'center'

          }}
        >

          <h3>
            No personal books yet
          </h3>


          <p>
            Add the first book you are currently
            studying.
          </p>


          <button
            type="button"

            className="primary-btn"

            onClick={() =>
              setShowBookForm(
                true
              )
            }
          >
            + Add First Book
          </button>

        </section>

      )}


      {books.length >
        0 && (

        <>

          <section
            className="panel"

            style={{
              marginTop:
                '14px'
            }}
          >

            <span
              className="eyebrow"
            >
              MY LIBRARY
            </span>


            <div
              style={{

                display:
                  'grid',

                gridTemplateColumns:
                  'repeat(auto-fit,minmax(220px,1fr))',

                gap:
                  '10px',

                marginTop:
                  '14px'

              }}
            >

              {books.map(
                book => (

                  <button
                    key={
                      book.id
                    }

                    type="button"

                    onClick={() => {

                      setSelectedBookId(
                        book.id
                      );

                      setShowTopicForm(
                        false
                      );

                      setShowBulkImporter(
                        false
                      );

                    }}

                    style={{

                      textAlign:
                        'left',

                      padding:
                        '14px',

                      borderRadius:
                        '14px',

                      border:
                        selectedBookId ===
                          book.id
                          ? '1px solid rgba(94,234,212,.65)'
                          : '1px solid rgba(255,255,255,.09)',

                      background:
                        selectedBookId ===
                          book.id
                          ? 'rgba(20,184,166,.12)'
                          : 'rgba(255,255,255,.025)',

                      color:
                        '#f8fafc',

                      cursor:
                        'pointer'

                    }}
                  >

                    <strong>
                      {
                        book.title
                      }
                    </strong>


                    {book.author && (

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
                          book.author
                        }
                      </small>

                    )}


                    <small
                      style={{

                        display:
                          'block',

                        marginTop:
                          '6px',

                        color:
                          book.is_current
                            ? '#5eead4'
                            : '#94a3b8'

                      }}
                    >
                      {
                        book.is_current
                          ? '● Current Book'
                          : statusLabel(
                              book.reading_status
                            )
                      }
                    </small>

                  </button>

                )
              )}

            </div>

          </section>


          {selectedBook && (

            <section
              className="panel"

              style={{
                marginTop:
                  '14px'
              }}
            >

              <span
                className="eyebrow"
              >
                READING + REVISION PROGRESS
              </span>


              <div
                style={{

                  display:
                    'flex',

                  justifyContent:
                    'space-between',

                  alignItems:
                    'flex-start',

                  flexWrap:
                    'wrap',

                  gap:
                    '14px',

                  marginTop:
                    '8px'

                }}
              >

                <div>

                  <h2
                    style={{
                      margin:
                        '0 0 5px'
                    }}
                  >
                    {
                      selectedBook.title
                    }
                  </h2>


                  <p
                    style={{
                      margin:
                        0
                    }}
                  >
                    {[
                      selectedBook.author,
                      selectedBook.subject,
                      selectedBook.edition
                        ? `Edition: ${selectedBook.edition}`
                        : null
                    ]
                      .filter(
                        Boolean
                      )
                      .join(
                        ' · '
                      )}
                  </p>

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
                        '2rem',

                      color:
                        '#5eead4'

                    }}
                  >
                    {
                      bookProgress
                    }%
                  </strong>


                  <small>
                    reading complete
                  </small>

                </div>

              </div>


              <div
                className="progress-track"

                style={{

                  height:
                    '10px',

                  marginTop:
                    '16px'

                }}
              >

                <span
                  style={{
                    width:
                      `${bookProgress}%`
                  }}
                />

              </div>


              <div
                style={{

                  display:
                    'grid',

                  gridTemplateColumns:
                    'repeat(auto-fit,minmax(110px,1fr))',

                  gap:
                    '10px',

                  marginTop:
                    '14px'

                }}
              >

                <div
                  className="callout"
                >
                  <strong>
                    {
                      leafTopics.length
                    }
                  </strong>

                  <p>
                    Total Topics
                  </p>
                </div>


                <div
                  className="callout"
                >
                  <strong>
                    {
                      notStartedLeafTopics
                    }
                  </strong>

                  <p>
                    Not Started
                  </p>
                </div>


                <div
                  className="callout"
                >
                  <strong>
                    {
                      readingLeafTopics
                    }
                  </strong>

                  <p>
                    Reading
                  </p>
                </div>


                <div
                  className="callout"
                >
                  <strong>
                    {
                      completedLeafTopics
                    }
                  </strong>

                  <p>
                    Read 100%
                  </p>
                </div>


                <div
                  className="callout"
                >
                  <strong>
                    {
                      dueRevisionTopics
                    }
                  </strong>

                  <p>
                    Revision Due
                  </p>
                </div>


                <div
                  className="callout"
                >
                  <strong>
                    {
                      fullyRevisedLeafTopics
                    }
                  </strong>

                  <p>
                    Fully Revised
                  </p>
                </div>


                <div
                  className="callout"
                >
                  <strong>
                    {
                      remainingPercent
                    }%
                  </strong>

                  <p>
                    Reading Left
                  </p>
                </div>

              </div>


              {currentTopic && (

                <div
                  style={{

                    marginTop:
                      '16px',

                    padding:
                      '14px',

                    borderRadius:
                      '12px',

                    background:
                      'rgba(20,184,166,.10)'

                  }}
                >

                  <small
                    className="eyebrow"
                  >
                    CURRENTLY READING
                  </small>


                  <strong
                    style={{

                      display:
                        'block',

                      marginTop:
                        '6px'

                    }}
                  >
                    {
                      topicPath(
                        currentTopic
                      )
                    }
                  </strong>


                  <small
                    style={{

                      display:
                        'block',

                      marginTop:
                        '5px',

                      color:
                        '#5eead4'

                    }}
                  >
                    {
                      calculatedTopicProgress(
                        currentTopic
                      )
                    }% complete
                  </small>

                </div>

              )}


              {selectedBook.total_pages && (

                <div
                  style={{
                    marginTop:
                      '16px'
                  }}
                >

                  <label>
                    Current Page

                    <input
                      key={
                        `${selectedBook.id}-${selectedBook.current_page}`
                      }

                      type="number"

                      min="0"

                      max={
                        selectedBook
                          .total_pages
                      }

                      defaultValue={
                        selectedBook
                          .current_page
                      }

                      onBlur={
                        event =>
                          void updateCurrentPage(
                            Number(
                              event.target
                                .value
                            )
                          )
                      }
                    />
                  </label>


                  <small>
                    Page{' '}

                    {
                      selectedBook
                        .current_page
                    }{' '}

                    of{' '}

                    {
                      selectedBook
                        .total_pages
                    }
                  </small>

                </div>

              )}


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

                <button
                  type="button"

                  className="primary-btn"

                  onClick={() => {

                    setShowBulkImporter(
                      false
                    );

                    startAddTopic(
                      null
                    );

                  }}
                >
                  + Add Topic
                </button>


                <button
                  type="button"

                  className="secondary-btn"

                  onClick={() => {

                    setShowTopicForm(
                      false
                    );

                    setShowBulkImporter(
                      current =>
                        !current
                    );

                  }}
                >
                  {
                    showBulkImporter
                      ? 'Close Fast Import'
                      : 'Fast Index Import'
                  }
                </button>


                {!selectedBook.is_current && (

                  <button
                    type="button"

                    className="secondary-btn"

                    disabled={
                      saving
                    }

                    onClick={() =>
                      void makeCurrentBook(
                        selectedBook.id
                      )
                    }
                  >
                    {
                      saving
                        ? 'Saving…'
                        : 'Set as Current Book'
                    }
                  </button>

                )}


                <button
                  type="button"

                  className="secondary-btn"

                  onClick={() =>
                    void renameBook(
                      selectedBook
                    )
                  }
                >
                  Rename Book
                </button>


                <button
                  type="button"

                  className="text-btn"

                  onClick={() =>
                    void deleteBook(
                      selectedBook
                    )
                  }
                >
                  Delete Book
                </button>

              </div>

            </section>

          )}


          {selectedBook &&
            showBulkImporter && (

            <PersonalBookBulkImporter

              key={
                selectedBook.id
              }

              bookId={
                selectedBook.id
              }

              bookTitle={
                selectedBook.title
              }

              onImported={() => {

                setMessage(
                  'Book index imported successfully.'
                );


                void loadLibrary(
                  selectedBook.id
                );

              }}

            />

          )}


          {selectedBook &&
            showTopicForm && (

            <section
              id="personal-topic-form"

              className="panel admin-form"

              style={{
                marginTop:
                  '14px'
              }}
            >

              <span
                className="eyebrow"
              >
                BOOK STRUCTURE
              </span>


              <h3>
                Add Topic
              </h3>


              <p>
                Add a Part, Chapter, Topic or
                Subtopic to your personal book.
              </p>


              <form
                onSubmit={
                  saveTopic
                }
              >

                <label>
                  Topic Name

                  <input
                    value={
                      topicName
                    }

                    onChange={
                      event =>
                        setTopicName(
                          event.target
                            .value
                        )
                    }

                    placeholder="Enter topic name"
                  />
                </label>


                <div
                  className="form-two"
                >

                  <label>
                    Type

                    <select
                      value={
                        topicType
                      }

                      onChange={
                        event =>
                          setTopicType(
                            event.target
                              .value as
                              TopicType
                          )
                      }
                    >

                      <option value="part">
                        Part
                      </option>

                      <option value="chapter">
                        Chapter
                      </option>

                      <option value="topic">
                        Topic
                      </option>

                      <option value="subtopic">
                        Subtopic
                      </option>

                      <option value="custom">
                        Custom
                      </option>

                    </select>

                  </label>


                  <label>
                    Under

                    <select
                      value={
                        parentId
                      }

                      onChange={
                        event =>
                          setParentId(
                            event.target
                              .value
                          )
                      }
                    >

                      <option value="">
                        Top Level
                      </option>


                      {
                        selectedBookTopics.map(
                          topic => (

                            <option
                              key={
                                topic.id
                              }

                              value={
                                topic.id
                              }
                            >
                              {
                                topicPath(
                                  topic
                                )
                              }
                            </option>

                          )
                        )
                      }

                    </select>

                  </label>

                </div>


                <div
                  className="form-two"
                >

                  <label>
                    Start Page

                    <input
                      type="number"

                      min="0"

                      value={
                        pageStart
                      }

                      onChange={
                        event =>
                          setPageStart(
                            event.target
                              .value
                          )
                      }

                      placeholder="Optional"
                    />
                  </label>


                  <label>
                    End Page

                    <input
                      type="number"

                      min="0"

                      value={
                        pageEnd
                      }

                      onChange={
                        event =>
                          setPageEnd(
                            event.target
                              .value
                          )
                      }

                      placeholder="Optional"
                    />
                  </label>

                </div>


                <div
                  style={{

                    display:
                      'flex',

                    gap:
                      '10px',

                    flexWrap:
                      'wrap'

                  }}
                >

                  <button
                    type="submit"

                    className="primary-btn"

                    disabled={
                      saving
                    }
                  >
                    {
                      saving
                        ? 'Saving…'
                        : 'Add Topic'
                    }
                  </button>


                  <button
                    type="button"

                    className="secondary-btn"

                    onClick={() =>
                      setShowTopicForm(
                        false
                      )
                    }
                  >
                    Cancel
                  </button>

                </div>

              </form>

            </section>

          )}


          {selectedBook && (

            <section
              className="panel"

              style={{

                marginTop:
                  '14px',

                marginBottom:
                  '20px'

              }}
            >

              <span
                className="eyebrow"
              >
                BOOK CONTENTS
              </span>


              <h3>
                Topic-by-topic reading and revision
              </h3>


              <p>
                Finish a leaf topic to 100% to
                automatically begin its Revision 1,
                Revision 2 and Final Revision cycle.
              </p>


              {rootTopics.length >
                0 && (

                <BookTopicToolbar

                  search={
                    topicSearch
                  }

                  filter={
                    topicFilter
                  }

                  totalTopics={
                    selectedBookTopics
                      .length
                  }

                  onSearchChange={
                    setTopicSearch
                  }

                  onFilterChange={
                    setTopicFilter
                  }

                  onExpandAll={
                    expandAllTopics
                  }

                  onCollapseAll={
                    collapseAllTopics
                  }

                />

              )}


              {isFiltering && (

                <div
                  style={{

                    marginTop:
                      '12px',

                    padding:
                      '10px 12px',

                    borderRadius:
                      '10px',

                    background:
                      'rgba(59,130,246,.08)'

                  }}
                >

                  <small>
                    Showing{' '}

                    <strong>
                      {
                        visibleLeafTopics
                          .length
                      }
                    </strong>{' '}

                    matching trackable topic

                    {
                      visibleLeafTopics
                        .length ===
                        1
                        ? ''
                        : 's'
                    }.
                  </small>

                </div>

              )}


              {rootTopics.length ===
                0 ? (

                <div
                  className="callout"

                  style={{
                    marginTop:
                      '14px'
                  }}
                >

                  <strong>
                    No topics added yet.
                  </strong>


                  <p>
                    Add one topic manually or use
                    Fast Index Import for the full
                    book structure.
                  </p>


                  <div
                    style={{

                      display:
                        'flex',

                      flexWrap:
                        'wrap',

                      gap:
                        '8px'

                    }}
                  >

                    <button
                      type="button"

                      className="primary-btn"

                      onClick={() =>
                        startAddTopic(
                          null
                        )
                      }
                    >
                      + Add First Topic
                    </button>


                    <button
                      type="button"

                      className="secondary-btn"

                      onClick={() => {

                        setShowTopicForm(
                          false
                        );

                        setShowBulkImporter(
                          true
                        );

                      }}
                    >
                      Fast Index Import
                    </button>

                  </div>

                </div>

              ) : visibleRootTopics.length ===
                0 ? (

                <div
                  className="callout"

                  style={{
                    marginTop:
                      '14px'
                  }}
                >

                  <strong>
                    No matching topics.
                  </strong>


                  <p>
                    Change the search text or
                    progress filter.
                  </p>


                  <button
                    type="button"

                    className="secondary-btn"

                    onClick={() => {

                      setTopicSearch(
                        ''
                      );

                      setTopicFilter(
                        'all'
                      );

                    }}
                  >
                    Clear Search & Filters
                  </button>

                </div>

              ) : (

                <div
                  style={{
                    marginTop:
                      '14px'
                  }}
                >

                  {
                    visibleRootTopics.map(
                      topic =>
                        renderTopic(
                          topic
                        )
                    )
                  }

                </div>

              )}

            </section>

          )}

        </>

      )}

    </div>

  );
}

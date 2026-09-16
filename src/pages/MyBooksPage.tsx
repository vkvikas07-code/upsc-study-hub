import {
  useEffect,
  useMemo,
  useState
} from 'react';

import type {
  FormEvent
} from 'react';

import {
  TopBar
} from '../components/TopBar';

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
  sort_order
`;


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
      Math.round(value)
    )
  );
}


function statusLabel(
  status: ReadingStatus
) {

  switch (status) {

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


export function MyBooksPage() {

  const [
    books,
    setBooks
  ] =
    useState<PersonalBook[]>([]);


  const [
    topics,
    setTopics
  ] =
    useState<PersonalTopic[]>([]);


  const [
    selectedBookId,
    setSelectedBookId
  ] =
    useState<string | null>(
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
    message,
    setMessage
  ] =
    useState('');


  const [
    saving,
    setSaving
  ] =
    useState(
      false
    );


  /*
   * =========================================
   * ADD BOOK FORM
   * =========================================
   */

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
    useState('');


  const [
    bookAuthor,
    setBookAuthor
  ] =
    useState('');


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
    useState('');


  const [
    bookExamStage,
    setBookExamStage
  ] =
    useState<ExamStage>(
      'both'
    );


  const [
    bookTotalPages,
    setBookTotalPages
  ] =
    useState('');


  /*
   * =========================================
   * ADD TOPIC FORM
   * =========================================
   */

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
    useState('');


  const [
    topicType,
    setTopicType
  ] =
    useState<TopicType>(
      'chapter'
    );


  const [
    parentId,
    setParentId
  ] =
    useState('');


  const [
    pageStart,
    setPageStart
  ] =
    useState('');


  const [
    pageEnd,
    setPageEnd
  ] =
    useState('');


  /*
   * =========================================
   * LOAD PERSONAL LIBRARY
   * =========================================
   */

  async function loadLibrary() {

    const client =
      supabase;


    if (!client) {

      setMessage(
        'Study database is not configured.'
      );

      setLoading(
        false
      );

      return;
    }


    const safeClient =
      client;


    setLoading(
      true
    );

    setMessage('');


    const {
      data: {
        user
      }
    } =
      await safeClient
        .auth
        .getUser();


    if (!user) {

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

        safeClient
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


        safeClient
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


    const cleanBooks:
      PersonalBook[] =
        (
          bookResult.data ||
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

            author:
              item.author
                ? String(
                    item.author
                  )
                : null,

            subject:
              String(
                item.subject ||
                'General'
              ),

            edition:
              item.edition
                ? String(
                    item.edition
                  )
                : null,

            exam_stage:
              (
                item.exam_stage ||
                'both'
              ) as ExamStage,

            total_pages:
              item.total_pages ===
                null
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
              item.notes
                ? String(
                    item.notes
                  )
                : null,

            sort_order:
              safeNumber(
                item.sort_order
              )

          })
        );


    const cleanTopics:
      PersonalTopic[] =
        (
          topicResult.data ||
          []
        ).map(
          item => ({

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
              item.parent_id
                ? String(
                    item.parent_id
                  )
                : null,

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
                null
                ? null
                : safeNumber(
                    item.page_start
                  ),

            page_end:
              item.page_end ===
                null
                ? null
                : safeNumber(
                    item.page_end
                  ),

            notes:
              item.notes
                ? String(
                    item.notes
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

    setTopics(
      cleanTopics
    );


    setSelectedBookId(
      current => {

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


  /*
   * =========================================
   * SELECTED BOOK
   * =========================================
   */

  const selectedBook =
    useMemo(
      () => {

        return (
          books.find(
            book =>
              book.id ===
              selectedBookId
          ) ||
          null
        );

      },
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


  /*
   * =========================================
   * TOPIC TREE HELPERS
   * =========================================
   */

  function getChildren(
    topicId: string
  ) {

    return selectedBookTopics
      .filter(
        topic =>
          topic.parent_id ===
          topicId
      )
      .sort(
        (
          first,
          second
        ) =>
          first.sort_order -
          second.sort_order
      );
  }


  function getLeafTopics(
    topic:
      PersonalTopic
  ): PersonalTopic[] {

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
          child
        )
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
            ) =>
              first.sort_order -
              second.sort_order
          ),
      [
        selectedBookTopics
      ]
    );


  const bookProgress =
    useMemo(
      () => {

        const childIds =
          new Set(
            selectedBookTopics
              .map(
                topic =>
                  topic.parent_id
              )
              .filter(
                (
                  value
                ):
                  value is string =>
                    Boolean(value)
              )
          );


        const leaves =
          selectedBookTopics
            .filter(
              topic =>
                !childIds.has(
                  topic.id
                )
            );


        if (
          leaves.length >
          0
        ) {

          const total =
            leaves.reduce(
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
            leaves.length
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
        selectedBookTopics,
        selectedBook
      ]
    );


  const remainingPercent =
    100 -
    bookProgress;


  /*
   * =========================================
   * CURRENT READING PATH
   * =========================================
   */

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


  function topicPath(
    topic:
      PersonalTopic
  ) {

    const parts:
      string[] = [
        topic.topic_name
      ];


    let parent =
      topic.parent_id;


    const visited =
      new Set<string>();


    while (
      parent &&
      !visited.has(
        parent
      )
    ) {

      visited.add(
        parent
      );


      const parentTopic =
        selectedBookTopics.find(
          item =>
            item.id ===
            parent
        );


      if (
        !parentTopic
      ) {

        break;
      }


      parts.unshift(
        parentTopic.topic_name
      );


      parent =
        parentTopic.parent_id;
    }


    return parts.join(
      ' → '
    );
  }


  /*
   * =========================================
   * ADD BOOK
   * =========================================
   */

  async function saveBook(
    event:
      FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();


    const client =
      supabase;


    if (!client) {

      setMessage(
        'Study database is not configured.'
      );

      return;
    }


    const safeClient =
      client;


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
      await safeClient
        .auth
        .getUser();


    if (!user) {

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
        totalPages <= 0
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

    setMessage('');


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
      await safeClient
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


    setBookTitle('');
    setBookAuthor('');
    setBookEdition('');
    setBookTotalPages('');

    setShowBookForm(
      false
    );


    if (
      data?.id
    ) {

      setSelectedBookId(
        String(
          data.id
        )
      );
    }


    setMessage(
      'Book added to your personal reading library.'
    );


    await loadLibrary();


    setSaving(
      false
    );
  }


  /*
   * =========================================
   * DELETE BOOK
   * =========================================
   */

  async function deleteBook(
    book:
      PersonalBook
  ) {

    const confirmed =
      window.confirm(
        `Delete "${book.title}" and all its topics?`
      );


    if (
      !confirmed ||
      !supabase
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


    setMessage(
      'Book deleted.'
    );


    await loadLibrary();
  }


  /*
   * =========================================
   * RENAME BOOK
   * =========================================
   */

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


    await loadLibrary();
  }


  /*
   * =========================================
   * CURRENT BOOK
   * =========================================
   */

  async function makeCurrentBook(
    bookId:
      string
  ) {

    const client =
      supabase;


    if (!client) {

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

      return;
    }


    await client
      .from(
        'personal_books'
      )
      .update({
        is_current:
          false
      })
      .eq(
        'user_id',
        user.id
      );


    const {
      error
    } =
      await client
        .from(
          'personal_books'
        )
        .update({

          is_current:
            true,

          reading_status:
            'reading'

        })
        .eq(
          'id',
          bookId
        );


    if (
      error
    ) {

      setMessage(
        error.message
      );

      return;
    }


    await loadLibrary();
  }


  /*
   * =========================================
   * CURRENT PAGE
   * =========================================
   */

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


    await loadLibrary();
  }


  /*
   * =========================================
   * ADD TOPIC
   * =========================================
   */

  function startAddTopic(
    parent:
      PersonalTopic |
      null = null
  ) {

    setTopicName('');

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


    setPageStart('');
    setPageEnd('');

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


  async function saveTopic(
    event:
      FormEvent<HTMLFormElement>
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


    const {
      data: {
        user
      }
    } =
      await client.auth
        .getUser();


    if (!user) {

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


    setSaving(
      true
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


    setTopicName('');
    setParentId('');
    setPageStart('');
    setPageEnd('');

    setShowTopicForm(
      false
    );


    setMessage(
      'Topic added.'
    );


    await loadLibrary();


    setSaving(
      false
    );
  }


  /*
   * =========================================
   * UPDATE TOPIC PROGRESS
   * =========================================
   */

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


    setTopics(
      current =>
        current.map(
          item =>
            item.id ===
              topic.id
              ? {
                  ...item,
                  progress_percent:
                    cleanPercent
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
          progress_percent:
            cleanPercent
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

      await loadLibrary();
    }
  }


  /*
   * =========================================
   * CURRENT TOPIC
   * =========================================
   */

  async function makeCurrentTopic(
    topic:
      PersonalTopic
  ) {

    const client =
      supabase;


    if (!client) {

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

      return;
    }


    await client
      .from(
        'personal_book_topics'
      )
      .update({
        is_current:
          false
      })
      .eq(
        'user_id',
        user.id
      )
      .eq(
        'book_id',
        topic.book_id
      );


    const {
      error
    } =
      await client
        .from(
          'personal_book_topics'
        )
        .update({
          is_current:
            true
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


    await makeCurrentBook(
      topic.book_id
    );


    await loadLibrary();
  }


  /*
   * =========================================
   * RENAME TOPIC
   * =========================================
   */

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


    await loadLibrary();
  }


  /*
   * =========================================
   * DELETE TOPIC
   * =========================================
   */

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


    await loadLibrary();
  }


  /*
   * =========================================
   * TOPIC CARD
   * =========================================
   */

  function renderTopic(
    topic:
      PersonalTopic,
    depth = 0
  ): React.ReactNode {

    const children =
      getChildren(
        topic.id
      );


    const calculated =
      calculatedTopicProgress(
        topic
      );


    const isLeaf =
      children.length ===
      0;


    return (

      <div
        key={
          topic.id
        }

        style={{
          marginLeft:
            depth === 0
              ? 0
              : Math.min(
                  depth * 18,
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
                ? '1px solid rgba(94,234,212,.65)'
                : '1px solid rgba(255,255,255,.09)',

            background:
              topic.is_current
                ? 'rgba(20,184,166,.10)'
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
                  0
              }}
            >

              <small
                style={{
                  textTransform:
                    'uppercase',

                  color:
                    '#5eead4'
                }}
              >
                {topic.topic_type}
              </small>


              <h4
                style={{
                  margin:
                    '4px 0 3px'
                }}
              >
                {topic.topic_name}
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

                  {topic.page_start ??
                    '?'}

                  {' – '}

                  {topic.page_end ??
                    '?'}

                </small>

              )}


              {topic.is_current && (

                <div
                  style={{
                    marginTop:
                      '6px'
                  }}
                >
                  <span
                    className="pill"
                  >
                    Currently Reading
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
              {calculated}%
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

            <div
              style={{
                marginTop:
                  '12px'
              }}
            >

              <input

                type="range"

                min="0"

                max="100"

                step="5"

                value={
                  topic.progress_percent
                }

                onChange={
                  event =>
                    void updateTopicProgress(
                      topic,
                      Number(
                        event.target.value
                      )
                    )
                }

                style={{
                  width:
                    '100%'
                }}

              />


              <div
                style={{
                  display:
                    'flex',

                  justifyContent:
                    'space-between',

                  fontSize:
                    '.75rem',

                  color:
                    '#94a3b8'
                }}
              >
                <span>
                  0%
                </span>

                <span>
                  {
                    topic
                      .progress_percent
                  }%
                </span>

                <span>
                  100%
                </span>
              </div>

            </div>

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
              {getLeafTopics(topic).length}{' '}
              underlying topic
              {
                getLeafTopics(topic)
                  .length ===
                  1
                  ? ''
                  : 's'
              }.
            </small>

          )}


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
              className="secondary-btn"
              onClick={() =>
                void makeCurrentTopic(
                  topic
                )
              }
            >
              Read Now
            </button>


            {isLeaf && (

              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  void updateTopicProgress(
                    topic,
                    100
                  )
                }
              >
                Mark 100%
              </button>

            )}


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


        {children.map(
          child =>
            renderTopic(
              child,
              depth + 1
            )
        )}

      </div>

    );
  }


  /*
   * =========================================
   * LOADING
   * =========================================
   */

  if (
    loading
  ) {

    return (

      <div
        className="page-wrap"
      >

        <TopBar
          title="My Books"
          subtitle="Personal reading and topic progress"
        />


        <section
          className="panel"
        >
          Loading your reading library…
        </section>

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
      className="page-wrap"
    >

      <TopBar

        title="My Books"

        subtitle="Track exactly what you are reading and how much remains"

      />


      {/* =====================================
          HEADER
      ===================================== */}

      <section
        className="panel intro-strip"
      >

        <span
          className="eyebrow"
        >
          PERSONAL READING TRACKER
        </span>


        <h2>
          Your books. Your topics. Your plan.
        </h2>


        <p>
          Add any book you choose, build its
          chapter and topic structure, and track
          your reading from 0% to 100%.
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
          {message}
        </section>

      )}


      {/* =====================================
          ADD BOOK
      ===================================== */}

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


      {/* =====================================
          EMPTY LIBRARY
      ===================================== */}

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


      {/* =====================================
          BOOK SELECTOR
      ===================================== */}

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

                    onClick={() =>
                      setSelectedBookId(
                        book.id
                      )
                    }

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
                        '#f8fafc'
                    }}

                  >

                    <strong>
                      {book.title}
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
                        {book.author}
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


          {/* =================================
              SELECTED BOOK DASHBOARD
          ================================= */}

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
                READING PROGRESS
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
                    {selectedBook.title}
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
                    {bookProgress}%
                  </strong>

                  <small>
                    completed
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
                    'repeat(auto-fit,minmax(130px,1fr))',

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
                    {bookProgress}%
                  </strong>

                  <p>
                    Completed
                  </p>
                </div>


                <div
                  className="callout"
                >
                  <strong>
                    {remainingPercent}%
                  </strong>

                  <p>
                    Remaining
                  </p>
                </div>


                <div
                  className="callout"
                >
                  <strong>
                    {
                      selectedBookTopics
                        .length
                    }
                  </strong>

                  <p>
                    Topics
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
                  onClick={() =>
                    startAddTopic(
                      null
                    )
                  }
                >
                  + Add Topic
                </button>


                {!selectedBook.is_current && (

                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() =>
                      void makeCurrentBook(
                        selectedBook.id
                      )
                    }
                  >
                    Set as Current Book
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


          {/* =================================
              ADD TOPIC FORM
          ================================= */}

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
                Subtopic exactly according to
                your own book.
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
                    placeholder="Example: The First World War and its aftermath"
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
                        selectedBookTopics
                          .map(
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
                                  topic.topic_name
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


          {/* =================================
              TOPIC TREE
          ================================= */}

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
                Topic-by-topic progress
              </h3>


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
                    Start with a Part or Chapter
                    from the book's contents page.
                  </p>


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

                </div>

              ) : (

                <div
                  style={{
                    marginTop:
                      '14px'
                  }}
                >

                  {rootTopics.map(
                    topic =>
                      renderTopic(
                        topic
                      )
                  )}

                </div>

              )}

            </section>

          )}

        </>

      )}

    </div>

  );
}

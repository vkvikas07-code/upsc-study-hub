import {
  useEffect,
  useMemo,
  useState
} from 'react';

import type {
  FormEvent
} from 'react';

import {
  supabase
} from '../lib/supabase';


type BookStatus =
  | 'draft'
  | 'published'
  | 'archived';


type BookRow = {
  id: string;
  title: string;
  subject: string;
  status: BookStatus;
  sort_order: number;
};


type BookTopic = {
  id: string;
  book_id: string;
  subject: string;
  topic_name: string;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};


const BOOK_SELECT = `
  id,
  title,
  subject,
  status,
  sort_order
`;


const TOPIC_SELECT = `
  id,
  book_id,
  subject,
  topic_name,
  parent_id,
  sort_order,
  is_active,
  created_at,
  updated_at
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
 * BOOK STRUCTURE MANAGER
 */

export function BookStructureManager() {

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
      BookTopic[]
    >([]);


  const [
    loadingBooks,
    setLoadingBooks
  ] =
    useState(
      true
    );


  const [
    loadingTopics,
    setLoadingTopics
  ] =
    useState(
      false
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
    useState('');


  /*
   * SUBJECT / BOOK
   */

  const [
    subjectFilter,
    setSubjectFilter
  ] =
    useState(
      'all'
    );


  const [
    selectedBookId,
    setSelectedBookId
  ] =
    useState('');


  /*
   * TOPIC FORM
   */

  const [
    editingId,
    setEditingId
  ] =
    useState<
      string |
      null
    >(
      null
    );


  const [
    topicName,
    setTopicName
  ] =
    useState('');


  const [
    parentId,
    setParentId
  ] =
    useState('');


  const [
    isActive,
    setIsActive
  ] =
    useState(
      true
    );


  /*
   * RESET FORM
   */

  function resetTopicForm() {

    setEditingId(
      null
    );


    setTopicName('');


    setParentId('');


    setIsActive(
      true
    );
  }


  /*
   * LOAD BOOKS
   */

  async function loadBooks() {

    const client =
      supabase;


    if (!client) {

      setMessage(
        'Supabase is not configured.'
      );


      setLoadingBooks(
        false
      );


      return;
    }


    setLoadingBooks(
      true
    );


    setMessage('');


    const {
      data,
      error
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
      error
    ) {

      console.error(
        'Unable to load books:',
        error
      );


      setBooks(
        []
      );


      setMessage(
        error.message
      );


      setLoadingBooks(
        false
      );


      return;
    }


    const cleanBooks:
      BookRow[] =
        (
          data ||
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

            status:
              (
                item.status ||
                'draft'
              ) as
                BookStatus,

            sort_order:
              safeNumber(
                item.sort_order
              )
          })
        );


    setBooks(
      cleanBooks
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


        return (
          cleanBooks[
            0
          ]?.id ||
          ''
        );
      }
    );


    setLoadingBooks(
      false
    );
  }


  /*
   * LOAD TOPICS
   */

  async function loadTopics(
    bookId:
      string
  ) {

    const client =
      supabase;


    if (
      !client ||
      !bookId
    ) {

      setTopics(
        []
      );


      return;
    }


    setLoadingTopics(
      true
    );


    const {
      data,
      error
    } =
      await client
        .from(
          'book_topics'
        )
        .select(
          TOPIC_SELECT
        )
        .eq(
          'book_id',
          bookId
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
      error
    ) {

      console.error(
        'Unable to load book topics:',
        error
      );


      setTopics(
        []
      );


      setMessage(
        error.message
      );


      setLoadingTopics(
        false
      );


      return;
    }


    const cleanTopics:
      BookTopic[] =
        (
          data ||
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
              false,

            created_at:
              String(
                item.created_at ||
                ''
              ),

            updated_at:
              String(
                item.updated_at ||
                ''
              )
          })
        );


    setTopics(
      cleanTopics
    );


    setLoadingTopics(
      false
    );
  }


  /*
   * INITIAL LOAD
   */

  useEffect(
    () => {

      void loadBooks();

    },
    []
  );


  /*
   * LOAD TOPICS
   * WHEN BOOK CHANGES
   */

  useEffect(
    () => {

      resetTopicForm();


      if (
        selectedBookId
      ) {

        void loadTopics(
          selectedBookId
        );

      } else {

        setTopics(
          []
        );
      }

    },
    [
      selectedBookId
    ]
  );


  /*
   * SUBJECT OPTIONS
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
   * BOOKS BY SUBJECT
   */

  const filteredBooks =
    useMemo(
      () => {

        if (
          subjectFilter ===
          'all'
        ) {

          return books;
        }


        return books.filter(
          book =>
            book.subject ===
            subjectFilter
        );

      },
      [
        books,
        subjectFilter
      ]
    );


  /*
   * KEEP VALID BOOK SELECTED
   */

  useEffect(
    () => {

      if (
        filteredBooks.length ===
        0
      ) {

        if (
          selectedBookId
        ) {

          setSelectedBookId(
            ''
          );
        }


        return;
      }


      const currentExists =
        filteredBooks.some(
          book =>
            book.id ===
            selectedBookId
        );


      if (
        !currentExists
      ) {

        setSelectedBookId(
          filteredBooks[
            0
          ].id
        );
      }

    },
    [
      filteredBooks,
      selectedBookId
    ]
  );


  /*
   * SELECTED BOOK
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


  /*
   * MAIN TOPICS
   */

  const rootTopics =
    useMemo(
      () => {

        return topics
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
          );

      },
      [
        topics
      ]
    );


  /*
   * GET SUBTOPICS
   */

  function getSubtopics(
    topicId:
      string
  ) {

    return topics
      .filter(
        topic =>
          topic.parent_id ===
          topicId
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
  }


  /*
   * NEXT SORT ORDER
   */

  function getNextSortOrder(
    selectedParentId:
      string |
      null
  ) {

    const siblings =
      topics.filter(
        topic =>
          topic.parent_id ===
          selectedParentId
      );


    if (
      siblings.length ===
      0
    ) {

      return 10;
    }


    return (
      Math.max(
        ...siblings.map(
          topic =>
            topic.sort_order
        )
      ) +
      10
    );
  }


  /*
   * SCROLL TO FORM
   */

  function scrollToForm() {

    window.requestAnimationFrame(
      () => {

        document
          .getElementById(
            'book-topic-form'
          )
          ?.scrollIntoView({
            behavior:
              'smooth',

            block:
              'start'
          });
      }
    );
  }


  /*
   * ADD MAIN TOPIC
   */

  function startMainTopic() {

    resetTopicForm();


    setMessage(
      'Add a main topic for the selected book.'
    );


    scrollToForm();
  }


  /*
   * ADD SUBTOPIC
   */

  function startSubtopic(
    parent:
      BookTopic
  ) {

    setEditingId(
      null
    );


    setTopicName('');


    setParentId(
      parent.id
    );


    setIsActive(
      true
    );


    setMessage(
      `Adding subtopic under: ${parent.topic_name}`
    );


    scrollToForm();
  }


  /*
   * EDIT TOPIC
   */

  function startEdit(
    topic:
      BookTopic
  ) {

    setEditingId(
      topic.id
    );


    setTopicName(
      topic.topic_name
    );


    setParentId(
      topic.parent_id ||
      ''
    );


    setIsActive(
      topic.is_active
    );


    setMessage(
      `Editing: ${topic.topic_name}`
    );


    scrollToForm();
  }


  /*
   * SAVE TOPIC
   */

  async function saveTopic(
    event:
      FormEvent
  ) {

    event.preventDefault();


    const client =
      supabase;


    if (!client) {

      setMessage(
        'Supabase is not configured.'
      );


      return;
    }


    if (
      !selectedBook
    ) {

      setMessage(
        'Select a book first.'
      );


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
      await client
        .auth
        .getUser();


    if (!user) {

      setMessage(
        'Your session expired. Please sign in again.'
      );


      return;
    }


    setSaving(
      true
    );


    /*
     * UPDATE
     */

    if (
      editingId
    ) {

      const {
        error
      } =
        await client
          .from(
            'book_topics'
          )
          .update({

            topic_name:
              cleanName,

            subject:
              selectedBook.subject,

            is_active:
              isActive

          })
          .eq(
            'id',
            editingId
          );


      if (
        error
      ) {

        console.error(
          'Unable to update topic:',
          error
        );


        setMessage(
          error.message
        );


        setSaving(
          false
        );


        return;
      }


      setMessage(
        'Topic updated successfully.'
      );

    } else {

      /*
       * CREATE
       */

      const actualParentId =
        parentId ||
        null;


      const nextSortOrder =
        getNextSortOrder(
          actualParentId
        );


      const {
        error
      } =
        await client
          .from(
            'book_topics'
          )
          .insert({

            book_id:
              selectedBook.id,

            subject:
              selectedBook.subject,

            topic_name:
              cleanName,

            parent_id:
              actualParentId,

            sort_order:
              nextSortOrder,

            is_active:
              isActive,

            created_by:
              user.id

          });


      if (
        error
      ) {

        console.error(
          'Unable to create topic:',
          error
        );


        setMessage(
          error.message
        );


        setSaving(
          false
        );


        return;
      }


      setMessage(
        actualParentId
          ? 'Subtopic added successfully.'
          : 'Main topic added successfully.'
      );
    }


    setSaving(
      false
    );


    resetTopicForm();


    await loadTopics(
      selectedBook.id
    );
  }


  /*
   * SHOW / HIDE
   */

  async function toggleActive(
    topic:
      BookTopic
  ) {

    const client =
      supabase;


    if (!client) {

      setMessage(
        'Supabase is not configured.'
      );


      return;
    }


    const next =
      !topic.is_active;


    const {
      error
    } =
      await client
        .from(
          'book_topics'
        )
        .update({
          is_active:
            next
        })
        .eq(
          'id',
          topic.id
        );


    if (
      error
    ) {

      console.error(
        'Unable to update topic visibility:',
        error
      );


      setMessage(
        error.message
      );


      return;
    }


    setMessage(
      next
        ? 'Topic activated.'
        : 'Topic hidden from students.'
    );


    await loadTopics(
      topic.book_id
    );
  }


  /*
   * DELETE TOPIC
   */

  async function deleteTopic(
    topic:
      BookTopic
  ) {

    const client =
      supabase;


    if (!client) {

      setMessage(
        'Supabase is not configured.'
      );


      return;
    }


    const children =
      getSubtopics(
        topic.id
      );


    const warning =
      children.length >
        0

        ? `This topic has ${children.length} subtopic(s). Deleting it will also delete those subtopics and their saved progress. Continue?`

        : `Delete "${topic.topic_name}"?`;


    const confirmed =
      window.confirm(
        warning
      );


    if (
      !confirmed
    ) {

      return;
    }


    const {
      error
    } =
      await client
        .from(
          'book_topics'
        )
        .delete()
        .eq(
          'id',
          topic.id
        );


    if (
      error
    ) {

      console.error(
        'Unable to delete topic:',
        error
      );


      setMessage(
        error.message
      );


      return;
    }


    if (
      editingId ===
      topic.id
    ) {

      resetTopicForm();
    }


    setMessage(
      'Topic deleted successfully.'
    );


    await loadTopics(
      topic.book_id
    );
  }


  /*
   * MOVE TOPIC
   */

  async function moveTopic(
    topic:
      BookTopic,
    direction:
      'up' |
      'down'
  ) {

    /*
     * IMPORTANT:
     * use local non-null client
     * inside Promise.map()
     */

    const client =
      supabase;


    if (!client) {

      setMessage(
        'Supabase is not configured.'
      );


      return;
    }


    /*
     * ONLY SIBLINGS
     */

    const siblings =
      topics
        .filter(
          item =>
            item.parent_id ===
            topic.parent_id
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


    const currentIndex =
      siblings.findIndex(
        item =>
          item.id ===
          topic.id
      );


    if (
      currentIndex <
      0
    ) {

      return;
    }


    const targetIndex =
      direction ===
        'up'
        ? currentIndex -
          1
        : currentIndex +
          1;


    if (
      targetIndex <
        0 ||
      targetIndex >=
        siblings.length
    ) {

      return;
    }


    const reordered =
      [
        ...siblings
      ];


    const [
      moved
    ] =
      reordered.splice(
        currentIndex,
        1
      );


    if (
      !moved
    ) {

      return;
    }


    reordered.splice(
      targetIndex,
      0,
      moved
    );


    setMessage(
      'Updating order...'
    );


    /*
     * SAVE NORMALISED ORDER
     */

    const results =
      await Promise.all(

        reordered.map(
          (
            item,
            itemIndex
          ) =>

            client
              .from(
                'book_topics'
              )
              .update({

                sort_order:
                  (
                    itemIndex +
                    1
                  ) *
                  10

              })
              .eq(
                'id',
                item.id
              )
        )

      );


    const failed =
      results.find(
        result =>
          result.error
      );


    if (
      failed?.error
    ) {

      console.error(
        'Unable to reorder topics:',
        failed.error
      );


      setMessage(
        failed.error.message
      );


      return;
    }


    setMessage(
      'Order updated.'
    );


    await loadTopics(
      topic.book_id
    );
  }


  /*
   * COUNTS
   */

  const subtopicCount =
    useMemo(
      () => {

        return topics.filter(
          topic =>
            Boolean(
              topic.parent_id
            )
        ).length;

      },
      [
        topics
      ]
    );


  const activeCount =
    useMemo(
      () => {

        return topics.filter(
          topic =>
            topic.is_active
        ).length;

      },
      [
        topics
      ]
    );


  /*
   * CURRENT FORM PARENT
   */

  const formParent =
    useMemo(
      () => {

        if (
          !parentId
        ) {

          return null;
        }


        return (
          topics.find(
            topic =>
              topic.id ===
              parentId
          ) ||
          null
        );

      },
      [
        topics,
        parentId
      ]
    );


  return (

    <div>

      {/* =====================================
          HEADER
      ===================================== */}

      <section
        className="panel"
      >

        <span
          className="eyebrow"
        >
          ADMIN • BOOK STRUCTURE
        </span>


        <h2>
          Book Topic Manager
        </h2>


        <p>
          Build every subject as
          Subject → Book → Topic → Subtopic.
          Students will later tick the smallest
          readable unit as completed.
        </p>


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
                Standard Books
              </span>


              <strong>
                {books.length}
              </strong>

            </div>

          </article>


          <article
            className="metric-card"
          >

            <div>

              <span>
                Main Topics
              </span>


              <strong>
                {rootTopics.length}
              </strong>

            </div>

          </article>


          <article
            className="metric-card"
          >

            <div>

              <span>
                Subtopics
              </span>


              <strong>
                {subtopicCount}
              </strong>

            </div>

          </article>

        </div>


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

      </section>


      {/* =====================================
          SELECT SUBJECT + BOOK
      ===================================== */}

      <section
        className="panel admin-form"
        style={{
          marginTop:
            '18px'
        }}
      >

        <span
          className="eyebrow"
        >
          STEP 1
        </span>


        <h3>
          Select Subject and Book
        </h3>


        <div
          className="form-two"
        >

          {/* SUBJECT */}

          <label>

            Subject

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


          {/* BOOK */}

          <label>

            Book

            <select
              value={
                selectedBookId
              }

              onChange={
                event =>
                  setSelectedBookId(
                    event
                      .target
                      .value
                  )
              }

              disabled={
                filteredBooks.length ===
                0
              }
            >

              {filteredBooks.length ===
                0 && (

                <option value="">
                  No books available
                </option>

              )}


              {filteredBooks.map(
                book => (

                  <option
                    key={
                      book.id
                    }

                    value={
                      book.id
                    }
                  >
                    {book.title}
                  </option>

                )
              )}

            </select>

          </label>

        </div>


        {loadingBooks && (

          <p>
            Loading standard books...
          </p>

        )}


        {!loadingBooks &&
          books.length ===
            0 && (

          <div
            className="callout"
          >
            No Standard Book entries exist yet.
            Add books first from the Study
            Resources manager.
          </div>

        )}


        {selectedBook && (

          <div
            className="callout"
            style={{
              marginTop:
                '14px'
            }}
          >

            <strong>
              Selected Book
            </strong>


            <p>
              Subject:{' '}
              {selectedBook.subject}
              {' • '}
              Book:{' '}
              {selectedBook.title}
              {' • '}
              Status:{' '}
              {selectedBook.status}
            </p>

          </div>

        )}

      </section>


      {/* =====================================
          CREATE / EDIT TOPIC
      ===================================== */}

      {selectedBook && (

        <section
          id="book-topic-form"

          className="panel admin-form"

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
                STEP 2
              </span>


              <h3>
                {
                  editingId
                    ? 'Edit Topic'
                    : parentId
                    ? 'Add Subtopic'
                    : 'Add Main Topic'
                }
              </h3>

            </div>


            <button
              type="button"
              className="secondary-btn"

              onClick={
                startMainTopic
              }
            >
              + Main Topic
            </button>

          </div>


          {formParent && (

            <div
              className="callout"
              style={{
                marginBottom:
                  '14px'
              }}
            >

              Adding under:

              <strong>
                {' '}
                {
                  formParent
                    .topic_name
                }
              </strong>

            </div>

          )}


          <form
            onSubmit={
              saveTopic
            }
          >

            <label>

              {
                parentId
                  ? 'Subtopic Name'
                  : 'Topic Name'
              }

              <input
                type="text"

                value={
                  topicName
                }

                onChange={
                  event =>
                    setTopicName(
                      event
                        .target
                        .value
                    )
                }

                placeholder={
                  parentId
                    ? 'Example: Article 14'
                    : 'Example: Fundamental Rights'
                }

                required
              />

            </label>


            <label
              className="checkbox-row"
            >

              <input
                type="checkbox"

                checked={
                  isActive
                }

                onChange={
                  event =>
                    setIsActive(
                      event
                        .target
                        .checked
                    )
                }
              />


              Active and visible to students

            </label>


            <div
              style={{
                display:
                  'flex',

                gap:
                  '10px',

                flexWrap:
                  'wrap',

                marginTop:
                  '14px'
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
                    ? 'Saving...'
                    : editingId
                    ? 'Update'
                    : parentId
                    ? 'Add Subtopic'
                    : 'Add Topic'
                }

              </button>


              {(editingId ||
                parentId) && (

                <button
                  type="button"
                  className="secondary-btn"

                  onClick={
                    resetTopicForm
                  }
                >
                  Cancel
                </button>

              )}

            </div>

          </form>

        </section>

      )}


      {/* =====================================
          BOOK STRUCTURE
      ===================================== */}

      {selectedBook && (

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
                STEP 3
              </span>


              <h3>
                Book Structure
              </h3>

            </div>


            <button
              type="button"
              className="secondary-btn"

              onClick={() =>
                void loadTopics(
                  selectedBook.id
                )
              }
            >
              Refresh
            </button>

          </div>


          <p>
            {selectedBook.subject}
            {' → '}

            <strong>
              {selectedBook.title}
            </strong>
          </p>


          <small>
            Active items: {activeCount}
            {' • '}
            Main topics: {rootTopics.length}
            {' • '}
            Subtopics: {subtopicCount}
          </small>


          {loadingTopics && (

            <div
              className="callout"
              style={{
                marginTop:
                  '14px'
              }}
            >
              Loading book structure...
            </div>

          )}


          {!loadingTopics &&
            rootTopics.length ===
              0 && (

            <div
              className="callout"
              style={{
                marginTop:
                  '14px'
              }}
            >
              No topics added yet.
              Click + Main Topic to begin.
            </div>

          )}


          <div
            style={{
              display:
                'grid',

              gap:
                '14px',

              marginTop:
                '16px'
            }}
          >

            {rootTopics.map(
              (
                topic,
                topicIndex
              ) => {

                const subtopics =
                  getSubtopics(
                    topic.id
                  );


                return (

                  <div
                    key={
                      topic.id
                    }

                    style={{
                      border:
                        '1px solid rgba(255,255,255,.08)',

                      borderRadius:
                        '16px',

                      padding:
                        '14px',

                      background:
                        'rgba(255,255,255,.025)'
                    }}
                  >

                    {/* MAIN TOPIC */}

                    <div
                      style={{
                        display:
                          'flex',

                        justifyContent:
                          'space-between',

                        gap:
                          '12px',

                        alignItems:
                          'flex-start',

                        flexWrap:
                          'wrap'
                      }}
                    >

                      <div>

                        <div
                          style={{
                            display:
                              'flex',

                            gap:
                              '7px',

                            flexWrap:
                              'wrap',

                            alignItems:
                              'center'
                          }}
                        >

                          <span
                            className="tag"
                          >
                            Topic {
                              topicIndex +
                              1
                            }
                          </span>


                          <span
                            className="tag"
                          >
                            {
                              topic.is_active
                                ? 'Active'
                                : 'Hidden'
                            }
                          </span>


                          {subtopics.length >
                            0 && (

                            <span
                              className="tag"
                            >
                              {
                                subtopics.length
                              } subtopic{
                                subtopics.length ===
                                  1
                                  ? ''
                                  : 's'
                              }
                            </span>

                          )}

                        </div>


                        <h3
                          style={{
                            marginTop:
                              '9px'
                          }}
                        >
                          {
                            topic
                              .topic_name
                          }
                        </h3>

                      </div>


                      {/* TOPIC ACTIONS */}

                      <div
                        style={{
                          display:
                            'flex',

                          gap:
                            '6px',

                          flexWrap:
                            'wrap'
                        }}
                      >

                        <button
                          type="button"
                          className="secondary-btn"

                          disabled={
                            topicIndex ===
                            0
                          }

                          onClick={() =>
                            void moveTopic(
                              topic,
                              'up'
                            )
                          }
                        >
                          ↑
                        </button>


                        <button
                          type="button"
                          className="secondary-btn"

                          disabled={
                            topicIndex ===
                            rootTopics.length -
                              1
                          }

                          onClick={() =>
                            void moveTopic(
                              topic,
                              'down'
                            )
                          }
                        >
                          ↓
                        </button>


                        <button
                          type="button"
                          className="secondary-btn"

                          onClick={() =>
                            startEdit(
                              topic
                            )
                          }
                        >
                          Edit
                        </button>


                        <button
                          type="button"
                          className="primary-btn"

                          onClick={() =>
                            startSubtopic(
                              topic
                            )
                          }
                        >
                          + Subtopic
                        </button>


                        <button
                          type="button"
                          className="secondary-btn"

                          onClick={() =>
                            void toggleActive(
                              topic
                            )
                          }
                        >
                          {
                            topic.is_active
                              ? 'Hide'
                              : 'Activate'
                          }
                        </button>


                        <button
                          type="button"
                          className="secondary-btn"

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


                    {/* SUBTOPICS */}

                    {subtopics.length >
                      0 && (

                      <div
                        style={{
                          display:
                            'grid',

                          gap:
                            '8px',

                          marginTop:
                            '12px',

                          paddingLeft:
                            '18px',

                          borderLeft:
                            '3px solid rgba(20,184,166,.22)'
                        }}
                      >

                        {subtopics.map(
                          (
                            subtopic,
                            subtopicIndex
                          ) => (

                            <div
                              key={
                                subtopic.id
                              }

                              style={{
                                display:
                                  'flex',

                                justifyContent:
                                  'space-between',

                                gap:
                                  '10px',

                                flexWrap:
                                  'wrap',

                                alignItems:
                                  'center',

                                padding:
                                  '10px 12px',

                                border:
                                  '1px solid rgba(255,255,255,.07)',

                                borderRadius:
                                  '12px',

                                background:
                                  '#0e1525'
                              }}
                            >

                              <div>

                                <small>
                                  Subtopic {
                                    subtopicIndex +
                                    1
                                  }
                                </small>


                                <div>

                                  <strong>
                                    {
                                      subtopic
                                        .topic_name
                                    }
                                  </strong>


                                  {' '}


                                  <span
                                    className="tag"
                                  >
                                    {
                                      subtopic
                                        .is_active
                                        ? 'Active'
                                        : 'Hidden'
                                    }
                                  </span>

                                </div>

                              </div>


                              {/* SUBTOPIC ACTIONS */}

                              <div
                                style={{
                                  display:
                                    'flex',

                                  gap:
                                    '6px',

                                  flexWrap:
                                    'wrap'
                                }}
                              >

                                <button
                                  type="button"
                                  className="secondary-btn"

                                  disabled={
                                    subtopicIndex ===
                                    0
                                  }

                                  onClick={() =>
                                    void moveTopic(
                                      subtopic,
                                      'up'
                                    )
                                  }
                                >
                                  ↑
                                </button>


                                <button
                                  type="button"
                                  className="secondary-btn"

                                  disabled={
                                    subtopicIndex ===
                                    subtopics.length -
                                      1
                                  }

                                  onClick={() =>
                                    void moveTopic(
                                      subtopic,
                                      'down'
                                    )
                                  }
                                >
                                  ↓
                                </button>


                                <button
                                  type="button"
                                  className="secondary-btn"

                                  onClick={() =>
                                    startEdit(
                                      subtopic
                                    )
                                  }
                                >
                                  Edit
                                </button>


                                <button
                                  type="button"
                                  className="secondary-btn"

                                  onClick={() =>
                                    void toggleActive(
                                      subtopic
                                    )
                                  }
                                >
                                  {
                                    subtopic
                                      .is_active
                                      ? 'Hide'
                                      : 'Activate'
                                  }
                                </button>


                                <button
                                  type="button"
                                  className="secondary-btn"

                                  onClick={() =>
                                    void deleteTopic(
                                      subtopic
                                    )
                                  }
                                >
                                  Delete
                                </button>

                              </div>

                            </div>

                          )
                        )}

                      </div>

                    )}

                  </div>

                );
              }
            )}

          </div>

        </section>

      )}

    </div>

  );
}

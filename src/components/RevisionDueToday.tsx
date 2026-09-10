import {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


type ProgressRow = {
  book_topic_id: string;

  revision_count:
    number |
    string |
    null;

  next_revision_due_at:
    string |
    null;
};


type TopicRow = {
  id: string;
  book_id: string;
  topic_name: string;

  parent_id:
    string |
    null;

  is_active: boolean;
};


type BookRow = {
  id: string;
  title: string;
  subject: string;
};


type RevisionItem = {
  topicId: string;

  topicName: string;

  parentTopicName:
    string |
    null;

  bookId: string;
  bookTitle: string;
  subject: string;

  revisionCount: number;

  dueAt: string;
};


type RevisionDueTodayProps = {
  onOpenTracker?: () => void;
};


/*
 * =========================================
 * SAFE REVISION COUNT
 * =========================================
 */

function cleanRevisionCount(
  value:
    unknown
) {

  const number =
    Number(
      value
    );


  if (
    !Number.isFinite(
      number
    )
  ) {

    return 0;
  }


  return Math.min(
    3,
    Math.max(
      0,
      Math.round(
        number
      )
    )
  );
}


/*
 * =========================================
 * LOCAL DAY HELPERS
 * =========================================
 */

function startOfToday() {

  const date =
    new Date();


  date.setHours(
    0,
    0,
    0,
    0
  );


  return date;
}


function startOfTomorrow() {

  const date =
    startOfToday();


  date.setDate(
    date.getDate() +
    1
  );


  return date;
}


/*
 * =========================================
 * FORMAT DATE
 * =========================================
 */

function formatDate(
  value:
    string
) {

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
 * =========================================
 * DAYS DIFFERENCE
 * =========================================
 */

function daysBetween(
  first:
    Date,
  second:
    Date
) {

  const dayMs =
    24 *
    60 *
    60 *
    1000;


  const firstDay =
    new Date(
      first
    );


  firstDay.setHours(
    0,
    0,
    0,
    0
  );


  const secondDay =
    new Date(
      second
    );


  secondDay.setHours(
    0,
    0,
    0,
    0
  );


  return Math.round(
    (
      secondDay.getTime() -
      firstDay.getTime()
    ) /
    dayMs
  );
}


/*
 * =========================================
 * REVISION LABEL
 * =========================================
 */

function getRevisionLabel(
  revisionCount:
    number
) {

  if (
    revisionCount ===
    0
  ) {

    return 'Revision 1';
  }


  if (
    revisionCount ===
    1
  ) {

    return 'Revision 2';
  }


  return 'Final Revision';
}


/*
 * =========================================
 * REVISION DUE TODAY
 * =========================================
 */

export function RevisionDueToday({
  onOpenTracker
}: RevisionDueTodayProps) {

  /*
   * DATA
   */

  const [
    items,
    setItems
  ] =
    useState<
      RevisionItem[]
    >([]);


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
    error,
    setError
  ] =
    useState('');


  const [
    message,
    setMessage
  ] =
    useState('');


  const [
    savingTopicId,
    setSavingTopicId
  ] =
    useState<
      string |
      null
    >(
      null
    );


  /*
   * =========================================
   * LOAD REVISION SCHEDULE
   * =========================================
   */

  async function loadRevisionSchedule() {

    const client =
      supabase;


    if (!client) {

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


    setError('');


    setMessage('');


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


      setItems(
        []
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
     * LOAD ALL OUTSTANDING
     * REVISION RECORDS
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
          revision_count,
          next_revision_due_at
          `
        )
        .eq(
          'user_id',
          user.id
        )
        .eq(
          'completed',
          true
        )
        .lt(
          'revision_count',
          3
        )
        .not(
          'next_revision_due_at',
          'is',
          null
        )
        .order(
          'next_revision_due_at',
          {
            ascending:
              true
          }
        );


    if (
      progressError
    ) {

      console.error(
        'Unable to load revision schedule:',
        progressError
      );


      setError(
        progressError.message
      );


      setItems(
        []
      );


      setLoading(
        false
      );


      return;
    }


    const progressRows:
      ProgressRow[] =
        (
          progressData ||
          []
        ).map(
          item => ({

            book_topic_id:
              String(
                item.book_topic_id
              ),

            revision_count:
              item.revision_count,

            next_revision_due_at:
              item.next_revision_due_at
                ? String(
                    item.next_revision_due_at
                  )
                : null

          })
        );


    if (
      progressRows.length ===
      0
    ) {

      setItems(
        []
      );


      setLoading(
        false
      );


      return;
    }


    /*
     * LOAD TOPICS
     */

    const topicIds =
      progressRows.map(
        row =>
          row.book_topic_id
      );


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
          `
          id,
          book_id,
          topic_name,
          parent_id,
          is_active
          `
        )
        .in(
          'id',
          topicIds
        )
        .eq(
          'is_active',
          true
        );


    if (
      topicError
    ) {

      console.error(
        'Unable to load revision topics:',
        topicError
      );


      setError(
        topicError.message
      );


      setLoading(
        false
      );


      return;
    }


    const topicRows:
      TopicRow[] =
        (
          topicData ||
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

            is_active:
              item.is_active !==
              false

          })
        );


    /*
     * LOAD PARENT TOPICS
     */

    const parentIds =
      Array.from(
        new Set(
          topicRows
            .map(
              topic =>
                topic.parent_id
            )
            .filter(
              (
                value
              ):
                value is string =>
                  Boolean(
                    value
                  )
            )
        )
      );


    let parentRows:
      TopicRow[] = [];


    if (
      parentIds.length >
      0
    ) {

      const {
        data:
          parentData,

        error:
          parentError
      } =
        await client
          .from(
            'book_topics'
          )
          .select(
            `
            id,
            book_id,
            topic_name,
            parent_id,
            is_active
            `
          )
          .in(
            'id',
            parentIds
          );


      if (
        parentError
      ) {

        console.error(
          'Unable to load parent topics:',
          parentError
        );

      } else {

        parentRows =
          (
            parentData ||
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

              is_active:
                item.is_active !==
                false

            })
          );
      }
    }


    /*
     * LOAD BOOKS
     */

    const bookIds =
      Array.from(
        new Set(
          topicRows.map(
            topic =>
              topic.book_id
          )
        )
      );


    if (
      bookIds.length ===
      0
    ) {

      setItems(
        []
      );


      setLoading(
        false
      );


      return;
    }


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
          `
          id,
          title,
          subject
          `
        )
        .in(
          'id',
          bookIds
        )
        .eq(
          'resource_type',
          'standard_book'
        )
        .eq(
          'status',
          'published'
        );


    if (
      bookError
    ) {

      console.error(
        'Unable to load revision books:',
        bookError
      );


      setError(
        bookError.message
      );


      setLoading(
        false
      );


      return;
    }


    const bookRows:
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
              )

          })
        );


    /*
     * BUILD DISPLAY ITEMS
     */

    const nextItems:
      RevisionItem[] = [];


    progressRows.forEach(
      progress => {

        if (
          !progress
            .next_revision_due_at
        ) {

          return;
        }


        const topic =
          topicRows.find(
            item =>
              item.id ===
              progress.book_topic_id
          );


        if (!topic) {

          return;
        }


        const book =
          bookRows.find(
            item =>
              item.id ===
              topic.book_id
          );


        if (!book) {

          return;
        }


        const parent =
          topic.parent_id
            ? parentRows.find(
                item =>
                  item.id ===
                  topic.parent_id
              )
            : null;


        nextItems.push({

          topicId:
            topic.id,

          topicName:
            topic.topic_name,

          parentTopicName:
            parent?.topic_name ||
            null,

          bookId:
            book.id,

          bookTitle:
            book.title,

          subject:
            book.subject,

          revisionCount:
            cleanRevisionCount(
              progress.revision_count
            ),

          dueAt:
            progress
              .next_revision_due_at

        });
      }
    );


    nextItems.sort(
      (
        first,
        second
      ) =>
        new Date(
          first.dueAt
        ).getTime() -
        new Date(
          second.dueAt
        ).getTime()
    );


    setItems(
      nextItems
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

      void loadRevisionSchedule();

    },
    []
  );


  /*
   * =========================================
   * DUE / OVERDUE
   * =========================================
   */

  const dueItems =
    useMemo(
      () => {

        const tomorrow =
          startOfTomorrow();


        return items.filter(
          item => {

            const due =
              new Date(
                item.dueAt
              );


            return (
              !Number.isNaN(
                due.getTime()
              ) &&
              due <
              tomorrow
            );
          }
        );

      },
      [
        items
      ]
    );


  /*
   * OVERDUE
   */

  const overdueItems =
    useMemo(
      () => {

        const today =
          startOfToday();


        return dueItems.filter(
          item =>
            new Date(
              item.dueAt
            ) <
            today
        );

      },
      [
        dueItems
      ]
    );


  /*
   * DUE TODAY
   */

  const todayItems =
    useMemo(
      () => {

        const today =
          startOfToday();


        const tomorrow =
          startOfTomorrow();


        return dueItems.filter(
          item => {

            const due =
              new Date(
                item.dueAt
              );


            return (
              due >=
                today &&
              due <
                tomorrow
            );
          }
        );

      },
      [
        dueItems
      ]
    );


  /*
   * NEXT UPCOMING
   */

  const nextUpcoming =
    useMemo(
      () => {

        const tomorrow =
          startOfTomorrow();


        return (
          items.find(
            item =>
              new Date(
                item.dueAt
              ) >=
              tomorrow
          ) ||
          null
        );

      },
      [
        items
      ]
    );


  /*
   * =========================================
   * COMPLETE REVISION
   * =========================================
   */

  async function completeRevision(
    item:
      RevisionItem
  ) {

    const client =
      supabase;


    if (!client) {

      setError(
        'Supabase is not configured.'
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

      setSignedIn(
        false
      );


      setMessage(
        'Sign in to save revision progress.'
      );


      return;
    }


    const nextRevisionCount =
      Math.min(
        3,
        item.revisionCount +
        1
      );


    setSavingTopicId(
      item.topicId
    );


    setMessage('');


    const {
      error:
        saveError
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
              item.topicId,

            completed:
              true,

            revision_count:
              nextRevisionCount
          },
          {
            onConflict:
              'user_id,book_topic_id'
          }
        );


    if (
      saveError
    ) {

      console.error(
        'Unable to complete revision:',
        saveError
      );


      setError(
        saveError.message
      );


      setSavingTopicId(
        null
      );


      return;
    }


    if (
      nextRevisionCount ===
      1
    ) {

      setMessage(
        'Revision 1 completed. Revision 2 has been scheduled automatically.'
      );

    } else if (
      nextRevisionCount ===
      2
    ) {

      setMessage(
        'Revision 2 completed. Final Revision has been scheduled automatically.'
      );

    } else {

      setMessage(
        'Final Revision completed. This portion is fully revised.'
      );
    }


    setSavingTopicId(
      null
    );


    /*
     * RELOAD TO GET THE
     * NEW DUE DATE CREATED
     * BY THE DATABASE TRIGGER
     */

    await loadRevisionSchedule();
  }


  /*
   * =========================================
   * STATUS TEXT
   * =========================================
   */

  function getDueStatus(
    item:
      RevisionItem
  ) {

    const due =
      new Date(
        item.dueAt
      );


    const difference =
      daysBetween(
        new Date(),
        due
      );


    if (
      difference <
      0
    ) {

      const days =
        Math.abs(
          difference
        );


      return (
        `Overdue by ${days} ${
          days ===
          1
            ? 'day'
            : 'days'
        }`
      );
    }


    if (
      difference ===
      0
    ) {

      return 'Due today';
    }


    if (
      difference ===
      1
    ) {

      return 'Due tomorrow';
    }


    return (
      `Due in ${difference} days`
    );
  }


  /*
   * =========================================
   * RENDER REVISION ITEM
   * =========================================
   */

  function renderRevisionItem(
    item:
      RevisionItem
  ) {

    const overdue =
      new Date(
        item.dueAt
      ) <
      startOfToday();


    const saving =
      savingTopicId ===
      item.topicId;


    const revisionLabel =
      getRevisionLabel(
        item.revisionCount
      );


    return (

      <article
        key={
          item.topicId
        }

        style={{
          border:
            overdue
              ? '1px solid rgba(248,113,113,.35)'
              : '1px solid rgba(255,255,255,.08)',

          borderRadius:
            '14px',

          padding:
            '14px',

          background:
            overdue
              ? 'rgba(127,29,29,.12)'
              : 'rgba(255,255,255,.025)'
        }}
      >

        {/* SUBJECT + STATUS */}

        <div
          style={{
            display:
              'flex',

            justifyContent:
              'space-between',

            alignItems:
              'flex-start',

            gap:
              '10px',

            flexWrap:
              'wrap'
          }}
        >

          <span
            className="tag"
          >
            {item.subject}
          </span>


          <strong
            style={{
              color:
                overdue
                  ? '#fca5a5'
                  : '#5eead4'
            }}
          >
            {getDueStatus(
              item
            )}
          </strong>

        </div>


        {/* BOOK */}

        <h3
          style={{
            marginTop:
              '10px',

            marginBottom:
              '5px'
          }}
        >
          {item.bookTitle}
        </h3>


        {/* TOPIC HIERARCHY */}

        {item.parentTopicName ? (

          <p
            style={{
              margin:
                '4px 0'
            }}
          >
            <strong>
              {item.parentTopicName}
            </strong>

            {' → '}

            {item.topicName}
          </p>

        ) : (

          <p
            style={{
              margin:
                '4px 0'
            }}
          >
            <strong>
              {item.topicName}
            </strong>
          </p>

        )}


        {/* REVISION DETAILS */}

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
            Next: {revisionLabel}
          </span>


          <span
            className="tag"
          >
            Due {formatDate(
              item.dueAt
            )}
          </span>

        </div>


        {/* ACTION */}

        <button
          type="button"

          className="primary-btn"

          disabled={
            saving
          }

          onClick={() =>
            void completeRevision(
              item
            )
          }

          style={{
            marginTop:
              '12px'
          }}
        >

          {
            saving
              ? 'Saving...'
              : `Complete ${revisionLabel}`
          }

        </button>

      </article>

    );
  }


  /*
   * =========================================
   * PAGE
   * =========================================
   */

  return (

    <section
      className="panel"
    >

      {/* =====================================
          HEADER
      ===================================== */}

      <div
        className="panel-head"
      >

        <div>

          <span
            className="eyebrow"
          >
            REVISION SCHEDULE
          </span>


          <h2>
            Revision Due Today
          </h2>


          <p>
            Your reading tracker automatically
            schedules the next revision after
            each completed stage.
          </p>

        </div>


        <button
          type="button"
          className="text-btn"

          onClick={() =>
            void loadRevisionSchedule()
          }
        >
          Refresh
        </button>

      </div>


      {/* =====================================
          LOADING
      ===================================== */}

      {loading && (

        <p>
          Checking today's revision schedule...
        </p>

      )}


      {/* =====================================
          ERROR
      ===================================== */}

      {!loading &&
        error && (

        <div
          className="callout"
        >
          {error}
        </div>

      )}


      {/* =====================================
          SIGNED OUT
      ===================================== */}

      {!loading &&
        !error &&
        !signedIn && (

        <div
          className="callout"
        >

          <strong>
            Sign in to view your revision schedule
          </strong>


          <p>
            Revision dates are stored separately
            for each student.
          </p>

        </div>

      )}


      {/* =====================================
          MESSAGE
      ===================================== */}

      {message && (

        <div
          className="callout"

          style={{
            marginTop:
              '12px'
          }}
        >
          {message}
        </div>

      )}


      {/* =====================================
          SUMMARY COUNTS
      ===================================== */}

      {!loading &&
        !error &&
        signedIn && (

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
                Due now
              </span>


              <strong>
                {dueItems.length}
              </strong>


              <small>
                Today + overdue
              </small>

            </div>

          </article>


          <article
            className="metric-card"
          >

            <div>

              <span>
                Overdue
              </span>


              <strong>
                {overdueItems.length}
              </strong>


              <small>
                Needs attention
              </small>

            </div>

          </article>


          <article
            className="metric-card"
          >

            <div>

              <span>
                Due today
              </span>


              <strong>
                {todayItems.length}
              </strong>


              <small>
                Today's revision
              </small>

            </div>

          </article>

        </div>

      )}


      {/* =====================================
          NOTHING DUE
      ===================================== */}

      {!loading &&
        !error &&
        signedIn &&
        dueItems.length ===
          0 && (

        <div
          className="callout"

          style={{
            marginTop:
              '16px'
          }}
        >

          <strong>
            ✓ No revision is due today
          </strong>


          {nextUpcoming ? (

            <p>
              Your next revision is
              {' '}
              <strong>
                {getRevisionLabel(
                  nextUpcoming.revisionCount
                )}
              </strong>
              {' '}
              for
              {' '}
              <strong>
                {nextUpcoming.topicName}
              </strong>
              {' '}
              on
              {' '}
              <strong>
                {formatDate(
                  nextUpcoming.dueAt
                )}
              </strong>.
            </p>

          ) : (

            <p>
              Read new topics or continue your
              existing preparation to create the
              next revision schedule.
            </p>

          )}

        </div>

      )}


      {/* =====================================
          OVERDUE
      ===================================== */}

      {!loading &&
        !error &&
        signedIn &&
        overdueItems.length >
          0 && (

        <div
          style={{
            marginTop:
              '18px'
          }}
        >

          <span
            className="eyebrow"
          >
            OVERDUE
          </span>


          <h3>
            Complete these first
          </h3>


          <div
            style={{
              display:
                'grid',

              gap:
                '12px',

              marginTop:
                '12px'
            }}
          >

            {overdueItems.map(
              item =>
                renderRevisionItem(
                  item
                )
            )}

          </div>

        </div>

      )}


      {/* =====================================
          DUE TODAY
      ===================================== */}

      {!loading &&
        !error &&
        signedIn &&
        todayItems.length >
          0 && (

        <div
          style={{
            marginTop:
              '20px'
          }}
        >

          <span
            className="eyebrow"
          >
            TODAY
          </span>


          <h3>
            Today's revision
          </h3>


          <div
            style={{
              display:
                'grid',

              gap:
                '12px',

              marginTop:
                '12px'
            }}
          >

            {todayItems.map(
              item =>
                renderRevisionItem(
                  item
                )
            )}

          </div>

        </div>

      )}


      {/* =====================================
          NEXT UPCOMING
      ===================================== */}

      {!loading &&
        !error &&
        signedIn &&
        dueItems.length >
          0 &&
        nextUpcoming && (

        <div
          className="callout"

          style={{
            marginTop:
              '18px'
          }}
        >

          <strong>
            Next upcoming
          </strong>


          <p>
            {getRevisionLabel(
              nextUpcoming.revisionCount
            )}
            {' • '}
            {nextUpcoming.subject}
            {' • '}
            {nextUpcoming.bookTitle}
            {' • '}
            {nextUpcoming.topicName}
            {' • '}
            {formatDate(
              nextUpcoming.dueAt
            )}
          </p>

        </div>

      )}


      {/* =====================================
          OPEN FULL TRACKER
      ===================================== */}

      {onOpenTracker &&
        signedIn && (

        <button
          type="button"

          className="secondary-btn"

          onClick={
            onOpenTracker
          }

          style={{
            marginTop:
              '16px'
          }}
        >
          Open Full Reading & Revision Tracker
        </button>

      )}

    </section>

  );
}

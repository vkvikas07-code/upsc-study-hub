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

  bookTitle: string;
  subject: string;

  revisionCount: number;

  dueAt: string;
};


type CalendarDay = {
  key: string;
  date: Date;
  dayLabel: string;
  dateLabel: string;
};


type StageCounts = {
  revision1: number;
  revision2: number;
  final: number;
};


type RevisionWeekCalendarProps = {
  onOpenTracker?: () => void;
};


const DAY_MS =
  24 *
  60 *
  60 *
  1000;


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
 * LOCAL DATE HELPERS
 * =========================================
 */

function startOfLocalDay(
  value:
    Date
) {

  const date =
    new Date(
      value
    );


  date.setHours(
    0,
    0,
    0,
    0
  );


  return date;
}


function addDays(
  value:
    Date,

  amount:
    number
) {

  const date =
    new Date(
      value
    );


  date.setDate(
    date.getDate() +
    amount
  );


  return date;
}


function localDateKey(
  value:
    Date
) {

  const year =
    value.getFullYear();


  const month =
    String(
      value.getMonth() +
      1
    ).padStart(
      2,
      '0'
    );


  const day =
    String(
      value.getDate()
    ).padStart(
      2,
      '0'
    );


  return (
    `${year}-${month}-${day}`
  );
}


/*
 * =========================================
 * DATE DISPLAY
 * =========================================
 */

function shortDayLabel(
  value:
    Date
) {

  return value
    .toLocaleDateString(
      'en-IN',
      {
        weekday:
          'short'
      }
    );
}


function shortDateLabel(
  value:
    Date
) {

  return value
    .toLocaleDateString(
      'en-IN',
      {
        day:
          '2-digit',

        month:
          'short'
      }
    );
}


function fullDateLabel(
  value:
    Date
) {

  return value
    .toLocaleDateString(
      'en-IN',
      {
        weekday:
          'long',

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
 * NEXT REVISION LABEL
 * =========================================
 */

function revisionLabel(
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
 * 7-DAY REVISION CALENDAR
 * =========================================
 */

export function RevisionWeekCalendar({
  onOpenTracker
}: RevisionWeekCalendarProps) {

  const today =
    startOfLocalDay(
      new Date()
    );


  /*
   * =========================================
   * DATA
   * =========================================
   */

  const [
    items,
    setItems
  ] =
    useState<
      RevisionItem[]
    >([]);


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


  const [
    selectedDayKey,
    setSelectedDayKey
  ] =
    useState(
      localDateKey(
        today
      )
    );


  /*
   * =========================================
   * CALENDAR DAYS
   * =========================================
   */

  const calendarDays =
    useMemo(
      () => {

        const base =
          startOfLocalDay(
            new Date()
          );


        return Array
          .from(
            {
              length:
                7
            },

            (
              _,
              index
            ):
              CalendarDay => {

              const date =
                addDays(
                  base,
                  index
                );


              return {

                key:
                  localDateKey(
                    date
                  ),

                date,

                dayLabel:
                  index ===
                    0
                    ? 'Today'
                    : shortDayLabel(
                        date
                      ),

                dateLabel:
                  shortDateLabel(
                    date
                  )

              };
            }
          );

      },
      []
    );


  /*
   * =========================================
   * LOAD REVISION DATA
   * =========================================
   */

  async function loadCalendar() {

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
     * OUTSTANDING REVISION RECORDS
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
        'Unable to load weekly revision schedule:',
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
      Array.from(
        new Set(
          progressRows.map(
            row =>
              row.book_topic_id
          )
        )
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
          parent_id
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
        'Unable to load weekly revision topics:',
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
                : null

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


    const parentMap =
      new Map<
        string,
        string
      >();


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
            topic_name
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

        (
          parentData ||
          []
        ).forEach(
          item => {

            parentMap.set(
              String(
                item.id
              ),

              String(
                item.topic_name ||
                ''
              )
            );

          }
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
        'Unable to load weekly revision books:',
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
     * MAPS
     */

    const topicMap =
      new Map<
        string,
        TopicRow
      >(
        topicRows.map(
          topic => [
            topic.id,
            topic
          ]
        )
      );


    const bookMap =
      new Map<
        string,
        BookRow
      >(
        bookRows.map(
          book => [
            book.id,
            book
          ]
        )
      );


    /*
     * BUILD REVISION ITEMS
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
          topicMap.get(
            progress.book_topic_id
          );


        if (!topic) {

          return;
        }


        const book =
          bookMap.get(
            topic.book_id
          );


        if (!book) {

          return;
        }


        nextItems.push({

          topicId:
            topic.id,

          topicName:
            topic.topic_name,

          parentTopicName:
            topic.parent_id
              ? parentMap.get(
                  topic.parent_id
                ) ||
                null
              : null,

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

      void loadCalendar();

    },
    []
  );


  /*
   * =========================================
   * WEEK BOUNDARY
   * =========================================
   */

  const weekStart =
    startOfLocalDay(
      new Date()
    );


  const weekEnd =
    addDays(
      weekStart,
      7
    );


  /*
   * =========================================
   * OVERDUE ITEMS
   * =========================================
   */

  const overdueItems =
    useMemo(
      () => {

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
              weekStart
            );
          }
        );

      },
      [
        items
      ]
    );


  /*
   * =========================================
   * NEXT 7 DAYS
   * =========================================
   */

  const weekItems =
    useMemo(
      () => {

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
              due >=
                weekStart &&
              due <
                weekEnd
            );
          }
        );

      },
      [
        items
      ]
    );


  /*
   * =========================================
   * TODAY COUNT
   * =========================================
   */

  const todayKey =
    localDateKey(
      weekStart
    );


  const todayItems =
    weekItems.filter(
      item =>
        localDateKey(
          new Date(
            item.dueAt
          )
        ) ===
        todayKey
    );


  /*
   * =========================================
   * DAY ITEMS
   * =========================================
   */

  function getItemsForDay(
    dayKey:
      string
  ) {

    return weekItems.filter(
      item =>
        localDateKey(
          new Date(
            item.dueAt
          )
        ) ===
        dayKey
    );
  }


  /*
   * =========================================
   * STAGE COUNTS
   * =========================================
   */

  function getStageCounts(
    revisionItems:
      RevisionItem[]
  ):
    StageCounts {

    let revision1 =
      0;


    let revision2 =
      0;


    let final =
      0;


    revisionItems.forEach(
      item => {

        if (
          item.revisionCount ===
          0
        ) {

          revision1 +=
            1;

        } else if (
          item.revisionCount ===
          1
        ) {

          revision2 +=
            1;

        } else if (
          item.revisionCount ===
          2
        ) {

          final +=
            1;
        }
      }
    );


    return {
      revision1,
      revision2,
      final
    };
  }


  /*
   * =========================================
   * SELECTED DAY
   * =========================================
   */

  const selectedDay =
    calendarDays.find(
      day =>
        day.key ===
        selectedDayKey
    ) ||
    calendarDays[0];


  const selectedItems =
    selectedDay
      ? getItemsForDay(
          selectedDay.key
        )
      : [];


  const selectedCounts =
    getStageCounts(
      selectedItems
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


      setError(
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


    setError('');


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
        'Unable to complete calendar revision:',
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


    await loadCalendar();


    setSavingTopicId(
      null
    );


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
        'Final Revision completed. This portion is now fully revised.'
      );
    }
  }


  /*
   * =========================================
   * RENDER
   * =========================================
   */

  return (

    <section
      className="panel"
    >

      {/* HEADER */}

      <div
        className="panel-head"
      >

        <div>

          <span
            className="eyebrow"
          >
            REVISION CALENDAR
          </span>


          <h2>
            Next 7 Days
          </h2>


          <p>
            See how many revisions are scheduled
            for each day and prepare your study
            load before it becomes overdue.
          </p>

        </div>


        <button
          type="button"
          className="text-btn"

          onClick={() =>
            void loadCalendar()
          }
        >
          Refresh
        </button>

      </div>


      {/* LOADING */}

      {loading && (

        <p>
          Loading your 7-day revision calendar...
        </p>

      )}


      {/* ERROR */}

      {!loading &&
        error && (

        <div
          className="callout"
        >
          {error}
        </div>

      )}


      {/* SIGNED OUT */}

      {!loading &&
        !error &&
        !signedIn && (

        <div
          className="callout"
        >

          <strong>
            Sign in to view your revision calendar
          </strong>


          <p>
            The calendar is created from your
            personal reading and revision schedule.
          </p>

        </div>

      )}


      {/* SIGNED IN */}

      {!loading &&
        !error &&
        signedIn && (

        <>

          {/* SUMMARY */}

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
                  Due today
                </span>


                <strong>
                  {todayItems.length}
                </strong>


                <small>
                  Today's workload
                </small>

              </div>

            </article>


            <article
              className="metric-card"
            >

              <div>

                <span>
                  Next 7 days
                </span>


                <strong>
                  {weekItems.length}
                </strong>


                <small>
                  Scheduled revisions
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
                  Complete these first
                </small>

              </div>

            </article>

          </div>


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


          {/* 7 DAY CALENDAR */}

          <div
            style={{
              display:
                'grid',

              gridTemplateColumns:
                'repeat(auto-fit, minmax(105px, 1fr))',

              gap:
                '9px',

              marginTop:
                '18px'
            }}
          >

            {calendarDays.map(
              day => {

                const dayItems =
                  getItemsForDay(
                    day.key
                  );


                const counts =
                  getStageCounts(
                    dayItems
                  );


                const selected =
                  day.key ===
                  selectedDayKey;


                return (

                  <button
                    key={
                      day.key
                    }

                    type="button"

                    onClick={() =>
                      setSelectedDayKey(
                        day.key
                      )
                    }

                    style={{
                      padding:
                        '12px 10px',

                      border:
                        selected
                          ? '1px solid rgba(45,212,191,.75)'
                          : '1px solid rgba(255,255,255,.09)',

                      borderRadius:
                        '13px',

                      background:
                        selected
                          ? 'rgba(20,184,166,.12)'
                          : 'rgba(255,255,255,.025)',

                      color:
                        'inherit',

                      cursor:
                        'pointer',

                      textAlign:
                        'left'
                    }}
                  >

                    <small
                      style={{
                        display:
                          'block',

                        color:
                          selected
                            ? '#5eead4'
                            : '#94a3b8'
                      }}
                    >
                      {day.dayLabel}
                    </small>


                    <strong
                      style={{
                        display:
                          'block',

                        marginTop:
                          '4px'
                      }}
                    >
                      {day.dateLabel}
                    </strong>


                    <strong
                      style={{
                        display:
                          'block',

                        marginTop:
                          '10px',

                        fontSize:
                          '1.35rem'
                      }}
                    >
                      {dayItems.length}
                    </strong>


                    <small
                      style={{
                        display:
                          'block',

                        color:
                          '#94a3b8'
                      }}
                    >
                      {
                        dayItems.length ===
                          1
                          ? 'revision'
                          : 'revisions'
                      }
                    </small>


                    {dayItems.length >
                      0 && (

                      <small
                        style={{
                          display:
                            'block',

                          marginTop:
                            '8px',

                          color:
                            '#cbd5e1'
                        }}
                      >
                        R1 {counts.revision1}
                        {' • '}
                        R2 {counts.revision2}
                        {' • '}
                        F {counts.final}
                      </small>

                    )}

                  </button>

                );
              }
            )}

          </div>


          {/* SELECTED DAY */}

          {selectedDay && (

            <div
              style={{
                marginTop:
                  '20px'
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
                    '12px',

                  flexWrap:
                    'wrap'
                }}
              >

                <div>

                  <span
                    className="eyebrow"
                  >
                    SELECTED DAY
                  </span>


                  <h3>
                    {fullDateLabel(
                      selectedDay.date
                    )}
                  </h3>

                </div>


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

                  <span
                    className="tag"
                  >
                    R1 {selectedCounts.revision1}
                  </span>


                  <span
                    className="tag"
                  >
                    R2 {selectedCounts.revision2}
                  </span>


                  <span
                    className="tag"
                  >
                    Final {selectedCounts.final}
                  </span>

                </div>

              </div>


              {/* EMPTY DAY */}

              {selectedItems.length ===
                0 && (

                <div
                  className="callout"

                  style={{
                    marginTop:
                      '12px'
                  }}
                >

                  <strong>
                    ✓ No revision scheduled
                  </strong>


                  <p>
                    This day is currently free from
                    scheduled book revisions.
                  </p>

                </div>

              )}


              {/* DAY REVISION ITEMS */}

              {selectedItems.length >
                0 && (

                <div
                  style={{
                    display:
                      'grid',

                    gap:
                      '11px',

                    marginTop:
                      '12px'
                  }}
                >

                  {selectedItems.map(
                    item => {

                      const saving =
                        savingTopicId ===
                        item.topicId;


                      return (

                        <article
                          key={
                            item.topicId
                          }

                          style={{
                            padding:
                              '13px',

                            border:
                              '1px solid rgba(255,255,255,.08)',

                            borderRadius:
                              '13px',

                            background:
                              'rgba(255,255,255,.025)'
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

                              alignItems:
                                'flex-start',

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
                                  '#5eead4'
                              }}
                            >
                              {revisionLabel(
                                item.revisionCount
                              )}
                            </strong>

                          </div>


                          <h3
                            style={{
                              marginTop:
                                '9px',

                              marginBottom:
                                '4px'
                            }}
                          >
                            {item.bookTitle}
                          </h3>


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
                                '10px'
                            }}
                          >
                            {
                              saving
                                ? 'Saving...'
                                : `Complete ${revisionLabel(
                                    item.revisionCount
                                  )}`
                            }
                          </button>

                        </article>

                      );
                    }
                  )}

                </div>

              )}

            </div>

          )}


          {/* OVERDUE NOTICE */}

          {overdueItems.length >
            0 && (

            <div
              className="callout"

              style={{
                marginTop:
                  '18px'
              }}
            >

              <strong>
                {overdueItems.length}
                {' '}
                overdue
                {' '}
                {
                  overdueItems.length ===
                    1
                    ? 'revision'
                    : 'revisions'
                }
              </strong>


              <p>
                Complete overdue work before adding
                too much new revision load.
              </p>

            </div>

          )}


          {/* OPEN FULL TRACKER */}

          {onOpenTracker && (

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
              Open Full Book Progress Tracker
            </button>

          )}

        </>

      )}

    </section>

  );
}

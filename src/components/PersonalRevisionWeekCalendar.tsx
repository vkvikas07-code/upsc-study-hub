import {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


type PersonalTopicRow = {
  id: string;
  book_id: string;
  parent_id: string | null;
  topic_name: string;
  revision_count: number;
  next_revision_due_at: string | null;
};


type PersonalBookRow = {
  id: string;
  title: string;
  subject: string;
};


type RevisionItem = {
  topicId: string;
  bookId: string;

  topicName: string;
  topicPath: string;

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


type PersonalRevisionWeekCalendarProps = {
  onOpenTracker?: () => void;
};


function cleanRevisionCount(
  value: unknown
) {

  const number =
    Number(value);


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


function addDays(
  value: Date,
  amount: number
) {

  const date =
    new Date(value);


  date.setDate(
    date.getDate() +
    amount
  );


  return date;
}


function dateKey(
  value: Date
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


  return `${year}-${month}-${day}`;
}


function shortDay(
  value: Date
) {

  return value.toLocaleDateString(
    'en-IN',
    {
      weekday:
        'short'
    }
  );
}


function shortDate(
  value: Date
) {

  return value.toLocaleDateString(
    'en-IN',
    {
      day:
        '2-digit',

      month:
        'short'
    }
  );
}


function fullDate(
  value: Date
) {

  return value.toLocaleDateString(
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


function revisionLabel(
  revisionCount: number
) {

  if (
    revisionCount <=
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


function dueStatus(
  value: string
) {

  const due =
    startOfDay(
      new Date(value)
    );


  if (
    Number.isNaN(
      due.getTime()
    )
  ) {

    return '';
  }


  const today =
    startOfDay(
      new Date()
    );


  const difference =
    Math.round(
      (
        due.getTime() -
        today.getTime()
      ) /
      (
        24 *
        60 *
        60 *
        1000
      )
    );


  if (
    difference <
    0
  ) {

    const days =
      Math.abs(
        difference
      );


    return `Overdue by ${days} ${
      days === 1
        ? 'day'
        : 'days'
    }`;
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


  return `Due in ${difference} days`;
}


export function PersonalRevisionWeekCalendar({

  onOpenTracker

}: PersonalRevisionWeekCalendarProps) {

  const today =
    startOfDay(
      new Date()
    );


  const [
    items,
    setItems
  ] =
    useState<RevisionItem[]>([]);


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
    useState<string | null>(
      null
    );


  const [
    selectedDayKey,
    setSelectedDayKey
  ] =
    useState(
      dateKey(
        today
      )
    );


  /*
   * =========================================
   * 7 CALENDAR DAYS
   * =========================================
   */

  const calendarDays =
    useMemo(
      () => {

        const base =
          startOfDay(
            new Date()
          );


        return Array.from(
          {
            length:
              7
          },
          (
            _,
            index
          ): CalendarDay => {

            const date =
              addDays(
                base,
                index
              );


            return {

              key:
                dateKey(
                  date
                ),

              date,

              dayLabel:
                index ===
                  0
                  ? 'Today'
                  : shortDay(
                      date
                    ),

              dateLabel:
                shortDate(
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
   * LOAD PERSONAL REVISION PLAN
   * =========================================
   */

  async function loadCalendar() {

    const client =
      supabase;


    if (
      !client
    ) {

      setError(
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

    setError('');


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

      setSignedIn(
        false
      );

      setItems([]);

      setLoading(
        false
      );

      return;
    }


    setSignedIn(
      true
    );


    const {
      data:
        topicData,

      error:
        topicError
    } =
      await client
        .from(
          'personal_book_topics'
        )
        .select(`
          id,
          book_id,
          parent_id,
          topic_name,
          revision_count,
          next_revision_due_at
        `)
        .eq(
          'user_id',
          user.id
        )
        .eq(
          'progress_percent',
          100
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
      topicError
    ) {

      setError(
        topicError.message
      );

      setLoading(
        false
      );

      return;
    }


    const topics:
      PersonalTopicRow[] =
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

            revision_count:
              cleanRevisionCount(
                item.revision_count
              ),

            next_revision_due_at:
              item.next_revision_due_at
                ? String(
                    item.next_revision_due_at
                  )
                : null

          })
        );


    if (
      topics.length ===
      0
    ) {

      setItems([]);

      setLoading(
        false
      );

      return;
    }


    const bookIds =
      Array.from(
        new Set(
          topics.map(
            topic =>
              topic.book_id
          )
        )
      );


    /*
     * =========================================
     * LOAD PERSONAL BOOKS
     * =========================================
     */

    const {
      data:
        bookData,

      error:
        bookError
    } =
      await client
        .from(
          'personal_books'
        )
        .select(`
          id,
          title,
          subject
        `)
        .eq(
          'user_id',
          user.id
        )
        .in(
          'id',
          bookIds
        );


    if (
      bookError
    ) {

      setError(
        bookError.message
      );

      setLoading(
        false
      );

      return;
    }


    const books:
      PersonalBookRow[] =
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
     * =========================================
     * LOAD FULL TOPIC TREE FOR PATHS
     * =========================================
     */

    const {
      data:
        pathData,

      error:
        pathError
    } =
      await client
        .from(
          'personal_book_topics'
        )
        .select(`
          id,
          parent_id,
          topic_name,
          book_id
        `)
        .eq(
          'user_id',
          user.id
        )
        .in(
          'book_id',
          bookIds
        );


    if (
      pathError
    ) {

      setError(
        pathError.message
      );

      setLoading(
        false
      );

      return;
    }


    const pathMap =
      new Map<
        string,
        {
          id: string;
          parent_id: string | null;
          topic_name: string;
        }
      >();


    (
      pathData ||
      []
    ).forEach(
      item => {

        pathMap.set(
          String(
            item.id
          ),
          {

            id:
              String(
                item.id
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
              )

          }
        );

      }
    );


    function topicPath(
      topic:
        PersonalTopicRow
    ) {

      const parts =
        [
          topic.topic_name
        ];


      let parentId =
        topic.parent_id;


      const visited =
        new Set<string>();


      while (
        parentId &&
        !visited.has(
          parentId
        )
      ) {

        visited.add(
          parentId
        );


        const parent =
          pathMap.get(
            parentId
          );


        if (
          !parent
        ) {

          break;
        }


        parts.unshift(
          parent.topic_name
        );


        parentId =
          parent.parent_id;
      }


      return parts.join(
        ' → '
      );
    }


    /*
     * =========================================
     * BUILD REVISION ITEMS
     * =========================================
     */

    const nextItems:
      RevisionItem[] = [];


    topics.forEach(
      topic => {

        if (
          !topic.next_revision_due_at
        ) {

          return;
        }


        const book =
          books.find(
            item =>
              item.id ===
              topic.book_id
          );


        if (
          !book
        ) {

          return;
        }


        nextItems.push({

          topicId:
            topic.id,

          bookId:
            topic.book_id,

          topicName:
            topic.topic_name,

          topicPath:
            topicPath(
              topic
            ),

          bookTitle:
            book.title,

          subject:
            book.subject,

          revisionCount:
            topic.revision_count,

          dueAt:
            topic.next_revision_due_at

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


  useEffect(
    () => {

      void loadCalendar();

    },
    []
  );


  /*
   * =========================================
   * ITEMS FOR EACH DAY
   * =========================================
   *
   * Overdue revisions appear under Today so
   * students do not lose sight of them.
   * =========================================
   */

  function itemsForDay(
    day:
      CalendarDay
  ) {

    const dayStart =
      startOfDay(
        day.date
      );


    const nextDay =
      addDays(
        dayStart,
        1
      );


    return items.filter(
      item => {

        const due =
          new Date(
            item.dueAt
          );


        if (
          Number.isNaN(
            due.getTime()
          )
        ) {

          return false;
        }


        if (
          day.key ===
          dateKey(
            today
          )
        ) {

          return (
            due <
            nextDay
          );
        }


        return (
          due >=
            dayStart &&
          due <
            nextDay
        );
      }
    );
  }


  const selectedDay =
    calendarDays.find(
      day =>
        day.key ===
        selectedDayKey
    ) ||
    calendarDays[0];


  const selectedItems =
    selectedDay
      ? itemsForDay(
          selectedDay
        )
      : [];


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


    if (
      !client
    ) {

      return;
    }


    const nextRevision =
      Math.min(
        3,
        item.revisionCount +
        1
      );


    setSavingTopicId(
      item.topicId
    );


    setMessage('');

    setError('');


    const {
      error:
        updateError
    } =
      await client
        .from(
          'personal_book_topics'
        )
        .update({

          revision_count:
            nextRevision

        })
        .eq(
          'id',
          item.topicId
        );


    if (
      updateError
    ) {

      setError(
        updateError.message
      );

      setSavingTopicId(
        null
      );

      return;
    }


    setMessage(
      nextRevision >=
        3
        ? 'Final Revision completed.'
        : `${revisionLabel(
            item.revisionCount
          )} completed.`
    );


    setSavingTopicId(
      null
    );


    await loadCalendar();
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

      <section
        className="panel"
      >

        <span
          className="eyebrow"
        >
          MY BOOK 7-DAY PLAN
        </span>


        <p
          style={{
            marginBottom:
              0
          }}
        >
          Loading personal revision plan…
        </p>

      </section>

    );
  }


  if (
    !signedIn
  ) {

    return null;
  }


  /*
   * =========================================
   * ERROR
   * =========================================
   */

  if (
    error
  ) {

    return (

      <section
        className="panel"
      >

        <span
          className="eyebrow"
        >
          MY BOOK 7-DAY PLAN
        </span>


        <p>
          {
            error
          }
        </p>


        <button
          type="button"

          className="secondary-btn"

          onClick={() =>
            void loadCalendar()
          }
        >
          Try Again
        </button>

      </section>

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

      <div
        className="panel-head"
      >

        <div>

          <span
            className="eyebrow"
          >
            MY BOOK 7-DAY PLAN
          </span>


          <h3>
            Personal revision calendar
          </h3>


          <small
            style={{
              color:
                '#94a3b8'
            }}
          >
            Overdue revisions are included under Today.
          </small>

        </div>


        <span
          className="pill"
        >
          {
            items.length
          } pending
        </span>

      </div>


      {message && (

        <div
          className="callout"

          style={{
            marginTop:
              '12px'
          }}
        >
          {
            message
          }
        </div>

      )}


      {/* =====================================
          7 DAY BUTTONS
      ===================================== */}

      <div
        style={{
          display:
            'grid',

          gridTemplateColumns:
            'repeat(7, minmax(74px, 1fr))',

          gap:
            '7px',

          overflowX:
            'auto',

          paddingBottom:
            '5px',

          marginTop:
            '14px'
        }}
      >

        {
          calendarDays.map(
            day => {

              const count =
                itemsForDay(
                  day
                ).length;


              const active =
                day.key ===
                selectedDayKey;


              return (

                <button
                  key={
                    day.key
                  }

                  type="button"

                  className={
                    active
                      ? 'filter active'
                      : 'filter'
                  }

                  onClick={() =>
                    setSelectedDayKey(
                      day.key
                    )
                  }

                  style={{
                    minWidth:
                      '74px',

                    minHeight:
                      '72px',

                    whiteSpace:
                      'normal',

                    display:
                      'grid',

                    gap:
                      '3px',

                    placeItems:
                      'center'
                  }}
                >

                  <strong>
                    {
                      day.dayLabel
                    }
                  </strong>


                  <small>
                    {
                      day.dateLabel
                    }
                  </small>


                  <small>
                    {
                      count
                    } due
                  </small>

                </button>

              );

            }
          )
        }

      </div>


      {/* =====================================
          SELECTED DATE
      ===================================== */}

      <div
        style={{
          marginTop:
            '14px'
        }}
      >

        <h4
          style={{
            marginBottom:
              '4px'
          }}
        >
          {
            selectedDay
              ? fullDate(
                  selectedDay.date
                )
              : ''
          }
        </h4>


        <small
          style={{
            color:
              '#94a3b8'
          }}
        >
          {
            selectedItems.length
          } personal revision

          {
            selectedItems.length ===
              1
              ? ''
              : 's'
          }
        </small>

      </div>


      {/* =====================================
          EMPTY SELECTED DAY
      ===================================== */}

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
            No personal revision scheduled.
          </strong>


          <p
            style={{
              marginBottom:
                0
            }}
          >
            Nothing from your personal reading
            library is due on this day.
          </p>

        </div>

      )}


      {/* =====================================
          REVISION ITEMS
      ===================================== */}

      {selectedItems.length >
        0 && (

        <div
          style={{
            display:
              'grid',

            gap:
              '10px',

            marginTop:
              '12px'
          }}
        >

          {
            selectedItems.map(
              item => (

                <div
                  key={
                    item.topicId
                  }

                  style={{
                    padding:
                      '13px',

                    borderRadius:
                      '12px',

                    border:
                      '1px solid rgba(255,255,255,.08)',

                    background:
                      'rgba(255,255,255,.025)'
                  }}
                >

                  <div
                    style={{
                      display:
                        'flex',

                      alignItems:
                        'flex-start',

                      justifyContent:
                        'space-between',

                      gap:
                        '10px',

                      flexWrap:
                        'wrap'
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

                      <strong>
                        {
                          item.topicPath
                        }
                      </strong>


                      <small
                        style={{
                          display:
                            'block',

                          marginTop:
                            '5px',

                          color:
                            '#94a3b8'
                        }}
                      >
                        {
                          item.bookTitle
                        }
                        {' · '}
                        {
                          item.subject
                        }
                      </small>

                    </div>


                    <span
                      className="pill"
                    >
                      {
                        revisionLabel(
                          item.revisionCount
                        )
                      }
                    </span>

                  </div>


                  <small
                    style={{
                      display:
                        'block',

                      marginTop:
                        '8px',

                      color:
                        dueStatus(
                          item.dueAt
                        ).includes(
                          'Overdue'
                        )
                          ? '#fbbf24'
                          : '#94a3b8'
                    }}
                  >
                    {
                      dueStatus(
                        item.dueAt
                      )
                    }
                  </small>


                  <div
                    style={{
                      display:
                        'flex',

                      flexWrap:
                        'wrap',

                      gap:
                        '8px',

                      marginTop:
                        '11px'
                    }}
                  >

                    <button
                      type="button"

                      className="primary-btn"

                      disabled={
                        savingTopicId ===
                        item.topicId
                      }

                      onClick={() =>
                        void completeRevision(
                          item
                        )
                      }
                    >
                      {
                        savingTopicId ===
                          item.topicId
                          ? 'Saving…'
                          : `Complete ${revisionLabel(
                              item.revisionCount
                            )}`
                      }
                    </button>


                    {onOpenTracker && (

                      <button
                        type="button"

                        className="secondary-btn"

                        onClick={
                          onOpenTracker
                        }
                      >
                        Open My Reading
                      </button>

                    )}

                  </div>

                </div>

              )
            )
          }

        </div>

      )}

    </section>

  );
}

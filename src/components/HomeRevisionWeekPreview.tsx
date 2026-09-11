import {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


type ProgressRow = {
  revision_count:
    number |
    string |
    null;

  next_revision_due_at:
    string |
    null;
};


type RevisionItem = {
  revisionCount: number;
  dueAt: string;
};


type DaySummary = {
  key: string;
  date: Date;
  label: string;
  dateLabel: string;
  total: number;
  revision1: number;
  revision2: number;
  final: number;
};


type HomeRevisionWeekPreviewProps = {
  onOpenCalendar:
    () => void;
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
 * DATE HELPERS
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


function shortDay(
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


function shortDate(
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


/*
 * =========================================
 * HOME REVISION WEEK PREVIEW
 * =========================================
 */

export function HomeRevisionWeekPreview({
  onOpenCalendar
}: HomeRevisionWeekPreviewProps) {

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


  /*
   * =========================================
   * LOAD
   * =========================================
   */

  async function loadPreview() {

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


    const {
      data,
      error:
        loadError
    } =
      await client
        .from(
          'book_topic_progress'
        )
        .select(
          `
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
      loadError
    ) {

      console.error(
        'Unable to load Home revision preview:',
        loadError
      );


      setError(
        loadError.message
      );


      setItems(
        []
      );


      setLoading(
        false
      );


      return;
    }


    const rows:
      ProgressRow[] =
        (
          data ||
          []
        ).map(
          item => ({

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


    const nextItems:
      RevisionItem[] =
        rows
          .filter(
            row =>
              Boolean(
                row.next_revision_due_at
              )
          )
          .map(
            row => ({

              revisionCount:
                cleanRevisionCount(
                  row.revision_count
                ),

              dueAt:
                String(
                  row.next_revision_due_at
                )

            })
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

      void loadPreview();

    },
    []
  );


  /*
   * =========================================
   * DATE RANGE
   * =========================================
   */

  const today =
    useMemo(
      () =>
        startOfLocalDay(
          new Date()
        ),
      []
    );


  const weekEnd =
    useMemo(
      () =>
        addDays(
          today,
          7
        ),
      [
        today
      ]
    );


  /*
   * =========================================
   * OVERDUE
   * =========================================
   */

  const overdueCount =
    useMemo(
      () => {

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


            return (
              startOfLocalDay(
                due
              ).getTime() <
              today.getTime()
            );
          }
        ).length;

      },
      [
        items,
        today
      ]
    );


  /*
   * =========================================
   * WEEK ITEMS
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


            if (
              Number.isNaN(
                due.getTime()
              )
            ) {

              return false;
            }


            const dueDay =
              startOfLocalDay(
                due
              );


            return (
              dueDay.getTime() >=
                today.getTime() &&
              dueDay.getTime() <
                weekEnd.getTime()
            );
          }
        );

      },
      [
        items,
        today,
        weekEnd
      ]
    );


  /*
   * =========================================
   * DAY SUMMARIES
   * =========================================
   */

  const days =
    useMemo(
      () => {

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
              DaySummary => {

              const date =
                addDays(
                  today,
                  index
                );


              const key =
                localDateKey(
                  date
                );


              const dayItems =
                weekItems.filter(
                  item => {

                    const due =
                      new Date(
                        item.dueAt
                      );


                    return (
                      !Number.isNaN(
                        due.getTime()
                      ) &&
                      localDateKey(
                        due
                      ) ===
                      key
                    );
                  }
                );


              let revision1 =
                0;


              let revision2 =
                0;


              let final =
                0;


              dayItems.forEach(
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

                key,

                date,

                label:
                  index ===
                    0
                    ? 'Today'
                    : shortDay(
                        date
                      ),

                dateLabel:
                  shortDate(
                    date
                  ),

                total:
                  dayItems.length,

                revision1,

                revision2,

                final

              };
            }
          );

      },
      [
        today,
        weekItems
      ]
    );


  /*
   * =========================================
   * SUMMARY
   * =========================================
   */

  const dueToday =
    days[0]?.total ||
    0;


  const busiestDay =
    days.reduce<
      DaySummary |
      null
    >(
      (
        best,
        day
      ) => {

        if (
          !best ||
          day.total >
            best.total
        ) {

          return day;
        }


        return best;
      },
      null
    );


  /*
   * =========================================
   * PAGE
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
            WEEK AHEAD
          </span>


          <h3>
            Revision Preview
          </h3>


          <p>
            Your upcoming revision workload
            for the next 7 days.
          </p>

        </div>


        <button
          type="button"
          className="text-btn"

          onClick={
            onOpenCalendar
          }
        >
          Open Calendar
        </button>

      </div>


      {/* LOADING */}

      {loading && (

        <p>
          Loading revision week...
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
            Sign in to see your revision week
          </strong>


          <p>
            Your weekly preview is created from
            your personal Book Progress schedule.
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
            style={{
              display:
                'flex',

              gap:
                '8px',

              flexWrap:
                'wrap',

              marginTop:
                '12px'
            }}
          >

            <span
              className="tag"
            >
              Today:
              {' '}
              {dueToday}
            </span>


            <span
              className="tag"
            >
              Next 7 days:
              {' '}
              {weekItems.length}
            </span>


            <span
              className="tag"
            >
              Overdue:
              {' '}
              {overdueCount}
            </span>

          </div>


          {/* WEEK */}

          <div
            style={{
              display:
                'grid',

              gridTemplateColumns:
                'repeat(7, minmax(74px, 1fr))',

              gap:
                '7px',

              marginTop:
                '16px',

              overflowX:
                'auto',

              paddingBottom:
                '4px'
            }}
          >

            {days.map(
              day => (

                <div
                  key={
                    day.key
                  }

                  style={{
                    minWidth:
                      '74px',

                    padding:
                      '10px 8px',

                    border:
                      day.total >
                        0
                        ? '1px solid rgba(45,212,191,.30)'
                        : '1px solid rgba(255,255,255,.07)',

                    borderRadius:
                      '11px',

                    background:
                      day.total >
                        0
                        ? 'rgba(20,184,166,.07)'
                        : 'rgba(255,255,255,.02)',

                    textAlign:
                      'center'
                  }}
                >

                  <small
                    style={{
                      display:
                        'block',

                      color:
                        day.key ===
                          localDateKey(
                            today
                          )
                          ? '#5eead4'
                          : '#94a3b8'
                    }}
                  >
                    {day.label}
                  </small>


                  <strong
                    style={{
                      display:
                        'block',

                      marginTop:
                        '3px'
                    }}
                  >
                    {day.dateLabel}
                  </strong>


                  <strong
                    style={{
                      display:
                        'block',

                      marginTop:
                        '8px',

                      fontSize:
                        '1.3rem'
                    }}
                  >
                    {day.total}
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
                      day.total ===
                        1
                        ? 'revision'
                        : 'revisions'
                    }
                  </small>


                  {day.total >
                    0 && (

                    <small
                      style={{
                        display:
                          'block',

                        marginTop:
                          '7px',

                        color:
                          '#cbd5e1',

                        lineHeight:
                          '1.4'
                      }}
                    >
                      R1 {day.revision1}
                      <br />
                      R2 {day.revision2}
                      <br />
                      F {day.final}
                    </small>

                  )}

                </div>

              )
            )}

          </div>


          {/* BUSIEST DAY */}

          {busiestDay &&
            busiestDay.total >
              0 && (

            <div
              className="callout"

              style={{
                marginTop:
                  '14px'
              }}
            >

              <strong>
                Busiest day:
                {' '}
                {busiestDay.label}
                {' '}
                {busiestDay.dateLabel}
              </strong>


              <p>
                {busiestDay.total}
                {' '}
                {
                  busiestDay.total ===
                    1
                    ? 'revision is'
                    : 'revisions are'
                }
                {' '}
                currently scheduled.
              </p>

            </div>

          )}


          {/* EMPTY WEEK */}

          {weekItems.length ===
            0 &&
            overdueCount ===
              0 && (

            <div
              className="callout"

              style={{
                marginTop:
                  '14px'
              }}
            >

              <strong>
                ✓ Clear revision week
              </strong>


              <p>
                No book revisions are currently
                scheduled for the next 7 days.
              </p>

            </div>

          )}


          {/* OVERDUE WARNING */}

          {overdueCount >
            0 && (

            <div
              className="callout"

              style={{
                marginTop:
                  '14px'
              }}
            >

              <strong>
                {overdueCount}
                {' '}
                overdue
                {' '}
                {
                  overdueCount ===
                    1
                    ? 'revision'
                    : 'revisions'
                }
              </strong>


              <p>
                Open the revision calendar to
                complete overdue work first.
              </p>

            </div>

          )}


          <button
            type="button"
            className="secondary-btn"

            onClick={
              onOpenCalendar
            }

            style={{
              marginTop:
                '14px'
            }}
          >
            View Full 7-Day Revision Calendar
          </button>

        </>

      )}

    </section>

  );
}

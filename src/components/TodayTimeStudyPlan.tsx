import {
  useEffect,
  useMemo,
  useState
} from 'react';

import type {
  DailyTask
} from '../types';

import {
  supabase
} from '../lib/supabase';


type StudyPeriod =
  | 'morning'
  | 'afternoon'
  | 'evening';


type ProgressRow = {
  next_revision_due_at:
    string |
    null;
};


type PlanItem = {
  id: string;

  title: string;
  detail: string;

  badge: string;

  taskId:
    string |
    null;

  done: boolean;

  urgent: boolean;

  actionLabel:
    string |
    null;

  onAction:
    (() => void) |
    null;
};


type TimeBlock = {
  key:
    StudyPeriod;

  title:
    string;

  time:
    string;

  description:
    string;

  items:
    PlanItem[];
};


type TodayTimeStudyPlanProps = {

  tasks:
    DailyTask[];

  setTasks:
    (
      tasks:
        DailyTask[]
    ) => void;

  onOpenCurrent:
    () => void;

  onOpenPractice:
    () => void;

  onOpenBookProgress:
    () => void;
};


/*
 * =========================================
 * LOCAL DAY
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


/*
 * =========================================
 * CURRENT STUDY PERIOD
 * =========================================
 */

function getCurrentPeriod(
  date:
    Date
):
  StudyPeriod {

  const hour =
    date.getHours();


  if (
    hour <
    12
  ) {

    return 'morning';
  }


  if (
    hour <
    17
  ) {

    return 'afternoon';
  }


  return 'evening';
}


/*
 * =========================================
 * TODAY TIME STUDY PLAN
 * =========================================
 */

export function TodayTimeStudyPlan({

  tasks,
  setTasks,
  onOpenCurrent,
  onOpenPractice,
  onOpenBookProgress

}: TodayTimeStudyPlanProps) {

  /*
   * =========================================
   * CURRENT TIME
   * =========================================
   */

  const [
    now,
    setNow
  ] =
    useState(
      new Date()
    );


  /*
   * =========================================
   * REVISION COUNTS
   * =========================================
   */

  const [
    dueToday,
    setDueToday
  ] =
    useState(
      0
    );


  const [
    overdue,
    setOverdue
  ] =
    useState(
      0
    );


  /*
   * =========================================
   * PAGE STATE
   * =========================================
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


  /*
   * =========================================
   * UPDATE CURRENT TIME
   * =========================================
   */

  useEffect(
    () => {

      const timer =
        window.setInterval(
          () => {

            setNow(
              new Date()
            );

          },
          60_000
        );


      return () => {

        window.clearInterval(
          timer
        );
      };

    },
    []
  );


  /*
   * =========================================
   * LOAD REVISION PRIORITIES
   * =========================================
   */

  async function loadRevisionPlan() {

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


      setDueToday(
        0
      );


      setOverdue(
        0
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
        );


    if (
      loadError
    ) {

      console.error(
        'Unable to load time-based revision plan:',
        loadError
      );


      setError(
        loadError.message
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

            next_revision_due_at:
              item.next_revision_due_at
                ? String(
                    item.next_revision_due_at
                  )
                : null

          })
        );


    const today =
      startOfLocalDay(
        new Date()
      );


    let overdueCount =
      0;


    let dueTodayCount =
      0;


    rows.forEach(
      row => {

        if (
          !row.next_revision_due_at
        ) {

          return;
        }


        const due =
          new Date(
            row.next_revision_due_at
          );


        if (
          Number.isNaN(
            due.getTime()
          )
        ) {

          return;
        }


        const dueDay =
          startOfLocalDay(
            due
          );


        if (
          dueDay.getTime() <
          today.getTime()
        ) {

          overdueCount +=
            1;


          return;
        }


        if (
          dueDay.getTime() ===
          today.getTime()
        ) {

          dueTodayCount +=
            1;
        }
      }
    );


    setOverdue(
      overdueCount
    );


    setDueToday(
      dueTodayCount
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

      void loadRevisionPlan();

    },
    []
  );


  /*
   * =========================================
   * DAILY TASK HELPERS
   * =========================================
   */

  function getTask(
    id:
      string
  ) {

    return (
      tasks.find(
        task =>
          task.id ===
          id
      ) ||
      null
    );
  }


  function setTaskDone(
    id:
      string,

    done:
      boolean
  ) {

    setTasks(
      tasks.map(
        task =>

          task.id ===
          id

            ? {
                ...task,
                done
              }

            : task
      )
    );
  }


  /*
   * =========================================
   * CURRENT PERIOD
   * =========================================
   */

  const currentPeriod =
    useMemo(
      () =>
        getCurrentPeriod(
          now
        ),
      [
        now
      ]
    );


  /*
   * =========================================
   * DAILY COMPLETION
   * =========================================
   */

  const completedTasks =
    tasks.filter(
      task =>
        task.done
    ).length;


  const dailyPercent =
    tasks.length >
    0

      ? Math.round(
          (
            completedTasks /
            tasks.length
          ) *
          100
        )

      : 0;


  /*
   * =========================================
   * BUILD TIME BLOCKS
   * =========================================
   */

  const blocks =
    useMemo(
      () => {

        const morningItems:
          PlanItem[] = [];


        const afternoonItems:
          PlanItem[] = [];


        const eveningItems:
          PlanItem[] = [];


        /*
         * =====================================
         * MORNING
         * =====================================
         *
         * 1. Clear overdue revisions
         * 2. Current Affairs
         */

        if (
          signedIn &&
          overdue >
            0
        ) {

          morningItems.push({

            id:
              'morning-overdue',

            title:
              `Clear ${overdue} overdue ${
                overdue ===
                  1
                  ? 'revision'
                  : 'revisions'
              }`,

            detail:
              'Start with old pending revision work before adding new material.',

            badge:
              'PRIORITY',

            taskId:
              null,

            done:
              false,

            urgent:
              true,

            actionLabel:
              'Open Revisions',

            onAction:
              onOpenBookProgress

          });
        }


        const currentTask =
          getTask(
            'ca'
          );


        if (
          currentTask
        ) {

          morningItems.push({

            id:
              'morning-current',

            title:
              currentTask.label,

            detail:
              currentTask.done
                ? 'Current Affairs task completed for today.'
                : 'Read and understand the important issues before moving to practice.',

            badge:
              'CURRENT AFFAIRS',

            taskId:
              currentTask.id,

            done:
              currentTask.done,

            urgent:
              false,

            actionLabel:
              currentTask.done
                ? null
                : 'Open Current Affairs',

            onAction:
              currentTask.done
                ? null
                : onOpenCurrent

          });
        }


        /*
         * =====================================
         * AFTERNOON
         * =====================================
         *
         * MCQ practice
         */

        const mcqTask =
          getTask(
            'mcq'
          );


        if (
          mcqTask
        ) {

          afternoonItems.push({

            id:
              'afternoon-mcq',

            title:
              mcqTask.label,

            detail:
              mcqTask.done
                ? 'Today’s MCQ practice is completed.'
                : 'Use practice to check recall and identify weak topics.',

            badge:
              'PRELIMS PRACTICE',

            taskId:
              mcqTask.id,

            done:
              mcqTask.done,

            urgent:
              false,

            actionLabel:
              mcqTask.done
                ? null
                : 'Start MCQs',

            onAction:
              mcqTask.done
                ? null
                : onOpenPractice

          });
        }


        /*
         * =====================================
         * EVENING
         * =====================================
         *
         * Scheduled revisions first.
         * General revision only when there
         * is no real scheduled revision.
         */

        if (
          signedIn &&
          dueToday >
            0
        ) {

          eveningItems.push({

            id:
              'evening-due-revision',

            title:
              `${dueToday} ${
                dueToday ===
                  1
                  ? 'revision'
                  : 'revisions'
              } due today`,

            detail:
              'Complete the actual scheduled revision stages in Book Progress.',

            badge:
              'REVISION DUE',

            taskId:
              null,

            done:
              false,

            urgent:
              false,

            actionLabel:
              'Start Revision',

            onAction:
              onOpenBookProgress

          });

        } else {

          const revisionTask =
            getTask(
              'rev'
            );


          if (
            revisionTask
          ) {

            eveningItems.push({

              id:
                'evening-general-revision',

              title:
                revisionTask.label,

              detail:
                revisionTask.done
                  ? 'General revision completed for today.'
                  : 'Review one completed topic to strengthen long-term recall.',

              badge:
                'REVISION',

              taskId:
                revisionTask.id,

              done:
                revisionTask.done,

              urgent:
                false,

              actionLabel:
                revisionTask.done
                  ? null
                  : 'Open Book Progress',

              onAction:
                revisionTask.done
                  ? null
                  : onOpenBookProgress

            });
          }
        }


        /*
         * OTHER DAILY TASKS
         *
         * Future custom tasks are placed
         * in the evening by default.
         */

        tasks
          .filter(
            task =>
              ![
                'ca',
                'mcq',
                'rev'
              ].includes(
                task.id
              )
          )
          .forEach(
            task => {

              eveningItems.push({

                id:
                  `extra-${task.id}`,

                title:
                  task.label,

                detail:
                  task.done
                    ? 'Completed.'
                    : 'Complete this item from your daily study plan.',

                badge:
                  'DAILY TASK',

                taskId:
                  task.id,

                done:
                  task.done,

                urgent:
                  false,

                actionLabel:
                  null,

                onAction:
                  null

              });

            }
          );


        const result:
          TimeBlock[] = [

          {
            key:
              'morning',

            title:
              'Morning',

            time:
              '6:00 AM – 11:30 AM',

            description:
              'Fresh learning and important pending work.',

            items:
              morningItems
          },

          {
            key:
              'afternoon',

            title:
              'Afternoon',

            time:
              '12:00 PM – 5:00 PM',

            description:
              'Practice, testing and active recall.',

            items:
              afternoonItems
          },

          {
            key:
              'evening',

            title:
              'Evening',

            time:
              '5:00 PM onward',

            description:
              'Revision and consolidation of the day.',

            items:
              eveningItems
          }

        ];


        return result;

      },
      [
        tasks,
        signedIn,
        overdue,
        dueToday,
        onOpenCurrent,
        onOpenPractice,
        onOpenBookProgress
      ]
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
            TODAY'S SCHEDULE
          </span>


          <h2>
            Morning → Afternoon → Evening
          </h2>


          <p>
            A flexible study rhythm built from
            the same Daily Plan and revision
            schedule already used in the app.
          </p>

        </div>


        <button
          type="button"
          className="text-btn"

          onClick={() =>
            void loadRevisionPlan()
          }
        >
          Refresh
        </button>

      </div>


      {/* =====================================
          DAILY PROGRESS
      ===================================== */}

      <div
        style={{
          display:
            'flex',

          justifyContent:
            'space-between',

          gap:
            '12px',

          alignItems:
            'center',

          flexWrap:
            'wrap',

          marginTop:
            '14px'
        }}
      >

        <div>

          <strong>
            Daily essentials
          </strong>


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
            {completedTasks}/{tasks.length}
            {' '}
            completed
          </small>

        </div>


        <strong
          style={{
            fontSize:
              '1.2rem'
          }}
        >
          {dailyPercent}%
        </strong>

      </div>


      <div
        className="progress-track"

        style={{
          marginTop:
            '9px'
        }}
      >
        <span
          style={{
            width:
              `${dailyPercent}%`
          }}
        />
      </div>


      {/* =====================================
          REVISION SUMMARY
      ===================================== */}

      {!loading && (

        <div
          style={{
            display:
              'flex',

            gap:
              '8px',

            flexWrap:
              'wrap',

            marginTop:
              '15px'
          }}
        >

          <span
            className="tag"
          >
            Current block:
            {' '}
            {
              currentPeriod ===
                'morning'
                ? 'Morning'

                : currentPeriod ===
                  'afternoon'
                ? 'Afternoon'

                : 'Evening'
            }
          </span>


          <span
            className="tag"
          >
            Due today:
            {' '}
            {
              signedIn
                ? dueToday
                : '—'
            }
          </span>


          <span
            className="tag"
          >
            Overdue:
            {' '}
            {
              signedIn
                ? overdue
                : '—'
            }
          </span>

        </div>

      )}


      {/* =====================================
          LOADING
      ===================================== */}

      {loading && (

        <p
          style={{
            marginTop:
              '16px'
          }}
        >
          Preparing today’s time-based study plan...
        </p>

      )}


      {/* =====================================
          ERROR
      ===================================== */}

      {!loading &&
        error && (

        <div
          className="callout"

          style={{
            marginTop:
              '16px'
          }}
        >
          {error}
        </div>

      )}


      {/* =====================================
          SIGNED OUT NOTE
      ===================================== */}

      {!loading &&
        !signedIn && (

        <div
          className="callout"

          style={{
            marginTop:
              '16px'
          }}
        >

          <strong>
            Sign in for scheduled revision priorities
          </strong>


          <p>
            Your Daily Plan still works while
            signed out, but revision due dates
            require your account.
          </p>

        </div>

      )}


      {/* =====================================
          TIME BLOCKS
      ===================================== */}

      {!loading && (

        <div
          style={{
            display:
              'grid',

            gridTemplateColumns:
              'repeat(auto-fit, minmax(260px, 1fr))',

            gap:
              '14px',

            marginTop:
              '18px'
          }}
        >

          {blocks.map(
            block => {

              const isCurrent =
                block.key ===
                currentPeriod;


              const completedInBlock =
                block.items.filter(
                  item =>
                    item.done
                ).length;


              return (

                <article
                  key={
                    block.key
                  }

                  style={{
                    padding:
                      '16px',

                    border:
                      isCurrent
                        ? '1px solid rgba(45,212,191,.52)'
                        : '1px solid rgba(255,255,255,.08)',

                    borderRadius:
                      '16px',

                    background:
                      isCurrent
                        ? 'rgba(20,184,166,.07)'
                        : 'rgba(255,255,255,.025)'
                  }}
                >

                  {/* BLOCK HEADER */}

                  <div
                    style={{
                      display:
                        'flex',

                      justifyContent:
                        'space-between',

                      gap:
                        '10px',

                      alignItems:
                        'flex-start'
                    }}
                  >

                    <div>

                      <div
                        style={{
                          display:
                            'flex',

                          gap:
                            '7px',

                          alignItems:
                            'center',

                          flexWrap:
                            'wrap'
                        }}
                      >

                        <h3
                          style={{
                            margin:
                              0
                          }}
                        >
                          {block.title}
                        </h3>


                        {isCurrent && (

                          <span
                            className="tag"
                            style={{
                              color:
                                '#5eead4'
                            }}
                          >
                            NOW
                          </span>

                        )}

                      </div>


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
                        {block.time}
                      </small>

                    </div>


                    {block.items.length >
                      0 && (

                      <span
                        className="pill"
                      >
                        {completedInBlock}
                        /
                        {block.items.length}
                      </span>

                    )}

                  </div>


                  <p
                    style={{
                      color:
                        '#cbd5e1',

                      margin:
                        '10px 0 0'
                    }}
                  >
                    {block.description}
                  </p>


                  {/* EMPTY BLOCK */}

                  {block.items.length ===
                    0 && (

                    <div
                      className="callout"

                      style={{
                        marginTop:
                          '14px'
                      }}
                    >

                      <strong>
                        ✓ No fixed task
                      </strong>


                      <p>
                        Use this block for optional
                        reading, rest or unfinished
                        study work.
                      </p>

                    </div>

                  )}


                  {/* BLOCK ITEMS */}

                  {block.items.length >
                    0 && (

                    <div
                      style={{
                        display:
                          'grid',

                        gap:
                          '10px',

                        marginTop:
                          '14px'
                      }}
                    >

                      {block.items.map(
                        item => (

                          <div
                            key={
                              item.id
                            }

                            style={{
                              padding:
                                '12px',

                              border:
                                item.urgent
                                  ? '1px solid rgba(248,113,113,.35)'
                                  : item.done
                                  ? '1px solid rgba(45,212,191,.25)'
                                  : '1px solid rgba(255,255,255,.08)',

                              borderRadius:
                                '12px',

                              background:
                                item.urgent
                                  ? 'rgba(127,29,29,.12)'
                                  : item.done
                                  ? 'rgba(20,184,166,.06)'
                                  : 'rgba(255,255,255,.025)'
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
                                {item.badge}
                              </span>


                              {item.taskId && (

                                <label
                                  style={{
                                    display:
                                      'flex',

                                    gap:
                                      '7px',

                                    alignItems:
                                      'center',

                                    cursor:
                                      'pointer'
                                  }}
                                >

                                  <input
                                    type="checkbox"

                                    checked={
                                      item.done
                                    }

                                    onChange={
                                      event =>
                                        setTaskDone(
                                          item.taskId!,
                                          event.target.checked
                                        )
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


                                  <small>
                                    Done
                                  </small>

                                </label>

                              )}

                            </div>


                            <strong
                              style={{
                                display:
                                  'block',

                                marginTop:
                                  '9px',

                                textDecoration:
                                  item.done
                                    ? 'line-through'
                                    : 'none',

                                opacity:
                                  item.done
                                    ? 0.72
                                    : 1
                              }}
                            >
                              {item.title}
                            </strong>


                            <p
                              style={{
                                margin:
                                  '6px 0 0',

                                color:
                                  '#cbd5e1',

                                lineHeight:
                                  1.55
                              }}
                            >
                              {item.detail}
                            </p>


                            {item.onAction &&
                              item.actionLabel && (

                              <button
                                type="button"

                                className={
                                  item.urgent
                                    ? 'primary-btn'
                                    : 'secondary-btn'
                                }

                                onClick={
                                  item.onAction
                                }

                                style={{
                                  marginTop:
                                    '10px'
                                }}
                              >
                                {item.actionLabel}
                              </button>

                            )}

                          </div>

                        )
                      )}

                    </div>

                  )}

                </article>

              );
            }
          )}

        </div>

      )}


      {/* =====================================
          EXPLANATION
      ===================================== */}

      {!loading && (

        <div
          className="callout"

          style={{
            marginTop:
              '16px'
          }}
        >

          <strong>
            Flexible, not compulsory
          </strong>


          <p>
            These time blocks are suggested study
            windows. Students can study at different
            times without losing task or revision
            progress.
          </p>

        </div>

      )}

    </section>

  );
}

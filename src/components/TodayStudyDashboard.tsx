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


type ProgressRow = {
  revision_count:
    number |
    string |
    null;

  next_revision_due_at:
    string |
    null;
};


type CurrentAffairRow = {
  id: string;
  title: string;
  subject: string;
  published_at:
    string |
    null;
};


type QueueItem = {
  id: string;
  priority: number;

  badge: string;
  title: string;
  detail: string;

  actionLabel:
    string |
    null;

  onAction:
    (() => void) |
    null;

  taskId:
    string |
    null;

  urgent: boolean;
};


type TodayStudyDashboardProps = {

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


/*
 * =========================================
 * TODAY STUDY DASHBOARD
 * =========================================
 */

export function TodayStudyDashboard({

  tasks,
  setTasks,
  onOpenCurrent,
  onOpenPractice,
  onOpenBookProgress

}: TodayStudyDashboardProps) {

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
   * CURRENT AFFAIRS
   * =========================================
   */

  const [
    todayCurrentCount,
    setTodayCurrentCount
  ] =
    useState(
      0
    );


  const [
    latestCurrent,
    setLatestCurrent
  ] =
    useState<
      CurrentAffairRow |
      null
    >(
      null
    );


  /*
   * =========================================
   * PAGE STATE
   * =========================================
   */

  const [
    signedIn,
    setSignedIn
  ] =
    useState(
      false
    );


  const [
    loading,
    setLoading
  ] =
    useState(
      true
    );


  const [
    error,
    setError
  ] =
    useState('');


  /*
   * =========================================
   * LOAD TODAY DATA
   * =========================================
   */

  async function loadTodayData() {

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
     * TODAY RANGE
     */

    const today =
      startOfLocalDay(
        new Date()
      );


    const tomorrow =
      addDays(
        today,
        1
      );


    const todayIso =
      today.toISOString();


    const tomorrowIso =
      tomorrow.toISOString();


    /*
     * CURRENT AFFAIRS
     *
     * Public published content can
     * be loaded even when signed out.
     */

    const {
      data:
        currentData,

      count:
        currentCount,

      error:
        currentError
    } =
      await client
        .from(
          'current_affairs'
        )
        .select(
          `
          id,
          title,
          subject,
          published_at
          `,
          {
            count:
              'exact'
          }
        )
        .eq(
          'status',
          'published'
        )
        .gte(
          'published_at',
          todayIso
        )
        .lt(
          'published_at',
          tomorrowIso
        )
        .order(
          'published_at',
          {
            ascending:
              false
          }
        )
        .limit(
          1
        );


    if (
      currentError
    ) {

      console.error(
        'Unable to load today current affairs:',
        currentError
      );

    } else {

      setTodayCurrentCount(
        currentCount ||
        0
      );


      if (
        currentData &&
        currentData.length >
          0
      ) {

        const item =
          currentData[0];


        setLatestCurrent({

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
              'Current Affairs'
            ),

          published_at:
            item.published_at
              ? String(
                  item.published_at
                )
              : null

        });

      } else {

        setLatestCurrent(
          null
        );
      }
    }


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


    /*
     * OUTSTANDING REVISION SCHEDULE
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
        );


    if (
      progressError
    ) {

      console.error(
        'Unable to load today revision priorities:',
        progressError
      );


      setError(
        progressError.message
      );


      setLoading(
        false
      );


      return;
    }


    const rows:
      ProgressRow[] =
        (
          progressData ||
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


    let todayCount =
      0;


    let overdueCount =
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

          todayCount +=
            1;
        }
      }
    );


    setDueToday(
      todayCount
    );


    setOverdue(
      overdueCount
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

      void loadTodayData();

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
   * COMPLETION
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
   * PRIORITISED QUEUE
   * =========================================
   */

  const queue =
    useMemo(
      () => {

        const items:
          QueueItem[] = [];


        /*
         * PRIORITY 1
         * OVERDUE REVISION
         */

        if (
          signedIn &&
          overdue >
            0
        ) {

          items.push({

            id:
              'overdue-revision',

            priority:
              1,

            badge:
              'OVERDUE',

            title:
              `Complete ${overdue} overdue ${
                overdue ===
                  1
                  ? 'revision'
                  : 'revisions'
              }`,

            detail:
              'Clear overdue revision work before adding more study load.',

            actionLabel:
              'Open Revision Tracker',

            onAction:
              onOpenBookProgress,

            taskId:
              null,

            urgent:
              true

          });
        }


        /*
         * PRIORITY 2
         * TODAY REVISION
         */

        if (
          signedIn &&
          dueToday >
            0
        ) {

          items.push({

            id:
              'today-revision',

            priority:
              2,

            badge:
              'DUE TODAY',

            title:
              `${dueToday} ${
                dueToday ===
                  1
                  ? 'revision is'
                  : 'revisions are'
              } due today`,

            detail:
              'Finish scheduled revision while the material is still fresh.',

            actionLabel:
              'Start Revision',

            onAction:
              onOpenBookProgress,

            taskId:
              'rev',

            urgent:
              false

          });
        }


        /*
         * PRIORITY 3
         * CURRENT AFFAIRS
         */

        const currentTask =
          getTask(
            'ca'
          );


        if (
          !currentTask?.done
        ) {

          items.push({

            id:
              'current-affairs',

            priority:
              3,

            badge:
              'CURRENT AFFAIRS',

            title:
              todayCurrentCount >
                0
                ? `Read today's ${todayCurrentCount} Current Affairs ${
                    todayCurrentCount ===
                      1
                      ? 'brief'
                      : 'briefs'
                  }`
                : 'Review Current Affairs',

            detail:
              latestCurrent
                ? `${latestCurrent.subject}: ${latestCurrent.title}`
                : 'Open the Current Affairs section and complete today’s reading.',

            actionLabel:
              'Open Current Affairs',

            onAction:
              onOpenCurrent,

            taskId:
              'ca',

            urgent:
              false

          });
        }


        /*
         * PRIORITY 4
         * PRELIMS PRACTICE
         */

        const mcqTask =
          getTask(
            'mcq'
          );


        if (
          !mcqTask?.done
        ) {

          items.push({

            id:
              'mcq-practice',

            priority:
              4,

            badge:
              'PRACTICE',

            title:
              'Attempt at least 10 MCQs',

            detail:
              'Use a short question session to test recall and identify weak areas.',

            actionLabel:
              'Start MCQs',

            onAction:
              onOpenPractice,

            taskId:
              'mcq',

            urgent:
              false

          });
        }


        /*
         * PRIORITY 5
         * GENERAL REVISION TASK
         *
         * Only add this separate item
         * when no scheduled revision
         * is already due today.
         */

        const revisionTask =
          getTask(
            'rev'
          );


        if (
          !revisionTask?.done &&
          dueToday ===
            0 &&
          overdue ===
            0
        ) {

          items.push({

            id:
              'general-revision',

            priority:
              5,

            badge:
              'REVISION',

            title:
              'Revise one saved topic',

            detail:
              'Choose one completed portion and reinforce it before ending today’s study.',

            actionLabel:
              'Open Book Progress',

            onAction:
              onOpenBookProgress,

            taskId:
              'rev',

            urgent:
              false

          });
        }


        /*
         * OTHER DAILY TASKS
         *
         * Future custom tasks can
         * still appear automatically.
         */

        tasks
          .filter(
            task =>
              !task.done &&
              ![
                'ca',
                'mcq',
                'rev'
              ].includes(
                task.id
              )
          )
          .forEach(
            (
              task,
              index
            ) => {

              items.push({

                id:
                  `task-${task.id}`,

                priority:
                  10 +
                  index,

                badge:
                  'DAILY TASK',

                title:
                  task.label,

                detail:
                  'Complete this item from your daily study plan.',

                actionLabel:
                  null,

                onAction:
                  null,

                taskId:
                  task.id,

                urgent:
                  false

              });

            }
          );


        return items.sort(
          (
            first,
            second
          ) =>
            first.priority -
            second.priority
        );

      },
      [
        tasks,
        dueToday,
        overdue,
        signedIn,
        todayCurrentCount,
        latestCurrent,
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

      {/* HEADER */}

      <div
        className="panel-head"
      >

        <div>

          <span
            className="eyebrow"
          >
            TODAY'S STUDY
          </span>


          <h2>
            Priority Study Queue
          </h2>


          <p>
            A simple order for what to study
            next based on revisions, Current
            Affairs and daily practice.
          </p>

        </div>


        <button
          type="button"
          className="text-btn"

          onClick={() =>
            void loadTodayData()
          }
        >
          Refresh
        </button>

      </div>


      {/* DAILY PLAN PROGRESS */}

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
            Daily plan
          </strong>


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


      {/* SUMMARY */}

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
              '16px'
          }}
        >

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


          <span
            className="tag"
          >
            Revisions today:
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
            Current Affairs:
            {' '}
            {todayCurrentCount}
          </span>

        </div>

      )}


      {/* LOADING */}

      {loading && (

        <p
          style={{
            marginTop:
              '16px'
          }}
        >
          Building today's study priorities...
        </p>

      )}


      {/* ERROR */}

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


      {/* SIGNED OUT NOTE */}

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
            Sign in for revision priorities
          </strong>


          <p>
            Current Affairs and your local daily
            plan still work, but personal revision
            due dates require your account.
          </p>

        </div>

      )}


      {/* ALL DONE */}

      {!loading &&
        queue.length ===
          0 && (

        <div
          className="callout"

          style={{
            marginTop:
              '18px'
          }}
        >

          <strong>
            ✓ Today's priority queue is clear
          </strong>


          <p>
            Your listed daily work is complete
            and no scheduled revision needs
            attention right now.
          </p>

        </div>

      )}


      {/* QUEUE */}

      {!loading &&
        queue.length >
          0 && (

        <div
          style={{
            display:
              'grid',

            gap:
              '12px',

            marginTop:
              '18px'
          }}
        >

          {queue.map(
            (
              item,
              index
            ) => {

              const relatedTask =
                item.taskId
                  ? getTask(
                      item.taskId
                    )
                  : null;


              return (

                <article
                  key={
                    item.id
                  }

                  style={{
                    padding:
                      '14px',

                    border:
                      item.urgent
                        ? '1px solid rgba(248,113,113,.38)'
                        : '1px solid rgba(255,255,255,.08)',

                    borderRadius:
                      '14px',

                    background:
                      item.urgent
                        ? 'rgba(127,29,29,.13)'
                        : 'rgba(255,255,255,.025)'
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

                    <div
                      style={{
                        display:
                          'flex',

                        gap:
                          '10px',

                        alignItems:
                          'flex-start',

                        flex:
                          '1 1 250px'
                      }}
                    >

                      {/* ORDER */}

                      <div
                        style={{
                          width:
                            '30px',

                          height:
                            '30px',

                          borderRadius:
                            '50%',

                          display:
                            'grid',

                          placeItems:
                            'center',

                          flex:
                            '0 0 auto',

                          background:
                            item.urgent
                              ? 'rgba(248,113,113,.16)'
                              : 'rgba(20,184,166,.12)',

                          color:
                            item.urgent
                              ? '#fca5a5'
                              : '#5eead4',

                          fontWeight:
                            700
                        }}
                      >
                        {index + 1}
                      </div>


                      <div>

                        <span
                          className="tag"
                        >
                          {item.badge}
                        </span>


                        <h3
                          style={{
                            margin:
                              '8px 0 5px'
                          }}
                        >
                          {item.title}
                        </h3>


                        <p
                          style={{
                            margin:
                              0,

                            color:
                              '#cbd5e1'
                          }}
                        >
                          {item.detail}
                        </p>

                      </div>

                    </div>


                    {/* TASK CHECKBOX */}

                    {relatedTask && (

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
                            relatedTask.done
                          }

                          onChange={
                            event =>
                              setTaskDone(
                                relatedTask.id,
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


                  {/* ACTION */}

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
                          '12px'
                      }}
                    >
                      {item.actionLabel}
                    </button>

                  )}

                </article>

              );
            }
          )}

        </div>

      )}

    </section>

  );
}

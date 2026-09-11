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


type StudyTimeRow = {
  morning_start:
    string |
    null;

  morning_end:
    string |
    null;

  afternoon_start:
    string |
    null;

  afternoon_end:
    string |
    null;

  evening_start:
    string |
    null;

  evening_end:
    string |
    null;
};


type StudyTimeValues = {
  morningStart: string;
  morningEnd: string;

  afternoonStart: string;
  afternoonEnd: string;

  eveningStart: string;
  eveningEnd: string;
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


const DEFAULT_TIMES:
  StudyTimeValues = {

  morningStart:
    '06:00',

  morningEnd:
    '11:30',

  afternoonStart:
    '12:00',

  afternoonEnd:
    '17:00',

  eveningStart:
    '17:00',

  eveningEnd:
    '23:59'
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


/*
 * =========================================
 * NORMALISE DATABASE TIME
 * =========================================
 */

function normalizeTime(
  value:
    string |
    null |
    undefined,

  fallback:
    string
) {

  if (!value) {

    return fallback;
  }


  const match =
    value.match(
      /^(\d{2}):(\d{2})/
    );


  if (!match) {

    return fallback;
  }


  return (
    `${match[1]}:${match[2]}`
  );
}


/*
 * =========================================
 * TIME TO MINUTES
 * =========================================
 */

function timeToMinutes(
  value:
    string
) {

  const parts =
    value.split(':');


  if (
    parts.length <
    2
  ) {

    return -1;
  }


  const hours =
    Number(
      parts[0]
    );


  const minutes =
    Number(
      parts[1]
    );


  if (
    !Number.isFinite(
      hours
    ) ||
    !Number.isFinite(
      minutes
    )
  ) {

    return -1;
  }


  return (
    hours *
    60 +
    minutes
  );
}


/*
 * =========================================
 * FRIENDLY TIME
 * =========================================
 */

function friendlyTime(
  value:
    string
) {

  const minutes =
    timeToMinutes(
      value
    );


  if (
    minutes <
    0
  ) {

    return value;
  }


  const hour24 =
    Math.floor(
      minutes /
      60
    );


  const minute =
    minutes %
    60;


  const period =
    hour24 >=
      12
      ? 'PM'
      : 'AM';


  const hour12 =
    hour24 %
      12 ||
    12;


  return (
    `${hour12}:${String(
      minute
    ).padStart(
      2,
      '0'
    )} ${period}`
  );
}


/*
 * =========================================
 * FRIENDLY RANGE
 * =========================================
 */

function friendlyRange(
  start:
    string,

  end:
    string
) {

  return (
    `${friendlyTime(
      start
    )} – ${friendlyTime(
      end
    )}`
  );
}


/*
 * =========================================
 * CURRENT STUDY PERIOD
 * =========================================
 */

function getCurrentPeriod(
  date:
    Date,

  times:
    StudyTimeValues
):
  StudyPeriod |
  null {

  const currentMinutes =
    date.getHours() *
      60 +
    date.getMinutes();


  const morningStart =
    timeToMinutes(
      times.morningStart
    );


  const morningEnd =
    timeToMinutes(
      times.morningEnd
    );


  const afternoonStart =
    timeToMinutes(
      times.afternoonStart
    );


  const afternoonEnd =
    timeToMinutes(
      times.afternoonEnd
    );


  const eveningStart =
    timeToMinutes(
      times.eveningStart
    );


  const eveningEnd =
    timeToMinutes(
      times.eveningEnd
    );


  if (
    currentMinutes >=
      morningStart &&
    currentMinutes <
      morningEnd
  ) {

    return 'morning';
  }


  if (
    currentMinutes >=
      afternoonStart &&
    currentMinutes <
      afternoonEnd
  ) {

    return 'afternoon';
  }


  if (
    currentMinutes >=
      eveningStart &&
    currentMinutes <
      eveningEnd
  ) {

    return 'evening';
  }


  return null;
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
   * CURRENT DEVICE TIME
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
   * PERSONAL STUDY TIMES
   * =========================================
   */

  const [
    studyTimes,
    setStudyTimes
  ] =
    useState<
      StudyTimeValues
    >(
      DEFAULT_TIMES
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
   * UPDATE CURRENT DEVICE TIME
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
   * LOAD PERSONAL PLAN
   * =========================================
   */

  async function loadPlan() {

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


    /*
     * SIGNED OUT
     *
     * Use default times.
     */

    if (!user) {

      setSignedIn(
        false
      );


      setStudyTimes(
        DEFAULT_TIMES
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
     * LOAD:
     *
     * 1. Personal study time settings
     * 2. Revision schedule
     */

    const [
      timeResult,
      progressResult
    ] =
      await Promise.all([

        client
          .from(
            'study_time_preferences'
          )
          .select(
            `
            morning_start,
            morning_end,
            afternoon_start,
            afternoon_end,
            evening_start,
            evening_end
            `
          )
          .eq(
            'user_id',
            user.id
          )
          .maybeSingle(),

        client
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
          )

      ]);


    /*
     * PERSONAL TIMES
     */

    if (
      timeResult.error
    ) {

      console.error(
        'Unable to load study time preferences:',
        timeResult.error
      );


      setError(
        timeResult.error.message
      );


      setLoading(
        false
      );


      return;
    }


    if (
      timeResult.data
    ) {

      const row =
        timeResult.data as
          StudyTimeRow;


      setStudyTimes({

        morningStart:
          normalizeTime(
            row.morning_start,
            DEFAULT_TIMES
              .morningStart
          ),

        morningEnd:
          normalizeTime(
            row.morning_end,
            DEFAULT_TIMES
              .morningEnd
          ),

        afternoonStart:
          normalizeTime(
            row.afternoon_start,
            DEFAULT_TIMES
              .afternoonStart
          ),

        afternoonEnd:
          normalizeTime(
            row.afternoon_end,
            DEFAULT_TIMES
              .afternoonEnd
          ),

        eveningStart:
          normalizeTime(
            row.evening_start,
            DEFAULT_TIMES
              .eveningStart
          ),

        eveningEnd:
          normalizeTime(
            row.evening_end,
            DEFAULT_TIMES
              .eveningEnd
          )

      });

    } else {

      /*
       * No saved settings yet.
       * Continue with defaults.
       */

      setStudyTimes(
        DEFAULT_TIMES
      );
    }


    /*
     * REVISION DATA
     */

    if (
      progressResult.error
    ) {

      console.error(
        'Unable to load revision priorities:',
        progressResult.error
      );


      setError(
        progressResult.error.message
      );


      setLoading(
        false
      );


      return;
    }


    const progressRows:
      ProgressRow[] =
        (
          progressResult.data ||
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


    let dueTodayCount =
      0;


    let overdueCount =
      0;


    progressRows.forEach(
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


    setDueToday(
      dueTodayCount
    );


    setOverdue(
      overdueCount
    );


    setLoading(
      false
    );
  }


  /*
   * =========================================
   * INITIAL LOAD
   * =========================================
   */

  useEffect(
    () => {

      void loadPlan();

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
   * CURRENT PERSONAL STUDY PERIOD
   * =========================================
   */

  const currentPeriod =
    useMemo(
      () =>
        getCurrentPeriod(
          now,
          studyTimes
        ),
      [
        now,
        studyTimes
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
   * BUILD PERSONAL TIME BLOCKS
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
         *
         * Overdue revision
         * Current Affairs
         * =====================================
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
              'Start with pending revision work before adding too much new material.',

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
                : 'Read and understand important issues before moving to practice.',

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
         *
         * MCQ Practice
         * =====================================
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
                : 'Use practice to check recall and identify weak areas.',

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
         *
         * Scheduled revision first.
         * =====================================
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
              'Complete the scheduled revision stages in Book Progress.',

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
         * =====================================
         * OTHER / FUTURE DAILY TASKS
         *
         * Put them in Evening by default.
         * =====================================
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
              friendlyRange(
                studyTimes
                  .morningStart,

                studyTimes
                  .morningEnd
              ),

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
              friendlyRange(
                studyTimes
                  .afternoonStart,

                studyTimes
                  .afternoonEnd
              ),

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
              friendlyRange(
                studyTimes
                  .eveningStart,

                studyTimes
                  .eveningEnd
              ),

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
        studyTimes,
        onOpenCurrent,
        onOpenPractice,
        onOpenBookProgress
      ]
    );


  /*
   * =========================================
   * CURRENT BLOCK LABEL
   * =========================================
   */

  const currentBlockLabel =
    currentPeriod ===
      'morning'
      ? 'Morning'

      : currentPeriod ===
        'afternoon'
      ? 'Afternoon'

      : currentPeriod ===
        'evening'
      ? 'Evening'

      : 'Outside study window';


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
            TODAY'S STUDY PLAN
          </span>


          <h2>
            Morning → Afternoon → Evening
          </h2>


          <p>
            Your daily tasks are arranged around
            your own saved study hours.
          </p>

        </div>


        <button
          type="button"
          className="text-btn"

          disabled={
            loading
          }

          onClick={() =>
            void loadPlan()
          }
        >
          Refresh Plan
        </button>

      </div>


      {/* DAILY PROGRESS */}

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
            Daily progress
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


      {/* STATUS */}

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
            {currentBlockLabel}
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


      {/* LOADING */}

      {loading && (

        <p
          style={{
            marginTop:
              '16px'
          }}
        >
          Preparing your personal study plan...
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


      {/* SIGNED OUT */}

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
            Using default study hours
          </strong>


          <p>
            Sign in to use your personal Morning,
            Afternoon and Evening study settings.
          </p>

        </div>

      )}


      {/* PERSONAL TIME BLOCKS */}

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
                        ? '1px solid rgba(45,212,191,.55)'
                        : '1px solid rgba(255,255,255,.08)',

                    borderRadius:
                      '16px',

                    background:
                      isCurrent
                        ? 'rgba(20,184,166,.08)'
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
                        study, rest or unfinished work.
                      </p>

                    </div>

                  )}


                  {/* TASKS */}

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


      {/* PERSONAL SCHEDULE SUMMARY */}

      {!loading &&
        signedIn && (

        <div
          className="callout"

          style={{
            marginTop:
              '16px'
          }}
        >

          <strong>
            Personal study schedule active
          </strong>


          <p>
            Morning:
            {' '}
            {friendlyRange(
              studyTimes.morningStart,
              studyTimes.morningEnd
            )}
            <br />

            Afternoon:
            {' '}
            {friendlyRange(
              studyTimes.afternoonStart,
              studyTimes.afternoonEnd
            )}
            <br />

            Evening:
            {' '}
            {friendlyRange(
              studyTimes.eveningStart,
              studyTimes.eveningEnd
            )}
          </p>

        </div>

      )}


      {/* FLEXIBLE EXPLANATION */}

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
            Your personal study hours only decide
            which block is highlighted as NOW.
            You can open and complete any task at
            any time.
          </p>

        </div>

      )}

    </section>

  );
}

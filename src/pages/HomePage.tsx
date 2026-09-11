import {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  IonIcon
} from '@ionic/react';

import {
  arrowForwardOutline,
  checkmarkCircle,
  ellipseOutline,
  flameOutline,
  statsChartOutline,
  trophyOutline
} from 'ionicons/icons';

import type {
  DailyTask
} from '../types';

import {
  subjects
} from '../data/mock';

import {
  TopBar
} from '../components/TopBar';

import {
  HomeSyllabusSnapshot
} from '../components/HomeSyllabusSnapshot';

import {
  HomeBookProgressSnapshot
} from '../components/HomeBookProgressSnapshot';

import {
  RevisionDueToday
} from '../components/RevisionDueToday';

import {
  HomeRevisionWeekPreview
} from '../components/HomeRevisionWeekPreview';

import {
  TodayStudyDashboard
} from '../components/TodayStudyDashboard';

import {
  supabase
} from '../lib/supabase';


type AttemptStatRow = {
  score_percent:
    number |
    string |
    null;

  completed_at:
    string |
    null;
};


type HomeLearnMode =
  | 'syllabus'
  | 'resources'
  | 'book-progress';


type HomePageProps = {
  tasks:
    DailyTask[];

  setTasks:
    (
      tasks:
        DailyTask[]
    ) => void;

  onGoPractice:
    () => void;

  onGoLearn:
    (
      subject?:
        string |
        null,

      mode?:
        HomeLearnMode
    ) => void;

  onGoCurrent:
    () => void;
};


/*
 * SAFE NUMBER
 */

function safeNumber(
  value:
    number |
    string |
    null |
    undefined
) {

  const number =
    Number(
      value
    );


  return Number.isFinite(
    number
  )
    ? number
    : 0;
}


/*
 * LOCAL DATE KEY
 */

function localDateKey(
  date:
    Date
) {

  const year =
    date.getFullYear();


  const month =
    String(
      date.getMonth() +
      1
    ).padStart(
      2,
      '0'
    );


  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      '0'
    );


  return (
    `${year}-${month}-${day}`
  );
}


/*
 * PRACTICE STREAK
 */

function calculateStreak(
  attempts:
    AttemptStatRow[]
) {

  const dateSet =
    new Set<string>();


  attempts.forEach(
    attempt => {

      if (
        !attempt.completed_at
      ) {

        return;
      }


      const date =
        new Date(
          attempt.completed_at
        );


      if (
        Number.isNaN(
          date.getTime()
        )
      ) {

        return;
      }


      dateSet.add(
        localDateKey(
          date
        )
      );
    }
  );


  if (
    dateSet.size ===
    0
  ) {

    return 0;
  }


  const today =
    new Date();


  const yesterday =
    new Date(
      today
    );


  yesterday.setDate(
    yesterday.getDate() -
    1
  );


  let cursor:
    Date;


  if (
    dateSet.has(
      localDateKey(
        today
      )
    )
  ) {

    cursor =
      new Date(
        today
      );

  } else if (
    dateSet.has(
      localDateKey(
        yesterday
      )
    )
  ) {

    cursor =
      new Date(
        yesterday
      );

  } else {

    return 0;
  }


  let streak =
    0;


  while (
    dateSet.has(
      localDateKey(
        cursor
      )
    )
  ) {

    streak +=
      1;


    cursor.setDate(
      cursor.getDate() -
      1
    );
  }


  return streak;
}


/*
 * HOME PAGE
 */

export function HomePage({

  tasks,
  setTasks,
  onGoPractice,
  onGoLearn,
  onGoCurrent

}: HomePageProps) {

  /*
   * =========================================
   * DAILY PLAN
   * =========================================
   */

  const completed =
    tasks.filter(
      task =>
        task.done
    ).length;


  const taskPct =
    tasks.length >
    0
      ? Math.round(
          (
            completed /
            tasks.length
          ) *
          100
        )
      : 0;


  /*
   * =========================================
   * PRELIMS PERFORMANCE
   * =========================================
   */

  const [
    attempts,
    setAttempts
  ] =
    useState<
      AttemptStatRow[]
    >([]);


  const [
    totalAttempts,
    setTotalAttempts
  ] =
    useState(
      0
    );


  const [
    statsLoading,
    setStatsLoading
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


  /*
   * LOAD HOME PERFORMANCE
   */

  useEffect(
    () => {

      let active =
        true;


      async function loadHomeStats() {

        const client =
          supabase;


        if (!client) {

          if (
            active
          ) {

            setStatsLoading(
              false
            );
          }


          return;
        }


        if (
          active
        ) {

          setStatsLoading(
            true
          );
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


        if (
          !active
        ) {

          return;
        }


        if (!user) {

          setSignedIn(
            false
          );


          setAttempts(
            []
          );


          setTotalAttempts(
            0
          );


          setStatsLoading(
            false
          );


          return;
        }


        setSignedIn(
          true
        );


        /*
         * TOTAL PRELIMS SESSIONS
         */

        const [
          practiceCountResult,
          testCountResult
        ] =
          await Promise.all([

            client
              .from(
                'practice_attempts'
              )
              .select(
                'id',
                {
                  count:
                    'exact',

                  head:
                    true
                }
              )
              .eq(
                'user_id',
                user.id
              )
              .not(
                'completed_at',
                'is',
                null
              ),

            client
              .from(
                'test_attempts'
              )
              .select(
                'id',
                {
                  count:
                    'exact',

                  head:
                    true
                }
              )
              .eq(
                'user_id',
                user.id
              )
              .not(
                'completed_at',
                'is',
                null
              )

          ]);


        if (
          !active
        ) {

          return;
        }


        if (
          practiceCountResult.error
        ) {

          console.error(
            'Unable to count Prelims practice attempts:',
            practiceCountResult.error
          );
        }


        if (
          testCountResult.error
        ) {

          console.error(
            'Unable to count Test Series attempts:',
            testCountResult.error
          );
        }


        setTotalAttempts(
          (
            practiceCountResult.count ||
            0
          ) +
          (
            testCountResult.count ||
            0
          )
        );


        /*
         * LOAD RECENT PERFORMANCE
         */

        const [
          practiceResult,
          testResult
        ] =
          await Promise.all([

            client
              .from(
                'practice_attempts'
              )
              .select(
                `
                score_percent,
                completed_at
                `
              )
              .eq(
                'user_id',
                user.id
              )
              .not(
                'completed_at',
                'is',
                null
              )
              .order(
                'completed_at',
                {
                  ascending:
                    false
                }
              )
              .limit(
                200
              ),

            client
              .from(
                'test_attempts'
              )
              .select(
                `
                score,
                completed_at
                `
              )
              .eq(
                'user_id',
                user.id
              )
              .not(
                'completed_at',
                'is',
                null
              )
              .order(
                'completed_at',
                {
                  ascending:
                    false
                }
              )
              .limit(
                200
              )

          ]);


        if (
          !active
        ) {

          return;
        }


        if (
          practiceResult.error
        ) {

          console.error(
            'Unable to load Prelims practice stats:',
            practiceResult.error
          );
        }


        if (
          testResult.error
        ) {

          console.error(
            'Unable to load Test Series stats:',
            testResult.error
          );
        }


        const practiceRows:
          AttemptStatRow[] =
            (
              practiceResult.data ||
              []
            ).map(
              item => ({

                score_percent:
                  item.score_percent,

                completed_at:
                  item.completed_at

              })
            );


        const testRows:
          AttemptStatRow[] =
            (
              testResult.data ||
              []
            ).map(
              item => ({

                score_percent:
                  item.score,

                completed_at:
                  item.completed_at

              })
            );


        const combinedAttempts =
          [
            ...practiceRows,
            ...testRows
          ]
            .sort(
              (
                first,
                second
              ) => {

                const firstTime =
                  first.completed_at
                    ? new Date(
                        first.completed_at
                      ).getTime()
                    : 0;


                const secondTime =
                  second.completed_at
                    ? new Date(
                        second.completed_at
                      ).getTime()
                    : 0;


                return (
                  secondTime -
                  firstTime
                );
              }
            )
            .slice(
              0,
              200
            );


        setAttempts(
          combinedAttempts
        );


        setStatsLoading(
          false
        );
      }


      void loadHomeStats();


      return () => {

        active =
          false;
      };

    },
    []
  );


  /*
   * =========================================
   * LAST FIVE SESSION AVERAGE
   * =========================================
   */

  const recentAverage =
    useMemo(
      () => {

        const recent =
          attempts.slice(
            0,
            5
          );


        if (
          recent.length ===
          0
        ) {

          return 0;
        }


        const total =
          recent.reduce(
            (
              sum,
              attempt
            ) =>
              sum +
              safeNumber(
                attempt.score_percent
              ),
            0
          );


        return Math.round(
          total /
          recent.length
        );

      },
      [
        attempts
      ]
    );


  /*
   * =========================================
   * PRACTICE STREAK
   * =========================================
   */

  const currentStreak =
    useMemo(
      () =>
        calculateStreak(
          attempts
        ),
      [
        attempts
      ]
    );


  /*
   * =========================================
   * DAILY PLAN TOGGLE
   * =========================================
   */

  function toggleTask(
    id:
      string
  ) {

    setTasks(
      tasks.map(
        task =>

          task.id ===
          id

            ? {
                ...task,

                done:
                  !task.done
              }

            : task
      )
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

      {/* =====================================
          HEADER
      ===================================== */}

      <TopBar

        title="UPSC Study Hub"

        subtitle="Preparation that moves with you"

      />


      {/* =====================================
          TODAY'S FOCUS
      ===================================== */}

      <section
        className="hero-card"
      >

        <div>

          <span
            className="eyebrow"
          >
            TODAY'S FOCUS
          </span>


          <h2>
            Small steps. Strong preparation.
          </h2>


          <p>
            Finish the essential work first.
            Your consistency matters more
            than a crowded timetable.
          </p>


          <button
            type="button"
            className="primary-btn"

            onClick={
              onGoCurrent
            }
          >

            Start today's study


            <IonIcon
              icon={
                arrowForwardOutline
              }
            />

          </button>

        </div>


        <div
          className="hero-ring"
        >

          <strong>
            {taskPct}%
          </strong>


          <span>
            tasks
          </span>

        </div>

      </section>


      {/* =====================================
          TODAY STUDY DASHBOARD
      ===================================== */}

      <div
        style={{
          marginTop:
            '18px'
        }}
      >

        <TodayStudyDashboard

          tasks={
            tasks
          }

          setTasks={
            setTasks
          }

          onOpenCurrent={
            onGoCurrent
          }

          onOpenPractice={
            onGoPractice
          }

          onOpenBookProgress={() =>
            onGoLearn(
              null,
              'book-progress'
            )
          }

        />

      </div>


      {/* =====================================
          PERFORMANCE METRICS
      ===================================== */}

      <section
        className="metrics-grid"
      >

        {/* AVERAGE SCORE */}

        <article
          className="metric-card"
        >

          <div
            className="metric-icon"
          >

            <IonIcon
              icon={
                statsChartOutline
              }
            />

          </div>


          <div>

            <span>
              Average score
            </span>


            <strong>

              {
                statsLoading
                  ? '...'

                  : signedIn &&
                    attempts.length >
                      0
                  ? `${recentAverage}%`

                  : '—'
              }

            </strong>


            <small>

              {
                signedIn
                  ? attempts.length >
                    0
                    ? `Last ${Math.min(
                        5,
                        attempts.length
                      )} sessions`

                    : 'Complete your first practice'

                  : 'Sign in to track'
              }

            </small>

          </div>

        </article>


        {/* PRELIMS SESSIONS */}

        <article
          className="metric-card"
        >

          <div
            className="metric-icon coral"
          >

            <IonIcon
              icon={
                trophyOutline
              }
            />

          </div>


          <div>

            <span>
              Prelims sessions
            </span>


            <strong>

              {
                statsLoading
                  ? '...'

                  : signedIn
                  ? totalAttempts

                  : '—'
              }

            </strong>


            <small>

              {
                signedIn
                  ? totalAttempts ===
                    1
                    ? '1 session completed'

                    : `${totalAttempts} sessions completed`

                  : 'Sign in to track'
              }

            </small>

          </div>

        </article>


        {/* PRACTICE STREAK */}

        <article
          className="metric-card"
        >

          <div
            className="metric-icon amber"
          >

            <IonIcon
              icon={
                flameOutline
              }
            />

          </div>


          <div>

            <span>
              Practice streak
            </span>


            <strong>

              {
                statsLoading
                  ? '...'

                  : signedIn
                  ? `${currentStreak} ${
                      currentStreak ===
                      1
                        ? 'day'
                        : 'days'
                    }`

                  : '—'
              }

            </strong>


            <small>

              {
                signedIn
                  ? currentStreak >
                    0
                    ? 'Keep the momentum going'

                    : 'Practise today to start a streak'

                  : 'Sign in to track'
              }

            </small>

          </div>

        </article>

      </section>


      {/* =====================================
          DAILY PLAN + STUDY PROGRESS
      ===================================== */}

      <section
        className="content-grid"

        style={{
          gridTemplateColumns:
            'repeat(auto-fit, minmax(280px, 1fr))'
        }}
      >

        {/* DAILY PLAN */}

        <article
          className="panel"
        >

          <div
            className="panel-head"
          >

            <div>

              <span
                className="eyebrow"
              >
                DAILY PLAN
              </span>


              <h3>
                Complete your essentials
              </h3>

            </div>


            <span
              className="pill"
            >
              {completed}/{tasks.length}
            </span>

          </div>


          <div
            className="task-list"
          >

            {tasks.map(
              task => (

                <button
                  type="button"

                  className={
                    task.done
                      ? 'task done'
                      : 'task'
                  }

                  key={
                    task.id
                  }

                  onClick={() =>
                    toggleTask(
                      task.id
                    )
                  }
                >

                  <IonIcon
                    icon={
                      task.done
                        ? checkmarkCircle
                        : ellipseOutline
                    }
                  />


                  <span>
                    {task.label}
                  </span>

                </button>

              )
            )}

          </div>


          <div
            className="progress-track"
          >

            <span
              style={{
                width:
                  `${taskPct}%`
              }}
            />

          </div>

        </article>


        {/* LIVE SYLLABUS */}

        <HomeSyllabusSnapshot

          onOpenSyllabus={() =>
            onGoLearn(
              null,
              'syllabus'
            )
          }

        />


        {/* BOOK PROGRESS */}

        <HomeBookProgressSnapshot

          onOpenTracker={() =>
            onGoLearn(
              null,
              'book-progress'
            )
          }

        />

      </section>


      {/* =====================================
          REVISION DUE TODAY
      ===================================== */}

      <div
        style={{
          marginTop:
            '18px'
        }}
      >

        <RevisionDueToday

          onOpenTracker={() =>
            onGoLearn(
              null,
              'book-progress'
            )
          }

        />

      </div>


      {/* =====================================
          WEEKLY REVISION PREVIEW
      ===================================== */}

      <div
        style={{
          marginTop:
            '18px'
        }}
      >

        <HomeRevisionWeekPreview

          onOpenCalendar={() =>
            onGoLearn(
              null,
              'book-progress'
            )
          }

        />

      </div>


      {/* =====================================
          QUICK STUDY
      ===================================== */}

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
              QUICK STUDY
            </span>


            <h3>
              Continue by subject
            </h3>

          </div>


          <button
            type="button"
            className="text-btn"

            onClick={() =>
              onGoLearn(
                null,
                'syllabus'
              )
            }
          >
            View all
          </button>

        </div>


        <div
          className="subject-grid"
        >

          {subjects.map(
            subject => (

              <button
                type="button"
                className="subject-tile"

                key={
                  subject.name
                }

                onClick={() =>
                  onGoLearn(
                    subject.name,
                    'syllabus'
                  )
                }
              >

                <span
                  className="subject-emoji"
                >
                  {subject.icon}
                </span>


                <strong>
                  {subject.name}
                </strong>


                <small>
                  Open syllabus
                </small>

              </button>

            )
          )}

        </div>

      </section>


      {/* =====================================
          DAILY PRELIMS PRACTICE
      ===================================== */}

      <section
        className="test-banner"
      >

        <div>

          <span
            className="eyebrow"
          >
            PRACTICE
          </span>


          <h3>
            Daily Prelims practice
          </h3>


          <p>
            Short enough to finish.
            Useful enough to learn from.
          </p>

        </div>


        <button
          type="button"
          className="primary-btn"

          onClick={
            onGoPractice
          }
        >
          Start practice
        </button>

      </section>

    </div>

  );
}

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
    subject?: string | null
  ) => void;

  onGoCurrent:
    () => void;
};


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
    )
      .padStart(
        2,
        '0'
      );


  const day =
    String(
      date.getDate()
    )
      .padStart(
        2,
        '0'
      );


  return (
    `${year}-${month}-${day}`
  );
}


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


  /*
   * Streak remains active
   * if student practised
   * today or yesterday.
   */

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


export function HomePage({
  tasks,
  setTasks,
  onGoPractice,
  onGoLearn,
  onGoCurrent
}: HomePageProps) {

  /*
   * DAILY PLAN
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
   * PRELIMS PERFORMANCE
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
    useState(0);


  const [
    statsLoading,
    setStatsLoading
  ] =
    useState(true);


  const [
    signedIn,
    setSignedIn
  ] =
    useState(false);


  /*
   * LOAD REAL HOME STATS
   */

  useEffect(
    () => {

      async function loadHomeStats() {

        if (!supabase) {

          setStatsLoading(
            false
          );

          return;
        }


        setStatsLoading(
          true
        );


        const {
          data: {
            user
          }
        } =
          await supabase
            .auth
            .getUser();


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

        const {
          count,
          error:
            countError
        } =
          await supabase
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
            );


        if (
          countError
        ) {

          console.error(
            'Unable to count Prelims attempts:',
            countError
          );

        } else {

          setTotalAttempts(
            count ||
            0
          );
        }


        /*
         * RECENT PERFORMANCE
         *
         * We load up to 200 rows
         * for recent average and
         * streak calculation.
         */

        const {
          data,
          error
        } =
          await supabase
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
            .order(
              'completed_at',
              {
                ascending:
                  false
              }
            )
            .limit(
              200
            );


        if (error) {

          console.error(
            'Unable to load Home performance stats:',
            error
          );


          setAttempts(
            []
          );

          setStatsLoading(
            false
          );

          return;
        }


        setAttempts(
          (
            data ||
            []
          ) as
            AttemptStatRow[]
        );


        setStatsLoading(
          false
        );
      }


      void loadHomeStats();

    },
    []
  );


  /*
   * LAST FIVE AVERAGE
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
   * CURRENT PRACTICE STREAK
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
   * DAILY TASK TOGGLE
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


  return (

    <div
      className="page-wrap"
    >

      {/* HEADER */}

      <TopBar
        title="UPSC Study Hub"
        subtitle="Preparation that moves with you"
      />


      {/* TODAY'S FOCUS */}

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


      {/* REAL PERFORMANCE METRICS */}

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


      {/* DAILY PLAN + LIVE SYLLABUS */}

      <section
        className="content-grid two-col"
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


        {/* LIVE SYLLABUS SNAPSHOT */}

        <HomeSyllabusSnapshot
  onOpenSyllabus={() =>
    onGoLearn(
      null
    )
  }
/>

      </section>


      {/* QUICK STUDY */}

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
      null
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
    subject.name
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


      {/* DAILY PRELIMS PRACTICE */}

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

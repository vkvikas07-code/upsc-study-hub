import {
  useEffect,
  useState
} from 'react';

import {
  IonApp
} from '@ionic/react';

import {
  Shell
} from './components/Shell';

import {
  HomePage
} from './pages/HomePage';

import {
  LearnPage
} from './pages/LearnPage';

import {
  PracticePage
} from './pages/PracticePage';

import {
  MainsPracticePage
} from './pages/MainsPracticePage';

import {
  CurrentPage
} from './pages/CurrentPage';

import {
  ProfilePage
} from './pages/ProfilePage';

import {
  AdminPage
} from './pages/AdminPage';

import {
  initialCurrentAffairs
} from './data/mock';

import {
  supabase
} from './lib/supabase';

import type {
  CurrentAffair,
  DailyTask,
  NavKey
} from './types';


const defaultTasks: DailyTask[] = [
  {
    id: 'ca',
    label: 'Read today’s current affairs brief',
    done: false
  },
  {
    id: 'mcq',
    label: 'Attempt at least 10 MCQs',
    done: false
  },
  {
    id: 'rev',
    label: 'Revise one saved topic',
    done: false
  }
];


/*
 * LOCAL DATE
 *
 * Example:
 * 2026-09-10
 *
 * We intentionally use the
 * device's local date instead
 * of UTC so the daily plan
 * changes at the student's
 * local midnight.
 */

function getLocalDateKey() {

  const now =
    new Date();


  const year =
    now.getFullYear();


  const month =
    String(
      now.getMonth() + 1
    ).padStart(
      2,
      '0'
    );


  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      '0'
    );


  return (
    `${year}-${month}-${day}`
  );
}


/*
 * DAILY TASK STORAGE KEY
 */

function getTaskStorageKey(
  day:
    string
) {

  return (
    `upsc_tasks_${day}`
  );
}


/*
 * READ TASKS FOR ONE DAY
 */

function loadTasksForDay(
  day:
    string
): DailyTask[] {

  try {

    const stored =
      localStorage.getItem(
        getTaskStorageKey(
          day
        )
      );


    if (!stored) {

      return defaultTasks.map(
        task => ({
          ...task
        })
      );
    }


    const parsed =
      JSON.parse(
        stored
      );


    if (
      !Array.isArray(
        parsed
      )
    ) {

      return defaultTasks.map(
        task => ({
          ...task
        })
      );
    }


    /*
     * Merge stored completion
     * with current default tasks.
     *
     * This means if we add a
     * new default task later,
     * existing users still get it.
     */

    return defaultTasks.map(
      defaultTask => {

        const storedTask =
          parsed.find(
            item =>
              item &&
              item.id ===
                defaultTask.id
          );


        return {
          ...defaultTask,

          done:
            storedTask?.done ===
            true
        };
      }
    );

  } catch {

    return defaultTasks.map(
      task => ({
        ...task
      })
    );
  }
}


export default function App() {

  /*
   * MAIN NAVIGATION
   */

  const [
    active,
    setActive
  ] =
    useState<NavKey>(
      'home'
    );


  /*
   * PRACTICE MODE
   */

  const [
    practiceMode,
    setPracticeMode
  ] =
    useState<
      'prelims' |
      'mains'
    >(
      'prelims'
    );


  /*
   * CURRENT DAILY PLAN DATE
   */

  const [
    taskDay,
    setTaskDay
  ] =
    useState(
      getLocalDateKey
    );


  /*
   * DAILY TASKS
   */

  const [
    tasks,
    setTasksState
  ] =
    useState<
      DailyTask[]
    >(
      () =>
        loadTasksForDay(
          getLocalDateKey()
        )
    );


  /*
   * CURRENT AFFAIRS
   */

  const [
    articles,
    setArticles
  ] =
    useState<
      CurrentAffair[]
    >(
      initialCurrentAffairs
    );


  /*
   * SAVE DAILY TASKS
   */

  function setTasks(
    next:
      DailyTask[]
  ) {

    setTasksState(
      next
    );


    localStorage.setItem(
      getTaskStorageKey(
        taskDay
      ),
      JSON.stringify(
        next
      )
    );
  }


  /*
   * AUTO RESET DAILY PLAN
   *
   * Check once per minute.
   *
   * If the app stays open
   * across midnight, it will
   * automatically load a fresh
   * plan for the new date.
   */

  useEffect(
    () => {

      const timer =
        window.setInterval(
          () => {

            const currentDay =
              getLocalDateKey();


            if (
              currentDay !==
              taskDay
            ) {

              setTaskDay(
                currentDay
              );


              setTasksState(
                loadTasksForDay(
                  currentDay
                )
              );


              window.scrollTo({
                top: 0,
                behavior: 'smooth'
              });
            }

          },
          60_000
        );


      return () => {

        window.clearInterval(
          timer
        );
      };

    },
    [
      taskDay
    ]
  );


  /*
   * PUBLISH CURRENT AFFAIR
   * LOCALLY AFTER ADMIN SAVE
   */

  function publish(
    item:
      CurrentAffair
  ) {

    setArticles(
      current => [
        item,
        ...current
      ]
    );
  }


  /*
   * OPEN PRELIMS PRACTICE
   *
   * Always force Prelims mode
   * before opening Practice.
   */

  function openPrelimsPractice() {

    setPracticeMode(
      'prelims'
    );


    setActive(
      'practice'
    );
  }


  /*
   * LOAD PUBLISHED
   * CURRENT AFFAIRS
   */

  useEffect(
    () => {

      async function loadCurrentAffairs() {

        if (!supabase) {

          console.log(
            'Supabase is not configured.'
          );

          return;
        }


        const {
          data,
          error
        } =
          await supabase
            .from(
              'current_affairs'
            )
            .select(
              `
              id,
              title,
              source,
              subject,
              summary,
              tags,
              prelims,
              mains,
              published_at,
              status
              `
            )
            .eq(
              'status',
              'published'
            )
            .order(
              'published_at',
              {
                ascending:
                  false
              }
            );


        if (error) {

          console.error(
            'Unable to load current affairs:',
            error
          );

          return;
        }


        if (
          !data ||
          data.length === 0
        ) {

          return;
        }


        const formattedArticles:
          CurrentAffair[] =
            data.map(
              item => ({

                id:
                  item.id,

                title:
                  item.title,

                source:
                  item.source,

                subject:
                  item.subject,

                summary:
                  item.summary,

                tags:
                  item.tags ||
                  [],

                prelims:
                  item.prelims,

                mains:
                  item.mains,

                publishedAt:
                  item.published_at
                    ? new Date(
                        item.published_at
                      )
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
                        )
                    : ''
              })
            );


        setArticles(
          formattedArticles
        );
      }


      void loadCurrentAffairs();

    },
    []
  );


  /*
   * SCROLL TO TOP
   * WHEN MAIN TAB CHANGES
   */

  useEffect(
    () => {

      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });

    },
    [
      active
    ]
  );


  /*
   * HOME
   */

  let content = (

    <HomePage
      tasks={
        tasks
      }

      setTasks={
        setTasks
      }

      onGoPractice={
        openPrelimsPractice
      }

      onGoLearn={() =>
        setActive(
          'learn'
        )
      }

      onGoCurrent={() =>
        setActive(
          'current'
        )
      }
    />

  );


  /*
   * LEARN
   */

  if (
    active ===
    'learn'
  ) {

    content = (
      <LearnPage />
    );
  }


  /*
   * PRACTICE
   */

  if (
    active ===
    'practice'
  ) {

    content = (

      <>

        <div
          className="page-wrap"
        >

          <div
            className="filter-row"
            style={{
              paddingTop: '18px',
              paddingBottom: '0'
            }}
          >

            <button
              type="button"

              className={
                practiceMode ===
                  'prelims'
                  ? 'filter active'
                  : 'filter'
              }

              onClick={() =>
                setPracticeMode(
                  'prelims'
                )
              }
            >
              Prelims MCQ
            </button>


            <button
              type="button"

              className={
                practiceMode ===
                  'mains'
                  ? 'filter active'
                  : 'filter'
              }

              onClick={() =>
                setPracticeMode(
                  'mains'
                )
              }
            >
              Mains Answer Writing
            </button>

          </div>

        </div>


        {
          practiceMode ===
          'prelims'
            ? (
              <PracticePage />
            )
            : (
              <MainsPracticePage />
            )
        }

      </>

    );
  }


  /*
   * CURRENT AFFAIRS
   */

  if (
    active ===
    'current'
  ) {

    content = (

      <CurrentPage
        items={
          articles
        }
      />

    );
  }


  /*
   * MY STUDY
   */

  if (
    active ===
    'profile'
  ) {

    content = (

      <ProfilePage
        onAdmin={() =>
          setActive(
            'admin'
          )
        }

        onOpenPractice={
          openPrelimsPractice
        }
      />

    );
  }


  /*
   * ADMIN
   */

  if (
    active ===
    'admin'
  ) {

    content = (

      <AdminPage
        onPublish={
          item => {

            publish(
              item
            );


            setActive(
              'current'
            );
          }
        }
      />

    );
  }


  /*
   * APPLICATION SHELL
   */

  return (

    <IonApp>

      <Shell
        active={
          active
        }

        onNavigate={
          setActive
        }
      >

        {content}

      </Shell>

    </IonApp>

  );
}

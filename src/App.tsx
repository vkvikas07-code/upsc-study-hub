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


const defaultTasks:
  DailyTask[] = [

  {
    id:
      'ca',

    label:
      'Read today’s current affairs brief',

    done:
      false
  },

  {
    id:
      'mcq',

    label:
      'Attempt at least 10 MCQs',

    done:
      false
  },

  {
    id:
      'rev',

    label:
      'Revise one saved topic',

    done:
      false
  }

];


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
   * PRACTICE SECTION
   *
   * Prelims or Mains
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
   * DAILY TASKS
   */

  const [
    tasks,
    setTasksState
  ] =
    useState<
      DailyTask[]
    >(
      () => {

        try {

          return (

            JSON.parse(
              localStorage.getItem(
                'upsc_tasks'
              ) ||
              'null'
            ) ||

            defaultTasks

          );

        } catch {

          return defaultTasks;
        }
      }
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
      'upsc_tasks',
      JSON.stringify(
        next
      )
    );
  }


  /*
   * ADD NEW CURRENT
   * AFFAIRS ITEM LOCALLY
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
   * DIRECT PRELIMS
   * PRACTICE NAVIGATION
   *
   * Used by:
   * - Home
   * - Smart Study
   */

  function openPrelimsPractice() {

    /*
     * Important:
     * force Prelims mode first.
     *
     * This prevents the student
     * from landing on Mains if
     * Mains was previously open.
     */

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
   * WHEN MAIN PAGE CHANGES
   */

  useEffect(
    () => {

      window.scrollTo({
        top:
          0,

        behavior:
          'smooth'
      });

    },
    [
      active
    ]
  );


  /*
   * DEFAULT PAGE
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

        {/* PRACTICE TYPE SWITCHER */}

        <div
          className="page-wrap"
        >

          <div
            className="filter-row"
            style={{
              paddingTop:
                '18px',

              paddingBottom:
                '0'
            }}
          >

            {/* PRELIMS */}

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


            {/* MAINS */}

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


        {/* PRACTICE CONTENT */}

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

        /*
         * SMART STUDY:
         *
         * Start Mixed Practice
         * or
         * Start Prelims Practice
         *
         * now opens:
         *
         * Practice
         *   ↓
         * Prelims MCQ
         */

        onOpenPractice={
          openPrelimsPractice
        }

      />

    );
  }


  /*
   * ADMIN STUDIO
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
   * MAIN APPLICATION
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

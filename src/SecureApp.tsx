import {
  useEffect,
  useState
} from 'react';

import {
  IonApp
} from '@ionic/react';

import type {
  Session
} from '@supabase/supabase-js';

import {
  Shell
} from './components/Shell';

import {
  PrelimsTestSeries
} from './components/PrelimsTestSeries';

import {
  HomePage
} from './pages/HomePage';

import {
  LearnHubPage
} from './pages/LearnHubPage';

import type {
  LearnMode
} from './pages/LearnHubPage';

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
  AccountPage
} from './pages/AccountPage';

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


type PracticeMode =
  | 'prelims'
  | 'tests'
  | 'mains';


type UserRole =
  | 'student'
  | 'editor'
  | 'admin';


type UserProfile = {
  displayName: string;
  role: UserRole;
};


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

  return `${year}-${month}-${day}`;
}


function getTaskStorageKey(
  day: string
) {

  return `upsc_tasks_${day}`;
}


function loadTasksForDay(
  day: string
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


    if (!Array.isArray(parsed)) {

      return defaultTasks.map(
        task => ({
          ...task
        })
      );
    }


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


function normalizeRole(
  value: unknown
): UserRole {

  if (
    value === 'admin' ||
    value === 'editor'
  ) {

    return value;
  }


  return 'student';
}


function getFallbackName(
  session: Session
) {

  const metadataName =
    session.user.user_metadata
      ?.display_name;


  if (
    typeof metadataName ===
      'string' &&
    metadataName.trim()
  ) {

    return metadataName.trim();
  }


  const email =
    session.user.email ||
    '';


  const prefix =
    email.split('@')[0];


  return prefix ||
    'Aspirant';
}


function LoadingCard({
  text
}: {
  text: string;
}) {

  return (

    <div
      className="page-wrap"
    >

      <section
        className="panel"
        style={{
          marginTop:
            '20px'
        }}
      >

        <h2>
          {text}
        </h2>

      </section>

    </div>
  );
}


function AccountStatusCard({
  session,
  profile,
  onSignOut
}: {
  session: Session;
  profile: UserProfile;
  onSignOut: () => void;
}) {

  return (

    <div
      className="page-wrap"
      style={{
        paddingBottom:
          0
      }}
    >

      <section
        className="panel"
        style={{
          display:
            'flex',

          justifyContent:
            'space-between',

          alignItems:
            'center',

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
            SIGNED IN
          </span>


          <h3
            style={{
              marginBottom:
                '4px'
            }}
          >
            {profile.displayName}
          </h3>


          <p
            style={{
              margin:
                0
            }}
          >
            {session.user.email || 'Account'} · {profile.role}
          </p>

        </div>


        <button
          type="button"
          className="secondary-btn"
          onClick={
            onSignOut
          }
        >
          Sign Out
        </button>

      </section>

    </div>
  );
}


function AccessDenied({
  onBack
}: {
  onBack: () => void;
}) {

  return (

    <div
      className="page-wrap"
    >

      <section
        className="panel"
        style={{
          maxWidth:
            '680px',

          margin:
            '20px auto 0'
        }}
      >

        <span
          className="eyebrow"
        >
          PROTECTED AREA
        </span>


        <h2>
          Editor access required
        </h2>


        <p>
          Your account is signed in as a student.
          Admin Studio is available only to approved
          editor or admin accounts.
        </p>


        <button
          type="button"
          className="primary-btn"
          onClick={
            onBack
          }
        >
          Return to My Study
        </button>

      </section>

    </div>
  );
}


export default function SecureApp() {

  const [
    active,
    setActive
  ] =
    useState<NavKey>(
      'home'
    );


  const [
    learnSubject,
    setLearnSubject
  ] =
    useState<string | null>(
      null
    );


  const [
    learnMode,
    setLearnMode
  ] =
    useState<LearnMode>(
      'syllabus'
    );


  const [
    practiceMode,
    setPracticeMode
  ] =
    useState<PracticeMode>(
      'prelims'
    );


  const [
    taskDay,
    setTaskDay
  ] =
    useState(
      getLocalDateKey
    );


  const [
    tasks,
    setTasksState
  ] =
    useState<DailyTask[]>(
      () =>
        loadTasksForDay(
          getLocalDateKey()
        )
    );


  const [
    articles,
    setArticles
  ] =
    useState<CurrentAffair[]>(
      initialCurrentAffairs
    );


  const [
    session,
    setSession
  ] =
    useState<Session | null>(
      null
    );


  const [
    profile,
    setProfile
  ] =
    useState<UserProfile | null>(
      null
    );


  const [
    authReady,
    setAuthReady
  ] =
    useState(
      !supabase
    );


  /*
   * =========================================
   * DAILY TASK SAVE
   * =========================================
   */

  function setTasks(
    next: DailyTask[]
  ) {

    /*
     * Update screen immediately.
     */
    setTasksState(
      next
    );


    /*
     * Always keep offline/local backup.
     */
    localStorage.setItem(
      getTaskStorageKey(
        taskDay
      ),
      JSON.stringify(
        next
      )
    );


    const client =
      supabase;


    const userId =
      session?.user.id;


    /*
     * Signed-out/offline mode:
     * localStorage remains available.
     */
    if (
      !client ||
      !userId
    ) {

      return;
    }


    const rows =
      next.map(
        task => ({

          user_id:
            userId,

          task_date:
            taskDay,

          task_id:
            task.id,

          done:
            task.done,

          updated_at:
            new Date()
              .toISOString()

        })
      );


    /*
     * Cloud save.
     */
    void client
      .from(
        'daily_task_progress'
      )
      .upsert(
        rows,
        {
          onConflict:
            'user_id,task_date,task_id'
        }
      )
      .then(
        ({
          error
        }) => {

          if (error) {

            console.error(
              'Unable to sync daily tasks:',
              error
            );
          }
        }
      );
  }


  function publish(
    item: CurrentAffair
  ) {

    setArticles(
      current => [
        item,
        ...current
      ]
    );
  }


  function openLearn(
    subject:
      string |
      null =
        null,

    mode:
      LearnMode =
        'syllabus'
  ) {

    setLearnSubject(
      subject
    );


    setLearnMode(
      mode
    );


    setActive(
      'learn'
    );
  }


  function navigateMain(
    next: NavKey
  ) {

    if (
      next ===
      'learn'
    ) {

      setLearnSubject(
        null
      );


      setLearnMode(
        'syllabus'
      );
    }


    setActive(
      next
    );
  }


  function openPrelimsPractice() {

    setPracticeMode(
      'prelims'
    );


    setActive(
      'practice'
    );
  }


  async function signOut() {

    if (supabase) {

      await supabase.auth
        .signOut();
    }


    setActive(
      'home'
    );
  }


  /*
   * =========================================
   * AUTHENTICATION
   * =========================================
   */

  useEffect(
    () => {

      const client =
        supabase;


      if (!client) {

        setAuthReady(
          true
        );


        return;
      }


      let mounted =
        true;


      async function loadAccount(
        nextSession:
          Session |
          null
      ) {

        if (!mounted) {

          return;
        }


        /*
         * Keep existing page mounted.
         *
         * Do NOT set authReady false during
         * ordinary token/session refresh.
         *
         * This helps protect My Notes from
         * resetting when changing browser tabs.
         */
        setSession(
          nextSession
        );


        if (!nextSession) {

          setProfile(
            null
          );


          setAuthReady(
            true
          );


          return;
        }


        const {
          data,
          error
        } =
          await client!
            .from(
              'profiles'
            )
            .select(
              'display_name, role'
            )
            .eq(
              'id',
              nextSession.user.id
            )
            .maybeSingle();


        if (!mounted) {

          return;
        }


        if (error) {

          console.error(
            'Unable to load profile:',
            error
          );
        }


        setProfile({

          displayName:
            typeof data?.display_name ===
              'string' &&
            data.display_name.trim()

              ? data.display_name.trim()

              : getFallbackName(
                  nextSession
                ),

          role:
            normalizeRole(
              data?.role
            )

        });


        setAuthReady(
          true
        );
      }


      void client.auth
        .getSession()
        .then(
          ({
            data
          }) =>

            loadAccount(
              data.session
            )
        );


      const {
        data:
          authListener
      } =
        client.auth
          .onAuthStateChange(
            (
              _event,
              nextSession
            ) => {

              void loadAccount(
                nextSession
              );
            }
          );


      return () => {

        mounted =
          false;


        authListener
          .subscription
          .unsubscribe();
      };

    },
    []
  );


  /*
   * =========================================
   * DAILY TASK CLOUD LOAD
   * =========================================
   */

  useEffect(
    () => {

      const client =
        supabase;


      const userId =
        session?.user.id;


      /*
       * If user is signed out,
       * use offline/local task data.
       */
      if (
        !client ||
        !userId
      ) {

        setTasksState(
          loadTasksForDay(
            taskDay
          )
        );


        return;
      }


      let cancelled =
        false;


      async function loadDailyTasksFromCloud() {

        /*
         * Keep local copy ready as fallback.
         */
        const localTasks =
          loadTasksForDay(
            taskDay
          );


        const {
          data,
          error
        } =
          await client!
            .from(
              'daily_task_progress'
            )
            .select(
              'task_id, done'
            )
            .eq(
              'user_id',
              userId
            )
            .eq(
              'task_date',
              taskDay
            );


        if (cancelled) {

          return;
        }


        /*
         * Cloud unavailable:
         * use local/offline copy.
         */
        if (error) {

          console.error(
            'Unable to load cloud daily tasks:',
            error
          );


          setTasksState(
            localTasks
          );


          return;
        }


        /*
         * Existing cloud data found.
         */
        if (
          data &&
          data.length >
            0
        ) {

          const cloudTasks =
            defaultTasks.map(
              defaultTask => {

                const cloudTask =
                  data.find(
                    item =>
                      item.task_id ===
                      defaultTask.id
                  );


                return {

                  ...defaultTask,

                  done:
                    cloudTask?.done ===
                    true

                };
              }
            );


          /*
           * Show cloud state.
           */
          setTasksState(
            cloudTasks
          );


          /*
           * Update offline copy too.
           */
          localStorage.setItem(
            getTaskStorageKey(
              taskDay
            ),
            JSON.stringify(
              cloudTasks
            )
          );


          return;
        }


        /*
         * No cloud row exists yet.
         *
         * Keep existing local progress and
         * upload it to the cloud once.
         */
        setTasksState(
          localTasks
        );


        const rows =
          localTasks.map(
            task => ({

              user_id:
                userId,

              task_date:
                taskDay,

              task_id:
                task.id,

              done:
                task.done,

              updated_at:
                new Date()
                  .toISOString()

            })
          );


        const {
          error:
            seedError
        } =
          await client!
            .from(
              'daily_task_progress'
            )
            .upsert(
              rows,
              {
                onConflict:
                  'user_id,task_date,task_id'
              }
            );


        if (seedError) {

          console.error(
            'Unable to create cloud daily tasks:',
            seedError
          );
        }
      }


      void loadDailyTasksFromCloud();


      return () => {

        cancelled =
          true;
      };

    },
    [
      session?.user.id,
      taskDay
    ]
  );


  /*
   * =========================================
   * DAILY TASK DATE CHANGE
   * =========================================
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


              /*
               * Show local data immediately.
               * Cloud effect above will then
               * refresh it if signed in.
               */
              setTasksState(
                loadTasksForDay(
                  currentDay
                )
              );
            }

          },
          60_000
        );


      return () =>
        window.clearInterval(
          timer
        );

    },
    [
      taskDay
    ]
  );


  /*
   * =========================================
   * CURRENT AFFAIRS
   * =========================================
   */

  useEffect(
    () => {

      async function loadCurrentAffairs() {

        if (!supabase) {

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
          data.length ===
            0
        ) {

          return;
        }


        setArticles(
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
          )
        );
      }


      void loadCurrentAffairs();

    },
    []
  );


  /*
   * =========================================
   * SCROLL TO TOP ONLY ON REAL APP NAVIGATION
   * =========================================
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


  const isEditor =
    profile?.role ===
      'editor' ||
    profile?.role ===
      'admin';


  /*
   * =========================================
   * HOME
   * =========================================
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

      onGoLearn={
        openLearn
      }

      onGoCurrent={() =>
        setActive(
          'current'
        )
      }
    />
  );


  /*
   * =========================================
   * LEARN
   * =========================================
   */

  if (
    active ===
    'learn'
  ) {

    content = (

      <LearnHubPage
        initialSubject={
          learnSubject
        }

        initialMode={
          learnMode
        }
      />
    );
  }


  /*
   * =========================================
   * PRACTICE
   * =========================================
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
              paddingTop:
                '18px',

              paddingBottom:
                0
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
                  'tests'

                  ? 'filter active'

                  : 'filter'
              }

              onClick={() =>
                setPracticeMode(
                  'tests'
                )
              }
            >
              Prelims Test Series
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

            : practiceMode ===
              'tests'

            ? (

              <div
                className="page-wrap"
              >
                <PrelimsTestSeries />
              </div>

            )

            : (

              <MainsPracticePage />

            )
        }

      </>
    );
  }


  /*
   * =========================================
   * CURRENT AFFAIRS
   * =========================================
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
   * =========================================
   * PROFILE / MY STUDY
   * =========================================
   */

  if (
    active ===
    'profile'
  ) {

    if (!authReady) {

      content = (

        <LoadingCard
          text="Loading your account…"
        />
      );

    } else if (
      !session ||
      !profile
    ) {

      content = (

        <AccountPage
          intent="study"

          onBack={() =>
            setActive(
              'home'
            )
          }
        />
      );

    } else {

      content = (

        <>

          <AccountStatusCard
            session={
              session
            }

            profile={
              profile
            }

            onSignOut={() => {
              void signOut();
            }}
          />


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

        </>
      );
    }
  }


  /*
   * =========================================
   * ADMIN
   * =========================================
   */

  if (
    active ===
    'admin'
  ) {

    if (!authReady) {

      content = (

        <LoadingCard
          text="Checking editor access…"
        />
      );

    } else if (
      !session
    ) {

      content = (

        <AccountPage
          intent="admin"

          onBack={() =>
            setActive(
              'home'
            )
          }
        />
      );

    } else if (
      !isEditor
    ) {

      content = (

        <AccessDenied
          onBack={() =>
            setActive(
              'profile'
            )
          }
        />
      );

    } else {

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
  }


  /*
   * =========================================
   * APP
   * =========================================
   */

  return (

    <IonApp>

      <Shell
        active={
          active
        }

        onNavigate={
          navigateMain
        }
      >

        {content}

      </Shell>

    </IonApp>
  );
}

import {
  useState
} from 'react';

import {
  IonIcon
} from '@ionic/react';

import {
  arrowForwardOutline,
  bookOutline,
  calendarOutline,
  checkmarkCircle,
  chevronDownOutline,
  chevronUpOutline,
  ellipseOutline,
  newspaperOutline,
  schoolOutline,
  statsChartOutline
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
  TodayTimeStudyPlan
} from '../components/TodayTimeStudyPlan';

import {
  RevisionDueToday
} from '../components/RevisionDueToday';

import {
  PersonalRevisionDueToday
} from '../components/PersonalRevisionDueToday';

import {
  CurrentReadingCard
} from '../components/CurrentReadingCard';


type HomeLearnMode =
  | 'syllabus'
  | 'resources'
  | 'book-progress';


type HomePanel =
  | 'none'
  | 'schedule'
  | 'revision'
  | 'subjects';


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
 * =========================================
 * HOME PAGE
 *
 * Keep the home page simple and focused.
 * Detailed tools remain inside their
 * dedicated Learn / Practice workspaces.
 * =========================================
 */

export function HomePage({

  tasks,
  setTasks,
  onGoPractice,
  onGoLearn,
  onGoCurrent

}: HomePageProps) {

  const [
    openPanel,
    setOpenPanel
  ] =
    useState<HomePanel>(
      'none'
    );


  const completed =
    tasks.filter(
      task =>
        task.done
    ).length;


  const taskPct =
    tasks.length > 0
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
   * DAILY TASK
   * =========================================
   */

  function toggleTask(
    id:
      string
  ) {

    setTasks(
      tasks.map(
        task =>
          task.id === id
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
   * OPTIONAL PANEL
   * =========================================
   */

  function togglePanel(
    panel:
      Exclude<
        HomePanel,
        'none'
      >
  ) {

    setOpenPanel(
      current =>
        current === panel
          ? 'none'
          : panel
    );
  }


  /*
   * =========================================
   * OPEN PERSONAL READING
   * =========================================
   */

  function openMyReading() {

    onGoLearn(
      null,
      'book-progress'
    );
  }


  /*
   * =========================================
   * SHARED STYLES
   * =========================================
   */

  const quickCardStyle = {

    width:
      '100%',

    minWidth:
      0,

    minHeight:
      '86px',

    padding:
      '14px',

    border:
      '1px solid rgba(255,255,255,.08)',

    borderRadius:
      '16px',

    background:
      'rgba(255,255,255,.035)',

    color:
      '#f8fafc',

    textAlign:
      'left' as const,

    display:
      'flex',

    flexDirection:
      'column' as const,

    justifyContent:
      'space-between',

    gap:
      '10px',

    whiteSpace:
      'normal' as const

  };


  const toolButtonStyle = {

    minHeight:
      '46px',

    width:
      '100%',

    minWidth:
      0,

    padding:
      '10px 11px',

    whiteSpace:
      'normal' as const,

    textAlign:
      'center' as const,

    lineHeight:
      1.2

  };


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

        subtitle="Your preparation dashboard"

      />


      {/* =====================================
          TODAY
      ===================================== */}

      <section
        className="hero-card"

        style={{

          padding:
            '18px',

          marginTop:
            '4px',

          gridTemplateColumns:
            '1fr auto',

          gap:
            '14px'

        }}
      >

        <div>

          <span
            className="eyebrow"
          >
            TODAY
          </span>


          <h2
            style={{

              margin:
                '6px 0 7px',

              fontSize:
                'clamp(1.35rem, 5vw, 2rem)'

            }}
          >
            Focus on the next useful step.
          </h2>


          <p
            style={{

              margin:
                '0 0 10px'

            }}
          >
            {completed}/{tasks.length}{' '}
            daily essentials completed.
          </p>


          <button
            type="button"

            className="primary-btn"

            onClick={
              onGoCurrent
            }
          >
            Start studying

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
            today
          </span>

        </div>

      </section>


      {/* =====================================
          QUICK ACTIONS
      ===================================== */}

      <section
        style={{

          display:
            'grid',

          gridTemplateColumns:
            'repeat(2, minmax(0, 1fr))',

          gap:
            '10px',

          marginTop:
            '14px'

        }}
      >

        {/* CURRENT AFFAIRS */}

        <button
          type="button"

          style={
            quickCardStyle
          }

          onClick={
            onGoCurrent
          }
        >

          <IonIcon
            icon={
              newspaperOutline
            }

            style={{

              fontSize:
                '1.4rem',

              color:
                '#5eead4'

            }}
          />


          <span>

            <strong
              style={{
                display:
                  'block'
              }}
            >
              Current Affairs
            </strong>


            <small
              style={{
                color:
                  '#94a3b8'
              }}
            >
              Read today's analysis
            </small>

          </span>

        </button>


        {/* PRACTICE */}

        <button
          type="button"

          style={
            quickCardStyle
          }

          onClick={
            onGoPractice
          }
        >

          <IonIcon
            icon={
              statsChartOutline
            }

            style={{

              fontSize:
                '1.4rem',

              color:
                '#5eead4'

            }}
          />


          <span>

            <strong
              style={{
                display:
                  'block'
              }}
            >
              Practice
            </strong>


            <small
              style={{
                color:
                  '#94a3b8'
              }}
            >
              MCQ and test series
            </small>

          </span>

        </button>


        {/* SYLLABUS */}

        <button
          type="button"

          style={
            quickCardStyle
          }

          onClick={() =>
            onGoLearn(
              null,
              'syllabus'
            )
          }
        >

          <IonIcon
            icon={
              schoolOutline
            }

            style={{

              fontSize:
                '1.4rem',

              color:
                '#5eead4'

            }}
          />


          <span>

            <strong
              style={{
                display:
                  'block'
              }}
            >
              Syllabus
            </strong>


            <small
              style={{
                color:
                  '#94a3b8'
              }}
            >
              Continue your tracker
            </small>

          </span>

        </button>


        {/* MY BOOKS */}

        <button
          type="button"

          style={
            quickCardStyle
          }

          onClick={
            openMyReading
          }
        >

          <IonIcon
            icon={
              bookOutline
            }

            style={{

              fontSize:
                '1.4rem',

              color:
                '#5eead4'

            }}
          />


          <span>

            <strong
              style={{
                display:
                  'block'
              }}
            >
              My Books
            </strong>


            <small
              style={{
                color:
                  '#94a3b8'
              }}
            >
              Reading and revision
            </small>

          </span>

        </button>

      </section>


      {/* =====================================
          CURRENT READING
      ===================================== */}

      <CurrentReadingCard

        onOpenBooks={
          openMyReading
        }

      />


      {/* =====================================
          DAILY ESSENTIALS
      ===================================== */}

      <section
        className="panel"

        style={{

          marginTop:
            '14px',

          padding:
            '16px'

        }}
      >

        <div
          className="panel-head"
        >

          <div>

            <span
              className="eyebrow"
            >
              DAILY ESSENTIALS
            </span>


            <h3
              style={{
                marginBottom:
                  '4px'
              }}
            >
              Today's checklist
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

          style={{

            margin:
              '12px 0 10px'

          }}
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

                style={{

                  padding:
                    '10px 11px'

                }}
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

      </section>


      {/* =====================================
          MORE TOOLS
      ===================================== */}

      <section
        className="panel"

        style={{

          marginTop:
            '14px',

          padding:
            '16px'

        }}
      >

        <div
          className="panel-head"

          style={{
            alignItems:
              'center'
          }}
        >

          <div>

            <span
              className="eyebrow"
            >
              MORE
            </span>


            <h3
              style={{
                marginBottom:
                  '2px'
              }}
            >
              Open only when needed
            </h3>

          </div>

        </div>


        <div
          style={{

            display:
              'grid',

            gridTemplateColumns:
              'repeat(3, minmax(0, 1fr))',

            gap:
              '8px',

            marginTop:
              '12px'

          }}
        >

          {/* SCHEDULE */}

          <button
            type="button"

            className={
              openPanel ===
                'schedule'
                ? 'primary-btn'
                : 'secondary-btn'
            }

            style={
              toolButtonStyle
            }

            onClick={() =>
              togglePanel(
                'schedule'
              )
            }
          >
            Schedule
          </button>


          {/* REVISIONS */}

          <button
            type="button"

            className={
              openPanel ===
                'revision'
                ? 'primary-btn'
                : 'secondary-btn'
            }

            style={
              toolButtonStyle
            }

            onClick={() =>
              togglePanel(
                'revision'
              )
            }
          >
            Revisions
          </button>


          {/* SUBJECTS */}

          <button
            type="button"

            className={
              openPanel ===
                'subjects'
                ? 'primary-btn'
                : 'secondary-btn'
            }

            style={
              toolButtonStyle
            }

            onClick={() =>
              togglePanel(
                'subjects'
              )
            }
          >
            Subjects
          </button>

        </div>


        {openPanel !==
          'none' && (

          <button
            type="button"

            className="text-btn"

            onClick={() =>
              setOpenPanel(
                'none'
              )
            }

            style={{

              width:
                '100%',

              marginTop:
                '8px',

              display:
                'flex',

              alignItems:
                'center',

              justifyContent:
                'center',

              gap:
                '5px'

            }}
          >

            Collapse

            <IonIcon
              icon={
                chevronUpOutline
              }
            />

          </button>

        )}


        {openPanel ===
          'none' && (

          <div
            style={{

              marginTop:
                '9px',

              textAlign:
                'center',

              color:
                '#64748b',

              fontSize:
                '.75rem'

            }}
          >

            Tap a tool to expand it here.

            <IonIcon
              icon={
                chevronDownOutline
              }

              style={{
                marginLeft:
                  '4px'
              }}
            />

          </div>

        )}

      </section>


      {/* =====================================
          SCHEDULE
      ===================================== */}

      {openPanel ===
        'schedule' && (

        <div
          style={{
            marginTop:
              '12px'
          }}
        >

          <TodayTimeStudyPlan

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

            onOpenBookProgress={
              openMyReading
            }

          />

        </div>

      )}


      {/* =====================================
          REVISION DUE
      ===================================== */}

     {openPanel ===
  'revision' && (

  <div
    style={{
      marginTop:
        '12px'
    }}
  >

    {/* STANDARD BOOK REVISIONS */}

    <RevisionDueToday

      onOpenTracker={
        openMyReading
      }

    />


    {/* PERSONAL BOOK REVISIONS */}

    <PersonalRevisionDueToday

      onOpenTracker={
        openMyReading
      }

    />

  </div>

)}


      {/* =====================================
          SUBJECTS
      ===================================== */}

      {openPanel ===
        'subjects' && (

        <section
          className="panel"

          style={{

            marginTop:
              '12px',

            padding:
              '16px'

          }}
        >

          <div
            className="panel-head"
          >

            <div>

              <span
                className="eyebrow"
              >
                SUBJECTS
              </span>


              <h3>
                Open syllabus by subject
              </h3>

            </div>

          </div>


          <div
            className="subject-grid"

            style={{
              marginTop:
                '10px'
            }}
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
                    Open
                  </small>

                </button>

              )
            )}

          </div>

        </section>

      )}


      {/* =====================================
          BOTTOM SCHEDULE BUTTON
      ===================================== */}

      <button
        type="button"

        className="secondary-btn"

        onClick={() =>
          togglePanel(
            'schedule'
          )
        }

        style={{

          width:
            '100%',

          marginTop:
            '14px',

          marginBottom:
            '8px',

          minHeight:
            '46px',

          justifyContent:
            'center',

          whiteSpace:
            'normal'

        }}
      >

        <IonIcon
          icon={
            calendarOutline
          }

          style={{
            marginRight:
              '6px'
          }}
        />


        {
          openPanel ===
            'schedule'
            ? 'Hide today’s schedule'
            : 'View today’s full schedule'
        }

      </button>

    </div>

  );
}

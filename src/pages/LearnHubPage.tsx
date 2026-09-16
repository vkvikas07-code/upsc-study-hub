import {
  useEffect,
  useState
} from 'react';

import {
  LearnPage
} from './LearnPage';

import {
  MyBooksPage
} from './MyBooksPage';

import {
  StudyResources
} from '../components/StudyResources';

import {
  BookProgressTracker
} from '../components/BookProgressTracker';

import {
  RevisionScheduleSettings
} from '../components/RevisionScheduleSettings';

import {
  RevisionWeekCalendar
} from '../components/RevisionWeekCalendar';


export type LearnMode =
  | 'syllabus'
  | 'resources'
  | 'book-progress';


type BookWorkspace =
  | 'personal'
  | 'standard'
  | 'calendar'
  | 'settings';


type LearnHubPageProps = {

  initialSubject?:
    string |
    null;

  initialMode?:
    LearnMode;
};


export function LearnHubPage({

  initialSubject =
    null,

  initialMode =
    'syllabus'

}: LearnHubPageProps) {

  /*
   * =========================================
   * MAIN LEARN WORKSPACE
   * =========================================
   */

  const [
    mode,
    setMode
  ] =
    useState<LearnMode>(
      initialMode
    );


  /*
   * =========================================
   * MY BOOKS WORKSPACE
   *
   * personal  = student-created private books
   * standard  = standard/admin books
   * calendar  = revision plan
   * settings  = revision schedule settings
   * =========================================
   */

  const [
    bookWorkspace,
    setBookWorkspace
  ] =
    useState<BookWorkspace>(
      'personal'
    );


  /*
   * =========================================
   * RESPOND TO EXTERNAL NAVIGATION
   * =========================================
   */

  useEffect(
    () => {

      setMode(
        initialMode
      );


      /*
       * Whenever My Books is opened from another
       * part of the app, start with the student's
       * own reading tracker.
       */

      if (
        initialMode ===
        'book-progress'
      ) {

        setBookWorkspace(
          'personal'
        );
      }

    },
    [
      initialMode
    ]
  );


  /*
   * =========================================
   * COMMON BUTTON STYLE
   * =========================================
   */

  const mainButtonStyle = {

    width:
      '100%',

    minWidth:
      0,

    minHeight:
      '48px',

    whiteSpace:
      'normal' as const,

    textAlign:
      'center' as const,

    lineHeight:
      1.15,

    padding:
      '9px 7px',

    display:
      'flex',

    alignItems:
      'center',

    justifyContent:
      'center',

    overflowWrap:
      'anywhere' as const
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
          COMPACT LEARN HEADER
      ===================================== */}

      <section
        className="panel"

        style={{
          marginTop:
            '10px',

          padding:
            '16px'
        }}
      >

        <span
          className="eyebrow"
        >
          LEARN
        </span>


        <div
          style={{
            display:
              'flex',

            alignItems:
              'flex-end',

            justifyContent:
              'space-between',

            gap:
              '12px',

            flexWrap:
              'wrap'
          }}
        >

          <div>

            <h2
              style={{
                margin:
                  '5px 0 4px'
              }}
            >
              Study Workspace
            </h2>


            <small
              style={{
                color:
                  '#94a3b8'
              }}
            >
              Open only the section you need.
            </small>

          </div>

        </div>


        {/* =================================
            MAIN LEARN TABS
        ================================= */}

        <div
          style={{
            display:
              'grid',

            gridTemplateColumns:
              'repeat(3, minmax(0, 1fr))',

            gap:
              '8px',

            marginTop:
              '14px'
          }}
        >

          {/* SYLLABUS */}

          <button
            type="button"

            className={
              mode ===
                'syllabus'
                ? 'filter active'
                : 'filter'
            }

            style={
              mainButtonStyle
            }

            onClick={() =>
              setMode(
                'syllabus'
              )
            }
          >
            Syllabus
          </button>


          {/* RESOURCES */}

          <button
            type="button"

            className={
              mode ===
                'resources'
                ? 'filter active'
                : 'filter'
            }

            style={
              mainButtonStyle
            }

            onClick={() =>
              setMode(
                'resources'
              )
            }
          >
            Resources
          </button>


          {/* MY BOOKS */}

          <button
            type="button"

            className={
              mode ===
                'book-progress'
                ? 'filter active'
                : 'filter'
            }

            style={
              mainButtonStyle
            }

            onClick={() => {

              setMode(
                'book-progress'
              );


              /*
               * Clicking My Books directly should
               * open personal reading first.
               */

              setBookWorkspace(
                'personal'
              );

            }}
          >
            My Books
          </button>

        </div>

      </section>


      {/* =====================================
          SYLLABUS
      ===================================== */}

      {
        mode ===
        'syllabus' && (

          <div
            style={{
              marginTop:
                '12px'
            }}
          >

            <LearnPage

              initialSubject={
                initialSubject
              }

            />

          </div>

        )
      }


      {/* =====================================
          RESOURCES
      ===================================== */}

      {
        mode ===
        'resources' && (

          <div
            style={{
              marginTop:
                '12px'
            }}
          >

            <StudyResources

              initialStage={
                initialSubject
                  ? 'prelims'
                  : 'all'
              }

              initialSubject={
                initialSubject
              }

            />

          </div>

        )
      }


      {/* =====================================
          MY BOOKS / READING WORKSPACE
      ===================================== */}

      {
        mode ===
        'book-progress' && (

          <>

            {/* ===============================
                BOOK WORKSPACE TABS
            =============================== */}

            <section
              className="panel"

              style={{
                marginTop:
                  '12px',

                padding:
                  '14px'
              }}
            >

              <span
                className="eyebrow"
              >
                MY BOOKS
              </span>


              <div
                style={{
                  display:
                    'grid',

                  gridTemplateColumns:
                    'repeat(2, minmax(0, 1fr))',

                  gap:
                    '8px',

                  marginTop:
                    '10px'
                }}
              >

                {/* PERSONAL READING */}

                <button
                  type="button"

                  className={
                    bookWorkspace ===
                      'personal'
                      ? 'filter active'
                      : 'filter'
                  }

                  style={
                    mainButtonStyle
                  }

                  onClick={() =>
                    setBookWorkspace(
                      'personal'
                    )
                  }
                >
                  My Reading
                </button>


                {/* STANDARD BOOKS */}

                <button
                  type="button"

                  className={
                    bookWorkspace ===
                      'standard'
                      ? 'filter active'
                      : 'filter'
                  }

                  style={
                    mainButtonStyle
                  }

                  onClick={() =>
                    setBookWorkspace(
                      'standard'
                    )
                  }
                >
                  Standard Books
                </button>


                {/* REVISION CALENDAR */}

                <button
                  type="button"

                  className={
                    bookWorkspace ===
                      'calendar'
                      ? 'filter active'
                      : 'filter'
                  }

                  style={
                    mainButtonStyle
                  }

                  onClick={() =>
                    setBookWorkspace(
                      'calendar'
                    )
                  }
                >
                  7-Day Plan
                </button>


                {/* REVISION SETTINGS */}

                <button
                  type="button"

                  className={
                    bookWorkspace ===
                      'settings'
                      ? 'filter active'
                      : 'filter'
                  }

                  style={
                    mainButtonStyle
                  }

                  onClick={() =>
                    setBookWorkspace(
                      'settings'
                    )
                  }
                >
                  Revision Settings
                </button>

              </div>

            </section>


            {/* ===============================
                PERSONAL BOOKS
            =============================== */}

            {
              bookWorkspace ===
              'personal' && (

                <div
                  style={{
                    marginTop:
                      '12px'
                  }}
                >

                  <MyBooksPage />

                </div>

              )
            }


            {/* ===============================
                STANDARD BOOKS
            =============================== */}

            {
              bookWorkspace ===
              'standard' && (

                <div
                  style={{
                    marginTop:
                      '12px'
                  }}
                >

                  <BookProgressTracker

                    initialSubject={
                      initialSubject
                    }

                  />

                </div>

              )
            }


            {/* ===============================
                7-DAY REVISION PLAN
            =============================== */}

            {
              bookWorkspace ===
              'calendar' && (

                <div
                  style={{
                    marginTop:
                      '12px'
                  }}
                >

                  <RevisionWeekCalendar />

                </div>

              )
            }


            {/* ===============================
                REVISION SETTINGS
            =============================== */}

            {
              bookWorkspace ===
              'settings' && (

                <div
                  style={{
                    marginTop:
                      '12px'
                  }}
                >

                  <RevisionScheduleSettings />

                </div>

              )
            }

          </>

        )
      }

    </div>

  );
}

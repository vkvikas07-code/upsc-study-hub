import {
  useEffect,
  useState
} from 'react';

import {
  LearnPage
} from './LearnPage';

import {
  StudyResources
} from '../components/StudyResources';

import {
  SavedTopics
} from '../components/SavedTopics';

import {
  MyReading
} from '../components/MyReading';

import {
  BookProgressTracker
} from '../components/BookProgressTracker';

import {
  RevisionWeekCalendar
} from '../components/RevisionWeekCalendar';

import {
  RevisionScheduleSettings
} from '../components/RevisionScheduleSettings';


/* =========================================================
   EXPORTED LEARN MODE

   IMPORTANT:
   App.tsx and SecureApp.tsx import this type.
========================================================= */

export type LearnMode =
  | 'syllabus'
  | 'resources'
  | 'saved'
  | 'book-progress';


/* =========================================================
   MY BOOKS SUB WORKSPACE
========================================================= */

type BookWorkspace =
  | 'my-reading'
  | 'standard-books'
  | 'calendar'
  | 'settings';


/* =========================================================
   PROPS
========================================================= */

type LearnHubPageProps = {

  initialSubject?:
    string |
    null;

  initialMode?:
    LearnMode;

};


/* =========================================================
   COMPONENT

   IMPORTANT:
   This is a NAMED EXPORT because App.tsx and SecureApp.tsx
   already import { LearnHubPage }.
========================================================= */

export function LearnHubPage({

  initialSubject =
    null,

  initialMode =
    'syllabus'

}: LearnHubPageProps) {

  /* =======================================================
     MAIN WORKSPACE
  ======================================================= */

  const [
    mode,
    setMode
  ] =
    useState<LearnMode>(
      initialMode
    );


  /* =======================================================
     MY BOOKS WORKSPACE
  ======================================================= */

  const [
    bookWorkspace,
    setBookWorkspace
  ] =
    useState<BookWorkspace>(
      'my-reading'
    );


  /* =======================================================
     PROP UPDATES
  ======================================================= */

  useEffect(
    () => {

      setMode(
        initialMode
      );


      if (
        initialMode ===
        'book-progress'
      ) {

        setBookWorkspace(
          'my-reading'
        );

      }

    },
    [
      initialMode
    ]
  );


  /* =======================================================
     COMMON BUTTON STYLE
  ======================================================= */

  const mainButtonStyle = {

    width:
      '100%',

    minWidth:
      0,

    minHeight:
      '46px',

    padding:
      '9px 7px',

    whiteSpace:
      'normal' as const,

    textAlign:
      'center' as const,

    lineHeight:
      1.15

  };


  /* =======================================================
     MAIN LEARN TABS
  ======================================================= */

  const mainTabs:
    Array<{

      id:
        LearnMode;

      label:
        string;

      helper:
        string;

    }> =
    [

      {
        id:
          'syllabus',

        label:
          'Syllabus',

        helper:
          'Track the UPSC syllabus topic by topic'
      },

      {
        id:
          'resources',

        label:
          'Resources',

        helper:
          'Books, official sources, notes and current affairs'
      },

      {
        id:
          'saved',

        label:
          'Saved',

        helper:
          'Bookmarks and personal syllabus notes'
      },

      {
        id:
          'book-progress',

        label:
          'My Books',

        helper:
          'Personal reading, standard books and revision'
      }

    ];


  /* =======================================================
     CURRENT TAB HELPER
  ======================================================= */

  const activeHelper =
    mainTabs.find(
      tab =>
        tab.id ===
        mode
    )?.helper ||
    'UPSC study workspace';


  /* =======================================================
     PAGE
  ======================================================= */

  return (

    <div
      className="page-wrap"
    >

      {/* =================================================
          HEADER
      ================================================= */}

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

            justifyContent:
              'space-between',

            alignItems:
              'flex-end',

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

              Syllabus, resources, saved topics,
              books and revision in one place.

            </small>

          </div>

        </div>


        {/* ===============================================
            MAIN NAVIGATION
        =============================================== */}

        <div
          style={{

            display:
              'grid',

            gridTemplateColumns:
              'repeat(4, minmax(0, 1fr))',

            gap:
              '8px',

            marginTop:
              '14px'

          }}
        >

          {
            mainTabs.map(
              tab => (

                <button

                  key={
                    tab.id
                  }

                  type="button"

                  className={
                    mode ===
                    tab.id
                      ? 'filter active'
                      : 'filter'
                  }

                  style={
                    mainButtonStyle
                  }

                  onClick={() =>
                    setMode(
                      tab.id
                    )
                  }

                  title={
                    tab.helper
                  }

                >

                  {
                    tab.label
                  }

                </button>

              )
            )
          }

        </div>


        {/* ===============================================
            ACTIVE SECTION INFO
        =============================================== */}

        <div

          className="callout"

          style={{

            marginTop:
              '10px',

            padding:
              '10px 12px'

          }}

        >

          {
            activeHelper
          }

        </div>

      </section>


      {/* =================================================
          SYLLABUS
      ================================================= */}

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


      {/* =================================================
          RESOURCES
      ================================================= */}

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


      {/* =================================================
          SAVED TOPICS
      ================================================= */}

      {
        mode ===
          'saved' && (

          <div
            style={{

              marginTop:
                '12px'

            }}
          >

            <SavedTopics />

          </div>

        )
      }


      {/* =================================================
          MY BOOKS
      ================================================= */}

      {
        mode ===
          'book-progress' && (

          <>

            {/* ===========================================
                MY BOOKS NAVIGATION
            =========================================== */}

            <section

              className="panel"

              style={{

                marginTop:
                  '12px',

                padding:
                  '14px'

              }}

            >

              <div
                style={{

                  display:
                    'grid',

                  gridTemplateColumns:
                    'repeat(4, minmax(0, 1fr))',

                  gap:
                    '8px'

                }}
              >

                {/* =======================================
                    MY READING
                ======================================= */}

                <button

                  type="button"

                  className={
                    bookWorkspace ===
                      'my-reading'
                      ? 'filter active'
                      : 'filter'
                  }

                  style={
                    mainButtonStyle
                  }

                  onClick={() =>
                    setBookWorkspace(
                      'my-reading'
                    )
                  }

                >

                  My Reading

                </button>


                {/* =======================================
                    STANDARD BOOKS
                ======================================= */}

                <button

                  type="button"

                  className={
                    bookWorkspace ===
                      'standard-books'
                      ? 'filter active'
                      : 'filter'
                  }

                  style={
                    mainButtonStyle
                  }

                  onClick={() =>
                    setBookWorkspace(
                      'standard-books'
                    )
                  }

                >

                  Standard Books

                </button>


                {/* =======================================
                    7-DAY PLAN
                ======================================= */}

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


                {/* =======================================
                    REVISION SETUP
                ======================================= */}

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

                  Revision Setup

                </button>

              </div>

            </section>


            {/* ===========================================
                MY READING CONTENT
            =========================================== */}

            {
              bookWorkspace ===
                'my-reading' && (

                <div
                  style={{

                    marginTop:
                      '12px'

                  }}
                >

                  <MyReading />

                </div>

              )
            }


            {/* ===========================================
                STANDARD BOOKS CONTENT
            =========================================== */}

            {
              bookWorkspace ===
                'standard-books' && (

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


            {/* ===========================================
                REVISION CALENDAR
            =========================================== */}

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


            {/* ===========================================
                REVISION SETTINGS
            =========================================== */}

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


/* =========================================================
   DEFAULT EXPORT

   Named export above is still the important one.
   This additional export makes the file compatible
   with either named or default importing in future.
========================================================= */

export default LearnHubPage;

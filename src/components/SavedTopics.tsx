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
  BookProgressTracker
} from '../components/BookProgressTracker';

import {
  RevisionScheduleSettings
} from '../components/RevisionScheduleSettings';

import {
  RevisionWeekCalendar
} from '../components/RevisionWeekCalendar';

import {
  MyReading
} from '../components/MyReading';

import {
  SavedTopics
} from '../components/SavedTopics';


export type LearnMode =
  | 'syllabus'
  | 'resources'
  | 'saved'
  | 'book-progress';


type BookWorkspace =
  | 'my-reading'
  | 'standard-books'
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

  const [
    mode,
    setMode
  ] =
    useState<LearnMode>(
      initialMode
    );


  const [
    bookWorkspace,
    setBookWorkspace
  ] =
    useState<BookWorkspace>(
      'my-reading'
    );


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


  const mainButtonStyle = {

    width:
      '100%',

    minWidth:
      0,

    minHeight:
      '46px',

    whiteSpace:
      'normal' as const,

    textAlign:
      'center' as const,

    lineHeight:
      1.15,

    padding:
      '9px 7px'

  };


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


  return (

    <div
      className="page-wrap"
    >

      {/* ===================================================
          LEARN HEADER
      =================================================== */}

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

              Syllabus, study material,
              saved topics, reading progress
              and revision in one workspace.

            </small>

          </div>

        </div>


        {/* =================================================
            MAIN NAVIGATION
        ================================================= */}

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
            mainTabs.find(
              tab =>
                tab.id ===
                mode
            )?.helper
          }

        </div>

      </section>


      {/* ===================================================
          SYLLABUS
      =================================================== */}

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


      {/* ===================================================
          RESOURCES
      =================================================== */}

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


      {/* ===================================================
          SAVED TOPICS & NOTES
      =================================================== */}

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


      {/* ===================================================
          MY BOOKS
      =================================================== */}

      {
        mode ===
        'book-progress' && (

          <>

            {/* ===============================================
                BOOK WORKSPACE NAVIGATION
            =============================================== */}

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

                {/* MY READING */}

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


                {/* STANDARD BOOKS */}

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


                {/* CALENDAR */}

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


                {/* SETTINGS */}

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


            {/* ===============================================
                PERSONAL READING
            =============================================== */}

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


            {/* ===============================================
                STANDARD BOOKS
            =============================================== */}

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


            {/* ===============================================
                7 DAY REVISION PLAN
            =============================================== */}

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


            {/* ===============================================
                REVISION SETTINGS
            =============================================== */}

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

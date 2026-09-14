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


export type LearnMode =
  | 'syllabus'
  | 'resources'
  | 'book-progress';


type BookWorkspace =
  | 'books'
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
      'books'
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
          'books'
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
      '48px',

    whiteSpace:
      'normal' as const,

    textAlign:
      'center' as const,

    lineHeight:
      1.15,

    padding:
      '9px 7px'
  };


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

            onClick={() =>
              setMode(
                'book-progress'
              )
            }
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
          BOOK WORKSPACE
      ===================================== */}

      {
        mode ===
        'book-progress' && (

          <>

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
                    'repeat(3, minmax(0, 1fr))',

                  gap:
                    '8px'
                }}
              >

                <button
                  type="button"

                  className={
                    bookWorkspace ===
                      'books'
                      ? 'filter active'
                      : 'filter'
                  }

                  style={
                    mainButtonStyle
                  }

                  onClick={() =>
                    setBookWorkspace(
                      'books'
                    )
                  }
                >
                  Books
                </button>


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


            {
              bookWorkspace ===
              'books' && (

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

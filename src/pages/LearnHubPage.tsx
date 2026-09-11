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


type LearnHubPageProps = {

  initialSubject?:
    string |
    null;

  initialMode?:
    LearnMode;
};


export function LearnHubPage({

  initialSubject = null,

  initialMode = 'syllabus'

}: LearnHubPageProps) {

  /*
   * =========================================
   * LEARN WORKSPACE
   * =========================================
   *
   * syllabus
   * =
   * UPSC syllabus tracker
   *
   * resources
   * =
   * books, official sources,
   * reports, notes and material
   *
   * book-progress
   * =
   * revision settings
   * 7-day revision calendar
   * reading
   * revisions
   * due dates
   * book-wise progress
   */

  const [
    mode,
    setMode
  ] =
    useState<
      LearnMode
    >(
      initialMode
    );


  /*
   * =========================================
   * DIRECT WORKSPACE NAVIGATION
   * =========================================
   */

  useEffect(
    () => {

      setMode(
        initialMode
      );

    },
    [
      initialMode
    ]
  );


  /*
   * =========================================
   * PAGE
   * =========================================
   */

  return (

    <>

      {/* =====================================
          LEARN WORKSPACE HEADER
      ===================================== */}

      <div
        className="page-wrap"
      >

        <section
          className="panel"

          style={{
            marginTop:
              '18px',

            marginBottom:
              '18px'
          }}
        >

          <span
            className="eyebrow"
          >
            LEARN
          </span>


          <h2>
            Study Workspace
          </h2>


          <p>
            Track the UPSC syllabus,
            access important study resources,
            manage book-wise reading progress,
            plan revisions and see upcoming
            revision workload from one place.
          </p>


          {/* =================================
              WORKSPACE SWITCHER
          ================================= */}

          <div
            className="filter-row"

            style={{
              marginTop:
                '16px'
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

              onClick={() =>
                setMode(
                  'syllabus'
                )
              }
            >
              Syllabus Tracker
            </button>


            {/* STUDY RESOURCES */}

            <button
              type="button"

              className={
                mode ===
                  'resources'
                  ? 'filter active'
                  : 'filter'
              }

              onClick={() =>
                setMode(
                  'resources'
                )
              }
            >
              Study Resources
            </button>


            {/* BOOK PROGRESS */}

            <button
              type="button"

              className={
                mode ===
                  'book-progress'
                  ? 'filter active'
                  : 'filter'
              }

              onClick={() =>
                setMode(
                  'book-progress'
                )
              }
            >
              Book Progress
            </button>

          </div>

        </section>

      </div>


      {/* =====================================
          SYLLABUS TRACKER
      ===================================== */}

      {
        mode ===
        'syllabus' && (

          <LearnPage

            initialSubject={
              initialSubject
            }

          />

        )
      }


      {/* =====================================
          STUDY RESOURCES
      ===================================== */}

      {
        mode ===
        'resources' && (

          <div
            className="page-wrap"
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
          BOOK PROGRESS WORKSPACE
      ===================================== */}

      {
        mode ===
        'book-progress' && (

          <div
            className="page-wrap"
          >

            {/* =================================
                PERSONAL REVISION SETTINGS
            ================================= */}

            <RevisionScheduleSettings />


            {/* =================================
                7-DAY REVISION CALENDAR
            ================================= */}

            <div
              style={{
                marginTop:
                  '18px'
              }}
            >

              <RevisionWeekCalendar />

            </div>


            {/* =================================
                BOOK READING + REVISION TRACKER
            ================================= */}

            <div
              style={{
                marginTop:
                  '18px'
              }}
            >

              <BookProgressTracker

                initialSubject={
                  initialSubject
                }

              />

            </div>

          </div>

        )
      }

    </>

  );
}

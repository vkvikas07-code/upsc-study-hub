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


type LearnMode =
  | 'syllabus'
  | 'resources'
  | 'book-progress';


type LearnHubPageProps = {
  initialSubject?:
    string |
    null;
};


export function LearnHubPage({
  initialSubject = null
}: LearnHubPageProps) {

  /*
   * LEARN WORKSPACE
   *
   * syllabus =
   * UPSC syllabus tracker
   *
   * resources =
   * books, notes, reports,
   * official sources
   *
   * book-progress =
   * subject -> book ->
   * topic -> subtopic
   * reading tracker
   */

  const [
    mode,
    setMode
  ] =
    useState<
      LearnMode
    >(
      'syllabus'
    );


  /*
   * HOME QUICK STUDY
   *
   * When Home sends a subject,
   * open the Syllabus Tracker
   * first.
   *
   * The same subject is also
   * passed to Book Progress,
   * so if the student switches
   * to Book Progress, that
   * subject will already be
   * selected when possible.
   */

  useEffect(
    () => {

      if (
        initialSubject
      ) {

        setMode(
          'syllabus'
        );
      }

    },
    [
      initialSubject
    ]
  );


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
            Track the UPSC syllabus, access
            important study resources and
            monitor your book-wise reading
            progress from one place.
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
          BOOK PROGRESS TRACKER
      ===================================== */}

      {
        mode ===
        'book-progress' && (

          <div
            className="page-wrap"
          >

            <BookProgressTracker

              initialSubject={
                initialSubject
              }

            />

          </div>

        )
      }

    </>

  );
}

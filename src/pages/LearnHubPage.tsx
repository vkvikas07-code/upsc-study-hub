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


type LearnMode =
  | 'syllabus'
  | 'resources';


type LearnHubPageProps = {
  initialSubject?: string | null;
};


export function LearnHubPage({
  initialSubject = null
}: LearnHubPageProps) {

  /*
   * LEARN WORKSPACE
   *
   * syllabus =
   * live UPSC syllabus tracker
   *
   * resources =
   * books, official sources,
   * notes, reports, monthly CA
   */

  const [
    mode,
    setMode
  ] =
    useState<LearnMode>(
      'syllabus'
    );


  /*
   * WHEN HOME QUICK STUDY
   * OPENS A SUBJECT,
   * ALWAYS RETURN TO
   * SYLLABUS TRACKER.
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

      {/* LEARN WORKSPACE SWITCHER */}

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
            Track the complete UPSC syllabus
            and access syllabus-linked study
            resources from one place.
          </p>


          <div
            className="filter-row"
            style={{
              marginTop:
                '16px'
            }}
          >

            {/* SYLLABUS TRACKER */}

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

          </div>

        </section>

      </div>


      {/* SYLLABUS TRACKER */}

      {
        mode ===
        'syllabus'
          ? (

            <LearnPage
              initialSubject={
                initialSubject
              }
            />

          )

          : (

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

    </>

  );
}

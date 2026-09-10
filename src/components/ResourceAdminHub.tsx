import {
  useState
} from 'react';

import {
  StudyResourceManager
} from './StudyResourceManager';

import {
  BookStructureManager
} from './BookStructureManager';


type ResourceAdminMode =
  | 'resources'
  | 'structure';


export function ResourceAdminHub() {

  const [
    mode,
    setMode
  ] =
    useState<
      ResourceAdminMode
    >(
      'resources'
    );


  return (

    <div>

      {/* =====================================
          RESOURCE ADMIN HEADER
      ===================================== */}

      <section
        className="panel"
      >

        <span
          className="eyebrow"
        >
          ADMIN • STUDY MATERIAL
        </span>


        <h2>
          Study Material Manager
        </h2>


        <p>
          Manage books and resources first,
          then build each book as
          Subject → Book → Topic → Subtopic.
        </p>


        {/* WORKSPACE SWITCHER */}

        <div
          className="filter-row"
          style={{
            marginTop:
              '16px'
          }}
        >

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


          <button
            type="button"

            className={
              mode ===
                'structure'
                ? 'filter active'
                : 'filter'
            }

            onClick={() =>
              setMode(
                'structure'
              )
            }
          >
            Book Structure
          </button>

        </div>

      </section>


      {/* =====================================
          RESOURCE MANAGER
      ===================================== */}

      {
        mode ===
        'resources'
          ? (

            <div
              style={{
                marginTop:
                  '18px'
              }}
            >

              <StudyResourceManager />

            </div>

          )

          : (

            <div
              style={{
                marginTop:
                  '18px'
              }}
            >

              <BookStructureManager />

            </div>

          )
      }

    </div>

  );
}

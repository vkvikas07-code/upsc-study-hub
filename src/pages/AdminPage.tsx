import {
  TopBar
} from '../components/TopBar';

import {
  MyMainsEvaluations
} from '../components/MyMainsEvaluations';


export function ProfilePage({
  onAdmin
}: {
  onAdmin:
    () => void;
}) {
  return (
    <div className="page-wrap">

      <TopBar
        title="My Study"
        subtitle="Your progress, practice and evaluations"
      />


      <section className="profile-card">

        <div className="avatar">
          AS
        </div>


        <div>

          <h2>
            Aspirant
          </h2>

          <p>
            UPSC Civil Services Examination
          </p>

        </div>

      </section>


      <section
        className="metrics-grid"
        style={{
          marginTop:
            '18px'
        }}
      >

        <article className="metric-card">

          <div>

            <span>
              Syllabus
            </span>

            <strong>
              38%
            </strong>

            <small>
              Tracked by topic
            </small>

          </div>

        </article>


        <article className="metric-card">

          <div>

            <span>
              Questions
            </span>

            <strong>
              240
            </strong>

            <small>
              Practice attempts
            </small>

          </div>

        </article>


        <article className="metric-card">

          <div>

            <span>
              Bookmarks
            </span>

            <strong>
              18
            </strong>

            <small>
              Saved for revision
            </small>

          </div>

        </article>

      </section>


      <MyMainsEvaluations />


      <section
        className="panel"
        style={{
          marginTop:
            '22px'
        }}
      >

        <span className="eyebrow">
          STUDY TOOLS
        </span>

        <h3>
          My Study Tools
        </h3>


        <div className="settings-list">

          <button
            type="button"
          >
            Bookmarks
            <span>
              ›
            </span>
          </button>


          <button
            type="button"
          >
            My notes
            <span>
              ›
            </span>
          </button>


          <button
            type="button"
          >
            Test history
            <span>
              ›
            </span>
          </button>


          <button
            type="button"
          >
            Download for offline
            <span>
              ›
            </span>
          </button>


          <button
            type="button"
            onClick={
              onAdmin
            }
          >
            Admin Studio
            <span>
              ›
            </span>
          </button>

        </div>

      </section>

    </div>
  );
}

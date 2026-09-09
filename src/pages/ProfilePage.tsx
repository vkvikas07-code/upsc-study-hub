import {
  useRef,
  useState
} from 'react';

import {
  TopBar
} from '../components/TopBar';

import {
  StudyOverview
} from '../components/StudyOverview';

import {
  MyPrelimsHistory
} from '../components/MyPrelimsHistory';

import {
  MyMainsEvaluations
} from '../components/MyMainsEvaluations';

import {
  MySavedPrelimsQuestions
} from '../components/MySavedPrelimsQuestions';


export function ProfilePage({
  onAdmin
}: {
  onAdmin:
    () => void;
}) {

  /*
   * REVISION BANK
   */

  const [
    showRevisionBank,
    setShowRevisionBank
  ] =
    useState(false);


  /*
   * PAGE REFERENCES
   */

  const prelimsHistoryRef =
    useRef<HTMLDivElement | null>(
      null
    );


  const revisionBankRef =
    useRef<HTMLDivElement | null>(
      null
    );


  const mainsEvaluationRef =
    useRef<HTMLDivElement | null>(
      null
    );


  /*
   * SCROLL TO SECTION
   */

  function scrollToSection(
    element:
      HTMLDivElement | null
  ) {

    if (!element) {
      return;
    }


    window.setTimeout(
      () => {

        element.scrollIntoView({
          behavior:
            'smooth',

          block:
            'start'
        });

      },
      100
    );
  }


  /*
   * OPEN / CLOSE REVISION BANK
   */

  function toggleRevisionBank() {

    const nextState =
      !showRevisionBank;


    setShowRevisionBank(
      nextState
    );


    if (nextState) {

      window.setTimeout(
        () => {

          scrollToSection(
            revisionBankRef.current
          );

        },
        150
      );
    }
  }


  /*
   * OPEN PRELIMS HISTORY
   */

  function openPrelimsHistory() {

    scrollToSection(
      prelimsHistoryRef.current
    );
  }


  /*
   * OPEN MAINS EVALUATIONS
   */

  function openMainsEvaluations() {

    scrollToSection(
      mainsEvaluationRef.current
    );
  }


  return (

    <div
      className="page-wrap"
    >

      <TopBar
        title="My Study"
        subtitle="Your progress, practice and evaluations"
      />


      {/* PROFILE */}

      <section
        className="profile-card"
      >

        <div
          className="avatar"
        >
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


      {/* STUDY OVERVIEW */}

      <StudyOverview />


      {/* QUICK STUDY TOOLS */}

      <section
        className="panel"
        style={{
          marginTop:
            '22px'
        }}
      >

        <span
          className="eyebrow"
        >
          STUDY TOOLS
        </span>


        <h3>
          My Study Tools
        </h3>


        <p>
          Quickly open your revision,
          practice history and
          evaluation records.
        </p>


        <div
          className="settings-list"
        >

          {/* REVISION BANK */}

          <button
            type="button"
            onClick={
              toggleRevisionBank
            }
          >

            <span
              style={{
                display:
                  'flex',

                flexDirection:
                  'column',

                alignItems:
                  'flex-start',

                gap:
                  '3px'
              }}
            >

              <strong>
                ★ Revision Bank
              </strong>


              <small>
                Saved Prelims questions
              </small>

            </span>


            <span>
              {
                showRevisionBank
                  ? '⌃'
                  : '›'
              }
            </span>

          </button>


          {/* PRELIMS HISTORY */}

          <button
            type="button"
            onClick={
              openPrelimsHistory
            }
          >

            <span
              style={{
                display:
                  'flex',

                flexDirection:
                  'column',

                alignItems:
                  'flex-start',

                gap:
                  '3px'
              }}
            >

              <strong>
                Prelims History
              </strong>


              <small>
                Practice and Exam results
              </small>

            </span>


            <span>
              ›
            </span>

          </button>


          {/* MAINS EVALUATION */}

          <button
            type="button"
            onClick={
              openMainsEvaluations
            }
          >

            <span
              style={{
                display:
                  'flex',

                flexDirection:
                  'column',

                alignItems:
                  'flex-start',

                gap:
                  '3px'
              }}
            >

              <strong>
                Mains Evaluations
              </strong>


              <small>
                Reviewed answer sheets
              </small>

            </span>


            <span>
              ›
            </span>

          </button>


          {/* NOTES - FUTURE */}

          <button
            type="button"
            disabled
            title="Coming soon"
            style={{
              opacity:
                0.55,

              cursor:
                'not-allowed'
            }}
          >

            <span
              style={{
                display:
                  'flex',

                flexDirection:
                  'column',

                alignItems:
                  'flex-start',

                gap:
                  '3px'
              }}
            >

              <strong>
                My Notes
              </strong>


              <small>
                Coming soon
              </small>

            </span>


            <span>
              ›
            </span>

          </button>


          {/* OFFLINE - FUTURE */}

          <button
            type="button"
            disabled
            title="Coming soon"
            style={{
              opacity:
                0.55,

              cursor:
                'not-allowed'
            }}
          >

            <span
              style={{
                display:
                  'flex',

                flexDirection:
                  'column',

                alignItems:
                  'flex-start',

                gap:
                  '3px'
              }}
            >

              <strong>
                Offline Study
              </strong>


              <small>
                Coming soon
              </small>

            </span>


            <span>
              ›
            </span>

          </button>


          {/* ADMIN */}

          <button
            type="button"
            onClick={
              onAdmin
            }
          >

            <span
              style={{
                display:
                  'flex',

                flexDirection:
                  'column',

                alignItems:
                  'flex-start',

                gap:
                  '3px'
              }}
            >

              <strong>
                Admin Studio
              </strong>


              <small>
                Content management
              </small>

            </span>


            <span>
              ›
            </span>

          </button>

        </div>

      </section>


      {/* REVISION BANK */}

      {showRevisionBank && (

        <div
          ref={
            revisionBankRef
          }
        >

          <MySavedPrelimsQuestions />


          <div
            style={{
              display:
                'flex',

              justifyContent:
                'center',

              marginTop:
                '12px'
            }}
          >

            <button
              type="button"
              className="secondary-btn"
              onClick={() => {

                setShowRevisionBank(
                  false
                );


                window.scrollTo({
                  top:
                    0,

                  behavior:
                    'smooth'
                });

              }}
            >
              Close Revision Bank
            </button>

          </div>

        </div>

      )}


      {/* PRELIMS HISTORY */}

      <div
        ref={
          prelimsHistoryRef
        }
        style={{
          scrollMarginTop:
            '20px'
        }}
      >

        <MyPrelimsHistory />

      </div>


      {/* MAINS EVALUATIONS */}

      <div
        ref={
          mainsEvaluationRef
        }
        style={{
          scrollMarginTop:
            '20px'
        }}
      >

        <MyMainsEvaluations />

      </div>

    </div>
  );
}

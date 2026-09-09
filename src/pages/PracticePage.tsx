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

import {
  PrelimsWeakAreaAnalysis
} from '../components/PrelimsWeakAreaAnalysis';


export function ProfilePage({
  onAdmin
}: {
  onAdmin:
    () => void;
}) {

  /*
   * EXPANDABLE STUDY TOOLS
   */

  const [
    showRevisionBank,
    setShowRevisionBank
  ] =
    useState(false);


  const [
    showWeakAnalysis,
    setShowWeakAnalysis
  ] =
    useState(false);


  /*
   * PAGE REFERENCES
   */

  const revisionBankRef =
    useRef<
      HTMLDivElement | null
    >(null);


  const weakAnalysisRef =
    useRef<
      HTMLDivElement | null
    >(null);


  const prelimsHistoryRef =
    useRef<
      HTMLDivElement | null
    >(null);


  const mainsEvaluationRef =
    useRef<
      HTMLDivElement | null
    >(null);


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


    element.scrollIntoView({
      behavior:
        'smooth',

      block:
        'start'
    });
  }


  /*
   * REVISION BANK
   */

  function toggleRevisionBank() {

    const nextState =
      !showRevisionBank;


    /*
     * Keep only one large
     * expandable study tool open.
     */

    setShowWeakAnalysis(
      false
    );


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
   * WEAK AREA ANALYSIS
   */

  function toggleWeakAnalysis() {

    const nextState =
      !showWeakAnalysis;


    /*
     * Close Revision Bank
     * when analytics opens.
     */

    setShowRevisionBank(
      false
    );


    setShowWeakAnalysis(
      nextState
    );


    if (nextState) {

      window.setTimeout(
        () => {

          scrollToSection(
            weakAnalysisRef.current
          );

        },
        150
      );
    }
  }


  /*
   * PRELIMS HISTORY
   */

  function openPrelimsHistory() {

    setShowRevisionBank(
      false
    );

    setShowWeakAnalysis(
      false
    );


    window.setTimeout(
      () => {

        scrollToSection(
          prelimsHistoryRef.current
        );

      },
      100
    );
  }


  /*
   * MAINS EVALUATIONS
   */

  function openMainsEvaluations() {

    setShowRevisionBank(
      false
    );

    setShowWeakAnalysis(
      false
    );


    window.setTimeout(
      () => {

        scrollToSection(
          mainsEvaluationRef.current
        );

      },
      100
    );
  }


  /*
   * RETURN TO TOP
   */

  function returnToTop() {

    window.scrollTo({
      top: 0,

      behavior:
        'smooth'
    });
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


      {/* STUDY TOOLS */}

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
          Review weak areas,
          revise saved questions
          and track your performance.
        </p>


        <div
          className="settings-list"
        >

          {/* WEAK AREA ANALYSIS */}

          <button
            type="button"
            onClick={
              toggleWeakAnalysis
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
                📊 Prelims Weak Areas
              </strong>


              <small>
                Subject and topic analysis
              </small>

            </span>


            <span>
              {
                showWeakAnalysis
                  ? '⌃'
                  : '›'
              }
            </span>

          </button>


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


          {/* NOTES */}

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


          {/* OFFLINE STUDY */}

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


      {/* WEAK AREA ANALYSIS */}

      {showWeakAnalysis && (

        <div
          ref={
            weakAnalysisRef
          }
          style={{
            scrollMarginTop:
              '20px'
          }}
        >

          <PrelimsWeakAreaAnalysis />


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

                setShowWeakAnalysis(
                  false
                );


                returnToTop();

              }}
            >
              Close Weak Area Analysis
            </button>

          </div>

        </div>

      )}


      {/* REVISION BANK */}

      {showRevisionBank && (

        <div
          ref={
            revisionBankRef
          }
          style={{
            scrollMarginTop:
              '20px'
          }}
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


                returnToTop();

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

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

import {
  PrelimsMistakeBook
} from '../components/PrelimsMistakeBook';

import {
  PrelimsMistakePractice
} from '../components/PrelimsMistakePractice';


export function ProfilePage({
  onAdmin
}: {
  onAdmin: () => void;
}) {

  /*
   * EXPANDABLE STUDY TOOLS
   */

  const [
    showWeakAnalysis,
    setShowWeakAnalysis
  ] =
    useState(false);


  const [
    showMistakeBook,
    setShowMistakeBook
  ] =
    useState(false);


  const [
    showMistakePractice,
    setShowMistakePractice
  ] =
    useState(false);


  const [
    showRevisionBank,
    setShowRevisionBank
  ] =
    useState(false);


  /*
   * SECTION REFERENCES
   */

  const weakAnalysisRef =
    useRef<HTMLDivElement | null>(
      null
    );


  const mistakeBookRef =
    useRef<HTMLDivElement | null>(
      null
    );


  const mistakePracticeRef =
    useRef<HTMLDivElement | null>(
      null
    );


  const revisionBankRef =
    useRef<HTMLDivElement | null>(
      null
    );


  const prelimsHistoryRef =
    useRef<HTMLDivElement | null>(
      null
    );


  const mainsEvaluationRef =
    useRef<HTMLDivElement | null>(
      null
    );


  /*
   * SCROLL HELPER
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
   * CLOSE ALL EXPANDABLE TOOLS
   */

  function closeExpandableTools() {

    setShowWeakAnalysis(
      false
    );

    setShowMistakeBook(
      false
    );

    setShowMistakePractice(
      false
    );

    setShowRevisionBank(
      false
    );
  }


  /*
   * WEAK AREA ANALYSIS
   */

  function toggleWeakAnalysis() {

    const nextState =
      !showWeakAnalysis;


    setShowMistakeBook(
      false
    );

    setShowMistakePractice(
      false
    );

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
   * MISTAKE BOOK
   */

  function toggleMistakeBook() {

    const nextState =
      !showMistakeBook;


    setShowWeakAnalysis(
      false
    );

    setShowMistakePractice(
      false
    );

    setShowRevisionBank(
      false
    );

    setShowMistakeBook(
      nextState
    );


    if (nextState) {

      window.setTimeout(
        () => {

          scrollToSection(
            mistakeBookRef.current
          );

        },
        150
      );
    }
  }


  /*
   * PRACTICE MISTAKES
   */

  function toggleMistakePractice() {

    const nextState =
      !showMistakePractice;


    setShowWeakAnalysis(
      false
    );

    setShowMistakeBook(
      false
    );

    setShowRevisionBank(
      false
    );

    setShowMistakePractice(
      nextState
    );


    if (nextState) {

      window.setTimeout(
        () => {

          scrollToSection(
            mistakePracticeRef.current
          );

        },
        150
      );
    }
  }


  /*
   * REVISION BANK
   */

  function toggleRevisionBank() {

    const nextState =
      !showRevisionBank;


    setShowWeakAnalysis(
      false
    );

    setShowMistakeBook(
      false
    );

    setShowMistakePractice(
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
   * PRELIMS HISTORY
   */

  function openPrelimsHistory() {

    closeExpandableTools();


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

    closeExpandableTools();


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
   * RETURN TO PAGE TOP
   */

  function returnToTop() {

    window.scrollTo({
      top:
        0,

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
        subtitle="Your progress, revision and evaluations"
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
          Analyse performance,
          practise mistakes,
          revise saved questions
          and track improvement.
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


          {/* MISTAKE BOOK */}

          <button
            type="button"
            onClick={
              toggleMistakeBook
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
                ✕ Prelims Mistake Book
              </strong>


              <small>
                Review questions answered incorrectly
              </small>

            </span>


            <span>
              {
                showMistakeBook
                  ? '⌃'
                  : '›'
              }
            </span>

          </button>


          {/* PRACTICE MISTAKES */}

          <button
            type="button"
            onClick={
              toggleMistakePractice
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
                🎯 Practice Your Mistakes
              </strong>


              <small>
                Reattempt questions you got wrong
              </small>

            </span>


            <span>
              {
                showMistakePractice
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


          {/* MAINS EVALUATIONS */}

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


      {/* MISTAKE BOOK */}

      {showMistakeBook && (

        <div
          ref={
            mistakeBookRef
          }
          style={{
            scrollMarginTop:
              '20px'
          }}
        >

          <PrelimsMistakeBook />


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

                setShowMistakeBook(
                  false
                );

                returnToTop();

              }}
            >
              Close Mistake Book
            </button>

          </div>

        </div>

      )}


      {/* PRACTICE MISTAKES */}

      {showMistakePractice && (

        <div
          ref={
            mistakePracticeRef
          }
          style={{
            scrollMarginTop:
              '20px'
          }}
        >

          <PrelimsMistakePractice />


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

                setShowMistakePractice(
                  false
                );

                returnToTop();

              }}
            >
              Close Mistake Practice
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

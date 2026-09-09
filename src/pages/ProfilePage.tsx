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
  PrelimsNextAction
} from '../components/PrelimsNextAction';

import {
  PrelimsPerformanceTrend
} from '../components/PrelimsPerformanceTrend';

import {
  PrelimsWeakAreaAnalysis
} from '../components/PrelimsWeakAreaAnalysis';

import {
  PrelimsMistakeBook
} from '../components/PrelimsMistakeBook';

import {
  PrelimsMistakePractice
} from '../components/PrelimsMistakePractice';


type OpenTool =
  | 'performance'
  | 'weak'
  | 'mistakeBook'
  | 'mistakePractice'
  | 'revision'
  | null;


type ToolButtonProps = {
  title: string;
  subtitle: string;
  open?: boolean;
  onClick: () => void;
};


function StudyToolButton({
  title,
  subtitle,
  open = false,
  onClick
}: ToolButtonProps) {

  return (

    <button
      type="button"
      onClick={
        onClick
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
          {title}
        </strong>


        <small>
          {subtitle}
        </small>

      </span>


      <span>
        {
          open
            ? '⌃'
            : '›'
        }
      </span>

    </button>

  );
}


export function ProfilePage({
  onAdmin
}: {
  onAdmin: () => void;
}) {

  /*
   * ONLY ONE LARGE TOOL
   * STAYS OPEN AT A TIME
   */

  const [
    openTool,
    setOpenTool
  ] =
    useState<OpenTool>(
      null
    );


  /*
   * SECTION REFERENCES
   */

  const performanceTrendRef =
    useRef<HTMLDivElement | null>(
      null
    );


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
      HTMLDivElement | null,
    delay = 150
  ) {

    window.setTimeout(
      () => {

        element?.scrollIntoView({
          behavior:
            'smooth',

          block:
            'start'
        });

      },
      delay
    );
  }


  /*
   * TOGGLE AN EXPANDABLE TOOL
   */

  function toggleTool(
    tool: Exclude<
      OpenTool,
      null
    >,
    element:
      HTMLDivElement | null
  ) {

    if (
      openTool ===
      tool
    ) {

      setOpenTool(
        null
      );

      return;
    }


    setOpenTool(
      tool
    );


    scrollToSection(
      element
    );
  }


  /*
   * DIRECT OPEN FUNCTIONS
   *
   * Used by Smart Next Action.
   */

  function openWeakAreas() {

    setOpenTool(
      'weak'
    );


    scrollToSection(
      weakAnalysisRef.current
    );
  }


  function openMistakePractice() {

    setOpenTool(
      'mistakePractice'
    );


    scrollToSection(
      mistakePracticeRef.current
    );
  }


  function openRevisionBank() {

    setOpenTool(
      'revision'
    );


    scrollToSection(
      revisionBankRef.current
    );
  }


  /*
   * HISTORY NAVIGATION
   */

  function openPrelimsHistory() {

    setOpenTool(
      null
    );


    scrollToSection(
      prelimsHistoryRef.current,
      100
    );
  }


  function openMainsEvaluations() {

    setOpenTool(
      null
    );


    scrollToSection(
      mainsEvaluationRef.current,
      100
    );
  }


  /*
   * RETURN TO TOP
   */

  function returnToTop() {

    window.scrollTo({
      top:
        0,

      behavior:
        'smooth'
    });
  }


  function closeTool() {

    setOpenTool(
      null
    );


    returnToTop();
  }


  return (

    <div
      className="page-wrap"
    >

      {/* TOP BAR */}

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


      {/* SMART NEXT ACTION */}

      <PrelimsNextAction

        onOpenMistakePractice={
          openMistakePractice
        }

        onOpenWeakAreas={
          openWeakAreas
        }

        onOpenRevisionBank={
          openRevisionBank
        }

      />


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
          Track improvement,
          identify weak areas,
          practise mistakes
          and build focused revision.
        </p>


        <div
          className="settings-list"
        >

          {/* PERFORMANCE TREND */}

          <StudyToolButton

            title="📈 Prelims Performance Trend"

            subtitle="Track improvement across attempts"

            open={
              openTool ===
              'performance'
            }

            onClick={() =>
              toggleTool(
                'performance',
                performanceTrendRef.current
              )
            }

          />


          {/* WEAK AREAS */}

          <StudyToolButton

            title="📊 Prelims Weak Areas"

            subtitle="Subject and topic analysis"

            open={
              openTool ===
              'weak'
            }

            onClick={() =>
              toggleTool(
                'weak',
                weakAnalysisRef.current
              )
            }

          />


          {/* MISTAKE BOOK */}

          <StudyToolButton

            title="✕ Prelims Mistake Book"

            subtitle="Review questions answered incorrectly"

            open={
              openTool ===
              'mistakeBook'
            }

            onClick={() =>
              toggleTool(
                'mistakeBook',
                mistakeBookRef.current
              )
            }

          />


          {/* MISTAKE PRACTICE */}

          <StudyToolButton

            title="🎯 Practice Your Mistakes"

            subtitle="Reattempt questions you got wrong"

            open={
              openTool ===
              'mistakePractice'
            }

            onClick={() =>
              toggleTool(
                'mistakePractice',
                mistakePracticeRef.current
              )
            }

          />


          {/* REVISION BANK */}

          <StudyToolButton

            title="★ Revision Bank"

            subtitle="Saved Prelims questions"

            open={
              openTool ===
              'revision'
            }

            onClick={() =>
              toggleTool(
                'revision',
                revisionBankRef.current
              )
            }

          />


          {/* PRELIMS HISTORY */}

          <StudyToolButton

            title="Prelims History"

            subtitle="Practice and Exam results"

            onClick={
              openPrelimsHistory
            }

          />


          {/* MAINS EVALUATIONS */}

          <StudyToolButton

            title="Mains Evaluations"

            subtitle="Reviewed answer sheets"

            onClick={
              openMainsEvaluations
            }

          />


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


      {/* PERFORMANCE TREND */}

      {openTool ===
        'performance' && (

        <div
          ref={
            performanceTrendRef
          }
          style={{
            scrollMarginTop:
              '20px'
          }}
        >

          <PrelimsPerformanceTrend />


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
              onClick={
                closeTool
              }
            >
              Close Performance Trend
            </button>

          </div>

        </div>

      )}


      {/* WEAK AREA ANALYSIS */}

      {openTool ===
        'weak' && (

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
              onClick={
                closeTool
              }
            >
              Close Weak Area Analysis
            </button>

          </div>

        </div>

      )}


      {/* MISTAKE BOOK */}

      {openTool ===
        'mistakeBook' && (

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
              onClick={
                closeTool
              }
            >
              Close Mistake Book
            </button>

          </div>

        </div>

      )}


      {/* MISTAKE PRACTICE */}

      {openTool ===
        'mistakePractice' && (

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
              onClick={
                closeTool
              }
            >
              Close Mistake Practice
            </button>

          </div>

        </div>

      )}


      {/* REVISION BANK */}

      {openTool ===
        'revision' && (

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
              onClick={
                closeTool
              }
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

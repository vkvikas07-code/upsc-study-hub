import {
  useState
} from 'react';

import {
  PrelimsPyqQuickImport
} from './PrelimsPyqQuickImport';

import {
  QuestionManager
} from './QuestionManager';

import {
  PrelimsImportReview
} from './PrelimsImportReview';


type PrelimsWorkspace =
  | 'quick-import'
  | 'editor'
  | 'bank'
  | 'review';


export function PrelimsAdminWorkspace() {

  const [
    workspace,
    setWorkspace
  ] =
    useState<PrelimsWorkspace>(
      'quick-import'
    );


  const tabs:
    Array<{
      id: PrelimsWorkspace;
      label: string;
      description: string;
    }> =
    [

      {
        id:
          'quick-import',

        label:
          'Quick PYQ Import',

        description:
          'Import a complete previous-year paper'
      },

      {
        id:
          'editor',

        label:
          'Add / Edit MCQ',

        description:
          'Create or edit one question'
      },

      {
        id:
          'bank',

        label:
          'Question Bank',

        description:
          'Search and manage stored MCQs'
      },

      {
        id:
          'review',

        label:
          'Import Review',

        description:
          'Check duplicate or conflicting PYQs'
      }

    ];


  const activeTab =
    tabs.find(
      tab =>
        tab.id ===
        workspace
    );


  return (

    <div>

      {/* =================================================
          PRELIMS WORKSPACE NAVIGATION
      ================================================= */}

      <section
        className="panel"
        style={{
          padding:
            '12px 14px',

          marginBottom:
            '12px'
        }}
      >

        <div
          style={{

            display:
              'grid',

            gridTemplateColumns:
              'repeat(4, minmax(0, 1fr))',

            gap:
              '8px'

          }}
        >

          {
            tabs.map(
              tab => (

                <button

                  key={
                    tab.id
                  }

                  type="button"

                  className={
                    workspace ===
                      tab.id
                      ? 'filter active'
                      : 'filter'
                  }

                  onClick={() => {

                    setWorkspace(
                      tab.id
                    );


                    window
                      .requestAnimationFrame(
                        () => {

                          const mainArea =
                            document
                              .querySelector(
                                '.main-area'
                              );


                          mainArea?.scrollTo({
                            top: 0,
                            behavior:
                              'smooth'
                          });

                        }
                      );

                  }}

                  style={{
                    minHeight:
                      '42px',

                    whiteSpace:
                      'normal',

                    lineHeight:
                      1.2
                  }}

                >

                  {
                    tab.label
                  }

                </button>

              )
            )
          }

        </div>


        {
          activeTab && (

            <small
              style={{

                display:
                  'block',

                marginTop:
                  '8px',

                color:
                  '#94a3b8'

              }}
            >

              {
                activeTab.description
              }

            </small>

          )
        }

      </section>


      {/* =================================================
          QUICK PYQ IMPORT
      ================================================= */}

      {
        workspace ===
          'quick-import' && (

          <PrelimsPyqQuickImport />

        )
      }


      {/* =================================================
          ADD / EDIT MCQ
      ================================================= */}

      {
        workspace ===
          'editor' && (

         <QuestionManager
  view="editor"
/>

        )
      }


      {/* =================================================
          QUESTION BANK
      ================================================= */}

      {
        workspace ===
          'bank' && (

         <QuestionManager
  view="bank"
/>

        )
      }


      {/* =================================================
          IMPORT REVIEW
      ================================================= */}

      {
        workspace ===
          'review' && (

          <PrelimsImportReview />

        )
      }

    </div>

  );
}


export default PrelimsAdminWorkspace;

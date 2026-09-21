import {
  useState
} from 'react';

import {
  PrelimsPyqQuickImport
} from './PrelimsPyqQuickImport';

import {
  CompactMcqEditor
} from './CompactMcqEditor';

import {
  CompactQuestionBank
} from './CompactQuestionBank';

import {
  PrelimsImportReview
} from './PrelimsImportReview';


type PrelimsWorkspace =
  | 'quick-import'
  | 'editor'
  | 'bank'
  | 'review';


type TabItem = {
  id:
    PrelimsWorkspace;

  label:
    string;

  helper:
    string;
};


const TABS:
  TabItem[] =
  [

    {
      id:
        'quick-import',

      label:
        'Quick PYQ Import',

      helper:
        'Import a complete previous-year paper quickly.'
    },

    {
      id:
        'editor',

      label:
        'Add / Edit MCQ',

      helper:
        'Create or edit one Prelims question.'
    },

    {
      id:
        'bank',

      label:
        'Question Bank',

      helper:
        'Search, filter and manage stored questions.'
    },

    {
      id:
        'review',

      label:
        'Import Review',

      helper:
        'Check duplicate or conflicting PYQs.'
    }

  ];


export function PrelimsAdminWorkspace() {

  const [
    workspace,
    setWorkspace
  ] =
    useState<PrelimsWorkspace>(
      'quick-import'
    );


  const activeTab =
    TABS.find(
      item =>
        item.id ===
        workspace
    );


  return (

    <div>

      {/* =================================================
          PRELIMS MCQ SUB-TABS
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
              'repeat(auto-fit, minmax(150px, 1fr))',

            gap:
              '8px'
          }}
        >

          {
            TABS.map(
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

                  {tab.label}

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
                activeTab.helper
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
          COMPACT ADD / EDIT
      ================================================= */}

      {
        workspace ===
          'editor' && (

          <CompactMcqEditor />

        )
      }


      {/* =================================================
          COMPACT QUESTION BANK
      ================================================= */}

      {
        workspace ===
          'bank' && (

          <CompactQuestionBank />

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

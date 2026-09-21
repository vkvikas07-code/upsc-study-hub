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
      id:
        PrelimsWorkspace;

      label:
        string;

      description:
        string;
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
          'Create or edit one question quickly'
      },

      {
        id:
          'bank',

        label:
          'Question Bank',

        description:
          'Search, publish and manage stored questions'
      },

      {
        id:
          'review',

        label:
          'Import Review',

        description:
          'Review possible duplicate or conflicting PYQs'
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
                  onClick={() =>
                    setWorkspace(
                      tab.id
                    )
                  }
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
                activeTab.description
              }
            </small>

          )
        }

      </section>


      {
        workspace ===
          'quick-import' && (

          <PrelimsPyqQuickImport />

        )
      }


      {
        workspace ===
          'editor' && (

          <CompactMcqEditor />

        )
      }


      {
        workspace ===
          'bank' && (

          <QuestionManager
            view="bank"
          />

        )
      }


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

import {
  useEffect,
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
  id: PrelimsWorkspace;
  label: string;
  helper: string;
};


const STORAGE_KEY =
  'upsc-prelims-admin-workspace';


const TABS: TabItem[] = [
  {
    id: 'quick-import',
    label: 'Quick PYQ Import',
    helper: 'Import a complete previous-year paper quickly.'
  },
  {
    id: 'editor',
    label: 'Add / Edit MCQ',
    helper: 'Create or edit one Prelims question.'
  },
  {
    id: 'bank',
    label: 'Question Bank',
    helper: 'Search, filter and manage stored questions.'
  },
  {
    id: 'review',
    label: 'Import Review',
    helper: 'Resolve duplicate or conflicting imported PYQs.'
  }
];


function isWorkspace(
  value: string | null
): value is PrelimsWorkspace {

  return (
    value === 'quick-import' ||
    value === 'editor' ||
    value === 'bank' ||
    value === 'review'
  );
}


function getInitialWorkspace():
  PrelimsWorkspace {

  if (
    typeof window ===
    'undefined'
  ) {
    return 'quick-import';
  }


  const saved =
    window.localStorage
      .getItem(
        STORAGE_KEY
      );


  return isWorkspace(saved)
    ? saved
    : 'quick-import';
}


export function PrelimsAdminWorkspace() {

  const [
    workspace,
    setWorkspace
  ] =
    useState<PrelimsWorkspace>(
      getInitialWorkspace
    );


  const [
    visited,
    setVisited
  ] =
    useState<
      Set<PrelimsWorkspace>
    >(
      () =>
        new Set([
          getInitialWorkspace()
        ])
    );


  const [
    editQuestionId,
    setEditQuestionId
  ] =
    useState<string | null>(
      null
    );


  /*
   * requestKey changes every time Edit is clicked.
   * This guarantees that clicking the same question
   * again reloads it in the editor.
   */
  const [
    editRequestKey,
    setEditRequestKey
  ] =
    useState(0);


  const activeTab =
    TABS.find(
      item =>
        item.id ===
        workspace
    );


  useEffect(
    () => {

      if (
        typeof window ===
        'undefined'
      ) {
        return;
      }


      window.localStorage
        .setItem(
          STORAGE_KEY,
          workspace
        );

    },
    [
      workspace
    ]
  );


  function markVisited(
    next: PrelimsWorkspace
  ):
    void {

    setVisited(
      current => {

        const updated =
          new Set(
            current
          );


        updated.add(
          next
        );


        return updated;
      }
    );
  }


  function openWorkspace(
    next: PrelimsWorkspace
  ):
    void {

    markVisited(
      next
    );


    setWorkspace(
      next
    );


    window
      .requestAnimationFrame(
        () => {

          const workspaceTop =
            document
              .getElementById(
                'prelims-workspace-content'
              );


          workspaceTop
            ?.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });

        }
      );
  }


  function openQuestionForEdit(
    questionId: string
  ):
    void {

    setEditQuestionId(
      questionId
    );


    setEditRequestKey(
      current =>
        current + 1
    );


    markVisited(
      'editor'
    );


    setWorkspace(
      'editor'
    );


    window
      .requestAnimationFrame(
        () => {

          const workspaceTop =
            document
              .getElementById(
                'prelims-workspace-content'
              );


          workspaceTop
            ?.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });

        }
      );
  }


  function finishEditing():
    void {

    setEditQuestionId(
      null
    );


    markVisited(
      'bank'
    );


    setWorkspace(
      'bank'
    );


    window
      .requestAnimationFrame(
        () => {

          const workspaceTop =
            document
              .getElementById(
                'prelims-workspace-content'
              );


          workspaceTop
            ?.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });

        }
      );
  }


  return (

    <div>

      <section
        className="panel"
        style={{
          position: 'sticky',
          top: '8px',
          zIndex: 30,
          padding: '10px 12px',
          marginBottom: '12px',
          background: 'rgba(15, 23, 42, 0.96)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 8px 30px rgba(0,0,0,.18)'
        }}
      >

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(4, minmax(0, 1fr))',
            gap: '8px'
          }}
        >

          {
            TABS.map(
              tab => {

                const active =
                  workspace ===
                  tab.id;


                return (

                  <button
                    key={
                      tab.id
                    }
                    type="button"
                    className={
                      active
                        ? 'filter active'
                        : 'filter'
                    }
                    aria-pressed={
                      active
                    }
                    onClick={() =>
                      openWorkspace(
                        tab.id
                      )
                    }
                    style={{
                      minHeight: '42px',
                      whiteSpace: 'normal',
                      lineHeight: 1.2,
                      fontWeight:
                        active
                          ? 800
                          : 600
                    }}
                  >
                    {
                      tab.label
                    }
                  </button>

                );
              }
            )
          }

        </div>


        {
          activeTab && (

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '10px',
                marginTop: '7px',
                flexWrap: 'wrap'
              }}
            >

              <small
                style={{
                  color: '#94a3b8'
                }}
              >
                {
                  activeTab.helper
                }
              </small>


              <small
                style={{
                  color: '#64748b'
                }}
              >
                Workspace data remains available while switching tabs.
              </small>

            </div>

          )
        }

      </section>


      <div
        id="prelims-workspace-content"
        style={{
          scrollMarginTop: '92px'
        }}
      >

        {
          visited.has(
            'quick-import'
          ) && (

            <div
              style={{
                display:
                  workspace ===
                    'quick-import'
                    ? 'block'
                    : 'none'
              }}
            >
              <PrelimsPyqQuickImport />
            </div>

          )
        }


        {
          visited.has(
            'editor'
          ) && (

            <div
              style={{
                display:
                  workspace ===
                    'editor'
                    ? 'block'
                    : 'none'
              }}
            >
              <CompactMcqEditor
                editQuestionId={
                  editQuestionId
                }
                editRequestKey={
                  editRequestKey
                }
                onUpdated={
                  finishEditing
                }
              />
            </div>

          )
        }


        {
          visited.has(
            'bank'
          ) && (

            <div
              style={{
                display:
                  workspace ===
                    'bank'
                    ? 'block'
                    : 'none'
              }}
            >
              <CompactQuestionBank
                onEditQuestion={
                  openQuestionForEdit
                }
              />
            </div>

          )
        }


        {
          visited.has(
            'review'
          ) && (

            <div
              style={{
                display:
                  workspace ===
                    'review'
                    ? 'block'
                    : 'none'
              }}
            >
              <PrelimsImportReview />
            </div>

          )
        }

      </div>

    </div>

  );
}


export default PrelimsAdminWorkspace;

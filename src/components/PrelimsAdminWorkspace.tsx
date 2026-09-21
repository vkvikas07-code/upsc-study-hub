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
        'Resolve duplicate or conflicting imported PYQs.'
    }

  ];


function isWorkspace(
  value: string | null
): value is PrelimsWorkspace {

  return (
    value ===
      'quick-import' ||

    value ===
      'editor' ||

    value ===
      'bank' ||

    value ===
      'review'
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


  return isWorkspace(
    saved
  )
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


  /*
   * A workspace is mounted only after it
   * has been opened once.
   *
   * After that it remains mounted while
   * hidden, so partially entered data is
   * not lost when switching tabs.
   */

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


  const activeTab =
    TABS.find(
      item =>
        item.id ===
        workspace
    );


  /* =======================================================
     REMEMBER LAST OPEN TAB
  ======================================================= */

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


  /* =======================================================
     SWITCH WORKSPACE
  ======================================================= */

  function openWorkspace(
    next:
      PrelimsWorkspace
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
              behavior:
                'smooth',

              block:
                'start'
            });

        }
      );
  }


  return (

    <div>

      {/* =================================================
          STICKY PRELIMS WORKSPACE NAVIGATION
      ================================================= */}

      <section
        className="panel"
        style={{
          position:
            'sticky',

          top:
            '8px',

          zIndex:
            30,

          padding:
            '10px 12px',

          marginBottom:
            '12px',

          background:
            'rgba(15, 23, 42, 0.96)',

          backdropFilter:
            'blur(12px)',

          WebkitBackdropFilter:
            'blur(12px)',

          boxShadow:
            '0 8px 30px rgba(0,0,0,.18)'
        }}
      >

        {/* SUB-TABS */}

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
                      minHeight:
                        '42px',

                      whiteSpace:
                        'normal',

                      lineHeight:
                        1.2,

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


        {/* ACTIVE TAB DESCRIPTION */}

        {
          activeTab && (

            <div
              style={{
                display:
                  'flex',

                justifyContent:
                  'space-between',

                alignItems:
                  'center',

                gap:
                  '10px',

                marginTop:
                  '7px',

                flexWrap:
                  'wrap'
              }}
            >

              <small
                style={{
                  color:
                    '#94a3b8'
                }}
              >
                {
                  activeTab.helper
                }
              </small>


              <small
                style={{
                  color:
                    '#64748b'
                }}
              >
                Workspace data remains
                available while switching tabs.
              </small>

            </div>

          )
        }

      </section>


      {/* =================================================
          WORKSPACE CONTENT
      ================================================= */}

      <div
        id="prelims-workspace-content"
        style={{
          scrollMarginTop:
            '92px'
        }}
      >

        {/* ===============================================
            QUICK PYQ IMPORT
        =============================================== */}

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


        {/* ===============================================
            ADD / EDIT MCQ
        =============================================== */}

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

              <CompactMcqEditor />

            </div>

          )
        }


        {/* ===============================================
            QUESTION BANK
        =============================================== */}

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

              <CompactQuestionBank />

            </div>

          )
        }


        {/* ===============================================
            IMPORT REVIEW
        =============================================== */}

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

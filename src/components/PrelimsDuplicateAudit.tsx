import {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


type QuestionStatus =
  | 'draft'
  | 'published'
  | 'archived';


type AuditQuestion = {
  id: string;
  question: string;
  subject: string | null;
  topic: string | null;
  status: QuestionStatus;
  is_pyq: boolean;
  pyq_year: number | null;
  paper: string | null;
  source: string | null;
  created_at: string | null;
};


type DuplicateGroup = {
  normalized: string;
  questions: AuditQuestion[];
};


/* =========================================================
   NORMALIZATION
   ========================================================= */

function normalizeQuestionText(
  value: string
): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(
      /[.,!?;:()[\]{}"'“”‘’\-–—_/\\]+/g,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();
}


function shortId(
  id: string
): string {
  if (
    id.length <= 12
  ) {
    return id;
  }

  return `${id.slice(
    0,
    8
  )}...`;
}


function formatDate(
  value:
    string |
    null
): string {
  if (!value) {
    return '';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '';
  }

  return date.toLocaleDateString(
    undefined,
    {
      day:
        '2-digit',

      month:
        'short',

      year:
        'numeric'
    }
  );
}


/* =========================================================
   COMPONENT
   ========================================================= */

export function PrelimsDuplicateAudit() {
  const [
    questions,
    setQuestions
  ] =
    useState<
      AuditQuestion[]
    >([]);

  const [
    loading,
    setLoading
  ] =
    useState(true);

  const [
    message,
    setMessage
  ] =
    useState('');

  const [
    search,
    setSearch
  ] =
    useState('');

  const [
    showArchived,
    setShowArchived
  ] =
    useState(false);


  async function loadQuestions():
    Promise<void> {
    if (!supabase) {
      setLoading(false);

      setMessage(
        'Supabase is not configured.'
      );

      return;
    }

    setLoading(true);

    setMessage(
      'Scanning Prelims question bank...'
    );

    const {
      data,
      error
    } =
      await supabase
        .from('questions')
        .select(`
          id,
          question,
          subject,
          topic,
          status,
          is_pyq,
          pyq_year,
          paper,
          source,
          created_at
        `)
        .eq(
          'exam_stage',
          'prelims'
        )
        .order(
          'created_at',
          {
            ascending:
              true
          }
        )
        .limit(10000);

    if (error) {
      console.error(
        'Unable to load duplicate audit:',
        error
      );

      setQuestions([]);

      setMessage(
        error.message
      );

      setLoading(false);

      return;
    }

    setQuestions(
      (
        data || []
      ) as AuditQuestion[]
    );

    setLoading(false);

    setMessage('');
  }


  useEffect(
    () => {
      void loadQuestions();
    },
    []
  );


  /* =======================================================
     GROUP DUPLICATES
     ======================================================= */

  const duplicateGroups =
    useMemo(
      () => {
        const grouped =
          new Map<
            string,
            AuditQuestion[]
          >();

        questions.forEach(
          item => {
            const normalized =
              normalizeQuestionText(
                item.question ||
                ''
              );

            if (!normalized) {
              return;
            }

            const existing =
              grouped.get(
                normalized
              ) || [];

            existing.push(
              item
            );

            grouped.set(
              normalized,
              existing
            );
          }
        );

        return Array
          .from(
            grouped.entries()
          )
          .filter(
            (
              [
                ,
                items
              ]
            ) =>
              items.length > 1
          )
          .map(
            (
              [
                normalized,
                items
              ]
            ):
              DuplicateGroup => ({
              normalized,

              questions:
                items
            })
          )
          .sort(
            (
              a,
              b
            ) =>
              b.questions.length -
              a.questions.length
          );
      },
      [
        questions
      ]
    );


  const filteredGroups =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();

        return duplicateGroups
          .map(
            group => ({
              ...group,

              questions:
                group.questions.filter(
                  item =>
                    showArchived ||
                    item.status !==
                      'archived'
                )
            })
          )
          .filter(
            group =>
              group.questions.length >
              1
          )
          .filter(
            group => {
              if (!query) {
                return true;
              }

              return group.questions.some(
                item =>
                  [
                    item.question,
                    item.subject || '',
                    item.topic || '',
                    item.paper || '',
                    item.source || '',
                    item.pyq_year || ''
                  ]
                    .join(' ')
                    .toLowerCase()
                    .includes(query)
              );
            }
          );
      },
      [
        duplicateGroups,
        search,
        showArchived
      ]
    );


  const extraDuplicateRows =
    filteredGroups.reduce(
      (
        total,
        group
      ) =>
        total +
        Math.max(
          0,
          group.questions.length -
          1
        ),
      0
    );


  const pyqDuplicateRows =
    filteredGroups.reduce(
      (
        total,
        group
      ) =>
        total +
        group.questions.filter(
          item =>
            item.is_pyq
        ).length,
      0
    );


  /* =======================================================
     UI
     ======================================================= */

  return (
    <section
      className="panel"
      style={{
        padding:
          '16px'
      }}
    >
      <div
        style={{
          display:
            'flex',

          justifyContent:
            'space-between',

          alignItems:
            'flex-start',

          gap:
            '12px',

          flexWrap:
            'wrap'
        }}
      >
        <div>
          <span
            className="eyebrow"
          >
            DUPLICATE AUDIT
          </span>

          <h2
            style={{
              margin:
                '5px 0'
            }}
          >
            Existing Prelims Duplicates
          </h2>

          <small
            style={{
              color:
                '#94a3b8'
            }}
          >
            Read-only audit of duplicate questions already stored before duplicate protection was enabled.
          </small>
        </div>

        <button
          type="button"
          className="secondary-btn"
          disabled={
            loading
          }
          onClick={() =>
            void loadQuestions()
          }
        >
          {
            loading
              ? 'Scanning...'
              : 'Refresh Audit'
          }
        </button>
      </div>


      <div
        style={{
          display:
            'grid',

          gridTemplateColumns:
            'repeat(auto-fit, minmax(150px, 1fr))',

          gap:
            '8px',

          marginTop:
            '14px'
        }}
      >
        <div
          className="callout"
        >
          <small>
            Questions Scanned
          </small>

          <strong
            style={{
              display:
                'block'
            }}
          >
            {
              questions.length
            }
          </strong>
        </div>


        <div
          className="callout"
        >
          <small>
            Duplicate Groups
          </small>

          <strong
            style={{
              display:
                'block'
            }}
          >
            {
              filteredGroups.length
            }
          </strong>
        </div>


        <div
          className="callout"
        >
          <small>
            Extra Rows
          </small>

          <strong
            style={{
              display:
                'block'
            }}
          >
            {
              extraDuplicateRows
            }
          </strong>
        </div>


        <div
          className="callout"
        >
          <small>
            PYQ Rows in Groups
          </small>

          <strong
            style={{
              display:
                'block'
            }}
          >
            {
              pyqDuplicateRows
            }
          </strong>
        </div>
      </div>


      <div
        style={{
          display:
            'grid',

          gridTemplateColumns:
            'minmax(0, 1fr) auto',

          gap:
            '10px',

          alignItems:
            'end',

          marginTop:
            '14px'
        }}
      >
        <label>
          Search duplicates

          <input
            type="search"
            value={
              search
            }
            onChange={
              event =>
                setSearch(
                  event.target.value
                )
            }
            placeholder="Question, subject, topic, year..."
          />
        </label>


        <label
          style={{
            display:
              'flex',

            alignItems:
              'center',

            gap:
              '7px',

            paddingBottom:
              '10px'
          }}
        >
          <input
            type="checkbox"
            checked={
              showArchived
            }
            onChange={
              event =>
                setShowArchived(
                  event.target.checked
                )
            }
          />

          Show archived
        </label>
      </div>


      {
        message && (
          <div
            className="callout"
            style={{
              marginTop:
                '10px'
            }}
          >
            {message}
          </div>
        )
      }


      {
        loading && (
          <div
            className="callout"
            style={{
              marginTop:
                '14px'
            }}
          >
            Scanning existing Prelims questions...
          </div>
        )
      }


      {
        !loading &&
        filteredGroups.length ===
          0 && (
          <div
            className="callout"
            style={{
              marginTop:
                '14px'
            }}
          >
            <strong>
              No active duplicate groups found.
            </strong>

            <p
              style={{
                marginBottom:
                  0
              }}
            >
              New duplicate protection will continue blocking repeated questions during Add/Edit and Quick PYQ Import.
            </p>
          </div>
        )
      }


      <div
        style={{
          display:
            'grid',

          gap:
            '14px',

          marginTop:
            '14px'
        }}
      >
        {
          filteredGroups.map(
            (
              group,
              groupIndex
            ) => (
              <article
                key={
                  group.normalized
                }
                style={{
                  padding:
                    '14px',

                  border:
                    '1px solid rgba(255,255,255,.10)',

                  borderRadius:
                    '14px'
                }}
              >
                <div
                  style={{
                    display:
                      'flex',

                    justifyContent:
                      'space-between',

                    alignItems:
                      'center',

                    gap:
                      '8px',

                    flexWrap:
                      'wrap',

                    marginBottom:
                      '10px'
                  }}
                >
                  <strong>
                    Duplicate Group {
                      groupIndex + 1
                    }
                  </strong>

                  <span
                    className="tag"
                  >
                    {
                      group.questions.length
                    } copies
                  </span>
                </div>


                <div
                  style={{
                    display:
                      'grid',

                    gap:
                      '8px'
                  }}
                >
                  {
                    group.questions.map(
                      (
                        item,
                        itemIndex
                      ) => (
                        <div
                          key={
                            item.id
                          }
                          style={{
                            padding:
                              '11px',

                            border:
                              itemIndex === 0
                                ? '1px solid rgba(45,212,191,.30)'
                                : '1px solid rgba(251,191,36,.22)',

                            borderRadius:
                              '11px'
                          }}
                        >
                          <div
                            style={{
                              display:
                                'flex',

                              gap:
                                '6px',

                              flexWrap:
                                'wrap',

                              marginBottom:
                                '7px'
                            }}
                          >
                            <span
                              className="tag"
                            >
                              {
                                itemIndex === 0
                                  ? 'Oldest Copy'
                                  : `Copy ${itemIndex + 1}`
                              }
                            </span>

                            <span
                              className="tag"
                            >
                              {
                                item.status
                              }
                            </span>

                            {
                              item.is_pyq && (
                                <span
                                  className="tag"
                                >
                                  PYQ {
                                    item.pyq_year ||
                                    ''
                                  }
                                </span>
                              )
                            }

                            {
                              item.subject && (
                                <span
                                  className="tag"
                                >
                                  {
                                    item.subject
                                  }
                                </span>
                              )
                            }
                          </div>


                          <strong
                            style={{
                              display:
                                'block',

                              lineHeight:
                                1.45
                            }}
                          >
                            {
                              item.question
                            }
                          </strong>


                          <small
                            style={{
                              display:
                                'block',

                              marginTop:
                                '7px',

                              color:
                                '#94a3b8'
                            }}
                          >
                            ID: {
                              shortId(
                                item.id
                              )
                            }

                            {
                              item.topic
                                ? ` • ${item.topic}`
                                : ''
                            }

                            {
                              item.paper
                                ? ` • ${item.paper}`
                                : ''
                            }

                            {
                              item.source
                                ? ` • ${item.source}`
                                : ''
                            }

                            {
                              item.created_at
                                ? ` • ${formatDate(
                                    item.created_at
                                  )}`
                                : ''
                            }
                          </small>
                        </div>
                      )
                    )
                  }
                </div>
              </article>
            )
          )
        }
      </div>


      {
        filteredGroups.length >
        0 && (
          <div
            className="callout"
            style={{
              marginTop:
                '14px'
            }}
          >
            <strong>
              No records are changed from this screen.
            </strong>

            <p
              style={{
                marginBottom:
                  0
              }}
            >
              The next cleanup step will preserve the correct master question and its PYQ appearances before archiving extra duplicate rows.
            </p>
          </div>
        )
      }
    </section>
  );
}


export default PrelimsDuplicateAudit;

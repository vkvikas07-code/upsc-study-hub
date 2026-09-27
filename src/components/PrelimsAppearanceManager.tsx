import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

type Origin = 'cse' | 'upsc' | 'state';

type QuestionRow = {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  subject: string;
  topic: string | null;
  paper: string | null;
  pyq_year: number | null;
  source: string | null;
};

type Appearance = {
  id: string;
  question_number: string | null;
  commission: string | null;
  state: string | null;
  exam_name: string | null;
  exam_cycle: string | null;
  exam_year: number | null;
  paper: string | null;
};

const QUESTION_SELECT = `
  id,
  question,
  options,
  correct_index,
  subject,
  topic,
  paper,
  pyq_year,
  source
`;

function toStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function appearanceLabel(item: Appearance): string {
  return [
    item.commission || 'Exam',
    item.state,
    item.exam_name,
    item.exam_cycle,
    item.exam_year == null ? null : String(item.exam_year),
    item.paper,
    item.question_number ? `Q${item.question_number}` : null
  ]
    .filter(Boolean)
    .join(' • ');
}

export function PrelimsAppearanceManager() {
  const db = supabase as any;

  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [appearanceMap, setAppearanceMap] =
    useState<Record<string, Appearance[]>>({});

  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  const [origin, setOrigin] = useState<Origin>('cse');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [paper, setPaper] = useState('GS Paper I');
  const [questionNumber, setQuestionNumber] = useState('');
  const [source, setSource] = useState('UPSC Official Paper');
  const [sourceUrl, setSourceUrl] = useState('');

  const [upscExamName, setUpscExamName] = useState('');
  const [upscExamCycle, setUpscExamCycle] = useState('');

  const [stateName, setStateName] = useState('Maharashtra');
  const [pscName, setPscName] = useState('MPSC');
  const [stateExamName, setStateExamName] =
    useState('State Services Examination');
  const [stateCycle, setStateCycle] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [
  editingAppearanceId,
  setEditingAppearanceId
] = useState<string | null>(null);

const [
  editQuestionNumber,
  setEditQuestionNumber
] = useState('');

const [
  busyAppearanceId,
  setBusyAppearanceId
] = useState<string | null>(null);

  async function loadData(): Promise<void> {
    setLoading(true);

    const { data: questionData, error: questionError } = await db
  .from('questions')
  .select(QUESTION_SELECT)
  .or(
    'is_pyq.eq.true,pyq_year.not.is.null,upsc_exam_year.not.is.null,state_psc_year.not.is.null,exam_stage.ilike.prelim%'
  )
  .order(
    'pyq_year',
    {
      ascending: false,
      nullsFirst: false
    }
  )
  .order(
    'created_at',
    {
      ascending: false
    }
  )
  .limit(500);

    if (questionError) {
      setQuestions([]);
      setAppearanceMap({});
      setMessage(questionError.message);
      setLoading(false);
      return;
    }

    const rows: QuestionRow[] = (questionData || []).map(
      (row: Record<string, any>) => ({
        ...row,
        options: toStrings(row.options)
      })
    );

    setQuestions(rows);

    if (!rows.length) {
      setAppearanceMap({});
      setLoading(false);
      return;
    }

    const { data: appearanceData, error: appearanceError } = await db
      .from('question_appearances')
      .select(`
        id,
        question_id,
        question_number,
        exam_papers (
          commission,
          state,
          exam_name,
          exam_cycle,
          exam_year,
          paper
        )
      `)
      .in(
        'question_id',
        rows.map(item => item.id)
      );

    if (appearanceError) {
      setAppearanceMap({});
      setMessage(
        `Questions loaded, but appearances could not be loaded: ${appearanceError.message}`
      );
      setLoading(false);
      return;
    }

    const grouped: Record<string, Appearance[]> = {};

    for (const raw of appearanceData || []) {
      const row = raw as Record<string, any>;

      const examRaw = Array.isArray(row.exam_papers)
        ? row.exam_papers[0]
        : row.exam_papers;

      const exam = (examRaw || {}) as Record<string, any>;

      const questionId = String(row.question_id || '');

      if (!questionId) {
        continue;
      }

      const appearance: Appearance = {
        id: String(row.id || ''),

        question_number:
          row.question_number
            ? String(row.question_number)
            : null,

        commission:
          exam.commission
            ? String(exam.commission)
            : null,

        state:
          exam.state
            ? String(exam.state)
            : null,

        exam_name:
          exam.exam_name
            ? String(exam.exam_name)
            : null,

        exam_cycle:
          exam.exam_cycle
            ? String(exam.exam_cycle)
            : null,

        exam_year:
          exam.exam_year == null
            ? null
            : Number(exam.exam_year),

        paper:
          exam.paper
            ? String(exam.paper)
            : null
      };

      if (!grouped[questionId]) {
        grouped[questionId] = [];
      }

      grouped[questionId].push(appearance);
    }

    Object.values(grouped).forEach(list => {
      list.sort(
        (a, b) =>
          (b.exam_year || 0) -
          (a.exam_year || 0)
      );
    });

    setAppearanceMap(grouped);
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, []);

  const visibleQuestions = useMemo(() => {
    const query =
      search
        .trim()
        .toLowerCase();

    if (!query) {
      return questions;
    }

    return questions.filter(item =>
      [
        item.question,
        item.subject,
        item.topic || '',
        item.paper || '',
        item.pyq_year || ''
      ]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [
    questions,
    search
  ]);

  function openAddAppearance(
    item: QuestionRow
  ): void {
    setAddingId(item.id);
    setExpandedId(item.id);

    setOrigin('cse');

    setYear(
      String(
        new Date()
          .getFullYear()
      )
    );

    setPaper(
      item.paper ||
      'GS Paper I'
    );

    setQuestionNumber('');

    setSource(
      item.source ||
      'UPSC Official Paper'
    );

    setSourceUrl('');

    setUpscExamName('');
    setUpscExamCycle('');

    setStateName('Maharashtra');
    setPscName('MPSC');

    setStateExamName(
      'State Services Examination'
    );

    setStateCycle('');

    setMessage('');
  }

  function buildMetadata() {
    if (
      origin ===
      'cse'
    ) {
      return {
        pyq_year:
          year.trim(),

        exam_stage:
          'prelims',

        paper:
          paper.trim() ||
          'GS Paper I',

        question_number:
          questionNumber.trim() ||
          null,

        source:
          source.trim() ||
          null,

        source_url:
          sourceUrl.trim() ||
          null,

        status:
          'published'
      };
    }

    if (
      origin ===
      'upsc'
    ) {
      return {
        upsc_exam_name:
          upscExamName.trim(),

        upsc_exam_cycle:
          upscExamCycle.trim() ||
          null,

        upsc_exam_year:
          year.trim(),

        upsc_exam_stage:
          'prelims',

        upsc_exam_paper:
          paper.trim(),

        question_number:
          questionNumber.trim() ||
          null,

        source:
          source.trim() ||
          'UPSC',

        source_url:
          sourceUrl.trim() ||
          null,

        status:
          'published'
      };
    }

    return {
      state_psc_state:
        stateName.trim(),

      state_psc_name:
        pscName.trim(),

      state_psc_exam_name:
        stateExamName.trim(),

      state_psc_cycle:
        stateCycle.trim() ||
        null,

      state_psc_year:
        year.trim(),

      state_psc_stage:
        'Preliminary',

      state_psc_paper:
        paper.trim(),

      question_number:
        questionNumber.trim() ||
        null,

      source:
        source.trim() ||
        pscName.trim() ||
        'State PSC',

      source_url:
        sourceUrl.trim() ||
        null,

      status:
        'published'
    };
  }

  async function saveAppearance(
    item: QuestionRow
  ): Promise<void> {
    if (
      !/^\d{4}$/.test(
        year.trim()
      )
    ) {
      setMessage(
        'Enter a valid four-digit examination year.'
      );

      return;
    }

    if (
      !paper.trim()
    ) {
      setMessage(
        'Enter the paper name.'
      );

      return;
    }

    if (
      origin ===
        'upsc' &&
      !upscExamName.trim()
    ) {
      setMessage(
        'Enter the UPSC examination name.'
      );

      return;
    }

    if (
      origin ===
        'state' &&
      (
        !stateName.trim() ||
        !pscName.trim() ||
        !stateExamName.trim()
      )
    ) {
      setMessage(
        'Enter State, PSC and examination name.'
      );

      return;
    }

    setSaving(true);

    const {
      data,
      error
    } =
      await db.rpc(
        'link_existing_prelims_question',
        {
          p_question_id:
            item.id,

          p_origin:
            origin,

          p_metadata:
            buildMetadata(),

          p_original_question:
            item.question,

          p_original_options:
            item.options,

          p_original_correct_index:
            item.correct_index
        }
      );

    setSaving(false);

    if (error) {
      setMessage(
        error.message
      );

      return;
    }

    const result =
      Array.isArray(data)
        ? data[0]
        : data;

    const linkStatus =
      result &&
      typeof result ===
        'object' &&
      result.link_status
        ? String(
            result.link_status
          )
        : 'linked';

    setMessage(
      linkStatus ===
        'already_linked'
        ? 'This appearance is already linked.'
        : 'New Prelims appearance linked successfully.'
    );

    setAddingId(null);

    await loadData();
  }
function startEditAppearance(
  appearance: Appearance
): void {
  setEditingAppearanceId(
    appearance.id
  );

  setEditQuestionNumber(
    appearance.question_number || ''
  );
}

async function saveAppearanceEdit(
  appearance: Appearance
): Promise<void> {
  setBusyAppearanceId(
    appearance.id
  );

  const {
    error
  } =
    await db
      .from('question_appearances')
      .update({
        question_number:
          editQuestionNumber.trim() ||
          null
      })
      .eq(
        'id',
        appearance.id
      );

  setBusyAppearanceId(null);

  if (error) {
    setMessage(
      error.message
    );
    return;
  }

  setEditingAppearanceId(null);
  setEditQuestionNumber('');

  setMessage(
    'Appearance updated successfully.'
  );

  await loadData();
}

async function removeAppearance(
  appearance: Appearance,
  totalAppearances: number
): Promise<void> {
  if (
    totalAppearances <= 1
  ) {
    setMessage(
      'The last appearance cannot be removed. Add another appearance first.'
    );
    return;
  }

  const confirmed =
    window.confirm(
      'Remove only this appearance? The master Prelims question will remain.'
    );

  if (!confirmed) {
    return;
  }

  setBusyAppearanceId(
    appearance.id
  );

  const {
  error
} =
  await db.rpc(
    'delete_prelims_question_appearance',
    {
      p_appearance_id:
        appearance.id
    }
  );
  
  setBusyAppearanceId(null);

  if (error) {
    setMessage(
      error.message
    );
    return;
  }

  setEditingAppearanceId(null);

  setMessage(
    'Appearance removed. Master Prelims question kept.'
  );

  await loadData();
} 
  return (
    <section
      className="panel"
      style={{
        padding: '16px'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '12px',
          flexWrap: 'wrap'
        }}
      >
        <div>
          <span className="eyebrow">
            PRELIMS PYQ APPEARANCES
          </span>

          <h2
            style={{
              margin: '5px 0'
            }}
          >
            Repeated Question Manager
          </h2>

          <small
            style={{
              color: '#94a3b8'
            }}
          >
            Keep one master MCQ and link every year, paper or commission where it appeared.
          </small>
        </div>

        <button
          type="button"
          className="secondary-btn"
          disabled={
            loading
          }
          onClick={() =>
            void loadData()
          }
        >
          Refresh
        </button>
      </div>

      {message && (
        <div
          className="callout"
          style={{
            marginTop: '10px'
          }}
        >
          {message}
        </div>
      )}

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
        placeholder="Search PYQ question, subject, topic or year..."
        style={{
          width: '100%',
          boxSizing: 'border-box',
          marginTop: '12px'
        }}
      />

      {loading ? (
        <p>
          Loading Prelims PYQs...
        </p>
      ) : (
        <div
          style={{
            display: 'grid',
            gap: '10px',
            marginTop: '12px'
          }}
        >
          {visibleQuestions.map(
            item => {
              const appearances =
                appearanceMap[
                  item.id
                ] || [];

              const expanded =
                expandedId ===
                item.id;

              const adding =
                addingId ===
                item.id;

              return (
                <article
                  key={
                    item.id
                  }
                  style={{
                    padding: '12px',
                    border:
                      '1px solid rgba(255,255,255,.08)',
                    borderRadius:
                      '12px'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      gap: '10px',
                      flexWrap: 'wrap'
                    }}
                  >
                    <strong>
                      {item.pyq_year ||
                        'PYQ'}
                      {' • '}
                      {item.paper ||
                        'Prelims'}
                    </strong>

                    <span className="tag">
                      {appearances.length}
                      {' '}
                      appearance
                      {appearances.length ===
                        1
                        ? ''
                        : 's'}
                    </span>
                  </div>

                  <p
                    style={{
                      marginBottom: '6px'
                    }}
                  >
                    {item.question}
                  </p>

                  <small
                    style={{
                      color: '#94a3b8'
                    }}
                  >
                    {item.subject}

                    {item.topic
                      ? ` • ${item.topic}`
                      : ''}

                    {' • '}

                    Answer
                    {' '}
                    {String.fromCharCode(
                      65 +
                      item.correct_index
                    )}
                  </small>

                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      flexWrap: 'wrap',
                      marginTop: '10px'
                    }}
                  >
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() =>
                        setExpandedId(
                          expanded
                            ? null
                            : item.id
                        )
                      }
                    >
                      {expanded
                        ? 'Hide Appearances'
                        : 'View Appearances'}
                    </button>

                    <button
                      type="button"
                      className="primary-btn"
                      onClick={() =>
                        openAddAppearance(
                          item
                        )
                      }
                    >
                      + Add Another Appearance
                    </button>
                  </div>

                  {expanded && (
                    <div
                      style={{
                        display: 'grid',
                        gap: '7px',
                        marginTop: '10px',
                        padding: '10px',
                        border:
                          '1px solid rgba(255,255,255,.06)',
                        borderRadius:
                          '10px'
                      }}
                    >
                      {appearances.length ? (
  appearances.map(
    appearance => {
      const editing =
        editingAppearanceId ===
        appearance.id;

      const busy =
        busyAppearanceId ===
        appearance.id;

      return (
        <div
          key={appearance.id}
          style={{
            display: 'grid',
            gap: '8px',
            padding: '8px',
            border:
              '1px solid rgba(255,255,255,.06)',
            borderRadius: '8px'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap'
            }}
          >
            <small
              style={{
                color: '#cbd5e1'
              }}
            >
              {appearanceLabel(
                appearance
              )}
            </small>

            <div
              style={{
                display: 'flex',
                gap: '6px',
                flexWrap: 'wrap'
              }}
            >
              <button
                type="button"
                className="secondary-btn"
                disabled={busy}
                onClick={() =>
                  startEditAppearance(
                    appearance
                  )
                }
              >
                Edit Q No.
              </button>

              <button
                type="button"
                className="secondary-btn"
                disabled={
                  busy ||
                  appearances.length <= 1
                }
                onClick={() =>
                  void removeAppearance(
                    appearance,
                    appearances.length
                  )
                }
              >
                {busy
                  ? 'Working...'
                  : 'Remove'}
              </button>
            </div>
          </div>

          {editing && (
            <div
              style={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
                alignItems: 'end'
              }}
            >
              <label>
                Question No.

                <input
                  value={
                    editQuestionNumber
                  }
                  onChange={
                    event =>
                      setEditQuestionNumber(
                        event.target.value
                      )
                  }
                />
              </label>

              <button
                type="button"
                className="primary-btn"
                disabled={busy}
                onClick={() =>
                  void saveAppearanceEdit(
                    appearance
                  )
                }
              >
                Save
              </button>

              <button
                type="button"
                className="secondary-btn"
                disabled={busy}
                onClick={() => {
                  setEditingAppearanceId(
                    null
                  );

                  setEditQuestionNumber(
                    ''
                  );
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      );
    }
  )
) : (
                        <small
                          style={{
                            color:
                              '#94a3b8'
                          }}
                        >
                          No canonical appearance linked yet.
                        </small>
                      )}
                    </div>
                  )}

                  {adding && (
                    <div
                      style={{
                        display: 'grid',
                        gap: '10px',
                        marginTop: '10px',
                        padding: '12px',
                        border:
                          '1px solid rgba(20,184,166,.35)',
                        borderRadius:
                          '12px'
                      }}
                    >
                      <strong>
                        Add New Appearance
                      </strong>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns:
                            'repeat(auto-fit, minmax(150px, 1fr))',
                          gap: '8px'
                        }}
                      >
                        <label>
                          Exam Source

                          <select
                            value={
                              origin
                            }
                            onChange={
                              event => {
                                const next =
                                  event.target
                                    .value as
                                    Origin;

                                setOrigin(
                                  next
                                );

                                if (
                                  next ===
                                  'cse'
                                ) {
                                  setPaper(
                                    'GS Paper I'
                                  );

                                  setSource(
                                    'UPSC Official Paper'
                                  );
                                }
                              }
                            }
                          >
                            <option
                              value="cse"
                            >
                              UPSC CSE
                            </option>

                            <option
                              value="upsc"
                            >
                              Other UPSC
                            </option>

                            <option
                              value="state"
                            >
                              State PSC
                            </option>
                          </select>
                        </label>

                        <label>
                          Year

                          <input
                            type="number"
                            min="1950"
                            max="2100"
                            value={
                              year
                            }
                            onChange={
                              event =>
                                setYear(
                                  event.target
                                    .value
                                )
                            }
                          />
                        </label>

                        <label>
                          Paper

                          {origin ===
                            'cse' ? (
                            <select
                              value={
                                paper
                              }
                              onChange={
                                event =>
                                  setPaper(
                                    event.target
                                      .value
                                  )
                              }
                            >
                              <option
                                value="GS Paper I"
                              >
                                GS Paper I
                              </option>

                              <option
                                value="CSAT Paper II"
                              >
                                CSAT Paper II
                              </option>
                            </select>
                          ) : (
                            <input
                              value={
                                paper
                              }
                              onChange={
                                event =>
                                  setPaper(
                                    event.target
                                      .value
                                  )
                              }
                              placeholder="Paper name"
                            />
                          )}
                        </label>

                        <label>
                          Question No.

                          <input
                            value={
                              questionNumber
                            }
                            onChange={
                              event =>
                                setQuestionNumber(
                                  event.target
                                    .value
                                )
                            }
                            placeholder="12"
                          />
                        </label>
                      </div>

                      {origin ===
                        'upsc' && (
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns:
                              'repeat(auto-fit, minmax(170px, 1fr))',
                            gap: '8px'
                          }}
                        >
                          <label>
                            UPSC Exam Name

                            <input
                              value={
                                upscExamName
                              }
                              onChange={
                                event =>
                                  setUpscExamName(
                                    event.target
                                      .value
                                  )
                              }
                              placeholder="CAPF / CDS / NDA"
                            />
                          </label>

                          <label>
                            Cycle

                            <input
                              value={
                                upscExamCycle
                              }
                              onChange={
                                event =>
                                  setUpscExamCycle(
                                    event.target
                                      .value
                                  )
                              }
                            />
                          </label>
                        </div>
                      )}

                      {origin ===
                        'state' && (
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns:
                              'repeat(auto-fit, minmax(160px, 1fr))',
                            gap: '8px'
                          }}
                        >
                          <label>
                            State

                            <input
                              value={
                                stateName
                              }
                              onChange={
                                event =>
                                  setStateName(
                                    event.target
                                      .value
                                  )
                              }
                            />
                          </label>

                          <label>
                            PSC

                            <input
                              value={
                                pscName
                              }
                              onChange={
                                event =>
                                  setPscName(
                                    event.target
                                      .value
                                  )
                              }
                            />
                          </label>

                          <label>
                            Exam Name

                            <input
                              value={
                                stateExamName
                              }
                              onChange={
                                event =>
                                  setStateExamName(
                                    event.target
                                      .value
                                  )
                              }
                            />
                          </label>

                          <label>
                            Cycle

                            <input
                              value={
                                stateCycle
                              }
                              onChange={
                                event =>
                                  setStateCycle(
                                    event.target
                                      .value
                                  )
                              }
                            />
                          </label>
                        </div>
                      )}

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns:
                            'repeat(auto-fit, minmax(180px, 1fr))',
                          gap: '8px'
                        }}
                      >
                        <label>
                          Source

                          <input
                            value={
                              source
                            }
                            onChange={
                              event =>
                                setSource(
                                  event.target
                                    .value
                                )
                            }
                          />
                        </label>

                        <label>
                          Source URL

                          <input
                            type="url"
                            value={
                              sourceUrl
                            }
                            onChange={
                              event =>
                                setSourceUrl(
                                  event.target
                                    .value
                                )
                            }
                          />
                        </label>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          gap: '8px',
                          flexWrap: 'wrap'
                        }}
                      >
                        <button
                          type="button"
                          className="primary-btn"
                          disabled={
                            saving
                          }
                          onClick={() =>
                            void saveAppearance(
                              item
                            )
                          }
                        >
                          {saving
                            ? 'Linking...'
                            : 'Link Appearance'}
                        </button>

                        <button
                          type="button"
                          className="secondary-btn"
                          disabled={
                            saving
                          }
                          onClick={() =>
                            setAddingId(
                              null
                            )
                          }
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            }
          )}

          {!visibleQuestions.length && (
            <div className="callout">
              No Prelims PYQs found.
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default PrelimsAppearanceManager;

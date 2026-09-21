import {
  useMemo,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


type ImportOrigin =
  | 'cse'
  | 'upsc'
  | 'state';


type PublishStatus =
  | 'draft'
  | 'published';


type QuestionPayload = {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  subject: string;
  topic: string;
  difficulty:
    | 'easy'
    | 'medium'
    | 'hard';
  tags: string[];
  question_number: string;
};


type ImportResult = {
  total_questions?: number;
  created_new?: number;
  linked_existing?: number;
  already_linked?: number;
  needs_review?: number;
  exam_paper_id?: string;
};


function isRecord(
  value: unknown
): value is Record<string, unknown> {

  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}


function safeString(
  value: unknown
): string {

  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  return String(value);
}


function currentYear():
  string {

  return String(
    new Date()
      .getFullYear()
  );
}


function parseQuestionData(
  rawText: string
): QuestionPayload[] {

  const clean =
    rawText.trim();


  if (!clean) {

    throw new Error(
      'Paste the question paper JSON first.'
    );
  }


  let parsed:
    unknown;


  try {

    parsed =
      JSON.parse(
        clean
      );

  } catch {

    throw new Error(
      'Invalid JSON. Check commas, brackets and quotation marks.'
    );
  }


  let items:
    unknown[];


  if (
    Array.isArray(
      parsed
    )
  ) {

    items =
      parsed;

  } else if (
    isRecord(
      parsed
    ) &&
    Array.isArray(
      parsed.questions
    )
  ) {

    items =
      parsed.questions;

  } else {

    throw new Error(
      'Use a JSON array or an object containing a questions array.'
    );
  }


  if (
    items.length ===
    0
  ) {

    throw new Error(
      'No questions found.'
    );
  }


  if (
    items.length >
    250
  ) {

    throw new Error(
      'Maximum 250 questions can be imported at one time.'
    );
  }


  return items.map(
    (
      item,
      index
    ) => {

      if (
        !isRecord(
          item
        )
      ) {

        throw new Error(
          `Question ${index + 1} is not a valid object.`
        );
      }


      const question =
        safeString(
          item.question
        ).trim();


      if (
        !question
      ) {

        throw new Error(
          `Question ${index + 1} has no question text.`
        );
      }


      if (
        !Array.isArray(
          item.options
        )
      ) {

        throw new Error(
          `Question ${index + 1} must contain an options array.`
        );
      }


      const options =
        item.options
          .map(
            option =>
              safeString(
                option
              ).trim()
          )
          .filter(
            Boolean
          );


      if (
        options.length <
        2
      ) {

        throw new Error(
          `Question ${index + 1} must contain at least two options.`
        );
      }


      const correctIndex =
        Number(
          item.correct_index
        );


      if (
        !Number.isInteger(
          correctIndex
        ) ||
        correctIndex <
          0 ||
        correctIndex >=
          options.length
      ) {

        throw new Error(
          `Question ${index + 1} has an invalid correct_index.`
        );
      }


      const rawDifficulty =
        safeString(
          item.difficulty
        )
          .trim()
          .toLowerCase();


      const difficulty:
        'easy' |
        'medium' |
        'hard' =
        rawDifficulty ===
          'easy' ||
        rawDifficulty ===
          'hard'
          ? rawDifficulty
          : 'medium';


      const tags =
        Array.isArray(
          item.tags
        )
          ? item.tags
              .map(
                tag =>
                  safeString(
                    tag
                  ).trim()
              )
              .filter(
                Boolean
              )
          : [];


      return {

        question,

        options,

        correct_index:
          correctIndex,

        explanation:
          safeString(
            item.explanation
          ),

        subject:
          safeString(
            item.subject
          ).trim() ||
          'General Studies',

        topic:
          safeString(
            item.topic
          ).trim(),

        difficulty,

        tags,

        question_number:
          safeString(
            item.question_number
          ).trim() ||
          String(
            index + 1
          )

      };

    }
  );
}


export function PrelimsPyqQuickImport() {

  /* =======================================================
     BASIC PAPER DATA
  ======================================================= */

  const [
    origin,
    setOrigin
  ] =
    useState<ImportOrigin>(
      'cse'
    );


  const [
    year,
    setYear
  ] =
    useState(
      currentYear()
    );


  const [
    paper,
    setPaper
  ] =
    useState(
      'GS Paper I'
    );


  const [
    status,
    setStatus
  ] =
    useState<PublishStatus>(
      'published'
    );


  const [
    source,
    setSource
  ] =
    useState(
      'UPSC Official Paper'
    );


  /* =======================================================
     ADVANCED DATA
  ======================================================= */

  const [
    advancedOpen,
    setAdvancedOpen
  ] =
    useState(
      false
    );


  const [
    sourceUrl,
    setSourceUrl
  ] =
    useState(
      ''
    );


  const [
    paperCode,
    setPaperCode
  ] =
    useState(
      ''
    );


  const [
    examCycle,
    setExamCycle
  ] =
    useState(
      ''
    );


  /* OTHER UPSC */

  const [
    upscExamName,
    setUpscExamName
  ] =
    useState(
      ''
    );


  const [
    upscExamStage,
    setUpscExamStage
  ] =
    useState(
      'Preliminary'
    );


  /* STATE PSC */

  const [
    stateName,
    setStateName
  ] =
    useState(
      ''
    );


  const [
    statePscName,
    setStatePscName
  ] =
    useState(
      ''
    );


  const [
    stateExamName,
    setStateExamName
  ] =
    useState(
      ''
    );


  const [
    stateExamStage,
    setStateExamStage
  ] =
    useState(
      'Preliminary'
    );


  /* =======================================================
     QUESTION DATA
  ======================================================= */

  const [
    rawText,
    setRawText
  ] =
    useState(
      ''
    );


  const [
    validatedQuestions,
    setValidatedQuestions
  ] =
    useState<QuestionPayload[]>(
      []
    );


  const [
    validationMessage,
    setValidationMessage
  ] =
    useState(
      ''
    );


  const [
    importing,
    setImporting
  ] =
    useState(
      false
    );


  const [
    result,
    setResult
  ] =
    useState<ImportResult | null>(
      null
    );


  /* =======================================================
     DETECT QUESTION COUNT
  ======================================================= */

  const detectedCount =
    useMemo(
      () => {

        if (
          !rawText.trim()
        ) {
          return 0;
        }


        try {

          return parseQuestionData(
            rawText
          ).length;

        } catch {

          return 0;
        }

      },
      [
        rawText
      ]
    );


  /* =======================================================
     ORIGIN LABEL
  ======================================================= */

  const originLabel =
    origin ===
      'cse'
      ? 'UPSC Civil Services'
      : origin ===
          'upsc'
        ? 'Other UPSC Exam'
        : 'State PSC';


  /* =======================================================
     VALIDATE
  ======================================================= */

  function validate():
    QuestionPayload[] |
    null {

    setResult(
      null
    );


    try {

      const questions =
        parseQuestionData(
          rawText
        );


      setValidatedQuestions(
        questions
      );


      setValidationMessage(
        `✓ ${questions.length} questions validated and ready to import.`
      );


      return questions;

    } catch (
      error
    ) {

      setValidatedQuestions(
        []
      );


      setValidationMessage(
        error instanceof Error
          ? error.message
          : 'Unable to validate question data.'
      );


      return null;
    }
  }


  /* =======================================================
     METADATA
  ======================================================= */

  function buildMetadata(
    questionCount: number
  ):
    Record<string, unknown> {

    const base = {

      source:
        source.trim(),

      source_url:
        sourceUrl.trim(),

      status,

      paper_code:
        paperCode.trim(),

      declared_total_questions:
        questionCount

    };


    if (
      origin ===
      'cse'
    ) {

      return {

        ...base,

        pyq_year:
          year.trim(),

        exam_stage:
          'prelims',

        paper:
          paper.trim() ||
          'GS Paper I',

        exam_cycle:
          examCycle.trim()

      };
    }


    if (
      origin ===
      'upsc'
    ) {

      return {

        ...base,

        upsc_exam_name:
          upscExamName.trim(),

        upsc_exam_cycle:
          examCycle.trim(),

        upsc_exam_year:
          year.trim(),

        upsc_exam_stage:
          upscExamStage.trim() ||
          'Preliminary',

        upsc_exam_paper:
          paper.trim()

      };
    }


    return {

      ...base,

      state_psc_state:
        stateName.trim(),

      state_psc_name:
        statePscName.trim(),

      state_psc_exam_name:
        stateExamName.trim(),

      state_psc_cycle:
        examCycle.trim(),

      state_psc_year:
        year.trim(),

      state_psc_stage:
        stateExamStage.trim() ||
        'Preliminary',

      state_psc_paper:
        paper.trim()

    };
  }


  /* =======================================================
     PAPER VALIDATION
  ======================================================= */

  function validatePaper():
    string |
    null {

    const numericYear =
      Number(
        year
      );


    if (
      !Number.isInteger(
        numericYear
      ) ||
      numericYear <
        1950 ||
      numericYear >
        2100
    ) {

      return 'Enter a valid examination year.';
    }


    if (
      !paper.trim()
    ) {

      return 'Enter the paper name.';
    }


    if (
      origin ===
        'upsc' &&
      !upscExamName.trim()
    ) {

      return 'Enter the UPSC examination name.';
    }


    if (
      origin ===
        'state' &&
      (
        !stateName.trim() ||
        !statePscName.trim() ||
        !stateExamName.trim()
      )
    ) {

      return 'Enter State, PSC name and examination name.';
    }


    return null;
  }


  /* =======================================================
     IMPORT
  ======================================================= */

  async function importPaper():
    Promise<void> {

    if (
      !supabase
    ) {

      setValidationMessage(
        'Supabase is not configured.'
      );

      return;
    }


    const paperError =
      validatePaper();


    if (
      paperError
    ) {

      setValidationMessage(
        paperError
      );

      return;
    }


    const questions =
      validatedQuestions.length >
      0
        ? validatedQuestions
        : validate();


    if (
      !questions ||
      questions.length ===
        0
    ) {

      return;
    }


    const confirmed =
      window.confirm(
        `Import ${questions.length} questions for ${originLabel} ${year} - ${paper}?`
      );


    if (
      !confirmed
    ) {

      return;
    }


    setImporting(
      true
    );


    setResult(
      null
    );


    setValidationMessage(
      'Importing paper...'
    );


    const metadata =
      buildMetadata(
        questions.length
      );


    const {
      data,
      error
    } =
      await supabase
        .rpc(
          'import_prelims_pyq_paper',
          {

            p_origin:
              origin,

            p_metadata:
              metadata,

            p_questions:
              questions

          }
        );


    if (
      error
    ) {

      console.error(
        'PYQ import failed:',
        error
      );


      setValidationMessage(
        error.message
      );


      setImporting(
        false
      );


      return;
    }


    const importResult =
      (
        data ||
        {}
      ) as ImportResult;


    setResult(
      importResult
    );


    setValidationMessage(
      `✓ Import finished. ${importResult.total_questions ?? questions.length} questions processed.`
    );


    setImporting(
      false
    );
  }


  /* =======================================================
     CLEAR
  ======================================================= */

  function clearPaper():
    void {

    const confirmed =
      rawText.trim()
        ? window.confirm(
            'Clear the pasted question paper?'
          )
        : true;


    if (
      !confirmed
    ) {
      return;
    }


    setRawText(
      ''
    );


    setValidatedQuestions(
      []
    );


    setValidationMessage(
      ''
    );


    setResult(
      null
    );
  }


  /* =======================================================
     SAMPLE
  ======================================================= */

  function insertSample():
    void {

    const sample = [
      {
        question_number:
          '1',

        question:
          'Sample question text',

        options: [
          'Option A',
          'Option B',
          'Option C',
          'Option D'
        ],

        correct_index:
          0,

        explanation:
          'Brief explanation',

        subject:
          'Polity',

        topic:
          'Constitution',

        difficulty:
          'medium',

        tags: [
          'PYQ',
          'Prelims'
        ]
      }
    ];


    setRawText(
      JSON.stringify(
        sample,
        null,
        2
      )
    );


    setValidatedQuestions(
      []
    );


    setValidationMessage(
      'Sample inserted. Replace it with the real question paper.'
    );
  }


  /* =======================================================
     COMMON COMPACT STYLE
  ======================================================= */

  const compactGrid = {

    display:
      'grid',

    gridTemplateColumns:
      'repeat(auto-fit, minmax(150px, 1fr))',

    gap:
      '10px'

  };


  return (

    <section
      className="panel"
      style={{
        padding:
          '16px'
      }}
    >

      {/* =================================================
          HEADER
      ================================================= */}

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
            QUICK PYQ IMPORT
          </span>


          <h2
            style={{
              margin:
                '5px 0'
            }}
          >
            Import Complete Prelims Paper
          </h2>


          <small
            style={{
              color:
                '#94a3b8'
            }}
          >
            Enter paper details once,
            paste all questions and import.
          </small>

        </div>


        <button
          type="button"
          className="secondary-btn"
          onClick={() =>
            setAdvancedOpen(
              current =>
                !current
            )
          }
        >
          {
            advancedOpen
              ? 'Hide Details'
              : 'More Details'
          }
        </button>

      </div>


      {/* =================================================
          ESSENTIAL PAPER DATA
      ================================================= */}

      <div
        style={{
          ...compactGrid,
          marginTop:
            '14px'
        }}
      >

        <label>

          Origin

          <select

            value={
              origin
            }

            onChange={
              event => {

                const next =
                  event.target
                    .value as
                    ImportOrigin;


                setOrigin(
                  next
                );


                if (
                  next ===
                  'cse'
                ) {

                  setSource(
                    'UPSC Official Paper'
                  );


                  setPaper(
                    'GS Paper I'
                  );
                }

              }
            }

          >

            <option value="cse">
              UPSC CSE
            </option>

            <option value="upsc">
              Other UPSC
            </option>

            <option value="state">
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
                  event.target.value
                )
            }

          />

        </label>


        <label>

          Paper

          {
            origin ===
              'cse'
              ? (

                <select

                  value={
                    paper
                  }

                  onChange={
                    event =>
                      setPaper(
                        event.target.value
                      )
                  }

                >

                  <option value="GS Paper I">
                    GS Paper I
                  </option>

                  <option value="CSAT Paper II">
                    CSAT Paper II
                  </option>

                </select>

              )
              : (

                <input

                  value={
                    paper
                  }

                  onChange={
                    event =>
                      setPaper(
                        event.target.value
                      )
                  }

                  placeholder="Paper / Subject"

                />

              )
          }

        </label>


        <label>

          Status

          <select

            value={
              status
            }

            onChange={
              event =>
                setStatus(
                  event.target
                    .value as
                    PublishStatus
                )
            }

          >

            <option value="published">
              Published
            </option>

            <option value="draft">
              Draft
            </option>

          </select>

        </label>

      </div>


      {/* =================================================
          ORIGIN-SPECIFIC ESSENTIAL DATA
      ================================================= */}

      {
        origin ===
          'upsc' && (

          <div
            style={{
              ...compactGrid,
              marginTop:
                '10px'
            }}
          >

            <label>

              UPSC Exam

              <input

                value={
                  upscExamName
                }

                onChange={
                  event =>
                    setUpscExamName(
                      event.target.value
                    )
                }

                placeholder="CAPF / CDS / NDA..."

              />

            </label>


            <label>

              Stage

              <input

                value={
                  upscExamStage
                }

                onChange={
                  event =>
                    setUpscExamStage(
                      event.target.value
                    )
                }

                placeholder="Preliminary"

              />

            </label>

          </div>

        )
      }


      {
        origin ===
          'state' && (

          <div
            style={{
              ...compactGrid,
              marginTop:
                '10px'
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
                      event.target.value
                    )
                }

                placeholder="Maharashtra"

              />

            </label>


            <label>

              PSC

              <input

                value={
                  statePscName
                }

                onChange={
                  event =>
                    setStatePscName(
                      event.target.value
                    )
                }

                placeholder="MPSC"

              />

            </label>


            <label>

              Examination

              <input

                value={
                  stateExamName
                }

                onChange={
                  event =>
                    setStateExamName(
                      event.target.value
                    )
                }

                placeholder="State Services"

              />

            </label>


            <label>

              Stage

              <input

                value={
                  stateExamStage
                }

                onChange={
                  event =>
                    setStateExamStage(
                      event.target.value
                    )
                }

                placeholder="Preliminary"

              />

            </label>

          </div>

        )
      }


      {/* =================================================
          SOURCE + ADVANCED TOGGLE ROW
      ================================================= */}

      <div
        style={{
          ...compactGrid,
          marginTop:
            '10px'
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
                  event.target.value
                )
            }

            placeholder="Official paper"

          />

        </label>


        <div
          style={{
            display:
              'flex',

            alignItems:
              'flex-end'
          }}
        >

          <div
            className="callout"
            style={{
              width:
                '100%',

              padding:
                '9px 12px',

              margin:
                0
            }}
          >

            {
              detectedCount >
              0
                ? `✓ ${detectedCount} questions detected`
                : 'Paste the complete question JSON below'
            }

          </div>

        </div>

      </div>


      {/* =================================================
          ADVANCED DETAILS
      ================================================= */}

      {
        advancedOpen && (

          <div
            style={{
              ...compactGrid,
              marginTop:
                '10px',

              padding:
                '12px',

              border:
                '1px solid rgba(255,255,255,.08)',

              borderRadius:
                '12px'
            }}
          >

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
                      event.target.value
                    )
                }

                placeholder="https://..."

              />

            </label>


            <label>

              Paper Code

              <input

                value={
                  paperCode
                }

                onChange={
                  event =>
                    setPaperCode(
                      event.target.value
                    )
                }

                placeholder="Optional"

              />

            </label>


            <label>

              Exam Cycle

              <input

                value={
                  examCycle
                }

                onChange={
                  event =>
                    setExamCycle(
                      event.target.value
                    )
                }

                placeholder="Optional"

              />

            </label>

          </div>

        )
      }


      {/* =================================================
          QUESTION PAPER
      ================================================= */}

      <div
        style={{
          marginTop:
            '12px'
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
              '10px',

            flexWrap:
              'wrap',

            marginBottom:
              '6px'
          }}
        >

          <strong>
            Complete Question Paper
          </strong>


          <button

            type="button"

            className="text-btn"

            onClick={
              insertSample
            }

          >
            Insert Sample Format
          </button>

        </div>


        <textarea

          value={
            rawText
          }

          onChange={
            event => {

              setRawText(
                event.target.value
              );


              setValidatedQuestions(
                []
              );


              setValidationMessage(
                ''
              );


              setResult(
                null
              );

            }
          }

          rows={
            9
          }

          spellCheck={
            false
          }

          placeholder={`Paste JSON here.

Example:
[
  {
    "question_number": "1",
    "question": "...",
    "options": ["A", "B", "C", "D"],
    "correct_index": 0,
    "subject": "Polity",
    "topic": "Constitution",
    "difficulty": "medium"
  }
]`}

          style={{
            width:
              '100%',

            boxSizing:
              'border-box',

            resize:
              'vertical',

            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',

            fontSize:
              '13px',

            lineHeight:
              1.45
          }}

        />

      </div>


      {/* =================================================
          STATUS
      ================================================= */}

      {
        validationMessage && (

          <div
            className="callout"
            style={{
              marginTop:
                '10px',

              padding:
                '9px 12px'
            }}
          >

            {
              validationMessage
            }

          </div>

        )
      }


      {/* =================================================
          IMPORT RESULT
      ================================================= */}

      {
        result && (

          <div
            style={{
              display:
                'grid',

              gridTemplateColumns:
                'repeat(auto-fit, minmax(120px, 1fr))',

              gap:
                '8px',

              marginTop:
                '10px'
            }}
          >

            <div className="callout">
              <small>
                New
              </small>

              <strong
                style={{
                  display:
                    'block'
                }}
              >
                {
                  result.created_new ??
                  0
                }
              </strong>
            </div>


            <div className="callout">
              <small>
                Linked
              </small>

              <strong
                style={{
                  display:
                    'block'
                }}
              >
                {
                  result.linked_existing ??
                  0
                }
              </strong>
            </div>


            <div className="callout">
              <small>
                Already Linked
              </small>

              <strong
                style={{
                  display:
                    'block'
                }}
              >
                {
                  result.already_linked ??
                  0
                }
              </strong>
            </div>


            <div className="callout">
              <small>
                Review
              </small>

              <strong
                style={{
                  display:
                    'block'
                }}
              >
                {
                  result.needs_review ??
                  0
                }
              </strong>
            </div>

          </div>

        )
      }


      {/* =================================================
          ACTION BAR
      ================================================= */}

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

          flexWrap:
            'wrap',

          marginTop:
            '12px'
        }}
      >

        <button

          type="button"

          className="secondary-btn"

          onClick={
            clearPaper
          }

          disabled={
            importing
          }

        >
          Clear
        </button>


        <div
          style={{
            display:
              'flex',

            gap:
              '8px',

            flexWrap:
              'wrap'
          }}
        >

          <button

            type="button"

            className="secondary-btn"

            onClick={
              validate
            }

            disabled={
              importing ||
              !rawText.trim()
            }

          >
            Validate
          </button>


          <button

            type="button"

            className="primary-btn"

            onClick={() =>
              void importPaper()
            }

            disabled={
              importing ||
              !rawText.trim()
            }

          >

            {
              importing
                ? 'Importing...'
                : detectedCount >
                    0
                  ? `Import ${detectedCount} Questions`
                  : 'Import Paper'
            }

          </button>

        </div>

      </div>

    </section>

  );
}


export default PrelimsPyqQuickImport;

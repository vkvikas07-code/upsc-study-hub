import {
  useMemo,
  useState
} from 'react';

import type {
  FormEvent
} from 'react';

import {
  supabase
} from '../lib/supabase';


type QuestionOrigin =
  | 'cse'
  | 'upsc'
  | 'state';


type ImportResult = {
  total_questions?: number;
  created_new?: number;
  linked_existing?: number;
  already_linked?: number;
  needs_review?: number;
  results?: unknown[];
};


const SAMPLE_JSON = `[
  {
    "question_number": "1",
    "question": "Sample question text goes here.",
    "options": [
      "Option A",
      "Option B",
      "Option C",
      "Option D"
    ],
    "correct_index": 0,
    "explanation": "Add a clear explanation here.",
    "subject": "Polity",
    "topic": "Constitution",
    "difficulty": "medium",
    "tags": [
      "Polity",
      "Prelims"
    ]
  },
  {
    "question_number": "2",
    "question": "Second sample question goes here.",
    "options": [
      "Option A",
      "Option B",
      "Option C",
      "Option D"
    ],
    "correct_index": 2,
    "explanation": "Add the explanation here.",
    "subject": "History",
    "topic": "Modern India",
    "difficulty": "medium",
    "tags": [
      "History",
      "PYQ"
    ]
  }
]`;


export function PrelimsPyqBulkImporter() {


  const [
    origin,
    setOrigin
  ] =
    useState<QuestionOrigin>(
      'cse'
    );


  const [
    pyqYear,
    setPyqYear
  ] =
    useState('');


  const [
    paper,
    setPaper
  ] =
    useState(
      'GS Paper I'
    );


  const [
    source,
    setSource
  ] =
    useState('');


  const [
    sourceUrl,
    setSourceUrl
  ] =
    useState('');


  const [
    status,
    setStatus
  ] =
    useState<
      'draft' |
      'published'
    >(
      'published'
    );


  /*
   * OTHER UPSC
   */

  const [
    upscExamName,
    setUpscExamName
  ] =
    useState('');


  const [
    upscExamCycle,
    setUpscExamCycle
  ] =
    useState('');


  const [
    upscExamYear,
    setUpscExamYear
  ] =
    useState('');


  const [
    upscExamStage,
    setUpscExamStage
  ] =
    useState(
      'prelims'
    );


  const [
    upscExamPaper,
    setUpscExamPaper
  ] =
    useState('');


  /*
   * STATE PSC
   */

  const [
    stateName,
    setStateName
  ] =
    useState('');


  const [
    statePscName,
    setStatePscName
  ] =
    useState('');


  const [
    stateExamName,
    setStateExamName
  ] =
    useState('');


  const [
    stateYear,
    setStateYear
  ] =
    useState('');


  const [
    stateStage,
    setStateStage
  ] =
    useState(
      'Preliminary'
    );


  const [
    statePaper,
    setStatePaper
  ] =
    useState('');


  /*
   * QUESTIONS
   */

  const [
    questionsJson,
    setQuestionsJson
  ] =
    useState(
      SAMPLE_JSON
    );


  const [
    importing,
    setImporting
  ] =
    useState(
      false
    );


  const [
    message,
    setMessage
  ] =
    useState('');


  const [
    result,
    setResult
  ] =
    useState<ImportResult | null>(
      null
    );


  const parsedCount =
    useMemo(
      () => {

        try {

          const parsed =
            JSON.parse(
              questionsJson
            );


          return Array.isArray(
            parsed
          )
            ? parsed.length
            : 0;

        } catch {

          return 0;
        }

      },
      [
        questionsJson
      ]
    );


  function resetOriginFields() {

    setPyqYear('');

    setUpscExamName('');

    setUpscExamCycle('');

    setUpscExamYear('');

    setUpscExamPaper('');

    setStateName('');

    setStatePscName('');

    setStateExamName('');

    setStateYear('');

    setStatePaper('');

    setResult(
      null
    );

    setMessage('');
  }


  function changeOrigin(
    nextOrigin:
      QuestionOrigin
  ) {

    setOrigin(
      nextOrigin
    );

    resetOriginFields();
  }


  function buildMetadata() {

    const common = {

      source:
        source.trim() ||
        null,

      source_url:
        sourceUrl.trim() ||
        null,

      status

    };


    if (
      origin ===
      'cse'
    ) {

      return {

        ...common,

        pyq_year:
          pyqYear.trim(),

        exam_stage:
          'prelims',

        paper:
          paper.trim() ||
          'GS Paper I'

      };
    }


    if (
      origin ===
      'upsc'
    ) {

      return {

        ...common,

        upsc_exam_name:
          upscExamName.trim(),

        upsc_exam_cycle:
          upscExamCycle.trim() ||
          null,

        upsc_exam_year:
          upscExamYear.trim(),

        upsc_exam_stage:
          upscExamStage.trim() ||
          'prelims',

        upsc_exam_paper:
          upscExamPaper.trim() ||
          null

      };
    }


    return {

      ...common,

      state_psc_state:
        stateName.trim(),

      state_psc_name:
        statePscName.trim(),

      state_psc_exam_name:
        stateExamName.trim(),

      state_psc_year:
        stateYear.trim(),

      state_psc_stage:
        stateStage.trim() ||
        'Preliminary',

      state_psc_paper:
        statePaper.trim() ||
        null

    };
  }


  function validatePaper() {

    if (
      origin ===
        'cse' &&
      !pyqYear.trim()
    ) {

      return 'CSE PYQ year is required.';
    }


    if (
      origin ===
      'upsc'
    ) {

      if (
        !upscExamName.trim()
      ) {

        return 'UPSC examination name is required.';
      }


      if (
        !upscExamYear.trim()
      ) {

        return 'UPSC examination year is required.';
      }
    }


    if (
      origin ===
      'state'
    ) {

      if (
        !stateName.trim()
      ) {

        return 'State name is required.';
      }


      if (
        !statePscName.trim()
      ) {

        return 'State PSC name is required.';
      }


      if (
        !stateExamName.trim()
      ) {

        return 'State PSC examination name is required.';
      }


      if (
        !stateYear.trim()
      ) {

        return 'State PSC examination year is required.';
      }
    }


    return '';
  }


  async function importPaper(
    event:
      FormEvent
  ) {

    event.preventDefault();


    if (
      !supabase
    ) {

      setMessage(
        'Supabase is not configured.'
      );

      return;
    }


    setMessage('');

    setResult(
      null
    );


    const metadataError =
      validatePaper();


    if (
      metadataError
    ) {

      setMessage(
        metadataError
      );

      return;
    }


    let parsedQuestions:
      unknown;


    try {

      parsedQuestions =
        JSON.parse(
          questionsJson
        );

    } catch {

      setMessage(
        'Question JSON is invalid. Check commas, brackets and quotation marks.'
      );

      return;
    }


    if (
      !Array.isArray(
        parsedQuestions
      )
    ) {

      setMessage(
        'Questions must be a JSON array.'
      );

      return;
    }


    if (
      parsedQuestions.length ===
      0
    ) {

      setMessage(
        'Add at least one question.'
      );

      return;
    }


    if (
      parsedQuestions.length >
      250
    ) {

      setMessage(
        'Maximum 250 questions can be imported at one time.'
      );

      return;
    }


    setImporting(
      true
    );


    setMessage(
      `Importing ${parsedQuestions.length} questions...`
    );


    const {
      data,
      error
    } =
      await supabase.rpc(
        'import_prelims_pyq_paper',
        {

          p_origin:
            origin,

          p_metadata:
            buildMetadata(),

          p_questions:
            parsedQuestions

        }
      );


    if (
      error
    ) {

      console.error(
        'Prelims PYQ import failed:',
        error
      );


      setImporting(
        false
      );


      setMessage(
        error.message ||
        'Unable to import paper.'
      );


      return;
    }


    const importResult =
      (
        data ||
        {}
      ) as
        ImportResult;


    setResult(
      importResult
    );


    setImporting(
      false
    );


    setMessage(
      'Prelims PYQ paper processed successfully.'
    );
  }


  return (

    <section
      className="panel"
    >

      <span
        className="eyebrow"
      >
        PRELIMS PYQ BULK IMPORT
      </span>


      <h2>
        Import Complete Prelims Paper
      </h2>


      <p>
        Paste a structured question paper once. Existing repeated questions will be linked to the new examination instead of being stored again.
      </p>


      <form
        className="admin-form"
        onSubmit={
          importPaper
        }
      >

        <label>

          Question Origin

          <select
            value={
              origin
            }
            onChange={
              event =>
                changeOrigin(
                  event.target
                    .value as
                    QuestionOrigin
                )
            }
          >

            <option
              value="cse"
            >
              UPSC Civil Services Examination
            </option>


            <option
              value="upsc"
            >
              Other UPSC Examination
            </option>


            <option
              value="state"
            >
              State PSC Examination
            </option>

          </select>

        </label>



        {
          origin ===
          'cse' && (

            <div
              className="form-two"
            >

              <label>

                CSE PYQ Year

                <input
                  type="number"
                  min="1900"
                  max="2100"
                  value={
                    pyqYear
                  }
                  onChange={
                    event =>
                      setPyqYear(
                        event.target
                          .value
                      )
                  }
                  placeholder="2025"
                />

              </label>


              <label>

                Paper

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
                  placeholder="GS Paper I"
                />

              </label>

            </div>

          )
        }



        {
          origin ===
          'upsc' && (

            <>

              <label>

                UPSC Examination Name

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
                  placeholder="Indian Forest Service Examination"
                />

              </label>


              <div
                className="form-two"
              >

                <label>

                  Examination Year

                  <input
                    type="number"
                    min="1900"
                    max="2100"
                    value={
                      upscExamYear
                    }
                    onChange={
                      event =>
                        setUpscExamYear(
                          event.target
                            .value
                        )
                    }
                    placeholder="2025"
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
                    placeholder="2025"
                  />

                </label>

              </div>


              <div
                className="form-two"
              >

                <label>

                  Stage

                  <input
                    value={
                      upscExamStage
                    }
                    onChange={
                      event =>
                        setUpscExamStage(
                          event.target
                            .value
                        )
                    }
                    placeholder="prelims"
                  />

                </label>


                <label>

                  Paper

                  <input
                    value={
                      upscExamPaper
                    }
                    onChange={
                      event =>
                        setUpscExamPaper(
                          event.target
                            .value
                        )
                    }
                    placeholder="General Ability Test"
                  />

                </label>

              </div>

            </>

          )
        }



        {
          origin ===
          'state' && (

            <>

              <div
                className="form-two"
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
                    placeholder="Maharashtra"
                  />

                </label>


                <label>

                  PSC Name

                  <input
                    value={
                      statePscName
                    }
                    onChange={
                      event =>
                        setStatePscName(
                          event.target
                            .value
                        )
                    }
                    placeholder="Maharashtra Public Service Commission"
                  />

                </label>

              </div>


              <label>

                Examination Name

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
                  placeholder="State Services Preliminary Examination"
                />

              </label>


              <div
                className="form-two"
              >

                <label>

                  Examination Year

                  <input
                    type="number"
                    min="1900"
                    max="2100"
                    value={
                      stateYear
                    }
                    onChange={
                      event =>
                        setStateYear(
                          event.target
                            .value
                        )
                    }
                    placeholder="2025"
                  />

                </label>


                <label>

                  Stage

                  <input
                    value={
                      stateStage
                    }
                    onChange={
                      event =>
                        setStateStage(
                          event.target
                            .value
                        )
                    }
                    placeholder="Preliminary"
                  />

                </label>

              </div>


              <label>

                Paper

                <input
                  value={
                    statePaper
                  }
                  onChange={
                    event =>
                      setStatePaper(
                        event.target
                          .value
                      )
                  }
                  placeholder="General Studies Paper I"
                />

              </label>

            </>

          )
        }



        <div
          className="form-two"
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
              placeholder="UPSC / MPSC official paper"
            />

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
                      'draft' |
                      'published'
                  )
              }
            >

              <option
                value="published"
              >
                Published
              </option>


              <option
                value="draft"
              >
                Draft
              </option>

            </select>

          </label>

        </div>



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
            placeholder="https://..."
          />

        </label>



        <label>

          Questions JSON

          <textarea
            rows={
              24
            }
            value={
              questionsJson
            }
            onChange={
              event =>
                setQuestionsJson(
                  event.target
                    .value
                )
            }
            spellCheck={
              false
            }
          />

          <small>
            correct_index uses 0=A, 1=B, 2=C, 3=D.
          </small>

        </label>



        <div
          className="callout"
        >

          <strong>
            Questions detected: {parsedCount}
          </strong>


          <p>
            Exact repeated questions are linked automatically. Same-stem questions with changed answers/options are held for review.
          </p>

        </div>



        <button
          type="submit"
          className="primary-btn"
          disabled={
            importing
          }
        >

          {
            importing
              ? 'Importing paper...'
              : `Import ${parsedCount || ''} Questions`
          }

        </button>



        {
          message && (

            <p
              className="form-message"
            >
              {message}
            </p>

          )
        }



        {
          result && (

            <div
              className="callout"
              style={{
                marginTop:
                  '18px'
              }}
            >

              <strong>
                Import Summary
              </strong>


              <p>
                Total processed:{' '}
                <strong>
                  {
                    result
                      .total_questions ??
                    0
                  }
                </strong>
              </p>


              <p>
                New master questions:{' '}
                <strong>
                  {
                    result
                      .created_new ??
                    0
                  }
                </strong>
              </p>


              <p>
                Existing questions linked:{' '}
                <strong>
                  {
                    result
                      .linked_existing ??
                    0
                  }
                </strong>
              </p>


              <p>
                Already linked:{' '}
                <strong>
                  {
                    result
                      .already_linked ??
                    0
                  }
                </strong>
              </p>


              <p>
                Need manual review:{' '}
                <strong>
                  {
                    result
                      .needs_review ??
                    0
                  }
                </strong>
              </p>

            </div>

          )
        }

      </form>

    </section>

  );
}

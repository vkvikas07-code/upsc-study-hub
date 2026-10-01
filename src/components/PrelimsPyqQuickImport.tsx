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


type InputMode =
  | 'easy'
  | 'json';


type PublishStatus =
  | 'draft'
  | 'published';


type Difficulty =
  | 'easy'
  | 'medium'
  | 'hard';


type QuestionPayload = {
  question_number: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  subject: string;
  topic: string;
  difficulty: Difficulty;
  tags: string[];
};


type ImportResult = {
  total_questions?: number;
  created_new?: number;
  linked_existing?: number;
  already_linked?: number;
  needs_review?: number;
};


type DraftQuestion = {
  questionNumber: string;
  questionLines: string[];
  options: string[];
  correctLetter: string;
  explanationLines: string[];
  subject: string;
  topic: string;
  difficulty: Difficulty;
};


type ExistingQuestion = {
  id: string;
  question: string;
};


type DuplicateMatch = {
  question_number: string;
  question: string;

  reason:
    | 'database'
    | 'batch';

  existing_question?: string;
  existing_id?: string;

  duplicate_of_number?: string;
};


type DuplicateCheckResult = {
  uniqueQuestions: QuestionPayload[];
  duplicates: DuplicateMatch[];
};


/* =========================================================
   GENERAL HELPERS
   ========================================================= */

function isRecord(
  value: unknown
):
  value is Record<
    string,
    unknown
  > {

  return (
    typeof value ===
      'object' &&
    value !==
      null &&
    !Array.isArray(
      value
    )
  );
}


function safeString(
  value: unknown
):
  string {

  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  return String(
    value
  );
}


function currentYear():
  string {

  return String(
    new Date()
      .getFullYear()
  );
}


function answerLetter(
  index: number
):
  string {

  if (
    !Number.isInteger(
      index
    ) ||
    index < 0
  ) {
    return '-';
  }

  return String.fromCharCode(
    65 + index
  );
}


/* =========================================================
   DUPLICATE NORMALIZATION
   ========================================================= */

/*
 * These questions will be treated as the same:
 *
 * "What is Article 14?"
 * "what is article 14 ?"
 * "What   is Article 14?"
 *
 * Capitalization, punctuation and extra spaces are ignored.
 */

function normalizeQuestionText(
  value: string
):
  string {

  return value
    .normalize(
      'NFKC'
    )

    .toLowerCase()

    .replace(
      /[“”]/g,
      '"'
    )

    .replace(
      /[‘’]/g,
      "'"
    )

    .replace(
      /[.,!?;:()[\]{}"'“”‘’\-–—_/\\]+/g,
      ' '
    )

    .replace(
      /\s+/g,
      ' '
    )

    .trim();
}


/* =========================================================
   EASY PASTE PARSER
   ========================================================= */

function newDraft(
  questionNumber: string
):
  DraftQuestion {

  return {

    questionNumber,

    questionLines:
      [],

    options:
      [],

    correctLetter:
      '',

    explanationLines:
      [],

    subject:
      'General Studies',

    topic:
      '',

    difficulty:
      'medium'
  };
}


function finaliseDraft(
  draft: DraftQuestion,
  fallbackNumber: number
):
  QuestionPayload {

  const question =
    draft
      .questionLines
      .join(
        ' '
      )
      .trim();


  if (
    !question
  ) {

    throw new Error(
      `Question ${
        draft.questionNumber ||
        fallbackNumber
      } has no question text.`
    );
  }


  if (
    draft.options.length <
    2
  ) {

    throw new Error(
      `Question ${
        draft.questionNumber ||
        fallbackNumber
      } needs at least two options.`
    );
  }


  if (
    !draft.correctLetter
  ) {

    throw new Error(
      `Question ${
        draft.questionNumber ||
        fallbackNumber
      } has no Answer field.`
    );
  }


  const correctIndex =
    draft
      .correctLetter
      .toUpperCase()
      .charCodeAt(
        0
      ) -
    65;


  if (
    correctIndex < 0 ||
    correctIndex >=
      draft.options.length
  ) {

    throw new Error(
      `Question ${
        draft.questionNumber ||
        fallbackNumber
      } has an invalid answer.`
    );
  }


  return {

    question_number:
      draft.questionNumber ||
      String(
        fallbackNumber
      ),

    question,

    options:
      draft.options,

    correct_index:
      correctIndex,

    explanation:
      draft
        .explanationLines
        .join(
          ' '
        )
        .trim(),

    subject:
      draft
        .subject
        .trim() ||
      'General Studies',

    topic:
      draft
        .topic
        .trim(),

    difficulty:
      draft.difficulty,

    tags: [
      'PYQ',
      'Prelims'
    ]
  };
}


function parseEasyText(
  rawText: string
):
  QuestionPayload[] {

  const text =
    rawText
      .replace(
        /\r/g,
        ''
      )
      .trim();


  if (
    !text
  ) {

    throw new Error(
      'Paste the question paper first.'
    );
  }


  const lines =
    text.split(
      '\n'
    );


  const questions:
    QuestionPayload[] =
    [];


  let current:
    DraftQuestion |
    null =
    null;


  let section:
    | 'question'
    | 'options'
    | 'explanation' =
    'question';


  function flush():
    void {

    if (
      !current
    ) {
      return;
    }


    questions.push(
      finaliseDraft(
        current,
        questions.length +
        1
      )
    );


    current =
      null;


    section =
      'question';
  }


  for (
    const originalLine
    of lines
  ) {

    const line =
      originalLine.trim();


    if (
      !line
    ) {
      continue;
    }


    if (
      line ===
        '---' ||
      line ===
        '==='
    ) {

      flush();

      continue;
    }


    const questionMatch =
      line.match(
        /^(?:q(?:uestion)?\s*)?(\d+)\s*[\.\)\:\-]\s*(.+)$/i
      );


    if (
      questionMatch &&
      (
        !current ||
        Boolean(
          current.correctLetter
        )
      )
    ) {

      if (
        current
      ) {
        flush();
      }


      current =
        newDraft(
          questionMatch[
            1
          ]
        );


      current
        .questionLines
        .push(
          questionMatch[
            2
          ]
        );


      section =
        'question';


      continue;
    }


    if (
      !current
    ) {

      current =
        newDraft(
          String(
            questions.length +
            1
          )
        );
    }


    const optionMatch =
      line.match(
        /^\(?([A-D])\)?\s*[\.\)\:\-]\s*(.+)$/i
      );


    if (
      optionMatch
    ) {

      current
        .options
        .push(
          optionMatch[
            2
          ].trim()
        );


      section =
        'options';


      continue;
    }


    const answerMatch =
      line.match(
        /^(?:answer|ans|correct(?:\s+answer)?)\s*[\:\-]\s*\(?([A-D])\)?/i
      );


    if (
      answerMatch
    ) {

      current.correctLetter =
        answerMatch[
          1
        ].toUpperCase();


      continue;
    }


    const explanationMatch =
      line.match(
        /^(?:explanation|explain|solution)\s*[\:\-]\s*(.*)$/i
      );


    if (
      explanationMatch
    ) {

      section =
        'explanation';


      if (
        explanationMatch[
          1
        ]
      ) {

        current
          .explanationLines
          .push(
            explanationMatch[
              1
            ]
          );
      }


      continue;
    }


    const subjectMatch =
      line.match(
        /^subject\s*[\:\-]\s*(.+)$/i
      );


    if (
      subjectMatch
    ) {

      current.subject =
        subjectMatch[
          1
        ].trim();


      continue;
    }


    const topicMatch =
      line.match(
        /^topic\s*[\:\-]\s*(.+)$/i
      );


    if (
      topicMatch
    ) {

      current.topic =
        topicMatch[
          1
        ].trim();


      continue;
    }


    const difficultyMatch =
      line.match(
        /^difficulty\s*[\:\-]\s*(easy|medium|hard)$/i
      );


    if (
      difficultyMatch
    ) {

      current.difficulty =
        difficultyMatch[
          1
        ]
          .toLowerCase() as
          Difficulty;


      continue;
    }


    if (
      section ===
      'explanation'
    ) {

      current
        .explanationLines
        .push(
          line
        );


      continue;
    }


    if (
      section ===
        'options' &&
      current.options.length >
        0
    ) {

      const lastIndex =
        current.options.length -
        1;


      current.options[
        lastIndex
      ] =
        `${
          current.options[
            lastIndex
          ]
        } ${line}`;


      continue;
    }


    current
      .questionLines
      .push(
        line
      );
  }


  flush();


  if (
    questions.length ===
    0
  ) {

    throw new Error(
      'No questions could be detected.'
    );
  }


  if (
    questions.length >
    250
  ) {

    throw new Error(
      'Maximum 250 questions can be imported at one time.'
    );
  }


  return questions;
}


/* =========================================================
   JSON PARSER
   ========================================================= */

function parseJsonText(
  rawText: string
):
  QuestionPayload[] {

  if (
    !rawText.trim()
  ) {

    throw new Error(
      'Paste JSON first.'
    );
  }


  let parsed:
    unknown;


  try {

    parsed =
      JSON.parse(
        rawText
      );

  } catch {

    throw new Error(
      'Invalid JSON format.'
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
      'JSON must be an array or contain a questions array.'
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
          `Question ${
            index +
            1
          } is invalid.`
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
          `Question ${
            index +
            1
          } has no text.`
        );
      }


      if (
        !Array.isArray(
          item.options
        )
      ) {

        throw new Error(
          `Question ${
            index +
            1
          } has no options array.`
        );
      }


      const options =
        item
          .options
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
          `Question ${
            index +
            1
          } needs at least two options.`
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
        correctIndex < 0 ||
        correctIndex >=
          options.length
      ) {

        throw new Error(
          `Question ${
            index +
            1
          } has an invalid correct_index.`
        );
      }


      const rawDifficulty =
        safeString(
          item.difficulty
        )
          .trim()
          .toLowerCase();


      const difficulty:
        Difficulty =
        rawDifficulty ===
          'easy' ||
        rawDifficulty ===
          'hard'
          ? rawDifficulty
          : 'medium';


      return {

        question_number:
          safeString(
            item.question_number
          ).trim() ||
          String(
            index +
            1
          ),

        question,

        options,

        correct_index:
          correctIndex,

        explanation:
          safeString(
            item.explanation
          ).trim(),

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

        tags:
          Array.isArray(
            item.tags
          )
            ? item
                .tags
                .map(
                  tag =>
                    safeString(
                      tag
                    ).trim()
                )
                .filter(
                  Boolean
                )
            : [
                'PYQ',
                'Prelims'
              ]
      };
    }
  );
}


/* =========================================================
   QUESTION PREVIEW
   ========================================================= */

function PyqImportPreview({
  questions
}: {
  questions:
    QuestionPayload[];
}) {

  const [
    showAll,
    setShowAll
  ] =
    useState(
      false
    );


  if (
    questions.length ===
    0
  ) {
    return null;
  }


  const visibleQuestions =
    showAll
      ? questions
      : questions.slice(
          0,
          8
        );


  const withoutExplanation =
    questions.filter(
      item =>
        !item
          .explanation
          .trim()
    ).length;


  const withoutTopic =
    questions.filter(
      item =>
        !item
          .topic
          .trim()
    ).length;


  return (

    <section
      style={{
        marginTop:
          '12px',

        padding:
          '12px',

        border:
          '1px solid rgba(45,212,191,.18)',

        borderRadius:
          '12px',

        background:
          'rgba(15,23,42,.35)'
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
            'wrap'
        }}
      >

        <div>

          <span
            className="eyebrow"
          >
            NEW QUESTIONS
          </span>


          <strong
            style={{
              display:
                'block',

              marginTop:
                '3px'
            }}
          >
            {
              questions.length
            } question
            {
              questions.length ===
                1
                ? ''
                : 's'
            } ready to import
          </strong>

        </div>


        {
          questions.length >
          8 && (

          <button
            type="button"
            className="secondary-btn"
            onClick={() =>
              setShowAll(
                current =>
                  !current
              )
            }
          >
            {
              showAll
                ? 'Show Less'
                : `Show All ${
                    questions.length
                  }`
            }
          </button>

        )}

      </div>


      <div
        style={{
          display:
            'grid',

          gridTemplateColumns:
            'repeat(3, minmax(0, 1fr))',

          gap:
            '8px',

          marginTop:
            '10px'
        }}
      >

        <div
          className="callout"
        >

          <small>
            New Questions
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
            No Explanation
          </small>

          <strong
            style={{
              display:
                'block'
            }}
          >
            {
              withoutExplanation
            }
          </strong>

        </div>


        <div
          className="callout"
        >

          <small>
            No Topic
          </small>

          <strong
            style={{
              display:
                'block'
            }}
          >
            {
              withoutTopic
            }
          </strong>

        </div>

      </div>


      <div
        style={{
          display:
            'grid',

          gap:
            '6px',

          marginTop:
            '10px'
        }}
      >

        {
          visibleQuestions.map(
            (
              item,
              index
            ) => {

              const answer =
                answerLetter(
                  item.correct_index
                );


              const answerText =
                item.options[
                  item.correct_index
                ] ||
                '';


              return (

                <article
                  key={
                    `${
                      item.question_number
                    }-${index}`
                  }
                  style={{
                    display:
                      'grid',

                    gridTemplateColumns:
                      '55px minmax(0, 1fr) 120px',

                    gap:
                      '10px',

                    alignItems:
                      'center',

                    padding:
                      '9px 10px',

                    border:
                      '1px solid rgba(255,255,255,.07)',

                    borderRadius:
                      '10px'
                  }}
                >

                  <strong>
                    Q
                    {
                      item.question_number ||
                      index +
                      1
                    }
                  </strong>


                  <div
                    style={{
                      minWidth:
                        0
                    }}
                  >

                    <strong
                      style={{
                        display:
                          'block',

                        overflow:
                          'hidden',

                        textOverflow:
                          'ellipsis',

                        whiteSpace:
                          'nowrap'
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
                          '3px',

                        color:
                          '#94a3b8',

                        overflow:
                          'hidden',

                        textOverflow:
                          'ellipsis',

                        whiteSpace:
                          'nowrap'
                      }}
                    >
                      {
                        item.subject ||
                        'General Studies'
                      }

                      {' • '}

                      {
                        item.topic ||
                        'No topic'
                      }

                      {' • '}

                      {
                        item.difficulty
                      }
                    </small>

                  </div>


                  <div
                    style={{
                      textAlign:
                        'right'
                    }}
                  >

                    <span
                      className="tag"
                    >
                      Answer {
                        answer
                      }
                    </span>


                    <small
                      style={{
                        display:
                          'block',

                        marginTop:
                          '4px',

                        color:
                          '#94a3b8',

                        overflow:
                          'hidden',

                        textOverflow:
                          'ellipsis',

                        whiteSpace:
                          'nowrap'
                      }}
                    >
                      {
                        answerText
                      }
                    </small>

                  </div>

                </article>

              );
            }
          )
        }

      </div>


      {
        !showAll &&
        questions.length >
        8 && (

        <small
          style={{
            display:
              'block',

            textAlign:
              'center',

            marginTop:
              '8px',

            color:
              '#94a3b8'
          }}
        >
          Showing first 8 of {
            questions.length
          } questions
        </small>

      )}

    </section>
  );
}


/* =========================================================
   DUPLICATE PREVIEW
   ========================================================= */

function DuplicatePreview({
  duplicates
}: {
  duplicates:
    DuplicateMatch[];
}) {

  const [
    showAll,
    setShowAll
  ] =
    useState(
      false
    );


  if (
    duplicates.length ===
    0
  ) {
    return null;
  }


  const visibleDuplicates =
    showAll
      ? duplicates
      : duplicates.slice(
          0,
          8
        );


  const databaseCount =
    duplicates.filter(
      item =>
        item.reason ===
        'database'
    ).length;


  const batchCount =
    duplicates.filter(
      item =>
        item.reason ===
        'batch'
    ).length;


  return (

    <section
      style={{
        marginTop:
          '12px',

        padding:
          '12px',

        border:
          '1px solid rgba(251,191,36,.32)',

        borderRadius:
          '12px',

        background:
          'rgba(251,191,36,.05)'
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
            'wrap'
        }}
      >

        <div>

          <span
            className="eyebrow"
          >
            DUPLICATE PROTECTION
          </span>


          <strong
            style={{
              display:
                'block',

              marginTop:
                '4px'
            }}
          >
            {
              duplicates.length
            } duplicate question
            {
              duplicates.length ===
                1
                ? ''
                : 's'
            } blocked
          </strong>


          <small
            style={{
              display:
                'block',

              marginTop:
                '4px',

              color:
                '#94a3b8'
            }}
          >
            These questions will not be added again.
          </small>

        </div>


        {
          duplicates.length >
          8 && (

          <button
            type="button"
            className="secondary-btn"
            onClick={() =>
              setShowAll(
                current =>
                  !current
              )
            }
          >
            {
              showAll
                ? 'Show Less'
                : `Show All ${
                    duplicates.length
                  }`
            }
          </button>

        )}

      </div>


      <div
        style={{
          display:
            'grid',

          gridTemplateColumns:
            'repeat(2, minmax(0, 1fr))',

          gap:
            '8px',

          marginTop:
            '10px'
        }}
      >

        <div
          className="callout"
        >

          <small>
            Already in Database
          </small>

          <strong
            style={{
              display:
                'block'
            }}
          >
            {
              databaseCount
            }
          </strong>

        </div>


        <div
          className="callout"
        >

          <small>
            Repeated in Current Paste
          </small>

          <strong
            style={{
              display:
                'block'
            }}
          >
            {
              batchCount
            }
          </strong>

        </div>

      </div>


      <div
        style={{
          display:
            'grid',

          gap:
            '8px',

          marginTop:
            '10px'
        }}
      >

        {
          visibleDuplicates.map(
            (
              item,
              index
            ) => (

            <article
              key={
                `${
                  item.question_number
                }-${
                  item.reason
                }-${index}`
              }
              style={{
                padding:
                  '10px',

                border:
                  '1px solid rgba(251,191,36,.18)',

                borderRadius:
                  '10px'
              }}
            >

              <div
                style={{
                  display:
                    'flex',

                  gap:
                    '6px',

                  flexWrap:
                    'wrap'
                }}
              >

                <span
                  className="tag"
                >
                  Q{
                    item.question_number
                  }
                </span>


                <span
                  className="tag"
                >
                  {
                    item.reason ===
                      'database'
                      ? 'Already in System'
                      : 'Repeated in Paste'
                  }
                </span>

              </div>


              <strong
                style={{
                  display:
                    'block',

                  marginTop:
                    '6px',

                  lineHeight:
                    1.4
                }}
              >
                {
                  item.question
                }
              </strong>


              {
                item.reason ===
                  'batch' &&
                item.duplicate_of_number && (

                <small
                  style={{
                    display:
                      'block',

                    marginTop:
                      '5px',

                    color:
                      '#94a3b8'
                  }}
                >
                  Same as Q{
                    item.duplicate_of_number
                  } in the current pasted paper.
                </small>

              )}


              {
                item.reason ===
                  'database' && (

                <small
                  style={{
                    display:
                      'block',

                    marginTop:
                      '5px',

                    color:
                      '#94a3b8'
                  }}
                >
                  This question is already present in the Prelims question bank.
                </small>

              )}

            </article>

          )
        }

      </div>

    </section>
  );
}


/* =========================================================
   MAIN COMPONENT
   ========================================================= */

export function PrelimsPyqQuickImport() {

  const [
    mode,
    setMode
  ] =
    useState<
      InputMode
    >(
      'easy'
    );


  const [
    origin,
    setOrigin
  ] =
    useState<
      ImportOrigin
    >(
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
    useState<
      PublishStatus
    >(
      'published'
    );


  const [
    source,
    setSource
  ] =
    useState(
      'UPSC Official Paper'
    );


  const [
    sourceUrl,
    setSourceUrl
  ] =
    useState('');


  const [
    advancedOpen,
    setAdvancedOpen
  ] =
    useState(
      false
    );


  const [
    examName,
    setExamName
  ] =
    useState('');


  const [
    stateName,
    setStateName
  ] =
    useState('');


  const [
    pscName,
    setPscName
  ] =
    useState('');


  const [
    rawText,
    setRawText
  ] =
    useState('');


  const [
    validatedQuestions,
    setValidatedQuestions
  ] =
    useState<
      QuestionPayload[]
    >([]);


  const [
    duplicateMatches,
    setDuplicateMatches
  ] =
    useState<
      DuplicateMatch[]
    >([]);


  const [
    message,
    setMessage
  ] =
    useState('');


  const [
    importing,
    setImporting
  ] =
    useState(
      false
    );


  const [
    checkingDuplicates,
    setCheckingDuplicates
  ] =
    useState(
      false
    );


  const [
    result,
    setResult
  ] =
    useState<
      ImportResult |
      null
    >(
      null
    );


  function resetValidation():
    void {

    setValidatedQuestions(
      []
    );


    setDuplicateMatches(
      []
    );


    setResult(
      null
    );
  }


  function parseInput():
    QuestionPayload[] {

    return mode ===
      'easy'
      ? parseEasyText(
          rawText
        )
      : parseJsonText(
          rawText
        );
  }


  const detectedCount =
    useMemo(
      () => {

        if (
          !rawText.trim()
        ) {
          return 0;
        }


        try {

          return mode ===
            'easy'
            ? parseEasyText(
                rawText
              ).length
            : parseJsonText(
                rawText
              ).length;

        } catch {

          return 0;
        }

      },
      [
        rawText,
        mode
      ]
    );


  /* =========================================================
     DUPLICATE CHECK
     ========================================================= */

  async function checkDuplicates(
    incoming:
      QuestionPayload[]
  ):
    Promise<
      DuplicateCheckResult
    > {

    if (
      !supabase
    ) {

      throw new Error(
        'Supabase is not configured.'
      );
    }


    /*
     * STEP 1
     * Check the same pasted paper for repeated questions.
     */

    const firstOccurrence =
      new Map<
        string,
        QuestionPayload
      >();


    const batchDuplicates:
      DuplicateMatch[] =
      [];


    const batchUnique:
      QuestionPayload[] =
      [];


    for (
      const item
      of incoming
    ) {

      const normalized =
        normalizeQuestionText(
          item.question
        );


      const previous =
        firstOccurrence.get(
          normalized
        );


      if (
        previous
      ) {

        batchDuplicates.push({

          question_number:
            item.question_number,

          question:
            item.question,

          reason:
            'batch',

          duplicate_of_number:
            previous.question_number

        });


        continue;
      }


      firstOccurrence.set(
        normalized,
        item
      );


      batchUnique.push(
        item
      );
    }


    /*
     * STEP 2
     * Check all existing Prelims questions.
     */

    const {
      data,
      error
    } =
      await supabase
        .from(
          'questions'
        )
        .select(
          'id, question'
        )
        .eq(
          'exam_stage',
          'prelims'
        )
        .limit(
          10000
        );


    if (
      error
    ) {

      throw new Error(
        `Unable to check existing questions: ${error.message}`
      );
    }


    const existingQuestions =
      (
        data ||
        []
      ) as
        ExistingQuestion[];


    const existingMap =
      new Map<
        string,
        ExistingQuestion
      >();


    existingQuestions.forEach(
      item => {

        const normalized =
          normalizeQuestionText(
            item.question ||
            ''
          );


        if (
          normalized &&
          !existingMap.has(
            normalized
          )
        ) {

          existingMap.set(
            normalized,
            item
          );
        }
      }
    );


    const databaseDuplicates:
      DuplicateMatch[] =
      [];


    const uniqueQuestions:
      QuestionPayload[] =
      [];


    for (
      const item
      of batchUnique
    ) {

      const normalized =
        normalizeQuestionText(
          item.question
        );


      const existing =
        existingMap.get(
          normalized
        );


      if (
        existing
      ) {

        databaseDuplicates.push({

          question_number:
            item.question_number,

          question:
            item.question,

          reason:
            'database',

          existing_id:
            existing.id,

          existing_question:
            existing.question

        });


        continue;
      }


      uniqueQuestions.push(
        item
      );
    }


    return {

      uniqueQuestions,

      duplicates: [
        ...databaseDuplicates,
        ...batchDuplicates
      ]
    };
  }


  /* =========================================================
     VALIDATE + CHECK DUPLICATES
     ========================================================= */

  async function validate():
    Promise<void> {

    setResult(
      null
    );


    setDuplicateMatches(
      []
    );


    try {

      const parsedQuestions =
        parseInput();


      setCheckingDuplicates(
        true
      );


      setMessage(
        `Checking ${parsedQuestions.length} questions for duplicates...`
      );


      const checkResult =
        await checkDuplicates(
          parsedQuestions
        );


      setValidatedQuestions(
        checkResult.uniqueQuestions
      );


      setDuplicateMatches(
        checkResult.duplicates
      );


      if (
        checkResult.duplicates.length ===
        0
      ) {

        setMessage(
          `✓ ${checkResult.uniqueQuestions.length} questions validated. No duplicates found.`
        );


        return;
      }


      if (
        checkResult.uniqueQuestions.length ===
        0
      ) {

        setMessage(
          `⚠ All ${parsedQuestions.length} questions are already present or repeated. Nothing new can be imported.`
        );


        return;
      }


      setMessage(
        `✓ ${checkResult.uniqueQuestions.length} new question${
          checkResult.uniqueQuestions.length ===
            1
            ? ''
            : 's'
        } ready. ${checkResult.duplicates.length} duplicate question${
          checkResult.duplicates.length ===
            1
            ? ''
            : 's'
        } blocked.`
      );

    } catch (
      error
    ) {

      setValidatedQuestions(
        []
      );


      setDuplicateMatches(
        []
      );


      setMessage(
        error instanceof
          Error
          ? error.message
          : 'Validation failed.'
      );

    } finally {

      setCheckingDuplicates(
        false
      );
    }
  }


  /* =========================================================
     IMPORT METADATA
     ========================================================= */

  function buildMetadata(
    total: number
  ):
    Record<
      string,
      unknown
    > {

    const common = {

      source:
        source.trim(),

      source_url:
        sourceUrl.trim(),

      status,

      declared_total_questions:
        total
    };


    if (
      origin ===
      'cse'
    ) {

      return {

        ...common,

        pyq_year:
          year.trim(),

        paper:
          paper.trim(),

        exam_stage:
          'prelims'
      };
    }


    if (
      origin ===
      'upsc'
    ) {

      return {

        ...common,

        upsc_exam_name:
          examName.trim(),

        upsc_exam_year:
          year.trim(),

        upsc_exam_stage:
          'Preliminary',

        upsc_exam_paper:
          paper.trim()
      };
    }


    return {

      ...common,

      state_psc_state:
        stateName.trim(),

      state_psc_name:
        pscName.trim(),

      state_psc_exam_name:
        examName.trim(),

      state_psc_year:
        year.trim(),

      state_psc_stage:
        'Preliminary',

      state_psc_paper:
        paper.trim()
    };
  }


  /* =========================================================
     IMPORT PAPER
     ========================================================= */

  async function importPaper():
    Promise<void> {

    if (
      !supabase
    ) {

      setMessage(
        'Supabase is not configured.'
      );


      return;
    }


    const yearNumber =
      Number(
        year
      );


    if (
      !Number.isInteger(
        yearNumber
      ) ||
      yearNumber < 1950 ||
      yearNumber > 2100
    ) {

      setMessage(
        'Enter a valid examination year.'
      );


      return;
    }


    if (
      !paper.trim()
    ) {

      setMessage(
        'Enter paper name.'
      );


      return;
    }


    if (
      origin !==
        'cse' &&
      !examName.trim()
    ) {

      setMessage(
        'Enter examination name.'
      );


      return;
    }


    if (
      origin ===
        'state' &&
      (
        !stateName.trim() ||
        !pscName.trim()
      )
    ) {

      setMessage(
        'Enter State and PSC name.'
      );


      return;
    }


    if (
      validatedQuestions.length ===
      0
    ) {

      setMessage(
        duplicateMatches.length >
          0
          ? 'No new questions are available to import. Duplicate questions are blocked.'
          : 'Validate the paper before importing.'
      );


      return;
    }


    setImporting(
      true
    );


    setResult(
      null
    );


    setMessage(
      'Running final duplicate check...'
    );


    try {

      /*
       * SECOND CHECK immediately before writing to DB.
       */

      const finalCheck =
        await checkDuplicates(
          validatedQuestions
        );


      const questions =
        finalCheck.uniqueQuestions;


      const allDuplicates = [
        ...duplicateMatches,
        ...finalCheck.duplicates
      ];


      /*
       * Avoid displaying the same duplicate twice.
       */

      const seen =
        new Set<
          string
        >();


      const cleanDuplicates =
        allDuplicates.filter(
          item => {

            const key =
              `${item.reason}|${
                item.question_number
              }|${
                normalizeQuestionText(
                  item.question
                )
              }`;


            if (
              seen.has(
                key
              )
            ) {

              return false;
            }


            seen.add(
              key
            );


            return true;
          }
        );


      setDuplicateMatches(
        cleanDuplicates
      );


      setValidatedQuestions(
        questions
      );


      if (
        questions.length ===
        0
      ) {

        setMessage(
          '⚠ All questions were detected as duplicates. Nothing was imported.'
        );


        return;
      }


      const confirmed =
        window.confirm(
          `Import ${questions.length} new question${
            questions.length ===
              1
              ? ''
              : 's'
          } for ${year} ${paper}?${
            cleanDuplicates.length >
              0
              ? `\n\n${cleanDuplicates.length} duplicate question${
                  cleanDuplicates.length ===
                    1
                    ? ''
                    : 's'
                } will NOT be imported.`
              : ''
          }`
        );


      if (
        !confirmed
      ) {
        return;
      }


      setMessage(
        'Importing new questions...'
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
                buildMetadata(
                  questions.length
                ),

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


        setMessage(
          error.message
        );


        return;
      }


      const response =
        isRecord(
          data
        )
          ? data
          : {};


      const importResult:
        ImportResult = {

        total_questions:
          Number(
            response.total_questions ??
            questions.length
          ),

        created_new:
          Number(
            response.created_new ??
            0
          ),

        linked_existing:
          Number(
            response.linked_existing ??
            0
          ),

        already_linked:
          Number(
            response.already_linked ??
            0
          ),

        needs_review:
          Number(
            response.needs_review ??
            0
          )
      };


      setResult(
        importResult
      );


      setMessage(
        `✓ Import completed. ${questions.length} new question${
          questions.length ===
            1
            ? ''
            : 's'
        } processed.${
          cleanDuplicates.length >
            0
            ? ` ${cleanDuplicates.length} duplicate question${
                cleanDuplicates.length ===
                  1
                  ? ''
                  : 's'
              } blocked.`
            : ''
        }`
      );

    } catch (
      error
    ) {

      console.error(
        'PYQ import error:',
        error
      );


      setMessage(
        error instanceof
          Error
          ? error.message
          : 'Unable to import PYQ paper.'
      );

    } finally {

      setImporting(
        false
      );
    }
  }


  /* =========================================================
     SAMPLE
     ========================================================= */

  function insertSample():
    void {

    if (
      mode ===
      'easy'
    ) {

      setRawText(
`1. Which Article of the Constitution guarantees equality before law?
A. Article 12
B. Article 14
C. Article 19
D. Article 21
Answer: B
Explanation: Article 14 guarantees equality before law and equal protection of laws.
Subject: Polity
Topic: Fundamental Rights
Difficulty: Medium

2. Which institution publishes the Economic Survey of India?
A. Reserve Bank of India
B. NITI Aayog
C. Ministry of Finance
D. Finance Commission
Answer: C
Explanation: The Economic Survey is prepared under the Ministry of Finance.
Subject: Economy
Topic: Economic Survey
Difficulty: Easy`
      );

    } else {

      setRawText(
        JSON.stringify(
          [
            {
              question_number:
                '1',

              question:
                'Sample question',

              options: [
                'Option A',
                'Option B',
                'Option C',
                'Option D'
              ],

              correct_index:
                1,

              explanation:
                'Explanation',

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
          ],
          null,
          2
        )
      );
    }


    resetValidation();


    setMessage(
      'Sample inserted. Validate before import.'
    );
  }


  /* =========================================================
     CLEAR
     ========================================================= */

  function clearInput():
    void {

    setRawText(
      ''
    );


    resetValidation();


    setMessage(
      ''
    );
  }


  const compactGrid = {

    display:
      'grid',

    gridTemplateColumns:
      'repeat(auto-fit, minmax(150px, 1fr))',

    gap:
      '8px'
  };


  /* =========================================================
     UI
     ========================================================= */

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
            Duplicate questions are checked against the complete Prelims question bank before import.
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


      {/* =====================================================
          EXAM DETAILS
          ===================================================== */}

      <div
        style={{
          ...compactGrid,

          marginTop:
            '12px'
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
                  event
                    .target
                    .value as
                    ImportOrigin;


                setOrigin(
                  next
                );


                resetValidation();


                setMessage(
                  ''
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

                } else {

                  setPaper(
                    ''
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
              event => {

                setYear(
                  event.target.value
                );


                resetValidation();


                setMessage(
                  ''
                );
              }
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
                    event => {

                      setPaper(
                        event.target.value
                      );


                      resetValidation();


                      setMessage(
                        ''
                      );
                    }
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

              )
              : (

                <input
                  value={
                    paper
                  }
                  onChange={
                    event => {

                      setPaper(
                        event.target.value
                      );


                      resetValidation();


                      setMessage(
                        ''
                      );
                    }
                  }
                  placeholder="Paper name"
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
                  event
                    .target
                    .value as
                    PublishStatus
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


      {/* OTHER UPSC / STATE PSC */}

      {
        origin !==
          'cse' && (

        <div
          style={{
            ...compactGrid,

            marginTop:
              '8px'
          }}
        >

          {
            origin ===
              'state' && (

            <>

              <label>

                State

                <input
                  value={
                    stateName
                  }
                  onChange={
                    event => {

                      setStateName(
                        event.target.value
                      );


                      resetValidation();
                    }
                  }
                  placeholder="Maharashtra"
                />

              </label>


              <label>

                PSC

                <input
                  value={
                    pscName
                  }
                  onChange={
                    event => {

                      setPscName(
                        event.target.value
                      );


                      resetValidation();
                    }
                  }
                  placeholder="MPSC"
                />

              </label>

            </>

          )}


          <label>

            Examination

            <input
              value={
                examName
              }
              onChange={
                event => {

                  setExamName(
                    event.target.value
                  );


                  resetValidation();
                }
              }
              placeholder={
                origin ===
                  'state'
                  ? 'State Services'
                  : 'CAPF / CDS / NDA'
              }
            />

          </label>

        </div>

      )}


      {/* ADVANCED */}

      {
        advancedOpen && (

        <div
          style={{
            ...compactGrid,

            marginTop:
              '8px'
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
                    event.target.value
                  )
              }
              placeholder="https://..."
            />

          </label>

        </div>

      )}


      {/* =====================================================
          INPUT MODE
          ===================================================== */}

      <div
        style={{
          display:
            'grid',

          gridTemplateColumns:
            'repeat(2, minmax(0, 1fr))',

          gap:
            '8px',

          marginTop:
            '12px'
        }}
      >

        <button
          type="button"
          className={
            mode ===
              'easy'
              ? 'filter active'
              : 'filter'
          }
          onClick={() => {

            setMode(
              'easy'
            );


            resetValidation();


            setMessage(
              ''
            );

          }}
        >
          Easy Paste
        </button>


        <button
          type="button"
          className={
            mode ===
              'json'
              ? 'filter active'
              : 'filter'
          }
          onClick={() => {

            setMode(
              'json'
            );


            resetValidation();


            setMessage(
              ''
            );

          }}
        >
          JSON
        </button>

      </div>


      {/* =====================================================
          QUESTION INPUT
          ===================================================== */}

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

          marginTop:
            '12px',

          marginBottom:
            '6px'
        }}
      >

        <strong>
          {
            mode ===
              'easy'
              ? 'Paste Complete Question Paper'
              : 'Paste Question JSON'
          }
        </strong>


        <div
          style={{
            display:
              'flex',

            gap:
              '8px',

            alignItems:
              'center'
          }}
        >

          {
            detectedCount >
            0 && (

            <span
              className="tag"
            >
              {
                detectedCount
              } detected
            </span>

          )}


          <button
            type="button"
            className="text-btn"
            onClick={
              insertSample
            }
          >
            Sample
          </button>

        </div>

      </div>


      <textarea
        rows={
          12
        }
        spellCheck={
          false
        }
        value={
          rawText
        }
        onChange={
          event => {

            setRawText(
              event.target.value
            );


            resetValidation();


            setMessage(
              ''
            );
          }
        }
        placeholder={
          mode ===
            'easy'
            ? `1. Question text...
A. Option A
B. Option B
C. Option C
D. Option D
Answer: B
Explanation: ...
Subject: Polity
Topic: Constitution
Difficulty: Medium`
            : `[
  {
    "question_number": "1",
    "question": "...",
    "options": ["A", "B", "C", "D"],
    "correct_index": 0,
    "explanation": "...",
    "subject": "Polity",
    "topic": "Constitution",
    "difficulty": "medium"
  }
]`
        }
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


      {/* MESSAGE */}

      {
        message && (

        <div
          className="callout"
          style={{
            marginTop:
              '10px'
          }}
        >
          {
            message
          }
        </div>

      )}


      {/* DUPLICATES */}

      <DuplicatePreview
        duplicates={
          duplicateMatches
        }
      />


      {/* NEW QUESTIONS */}

      {
        validatedQuestions.length >
        0 && (

        <PyqImportPreview
          questions={
            validatedQuestions
          }
        />

      )}


      {/* IMPORT RESULT */}

      {
        result && (

        <div
          style={{
            display:
              'grid',

            gridTemplateColumns:
              'repeat(4, minmax(0, 1fr))',

            gap:
              '8px',

            marginTop:
              '10px'
          }}
        >

          <div
            className="callout"
          >

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


          <div
            className="callout"
          >

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


          <div
            className="callout"
          >

            <small>
              Existing
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


          <div
            className="callout"
          >

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

      )}


      {/* =====================================================
          BUTTONS
          ===================================================== */}

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

          marginTop:
            '12px'
        }}
      >

        <button
          type="button"
          className="secondary-btn"
          onClick={
            clearInput
          }
          disabled={
            importing ||
            checkingDuplicates
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
            disabled={
              importing ||
              checkingDuplicates ||
              !rawText.trim()
            }
            onClick={() =>
              void validate()
            }
          >
            {
              checkingDuplicates
                ? 'Checking Duplicates...'
                : 'Validate & Check Duplicates'
            }
          </button>


          <button
            type="button"
            className="primary-btn"
            disabled={
              importing ||
              checkingDuplicates ||
              validatedQuestions.length ===
                0
            }
            onClick={() =>
              void importPaper()
            }
          >
            {
              importing
                ? 'Importing...'
                : validatedQuestions.length >
                  0
                ? `Import ${
                    validatedQuestions.length
                  } New Question${
                    validatedQuestions.length ===
                      1
                      ? ''
                      : 's'
                  }`
                : 'Validate Before Import'
            }
          </button>

        </div>

      </div>

    </section>
  );
}


export default PrelimsPyqQuickImport;

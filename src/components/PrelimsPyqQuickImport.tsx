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


function answerLetter(
  index: number
): string {
  if (
    !Number.isInteger(index) ||
    index < 0
  ) {
    return '-';
  }

  return String.fromCharCode(
    65 + index
  );
}


function newDraft(
  questionNumber: string
): DraftQuestion {
  return {
    questionNumber,
    questionLines: [],
    options: [],
    correctLetter: '',
    explanationLines: [],
    subject: 'General Studies',
    topic: '',
    difficulty: 'medium'
  };
}


function finaliseDraft(
  draft: DraftQuestion,
  fallbackNumber: number
): QuestionPayload {
  const question =
    draft.questionLines
      .join(' ')
      .trim();

  if (!question) {
    throw new Error(
      `Question ${draft.questionNumber || fallbackNumber} has no question text.`
    );
  }

  if (
    draft.options.length < 2
  ) {
    throw new Error(
      `Question ${draft.questionNumber || fallbackNumber} needs at least two options.`
    );
  }

  if (
    !draft.correctLetter
  ) {
    throw new Error(
      `Question ${draft.questionNumber || fallbackNumber} has no Answer field.`
    );
  }

  const correctIndex =
    draft.correctLetter
      .toUpperCase()
      .charCodeAt(0) - 65;

  if (
    correctIndex < 0 ||
    correctIndex >= draft.options.length
  ) {
    throw new Error(
      `Question ${draft.questionNumber || fallbackNumber} has an invalid answer.`
    );
  }

  return {
    question_number:
      draft.questionNumber ||
      String(fallbackNumber),
    question,
    options:
      draft.options,
    correct_index:
      correctIndex,
    explanation:
      draft.explanationLines
        .join(' ')
        .trim(),
    subject:
      draft.subject.trim() ||
      'General Studies',
    topic:
      draft.topic.trim(),
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
): QuestionPayload[] {
  const text =
    rawText
      .replace(/\r/g, '')
      .trim();

  if (!text) {
    throw new Error(
      'Paste the question paper first.'
    );
  }

  const lines =
    text.split('\n');

  const questions:
    QuestionPayload[] =
    [];

  let current:
    DraftQuestion |
    null =
    null;

  let section:
    'question' |
    'options' |
    'explanation' =
    'question';

  function flush():
    void {
    if (!current) {
      return;
    }

    questions.push(
      finaliseDraft(
        current,
        questions.length + 1
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

    if (!line) {
      continue;
    }

    if (
      line === '---' ||
      line === '==='
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
      if (current) {
        flush();
      }

      current =
        newDraft(
          questionMatch[1]
        );

      current.questionLines.push(
        questionMatch[2]
      );

      section =
        'question';

      continue;
    }

    if (!current) {
      current =
        newDraft(
          String(
            questions.length + 1
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
      current.options.push(
        optionMatch[2].trim()
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
        answerMatch[1]
          .toUpperCase();

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
        explanationMatch[1]
      ) {
        current.explanationLines.push(
          explanationMatch[1]
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
        subjectMatch[1].trim();

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
        topicMatch[1].trim();

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
        difficultyMatch[1]
          .toLowerCase() as
          Difficulty;

      continue;
    }

    if (
      section ===
      'explanation'
    ) {
      current.explanationLines.push(
        line
      );

      continue;
    }

    if (
      section ===
        'options' &&
      current.options.length > 0
    ) {
      const lastIndex =
        current.options.length - 1;

      current.options[lastIndex] =
        `${current.options[lastIndex]} ${line}`;

      continue;
    }

    current.questionLines.push(
      line
    );
  }

  flush();

  if (
    questions.length === 0
  ) {
    throw new Error(
      'No questions could be detected.'
    );
  }

  if (
    questions.length > 250
  ) {
    throw new Error(
      'Maximum 250 questions can be imported at one time.'
    );
  }

  return questions;
}


function parseJsonText(
  rawText: string
): QuestionPayload[] {
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
    Array.isArray(parsed)
  ) {
    items =
      parsed;
  } else if (
    isRecord(parsed) &&
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
    items.length === 0
  ) {
    throw new Error(
      'No questions found.'
    );
  }

  if (
    items.length > 250
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
        !isRecord(item)
      ) {
        throw new Error(
          `Question ${index + 1} is invalid.`
        );
      }

      const question =
        safeString(
          item.question
        ).trim();

      if (!question) {
        throw new Error(
          `Question ${index + 1} has no text.`
        );
      }

      if (
        !Array.isArray(
          item.options
        )
      ) {
        throw new Error(
          `Question ${index + 1} has no options array.`
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
        options.length < 2
      ) {
        throw new Error(
          `Question ${index + 1} needs at least two options.`
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
            index + 1
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
            : [
                'PYQ',
                'Prelims'
              ]
      };
    }
  );
}


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
    useState(false);

  if (
    questions.length === 0
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
        !item.explanation.trim()
    ).length;

  const withoutTopic =
    questions.filter(
      item =>
        !item.topic.trim()
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
            IMPORT PREVIEW
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
            } questions ready
          </strong>
        </div>

        {
          questions.length > 8 && (
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
                  : `Show All ${questions.length}`
              }
            </button>
          )
        }
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
        <div className="callout">
          <small>
            Questions
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

        <div className="callout">
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

        <div className="callout">
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
                    `${item.question_number}-${index}`
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
                    Q{
                      item.question_number ||
                      index + 1
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
        questions.length > 8 && (
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
        )
      }
    </section>
  );
}


export function PrelimsPyqQuickImport() {
  const [
    mode,
    setMode
  ] =
    useState<InputMode>(
      'easy'
    );

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

  const [
    sourceUrl,
    setSourceUrl
  ] =
    useState(
      ''
    );

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
    useState(
      ''
    );

  const [
    stateName,
    setStateName
  ] =
    useState(
      ''
    );

  const [
    pscName,
    setPscName
  ] =
    useState(
      ''
    );

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
    message,
    setMessage
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


  function validate():
    QuestionPayload[] |
    null {
    setResult(
      null
    );

    try {
      const questions =
        parseInput();

      setValidatedQuestions(
        questions
      );

      setMessage(
        `✓ ${questions.length} questions validated successfully.`
      );

      return questions;
    } catch (
      error
    ) {
      setValidatedQuestions(
        []
      );

      setMessage(
        error instanceof Error
          ? error.message
          : 'Validation failed.'
      );

      return null;
    }
  }


  function buildMetadata(
    total: number
  ):
    Record<string, unknown> {
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
        'Validate the paper before importing.'
      );
      return;
    }

    const questions =
      validatedQuestions;

    const confirmed =
      window.confirm(
        `Import ${questions.length} questions for ${year} ${paper}?`
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

    setMessage(
      'Importing paper...'
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

      setImporting(
        false
      );

      return;
    }

    const response =
      isRecord(data)
        ? data
        : {};

    const importResult:
      ImportResult =
      {
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
      `✓ Import completed. ${importResult.total_questions ?? questions.length} questions processed.`
    );

    setImporting(
      false
    );
  }


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

    setValidatedQuestions(
      []
    );

    setResult(
      null
    );

    setMessage(
      'Sample inserted. Validate before import.'
    );
  }


  function clearInput():
    void {
    setRawText(
      ''
    );

    setValidatedQuestions(
      []
    );

    setResult(
      null
    );

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
            Paste normal question text.
            JSON knowledge is not required.
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
                  event.target
                    .value as
                    ImportOrigin;

                setOrigin(
                  next
                );

                setValidatedQuestions(
                  []
                );

                setResult(
                  null
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
              event => {
                setYear(
                  event.target.value
                );

                setValidatedQuestions(
                  []
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

                      setValidatedQuestions(
                        []
                      );
                    }
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
                    event => {
                      setPaper(
                        event.target.value
                      );

                      setValidatedQuestions(
                        []
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
                        pscName
                      }
                      onChange={
                        event =>
                          setPscName(
                            event.target.value
                          )
                      }
                      placeholder="MPSC"
                    />
                  </label>
                </>
              )
            }

            <label>
              Examination

              <input
                value={
                  examName
                }
                onChange={
                  event =>
                    setExamName(
                      event.target.value
                    )
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
        )
      }

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
        )
      }

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

            setValidatedQuestions(
              []
            );

            setResult(
              null
            );

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

            setValidatedQuestions(
              []
            );

            setResult(
              null
            );

            setMessage(
              ''
            );
          }}
        >
          JSON
        </button>
      </div>

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
            detectedCount > 0 && (
              <span className="tag">
                {
                  detectedCount
                } detected
              </span>
            )
          }

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
        rows={12}
        spellCheck={false}
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

            setResult(
              null
            );

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
    "correct_index": 0
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
        validatedQuestions.length > 0 && (
          <PyqImportPreview
            questions={
              validatedQuestions
            }
          />
        )
      }

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
            disabled={
              importing ||
              !rawText.trim()
            }
            onClick={
              validate
            }
          >
            Validate
          </button>

          <button
            type="button"
            className="primary-btn"
            disabled={
              importing ||
              validatedQuestions.length === 0
            }
            onClick={() =>
              void importPaper()
            }
          >
            {
              importing
                ? 'Importing...'
                : validatedQuestions.length > 0
                  ? `Import ${validatedQuestions.length} Questions`
                  : 'Validate Before Import'
            }
          </button>
        </div>
      </div>
    </section>
  );
}


export default PrelimsPyqQuickImport;

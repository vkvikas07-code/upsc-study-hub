import {
  useMemo,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


type ImportStatus =
  | 'draft'
  | 'published';


type PaperType =
  | 'essay'
  | 'gs'
  | 'optional'
  | 'language'
  | 'other';


type CsvRow =
  Record<string, string>;


type ParsedPyq = {
  examAuthority: string;
  examName: string;
  stateName: string | null;

  year: number;

  paperType: PaperType;
  paperName: string;

  gsPaper: string | null;

  optionalSubject:
    string |
    null;

  optionalPaper:
    string |
    null;

  essaySection:
    string |
    null;

  questionNumber:
    string |
    null;

  subject: string;

  topic:
    string |
    null;

  subtopic:
    string |
    null;

  question: string;

  marks:
    number |
    null;

  wordLimit:
    number |
    null;

  relevantGsPapers:
    string[];

  sourceUrl:
    string |
    null;

  status:
    ImportStatus;

  rowNumber:
    number;
};


type PaperRecord = {
  id: string;

  year: number;

  exam_authority:
    string |
    null;

  exam_name:
    string |
    null;

  state_name:
    string |
    null;

  paper_type:
    string;

  paper_name:
    string |
    null;

  gs_paper:
    string |
    null;

  optional_subject:
    string |
    null;

  optional_paper:
    string |
    null;
};


type ExistingQuestion = {
  pyq_year:
    number |
    null;

  exam_authority:
    string |
    null;

  exam_name:
    string |
    null;

  section_type:
    string;

  paper_name:
    string |
    null;

  gs_paper:
    string |
    null;

  optional_subject:
    string |
    null;

  optional_paper:
    string |
    null;

  question_number:
    string |
    null;

  question:
    string;
};


const PAGE_SIZE =
  1000;


const INSERT_SIZE =
  100;


const SAMPLE_HEADER =
  'exam_authority,exam_name,state_name,year,paper_type,paper_name,gs_paper,optional_subject,optional_paper,essay_section,question_number,subject,topic,subtopic,question,marks,word_limit,relevant_gs_papers,source_url,status';


const UPSC_SAMPLE =
  'UPSC,Civil Services Examination,,2025,gs,GS-I,GS-I,,,,1,History,Ancient India,Harappan Civilisation,"Paste exact official question here",10,150,GS-I,https://upsc.gov.in/,draft';


const STATE_SAMPLE =
  'MPSC,State Services Examination,Maharashtra,2024,gs,General Studies-I,,,,,1,History,Modern India,Maharashtra Reform Movement,"Paste exact official State PSC question here",10,150,GS-I,,draft';


function clean(
  value:
    string |
    undefined |
    null
) {

  return (
    value ||
    ''
  )
    .replace(
      /^\uFEFF/,
      ''
    )
    .trim();
}


function normalizeHeader(
  value:
    string
) {

  return clean(
    value
  )
    .toLowerCase()
    .replace(
      /[\s-]+/g,
      '_'
    );
}


function parseCsv(
  input:
    string
) {

  const table:
    string[][] = [];

  let row:
    string[] = [];

  let cell =
    '';

  let quoted =
    false;


  for (
    let index = 0;
    index < input.length;
    index += 1
  ) {

    const char =
      input[index];


    if (
      char ===
      '"'
    ) {

      if (
        quoted &&
        input[index + 1] ===
          '"'
      ) {

        cell +=
          '"';

        index +=
          1;

      } else {

        quoted =
          !quoted;
      }

      continue;
    }


    if (
      char ===
        ',' &&
      !quoted
    ) {

      row.push(
        cell
      );

      cell =
        '';

      continue;
    }


    if (
      (
        char ===
          '\n' ||
        char ===
          '\r'
      ) &&
      !quoted
    ) {

      if (
        char ===
          '\r' &&
        input[index + 1] ===
          '\n'
      ) {

        index +=
          1;
      }


      row.push(
        cell
      );


      if (
        row.some(
          value =>
            Boolean(
              clean(
                value
              )
            )
        )
      ) {

        table.push(
          row
        );
      }


      row =
        [];

      cell =
        '';

      continue;
    }


    cell +=
      char;
  }


  row.push(
    cell
  );


  if (
    row.some(
      value =>
        Boolean(
          clean(
            value
          )
        )
    )
  ) {

    table.push(
      row
    );
  }


  if (
    table.length <
      2
  ) {

    return [];
  }


  const headers =
    table[0].map(
      normalizeHeader
    );


  return table
    .slice(
      1
    )
    .map(
      values => {

        const result:
          CsvRow = {};


        headers.forEach(
          (
            header,
            index
          ) => {

            result[header] =
              clean(
                values[index]
              );
          }
        );


        return result;
      }
    );
}


function normalizePaperType(
  value:
    string
):
  PaperType |
  null {

  const normalized =
    clean(
      value
    )
      .toLowerCase()
      .replace(
        /[\s_-]+/g,
        ''
      );


  if (
    normalized ===
    'essay'
  ) {

    return 'essay';
  }


  if (
    normalized ===
      'gs' ||
    normalized ===
      'generalstudies'
  ) {

    return 'gs';
  }


  if (
    normalized ===
    'optional'
  ) {

    return 'optional';
  }


  if (
    normalized ===
      'language' ||
    normalized ===
      'languages'
  ) {

    return 'language';
  }


  if (
    normalized ===
      'other' ||
    normalized ===
      'otherpaper'
  ) {

    return 'other';
  }


  return null;
}


function normalizeGsPaper(
  value:
    string
):
  string |
  null {

  const raw =
    clean(
      value
    );


  if (
    !raw
  ) {

    return null;
  }


  const normalized =
    raw
      .toUpperCase()
      .replace(
        /[\s_-]+/g,
        ''
      );


  if (
    [
      'GS1',
      'GSI'
    ].includes(
      normalized
    )
  ) {

    return 'GS-I';
  }


  if (
    [
      'GS2',
      'GSII'
    ].includes(
      normalized
    )
  ) {

    return 'GS-II';
  }


  if (
    [
      'GS3',
      'GSIII'
    ].includes(
      normalized
    )
  ) {

    return 'GS-III';
  }


  if (
    [
      'GS4',
      'GSIV'
    ].includes(
      normalized
    )
  ) {

    return 'GS-IV';
  }


  /*
   * State PSC may have GS-V, GS-VI, etc.
   * Keep the original label.
   */
  return raw;
}


function normalizeOptionalPaper(
  value:
    string
) {

  const raw =
    clean(
      value
    );


  if (
    !raw
  ) {

    return null;
  }


  const normalized =
    raw
      .toLowerCase()
      .replace(
        /[\s_-]+/g,
        ''
      );


  if (
    [
      'paper1',
      'paperi',
      '1',
      'i'
    ].includes(
      normalized
    )
  ) {

    return 'Paper-I';
  }


  if (
    [
      'paper2',
      'paperii',
      '2',
      'ii'
    ].includes(
      normalized
    )
  ) {

    return 'Paper-II';
  }


  /*
   * Some State PSC examinations may use
   * another optional-paper naming pattern.
   */
  return raw;
}


function normalizeStatus(
  value:
    string,
  fallback:
    ImportStatus
):
  ImportStatus {

  const normalized =
    clean(
      value
    )
      .toLowerCase();


  if (
    normalized ===
    'published'
  ) {

    return 'published';
  }


  if (
    normalized ===
    'draft'
  ) {

    return 'draft';
  }


  return fallback;
}


function numberOrNull(
  value:
    string
) {

  const cleaned =
    clean(
      value
    );


  if (
    !cleaned
  ) {

    return null;
  }


  const parsed =
    Number(
      cleaned
    );


  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;
}


function relevantGs(
  value:
    string
): string[] {

  const result:
    string[] = [];


  clean(
    value
  )
    .split(
      /[|;,]+/
    )
    .forEach(
      part => {

        const normalized =
          normalizeGsPaper(
            part
          );


        if (
          normalized &&
          [
            'GS-I',
            'GS-II',
            'GS-III',
            'GS-IV'
          ].includes(
            normalized
          )
        ) {

          result.push(
            normalized
          );
        }
      }
    );


  return Array.from(
    new Set(
      result
    )
  );
}


function derivePaperName(
  paperType:
    PaperType,
  rawPaperName:
    string,
  rawGsPaper:
    string,
  optionalSubject:
    string |
    null,
  optionalPaper:
    string |
    null,
  subject:
    string
) {

  const supplied =
    clean(
      rawPaperName
    );


  if (
    supplied
  ) {

    return supplied;
  }


  if (
    paperType ===
    'essay'
  ) {

    return 'Essay';
  }


  if (
    paperType ===
    'gs'
  ) {

    return (
      clean(
        rawGsPaper
      ) ||
      'General Studies'
    );
  }


  if (
    paperType ===
    'optional'
  ) {

    return [
      optionalSubject,
      optionalPaper
    ]
      .filter(
        Boolean
      )
      .join(
        ' '
      );
  }


  if (
    paperType ===
    'language'
  ) {

    return (
      subject ||
      'Language'
    );
  }


  return '';
}


function validateRows(
  rows:
    CsvRow[],
  defaultStatus:
    ImportStatus
) {

  const valid:
    ParsedPyq[] = [];

  const errors:
    string[] = [];


  rows.forEach(
    (
      row,
      index
    ) => {

      const rowNumber =
        index +
        2;


      /*
       * EXAM AUTHORITY
       */

      const examAuthority =
        clean(
          row.exam_authority
        ) ||
        'UPSC';


      const isUpsc =
        examAuthority
          .toUpperCase() ===
        'UPSC';


      const examName =
        clean(
          row.exam_name
        ) ||
        (
          isUpsc
            ? 'Civil Services Examination'
            : ''
        );


      if (
        !examName
      ) {

        errors.push(
          `Row ${rowNumber}: exam_name is required for State PSC examinations.`
        );

        return;
      }


      const stateName =
        clean(
          row.state_name
        ) ||
        null;


      if (
        !isUpsc &&
        !stateName
      ) {

        errors.push(
          `Row ${rowNumber}: state_name is required for State PSC examinations.`
        );

        return;
      }


      /*
       * YEAR
       */

      const year =
        Number(
          clean(
            row.year
          )
        );


      if (
        !Number.isInteger(
          year
        ) ||
        year <
          1950 ||
        year >
          2100
      ) {

        errors.push(
          `Row ${rowNumber}: invalid year.`
        );

        return;
      }


      /*
       * PAPER TYPE
       */

      const paperType =
        normalizePaperType(
          row.paper_type
        );


      if (
        !paperType
      ) {

        errors.push(
          `Row ${rowNumber}: paper_type must be essay, gs, optional, language or other.`
        );

        return;
      }


      /*
       * GS PAPER
       */

      const rawGsPaper =
        clean(
          row.gs_paper
        );


      let gsPaper:
        string |
        null =
          null;


      if (
        paperType ===
        'gs' &&
        rawGsPaper
      ) {

        gsPaper =
          normalizeGsPaper(
            rawGsPaper
          );
      }


      /*
       * Existing UPSC structure requires
       * GS-I to GS-IV.
       */

      if (
        isUpsc &&
        paperType ===
          'gs'
      ) {

        const normalizedUpscGs =
          normalizeGsPaper(
            rawGsPaper
          );


        if (
          !normalizedUpscGs ||
          ![
            'GS-I',
            'GS-II',
            'GS-III',
            'GS-IV'
          ].includes(
            normalizedUpscGs
          )
        ) {

          errors.push(
            `Row ${rowNumber}: UPSC GS paper must be GS-I, GS-II, GS-III or GS-IV.`
          );

          return;
        }


        gsPaper =
          normalizedUpscGs;
      }


      /*
       * OPTIONAL
       */

      let optionalSubject:
        string |
        null =
          null;


      let optionalPaper:
        string |
        null =
          null;


      if (
        paperType ===
        'optional'
      ) {

        optionalSubject =
          clean(
            row.optional_subject
          ) ||
          null;


        optionalPaper =
          normalizeOptionalPaper(
            row.optional_paper
          );


        if (
          !optionalSubject
        ) {

          errors.push(
            `Row ${rowNumber}: optional_subject is required.`
          );

          return;
        }


        if (
          !optionalPaper
        ) {

          errors.push(
            `Row ${rowNumber}: optional_paper is required.`
          );

          return;
        }


        if (
          isUpsc &&
          ![
            'Paper-I',
            'Paper-II'
          ].includes(
            optionalPaper
          )
        ) {

          errors.push(
            `Row ${rowNumber}: UPSC Optional paper must be Paper-I or Paper-II.`
          );

          return;
        }
      }


      /*
       * SUBJECT
       */

      let subject =
        clean(
          row.subject
        );


      if (
        !subject &&
        paperType ===
          'optional'
      ) {

        subject =
          optionalSubject ||
          '';
      }


      if (
        !subject &&
        paperType ===
          'essay'
      ) {

        subject =
          'Essay';
      }


      if (
        !subject
      ) {

        errors.push(
          `Row ${rowNumber}: subject is required.`
        );

        return;
      }


      /*
       * PAPER NAME
       */

      const paperName =
        derivePaperName(
          paperType,
          row.paper_name,
          rawGsPaper,
          optionalSubject,
          optionalPaper,
          subject
        );


      if (
        !paperName
      ) {

        errors.push(
          `Row ${rowNumber}: paper_name is required.`
        );

        return;
      }


      /*
       * QUESTION
       */

      const question =
        clean(
          row.question
        );


      if (
        !question
      ) {

        errors.push(
          `Row ${rowNumber}: question is required.`
        );

        return;
      }


      valid.push({

        examAuthority,

        examName,

        stateName,

        year,

        paperType,

        paperName,

        gsPaper,

        optionalSubject,

        optionalPaper,

        essaySection:
          paperType ===
            'essay'
            ? clean(
                row.essay_section
              ) ||
              null
            : null,

        questionNumber:
          clean(
            row.question_number
          ) ||
          null,

        subject,

        topic:
          clean(
            row.topic
          ) ||
          null,

        subtopic:
          clean(
            row.subtopic
          ) ||
          null,

        question,

        marks:
          numberOrNull(
            row.marks
          ),

        wordLimit:
          numberOrNull(
            row.word_limit
          ),

        relevantGsPapers:
          relevantGs(
            row.relevant_gs_papers
          ),

        sourceUrl:
          clean(
            row.source_url ||
            row.official_source_url
          ) ||
          null,

        status:
          normalizeStatus(
            row.status,
            defaultStatus
          ),

        rowNumber
      });

    }
  );


  return {
    valid,
    errors
  };
}


function normalizeKeyPart(
  value:
    string |
    null |
    undefined
) {

  return clean(
    value
  )
    .toLowerCase()
    .replace(
      /\s+/g,
      ' '
    );
}


function makePaperKey(
  item: {
    examAuthority:
      string;

    examName:
      string;

    year:
      number;

    paperType:
      string;

    paperName:
      string;

    gsPaper:
      string |
      null;

    optionalSubject:
      string |
      null;

    optionalPaper:
      string |
      null;
  }
) {

  return [
    normalizeKeyPart(
      item.examAuthority
    ),

    normalizeKeyPart(
      item.examName
    ),

    String(
      item.year
    ),

    normalizeKeyPart(
      item.paperType
    ),

    normalizeKeyPart(
      item.paperName
    ),

    normalizeKeyPart(
      item.gsPaper
    ),

    normalizeKeyPart(
      item.optionalSubject
    ),

    normalizeKeyPart(
      item.optionalPaper
    )

  ].join(
    '|'
  );
}


function paperKeyFromRecord(
  item:
    PaperRecord
) {

  const authority =
    clean(
      item.exam_authority
    ) ||
    'UPSC';


  const examName =
    clean(
      item.exam_name
    ) ||
    (
      authority
        .toUpperCase() ===
        'UPSC'
        ? 'Civil Services Examination'
        : ''
    );


  const paperName =
    clean(
      item.paper_name
    ) ||
    (
      item.paper_type ===
        'essay'
        ? 'Essay'
        : item.gs_paper ||
          [
            item.optional_subject,
            item.optional_paper
          ]
            .filter(
              Boolean
            )
            .join(
              ' '
            )
    );


  return makePaperKey({

    examAuthority:
      authority,

    examName,

    year:
      item.year,

    paperType:
      item.paper_type,

    paperName,

    gsPaper:
      item.gs_paper,

    optionalSubject:
      item.optional_subject,

    optionalPaper:
      item.optional_paper
  });
}


function makeQuestionKey(
  item: {
    examAuthority:
      string;

    examName:
      string;

    year:
      number;

    paperType:
      string;

    paperName:
      string;

    optionalSubject:
      string |
      null;

    optionalPaper:
      string |
      null;

    questionNumber:
      string |
      null;

    question:
      string;
  }
) {

  return [
    normalizeKeyPart(
      item.examAuthority
    ),

    normalizeKeyPart(
      item.examName
    ),

    String(
      item.year
    ),

    normalizeKeyPart(
      item.paperType
    ),

    normalizeKeyPart(
      item.paperName
    ),

    normalizeKeyPart(
      item.optionalSubject
    ),

    normalizeKeyPart(
      item.optionalPaper
    ),

    normalizeKeyPart(
      item.questionNumber
    ),

    normalizeKeyPart(
      item.question
    )

  ].join(
    '|'
  );
}


function questionKeyFromRecord(
  item:
    ExistingQuestion
) {

  const authority =
    clean(
      item.exam_authority
    ) ||
    'UPSC';


  const examName =
    clean(
      item.exam_name
    ) ||
    (
      authority
        .toUpperCase() ===
        'UPSC'
        ? 'Civil Services Examination'
        : ''
    );


  const paperName =
    clean(
      item.paper_name
    ) ||
    (
      item.section_type ===
        'essay'
        ? 'Essay'
        : item.gs_paper ||
          [
            item.optional_subject,
            item.optional_paper
          ]
            .filter(
              Boolean
            )
            .join(
              ' '
            )
    );


  return makeQuestionKey({

    examAuthority:
      authority,

    examName,

    year:
      item.pyq_year ||
      0,

    paperType:
      item.section_type,

    paperName,

    optionalSubject:
      item.optional_subject,

    optionalPaper:
      item.optional_paper,

    questionNumber:
      item.question_number,

    question:
      item.question
  });
}


async function loadAllPapers() {

  if (
    !supabase
  ) {

    return [];
  }


  const results:
    PaperRecord[] = [];


  let from =
    0;


  while (
    true
  ) {

    const {
      data,
      error
    } =
      await supabase
        .from(
          'mains_pyq_papers'
        )
        .select(`
          id,
          year,
          exam_authority,
          exam_name,
          state_name,
          paper_type,
          paper_name,
          gs_paper,
          optional_subject,
          optional_paper
        `)
        .range(
          from,
          from +
            PAGE_SIZE -
            1
        );


    if (
      error
    ) {

      throw error;
    }


    const page =
      (
        data ||
        []
      ) as PaperRecord[];


    results.push(
      ...page
    );


    if (
      page.length <
      PAGE_SIZE
    ) {

      break;
    }


    from +=
      PAGE_SIZE;
  }


  return results;
}


async function loadAllPyqQuestions() {

  if (
    !supabase
  ) {

    return [];
  }


  const results:
    ExistingQuestion[] = [];


  let from =
    0;


  while (
    true
  ) {

    const {
      data,
      error
    } =
      await supabase
        .from(
          'mains_questions'
        )
        .select(`
          pyq_year,
          exam_authority,
          exam_name,
          section_type,
          paper_name,
          gs_paper,
          optional_subject,
          optional_paper,
          question_number,
          question
        `)
        .eq(
          'question_type',
          'pyq'
        )
        .range(
          from,
          from +
            PAGE_SIZE -
            1
        );


    if (
      error
    ) {

      throw error;
    }


    const page =
      (
        data ||
        []
      ) as ExistingQuestion[];


    results.push(
      ...page
    );


    if (
      page.length <
      PAGE_SIZE
    ) {

      break;
    }


    from +=
      PAGE_SIZE;
  }


  return results;
}


function chunks<T>(
  values:
    T[],
  size:
    number
) {

  const result:
    T[][] = [];


  for (
    let index = 0;
    index < values.length;
    index += size
  ) {

    result.push(
      values.slice(
        index,
        index +
          size
      )
    );
  }


  return result;
}


export function MainsPyqBulkImporter() {

  const [
    defaultStatus,
    setDefaultStatus
  ] =
    useState<ImportStatus>(
      'draft'
    );


  const [
    fileName,
    setFileName
  ] =
    useState('');


  const [
    rows,
    setRows
  ] =
    useState<CsvRow[]>(
      []
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
    insertedCount,
    setInsertedCount
  ] =
    useState(
      0
    );


  const [
    duplicateCount,
    setDuplicateCount
  ] =
    useState(
      0
    );


  const validation =
    useMemo(
      () =>
        validateRows(
          rows,
          defaultStatus
        ),
      [
        rows,
        defaultStatus
      ]
    );


  async function selectFile(
    file:
      File |
      undefined
  ) {

    if (
      !file
    ) {

      return;
    }


    setFileName(
      file.name
    );

    setMessage(
      'Reading CSV...'
    );

    setInsertedCount(
      0
    );

    setDuplicateCount(
      0
    );


    try {

      const text =
        await file.text();


      const parsed =
        parseCsv(
          text
        );


      setRows(
        parsed
      );


      if (
        parsed.length ===
        0
      ) {

        setMessage(
          'No CSV data rows found.'
        );

        return;
      }


      setMessage(
        `CSV loaded: ${parsed.length} row(s).`
      );

    } catch (
      error
    ) {

      setRows(
        []
      );

      setMessage(
        error instanceof
          Error
          ? error.message
          : 'Unable to read CSV.'
      );
    }
  }


  async function importQuestions() {

    if (
      !supabase
    ) {

      setMessage(
        'Supabase is not configured.'
      );

      return;
    }


    if (
      validation.valid.length ===
      0
    ) {

      setMessage(
        'There are no valid rows to import.'
      );

      return;
    }


    setImporting(
      true
    );

    setInsertedCount(
      0
    );

    setDuplicateCount(
      0
    );

    setMessage(
      'Preparing PYQ import...'
    );


    try {

      const {
        data: {
          user
        }
      } =
        await supabase
          .auth
          .getUser();


      if (
        !user
      ) {

        throw new Error(
          'Admin session expired. Sign in again.'
        );
      }


      /*
       * LOAD PAPER MASTER
       */

      let allPapers =
        await loadAllPapers();


      let paperMap =
        new Map<
          string,
          string
        >();


      allPapers.forEach(
        paper => {

          paperMap.set(
            paperKeyFromRecord(
              paper
            ),
            paper.id
          );
        }
      );


      /*
       * CREATE MISSING PAPERS
       */

      const missingPapers =
        new Map<
          string,
          ParsedPyq
        >();


      validation.valid.forEach(
        item => {

          const key =
            makePaperKey(
              item
            );


          if (
            !paperMap.has(
              key
            ) &&
            !missingPapers.has(
              key
            )
          ) {

            missingPapers.set(
              key,
              item
            );
          }
        }
      );


      const missingValues =
        Array.from(
          missingPapers.values()
        );


      for (
        const batch of chunks(
          missingValues,
          INSERT_SIZE
        )
      ) {

        const payload =
          batch.map(
            item => ({

              year:
                item.year,

              exam_authority:
                item.examAuthority,

              exam_name:
                item.examName,

              state_name:
                item.stateName,

              paper_type:
                item.paperType,

              paper_name:
                item.paperName,

              gs_paper:
                item.gsPaper,

              optional_subject:
                item.optionalSubject,

              optional_paper:
                item.optionalPaper,

              title:
                `${item.year} ${item.examAuthority} ${item.examName} ${item.paperName}`,

              official_source_url:
                item.sourceUrl,

              status:
                item.status,

              created_by:
                user.id
            })
          );


        const {
          error
        } =
          await supabase
            .from(
              'mains_pyq_papers'
            )
            .insert(
              payload
            );


        if (
          error
        ) {

          throw error;
        }
      }


      /*
       * RELOAD PAPER IDS
       */

      allPapers =
        await loadAllPapers();


      paperMap =
        new Map<
          string,
          string
        >();


      allPapers.forEach(
        paper => {

          paperMap.set(
            paperKeyFromRecord(
              paper
            ),
            paper.id
          );
        }
      );


      /*
       * EXISTING QUESTION DUPLICATES
       */

      const existingQuestions =
        await loadAllPyqQuestions();


      const existingKeys =
        new Set(
          existingQuestions.map(
            questionKeyFromRecord
          )
        );


      const currentCsvKeys =
        new Set<string>();


      const insertPayloads:
        Array<
          Record<
            string,
            unknown
          >
        > = [];


      let duplicates =
        0;


      validation.valid.forEach(
        item => {

          const key =
            makeQuestionKey(
              item
            );


          if (
            existingKeys.has(
              key
            ) ||
            currentCsvKeys.has(
              key
            )
          ) {

            duplicates +=
              1;

            return;
          }


          currentCsvKeys.add(
            key
          );


          const paperId =
            paperMap.get(
              makePaperKey(
                item
              )
            );


          if (
            !paperId
          ) {

            throw new Error(
              `Unable to find paper master for CSV row ${item.rowNumber}.`
            );
          }


          const tags =
            [
              item.examAuthority,
              item.examName,
              item.stateName,
              String(
                item.year
              ),
              item.paperName,
              item.subject,
              item.topic,
              item.subtopic,
              'PYQ'
            ].filter(
              (
                value
              ):
                value is string =>
                Boolean(
                  value
                )
            );


          insertPayloads.push({

            question:
              item.question,

            question_type:
              'pyq',

            section_type:
              item.paperType,

            exam_authority:
              item.examAuthority,

            exam_name:
              item.examName,

            state_name:
              item.stateName,

            paper_name:
              item.paperName,

            gs_paper:
              item.gsPaper,

            optional_subject:
              item.optionalSubject,

            optional_paper:
              item.optionalPaper,

            subject:
              item.subject,

            topic:
              item.topic,

            subtopic:
              item.subtopic,

            question_number:
              item.questionNumber,

            essay_section:
              item.essaySection,

            marks:
              item.marks,

            word_limit:
              item.wordLimit,

            pyq_year:
              item.year,

            pyq_paper_id:
              paperId,

            relevant_gs_papers:
              item.relevantGsPapers,

            source:
              item.examAuthority,

            source_url:
              item.sourceUrl,

            tags,

            difficulty:
              'medium',

            status:
              item.status,

            created_by:
              user.id
          });
        }
      );


      /*
       * INSERT QUESTIONS
       */

      let inserted =
        0;


      for (
        const batch of chunks(
          insertPayloads,
          INSERT_SIZE
        )
      ) {

        if (
          batch.length ===
          0
        ) {

          continue;
        }


        const {
          error
        } =
          await supabase
            .from(
              'mains_questions'
            )
            .insert(
              batch
            );


        if (
          error
        ) {

          throw error;
        }


        inserted +=
          batch.length;


        setInsertedCount(
          inserted
        );
      }


      setDuplicateCount(
        duplicates
      );


      setMessage(
        `Import complete. ${inserted} question(s) inserted. ${duplicates} duplicate(s) skipped.`
      );

    } catch (
      error
    ) {

      setMessage(
        error instanceof
          Error
          ? error.message
          : 'Bulk import failed.'
      );

    } finally {

      setImporting(
        false
      );
    }
  }


  return (

    <section
      className="panel"
    >

      <span
        className="eyebrow"
      >
        BULK PYQ IMPORT
      </span>


      <h2>
        UPSC + State PSC CSV Import
      </h2>


      <p>
        Import complete Mains question papers from UPSC,
        MPSC, MPPSC, UPPSC, BPSC, RPSC and other State
        Public Service Commissions.
      </p>


      <div
        style={{
          display:
            'grid',

          gridTemplateColumns:
            'repeat(auto-fit, minmax(220px, 1fr))',

          gap:
            '12px',

          marginTop:
            '16px'
        }}
      >

        <label>

          Default Import Status

          <select
            value={
              defaultStatus
            }
            onChange={
              event =>
                setDefaultStatus(
                  event
                    .target
                    .value as
                      ImportStatus
                )
            }
          >

            <option
              value="draft"
            >
              Draft
            </option>


            <option
              value="published"
            >
              Published
            </option>

          </select>

        </label>


        <label>

          Select CSV File

          <input
            type="file"
            accept=".csv,text/csv"
            onChange={
              event =>
                void selectFile(
                  event
                    .target
                    .files?.[0]
                )
            }
          />

        </label>

      </div>


      <div
        style={{
          marginTop:
            '18px',

          padding:
            '14px',

          border:
            '1px solid rgba(255,255,255,.08)',

          borderRadius:
            '12px'
        }}
      >

        <strong>
          CSV column format
        </strong>


        <pre
          style={{
            whiteSpace:
              'pre-wrap',

            overflowWrap:
              'anywhere',

            marginTop:
              '8px'
          }}
        >
          {SAMPLE_HEADER}
        </pre>


        <strong>
          UPSC example
        </strong>


        <pre
          style={{
            whiteSpace:
              'pre-wrap',

            overflowWrap:
              'anywhere',

            marginTop:
              '8px'
          }}
        >
          {UPSC_SAMPLE}
        </pre>


        <strong>
          State PSC example
        </strong>


        <pre
          style={{
            whiteSpace:
              'pre-wrap',

            overflowWrap:
              'anywhere',

            marginTop:
              '8px'
          }}
        >
          {STATE_SAMPLE}
        </pre>

      </div>


      <div
        style={{
          display:
            'grid',

          gridTemplateColumns:
            'repeat(auto-fit, minmax(150px, 1fr))',

          gap:
            '10px',

          marginTop:
            '16px'
        }}
      >

        <div>
          <strong>
            File
          </strong>

          <p>
            {fileName ||
              'No file selected'}
          </p>
        </div>


        <div>
          <strong>
            CSV rows
          </strong>

          <p>
            {rows.length}
          </p>
        </div>


        <div>
          <strong>
            Valid rows
          </strong>

          <p>
            {validation.valid.length}
          </p>
        </div>


        <div>
          <strong>
            Errors
          </strong>

          <p>
            {validation.errors.length}
          </p>
        </div>


        <div>
          <strong>
            Inserted
          </strong>

          <p>
            {insertedCount}
          </p>
        </div>


        <div>
          <strong>
            Duplicates skipped
          </strong>

          <p>
            {duplicateCount}
          </p>
        </div>

      </div>


      {validation.errors.length >
        0 && (

        <div
          style={{
            marginTop:
              '16px',

            padding:
              '12px',

            border:
              '1px solid rgba(239,68,68,.35)',

            borderRadius:
              '10px'
          }}
        >

          <strong>
            Validation errors
          </strong>


          {validation.errors
            .slice(
              0,
              50
            )
            .map(
              error => (

                <p
                  key={
                    error
                  }
                  style={{
                    margin:
                      '6px 0'
                  }}
                >
                  {error}
                </p>

              )
            )}

        </div>

      )}


      <div
        style={{
          display:
            'flex',

          gap:
            '10px',

          flexWrap:
            'wrap',

          marginTop:
            '18px'
        }}
      >

        <button
          type="button"
          className="primary-btn"
          disabled={
            importing ||
            validation.valid.length ===
              0
          }
          onClick={() =>
            void importQuestions()
          }
        >

          {importing
            ? 'Importing...'
            : `Import ${validation.valid.length} PYQs`}

        </button>


        <button
          type="button"
          className="secondary-btn"
          disabled={
            importing
          }
          onClick={() => {

            setFileName('');
            setRows([]);
            setMessage('');
            setInsertedCount(0);
            setDuplicateCount(0);

          }}
        >
          Clear
        </button>

      </div>


      {message && (

        <p
          className="form-message"
          style={{
            marginTop:
              '14px'
          }}
        >
          {message}
        </p>

      )}

    </section>

  );
}

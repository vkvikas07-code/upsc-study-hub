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


type CsvRow =
  Record<
    string,
    string
  >;


type ParsedPyq = {

  year:
    number;

  paperType:
    'essay'
    | 'gs'
    | 'optional';

  gsPaper:
    string |
    null;

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

  subject:
    string;

  topic:
    string |
    null;

  subtopic:
    string |
    null;

  question:
    string;

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

  id:
    string;

  year:
    number;

  paper_type:
    string;

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


const PAGE_SIZE =
  1000;


const INSERT_SIZE =
  100;


const SAMPLE_HEADER =
  'year,paper_type,gs_paper,optional_subject,optional_paper,essay_section,question_number,subject,topic,subtopic,question,marks,word_limit,relevant_gs_papers,source_url,status';


const SAMPLE_ROW =
  '2023,optional,,History,Paper-I,,3(a),History,Ancient India,Harappan Civilisation,"Discuss the important features of Harappan urbanisation.",20,250,GS-I,https://upsc.gov.in/,published';


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


      const hasContent =
        row.some(
          value =>
            clean(
              value
            )
        );


      if (
        hasContent
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
        clean(
          value
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
) {

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

    return 'essay' as const;
  }


  if (
    normalized ===
      'gs' ||
    normalized ===
      'generalstudies'
  ) {

    return 'gs' as const;
  }


  if (
    normalized ===
    'optional'
  ) {

    return 'optional' as const;
  }


  return null;
}


function normalizeGsPaper(
  value:
    string
) {

  const normalized =
    clean(
      value
    )
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


  return null;
}


function normalizeOptionalPaper(
  value:
    string
) {

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


  return null;
}


function normalizeStatus(
  value:
    string,
  fallback:
    ImportStatus
) {

  const normalized =
    clean(
      value
    )
      .toLowerCase();


  if (
    normalized ===
    'published'
  ) {

    return 'published' as const;
  }


  if (
    normalized ===
    'draft'
  ) {

    return 'draft' as const;
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


  const number =
    Number(
      cleaned
    );


  return Number.isFinite(
    number
  )
    ? number
    : null;
}


function relevantGs(
  value:
    string
): string[] {

  const parts:
    string[] =
      clean(
        value
      )
        .split(
          /[|;,]+/
        )
        .flatMap(
          item => {

            const normalized =
              normalizeGsPaper(
                item
              );


            return normalized
              ? [
                  normalized
                ]
              : [];
          }
        );


  return Array.from(
    new Set(
      parts
    )
  );
}


function paperKey(
  year:
    number,
  paperType:
    string,
  gsPaper:
    string |
    null,
  optionalSubject:
    string |
    null,
  optionalPaper:
    string |
    null
) {

  return [
    year,
    paperType,
    clean(
      gsPaper
    ).toLowerCase(),
    clean(
      optionalSubject
    ).toLowerCase(),
    clean(
      optionalPaper
    ).toLowerCase()
  ].join(
    '|'
  );
}


function questionKey(
  item: {
    year:
      number;

    paperType:
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

    questionNumber:
      string |
      null;

    question:
      string;
  }
) {

  const normalizedQuestion =
    clean(
      item.question
    )
      .toLowerCase()
      .replace(
        /\s+/g,
        ' '
      );


  return [
    item.year,
    item.paperType,
    clean(
      item.gsPaper
    ).toLowerCase(),
    clean(
      item.optionalSubject
    ).toLowerCase(),
    clean(
      item.optionalPaper
    ).toLowerCase(),
    clean(
      item.questionNumber
    ).toLowerCase(),
    normalizedQuestion
  ].join(
    '|'
  );
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


      const paperType =
        normalizePaperType(
          row.paper_type
        );


      if (
        !paperType
      ) {

        errors.push(
          `Row ${rowNumber}: paper_type must be essay, gs or optional.`
        );

        return;
      }


      let gsPaper:
        string |
        null =
          null;


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
        'gs'
      ) {

        gsPaper =
          normalizeGsPaper(
            row.gs_paper
          );


        if (
          !gsPaper
        ) {

          errors.push(
            `Row ${rowNumber}: GS paper must be GS-I, GS-II, GS-III or GS-IV.`
          );

          return;
        }
      }


      if (
        paperType ===
        'optional'
      ) {

        optionalSubject =
          clean(
            row.optional_subject
          );


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
            `Row ${rowNumber}: optional_paper must be Paper-I or Paper-II.`
          );

          return;
        }
      }


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

        year,

        paperType,

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
          paper_type,
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
      ) as
        PaperRecord[];


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


async function loadExistingQuestionKeys() {

  if (
    !supabase
  ) {

    return new Set<
      string
    >();
  }


  const keys =
    new Set<
      string
    >();


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
          section_type,
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
      data ||
      [];


    page.forEach(
      item => {

        if (
          item.pyq_year
        ) {

          keys.add(
            questionKey({

              year:
                item.pyq_year,

              paperType:
                item.section_type,

              gsPaper:
                item.gs_paper,

              optionalSubject:
                item.optional_subject,

              optionalPaper:
                item.optional_paper,

              questionNumber:
                item.question_number,

              question:
                item.question
            })
          );
        }

      }
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


  return keys;
}


function paperTitle(
  item:
    ParsedPyq
) {

  if (
    item.paperType ===
    'essay'
  ) {

    return `${item.year} UPSC Mains Essay`;
  }


  if (
    item.paperType ===
    'gs'
  ) {

    return `${item.year} UPSC Mains ${item.gsPaper}`;
  }


  return `${item.year} UPSC Mains ${item.optionalSubject} ${item.optionalPaper}`;
}


export function MainsPyqBulkImporter() {

  const [
    rows,
    setRows
  ] =
    useState<
      CsvRow[]
    >([]);


  const [
    fileName,
    setFileName
  ] =
    useState('');


  const [
    defaultStatus,
    setDefaultStatus
  ] =
    useState<
      ImportStatus
    >(
      'draft'
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
    useState<{
      inserted:
        number;

      duplicates:
        number;
    } | null>(
      null
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


  async function readFile(
    file:
      File |
      null
  ) {

    setMessage('');
    setResult(
      null
    );


    if (
      !file
    ) {

      setRows([]);
      setFileName('');

      return;
    }


    if (
      !file.name
        .toLowerCase()
        .endsWith(
          '.csv'
        )
    ) {

      setMessage(
        'Please select a .csv file.'
      );

      return;
    }


    try {

      const text =
        await file.text();


      const parsed =
        parseCsv(
          text
        );


      if (
        parsed.length ===
        0
      ) {

        setMessage(
          'No data rows were found in the CSV.'
        );

        setRows([]);

        return;
      }


      setRows(
        parsed
      );

      setFileName(
        file.name
      );


      setMessage(
        `Loaded ${parsed.length} CSV rows. Review validation before importing.`
      );

    } catch {

      setMessage(
        'Unable to read the CSV file.'
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


    if (
      validation.errors.length >
      0
    ) {

      setMessage(
        'Fix all invalid CSV rows before importing.'
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
      'Preparing bulk import...'
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
       * ---------------------------------
       * 1. LOAD PAPER MASTER
       * ---------------------------------
       */

      const existingPapers =
        await loadAllPapers();


      const paperMap =
        new Map<
          string,
          string
        >();


      existingPapers.forEach(
        item => {

          paperMap.set(
            paperKey(
              item.year,
              item.paper_type,
              item.gs_paper,
              item.optional_subject,
              item.optional_paper
            ),
            item.id
          );

        }
      );


      /*
       * ---------------------------------
       * 2. FIND MISSING PAPER MASTERS
       * ---------------------------------
       */

      const missingPapers =
        new Map<
          string,
          ParsedPyq
        >();


      validation.valid.forEach(
        item => {

          const key =
            paperKey(
              item.year,
              item.paperType,
              item.gsPaper,
              item.optionalSubject,
              item.optionalPaper
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


      const missingPaperRows =
        Array.from(
          missingPapers.values()
        ).map(
          item => ({

            year:
              item.year,

            paper_type:
              item.paperType,

            gs_paper:
              item.paperType ===
                'gs'
                ? item.gsPaper
                : null,

            optional_subject:
              item.paperType ===
                'optional'
                ? item.optionalSubject
                : null,

            optional_paper:
              item.paperType ===
                'optional'
                ? item.optionalPaper
                : null,

            title:
              paperTitle(
                item
              ),

            official_source_url:
              item.sourceUrl,

            status:
              defaultStatus,

            created_by:
              user.id
          })
        );


      for (
        let index = 0;
        index <
          missingPaperRows.length;
        index +=
          INSERT_SIZE
      ) {

        const chunk =
          missingPaperRows.slice(
            index,
            index +
              INSERT_SIZE
          );


        const {
          error
        } =
          await supabase
            .from(
              'mains_pyq_papers'
            )
            .insert(
              chunk
            );


        if (
          error
        ) {

          throw error;
        }
      }


      /*
       * Reload master after creating missing papers.
       */

      const refreshedPapers =
        await loadAllPapers();


      paperMap.clear();


      refreshedPapers.forEach(
        item => {

          paperMap.set(
            paperKey(
              item.year,
              item.paper_type,
              item.gs_paper,
              item.optional_subject,
              item.optional_paper
            ),
            item.id
          );

        }
      );


      /*
       * ---------------------------------
       * 3. DUPLICATE PROTECTION
       * ---------------------------------
       */

      const existingQuestionKeys =
        await loadExistingQuestionKeys();


      const fileKeys =
        new Set<
          string
        >();


      let duplicateCount =
        0;


      const questionsToInsert:
        Record<
          string,
          unknown
        >[] = [];


      validation.valid.forEach(
        item => {

          const key =
            questionKey(
              item
            );


          if (
            existingQuestionKeys.has(
              key
            ) ||
            fileKeys.has(
              key
            )
          ) {

            duplicateCount +=
              1;

            return;
          }


          fileKeys.add(
            key
          );


          const masterKey =
            paperKey(
              item.year,
              item.paperType,
              item.gsPaper,
              item.optionalSubject,
              item.optionalPaper
            );


          const paperId =
            paperMap.get(
              masterKey
            );


          if (
            !paperId
          ) {

            throw new Error(
              `Unable to resolve paper master for CSV row ${item.rowNumber}.`
            );
          }


          const tags =
            [
              'UPSC PYQ',
              String(
                item.year
              ),
              item.subject,
              item.topic ||
                '',
              item.subtopic ||
                ''
            ].filter(
              Boolean
            );


          questionsToInsert.push({

            question:
              item.question,

            question_type:
              'pyq',

            section_type:
              item.paperType,

            gs_paper:
              item.paperType ===
                'gs'
                ? item.gsPaper
                : null,

            optional_subject:
              item.paperType ===
                'optional'
                ? item.optionalSubject
                : null,

            optional_paper:
              item.paperType ===
                'optional'
                ? item.optionalPaper
                : null,

            subject:
              item.subject,

            topic:
              item.topic,

            subtopic:
              item.subtopic,

            question_number:
              item.questionNumber,

            essay_section:
              item.paperType ===
                'essay'
                ? item.essaySection
                : null,

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
              'UPSC',

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
       * ---------------------------------
       * 4. INSERT QUESTIONS IN BATCHES
       * ---------------------------------
       */

      for (
        let index = 0;
        index <
          questionsToInsert.length;
        index +=
          INSERT_SIZE
      ) {

        const chunk =
          questionsToInsert.slice(
            index,
            index +
              INSERT_SIZE
          );


        const {
          error
        } =
          await supabase
            .from(
              'mains_questions'
            )
            .insert(
              chunk
            );


        if (
          error
        ) {

          throw error;
        }
      }


      setResult({

        inserted:
          questionsToInsert.length,

        duplicates:
          duplicateCount
      });


      setMessage(
        `Bulk import complete. ${questionsToInsert.length} questions added and ${duplicateCount} duplicates skipped.`
      );

    } catch (
      caughtError
    ) {

      const errorMessage =
        caughtError instanceof
          Error
          ? caughtError.message
          : 'Bulk import failed.';


      setMessage(
        errorMessage
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
      style={{
        display:
          'grid',

        gap:
          '16px'
      }}
    >

      <div>

        <span
          className="eyebrow"
        >
          BULK PYQ IMPORT
        </span>


        <h2>
          Import complete Mains papers from CSV
        </h2>


        <p>
          Use this for large UPSC PYQ collections instead
          of entering every question manually.
        </p>

      </div>


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
            Draft - review before students see it
          </option>

          <option
            value="published"
          >
            Published - immediately visible to students
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
              void readFile(
                event
                  .target
                  .files?.[0] ||
                null
              )
          }
        />

      </label>


      <section
        style={{
          padding:
            '12px',

          border:
            '1px solid rgba(255,255,255,.08)',

          borderRadius:
            '12px'
        }}
      >

        <strong>
          Required CSV format
        </strong>


        <p
          style={{
            fontSize:
              '.82rem',

            color:
              '#94a3b8'
          }}
        >
          Keep the question inside double quotes when it
          contains commas.
        </p>


        <pre
          style={{
            overflowX:
              'auto',

            whiteSpace:
              'pre',

            fontSize:
              '.72rem'
          }}
        >
          {SAMPLE_HEADER}
          {'\n'}
          {SAMPLE_ROW}
        </pre>

      </section>


      {fileName && (

        <section
          style={{
            display:
              'grid',

            gridTemplateColumns:
              'repeat(auto-fit, minmax(150px, 1fr))',

            gap:
              '10px'
          }}
        >

          <div
            className="panel"
          >
            <strong>
              File
            </strong>

            <p>
              {fileName}
            </p>
          </div>


          <div
            className="panel"
          >
            <strong>
              CSV Rows
            </strong>

            <p>
              {rows.length}
            </p>
          </div>


          <div
            className="panel"
          >
            <strong>
              Valid
            </strong>

            <p>
              {validation.valid.length}
            </p>
          </div>


          <div
            className="panel"
          >
            <strong>
              Errors
            </strong>

            <p>
              {validation.errors.length}
            </p>
          </div>

        </section>

      )}


      {validation.errors.length >
        0 && (

        <section
          style={{
            padding:
              '12px',

            border:
              '1px solid rgba(248,113,113,.35)',

            borderRadius:
              '12px'
          }}
        >

          <strong>
            Fix these CSV rows
          </strong>


          <div
            style={{
              display:
                'grid',

              gap:
                '5px',

              marginTop:
                '10px',

              maxHeight:
                '240px',

              overflowY:
                'auto'
            }}
          >

            {validation.errors
              .slice(
                0,
                50
              )
              .map(
                error => (

                  <div
                    key={
                      error
                    }
                    style={{
                      fontSize:
                        '.82rem'
                    }}
                  >
                    {error}
                  </div>

                )
              )}

          </div>


          {validation.errors.length >
            50 && (

            <p>
              Showing the first 50 errors.
            </p>

          )}

        </section>

      )}


      <button
        type="button"
        className="primary-btn"
        disabled={
          importing ||
          validation.valid.length ===
            0 ||
          validation.errors.length >
            0
        }
        onClick={() =>
          void importQuestions()
        }
      >

        {importing
          ? 'Importing PYQs...'
          : `Import ${validation.valid.length} PYQs`}

      </button>


      {message && (

        <p>
          {message}
        </p>

      )}


      {result && (

        <section
          style={{
            padding:
              '12px',

            border:
              '1px solid rgba(45,212,191,.35)',

            borderRadius:
              '12px'
          }}
        >

          <strong>
            Import Result
          </strong>


          <p>
            Added: {result.inserted}
          </p>


          <p>
            Duplicate questions skipped: {result.duplicates}
          </p>

        </section>

      )}

    </section>

  );
}

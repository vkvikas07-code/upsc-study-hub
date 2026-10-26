import fs from 'node:fs';
import path from 'node:path';

const managerPath =
  path.resolve(
    'src/components/MainsQuestionManager.tsx'
  );

const practicePath =
  path.resolve(
    'src/pages/MainsPracticePage.tsx'
  );

for (const filePath of [
  managerPath,
  practicePath
]) {
  if (!fs.existsSync(filePath)) {
    console.error(
      `ERROR: File not found: ${filePath}`
    );
    process.exit(1);
  }
}

function backup(filePath) {
  const backupPath =
    `${filePath}.before-gs-relevance.bak`;

  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(
      filePath,
      backupPath
    );

    console.log(
      `Backup created: ${backupPath}`
    );
  }
}

function replaceOnce(
  source,
  label,
  search,
  replacement
) {
  const index =
    source.indexOf(search);

  if (index < 0) {
    console.error(
      `ERROR: Could not find block: ${label}`
    );
    process.exit(1);
  }

  const second =
    source.indexOf(
      search,
      index +
      search.length
    );

  if (second >= 0) {
    console.error(
      `ERROR: More than one match found for: ${label}`
    );
    process.exit(1);
  }

  console.log(
    `Updated: ${label}`
  );

  return (
    source.slice(
      0,
      index
    ) +
    replacement +
    source.slice(
      index +
      search.length
    )
  );
}

function replaceRegexOnce(
  source,
  label,
  regex,
  replacement
) {
  const matches =
    [
      ...source.matchAll(
        new RegExp(
          regex.source,
          regex.flags.includes('g')
            ? regex.flags
            : `${regex.flags}g`
        )
      )
    ];

  if (matches.length !== 1) {
    console.error(
      `ERROR: Expected exactly 1 match for "${label}", found ${matches.length}.`
    );
    process.exit(1);
  }

  console.log(
    `Updated: ${label}`
  );

  return source.replace(
    regex,
    replacement
  );
}


/* =========================================================
   MAINS QUESTION MANAGER
   ========================================================= */

backup(
  managerPath
);

let manager =
  fs.readFileSync(
    managerPath,
    'utf8'
  );

if (
  !manager.includes(
    'gs_relevance_papers'
  )
) {

  manager =
    replaceOnce(
      manager,
      'MainsQuestion GS relevance field',
`  optional_paper:
    string |
    null;

  subject: string;`,
`  optional_paper:
    string |
    null;

  gs_relevance_papers?:
    string[];

  subject: string;`
    );


  manager =
    replaceOnce(
      manager,
      'MAINS_SELECT GS relevance field',
`  optional_subject,
  optional_paper,
  subject,`,
`  optional_subject,
  optional_paper,
  gs_relevance_papers,
  subject,`
    );


  manager =
    replaceOnce(
      manager,
      'Optional GS relevance state',
`  const [
    optionalPaper,
    setOptionalPaper
  ] =
    useState(
      'Paper-I'
    );`,
`  const [
    optionalPaper,
    setOptionalPaper
  ] =
    useState(
      'Paper-I'
    );


  const [
    optionalGsRelevant,
    setOptionalGsRelevant
  ] =
    useState(
      false
    );


  const [
    gsRelevancePapers,
    setGsRelevancePapers
  ] =
    useState<
      string[]
    >([]);`
    );


  manager =
    replaceOnce(
      manager,
      'GS relevance toggle helper',
`  /* =========================================================
     IMAGE PREVIEW CLEANUP
     ========================================================= */`,
`  function toggleGsRelevancePaper(
    paper:
      string
  ) {

    setGsRelevancePapers(
      current =>
        current.includes(
          paper
        )
          ? current.filter(
              item =>
                item !==
                paper
            )
          : [
              ...current,
              paper
            ]
    );
  }


  /* =========================================================
     IMAGE PREVIEW CLEANUP
     ========================================================= */`
    );


  manager =
    replaceOnce(
      manager,
      'Reset Optional GS relevance',
`    setOptionalPaper(
      'Paper-I'
    );


    setSubject(`,
`    setOptionalPaper(
      'Paper-I'
    );


    setOptionalGsRelevant(
      false
    );


    setGsRelevancePapers(
      []
    );


    setSubject(`
    );


  manager =
    replaceOnce(
      manager,
      'Load Optional GS relevance when editing',
`    setOptionalPaper(
      item.optional_paper ||
      'Paper-I'
    );


    setSubject(`,
`    setOptionalPaper(
      item.optional_paper ||
      'Paper-I'
    );


    const loadedGsRelevance =
      safeStringArray(
        item.gs_relevance_papers
      );


    setGsRelevancePapers(
      loadedGsRelevance
    );


    setOptionalGsRelevant(
      loadedGsRelevance.length >
      0
    );


    setSubject(`
    );


  manager =
    replaceOnce(
      manager,
      'Validate Optional GS paper choice',
`    if (
      existingFrameworkImagePaths.length +
      pendingFrameworkImages.length >
      MAX_FRAMEWORK_IMAGES
    ) {`,
`    if (
      sectionType ===
        'optional' &&
      optionalGsRelevant &&
      gsRelevancePapers.length ===
        0
    ) {

      setMessage(
        'Select at least one GS paper, or choose "No, purely Optional".'
      );

      return;
    }


    if (
      existingFrameworkImagePaths.length +
      pendingFrameworkImages.length >
      MAX_FRAMEWORK_IMAGES
    ) {`
    );


  manager =
    replaceOnce(
      manager,
      'Save Optional GS relevance',
`      optional_paper:
        sectionType ===
          'optional'
          ? optionalPaper
          : null,

      subject:`,
`      optional_paper:
        sectionType ===
          'optional'
          ? optionalPaper
          : null,

      gs_relevance_papers:
        sectionType ===
          'optional' &&
        optionalGsRelevant
          ? gsRelevancePapers
          : [],

      subject:`
    );


  manager =
    replaceOnce(
      manager,
      'Optional GS relevance controls',
`          {/* PYQ YEAR */}`,
`          {/* OPTIONAL -> GS RELEVANCE */}

          {
            sectionType ===
              'optional' && (

            <section
              style={{
                margin:
                  '4px 0 18px',

                padding:
                  '16px',

                border:
                  '1px solid rgba(45,212,191,.22)',

                borderRadius:
                  '14px',

                background:
                  'rgba(20,184,166,.055)'
              }}
            >

              <strong>
                Is this Optional question also relevant to General Studies?
              </strong>


              <p
                style={{
                  margin:
                    '6px 0 12px',

                  color:
                    '#94a3b8',

                  fontSize:
                    '.82rem',

                  lineHeight:
                    1.55
                }}
              >
                Select Yes to cross-list this question in the relevant GS practice bank. The question will still remain an Optional question.
              </p>


              <div
                style={{
                  display:
                    'flex',

                  gap:
                    '10px',

                  flexWrap:
                    'wrap'
                }}
              >

                <button
                  type="button"
                  className={
                    optionalGsRelevant
                      ? 'primary-btn'
                      : 'secondary-btn'
                  }
                  onClick={() =>
                    setOptionalGsRelevant(
                      true
                    )
                  }
                >
                  Yes, also useful for GS
                </button>


                <button
                  type="button"
                  className={
                    !optionalGsRelevant
                      ? 'primary-btn'
                      : 'secondary-btn'
                  }
                  onClick={() => {

                    setOptionalGsRelevant(
                      false
                    );

                    setGsRelevancePapers(
                      []
                    );
                  }}
                >
                  No, purely Optional
                </button>

              </div>


              {
                optionalGsRelevant && (

                <div
                  style={{
                    display:
                      'grid',

                    gridTemplateColumns:
                      'repeat(4, minmax(100px, 1fr))',

                    gap:
                      '8px',

                    marginTop:
                      '14px'
                  }}
                >

                  {
                    [
                      'GS-I',
                      'GS-II',
                      'GS-III',
                      'GS-IV'
                    ].map(
                      paper => {

                        const selected =
                          gsRelevancePapers.includes(
                            paper
                          );


                        return (

                          <button
                            key={
                              paper
                            }
                            type="button"
                            className={
                              selected
                                ? 'primary-btn'
                                : 'secondary-btn'
                            }
                            onClick={() =>
                              toggleGsRelevancePaper(
                                paper
                              )
                            }
                            style={{
                              justifyContent:
                                'center'
                            }}
                          >
                            {
                              selected
                                ? '✓ '
                                : ''
                            }
                            {paper}
                          </button>

                        );
                      }
                    )
                  }

                </div>

                )
              }

            </section>

          )}


          {/* PYQ YEAR */}`
    );


  manager =
    replaceRegexOnce(
      manager,
      'Admin question card GS relevance label',
      /(<span\s+className="eyebrow"\s*>\s*\{\s*item\.section_type ===\s*'gs'[\s\S]*?<\/span>)(\s*<h3>)/,
`$1


                    {
                      item.section_type ===
                        'optional' &&
                      safeStringArray(
                        item.gs_relevance_papers
                      ).length >
                        0 && (

                      <div
                        className="tag-row"
                        style={{
                          marginTop:
                            '8px'
                        }}
                      >
                        <span
                          className="tag"
                        >
                          Also relevant to:{' '}
                          {
                            safeStringArray(
                              item.gs_relevance_papers
                            ).join(
                              ', '
                            )
                          }
                        </span>
                      </div>

                    )}$2`
    );

} else {

  console.log(
    'MainsQuestionManager already contains GS relevance support; no manager patch applied.'
  );
}

fs.writeFileSync(
  managerPath,
  manager,
  'utf8'
);


/* =========================================================
   MAINS PRACTICE PAGE
   ========================================================= */

backup(
  practicePath
);

let practice =
  fs.readFileSync(
    practicePath,
    'utf8'
  );

if (
  !practice.includes(
    'gs_relevance_papers'
  )
) {

  practice =
    replaceOnce(
      practice,
      'Student MainsQuestion GS relevance field',
`type MainsQuestion =
  MainsWorkspaceQuestion & {

    question_type:
      QuestionType;`,
`type MainsQuestion =
  MainsWorkspaceQuestion & {

    gs_relevance_papers:
      string[];

    question_type:
      QuestionType;`
    );


  practice =
    replaceOnce(
      practice,
      'Student query GS relevance field',
`          optional_subject,
          optional_paper,
          subject,`,
`          optional_subject,
          optional_paper,
          gs_relevance_papers,
          subject,`
    );


  practice =
    replaceOnce(
      practice,
      'Normalize student GS relevance',
`          tags:
            Array.isArray(
              item.tags
            )
              ? item.tags
              : [],`,
`          tags:
            Array.isArray(
              item.tags
            )
              ? item.tags
              : [],

          gs_relevance_papers:
            Array.isArray(
              item.gs_relevance_papers
            )
              ? item
                  .gs_relevance_papers
                  .map(
                    value =>
                      String(
                        value
                      )
                  )
                  .filter(
                    Boolean
                  )
              : [],`
    );


  practice =
    replaceOnce(
      practice,
      'Cross-list section filtering',
`            if (
              sectionFilter !==
                'all' &&
              item.section_type !==
                sectionFilter
            ) {

              return false;
            }`,
`            if (
              sectionFilter ===
                'gs'
            ) {

              const isGsQuestion =
                item.section_type ===
                  'gs' ||
                (
                  item.section_type ===
                    'optional' &&
                  item.gs_relevance_papers.length >
                    0
                );


              if (
                !isGsQuestion
              ) {

                return false;
              }

            } else if (
              sectionFilter ===
                'optional' &&
              item.section_type !==
                'optional'
            ) {

              return false;
            }`
    );


  practice =
    replaceOnce(
      practice,
      'Cross-list GS paper filtering',
`            if (
              item.section_type ===
                'gs' &&
              gsFilter !==
                'all' &&
              item.gs_paper !==
                gsFilter
            ) {

              return false;
            }`,
`            if (
              sectionFilter !==
                'optional' &&
              gsFilter !==
                'all'
            ) {

              const matchesGsPaper =
                item.gs_paper ===
                  gsFilter ||
                item.gs_relevance_papers.includes(
                  gsFilter
                );


              if (
                !matchesGsPaper
              ) {

                return false;
              }
            }`
    );


  practice =
    replaceOnce(
      practice,
      'Include GS relevance in search',
`                  item.optional_paper ||
                    '',
                  ...(item.tags ||
                    [])`,
`                  item.optional_paper ||
                    '',
                  ...item.gs_relevance_papers,
                  ...(item.tags ||
                    [])`
    );


  practice =
    replaceOnce(
      practice,
      'PYQ workspace default GS relevance',
`        optional_paper:
          item.optional_paper,

        subject:`,
`        optional_paper:
          item.optional_paper,

        gs_relevance_papers:
          [],

        subject:`
    );


  practice =
    replaceRegexOnce(
      practice,
      'Student question card GS relevance badge',
      /(<span\s+className="eyebrow"\s*>\s*\{item\.section_type ===[\s\S]*?<\/span>)(\s*\{item\.directive && \()/,
`$1


                  {
                    item.section_type ===
                      'optional' &&
                    item.gs_relevance_papers.length >
                      0 && (

                    <span
                      className="tag"
                      style={{
                        marginLeft:
                          '8px'
                      }}
                    >
                      Also useful for{' '}
                      {
                        item.gs_relevance_papers.join(
                          ', '
                        )
                      }
                    </span>

                  )}$2`
    );

} else {

  console.log(
    'MainsPracticePage already contains GS relevance support; no practice patch applied.'
  );
}

fs.writeFileSync(
  practicePath,
  practice,
  'utf8'
);


console.log('');
console.log('SUCCESS');
console.log('Updated:');
console.log('  src/components/MainsQuestionManager.tsx');
console.log('  src/pages/MainsPracticePage.tsx');
console.log('');
console.log('Now run:');
console.log('npm run build');

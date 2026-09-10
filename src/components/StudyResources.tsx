import {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


type ResourceType =
  | 'standard_book'
  | 'official_source'
  | 'monthly_current_affairs'
  | 'notes'
  | 'report'
  | 'pyq_resource'
  | 'syllabus_resource';


type ExamStage =
  | 'prelims'
  | 'mains'
  | 'both';


type StageFilter =
  | 'all'
  | 'prelims'
  | 'mains';


type ResourceRow = {
  id: string;
  title: string;
  description: string | null;
  resource_type: ResourceType;
  exam_stage: ExamStage;
  paper: string | null;
  subject: string;
  author: string | null;
  publisher: string | null;
  source_name: string | null;
  external_url: string | null;
  file_path: string | null;
  language: string;
  edition_year: number | null;
  month_year: string | null;
  is_free: boolean;
  sort_order: number;
  created_at: string;
};


type StudyResourcesProps = {
  initialStage?: StageFilter;
  initialSubject?: string | null;
};


const RESOURCE_SELECT = `
  id,
  title,
  description,
  resource_type,
  exam_stage,
  paper,
  subject,
  author,
  publisher,
  source_name,
  external_url,
  file_path,
  language,
  edition_year,
  month_year,
  is_free,
  sort_order,
  created_at
`;


function safeNumber(
  value: unknown,
  fallback = 0
) {

  const number =
    Number(
      value
    );


  return Number.isFinite(
    number
  )
    ? number
    : fallback;
}


function resourceTypeLabel(
  type: ResourceType
) {

  switch (
    type
  ) {

    case 'standard_book':
      return 'Standard Book';

    case 'official_source':
      return 'Official Source';

    case 'monthly_current_affairs':
      return 'Monthly Current Affairs';

    case 'notes':
      return 'Notes';

    case 'report':
      return 'Report';

    case 'pyq_resource':
      return 'PYQ Resource';

    case 'syllabus_resource':
      return 'Syllabus Resource';
  }
}


function stageLabel(
  stage: ExamStage
) {

  switch (
    stage
  ) {

    case 'prelims':
      return 'Prelims';

    case 'mains':
      return 'Mains';

    case 'both':
      return 'Prelims + Mains';
  }
}


function formatMonthYear(
  value: string | null
) {

  if (!value) {

    return '';
  }


  const date =
    new Date(
      `${value.slice(
        0,
        10
      )}T00:00:00`
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return '';
  }


  return date
    .toLocaleDateString(
      'en-IN',
      {
        month:
          'long',

        year:
          'numeric'
      }
    );
}


function getSafeExternalUrl(
  value: string | null
) {

  if (!value) {

    return null;
  }


  try {

    const url =
      new URL(
        value
      );


    if (
      url.protocol !==
        'https:' &&
      url.protocol !==
        'http:'
    ) {

      return null;
    }


    return url.toString();

  } catch {

    return null;
  }
}


function getPrimarySource(
  resource: ResourceRow
) {

  return (
    resource.source_name ||
    resource.publisher ||
    resource.author ||
    ''
  );
}


export function StudyResources({
  initialStage = 'all',
  initialSubject = null
}: StudyResourcesProps) {

  /*
   * RESOURCE DATA
   */

  const [
    resources,
    setResources
  ] =
    useState<ResourceRow[]>(
      []
    );


  const [
    loading,
    setLoading
  ] =
    useState(
      true
    );


  const [
    error,
    setError
  ] =
    useState('');


  /*
   * FILTERS
   */

  const [
    search,
    setSearch
  ] =
    useState('');


  const [
    stageFilter,
    setStageFilter
  ] =
    useState<StageFilter>(
      initialStage
    );


  const [
    typeFilter,
    setTypeFilter
  ] =
    useState<
      ResourceType |
      'all'
    >(
      'all'
    );


  const [
    subjectFilter,
    setSubjectFilter
  ] =
    useState(
      initialSubject ||
      'all'
    );


  const [
    languageFilter,
    setLanguageFilter
  ] =
    useState(
      'all'
    );


  const [
    accessFilter,
    setAccessFilter
  ] =
    useState(
      'all'
    );


  /*
   * KEEP INITIAL STAGE
   * IN SYNC
   */

  useEffect(
    () => {

      setStageFilter(
        initialStage
      );

    },
    [
      initialStage
    ]
  );


  /*
   * KEEP INITIAL SUBJECT
   * IN SYNC
   */

  useEffect(
    () => {

      setSubjectFilter(
        initialSubject ||
        'all'
      );

    },
    [
      initialSubject
    ]
  );


  /*
   * LOAD PUBLISHED
   * STUDY RESOURCES
   */

  async function loadResources() {

    if (!supabase) {

      setError(
        'Supabase is not configured.'
      );


      setLoading(
        false
      );


      return;
    }


    setLoading(
      true
    );


    setError('');


    const {
      data,
      error:
        loadError
    } =
      await supabase
        .from(
          'study_resources'
        )
        .select(
          RESOURCE_SELECT
        )
        .eq(
          'status',
          'published'
        )
        .order(
          'sort_order',
          {
            ascending:
              true
          }
        )
        .order(
          'created_at',
          {
            ascending:
              false
          }
        );


    if (
      loadError
    ) {

      console.error(
        'Unable to load study resources:',
        loadError
      );


      setError(
        loadError.message
      );


      setResources(
        []
      );


      setLoading(
        false
      );


      return;
    }


    const rows:
      ResourceRow[] =
        (
          data ||
          []
        ).map(
          item => ({

            id:
              String(
                item.id
              ),

            title:
              String(
                item.title ||
                ''
              ),

            description:
              item.description
                ? String(
                    item.description
                  )
                : null,

            resource_type:
              (
                item.resource_type ||
                'notes'
              ) as
                ResourceType,

            exam_stage:
              (
                item.exam_stage ||
                'both'
              ) as
                ExamStage,

            paper:
              item.paper
                ? String(
                    item.paper
                  )
                : null,

            subject:
              String(
                item.subject ||
                'General'
              ),

            author:
              item.author
                ? String(
                    item.author
                  )
                : null,

            publisher:
              item.publisher
                ? String(
                    item.publisher
                  )
                : null,

            source_name:
              item.source_name
                ? String(
                    item.source_name
                  )
                : null,

            external_url:
              item.external_url
                ? String(
                    item.external_url
                  )
                : null,

            file_path:
              item.file_path
                ? String(
                    item.file_path
                  )
                : null,

            language:
              String(
                item.language ||
                'English'
              ),

            edition_year:
              item.edition_year ===
                null ||
              item.edition_year ===
                undefined
                ? null
                : safeNumber(
                    item.edition_year
                  ),

            month_year:
              item.month_year
                ? String(
                    item.month_year
                  )
                : null,

            is_free:
              item.is_free ===
              true,

            sort_order:
              safeNumber(
                item.sort_order
              ),

            created_at:
              String(
                item.created_at ||
                ''
              )
          })
        );


    setResources(
      rows
    );


    setLoading(
      false
    );
  }


  /*
   * INITIAL LOAD
   */

  useEffect(
    () => {

      void loadResources();

    },
    []
  );


  /*
   * AVAILABLE SUBJECTS
   */

  const subjects =
    useMemo(
      () => {

        return Array
          .from(
            new Set(
              resources
                .map(
                  resource =>
                    resource.subject
                      .trim()
                )
                .filter(
                  Boolean
                )
            )
          )
          .sort(
            (
              first,
              second
            ) =>
              first.localeCompare(
                second
              )
          );

      },
      [
        resources
      ]
    );


  /*
   * AVAILABLE LANGUAGES
   */

  const languages =
    useMemo(
      () => {

        return Array
          .from(
            new Set(
              resources
                .map(
                  resource =>
                    resource.language
                      .trim()
                )
                .filter(
                  Boolean
                )
            )
          )
          .sort(
            (
              first,
              second
            ) =>
              first.localeCompare(
                second
              )
          );

      },
      [
        resources
      ]
    );


  /*
   * FILTERED RESOURCE LIST
   */

  const visibleResources =
    useMemo(
      () => {

        const query =
          search
            .trim()
            .toLowerCase();


        return resources.filter(
          resource => {

            /*
             * EXAM STAGE
             */

            if (
              stageFilter ===
                'prelims' &&
              resource.exam_stage !==
                'prelims' &&
              resource.exam_stage !==
                'both'
            ) {

              return false;
            }


            if (
              stageFilter ===
                'mains' &&
              resource.exam_stage !==
                'mains' &&
              resource.exam_stage !==
                'both'
            ) {

              return false;
            }


            /*
             * RESOURCE TYPE
             */

            if (
              typeFilter !==
                'all' &&
              resource.resource_type !==
                typeFilter
            ) {

              return false;
            }


            /*
             * SUBJECT
             */

            if (
              subjectFilter !==
                'all' &&
              resource.subject !==
                subjectFilter
            ) {

              return false;
            }


            /*
             * LANGUAGE
             */

            if (
              languageFilter !==
                'all' &&
              resource.language !==
                languageFilter
            ) {

              return false;
            }


            /*
             * FREE RESOURCES
             */

            if (
              accessFilter ===
                'free' &&
              !resource.is_free
            ) {

              return false;
            }


            /*
             * SEARCH
             */

            if (!query) {

              return true;
            }


            const searchable =
              [
                resource.title,
                resource.description ||
                  '',
                resource.subject,
                resource.paper ||
                  '',
                resource.author ||
                  '',
                resource.publisher ||
                  '',
                resource.source_name ||
                  '',
                resource.language,
                resourceTypeLabel(
                  resource.resource_type
                )
              ]
                .join(
                  ' '
                )
                .toLowerCase();


            return searchable
              .includes(
                query
              );
          }
        );

      },
      [
        resources,
        search,
        stageFilter,
        typeFilter,
        subjectFilter,
        languageFilter,
        accessFilter
      ]
    );


  /*
   * TOTAL OFFICIAL SOURCES
   */

  const officialCount =
    useMemo(
      () => {

        return resources.filter(
          resource =>
            resource.resource_type ===
            'official_source'
        ).length;

      },
      [
        resources
      ]
    );


  /*
   * TOTAL FREE RESOURCES
   */

  const freeCount =
    useMemo(
      () => {

        return resources.filter(
          resource =>
            resource.is_free
        ).length;

      },
      [
        resources
      ]
    );


  /*
   * OPEN EXTERNAL RESOURCE
   */

  function openResource(
    resource:
      ResourceRow
  ) {

    const url =
      getSafeExternalUrl(
        resource.external_url
      );


    if (!url) {

      return;
    }


    window.open(
      url,
      '_blank',
      'noopener,noreferrer'
    );
  }


  /*
   * CLEAR FILTERS
   */

  function clearFilters() {

    setSearch('');


    setStageFilter(
      initialStage
    );


    setTypeFilter(
      'all'
    );


    setSubjectFilter(
      initialSubject ||
      'all'
    );


    setLanguageFilter(
      'all'
    );


    setAccessFilter(
      'all'
    );
  }


  return (

    <div>

      {/* HEADER */}

      <section
        className="panel"
      >

        <span
          className="eyebrow"
        >
          STUDY RESOURCES
        </span>


        <h2>
          UPSC Resource Library
        </h2>


        <p>
          Find syllabus-linked books,
          official sources, monthly current
          affairs, notes, reports and PYQ
          resources in one place.
        </p>


        {/* SUMMARY */}

        <div
          className="metrics-grid"
          style={{
            marginTop:
              '16px'
          }}
        >

          <article
            className="metric-card"
          >

            <div>

              <span>
                Published Resources
              </span>


              <strong>
                {
                  loading
                    ? '...'
                    : resources.length
                }
              </strong>

            </div>

          </article>


          <article
            className="metric-card"
          >

            <div>

              <span>
                Official Sources
              </span>


              <strong>
                {
                  loading
                    ? '...'
                    : officialCount
                }
              </strong>

            </div>

          </article>


          <article
            className="metric-card"
          >

            <div>

              <span>
                Free Resources
              </span>


              <strong>
                {
                  loading
                    ? '...'
                    : freeCount
                }
              </strong>

            </div>

          </article>

        </div>


        <button
          type="button"
          className="secondary-btn"

          onClick={() =>
            void loadResources()
          }

          style={{
            marginTop:
              '16px'
          }}
        >
          Refresh Resources
        </button>


        {error && (

          <div
            className="callout"
            style={{
              marginTop:
                '14px'
            }}
          >
            {error}
          </div>

        )}

      </section>


      {/* FILTERS */}

      <section
        className="panel"
        style={{
          marginTop:
            '18px'
        }}
      >

        <div
          className="panel-head"
        >

          <div>

            <span
              className="eyebrow"
            >
              FIND MATERIAL
            </span>


            <h3>
              Filter resources
            </h3>

          </div>


          <button
            type="button"
            className="text-btn"

            onClick={
              clearFilters
            }
          >
            Clear
          </button>

        </div>


        <div
          style={{
            display:
              'grid',

            gridTemplateColumns:
              'repeat(auto-fit, minmax(160px, 1fr))',

            gap:
              '10px',

            marginTop:
              '12px'
          }}
        >

          {/* SEARCH */}

          <label>

            Search

            <input
              type="search"

              value={
                search
              }

              onChange={
                event =>
                  setSearch(
                    event
                      .target
                      .value
                  )
              }

              placeholder="Book, source, topic..."
            />

          </label>


          {/* EXAM STAGE */}

          <label>

            Exam Stage

            <select
              value={
                stageFilter
              }

              onChange={
                event =>
                  setStageFilter(
                    event
                      .target
                      .value as
                        StageFilter
                  )
              }
            >

              <option value="all">
                All Stages
              </option>


              <option value="prelims">
                Prelims
              </option>


              <option value="mains">
                Mains
              </option>

            </select>

          </label>


          {/* RESOURCE TYPE */}

          <label>

            Resource Type

            <select
              value={
                typeFilter
              }

              onChange={
                event =>
                  setTypeFilter(
                    event
                      .target
                      .value as
                        ResourceType |
                        'all'
                  )
              }
            >

              <option value="all">
                All Types
              </option>


              <option value="standard_book">
                Standard Books
              </option>


              <option value="official_source">
                Official Sources
              </option>


              <option value="monthly_current_affairs">
                Monthly Current Affairs
              </option>


              <option value="notes">
                Notes
              </option>


              <option value="report">
                Reports
              </option>


              <option value="pyq_resource">
                PYQ Resources
              </option>


              <option value="syllabus_resource">
                Syllabus Resources
              </option>

            </select>

          </label>


          {/* SUBJECT */}

          <label>

            Subject

            <select
              value={
                subjectFilter
              }

              onChange={
                event =>
                  setSubjectFilter(
                    event
                      .target
                      .value
                  )
              }
            >

              <option value="all">
                All Subjects
              </option>


              {subjects.map(
                subject => (

                  <option
                    key={
                      subject
                    }

                    value={
                      subject
                    }
                  >
                    {subject}
                  </option>

                )
              )}

            </select>

          </label>


          {/* LANGUAGE */}

          <label>

            Language

            <select
              value={
                languageFilter
              }

              onChange={
                event =>
                  setLanguageFilter(
                    event
                      .target
                      .value
                  )
              }
            >

              <option value="all">
                All Languages
              </option>


              {languages.map(
                language => (

                  <option
                    key={
                      language
                    }

                    value={
                      language
                    }
                  >
                    {language}
                  </option>

                )
              )}

            </select>

          </label>


          {/* ACCESS */}

          <label>

            Access

            <select
              value={
                accessFilter
              }

              onChange={
                event =>
                  setAccessFilter(
                    event
                      .target
                      .value
                  )
              }
            >

              <option value="all">
                All Resources
              </option>


              <option value="free">
                Free Only
              </option>

            </select>

          </label>

        </div>

      </section>


      {/* RESOURCE LIST */}

      <section
        style={{
          display:
            'grid',

          gap:
            '14px',

          marginTop:
            '18px'
        }}
      >

        {/* LOADING */}

        {loading && (

          <article
            className="panel"
          >
            Loading study resources...
          </article>

        )}


        {/* EMPTY RESULT */}

        {!loading &&
          visibleResources.length ===
            0 && (

          <article
            className="panel"
          >

            <h3>
              No resources found
            </h3>


            <p>
              Try another filter or clear
              the current search.
            </p>

          </article>

        )}


        {/* RESOURCE CARDS */}

        {!loading &&
          visibleResources.map(
            resource => {

              const safeUrl =
                getSafeExternalUrl(
                  resource.external_url
                );


              const monthYear =
                formatMonthYear(
                  resource.month_year
                );


              const primarySource =
                getPrimarySource(
                  resource
                );


              return (

                <article
                  className="panel"

                  key={
                    resource.id
                  }
                >

                  {/* TAGS */}

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
                      {
                        resourceTypeLabel(
                          resource
                            .resource_type
                        )
                      }
                    </span>


                    <span
                      className="tag"
                    >
                      {
                        stageLabel(
                          resource
                            .exam_stage
                        )
                      }
                    </span>


                    <span
                      className="tag"
                    >
                      {
                        resource.subject
                      }
                    </span>


                    <span
                      className="tag"
                    >
                      {
                        resource.language
                      }
                    </span>


                    {resource.is_free && (

                      <span
                        className="tag"
                      >
                        Free
                      </span>

                    )}

                  </div>


                  {/* TITLE */}

                  <h3
                    style={{
                      marginTop:
                        '12px'
                    }}
                  >
                    {resource.title}
                  </h3>


                  {/* DESCRIPTION */}

                  {resource.description && (

                    <p>
                      {
                        resource.description
                      }
                    </p>

                  )}


                  {/* RESOURCE DETAILS */}

                  <div
                    style={{
                      display:
                        'grid',

                      gridTemplateColumns:
                        'repeat(auto-fit, minmax(130px, 1fr))',

                      gap:
                        '10px',

                      marginTop:
                        '14px'
                    }}
                  >

                    {primarySource && (

                      <div>

                        <small>
                          Source
                        </small>


                        <div>

                          <strong>
                            {primarySource}
                          </strong>

                        </div>

                      </div>

                    )}


                    {resource.paper && (

                      <div>

                        <small>
                          Paper
                        </small>


                        <div>

                          <strong>
                            {
                              resource.paper
                            }
                          </strong>

                        </div>

                      </div>

                    )}


                    {resource.edition_year !==
                      null && (

                      <div>

                        <small>
                          Edition
                        </small>


                        <div>

                          <strong>
                            {
                              resource
                                .edition_year
                            }
                          </strong>

                        </div>

                      </div>

                    )}


                    {monthYear && (

                      <div>

                        <small>
                          Month
                        </small>


                        <div>

                          <strong>
                            {monthYear}
                          </strong>

                        </div>

                      </div>

                    )}

                  </div>


                  {/* RESOURCE ACTION */}

                  <div
                    style={{
                      display:
                        'flex',

                      gap:
                        '10px',

                      flexWrap:
                        'wrap',

                      alignItems:
                        'center',

                      marginTop:
                        '16px'
                    }}
                  >

                    {safeUrl ? (

                      <button
                        type="button"
                        className="primary-btn"

                        onClick={() =>
                          openResource(
                            resource
                          )
                        }
                      >
                        Open Resource
                      </button>

                    ) : (

                      <span
                        className="tag"
                      >
                        Reference Entry
                      </span>

                    )}


                    {!resource.is_free && (

                      <small
                        style={{
                          color:
                            '#94a3b8'
                        }}
                      >
                        Availability may depend
                        on the publisher or source.
                      </small>

                    )}

                  </div>

                </article>

              );
            }
          )}

      </section>

    </div>
  );
}

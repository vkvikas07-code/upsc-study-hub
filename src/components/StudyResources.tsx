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

type SortMode =
  | 'recommended'
  | 'newest'
  | 'az';

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
    Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function resourceTypeLabel(
  type: ResourceType
) {
  switch (type) {
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

    default:
      return 'Resource';
  }
}

function stageLabel(
  stage: ExamStage
) {
  switch (stage) {
    case 'prelims':
      return 'Prelims';

    case 'mains':
      return 'Mains';

    case 'both':
      return 'Prelims + Mains';

    default:
      return 'UPSC';
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
      `${value.slice(0, 10)}T00:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '';
  }

  return date.toLocaleDateString(
    'en-IN',
    {
      month: 'long',
      year: 'numeric'
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
      new URL(value);

    if (
      url.protocol !== 'https:' &&
      url.protocol !== 'http:'
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

  const [
    resources,
    setResources
  ] =
    useState<ResourceRow[]>([]);

  const [
    loading,
    setLoading
  ] =
    useState(true);

  const [
    error,
    setError
  ] =
    useState('');

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
    useState('all');

  const [
    accessFilter,
    setAccessFilter
  ] =
    useState('all');

  const [
    sortMode,
    setSortMode
  ] =
    useState<SortMode>(
      'recommended'
    );

  const [
    advancedFiltersOpen,
    setAdvancedFiltersOpen
  ] =
    useState(false);

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

  async function loadResources() {

    if (!supabase) {
      setError(
        'Supabase is not configured.'
      );

      setLoading(false);

      return;
    }

    setLoading(true);
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

      setResources([]);

      setLoading(false);

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
            ) as ResourceType,

          exam_stage:
            (
              item.exam_stage ||
              'both'
            ) as ExamStage,

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
            item.edition_year === null ||
            item.edition_year === undefined
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

  useEffect(
    () => {
      void loadResources();
    },
    []
  );

  const subjects =
    useMemo(
      () =>
        Array
          .from(
            new Set(
              resources
                .map(
                  resource =>
                    resource
                      .subject
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
          ),
      [
        resources
      ]
    );

  const languages =
    useMemo(
      () =>
        Array
          .from(
            new Set(
              resources
                .map(
                  resource =>
                    resource
                      .language
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
          ),
      [
        resources
      ]
    );

  const visibleResources =
    useMemo(
      () => {

        const query =
          search
            .trim()
            .toLowerCase();

        return resources.filter(
          resource => {

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

            if (
              typeFilter !==
                'all' &&
              resource.resource_type !==
                typeFilter
            ) {
              return false;
            }

            if (
              subjectFilter !==
                'all' &&
              resource.subject !==
                subjectFilter
            ) {
              return false;
            }

            if (
              languageFilter !==
                'all' &&
              resource.language !==
                languageFilter
            ) {
              return false;
            }

            if (
              accessFilter ===
                'free' &&
              !resource.is_free
            ) {
              return false;
            }

            if (
              !query
            ) {
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

            return searchable.includes(
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

  const sortedResources =
    useMemo(
      () => {
        const next =
          [
            ...visibleResources
          ];

        if (
          sortMode ===
          'newest'
        ) {
          return next.sort(
            (
              first,
              second
            ) =>
              new Date(
                second.created_at
              ).getTime() -
              new Date(
                first.created_at
              ).getTime()
          );
        }

        if (
          sortMode ===
          'az'
        ) {
          return next.sort(
            (
              first,
              second
            ) =>
              first.title
                .localeCompare(
                  second.title
                )
          );
        }

        return next;
      },
      [
        visibleResources,
        sortMode
      ]
    );

  const officialCount =
    useMemo(
      () =>
        resources.filter(
          resource =>
            resource.resource_type ===
            'official_source'
        ).length,
      [
        resources
      ]
    );

  const freeCount =
    useMemo(
      () =>
        resources.filter(
          resource =>
            resource.is_free
        ).length,
      [
        resources
      ]
    );

  function openResource(
    resource:
      ResourceRow
  ) {

    const url =
      getSafeExternalUrl(
        resource.external_url
      );

    if (
      !url
    ) {
      return;
    }

    window.open(
      url,
      '_blank',
      'noopener,noreferrer'
    );
  }

  async function openResourcePdf(
    resource:
      ResourceRow
  ) {
    if (
      !supabase ||
      !resource.file_path
    ) {
      return;
    }

    setError(
      ''
    );

    const {
      data,
      error:
        pdfError
    } =
      await supabase
        .storage
        .from(
          'study-resource-pdfs'
        )
        .createSignedUrl(
          resource.file_path,
          300
        );

    if (
      pdfError ||
      !data
    ) {
      setError(
        pdfError?.message ||
        'Unable to open PDF.'
      );

      return;
    }

    window.open(
      data.signedUrl,
      '_blank',
      'noopener,noreferrer'
    );
  }

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

    setSortMode(
      'recommended'
    );
  }

  return (

    <div>

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

      <section
        className="panel"
        style={{
          marginTop:
            '18px'
        }}
      >
        <span
          className="eyebrow"
        >
          QUICK ACCESS
        </span>

        <h3>
          Choose Study Material
        </h3>

        <div
          style={{
            display:
              'grid',

            gridTemplateColumns:
              'repeat(auto-fit, minmax(150px, 1fr))',

            gap:
              '10px',

            marginTop:
              '14px'
          }}
        >
          <button
            type="button"
            className={
              typeFilter ===
                'all'
                ? 'filter active'
                : 'filter'
            }
            onClick={() =>
              setTypeFilter(
                'all'
              )
            }
          >
            All Material
          </button>

          <button
            type="button"
            className={
              typeFilter ===
                'standard_book'
                ? 'filter active'
                : 'filter'
            }
            onClick={() =>
              setTypeFilter(
                'standard_book'
              )
            }
          >
            Standard Books
          </button>

          <button
            type="button"
            className={
              typeFilter ===
                'official_source'
                ? 'filter active'
                : 'filter'
            }
            onClick={() =>
              setTypeFilter(
                'official_source'
              )
            }
          >
            Official Sources
          </button>

          <button
            type="button"
            className={
              typeFilter ===
                'monthly_current_affairs'
                ? 'filter active'
                : 'filter'
            }
            onClick={() =>
              setTypeFilter(
                'monthly_current_affairs'
              )
            }
          >
            Monthly CA
          </button>

          <button
            type="button"
            className={
              typeFilter ===
                'notes'
                ? 'filter active'
                : 'filter'
            }
            onClick={() =>
              setTypeFilter(
                'notes'
              )
            }
          >
            Notes
          </button>

          <button
            type="button"
            className={
              typeFilter ===
                'report'
                ? 'filter active'
                : 'filter'
            }
            onClick={() =>
              setTypeFilter(
                'report'
              )
            }
          >
            Reports
          </button>

          <button
            type="button"
            className={
              typeFilter ===
                'pyq_resource'
                ? 'filter active'
                : 'filter'
            }
            onClick={() =>
              setTypeFilter(
                'pyq_resource'
              )
            }
          >
            PYQ Resources
          </button>

          <button
            type="button"
            className={
              typeFilter ===
                'syllabus_resource'
                ? 'filter active'
                : 'filter'
            }
            onClick={() =>
              setTypeFilter(
                'syllabus_resource'
              )
            }
          >
            Syllabus Resources
          </button>
        </div>
      </section>

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
              'repeat(auto-fit, minmax(180px, 1fr))',

            gap:
              '10px',

            marginTop:
              '12px'
          }}
        >

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
                    event.target.value
                  )
              }

              placeholder="Book, source, topic..."
            />

          </label>

          <label>

            Exam Stage

            <select
              value={
                stageFilter
              }

              onChange={
                event =>
                  setStageFilter(
                    event.target.value as
                      StageFilter
                  )
              }
            >

              <option
                value="all"
              >
                All Stages
              </option>

              <option
                value="prelims"
              >
                Prelims
              </option>

              <option
                value="mains"
              >
                Mains
              </option>

            </select>

          </label>

          <label>

            Sort

            <select
              value={
                sortMode
              }

              onChange={
                event =>
                  setSortMode(
                    event.target
                      .value as
                      SortMode
                  )
              }
            >

              <option
                value="recommended"
              >
                Recommended
              </option>

              <option
                value="newest"
              >
                Newest First
              </option>

              <option
                value="az"
              >
                A–Z
              </option>

            </select>

          </label>

        </div>

        <button
          type="button"
          className="secondary-btn"

          onClick={() =>
            setAdvancedFiltersOpen(
              current =>
                !current
            )
          }

          style={{
            width:
              '100%',

            marginTop:
              '10px',

            justifyContent:
              'space-between'
          }}
        >

          <span>
            More filters
          </span>

          <span>
            {
              advancedFiltersOpen
                ? 'Hide'
                : 'Open'
            }
          </span>

        </button>

        {advancedFiltersOpen && (

          <div
            style={{
              display:
                'grid',

              gridTemplateColumns:
                'repeat(auto-fit, minmax(160px, 1fr))',

              gap:
                '10px',

              marginTop:
                '10px'
            }}
          >

            <label>

              Resource Type

              <select
                value={
                  typeFilter
                }

                onChange={
                  event =>
                    setTypeFilter(
                      event.target.value as
                        ResourceType |
                        'all'
                    )
                }
              >

                <option
                  value="all"
                >
                  All Types
                </option>

                <option
                  value="standard_book"
                >
                  Standard Books
                </option>

                <option
                  value="official_source"
                >
                  Official Sources
                </option>

                <option
                  value="monthly_current_affairs"
                >
                  Monthly Current Affairs
                </option>

                <option
                  value="notes"
                >
                  Notes
                </option>

                <option
                  value="report"
                >
                  Reports
                </option>

                <option
                  value="pyq_resource"
                >
                  PYQ Resources
                </option>

                <option
                  value="syllabus_resource"
                >
                  Syllabus Resources
                </option>

              </select>

            </label>

            <label>

              Subject

              <select
                value={
                  subjectFilter
                }

                onChange={
                  event =>
                    setSubjectFilter(
                      event.target.value
                    )
                }
              >

                <option
                  value="all"
                >
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

            <label>

              Language

              <select
                value={
                  languageFilter
                }

                onChange={
                  event =>
                    setLanguageFilter(
                      event.target.value
                    )
                }
              >

                <option
                  value="all"
                >
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

            <label>

              Access

              <select
                value={
                  accessFilter
                }

                onChange={
                  event =>
                    setAccessFilter(
                      event.target.value
                    )
                }
              >

                <option
                  value="all"
                >
                  All Resources
                </option>

                <option
                  value="free"
                >
                  Free Only
                </option>

              </select>

            </label>

          </div>

        )}

      </section>

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

        {loading && (

          <article
            className="panel"
          >
            Loading study resources...
          </article>

        )}

        {!loading &&
          sortedResources.length ===
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

        {!loading &&
          sortedResources.map(
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
                          resource.resource_type
                        )
                      }
                    </span>

                    <span
                      className="tag"
                    >
                      {
                        stageLabel(
                          resource.exam_stage
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

                  <h3
                    style={{
                      marginTop:
                        '12px'
                    }}
                  >
                    {resource.title}
                  </h3>

                  {resource.description && (

                    <p>
                      {
                        resource.description
                      }
                    </p>

                  )}

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
                              resource.edition_year
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

                    {safeUrl && (

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

                    )}

                    {resource.file_path && (

                      <button
                        type="button"

                        className="secondary-btn"

                        onClick={() =>
                          void openResourcePdf(
                            resource
                          )
                        }
                      >
                        Open PDF
                      </button>

                    )}

                    {!safeUrl &&
                      !resource.file_path && (

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

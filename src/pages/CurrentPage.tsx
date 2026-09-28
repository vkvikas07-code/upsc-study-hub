import {
  useState
} from 'react';

import type {
  CurrentAffair
} from '../types';

import {
  TopBar
} from '../components/TopBar';

import {
  QuickNoteComposer
} from '../components/QuickNoteComposer';

import {
  supabase
} from '../lib/supabase';


type FilterKey =
  | 'all'
  | 'prelims'
  | 'mains'
  | 'pib';


type CurrentView =
  | 'daily'
  | 'monthly'
  | 'yearly'
  | 'newspaper';


type NewspaperKey =
  | 'all'
  | 'the_hindu'
  | 'indian_express';


type NoteExamStage =
  | 'general'
  | 'prelims'
  | 'mains'
  | 'both';


type DetailedArticle =
  CurrentAffair & {
    body:
      string | null;

    source_url:
      string | null;

    background:
      string | null;

    key_facts:
      string | null;

    prelims_points:
      string | null;

    mains_relevance:
      string | null;

    issues:
      string | null;

    way_forward:
      string | null;
  };


function parsePublishedDate(
  value: string
): Date | null {
  const clean =
    value.trim();

  if (!clean) {
    return null;
  }

  const lower =
    clean.toLowerCase();

  const today =
    new Date();

  if (
    lower ===
    'today'
  ) {
    return new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
  }

  if (
    lower ===
    'yesterday'
  ) {
    const date =
      new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );

    date.setDate(
      date.getDate() -
      1
    );

    return date;
  }

  const monthMap:
    Record<
      string,
      number
    > = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      oct: 9,
      nov: 10,
      dec: 11
    };

  const match =
    clean.match(
      /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/
    );

  if (match) {
    const day =
      Number(
        match[1]
      );

    const month =
      monthMap[
        match[2]
          .toLowerCase()
      ];

    const year =
      Number(
        match[3]
      );

    if (
      month !==
      undefined
    ) {
      return new Date(
        year,
        month,
        day
      );
    }
  }

  const parsed =
    new Date(
      clean
    );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return null;
  }

  return parsed;
}


function getDayKey(
  value: string
): string | null {
  const date =
    parsePublishedDate(
      value
    );

  if (!date) {
    return null;
  }

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() +
      1
    ).padStart(
      2,
      '0'
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      '0'
    );

  return (
    `${year}-${month}-${day}`
  );
}


function getMonthKey(
  value: string
): string | null {
  const date =
    parsePublishedDate(
      value
    );

  if (!date) {
    return null;
  }

  return (
    `${date.getFullYear()}-${String(
      date.getMonth() +
      1
    ).padStart(
      2,
      '0'
    )}`
  );
}


function getYearKey(
  value: string
): string | null {
  const date =
    parsePublishedDate(
      value
    );

  if (!date) {
    return null;
  }

  return String(
    date.getFullYear()
  );
}


function getArticleDateValue(
  item: CurrentAffair
): string {
  return (
    item.publishedAtIso ||
    item.publishedAt
  );
}


function formatDayKey(
  value: string
): string {
  const [
    year,
    month,
    day
  ] =
    value
      .split('-')
      .map(Number);

  return new Date(
    year,
    month - 1,
    day
  ).toLocaleDateString(
    'en-IN',
    {
      day:
        '2-digit',

      month:
        'long',

      year:
        'numeric'
    }
  );
}


function formatMonthKey(
  value: string
): string {
  const [
    year,
    month
  ] =
    value
      .split('-')
      .map(Number);

  return new Date(
    year,
    month - 1,
    1
  ).toLocaleDateString(
    'en-IN',
    {
      month:
        'long',

      year:
        'numeric'
    }
  );
}


function getNewspaperKey(
  source: string
):
  | NewspaperKey
  | 'other' {
  const clean =
    source
      .trim()
      .toLowerCase();

  if (
    clean.includes(
      'the hindu'
    ) ||
    clean ===
      'hindu'
  ) {
    return 'the_hindu';
  }

  if (
    clean.includes(
      'indian express'
    )
  ) {
    return 'indian_express';
  }

  return 'other';
}


function getNoteExamStage(
  item: DetailedArticle
): NoteExamStage {
  if (
    item.prelims &&
    item.mains
  ) {
    return 'both';
  }

  if (
    item.prelims
  ) {
    return 'prelims';
  }

  if (
    item.mains
  ) {
    return 'mains';
  }

  return 'general';
}


function AnalysisSection({
  title,
  children
}: {
  title: string;
  children: string | null;
}) {
  if (
    !children?.trim()
  ) {
    return null;
  }

  return (
    <section
      className="panel"
      style={{
        padding:
          '20px',

        marginTop:
          '16px'
      }}
    >
      <span
        className="eyebrow"
      >
        {title}
      </span>

      <div
        style={{
          whiteSpace:
            'pre-wrap',

          color:
            '#cbd5e1',

          lineHeight:
            1.8,

          marginTop:
            '12px'
        }}
      >
        {children}
      </div>
    </section>
  );
}


export function CurrentPage({
  items
}: {
  items: CurrentAffair[];
}) {
  const [
    filter,
    setFilter
  ] =
    useState<FilterKey>(
      'all'
    );

  const [
    viewMode,
    setViewMode
  ] =
    useState<CurrentView>(
      'daily'
    );

  const [
    selectedDay,
    setSelectedDay
  ] =
    useState('');

  const [
    selectedMonth,
    setSelectedMonth
  ] =
    useState('');

  const [
    selectedYear,
    setSelectedYear
  ] =
    useState('');

  const [
    newspaperFilter,
    setNewspaperFilter
  ] =
    useState<NewspaperKey>(
      'all'
    );

  const [
    selectedNewspaperDay,
    setSelectedNewspaperDay
  ] =
    useState('');

  const [
    selected,
    setSelected
  ] =
    useState<
      DetailedArticle |
      null
    >(
      null
    );

  const [
    loadingId,
    setLoadingId
  ] =
    useState<
      string |
      null
    >(
      null
    );

  const [
    error,
    setError
  ] =
    useState('');


  const filteredItems =
    items.filter(
      item => {
        if (
          filter ===
          'prelims'
        ) {
          return item.prelims;
        }

        if (
          filter ===
          'mains'
        ) {
          return item.mains;
        }

        if (
          filter ===
          'pib'
        ) {
          return item.source
            .toLowerCase()
            .includes(
              'pib'
            );
        }

        return true;
      }
    );


  const availableDays =
    Array.from(
      new Set(
        items
          .map(
            item =>
              getDayKey(
                getArticleDateValue(
                  item
                )
              )
          )
          .filter(
            (
              value
            ):
              value is string =>
                Boolean(
                  value
                )
          )
      )
    ).sort(
      (
        a,
        b
      ) =>
        b.localeCompare(
          a
        )
    );


  const availableMonths =
    Array.from(
      new Set(
        items
          .map(
            item =>
              getMonthKey(
                getArticleDateValue(
                  item
                )
              )
          )
          .filter(
            (
              value
            ):
              value is string =>
                Boolean(
                  value
                )
          )
      )
    ).sort(
      (
        a,
        b
      ) =>
        b.localeCompare(
          a
        )
    );


  const availableYears =
    Array.from(
      new Set(
        items
          .map(
            item =>
              getYearKey(
                getArticleDateValue(
                  item
                )
              )
          )
          .filter(
            (
              value
            ):
              value is string =>
                Boolean(
                  value
                )
          )
      )
    ).sort(
      (
        a,
        b
      ) =>
        Number(b) -
        Number(a)
    );


  const availableNewspaperDays =
    Array.from(
      new Set(
        items
          .filter(
            item => {
              const sourceKey =
                getNewspaperKey(
                  item.source
                );

              return (
                sourceKey ===
                  'the_hindu' ||
                sourceKey ===
                  'indian_express'
              );
            }
          )
          .map(
            item =>
              getDayKey(
                getArticleDateValue(
                  item
                )
              )
          )
          .filter(
            (
              value
            ):
              value is string =>
                Boolean(
                  value
                )
          )
      )
    ).sort(
      (
        a,
        b
      ) =>
        b.localeCompare(
          a
        )
    );


  const activeDay =
    selectedDay ||
    availableDays[0] ||
    '';

  const activeMonth =
    selectedMonth ||
    availableMonths[0] ||
    '';

  const activeYear =
    selectedYear ||
    availableYears[0] ||
    '';

  const activeNewspaperDay =
    selectedNewspaperDay ||
    availableNewspaperDays[0] ||
    '';


  const visibleItems =
    filteredItems.filter(
      item => {
        if (
          viewMode ===
          'daily'
        ) {
          return (
            getDayKey(
              getArticleDateValue(
                item
              )
            ) ===
            activeDay
          );
        }

        if (
          viewMode ===
          'monthly'
        ) {
          return (
            getMonthKey(
              getArticleDateValue(
                item
              )
            ) ===
            activeMonth
          );
        }

        if (
          viewMode ===
          'yearly'
        ) {
          return (
            getYearKey(
              getArticleDateValue(
                item
              )
            ) ===
            activeYear
          );
        }

        const sourceKey =
          getNewspaperKey(
            item.source
          );

        const articleDay =
          getDayKey(
            getArticleDateValue(
              item
            )
          );

        if (
          articleDay !==
          activeNewspaperDay
        ) {
          return false;
        }

        if (
          newspaperFilter ===
          'all'
        ) {
          return (
            sourceKey ===
              'the_hindu' ||
            sourceKey ===
              'indian_express'
          );
        }

        return (
          sourceKey ===
          newspaperFilter
        );
      }
    );


  async function openAnalysis(
    item: CurrentAffair
  ) {
    setError('');

    setLoadingId(
      item.id
    );

    if (
      !supabase
    ) {
      setSelected({
        ...item,

        sourceUrl:
          item.sourceUrl ||
          null,

        body:
          item.summary,

        source_url:
          item.sourceUrl ||
          null,

        background:
          null,

        key_facts:
          null,

        prelims_points:
          null,

        mains_relevance:
          null,

        issues:
          null,

        way_forward:
          null
      });

      setLoadingId(
        null
      );

      return;
    }

    const {
      data,
      error:
        loadError
    } =
      await supabase
        .from(
          'current_affairs'
        )
        .select(`
          id,
          title,
          source,
          source_url,
          subject,
          summary,
          body,
          background,
          key_facts,
          prelims_points,
          mains_relevance,
          issues,
          way_forward,
          tags,
          prelims,
          mains,
          published_at,
          status
        `)
        .eq(
          'id',
          item.id
        )
        .eq(
          'status',
          'published'
        )
        .single();

    if (
      loadError ||
      !data
    ) {
      console.error(
        'Unable to load analysis:',
        loadError
      );

      setError(
        loadError?.message ||
        'Unable to load this analysis.'
      );

      setLoadingId(
        null
      );

      return;
    }

    setSelected({
      id:
        data.id,

      title:
        data.title,

      source:
        data.source,

      sourceUrl:
        data.source_url,

      source_url:
        data.source_url,

      subject:
        data.subject,

      summary:
        data.summary,

      body:
        data.body,

      background:
        data.background,

      key_facts:
        data.key_facts,

      prelims_points:
        data.prelims_points,

      mains_relevance:
        data.mains_relevance,

      issues:
        data.issues,

      way_forward:
        data.way_forward,

      tags:
        data.tags ||
        [],

      prelims:
        data.prelims,

      mains:
        data.mains,

      publishedAt:
        data.published_at
          ? new Date(
              data.published_at
            )
              .toLocaleDateString(
                'en-IN',
                {
                  day:
                    '2-digit',

                  month:
                    'short',

                  year:
                    'numeric'
                }
              )
          : '',

      publishedAtIso:
        data.published_at ||
        null
    });

    setLoadingId(
      null
    );

    const mainArea =
      document.querySelector(
        '.main-area'
      );

    mainArea?.scrollTo({
      top:
        0
    });
  }


  if (
    selected
  ) {
    const hasStructuredAnalysis =
      Boolean(
        selected.background ||
        selected.key_facts ||
        selected.prelims_points ||
        selected.mains_relevance ||
        selected.issues ||
        selected.way_forward
      );

    const noteExamStage =
      getNoteExamStage(
        selected
      );

    return (
      <div
        className="page-wrap"
      >
        <TopBar
          title="Current Affairs Analysis"
          subtitle="UPSC-focused, revision-ready understanding"
        />

        <button
          type="button"
          className="secondary-btn"
          onClick={() =>
            setSelected(
              null
            )
          }
          style={{
            marginBottom:
              '18px'
          }}
        >
          ← Back to Current Affairs
        </button>

        <article
          className="panel"
          style={{
            maxWidth:
              '940px',

            margin:
              '0 auto 18px',

            padding:
              '24px'
          }}
        >
          <div
            className="article-meta"
          >
            <span>
              {selected.subject}
            </span>

            <time>
              {selected.publishedAt}
            </time>
          </div>

          <h1
            style={{
              margin:
                '12px 0 8px',

              lineHeight:
                1.25
            }}
          >
            {selected.title}
          </h1>

          <div
            className="tag-row"
            style={{
              marginTop:
                '15px'
            }}
          >
            {selected.prelims && (
              <span
                className="tag"
              >
                Prelims
              </span>
            )}

            {selected.mains && (
              <span
                className="tag"
              >
                Mains
              </span>
            )}

            {selected.tags.map(
              tag => (
                <span
                  className="tag"
                  key={
                    tag
                  }
                >
                  {tag}
                </span>
              )
            )}
          </div>
        </article>

        <div
          style={{
            maxWidth:
              '940px',

            margin:
              '0 auto 32px'
          }}
        >
          <section
            style={{
              padding:
                '20px',

              borderRadius:
                '16px',

              background:
                'rgba(20,184,166,.09)',

              border:
                '1px solid rgba(20,184,166,.24)'
            }}
          >
            <span
              className="eyebrow"
            >
              QUICK REVISION
            </span>

            <p
              style={{
                color:
                  '#e2e8f0',

                lineHeight:
                  1.75,

                marginBottom:
                  0
              }}
            >
              {selected.summary}
            </p>
          </section>

          <section
            className="panel"
            style={{
              marginTop:
                '16px',

              padding:
                '20px',

              border:
                '1px solid rgba(45,212,191,.22)',

              background:
                'linear-gradient(135deg, rgba(20,184,166,.07), rgba(59,130,246,.035))'
            }}
          >
            <span
              className="eyebrow"
            >
              PERSONAL NOTES
            </span>

            <h3
              style={{
                margin:
                  '7px 0'
              }}
            >
              Keep your own revision point
            </h3>

            <p
              style={{
                margin:
                  '0 0 14px',

                color:
                  '#94a3b8'
              }}
            >
              Add your own observation, fact, example or answer-writing point without leaving this article.
            </p>

            <QuickNoteComposer
              buttonLabel="+ Add Note"
              defaultTitle={
                selected.title
              }
              defaultSubject={
                selected.subject
              }
              defaultTopic={
                selected.title
              }
              defaultContent={
                selected.summary
              }
              defaultTags={
                selected.tags
              }
              examStage={
                noteExamStage
              }
              noteType="current_affairs"
              currentAffairId={
                selected.id
              }
              sourceUrl={
                selected.source_url
              }
            />
          </section>

          <AnalysisSection
            title="BACKGROUND"
          >
            {selected.background}
          </AnalysisSection>

          <AnalysisSection
            title="KEY FACTS"
          >
            {selected.key_facts}
          </AnalysisSection>

          {selected.prelims && (
            <AnalysisSection
              title="PRELIMS POINTS"
            >
              {selected.prelims_points}
            </AnalysisSection>
          )}

          {selected.mains && (
            <AnalysisSection
              title="MAINS RELEVANCE"
            >
              {selected.mains_relevance}
            </AnalysisSection>
          )}

          <AnalysisSection
            title="ISSUES / CHALLENGES"
          >
            {selected.issues}
          </AnalysisSection>

          <AnalysisSection
            title="WAY FORWARD"
          >
            {selected.way_forward}
          </AnalysisSection>

          {!hasStructuredAnalysis &&
            selected.body?.trim() && (
              <AnalysisSection
                title="DETAILED ANALYSIS"
              >
                {selected.body}
              </AnalysisSection>
            )}

          <section
            className="panel"
            style={{
              marginTop:
                '16px',

              padding:
                '20px'
            }}
          >
            <span
              className="eyebrow"
            >
              SOURCE
            </span>

            <p
              style={{
                color:
                  '#cbd5e1',

                marginBottom:
                  selected.source_url
                    ? '14px'
                    : 0
              }}
            >
              {selected.source}
            </p>

            {selected.source_url && (
              <a
                href={
                  selected.source_url
                }
                target="_blank"
                rel="noreferrer"
                className="primary-btn"
                style={{
                  display:
                    'inline-block',

                  textDecoration:
                    'none'
                }}
              >
                Open original source ↗
              </a>
            )}
          </section>
        </div>
      </div>
    );
  }


  return (
    <div
      className="page-wrap"
    >
      <TopBar
        title="Current Affairs"
        subtitle="Daily news, revision archives and newspaper reading"
      />

      <section
        className="panel"
        style={{
          marginBottom:
            '18px',

          padding:
            '14px'
        }}
      >
        <span
          className="eyebrow"
        >
          CURRENT AFFAIRS HUB
        </span>

        <div
          style={{
            display:
              'grid',

            gridTemplateColumns:
              'repeat(auto-fit,minmax(150px,1fr))',

            gap:
              '8px',

            marginTop:
              '12px'
          }}
        >
          <button
            type="button"
            className={
              viewMode ===
                'daily'
                ? 'filter active'
                : 'filter'
            }
            onClick={() =>
              setViewMode(
                'daily'
              )
            }
          >
            Daily
          </button>

          <button
            type="button"
            className={
              viewMode ===
                'monthly'
                ? 'filter active'
                : 'filter'
            }
            onClick={() =>
              setViewMode(
                'monthly'
              )
            }
          >
            Monthly
          </button>

          <button
            type="button"
            className={
              viewMode ===
                'yearly'
                ? 'filter active'
                : 'filter'
            }
            onClick={() =>
              setViewMode(
                'yearly'
              )
            }
          >
            Yearly
          </button>

          <button
            type="button"
            className={
              viewMode ===
                'newspaper'
                ? 'filter active'
                : 'filter'
            }
            onClick={() => {
              setViewMode(
                'newspaper'
              );

              if (
                filter ===
                'pib'
              ) {
                setFilter(
                  'all'
                );
              }
            }}
          >
            Newspaper Reading
          </button>
        </div>

        {viewMode ===
          'daily' && (
          <label
            style={{
              display:
                'grid',

              gap:
                '7px',

              marginTop:
                '16px'
            }}
          >
            Select Date

            <select
              value={
                activeDay
              }
              onChange={
                event =>
                  setSelectedDay(
                    event
                      .target
                      .value
                  )
              }
            >
              {availableDays.map(
                value => (
                  <option
                    key={
                      value
                    }
                    value={
                      value
                    }
                  >
                    {formatDayKey(
                      value
                    )}
                  </option>
                )
              )}
            </select>
          </label>
        )}

        {viewMode ===
          'monthly' && (
          <label
            style={{
              display:
                'grid',

              gap:
                '7px',

              marginTop:
                '16px'
            }}
          >
            Select Month

            <select
              value={
                activeMonth
              }
              onChange={
                event =>
                  setSelectedMonth(
                    event
                      .target
                      .value
                  )
              }
            >
              {availableMonths.map(
                value => (
                  <option
                    key={
                      value
                    }
                    value={
                      value
                    }
                  >
                    {formatMonthKey(
                      value
                    )}
                  </option>
                )
              )}
            </select>
          </label>
        )}

        {viewMode ===
          'yearly' && (
          <label
            style={{
              display:
                'grid',

              gap:
                '7px',

              marginTop:
                '16px'
            }}
          >
            Select Year

            <select
              value={
                activeYear
              }
              onChange={
                event =>
                  setSelectedYear(
                    event
                      .target
                      .value
                  )
              }
            >
              {availableYears.map(
                value => (
                  <option
                    key={
                      value
                    }
                    value={
                      value
                    }
                  >
                    {value}
                  </option>
                )
              )}
            </select>
          </label>
        )}

        {viewMode ===
          'newspaper' && (
          <>
            <p
              style={{
                marginTop:
                  '16px',

                color:
                  '#94a3b8'
              }}
            >
              UPSC-focused newspaper reading with special emphasis on The Hindu and The Indian Express.
            </p>

            <label
              style={{
                display:
                  'grid',

                gap:
                  '7px',

                marginTop:
                  '14px',

                marginBottom:
                  '14px'
              }}
            >
              Newspaper Date

              <select
                value={
                  activeNewspaperDay
                }
                onChange={
                  event =>
                    setSelectedNewspaperDay(
                      event
                        .target
                        .value
                    )
                }
              >
                {availableNewspaperDays.map(
                  value => (
                    <option
                      key={
                        value
                      }
                      value={
                        value
                      }
                    >
                      {formatDayKey(
                        value
                      )}
                    </option>
                  )
                )}
              </select>
            </label>

            <div
              className="filter-row"
            >
              <button
                type="button"
                className={
                  newspaperFilter ===
                    'all'
                    ? 'filter active'
                    : 'filter'
                }
                onClick={() =>
                  setNewspaperFilter(
                    'all'
                  )
                }
              >
                All Newspapers
              </button>

              <button
                type="button"
                className={
                  newspaperFilter ===
                    'the_hindu'
                    ? 'filter active'
                    : 'filter'
                }
                onClick={() =>
                  setNewspaperFilter(
                    'the_hindu'
                  )
                }
              >
                The Hindu
              </button>

              <button
                type="button"
                className={
                  newspaperFilter ===
                    'indian_express'
                    ? 'filter active'
                    : 'filter'
                }
                onClick={() =>
                  setNewspaperFilter(
                    'indian_express'
                  )
                }
              >
                Indian Express
              </button>
            </div>
          </>
        )}
      </section>

      <div
        className="filter-row"
      >
        <button
          type="button"
          className={
            `filter ${
              filter ===
                'all'
                ? 'active'
                : ''
            }`
          }
          onClick={() =>
            setFilter(
              'all'
            )
          }
        >
          All
        </button>

        <button
          type="button"
          className={
            `filter ${
              filter ===
                'prelims'
                ? 'active'
                : ''
            }`
          }
          onClick={() =>
            setFilter(
              'prelims'
            )
          }
        >
          Prelims
        </button>

        <button
          type="button"
          className={
            `filter ${
              filter ===
                'mains'
                ? 'active'
                : ''
            }`
          }
          onClick={() =>
            setFilter(
              'mains'
            )
          }
        >
          Mains
        </button>

        <button
          type="button"
          className={
            `filter ${
              filter ===
                'pib'
                ? 'active'
                : ''
            }`
          }
          onClick={() =>
            setFilter(
              'pib'
            )
          }
        >
          PIB
        </button>
      </div>

      {error && (
        <div
          className="panel"
          style={{
            marginBottom:
              '14px',

            color:
              '#fca5a5'
          }}
        >
          {error}
        </div>
      )}

      <section
        className="article-list"
      >
        {visibleItems.map(
          item => (
            <article
              className="article-card"
              key={
                item.id
              }
            >
              <div
                className="article-meta"
              >
                <span>
                  {item.subject}
                </span>

                <time>
                  {item.publishedAt}
                </time>
              </div>

              <h2>
                {item.title}
              </h2>

              <p>
                {item.summary}
              </p>

              <div
                className="tag-row"
              >
                {item.prelims && (
                  <span
                    className="tag"
                  >
                    Prelims
                  </span>
                )}

                {item.mains && (
                  <span
                    className="tag"
                  >
                    Mains
                  </span>
                )}

                {item.tags.map(
                  tag => (
                    <span
                      className="tag"
                      key={
                        tag
                      }
                    >
                      {tag}
                    </span>
                  )
                )}
              </div>

              <div
                className="article-foot"
              >
                <small>
                  Source:
                  {' '}
                  {item.source}
                </small>

                <div
                  style={{
                    display:
                      'flex',

                    gap:
                      '10px',

                    alignItems:
                      'center',

                    flexWrap:
                      'wrap'
                  }}
                >
                  {item.sourceUrl && (
                    <a
                      href={
                        item.sourceUrl
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="text-btn"
                      style={{
                        textDecoration:
                          'none'
                      }}
                    >
                      Original source ↗
                    </a>
                  )}

                  <button
                    className="text-btn"
                    type="button"
                    disabled={
                      loadingId ===
                      item.id
                    }
                    onClick={() =>
                      void openAnalysis(
                        item
                      )
                    }
                  >
                    {
                      loadingId ===
                        item.id
                        ? 'Loading...'
                        : 'Read analysis'
                    }
                  </button>
                </div>
              </div>
            </article>
          )
        )}

        {visibleItems.length ===
          0 && (
          <div
            className="panel"
          >
            <p
              style={{
                margin:
                  0
              }}
            >
              No Current Affairs match this view or filter yet.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

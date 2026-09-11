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


type DetailedArticle =
  CurrentAffair & {

    body:
      string |
      null;

    source_url:
      string |
      null;

    background:
      string |
      null;

    key_facts:
      string |
      null;

    prelims_points:
      string |
      null;

    mains_relevance:
      string |
      null;

    issues:
      string |
      null;

    way_forward:
      string |
      null;
  };


type NoteExamStage =
  | 'general'
  | 'prelims'
  | 'mains'
  | 'both';


/*
 * =========================================
 * ANALYSIS SECTION
 * =========================================
 */

function AnalysisSection({

  title,
  children

}: {

  title:
    string;

  children:
    string |
    null;

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


/*
 * =========================================
 * NOTE EXAM STAGE
 * =========================================
 */

function getNoteExamStage(
  item:
    DetailedArticle
):
  NoteExamStage {

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


/*
 * =========================================
 * CURRENT AFFAIRS PAGE
 * =========================================
 */

export function CurrentPage({

  items

}: {

  items:
    CurrentAffair[];

}) {

  /*
   * =========================================
   * FILTER
   * =========================================
   */

  const [
    filter,
    setFilter
  ] =
    useState<FilterKey>(
      'all'
    );


  /*
   * =========================================
   * SELECTED ARTICLE
   * =========================================
   */

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


  /*
   * =========================================
   * LOADING
   * =========================================
   */

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


  /*
   * =========================================
   * ERROR
   * =========================================
   */

  const [
    error,
    setError
  ] =
    useState('');


  /*
   * =========================================
   * FILTERED ITEMS
   * =========================================
   */

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


  /*
   * =========================================
   * OPEN FULL ANALYSIS
   * =========================================
   */

  async function openAnalysis(
    item:
      CurrentAffair
  ) {

    setError('');


    setLoadingId(
      item.id
    );


    /*
     * =====================================
     * SUPABASE NOT CONFIGURED
     * =====================================
     */

    if (
      !supabase
    ) {

      setSelected({

        ...item,

        body:
          item.summary,

        source_url:
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


    /*
     * =====================================
     * LOAD FULL ARTICLE
     * =====================================
     */

    const {
      data,
      error:
        loadError
    } =
      await supabase
        .from(
          'current_affairs'
        )
        .select(
          `
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
          `
        )
        .eq(
          'id',
          item.id
        )
        .eq(
          'status',
          'published'
        )
        .single();


    /*
     * =====================================
     * LOAD ERROR
     * =====================================
     */

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


    /*
     * =====================================
     * SET SELECTED ARTICLE
     * =====================================
     */

    setSelected({

      id:
        data.id,

      title:
        data.title,

      source:
        data.source,

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

          : ''

    });


    setLoadingId(
      null
    );


    /*
     * =====================================
     * SCROLL TOP
     * =====================================
     */

    const mainArea =
      document.querySelector(
        '.main-area'
      );


    if (
      mainArea
    ) {

      mainArea.scrollTo({
        top:
          0
      });
    }
  }


  /*
   * =========================================
   * DETAILED ARTICLE VIEW
   * =========================================
   */

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

        {/* =================================
            TOP BAR
        ================================= */}

        <TopBar
          title="Current Affairs Analysis"
          subtitle="UPSC-focused, revision-ready understanding"
        />


        {/* =================================
            BACK
        ================================= */}

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


        {/* =================================
            ARTICLE HEADER
        ================================= */}

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


        {/* =================================
            ANALYSIS CONTENT
        ================================= */}

        <div
          style={{
            maxWidth:
              '940px',

            margin:
              '0 auto 32px'
          }}
        >

          {/* =================================
              QUICK REVISION
          ================================= */}

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


          {/* =================================
              PERSONAL NOTE
          ================================= */}

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
              Add your own observation,
              fact, example or answer-writing
              point without leaving this article.
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


          {/* =================================
              BACKGROUND
          ================================= */}

          <AnalysisSection
            title="BACKGROUND"
          >
            {selected.background}
          </AnalysisSection>


          {/* =================================
              KEY FACTS
          ================================= */}

          <AnalysisSection
            title="KEY FACTS"
          >
            {selected.key_facts}
          </AnalysisSection>


          {/* =================================
              PRELIMS
          ================================= */}

          {selected.prelims && (

            <AnalysisSection
              title="PRELIMS POINTS"
            >
              {selected.prelims_points}
            </AnalysisSection>

          )}


          {/* =================================
              MAINS
          ================================= */}

          {selected.mains && (

            <AnalysisSection
              title="MAINS RELEVANCE"
            >
              {selected.mains_relevance}
            </AnalysisSection>

          )}


          {/* =================================
              ISSUES
          ================================= */}

          <AnalysisSection
            title="ISSUES / CHALLENGES"
          >
            {selected.issues}
          </AnalysisSection>


          {/* =================================
              WAY FORWARD
          ================================= */}

          <AnalysisSection
            title="WAY FORWARD"
          >
            {selected.way_forward}
          </AnalysisSection>


          {/* =================================
              FALLBACK DETAILED ANALYSIS
          ================================= */}

          {!hasStructuredAnalysis &&
            selected.body?.trim() && (

            <AnalysisSection
              title="DETAILED ANALYSIS"
            >
              {selected.body}
            </AnalysisSection>

          )}


          {/* =================================
              SOURCE
          ================================= */}

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
                Open official source ↗
              </a>

            )}

          </section>

        </div>

      </div>

    );
  }


  /*
   * =========================================
   * CURRENT AFFAIRS LIST
   * =========================================
   */

  return (

    <div
      className="page-wrap"
    >

      {/* =================================
          TOP BAR
      ================================= */}

      <TopBar
        title="Current Affairs"
        subtitle="Relevant, linked and revision-ready"
      />


      {/* =================================
          FILTERS
      ================================= */}

      <div
        className="filter-row"
      >

        <button
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


      {/* =================================
          ERROR
      ================================= */}

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


      {/* =================================
          ARTICLE LIST
      ================================= */}

      <section
        className="article-list"
      >

        {filteredItems.map(
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


                <button
                  className="text-btn"

                  type="button"

                  disabled={
                    loadingId ===
                    item.id
                  }

                  onClick={() =>
                    openAnalysis(
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

            </article>

          )
        )}


        {/* =================================
            EMPTY STATE
        ================================= */}

        {filteredItems.length ===
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
              No Current Affairs match
              this filter yet.
            </p>

          </div>

        )}

      </section>

    </div>

  );
}

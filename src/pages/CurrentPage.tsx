import { useState } from 'react';

import type { CurrentAffair } from '../types';
import { TopBar } from '../components/TopBar';
import { supabase } from '../lib/supabase';

type FilterKey =
  | 'all'
  | 'prelims'
  | 'mains'
  | 'pib';

type DetailedArticle =
  CurrentAffair & {
    body: string | null;

    source_url: string | null;
    background: string | null;
    key_facts: string | null;
    prelims_points: string | null;
    mains_relevance: string | null;
    issues: string | null;
    way_forward: string | null;
  };

function AnalysisSection({
  title,
  children
}: {
  title: string;
  children: string | null;
}) {
  if (!children?.trim()) {
    return null;
  }

  return (
    <section
      className="panel"
      style={{
        padding: '20px',
        marginTop: '16px'
      }}
    >
      <span className="eyebrow">
        {title}
      </span>

      <div
        style={{
          whiteSpace: 'pre-wrap',
          color: '#cbd5e1',
          lineHeight: 1.8,
          marginTop: '12px'
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
  const [filter, setFilter] =
    useState<FilterKey>('all');

  const [selected, setSelected] =
    useState<DetailedArticle | null>(
      null
    );

  const [loadingId, setLoadingId] =
    useState<string | null>(null);

  const [error, setError] =
    useState('');

  const filteredItems =
    items.filter(item => {
      if (filter === 'prelims') {
        return item.prelims;
      }

      if (filter === 'mains') {
        return item.mains;
      }

      if (filter === 'pib') {
        return item.source
          .toLowerCase()
          .includes('pib');
      }

      return true;
    });

  async function openAnalysis(
    item: CurrentAffair
  ) {
    setError('');
    setLoadingId(item.id);

    if (!supabase) {
      setSelected({
        ...item,

        body: item.summary,

        source_url: null,
        background: null,
        key_facts: null,
        prelims_points: null,
        mains_relevance: null,
        issues: null,
        way_forward: null
      });

      setLoadingId(null);

      return;
    }

    const {
      data,
      error: loadError
    } = await supabase
      .from('current_affairs')
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
      .eq('id', item.id)
      .eq('status', 'published')
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

      setLoadingId(null);

      return;
    }

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
        data.tags || [],

      prelims:
        data.prelims,

      mains:
        data.mains,

      publishedAt:
        data.published_at
          ? new Date(
              data.published_at
            ).toLocaleDateString(
              'en-IN',
              {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              }
            )
          : ''
    });

    setLoadingId(null);

    const mainArea =
      document.querySelector(
        '.main-area'
      );

    if (mainArea) {
      mainArea.scrollTo({
        top: 0
      });
    }
  }

  if (selected) {
    const hasStructuredAnalysis =
      Boolean(
        selected.background ||
        selected.key_facts ||
        selected.prelims_points ||
        selected.mains_relevance ||
        selected.issues ||
        selected.way_forward
      );

    return (
      <div className="page-wrap">

        <TopBar
          title="Current Affairs Analysis"
          subtitle="UPSC-focused, revision-ready understanding"
        />

        <button
          type="button"
          className="secondary-btn"
          onClick={() =>
            setSelected(null)
          }
          style={{
            marginBottom: '18px'
          }}
        >
          ← Back to Current Affairs
        </button>

        <article
          className="panel"
          style={{
            maxWidth: '940px',
            margin: '0 auto 18px',
            padding: '24px'
          }}
        >

          <div className="article-meta">

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
              marginTop: '15px'
            }}
          >

            {selected.tags.map(
              tag => (
                <span
                  className="tag"
                  key={tag}
                >
                  {tag}
                </span>
              )
            )}

          </div>

        </article>

        <div
          style={{
            maxWidth: '940px',
            margin: '0 auto 32px'
          }}
        >

          <section
            style={{
              padding: '20px',

              borderRadius:
                '16px',

              background:
                'rgba(20,184,166,.09)',

              border:
                '1px solid rgba(20,184,166,.24)'
            }}
          >

            <span className="eyebrow">
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
              marginTop: '16px',
              padding: '20px'
            }}
          >

            <span className="eyebrow">
              SOURCE
            </span>

            <p
              style={{
                color: '#cbd5e1',
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

  return (
    <div className="page-wrap">

      <TopBar
        title="Current Affairs"
        subtitle="Relevant, linked and revision-ready"
      />

      <div className="filter-row">

        <button
          className={
            `filter ${
              filter === 'all'
                ? 'active'
                : ''
            }`
          }
          onClick={() =>
            setFilter('all')
          }
        >
          All
        </button>

        <button
          className={
            `filter ${
              filter === 'prelims'
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
              filter === 'mains'
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
              filter === 'pib'
                ? 'active'
                : ''
            }`
          }
          onClick={() =>
            setFilter('pib')
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

      <section className="article-list">

        {filteredItems.map(
          item => (
            <article
              className="article-card"
              key={item.id}
            >

              <div className="article-meta">

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

              <div className="tag-row">

                {item.tags.map(
                  tag => (
                    <span
                      className="tag"
                      key={tag}
                    >
                      {tag}
                    </span>
                  )
                )}

              </div>

              <div className="article-foot">

                <small>
                  Source: {item.source}
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
                  {loadingId ===
                  item.id
                    ? 'Loading...'
                    : 'Read analysis'}
                </button>

              </div>

            </article>
          )
        )}

        {filteredItems.length ===
          0 && (
          <div className="panel">

            <p
              style={{
                margin: 0
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

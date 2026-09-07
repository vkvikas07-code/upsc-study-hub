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
  };

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

  const [loading, setLoading] =
    useState(false);

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
    setLoading(true);

    if (!supabase) {
      setSelected({
        ...item,
        body: item.summary
      });

      setLoading(false);
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
        subject,
        summary,
        body,
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

    if (loadError || !data) {
      console.error(
        'Unable to load analysis:',
        loadError
      );

      setError(
        loadError?.message ||
          'Unable to load this analysis.'
      );

      setLoading(false);
      return;
    }

    setSelected({
      id: data.id,

      title: data.title,

      source: data.source,

      subject: data.subject,

      summary: data.summary,

      body: data.body,

      tags: data.tags || [],

      prelims: data.prelims,

      mains: data.mains,

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

    setLoading(false);
  }

  if (selected) {
    return (
      <div className="page-wrap">

        <TopBar
          title="Current Affairs Analysis"
          subtitle="Detailed, revision-ready understanding"
        />

        <button
          type="button"
          className="secondary-btn"
          onClick={() =>
            setSelected(null)
          }
          style={{
            marginBottom: '16px'
          }}
        >
          ← Back to Current Affairs
        </button>

        <article
          className="panel"
          style={{
            maxWidth: '900px',
            margin: '0 auto 28px'
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
              margin: '12px 0 10px',
              lineHeight: 1.2
            }}
          >
            {selected.title}
          </h1>

          <div
            className="tag-row"
            style={{
              marginTop: '14px'
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

          <section
            style={{
              margin: '20px 0',
              padding: '16px',
              borderRadius: '14px',
              background:
                'rgba(20,184,166,.08)',
              border:
                '1px solid rgba(20,184,166,.20)'
            }}
          >

            <span className="eyebrow">
              QUICK REVISION
            </span>

            <p
              style={{
                color: '#e2e8f0',
                marginBottom: 0,
                lineHeight: 1.7
              }}
            >
              {selected.summary}
            </p>

          </section>

          <section>

            <span className="eyebrow">
              DETAILED ANALYSIS
            </span>

            <div
              style={{
                whiteSpace:
                  'pre-wrap',

                color:
                  '#cbd5e1',

                lineHeight: 1.8,

                marginTop:
                  '12px',

                fontSize:
                  '.98rem'
              }}
            >
              {selected.body?.trim() ||
                'Detailed analysis has not been added yet.'}
            </div>

          </section>

          <div
            style={{
              marginTop: '24px',
              paddingTop: '14px',
              borderTop:
                '1px solid rgba(255,255,255,.08)',
              color:
                '#94a3b8',
              fontSize:
                '.82rem'
            }}
          >

            Source:{' '}

            <strong
              style={{
                color:
                  '#cbd5e1'
              }}
            >
              {selected.source}
            </strong>

          </div>

        </article>

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
            setFilter('prelims')
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
            setFilter('mains')
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
                  disabled={loading}
                  onClick={() =>
                    openAnalysis(
                      item
                    )
                  }
                >
                  {loading
                    ? 'Loading...'
                    : 'Read analysis'}
                </button>

              </div>

            </article>
          )
        )}

        {filteredItems.length === 0 && (
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

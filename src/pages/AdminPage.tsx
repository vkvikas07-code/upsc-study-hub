import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { TopBar } from '../components/TopBar';
import type { CurrentAffair } from '../types';

import {
  isSupabaseConfigured,
  supabase
} from '../lib/supabase';

type ArticleStatus =
  | 'draft'
  | 'published'
  | 'archived';

type AdminArticle = {
  id: string;
  title: string;
  source: string;
  subject: string;
  summary: string;
  body: string | null;
  tags: string[];
  prelims: boolean;
  mains: boolean;
  status: ArticleStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export function AdminPage({
  onPublish
}: {
  onPublish: (item: CurrentAffair) => void;
}) {
  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [isAdmin, setIsAdmin] =
    useState(false);

  const [checkingAuth, setCheckingAuth] =
    useState(true);

  const [articles, setArticles] =
    useState<AdminArticle[]>([]);

  const [loadingArticles, setLoadingArticles] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [title, setTitle] =
    useState('');

  const [source, setSource] =
    useState('PIB');

  const [subject, setSubject] =
    useState('Polity & Governance');

  const [summary, setSummary] =
    useState('');

  const [body, setBody] =
    useState('');

  const [tagsText, setTagsText] =
    useState('Prelims, Mains');

  const [prelims, setPrelims] =
    useState(true);

  const [mains, setMains] =
    useState(true);

  const [status, setStatus] =
    useState<ArticleStatus>('published');

  const [message, setMessage] =
    useState('');

  const [saving, setSaving] =
    useState(false);

  async function verifyAdmin(
    userId: string
  ) {
    if (!supabase) {
      setIsAdmin(false);
      return false;
    }

    const { data, error } =
      await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

    if (error || !data) {
      console.error(
        'Unable to verify admin:',
        error
      );

      setIsAdmin(false);
      return false;
    }

    const allowed =
      data.role === 'admin' ||
      data.role === 'editor';

    setIsAdmin(allowed);

    return allowed;
  }

  async function loadArticles() {
    if (!supabase) return;

    setLoadingArticles(true);

    const { data, error } =
      await supabase
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
          status,
          published_at,
          created_at,
          updated_at
          `
        )
        .order(
          'created_at',
          { ascending: false }
        );

    if (error) {
      console.error(
        'Unable to load articles:',
        error
      );

      setMessage(
        error.message
      );

      setLoadingArticles(false);
      return;
    }

    setArticles(
      (data || []) as AdminArticle[]
    );

    setLoadingArticles(false);
  }

  useEffect(() => {
    async function checkSession() {
      if (!supabase) {
        setCheckingAuth(false);
        return;
      }

      const {
        data: { session }
      } =
        await supabase.auth.getSession();

      if (!session?.user) {
        setIsAdmin(false);
        setCheckingAuth(false);
        return;
      }

      const allowed =
        await verifyAdmin(
          session.user.id
        );

      if (allowed) {
        await loadArticles();
      }

      setCheckingAuth(false);
    }

    checkSession();
  }, []);

  async function login(
    e: FormEvent
  ) {
    e.preventDefault();

    if (!supabase) {
      setMessage(
        'Supabase is not configured.'
      );
      return;
    }

    if (
      !email.trim() ||
      !password
    ) {
      setMessage(
        'Enter admin email and password.'
      );
      return;
    }

    setMessage(
      'Signing in...'
    );

    const { data, error } =
      await supabase.auth
        .signInWithPassword({
          email: email.trim(),
          password
        });

    if (
      error ||
      !data.user
    ) {
      setMessage(
        error?.message ||
          'Unable to sign in.'
      );
      return;
    }

    const allowed =
      await verifyAdmin(
        data.user.id
      );

    if (!allowed) {
      await supabase.auth.signOut();

      setMessage(
        'This account does not have Admin or Editor permission.'
      );

      return;
    }

    setPassword('');

    setMessage(
      'Admin login successful.'
    );

    await loadArticles();
  }

  async function logout() {
    if (!supabase) return;

    await supabase.auth.signOut();

    setIsAdmin(false);

    setPassword('');

    setArticles([]);

    setMessage(
      'Logged out.'
    );
  }

  function resetForm() {
    setEditingId(null);

    setTitle('');

    setSource('PIB');

    setSubject(
      'Polity & Governance'
    );

    setSummary('');

    setBody('');

    setTagsText(
      'Prelims, Mains'
    );

    setPrelims(true);

    setMains(true);

    setStatus('published');
  }

  function startEdit(
    article: AdminArticle
  ) {
    setEditingId(
      article.id
    );

    setTitle(
      article.title
    );

    setSource(
      article.source
    );

    setSubject(
      article.subject
    );

    setSummary(
      article.summary
    );

    setBody(
      article.body || ''
    );

    setTagsText(
      (article.tags || [])
        .join(', ')
    );

    setPrelims(
      article.prelims
    );

    setMains(
      article.mains
    );

    setStatus(
      article.status
    );

    setMessage(
      `Editing: ${article.title}`
    );

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  function toCurrentAffair(
    article: AdminArticle
  ): CurrentAffair {
    return {
      id: article.id,
      title: article.title,
      source: article.source,
      subject: article.subject,
      summary: article.summary,

      tags:
        article.tags || [],

      prelims:
        article.prelims,

      mains:
        article.mains,

      publishedAt:
        article.published_at
          ? new Date(
              article.published_at
            ).toLocaleDateString(
              'en-IN',
              {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              }
            )
          : 'Today'
    };
  }

  async function saveArticle(
    e: FormEvent
  ) {
    e.preventDefault();

    if (!supabase) {
      setMessage(
        'Supabase is not configured.'
      );
      return;
    }

    if (!isAdmin) {
      setMessage(
        'Admin login required.'
      );
      return;
    }

    if (
      !title.trim() ||
      !summary.trim() ||
      !source.trim() ||
      !subject.trim()
    ) {
      setMessage(
        'Title, source, subject and summary are required.'
      );
      return;
    }

    setSaving(true);

    setMessage(
      editingId
        ? 'Updating article...'
        : 'Saving article...'
    );

    const {
      data: { user }
    } =
      await supabase.auth.getUser();

    if (!user) {
      setSaving(false);

      setIsAdmin(false);

      setMessage(
        'Session expired. Sign in again.'
      );

      return;
    }

    const tags =
      tagsText
        .split(',')
        .map(
          tag => tag.trim()
        )
        .filter(Boolean);

    const oldArticle =
      articles.find(
        item =>
          item.id === editingId
      );

    const publishedAt =
      status === 'published'
        ? oldArticle?.published_at ||
          new Date().toISOString()
        : null;

    const payload = {
      title:
        title.trim(),

      source:
        source.trim(),

      subject:
        subject.trim(),

      summary:
        summary.trim(),

      body:
        body.trim() || null,

      tags,

      prelims,

      mains,

      status,

      published_at:
        publishedAt,

      updated_at:
        new Date().toISOString()
    };

    if (editingId) {
      const { data, error } =
        await supabase
          .from(
            'current_affairs'
          )
          .update(payload)
          .eq(
            'id',
            editingId
          )
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
            status,
            published_at,
            created_at,
            updated_at
            `
          )
          .single();

      if (
        error ||
        !data
      ) {
        console.error(
          'Update failed:',
          error
        );

        setSaving(false);

        setMessage(
          error?.message ||
            'Update failed.'
        );

        return;
      }

      const updated =
        data as AdminArticle;

      setArticles(
        current =>
          current.map(
            article =>
              article.id ===
              updated.id
                ? updated
                : article
          )
      );

      setSaving(false);

      resetForm();

      setMessage(
        'Article updated successfully.'
      );

      return;
    }

    const { data, error } =
      await supabase
        .from(
          'current_affairs'
        )
        .insert({
          ...payload,

          created_by:
            user.id
        })
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
          status,
          published_at,
          created_at,
          updated_at
          `
        )
        .single();

    if (
      error ||
      !data
    ) {
      console.error(
        'Create failed:',
        error
      );

      setSaving(false);

      setMessage(
        error?.message ||
          'Unable to save article.'
      );

      return;
    }

    const created =
      data as AdminArticle;

    setArticles(
      current => [
        created,
        ...current
      ]
    );

    if (
      created.status ===
      'published'
    ) {
      onPublish(
        toCurrentAffair(
          created
        )
      );
    }

    setSaving(false);

    resetForm();

    setMessage(
      created.status ===
        'published'
        ? 'Published successfully.'
        : 'Draft saved successfully.'
    );
  }

  async function changeStatus(
    article: AdminArticle,
    nextStatus: ArticleStatus
  ) {
    if (!supabase) return;

    const publishedAt =
      nextStatus ===
      'published'
        ? article.published_at ||
          new Date().toISOString()
        : null;

    const { data, error } =
      await supabase
        .from(
          'current_affairs'
        )
        .update({
          status:
            nextStatus,

          published_at:
            publishedAt,

          updated_at:
            new Date().toISOString()
        })
        .eq(
          'id',
          article.id
        )
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
          status,
          published_at,
          created_at,
          updated_at
          `
        )
        .single();

    if (
      error ||
      !data
    ) {
      setMessage(
        error?.message ||
          'Unable to change status.'
      );

      return;
    }

    const updated =
      data as AdminArticle;

    setArticles(
      current =>
        current.map(
          item =>
            item.id ===
            updated.id
              ? updated
              : item
        )
    );

    setMessage(
      `Status changed to ${nextStatus}.`
    );
  }

  async function deleteArticle(
    article: AdminArticle
  ) {
    if (!supabase) return;

    const confirmed =
      window.confirm(
        `Delete "${article.title}" permanently?`
      );

    if (!confirmed) {
      return;
    }

    const { error } =
      await supabase
        .from(
          'current_affairs'
        )
        .delete()
        .eq(
          'id',
          article.id
        );

    if (error) {
      setMessage(
        error.message
      );
      return;
    }

    setArticles(
      current =>
        current.filter(
          item =>
            item.id !==
            article.id
        )
    );

    if (
      editingId ===
      article.id
    ) {
      resetForm();
    }

    setMessage(
      'Article deleted.'
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="page-wrap">

        <TopBar
          title="Admin Studio"
          subtitle="Content management"
        />

        <section className="panel admin-form">

          <h2>
            Supabase is not configured
          </h2>

        </section>

      </div>
    );
  }

  if (checkingAuth) {
    return (
      <div className="page-wrap">

        <TopBar
          title="Admin Studio"
          subtitle="Checking secure access"
        />

        <section className="panel admin-form">

          <h2>
            Checking admin session...
          </h2>

        </section>

      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="page-wrap">

        <TopBar
          title="Admin Studio"
          subtitle="Secure administrator access"
        />

        <section className="admin-grid">

          <form
            className="panel admin-form"
            onSubmit={login}
          >

            <span className="eyebrow">
              ADMIN LOGIN
            </span>

            <h2>
              Sign in to manage content
            </h2>

            <label>
              Email

              <input
                type="email"
                value={email}
                onChange={
                  e =>
                    setEmail(
                      e.target.value
                    )
                }
                autoComplete="email"
              />
            </label>

            <label>
              Password

              <input
                type="password"
                value={password}
                onChange={
                  e =>
                    setPassword(
                      e.target.value
                    )
                }
                autoComplete="current-password"
              />
            </label>

            <button
              className="primary-btn"
              type="submit"
            >
              Sign in
            </button>

            {message && (
              <p className="form-message">
                {message}
              </p>
            )}

          </form>

        </section>

      </div>
    );
  }

  return (
    <div className="page-wrap">

      <TopBar
        title="Admin Studio"
        subtitle="Create and manage UPSC content"
      />

      <section className="admin-status">

        <div>
          <span className="status-dot online" />

          <strong>
            Secure Admin connected
          </strong>
        </div>

        <p>
          Create, edit, publish,
          archive or delete Current
          Affairs directly from here.
        </p>

        <div
          style={{
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap'
          }}
        >

          <button
            type="button"
            onClick={
              loadArticles
            }
          >
            Refresh
          </button>

          <button
            type="button"
            onClick={logout}
          >
            Log out
          </button>

        </div>

      </section>

      <section className="admin-grid">

        <form
          className="panel admin-form"
          onSubmit={
            saveArticle
          }
        >

          <span className="eyebrow">
            {editingId
              ? 'EDIT CURRENT AFFAIR'
              : 'NEW CURRENT AFFAIR'}
          </span>

          <h2>
            {editingId
              ? 'Update analysis'
              : 'Create analysis'}
          </h2>

          <label>
            Title

            <input
              value={title}
              onChange={
                e =>
                  setTitle(
                    e.target.value
                  )
              }
              placeholder="What happened and why does it matter?"
            />
          </label>

          <div className="form-two">

            <label>
              Source

              <input
                value={source}
                onChange={
                  e =>
                    setSource(
                      e.target.value
                    )
                }
                placeholder="PIB"
              />
            </label>

            <label>
              Subject

              <input
                value={subject}
                onChange={
                  e =>
                    setSubject(
                      e.target.value
                    )
                }
                placeholder="Environment"
              />
            </label>

          </div>

          <label>
            Short UPSC summary

            <textarea
              value={summary}
              onChange={
                e =>
                  setSummary(
                    e.target.value
                  )
              }
              rows={5}
              placeholder="Short revision-ready summary."
            />
          </label>

          <label>
            Detailed analysis

            <textarea
              value={body}
              onChange={
                e =>
                  setBody(
                    e.target.value
                  )
              }
              rows={8}
              placeholder="Detailed background, key facts, issues and UPSC relevance."
            />
          </label>

          <label>
            Tags

            <input
              value={tagsText}
              onChange={
                e =>
                  setTagsText(
                    e.target.value
                  )
              }
              placeholder="Environment, GS-III, Energy"
            />
          </label>

          <div className="checkbox-row">

            <label>
              <input
                type="checkbox"
                checked={prelims}
                onChange={
                  e =>
                    setPrelims(
                      e.target.checked
                    )
                }
              />
              Prelims
            </label>

            <label>
              <input
                type="checkbox"
                checked={mains}
                onChange={
                  e =>
                    setMains(
                      e.target.checked
                    )
                }
              />
              Mains
            </label>

          </div>

          <label>
            Status

            <select
              value={status}
              onChange={
                e =>
                  setStatus(
                    e.target
                      .value as ArticleStatus
                  )
              }
            >
              <option value="draft">
                Draft
              </option>

              <option value="published">
                Published
              </option>

              <option value="archived">
                Archived
              </option>
            </select>
          </label>

          <div
            style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap'
            }}
          >

            <button
              className="primary-btn"
              type="submit"
              disabled={saving}
            >
              {saving
                ? 'Saving...'
                : editingId
                ? 'Save changes'
                : status === 'published'
                ? 'Publish to students'
                : 'Save article'}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={
                  resetForm
                }
              >
                Cancel edit
              </button>
            )}

          </div>

          {message && (
            <p className="form-message">
              {message}
            </p>
          )}

        </form>

        <aside className="panel admin-side">

          <span className="eyebrow">
            EDITOR CHECKLIST
          </span>

          <h3>
            Before publishing
          </h3>

          <ol>
            <li>
              Use a reliable primary source.
            </li>

            <li>
              Keep the title clear.
            </li>

            <li>
              Connect the issue to the UPSC syllabus.
            </li>

            <li>
              Separate facts from interpretation.
            </li>

            <li>
              Use Draft when content still needs review.
            </li>
          </ol>

          <div className="callout">
            <strong>
              Draft workflow
            </strong>

            <p>
              Draft and archived items are
              hidden from ordinary students.
              Only published articles appear
              on the public Current Affairs page.
            </p>
          </div>

        </aside>

      </section>

      <section
        className="panel"
        style={{
          marginTop: '24px'
        }}
      >

        <div
          style={{
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >

          <div>
            <span className="eyebrow">
              CONTENT MANAGER
            </span>

            <h2>
              Existing Current Affairs
            </h2>
          </div>

          <button
            type="button"
            onClick={
              loadArticles
            }
          >
            Refresh list
          </button>

        </div>

        {loadingArticles && (
          <p>
            Loading articles...
          </p>
        )}

        {!loadingArticles &&
          articles.length === 0 && (
            <p>
              No Current Affairs found.
            </p>
          )}

        <div
          style={{
            display: 'grid',
            gap: '14px',
            marginTop: '20px'
          }}
        >

          {articles.map(
            article => (
              <div
                key={article.id}
                style={{
                  padding: '18px',
                  border:
                    '1px solid rgba(255,255,255,0.10)',
                  borderRadius: '14px'
                }}
              >

                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    gap: '16px',
                    flexWrap: 'wrap'
                  }}
                >

                  <div>

                    <span className="eyebrow">
                      {article.subject}
                    </span>

                    <h3>
                      {article.title}
                    </h3>

                    <p>
                      Source: {article.source}
                    </p>

                    <p>
                      Status:{' '}
                      <strong>
                        {article.status}
                      </strong>
                    </p>

                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      flexWrap: 'wrap',
                      alignItems: 'flex-start'
                    }}
                  >

                    <button
                      type="button"
                      onClick={() =>
                        startEdit(
                          article
                        )
                      }
                    >
                      Edit
                    </button>

                    {article.status !==
                      'published' && (
                      <button
                        type="button"
                        onClick={() =>
                          changeStatus(
                            article,
                            'published'
                          )
                        }
                      >
                        Publish
                      </button>
                    )}

                    {article.status !==
                      'draft' && (
                      <button
                        type="button"
                        onClick={() =>
                          changeStatus(
                            article,
                            'draft'
                          )
                        }
                      >
                        Move to draft
                      </button>
                    )}

                    {article.status !==
                      'archived' && (
                      <button
                        type="button"
                        onClick={() =>
                          changeStatus(
                            article,
                            'archived'
                          )
                        }
                      >
                        Archive
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        deleteArticle(
                          article
                        )
                      }
                    >
                      Delete
                    </button>

                  </div>

                </div>

              </div>
            )
          )}

        </div>

      </section>

    </div>
  );
}

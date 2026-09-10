import {
  useEffect,
  useState
} from 'react';

import type {
  FormEvent
} from 'react';

import {
  TopBar
} from '../components/TopBar';

import {
  QuestionManager
} from '../components/QuestionManager';

import {
  PrelimsTestManager
} from '../components/PrelimsTestManager';

import {
  MainsQuestionManager
} from '../components/MainsQuestionManager';

import {
  MainsEvaluationManager
} from '../components/MainsEvaluationManager';

import {
  AdminWorkspaceStats
} from '../components/AdminWorkspaceStats';

import {
  PendingEvaluationBadge
} from '../components/PendingEvaluationBadge';

import type {
  CurrentAffair
} from '../types';

import {
  isSupabaseConfigured,
  supabase
} from '../lib/supabase';


type ArticleStatus =
  | 'draft'
  | 'published'
  | 'archived';


type AdminTab =
  | 'current'
  | 'mcq'
  | 'tests'
  | 'mains'
  | 'evaluation';


type AdminArticle = {
  id: string;
  title: string;
  source: string;
  source_url: string | null;
  subject: string;
  summary: string;
  body: string | null;
  background: string | null;
  key_facts: string | null;
  prelims_points: string | null;
  mains_relevance: string | null;
  issues: string | null;
  way_forward: string | null;
  tags: string[];
  prelims: boolean;
  mains: boolean;
  status: ArticleStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};


const ARTICLE_SELECT = `
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
  status,
  published_at,
  created_at,
  updated_at
`;


export function AdminPage({
  onPublish
}: {
  onPublish: (item: CurrentAffair) => void;
}) {
  const [adminTab, setAdminTab] =
    useState<AdminTab>('current');

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

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [title, setTitle] =
    useState('');

  const [source, setSource] =
    useState('PIB');

  const [sourceUrl, setSourceUrl] =
    useState('');

  const [subject, setSubject] =
    useState('Polity & Governance');

  const [summary, setSummary] =
    useState('');

  const [background, setBackground] =
    useState('');

  const [keyFacts, setKeyFacts] =
    useState('');

  const [prelimsPoints, setPrelimsPoints] =
    useState('');

  const [mainsRelevance, setMainsRelevance] =
    useState('');

  const [issues, setIssues] =
    useState('');

  const [wayForward, setWayForward] =
    useState('');

  const [tagsText, setTagsText] =
    useState('Prelims, Mains');

  const [prelims, setPrelims] =
    useState(true);

  const [mains, setMains] =
    useState(true);

  const [status, setStatus] =
    useState<ArticleStatus>('draft');


  function switchAdminTab(
    tab: AdminTab
  ) {
    setAdminTab(tab);

    window.requestAnimationFrame(
      () => {
        const mainArea =
          document.querySelector('.main-area');

        mainArea?.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }
    );
  }


  async function verifyAdmin(
    userId: string
  ) {
    if (!supabase) {
      setIsAdmin(false);
      return false;
    }

    const {
      data,
      error
    } =
      await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

    if (
      error ||
      !data
    ) {
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
    if (!supabase) {
      return;
    }

    setLoadingArticles(true);

    const {
      data,
      error
    } =
      await supabase
        .from('current_affairs')
        .select(ARTICLE_SELECT)
        .order(
          'created_at',
          {
            ascending: false
          }
        );

    if (error) {
      console.error(
        'Unable to load articles:',
        error
      );

      setMessage(error.message);
      setLoadingArticles(false);
      return;
    }

    setArticles(
      (data || []) as AdminArticle[]
    );

    setLoadingArticles(false);
  }


  useEffect(
    () => {
      async function checkSession() {
        if (!supabase) {
          setCheckingAuth(false);
          return;
        }

        const {
          data: {
            session
          }
        } =
          await supabase
            .auth
            .getSession();

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

      void checkSession();
    },
    []
  );


  async function login(
    event: FormEvent
  ) {
    event.preventDefault();

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

    setMessage('Signing in...');

    const {
      data,
      error
    } =
      await supabase
        .auth
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
      await supabase
        .auth
        .signOut();

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
    if (!supabase) {
      return;
    }

    await supabase
      .auth
      .signOut();

    setIsAdmin(false);
    setArticles([]);
    setPassword('');
    setMessage('Logged out.');
  }


  function resetForm() {
    setEditingId(null);
    setTitle('');
    setSource('PIB');
    setSourceUrl('');
    setSubject('Polity & Governance');
    setSummary('');
    setBackground('');
    setKeyFacts('');
    setPrelimsPoints('');
    setMainsRelevance('');
    setIssues('');
    setWayForward('');
    setTagsText('Prelims, Mains');
    setPrelims(true);
    setMains(true);
    setStatus('draft');
  }


  function startEdit(
    article: AdminArticle
  ) {
    setEditingId(article.id);
    setTitle(article.title);
    setSource(article.source);
    setSourceUrl(article.source_url || '');
    setSubject(article.subject);
    setSummary(article.summary);
    setBackground(article.background || '');
    setKeyFacts(article.key_facts || '');
    setPrelimsPoints(article.prelims_points || '');
    setMainsRelevance(article.mains_relevance || '');
    setIssues(article.issues || '');
    setWayForward(article.way_forward || '');
    setTagsText(
      (article.tags || [])
        .join(', ')
    );
    setPrelims(article.prelims);
    setMains(article.mains);
    setStatus(article.status);
    setMessage(
      `Editing: ${article.title}`
    );

    switchAdminTab('current');
  }


  function createBody() {
    const sections = [
      background.trim()
        ? `BACKGROUND\n${background.trim()}`
        : '',
      keyFacts.trim()
        ? `KEY FACTS\n${keyFacts.trim()}`
        : '',
      prelimsPoints.trim()
        ? `PRELIMS POINTS\n${prelimsPoints.trim()}`
        : '',
      mainsRelevance.trim()
        ? `MAINS RELEVANCE\n${mainsRelevance.trim()}`
        : '',
      issues.trim()
        ? `ISSUES / CHALLENGES\n${issues.trim()}`
        : '',
      wayForward.trim()
        ? `WAY FORWARD\n${wayForward.trim()}`
        : ''
    ];

    return sections
      .filter(Boolean)
      .join('\n\n');
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
      tags: article.tags || [],
      prelims: article.prelims,
      mains: article.mains,
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
    event: FormEvent
  ) {
    event.preventDefault();

    if (
      !supabase ||
      !isAdmin
    ) {
      setMessage(
        'Admin login required.'
      );
      return;
    }

    if (
      !title.trim() ||
      !source.trim() ||
      !subject.trim() ||
      !summary.trim()
    ) {
      setMessage(
        'Title, source, subject and quick summary are required.'
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
      data: {
        user
      }
    } =
      await supabase
        .auth
        .getUser();

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
          tag =>
            tag.trim()
        )
        .filter(Boolean);

    const oldArticle =
      articles.find(
        article =>
          article.id === editingId
      );

    const publishedAt =
      status === 'published'
        ? oldArticle?.published_at ||
          new Date().toISOString()
        : null;

    const payload = {
      title: title.trim(),
      source: source.trim(),
      source_url:
        sourceUrl.trim() || null,
      subject: subject.trim(),
      summary: summary.trim(),
      body:
        createBody() || null,
      background:
        background.trim() || null,
      key_facts:
        keyFacts.trim() || null,
      prelims_points:
        prelimsPoints.trim() || null,
      mains_relevance:
        mainsRelevance.trim() || null,
      issues:
        issues.trim() || null,
      way_forward:
        wayForward.trim() || null,
      tags,
      prelims,
      mains,
      status,
      published_at: publishedAt,
      updated_at:
        new Date().toISOString()
    };

    if (editingId) {
      const {
        data,
        error
      } =
        await supabase
          .from('current_affairs')
          .update(payload)
          .eq('id', editingId)
          .select(ARTICLE_SELECT)
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
          'Unable to update article.'
        );
        return;
      }

      const updated =
        data as AdminArticle;

      setArticles(
        current =>
          current.map(
            article =>
              article.id === updated.id
                ? updated
                : article
          )
      );

      if (
        updated.status === 'published'
      ) {
        onPublish(
          toCurrentAffair(updated)
        );
      }

      resetForm();
      setSaving(false);
      setMessage(
        'Article updated successfully.'
      );
      return;
    }

    const {
      data,
      error
    } =
      await supabase
        .from('current_affairs')
        .insert({
          ...payload,
          created_by: user.id
        })
        .select(ARTICLE_SELECT)
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
      created.status === 'published'
    ) {
      onPublish(
        toCurrentAffair(created)
      );
    }

    resetForm();
    setSaving(false);
    setMessage(
      created.status === 'published'
        ? 'Published successfully.'
        : 'Draft saved successfully.'
    );
  }


  async function changeStatus(
    article: AdminArticle,
    nextStatus: ArticleStatus
  ) {
    if (!supabase) {
      return;
    }

    const publishedAt =
      nextStatus === 'published'
        ? article.published_at ||
          new Date().toISOString()
        : null;

    const {
      data,
      error
    } =
      await supabase
        .from('current_affairs')
        .update({
          status: nextStatus,
          published_at: publishedAt,
          updated_at:
            new Date().toISOString()
        })
        .eq('id', article.id)
        .select(ARTICLE_SELECT)
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
            item.id === updated.id
              ? updated
              : item
        )
    );

    if (
      nextStatus === 'published'
    ) {
      onPublish(
        toCurrentAffair(updated)
      );
    }

    setMessage(
      `Status changed to ${nextStatus}.`
    );
  }


  async function deleteArticle(
    article: AdminArticle
  ) {
    if (!supabase) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete "${article.title}" permanently?`
      );

    if (!confirmed) {
      return;
    }

    const {
      error
    } =
      await supabase
        .from('current_affairs')
        .delete()
        .eq('id', article.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setArticles(
      current =>
        current.filter(
          item =>
            item.id !== article.id
        )
    );

    if (
      editingId === article.id
    ) {
      resetForm();
    }

    setMessage('Article deleted.');
  }


  if (!isSupabaseConfigured) {
    return (
      <div className="page-wrap">
        <TopBar
          title="Admin Studio"
          subtitle="Content management"
        />

        <section className="panel">
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

        <section className="panel">
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
                  event =>
                    setEmail(
                      event.target.value
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
                  event =>
                    setPassword(
                      event.target.value
                    )
                }
                autoComplete="current-password"
              />
            </label>

            <button
              type="submit"
              className="primary-btn"
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
        subtitle="Professional UPSC content publishing"
      />

      <section className="admin-status">
        <div>
          <span
            className="status-dot online"
          />

          <strong>
            Secure Admin connected
          </strong>
        </div>

        <p>
          Manage Current Affairs, Prelims MCQs,
          Prelims Test Series, Mains questions
          and student evaluations from separate workspaces.
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
            onClick={loadArticles}
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

      <AdminWorkspaceStats
        onNavigate={switchAdminTab}
      />

      {/* ADMIN WORKSPACE TABS */}
      <section
        className="panel"
        style={{
          marginTop: '16px',
          marginBottom: '22px',
          padding: '14px',
          position: 'sticky',
          top: '10px',
          zIndex: 20,
          background: '#101a30',
          boxShadow:
            '0 10px 30px rgba(0,0,0,0.18)'
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap'
          }}
        >
          <button
            type="button"
            className={
              adminTab === 'current'
                ? 'filter active'
                : 'filter'
            }
            onClick={() =>
              switchAdminTab('current')
            }
          >
            Current Affairs
          </button>

          <button
            type="button"
            className={
              adminTab === 'mcq'
                ? 'filter active'
                : 'filter'
            }
            onClick={() =>
              switchAdminTab('mcq')
            }
          >
            Prelims MCQ
          </button>

          <button
            type="button"
            className={
              adminTab === 'tests'
                ? 'filter active'
                : 'filter'
            }
            onClick={() =>
              switchAdminTab('tests')
            }
          >
            Prelims Test Series
          </button>

          <button
            type="button"
            className={
              adminTab === 'mains'
                ? 'filter active'
                : 'filter'
            }
            onClick={() =>
              switchAdminTab('mains')
            }
          >
            Mains Questions
          </button>

          <button
            type="button"
            className={
              adminTab === 'evaluation'
                ? 'filter active'
                : 'filter'
            }
            onClick={() =>
              switchAdminTab('evaluation')
            }
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            Mains Evaluation
            <PendingEvaluationBadge />
          </button>
        </div>
      </section>

      {/* CURRENT AFFAIRS TAB */}
      <div
        style={{
          display:
            adminTab === 'current'
              ? 'block'
              : 'none'
        }}
      >
        <section className="admin-grid">
          <form
            className="panel admin-form"
            onSubmit={saveArticle}
          >
            <span className="eyebrow">
              {
                editingId
                  ? 'EDIT CURRENT AFFAIR'
                  : 'NEW CURRENT AFFAIR'
              }
            </span>

            <h2>
              {
                editingId
                  ? 'Update UPSC analysis'
                  : 'Create UPSC analysis'
              }
            </h2>

            <label>
              Title

              <input
                value={title}
                onChange={
                  event =>
                    setTitle(
                      event.target.value
                    )
                }
                placeholder="Clear current-affairs headline"
              />
            </label>

            <div className="form-two">
              <label>
                Source

                <input
                  value={source}
                  onChange={
                    event =>
                      setSource(
                        event.target.value
                      )
                  }
                  placeholder="PIB / Ministry / RBI"
                />
              </label>

              <label>
                Subject

                <input
                  value={subject}
                  onChange={
                    event =>
                      setSubject(
                        event.target.value
                      )
                  }
                  placeholder="Polity & Governance"
                />
              </label>
            </div>

            <label>
              Official Source URL

              <input
                type="url"
                value={sourceUrl}
                onChange={
                  event =>
                    setSourceUrl(
                      event.target.value
                    )
                }
                placeholder="https://..."
              />
            </label>

            <label>
              Quick Revision Summary

              <textarea
                rows={4}
                value={summary}
                onChange={
                  event =>
                    setSummary(
                      event.target.value
                    )
                }
                placeholder="2–4 lines explaining why this matters for UPSC."
              />
            </label>

            <label>
              Background

              <textarea
                rows={5}
                value={background}
                onChange={
                  event =>
                    setBackground(
                      event.target.value
                    )
                }
                placeholder="Context and background of the issue."
              />
            </label>

            <label>
              Key Facts

              <textarea
                rows={5}
                value={keyFacts}
                onChange={
                  event =>
                    setKeyFacts(
                      event.target.value
                    )
                }
                placeholder="Important facts, institutions, numbers and provisions."
              />
            </label>

            <label>
              Prelims Points

              <textarea
                rows={5}
                value={prelimsPoints}
                onChange={
                  event =>
                    setPrelimsPoints(
                      event.target.value
                    )
                }
                placeholder="Facts, organisations, schemes and likely MCQ points."
              />
            </label>

            <label>
              Mains Relevance

              <textarea
                rows={5}
                value={mainsRelevance}
                onChange={
                  event =>
                    setMainsRelevance(
                      event.target.value
                    )
                }
                placeholder="GS paper, syllabus linkage and analytical dimensions."
              />
            </label>

            <label>
              Issues / Challenges

              <textarea
                rows={5}
                value={issues}
                onChange={
                  event =>
                    setIssues(
                      event.target.value
                    )
                }
                placeholder="Major concerns, gaps or limitations."
              />
            </label>

            <label>
              Way Forward

              <textarea
                rows={5}
                value={wayForward}
                onChange={
                  event =>
                    setWayForward(
                      event.target.value
                    )
                }
                placeholder="Balanced solutions, reforms and conclusion points."
              />
            </label>

            <label>
              Tags

              <input
                value={tagsText}
                onChange={
                  event =>
                    setTagsText(
                      event.target.value
                    )
                }
                placeholder="Environment, GS-III, Energy"
              />

              <small>
                Separate tags using commas.
              </small>
            </label>

            <div className="checkbox-row">
              <label>
                <input
                  type="checkbox"
                  checked={prelims}
                  onChange={
                    event =>
                      setPrelims(
                        event.target.checked
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
                    event =>
                      setMains(
                        event.target.checked
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
                  event =>
                    setStatus(
                      event.target.value as ArticleStatus
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
                type="submit"
                className="primary-btn"
                disabled={saving}
              >
                {
                  saving
                    ? 'Saving...'
                    : editingId
                    ? 'Save changes'
                    : status === 'published'
                    ? 'Publish to students'
                    : 'Save draft'
                }
              </button>

              {editingId && (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={resetForm}
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
              UPSC EDITOR CHECKLIST
            </span>

            <h3>
              Before publishing
            </h3>

            <ol>
              <li>
                Verify the primary source.
              </li>
              <li>
                Keep the quick summary short.
              </li>
              <li>
                Add only exam-relevant facts.
              </li>
              <li>
                Separate Prelims facts from Mains analysis.
              </li>
              <li>
                Mention challenges without exaggeration.
              </li>
              <li>
                Finish with a balanced way forward.
              </li>
              <li>
                Save as Draft until reviewed.
              </li>
            </ol>

            <div className="callout">
              <strong>
                Recommended workflow
              </strong>

              <p>
                Create → Draft → Review → Publish.
                Students see only Published articles.
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
              justifyContent: 'space-between',
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
              className="secondary-btn"
              onClick={loadArticles}
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
                <article
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
                      justifyContent: 'space-between',
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
                        Source:{' '}
                        {article.source}
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
                        className="secondary-btn"
                        onClick={() =>
                          startEdit(article)
                        }
                      >
                        Edit
                      </button>

                      {article.status !== 'published' && (
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() =>
                            void changeStatus(
                              article,
                              'published'
                            )
                          }
                        >
                          Publish
                        </button>
                      )}

                      {article.status !== 'draft' && (
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() =>
                            void changeStatus(
                              article,
                              'draft'
                            )
                          }
                        >
                          Move to draft
                        </button>
                      )}

                      {article.status !== 'archived' && (
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() =>
                            void changeStatus(
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
                        className="secondary-btn"
                        onClick={() =>
                          void deleteArticle(article)
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              )
            )}
          </div>
        </section>
      </div>

      {/* PRELIMS MCQ TAB */}
      <div
        style={{
          display:
            adminTab === 'mcq'
              ? 'block'
              : 'none'
        }}
      >
        <QuestionManager />
      </div>

      {/* PRELIMS TEST SERIES TAB */}
      <div
        style={{
          display:
            adminTab === 'tests'
              ? 'block'
              : 'none'
        }}
      >
        <PrelimsTestManager />
      </div>

      {/* MAINS QUESTIONS TAB */}
      <div
        style={{
          display:
            adminTab === 'mains'
              ? 'block'
              : 'none'
        }}
      >
        <MainsQuestionManager />
      </div>

      {/* MAINS EVALUATION TAB */}
      <div
        style={{
          display:
            adminTab === 'evaluation'
              ? 'block'
              : 'none'
        }}
      >
        <MainsEvaluationManager />
      </div>
    </div>
  );
}

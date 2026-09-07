import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { TopBar } from '../components/TopBar';
import type { CurrentAffair } from '../types';
import {
  isSupabaseConfigured,
  supabase
} from '../lib/supabase';

export function AdminPage({
  onPublish
}: {
  onPublish: (item: CurrentAffair) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [title, setTitle] = useState('');
  const [source, setSource] = useState('PIB');
  const [subject, setSubject] = useState('Polity & Governance');
  const [summary, setSummary] = useState('');

  const [prelims, setPrelims] = useState(true);
  const [mains, setMains] = useState(true);

  const [message, setMessage] = useState('');
  const [publishing, setPublishing] = useState(false);

  async function verifyAdmin(userId: string) {
    if (!supabase) {
      setIsAdmin(false);
      return false;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.error('Unable to verify admin role:', error);
      setIsAdmin(false);
      return false;
    }

    const allowed =
      data.role === 'admin' ||
      data.role === 'editor';

    setIsAdmin(allowed);

    return allowed;
  }

  useEffect(() => {
    async function checkSession() {
      if (!supabase) {
        setCheckingAuth(false);
        return;
      }

      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setIsAdmin(false);
        setCheckingAuth(false);
        return;
      }

      await verifyAdmin(session.user.id);
      setCheckingAuth(false);
    }

    checkSession();
  }, []);

  async function login(e: FormEvent) {
    e.preventDefault();

    if (!supabase) {
      setMessage('Supabase is not configured.');
      return;
    }

    if (!email.trim() || !password) {
      setMessage('Enter your admin email and password.');
      return;
    }

    setMessage('Signing in...');

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

    if (error || !data.user) {
      setMessage(
        error?.message ||
          'Unable to sign in.'
      );
      return;
    }

    const allowed =
      await verifyAdmin(data.user.id);

    if (!allowed) {
      await supabase.auth.signOut();

      setMessage(
        'This account does not have Admin or Editor permission.'
      );

      return;
    }

    setPassword('');
    setMessage('Admin login successful.');
  }

  async function logout() {
    if (!supabase) return;

    await supabase.auth.signOut();

    setIsAdmin(false);
    setPassword('');
    setMessage('Logged out.');
  }

  async function publish(e: FormEvent) {
    e.preventDefault();

    if (!supabase) {
      setMessage('Supabase is not configured.');
      return;
    }

    if (!isAdmin) {
      setMessage('Admin login is required.');
      return;
    }

    if (!title.trim() || !summary.trim()) {
      setMessage(
        'Add a title and UPSC-ready summary first.'
      );
      return;
    }

    setPublishing(true);
    setMessage('Publishing...');

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      setPublishing(false);
      setIsAdmin(false);
      setMessage(
        'Your login session expired. Please sign in again.'
      );
      return;
    }

    const tags: string[] = [];

    if (prelims) {
      tags.push('Prelims');
    }

    if (mains) {
      tags.push('Mains');
    }

    const publishedAt =
      new Date().toISOString();

    const { data, error } = await supabase
      .from('current_affairs')
      .insert({
        title: title.trim(),
        source: source.trim(),
        subject: subject.trim(),
        summary: summary.trim(),
        tags,
        prelims,
        mains,
        status: 'published',
        published_at: publishedAt,
        created_by: user.id
      })
      .select(
        'id,title,source,subject,summary,tags,prelims,mains,published_at'
      )
      .single();

    if (error || !data) {
      console.error(
        'Publishing failed:',
        error
      );

      setPublishing(false);

      setMessage(
        error?.message ||
          'Publishing failed.'
      );

      return;
    }

    const newArticle: CurrentAffair = {
      id: data.id,
      title: data.title,
      source: data.source,
      subject: data.subject,
      summary: data.summary,
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
          : 'Today'
    };

    onPublish(newArticle);

    setTitle('');
    setSummary('');

    setPublishing(false);

    setMessage(
      'Published successfully. Students can now see this Current Affair.'
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
          <span className="eyebrow">
            BACKEND
          </span>

          <h2>
            Supabase is not configured
          </h2>

          <p>
            Add the Supabase environment
            variables before using Admin
            Studio.
          </p>
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

            <p>
              Only authorized UPSC Study Hub
              administrators and editors can
              publish content.
            </p>

            <label>
              Email

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="Admin email"
                autoComplete="email"
              />
            </label>

            <label>
              Password

              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                placeholder="Password"
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

          <aside className="panel admin-side">
            <span className="eyebrow">
              SECURITY
            </span>

            <h3>
              Protected publishing
            </h3>

            <ol>
              <li>
                Students can read published
                content.
              </li>

              <li>
                Admin login is required for
                publishing.
              </li>

              <li>
                Supabase verifies the account.
              </li>

              <li>
                Database policies verify the
                Admin or Editor role.
              </li>
            </ol>
          </aside>
        </section>
      </div>
    );
  }

  return (
    <div className="page-wrap">
      <TopBar
        title="Admin Studio"
        subtitle="Publish directly to every student"
      />

      <section className="admin-status">
        <div>
          <span className="status-dot online" />

          <strong>
            Secure Admin connected
          </strong>
        </div>

        <p>
          Content published here is stored
          directly in Supabase.
        </p>

        <button
          type="button"
          onClick={logout}
        >
          Log out
        </button>
      </section>

      <section className="admin-grid">
        <form
          className="panel admin-form"
          onSubmit={publish}
        >
          <span className="eyebrow">
            NEW CURRENT AFFAIR
          </span>

          <h2>
            Publish an analysis
          </h2>

          <label>
            Title

            <input
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              placeholder="What happened and why does it matter?"
            />
          </label>

          <div className="form-two">
            <label>
              Source

              <input
                value={source}
                onChange={(e) =>
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
                onChange={(e) =>
                  setSubject(
                    e.target.value
                  )
                }
                placeholder="Environment"
              />
            </label>
          </div>

          <label>
            UPSC-ready summary

            <textarea
              value={summary}
              onChange={(e) =>
                setSummary(
                  e.target.value
                )
              }
              rows={7}
              placeholder="Explain the issue in simple language and connect it with the UPSC syllabus."
            />
          </label>

          <div className="checkbox-row">
            <label>
              <input
                type="checkbox"
                checked={prelims}
                onChange={(e) =>
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
                onChange={(e) =>
                  setMains(
                    e.target.checked
                  )
                }
              />

              Mains
            </label>
          </div>

          <button
            className="primary-btn"
            type="submit"
            disabled={publishing}
          >
            {publishing
              ? 'Publishing...'
              : 'Publish to students'}
          </button>

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
              Use PIB, ministry websites,
              reports, judgments or another
              reliable source.
            </li>

            <li>
              Explain why the issue matters
              for UPSC.
            </li>

            <li>
              Link it with the correct
              syllabus subject.
            </li>

            <li>
              Separate verified facts from
              analysis.
            </li>

            <li>
              Keep the explanation concise
              and revision-friendly.
            </li>
          </ol>

          <div className="callout">
            <strong>
              Live publishing
            </strong>

            <p>
              Once you press Publish, the
              article is stored in Supabase
              and students can receive it
              without downloading a new APK.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}

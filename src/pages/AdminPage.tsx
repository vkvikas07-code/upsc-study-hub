import { useState } from 'react';
import { TopBar } from '../components/TopBar';
import type { CurrentAffair } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';

export function AdminPage({ onPublish }: { onPublish: (item: CurrentAffair) => void }) {
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('PIB / Official Source');
  const [subject, setSubject] = useState('Polity & Governance');
  const [summary, setSummary] = useState('');
  const [message, setMessage] = useState('');

  const publish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !summary.trim()) { setMessage('Add a title and short analysis first.'); return; }
    onPublish({
      id: `local-${Date.now()}`,
      title: title.trim(), source: source.trim(), subject: subject.trim(), summary: summary.trim(),
      tags: ['Prelims', 'Mains'], publishedAt: 'Just now', prelims: true, mains: true
    });
    setTitle(''); setSummary(''); setMessage('Published to this prototype. Connect Supabase to make publishing live for every student.');
  };

  return (
    <div className="page-wrap">
      <TopBar title="Admin Studio" subtitle="Update content without rebuilding the APK" />
      <section className="admin-status"><div><span className={isSupabaseConfigured ? 'status-dot online' : 'status-dot'} /><strong>{isSupabaseConfigured ? 'Supabase connected' : 'Prototype data mode'}</strong></div><p>{isSupabaseConfigured ? 'Backend environment variables are available.' : 'Safe for design/testing. Add Supabase keys later for cloud publishing.'}</p></section>
      <section className="admin-grid">
        <form className="panel admin-form" onSubmit={publish}>
          <span className="eyebrow">NEW CURRENT AFFAIR</span><h2>Publish an analysis</h2>
          <label>Title<input value={title} onChange={e => setTitle(e.target.value)} placeholder="What happened and why does it matter?" /></label>
          <div className="form-two"><label>Source<input value={source} onChange={e => setSource(e.target.value)} /></label><label>Subject<input value={subject} onChange={e => setSubject(e.target.value)} /></label></div>
          <label>UPSC-ready summary<textarea value={summary} onChange={e => setSummary(e.target.value)} rows={7} placeholder="Explain the issue in simple language, then connect it with the syllabus." /></label>
          <div className="checkbox-row"><label><input type="checkbox" defaultChecked /> Prelims</label><label><input type="checkbox" defaultChecked /> Mains</label></div>
          <button className="primary-btn" type="submit">Publish</button>{message && <p className="form-message">{message}</p>}
        </form>
        <aside className="panel admin-side"><span className="eyebrow">EDITOR CHECKLIST</span><h3>Before publishing</h3><ol><li>Use a primary or reliable source.</li><li>Explain why it matters for UPSC.</li><li>Link it to syllabus topics.</li><li>Separate facts from analysis.</li><li>Add MCQs or a mains angle only when useful.</li></ol><div className="callout"><strong>Key design rule</strong><p>Daily content lives in the database. Students receive it instantly; the APK only needs rebuilding when the software itself changes.</p></div></aside>
      </section>
    </div>
  );
}

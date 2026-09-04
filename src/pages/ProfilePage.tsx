import { TopBar } from '../components/TopBar';

export function ProfilePage({ onAdmin }: { onAdmin: () => void }) {
  return (
    <div className="page-wrap">
      <TopBar title="My Study" subtitle="Simple progress, no pressure dashboard" />
      <section className="profile-card"><div className="avatar">AS</div><div><h2>Aspirant</h2><p>UPSC CSE • Foundation track</p></div></section>
      <section className="metrics-grid"><article className="metric-card"><div><span>Syllabus</span><strong>38%</strong><small>Tracked by topic</small></div></article><article className="metric-card"><div><span>Questions</span><strong>240</strong><small>Attempted</small></div></article><article className="metric-card"><div><span>Bookmarks</span><strong>18</strong><small>Saved for revision</small></div></article></section>
      <section className="panel"><h3>Study tools</h3><div className="settings-list"><button>Bookmarks <span>›</span></button><button>My notes <span>›</span></button><button>Test history <span>›</span></button><button>Download for offline <span>›</span></button><button onClick={onAdmin}>Admin Studio preview <span>›</span></button></div></section>
    </div>
  );
}

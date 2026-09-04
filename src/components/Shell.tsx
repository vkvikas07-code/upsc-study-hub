import { IonIcon } from '@ionic/react';
import {
  homeOutline, bookOutline, createOutline, newspaperOutline,
  personCircleOutline, settingsOutline
} from 'ionicons/icons';
import type { NavKey } from '../types';

const items: Array<{ key: NavKey; label: string; icon: string }> = [
  { key: 'home', label: 'Home', icon: homeOutline },
  { key: 'learn', label: 'Learn', icon: bookOutline },
  { key: 'practice', label: 'Practice', icon: createOutline },
  { key: 'current', label: 'Current', icon: newspaperOutline },
  { key: 'profile', label: 'Me', icon: personCircleOutline }
];

export function Shell({ active, onNavigate, children }: { active: NavKey; onNavigate: (key: NavKey) => void; children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="desktop-sidebar">
        <div className="brand-block">
          <div className="brand-mark">U</div>
          <div><strong>UPSC Study Hub</strong><span>Learn. Practice. Progress.</span></div>
        </div>
        <nav>
          {items.map((item) => (
            <button key={item.key} className={active === item.key ? 'nav-active' : ''} onClick={() => onNavigate(item.key)}>
              <IonIcon icon={item.icon} /><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <button className="admin-link" onClick={() => onNavigate('admin')}>
          <IonIcon icon={settingsOutline} /> Admin Studio
        </button>
      </aside>

      <main className="main-area">{children}</main>

      <nav className="mobile-bottom-nav">
        {items.map((item) => (
          <button key={item.key} className={active === item.key ? 'nav-active' : ''} onClick={() => onNavigate(item.key)}>
            <IonIcon icon={item.icon} /><span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

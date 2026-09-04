import { IonIcon } from '@ionic/react';
import { notificationsOutline, menuOutline } from 'ionicons/icons';

export function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="topbar">
      <button className="icon-button mobile-only" aria-label="Menu"><IonIcon icon={menuOutline} /></button>
      <div className="topbar-title"><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
      <button className="icon-button" aria-label="Notifications"><IonIcon icon={notificationsOutline} /><span className="notification-dot" /></button>
    </header>
  );
}

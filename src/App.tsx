import { useEffect, useState } from 'react';
import { IonApp } from '@ionic/react';
import { Shell } from './components/Shell';
import { HomePage } from './pages/HomePage';
import { LearnPage } from './pages/LearnPage';
import { PracticePage } from './pages/PracticePage';
import { CurrentPage } from './pages/CurrentPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminPage } from './pages/AdminPage';
import { initialCurrentAffairs } from './data/mock';
import type { CurrentAffair, DailyTask, NavKey } from './types';

const defaultTasks: DailyTask[] = [
  { id: 'ca', label: 'Read today’s current affairs brief', done: false },
  { id: 'mcq', label: 'Attempt at least 10 MCQs', done: false },
  { id: 'rev', label: 'Revise one saved topic', done: false }
];

export default function App() {
  const [active, setActive] = useState<NavKey>('home');
  const [tasks, setTasksState] = useState<DailyTask[]>(() => {
    try { return JSON.parse(localStorage.getItem('upsc_tasks') || 'null') || defaultTasks; } catch { return defaultTasks; }
  });
  const [articles, setArticles] = useState<CurrentAffair[]>(() => {
    try { return JSON.parse(localStorage.getItem('upsc_articles') || 'null') || initialCurrentAffairs; } catch { return initialCurrentAffairs; }
  });

  const setTasks = (next: DailyTask[]) => { setTasksState(next); localStorage.setItem('upsc_tasks', JSON.stringify(next)); };
  const publish = (item: CurrentAffair) => {
    const next = [item, ...articles]; setArticles(next); localStorage.setItem('upsc_articles', JSON.stringify(next));
  };

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [active]);

  let content = <HomePage tasks={tasks} setTasks={setTasks} onGoPractice={() => setActive('practice')} onGoLearn={() => setActive('learn')} onGoCurrent={() => setActive('current')} />;
  if (active === 'learn') content = <LearnPage />;
  if (active === 'practice') content = <PracticePage />;
  if (active === 'current') content = <CurrentPage items={articles} />;
  if (active === 'profile') content = <ProfilePage onAdmin={() => setActive('admin')} />;
  if (active === 'admin') content = <AdminPage onPublish={(item) => { publish(item); setActive('current'); }} />;

  return <IonApp><Shell active={active} onNavigate={setActive}>{content}</Shell></IonApp>;
}

import { useEffect, useState } from 'react';
import { IonApp } from '@ionic/react';

import { Shell } from './components/Shell';
import { HomePage } from './pages/HomePage';
import { LearnPage } from './pages/LearnPage';
import { PracticePage } from './pages/PracticePage';
import { MainsPracticePage } from './pages/MainsPracticePage';
import { CurrentPage } from './pages/CurrentPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminPage } from './pages/AdminPage';

import { initialCurrentAffairs } from './data/mock';
import { supabase } from './lib/supabase';

import type {
  CurrentAffair,
  DailyTask,
  NavKey
} from './types';

const defaultTasks: DailyTask[] = [
  {
    id: 'ca',
    label: 'Read today’s current affairs brief',
    done: false
  },
  {
    id: 'mcq',
    label: 'Attempt at least 10 MCQs',
    done: false
  },
  {
    id: 'rev',
    label: 'Revise one saved topic',
    done: false
  }
];

export default function App() {
  const [active, setActive] = useState<NavKey>('home');
  const [practiceMode, setPracticeMode] =
    useState<'prelims' | 'mains'>('prelims');
  
  const [tasks, setTasksState] = useState<DailyTask[]>(() => {
    try {
      return (
        JSON.parse(localStorage.getItem('upsc_tasks') || 'null') ||
        defaultTasks
      );
    } catch {
      return defaultTasks;
    }
  });

  const [articles, setArticles] =
    useState<CurrentAffair[]>(initialCurrentAffairs);

  const setTasks = (next: DailyTask[]) => {
    setTasksState(next);
    localStorage.setItem('upsc_tasks', JSON.stringify(next));
  };

  const publish = (item: CurrentAffair) => {
    setArticles(current => [item, ...current]);
  };

  useEffect(() => {
    async function loadCurrentAffairs() {
      if (!supabase) {
        console.log('Supabase is not configured.');
        return;
      }

      const { data, error } = await supabase
        .from('current_affairs')
        .select(
          'id,title,source,subject,summary,tags,prelims,mains,published_at,status'
        )
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (error) {
        console.error('Unable to load current affairs:', error);
        return;
      }

      if (!data || data.length === 0) {
        return;
      }

      const formattedArticles: CurrentAffair[] = data.map(item => ({
        id: item.id,
        title: item.title,
        source: item.source,
        subject: item.subject,
        summary: item.summary,
        tags: item.tags || [],
        prelims: item.prelims,
        mains: item.mains,
        publishedAt: item.published_at
          ? new Date(item.published_at).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })
          : ''
      }));

      setArticles(formattedArticles);
    }

    loadCurrentAffairs();
  }, []);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [active]);

  let content = (
    <HomePage
      tasks={tasks}
      setTasks={setTasks}
      onGoPractice={() => setActive('practice')}
      onGoLearn={() => setActive('learn')}
      onGoCurrent={() => setActive('current')}
    />
  );

  if (active === 'learn') {
    content = <LearnPage />;
  }

  if (active === 'practice') {
  content =
    practiceMode === 'prelims'
      ? <PracticePage />
      : <MainsPracticePage />;
}

  if (active === 'current') {
    content = <CurrentPage items={articles} />;
  }

  if (active === 'profile') {
    content = <ProfilePage onAdmin={() => setActive('admin')} />;
  }

  if (active === 'admin') {
    content = (
      <AdminPage
        onPublish={item => {
          publish(item);
          setActive('current');
        }}
      />
    );
  }

  return (
    <IonApp>
      <Shell active={active} onNavigate={setActive}>
        {content}
      </Shell>
    </IonApp>
  );
}

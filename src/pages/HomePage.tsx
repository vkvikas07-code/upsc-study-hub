import { IonIcon } from '@ionic/react';
import { arrowForwardOutline, checkmarkCircle, ellipseOutline, flameOutline, statsChartOutline, trophyOutline } from 'ionicons/icons';
import type { DailyTask } from '../types';
import { subjects } from '../data/mock';
import { TopBar } from '../components/TopBar';

export function HomePage({ tasks, setTasks, onGoPractice, onGoLearn, onGoCurrent }: {
  tasks: DailyTask[];
  setTasks: (tasks: DailyTask[]) => void;
  onGoPractice: () => void;
  onGoLearn: () => void;
  onGoCurrent: () => void;
}) {
  const completed = tasks.filter(t => t.done).length;
  const taskPct = Math.round((completed / tasks.length) * 100);

  const toggleTask = (id: string) => setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));

  return (
    <div className="page-wrap">
      <TopBar title="UPSC Study Hub" subtitle="Preparation that moves with you" />

      <section className="hero-card">
        <div>
          <span className="eyebrow">TODAY'S FOCUS</span>
          <h2>Small steps. Strong preparation.</h2>
          <p>Finish the essential work first. Your consistency matters more than a crowded timetable.</p>
          <button className="primary-btn" onClick={onGoCurrent}>Start today's study <IonIcon icon={arrowForwardOutline} /></button>
        </div>
        <div className="hero-ring"><strong>{taskPct}%</strong><span>tasks</span></div>
      </section>

      <section className="metrics-grid">
        <article className="metric-card"><div className="metric-icon"><IonIcon icon={statsChartOutline} /></div><div><span>Average score</span><strong>68%</strong><small>Last 5 tests</small></div></article>
        <article className="metric-card"><div className="metric-icon coral"><IonIcon icon={trophyOutline} /></div><div><span>Tests attempted</span><strong>12</strong><small>3 this week</small></div></article>
        <article className="metric-card"><div className="metric-icon amber"><IonIcon icon={flameOutline} /></div><div><span>Current streak</span><strong>4 days</strong><small>Keep it realistic</small></div></article>
      </section>

      <section className="content-grid two-col">
        <article className="panel">
          <div className="panel-head"><div><span className="eyebrow">DAILY PLAN</span><h3>Complete your essentials</h3></div><span className="pill">{completed}/{tasks.length}</span></div>
          <div className="task-list">
            {tasks.map(task => (
              <button className={task.done ? 'task done' : 'task'} key={task.id} onClick={() => toggleTask(task.id)}>
                <IonIcon icon={task.done ? checkmarkCircle : ellipseOutline} />
                <span>{task.label}</span>
              </button>
            ))}
          </div>
          <div className="progress-track"><span style={{ width: `${taskPct}%` }} /></div>
        </article>

        <article className="panel syllabus-card">
          <div className="panel-head"><div><span className="eyebrow">SYLLABUS TRACKER</span><h3>Know where you stand</h3></div><strong className="big-stat">38%</strong></div>
          <p>Track subjects by topic instead of guessing how much of the syllabus is complete.</p>
          <button className="secondary-btn" onClick={onGoLearn}>Open tracker</button>
        </article>
      </section>

      <section className="panel">
        <div className="panel-head"><div><span className="eyebrow">QUICK STUDY</span><h3>Continue by subject</h3></div><button className="text-btn" onClick={onGoLearn}>View all</button></div>
        <div className="subject-grid">
          {subjects.map(subject => (
            <button className="subject-tile" key={subject.name} onClick={onGoLearn}>
              <span className="subject-emoji">{subject.icon}</span><strong>{subject.name}</strong><small>{subject.progress}% covered</small>
              <div className="mini-progress"><span style={{ width: `${subject.progress}%` }} /></div>
            </button>
          ))}
        </div>
      </section>

      <section className="test-banner">
        <div><span className="eyebrow">PRACTICE</span><h3>10-question daily test</h3><p>Short enough to finish. Useful enough to learn from.</p></div>
        <button className="primary-btn" onClick={onGoPractice}>Start test</button>
      </section>
    </div>
  );
}

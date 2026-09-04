import { TopBar } from '../components/TopBar';
import { subjects } from '../data/mock';

const syllabus = [
  ['Polity', 'Constitution, Parliament, Judiciary, Governance', 42],
  ['History', 'Ancient, Medieval, Modern, Art & Culture', 31],
  ['Geography', 'Physical, India, World, Mapping', 38],
  ['Economy', 'Basics, Fiscal, Monetary, External Sector', 27],
  ['Environment', 'Ecology, Biodiversity, Climate, Conventions', 53],
  ['Science & Tech', 'Space, Biotech, Digital, Defence Tech', 35]
] as const;

export function LearnPage() {
  return (
    <div className="page-wrap">
      <TopBar title="Learn" subtitle="Syllabus-first study, not content overload" />
      <section className="panel intro-strip"><span className="eyebrow">PRELIMS + MAINS</span><h2>Study by syllabus, then connect current affairs.</h2><p>Every topic in the final platform will link to notes, PYQs, tests and relevant current affairs.</p></section>
      <section className="syllabus-list">
        {syllabus.map(([name, desc, progress], idx) => (
          <article className="syllabus-row" key={name}>
            <div className="subject-emoji">{subjects[idx].icon}</div>
            <div className="syllabus-info"><div><h3>{name}</h3><span>{progress}%</span></div><p>{desc}</p><div className="progress-track"><span style={{ width: `${progress}%` }} /></div></div>
            <button className="secondary-btn compact">Study</button>
          </article>
        ))}
      </section>
    </div>
  );
}

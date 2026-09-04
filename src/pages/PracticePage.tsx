import { useState } from 'react';
import { TopBar } from '../components/TopBar';
import { sampleQuestions } from '../data/mock';

export function PracticePage() {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const q = sampleQuestions[index];

  const answer = (option: number) => {
    if (selected !== null) return;
    setSelected(option);
    if (option === q.answer) setScore(s => s + 1);
  };

  const next = () => {
    if (index === sampleQuestions.length - 1) { setFinished(true); return; }
    setIndex(i => i + 1); setSelected(null);
  };

  const restart = () => { setIndex(0); setSelected(null); setScore(0); setFinished(false); };

  return (
    <div className="page-wrap">
      <TopBar title="Practice" subtitle="Learn from every answer" />
      {!finished ? (
        <section className="quiz-card">
          <div className="quiz-meta"><span>Daily practice</span><strong>{index + 1}/{sampleQuestions.length}</strong></div>
          <div className="progress-track"><span style={{ width: `${((index + 1) / sampleQuestions.length) * 100}%` }} /></div>
          <h2>{q.question}</h2>
          <div className="option-list">
            {q.options.map((opt, i) => {
              const state = selected === null ? '' : i === q.answer ? 'correct' : selected === i ? 'wrong' : 'muted';
              return <button key={opt} className={`option ${state}`} onClick={() => answer(i)}><span>{String.fromCharCode(65 + i)}</span>{opt}</button>;
            })}
          </div>
          {selected !== null && <div className="explanation"><strong>Why?</strong><p>{q.explanation}</p><button className="primary-btn" onClick={next}>{index === sampleQuestions.length - 1 ? 'See result' : 'Next question'}</button></div>}
        </section>
      ) : (
        <section className="result-card"><span className="result-icon">🎯</span><h2>{score}/{sampleQuestions.length}</h2><p>Use the explanation, not just the score. The aim is to strengthen concepts.</p><button className="primary-btn" onClick={restart}>Practice again</button></section>
      )}
    </div>
  );
}

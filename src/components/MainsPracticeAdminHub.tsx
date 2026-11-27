
import { useState } from 'react';
import { MainsQuestionManager } from './MainsQuestionManager';
import { MainsOtherExamPracticeManager } from './MainsOtherExamPracticeManager';

type PracticeGroup = 'cse' | 'other';

export function MainsPracticeAdminHub() {
  const [group, setGroup] = useState<PracticeGroup>('cse');

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section className="panel" style={{ padding: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button
            type="button"
            className={group === 'cse' ? 'filter active' : 'filter'}
            onClick={() => setGroup('cse')}
          >
            UPSC CSE Practice
          </button>

          <button
            type="button"
            className={group === 'other' ? 'filter active' : 'filter'}
            onClick={() => setGroup('other')}
          >
            Other UPSC &amp; State PSC Practice
          </button>
        </div>
      </section>

      {group === 'cse' ? (
        <MainsQuestionManager />
      ) : (
        <MainsOtherExamPracticeManager />
      )}
    </div>
  );
}

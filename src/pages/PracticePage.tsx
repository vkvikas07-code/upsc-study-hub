import { useEffect, useState } from 'react';

import { TopBar } from '../components/TopBar';
import { supabase } from '../lib/supabase';

type LiveQuestion = {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;

  subject: string;
  difficulty: string;

  topic: string | null;

  tags: string[];

  is_pyq: boolean;
  pyq_year: number | null;

  source: string | null;
};

export function PracticePage() {
  const [questions, setQuestions] =
    useState<LiveQuestion[]>([]);

  const [index, setIndex] =
    useState(0);

  const [selected, setSelected] =
    useState<number | null>(null);

  const [score, setScore] =
    useState(0);

  const [finished, setFinished] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  async function loadQuestions() {
    if (!supabase) {
      setError(
        'Practice database is not configured.'
      );

      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const { data, error: loadError } =
      await supabase
        .from('questions')
        .select(`
          id,
          question,
          options,
          correct_index,
          explanation,
          subject,
          difficulty,
          topic,
          tags,
          is_pyq,
          pyq_year,
          source
        `)
        .eq('status', 'published')
        .eq('exam_stage', 'prelims')
        .order(
          'created_at',
          { ascending: false }
        );

    if (loadError) {
      console.error(
        'Unable to load questions:',
        loadError
      );

      setError(
        loadError.message
      );

      setLoading(false);
      return;
    }

    const formatted: LiveQuestion[] =
      (data || []).map(item => ({
        id: item.id,

        question:
          item.question,

        options:
          Array.isArray(
            item.options
          )
            ? item.options.map(
                option =>
                  String(option)
              )
            : [],

        correct_index:
          item.correct_index,

        explanation:
          item.explanation,

        subject:
          item.subject,

        difficulty:
          item.difficulty,

        topic:
          item.topic,

        tags:
          item.tags || [],

        is_pyq:
          item.is_pyq,

        pyq_year:
          item.pyq_year,

        source:
          item.source
      }));

    setQuestions(formatted);

    setIndex(0);
    setSelected(null);
    setScore(0);
    setFinished(false);

    setLoading(false);
  }

  useEffect(() => {
    loadQuestions();
  }, []);

  function answer(
    option: number
  ) {
    if (
      selected !== null ||
      !questions[index]
    ) {
      return;
    }

    setSelected(option);

    if (
      option ===
      questions[index]
        .correct_index
    ) {
      setScore(
        current =>
          current + 1
      );
    }
  }

  function next() {
    if (
      index ===
      questions.length - 1
    ) {
      setFinished(true);

      return;
    }

    setIndex(
      current =>
        current + 1
    );

    setSelected(null);
  }

  function restart() {
    setIndex(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
  }

  if (loading) {
    return (
      <div className="page-wrap">

        <TopBar
          title="Practice"
          subtitle="Learn from every answer"
        />

        <section className="panel">

          <h2>
            Loading MCQs...
          </h2>

        </section>

      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrap">

        <TopBar
          title="Practice"
          subtitle="Learn from every answer"
        />

        <section className="panel">

          <h2>
            Unable to load questions
          </h2>

          <p>
            {error}
          </p>

          <button
            className="primary-btn"
            onClick={
              loadQuestions
            }
          >
            Try again
          </button>

        </section>

      </div>
    );
  }

  if (
    questions.length === 0
  ) {
    return (
      <div className="page-wrap">

        <TopBar
          title="Practice"
          subtitle="Learn from every answer"
        />

        <section className="panel">

          <span className="eyebrow">
            PRACTICE BANK
          </span>

          <h2>
            No published MCQs yet
          </h2>

          <p>
            Draft questions remain hidden
            until an administrator publishes
            them.
          </p>

          <button
            className="primary-btn"
            onClick={
              loadQuestions
            }
          >
            Refresh questions
          </button>

        </section>

      </div>
    );
  }

  const q =
    questions[index];

  if (finished) {
    const percentage =
      Math.round(
        (
          score /
          questions.length
        ) *
          100
      );

    return (
      <div className="page-wrap">

        <TopBar
          title="Practice"
          subtitle="Your practice result"
        />

        <section className="result-card">

          <span className="result-icon">
            🎯
          </span>

          <h2>
            {score}/
            {questions.length}
          </h2>

          <h3>
            {percentage}%
          </h3>

          <p>
            Review explanations and
            strengthen the concepts you
            missed.
          </p>

          <button
            className="primary-btn"
            onClick={restart}
          >
            Practice again
          </button>

          <button
            style={{
              marginLeft:
                '10px'
            }}
            onClick={
              loadQuestions
            }
          >
            Refresh questions
          </button>

        </section>

      </div>
    );
  }

  return (
    <div className="page-wrap">

      <TopBar
        title="Practice"
        subtitle="Learn from every answer"
      />

      <section className="quiz-card">

        <div className="quiz-meta">

          <div>

            <span>
              {q.subject}
            </span>

            {q.topic && (
              <small
                style={{
                  display:
                    'block',
                  marginTop:
                    '4px'
                }}
              >
                {q.topic}
              </small>
            )}

          </div>

          <strong>
            {index + 1}/
            {questions.length}
          </strong>

        </div>

        <div className="progress-track">

          <span
            style={{
              width:
                `${
                  (
                    (index + 1) /
                    questions.length
                  ) *
                  100
                }%`
            }}
          />

        </div>

        <div
          className="tag-row"
          style={{
            marginBottom:
              '12px'
          }}
        >

          <span className="tag">
            {q.difficulty}
          </span>

          {q.is_pyq && (
            <span className="tag">
              PYQ{' '}
              {q.pyq_year || ''}
            </span>
          )}

          {q.tags.map(
            tag => (
              <span
                className="tag"
                key={tag}
              >
                {tag}
              </span>
            )
          )}

        </div>

        <h2>
          {q.question}
        </h2>

        <div className="option-list">

          {q.options.map(
            (option, optionIndex) => {
              const state =
                selected === null
                  ? ''
                  : optionIndex ===
                      q.correct_index
                  ? 'correct'
                  : selected ===
                      optionIndex
                  ? 'wrong'
                  : 'muted';

              return (
                <button
                  key={
                    `${q.id}-${optionIndex}`
                  }
                  className={
                    `option ${state}`
                  }
                  onClick={() =>
                    answer(
                      optionIndex
                    )
                  }
                >

                  <span>
                    {String.fromCharCode(
                      65 +
                        optionIndex
                    )}
                  </span>

                  {option}

                </button>
              );
            }
          )}

        </div>

        {selected !== null && (
          <div className="explanation">

            <strong>
              Explanation
            </strong>

            <p>
              {q.explanation}
            </p>

            {q.source && (
              <small>
                Source: {q.source}
              </small>
            )}

            <div
              style={{
                marginTop:
                  '16px'
              }}
            >

              <button
                className="primary-btn"
                onClick={next}
              >
                {index ===
                questions.length -
                  1
                  ? 'See result'
                  : 'Next question'}
              </button>

            </div>

          </div>
        )}

      </section>

    </div>
  );
}

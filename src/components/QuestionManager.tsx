import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { supabase } from '../lib/supabase';

type QuestionStatus =
  | 'draft'
  | 'published'
  | 'archived';

type Difficulty =
  | 'easy'
  | 'medium'
  | 'hard';

type ExamStage =
  | 'prelims'
  | 'mains';

type QuestionRow = {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;

  subject: string;
  difficulty: Difficulty;

  exam_stage: ExamStage;
  paper: string | null;
  topic: string | null;

  tags: string[];

  is_pyq: boolean;
  pyq_year: number | null;

  source: string | null;
  source_url: string | null;

  status: QuestionStatus;

  created_at: string;
  updated_at: string;
};

const QUESTION_SELECT = `
  id,
  question,
  options,
  correct_index,
  explanation,
  subject,
  difficulty,
  exam_stage,
  paper,
  topic,
  tags,
  is_pyq,
  pyq_year,
  source,
  source_url,
  status,
  created_at,
  updated_at
`;

export function QuestionManager() {
  const [questions, setQuestions] =
    useState<QuestionRow[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState('');

  const [question, setQuestion] =
    useState('');

  const [optionA, setOptionA] =
    useState('');

  const [optionB, setOptionB] =
    useState('');

  const [optionC, setOptionC] =
    useState('');

  const [optionD, setOptionD] =
    useState('');

  const [correctIndex, setCorrectIndex] =
    useState(0);

  const [explanation, setExplanation] =
    useState('');

  const [subject, setSubject] =
    useState('Polity');

  const [topic, setTopic] =
    useState('');

  const [paper, setPaper] =
    useState('GS-I');

  const [difficulty, setDifficulty] =
    useState<Difficulty>('medium');

  const [examStage, setExamStage] =
    useState<ExamStage>('prelims');

  const [tagsText, setTagsText] =
    useState('');

  const [isPyq, setIsPyq] =
    useState(false);

  const [pyqYear, setPyqYear] =
    useState('');

  const [source, setSource] =
    useState('');

  const [sourceUrl, setSourceUrl] =
    useState('');

  const [status, setStatus] =
    useState<QuestionStatus>('draft');

  const [
  searchText,
  setSearchText
] =
  useState('');


const [
  bankSubject,
  setBankSubject
] =
  useState('all');


const [
  bankStatus,
  setBankStatus
] =
  useState<
    'all' |
    QuestionStatus
  >('all');


const [
  bankDifficulty,
  setBankDifficulty
] =
  useState<
    'all' |
    Difficulty
  >('all');


const [
  bankType,
  setBankType
] =
  useState<
    'all' |
    'practice' |
    'pyq'
  >('all');
  
  async function loadQuestions() {
    if (!supabase) {
      setMessage(
        'Supabase is not configured.'
      );
      const filteredQuestions =
  questions.filter(
    item => {
      const search =
        searchText
          .trim()
          .toLowerCase();


      const matchesSearch =
        !search ||
        item.question
          .toLowerCase()
          .includes(
            search
          ) ||
        item.subject
          .toLowerCase()
          .includes(
            search
          ) ||
        (
          item.topic ||
          ''
        )
          .toLowerCase()
          .includes(
            search
          ) ||
        (
          item.source ||
          ''
        )
          .toLowerCase()
          .includes(
            search
          );


      const matchesSubject =
        bankSubject ===
          'all' ||
        item.subject ===
          bankSubject;


      const matchesStatus =
        bankStatus ===
          'all' ||
        item.status ===
          bankStatus;


      const matchesDifficulty =
        bankDifficulty ===
          'all' ||
        item.difficulty ===
          bankDifficulty;


      const matchesType =
        bankType ===
          'all' ||
        (
          bankType ===
            'pyq' &&
          item.is_pyq
        ) ||
        (
          bankType ===
            'practice' &&
          !item.is_pyq
        );


      return (
        matchesSearch &&
        matchesSubject &&
        matchesStatus &&
        matchesDifficulty &&
        matchesType
      );
    }
  );
      return;
    }

    setLoading(true);

    const { data, error } =
      await supabase
        .from('questions')
        .select(QUESTION_SELECT)
        .order(
          'created_at',
          { ascending: false }
        );

    if (error) {
      console.error(
        'Unable to load questions:',
        error
      );

      setMessage(error.message);
      setLoading(false);

      return;
    }

    const formatted: QuestionRow[] =
      (data || []).map(item => ({
        ...item,

        options:
          Array.isArray(item.options)
            ? item.options
            : [],

        tags:
          item.tags || []
      })) as QuestionRow[];

    setQuestions(formatted);
    setLoading(false);
  }

  useEffect(() => {
    loadQuestions();
  }, []);

  function resetForm() {
    setEditingId(null);

    setQuestion('');

    setOptionA('');
    setOptionB('');
    setOptionC('');
    setOptionD('');

    setCorrectIndex(0);

    setExplanation('');

    setSubject('Polity');
    setTopic('');
    setPaper('GS-I');

    setDifficulty('medium');
    setExamStage('prelims');

    setTagsText('');

    setIsPyq(false);
    setPyqYear('');

    setSource('');
    setSourceUrl('');

    setStatus('draft');
  }

  function startEdit(
    item: QuestionRow
  ) {
    setEditingId(item.id);

    setQuestion(item.question);

    setOptionA(
      item.options[0] || ''
    );

    setOptionB(
      item.options[1] || ''
    );

    setOptionC(
      item.options[2] || ''
    );

    setOptionD(
      item.options[3] || ''
    );

    setCorrectIndex(
      item.correct_index
    );

    setExplanation(
      item.explanation
    );

    setSubject(
      item.subject
    );

    setTopic(
      item.topic || ''
    );

    setPaper(
      item.paper || ''
    );

    setDifficulty(
      item.difficulty
    );

    setExamStage(
      item.exam_stage
    );

    setTagsText(
      (item.tags || [])
        .join(', ')
    );

    setIsPyq(
      item.is_pyq
    );

    setPyqYear(
      item.pyq_year
        ? String(item.pyq_year)
        : ''
    );

    setSource(
      item.source || ''
    );

    setSourceUrl(
      item.source_url || ''
    );

    setStatus(
      item.status
    );

    setMessage(
      'Editing selected question.'
    );

    const mainArea =
      document.querySelector(
        '.main-area'
      );

    if (mainArea) {
      mainArea.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }

  async function saveQuestion(
    e: FormEvent
  ) {
    e.preventDefault();

    if (!supabase) {
      setMessage(
        'Supabase is not configured.'
      );
      return;
    }

    const options = [
      optionA.trim(),
      optionB.trim(),
      optionC.trim(),
      optionD.trim()
    ];

    if (!question.trim()) {
      setMessage(
        'Enter the question.'
      );
      return;
    }

    if (
      options.some(
        option => !option
      )
    ) {
      setMessage(
        'All four options are required.'
      );
      return;
    }

    if (!explanation.trim()) {
      setMessage(
        'Add an explanation.'
      );
      return;
    }

    if (!subject.trim()) {
      setMessage(
        'Subject is required.'
      );
      return;
    }

    if (
      isPyq &&
      !pyqYear.trim()
    ) {
      setMessage(
        'Enter the PYQ year.'
      );
      return;
    }

    setSaving(true);

    setMessage(
      editingId
        ? 'Updating question...'
        : 'Saving question...'
    );

    const {
      data: { user }
    } =
      await supabase.auth.getUser();

    if (!user) {
      setSaving(false);

      setMessage(
        'Admin session expired. Sign in again.'
      );

      return;
    }

    const tags =
      tagsText
        .split(',')
        .map(
          tag => tag.trim()
        )
        .filter(Boolean);

    const payload = {
      question:
        question.trim(),

      options,

      correct_index:
        correctIndex,

      explanation:
        explanation.trim(),

      subject:
        subject.trim(),

      difficulty,

      exam_stage:
        examStage,

      paper:
        paper.trim() ||
        null,

      topic:
        topic.trim() ||
        null,

      tags,

      is_pyq:
        isPyq,

      pyq_year:
        isPyq &&
        pyqYear.trim()
          ? Number(pyqYear)
          : null,

      source:
        source.trim() ||
        null,

      source_url:
        sourceUrl.trim() ||
        null,

      status,

      updated_at:
        new Date().toISOString()
    };

    if (editingId) {
      const { data, error } =
        await supabase
          .from('questions')
          .update(payload)
          .eq(
            'id',
            editingId
          )
          .select(
            QUESTION_SELECT
          )
          .single();

      if (
        error ||
        !data
      ) {
        console.error(
          'Question update failed:',
          error
        );

        setSaving(false);

        setMessage(
          error?.message ||
            'Question update failed.'
        );

        return;
      }

      const updated: QuestionRow = {
        ...data,

        options:
          Array.isArray(
            data.options
          )
            ? data.options
            : [],

        tags:
          data.tags || []
      } as QuestionRow;

      setQuestions(
        current =>
          current.map(
            item =>
              item.id ===
              updated.id
                ? updated
                : item
          )
      );

      setSaving(false);
      resetForm();

      setMessage(
        'Question updated successfully.'
      );

      return;
    }

    const { data, error } =
      await supabase
        .from('questions')
        .insert({
          ...payload,

          created_by:
            user.id
        })
        .select(
          QUESTION_SELECT
        )
        .single();

    if (
      error ||
      !data
    ) {
      console.error(
        'Question creation failed:',
        error
      );

      setSaving(false);

      setMessage(
        error?.message ||
          'Unable to save question.'
      );

      return;
    }

    const created: QuestionRow = {
      ...data,

      options:
        Array.isArray(
          data.options
        )
          ? data.options
          : [],

      tags:
        data.tags || []
    } as QuestionRow;

    setQuestions(
      current => [
        created,
        ...current
      ]
    );

    setSaving(false);
    resetForm();

    setMessage(
      created.status ===
        'published'
        ? 'Question published successfully.'
        : 'Question saved as draft.'
    );
  }

  async function changeStatus(
    item: QuestionRow,
    nextStatus: QuestionStatus
  ) {
    if (!supabase) {
      return;
    }

    const { data, error } =
      await supabase
        .from('questions')
        .update({
          status:
            nextStatus,

          updated_at:
            new Date().toISOString()
        })
        .eq(
          'id',
          item.id
        )
        .select(
          QUESTION_SELECT
        )
        .single();

    if (
      error ||
      !data
    ) {
      setMessage(
        error?.message ||
          'Unable to change question status.'
      );

      return;
    }

    const updated: QuestionRow = {
      ...data,

      options:
        Array.isArray(
          data.options
        )
          ? data.options
          : [],

      tags:
        data.tags || []
    } as QuestionRow;

    setQuestions(
      current =>
        current.map(
          questionItem =>
            questionItem.id ===
            updated.id
              ? updated
              : questionItem
        )
    );

    setMessage(
      `Question changed to ${nextStatus}.`
    );
  }

  async function deleteQuestion(
    item: QuestionRow
  ) {
    if (!supabase) {
      return;
    }

    const confirmed =
      window.confirm(
        'Delete this question permanently?'
      );

    if (!confirmed) {
      return;
    }

    const { error } =
      await supabase
        .from('questions')
        .delete()
        .eq(
          'id',
          item.id
        );

    if (error) {
      setMessage(
        error.message
      );

      return;
    }

    setQuestions(
      current =>
        current.filter(
          questionItem =>
            questionItem.id !==
            item.id
        )
    );

    if (
      editingId ===
      item.id
    ) {
      resetForm();
    }

    setMessage(
      'Question deleted.'
    );
  }

  return (
    <section
      style={{
        marginTop: '30px'
      }}
    >
      <div
        className="panel admin-form"
      >
        <span className="eyebrow">
          MCQ QUESTION MANAGER
        </span>

        <h2>
          {editingId
            ? 'Edit MCQ'
            : 'Create MCQ'}
        </h2>

        <form
          onSubmit={
            saveQuestion
          }
        >
          <label>
            Question

            <textarea
              value={question}
              onChange={
                e =>
                  setQuestion(
                    e.target.value
                  )
              }
              rows={4}
              placeholder="Enter UPSC-style MCQ question"
            />
          </label>

          <label>
            Option A

            <input
              value={optionA}
              onChange={
                e =>
                  setOptionA(
                    e.target.value
                  )
              }
            />
          </label>

          <label>
            Option B

            <input
              value={optionB}
              onChange={
                e =>
                  setOptionB(
                    e.target.value
                  )
              }
            />
          </label>

          <label>
            Option C

            <input
              value={optionC}
              onChange={
                e =>
                  setOptionC(
                    e.target.value
                  )
              }
            />
          </label>

          <label>
            Option D

            <input
              value={optionD}
              onChange={
                e =>
                  setOptionD(
                    e.target.value
                  )
              }
            />
          </label>

          <label>
            Correct answer

            <select
              value={correctIndex}
              onChange={
                e =>
                  setCorrectIndex(
                    Number(
                      e.target.value
                    )
                  )
              }
            >
              <option value={0}>
                A
              </option>

              <option value={1}>
                B
              </option>

              <option value={2}>
                C
              </option>

              <option value={3}>
                D
              </option>
            </select>
          </label>

          <label>
            Explanation

            <textarea
              value={explanation}
              onChange={
                e =>
                  setExplanation(
                    e.target.value
                  )
              }
              rows={5}
              placeholder="Explain why the correct answer is correct."
            />
          </label>

          <div className="form-two">
            <label>
              Subject

              <select
                value={subject}
                onChange={
                  e =>
                    setSubject(
                      e.target.value
                    )
                }
              >
                <option>
                  Polity
                </option>

                <option>
                  History
                </option>

                <option>
                  Geography
                </option>

                <option>
                  Economy
                </option>

                <option>
                  Environment
                </option>

                <option>
                  Science & Tech
                </option>

                <option>
                  Current Affairs
                </option>
              </select>
            </label>

            <label>
              Difficulty

              <select
                value={difficulty}
                onChange={
                  e =>
                    setDifficulty(
                      e.target
                        .value as Difficulty
                    )
                }
              >
                <option value="easy">
                  Easy
                </option>

                <option value="medium">
                  Medium
                </option>

                <option value="hard">
                  Hard
                </option>
              </select>
            </label>
          </div>

          <div className="form-two">
            <label>
              Exam stage

              <select
                value={examStage}
                onChange={
                  e =>
                    setExamStage(
                      e.target
                        .value as ExamStage
                    )
                }
              >
                <option value="prelims">
                  Prelims
                </option>

                <option value="mains">
                  Mains
                </option>
              </select>
            </label>

            <label>
              Paper

              <input
                value={paper}
                onChange={
                  e =>
                    setPaper(
                      e.target.value
                    )
                }
                placeholder="GS-I / GS-II / GS-III"
              />
            </label>
          </div>

          <label>
            Topic

            <input
              value={topic}
              onChange={
                e =>
                  setTopic(
                    e.target.value
                  )
              }
              placeholder="Fundamental Rights / Monsoon / Inflation..."
            />
          </label>

          <label>
            Tags

            <input
              value={tagsText}
              onChange={
                e =>
                  setTagsText(
                    e.target.value
                  )
              }
              placeholder="Constitution, Article 21, Prelims"
            />

            <small>
              Separate tags using commas.
            </small>
          </label>

          <label>
            Source

            <input
              value={source}
              onChange={
                e =>
                  setSource(
                    e.target.value
                  )
              }
              placeholder="NCERT / Laxmikanth / PIB / UPSC"
            />
          </label>

          <label>
            Source URL

            <input
              type="url"
              value={sourceUrl}
              onChange={
                e =>
                  setSourceUrl(
                    e.target.value
                  )
              }
              placeholder="https://..."
            />
          </label>

          <div
            className="checkbox-row"
          >
            <label>
              <input
                type="checkbox"
                checked={isPyq}
                onChange={
                  e =>
                    setIsPyq(
                      e.target.checked
                    )
                }
              />

              Previous Year Question
            </label>
          </div>

          {isPyq && (
            <label>
              PYQ Year

              <input
                type="number"
                min="1979"
                max="2100"
                value={pyqYear}
                onChange={
                  e =>
                    setPyqYear(
                      e.target.value
                    )
                }
                placeholder="2025"
              />
            </label>
          )}

          <label>
            Status

            <select
              value={status}
              onChange={
                e =>
                  setStatus(
                    e.target
                      .value as QuestionStatus
                  )
              }
            >
              <option value="draft">
                Draft
              </option>

              <option value="published">
                Published
              </option>

              <option value="archived">
                Archived
              </option>
            </select>
          </label>

          <div
            style={{
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap',
              marginTop: '16px'
            }}
          >
            <button
              className="primary-btn"
              type="submit"
              disabled={saving}
            >
              {saving
                ? 'Saving...'
                : editingId
                ? 'Save changes'
                : status ===
                    'published'
                ? 'Publish question'
                : 'Save draft'}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={
                  resetForm
                }
              >
                Cancel edit
              </button>
            )}
          </div>

          {message && (
            <p className="form-message">
              {message}
            </p>
          )}
        </form>
      </div>

      <div
        className="panel"
        style={{
          marginTop: '22px'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems:
              'center',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <div>
            <span className="eyebrow">
              QUESTION BANK
            </span>

            <h2>
              Existing MCQs
            </h2>
          </div>

          <button
            type="button"
            onClick={
              loadQuestions
            }
          >
            Refresh questions
          </button>
        </div>

        {loading && (
          <p>
            Loading questions...
          </p>
        )}

        {!loading &&
          questions.length === 0 && (
            <p>
              No MCQs created yet.
            </p>
          )}

        <div
          style={{
            display: 'grid',
            gap: '14px',
            marginTop: '18px'
          }}
        >
         {filteredQuestions.map(
            item => (
              <article
                key={item.id}
                style={{
                  border:
                    '1px solid rgba(255,255,255,.10)',
                  borderRadius:
                    '14px',
                  padding: '18px'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    gap: '18px',
                    flexWrap: 'wrap'
                  }}
                >
                  <div
                    style={{
                      flex: '1 1 500px'
                    }}
                  >
                    <span className="eyebrow">
                      {item.subject}
                      {' • '}
                      {item.difficulty}
                    </span>

                    <h3>
                      {item.question}
                    </h3>

                    <p>
                      Correct answer:{' '}
                      <strong>
                        {String.fromCharCode(
                          65 +
                            item.correct_index
                        )}
                      </strong>
                    </p>

                    <p>
                      Status:{' '}
                      <strong>
                        {item.status}
                      </strong>
                    </p>

                    {item.is_pyq && (
                      <p>
                        PYQ:{' '}
                        {item.pyq_year ||
                          'Year not set'}
                      </p>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      flexWrap: 'wrap',
                      alignItems:
                        'flex-start'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        startEdit(
                          item
                        )
                      }
                    >
                      Edit
                    </button>

                    {item.status !==
                      'published' && (
                      <button
                        type="button"
                        onClick={() =>
                          changeStatus(
                            item,
                            'published'
                          )
                        }
                      >
                        Publish
                      </button>
                    )}

                    {item.status !==
                      'draft' && (
                      <button
                        type="button"
                        onClick={() =>
                          changeStatus(
                            item,
                            'draft'
                          )
                        }
                      >
                        Draft
                      </button>
                    )}

                    {item.status !==
                      'archived' && (
                      <button
                        type="button"
                        onClick={() =>
                          changeStatus(
                            item,
                            'archived'
                          )
                        }
                      >
                        Archive
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        deleteQuestion(
                          item
                        )
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            )
          )}
        </div>
      </div>
    </section>
  );
}

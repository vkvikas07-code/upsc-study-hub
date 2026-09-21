import {
  useEffect,
  useState,
  type FormEvent
} from 'react';

import {
  supabase
} from '../lib/supabase';


type Difficulty =
  | 'easy'
  | 'medium'
  | 'hard';


type QuestionStatus =
  | 'draft'
  | 'published'
  | 'archived';


type QuestionOrigin =
  | 'general'
  | 'upsc'
  | 'state_psc';


type RecentQuestion = {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  subject: string;
  topic: string | null;
  paper: string | null;
  difficulty: Difficulty;
  tags: string[];
  is_pyq: boolean;
  pyq_year: number | null;
  status: QuestionStatus;
  source: string | null;
  source_url: string | null;

  upsc_exam_name: string | null;
  upsc_exam_cycle: string | null;
  upsc_exam_stage: string | null;
  upsc_exam_paper: string | null;
  upsc_exam_year: number | null;

  state_psc_state: string | null;
  state_psc_name: string | null;
  state_psc_exam_name: string | null;
  state_psc_year: number | null;
  state_psc_stage: string | null;
  state_psc_paper: string | null;
};


const QUESTION_SELECT = `
  id,
  question,
  options,
  correct_index,
  explanation,
  subject,
  topic,
  paper,
  difficulty,
  tags,
  is_pyq,
  pyq_year,
  status,
  source,
  source_url,
  upsc_exam_name,
  upsc_exam_cycle,
  upsc_exam_stage,
  upsc_exam_paper,
  upsc_exam_year,
  state_psc_state,
  state_psc_name,
  state_psc_exam_name,
  state_psc_year,
  state_psc_stage,
  state_psc_paper
`;


function safeArray(
  value: unknown
): string[] {

  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(
    item =>
      String(item)
  );
}


export function CompactMcqEditor() {

  const [
    recentQuestions,
    setRecentQuestions
  ] =
    useState<RecentQuestion[]>([]);


  const [
    editingId,
    setEditingId
  ] =
    useState('');


  const [
    question,
    setQuestion
  ] =
    useState('');


  const [
    optionA,
    setOptionA
  ] =
    useState('');


  const [
    optionB,
    setOptionB
  ] =
    useState('');


  const [
    optionC,
    setOptionC
  ] =
    useState('');


  const [
    optionD,
    setOptionD
  ] =
    useState('');


  const [
    correctIndex,
    setCorrectIndex
  ] =
    useState(0);


  const [
    explanation,
    setExplanation
  ] =
    useState('');


  const [
    subject,
    setSubject
  ] =
    useState('Polity');


  const [
    topic,
    setTopic
  ] =
    useState('');


  const [
    paper,
    setPaper
  ] =
    useState('GS-I');


  const [
    difficulty,
    setDifficulty
  ] =
    useState<Difficulty>(
      'medium'
    );


  const [
    status,
    setStatus
  ] =
    useState<QuestionStatus>(
      'published'
    );


  const [
    tagsText,
    setTagsText
  ] =
    useState('');


  const [
    isPyq,
    setIsPyq
  ] =
    useState(false);


  const [
    pyqYear,
    setPyqYear
  ] =
    useState('');


  const [
    questionOrigin,
    setQuestionOrigin
  ] =
    useState<QuestionOrigin>(
      'general'
    );


  const [
    source,
    setSource
  ] =
    useState('');


  const [
    sourceUrl,
    setSourceUrl
  ] =
    useState('');


  /* OTHER UPSC */

  const [
    upscExamName,
    setUpscExamName
  ] =
    useState('');


  const [
    upscExamCycle,
    setUpscExamCycle
  ] =
    useState('');


  const [
    upscExamStage,
    setUpscExamStage
  ] =
    useState('');


  const [
    upscExamPaper,
    setUpscExamPaper
  ] =
    useState('');


  const [
    upscExamYear,
    setUpscExamYear
  ] =
    useState('');


  /* STATE PSC */

  const [
    statePscState,
    setStatePscState
  ] =
    useState('');


  const [
    statePscName,
    setStatePscName
  ] =
    useState('');


  const [
    statePscExamName,
    setStatePscExamName
  ] =
    useState('');


  const [
    statePscYear,
    setStatePscYear
  ] =
    useState('');


  const [
    statePscStage,
    setStatePscStage
  ] =
    useState('');


  const [
    statePscPaper,
    setStatePscPaper
  ] =
    useState('');


  const [
    advancedOpen,
    setAdvancedOpen
  ] =
    useState(false);


  const [
    saving,
    setSaving
  ] =
    useState(false);


  const [
    message,
    setMessage
  ] =
    useState('');


  async function loadRecentQuestions():
    Promise<void> {

    if (!supabase) {
      return;
    }


    const {
      data,
      error
    } =
      await supabase
        .from(
          'questions'
        )
        .select(
          QUESTION_SELECT
        )
        .eq(
          'exam_stage',
          'prelims'
        )
        .order(
          'created_at',
          {
            ascending: false
          }
        )
        .limit(50);


    if (error) {

      console.error(
        'Unable to load recent questions:',
        error
      );

      return;
    }


    const loaded =
      (data || [])
        .map(
          item => ({
            ...item,

            options:
              safeArray(
                item.options
              ),

            tags:
              safeArray(
                item.tags
              )

          })
        ) as RecentQuestion[];


    setRecentQuestions(
      loaded
    );
  }


  useEffect(
    () => {

      void loadRecentQuestions();

    },
    []
  );


  function resetForm():
    void {

    setEditingId('');

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

    setStatus('published');

    setTagsText('');

    setIsPyq(false);
    setPyqYear('');

    setQuestionOrigin(
      'general'
    );

    setSource('');
    setSourceUrl('');

    setUpscExamName('');
    setUpscExamCycle('');
    setUpscExamStage('');
    setUpscExamPaper('');
    setUpscExamYear('');

    setStatePscState('');
    setStatePscName('');
    setStatePscExamName('');
    setStatePscYear('');
    setStatePscStage('');
    setStatePscPaper('');

    setAdvancedOpen(false);

    setMessage('');
  }


  function loadForEditing(
    id: string
  ): void {

    setEditingId(id);

    if (!id) {

      resetForm();

      return;
    }


    const item =
      recentQuestions.find(
        questionItem =>
          questionItem.id === id
      );


    if (!item) {
      return;
    }


    const options =
      item.options || [];


    setQuestion(
      item.question || ''
    );

    setOptionA(
      options[0] || ''
    );

    setOptionB(
      options[1] || ''
    );

    setOptionC(
      options[2] || ''
    );

    setOptionD(
      options[3] || ''
    );

    setCorrectIndex(
      Number(
        item.correct_index || 0
      )
    );

    setExplanation(
      item.explanation || ''
    );

    setSubject(
      item.subject || 'Polity'
    );

    setTopic(
      item.topic || ''
    );

    setPaper(
      item.paper || 'GS-I'
    );

    setDifficulty(
      item.difficulty ||
      'medium'
    );

    setStatus(
      item.status ||
      'draft'
    );

    setTagsText(
      (item.tags || [])
        .join(', ')
    );

    setIsPyq(
      Boolean(
        item.is_pyq
      )
    );

    setPyqYear(
      item.pyq_year
        ? String(
            item.pyq_year
          )
        : ''
    );

    setSource(
      item.source || ''
    );

    setSourceUrl(
      item.source_url || ''
    );


    if (
      item.state_psc_state ||
      item.state_psc_name ||
      item.state_psc_exam_name
    ) {

      setQuestionOrigin(
        'state_psc'
      );

    } else if (
      item.upsc_exam_name
    ) {

      setQuestionOrigin(
        'upsc'
      );

    } else {

      setQuestionOrigin(
        'general'
      );
    }


    setUpscExamName(
      item.upsc_exam_name ||
      ''
    );

    setUpscExamCycle(
      item.upsc_exam_cycle ||
      ''
    );

    setUpscExamStage(
      item.upsc_exam_stage ||
      ''
    );

    setUpscExamPaper(
      item.upsc_exam_paper ||
      ''
    );

    setUpscExamYear(
      item.upsc_exam_year
        ? String(
            item.upsc_exam_year
          )
        : ''
    );


    setStatePscState(
      item.state_psc_state ||
      ''
    );

    setStatePscName(
      item.state_psc_name ||
      ''
    );

    setStatePscExamName(
      item.state_psc_exam_name ||
      ''
    );

    setStatePscYear(
      item.state_psc_year
        ? String(
            item.state_psc_year
          )
        : ''
    );

    setStatePscStage(
      item.state_psc_stage ||
      ''
    );

    setStatePscPaper(
      item.state_psc_paper ||
      ''
    );


    setAdvancedOpen(true);

    setMessage(
      'Question loaded for editing.'
    );
  }


  async function saveQuestion(
    event: FormEvent
  ):
    Promise<void> {

    event.preventDefault();


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
        option =>
          !option
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
        'Select the subject.'
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


    if (
      questionOrigin ===
        'upsc' &&
      !upscExamName.trim()
    ) {

      setMessage(
        'Enter the UPSC examination name.'
      );

      return;
    }


    if (
      questionOrigin ===
        'state_psc' &&
      (
        !statePscState.trim() ||
        !statePscName.trim() ||
        !statePscExamName.trim()
      )
    ) {

      setMessage(
        'Enter State, PSC and examination name.'
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
      data:
        authData
    } =
      await supabase
        .auth
        .getUser();


    const user =
      authData.user;


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
          value =>
            value.trim()
        )
        .filter(
          Boolean
        );


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
        'prelims',

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
          ? Number(
              pyqYear
            )
          : null,


      upsc_exam_name:
        questionOrigin ===
          'upsc'
          ? upscExamName.trim() ||
            null
          : null,

      upsc_exam_cycle:
        questionOrigin ===
          'upsc'
          ? upscExamCycle.trim() ||
            null
          : null,

      upsc_exam_stage:
        questionOrigin ===
          'upsc'
          ? upscExamStage.trim() ||
            null
          : null,

      upsc_exam_paper:
        questionOrigin ===
          'upsc'
          ? upscExamPaper.trim() ||
            null
          : null,

      upsc_exam_year:
        questionOrigin ===
          'upsc' &&
        upscExamYear.trim()
          ? Number(
              upscExamYear
            )
          : null,


      state_psc_state:
        questionOrigin ===
          'state_psc'
          ? statePscState.trim() ||
            null
          : null,

      state_psc_name:
        questionOrigin ===
          'state_psc'
          ? statePscName.trim() ||
            null
          : null,

      state_psc_exam_name:
        questionOrigin ===
          'state_psc'
          ? statePscExamName.trim() ||
            null
          : null,

      state_psc_year:
        questionOrigin ===
          'state_psc' &&
        statePscYear.trim()
          ? Number(
              statePscYear
            )
          : null,

      state_psc_stage:
        questionOrigin ===
          'state_psc'
          ? statePscStage.trim() ||
            null
          : null,

      state_psc_paper:
        questionOrigin ===
          'state_psc'
          ? statePscPaper.trim() ||
            null
          : null,


      source:
        source.trim() ||
        null,

      source_url:
        sourceUrl.trim() ||
        null,

      status,

      updated_at:
        new Date()
          .toISOString()

    };


    if (editingId) {

      const {
        error
      } =
        await supabase
          .from(
            'questions'
          )
          .update(
            payload
          )
          .eq(
            'id',
            editingId
          );


      if (error) {

        setSaving(false);

        setMessage(
          error.message
        );

        return;
      }


      setSaving(false);

      setMessage(
        'Question updated successfully.'
      );


      await loadRecentQuestions();

      return;
    }


    const {
      error
    } =
      await supabase
        .from(
          'questions'
        )
        .insert({
          ...payload,

          created_by:
            user.id
        });


    if (error) {

      setSaving(false);

      setMessage(
        error.message
      );

      return;
    }


    setSaving(false);

    setMessage(
      'Question saved successfully.'
    );


    resetForm();

    await loadRecentQuestions();
  }


  const compactGrid = {

    display:
      'grid',

    gridTemplateColumns:
      'repeat(auto-fit, minmax(180px, 1fr))',

    gap:
      '10px'

  };


  return (

    <section
      className="panel"
      style={{
        padding:
          '16px'
      }}
    >

      {/* HEADER */}

      <div
        style={{
          display:
            'flex',

          justifyContent:
            'space-between',

          alignItems:
            'flex-start',

          gap:
            '12px',

          flexWrap:
            'wrap'
        }}
      >

        <div>

          <span
            className="eyebrow"
          >
            MCQ EDITOR
          </span>

          <h2
            style={{
              margin:
                '5px 0'
            }}
          >
            {
              editingId
                ? 'Edit MCQ'
                : 'Add MCQ'
            }
          </h2>

          <small
            style={{
              color:
                '#94a3b8'
            }}
          >
            Essential fields first.
            Extra examination details stay hidden.
          </small>

        </div>


        <button
          type="button"
          className="secondary-btn"
          onClick={
            resetForm
          }
        >
          New Question
        </button>

      </div>


      {/* LOAD RECENT QUESTION */}

      <label
        style={{
          marginTop:
            '12px'
        }}
      >
        Edit Recent Question

        <select
          value={
            editingId
          }
          onChange={
            event =>
              loadForEditing(
                event.target.value
              )
          }
        >

          <option value="">
            Create new question
          </option>

          {
            recentQuestions.map(
              item => (

                <option
                  key={
                    item.id
                  }
                  value={
                    item.id
                  }
                >
                  {
                    item.question.length >
                    90
                      ? `${item.question.slice(
                          0,
                          90
                        )}...`
                      : item.question
                  }
                </option>

              )
            )
          }

        </select>

      </label>


      <form
        onSubmit={
          saveQuestion
        }
      >

        {/* QUESTION */}

        <label>

          Question

          <textarea
            rows={3}
            value={
              question
            }
            onChange={
              event =>
                setQuestion(
                  event.target.value
                )
            }
            placeholder="Enter UPSC-style MCQ"
          />

        </label>


        {/* OPTIONS 2 x 2 */}

        <div
          style={
            compactGrid
          }
        >

          <label>
            Option A

            <input
              value={
                optionA
              }
              onChange={
                event =>
                  setOptionA(
                    event.target.value
                  )
              }
            />
          </label>


          <label>
            Option B

            <input
              value={
                optionB
              }
              onChange={
                event =>
                  setOptionB(
                    event.target.value
                  )
              }
            />
          </label>


          <label>
            Option C

            <input
              value={
                optionC
              }
              onChange={
                event =>
                  setOptionC(
                    event.target.value
                  )
              }
            />
          </label>


          <label>
            Option D

            <input
              value={
                optionD
              }
              onChange={
                event =>
                  setOptionD(
                    event.target.value
                  )
              }
            />
          </label>

        </div>


        {/* CORE METADATA */}

        <div
          style={{
            ...compactGrid,
            marginTop:
              '10px'
          }}
        >

          <label>

            Correct Answer

            <select
              value={
                correctIndex
              }
              onChange={
                event =>
                  setCorrectIndex(
                    Number(
                      event.target.value
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

            Subject

            <select
              value={
                subject
              }
              onChange={
                event =>
                  setSubject(
                    event.target.value
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

            Topic

            <input
              value={
                topic
              }
              onChange={
                event =>
                  setTopic(
                    event.target.value
                  )
              }
              placeholder="Fundamental Rights"
            />

          </label>


          <label>

            Difficulty

            <select
              value={
                difficulty
              }
              onChange={
                event =>
                  setDifficulty(
                    event.target
                      .value as
                      Difficulty
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


        {/* EXPLANATION */}

        <label>

          Explanation

          <textarea
            rows={3}
            value={
              explanation
            }
            onChange={
              event =>
                setExplanation(
                  event.target.value
                )
            }
            placeholder="Why is the correct answer correct?"
          />

        </label>


        {/* PYQ + STATUS */}

        <div
          style={
            compactGrid
          }
        >

          <label>

            Question Type

            <select
              value={
                isPyq
                  ? 'pyq'
                  : 'practice'
              }
              onChange={
                event =>
                  setIsPyq(
                    event.target.value ===
                      'pyq'
                  )
              }
            >

              <option value="practice">
                Practice MCQ
              </option>

              <option value="pyq">
                Previous Year Question
              </option>

            </select>

          </label>


          {
            isPyq && (

              <label>

                PYQ Year

                <input
                  type="number"
                  min="1950"
                  max="2100"
                  value={
                    pyqYear
                  }
                  onChange={
                    event =>
                      setPyqYear(
                        event.target.value
                      )
                  }
                  placeholder="2025"
                />

              </label>

            )
          }


          <label>

            Status

            <select
              value={
                status
              }
              onChange={
                event =>
                  setStatus(
                    event.target
                      .value as
                      QuestionStatus
                  )
              }
            >

              <option value="published">
                Published
              </option>

              <option value="draft">
                Draft
              </option>

              <option value="archived">
                Archived
              </option>

            </select>

          </label>


          <label>

            Paper

            <input
              value={
                paper
              }
              onChange={
                event =>
                  setPaper(
                    event.target.value
                  )
              }
              placeholder="GS-I"
            />

          </label>

        </div>


        {/* ADVANCED TOGGLE */}

        <button
          type="button"
          className="secondary-btn"
          style={{
            marginTop:
              '12px'
          }}
          onClick={() =>
            setAdvancedOpen(
              current =>
                !current
            )
          }
        >

          {
            advancedOpen
              ? 'Hide Extra Details'
              : 'More Details'
          }

        </button>


        {/* ADVANCED */}

        {
          advancedOpen && (

            <div
              style={{
                marginTop:
                  '10px',

                padding:
                  '12px',

                border:
                  '1px solid rgba(255,255,255,.08)',

                borderRadius:
                  '12px'
              }}
            >

              <div
                style={
                  compactGrid
                }
              >

                <label>

                  Origin

                  <select
                    value={
                      questionOrigin
                    }
                    onChange={
                      event =>
                        setQuestionOrigin(
                          event.target
                            .value as
                            QuestionOrigin
                        )
                    }
                  >

                    <option value="general">
                      CSE / General
                    </option>

                    <option value="upsc">
                      Other UPSC
                    </option>

                    <option value="state_psc">
                      State PSC
                    </option>

                  </select>

                </label>


                <label>

                  Source

                  <input
                    value={
                      source
                    }
                    onChange={
                      event =>
                        setSource(
                          event.target.value
                        )
                    }
                    placeholder="UPSC / NCERT / Book"
                  />

                </label>


                <label>

                  Source URL

                  <input
                    type="url"
                    value={
                      sourceUrl
                    }
                    onChange={
                      event =>
                        setSourceUrl(
                          event.target.value
                        )
                    }
                    placeholder="https://..."
                  />

                </label>


                <label>

                  Tags

                  <input
                    value={
                      tagsText
                    }
                    onChange={
                      event =>
                        setTagsText(
                          event.target.value
                        )
                    }
                    placeholder="Polity, PYQ, Article 21"
                  />

                </label>

              </div>


              {/* OTHER UPSC */}

              {
                questionOrigin ===
                  'upsc' && (

                  <div
                    style={{
                      ...compactGrid,
                      marginTop:
                        '10px'
                    }}
                  >

                    <label>
                      UPSC Exam

                      <input
                        value={
                          upscExamName
                        }
                        onChange={
                          event =>
                            setUpscExamName(
                              event.target.value
                            )
                        }
                        placeholder="CAPF / CDS / NDA"
                      />
                    </label>


                    <label>
                      Year

                      <input
                        type="number"
                        value={
                          upscExamYear
                        }
                        onChange={
                          event =>
                            setUpscExamYear(
                              event.target.value
                            )
                        }
                      />
                    </label>


                    <label>
                      Cycle

                      <input
                        value={
                          upscExamCycle
                        }
                        onChange={
                          event =>
                            setUpscExamCycle(
                              event.target.value
                            )
                        }
                        placeholder="I / II"
                      />
                    </label>


                    <label>
                      Stage

                      <input
                        value={
                          upscExamStage
                        }
                        onChange={
                          event =>
                            setUpscExamStage(
                              event.target.value
                            )
                        }
                      />
                    </label>


                    <label>
                      Paper

                      <input
                        value={
                          upscExamPaper
                        }
                        onChange={
                          event =>
                            setUpscExamPaper(
                              event.target.value
                            )
                        }
                      />
                    </label>

                  </div>

                )
              }


              {/* STATE PSC */}

              {
                questionOrigin ===
                  'state_psc' && (

                  <div
                    style={{
                      ...compactGrid,
                      marginTop:
                        '10px'
                    }}
                  >

                    <label>
                      State

                      <input
                        value={
                          statePscState
                        }
                        onChange={
                          event =>
                            setStatePscState(
                              event.target.value
                            )
                        }
                      />
                    </label>


                    <label>
                      PSC Name

                      <input
                        value={
                          statePscName
                        }
                        onChange={
                          event =>
                            setStatePscName(
                              event.target.value
                            )
                        }
                      />
                    </label>


                    <label>
                      Examination

                      <input
                        value={
                          statePscExamName
                        }
                        onChange={
                          event =>
                            setStatePscExamName(
                              event.target.value
                            )
                        }
                      />
                    </label>


                    <label>
                      Year

                      <input
                        type="number"
                        value={
                          statePscYear
                        }
                        onChange={
                          event =>
                            setStatePscYear(
                              event.target.value
                            )
                        }
                      />
                    </label>


                    <label>
                      Stage

                      <input
                        value={
                          statePscStage
                        }
                        onChange={
                          event =>
                            setStatePscStage(
                              event.target.value
                            )
                        }
                      />
                    </label>


                    <label>
                      Paper

                      <input
                        value={
                          statePscPaper
                        }
                        onChange={
                          event =>
                            setStatePscPaper(
                              event.target.value
                            )
                        }
                      />
                    </label>

                  </div>

                )
              }

            </div>

          )
        }


        {
          message && (

            <div
              className="callout"
              style={{
                marginTop:
                  '10px'
              }}
            >
              {message}
            </div>

          )
        }


        {/* SAVE BAR */}

        <div
          style={{
            display:
              'flex',

            justifyContent:
              'flex-end',

            gap:
              '8px',

            marginTop:
              '12px'
          }}
        >

          <button
            type="button"
            className="secondary-btn"
            onClick={
              resetForm
            }
            disabled={
              saving
            }
          >
            Clear
          </button>


          <button
            type="submit"
            className="primary-btn"
            disabled={
              saving
            }
          >

            {
              saving
                ? 'Saving...'
                : editingId
                  ? 'Update MCQ'
                  : 'Save MCQ'
            }

          </button>

        </div>

      </form>

    </section>

  );
}


export default CompactMcqEditor;

import {
  useEffect,
  useMemo,
  useState
} from 'react';

import type {
  FormEvent
} from 'react';

import {
  supabase
} from '../lib/supabase';


type TestType =
  | 'sectional'
  | 'full_length'
  | 'pyq'
  | 'custom';


type QuestionRow = {
  id: string;
  question: string;
  subject: string;
  topic: string | null;
  difficulty: string;
  status: string;

  is_pyq: boolean;
  pyq_year: number | null;

  upsc_exam_name: string | null;
  upsc_exam_year: number | null;

  state_psc_state: string | null;
  state_psc_exam_name: string | null;
  state_psc_year: number | null;

  source: string | null;
};


type TestRow = {
  id: string;
  title: string;
  description: string | null;

  published: boolean;

  duration_minutes: number;

  exam_stage: string;

  paper: string | null;

  test_type: TestType;

  marks_per_question: number;

  negative_marks: number;

  instructions: string | null;

  created_at: string;
};


type TestQuestionRow = {
  question_id: string;
  position: number;
};


const TEST_SELECT = `
  id,
  title,
  description,
  published,
  duration_minutes,
  exam_stage,
  paper,
  test_type,
  marks_per_question,
  negative_marks,
  instructions,
  created_at
`;


const QUESTION_SELECT = `
  id,
  question,
  subject,
  topic,
  difficulty,
  status,
  is_pyq,
  pyq_year,
  upsc_exam_name,
  upsc_exam_year,
  state_psc_state,
  state_psc_exam_name,
  state_psc_year,
  source
`;


function safeNumber(
  value: unknown,
  fallback = 0
) {

  const number =
    Number(
      value
    );


  return Number.isFinite(
    number
  )
    ? number
    : fallback;
}


function testTypeLabel(
  type: TestType
) {

  switch (
    type
  ) {

    case 'sectional':
      return 'Sectional Test';

    case 'full_length':
      return 'Full-Length Mock';

    case 'pyq':
      return 'PYQ Test';

    case 'custom':
      return 'Custom Test';
  }
}


function sourceLabel(
  question: QuestionRow
) {

  if (
    question.state_psc_state ||
    question.state_psc_exam_name
  ) {

    return [
      question.state_psc_state,
      question.state_psc_exam_name,
      question.state_psc_year
        ? String(
            question.state_psc_year
          )
        : null
    ]
      .filter(Boolean)
      .join(' • ');
  }


  if (
    question.upsc_exam_name
  ) {

    return [
      question.upsc_exam_name,
      question.upsc_exam_year
        ? String(
            question.upsc_exam_year
          )
        : null
    ]
      .filter(Boolean)
      .join(' • ');
  }


  if (
    question.is_pyq
  ) {

    return question.pyq_year
      ? `CSE PYQ • ${question.pyq_year}`
      : 'CSE PYQ';
  }


  return (
    question.source ||
    'CSE / General Practice'
  );
}


export function PrelimsTestManager() {

  /*
   * DATA
   */

  const [
    tests,
    setTests
  ] =
    useState<TestRow[]>(
      []
    );


  const [
    questions,
    setQuestions
  ] =
    useState<QuestionRow[]>(
      []
    );


  const [
    loading,
    setLoading
  ] =
    useState(true);


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


  /*
   * EDITING
   */

  const [
    editingId,
    setEditingId
  ] =
    useState<string | null>(
      null
    );


  /*
   * FORM
   */

  const [
    title,
    setTitle
  ] =
    useState('');


  const [
    description,
    setDescription
  ] =
    useState('');


  const [
    paper,
    setPaper
  ] =
    useState(
      'GS Paper I'
    );


  const [
    testType,
    setTestType
  ] =
    useState<TestType>(
      'sectional'
    );


  const [
    durationMinutes,
    setDurationMinutes
  ] =
    useState(120);


  const [
    marksPerQuestion,
    setMarksPerQuestion
  ] =
    useState(2);


  const [
    negativeMarks,
    setNegativeMarks
  ] =
    useState(
      0.6667
    );


  const [
    instructions,
    setInstructions
  ] =
    useState('');


  const [
    published,
    setPublished
  ] =
    useState(false);


  /*
   * QUESTION SELECTION
   */

  const [
    selectedQuestionIds,
    setSelectedQuestionIds
  ] =
    useState<string[]>(
      []
    );


  /*
   * FILTERS
   */

  const [
    search,
    setSearch
  ] =
    useState('');


  const [
    subjectFilter,
    setSubjectFilter
  ] =
    useState(
      'all'
    );


  const [
    difficultyFilter,
    setDifficultyFilter
  ] =
    useState(
      'all'
    );


  /*
   * QUESTION MAP
   */

  const questionMap =
    useMemo(
      () => {

        const map =
          new Map<
            string,
            QuestionRow
          >();


        questions.forEach(
          question => {

            map.set(
              question.id,
              question
            );
          }
        );


        return map;

      },
      [
        questions
      ]
    );


  const selectedQuestionSet =
    useMemo(
      () =>
        new Set(
          selectedQuestionIds
        ),
      [
        selectedQuestionIds
      ]
    );


  /*
   * SUBJECT OPTIONS
   */

  const subjectOptions =
    useMemo(
      () => {

        return Array.from(
          new Set(
            questions.map(
              question =>
                question.subject
            )
          )
        ).sort();

      },
      [
        questions
      ]
    );


  /*
   * FILTER QUESTION BANK
   */

  const visibleQuestions =
    useMemo(
      () => {

        const query =
          search
            .trim()
            .toLowerCase();


        return questions.filter(
          question => {

            if (
              subjectFilter !==
                'all' &&
              question.subject !==
                subjectFilter
            ) {

              return false;
            }


            if (
              difficultyFilter !==
                'all' &&
              question.difficulty !==
                difficultyFilter
            ) {

              return false;
            }


            if (!query) {

              return true;
            }


            const searchable =
              [
                question.question,
                question.subject,
                question.topic,
                question.source,
                question.pyq_year,
                question.upsc_exam_name,
                question.upsc_exam_year,
                question.state_psc_state,
                question.state_psc_exam_name,
                question.state_psc_year
              ]
                .filter(
                  value =>
                    value !==
                      null &&
                    value !==
                      undefined
                )
                .join(' ')
                .toLowerCase();


            return searchable.includes(
              query
            );
          }
        );

      },
      [
        questions,
        search,
        subjectFilter,
        difficultyFilter
      ]
    );


  /*
   * TEST TOTAL MARKS
   */

  const totalMarks =
    useMemo(
      () => {

        return Math.round(
          selectedQuestionIds.length *
          marksPerQuestion *
          100
        ) / 100;

      },
      [
        selectedQuestionIds,
        marksPerQuestion
      ]
    );


  /*
   * LOAD QUESTIONS
   */

  async function loadQuestions() {

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
        .eq(
          'status',
          'published'
        )
        .order(
          'created_at',
          {
            ascending:
              false
          }
        );


    if (error) {

      console.error(
        'Unable to load questions:',
        error
      );


      setMessage(
        error.message
      );

      return;
    }


    const rows =
      (
        data ||
        []
      ).map(
        item => ({

          id:
            String(
              item.id
            ),

          question:
            String(
              item.question ||
              ''
            ),

          subject:
            String(
              item.subject ||
              'Other'
            ),

          topic:
            item.topic
              ? String(
                  item.topic
                )
              : null,

          difficulty:
            String(
              item.difficulty ||
              'medium'
            ),

          status:
            String(
              item.status ||
              'published'
            ),

          is_pyq:
            item.is_pyq ===
            true,

          pyq_year:
            item.pyq_year
              ? Number(
                  item.pyq_year
                )
              : null,

          upsc_exam_name:
            item.upsc_exam_name
              ? String(
                  item.upsc_exam_name
                )
              : null,

          upsc_exam_year:
            item.upsc_exam_year
              ? Number(
                  item.upsc_exam_year
                )
              : null,

          state_psc_state:
            item.state_psc_state
              ? String(
                  item.state_psc_state
                )
              : null,

          state_psc_exam_name:
            item.state_psc_exam_name
              ? String(
                  item.state_psc_exam_name
                )
              : null,

          state_psc_year:
            item.state_psc_year
              ? Number(
                  item.state_psc_year
                )
              : null,

          source:
            item.source
              ? String(
                  item.source
                )
              : null
        })
      );


    setQuestions(
      rows
    );
  }


  /*
   * LOAD TESTS
   */

  async function loadTests() {

    if (!supabase) {

      return;
    }


    const {
      data,
      error
    } =
      await supabase
        .from(
          'tests'
        )
        .select(
          TEST_SELECT
        )
        .eq(
          'exam_stage',
          'prelims'
        )
        .order(
          'created_at',
          {
            ascending:
              false
          }
        );


    if (error) {

      console.error(
        'Unable to load tests:',
        error
      );


      setMessage(
        error.message
      );

      return;
    }


    const rows =
      (
        data ||
        []
      ).map(
        item => ({

          id:
            String(
              item.id
            ),

          title:
            String(
              item.title ||
              ''
            ),

          description:
            item.description
              ? String(
                  item.description
                )
              : null,

          published:
            item.published ===
            true,

          duration_minutes:
            safeNumber(
              item.duration_minutes,
              120
            ),

          exam_stage:
            String(
              item.exam_stage ||
              'prelims'
            ),

          paper:
            item.paper
              ? String(
                  item.paper
                )
              : null,

          test_type:
            (
              item.test_type ||
              'sectional'
            ) as
              TestType,

          marks_per_question:
            safeNumber(
              item.marks_per_question,
              2
            ),

          negative_marks:
            safeNumber(
              item.negative_marks,
              0.6667
            ),

          instructions:
            item.instructions
              ? String(
                  item.instructions
                )
              : null,

          created_at:
            String(
              item.created_at ||
              ''
            )
        })
      );


    setTests(
      rows
    );
  }


  /*
   * LOAD EVERYTHING
   */

  async function loadAll() {

    setLoading(
      true
    );

    setMessage('');


    await Promise.all([
      loadQuestions(),
      loadTests()
    ]);


    setLoading(
      false
    );
  }


  useEffect(
    () => {

      void loadAll();

    },
    []
  );


  /*
   * RESET FORM
   */

  function resetForm() {

    setEditingId(
      null
    );

    setTitle('');

    setDescription('');

    setPaper(
      'GS Paper I'
    );

    setTestType(
      'sectional'
    );

    setDurationMinutes(
      120
    );

    setMarksPerQuestion(
      2
    );

    setNegativeMarks(
      0.6667
    );

    setInstructions('');

    setPublished(
      false
    );

    setSelectedQuestionIds(
      []
    );
  }


  /*
   * PAPER DEFAULTS
   */

  function changePaper(
    nextPaper:
      string
  ) {

    setPaper(
      nextPaper
    );


    setDurationMinutes(
      120
    );


    if (
      nextPaper ===
      'CSAT Paper II'
    ) {

      setMarksPerQuestion(
        2.5
      );

      setNegativeMarks(
        0.8333
      );

      return;
    }


    setMarksPerQuestion(
      2
    );

    setNegativeMarks(
      0.6667
    );
  }


  /*
   * SELECT QUESTION
   */

  function toggleQuestion(
    questionId:
      string
  ) {

    setSelectedQuestionIds(
      current => {

        if (
          current.includes(
            questionId
          )
        ) {

          return current.filter(
            id =>
              id !==
              questionId
          );
        }


        return [
          ...current,
          questionId
        ];
      }
    );
  }


  /*
   * MOVE QUESTION
   */

  function moveQuestion(
    index:
      number,

    direction:
      -1 |
      1
  ) {

    setSelectedQuestionIds(
      current => {

        const newIndex =
          index +
          direction;


        if (
          newIndex <
            0 ||
          newIndex >=
            current.length
        ) {

          return current;
        }


        const next =
          [
            ...current
          ];


        [
          next[
            index
          ],
          next[
            newIndex
          ]
        ] = [
          next[
            newIndex
          ],
          next[
            index
          ]
        ];


        return next;
      }
    );
  }


  /*
   * EDIT TEST
   */

  async function editTest(
    test:
      TestRow
  ) {

    if (!supabase) {

      return;
    }


    setMessage(
      'Loading test questions...'
    );


    const {
      data,
      error
    } =
      await supabase
        .from(
          'test_questions'
        )
        .select(
          'question_id, position'
        )
        .eq(
          'test_id',
          test.id
        )
        .order(
          'position',
          {
            ascending:
              true
          }
        );


    if (error) {

      setMessage(
        error.message
      );

      return;
    }


    const mappings =
      (
        data ||
        []
      ) as
        TestQuestionRow[];


    setEditingId(
      test.id
    );

    setTitle(
      test.title
    );

    setDescription(
      test.description ||
      ''
    );

    setPaper(
      test.paper ||
      'GS Paper I'
    );

    setTestType(
      test.test_type
    );

    setDurationMinutes(
      test.duration_minutes
    );

    setMarksPerQuestion(
      test.marks_per_question
    );

    setNegativeMarks(
      test.negative_marks
    );

    setInstructions(
      test.instructions ||
      ''
    );

    setPublished(
      test.published
    );

    setSelectedQuestionIds(
      mappings.map(
        mapping =>
          String(
            mapping.question_id
          )
      )
    );


    setMessage(
      `Editing: ${test.title}`
    );


    window.scrollTo({
      top:
        0,

      behavior:
        'smooth'
    });
  }


  /*
   * SAVE TEST
   */

  async function saveTest(
    event:
      FormEvent
  ) {

    event.preventDefault();


    if (!supabase) {

      setMessage(
        'Supabase is not configured.'
      );

      return;
    }


    if (
      !title.trim()
    ) {

      setMessage(
        'Test title is required.'
      );

      return;
    }


    if (
      selectedQuestionIds.length ===
      0
    ) {

      setMessage(
        'Select at least one question.'
      );

      return;
    }


    if (
      durationMinutes <=
      0
    ) {

      setMessage(
        'Duration must be greater than 0.'
      );

      return;
    }


    setSaving(
      true
    );

    setMessage(
      editingId
        ? 'Updating test...'
        : 'Creating test...'
    );


    const {
      data: {
        user
      }
    } =
      await supabase
        .auth
        .getUser();


    if (!user) {

      setSaving(
        false
      );

      setMessage(
        'Admin session expired.'
      );

      return;
    }


    const payload = {

      title:
        title.trim(),

      description:
        description.trim() ||
        null,

      published,

      duration_minutes:
        Math.round(
          durationMinutes
        ),

      exam_stage:
        'prelims',

      paper,

      test_type:
        testType,

      marks_per_question:
        marksPerQuestion,

      negative_marks:
        negativeMarks,

      instructions:
        instructions.trim() ||
        null,

      updated_at:
        new Date()
          .toISOString()
    };


    let testId =
      editingId;


    /*
     * UPDATE EXISTING TEST
     */

    if (
      editingId
    ) {

      const {
        error
      } =
        await supabase
          .from(
            'tests'
          )
          .update(
            payload
          )
          .eq(
            'id',
            editingId
          );


      if (error) {

        setSaving(
          false
        );

        setMessage(
          error.message
        );

        return;
      }

    } else {

      /*
       * CREATE NEW TEST
       */

      const {
        data,
        error
      } =
        await supabase
          .from(
            'tests'
          )
          .insert({
            ...payload,

            created_by:
              user.id
          })
          .select(
            'id'
          )
          .single();


      if (
        error ||
        !data
      ) {

        setSaving(
          false
        );

        setMessage(
          error?.message ||
          'Unable to create test.'
        );

        return;
      }


      testId =
        String(
          data.id
        );
    }


    if (!testId) {

      setSaving(
        false
      );

      setMessage(
        'Unable to identify saved test.'
      );

      return;
    }


    /*
     * REPLACE QUESTION MAPPING
     */

    const {
      error:
        deleteError
    } =
      await supabase
        .from(
          'test_questions'
        )
        .delete()
        .eq(
          'test_id',
          testId
        );


    if (deleteError) {

      setSaving(
        false
      );

      setMessage(
        deleteError.message
      );

      return;
    }


    const mappings =
      selectedQuestionIds.map(
        (
          questionId,
          index
        ) => ({

          test_id:
            testId,

          question_id:
            questionId,

          position:
            index +
            1
        })
      );


    const {
      error:
        insertError
    } =
      await supabase
        .from(
          'test_questions'
        )
        .insert(
          mappings
        );


    if (insertError) {

      setSaving(
        false
      );

      setMessage(
        insertError.message
      );

      return;
    }


    const successMessage =
      editingId
        ? 'Test updated successfully.'
        : 'Test created successfully.';


    resetForm();


    setSaving(
      false
    );


    setMessage(
      successMessage
    );


    await loadTests();
  }


  /*
   * PUBLISH / UNPUBLISH
   */

  async function togglePublished(
    test:
      TestRow
  ) {

    if (!supabase) {

      return;
    }


    const {
      error
    } =
      await supabase
        .from(
          'tests'
        )
        .update({

          published:
            !test.published,

          updated_at:
            new Date()
              .toISOString()
        })
        .eq(
          'id',
          test.id
        );


    if (error) {

      setMessage(
        error.message
      );

      return;
    }


    setMessage(
      test.published
        ? 'Test unpublished.'
        : 'Test published.'
    );


    await loadTests();
  }


  return (

    <div>

      {/* HEADER */}

      <section
        className="panel"
      >

        <span
          className="eyebrow"
        >
          PRELIMS TEST SERIES
        </span>


        <h2>
          Test Manager
        </h2>


        <p>
          Create sectional tests,
          full-length mocks,
          PYQ tests and custom
          Prelims tests.
        </p>


        <div
          style={{
            display:
              'flex',

            gap:
              '10px',

            flexWrap:
              'wrap'
          }}
        >

          <button
            type="button"
            className="secondary-btn"

            onClick={() =>
              void loadAll()
            }
          >
            Refresh
          </button>


          {editingId && (

            <button
              type="button"
              className="secondary-btn"

              onClick={
                resetForm
              }
            >
              New Test
            </button>

          )}

        </div>


        {message && (

          <div
            className="callout"
            style={{
              marginTop:
                '14px'
            }}
          >
            {message}
          </div>

        )}

      </section>


      {/* CREATE / EDIT TEST */}

      <form
        className="panel admin-form"

        onSubmit={
          saveTest
        }

        style={{
          marginTop:
            '18px'
        }}
      >

        <span
          className="eyebrow"
        >

          {
            editingId
              ? 'EDIT TEST'
              : 'NEW TEST'
          }

        </span>


        <h3>
          {
            editingId
              ? 'Update Prelims Test'
              : 'Create Prelims Test'
          }
        </h3>


        <label>
          Test Title

          <input
            value={
              title
            }

            onChange={
              event =>
                setTitle(
                  event.target.value
                )
            }

            placeholder="Example: Polity Sectional Test 01"
          />
        </label>


        <label>
          Description

          <textarea
            rows={
              3
            }

            value={
              description
            }

            onChange={
              event =>
                setDescription(
                  event.target.value
                )
            }

            placeholder="Short description for students"
          />
        </label>


        <div
          className="form-two"
        >

          <label>
            Paper

            <select
              value={
                paper
              }

              onChange={
                event =>
                  changePaper(
                    event.target.value
                  )
              }
            >

              <option value="GS Paper I">
                GS Paper I
              </option>

              <option value="CSAT Paper II">
                CSAT Paper II
              </option>

            </select>
          </label>


          <label>
            Test Type

            <select
              value={
                testType
              }

              onChange={
                event =>
                  setTestType(
                    event.target
                      .value as
                      TestType
                  )
              }
            >

              <option value="sectional">
                Sectional Test
              </option>

              <option value="full_length">
                Full-Length Mock
              </option>

              <option value="pyq">
                PYQ Test
              </option>

              <option value="custom">
                Custom Test
              </option>

            </select>
          </label>

        </div>


        <div
          className="form-two"
        >

          <label>
            Duration Minutes

            <input
              type="number"
              min="1"

              value={
                durationMinutes
              }

              onChange={
                event =>
                  setDurationMinutes(
                    safeNumber(
                      event.target
                        .value,
                      0
                    )
                  )
              }
            />
          </label>


          <label>
            Marks Per Question

            <input
              type="number"
              min="0.01"
              step="0.0001"

              value={
                marksPerQuestion
              }

              onChange={
                event =>
                  setMarksPerQuestion(
                    safeNumber(
                      event.target
                        .value,
                      0
                    )
                  )
              }
            />
          </label>

        </div>


        <label>
          Negative Marks Per Wrong Answer

          <input
            type="number"
            min="0"
            step="0.0001"

            value={
              negativeMarks
            }

            onChange={
              event =>
                setNegativeMarks(
                  safeNumber(
                    event.target
                      .value,
                    0
                  )
                )
            }
          />
        </label>


        <label>
          Instructions

          <textarea
            rows={
              4
            }

            value={
              instructions
            }

            onChange={
              event =>
                setInstructions(
                  event.target.value
                )
            }

            placeholder="Instructions shown before the test"
          />
        </label>


        <label
          style={{
            display:
              'flex',

            alignItems:
              'center',

            gap:
              '10px'
          }}
        >

          <input
            type="checkbox"

            checked={
              published
            }

            onChange={
              event =>
                setPublished(
                  event.target
                    .checked
                )
            }

            style={{
              width:
                'auto'
            }}
          />

          Publish for students
        </label>


        <div
          className="callout"
        >

          Questions:{' '}
          <strong>
            {
              selectedQuestionIds
                .length
            }
          </strong>

          {' • '}

          Maximum Marks:{' '}

          <strong>
            {totalMarks}
          </strong>

          {' • '}

          Duration:{' '}

          <strong>
            {durationMinutes} min
          </strong>

        </div>


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
              ? 'Update Test'
              : 'Create Test'
          }

        </button>

      </form>


      {/* SELECTED QUESTIONS */}

      <section
        className="panel"
        style={{
          marginTop:
            '18px'
        }}
      >

        <div
          className="panel-head"
        >

          <div>

            <span
              className="eyebrow"
            >
              TEST ORDER
            </span>


            <h3>
              Selected Questions
            </h3>

          </div>


          <span
            className="pill"
          >
            {
              selectedQuestionIds
                .length
            }
          </span>

        </div>


        {
          selectedQuestionIds
            .length ===
            0
            ? (

              <p>
                Select questions from
                the Question Bank below.
              </p>

            )
            : (

              <div
                style={{
                  display:
                    'grid',

                  gap:
                    '10px'
                }}
              >

                {
                  selectedQuestionIds.map(
                    (
                      questionId,
                      index
                    ) => {

                      const question =
                        questionMap.get(
                          questionId
                        );


                      return (

                        <article
                          key={
                            questionId
                          }

                          style={{
                            padding:
                              '14px',

                            border:
                              '1px solid rgba(255,255,255,.08)',

                            borderRadius:
                              '14px',

                            background:
                              '#0e1525'
                          }}
                        >

                          <span
                            className="tag"
                          >
                            Q{index + 1}
                          </span>


                          <h4>
                            {
                              question
                                ?.question ||
                              'Question'
                            }
                          </h4>


                          <div
                            style={{
                              display:
                                'flex',

                              gap:
                                '8px',

                              flexWrap:
                                'wrap'
                            }}
                          >

                            <button
                              type="button"
                              className="secondary-btn"

                              disabled={
                                index ===
                                0
                              }

                              onClick={() =>
                                moveQuestion(
                                  index,
                                  -1
                                )
                              }
                            >
                              ↑
                            </button>


                            <button
                              type="button"
                              className="secondary-btn"

                              disabled={
                                index ===
                                selectedQuestionIds
                                  .length -
                                1
                              }

                              onClick={() =>
                                moveQuestion(
                                  index,
                                  1
                                )
                              }
                            >
                              ↓
                            </button>


                            <button
                              type="button"
                              className="secondary-btn"

                              onClick={() =>
                                toggleQuestion(
                                  questionId
                                )
                              }
                            >
                              Remove
                            </button>

                          </div>

                        </article>

                      );
                    }
                  )
                }

              </div>

            )
        }

      </section>


      {/* QUESTION BANK */}

      <section
        className="panel"
        style={{
          marginTop:
            '18px'
        }}
      >

        <span
          className="eyebrow"
        >
          QUESTION BANK
        </span>


        <h3>
          Add Questions
        </h3>


        <label>
          Search

          <input
            type="search"

            value={
              search
            }

            onChange={
              event =>
                setSearch(
                  event.target.value
                )
            }

            placeholder="Search question, topic, source or year"
          />
        </label>


        <div
          className="form-two"
          style={{
            marginTop:
              '12px'
          }}
        >

          <label>
            Subject

            <select
              value={
                subjectFilter
              }

              onChange={
                event =>
                  setSubjectFilter(
                    event.target.value
                  )
              }
            >

              <option value="all">
                All Subjects
              </option>


              {
                subjectOptions.map(
                  subject => (

                    <option
                      key={
                        subject
                      }

                      value={
                        subject
                      }
                    >
                      {subject}
                    </option>

                  )
                )
              }

            </select>
          </label>


          <label>
            Difficulty

            <select
              value={
                difficultyFilter
              }

              onChange={
                event =>
                  setDifficultyFilter(
                    event.target.value
                  )
              }
            >

              <option value="all">
                All
              </option>

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


        <div
          style={{
            display:
              'grid',

            gap:
              '10px',

            marginTop:
              '16px'
          }}
        >

          {
            visibleQuestions.map(
              question => {

                const selected =
                  selectedQuestionSet
                    .has(
                      question.id
                    );


                return (

                  <article
                    key={
                      question.id
                    }

                    style={{
                      padding:
                        '14px',

                      border:
                        selected
                          ? '1px solid rgba(20,184,166,.55)'
                          : '1px solid rgba(255,255,255,.08)',

                      borderRadius:
                        '14px',

                      background:
                        selected
                          ? 'rgba(20,184,166,.06)'
                          : '#0e1525'
                    }}
                  >

                    <span
                      className="tag"
                    >
                      {
                        question.subject
                      }
                    </span>


                    <span
                      className="tag"
                      style={{
                        marginLeft:
                          '6px'
                      }}
                    >
                      {
                        question.difficulty
                      }
                    </span>


                    <h4>
                      {
                        question.question
                      }
                    </h4>


                    <small
                      style={{
                        color:
                          '#94a3b8'
                      }}
                    >

                      {
                        sourceLabel(
                          question
                        )
                      }

                      {
                        question.topic
                          ? ` • ${question.topic}`
                          : ''
                      }

                    </small>


                    <div
                      style={{
                        marginTop:
                          '10px'
                      }}
                    >

                      <button
                        type="button"

                        className={
                          selected
                            ? 'secondary-btn'
                            : 'primary-btn'
                        }

                        onClick={() =>
                          toggleQuestion(
                            question.id
                          )
                        }
                      >

                        {
                          selected
                            ? 'Remove'
                            : 'Add to Test'
                        }

                      </button>

                    </div>

                  </article>

                );
              }
            )
          }

        </div>

      </section>


      {/* EXISTING TESTS */}

      <section
        className="panel"
        style={{
          marginTop:
            '18px'
        }}
      >

        <div
          className="panel-head"
        >

          <div>

            <span
              className="eyebrow"
            >
              TEST LIBRARY
            </span>


            <h3>
              Existing Tests
            </h3>

          </div>


          <span
            className="pill"
          >
            {tests.length}
          </span>

        </div>


        {
          loading
            ? (

              <p>
                Loading...
              </p>

            )
            : tests.length ===
              0
            ? (

              <p>
                No tests created yet.
              </p>

            )
            : (

              <div
                style={{
                  display:
                    'grid',

                  gap:
                    '12px'
                }}
              >

                {
                  tests.map(
                    test => (

                      <article
                        key={
                          test.id
                        }

                        style={{
                          padding:
                            '14px',

                          border:
                            '1px solid rgba(255,255,255,.08)',

                          borderRadius:
                            '14px',

                          background:
                            '#0e1525'
                        }}
                      >

                        <div
                          style={{
                            display:
                              'flex',

                            gap:
                              '6px',

                            flexWrap:
                              'wrap'
                          }}
                        >

                          <span
                            className="tag"
                          >
                            {
                              test.published
                                ? 'Published'
                                : 'Draft'
                            }
                          </span>


                          <span
                            className="tag"
                          >
                            {
                              testTypeLabel(
                                test.test_type
                              )
                            }
                          </span>


                          <span
                            className="tag"
                          >
                            {
                              test.paper ||
                              'GS Paper I'
                            }
                          </span>

                        </div>


                        <h3>
                          {test.title}
                        </h3>


                        {
                          test.description && (

                            <p>
                              {
                                test.description
                              }
                            </p>

                          )
                        }


                        <small
                          style={{
                            color:
                              '#94a3b8'
                          }}
                        >
                          {
                            test.duration_minutes
                          } min
                          {' • '}
                          {
                            test.marks_per_question
                          } marks/question
                          {' • '}
                          -{
                            test.negative_marks
                          } wrong answer
                        </small>


                        <div
                          style={{
                            display:
                              'flex',

                            gap:
                              '8px',

                            flexWrap:
                              'wrap',

                            marginTop:
                              '12px'
                          }}
                        >

                          <button
                            type="button"
                            className="secondary-btn"

                            onClick={() =>
                              void editTest(
                                test
                              )
                            }
                          >
                            Edit
                          </button>


                          <button
                            type="button"

                            className={
                              test.published
                                ? 'secondary-btn'
                                : 'primary-btn'
                            }

                            onClick={() =>
                              void togglePublished(
                                test
                              )
                            }
                          >

                            {
                              test.published
                                ? 'Unpublish'
                                : 'Publish'
                            }

                          </button>

                        </div>

                      </article>

                    )
                  )
                }

              </div>

            )
        }

      </section>

    </div>
  );
}

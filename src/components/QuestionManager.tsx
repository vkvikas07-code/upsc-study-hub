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


upsc_exam_name:
  string | null;

upsc_exam_cycle:
  string | null;

upsc_exam_stage:
  string | null;

upsc_exam_paper:
  string | null;

upsc_exam_year:
  number | null;


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
upsc_exam_name,
upsc_exam_cycle,
upsc_exam_stage,
upsc_exam_paper,
upsc_exam_year,
source,
  source_url,
  status,
  created_at,
  updated_at
`;

const UPSC_EXAMS = [
  'Civil Services Examination',
  'Indian Forest Service Examination',
  'NDA & Naval Academy',
  'Combined Defence Services',
  'CAPF (ACs)',
  'Engineering Services Examination',
  'Combined Geo-Scientist Examination',
  'Indian Economic Service',
  'Indian Statistical Service',
  'Combined Medical Services',
  'CISF AC(EXE) LDCE',
  'Other UPSC Examination'
];
export function QuestionManager() {
  const [
    questions,
    setQuestions
  ] =
    useState<QuestionRow[]>([]);


  const [
    loading,
    setLoading
  ] =
    useState(false);


  const [
    saving,
    setSaving
  ] =
    useState(false);


  const [
    editingId,
    setEditingId
  ] =
    useState<string | null>(null);


  const [
    message,
    setMessage
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
    examStage,
    setExamStage
  ] =
    useState<ExamStage>(
      'prelims'
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
  upscExamName,
  setUpscExamName
] =
  useState('');


const [
  customUpscExamName,
  setCustomUpscExamName
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


  const [
    status,
    setStatus
  ] =
    useState<QuestionStatus>(
      'draft'
    );


  /*
   * QUESTION BANK FILTERS
   */

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

      return;
    }


    setLoading(true);

    setMessage('');


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


      setLoading(false);

      return;
    }


    const rows =
      (data || []) as unknown as QuestionRow[];


    const formatted =
      rows.map(
        (
          item:
            QuestionRow
        ) => ({
          ...item,

          options:
            Array.isArray(
              item.options
            )
              ? item.options
              : [],

          tags:
            Array.isArray(
              item.tags
            )
              ? item.tags
              : []
        })
      );


    setQuestions(
      formatted
    );


    setLoading(false);
  }


  useEffect(
    () => {
      loadQuestions();
    },
    []
  );


  function resetForm() {
    setEditingId(null);

    setQuestion('');

    setOptionA('');
    setOptionB('');
    setOptionC('');
    setOptionD('');

    setCorrectIndex(0);

    setExplanation('');

    setSubject(
      'Polity'
    );

    setTopic('');

    setPaper(
      'GS-I'
    );

    setDifficulty(
      'medium'
    );

    setExamStage(
      'prelims'
    );

    setTagsText('');

    setIsPyq(false);

    setPyqYear('');


setUpscExamName('');

setCustomUpscExamName('');

setUpscExamCycle('');

setUpscExamStage('');

setUpscExamPaper('');

setUpscExamYear('');


setSource('');

    setSourceUrl('');

    setStatus(
      'draft'
    );
  }


  function startEdit(
    item:
      QuestionRow
  ) {
    setEditingId(
      item.id
    );


    setQuestion(
      item.question
    );


    setOptionA(
      item.options[0] ||
      ''
    );


    setOptionB(
      item.options[1] ||
      ''
    );


    setOptionC(
      item.options[2] ||
      ''
    );


    setOptionD(
      item.options[3] ||
      ''
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
      item.topic ||
      ''
    );


    setPaper(
      item.paper ||
      ''
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
    ? String(
        item.pyq_year
      )
    : ''
);


if (
  item.upsc_exam_name &&
  UPSC_EXAMS.includes(
    item.upsc_exam_name
  )
) {
  setUpscExamName(
    item.upsc_exam_name
  );

  setCustomUpscExamName('');
} else if (
  item.upsc_exam_name
) {
  setUpscExamName(
    'Other UPSC Examination'
  );

  setCustomUpscExamName(
    item.upsc_exam_name
  );
} else {
  setUpscExamName('');

  setCustomUpscExamName('');
}


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


setSource(
      item.source ||
      ''
    );


    setSourceUrl(
      item.source_url ||
      ''
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


    mainArea?.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }


  async function saveQuestion(
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


    if (
      !explanation.trim()
    ) {
      setMessage(
        'Add an explanation.'
      );

      return;
    }


    if (
      !subject.trim()
    ) {
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


if (
  upscExamName ===
    'Other UPSC Examination' &&
  !customUpscExamName.trim()
) {
  setMessage(
    'Enter the UPSC examination name.'
  );

  return;
}


if (
  upscExamName &&
  !upscExamYear.trim()
) {
  setMessage(
    'Enter the examination year.'
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
      data: {
        user
      }
    } =
      await supabase
        .auth
        .getUser();


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
          tag =>
            tag.trim()
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
    ? Number(
        pyqYear
      )
    : null,


upsc_exam_name:
  upscExamName ===
    'Other UPSC Examination'
    ? customUpscExamName
        .trim() ||
      null
    : upscExamName
        .trim() ||
      null,


upsc_exam_cycle:
  upscExamCycle
    .trim() ||
  null,


upsc_exam_stage:
  upscExamStage
    .trim() ||
  null,


upsc_exam_paper:
  upscExamPaper
    .trim() ||
  null,


upsc_exam_year:
  upscExamName &&
  upscExamYear.trim()
    ? Number(
        upscExamYear
      )
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
        data,
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


      const rawUpdated =
        data as unknown as QuestionRow;


      const updated:
        QuestionRow = {
        ...rawUpdated,

        options:
          Array.isArray(
            rawUpdated.options
          )
            ? rawUpdated.options
            : [],

        tags:
          Array.isArray(
            rawUpdated.tags
          )
            ? rawUpdated.tags
            : []
      };


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


    const {
      data,
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


    const rawCreated =
      data as unknown as QuestionRow;


    const created:
      QuestionRow = {
      ...rawCreated,

      options:
        Array.isArray(
          rawCreated.options
        )
          ? rawCreated.options
          : [],

      tags:
        Array.isArray(
          rawCreated.tags
        )
          ? rawCreated.tags
          : []
    };


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
    item:
      QuestionRow,

    nextStatus:
      QuestionStatus
  ) {
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
        .update({
          status:
            nextStatus,

          updated_at:
            new Date()
              .toISOString()
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


    const rawUpdated =
      data as unknown as QuestionRow;


    const updated:
      QuestionRow = {
      ...rawUpdated,

      options:
        Array.isArray(
          rawUpdated.options
        )
          ? rawUpdated.options
          : [],

      tags:
        Array.isArray(
          rawUpdated.tags
        )
          ? rawUpdated.tags
          : []
    };


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
    item:
      QuestionRow
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


    const {
      error
    } =
      await supabase
        .from(
          'questions'
        )
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


  const subjects =
    useMemo(
      () =>
        Array.from(
          new Set(
            questions
              .map(
                item =>
                  item.subject
              )
              .filter(Boolean)
          )
        )
          .sort(),
      [
        questions
      ]
    );


  const filteredQuestions =
    useMemo(
      () =>
        questions.filter(
          (
            item:
              QuestionRow
          ) => {
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
        ),
      [
        questions,
        searchText,
        bankSubject,
        bankStatus,
        bankDifficulty,
        bankType
      ]
    );


  function clearFilters() {
    setSearchText('');

    setBankSubject(
      'all'
    );

    setBankStatus(
      'all'
    );

    setBankDifficulty(
      'all'
    );

    setBankType(
      'all'
    );
  }


  return (
    <section
      style={{
        marginTop:
          '30px'
      }}
    >

      {/* CREATE / EDIT MCQ */}

      <div
        className="panel admin-form"
      >

        <span className="eyebrow">
          MCQ QUESTION MANAGER
        </span>


        <h2>
          {
            editingId
              ? 'Edit MCQ'
              : 'Create MCQ'
          }
        </h2>


        <form
          onSubmit={
            saveQuestion
          }
        >

          <label>
            Question

            <textarea
              value={
                question
              }
              onChange={
                event =>
                  setQuestion(
                    event.target.value
                  )
              }
              rows={4}
              placeholder="Enter UPSC-style MCQ question"
            />

          </label>


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
            Explanation

            <textarea
              value={
                explanation
              }
              onChange={
                event =>
                  setExplanation(
                    event.target.value
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
              Difficulty

              <select
                value={
                  difficulty
                }
                onChange={
                  event =>
                    setDifficulty(
                      event.target
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
              Exam Stage

              <select
                value={
                  examStage
                }
                onChange={
                  event =>
                    setExamStage(
                      event.target
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
                value={
                  paper
                }
                onChange={
                  event =>
                    setPaper(
                      event.target.value
                    )
                }
                placeholder="GS-I / GS-II / GS-III"
              />

            </label>

          </div>


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
              placeholder="Fundamental Rights / Monsoon / Inflation..."
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
              placeholder="Constitution, Article 21, Prelims"
            />

            <small>
              Separate tags using commas.
            </small>

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
              placeholder="NCERT / Laxmikanth / PIB / UPSC"
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


          <div className="checkbox-row">

            <label>

              <input
                type="checkbox"
                checked={
                  isPyq
                }
                onChange={
                  event =>
                    setIsPyq(
                      event.target.checked
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

          )}


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
              display:
                'flex',

              gap:
                '10px',

              flexWrap:
                'wrap',

              marginTop:
                '16px'
            }}
          >

            <button
              className="primary-btn"
              type="submit"
              disabled={
                saving
              }
            >
              {
                saving
                  ? 'Saving...'
                  : editingId
                  ? 'Save changes'
                  : status ===
                    'published'
                  ? 'Publish question'
                  : 'Save draft'
              }
            </button>


            {editingId && (

              <button
                type="button"
                className="secondary-btn"
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


      {/* QUESTION BANK */}

      <div
        className="panel admin-form"
        style={{
          marginTop:
            '22px'
        }}
      >

        <div
          style={{
            display:
              'flex',

            justifyContent:
              'space-between',

            alignItems:
              'center',

            gap:
              '12px',

            flexWrap:
              'wrap'
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
            className="secondary-btn"
            onClick={
              loadQuestions
            }
          >
            Refresh questions
          </button>

        </div>


        {/* SEARCH */}

        <div
          style={{
            marginTop:
              '18px'
          }}
        >

          <label>
            Search Question Bank

            <input
              type="search"
              value={
                searchText
              }
              onChange={
                event =>
                  setSearchText(
                    event.target.value
                  )
              }
              placeholder="Search question, subject, topic or source..."
            />

          </label>

        </div>


        {/* FILTERS */}

        <div
          className="form-two"
          style={{
            marginTop:
              '10px'
          }}
        >

          <label>
            Subject

            <select
              value={
                bankSubject
              }
              onChange={
                event =>
                  setBankSubject(
                    event.target.value
                  )
              }
            >

              <option value="all">
                All Subjects
              </option>


              {subjects.map(
                item => (

                  <option
                    key={
                      item
                    }
                    value={
                      item
                    }
                  >
                    {item}
                  </option>

                )
              )}

            </select>

          </label>


          <label>
            Status

            <select
              value={
                bankStatus
              }
              onChange={
                event =>
                  setBankStatus(
                    event.target
                      .value as
                      'all' |
                      QuestionStatus
                  )
              }
            >

              <option value="all">
                All Status
              </option>

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

        </div>


        <div className="form-two">

          <label>
            Difficulty

            <select
              value={
                bankDifficulty
              }
              onChange={
                event =>
                  setBankDifficulty(
                    event.target
                      .value as
                      'all' |
                      Difficulty
                  )
              }
            >

              <option value="all">
                All Difficulty
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


          <label>
            Question Type

            <select
              value={
                bankType
              }
              onChange={
                event =>
                  setBankType(
                    event.target
                      .value as
                      'all' |
                      'practice' |
                      'pyq'
                  )
              }
            >

              <option value="all">
                All Questions
              </option>

              <option value="practice">
                Practice
              </option>

              <option value="pyq">
                Previous Year Questions
              </option>

            </select>

          </label>

        </div>


        <div
          style={{
            display:
              'flex',

            justifyContent:
              'space-between',

            alignItems:
              'center',

            gap:
              '12px',

            flexWrap:
              'wrap',

            marginTop:
              '10px'
          }}
        >

          <p>
            Showing{' '}
            <strong>
              {
                filteredQuestions.length
              }
            </strong>{' '}
            of{' '}
            <strong>
              {
                questions.length
              }
            </strong>{' '}
            questions
          </p>


          <button
            type="button"
            className="secondary-btn"
            onClick={
              clearFilters
            }
          >
            Clear Filters
          </button>

        </div>


        {loading && (

          <p>
            Loading questions...
          </p>

        )}


        {!loading &&
          questions.length ===
            0 && (

          <p>
            No MCQs created yet.
          </p>

        )}


        {!loading &&
          questions.length >
            0 &&
          filteredQuestions.length ===
            0 && (

          <div className="callout">

            <strong>
              No questions match these filters.
            </strong>


            <p>
              Clear the filters or try another search.
            </p>

          </div>

        )}


        <div
          style={{
            display:
              'grid',

            gap:
              '14px',

            marginTop:
              '18px'
          }}
        >

          {filteredQuestions.map(
            (
              item:
                QuestionRow
            ) => (

              <article
                key={
                  item.id
                }
                style={{
                  border:
                    '1px solid rgba(255,255,255,.10)',

                  borderRadius:
                    '14px',

                  padding:
                    '18px'
                }}
              >

                <div
                  style={{
                    display:
                      'flex',

                    justifyContent:
                      'space-between',

                    gap:
                      '18px',

                    flexWrap:
                      'wrap'
                  }}
                >

                  <div
                    style={{
                      flex:
                        '1 1 500px'
                    }}
                  >

                    <span className="eyebrow">
                      {
                        item.subject
                      }

                      {' • '}

                      {
                        item.difficulty
                      }
                    </span>


                    <h3>
                      {
                        item.question
                      }
                    </h3>


                    <div className="tag-row">

                      <span className="tag">
                        {
                          item.status
                        }
                      </span>


                      <span className="tag">
                        {
                          item.exam_stage
                        }
                      </span>


                      {item.topic && (

                        <span className="tag">
                          {
                            item.topic
                          }
                        </span>

                      )}


                      {item.is_pyq && (

                        <span className="tag">
                          PYQ{' '}
                          {
                            item.pyq_year ||
                            ''
                          }
                        </span>

                      )}

                    </div>


                    <p>
                      Correct answer:{' '}

                      <strong>
                        {
                          String.fromCharCode(
                            65 +
                            item.correct_index
                          )
                        }
                      </strong>
                    </p>


                    {item.source && (

                      <p>
                        Source:{' '}
                        {
                          item.source
                        }
                      </p>

                    )}

                  </div>


                  <div
                    style={{
                      display:
                        'flex',

                      gap:
                        '8px',

                      flexWrap:
                        'wrap',

                      alignItems:
                        'flex-start'
                    }}
                  >

                    <button
                      type="button"
                      className="secondary-btn"
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
                        className="secondary-btn"
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
                        className="secondary-btn"
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
                        className="secondary-btn"
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
                      className="secondary-btn"
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

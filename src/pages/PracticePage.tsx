import {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  TopBar
} from '../components/TopBar';

import {
  supabase
} from '../lib/supabase';


type QuestionOrigin =
  | 'cse'
  | 'upsc'
  | 'state';


type SessionSize =
  | '10'
  | '20'
  | '50'
  | '100'
  | 'all';


type Difficulty =
  | 'easy'
  | 'medium'
  | 'hard';


type LiveQuestion = {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;

  subject: string;
  difficulty: Difficulty;
  topic: string | null;
  tags: string[];

  is_pyq: boolean;
  pyq_year: number | null;

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

  source: string | null;
  source_url: string | null;
};


type AnswerRecord = {
  question_id: string;
  selected_index: number;
  correct_index: number;
  is_correct: boolean;
};


const QUESTION_SELECT = `
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
  state_psc_paper,
  source,
  source_url
`;


/*
 * QUESTION ORIGIN
 */

function getQuestionOrigin(
  item: LiveQuestion
): QuestionOrigin {

  if (
    item.state_psc_state
  ) {
    return 'state';
  }

  if (
    item.upsc_exam_name
  ) {
    return 'upsc';
  }

  return 'cse';
}


/*
 * RANDOMIZE
 */

function shuffleQuestions(
  items: LiveQuestion[]
) {

  const shuffled = [
    ...items
  ];

  for (
    let i =
      shuffled.length - 1;
    i > 0;
    i--
  ) {

    const j =
      Math.floor(
        Math.random() *
        (i + 1)
      );

    const temp =
      shuffled[i];

    shuffled[i] =
      shuffled[j];

    shuffled[j] =
      temp;
  }

  return shuffled;
}


export function PracticePage() {

  /*
   * DATABASE
   */

  const [
    allQuestions,
    setAllQuestions
  ] =
    useState<LiveQuestion[]>([]);


  /*
   * ACTIVE SESSION
   */

  const [
    questions,
    setQuestions
  ] =
    useState<LiveQuestion[]>([]);


  const [
    practiceStarted,
    setPracticeStarted
  ] =
    useState(false);


  /*
   * QUIZ
   */

  const [
    index,
    setIndex
  ] =
    useState(0);


  const [
    selected,
    setSelected
  ] =
    useState<number | null>(
      null
    );


  const [
    score,
    setScore
  ] =
    useState(0);


  const [
    answers,
    setAnswers
  ] =
    useState<AnswerRecord[]>([]);


  const [
    finished,
    setFinished
  ] =
    useState(false);


  /*
   * PAGE STATE
   */

  const [
    loading,
    setLoading
  ] =
    useState(true);


  const [
    error,
    setError
  ] =
    useState('');


  const [
    setupMessage,
    setSetupMessage
  ] =
    useState('');


  const [
    savingResult,
    setSavingResult
  ] =
    useState(false);


  const [
    resultMessage,
    setResultMessage
  ] =
    useState('');


  const [
    attemptSaved,
    setAttemptSaved
  ] =
    useState(false);


  /*
   * MAIN FILTERS
   */

  const [
    originFilter,
    setOriginFilter
  ] =
    useState<
      'all' |
      QuestionOrigin
    >('all');


  /*
   * NEW KEYWORD SEARCH
   */

  const [
    searchText,
    setSearchText
  ] =
    useState('');


  const [
    subjectFilter,
    setSubjectFilter
  ] =
    useState('all');


  /*
   * NEW TOPIC FILTER
   */

  const [
    topicFilter,
    setTopicFilter
  ] =
    useState('all');


  const [
    difficultyFilter,
    setDifficultyFilter
  ] =
    useState<
      'all' |
      Difficulty
    >('all');


  const [
    typeFilter,
    setTypeFilter
  ] =
    useState<
      'all' |
      'practice' |
      'pyq'
    >('all');


  /*
   * CSE PYQ YEAR
   */

  const [
    csePyqYearFilter,
    setCsePyqYearFilter
  ] =
    useState('all');


  /*
   * SESSION SIZE
   */

  const [
    sessionSize,
    setSessionSize
  ] =
    useState<SessionSize>(
      '10'
    );


  /*
   * OTHER UPSC
   */

  const [
    upscExamFilter,
    setUpscExamFilter
  ] =
    useState('all');


  const [
    upscCycleFilter,
    setUpscCycleFilter
  ] =
    useState('all');


  const [
    upscYearFilter,
    setUpscYearFilter
  ] =
    useState('all');


  /*
   * STATE PSC
   */

  const [
    stateFilter,
    setStateFilter
  ] =
    useState('all');


  const [
    stateExamFilter,
    setStateExamFilter
  ] =
    useState('all');


  const [
    stateYearFilter,
    setStateYearFilter
  ] =
    useState('all');


  /*
   * LOAD QUESTIONS
   */

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

    setSetupMessage('');


    const {
      data,
      error: loadError
    } =
      await supabase
        .from(
          'questions'
        )
        .select(
          QUESTION_SELECT
        )
        .eq(
          'status',
          'published'
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


    const formatted:
      LiveQuestion[] =
        (
          data || []
        ).map(
          item => ({

            id:
              item.id,

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
              item.difficulty as
                Difficulty,

            topic:
              item.topic,

            tags:
              Array.isArray(
                item.tags
              )
                ? item.tags.map(
                    tag =>
                      String(tag)
                  )
                : [],

            is_pyq:
              item.is_pyq,

            pyq_year:
              item.pyq_year,

            upsc_exam_name:
              item.upsc_exam_name,

            upsc_exam_cycle:
              item.upsc_exam_cycle,

            upsc_exam_stage:
              item.upsc_exam_stage,

            upsc_exam_paper:
              item.upsc_exam_paper,

            upsc_exam_year:
              item.upsc_exam_year,

            state_psc_state:
              item.state_psc_state,

            state_psc_name:
              item.state_psc_name,

            state_psc_exam_name:
              item.state_psc_exam_name,

            state_psc_year:
              item.state_psc_year,

            state_psc_stage:
              item.state_psc_stage,

            state_psc_paper:
              item.state_psc_paper,

            source:
              item.source,

            source_url:
              item.source_url

          })
        );


    setAllQuestions(
      formatted
    );

    setQuestions([]);

    setPracticeStarted(
      false
    );

    setIndex(0);

    setSelected(null);

    setScore(0);

    setAnswers([]);

    setFinished(false);

    setAttemptSaved(false);

    setResultMessage('');

    setLoading(false);
  }


  useEffect(
    () => {

      loadQuestions();

    },
    []
  );


  /*
   * SUBJECTS
   */

  const subjects =
    useMemo(
      () =>
        Array.from(
          new Set(
            allQuestions
              .map(
                item =>
                  item.subject
              )
              .filter(
                Boolean
              )
          )
        ).sort(),
      [
        allQuestions
      ]
    );


  /*
   * TOPICS
   *
   * Topic list changes according
   * to selected subject.
   */

  const topics =
    useMemo(
      () =>
        Array.from(
          new Set(
            allQuestions
              .filter(
                item =>
                  subjectFilter ===
                    'all' ||
                  item.subject ===
                    subjectFilter
              )
              .map(
                item =>
                  item.topic
              )
              .filter(
                (
                  value
                ):
                  value is string =>
                    Boolean(value)
              )
          )
        ).sort(),
      [
        allQuestions,
        subjectFilter
      ]
    );


  /*
   * CSE PYQ YEARS
   */

  const csePyqYears =
    useMemo(
      () =>
        Array.from(
          new Set(
            allQuestions
              .filter(
                item =>
                  getQuestionOrigin(
                    item
                  ) ===
                    'cse' &&
                  item.is_pyq &&
                  (
                    subjectFilter ===
                      'all' ||
                    item.subject ===
                      subjectFilter
                  ) &&
                  (
                    topicFilter ===
                      'all' ||
                    item.topic ===
                      topicFilter
                  )
              )
              .map(
                item =>
                  item.pyq_year
              )
              .filter(
                (
                  value
                ):
                  value is number =>
                    value !==
                    null
              )
          )
        ).sort(
          (
            a,
            b
          ) =>
            b - a
        ),
      [
        allQuestions,
        subjectFilter,
        topicFilter
      ]
    );


  /*
   * UPSC EXAMS
   */

  const upscExams =
    useMemo(
      () =>
        Array.from(
          new Set(
            allQuestions
              .map(
                item =>
                  item.upsc_exam_name
              )
              .filter(
                (
                  value
                ):
                  value is string =>
                    Boolean(value)
              )
          )
        ).sort(),
      [
        allQuestions
      ]
    );


  const upscCycles =
    useMemo(
      () =>
        Array.from(
          new Set(
            allQuestions
              .filter(
                item =>
                  upscExamFilter ===
                    'all' ||
                  item.upsc_exam_name ===
                    upscExamFilter
              )
              .map(
                item =>
                  item.upsc_exam_cycle
              )
              .filter(
                (
                  value
                ):
                  value is string =>
                    Boolean(value)
              )
          )
        ).sort(),
      [
        allQuestions,
        upscExamFilter
      ]
    );


  const upscYears =
    useMemo(
      () =>
        Array.from(
          new Set(
            allQuestions
              .filter(
                item =>
                  upscExamFilter ===
                    'all' ||
                  item.upsc_exam_name ===
                    upscExamFilter
              )
              .map(
                item =>
                  item.upsc_exam_year
              )
              .filter(
                (
                  value
                ):
                  value is number =>
                    value !==
                    null
              )
          )
        ).sort(
          (
            a,
            b
          ) =>
            b - a
        ),
      [
        allQuestions,
        upscExamFilter
      ]
    );


  /*
   * STATES
   */

  const states =
    useMemo(
      () =>
        Array.from(
          new Set(
            allQuestions
              .map(
                item =>
                  item.state_psc_state
              )
              .filter(
                (
                  value
                ):
                  value is string =>
                    Boolean(value)
              )
          )
        ).sort(),
      [
        allQuestions
      ]
    );


  /*
   * STATE EXAMS
   */

  const stateExams =
    useMemo(
      () =>
        Array.from(
          new Set(
            allQuestions
              .filter(
                item =>
                  stateFilter ===
                    'all' ||
                  item.state_psc_state ===
                    stateFilter
              )
              .map(
                item =>
                  item.state_psc_exam_name
              )
              .filter(
                (
                  value
                ):
                  value is string =>
                    Boolean(value)
              )
          )
        ).sort(),
      [
        allQuestions,
        stateFilter
      ]
    );


  /*
   * STATE YEARS
   */

  const stateYears =
    useMemo(
      () =>
        Array.from(
          new Set(
            allQuestions
              .filter(
                item =>
                  (
                    stateFilter ===
                      'all' ||
                    item.state_psc_state ===
                      stateFilter
                  ) &&
                  (
                    stateExamFilter ===
                      'all' ||
                    item.state_psc_exam_name ===
                      stateExamFilter
                  )
              )
              .map(
                item =>
                  item.state_psc_year
              )
              .filter(
                (
                  value
                ):
                  value is number =>
                    value !==
                    null
              )
          )
        ).sort(
          (
            a,
            b
          ) =>
            b - a
        ),
      [
        allQuestions,
        stateFilter,
        stateExamFilter
      ]
    );


  /*
   * FILTER QUESTIONS
   */

  const filteredQuestions =
    useMemo(
      () =>
        allQuestions.filter(
          item => {

            const origin =
              getQuestionOrigin(
                item
              );


            /*
             * KEYWORD SEARCH
             */

            const search =
              searchText
                .trim()
                .toLowerCase();


            const searchableText =
              [
                item.question,
                item.subject,
                item.topic || '',
                item.tags.join(' '),
                item.source || '',
                item.upsc_exam_name || '',
                item.upsc_exam_cycle || '',
                item.upsc_exam_stage || '',
                item.upsc_exam_paper || '',
                item.upsc_exam_year
                  ? String(
                      item.upsc_exam_year
                    )
                  : '',
                item.state_psc_state || '',
                item.state_psc_name || '',
                item.state_psc_exam_name || '',
                item.state_psc_stage || '',
                item.state_psc_paper || '',
                item.state_psc_year
                  ? String(
                      item.state_psc_year
                    )
                  : '',
                item.pyq_year
                  ? String(
                      item.pyq_year
                    )
                  : ''
              ]
                .join(' ')
                .toLowerCase();


            const matchesSearch =
              !search ||
              searchableText.includes(
                search
              );


            const matchesOrigin =
              originFilter ===
                'all' ||
              origin ===
                originFilter;


            const matchesSubject =
              subjectFilter ===
                'all' ||
              item.subject ===
                subjectFilter;


            const matchesTopic =
              topicFilter ===
                'all' ||
              item.topic ===
                topicFilter;


            const matchesDifficulty =
              difficultyFilter ===
                'all' ||
              item.difficulty ===
                difficultyFilter;


            const matchesType =
              typeFilter ===
                'all' ||

              (
                typeFilter ===
                  'pyq' &&
                item.is_pyq
              ) ||

              (
                typeFilter ===
                  'practice' &&
                !item.is_pyq
              );


            /*
             * CSE PYQ YEAR
             */

            const matchesCsePyqYear =
              csePyqYearFilter ===
                'all' ||

              (
                origin ===
                  'cse' &&
                item.is_pyq &&
                String(
                  item.pyq_year ||
                  ''
                ) ===
                  csePyqYearFilter
              );


            /*
             * OTHER UPSC
             */

            const matchesUpscExam =
              upscExamFilter ===
                'all' ||
              item.upsc_exam_name ===
                upscExamFilter;


            const matchesUpscCycle =
              upscCycleFilter ===
                'all' ||
              item.upsc_exam_cycle ===
                upscCycleFilter;


            const matchesUpscYear =
              upscYearFilter ===
                'all' ||
              String(
                item.upsc_exam_year ||
                ''
              ) ===
                upscYearFilter;


            /*
             * STATE PSC
             */

            const matchesState =
              stateFilter ===
                'all' ||
              item.state_psc_state ===
                stateFilter;


            const matchesStateExam =
              stateExamFilter ===
                'all' ||
              item.state_psc_exam_name ===
                stateExamFilter;


            const matchesStateYear =
              stateYearFilter ===
                'all' ||
              String(
                item.state_psc_year ||
                ''
              ) ===
                stateYearFilter;


            return (
              matchesSearch &&
              matchesOrigin &&
              matchesSubject &&
              matchesTopic &&
              matchesDifficulty &&
              matchesType &&
              matchesCsePyqYear &&
              matchesUpscExam &&
              matchesUpscCycle &&
              matchesUpscYear &&
              matchesState &&
              matchesStateExam &&
              matchesStateYear
            );
          }
        ),
      [
        allQuestions,
        searchText,
        originFilter,
        subjectFilter,
        topicFilter,
        difficultyFilter,
        typeFilter,
        csePyqYearFilter,
        upscExamFilter,
        upscCycleFilter,
        upscYearFilter,
        stateFilter,
        stateExamFilter,
        stateYearFilter
      ]
    );


  /*
   * SESSION COUNT
   */

  const sessionQuestionCount =
    sessionSize ===
      'all'
      ? filteredQuestions.length
      : Math.min(
          Number(
            sessionSize
          ),
          filteredQuestions.length
        );


  /*
   * CHANGE ORIGIN
   */

  function changeOriginFilter(
    value:
      'all' |
      QuestionOrigin
  ) {

    setOriginFilter(
      value
    );


    if (
      value !==
      'cse'
    ) {

      setCsePyqYearFilter(
        'all'
      );
    }


    if (
      value !==
      'upsc'
    ) {

      setUpscExamFilter(
        'all'
      );

      setUpscCycleFilter(
        'all'
      );

      setUpscYearFilter(
        'all'
      );
    }


    if (
      value !==
      'state'
    ) {

      setStateFilter(
        'all'
      );

      setStateExamFilter(
        'all'
      );

      setStateYearFilter(
        'all'
      );
    }
  }


  /*
   * CHANGE TYPE
   */

  function changeTypeFilter(
    value:
      'all' |
      'practice' |
      'pyq'
  ) {

    setTypeFilter(
      value
    );


    if (
      value !==
      'pyq'
    ) {

      setCsePyqYearFilter(
        'all'
      );
    }
  }


  /*
   * RESET FILTERS
   */

  function resetFilters() {

    setOriginFilter(
      'all'
    );

    setSearchText('');

    setSubjectFilter(
      'all'
    );

    setTopicFilter(
      'all'
    );

    setDifficultyFilter(
      'all'
    );

    setTypeFilter(
      'all'
    );

    setCsePyqYearFilter(
      'all'
    );

    setSessionSize(
      '10'
    );

    setUpscExamFilter(
      'all'
    );

    setUpscCycleFilter(
      'all'
    );

    setUpscYearFilter(
      'all'
    );

    setStateFilter(
      'all'
    );

    setStateExamFilter(
      'all'
    );

    setStateYearFilter(
      'all'
    );

    setSetupMessage('');
  }


  /*
   * START PRACTICE
   */

  function startPractice() {

    if (
      filteredQuestions.length ===
      0
    ) {

      setSetupMessage(
        'No published questions match these filters.'
      );

      return;
    }


    const randomized =
      shuffleQuestions(
        filteredQuestions
      );


    const selectedSet =
      sessionSize ===
        'all'
        ? randomized
        : randomized.slice(
            0,
            Number(
              sessionSize
            )
          );


    setQuestions(
      selectedSet
    );

    setIndex(0);

    setSelected(null);

    setScore(0);

    setAnswers([]);

    setFinished(false);

    setAttemptSaved(false);

    setResultMessage('');

    setSetupMessage('');

    setPracticeStarted(
      true
    );
  }


  /*
   * ANSWER
   */

  function answer(
    option: number
  ) {

    if (
      selected !==
        null ||
      !questions[index]
    ) {
      return;
    }


    const currentQuestion =
      questions[index];


    const isCorrect =
      option ===
      currentQuestion
        .correct_index;


    setSelected(
      option
    );


    if (isCorrect) {

      setScore(
        current =>
          current + 1
      );
    }


    setAnswers(
      current => [
        ...current,

        {
          question_id:
            currentQuestion.id,

          selected_index:
            option,

          correct_index:
            currentQuestion
              .correct_index,

          is_correct:
            isCorrect
        }
      ]
    );
  }


  /*
   * SAVE RESULT
   */

  async function savePracticeAttempt() {

    if (
      !supabase ||
      attemptSaved ||
      questions.length ===
        0
    ) {
      return;
    }


    setSavingResult(
      true
    );

    setResultMessage('');


    const {
      data: {
        user
      }
    } =
      await supabase
        .auth
        .getUser();


    if (!user) {

      setSavingResult(
        false
      );

      setResultMessage(
        'Result completed. Sign in as a student to save practice history.'
      );

      return;
    }


    const percentage =
      Math.round(
        (
          score /
          questions.length
        ) *
        100
      );


    const practiceSubjects =
      Array.from(
        new Set(
          questions.map(
            item =>
              item.subject
          )
        )
      );


    const sessionSubject =
      practiceSubjects.length ===
        1
        ? practiceSubjects[0]
        : 'Mixed';


    const {
      error: saveError
    } =
      await supabase
        .from(
          'practice_attempts'
        )
        .insert({

          user_id:
            user.id,

          total_questions:
            questions.length,

          correct_answers:
            score,

          score_percent:
            percentage,

          subject:
            sessionSubject,

          answers
        });


    if (saveError) {

      console.error(
        'Unable to save practice result:',
        saveError
      );

      setResultMessage(
        `Result could not be saved: ${saveError.message}`
      );

      setSavingResult(
        false
      );

      return;
    }


    setAttemptSaved(
      true
    );

    setResultMessage(
      'Practice result saved successfully.'
    );

    setSavingResult(
      false
    );
  }


  /*
   * NEXT
   */

  async function next() {

    if (
      index ===
      questions.length - 1
    ) {

      setFinished(
        true
      );

      await savePracticeAttempt();

      return;
    }


    setIndex(
      current =>
        current + 1
    );

    setSelected(null);
  }


  /*
   * SAME SET
   */

  function restart() {

    setIndex(0);

    setSelected(null);

    setScore(0);

    setAnswers([]);

    setFinished(false);

    setAttemptSaved(false);

    setResultMessage('');
  }


  /*
   * CHANGE SET
   */

  function changePracticeSet() {

    setPracticeStarted(
      false
    );

    setQuestions([]);

    setIndex(0);

    setSelected(null);

    setScore(0);

    setAnswers([]);

    setFinished(false);

    setAttemptSaved(false);

    setResultMessage('');
  }


  /*
   * LOADING
   */

  if (loading) {

    return (

      <div
        className="page-wrap"
      >

        <TopBar
          title="Prelims Practice"
          subtitle="UPSC and State PSC question bank"
        />


        <section
          className="panel"
        >

          <h2>
            Loading MCQs...
          </h2>

        </section>

      </div>
    );
  }


  /*
   * ERROR
   */

  if (error) {

    return (

      <div
        className="page-wrap"
      >

        <TopBar
          title="Prelims Practice"
          subtitle="UPSC and State PSC question bank"
        />


        <section
          className="panel"
        >

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


  /*
   * SETUP SCREEN
   */

  if (
    !practiceStarted
  ) {

    return (

      <div
        className="page-wrap"
      >

        <TopBar
          title="Prelims Practice"
          subtitle="Choose your practice question set"
        />


        <section
          className="panel admin-form"
        >

          <span
            className="eyebrow"
          >
            PRELIMS QUESTION BANK
          </span>


          <h2>
            Build Your Practice Set
          </h2>


          <p>
            Practice CSE questions,
            other UPSC examinations
            and State PSC questions
            from one place.
          </p>


          {/* ORIGIN */}

          <label>
            Question Origin

            <select
              value={
                originFilter
              }
              onChange={
                event =>
                  changeOriginFilter(
                    event.target
                      .value as
                      | 'all'
                      | QuestionOrigin
                  )
              }
            >

              <option value="all">
                All Prelims Questions
              </option>

              <option value="cse">
                CSE / General Practice
              </option>

              <option value="upsc">
                Other UPSC Examinations
              </option>

              <option value="state">
                State PSC Examinations
              </option>

            </select>

          </label>


          {/* KEYWORD SEARCH */}

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
              placeholder="Article 21, monsoon, inflation, biodiversity, NDA..."
            />

            <small>
              Search by question,
              topic, tag, examination,
              year or source.
            </small>

          </label>


          {/* SUBJECT + TOPIC */}

          <div
            className="form-two"
          >

            <label>
              Subject

              <select
                value={
                  subjectFilter
                }
                onChange={
                  event => {

                    setSubjectFilter(
                      event.target.value
                    );

                    setTopicFilter(
                      'all'
                    );

                    setCsePyqYearFilter(
                      'all'
                    );
                  }
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
              Topic

              <select
                value={
                  topicFilter
                }
                onChange={
                  event => {

                    setTopicFilter(
                      event.target.value
                    );

                    setCsePyqYearFilter(
                      'all'
                    );
                  }
                }
              >

                <option value="all">
                  All Topics
                </option>


                {topics.map(
                  topic => (

                    <option
                      key={
                        topic
                      }
                      value={
                        topic
                      }
                    >
                      {topic}
                    </option>

                  )
                )}

              </select>

            </label>

          </div>


          {/* DIFFICULTY + TYPE */}

          <div
            className="form-two"
          >

            <label>
              Difficulty

              <select
                value={
                  difficultyFilter
                }
                onChange={
                  event =>
                    setDifficultyFilter(
                      event.target
                        .value as
                        | 'all'
                        | Difficulty
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
                  typeFilter
                }
                onChange={
                  event =>
                    changeTypeFilter(
                      event.target
                        .value as
                        | 'all'
                        | 'practice'
                        | 'pyq'
                    )
                }
              >

                <option value="all">
                  All Questions
                </option>

                <option value="pyq">
                  Previous Year Questions
                </option>

                <option value="practice">
                  Practice Questions
                </option>

              </select>

            </label>

          </div>


          {/* CSE PYQ YEAR */}

          {originFilter ===
            'cse' &&
            typeFilter ===
              'pyq' && (

            <div
              style={{
                marginTop: '14px',
                padding: '16px',
                border:
                  '1px solid rgba(255,255,255,.10)',
                borderRadius: '14px'
              }}
            >

              <span
                className="eyebrow"
              >
                CSE PRELIMS PYQ
              </span>


              <label>
                PYQ Year

                <select
                  value={
                    csePyqYearFilter
                  }
                  onChange={
                    event =>
                      setCsePyqYearFilter(
                        event.target.value
                      )
                  }
                >

                  <option value="all">
                    All CSE PYQ Years
                  </option>


                  {csePyqYears.map(
                    year => (

                      <option
                        key={
                          year
                        }
                        value={
                          String(year)
                        }
                      >
                        {year}
                      </option>

                    )
                  )}

                </select>

              </label>

            </div>

          )}


          {/* SESSION SIZE */}

          <div
            style={{
              marginTop: '14px',
              padding: '16px',
              border:
                '1px solid rgba(255,255,255,.10)',
              borderRadius: '14px'
            }}
          >

            <span
              className="eyebrow"
            >
              PRACTICE SESSION
            </span>


            <label>
              Number of Questions

              <select
                value={
                  sessionSize
                }
                onChange={
                  event =>
                    setSessionSize(
                      event.target
                        .value as
                        SessionSize
                    )
                }
              >

                <option value="10">
                  10 Questions
                </option>

                <option value="20">
                  20 Questions
                </option>

                <option value="50">
                  50 Questions
                </option>

                <option value="100">
                  100 Questions
                </option>

                <option value="all">
                  All Available Questions
                </option>

              </select>

            </label>


            <small>
              Questions are randomly
              selected from your
              matching question bank.
            </small>

          </div>


          {/* UPSC */}

          {originFilter ===
            'upsc' && (

            <div
              style={{
                marginTop: '18px',
                padding: '16px',
                border:
                  '1px solid rgba(255,255,255,.10)',
                borderRadius: '14px'
              }}
            >

              <span
                className="eyebrow"
              >
                OTHER UPSC EXAMS
              </span>


              <div
                className="form-two"
              >

                <label>
                  Examination

                  <select
                    value={
                      upscExamFilter
                    }
                    onChange={
                      event => {

                        setUpscExamFilter(
                          event.target.value
                        );

                        setUpscCycleFilter(
                          'all'
                        );

                        setUpscYearFilter(
                          'all'
                        );
                      }
                    }
                  >

                    <option value="all">
                      All UPSC Exams
                    </option>


                    {upscExams.map(
                      exam => (

                        <option
                          key={
                            exam
                          }
                          value={
                            exam
                          }
                        >
                          {exam}
                        </option>

                      )
                    )}

                  </select>

                </label>


                <label>
                  Cycle

                  <select
                    value={
                      upscCycleFilter
                    }
                    onChange={
                      event =>
                        setUpscCycleFilter(
                          event.target.value
                        )
                    }
                  >

                    <option value="all">
                      All Cycles
                    </option>


                    {upscCycles.map(
                      cycle => (

                        <option
                          key={
                            cycle
                          }
                          value={
                            cycle
                          }
                        >
                          {cycle}
                        </option>

                      )
                    )}

                  </select>

                </label>

              </div>


              <label>
                Examination Year

                <select
                  value={
                    upscYearFilter
                  }
                  onChange={
                    event =>
                      setUpscYearFilter(
                        event.target.value
                      )
                  }
                >

                  <option value="all">
                    All Years
                  </option>


                  {upscYears.map(
                    year => (

                      <option
                        key={
                          year
                        }
                        value={
                          String(year)
                        }
                      >
                        {year}
                      </option>

                    )
                  )}

                </select>

              </label>

            </div>

          )}


          {/* STATE PSC */}

          {originFilter ===
            'state' && (

            <div
              style={{
                marginTop: '18px',
                padding: '16px',
                border:
                  '1px solid rgba(255,255,255,.10)',
                borderRadius: '14px'
              }}
            >

              <span
                className="eyebrow"
              >
                STATE PSC
              </span>


              <h3>
                Choose State Examination
              </h3>


              <label>
                State

                <select
                  value={
                    stateFilter
                  }
                  onChange={
                    event => {

                      setStateFilter(
                        event.target.value
                      );

                      setStateExamFilter(
                        'all'
                      );

                      setStateYearFilter(
                        'all'
                      );
                    }
                  }
                >

                  <option value="all">
                    All States
                  </option>


                  {states.map(
                    state => (

                      <option
                        key={
                          state
                        }
                        value={
                          state
                        }
                      >
                        {state}
                      </option>

                    )
                  )}

                </select>

              </label>


              <label>
                Examination

                <select
                  value={
                    stateExamFilter
                  }
                  onChange={
                    event => {

                      setStateExamFilter(
                        event.target.value
                      );

                      setStateYearFilter(
                        'all'
                      );
                    }
                  }
                >

                  <option value="all">
                    All Examinations
                  </option>


                  {stateExams.map(
                    exam => (

                      <option
                        key={
                          exam
                        }
                        value={
                          exam
                        }
                      >
                        {exam}
                      </option>

                    )
                  )}

                </select>

              </label>


              <label>
                Examination Year

                <select
                  value={
                    stateYearFilter
                  }
                  onChange={
                    event =>
                      setStateYearFilter(
                        event.target.value
                      )
                  }
                >

                  <option value="all">
                    All Years
                  </option>


                  {stateYears.map(
                    year => (

                      <option
                        key={
                          year
                        }
                        value={
                          String(year)
                        }
                      >
                        {year}
                      </option>

                    )
                  )}

                </select>

              </label>

            </div>

          )}


          {/* COUNT */}

          <div
            className="callout"
            style={{
              marginTop: '18px'
            }}
          >

            <strong>
              {
                filteredQuestions.length
              }{' '}
              questions match your
              filters
            </strong>


            <p>
              Your session will contain{' '}

              <strong>
                {
                  sessionQuestionCount
                }
              </strong>{' '}

              question
              {
                sessionQuestionCount ===
                  1
                  ? ''
                  : 's'
              }.
            </p>


            {sessionSize !==
              'all' &&
              filteredQuestions.length >
                Number(
                  sessionSize
                ) && (

              <p>
                Questions will be
                randomly selected from
                the matching bank.
              </p>

            )}

          </div>


          {allQuestions.length ===
            0 && (

            <p>
              No published Prelims
              questions are currently
              available.
            </p>

          )}


          {setupMessage && (

            <p
              className="form-message"
            >
              {setupMessage}
            </p>

          )}


          <div
            style={{
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap',
              marginTop: '18px'
            }}
          >

            <button
              type="button"
              className="primary-btn"
              onClick={
                startPractice
              }
              disabled={
                filteredQuestions
                  .length ===
                0
              }
            >
              Start Practice
            </button>


            <button
              type="button"
              className="secondary-btn"
              onClick={
                resetFilters
              }
            >
              Reset Filters
            </button>


            <button
              type="button"
              className="secondary-btn"
              onClick={
                loadQuestions
              }
            >
              Refresh Questions
            </button>

          </div>

        </section>

      </div>
    );
  }


  /*
   * RESULT SCREEN
   */

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

      <div
        className="page-wrap"
      >

        <TopBar
          title="Prelims Practice"
          subtitle="Your practice result"
        />


        <section
          className="result-card"
        >

          <span
            className="result-icon"
          >
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
            strengthen the concepts
            you missed.
          </p>


          {savingResult && (

            <p>
              Saving your result...
            </p>

          )}


          {resultMessage && (

            <p
              className="form-message"
            >
              {resultMessage}
            </p>

          )}


          <div
            style={{
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap',
              justifyContent:
                'center'
            }}
          >

            <button
              className="primary-btn"
              onClick={
                restart
              }
            >
              Practice Same Set Again
            </button>


            <button
              className="secondary-btn"
              onClick={
                changePracticeSet
              }
            >
              Choose Another Set
            </button>

          </div>

        </section>

      </div>
    );
  }


  /*
   * ACTIVE QUESTION
   */

  const q =
    questions[index];


  if (!q) {

    return null;
  }


  const origin =
    getQuestionOrigin(
      q
    );


  return (

    <div
      className="page-wrap"
    >

      <TopBar
        title="Prelims Practice"
        subtitle="Learn from every answer"
      />


      <section
        className="quiz-card"
      >

        <div
          className="quiz-meta"
        >

          <div>

            <span>
              {q.subject}
            </span>


            {q.topic && (

              <small
                style={{
                  display: 'block',
                  marginTop: '4px'
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


        <div
          className="progress-track"
        >

          <span
            style={{
              width:
                `${
                  (
                    (
                      index + 1
                    ) /
                    questions.length
                  ) *
                  100
                }%`
            }}
          />

        </div>


        {/* META */}

        <div
          className="tag-row"
          style={{
            marginBottom: '12px'
          }}
        >

          <span
            className="tag"
          >
            {q.difficulty}
          </span>


          {origin ===
            'cse' && (

            <span
              className="tag"
            >
              CSE / General
            </span>

          )}


          {origin ===
            'upsc' && (

            <span
              className="tag"
            >
              UPSC Value Add
            </span>

          )}


          {origin ===
            'state' && (

            <span
              className="tag"
            >
              State PSC
            </span>

          )}


          {q.is_pyq && (

            <span
              className="tag"
            >
              PYQ{' '}
              {
                q.pyq_year ||
                ''
              }
            </span>

          )}


          {q.upsc_exam_name && (

            <span
              className="tag"
            >
              {
                q.upsc_exam_name
              }
            </span>

          )}


          {q.upsc_exam_cycle && (

            <span
              className="tag"
            >
              Cycle{' '}
              {
                q.upsc_exam_cycle
              }
            </span>

          )}


          {q.upsc_exam_year && (

            <span
              className="tag"
            >
              {
                q.upsc_exam_year
              }
            </span>

          )}


          {q.state_psc_state && (

            <span
              className="tag"
            >
              {
                q.state_psc_state
              }
            </span>

          )}


          {q.state_psc_exam_name && (

            <span
              className="tag"
            >
              {
                q.state_psc_exam_name
              }
            </span>

          )}


          {q.state_psc_year && (

            <span
              className="tag"
            >
              {
                q.state_psc_year
              }
            </span>

          )}


          {q.tags.map(
            tag => (

              <span
                className="tag"
                key={
                  tag
                }
              >
                {tag}
              </span>

            )
          )}

        </div>


        <h2>
          {q.question}
        </h2>


        {/* OPTIONS */}

        <div
          className="option-list"
        >

          {q.options.map(
            (
              option,
              optionIndex
            ) => {

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
                    {
                      String.fromCharCode(
                        65 +
                        optionIndex
                      )
                    }
                  </span>


                  {option}

                </button>

              );
            }
          )}

        </div>


        {/* EXPLANATION */}

        {selected !== null && (

          <div
            className="explanation"
          >

            <strong>
              Explanation
            </strong>


            <p>
              {q.explanation}
            </p>


            {q.upsc_exam_name && (

              <div
                style={{
                  marginTop: '12px'
                }}
              >

                <strong>
                  UPSC Examination Reference
                </strong>


                <p>
                  {
                    q.upsc_exam_name
                  }

                  {
                    q.upsc_exam_cycle
                      ? ` ${q.upsc_exam_cycle}`
                      : ''
                  }

                  {
                    q.upsc_exam_year
                      ? ` • ${q.upsc_exam_year}`
                      : ''
                  }

                  {
                    q.upsc_exam_stage
                      ? ` • ${q.upsc_exam_stage}`
                      : ''
                  }

                  {
                    q.upsc_exam_paper
                      ? ` • ${q.upsc_exam_paper}`
                      : ''
                  }
                </p>

              </div>

            )}


            {q.state_psc_state && (

              <div
                style={{
                  marginTop: '12px'
                }}
              >

                <strong>
                  State PSC Reference
                </strong>


                <p>
                  {
                    q.state_psc_state
                  }

                  {
                    q.state_psc_name
                      ? ` • ${q.state_psc_name}`
                      : ''
                  }
                </p>


                {q.state_psc_exam_name && (

                  <p>
                    Examination:{' '}

                    <strong>
                      {
                        q.state_psc_exam_name
                      }
                    </strong>
                  </p>

                )}


                <p>
                  {
                    q.state_psc_year
                      ? `Year: ${q.state_psc_year}`
                      : ''
                  }

                  {
                    q.state_psc_stage
                      ? ` • ${q.state_psc_stage}`
                      : ''
                  }

                  {
                    q.state_psc_paper
                      ? ` • ${q.state_psc_paper}`
                      : ''
                  }
                </p>

              </div>

            )}


            {q.source && (

              <p>
                <small>
                  Source:{' '}
                  {
                    q.source
                  }
                </small>
              </p>

            )}


            {q.source_url && (

              <p>
                <a
                  href={
                    q.source_url
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Open source reference
                </a>
              </p>

            )}


            <div
              style={{
                marginTop: '16px',
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap'
              }}
            >

              <button
                className="primary-btn"
                onClick={
                  next
                }
              >
                {
                  index ===
                  questions.length - 1
                    ? 'See result'
                    : 'Next question'
                }
              </button>


              <button
                type="button"
                className="secondary-btn"
                onClick={
                  changePracticeSet
                }
              >
                Change Practice Set
              </button>

            </div>

          </div>

        )}

      </section>

    </div>
  );
}

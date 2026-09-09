import {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';

import {
  PrelimsBookmarkButton
} from './PrelimsBookmarkButton';


type StatusFilter =
  | 'needs_revision'
  | 'all'
  | 'improved';


type SessionSize =
  | '10'
  | '20'
  | '50'
  | 'all';


type ParsedAnswer = {
  question_id: string;
  selected_index: number | null;
  correct_index: number;
  is_correct: boolean;
};


type MistakeStat = {
  questionId: string;
  wrongCount: number;
  correctCount: number;
  lastAttemptCorrect: boolean | null;
};


type MistakeQuestion = {
  id: string;

  question: string;
  options: string[];
  correct_index: number;
  explanation: string;

  subject: string;
  topic: string | null;
  difficulty: string;

  is_pyq: boolean;
  pyq_year: number | null;

  upsc_exam_name: string | null;
  upsc_exam_cycle: string | null;
  upsc_exam_year: number | null;

  state_psc_state: string | null;
  state_psc_name: string | null;
  state_psc_exam_name: string | null;
  state_psc_year: number | null;

  source: string | null;
};


type SessionAnswer = {
  question_id: string;
  selected_index: number;
  correct_index: number;
  is_correct: boolean;
};


function parseAnswer(
  value: unknown
):
  ParsedAnswer | null {

  if (
    !value ||
    typeof value !==
      'object'
  ) {

    return null;
  }


  const record =
    value as
      Record<
        string,
        unknown
      >;


  if (
    typeof
      record.question_id !==
      'string'
  ) {

    return null;
  }


  return {

    question_id:
      record.question_id,

    selected_index:
      typeof
        record.selected_index ===
        'number'
        ? record.selected_index
        : null,

    correct_index:
      typeof
        record.correct_index ===
        'number'
        ? record.correct_index
        : -1,

    is_correct:
      record.is_correct ===
      true
  };
}


function shuffleQuestions(
  questions:
    MistakeQuestion[]
) {

  const copy = [
    ...questions
  ];


  for (
    let i =
      copy.length - 1;
    i > 0;
    i--
  ) {

    const j =
      Math.floor(
        Math.random() *
        (i + 1)
      );


    [
      copy[i],
      copy[j]
    ] = [
      copy[j],
      copy[i]
    ];
  }


  return copy;
}


function getSourceLabel(
  question:
    MistakeQuestion
) {

  if (
    question.state_psc_state
  ) {

    if (
      question.state_psc_exam_name
    ) {

      return (
        `${question.state_psc_state} • ` +
        question.state_psc_exam_name
      );
    }


    return question.state_psc_state;
  }


  if (
    question.upsc_exam_name
  ) {

    return question.upsc_exam_name;
  }


  return 'CSE / General';
}


export function PrelimsMistakePractice() {

  /*
   * QUESTION BANK
   */

  const [
    mistakeQuestions,
    setMistakeQuestions
  ] =
    useState<
      MistakeQuestion[]
    >([]);


  const [
    mistakeStats,
    setMistakeStats
  ] =
    useState<
      Record<
        string,
        MistakeStat
      >
    >({});


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
    message,
    setMessage
  ] =
    useState('');


  /*
   * FILTERS
   */

  const [
    statusFilter,
    setStatusFilter
  ] =
    useState<
      StatusFilter
    >('needs_revision');


  const [
    subjectFilter,
    setSubjectFilter
  ] =
    useState('all');


  const [
    sessionSize,
    setSessionSize
  ] =
    useState<
      SessionSize
    >('10');


  /*
   * SESSION
   */

  const [
    sessionStarted,
    setSessionStarted
  ] =
    useState(false);


  const [
    questions,
    setQuestions
  ] =
    useState<
      MistakeQuestion[]
    >([]);


  const [
    index,
    setIndex
  ] =
    useState(0);


  const [
    selected,
    setSelected
  ] =
    useState<
      number | null
    >(null);


  const [
    answers,
    setAnswers
  ] =
    useState<
      SessionAnswer[]
    >([]);


  const [
    score,
    setScore
  ] =
    useState(0);


  const [
    finished,
    setFinished
  ] =
    useState(false);


  const [
    sessionStartedAt,
    setSessionStartedAt
  ] =
    useState<
      number | null
    >(null);


  /*
   * RESULT SAVE
   */

  const [
    savingResult,
    setSavingResult
  ] =
    useState(false);


  const [
    attemptSaved,
    setAttemptSaved
  ] =
    useState(false);


  /*
   * LOAD MISTAKE QUESTIONS
   */

  async function loadMistakeQuestions() {

    if (!supabase) {

      setError(
        'Supabase is not configured.'
      );

      setLoading(false);

      return;
    }


    setLoading(true);

    setError('');

    setMessage('');


    const {
      data: {
        user
      }
    } =
      await supabase
        .auth
        .getUser();


    if (!user) {

      setError(
        'Sign in to practise your Prelims mistakes.'
      );

      setLoading(false);

      return;
    }


    /*
     * LOAD ALL PRELIMS ATTEMPTS
     */

    const attemptRows:
      {
        answers: unknown;
        completed_at: string;
      }[] = [];


    const pageSize =
      500;


    let from =
      0;


    while (true) {

      const {
        data,
        error:
          attemptError
      } =
        await supabase
          .from(
            'practice_attempts'
          )
          .select(
            'answers, completed_at'
          )
          .eq(
            'user_id',
            user.id
          )
          .order(
            'completed_at',
            {
              ascending:
                true
            }
          )
          .range(
            from,
            from +
            pageSize -
            1
          );


      if (attemptError) {

        console.error(
          'Unable to load mistake practice history:',
          attemptError
        );

        setError(
          attemptError.message
        );

        setLoading(false);

        return;
      }


      const rows =
        data || [];


      attemptRows.push(
        ...rows
      );


      if (
        rows.length <
        pageSize
      ) {

        break;
      }


      from +=
        pageSize;
    }


    /*
     * BUILD MISTAKE STATUS
     */

    const statMap =
      new Map<
        string,
        MistakeStat
      >();


    attemptRows.forEach(
      attempt => {

        if (
          !Array.isArray(
            attempt.answers
          )
        ) {

          return;
        }


        attempt.answers.forEach(
          raw => {

            const answer =
              parseAnswer(
                raw
              );


            if (!answer) {

              return;
            }


            /*
             * Unanswered questions
             * are not counted as
             * mistakes.
             */

            if (
              answer.selected_index ===
              null
            ) {

              return;
            }


            const existing =
              statMap.get(
                answer.question_id
              ) || {

                questionId:
                  answer.question_id,

                wrongCount:
                  0,

                correctCount:
                  0,

                lastAttemptCorrect:
                  null
              };


            if (
              answer.is_correct
            ) {

              existing.correctCount +=
                1;

            } else {

              existing.wrongCount +=
                1;
            }


            existing.lastAttemptCorrect =
              answer.is_correct;


            statMap.set(
              answer.question_id,
              existing
            );
          }
        );
      }
    );


    const mistakes =
      Array.from(
        statMap.values()
      ).filter(
        item =>
          item.wrongCount >
          0
      );


    if (
      mistakes.length ===
      0
    ) {

      setMistakeQuestions([]);

      setMistakeStats({});

      setLoading(false);

      return;
    }


    /*
     * SAVE STATS LOOKUP
     */

    const statsObject:
      Record<
        string,
        MistakeStat
      > = {};


    mistakes.forEach(
      stat => {

        statsObject[
          stat.questionId
        ] = stat;
      }
    );


    setMistakeStats(
      statsObject
    );


    /*
     * LOAD QUESTION DETAILS
     */

    const questionIds =
      mistakes.map(
        item =>
          item.questionId
      );


    const questionRows:
      Record<
        string,
        unknown
      >[] = [];


    const chunkSize =
      200;


    for (
      let start = 0;
      start <
      questionIds.length;
      start +=
      chunkSize
    ) {

      const chunk =
        questionIds.slice(
          start,
          start +
          chunkSize
        );


      const {
        data,
        error:
          questionError
      } =
        await supabase
          .from(
            'questions'
          )
          .select(`
            id,
            question,
            options,
            correct_index,
            explanation,
            subject,
            topic,
            difficulty,
            is_pyq,
            pyq_year,
            upsc_exam_name,
            upsc_exam_cycle,
            upsc_exam_year,
            state_psc_state,
            state_psc_name,
            state_psc_exam_name,
            state_psc_year,
            source
          `)
          .in(
            'id',
            chunk
          )
          .eq(
            'status',
            'published'
          )
          .eq(
            'exam_stage',
            'prelims'
          );


      if (questionError) {

        console.error(
          'Unable to load mistake questions:',
          questionError
        );

        setError(
          questionError.message
        );

        setLoading(false);

        return;
      }


      (
        data || []
      ).forEach(
        item => {

          questionRows.push(
            item as
              Record<
                string,
                unknown
              >
          );
        }
      );
    }


    const formatted:
      MistakeQuestion[] =
        questionRows.map(
          question => ({

            id:
              String(
                question.id
              ),

            question:
              String(
                question.question ||
                ''
              ),

            options:
              Array.isArray(
                question.options
              )
                ? question.options.map(
                    option =>
                      String(
                        option
                      )
                  )
                : [],

            correct_index:
              typeof
                question.correct_index ===
                'number'
                ? question.correct_index
                : 0,

            explanation:
              String(
                question.explanation ||
                ''
              ),

            subject:
              String(
                question.subject ||
                'Other'
              ),

            topic:
              question.topic
                ? String(
                    question.topic
                  )
                : null,

            difficulty:
              String(
                question.difficulty ||
                'medium'
              ),

            is_pyq:
              question.is_pyq ===
              true,

            pyq_year:
              typeof
                question.pyq_year ===
                'number'
                ? question.pyq_year
                : null,

            upsc_exam_name:
              question.upsc_exam_name
                ? String(
                    question.upsc_exam_name
                  )
                : null,

            upsc_exam_cycle:
              question.upsc_exam_cycle
                ? String(
                    question.upsc_exam_cycle
                  )
                : null,

            upsc_exam_year:
              typeof
                question.upsc_exam_year ===
                'number'
                ? question.upsc_exam_year
                : null,

            state_psc_state:
              question.state_psc_state
                ? String(
                    question.state_psc_state
                  )
                : null,

            state_psc_name:
              question.state_psc_name
                ? String(
                    question.state_psc_name
                  )
                : null,

            state_psc_exam_name:
              question.state_psc_exam_name
                ? String(
                    question.state_psc_exam_name
                  )
                : null,

            state_psc_year:
              typeof
                question.state_psc_year ===
                'number'
                ? question.state_psc_year
                : null,

            source:
              question.source
                ? String(
                    question.source
                  )
                : null
          })
        );


    setMistakeQuestions(
      formatted
    );


    setLoading(false);
  }


  useEffect(
    () => {

      void loadMistakeQuestions();

    },
    []
  );


  /*
   * SUBJECT LIST
   */

  const subjects =
    useMemo(
      () =>
        Array.from(
          new Set(
            mistakeQuestions
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
        mistakeQuestions
      ]
    );


  /*
   * FILTER AVAILABLE QUESTIONS
   */

  const filteredQuestions =
    useMemo(
      () =>
        mistakeQuestions.filter(
          question => {

            const stat =
              mistakeStats[
                question.id
              ];


            if (!stat) {

              return false;
            }


            const matchesSubject =
              subjectFilter ===
                'all' ||
              question.subject ===
                subjectFilter;


            const needsRevision =
              stat.lastAttemptCorrect !==
              true;


            const matchesStatus =
              statusFilter ===
                'all' ||

              (
                statusFilter ===
                  'needs_revision' &&
                needsRevision
              ) ||

              (
                statusFilter ===
                  'improved' &&
                stat.lastAttemptCorrect ===
                  true
              );


            return (
              matchesSubject &&
              matchesStatus
            );
          }
        ),
      [
        mistakeQuestions,
        mistakeStats,
        subjectFilter,
        statusFilter
      ]
    );


  /*
   * NUMBER OF QUESTIONS
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
   * START PRACTICE
   */

  function startPractice() {

    if (
      filteredQuestions.length ===
      0
    ) {

      setMessage(
        'No mistake questions match these filters.'
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

    setSelected(
      null
    );

    setAnswers([]);

    setScore(0);

    setFinished(
      false
    );

    setAttemptSaved(
      false
    );

    setMessage('');

    setSessionStartedAt(
      Date.now()
    );

    setSessionStarted(
      true
    );
  }


  /*
   * ANSWER QUESTION
   */

  function answerQuestion(
    optionIndex: number
  ) {

    if (
      selected !==
      null
    ) {

      return;
    }


    const question =
      questions[index];


    if (!question) {

      return;
    }


    const correct =
      optionIndex ===
      question.correct_index;


    setSelected(
      optionIndex
    );


    if (correct) {

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
            question.id,

          selected_index:
            optionIndex,

          correct_index:
            question.correct_index,

          is_correct:
            correct
        }
      ]
    );
  }


  /*
   * SESSION DURATION
   */

  function getDurationSeconds() {

    if (
      !sessionStartedAt
    ) {

      return 0;
    }


    return Math.max(
      0,

      Math.floor(
        (
          Date.now() -
          sessionStartedAt
        ) /
        1000
      )
    );
  }


  /*
   * SAVE PRACTICE RESULT
   */

  async function saveResult(
    finalAnswers:
      SessionAnswer[]
  ) {

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


    const {
      data: {
        user
      }
    } =
      await supabase
        .auth
        .getUser();


    if (!user) {

      setMessage(
        'Sign in to save your result.'
      );

      setSavingResult(
        false
      );

      return;
    }


    const correct =
      finalAnswers.filter(
        answer =>
          answer.is_correct
      ).length;


    const incorrect =
      finalAnswers.length -
      correct;


    const subjectList =
      Array.from(
        new Set(
          questions.map(
            question =>
              question.subject
          )
        )
      );


    const sessionSubject =
      subjectList.length ===
        1
        ? subjectList[0]
        : 'Mixed';


    const scorePercent =
      questions.length >
        0
        ? Math.round(
            (
              correct /
              questions.length
            ) *
            10000
          ) /
          100
        : 0;


    const {
      error:
        saveError
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

          attempted_questions:
            finalAnswers.length,

          correct_answers:
            correct,

          incorrect_answers:
            incorrect,

          unanswered_questions:
            Math.max(
              0,
              questions.length -
              finalAnswers.length
            ),

          score_percent:
            scorePercent,

          subject:
            sessionSubject,

          answers:
            finalAnswers,

          mode:
            'practice',

          marks_obtained:
            null,

          max_marks:
            null,

          negative_marks:
            null,

          duration_seconds:
            getDurationSeconds(),

          time_limit_seconds:
            null,

          practice_config: {

            session_mode:
              'practice',

            origin:
              'mistake_book',

            mistake_status:
              statusFilter,

            subject:
              subjectFilter,

            session_size:
              sessionSize
          }
        });


    if (saveError) {

      console.error(
        'Unable to save mistake practice:',
        saveError
      );

      setMessage(
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


    setMessage(
      'Mistake-practice result saved. Your Mistake Book will update automatically.'
    );


    setSavingResult(
      false
    );
  }


  /*
   * NEXT QUESTION
   */

  async function nextQuestion() {

    if (
      selected ===
      null
    ) {

      return;
    }


    if (
      index ===
      questions.length -
      1
    ) {

      setFinished(
        true
      );


      await saveResult(
        answers
      );


      return;
    }


    setIndex(
      current =>
        current + 1
    );


    setSelected(
      null
    );
  }


  /*
   * RESTART SAME QUESTIONS
   */

  function restartSameSet() {

    setIndex(0);

    setSelected(
      null
    );

    setAnswers([]);

    setScore(0);

    setFinished(
      false
    );

    setAttemptSaved(
      false
    );

    setMessage('');

    setSessionStartedAt(
      Date.now()
    );
  }


  /*
   * RETURN TO SETUP
   */

  function returnToSetup() {

    setSessionStarted(
      false
    );

    setQuestions([]);

    setIndex(0);

    setSelected(
      null
    );

    setAnswers([]);

    setScore(0);

    setFinished(
      false
    );

    setAttemptSaved(
      false
    );

    setMessage('');


    void loadMistakeQuestions();
  }


  /*
   * LOADING
   */

  if (loading) {

    return (

      <section
        className="panel"
        style={{
          marginTop:
            '22px'
        }}
      >

        <span
          className="eyebrow"
        >
          MISTAKE PRACTICE
        </span>


        <h2>
          Loading your mistakes...
        </h2>

      </section>

    );
  }


  /*
   * ERROR
   */

  if (error) {

    return (

      <section
        className="panel"
        style={{
          marginTop:
            '22px'
        }}
      >

        <span
          className="eyebrow"
        >
          MISTAKE PRACTICE
        </span>


        <h2>
          Unable to start practice
        </h2>


        <div
          className="callout"
        >

          <strong>
            {error}
          </strong>

        </div>

      </section>

    );
  }


  /*
   * EMPTY
   */

  if (
    mistakeQuestions.length ===
    0
  ) {

    return (

      <section
        className="panel"
        style={{
          marginTop:
            '22px'
        }}
      >

        <span
          className="eyebrow"
        >
          MISTAKE PRACTICE
        </span>


        <h2>
          Practice Your Mistakes
        </h2>


        <div
          className="callout"
        >

          <strong>
            No mistake questions available
          </strong>


          <p>
            Questions answered incorrectly
            during Prelims Practice or
            CSE Exam Mode will become
            available here.
          </p>

        </div>

      </section>

    );
  }


  /*
   * SETUP SCREEN
   */

  if (
    !sessionStarted
  ) {

    return (

      <section
        className="panel admin-form"
        style={{
          marginTop:
            '22px'
        }}
      >

        <span
          className="eyebrow"
        >
          MISTAKE PRACTICE
        </span>


        <h2>
          Practice Your Mistakes
        </h2>


        <p>
          Turn previous mistakes into
          fresh practice questions and
          track whether you improve.
        </p>


        {/* STATUS */}

        <label>
          Mistake Status

          <select
            value={
              statusFilter
            }
            onChange={
              event =>
                setStatusFilter(
                  event.target
                    .value as
                    StatusFilter
                )
            }
          >

            <option
              value="needs_revision"
            >
              Needs Revision
            </option>


            <option
              value="all"
            >
              All Mistakes
            </option>


            <option
              value="improved"
            >
              Improved Later
            </option>

          </select>

        </label>


        {/* SUBJECT */}

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

            <option
              value="all"
            >
              All Subjects
            </option>


            {subjects.map(
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
            )}

          </select>

        </label>


        {/* SESSION SIZE */}

        <label>
          Questions

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


            <option value="all">
              All Available Questions
            </option>

          </select>

        </label>


        {/* SUMMARY */}

        <div
          className="callout"
          style={{
            marginTop:
              '16px'
          }}
        >

          <strong>
            {
              filteredQuestions.length
            }{' '}
            questions match
          </strong>


          <p>
            Practice session:{' '}

            <strong>
              {
                sessionQuestionCount
              }
            </strong>{' '}
            questions
          </p>

        </div>


        {message && (

          <p
            className="form-message"
          >
            {message}
          </p>

        )}


        <button
          type="button"
          className="primary-btn"
          disabled={
            filteredQuestions.length ===
            0
          }
          onClick={
            startPractice
          }
          style={{
            marginTop:
              '16px'
          }}
        >
          Start Mistake Practice
        </button>

      </section>

    );
  }


  /*
   * RESULT
   */

  if (finished) {

    const percentage =
      questions.length >
        0
        ? Math.round(
            (
              score /
              questions.length
            ) *
            100
          )
        : 0;


    return (

      <section
        className="result-card"
        style={{
          marginTop:
            '22px'
        }}
      >

        <span
          className="result-icon"
        >
          🎯
        </span>


        <span
          className="eyebrow"
        >
          MISTAKE PRACTICE RESULT
        </span>


        <h2>
          {score}/
          {questions.length}
        </h2>


        <h3>
          {percentage}%
        </h3>


        <p>
          {
            percentage >=
            80
              ? 'Strong improvement. Keep revising until these concepts become automatic.'
              : percentage >=
                60
              ? 'Good progress. Review the remaining mistakes once more.'
              : 'Continue revising these concepts and attempt the set again.'
          }
        </p>


        {savingResult && (

          <p>
            Saving your result...
          </p>

        )}


        {message && (

          <p
            className="form-message"
          >
            {message}
          </p>

        )}


        <div
          style={{
            display:
              'flex',

            gap:
              '10px',

            flexWrap:
              'wrap',

            justifyContent:
              'center',

            marginTop:
              '16px'
          }}
        >

          <button
            type="button"
            className="primary-btn"
            onClick={
              restartSameSet
            }
          >
            Practice Same Set Again
          </button>


          <button
            type="button"
            className="secondary-btn"
            onClick={
              returnToSetup
            }
          >
            Choose Another Mistake Set
          </button>

        </div>

      </section>

    );
  }


  /*
   * ACTIVE QUESTION
   */

  const question =
    questions[index];


  if (!question) {

    return null;
  }


  const stat =
    mistakeStats[
      question.id
    ];


  return (

    <section
      className="quiz-card"
      style={{
        marginTop:
          '22px'
      }}
    >

      {/* PROGRESS */}

      <div
        className="quiz-meta"
      >

        <div>

          <span>
            {
              question.subject
            }
          </span>


          {question.topic && (

            <small
              style={{
                display:
                  'block',

                marginTop:
                  '4px'
              }}
            >
              {
                question.topic
              }
            </small>

          )}

        </div>


        <strong>
          Question{' '}
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
          marginTop:
            '14px'
        }}
      >

        <span
          className="tag"
        >
          {
            question.difficulty
          }
        </span>


        <span
          className="tag"
        >
          {
            getSourceLabel(
              question
            )
          }
        </span>


        {question.is_pyq && (

          <span
            className="tag"
          >
            PYQ{' '}
            {
              question.pyq_year ||
              ''
            }
          </span>

        )}


        {stat && (

          <span
            className="tag"
            style={{
              color:
                '#fca5a5'
            }}
          >
            Previous Wrong ×
            {
              stat.wrongCount
            }
          </span>

        )}

      </div>


      {/* QUESTION */}

      <h2>
        {
          question.question
        }
      </h2>


      {/* OPTIONS */}

      <div
        className="option-list"
      >

        {question.options.map(
          (
            option,
            optionIndex
          ) => {

            const state =
              selected ===
                null

                ? ''

                : optionIndex ===
                  question.correct_index

                ? 'correct'

                : selected ===
                  optionIndex

                ? 'wrong'

                : 'muted';


            return (

              <button
                key={
                  `${question.id}-${optionIndex}`
                }
                className={
                  `option ${state}`
                }
                onClick={() =>
                  answerQuestion(
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

      {selected !==
        null && (

        <div
          className="explanation"
        >

          <strong>
            {
              selected ===
              question.correct_index
                ? 'Correct'
                : 'Incorrect'
            }
          </strong>


          <p>
            Correct answer:{' '}

            <strong>
              {
                String.fromCharCode(
                  65 +
                  question.correct_index
                )
              }.
              {' '}
              {
                question.options[
                  question.correct_index
                ] ||
                ''
              }
            </strong>
          </p>


          <strong>
            Explanation
          </strong>


          <p>
            {
              question.explanation
            }
          </p>


          {question.source && (

            <p>

              <small>
                Source:{' '}
                {
                  question.source
                }
              </small>

            </p>

          )}


          <div
            style={{
              marginTop:
                '14px',

              marginBottom:
                '14px'
            }}
          >

            <PrelimsBookmarkButton
              questionId={
                question.id
              }
            />

          </div>


          <button
            type="button"
            className="primary-btn"
            onClick={
              nextQuestion
            }
          >

            {
              index ===
              questions.length -
                1
                ? 'See Result'
                : 'Next Question'
            }

          </button>

        </div>

      )}

    </section>

  );
}

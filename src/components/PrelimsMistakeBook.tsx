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

  lastWrongAt: string | null;
  lastAttemptAt: string | null;

  lastAttemptCorrect:
    boolean | null;
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

  wrongCount: number;
  correctCount: number;

  lastWrongAt: string | null;
  lastAttemptAt: string | null;

  lastAttemptCorrect:
    boolean | null;
};


type StatusFilter =
  | 'all'
  | 'needs_revision'
  | 'improved';


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


  const selectedIndex =
    typeof
      record.selected_index ===
      'number'
      ? record.selected_index
      : null;


  const correctIndex =
    typeof
      record.correct_index ===
      'number'
      ? record.correct_index
      : -1;


  return {

    question_id:
      record.question_id,

    selected_index:
      selectedIndex,

    correct_index:
      correctIndex,

    is_correct:
      record.is_correct ===
      true
  };
}


/*
 * QUESTION SOURCE LABEL
 */

function sourceLabel(
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


    return (
      question.state_psc_state
    );
  }


  if (
    question.upsc_exam_name
  ) {

    return (
      question.upsc_exam_name
    );
  }


  return 'CSE / General';
}


/*
 * DATE FORMAT
 */

function formatDate(
  value:
    string | null
) {

  if (!value) {

    return '—';
  }


  return new Date(
    value
  ).toLocaleString(
    'en-IN',
    {
      day:
        '2-digit',

      month:
        'short',

      year:
        'numeric'
    }
  );
}


export function PrelimsMistakeBook() {

  /*
   * DATA
   */

  const [
    questions,
    setQuestions
  ] =
    useState<
      MistakeQuestion[]
    >([]);


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


  /*
   * FILTERS
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


  const [
    statusFilter,
    setStatusFilter
  ] =
    useState<
      StatusFilter
    >('all');


  /*
   * ANSWER VISIBILITY
   */

  const [
    openAnswers,
    setOpenAnswers
  ] =
    useState<
      Record<
        string,
        boolean
      >
    >({});


  /*
   * LOAD MISTAKE BOOK
   */

  async function loadMistakeBook() {

    if (!supabase) {

      setError(
        'Supabase is not configured.'
      );

      setLoading(false);

      return;
    }


    setLoading(true);

    setError('');


    const {
      data: {
        user
      }
    } =
      await supabase
        .auth
        .getUser();


    if (!user) {

      setQuestions([]);

      setError(
        'Sign in to view your Prelims Mistake Book.'
      );

      setLoading(false);

      return;
    }


    /*
     * LOAD ALL PRELIMS ATTEMPTS
     *
     * Ascending order is intentional.
     * It allows us to identify the
     * student's latest result for
     * each question.
     */

    const attemptRows:
      {
        id: string;
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
            'id, answers, completed_at'
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
          'Unable to load practice attempts:',
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
     * BUILD QUESTION MISTAKE STATS
     */

    const mistakeMap =
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
          rawAnswer => {

            const answer =
              parseAnswer(
                rawAnswer
              );


            if (!answer) {

              return;
            }


            /*
             * Unanswered questions
             * are not treated as
             * mistakes here.
             */

            if (
              answer.selected_index ===
              null
            ) {

              return;
            }


            const existing =
              mistakeMap.get(
                answer.question_id
              ) || {

                questionId:
                  answer.question_id,

                wrongCount:
                  0,

                correctCount:
                  0,

                lastWrongAt:
                  null,

                lastAttemptAt:
                  null,

                lastAttemptCorrect:
                  null
              };


            existing.lastAttemptAt =
              attempt.completed_at;


            existing.lastAttemptCorrect =
              answer.is_correct;


            if (
              answer.is_correct
            ) {

              existing.correctCount +=
                1;

            } else {

              existing.wrongCount +=
                1;


              existing.lastWrongAt =
                attempt.completed_at;
            }


            mistakeMap.set(
              answer.question_id,
              existing
            );
          }
        );
      }
    );


    /*
     * KEEP ONLY QUESTIONS THAT
     * WERE WRONG AT LEAST ONCE
     */

    const mistakeStats =
      Array.from(
        mistakeMap.values()
      ).filter(
        item =>
          item.wrongCount >
          0
      );


    if (
      mistakeStats.length ===
      0
    ) {

      setQuestions([]);

      setLoading(false);

      return;
    }


    const questionIds =
      mistakeStats.map(
        item =>
          item.questionId
      );


    /*
     * LOAD QUESTION DETAILS
     */

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
          );


      if (questionError) {

        console.error(
          'Unable to load Mistake Book questions:',
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


    /*
     * QUESTION LOOKUP
     */

    const questionMap =
      new Map<
        string,
        Record<
          string,
          unknown
        >
      >();


    questionRows.forEach(
      question => {

        questionMap.set(
          String(
            question.id
          ),
          question
        );
      }
    );


    /*
     * MERGE QUESTION DATA
     * WITH MISTAKE STATS
     */

    const merged:
      MistakeQuestion[] = [];


    mistakeStats.forEach(
      stat => {

        const question =
          questionMap.get(
            stat.questionId
          );


        /*
         * Old attempt may point to
         * a question deleted later.
         */

        if (!question) {

          return;
        }


        merged.push({

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
              : null,

          wrongCount:
            stat.wrongCount,

          correctCount:
            stat.correctCount,

          lastWrongAt:
            stat.lastWrongAt,

          lastAttemptAt:
            stat.lastAttemptAt,

          lastAttemptCorrect:
            stat.lastAttemptCorrect
        });
      }
    );


    /*
     * PRIORITY ORDER
     *
     * 1. Latest attempt still wrong
     * 2. More mistakes
     * 3. More recent mistake
     */

    merged.sort(
      (
        a,
        b
      ) => {

        const aNeedsRevision =
          a.lastAttemptCorrect !==
          true;


        const bNeedsRevision =
          b.lastAttemptCorrect !==
          true;


        if (
          aNeedsRevision !==
          bNeedsRevision
        ) {

          return aNeedsRevision
            ? -1
            : 1;
        }


        if (
          a.wrongCount !==
          b.wrongCount
        ) {

          return (
            b.wrongCount -
            a.wrongCount
          );
        }


        const aTime =
          a.lastWrongAt
            ? new Date(
                a.lastWrongAt
              ).getTime()
            : 0;


        const bTime =
          b.lastWrongAt
            ? new Date(
                b.lastWrongAt
              ).getTime()
            : 0;


        return (
          bTime -
          aTime
        );
      }
    );


    setQuestions(
      merged
    );


    setLoading(false);
  }


  useEffect(
    () => {

      void loadMistakeBook();

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
            questions
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
        questions
      ]
    );


  /*
   * SUMMARY
   */

  const totalWrongAnswers =
    useMemo(
      () =>
        questions.reduce(
          (
            total,
            item
          ) =>
            total +
            item.wrongCount,
          0
        ),
      [
        questions
      ]
    );


  const needsRevisionCount =
    useMemo(
      () =>
        questions.filter(
          item =>
            item.lastAttemptCorrect !==
            true
        ).length,
      [
        questions
      ]
    );


  const improvedCount =
    useMemo(
      () =>
        questions.filter(
          item =>
            item.lastAttemptCorrect ===
            true
        ).length,
      [
        questions
      ]
    );


  /*
   * FILTER QUESTIONS
   */

  const visibleQuestions =
    useMemo(
      () => {

        const search =
          searchText
            .trim()
            .toLowerCase();


        return questions.filter(
          question => {

            const matchesSubject =
              subjectFilter ===
                'all' ||
              question.subject ===
                subjectFilter;


            const needsRevision =
              question.lastAttemptCorrect !==
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
                question.lastAttemptCorrect ===
                  true
              );


            const searchableText =
              [
                question.question,
                question.subject,
                question.topic || '',
                question.source || '',
                question.upsc_exam_name ||
                  '',
                question.state_psc_state ||
                  '',
                question.state_psc_exam_name ||
                  '',
                question.pyq_year
                  ? String(
                      question.pyq_year
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


            return (
              matchesSubject &&
              matchesStatus &&
              matchesSearch
            );
          }
        );
      },
      [
        questions,
        searchText,
        subjectFilter,
        statusFilter
      ]
    );


  /*
   * SHOW / HIDE ANSWER
   */

  function toggleAnswer(
    questionId: string
  ) {

    setOpenAnswers(
      current => ({
        ...current,

        [questionId]:
          !Boolean(
            current[
              questionId
            ]
          )
      })
    );
  }


  return (

    <section
      className="panel"
      style={{
        marginTop:
          '22px'
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
            'center',

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
            PRELIMS REVISION
          </span>


          <h2>
            Mistake Book
          </h2>


          <p>
            Automatically review
            questions you answered
            incorrectly in previous
            Prelims sessions.
          </p>

        </div>


        <button
          type="button"
          className="secondary-btn"
          onClick={
            loadMistakeBook
          }
        >
          Refresh Mistakes
        </button>

      </div>


      {/* LOADING */}

      {loading && (

        <p>
          Building your Mistake Book...
        </p>

      )}


      {/* ERROR */}

      {error && (

        <div
          className="callout"
          style={{
            marginTop:
              '18px'
          }}
        >

          <strong>
            {error}
          </strong>

        </div>

      )}


      {/* EMPTY */}

      {!loading &&
        !error &&
        questions.length ===
          0 && (

        <div
          className="callout"
          style={{
            marginTop:
              '18px'
          }}
        >

          <strong>
            No mistakes recorded yet
          </strong>


          <p>
            Questions answered
            incorrectly during Practice
            Mode or CSE Exam Mode will
            automatically appear here.
          </p>

        </div>

      )}


      {/* CONTENT */}

      {!loading &&
        !error &&
        questions.length >
          0 && (

        <>

          {/* SUMMARY */}

          <div
            className="metrics-grid"
            style={{
              marginTop:
                '18px'
            }}
          >

            <article
              className="metric-card"
            >

              <div>

                <span>
                  Mistake Questions
                </span>


                <strong>
                  {
                    questions.length
                  }
                </strong>


                <small>
                  Unique questions
                </small>

              </div>

            </article>


            <article
              className="metric-card"
            >

              <div>

                <span>
                  Wrong Answers
                </span>


                <strong>
                  {
                    totalWrongAnswers
                  }
                </strong>


                <small>
                  Total mistakes
                </small>

              </div>

            </article>


            <article
              className="metric-card"
            >

              <div>

                <span>
                  Needs Revision
                </span>


                <strong>
                  {
                    needsRevisionCount
                  }
                </strong>


                <small>
                  Latest attempt wrong
                </small>

              </div>

            </article>


            <article
              className="metric-card"
            >

              <div>

                <span>
                  Improved
                </span>


                <strong>
                  {
                    improvedCount
                  }
                </strong>


                <small>
                  Latest attempt correct
                </small>

              </div>

            </article>

          </div>


          {/* FILTERS */}

          <div
            style={{
              marginTop:
                '20px',

              padding:
                '16px',

              border:
                '1px solid rgba(255,255,255,.10)',

              borderRadius:
                '14px'
            }}
          >

            <span
              className="eyebrow"
            >
              FILTER MISTAKE BOOK
            </span>


            <label>
              Search

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
                placeholder="Search question, topic, exam..."
              />

            </label>


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


              <label>
                Revision Status

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
                    value="all"
                  >
                    All Mistakes
                  </option>


                  <option
                    value="needs_revision"
                  >
                    Needs Revision
                  </option>


                  <option
                    value="improved"
                  >
                    Improved Later
                  </option>

                </select>

              </label>

            </div>


            <p>
              Showing{' '}

              <strong>
                {
                  visibleQuestions.length
                }
              </strong>{' '}

              of{' '}

              <strong>
                {
                  questions.length
                }
              </strong>{' '}

              mistake questions.
            </p>

          </div>


          {/* NO FILTER RESULTS */}

          {visibleQuestions.length ===
            0 && (

            <div
              className="callout"
              style={{
                marginTop:
                  '18px'
              }}
            >

              <strong>
                No mistake questions
                match these filters.
              </strong>

            </div>

          )}


          {/* MISTAKE CARDS */}

          <div
            style={{
              display:
                'grid',

              gap:
                '16px',

              marginTop:
                '20px'
            }}
          >

            {visibleQuestions.map(
              (
                question,
                questionIndex
              ) => {

                const answerOpen =
                  Boolean(
                    openAnswers[
                      question.id
                    ]
                  );


                const needsRevision =
                  question.lastAttemptCorrect !==
                  true;


                return (

                  <article
                    key={
                      question.id
                    }
                    style={{
                      padding:
                        '18px',

                      border:
                        needsRevision
                          ? '1px solid rgba(251,191,36,.30)'
                          : '1px solid rgba(45,212,191,.25)',

                      borderRadius:
                        '16px',

                      background:
                        needsRevision
                          ? 'rgba(251,191,36,.025)'
                          : 'rgba(20,184,166,.025)'
                    }}
                  >

                    {/* META */}

                    <div
                      className="tag-row"
                    >

                      <span
                        className="tag"
                      >
                        #
                        {
                          questionIndex +
                          1
                        }
                      </span>


                      <span
                        className="tag"
                      >
                        {
                          question.subject
                        }
                      </span>


                      {question.topic && (

                        <span
                          className="tag"
                        >
                          {
                            question.topic
                          }
                        </span>

                      )}


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
                          sourceLabel(
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


                      <span
                        className="tag"
                        style={{
                          color:
                            '#fca5a5'
                        }}
                      >
                        Wrong ×
                        {
                          question.wrongCount
                        }
                      </span>


                      {needsRevision ? (

                        <span
                          className="tag"
                          style={{
                            color:
                              '#fbbf24'
                          }}
                        >
                          Needs Revision
                        </span>

                      ) : (

                        <span
                          className="tag"
                          style={{
                            color:
                              '#5eead4'
                          }}
                        >
                          Improved Later
                        </span>

                      )}

                    </div>


                    {/* QUESTION */}

                    <h3
                      style={{
                        marginTop:
                          '14px'
                      }}
                    >
                      {
                        question.question
                      }
                    </h3>


                    {/* HISTORY */}

                    <div
                      className="callout"
                      style={{
                        marginTop:
                          '12px'
                      }}
                    >

                      <p>
                        Incorrect attempts:{' '}

                        <strong>
                          {
                            question.wrongCount
                          }
                        </strong>
                      </p>


                      <p>
                        Correct attempts:{' '}

                        <strong>
                          {
                            question.correctCount
                          }
                        </strong>
                      </p>


                      <p>
                        Last mistake:{' '}

                        <strong>
                          {
                            formatDate(
                              question.lastWrongAt
                            )
                          }
                        </strong>
                      </p>

                    </div>


                    {/* OPTIONS */}

                    <div
                      style={{
                        display:
                          'grid',

                        gap:
                          '8px',

                        marginTop:
                          '14px'
                      }}
                    >

                      {question.options.map(
                        (
                          option,
                          optionIndex
                        ) => {

                          const isCorrect =
                            answerOpen &&
                            optionIndex ===
                              question.correct_index;


                          return (

                            <div
                              key={
                                `${question.id}-${optionIndex}`
                              }
                              style={{
                                padding:
                                  '10px 12px',

                                border:
                                  isCorrect
                                    ? '1px solid rgba(45,212,191,.65)'
                                    : '1px solid rgba(255,255,255,.08)',

                                background:
                                  isCorrect
                                    ? 'rgba(20,184,166,.12)'
                                    : 'rgba(255,255,255,.025)',

                                borderRadius:
                                  '10px'
                              }}
                            >

                              <strong>
                                {
                                  String.fromCharCode(
                                    65 +
                                    optionIndex
                                  )
                                }.
                              </strong>
                              {' '}
                              {option}

                            </div>

                          );
                        }
                      )}

                    </div>


                    {/* ANSWER */}

                    {answerOpen && (

                      <div
                        className="explanation"
                        style={{
                          marginTop:
                            '14px'
                        }}
                      >

                        <strong>
                          Correct Answer
                        </strong>


                        <p>
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

                      </div>

                    )}


                    {/* ACTIONS */}

                    <div
                      style={{
                        display:
                          'flex',

                        gap:
                          '10px',

                        alignItems:
                          'center',

                        flexWrap:
                          'wrap',

                        marginTop:
                          '16px'
                      }}
                    >

                      <button
                        type="button"
                        className="primary-btn"
                        onClick={() =>
                          toggleAnswer(
                            question.id
                          )
                        }
                      >
                        {
                          answerOpen
                            ? 'Hide Answer'
                            : 'Review Answer'
                        }
                      </button>


                      <PrelimsBookmarkButton
                        questionId={
                          question.id
                        }
                      />

                    </div>

                  </article>

                );
              }
            )}

          </div>

        </>

      )}

    </section>
  );
}

import {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


type SavedQuestion = {
  bookmark_id: string;

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


function getSourceLabel(
  question: SavedQuestion
) {

  if (
    question.state_psc_state
  ) {

    return (
      question.state_psc_exam_name ||
      question.state_psc_name ||
      question.state_psc_state
    );
  }


  if (
    question.upsc_exam_name
  ) {

    return question.upsc_exam_name;
  }


  return 'CSE / General';
}


export function MySavedPrelimsQuestions() {

  const [
    questions,
    setQuestions
  ] =
    useState<
      SavedQuestion[]
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
    openAnswers,
    setOpenAnswers
  ] =
    useState<
      Record<
        string,
        boolean
      >
    >({});


  const [
    removingId,
    setRemovingId
  ] =
    useState<
      string | null
    >(null);


  /*
   * LOAD SAVED QUESTIONS
   */

  async function loadSavedQuestions() {

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
        'Sign in to view your saved revision questions.'
      );

      setLoading(false);

      return;
    }


    /*
     * LOAD BOOKMARKS
     */

    const {
      data:
        bookmarkRows,
      error:
        bookmarkError
    } =
      await supabase
        .from(
          'bookmarks'
        )
        .select(
          'id, content_id, created_at'
        )
        .eq(
          'user_id',
          user.id
        )
        .eq(
          'content_type',
          'prelims_question'
        )
        .order(
          'created_at',
          {
            ascending:
              false
          }
        );


    if (bookmarkError) {

      console.error(
        'Unable to load bookmarks:',
        bookmarkError
      );

      setError(
        bookmarkError.message
      );

      setLoading(false);

      return;
    }


    if (
      !bookmarkRows ||
      bookmarkRows.length ===
        0
    ) {

      setQuestions([]);

      setLoading(false);

      return;
    }


    const questionIds =
      bookmarkRows.map(
        item =>
          String(
            item.content_id
          )
      );


    /*
     * LOAD QUESTION DETAILS
     */

    const {
      data:
        questionRows,
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
          questionIds
        );


    if (questionError) {

      console.error(
        'Unable to load saved questions:',
        questionError
      );

      setError(
        questionError.message
      );

      setLoading(false);

      return;
    }


    const questionMap =
      new Map<
        string,
        any
      >();


    (
      questionRows || []
    ).forEach(
      item => {

        questionMap.set(
          String(
            item.id
          ),
          item
        );
      }
    );


    /*
     * KEEP BOOKMARK ORDER
     */

    const merged:
      SavedQuestion[] = [];


    bookmarkRows.forEach(
      bookmark => {

        const question =
          questionMap.get(
            String(
              bookmark.content_id
            )
          );


        if (!question) {
          return;
        }


        merged.push({

          bookmark_id:
            bookmark.id,

          id:
            question.id,

          question:
            question.question,

          options:
            Array.isArray(
              question.options
            )
              ? question.options.map(
                  (
                    option: unknown
                  ) =>
                    String(
                      option
                    )
                )
              : [],

          correct_index:
            question.correct_index,

          explanation:
            question.explanation,

          subject:
            question.subject,

          topic:
            question.topic,

          difficulty:
            question.difficulty,

          is_pyq:
            Boolean(
              question.is_pyq
            ),

          pyq_year:
            question.pyq_year,

          upsc_exam_name:
            question.upsc_exam_name,

          upsc_exam_cycle:
            question.upsc_exam_cycle,

          upsc_exam_year:
            question.upsc_exam_year,

          state_psc_state:
            question.state_psc_state,

          state_psc_name:
            question.state_psc_name,

          state_psc_exam_name:
            question.state_psc_exam_name,

          state_psc_year:
            question.state_psc_year,

          source:
            question.source
        });
      }
    );


    setQuestions(
      merged
    );

    setLoading(false);
  }


  useEffect(
    () => {

      loadSavedQuestions();

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
   * FILTER SAVED QUESTIONS
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


            const searchableText =
              [
                question.question,
                question.subject,
                question.topic || '',
                question.source || '',

                question.upsc_exam_name ||
                  '',

                question.upsc_exam_cycle ||
                  '',

                question.upsc_exam_year
                  ? String(
                      question.upsc_exam_year
                    )
                  : '',

                question.state_psc_state ||
                  '',

                question.state_psc_name ||
                  '',

                question.state_psc_exam_name ||
                  '',

                question.state_psc_year
                  ? String(
                      question.state_psc_year
                    )
                  : '',

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
              matchesSearch
            );
          }
        );
      },
      [
        questions,
        searchText,
        subjectFilter
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


  /*
   * REMOVE FROM REVISION
   */

  async function removeSavedQuestion(
    question:
      SavedQuestion
  ) {

    if (
      !supabase ||
      removingId
    ) {

      return;
    }


    const confirmed =
      window.confirm(
        'Remove this question from your Revision Bank?'
      );


    if (!confirmed) {
      return;
    }


    setRemovingId(
      question.id
    );


    const {
      error:
        deleteError
    } =
      await supabase
        .from(
          'bookmarks'
        )
        .delete()
        .eq(
          'id',
          question.bookmark_id
        );


    if (deleteError) {

      console.error(
        'Unable to remove saved question:',
        deleteError
      );

      setError(
        deleteError.message
      );

      setRemovingId(null);

      return;
    }


    setQuestions(
      current =>
        current.filter(
          item =>
            item.id !==
            question.id
        )
    );


    setRemovingId(null);
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
            REVISION BANK
          </span>


          <h2>
            Saved Prelims Questions
          </h2>


          <p>
            Revisit difficult,
            important and high-value
            questions.
          </p>

        </div>


        <button
          type="button"
          className="secondary-btn"
          onClick={
            loadSavedQuestions
          }
        >
          Refresh
        </button>

      </div>


      {/* SUMMARY */}

      {!loading &&
        !error && (

        <div
          className="callout"
          style={{
            marginTop:
              '16px'
          }}
        >

          <strong>
            {
              questions.length
            }{' '}
            saved question
            {
              questions.length ===
                1
                ? ''
                : 's'
            }
          </strong>


          <p>
            Use this bank for
            focused revision before
            Prelims.
          </p>

        </div>

      )}


      {/* FILTERS */}

      {!loading &&
        questions.length >
          0 && (

        <div
          style={{
            marginTop:
              '18px',

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
            FILTER REVISION BANK
          </span>


          <div
            className="form-two"
          >

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
                placeholder="Search saved questions..."
              />

            </label>


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
            saved questions.
          </p>

        </div>

      )}


      {/* LOADING */}

      {loading && (

        <p>
          Loading saved questions...
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
            No saved questions yet
          </strong>


          <p>
            During Prelims Practice,
            use “Save for Revision”
            on important questions.
            They will appear here.
          </p>

        </div>

      )}


      {/* FILTER EMPTY */}

      {!loading &&
        !error &&
        questions.length >
          0 &&
        visibleQuestions.length ===
          0 && (

        <div
          className="callout"
          style={{
            marginTop:
              '18px'
          }}
        >

          <strong>
            No saved questions match
            these filters.
          </strong>

        </div>

      )}


      {/* QUESTION CARDS */}

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


            const sourceLabel =
              getSourceLabel(
                question
              );


            return (

              <article
                key={
                  question.id
                }
                style={{
                  padding:
                    '18px',

                  border:
                    '1px solid rgba(255,255,255,.10)',

                  borderRadius:
                    '16px'
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
                      sourceLabel
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


                  {question.upsc_exam_year && (

                    <span
                      className="tag"
                    >
                      {
                        question.upsc_exam_year
                      }
                    </span>

                  )}


                  {question.state_psc_year && (

                    <span
                      className="tag"
                    >
                      {
                        question.state_psc_year
                      }
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
                    ) => (

                      <div
                        key={
                          `${question.id}-${optionIndex}`
                        }
                        style={{
                          padding:
                            '10px 12px',

                          border:
                            answerOpen &&
                            optionIndex ===
                              question.correct_index

                              ? '1px solid rgba(45,212,191,.65)'

                              : '1px solid rgba(255,255,255,.08)',

                          background:
                            answerOpen &&
                            optionIndex ===
                              question.correct_index

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

                    )
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
                        : 'Show Answer'
                    }
                  </button>


                  <button
                    type="button"
                    className="secondary-btn"
                    disabled={
                      removingId ===
                      question.id
                    }
                    onClick={() =>
                      removeSavedQuestion(
                        question
                      )
                    }
                  >
                    {
                      removingId ===
                        question.id
                        ? 'Removing...'
                        : 'Remove from Revision'
                    }
                  </button>

                </div>

              </article>

            );
          }
        )}

      </div>

    </section>
  );
}

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


type ExamStage =
  | 'prelims'
  | 'mains';


type SyllabusTopic = {
  id: string;
  exam_stage: ExamStage;
  paper: string | null;
  subject: string;
  topic: string;
  parent_id: string | null;
  sort_order: number;
};


type ProgressRow = {
  topic_id: string;
  completion: number;
  revised_at: string | null;
};


type SubjectGroup = {
  subject: string;
  topics: SyllabusTopic[];
  progress: number;
};


function clampProgress(
  value:
    number
) {

  if (
    !Number.isFinite(
      value
    )
  ) {
    return 0;
  }


  return Math.min(
    100,
    Math.max(
      0,
      Math.round(
        value
      )
    )
  );
}


function getProgressLabel(
  value:
    number
) {

  if (
    value >=
    100
  ) {
    return 'Completed';
  }


  if (
    value >=
    75
  ) {
    return 'Revision';
  }


  if (
    value >=
    50
  ) {
    return 'Studied';
  }


  if (
    value >
    0
  ) {
    return 'Started';
  }


  return 'Not started';
}


function calculateAverage(
  topics:
    SyllabusTopic[],
  progressMap:
    Record<string, number>
) {

  if (
    topics.length ===
    0
  ) {
    return 0;
  }


  const total =
    topics.reduce(
      (
        sum,
        topic
      ) =>
        sum +
        (
          progressMap[
            topic.id
          ] ||
          0
        ),
      0
    );


  return Math.round(
    total /
    topics.length
  );
}


export function LearnPage() {

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
   * SYLLABUS DATA
   */

  const [
    topics,
    setTopics
  ] =
    useState<
      SyllabusTopic[]
    >([]);


  /*
   * STUDENT PROGRESS
   */

  const [
    progressMap,
    setProgressMap
  ] =
    useState<
      Record<
        string,
        number
      >
    >({});


  const [
    userId,
    setUserId
  ] =
    useState<
      string |
      null
    >(
      null
    );


  const [
    signedIn,
    setSignedIn
  ] =
    useState(false);


  const [
    savingTopicId,
    setSavingTopicId
  ] =
    useState<
      string |
      null
    >(
      null
    );


  /*
   * FILTERS
   */

  const [
    stage,
    setStage
  ] =
    useState<ExamStage>(
      'prelims'
    );


  const [
    paperFilter,
    setPaperFilter
  ] =
    useState(
      'all'
    );


  const [
    searchText,
    setSearchText
  ] =
    useState('');


  /*
   * LOAD SYLLABUS
   * AND USER PROGRESS
   */

  async function loadSyllabus() {

    if (!supabase) {

      setError(
        'Supabase is not configured.'
      );

      setLoading(
        false
      );

      return;
    }


    setLoading(
      true
    );

    setError('');
    setMessage('');


    /*
     * LOAD ALL SYLLABUS TOPICS
     */

    const {
      data:
        topicData,

      error:
        topicError
    } =
      await supabase
        .from(
          'syllabus_topics'
        )
        .select(
          `
          id,
          exam_stage,
          paper,
          subject,
          topic,
          parent_id,
          sort_order
          `
        )
        .order(
          'sort_order',
          {
            ascending:
              true
          }
        );


    if (
      topicError
    ) {

      console.error(
        'Unable to load syllabus:',
        topicError
      );


      setError(
        topicError.message
      );

      setLoading(
        false
      );

      return;
    }


    const cleanTopics =
      (
        topicData ||
        []
      ).map(
        item => ({

          id:
            String(
              item.id
            ),

          exam_stage:
            item.exam_stage as
              ExamStage,

          paper:
            item.paper
              ? String(
                  item.paper
                )
              : null,

          subject:
            String(
              item.subject ||
              'Other'
            ),

          topic:
            String(
              item.topic ||
              ''
            ),

          parent_id:
            item.parent_id
              ? String(
                  item.parent_id
                )
              : null,

          sort_order:
            Number(
              item.sort_order ||
              0
            )
        })
      );


    setTopics(
      cleanTopics
    );


    /*
     * CHECK CURRENT USER
     */

    const {
      data: {
        user
      }
    } =
      await supabase
        .auth
        .getUser();


    if (!user) {

      setSignedIn(
        false
      );

      setUserId(
        null
      );

      setProgressMap(
        {}
      );

      setLoading(
        false
      );

      return;
    }


    setSignedIn(
      true
    );

    setUserId(
      user.id
    );


    /*
     * LOAD THIS USER'S
     * SAVED PROGRESS
     */

    const {
      data:
        progressData,

      error:
        progressError
    } =
      await supabase
        .from(
          'user_progress'
        )
        .select(
          `
          topic_id,
          completion,
          revised_at
          `
        )
        .eq(
          'user_id',
          user.id
        );


    if (
      progressError
    ) {

      console.error(
        'Unable to load syllabus progress:',
        progressError
      );


      setError(
        progressError.message
      );

      setLoading(
        false
      );

      return;
    }


    const rows =
      (
        progressData ||
        []
      ) as
        ProgressRow[];


    const nextMap:
      Record<
        string,
        number
      > = {};


    rows.forEach(
      row => {

        nextMap[
          row.topic_id
        ] =
          clampProgress(
            Number(
              row.completion ||
              0
            )
          );
      }
    );


    setProgressMap(
      nextMap
    );


    setLoading(
      false
    );
  }


  useEffect(
    () => {

      void loadSyllabus();

    },
    []
  );


  /*
   * WHEN EXAM STAGE CHANGES,
   * RESET PAPER FILTER.
   */

  useEffect(
    () => {

      setPaperFilter(
        'all'
      );

      setSearchText('');

    },
    [
      stage
    ]
  );


  /*
   * SAVE ONE TOPIC
   */

  async function saveProgress(
    topicId:
      string,
    newValue:
      number
  ) {

    if (
      !supabase ||
      !userId
    ) {

      setMessage(
        'Sign in to save your syllabus progress.'
      );

      return;
    }


    const value =
      clampProgress(
        newValue
      );


    const previousValue =
      progressMap[
        topicId
      ] ||
      0;


    /*
     * UPDATE SCREEN
     * IMMEDIATELY
     */

    setProgressMap(
      current => ({
        ...current,

        [
          topicId
        ]:
          value
      })
    );


    setSavingTopicId(
      topicId
    );

    setMessage('');


    const {
      error:
        saveError
    } =
      await supabase
        .from(
          'user_progress'
        )
        .upsert(
          {
            user_id:
              userId,

            topic_id:
              topicId,

            completion:
              value,

            revised_at:
              new Date()
                .toISOString()
          },
          {
            onConflict:
              'user_id,topic_id'
          }
        );


    if (
      saveError
    ) {

      console.error(
        'Unable to save syllabus progress:',
        saveError
      );


      /*
       * RESTORE PREVIOUS
       * VALUE IF SAVE FAILS
       */

      setProgressMap(
        current => ({
          ...current,

          [
            topicId
          ]:
            previousValue
        })
      );


      setMessage(
        `Unable to save: ${saveError.message}`
      );

      setSavingTopicId(
        null
      );

      return;
    }


    setMessage(
      'Progress saved.'
    );


    setSavingTopicId(
      null
    );
  }


  /*
   * TOPICS FOR CURRENT
   * EXAM STAGE
   */

  const stageTopics =
    useMemo(
      () =>
        topics.filter(
          topic =>
            topic.exam_stage ===
            stage
        ),
      [
        topics,
        stage
      ]
    );


  /*
   * PAPER OPTIONS
   */

  const paperOptions =
    useMemo(
      () => {

        const values =
          new Set<string>();


        stageTopics.forEach(
          topic => {

            values.add(
              topic.paper ||
              'Other'
            );
          }
        );


        return Array.from(
          values
        );

      },
      [
        stageTopics
      ]
    );


  /*
   * FILTER TOPICS
   */

  const visibleTopics =
    useMemo(
      () => {

        const query =
          searchText
            .trim()
            .toLowerCase();


        return stageTopics.filter(
          topic => {

            const paper =
              topic.paper ||
              'Other';


            if (
              paperFilter !==
                'all' &&
              paper !==
                paperFilter
            ) {

              return false;
            }


            if (!query) {

              return true;
            }


            return (
              topic.subject
                .toLowerCase()
                .includes(
                  query
                ) ||

              topic.topic
                .toLowerCase()
                .includes(
                  query
                ) ||

              paper
                .toLowerCase()
                .includes(
                  query
                )
            );
          }
        );

      },
      [
        stageTopics,
        paperFilter,
        searchText
      ]
    );


  /*
   * GROUP BY SUBJECT
   */

  const subjectGroups =
    useMemo<
      SubjectGroup[]
    >(
      () => {

        const map =
          new Map<
            string,
            SyllabusTopic[]
          >();


        visibleTopics.forEach(
          topic => {

            const existing =
              map.get(
                topic.subject
              ) ||
              [];


            existing.push(
              topic
            );


            map.set(
              topic.subject,
              existing
            );
          }
        );


        return Array
          .from(
            map.entries()
          )
          .map(
            (
              [
                subject,
                subjectTopics
              ]
            ) => ({

              subject,

              topics:
                subjectTopics,

              progress:
                calculateAverage(
                  subjectTopics,
                  progressMap
                )
            })
          );

      },
      [
        visibleTopics,
        progressMap
      ]
    );


  /*
   * OVERALL STAGE PROGRESS
   */

  const overallProgress =
    useMemo(
      () =>
        calculateAverage(
          stageTopics,
          progressMap
        ),
      [
        stageTopics,
        progressMap
      ]
    );


  const completedTopics =
    useMemo(
      () =>
        stageTopics.filter(
          topic =>
            (
              progressMap[
                topic.id
              ] ||
              0
            ) >=
            100
        ).length,
      [
        stageTopics,
        progressMap
      ]
    );


  const startedTopics =
    useMemo(
      () =>
        stageTopics.filter(
          topic => {

            const value =
              progressMap[
                topic.id
              ] ||
              0;


            return (
              value >
                0 &&
              value <
                100
            );
          }
        ).length,
      [
        stageTopics,
        progressMap
      ]
    );


  return (

    <div
      className="page-wrap"
    >

      {/* HEADER */}

      <TopBar
        title="Learn"
        subtitle="Syllabus-first UPSC preparation"
      />


      {/* INTRODUCTION */}

      <section
        className="panel intro-strip"
      >

        <span
          className="eyebrow"
        >
          LIVE SYLLABUS TRACKER
        </span>


        <h2>
          Know exactly what you have studied.
        </h2>


        <p>
          Track every Prelims and Mains topic.
          Your progress is stored in your account
          and remains available across sessions.
        </p>

      </section>


      {/* EXAM STAGE SWITCHER */}

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
          EXAM STAGE
        </span>


        <div
          className="filter-row"
          style={{
            marginTop:
              '12px'
          }}
        >

          <button
            type="button"

            className={
              stage ===
                'prelims'
                ? 'filter active'
                : 'filter'
            }

            onClick={() =>
              setStage(
                'prelims'
              )
            }
          >
            Prelims
          </button>


          <button
            type="button"

            className={
              stage ===
                'mains'
                ? 'filter active'
                : 'filter'
            }

            onClick={() =>
              setStage(
                'mains'
              )
            }
          >
            Mains
          </button>

        </div>

      </section>


      {/* OVERALL PROGRESS */}

      <section
        style={{
          marginTop:
            '18px'
        }}
      >

        <div
          className="metrics-grid"
        >

          <article
            className="metric-card"
          >

            <div>

              <span>
                Overall Progress
              </span>


              <strong>
                {
                  loading
                    ? '...'
                    : `${overallProgress}%`
                }
              </strong>


              <small>
                {
                  stage ===
                    'prelims'
                    ? 'Prelims syllabus'
                    : 'Mains syllabus'
                }
              </small>

            </div>

          </article>


          <article
            className="metric-card"
          >

            <div>

              <span>
                Completed
              </span>


              <strong>
                {
                  loading
                    ? '...'
                    : completedTopics
                }
              </strong>


              <small>
                of {stageTopics.length} topics
              </small>

            </div>

          </article>


          <article
            className="metric-card"
          >

            <div>

              <span>
                In Progress
              </span>


              <strong>
                {
                  loading
                    ? '...'
                    : startedTopics
                }
              </strong>


              <small>
                Topics currently studied
              </small>

            </div>

          </article>

        </div>


        <div
          className="progress-track"
          style={{
            marginTop:
              '12px'
          }}
        >

          <span
            style={{
              width:
                `${overallProgress}%`
            }}
          />

        </div>

      </section>


      {/* SIGN-IN STATUS */}

      {!loading &&
        !signedIn && (

        <section
          className="panel"
          style={{
            marginTop:
              '18px',

            border:
              '1px solid rgba(245,158,11,.30)'
          }}
        >

          <strong>
            Viewing syllabus only
          </strong>


          <p
            style={{
              marginBottom:
                0
            }}
          >
            Sign in to save your personal
            syllabus progress.
          </p>

        </section>

      )}


      {/* MESSAGE */}

      {message && (

        <div
          className="callout"
          style={{
            marginTop:
              '16px'
          }}
        >
          {message}
        </div>

      )}


      {/* ERROR */}

      {error && (

        <div
          className="callout"
          style={{
            marginTop:
              '16px'
          }}
        >

          <strong>
            {error}
          </strong>

        </div>

      )}


      {/* FILTERS */}

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
              FILTER SYLLABUS
            </span>


            <h3>
              Find a paper or topic
            </h3>

          </div>


          <button
            type="button"
            className="secondary-btn"
            onClick={
              loadSyllabus
            }
          >
            Refresh
          </button>

        </div>


        <div
          style={{
            display:
              'grid',

            gridTemplateColumns:
              'repeat(auto-fit, minmax(190px, 1fr))',

            gap:
              '12px',

            marginTop:
              '14px'
          }}
        >

          {/* PAPER */}

          <label>

            <span
              style={{
                display:
                  'block',

                marginBottom:
                  '7px',

                fontSize:
                  '0.8rem',

                fontWeight:
                  700
              }}
            >
              Paper
            </span>


            <select
              value={
                paperFilter
              }

              onChange={
                event =>
                  setPaperFilter(
                    event
                      .target
                      .value
                  )
              }
            >

              <option
                value="all"
              >
                All Papers
              </option>


              {paperOptions.map(
                paper => (

                  <option
                    key={
                      paper
                    }
                    value={
                      paper
                    }
                  >
                    {paper}
                  </option>

                )
              )}

            </select>

          </label>


          {/* SEARCH */}

          <label>

            <span
              style={{
                display:
                  'block',

                marginBottom:
                  '7px',

                fontSize:
                  '0.8rem',

                fontWeight:
                  700
              }}
            >
              Search
            </span>


            <input
              type="search"

              value={
                searchText
              }

              onChange={
                event =>
                  setSearchText(
                    event
                      .target
                      .value
                  )
              }

              placeholder="Search subject or topic"

              style={{
                width:
                  '100%',

                minHeight:
                  '44px',

                padding:
                  '10px 12px',

                borderRadius:
                  '11px',

                border:
                  '1px solid rgba(255,255,255,.12)',

                background:
                  '#0e1525',

                color:
                  '#f8fafc',

                font:
                  'inherit'
              }}
            />

          </label>

        </div>

      </section>


      {/* LOADING */}

      {loading && (

        <section
          className="panel"
          style={{
            marginTop:
              '18px'
          }}
        >
          Loading syllabus...
        </section>

      )}


      {/* EMPTY */}

      {!loading &&
        visibleTopics.length ===
          0 && (

        <section
          className="panel"
          style={{
            marginTop:
              '18px'
          }}
        >

          <h3>
            No syllabus topics found
          </h3>


          <p>
            Try changing the paper filter
            or search text.
          </p>

        </section>

      )}


      {/* SUBJECT GROUPS */}

      {!loading &&
        subjectGroups.map(
          group => (

            <section
              className="panel"
              key={
                group.subject
              }
              style={{
                marginTop:
                  '18px'
              }}
            >

              {/* SUBJECT HEADER */}

              <div
                className="panel-head"
              >

                <div>

                  <span
                    className="eyebrow"
                  >
                    SUBJECT
                  </span>


                  <h3>
                    {group.subject}
                  </h3>


                  <small
                    style={{
                      color:
                        '#94a3b8'
                    }}
                  >
                    {
                      group.topics
                        .length
                    }{' '}
                    {
                      group.topics
                        .length ===
                        1
                        ? 'topic'
                        : 'topics'
                    }
                  </small>

                </div>


                <strong
                  style={{
                    fontSize:
                      '1.2rem'
                  }}
                >
                  {group.progress}%
                </strong>

              </div>


              <div
                className="progress-track"
                style={{
                  marginBottom:
                    '16px'
                }}
              >

                <span
                  style={{
                    width:
                      `${group.progress}%`
                  }}
                />

              </div>


              {/* TOPICS */}

              <div
                style={{
                  display:
                    'grid',

                  gap:
                    '10px'
                }}
              >

                {group.topics.map(
                  topic => {

                    const progress =
                      progressMap[
                        topic.id
                      ] ||
                      0;


                    const saving =
                      savingTopicId ===
                      topic.id;


                    return (

                      <article
                        key={
                          topic.id
                        }
                        style={{
                          padding:
                            '14px',

                          borderRadius:
                            '14px',

                          border:
                            '1px solid rgba(255,255,255,.08)',

                          background:
                            '#0e1525'
                        }}
                      >

                        {/* TOPIC INFO */}

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

                          <div
                            style={{
                              flex:
                                '1 1 240px'
                            }}
                          >

                            <span
                              className="tag"
                            >
                              {
                                topic.paper ||
                                'General'
                              }
                            </span>


                            <h4
                              style={{
                                margin:
                                  '10px 0 5px'
                              }}
                            >
                              {topic.topic}
                            </h4>


                            <small
                              style={{
                                color:
                                  '#94a3b8'
                              }}
                            >
                              {
                                getProgressLabel(
                                  progress
                                )
                              }
                            </small>

                          </div>


                          <strong
                            style={{
                              fontSize:
                                '1.05rem'
                            }}
                          >
                            {progress}%
                          </strong>

                        </div>


                        {/* TOPIC PROGRESS BAR */}

                        <div
                          className="progress-track"
                          style={{
                            marginTop:
                              '12px'
                          }}
                        >

                          <span
                            style={{
                              width:
                                `${progress}%`
                            }}
                          />

                        </div>


                        {/* PROGRESS SELECT */}

                        <div
                          style={{
                            marginTop:
                              '12px',

                            display:
                              'grid',

                            gridTemplateColumns:
                              'minmax(160px, 240px) auto',

                            gap:
                              '10px',

                            alignItems:
                              'center'
                          }}
                        >

                          <select
                            aria-label={
                              `Progress for ${topic.topic}`
                            }

                            value={
                              progress
                            }

                            disabled={
                              !signedIn ||
                              saving
                            }

                            onChange={
                              event => {

                                void saveProgress(
                                  topic.id,
                                  Number(
                                    event
                                      .target
                                      .value
                                  )
                                );
                              }
                            }
                          >

                            <option value="0">
                              0% - Not started
                            </option>

                            <option value="10">
                              10%
                            </option>

                            <option value="20">
                              20%
                            </option>

                            <option value="30">
                              30%
                            </option>

                            <option value="40">
                              40%
                            </option>

                            <option value="50">
                              50% - Studied
                            </option>

                            <option value="60">
                              60%
                            </option>

                            <option value="70">
                              70%
                            </option>

                            <option value="80">
                              80%
                            </option>

                            <option value="90">
                              90%
                            </option>

                            <option value="100">
                              100% - Completed
                            </option>

                          </select>


                          <small
                            style={{
                              color:
                                saving
                                  ? '#14b8a6'
                                  : '#94a3b8',

                              whiteSpace:
                                'nowrap'
                            }}
                          >

                            {
                              saving
                                ? 'Saving...'
                                : signedIn
                                ? 'Saved online'
                                : 'Sign in'
                            }

                          </small>

                        </div>

                      </article>

                    );
                  }
                )}

              </div>

            </section>

          )
        )}

    </div>
  );
}

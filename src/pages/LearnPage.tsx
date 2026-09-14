import {
  useEffect,
  useMemo,
  useState
} from 'react';

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


type LearnPageProps = {
  initialSubject?:
    string |
    null;
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
    Record<
      string,
      number
    >
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


export function LearnPage({
  initialSubject =
    null
}: LearnPageProps) {

  const [
    loading,
    setLoading
  ] =
    useState(
      true
    );


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


  const [
    topics,
    setTopics
  ] =
    useState<
      SyllabusTopic[]
    >([]);


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
    useState(
      false
    );


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


  const [
    filtersOpen,
    setFiltersOpen
  ] =
    useState(
      false
    );


  const [
    expandedSubject,
    setExpandedSubject
  ] =
    useState<
      string |
      null
    >(
      null
    );


  const [
    showCompleted,
    setShowCompleted
  ] =
    useState(
      false
    );


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


      setProgressMap(
        {}
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


  useEffect(
    () => {

      if (
        initialSubject
      ) {

        setStage(
          'prelims'
        );


        setSearchText(
          initialSubject
        );


        setFiltersOpen(
          true
        );

      } else {

        setSearchText('');
      }


      setPaperFilter(
        'all'
      );

    },
    [
      initialSubject
    ]
  );


  useEffect(
    () => {

      setPaperFilter(
        'all'
      );


      setExpandedSubject(
        null
      );


      setShowCompleted(
        false
      );

    },
    [
      stage
    ]
  );


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
          )
          .sort(
            (
              first,
              second
            ) =>
              first.subject
                .localeCompare(
                  second.subject
                )
          );

      },
      [
        visibleTopics,
        progressMap
      ]
    );


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


  function toggleSubject(
    subject:
      string
  ) {

    setExpandedSubject(
      current =>
        current ===
          subject
          ? null
          : subject
    );


    setShowCompleted(
      false
    );
  }


  return (

    <>

      {/* =====================================
          COMPACT STAGE + PROGRESS
      ===================================== */}

      <section
        className="panel"

        style={{
          padding:
            '16px'
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

            <span
              className="eyebrow"
            >
              SYLLABUS TRACKER
            </span>


            <h3
              style={{
                margin:
                  '5px 0 2px'
              }}
            >
              {stage ===
                'prelims'
                ? 'Prelims'
                : 'Mains'}
              {' '}
              Progress
            </h3>

          </div>


          <strong
            style={{
              fontSize:
                '1.6rem',

              color:
                '#5eead4'
            }}
          >
            {
              loading
                ? '...'
                : `${overallProgress}%`
            }
          </strong>

        </div>


        <div
          className="progress-track"

          style={{
            marginTop:
              '10px'
          }}
        >

          <span
            style={{
              width:
                `${overallProgress}%`
            }}
          />

        </div>


        <div
          style={{
            display:
              'flex',

            gap:
              '10px',

            flexWrap:
              'wrap',

            marginTop:
              '9px',

            color:
              '#94a3b8',

            fontSize:
              '.78rem'
          }}
        >

          <span>
            {completedTopics}/{stageTopics.length}
            {' '}
            completed
          </span>


          <span>
            {startedTopics}
            {' '}
            in progress
          </span>

        </div>


        <div
          style={{
            display:
              'grid',

            gridTemplateColumns:
              'repeat(2, minmax(0, 1fr))',

            gap:
              '8px',

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

            style={{
              width:
                '100%',

              minWidth:
                0
            }}

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

            style={{
              width:
                '100%',

              minWidth:
                0
            }}

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


      {/* =====================================
          FILTER BAR
      ===================================== */}

      <section
        className="panel"

        style={{
          marginTop:
            '10px',

          padding:
            '13px 14px'
        }}
      >

        <button
          type="button"

          className="secondary-btn"

          style={{
            width:
              '100%',

            minHeight:
              '42px',

            justifyContent:
              'space-between'
          }}

          onClick={() =>
            setFiltersOpen(
              current =>
                !current
            )
          }
        >

          <span>
            Filter / Search
          </span>

          <span>
            {filtersOpen
              ? 'Hide'
              : 'Open'}
          </span>

        </button>


        {filtersOpen && (

          <div
            style={{
              display:
                'grid',

              gridTemplateColumns:
                'repeat(auto-fit, minmax(180px, 1fr))',

              gap:
                '10px',

              marginTop:
                '12px'
            }}
          >

            <label>

              <span
                style={{
                  display:
                    'block',

                  marginBottom:
                    '6px',

                  fontSize:
                    '.78rem',

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


            <label>

              <span
                style={{
                  display:
                    'block',

                  marginBottom:
                    '6px',

                  fontSize:
                    '.78rem',

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

                placeholder="Subject or topic"

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


            <button
              type="button"

              className="text-btn"

              onClick={() => {

                setPaperFilter(
                  'all'
                );

                setSearchText('');

              }}

              style={{
                alignSelf:
                  'end'
              }}
            >
              Clear filters
            </button>

          </div>

        )}

      </section>


      {/* =====================================
          STATUS MESSAGES
      ===================================== */}

      {!loading &&
        !signedIn && (

        <div
          className="callout"

          style={{
            marginTop:
              '10px'
          }}
        >
          Sign in to save personal syllabus progress.
        </div>

      )}


      {message && (

        <div
          className="callout"

          style={{
            marginTop:
              '10px'
          }}
        >
          {message}
        </div>

      )}


      {error && (

        <div
          className="callout"

          style={{
            marginTop:
              '10px'
          }}
        >
          <strong>
            {error}
          </strong>
        </div>

      )}


      {loading && (

        <section
          className="panel"

          style={{
            marginTop:
              '10px'
          }}
        >
          Loading syllabus...
        </section>

      )}


      {!loading &&
        visibleTopics.length ===
          0 && (

        <section
          className="panel"

          style={{
            marginTop:
              '10px'
          }}
        >

          <h3>
            No syllabus topics found
          </h3>


          <p
            style={{
              marginBottom:
                0
            }}
          >
            Change the paper filter or search text.
          </p>

        </section>

      )}


      {/* =====================================
          SUBJECT ACCORDION
      ===================================== */}

      {!loading &&
        subjectGroups.length >
          0 && (

        <section
          style={{
            display:
              'grid',

            gap:
              '9px',

            marginTop:
              '10px'
          }}
        >

          {subjectGroups.map(
            group => {

              const expanded =
                expandedSubject ===
                group.subject;


              const completedInGroup =
                group.topics.filter(
                  topic =>
                    (
                      progressMap[
                        topic.id
                      ] ||
                      0
                    ) >=
                    100
                ).length;


              const activeTopics =
                group.topics.filter(
                  topic =>
                    (
                      progressMap[
                        topic.id
                      ] ||
                      0
                    ) <
                    100
                );


              const completedGroupTopics =
                group.topics.filter(
                  topic =>
                    (
                      progressMap[
                        topic.id
                      ] ||
                      0
                    ) >=
                    100
                );


              const topicsToShow =
                showCompleted
                  ? [
                      ...activeTopics,
                      ...completedGroupTopics
                    ]
                  : activeTopics;


              return (

                <article
                  className="panel"

                  key={
                    group.subject
                  }

                  style={{
                    padding:
                      '14px'
                  }}
                >

                  <button
                    type="button"

                    onClick={() =>
                      toggleSubject(
                        group.subject
                      )
                    }

                    style={{
                      width:
                        '100%',

                      padding:
                        0,

                      border:
                        0,

                      background:
                        'transparent',

                      color:
                        'inherit',

                      display:
                        'grid',

                      gridTemplateColumns:
                        '1fr auto',

                      gap:
                        '12px',

                      alignItems:
                        'center',

                      textAlign:
                        'left',

                      cursor:
                        'pointer',

                      whiteSpace:
                        'normal'
                    }}
                  >

                    <div
                      style={{
                        minWidth:
                          0
                      }}
                    >

                      <strong
                        style={{
                          display:
                            'block',

                          fontSize:
                            '1rem'
                        }}
                      >
                        {group.subject}
                      </strong>


                      <small
                        style={{
                          display:
                            'block',

                          marginTop:
                            '4px',

                          color:
                            '#94a3b8'
                        }}
                      >
                        {completedInGroup}/{group.topics.length}
                        {' '}
                        completed
                      </small>


                      <div
                        className="progress-track"

                        style={{
                          marginTop:
                            '8px'
                        }}
                      >

                        <span
                          style={{
                            width:
                              `${group.progress}%`
                          }}
                        />

                      </div>

                    </div>


                    <div
                      style={{
                        textAlign:
                          'right',

                        minWidth:
                          '56px'
                      }}
                    >

                      <strong
                        style={{
                          display:
                            'block',

                          color:
                            '#5eead4'
                        }}
                      >
                        {group.progress}%
                      </strong>


                      <small
                        style={{
                          color:
                            '#94a3b8'
                        }}
                      >
                        {expanded
                          ? 'Close'
                          : 'Open'}
                      </small>

                    </div>

                  </button>


                  {expanded && (

                    <div
                      style={{
                        marginTop:
                          '12px',

                        paddingTop:
                          '12px',

                        borderTop:
                          '1px solid rgba(255,255,255,.08)'
                      }}
                    >

                      {activeTopics.length ===
                        0 &&
                        !showCompleted && (

                        <div
                          className="callout"
                        >
                          All topics in this subject are completed.
                        </div>

                      )}


                      <div
                        style={{
                          display:
                            'grid',

                          gap:
                            '8px'
                        }}
                      >

                        {topicsToShow.map(
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

                              <div
                                key={
                                  topic.id
                                }

                                style={{
                                  display:
                                    'grid',

                                  gridTemplateColumns:
                                    'minmax(0, 1fr) minmax(120px, 160px)',

                                  gap:
                                    '10px',

                                  alignItems:
                                    'center',

                                  padding:
                                    '11px 12px',

                                  borderRadius:
                                    '12px',

                                  border:
                                    '1px solid rgba(255,255,255,.07)',

                                  background:
                                    '#0e1525'
                                }}
                              >

                                <div
                                  style={{
                                    minWidth:
                                      0
                                  }}
                                >

                                  <strong
                                    style={{
                                      display:
                                        'block',

                                      overflowWrap:
                                        'anywhere'
                                    }}
                                  >
                                    {topic.topic}
                                  </strong>


                                  <small
                                    style={{
                                      display:
                                        'block',

                                      marginTop:
                                        '4px',

                                      color:
                                        '#94a3b8'
                                    }}
                                  >
                                    {topic.paper ||
                                      'General'}
                                    {' • '}
                                    {getProgressLabel(
                                      progress
                                    )}
                                  </small>

                                </div>


                                <div>

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

                                    style={{
                                      width:
                                        '100%'
                                    }}
                                  >

                                    <option value="0">
                                      0%
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
                                      50%
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
                                      100%
                                    </option>

                                  </select>


                                  <small
                                    style={{
                                      display:
                                        'block',

                                      marginTop:
                                        '4px',

                                      textAlign:
                                        'right',

                                      color:
                                        saving
                                          ? '#5eead4'
                                          : '#64748b'
                                    }}
                                  >
                                    {saving
                                      ? 'Saving...'
                                      : `${progress}%`}
                                  </small>

                                </div>

                              </div>

                            );

                          }
                        )}

                      </div>


                      {completedGroupTopics.length >
                        0 && (

                        <button
                          type="button"

                          className="text-btn"

                          onClick={() =>
                            setShowCompleted(
                              current =>
                                !current
                            )
                          }

                          style={{
                            width:
                              '100%',

                            marginTop:
                              '10px',

                            textAlign:
                              'center'
                          }}
                        >

                          {showCompleted
                            ? 'Hide completed topics'
                            : `Show completed (${completedGroupTopics.length})`}

                        </button>

                      )}

                    </div>

                  )}

                </article>

              );

            }
          )}

        </section>

      )}

    </>

  );
}

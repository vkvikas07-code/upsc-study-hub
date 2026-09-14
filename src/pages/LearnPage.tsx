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


type LearnPageProps = {
  initialSubject?: string | null;
};


function clampProgress(
  value: number
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


function average(
  values: number[]
) {

  if (
    values.length ===
    0
  ) {
    return 0;
  }

  const total =
    values.reduce(
      (
        sum,
        value
      ) =>
        sum + value,
      0
    );

  return Math.round(
    total /
    values.length
  );
}


export function LearnPage({
  initialSubject = null
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
    stage,
    setStage
  ] =
    useState<ExamStage>(
      'prelims'
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
    expandedTopic,
    setExpandedTopic
  ] =
    useState<
      string |
      null
    >(
      null
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

      setError(
        topicError.message
      );

      setLoading(
        false
      );

      return;
    }


    const cleanTopics:
      SyllabusTopic[] =
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

      setError(
        progressError.message
      );

      setLoading(
        false
      );

      return;
    }


    const nextMap:
      Record<
        string,
        number
      > = {};


    (
      progressData ||
      []
    ).forEach(
      item => {

        const row =
          item as
            ProgressRow;

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

        setExpandedSubject(
          initialSubject
        );
      }

    },
    [
      initialSubject
    ]
  );


  useEffect(
    () => {

      setExpandedTopic(
        null
      );

    },
    [
      stage
    ]
  );


  async function saveProgress(
    topicId: string,
    newValue: number
  ) {

    if (
      !supabase ||
      !userId
    ) {

      setMessage(
        'Sign in to save progress.'
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
        [topicId]:
          value
      })
    );


    setSavingTopicId(
      topicId
    );


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

      setProgressMap(
        current => ({
          ...current,
          [topicId]:
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
      `${value}% completed saved.`
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


  const childrenMap =
    useMemo(
      () => {

        const map =
          new Map<
            string,
            SyllabusTopic[]
          >();


        stageTopics.forEach(
          topic => {

            if (
              !topic.parent_id
            ) {
              return;
            }


            const existing =
              map.get(
                topic.parent_id
              ) ||
              [];


            existing.push(
              topic
            );


            existing.sort(
              (
                first,
                second
              ) =>
                first.sort_order -
                second.sort_order
            );


            map.set(
              topic.parent_id,
              existing
            );

          }
        );


        return map;

      },
      [
        stageTopics
      ]
    );


  function getLeafIds(
    topicId: string,
    visited =
      new Set<string>()
  ):
    string[] {

    if (
      visited.has(
        topicId
      )
    ) {
      return [];
    }


    const nextVisited =
      new Set(
        visited
      );


    nextVisited.add(
      topicId
    );


    const children =
      childrenMap.get(
        topicId
      ) ||
      [];


    if (
      children.length ===
      0
    ) {

      return [
        topicId
      ];
    }


    return children.flatMap(
      child =>
        getLeafIds(
          child.id,
          nextVisited
        )
    );
  }


  function topicProgress(
    topicId: string
  ) {

    const leafIds =
      getLeafIds(
        topicId
      );


    return average(
      leafIds.map(
        id =>
          progressMap[
            id
          ] ||
          0
      )
    );
  }


  const subjectNames =
    useMemo(
      () => {

        return Array.from(
          new Set(
            stageTopics.map(
              topic =>
                topic.subject
            )
          )
        ).sort();

      },
      [
        stageTopics
      ]
    );


  function rootTopicsForSubject(
    subject: string
  ) {

    const ids =
      new Set(
        stageTopics
          .filter(
            item =>
              item.subject ===
              subject
          )
          .map(
            item =>
              item.id
          )
      );


    return stageTopics
      .filter(
        topic =>
          topic.subject ===
            subject &&
          (
            !topic.parent_id ||
            !ids.has(
              topic.parent_id
            )
          )
      )
      .sort(
        (
          first,
          second
        ) =>
          first.sort_order -
          second.sort_order
      );
  }


  function renderSubtypes(
    parent:
      SyllabusTopic
  ) {

    const children =
      childrenMap.get(
        parent.id
      ) ||
      [];


    if (
      children.length ===
      0
    ) {

      return null;
    }


    return (

      <div
        style={{
          marginTop:
            '10px',

          display:
            'grid',

          gap:
            '8px'
        }}
      >

        {children.map(
          child => {

            const grandchildren =
              childrenMap.get(
                child.id
              ) ||
              [];


            const hasNested =
              grandchildren.length >
              0;


            const progress =
              topicProgress(
                child.id
              );


            return (

              <div
                key={
                  child.id
                }

                style={{
                  border:
                    '1px solid rgba(255,255,255,.08)',

                  borderRadius:
                    '12px',

                  background:
                    '#0e1525',

                  padding:
                    '11px 12px'
                }}
              >

                <div
                  style={{
                    display:
                      'grid',

                    gridTemplateColumns:
                      'minmax(0,1fr) auto',

                    gap:
                      '10px',

                    alignItems:
                      'center'
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
                      {child.topic}
                    </strong>


                    <small
                      style={{
                        display:
                          'block',

                        marginTop:
                          '4px',

                        color:
                          '#5eead4',

                        fontWeight:
                          700
                      }}
                    >
                      {progress}% completed
                    </small>

                  </div>


                  {!hasNested && (

                    <select
                      value={
                        progress
                      }

                      disabled={
                        !signedIn ||
                        savingTopicId ===
                          child.id
                      }

                      onChange={
                        event => {

                          void saveProgress(
                            child.id,
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

                  )}

                </div>


                {hasNested &&
                  renderSubtypes(
                    child
                  )}

              </div>

            );

          }
        )}

      </div>

    );
  }


  function renderMainTopic(
    topic:
      SyllabusTopic
  ) {

    const children =
      childrenMap.get(
        topic.id
      ) ||
      [];


    const hasChildren =
      children.length >
      0;


    const progress =
      topicProgress(
        topic.id
      );


    const expanded =
      expandedTopic ===
      topic.id;


    return (

      <article
        key={
          topic.id
        }

        style={{
          border:
            '1px solid rgba(255,255,255,.08)',

          borderRadius:
            '14px',

          background:
            'rgba(255,255,255,.025)',

          padding:
            '13px'
        }}
      >

        <div
          style={{
            display:
              'grid',

            gridTemplateColumns:
              'minmax(0,1fr) auto',

            gap:
              '12px',

            alignItems:
              'center'
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
              {topic.topic}
            </strong>


            <small
              style={{
                display:
                  'block',

                marginTop:
                  '4px',

                color:
                  '#5eead4',

                fontWeight:
                  700
              }}
            >
              {progress}% completed
            </small>

          </div>


          {hasChildren ? (

            <button
              type="button"

              className="secondary-btn"

              onClick={() =>
                setExpandedTopic(
                  current =>
                    current ===
                      topic.id
                      ? null
                      : topic.id
                )
              }
            >
              {expanded
                ? 'Hide'
                : 'Subtypes'}
            </button>

          ) : (

            <select
              value={
                progress
              }

              disabled={
                !signedIn ||
                savingTopicId ===
                  topic.id
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

          )}

        </div>


        {hasChildren &&
          expanded &&
          renderSubtypes(
            topic
          )}

      </article>

    );
  }


  return (

    <>

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
              'grid',

            gridTemplateColumns:
              'repeat(2,minmax(0,1fr))',

            gap:
              '8px'
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


      {!loading &&
        !signedIn && (

        <div
          className="callout"

          style={{
            marginTop:
              '10px'
          }}
        >
          Sign in to save progress percentages.
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
          {error}
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
        subjectNames.map(
          subject => {

            const expanded =
              expandedSubject ===
              subject;


            const rootTopics =
              rootTopicsForSubject(
                subject
              );


            const subjectProgress =
              average(
                rootTopics.flatMap(
                  topic =>
                    getLeafIds(
                      topic.id
                    )
                ).map(
                  id =>
                    progressMap[
                      id
                    ] ||
                    0
                )
              );


            return (

              <section
                className="panel"

                key={
                  subject
                }

                style={{
                  marginTop:
                    '10px',

                  padding:
                    '14px'
                }}
              >

                <button
                  type="button"

                  onClick={() =>
                    setExpandedSubject(
                      current =>
                        current ===
                          subject
                          ? null
                          : subject
                    )
                  }

                  style={{
                    width:
                      '100%',

                    border:
                      0,

                    background:
                      'transparent',

                    color:
                      'inherit',

                    display:
                      'grid',

                    gridTemplateColumns:
                      'minmax(0,1fr) auto',

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

                  <div>

                    <strong>
                      {subject}
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
                      {subjectProgress}% completed
                    </small>

                  </div>


                  <span
                    style={{
                      color:
                        '#5eead4',

                      fontWeight:
                        700
                    }}
                  >
                    {expanded
                      ? 'Close'
                      : 'Open'}
                  </span>

                </button>


                {expanded && (

                  <div
                    style={{
                      display:
                        'grid',

                      gap:
                        '9px',

                      marginTop:
                        '12px',

                      paddingTop:
                        '12px',

                      borderTop:
                        '1px solid rgba(255,255,255,.08)'
                    }}
                  >

                    {rootTopics.map(
                      topic =>
                        renderMainTopic(
                          topic
                        )
                    )}

                  </div>

                )}

              </section>

            );

          }
        )}

    </>

  );
}

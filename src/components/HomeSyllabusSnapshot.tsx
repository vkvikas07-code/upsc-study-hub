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


type TopicRow = {
  id: string;
  exam_stage: ExamStage;
};


type ProgressRow = {
  topic_id: string;
  completion: number;
};


type Props = {
  onOpenSyllabus: () => void;
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


export function HomeSyllabusSnapshot({
  onOpenSyllabus
}: Props) {

  const [
    topics,
    setTopics
  ] =
    useState<TopicRow[]>(
      []
    );


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
    loading,
    setLoading
  ] =
    useState(true);


  const [
    signedIn,
    setSignedIn
  ] =
    useState(false);


  const [
    error,
    setError
  ] =
    useState('');


  /*
   * LOAD SYLLABUS
   * + USER PROGRESS
   */

  async function loadSnapshot() {

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
          'id, exam_stage'
        );


    if (
      topicError
    ) {

      console.error(
        'Unable to load Home syllabus topics:',
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
      )
        .filter(
          item =>
            item.exam_stage ===
              'prelims' ||
            item.exam_stage ===
              'mains'
        )
        .map(
          item => ({
            id:
              String(
                item.id
              ),

            exam_stage:
              item.exam_stage as
                ExamStage
          })
        );


    setTopics(
      cleanTopics
    );


    /*
     * CHECK USER
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


    /*
     * LOAD USER PROGRESS
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
          'topic_id, completion'
        )
        .eq(
          'user_id',
          user.id
        );


    if (
      progressError
    ) {

      console.error(
        'Unable to load Home syllabus progress:',
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

      void loadSnapshot();

    },
    []
  );


  /*
   * TOPICS BY STAGE
   */

  const prelimsTopics =
    useMemo(
      () =>
        topics.filter(
          topic =>
            topic.exam_stage ===
            'prelims'
        ),
      [
        topics
      ]
    );


  const mainsTopics =
    useMemo(
      () =>
        topics.filter(
          topic =>
            topic.exam_stage ===
            'mains'
        ),
      [
        topics
      ]
    );


  /*
   * CALCULATE ONE STAGE
   */

  function stageStats(
    stageTopics:
      TopicRow[]
  ) {

    if (
      stageTopics.length ===
      0
    ) {

      return {
        progress:
          0,

        completed:
          0,

        started:
          0
      };
    }


    let total =
      0;


    let completed =
      0;


    let started =
      0;


    stageTopics.forEach(
      topic => {

        const value =
          progressMap[
            topic.id
          ] ||
          0;


        total +=
          value;


        if (
          value >=
          100
        ) {

          completed +=
            1;

        } else if (
          value >
          0
        ) {

          started +=
            1;
        }
      }
    );


    return {

      progress:
        Math.round(
          total /
          stageTopics.length
        ),

      completed,

      started
    };
  }


  const prelimsStats =
    useMemo(
      () =>
        stageStats(
          prelimsTopics
        ),
      [
        prelimsTopics,
        progressMap
      ]
    );


  const mainsStats =
    useMemo(
      () =>
        stageStats(
          mainsTopics
        ),
      [
        mainsTopics,
        progressMap
      ]
    );


  return (

    <article
      className="panel syllabus-card"
    >

      {/* HEADER */}

      <div
        className="panel-head"
      >

        <div>

          <span
            className="eyebrow"
          >
            SYLLABUS TRACKER
          </span>


          <h3>
            Your syllabus progress
          </h3>

        </div>


        <button
          type="button"
          className="text-btn"
          onClick={
            loadSnapshot
          }
        >
          Refresh
        </button>

      </div>


      {/* LOADING */}

      {loading && (

        <p>
          Loading syllabus progress...
        </p>

      )}


      {/* ERROR */}

      {!loading &&
        error && (

        <div
          className="callout"
        >
          {error}
        </div>

      )}


      {/* SIGNED OUT */}

      {!loading &&
        !error &&
        !signedIn && (

        <>

          <p>
            Sign in to track your
            Prelims and Mains syllabus
            progress.
          </p>


          <button
            type="button"
            className="secondary-btn"
            onClick={
              onOpenSyllabus
            }
          >
            View syllabus
          </button>

        </>

      )}


      {/* SIGNED IN */}

      {!loading &&
        !error &&
        signedIn && (

        <>

          {/* PRELIMS */}

          <div
            style={{
              marginTop:
                '14px',

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

                justifyContent:
                  'space-between',

                gap:
                  '12px',

                alignItems:
                  'center'
              }}
            >

              <div>

                <strong>
                  Prelims
                </strong>


                <div
                  style={{
                    marginTop:
                      '4px',

                    color:
                      '#94a3b8',

                    fontSize:
                      '0.78rem'
                  }}
                >

                  {
                    prelimsStats
                      .completed
                  }/{prelimsTopics.length}
                  {' '}
                  completed

                </div>

              </div>


              <strong
                style={{
                  fontSize:
                    '1.2rem'
                }}
              >
                {
                  prelimsStats
                    .progress
                }%
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
                    `${prelimsStats.progress}%`
                }}
              />

            </div>


            {prelimsStats.started >
              0 && (

              <small
                style={{
                  display:
                    'block',

                  marginTop:
                    '7px',

                  color:
                    '#94a3b8'
                }}
              >
                {
                  prelimsStats
                    .started
                }{' '}
                topics in progress
              </small>

            )}

          </div>


          {/* MAINS */}

          <div
            style={{
              marginTop:
                '10px',

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

                justifyContent:
                  'space-between',

                gap:
                  '12px',

                alignItems:
                  'center'
              }}
            >

              <div>

                <strong>
                  Mains
                </strong>


                <div
                  style={{
                    marginTop:
                      '4px',

                    color:
                      '#94a3b8',

                    fontSize:
                      '0.78rem'
                  }}
                >

                  {
                    mainsStats
                      .completed
                  }/{mainsTopics.length}
                  {' '}
                  completed

                </div>

              </div>


              <strong
                style={{
                  fontSize:
                    '1.2rem'
                }}
              >
                {
                  mainsStats
                    .progress
                }%
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
                    `${mainsStats.progress}%`
                }}
              />

            </div>


            {mainsStats.started >
              0 && (

              <small
                style={{
                  display:
                    'block',

                  marginTop:
                    '7px',

                  color:
                    '#94a3b8'
                }}
              >
                {
                  mainsStats
                    .started
                }{' '}
                topics in progress
              </small>

            )}

          </div>


          {/* OPEN FULL TRACKER */}

          <button
            type="button"
            className="secondary-btn"
            onClick={
              onOpenSyllabus
            }
            style={{
              marginTop:
                '14px'
            }}
          >
            Open full tracker
          </button>

        </>

      )}

    </article>

  );
}

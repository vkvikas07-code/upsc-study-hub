import {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


type BookRow = {
  id: string;
  title: string;
  subject: string;
};


type TopicRow = {
  id: string;
  book_id: string;
  subject: string;

  parent_id:
    string |
    null;

  is_active: boolean;
};


type ProgressRow = {
  book_topic_id: string;
  completed: boolean;

  revision_count:
    number |
    string |
    null;
};


type ProgressState = {
  completed: boolean;
  revisionCount: number;
};


type SubjectSummary = {
  subject: string;

  total: number;

  read: number;
  revision1: number;
  revision2: number;
  final: number;

  readPercent: number;
  revision1Percent: number;
  revision2Percent: number;
  finalPercent: number;
};


type HomeBookProgressSnapshotProps = {
  onOpenTracker: () => void;
};


const EMPTY_PROGRESS:
  ProgressState = {

  completed:
    false,

  revisionCount:
    0
};


/*
 * SAFE NUMBER
 */

function safeNumber(
  value:
    unknown
) {

  const number =
    Number(
      value
    );


  return Number.isFinite(
    number
  )
    ? number
    : 0;
}


/*
 * REVISION COUNT
 */

function cleanRevisionCount(
  value:
    unknown
) {

  return Math.min(
    3,
    Math.max(
      0,
      Math.round(
        safeNumber(
          value
        )
      )
    )
  );
}


/*
 * PERCENT
 */

function percentage(
  completed:
    number,
  total:
    number
) {

  if (
    total <=
    0
  ) {

    return 0;
  }


  return Math.round(
    (
      completed /
      total
    ) *
    100
  );
}


/*
 * HOME BOOK PROGRESS SNAPSHOT
 */

export function HomeBookProgressSnapshot({
  onOpenTracker
}: HomeBookProgressSnapshotProps) {

  /*
   * =========================================
   * DATA
   * =========================================
   */

  const [
    books,
    setBooks
  ] =
    useState<
      BookRow[]
    >([]);


  const [
    topics,
    setTopics
  ] =
    useState<
      TopicRow[]
    >([]);


  const [
    progressByTopic,
    setProgressByTopic
  ] =
    useState<
      Record<
        string,
        ProgressState
      >
    >({});


  /*
   * PAGE STATE
   */

  const [
    loading,
    setLoading
  ] =
    useState(
      true
    );


  const [
    signedIn,
    setSignedIn
  ] =
    useState(
      false
    );


  const [
    error,
    setError
  ] =
    useState('');


  /*
   * =========================================
   * LOAD SNAPSHOT
   * =========================================
   */

  async function loadSnapshot() {

    const client =
      supabase;


    if (!client) {

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
     * LOAD PUBLISHED
     * STANDARD BOOKS
     */

    const {
      data:
        bookData,

      error:
        bookError
    } =
      await client
        .from(
          'study_resources'
        )
        .select(
          `
          id,
          title,
          subject
          `
        )
        .eq(
          'resource_type',
          'standard_book'
        )
        .eq(
          'status',
          'published'
        )
        .order(
          'subject',
          {
            ascending:
              true
          }
        )
        .order(
          'title',
          {
            ascending:
              true
          }
        );


    if (
      bookError
    ) {

      console.error(
        'Unable to load Home book progress books:',
        bookError
      );


      setError(
        bookError.message
      );


      setLoading(
        false
      );


      return;
    }


    const cleanBooks:
      BookRow[] =
        (
          bookData ||
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

            subject:
              String(
                item.subject ||
                'General'
              )

          })
        );


    setBooks(
      cleanBooks
    );


    /*
     * NO BOOKS
     */

    if (
      cleanBooks.length ===
      0
    ) {

      setTopics(
        []
      );


      setProgressByTopic(
        {}
      );


      setSignedIn(
        false
      );


      setLoading(
        false
      );


      return;
    }


    /*
     * LOAD ACTIVE TOPICS
     * ONLY FOR PUBLISHED BOOKS
     */

    const bookIds =
      cleanBooks.map(
        book =>
          book.id
      );


    const {
      data:
        topicData,

      error:
        topicError
    } =
      await client
        .from(
          'book_topics'
        )
        .select(
          `
          id,
          book_id,
          subject,
          parent_id,
          is_active
          `
        )
        .in(
          'book_id',
          bookIds
        )
        .eq(
          'is_active',
          true
        );


    if (
      topicError
    ) {

      console.error(
        'Unable to load Home book topics:',
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


    const cleanTopics:
      TopicRow[] =
        (
          topicData ||
          []
        ).map(
          item => ({

            id:
              String(
                item.id
              ),

            book_id:
              String(
                item.book_id
              ),

            subject:
              String(
                item.subject ||
                ''
              ),

            parent_id:
              item.parent_id
                ? String(
                    item.parent_id
                  )
                : null,

            is_active:
              item.is_active !==
              false

          })
        );


    setTopics(
      cleanTopics
    );


    /*
     * CURRENT USER
     */

    const {
      data: {
        user
      }
    } =
      await client
        .auth
        .getUser();


    if (!user) {

      setSignedIn(
        false
      );


      setProgressByTopic(
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
     * LOAD READ +
     * REVISION PROGRESS
     */

    const {
      data:
        progressData,

      error:
        progressError
    } =
      await client
        .from(
          'book_topic_progress'
        )
        .select(
          `
          book_topic_id,
          completed,
          revision_count
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
        'Unable to load Home book progress:',
        progressError
      );


      setError(
        progressError.message
      );


      setProgressByTopic(
        {}
      );


      setLoading(
        false
      );


      return;
    }


    const nextProgress:
      Record<
        string,
        ProgressState
      > = {};


    (
      progressData ||
      []
    ).forEach(
      item => {

        const row =
          item as
            ProgressRow;


        nextProgress[
          String(
            row.book_topic_id
          )
        ] = {

          completed:
            row.completed ===
            true,

          revisionCount:
            cleanRevisionCount(
              row.revision_count
            )

        };
      }
    );


    setProgressByTopic(
      nextProgress
    );


    setLoading(
      false
    );
  }


  /*
   * INITIAL LOAD
   */

  useEffect(
    () => {

      void loadSnapshot();

    },
    []
  );


  /*
   * =========================================
   * CHILDREN MAP
   * =========================================
   */

  const childrenMap =
    useMemo(
      () => {

        const map =
          new Map<
            string,
            TopicRow[]
          >();


        topics.forEach(
          topic => {

            if (
              !topic.parent_id
            ) {

              return;
            }


            const children =
              map.get(
                topic.parent_id
              ) ||
              [];


            children.push(
              topic
            );


            map.set(
              topic.parent_id,
              children
            );
          }
        );


        return map;

      },
      [
        topics
      ]
    );


  /*
   * =========================================
   * LEAF TOPICS
   *
   * Only the smallest readable
   * portions count toward progress.
   * =========================================
   */

  const leafTopics =
    useMemo(
      () => {

        return topics.filter(
          topic => {

            const children =
              childrenMap.get(
                topic.id
              ) ||
              [];


            return (
              children.length ===
              0
            );
          }
        );

      },
      [
        topics,
        childrenMap
      ]
    );


  /*
   * PROGRESS STATE
   */

  function getProgress(
    topicId:
      string
  ) {

    return (
      progressByTopic[
        topicId
      ] ||
      EMPTY_PROGRESS
    );
  }


  /*
   * =========================================
   * OVERALL COUNTS
   * =========================================
   */

  const overall =
    useMemo(
      () => {

        const total =
          leafTopics.length;


        let read =
          0;


        let revision1 =
          0;


        let revision2 =
          0;


        let final =
          0;


        leafTopics.forEach(
          topic => {

            const progress =
              progressByTopic[
                topic.id
              ] ||
              EMPTY_PROGRESS;


            if (
              progress.completed
            ) {

              read +=
                1;
            }


            if (
              progress.revisionCount >=
              1
            ) {

              revision1 +=
                1;
            }


            if (
              progress.revisionCount >=
              2
            ) {

              revision2 +=
                1;
            }


            if (
              progress.revisionCount >=
              3
            ) {

              final +=
                1;
            }
          }
        );


        return {

          total,

          read,

          revision1,

          revision2,

          final,

          readPercent:
            percentage(
              read,
              total
            ),

          revision1Percent:
            percentage(
              revision1,
              total
            ),

          revision2Percent:
            percentage(
              revision2,
              total
            ),

          finalPercent:
            percentage(
              final,
              total
            )

        };

      },
      [
        leafTopics,
        progressByTopic
      ]
    );


  /*
   * =========================================
   * SUBJECT SUMMARY
   * =========================================
   */

  const subjectSummaries =
    useMemo(
      () => {

        const map =
          new Map<
            string,
            {
              total: number;
              read: number;
              revision1: number;
              revision2: number;
              final: number;
            }
          >();


        leafTopics.forEach(
          topic => {

            /*
             * BOOK SUBJECT IS
             * THE PRIMARY SOURCE
             */

            const book =
              books.find(
                item =>
                  item.id ===
                  topic.book_id
              );


            const subject =
              book?.subject ||
              topic.subject ||
              'General';


            const current =
              map.get(
                subject
              ) || {

                total:
                  0,

                read:
                  0,

                revision1:
                  0,

                revision2:
                  0,

                final:
                  0
              };


            current.total +=
              1;


            const progress =
              progressByTopic[
                topic.id
              ] ||
              EMPTY_PROGRESS;


            if (
              progress.completed
            ) {

              current.read +=
                1;
            }


            if (
              progress.revisionCount >=
              1
            ) {

              current.revision1 +=
                1;
            }


            if (
              progress.revisionCount >=
              2
            ) {

              current.revision2 +=
                1;
            }


            if (
              progress.revisionCount >=
              3
            ) {

              current.final +=
                1;
            }


            map.set(
              subject,
              current
            );
          }
        );


        const result:
          SubjectSummary[] =
            Array
              .from(
                map.entries()
              )
              .map(
                (
                  [
                    subject,
                    stats
                  ]
                ) => ({

                  subject,

                  total:
                    stats.total,

                  read:
                    stats.read,

                  revision1:
                    stats.revision1,

                  revision2:
                    stats.revision2,

                  final:
                    stats.final,

                  readPercent:
                    percentage(
                      stats.read,
                      stats.total
                    ),

                  revision1Percent:
                    percentage(
                      stats.revision1,
                      stats.total
                    ),

                  revision2Percent:
                    percentage(
                      stats.revision2,
                      stats.total
                    ),

                  finalPercent:
                    percentage(
                      stats.final,
                      stats.total
                    )

                })
              );


        /*
         * ACTIVE SUBJECTS FIRST
         */

        result.sort(
          (
            first,
            second
          ) => {

            const firstStarted =
              first.read >
              0;


            const secondStarted =
              second.read >
              0;


            if (
              firstStarted !==
              secondStarted
            ) {

              return firstStarted
                ? -1
                : 1;
            }


            if (
              first.finalPercent !==
              second.finalPercent
            ) {

              return (
                second.finalPercent -
                first.finalPercent
              );
            }


            if (
              first.readPercent !==
              second.readPercent
            ) {

              return (
                second.readPercent -
                first.readPercent
              );
            }


            return first
              .subject
              .localeCompare(
                second.subject
              );
          }
        );


        return result;

      },
      [
        books,
        leafTopics,
        progressByTopic
      ]
    );


  /*
   * TOP THREE SUBJECTS
   */

  const topSubjects =
    subjectSummaries.slice(
      0,
      3
    );


  /*
   * BOOKS WITH TOPICS
   */

  const booksWithTopics =
    useMemo(
      () => {

        const ids =
          new Set(
            topics.map(
              topic =>
                topic.book_id
            )
          );


        return books.filter(
          book =>
            ids.has(
              book.id
            )
        ).length;

      },
      [
        books,
        topics
      ]
    );


  /*
   * =========================================
   * PAGE
   * =========================================
   */

  return (

    <article
      className="panel"
    >

      {/* HEADER */}

      <div
        className="panel-head"
      >

        <div>

          <span
            className="eyebrow"
          >
            BOOK PROGRESS
          </span>


          <h3>
            Reading & Revision
          </h3>

        </div>


        <button
          type="button"
          className="text-btn"

          onClick={() =>
            void loadSnapshot()
          }
        >
          Refresh
        </button>

      </div>


      {/* LOADING */}

      {loading && (

        <p>
          Loading preparation progress...
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


      {/* NO BOOKS */}

      {!loading &&
        !error &&
        books.length ===
          0 && (

        <>

          <p>
            No published Standard Books are
            available yet.
          </p>


          <button
            type="button"
            className="secondary-btn"

            onClick={
              onOpenTracker
            }
          >
            Open Book Progress
          </button>

        </>

      )}


      {/* NO TOPICS */}

      {!loading &&
        !error &&
        books.length >
          0 &&
        leafTopics.length ===
          0 && (

        <>

          <p>
            Books are available, but their topic
            structure has not been added yet.
          </p>


          <button
            type="button"
            className="secondary-btn"

            onClick={
              onOpenTracker
            }
          >
            Open Book Progress
          </button>

        </>

      )}


      {/* SIGNED OUT */}

      {!loading &&
        !error &&
        books.length >
          0 &&
        leafTopics.length >
          0 &&
        !signedIn && (

        <>

          <p>
            Sign in to track reading and revision
            progress across your UPSC books.
          </p>


          <div
            style={{
              display:
                'flex',

              gap:
                '7px',

              flexWrap:
                'wrap',

              marginTop:
                '12px'
            }}
          >

            <span
              className="tag"
            >
              {books.length} books
            </span>


            <span
              className="tag"
            >
              {leafTopics.length} portions
            </span>

          </div>


          <button
            type="button"
            className="secondary-btn"

            onClick={
              onOpenTracker
            }

            style={{
              marginTop:
                '14px'
            }}
          >
            View Book Tracker
          </button>

        </>

      )}


      {/* SIGNED IN */}

      {!loading &&
        !error &&
        signedIn &&
        leafTopics.length >
          0 && (

        <>

          {/* =================================
              OVERALL PREPARATION
          ================================= */}

          <div
            style={{
              marginTop:
                '14px',

              padding:
                '15px',

              border:
                '1px solid rgba(255,255,255,.08)',

              borderRadius:
                '16px',

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

                alignItems:
                  'flex-start',

                gap:
                  '12px',

                flexWrap:
                  'wrap'
              }}
            >

              <div>

                <strong>
                  Overall Preparation
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
                  {overall.total} total reading portions
                </small>

              </div>


              <strong
                style={{
                  fontSize:
                    '1.35rem'
                }}
              >
                {overall.readPercent}% Read
              </strong>

            </div>


            {/* READING BAR */}

            <div
              style={{
                marginTop:
                  '13px'
              }}
            >

              <div
                style={{
                  display:
                    'flex',

                  justifyContent:
                    'space-between',

                  gap:
                    '10px',

                  marginBottom:
                    '6px'
                }}
              >

                <small>
                  Reading
                </small>


                <small>
                  {overall.read}/{overall.total}
                </small>

              </div>


              <div
                className="progress-track"
              >

                <span
                  style={{
                    width:
                      `${overall.readPercent}%`
                  }}
                />

              </div>

            </div>


            {/* FINAL REVISION BAR */}

            <div
              style={{
                marginTop:
                  '11px'
              }}
            >

              <div
                style={{
                  display:
                    'flex',

                  justifyContent:
                    'space-between',

                  gap:
                    '10px',

                  marginBottom:
                    '6px'
                }}
              >

                <small>
                  Final Revision
                </small>


                <small>
                  {overall.final}/{overall.total}
                  {' • '}
                  {overall.finalPercent}%
                </small>

              </div>


              <div
                className="progress-track"
              >

                <span
                  style={{
                    width:
                      `${overall.finalPercent}%`
                  }}
                />

              </div>

            </div>


            {/* REVISION COUNTS */}

            <div
              style={{
                display:
                  'flex',

                gap:
                  '7px',

                flexWrap:
                  'wrap',

                marginTop:
                  '12px'
              }}
            >

              <span
                className="tag"
              >
                Read {overall.read}/{overall.total}
              </span>


              <span
                className="tag"
              >
                R1 {overall.revision1}/{overall.total}
              </span>


              <span
                className="tag"
              >
                R2 {overall.revision2}/{overall.total}
              </span>


              <span
                className="tag"
              >
                Final {overall.final}/{overall.total}
              </span>

            </div>

          </div>


          {/* =================================
              TOP SUBJECTS
          ================================= */}

          {topSubjects.length >
            0 && (

            <div
              style={{
                display:
                  'grid',

                gap:
                  '10px',

                marginTop:
                  '12px'
              }}
            >

              {topSubjects.map(
                subject => (

                  <div
                    key={
                      subject.subject
                    }

                    style={{
                      padding:
                        '12px',

                      border:
                        '1px solid rgba(255,255,255,.07)',

                      borderRadius:
                        '12px',

                      background:
                        'rgba(255,255,255,.025)'
                    }}
                  >

                    {/* SUBJECT TITLE */}

                    <div
                      style={{
                        display:
                          'flex',

                        justifyContent:
                          'space-between',

                        alignItems:
                          'center',

                        gap:
                          '12px'
                      }}
                    >

                      <strong
                        style={{
                          minWidth:
                            0,

                          overflow:
                            'hidden',

                          textOverflow:
                            'ellipsis',

                          whiteSpace:
                            'nowrap'
                        }}
                      >
                        {subject.subject}
                      </strong>


                      <strong>
                        {subject.readPercent}%
                      </strong>

                    </div>


                    {/* READ */}

                    <div
                      style={{
                        marginTop:
                          '9px'
                      }}
                    >

                      <div
                        style={{
                          display:
                            'flex',

                          justifyContent:
                            'space-between',

                          gap:
                            '8px',

                          marginBottom:
                            '5px'
                        }}
                      >

                        <small
                          style={{
                            color:
                              '#94a3b8'
                          }}
                        >
                          Read
                        </small>


                        <small>
                          {subject.read}/{subject.total}
                        </small>

                      </div>


                      <div
                        className="progress-track"
                      >

                        <span
                          style={{
                            width:
                              `${subject.readPercent}%`
                          }}
                        />

                      </div>

                    </div>


                    {/* FINAL */}

                    <div
                      style={{
                        marginTop:
                          '8px'
                      }}
                    >

                      <div
                        style={{
                          display:
                            'flex',

                          justifyContent:
                            'space-between',

                          gap:
                            '8px',

                          marginBottom:
                            '5px'
                        }}
                      >

                        <small
                          style={{
                            color:
                              '#94a3b8'
                          }}
                        >
                          Final Revision
                        </small>


                        <small>
                          {subject.finalPercent}%
                        </small>

                      </div>


                      <div
                        className="progress-track"
                      >

                        <span
                          style={{
                            width:
                              `${subject.finalPercent}%`
                          }}
                        />

                      </div>

                    </div>


                    {/* R1 / R2 / FINAL */}

                    <div
                      style={{
                        display:
                          'flex',

                        gap:
                          '6px',

                        flexWrap:
                          'wrap',

                        marginTop:
                          '9px'
                      }}
                    >

                      <span
                        className="tag"
                      >
                        R1 {subject.revision1}/{subject.total}
                      </span>


                      <span
                        className="tag"
                      >
                        R2 {subject.revision2}/{subject.total}
                      </span>


                      <span
                        className="tag"
                      >
                        Final {subject.final}/{subject.total}
                      </span>

                    </div>

                  </div>

                )
              )}

            </div>

          )}


          {/* =================================
              SUMMARY
          ================================= */}

          <div
            style={{
              display:
                'flex',

              gap:
                '7px',

              flexWrap:
                'wrap',

              marginTop:
                '12px'
            }}
          >

            <span
              className="tag"
            >
              {subjectSummaries.length} subjects
            </span>


            <span
              className="tag"
            >
              {booksWithTopics} books tracked
            </span>


            <span
              className="tag"
            >
              {overall.total} portions
            </span>

          </div>


          {/* OPEN TRACKER */}

          <button
            type="button"
            className="secondary-btn"

            onClick={
              onOpenTracker
            }

            style={{
              marginTop:
                '14px'
            }}
          >
            Open Reading & Revision Tracker
          </button>

        </>

      )}

    </article>

  );
}

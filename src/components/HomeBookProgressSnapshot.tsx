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
};


type SubjectSummary = {
  subject: string;
  completed: number;
  total: number;
  percent: number;
};


type HomeBookProgressSnapshotProps = {
  onOpenTracker: () => void;
};


/*
 * HOME BOOK PROGRESS SNAPSHOT
 */

export function HomeBookProgressSnapshot({
  onOpenTracker
}: HomeBookProgressSnapshotProps) {

  /*
   * DATA
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
    completedIds,
    setCompletedIds
  ] =
    useState<
      Set<string>
    >(
      new Set()
    );


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
   * LOAD SNAPSHOT
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
     * NO BOOKS YET
     */

    if (
      cleanBooks.length ===
      0
    ) {

      setTopics(
        []
      );


      setCompletedIds(
        new Set()
      );


      setLoading(
        false
      );


      return;
    }


    /*
     * ONLY TOPICS BELONGING
     * TO PUBLISHED BOOKS
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
     * CHECK CURRENT USER
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


      setCompletedIds(
        new Set()
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
     * LOAD USER COMPLETION
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
          completed
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


      setCompletedIds(
        new Set()
      );


      setLoading(
        false
      );


      return;
    }


    const nextCompletedIds =
      new Set<string>();


    (
      progressData ||
      []
    ).forEach(
      item => {

        const row =
          item as
            ProgressRow;


        if (
          row.completed
        ) {

          nextCompletedIds.add(
            String(
              row.book_topic_id
            )
          );
        }
      }
    );


    setCompletedIds(
      nextCompletedIds
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
   * CHILDREN MAP
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


            const current =
              map.get(
                topic.parent_id
              ) ||
              [];


            current.push(
              topic
            );


            map.set(
              topic.parent_id,
              current
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
   * LEAF TOPICS
   *
   * Progress is calculated
   * from the smallest readable
   * portions only.
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
   * OVERALL PROGRESS
   */

  const overallStats =
    useMemo(
      () => {

        const total =
          leafTopics.length;


        if (
          total ===
          0
        ) {

          return {
            completed:
              0,

            total:
              0,

            percent:
              0
          };
        }


        const completed =
          leafTopics.filter(
            topic =>
              completedIds.has(
                topic.id
              )
          ).length;


        return {

          completed,

          total,

          percent:
            Math.round(
              (
                completed /
                total
              ) *
              100
            )
        };

      },
      [
        leafTopics,
        completedIds
      ]
    );


  /*
   * SUBJECT PROGRESS
   */

  const subjectSummaries =
    useMemo(
      () => {

        const subjectMap =
          new Map<
            string,
            {
              completed:
                number;

              total:
                number;
            }
          >();


        leafTopics.forEach(
          topic => {

            /*
             * USE BOOK SUBJECT AS
             * PRIMARY SOURCE.
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
              subjectMap.get(
                subject
              ) ||
              {
                completed:
                  0,

                total:
                  0
              };


            current.total +=
              1;


            if (
              completedIds.has(
                topic.id
              )
            ) {

              current.completed +=
                1;
            }


            subjectMap.set(
              subject,
              current
            );
          }
        );


        const result:
          SubjectSummary[] =
            Array
              .from(
                subjectMap.entries()
              )
              .map(
                (
                  [
                    subject,
                    stats
                  ]
                ) => ({

                  subject,

                  completed:
                    stats.completed,

                  total:
                    stats.total,

                  percent:
                    stats.total >
                      0
                      ? Math.round(
                          (
                            stats.completed /
                            stats.total
                          ) *
                          100
                        )
                      : 0
                })
              );


        /*
         * SHOW MOST ACTIVE
         * SUBJECTS FIRST.
         *
         * If equal, higher
         * completion appears first.
         */

        result.sort(
          (
            first,
            second
          ) => {

            const firstStarted =
              first.completed >
              0;


            const secondStarted =
              second.completed >
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
              first.percent !==
              second.percent
            ) {

              return (
                second.percent -
                first.percent
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
        completedIds
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
   * BOOK COUNT WITH TOPICS
   */

  const booksWithTopics =
    useMemo(
      () => {

        const bookIds =
          new Set(
            topics.map(
              topic =>
                topic.book_id
            )
          );


        return books.filter(
          book =>
            bookIds.has(
              book.id
            )
        ).length;

      },
      [
        books,
        topics
      ]
    );


  return (

    <article
      className="panel"
    >

      {/* =====================================
          HEADER
      ===================================== */}

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
            Your reading progress
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


      {/* =====================================
          LOADING
      ===================================== */}

      {loading && (

        <p>
          Loading book progress...
        </p>

      )}


      {/* =====================================
          ERROR
      ===================================== */}

      {!loading &&
        error && (

        <div
          className="callout"
        >
          {error}
        </div>

      )}


      {/* =====================================
          NO BOOK STRUCTURE
      ===================================== */}

      {!loading &&
        !error &&
        books.length >
          0 &&
        leafTopics.length ===
          0 && (

        <>

          <p>
            Your books are ready, but no
            topic structure is available yet.
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


      {/* =====================================
          NO BOOKS
      ===================================== */}

      {!loading &&
        !error &&
        books.length ===
          0 && (

        <p>
          No published Standard Books are
          available yet.
        </p>

      )}


      {/* =====================================
          SIGNED OUT
      ===================================== */}

      {!loading &&
        !error &&
        books.length >
          0 &&
        leafTopics.length >
          0 &&
        !signedIn && (

        <>

          <p>
            Sign in to save your reading
            completion and view your personal
            Book Progress.
          </p>


          <div
            style={{
              display:
                'flex',

              gap:
                '8px',

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
              {
                overallStats.total
              } reading portions
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


      {/* =====================================
          SIGNED IN
      ===================================== */}

      {!loading &&
        !error &&
        signedIn &&
        leafTopics.length >
          0 && (

        <>

          {/* OVERALL */}

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
                  'center',

                gap:
                  '12px'
              }}
            >

              <div>

                <strong>
                  Overall Reading
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

                  {
                    overallStats.completed
                  }
                  /
                  {
                    overallStats.total
                  }
                  {' '}
                  portions completed

                </small>

              </div>


              <strong
                style={{
                  fontSize:
                    '1.35rem',

                  color:
                    '#5eead4'
                }}
              >
                {
                  overallStats.percent
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
                    `${overallStats.percent}%`
                }}
              />

            </div>

          </div>


          {/* SUBJECT PROGRESS */}

          {topSubjects.length >
            0 && (

            <div
              style={{
                display:
                  'grid',

                gap:
                  '9px',

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
                        '11px 12px',

                      border:
                        '1px solid rgba(255,255,255,.07)',

                      borderRadius:
                        '12px',

                      background:
                        'rgba(255,255,255,.025)'
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

                            overflow:
                              'hidden',

                            textOverflow:
                              'ellipsis',

                            whiteSpace:
                              'nowrap'
                          }}
                        >
                          {
                            subject.subject
                          }
                        </strong>


                        <small
                          style={{
                            color:
                              '#94a3b8'
                          }}
                        >

                          {
                            subject.completed
                          }
                          /
                          {
                            subject.total
                          }
                          {' '}
                          completed

                        </small>

                      </div>


                      <strong>
                        {
                          subject.percent
                        }%
                      </strong>

                    </div>


                    <div
                      className="mini-progress"
                    >

                      <span
                        style={{
                          width:
                            `${subject.percent}%`
                        }}
                      />

                    </div>

                  </div>

                )
              )}

            </div>

          )}


          {/* SUMMARY */}

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
              {
                subjectSummaries.length
              } subjects
            </span>


            <span
              className="tag"
            >
              {
                booksWithTopics
              } books tracked
            </span>


            <span
              className="tag"
            >
              {
                overallStats.total
              } portions
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
            Open Book Progress
          </button>

        </>

      )}

    </article>

  );
}

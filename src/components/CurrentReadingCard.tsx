import {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


type CurrentBook = {
  id: string;
  title: string;
  author: string | null;
  current_page: number;
  total_pages: number | null;
};


type CurrentTopic = {
  id: string;
  parent_id: string | null;
  topic_name: string;
  progress_percent: number;
  is_current: boolean;
};


type CurrentReadingCardProps = {

  onOpenBooks:
    () => void;
};


function safeNumber(
  value:
    unknown,
  fallback =
    0
) {

  const number =
    Number(
      value
    );


  return Number.isFinite(
    number
  )
    ? number
    : fallback;
}


function clampPercent(
  value:
    number
) {

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


export function CurrentReadingCard({

  onOpenBooks

}: CurrentReadingCardProps) {

  const [
    book,
    setBook
  ] =
    useState<
      CurrentBook |
      null
    >(
      null
    );


  const [
    topics,
    setTopics
  ] =
    useState<
      CurrentTopic[]
    >([]);


  const [
    loading,
    setLoading
  ] =
    useState(
      true
    );


  const [
    errorMessage,
    setErrorMessage
  ] =
    useState('');


  /*
   * =========================================
   * LOAD CURRENT READING
   * =========================================
   */

  async function loadCurrentReading() {

    const client =
      supabase;


    if (
      !client
    ) {

      setErrorMessage(
        'Study database is not configured.'
      );

      setLoading(
        false
      );

      return;
    }


    setLoading(
      true
    );


    setErrorMessage('');


    const {
      data: {
        user
      }
    } =
      await client
        .auth
        .getUser();


    if (
      !user
    ) {

      setLoading(
        false
      );

      return;
    }


    const {
      data:
        bookRows,
      error:
        bookError
    } =
      await client
        .from(
          'personal_books'
        )
        .select(`
          id,
          title,
          author,
          current_page,
          total_pages
        `)
        .eq(
          'user_id',
          user.id
        )
        .eq(
          'is_current',
          true
        )
        .limit(
          1
        );


    if (
      bookError
    ) {

      setErrorMessage(
        bookError.message
      );

      setLoading(
        false
      );

      return;
    }


    const firstBook =
      bookRows?.[0];


    if (
      !firstBook
    ) {

      setBook(
        null
      );

      setTopics(
        []
      );

      setLoading(
        false
      );

      return;
    }


    const cleanBook:
      CurrentBook = {

        id:
          String(
            firstBook.id
          ),

        title:
          String(
            firstBook.title ||
            ''
          ),

        author:
          firstBook.author
            ? String(
                firstBook.author
              )
            : null,

        current_page:
          safeNumber(
            firstBook.current_page
          ),

        total_pages:
          firstBook.total_pages ===
            null
            ? null
            : safeNumber(
                firstBook.total_pages
              )

      };


    const {
      data:
        topicRows,
      error:
        topicError
    } =
      await client
        .from(
          'personal_book_topics'
        )
        .select(`
          id,
          parent_id,
          topic_name,
          progress_percent,
          is_current
        `)
        .eq(
          'user_id',
          user.id
        )
        .eq(
          'book_id',
          cleanBook.id
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

      setErrorMessage(
        topicError.message
      );

      setLoading(
        false
      );

      return;
    }


    const cleanTopics:
      CurrentTopic[] =
        (
          topicRows ||
          []
        ).map(
          item => ({

            id:
              String(
                item.id
              ),

            parent_id:
              item.parent_id
                ? String(
                    item.parent_id
                  )
                : null,

            topic_name:
              String(
                item.topic_name ||
                ''
              ),

            progress_percent:
              clampPercent(
                safeNumber(
                  item.progress_percent
                )
              ),

            is_current:
              item.is_current ===
                true

          })
        );


    setBook(
      cleanBook
    );


    setTopics(
      cleanTopics
    );


    setLoading(
      false
    );
  }


  useEffect(
    () => {

      void loadCurrentReading();

    },
    []
  );


  /*
   * =========================================
   * CURRENT TOPIC
   * =========================================
   */

  const currentTopic =
    useMemo(
      () =>
        topics.find(
          topic =>
            topic.is_current
        ) ||
        null,
      [
        topics
      ]
    );


  /*
   * =========================================
   * TOPIC PATH
   * =========================================
   */

  const currentTopicPath =
    useMemo(
      () => {

        if (
          !currentTopic
        ) {

          return '';
        }


        const topicMap =
          new Map(
            topics.map(
              topic => [
                topic.id,
                topic
              ]
            )
          );


        const path:
          string[] = [
            currentTopic.topic_name
          ];


        let parentId =
          currentTopic.parent_id;


        const visited =
          new Set<string>();


        while (
          parentId &&
          !visited.has(
            parentId
          )
        ) {

          visited.add(
            parentId
          );


          const parent =
            topicMap.get(
              parentId
            );


          if (
            !parent
          ) {

            break;
          }


          path.unshift(
            parent.topic_name
          );


          parentId =
            parent.parent_id;
        }


        return path.join(
          ' → '
        );

      },
      [
        currentTopic,
        topics
      ]
    );


  /*
   * =========================================
   * BOOK PROGRESS
   * =========================================
   */

  const bookProgress =
    useMemo(
      () => {

        if (
          topics.length >
          0
        ) {

          const parentIds =
            new Set(
              topics
                .map(
                  topic =>
                    topic.parent_id
                )
                .filter(
                  (
                    value
                  ):
                    value is string =>
                      Boolean(
                        value
                      )
                )
            );


          const leafTopics =
            topics.filter(
              topic =>
                !parentIds.has(
                  topic.id
                )
            );


          if (
            leafTopics.length >
            0
          ) {

            const total =
              leafTopics.reduce(
                (
                  sum,
                  topic
                ) =>
                  sum +
                  topic.progress_percent,
                0
              );


            return clampPercent(
              total /
              leafTopics.length
            );
          }

        }


        if (
          book?.total_pages &&
          book.total_pages >
            0
        ) {

          return clampPercent(
            (
              book.current_page /
              book.total_pages
            ) *
            100
          );
        }


        return 0;

      },
      [
        book,
        topics
      ]
    );


  /*
   * =========================================
   * LOADING
   * =========================================
   */

  if (
    loading
  ) {

    return (

      <section
        className="panel"

        style={{
          marginTop:
            '14px'
        }}
      >

        <span
          className="eyebrow"
        >
          CURRENT READING
        </span>


        <p
          style={{
            marginBottom:
              0
          }}
        >
          Loading your current book…
        </p>

      </section>

    );
  }


  /*
   * =========================================
   * ERROR
   * =========================================
   */

  if (
    errorMessage
  ) {

    return (

      <section
        className="panel"

        style={{
          marginTop:
            '14px'
        }}
      >

        <span
          className="eyebrow"
        >
          CURRENT READING
        </span>


        <p>
          {
            errorMessage
          }
        </p>


        <button
          type="button"

          className="secondary-btn"

          onClick={() =>
            void loadCurrentReading()
          }
        >
          Try Again
        </button>

      </section>

    );
  }


  /*
   * =========================================
   * NO CURRENT BOOK
   * =========================================
   */

  if (
    !book
  ) {

    return (

      <section
        className="panel"

        style={{
          marginTop:
            '14px'
        }}
      >

        <span
          className="eyebrow"
        >
          CURRENT READING
        </span>


        <h3
          style={{
            marginBottom:
              '6px'
          }}
        >
          No current book selected
        </h3>


        <p
          style={{
            marginTop:
              0
          }}
        >
          Choose a book in My Reading and set it
          as your current book.
        </p>


        <button
          type="button"

          className="primary-btn"

          onClick={
            onOpenBooks
          }
        >
          Open My Reading
        </button>

      </section>

    );
  }


  /*
   * =========================================
   * CURRENT READING CARD
   * =========================================
   */

  return (

    <section
      className="panel"

      style={{
        marginTop:
          '14px'
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
            '14px',

          flexWrap:
            'wrap'
        }}
      >

        <div
          style={{
            minWidth:
              0,

            flex:
              1
          }}
        >

          <span
            className="eyebrow"
          >
            CURRENT READING
          </span>


          <h3
            style={{
              margin:
                '6px 0 4px'
            }}
          >
            {
              book.title
            }
          </h3>


          {book.author && (

            <small
              style={{
                color:
                  '#94a3b8'
              }}
            >
              {
                book.author
              }
            </small>

          )}

        </div>


        <div
          style={{
            textAlign:
              'right'
          }}
        >

          <strong
            style={{
              display:
                'block',

              fontSize:
                '1.65rem',

              color:
                '#5eead4'
            }}
          >
            {
              bookProgress
            }%
          </strong>


          <small
            style={{
              color:
                '#94a3b8'
            }}
          >
            book complete
          </small>

        </div>

      </div>


      <div
        className="progress-track"

        style={{
          marginTop:
            '14px',

          height:
            '9px'
        }}
      >

        <span
          style={{
            width:
              `${bookProgress}%`
          }}
        />

      </div>


      {currentTopic ? (

        <div
          style={{
            marginTop:
              '14px',

            padding:
              '12px',

            borderRadius:
              '12px',

            background:
              'rgba(20,184,166,.09)'
          }}
        >

          <small
            style={{
              color:
                '#94a3b8'
            }}
          >
            Reading now
          </small>


          <strong
            style={{
              display:
                'block',

              marginTop:
                '5px'
            }}
          >
            {
              currentTopicPath
            }
          </strong>


          <small
            style={{
              display:
                'block',

              marginTop:
                '5px',

              color:
                '#5eead4'
            }}
          >
            {
              currentTopic
                .progress_percent
            }% complete
          </small>

        </div>

      ) : (

        <div
          style={{
            marginTop:
              '14px',

            padding:
              '12px',

            borderRadius:
              '12px',

            background:
              'rgba(255,255,255,.035)'
          }}
        >

          <small
            style={{
              color:
                '#94a3b8'
            }}
          >
            No topic selected as currently reading.
          </small>

        </div>

      )}


      {book.total_pages && (

        <small
          style={{
            display:
              'block',

            marginTop:
              '12px',

            color:
              '#94a3b8'
          }}
        >
          Page{' '}
          {
            book.current_page
          }{' '}
          of{' '}
          {
            book.total_pages
          }
        </small>

      )}


      <button
        type="button"

        className="primary-btn"

        style={{
          marginTop:
            '14px'
        }}

        onClick={
          onOpenBooks
        }
      >
        Continue Reading
      </button>

    </section>

  );
}

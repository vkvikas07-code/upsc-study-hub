import {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


type PersonalRevisionTopic = {
  id: string;
  book_id: string;
  parent_id: string | null;
  topic_name: string;
  revision_count: number;
  next_revision_due_at: string | null;
};


type PersonalBook = {
  id: string;
  title: string;
  subject: string;
};


type RevisionItem = {
  topicId: string;
  bookId: string;
  topicName: string;
  topicPath: string;
  bookTitle: string;
  subject: string;
  revisionCount: number;
  dueAt: string;
};


type PersonalRevisionDueTodayProps = {
  onOpenTracker?: () => void;
};


function cleanRevisionCount(
  value: unknown
) {

  const number =
    Number(value);


  if (
    !Number.isFinite(
      number
    )
  ) {

    return 0;
  }


  return Math.min(
    3,
    Math.max(
      0,
      Math.round(
        number
      )
    )
  );
}


function startOfDay(
  value: Date
) {

  const date =
    new Date(value);


  date.setHours(
    0,
    0,
    0,
    0
  );


  return date;
}


function startOfTomorrow() {

  const date =
    startOfDay(
      new Date()
    );


  date.setDate(
    date.getDate() +
    1
  );


  return date;
}


function formatDate(
  value: string
) {

  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return '';
  }


  return date.toLocaleDateString(
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


function revisionLabel(
  revisionCount: number
) {

  if (
    revisionCount <=
    0
  ) {

    return 'Revision 1';
  }


  if (
    revisionCount ===
    1
  ) {

    return 'Revision 2';
  }


  return 'Final Revision';
}


function dueLabel(
  value: string
) {

  const due =
    startOfDay(
      new Date(value)
    );


  if (
    Number.isNaN(
      due.getTime()
    )
  ) {

    return '';
  }


  const today =
    startOfDay(
      new Date()
    );


  const difference =
    Math.round(
      (
        due.getTime() -
        today.getTime()
      ) /
      (
        24 *
        60 *
        60 *
        1000
      )
    );


  if (
    difference ===
    0
  ) {

    return 'Due today';
  }


  if (
    difference <
    0
  ) {

    const days =
      Math.abs(
        difference
      );


    return `Overdue by ${days} ${
      days === 1
        ? 'day'
        : 'days'
    }`;
  }


  return '';
}


export function PersonalRevisionDueToday({

  onOpenTracker

}: PersonalRevisionDueTodayProps) {

  const [
    items,
    setItems
  ] =
    useState<RevisionItem[]>([]);


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


  const [
    message,
    setMessage
  ] =
    useState('');


  const [
    savingTopicId,
    setSavingTopicId
  ] =
    useState<string | null>(
      null
    );


  /*
   * =========================================
   * LOAD PERSONAL REVISIONS
   * =========================================
   */

  async function loadRevisions() {

    const client =
      supabase;


    if (
      !client
    ) {

      setError(
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

    setError('');


    const {
      data: {
        user
      }
    } =
      await client.auth
        .getUser();


    if (
      !user
    ) {

      setSignedIn(
        false
      );

      setItems([]);

      setLoading(
        false
      );

      return;
    }


    setSignedIn(
      true
    );


    const {
      data:
        topicData,

      error:
        topicError
    } =
      await client
        .from(
          'personal_book_topics'
        )
        .select(`
          id,
          book_id,
          parent_id,
          topic_name,
          revision_count,
          next_revision_due_at
        `)
        .eq(
          'user_id',
          user.id
        )
        .eq(
          'progress_percent',
          100
        )
        .lt(
          'revision_count',
          3
        )
        .not(
          'next_revision_due_at',
          'is',
          null
        )
        .order(
          'next_revision_due_at',
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


    const topicRows:
      PersonalRevisionTopic[] =
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

            revision_count:
              cleanRevisionCount(
                item.revision_count
              ),

            next_revision_due_at:
              item.next_revision_due_at
                ? String(
                    item.next_revision_due_at
                  )
                : null

          })
        );


    if (
      topicRows.length ===
      0
    ) {

      setItems([]);

      setLoading(
        false
      );

      return;
    }


    const bookIds =
      Array.from(
        new Set(
          topicRows.map(
            topic =>
              topic.book_id
          )
        )
      );


    const {
      data:
        bookData,

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
          subject
        `)
        .eq(
          'user_id',
          user.id
        )
        .in(
          'id',
          bookIds
        );


    if (
      bookError
    ) {

      setError(
        bookError.message
      );

      setLoading(
        false
      );

      return;
    }


    const books:
      PersonalBook[] =
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


    /*
     * Load all topics of these books so
     * we can build Part → Chapter → Topic paths.
     */

    const {
      data:
        pathData,

      error:
        pathError
    } =
      await client
        .from(
          'personal_book_topics'
        )
        .select(`
          id,
          parent_id,
          topic_name,
          book_id
        `)
        .eq(
          'user_id',
          user.id
        )
        .in(
          'book_id',
          bookIds
        );


    if (
      pathError
    ) {

      setError(
        pathError.message
      );

      setLoading(
        false
      );

      return;
    }


    const pathMap =
      new Map<
        string,
        {
          id: string;
          parent_id: string | null;
          topic_name: string;
        }
      >();


    (
      pathData ||
      []
    ).forEach(
      item => {

        pathMap.set(
          String(
            item.id
          ),
          {

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
              )

          }
        );

      }
    );


    function makeTopicPath(
      topic:
        PersonalRevisionTopic
    ) {

      const parts =
        [
          topic.topic_name
        ];


      let parent =
        topic.parent_id;


      const visited =
        new Set<string>();


      while (
        parent &&
        !visited.has(
          parent
        )
      ) {

        visited.add(
          parent
        );


        const item =
          pathMap.get(
            parent
          );


        if (
          !item
        ) {

          break;
        }


        parts.unshift(
          item.topic_name
        );


        parent =
          item.parent_id;
      }


      return parts.join(
        ' → '
      );
    }


    const nextItems:
      RevisionItem[] = [];


    topicRows.forEach(
      topic => {

        if (
          !topic.next_revision_due_at
        ) {

          return;
        }


        const book =
          books.find(
            item =>
              item.id ===
              topic.book_id
          );


        if (
          !book
        ) {

          return;
        }


        nextItems.push({

          topicId:
            topic.id,

          bookId:
            topic.book_id,

          topicName:
            topic.topic_name,

          topicPath:
            makeTopicPath(
              topic
            ),

          bookTitle:
            book.title,

          subject:
            book.subject,

          revisionCount:
            topic.revision_count,

          dueAt:
            topic.next_revision_due_at

        });

      }
    );


    nextItems.sort(
      (
        first,
        second
      ) =>
        new Date(
          first.dueAt
        ).getTime() -
        new Date(
          second.dueAt
        ).getTime()
    );


    setItems(
      nextItems
    );


    setLoading(
      false
    );
  }


  useEffect(
    () => {

      void loadRevisions();

    },
    []
  );


  /*
   * =========================================
   * ONLY DUE / OVERDUE ITEMS
   * =========================================
   */

  const dueItems =
    useMemo(
      () => {

        const tomorrow =
          startOfTomorrow();


        return items.filter(
          item => {

            const due =
              new Date(
                item.dueAt
              );


            return (
              !Number.isNaN(
                due.getTime()
              ) &&
              due <
              tomorrow
            );
          }
        );

      },
      [
        items
      ]
    );


  /*
   * =========================================
   * MARK REVISION COMPLETE
   * =========================================
   */

  async function completeRevision(
    item:
      RevisionItem
  ) {

    const client =
      supabase;


    if (
      !client
    ) {

      return;
    }


    const nextRevision =
      Math.min(
        3,
        item.revisionCount +
        1
      );


    setSavingTopicId(
      item.topicId
    );


    setMessage('');


    const {
      error:
        updateError
    } =
      await client
        .from(
          'personal_book_topics'
        )
        .update({

          revision_count:
            nextRevision

        })
        .eq(
          'id',
          item.topicId
        );


    if (
      updateError
    ) {

      setError(
        updateError.message
      );

      setSavingTopicId(
        null
      );

      return;
    }


    setMessage(
      nextRevision >=
        3
        ? 'Final Revision completed.'
        : `${revisionLabel(item.revisionCount)} completed.`
    );


    setSavingTopicId(
      null
    );


    await loadRevisions();
  }


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
            '12px'
        }}
      >

        <span
          className="eyebrow"
        >
          MY BOOK REVISIONS
        </span>


        <p
          style={{
            marginBottom:
              0
          }}
        >
          Checking personal revision schedule…
        </p>

      </section>

    );
  }


  /*
   * =========================================
   * SIGNED OUT
   * =========================================
   */

  if (
    !signedIn
  ) {

    return null;
  }


  /*
   * =========================================
   * ERROR
   * =========================================
   */

  if (
    error
  ) {

    return (

      <section
        className="panel"

        style={{
          marginTop:
            '12px'
        }}
      >

        <span
          className="eyebrow"
        >
          MY BOOK REVISIONS
        </span>


        <p>
          {
            error
          }
        </p>


        <button
          type="button"

          className="secondary-btn"

          onClick={() =>
            void loadRevisions()
          }
        >
          Try Again
        </button>

      </section>

    );
  }


  /*
   * =========================================
   * NOTHING DUE
   * =========================================
   */

  if (
    dueItems.length ===
    0
  ) {

    return (

      <section
        className="panel"

        style={{
          marginTop:
            '12px'
        }}
      >

        <span
          className="eyebrow"
        >
          MY BOOK REVISIONS
        </span>


        <h3
          style={{
            marginBottom:
              '5px'
          }}
        >
          ✓ No personal revisions due
        </h3>


        <p
          style={{
            margin:
              0
          }}
        >
          Your personal-book revision schedule
          is clear for today.
        </p>

      </section>

    );
  }


  /*
   * =========================================
   * DUE LIST
   * =========================================
   */

  return (

    <section
      className="panel"

      style={{
        marginTop:
          '12px'
      }}
    >

      <div
        className="panel-head"
      >

        <div>

          <span
            className="eyebrow"
          >
            MY BOOK REVISIONS
          </span>


          <h3>
            Revision due today
          </h3>

        </div>


        <span
          className="pill"
        >
          {
            dueItems.length
          }
        </span>

      </div>


      {message && (

        <div
          className="callout"

          style={{
            marginTop:
              '10px'
          }}
        >
          {
            message
          }
        </div>

      )}


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

        {
          dueItems.map(
            item => {

              const status =
                dueLabel(
                  item.dueAt
                );


              return (

                <div
                  key={
                    item.topicId
                  }

                  style={{
                    padding:
                      '12px',

                    borderRadius:
                      '12px',

                    border:
                      '1px solid rgba(255,255,255,.08)',

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
                        '10px',

                      alignItems:
                        'flex-start'
                    }}
                  >

                    <div
                      style={{
                        minWidth:
                          0
                      }}
                    >

                      <strong>
                        {
                          item.topicPath
                        }
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
                          item.bookTitle
                        }
                        {' · '}
                        {
                          item.subject
                        }
                      </small>

                    </div>


                    <span
                      className="pill"
                    >
                      {
                        revisionLabel(
                          item.revisionCount
                        )
                      }
                    </span>

                  </div>


                  <small
                    style={{
                      display:
                        'block',

                      marginTop:
                        '8px',

                      color:
                        status.includes(
                          'Overdue'
                        ) ||
                        status ===
                          'Due today'
                          ? '#fbbf24'
                          : '#94a3b8'
                    }}
                  >
                    {
                      status
                    }
                    {' · '}
                    {
                      formatDate(
                        item.dueAt
                      )
                    }
                  </small>


                  <div
                    style={{
                      display:
                        'flex',

                      flexWrap:
                        'wrap',

                      gap:
                        '8px',

                      marginTop:
                        '10px'
                    }}
                  >

                    <button
                      type="button"

                      className="primary-btn"

                      disabled={
                        savingTopicId ===
                        item.topicId
                      }

                      onClick={() =>
                        void completeRevision(
                          item
                        )
                      }
                    >
                      {
                        savingTopicId ===
                          item.topicId
                          ? 'Saving…'
                          : `Complete ${revisionLabel(
                              item.revisionCount
                            )}`
                      }
                    </button>


                    {onOpenTracker && (

                      <button
                        type="button"

                        className="secondary-btn"

                        onClick={
                          onOpenTracker
                        }
                      >
                        Open My Reading
                      </button>

                    )}

                  </div>

                </div>

              );

            }
          )
        }

      </div>

    </section>

  );
}

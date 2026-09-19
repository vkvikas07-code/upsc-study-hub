import {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


type NodeLevel =
  | 'part'
  | 'chapter'
  | 'topic'
  | 'subtopic';


type PersonalBook = {
  id: string;
  title: string;
  author: string | null;
  subject: string | null;
  exam_stage: 'prelims' | 'mains' | 'both';
  notes: string | null;
  sort_order: number;
};


type PersonalNode = {
  id: string;
  book_id: string;
  parent_id: string | null;
  level: NodeLevel;
  title: string;
  sort_order: number;
};


type ParsedLine = {
  level: NodeLevel;
  title: string;
};


const LEVEL_ORDER: Record<NodeLevel, number> = {
  part: 0,
  chapter: 1,
  topic: 2,
  subtopic: 3
};


function normaliseLevel(
  value: string
): NodeLevel | null {
  const label =
    value
      .trim()
      .toLowerCase();

  if (label === 'part') return 'part';
  if (label === 'chapter') return 'chapter';
  if (label === 'topic') return 'topic';
  if (label === 'subtopic') return 'subtopic';

  return null;
}


function parseOutline(
  value: string
): ParsedLine[] {
  const lines =
    value
      .split(/\r?\n/)
      .map(line => line.trimEnd())
      .filter(line => line.trim().length > 0);

  const parsed: ParsedLine[] = [];

  for (const rawLine of lines) {
    const explicit =
      rawLine.match(
        /^\s*(Part|Chapter|Topic|Subtopic)\s*:\s*(.+)$/i
      );

    if (explicit) {
      const level =
        normaliseLevel(
          explicit[1]
        );

      if (level) {
        parsed.push({
          level,
          title:
            explicit[2].trim()
        });
      }

      continue;
    }

    const leading =
      rawLine.match(/^\s*/)?.[0]
        .replace(/\t/g, '    ')
        .length || 0;

    const depth =
      Math.min(
        3,
        Math.floor(
          leading / 2
        )
      );

    const title =
      rawLine.trim();

    const level: NodeLevel =
      depth === 0
        ? 'part'
        : depth === 1
        ? 'chapter'
        : depth === 2
        ? 'topic'
        : 'subtopic';

    parsed.push({
      level,
      title
    });
  }

  return parsed;
}


function percentage(
  completed: number,
  total: number
) {
  if (total <= 0) {
    return 0;
  }

  return Math.round(
    completed * 100 / total
  );
}


export function MyReading() {
  const [
    userId,
    setUserId
  ] = useState<string | null>(
    null
  );

  const [
    books,
    setBooks
  ] = useState<PersonalBook[]>([]);

  const [
    nodes,
    setNodes
  ] = useState<PersonalNode[]>([]);

  const [
    completedIds,
    setCompletedIds
  ] = useState<Set<string>>(
    new Set()
  );

  const [
    activeBookId,
    setActiveBookId
  ] = useState<string | null>(
    null
  );

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    message,
    setMessage
  ] = useState('');

  const [
    addOpen,
    setAddOpen
  ] = useState(false);

  const [
    importOpen,
    setImportOpen
  ] = useState(false);

  const [
    title,
    setTitle
  ] = useState('');

  const [
    author,
    setAuthor
  ] = useState('');

  const [
    subject,
    setSubject
  ] = useState('');

  const [
    examStage,
    setExamStage
  ] = useState<'prelims' | 'mains' | 'both'>(
    'both'
  );

  const [
    outline,
    setOutline
  ] = useState('');


  async function loadWorkspace() {
    if (!supabase) {
      setMessage(
        'Supabase is not configured.'
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage('');

    const {
      data: userData
    } =
      await supabase.auth.getUser();

    const user =
      userData.user;

    if (!user) {
      setUserId(null);
      setBooks([]);
      setNodes([]);
      setCompletedIds(
        new Set()
      );
      setMessage(
        'Sign in to use My Reading.'
      );
      setLoading(false);
      return;
    }

    setUserId(
      user.id
    );

    const {
      data: bookRows,
      error: bookError
    } =
      await supabase
        .from('personal_books')
        .select(
          'id,title,author,subject,exam_stage,notes,sort_order'
        )
        .eq(
          'user_id',
          user.id
        )
        .order(
          'sort_order',
          { ascending: true }
        )
        .order(
          'created_at',
          { ascending: true }
        );

    if (bookError) {
      setMessage(
        bookError.message
      );
      setLoading(false);
      return;
    }

    const nextBooks =
      (bookRows || []) as PersonalBook[];

    setBooks(
      nextBooks
    );

    if (
      nextBooks.length === 0
    ) {
      setNodes([]);
      setCompletedIds(
        new Set()
      );
      setActiveBookId(null);
      setLoading(false);
      return;
    }

    const ids =
      nextBooks.map(
        book => book.id
      );

    const {
      data: nodeRows,
      error: nodeError
    } =
      await supabase
        .from(
          'personal_book_nodes'
        )
        .select(
          'id,book_id,parent_id,level,title,sort_order'
        )
        .in(
          'book_id',
          ids
        )
        .order(
          'sort_order',
          { ascending: true }
        );

    if (nodeError) {
      setMessage(
        nodeError.message
      );
      setLoading(false);
      return;
    }

    const nextNodes =
      (nodeRows || []) as PersonalNode[];

    setNodes(
      nextNodes
    );

    const nodeIds =
      nextNodes.map(
        node => node.id
      );

    if (
      nodeIds.length > 0
    ) {
      const {
        data: progressRows,
        error: progressError
      } =
        await supabase
          .from(
            'personal_book_progress'
          )
          .select(
            'node_id,completed'
          )
          .eq(
            'user_id',
            user.id
          )
          .in(
            'node_id',
            nodeIds
          );

      if (progressError) {
        setMessage(
          progressError.message
        );
        setLoading(false);
        return;
      }

      setCompletedIds(
        new Set(
          (progressRows || [])
            .filter(row =>
              row.completed === true
            )
            .map(row =>
              String(
                row.node_id
              )
            )
        )
      );
    } else {
      setCompletedIds(
        new Set()
      );
    }

    setActiveBookId(
      current =>
        current &&
        ids.includes(current)
          ? current
          : ids[0]
    );

    setLoading(false);
  }


  useEffect(
    () => {
      void loadWorkspace();
    },
    []
  );


  const activeBook =
    books.find(
      book =>
        book.id === activeBookId
    ) || null;


  const activeNodes =
    useMemo(
      () =>
        nodes.filter(
          node =>
            node.book_id ===
              activeBookId
        ),
      [
        nodes,
        activeBookId
      ]
    );


  const childrenByParent =
    useMemo(
      () => {
        const map =
          new Map<
            string | null,
            PersonalNode[]
          >();

        activeNodes.forEach(
          node => {
            const key =
              node.parent_id;

            const current =
              map.get(key) || [];

            current.push(
              node
            );

            map.set(
              key,
              current
            );
          }
        );

        map.forEach(
          list =>
            list.sort(
              (first, second) =>
                first.sort_order -
                second.sort_order
            )
        );

        return map;
      },
      [
        activeNodes
      ]
    );


  const leafIds =
    useMemo(
      () =>
        activeNodes
          .filter(
            node =>
              !childrenByParent.has(
                node.id
              )
          )
          .map(
            node => node.id
          ),
      [
        activeNodes,
        childrenByParent
      ]
    );


  const completeLeafCount =
    leafIds.filter(
      id => completedIds.has(id)
    ).length;

  const overallPercent =
    percentage(
      completeLeafCount,
      leafIds.length
    );


  async function addBook() {
    if (
      !supabase ||
      !userId ||
      !title.trim()
    ) {
      return;
    }

    setMessage('');

    const {
      error
    } =
      await supabase
        .from('personal_books')
        .insert({
          user_id:
            userId,
          title:
            title.trim(),
          author:
            author.trim() || null,
          subject:
            subject.trim() || null,
          exam_stage:
            examStage
        });

    if (error) {
      setMessage(
        error.message
      );
      return;
    }

    setTitle('');
    setAuthor('');
    setSubject('');
    setExamStage('both');
    setAddOpen(false);
    await loadWorkspace();
  }


  async function importIndex() {
    if (
      !supabase ||
      !userId ||
      !activeBookId
    ) {
      return;
    }

    const items =
      parseOutline(
        outline
      );

    if (
      items.length === 0
    ) {
      setMessage(
        'Add at least one outline line before importing.'
      );
      return;
    }

    setMessage(
      'Importing outline...'
    );

    const parentByDepth:
      Array<string | null> =
        [
          null,
          null,
          null,
          null
        ];

    let sortOrder = 10;

    for (const item of items) {
      const depth =
        LEVEL_ORDER[
          item.level
        ];

      const parentId =
        depth === 0
          ? null
          : parentByDepth[
              depth - 1
            ];

      const {
        data,
        error
      } =
        await supabase
          .from(
            'personal_book_nodes'
          )
          .insert({
            book_id:
              activeBookId,
            parent_id:
              parentId,
            level:
              item.level,
            title:
              item.title,
            sort_order:
              sortOrder
          })
          .select('id')
          .single();

      if (error) {
        setMessage(
          error.message
        );
        return;
      }

      parentByDepth[
        depth
      ] =
        String(data.id);

      for (
        let index =
          depth + 1;
        index <
          parentByDepth.length;
        index += 1
      ) {
        parentByDepth[index] =
          null;
      }

      sortOrder += 10;
    }

    setOutline('');
    setImportOpen(false);
    setMessage(
      'Index imported successfully.'
    );
    await loadWorkspace();
  }


  async function toggleLeaf(
    nodeId: string
  ) {
    if (
      !supabase ||
      !userId
    ) {
      return;
    }

    const nextCompleted =
      !completedIds.has(
        nodeId
      );

    const {
      error
    } =
      await supabase
        .from(
          'personal_book_progress'
        )
        .upsert(
          {
            user_id:
              userId,
            node_id:
              nodeId,
            completed:
              nextCompleted,
            completed_at:
              nextCompleted
                ? new Date()
                    .toISOString()
                : null
          },
          {
            onConflict:
              'user_id,node_id'
          }
        );

    if (error) {
      setMessage(
        error.message
      );
      return;
    }

    setCompletedIds(
      current => {
        const next =
          new Set(current);

        if (nextCompleted) {
          next.add(nodeId);
        } else {
          next.delete(nodeId);
        }

        return next;
      }
    );
  }


  function descendantLeafIds(
    nodeId: string
  ): string[] {
    const children =
      childrenByParent.get(
        nodeId
      ) || [];

    if (
      children.length === 0
    ) {
      return [
        nodeId
      ];
    }

    return children.flatMap(
      child =>
        descendantLeafIds(
          child.id
        )
    );
  }


  function renderNode(
    node: PersonalNode,
    depth = 0
  ) {
    const children =
      childrenByParent.get(
        node.id
      ) || [];

    const descendants =
      descendantLeafIds(
        node.id
      );

    const done =
      descendants.filter(
        id =>
          completedIds.has(id)
      ).length;

    const percent =
      percentage(
        done,
        descendants.length
      );

    if (
      children.length === 0
    ) {
      const completed =
        completedIds.has(
          node.id
        );

      return (
        <div
          key={node.id}
          style={{
            marginLeft:
              `${depth * 12}px`,
            marginTop:
              '8px',
            padding:
              '10px 12px',
            border:
              '1px solid rgba(255,255,255,.08)',
            borderRadius:
              '12px',
            display:
              'flex',
            alignItems:
              'center',
            justifyContent:
              'space-between',
            gap:
              '12px'
          }}
        >
          <div>
            <small
              style={{
                color:
                  '#94a3b8',
                textTransform:
                  'uppercase'
              }}
            >
              {node.level}
            </small>

            <div>
              <strong>
                {node.title}
              </strong>
            </div>
          </div>

          <button
            type="button"
            className={
              completed
                ? 'filter active'
                : 'filter'
            }
            onClick={() =>
              void toggleLeaf(
                node.id
              )
            }
          >
            {completed
              ? 'Done'
              : 'Mark Done'}
          </button>
        </div>
      );
    }

    return (
      <details
        key={node.id}
        open={depth === 0}
        style={{
          marginLeft:
            `${depth * 10}px`,
          marginTop:
            '8px',
          padding:
            '10px 12px',
          border:
            '1px solid rgba(255,255,255,.08)',
          borderRadius:
            '12px'
        }}
      >
        <summary
          style={{
            cursor:
              'pointer'
          }}
        >
          <span
            style={{
              display:
                'inline-flex',
              width:
                'calc(100% - 20px)',
              justifyContent:
                'space-between',
              gap:
                '12px'
            }}
          >
            <strong>
              {node.title}
            </strong>

            <small
              style={{
                color:
                  '#94a3b8'
              }}
            >
              {done}/{descendants.length}
              {' • '}
              {percent}%
            </small>
          </span>
        </summary>

        <div
          style={{
            marginTop:
              '8px'
          }}
        >
          {children.map(
            child =>
              renderNode(
                child,
                depth + 1
              )
          )}
        </div>
      </details>
    );
  }


  return (
    <div>
      <section
        className="panel"
      >
        <div
          className="panel-head"
        >
          <div>
            <span
              className="eyebrow"
            >
              MY READING
            </span>

            <h2>
              Personal Book Tracker
            </h2>

            <p>
              Track any book as Part → Chapter → Topic → Subtopic and keep exact reading progress.
            </p>
          </div>

          <button
            type="button"
            className="secondary-btn"
            onClick={() =>
              setAddOpen(
                current => !current
              )
            }
          >
            + Add Book
          </button>
        </div>

        {message && (
          <div
            className="callout"
            style={{
              marginTop:
                '12px'
            }}
          >
            {message}
          </div>
        )}

        {addOpen && (
          <div
            style={{
              display:
                'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(170px, 1fr))',
              gap:
                '10px',
              marginTop:
                '14px'
            }}
          >
            <label>
              Book Title
              <input
                value={title}
                onChange={event =>
                  setTitle(
                    event.target.value
                  )
                }
                placeholder="e.g. Indian Polity"
              />
            </label>

            <label>
              Author
              <input
                value={author}
                onChange={event =>
                  setAuthor(
                    event.target.value
                  )
                }
                placeholder="Optional"
              />
            </label>

            <label>
              Subject
              <input
                value={subject}
                onChange={event =>
                  setSubject(
                    event.target.value
                  )
                }
                placeholder="e.g. Polity"
              />
            </label>

            <label>
              Exam Stage
              <select
                value={examStage}
                onChange={event =>
                  setExamStage(
                    event.target.value as
                      'prelims' |
                      'mains' |
                      'both'
                  )
                }
              >
                <option value="both">
                  Prelims + Mains
                </option>
                <option value="prelims">
                  Prelims
                </option>
                <option value="mains">
                  Mains
                </option>
              </select>
            </label>

            <button
              type="button"
              className="primary-btn"
              onClick={() =>
                void addBook()
              }
            >
              Save Book
            </button>
          </div>
        )}
      </section>

      <section
        className="panel"
        style={{
          marginTop:
            '12px'
        }}
      >
        {loading ? (
          <p>
            Loading your reading workspace...
          </p>
        ) : books.length === 0 ? (
          <div>
            <h3>
              No personal books yet
            </h3>
            <p>
              Add your first book, then import its index in seconds.
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                display:
                  'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(190px, 1fr))',
                gap:
                  '10px'
              }}
            >
              {books.map(
                book => (
                  <button
                    type="button"
                    key={book.id}
                    className={
                      activeBookId ===
                        book.id
                        ? 'filter active'
                        : 'filter'
                    }
                    onClick={() =>
                      setActiveBookId(
                        book.id
                      )
                    }
                    style={{
                      textAlign:
                        'left',
                      minHeight:
                        '62px'
                    }}
                  >
                    <strong>
                      {book.title}
                    </strong>
                    <br />
                    <small>
                      {book.subject ||
                        book.author ||
                        'Personal reading'}
                    </small>
                  </button>
                )
              )}
            </div>

            {activeBook && (
              <div
                style={{
                  marginTop:
                    '16px'
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
                    flexWrap:
                      'wrap',
                    alignItems:
                      'center'
                  }}
                >
                  <div>
                    <span
                      className="eyebrow"
                    >
                      ACTIVE BOOK
                    </span>
                    <h3
                      style={{
                        margin:
                          '5px 0'
                      }}
                    >
                      {activeBook.title}
                    </h3>
                    <small
                      style={{
                        color:
                          '#94a3b8'
                      }}
                    >
                      {completeLeafCount}/{leafIds.length} items complete • {overallPercent}%
                    </small>
                  </div>

                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() =>
                      setImportOpen(
                        current => !current
                      )
                    }
                  >
                    Import Index
                  </button>
                </div>

                <div
                  style={{
                    height:
                      '8px',
                    borderRadius:
                      '999px',
                    background:
                      'rgba(255,255,255,.08)',
                    overflow:
                      'hidden',
                    marginTop:
                      '12px'
                  }}
                >
                  <div
                    style={{
                      width:
                        `${overallPercent}%`,
                      height:
                        '100%',
                      background:
                        'currentColor'
                    }}
                  />
                </div>

                {importOpen && (
                  <div
                    style={{
                      marginTop:
                        '14px'
                    }}
                  >
                    <label>
                      Fast Index Import
                      <textarea
                        rows={10}
                        value={outline}
                        onChange={event =>
                          setOutline(
                            event.target.value
                          )
                        }
                        placeholder={
                          'Part: Constitution\nChapter: Fundamental Rights\nTopic: Article 14\nSubtopic: Equality before law\n\nYou can also use 2-space indentation.'
                        }
                      />
                    </label>

                    <button
                      type="button"
                      className="primary-btn"
                      onClick={() =>
                        void importIndex()
                      }
                      style={{
                        marginTop:
                          '10px'
                      }}
                    >
                      Import Outline
                    </button>
                  </div>
                )}

                <div
                  style={{
                    marginTop:
                      '14px'
                  }}
                >
                  {activeNodes.length === 0 ? (
                    <div
                      className="callout"
                    >
                      Import the book index to start topic-level tracking.
                    </div>
                  ) : (
                    (childrenByParent.get(null) || [])
                      .map(node =>
                        renderNode(node)
                      )
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

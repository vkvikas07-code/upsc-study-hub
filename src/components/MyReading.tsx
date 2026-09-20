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


type ExamStage =
  | 'prelims'
  | 'mains'
  | 'both';


type PersonalBook = {
  id: string;
  title: string;
  author: string | null;
  subject: string | null;
  exam_stage: ExamStage;
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


const LEVEL_ORDER: Record<
  NodeLevel,
  number
> = {
  part: 0,
  chapter: 1,
  topic: 2,
  subtopic: 3
};


const LEVEL_LABEL: Record<
  NodeLevel,
  string
> = {
  part: 'Part',
  chapter: 'Chapter',
  topic: 'Topic',
  subtopic: 'Subtopic'
};


/* =========================================================
   HELPERS
========================================================= */

function percentage(
  complete: number,
  total: number
) {

  if (total <= 0) {
    return 0;
  }

  return Math.round(
    complete * 100 / total
  );
}


function normaliseLevel(
  value: string
): NodeLevel | null {

  const text =
    value
      .trim()
      .toLowerCase();

  if (text === 'part') {
    return 'part';
  }

  if (text === 'chapter') {
    return 'chapter';
  }

  if (text === 'topic') {
    return 'topic';
  }

  if (text === 'subtopic') {
    return 'subtopic';
  }

  return null;
}


function parseOutline(
  value: string
): ParsedLine[] {

  const lines =
    value
      .split(/\r?\n/)
      .map(
        line =>
          line.trimEnd()
      )
      .filter(
        line =>
          line.trim().length > 0
      );


  const output: ParsedLine[] = [];


  for (
    const rawLine
    of lines
  ) {

    /*
      Recommended format:

      Part: Constitutional Framework
      Chapter: Fundamental Rights
      Topic: Article 14
      Subtopic: Equality
    */

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

        output.push({
          level,
          title:
            explicit[2].trim()
        });

      }

      continue;
    }


    /*
      Alternative indented format:

      Part Name
        Chapter Name
          Topic Name
            Subtopic Name
    */

    const spaces =
      rawLine
        .match(/^\s*/)?.[0]
        .replace(
          /\t/g,
          '    '
        )
        .length || 0;


    const depth =
      Math.min(
        3,
        Math.floor(
          spaces / 2
        )
      );


    const level: NodeLevel =
      depth === 0
        ? 'part'
        : depth === 1
          ? 'chapter'
          : depth === 2
            ? 'topic'
            : 'subtopic';


    output.push({
      level,
      title:
        rawLine.trim()
    });

  }


  return output;
}


/* =========================================================
   COMPONENT
========================================================= */

export function MyReading() {

  /* =======================================================
     USER
  ======================================================= */

  const [
    userId,
    setUserId
  ] =
    useState<string | null>(
      null
    );


  /* =======================================================
     DATABASE DATA
  ======================================================= */

  const [
    books,
    setBooks
  ] =
    useState<PersonalBook[]>(
      []
    );


  const [
    nodes,
    setNodes
  ] =
    useState<PersonalNode[]>(
      []
    );


  const [
    completedIds,
    setCompletedIds
  ] =
    useState<Set<string>>(
      new Set()
    );


  const [
    activeBookId,
    setActiveBookId
  ] =
    useState<string | null>(
      null
    );


  /* =======================================================
     GENERAL UI
  ======================================================= */

  const [
    loading,
    setLoading
  ] =
    useState(
      true
    );


  const [
    message,
    setMessage
  ] =
    useState(
      ''
    );


  const [
    bookSearch,
    setBookSearch
  ] =
    useState(
      ''
    );


  const [
    contentSearch,
    setContentSearch
  ] =
    useState(
      ''
    );


  const [
    highlightedNodeId,
    setHighlightedNodeId
  ] =
    useState<string | null>(
      null
    );


  /* =======================================================
     ADD BOOK
  ======================================================= */

  const [
    addBookOpen,
    setAddBookOpen
  ] =
    useState(
      false
    );


  const [
    newBookTitle,
    setNewBookTitle
  ] =
    useState(
      ''
    );


  const [
    newBookAuthor,
    setNewBookAuthor
  ] =
    useState(
      ''
    );


  const [
    newBookSubject,
    setNewBookSubject
  ] =
    useState(
      ''
    );


  const [
    newBookStage,
    setNewBookStage
  ] =
    useState<ExamStage>(
      'both'
    );


  const [
    newBookNotes,
    setNewBookNotes
  ] =
    useState(
      ''
    );


  /* =======================================================
     EDIT BOOK
  ======================================================= */

  const [
    editBookOpen,
    setEditBookOpen
  ] =
    useState(
      false
    );


  const [
    editTitle,
    setEditTitle
  ] =
    useState(
      ''
    );


  const [
    editAuthor,
    setEditAuthor
  ] =
    useState(
      ''
    );


  const [
    editSubject,
    setEditSubject
  ] =
    useState(
      ''
    );


  const [
    editStage,
    setEditStage
  ] =
    useState<ExamStage>(
      'both'
    );


  const [
    editNotes,
    setEditNotes
  ] =
    useState(
      ''
    );


  /* =======================================================
     INDEX IMPORT
  ======================================================= */

  const [
    importOpen,
    setImportOpen
  ] =
    useState(
      false
    );


  const [
    outline,
    setOutline
  ] =
    useState(
      ''
    );


  /* =======================================================
     MANUAL STRUCTURE
  ======================================================= */

  const [
    structureOpen,
    setStructureOpen
  ] =
    useState(
      false
    );


  const [
    nodeLevel,
    setNodeLevel
  ] =
    useState<NodeLevel>(
      'chapter'
    );


  const [
    nodeParentId,
    setNodeParentId
  ] =
    useState(
      ''
    );


  const [
    nodeTitle,
    setNodeTitle
  ] =
    useState(
      ''
    );


  /* =======================================================
     LOAD EVERYTHING
  ======================================================= */

  async function loadWorkspace(
    preferredBookId?: string | null
  ) {

    if (!supabase) {

      setMessage(
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


    const {
      data: authData
    } =
      await supabase
        .auth
        .getUser();


    const user =
      authData.user;


    if (!user) {

      setUserId(
        null
      );

      setBooks(
        []
      );

      setNodes(
        []
      );

      setCompletedIds(
        new Set()
      );

      setActiveBookId(
        null
      );

      setMessage(
        'Sign in to use My Reading.'
      );

      setLoading(
        false
      );

      return;
    }


    setUserId(
      user.id
    );


    /* -------------------------------------------------------
       BOOKS
    ------------------------------------------------------- */

    const {
      data: bookRows,
      error: bookError
    } =
      await supabase
        .from(
          'personal_books'
        )
        .select(
          `
            id,
            title,
            author,
            subject,
            exam_stage,
            notes,
            sort_order
          `
        )
        .eq(
          'user_id',
          user.id
        )
        .order(
          'sort_order',
          {
            ascending: true
          }
        )
        .order(
          'created_at',
          {
            ascending: true
          }
        );


    if (bookError) {

      console.error(
        bookError
      );

      setMessage(
        bookError.message
      );

      setLoading(
        false
      );

      return;
    }


    const loadedBooks =
      (
        bookRows ||
        []
      ) as PersonalBook[];


    setBooks(
      loadedBooks
    );


    if (
      loadedBooks.length ===
      0
    ) {

      setNodes(
        []
      );

      setCompletedIds(
        new Set()
      );

      setActiveBookId(
        null
      );

      setLoading(
        false
      );

      return;
    }


    const bookIds =
      loadedBooks.map(
        book =>
          book.id
      );


    /* -------------------------------------------------------
       BOOK STRUCTURE
    ------------------------------------------------------- */

    const {
      data: nodeRows,
      error: nodeError
    } =
      await supabase
        .from(
          'personal_book_nodes'
        )
        .select(
          `
            id,
            book_id,
            parent_id,
            level,
            title,
            sort_order
          `
        )
        .in(
          'book_id',
          bookIds
        )
        .order(
          'sort_order',
          {
            ascending: true
          }
        )
        .order(
          'created_at',
          {
            ascending: true
          }
        );


    if (nodeError) {

      console.error(
        nodeError
      );

      setMessage(
        nodeError.message
      );

      setLoading(
        false
      );

      return;
    }


    const loadedNodes =
      (
        nodeRows ||
        []
      ) as PersonalNode[];


    setNodes(
      loadedNodes
    );


    /* -------------------------------------------------------
       PROGRESS
    ------------------------------------------------------- */

    const nodeIds =
      loadedNodes.map(
        node =>
          node.id
      );


    if (
      nodeIds.length >
      0
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
            `
              node_id,
              completed
            `
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

        console.error(
          progressError
        );

        setMessage(
          progressError.message
        );

        setLoading(
          false
        );

        return;
      }


      const completed =
        new Set(
          (
            progressRows ||
            []
          )
            .filter(
              row =>
                row.completed ===
                true
            )
            .map(
              row =>
                String(
                  row.node_id
                )
            )
        );


      setCompletedIds(
        completed
      );

    } else {

      setCompletedIds(
        new Set()
      );

    }


    const requested =
      preferredBookId &&
      bookIds.includes(
        preferredBookId
      )
        ? preferredBookId
        : null;


    setActiveBookId(
      current => {

        if (requested) {
          return requested;
        }

        if (
          current &&
          bookIds.includes(
            current
          )
        ) {
          return current;
        }

        return bookIds[0];

      }
    );


    setLoading(
      false
    );

  }


  /* =======================================================
     FIRST LOAD
  ======================================================= */

  useEffect(
    () => {

      void loadWorkspace();

    },
    []
  );


  /* =======================================================
     ACTIVE BOOK
  ======================================================= */

  const activeBook =
    useMemo(
      () =>

        books.find(
          book =>
            book.id ===
            activeBookId
        ) ||
        null,

      [
        books,
        activeBookId
      ]
    );


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


  /* =======================================================
     CHILD MAP
  ======================================================= */

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

            const current =
              map.get(
                node.parent_id
              ) ||
              [];


            current.push(
              node
            );


            map.set(
              node.parent_id,
              current
            );

          }
        );


        map.forEach(
          list => {

            list.sort(
              (
                first,
                second
              ) =>
                first.sort_order -
                second.sort_order
            );

          }
        );


        return map;

      },
      [
        activeNodes
      ]
    );


  /* =======================================================
     LEAF IDS
  ======================================================= */

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
            node =>
              node.id
          ),

      [
        activeNodes,
        childrenByParent
      ]
    );


  const completedLeafCount =
    leafIds.filter(
      id =>
        completedIds.has(
          id
        )
    ).length;


  const overallProgress =
    percentage(
      completedLeafCount,
      leafIds.length
    );


  /* =======================================================
     BOOK STATUS
  ======================================================= */

  function getBookStats(
    bookId: string
  ) {

    const bookNodes =
      nodes.filter(
        node =>
          node.book_id ===
          bookId
      );


    const parentIds =
      new Set(
        bookNodes
          .map(
            node =>
              node.parent_id
          )
          .filter(
            (
              id
            ): id is string =>
              Boolean(id)
          )
      );


    const leaves =
      bookNodes.filter(
        node =>
          !parentIds.has(
            node.id
          )
      );


    const done =
      leaves.filter(
        node =>
          completedIds.has(
            node.id
          )
      ).length;


    const percent =
      percentage(
        done,
        leaves.length
      );


    let status =
      'Not Started';


    if (
      percent > 0 &&
      percent < 100
    ) {

      status =
        'In Progress';

    }


    if (
      percent === 100 &&
      leaves.length > 0
    ) {

      status =
        'Completed';

    }


    return {
      total:
        leaves.length,

      done,

      percent,

      status
    };

  }


  /* =======================================================
     FILTER BOOKS
  ======================================================= */

  const visibleBooks =
    useMemo(
      () => {

        const query =
          bookSearch
            .trim()
            .toLowerCase();


        if (!query) {
          return books;
        }


        return books.filter(
          book => {

            const text =
              [
                book.title,
                book.author || '',
                book.subject || ''
              ]
                .join(' ')
                .toLowerCase();


            return text.includes(
              query
            );

          }
        );

      },
      [
        books,
        bookSearch
      ]
    );


  /* =======================================================
     CONTENT SEARCH
  ======================================================= */

  const contentMatches =
    useMemo(
      () => {

        const query =
          contentSearch
            .trim()
            .toLowerCase();


        if (!query) {
          return [];
        }


        return activeNodes.filter(
          node =>
            node.title
              .toLowerCase()
              .includes(
                query
              )
        );

      },
      [
        activeNodes,
        contentSearch
      ]
    );


  /* =======================================================
     ADD BOOK
  ======================================================= */

  async function addBook() {

    if (
      !supabase ||
      !userId ||
      !newBookTitle.trim()
    ) {
      return;
    }


    setMessage(
      ''
    );


    const {
      data,
      error
    } =
      await supabase
        .from(
          'personal_books'
        )
        .insert({

          user_id:
            userId,

          title:
            newBookTitle.trim(),

          author:
            newBookAuthor.trim() ||
            null,

          subject:
            newBookSubject.trim() ||
            null,

          exam_stage:
            newBookStage,

          notes:
            newBookNotes.trim() ||
            null

        })
        .select(
          'id'
        )
        .single();


    if (error) {

      console.error(
        error
      );

      setMessage(
        error.message
      );

      return;
    }


    const newId =
      String(
        data.id
      );


    setNewBookTitle('');
    setNewBookAuthor('');
    setNewBookSubject('');
    setNewBookStage('both');
    setNewBookNotes('');

    setAddBookOpen(
      false
    );


    setMessage(
      'Book added successfully.'
    );


    await loadWorkspace(
      newId
    );

  }


  /* =======================================================
     OPEN EDIT FORM
  ======================================================= */

  function openEditBook() {

    if (!activeBook) {
      return;
    }


    setEditTitle(
      activeBook.title
    );

    setEditAuthor(
      activeBook.author ||
      ''
    );

    setEditSubject(
      activeBook.subject ||
      ''
    );

    setEditStage(
      activeBook.exam_stage
    );

    setEditNotes(
      activeBook.notes ||
      ''
    );

    setEditBookOpen(
      true
    );

  }


  /* =======================================================
     SAVE BOOK CHANGES
  ======================================================= */

  async function updateBook() {

    if (
      !supabase ||
      !activeBook ||
      !editTitle.trim()
    ) {
      return;
    }


    const {
      error
    } =
      await supabase
        .from(
          'personal_books'
        )
        .update({

          title:
            editTitle.trim(),

          author:
            editAuthor.trim() ||
            null,

          subject:
            editSubject.trim() ||
            null,

          exam_stage:
            editStage,

          notes:
            editNotes.trim() ||
            null

        })
        .eq(
          'id',
          activeBook.id
        );


    if (error) {

      console.error(
        error
      );

      setMessage(
        error.message
      );

      return;
    }


    setEditBookOpen(
      false
    );


    setMessage(
      'Book updated successfully.'
    );


    await loadWorkspace(
      activeBook.id
    );

  }


  /* =======================================================
     DELETE BOOK
  ======================================================= */

  async function deleteBook() {

    if (
      !supabase ||
      !activeBook
    ) {
      return;
    }


    const confirmed =
      window.confirm(
        `Delete "${activeBook.title}" and all its reading progress?`
      );


    if (!confirmed) {
      return;
    }


    const {
      error
    } =
      await supabase
        .from(
          'personal_books'
        )
        .delete()
        .eq(
          'id',
          activeBook.id
        );


    if (error) {

      console.error(
        error
      );

      setMessage(
        error.message
      );

      return;
    }


    setMessage(
      'Book deleted.'
    );


    setEditBookOpen(
      false
    );

    setImportOpen(
      false
    );

    setStructureOpen(
      false
    );


    await loadWorkspace(
      null
    );

  }


  /* =======================================================
     IMPORT INDEX
  ======================================================= */

  async function importIndex() {

    if (
      !supabase ||
      !activeBookId
    ) {
      return;
    }


    const parsed =
      parseOutline(
        outline
      );


    if (
      parsed.length ===
      0
    ) {

      setMessage(
        'Enter the book outline first.'
      );

      return;
    }


    const parentByDepth:
      Array<string | null> =
      [
        null,
        null,
        null,
        null
      ];


    let sortOrder =
      Math.max(
        0,
        ...activeNodes.map(
          node =>
            node.sort_order
        )
      ) +
      10;


    for (
      const item
      of parsed
    ) {

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
          .select(
            'id'
          )
          .single();


      if (error) {

        console.error(
          error
        );

        setMessage(
          error.message
        );

        return;
      }


      parentByDepth[
        depth
      ] =
        String(
          data.id
        );


      for (
        let index =
          depth + 1;
        index <
          parentByDepth.length;
        index += 1
      ) {

        parentByDepth[
          index
        ] =
          null;

      }


      sortOrder +=
        10;

    }


    setOutline(
      ''
    );

    setImportOpen(
      false
    );


    setMessage(
      'Book index imported successfully.'
    );


    await loadWorkspace(
      activeBookId
    );

  }


  /* =======================================================
     MANUAL PARENT OPTIONS
  ======================================================= */

  const parentOptions =
    useMemo(
      () => {

        if (
          nodeLevel ===
          'part'
        ) {
          return [];
        }


        let expectedLevel:
          NodeLevel;


        if (
          nodeLevel ===
          'chapter'
        ) {

          expectedLevel =
            'part';

        } else if (
          nodeLevel ===
          'topic'
        ) {

          expectedLevel =
            'chapter';

        } else {

          expectedLevel =
            'topic';

        }


        return activeNodes.filter(
          node =>
            node.level ===
            expectedLevel
        );

      },
      [
        nodeLevel,
        activeNodes
      ]
    );


  /* =======================================================
     ADD MANUAL STRUCTURE NODE
  ======================================================= */

  async function addStructureNode() {

    if (
      !supabase ||
      !activeBookId ||
      !nodeTitle.trim()
    ) {
      return;
    }


    const selectedParent =
      nodeParentId ||
      null;


    const siblingNodes =
      activeNodes.filter(
        node =>
          node.parent_id ===
          selectedParent
      );


    const sortOrder =
      Math.max(
        0,
        ...siblingNodes.map(
          node =>
            node.sort_order
        )
      ) +
      10;


    const {
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
            selectedParent,

          level:
            nodeLevel,

          title:
            nodeTitle.trim(),

          sort_order:
            sortOrder

        });


    if (error) {

      console.error(
        error
      );

      setMessage(
        error.message
      );

      return;
    }


    setNodeTitle(
      ''
    );


    setMessage(
      `${LEVEL_LABEL[nodeLevel]} added.`
    );


    await loadWorkspace(
      activeBookId
    );

  }


  /* =======================================================
     WHEN LEVEL CHANGES
  ======================================================= */

  useEffect(
    () => {

      setNodeParentId(
        ''
      );

    },
    [
      nodeLevel
    ]
  );


  /* =======================================================
     MARK LEAF COMPLETE
  ======================================================= */

  async function toggleLeaf(
    nodeId: string
  ) {

    if (
      !supabase ||
      !userId
    ) {
      return;
    }


    const completed =
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

            completed,

            completed_at:
              completed
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

      console.error(
        error
      );

      setMessage(
        error.message
      );

      return;
    }


    setCompletedIds(
      current => {

        const next =
          new Set(
            current
          );


        if (completed) {

          next.add(
            nodeId
          );

        } else {

          next.delete(
            nodeId
          );

        }


        return next;

      }
    );

  }


  /* =======================================================
     DESCENDANT LEAVES
  ======================================================= */

  function descendantLeafIds(
    nodeId: string
  ): string[] {

    const children =
      childrenByParent.get(
        nodeId
      ) ||
      [];


    if (
      children.length ===
      0
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


  /* =======================================================
     SCROLL TO NODE
  ======================================================= */

  function scrollToNode(
    nodeId: string
  ) {

    setHighlightedNodeId(
      nodeId
    );


    window.setTimeout(
      () => {

        const element =
          document.getElementById(
            `reading-node-${nodeId}`
          );


        element?.scrollIntoView({
          behavior:
            'smooth',

          block:
            'center'
        });

      },
      50
    );


    window.setTimeout(
      () => {

        setHighlightedNodeId(
          current =>
            current === nodeId
              ? null
              : current
        );

      },
      2200
    );

  }


  /* =======================================================
     CONTINUE READING
  ======================================================= */

  function continueReading() {

    const nextId =
      leafIds.find(
        id =>
          !completedIds.has(
            id
          )
      );


    if (!nextId) {

      setMessage(
        leafIds.length > 0
          ? 'This book is fully completed.'
          : 'Add the book structure first.'
      );

      return;
    }


    scrollToNode(
      nextId
    );

  }


  /* =======================================================
     RENDER NODE
  ======================================================= */

  function renderNode(
    node: PersonalNode,
    depth = 0
  ) {

    const children =
      childrenByParent.get(
        node.id
      ) ||
      [];


    const descendants =
      descendantLeafIds(
        node.id
      );


    const done =
      descendants.filter(
        id =>
          completedIds.has(
            id
          )
      ).length;


    const percent =
      percentage(
        done,
        descendants.length
      );


    const highlighted =
      highlightedNodeId ===
      node.id;


    /* -----------------------------------------------------
       LEAF
    ----------------------------------------------------- */

    if (
      children.length ===
      0
    ) {

      const completed =
        completedIds.has(
          node.id
        );


      return (

        <div

          id={
            `reading-node-${node.id}`
          }

          key={
            node.id
          }

          style={{

            marginLeft:
              `${depth * 10}px`,

            marginTop:
              '8px',

            padding:
              '10px 12px',

            border:
              highlighted
                ? '1px solid currentColor'
                : '1px solid rgba(255,255,255,.08)',

            borderRadius:
              '12px',

            display:
              'flex',

            alignItems:
              'center',

            justifyContent:
              'space-between',

            gap:
              '10px',

            flexWrap:
              'wrap',

            transition:
              'border .2s ease'

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

              {
                LEVEL_LABEL[
                  node.level
                ]
              }

            </small>


            <div>

              <strong>
                {
                  node.title
                }
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

            {
              completed
                ? 'Completed ✓'
                : 'Mark Done'
            }

          </button>

        </div>

      );

    }


    /* -----------------------------------------------------
       PARENT
    ----------------------------------------------------- */

    return (

      <details

        id={
          `reading-node-${node.id}`
        }

        key={
          node.id
        }

        open={
          depth === 0 ||
          highlighted
        }

        style={{

          marginLeft:
            `${depth * 8}px`,

          marginTop:
            '8px',

          padding:
            '10px 12px',

          border:
            highlighted
              ? '1px solid currentColor'
              : '1px solid rgba(255,255,255,.08)',

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
                'calc(100% - 18px)',

              justifyContent:
                'space-between',

              gap:
                '10px',

              verticalAlign:
                'middle'

            }}
          >

            <span>

              <small
                style={{
                  color:
                    '#94a3b8'
                }}
              >

                {
                  LEVEL_LABEL[
                    node.level
                  ]
                }

              </small>


              <br />


              <strong>
                {
                  node.title
                }
              </strong>

            </span>


            <small
              style={{
                color:
                  '#94a3b8',

                flex:
                  '0 0 auto'
              }}
            >

              {
                done
              }

              /

              {
                descendants.length
              }

              {' • '}

              {
                percent
              }

              %

            </small>

          </span>

        </summary>


        <div
          style={{
            marginTop:
              '10px'
          }}
        >

          {
            children.map(
              child =>
                renderNode(
                  child,
                  depth + 1
                )
            )
          }

        </div>

      </details>

    );

  }


  /* =======================================================
     UI
  ======================================================= */

  return (

    <div>

      {/* ===================================================
          HEADER
      =================================================== */}

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
              Personal Reading Workspace
            </h2>


            <p>
              Add your books, organise chapters and
              topics, track completion and continue
              exactly where you stopped.
            </p>

          </div>


          <button

            type="button"

            className="primary-btn"

            onClick={() =>
              setAddBookOpen(
                current =>
                  !current
              )
            }

          >

            + Add Book

          </button>

        </div>


        {
          message && (

            <div
              className="callout"

              style={{
                marginTop:
                  '12px'
              }}
            >

              {
                message
              }

            </div>

          )
        }


        {/* =================================================
            ADD BOOK FORM
        ================================================= */}

        {
          addBookOpen && (

            <div
              style={{

                display:
                  'grid',

                gridTemplateColumns:
                  'repeat(auto-fit, minmax(180px, 1fr))',

                gap:
                  '10px',

                marginTop:
                  '14px'

              }}
            >

              <label>

                Book Title

                <input

                  value={
                    newBookTitle
                  }

                  onChange={
                    event =>
                      setNewBookTitle(
                        event.target.value
                      )
                  }

                  placeholder="Indian Polity"

                />

              </label>


              <label>

                Author

                <input

                  value={
                    newBookAuthor
                  }

                  onChange={
                    event =>
                      setNewBookAuthor(
                        event.target.value
                      )
                  }

                  placeholder="M. Laxmikanth"

                />

              </label>


              <label>

                Subject

                <input

                  value={
                    newBookSubject
                  }

                  onChange={
                    event =>
                      setNewBookSubject(
                        event.target.value
                      )
                  }

                  placeholder="Polity"

                />

              </label>


              <label>

                Exam Stage

                <select

                  value={
                    newBookStage
                  }

                  onChange={
                    event =>
                      setNewBookStage(
                        event.target
                          .value as
                          ExamStage
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


              <label
                style={{
                  gridColumn:
                    '1 / -1'
                }}
              >

                Notes

                <textarea

                  rows={
                    3
                  }

                  value={
                    newBookNotes
                  }

                  onChange={
                    event =>
                      setNewBookNotes(
                        event.target.value
                      )
                  }

                  placeholder="Optional notes about this book..."

                />

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

          )
        }

      </section>


      {/* ===================================================
          MAIN WORKSPACE
      =================================================== */}

      <section
        className="panel"

        style={{
          marginTop:
            '12px'
        }}
      >

        {
          loading
            ? (

              <p>
                Loading reading workspace...
              </p>

            )

            : books.length ===
              0
              ? (

                <div>

                  <h3>
                    Start your reading library
                  </h3>

                  <p>
                    Add your first UPSC or personal
                    study book using the Add Book
                    button above.
                  </p>

                </div>

              )

              : (

                <>

                  {/* =========================================
                      BOOK SEARCH
                  ========================================= */}

                  <label>

                    Search My Books

                    <input

                      type="search"

                      value={
                        bookSearch
                      }

                      onChange={
                        event =>
                          setBookSearch(
                            event.target.value
                          )
                      }

                      placeholder="Book, author or subject..."

                    />

                  </label>


                  {/* =========================================
                      BOOK CARDS
                  ========================================= */}

                  <div
                    style={{

                      display:
                        'grid',

                      gridTemplateColumns:
                        'repeat(auto-fit, minmax(200px, 1fr))',

                      gap:
                        '10px',

                      marginTop:
                        '12px'

                    }}
                  >

                    {
                      visibleBooks.map(
                        book => {

                          const stats =
                            getBookStats(
                              book.id
                            );


                          return (

                            <button

                              key={
                                book.id
                              }

                              type="button"

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
                                  '92px',

                                padding:
                                  '12px'

                              }}

                            >

                              <strong>
                                {
                                  book.title
                                }
                              </strong>


                              <div
                                style={{
                                  marginTop:
                                    '5px'
                                }}
                              >

                                <small>

                                  {
                                    book.subject ||
                                    book.author ||
                                    'Personal Reading'
                                  }

                                </small>

                              </div>


                              <div
                                style={{
                                  marginTop:
                                    '7px'
                                }}
                              >

                                <small>

                                  {
                                    stats.status
                                  }

                                  {' • '}

                                  {
                                    stats.percent
                                  }

                                  %

                                </small>

                              </div>

                            </button>

                          );

                        }
                      )
                    }

                  </div>


                  {/* =========================================
                      ACTIVE BOOK
                  ========================================= */}

                  {
                    activeBook && (

                      <div
                        style={{
                          marginTop:
                            '18px'
                        }}
                      >

                        {/* ===================================
                            BOOK HEADER
                        =================================== */}

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

                              {
                                activeBook.title
                              }

                            </h3>


                            {
                              activeBook.author && (

                                <div>
                                  {
                                    activeBook.author
                                  }
                                </div>

                              )
                            }


                            <small
                              style={{
                                color:
                                  '#94a3b8'
                              }}
                            >

                              {
                                completedLeafCount
                              }

                              /

                              {
                                leafIds.length
                              }

                              {' items complete • '}

                              {
                                overallProgress
                              }

                              %

                            </small>

                          </div>


                          <div
                            style={{

                              display:
                                'flex',

                              gap:
                                '8px',

                              flexWrap:
                                'wrap'

                            }}
                          >

                            <button

                              type="button"

                              className="primary-btn"

                              onClick={
                                continueReading
                              }

                            >

                              Continue Reading

                            </button>


                            <button

                              type="button"

                              className="secondary-btn"

                              onClick={
                                openEditBook
                              }

                            >

                              Edit Book

                            </button>

                          </div>

                        </div>


                        {/* ===================================
                            PROGRESS BAR
                        =================================== */}

                        <div
                          style={{

                            height:
                              '9px',

                            marginTop:
                              '12px',

                            background:
                              'rgba(255,255,255,.08)',

                            borderRadius:
                              '999px',

                            overflow:
                              'hidden'

                          }}
                        >

                          <div
                            style={{

                              width:
                                `${overallProgress}%`,

                              height:
                                '100%',

                              background:
                                'currentColor',

                              transition:
                                'width .25s ease'

                            }}
                          />

                        </div>


                        {/* ===================================
                            BOOK NOTES
                        =================================== */}

                        {
                          activeBook.notes && (

                            <div
                              className="callout"

                              style={{
                                marginTop:
                                  '12px'
                              }}
                            >

                              {
                                activeBook.notes
                              }

                            </div>

                          )
                        }


                        {/* ===================================
                            EDIT BOOK
                        =================================== */}

                        {
                          editBookOpen && (

                            <div
                              className="callout"

                              style={{
                                marginTop:
                                  '14px'
                              }}
                            >

                              <h3>
                                Edit Book
                              </h3>


                              <div
                                style={{

                                  display:
                                    'grid',

                                  gridTemplateColumns:
                                    'repeat(auto-fit, minmax(170px, 1fr))',

                                  gap:
                                    '10px'

                                }}
                              >

                                <label>

                                  Title

                                  <input

                                    value={
                                      editTitle
                                    }

                                    onChange={
                                      event =>
                                        setEditTitle(
                                          event.target.value
                                        )
                                    }

                                  />

                                </label>


                                <label>

                                  Author

                                  <input

                                    value={
                                      editAuthor
                                    }

                                    onChange={
                                      event =>
                                        setEditAuthor(
                                          event.target.value
                                        )
                                    }

                                  />

                                </label>


                                <label>

                                  Subject

                                  <input

                                    value={
                                      editSubject
                                    }

                                    onChange={
                                      event =>
                                        setEditSubject(
                                          event.target.value
                                        )
                                    }

                                  />

                                </label>


                                <label>

                                  Exam Stage

                                  <select

                                    value={
                                      editStage
                                    }

                                    onChange={
                                      event =>
                                        setEditStage(
                                          event.target
                                            .value as
                                            ExamStage
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


                                <label
                                  style={{
                                    gridColumn:
                                      '1 / -1'
                                  }}
                                >

                                  Notes

                                  <textarea

                                    rows={
                                      3
                                    }

                                    value={
                                      editNotes
                                    }

                                    onChange={
                                      event =>
                                        setEditNotes(
                                          event.target.value
                                        )
                                    }

                                  />

                                </label>

                              </div>


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

                                <button

                                  type="button"

                                  className="primary-btn"

                                  onClick={() =>
                                    void updateBook()
                                  }

                                >

                                  Save Changes

                                </button>


                                <button

                                  type="button"

                                  className="secondary-btn"

                                  onClick={() =>
                                    setEditBookOpen(
                                      false
                                    )
                                  }

                                >

                                  Cancel

                                </button>


                                <button

                                  type="button"

                                  className="text-btn"

                                  onClick={() =>
                                    void deleteBook()
                                  }

                                >

                                  Delete Book

                                </button>

                              </div>

                            </div>

                          )
                        }


                        {/* ===================================
                            BOOK MANAGEMENT BUTTONS
                        =================================== */}

                        <div
                          style={{

                            display:
                              'grid',

                            gridTemplateColumns:
                              'repeat(2, minmax(0, 1fr))',

                            gap:
                              '8px',

                            marginTop:
                              '14px'

                          }}
                        >

                          <button

                            type="button"

                            className="secondary-btn"

                            onClick={() =>
                              setStructureOpen(
                                current =>
                                  !current
                              )
                            }

                          >

                            + Add Topic Manually

                          </button>


                          <button

                            type="button"

                            className="secondary-btn"

                            onClick={() =>
                              setImportOpen(
                                current =>
                                  !current
                              )
                            }

                          >

                            Import Book Index

                          </button>

                        </div>


                        {/* ===================================
                            MANUAL NODE CREATOR
                        =================================== */}

                        {
                          structureOpen && (

                            <div
                              className="callout"

                              style={{
                                marginTop:
                                  '12px'
                              }}
                            >

                              <h3>
                                Add Book Structure
                              </h3>


                              <div
                                style={{

                                  display:
                                    'grid',

                                  gridTemplateColumns:
                                    'repeat(auto-fit, minmax(170px, 1fr))',

                                  gap:
                                    '10px'

                                }}
                              >

                                <label>

                                  Type

                                  <select

                                    value={
                                      nodeLevel
                                    }

                                    onChange={
                                      event =>
                                        setNodeLevel(
                                          event.target
                                            .value as
                                            NodeLevel
                                        )
                                    }

                                  >

                                    <option value="part">
                                      Part
                                    </option>

                                    <option value="chapter">
                                      Chapter
                                    </option>

                                    <option value="topic">
                                      Topic
                                    </option>

                                    <option value="subtopic">
                                      Subtopic
                                    </option>

                                  </select>

                                </label>


                                {
                                  nodeLevel !==
                                  'part' && (

                                    <label>

                                      Parent

                                      <select

                                        value={
                                          nodeParentId
                                        }

                                        onChange={
                                          event =>
                                            setNodeParentId(
                                              event.target.value
                                            )
                                        }

                                      >

                                        <option value="">
                                          No Parent / Top Level
                                        </option>


                                        {
                                          parentOptions.map(
                                            parent => (

                                              <option

                                                key={
                                                  parent.id
                                                }

                                                value={
                                                  parent.id
                                                }

                                              >

                                                {
                                                  parent.title
                                                }

                                              </option>

                                            )
                                          )
                                        }

                                      </select>

                                    </label>

                                  )
                                }


                                <label>

                                  {
                                    LEVEL_LABEL[
                                      nodeLevel
                                    ]
                                  } Name

                                  <input

                                    value={
                                      nodeTitle
                                    }

                                    onChange={
                                      event =>
                                        setNodeTitle(
                                          event.target.value
                                        )
                                    }

                                    placeholder={
                                      `Enter ${LEVEL_LABEL[nodeLevel]} name`
                                    }

                                  />

                                </label>


                                <button

                                  type="button"

                                  className="primary-btn"

                                  onClick={() =>
                                    void addStructureNode()
                                  }

                                >

                                  Add {
                                    LEVEL_LABEL[
                                      nodeLevel
                                    ]
                                  }

                                </button>

                              </div>

                            </div>

                          )
                        }


                        {/* ===================================
                            BULK INDEX IMPORT
                        =================================== */}

                        {
                          importOpen && (

                            <div
                              className="callout"

                              style={{
                                marginTop:
                                  '12px'
                              }}
                            >

                              <h3>
                                Fast Index Import
                              </h3>


                              <textarea

                                rows={
                                  12
                                }

                                value={
                                  outline
                                }

                                onChange={
                                  event =>
                                    setOutline(
                                      event.target.value
                                    )
                                }

                                placeholder={
`Part: Constitutional Framework
Chapter: Historical Background
Topic: Company Rule
Subtopic: Regulating Act 1773
Subtopic: Pitt's India Act 1784

Chapter: Fundamental Rights
Topic: Right to Equality
Subtopic: Article 14
Subtopic: Article 15`
                                }

                              />


                              <p>

                                Use:

                                <br />

                                <strong>
                                  Part:
                                </strong>

                                {' Name'}

                                <br />

                                <strong>
                                  Chapter:
                                </strong>

                                {' Name'}

                                <br />

                                <strong>
                                  Topic:
                                </strong>

                                {' Name'}

                                <br />

                                <strong>
                                  Subtopic:
                                </strong>

                                {' Name'}

                              </p>


                              <button

                                type="button"

                                className="primary-btn"

                                onClick={() =>
                                  void importIndex()
                                }

                              >

                                Import Index

                              </button>

                            </div>

                          )
                        }


                        {/* ===================================
                            SEARCH CONTENT
                        =================================== */}

                        {
                          activeNodes.length >
                          0 && (

                            <div
                              style={{
                                marginTop:
                                  '14px'
                              }}
                            >

                              <label>

                                Search Inside Book

                                <input

                                  type="search"

                                  value={
                                    contentSearch
                                  }

                                  onChange={
                                    event =>
                                      setContentSearch(
                                        event.target.value
                                      )
                                  }

                                  placeholder="Search chapter, topic or subtopic..."

                                />

                              </label>


                              {
                                contentSearch.trim() &&
                                (

                                  <div
                                    style={{

                                      display:
                                        'flex',

                                      flexWrap:
                                        'wrap',

                                      gap:
                                        '7px',

                                      marginTop:
                                        '8px'

                                    }}
                                  >

                                    {
                                      contentMatches.length ===
                                      0
                                        ? (

                                          <small>
                                            No matching topics found.
                                          </small>

                                        )

                                        : contentMatches.map(
                                            node => (

                                              <button

                                                key={
                                                  node.id
                                                }

                                                type="button"

                                                className="filter"

                                                onClick={() =>
                                                  scrollToNode(
                                                    node.id
                                                  )
                                                }

                                              >

                                                {
                                                  LEVEL_LABEL[
                                                    node.level
                                                  ]
                                                }

                                                {' • '}

                                                {
                                                  node.title
                                                }

                                              </button>

                                            )
                                          )
                                    }

                                  </div>

                                )
                              }

                            </div>

                          )
                        }


                        {/* ===================================
                            CONTENT TREE
                        =================================== */}

                        <div
                          style={{
                            marginTop:
                              '16px'
                          }}
                        >

                          {
                            activeNodes.length ===
                            0
                              ? (

                                <div
                                  className="callout"
                                >

                                  This book does not have
                                  chapters yet.

                                  <br />

                                  Use <strong>
                                    Add Topic Manually
                                  </strong> or <strong>
                                    Import Book Index
                                  </strong>.

                                </div>

                              )

                              : (

                                (
                                  childrenByParent.get(
                                    null
                                  ) ||
                                  []
                                )
                                  .map(
                                    node =>
                                      renderNode(
                                        node
                                      )
                                  )

                              )
                          }

                        </div>

                      </div>

                    )
                  }

                </>

              )
        }

      </section>

    </div>

  );

}

import {
  FormEvent,
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  subjects
} from '../data/mock';

import {
  supabase
} from '../lib/supabase';


type ExamStage =
  | 'general'
  | 'prelims'
  | 'mains'
  | 'both';


type NoteType =
  | 'general'
  | 'book'
  | 'current_affairs'
  | 'revision'
  | 'prelims'
  | 'mains';


type NoteLanguage =
  | 'English'
  | 'Hindi'
  | 'Bilingual'
  | 'Other';


type NotesView =
  | 'active'
  | 'archived';


type StudentNote = {
  id: string;

  title: string;
  content: string;

  subject:
    string |
    null;

  topic:
    string |
    null;

  examStage:
    ExamStage;

  noteType:
    NoteType;

  language:
    NoteLanguage;

  tags:
    string[];

  isPinned: boolean;
  isArchived: boolean;

  sourceUrl:
    string |
    null;

  createdAt:
    string |
    null;

  updatedAt:
    string |
    null;
};


type StudentNoteRow = {
  id:
    string;

  title:
    string;

  content:
    string |
    null;

  subject:
    string |
    null;

  topic:
    string |
    null;

  exam_stage:
    string |
    null;

  note_type:
    string |
    null;

  language:
    string |
    null;

  tags:
    string[] |
    null;

  is_pinned:
    boolean |
    null;

  is_archived:
    boolean |
    null;

  source_url:
    string |
    null;

  created_at:
    string |
    null;

  updated_at:
    string |
    null;
};


type NoteForm = {
  title:
    string;

  content:
    string;

  subject:
    string;

  topic:
    string;

  examStage:
    ExamStage;

  noteType:
    NoteType;

  language:
    NoteLanguage;

  tags:
    string;

  sourceUrl:
    string;
};


const EMPTY_FORM:
  NoteForm = {

  title:
    '',

  content:
    '',

  subject:
    '',

  topic:
    '',

  examStage:
    'general',

  noteType:
    'general',

  language:
    'English',

  tags:
    '',

  sourceUrl:
    ''
};


/*
 * =========================================
 * NORMALISE VALUES
 * =========================================
 */

function normalizeExamStage(
  value:
    string |
    null
):
  ExamStage {

  if (
    value ===
      'prelims' ||
    value ===
      'mains' ||
    value ===
      'both'
  ) {

    return value;
  }


  return 'general';
}


function normalizeNoteType(
  value:
    string |
    null
):
  NoteType {

  if (
    value ===
      'book' ||
    value ===
      'current_affairs' ||
    value ===
      'revision' ||
    value ===
      'prelims' ||
    value ===
      'mains'
  ) {

    return value;
  }


  return 'general';
}


function normalizeLanguage(
  value:
    string |
    null
):
  NoteLanguage {

  if (
    value ===
      'Hindi' ||
    value ===
      'Bilingual' ||
    value ===
      'Other'
  ) {

    return value;
  }


  return 'English';
}


/*
 * =========================================
 * DATABASE ROW → NOTE
 * =========================================
 */

function mapNote(
  row:
    StudentNoteRow
):
  StudentNote {

  return {

    id:
      String(
        row.id
      ),

    title:
      String(
        row.title ||
        ''
      ),

    content:
      String(
        row.content ||
        ''
      ),

    subject:
      row.subject
        ? String(
            row.subject
          )
        : null,

    topic:
      row.topic
        ? String(
            row.topic
          )
        : null,

    examStage:
      normalizeExamStage(
        row.exam_stage
      ),

    noteType:
      normalizeNoteType(
        row.note_type
      ),

    language:
      normalizeLanguage(
        row.language
      ),

    tags:
      Array.isArray(
        row.tags
      )
        ? row.tags
            .map(
              tag =>
                String(
                  tag
                ).trim()
            )
            .filter(
              Boolean
            )
        : [],

    isPinned:
      Boolean(
        row.is_pinned
      ),

    isArchived:
      Boolean(
        row.is_archived
      ),

    sourceUrl:
      row.source_url
        ? String(
            row.source_url
          )
        : null,

    createdAt:
      row.created_at
        ? String(
            row.created_at
          )
        : null,

    updatedAt:
      row.updated_at
        ? String(
            row.updated_at
          )
        : null

  };
}


/*
 * =========================================
 * TAG PARSER
 * =========================================
 */

function parseTags(
  value:
    string
) {

  return Array.from(
    new Set(
      value
        .split(',')
        .map(
          item =>
            item.trim()
        )
        .filter(
          Boolean
        )
    )
  );
}


/*
 * =========================================
 * DATE DISPLAY
 * =========================================
 */

function formatDate(
  value:
    string |
    null
) {

  if (!value) {

    return '';
  }


  const date =
    new Date(
      value
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return '';
  }


  return date
    .toLocaleString(
      'en-IN',
      {
        day:
          '2-digit',

        month:
          'short',

        year:
          'numeric',

        hour:
          '2-digit',

        minute:
          '2-digit'
      }
    );
}


/*
 * =========================================
 * LABELS
 * =========================================
 */

function examStageLabel(
  value:
    ExamStage
) {

  switch (
    value
  ) {

    case 'prelims':

      return 'Prelims';


    case 'mains':

      return 'Mains';


    case 'both':

      return 'Prelims + Mains';


    default:

      return 'General';
  }
}


function noteTypeLabel(
  value:
    NoteType
) {

  switch (
    value
  ) {

    case 'book':

      return 'Book Note';


    case 'current_affairs':

      return 'Current Affairs';


    case 'revision':

      return 'Revision';


    case 'prelims':

      return 'Prelims';


    case 'mains':

      return 'Mains';


    default:

      return 'General';
  }
}


/*
 * =========================================
 * MY NOTES
 * =========================================
 */

export function MyNotes() {

  /*
   * =========================================
   * DATA
   * =========================================
   */

  const [
    notes,
    setNotes
  ] =
    useState<
      StudentNote[]
    >([]);


  /*
   * =========================================
   * AUTH / LOAD STATE
   * =========================================
   */

  const [
    signedIn,
    setSignedIn
  ] =
    useState(
      false
    );


  const [
    loading,
    setLoading
  ] =
    useState(
      true
    );


  const [
    saving,
    setSaving
  ] =
    useState(
      false
    );


  const [
    workingId,
    setWorkingId
  ] =
    useState<
      string |
      null
    >(
      null
    );


  /*
   * =========================================
   * EDITOR STATE
   * =========================================
   */

  const [
    editorOpen,
    setEditorOpen
  ] =
    useState(
      false
    );


  const [
    editingId,
    setEditingId
  ] =
    useState<
      string |
      null
    >(
      null
    );


  const [
    form,
    setForm
  ] =
    useState<
      NoteForm
    >(
      EMPTY_FORM
    );


  /*
   * =========================================
   * FILTERS
   * =========================================
   */

  const [
    search,
    setSearch
  ] =
    useState('');


  const [
    subjectFilter,
    setSubjectFilter
  ] =
    useState(
      'all'
    );


  const [
    examFilter,
    setExamFilter
  ] =
    useState(
      'all'
    );


  const [
    typeFilter,
    setTypeFilter
  ] =
    useState(
      'all'
    );


  const [
    view,
    setView
  ] =
    useState<
      NotesView
    >(
      'active'
    );


  /*
   * =========================================
   * MESSAGE STATE
   * =========================================
   */

  const [
    message,
    setMessage
  ] =
    useState('');


  const [
    error,
    setError
  ] =
    useState('');


  /*
   * =========================================
   * LOAD NOTES
   * =========================================
   */

  async function loadNotes() {

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


      setNotes(
        []
      );


      setLoading(
        false
      );


      return;
    }


    setSignedIn(
      true
    );


    const {
      data,
      error:
        loadError
    } =
      await client
        .from(
          'student_notes'
        )
        .select(
          `
          id,
          title,
          content,
          subject,
          topic,
          exam_stage,
          note_type,
          language,
          tags,
          is_pinned,
          is_archived,
          source_url,
          created_at,
          updated_at
          `
        )
        .eq(
          'user_id',
          user.id
        )
        .order(
          'is_pinned',
          {
            ascending:
              false
          }
        )
        .order(
          'updated_at',
          {
            ascending:
              false
          }
        );


    if (
      loadError
    ) {

      console.error(
        'Unable to load notes:',
        loadError
      );


      setError(
        loadError.message
      );


      setNotes(
        []
      );


      setLoading(
        false
      );


      return;
    }


    const nextNotes =
      (
        data ||
        []
      ).map(
        item =>
          mapNote(
            item as
              StudentNoteRow
          )
      );


    setNotes(
      nextNotes
    );


    setLoading(
      false
    );
  }


  /*
   * =========================================
   * INITIAL LOAD
   * =========================================
   */

  useEffect(
    () => {

      void loadNotes();

    },
    []
  );


  /*
   * =========================================
   * FORM UPDATE
   * =========================================
   */

  function updateForm<
    K extends
      keyof NoteForm
  >(
    key:
      K,

    value:
      NoteForm[K]
  ) {

    setForm(
      current => ({
        ...current,
        [key]:
          value
      })
    );


    setMessage('');
    setError('');
  }


  /*
   * =========================================
   * NEW NOTE
   * =========================================
   */

  function openNewNote() {

    setEditingId(
      null
    );


    setForm(
      EMPTY_FORM
    );


    setMessage('');
    setError('');


    setEditorOpen(
      true
    );


    window.setTimeout(
      () => {

        document
          .getElementById(
            'my-notes-editor'
          )
          ?.scrollIntoView({
            behavior:
              'smooth',

            block:
              'start'
          });

      },
      100
    );
  }


  /*
   * =========================================
   * EDIT NOTE
   * =========================================
   */

  function openEditNote(
    note:
      StudentNote
  ) {

    setEditingId(
      note.id
    );


    setForm({

      title:
        note.title,

      content:
        note.content,

      subject:
        note.subject ||
        '',

      topic:
        note.topic ||
        '',

      examStage:
        note.examStage,

      noteType:
        note.noteType,

      language:
        note.language,

      tags:
        note.tags.join(
          ', '
        ),

      sourceUrl:
        note.sourceUrl ||
        ''

    });


    setMessage('');
    setError('');


    setEditorOpen(
      true
    );


    window.setTimeout(
      () => {

        document
          .getElementById(
            'my-notes-editor'
          )
          ?.scrollIntoView({
            behavior:
              'smooth',

            block:
              'start'
          });

      },
      100
    );
  }


  /*
   * =========================================
   * CLOSE EDITOR
   * =========================================
   */

  function closeEditor() {

    setEditorOpen(
      false
    );


    setEditingId(
      null
    );


    setForm(
      EMPTY_FORM
    );


    setError('');
  }


  /*
   * =========================================
   * SAVE NOTE
   * =========================================
   */

  async function saveNote(
    event:
      FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();


    const client =
      supabase;


    if (!client) {

      setError(
        'Supabase is not configured.'
      );


      return;
    }


    const title =
      form.title.trim();


    if (!title) {

      setError(
        'Please enter a note title.'
      );


      return;
    }


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


      setError(
        'Sign in to save notes.'
      );


      return;
    }


    setSaving(
      true
    );


    setMessage('');
    setError('');


    const payload = {

      user_id:
        user.id,

      title,

      content:
        form.content,

      subject:
        form.subject.trim() ||
        null,

      topic:
        form.topic.trim() ||
        null,

      exam_stage:
        form.examStage,

      note_type:
        form.noteType,

      language:
        form.language,

      tags:
        parseTags(
          form.tags
        ),

      source_url:
        form.sourceUrl.trim() ||
        null

    };


    /*
     * UPDATE EXISTING NOTE
     */

    if (
      editingId
    ) {

      const {
        error:
          updateError
      } =
        await client
          .from(
            'student_notes'
          )
          .update(
            payload
          )
          .eq(
            'id',
            editingId
          )
          .eq(
            'user_id',
            user.id
          );


      if (
        updateError
      ) {

        console.error(
          'Unable to update note:',
          updateError
        );


        setError(
          updateError.message
        );


        setSaving(
          false
        );


        return;
      }


      await loadNotes();


      setSaving(
        false
      );


      setEditorOpen(
        false
      );


      setEditingId(
        null
      );


      setForm(
        EMPTY_FORM
      );


      setMessage(
        'Note updated successfully.'
      );


      return;
    }


    /*
     * CREATE NEW NOTE
     */

    const {
      error:
        insertError
    } =
      await client
        .from(
          'student_notes'
        )
        .insert(
          payload
        );


    if (
      insertError
    ) {

      console.error(
        'Unable to create note:',
        insertError
      );


      setError(
        insertError.message
      );


      setSaving(
        false
      );


      return;
    }


    await loadNotes();


    setSaving(
      false
    );


    setEditorOpen(
      false
    );


    setForm(
      EMPTY_FORM
    );


    setMessage(
      'New note created successfully.'
    );
  }


  /*
   * =========================================
   * PIN / UNPIN
   * =========================================
   */

  async function togglePin(
    note:
      StudentNote
  ) {

    const client =
      supabase;


    if (!client) {

      return;
    }


    const {
      data: {
        user
      }
    } =
      await client
        .auth
        .getUser();


    if (!user) {

      setError(
        'Sign in to update notes.'
      );


      return;
    }


    setWorkingId(
      note.id
    );


    setError('');
    setMessage('');


    const {
      error:
        updateError
    } =
      await client
        .from(
          'student_notes'
        )
        .update(
          {
            is_pinned:
              !note.isPinned
          }
        )
        .eq(
          'id',
          note.id
        )
        .eq(
          'user_id',
          user.id
        );


    if (
      updateError
    ) {

      console.error(
        'Unable to update note pin:',
        updateError
      );


      setError(
        updateError.message
      );


      setWorkingId(
        null
      );


      return;
    }


    await loadNotes();


    setWorkingId(
      null
    );


    setMessage(
      note.isPinned
        ? 'Note unpinned.'
        : 'Note pinned.'
    );
  }


  /*
   * =========================================
   * ARCHIVE / RESTORE
   * =========================================
   */

  async function toggleArchive(
    note:
      StudentNote
  ) {

    const client =
      supabase;


    if (!client) {

      return;
    }


    const {
      data: {
        user
      }
    } =
      await client
        .auth
        .getUser();


    if (!user) {

      setError(
        'Sign in to update notes.'
      );


      return;
    }


    setWorkingId(
      note.id
    );


    setError('');
    setMessage('');


    const nextArchived =
      !note.isArchived;


    const {
      error:
        updateError
    } =
      await client
        .from(
          'student_notes'
        )
        .update(
          nextArchived
            ? {
                is_archived:
                  true,

                is_pinned:
                  false
              }
            : {
                is_archived:
                  false
              }
        )
        .eq(
          'id',
          note.id
        )
        .eq(
          'user_id',
          user.id
        );


    if (
      updateError
    ) {

      console.error(
        'Unable to archive note:',
        updateError
      );


      setError(
        updateError.message
      );


      setWorkingId(
        null
      );


      return;
    }


    await loadNotes();


    setWorkingId(
      null
    );


    setMessage(
      nextArchived
        ? 'Note archived.'
        : 'Note restored.'
    );
  }


  /*
   * =========================================
   * DELETE NOTE
   * =========================================
   */

  async function deleteNote(
    note:
      StudentNote
  ) {

    const confirmed =
      window.confirm(
        `Delete "${note.title}" permanently?`
      );


    if (
      !confirmed
    ) {

      return;
    }


    const client =
      supabase;


    if (!client) {

      return;
    }


    const {
      data: {
        user
      }
    } =
      await client
        .auth
        .getUser();


    if (!user) {

      setError(
        'Sign in to delete notes.'
      );


      return;
    }


    setWorkingId(
      note.id
    );


    setError('');
    setMessage('');


    const {
      error:
        deleteError
    } =
      await client
        .from(
          'student_notes'
        )
        .delete()
        .eq(
          'id',
          note.id
        )
        .eq(
          'user_id',
          user.id
        );


    if (
      deleteError
    ) {

      console.error(
        'Unable to delete note:',
        deleteError
      );


      setError(
        deleteError.message
      );


      setWorkingId(
        null
      );


      return;
    }


    await loadNotes();


    setWorkingId(
      null
    );


    setMessage(
      'Note deleted.'
    );
  }


  /*
   * =========================================
   * SUBJECT OPTIONS
   * =========================================
   */

  const subjectOptions =
    useMemo(
      () => {

        const values =
          new Set<string>();


        subjects.forEach(
          item => {

            if (
              item.name
            ) {

              values.add(
                item.name
              );
            }
          }
        );


        notes.forEach(
          note => {

            if (
              note.subject
            ) {

              values.add(
                note.subject
              );
            }
          }
        );


        return Array
          .from(
            values
          )
          .sort(
            (
              first,
              second
            ) =>
              first.localeCompare(
                second
              )
          );

      },
      [
        notes
      ]
    );


  /*
   * =========================================
   * FILTER NOTES
   * =========================================
   */

  const filteredNotes =
    useMemo(
      () => {

        const query =
          search
            .trim()
            .toLowerCase();


        return notes.filter(
          note => {

            /*
             * ACTIVE / ARCHIVED
             */

            if (
              view ===
                'active' &&
              note.isArchived
            ) {

              return false;
            }


            if (
              view ===
                'archived' &&
              !note.isArchived
            ) {

              return false;
            }


            /*
             * SUBJECT
             */

            if (
              subjectFilter !==
                'all' &&
              note.subject !==
                subjectFilter
            ) {

              return false;
            }


            /*
             * EXAM
             */

            if (
              examFilter !==
                'all' &&
              note.examStage !==
                examFilter
            ) {

              return false;
            }


            /*
             * TYPE
             */

            if (
              typeFilter !==
                'all' &&
              note.noteType !==
                typeFilter
            ) {

              return false;
            }


            /*
             * SEARCH
             */

            if (
              query
            ) {

              const searchable =
                [
                  note.title,
                  note.content,
                  note.subject ||
                    '',
                  note.topic ||
                    '',
                  note.tags.join(
                    ' '
                  ),
                  examStageLabel(
                    note.examStage
                  ),
                  noteTypeLabel(
                    note.noteType
                  )
                ]
                  .join(
                    ' '
                  )
                  .toLowerCase();


              if (
                !searchable.includes(
                  query
                )
              ) {

                return false;
              }
            }


            return true;
          }
        );

      },
      [
        notes,
        search,
        subjectFilter,
        examFilter,
        typeFilter,
        view
      ]
    );


  /*
   * =========================================
   * COUNTS
   * =========================================
   */

  const activeCount =
    notes.filter(
      note =>
        !note.isArchived
    ).length;


  const archivedCount =
    notes.filter(
      note =>
        note.isArchived
    ).length;


  const pinnedCount =
    notes.filter(
      note =>
        note.isPinned &&
        !note.isArchived
    ).length;


  /*
   * =========================================
   * PAGE
   * =========================================
   */

  return (

    <section
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
            MY NOTES
          </span>


          <h2>
            Personal UPSC Notes
          </h2>


          <p>
            Create subject-wise notes,
            organise topics, pin important
            material and keep revision notes
            in one place.
          </p>

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
            className="text-btn"

            disabled={
              loading
            }

            onClick={() =>
              void loadNotes()
            }
          >
            Refresh
          </button>


          {signedIn && (

            <button
              type="button"
              className="primary-btn"

              onClick={
                openNewNote
              }
            >
              + New Note
            </button>

          )}

        </div>

      </div>


      {/* =====================================
          LOADING
      ===================================== */}

      {loading && (

        <p>
          Loading your notes...
        </p>

      )}


      {/* =====================================
          SIGNED OUT
      ===================================== */}

      {!loading &&
        !signedIn && (

        <div
          className="callout"
        >

          <strong>
            Sign in to use My Notes
          </strong>


          <p>
            Your notes are private and saved
            to your own UPSC Study Hub account.
          </p>

        </div>

      )}


      {/* =====================================
          SIGNED IN
      ===================================== */}

      {!loading &&
        signedIn && (

        <>

          {/* =================================
              SUMMARY
          ================================= */}

          <div
            className="metrics-grid"

            style={{
              marginTop:
                '16px'
            }}
          >

            <article
              className="metric-card"
            >

              <div>

                <span>
                  Active notes
                </span>


                <strong>
                  {activeCount}
                </strong>


                <small>
                  Current study notes
                </small>

              </div>

            </article>


            <article
              className="metric-card"
            >

              <div>

                <span>
                  Pinned
                </span>


                <strong>
                  {pinnedCount}
                </strong>


                <small>
                  Important notes
                </small>

              </div>

            </article>


            <article
              className="metric-card"
            >

              <div>

                <span>
                  Archived
                </span>


                <strong>
                  {archivedCount}
                </strong>


                <small>
                  Stored for later
                </small>

              </div>

            </article>

          </div>


          {/* =================================
              MESSAGE
          ================================= */}

          {message && (

            <div
              className="callout"

              style={{
                marginTop:
                  '14px'
              }}
            >

              <strong>
                ✓ {message}
              </strong>

            </div>

          )}


          {/* =================================
              ERROR
          ================================= */}

          {error && (

            <div
              className="callout"

              style={{
                marginTop:
                  '14px'
              }}
            >

              <strong>
                Unable to complete action
              </strong>


              <p>
                {error}
              </p>

            </div>

          )}


          {/* =================================
              NOTE EDITOR
          ================================= */}

          {editorOpen && (

            <form
              id="my-notes-editor"

              onSubmit={
                saveNote
              }

              style={{
                marginTop:
                  '18px',

                padding:
                  '16px',

                border:
                  '1px solid rgba(45,212,191,.28)',

                borderRadius:
                  '16px',

                background:
                  'rgba(20,184,166,.045)',

                scrollMarginTop:
                  '20px'
              }}
            >

              <div
                className="panel-head"
              >

                <div>

                  <span
                    className="eyebrow"
                  >
                    {
                      editingId
                        ? 'EDIT NOTE'
                        : 'NEW NOTE'
                    }
                  </span>


                  <h3>
                    {
                      editingId
                        ? 'Update Study Note'
                        : 'Create Study Note'
                    }
                  </h3>

                </div>


                <button
                  type="button"
                  className="text-btn"

                  disabled={
                    saving
                  }

                  onClick={
                    closeEditor
                  }
                >
                  Close
                </button>

              </div>


              {/* TITLE */}

              <label
                style={{
                  display:
                    'block',

                  marginTop:
                    '14px'
                }}
              >

                <span>
                  Title *
                </span>


                <input
                  type="text"

                  value={
                    form.title
                  }

                  placeholder="Example: Fundamental Rights quick notes"

                  onChange={
                    event =>
                      updateForm(
                        'title',
                        event.target.value
                      )
                  }

                  style={{
                    width:
                      '100%',

                    marginTop:
                      '6px'
                  }}
                />

              </label>


              {/* SUBJECT + TOPIC */}

              <div
                style={{
                  display:
                    'grid',

                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(220px, 1fr))',

                  gap:
                    '12px',

                  marginTop:
                    '14px'
                }}
              >

                <label>

                  <span>
                    Subject
                  </span>


                  <input
                    type="text"

                    list="my-notes-subject-options"

                    value={
                      form.subject
                    }

                    placeholder="Polity"

                    onChange={
                      event =>
                        updateForm(
                          'subject',
                          event.target.value
                        )
                    }

                    style={{
                      width:
                        '100%',

                      marginTop:
                        '6px'
                    }}
                  />


                  <datalist
                    id="my-notes-subject-options"
                  >

                    {subjectOptions.map(
                      subject => (

                        <option
                          key={
                            subject
                          }

                          value={
                            subject
                          }
                        />

                      )
                    )}

                  </datalist>

                </label>


                <label>

                  <span>
                    Topic
                  </span>


                  <input
                    type="text"

                    value={
                      form.topic
                    }

                    placeholder="Fundamental Rights"

                    onChange={
                      event =>
                        updateForm(
                          'topic',
                          event.target.value
                        )
                    }

                    style={{
                      width:
                        '100%',

                      marginTop:
                        '6px'
                    }}
                  />

                </label>

              </div>


              {/* EXAM / TYPE / LANGUAGE */}

              <div
                style={{
                  display:
                    'grid',

                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(180px, 1fr))',

                  gap:
                    '12px',

                  marginTop:
                    '14px'
                }}
              >

                <label>

                  <span>
                    Exam use
                  </span>


                  <select
                    value={
                      form.examStage
                    }

                    onChange={
                      event =>
                        updateForm(
                          'examStage',
                          event.target.value as
                            ExamStage
                        )
                    }

                    style={{
                      width:
                        '100%',

                      marginTop:
                        '6px'
                    }}
                  >
                    <option
                      value="general"
                    >
                      General
                    </option>

                    <option
                      value="prelims"
                    >
                      Prelims
                    </option>

                    <option
                      value="mains"
                    >
                      Mains
                    </option>

                    <option
                      value="both"
                    >
                      Prelims + Mains
                    </option>
                  </select>

                </label>


                <label>

                  <span>
                    Note type
                  </span>


                  <select
                    value={
                      form.noteType
                    }

                    onChange={
                      event =>
                        updateForm(
                          'noteType',
                          event.target.value as
                            NoteType
                        )
                    }

                    style={{
                      width:
                        '100%',

                      marginTop:
                        '6px'
                    }}
                  >
                    <option
                      value="general"
                    >
                      General
                    </option>

                    <option
                      value="book"
                    >
                      Book Note
                    </option>

                    <option
                      value="current_affairs"
                    >
                      Current Affairs
                    </option>

                    <option
                      value="revision"
                    >
                      Revision
                    </option>

                    <option
                      value="prelims"
                    >
                      Prelims
                    </option>

                    <option
                      value="mains"
                    >
                      Mains
                    </option>
                  </select>

                </label>


                <label>

                  <span>
                    Language
                  </span>


                  <select
                    value={
                      form.language
                    }

                    onChange={
                      event =>
                        updateForm(
                          'language',
                          event.target.value as
                            NoteLanguage
                        )
                    }

                    style={{
                      width:
                        '100%',

                      marginTop:
                        '6px'
                    }}
                  >
                    <option
                      value="English"
                    >
                      English
                    </option>

                    <option
                      value="Hindi"
                    >
                      Hindi
                    </option>

                    <option
                      value="Bilingual"
                    >
                      Bilingual
                    </option>

                    <option
                      value="Other"
                    >
                      Other
                    </option>
                  </select>

                </label>

              </div>


              {/* CONTENT */}

              <label
                style={{
                  display:
                    'block',

                  marginTop:
                    '14px'
                }}
              >

                <span>
                  Note content
                </span>


                <textarea
                  rows={
                    12
                  }

                  value={
                    form.content
                  }

                  placeholder="Write your note here..."

                  onChange={
                    event =>
                      updateForm(
                        'content',
                        event.target.value
                      )
                  }

                  style={{
                    width:
                      '100%',

                    marginTop:
                      '6px',

                    resize:
                      'vertical'
                  }}
                />

              </label>


              {/* TAGS */}

              <label
                style={{
                  display:
                    'block',

                  marginTop:
                    '14px'
                }}
              >

                <span>
                  Tags
                </span>


                <input
                  type="text"

                  value={
                    form.tags
                  }

                  placeholder="Article 14, Equality, Constitution"

                  onChange={
                    event =>
                      updateForm(
                        'tags',
                        event.target.value
                      )
                  }

                  style={{
                    width:
                      '100%',

                    marginTop:
                      '6px'
                  }}
                />


                <small>
                  Separate tags with commas.
                </small>

              </label>


              {/* SOURCE */}

              <label
                style={{
                  display:
                    'block',

                  marginTop:
                    '14px'
                }}
              >

                <span>
                  Source link
                </span>


                <input
                  type="url"

                  value={
                    form.sourceUrl
                  }

                  placeholder="https://..."

                  onChange={
                    event =>
                      updateForm(
                        'sourceUrl',
                        event.target.value
                      )
                  }

                  style={{
                    width:
                      '100%',

                    marginTop:
                      '6px'
                  }}
                />

              </label>


              {/* SAVE */}

              <div
                style={{
                  display:
                    'flex',

                  gap:
                    '10px',

                  flexWrap:
                    'wrap',

                  marginTop:
                    '18px'
                }}
              >

                <button
                  type="submit"
                  className="primary-btn"

                  disabled={
                    saving
                  }
                >
                  {
                    saving
                      ? 'Saving...'
                      : editingId
                      ? 'Update Note'
                      : 'Save Note'
                  }
                </button>


                <button
                  type="button"
                  className="secondary-btn"

                  disabled={
                    saving
                  }

                  onClick={
                    closeEditor
                  }
                >
                  Cancel
                </button>

              </div>

            </form>

          )}


          {/* =================================
              ACTIVE / ARCHIVED TABS
          ================================= */}

          <div
            className="filter-row"

            style={{
              marginTop:
                '18px'
            }}
          >

            <button
              type="button"

              className={
                view ===
                  'active'
                  ? 'filter active'
                  : 'filter'
              }

              onClick={() =>
                setView(
                  'active'
                )
              }
            >
              Active Notes
              {' '}
              ({activeCount})
            </button>


            <button
              type="button"

              className={
                view ===
                  'archived'
                  ? 'filter active'
                  : 'filter'
              }

              onClick={() =>
                setView(
                  'archived'
                )
              }
            >
              Archived
              {' '}
              ({archivedCount})
            </button>

          </div>


          {/* =================================
              SEARCH + FILTERS
          ================================= */}

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

              <span>
                Search notes
              </span>


              <input
                type="search"

                value={
                  search
                }

                placeholder="Search title, topic, content or tag"

                onChange={
                  event =>
                    setSearch(
                      event.target.value
                    )
                }

                style={{
                  width:
                    '100%',

                  marginTop:
                    '6px'
                }}
              />

            </label>


            <label>

              <span>
                Subject
              </span>


              <select
                value={
                  subjectFilter
                }

                onChange={
                  event =>
                    setSubjectFilter(
                      event.target.value
                    )
                }

                style={{
                  width:
                    '100%',

                  marginTop:
                    '6px'
                }}
              >

                <option
                  value="all"
                >
                  All subjects
                </option>


                {subjectOptions.map(
                  subject => (

                    <option
                      key={
                        subject
                      }

                      value={
                        subject
                      }
                    >
                      {subject}
                    </option>

                  )
                )}

              </select>

            </label>


            <label>

              <span>
                Exam
              </span>


              <select
                value={
                  examFilter
                }

                onChange={
                  event =>
                    setExamFilter(
                      event.target.value
                    )
                }

                style={{
                  width:
                    '100%',

                  marginTop:
                    '6px'
                }}
              >
                <option
                  value="all"
                >
                  All
                </option>

                <option
                  value="general"
                >
                  General
                </option>

                <option
                  value="prelims"
                >
                  Prelims
                </option>

                <option
                  value="mains"
                >
                  Mains
                </option>

                <option
                  value="both"
                >
                  Prelims + Mains
                </option>
              </select>

            </label>


            <label>

              <span>
                Note type
              </span>


              <select
                value={
                  typeFilter
                }

                onChange={
                  event =>
                    setTypeFilter(
                      event.target.value
                    )
                }

                style={{
                  width:
                    '100%',

                  marginTop:
                    '6px'
                }}
              >
                <option
                  value="all"
                >
                  All
                </option>

                <option
                  value="general"
                >
                  General
                </option>

                <option
                  value="book"
                >
                  Book Notes
                </option>

                <option
                  value="current_affairs"
                >
                  Current Affairs
                </option>

                <option
                  value="revision"
                >
                  Revision
                </option>

                <option
                  value="prelims"
                >
                  Prelims
                </option>

                <option
                  value="mains"
                >
                  Mains
                </option>
              </select>

            </label>

          </div>


          {/* =================================
              RESULT COUNT
          ================================= */}

          <div
            style={{
              display:
                'flex',

              justifyContent:
                'space-between',

              gap:
                '10px',

              alignItems:
                'center',

              flexWrap:
                'wrap',

              marginTop:
                '16px'
            }}
          >

            <strong>
              {filteredNotes.length}
              {' '}
              {
                filteredNotes.length ===
                  1
                  ? 'note'
                  : 'notes'
              }
            </strong>


            {
              (
                search ||
                subjectFilter !==
                  'all' ||
                examFilter !==
                  'all' ||
                typeFilter !==
                  'all'
              ) && (

              <button
                type="button"
                className="text-btn"

                onClick={() => {

                  setSearch('');

                  setSubjectFilter(
                    'all'
                  );

                  setExamFilter(
                    'all'
                  );

                  setTypeFilter(
                    'all'
                  );

                }}
              >
                Clear filters
              </button>

            )}

          </div>


          {/* =================================
              EMPTY
          ================================= */}

          {filteredNotes.length ===
            0 && (

            <div
              className="callout"

              style={{
                marginTop:
                  '16px'
              }}
            >

              <strong>
                {
                  view ===
                    'archived'
                    ? 'No archived notes'
                    : 'No notes found'
                }
              </strong>


              <p>
                {
                  view ===
                    'archived'
                    ? 'Archived notes will appear here.'
                    : 'Create your first UPSC study note or change the filters.'
                }
              </p>


              {
                view ===
                  'active' &&
                notes.length ===
                  0 && (

                <button
                  type="button"
                  className="primary-btn"

                  onClick={
                    openNewNote
                  }
                >
                  Create First Note
                </button>

              )}

            </div>

          )}


          {/* =================================
              NOTES LIST
          ================================= */}

          {filteredNotes.length >
            0 && (

            <div
              style={{
                display:
                  'grid',

                gap:
                  '12px',

                marginTop:
                  '16px'
              }}
            >

              {filteredNotes.map(
                note => {

                  const working =
                    workingId ===
                    note.id;


                  return (

                    <article
                      key={
                        note.id
                      }

                      style={{
                        padding:
                          '16px',

                        border:
                          note.isPinned
                            ? '1px solid rgba(250,204,21,.30)'
                            : '1px solid rgba(255,255,255,.08)',

                        borderRadius:
                          '15px',

                        background:
                          note.isPinned
                            ? 'rgba(250,204,21,.045)'
                            : 'rgba(255,255,255,.025)'
                      }}
                    >

                      {/* TOP */}

                      <div
                        style={{
                          display:
                            'flex',

                          justifyContent:
                            'space-between',

                          gap:
                            '12px',

                          alignItems:
                            'flex-start',

                          flexWrap:
                            'wrap'
                        }}
                      >

                        <div
                          style={{
                            flex:
                              '1 1 260px'
                          }}
                        >

                          <div
                            style={{
                              display:
                                'flex',

                              gap:
                                '7px',

                              alignItems:
                                'center',

                              flexWrap:
                                'wrap'
                            }}
                          >

                            {note.isPinned && (

                              <span
                                className="tag"
                              >
                                ★ Pinned
                              </span>

                            )}


                            <span
                              className="tag"
                            >
                              {examStageLabel(
                                note.examStage
                              )}
                            </span>


                            <span
                              className="tag"
                            >
                              {noteTypeLabel(
                                note.noteType
                              )}
                            </span>


                            <span
                              className="tag"
                            >
                              {note.language}
                            </span>

                          </div>


                          <h3
                            style={{
                              margin:
                                '10px 0 5px'
                            }}
                          >
                            {note.title}
                          </h3>


                          {
                            (
                              note.subject ||
                              note.topic
                            ) && (

                            <p
                              style={{
                                margin:
                                  '4px 0',

                                color:
                                  '#cbd5e1'
                              }}
                            >

                              {note.subject && (

                                <strong>
                                  {note.subject}
                                </strong>

                              )}


                              {
                                note.subject &&
                                note.topic &&
                                ' → '
                              }


                              {note.topic}

                            </p>

                          )}

                        </div>


                        <small
                          style={{
                            color:
                              '#94a3b8'
                          }}
                        >
                          Updated
                          {' '}
                          {formatDate(
                            note.updatedAt
                          )}
                        </small>

                      </div>


                      {/* CONTENT PREVIEW */}

                      {note.content && (

                        <p
                          style={{
                            margin:
                              '12px 0 0',

                            whiteSpace:
                              'pre-wrap',

                            lineHeight:
                              1.6,

                            color:
                              '#dbe4ef',

                            maxHeight:
                              '180px',

                            overflow:
                              'hidden'
                          }}
                        >
                          {note.content}
                        </p>

                      )}


                      {/* TAGS */}

                      {note.tags.length >
                        0 && (

                        <div
                          style={{
                            display:
                              'flex',

                            gap:
                              '6px',

                            flexWrap:
                              'wrap',

                            marginTop:
                              '12px'
                          }}
                        >

                          {note.tags.map(
                            tag => (

                              <span
                                key={
                                  tag
                                }

                                className="tag"
                              >
                                #{tag}
                              </span>

                            )
                          )}

                        </div>

                      )}


                      {/* SOURCE */}

                      {note.sourceUrl && (

                        <div
                          style={{
                            marginTop:
                              '12px'
                          }}
                        >

                          <a
                            href={
                              note.sourceUrl
                            }

                            target="_blank"

                            rel="noreferrer"

                            style={{
                              color:
                                '#5eead4'
                            }}
                          >
                            Open source ↗
                          </a>

                        </div>

                      )}


                      {/* ACTIONS */}

                      <div
                        style={{
                          display:
                            'flex',

                          gap:
                            '8px',

                          flexWrap:
                            'wrap',

                          marginTop:
                            '14px'
                        }}
                      >

                        <button
                          type="button"
                          className="secondary-btn"

                          disabled={
                            working
                          }

                          onClick={() =>
                            openEditNote(
                              note
                            )
                          }
                        >
                          Edit
                        </button>


                        {!note.isArchived && (

                          <button
                            type="button"
                            className="secondary-btn"

                            disabled={
                              working
                            }

                            onClick={() =>
                              void togglePin(
                                note
                              )
                            }
                          >
                            {
                              note.isPinned
                                ? 'Unpin'
                                : '★ Pin'
                            }
                          </button>

                        )}


                        <button
                          type="button"
                          className="secondary-btn"

                          disabled={
                            working
                          }

                          onClick={() =>
                            void toggleArchive(
                              note
                            )
                          }
                        >
                          {
                            note.isArchived
                              ? 'Restore'
                              : 'Archive'
                          }
                        </button>


                        <button
                          type="button"
                          className="text-btn"

                          disabled={
                            working
                          }

                          onClick={() =>
                            void deleteNote(
                              note
                            )
                          }
                        >
                          {
                            working
                              ? 'Working...'
                              : 'Delete'
                          }
                        </button>

                      </div>

                    </article>

                  );
                }
              )}

            </div>

          )}

        </>

      )}

    </section>

  );
}

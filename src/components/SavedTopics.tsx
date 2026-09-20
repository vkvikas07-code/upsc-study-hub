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


type StageFilter =
  | 'all'
  | ExamStage;


type SavedFilter =
  | 'all'
  | 'bookmarks'
  | 'notes';


type SavedTopic = {
  id: string;
  exam_stage: ExamStage;
  subject: string;
  topic: string;
  paper: string;
  bookmarked: boolean;
  notes: string;
  updated_at: string;
};


function formatDate(
  value: string
): string {

  if (
    !value
  ) {

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


  return date.toLocaleDateString(
    undefined,
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }
  );
}


export function SavedTopics() {

  const [
    rows,
    setRows
  ] =
    useState<SavedTopic[]>(
      []
    );


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
    message,
    setMessage
  ] =
    useState(
      ''
    );


  const [
    search,
    setSearch
  ] =
    useState(
      ''
    );


  const [
    stageFilter,
    setStageFilter
  ] =
    useState<StageFilter>(
      'all'
    );


  const [
    savedFilter,
    setSavedFilter
  ] =
    useState<SavedFilter>(
      'all'
    );


  const [
    editingId,
    setEditingId
  ] =
    useState<string | null>(
      null
    );


  const [
    draftNotes,
    setDraftNotes
  ] =
    useState(
      ''
    );


  const [
    savingId,
    setSavingId
  ] =
    useState<string | null>(
      null
    );


  async function loadSavedTopics():
    Promise<void> {

    if (
      !supabase
    ) {

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


    setMessage(
      ''
    );


    const {
      data:
        authData
    } =
      await supabase
        .auth
        .getUser();


    const user =
      authData.user;


    if (
      !user
    ) {

      setSignedIn(
        false
      );


      setRows(
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
      error
    } =
      await supabase
        .from(
          'syllabus_topic_workspace'
        )
        .select(
          `
            id,
            exam_stage,
            subject,
            topic,
            paper,
            bookmarked,
            notes,
            updated_at
          `
        )
        .eq(
          'user_id',
          user.id
        )
        .order(
          'updated_at',
          {
            ascending:
              false
          }
        );


    if (
      error
    ) {

      console.error(
        'Unable to load saved topics:',
        error
      );


      setRows(
        []
      );


      setMessage(
        error.message
      );


      setLoading(
        false
      );


      return;
    }


    const loadedRows:
      SavedTopic[] =
      (
        data ||
        []
      )
        .map(
          item => ({

            id:
              String(
                item.id
              ),

            exam_stage:
              (
                item.exam_stage ||
                'prelims'
              ) as ExamStage,

            subject:
              String(
                item.subject ||
                ''
              ),

            topic:
              String(
                item.topic ||
                ''
              ),

            paper:
              String(
                item.paper ||
                ''
              ),

            bookmarked:
              item.bookmarked ===
              true,

            notes:
              String(
                item.notes ||
                ''
              ),

            updated_at:
              String(
                item.updated_at ||
                ''
              )

          })
        )
        .filter(
          item =>

            item.bookmarked ||

            item.notes
              .trim()
              .length >
              0
        );


    setRows(
      loadedRows
    );


    setLoading(
      false
    );
  }


  useEffect(
    () => {

      void loadSavedTopics();

    },
    []
  );


  const visibleRows =
    useMemo(
      () => {

        const query =
          search
            .trim()
            .toLowerCase();


        return rows.filter(
          row => {

            if (
              stageFilter !==
                'all' &&

              row.exam_stage !==
                stageFilter
            ) {

              return false;
            }


            if (
              savedFilter ===
                'bookmarks' &&

              !row.bookmarked
            ) {

              return false;
            }


            if (
              savedFilter ===
                'notes' &&

              row.notes
                .trim()
                .length ===
                0
            ) {

              return false;
            }


            if (
              !query
            ) {

              return true;
            }


            const searchable =
              [
                row.exam_stage,
                row.paper,
                row.subject,
                row.topic,
                row.notes
              ]
                .join(
                  ' '
                )
                .toLowerCase();


            return searchable.includes(
              query
            );

          }
        );

      },
      [
        rows,
        search,
        stageFilter,
        savedFilter
      ]
    );


  const bookmarkCount =
    useMemo(
      () =>

        rows.filter(
          row =>
            row.bookmarked
        ).length,

      [
        rows
      ]
    );


  const noteCount =
    useMemo(
      () =>

        rows.filter(
          row =>
            row.notes
              .trim()
              .length >
            0
        ).length,

      [
        rows
      ]
    );


  const prelimsCount =
    useMemo(
      () =>

        rows.filter(
          row =>
            row.exam_stage ===
            'prelims'
        ).length,

      [
        rows
      ]
    );


  const mainsCount =
    useMemo(
      () =>

        rows.filter(
          row =>
            row.exam_stage ===
            'mains'
        ).length,

      [
        rows
      ]
    );


  async function toggleBookmark(
    row: SavedTopic
  ): Promise<void> {

    if (
      !supabase
    ) {

      return;
    }


    const next =
      !row.bookmarked;


    setSavingId(
      row.id
    );


    setMessage(
      ''
    );


    const {
      error
    } =
      await supabase
        .from(
          'syllabus_topic_workspace'
        )
        .update(
          {
            bookmarked:
              next
          }
        )
        .eq(
          'id',
          row.id
        );


    if (
      error
    ) {

      console.error(
        'Unable to update bookmark:',
        error
      );


      setMessage(
        error.message
      );


      setSavingId(
        null
      );


      return;
    }


    if (
      !next &&
      row.notes
        .trim()
        .length ===
        0
    ) {

      setRows(
        current =>
          current.filter(
            item =>
              item.id !==
              row.id
          )
      );

    } else {

      setRows(
        current =>
          current.map(
            item =>

              item.id ===
              row.id
                ? {
                    ...item,
                    bookmarked:
                      next
                  }
                : item
          )
      );

    }


    setMessage(
      next
        ? 'Topic bookmarked.'
        : 'Bookmark removed.'
    );


    setSavingId(
      null
    );
  }


  function startEditing(
    row: SavedTopic
  ): void {

    setEditingId(
      row.id
    );


    setDraftNotes(
      row.notes
    );


    setMessage(
      ''
    );
  }


  function cancelEditing():
    void {

    setEditingId(
      null
    );


    setDraftNotes(
      ''
    );
  }


  async function saveNote(
    row: SavedTopic
  ): Promise<void> {

    if (
      !supabase
    ) {

      return;
    }


    const cleanedNotes =
      draftNotes.trim();


    setSavingId(
      row.id
    );


    setMessage(
      ''
    );


    const {
      error
    } =
      await supabase
        .from(
          'syllabus_topic_workspace'
        )
        .update(
          {
            notes:
              cleanedNotes
          }
        )
        .eq(
          'id',
          row.id
        );


    if (
      error
    ) {

      console.error(
        'Unable to save notes:',
        error
      );


      setMessage(
        error.message
      );


      setSavingId(
        null
      );


      return;
    }


    if (
      !row.bookmarked &&
      cleanedNotes.length ===
        0
    ) {

      setRows(
        current =>
          current.filter(
            item =>
              item.id !==
              row.id
          )
      );

    } else {

      setRows(
        current =>
          current.map(
            item =>

              item.id ===
              row.id
                ? {
                    ...item,
                    notes:
                      cleanedNotes
                  }
                : item
          )
      );

    }


    setEditingId(
      null
    );


    setDraftNotes(
      ''
    );


    setSavingId(
      null
    );


    setMessage(
      'Notes saved.'
    );
  }


  async function deleteWorkspace(
    row: SavedTopic
  ): Promise<void> {

    if (
      !supabase
    ) {

      return;
    }


    const confirmed =
      window.confirm(
        `Remove saved data for "${row.topic}"?`
      );


    if (
      !confirmed
    ) {

      return;
    }


    setSavingId(
      row.id
    );


    setMessage(
      ''
    );


    const {
      error
    } =
      await supabase
        .from(
          'syllabus_topic_workspace'
        )
        .delete()
        .eq(
          'id',
          row.id
        );


    if (
      error
    ) {

      console.error(
        'Unable to remove saved topic:',
        error
      );


      setMessage(
        error.message
      );


      setSavingId(
        null
      );


      return;
    }


    setRows(
      current =>
        current.filter(
          item =>
            item.id !==
            row.id
        )
    );


    setSavingId(
      null
    );


    setMessage(
      'Saved topic removed.'
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
              SAVED STUDY
            </span>


            <h2>
              Saved Topics & Notes
            </h2>


            <p>
              Review your bookmarked syllabus
              topics and personal study notes.
            </p>

          </div>


          <button

            type="button"

            className="secondary-btn"

            onClick={() =>
              void loadSavedTopics()
            }

          >
            Refresh
          </button>

        </div>


        {
          !signedIn &&
          !loading && (

            <div
              className="callout"

              style={{
                marginTop:
                  '12px'
              }}
            >

              Sign in to view your saved
              syllabus topics and notes.

            </div>

          )
        }


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

      </section>


      {
        signedIn && (

          <section

            className="panel"

            style={{
              marginTop:
                '12px'
            }}

          >

            <div
              className="metrics-grid"
            >

              <article
                className="metric-card"
              >

                <div>

                  <span>
                    Bookmarks
                  </span>

                  <strong>
                    {
                      bookmarkCount
                    }
                  </strong>

                </div>

              </article>


              <article
                className="metric-card"
              >

                <div>

                  <span>
                    Notes
                  </span>

                  <strong>
                    {
                      noteCount
                    }
                  </strong>

                </div>

              </article>


              <article
                className="metric-card"
              >

                <div>

                  <span>
                    Prelims
                  </span>

                  <strong>
                    {
                      prelimsCount
                    }
                  </strong>

                </div>

              </article>


              <article
                className="metric-card"
              >

                <div>

                  <span>
                    Mains
                  </span>

                  <strong>
                    {
                      mainsCount
                    }
                  </strong>

                </div>

              </article>

            </div>

          </section>

        )
      }


      {
        signedIn && (

          <section

            className="panel"

            style={{
              marginTop:
                '12px'
            }}

          >

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

                Search

                <input

                  type="search"

                  value={
                    search
                  }

                  onChange={
                    event =>
                      setSearch(
                        event.target.value
                      )
                  }

                  placeholder="Topic, subject or notes..."

                />

              </label>


              <label>

                Exam Stage

                <select

                  value={
                    stageFilter
                  }

                  onChange={
                    event =>
                      setStageFilter(
                        event.target.value as
                          StageFilter
                      )
                  }

                >

                  <option
                    value="all"
                  >
                    All
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

                Saved Type

                <select

                  value={
                    savedFilter
                  }

                  onChange={
                    event =>
                      setSavedFilter(
                        event.target.value as
                          SavedFilter
                      )
                  }

                >

                  <option
                    value="all"
                  >
                    All Saved
                  </option>


                  <option
                    value="bookmarks"
                  >
                    Bookmarks
                  </option>


                  <option
                    value="notes"
                  >
                    Notes
                  </option>

                </select>

              </label>


              <button

                type="button"

                className="secondary-btn"

                style={{
                  alignSelf:
                    'end'
                }}

                onClick={() => {

                  setSearch(
                    ''
                  );


                  setStageFilter(
                    'all'
                  );


                  setSavedFilter(
                    'all'
                  );

                }}

              >
                Clear Filters
              </button>

            </div>

          </section>

        )
      }


      {
        loading && (

          <section

            className="panel"

            style={{
              marginTop:
                '12px'
            }}

          >
            Loading saved topics...
          </section>

        )
      }


      {
        !loading &&
        signedIn &&
        visibleRows.length ===
        0 && (

          <section

            className="panel"

            style={{
              marginTop:
                '12px'
            }}

          >

            <h3>
              No saved topics found
            </h3>


            <p>
              Open a syllabus topic and
              use Bookmark or My Notes.
            </p>

          </section>

        )
      }


      {
        !loading &&
        signedIn &&
        visibleRows.length >
        0 && (

          <section
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
              visibleRows.map(
                row => {

                  const editing =
                    editingId ===
                    row.id;


                  return (

                    <article

                      className="panel"

                      key={
                        row.id
                      }

                      style={{
                        padding:
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
                            '12px',

                          flexWrap:
                            'wrap'

                        }}
                      >

                        <div>

                          <div
                            style={{

                              display:
                                'flex',

                              gap:
                                '6px',

                              flexWrap:
                                'wrap'

                            }}
                          >

                            <span
                              className="tag"
                            >

                              {
                                row.exam_stage ===
                                  'prelims'
                                  ? 'Prelims'
                                  : 'Mains'
                              }

                            </span>


                            {
                              row.paper && (

                                <span
                                  className="tag"
                                >
                                  {
                                    row.paper
                                  }
                                </span>

                              )
                            }


                            {
                              row.bookmarked && (

                                <span
                                  className="tag"
                                >
                                  ★ Saved
                                </span>

                              )
                            }

                          </div>


                          <h3
                            style={{
                              margin:
                                '8px 0 4px'
                            }}
                          >

                            {
                              row.topic
                            }

                          </h3>


                          <small
                            style={{
                              color:
                                '#94a3b8'
                            }}
                          >

                            {
                              row.subject
                            }


                            {
                              row.updated_at
                                ? ` • Updated ${formatDate(
                                    row.updated_at
                                  )}`
                                : ''
                            }

                          </small>

                        </div>


                        <button

                          type="button"

                          className={
                            row.bookmarked
                              ? 'filter active'
                              : 'filter'
                          }

                          disabled={
                            savingId ===
                            row.id
                          }

                          onClick={() =>
                            void toggleBookmark(
                              row
                            )
                          }

                        >

                          {
                            row.bookmarked
                              ? '★'
                              : '☆'
                          }

                        </button>

                      </div>


                      {
                        !editing &&
                        row.notes
                          .trim()
                          .length >
                        0 && (

                          <div

                            className="callout"

                            style={{
                              marginTop:
                                '12px'
                            }}

                          >

                            <strong>
                              My Notes
                            </strong>


                            <p
                              style={{

                                marginBottom:
                                  0,

                                whiteSpace:
                                  'pre-wrap'

                              }}
                            >

                              {
                                row.notes
                              }

                            </p>

                          </div>

                        )
                      }


                      {
                        editing && (

                          <div
                            style={{
                              marginTop:
                                '12px'
                            }}
                          >

                            <label>

                              Personal Notes

                              <textarea

                                rows={
                                  8
                                }

                                value={
                                  draftNotes
                                }

                                onChange={
                                  event =>
                                    setDraftNotes(
                                      event.target.value
                                    )
                                }

                              />

                            </label>


                            <div
                              style={{

                                display:
                                  'flex',

                                gap:
                                  '8px',

                                flexWrap:
                                  'wrap',

                                marginTop:
                                  '10px'

                              }}
                            >

                              <button

                                type="button"

                                className="primary-btn"

                                disabled={
                                  savingId ===
                                  row.id
                                }

                                onClick={() =>
                                  void saveNote(
                                    row
                                  )
                                }

                              >
                                Save Notes
                              </button>


                              <button

                                type="button"

                                className="secondary-btn"

                                onClick={
                                  cancelEditing
                                }

                              >
                                Cancel
                              </button>

                            </div>

                          </div>

                        )
                      }


                      {
                        !editing && (

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

                              className="secondary-btn"

                              onClick={() =>
                                startEditing(
                                  row
                                )
                              }

                            >

                              {
                                row.notes
                                  .trim()
                                  .length >
                                0
                                  ? 'Edit Notes'
                                  : '+ Add Notes'
                              }

                            </button>


                            <button

                              type="button"

                              className="text-btn"

                              disabled={
                                savingId ===
                                row.id
                              }

                              onClick={() =>
                                void deleteWorkspace(
                                  row
                                )
                              }

                            >
                              Remove
                            </button>

                          </div>

                        )
                      }

                    </article>

                  );

                }
              )
            }

          </section>

        )
      }

    </div>

  );
}

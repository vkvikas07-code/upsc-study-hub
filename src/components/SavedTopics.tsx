import {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


export type SavedTopicTarget = {
  stage: 'prelims' | 'mains';
  subject: string;
  topic: string;
  paper: string | null;
};


type SavedTopicsProps = {
  onOpenTopic?: (
    target: SavedTopicTarget
  ) => void;
};


type SavedTopic = {
  id: string;
  exam_stage: 'prelims' | 'mains';
  subject: string;
  topic: string;
  paper: string;
  bookmarked: boolean;
  notes: string;
  updated_at: string;
};


type StageFilter =
  | 'all'
  | 'prelims'
  | 'mains';


type SavedFilter =
  | 'all'
  | 'bookmarks'
  | 'notes';


function formatDate(
  value: string
): string {

  if (!value) {
    return '';
  }

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
    undefined,
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }
  );
}


export function SavedTopics({
  onOpenTopic
}: SavedTopicsProps) {

  const [
    rows,
    setRows
  ] =
    useState<SavedTopic[]>([]);

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
    message,
    setMessage
  ] =
    useState('');

  const [
    search,
    setSearch
  ] =
    useState('');

  const [
    stageFilter,
    setStageFilter
  ] =
    useState<StageFilter>('all');

  const [
    savedFilter,
    setSavedFilter
  ] =
    useState<SavedFilter>('all');

  const [
    editingId,
    setEditingId
  ] =
    useState<string | null>(null);

  const [
    draftNotes,
    setDraftNotes
  ] =
    useState('');

  const [
    savingId,
    setSavingId
  ] =
    useState<string | null>(null);


  async function loadSavedTopics():
    Promise<void> {

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
      data: authData
    } =
      await supabase
        .auth
        .getUser();

    const user =
      authData.user;

    if (!user) {

      setSignedIn(false);
      setRows([]);
      setLoading(false);

      return;
    }

    setSignedIn(true);

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
            ascending: false
          }
        );

    if (error) {

      console.error(
        'Saved topics load error:',
        error
      );

      setRows([]);
      setMessage(error.message);
      setLoading(false);

      return;
    }

    const loaded:
      SavedTopic[] =
      (data || [])
        .map(
          item => ({
            id:
              String(item.id),

            exam_stage:
              (
                item.exam_stage ||
                'prelims'
              ) as
                | 'prelims'
                | 'mains',

            subject:
              String(
                item.subject || ''
              ),

            topic:
              String(
                item.topic || ''
              ),

            paper:
              String(
                item.paper || ''
              ),

            bookmarked:
              item.bookmarked === true,

            notes:
              String(
                item.notes || ''
              ),

            updated_at:
              String(
                item.updated_at || ''
              )
          })
        )
        .filter(
          item =>
            item.bookmarked ||
            item.notes.trim().length > 0
        );

    setRows(loaded);
    setLoading(false);
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
              stageFilter !== 'all' &&
              row.exam_stage !== stageFilter
            ) {
              return false;
            }

            if (
              savedFilter === 'bookmarks' &&
              !row.bookmarked
            ) {
              return false;
            }

            if (
              savedFilter === 'notes' &&
              row.notes.trim().length === 0
            ) {
              return false;
            }

            if (!query) {
              return true;
            }

            const text =
              [
                row.exam_stage,
                row.paper,
                row.subject,
                row.topic,
                row.notes
              ]
                .join(' ')
                .toLowerCase();

            return text.includes(query);
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
    rows.filter(
      row => row.bookmarked
    ).length;

  const noteCount =
    rows.filter(
      row =>
        row.notes.trim().length > 0
    ).length;

  const prelimsCount =
    rows.filter(
      row =>
        row.exam_stage === 'prelims'
    ).length;

  const mainsCount =
    rows.filter(
      row =>
        row.exam_stage === 'mains'
    ).length;


  function openTopic(
    row: SavedTopic
  ): void {

    if (!onOpenTopic) {
      return;
    }

    onOpenTopic({
      stage:
        row.exam_stage,

      subject:
        row.subject,

      topic:
        row.topic,

      paper:
        row.paper || null
    });
  }


  async function toggleBookmark(
    row: SavedTopic
  ): Promise<void> {

    if (!supabase) {
      return;
    }

    const next =
      !row.bookmarked;

    setSavingId(row.id);
    setMessage('');

    const {
      error
    } =
      await supabase
        .from(
          'syllabus_topic_workspace'
        )
        .update({
          bookmarked: next
        })
        .eq(
          'id',
          row.id
        );

    if (error) {

      setMessage(error.message);
      setSavingId(null);

      return;
    }

    if (
      !next &&
      row.notes.trim().length === 0
    ) {

      setRows(
        current =>
          current.filter(
            item =>
              item.id !== row.id
          )
      );

    } else {

      setRows(
        current =>
          current.map(
            item =>
              item.id === row.id
                ? {
                    ...item,
                    bookmarked: next
                  }
                : item
          )
      );
    }

    setSavingId(null);
  }


  function startEditing(
    row: SavedTopic
  ): void {

    setEditingId(row.id);
    setDraftNotes(row.notes);
  }


  function cancelEditing():
    void {

    setEditingId(null);
    setDraftNotes('');
  }


  async function saveNote(
    row: SavedTopic
  ): Promise<void> {

    if (!supabase) {
      return;
    }

    const cleanNotes =
      draftNotes.trim();

    setSavingId(row.id);

    const {
      error
    } =
      await supabase
        .from(
          'syllabus_topic_workspace'
        )
        .update({
          notes: cleanNotes
        })
        .eq(
          'id',
          row.id
        );

    if (error) {

      setMessage(error.message);
      setSavingId(null);

      return;
    }

    if (
      !row.bookmarked &&
      cleanNotes.length === 0
    ) {

      setRows(
        current =>
          current.filter(
            item =>
              item.id !== row.id
          )
      );

    } else {

      setRows(
        current =>
          current.map(
            item =>
              item.id === row.id
                ? {
                    ...item,
                    notes: cleanNotes
                  }
                : item
          )
      );
    }

    setEditingId(null);
    setDraftNotes('');
    setSavingId(null);
    setMessage('Notes saved.');
  }


  async function removeSavedItem(
    row: SavedTopic
  ): Promise<void> {

    if (!supabase) {
      return;
    }

    const confirmed =
      window.confirm(
        `Remove saved data for "${row.topic}"?`
      );

    if (!confirmed) {
      return;
    }

    setSavingId(row.id);

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

    if (error) {

      setMessage(error.message);
      setSavingId(null);

      return;
    }

    setRows(
      current =>
        current.filter(
          item =>
            item.id !== row.id
        )
    );

    setSavingId(null);
  }


  return (

    <div>

      <section className="panel">

        <div className="panel-head">

          <div>

            <span className="eyebrow">
              SAVED STUDY
            </span>

            <h2>
              Saved Topics & Notes
            </h2>

            <p>
              Open bookmarked topics directly
              inside the syllabus workspace.
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
                marginTop: '12px'
              }}
            >
              Sign in to view saved topics.
            </div>

          )
        }

        {
          message && (

            <div
              className="callout"
              style={{
                marginTop: '12px'
              }}
            >
              {message}
            </div>

          )
        }

      </section>


      {
        signedIn && (

          <section
            className="panel"
            style={{
              marginTop: '12px'
            }}
          >

            <div className="metrics-grid">

              <article className="metric-card">
                <div>
                  <span>Bookmarks</span>
                  <strong>{bookmarkCount}</strong>
                </div>
              </article>

              <article className="metric-card">
                <div>
                  <span>Notes</span>
                  <strong>{noteCount}</strong>
                </div>
              </article>

              <article className="metric-card">
                <div>
                  <span>Prelims</span>
                  <strong>{prelimsCount}</strong>
                </div>
              </article>

              <article className="metric-card">
                <div>
                  <span>Mains</span>
                  <strong>{mainsCount}</strong>
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
              marginTop: '12px'
            }}
          >

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '10px'
              }}
            >

              <label>

                Search

                <input
                  type="search"
                  value={search}
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
                  value={stageFilter}
                  onChange={
                    event =>
                      setStageFilter(
                        event.target.value as
                          StageFilter
                      )
                  }
                >

                  <option value="all">
                    All
                  </option>

                  <option value="prelims">
                    Prelims
                  </option>

                  <option value="mains">
                    Mains
                  </option>

                </select>

              </label>


              <label>

                Saved Type

                <select
                  value={savedFilter}
                  onChange={
                    event =>
                      setSavedFilter(
                        event.target.value as
                          SavedFilter
                      )
                  }
                >

                  <option value="all">
                    All Saved
                  </option>

                  <option value="bookmarks">
                    Bookmarks
                  </option>

                  <option value="notes">
                    Notes
                  </option>

                </select>

              </label>

            </div>

          </section>

        )
      }


      {
        loading && (

          <section
            className="panel"
            style={{
              marginTop: '12px'
            }}
          >
            Loading saved topics...
          </section>

        )
      }


      {
        !loading &&
        signedIn &&
        visibleRows.length === 0 && (

          <section
            className="panel"
            style={{
              marginTop: '12px'
            }}
          >

            <h3>
              No saved topics found
            </h3>

          </section>

        )
      }


      {
        !loading &&
        signedIn &&
        visibleRows.length > 0 && (

          <section
            style={{
              display: 'grid',
              gap: '10px',
              marginTop: '12px'
            }}
          >

            {
              visibleRows.map(
                row => {

                  const editing =
                    editingId === row.id;

                  return (

                    <article
                      className="panel"
                      key={row.id}
                      style={{
                        padding: '14px'
                      }}
                    >

                      <div
                        style={{
                          display: 'flex',
                          justifyContent:
                            'space-between',
                          gap: '12px',
                          flexWrap: 'wrap'
                        }}
                      >

                        <div>

                          <div
                            style={{
                              display: 'flex',
                              gap: '6px',
                              flexWrap: 'wrap'
                            }}
                          >

                            <span className="tag">
                              {
                                row.exam_stage ===
                                  'prelims'
                                  ? 'Prelims'
                                  : 'Mains'
                              }
                            </span>

                            {
                              row.paper && (
                                <span className="tag">
                                  {row.paper}
                                </span>
                              )
                            }

                            {
                              row.bookmarked && (
                                <span className="tag">
                                  ★ Saved
                                </span>
                              )
                            }

                          </div>

                          <h3>
                            {row.topic}
                          </h3>

                          <small
                            style={{
                              color: '#94a3b8'
                            }}
                          >

                            {row.subject}

                            {
                              row.updated_at
                                ? ` • ${formatDate(
                                    row.updated_at
                                  )}`
                                : ''
                            }

                          </small>

                        </div>

                      </div>


                      {
                        !editing &&
                        row.notes.trim() && (

                          <div
                            className="callout"
                            style={{
                              marginTop: '12px'
                            }}
                          >

                            <strong>
                              My Notes
                            </strong>

                            <p
                              style={{
                                whiteSpace:
                                  'pre-wrap',
                                marginBottom: 0
                              }}
                            >
                              {row.notes}
                            </p>

                          </div>

                        )
                      }


                      {
                        editing && (

                          <div
                            style={{
                              marginTop: '12px'
                            }}
                          >

                            <textarea
                              rows={8}
                              value={draftNotes}
                              onChange={
                                event =>
                                  setDraftNotes(
                                    event.target.value
                                  )
                              }
                            />

                            <div
                              style={{
                                display: 'flex',
                                gap: '8px',
                                marginTop: '8px'
                              }}
                            >

                              <button
                                type="button"
                                className="primary-btn"
                                onClick={() =>
                                  void saveNote(row)
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
                              display: 'flex',
                              gap: '8px',
                              flexWrap: 'wrap',
                              marginTop: '12px'
                            }}
                          >

                            {
                              onOpenTopic && (

                                <button
                                  type="button"
                                  className="primary-btn"
                                  onClick={() =>
                                    openTopic(row)
                                  }
                                >
                                  Open Topic
                                </button>

                              )
                            }

                            <button
                              type="button"
                              className={
                                row.bookmarked
                                  ? 'filter active'
                                  : 'filter'
                              }
                              disabled={
                                savingId === row.id
                              }
                              onClick={() =>
                                void toggleBookmark(
                                  row
                                )
                              }
                            >
                              {
                                row.bookmarked
                                  ? '★ Bookmarked'
                                  : '☆ Bookmark'
                              }
                            </button>

                            <button
                              type="button"
                              className="secondary-btn"
                              onClick={() =>
                                startEditing(row)
                              }
                            >
                              {
                                row.notes.trim()
                                  ? 'Edit Notes'
                                  : '+ Add Notes'
                              }
                            </button>

                            <button
                              type="button"
                              className="text-btn"
                              disabled={
                                savingId === row.id
                              }
                              onClick={() =>
                                void removeSavedItem(
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

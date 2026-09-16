import {
  useEffect,
  useState
} from 'react';


type TopicNotesEditorProps = {

  topicName:
    string;

  notes:
    string |
    null;

  onSave:
    (
      notes:
        string |
        null
    ) =>
      void |
      Promise<void>;
};


export function TopicNotesEditor({

  topicName,
  notes,
  onSave

}: TopicNotesEditorProps) {

  const [
    editing,
    setEditing
  ] =
    useState(false);


  const [
    draft,
    setDraft
  ] =
    useState(
      notes ||
      ''
    );


  const [
    saving,
    setSaving
  ] =
    useState(false);


  const [
    message,
    setMessage
  ] =
    useState('');


  /*
   * =========================================
   * SYNC WITH DATABASE VALUE
   * =========================================
   */

  useEffect(
    () => {

      setDraft(
        notes ||
        ''
      );

    },
    [
      notes
    ]
  );


  /*
   * =========================================
   * SAVE NOTE
   * =========================================
   */

  async function saveNote() {

    const cleanNote =
      draft.trim();


    setSaving(
      true
    );


    setMessage('');


    try {

      await onSave(
        cleanNote ||
        null
      );


      setEditing(
        false
      );


      setMessage(
        'Note saved.'
      );

    } catch {

      setMessage(
        'Could not save note.'
      );

    } finally {

      setSaving(
        false
      );
    }
  }


  /*
   * =========================================
   * CLEAR NOTE
   * =========================================
   */

  async function clearNote() {

    const confirmed =
      window.confirm(
        `Remove your note for "${topicName}"?`
      );


    if (
      !confirmed
    ) {

      return;
    }


    setSaving(
      true
    );


    setMessage('');


    try {

      await onSave(
        null
      );


      setDraft('');


      setEditing(
        false
      );


      setMessage(
        'Note removed.'
      );

    } catch {

      setMessage(
        'Could not remove note.'
      );

    } finally {

      setSaving(
        false
      );
    }
  }


  /*
   * =========================================
   * CLOSED VIEW
   * =========================================
   */

  if (
    !editing
  ) {

    return (

      <div
        style={{
          marginTop:
            '12px'
        }}
      >

        {notes ? (

          <div
            style={{
              padding:
                '12px',

              borderRadius:
                '12px',

              background:
                'rgba(59,130,246,.07)',

              border:
                '1px solid rgba(59,130,246,.14)'
            }}
          >

            <small
              style={{
                display:
                  'block',

                marginBottom:
                  '5px',

                color:
                  '#94a3b8'
              }}
            >
              MY NOTE
            </small>


            <p
              style={{
                margin:
                  0,

                whiteSpace:
                  'pre-wrap',

                lineHeight:
                  1.5
              }}
            >
              {
                notes
              }
            </p>


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

                className="secondary-btn"

                onClick={() =>
                  setEditing(
                    true
                  )
                }
              >
                Edit Note
              </button>


              <button
                type="button"

                className="text-btn"

                disabled={
                  saving
                }

                onClick={() =>
                  void clearNote()
                }
              >
                Remove
              </button>

            </div>

          </div>

        ) : (

          <button
            type="button"

            className="text-btn"

            onClick={() => {

              setDraft('');

              setEditing(
                true
              );

            }}
          >
            + Add Personal Note
          </button>

        )}


        {message && (

          <small
            style={{
              display:
                'block',

              marginTop:
                '6px',

              color:
                '#94a3b8'
            }}
          >
            {
              message
            }
          </small>

        )}

      </div>

    );
  }


  /*
   * =========================================
   * EDITOR
   * =========================================
   */

  return (

    <div
      style={{
        marginTop:
          '12px',

        padding:
          '12px',

        borderRadius:
          '12px',

        background:
          'rgba(255,255,255,.025)',

        border:
          '1px solid rgba(255,255,255,.08)'
      }}
    >

      <label
        style={{
          display:
            'grid',

          gap:
            '7px'
        }}
      >

        Personal Note

        <textarea
          value={
            draft
          }

          maxLength={
            2000
          }

          rows={
            5
          }

          onChange={
            event =>
              setDraft(
                event.target.value
              )
          }

          placeholder="Write a short note, important point, doubt, reminder or revision clue…"

          style={{
            width:
              '100%',

            resize:
              'vertical'
          }}
        />

      </label>


      <div
        style={{
          display:
            'flex',

          justifyContent:
            'space-between',

          alignItems:
            'center',

          gap:
            '8px',

          marginTop:
            '6px'
        }}
      >

        <small
          style={{
            color:
              '#94a3b8'
          }}
        >
          {
            draft.length
          } / 2000
        </small>

      </div>


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
            saving
          }

          onClick={() =>
            void saveNote()
          }
        >
          {
            saving
              ? 'Saving…'
              : 'Save Note'
          }
        </button>


        <button
          type="button"

          className="secondary-btn"

          disabled={
            saving
          }

          onClick={() => {

            setDraft(
              notes ||
              ''
            );

            setEditing(
              false
            );

            setMessage('');

          }}
        >
          Cancel
        </button>

      </div>


      {message && (

        <small
          style={{
            display:
              'block',

            marginTop:
              '8px',

            color:
              '#94a3b8'
          }}
        >
          {
            message
          }
        </small>

      )}

    </div>

  );
}

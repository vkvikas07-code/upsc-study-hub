import {
  FormEvent,
  useEffect,
  useState
} from 'react';

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


type QuickNoteComposerProps = {

  buttonLabel?:
    string;

  defaultTitle:
    string;

  defaultSubject?:
    string |
    null;

  defaultTopic?:
    string |
    null;

  defaultContent?:
    string;

  defaultTags?:
    string[];

  examStage?:
    ExamStage;

  noteType?:
    NoteType;

  language?:
    NoteLanguage;

  currentAffairId?:
    string |
    null;

  bookTopicId?:
    string |
    null;

  sourceUrl?:
    string |
    null;
};


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
 * QUICK NOTE COMPOSER
 * =========================================
 */

export function QuickNoteComposer({

  buttonLabel =
    '+ Add Note',

  defaultTitle,

  defaultSubject =
    null,

  defaultTopic =
    null,

  defaultContent =
    '',

  defaultTags =
    [],

  examStage =
    'general',

  noteType =
    'general',

  language =
    'English',

  currentAffairId =
    null,

  bookTopicId =
    null,

  sourceUrl =
    null

}: QuickNoteComposerProps) {

  /*
   * =========================================
   * UI STATE
   * =========================================
   */

  const [
    open,
    setOpen
  ] =
    useState(
      false
    );


  const [
    title,
    setTitle
  ] =
    useState(
      defaultTitle
    );


  const [
    content,
    setContent
  ] =
    useState(
      defaultContent
    );


  const [
    tags,
    setTags
  ] =
    useState(
      defaultTags.join(
        ', '
      )
    );


  const [
    saving,
    setSaving
  ] =
    useState(
      false
    );


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
   * KEEP DEFAULT CONTEXT UPDATED
   *
   * Important when user opens a different:
   *
   * Current Affairs article
   * Book topic
   * =========================================
   */

  useEffect(
    () => {

      setTitle(
        defaultTitle
      );


      setContent(
        defaultContent
      );


      setTags(
        defaultTags.join(
          ', '
        )
      );


      setMessage('');
      setError('');

    },
    [
      defaultTitle,
      defaultContent,
      defaultTags
    ]
  );


  /*
   * =========================================
   * OPEN / CLOSE
   * =========================================
   */

  function openComposer() {

    setMessage('');
    setError('');


    setOpen(
      true
    );
  }


  function closeComposer() {

    if (
      saving
    ) {

      return;
    }


    setOpen(
      false
    );


    setError('');
  }


  /*
   * =========================================
   * RESET FORM
   * =========================================
   */

  function resetForm() {

    setTitle(
      defaultTitle
    );


    setContent(
      defaultContent
    );


    setTags(
      defaultTags.join(
        ', '
      )
    );
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


    const cleanTitle =
      title.trim();


    if (!cleanTitle) {

      setError(
        'Please enter a note title.'
      );


      return;
    }


    if (
      !content.trim()
    ) {

      setError(
        'Please write something in the note.'
      );


      return;
    }


    setSaving(
      true
    );


    setMessage('');
    setError('');


    const {
      data: {
        user
      },
      error:
        userError
    } =
      await client
        .auth
        .getUser();


    if (
      userError ||
      !user
    ) {

      setSaving(
        false
      );


      setError(
        'Please sign in to save this note.'
      );


      return;
    }


    const {
      error:
        insertError
    } =
      await client
        .from(
          'student_notes'
        )
        .insert({

          user_id:
            user.id,

          title:
            cleanTitle,

          content:
            content.trim(),

          subject:
            defaultSubject
              ?.trim() ||
            null,

          topic:
            defaultTopic
              ?.trim() ||
            null,

          exam_stage:
            examStage,

          note_type:
            noteType,

          language,

          tags:
            parseTags(
              tags
            ),

          is_pinned:
            false,

          is_archived:
            false,

          book_topic_id:
            bookTopicId,

          current_affair_id:
            currentAffairId,

          source_url:
            sourceUrl
              ?.trim() ||
            null

        });


    if (
      insertError
    ) {

      console.error(
        'Unable to save quick note:',
        insertError
      );


      setSaving(
        false
      );


      setError(
        insertError.message
      );


      return;
    }


    setSaving(
      false
    );


    setMessage(
      'Note saved to My Notes.'
    );


    resetForm();
  }


  /*
   * =========================================
   * CLOSED BUTTON
   * =========================================
   */

  if (!open) {

    return (

      <button
        type="button"
        className="secondary-btn"

        onClick={
          openComposer
        }
      >
        {buttonLabel}
      </button>

    );
  }


  /*
   * =========================================
   * OPEN COMPOSER
   * =========================================
   */

  return (

    <section
      style={{
        marginTop:
          '14px',

        padding:
          '16px',

        border:
          '1px solid rgba(45,212,191,.30)',

        borderRadius:
          '15px',

        background:
          'rgba(20,184,166,.055)'
      }}
    >

      {/* HEADER */}

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
            QUICK NOTE
          </span>


          <h3
            style={{
              margin:
                '5px 0'
            }}
          >
            Save to My Notes
          </h3>


          <p
            style={{
              margin:
                0
            }}
          >
            This note will stay linked to
            the study item you are reading.
          </p>

        </div>


        <button
          type="button"
          className="text-btn"

          disabled={
            saving
          }

          onClick={
            closeComposer
          }
        >
          Close
        </button>

      </div>


      {/* CONTEXT */}

      <div
        style={{
          display:
            'flex',

          gap:
            '7px',

          flexWrap:
            'wrap',

          marginTop:
            '13px'
        }}
      >

        {defaultSubject && (

          <span
            className="tag"
          >
            {defaultSubject}
          </span>

        )}


        {defaultTopic && (

          <span
            className="tag"
          >
            {defaultTopic}
          </span>

        )}


        <span
          className="tag"
        >
          {
            noteType ===
              'current_affairs'
              ? 'Current Affairs'

              : noteType ===
                'book'
              ? 'Book Note'

              : noteType ===
                'revision'
              ? 'Revision'

              : noteType ===
                'prelims'
              ? 'Prelims'

              : noteType ===
                'mains'
              ? 'Mains'

              : 'General'
          }
        </span>

      </div>


      {/* FORM */}

      <form
        onSubmit={
          saveNote
        }

        style={{
          marginTop:
            '14px'
        }}
      >

        {/* TITLE */}

        <label
          style={{
            display:
              'block'
          }}
        >

          <span>
            Note title
          </span>


          <input
            type="text"

            value={
              title
            }

            placeholder="Note title"

            onChange={
              event =>
                setTitle(
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


        {/* CONTENT */}

        <label
          style={{
            display:
              'block',

            marginTop:
              '12px'
          }}
        >

          <span>
            Your note
          </span>


          <textarea
            rows={
              6
            }

            value={
              content
            }

            placeholder="Write the point you want to remember..."

            onChange={
              event =>
                setContent(
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
              '12px'
          }}
        >

          <span>
            Tags
          </span>


          <input
            type="text"

            value={
              tags
            }

            placeholder="Example: Polity, Article 14, Revision"

            onChange={
              event =>
                setTags(
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


          <small
            style={{
              color:
                '#94a3b8'
            }}
          >
            Separate tags with commas.
          </small>

        </label>


        {/* ERROR */}

        {error && (

          <div
            className="callout"

            style={{
              marginTop:
                '12px'
            }}
          >

            <strong>
              Unable to save note
            </strong>


            <p>
              {error}
            </p>

          </div>

        )}


        {/* SUCCESS */}

        {message && (

          <div
            className="callout"

            style={{
              marginTop:
                '12px'
            }}
          >

            <strong>
              ✓ {message}
            </strong>

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
            type="submit"
            className="primary-btn"

            disabled={
              saving
            }
          >
            {
              saving
                ? 'Saving...'
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
              resetForm
            }
          >
            Reset
          </button>


          <button
            type="button"
            className="text-btn"

            disabled={
              saving
            }

            onClick={
              closeComposer
            }
          >
            Cancel
          </button>

        </div>

      </form>

    </section>

  );
}

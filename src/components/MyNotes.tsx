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

import {
  createNoteImageUrls,
  removeNoteImages,
  uploadNoteImages
} from '../lib/noteImages';

import {
  StudentNoteImagePicker
} from './StudentNoteImagePicker';

import type {
  PendingNoteImage
} from './StudentNoteImagePicker';


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

  isPinned:
    boolean;

  isArchived:
    boolean;

  sourceUrl:
    string |
    null;

  imagePaths:
    string[];

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

  image_paths:
    string[] |
    null;

  created_at:
    string |
    null;

  updated_at:
    string |
    null;
};


type NoteForm = {
  title: string;

  content: string;

  subject: string;

  topic: string;

  examStage:
    ExamStage;

  noteType:
    NoteType;

  language:
    NoteLanguage;

  tags: string;

  sourceUrl: string;
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


const MAX_NOTE_IMAGES =
  6;


/*
 * =========================================
 * NORMALISERS
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
 * DATABASE → APP
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
              item =>
                String(
                  item
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

    imagePaths:
      Array.isArray(
        row.image_paths
      )
        ? row.image_paths
            .map(
              item =>
                String(
                  item
                )
            )
            .filter(
              Boolean
            )
        : [],

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
 * HELPERS
 * =========================================
 */

function parseTags(
  value:
    string
) {

  return Array.from(
    new Set(
      value
        .split(
          ','
        )
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

  const [
    notes,
    setNotes
  ] =
    useState<
      StudentNote[]
    >([]);


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


  const [
    pendingImages,
    setPendingImages
  ] =
    useState<
      PendingNoteImage[]
    >([]);


  const [
    existingImagePaths,
    setExistingImagePaths
  ] =
    useState<
      string[]
    >([]);


  const [
    removedImagePaths,
    setRemovedImagePaths
  ] =
    useState<
      string[]
    >([]);


  const [
    imageUrls,
    setImageUrls
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});


  const [
    search,
    setSearch
  ] =
    useState(
      ''
    );


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


  const [
    message,
    setMessage
  ] =
    useState(
      ''
    );


  const [
    error,
    setError
  ] =
    useState(
      ''
    );


  /*
   * =========================================
   * CLEAN LOCAL PREVIEW URLS
   * =========================================
   */

  function clearPendingImages() {

    pendingImages.forEach(
      image => {

        URL.revokeObjectURL(
          image.previewUrl
        );

      }
    );


    setPendingImages(
      []
    );
  }


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

    setError(
      ''
    );


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

      setImageUrls(
        {}
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
          image_paths,
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


    const allPaths =
      Array.from(
        new Set(
          nextNotes.flatMap(
            note =>
              note.imagePaths
          )
        )
      );


    if (
      allPaths.length >
      0
    ) {

      const urls =
        await createNoteImageUrls(
          allPaths
        );


      setImageUrls(
        urls
      );

    } else {

      setImageUrls(
        {}
      );

    }


    setLoading(
      false
    );
  }


  useEffect(
    () => {

      void loadNotes();

    },
    []
  );


  /*
   * =========================================
   * FORM
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


    setMessage(
      ''
    );

    setError(
      ''
    );
  }


  function openNewNote() {

    clearPendingImages();


    setEditingId(
      null
    );


    setForm(
      EMPTY_FORM
    );


    setExistingImagePaths(
      []
    );


    setRemovedImagePaths(
      []
    );


    setMessage(
      ''
    );


    setError(
      ''
    );


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


  function openEditNote(
    note:
      StudentNote
  ) {

    clearPendingImages();


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


    setExistingImagePaths(
      note.imagePaths
    );


    setRemovedImagePaths(
      []
    );


    setMessage(
      ''
    );


    setError(
      ''
    );


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


  function closeEditor() {

    clearPendingImages();


    setEditorOpen(
      false
    );


    setEditingId(
      null
    );


    setExistingImagePaths(
      []
    );


    setRemovedImagePaths(
      []
    );


    setForm(
      EMPTY_FORM
    );


    setError(
      ''
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
      form.title.trim();


    if (!cleanTitle) {

      setError(
        'Please enter a note title.'
      );

      return;
    }


    if (
      existingImagePaths.length +
      pendingImages.length >
      MAX_NOTE_IMAGES
    ) {

      setError(
        `Maximum ${MAX_NOTE_IMAGES} images are allowed per note.`
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


    setMessage(
      ''
    );


    setError(
      ''
    );


    const basePayload = {

      user_id:
        user.id,

      title:
        cleanTitle,

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


    try {

      /*
       * UPDATE EXISTING NOTE
       */

      if (
        editingId
      ) {

        let newPaths:
          string[] = [];


        if (
          pendingImages.length >
          0
        ) {

          newPaths =
            await uploadNoteImages({
              userId:
                user.id,

              noteId:
                editingId,

              files:
                pendingImages.map(
                  image =>
                    image.file
                )
            });

        }


        const finalPaths = [
          ...existingImagePaths,
          ...newPaths
        ];


        const {
          error:
            updateError
        } =
          await client
            .from(
              'student_notes'
            )
            .update({
              ...basePayload,

              image_paths:
                finalPaths
            })
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

          if (
            newPaths.length >
            0
          ) {

            try {

              await removeNoteImages(
                newPaths
              );

            } catch (
              cleanupError
            ) {

              console.error(
                'Unable to clean uploaded images:',
                cleanupError
              );

            }

          }


          throw updateError;

        }


        if (
          removedImagePaths.length >
          0
        ) {

          try {

            await removeNoteImages(
              removedImagePaths
            );

          } catch (
            imageDeleteError
          ) {

            console.error(
              'Unable to remove old note images:',
              imageDeleteError
            );

          }

        }


        clearPendingImages();


        setExistingImagePaths(
          []
        );


        setRemovedImagePaths(
          []
        );


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
        data:
          created,

        error:
          insertError
      } =
        await client
          .from(
            'student_notes'
          )
          .insert({
            ...basePayload,

            image_paths:
              []
          })
          .select(
            'id'
          )
          .single();


      if (
        insertError ||
        !created
      ) {

        throw (
          insertError ||
          new Error(
            'Unable to create note.'
          )
        );

      }


      let uploadedPaths:
        string[] = [];


      try {

        if (
          pendingImages.length >
          0
        ) {

          uploadedPaths =
            await uploadNoteImages({
              userId:
                user.id,

              noteId:
                created.id,

              files:
                pendingImages.map(
                  image =>
                    image.file
                )
            });


          const {
            error:
              imageUpdateError
          } =
            await client
              .from(
                'student_notes'
              )
              .update({
                image_paths:
                  uploadedPaths
              })
              .eq(
                'id',
                created.id
              )
              .eq(
                'user_id',
                user.id
              );


          if (
            imageUpdateError
          ) {

            throw imageUpdateError;

          }

        }

      } catch (
        imageError
      ) {

        if (
          uploadedPaths.length >
          0
        ) {

          try {

            await removeNoteImages(
              uploadedPaths
            );

          } catch (
            cleanupError
          ) {

            console.error(
              'Unable to clean failed upload:',
              cleanupError
            );

          }

        }


        await client
          .from(
            'student_notes'
          )
          .delete()
          .eq(
            'id',
            created.id
          )
          .eq(
            'user_id',
            user.id
          );


        throw imageError;

      }


      const hadImages =
        pendingImages.length >
        0;


      clearPendingImages();


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
        hadImages
          ? 'New note and images saved successfully.'
          : 'New note created successfully.'
      );

    } catch (
      saveError
    ) {

      console.error(
        'Unable to save note:',
        saveError
      );


      setSaving(
        false
      );


      setError(
        saveError instanceof
          Error
          ? saveError.message
          : 'Unable to save note.'
      );

    }
  }


  /*
   * =========================================
   * PIN
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


    const {
      error:
        updateError
    } =
      await client
        .from(
          'student_notes'
        )
        .update({
          is_pinned:
            !note.isPinned
        })
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
   * ARCHIVE
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
   * DELETE
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


    if (!confirmed) {
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


    setError(
      ''
    );


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

      setError(
        deleteError.message
      );

      setWorkingId(
        null
      );

      return;
    }


    if (
      note.imagePaths.length >
      0
    ) {

      try {

        await removeNoteImages(
          note.imagePaths
        );

      } catch (
        imageDeleteError
      ) {

        console.error(
          'Note was deleted but some stored images could not be cleaned:',
          imageDeleteError
        );

      }

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
   * FILTER
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


            if (
              subjectFilter !==
                'all' &&
              note.subject !==
                subjectFilter
            ) {
              return false;
            }


            if (
              examFilter !==
                'all' &&
              note.examStage !==
                examFilter
            ) {
              return false;
            }


            if (
              typeFilter !==
                'all' &&
              note.noteType !==
                typeFilter
            ) {
              return false;
            }


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
   * UI
   * =========================================
   */

  return (

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
            MY NOTES
          </span>


          <h2>
            Personal UPSC Notes
          </h2>


          <p>
            Create notes with text, diagrams,
            maps, screenshots and photos.
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


      {loading && (

        <p>
          Loading your notes...
        </p>

      )}


      {!loading &&
        !signedIn && (

        <div
          className="callout"
        >
          <strong>
            Sign in to use My Notes
          </strong>

          <p>
            Notes and images remain private
            inside your account.
          </p>
        </div>

      )}


      {!loading &&
        signedIn && (

        <>

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
                      item => (

                        <option
                          key={
                            item
                          }

                          value={
                            item
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
                    <option value="general">
                      General
                    </option>

                    <option value="prelims">
                      Prelims
                    </option>

                    <option value="mains">
                      Mains
                    </option>

                    <option value="both">
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
                    <option value="general">
                      General
                    </option>

                    <option value="book">
                      Book Note
                    </option>

                    <option value="current_affairs">
                      Current Affairs
                    </option>

                    <option value="revision">
                      Revision
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
                    <option value="English">
                      English
                    </option>

                    <option value="Hindi">
                      Hindi
                    </option>

                    <option value="Bilingual">
                      Bilingual
                    </option>

                    <option value="Other">
                      Other
                    </option>
                  </select>

                </label>

              </div>


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


              <section
                style={{
                  marginTop:
                    '16px'
                }}
              >

                <strong>
                  Images
                </strong>


                <p
                  style={{
                    margin:
                      '5px 0 0',

                    color:
                      '#94a3b8'
                  }}
                >
                  Add screenshots, diagrams,
                  maps or handwritten notes.
                </p>


                {existingImagePaths.length >
                  0 && (

                  <div
                    style={{
                      display:
                        'grid',

                      gridTemplateColumns:
                        'repeat(auto-fill, minmax(140px, 1fr))',

                      gap:
                        '10px',

                      marginTop:
                        '12px'
                    }}
                  >

                    {existingImagePaths.map(
                      path => {

                        const url =
                          imageUrls[
                            path
                          ];


                        return (

                          <div
                            key={
                              path
                            }

                            style={{
                              position:
                                'relative',

                              minHeight:
                                '150px',

                              border:
                                '1px solid rgba(255,255,255,.10)',

                              borderRadius:
                                '12px',

                              overflow:
                                'hidden',

                              background:
                                '#0f172a'
                            }}
                          >

                            {url ? (

                              <img
                                src={
                                  url
                                }

                                alt="Existing note attachment"

                                style={{
                                  width:
                                    '100%',

                                  height:
                                    '150px',

                                  objectFit:
                                    'contain',

                                  display:
                                    'block'
                                }}
                              />

                            ) : (

                              <div
                                style={{
                                  padding:
                                    '14px'
                                }}
                              >
                                Loading image...
                              </div>

                            )}


                            <button
                              type="button"

                              disabled={
                                saving
                              }

                              onClick={() => {

                                setExistingImagePaths(
                                  current =>
                                    current.filter(
                                      item =>
                                        item !==
                                        path
                                    )
                                );


                                setRemovedImagePaths(
                                  current =>
                                    current.includes(
                                      path
                                    )
                                      ? current
                                      : [
                                          ...current,
                                          path
                                        ]
                                );

                              }}

                              style={{
                                position:
                                  'absolute',

                                top:
                                  '7px',

                                right:
                                  '7px',

                                border:
                                  0,

                                borderRadius:
                                  '999px',

                                padding:
                                  '5px 9px',

                                cursor:
                                  'pointer',

                                background:
                                  'rgba(15,23,42,.92)',

                                color:
                                  '#fff'
                              }}
                            >
                              ×
                            </button>

                          </div>

                        );

                      }
                    )}

                  </div>

                )}


                <StudentNoteImagePicker
                  images={
                    pendingImages
                  }

                  onChange={
                    setPendingImages
                  }

                  maxImages={
                    Math.max(
                      0,
                      MAX_NOTE_IMAGES -
                      existingImagePaths.length
                    )
                  }

                  disabled={
                    saving
                  }
                />

              </section>


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

              </label>


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
              Active Notes ({activeCount})
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
              Archived ({archivedCount})
            </button>

          </div>


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

                placeholder="Search notes"

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

                <option value="all">
                  All subjects
                </option>


                {subjectOptions.map(
                  item => (

                    <option
                      key={
                        item
                      }

                      value={
                        item
                      }
                    >
                      {item}
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

                <option value="all">
                  All
                </option>

                <option value="general">
                  General
                </option>

                <option value="prelims">
                  Prelims
                </option>

                <option value="mains">
                  Mains
                </option>

                <option value="both">
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

                <option value="all">
                  All
                </option>

                <option value="general">
                  General
                </option>

                <option value="book">
                  Book Notes
                </option>

                <option value="current_affairs">
                  Current Affairs
                </option>

                <option value="revision">
                  Revision
                </option>

                <option value="prelims">
                  Prelims
                </option>

                <option value="mains">
                  Mains
                </option>

              </select>

            </label>

          </div>


          <div
            style={{
              display:
                'flex',

              justifyContent:
                'space-between',

              alignItems:
                'center',

              gap:
                '10px',

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


            {(
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

                  setSearch(
                    ''
                  );

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
                Create a note or change the filters.
              </p>

            </div>

          )}


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

                        <div>

                          <div
                            style={{
                              display:
                                'flex',

                              gap:
                                '7px',

                              flexWrap:
                                'wrap'
                            }}
                          >

                            {note.isPinned && (
                              <span className="tag">
                                ★ Pinned
                              </span>
                            )}


                            <span className="tag">
                              {
                                examStageLabel(
                                  note.examStage
                                )
                              }
                            </span>


                            <span className="tag">
                              {
                                noteTypeLabel(
                                  note.noteType
                                )
                              }
                            </span>


                            <span className="tag">
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


                          {(note.subject ||
                            note.topic) && (

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


                              {note.subject &&
                                note.topic &&
                                ' → '}


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
                          {
                            formatDate(
                              note.updatedAt
                            )
                          }
                        </small>

                      </div>


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
                              '#dbe4ef'
                          }}
                        >
                          {note.content}
                        </p>

                      )}


                      {note.imagePaths.length >
                        0 && (

                        <div
                          style={{
                            display:
                              'grid',

                            gridTemplateColumns:
                              'repeat(auto-fill, minmax(140px, 1fr))',

                            gap:
                              '8px',

                            marginTop:
                              '12px'
                          }}
                        >

                          {note.imagePaths.map(
                            path => {

                              const url =
                                imageUrls[
                                  path
                                ];


                              if (!url) {
                                return null;
                              }


                              return (

                                <a
                                  key={
                                    path
                                  }

                                  href={
                                    url
                                  }

                                  target="_blank"

                                  rel="noreferrer"

                                  style={{
                                    display:
                                      'block',

                                    overflow:
                                      'hidden',

                                    borderRadius:
                                      '10px',

                                    border:
                                      '1px solid rgba(255,255,255,.10)',

                                    background:
                                      '#0f172a'
                                  }}
                                >

                                  <img
                                    src={
                                      url
                                    }

                                    alt="Note attachment"

                                    loading="lazy"

                                    style={{
                                      display:
                                        'block',

                                      width:
                                        '100%',

                                      height:
                                        '150px',

                                      objectFit:
                                        'cover'
                                    }}
                                  />

                                </a>

                              );

                            }
                          )}

                        </div>

                      )}


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

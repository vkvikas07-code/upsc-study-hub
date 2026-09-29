import {
  useEffect,
  useState
} from 'react';

import type {
  FormEvent
} from 'react';

import {
  supabase
} from '../lib/supabase';

import {
  StudentNoteImagePicker
} from './StudentNoteImagePicker';

import type {
  PendingNoteImage
} from './StudentNoteImagePicker';

import {
  createMainsFrameworkImageUrls,
  removeMainsFrameworkImages,
  uploadMainsFrameworkImages
} from '../lib/mainsImages';


type QuestionStatus =
  | 'draft'
  | 'published'
  | 'archived';


type QuestionType =
  | 'practice'
  | 'pyq';


type SectionType =
  | 'gs'
  | 'optional';


type Difficulty =
  | 'easy'
  | 'medium'
  | 'hard';


type MainsQuestion = {
  id: string;

  question: string;

  question_type:
    QuestionType;

  section_type:
    SectionType;

  gs_paper:
    string |
    null;

  optional_subject:
    string |
    null;

  optional_paper:
    string |
    null;

  subject: string;

  topic:
    string |
    null;

  syllabus_link:
    string |
    null;

  directive:
    string |
    null;

  marks:
    number |
    null;

  word_limit:
    number |
    null;

  pyq_year:
    number |
    null;

  answer_framework:
    string |
    null;

  key_points:
    string |
    null;

  introduction_hint:
    string |
    null;

  conclusion_hint:
    string |
    null;

  framework_image_paths:
    string[];

  source:
    string |
    null;

  source_url:
    string |
    null;

  tags:
    string[];

  difficulty:
    Difficulty;

  status:
    QuestionStatus;

  created_at:
    string;

  updated_at:
    string;
};


const MAX_FRAMEWORK_IMAGES =
  6;


const MAINS_SELECT = `
  id,
  question,
  question_type,
  section_type,
  gs_paper,
  optional_subject,
  optional_paper,
  subject,
  topic,
  syllabus_link,
  directive,
  marks,
  word_limit,
  pyq_year,
  answer_framework,
  key_points,
  introduction_hint,
  conclusion_hint,
  framework_image_paths,
  source,
  source_url,
  tags,
  difficulty,
  status,
  created_at,
  updated_at
`;


const optionalSubjects = [
  'Agriculture',
  'Animal Husbandry & Veterinary Science',
  'Anthropology',
  'Botany',
  'Chemistry',
  'Civil Engineering',
  'Commerce & Accountancy',
  'Economics',
  'Electrical Engineering',
  'Geography',
  'Geology',
  'History',
  'Law',
  'Management',
  'Mathematics',
  'Mechanical Engineering',
  'Medical Science',
  'Philosophy',
  'Physics',
  'Political Science & International Relations',
  'Psychology',
  'Public Administration',
  'Sociology',
  'Statistics',
  'Zoology',

  'Assamese Literature',
  'Bengali Literature',
  'Bodo Literature',
  'Dogri Literature',
  'English Literature',
  'Gujarati Literature',
  'Hindi Literature',
  'Kannada Literature',
  'Kashmiri Literature',
  'Konkani Literature',
  'Maithili Literature',
  'Malayalam Literature',
  'Manipuri Literature',
  'Marathi Literature',
  'Nepali Literature',
  'Odia Literature',
  'Punjabi Literature',
  'Sanskrit Literature',
  'Santhali Literature',
  'Sindhi Literature',
  'Tamil Literature',
  'Telugu Literature',
  'Urdu Literature'
];


function safeStringArray(
  value:
    unknown
):
  string[] {

  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }


  return value
    .map(
      item =>
        String(
          item
        )
    )
    .filter(
      Boolean
    );
}


export function MainsQuestionManager() {

  /* =========================================================
     QUESTION LIST
     ========================================================= */

  const [
    questions,
    setQuestions
  ] =
    useState<
      MainsQuestion[]
    >([]);


  const [
    loading,
    setLoading
  ] =
    useState(
      false
    );


  const [
    saving,
    setSaving
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
    message,
    setMessage
  ] =
    useState(
      ''
    );


  /* =========================================================
     MAIN FORM
     ========================================================= */

  const [
    sectionType,
    setSectionType
  ] =
    useState<
      SectionType
    >(
      'gs'
    );


  const [
    questionType,
    setQuestionType
  ] =
    useState<
      QuestionType
    >(
      'practice'
    );


  const [
    question,
    setQuestion
  ] =
    useState(
      ''
    );


  const [
    gsPaper,
    setGsPaper
  ] =
    useState(
      'GS-I'
    );


  const [
    optionalSubject,
    setOptionalSubject
  ] =
    useState(
      'Geography'
    );


  const [
    optionalPaper,
    setOptionalPaper
  ] =
    useState(
      'Paper-I'
    );


  const [
    subject,
    setSubject
  ] =
    useState(
      'Indian Heritage & Culture'
    );


  const [
    topic,
    setTopic
  ] =
    useState(
      ''
    );


  const [
    syllabusLink,
    setSyllabusLink
  ] =
    useState(
      ''
    );


  const [
    directive,
    setDirective
  ] =
    useState(
      'Discuss'
    );


  const [
    marks,
    setMarks
  ] =
    useState(
      '10'
    );


  const [
    wordLimit,
    setWordLimit
  ] =
    useState(
      '150'
    );


  const [
    pyqYear,
    setPyqYear
  ] =
    useState(
      ''
    );


  const [
    answerFramework,
    setAnswerFramework
  ] =
    useState(
      ''
    );


  const [
    keyPoints,
    setKeyPoints
  ] =
    useState(
      ''
    );


  const [
    introductionHint,
    setIntroductionHint
  ] =
    useState(
      ''
    );


  const [
    conclusionHint,
    setConclusionHint
  ] =
    useState(
      ''
    );


  /* =========================================================
     FRAMEWORK IMAGES
     ========================================================= */

  const [
    pendingFrameworkImages,
    setPendingFrameworkImages
  ] =
    useState<
      PendingNoteImage[]
    >([]);


  const [
    existingFrameworkImagePaths,
    setExistingFrameworkImagePaths
  ] =
    useState<
      string[]
    >([]);


  const [
    removedFrameworkImagePaths,
    setRemovedFrameworkImagePaths
  ] =
    useState<
      string[]
    >([]);


  const [
    frameworkImageUrls,
    setFrameworkImageUrls
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});


  const [
    source,
    setSource
  ] =
    useState(
      ''
    );


  const [
    sourceUrl,
    setSourceUrl
  ] =
    useState(
      ''
    );


  const [
    tagsText,
    setTagsText
  ] =
    useState(
      ''
    );


  const [
    difficulty,
    setDifficulty
  ] =
    useState<
      Difficulty
    >(
      'medium'
    );


  const [
    status,
    setStatus
  ] =
    useState<
      QuestionStatus
    >(
      'draft'
    );


  /* =========================================================
     QUESTION BANK FILTERS
     ========================================================= */

  const [
    searchText,
    setSearchText
  ] =
    useState(
      ''
    );


  const [
    bankSection,
    setBankSection
  ] =
    useState<
      | 'all'
      | SectionType
    >(
      'all'
    );


  const [
    bankQuestionType,
    setBankQuestionType
  ] =
    useState<
      | 'all'
      | QuestionType
    >(
      'all'
    );


  const [
    bankStatus,
    setBankStatus
  ] =
    useState<
      | 'all'
      | QuestionStatus
    >(
      'all'
    );


  const [
    bankDifficulty,
    setBankDifficulty
  ] =
    useState<
      | 'all'
      | Difficulty
    >(
      'all'
    );


  const [
    bankGsPaper,
    setBankGsPaper
  ] =
    useState(
      'all'
    );


  const [
    bankOptionalSubject,
    setBankOptionalSubject
  ] =
    useState(
      'all'
    );


  /* =========================================================
     IMAGE PREVIEW CLEANUP
     ========================================================= */

  function clearPendingFrameworkImagePreviews() {

    pendingFrameworkImages.forEach(
      image => {

        URL.revokeObjectURL(
          image.previewUrl
        );

      }
    );


    setPendingFrameworkImages(
      []
    );
  }


  /* =========================================================
     LOAD QUESTIONS
     ========================================================= */

  async function loadQuestions() {

    const client =
      supabase;


    if (
      !client
    ) {

      setMessage(
        'Supabase is not configured.'
      );

      return;
    }


    setLoading(
      true
    );


    const {
      data,
      error
    } =
      await client
        .from(
          'mains_questions'
        )
        .select(
          MAINS_SELECT
        )
        .order(
          'created_at',
          {
            ascending:
              false
          }
        );


    if (
      error
    ) {

      console.error(
        'Unable to load Mains questions:',
        error
      );


      setMessage(
        error.message
      );


      setLoading(
        false
      );


      return;
    }


    const loaded =
      (
        data ||
        []
      ).map(
        item => ({
          ...item,

          tags:
            safeStringArray(
              item.tags
            ),

          framework_image_paths:
            safeStringArray(
              item.framework_image_paths
            )
        })
      ) as
        MainsQuestion[];


    setQuestions(
      loaded
    );


    setLoading(
      false
    );
  }


  useEffect(
    () => {

      void loadQuestions();

    },
    []
  );


  /* =========================================================
     RESET FORM
     ========================================================= */

  function resetForm(
    keepMessage =
      false
  ) {

    clearPendingFrameworkImagePreviews();


    setEditingId(
      null
    );


    setSectionType(
      'gs'
    );


    setQuestionType(
      'practice'
    );


    setQuestion(
      ''
    );


    setGsPaper(
      'GS-I'
    );


    setOptionalSubject(
      'Geography'
    );


    setOptionalPaper(
      'Paper-I'
    );


    setSubject(
      'Indian Heritage & Culture'
    );


    setTopic(
      ''
    );


    setSyllabusLink(
      ''
    );


    setDirective(
      'Discuss'
    );


    setMarks(
      '10'
    );


    setWordLimit(
      '150'
    );


    setPyqYear(
      ''
    );


    setAnswerFramework(
      ''
    );


    setKeyPoints(
      ''
    );


    setIntroductionHint(
      ''
    );


    setConclusionHint(
      ''
    );


    setExistingFrameworkImagePaths(
      []
    );


    setRemovedFrameworkImagePaths(
      []
    );


    setFrameworkImageUrls(
      {}
    );


    setSource(
      ''
    );


    setSourceUrl(
      ''
    );


    setTagsText(
      ''
    );


    setDifficulty(
      'medium'
    );


    setStatus(
      'draft'
    );


    if (
      !keepMessage
    ) {

      setMessage(
        ''
      );

    }
  }


  /* =========================================================
     START EDIT
     ========================================================= */

  async function startEdit(
    item:
      MainsQuestion
  ) {

    clearPendingFrameworkImagePreviews();


    setEditingId(
      item.id
    );


    setQuestion(
      item.question
    );


    setQuestionType(
      item.question_type
    );


    setSectionType(
      item.section_type
    );


    setGsPaper(
      item.gs_paper ||
      'GS-I'
    );


    setOptionalSubject(
      item.optional_subject ||
      'Geography'
    );


    setOptionalPaper(
      item.optional_paper ||
      'Paper-I'
    );


    setSubject(
      item.subject
    );


    setTopic(
      item.topic ||
      ''
    );


    setSyllabusLink(
      item.syllabus_link ||
      ''
    );


    setDirective(
      item.directive ||
      ''
    );


    setMarks(
      item.marks
        ? String(
            item.marks
          )
        : ''
    );


    setWordLimit(
      item.word_limit
        ? String(
            item.word_limit
          )
        : ''
    );


    setPyqYear(
      item.pyq_year
        ? String(
            item.pyq_year
          )
        : ''
    );


    setAnswerFramework(
      item.answer_framework ||
      ''
    );


    setKeyPoints(
      item.key_points ||
      ''
    );


    setIntroductionHint(
      item.introduction_hint ||
      ''
    );


    setConclusionHint(
      item.conclusion_hint ||
      ''
    );


    const imagePaths =
      safeStringArray(
        item.framework_image_paths
      );


    setExistingFrameworkImagePaths(
      imagePaths
    );


    setRemovedFrameworkImagePaths(
      []
    );


    setFrameworkImageUrls(
      {}
    );


    if (
      imagePaths.length >
      0
    ) {

      try {

        const urls =
          await createMainsFrameworkImageUrls(
            imagePaths
          );


        setFrameworkImageUrls(
          urls
        );

      } catch (
        imageError
      ) {

        console.error(
          'Unable to load framework image previews:',
          imageError
        );

      }
    }


    setSource(
      item.source ||
      ''
    );


    setSourceUrl(
      item.source_url ||
      ''
    );


    setTagsText(
      (
        item.tags ||
        []
      ).join(
        ', '
      )
    );


    setDifficulty(
      item.difficulty
    );


    setStatus(
      item.status
    );


    setMessage(
      'Editing Mains question.'
    );


    const mainArea =
      document.querySelector(
        '.main-area'
      );


    if (
      mainArea
    ) {

      mainArea.scrollTo({
        top:
          0,

        behavior:
          'smooth'
      });

    } else {

      window.scrollTo({
        top:
          0,

        behavior:
          'smooth'
      });

    }
  }


  /* =========================================================
     SAVE QUESTION
     ========================================================= */

  async function saveQuestion(
    event:
      FormEvent
  ) {

    event.preventDefault();


    const client =
      supabase;


    if (
      !client
    ) {

      setMessage(
        'Supabase is not configured.'
      );

      return;
    }


    if (
      !question.trim()
    ) {

      setMessage(
        'Enter the Mains question.'
      );

      return;
    }


    if (
      !subject.trim()
    ) {

      setMessage(
        'Enter the subject.'
      );

      return;
    }


    if (
      questionType ===
        'pyq' &&
      !pyqYear.trim()
    ) {

      setMessage(
        'Previous Year Question requires a year.'
      );

      return;
    }


    if (
      sectionType ===
        'optional' &&
      !optionalSubject
    ) {

      setMessage(
        'Select the Optional Subject.'
      );

      return;
    }


    if (
      existingFrameworkImagePaths.length +
      pendingFrameworkImages.length >
      MAX_FRAMEWORK_IMAGES
    ) {

      setMessage(
        `Maximum ${MAX_FRAMEWORK_IMAGES} framework images are allowed.`
      );

      return;
    }


    setSaving(
      true
    );


    setMessage(
      editingId
        ? 'Updating Mains question...'
        : 'Saving Mains question...'
    );


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

      setSaving(
        false
      );


      setMessage(
        'Admin session expired. Sign in again.'
      );


      return;
    }


    const tags =
      tagsText
        .split(
          ','
        )
        .map(
          tag =>
            tag.trim()
        )
        .filter(
          Boolean
        );


    const payload = {

      question:
        question.trim(),

      question_type:
        questionType,

      section_type:
        sectionType,

      gs_paper:
        sectionType ===
          'gs'
          ? gsPaper
          : null,

      optional_subject:
        sectionType ===
          'optional'
          ? optionalSubject
          : null,

      optional_paper:
        sectionType ===
          'optional'
          ? optionalPaper
          : null,

      subject:
        subject.trim(),

      topic:
        topic.trim() ||
        null,

      syllabus_link:
        syllabusLink.trim() ||
        null,

      directive:
        directive.trim() ||
        null,

      marks:
        marks.trim()
          ? Number(
              marks
            )
          : null,

      word_limit:
        wordLimit.trim()
          ? Number(
              wordLimit
            )
          : null,

      pyq_year:
        questionType ===
          'pyq' &&
        pyqYear.trim()
          ? Number(
              pyqYear
            )
          : null,

      answer_framework:
        answerFramework.trim() ||
        null,

      key_points:
        keyPoints.trim() ||
        null,

      introduction_hint:
        introductionHint.trim() ||
        null,

      conclusion_hint:
        conclusionHint.trim() ||
        null,

      source:
        source.trim() ||
        null,

      source_url:
        sourceUrl.trim() ||
        null,

      tags,

      difficulty,

      status,

      updated_at:
        new Date()
          .toISOString()
    };


    /* =======================================================
       UPDATE EXISTING QUESTION
       ======================================================= */

    if (
      editingId
    ) {

      let uploadedPaths:
        string[] = [];


      try {

        if (
          pendingFrameworkImages.length >
          0
        ) {

          uploadedPaths =
            await uploadMainsFrameworkImages({
              questionId:
                editingId,

              files:
                pendingFrameworkImages.map(
                  image =>
                    image.file
                )
            });

        }


        const finalImagePaths = [
          ...existingFrameworkImagePaths,
          ...uploadedPaths
        ];


        const {
          data,
          error
        } =
          await client
            .from(
              'mains_questions'
            )
            .update({
              ...payload,

              framework_image_paths:
                finalImagePaths
            })
            .eq(
              'id',
              editingId
            )
            .select(
              MAINS_SELECT
            )
            .single();


        if (
          error ||
          !data
        ) {

          if (
            uploadedPaths.length >
            0
          ) {

            try {

              await removeMainsFrameworkImages(
                uploadedPaths
              );

            } catch (
              cleanupError
            ) {

              console.error(
                'Unable to clean failed framework uploads:',
                cleanupError
              );

            }
          }


          throw (
            error ||
            new Error(
              'Mains question update failed.'
            )
          );
        }


        if (
          removedFrameworkImagePaths.length >
          0
        ) {

          try {

            await removeMainsFrameworkImages(
              removedFrameworkImagePaths
            );

          } catch (
            cleanupError
          ) {

            console.error(
              'Unable to delete removed framework images:',
              cleanupError
            );

          }
        }


        const updated = {
          ...data,

          tags:
            safeStringArray(
              data.tags
            ),

          framework_image_paths:
            safeStringArray(
              data.framework_image_paths
            )
        } as
          MainsQuestion;


        setQuestions(
          current =>
            current.map(
              item =>
                item.id ===
                  updated.id
                  ? updated
                  : item
            )
        );


        setSaving(
          false
        );


        resetForm(
          true
        );


        setMessage(
          'Mains question updated successfully.'
        );


        return;

      } catch (
        saveError
      ) {

        console.error(
          'Mains question update failed:',
          saveError
        );


        setSaving(
          false
        );


        setMessage(
          saveError instanceof
            Error
            ? saveError.message
            : 'Mains question update failed.'
        );


        return;
      }
    }


    /* =======================================================
       CREATE NEW QUESTION
       ======================================================= */

    const {
      data:
        createdQuestion,

      error:
        createError
    } =
      await client
        .from(
          'mains_questions'
        )
        .insert({
          ...payload,

          framework_image_paths:
            [],

          created_by:
            user.id
        })
        .select(
          MAINS_SELECT
        )
        .single();


    if (
      createError ||
      !createdQuestion
    ) {

      console.error(
        'Mains question creation failed:',
        createError
      );


      setSaving(
        false
      );


      setMessage(
        createError?.message ||
        'Unable to save Mains question.'
      );


      return;
    }


    let uploadedPaths:
      string[] = [];


    try {

      if (
        pendingFrameworkImages.length >
        0
      ) {

        uploadedPaths =
          await uploadMainsFrameworkImages({
            questionId:
              createdQuestion.id,

            files:
              pendingFrameworkImages.map(
                image =>
                  image.file
              )
          });


        const {
          data:
            updatedWithImages,

          error:
            imageUpdateError
        } =
          await client
            .from(
              'mains_questions'
            )
            .update({
              framework_image_paths:
                uploadedPaths
            })
            .eq(
              'id',
              createdQuestion.id
            )
            .select(
              MAINS_SELECT
            )
            .single();


        if (
          imageUpdateError ||
          !updatedWithImages
        ) {

          throw (
            imageUpdateError ||
            new Error(
              'Unable to link framework images.'
            )
          );
        }


        const created = {
          ...updatedWithImages,

          tags:
            safeStringArray(
              updatedWithImages.tags
            ),

          framework_image_paths:
            safeStringArray(
              updatedWithImages.framework_image_paths
            )
        } as
          MainsQuestion;


        setQuestions(
          current => [
            created,
            ...current
          ]
        );

      } else {

        const created = {
          ...createdQuestion,

          tags:
            safeStringArray(
              createdQuestion.tags
            ),

          framework_image_paths:
            safeStringArray(
              createdQuestion.framework_image_paths
            )
        } as
          MainsQuestion;


        setQuestions(
          current => [
            created,
            ...current
          ]
        );
      }


      const hadImages =
        pendingFrameworkImages.length >
        0;


      const published =
        status ===
        'published';


      setSaving(
        false
      );


      resetForm(
        true
      );


      if (
        hadImages
      ) {

        setMessage(
          published
            ? 'Mains question and framework images published successfully.'
            : 'Mains question and framework images saved successfully.'
        );

      } else {

        setMessage(
          published
            ? 'Mains question published successfully.'
            : 'Mains question saved as draft.'
        );

      }

    } catch (
      imageError
    ) {

      console.error(
        'Framework image upload failed:',
        imageError
      );


      if (
        uploadedPaths.length >
        0
      ) {

        try {

          await removeMainsFrameworkImages(
            uploadedPaths
          );

        } catch (
          cleanupError
        ) {

          console.error(
            'Unable to clean framework images:',
            cleanupError
          );

        }
      }


      /*
       * Delete the newly-created database row because
       * the image operation did not complete correctly.
       */

      const {
        error:
          deleteError
      } =
        await client
          .from(
            'mains_questions'
          )
          .delete()
          .eq(
            'id',
            createdQuestion.id
          );


      if (
        deleteError
      ) {

        console.error(
          'Unable to remove incomplete Mains question:',
          deleteError
        );

      }


      setSaving(
        false
      );


      setMessage(
        imageError instanceof
          Error
          ? imageError.message
          : 'Unable to upload framework images.'
      );
    }
  }


  /* =========================================================
     CHANGE STATUS
     ========================================================= */

  async function changeStatus(
    item:
      MainsQuestion,

    nextStatus:
      QuestionStatus
  ) {

    const client =
      supabase;


    if (
      !client
    ) {
      return;
    }


    const {
      data,
      error
    } =
      await client
        .from(
          'mains_questions'
        )
        .update({
          status:
            nextStatus,

          updated_at:
            new Date()
              .toISOString()
        })
        .eq(
          'id',
          item.id
        )
        .select(
          MAINS_SELECT
        )
        .single();


    if (
      error ||
      !data
    ) {

      setMessage(
        error?.message ||
        'Unable to change status.'
      );


      return;
    }


    const updated = {
      ...data,

      tags:
        safeStringArray(
          data.tags
        ),

      framework_image_paths:
        safeStringArray(
          data.framework_image_paths
        )
    } as
      MainsQuestion;


    setQuestions(
      current =>
        current.map(
          questionItem =>
            questionItem.id ===
              updated.id
              ? updated
              : questionItem
        )
    );


    setMessage(
      `Mains question changed to ${nextStatus}.`
    );
  }


  /* =========================================================
     DELETE QUESTION
     ========================================================= */

  async function deleteQuestion(
    item:
      MainsQuestion
  ) {

    const client =
      supabase;


    if (
      !client
    ) {
      return;
    }


    const confirmed =
      window.confirm(
        'Delete this Mains question permanently?'
      );


    if (
      !confirmed
    ) {
      return;
    }


    const imagePaths =
      safeStringArray(
        item.framework_image_paths
      );


    /*
     * Delete database row first.
     * Only remove storage objects after DB deletion succeeds.
     */

    const {
      error
    } =
      await client
        .from(
          'mains_questions'
        )
        .delete()
        .eq(
          'id',
          item.id
        );


    if (
      error
    ) {

      setMessage(
        error.message
      );


      return;
    }


    if (
      imagePaths.length >
      0
    ) {

      try {

        await removeMainsFrameworkImages(
          imagePaths
        );

      } catch (
        imageError
      ) {

        console.error(
          'Mains question deleted, but framework image cleanup failed:',
          imageError
        );

      }
    }


    setQuestions(
      current =>
        current.filter(
          questionItem =>
            questionItem.id !==
            item.id
        )
    );


    if (
      editingId ===
      item.id
    ) {

      resetForm();

    }


    setMessage(
      'Mains question deleted.'
    );
  }


  /* =========================================================
     FILTER QUESTION BANK
     ========================================================= */

  const filteredQuestions =
    questions.filter(
      item => {

        const search =
          searchText
            .trim()
            .toLowerCase();


        const matchesSearch =
          !search ||
          item.question
            .toLowerCase()
            .includes(
              search
            ) ||
          item.subject
            .toLowerCase()
            .includes(
              search
            ) ||
          (
            item.topic ||
            ''
          )
            .toLowerCase()
            .includes(
              search
            ) ||
          (
            item.source ||
            ''
          )
            .toLowerCase()
            .includes(
              search
            );


        const matchesSection =
          bankSection ===
            'all' ||
          item.section_type ===
            bankSection;


        const matchesQuestionType =
          bankQuestionType ===
            'all' ||
          item.question_type ===
            bankQuestionType;


        const matchesStatus =
          bankStatus ===
            'all' ||
          item.status ===
            bankStatus;


        const matchesDifficulty =
          bankDifficulty ===
            'all' ||
          item.difficulty ===
            bankDifficulty;


        const matchesGsPaper =
          bankGsPaper ===
            'all' ||
          item.gs_paper ===
            bankGsPaper;


        const matchesOptionalSubject =
          bankOptionalSubject ===
            'all' ||
          item.optional_subject ===
            bankOptionalSubject;


        return (
          matchesSearch &&
          matchesSection &&
          matchesQuestionType &&
          matchesStatus &&
          matchesDifficulty &&
          matchesGsPaper &&
          matchesOptionalSubject
        );
      }
    );


  function clearBankFilters() {

    setSearchText(
      ''
    );


    setBankSection(
      'all'
    );


    setBankQuestionType(
      'all'
    );


    setBankStatus(
      'all'
    );


    setBankDifficulty(
      'all'
    );


    setBankGsPaper(
      'all'
    );


    setBankOptionalSubject(
      'all'
    );
  }


  /* =========================================================
     UI
     ========================================================= */

  return (

    <section
      style={{
        marginTop:
          '30px'
      }}
    >

      {/* =====================================================
          CREATE / EDIT QUESTION
          ===================================================== */}

      <div
        className="panel admin-form"
      >

        <span
          className="eyebrow"
        >
          MAINS QUESTION MANAGER
        </span>


        <h2>
          {
            editingId
              ? 'Edit Mains Question'
              : 'Create Mains Question'
          }
        </h2>


        <form
          onSubmit={
            saveQuestion
          }
        >

          {/* SECTION / QUESTION TYPE */}

          <div
            className="form-two"
          >

            <label>

              Section


              <select
                value={
                  sectionType
                }

                onChange={
                  event =>
                    setSectionType(
                      event.target.value as
                        SectionType
                    )
                }
              >

                <option
                  value="gs"
                >
                  General Studies
                </option>

                <option
                  value="optional"
                >
                  Optional Subject
                </option>

              </select>

            </label>


            <label>

              Question Type


              <select
                value={
                  questionType
                }

                onChange={
                  event =>
                    setQuestionType(
                      event.target.value as
                        QuestionType
                    )
                }
              >

                <option
                  value="practice"
                >
                  Practice Question
                </option>

                <option
                  value="pyq"
                >
                  Previous Year Question
                </option>

              </select>

            </label>

          </div>


          {/* GS PAPER */}

          {
            sectionType ===
              'gs' && (

            <label>

              GS Paper


              <select
                value={
                  gsPaper
                }

                onChange={
                  event =>
                    setGsPaper(
                      event.target.value
                    )
                }
              >

                <option
                  value="GS-I"
                >
                  GS-I
                </option>

                <option
                  value="GS-II"
                >
                  GS-II
                </option>

                <option
                  value="GS-III"
                >
                  GS-III
                </option>

                <option
                  value="GS-IV"
                >
                  GS-IV
                </option>

              </select>

            </label>

          )}


          {/* OPTIONAL */}

          {
            sectionType ===
              'optional' && (

            <div
              className="form-two"
            >

              <label>

                Optional Subject


                <select
                  value={
                    optionalSubject
                  }

                  onChange={
                    event =>
                      setOptionalSubject(
                        event.target.value
                      )
                  }
                >

                  {
                    optionalSubjects.map(
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
                    )
                  }

                </select>

              </label>


              <label>

                Optional Paper


                <select
                  value={
                    optionalPaper
                  }

                  onChange={
                    event =>
                      setOptionalPaper(
                        event.target.value
                      )
                  }
                >

                  <option
                    value="Paper-I"
                  >
                    Paper-I
                  </option>

                  <option
                    value="Paper-II"
                  >
                    Paper-II
                  </option>

                </select>

              </label>

            </div>

          )}


          {/* PYQ YEAR */}

          {
            questionType ===
              'pyq' && (

            <label>

              Previous Year


              <input
                type="number"

                min="1979"

                max="2100"

                value={
                  pyqYear
                }

                onChange={
                  event =>
                    setPyqYear(
                      event.target.value
                    )
                }

                placeholder="2025"
              />

            </label>

          )}


          {/* QUESTION */}

          <label>

            Question


            <textarea
              rows={
                5
              }

              value={
                question
              }

              onChange={
                event =>
                  setQuestion(
                    event.target.value
                  )
              }

              placeholder="Enter UPSC Mains question"
            />

          </label>


          {/* SUBJECT / TOPIC */}

          <div
            className="form-two"
          >

            <label>

              Subject / Syllabus Area


              <input
                value={
                  subject
                }

                onChange={
                  event =>
                    setSubject(
                      event.target.value
                    )
                }

                placeholder="Indian Society / Governance / Economy..."
              />

            </label>


            <label>

              Topic


              <input
                value={
                  topic
                }

                onChange={
                  event =>
                    setTopic(
                      event.target.value
                    )
                }

                placeholder="Federalism / Agriculture / Ethics..."
              />

            </label>

          </div>


          {/* SYLLABUS */}

          <label>

            UPSC Syllabus Linkage


            <textarea
              rows={
                3
              }

              value={
                syllabusLink
              }

              onChange={
                event =>
                  setSyllabusLink(
                    event.target.value
                  )
              }

              placeholder="Mention the exact syllabus linkage."
            />

          </label>


          {/* DIRECTIVE */}

          <label>

            Directive


            <select
              value={
                directive
              }

              onChange={
                event =>
                  setDirective(
                    event.target.value
                  )
              }
            >

              <option>
                Discuss
              </option>

              <option>
                Examine
              </option>

              <option>
                Analyse
              </option>

              <option>
                Critically Analyse
              </option>

              <option>
                Critically Examine
              </option>

              <option>
                Evaluate
              </option>

              <option>
                Comment
              </option>

              <option>
                Explain
              </option>

              <option>
                Elucidate
              </option>

              <option>
                Justify
              </option>

              <option>
                Assess
              </option>

            </select>

          </label>


          {/* MARKS / WORD LIMIT */}

          <div
            className="form-two"
          >

            <label>

              Marks


              <select
                value={
                  marks
                }

                onChange={
                  event =>
                    setMarks(
                      event.target.value
                    )
                }
              >

                <option
                  value="10"
                >
                  10 Marks
                </option>

                <option
                  value="15"
                >
                  15 Marks
                </option>

                <option
                  value="20"
                >
                  20 Marks
                </option>

              </select>

            </label>


            <label>

              Word Limit


              <select
                value={
                  wordLimit
                }

                onChange={
                  event =>
                    setWordLimit(
                      event.target.value
                    )
                }
              >

                <option
                  value="150"
                >
                  150 Words
                </option>

                <option
                  value="250"
                >
                  250 Words
                </option>

                <option
                  value="300"
                >
                  300 Words
                </option>

                <option
                  value="400"
                >
                  400 Words
                </option>

              </select>

            </label>

          </div>


          {/* ANSWER FRAMEWORK */}

          <label>

            Answer Framework


            <textarea
              rows={
                6
              }

              value={
                answerFramework
              }

              onChange={
                event =>
                  setAnswerFramework(
                    event.target.value
                  )
              }

              placeholder="Suggested structure: Introduction → Main Body → Conclusion"
            />

          </label>


          {/* KEY POINTS */}

          <label>

            Key Points


            <textarea
              rows={
                6
              }

              value={
                keyPoints
              }

              onChange={
                event =>
                  setKeyPoints(
                    event.target.value
                  )
              }

              placeholder="Important arguments, facts, examples, committees, judgments or reports."
            />

          </label>


          {/* INTRODUCTION */}

          <label>

            Introduction Hint


            <textarea
              rows={
                3
              }

              value={
                introductionHint
              }

              onChange={
                event =>
                  setIntroductionHint(
                    event.target.value
                  )
              }

              placeholder="How a strong answer may begin."
            />

          </label>


          {/* CONCLUSION */}

          <label>

            Conclusion Hint


            <textarea
              rows={
                3
              }

              value={
                conclusionHint
              }

              onChange={
                event =>
                  setConclusionHint(
                    event.target.value
                  )
              }

              placeholder="Balanced conclusion or way forward."
            />

          </label>


          {/* =================================================
              FRAMEWORK IMAGES
              ================================================= */}

          <section
            style={{
              marginTop:
                '16px',

              marginBottom:
                '16px',

              padding:
                '14px',

              border:
                '1px solid rgba(255,255,255,.08)',

              borderRadius:
                '14px'
            }}
          >

            <span
              className="eyebrow"
            >
              VISUAL ANSWER FRAMEWORK
            </span>


            <h3
              style={{
                margin:
                  '6px 0'
              }}
            >
              Add Maps, Diagrams, Flowcharts or Graphs
            </h3>


            <p
              style={{
                margin:
                  '4px 0 12px',

                color:
                  '#94a3b8'
              }}
            >
              These visuals can be shown with the suggested answer framework after the student attempts the question.
            </p>


            {/* EXISTING IMAGES */}

            {
              existingFrameworkImagePaths.length >
              0 && (

              <div
                style={{
                  display:
                    'grid',

                  gridTemplateColumns:
                    'repeat(auto-fill, minmax(160px, 1fr))',

                  gap:
                    '10px',

                  marginBottom:
                    '12px'
                }}
              >

                {
                  existingFrameworkImagePaths.map(
                    path => {

                      const url =
                        frameworkImageUrls[
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
                              '160px',

                            overflow:
                              'hidden',

                            borderRadius:
                              '12px',

                            border:
                              '1px solid rgba(255,255,255,.10)',

                            background:
                              '#0f172a'
                          }}
                        >

                          {
                            url
                              ? (

                              <img
                                src={
                                  url
                                }

                                alt="Mains framework"

                                style={{
                                  display:
                                    'block',

                                  width:
                                    '100%',

                                  height:
                                    '170px',

                                  objectFit:
                                    'contain'
                                }}
                              />

                            )
                              : (

                              <div
                                style={{
                                  padding:
                                    '14px'
                                }}
                              >
                                Loading image...
                              </div>

                            )
                          }


                          <button
                            type="button"

                            disabled={
                              saving
                            }

                            aria-label="Remove framework image"

                            onClick={() => {

                              setExistingFrameworkImagePaths(
                                current =>
                                  current.filter(
                                    item =>
                                      item !==
                                      path
                                  )
                              );


                              setRemovedFrameworkImagePaths(
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
                  )
                }

              </div>

            )}


            <StudentNoteImagePicker
              images={
                pendingFrameworkImages
              }

              onChange={
                setPendingFrameworkImages
              }

              maxImages={
                Math.max(
                  0,

                  MAX_FRAMEWORK_IMAGES -
                  existingFrameworkImagePaths.length
                )
              }

              disabled={
                saving
              }
            />


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
              Maximum {MAX_FRAMEWORK_IMAGES} images. JPG, PNG and WebP are supported and automatically compressed.
            </small>

          </section>


          {/* TAGS */}

          <label>

            Tags


            <input
              value={
                tagsText
              }

              onChange={
                event =>
                  setTagsText(
                    event.target.value
                  )
              }

              placeholder="GS-II, Federalism, Constitution"
            />


            <small>
              Separate tags using commas.
            </small>

          </label>


          {/* SOURCE */}

          <div
            className="form-two"
          >

            <label>

              Source


              <input
                value={
                  source
                }

                onChange={
                  event =>
                    setSource(
                      event.target.value
                    )
                }

                placeholder="UPSC / PIB / NCERT / ARC..."
              />

            </label>


            <label>

              Source URL


              <input
                type="url"

                value={
                  sourceUrl
                }

                onChange={
                  event =>
                    setSourceUrl(
                      event.target.value
                    )
                }

                placeholder="https://..."
              />

            </label>

          </div>


          {/* DIFFICULTY / STATUS */}

          <div
            className="form-two"
          >

            <label>

              Difficulty


              <select
                value={
                  difficulty
                }

                onChange={
                  event =>
                    setDifficulty(
                      event.target.value as
                        Difficulty
                    )
                }
              >

                <option
                  value="easy"
                >
                  Easy
                </option>

                <option
                  value="medium"
                >
                  Medium
                </option>

                <option
                  value="hard"
                >
                  Hard
                </option>

              </select>

            </label>


            <label>

              Status


              <select
                value={
                  status
                }

                onChange={
                  event =>
                    setStatus(
                      event.target.value as
                        QuestionStatus
                    )
                }
              >

                <option
                  value="draft"
                >
                  Draft
                </option>

                <option
                  value="published"
                >
                  Published
                </option>

                <option
                  value="archived"
                >
                  Archived
                </option>

              </select>

            </label>

          </div>


          {/* SAVE BUTTONS */}

          <div
            style={{
              display:
                'flex',

              gap:
                '10px',

              flexWrap:
                'wrap',

              marginTop:
                '16px'
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
                  ? 'Save changes'
                  : status ===
                    'published'
                  ? 'Publish question'
                  : 'Save draft'
              }
            </button>


            {
              editingId && (

              <button
                type="button"

                className="secondary-btn"

                disabled={
                  saving
                }

                onClick={() =>
                  resetForm()
                }
              >
                Cancel edit
              </button>

            )}

          </div>


          {
            message && (

            <p
              className="form-message"
            >
              {message}
            </p>

          )}

        </form>

      </div>


      {/* =====================================================
          QUESTION BANK
          ===================================================== */}

      <div
        className="panel admin-form"

        style={{
          marginTop:
            '22px'
        }}
      >

        <div
          style={{
            display:
              'flex',

            justifyContent:
              'space-between',

            alignItems:
              'center',

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
              MAINS QUESTION BANK
            </span>


            <h2>
              Existing Mains Questions
            </h2>

          </div>


          <button
            type="button"

            className="secondary-btn"

            onClick={() =>
              void loadQuestions()
            }
          >
            Refresh questions
          </button>

        </div>


        {/* SEARCH */}

        <div
          style={{
            marginTop:
              '20px'
          }}
        >

          <label>

            Search Mains Question Bank


            <input
              type="search"

              value={
                searchText
              }

              onChange={
                event =>
                  setSearchText(
                    event.target.value
                  )
              }

              placeholder="Search question, subject, topic or source..."
            />

          </label>

        </div>


        {/* SECTION / QUESTION TYPE */}

        <div
          className="form-two"
        >

          <label>

            Section


            <select
              value={
                bankSection
              }

              onChange={
                event => {

                  const next =
                    event.target.value as
                      | 'all'
                      | SectionType;


                  setBankSection(
                    next
                  );


                  if (
                    next !==
                    'gs'
                  ) {

                    setBankGsPaper(
                      'all'
                    );

                  }


                  if (
                    next !==
                    'optional'
                  ) {

                    setBankOptionalSubject(
                      'all'
                    );

                  }
                }
              }
            >

              <option
                value="all"
              >
                All Sections
              </option>

              <option
                value="gs"
              >
                General Studies
              </option>

              <option
                value="optional"
              >
                Optional Subjects
              </option>

            </select>

          </label>


          <label>

            Question Type


            <select
              value={
                bankQuestionType
              }

              onChange={
                event =>
                  setBankQuestionType(
                    event.target.value as
                      | 'all'
                      | QuestionType
                  )
              }
            >

              <option
                value="all"
              >
                All Questions
              </option>

              <option
                value="practice"
              >
                Practice Questions
              </option>

              <option
                value="pyq"
              >
                Previous Year Questions
              </option>

            </select>

          </label>

        </div>


        {/* GS FILTER */}

        {
          bankSection ===
            'gs' && (

          <label>

            GS Paper


            <select
              value={
                bankGsPaper
              }

              onChange={
                event =>
                  setBankGsPaper(
                    event.target.value
                  )
              }
            >

              <option
                value="all"
              >
                All GS Papers
              </option>

              <option
                value="GS-I"
              >
                GS-I
              </option>

              <option
                value="GS-II"
              >
                GS-II
              </option>

              <option
                value="GS-III"
              >
                GS-III
              </option>

              <option
                value="GS-IV"
              >
                GS-IV
              </option>

            </select>

          </label>

        )}


        {/* OPTIONAL FILTER */}

        {
          bankSection ===
            'optional' && (

          <label>

            Optional Subject


            <select
              value={
                bankOptionalSubject
              }

              onChange={
                event =>
                  setBankOptionalSubject(
                    event.target.value
                  )
              }
            >

              <option
                value="all"
              >
                All Optional Subjects
              </option>


              {
                optionalSubjects.map(
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
                )
              }

            </select>

          </label>

        )}


        {/* DIFFICULTY / STATUS */}

        <div
          className="form-two"
        >

          <label>

            Difficulty


            <select
              value={
                bankDifficulty
              }

              onChange={
                event =>
                  setBankDifficulty(
                    event.target.value as
                      | 'all'
                      | Difficulty
                  )
              }
            >

              <option
                value="all"
              >
                All Difficulty
              </option>

              <option
                value="easy"
              >
                Easy
              </option>

              <option
                value="medium"
              >
                Medium
              </option>

              <option
                value="hard"
              >
                Hard
              </option>

            </select>

          </label>


          <label>

            Status


            <select
              value={
                bankStatus
              }

              onChange={
                event =>
                  setBankStatus(
                    event.target.value as
                      | 'all'
                      | QuestionStatus
                  )
              }
            >

              <option
                value="all"
              >
                All Status
              </option>

              <option
                value="draft"
              >
                Draft
              </option>

              <option
                value="published"
              >
                Published
              </option>

              <option
                value="archived"
              >
                Archived
              </option>

            </select>

          </label>

        </div>


        {/* COUNT */}

        <div
          style={{
            display:
              'flex',

            justifyContent:
              'space-between',

            alignItems:
              'center',

            gap:
              '12px',

            flexWrap:
              'wrap',

            marginTop:
              '12px',

            marginBottom:
              '18px'
          }}
        >

          <p>

            Showing{' '}

            <strong>
              {
                filteredQuestions.length
              }
            </strong>

            {' '}of{' '}

            <strong>
              {
                questions.length
              }
            </strong>

            {' '}questions

          </p>


          <button
            type="button"

            className="secondary-btn"

            onClick={
              clearBankFilters
            }
          >
            Clear Filters
          </button>

        </div>


        {
          !loading &&
          questions.length >
            0 &&
          filteredQuestions.length ===
            0 && (

          <div
            className="callout"
          >

            <strong>
              No questions match these filters.
            </strong>


            <p>
              Try another search or clear the filters.
            </p>

          </div>

        )}


        {
          loading && (

          <p>
            Loading Mains questions...
          </p>

        )}


        {
          !loading &&
          questions.length ===
            0 && (

          <p>
            No Mains questions created yet.
          </p>

        )}


        {/* QUESTION CARDS */}

        <div
          style={{
            display:
              'grid',

            gap:
              '14px',

            marginTop:
              '18px'
          }}
        >

          {
            filteredQuestions.map(
              item => (

              <article
                key={
                  item.id
                }

                style={{
                  border:
                    '1px solid rgba(255,255,255,.10)',

                  borderRadius:
                    '14px',

                  padding:
                    '18px'
                }}
              >

                <div
                  style={{
                    display:
                      'flex',

                    justifyContent:
                      'space-between',

                    gap:
                      '18px',

                    flexWrap:
                      'wrap'
                  }}
                >

                  <div
                    style={{
                      flex:
                        '1 1 500px'
                    }}
                  >

                    <span
                      className="eyebrow"
                    >
                      {
                        item.section_type ===
                          'gs'
                          ? item.gs_paper
                          : `${item.optional_subject} • ${item.optional_paper}`
                      }
                    </span>


                    <h3>
                      {item.question}
                    </h3>


                    <p>
                      {
                        item.question_type ===
                          'pyq'
                          ? `PYQ ${item.pyq_year || ''}`
                          : 'Practice Question'
                      }
                    </p>


                    <p>

                      {
                        item.marks
                          ? `${item.marks} marks`
                          : ''
                      }


                      {
                        item.word_limit
                          ? ` • ${item.word_limit} words`
                          : ''
                      }

                    </p>


                    {
                      item.framework_image_paths.length >
                      0 && (

                      <p>
                        Visual framework:{' '}
                        <strong>
                          {
                            item.framework_image_paths.length
                          } image
                          {
                            item.framework_image_paths.length ===
                              1
                              ? ''
                              : 's'
                          }
                        </strong>
                      </p>

                    )}


                    <p>

                      Status:{' '}

                      <strong>
                        {item.status}
                      </strong>

                    </p>

                  </div>


                  <div
                    style={{
                      display:
                        'flex',

                      gap:
                        '8px',

                      flexWrap:
                        'wrap',

                      alignItems:
                        'flex-start'
                    }}
                  >

                    <button
                      type="button"

                      onClick={() =>
                        void startEdit(
                          item
                        )
                      }
                    >
                      Edit
                    </button>


                    {
                      item.status !==
                        'published' && (

                      <button
                        type="button"

                        onClick={() =>
                          void changeStatus(
                            item,
                            'published'
                          )
                        }
                      >
                        Publish
                      </button>

                    )}


                    {
                      item.status !==
                        'draft' && (

                      <button
                        type="button"

                        onClick={() =>
                          void changeStatus(
                            item,
                            'draft'
                          )
                        }
                      >
                        Draft
                      </button>

                    )}


                    {
                      item.status !==
                        'archived' && (

                      <button
                        type="button"

                        onClick={() =>
                          void changeStatus(
                            item,
                            'archived'
                          )
                        }
                      >
                        Archive
                      </button>

                    )}


                    <button
                      type="button"

                      onClick={() =>
                        void deleteQuestion(
                          item
                        )
                      }
                    >
                      Delete
                    </button>

                  </div>

                </div>

              </article>

            )
          )}

        </div>

      </div>

    </section>
  );
}


export default MainsQuestionManager;

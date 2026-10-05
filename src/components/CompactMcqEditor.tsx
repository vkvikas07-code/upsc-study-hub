import {
  useEffect,
  useState,
  type CSSProperties,
  type FormEvent
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
  MathText
} from './MathText';

import {
  createPrelimsExplanationImageUrls,
  removePrelimsExplanationImages,
  uploadPrelimsExplanationImages
} from '../lib/prelimsImages';


type Difficulty =
  | 'easy'
  | 'medium'
  | 'hard';


type QuestionStatus =
  | 'draft'
  | 'published'
  | 'archived';


type QuestionOrigin =
  | 'general'
  | 'upsc'
  | 'state_psc';


type RecentQuestion = {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  explanation_image_paths: string[];
  subject: string;
  topic: string | null;
  paper: string | null;
  difficulty: Difficulty;
  tags: string[];
  is_pyq: boolean;
  pyq_year: number | null;
  status: QuestionStatus;
  source: string | null;
  source_url: string | null;

  upsc_exam_name: string | null;
  upsc_exam_cycle: string | null;
  upsc_exam_stage: string | null;
  upsc_exam_paper: string | null;
  upsc_exam_year: number | null;

  state_psc_state: string | null;
  state_psc_name: string | null;
  state_psc_exam_name: string | null;
  state_psc_year: number | null;
  state_psc_stage: string | null;
  state_psc_paper: string | null;
};


const QUESTION_SELECT = `
  id,
  question,
  options,
  correct_index,
  explanation,
  explanation_image_paths,
  subject,
  topic,
  paper,
  difficulty,
  tags,
  is_pyq,
  pyq_year,
  status,
  source,
  source_url,
  upsc_exam_name,
  upsc_exam_cycle,
  upsc_exam_stage,
  upsc_exam_paper,
  upsc_exam_year,
  state_psc_state,
  state_psc_name,
  state_psc_exam_name,
  state_psc_year,
  state_psc_stage,
  state_psc_paper
`;


const MAX_EXPLANATION_IMAGES =
  6;


const SUBJECTS = [
  'Polity',
  'History',
  'Geography',
  'Economy',
  'Environment',
  'Science & Tech',
  'Current Affairs',
  'Disaster Management',
  'Agriculture',
  'International Relations',
  'Defence',
  'CSAT'
];


function safeArray(
  value: unknown
): string[] {

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


function normalizeQuestionText(
  value: string
): string {

  return value
    .normalize(
      'NFKC'
    )
    .toLowerCase()
    .replace(
      /[“”]/g,
      '"'
    )
    .replace(
      /[‘’]/g,
      "'"
    )
    .replace(
      /[.,!?;:()[\]{}"'“”‘’\-–—_/\\]+/g,
      ' '
    )
    .replace(
      /\s+/g,
      ' '
    )
    .trim();
}


export function CompactMcqEditor() {

  const [
    recentQuestions,
    setRecentQuestions
  ] =
    useState<
      RecentQuestion[]
    >([]);


  const [
    editingId,
    setEditingId
  ] =
    useState('');


  const [
    question,
    setQuestion
  ] =
    useState('');


  const [
    optionA,
    setOptionA
  ] =
    useState('');


  const [
    optionB,
    setOptionB
  ] =
    useState('');


  const [
    optionC,
    setOptionC
  ] =
    useState('');


  const [
    optionD,
    setOptionD
  ] =
    useState('');


  const [
    correctIndex,
    setCorrectIndex
  ] =
    useState(0);


  const [
    explanation,
    setExplanation
  ] =
    useState('');


  const [
    subject,
    setSubject
  ] =
    useState(
      'Polity'
    );


  const [
    topic,
    setTopic
  ] =
    useState('');


  const [
    paper,
    setPaper
  ] =
    useState(
      'GS-I'
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
      'published'
    );


  const [
    tagsText,
    setTagsText
  ] =
    useState('');


  const [
    isPyq,
    setIsPyq
  ] =
    useState(
      false
    );


  const [
    pyqYear,
    setPyqYear
  ] =
    useState('');


  const [
    questionOrigin,
    setQuestionOrigin
  ] =
    useState<
      QuestionOrigin
    >(
      'general'
    );


  const [
    source,
    setSource
  ] =
    useState('');


  const [
    sourceUrl,
    setSourceUrl
  ] =
    useState('');


  const [
    upscExamName,
    setUpscExamName
  ] =
    useState('');


  const [
    upscExamCycle,
    setUpscExamCycle
  ] =
    useState('');


  const [
    upscExamStage,
    setUpscExamStage
  ] =
    useState('');


  const [
    upscExamPaper,
    setUpscExamPaper
  ] =
    useState('');


  const [
    upscExamYear,
    setUpscExamYear
  ] =
    useState('');


  const [
    statePscState,
    setStatePscState
  ] =
    useState('');


  const [
    statePscName,
    setStatePscName
  ] =
    useState('');


  const [
    statePscExamName,
    setStatePscExamName
  ] =
    useState('');


  const [
    statePscYear,
    setStatePscYear
  ] =
    useState('');


  const [
    statePscStage,
    setStatePscStage
  ] =
    useState('');


  const [
    statePscPaper,
    setStatePscPaper
  ] =
    useState('');


  const [
    pendingExplanationImages,
    setPendingExplanationImages
  ] =
    useState<
      PendingNoteImage[]
    >([]);


  const [
    existingExplanationImagePaths,
    setExistingExplanationImagePaths
  ] =
    useState<
      string[]
    >([]);


  const [
    removedExplanationImagePaths,
    setRemovedExplanationImagePaths
  ] =
    useState<
      string[]
    >([]);


  const [
    explanationImageUrls,
    setExplanationImageUrls
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});


  const [
    advancedOpen,
    setAdvancedOpen
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
    message,
    setMessage
  ] =
    useState('');


  const compactGrid:
    CSSProperties = {

    display:
      'grid',

    gridTemplateColumns:
      'repeat(auto-fit, minmax(180px, 1fr))',

    gap:
      '10px'
  };


  const previewBoxStyle:
    CSSProperties = {

    marginTop:
      '6px',

    padding:
      '9px 10px',

    minHeight:
      '36px',

    border:
      '1px solid rgba(255,255,255,.08)',

    borderRadius:
      '9px',

    background:
      'rgba(15,23,42,.35)',

    overflowX:
      'auto'
  };


  function clearPendingImagePreviews():
    void {

    pendingExplanationImages.forEach(
      image => {

        URL.revokeObjectURL(
          image.previewUrl
        );

      }
    );


    setPendingExplanationImages(
      []
    );
  }


  async function loadRecentQuestions():
    Promise<void> {

    if (
      !supabase
    ) {
      return;
    }


    const {
      data,
      error
    } =
      await supabase
        .from(
          'questions'
        )
        .select(
          QUESTION_SELECT
        )
        .eq(
          'exam_stage',
          'prelims'
        )
        .order(
          'created_at',
          {
            ascending:
              false
          }
        )
        .limit(
          50
        );


    if (
      error
    ) {

      console.error(
        'Unable to load questions:',
        error
      );


      setMessage(
        error.message
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

          options:
            safeArray(
              item.options
            ),

          tags:
            safeArray(
              item.tags
            ),

          explanation_image_paths:
            safeArray(
              item.explanation_image_paths
            )

        })
      ) as
        RecentQuestion[];


    setRecentQuestions(
      loaded
    );
  }


  useEffect(
    () => {

      void loadRecentQuestions();

    },
    []
  );


  function resetForm(
    keepMessage =
      false
  ):
    void {

    clearPendingImagePreviews();

    setEditingId('');

    setQuestion('');

    setOptionA('');
    setOptionB('');
    setOptionC('');
    setOptionD('');

    setCorrectIndex(
      0
    );

    setExplanation('');

    setSubject(
      'Polity'
    );

    setTopic('');

    setPaper(
      'GS-I'
    );

    setDifficulty(
      'medium'
    );

    setStatus(
      'published'
    );

    setTagsText('');

    setIsPyq(
      false
    );

    setPyqYear('');

    setQuestionOrigin(
      'general'
    );

    setSource('');

    setSourceUrl('');

    setUpscExamName('');
    setUpscExamCycle('');
    setUpscExamStage('');
    setUpscExamPaper('');
    setUpscExamYear('');

    setStatePscState('');
    setStatePscName('');
    setStatePscExamName('');
    setStatePscYear('');
    setStatePscStage('');
    setStatePscPaper('');

    setExistingExplanationImagePaths(
      []
    );

    setRemovedExplanationImagePaths(
      []
    );

    setExplanationImageUrls(
      {}
    );

    setAdvancedOpen(
      false
    );


    if (
      !keepMessage
    ) {

      setMessage(
        ''
      );
    }
  }


  async function loadForEditing(
    id: string
  ):
    Promise<void> {

    setEditingId(
      id
    );


    if (
      !id
    ) {

      resetForm();

      return;
    }


    const item =
      recentQuestions.find(
        row =>
          row.id ===
          id
      );


    if (
      !item
    ) {
      return;
    }


    clearPendingImagePreviews();


    const options =
      item.options ||
      [];


    setQuestion(
      item.question ||
      ''
    );


    setOptionA(
      options[0] ||
      ''
    );


    setOptionB(
      options[1] ||
      ''
    );


    setOptionC(
      options[2] ||
      ''
    );


    setOptionD(
      options[3] ||
      ''
    );


    setCorrectIndex(
      Number(
        item.correct_index ||
        0
      )
    );


    setExplanation(
      item.explanation ||
      ''
    );


    setSubject(
      item.subject ||
      'Polity'
    );


    setTopic(
      item.topic ||
      ''
    );


    setPaper(
      item.paper ||
      'GS-I'
    );


    setDifficulty(
      item.difficulty ||
      'medium'
    );


    setStatus(
      item.status ||
      'draft'
    );


    setTagsText(
      (
        item.tags ||
        []
      ).join(
        ', '
      )
    );


    setIsPyq(
      Boolean(
        item.is_pyq
      )
    );


    setPyqYear(
      item.pyq_year
        ? String(
            item.pyq_year
          )
        : ''
    );


    setSource(
      item.source ||
      ''
    );


    setSourceUrl(
      item.source_url ||
      ''
    );


    if (
      item.state_psc_state ||
      item.state_psc_name ||
      item.state_psc_exam_name
    ) {

      setQuestionOrigin(
        'state_psc'
      );

    } else if (
      item.upsc_exam_name
    ) {

      setQuestionOrigin(
        'upsc'
      );

    } else {

      setQuestionOrigin(
        'general'
      );
    }


    setUpscExamName(
      item.upsc_exam_name ||
      ''
    );


    setUpscExamCycle(
      item.upsc_exam_cycle ||
      ''
    );


    setUpscExamStage(
      item.upsc_exam_stage ||
      ''
    );


    setUpscExamPaper(
      item.upsc_exam_paper ||
      ''
    );


    setUpscExamYear(
      item.upsc_exam_year
        ? String(
            item.upsc_exam_year
          )
        : ''
    );


    setStatePscState(
      item.state_psc_state ||
      ''
    );


    setStatePscName(
      item.state_psc_name ||
      ''
    );


    setStatePscExamName(
      item.state_psc_exam_name ||
      ''
    );


    setStatePscYear(
      item.state_psc_year
        ? String(
            item.state_psc_year
          )
        : ''
    );


    setStatePscStage(
      item.state_psc_stage ||
      ''
    );


    setStatePscPaper(
      item.state_psc_paper ||
      ''
    );


    const imagePaths =
      safeArray(
        item.explanation_image_paths
      );


    setExistingExplanationImagePaths(
      imagePaths
    );


    setRemovedExplanationImagePaths(
      []
    );


    if (
      imagePaths.length >
      0
    ) {

      try {

        const urls =
          await createPrelimsExplanationImageUrls(
            imagePaths
          );


        setExplanationImageUrls(
          urls
        );

      } catch (
        error
      ) {

        console.error(
          'Unable to load image previews:',
          error
        );


        setExplanationImageUrls(
          {}
        );
      }

    } else {

      setExplanationImageUrls(
        {}
      );
    }


    setAdvancedOpen(
      true
    );


    setMessage(
      'Question loaded for editing.'
    );
  }


  async function checkDuplicate():
    Promise<
      boolean
    > {

    if (
      !supabase
    ) {
      return false;
    }


    const normalizedCurrent =
      normalizeQuestionText(
        question
      );


    const {
      data,
      error
    } =
      await supabase
        .from(
          'questions'
        )
        .select(
          'id, question'
        )
        .eq(
          'exam_stage',
          'prelims'
        )
        .limit(
          10000
        );


    if (
      error
    ) {

      throw new Error(
        `Unable to check duplicate questions: ${error.message}`
      );
    }


    return (
      data ||
      []
    ).some(
      item => {

        if (
          editingId &&
          item.id ===
            editingId
        ) {

          return false;
        }


        return (
          normalizeQuestionText(
            item.question ||
            ''
          ) ===
          normalizedCurrent
        );
      }
    );
  }


  async function saveQuestion(
    event:
      FormEvent
  ):
    Promise<void> {

    event.preventDefault();


    if (
      !supabase
    ) {

      setMessage(
        'Supabase is not configured.'
      );

      return;
    }


    const options = [
      optionA.trim(),
      optionB.trim(),
      optionC.trim(),
      optionD.trim()
    ];


    if (
      !question.trim()
    ) {

      setMessage(
        'Enter the question.'
      );

      return;
    }


    if (
      options.some(
        option =>
          !option
      )
    ) {

      setMessage(
        'All four options are required.'
      );

      return;
    }


    if (
      !explanation.trim()
    ) {

      setMessage(
        'Add an explanation.'
      );

      return;
    }


    if (
      !subject.trim()
    ) {

      setMessage(
        'Select the subject.'
      );

      return;
    }


    if (
      existingExplanationImagePaths.length +
      pendingExplanationImages.length >
      MAX_EXPLANATION_IMAGES
    ) {

      setMessage(
        `Maximum ${MAX_EXPLANATION_IMAGES} explanation images are allowed.`
      );

      return;
    }


    if (
      isPyq &&
      !pyqYear.trim()
    ) {

      setMessage(
        'Enter the PYQ year.'
      );

      return;
    }


    setSaving(
      true
    );


    try {

      setMessage(
        'Checking for duplicate question...'
      );


      const duplicate =
        await checkDuplicate();


      if (
        duplicate
      ) {

        setMessage(
          '⚠️ DUPLICATE BLOCKED: This question already exists in the Prelims question bank.'
        );


        return;
      }


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
            value =>
              value.trim()
          )
          .filter(
            Boolean
          );


      const payload = {

        question:
          question.trim(),

        options,

        correct_index:
          correctIndex,

        explanation:
          explanation.trim(),

        subject:
          subject.trim(),

        topic:
          topic.trim() ||
          null,

        paper:
          paper.trim() ||
          null,

        difficulty,

        tags,

        exam_stage:
          'prelims',

        is_pyq:
          isPyq,

        pyq_year:
          isPyq &&
          pyqYear.trim()
            ? Number(
                pyqYear
              )
            : null,

        status,

        source:
          source.trim() ||
          null,

        source_url:
          sourceUrl.trim() ||
          null,

        upsc_exam_name:
          questionOrigin ===
            'upsc'
            ? upscExamName.trim() ||
              null
            : null,

        upsc_exam_cycle:
          questionOrigin ===
            'upsc'
            ? upscExamCycle.trim() ||
              null
            : null,

        upsc_exam_stage:
          questionOrigin ===
            'upsc'
            ? upscExamStage.trim() ||
              null
            : null,

        upsc_exam_paper:
          questionOrigin ===
            'upsc'
            ? upscExamPaper.trim() ||
              null
            : null,

        upsc_exam_year:
          questionOrigin ===
            'upsc' &&
          upscExamYear.trim()
            ? Number(
                upscExamYear
              )
            : null,

        state_psc_state:
          questionOrigin ===
            'state_psc'
            ? statePscState.trim() ||
              null
            : null,

        state_psc_name:
          questionOrigin ===
            'state_psc'
            ? statePscName.trim() ||
              null
            : null,

        state_psc_exam_name:
          questionOrigin ===
            'state_psc'
            ? statePscExamName.trim() ||
              null
            : null,

        state_psc_year:
          questionOrigin ===
            'state_psc' &&
          statePscYear.trim()
            ? Number(
                statePscYear
              )
            : null,

        state_psc_stage:
          questionOrigin ===
            'state_psc'
            ? statePscStage.trim() ||
              null
            : null,

        state_psc_paper:
          questionOrigin ===
            'state_psc'
            ? statePscPaper.trim() ||
              null
            : null,

        updated_at:
          new Date()
            .toISOString()
      };


      /* ===============================================
         UPDATE
         =============================================== */

      if (
        editingId
      ) {

        let uploadedPaths:
          string[] =
          [];


        try {

          if (
            pendingExplanationImages.length >
            0
          ) {

            uploadedPaths =
              await uploadPrelimsExplanationImages({
                questionId:
                  editingId,

                files:
                  pendingExplanationImages.map(
                    image =>
                      image.file
                  )
              });
          }


          const finalPaths = [
            ...existingExplanationImagePaths,
            ...uploadedPaths
          ];


          const {
            error
          } =
            await supabase
              .from(
                'questions'
              )
              .update({
                ...payload,

                explanation_image_paths:
                  finalPaths
              })
              .eq(
                'id',
                editingId
              );


          if (
            error
          ) {

            if (
              uploadedPaths.length >
              0
            ) {

              await removePrelimsExplanationImages(
                uploadedPaths
              );
            }


            throw error;
          }


          if (
            removedExplanationImagePaths.length >
            0
          ) {

            try {

              await removePrelimsExplanationImages(
                removedExplanationImagePaths
              );

            } catch (
              cleanupError
            ) {

              console.error(
                cleanupError
              );
            }
          }


          await loadRecentQuestions();


          resetForm(
            true
          );


          setMessage(
            'Question updated successfully.'
          );


          return;

        } catch (
          error
        ) {

          throw error;
        }
      }


      /* ===============================================
         CREATE
         =============================================== */

      const {
        data:
          created,

        error:
          insertError
      } =
        await supabase
          .from(
            'questions'
          )
          .insert({
            ...payload,

            explanation_image_paths:
              [],

            created_by:
              user.id
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
            'Unable to create question.'
          )
        );
      }


      let uploadedPaths:
        string[] =
        [];


      try {

        if (
          pendingExplanationImages.length >
          0
        ) {

          uploadedPaths =
            await uploadPrelimsExplanationImages({
              questionId:
                created.id,

              files:
                pendingExplanationImages.map(
                  image =>
                    image.file
                )
            });


          const {
            error:
              imageUpdateError
          } =
            await supabase
              .from(
                'questions'
              )
              .update({
                explanation_image_paths:
                  uploadedPaths
              })
              .eq(
                'id',
                created.id
              );


          if (
            imageUpdateError
          ) {

            throw imageUpdateError;
          }
        }


        await loadRecentQuestions();


        resetForm(
          true
        );


        setMessage(
          'Question saved successfully.'
        );

      } catch (
        error
      ) {

        if (
          uploadedPaths.length >
          0
        ) {

          try {

            await removePrelimsExplanationImages(
              uploadedPaths
            );

          } catch (
            cleanupError
          ) {

            console.error(
              cleanupError
            );
          }
        }


        await supabase
          .from(
            'questions'
          )
          .delete()
          .eq(
            'id',
            created.id
          );


        throw error;
      }

    } catch (
      error
    ) {

      console.error(
        'Unable to save MCQ:',
        error
      );


      setMessage(
        error instanceof
          Error
          ? error.message
          : 'Unable to save question.'
      );

    } finally {

      setSaving(
        false
      );
    }
  }


  return (

    <section
      className="panel"
      style={{
        padding:
          '16px'
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
            MCQ EDITOR
          </span>


          <h2
            style={{
              margin:
                '5px 0'
            }}
          >
            {
              editingId
                ? 'Edit MCQ'
                : 'Add MCQ'
            }
          </h2>


          <small
            style={{
              color:
                '#94a3b8'
            }}
          >
            Add question, answer, explanation and optional visual explanation. Mathematical questions show a live student preview.
          </small>

        </div>


        <button
          type="button"
          className="secondary-btn"
          onClick={() =>
            resetForm()
          }
        >
          New Question
        </button>

      </div>


      {/* EDIT EXISTING */}

      <label
        style={{
          marginTop:
            '12px'
        }}
      >

        Edit Recent Question

        <select
          value={
            editingId
          }
          onChange={
            event =>
              void loadForEditing(
                event.target.value
              )
          }
        >

          <option value="">
            Create new question
          </option>


          {
            recentQuestions.map(
              item => (

                <option
                  key={
                    item.id
                  }
                  value={
                    item.id
                  }
                >
                  {
                    item.question.length >
                    90
                      ? `${item.question.slice(
                          0,
                          90
                        )}...`
                      : item.question
                  }
                </option>

              )
            )
          }

        </select>

      </label>


      <form
        onSubmit={
          saveQuestion
        }
      >

        {/* QUESTION INPUT */}

        <label>

          Question

          <textarea
            rows={
              4
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
            placeholder="Enter question. For mathematics use $...$ around the equation."
          />

        </label>


        {/* QUESTION PREVIEW */}

        {
          question.trim() && (

          <section
            style={{
              marginTop:
                '8px',

              marginBottom:
                '14px',

              padding:
                '14px',

              border:
                '1px solid rgba(45,212,191,.25)',

              borderRadius:
                '12px',

              background:
                'rgba(15,23,42,.45)'
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
                  '8px',

                flexWrap:
                  'wrap',

                marginBottom:
                  '10px'
              }}
            >

              <strong>
                Actual Question Preview
              </strong>


              <span
                className="tag"
              >
                Student View
              </span>

            </div>


            <div
              style={{
                fontSize:
                  '18px',

                lineHeight:
                  1.7,

                overflowX:
                  'auto'
              }}
            >

              <MathText
                text={
                  question
                }
              />

            </div>

          </section>

        )}


        {/* OPTIONS */}

        <div
          style={
            compactGrid
          }
        >

          <label>

            Option A

            <input
              value={
                optionA
              }
              onChange={
                event =>
                  setOptionA(
                    event.target.value
                  )
              }
              placeholder={
                'Example: $\\frac{p}{s}$'
              }
            />


            {
              optionA.trim() && (

              <div
                style={
                  previewBoxStyle
                }
              >

                <MathText
                  text={
                    optionA
                  }
                />

              </div>

              )
            }

          </label>


          <label>

            Option B

            <input
              value={
                optionB
              }
              onChange={
                event =>
                  setOptionB(
                    event.target.value
                  )
              }
              placeholder={
                'Example: $\\frac{r}{q}$'
              }
            />


            {
              optionB.trim() && (

              <div
                style={
                  previewBoxStyle
                }
              >

                <MathText
                  text={
                    optionB
                  }
                />

              </div>

              )
            }

          </label>


          <label>

            Option C

            <input
              value={
                optionC
              }
              onChange={
                event =>
                  setOptionC(
                    event.target.value
                  )
              }
              placeholder={
                'Example: $\\frac{s}{p}$'
              }
            />


            {
              optionC.trim() && (

              <div
                style={
                  previewBoxStyle
                }
              >

                <MathText
                  text={
                    optionC
                  }
                />

              </div>

              )
            }

          </label>


          <label>

            Option D

            <input
              value={
                optionD
              }
              onChange={
                event =>
                  setOptionD(
                    event.target.value
                  )
              }
              placeholder={
                'Example: $\\frac{q}{r}$'
              }
            />


            {
              optionD.trim() && (

              <div
                style={
                  previewBoxStyle
                }
              >

                <MathText
                  text={
                    optionD
                  }
                />

              </div>

              )
            }

          </label>

        </div>


        {/* BASIC DETAILS */}

        <div
          style={{
            ...compactGrid,

            marginTop:
              '10px'
          }}
        >

          <label>

            Correct Answer

            <select
              value={
                correctIndex
              }
              onChange={
                event =>
                  setCorrectIndex(
                    Number(
                      event.target.value
                    )
                  )
              }
            >

              <option value={0}>
                A
              </option>

              <option value={1}>
                B
              </option>

              <option value={2}>
                C
              </option>

              <option value={3}>
                D
              </option>

            </select>

          </label>


          <label>

            Subject

            <select
              value={
                subject
              }
              onChange={
                event => {

                  const nextSubject =
                    event.target.value;


                  setSubject(
                    nextSubject
                  );


                  if (
                    nextSubject ===
                    'CSAT'
                  ) {

                    setPaper(
                      'CSAT Paper II'
                    );
                  }
                }
              }
            >

              {
                SUBJECTS.map(
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
              placeholder={
                subject ===
                  'CSAT'
                  ? 'Ratio & Proportion'
                  : 'Fundamental Rights'
              }
            />

          </label>


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

              <option value="easy">
                Easy
              </option>

              <option value="medium">
                Medium
              </option>

              <option value="hard">
                Hard
              </option>

            </select>

          </label>

        </div>


        {/* EXPLANATION */}

        <label>

          Explanation

          <textarea
            rows={
              4
            }
            value={
              explanation
            }
            onChange={
              event =>
                setExplanation(
                  event.target.value
                )
            }
            placeholder="Explain why the correct answer is correct."
          />

        </label>


        {
          explanation.trim() && (

          <section
            style={{
              marginTop:
                '8px',

              marginBottom:
                '12px',

              padding:
                '12px',

              border:
                '1px solid rgba(255,255,255,.08)',

              borderRadius:
                '10px',

              background:
                'rgba(15,23,42,.35)'
            }}
          >

            <small
              style={{
                display:
                  'block',

                marginBottom:
                  '7px',

                color:
                  '#94a3b8'
              }}
            >
              Explanation Preview
            </small>


            <MathText
              text={
                explanation
              }
            />

          </section>

        )}


        {/* VISUAL EXPLANATION */}

        <section
          style={{
            marginTop:
              '14px',

            marginBottom:
              '14px'
          }}
        >

          <span
            className="eyebrow"
          >
            VISUAL EXPLANATION
          </span>


          <h3
            style={{
              margin:
                '5px 0'
            }}
          >
            Explanation Images
          </h3>


          {
            existingExplanationImagePaths.length >
            0 && (

            <div
              style={{
                display:
                  'grid',

                gridTemplateColumns:
                  'repeat(auto-fill, minmax(150px, 1fr))',

                gap:
                  '10px',

                marginBottom:
                  '12px'
              }}
            >

              {
                existingExplanationImagePaths.map(
                  path => {

                    const url =
                      explanationImageUrls[
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
                            'hidden'
                        }}
                      >

                        {
                          url
                            ? (

                            <img
                              src={
                                url
                              }
                              alt="Explanation"
                              style={{
                                width:
                                  '100%',

                                height:
                                  '160px',

                                objectFit:
                                  'contain',

                                display:
                                  'block'
                              }}
                            />

                          )
                            : (

                            <div
                              style={{
                                padding:
                                  '12px'
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
                          onClick={() => {

                            setExistingExplanationImagePaths(
                              current =>
                                current.filter(
                                  item =>
                                    item !==
                                    path
                                )
                            );


                            setRemovedExplanationImagePaths(
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
                              '6px',

                            right:
                              '6px'
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
              pendingExplanationImages
            }
            onChange={
              setPendingExplanationImages
            }
            maxImages={
              Math.max(
                0,

                MAX_EXPLANATION_IMAGES -
                existingExplanationImagePaths.length
              )
            }
            disabled={
              saving
            }
          />

        </section>


        {/* PYQ DETAILS */}

        <div
          style={
            compactGrid
          }
        >

          <label>

            Question Type

            <select
              value={
                isPyq
                  ? 'pyq'
                  : 'practice'
              }
              onChange={
                event =>
                  setIsPyq(
                    event.target.value ===
                    'pyq'
                  )
              }
            >

              <option value="practice">
                Practice MCQ
              </option>

              <option value="pyq">
                Previous Year Question
              </option>

            </select>

          </label>


          {
            isPyq && (

            <label>

              PYQ Year

              <input
                type="number"
                min="1950"
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


          <label>

            Paper

            <input
              value={
                paper
              }
              onChange={
                event =>
                  setPaper(
                    event.target.value
                  )
              }
              placeholder="GS-I / CSAT Paper II"
            />

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

              <option value="published">
                Published
              </option>

              <option value="draft">
                Draft
              </option>

              <option value="archived">
                Archived
              </option>

            </select>

          </label>

        </div>


        {/* ADVANCED */}

        <button
          type="button"
          className="secondary-btn"
          style={{
            marginTop:
              '12px'
          }}
          onClick={() =>
            setAdvancedOpen(
              current =>
                !current
            )
          }
        >

          {
            advancedOpen
              ? 'Hide Extra Details'
              : 'More Details'
          }

        </button>


        {
          advancedOpen && (

          <section
            style={{
              marginTop:
                '10px',

              padding:
                '12px',

              border:
                '1px solid rgba(255,255,255,.08)',

              borderRadius:
                '12px'
            }}
          >

           <div
  style={
    compactGrid
  }
>

  <label>

    Origin

    <select
      value={
        questionOrigin
      }
      onChange={
        event =>
          setQuestionOrigin(
            event.target.value as
              QuestionOrigin
          )
      }
    >

      <option value="general">
        CSE / General
      </option>

      <option value="upsc">
        Other UPSC
      </option>

      <option value="state_psc">
        State PSC
      </option>

    </select>

  </label>


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
      placeholder="UPSC Official Paper"
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
      placeholder="CSAT, Mathematics, Ratio"
    />

  </label>

</div>


            {
              questionOrigin ===
                'upsc' && (

              <div
                style={{
                  ...compactGrid,

                  marginTop:
                    '10px'
                }}
              >

                <label>

                  UPSC Exam

                  <input
                    value={
                      upscExamName
                    }
                    onChange={
                      event =>
                        setUpscExamName(
                          event.target.value
                        )
                    }
                  />

                </label>


                <label>

                  Year

                  <input
                    type="number"
                    value={
                      upscExamYear
                    }
                    onChange={
                      event =>
                        setUpscExamYear(
                          event.target.value
                        )
                    }
                  />

                </label>


                <label>

                  Cycle

                  <input
                    value={
                      upscExamCycle
                    }
                    onChange={
                      event =>
                        setUpscExamCycle(
                          event.target.value
                        )
                    }
                  />

                </label>


                <label>

                  Stage

                  <input
                    value={
                      upscExamStage
                    }
                    onChange={
                      event =>
                        setUpscExamStage(
                          event.target.value
                        )
                    }
                  />

                </label>


                <label>

                  Paper

                  <input
                    value={
                      upscExamPaper
                    }
                    onChange={
                      event =>
                        setUpscExamPaper(
                          event.target.value
                        )
                    }
                  />

                </label>

              </div>

            )}


            {
              questionOrigin ===
                'state_psc' && (

              <div
                style={{
                  ...compactGrid,

                  marginTop:
                    '10px'
                }}
              >

                <label>

                  State

                  <input
                    value={
                      statePscState
                    }
                    onChange={
                      event =>
                        setStatePscState(
                          event.target.value
                        )
                    }
                  />

                </label>


                <label>

                  PSC Name

                  <input
                    value={
                      statePscName
                    }
                    onChange={
                      event =>
                        setStatePscName(
                          event.target.value
                        )
                    }
                  />

                </label>


                <label>

                  Examination

                  <input
                    value={
                      statePscExamName
                    }
                    onChange={
                      event =>
                        setStatePscExamName(
                          event.target.value
                        )
                    }
                  />

                </label>


                <label>

                  Year

                  <input
                    type="number"
                    value={
                      statePscYear
                    }
                    onChange={
                      event =>
                        setStatePscYear(
                          event.target.value
                        )
                    }
                  />

                </label>


                <label>

                  Stage

                  <input
                    value={
                      statePscStage
                    }
                    onChange={
                      event =>
                        setStatePscStage(
                          event.target.value
                        )
                    }
                  />

                </label>


                <label>

                  Paper

                  <input
                    value={
                      statePscPaper
                    }
                    onChange={
                      event =>
                        setStatePscPaper(
                          event.target.value
                        )
                    }
                  />

                </label>

              </div>

            )}

          </section>

        )}


        {
          message && (

          <div
            className="callout"
            style={{
              marginTop:
                '10px'
            }}
          >
            {message}
          </div>

        )}


        {/* ACTIONS */}

        <div
          style={{
            display:
              'flex',

            justifyContent:
              'flex-end',

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
            disabled={
              saving
            }
            onClick={() =>
              resetForm()
            }
          >
            Clear
          </button>


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
                ? 'Update MCQ'
                : 'Save MCQ'
            }

          </button>

        </div>

      </form>

    </section>
  );
}


export default CompactMcqEditor;

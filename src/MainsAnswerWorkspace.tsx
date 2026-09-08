import {
  useEffect,
  useMemo,
  useState
} from 'react';

import { TopBar } from './components/TopBar';
import { supabase } from './lib/supabase';

export type MainsWorkspaceQuestion = {
  id: string;
  question: string;

  section_type:
    | 'gs'
    | 'optional';

  gs_paper:
    string | null;

  optional_subject:
    string | null;

  optional_paper:
    string | null;

  subject: string;

  topic:
    string | null;

  syllabus_link:
    string | null;

  directive:
    string | null;

  marks:
    number | null;

  word_limit:
    number | null;

  answer_framework:
    string | null;

  key_points:
    string | null;

  introduction_hint:
    string | null;

  conclusion_hint:
    string | null;

  source:
    string | null;

  source_url:
    string | null;
};

type SubmissionMode =
  | 'text'
  | 'pdf'
  | 'both';

const MAX_PDF_SIZE =
  10 * 1024 * 1024;

export function MainsAnswerWorkspace({
  question,
  onBack
}: {
  question: MainsWorkspaceQuestion;
  onBack: () => void;
}) {
  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    saving,
    setSaving
  ] = useState(false);

  const [
    uploading,
    setUploading
  ] = useState(false);

  const [
    userId,
    setUserId
  ] =
    useState<string | null>(
      null
    );

  const [
    attemptId,
    setAttemptId
  ] =
    useState<string | null>(
      null
    );

  const [
    answerText,
    setAnswerText
  ] =
    useState('');

  const [
    elapsedSeconds,
    setElapsedSeconds
  ] =
    useState(0);

  const [
    timerRunning,
    setTimerRunning
  ] =
    useState(true);

  const [
    pdfFile,
    setPdfFile
  ] =
    useState<File | null>(
      null
    );

  const [
    pdfPath,
    setPdfPath
  ] =
    useState<string | null>(
      null
    );

  const [
    pdfFileName,
    setPdfFileName
  ] =
    useState<string | null>(
      null
    );

  const [
    submitted,
    setSubmitted
  ] =
    useState(false);

  const [
    message,
    setMessage
  ] =
    useState('');

  const [
    showGuidance,
    setShowGuidance
  ] =
    useState(false);

  const wordCount =
    useMemo(() => {
      const clean =
        answerText.trim();

      if (!clean) {
        return 0;
      }

      return clean
        .split(/\s+/)
        .filter(Boolean)
        .length;
    }, [answerText]);

  const wordLimit =
    question.word_limit ||
    0;

  const overWordLimit =
    wordLimit > 0 &&
    wordCount > wordLimit;

  function formatTime(
    totalSeconds: number
  ) {
    const hours =
      Math.floor(
        totalSeconds /
          3600
      );

    const minutes =
      Math.floor(
        (
          totalSeconds %
          3600
        ) /
          60
      );

    const seconds =
      totalSeconds %
      60;

    return [
      hours,
      minutes,
      seconds
    ]
      .map(
        item =>
          String(item)
            .padStart(
              2,
              '0'
            )
      )
      .join(':');
  }

  function getSubmissionMode(
    hasPdf:
      boolean
  ): SubmissionMode {
    const hasText =
      answerText
        .trim()
        .length >
      0;

    if (
      hasText &&
      hasPdf
    ) {
      return 'both';
    }

    if (hasPdf) {
      return 'pdf';
    }

    return 'text';
  }

  useEffect(() => {
    async function initialise() {
      if (!supabase) {
        setMessage(
          'Supabase is not configured.'
        );

        setLoading(false);
        return;
      }

      const {
        data: {
          user
        }
      } =
        await supabase
          .auth
          .getUser();

      if (!user) {
        setMessage(
          'Please sign in before starting a Mains answer.'
        );

        setLoading(false);
        return;
      }

      setUserId(
        user.id
      );

      const {
        data,
        error
      } =
        await supabase
          .from(
            'mains_attempts'
          )
          .select(`
            id,
            answer_text,
            word_count,
            elapsed_seconds,
            status,
            pdf_path,
            pdf_file_name,
            evaluation_requested
          `)
          .eq(
            'user_id',
            user.id
          )
          .eq(
            'question_id',
            question.id
          )
          .eq(
            'status',
            'draft'
          )
          .maybeSingle();

      if (error) {
        console.error(
          'Unable to load Mains draft:',
          error
        );

        setMessage(
          error.message
        );

        setLoading(false);
        return;
      }

      if (data) {
        setAttemptId(
          data.id
        );

        setAnswerText(
          data.answer_text ||
            ''
        );

        setElapsedSeconds(
          data.elapsed_seconds ||
            0
        );

        setPdfPath(
          data.pdf_path ||
            null
        );

        setPdfFileName(
          data.pdf_file_name ||
            null
        );

        setMessage(
          'Your saved draft has been restored.'
        );
      }

      setLoading(false);
    }

    initialise();
  }, [question.id]);

  useEffect(() => {
    if (
      loading ||
      submitted ||
      !userId ||
      !timerRunning
    ) {
      return;
    }

    const timer =
      window.setInterval(
        () => {
          setElapsedSeconds(
            current =>
              current +
              1
          );
        },
        1000
      );

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, [
    loading,
    submitted,
    userId,
    timerRunning
  ]);

  async function ensureDraft() {
    if (
      !supabase ||
      !userId
    ) {
      throw new Error(
        'Please sign in first.'
      );
    }

    if (attemptId) {
      return attemptId;
    }

    const {
      data,
      error
    } =
      await supabase
        .from(
          'mains_attempts'
        )
        .insert({
          user_id:
            userId,

          question_id:
            question.id,

          answer_text:
            answerText,

          word_count:
            wordCount,

          elapsed_seconds:
            elapsedSeconds,

          status:
            'draft',

          submission_mode:
            getSubmissionMode(
              Boolean(
                pdfFile ||
                pdfPath
              )
            ),

          updated_at:
            new Date()
              .toISOString()
        })
        .select('id')
        .single();

    if (
      error ||
      !data
    ) {
      throw new Error(
        error?.message ||
          'Unable to create answer draft.'
      );
    }

    setAttemptId(
      data.id
    );

    return data.id;
  }

  async function uploadSelectedPdf(
    currentAttemptId:
      string
  ) {
    if (
      !supabase ||
      !userId
    ) {
      throw new Error(
        'Please sign in first.'
      );
    }

    if (!pdfFile) {
      return {
        path:
          pdfPath,

        fileName:
          pdfFileName
      };
    }

    if (
      pdfFile.type !==
      'application/pdf'
    ) {
      throw new Error(
        'Only PDF files are allowed.'
      );
    }

    if (
      pdfFile.size >
      MAX_PDF_SIZE
    ) {
      throw new Error(
        'PDF must be smaller than 10 MB.'
      );
    }

    setUploading(true);

    const filePath =
      `${userId}/${currentAttemptId}/answer.pdf`;

    const {
      error
    } =
      await supabase
        .storage
        .from(
          'mains-answer-pdfs'
        )
        .upload(
          filePath,
          pdfFile,
          {
            upsert:
              true,

            contentType:
              'application/pdf'
          }
        );

    setUploading(false);

    if (error) {
      throw new Error(
        error.message
      );
    }

    setPdfPath(
      filePath
    );

    setPdfFileName(
      pdfFile.name
    );

    setPdfFile(
      null
    );

    return {
      path:
        filePath,

      fileName:
        pdfFile.name
    };
  }

  async function saveDraft() {
    if (
      !supabase ||
      !userId
    ) {
      setMessage(
        'Please sign in before saving.'
      );

      return;
    }

    try {
      setSaving(true);

      setMessage(
        'Saving draft...'
      );

      const currentAttemptId =
        await ensureDraft();

      const uploaded =
        await uploadSelectedPdf(
          currentAttemptId
        );

      const finalPdfPath =
        uploaded.path;

      const finalFileName =
        uploaded.fileName;

      const {
        error
      } =
        await supabase
          .from(
            'mains_attempts'
          )
          .update({
            answer_text:
              answerText,

            word_count:
              wordCount,

            elapsed_seconds:
              elapsedSeconds,

            submission_mode:
              getSubmissionMode(
                Boolean(
                  finalPdfPath
                )
              ),

            pdf_path:
              finalPdfPath,

            pdf_file_name:
              finalFileName,

            updated_at:
              new Date()
                .toISOString()
          })
          .eq(
            'id',
            currentAttemptId
          );

      if (error) {
        throw new Error(
          error.message
        );
      }

      setMessage(
        'Draft saved successfully.'
      );
    } catch (error) {
      const text =
        error instanceof
        Error
          ? error.message
          : 'Unable to save draft.';

      setMessage(
        text
      );
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  async function submitAnswer() {
    if (
      !supabase ||
      !userId
    ) {
      setMessage(
        'Please sign in before submitting.'
      );

      return;
    }

    if (
      !answerText.trim() &&
      !pdfFile &&
      !pdfPath
    ) {
      setMessage(
        'Write an answer or upload a PDF before submitting.'
      );

      return;
    }

    const confirmed =
      window.confirm(
        'Submit this answer for evaluation? You will not be able to edit this submitted attempt.'
      );

    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);

      setTimerRunning(
        false
      );

      setMessage(
        'Submitting answer...'
      );

      const currentAttemptId =
        await ensureDraft();

      const uploaded =
        await uploadSelectedPdf(
          currentAttemptId
        );

      const finalPdfPath =
        uploaded.path;

      const finalFileName =
        uploaded.fileName;

      const submittedAt =
        new Date()
          .toISOString();

      const {
        error
      } =
        await supabase
          .from(
            'mains_attempts'
          )
          .update({
            answer_text:
              answerText,

            word_count:
              wordCount,

            elapsed_seconds:
              elapsedSeconds,

            submission_mode:
              getSubmissionMode(
                Boolean(
                  finalPdfPath
                )
              ),

            pdf_path:
              finalPdfPath,

            pdf_file_name:
              finalFileName,

            status:
              'submitted',

            evaluation_requested:
              true,

            submitted_at:
              submittedAt,

            updated_at:
              submittedAt
          })
          .eq(
            'id',
            currentAttemptId
          );

      if (error) {
        throw new Error(
          error.message
        );
      }

      setSubmitted(
        true
      );

      setShowGuidance(
        true
      );

      setMessage(
        'Answer submitted successfully. Evaluation status: Pending.'
      );
    } catch (error) {
      setTimerRunning(
        true
      );

      const text =
        error instanceof
        Error
          ? error.message
          : 'Unable to submit answer.';

      setMessage(
        text
      );
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  async function openSavedPdf() {
    if (
      !supabase ||
      !pdfPath
    ) {
      return;
    }

    const {
      data,
      error
    } =
      await supabase
        .storage
        .from(
          'mains-answer-pdfs'
        )
        .createSignedUrl(
          pdfPath,
          60
        );

    if (
      error ||
      !data
    ) {
      setMessage(
        error?.message ||
          'Unable to open PDF.'
      );

      return;
    }

    window.open(
      data.signedUrl,
      '_blank',
      'noopener,noreferrer'
    );
  }

  async function removePdf() {
    if (
      submitted
    ) {
      return;
    }

    if (
      !supabase
    ) {
      return;
    }

    if (
      pdfFile &&
      !pdfPath
    ) {
      setPdfFile(
        null
      );

      setPdfFileName(
        null
      );

      return;
    }

    if (!pdfPath) {
      return;
    }

    const confirmed =
      window.confirm(
        'Remove the uploaded PDF from this draft?'
      );

    if (!confirmed) {
      return;
    }

    const {
      error
    } =
      await supabase
        .storage
        .from(
          'mains-answer-pdfs'
        )
        .remove([
          pdfPath
        ]);

    if (error) {
      setMessage(
        error.message
      );

      return;
    }

    if (attemptId) {
      await supabase
        .from(
          'mains_attempts'
        )
        .update({
          pdf_path:
            null,

          pdf_file_name:
            null,

          submission_mode:
            answerText
              .trim()
              ? 'text'
              : 'text',

          updated_at:
            new Date()
              .toISOString()
        })
        .eq(
          'id',
          attemptId
        );
    }

    setPdfPath(
      null
    );

    setPdfFileName(
      null
    );

    setPdfFile(
      null
    );

    setMessage(
      'PDF removed.'
    );
  }

  if (loading) {
    return (
      <div className="page-wrap">

        <TopBar
          title="Answer Writing"
          subtitle="Loading your workspace"
        />

        <section className="panel">

          <h2>
            Preparing answer workspace...
          </h2>

        </section>

      </div>
    );
  }

  if (!userId) {
    return (
      <div className="page-wrap">

        <TopBar
          title="Answer Writing"
          subtitle="Secure student workspace"
        />

        <section className="panel">

          <span className="eyebrow">
            SIGN IN REQUIRED
          </span>

          <h2>
            Sign in to write and save answers
          </h2>

          <p>
            Student authentication is required
            so drafts, PDFs and evaluations remain
            private to each user.
          </p>

          <button
            type="button"
            className="secondary-btn"
            onClick={
              onBack
            }
          >
            Back to questions
          </button>

        </section>

      </div>
    );
  }

  return (
    <div className="page-wrap">

      <TopBar
        title="Mains Answer Writing"
        subtitle="Write, save, submit and improve"
      />

      <button
        type="button"
        className="secondary-btn"
        onClick={
          onBack
        }
        style={{
          marginBottom:
            '16px'
        }}
      >
        ← Back to question bank
      </button>

      <section
        className="panel"
        style={{
          marginBottom:
            '18px'
        }}
      >
        <span className="eyebrow">
          {question.section_type ===
          'gs'
            ? question.gs_paper
            : `${question.optional_subject} • ${question.optional_paper}`}
        </span>

        <h2
          style={{
            lineHeight:
              1.45
          }}
        >
          {question.question}
        </h2>

        <div className="tag-row">

          {question.directive && (
            <span className="tag">
              {question.directive}
            </span>
          )}

          {question.marks && (
            <span className="tag">
              {question.marks} Marks
            </span>
          )}

          {question.word_limit && (
            <span className="tag">
              {question.word_limit} Words
            </span>
          )}

          <span className="tag">
            {question.subject}
          </span>

          {question.topic && (
            <span className="tag">
              {question.topic}
            </span>
          )}

        </div>
      </section>

      <section
        className="panel"
        style={{
          marginBottom:
            '18px'
        }}
      >
        <div
          style={{
            display:
              'grid',
            gridTemplateColumns:
              'repeat(3, minmax(0, 1fr))',
            gap:
              '10px'
          }}
        >

          <div
            style={{
              background:
                '#0e1525',
              borderRadius:
                '14px',
              padding:
                '14px'
            }}
          >
            <span className="eyebrow">
              TIMER
            </span>

            <h3>
              {formatTime(
                elapsedSeconds
              )}
            </h3>
          </div>

          <div
            style={{
              background:
                '#0e1525',
              borderRadius:
                '14px',
              padding:
                '14px'
            }}
          >
            <span className="eyebrow">
              WORDS
            </span>

            <h3
              style={{
                color:
                  overWordLimit
                    ? '#f97360'
                    : '#f8fafc'
              }}
            >
              {wordCount}
              {wordLimit
                ? ` / ${wordLimit}`
                : ''}
            </h3>
          </div>

          <div
            style={{
              background:
                '#0e1525',
              borderRadius:
                '14px',
              padding:
                '14px'
            }}
          >
            <span className="eyebrow">
              STATUS
            </span>

            <h3>
              {submitted
                ? 'Submitted'
                : attemptId
                ? 'Draft'
                : 'New'}
            </h3>
          </div>

        </div>

        {!submitted && (
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
                setTimerRunning(
                  current =>
                    !current
                )
              }
            >
              {timerRunning
                ? 'Pause timer'
                : 'Resume timer'}
            </button>
          </div>
        )}

      </section>

      <section
        className="panel"
        style={{
          marginBottom:
            '18px'
        }}
      >

        <span className="eyebrow">
          WRITE YOUR ANSWER
        </span>

        <h2>
          Type answer
        </h2>

        <textarea
          value={
            answerText
          }
          disabled={
            submitted
          }
          onChange={
            e =>
              setAnswerText(
                e.target.value
              )
          }
          rows={18}
          placeholder="Write your UPSC Mains answer here..."
          style={{
            width:
              '100%',
            marginTop:
              '12px',
            resize:
              'vertical',
            minHeight:
              '360px',
            padding:
              '16px',
            borderRadius:
              '14px',
            border:
              '1px solid rgba(255,255,255,0.12)',
            background:
              '#0e1525',
            color:
              '#f8fafc',
            lineHeight:
              1.7,
            outline:
              'none'
          }}
        />

        {overWordLimit && (
          <p
            style={{
              color:
                '#f97360'
            }}
          >
            You are above the suggested
            {` ${wordLimit}-word `}
            limit.
          </p>
        )}

      </section>

      <section
        className="panel"
        style={{
          marginBottom:
            '18px'
        }}
      >

        <span className="eyebrow">
          HANDWRITTEN ANSWER
        </span>

        <h2>
          Upload PDF
        </h2>

        <p>
          You can upload a scanned handwritten
          answer or a typed PDF. Maximum size:
          10 MB.
        </p>

        {!submitted && (
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={
              e => {
                const file =
                  e.target
                    .files?.[0] ||
                  null;

                if (!file) {
                  return;
                }

                if (
                  file.type !==
                  'application/pdf'
                ) {
                  setMessage(
                    'Please choose a PDF file.'
                  );

                  return;
                }

                if (
                  file.size >
                  MAX_PDF_SIZE
                ) {
                  setMessage(
                    'PDF must be smaller than 10 MB.'
                  );

                  return;
                }

                setPdfFile(
                  file
                );

                setPdfFileName(
                  file.name
                );

                setMessage(
                  'PDF selected. Save draft or submit to upload it.'
                );
              }
            }
            style={{
              width:
                '100%',
              padding:
                '14px',
              background:
                '#0e1525',
              color:
                '#f8fafc',
              border:
                '1px solid rgba(255,255,255,0.12)',
              borderRadius:
                '12px'
            }}
          />
        )}

        {pdfFileName && (
          <div
            style={{
              marginTop:
                '14px',
              padding:
                '14px',
              background:
                'rgba(20,184,166,0.08)',
              border:
                '1px solid rgba(45,212,191,0.24)',
              borderRadius:
                '12px'
            }}
          >

            <strong>
              PDF:
            </strong>{' '}
            {pdfFileName}

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

              {pdfPath && (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={
                    openSavedPdf
                  }
                >
                  Open PDF
                </button>
              )}

              {!submitted && (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={
                    removePdf
                  }
                >
                  Remove PDF
                </button>
              )}

            </div>

          </div>
        )}

      </section>

      {!submitted && (
        <section
          className="panel"
          style={{
            marginBottom:
              '18px'
          }}
        >

          <div
            style={{
              display:
                'flex',
              gap:
                '12px',
              flexWrap:
                'wrap'
            }}
          >

            <button
              type="button"
              className="secondary-btn"
              disabled={
                saving ||
                uploading
              }
              onClick={
                saveDraft
              }
            >
              {saving
                ? 'Saving...'
                : 'Save Draft'}
            </button>

            <button
              type="button"
              className="primary-btn"
              disabled={
                saving ||
                uploading
              }
              onClick={
                submitAnswer
              }
            >
              {uploading
                ? 'Uploading PDF...'
                : saving
                ? 'Submitting...'
                : 'Submit for Evaluation'}
            </button>

          </div>

          <p>
            Save Draft lets you return later.
            Submit for Evaluation locks this attempt
            and sends it to the evaluation queue.
          </p>

        </section>
      )}

      {message && (
        <section
          className="panel"
          style={{
            marginBottom:
              '18px'
          }}
        >
          <strong>
            {message}
          </strong>
        </section>
      )}

      {submitted && (
        <section
          className="panel"
          style={{
            marginBottom:
              '18px',
            border:
              '1px solid rgba(45,212,191,0.30)',
            background:
              'rgba(20,184,166,0.07)'
          }}
        >

          <span className="eyebrow">
            EVALUATION STATUS
          </span>

          <h2>
            Pending
          </h2>

          <p>
            Your answer has been submitted
            successfully and is waiting for
            evaluation.
          </p>

        </section>
      )}

      {submitted && (
        <section
          className="panel"
          style={{
            marginBottom:
              '18px'
          }}
        >

          <span className="eyebrow">
            POST-ATTEMPT REVIEW
          </span>

          <h2>
            Compare with answer guidance
          </h2>

          <button
            type="button"
            className="secondary-btn"
            onClick={() =>
              setShowGuidance(
                current =>
                  !current
              )
            }
          >
            {showGuidance
              ? 'Hide guidance'
              : 'Show guidance'}
          </button>

          {showGuidance && (
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

              {question.syllabus_link && (
                <div className="panel">

                  <span className="eyebrow">
                    SYLLABUS LINKAGE
                  </span>

                  <p>
                    {question.syllabus_link}
                  </p>

                </div>
              )}

              {question.introduction_hint && (
                <div className="panel">

                  <span className="eyebrow">
                    INTRODUCTION HINT
                  </span>

                  <p
                    style={{
                      whiteSpace:
                        'pre-wrap'
                    }}
                  >
                    {question.introduction_hint}
                  </p>

                </div>
              )}

              {question.answer_framework && (
                <div className="panel">

                  <span className="eyebrow">
                    ANSWER FRAMEWORK
                  </span>

                  <p
                    style={{
                      whiteSpace:
                        'pre-wrap',
                      lineHeight:
                        1.75
                    }}
                  >
                    {question.answer_framework}
                  </p>

                </div>
              )}

              {question.key_points && (
                <div className="panel">

                  <span className="eyebrow">
                    KEY POINTS
                  </span>

                  <p
                    style={{
                      whiteSpace:
                        'pre-wrap',
                      lineHeight:
                        1.75
                    }}
                  >
                    {question.key_points}
                  </p>

                </div>
              )}

              {question.conclusion_hint && (
                <div className="panel">

                  <span className="eyebrow">
                    CONCLUSION HINT
                  </span>

                  <p
                    style={{
                      whiteSpace:
                        'pre-wrap'
                    }}
                  >
                    {question.conclusion_hint}
                  </p>

                </div>
              )}

            </div>
          )}

        </section>
      )}

    </div>
  );
}

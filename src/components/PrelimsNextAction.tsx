import {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


type ParsedAnswer = {
  question_id: string;
  selected_index: number | null;
  is_correct: boolean;
};


type QuestionMeta = {
  id: string;
  subject: string;
};


type SubjectStat = {
  subject: string;
  attempted: number;
  correct: number;
  incorrect: number;
  accuracy: number;
};


type RecommendationType =
  | 'mistakes'
  | 'weak_area'
  | 'revision'
  | 'mixed_practice'
  | 'build_history';


type Recommendation = {
  type: RecommendationType;
  title: string;
  message: string;
  reason: string;
  subject: string | null;
};


type Props = {
  onOpenMistakePractice?: () => void;
  onOpenWeakAreas?: () => void;
  onOpenRevisionBank?: () => void;

  /*
   * NEW:
   * Opens main Prelims Practice page.
   */
  onOpenPractice?: () => void;
};


function parseAnswer(
  value: unknown
): ParsedAnswer | null {

  if (
    !value ||
    typeof value !== 'object'
  ) {
    return null;
  }


  const row =
    value as
      Record<string, unknown>;


  if (
    typeof row.question_id !==
    'string'
  ) {
    return null;
  }


  return {
    question_id:
      row.question_id,

    selected_index:
      typeof row.selected_index ===
      'number'
        ? row.selected_index
        : null,

    is_correct:
      row.is_correct === true
  };
}


function round(
  value: number
) {
  return (
    Math.round(
      value * 10
    ) / 10
  );
}


function calculateAccuracy(
  correct: number,
  attempted: number
) {

  if (
    attempted <= 0
  ) {
    return 0;
  }


  return round(
    (
      correct /
      attempted
    ) *
      100
  );
}


export function PrelimsNextAction({
  onOpenMistakePractice,
  onOpenWeakAreas,
  onOpenRevisionBank,
  onOpenPractice
}: Props) {

  const [
    loading,
    setLoading
  ] =
    useState(true);


  const [
    error,
    setError
  ] =
    useState('');


  const [
    subjectStats,
    setSubjectStats
  ] =
    useState<SubjectStat[]>(
      []
    );


  const [
    totalAttempts,
    setTotalAttempts
  ] =
    useState(0);


  const [
    totalAnswered,
    setTotalAnswered
  ] =
    useState(0);


  const [
    totalWrong,
    setTotalWrong
  ] =
    useState(0);


  const [
    recentAccuracy,
    setRecentAccuracy
  ] =
    useState(0);


  const [
    previousAccuracy,
    setPreviousAccuracy
  ] =
    useState<number | null>(
      null
    );


  const [
    savedQuestionCount,
    setSavedQuestionCount
  ] =
    useState(0);


  /*
   * LOAD STUDENT PERFORMANCE
   */

  async function loadRecommendation() {

    if (!supabase) {

      setError(
        'Supabase is not configured.'
      );

      setLoading(false);

      return;
    }


    setLoading(true);
    setError('');


    const {
      data: {
        user
      }
    } =
      await supabase
        .auth
        .getUser();


    if (!user) {

      setError(
        'Sign in to receive a personalised Prelims recommendation.'
      );

      setLoading(false);

      return;
    }


    /*
     * RECENT 10 ATTEMPTS
     */

    const {
      data:
        attemptData,

      error:
        attemptError
    } =
      await supabase
        .from(
          'practice_attempts'
        )
        .select(`
          id,
          answers,
          correct_answers,
          attempted_questions,
          total_questions,
          completed_at
        `)
        .eq(
          'user_id',
          user.id
        )
        .order(
          'completed_at',
          {
            ascending:
              false
          }
        )
        .limit(10);


    if (attemptError) {

      console.error(
        'Unable to build Prelims recommendation:',
        attemptError
      );

      setError(
        attemptError.message
      );

      setLoading(false);

      return;
    }


    const attempts =
      attemptData || [];


    setTotalAttempts(
      attempts.length
    );


    /*
     * LAST 5 VS PREVIOUS 5
     */

    const recent =
      attempts.slice(
        0,
        5
      );


    const previous =
      attempts.slice(
        5,
        10
      );


    function groupAccuracy(
      rows: typeof attempts
    ) {

      let correct = 0;
      let attempted = 0;


      rows.forEach(
        row => {

          correct +=
            Number(
              row.correct_answers ||
                0
            );


          attempted +=
            Number(
              row.attempted_questions ??
                row.total_questions ??
                0
            );
        }
      );


      return calculateAccuracy(
        correct,
        attempted
      );
    }


    setRecentAccuracy(
      groupAccuracy(
        recent
      )
    );


    setPreviousAccuracy(
      previous.length > 0
        ? groupAccuracy(
            previous
          )
        : null
    );


    /*
     * COLLECT QUESTION ANSWERS
     */

    const parsedAnswers:
      ParsedAnswer[] = [];


    attempts.forEach(
      attempt => {

        if (
          !Array.isArray(
            attempt.answers
          )
        ) {
          return;
        }


        attempt.answers.forEach(
          raw => {

            const answer =
              parseAnswer(
                raw
              );


            if (answer) {

              parsedAnswers.push(
                answer
              );
            }
          }
        );
      }
    );


    const answered =
      parsedAnswers.filter(
        answer =>
          answer.selected_index !==
          null
      );


    const wrong =
      answered.filter(
        answer =>
          !answer.is_correct
      );


    setTotalAnswered(
      answered.length
    );


    setTotalWrong(
      wrong.length
    );


    /*
     * QUESTION METADATA
     */

    const questionIds =
      Array.from(
        new Set(
          answered.map(
            answer =>
              answer.question_id
          )
        )
      );


    if (
      questionIds.length > 0
    ) {

      const questionRows:
        QuestionMeta[] = [];


      const chunkSize = 200;


      for (
        let start = 0;
        start < questionIds.length;
        start += chunkSize
      ) {

        const chunk =
          questionIds.slice(
            start,
            start + chunkSize
          );


        const {
          data,
          error:
            questionError
        } =
          await supabase
            .from(
              'questions'
            )
            .select(
              'id, subject'
            )
            .in(
              'id',
              chunk
            );


        if (questionError) {

          console.error(
            'Unable to load question metadata:',
            questionError
          );

          continue;
        }


        (
          data || []
        ).forEach(
          item => {

            questionRows.push({
              id:
                String(
                  item.id
                ),

              subject:
                String(
                  item.subject ||
                    'Other'
                )
            });
          }
        );
      }


      const questionMap =
        new Map<
          string,
          QuestionMeta
        >();


      questionRows.forEach(
        item => {

          questionMap.set(
            item.id,
            item
          );
        }
      );


      /*
       * SUBJECT ACCURACY
       */

      const statMap =
        new Map<
          string,
          SubjectStat
        >();


      answered.forEach(
        answer => {

          const question =
            questionMap.get(
              answer.question_id
            );


          if (!question) {
            return;
          }


          const existing =
            statMap.get(
              question.subject
            ) || {
              subject:
                question.subject,

              attempted:
                0,

              correct:
                0,

              incorrect:
                0,

              accuracy:
                0
            };


          existing.attempted +=
            1;


          if (
            answer.is_correct
          ) {

            existing.correct +=
              1;

          } else {

            existing.incorrect +=
              1;
          }


          statMap.set(
            question.subject,
            existing
          );
        }
      );


      const stats =
        Array.from(
          statMap.values()
        )
          .map(
            item => ({
              ...item,

              accuracy:
                calculateAccuracy(
                  item.correct,
                  item.attempted
                )
            })
          )
          .sort(
            (
              a,
              b
            ) => {

              if (
                a.accuracy !==
                b.accuracy
              ) {

                return (
                  a.accuracy -
                  b.accuracy
                );
              }


              return (
                b.attempted -
                a.attempted
              );
            }
          );


      setSubjectStats(
        stats
      );

    } else {

      setSubjectStats([]);
    }


    /*
     * REVISION BANK COUNT
     */

    const {
      count,
      error:
        bookmarkError
    } =
      await supabase
        .from(
          'bookmarks'
        )
        .select(
          'id',
          {
            count:
              'exact',

            head:
              true
          }
        )
        .eq(
          'user_id',
          user.id
        )
        .eq(
          'content_type',
          'prelims_question'
        );


    if (bookmarkError) {

      console.error(
        'Unable to count revision questions:',
        bookmarkError
      );

      setSavedQuestionCount(
        0
      );

    } else {

      setSavedQuestionCount(
        count || 0
      );
    }


    setLoading(false);
  }


  useEffect(
    () => {

      void loadRecommendation();

    },
    []
  );


  /*
   * WEAKEST SUBJECT
   *
   * Require at least
   * 3 answered questions.
   */

  const weakestSubject =
    useMemo(
      () =>
        subjectStats.find(
          item =>
            item.attempted >= 3
        ) || null,
      [
        subjectStats
      ]
    );


  /*
   * BUILD RECOMMENDATION
   */

  const recommendation =
    useMemo<Recommendation>(
      () => {

        /*
         * BUILD BASELINE
         */

        if (
          totalAttempts < 2 ||
          totalAnswered < 10
        ) {

          return {
            type:
              'build_history',

            title:
              'Build Your Prelims Baseline',

            message:
              'Complete another mixed Prelims practice session.',

            reason:
              'More question history is needed before weak areas and trends can be judged reliably.',

            subject:
              null
          };
        }


        /*
         * MISTAKE PRIORITY
         */

        if (
          totalWrong >= 5 &&
          (
            !weakestSubject ||
            weakestSubject.accuracy <
              60
          )
        ) {

          return {
            type:
              'mistakes',

            title:
              weakestSubject
                ? `Repair ${weakestSubject.subject} First`
                : 'Repair Recent Mistakes First',

            message:
              weakestSubject
                ? `Practise your incorrect ${weakestSubject.subject} questions before taking another full test.`
                : 'Practise recently incorrect questions before taking another full test.',

            reason:
              weakestSubject
                ? `${weakestSubject.subject} accuracy is ${weakestSubject.accuracy}% from ${weakestSubject.attempted} recent answers.`
                : `${totalWrong} incorrect answers were found in your recent history.`,

            subject:
              weakestSubject
                ?.subject ||
              null
          };
        }


        /*
         * WEAK SUBJECT
         */

        if (
          weakestSubject &&
          weakestSubject.accuracy <
            65
        ) {

          return {
            type:
              'weak_area',

            title:
              `Focus on ${weakestSubject.subject}`,

            message:
              `Review the weakest topics inside ${weakestSubject.subject}, then practise them again.`,

            reason:
              `Recent ${weakestSubject.subject} accuracy is ${weakestSubject.accuracy}%.`,

            subject:
              weakestSubject.subject
          };
        }


        /*
         * REVISION BACKLOG
         */

        if (
          savedQuestionCount >= 5
        ) {

          return {
            type:
              'revision',

            title:
              'Clear Your Revision Bank',

            message:
              'Revise your saved Prelims questions before adding more material.',

            reason:
              `${savedQuestionCount} questions are currently saved for revision.`,

            subject:
              null
          };
        }


        /*
         * DECLINING PERFORMANCE
         */

        if (
          previousAccuracy !== null &&
          recentAccuracy <
            previousAccuracy - 5
        ) {

          return {
            type:
              'weak_area',

            title:
              'Review Before Your Next Test',

            message:
              'Use Weak Area Analysis and revise before attempting another full mixed set.',

            reason:
              `Recent accuracy is ${recentAccuracy}% compared with ${previousAccuracy}% previously.`,

            subject:
              weakestSubject
                ?.subject ||
              null
          };
        }


        /*
         * NORMAL / IMPROVING
         */

        return {
          type:
            'mixed_practice',

          title:
            'Ready for Mixed Practice',

          message:
            'Take a fresh 20-question mixed Prelims practice session.',

          reason:
            previousAccuracy !==
              null
              ? `Recent accuracy is ${recentAccuracy}% compared with ${previousAccuracy}% previously.`
              : `Recent accuracy is ${recentAccuracy}%.`,

          subject:
            null
        };
      },
      [
        totalAttempts,
        totalAnswered,
        totalWrong,
        weakestSubject,
        savedQuestionCount,
        recentAccuracy,
        previousAccuracy
      ]
    );


  /*
   * RECOMMENDATION ACTION
   */

  function runRecommendation() {

    switch (
      recommendation.type
    ) {

      case 'mistakes':

        onOpenMistakePractice?.();

        break;


      case 'weak_area':

        onOpenWeakAreas?.();

        break;


      case 'revision':

        onOpenRevisionBank?.();

        break;


      case 'mixed_practice':

      case 'build_history':

        onOpenPractice?.();

        break;
    }
  }


  /*
   * DOES THIS RECOMMENDATION
   * HAVE A CLICK ACTION?
   */

  const hasAction =

    (
      recommendation.type ===
        'mistakes' &&
      Boolean(
        onOpenMistakePractice
      )
    ) ||

    (
      recommendation.type ===
        'weak_area' &&
      Boolean(
        onOpenWeakAreas
      )
    ) ||

    (
      recommendation.type ===
        'revision' &&
      Boolean(
        onOpenRevisionBank
      )
    ) ||

    (
      (
        recommendation.type ===
          'mixed_practice' ||
        recommendation.type ===
          'build_history'
      ) &&
      Boolean(
        onOpenPractice
      )
    );


  function actionLabel() {

    switch (
      recommendation.type
    ) {

      case 'mistakes':

        return 'Practice My Mistakes';


      case 'weak_area':

        return 'Open Weak Areas';


      case 'revision':

        return 'Open Revision Bank';


      case 'build_history':

        return 'Start Prelims Practice';


      case 'mixed_practice':

        return 'Start Mixed Practice';
    }
  }


  return (

    <section
      className="panel"
      style={{
        marginTop:
          '22px',

        border:
          '1px solid rgba(45,212,191,.20)'
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
            SMART STUDY
          </span>


          <h2>
            What Should I Study Next?
          </h2>


          <p>
            One recommended next step
            based on your recent
            Prelims performance.
          </p>

        </div>


        <button
          type="button"
          className="secondary-btn"
          onClick={
            loadRecommendation
          }
        >
          Refresh
        </button>

      </div>


      {/* LOADING */}

      {loading && (

        <p>
          Finding your next study
          priority...
        </p>

      )}


      {/* ERROR */}

      {error && (

        <div
          className="callout"
          style={{
            marginTop:
              '16px'
          }}
        >

          <strong>
            {error}
          </strong>

        </div>

      )}


      {/* RECOMMENDATION */}

      {!loading &&
        !error && (

        <div
          style={{
            marginTop:
              '18px',

            padding:
              '18px',

            border:
              '1px solid rgba(45,212,191,.22)',

            background:
              'rgba(20,184,166,.04)',

            borderRadius:
              '16px'
          }}
        >

          <span
            className="tag"
          >
            NEXT PRIORITY
          </span>


          <h3
            style={{
              marginTop:
                '12px'
            }}
          >
            {
              recommendation.title
            }
          </h3>


          <p>
            {
              recommendation.message
            }
          </p>


          <div
            className="callout"
            style={{
              marginTop:
                '14px'
            }}
          >

            <strong>
              Why this is recommended
            </strong>


            <p>
              {
                recommendation.reason
              }
            </p>

          </div>


          {recommendation.subject && (

            <div
              className="tag-row"
              style={{
                marginTop:
                  '12px'
              }}
            >

              <span
                className="tag"
              >
                Priority Subject:{' '}
                {
                  recommendation.subject
                }
              </span>

            </div>

          )}


          {hasAction ? (

            <button
              type="button"
              className="primary-btn"
              onClick={
                runRecommendation
              }
              style={{
                marginTop:
                  '16px'
              }}
            >
              {actionLabel()}
            </button>

          ) : (

            <p
              style={{
                marginTop:
                  '14px',

                marginBottom:
                  0
              }}
            >

              {recommendation.type ===
                'mixed_practice' ||
              recommendation.type ===
                'build_history'
                ? (
                  <>
                    Open the{' '}
                    <strong>
                      Practice
                    </strong>{' '}
                    tab to continue.
                  </>
                )
                : (
                  'Open the relevant Study Tool below.'
                )}

            </p>

          )}

        </div>

      )}

    </section>
  );
}

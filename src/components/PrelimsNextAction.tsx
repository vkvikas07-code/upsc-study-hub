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
  topic: string | null;
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
};


function parseAnswer(
  value: unknown
):
  ParsedAnswer | null {

  if (
    !value ||
    typeof value !==
      'object'
  ) {

    return null;
  }


  const record =
    value as
      Record<
        string,
        unknown
      >;


  if (
    typeof
      record.question_id !==
      'string'
  ) {

    return null;
  }


  return {

    question_id:
      record.question_id,

    selected_index:
      typeof
        record.selected_index ===
        'number'
        ? record.selected_index
        : null,

    is_correct:
      record.is_correct ===
      true
  };
}


function roundNumber(
  value: number
) {

  return Math.round(
    value *
    10
  ) /
  10;
}


function accuracy(
  correct: number,
  attempted: number
) {

  if (
    attempted <=
    0
  ) {

    return 0;
  }


  return roundNumber(
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
  onOpenRevisionBank
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
    useState<
      SubjectStat[]
    >([]);


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
   * LOAD STUDENT DATA
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
     * LOAD RECENT ATTEMPTS
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
        .limit(
          10
        );


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
     * RECENT VS PREVIOUS
     *
     * Latest 5 attempts
     * compared with previous 5.
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
      rows:
        typeof attempts
    ) {

      let correct =
        0;

      let attempted =
        0;


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


      return accuracy(
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
      previous.length >
        0
        ? groupAccuracy(
            previous
          )
        : null
    );


    /*
     * COLLECT ANSWERS
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
          rawAnswer => {

            const parsed =
              parseAnswer(
                rawAnswer
              );


            if (parsed) {

              parsedAnswers.push(
                parsed
              );
            }
          }
        );
      }
    );


    const answered =
      parsedAnswers.filter(
        item =>
          item.selected_index !==
          null
      );


    const wrong =
      answered.filter(
        item =>
          !item.is_correct
      );


    setTotalAnswered(
      answered.length
    );


    setTotalWrong(
      wrong.length
    );


    /*
     * LOAD QUESTION METADATA
     */

    const questionIds =
      Array.from(
        new Set(
          answered.map(
            item =>
              item.question_id
          )
        )
      );


    if (
      questionIds.length >
      0
    ) {

      const questionRows:
        QuestionMeta[] = [];


      const chunkSize =
        200;


      for (
        let start = 0;
        start <
        questionIds.length;
        start +=
        chunkSize
      ) {

        const chunk =
          questionIds.slice(
            start,
            start +
            chunkSize
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
              'id, subject, topic'
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
                ),

              topic:
                item.topic
                  ? String(
                      item.topic
                    )
                  : null
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
        question => {

          questionMap.set(
            question.id,
            question
          );
        }
      );


      /*
       * BUILD SUBJECT STATS
       */

      const subjectMap =
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


          const subjectName =
            question.subject;


          const existing =
            subjectMap.get(
              subjectName
            ) || {

              subject:
                subjectName,

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


          subjectMap.set(
            subjectName,
            existing
          );
        }
      );


      const stats =
        Array.from(
          subjectMap.values()
        )
          .map(
            item => ({
              ...item,

              accuracy:
                accuracy(
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
     * SAVED REVISION QUESTIONS
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


    if (
      bookmarkError
    ) {

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
   * LOWEST SUBJECT
   *
   * Require at least 3 answers
   * before declaring a subject
   * weak.
   */

  const weakestSubject =
    useMemo(
      () =>
        subjectStats.find(
          item =>
            item.attempted >=
            3
        ) || null,
      [
        subjectStats
      ]
    );


  /*
   * PERSONAL RECOMMENDATION
   */

  const recommendation =
    useMemo<
      Recommendation
    >(
      () => {

        /*
         * Not enough history
         */

        if (
          totalAttempts <
            2 ||
          totalAnswered <
            10
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
         * Significant mistake load
         */

        if (
          totalWrong >=
            5 &&
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
         * Weak subject
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
         * Revision backlog
         */

        if (
          savedQuestionCount >=
          5
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
         * Falling trend
         */

        if (
          previousAccuracy !==
            null &&
          recentAccuracy <
            previousAccuracy -
              5
        ) {

          return {

            type:
              'weak_area',

            title:
              'Review Before Your Next Test',

            message:
              'Use Weak Area Analysis and revise before attempting another full mixed set.',

            reason:
              `Recent accuracy is ${recentAccuracy}% compared with ${previousAccuracy}% in the previous group.`,

            subject:
              weakestSubject
                ?.subject ||
              null
          };
        }


        /*
         * Normal / improving
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
   * ACTION BUTTON
   */

  function runRecommendation() {

    if (
      recommendation.type ===
      'mistakes'
    ) {

      onOpenMistakePractice?.();

      return;
    }


    if (
      recommendation.type ===
      'weak_area'
    ) {

      onOpenWeakAreas?.();

      return;
    }


    if (
      recommendation.type ===
      'revision'
    ) {

      onOpenRevisionBank?.();

      return;
    }
  }


  const hasInternalAction =
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
    );


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
            A simple recommendation
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


      {loading && (

        <p>
          Finding your next study
          priority...
        </p>

      )}


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


          <p
            style={{
              fontSize:
                '1rem'
            }}
          >
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


          {hasInternalAction && (

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

              {
                recommendation.type ===
                  'mistakes'
                  ? 'Practice My Mistakes'

                  : recommendation.type ===
                    'weak_area'
                  ? 'Open Weak Areas'

                  : 'Open Revision Bank'
              }

            </button>

          )}


          {!hasInternalAction &&
            recommendation.type ===
              'mixed_practice' && (

            <p
              style={{
                marginTop:
                  '14px',
                marginBottom:
                  0
              }}
            >
              Open the{' '}
              <strong>
                Practice
              </strong>{' '}
              tab and start a
              20-question mixed set.
            </p>

          )}


          {!hasInternalAction &&
            recommendation.type ===
              'build_history' && (

            <p
              style={{
                marginTop:
                  '14px',
                marginBottom:
                  0
              }}
            >
              Start with at least
              10 to 20 mixed MCQs
              so the analytics can
              learn from your results.
            </p>

          )}

        </div>

      )}

    </section>
  );
}

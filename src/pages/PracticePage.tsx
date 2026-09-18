import {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  TopBar
} from '../components/TopBar';

import {
  PrelimsBookmarkButton
} from '../components/PrelimsBookmarkButton';

import {
  supabase
} from '../lib/supabase';


type QuestionOrigin =
  | 'cse'
  | 'upsc'
  | 'state';


type SessionMode =
  | 'practice'
  | 'exam';


type SessionSize =
  | '10'
  | '20'
  | '50'
  | '100'
  | 'all';


type Difficulty =
  | 'easy'
  | 'medium'
  | 'hard';


type QuestionAppearance = {
  appearance_id: string | null;

  stored_question_id:
    string | null;

  exam_paper_id:
    string | null;

  exam_family:
    string | null;

  commission:
    string | null;

  state:
    string | null;

  exam_name:
    string | null;

  exam_cycle:
    string | null;

  year:
    number | null;

  stage:
    string | null;

  paper:
    string | null;

  question_number:
    string | null;

  appearance_type:
    string | null;

  source_reference:
    string | null;
};


type LiveQuestion = {
  id: string;

  question: string;

  options: string[];

  correct_index:
    number;

  explanation:
    string;

  subject:
    string;

  difficulty:
    Difficulty;

  topic:
    string | null;

  paper:
    string | null;

  tags:
    string[];

  source:
    string | null;

  source_url:
    string | null;

  is_pyq:
    boolean;

  appearance_count:
    number;

  origins:
    QuestionOrigin[];

  cse_pyq_years:
    number[];

  upsc_exam_names:
    string[];

  upsc_exam_cycles:
    string[];

  upsc_exam_years:
    number[];

  state_psc_states:
    string[];

  state_psc_names:
    string[];

  state_psc_exam_names:
    string[];

  state_psc_years:
    number[];

  stored_question_ids:
    string[];

  appearances:
    QuestionAppearance[];
};


type AnswerRecord = {
  question_id:
    string;

  selected_index:
    number | null;

  correct_index:
    number;

  is_correct:
    boolean;
};


type ExamResult = {
  attempted:
    number;

  correct:
    number;

  incorrect:
    number;

  unanswered:
    number;

  markedForReview:
    number;

  positiveMarks:
    number;

  negativeMarks:
    number;

  marksObtained:
    number;

  maxMarks:
    number;

  timeUsedSeconds:
    number;

  timeLimitSeconds:
    number;

  answers:
    AnswerRecord[];
};


const CSE_MARKS_PER_QUESTION =
  2;


const CSE_NEGATIVE_MARK =
  CSE_MARKS_PER_QUESTION /
  3;


const CSE_SECONDS_PER_QUESTION =
  72;


function hasQuestionOrigin(
  item: LiveQuestion,
  origin: QuestionOrigin
) {
  return item.origins.includes(
    origin
  );
}


function shuffleQuestions(
  items: LiveQuestion[]
) {
  const shuffled = [
    ...items
  ];

  for (
    let i =
      shuffled.length - 1;

    i > 0;

    i -= 1
  ) {
    const j =
      Math.floor(
        Math.random() *
        (i + 1)
      );

    [
      shuffled[i],
      shuffled[j]
    ] = [
      shuffled[j],
      shuffled[i]
    ];
  }

  return shuffled;
}


function formatTime(
  seconds: number
) {
  const safeSeconds =
    Math.max(
      0,
      seconds
    );

  const hours =
    Math.floor(
      safeSeconds /
      3600
    );

  const minutes =
    Math.floor(
      (
        safeSeconds %
        3600
      ) /
      60
    );

  const remainingSeconds =
    safeSeconds %
    60;

  if (hours > 0) {
    return (
      `${hours}:` +
      `${String(
        minutes
      ).padStart(
        2,
        '0'
      )}:` +
      `${String(
        remainingSeconds
      ).padStart(
        2,
        '0'
      )}`
    );
  }

  return (
    `${minutes}:` +
    `${String(
      remainingSeconds
    ).padStart(
      2,
      '0'
    )}`
  );
}


function roundNumber(
  value: number,
  decimals = 2
) {
  const multiplier =
    10 ** decimals;

  return (
    Math.round(
      value *
      multiplier
    ) /
    multiplier
  );
}


function toStringArray(
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


function toNumberArray(
  value: unknown
): number[] {
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
        Number(
          item
        )
    )
    .filter(
      item =>
        Number.isFinite(
          item
        )
    );
}


function parseOrigins(
  value: unknown
): QuestionOrigin[] {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }

  return value.filter(
    (
      item
    ): item is QuestionOrigin =>
      item === 'cse' ||
      item === 'upsc' ||
      item === 'state'
  );
}


function parseAppearances(
  value: unknown
): QuestionAppearance[] {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }

  return value.map(
    raw => {
      const item =
        (
          raw ||
          {}
        ) as Record<
          string,
          unknown
        >;

      const rawYear =
        item.year;

      return {
        appearance_id:
          item.appearance_id ==
          null
            ? null
            : String(
                item.appearance_id
              ),

        stored_question_id:
          item.stored_question_id ==
          null
            ? null
            : String(
                item.stored_question_id
              ),

        exam_paper_id:
          item.exam_paper_id ==
          null
            ? null
            : String(
                item.exam_paper_id
              ),

        exam_family:
          item.exam_family ==
          null
            ? null
            : String(
                item.exam_family
              ),

        commission:
          item.commission ==
          null
            ? null
            : String(
                item.commission
              ),

        state:
          item.state ==
          null
            ? null
            : String(
                item.state
              ),

        exam_name:
          item.exam_name ==
          null
            ? null
            : String(
                item.exam_name
              ),

        exam_cycle:
          item.exam_cycle ==
          null
            ? null
            : String(
                item.exam_cycle
              ),

        year:
          rawYear ==
            null ||
          !Number.isFinite(
            Number(
              rawYear
            )
          )
            ? null
            : Number(
                rawYear
              ),

        stage:
          item.stage ==
          null
            ? null
            : String(
                item.stage
              ),

        paper:
          item.paper ==
          null
            ? null
            : String(
                item.paper
              ),

        question_number:
          item.question_number ==
          null
            ? null
            : String(
                item.question_number
              ),

        appearance_type:
          item.appearance_type ==
          null
            ? null
            : String(
                item.appearance_type
              ),

        source_reference:
          item.source_reference ==
          null
            ? null
            : String(
                item.source_reference
              )
      };
    }
  );
}


export function PracticePage() {
  const [
    allQuestions,
    setAllQuestions
  ] =
    useState<
      LiveQuestion[]
    >([]);


  const [
    questions,
    setQuestions
  ] =
    useState<
      LiveQuestion[]
    >([]);


  const [
    practiceStarted,
    setPracticeStarted
  ] =
    useState(false);


  const [
    sessionMode,
    setSessionMode
  ] =
    useState<
      SessionMode
    >('practice');


  const [
    index,
    setIndex
  ] =
    useState(0);


  const [
    selected,
    setSelected
  ] =
    useState<
      number | null
    >(null);


  const [
    score,
    setScore
  ] =
    useState(0);


  const [
    answers,
    setAnswers
  ] =
    useState<
      AnswerRecord[]
    >([]);


  const [
    finished,
    setFinished
  ] =
    useState(false);


  const [
    examSelections,
    setExamSelections
  ] =
    useState<
      Record<
        string,
        number
      >
    >({});


  const [
    markedForReview,
    setMarkedForReview
  ] =
    useState<
      Record<
        string,
        boolean
      >
    >({});


  const [
    timeLeft,
    setTimeLeft
  ] =
    useState<
      number | null
    >(null);


  const [
    timeLimitSeconds,
    setTimeLimitSeconds
  ] =
    useState(0);


  const [
    sessionStartedAt,
    setSessionStartedAt
  ] =
    useState<
      number | null
    >(null);


  const [
    examResult,
    setExamResult
  ] =
    useState<
      ExamResult | null
    >(null);


  const [
    showExamReview,
    setShowExamReview
  ] =
    useState(false);


  const [
    examSubmitting,
    setExamSubmitting
  ] =
    useState(false);


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
    setupMessage,
    setSetupMessage
  ] =
    useState('');


  const [
    savingResult,
    setSavingResult
  ] =
    useState(false);


  const [
    resultMessage,
    setResultMessage
  ] =
    useState('');


  const [
    attemptSaved,
    setAttemptSaved
  ] =
    useState(false);


  const [
    originFilter,
    setOriginFilter
  ] =
    useState<
      | 'all'
      | QuestionOrigin
    >('all');


  const [
    searchText,
    setSearchText
  ] =
    useState('');


  const [
    subjectFilter,
    setSubjectFilter
  ] =
    useState('all');


  const [
    topicFilter,
    setTopicFilter
  ] =
    useState('all');


  const [
    difficultyFilter,
    setDifficultyFilter
  ] =
    useState<
      | 'all'
      | Difficulty
    >('all');


  const [
    typeFilter,
    setTypeFilter
  ] =
    useState<
      | 'all'
      | 'practice'
      | 'pyq'
    >('all');


  const [
    csePyqYearFilter,
    setCsePyqYearFilter
  ] =
    useState('all');


  const [
    sessionSize,
    setSessionSize
  ] =
    useState<
      SessionSize
    >('10');


  const [
    upscExamFilter,
    setUpscExamFilter
  ] =
    useState('all');


  const [
    upscCycleFilter,
    setUpscCycleFilter
  ] =
    useState('all');


  const [
    upscYearFilter,
    setUpscYearFilter
  ] =
    useState('all');


  const [
    stateFilter,
    setStateFilter
  ] =
    useState('all');


  const [
    stateExamFilter,
    setStateExamFilter
  ] =
    useState('all');


  const [
    stateYearFilter,
    setStateYearFilter
  ] =
    useState('all');


  const [
    bookmarkedOnly,
    setBookmarkedOnly
  ] =
    useState(false);


  const [
    bookmarkedQuestionIds,
    setBookmarkedQuestionIds
  ] =
    useState<
      string[]
    >([]);


  const [
    bookmarkSignedIn,
    setBookmarkSignedIn
  ] =
    useState(false);


  function resetActiveSession() {
    setQuestions([]);
    setPracticeStarted(false);
    setIndex(0);
    setSelected(null);
    setScore(0);
    setAnswers([]);
    setFinished(false);

    setExamSelections({});
    setMarkedForReview({});

    setTimeLeft(null);
    setTimeLimitSeconds(0);
    setSessionStartedAt(null);

    setExamResult(null);
    setShowExamReview(false);
    setExamSubmitting(false);

    setAttemptSaved(false);
    setResultMessage('');
  }


  async function loadBookmarkedQuestionIds() {
    if (!supabase) {
      setBookmarkedQuestionIds(
        []
      );

      setBookmarkSignedIn(
        false
      );

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
      setBookmarkedQuestionIds(
        []
      );

      setBookmarkSignedIn(
        false
      );

      setBookmarkedOnly(
        false
      );

      return;
    }


    setBookmarkSignedIn(
      true
    );


    const {
      data,
      error:
        bookmarkError
    } =
      await supabase
        .from(
          'bookmarks'
        )
        .select(
          'content_id'
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
        'Unable to load saved Prelims questions:',
        bookmarkError
      );

      setBookmarkedQuestionIds(
        []
      );

      return;
    }


    const ids =
      (
        data ||
        []
      )
        .map(
          item =>
            String(
              item.content_id
            )
        )
        .filter(
          Boolean
        );


    setBookmarkedQuestionIds(
      Array.from(
        new Set(
          ids
        )
      )
    );
  }


  async function loadQuestions() {
    if (!supabase) {
      setError(
        'Practice database is not configured.'
      );

      setLoading(
        false
      );

      return;
    }


    setLoading(true);
    setError('');
    setSetupMessage('');


    const {
      data,
      error:
        loadError
    } =
      await supabase.rpc(
        'get_canonical_prelims_questions'
      );


    if (
      loadError
    ) {
      console.error(
        'Unable to load canonical questions:',
        loadError
      );

      setError(
        loadError.message
      );

      setLoading(
        false
      );

      return;
    }


    const formatted:
      LiveQuestion[] =
      (
        data ||
        []
      ).map(
        raw => {
          const item =
            (
              raw ||
              {}
            ) as Record<
              string,
              unknown
            >;


          const id =
            String(
              item.id ||
              ''
            );


          const storedQuestionIds =
            toStringArray(
              item
                .stored_question_ids
            );


          return {
            id,

            question:
              String(
                item.question ||
                ''
              ),

            options:
              toStringArray(
                item.options
              ),

            correct_index:
              Number(
                item
                  .correct_index ??
                0
              ),

            explanation:
              String(
                item.explanation ||
                ''
              ),

            subject:
              String(
                item.subject ||
                ''
              ),

            difficulty:
              (
                item.difficulty ||
                'medium'
              ) as Difficulty,

            topic:
              item.topic ==
              null
                ? null
                : String(
                    item.topic
                  ),

            paper:
              item.paper ==
              null
                ? null
                : String(
                    item.paper
                  ),

            tags:
              toStringArray(
                item.tags
              ),

            source:
              item.source ==
              null
                ? null
                : String(
                    item.source
                  ),

            source_url:
              item.source_url ==
              null
                ? null
                : String(
                    item.source_url
                  ),

            is_pyq:
              Boolean(
                item.is_pyq
              ),

            appearance_count:
              Number(
                item
                  .appearance_count ||
                0
              ),

            origins:
              parseOrigins(
                item.origins
              ),

            cse_pyq_years:
              toNumberArray(
                item
                  .cse_pyq_years
              ),

            upsc_exam_names:
              toStringArray(
                item
                  .upsc_exam_names
              ),

            upsc_exam_cycles:
              toStringArray(
                item
                  .upsc_exam_cycles
              ),

            upsc_exam_years:
              toNumberArray(
                item
                  .upsc_exam_years
              ),

            state_psc_states:
              toStringArray(
                item
                  .state_psc_states
              ),

            state_psc_names:
              toStringArray(
                item
                  .state_psc_names
              ),

            state_psc_exam_names:
              toStringArray(
                item
                  .state_psc_exam_names
              ),

            state_psc_years:
              toNumberArray(
                item
                  .state_psc_years
              ),

            stored_question_ids:
              storedQuestionIds
                .length >
              0
                ? storedQuestion

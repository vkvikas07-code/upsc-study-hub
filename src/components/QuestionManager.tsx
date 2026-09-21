import {
  useEffect,
  useMemo,
  useState
} from 'react';

import type {
  FormEvent
} from 'react';

import {
  supabase
} from '../lib/supabase';


type QuestionStatus =
  | 'draft'
  | 'published'
  | 'archived';


type Difficulty =
  | 'easy'
  | 'medium'
  | 'hard';


type ExamStage =
  | 'prelims'
  | 'mains';


type QuestionOrigin =
  | 'general'
  | 'upsc'
  | 'state_psc';


type QuestionRow = {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  subject: string;
  difficulty: Difficulty;
  exam_stage: ExamStage;
  paper: string | null;
  topic: string | null;
  tags: string[];
  is_pyq: boolean;
  pyq_year: number | null;

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

  source: string | null;
  source_url: string | null;
  status: QuestionStatus;
  created_at: string;
  updated_at: string;
};


const QUESTION_SELECT = `
  id,
  question,
  options,
  correct_index,
  explanation,
  subject,
  difficulty,
  exam_stage,
  paper,
  topic,
  tags,
  is_pyq,
  pyq_year,
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
  state_psc_paper,
  source,
  source_url,
  status,
  created_at,
  updated_at
`;


const UPSC_EXAMS = [
  'Civil Services Examination',
  'Indian Forest Service Examination',
  'NDA & Naval Academy',
  'Combined Defence Services',
  'CAPF (ACs)',
  'Engineering Services Examination',
  'Combined Geo-Scientist Examination',
  'Indian Economic Service',
  'Indian Statistical Service',
  'Combined Medical Services',
  'CISF AC(EXE) LDCE',
  'Other UPSC Examination'
];


const STATE_PSC_OPTIONS = [
  {
    state: 'Andhra Pradesh',
    psc: 'Andhra Pradesh Public Service Commission'
  },
  {
    state: 'Arunachal Pradesh',
    psc: 'Arunachal Pradesh Public Service Commission'
  },
  {
    state: 'Assam',
    psc: 'Assam Public Service Commission'
  },
  {
    state: 'Bihar',
    psc: 'Bihar Public Service Commission'
  },
  {
    state: 'Chhattisgarh',
    psc: 'Chhattisgarh Public Service Commission'
  },
  {
    state: 'Goa',
    psc: 'Goa Public Service Commission'
  },
  {
    state: 'Gujarat',
    psc: 'Gujarat Public Service Commission'
  },
  {
    state: 'Haryana',
    psc: 'Haryana Public Service Commission'
  },
  {
    state: 'Himachal Pradesh',
    psc: 'Himachal Pradesh Public Service Commission'
  },
  {
    state: 'Jharkhand',
    psc: 'Jharkhand Public Service Commission'
  },
  {
    state: 'Karnataka',
    psc: 'Karnataka Public Service Commission'
  },
  {
    state: 'Kerala',
    psc: 'Kerala Public Service Commission'
  },
  {
    state: 'Madhya Pradesh',
    psc: 'Madhya Pradesh Public Service Commission'
  },
  {
    state: 'Maharashtra',
    psc: 'Maharashtra Public Service Commission'
  },
  {
    state: 'Manipur',
    psc: 'Manipur Public Service Commission'
  },
  {
    state: 'Meghalaya',
    psc: 'Meghalaya Public Service Commission'
  },
  {
    state: 'Mizoram',
    psc: 'Mizoram Public Service Commission'
  },
  {
    state: 'Nagaland',
    psc: 'Nagaland Public Service Commission'
  },
  {
    state: 'Odisha',
    psc: 'Odisha Public Service Commission'
  },
  {
    state: 'Punjab',
    psc: 'Punjab Public Service Commission'
  },
  {
    state: 'Rajasthan',
    psc: 'Rajasthan Public Service Commission'
  },
  {
    state: 'Sikkim',
    psc: 'Sikkim Public Service Commission'
  },
  {
    state: 'Tamil Nadu',
    psc: 'Tamil Nadu Public Service Commission'
  },
  {
    state: 'Telangana',
    psc: 'Telangana Public Service Commission'
  },
  {
    state: 'Tripura',
    psc: 'Tripura Public Service Commission'
  },
  {
    state: 'Uttar Pradesh',
    psc: 'Uttar Pradesh Public Service Commission'
  },
  {
    state: 'Uttarakhand',
    psc: 'Uttarakhand Public Service Commission'
  },
  {
    state: 'West Bengal',
    psc: 'West Bengal Public Service Commission'
  },
  {
    state: 'Other / Union Territory',
    psc: ''
  }
];


function getQuestionOrigin(
  item: QuestionRow
): QuestionOrigin {
  if (
    item.state_psc_state ||
    item.state_psc_name ||
    item.state_psc_exam_name
  ) {
    return 'state_psc';
  }

  if (item.upsc_exam_name) {
    return 'upsc';
  }

  return 'general';
}


export type QuestionManagerView =
  | 'all'
  | 'editor'
  | 'bank';


type QuestionManagerProps = {
  view?: QuestionManagerView;
};


export function QuestionManager({
  view = 'all'
}: QuestionManagerProps) {
  const [questions, setQuestions] =
    useState<QuestionRow[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState('');

  const [question, setQuestion] =
    useState('');

  const [optionA, setOptionA] =
    useState('');

  const [optionB, setOptionB] =
    useState('');

  const [optionC, setOptionC] =
    useState('');

  const [optionD, setOptionD] =
    useState('');

  const [correctIndex, setCorrectIndex] =
    useState(0);

  const [explanation, setExplanation] =
    useState('');

  const [subject, setSubject] =
    useState('Polity');

  const [topic, setTopic] =
    useState('');

  const [paper, setPaper] =
    useState('GS-I');

  const [difficulty, setDifficulty] =
    useState<Difficulty>('medium');

  const [examStage, setExamStage] =
    useState<ExamStage>('prelims');

  const [tagsText, setTagsText] =
    useState('');

  const [isPyq, setIsPyq] =
    useState(false);

  const [pyqYear, setPyqYear] =
    useState('');

  const [questionOrigin, setQuestionOrigin] =
    useState<QuestionOrigin>('general');

  /* Other UPSC exam */

  const [upscExamName, setUpscExamName] =
    useState('');

  const [customUpscExamName, setCustomUpscExamName] =
    useState('');

  const [upscExamCycle, setUpscExamCycle] =
    useState('');

  const [upscExamStage, setUpscExamStage] =
    useState('');

  const [upscExamPaper, setUpscExamPaper] =
    useState('');

  const [upscExamYear, setUpscExamYear] =
    useState('');

  /* State PSC */

  const [statePscState, setStatePscState] =
    useState('');

  const [statePscName, setStatePscName] =
    useState('');

  const [statePscExamName, setStatePscExamName] =
    useState('');

  const [statePscYear, setStatePscYear] =
    useState('');

  const [statePscStage, setStatePscStage] =
    useState('');

  const [statePscPaper, setStatePscPaper] =
    useState('');

  const [source, setSource] =
    useState('');

  const [sourceUrl, setSourceUrl] =
    useState('');

  const [status, setStatus] =
    useState<QuestionStatus>('draft');

  /* Question bank filters */

  const [searchText, setSearchText] =
    useState('');

  const [bankSubject, setBankSubject] =
    useState('all');

  const [bankStatus, setBankStatus] =
    useState<'all' | QuestionStatus>('all');

  const [bankDifficulty, setBankDifficulty] =
    useState<'all' | Difficulty>('all');

  const [bankType, setBankType] =
    useState<'all' | 'practice' | 'pyq'>('all');

  const [bankOrigin, setBankOrigin] =
    useState<'all' | QuestionOrigin>('all');

  /* UPSC filters */

  const [bankUpscExam, setBankUpscExam] =
    useState('all');

  const [bankUpscCycle, setBankUpscCycle] =
    useState('all');

  const [bankUpscYear, setBankUpscYear] =
    useState('all');

  /* State PSC filters */

  const [bankState, setBankState] =
    useState('all');

  const [bankStatePsc, setBankStatePsc] =
    useState('all');

  const [bankStateExam, setBankStateExam] =
    useState('all');

  const [bankStateYear, setBankStateYear] =
    useState('all');


  async function loadQuestions() {
    if (!supabase) {
      setMessage(
        'Supabase is not configured.'
      );
      return;
    }

    setLoading(true);
    setMessage('');

    const { data, error } =
      await supabase
        .from('questions')
        .select(QUESTION_SELECT)
        .order(
          'created_at',
          { ascending: false }
        );

    if (error) {
      console.error(
        'Unable to load questions:',
        error
      );

      setMessage(
        error.message
      );

      setLoading(false);
      return;
    }

    const rows =
      (data || []) as unknown as QuestionRow[];

    const formatted =
      rows.map(
        item => ({
          ...item,
          options:
            Array.isArray(item.options)
              ? item.options
              : [],
          tags:
            Array.isArray(item.tags)
              ? item.tags
              : []
        })
      );

    setQuestions(formatted);
    setLoading(false);
  }


  useEffect(
    () => {
      loadQuestions();
    },
    []
  );


  function clearUpscForm() {
    setUpscExamName('');
    setCustomUpscExamName('');
    setUpscExamCycle('');
    setUpscExamStage('');
    setUpscExamPaper('');
    setUpscExamYear('');
  }


  function clearStatePscForm() {
    setStatePscState('');
    setStatePscName('');
    setStatePscExamName('');
    setStatePscYear('');
    setStatePscStage('');
    setStatePscPaper('');
  }


  function changeQuestionOrigin(
    next: QuestionOrigin
  ) {
    setQuestionOrigin(next);

    if (next === 'general') {
      clearUpscForm();
      clearStatePscForm();
    }

    if (next === 'upsc') {
      clearStatePscForm();
    }

    if (next === 'state_psc') {
      clearUpscForm();
    }
  }


  function resetForm() {
    setEditingId(null);
    setQuestion('');
    setOptionA('');
    setOptionB('');
    setOptionC('');
    setOptionD('');
    setCorrectIndex(0);
    setExplanation('');
    setSubject('Polity');
    setTopic('');
    setPaper('GS-I');
    setDifficulty('medium');
    setExamStage('prelims');
    setTagsText('');
    setIsPyq(false);
    setPyqYear('');
    setQuestionOrigin('general');

    clearUpscForm();
    clearStatePscForm();

    setSource('');
    setSourceUrl('');
    setStatus('draft');
  }


  function startEdit(
    item: QuestionRow
  ) {
    setEditingId(item.id);
    setQuestion(item.question);
    setOptionA(item.options[0] || '');
    setOptionB(item.options[1] || '');
    setOptionC(item.options[2] || '');
    setOptionD(item.options[3] || '');
    setCorrectIndex(item.correct_index);
    setExplanation(item.explanation);
    setSubject(item.subject);
    setTopic(item.topic || '');
    setPaper(item.paper || '');
    setDifficulty(item.difficulty);
    setExamStage(item.exam_stage);
    setTagsText(
      (item.tags || []).join(', ')
    );
    setIsPyq(item.is_pyq);
    setPyqYear(
      item.pyq_year
        ? String(item.pyq_year)
        : ''
    );

    const origin =
      getQuestionOrigin(item);

    setQuestionOrigin(origin);

    if (origin === 'upsc') {
      if (
        item.upsc_exam_name &&
        UPSC_EXAMS.includes(
          item.upsc_exam_name
        )
      ) {
        setUpscExamName(
          item.upsc_exam_name
        );
        setCustomUpscExamName('');
      } else if (
        item.upsc_exam_name
      ) {
        setUpscExamName(
          'Other UPSC Examination'
        );
        setCustomUpscExamName(
          item.upsc_exam_name
        );
      } else {
        setUpscExamName('');
        setCustomUpscExamName('');
      }

      setUpscExamCycle(
        item.upsc_exam_cycle || ''
      );
      setUpscExamStage(
        item.upsc_exam_stage || ''
      );
      setUpscExamPaper(
        item.upsc_exam_paper || ''
      );
      setUpscExamYear(
        item.upsc_exam_year
          ? String(item.upsc_exam_year)
          : ''
      );
    } else {
      clearUpscForm();
    }

    if (origin === 'state_psc') {
      setStatePscState(
        item.state_psc_state || ''
      );
      setStatePscName(
        item.state_psc_name || ''
      );
      setStatePscExamName(
        item.state_psc_exam_name || ''
      );
      setStatePscYear(
        item.state_psc_year
          ? String(item.state_psc_year)
          : ''
      );
      setStatePscStage(
        item.state_psc_stage || ''
      );
      setStatePscPaper(
        item.state_psc_paper || ''
      );
    } else {
      clearStatePscForm();
    }

    setSource(item.source || '');
    setSourceUrl(item.source_url || '');
    setStatus(item.status);

    setMessage(
      'Editing selected question.'
    );

    const mainArea =
      document.querySelector(
        '.main-area'
      );

    mainArea?.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }


  function handleStateSelection(
    nextState: string
  ) {
    setStatePscState(nextState);

    const match =
      STATE_PSC_OPTIONS.find(
        item =>
          item.state === nextState
      );

    setStatePscName(
      match?.psc || ''
    );
  }


  async function saveQuestion(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!supabase) {
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

    if (!question.trim()) {
      setMessage(
        'Enter the question.'
      );
      return;
    }

    if (
      options.some(
        option => !option
      )
    ) {
      setMessage(
        'All four options are required.'
      );
      return;
    }

    if (!explanation.trim()) {
      setMessage(
        'Add an explanation.'
      );
      return;
    }

    if (!subject.trim()) {
      setMessage(
        'Subject is required.'
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

    if (
      questionOrigin === 'upsc'
    ) {
      if (!upscExamName) {
        setMessage(
          'Select the UPSC examination.'
        );
        return;
      }

      if (
        upscExamName ===
          'Other UPSC Examination' &&
        !customUpscExamName.trim()
      ) {
        setMessage(
          'Enter the UPSC examination name.'
        );
        return;
      }

      if (!upscExamYear.trim()) {
        setMessage(
          'Enter the UPSC examination year.'
        );
        return;
      }
    }

    if (
      questionOrigin === 'state_psc'
    ) {
      if (!statePscState.trim()) {
        setMessage(
          'Select the State.'
        );
        return;
      }

      if (!statePscName.trim()) {
        setMessage(
          'Enter the State PSC name.'
        );
        return;
      }

      if (!statePscExamName.trim()) {
        setMessage(
          'Enter the State PSC examination name.'
        );
        return;
      }

      if (!statePscYear.trim()) {
        setMessage(
          'Enter the State PSC examination year.'
        );
        return;
      }
    }

    setSaving(true);

    setMessage(
      editingId
        ? 'Updating question...'
        : 'Saving question...'
    );

    const {
      data: { user }
    } =
      await supabase
        .auth
        .getUser();

    if (!user) {
      setSaving(false);
      setMessage(
        'Admin session expired. Sign in again.'
      );
      return;
    }

    const tags =
      tagsText
        .split(',')
        .map(
          tag => tag.trim()
        )
        .filter(Boolean);

    const resolvedUpscExamName =
      upscExamName ===
        'Other UPSC Examination'
        ? customUpscExamName.trim()
        : upscExamName.trim();

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
      difficulty,
      exam_stage:
        examStage,
      paper:
        paper.trim() || null,
      topic:
        topic.trim() || null,
      tags,
      is_pyq:
        isPyq,
      pyq_year:
        isPyq && pyqYear.trim()
          ? Number(pyqYear)
          : null,

      upsc_exam_name:
        questionOrigin === 'upsc'
          ? resolvedUpscExamName || null
          : null,
      upsc_exam_cycle:
        questionOrigin === 'upsc'
          ? upscExamCycle.trim() || null
          : null,
      upsc_exam_stage:
        questionOrigin === 'upsc'
          ? upscExamStage.trim() || null
          : null,
      upsc_exam_paper:
        questionOrigin === 'upsc'
          ? upscExamPaper.trim() || null
          : null,
      upsc_exam_year:
        questionOrigin === 'upsc' &&
        upscExamYear.trim()
          ? Number(upscExamYear)
          : null,

      state_psc_state:
        questionOrigin === 'state_psc'
          ? statePscState.trim() || null
          : null,
      state_psc_name:
        questionOrigin === 'state_psc'
          ? statePscName.trim() || null
          : null,
      state_psc_exam_name:
        questionOrigin === 'state_psc'
          ? statePscExamName.trim() || null
          : null,
      state_psc_year:
        questionOrigin === 'state_psc' &&
        statePscYear.trim()
          ? Number(statePscYear)
          : null,
      state_psc_stage:
        questionOrigin === 'state_psc'
          ? statePscStage.trim() || null
          : null,
      state_psc_paper:
        questionOrigin === 'state_psc'
          ? statePscPaper.trim() || null
          : null,

      source:
        source.trim() || null,
      source_url:
        sourceUrl.trim() || null,
      status,
      updated_at:
        new Date().toISOString()
    };

    if (editingId) {
      const { data, error } =
        await supabase
          .from('questions')
          .update(payload)
          .eq('id', editingId)
          .select(QUESTION_SELECT)
          .single();

      if (
        error ||
        !data
      ) {
        console.error(
          'Question update failed:',
          error
        );
        setSaving(false);
        setMessage(
          error?.message ||
          'Question update failed.'
        );
        return;
      }

      const rawUpdated =
        data as unknown as QuestionRow;

      const updated: QuestionRow = {
        ...rawUpdated,
        options:
          Array.isArray(rawUpdated.options)
            ? rawUpdated.options
            : [],
        tags:
          Array.isArray(rawUpdated.tags)
            ? rawUpdated.tags
            : []
      };

      setQuestions(
        current =>
          current.map(
            item =>
              item.id === updated.id
                ? updated
                : item
          )
      );

      setSaving(false);
      resetForm();
      setMessage(
        'Question updated successfully.'
      );
      return;
    }

    const { data, error } =
      await supabase
        .from('questions')
        .insert({
          ...payload,
          created_by:
            user.id
        })
        .select(QUESTION_SELECT)
        .single();

    if (
      error ||
      !data
    ) {
      console.error(
        'Question creation failed:',
        error
      );
      setSaving(false);
      setMessage(
        error?.message ||
        'Unable to save question.'
      );
      return;
    }

    const rawCreated =
      data as unknown as QuestionRow;

    const created: QuestionRow = {
      ...rawCreated,
      options:
        Array.isArray(rawCreated.options)
          ? rawCreated.options
          : [],
      tags:
        Array.isArray(rawCreated.tags)
          ? rawCreated.tags
          : []
    };

    setQuestions(
      current => [
        created,
        ...current
      ]
    );

    setSaving(false);
    resetForm();

    setMessage(
      created.status === 'published'
        ? 'Question published successfully.'
        : 'Question saved as draft.'
    );
  }


  async function changeStatus(
    item: QuestionRow,
    nextStatus: QuestionStatus
  ) {
    if (!supabase) {
      return;
    }

    const { data, error } =
      await supabase
        .from('questions')
        .update({
          status: nextStatus,
          updated_at:
            new Date().toISOString()
        })
        .eq('id', item.id)
        .select(QUESTION_SELECT)
        .single();

    if (
      error ||
      !data
    ) {
      setMessage(
        error?.message ||
        'Unable to change question status.'
      );
      return;
    }

    const rawUpdated =
      data as unknown as QuestionRow;

    const updated: QuestionRow = {
      ...rawUpdated,
      options:
        Array.isArray(rawUpdated.options)
          ? rawUpdated.options
          : [],
      tags:
        Array.isArray(rawUpdated.tags)
          ? rawUpdated.tags
          : []
    };

    setQuestions(
      current =>
        current.map(
          questionItem =>
            questionItem.id === updated.id
              ? updated
              : questionItem
        )
    );

    setMessage(
      `Question changed to ${nextStatus}.`
    );
  }


  async function deleteQuestion(
    item: QuestionRow
  ) {
    if (!supabase) {
      return;
    }

    const confirmed =
      window.confirm(
        'Delete this question permanently?'
      );

    if (!confirmed) {
      return;
    }

    const { error } =
      await supabase
        .from('questions')
        .delete()
        .eq('id', item.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setQuestions(
      current =>
        current.filter(
          questionItem =>
            questionItem.id !== item.id
        )
    );

    if (
      editingId === item.id
    ) {
      resetForm();
    }

    setMessage(
      'Question deleted.'
    );
  }


  const subjects =
    useMemo(
      () =>
        Array.from(
          new Set(
            questions
              .map(item => item.subject)
              .filter(Boolean)
          )
        ).sort(),
      [questions]
    );


  const upscExamOptions =
    useMemo(
      () =>
        Array.from(
          new Set(
            questions
              .map(
                item => item.upsc_exam_name
              )
              .filter(
                (value): value is string =>
                  Boolean(value)
              )
          )
        ).sort(),
      [questions]
    );


  const upscYearOptions =
    useMemo(
      () =>
        Array.from(
          new Set(
            questions
              .filter(
                item =>
                  bankUpscExam === 'all' ||
                  item.upsc_exam_name ===
                    bankUpscExam
              )
              .map(
                item => item.upsc_exam_year
              )
              .filter(
                (value): value is number =>
                  value !== null
              )
          )
        ).sort(
          (a, b) => b - a
        ),
      [
        questions,
        bankUpscExam
      ]
    );


  const stateOptions =
    useMemo(
      () =>
        Array.from(
          new Set(
            questions
              .map(
                item => item.state_psc_state
              )
              .filter(
                (value): value is string =>
                  Boolean(value)
              )
          )
        ).sort(),
      [questions]
    );


  const statePscNameOptions =
    useMemo(
      () =>
        Array.from(
          new Set(
            questions
              .filter(
                item =>
                  bankState === 'all' ||
                  item.state_psc_state ===
                    bankState
              )
              .map(
                item => item.state_psc_name
              )
              .filter(
                (value): value is string =>
                  Boolean(value)
              )
          )
        ).sort(),
      [
        questions,
        bankState
      ]
    );


  const stateExamOptions =
    useMemo(
      () =>
        Array.from(
          new Set(
            questions
              .filter(
                item =>
                  (
                    bankState === 'all' ||
                    item.state_psc_state ===
                      bankState
                  ) &&
                  (
                    bankStatePsc === 'all' ||
                    item.state_psc_name ===
                      bankStatePsc
                  )
              )
              .map(
                item =>
                  item.state_psc_exam_name
              )
              .filter(
                (value): value is string =>
                  Boolean(value)
              )
          )
        ).sort(),
      [
        questions,
        bankState,
        bankStatePsc
      ]
    );


  const stateYearOptions =
    useMemo(
      () =>
        Array.from(
          new Set(
            questions
              .filter(
                item =>
                  (
                    bankState === 'all' ||
                    item.state_psc_state ===
                      bankState
                  ) &&
                  (
                    bankStatePsc === 'all' ||
                    item.state_psc_name ===
                      bankStatePsc
                  ) &&
                  (
                    bankStateExam === 'all' ||
                    item.state_psc_exam_name ===
                      bankStateExam
                  )
              )
              .map(
                item => item.state_psc_year
              )
              .filter(
                (value): value is number =>
                  value !== null
              )
          )
        ).sort(
          (a, b) => b - a
        ),
      [
        questions,
        bankState,
        bankStatePsc,
        bankStateExam
      ]
    );


  const filteredQuestions =
    useMemo(
      () =>
        questions.filter(
          item => {
            const search =
              searchText
                .trim()
                .toLowerCase();

            const origin =
              getQuestionOrigin(item);

            const matchesSearch =
              !search ||
              item.question
                .toLowerCase()
                .includes(search) ||
              item.subject
                .toLowerCase()
                .includes(search) ||
              (item.topic || '')
                .toLowerCase()
                .includes(search) ||
              (item.source || '')
                .toLowerCase()
                .includes(search) ||
              (item.upsc_exam_name || '')
                .toLowerCase()
                .includes(search) ||
              (item.upsc_exam_cycle || '')
                .toLowerCase()
                .includes(search) ||
              (item.upsc_exam_stage || '')
                .toLowerCase()
                .includes(search) ||
              (item.upsc_exam_paper || '')
                .toLowerCase()
                .includes(search) ||
              String(
                item.upsc_exam_year || ''
              ).includes(search) ||
              (item.state_psc_state || '')
                .toLowerCase()
                .includes(search) ||
              (item.state_psc_name || '')
                .toLowerCase()
                .includes(search) ||
              (item.state_psc_exam_name || '')
                .toLowerCase()
                .includes(search) ||
              (item.state_psc_stage || '')
                .toLowerCase()
                .includes(search) ||
              (item.state_psc_paper || '')
                .toLowerCase()
                .includes(search) ||
              String(
                item.state_psc_year || ''
              ).includes(search);

            const matchesSubject =
              bankSubject === 'all' ||
              item.subject === bankSubject;

            const matchesStatus =
              bankStatus === 'all' ||
              item.status === bankStatus;

            const matchesDifficulty =
              bankDifficulty === 'all' ||
              item.difficulty ===
                bankDifficulty;

            const matchesType =
              bankType === 'all' ||
              (
                bankType === 'pyq' &&
                item.is_pyq
              ) ||
              (
                bankType === 'practice' &&
                !item.is_pyq
              );

            const matchesOrigin =
              bankOrigin === 'all' ||
              origin === bankOrigin;

            const matchesUpscExam =
              bankUpscExam === 'all' ||
              item.upsc_exam_name ===
                bankUpscExam;

            const matchesUpscCycle =
              bankUpscCycle === 'all' ||
              item.upsc_exam_cycle ===
                bankUpscCycle;

            const matchesUpscYear =
              bankUpscYear === 'all' ||
              String(
                item.upsc_exam_year || ''
              ) === bankUpscYear;

            const matchesState =
              bankState === 'all' ||
              item.state_psc_state ===
                bankState;

            const matchesStatePsc =
              bankStatePsc === 'all' ||
              item.state_psc_name ===
                bankStatePsc;

            const matchesStateExam =
              bankStateExam === 'all' ||
              item.state_psc_exam_name ===
                bankStateExam;

            const matchesStateYear =
              bankStateYear === 'all' ||
              String(
                item.state_psc_year || ''
              ) === bankStateYear;

            const upscFiltersPass =
              bankOrigin !== 'upsc' ||
              (
                matchesUpscExam &&
                matchesUpscCycle &&
                matchesUpscYear
              );

            const stateFiltersPass =
              bankOrigin !== 'state_psc' ||
              (
                matchesState &&
                matchesStatePsc &&
                matchesStateExam &&
                matchesStateYear
              );

            return (
              matchesSearch &&
              matchesSubject &&
              matchesStatus &&
              matchesDifficulty &&
              matchesType &&
              matchesOrigin &&
              upscFiltersPass &&
              stateFiltersPass
            );
          }
        ),
      [
        questions,
        searchText,
        bankSubject,
        bankStatus,
        bankDifficulty,
        bankType,
        bankOrigin,
        bankUpscExam,
        bankUpscCycle,
        bankUpscYear,
        bankState,
        bankStatePsc,
        bankStateExam,
        bankStateYear
      ]
    );


  function clearFilters() {
    setSearchText('');
    setBankSubject('all');
    setBankStatus('all');
    setBankDifficulty('all');
    setBankType('all');
    setBankOrigin('all');

    setBankUpscExam('all');
    setBankUpscCycle('all');
    setBankUpscYear('all');

    setBankState('all');
    setBankStatePsc('all');
    setBankStateExam('all');
    setBankStateYear('all');
  }


  return (
    <section
      style={{
        marginTop: '30px'
      }}
    >
      {/* CREATE / EDIT MCQ */}

      <div
        className="panel admin-form"
        style={{
          display:
            view === 'bank'
              ? 'none'
              : 'block'
        }}
      >
        <span className="eyebrow">
          MCQ QUESTION MANAGER
        </span>

        <h2>
          {editingId
            ? 'Edit MCQ'
            : 'Create MCQ'}
        </h2>

        <form
          onSubmit={saveQuestion}
        >
          <label>
            Question

            <textarea
              value={question}
              onChange={
                event =>
                  setQuestion(
                    event.target.value
                  )
              }
              rows={4}
              placeholder="Enter UPSC-style or State PSC-style MCQ question"
            />
          </label>

          <label>
            Option A
            <input
              value={optionA}
              onChange={
                event =>
                  setOptionA(
                    event.target.value
                  )
              }
            />
          </label>

          <label>
            Option B
            <input
              value={optionB}
              onChange={
                event =>
                  setOptionB(
                    event.target.value
                  )
              }
            />
          </label>

          <label>
            Option C
            <input
              value={optionC}
              onChange={
                event =>
                  setOptionC(
                    event.target.value
                  )
              }
            />
          </label>

          <label>
            Option D
            <input
              value={optionD}
              onChange={
                event =>
                  setOptionD(
                    event.target.value
                  )
              }
            />
          </label>

          <label>
            Correct Answer

            <select
              value={correctIndex}
              onChange={
                event =>
                  setCorrectIndex(
                    Number(
                      event.target.value
                    )
                  )
              }
            >
              <option value={0}>A</option>
              <option value={1}>B</option>
              <option value={2}>C</option>
              <option value={3}>D</option>
            </select>
          </label>

          <label>
            Explanation

            <textarea
              value={explanation}
              onChange={
                event =>
                  setExplanation(
                    event.target.value
                  )
              }
              rows={5}
              placeholder="Explain why the correct answer is correct."
            />
          </label>

          <div className="form-two">
            <label>
              Subject

              <select
                value={subject}
                onChange={
                  event =>
                    setSubject(
                      event.target.value
                    )
                }
              >
                <option>Polity</option>
                <option>History</option>
                <option>Geography</option>
                <option>Economy</option>
                <option>Environment</option>
                <option>Science & Tech</option>
                <option>Current Affairs</option>
              </select>
            </label>

            <label>
              Difficulty

              <select
                value={difficulty}
                onChange={
                  event =>
                    setDifficulty(
                      event.target.value as Difficulty
                    )
                }
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
          </div>

          <div className="form-two">
            <label>
              Exam Stage

              <select
                value={examStage}
                onChange={
                  event =>
                    setExamStage(
                      event.target.value as ExamStage
                    )
                }
              >
                <option value="prelims">Prelims</option>
                <option value="mains">Mains</option>
              </select>
            </label>

            <label>
              Paper

              <input
                value={paper}
                onChange={
                  event =>
                    setPaper(
                      event.target.value
                    )
                }
                placeholder="GS-I / GS-II / General Studies..."
              />
            </label>
          </div>

          <label>
            Topic

            <input
              value={topic}
              onChange={
                event =>
                  setTopic(
                    event.target.value
                  )
              }
              placeholder="Fundamental Rights / Monsoon / Inflation..."
            />
          </label>

          <label>
            Tags

            <input
              value={tagsText}
              onChange={
                event =>
                  setTagsText(
                    event.target.value
                  )
              }
              placeholder="Constitution, Article 21, Prelims"
            />

            <small>
              Separate tags using commas.
            </small>
          </label>

          <label>
            Source

            <input
              value={source}
              onChange={
                event =>
                  setSource(
                    event.target.value
                  )
              }
              placeholder="NCERT / Laxmikanth / UPSC / State PSC..."
            />
          </label>

          <label>
            Source URL

            <input
              type="url"
              value={sourceUrl}
              onChange={
                event =>
                  setSourceUrl(
                    event.target.value
                  )
              }
              placeholder="https://..."
            />
          </label>

          <div className="checkbox-row">
            <label>
              <input
                type="checkbox"
                checked={isPyq}
                onChange={
                  event =>
                    setIsPyq(
                      event.target.checked
                    )
                }
              />

              Previous Year Question
            </label>
          </div>

          {isPyq && (
            <label>
              PYQ Year

              <input
                type="number"
                min="1950"
                max="2100"
                value={pyqYear}
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

          {/* QUESTION ORIGIN */}

          <div
            style={{
              marginTop: '20px',
              padding: '18px',
              border:
                '1px solid rgba(255,255,255,.10)',
              borderRadius: '14px'
            }}
          >
            <span className="eyebrow">
              QUESTION ORIGIN
            </span>

            <h3
              style={{
                marginTop: '6px'
              }}
            >
              Examination Source
            </h3>

            <label>
              Question Origin

              <select
                value={questionOrigin}
                onChange={
                  event =>
                    changeQuestionOrigin(
                      event.target.value as QuestionOrigin
                    )
                }
              >
                <option value="general">
                  CSE / General Practice
                </option>

                <option value="upsc">
                  Other UPSC Examination
                </option>

                <option value="state_psc">
                  State PSC Examination
                </option>
              </select>
            </label>
          </div>

          {/* OTHER UPSC EXAM */}

          {questionOrigin === 'upsc' && (
            <div
              style={{
                marginTop: '16px',
                padding: '18px',
                border:
                  '1px solid rgba(255,255,255,.10)',
                borderRadius: '14px'
              }}
            >
              <span className="eyebrow">
                UPSC VALUE ADDITION
              </span>

              <h3
                style={{
                  marginTop: '6px'
                }}
              >
                Other UPSC Examination Reference
              </h3>

              <label>
                UPSC Examination

                <select
                  value={upscExamName}
                  onChange={
                    event => {
                      const next =
                        event.target.value;

                      setUpscExamName(next);

                      if (
                        next !==
                        'Other UPSC Examination'
                      ) {
                        setCustomUpscExamName('');
                      }
                    }
                  }
                >
                  <option value="">
                    Select UPSC exam
                  </option>

                  {UPSC_EXAMS.map(
                    exam => (
                      <option
                        key={exam}
                        value={exam}
                      >
                        {exam}
                      </option>
                    )
                  )}
                </select>
              </label>

              {upscExamName ===
                'Other UPSC Examination' && (
                <label>
                  Examination Name

                  <input
                    value={customUpscExamName}
                    onChange={
                      event =>
                        setCustomUpscExamName(
                          event.target.value
                        )
                    }
                    placeholder="Write UPSC examination name"
                  />
                </label>
              )}

              <div className="form-two">
                <label>
                  Exam Cycle

                  <select
                    value={upscExamCycle}
                    onChange={
                      event =>
                        setUpscExamCycle(
                          event.target.value
                        )
                    }
                  >
                    <option value="">
                      Not applicable
                    </option>
                    <option value="I">I</option>
                    <option value="II">II</option>
                  </select>
                </label>

                <label>
                  Examination Year

                  <input
                    type="number"
                    min="1950"
                    max="2100"
                    value={upscExamYear}
                    onChange={
                      event =>
                        setUpscExamYear(
                          event.target.value
                        )
                    }
                    placeholder="2025"
                  />
                </label>
              </div>

              <div className="form-two">
                <label>
                  Exam Stage

                  <input
                    value={upscExamStage}
                    onChange={
                      event =>
                        setUpscExamStage(
                          event.target.value
                        )
                    }
                    placeholder="Preliminary / Written / Main..."
                  />
                </label>

                <label>
                  Paper / Subject

                  <input
                    value={upscExamPaper}
                    onChange={
                      event =>
                        setUpscExamPaper(
                          event.target.value
                        )
                    }
                    placeholder="GAT / General Knowledge / Paper-I..."
                  />
                </label>
              </div>
            </div>
          )}

          {/* STATE PSC */}

          {questionOrigin === 'state_psc' && (
            <div
              style={{
                marginTop: '16px',
                padding: '18px',
                border:
                  '1px solid rgba(255,255,255,.10)',
                borderRadius: '14px'
              }}
            >
              <span className="eyebrow">
                STATE PSC VALUE ADDITION
              </span>

              <h3
                style={{
                  marginTop: '6px'
                }}
              >
                State Public Service Commission Question
              </h3>

              <p>
                All 28 States are included. Select the State,
                confirm or edit the PSC name, and write the exact
                examination name.
              </p>

              <div className="form-two">
                <label>
                  State

                  <select
                    value={statePscState}
                    onChange={
                      event =>
                        handleStateSelection(
                          event.target.value
                        )
                    }
                  >
                    <option value="">
                      Select State
                    </option>

                    {STATE_PSC_OPTIONS.map(
                      item => (
                        <option
                          key={item.state}
                          value={item.state}
                        >
                          {item.state}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label>
                  State PSC Name

                  <input
                    value={statePscName}
                    onChange={
                      event =>
                        setStatePscName(
                          event.target.value
                        )
                    }
                    placeholder="Public Service Commission name"
                  />

                  <small>
                    Auto-filled from State selection, but editable.
                  </small>
                </label>
              </div>

              <label>
                Examination Name

                <input
                  value={statePscExamName}
                  onChange={
                    event =>
                      setStatePscExamName(
                        event.target.value
                      )
                  }
                  placeholder="State Services / Group B / Combined Competitive / other exam..."
                />

                <small>
                  Fully editable so any examination conducted by that State PSC can be entered.
                </small>
              </label>

              <div className="form-two">
                <label>
                  Examination Year

                  <input
                    type="number"
                    min="1950"
                    max="2100"
                    value={statePscYear}
                    onChange={
                      event =>
                        setStatePscYear(
                          event.target.value
                        )
                    }
                    placeholder="2025"
                  />
                </label>

                <label>
                  Stage

                  <input
                    value={statePscStage}
                    onChange={
                      event =>
                        setStatePscStage(
                          event.target.value
                        )
                    }
                    placeholder="Preliminary / Screening Test..."
                  />
                </label>
              </div>

              <label>
                Paper / Subject

                <input
                  value={statePscPaper}
                  onChange={
                    event =>
                      setStatePscPaper(
                        event.target.value
                      )
                  }
                  placeholder="General Studies-I / Paper-I / General Knowledge..."
                />
              </label>
            </div>
          )}

          <label>
            Status

            <select
              value={status}
              onChange={
                event =>
                  setStatus(
                    event.target.value as QuestionStatus
                  )
              }
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>

          <div
            style={{
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap',
              marginTop: '16px'
            }}
          >
            <button
              className="primary-btn"
              type="submit"
              disabled={saving}
            >
              {saving
                ? 'Saving...'
                : editingId
                ? 'Save changes'
                : status === 'published'
                ? 'Publish question'
                : 'Save draft'}
            </button>

            {editingId && (
              <button
                type="button"
                className="secondary-btn"
                onClick={resetForm}
              >
                Cancel edit
              </button>
            )}
          </div>

          {message && (
            <p className="form-message">
              {message}
            </p>
          )}
        </form>
      </div>

      {/* QUESTION BANK */}

      <div
        className="panel admin-form"
        style={{
          display:
            view === 'editor'
              ? 'none'
              : 'block',
          marginTop:
            view === 'bank'
              ? '0'
              : '22px'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <div>
            <span className="eyebrow">
              QUESTION BANK
            </span>

            <h2>
              Existing MCQs
            </h2>
          </div>

          <button
            type="button"
            className="secondary-btn"
            onClick={loadQuestions}
          >
            Refresh questions
          </button>
        </div>

        <div
          style={{
            marginTop: '18px'
          }}
        >
          <label>
            Search Question Bank

            <input
              type="search"
              value={searchText}
              onChange={
                event =>
                  setSearchText(
                    event.target.value
                  )
              }
              placeholder="Search question, subject, UPSC exam, State, PSC, exam name, year or source..."
            />
          </label>
        </div>

        <div className="form-two">
          <label>
            Question Origin

            <select
              value={bankOrigin}
              onChange={
                event => {
                  const next =
                    event.target.value as
                      | 'all'
                      | QuestionOrigin;

                  setBankOrigin(next);

                  setBankUpscExam('all');
                  setBankUpscCycle('all');
                  setBankUpscYear('all');

                  setBankState('all');
                  setBankStatePsc('all');
                  setBankStateExam('all');
                  setBankStateYear('all');
                }
              }
            >
              <option value="all">
                All Origins
              </option>
              <option value="general">
                CSE / General Practice
              </option>
              <option value="upsc">
                Other UPSC Exams
              </option>
              <option value="state_psc">
                State PSC Exams
              </option>
            </select>
          </label>

          <label>
            Subject

            <select
              value={bankSubject}
              onChange={
                event =>
                  setBankSubject(
                    event.target.value
                  )
              }
            >
              <option value="all">
                All Subjects
              </option>

              {subjects.map(
                item => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                )
              )}
            </select>
          </label>
        </div>

        <div className="form-two">
          <label>
            Status

            <select
              value={bankStatus}
              onChange={
                event =>
                  setBankStatus(
                    event.target.value as
                      | 'all'
                      | QuestionStatus
                  )
              }
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>

          <label>
            Difficulty

            <select
              value={bankDifficulty}
              onChange={
                event =>
                  setBankDifficulty(
                    event.target.value as
                      | 'all'
                      | Difficulty
                  )
              }
            >
              <option value="all">All Difficulty</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
        </div>

        <label>
          Question Type

          <select
            value={bankType}
            onChange={
              event =>
                setBankType(
                  event.target.value as
                    | 'all'
                    | 'practice'
                    | 'pyq'
                )
            }
          >
            <option value="all">
              All Questions
            </option>
            <option value="practice">
              Practice
            </option>
            <option value="pyq">
              Previous Year Questions
            </option>
          </select>
        </label>

        {/* UPSC FILTERS */}

        {bankOrigin === 'upsc' && (
          <div
            style={{
              marginTop: '18px',
              padding: '16px',
              border:
                '1px solid rgba(255,255,255,.10)',
              borderRadius: '14px'
            }}
          >
            <span className="eyebrow">
              UPSC EXAM FILTER
            </span>

            <div
              className="form-two"
              style={{
                marginTop: '10px'
              }}
            >
              <label>
                Examination

                <select
                  value={bankUpscExam}
                  onChange={
                    event => {
                      setBankUpscExam(
                        event.target.value
                      );
                      setBankUpscYear('all');
                    }
                  }
                >
                  <option value="all">
                    All UPSC Exams
                  </option>

                  {upscExamOptions.map(
                    exam => (
                      <option
                        key={exam}
                        value={exam}
                      >
                        {exam}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                Exam Cycle

                <select
                  value={bankUpscCycle}
                  onChange={
                    event =>
                      setBankUpscCycle(
                        event.target.value
                      )
                  }
                >
                  <option value="all">
                    All Cycles
                  </option>
                  <option value="I">I</option>
                  <option value="II">II</option>
                </select>
              </label>
            </div>

            <label>
              Examination Year

              <select
                value={bankUpscYear}
                onChange={
                  event =>
                    setBankUpscYear(
                      event.target.value
                    )
                }
              >
                <option value="all">
                  All Years
                </option>

                {upscYearOptions.map(
                  year => (
                    <option
                      key={year}
                      value={String(year)}
                    >
                      {year}
                    </option>
                  )
                )}
              </select>
            </label>
          </div>
        )}

        {/* STATE PSC FILTERS */}

        {bankOrigin === 'state_psc' && (
          <div
            style={{
              marginTop: '18px',
              padding: '16px',
              border:
                '1px solid rgba(255,255,255,.10)',
              borderRadius: '14px'
            }}
          >
            <span className="eyebrow">
              STATE PSC FILTER
            </span>

            <div
              className="form-two"
              style={{
                marginTop: '10px'
              }}
            >
              <label>
                State

                <select
                  value={bankState}
                  onChange={
                    event => {
                      setBankState(
                        event.target.value
                      );
                      setBankStatePsc('all');
                      setBankStateExam('all');
                      setBankStateYear('all');
                    }
                  }
                >
                  <option value="all">
                    All States
                  </option>

                  {stateOptions.map(
                    state => (
                      <option
                        key={state}
                        value={state}
                      >
                        {state}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                State PSC

                <select
                  value={bankStatePsc}
                  onChange={
                    event => {
                      setBankStatePsc(
                        event.target.value
                      );
                      setBankStateExam('all');
                      setBankStateYear('all');
                    }
                  }
                >
                  <option value="all">
                    All State PSCs
                  </option>

                  {statePscNameOptions.map(
                    psc => (
                      <option
                        key={psc}
                        value={psc}
                      >
                        {psc}
                      </option>
                    )
                  )}
                </select>
              </label>
            </div>

            <div className="form-two">
              <label>
                Examination Name

                <select
                  value={bankStateExam}
                  onChange={
                    event => {
                      setBankStateExam(
                        event.target.value
                      );
                      setBankStateYear('all');
                    }
                  }
                >
                  <option value="all">
                    All Examinations
                  </option>

                  {stateExamOptions.map(
                    exam => (
                      <option
                        key={exam}
                        value={exam}
                      >
                        {exam}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                Examination Year

                <select
                  value={bankStateYear}
                  onChange={
                    event =>
                      setBankStateYear(
                        event.target.value
                      )
                  }
                >
                  <option value="all">
                    All Years
                  </option>

                  {stateYearOptions.map(
                    year => (
                      <option
                        key={year}
                        value={String(year)}
                      >
                        {year}
                      </option>
                    )
                  )}
                </select>
              </label>
            </div>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            marginTop: '14px'
          }}
        >
          <p>
            Showing{' '}
            <strong>
              {filteredQuestions.length}
            </strong>{' '}
            of{' '}
            <strong>
              {questions.length}
            </strong>{' '}
            questions
          </p>

          <button
            type="button"
            className="secondary-btn"
            onClick={clearFilters}
          >
            Clear Filters
          </button>
        </div>

        {loading && (
          <p>
            Loading questions...
          </p>
        )}

        {!loading &&
          questions.length === 0 && (
          <p>
            No MCQs created yet.
          </p>
        )}

        {!loading &&
          questions.length > 0 &&
          filteredQuestions.length === 0 && (
          <div className="callout">
            <strong>
              No questions match these filters.
            </strong>

            <p>
              Clear the filters or try another search.
            </p>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gap: '14px',
            marginTop: '18px'
          }}
        >
          {filteredQuestions.map(
            item => {
              const origin =
                getQuestionOrigin(item);

              return (
                <article
                  key={item.id}
                  style={{
                    border:
                      '1px solid rgba(255,255,255,.10)',
                    borderRadius: '14px',
                    padding: '18px'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '18px',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div
                      style={{
                        flex: '1 1 500px'
                      }}
                    >
                      <span className="eyebrow">
                        {item.subject}
                        {' • '}
                        {item.difficulty}
                      </span>

                      <h3>
                        {item.question}
                      </h3>

                      <div className="tag-row">
                        <span className="tag">
                          {item.status}
                        </span>

                        <span className="tag">
                          {item.exam_stage}
                        </span>

                        <span className="tag">
                          {origin === 'general'
                            ? 'CSE / General'
                            : origin === 'upsc'
                            ? 'UPSC Value Add'
                            : 'State PSC'}
                        </span>

                        {item.topic && (
                          <span className="tag">
                            {item.topic}
                          </span>
                        )}

                        {item.is_pyq && (
                          <span className="tag">
                            PYQ{' '}
                            {item.pyq_year || ''}
                          </span>
                        )}

                        {origin === 'upsc' &&
                          item.upsc_exam_name && (
                          <span className="tag">
                            {item.upsc_exam_name}
                          </span>
                        )}

                        {origin === 'upsc' &&
                          item.upsc_exam_cycle && (
                          <span className="tag">
                            Cycle {item.upsc_exam_cycle}
                          </span>
                        )}

                        {origin === 'upsc' &&
                          item.upsc_exam_year && (
                          <span className="tag">
                            {item.upsc_exam_year}
                          </span>
                        )}

                        {origin === 'upsc' &&
                          item.upsc_exam_stage && (
                          <span className="tag">
                            {item.upsc_exam_stage}
                          </span>
                        )}

                        {origin === 'upsc' &&
                          item.upsc_exam_paper && (
                          <span className="tag">
                            {item.upsc_exam_paper}
                          </span>
                        )}

                        {origin === 'state_psc' &&
                          item.state_psc_state && (
                          <span className="tag">
                            {item.state_psc_state}
                          </span>
                        )}

                        {origin === 'state_psc' &&
                          item.state_psc_name && (
                          <span className="tag">
                            {item.state_psc_name}
                          </span>
                        )}

                        {origin === 'state_psc' &&
                          item.state_psc_exam_name && (
                          <span className="tag">
                            {item.state_psc_exam_name}
                          </span>
                        )}

                        {origin === 'state_psc' &&
                          item.state_psc_year && (
                          <span className="tag">
                            {item.state_psc_year}
                          </span>
                        )}

                        {origin === 'state_psc' &&
                          item.state_psc_stage && (
                          <span className="tag">
                            {item.state_psc_stage}
                          </span>
                        )}

                        {origin === 'state_psc' &&
                          item.state_psc_paper && (
                          <span className="tag">
                            {item.state_psc_paper}
                          </span>
                        )}
                      </div>

                      <p>
                        Correct answer:{' '}
                        <strong>
                          {String.fromCharCode(
                            65 + item.correct_index
                          )}
                        </strong>
                      </p>

                      {item.source && (
                        <p>
                          Source: {item.source}
                        </p>
                      )}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: '8px',
                        flexWrap: 'wrap',
                        alignItems: 'flex-start'
                      }}
                    >
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() =>
                          startEdit(item)
                        }
                      >
                        Edit
                      </button>

                      {item.status !== 'published' && (
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() =>
                            changeStatus(
                              item,
                              'published'
                            )
                          }
                        >
                          Publish
                        </button>
                      )}

                      {item.status !== 'draft' && (
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() =>
                            changeStatus(
                              item,
                              'draft'
                            )
                          }
                        >
                          Draft
                        </button>
                      )}

                      {item.status !== 'archived' && (
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() =>
                            changeStatus(
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
                        className="secondary-btn"
                        onClick={() =>
                          deleteQuestion(item)
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            }
          )}
        </div>
      </div>
    </section>
  );
}

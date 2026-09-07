import { useEffect, useMemo, useState } from 'react';

import { TopBar } from '../components/TopBar';
import { supabase } from '../lib/supabase';

type SectionType =
  | 'gs'
  | 'optional';

type QuestionType =
  | 'practice'
  | 'pyq';

type MainsQuestion = {
  id: string;
  question: string;

  question_type: QuestionType;
  section_type: SectionType;

  gs_paper: string | null;

  optional_subject: string | null;
  optional_paper: string | null;

  subject: string;
  topic: string | null;
  syllabus_link: string | null;

  directive: string | null;

  marks: number | null;
  word_limit: number | null;

  pyq_year: number | null;

  answer_framework: string | null;
  key_points: string | null;

  introduction_hint: string | null;
  conclusion_hint: string | null;

  source: string | null;
  source_url: string | null;

  tags: string[];

  difficulty: string;

  created_at: string;
};

type MainSectionFilter =
  | 'all'
  | 'gs'
  | 'optional';

type TypeFilter =
  | 'all'
  | 'practice'
  | 'pyq';

export function MainsPracticePage() {
  const [
    questions,
    setQuestions
  ] = useState<MainsQuestion[]>([]);

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    error,
    setError
  ] = useState('');

  const [
    sectionFilter,
    setSectionFilter
  ] =
    useState<MainSectionFilter>('all');

  const [
    gsFilter,
    setGsFilter
  ] =
    useState('all');

  const [
    typeFilter,
    setTypeFilter
  ] =
    useState<TypeFilter>('all');

  const [
    optionalSubjectFilter,
    setOptionalSubjectFilter
  ] =
    useState('all');

  const [
    optionalPaperFilter,
    setOptionalPaperFilter
  ] =
    useState('all');

  const [
    marksFilter,
    setMarksFilter
  ] =
    useState('all');

  const [
    yearFilter,
    setYearFilter
  ] =
    useState('all');

  const [
    searchText,
    setSearchText
  ] =
    useState('');

  const [
    expandedId,
    setExpandedId
  ] =
    useState<string | null>(
      null
    );

  async function loadQuestions() {
    if (!supabase) {
      setError(
        'Mains question database is not configured.'
      );

      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const {
      data,
      error: loadError
    } =
      await supabase
        .from(
          'mains_questions'
        )
        .select(`
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
          source,
          source_url,
          tags,
          difficulty,
          created_at
        `)
        .eq(
          'status',
          'published'
        )
        .order(
          'created_at',
          {
            ascending:
              false
          }
        );

    if (loadError) {
      console.error(
        'Unable to load Mains questions:',
        loadError
      );

      setError(
        loadError.message
      );

      setLoading(false);
      return;
    }

    setQuestions(
      ((data || []).map(
        item => ({
          ...item,
          tags:
            item.tags ||
            []
        })
      )) as MainsQuestion[]
    );

    setLoading(false);
  }

  useEffect(() => {
    loadQuestions();
  }, []);

  const optionalSubjects =
    useMemo(() => {
      return Array.from(
        new Set(
          questions
            .filter(
              item =>
                item.section_type ===
                'optional'
            )
            .map(
              item =>
                item.optional_subject
            )
            .filter(
              Boolean
            ) as string[]
        )
      ).sort();
    }, [questions]);

  const years =
    useMemo(() => {
      return Array.from(
        new Set(
          questions
            .filter(
              item =>
                item.pyq_year
            )
            .map(
              item =>
                item.pyq_year as number
            )
        )
      ).sort(
        (a, b) =>
          b - a
      );
    }, [questions]);

  const filteredQuestions =
    useMemo(() => {
      const search =
        searchText
          .trim()
          .toLowerCase();

      return questions.filter(
        item => {
          if (
            sectionFilter !==
              'all' &&
            item.section_type !==
              sectionFilter
          ) {
            return false;
          }

          if (
            item.section_type ===
              'gs' &&
            gsFilter !==
              'all' &&
            item.gs_paper !==
              gsFilter
          ) {
            return false;
          }

          if (
            typeFilter !==
              'all' &&
            item.question_type !==
              typeFilter
          ) {
            return false;
          }

          if (
            item.section_type ===
              'optional' &&
            optionalSubjectFilter !==
              'all' &&
            item.optional_subject !==
              optionalSubjectFilter
          ) {
            return false;
          }

          if (
            item.section_type ===
              'optional' &&
            optionalPaperFilter !==
              'all' &&
            item.optional_paper !==
              optionalPaperFilter
          ) {
            return false;
          }

          if (
            marksFilter !==
              'all' &&
            String(
              item.marks
            ) !==
              marksFilter
          ) {
            return false;
          }

          if (
            yearFilter !==
              'all' &&
            String(
              item.pyq_year
            ) !==
              yearFilter
          ) {
            return false;
          }

          if (search) {
            const searchable =
              [
                item.question,
                item.subject,
                item.topic,
                item.directive,
                item.gs_paper,
                item.optional_subject,
                item.optional_paper,
                ...(item.tags ||
                  [])
              ]
                .filter(
                  Boolean
                )
                .join(' ')
                .toLowerCase();

            if (
              !searchable.includes(
                search
              )
            ) {
              return false;
            }
          }

          return true;
        }
      );
    }, [
      questions,
      sectionFilter,
      gsFilter,
      typeFilter,
      optionalSubjectFilter,
      optionalPaperFilter,
      marksFilter,
      yearFilter,
      searchText
    ]);

  function clearFilters() {
    setSectionFilter(
      'all'
    );

    setGsFilter(
      'all'
    );

    setTypeFilter(
      'all'
    );

    setOptionalSubjectFilter(
      'all'
    );

    setOptionalPaperFilter(
      'all'
    );

    setMarksFilter(
      'all'
    );

    setYearFilter(
      'all'
    );

    setSearchText('');
  }

  if (loading) {
    return (
      <div className="page-wrap">
        <TopBar
          title="Mains Practice"
          subtitle="Answer writing, PYQs and optional subjects"
        />

        <section className="panel">
          <h2>
            Loading Mains questions...
          </h2>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrap">
        <TopBar
          title="Mains Practice"
          subtitle="Answer writing, PYQs and optional subjects"
        />

        <section className="panel">
          <h2>
            Unable to load Mains questions
          </h2>

          <p>
            {error}
          </p>

          <button
            className="primary-btn"
            type="button"
            onClick={
              loadQuestions
            }
          >
            Try again
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="page-wrap">
      <TopBar
        title="Mains Practice"
        subtitle="GS-I to GS-IV, PYQs, practice questions and optionals"
      />

      <section
        className="panel"
        style={{
          marginBottom:
            '22px'
        }}
      >
        <span className="eyebrow">
          MAINS QUESTION BANK
        </span>

        <h2>
          Find the right question to practise
        </h2>

        <p>
          Filter questions by General
          Studies paper, Optional Subject,
          PYQ, marks and year.
        </p>

        <label>
          Search

          <input
            value={
              searchText
            }
            onChange={
              e =>
                setSearchText(
                  e.target
                    .value
                )
            }
            placeholder="Search topic, subject, directive or keyword..."
          />
        </label>

        <div
          className="form-two"
          style={{
            marginTop:
              '14px'
          }}
        >
          <label>
            Section

            <select
              value={
                sectionFilter
              }
              onChange={
                e =>
                  setSectionFilter(
                    e.target
                      .value as MainSectionFilter
                  )
              }
            >
              <option value="all">
                All
              </option>

              <option value="gs">
                General Studies
              </option>

              <option value="optional">
                Optional Subject
              </option>
            </select>
          </label>

          <label>
            Question Type

            <select
              value={
                typeFilter
              }
              onChange={
                e =>
                  setTypeFilter(
                    e.target
                      .value as TypeFilter
                  )
              }
            >
              <option value="all">
                All
              </option>

              <option value="practice">
                Practice
              </option>

              <option value="pyq">
                Previous Year
              </option>
            </select>
          </label>
        </div>

        <div className="form-two">
          <label>
            GS Paper

            <select
              value={
                gsFilter
              }
              onChange={
                e =>
                  setGsFilter(
                    e.target
                      .value
                  )
              }
            >
              <option value="all">
                All GS Papers
              </option>

              <option value="GS-I">
                GS-I
              </option>

              <option value="GS-II">
                GS-II
              </option>

              <option value="GS-III">
                GS-III
              </option>

              <option value="GS-IV">
                GS-IV
              </option>
            </select>
          </label>

          <label>
            Marks

            <select
              value={
                marksFilter
              }
              onChange={
                e =>
                  setMarksFilter(
                    e.target
                      .value
                  )
              }
            >
              <option value="all">
                All Marks
              </option>

              <option value="10">
                10 Marks
              </option>

              <option value="15">
                15 Marks
              </option>

              <option value="20">
                20 Marks
              </option>
            </select>
          </label>
        </div>

        <div className="form-two">
          <label>
            Optional Subject

            <select
              value={
                optionalSubjectFilter
              }
              onChange={
                e =>
                  setOptionalSubjectFilter(
                    e.target
                      .value
                  )
              }
            >
              <option value="all">
                All Optional Subjects
              </option>

              {optionalSubjects.map(
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

          <label>
            Optional Paper

            <select
              value={
                optionalPaperFilter
              }
              onChange={
                e =>
                  setOptionalPaperFilter(
                    e.target
                      .value
                  )
              }
            >
              <option value="all">
                Both Papers
              </option>

              <option value="Paper-I">
                Paper-I
              </option>

              <option value="Paper-II">
                Paper-II
              </option>
            </select>
          </label>
        </div>

        <div className="form-two">
          <label>
            PYQ Year

            <select
              value={
                yearFilter
              }
              onChange={
                e =>
                  setYearFilter(
                    e.target
                      .value
                  )
              }
            >
              <option value="all">
                All Years
              </option>

              {years.map(
                year => (
                  <option
                    key={year}
                    value={year}
                  >
                    {year}
                  </option>
                )
              )}
            </select>
          </label>

          <div
            style={{
              display:
                'flex',
              alignItems:
                'flex-end'
            }}
          >
            <button
              type="button"
              className="secondary-btn"
              onClick={
                clearFilters
              }
            >
              Clear filters
            </button>
          </div>
        </div>
      </section>

      <section
        style={{
          display: 'grid',
          gap: '18px'
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
            gap: '12px',
            flexWrap:
              'wrap'
          }}
        >
          <div>
            <span className="eyebrow">
              RESULTS
            </span>

            <h2>
              {
                filteredQuestions.length
              }{' '}
              question
              {
                filteredQuestions.length ===
                1
                  ? ''
                  : 's'
              }
            </h2>
          </div>

          <button
            type="button"
            onClick={
              loadQuestions
            }
          >
            Refresh questions
          </button>
        </div>

        {filteredQuestions.length ===
          0 && (
          <div className="panel">
            <h3>
              No published Mains questions found
            </h3>

            <p>
              Draft questions remain hidden
              until they are published by the
              administrator.
            </p>
          </div>
        )}

        {filteredQuestions.map(
          item => {
            const expanded =
              expandedId ===
              item.id;

            return (
              <article
                key={
                  item.id
                }
                className="panel"
                style={{
                  padding:
                    '22px'
                }}
              >
                <div
                  style={{
                    display:
                      'flex',
                    justifyContent:
                      'space-between',
                    gap:
                      '16px',
                    flexWrap:
                      'wrap'
                  }}
                >
                  <div>
                    <span className="eyebrow">
                      {item.section_type ===
                      'gs'
                        ? item.gs_paper
                        : `${item.optional_subject} • ${item.optional_paper}`}
                    </span>

                    <div
                      className="tag-row"
                      style={{
                        marginTop:
                          '10px'
                      }}
                    >
                      <span className="tag">
                        {item.question_type ===
                        'pyq'
                          ? `PYQ ${item.pyq_year || ''}`
                          : 'Practice'}
                      </span>

                      {item.marks && (
                        <span className="tag">
                          {item.marks}{' '}
                          marks
                        </span>
                      )}

                      {item.word_limit && (
                        <span className="tag">
                          {
                            item.word_limit
                          }{' '}
                          words
                        </span>
                      )}

                      <span className="tag">
                        {item.difficulty}
                      </span>
                    </div>
                  </div>

                  {item.directive && (
                    <strong
                      style={{
                        color:
                          '#5eead4'
                      }}
                    >
                      {item.directive}
                    </strong>
                  )}
                </div>

                <h2
                  style={{
                    marginTop:
                      '18px'
                  }}
                >
                  {item.question}
                </h2>

                <p>
                  <strong>
                    Subject:
                  </strong>{' '}
                  {item.subject}
                </p>

                {item.topic && (
                  <p>
                    <strong>
                      Topic:
                    </strong>{' '}
                    {item.topic}
                  </p>
                )}

                <div
                  className="tag-row"
                  style={{
                    marginTop:
                      '12px'
                  }}
                >
                  {item.tags.map(
                    tag => (
                      <span
                        className="tag"
                        key={
                          tag
                        }
                      >
                        {tag}
                      </span>
                    )
                  )}
                </div>

                <div
                  style={{
                    marginTop:
                      '18px'
                  }}
                >
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() =>
                      setExpandedId(
                        expanded
                          ? null
                          : item.id
                      )
                    }
                  >
                    {expanded
                      ? 'Hide guidance'
                      : 'View answer guidance'}
                  </button>
                </div>

                {expanded && (
                  <div
                    style={{
                      marginTop:
                        '22px'
                    }}
                  >
                    {item.syllabus_link && (
                      <section
                        className="callout"
                        style={{
                          marginBottom:
                            '14px'
                        }}
                      >
                        <strong>
                          UPSC Syllabus Linkage
                        </strong>

                        <p>
                          {
                            item.syllabus_link
                          }
                        </p>
                      </section>
                    )}

                    {item.introduction_hint && (
                      <section
                        className="panel"
                        style={{
                          marginBottom:
                            '14px'
                        }}
                      >
                        <span className="eyebrow">
                          INTRODUCTION HINT
                        </span>

                        <p
                          style={{
                            whiteSpace:
                              'pre-wrap'
                          }}
                        >
                          {
                            item.introduction_hint
                          }
                        </p>
                      </section>
                    )}

                    {item.answer_framework && (
                      <section
                        className="panel"
                        style={{
                          marginBottom:
                            '14px'
                        }}
                      >
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
                          {
                            item.answer_framework
                          }
                        </p>
                      </section>
                    )}

                    {item.key_points && (
                      <section
                        className="panel"
                        style={{
                          marginBottom:
                            '14px'
                        }}
                      >
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
                          {
                            item.key_points
                          }
                        </p>
                      </section>
                    )}

                    {item.conclusion_hint && (
                      <section
                        className="panel"
                        style={{
                          marginBottom:
                            '14px'
                        }}
                      >
                        <span className="eyebrow">
                          CONCLUSION HINT
                        </span>

                        <p
                          style={{
                            whiteSpace:
                              'pre-wrap'
                          }}
                        >
                          {
                            item.conclusion_hint
                          }
                        </p>
                      </section>
                    )}

                    {(item.source ||
                      item.source_url) && (
                      <section className="panel">
                        <span className="eyebrow">
                          SOURCE
                        </span>

                        {item.source && (
                          <p>
                            {item.source}
                          </p>
                        )}

                        {item.source_url && (
                          <a
                            href={
                              item.source_url
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="primary-btn"
                            style={{
                              display:
                                'inline-block',
                              textDecoration:
                                'none'
                            }}
                          >
                            Open source ↗
                          </a>
                        )}
                      </section>
                    )}
                  </div>
                )}
              </article>
            );
          }
        )}
      </section>
    </div>
  );
}

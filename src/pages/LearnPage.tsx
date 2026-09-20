import {
  useEffect,
  useState
} from 'react';

import {
  LearnPage
} from './LearnPage';

import {
  StudyResources
} from '../components/StudyResources';

import {
  SavedTopics,
  type SavedTopicTarget
} from '../components/SavedTopics';

import {
  MyReading
} from '../components/MyReading';

import {
  BookProgressTracker
} from '../components/BookProgressTracker';

import {
  RevisionWeekCalendar
} from '../components/RevisionWeekCalendar';

import {
  RevisionScheduleSettings
} from '../components/RevisionScheduleSettings';


export type LearnMode =
  | 'syllabus'
  | 'resources'
  | 'saved'
  | 'book-progress';


type BookWorkspace =
  | 'my-reading'
  | 'standard-books'
  | 'calendar'
  | 'settings';


type LearnHubPageProps = {
  initialSubject?: string | null;
  initialMode?: LearnMode;
};


export function LearnHubPage({
  initialSubject = null,
  initialMode = 'syllabus'
}: LearnHubPageProps) {

  const [
    mode,
    setMode
  ] =
    useState<LearnMode>(
      initialMode
    );

  const [
    bookWorkspace,
    setBookWorkspace
  ] =
    useState<BookWorkspace>(
      'my-reading'
    );

  const [
    syllabusTarget,
    setSyllabusTarget
  ] =
    useState<SavedTopicTarget | null>(
      null
    );

  const [
    navigationKey,
    setNavigationKey
  ] =
    useState(0);


  useEffect(
    () => {

      setMode(initialMode);

      if (
        initialMode ===
        'book-progress'
      ) {
        setBookWorkspace(
          'my-reading'
        );
      }

    },
    [
      initialMode
    ]
  );


  function selectMainMode(
    nextMode: LearnMode
  ): void {

    if (
      nextMode === 'syllabus'
    ) {

      setSyllabusTarget(null);
      setNavigationKey(
        current => current + 1
      );
    }

    setMode(nextMode);
  }


  function openSavedTopic(
    target: SavedTopicTarget
  ): void {

    setSyllabusTarget(target);

    setNavigationKey(
      current => current + 1
    );

    setMode('syllabus');

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }


  const mainButtonStyle = {
    width: '100%',
    minWidth: 0,
    minHeight: '46px',
    whiteSpace: 'normal' as const,
    textAlign: 'center' as const,
    lineHeight: 1.15,
    padding: '9px 7px'
  };


  const mainTabs:
    Array<{
      id: LearnMode;
      label: string;
      helper: string;
    }> =
    [
      {
        id: 'syllabus',
        label: 'Syllabus',
        helper:
          'Track the UPSC syllabus topic by topic'
      },
      {
        id: 'resources',
        label: 'Resources',
        helper:
          'Books, official sources and current affairs'
      },
      {
        id: 'saved',
        label: 'Saved',
        helper:
          'Bookmarks and personal notes'
      },
      {
        id: 'book-progress',
        label: 'My Books',
        helper:
          'Reading progress and revision'
      }
    ];


  return (

    <div className="page-wrap">

      <section
        className="panel"
        style={{
          marginTop: '10px',
          padding: '16px'
        }}
      >

        <span className="eyebrow">
          LEARN
        </span>

        <h2>
          Study Workspace
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(4, minmax(0, 1fr))',
            gap: '8px',
            marginTop: '14px'
          }}
        >

          {
            mainTabs.map(
              tab => (

                <button
                  key={tab.id}
                  type="button"
                  className={
                    mode === tab.id
                      ? 'filter active'
                      : 'filter'
                  }
                  style={mainButtonStyle}
                  onClick={() =>
                    selectMainMode(tab.id)
                  }
                >
                  {tab.label}
                </button>

              )
            )
          }

        </div>

        <div
          className="callout"
          style={{
            marginTop: '10px'
          }}
        >
          {
            mainTabs.find(
              tab =>
                tab.id === mode
            )?.helper
          }
        </div>

      </section>


      {
        mode === 'syllabus' && (

          <div
            style={{
              marginTop: '12px'
            }}
          >

            <LearnPage
              key={navigationKey}

              initialSubject={
                syllabusTarget?.subject ||
                initialSubject
              }

              initialStage={
                syllabusTarget?.stage ||
                null
              }

              initialTopic={
                syllabusTarget?.topic ||
                null
              }

              initialPaper={
                syllabusTarget?.paper ||
                null
              }
            />

          </div>

        )
      }


      {
        mode === 'resources' && (

          <div
            style={{
              marginTop: '12px'
            }}
          >

            <StudyResources
              initialStage={
                initialSubject
                  ? 'prelims'
                  : 'all'
              }
              initialSubject={
                initialSubject
              }
            />

          </div>

        )
      }


      {
        mode === 'saved' && (

          <div
            style={{
              marginTop: '12px'
            }}
          >

            <SavedTopics
              onOpenTopic={
                openSavedTopic
              }
            />

          </div>

        )
      }


      {
        mode === 'book-progress' && (

          <>

            <section
              className="panel"
              style={{
                marginTop: '12px',
                padding: '14px'
              }}
            >

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(4, minmax(0, 1fr))',
                  gap: '8px'
                }}
              >

                <button
                  type="button"
                  className={
                    bookWorkspace ===
                      'my-reading'
                      ? 'filter active'
                      : 'filter'
                  }
                  onClick={() =>
                    setBookWorkspace(
                      'my-reading'
                    )
                  }
                >
                  My Reading
                </button>

                <button
                  type="button"
                  className={
                    bookWorkspace ===
                      'standard-books'
                      ? 'filter active'
                      : 'filter'
                  }
                  onClick={() =>
                    setBookWorkspace(
                      'standard-books'
                    )
                  }
                >
                  Standard Books
                </button>

                <button
                  type="button"
                  className={
                    bookWorkspace ===
                      'calendar'
                      ? 'filter active'
                      : 'filter'
                  }
                  onClick={() =>
                    setBookWorkspace(
                      'calendar'
                    )
                  }
                >
                  7-Day Plan
                </button>

                <button
                  type="button"
                  className={
                    bookWorkspace ===
                      'settings'
                      ? 'filter active'
                      : 'filter'
                  }
                  onClick={() =>
                    setBookWorkspace(
                      'settings'
                    )
                  }
                >
                  Revision Setup
                </button>

              </div>

            </section>


            {
              bookWorkspace ===
                'my-reading' && (
                <MyReading />
              )
            }

            {
              bookWorkspace ===
                'standard-books' && (
                <BookProgressTracker
                  initialSubject={
                    initialSubject
                  }
                />
              )
            }

            {
              bookWorkspace ===
                'calendar' && (
                <RevisionWeekCalendar />
              )
            }

            {
              bookWorkspace ===
                'settings' && (
                <RevisionScheduleSettings />
              )
            }

          </>

        )
      }

    </div>
  );
}


export default LearnHubPage;

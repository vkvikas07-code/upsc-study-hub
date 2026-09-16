import {
  useMemo,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


type ParsedTopic = {
  key: string;
  parent_key: string | null;
  topic_name: string;
  topic_type:
    | 'part'
    | 'chapter'
    | 'topic'
    | 'subtopic';
  page_start: number | null;
  page_end: number | null;
  sort_order: number;
};


type PersonalBookBulkImporterProps = {
  bookId: string;
  bookTitle: string;
  onImported: () => void;
};


function cleanPage(
  value:
    string |
    undefined
) {

  if (
    !value ||
    !value.trim()
  ) {

    return null;
  }


  const number =
    Number(
      value.trim()
    );


  if (
    !Number.isInteger(
      number
    ) ||
    number < 0
  ) {

    return null;
  }


  return number;
}


export function PersonalBookBulkImporter({

  bookId,
  bookTitle,
  onImported

}: PersonalBookBulkImporterProps) {

  const [
    input,
    setInput
  ] =
    useState('');


  const [
    importing,
    setImporting
  ] =
    useState(
      false
    );


  const [
    message,
    setMessage
  ] =
    useState('');


  /*
   * =========================================
   * PARSER
   * =========================================
   *
   * Supported format:
   *
   * PART | Part title
   * CHAPTER | Chapter title
   * TOPIC | Topic title
   * SUBTOPIC | Smaller topic
   *
   * Optional pages:
   *
   * CHAPTER | Chapter title | 10 | 24
   */

  const parsed =
    useMemo(
      () => {

        const rows:
          ParsedTopic[] =
            [];


        const lines =
          input
            .split(
              /\r?\n/
            )
            .map(
              line =>
                line.trim()
            )
            .filter(
              Boolean
            );


        let currentPart:
          string |
          null =
            null;


        let currentChapter:
          string |
          null =
            null;


        let currentTopic:
          string |
          null =
            null;


        lines.forEach(
          (
            line,
            index
          ) => {

            const pieces =
              line
                .split('|')
                .map(
                  piece =>
                    piece.trim()
                );


            if (
              pieces.length <
              2
            ) {

              return;
            }


            const rawType =
              pieces[0]
                .toLowerCase();


            let topicType:
              ParsedTopic[
                'topic_type'
              ] |
              null =
                null;


            if (
              rawType ===
                'part'
            ) {

              topicType =
                'part';

            } else if (
              rawType ===
                'chapter'
            ) {

              topicType =
                'chapter';

            } else if (
              rawType ===
                'topic'
            ) {

              topicType =
                'topic';

            } else if (
              rawType ===
                'subtopic'
            ) {

              topicType =
                'subtopic';

            }


            if (
              !topicType
            ) {

              return;
            }


            const topicName =
              pieces[1]
                ?.trim();


            if (
              !topicName
            ) {

              return;
            }


            const key =
              `row-${index + 1}`;


            let parentKey:
              string |
              null =
                null;


            /*
             * =================================
             * PARENT STRUCTURE
             * =================================
             */

            if (
              topicType ===
              'part'
            ) {

              parentKey =
                null;


              currentPart =
                key;


              currentChapter =
                null;


              currentTopic =
                null;

            } else if (
              topicType ===
              'chapter'
            ) {

              parentKey =
                currentPart;


              currentChapter =
                key;


              currentTopic =
                null;

            } else if (
              topicType ===
              'topic'
            ) {

              parentKey =
                currentChapter ||
                currentPart;


              currentTopic =
                key;

            } else if (
              topicType ===
              'subtopic'
            ) {

              parentKey =
                currentTopic ||
                currentChapter ||
                currentPart;

            }


            const startPage =
              cleanPage(
                pieces[2]
              );


            const endPage =
              cleanPage(
                pieces[3]
              );


            rows.push({

              key,

              parent_key:
                parentKey,

              topic_name:
                topicName,

              topic_type:
                topicType,

              page_start:
                startPage,

              page_end:
                endPage,

              sort_order:
                (
                  index +
                  1
                ) *
                10

            });

          }
        );


        return rows;

      },
      [
        input
      ]
    );


  /*
   * =========================================
   * IMPORT
   * =========================================
   */

  async function importTopics() {

    const client =
      supabase;


    if (
      !client
    ) {

      setMessage(
        'Study database is not configured.'
      );

      return;
    }


    if (
      parsed.length ===
      0
    ) {

      setMessage(
        'Add at least one valid Part, Chapter, Topic or Subtopic.'
      );

      return;
    }


    setImporting(
      true
    );


    setMessage('');


    const {
      data,
      error
    } =
      await client.rpc(
        'import_personal_book_topics',
        {

          p_book_id:
            bookId,

          p_items:
            parsed

        }
      );


    if (
      error
    ) {

      setMessage(
        error.message
      );

      setImporting(
        false
      );

      return;
    }


    setMessage(
      `${data ?? parsed.length} topics imported successfully.`
    );


    setInput('');


    setImporting(
      false
    );


    onImported();
  }


  /*
   * =========================================
   * SAMPLE
   * =========================================
   */

  function insertSample() {

    setInput(
`PART | Part One
CHAPTER | Chapter One
TOPIC | Topic One
TOPIC | Topic Two
SUBTOPIC | Smaller Topic
CHAPTER | Chapter Two
TOPIC | Another Topic`
    );


    setMessage('');
  }


  /*
   * =========================================
   * PAGE
   * =========================================
   */

  return (

    <section
      className="panel admin-form"

      style={{
        marginTop:
          '14px'
      }}
    >

      <span
        className="eyebrow"
      >
        FAST INDEX IMPORT
      </span>


      <h3>
        Add many topics at once
      </h3>


      <p>
        Paste the contents structure for{' '}
        <strong>
          {bookTitle}
        </strong>.
        The app will automatically create the
        Part → Chapter → Topic → Subtopic hierarchy.
      </p>


      <div
        style={{
          padding:
            '12px 14px',

          borderRadius:
            '12px',

          marginTop:
            '12px',

          background:
            'rgba(59,130,246,.10)'
        }}
      >

        <strong>
          Format
        </strong>


        <pre
          style={{
            whiteSpace:
              'pre-wrap',

            margin:
              '10px 0 0',

            color:
              '#cbd5e1',

            fontSize:
              '.82rem',

            lineHeight:
              1.6
          }}
        >
{`PART | Part name
CHAPTER | Chapter name
TOPIC | Topic name
SUBTOPIC | Subtopic name`}
        </pre>

      </div>


      <div
        style={{
          padding:
            '12px 14px',

          borderRadius:
            '12px',

          marginTop:
            '10px',

          background:
            'rgba(20,184,166,.08)'
        }}
      >

        <strong>
          Optional page numbers
        </strong>


        <pre
          style={{
            whiteSpace:
              'pre-wrap',

            margin:
              '10px 0 0',

            color:
              '#cbd5e1',

            fontSize:
              '.82rem'
          }}
        >
          CHAPTER | Chapter name | 25 | 44
        </pre>

      </div>


      <label
        style={{
          display:
            'grid',

          gap:
            '7px',

          marginTop:
            '16px'
        }}
      >

        Book contents

        <textarea

          value={
            input
          }

          onChange={
            event => {

              setInput(
                event.target.value
              );


              setMessage('');

            }
          }

          placeholder={
`PART | Part name
CHAPTER | Chapter name
TOPIC | Topic name
TOPIC | Another topic`
          }

          style={{
            minHeight:
              '260px',

            resize:
              'vertical'
          }}

        />

      </label>


      {/* =====================================
          PARSE SUMMARY
      ===================================== */}

      <div
        style={{
          display:
            'grid',

          gridTemplateColumns:
            'repeat(auto-fit,minmax(110px,1fr))',

          gap:
            '8px',

          marginTop:
            '14px'
        }}
      >

        <div
          className="callout"
        >
          <strong>
            {parsed.length}
          </strong>

          <p>
            Total
          </p>
        </div>


        <div
          className="callout"
        >
          <strong>
            {
              parsed.filter(
                item =>
                  item.topic_type ===
                  'part'
              ).length
            }
          </strong>

          <p>
            Parts
          </p>
        </div>


        <div
          className="callout"
        >
          <strong>
            {
              parsed.filter(
                item =>
                  item.topic_type ===
                  'chapter'
              ).length
            }
          </strong>

          <p>
            Chapters
          </p>
        </div>


        <div
          className="callout"
        >
          <strong>
            {
              parsed.filter(
                item =>
                  item.topic_type ===
                  'topic' ||
                  item.topic_type ===
                  'subtopic'
              ).length
            }
          </strong>

          <p>
            Topics
          </p>
        </div>

      </div>


      {/* =====================================
          PREVIEW
      ===================================== */}

      {parsed.length >
        0 && (

        <div
          style={{
            marginTop:
              '16px'
          }}
        >

          <strong>
            Preview
          </strong>


          <div
            style={{
              display:
                'grid',

              gap:
                '6px',

              marginTop:
                '10px',

              maxHeight:
                '300px',

              overflowY:
                'auto'
            }}
          >

            {parsed.map(
              item => {

                const depth =
                  item.topic_type ===
                    'part'
                    ? 0
                    : item.topic_type ===
                      'chapter'
                    ? 1
                    : item.topic_type ===
                      'topic'
                    ? 2
                    : 3;


                return (

                  <div

                    key={
                      item.key
                    }

                    style={{
                      padding:
                        '9px 10px',

                      paddingLeft:
                        `${10 + depth * 18}px`,

                      borderRadius:
                        '9px',

                      background:
                        'rgba(255,255,255,.035)',

                      border:
                        '1px solid rgba(255,255,255,.06)'
                    }}

                  >

                    <small
                      style={{
                        color:
                          '#5eead4',

                        textTransform:
                          'uppercase'
                      }}
                    >
                      {item.topic_type}
                    </small>


                    <strong
                      style={{
                        display:
                          'block',

                        marginTop:
                          '2px'
                      }}
                    >
                      {item.topic_name}
                    </strong>


                    {(item.page_start !==
                        null ||
                      item.page_end !==
                        null) && (

                      <small
                        style={{
                          color:
                            '#94a3b8'
                        }}
                      >
                        Pages{' '}
                        {item.page_start ??
                          '?'}
                        {' – '}
                        {item.page_end ??
                          '?'}
                      </small>

                    )}

                  </div>

                );
              }
            )}

          </div>

        </div>

      )}


      {message && (

        <div
          style={{
            marginTop:
              '14px',

            padding:
              '12px',

            borderRadius:
              '10px',

            background:
              'rgba(255,255,255,.04)'
          }}
        >
          {message}
        </div>

      )}


      <div
        style={{
          display:
            'flex',

          flexWrap:
            'wrap',

          gap:
            '10px',

          marginTop:
            '16px'
        }}
      >

        <button
          type="button"
          className="primary-btn"

          disabled={
            importing ||
            parsed.length ===
              0
          }

          onClick={() =>
            void importTopics()
          }
        >
          {
            importing
              ? 'Importing…'
              : `Import ${parsed.length} Topics`
          }
        </button>


        <button
          type="button"
          className="secondary-btn"

          disabled={
            importing
          }

          onClick={
            insertSample
          }
        >
          Show Example
        </button>


        {input && (

          <button
            type="button"
            className="text-btn"

            disabled={
              importing
            }

            onClick={() => {

              setInput('');
              setMessage('');

            }}
          >
            Clear
          </button>

        )}

      </div>

    </section>

  );
}

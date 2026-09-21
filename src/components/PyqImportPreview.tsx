import {
  useState
} from 'react';


type PreviewQuestion = {
  question_number: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  subject: string;
  topic: string;
  difficulty: string;
  tags: string[];
};


type PyqImportPreviewProps = {
  questions:
    PreviewQuestion[];
};


function answerLetter(
  index: number
): string {

  if (
    !Number.isInteger(index) ||
    index < 0
  ) {
    return '-';
  }


  return String.fromCharCode(
    65 +
    index
  );
}


export function PyqImportPreview({

  questions

}: PyqImportPreviewProps) {

  const [
    showAll,
    setShowAll
  ] =
    useState(false);


  if (
    questions.length ===
    0
  ) {

    return null;
  }


  const visibleQuestions =
    showAll
      ? questions
      : questions.slice(
          0,
          8
        );


  const withoutExplanation =
    questions.filter(
      item =>
        !item.explanation.trim()
    ).length;


  const withoutTopic =
    questions.filter(
      item =>
        !item.topic.trim()
    ).length;


  return (

    <section
      style={{
        marginTop:
          '12px',

        padding:
          '12px',

        border:
          '1px solid rgba(45,212,191,.18)',

        borderRadius:
          '12px',

        background:
          'rgba(15,23,42,.35)'
      }}
    >

      {/* =================================================
          HEADER
      ================================================= */}

      <div
        style={{
          display:
            'flex',

          justifyContent:
            'space-between',

          alignItems:
            'center',

          gap:
            '10px',

          flexWrap:
            'wrap'
        }}
      >

        <div>

          <span
            className="eyebrow"
          >
            IMPORT PREVIEW
          </span>


          <strong
            style={{
              display:
                'block',

              marginTop:
                '3px'
            }}
          >
            {
              questions.length
            } questions ready
          </strong>

        </div>


        {
          questions.length >
            8 && (

            <button
              type="button"
              className="secondary-btn"
              onClick={() =>
                setShowAll(
                  current =>
                    !current
                )
              }
            >
              {
                showAll
                  ? 'Show Less'
                  : `Show All ${questions.length}`
              }
            </button>

          )
        }

      </div>


      {/* =================================================
          QUALITY SUMMARY
      ================================================= */}

      <div
        style={{
          display:
            'grid',

          gridTemplateColumns:
            'repeat(3, minmax(0, 1fr))',

          gap:
            '8px',

          marginTop:
            '10px'
        }}
      >

        <div className="callout">

          <small>
            Questions
          </small>

          <strong
            style={{
              display:
                'block'
            }}
          >
            {
              questions.length
            }
          </strong>

        </div>


        <div className="callout">

          <small>
            No Explanation
          </small>

          <strong
            style={{
              display:
                'block'
            }}
          >
            {
              withoutExplanation
            }
          </strong>

        </div>


        <div className="callout">

          <small>
            No Topic
          </small>

          <strong
            style={{
              display:
                'block'
            }}
          >
            {
              withoutTopic
            }
          </strong>

        </div>

      </div>


      {/* =================================================
          PREVIEW ROWS
      ================================================= */}

      <div
        style={{
          display:
            'grid',

          gap:
            '6px',

          marginTop:
            '10px'
        }}
      >

        {
          visibleQuestions.map(
            (
              item,
              index
            ) => {

              const answer =
                answerLetter(
                  item.correct_index
                );


              const answerText =
                item.options[
                  item.correct_index
                ] ||
                '';


              return (

                <article
                  key={
                    `${item.question_number}-${index}`
                  }
                  style={{
                    display:
                      'grid',

                    gridTemplateColumns:
                      '55px minmax(0, 1fr) 120px',

                    gap:
                      '10px',

                    alignItems:
                      'center',

                    padding:
                      '9px 10px',

                    border:
                      '1px solid rgba(255,255,255,.07)',

                    borderRadius:
                      '10px'
                  }}
                >

                  {/* QUESTION NUMBER */}

                  <strong>
                    Q{
                      item.question_number ||
                      index + 1
                    }
                  </strong>


                  {/* QUESTION */}

                  <div
                    style={{
                      minWidth:
                        0
                    }}
                  >

                    <strong
                      style={{
                        display:
                          'block',

                        overflow:
                          'hidden',

                        textOverflow:
                          'ellipsis',

                        whiteSpace:
                          'nowrap'
                      }}
                    >
                      {
                        item.question
                      }
                    </strong>


                    <small
                      style={{
                        display:
                          'block',

                        marginTop:
                          '3px',

                        color:
                          '#94a3b8',

                        overflow:
                          'hidden',

                        textOverflow:
                          'ellipsis',

                        whiteSpace:
                          'nowrap'
                      }}
                    >
                      {
                        item.subject ||
                        'General Studies'
                      }

                      {' • '}

                      {
                        item.topic ||
                        'No topic'
                      }

                      {' • '}

                      {
                        item.difficulty
                      }
                    </small>

                  </div>


                  {/* ANSWER */}

                  <div
                    style={{
                      textAlign:
                        'right'
                    }}
                  >

                    <span
                      className="tag"
                    >
                      Answer {
                        answer
                      }
                    </span>


                    <small
                      style={{
                        display:
                          'block',

                        marginTop:
                          '4px',

                        color:
                          '#94a3b8',

                        overflow:
                          'hidden',

                        textOverflow:
                          'ellipsis',

                        whiteSpace:
                          'nowrap'
                      }}
                    >
                      {
                        answerText
                      }
                    </small>

                  </div>

                </article>

              );
            }
          )
        }

      </div>


      {
        !showAll &&
        questions.length >
          8 && (

          <small
            style={{
              display:
                'block',

              textAlign:
                'center',

              marginTop:
                '8px',

              color:
                '#94a3b8'
            }}
          >
            Showing first 8 of {
              questions.length
            } questions
          </small>

        )
      }

    </section>

  );
}


export default PyqImportPreview;

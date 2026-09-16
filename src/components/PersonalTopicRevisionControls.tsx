type PersonalTopicRevisionControlsProps = {

  progressPercent:
    number;

  revisionCount:
    number;

  completedAt:
    string |
    null;

  revision1At:
    string |
    null;

  revision2At:
    string |
    null;

  finalRevisionAt:
    string |
    null;

  nextRevisionDueAt:
    string |
    null;

  saving?:
    boolean;

  onAdvanceRevision:
    (
      nextRevision:
        1 |
        2 |
        3
    ) =>
      void |
      Promise<void>;
};


function formatDate(
  value:
    string |
    null
) {

  if (!value) {

    return '';
  }


  const date =
    new Date(
      value
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return '';
  }


  return date.toLocaleDateString(
    'en-IN',
    {
      day:
        '2-digit',

      month:
        'short',

      year:
        'numeric'
    }
  );
}


function startOfDay(
  value:
    Date
) {

  const date =
    new Date(
      value
    );


  date.setHours(
    0,
    0,
    0,
    0
  );


  return date;
}


function getDueStatus(
  value:
    string |
    null
) {

  if (!value) {

    return '';
  }


  const due =
    new Date(
      value
    );


  if (
    Number.isNaN(
      due.getTime()
    )
  ) {

    return '';
  }


  const today =
    startOfDay(
      new Date()
    );


  const dueDay =
    startOfDay(
      due
    );


  const difference =
    Math.round(
      (
        dueDay.getTime() -
        today.getTime()
      ) /
      (
        24 *
        60 *
        60 *
        1000
      )
    );


  if (
    difference <
    0
  ) {

    const days =
      Math.abs(
        difference
      );


    return `Overdue by ${days} ${
      days === 1
        ? 'day'
        : 'days'
    }`;
  }


  if (
    difference ===
    0
  ) {

    return 'Due today';
  }


  if (
    difference ===
    1
  ) {

    return 'Due tomorrow';
  }


  return `Due in ${difference} days`;
}


function nextRevisionLabel(
  revisionCount:
    number
) {

  if (
    revisionCount <=
    0
  ) {

    return 'Revision 1';
  }


  if (
    revisionCount ===
    1
  ) {

    return 'Revision 2';
  }


  return 'Final Revision';
}


export function PersonalTopicRevisionControls({

  progressPercent,
  revisionCount,
  completedAt,
  revision1At,
  revision2At,
  finalRevisionAt,
  nextRevisionDueAt,
  saving = false,
  onAdvanceRevision

}: PersonalTopicRevisionControlsProps) {

  /*
   * Revision starts only after the topic
   * reaches 100% reading completion.
   */

  if (
    progressPercent <
    100
  ) {

    return (

      <div
        style={{
          marginTop:
            '12px',

          padding:
            '11px 12px',

          borderRadius:
            '12px',

          border:
            '1px solid rgba(255,255,255,.07)',

          background:
            'rgba(255,255,255,.025)'
        }}
      >

        <small
          style={{
            color:
              '#94a3b8'
          }}
        >
          Complete this topic to 100% to start
          its revision cycle.
        </small>

      </div>

    );
  }


  const safeRevisionCount =
    Math.min(
      3,
      Math.max(
        0,
        Math.round(
          revisionCount
        )
      )
    );


  const revisionFinished =
    safeRevisionCount >=
    3;


  const nextRevision =
    (
      safeRevisionCount +
      1
    ) as
      1 |
      2 |
      3;


  const nextLabel =
    nextRevisionLabel(
      safeRevisionCount
    );


  const dueStatus =
    getDueStatus(
      nextRevisionDueAt
    );


  const dueDate =
    formatDate(
      nextRevisionDueAt
    );


  return (

    <div
      style={{
        marginTop:
          '12px',

        padding:
          '13px',

        borderRadius:
          '12px',

        border:
          revisionFinished
            ? '1px solid rgba(94,234,212,.30)'
            : '1px solid rgba(59,130,246,.20)',

        background:
          revisionFinished
            ? 'rgba(20,184,166,.07)'
            : 'rgba(59,130,246,.06)'
      }}
    >

      {/* =====================================
          HEADER
      ===================================== */}

      <div
        style={{
          display:
            'flex',

          justifyContent:
            'space-between',

          alignItems:
            'flex-start',

          flexWrap:
            'wrap',

          gap:
            '10px'
        }}
      >

        <div>

          <small
            style={{
              display:
                'block',

              color:
                '#94a3b8'
            }}
          >
            REVISION PROGRESS
          </small>


          <strong
            style={{
              display:
                'block',

              marginTop:
                '4px'
            }}
          >
            {
              revisionFinished
                ? '✓ Revision Cycle Complete'
                : `${nextLabel} Pending`
            }
          </strong>

        </div>


        <span
          className="pill"
        >
          {
            safeRevisionCount
          } / 3
        </span>

      </div>


      {/* =====================================
          DUE DATE
      ===================================== */}

      {!revisionFinished &&
        nextRevisionDueAt && (

        <div
          style={{
            marginTop:
              '10px',

            padding:
              '10px',

            borderRadius:
              '10px',

            background:
              'rgba(255,255,255,.035)'
          }}
        >

          <small
            style={{
              color:
                '#94a3b8'
            }}
          >
            NEXT REVISION
          </small>


          <strong
            style={{
              display:
                'block',

              marginTop:
                '3px'
            }}
          >
            {
              nextLabel
            }
            {' · '}
            {
              dueDate
            }
          </strong>


          {dueStatus && (

            <small
              style={{
                display:
                  'block',

                marginTop:
                  '3px',

                color:
                  dueStatus.includes(
                    'Overdue'
                  ) ||
                  dueStatus ===
                    'Due today'
                    ? '#fbbf24'
                    : '#94a3b8'
              }}
            >
              {
                dueStatus
              }
            </small>

          )}

        </div>

      )}


      {/* =====================================
          REVISION TIMELINE
      ===================================== */}

      <div
        style={{
          display:
            'grid',

          gap:
            '7px',

          marginTop:
            '11px'
        }}
      >

        <div
          style={{
            display:
              'flex',

            justifyContent:
              'space-between',

            gap:
              '10px'
          }}
        >

          <small>
            Reading Completed
          </small>


          <small
            style={{
              color:
                '#94a3b8'
            }}
          >
            {
              formatDate(
                completedAt
              ) ||
              'Completed'
            }
          </small>

        </div>


        <div
          style={{
            display:
              'flex',

            justifyContent:
              'space-between',

            gap:
              '10px'
          }}
        >

          <small>
            {
              revision1At
                ? '✓ Revision 1'
                : '○ Revision 1'
            }
          </small>


          <small
            style={{
              color:
                '#94a3b8'
            }}
          >
            {
              formatDate(
                revision1At
              ) ||
              'Pending'
            }
          </small>

        </div>


        <div
          style={{
            display:
              'flex',

            justifyContent:
              'space-between',

            gap:
              '10px'
          }}
        >

          <small>
            {
              revision2At
                ? '✓ Revision 2'
                : '○ Revision 2'
            }
          </small>


          <small
            style={{
              color:
                '#94a3b8'
            }}
          >
            {
              formatDate(
                revision2At
              ) ||
              'Pending'
            }
          </small>

        </div>


        <div
          style={{
            display:
              'flex',

            justifyContent:
              'space-between',

            gap:
              '10px'
          }}
        >

          <small>
            {
              finalRevisionAt
                ? '✓ Final Revision'
                : '○ Final Revision'
            }
          </small>


          <small
            style={{
              color:
                '#94a3b8'
            }}
          >
            {
              formatDate(
                finalRevisionAt
              ) ||
              'Pending'
            }
          </small>

        </div>

      </div>


      {/* =====================================
          ACTION
      ===================================== */}

      {!revisionFinished && (

        <button
          type="button"

          className="primary-btn"

          disabled={
            saving
          }

          style={{
            marginTop:
              '12px'
          }}

          onClick={() =>
            void onAdvanceRevision(
              nextRevision
            )
          }
        >
          {
            saving
              ? 'Saving…'
              : `Mark ${nextLabel} Complete`
          }
        </button>

      )}


      {revisionFinished && (

        <small
          style={{
            display:
              'block',

            marginTop:
              '10px',

            color:
              '#5eead4'
          }}
        >
          Reading and all three revision stages
          are complete for this topic.
        </small>

      )}

    </div>

  );
}

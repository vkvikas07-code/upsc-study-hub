type TopicProgressControlsProps = {

  progress: number;

  disabled?: boolean;

  onChange: (
    value: number
  ) => void;
};


function clampProgress(
  value: number
) {

  return Math.min(
    100,
    Math.max(
      0,
      Math.round(
        value
      )
    )
  );
}


function getStatus(
  progress: number
) {

  if (
    progress <= 0
  ) {

    return {
      label:
        'Not Started',

      symbol:
        '○'
    };
  }


  if (
    progress >= 100
  ) {

    return {
      label:
        'Completed',

      symbol:
        '✓'
    };
  }


  return {
    label:
      'Reading',

    symbol:
      '●'
  };
}


export function TopicProgressControls({

  progress,
  disabled = false,
  onChange

}: TopicProgressControlsProps) {

  const safeProgress =
    clampProgress(
      progress
    );


  const status =
    getStatus(
      safeProgress
    );


  const shortcuts = [
    0,
    25,
    50,
    75,
    100
  ];


  return (

    <div
      style={{
        marginTop:
          '12px'
      }}
    >

      {/* =====================================
          STATUS
      ===================================== */}

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

        <span
          style={{
            display:
              'inline-flex',

            alignItems:
              'center',

            gap:
              '6px',

            fontSize:
              '.82rem',

            color:
              safeProgress ===
                100
                ? '#5eead4'
                : safeProgress >
                    0
                ? '#facc15'
                : '#94a3b8'
          }}
        >

          <strong>
            {
              status.symbol
            }
          </strong>

          {
            status.label
          }

        </span>


        <strong
          style={{
            color:
              safeProgress ===
                100
                ? '#5eead4'
                : '#f8fafc'
          }}
        >
          {
            safeProgress
          }%
        </strong>

      </div>


      {/* =====================================
          QUICK PROGRESS BUTTONS
      ===================================== */}

      <div
        style={{
          display:
            'grid',

          gridTemplateColumns:
            'repeat(5, minmax(0, 1fr))',

          gap:
            '6px',

          marginTop:
            '10px'
        }}
      >

        {shortcuts.map(
          value => {

            const active =
              safeProgress ===
              value;


            return (

              <button
                key={
                  value
                }

                type="button"

                disabled={
                  disabled
                }

                onClick={() =>
                  onChange(
                    value
                  )
                }

                style={{
                  width:
                    '100%',

                  minWidth:
                    0,

                  minHeight:
                    '38px',

                  padding:
                    '7px 3px',

                  borderRadius:
                    '9px',

                  border:
                    active
                      ? '1px solid rgba(94,234,212,.75)'
                      : '1px solid rgba(255,255,255,.10)',

                  background:
                    active
                      ? 'rgba(20,184,166,.16)'
                      : 'rgba(255,255,255,.035)',

                  color:
                    active
                      ? '#5eead4'
                      : '#cbd5e1',

                  fontWeight:
                    active
                      ? 700
                      : 500,

                  cursor:
                    disabled
                      ? 'not-allowed'
                      : 'pointer'
                }}
              >
                {value}%
              </button>

            );

          }
        )}

      </div>


      {/* =====================================
          EXACT SLIDER
      ===================================== */}

      <div
        style={{
          marginTop:
            '12px'
        }}
      >

        <input
          type="range"

          min="0"

          max="100"

          step="5"

          value={
            safeProgress
          }

          disabled={
            disabled
          }

          onChange={
            event =>
              onChange(
                Number(
                  event.target
                    .value
                )
              )
          }

          style={{
            width:
              '100%'
          }}
        />


        <div
          style={{
            display:
              'flex',

            justifyContent:
              'space-between',

            alignItems:
              'center',

            marginTop:
              '3px',

            fontSize:
              '.72rem',

            color:
              '#94a3b8'
          }}
        >

          <span>
            Not Started
          </span>

          <span>
            Reading
          </span>

          <span>
            Completed
          </span>

        </div>

      </div>

    </div>

  );
}

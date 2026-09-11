import {
  FormEvent,
  useEffect,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


type StudyTimeRow = {
  morning_start:
    string |
    null;

  morning_end:
    string |
    null;

  afternoon_start:
    string |
    null;

  afternoon_end:
    string |
    null;

  evening_start:
    string |
    null;

  evening_end:
    string |
    null;
};


type StudyTimeValues = {
  morningStart: string;
  morningEnd: string;

  afternoonStart: string;
  afternoonEnd: string;

  eveningStart: string;
  eveningEnd: string;
};


const DEFAULT_TIMES:
  StudyTimeValues = {

  morningStart:
    '06:00',

  morningEnd:
    '11:30',

  afternoonStart:
    '12:00',

  afternoonEnd:
    '17:00',

  eveningStart:
    '17:00',

  eveningEnd:
    '23:59'

};


/*
 * =========================================
 * NORMALISE DATABASE TIME
 * =========================================
 */

function normalizeTime(
  value:
    string |
    null |
    undefined,

  fallback:
    string
) {

  if (!value) {

    return fallback;
  }


  /*
   * PostgreSQL TIME may return:
   *
   * 06:00:00
   *
   * HTML input[type=time] needs:
   *
   * 06:00
   */

  const match =
    value.match(
      /^(\d{2}):(\d{2})/
    );


  if (!match) {

    return fallback;
  }


  return (
    `${match[1]}:${match[2]}`
  );
}


/*
 * =========================================
 * TIME TO MINUTES
 * =========================================
 */

function timeToMinutes(
  value:
    string
) {

  const parts =
    value.split(':');


  if (
    parts.length <
    2
  ) {

    return -1;
  }


  const hours =
    Number(
      parts[0]
    );


  const minutes =
    Number(
      parts[1]
    );


  if (
    !Number.isFinite(
      hours
    ) ||
    !Number.isFinite(
      minutes
    )
  ) {

    return -1;
  }


  return (
    hours *
    60 +
    minutes
  );
}


/*
 * =========================================
 * FRIENDLY TIME
 * =========================================
 */

function friendlyTime(
  value:
    string
) {

  const minutes =
    timeToMinutes(
      value
    );


  if (
    minutes <
    0
  ) {

    return value;
  }


  const hour24 =
    Math.floor(
      minutes /
      60
    );


  const minute =
    minutes %
    60;


  const period =
    hour24 >=
      12
      ? 'PM'
      : 'AM';


  const hour12 =
    hour24 %
      12 ||
    12;


  return (
    `${hour12}:${String(
      minute
    ).padStart(
      2,
      '0'
    )} ${period}`
  );
}


/*
 * =========================================
 * VALIDATE STUDY WINDOWS
 * =========================================
 */

function validateTimes(
  values:
    StudyTimeValues
) {

  const morningStart =
    timeToMinutes(
      values.morningStart
    );


  const morningEnd =
    timeToMinutes(
      values.morningEnd
    );


  const afternoonStart =
    timeToMinutes(
      values.afternoonStart
    );


  const afternoonEnd =
    timeToMinutes(
      values.afternoonEnd
    );


  const eveningStart =
    timeToMinutes(
      values.eveningStart
    );


  const eveningEnd =
    timeToMinutes(
      values.eveningEnd
    );


  if (
    [
      morningStart,
      morningEnd,
      afternoonStart,
      afternoonEnd,
      eveningStart,
      eveningEnd
    ].some(
      value =>
        value <
        0
    )
  ) {

    return (
      'Please select all six study times.'
    );
  }


  if (
    morningStart >=
    morningEnd
  ) {

    return (
      'Morning end time must be later than Morning start time.'
    );
  }


  if (
    morningEnd >
    afternoonStart
  ) {

    return (
      'Morning must finish before or exactly when Afternoon begins.'
    );
  }


  if (
    afternoonStart >=
    afternoonEnd
  ) {

    return (
      'Afternoon end time must be later than Afternoon start time.'
    );
  }


  if (
    afternoonEnd >
    eveningStart
  ) {

    return (
      'Afternoon must finish before or exactly when Evening begins.'
    );
  }


  if (
    eveningStart >=
    eveningEnd
  ) {

    return (
      'Evening end time must be later than Evening start time.'
    );
  }


  return '';
}


/*
 * =========================================
 * STUDY TIME SETTINGS
 * =========================================
 */

export function StudyTimeSettings() {

  const [
    values,
    setValues
  ] =
    useState<
      StudyTimeValues
    >(
      DEFAULT_TIMES
    );


  const [
    loading,
    setLoading
  ] =
    useState(
      true
    );


  const [
    saving,
    setSaving
  ] =
    useState(
      false
    );


  const [
    signedIn,
    setSignedIn
  ] =
    useState(
      false
    );


  const [
    message,
    setMessage
  ] =
    useState('');


  const [
    error,
    setError
  ] =
    useState('');


  /*
   * =========================================
   * UPDATE ONE VALUE
   * =========================================
   */

  function updateValue(
    key:
      keyof StudyTimeValues,

    value:
      string
  ) {

    setValues(
      current => ({
        ...current,
        [key]:
          value
      })
    );


    setMessage('');
    setError('');
  }


  /*
   * =========================================
   * LOAD PREFERENCES
   * =========================================
   */

  async function loadPreferences() {

    const client =
      supabase;


    if (!client) {

      setError(
        'Supabase is not configured.'
      );


      setLoading(
        false
      );


      return;
    }


    setLoading(
      true
    );


    setMessage('');
    setError('');


    const {
      data: {
        user
      }
    } =
      await client
        .auth
        .getUser();


    if (!user) {

      setSignedIn(
        false
      );


      setValues(
        DEFAULT_TIMES
      );


      setLoading(
        false
      );


      return;
    }


    setSignedIn(
      true
    );


    const {
      data,
      error:
        loadError
    } =
      await client
        .from(
          'study_time_preferences'
        )
        .select(
          `
          morning_start,
          morning_end,
          afternoon_start,
          afternoon_end,
          evening_start,
          evening_end
          `
        )
        .eq(
          'user_id',
          user.id
        )
        .maybeSingle();


    if (
      loadError
    ) {

      console.error(
        'Unable to load study time preferences:',
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


    /*
     * FIRST-TIME USER
     */

    if (!data) {

      const {
        error:
          createError
      } =
        await client
          .from(
            'study_time_preferences'
          )
          .upsert(
            {
              user_id:
                user.id,

              morning_start:
                DEFAULT_TIMES
                  .morningStart,

              morning_end:
                DEFAULT_TIMES
                  .morningEnd,

              afternoon_start:
                DEFAULT_TIMES
                  .afternoonStart,

              afternoon_end:
                DEFAULT_TIMES
                  .afternoonEnd,

              evening_start:
                DEFAULT_TIMES
                  .eveningStart,

              evening_end:
                DEFAULT_TIMES
                  .eveningEnd
            },
            {
              onConflict:
                'user_id'
            }
          );


      if (
        createError
      ) {

        console.error(
          'Unable to create default study time preferences:',
          createError
        );


        setError(
          createError.message
        );


        setLoading(
          false
        );


        return;
      }


      setValues(
        DEFAULT_TIMES
      );


      setLoading(
        false
      );


      return;
    }


    const row =
      data as
        StudyTimeRow;


    setValues({

      morningStart:
        normalizeTime(
          row.morning_start,
          DEFAULT_TIMES
            .morningStart
        ),

      morningEnd:
        normalizeTime(
          row.morning_end,
          DEFAULT_TIMES
            .morningEnd
        ),

      afternoonStart:
        normalizeTime(
          row.afternoon_start,
          DEFAULT_TIMES
            .afternoonStart
        ),

      afternoonEnd:
        normalizeTime(
          row.afternoon_end,
          DEFAULT_TIMES
            .afternoonEnd
        ),

      eveningStart:
        normalizeTime(
          row.evening_start,
          DEFAULT_TIMES
            .eveningStart
        ),

      eveningEnd:
        normalizeTime(
          row.evening_end,
          DEFAULT_TIMES
            .eveningEnd
        )

    });


    setLoading(
      false
    );
  }


  /*
   * =========================================
   * INITIAL LOAD
   * =========================================
   */

  useEffect(
    () => {

      void loadPreferences();

    },
    []
  );


  /*
   * =========================================
   * SAVE VALUES
   * =========================================
   */

  async function saveValues(
    nextValues:
      StudyTimeValues,

    successMessage:
      string
  ) {

    const client =
      supabase;


    if (!client) {

      setError(
        'Supabase is not configured.'
      );


      return false;
    }


    const validationError =
      validateTimes(
        nextValues
      );


    if (
      validationError
    ) {

      setError(
        validationError
      );


      return false;
    }


    const {
      data: {
        user
      }
    } =
      await client
        .auth
        .getUser();


    if (!user) {

      setSignedIn(
        false
      );


      setError(
        'Sign in to save your study times.'
      );


      return false;
    }


    setSaving(
      true
    );


    setError('');
    setMessage('');


    const {
      error:
        saveError
    } =
      await client
        .from(
          'study_time_preferences'
        )
        .upsert(
          {
            user_id:
              user.id,

            morning_start:
              nextValues
                .morningStart,

            morning_end:
              nextValues
                .morningEnd,

            afternoon_start:
              nextValues
                .afternoonStart,

            afternoon_end:
              nextValues
                .afternoonEnd,

            evening_start:
              nextValues
                .eveningStart,

            evening_end:
              nextValues
                .eveningEnd
          },
          {
            onConflict:
              'user_id'
          }
        );


    if (
      saveError
    ) {

      console.error(
        'Unable to save study time preferences:',
        saveError
      );


      setError(
        saveError.message
      );


      setSaving(
        false
      );


      return false;
    }


    setValues(
      nextValues
    );


    setMessage(
      successMessage
    );


    setSaving(
      false
    );


    return true;
  }


  /*
   * =========================================
   * SAVE FORM
   * =========================================
   */

  async function savePreferences(
    event:
      FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();


    await saveValues(
      values,
      'Study times saved successfully.'
    );
  }


  /*
   * =========================================
   * RESET DEFAULTS
   * =========================================
   */

  async function resetDefaults() {

    await saveValues(
      DEFAULT_TIMES,
      'Default study times restored successfully.'
    );
  }


  /*
   * =========================================
   * RENDER TIME CARD
   * =========================================
   */

  function renderTimeCard(
    title:
      string,

    description:
      string,

    startKey:
      keyof StudyTimeValues,

    endKey:
      keyof StudyTimeValues
  ) {

    return (

      <article
        style={{
          padding:
            '15px',

          border:
            '1px solid rgba(255,255,255,.08)',

          borderRadius:
            '14px',

          background:
            'rgba(255,255,255,.025)'
        }}
      >

        <strong
          style={{
            fontSize:
              '1.05rem'
          }}
        >
          {title}
        </strong>


        <p
          style={{
            margin:
              '5px 0 14px',

            color:
              '#94a3b8'
          }}
        >
          {description}
        </p>


        <div
          style={{
            display:
              'grid',

            gridTemplateColumns:
              'repeat(2, minmax(120px, 1fr))',

            gap:
              '10px'
          }}
        >

          <label>

            <span>
              Start time
            </span>


            <input
              type="time"

              step="60"

              value={
                values[
                  startKey
                ]
              }

              onChange={
                event =>
                  updateValue(
                    startKey,
                    event.target.value
                  )
              }

              style={{
                width:
                  '100%',

                marginTop:
                  '6px'
              }}
            />

          </label>


          <label>

            <span>
              End time
            </span>


            <input
              type="time"

              step="60"

              value={
                values[
                  endKey
                ]
              }

              onChange={
                event =>
                  updateValue(
                    endKey,
                    event.target.value
                  )
              }

              style={{
                width:
                  '100%',

                marginTop:
                  '6px'
              }}
            />

          </label>

        </div>


        <div
          style={{
            marginTop:
              '12px'
          }}
        >

          <span
            className="tag"
          >
            {friendlyTime(
              values[
                startKey
              ]
            )}
            {' → '}
            {friendlyTime(
              values[
                endKey
              ]
            )}
          </span>

        </div>

      </article>

    );
  }


  /*
   * =========================================
   * PAGE
   * =========================================
   */

  return (

    <section
      className="panel"
    >

      {/* HEADER */}

      <div
        className="panel-head"
      >

        <div>

          <span
            className="eyebrow"
          >
            STUDY TIME SETTINGS
          </span>


          <h2>
            Choose Your Study Hours
          </h2>


          <p>
            Set the Morning, Afternoon and
            Evening study windows that match
            your own routine.
          </p>

        </div>


        <button
          type="button"
          className="text-btn"

          disabled={
            loading ||
            saving
          }

          onClick={() =>
            void loadPreferences()
          }
        >
          Refresh
        </button>

      </div>


      {/* LOADING */}

      {loading && (

        <p>
          Loading your study times...
        </p>

      )}


      {/* SIGNED OUT */}

      {!loading &&
        !signedIn && (

        <div
          className="callout"
        >

          <strong>
            Sign in to personalise your study hours
          </strong>


          <p>
            Until then, the planner can use the
            default Morning, Afternoon and Evening
            study windows.
          </p>

        </div>

      )}


      {/* SETTINGS */}

      {!loading &&
        signedIn && (

        <form
          onSubmit={
            savePreferences
          }
        >

          {/* CURRENT SUMMARY */}

          <div
            style={{
              display:
                'flex',

              gap:
                '8px',

              flexWrap:
                'wrap',

              marginTop:
                '14px',

              marginBottom:
                '16px'
            }}
          >

            <span
              className="tag"
            >
              Morning:
              {' '}
              {friendlyTime(
                values.morningStart
              )}
              {' – '}
              {friendlyTime(
                values.morningEnd
              )}
            </span>


            <span
              className="tag"
            >
              Afternoon:
              {' '}
              {friendlyTime(
                values.afternoonStart
              )}
              {' – '}
              {friendlyTime(
                values.afternoonEnd
              )}
            </span>


            <span
              className="tag"
            >
              Evening:
              {' '}
              {friendlyTime(
                values.eveningStart
              )}
              {' – '}
              {friendlyTime(
                values.eveningEnd
              )}
            </span>

          </div>


          {/* TIME BLOCKS */}

          <div
            style={{
              display:
                'grid',

              gridTemplateColumns:
                'repeat(auto-fit, minmax(250px, 1fr))',

              gap:
                '12px'
            }}
          >

            {renderTimeCard(
              'Morning',
              'Fresh learning and important pending work.',
              'morningStart',
              'morningEnd'
            )}


            {renderTimeCard(
              'Afternoon',
              'Practice, testing and active recall.',
              'afternoonStart',
              'afternoonEnd'
            )}


            {renderTimeCard(
              'Evening',
              'Revision and consolidation of the day.',
              'eveningStart',
              'eveningEnd'
            )}

          </div>


          {/* EXPLANATION */}

          <div
            className="callout"

            style={{
              marginTop:
                '16px'
            }}
          >

            <strong>
              Your schedule stays flexible
            </strong>


            <p>
              These times decide which study block
              is highlighted as NOW. They do not
              prevent you from studying or opening
              any task outside that time.
            </p>

          </div>


          {/* ACTIONS */}

          <div
            style={{
              display:
                'flex',

              gap:
                '10px',

              flexWrap:
                'wrap',

              marginTop:
                '16px'
            }}
          >

            <button
              type="submit"
              className="primary-btn"

              disabled={
                saving
              }
            >
              {
                saving
                  ? 'Saving...'
                  : 'Save Study Times'
              }
            </button>


            <button
              type="button"
              className="secondary-btn"

              disabled={
                saving
              }

              onClick={() =>
                void resetDefaults()
              }
            >
              Reset to Default
            </button>

          </div>

        </form>

      )}


      {/* SUCCESS */}

      {message && (

        <div
          className="callout"

          style={{
            marginTop:
              '16px'
          }}
        >
          <strong>
            ✓ {message}
          </strong>
        </div>

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
            Unable to save study times
          </strong>


          <p>
            {error}
          </p>

        </div>

      )}

    </section>

  );
}

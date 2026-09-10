import {
  FormEvent,
  useEffect,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


type RevisionPreferencesRow = {
  revision_1_days:
    number |
    string |
    null;

  revision_2_days:
    number |
    string |
    null;

  final_revision_days:
    number |
    string |
    null;
};


type RevisionPreset = {
  name: string;
  description: string;
  revision1: number;
  revision2: number;
  finalRevision: number;
};


const DEFAULT_REVISION_1 =
  1;


const DEFAULT_REVISION_2 =
  7;


const DEFAULT_FINAL_REVISION =
  21;


const PRESETS:
  RevisionPreset[] = [

  {
    name:
      'Balanced',

    description:
      'Good general-purpose revision cycle.',

    revision1:
      1,

    revision2:
      7,

    finalRevision:
      21
  },

  {
    name:
      'Fast Revision',

    description:
      'Useful when the exam is closer.',

    revision1:
      1,

    revision2:
      3,

    finalRevision:
      7
  },

  {
    name:
      'Moderate',

    description:
      'A slightly wider revision cycle.',

    revision1:
      2,

    revision2:
      7,

    finalRevision:
      15
  },

  {
    name:
      'Long Cycle',

    description:
      'Useful for material already understood well.',

    revision1:
      3,

    revision2:
      10,

    finalRevision:
      30
  }

];


/*
 * =========================================
 * SAFE DAYS
 * =========================================
 */

function safeDays(
  value:
    number |
    string |
    null |
    undefined,

  fallback:
    number
) {

  const number =
    Number(
      value
    );


  if (
    !Number.isFinite(
      number
    )
  ) {

    return fallback;
  }


  return Math.min(
    365,
    Math.max(
      1,
      Math.round(
        number
      )
    )
  );
}


/*
 * =========================================
 * REVISION SCHEDULE SETTINGS
 * =========================================
 */

export function RevisionScheduleSettings() {

  const [
    revision1Days,
    setRevision1Days
  ] =
    useState(
      DEFAULT_REVISION_1
    );


  const [
    revision2Days,
    setRevision2Days
  ] =
    useState(
      DEFAULT_REVISION_2
    );


  const [
    finalRevisionDays,
    setFinalRevisionDays
  ] =
    useState(
      DEFAULT_FINAL_REVISION
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
   * LOAD SETTINGS
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
          'book_revision_preferences'
        )
        .select(
          `
          revision_1_days,
          revision_2_days,
          final_revision_days
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
        'Unable to load revision preferences:',
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


    if (!data) {

      /*
       * CREATE DEFAULT SETTINGS
       * FOR A NEW STUDENT
       */

      const {
        error:
          insertError
      } =
        await client
          .from(
            'book_revision_preferences'
          )
          .insert(
            {
              user_id:
                user.id,

              revision_1_days:
                DEFAULT_REVISION_1,

              revision_2_days:
                DEFAULT_REVISION_2,

              final_revision_days:
                DEFAULT_FINAL_REVISION
            }
          );


      if (
        insertError
      ) {

        console.error(
          'Unable to create revision preferences:',
          insertError
        );


        setError(
          insertError.message
        );


        setLoading(
          false
        );


        return;
      }


      setRevision1Days(
        DEFAULT_REVISION_1
      );


      setRevision2Days(
        DEFAULT_REVISION_2
      );


      setFinalRevisionDays(
        DEFAULT_FINAL_REVISION
      );


      setLoading(
        false
      );


      return;
    }


    const row =
      data as
        RevisionPreferencesRow;


    setRevision1Days(
      safeDays(
        row.revision_1_days,
        DEFAULT_REVISION_1
      )
    );


    setRevision2Days(
      safeDays(
        row.revision_2_days,
        DEFAULT_REVISION_2
      )
    );


    setFinalRevisionDays(
      safeDays(
        row.final_revision_days,
        DEFAULT_FINAL_REVISION
      )
    );


    setLoading(
      false
    );
  }


  /*
   * INITIAL LOAD
   */

  useEffect(
    () => {

      void loadPreferences();

    },
    []
  );


  /*
   * =========================================
   * APPLY PRESET
   * =========================================
   */

  function applyPreset(
    preset:
      RevisionPreset
  ) {

    setRevision1Days(
      preset.revision1
    );


    setRevision2Days(
      preset.revision2
    );


    setFinalRevisionDays(
      preset.finalRevision
    );


    setMessage(
      `${preset.name} schedule selected. Press Save Schedule to apply it.`
    );


    setError('');
  }


  /*
   * =========================================
   * RESET DEFAULT
   * =========================================
   */

  function resetDefault() {

    setRevision1Days(
      DEFAULT_REVISION_1
    );


    setRevision2Days(
      DEFAULT_REVISION_2
    );


    setFinalRevisionDays(
      DEFAULT_FINAL_REVISION
    );


    setMessage(
      'Default 1 → 7 → 21 day schedule selected. Press Save Schedule to apply it.'
    );


    setError('');
  }


  /*
   * =========================================
   * SAVE SETTINGS
   * =========================================
   */

  async function savePreferences(
    event:
      FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();


    const client =
      supabase;


    if (!client) {

      setError(
        'Supabase is not configured.'
      );


      return;
    }


    const first =
      safeDays(
        revision1Days,
        DEFAULT_REVISION_1
      );


    const second =
      safeDays(
        revision2Days,
        DEFAULT_REVISION_2
      );


    const third =
      safeDays(
        finalRevisionDays,
        DEFAULT_FINAL_REVISION
      );


    setRevision1Days(
      first
    );


    setRevision2Days(
      second
    );


    setFinalRevisionDays(
      third
    );


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
        'Sign in to save your revision schedule.'
      );


      return;
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
          'book_revision_preferences'
        )
        .upsert(
          {
            user_id:
              user.id,

            revision_1_days:
              first,

            revision_2_days:
              second,

            final_revision_days:
              third
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
        'Unable to save revision preferences:',
        saveError
      );


      setError(
        saveError.message
      );


      setSaving(
        false
      );


      return;
    }


    setMessage(
      'Revision schedule saved. Your unfinished revision due dates have been recalculated automatically.'
    );


    setSaving(
      false
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
            REVISION SETTINGS
          </span>


          <h2>
            Choose Your Revision Cycle
          </h2>


          <p>
            Decide how many days should pass
            before each revision stage.
          </p>

        </div>


        <button
          type="button"
          className="text-btn"

          disabled={
            loading
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
          Loading your revision settings...
        </p>

      )}


      {/* SIGNED OUT */}

      {!loading &&
        !signedIn && (

        <div
          className="callout"
        >

          <strong>
            Sign in to customise your revision cycle
          </strong>


          <p>
            The default schedule is
            1 day → 7 days → 21 days.
          </p>

        </div>

      )}


      {/* SETTINGS */}

      {!loading &&
        signedIn && (

        <>

          {/* CURRENT FLOW */}

          <div
            style={{
              display:
                'grid',

              gridTemplateColumns:
                'repeat(auto-fit, minmax(140px, 1fr))',

              gap:
                '10px',

              marginTop:
                '16px'
            }}
          >

            <div
              style={{
                padding:
                  '12px',

                border:
                  '1px solid rgba(255,255,255,.08)',

                borderRadius:
                  '12px',

                background:
                  'rgba(255,255,255,.025)'
              }}
            >

              <small>
                After Reading
              </small>


              <strong
                style={{
                  display:
                    'block',

                  marginTop:
                    '5px',

                  fontSize:
                    '1.2rem'
                }}
              >
                {revision1Days}
                {' '}
                {
                  revision1Days ===
                    1
                    ? 'day'
                    : 'days'
                }
              </strong>


              <small>
                Revision 1
              </small>

            </div>


            <div
              style={{
                padding:
                  '12px',

                border:
                  '1px solid rgba(255,255,255,.08)',

                borderRadius:
                  '12px',

                background:
                  'rgba(255,255,255,.025)'
              }}
            >

              <small>
                After Revision 1
              </small>


              <strong
                style={{
                  display:
                    'block',

                  marginTop:
                    '5px',

                  fontSize:
                    '1.2rem'
                }}
              >
                {revision2Days}
                {' '}
                {
                  revision2Days ===
                    1
                    ? 'day'
                    : 'days'
                }
              </strong>


              <small>
                Revision 2
              </small>

            </div>


            <div
              style={{
                padding:
                  '12px',

                border:
                  '1px solid rgba(255,255,255,.08)',

                borderRadius:
                  '12px',

                background:
                  'rgba(255,255,255,.025)'
              }}
            >

              <small>
                After Revision 2
              </small>


              <strong
                style={{
                  display:
                    'block',

                  marginTop:
                    '5px',

                  fontSize:
                    '1.2rem'
                }}
              >
                {finalRevisionDays}
                {' '}
                {
                  finalRevisionDays ===
                    1
                    ? 'day'
                    : 'days'
                }
              </strong>


              <small>
                Final Revision
              </small>

            </div>

          </div>


          {/* PRESETS */}

          <div
            style={{
              marginTop:
                '18px'
            }}
          >

            <strong>
              Quick schedules
            </strong>


            <div
              style={{
                display:
                  'grid',

                gridTemplateColumns:
                  'repeat(auto-fit, minmax(180px, 1fr))',

                gap:
                  '10px',

                marginTop:
                  '10px'
              }}
            >

              {PRESETS.map(
                preset => (

                  <button
                    key={
                      preset.name
                    }

                    type="button"

                    onClick={() =>
                      applyPreset(
                        preset
                      )
                    }

                    style={{
                      padding:
                        '12px',

                      textAlign:
                        'left',

                      border:
                        '1px solid rgba(255,255,255,.10)',

                      borderRadius:
                        '12px',

                      background:
                        'rgba(255,255,255,.035)',

                      color:
                        'inherit',

                      cursor:
                        'pointer'
                    }}
                  >

                    <strong>
                      {preset.name}
                    </strong>


                    <small
                      style={{
                        display:
                          'block',

                        marginTop:
                          '5px',

                        color:
                          '#94a3b8'
                      }}
                    >
                      {preset.revision1}
                      {' → '}
                      {preset.revision2}
                      {' → '}
                      {preset.finalRevision}
                      {' days'}
                    </small>


                    <small
                      style={{
                        display:
                          'block',

                        marginTop:
                          '5px',

                        color:
                          '#cbd5e1'
                      }}
                    >
                      {preset.description}
                    </small>

                  </button>

                )
              )}

            </div>

          </div>


          {/* CUSTOM FORM */}

          <form
            onSubmit={
              savePreferences
            }

            style={{
              marginTop:
                '20px'
            }}
          >

            <strong>
              Custom schedule
            </strong>


            <div
              className="study-resource-filter-grid"

              style={{
                marginTop:
                  '10px'
              }}
            >

              <label>

                <span>
                  Revision 1 after
                </span>


                <input
                  type="number"

                  min="1"

                  max="365"

                  step="1"

                  value={
                    revision1Days
                  }

                  onChange={
                    event =>
                      setRevision1Days(
                        safeDays(
                          event.target.value,
                          DEFAULT_REVISION_1
                        )
                      )
                  }
                />


                <small>
                  Days after first reading
                </small>

              </label>


              <label>

                <span>
                  Revision 2 after
                </span>


                <input
                  type="number"

                  min="1"

                  max="365"

                  step="1"

                  value={
                    revision2Days
                  }

                  onChange={
                    event =>
                      setRevision2Days(
                        safeDays(
                          event.target.value,
                          DEFAULT_REVISION_2
                        )
                      )
                  }
                />


                <small>
                  Days after Revision 1
                </small>

              </label>


              <label>

                <span>
                  Final Revision after
                </span>


                <input
                  type="number"

                  min="1"

                  max="365"

                  step="1"

                  value={
                    finalRevisionDays
                  }

                  onChange={
                    event =>
                      setFinalRevisionDays(
                        safeDays(
                          event.target.value,
                          DEFAULT_FINAL_REVISION
                        )
                      )
                  }
                />


                <small>
                  Days after Revision 2
                </small>

              </label>

            </div>


            {/* VISUAL FLOW */}

            <div
              className="callout"

              style={{
                marginTop:
                  '16px'
              }}
            >

              <strong>
                Your current cycle
              </strong>


              <p>
                Read
                {' → '}
                {revision1Days}
                {' '}
                {
                  revision1Days ===
                    1
                    ? 'day'
                    : 'days'
                }
                {' → '}
                Revision 1
                {' → '}
                {revision2Days}
                {' '}
                {
                  revision2Days ===
                    1
                    ? 'day'
                    : 'days'
                }
                {' → '}
                Revision 2
                {' → '}
                {finalRevisionDays}
                {' '}
                {
                  finalRevisionDays ===
                    1
                    ? 'day'
                    : 'days'
                }
                {' → '}
                Final Revision
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
                    : 'Save Schedule'
                }
              </button>


              <button
                type="button"
                className="secondary-btn"

                disabled={
                  saving
                }

                onClick={
                  resetDefault
                }
              >
                Use Default 1 → 7 → 21
              </button>

            </div>

          </form>

        </>

      )}


      {/* SUCCESS MESSAGE */}

      {message && (

        <div
          className="callout"

          style={{
            marginTop:
              '16px'
          }}
        >
          {message}
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
            Unable to save settings
          </strong>

          <p>
            {error}
          </p>
        </div>

      )}

    </section>

  );
}

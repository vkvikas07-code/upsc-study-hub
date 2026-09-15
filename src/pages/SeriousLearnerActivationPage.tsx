import {
  useMemo,
  useState
} from 'react';

import type {
  FormEvent
} from 'react';

import {
  TopBar
} from '../components/TopBar';

import {
  supabase
} from '../lib/supabase';


type TargetExam =
  | 'UPSC CSE'
  | 'State PSC'
  | 'Both';


type SeriousLearnerActivationPageProps = {
  displayName:
    string;

  onActivated:
    () => void;

  onSignOut:
    () => void;
};


export function SeriousLearnerActivationPage({
  displayName,
  onActivated,
  onSignOut
}: SeriousLearnerActivationPageProps) {

  const currentYear =
    new Date()
      .getFullYear();


  const targetYears =
    useMemo(
      () =>
        Array.from(
          {
            length:
              7
          },
          (
            _,
            index
          ) =>
            currentYear +
            index
        ),
      [
        currentYear
      ]
    );


  const [
    targetExam,
    setTargetExam
  ] =
    useState<TargetExam>(
      'UPSC CSE'
    );


  const [
    targetYear,
    setTargetYear
  ] =
    useState(
      currentYear
    );


  const [
    preferredLanguage,
    setPreferredLanguage
  ] =
    useState(
      'English'
    );


  const [
    dailyStudyMinutes,
    setDailyStudyMinutes
  ] =
    useState(
      60
    );


  const [
    commitmentConfirmed,
    setCommitmentConfirmed
  ] =
    useState(
      false
    );


  const [
    busy,
    setBusy
  ] =
    useState(
      false
    );


  const [
    errorMessage,
    setErrorMessage
  ] =
    useState('');


  const [
    successMessage,
    setSuccessMessage
  ] =
    useState('');


  /*
   * =========================================
   * ACTIVATE SERIOUS LEARNER
   * =========================================
   */

  async function activateAccess(
    event:
      FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();

    setErrorMessage('');
    setSuccessMessage('');


    const client =
      supabase;


    if (
      !client
    ) {

      setErrorMessage(
        'Study account service is not configured.'
      );

      return;
    }


    if (
      !commitmentConfirmed
    ) {

      setErrorMessage(
        'Please confirm your study commitment before continuing.'
      );

      return;
    }


    setBusy(
      true
    );


    try {

      const {
        error
      } =
        await client.rpc(
          'activate_serious_learner',
          {

            p_target_exam:
              targetExam,

            p_target_year:
              targetYear,

            p_preferred_language:
              preferredLanguage,

            p_daily_study_minutes:
              dailyStudyMinutes,

            p_commitment_confirmed:
              true

          }
        );


      if (
        error
      ) {

        throw error;
      }


      setSuccessMessage(
        'Serious Learner access activated successfully.'
      );


      window.setTimeout(
        () => {

          onActivated();

        },
        500
      );

    } catch (
      error
    ) {

      setErrorMessage(

        error instanceof
          Error

          ? error.message

          : 'Unable to activate Serious Learner access.'

      );

    } finally {

      setBusy(
        false
      );
    }
  }


  /*
   * =========================================
   * PAGE
   * =========================================
   */

  return (

    <div
      className="page-wrap"
    >

      <TopBar

        title="Study Access"

        subtitle="Complete your study commitment to unlock the full preparation system"

      />


      <section

        className="panel"

        style={{

          maxWidth:
            '720px',

          margin:
            '20px auto 0'

        }}

      >

        <span
          className="eyebrow"
        >
          SERIOUS LEARNER ACTIVATION
        </span>


        <h2>
          Welcome, {displayName}
        </h2>


        <p>
          Your account is active, but full study
          material is protected for students who
          intend to prepare seriously.
        </p>


        <div

          style={{

            marginTop:
              '16px',

            padding:
              '14px',

            borderRadius:
              '12px',

            background:
              'rgba(59, 130, 246, 0.10)'

          }}

        >

          <strong>
            Serious Learner access is free.
          </strong>


          <p

            style={{
              marginBottom:
                0
            }}

          >
            Complete your preparation profile and
            make a realistic study commitment.
            No payment is required.
          </p>

        </div>


        {/* =====================================
            WHAT WILL BE UNLOCKED
        ===================================== */}

        <div

          style={{

            display:
              'grid',

            gap:
              '8px',

            marginTop:
              '18px'

          }}

        >

          <strong>
            Full access includes:
          </strong>

          <div>
            ✓ Complete available UPSC PYQ archive
          </div>

          <div>
            ✓ State PSC previous year papers
          </div>

          <div>
            ✓ Current Affairs
          </div>

          <div>
            ✓ Full Prelims question bank
          </div>

          <div>
            ✓ Explanations and practice tools
          </div>

          <div>
            ✓ Test series
          </div>

          <div>
            ✓ Mains answer writing
          </div>

          <div>
            ✓ Notes and revision tools
          </div>

          <div>
            ✓ Progress and performance tracking
          </div>

        </div>


        {/* =====================================
            FORM
        ===================================== */}

        <form

          onSubmit={
            activateAccess
          }

          style={{

            display:
              'grid',

            gap:
              '16px',

            marginTop:
              '24px'

          }}

        >

          {/* TARGET EXAM */}

          <label

            style={{

              display:
                'grid',

              gap:
                '6px'

            }}

          >

            <strong>
              Target examination
            </strong>


            <select

              value={
                targetExam
              }

              onChange={
                event =>
                  setTargetExam(
                    event.target
                      .value as
                        TargetExam
                  )
              }

              style={{

                width:
                  '100%',

                boxSizing:
                  'border-box'

              }}

            >

              <option value="UPSC CSE">
                UPSC Civil Services Examination
              </option>

              <option value="State PSC">
                State PSC
              </option>

              <option value="Both">
                UPSC + State PSC
              </option>

            </select>

          </label>


          {/* TARGET YEAR */}

          <label

            style={{

              display:
                'grid',

              gap:
                '6px'

            }}

          >

            <strong>
              Target attempt year
            </strong>


            <select

              value={
                targetYear
              }

              onChange={
                event =>
                  setTargetYear(
                    Number(
                      event.target.value
                    )
                  )
              }

              style={{

                width:
                  '100%',

                boxSizing:
                  'border-box'

              }}

            >

              {targetYears.map(
                year => (

                  <option
                    key={
                      year
                    }
                    value={
                      year
                    }
                  >
                    {year}
                  </option>

                )
              )}

            </select>

          </label>


          {/* LANGUAGE */}

          <label

            style={{

              display:
                'grid',

              gap:
                '6px'

            }}

          >

            <strong>
              Preferred study language
            </strong>


            <select

              value={
                preferredLanguage
              }

              onChange={
                event =>
                  setPreferredLanguage(
                    event.target.value
                  )
              }

              style={{

                width:
                  '100%',

                boxSizing:
                  'border-box'

              }}

            >

              <option value="English">
                English
              </option>

              <option value="Hindi">
                Hindi
              </option>

              <option value="Marathi">
                Marathi
              </option>

              <option value="English + Hindi">
                English + Hindi
              </option>

              <option value="English + Marathi">
                English + Marathi
              </option>

            </select>

          </label>


          {/* DAILY STUDY TARGET */}

          <label

            style={{

              display:
                'grid',

              gap:
                '6px'

            }}

          >

            <strong>
              Daily study commitment
            </strong>


            <select

              value={
                dailyStudyMinutes
              }

              onChange={
                event =>
                  setDailyStudyMinutes(
                    Number(
                      event.target.value
                    )
                  )
              }

              style={{

                width:
                  '100%',

                boxSizing:
                  'border-box'

              }}

            >

              <option value={30}>
                30 minutes per day
              </option>

              <option value={60}>
                1 hour per day
              </option>

              <option value={90}>
                1.5 hours per day
              </option>

              <option value={120}>
                2 hours per day
              </option>

              <option value={180}>
                3 hours per day
              </option>

              <option value={240}>
                4 hours per day
              </option>

              <option value={360}>
                6 hours per day
              </option>

            </select>


            <small
              style={{
                opacity:
                  0.8
              }}
            >
              Choose a realistic target. Even 30 minutes
              of consistent study is meaningful.
            </small>

          </label>


          {/* COMMITMENT */}

          <label

            style={{

              display:
                'flex',

              alignItems:
                'flex-start',

              gap:
                '10px',

              padding:
                '14px',

              borderRadius:
                '12px',

              border:
                '1px solid rgba(255,255,255,.10)'

            }}

          >

            <input

              type="checkbox"

              checked={
                commitmentConfirmed
              }

              onChange={
                event =>
                  setCommitmentConfirmed(
                    event.target.checked
                  )
              }

              style={{
                marginTop:
                  '3px'
              }}

            />


            <span>

              <strong>
                My Study Commitment
              </strong>


              <small

                style={{

                  display:
                    'block',

                  marginTop:
                    '5px',

                  lineHeight:
                    1.5

                }}

              >
                I am joining UPSC Study Hub for genuine
                preparation. I will use the study material
                responsibly and work consistently toward
                my selected examination.
              </small>

            </span>

          </label>


          {/* ERROR */}

          {errorMessage && (

            <div

              role="alert"

              style={{

                padding:
                  '12px 14px',

                borderRadius:
                  '12px',

                background:
                  'rgba(220, 38, 38, 0.10)'

              }}

            >
              {errorMessage}
            </div>

          )}


          {/* SUCCESS */}

          {successMessage && (

            <div

              role="status"

              style={{

                padding:
                  '12px 14px',

                borderRadius:
                  '12px',

                background:
                  'rgba(22, 163, 74, 0.10)'

              }}

            >
              {successMessage}
            </div>

          )}


          {/* ACTIVATE */}

          <button

            type="submit"

            className="primary-btn"

            disabled={

              busy ||
              !commitmentConfirmed

            }

            style={{

              width:
                '100%',

              display:
                'flex',

              alignItems:
                'center',

              justifyContent:
                'center',

              textAlign:
                'center'

            }}

          >

            {
              busy

                ? 'Activating Study Access…'

                : 'Activate Serious Learner Access'
            }

          </button>


          {/* SIGN OUT */}

          <button

            type="button"

            className="secondary-btn"

            disabled={
              busy
            }

            onClick={
              onSignOut
            }

            style={{

              width:
                '100%',

              display:
                'flex',

              alignItems:
                'center',

              justifyContent:
                'center',

              textAlign:
                'center'

            }}

          >
            Sign Out
          </button>

        </form>

      </section>

    </div>

  );
}

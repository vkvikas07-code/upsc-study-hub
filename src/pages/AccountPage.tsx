import {
  useState
} from 'react';

import {
  TopBar
} from '../components/TopBar';

import {
  isSupabaseConfigured,
  supabase
} from '../lib/supabase';


type AccountMode =
  | 'signin'
  | 'signup'
  | 'forgot';


type AccountPageProps = {

  intent?:
    | 'study'
    | 'admin';

  onBack:
    () => void;
};


/*
 * Password reset emails from both the website
 * and Android APK will open the secure web reset page.
 *
 * Later, if you move to a custom domain,
 * we only need to change this URL.
 */
const PASSWORD_RESET_REDIRECT_URL =
  'https://vkvikas07-code.github.io/upsc-study-hub/?password-recovery=1';


export function AccountPage({
  intent = 'study',
  onBack
}: AccountPageProps) {

  const [
    mode,
    setMode
  ] =
    useState<AccountMode>(
      'signin'
    );


  const [
    displayName,
    setDisplayName
  ] =
    useState('');


  const [
    email,
    setEmail
  ] =
    useState('');


  const [
    password,
    setPassword
  ] =
    useState('');


  const [
    confirmPassword,
    setConfirmPassword
  ] =
    useState('');


  const [
    busy,
    setBusy
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
    errorMessage,
    setErrorMessage
  ] =
    useState('');


  /*
   * =====================================
   * SWITCH ACCOUNT MODE
   * =====================================
   */

  function switchMode(
    nextMode:
      AccountMode
  ) {

    setMode(
      nextMode
    );

    setMessage('');
    setErrorMessage('');

    setPassword('');
    setConfirmPassword('');
  }


  /*
   * =====================================
   * SUBMIT
   * =====================================
   */

  async function submit(
    event:
      React.FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();


    setMessage('');
    setErrorMessage('');


    if (
      !supabase
    ) {

      setErrorMessage(
        'Supabase is not configured yet. Add the project URL and publishable key first.'
      );

      return;
    }


    /*
     * =====================================
     * FORGOT PASSWORD
     * =====================================
     */

    if (
      mode ===
      'forgot'
    ) {

      const cleanEmail =
        email.trim();


      if (
        !cleanEmail
      ) {

        setErrorMessage(
          'Enter the email address used for your account.'
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
          await supabase.auth
            .resetPasswordForEmail(
              cleanEmail,
              {
                redirectTo:
                  PASSWORD_RESET_REDIRECT_URL
              }
            );


        if (
          error
        ) {

          throw error;
        }


        /*
         * Deliberately use a generic response.
         * This avoids revealing whether an email
         * address is registered.
         */
        setMessage(
          'If an account exists for this email, a password reset link has been sent. Open the email and follow the link to create a new password.'
        );

      } catch (
        error
      ) {

        setErrorMessage(
          error instanceof
            Error
            ? error.message
            : 'Unable to send the password reset email.'
        );

      } finally {

        setBusy(
          false
        );
      }


      return;
    }


    /*
     * =====================================
     * SIGN-UP VALIDATION
     * =====================================
     */

    if (
      mode ===
        'signup' &&
      password !==
        confirmPassword
    ) {

      setErrorMessage(
        'The two passwords do not match.'
      );

      return;
    }


    setBusy(
      true
    );


    try {

      /*
       * =====================================
       * CREATE ACCOUNT
       * =====================================
       */

      if (
        mode ===
        'signup'
      ) {

        const {
          data,
          error
        } =
          await supabase.auth
            .signUp({

              email:
                email.trim(),

              password,

              options: {

                data: {

                  display_name:
                    displayName
                      .trim() ||
                    'Aspirant'

                }

              }

            });


        if (
          error
        ) {

          throw error;
        }


        if (
          data.session
        ) {

          setMessage(
            'Account created. You are signed in.'
          );

        } else {

          setMessage(
            'Account created. Check your email if your Supabase project requires email confirmation.'
          );
        }


        return;
      }


      /*
       * =====================================
       * SIGN IN
       * =====================================
       */

      const {
        error
      } =
        await supabase.auth
          .signInWithPassword({

            email:
              email.trim(),

            password

          });


      if (
        error
      ) {

        throw error;
      }


      setMessage(
        'Signed in successfully.'
      );

    } catch (
      error
    ) {

      setErrorMessage(
        error instanceof
          Error
          ? error.message
          : 'Unable to complete sign in.'
      );

    } finally {

      setBusy(
        false
      );
    }
  }


  /*
   * =====================================
   * PAGE TEXT
   * =====================================
   */

  const heading =

    mode ===
      'signin'

      ? 'Welcome back'

      : mode ===
        'signup'

      ? 'Create your aspirant account'

      : 'Reset your password';


  const description =

    mode ===
      'forgot'

      ? 'Enter your registered email address. We will send a secure password reset link.'

      : 'Your password is handled by Supabase Authentication. The app never stores your password in localStorage.';


  /*
   * =====================================
   * PAGE
   * =====================================
   */

  return (

    <div
      className="page-wrap"
    >

      <TopBar

        title={

          intent ===
            'admin'

            ? 'Editor Sign In'

            : 'My Account'

        }

        subtitle={

          intent ===
            'admin'

            ? 'Editor or admin access is required for content management'

            : 'Sign in to keep your UPSC study account connected across web and Android'

        }

      />


      <section

        className="panel"

        style={{

          maxWidth:
            '620px',

          margin:
            '20px auto 0'

        }}

      >

        <span
          className="eyebrow"
        >
          SECURE ACCOUNT
        </span>


        <h2>
          {heading}
        </h2>


        <p>
          {description}
        </p>


        {!isSupabaseConfigured && (

          <div

            role="status"

            style={{

              marginTop:
                '16px',

              padding:
                '12px 14px',

              borderRadius:
                '12px',

              background:
                'rgba(245, 158, 11, 0.12)'

            }}

          >

            Supabase environment variables are missing.
            Follow AUTH_SETUP.md before enabling accounts.

          </div>

        )}


        {/* =====================================
            SIGN IN / CREATE ACCOUNT TABS
        ===================================== */}

        {mode !==
          'forgot' && (

          <div

            className="filter-row"

            style={{
              marginTop:
                '18px'
            }}

          >

            <button

              type="button"

              className={

                mode ===
                  'signin'

                  ? 'filter active'

                  : 'filter'

              }

              onClick={() =>
                switchMode(
                  'signin'
                )
              }

            >
              Sign In
            </button>


            <button

              type="button"

              className={

                mode ===
                  'signup'

                  ? 'filter active'

                  : 'filter'

              }

              onClick={() =>
                switchMode(
                  'signup'
                )
              }

            >
              Create Account
            </button>

          </div>

        )}


        {/* =====================================
            FORM
        ===================================== */}

        <form

          onSubmit={
            submit
          }

          style={{

            display:
              'grid',

            gap:
              '14px',

            marginTop:
              '18px'

          }}

        >

          {/* DISPLAY NAME */}

          {mode ===
            'signup' && (

            <label

              style={{

                display:
                  'grid',

                gap:
                  '6px'

              }}

            >

              <strong>
                Display name
              </strong>


              <input

                type="text"

                autoComplete="name"

                value={
                  displayName
                }

                onChange={
                  event =>
                    setDisplayName(
                      event
                        .target
                        .value
                    )
                }

                placeholder="Aspirant name"

                maxLength={
                  80
                }

                style={{

                  width:
                    '100%',

                  boxSizing:
                    'border-box'

                }}

              />

            </label>

          )}


          {/* EMAIL */}

          <label

            style={{

              display:
                'grid',

              gap:
                '6px'

            }}

          >

            <strong>
              Email
            </strong>


            <input

              type="email"

              autoComplete="email"

              required

              value={
                email
              }

              onChange={
                event =>
                  setEmail(
                    event
                      .target
                      .value
                  )
              }

              placeholder="name@example.com"

              style={{

                width:
                  '100%',

                boxSizing:
                  'border-box'

              }}

            />

          </label>


          {/* PASSWORD */}

          {mode !==
            'forgot' && (

            <label

              style={{

                display:
                  'grid',

                gap:
                  '6px'

              }}

            >

              <strong>
                Password
              </strong>


              <input

                type="password"

                autoComplete={

                  mode ===
                    'signup'

                    ? 'new-password'

                    : 'current-password'

                }

                required

                minLength={
                  6
                }

                value={
                  password
                }

                onChange={
                  event =>
                    setPassword(
                      event
                        .target
                        .value
                    )
                }

                style={{

                  width:
                    '100%',

                  boxSizing:
                    'border-box'

                }}

              />

            </label>

          )}


          {/* CONFIRM PASSWORD */}

          {mode ===
            'signup' && (

            <label

              style={{

                display:
                  'grid',

                gap:
                  '6px'

              }}

            >

              <strong>
                Confirm password
              </strong>


              <input

                type="password"

                autoComplete="new-password"

                required

                minLength={
                  6
                }

                value={
                  confirmPassword
                }

                onChange={
                  event =>
                    setConfirmPassword(
                      event
                        .target
                        .value
                    )
                }

                style={{

                  width:
                    '100%',

                  boxSizing:
                    'border-box'

                }}

              />

            </label>

          )}


          {/* FORGOT PASSWORD */}

          {mode ===
            'signin' && (

            <button

              type="button"

              className="secondary-btn"

              onClick={() =>
                switchMode(
                  'forgot'
                )
              }

            >
              Forgot Password?
            </button>

          )}


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

          {message && (

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

              {message}

            </div>

          )}


          {/* MAIN BUTTON */}

          <button
  type="submit"
  className="primary-btn"

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

  disabled={

    busy ||
    !isSupabaseConfigured

  }
>

  {

    busy

      ? 'Please wait…'

      : mode ===
        'signin'

      ? 'Sign In'

      : mode ===
        'signup'

      ? 'Create Account'

      : 'Send Reset Link'

  }

</button>

            disabled={

              busy ||
              !isSupabaseConfigured

            }

          >

            {

              busy

                ? 'Please wait…'

                : mode ===
                  'signin'

                ? 'Sign In'

                : mode ===
                  'signup'

                ? 'Create Account'

                : 'Send Reset Link'

            }

          </button>


          {/* BACK FROM FORGOT PASSWORD */}

          {mode ===
            'forgot' && (

            <button

              type="button"

              className="secondary-btn"

              onClick={() =>
                switchMode(
                  'signin'
                )
              }

            >
              Back to Sign In
            </button>

          )}


          <button

            type="button"

            className="secondary-btn"

            onClick={
              onBack
            }

          >
            Back to Home
          </button>

        </form>

      </section>

    </div>
  );
}

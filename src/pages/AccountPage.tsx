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
  | 'signup';


type AccountPageProps = {
  intent?:
    'study' |
    'admin';

  onBack: () => void;
};


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
    useState(false);


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


  async function submit(
    event:
      React.FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();


    setMessage('');
    setErrorMessage('');


    if (!supabase) {

      setErrorMessage(
        'Supabase is not configured yet. Add the project URL and publishable key first.'
      );


      return;
    }


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

      if (
        mode ===
        'signup'
      ) {

        const {
          data,
          error
        } =
          await supabase.auth.signUp({

            email:
              email.trim(),

            password,

            options: {
              data: {
                display_name:
                  displayName.trim() ||
                  'Aspirant'
              }
            }

          });


        if (error) {
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


      const {
        error
      } =
        await supabase.auth.signInWithPassword({

          email:
            email.trim(),

          password

        });


      if (error) {
        throw error;
      }


      setMessage(
        'Signed in successfully.'
      );

    } catch (
      error
    ) {

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to complete sign in.'
      );

    } finally {

      setBusy(
        false
      );
    }
  }


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
          {
            mode ===
              'signin'
              ? 'Welcome back'
              : 'Create your aspirant account'
          }
        </h2>


        <p>
          Your password is handled by Supabase Authentication.
          The app never stores your password in localStorage.
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
            onClick={() => {
              setMode(
                'signin'
              );
              setMessage('');
              setErrorMessage('');
            }}
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
            onClick={() => {
              setMode(
                'signup'
              );
              setMessage('');
              setErrorMessage('');
            }}
          >
            Create Account
          </button>

        </div>


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
                      event.target.value
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
                    event.target.value
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
                    event.target.value
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
                      event.target.value
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


          <button
            type="submit"
            className="primary-btn"
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
                : 'Create Account'
            }
          </button>


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

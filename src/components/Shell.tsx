import {
  useEffect,
  useRef
} from 'react';

import type {
  ReactNode
} from 'react';

import {
  IonIcon
} from '@ionic/react';

import {
  homeOutline,
  bookOutline,
  createOutline,
  newspaperOutline,
  personCircleOutline,
  settingsOutline
} from 'ionicons/icons';

import type {
  NavKey
} from '../types';

import {
  useLanguage,
  type AppLanguage
} from '../i18n';


type NavItem = {
  key:
    NavKey;

  labelKey:
    | 'home'
    | 'learn'
    | 'practice'
    | 'current'
    | 'me';

  icon:
    string;
};


const items:
  NavItem[] = [

  {
    key:
      'home',

    labelKey:
      'home',

    icon:
      homeOutline
  },

  {
    key:
      'learn',

    labelKey:
      'learn',

    icon:
      bookOutline
  },

  {
    key:
      'practice',

    labelKey:
      'practice',

    icon:
      createOutline
  },

  {
    key:
      'current',

    labelKey:
      'current',

    icon:
      newspaperOutline
  },

  {
    key:
      'profile',

    labelKey:
      'me',

    icon:
      personCircleOutline
  }

];


function getScrollKey(
  active:
    NavKey
) {

  return `upsc-scroll-${active}`;
}


function readSavedScroll(
  active:
    NavKey
) {

  try {

    const stored =
      sessionStorage.getItem(
        getScrollKey(
          active
        )
      );


    if (
      !stored
    ) {

      return 0;
    }


    const value =
      Number(
        stored
      );


    return Number.isFinite(
      value
    )
      ? Math.max(
          0,
          value
        )
      : 0;

  } catch {

    return 0;
  }
}


function saveStoredScroll(
  active:
    NavKey,

  value:
    number
) {

  try {

    sessionStorage.setItem(
      getScrollKey(
        active
      ),

      String(
        Math.max(
          0,
          Math.round(
            value
          )
        )
      )
    );

  } catch {

    // Ignore storage errors.
  }
}


function clearStoredScroll(
  active:
    NavKey
) {

  try {

    sessionStorage.removeItem(
      getScrollKey(
        active
      )
    );

  } catch {

    // Ignore storage errors.
  }
}


function LanguageSelector() {

  const {
    language,
    setLanguage,
    t
  } =
    useLanguage();


  return (

    <div
      style={{
        marginTop:
          '18px'
      }}
    >

      <small
        style={{
          display:
            'block',

          marginBottom:
            '7px',

          color:
            '#94a3b8'
        }}
      >
        {
          t(
            'language'
          )
        }
      </small>


      <select
        value={
          language
        }
        onChange={
          event =>
            setLanguage(
              event.target
                .value as
                AppLanguage
            )
        }
        aria-label={
          t(
            'language'
          )
        }
        style={{
          width:
            '100%'
        }}
      >

        <option value="en">
          English
        </option>

        <option value="hi">
          हिंदी
        </option>

        <option value="mr">
          मराठी
        </option>

      </select>

    </div>

  );
}


export function Shell({
  active,
  onNavigate,
  children
}: {
  active:
    NavKey;

  onNavigate:
    (
      key:
        NavKey
    ) =>
      void;

  children:
    ReactNode;
}) {

  const {
    t
  } =
    useLanguage();


  const mainRef =
    useRef<
      HTMLElement |
      null
    >(
      null
    );


  const scrollSaveFrameRef =
    useRef<
      number |
      null
    >(
      null
    );


  const restoreFrameRef =
    useRef<
      number |
      null
    >(
      null
    );


  useEffect(
    () => {

      const main =
        mainRef.current;


      if (
        !main
      ) {

        return;
      }


      let disposed =
        false;


      const restoreSavedPosition =
        () => {

          const saved =
            readSavedScroll(
              active
            );


          if (
            saved <=
            0
          ) {

            return;
          }


          if (
            restoreFrameRef.current !==
            null
          ) {

            window.cancelAnimationFrame(
              restoreFrameRef.current
            );
          }


          restoreFrameRef.current =
            window.requestAnimationFrame(
              () => {

                restoreFrameRef.current =
                  null;


                if (
                  disposed
                ) {

                  return;
                }


                const maxScroll =
                  Math.max(
                    0,

                    main.scrollHeight -
                    main.clientHeight
                  );


                main.scrollTop =
                  Math.min(
                    saved,
                    maxScroll
                  );

              }
            );
        };


      const handleScroll =
        () => {

          if (
            scrollSaveFrameRef.current !==
            null
          ) {

            return;
          }


          scrollSaveFrameRef.current =
            window.requestAnimationFrame(
              () => {

                scrollSaveFrameRef.current =
                  null;


                if (
                  document.visibilityState !==
                  'visible'
                ) {

                  return;
                }


                saveStoredScroll(
                  active,
                  main.scrollTop
                );

              }
            );
        };


      const handleVisibilityChange =
        () => {

          if (
            document.visibilityState ===
            'hidden'
          ) {

            saveStoredScroll(
              active,
              main.scrollTop
            );


            return;
          }


          if (
            main.scrollTop <=
            1
          ) {

            restoreSavedPosition();
          }
        };


      const handlePageHide =
        () => {

          saveStoredScroll(
            active,
            main.scrollTop
          );
        };


      const handlePageShow =
        () => {

          if (
            main.scrollTop <=
            1
          ) {

            restoreSavedPosition();
          }
        };


      main.addEventListener(
        'scroll',
        handleScroll,
        {
          passive:
            true
        }
      );


      document.addEventListener(
        'visibilitychange',
        handleVisibilityChange
      );


      window.addEventListener(
        'pagehide',
        handlePageHide
      );


      window.addEventListener(
        'pageshow',
        handlePageShow
      );


      restoreSavedPosition();


      return () => {

        disposed =
          true;


        main.removeEventListener(
          'scroll',
          handleScroll
        );


        document.removeEventListener(
          'visibilitychange',
          handleVisibilityChange
        );


        window.removeEventListener(
          'pagehide',
          handlePageHide
        );


        window.removeEventListener(
          'pageshow',
          handlePageShow
        );


        if (
          scrollSaveFrameRef.current !==
          null
        ) {

          window.cancelAnimationFrame(
            scrollSaveFrameRef.current
          );


          scrollSaveFrameRef.current =
            null;
        }


        if (
          restoreFrameRef.current !==
          null
        ) {

          window.cancelAnimationFrame(
            restoreFrameRef.current
          );


          restoreFrameRef.current =
            null;
        }

      };

    },
    [
      active
    ]
  );


  function navigate(
    next:
      NavKey
  ) {

    const main =
      mainRef.current;


    if (
      main
    ) {

      saveStoredScroll(
        active,
        main.scrollTop
      );
    }


    if (
      next !==
      active
    ) {

      clearStoredScroll(
        next
      );


      if (
        main
      ) {

        main.scrollTop =
          0;
      }
    }


    onNavigate(
      next
    );
  }


  return (

    <div
      className="app-shell"
    >

      <aside
        className="desktop-sidebar"
      >

        <div
          className="brand-block"
        >

          <div
            className="brand-mark"
          >
            U
          </div>


          <div>

            <strong>
              UPSC Study Hub
            </strong>

            <span>
              {
                t(
                  'tagline'
                )
              }
            </span>

          </div>

        </div>


        <nav>

          {
            items.map(
              item => (

                <button
                  key={
                    item.key
                  }
                  type="button"
                  className={
                    active ===
                    item.key
                      ? 'nav-active'
                      : ''
                  }
                  onClick={() =>
                    navigate(
                      item.key
                    )
                  }
                >

                  <IonIcon
                    icon={
                      item.icon
                    }
                  />

                  <span>
                    {
                      t(
                        item.labelKey
                      )
                    }
                  </span>

                </button>

              )
            )
          }

        </nav>


        <LanguageSelector />


        <button
          type="button"
          className="admin-link"
          onClick={() =>
            navigate(
              'admin'
            )
          }
        >

          <IonIcon
            icon={
              settingsOutline
            }
          />

          {
            t(
              'adminStudio'
            )
          }

        </button>

      </aside>


      <main
        ref={
          mainRef
        }
        className="main-area"
      >

        {
          children
        }

      </main>


      <nav
        className="mobile-bottom-nav"
      >

        {
          items.map(
            item => (

              <button
                key={
                  item.key
                }
                type="button"
                className={
                  active ===
                  item.key
                    ? 'nav-active'
                    : ''
                }
                onClick={() =>
                  navigate(
                    item.key
                  )
                }
              >

                <IonIcon
                  icon={
                    item.icon
                  }
                />

                <span>
                  {
                    t(
                      item.labelKey
                    )
                  }
                </span>

              </button>

            )
          )
        }

      </nav>

    </div>

  );
}

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


const items: Array<{
  key: NavKey;
  label: string;
  icon: string;
}> = [

  {
    key: 'home',
    label: 'Home',
    icon: homeOutline
  },

  {
    key: 'learn',
    label: 'Learn',
    icon: bookOutline
  },

  {
    key: 'practice',
    label: 'Practice',
    icon: createOutline
  },

  {
    key: 'current',
    label: 'Current',
    icon: newspaperOutline
  },

  {
    key: 'profile',
    label: 'Me',
    icon: personCircleOutline
  }

];


function getScrollKey(
  active: NavKey
) {

  return `upsc-scroll-${active}`;
}


function readSavedScroll(
  active: NavKey
) {

  try {

    const stored =
      sessionStorage.getItem(
        getScrollKey(
          active
        )
      );


    if (!stored) {

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
  active: NavKey,
  value: number
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

    // Storage may be unavailable in some browsers.
  }
}


function clearStoredScroll(
  active: NavKey
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


export function Shell({
  active,
  onNavigate,
  children
}: {
  active: NavKey;
  onNavigate: (key: NavKey) => void;
  children: ReactNode;
}) {

  const mainRef =
    useRef<HTMLElement | null>(
      null
    );


  /*
   * Used only to throttle scroll saving.
   *
   * We no longer repeatedly force the scroll
   * position while the student is scrolling.
   */

  const scrollSaveFrameRef =
    useRef<number | null>(
      null
    );


  const restoreFrameRef =
    useRef<number | null>(
      null
    );


  /* =======================================================
     SIMPLE + SMOOTH SCROLL STATE
  ======================================================= */

  useEffect(
    () => {

      const main =
        mainRef.current;


      if (!main) {

        return;
      }


      let disposed =
        false;


      /*
       * Restore once.
       *
       * The previous implementation repeatedly
       * restored at many time intervals and watched
       * DOM mutations. That could interrupt normal
       * touch / mouse scrolling.
       */

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


      /*
       * Save at most once per animation frame.
       *
       * This avoids doing sessionStorage writes
       * for every individual scroll event.
       */

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


      /*
       * Save when app/browser is moved into
       * the background.
       */

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


          /*
           * Some mobile browsers reset an inner
           * scroll container to zero when returning
           * to the app.
           *
           * Restore only if that actually happened.
           * Never fight the user's current position.
           */

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


      /*
       * Initial restoration.
       */

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


  /* =======================================================
     APP NAVIGATION
  ======================================================= */

  function navigate(
    next:
      NavKey
  ) {

    const main =
      mainRef.current;


    /*
     * Save page position before leaving.
     */

    if (
      main
    ) {

      saveStoredScroll(
        active,
        main.scrollTop
      );
    }


    /*
     * Normal app navigation opens the selected
     * section from the top.
     *
     * Browser/app background switching is handled
     * separately and preserves the position.
     */

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


  /* =======================================================
     PAGE
  ======================================================= */

  return (

    <div
      className="app-shell"
    >

      {/* DESKTOP SIDEBAR */}

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
              Learn. Practice. Progress.
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
                      item.label
                    }
                  </span>

                </button>

              )
            )
          }

        </nav>


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

          Admin Studio

        </button>

      </aside>


      {/* MAIN SCROLL CONTAINER */}

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


      {/* MOBILE NAVIGATION */}

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
                    item.label
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

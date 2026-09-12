import {
  useEffect,
  useRef
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

    const value =
      sessionStorage.getItem(
        getScrollKey(
          active
        )
      );

    if (!value) {

      return 0;
    }


    const parsed =
      Number(
        value
      );


    return Number.isFinite(
      parsed
    )
      ? parsed
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
        value
      )
    );

  } catch {

    // Ignore storage errors.
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
  children: React.ReactNode;
}) {

  /*
   * =========================================
   * REAL APP SCROLL CONTAINER
   * =========================================
   */

  const mainRef =
    useRef<HTMLElement | null>(
      null
    );


  /*
   * Keep latest known scroll position in memory.
   */

  const savedScrollRef =
    useRef(
      0
    );


  /*
   * While restoring the page, browser-generated
   * scroll events must not overwrite our saved
   * position with zero.
   */

  const restoringUntilRef =
    useRef(
      0
    );


  /*
   * =========================================
   * SAVE + RESTORE SCROLL
   * =========================================
   */

  useEffect(
    () => {

      const main =
        mainRef.current;


      if (!main) {

        return;
      }


      /*
       * Start with any position saved during this
       * browser session.
       */

      savedScrollRef.current =
        readSavedScroll(
          active
        );


      let timers:
        number[] = [];


      function clearTimers() {

        timers.forEach(
          timer =>
            window.clearTimeout(
              timer
            )
        );


        timers =
          [];
      }


      function savePosition() {

        const currentMain =
          mainRef.current;


        if (!currentMain) {

          return;
        }


        const position =
          currentMain.scrollTop;


        savedScrollRef.current =
          position;


        saveStoredScroll(
          active,
          position
        );
      }


      /*
       * Restore more than once because Supabase /
       * React can update page height shortly after
       * the browser tab becomes active again.
       */

      function restorePosition() {

        const target =
          savedScrollRef.current;


        if (
          target <=
          0
        ) {

          return;
        }


        restoringUntilRef.current =
          Date.now() +
          2200;


        clearTimers();


        function applyPosition() {

          const currentMain =
            mainRef.current;


          if (!currentMain) {

            return;
          }


          if (
            Date.now() >
            restoringUntilRef.current
          ) {

            return;
          }


          const difference =
            Math.abs(
              currentMain.scrollTop -
              target
            );


          if (
            difference >
            2
          ) {

            currentMain.scrollTo({
              top:
                target,

              behavior:
                'auto'
            });
          }
        }


        window.requestAnimationFrame(
          applyPosition
        );


        [
          40,
          100,
          200,
          400,
          700,
          1100,
          1600,
          2100
        ].forEach(
          delay => {

            const timer =
              window.setTimeout(
                applyPosition,
                delay
              );


            timers.push(
              timer
            );
          }
        );
      }


      /*
       * User manually scrolls.
       */

      function handleScroll() {

        /*
         * Do not save browser's temporary
         * zero position while restoration
         * is running.
         */

        if (
          Date.now() <=
          restoringUntilRef.current
        ) {

          return;
        }


        /*
         * Only record normal visible-page
         * scrolling.
         */

        if (
          document.visibilityState !==
          'visible'
        ) {

          return;
        }


        savePosition();
      }


      /*
       * User changes browser tab.
       */

      function handleVisibilityChange() {

        if (
          document.visibilityState ===
          'hidden'
        ) {

          savePosition();

          return;
        }


        /*
         * Returning from ChatGPT / another tab.
         */

        restorePosition();
      }


      /*
       * Extra browser protection.
       */

      function handleWindowBlur() {

        savePosition();
      }


      function handleWindowFocus() {

        restorePosition();
      }


      /*
       * Protect browser Back / Forward and BFCache.
       */

      function handlePageHide() {

        savePosition();
      }


      function handlePageShow() {

        const stored =
          readSavedScroll(
            active
          );


        if (
          stored >
          0
        ) {

          savedScrollRef.current =
            stored;
        }


        restorePosition();
      }


      /*
       * React may temporarily change page height
       * while account/session information updates.
       * Reapply the position during that short period.
       */

      const observer =
        new MutationObserver(
          () => {

            if (
              document.visibilityState !==
              'visible'
            ) {

              return;
            }


            if (
              Date.now() >
              restoringUntilRef.current
            ) {

              return;
            }


            const target =
              savedScrollRef.current;


            if (
              target <=
              0
            ) {

              return;
            }


            const currentMain =
              mainRef.current;


            if (!currentMain) {

              return;
            }


            if (
              Math.abs(
                currentMain.scrollTop -
                target
              ) >
              2
            ) {

              currentMain.scrollTo({
                top:
                  target,

                behavior:
                  'auto'
              });
            }
          }
        );


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
        'blur',
        handleWindowBlur
      );


      window.addEventListener(
        'focus',
        handleWindowFocus
      );


      window.addEventListener(
        'pagehide',
        handlePageHide
      );


      window.addEventListener(
        'pageshow',
        handlePageShow
      );


      observer.observe(
        main,
        {
          childList:
            true,

          subtree:
            true
        }
      );


      /*
       * Restore position after initial render
       * if this page came back through browser
       * history.
       */

      if (
        savedScrollRef.current >
        0
      ) {

        restorePosition();
      }


      return () => {

        savePosition();


        clearTimers();


        main.removeEventListener(
          'scroll',
          handleScroll
        );


        document.removeEventListener(
          'visibilitychange',
          handleVisibilityChange
        );


        window.removeEventListener(
          'blur',
          handleWindowBlur
        );


        window.removeEventListener(
          'focus',
          handleWindowFocus
        );


        window.removeEventListener(
          'pagehide',
          handlePageHide
        );


        window.removeEventListener(
          'pageshow',
          handlePageShow
        );


        observer.disconnect();
      };

    },
    [
      active
    ]
  );


  /*
   * =========================================
   * APP NAVIGATION
   * =========================================
   */

  function navigate(
    next:
      NavKey
  ) {

    const main =
      mainRef.current;


    /*
     * Save the page we are leaving.
     */

    if (main) {

      saveStoredScroll(
        active,
        main.scrollTop
      );
    }


    /*
     * Clicking a real navigation item should
     * open that new page from the top.
     *
     * Switching browser tabs does NOT call this,
     * therefore the My Notes position is preserved.
     */

    if (
      next !==
      active
    ) {

      clearStoredScroll(
        next
      );


      savedScrollRef.current =
        0;


      restoringUntilRef.current =
        0;


      main?.scrollTo({
        top:
          0,

        behavior:
          'auto'
      });
    }


    onNavigate(
      next
    );
  }


  /*
   * =========================================
   * PAGE
   * =========================================
   */

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
                    {item.label}
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


      {/* REAL SCROLLING AREA */}

      <main
        ref={
          mainRef
        }

        className="main-area"
      >

        {children}

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
                  {item.label}
                </span>

              </button>
            )
          )
        }

      </nav>

    </div>
  );
}

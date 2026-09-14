import {
  useState
} from 'react';

import {
  IonIcon
} from '@ionic/react';

import {
  notificationsOutline,
  menuOutline,
  closeOutline,
  homeOutline,
  bookOutline,
  createOutline,
  newspaperOutline,
  personCircleOutline,
  settingsOutline
} from 'ionicons/icons';


const menuItems = [
  {
    label: 'Home',
    icon: homeOutline
  },
  {
    label: 'Learn',
    icon: bookOutline
  },
  {
    label: 'Practice',
    icon: createOutline
  },
  {
    label: 'Current',
    icon: newspaperOutline
  },
  {
    label: 'Me',
    icon: personCircleOutline
  }
];


export function TopBar({
  title,
  subtitle
}: {
  title: string;
  subtitle?: string;
}) {

  const [
    menuOpen,
    setMenuOpen
  ] =
    useState(false);


  function openSection(
    label: string
  ) {

    const buttons =
      Array.from(
        document.querySelectorAll<HTMLButtonElement>(
          '.mobile-bottom-nav button'
        )
      );


    const target =
      buttons.find(
        button =>
          button.textContent
            ?.trim() ===
          label
      );


    setMenuOpen(false);

    target?.click();
  }


  function openAdmin() {

    setMenuOpen(false);


    const adminButton =
      document.querySelector<HTMLButtonElement>(
        '.admin-link'
      );


    adminButton?.click();
  }


  return (

    <>

      <header
        className="topbar"
      >

        <button
          type="button"
          className="icon-button mobile-only"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() =>
            setMenuOpen(true)
          }
        >
          <IonIcon
            icon={menuOutline}
          />
        </button>


        <div
          className="topbar-title"
        >

          <h1>
            {title}
          </h1>


          {subtitle && (

            <p>
              {subtitle}
            </p>

          )}

        </div>


        <button
          type="button"
          className="icon-button"
          aria-label="Notifications"
        >

          <IonIcon
            icon={notificationsOutline}
          />

          <span
            className="notification-dot"
          />

        </button>

      </header>


      {menuOpen && (

        <div
          onClick={() =>
            setMenuOpen(false)
          }
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background:
              'rgba(2,6,23,.68)',
            backdropFilter:
              'blur(4px)'
          }}
        >

          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Main menu"
            onClick={
              event =>
                event.stopPropagation()
            }
            style={{
              width:
                'min(82vw, 310px)',

              height:
                '100dvh',

              background:
                '#0f172a',

              borderRight:
                '1px solid rgba(255,255,255,.10)',

              padding:
                'calc(env(safe-area-inset-top, 0px) + 18px) 16px 24px',

              display:
                'flex',

              flexDirection:
                'column',

              gap:
                '12px',

              boxShadow:
                '18px 0 50px rgba(0,0,0,.40)'
            }}
          >

            <div
              style={{
                display: 'flex',
                alignItems:
                  'center',

                justifyContent:
                  'space-between',

                gap: '12px',
                marginBottom:
                  '8px'
              }}
            >

              <div>

                <strong
                  style={{
                    display:
                      'block'
                  }}
                >
                  UPSC Study Hub
                </strong>

                <small
                  style={{
                    color:
                      '#94a3b8'
                  }}
                >
                  Quick navigation
                </small>

              </div>


              <button
                type="button"
                className="icon-button"
                aria-label="Close menu"
                onClick={() =>
                  setMenuOpen(false)
                }
              >

                <IonIcon
                  icon={closeOutline}
                />

              </button>

            </div>


            {menuItems.map(
              item => (

                <button
                  key={item.label}
                  type="button"
                  onClick={() =>
                    openSection(
                      item.label
                    )
                  }
                  style={{
                    border:
                      '1px solid rgba(255,255,255,.08)',

                    background:
                      'rgba(255,255,255,.035)',

                    color:
                      '#e2e8f0',

                    borderRadius:
                      '13px',

                    padding:
                      '13px 14px',

                    display:
                      'flex',

                    alignItems:
                      'center',

                    gap:
                      '12px',

                    textAlign:
                      'left'
                  }}
                >

                  <IonIcon
                    icon={item.icon}
                    style={{
                      color:
                        '#5eead4',

                      fontSize:
                        '1.2rem'
                    }}
                  />

                  {item.label}

                </button>

              )
            )}


            <button
              type="button"
              onClick={openAdmin}
              style={{
                marginTop:
                  'auto',

                border:
                  '1px solid rgba(45,212,191,.30)',

                background:
                  'rgba(20,184,166,.10)',

                color:
                  '#5eead4',

                borderRadius:
                  '13px',

                padding:
                  '13px 14px',

                display:
                  'flex',

                alignItems:
                  'center',

                gap:
                  '12px',

                textAlign:
                  'left'
              }}
            >

              <IonIcon
                icon={settingsOutline}
              />

              Admin Studio

            </button>

          </aside>

        </div>

      )}

    </>

  );
}

import {
  useEffect,
  useState
} from 'react';

import {
  createMainsFrameworkImageUrls
} from '../lib/mainsImages';


type Props = {
  paths:
    string[] |
    null |
    undefined;

  title?:
    string;
};


export function MainsFrameworkImages({
  paths,
  title = 'Visual Answer Framework'
}: Props) {

  const [
    urls,
    setUrls
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});


  const [
    loading,
    setLoading
  ] =
    useState(
      false
    );


  const safePaths =
    Array.isArray(
      paths
    )
      ? Array.from(
          new Set(
            paths
              .map(
                value =>
                  String(
                    value
                  )
              )
              .filter(
                Boolean
              )
          )
        )
      : [];


  useEffect(
    () => {

      let cancelled =
        false;


      async function loadImages() {

        if (
          safePaths.length ===
          0
        ) {

          setUrls(
            {}
          );

          setLoading(
            false
          );

          return;
        }


        setLoading(
          true
        );


        try {

          const nextUrls =
            await createMainsFrameworkImageUrls(
              safePaths
            );


          if (
            !cancelled
          ) {

            setUrls(
              nextUrls
            );

          }

        } catch (
          error
        ) {

          console.error(
            'Unable to load Mains framework images:',
            error
          );


          if (
            !cancelled
          ) {

            setUrls(
              {}
            );

          }

        } finally {

          if (
            !cancelled
          ) {

            setLoading(
              false
            );

          }

        }
      }


      void loadImages();


      return () => {

        cancelled =
          true;

      };

    },
    [
      safePaths.join(
        '|'
      )
    ]
  );


  if (
    safePaths.length ===
    0
  ) {

    return null;

  }


  return (

    <section
      className="panel"

      style={{
        marginTop:
          '14px',

        padding:
          '14px'
      }}
    >

      <span
        className="eyebrow"
      >
        VISUAL GUIDANCE
      </span>


      <h3
        style={{
          margin:
            '6px 0 4px'
        }}
      >
        {title}
      </h3>


      <p
        style={{
          margin:
            '0 0 12px',

          color:
            '#94a3b8',

          fontSize:
            '0.9rem'
        }}
      >
        Maps, diagrams, flowcharts, graphs or other visual points for answer enrichment.
      </p>


      {
        loading && (

        <p
          style={{
            color:
              '#94a3b8'
          }}
        >
          Loading visual framework...
        </p>

      )
      }


      {
        !loading && (

        <div
          style={{
            display:
              'grid',

            gridTemplateColumns:
              'repeat(auto-fit, minmax(220px, 1fr))',

            gap:
              '12px'
          }}
        >

          {
            safePaths.map(
              path => {

                const url =
                  urls[
                    path
                  ];


                if (
                  !url
                ) {

                  return null;

                }


                return (

                  <a
                    key={
                      path
                    }

                    href={
                      url
                    }

                    target="_blank"

                    rel="noreferrer"

                    style={{
                      display:
                        'block',

                      overflow:
                        'hidden',

                      borderRadius:
                        '12px',

                      border:
                        '1px solid rgba(255,255,255,.10)',

                      background:
                        '#0f172a',

                      textDecoration:
                        'none'
                    }}
                  >

                    <img
                      src={
                        url
                      }

                      alt="Mains answer framework"

                      loading="lazy"

                      style={{
                        display:
                          'block',

                        width:
                          '100%',

                        maxHeight:
                          '460px',

                        objectFit:
                          'contain',

                        background:
                          '#0f172a'
                      }}
                    />

                  </a>

                );

              }
            )
          }

        </div>

      )
      }

    </section>

  );
}


export default MainsFrameworkImages;

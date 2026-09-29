import {
  useEffect,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';

import {
  createPrelimsExplanationImageUrls
} from '../lib/prelimsImages';


type Props = {
  questionIds: string[];
};


export function PrelimsExplanationImages({
  questionIds
}: Props) {

  const [
    paths,
    setPaths
  ] =
    useState<
      string[]
    >([]);


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


  useEffect(
    () => {

      let cancelled =
        false;


      async function load() {

        const client =
          supabase;


        if (
          !client ||
          questionIds.length ===
            0
        ) {

          setPaths(
            []
          );

          setUrls(
            {}
          );

          return;
        }


        setLoading(
          true
        );


        const {
          data,
          error
        } =
          await client
            .from(
              'questions'
            )
            .select(
              `
              id,
              explanation_image_paths
              `
            )
            .in(
              'id',
              questionIds
            );


        if (
          cancelled
        ) {

          return;

        }


        if (error) {

          console.error(
            'Unable to load explanation images:',
            error
          );


          setPaths(
            []
          );

          setUrls(
            {}
          );

          setLoading(
            false
          );

          return;
        }


        const collected =
          Array.from(
            new Set(
              (
                data ||
                []
              )
                .flatMap(
                  item =>
                    Array.isArray(
                      item.explanation_image_paths
                    )
                      ? item
                          .explanation_image_paths
                          .map(
                            value =>
                              String(
                                value
                              )
                          )
                      : []
                )
                .filter(
                  Boolean
                )
            )
          );


        setPaths(
          collected
        );


        if (
          collected.length >
          0
        ) {

          const signedUrls =
            await createPrelimsExplanationImageUrls(
              collected
            );


          if (
            !cancelled
          ) {

            setUrls(
              signedUrls
            );

          }

        } else {

          setUrls(
            {}
          );

        }


        if (
          !cancelled
        ) {

          setLoading(
            false
          );

        }
      }


      void load();


      return () => {

        cancelled =
          true;

      };

    },
    [
      questionIds.join(
        '|'
      )
    ]
  );


  if (
    loading
  ) {

    return (

      <small
        style={{
          display:
            'block',

          marginTop:
            '10px',

          color:
            '#94a3b8'
        }}
      >
        Loading explanation image...
      </small>

    );

  }


  if (
    paths.length ===
    0
  ) {

    return null;

  }


  return (

    <div
      style={{
        display:
          'grid',

        gridTemplateColumns:
          'repeat(auto-fit, minmax(180px, 1fr))',

        gap:
          '10px',

        marginTop:
          '14px'
      }}
    >

      {paths.map(
        path => {

          const url =
            urls[
              path
            ];


          if (!url) {
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
                  '#0f172a'
              }}
            >

              <img
                src={
                  url
                }

                alt="Prelims explanation diagram"

                loading="lazy"

                style={{
                  display:
                    'block',

                  width:
                    '100%',

                  maxHeight:
                    '380px',

                  objectFit:
                    'contain'
                }}
              />

            </a>

          );

        }
      )}

    </div>

  );
}

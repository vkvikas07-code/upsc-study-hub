import {
  supabase
} from './supabase';

import {
  compressNoteImage
} from './noteImages';


export const MAINS_FRAMEWORK_IMAGE_BUCKET =
  'mains-framework-images';


/* =========================================================
   UPLOAD MAINS FRAMEWORK IMAGES
   ========================================================= */

export async function uploadMainsFrameworkImages({
  questionId,
  files
}: {
  questionId: string;
  files: File[];
}):
  Promise<string[]> {

  const client =
    supabase;


  if (!client) {

    throw new Error(
      'Supabase is not configured.'
    );

  }


  if (
    files.length ===
    0
  ) {

    return [];

  }


  const uploadedPaths:
    string[] = [];


  try {

    for (
      let index =
        0;
      index <
        files.length;
      index +=
        1
    ) {

      const compressed =
        await compressNoteImage(
          files[index]
        );


      const unique =
        `${Date.now()}-${index}-${Math.random()
          .toString(36)
          .slice(2, 9)}`;


      const extension =
        compressed.type ===
          'image/webp'
          ? 'webp'
          : compressed.type ===
            'image/png'
          ? 'png'
          : 'jpg';


      const path =
        `${questionId}/${unique}.${extension}`;


      const {
        error
      } =
        await client
          .storage
          .from(
            MAINS_FRAMEWORK_IMAGE_BUCKET
          )
          .upload(
            path,
            compressed,
            {
              upsert:
                false,

              cacheControl:
                '3600',

              contentType:
                compressed.type
            }
          );


      if (error) {

        throw error;

      }


      uploadedPaths.push(
        path
      );

    }


    return uploadedPaths;

  } catch (
    error
  ) {

    /*
     * If one image fails after some files have already
     * uploaded, remove those partial uploads.
     */

    if (
      uploadedPaths.length >
      0
    ) {

      try {

        await client
          .storage
          .from(
            MAINS_FRAMEWORK_IMAGE_BUCKET
          )
          .remove(
            uploadedPaths
          );

      } catch (
        cleanupError
      ) {

        console.error(
          'Unable to clean partial Mains image upload:',
          cleanupError
        );

      }

    }


    throw error;

  }
}


/* =========================================================
   DELETE MAINS FRAMEWORK IMAGES
   ========================================================= */

export async function removeMainsFrameworkImages(
  paths:
    string[]
):
  Promise<void> {

  if (
    paths.length ===
    0
  ) {

    return;

  }


  const client =
    supabase;


  if (!client) {

    throw new Error(
      'Supabase is not configured.'
    );

  }


  const uniquePaths =
    Array.from(
      new Set(
        paths
      )
    );


  const {
    error
  } =
    await client
      .storage
      .from(
        MAINS_FRAMEWORK_IMAGE_BUCKET
      )
      .remove(
        uniquePaths
      );


  if (error) {

    throw error;

  }
}


/* =========================================================
   CREATE PRIVATE SIGNED IMAGE URLS
   ========================================================= */

export async function createMainsFrameworkImageUrls(
  paths:
    string[]
):
  Promise<
    Record<
      string,
      string
    >
  > {

  const client =
    supabase;


  if (
    !client ||
    paths.length ===
      0
  ) {

    return {};

  }


  const uniquePaths =
    Array.from(
      new Set(
        paths
      )
    );


  const entries =
    await Promise.all(
      uniquePaths.map(
        async path => {

          const {
            data,
            error
          } =
            await client
              .storage
              .from(
                MAINS_FRAMEWORK_IMAGE_BUCKET
              )
              .createSignedUrl(
                path,

                /*
                 * Six hours is long enough for a normal
                 * study/admin session without repeatedly
                 * requesting new URLs.
                 */
                21600
              );


          if (
            error ||
            !data?.signedUrl
          ) {

            console.error(
              'Unable to create Mains framework image URL:',
              error
            );


            return null;

          }


          return [
            path,
            data.signedUrl
          ] as const;

        }
      )
    );


  return Object.fromEntries(
    entries.filter(
      (
        item
      ):
        item is
          readonly [
            string,
            string
          ] =>
          item !==
          null
    )
  );
}

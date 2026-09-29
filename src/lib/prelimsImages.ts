import {
  supabase
} from './supabase';

import {
  compressNoteImage
} from './noteImages';


export const PRELIMS_IMAGE_BUCKET =
  'prelims-explanation-images';


export async function uploadPrelimsExplanationImages({
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
            PRELIMS_IMAGE_BUCKET
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

    if (
      uploadedPaths.length >
      0
    ) {

      await client
        .storage
        .from(
          PRELIMS_IMAGE_BUCKET
        )
        .remove(
          uploadedPaths
        );

    }


    throw error;

  }
}


export async function removePrelimsExplanationImages(
  paths:
    string[]
) {

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


  const {
    error
  } =
    await client
      .storage
      .from(
        PRELIMS_IMAGE_BUCKET
      )
      .remove(
        paths
      );


  if (error) {

    throw error;

  }
}


export async function createPrelimsExplanationImageUrls(
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
                PRELIMS_IMAGE_BUCKET
              )
              .createSignedUrl(
                path,
                3600
              );


          if (
            error ||
            !data
              ?.signedUrl
          ) {

            console.error(
              'Unable to create Prelims image URL:',
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
        item is readonly [
          string,
          string
        ] =>
          item !== null
    )
  );
}

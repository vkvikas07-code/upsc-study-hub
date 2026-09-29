import {
  supabase
} from './supabase';


export const NOTE_IMAGE_BUCKET =
  'student-note-images';


const MAX_IMAGE_WIDTH =
  1600;


const MAX_IMAGE_HEIGHT =
  1600;


const IMAGE_QUALITY =
  0.82;


/*
 * =========================================
 * LOAD IMAGE
 * =========================================
 */

function loadImage(
  file:
    File
):
  Promise<HTMLImageElement> {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const url =
        URL.createObjectURL(
          file
        );


      const image =
        new Image();


      image.onload =
        () => {

          URL.revokeObjectURL(
            url
          );

          resolve(
            image
          );

        };


      image.onerror =
        () => {

          URL.revokeObjectURL(
            url
          );

          reject(
            new Error(
              'Unable to read image.'
            )
          );

        };


      image.src =
        url;

    }
  );
}


/*
 * =========================================
 * COMPRESS IMAGE
 * =========================================
 */

export async function compressNoteImage(
  file:
    File
):
  Promise<File> {

  if (
    !file.type.startsWith(
      'image/'
    )
  ) {

    throw new Error(
      'Selected file is not an image.'
    );

  }


  if (
    file.type ===
      'image/webp' &&
    file.size <
      700 * 1024
  ) {

    return file;

  }


  const image =
    await loadImage(
      file
    );


  let width =
    image.naturalWidth;


  let height =
    image.naturalHeight;


  if (
    width <= 0 ||
    height <= 0
  ) {

    return file;

  }


  const scale =
    Math.min(
      1,
      MAX_IMAGE_WIDTH /
        width,
      MAX_IMAGE_HEIGHT /
        height
    );


  width =
    Math.max(
      1,
      Math.round(
        width *
        scale
      )
    );


  height =
    Math.max(
      1,
      Math.round(
        height *
        scale
      )
    );


  const canvas =
    document.createElement(
      'canvas'
    );


  canvas.width =
    width;


  canvas.height =
    height;


  const context =
    canvas.getContext(
      '2d'
    );


  if (!context) {

    return file;

  }


  context.drawImage(
    image,
    0,
    0,
    width,
    height
  );


  const blob =
    await new Promise<
      Blob |
      null
    >(
      resolve => {

        canvas.toBlob(
          resolve,
          'image/webp',
          IMAGE_QUALITY
        );

      }
    );


  if (!blob) {

    return file;

  }


  const baseName =
    file.name
      .replace(
        /\.[^.]+$/,
        ''
      )
      .replace(
        /[^a-zA-Z0-9_-]/g,
        '-'
      )
      .slice(
        0,
        60
      ) ||
    'note-image';


  return new File(
    [
      blob
    ],
    `${baseName}.webp`,
    {
      type:
        'image/webp'
    }
  );
}


/*
 * =========================================
 * UPLOAD
 * =========================================
 */

export async function uploadNoteImages({
  userId,
  noteId,
  files
}: {
  userId:
    string;

  noteId:
    string;

  files:
    File[];
}):
  Promise<string[]> {

  const client =
    supabase;


  if (!client) {

    throw new Error(
      'Supabase is not configured.'
    );

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
          files[
            index
          ]
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
        `${userId}/${noteId}/${unique}.${extension}`;


      const {
        error
      } =
        await client
          .storage
          .from(
            NOTE_IMAGE_BUCKET
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
          NOTE_IMAGE_BUCKET
        )
        .remove(
          uploadedPaths
        );

    }


    throw error;

  }
}


/*
 * =========================================
 * DELETE
 * =========================================
 */

export async function removeNoteImages(
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
        NOTE_IMAGE_BUCKET
      )
      .remove(
        paths
      );


  if (error) {

    throw error;

  }
}


/*
 * =========================================
 * PRIVATE SIGNED URLS
 * =========================================
 */

export async function createNoteImageUrls(
  paths:
    string[]
):
  Promise<
    Record<
      string,
      string
    >
  > {

  if (
    paths.length ===
    0
  ) {

    return {};

  }


  const client =
    supabase;


  if (!client) {

    return {};

  }


  const uniquePaths =
    Array.from(
      new Set(
        paths
      )
    );


  const result =
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
                NOTE_IMAGE_BUCKET
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
              'Unable to create note image URL:',
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
    result.filter(
      (
        item
      ):
        item is
          readonly [
            string,
            string
          ] =>
          item !== null
    )
  );
}

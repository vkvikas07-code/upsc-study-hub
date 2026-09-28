import {
  supabase
} from './supabase';


export const NOTE_IMAGE_BUCKET =
  'student-note-images';


const MAX_WIDTH =
  1600;


const MAX_HEIGHT =
  1600;


const QUALITY =
  0.82;


export async function compressNoteImage(
  file:
    File
):
  Promise<File> {

  if (
    file.type ===
      'image/webp' &&
    file.size <
      700 * 1024
  ) {
    return file;
  }


  const bitmap =
    await createImageBitmap(
      file
    );


  let width =
    bitmap.width;


  let height =
    bitmap.height;


  const ratio =
    Math.min(
      1,
      MAX_WIDTH /
        width,
      MAX_HEIGHT /
        height
    );


  width =
    Math.max(
      1,
      Math.round(
        width *
        ratio
      )
    );


  height =
    Math.max(
      1,
      Math.round(
        height *
        ratio
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
    bitmap.close();

    return file;
  }


  context.drawImage(
    bitmap,
    0,
    0,
    width,
    height
  );


  bitmap.close();


  const blob =
    await new Promise<
      Blob |
      null
    >(
      resolve =>
        canvas.toBlob(
          resolve,
          'image/webp',
          QUALITY
        )
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


  const paths:
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
          .slice(2, 8)}`;


      const path =
        `${userId}/${noteId}/${unique}.webp`;


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
              cacheControl:
                '3600',

              upsert:
                false,

              contentType:
                compressed.type
            }
          );


      if (error) {
        throw error;
      }


      paths.push(
        path
      );

    }


    return paths;

  } catch (
    error
  ) {

    if (
      paths.length >
      0
    ) {

      await client
        .storage
        .from(
          NOTE_IMAGE_BUCKET
        )
        .remove(
          paths
        );

    }


    throw error;
  }
}


export async function removeNoteImages(
  paths:
    string[]
) {

  const client =
    supabase;


  if (
    !client ||
    paths.length ===
      0
  ) {
    return;
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

  const client =
    supabase;


  if (
    !client ||
    paths.length ===
      0
  ) {
    return {};
  }


  const entries =
    await Promise.all(
      paths.map(
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
            return [
              path,
              ''
            ] as const;
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
        [
          ,
          url
        ]
      ) =>
        Boolean(
          url
        )
    )
  );
}

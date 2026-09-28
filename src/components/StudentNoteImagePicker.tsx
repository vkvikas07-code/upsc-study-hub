import {
  useEffect,
  useRef,
  useState
} from 'react';

export type PendingNoteImage = {
  id: string;
  file: File;
  previewUrl: string;
};

type Props = {
  images: PendingNoteImage[];
  onChange:
    (
      images:
        PendingNoteImage[]
    ) => void;

  maxImages?: number;

  disabled?: boolean;
};


const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp'
];


function makeId() {
  return (
    `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`
  );
}


export function StudentNoteImagePicker({
  images,
  onChange,
  maxImages = 6,
  disabled = false
}: Props) {

  const inputRef =
    useRef<HTMLInputElement | null>(
      null
    );


  const cameraInputRef =
    useRef<HTMLInputElement | null>(
      null
    );


  const [
    dragActive,
    setDragActive
  ] =
    useState(
      false
    );


  const [
    error,
    setError
  ] =
    useState(
      ''
    );


  /*
   * =========================================
   * CLEAN PREVIEW URLS
   * =========================================
   */

  useEffect(
    () => {
      return () => {
        images.forEach(
          image => {
            URL.revokeObjectURL(
              image.previewUrl
            );
          }
        );
      };
    },
    []
  );


  /*
   * =========================================
   * ADD FILES
   * =========================================
   */

  function addFiles(
    fileList:
      FileList |
      File[]
  ) {

    if (disabled) {
      return;
    }


    setError(
      ''
    );


    const files =
      Array.from(
        fileList
      );


    const validFiles =
      files.filter(
        file =>
          ACCEPTED_TYPES.includes(
            file.type
          )
      );


    if (
      validFiles.length !==
      files.length
    ) {
      setError(
        'Only JPG, PNG and WebP images are supported.'
      );
    }


    const availableSlots =
      Math.max(
        0,
        maxImages -
        images.length
      );


    if (
      availableSlots ===
      0
    ) {
      setError(
        `Maximum ${maxImages} images are allowed per note.`
      );

      return;
    }


    const selected =
      validFiles.slice(
        0,
        availableSlots
      );


    if (
      validFiles.length >
      availableSlots
    ) {
      setError(
        `Only ${availableSlots} more image${
          availableSlots === 1
            ? ''
            : 's'
        } can be added.`
      );
    }


    const newImages:
      PendingNoteImage[] =
        selected.map(
          file => ({
            id:
              makeId(),

            file,

            previewUrl:
              URL.createObjectURL(
                file
              )
          })
        );


    onChange([
      ...images,
      ...newImages
    ]);
  }


  /*
   * =========================================
   * REMOVE IMAGE
   * =========================================
   */

  function removeImage(
    id:
      string
  ) {

    const image =
      images.find(
        item =>
          item.id ===
          id
      );


    if (image) {
      URL.revokeObjectURL(
        image.previewUrl
      );
    }


    onChange(
      images.filter(
        item =>
          item.id !==
          id
      )
    );
  }


  /*
   * =========================================
   * PASTE
   * =========================================
   */

  useEffect(
    () => {

      function handlePaste(
        event:
          ClipboardEvent
      ) {

        if (
          disabled
        ) {
          return;
        }


        const items =
          event
            .clipboardData
            ?.items;


        if (
          !items
        ) {
          return;
        }


        const imageFiles:
          File[] = [];


        Array.from(
          items
        ).forEach(
          item => {

            if (
              item.type.startsWith(
                'image/'
              )
            ) {

              const file =
                item.getAsFile();


              if (file) {
                imageFiles.push(
                  file
                );
              }

            }

          }
        );


        if (
          imageFiles.length >
          0
        ) {

          event.preventDefault();

          addFiles(
            imageFiles
          );

        }

      }


      window.addEventListener(
        'paste',
        handlePaste
      );


      return () =>
        window.removeEventListener(
          'paste',
          handlePaste
        );

    },
    [
      images,
      disabled,
      maxImages
    ]
  );


  /*
   * =========================================
   * UI
   * =========================================
   */

  return (

    <section
      style={{
        marginTop:
          '14px',

        padding:
          '14px',

        border:
          dragActive
            ? '2px dashed rgba(45,212,191,.8)'
            : '1px dashed rgba(148,163,184,.35)',

        borderRadius:
          '14px',

        background:
          dragActive
            ? 'rgba(20,184,166,.08)'
            : 'rgba(255,255,255,.02)'
      }}

      onDragEnter={
        event => {
          event.preventDefault();

          if (
            !disabled
          ) {
            setDragActive(
              true
            );
          }
        }
      }

      onDragOver={
        event => {
          event.preventDefault();

          if (
            !disabled
          ) {
            setDragActive(
              true
            );
          }
        }
      }

      onDragLeave={
        event => {
          event.preventDefault();

          setDragActive(
            false
          );
        }
      }

      onDrop={
        event => {
          event.preventDefault();

          setDragActive(
            false
          );

          if (
            disabled
          ) {
            return;
          }

          if (
            event
              .dataTransfer
              .files
              .length >
            0
          ) {

            addFiles(
              event
                .dataTransfer
                .files
            );

          }
        }
      }
    >

      <div
        style={{
          display:
            'flex',

          justifyContent:
            'space-between',

          gap:
            '12px',

          alignItems:
            'flex-start',

          flexWrap:
            'wrap'
        }}
      >

        <div>

          <strong>
            Images
          </strong>


          <p
            style={{
              margin:
                '5px 0 0',

              color:
                '#94a3b8',

              fontSize:
                '0.9rem'
            }}
          >
            Paste with Ctrl+V, drag an image here,
            choose from gallery or take a photo.
          </p>

        </div>


        <span
          className="tag"
        >
          {images.length}
          /
          {maxImages}
        </span>

      </div>


      <input
        ref={
          inputRef
        }

        type="file"

        accept="image/jpeg,image/png,image/webp"

        multiple

        hidden

        disabled={
          disabled
        }

        onChange={
          event => {

            if (
              event
                .target
                .files
            ) {

              addFiles(
                event
                  .target
                  .files
              );

            }


            event
              .target
              .value =
              '';

          }
        }
      />


      <input
        ref={
          cameraInputRef
        }

        type="file"

        accept="image/*"

        capture="environment"

        hidden

        disabled={
          disabled
        }

        onChange={
          event => {

            if (
              event
                .target
                .files
            ) {

              addFiles(
                event
                  .target
                  .files
              );

            }


            event
              .target
              .value =
              '';

          }
        }
      />


      <div
        style={{
          display:
            'flex',

          gap:
            '8px',

          flexWrap:
            'wrap',

          marginTop:
            '12px'
        }}
      >

        <button
          type="button"

          className="secondary-btn"

          disabled={
            disabled ||
            images.length >=
              maxImages
          }

          onClick={() =>
            inputRef
              .current
              ?.click()
          }
        >
          + Add Image
        </button>


        <button
          type="button"

          className="secondary-btn"

          disabled={
            disabled ||
            images.length >=
              maxImages
          }

          onClick={() =>
            cameraInputRef
              .current
              ?.click()
          }
        >
          Take Photo
        </button>

      </div>


      {error && (

        <div
          style={{
            marginTop:
              '10px',

            color:
              '#fca5a5'
          }}
        >
          {error}
        </div>

      )}


      {images.length >
        0 && (

        <div
          style={{
            display:
              'grid',

            gridTemplateColumns:
              'repeat(auto-fill,minmax(150px,1fr))',

            gap:
              '10px',

            marginTop:
              '14px'
          }}
        >

          {images.map(
            image => (

              <div
                key={
                  image.id
                }

                style={{
                  position:
                    'relative',

                  borderRadius:
                    '12px',

                  overflow:
                    'hidden',

                  border:
                    '1px solid rgba(255,255,255,.10)',

                  background:
                    '#0f172a'
                }}
              >

                <img
                  src={
                    image.previewUrl
                  }

                  alt="Selected note attachment"

                  style={{
                    display:
                      'block',

                    width:
                      '100%',

                    height:
                      '150px',

                    objectFit:
                      'contain'
                  }}
                />


                <button
                  type="button"

                  disabled={
                    disabled
                  }

                  onClick={() =>
                    removeImage(
                      image.id
                    )
                  }

                  style={{
                    position:
                      'absolute',

                    top:
                      '7px',

                    right:
                      '7px',

                    border:
                      'none',

                    borderRadius:
                      '999px',

                    padding:
                      '5px 9px',

                    cursor:
                      'pointer',

                    background:
                      'rgba(15,23,42,.90)',

                    color:
                      '#fff'
                  }}
                >
                  ×
                </button>

              </div>

            )
          )}

        </div>

      )}

    </section>

  );
}

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


type StudentNoteImagePickerProps = {
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


function createId() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}


export function StudentNoteImagePicker({
  images,
  onChange,
  maxImages = 6,
  disabled = false
}: StudentNoteImagePickerProps) {

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );


  const cameraInputRef =
    useRef<HTMLInputElement | null>(
      null
    );


  const [
    dragging,
    setDragging
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


  function addFiles(
    filesInput:
      FileList |
      File[]
  ) {

    if (
      disabled ||
      maxImages <= 0
    ) {
      return;
    }


    setError(
      ''
    );


    const files =
      Array.from(
        filesInput
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
        'Only JPG, PNG and WebP images are allowed.'
      );

    }


    const freeSlots =
      Math.max(
        0,
        maxImages -
        images.length
      );


    if (
      freeSlots === 0
    ) {

      setError(
        'Maximum number of images reached.'
      );

      return;
    }


    const acceptedFiles =
      validFiles.slice(
        0,
        freeSlots
      );


    if (
      validFiles.length >
      freeSlots
    ) {

      setError(
        `Only ${freeSlots} more image${
          freeSlots === 1
            ? ''
            : 's'
        } can be added.`
      );

    }


    const additions:
      PendingNoteImage[] =
        acceptedFiles.map(
          file => ({
            id:
              createId(),

            file,

            previewUrl:
              URL.createObjectURL(
                file
              )
          })
        );


    onChange([
      ...images,
      ...additions
    ]);
  }


  function removeImage(
    id:
      string
  ) {

    const item =
      images.find(
        image =>
          image.id ===
          id
      );


    if (item) {

      URL.revokeObjectURL(
        item.previewUrl
      );

    }


    onChange(
      images.filter(
        image =>
          image.id !==
          id
      )
    );
  }


  useEffect(
    () => {

      function handlePaste(
        event:
          ClipboardEvent
      ) {

        if (
          disabled ||
          maxImages <= 0
        ) {
          return;
        }


        const clipboardItems =
          event
            .clipboardData
            ?.items;


        if (!clipboardItems) {
          return;
        }


        const pastedImages:
          File[] = [];


        Array.from(
          clipboardItems
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

                pastedImages.push(
                  file
                );

              }

            }

          }
        );


        if (
          pastedImages.length >
          0
        ) {

          event.preventDefault();

          addFiles(
            pastedImages
          );

        }

      }


      window.addEventListener(
        'paste',
        handlePaste
      );


      return () => {

        window.removeEventListener(
          'paste',
          handlePaste
        );

      };

    },
    [
      disabled,
      images,
      maxImages
    ]
  );


  return (

    <section
      style={{
        marginTop:
          '10px',

        padding:
          '14px',

        border:
          dragging
            ? '2px dashed rgba(45,212,191,.8)'
            : '1px dashed rgba(148,163,184,.35)',

        borderRadius:
          '14px',

        background:
          dragging
            ? 'rgba(20,184,166,.08)'
            : 'rgba(255,255,255,.02)'
      }}

      onDragEnter={
        event => {

          event.preventDefault();

          if (!disabled) {
            setDragging(
              true
            );
          }

        }
      }

      onDragOver={
        event => {

          event.preventDefault();

          if (!disabled) {
            setDragging(
              true
            );
          }

        }
      }

      onDragLeave={
        event => {

          event.preventDefault();

          setDragging(
            false
          );

        }
      }

      onDrop={
        event => {

          event.preventDefault();

          setDragging(
            false
          );


          if (disabled) {
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
            '10px',

          flexWrap:
            'wrap'
        }}
      >

        <div>

          <strong>
            Add images
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
            Paste with Ctrl+V, drag & drop,
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
          fileInputRef
        }

        hidden

        type="file"

        accept="image/jpeg,image/png,image/webp"

        multiple

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


            event.target.value =
              '';

          }
        }
      />


      <input
        ref={
          cameraInputRef
        }

        hidden

        type="file"

        accept="image/*"

        capture="environment"

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


            event.target.value =
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
              maxImages ||
            maxImages <=
              0
          }

          onClick={() =>
            fileInputRef
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
              maxImages ||
            maxImages <=
              0
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

        <p
          style={{
            margin:
              '10px 0 0',

            color:
              '#fca5a5'
          }}
        >
          {error}
        </p>

      )}


      {images.length >
        0 && (

        <div
          style={{
            display:
              'grid',

            gridTemplateColumns:
              'repeat(auto-fill, minmax(140px, 1fr))',

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
                      0,

                    borderRadius:
                      '999px',

                    padding:
                      '5px 9px',

                    cursor:
                      'pointer',

                    background:
                      'rgba(15,23,42,.92)',

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

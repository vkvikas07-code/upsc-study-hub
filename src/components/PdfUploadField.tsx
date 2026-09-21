import {
  useRef,
  useState,
  type ChangeEvent
} from 'react';


type PdfUploadFieldProps = {
  file: File | null;

  onChange: (
    file: File | null
  ) => void;

  disabled?: boolean;

  maxSizeMB?: number;
};


export function PdfUploadField({

  file,

  onChange,

  disabled =
    false,

  maxSizeMB =
    10

}: PdfUploadFieldProps) {

  const inputRef =
    useRef<HTMLInputElement | null>(
      null
    );


  const [
    error,
    setError
  ] =
    useState(
      ''
    );


  function handleFileChange(
    event:
      ChangeEvent<HTMLInputElement>
  ): void {

    setError(
      ''
    );


    const selectedFile =
      event.target.files?.[0] ||
      null;


    if (
      !selectedFile
    ) {

      onChange(
        null
      );

      return;
    }


    /* =====================================================
       PDF VALIDATION
    ===================================================== */

    const fileName =
      selectedFile.name
        .toLowerCase();


    const validPdf =
      selectedFile.type ===
        'application/pdf' ||
      fileName.endsWith(
        '.pdf'
      );


    if (
      !validPdf
    ) {

      setError(
        'Please choose a PDF file only.'
      );


      onChange(
        null
      );


      if (
        inputRef.current
      ) {

        inputRef.current.value =
          '';
      }


      return;
    }


    /* =====================================================
       FILE SIZE VALIDATION
    ===================================================== */

    const maximumBytes =
      maxSizeMB *
      1024 *
      1024;


    if (
      selectedFile.size >
      maximumBytes
    ) {

      setError(
        `PDF must be ${maxSizeMB} MB or smaller.`
      );


      onChange(
        null
      );


      if (
        inputRef.current
      ) {

        inputRef.current.value =
          '';
      }


      return;
    }


    onChange(
      selectedFile
    );
  }


  function clearFile():
    void {

    setError(
      ''
    );


    onChange(
      null
    );


    if (
      inputRef.current
    ) {

      inputRef.current.value =
        '';
    }
  }


  return (

    <div>

      {/* ===================================================
          UPLOAD BOX
      =================================================== */}

      <div
        style={{

          display:
            'flex',

          alignItems:
            'center',

          gap:
            '12px',

          flexWrap:
            'wrap',

          width:
            '100%',

          minHeight:
            '56px',

          padding:
            '9px 10px',

          boxSizing:
            'border-box',

          border:
            '1px solid rgba(148, 163, 184, 0.24)',

          borderRadius:
            '12px',

          background:
            '#0c1424'

        }}
      >

        {/* =================================================
            CUSTOM BUTTON
        ================================================= */}

        <label
          style={{

            display:
              'inline-flex',

            alignItems:
              'center',

            justifyContent:
              'center',

            minHeight:
              '40px',

            padding:
              '0 16px',

            border:
              '1px solid #20c7b7',

            borderRadius:
              '9px',

            background:
              disabled
                ? '#334155'
                : '#20c7b7',

            color:
              disabled
                ? '#94a3b8'
                : '#04111f',

            fontSize:
              '14px',

            fontWeight:
              800,

            lineHeight:
              1,

            whiteSpace:
              'nowrap',

            cursor:
              disabled
                ? 'not-allowed'
                : 'pointer',

            userSelect:
              'none',

            opacity:
              disabled
                ? 0.7
                : 1

          }}
        >

          Choose PDF


          <input

            ref={
              inputRef
            }

            type="file"

            accept="application/pdf,.pdf"

            disabled={
              disabled
            }

            onChange={
              handleFileChange
            }

            style={{
              display:
                'none'
            }}

          />

        </label>


        {/* =================================================
            FILE INFORMATION
        ================================================= */}

        <div
          style={{

            flex:
              '1 1 200px',

            minWidth:
              0

          }}
        >

          {
            file
              ? (

                <>

                  <div
                    style={{

                      color:
                        '#e5eefb',

                      fontSize:
                        '14px',

                      fontWeight:
                        700,

                      overflow:
                        'hidden',

                      textOverflow:
                        'ellipsis',

                      whiteSpace:
                        'nowrap'

                    }}
                  >

                    {
                      file.name
                    }

                  </div>


                  <small
                    style={{

                      display:
                        'block',

                      marginTop:
                        '3px',

                      color:
                        '#94a3b8'

                    }}
                  >

                    {
                      (
                        file.size /
                        1024 /
                        1024
                      )
                        .toFixed(
                          2
                        )
                    }

                    {' MB • PDF ready'}

                  </small>

                </>

              )

              : (

                <small
                  style={{

                    color:
                      '#94a3b8'

                  }}
                >

                  No PDF selected • Maximum {
                    maxSizeMB
                  } MB

                </small>

              )
          }

        </div>


        {/* =================================================
            CLEAR BUTTON
        ================================================= */}

        {
          file && (

            <button

              type="button"

              disabled={
                disabled
              }

              onClick={
                clearFile
              }

              style={{

                minHeight:
                  '38px',

                padding:
                  '0 12px',

                border:
                  '1px solid rgba(148, 163, 184, 0.28)',

                borderRadius:
                  '9px',

                background:
                  'transparent',

                color:
                  '#cbd5e1',

                font:
                  'inherit',

                cursor:
                  disabled
                    ? 'not-allowed'
                    : 'pointer'

              }}

            >

              Remove

            </button>

          )
        }

      </div>


      {/* ===================================================
          VALIDATION ERROR
      =================================================== */}

      {
        error && (

          <div
            style={{

              marginTop:
                '7px',

              padding:
                '8px 10px',

              borderRadius:
                '9px',

              border:
                '1px solid rgba(248, 113, 113, 0.3)',

              background:
                'rgba(127, 29, 29, 0.18)',

              color:
                '#fecaca',

              fontSize:
                '13px'

            }}
          >

            {
              error
            }

          </div>

        )
      }

    </div>

  );
}


export default PdfUploadField;

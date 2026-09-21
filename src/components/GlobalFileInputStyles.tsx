export function GlobalFileInputStyles() {

  return (

    <style>
      {`
        input[type="file"] {
          width: 100%;
          box-sizing: border-box;
          padding: 8px 10px;

          background: #0b1324;
          color: #94a3b8;

          border: 1px solid #2a3447;
          border-radius: 12px;

          font: inherit;
          font-size: 14px;

          color-scheme: dark;
        }


        input[type="file"]::file-selector-button {
          margin-right: 12px;
          padding: 10px 16px;

          border: 1px solid #19c3b2;
          border-radius: 8px;

          background: #19c3b2;
          color: #04111f;

          font: inherit;
          font-size: 14px;
          font-weight: 800;

          cursor: pointer;

          transition:
            background 0.2s ease,
            border-color 0.2s ease,
            transform 0.1s ease;
        }


        input[type="file"]::file-selector-button:hover {
          background: #2dd4bf;
          border-color: #2dd4bf;
        }


        input[type="file"]::file-selector-button:active {
          transform: translateY(1px);
        }


        input[type="file"]::-webkit-file-upload-button {
          margin-right: 12px;
          padding: 10px 16px;

          border: 1px solid #19c3b2;
          border-radius: 8px;

          background: #19c3b2;
          color: #04111f;

          font: inherit;
          font-size: 14px;
          font-weight: 800;

          cursor: pointer;
        }


        input[type="file"]:focus {
          outline: none;

          border-color: #19c3b2;

          box-shadow:
            0 0 0 3px rgba(25, 195, 178, 0.12);
        }


        input[type="file"]:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }


        input[type="file"]:disabled::file-selector-button {
          cursor: not-allowed;
        }
      `}
    </style>

  );
}


export default GlobalFileInputStyles;

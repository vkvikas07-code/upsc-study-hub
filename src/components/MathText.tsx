import katex from 'katex';

import 'katex/dist/katex.min.css';


type MathTextProps = {
  text:
    string |
    null |
    undefined;

  className?:
    string;

  style?:
    React.CSSProperties;
};


type Segment = {
  type:
    | 'text'
    | 'inline-math'
    | 'display-math';

  value:
    string;
};


function splitMathText(
  value:
    string
):
  Segment[] {

  const segments:
    Segment[] =
    [];


  const source =
    String(
      value || ''
    );


  /*
   * Supports:
   *
   * Inline:
   * $ \frac{p}{q} $
   *
   * Display:
   * $$ \frac{a}{b} $$
   */
  const regex =
    /(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g;


  let lastIndex =
    0;


  let match:
    RegExpExecArray |
    null;


  while (
    (
      match =
        regex.exec(
          source
        )
    ) !==
    null
  ) {

    if (
      match.index >
      lastIndex
    ) {

      segments.push({
        type:
          'text',

        value:
          source.slice(
            lastIndex,
            match.index
          )
      });
    }


    const matchedText =
      match[0];


    if (
      matchedText.startsWith(
        '$$'
      )
    ) {

      segments.push({
        type:
          'display-math',

        value:
          matchedText.slice(
            2,
            -2
          )
      });

    } else {

      segments.push({
        type:
          'inline-math',

        value:
          matchedText.slice(
            1,
            -1
          )
      });
    }


    lastIndex =
      regex.lastIndex;
  }


  if (
    lastIndex <
    source.length
  ) {

    segments.push({
      type:
        'text',

      value:
        source.slice(
          lastIndex
        )
    });
  }


  if (
    segments.length ===
    0
  ) {

    segments.push({
      type:
        'text',

      value:
        source
    });
  }


  return segments;
}


function renderMath(
  value:
    string,
  displayMode:
    boolean
):
  string {

  try {

    return katex.renderToString(
      value,
      {
        displayMode,

        throwOnError:
          false,

        strict:
          false,

        trust:
          false,

        output:
          'html'
      }
    );

  } catch {

    return value;
  }
}


export function MathText({
  text,
  className,
  style
}: MathTextProps) {

  const segments =
    splitMathText(
      String(
        text || ''
      )
    );


  return (

    <span
      className={
        className
      }
      style={{
        whiteSpace:
          'pre-wrap',

        overflowWrap:
          'anywhere',

        ...style
      }}
    >

      {
        segments.map(
          (
            segment,
            index
          ) => {

            if (
              segment.type ===
              'text'
            ) {

              return (
                <span
                  key={
                    `text-${index}`
                  }
                >
                  {
                    segment.value
                  }
                </span>
              );
            }


            const displayMode =
              segment.type ===
              'display-math';


            const html =
              renderMath(
                segment.value,
                displayMode
              );


            return (

              <span
                key={
                  `math-${index}`
                }

                style={
                  displayMode
                    ? {
                        display:
                          'block',

                        margin:
                          '8px 0',

                        overflowX:
                          'auto',

                        overflowY:
                          'hidden'
                      }
                    : {
                        display:
                          'inline-block',

                        verticalAlign:
                          'middle',

                        maxWidth:
                          '100%'
                      }
                }

                dangerouslySetInnerHTML={{
                  __html:
                    html
                }}
              />

            );
          }
        )
      }

    </span>
  );
}


export default MathText;

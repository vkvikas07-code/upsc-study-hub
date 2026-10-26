import React from 'react';

type ReadableTextProps = {
  text?: string | null;
  className?: string;
};

function normalizeText(input?: string | null): string {
  if (!input) return '';

  return input
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, '    ')
    .trim();
}

export function ReadableText({
  text,
  className = ''
}: ReadableTextProps) {
  const normalized = normalizeText(text);

  if (!normalized) {
    return null;
  }

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  return (
    <div className={`readable-text ${className}`.trim()}>
      {paragraphs.map((paragraph, index) => {
        const lines = paragraph
          .split('\n')
          .map((line) => line.trimEnd());

        return (
          <p key={index}>
            {lines.map((line, lineIndex) => (
              <React.Fragment key={lineIndex}>
                {line}
                {lineIndex < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

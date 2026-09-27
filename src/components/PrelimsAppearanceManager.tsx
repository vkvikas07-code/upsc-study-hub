import { useState } from 'react';

export function PrelimsAppearanceManager() {
  const [
    message,
    setMessage
  ] = useState(
    'Prelims appearance manager is ready.'
  );

  return (
    <section
      className="panel"
      style={{
        padding: '16px'
      }}
    >
      <span className="eyebrow">
        PRELIMS PYQ APPEARANCES
      </span>

      <h2
        style={{
          margin: '6px 0'
        }}
      >
        Repeated Question Manager
      </h2>

      <p
        style={{
          color: '#94a3b8'
        }}
      >
        One master Prelims question can be linked to multiple years, papers and examinations.
      </p>

      <div
        className="callout"
        style={{
          marginTop: '12px'
        }}
      >
        {message}
      </div>

      <button
        type="button"
        className="secondary-btn"
        style={{
          marginTop: '12px'
        }}
        onClick={() =>
          setMessage(
            'Prelims appearance manager is ready.'
          )
        }
      >
        Refresh
      </button>
    </section>
  );
}

export default PrelimsAppearanceManager;

            adminTab ===
              'mcq'
              ? 'block'
              : 'none'
        }}
      >
        <PrelimsAdminWorkspace />
      </div>

      <div
        style={{
          display:
            adminTab ===
              'tests'
              ? 'block'
              : 'none'
        }}
      >
        <PrelimsTestManager />
      </div>

      <div
        style={{
          display:
            adminTab ===
              'mains'
              ? 'block'
              : 'none'
        }}
      >
        <section
          className="panel"
          style={{
            padding:
              '12px 14px',
            marginBottom:
              '12px'
          }}
        >
          <div
            style={{
              display:
                'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(180px, 1fr))',
              gap:
                '8px'
            }}
          >
            <button
              type="button"
              className={
                mainsWorkspace ===
                  'pyq'
                  ? 'filter active'
                  : 'filter'
              }
              onClick={() =>
                setMainsWorkspace(
                  'pyq'
                )
              }
            >
              Previous Year Questions
            </button>

            <button
              type="button"
              className={
                mainsWorkspace ===
                  'practice'
                  ? 'filter active'
                  : 'filter'
              }
              onClick={() =>
                setMainsWorkspace(
                  'practice'
                )
              }
            >
              Add / Manage Practice Questions
            </button>
          </div>

          <small
            style={{
              display:
                'block',
              marginTop:
                '8px',
              color:
                '#94a3b8'
            }}
          >
            {
              mainsWorkspace ===
                'pyq'
                ? 'Add, check and manage Mains previous-year questions and repeated appearances.'
                : 'Create and manage Mains practice questions.'
            }
          </small>
        </section>

        {mainsWorkspace ===
          'pyq' && (
          <MainsPyqManager />
        )}

        {mainsWorkspace ===
          'practice' && (
          <MainsQuestionManager />
        )}
      </div>

      <div
        style={{
          display:
            adminTab ===
              'evaluation'
              ? 'block'
              : 'none'
        }}
      >
        <MainsEvaluationManager />
      </div>
    </div>
  );
}

          <div
            style={{
              display:
                'flex',

              gap:
                '12px',

              flexWrap:
                'wrap',

              marginTop:
                '20px'
            }}
          >

            <button
              type="button"
              className="primary-btn"
              onClick={
                startSession
              }
              disabled={
                filteredQuestions.length ===
                  0
              }
            >
              {
                sessionMode ===
                  'exam'
                  ? 'Start Exam'
                  : 'Start Practice'
              }
            </button>


            <button
              type="button"
              className="secondary-btn"
              onClick={
                () => {

                  setSearchText(
                    ''
                  );

                  setSubjectFilter(
                    'all'
                  );

                  setTopicFilter(
                    'all'
                  );

                  setDifficultyFilter(
                    'all'
                  );

                  setTypeFilter(
                    'all'
                  );

                  setSessionSize(
                    '10'
                  );
                }
              }
            >
              Reset Filters
            </button>

          </div>

        </section>


        <section
          className="panel"
          style={{
            marginTop:
              '16px'
          }}
        >

          <h2>
            Previous Year Question Papers
          </h2>


          <p
            style={{
              color:
                '#94a3b8'
            }}
          >
            Browse original UPSC and State PSC papers. When PYQ data is added again, complete papers will appear here automatically.
          </p>


          <PrelimsPyqArchive
            onStartPaperTest={
              startPaperTest
            }
          />

        </section>

      </div>

    </>

  );
}


export default PracticePage;

type ProgressFilter =
  | 'all'
  | 'not-started'
  | 'reading'
  | 'completed';


type BookTopicToolbarProps = {

  search:
    string;

  filter:
    ProgressFilter;

  totalTopics:
    number;

  onSearchChange:
    (
      value:
        string
    ) => void;

  onFilterChange:
    (
      value:
        ProgressFilter
    ) => void;

  onExpandAll:
    () => void;

  onCollapseAll:
    () => void;
};


export function BookTopicToolbar({

  search,
  filter,
  totalTopics,
  onSearchChange,
  onFilterChange,
  onExpandAll,
  onCollapseAll

}: BookTopicToolbarProps) {

  return (

    <div
      style={{
        display:
          'grid',

        gap:
          '12px',

        marginTop:
          '14px'
      }}
    >

      {/* =====================================
          SEARCH
      ===================================== */}

      <label
        style={{
          display:
            'grid',

          gap:
            '6px'
        }}
      >

        Search book contents

        <input

          type="search"

          value={
            search
          }

          onChange={
            event =>
              onSearchChange(
                event.target.value
              )
          }

          placeholder="Search chapter, topic or subtopic…"

        />

      </label>


      {/* =====================================
          FILTER
      ===================================== */}

      <div
        style={{
          display:
            'grid',

          gridTemplateColumns:
            'repeat(4, minmax(0, 1fr))',

          gap:
            '6px'
        }}
      >

        <button
          type="button"

          className={
            filter ===
              'all'
              ? 'filter active'
              : 'filter'
          }

          onClick={() =>
            onFilterChange(
              'all'
            )
          }
        >
          All
        </button>


        <button
          type="button"

          className={
            filter ===
              'not-started'
              ? 'filter active'
              : 'filter'
          }

          onClick={() =>
            onFilterChange(
              'not-started'
            )
          }
        >
          Not Started
        </button>


        <button
          type="button"

          className={
            filter ===
              'reading'
              ? 'filter active'
              : 'filter'
          }

          onClick={() =>
            onFilterChange(
              'reading'
            )
          }
        >
          Reading
        </button>


        <button
          type="button"

          className={
            filter ===
              'completed'
              ? 'filter active'
              : 'filter'
          }

          onClick={() =>
            onFilterChange(
              'completed'
            )
          }
        >
          Completed
        </button>

      </div>


      {/* =====================================
          TREE CONTROLS
      ===================================== */}

      <div
        style={{
          display:
            'flex',

          justifyContent:
            'space-between',

          alignItems:
            'center',

          flexWrap:
            'wrap',

          gap:
            '8px'
        }}
      >

        <small
          style={{
            color:
              '#94a3b8'
          }}
        >
          {
            totalTopics
          } topic
          {
            totalTopics ===
              1
              ? ''
              : 's'
          } in this book
        </small>


        <div
          style={{
            display:
              'flex',

            flexWrap:
              'wrap',

            gap:
              '8px'
          }}
        >

          <button
            type="button"
            className="secondary-btn"

            onClick={
              onExpandAll
            }
          >
            Expand All
          </button>


          <button
            type="button"
            className="secondary-btn"

            onClick={
              onCollapseAll
            }
          >
            Collapse All
          </button>

        </div>

      </div>

    </div>

  );
}


export type {
  ProgressFilter
};

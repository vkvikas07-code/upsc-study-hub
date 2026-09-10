import {
  useEffect,
  useMemo,
  useState
} from 'react';

import type {
  FormEvent
} from 'react';

import {
  supabase
} from '../lib/supabase';


type ResourceType =
  | 'standard_book'
  | 'official_source'
  | 'monthly_current_affairs'
  | 'notes'
  | 'report'
  | 'pyq_resource'
  | 'syllabus_resource';


type ExamStage =
  | 'prelims'
  | 'mains'
  | 'both';


type ResourceStatus =
  | 'draft'
  | 'published'
  | 'archived';


type Language =
  | 'English'
  | 'Hindi'
  | 'Bilingual'
  | 'Other';


type ResourceRow = {
  id: string;
  title: string;
  description: string | null;

  resource_type:
    ResourceType;

  exam_stage:
    ExamStage;

  paper: string | null;
  subject: string;

  author: string | null;
  publisher: string | null;
  source_name: string | null;

  external_url: string | null;
  file_path: string | null;

  language:
    Language;

  edition_year:
    number |
    null;

  month_year:
    string |
    null;

  is_free:
    boolean;

  status:
    ResourceStatus;

  sort_order:
    number;

  created_at:
    string;

  updated_at:
    string;
};


type StatusFilter =
  | 'all'
  | ResourceStatus;


type TypeFilter =
  | 'all'
  | ResourceType;


const RESOURCE_SELECT = `
  id,
  title,
  description,
  resource_type,
  exam_stage,
  paper,
  subject,
  author,
  publisher,
  source_name,
  external_url,
  file_path,
  language,
  edition_year,
  month_year,
  is_free,
  status,
  sort_order,
  created_at,
  updated_at
`;


/*
 * RESOURCE TYPE LABEL
 */

function resourceTypeLabel(
  type:
    ResourceType
) {

  switch (
    type
  ) {

    case 'standard_book':
      return 'Standard Book';

    case 'official_source':
      return 'Official Source';

    case 'monthly_current_affairs':
      return 'Monthly Current Affairs';

    case 'notes':
      return 'Notes';

    case 'report':
      return 'Report';

    case 'pyq_resource':
      return 'PYQ Resource';

    case 'syllabus_resource':
      return 'Syllabus Resource';
  }
}


/*
 * EXAM STAGE LABEL
 */

function stageLabel(
  stage:
    ExamStage
) {

  switch (
    stage
  ) {

    case 'prelims':
      return 'Prelims';

    case 'mains':
      return 'Mains';

    case 'both':
      return 'Prelims + Mains';
  }
}


/*
 * FORMAT DATE
 */

function formatDate(
  value:
    string |
    null
) {

  if (!value) {

    return '—';
  }


  const date =
    new Date(
      value
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return '—';
  }


  return date
    .toLocaleDateString(
      'en-IN',
      {
        day:
          '2-digit',

        month:
          'short',

        year:
          'numeric'
      }
    );
}


/*
 * ADMIN RESOURCE MANAGER
 */

export function StudyResourceManager() {

  /*
   * RESOURCE DATA
   */

  const [
    resources,
    setResources
  ] =
    useState<
      ResourceRow[]
    >([]);


  const [
    loading,
    setLoading
  ] =
    useState(
      true
    );


  const [
    saving,
    setSaving
  ] =
    useState(
      false
    );


  const [
    message,
    setMessage
  ] =
    useState('');


  /*
   * EDIT STATE
   */

  const [
    editingId,
    setEditingId
  ] =
    useState<
      string |
      null
    >(
      null
    );


  /*
   * FORM
   */

  const [
    title,
    setTitle
  ] =
    useState('');


  const [
    description,
    setDescription
  ] =
    useState('');


  const [
    resourceType,
    setResourceType
  ] =
    useState<ResourceType>(
      'standard_book'
    );


  const [
    examStage,
    setExamStage
  ] =
    useState<ExamStage>(
      'both'
    );


  const [
    paper,
    setPaper
  ] =
    useState('');


  const [
    subject,
    setSubject
  ] =
    useState(
      'General'
    );


  const [
    author,
    setAuthor
  ] =
    useState('');


  const [
    publisher,
    setPublisher
  ] =
    useState('');


  const [
    sourceName,
    setSourceName
  ] =
    useState('');


  const [
    externalUrl,
    setExternalUrl
  ] =
    useState('');


  const [
    filePath,
    setFilePath
  ] =
    useState('');


  const [
    language,
    setLanguage
  ] =
    useState<Language>(
      'English'
    );


  const [
    editionYear,
    setEditionYear
  ] =
    useState('');


  const [
    monthYear,
    setMonthYear
  ] =
    useState('');


  const [
    isFree,
    setIsFree
  ] =
    useState(
      true
    );


  const [
    status,
    setStatus
  ] =
    useState<ResourceStatus>(
      'draft'
    );


  const [
    sortOrder,
    setSortOrder
  ] =
    useState(
      '0'
    );


  /*
   * LIST FILTERS
   */

  const [
    search,
    setSearch
  ] =
    useState('');


  const [
    statusFilter,
    setStatusFilter
  ] =
    useState<StatusFilter>(
      'all'
    );


  const [
    typeFilter,
    setTypeFilter
  ] =
    useState<TypeFilter>(
      'all'
    );


  /*
   * LOAD ALL RESOURCES
   *
   * Editors/admins can see
   * drafts, published and archived.
   */

  async function loadResources() {

    if (!supabase) {

      setMessage(
        'Supabase is not configured.'
      );


      setLoading(
        false
      );


      return;
    }


    setLoading(
      true
    );


    const {
      data,
      error
    } =
      await supabase
        .from(
          'study_resources'
        )
        .select(
          RESOURCE_SELECT
        )
        .order(
          'sort_order',
          {
            ascending:
              true
          }
        )
        .order(
          'created_at',
          {
            ascending:
              false
          }
        );


    if (
      error
    ) {

      console.error(
        'Unable to load study resources:',
        error
      );


      setMessage(
        error.message
      );


      setResources(
        []
      );


      setLoading(
        false
      );


      return;
    }


    setResources(
      (
        data ||
        []
      ) as
        ResourceRow[]
    );


    setLoading(
      false
    );
  }


  /*
   * INITIAL LOAD
   */

  useEffect(
    () => {

      void loadResources();

    },
    []
  );


  /*
   * RESET FORM
   */

  function resetForm() {

    setEditingId(
      null
    );


    setTitle('');


    setDescription('');


    setResourceType(
      'standard_book'
    );


    setExamStage(
      'both'
    );


    setPaper('');


    setSubject(
      'General'
    );


    setAuthor('');


    setPublisher('');


    setSourceName('');


    setExternalUrl('');


    setFilePath('');


    setLanguage(
      'English'
    );


    setEditionYear('');


    setMonthYear('');


    setIsFree(
      true
    );


    setStatus(
      'draft'
    );


    setSortOrder(
      '0'
    );
  }


  /*
   * START EDITING
   */

  function editResource(
    resource:
      ResourceRow
  ) {

    setEditingId(
      resource.id
    );


    setTitle(
      resource.title
    );


    setDescription(
      resource.description ||
      ''
    );


    setResourceType(
      resource.resource_type
    );


    setExamStage(
      resource.exam_stage
    );


    setPaper(
      resource.paper ||
      ''
    );


    setSubject(
      resource.subject
    );


    setAuthor(
      resource.author ||
      ''
    );


    setPublisher(
      resource.publisher ||
      ''
    );


    setSourceName(
      resource.source_name ||
      ''
    );


    setExternalUrl(
      resource.external_url ||
      ''
    );


    setFilePath(
      resource.file_path ||
      ''
    );


    setLanguage(
      resource.language
    );


    setEditionYear(
      resource.edition_year !==
        null
        ? String(
            resource.edition_year
          )
        : ''
    );


    setMonthYear(
      resource.month_year
        ? resource.month_year
            .slice(
              0,
              7
            )
        : ''
    );


    setIsFree(
      resource.is_free
    );


    setStatus(
      resource.status
    );


    setSortOrder(
      String(
        resource.sort_order
      )
    );


    setMessage(
      `Editing: ${resource.title}`
    );


    window.scrollTo({
      top:
        0,

      behavior:
        'smooth'
    });
  }


  /*
   * SAVE RESOURCE
   */

  async function saveResource(
    event:
      FormEvent
  ) {

    event.preventDefault();


    if (!supabase) {

      setMessage(
        'Supabase is not configured.'
      );

      return;
    }


    /*
     * REQUIRED FIELDS
     */

    if (
      !title.trim()
    ) {

      setMessage(
        'Resource title is required.'
      );

      return;
    }


    if (
      !subject.trim()
    ) {

      setMessage(
        'Subject is required.'
      );

      return;
    }


    /*
     * VALIDATE EDITION YEAR
     */

    let parsedEditionYear:
      number |
      null =
        null;


    if (
      editionYear.trim()
    ) {

      parsedEditionYear =
        Number(
          editionYear
        );


      if (
        !Number.isInteger(
          parsedEditionYear
        ) ||
        parsedEditionYear <
          1900 ||
        parsedEditionYear >
          2100
      ) {

        setMessage(
          'Edition year must be between 1900 and 2100.'
        );

        return;
      }
    }


    /*
     * VALIDATE SORT ORDER
     */

    const parsedSortOrder =
      Number(
        sortOrder
      );


    if (
      !Number.isInteger(
        parsedSortOrder
      )
    ) {

      setMessage(
        'Sort order must be a whole number.'
      );

      return;
    }


    /*
     * CURRENT USER
     */

    const {
      data: {
        user
      }
    } =
      await supabase
        .auth
        .getUser();


    if (!user) {

      setMessage(
        'Your session expired. Please sign in again.'
      );

      return;
    }


    setSaving(
      true
    );


    setMessage(
      editingId
        ? 'Updating resource...'
        : 'Creating resource...'
    );


    /*
     * DATABASE PAYLOAD
     */

    const payload = {

      title:
        title.trim(),

      description:
        description.trim() ||
        null,

      resource_type:
        resourceType,

      exam_stage:
        examStage,

      paper:
        paper.trim() ||
        null,

      subject:
        subject.trim(),

      author:
        author.trim() ||
        null,

      publisher:
        publisher.trim() ||
        null,

      source_name:
        sourceName.trim() ||
        null,

      external_url:
        externalUrl.trim() ||
        null,

      file_path:
        filePath.trim() ||
        null,

      language,

      edition_year:
        parsedEditionYear,

      month_year:
        monthYear
          ? `${monthYear}-01`
          : null,

      is_free:
        isFree,

      status,

      sort_order:
        parsedSortOrder
    };


    /*
     * UPDATE EXISTING
     */

    if (
      editingId
    ) {

      const {
        error
      } =
        await supabase
          .from(
            'study_resources'
          )
          .update(
            payload
          )
          .eq(
            'id',
            editingId
          );


      if (
        error
      ) {

        console.error(
          'Unable to update study resource:',
          error
        );


        setMessage(
          error.message
        );


        setSaving(
          false
        );


        return;
      }


      setMessage(
        'Resource updated successfully.'
      );

    } else {

      /*
       * CREATE NEW
       */

      const {
        error
      } =
        await supabase
          .from(
            'study_resources'
          )
          .insert({
            ...payload,

            created_by:
              user.id
          });


      if (
        error
      ) {

        console.error(
          'Unable to create study resource:',
          error
        );


        setMessage(
          error.message
        );


        setSaving(
          false
        );


        return;
      }


      setMessage(
        status ===
          'published'
          ? 'Resource created and published.'
          : 'Resource created successfully.'
      );
    }


    setSaving(
      false
    );


    resetForm();


    await loadResources();
  }


  /*
   * CHANGE STATUS
   */

  async function changeStatus(
    resource:
      ResourceRow,
    nextStatus:
      ResourceStatus
  ) {

    if (!supabase) {

      return;
    }


    setMessage(
      `Updating ${resource.title}...`
    );


    const {
      error
    } =
      await supabase
        .from(
          'study_resources'
        )
        .update({
          status:
            nextStatus
        })
        .eq(
          'id',
          resource.id
        );


    if (
      error
    ) {

      console.error(
        'Unable to change resource status:',
        error
      );


      setMessage(
        error.message
      );


      return;
    }


    setMessage(
      nextStatus ===
        'published'
        ? 'Resource published successfully.'
        : nextStatus ===
          'archived'
        ? 'Resource archived successfully.'
        : 'Resource moved to draft.'
    );


    await loadResources();
  }


  /*
   * DELETE RESOURCE
   */

  async function deleteResource(
    resource:
      ResourceRow
  ) {

    if (!supabase) {

      return;
    }


    const confirmed =
      window.confirm(
        `Delete "${resource.title}" permanently?`
      );


    if (!confirmed) {

      return;
    }


    const {
      error
    } =
      await supabase
        .from(
          'study_resources'
        )
        .delete()
        .eq(
          'id',
          resource.id
        );


    if (
      error
    ) {

      console.error(
        'Unable to delete study resource:',
        error
      );


      setMessage(
        error.message
      );


      return;
    }


    /*
     * IF DELETING CURRENTLY
     * EDITED RESOURCE,
     * CLEAR THE FORM.
     */

    if (
      editingId ===
      resource.id
    ) {

      resetForm();
    }


    setMessage(
      'Resource deleted successfully.'
    );


    await loadResources();
  }


  /*
   * FILTER RESOURCE LIST
   */

  const visibleResources =
    useMemo(
      () => {

        const query =
          search
            .trim()
            .toLowerCase();


        return resources.filter(
          resource => {

            if (
              statusFilter !==
                'all' &&
              resource.status !==
                statusFilter
            ) {

              return false;
            }


            if (
              typeFilter !==
                'all' &&
              resource.resource_type !==
                typeFilter
            ) {

              return false;
            }


            if (!query) {

              return true;
            }


            const searchable =
              [
                resource.title,
                resource.description ||
                  '',
                resource.subject,
                resource.paper ||
                  '',
                resource.author ||
                  '',
                resource.publisher ||
                  '',
                resource.source_name ||
                  '',
                resource.language
              ]
                .join(
                  ' '
                )
                .toLowerCase();


            return searchable
              .includes(
                query
              );
          }
        );

      },
      [
        resources,
        search,
        statusFilter,
        typeFilter
      ]
    );


  /*
   * ADMIN METRICS
   */

  const publishedCount =
    useMemo(
      () =>
        resources.filter(
          resource =>
            resource.status ===
            'published'
        ).length,
      [
        resources
      ]
    );


  const draftCount =
    useMemo(
      () =>
        resources.filter(
          resource =>
            resource.status ===
            'draft'
        ).length,
      [
        resources
      ]
    );


  const archivedCount =
    useMemo(
      () =>
        resources.filter(
          resource =>
            resource.status ===
            'archived'
        ).length,
      [
        resources
      ]
    );


  return (

    <div>

      {/* ==================================================
          HEADER
      ================================================== */}

      <section
        className="panel"
      >

        <span
          className="eyebrow"
        >
          ADMIN • STUDY RESOURCES
        </span>


        <h2>
          Resource Manager
        </h2>


        <p>
          Create and manage standard books,
          official sources, monthly current
          affairs, notes, reports, PYQ material
          and syllabus resources.
        </p>


        <div
          className="metrics-grid"
          style={{
            marginTop:
              '16px'
          }}
        >

          <article
            className="metric-card"
          >
            <div>

              <span>
                Total
              </span>


              <strong>
                {resources.length}
              </strong>

            </div>
          </article>


          <article
            className="metric-card"
          >
            <div>

              <span>
                Published
              </span>


              <strong>
                {publishedCount}
              </strong>

            </div>
          </article>


          <article
            className="metric-card"
          >
            <div>

              <span>
                Drafts
              </span>


              <strong>
                {draftCount}
              </strong>

            </div>
          </article>


          <article
            className="metric-card"
          >
            <div>

              <span>
                Archived
              </span>


              <strong>
                {archivedCount}
              </strong>

            </div>
          </article>

        </div>


        {message && (

          <div
            className="callout"
            style={{
              marginTop:
                '16px'
            }}
          >
            {message}
          </div>

        )}

      </section>


      {/* ==================================================
          CREATE / EDIT FORM
      ================================================== */}

      <section
        className="panel"
        style={{
          marginTop:
            '18px'
        }}
      >

        <div
          className="panel-head"
        >

          <div>

            <span
              className="eyebrow"
            >
              {
                editingId
                  ? 'EDIT RESOURCE'
                  : 'NEW RESOURCE'
              }
            </span>


            <h3>
              {
                editingId
                  ? 'Update Study Resource'
                  : 'Add Study Resource'
              }
            </h3>

          </div>


          {editingId && (

            <button
              type="button"
              className="text-btn"

              onClick={() => {

                resetForm();

                setMessage(
                  'Editing cancelled.'
                );
              }}
            >
              Cancel Edit
            </button>

          )}

        </div>


        <form
          onSubmit={
            saveResource
          }
        >

          <div
            style={{
              display:
                'grid',

              gridTemplateColumns:
                'repeat(auto-fit, minmax(220px, 1fr))',

              gap:
                '14px',

              marginTop:
                '14px'
            }}
          >

            {/* TITLE */}

            <label>

              Title *

              <input
                type="text"

                value={
                  title
                }

                onChange={
                  event =>
                    setTitle(
                      event
                        .target
                        .value
                    )
                }

                placeholder="Example: Indian Polity"
                required
              />

            </label>


            {/* RESOURCE TYPE */}

            <label>

              Resource Type *

              <select
                value={
                  resourceType
                }

                onChange={
                  event =>
                    setResourceType(
                      event
                        .target
                        .value as
                          ResourceType
                    )
                }
              >

                <option value="standard_book">
                  Standard Book
                </option>


                <option value="official_source">
                  Official Source
                </option>


                <option value="monthly_current_affairs">
                  Monthly Current Affairs
                </option>


                <option value="notes">
                  Notes
                </option>


                <option value="report">
                  Report
                </option>


                <option value="pyq_resource">
                  PYQ Resource
                </option>


                <option value="syllabus_resource">
                  Syllabus Resource
                </option>

              </select>

            </label>


            {/* EXAM STAGE */}

            <label>

              Exam Stage *

              <select
                value={
                  examStage
                }

                onChange={
                  event =>
                    setExamStage(
                      event
                        .target
                        .value as
                          ExamStage
                    )
                }
              >

                <option value="both">
                  Prelims + Mains
                </option>


                <option value="prelims">
                  Prelims
                </option>


                <option value="mains">
                  Mains
                </option>

              </select>

            </label>


            {/* SUBJECT */}

            <label>

              Subject *

              <input
                type="text"

                value={
                  subject
                }

                onChange={
                  event =>
                    setSubject(
                      event
                        .target
                        .value
                    )
                }

                placeholder="Polity & Governance"
                required
              />

            </label>


            {/* PAPER */}

            <label>

              Paper

              <input
                type="text"

                value={
                  paper
                }

                onChange={
                  event =>
                    setPaper(
                      event
                        .target
                        .value
                    )
                }

                placeholder="GS Paper I / GS II / Essay"
              />

            </label>


            {/* LANGUAGE */}

            <label>

              Language

              <select
                value={
                  language
                }

                onChange={
                  event =>
                    setLanguage(
                      event
                        .target
                        .value as
                          Language
                    )
                }
              >

                <option value="English">
                  English
                </option>


                <option value="Hindi">
                  Hindi
                </option>


                <option value="Bilingual">
                  Bilingual
                </option>


                <option value="Other">
                  Other
                </option>

              </select>

            </label>


            {/* AUTHOR */}

            <label>

              Author

              <input
                type="text"

                value={
                  author
                }

                onChange={
                  event =>
                    setAuthor(
                      event
                        .target
                        .value
                    )
                }

                placeholder="Author name"
              />

            </label>


            {/* PUBLISHER */}

            <label>

              Publisher

              <input
                type="text"

                value={
                  publisher
                }

                onChange={
                  event =>
                    setPublisher(
                      event
                        .target
                        .value
                    )
                }

                placeholder="Publisher"
              />

            </label>


            {/* SOURCE */}

            <label>

              Source Name

              <input
                type="text"

                value={
                  sourceName
                }

                onChange={
                  event =>
                    setSourceName(
                      event
                        .target
                        .value
                    )
                }

                placeholder="UPSC / PIB / NCERT"
              />

            </label>


            {/* EDITION */}

            <label>

              Edition Year

              <input
                type="number"

                min="1900"
                max="2100"

                value={
                  editionYear
                }

                onChange={
                  event =>
                    setEditionYear(
                      event
                        .target
                        .value
                    )
                }

                placeholder="2026"
              />

            </label>


            {/* MONTH YEAR */}

            <label>

              Month / Year

              <input
                type="month"

                value={
                  monthYear
                }

                onChange={
                  event =>
                    setMonthYear(
                      event
                        .target
                        .value
                    )
                }
              />

            </label>


            {/* SORT ORDER */}

            <label>

              Sort Order

              <input
                type="number"

                value={
                  sortOrder
                }

                onChange={
                  event =>
                    setSortOrder(
                      event
                        .target
                        .value
                    )
                }
              />

            </label>


            {/* STATUS */}

            <label>

              Status

              <select
                value={
                  status
                }

                onChange={
                  event =>
                    setStatus(
                      event
                        .target
                        .value as
                          ResourceStatus
                    )
                }
              >

                <option value="draft">
                  Draft
                </option>


                <option value="published">
                  Published
                </option>


                <option value="archived">
                  Archived
                </option>

              </select>

            </label>

          </div>


          {/* DESCRIPTION */}

          <label
            style={{
              display:
                'block',

              marginTop:
                '14px'
            }}
          >

            Description

            <textarea
              value={
                description
              }

              onChange={
                event =>
                  setDescription(
                    event
                      .target
                      .value
                  )
              }

              placeholder="Explain why this resource is useful for UPSC preparation."

              rows={
                4
              }
            />

          </label>


          {/* EXTERNAL URL */}

          <label
            style={{
              display:
                'block',

              marginTop:
                '14px'
            }}
          >

            External URL

            <input
              type="url"

              value={
                externalUrl
              }

              onChange={
                event =>
                  setExternalUrl(
                    event
                      .target
                      .value
                  )
              }

              placeholder="https://..."
            />

          </label>


          {/* FILE PATH */}

          <label
            style={{
              display:
                'block',

              marginTop:
                '14px'
            }}
          >

            File Path

            <input
              type="text"

              value={
                filePath
              }

              onChange={
                event =>
                  setFilePath(
                    event
                      .target
                      .value
                  )
              }

              placeholder="Optional storage path for future file support"
            />

          </label>


          {/* FREE RESOURCE */}

          <label
            style={{
              display:
                'flex',

              alignItems:
                'center',

              gap:
                '10px',

              marginTop:
                '16px'
            }}
          >

            <input
              type="checkbox"

              checked={
                isFree
              }

              onChange={
                event =>
                  setIsFree(
                    event
                      .target
                      .checked
                  )
              }
            />


            Free resource

          </label>


          {/* SAVE BUTTON */}

          <div
            style={{
              display:
                'flex',

              gap:
                '10px',

              flexWrap:
                'wrap',

              marginTop:
                '18px'
            }}
          >

            <button
              type="submit"
              className="primary-btn"

              disabled={
                saving
              }
            >

              {
                saving
                  ? 'Saving...'
                  : editingId
                  ? 'Update Resource'
                  : 'Create Resource'
              }

            </button>


            <button
              type="button"
              className="secondary-btn"

              onClick={
                resetForm
              }

              disabled={
                saving
              }
            >
              Clear Form
            </button>

          </div>

        </form>

      </section>


      {/* ==================================================
          RESOURCE LIST FILTERS
      ================================================== */}

      <section
        className="panel"
        style={{
          marginTop:
            '18px'
        }}
      >

        <div
          className="panel-head"
        >

          <div>

            <span
              className="eyebrow"
            >
              RESOURCE LIBRARY
            </span>


            <h3>
              Manage Existing Resources
            </h3>

          </div>


          <button
            type="button"
            className="secondary-btn"

            onClick={() =>
              void loadResources()
            }
          >
            Refresh
          </button>

        </div>


        <div
          style={{
            display:
              'grid',

            gridTemplateColumns:
              'repeat(auto-fit, minmax(180px, 1fr))',

            gap:
              '10px',

            marginTop:
              '14px'
          }}
        >

          {/* SEARCH */}

          <label>

            Search

            <input
              type="search"

              value={
                search
              }

              onChange={
                event =>
                  setSearch(
                    event
                      .target
                      .value
                  )
              }

              placeholder="Search resources..."
            />

          </label>


          {/* STATUS FILTER */}

          <label>

            Status

            <select
              value={
                statusFilter
              }

              onChange={
                event =>
                  setStatusFilter(
                    event
                      .target
                      .value as
                        StatusFilter
                  )
              }
            >

              <option value="all">
                All Status
              </option>


              <option value="draft">
                Draft
              </option>


              <option value="published">
                Published
              </option>


              <option value="archived">
                Archived
              </option>

            </select>

          </label>


          {/* TYPE FILTER */}

          <label>

            Resource Type

            <select
              value={
                typeFilter
              }

              onChange={
                event =>
                  setTypeFilter(
                    event
                      .target
                      .value as
                        TypeFilter
                  )
              }
            >

              <option value="all">
                All Types
              </option>


              <option value="standard_book">
                Standard Books
              </option>


              <option value="official_source">
                Official Sources
              </option>


              <option value="monthly_current_affairs">
                Monthly Current Affairs
              </option>


              <option value="notes">
                Notes
              </option>


              <option value="report">
                Reports
              </option>


              <option value="pyq_resource">
                PYQ Resources
              </option>


              <option value="syllabus_resource">
                Syllabus Resources
              </option>

            </select>

          </label>

        </div>

      </section>


      {/* ==================================================
          RESOURCE LIST
      ================================================== */}

      <section
        style={{
          display:
            'grid',

          gap:
            '14px',

          marginTop:
            '18px'
        }}
      >

        {loading && (

          <article
            className="panel"
          >
            Loading study resources...
          </article>

        )}


        {!loading &&
          visibleResources.length ===
            0 && (

          <article
            className="panel"
          >

            <h3>
              No resources found
            </h3>


            <p>
              Create a new resource or
              change the current filters.
            </p>

          </article>

        )}


        {!loading &&
          visibleResources.map(
            resource => (

              <article
                className="panel"

                key={
                  resource.id
                }
              >

                {/* TAGS */}

                <div
                  style={{
                    display:
                      'flex',

                    gap:
                      '6px',

                    flexWrap:
                      'wrap'
                  }}
                >

                  <span
                    className="tag"
                  >
                    {
                      resourceTypeLabel(
                        resource
                          .resource_type
                      )
                    }
                  </span>


                  <span
                    className="tag"
                  >
                    {
                      stageLabel(
                        resource
                          .exam_stage
                      )
                    }
                  </span>


                  <span
                    className="tag"
                  >
                    {
                      resource.status
                    }
                  </span>


                  <span
                    className="tag"
                  >
                    {
                      resource.language
                    }
                  </span>


                  {resource.is_free && (

                    <span
                      className="tag"
                    >
                      Free
                    </span>

                  )}

                </div>


                {/* TITLE */}

                <h3
                  style={{
                    marginTop:
                      '12px'
                  }}
                >
                  {resource.title}
                </h3>


                {/* DESCRIPTION */}

                {resource.description && (

                  <p>
                    {
                      resource.description
                    }
                  </p>

                )}


                {/* META */}

                <div
                  style={{
                    display:
                      'grid',

                    gridTemplateColumns:
                      'repeat(auto-fit, minmax(130px, 1fr))',

                    gap:
                      '10px',

                    marginTop:
                      '14px'
                  }}
                >

                  <div>

                    <small>
                      Subject
                    </small>


                    <div>
                      <strong>
                        {
                          resource.subject
                        }
                      </strong>
                    </div>

                  </div>


                  {resource.source_name && (

                    <div>

                      <small>
                        Source
                      </small>


                      <div>
                        <strong>
                          {
                            resource
                              .source_name
                          }
                        </strong>
                      </div>

                    </div>

                  )}


                  {resource.paper && (

                    <div>

                      <small>
                        Paper
                      </small>


                      <div>
                        <strong>
                          {
                            resource.paper
                          }
                        </strong>
                      </div>

                    </div>

                  )}


                  <div>

                    <small>
                      Sort Order
                    </small>


                    <div>
                      <strong>
                        {
                          resource
                            .sort_order
                        }
                      </strong>
                    </div>

                  </div>


                  <div>

                    <small>
                      Updated
                    </small>


                    <div>
                      <strong>
                        {
                          formatDate(
                            resource
                              .updated_at
                          )
                        }
                      </strong>
                    </div>

                  </div>

                </div>


                {/* URL */}

                {resource.external_url && (

                  <div
                    className="callout"
                    style={{
                      marginTop:
                        '14px',

                      overflowWrap:
                        'anywhere'
                    }}
                  >

                    <strong>
                      External URL
                    </strong>


                    <p>
                      {
                        resource
                          .external_url
                      }
                    </p>

                  </div>

                )}


                {/* ACTIONS */}

                <div
                  style={{
                    display:
                      'flex',

                    gap:
                      '8px',

                    flexWrap:
                      'wrap',

                    marginTop:
                      '16px'
                  }}
                >

                  <button
                    type="button"
                    className="secondary-btn"

                    onClick={() =>
                      editResource(
                        resource
                      )
                    }
                  >
                    Edit
                  </button>


                  {resource.status !==
                    'published' && (

                    <button
                      type="button"
                      className="primary-btn"

                      onClick={() =>
                        void changeStatus(
                          resource,
                          'published'
                        )
                      }
                    >
                      Publish
                    </button>

                  )}


                  {resource.status ===
                    'published' && (

                    <button
                      type="button"
                      className="secondary-btn"

                      onClick={() =>
                        void changeStatus(
                          resource,
                          'draft'
                        )
                      }
                    >
                      Unpublish
                    </button>

                  )}


                  {resource.status !==
                    'archived' && (

                    <button
                      type="button"
                      className="secondary-btn"

                      onClick={() =>
                        void changeStatus(
                          resource,
                          'archived'
                        )
                      }
                    >
                      Archive
                    </button>

                  )}


                  <button
                    type="button"
                    className="secondary-btn"

                    onClick={() =>
                      void deleteResource(
                        resource
                      )
                    }
                  >
                    Delete
                  </button>

                </div>

              </article>

            )
          )}

      </section>

    </div>

  );
}

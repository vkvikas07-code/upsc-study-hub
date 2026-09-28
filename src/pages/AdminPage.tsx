import {
  useEffect,
  useMemo,
  useState
} from 'react';

import type {
  FormEvent
} from 'react';

import {
  TopBar
} from '../components/TopBar';

import {
  PrelimsAdminWorkspace
} from '../components/PrelimsAdminWorkspace';

import {
  PrelimsTestManager
} from '../components/PrelimsTestManager';

import {
  MainsQuestionManager
} from '../components/MainsQuestionManager';

import {
  MainsEvaluationManager
} from '../components/MainsEvaluationManager';

import {
  MainsPyqManager
} from '../components/MainsPyqManager';

import {
  ResourceAdminHub
} from '../components/ResourceAdminHub';

import type {
  CurrentAffair
} from '../types';

import {
  isSupabaseConfigured,
  supabase
} from '../lib/supabase';


type ArticleStatus =
  | 'draft'
  | 'published'
  | 'archived';


type CurationView =
  | 'all'
  | 'daily'
  | 'monthly'
  | 'yearly';


type AdminTab =
  | 'current'
  | 'resources'
  | 'mcq'
  | 'tests'
  | 'mains'
  | 'evaluation';


type MainsWorkspace =
  | 'pyq'
  | 'practice';


type CurationLevel =
  | 'monthly'
  | 'yearly';


type AdminArticle = {
  id: string;

  title: string;

  source: string;

  source_url:
    string | null;

  subject: string;

  summary: string;

  body:
    string | null;

  background:
    string | null;

  key_facts:
    string | null;

  prelims_points:
    string | null;

  mains_relevance:
    string | null;

  issues:
    string | null;

  way_forward:
    string | null;

  tags: string[];

  prelims: boolean;

  mains: boolean;

  status:
    ArticleStatus;

  monthly_selected:
    boolean;

  yearly_selected:
    boolean;

  published_at:
    string | null;

  created_at:
    string;

  updated_at:
    string;
};


const ARTICLE_SELECT = `
  id,
  title,
  source,
  source_url,
  subject,
  summary,
  body,
  background,
  key_facts,
  prelims_points,
  mains_relevance,
  issues,
  way_forward,
  tags,
  prelims,
  mains,
  status,
  monthly_selected,
  yearly_selected,
  published_at,
  created_at,
  updated_at
`;


/*
 * =========================================
 * DATE HELPERS
 * =========================================
 */

function getLocalDateValue(
  value?: string | null
) {
  const date =
    value
      ? new Date(value)
      : new Date();

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '';
  }

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      '0'
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      '0'
    );

  return `${year}-${month}-${day}`;
}


function currentAffairDateToIso(
  value: string
) {
  const [
    year,
    month,
    day
  ] =
    value
      .split('-')
      .map(
        Number
      );

  return new Date(
    year,
    month - 1,
    day,
    12,
    0,
    0
  ).toISOString();
}


function formatDate(
  value:
    string | null
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
 * =========================================
 * ADMIN PAGE
 * =========================================
 */

export function AdminPage({
  onPublish
}: {
  onPublish:
    (
      item:
        CurrentAffair
    ) => void;
}) {

  /*
   * =========================================
   * NAVIGATION
   * =========================================
   */

  const [
    adminTab,
    setAdminTab
  ] =
    useState<AdminTab>(
      'current'
    );


  const [
    mainsWorkspace,
    setMainsWorkspace
  ] =
    useState<MainsWorkspace>(
      'pyq'
    );


  /*
   * =========================================
   * ACCESS
   * =========================================
   */

  const [
    checkingAccess,
    setCheckingAccess
  ] =
    useState(
      true
    );


  const [
    hasAccess,
    setHasAccess
  ] =
    useState(
      false
    );


  /*
   * =========================================
   * ARTICLE DATA
   * =========================================
   */

  const [
    articles,
    setArticles
  ] =
    useState<
      AdminArticle[]
    >([]);


  const [
    loadingArticles,
    setLoadingArticles
  ] =
    useState(
      false
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
    useState(
      ''
    );


  /*
   * =========================================
   * EDITOR FORM
   * =========================================
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


  const [
    title,
    setTitle
  ] =
    useState(
      ''
    );


  const [
    source,
    setSource
  ] =
    useState(
      'PIB'
    );


  const [
    sourceUrl,
    setSourceUrl
  ] =
    useState(
      ''
    );


  const [
    articleDate,
    setArticleDate
  ] =
    useState(
      getLocalDateValue()
    );


  const [
    subject,
    setSubject
  ] =
    useState(
      'Polity & Governance'
    );


  const [
    summary,
    setSummary
  ] =
    useState(
      ''
    );


  const [
    background,
    setBackground
  ] =
    useState(
      ''
    );


  const [
    keyFacts,
    setKeyFacts
  ] =
    useState(
      ''
    );


  const [
    prelimsPoints,
    setPrelimsPoints
  ] =
    useState(
      ''
    );


  const [
    mainsRelevance,
    setMainsRelevance
  ] =
    useState(
      ''
    );


  const [
    issues,
    setIssues
  ] =
    useState(
      ''
    );


  const [
    wayForward,
    setWayForward
  ] =
    useState(
      ''
    );


  const [
    tagsText,
    setTagsText
  ] =
    useState(
      'Prelims, Mains'
    );


  const [
    prelims,
    setPrelims
  ] =
    useState(
      true
    );


  const [
    mains,
    setMains
  ] =
    useState(
      true
    );


  const [
    status,
    setStatus
  ] =
    useState<ArticleStatus>(
      'draft'
    );


  /*
   * =========================================
   * CURATION
   * =========================================
   */

  const [
    curationView,
    setCurationView
  ] =
    useState<CurationView>(
      'all'
    );


  const [
    curationSearch,
    setCurationSearch
  ] =
    useState(
      ''
    );


  const [
    curationMonth,
    setCurationMonth
  ] =
    useState(
      getLocalDateValue()
        .slice(
          0,
          7
        )
    );


  const [
    curationYear,
    setCurationYear
  ] =
    useState(
      String(
        new Date()
          .getFullYear()
      )
    );


  const [
    curationPendingOnly,
    setCurationPendingOnly
  ] =
    useState(
      false
    );


  const [
    selectedArticleIds,
    setSelectedArticleIds
  ] =
    useState<
      string[]
    >([]);


  /*
   * =========================================
   * CONVERT FOR STUDENT CURRENT AFFAIRS
   * =========================================
   */

  function toCurrentAffair(
    article:
      AdminArticle
  ):
    CurrentAffair {

    return {
      id:
        article.id,

      title:
        article.title,

      source:
        article.source,

      sourceUrl:
        article.source_url,

      subject:
        article.subject,

      summary:
        article.summary,

      tags:
        article.tags ||
        [],

      prelims:
        article.prelims,

      mains:
        article.mains,

      monthlySelected:
        article
          .monthly_selected,

      yearlySelected:
        article
          .yearly_selected,

      publishedAt:
        article.published_at
          ? new Date(
              article
                .published_at
            )
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
              )
          : 'Today',

      publishedAtIso:
        article
          .published_at
    };
  }


  /*
   * =========================================
   * LOAD CURRENT AFFAIRS
   * =========================================
   */

  async function loadArticles() {
    const client =
      supabase;

    if (!client) {
      return;
    }

    setLoadingArticles(
      true
    );

    const {
      data,
      error
    } =
      await client
        .from(
          'current_affairs'
        )
        .select(
          ARTICLE_SELECT
        )
        .order(
          'created_at',
          {
            ascending:
              false
          }
        );

    if (error) {
      console.error(
        'Unable to load Current Affairs:',
        error
      );

      setMessage(
        error.message
      );

      setLoadingArticles(
        false
      );

      return;
    }

    setArticles(
      (
        data ||
        []
      ) as
        AdminArticle[]
    );

    setLoadingArticles(
      false
    );
  }


  /*
   * =========================================
   * ACCESS CHECK
   * =========================================
   */

  useEffect(
    () => {
      const client =
        supabase;

      if (!client) {
        setCheckingAccess(
          false
        );

        return;
      }

      const safeClient =
        client;

      async function checkAccess() {
        const {
          data: {
            session
          }
        } =
          await safeClient
            .auth
            .getSession();

        if (
          !session?.user
        ) {
          setHasAccess(
            false
          );

          setCheckingAccess(
            false
          );

          return;
        }

        const {
          data,
          error
        } =
          await safeClient
            .from(
              'profiles'
            )
            .select(
              'role'
            )
            .eq(
              'id',
              session
                .user
                .id
            )
            .maybeSingle();

        if (error) {
          console.error(
            'Unable to verify admin access:',
            error
          );
        }

        const allowed =
          data?.role ===
            'admin' ||
          data?.role ===
            'editor';

        setHasAccess(
          allowed
        );

        if (allowed) {
          await loadArticles();
        }

        setCheckingAccess(
          false
        );
      }

      void checkAccess();
    },
    []
  );


  /*
   * =========================================
   * RESET FORM
   * =========================================
   */

  function resetForm() {
    setEditingId(
      null
    );

    setTitle(
      ''
    );

    setSource(
      'PIB'
    );

    setSourceUrl(
      ''
    );

    setArticleDate(
      getLocalDateValue()
    );

    setSubject(
      'Polity & Governance'
    );

    setSummary(
      ''
    );

    setBackground(
      ''
    );

    setKeyFacts(
      ''
    );

    setPrelimsPoints(
      ''
    );

    setMainsRelevance(
      ''
    );

    setIssues(
      ''
    );

    setWayForward(
      ''
    );

    setTagsText(
      'Prelims, Mains'
    );

    setPrelims(
      true
    );

    setMains(
      true
    );

    setStatus(
      'draft'
    );
  }


  /*
   * =========================================
   * EDIT ARTICLE
   * =========================================
   */

  function startEdit(
    article:
      AdminArticle
  ) {
    setEditingId(
      article.id
    );

    setTitle(
      article.title
    );

    setSource(
      article.source
    );

    setSourceUrl(
      article
        .source_url ||
      ''
    );

    setArticleDate(
      getLocalDateValue(
        article
          .published_at ||
        article
          .created_at
      )
    );

    setSubject(
      article.subject
    );

    setSummary(
      article.summary
    );

    setBackground(
      article
        .background ||
      ''
    );

    setKeyFacts(
      article
        .key_facts ||
      ''
    );

    setPrelimsPoints(
      article
        .prelims_points ||
      ''
    );

    setMainsRelevance(
      article
        .mains_relevance ||
      ''
    );

    setIssues(
      article
        .issues ||
      ''
    );

    setWayForward(
      article
        .way_forward ||
      ''
    );

    setTagsText(
      (
        article.tags ||
        []
      ).join(
        ', '
      )
    );

    setPrelims(
      article.prelims
    );

    setMains(
      article.mains
    );

    setStatus(
      article.status
    );

    setMessage(
      `Editing: ${article.title}`
    );

    document
      .querySelector(
        '.main-area'
      )
      ?.scrollTo({
        top:
          0,

        behavior:
          'smooth'
      });
  }


  /*
   * =========================================
   * BUILD BODY
   * =========================================
   */

  function createBody() {
    const sections = [
      background.trim()
        ? `BACKGROUND\n${background.trim()}`
        : '',

      keyFacts.trim()
        ? `KEY FACTS\n${keyFacts.trim()}`
        : '',

      prelimsPoints.trim()
        ? `PRELIMS POINTS\n${prelimsPoints.trim()}`
        : '',

      mainsRelevance.trim()
        ? `MAINS RELEVANCE\n${mainsRelevance.trim()}`
        : '',

      issues.trim()
        ? `ISSUES / CHALLENGES\n${issues.trim()}`
        : '',

      wayForward.trim()
        ? `WAY FORWARD\n${wayForward.trim()}`
        : ''
    ];

    return sections
      .filter(
        Boolean
      )
      .join(
        '\n\n'
      );
  }


  /*
   * =========================================
   * SAVE ARTICLE
   * =========================================
   */

  async function saveArticle(
    event:
      FormEvent
  ) {
    event.preventDefault();

    const client =
      supabase;

    if (
      !client ||
      !hasAccess
    ) {
      setMessage(
        'Admin or Editor access required.'
      );

      return;
    }

    if (
      !title.trim() ||
      !source.trim() ||
      !articleDate ||
      !subject.trim() ||
      !summary.trim()
    ) {
      setMessage(
        'Title, source, date, subject and summary are required.'
      );

      return;
    }

    setSaving(
      true
    );

    setMessage(
      editingId
        ? 'Updating article...'
        : 'Saving article...'
    );

    const {
      data: {
        user
      }
    } =
      await client
        .auth
        .getUser();

    if (!user) {
      setSaving(
        false
      );

      setMessage(
        'Session expired. Sign in again.'
      );

      return;
    }

    const tags =
      tagsText
        .split(
          ','
        )
        .map(
          tag =>
            tag.trim()
        )
        .filter(
          Boolean
        );

    const payload = {
      title:
        title.trim(),

      source:
        source.trim(),

      source_url:
        sourceUrl.trim() ||
        null,

      subject:
        subject.trim(),

      summary:
        summary.trim(),

      body:
        createBody() ||
        null,

      background:
        background.trim() ||
        null,

      key_facts:
        keyFacts.trim() ||
        null,

      prelims_points:
        prelimsPoints.trim() ||
        null,

      mains_relevance:
        mainsRelevance.trim() ||
        null,

      issues:
        issues.trim() ||
        null,

      way_forward:
        wayForward.trim() ||
        null,

      tags,

      prelims,

      mains,

      status,

      published_at:
        currentAffairDateToIso(
          articleDate
        ),

      updated_at:
        new Date()
          .toISOString()
    };

    if (editingId) {
      const {
        data,
        error
      } =
        await client
          .from(
            'current_affairs'
          )
          .update(
            payload
          )
          .eq(
            'id',
            editingId
          )
          .select(
            ARTICLE_SELECT
          )
          .single();

      if (
        error ||
        !data
      ) {
        console.error(
          'Current Affair update failed:',
          error
        );

        setMessage(
          error?.message ||
          'Unable to update article.'
        );

        setSaving(
          false
        );

        return;
      }

      const updated =
        data as
          AdminArticle;

      setArticles(
        current =>
          current.map(
            item =>
              item.id ===
                updated.id
                ? updated
                : item
          )
      );

      if (
        updated.status ===
        'published'
      ) {
        onPublish(
          toCurrentAffair(
            updated
          )
        );
      }

      resetForm();

      setSaving(
        false
      );

      setMessage(
        'Article updated successfully.'
      );

      return;
    }

    const {
      data,
      error
    } =
      await client
        .from(
          'current_affairs'
        )
        .insert({
          ...payload,

          created_by:
            user.id
        })
        .select(
          ARTICLE_SELECT
        )
        .single();

    if (
      error ||
      !data
    ) {
      console.error(
        'Current Affair creation failed:',
        error
      );

      setMessage(
        error?.message ||
        'Unable to create article.'
      );

      setSaving(
        false
      );

      return;
    }

    const created =
      data as
        AdminArticle;

    setArticles(
      current => [
        created,
        ...current
      ]
    );

    if (
      created.status ===
      'published'
    ) {
      onPublish(
        toCurrentAffair(
          created
        )
      );
    }

    resetForm();

    setSaving(
      false
    );

    setMessage(
      created.status ===
        'published'
        ? 'Published successfully.'
        : 'Draft saved successfully.'
    );
  }


  /*
   * =========================================
   * CHANGE STATUS
   * =========================================
   */

  async function changeStatus(
    article:
      AdminArticle,

    nextStatus:
      ArticleStatus
  ) {
    const client =
      supabase;

    if (!client) {
      return;
    }

    const updatePayload = {
      status:
        nextStatus,

      published_at:
        article
          .published_at ||
        new Date()
          .toISOString(),

      updated_at:
        new Date()
          .toISOString(),

      ...(
        nextStatus ===
          'published'
          ? {}
          : {
              monthly_selected:
                false,

              yearly_selected:
                false
            }
      )
    };

    const {
      data,
      error
    } =
      await client
        .from(
          'current_affairs'
        )
        .update(
          updatePayload
        )
        .eq(
          'id',
          article.id
        )
        .select(
          ARTICLE_SELECT
        )
        .single();

    if (
      error ||
      !data
    ) {
      setMessage(
        error?.message ||
        'Unable to change status.'
      );

      return;
    }

    const updated =
      data as
        AdminArticle;

    setArticles(
      current =>
        current.map(
          item =>
            item.id ===
              updated.id
              ? updated
              : item
        )
    );

    setSelectedArticleIds(
      current =>
        current.filter(
          id =>
            id !==
            updated.id
        )
    );

    if (
      updated.status ===
      'published'
    ) {
      onPublish(
        toCurrentAffair(
          updated
        )
      );
    }

    setMessage(
      `Status changed to ${nextStatus}.`
    );
  }


  /*
   * =========================================
   * SINGLE CURATION
   * =========================================
   */

  async function changeCuration(
    article:
      AdminArticle,

    level:
      CurationLevel,

    selected:
      boolean
  ) {
    const client =
      supabase;

    if (!client) {
      return;
    }

    if (
      article.status !==
      'published'
    ) {
      setMessage(
        'Publish this Current Affair first.'
      );

      return;
    }

    if (
      level ===
        'yearly' &&
      selected &&
      !article
        .monthly_selected
    ) {
      setMessage(
        'First select this Current Affair for Monthly Current Affairs.'
      );

      return;
    }

    if (
      level ===
        'monthly' &&
      selected &&
      article
        .monthly_selected
    ) {
      setMessage(
        'This article is already selected for Monthly Current Affairs.'
      );

      return;
    }

    if (
      level ===
        'yearly' &&
      selected &&
      article
        .yearly_selected
    ) {
      setMessage(
        'This article is already selected for Yearly Current Affairs.'
      );

      return;
    }

    const updatePayload:
      Record<
        string,
        boolean | string
      > = {
        updated_at:
          new Date()
            .toISOString()
      };

    if (
      level ===
      'monthly'
    ) {
      updatePayload
        .monthly_selected =
          selected;

      if (!selected) {
        updatePayload
          .yearly_selected =
            false;
      }
    } else {
      updatePayload
        .yearly_selected =
          selected;
    }

    const {
      data,
      error
    } =
      await client
        .from(
          'current_affairs'
        )
        .update(
          updatePayload
        )
        .eq(
          'id',
          article.id
        )
        .select(
          ARTICLE_SELECT
        )
        .single();

    if (
      error ||
      !data
    ) {
      console.error(
        'Curation update failed:',
        error
      );

      setMessage(
        error?.message ||
        'Unable to update Current Affairs curation.'
      );

      return;
    }

    const updated =
      data as
        AdminArticle;

    setArticles(
      current =>
        current.map(
          item =>
            item.id ===
              updated.id
              ? updated
              : item
        )
    );

    setSelectedArticleIds(
      current =>
        current.filter(
          id =>
            id !==
            updated.id
        )
    );

    if (
      level ===
      'monthly'
    ) {
      setMessage(
        selected
          ? 'Article successfully selected for Monthly Current Affairs.'
          : 'Article removed from Monthly Current Affairs. Yearly selection was also removed if applicable.'
      );
    } else {
      setMessage(
        selected
          ? 'Article successfully selected for Yearly Current Affairs.'
          : 'Article removed from Yearly Current Affairs.'
      );
    }
  }


  /*
   * =========================================
   * TOGGLE CHECKBOX
   * =========================================
   */

  function toggleArticleSelection(
    articleId:
      string
  ) {
    setSelectedArticleIds(
      current =>
        current.includes(
          articleId
        )
          ? current.filter(
              id =>
                id !==
                articleId
            )
          : [
              ...current,
              articleId
            ]
    );
  }


  /*
   * =========================================
   * BULK CURATION
   * =========================================
   */

  async function bulkChangeCuration(
    level:
      CurationLevel,

    selected:
      boolean
  ) {
    const client =
      supabase;

    if (!client) {
      return;
    }

    if (
      selectedArticleIds.length ===
      0
    ) {
      setMessage(
        'Select at least one Current Affair first.'
      );

      return;
    }

    const selectedArticles =
      articles.filter(
        article =>
          selectedArticleIds
            .includes(
              article.id
            )
      );

    const eligibleArticles =
      selectedArticles.filter(
        article => {
          if (
            article.status !==
            'published'
          ) {
            return false;
          }

          if (
            level ===
              'monthly' &&
            selected
          ) {
            return (
              !article
                .monthly_selected
            );
          }

          if (
            level ===
              'monthly' &&
            !selected
          ) {
            return (
              article
                .monthly_selected
            );
          }

          if (
            level ===
              'yearly' &&
            selected
          ) {
            return (
              article
                .monthly_selected &&
              !article
                .yearly_selected
            );
          }

          if (
            level ===
              'yearly' &&
            !selected
          ) {
            return (
              article
                .yearly_selected
            );
          }

          return false;
        }
      );

    if (
      eligibleArticles.length ===
      0
    ) {
      setSelectedArticleIds(
        []
      );

      setMessage(
        level ===
          'monthly'
          ? selected
            ? 'No pending Daily articles were eligible for Monthly selection.'
            : 'None of the selected articles are currently in Monthly Current Affairs.'
          : selected
          ? 'No eligible Monthly articles were pending Yearly selection.'
          : 'None of the selected articles are currently in Yearly Current Affairs.'
      );

      return;
    }

    const eligibleIds =
      eligibleArticles.map(
        article =>
          article.id
      );

    const updatePayload:
      Record<
        string,
        boolean | string
      > = {
        updated_at:
          new Date()
            .toISOString()
      };

    if (
      level ===
      'monthly'
    ) {
      updatePayload
        .monthly_selected =
          selected;

      if (!selected) {
        updatePayload
          .yearly_selected =
            false;
      }
    } else {
      updatePayload
        .yearly_selected =
          selected;
    }

    const {
      data,
      error
    } =
      await client
        .from(
          'current_affairs'
        )
        .update(
          updatePayload
        )
        .in(
          'id',
          eligibleIds
        )
        .select(
          ARTICLE_SELECT
        );

    if (error) {
      console.error(
        'Bulk curation failed:',
        error
      );

      setMessage(
        error.message
      );

      return;
    }

    const updatedItems =
      (
        data ||
        []
      ) as
        AdminArticle[];

    setArticles(
      current =>
        current.map(
          article => {
            const updated =
              updatedItems.find(
                item =>
                  item.id ===
                  article.id
              );

            return (
              updated ||
              article
            );
          }
        )
    );

    setSelectedArticleIds(
      []
    );

    const count =
      updatedItems.length;

    if (
      level ===
        'monthly'
    ) {
      setMessage(
        selected
          ? `${count} ${
              count === 1
                ? 'article'
                : 'articles'
            } selected for Monthly Current Affairs.`
          : `${count} ${
              count === 1
                ? 'article'
                : 'articles'
            } removed from Monthly Current Affairs.`
      );

      return;
    }

    setMessage(
      selected
        ? `${count} ${
            count === 1
              ? 'article'
              : 'articles'
          } selected for Yearly Current Affairs.`
        : `${count} ${
            count === 1
              ? 'article'
              : 'articles'
          } removed from Yearly Current Affairs.`
    );
  }


  /*
   * =========================================
   * DELETE
   * =========================================
   */

  async function deleteArticle(
    article:
      AdminArticle
  ) {
    const client =
      supabase;

    if (!client) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete "${article.title}" permanently?`
      );

    if (!confirmed) {
      return;
    }

    const {
      error
    } =
      await client
        .from(
          'current_affairs'
        )
        .delete()
        .eq(
          'id',
          article.id
        );

    if (error) {
      setMessage(
        error.message
      );

      return;
    }

    setArticles(
      current =>
        current.filter(
          item =>
            item.id !==
            article.id
        )
    );

    setSelectedArticleIds(
      current =>
        current.filter(
          id =>
            id !==
            article.id
        )
    );

    if (
      editingId ===
      article.id
    ) {
      resetForm();
    }

    setMessage(
      'Article deleted.'
    );
  }


  /*
   * =========================================
   * MASTER STATISTICS
   * =========================================
   */

  const publishedArticles =
    useMemo(
      () =>
        articles.filter(
          article =>
            article.status ===
            'published'
        ),
      [
        articles
      ]
    );


  const monthlyArticles =
    useMemo(
      () =>
        publishedArticles.filter(
          article =>
            article
              .monthly_selected
        ),
      [
        publishedArticles
      ]
    );


  const yearlyArticles =
    useMemo(
      () =>
        monthlyArticles.filter(
          article =>
            article
              .yearly_selected
        ),
      [
        monthlyArticles
      ]
    );


  /*
   * =========================================
   * MONTH STATISTICS
   * =========================================
   */

  const currentMonthPublished =
    useMemo(
      () =>
        publishedArticles.filter(
          article => {
            const date =
              new Date(
                article
                  .published_at ||
                article
                  .created_at
              );

            if (
              Number.isNaN(
                date.getTime()
              )
            ) {
              return false;
            }

            const monthKey =
              `${date.getFullYear()}-${String(
                date.getMonth() + 1
              ).padStart(
                2,
                '0'
              )}`;

            return (
              monthKey ===
              curationMonth
            );
          }
        ),
      [
        publishedArticles,
        curationMonth
      ]
    );


  const currentMonthMonthly =
    useMemo(
      () =>
        currentMonthPublished.filter(
          article =>
            article
              .monthly_selected
        ),
      [
        currentMonthPublished
      ]
    );


  const currentMonthPending =
    currentMonthPublished.length -
    currentMonthMonthly.length;


  /*
   * =========================================
   * YEAR STATISTICS
   * =========================================
   */

  const currentYearPublished =
    useMemo(
      () =>
        publishedArticles.filter(
          article => {
            const date =
              new Date(
                article
                  .published_at ||
                article
                  .created_at
              );

            if (
              Number.isNaN(
                date.getTime()
              )
            ) {
              return false;
            }

            return (
              String(
                date.getFullYear()
              ) ===
              curationYear
            );
          }
        ),
      [
        publishedArticles,
        curationYear
      ]
    );


  const currentYearMonthly =
    useMemo(
      () =>
        currentYearPublished.filter(
          article =>
            article
              .monthly_selected
        ),
      [
        currentYearPublished
      ]
    );


  const currentYearYearly =
    useMemo(
      () =>
        currentYearMonthly.filter(
          article =>
            article
              .yearly_selected
        ),
      [
        currentYearMonthly
      ]
    );


  const currentYearPending =
    currentYearMonthly.length -
    currentYearYearly.length;


  /*
   * =========================================
   * FILTER CURATION ARTICLES
   * =========================================
   */

  const curationArticles =
    useMemo(
      () =>
        articles.filter(
          article => {

            if (
              curationView ===
                'daily' &&
              article.status !==
                'published'
            ) {
              return false;
            }

            if (
              curationView ===
                'monthly' &&
              (
                article.status !==
                  'published' ||
                !article
                  .monthly_selected
              )
            ) {
              return false;
            }

            if (
              curationView ===
                'yearly' &&
              (
                article.status !==
                  'published' ||
                !article
                  .yearly_selected
              )
            ) {
              return false;
            }

            const date =
              new Date(
                article
                  .published_at ||
                article
                  .created_at
              );

            if (
              Number.isNaN(
                date.getTime()
              )
            ) {
              return false;
            }

            const year =
              String(
                date.getFullYear()
              );

            const month =
              `${year}-${String(
                date.getMonth() + 1
              ).padStart(
                2,
                '0'
              )}`;

            if (
              curationView ===
                'daily' &&
              curationMonth &&
              month !==
                curationMonth
            ) {
              return false;
            }

            if (
              (
                curationView ===
                  'monthly' ||
                curationView ===
                  'yearly'
              ) &&
              curationYear &&
              year !==
                curationYear
            ) {
              return false;
            }

            if (
              curationPendingOnly
            ) {
              if (
                curationView ===
                  'daily' &&
                article
                  .monthly_selected
              ) {
                return false;
              }

              if (
                curationView ===
                  'monthly' &&
                article
                  .yearly_selected
              ) {
                return false;
              }
            }

            const search =
              curationSearch
                .trim()
                .toLowerCase();

            if (!search) {
              return true;
            }

            const searchable =
              [
                article.title,
                article.subject,
                article.source,
                article.summary,
                ...(
                  article.tags ||
                  []
                )
              ]
                .join(
                  ' '
                )
                .toLowerCase();

            return searchable
              .includes(
                search
              );
          }
        ),
      [
        articles,
        curationView,
        curationSearch,
        curationMonth,
        curationYear,
        curationPendingOnly
      ]
    );


  /*
   * =========================================
   * PENDING VISIBLE ARTICLES
   * =========================================
   */

  const pendingVisibleArticles =
    useMemo(
      () => {
        if (
          curationView ===
          'daily'
        ) {
          return curationArticles.filter(
            article =>
              !article
                .monthly_selected
          );
        }

        if (
          curationView ===
          'monthly'
        ) {
          return curationArticles.filter(
            article =>
              article
                .monthly_selected &&
              !article
                .yearly_selected
          );
        }

        return [];
      },
      [
        curationArticles,
        curationView
      ]
    );


  /*
   * =========================================
   * ACCESS UI
   * =========================================
   */

  if (
    !isSupabaseConfigured
  ) {
    return (
      <div
        className="page-wrap"
      >
        <TopBar
          title="Admin Studio"
          subtitle="Content management"
        />

        <section
          className="panel"
        >
          <h2>
            Supabase is not configured
          </h2>
        </section>
      </div>
    );
  }


  if (
    checkingAccess
  ) {
    return (
      <div
        className="page-wrap"
      >
        <TopBar
          title="Admin Studio"
          subtitle="Checking secure access"
        />

        <section
          className="panel"
        >
          <h2>
            Checking editor access...
          </h2>
        </section>
      </div>
    );
  }


  if (
    !hasAccess
  ) {
    return (
      <div
        className="page-wrap"
      >
        <TopBar
          title="Admin Studio"
          subtitle="Protected area"
        />

        <section
          className="panel"
        >
          <h2>
            Admin or Editor access required
          </h2>

          <p>
            Open Admin Studio using an approved editor or admin account.
          </p>
        </section>
      </div>
    );
  }


  /*
   * =========================================
   * PAGE
   * =========================================
   */

  return (
    <div
      className="page-wrap"
    >

      <TopBar
        title="Admin Studio"
        subtitle="Professional UPSC content publishing"
      />


      {/* MAIN ADMIN TABS */}

      <section
        className="panel"

        style={{
          marginBottom:
            '18px',

          padding:
            '14px'
        }}
      >
        <div
          style={{
            display:
              'flex',

            gap:
              '8px',

            flexWrap:
              'wrap'
          }}
        >

          {(
            [
              [
                'current',
                'Current Affairs'
              ],

              [
                'resources',
                'Study Material'
              ],

              [
                'mcq',
                'Prelims MCQ'
              ],

              [
                'tests',
                'Test Series'
              ],

              [
                'mains',
                'Mains'
              ],

              [
                'evaluation',
                'Evaluations'
              ]
            ] as
              Array<
                [
                  AdminTab,
                  string
                ]
              >
          ).map(
            (
              [
                tab,
                label
              ]
            ) => (
              <button
                key={
                  tab
                }

                type="button"

                className={
                  adminTab ===
                    tab
                    ? 'filter active'
                    : 'filter'
                }

                onClick={() =>
                  setAdminTab(
                    tab
                  )
                }
              >
                {label}
              </button>
            )
          )}

        </div>
      </section>


      {/* CURRENT AFFAIRS */}

      {adminTab ===
        'current' && (
        <>

          <section
            className="admin-grid"
          >

            {/* EDITOR FORM */}

            <form
              className="panel admin-form"

              onSubmit={
                saveArticle
              }
            >

              <span
                className="eyebrow"
              >
                CURRENT AFFAIRS EDITOR
              </span>


              <h2>
                {
                  editingId
                    ? 'Edit Current Affair'
                    : 'Add Current Affair'
                }
              </h2>


              <label>
                Title

                <input
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

                  placeholder="Current Affair headline"

                  required
                />
              </label>


              <label>
                Source

                <input
                  value={
                    source
                  }

                  onChange={
                    event =>
                      setSource(
                        event
                          .target
                          .value
                      )
                  }

                  placeholder="PIB / The Hindu / PRS / RBI"

                  required
                />
              </label>


              <label>
                Official Source URL

                <input
                  type="url"

                  value={
                    sourceUrl
                  }

                  onChange={
                    event =>
                      setSourceUrl(
                        event
                          .target
                          .value
                      )
                  }

                  placeholder="https://..."
                />
              </label>


              <label>
                Date

                <input
                  type="date"

                  value={
                    articleDate
                  }

                  onChange={
                    event =>
                      setArticleDate(
                        event
                          .target
                          .value
                      )
                  }

                  required
                />
              </label>


              <label>
                Subject

                <input
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


              <label>
                Quick Revision Summary

                <textarea
                  rows={
                    4
                  }

                  value={
                    summary
                  }

                  onChange={
                    event =>
                      setSummary(
                        event
                          .target
                          .value
                      )
                  }

                  required
                />
              </label>


              <label>
                Background

                <textarea
                  rows={
                    4
                  }

                  value={
                    background
                  }

                  onChange={
                    event =>
                      setBackground(
                        event
                          .target
                          .value
                      )
                  }
                />
              </label>


              <label>
                Key Facts

                <textarea
                  rows={
                    4
                  }

                  value={
                    keyFacts
                  }

                  onChange={
                    event =>
                      setKeyFacts(
                        event
                          .target
                          .value
                      )
                  }
                />
              </label>


              <label>
                Prelims Points

                <textarea
                  rows={
                    4
                  }

                  value={
                    prelimsPoints
                  }

                  onChange={
                    event =>
                      setPrelimsPoints(
                        event
                          .target
                          .value
                      )
                  }
                />
              </label>


              <label>
                Mains Relevance

                <textarea
                  rows={
                    4
                  }

                  value={
                    mainsRelevance
                  }

                  onChange={
                    event =>
                      setMainsRelevance(
                        event
                          .target
                          .value
                      )
                  }
                />
              </label>


              <label>
                Issues / Challenges

                <textarea
                  rows={
                    4
                  }

                  value={
                    issues
                  }

                  onChange={
                    event =>
                      setIssues(
                        event
                          .target
                          .value
                      )
                  }
                />
              </label>


              <label>
                Way Forward

                <textarea
                  rows={
                    4
                  }

                  value={
                    wayForward
                  }

                  onChange={
                    event =>
                      setWayForward(
                        event
                          .target
                          .value
                      )
                  }
                />
              </label>


              <label>
                Tags

                <input
                  value={
                    tagsText
                  }

                  onChange={
                    event =>
                      setTagsText(
                        event
                          .target
                          .value
                      )
                  }

                  placeholder="Prelims, Mains, Environment"
                />
              </label>


              <div
                className="checkbox-row"
              >

                <label>
                  <input
                    type="checkbox"

                    checked={
                      prelims
                    }

                    onChange={
                      event =>
                        setPrelims(
                          event
                            .target
                            .checked
                        )
                    }
                  />

                  Prelims
                </label>


                <label>
                  <input
                    type="checkbox"

                    checked={
                      mains
                    }

                    onChange={
                      event =>
                        setMains(
                          event
                            .target
                            .checked
                        )
                    }
                  />

                  Mains
                </label>

              </div>


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
                          ArticleStatus
                      )
                  }
                >
                  <option
                    value="draft"
                  >
                    Draft
                  </option>

                  <option
                    value="published"
                  >
                    Published
                  </option>

                  <option
                    value="archived"
                  >
                    Archived
                  </option>
                </select>
              </label>


              <div
                style={{
                  display:
                    'flex',

                  gap:
                    '10px',

                  flexWrap:
                    'wrap'
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
                      ? 'Save changes'
                      : status ===
                        'published'
                      ? 'Publish to students'
                      : 'Save draft'
                  }
                </button>


                {editingId && (
                  <button
                    type="button"

                    className="secondary-btn"

                    onClick={
                      resetForm
                    }
                  >
                    Cancel edit
                  </button>
                )}

              </div>


              {message && (
                <p
                  className="form-message"
                >
                  {message}
                </p>
              )}

            </form>


            {/* WORKFLOW SUMMARY */}

            <aside
              className="panel admin-side"
            >

              <span
                className="eyebrow"
              >
                EDITOR WORKFLOW
              </span>


              <h3>
                Daily → Monthly → Yearly
              </h3>


              <p>
                Publish useful Current Affairs daily. Select only important Daily items for Monthly revision, then select only the highest-priority Monthly items for Yearly revision.
              </p>


              <div
                className="callout"
              >
                <strong>
                  Published Daily
                </strong>

                <p>
                  {
                    publishedArticles.length
                  }
                </p>
              </div>


              <div
                className="callout"

                style={{
                  marginTop:
                    '10px'
                }}
              >
                <strong>
                  Monthly Selected
                </strong>

                <p>
                  {
                    monthlyArticles.length
                  }
                </p>
              </div>


              <div
                className="callout"

                style={{
                  marginTop:
                    '10px'
                }}
              >
                <strong>
                  Yearly Selected
                </strong>

                <p>
                  {
                    yearlyArticles.length
                  }
                </p>
              </div>

            </aside>

          </section>


          {/* CURATION */}

          <section
            className="panel"

            style={{
              marginTop:
                '20px'
            }}
          >

            <div
              style={{
                display:
                  'flex',

                justifyContent:
                  'space-between',

                alignItems:
                  'center',

                gap:
                  '12px',

                flexWrap:
                  'wrap'
              }}
            >

              <div>
                <span
                  className="eyebrow"
                >
                  CURRENT AFFAIRS CURATION
                </span>

                <h2>
                  Manage Daily, Monthly and Yearly CA
                </h2>
              </div>


              <button
                type="button"

                className="secondary-btn"

                onClick={() => {
                  setSelectedArticleIds(
                    []
                  );

                  void loadArticles();
                }}
              >
                Refresh
              </button>

            </div>


            {/* CURATION VIEWS */}

            <div
              style={{
                display:
                  'flex',

                gap:
                  '8px',

                flexWrap:
                  'wrap',

                marginTop:
                  '14px'
              }}
            >

              <button
                type="button"

                className={
                  curationView ===
                    'all'
                    ? 'filter active'
                    : 'filter'
                }

                onClick={() => {
                  setCurationView(
                    'all'
                  );

                  setCurationPendingOnly(
                    false
                  );

                  setSelectedArticleIds(
                    []
                  );
                }}
              >
                All Articles
                {' '}
                ({articles.length})
              </button>


              <button
                type="button"

                className={
                  curationView ===
                    'daily'
                    ? 'filter active'
                    : 'filter'
                }

                onClick={() => {
                  setCurationView(
                    'daily'
                  );

                  setSelectedArticleIds(
                    []
                  );
                }}
              >
                Daily → Monthly
                {' '}
                ({publishedArticles.length})
              </button>


              <button
                type="button"

                className={
                  curationView ===
                    'monthly'
                    ? 'filter active'
                    : 'filter'
                }

                onClick={() => {
                  setCurationView(
                    'monthly'
                  );

                  setSelectedArticleIds(
                    []
                  );
                }}
              >
                Monthly → Yearly
                {' '}
                ({monthlyArticles.length})
              </button>


              <button
                type="button"

                className={
                  curationView ===
                    'yearly'
                    ? 'filter active'
                    : 'filter'
                }

                onClick={() => {
                  setCurationView(
                    'yearly'
                  );

                  setCurationPendingOnly(
                    false
                  );

                  setSelectedArticleIds(
                    []
                  );
                }}
              >
                Yearly Selected
                {' '}
                ({yearlyArticles.length})
              </button>

            </div>


            {/* FILTERS */}

            <div
              style={{
                display:
                  'grid',

                gridTemplateColumns:
                  'repeat(auto-fit, minmax(180px, 1fr))',

                gap:
                  '10px',

                marginTop:
                  '14px',

                alignItems:
                  'end'
              }}
            >

              {curationView ===
                'daily' && (
                <label>
                  Month

                  <input
                    type="month"

                    value={
                      curationMonth
                    }

                    onChange={
                      event => {
                        setCurationMonth(
                          event
                            .target
                            .value
                        );

                        setSelectedArticleIds(
                          []
                        );
                      }
                    }
                  />
                </label>
              )}


              {(curationView ===
                  'monthly' ||
                curationView ===
                  'yearly') && (
                <label>
                  Year

                  <input
                    type="number"

                    min="2000"

                    max="2100"

                    value={
                      curationYear
                    }

                    onChange={
                      event => {
                        setCurationYear(
                          event
                            .target
                            .value
                        );

                        setSelectedArticleIds(
                          []
                        );
                      }
                    }
                  />
                </label>
              )}


              {(curationView ===
                  'daily' ||
                curationView ===
                  'monthly') && (
                <label
                  style={{
                    display:
                      'flex',

                    alignItems:
                      'center',

                    gap:
                      '8px',

                    minHeight:
                      '42px'
                  }}
                >

                  <input
                    type="checkbox"

                    checked={
                      curationPendingOnly
                    }

                    onChange={
                      event => {
                        setCurationPendingOnly(
                          event
                            .target
                            .checked
                        );

                        setSelectedArticleIds(
                          []
                        );
                      }
                    }
                  />

                  Unselected only

                </label>
              )}


              <label>
                Search

                <input
                  type="search"

                  value={
                    curationSearch
                  }

                  onChange={
                    event => {
                      setCurationSearch(
                        event
                          .target
                          .value
                      );

                      setSelectedArticleIds(
                        []
                      );
                    }
                  }

                  placeholder="Search title, subject, source..."
                />
              </label>

            </div>


            {/* PERIOD STATISTICS */}

            {curationView ===
              'daily' && (
              <div
                style={{
                  display:
                    'grid',

                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(160px, 1fr))',

                  gap:
                    '10px',

                  marginTop:
                    '16px'
                }}
              >

                <div
                  className="callout"
                >
                  <strong>
                    Published Daily
                  </strong>

                  <p>
                    {
                      currentMonthPublished.length
                    }
                  </p>
                </div>


                <div
                  className="callout"
                >
                  <strong>
                    Monthly Selected
                  </strong>

                  <p>
                    {
                      currentMonthMonthly.length
                    }
                  </p>
                </div>


                <div
                  className="callout"
                >
                  <strong>
                    Pending Monthly
                  </strong>

                  <p>
                    {
                      currentMonthPending
                    }
                  </p>
                </div>

              </div>
            )}


            {(
              curationView ===
                'monthly' ||
              curationView ===
                'yearly'
            ) && (
              <div
                style={{
                  display:
                    'grid',

                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(160px, 1fr))',

                  gap:
                    '10px',

                  marginTop:
                    '16px'
                }}
              >

                <div
                  className="callout"
                >
                  <strong>
                    Published in Year
                  </strong>

                  <p>
                    {
                      currentYearPublished.length
                    }
                  </p>
                </div>


                <div
                  className="callout"
                >
                  <strong>
                    Monthly Selected
                  </strong>

                  <p>
                    {
                      currentYearMonthly.length
                    }
                  </p>
                </div>


                <div
                  className="callout"
                >
                  <strong>
                    Yearly Selected
                  </strong>

                  <p>
                    {
                      currentYearYearly.length
                    }
                  </p>
                </div>


                <div
                  className="callout"
                >
                  <strong>
                    Pending Yearly
                  </strong>

                  <p>
                    {
                      currentYearPending
                    }
                  </p>
                </div>

              </div>
            )}


            {/* BULK ACTIONS */}

            {(
              curationView ===
                'daily' ||
              curationView ===
                'monthly' ||
              curationView ===
                'yearly'
            ) && (
              <div
                className="callout"

                style={{
                  marginTop:
                    '14px'
                }}
              >

                <strong>
                  Bulk selection:
                  {' '}
                  {
                    selectedArticleIds.length
                  }
                  {' '}
                  selected
                </strong>


                <div
                  style={{
                    display:
                      'flex',

                    gap:
                      '8px',

                    flexWrap:
                      'wrap',

                    marginTop:
                      '10px'
                  }}
                >

                  {(curationView ===
                      'daily' ||
                    curationView ===
                      'monthly') && (
                    <button
                      type="button"

                      className="secondary-btn"

                      disabled={
                        pendingVisibleArticles.length ===
                        0
                      }

                      onClick={() =>
                        setSelectedArticleIds(
                          pendingVisibleArticles.map(
                            article =>
                              article.id
                          )
                        )
                      }
                    >
                      Select all pending visible
                    </button>
                  )}


                  <button
                    type="button"

                    className="secondary-btn"

                    disabled={
                      curationArticles.length ===
                      0
                    }

                    onClick={() =>
                      setSelectedArticleIds(
                        curationArticles.map(
                          article =>
                            article.id
                        )
                      )
                    }
                  >
                    Select all visible
                  </button>


                  <button
                    type="button"

                    className="secondary-btn"

                    disabled={
                      selectedArticleIds.length ===
                      0
                    }

                    onClick={() =>
                      setSelectedArticleIds(
                        []
                      )
                    }
                  >
                    Clear selection
                  </button>


                  {curationView ===
                    'daily' && (
                    <button
                      type="button"

                      className="primary-btn"

                      disabled={
                        selectedArticleIds.length ===
                        0
                      }

                      onClick={() =>
                        void bulkChangeCuration(
                          'monthly',
                          true
                        )
                      }
                    >
                      Add eligible to Monthly
                    </button>
                  )}


                  {curationView ===
                    'monthly' && (
                    <>

                      <button
                        type="button"

                        className="primary-btn"

                        disabled={
                          selectedArticleIds.length ===
                          0
                        }

                        onClick={() =>
                          void bulkChangeCuration(
                            'yearly',
                            true
                          )
                        }
                      >
                        Add eligible to Yearly
                      </button>


                      <button
                        type="button"

                        className="secondary-btn"

                        disabled={
                          selectedArticleIds.length ===
                          0
                        }

                        onClick={() =>
                          void bulkChangeCuration(
                            'monthly',
                            false
                          )
                        }
                      >
                        Remove selected from Monthly
                      </button>

                    </>
                  )}


                  {curationView ===
                    'yearly' && (
                    <button
                      type="button"

                      className="secondary-btn"

                      disabled={
                        selectedArticleIds.length ===
                        0
                      }

                      onClick={() =>
                        void bulkChangeCuration(
                          'yearly',
                          false
                        )
                      }
                    >
                      Remove selected from Yearly
                    </button>
                  )}

                </div>

              </div>
            )}


            {loadingArticles && (
              <p>
                Loading Current Affairs...
              </p>
            )}


            {!loadingArticles &&
              curationArticles.length ===
                0 && (
                <div
                  className="callout"

                  style={{
                    marginTop:
                      '14px'
                  }}
                >
                  No Current Affairs match the selected filters.
                </div>
              )}


            {/* ARTICLE CARDS */}

            <div
              style={{
                display:
                  'grid',

                gap:
                  '12px',

                marginTop:
                  '16px'
              }}
            >

              {curationArticles.map(
                article => {

                  const pendingMonthly =
                    article.status ===
                      'published' &&
                    !article
                      .monthly_selected;


                  const pendingYearly =
                    article
                      .monthly_selected &&
                    !article
                      .yearly_selected;


                  return (
                    <article
                      key={
                        article.id
                      }

                      style={{
                        border:
                          '1px solid rgba(255,255,255,0.10)',

                        borderRadius:
                          '14px',

                        padding:
                          '16px'
                      }}
                    >

                      {curationView !==
                        'all' && (
                        <label
                          style={{
                            display:
                              'flex',

                            alignItems:
                              'center',

                            gap:
                              '8px',

                            marginBottom:
                              '10px'
                          }}
                        >

                          <input
                            type="checkbox"

                            checked={
                              selectedArticleIds
                                .includes(
                                  article.id
                                )
                            }

                            onChange={() =>
                              toggleArticleSelection(
                                article.id
                              )
                            }
                          />

                          Select

                        </label>
                      )}


                      <span
                        className="eyebrow"
                      >
                        {
                          article.subject
                        }
                      </span>


                      <h3>
                        {
                          article.title
                        }
                      </h3>


                      <p>
                        {
                          article.summary
                        }
                      </p>


                      <p>
                        <strong>
                          Source:
                        </strong>

                        {' '}

                        {
                          article.source
                        }

                        {' · '}

                        <strong>
                          Date:
                        </strong>

                        {' '}

                        {
                          formatDate(
                            article
                              .published_at
                          )
                        }

                        {' · '}

                        <strong>
                          Status:
                        </strong>

                        {' '}

                        {
                          article.status
                        }
                      </p>


                      {/* STATUS BADGES */}

                      <div
                        style={{
                          display:
                            'flex',

                          gap:
                            '8px',

                          flexWrap:
                            'wrap',

                          marginBottom:
                            '12px'
                        }}
                      >

                        {article.status ===
                          'published' && (
                          <span
                            className="tag"
                          >
                            DAILY
                          </span>
                        )}


                        {article
                          .monthly_selected && (
                          <span
                            className="tag"
                          >
                            MONTHLY SELECTED
                          </span>
                        )}


                        {article
                          .yearly_selected && (
                          <span
                            className="tag"
                          >
                            YEARLY SELECTED
                          </span>
                        )}


                        {curationView ===
                          'daily' &&
                          pendingMonthly && (
                          <span
                            className="eyebrow"
                          >
                            PENDING MONTHLY
                          </span>
                        )}


                        {curationView ===
                          'monthly' &&
                          pendingYearly && (
                          <span
                            className="eyebrow"
                          >
                            PENDING YEARLY
                          </span>
                        )}

                      </div>


                      {/* ACTIONS */}

                      <div
                        style={{
                          display:
                            'flex',

                          gap:
                            '8px',

                          flexWrap:
                            'wrap'
                        }}
                      >

                        <button
                          type="button"

                          className="secondary-btn"

                          onClick={() =>
                            startEdit(
                              article
                            )
                          }
                        >
                          Edit
                        </button>


                        {article.status ===
                          'published' && (
                          <>

                            <button
                              type="button"

                              className="secondary-btn"

                              onClick={() =>
                                void changeCuration(
                                  article,

                                  'monthly',

                                  !article
                                    .monthly_selected
                                )
                              }
                            >
                              {
                                article
                                  .monthly_selected
                                  ? 'Remove from Monthly'
                                  : 'Select for Monthly'
                              }
                            </button>


                            <button
                              type="button"

                              className="secondary-btn"

                              disabled={
                                !article
                                  .monthly_selected
                              }

                              onClick={() =>
                                void changeCuration(
                                  article,

                                  'yearly',

                                  !article
                                    .yearly_selected
                                )
                              }
                            >
                              {
                                article
                                  .yearly_selected
                                  ? 'Remove from Yearly'
                                  : 'Select for Yearly'
                              }
                            </button>

                          </>
                        )}


                        {article.status !==
                          'published' && (
                          <button
                            type="button"

                            className="secondary-btn"

                            onClick={() =>
                              void changeStatus(
                                article,
                                'published'
                              )
                            }
                          >
                            Publish
                          </button>
                        )}


                        {article.status !==
                          'draft' && (
                          <button
                            type="button"

                            className="secondary-btn"

                            onClick={() =>
                              void changeStatus(
                                article,
                                'draft'
                              )
                            }
                          >
                            Move to draft
                          </button>
                        )}


                        {article.status !==
                          'archived' && (
                          <button
                            type="button"

                            className="secondary-btn"

                            onClick={() =>
                              void changeStatus(
                                article,
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
                            void deleteArticle(
                              article
                            )
                          }
                        >
                          Delete
                        </button>

                      </div>

                    </article>
                  );
                }
              )}

            </div>

          </section>

        </>
      )}


      {/* STUDY MATERIAL */}

      {adminTab ===
        'resources' && (
        <ResourceAdminHub />
      )}


      {/* PRELIMS MCQ */}

      {adminTab ===
        'mcq' && (
        <PrelimsAdminWorkspace />
      )}


      {/* TEST SERIES */}

      {adminTab ===
        'tests' && (
        <PrelimsTestManager />
      )}


      {/* MAINS */}

      {adminTab ===
        'mains' && (
        <>

          <section
            className="panel"

            style={{
              marginBottom:
                '12px'
            }}
          >

            <div
              style={{
                display:
                  'flex',

                gap:
                  '8px',

                flexWrap:
                  'wrap'
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
                Practice Questions
              </button>

            </div>

          </section>


          {mainsWorkspace ===
            'pyq'
            ? (
              <MainsPyqManager />
            )
            : (
              <MainsQuestionManager />
            )}

        </>
      )}


      {/* EVALUATION */}

      {adminTab ===
        'evaluation' && (
        <MainsEvaluationManager />
      )}

    </div>
  );
}

import {
  useEffect,
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
  AdminWorkspaceStats
} from '../components/AdminWorkspaceStats';

import {
  PendingEvaluationBadge
} from '../components/PendingEvaluationBadge';

import {
  MainsPyqManager
} from '../components/MainsPyqManager';

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

type AdminTab =
  | 'current'
  | 'mcq'
  | 'tests'
  | 'mains'
  | 'evaluation';

type MainsWorkspace =
  | 'pyq'
  | 'practice';

type AdminArticle = {
  id: string;
  title: string;
  source: string;
  source_url: string | null;
  subject: string;
  summary: string;
  body: string | null;
  background: string | null;
  key_facts: string | null;
  prelims_points: string | null;
  mains_relevance: string | null;
  issues: string | null;
  way_forward: string | null;
  tags: string[];
  prelims: boolean;
  mains: boolean;
  status: ArticleStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

const ARTICLE_SELECT = `
  id,
  title,
  source,
  source_url,
  subject,
  summary,

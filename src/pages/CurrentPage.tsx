import {
  useState
} from 'react';

import type {
  CurrentAffair
} from '../types';

import {
  TopBar
} from '../components/TopBar';

import {
  QuickNoteComposer
} from '../components/QuickNoteComposer';

import {
  supabase
} from '../lib/supabase';


type FilterKey =
  | 'all'
  | 'prelims'
  | 'mains'
  | 'pib';


type CurrentView =
  | 'daily'
  | 'monthly'
  | 'yearly'
  | 'newspaper';


type NewspaperKey =
  | 'all'
  | 'the_hindu'
  | 'indian_express';


type NoteExamStage =
  | 'general'
  | 'prelims'
  | 'mains'
  | 'both';


type DetailedArticle =
  CurrentAffair & {
    body:
      string | null;

    source_url:
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
  };


function parsePublishedDate(
  value: string
): Date | null {
  const clean =
    value.trim();

  if (!clean) {
    return null;
  }

  const lower =
    clean.toLowerCase();

  const today =
    new Date();

  if (
    lower ===
    'today'
  ) {

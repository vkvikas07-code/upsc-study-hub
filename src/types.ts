export type NavKey = 'home' | 'learn' | 'practice' | 'current' | 'profile' | 'admin';

export type CurrentAffair = {
  id: string;
  title: string;
  source: string;
  sourceUrl?: string | null;
  subject: string;
  summary: string;
  tags: string[];
  publishedAt: string;
  publishedAtIso?: string | null;

  prelims: boolean;
  mains: boolean;

  monthlySelected?: boolean;
  yearlySelected?: boolean;
};

export type DailyTask = {
  id: string;
  label: string;
  done: boolean;
};

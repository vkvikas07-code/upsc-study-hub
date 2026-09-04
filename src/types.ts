export type NavKey = 'home' | 'learn' | 'practice' | 'current' | 'profile' | 'admin';

export type CurrentAffair = {
  id: string;
  title: string;
  source: string;
  subject: string;
  summary: string;
  tags: string[];
  publishedAt: string;
  prelims: boolean;
  mains: boolean;
};

export type DailyTask = {
  id: string;
  label: string;
  done: boolean;
};

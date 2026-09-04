import type { CurrentAffair } from '../types';

export const subjects = [
  { name: 'Polity', icon: '🏛️', progress: 42 },
  { name: 'History', icon: '📜', progress: 31 },
  { name: 'Geography', icon: '🌏', progress: 38 },
  { name: 'Economy', icon: '📈', progress: 27 },
  { name: 'Environment', icon: '🌱', progress: 53 },
  { name: 'Science & Tech', icon: '🔬', progress: 35 }
];

export const initialCurrentAffairs: CurrentAffair[] = [
  {
    id: 'ca-1',
    title: 'How to read a policy announcement for UPSC',
    source: 'Editorial Desk',
    subject: 'Polity & Governance',
    summary: 'A simple framework: identify the institution, legal basis, beneficiaries, implementation challenge and possible mains linkage.',
    tags: ['GS-II', 'Prelims', 'Mains'],
    publishedAt: 'Today',
    prelims: true,
    mains: true
  },
  {
    id: 'ca-2',
    title: 'Environment revision: connect species, habitat and convention',
    source: 'Study Hub',
    subject: 'Environment',
    summary: 'Use a three-column revision method to reduce fact overload and improve recall during prelims practice.',
    tags: ['GS-III', 'Environment'],
    publishedAt: 'Today',
    prelims: true,
    mains: true
  }
];

export const sampleQuestions = [
  {
    question: 'Which approach is best when a UPSC prelims statement contains an absolute word such as “always” or “only”?',
    options: [
      'Mark it wrong immediately',
      'Check the statement carefully against known exceptions',
      'Always mark it correct',
      'Skip every such question'
    ],
    answer: 1,
    explanation: 'Absolute wording is a warning sign, not automatic proof. Look for exceptions and verify the underlying concept.'
  },
  {
    question: 'A good current-affairs note should primarily help you do what?',
    options: [
      'Copy the whole newspaper',
      'Remember every date',
      'Connect the issue with the syllabus and likely questions',
      'Collect as many PDFs as possible'
    ],
    answer: 2,
    explanation: 'UPSC rewards relevance and linkage. Notes should connect facts with syllabus themes, concepts and exam application.'
  }
];

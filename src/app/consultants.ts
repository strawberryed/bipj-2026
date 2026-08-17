/**
 * Shared consultant directory used by both the "matched consultants" list
 * (connect-consultant page) and the booking page (book-meeting).
 *
 * `specialties` are deliberately written to match the exact string values
 * onboarding collects for `mainGoals` (Health Protection, Retirement,
 * Savings, Family Protection) and `topConcern` (Medical Expenses, Income
 * Loss, Critical Illness, Wealth Accumulation) — that's what lets the
 * matching service compare a user's profile to a consultant with simple
 * string overlap instead of a separate mapping table.
 */
export interface ConsultantProfile {
  id: string;
  name: string;
  title: string;
  yearsExperience: number;
  specialties: string[];
  bio: string;
  color: string; // used to tint the avatar icon so each consultant is visually distinct
}

export const CONSULTANTS: ConsultantProfile[] = [
  {
    id: 'sarah-lim',
    name: 'SARAH LIM',
    title: 'Financial and Health Advisor',
    yearsExperience: 8,
    specialties: ['Health Protection', 'Medical Expenses', 'Critical Illness'],
    bio: 'Helps clients optimise health coverage and employee benefits.',
    color: '#7c3aed'
  },
  {
    id: 'brandon',
    name: 'BRANDON',
    title: 'Senior Financial Advisor',
    yearsExperience: 10,
    specialties: ['Health Protection', 'Family Protection', 'Income Loss'],
    bio: 'Specialises in switching and upgrading existing insurance plans.',
    color: '#2563eb'
  },
  {
    id: 'johnny-lee',
    name: 'JOHNNY LEE',
    title: 'Group and Individual Plans',
    yearsExperience: 5,
    specialties: ['Savings', 'Retirement', 'Wealth Accumulation'],
    bio: 'Focuses on group and individual wealth-building plans.',
    color: '#059669'
  },
  {
    id: 'melissa-tan',
    name: 'MELISSA TAN',
    title: 'Retirement & Legacy Planning Specialist',
    yearsExperience: 12,
    specialties: ['Retirement', 'Wealth Accumulation', 'Savings'],
    bio: 'Helps clients plan retirement income and legacy goals.',
    color: '#db2777'
  },
  {
    id: 'daniel-goh',
    name: 'DANIEL GOH',
    title: 'Family Protection Advisor',
    yearsExperience: 7,
    specialties: ['Family Protection', 'Income Loss', 'Critical Illness'],
    bio: 'Specialises in coverage for growing families and sole breadwinners.',
    color: '#ea580c'
  },
  {
    id: 'priya-nair',
    name: 'PRIYA NAIR',
    title: 'Young Professionals Advisor',
    yearsExperience: 4,
    specialties: ['Health Protection', 'Savings', 'Medical Expenses'],
    bio: 'Helps young working adults start their first protection and savings plans.',
    color: '#0891b2'
  }
];
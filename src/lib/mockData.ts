// src/lib/mockData.ts
// Realistic demo data for a 15-person digital agency

import { Commitment, Meeting, TeamMember, Organization, NotificationLog, AppStats } from './types';

export const DEMO_ORGANIZATION: Organization = {
  id: 'org-demo',
  name: 'Apex Digital Agency',
  plan: 'growth',
  memberCount: 15,
  industry: 'Marketing & Design',
};

export const DEMO_MEMBERS: TeamMember[] = [
  { id: 'u1', name: 'Sarah Chen', email: 'sarah@apexdigital.co', role: 'Creative Director', reliabilityScore: 94, totalCommitments: 28, completedOnTime: 26, overdue: 1, avgDaysLate: 0.3 },
  { id: 'u2', name: 'John Patel', email: 'john@apexdigital.co', role: 'Project Manager', reliabilityScore: 78, totalCommitments: 41, completedOnTime: 32, overdue: 6, avgDaysLate: 1.8 },
  { id: 'u3', name: 'Maya Rodriguez', email: 'maya@apexdigital.co', role: 'UX Designer', reliabilityScore: 91, totalCommitments: 22, completedOnTime: 20, overdue: 1, avgDaysLate: 0.5 },
  { id: 'u4', name: 'Dave Kim', email: 'dave@apexdigital.co', role: 'Lead Developer', reliabilityScore: 88, totalCommitments: 35, completedOnTime: 31, overdue: 2, avgDaysLate: 0.9 },
  { id: 'u5', name: 'Priya Nair', email: 'priya@apexdigital.co', role: 'Account Manager', reliabilityScore: 72, totalCommitments: 19, completedOnTime: 14, overdue: 4, avgDaysLate: 2.4 },
  { id: 'u6', name: 'Alex Thompson', email: 'alex@apexdigital.co', role: 'Copywriter', reliabilityScore: 85, totalCommitments: 16, completedOnTime: 14, overdue: 1, avgDaysLate: 0.7 },
];

const today = new Date();
const addDays = (d: number) => {
  const dt = new Date(today);
  dt.setDate(dt.getDate() + d);
  return dt.toISOString().split('T')[0];
};
const subDays = (d: number) => addDays(-d);

export const DEMO_COMMITMENTS: Commitment[] = [
  {
    id: 'c1', task: 'Send campaign performance report to Acme Corp', owner: 'John Patel',
    deadline: 'Today', deadlineIso: addDays(0), status: 'due-soon', priority: 'high',
    meetingId: 'm1', meetingTitle: 'Acme Corp Weekly Sync', stakeholders: ['Sarah Chen'],
    createdAt: subDays(3), reminderSent: true, escalated: false,
    notes: 'Include Q2 conversion metrics and ad spend breakdown',
  },
  {
    id: 'c2', task: 'Complete wireframes for Nova Retail mobile app', owner: 'Maya Rodriguez',
    deadline: 'Tomorrow', deadlineIso: addDays(1), status: 'in-progress', priority: 'high',
    meetingId: 'm2', meetingTitle: 'Nova Retail Kickoff', stakeholders: ['John Patel', 'Dave Kim'],
    createdAt: subDays(5), reminderSent: false, escalated: false,
  },
  {
    id: 'c3', task: 'Fix image carousel bug on TechStart landing page', owner: 'Dave Kim',
    deadline: 'Today', deadlineIso: addDays(0), status: 'overdue', priority: 'high',
    meetingId: 'm1', meetingTitle: 'Acme Corp Weekly Sync',
    createdAt: subDays(4), reminderSent: true, escalated: true,
    notes: 'Client reported issue on Chrome mobile specifically',
  },
  {
    id: 'c4', task: 'Draft Q3 content calendar for HealthBridge', owner: 'Alex Thompson',
    deadline: addDays(3), deadlineIso: addDays(3), status: 'in-progress', priority: 'medium',
    meetingId: 'm3', meetingTitle: 'HealthBridge Content Planning',
    createdAt: subDays(2), reminderSent: false, escalated: false,
  },
  {
    id: 'c5', task: 'Send revised proposal to FutureMart ($28K project)', owner: 'Priya Nair',
    deadline: subDays(2), deadlineIso: subDays(2), status: 'overdue', priority: 'high',
    meetingId: 'm4', meetingTitle: 'FutureMart Sales Call',
    createdAt: subDays(6), reminderSent: true, escalated: false,
    notes: 'Client is waiting. Critical opportunity.',
  },
  {
    id: 'c6', task: 'Set up Google Analytics 4 for Bloom Cosmetics', owner: 'Dave Kim',
    deadline: addDays(5), deadlineIso: addDays(5), status: 'new', priority: 'medium',
    meetingId: 'm2', meetingTitle: 'Nova Retail Kickoff',
    createdAt: subDays(1), reminderSent: false, escalated: false,
  },
  {
    id: 'c7', task: 'Deliver final logo variants to Nexus Startup', owner: 'Sarah Chen',
    deadline: addDays(2), deadlineIso: addDays(2), status: 'in-progress', priority: 'medium',
    meetingId: 'm3', meetingTitle: 'HealthBridge Content Planning',
    createdAt: subDays(4), reminderSent: false, escalated: false,
  },
  {
    id: 'c8', task: 'Schedule onboarding call with Zara Fashion account', owner: 'Priya Nair',
    deadline: addDays(1), deadlineIso: addDays(1), status: 'due-soon', priority: 'medium',
    meetingId: 'm5', meetingTitle: 'Zara Fashion Intro',
    createdAt: subDays(2), reminderSent: true, escalated: false,
  },
  {
    id: 'c9', task: 'Update project timeline in Notion for TechStart', owner: 'John Patel',
    deadline: subDays(1), deadlineIso: subDays(1), status: 'completed', priority: 'low',
    completedAt: subDays(1), createdAt: subDays(5), reminderSent: false, escalated: false,
  },
  {
    id: 'c10', task: 'Review and approve social media copy for Acme Q3', owner: 'Sarah Chen',
    deadline: addDays(7), deadlineIso: addDays(7), status: 'new', priority: 'low',
    meetingId: 'm1', meetingTitle: 'Acme Corp Weekly Sync',
    createdAt: today.toISOString().split('T')[0], reminderSent: false, escalated: false,
  },
  {
    id: 'c11', task: 'Conduct usability testing session with 3 HealthBridge users', owner: 'Maya Rodriguez',
    deadline: addDays(6), deadlineIso: addDays(6), status: 'new', priority: 'medium',
    meetingId: 'm3', meetingTitle: 'HealthBridge Content Planning',
    createdAt: subDays(1), reminderSent: false, escalated: false,
  },
  {
    id: 'c12', task: 'Send weekly agency report to all clients', owner: 'John Patel',
    deadline: subDays(3), deadlineIso: subDays(3), status: 'completed', priority: 'medium',
    completedAt: subDays(3), createdAt: subDays(8), reminderSent: true, escalated: false,
  },
];

export const DEMO_MEETINGS: Meeting[] = [
  {
    id: 'm1', title: 'Acme Corp Weekly Sync', platform: 'zoom',
    uploadedAt: subDays(3), processedAt: subDays(3), commitmentCount: 3,
    summary: '3 commitments detected related to campaign reporting and bug fixes.',
    transcriptText: `[00:02:14] Sarah: Alright, let's start with the status update on the Acme campaign.\n[00:02:31] John: Yeah so the Q2 report is almost ready. I'll send the campaign performance report to Acme Corp today.\n[00:03:45] Dave: I need to mention - there's a bug with the image carousel on TechStart's landing page. It's broken on Chrome mobile.\n[00:04:02] Sarah: That's critical. Dave, can you fix that today as well?\n[00:04:10] Dave: Yes, I'll get it done.\n[00:07:33] Sarah: Also, I'll review and approve the social media copy for Acme Q3 by end of next week.`,
  },
  {
    id: 'm2', title: 'Nova Retail Kickoff', platform: 'meet',
    uploadedAt: subDays(5), processedAt: subDays(5), commitmentCount: 2,
    summary: '2 commitments around wireframes and analytics setup.',
    transcriptText: `[00:01:05] John: So the Nova Retail mobile app project is officially kicking off today.\n[00:03:22] Maya: I'll complete the wireframes for the mobile app by tomorrow. That gives you all something concrete to look at.\n[00:05:14] John: Perfect. Dave, what about the analytics side?\n[00:05:28] Dave: I'll set up Google Analytics 4 for Bloom Cosmetics within the next 5 days. I need access to their account first.\n[00:05:41] John: I'll get you that access today.`,
  },
  {
    id: 'm3', title: 'HealthBridge Content Planning', platform: 'meet',
    uploadedAt: subDays(2), processedAt: subDays(2), commitmentCount: 3,
    summary: '3 commitments around content calendar, logo, and user testing.',
    transcriptText: `[00:00:45] Priya: We need to nail down the content strategy for HealthBridge Q3.\n[00:02:15] Alex: I'll draft the Q3 content calendar for HealthBridge within the next 3 days.\n[00:04:30] Sarah: And I'll deliver the final logo variants to Nexus Startup by Wednesday - I know they've been waiting.\n[00:06:10] Maya: For HealthBridge, I should conduct usability testing with 3 actual users before we finalize the flows. I can do that within the week.`,
  },
  {
    id: 'm4', title: 'FutureMart Sales Call', platform: 'zoom',
    uploadedAt: subDays(6), processedAt: subDays(6), commitmentCount: 1,
    summary: '1 commitment: send revised proposal to FutureMart.',
    transcriptText: `[00:08:22] Priya: We've done our pricing analysis and we can make this work. I'll send the revised proposal for the $28K project by end of the week.\n[00:08:41] Client (FutureMart): Great, we'll be waiting. This needs to move fast, we have board approval to proceed.`,
  },
];

export const DEMO_NOTIFICATIONS: NotificationLog[] = [
  {
    id: 'n1', type: 'reminder', recipient: 'John Patel', commitmentId: 'c1',
    subject: '🔔 Reminder: Campaign report due today',
    body: 'Hi John, you committed to sending the campaign performance report to Acme Corp today. Don\'t let your team down!',
    sentAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 'n2', type: 'escalation', recipient: 'Sarah Chen', commitmentId: 'c3',
    subject: '🚨 Escalation: Dave Kim\'s task is overdue',
    body: 'Hi Sarah, the task "Fix image carousel bug on TechStart landing page" assigned to Dave Kim is now overdue by 1 day. Please follow up.',
    sentAt: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: 'n3', type: 'reminder', recipient: 'Priya Nair', commitmentId: 'c8',
    subject: '🔔 Reminder: Schedule Zara Fashion onboarding call tomorrow',
    body: 'Hi Priya, just a reminder that you committed to scheduling an onboarding call with Zara Fashion tomorrow.',
    sentAt: new Date(Date.now() - 8 * 3600000).toISOString(),
  },
  {
    id: 'n4', type: 'completion', recipient: 'John Patel', commitmentId: 'c12',
    subject: '✅ Great job! Weekly report delivered',
    body: 'The commitment "Send weekly agency report to all clients" has been marked as completed. Well done!',
    sentAt: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
];

export const DEMO_STATS: AppStats = {
  activeCommitments: 8,
  dueToday: 2,
  overdue: 2,
  completedThisWeek: 3,
  totalMeetings: 4,
  reliabilityAvg: 85,
};

// Reliability trend for chart (last 6 weeks)
export const RELIABILITY_TREND = [
  { week: 'Wk 1', score: 79, commitments: 12 },
  { week: 'Wk 2', score: 82, commitments: 15 },
  { week: 'Wk 3', score: 76, commitments: 18 },
  { week: 'Wk 4', score: 88, commitments: 14 },
  { week: 'Wk 5', score: 84, commitments: 21 },
  { week: 'Wk 6', score: 85, commitments: 19 },
];

export const STATUS_COLUMNS: { key: Commitment['status']; label: string; color: string }[] = [
  { key: 'new',         label: 'New',         color: '#00d4ff' },
  { key: 'in-progress', label: 'In Progress', color: '#7c3aed' },
  { key: 'due-soon',    label: 'Due Soon',    color: '#f59e0b' },
  { key: 'completed',   label: 'Completed',   color: '#10b981' },
  { key: 'overdue',     label: 'Overdue',     color: '#f43f5e' },
];

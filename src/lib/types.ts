// src/lib/types.ts
// Central type definitions for PromiseOS

export type CommitmentStatus = 'new' | 'in-progress' | 'due-soon' | 'completed' | 'overdue';

export interface Commitment {
  id: string;
  task: string;
  owner: string;
  deadline: string; // human-readable (e.g. "Friday", "June 20")
  deadlineIso: string; // ISO date string
  status: CommitmentStatus;
  priority: 'low' | 'medium' | 'high';
  meetingId?: string;
  meetingTitle?: string;
  stakeholders?: string[];
  notes?: string;
  createdAt: string;
  completedAt?: string;
  reminderSent?: boolean;
  escalated?: boolean;
}

export interface Meeting {
  id: string;
  title: string;
  platform: 'zoom' | 'meet' | 'teams' | 'manual';
  transcriptText: string;
  uploadedAt: string;
  processedAt?: string;
  commitmentCount: number;
  summary?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  reliabilityScore: number;   // 0–100
  totalCommitments: number;
  completedOnTime: number;
  overdue: number;
  avgDaysLate: number;
}

export interface Organization {
  id: string;
  name: string;
  plan: 'starter' | 'growth' | 'business';
  memberCount: number;
  industry: string;
}

export interface NotificationLog {
  id: string;
  type: 'reminder' | 'escalation' | 'completion';
  recipient: string;
  subject: string;
  body: string;
  sentAt: string;
  commitmentId: string;
}

export interface ExtractedCommitment {
  owner: string;
  task: string;
  deadline: string;
  deadlineIso: string;
  confidence: number; // 0–1
  rawText: string;
}

export interface AppStats {
  activeCommitments: number;
  dueToday: number;
  overdue: number;
  completedThisWeek: number;
  totalMeetings: number;
  reliabilityAvg: number;
}

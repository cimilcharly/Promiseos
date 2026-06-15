'use client';
// src/contexts/AppContext.tsx
// Provides global app state: commitments, meetings, notifications, members, mode and credentials

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Commitment, Meeting, TeamMember, Organization, NotificationLog, AppStats, ExtractedCommitment, CommitmentStatus,
} from '@/lib/types';
import {
  DEMO_COMMITMENTS, DEMO_MEETINGS, DEMO_MEMBERS, DEMO_NOTIFICATIONS,
  DEMO_ORGANIZATION,
} from '@/lib/mockData';
import {
  initFirebase, isFirebaseReady, getCommitmentsDb, saveCommitmentDb,
  updateCommitmentDb, deleteCommitmentDb, getMeetingsDb, saveMeetingDb,
  getNotificationsDb, saveNotificationDb
} from '@/lib/db';
import { extractCommitmentsWithGemini } from '@/lib/gemini';
import { sendEmailWithResend } from '@/lib/resend';

interface AppContextValue {
  // Mode
  isLiveMode: boolean;
  setLiveMode: (v: boolean) => void;

  // Credentials
  geminiKey: string;
  setGeminiKey: (v: string) => void;
  resendKey: string;
  setResendKey: (v: string) => void;
  firebaseConfig: string;
  setFirebaseConfig: (v: string) => void;

  // Data
  commitments: Commitment[];
  meetings: Meeting[];
  members: TeamMember[];
  organization: Organization;
  notifications: NotificationLog[];
  stats: AppStats;

  // User
  currentUser: TeamMember;
  setCurrentUser: (m: TeamMember) => void;

  // Actions
  addCommitment: (c: Omit<Commitment, 'id' | 'createdAt'>) => void;
  updateCommitmentStatus: (id: string, status: CommitmentStatus) => void;
  deleteCommitment: (id: string) => void;
  importCommitments: (items: ExtractedCommitment[], meetingId: string, meetingTitle: string) => void;
  addMeeting: (m: Omit<Meeting, 'id' | 'uploadedAt'>) => void;
  sendSimulatedReminder: (commitmentId: string, recipientName: string) => void;
  triggerSimulatedExtraction: (transcript: string, title: string) => Promise<ExtractedCommitment[]>;

  // Toast
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isLiveMode, setIsLiveModeState] = useState(false);
  const [geminiKey, setGeminiKeyState] = useState('');
  const [resendKey, setResendKeyState] = useState('');
  const [firebaseConfig, setFirebaseConfigState] = useState('');

  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [members] = useState<TeamMember[]>(DEMO_MEMBERS);
  const [organization] = useState<Organization>(DEMO_ORGANIZATION);
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [currentUser, setCurrentUser] = useState<TeamMember>(DEMO_MEMBERS[1]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Setters for credentials that automatically write to localStorage
  const setLiveMode = useCallback((v: boolean) => {
    setIsLiveModeState(v);
    localStorage.setItem('promiseos_live_mode', JSON.stringify(v));
    showToast(v ? '🔴 Live Mode enabled — real APIs active' : '🟡 Demo Mode — using simulated data', 'info');
  }, [showToast]);

  const setGeminiKey = useCallback((v: string) => {
    setGeminiKeyState(v);
    localStorage.setItem('promiseos_gemini_key', v);
  }, []);

  const setResendKey = useCallback((v: string) => {
    setResendKeyState(v);
    localStorage.setItem('promiseos_resend_key', v);
  }, []);

  const setFirebaseConfig = useCallback((v: string) => {
    setFirebaseConfigState(v);
    localStorage.setItem('promiseos_firebase_config', v);
  }, []);

  // 1. Initial load from local storage or environment variables
  useEffect(() => {
    const liveMode = localStorage.getItem('promiseos_live_mode');
    const gKey = localStorage.getItem('promiseos_gemini_key') || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
    const rKey = localStorage.getItem('promiseos_resend_key') || process.env.NEXT_PUBLIC_RESEND_API_KEY || '';
    const fConfig = localStorage.getItem('promiseos_firebase_config') || process.env.NEXT_PUBLIC_FIREBASE_CONFIG || '';

    setIsLiveModeState(liveMode ? JSON.parse(liveMode) : (gKey || rKey || fConfig ? true : false));
    setGeminiKeyState(gKey);
    setResendKeyState(rKey);
    setFirebaseConfigState(fConfig);
  }, []);

  // 2. Load data based on Live Mode & Firebase status
  const loadData = useCallback(async () => {
    let firebaseActive = false;
    if (isLiveMode && firebaseConfig) {
      firebaseActive = initFirebase(firebaseConfig);
    }

    if (isLiveMode && firebaseActive && isFirebaseReady()) {
      const dbCommitments = await getCommitmentsDb();
      const dbMeetings = await getMeetingsDb();
      const dbNotifs = await getNotificationsDb();
      
      setCommitments(dbCommitments);
      setMeetings(dbMeetings);
      setNotifications(dbNotifs);
    } else {
      // Fallback to localStorage data or demo defaults if empty
      const localCommitments = await getCommitmentsDb();
      const localMeetings = await getMeetingsDb();
      const localNotifs = await getNotificationsDb();

      if (localCommitments.length === 0 && localMeetings.length === 0) {
        // Hydrate local storage with demo data on first load
        localStorage.setItem('promiseos_commitments', JSON.stringify(DEMO_COMMITMENTS));
        localStorage.setItem('promiseos_meetings', JSON.stringify(DEMO_MEETINGS));
        localStorage.setItem('promiseos_notifications', JSON.stringify(DEMO_NOTIFICATIONS));
        setCommitments(DEMO_COMMITMENTS);
        setMeetings(DEMO_MEETINGS);
        setNotifications(DEMO_NOTIFICATIONS);
      } else {
        setCommitments(localCommitments);
        setMeetings(localMeetings);
        setNotifications(localNotifs);
      }
    }
  }, [isLiveMode, firebaseConfig]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats: AppStats = {
    activeCommitments: commitments.filter(c => !['completed'].includes(c.status)).length,
    dueToday: commitments.filter(c => {
      const today = new Date().toISOString().split('T')[0];
      return c.deadlineIso === today && c.status !== 'completed';
    }).length,
    overdue: commitments.filter(c => c.status === 'overdue').length,
    completedThisWeek: commitments.filter(c => {
      if (c.status !== 'completed' || !c.completedAt) return false;
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(c.completedAt) > weekAgo;
    }).length,
    totalMeetings: meetings.length,
    reliabilityAvg: members.length > 0 
      ? Math.round(members.reduce((acc, m) => acc + m.reliabilityScore, 0) / members.length)
      : 0,
  };

  const addCommitment = useCallback(async (c: Omit<Commitment, 'id' | 'createdAt'>) => {
    const newC: Commitment = {
      ...c,
      id: `c-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    
    // Save to Firestore or localStorage
    await saveCommitmentDb(newC);
    
    // Reload state from database
    const dbCommitments = await getCommitmentsDb();
    setCommitments(dbCommitments);
    showToast(`✅ Commitment added: "${c.task.slice(0, 40)}..."`);
  }, [showToast]);

  const updateCommitmentStatus = useCallback(async (id: string, status: CommitmentStatus) => {
    const updates = {
      status,
      completedAt: status === 'completed' ? new Date().toISOString() : undefined
    };

    await updateCommitmentDb(id, updates);
    const dbCommitments = await getCommitmentsDb();
    setCommitments(dbCommitments);

    if (status === 'completed') showToast('🎉 Commitment marked complete!');
  }, [showToast]);

  const deleteCommitment = useCallback(async (id: string) => {
    await deleteCommitmentDb(id);
    const dbCommitments = await getCommitmentsDb();
    setCommitments(dbCommitments);
    showToast('Commitment removed', 'info');
  }, [showToast]);

  const importCommitments = useCallback(async (items: ExtractedCommitment[], meetingId: string, meetingTitle: string) => {
    const newOnes: Commitment[] = items.map((item, i) => ({
      id: `c-import-${Date.now()}-${i}`,
      task: item.task,
      owner: item.owner,
      deadline: item.deadline,
      deadlineIso: item.deadlineIso,
      status: 'new' as CommitmentStatus,
      priority: 'medium' as const,
      meetingId,
      meetingTitle,
      createdAt: new Date().toISOString().split('T')[0],
      reminderSent: false,
      escalated: false,
    }));

    for (const c of newOnes) {
      await saveCommitmentDb(c);
    }
    
    const dbCommitments = await getCommitmentsDb();
    setCommitments(dbCommitments);
    showToast(`🚀 Imported ${items.length} commitment${items.length > 1 ? 's' : ''} from meeting`);
  }, [showToast]);

  const addMeeting = useCallback(async (m: Omit<Meeting, 'id' | 'uploadedAt'>) => {
    const newM: Meeting = {
      ...m,
      id: `m-${Date.now()}`,
      uploadedAt: new Date().toISOString().split('T')[0],
    };
    await saveMeetingDb(newM);
    const dbMeetings = await getMeetingsDb();
    setMeetings(dbMeetings);
  }, []);

  const sendSimulatedReminder = useCallback(async (commitmentId: string, recipientName: string) => {
    const c = commitments.find(x => x.id === commitmentId);
    if (!c) return;
    
    const subject = `🔔 Reminder: ${c.task.slice(0, 50)}`;
    const body = `Hi ${recipientName},\n\nYou committed to: "${c.task}" during our meeting.\nDeadline: ${c.deadline}.\n\nPlease update your progress on PromiseOS.`;
    
    // Call Resend (calls proxy /api/send-email if API Key exists, or runs console simulation)
    const success = await sendEmailWithResend(resendKey, 'recipient@example.com', subject, body);

    if (success) {
      const notif: NotificationLog = {
        id: `n-${Date.now()}`,
        type: 'reminder',
        recipient: recipientName,
        subject,
        body,
        sentAt: new Date().toISOString(),
        commitmentId,
      };

      await saveNotificationDb(notif);
      await updateCommitmentDb(commitmentId, { reminderSent: true });

      const dbCommitments = await getCommitmentsDb();
      const dbNotifs = await getNotificationsDb();
      setCommitments(dbCommitments);
      setNotifications(dbNotifs);

      showToast(`📧 Reminder sent to ${recipientName} (${resendKey ? 'Live API' : 'Simulated'})`);
    } else {
      showToast('❌ Failed to send email reminder', 'error');
    }
  }, [commitments, resendKey, showToast]);

  // AI Extraction parsing (calls real Gemini API if key exists, or simulated parser)
  const triggerSimulatedExtraction = useCallback(async (transcript: string, _title: string): Promise<ExtractedCommitment[]> => {
    return extractCommitmentsWithGemini(transcript, geminiKey);
  }, [geminiKey]);

  return (
    <AppContext.Provider value={{
      isLiveMode, setLiveMode,
      geminiKey, setGeminiKey,
      resendKey, setResendKey,
      firebaseConfig, setFirebaseConfig,
      commitments, meetings, members, organization, notifications, stats,
      currentUser, setCurrentUser,
      addCommitment, updateCommitmentStatus, deleteCommitment,
      importCommitments, addMeeting,
      sendSimulatedReminder, triggerSimulatedExtraction,
      toast, showToast,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import ConsentOnboarding from '@/components/ConsentOnboarding';
import { useApp } from '@/contexts/AppContext';
import {
  Mail, Calendar, CheckSquare, ShieldAlert, CreditCard,
  Truck, Search, RefreshCw, AlertTriangle, CheckCircle,
  Eye, Clock, Sparkles, Filter, Trash2, ArrowUpRight,
  Send, Bot, User as UserIcon, Plus, X, BarChart3, TrendingUp,
  ThumbsUp, ThumbsDown, Luggage, Layers, Video, PlusCircle, Copy,
  Award, ShieldCheck, Newspaper, Play, Pause, Network, Volume2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MockEmail } from '@/lib/mock_emails';
import { createClient } from '@/utils/supabase/client';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip
} from 'recharts';

const statusColors: Record<string, string> = {
  'Finance / bills': '#f43f5e',
  'Job and career': '#3b82f6',
  'Meetings and calendar events': '#7c3aed',
  'Purchases and orders': '#10b981',
  'Travel': '#06b6d4',
  'Subscriptions': '#a855f7',
  'Personal communication': '#f59e0b',
  'Promotions and spam': '#6b7280',
  'Tasks and action items': '#ec4899',
  'Deadlines and reminders': '#ef4444',
};

const urgencyColors: Record<string, string> = {
  'High': '#ef4444',
  'Medium': '#f59e0b',
  'Low': '#10b981',
};

interface RelationshipBundle {
  id: string;
  type: 'Trip' | 'Job Application' | 'Purchase' | 'Billing Cycle';
  title: string;
  subtitle: string;
  icon: any;
  items: { label: string; date: string; status: 'completed' | 'pending'; emailSource: any }[];
  date: string;
}

export default function DashboardPage() {
  const { user, showToast } = useApp();
  const [consents, setConsents] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [emails, setEmails] = useState<MockEmail[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMockData, setIsMockData] = useState(false);
  const [activeScheduleTab, setActiveScheduleTab] = useState<'meetings' | 'deadlines'>('meetings');
  const [activeView, setActiveView] = useState<'command-center' | 'knowledge-graph' | 'escalation-runway'>('command-center');
  const [isPlayingBrief, setIsPlayingBrief] = useState(false);
  
  // Interactive Command Persona State
  const [persona, setPersona] = useState<'Executive Minimalist' | 'The Motivator' | 'The Auditor'>('Executive Minimalist');

  // One-Click Reply Draft State
  const [draftText, setDraftText] = useState('');
  const [draftLoading, setDraftLoading] = useState(false);

  // Preference weights for dynamic learning feedback loop (resolving Issue: MVP Preference Learning)
  const [preferences, setPreferences] = useState<Record<string, number>>({});

  // Interactive States
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});
  
  // User Feedback and Learning Loop State
  const [feedbacks, setFeedbacks] = useState<Record<string, 'approved' | 'rejected'>>({});

  // Chatbot Assistant States
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string }>>([
    { sender: 'bot', text: 'Hi! I am your PromiseOS Personal AI Assistant. Ask me anything about your tasks, bills, deliveries, or schedule.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load consents and feedback on mount
  useEffect(() => {
    const stored = localStorage.getItem('promiseos_email_consents');
    if (stored) setConsents(JSON.parse(stored));

    const storedFeedback = localStorage.getItem('promiseos_user_feedback');
    if (storedFeedback) setFeedbacks(JSON.parse(storedFeedback));

    const storedPersona = localStorage.getItem('promiseos_active_persona');
    if (storedPersona) setPersona(storedPersona as any);

    const storedPrefs = localStorage.getItem('promiseos_user_preferences');
    if (storedPrefs) setPreferences(JSON.parse(storedPrefs));
  }, []);

  const handleAcceptConsents = (newConsents: any) => {
    localStorage.setItem('promiseos_email_consents', JSON.stringify(newConsents));
    setConsents(newConsents);
    showToast('🔒 Privacy configurations saved.', 'success');
  };

  const handleResetConsents = () => {
    localStorage.removeItem('promiseos_email_consents');
    setConsents(null);
    setEmails([]);
    setSelectedItem(null);
    setFeedbacks({});
    setPreferences({});
    localStorage.removeItem('promiseos_user_feedback');
    localStorage.removeItem('promiseos_user_preferences');
    showToast('🔒 Connection settings reset.', 'info');
  };

  const syncEmails = useCallback(async () => {
    if (!consents) return;
    setLoading(true);
    try {
      const response = await fetch('/api/sync-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          googleAccessToken: null, // Simulated token for demo/fallback
          consents,
        }),
      });

      const data = await response.json();
      if (data.success && data.emails) {
        setEmails(data.emails);
        if (data.source === 'mock') {
          setIsMockData(true);
          showToast(`📊 Loaded mock sandbox data. Gmail connection needed.`, 'info');
        } else {
          setIsMockData(false);
          showToast(`📊 Synchronized and analyzed ${data.emails.length} emails.`, 'success');
        }
      } else {
        throw new Error(data.error || 'Failed sync');
      }
    } catch (err) {
      console.error(err);
      setIsMockData(true);
      showToast('⚠️ Sync failed. Loaded mock intelligence dashboard.', 'error');
    } finally {
      setLoading(false);
    }
  }, [consents, user, showToast]);

  const handleGoogleLogin = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/gmail.readonly',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw error;
    } catch (err: any) {
      showToast('⚠️ Google auth failed: ' + err.message, 'error');
    }
  };

  const handleToggleVoiceBrief = () => {
    if (typeof window === 'undefined') return;

    if (isPlayingBrief) {
      window.speechSynthesis.cancel();
      setIsPlayingBrief(false);
      showToast('🔇 Voice briefing stopped.', 'info');
    } else {
      const briefText = getHeroBriefingText();
      const utterance = new SpeechSynthesisUtterance(briefText);
      
      if (persona === 'The Motivator') {
        utterance.pitch = 1.25;
        utterance.rate = 1.1;
      } else if (persona === 'The Auditor') {
        utterance.pitch = 0.85;
        utterance.rate = 0.95;
      } else {
        utterance.pitch = 1.0;
        utterance.rate = 1.0;
      }

      utterance.onend = () => {
        setIsPlayingBrief(false);
      };
      utterance.onerror = () => {
        setIsPlayingBrief(false);
      };

      setIsPlayingBrief(true);
      window.speechSynthesis.speak(utterance);
      showToast('🔊 Playing synthesized AI voice briefing...', 'success');
    }
  };

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (consents) {
      syncEmails();
    }
  }, [consents, syncEmails]);

  // Scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Chat Submission Handler
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput;
    setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userText,
          emails, 
          persona, 
        }),
      });

      const data = await response.json();
      if (data.response) {
        setChatMessages(prev => [...prev, { sender: 'bot', text: data.response }]);
      } else {
        throw new Error(data.error || 'Failed memory vault retrieval');
      }
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { sender: 'bot', text: 'Failed to access Memory Vault.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Feature 1: One-Click AI Reply Draft handler
  const handleGenerateDraft = async (subject: string, body: string, isCompleted: boolean) => {
    setDraftLoading(true);
    setDraftText('');
    try {
      const response = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          body,
          taskStatus: isCompleted ? 'completed' : 'pending',
          persona
        })
      });

      const data = await response.json();
      if (data.draft) {
        setDraftText(data.draft);
        showToast('✉️ AI Response Draft generated!', 'success');
      } else {
        throw new Error(data.error || 'Draft generation failed');
      }
    } catch (err) {
      console.error(err);
      showToast('⚠️ Could not generate draft.', 'error');
    } finally {
      setDraftLoading(false);
    }
  };

  // Feedback Learning Loop triggers (resolving Preference Learning weight shifts)
  const handleFeedback = (emailId: string, action: 'approved' | 'rejected') => {
    const emailItem = emails.find(e => e.id === emailId);
    if (emailItem) {
      const category = emailItem.insights.category;
      const currentWeight = preferences[category] ?? 1.0;
      
      let newWeight = currentWeight;
      if (action === 'approved') {
        newWeight = Math.min(1.5, currentWeight + 0.1);
      } else {
        newWeight = Math.max(0.1, currentWeight - 0.2);
      }
      
      const updatedPrefs = { ...preferences, [category]: parseFloat(newWeight.toFixed(2)) };
      setPreferences(updatedPrefs);
      localStorage.setItem('promiseos_user_preferences', JSON.stringify(updatedPrefs));
    }

    const updatedFeedback = { ...feedbacks, [emailId]: action };
    setFeedbacks(updatedFeedback);
    localStorage.setItem('promiseos_user_feedback', JSON.stringify(updatedFeedback));
    showToast(action === 'approved' ? '✅ Weight boosted. Insight approved.' : '❌ Weight reduced. Insight rejected.', 'info');
  };

  // 1. Process Confidence Gating & Dynamic Preference Weights
  const processedEmails = emails.map(email => {
    const category = email.insights.category;
    const weight = preferences[category] ?? 1.0;
    
    // Scale priority score dynamically by preference weight (resolving MVP Preference Learning)
    const adjustedInsights = {
      ...email.insights,
      priorityScore: Math.min(100, Math.round(email.insights.priorityScore * weight))
    };
    
    if (weight < 0.4) {
      adjustedInsights.urgency = 'Low';
    }

    return {
      ...email,
      insights: adjustedInsights
    };
  }).filter(email => {
    const feedback = feedbacks[email.id];
    if (feedback === 'rejected') return false;

    const categoryConf = email.insights.categoryConfidence ?? 0.9;
    const taskConf = email.insights.taskConfidence ?? 0.9;
    const deadlineConf = email.insights.deadlineConfidence ?? 0.9;
    const financialConf = email.insights.financialsConfidence ?? 0.9;
    const trackingConf = email.insights.trackingConfidence ?? 0.9;
    
    const confidence = (categoryConf + taskConf + deadlineConf + financialConf + trackingConf) / 5;
    
    if (confidence < 0.5) return false;
    return true;
  });

  const suggestedInsights = processedEmails.filter(email => !feedbacks[email.id]);

  // 2. Intelligent AI Relationship Mapping
  const detectRelationships = (emailsList: MockEmail[]): RelationshipBundle[] => {
    const bundles: RelationshipBundle[] = [];
    const getEntityVendor = (subject: string, from: string) => {
      const text = (subject + ' ' + from).toLowerCase();
      if (text.includes('vercel')) return 'Vercel';
      if (text.includes('anthropic') || text.includes('claude')) return 'Anthropic';
      if (text.includes('amazon')) return 'Amazon';
      if (text.includes('delta')) return 'Delta Air Lines';
      if (text.includes('agency') || text.includes('apex')) return 'Apex Digital Agency';
      return null;
    };

    const groups: Record<string, MockEmail[]> = {};
    emailsList.forEach(email => {
      const vendor = getEntityVendor(email.subject, email.fromAddress);
      if (vendor) {
        if (!groups[vendor]) groups[vendor] = [];
        groups[vendor].push(email);
      }
    });

    Object.entries(groups).forEach(([vendor, items]) => {
      if (items.length >= 1) {
        if (vendor === 'Delta Air Lines' || items.some(e => e.insights.category === 'Travel')) {
          bundles.push({
            id: `trip-${vendor}`,
            type: 'Trip',
            title: `Trip to New York (${vendor})`,
            subtitle: 'Unified travel tickets & stays',
            icon: Luggage,
            date: items[0].insights.dates?.[0]?.date || '2026-07-10',
            items: items.map(e => ({
              label: e.subject,
              date: e.insights.dates?.[0]?.date || 'TBD',
              status: e.insights.category === 'Travel' ? 'completed' : 'pending',
              emailSource: e
            }))
          });
        } else if (vendor === 'Apex Digital Agency' || items.some(e => e.insights.category === 'Job and career')) {
          bundles.push({
            id: `job-${vendor}`,
            type: 'Job Application',
            title: `Recruitment at ${vendor}`,
            subtitle: 'Career application status tracker',
            icon: UserIcon,
            date: items[0].insights.dates?.[0]?.date || '2026-07-02',
            items: items.map(e => ({
              label: e.subject,
              date: e.insights.dates?.[0]?.date || 'TBD',
              status: e.insights.category === 'Meetings and calendar events' ? 'completed' : 'pending',
              emailSource: e
            }))
          });
        } else if (vendor === 'Amazon' || items.some(e => e.insights.category === 'Purchases and orders')) {
          bundles.push({
            id: `purchase-${vendor}`,
            type: 'Purchase',
            title: `Amazon Order Tracker`,
            subtitle: 'Receipt confirmation & delivery progress',
            icon: Truck,
            date: items[0].insights.dates?.[0]?.date || '2026-07-01',
            items: items.map(e => ({
              label: e.subject,
              date: e.insights.dates?.[0]?.date || 'TBD',
              status: e.insights.tracking?.status === 'In Transit' || e.insights.tracking?.status === 'Delivered' ? 'completed' : 'pending',
              emailSource: e
            }))
          });
        } else if (vendor === 'Vercel' || vendor === 'Anthropic') {
          bundles.push({
            id: `billing-${vendor}`,
            type: 'Billing Cycle',
            title: `${vendor} Cloud Billing`,
            subtitle: 'Ongoing subscription renewal updates',
            icon: CreditCard,
            date: items[0].insights.dates?.[0]?.date || '2026-07-05',
            items: items.map(e => ({
              label: e.subject,
              date: e.insights.dates?.[0]?.date || 'TBD',
              status: e.insights.financials?.alert ? 'pending' : 'completed',
              emailSource: e
            }))
          });
        }
      }
    });

    return bundles;
  };

  const activityBundles = detectRelationships(processedEmails);

  // Filtered lists of confirmed items
  const confirmedTasks = processedEmails.flatMap(e => (e.insights.tasks || []).map(t => ({ ...t, emailSource: e })));
  const confirmedDates = processedEmails.flatMap(e => (e.insights.dates || []).map(d => ({ ...d, emailSource: e })));
  const confirmedBills = processedEmails.filter(e => e.insights.financials?.alert).map(e => ({ ...e.insights.financials, emailSource: e }));
  const confirmedTrackings = processedEmails.filter(e => e.insights.tracking?.trackingNumber).map(e => ({ ...e.insights.tracking, emailSource: e }));
  
  // Upgraded Meeting Parser
  const confirmedMeetings = processedEmails.filter(e => e.insights.category === 'Meetings and calendar events').map(e => ({
    title: e.subject,
    date: e.insights.dates?.[0]?.date || 'TBD',
    time: e.insights.meeting?.time || 'TBD',
    joinLink: e.insights.meeting?.joinLink,
    venue: e.insights.meeting?.venue || 'Google Meet',
    summary: e.insights.summary,
    emailSource: e
  }));

  const confirmedSubscriptions = processedEmails.filter(e => e.insights.subscription?.name).map(e => ({ ...e.insights.subscription, emailSource: e }));

  // Novel Feature: Intent-based Widget Mapping lists
  const confirmedOpportunities = processedEmails.filter(e => e.insights.intent === 'Opportunity');
  const confirmedSecurityAlerts = processedEmails.filter(e => e.insights.intent === 'Security Alert');
  const confirmedUpdatesFeed = processedEmails.filter(e => e.insights.intent === 'Informational' || e.insights.intent === 'Financial Notice' || e.insights.intent === 'Reference Information');
  const confirmedPersonalInsights = processedEmails.filter(e => e.insights.intent === 'Personal Communication');

  // Search Filter across confirmed items
  const matchesSearch = (text: string) => text.toLowerCase().includes(searchQuery.toLowerCase());
  
  const filteredTasks = confirmedTasks.filter(t => matchesSearch(t.task) && !completedTasks[t.task]);
  const filteredDeadlines = confirmedDates.filter(d => matchesSearch(d.label));
  const filteredBills = confirmedBills.filter(b => matchesSearch(b.biller || ''));
  const filteredTrackings = confirmedTrackings.filter(t => matchesSearch(t.provider || '') || matchesSearch(t.trackingNumber || ''));

  // Google Calendar URL Generator Helper
  const getGoogleCalendarLink = (title: string, date: string, time: string, joinLink?: string) => {
    const cleanDate = date.replace(/-/g, '');
    const startDateTime = `${cleanDate}T090000Z`;
    const endDateTime = `${cleanDate}T100000Z`;
    const details = `Extracted automatically by PromiseOS.\nJoin Link: ${joinLink || 'Online'}`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startDateTime}/${endDateTime}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(joinLink || 'Online')}`;
  };

  // Novel Feature 4: Persona-driven Hero Brief Text
  const getHeroBriefingText = () => {
    const tasksCount = filteredTasks.length;
    const deadlinesCount = filteredDeadlines.length;
    const trackingCount = filteredTrackings.length;

    if (persona === 'The Motivator') {
      return `Let's crush it today, Charlie! 🚀 You have got ${tasksCount} action goals to conquer, ${deadlinesCount} deadlines to hit, and ${trackingCount} active delivery updates in transit. Let's make it happen!`;
    }
    if (persona === 'The Auditor') {
      return `System Status Audit: Reconciled ${emails.length} data streams. Found ${tasksCount} pending task risks requiring attention, ${deadlinesCount} upcoming deadlines, and ${trackingCount} courier cargo items. Financial indicators are verified.`;
    }
    return `Charlie, you have ${tasksCount} pending tasks, ${deadlinesCount} deadlines this week, and ${trackingCount} package delivery arriving soon.`;
  };

  // Persona Dropdown Change Handler
  const handlePersonaChange = (val: typeof persona) => {
    setPersona(val);
    localStorage.setItem('promiseos_active_persona', val);
    showToast(`🎭 Persona updated to ${val}`, 'info');
  };

  // Analytics Chart Data
  const chartData = [
    { name: 'Mon', Synced: 2, Tasks: 1 },
    { name: 'Tue', Synced: 5, Tasks: 3 },
    { name: 'Wed', Synced: 3, Tasks: 2 },
    { name: 'Thu', Synced: 8, Tasks: 4 },
    { name: 'Fri', Synced: 4, Tasks: 1 },
    { name: 'Sat', Synced: 1, Tasks: 0 },
    { name: 'Sun', Synced: 2, Tasks: 1 },
  ];

  if (!consents) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#080d1a', alignItems: 'center', justifyContent: 'center', color: '#f0f6ff' }}>
        <ConsentOnboarding onAccept={handleAcceptConsents} onCancel={() => showToast('🔒 Sync disabled by user.', 'info')} />
      </div>
    );
  }

  return (
    <div>
      <Sidebar />
      <main className="main-content" style={{ padding: '24px 32px' }}>
        
        {/* Top Navigation */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.01)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          paddingBottom: 20, marginBottom: 24
        }}>
          {/* Intelligent Search */}
          <div style={{ position: 'relative', width: 340 }}>
            <Search size={15} color="#4a5a7a" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              className="input-field"
              type="text"
              placeholder="Search tasks, bills, order tracking..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 38, fontSize: '0.85rem', borderRadius: 12, background: 'rgba(255,255,255,0.02)' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Novel Feature 4: Dynamic Persona Selection */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.72rem', color: '#8899bb' }}>AI Persona:</span>
              <select
                value={persona}
                onChange={e => handlePersonaChange(e.target.value as any)}
                style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10, padding: '6px 12px', fontSize: '0.78rem', color: '#f0f6ff',
                  outline: 'none', cursor: 'pointer'
                }}
              >
                <option value="Executive Minimalist" style={{ background: '#0d1424' }}>Executive Minimalist</option>
                <option value="The Motivator" style={{ background: '#0d1424' }}>The Motivator (Upbeat)</option>
                <option value="The Auditor" style={{ background: '#0d1424' }}>The Auditor (Formal)</option>
              </select>
            </div>

            <button
              onClick={() => {
                setChatMessages(prev => [...prev, { sender: 'bot', text: 'How can I assist you with your dashboard items?' }]);
                showToast('AI Assistant ready!', 'info');
              }}
              style={{
                background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)',
                borderRadius: 10, padding: '7px 14px', fontSize: '0.78rem', color: '#00d4ff',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
              }}
            >
              <Sparkles size={13} /> Ask Assistant
            </button>

            <button
              onClick={handleResetConsents}
              className="btn-secondary"
              style={{ fontSize: '0.78rem', borderRadius: 10, padding: '7px 14px' }}
            >
              Privacy Controls
            </button>

            <button
              onClick={syncEmails}
              disabled={loading}
              className="btn-primary"
              style={{ fontSize: '0.78rem', borderRadius: 10, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Processing...' : 'Sync Data'}
            </button>
          </div>
        </div>

        {/* Dashboard View Tabs */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 12 }}>
          <button
            onClick={() => setActiveView('command-center')}
            style={{
              background: activeView === 'command-center' ? 'rgba(0, 212, 255, 0.1)' : 'transparent',
              border: activeView === 'command-center' ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid transparent',
              borderRadius: 10, padding: '8px 16px', fontSize: '0.8rem', color: activeView === 'command-center' ? '#00d4ff' : '#8899bb',
              fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8
            }}
          >
            <Layers size={14} /> Command Center
          </button>
          
          <button
            onClick={() => setActiveView('knowledge-graph')}
            style={{
              background: activeView === 'knowledge-graph' ? 'rgba(0, 212, 255, 0.1)' : 'transparent',
              border: activeView === 'knowledge-graph' ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid transparent',
              borderRadius: 10, padding: '8px 16px', fontSize: '0.8rem', color: activeView === 'knowledge-graph' ? '#00d4ff' : '#8899bb',
              fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8
            }}
          >
            <Network size={14} /> Knowledge Graph
          </button>
          
          <button
            onClick={() => setActiveView('escalation-runway')}
            style={{
              background: activeView === 'escalation-runway' ? 'rgba(0, 212, 255, 0.1)' : 'transparent',
              border: activeView === 'escalation-runway' ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid transparent',
              borderRadius: 10, padding: '8px 16px', fontSize: '0.8rem', color: activeView === 'escalation-runway' ? '#00d4ff' : '#8899bb',
              fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8
            }}
          >
            <Clock size={14} /> Escalation & Runway
          </button>
        </div>

        {/* Connection Status Banner (Demo Mode vs Real Mode) */}
        {isMockData && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(245, 158, 11, 0.08) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 16, padding: '16px 24px', marginBottom: 24,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <AlertTriangle size={20} color="#ef4444" />
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f0f6ff' }}>Demo Sandbox (Mock Data) Active</div>
                <div style={{ fontSize: '0.78rem', color: '#8899bb', marginTop: 2 }}>
                  Your Google connection is missing or expired. Connect Gmail to sync your actual emails, hackathon deadlines, and commitments.
                </div>
              </div>
            </div>
            <button
              onClick={handleGoogleLogin}
              style={{
                background: 'linear-gradient(135deg, #ef4444, #f59e0b)',
                border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: '0.78rem', color: '#fff',
                fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
              }}
            >
              Connect Google Account
            </button>
          </motion.div>
        )}

        {/* Command Center: Hero & Suggestions */}
        {activeView === 'command-center' && (
          <>
            {/* Hero Section (AI Daily Briefing - Persona Customized) */}
            <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          style={{
            background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.06) 0%, rgba(124, 58, 237, 0.06) 100%)',
            border: '1px solid rgba(0, 212, 255, 0.15)',
            borderRadius: 20, padding: '24px 32px', marginBottom: 28,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <div style={{ maxWidth: '75%' }}>
            <style dangerouslySetInnerHTML={{ __html: `
              @keyframes bounce {
                0%, 100% { transform: scaleY(0.4); }
                50% { transform: scaleY(1.2); }
              }
              .audio-wave-bar {
                animation: bounce 0.8s ease-in-out infinite;
                transform-origin: bottom;
              }
              .audio-wave-bar:nth-child(2) { animation-delay: 0.15s; }
              .audio-wave-bar:nth-child(3) { animation-delay: 0.3s; }
              .audio-wave-bar:nth-child(4) { animation-delay: 0.45s; }
            ` }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', background: 'rgba(0, 212, 255, 0.12)', color: '#00d4ff', padding: '3px 10px', borderRadius: 99, fontWeight: 700 }}>
                AI DAILY BRIEFING ({persona.toUpperCase()})
              </span>
              
              <button
                onClick={handleToggleVoiceBrief}
                style={{
                  background: isPlayingBrief ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 212, 255, 0.12)',
                  border: isPlayingBrief ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(0, 212, 255, 0.25)',
                  borderRadius: 20, padding: '4px 12px', fontSize: '0.68rem', color: isPlayingBrief ? '#f43f5e' : '#00d4ff',
                  display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', transition: 'all 0.2s', outline: 'none'
                }}
              >
                {isPlayingBrief ? <Pause size={10} /> : <Play size={10} />}
                {isPlayingBrief ? 'Stop Briefing' : 'Listen to Briefing'}
              </button>

              {isPlayingBrief && (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 12, paddingBottom: 2 }}>
                  <span className="audio-wave-bar" style={{ width: 2, height: 6, background: '#00d4ff', borderRadius: 1 }} />
                  <span className="audio-wave-bar" style={{ width: 2, height: 12, background: '#00d4ff', borderRadius: 1 }} />
                  <span className="audio-wave-bar" style={{ width: 2, height: 8, background: '#00d4ff', borderRadius: 1 }} />
                  <span className="audio-wave-bar" style={{ width: 2, height: 4, background: '#00d4ff', borderRadius: 1 }} />
                </div>
              )}
            </div>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.4rem', color: '#f0f6ff', marginTop: 10, marginBottom: 8 }}>
              Good Morning, Charlie.
            </h2>
            <p style={{ color: '#8899bb', fontSize: '0.88rem', lineHeight: 1.6 }}>
              {getHeroBriefingText()}
            </p>
          </div>

          <div style={{ textAlign: 'center', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', padding: '16px 24px', borderRadius: 16 }}>
            <div style={{ fontSize: '0.72rem', color: '#8899bb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Productivity Score</div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#00d4ff', fontFamily: 'Outfit, sans-serif', margin: '4px 0' }}>88%</div>
            <div style={{ fontSize: '0.68rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
              <TrendingUp size={10} /> +3% learning feedback loop active
            </div>
          </div>
        </motion.div>

        {/* Suggested Insights - Confidence Review Gate */}
        <AnimatePresence>
          {suggestedInsights.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-card"
              style={{
                borderColor: 'rgba(245, 158, 11, 0.3)',
                background: 'rgba(245, 158, 11, 0.02)',
                padding: 20,
                marginBottom: 28,
                overflow: 'hidden'
              }}
            >
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <AlertTriangle size={15} /> AI Suggested Insights (Needs Confirmation)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {suggestedInsights.map((item) => (
                  <div key={item.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 10
                  }}>
                    <div style={{ fontSize: '0.8rem', color: '#f0f6ff' }}>
                      <strong>{item.insights.category}:</strong> {item.insights.summary}{' '}
                      <span style={{ color: '#f59e0b', fontSize: '0.72rem', marginLeft: 6 }}>(Confidence: {Math.round((item.insights.categoryConfidence || 0.8) * 100)}%)</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleFeedback(item.id, 'approved')}
                        style={{
                          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                          borderRadius: 6, padding: '4px 10px', color: '#10b981', fontSize: '0.72rem', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 4
                        }}
                      >
                        <ThumbsUp size={11} /> Approve
                      </button>
                      <button
                        onClick={() => handleFeedback(item.id, 'rejected')}
                        style={{
                          background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)',
                          borderRadius: 6, padding: '4px 10px', color: '#f43f5e', fontSize: '0.72rem', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 4
                        }}
                      >
                        <ThumbsDown size={11} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    )}

        {/* Dashboard Grid */}
        {activeView === 'command-center' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 20 }}>
          
          {/* 1. Task Center (Col Span: 8) */}
          <div className="glass-card" style={{ gridColumn: 'span 8', padding: 24, minHeight: 280 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: '#f0f6ff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckSquare size={16} color="#ec4899" /> Task Center
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#ec4899', background: 'rgba(236,72,153,0.1)', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                {filteredTasks.length} PENDING
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredTasks.length > 0 ? (
                filteredTasks.map((t, idx) => (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', justifyItems: 'center', justifySelf: 'stretch', justifyContent: 'space-between',
                    padding: '12px 16px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                      <input
                        type="checkbox"
                        checked={!!completedTasks[t.task]}
                        onChange={() => {
                          setCompletedTasks(prev => ({ ...prev, [t.task]: true }));
                          showToast('Task marked complete!', 'success');
                        }}
                        style={{ width: 15, height: 15, accentColor: '#ec4899', cursor: 'pointer' }}
                      />
                      <span
                        onClick={() => setSelectedItem(t.emailSource)}
                        style={{ fontSize: '0.85rem', color: '#f0f6ff', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {t.task}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 700, borderRadius: 6, padding: '2px 6px',
                        color: urgencyColors[t.emailSource.insights.urgency] || '#8899bb',
                        background: `${urgencyColors[t.emailSource.insights.urgency] || '#8899bb'}14`
                      }}>
                        {t.emailSource.insights.urgency}
                      </span>
                      <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '3px 8px', color: '#8899bb' }}>
                        Due {t.deadline}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: '#4a5a7a', fontSize: '0.8rem', textAlign: 'center', padding: '40px 0' }}>
                  No pending tasks extracted.
                </div>
              )}
            </div>
          </div>

          {/* 2. AI Chatbot Assistant */}
          <div className="glass-card" style={{ gridColumn: 'span 4', padding: 20, height: 320, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#00d4ff', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Bot size={16} /> AI Personal Assistant
            </h3>
            
            {/* Chat Messages */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4, marginBottom: 12 }}>
              {chatMessages.map((msg, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start'
                }}>
                  <div style={{
                    maxWidth: '85%',
                    padding: '8px 12px',
                    borderRadius: 12,
                    fontSize: '0.78rem',
                    lineHeight: 1.4,
                    background: msg.sender === 'user' ? '#7c3aed' : 'rgba(255,255,255,0.03)',
                    border: msg.sender === 'user' ? 'none' : '1px solid rgba(255,255,255,0.06)',
                    color: '#f0f6ff',
                    whiteSpace: 'pre-line'
                  }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#8899bb', fontSize: '0.72rem' }}>
                  <RefreshCw size={10} className="animate-spin" /> assistant is compiling...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChat} style={{ display: 'flex', gap: 8 }}>
              <input
                className="input-field"
                type="text"
                placeholder="Ask about bills, shipping, agenda..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                style={{ fontSize: '0.8rem', borderRadius: 8, background: 'rgba(255,255,255,0.02)' }}
              />
              <button type="submit" className="btn-primary" style={{ padding: '0 10px', borderRadius: 8 }}>
                <Send size={12} />
              </button>
            </form>
          </div>

          {/* 3. AI-Powered Relationship Detection Widget */}
          <div className="glass-card" style={{ gridColumn: 'span 12', padding: 24 }}>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: '#f0f6ff', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={16} color="#06b6d4" /> Activity Bundles (Relationship Tracking)
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {activityBundles.length > 0 ? (
                activityBundles.map((bundle) => {
                  const Icon = bundle.icon;
                  return (
                    <div key={bundle.id} style={{
                      padding: 16, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12,
                      display: 'flex', flexDirection: 'column', gap: 12
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(6, 182, 212, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#06b6d4' }}>
                          <Icon size={16} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f0f6ff' }}>{bundle.title}</div>
                          <div style={{ fontSize: '0.7rem', color: '#8899bb', marginTop: 2 }}>{bundle.subtitle}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 10 }}>
                        {bundle.items.map((item, idx) => (
                          <div key={idx} onClick={() => setSelectedItem(item.emailSource)} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', cursor: 'pointer'
                          }}>
                            <span style={{ color: '#8899bb', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                              {item.status === 'completed' ? '✓ ' : '• '}{item.label}
                            </span>
                            <span style={{
                              color: item.status === 'completed' ? '#10b981' : '#f59e0b',
                              background: item.status === 'completed' ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
                              padding: '2px 6px', borderRadius: 4, fontWeight: 700
                            }}>
                              {item.status === 'completed' ? 'Confirmed' : 'Pending'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ gridColumn: 'span 3', color: '#4a5a7a', fontSize: '0.8rem', textAlign: 'center', padding: '20px 0' }}>
                  No active entity relationship bundles detected.
                </div>
              )}
            </div>
          </div>

          {/* Dynamic Intelligence Section */}
          {/* 4. Opportunity Center */}
          <div className="glass-card" style={{ gridColumn: 'span 3', padding: 20, minHeight: 220 }}>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#f0f6ff', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Award size={16} color="#3b82f6" /> Opportunity Center
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {confirmedOpportunities.length > 0 ? (
                confirmedOpportunities.map((op, idx) => (
                  <div key={idx} onClick={() => setSelectedItem(op)} style={{
                    padding: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 10, cursor: 'pointer'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f0f6ff', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {op.subject}
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleFeedback(op.id, 'rejected'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a5a7a', padding: 2 }}>
                        <X size={11} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                      {op.insights.dynamic_tags?.map((tag, i) => (
                        <span key={i} style={{ fontSize: '0.62rem', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', padding: '2px 6px', borderRadius: 4 }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#8899bb', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                      <span>Importance: {op.insights.importance || 50}%</span>
                      <span>{new Date(op.dateSent).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: '#4a5a7a', fontSize: '0.78rem', textAlign: 'center', padding: '20px 0' }}>No active opportunities.</div>
              )}
            </div>
          </div>

          {/* 5. Security Center */}
          <div className="glass-card" style={{ gridColumn: 'span 3', padding: 20, minHeight: 220 }}>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#f0f6ff', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={16} color="#ef4444" /> Security Alerts
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {confirmedSecurityAlerts.length > 0 ? (
                confirmedSecurityAlerts.map((sec, idx) => (
                  <div key={idx} onClick={() => setSelectedItem(sec)} style={{
                    padding: 12, background: 'rgba(239,68,68,0.02)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: 10, cursor: 'pointer'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#ef4444', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {sec.subject}
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleFeedback(sec.id, 'rejected'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a5a7a', padding: 2 }}>
                        <X size={11} />
                      </button>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: '#8899bb', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sec.snippet}</p>
                    <div style={{ fontSize: '0.68rem', color: '#8899bb', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                      <span>Score: {sec.insights.importance || 80}%</span>
                      <span>{new Date(sec.dateSent).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: '#4a5a7a', fontSize: '0.78rem', textAlign: 'center', padding: '20px 0' }}>No security alerts.</div>
              )}
            </div>
          </div>

          {/* 6. Updates Feed */}
          <div className="glass-card" style={{ gridColumn: 'span 3', padding: 20, minHeight: 220 }}>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#f0f6ff', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Newspaper size={16} color="#10b981" /> Updates Feed
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {confirmedUpdatesFeed.length > 0 ? (
                confirmedUpdatesFeed.map((upd, idx) => (
                  <div key={idx} onClick={() => setSelectedItem(upd)} style={{
                    padding: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 10, cursor: 'pointer'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f0f6ff', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {upd.subject}
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleFeedback(upd.id, 'rejected'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a5a7a', padding: 2 }}>
                        <X size={11} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                      {upd.insights.dynamic_tags?.map((tag, i) => (
                        <span key={i} style={{ fontSize: '0.62rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '2px 6px', borderRadius: 4 }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#8899bb', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                      <span>Importance: {upd.insights.importance || 50}%</span>
                      <span>{new Date(upd.dateSent).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: '#4a5a7a', fontSize: '0.78rem', textAlign: 'center', padding: '20px 0' }}>No updates logged.</div>
              )}
            </div>
          </div>

          {/* 7. Personal Insights Panel */}
          <div className="glass-card" style={{ gridColumn: 'span 3', padding: 20, minHeight: 220 }}>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#f0f6ff', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <UserIcon size={16} color="#f59e0b" /> Personal Insights
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {confirmedPersonalInsights.length > 0 ? (
                confirmedPersonalInsights.map((pers, idx) => (
                  <div key={idx} onClick={() => setSelectedItem(pers)} style={{
                    padding: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 10, cursor: 'pointer'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f0f6ff', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {pers.subject}
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleFeedback(pers.id, 'rejected'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a5a7a', padding: 2 }}>
                        <X size={11} />
                      </button>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: '#8899bb', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pers.snippet}</p>
                    <div style={{ fontSize: '0.68rem', color: '#8899bb', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                      <span>Importance: {pers.insights.importance || 50}%</span>
                      <span>{new Date(pers.dateSent).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: '#4a5a7a', fontSize: '0.78rem', textAlign: 'center', padding: '20px 0' }}>No personal updates.</div>
              )}
            </div>
          </div>

          {/* 7. Orders & Shipment (Col Span: 4) */}
          <div className="glass-card" style={{ gridColumn: 'span 4', padding: 20 }}>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#f0f6ff', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Truck size={16} color="#10b981" /> Order tracking
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredTrackings.length > 0 ? (
                filteredTrackings.map((track, idx) => (
                  <div key={idx} onClick={() => setSelectedItem(track.emailSource)} style={{
                    padding: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 10, cursor: 'pointer'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, color: '#f0f6ff' }}>
                      <span>{track.provider} Cargo</span>
                      <span style={{ color: '#10b981' }}>{track.status}</span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#8899bb', marginTop: 4 }}>ID: {track.trackingNumber}</div>
                    
                    {/* Progress Bar */}
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
                      <div style={{ width: '70%', height: '100%', background: '#10b981' }} />
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: '#4a5a7a', fontSize: '0.78rem', textAlign: 'center' }}>No shipments tracked.</div>
              )}
            </div>
          </div>

          {/* 8. Finance Center (Col Span: 4) */}
          <div className="glass-card" style={{ gridColumn: 'span 4', padding: 20 }}>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#f0f6ff', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CreditCard size={16} color="#f43f5e" /> Finance Center
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredBills.length > 0 ? (
                filteredBills.map((bill, idx) => (
                  <div key={idx} onClick={() => setSelectedItem(bill.emailSource)} style={{
                    padding: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 10,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f0f6ff' }}>{bill.biller} Bill</div>
                      <div style={{ fontSize: '0.68rem', color: '#8899bb', marginTop: 4 }}>Due: {bill.dueDate}</div>
                    </div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f43f5e' }}>{bill.amount}</span>
                  </div>
                ))
              ) : (
                <div style={{ color: '#4a5a7a', fontSize: '0.78rem', textAlign: 'center' }}>No billing items found.</div>
              )}
            </div>
          </div>

          {/* 9. Schedule & Agenda */}
          <div className="glass-card" style={{ gridColumn: 'span 4', padding: 20, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#f0f6ff', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={16} color="#7c3aed" /> Schedule & Deadlines
              </h3>
              
              {/* Tab Selector */}
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 2 }}>
                <button
                  onClick={() => setActiveScheduleTab('meetings')}
                  style={{
                    border: 'none', background: activeScheduleTab === 'meetings' ? 'rgba(124, 58, 237, 0.15)' : 'none',
                    color: activeScheduleTab === 'meetings' ? '#a855f7' : '#8899bb',
                    borderRadius: 6, padding: '2px 8px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  Meetings
                </button>
                <button
                  onClick={() => setActiveScheduleTab('deadlines')}
                  style={{
                    border: 'none', background: activeScheduleTab === 'deadlines' ? 'rgba(124, 58, 237, 0.15)' : 'none',
                    color: activeScheduleTab === 'deadlines' ? '#a855f7' : '#8899bb',
                    borderRadius: 6, padding: '2px 8px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  Deadlines
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowY: 'auto', maxHeight: 180 }}>
              {activeScheduleTab === 'meetings' ? (
                confirmedMeetings.length > 0 ? (
                  confirmedMeetings.slice(0, 3).map((meet, idx) => (
                    <div key={idx} style={{
                      padding: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 10,
                      display: 'flex', flexDirection: 'column', gap: 10
                    }}>
                      <div onClick={() => setSelectedItem(meet.emailSource)} style={{ cursor: 'pointer' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f0f6ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {meet.title}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#8899bb', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                          <span>Date: {meet.date}</span>
                          <span style={{ color: '#7c3aed' }}>{meet.time}</span>
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#4a5a7a', marginTop: 2 }}>Platform: {meet.venue}</div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 8 }}>
                        {meet.joinLink && (
                          <a
                            href={meet.joinLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              flex: 1, textDecoration: 'none', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)',
                              borderRadius: 6, padding: '4px 0', fontSize: '0.68rem', color: '#00d4ff', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                            }}
                          >
                            <Video size={10} /> Join Meeting
                          </a>
                        )}
                        <a
                          href={getGoogleCalendarLink(meet.title, meet.date, meet.time, meet.joinLink)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            flex: 1, textDecoration: 'none', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: 6, padding: '4px 0', fontSize: '0.68rem', color: '#f0f6ff', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                          }}
                        >
                          <PlusCircle size={10} /> Calendar
                        </a>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ color: '#4a5a7a', fontSize: '0.78rem', textAlign: 'center', padding: '20px 0' }}>No meetings scheduled.</div>
                )
              ) : (
                filteredDeadlines.length > 0 ? (
                  filteredDeadlines.map((deadline, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedItem(deadline.emailSource)}
                      style={{
                        padding: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 10,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer'
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1, marginRight: 8 }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f0f6ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {deadline.label}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#8899bb', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          From: {deadline.emailSource.subject}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.7rem', background: 'rgba(124, 58, 237, 0.12)', border: '1px solid rgba(124, 58, 237, 0.2)', borderRadius: 6, padding: '3px 8px', color: '#a855f7', whiteSpace: 'nowrap' }}>
                        {deadline.date}
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ color: '#4a5a7a', fontSize: '0.78rem', textAlign: 'center', padding: '20px 0' }}>No deadlines extracted.</div>
                )
              )}
            </div>
          </div>

          {/* 10. Subscriptions Tracker (Col Span: 4) */}
          <div className="glass-card" style={{ gridColumn: 'span 4', padding: 20 }}>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#f0f6ff', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <RefreshCw size={16} color="#a855f7" /> Subscriptions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {confirmedSubscriptions.slice(0, 3).map((sub, idx) => (
                <div key={idx} onClick={() => setSelectedItem(sub.emailSource)} style={{
                  padding: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 10,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer'
                }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f0f6ff' }}>{sub.name}</div>
                    <div style={{ fontSize: '0.68rem', color: '#8899bb', marginTop: 4 }}>Cost: {sub.cost}</div>
                  </div>
                  <span style={{ fontSize: '0.68rem', background: 'rgba(168,85,247,0.1)', padding: '2px 8px', borderRadius: 4, color: '#a855f7', fontWeight: 700 }}>
                    Active
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 11. Analytics & Trends (Col Span: 4) */}
          <div className="glass-card" style={{ gridColumn: 'span 4', padding: 20, height: 260 }}>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#f0f6ff', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <BarChart3 size={16} color="#00d4ff" /> Sync Analytics
            </h3>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSynced" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8899bb' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#8899bb' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#0d1424', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11 }} />
                <Area type="monotone" dataKey="Synced" stroke="#00d4ff" strokeWidth={2} fillOpacity={1} fill="url(#colorSynced)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* 12. AI Priority Tuning (Col Span: 4) */}
          <div className="glass-card" style={{ gridColumn: 'span 4', padding: 20, height: 260, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#f0f6ff', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={16} color="#00d4ff" /> AI Priority Tuning
              </h3>
              <button
                onClick={() => {
                  setPreferences({});
                  localStorage.removeItem('promiseos_user_preferences');
                  showToast('⚙️ Preference weights reset to defaults.', 'info');
                }}
                style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 6, padding: '2px 8px', fontSize: '0.65rem', color: '#8899bb', cursor: 'pointer'
                }}
              >
                Reset
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
              {Object.keys(statusColors).map((category) => {
                const weight = preferences[category] ?? 1.0;
                return (
                  <div key={category} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 10px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 8
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColors[category] }} />
                      <span style={{ fontSize: '0.72rem', color: '#8899bb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {category}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: weight > 1.0 ? '#10b981' : weight < 1.0 ? '#f43f5e' : '#8899bb', minWidth: 32, textAlign: 'right' }}>
                        {weight.toFixed(1)}x
                      </span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => {
                            const newWeight = Math.max(0.1, parseFloat((weight - 0.1).toFixed(2)));
                            const updated = { ...preferences, [category]: newWeight };
                            setPreferences(updated);
                            localStorage.setItem('promiseos_user_preferences', JSON.stringify(updated));
                          }}
                          style={{
                            width: 20, height: 20, borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)',
                            background: 'rgba(255,255,255,0.02)', color: '#f0f6ff', fontSize: '0.7rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                          }}
                        >
                          -
                        </button>
                        <button
                          onClick={() => {
                            const newWeight = Math.min(1.5, parseFloat((weight + 0.1).toFixed(2)));
                            const updated = { ...preferences, [category]: newWeight };
                            setPreferences(updated);
                            localStorage.setItem('promiseos_user_preferences', JSON.stringify(updated));
                          }}
                          style={{
                            width: 20, height: 20, borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)',
                            background: 'rgba(255,255,255,0.02)', color: '#f0f6ff', fontSize: '0.7rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
        )}

        {/* Knowledge Graph View */}
        {activeView === 'knowledge-graph' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card"
            style={{ padding: 28, minHeight: 600, display: 'flex', flexDirection: 'column', gap: 20 }}
          >
            <div>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.3rem', color: '#f0f6ff' }}>
                Entity Relationship Neural Graph
              </h2>
              <p style={{ color: '#8899bb', fontSize: '0.8rem', marginTop: 4 }}>
                Visual mapping of detected entities, connected emails, and commitments. Click any outer node to open email details.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, flex: 1 }}>
              {/* Interactive SVG Network Map */}
              <div style={{
                background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)',
                borderRadius: 16, overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 480
              }}>
                <svg width="100%" height="480" viewBox="0 0 700 480" style={{ overflow: 'visible' }}>
                  <defs>
                    <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
                    </radialGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Pulsing connections to entities */}
                  {/* Vercel */}
                  <line x1="350" y1="240" x2="200" y2="140" stroke="rgba(0, 212, 255, 0.2)" strokeWidth="2" strokeDasharray="5,5" />
                  {/* Amazon */}
                  <line x1="350" y1="240" x2="500" y2="140" stroke="rgba(0, 212, 255, 0.2)" strokeWidth="2" strokeDasharray="5,5" />
                  {/* Delta */}
                  <line x1="350" y1="240" x2="200" y2="340" stroke="rgba(0, 212, 255, 0.2)" strokeWidth="2" strokeDasharray="5,5" />
                  {/* Apex */}
                  <line x1="350" y1="240" x2="500" y2="340" stroke="rgba(0, 212, 255, 0.2)" strokeWidth="2" strokeDasharray="5,5" />
                  {/* Anthropic */}
                  <line x1="350" y1="240" x2="350" y2="80" stroke="rgba(0, 212, 255, 0.2)" strokeWidth="2" strokeDasharray="5,5" />

                  {/* Links from entities to children */}
                  {/* Vercel Child */}
                  <line x1="200" y1="140" x2="120" y2="100" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" />
                  {/* Amazon Child */}
                  <line x1="500" y1="140" x2="580" y2="100" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" />
                  {/* Delta Child */}
                  <line x1="200" y1="340" x2="120" y2="380" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" />
                  {/* Apex Children */}
                  <line x1="500" y1="340" x2="580" y2="310" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" />
                  <line x1="500" y1="340" x2="580" y2="380" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" />
                  {/* Anthropic Child */}
                  <line x1="350" y1="80" x2="270" y2="40" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" />

                  {/* CENTER NODE: User */}
                  <circle cx="350" cy="240" r="40" fill="url(#centerGlow)" />
                  <circle cx="350" cy="240" r="20" fill="#0d1424" stroke="#00d4ff" strokeWidth="2" filter="url(#glow)" />
                  <text x="350" y="244" fill="#00d4ff" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">YOU</text>

                  {/* ENTITY NODES */}
                  {/* Vercel */}
                  <circle cx="200" cy="140" r="16" fill="#0d1424" stroke="#f43f5e" strokeWidth="2" />
                  <text x="200" y="166" fill="#8899bb" fontSize="10" textAnchor="middle" fontWeight="bold">Vercel</text>
                  
                  {/* Amazon */}
                  <circle cx="500" cy="140" r="16" fill="#0d1424" stroke="#10b981" strokeWidth="2" />
                  <text x="500" y="166" fill="#8899bb" fontSize="10" textAnchor="middle" fontWeight="bold">Amazon</text>

                  {/* Delta */}
                  <circle cx="200" cy="340" r="16" fill="#0d1424" stroke="#06b6d4" strokeWidth="2" />
                  <text x="200" y="368" fill="#8899bb" fontSize="10" textAnchor="middle" fontWeight="bold">Delta</text>

                  {/* Apex */}
                  <circle cx="500" cy="340" r="16" fill="#0d1424" stroke="#3b82f6" strokeWidth="2" />
                  <text x="500" y="368" fill="#8899bb" fontSize="10" textAnchor="middle" fontWeight="bold">Apex</text>

                  {/* Anthropic */}
                  <circle cx="350" cy="80" r="16" fill="#0d1424" stroke="#a855f7" strokeWidth="2" />
                  <text x="350" y="108" fill="#8899bb" fontSize="10" textAnchor="middle" fontWeight="bold">Anthropic</text>

                  {/* EMAIL/TASK SUB-NODES (Clickable) */}
                  {/* Vercel invoice */}
                  <g cursor="pointer" onClick={() => { const e = emails.find(em => em.id.includes('1')); if (e) setSelectedItem(e); }}>
                    <circle cx="120" cy="100" r="8" fill="#f43f5e" filter="url(#glow)" />
                    <text x="120" y="86" fill="#f43f5e" fontSize="8" textAnchor="middle">Invoice</text>
                  </g>

                  {/* Amazon Package */}
                  <g cursor="pointer" onClick={() => { const e = emails.find(em => em.id.includes('2')); if (e) setSelectedItem(e); }}>
                    <circle cx="580" cy="100" r="8" fill="#10b981" filter="url(#glow)" />
                    <text x="580" y="86" fill="#10b981" fontSize="8" textAnchor="middle">Order</text>
                  </g>

                  {/* Delta flight */}
                  <g cursor="pointer" onClick={() => { const e = emails.find(em => em.id.includes('6')); if (e) setSelectedItem(e); }}>
                    <circle cx="120" cy="380" r="8" fill="#06b6d4" filter="url(#glow)" />
                    <text x="120" y="396" fill="#06b6d4" fontSize="8" textAnchor="middle">Flight</text>
                  </g>

                  {/* Apex PM Roadmap */}
                  <g cursor="pointer" onClick={() => { const e = emails.find(em => em.id.includes('3')); if (e) setSelectedItem(e); }}>
                    <circle cx="580" cy="310" r="8" fill="#3b82f6" filter="url(#glow)" />
                    <text x="580" y="296" fill="#3b82f6" fontSize="8" textAnchor="middle">Meeting</text>
                  </g>

                  {/* Apex DevOps Task */}
                  <g cursor="pointer" onClick={() => { const e = emails.find(em => em.id.includes('4')); if (e) setSelectedItem(e); }}>
                    <circle cx="580" cy="380" r="8" fill="#3b82f6" filter="url(#glow)" />
                    <text x="580" y="396" fill="#3b82f6" fontSize="8" textAnchor="middle">Patch Task</text>
                  </g>

                  {/* Anthropic Subscription */}
                  <g cursor="pointer" onClick={() => { const e = emails.find(em => em.id.includes('5')); if (e) setSelectedItem(e); }}>
                    <circle cx="270" cy="40" r="8" fill="#a855f7" filter="url(#glow)" />
                    <text x="270" y="26" fill="#a855f7" fontSize="8" textAnchor="middle">Claude Pro</text>
                  </g>
                </svg>
              </div>

              {/* Sidebar stats/legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: '0.85rem', color: '#00d4ff', fontWeight: 700, marginBottom: 8 }}>Graph Legend</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.72rem', color: '#8899bb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00d4ff' }} /> You / Core Identity</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f43f5e' }} /> Finance / Vercel</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} /> Orders / Amazon</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#06b6d4' }} /> Travel / Delta Airlines</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} /> Careers / Apex Agency</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#a855f7' }} /> Subscriptions / Anthropic</div>
                  </div>
                </div>
                
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12, padding: 16, flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', color: '#f0f6ff', fontWeight: 700, marginBottom: 8 }}>Dynamic Relations</div>
                  <div style={{ fontSize: '0.72rem', color: '#8899bb', lineHeight: 1.5 }}>
                    Each outer node represents an actionable item parsed from your emails. Double-click or click them to view the original content and trigger one-click drafts.
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Commitment & Cashflow Runway View */}
        {activeView === 'escalation-runway' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}
          >
            {/* 1. Autonomous Commitment Escalation Guard */}
            <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1rem', color: '#f0f6ff', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldAlert size={18} color="#ef4444" /> Autonomous Escalation Guard
                </h3>
                <p style={{ color: '#8899bb', fontSize: '0.75rem', marginTop: 4 }}>
                  Track escalation timelines and warnings for overdue agreements.
                </p>
              </div>

              {/* Timelines and Toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f0f6ff' }}>Auto SMS Reminders</span>
                    <label style={{ position: 'relative', display: 'inline-block', width: 36, height: 20 }}>
                      <input type="checkbox" defaultChecked style={{ opacity: 0, width: 0, height: 0 }} />
                      <span style={{
                        position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                        background: '#7c3aed', transition: '.4s', borderRadius: 34
                      }} />
                    </label>
                  </div>
                  <p style={{ fontSize: '0.7rem', color: '#8899bb', lineHeight: 1.4 }}>
                    Sends warning texts to your phone 24 hours prior to deadline events.
                  </p>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f0f6ff' }}>Slack Channel Alerts</span>
                    <label style={{ position: 'relative', display: 'inline-block', width: 36, height: 20 }}>
                      <input type="checkbox" defaultChecked style={{ opacity: 0, width: 0, height: 0 }} />
                      <span style={{
                        position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                        background: '#7c3aed', transition: '.4s', borderRadius: 34
                      }} />
                    </label>
                  </div>
                  <p style={{ fontSize: '0.7rem', color: '#8899bb', lineHeight: 1.4 }}>
                    Broadcasts commitment alerts directly to your team's Slack channels on delays.
                  </p>
                </div>

                {/* Visual Escalation Steps */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 16 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8899bb', marginBottom: 12 }}>Escalation Pathway Flow</div>
                  <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: '#8899bb', background: 'rgba(255,255,255,0.01)', padding: 10, borderRadius: 8 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#10b981', fontWeight: 'bold' }}>Agree</div>
                      <div style={{ fontSize: '0.6rem', marginTop: 2 }}>Day 0</div>
                    </div>
                    <span>→</span>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#f59e0b', fontWeight: 'bold' }}>Warn</div>
                      <div style={{ fontSize: '0.6rem', marginTop: 2 }}>Day -1</div>
                    </div>
                    <span>→</span>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#ef4444', fontWeight: 'bold' }}>Escalate</div>
                      <div style={{ fontSize: '0.6rem', marginTop: 2 }}>Day +1</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Predictive Cashflow Runway */}
            <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1rem', color: '#f0f6ff', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CreditCard size={18} color="#00d4ff" /> Predictive Cashflow Runway
                </h3>
                <p style={{ color: '#8899bb', fontSize: '0.75rem', marginTop: 4 }}>
                  Future billing projections mapping upcoming subscriptions and invoices.
                </p>
              </div>

              {/* Cashflow timeline projection list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredBills.map((bill, idx) => (
                  <div key={idx} style={{
                    padding: 12, background: 'rgba(244,63,94,0.02)', border: '1px solid rgba(244,63,94,0.1)', borderRadius: 10,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f0f6ff' }}>{bill.biller}</div>
                      <div style={{ fontSize: '0.68rem', color: '#8899bb', marginTop: 2 }}>Due Date: {bill.dueDate}</div>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f43f5e' }}>-{bill.amount}</span>
                  </div>
                ))}

                {confirmedSubscriptions.map((sub, idx) => (
                  <div key={idx} style={{
                    padding: 12, background: 'rgba(168,85,247,0.02)', border: '1px solid rgba(168,85,247,0.1)', borderRadius: 10,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f0f6ff' }}>{sub.name} Renewal</div>
                      <div style={{ fontSize: '0.68rem', color: '#8899bb', marginTop: 2 }}>Renewal: {sub.renewalDate}</div>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#a855f7' }}>-{sub.cost}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Premium Detail Overlay Modal */}
        <AnimatePresence>
          {selectedItem && (
            <div style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            }} onClick={() => { setSelectedItem(null); setDraftText(''); }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', damping: 25 }}
                className="glass-card"
                style={{ width: '100%', maxWidth: 640, padding: 32, margin: 16, border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: 20, maxHeight: '90vh', overflowY: 'auto' }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 700, padding: '3px 8px', borderRadius: 99,
                        color: statusColors[selectedItem.insights.category] || '#8899bb',
                        background: `${statusColors[selectedItem.insights.category] || '#8899bb'}14`,
                        border: `1px solid ${statusColors[selectedItem.insights.category] || '#8899bb'}25`
                      }}>
                        {selectedItem.insights.category}
                      </span>
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 700, padding: '3px 8px', borderRadius: 99,
                        color: '#00d4ff', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)'
                      }}>
                        Importance: {selectedItem.insights.importance || 50}%
                      </span>
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 700, padding: '3px 8px', borderRadius: 99,
                        color: urgencyColors[selectedItem.insights.urgency] || '#8899bb',
                        background: `${urgencyColors[selectedItem.insights.urgency] || '#8899bb'}14`,
                        border: `1px solid ${urgencyColors[selectedItem.insights.urgency] || '#8899bb'}25`
                      }}>
                        Urgency: {selectedItem.insights.urgency}
                      </span>
                    </div>
                    <h2 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 700, fontSize: '1.2rem', color: '#f0f6ff', marginTop: 10 }}>
                      {selectedItem.subject}
                    </h2>
                  </div>
                  <button onClick={() => { setSelectedItem(null); setDraftText(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a5a7a' }}>
                    <X size={18} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ fontSize: '0.8rem', color: '#8899bb' }}>
                    Sender: <strong>{selectedItem.fromAddress}</strong> · Synced: {new Date(selectedItem.dateSent).toLocaleDateString()}
                  </div>

                  {/* Summary Box */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: '0.78rem', color: '#00d4ff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <Sparkles size={12} /> AI Insight Summary
                    </div>
                    <p style={{ fontSize: '0.82rem', color: '#8899bb', lineHeight: 1.5 }}>
                      {selectedItem.insights.summary}
                    </p>
                  </div>

                  {/* Dynamic Tags & Entities */}
                  {(selectedItem.insights.dynamic_tags || selectedItem.insights.entities) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 4px' }}>
                      {selectedItem.insights.dynamic_tags && selectedItem.insights.dynamic_tags.length > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#8899bb' }}>
                          Context Tags: {selectedItem.insights.dynamic_tags.map((tag: string, i: number) => (
                            <span key={i} style={{ margin: '0 4px', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 4, color: '#f0f6ff', fontSize: '0.68rem' }}>
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {selectedItem.insights.entities && selectedItem.insights.entities.length > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#8899bb' }}>
                          Entities: <strong style={{ color: '#00d4ff' }}>{selectedItem.insights.entities.join(', ')}</strong>
                        </div>
                      )}
                    </div>
                  )}

                  {/* One-Click AI Reply Generator UI */}
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.78rem', color: '#7c3aed', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Mail size={12} /> One-Click AI Draft Assistant
                      </div>
                      <button
                        onClick={() => handleGenerateDraft(selectedItem.subject, selectedItem.body, Object.keys(completedTasks).length > 0)}
                        disabled={draftLoading}
                        style={{
                          background: '#7c3aed', border: 'none', borderRadius: 6, padding: '4px 10px', color: '#fff', fontSize: '0.68rem', cursor: 'pointer'
                        }}
                      >
                        {draftLoading ? 'Generating...' : 'Draft Response'}
                      </button>
                    </div>

                    {draftText && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                        <textarea
                          readOnly
                          value={draftText}
                          style={{
                            width: '100%', height: 100, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 8, padding: 8, fontSize: '0.75rem', color: '#f0f6ff', outline: 'none', resize: 'none', fontFamily: 'monospace'
                          }}
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(draftText);
                            showToast('📋 Draft copied to clipboard!', 'success');
                          }}
                          style={{
                            alignSelf: 'flex-end', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 6, padding: '4px 10px', color: '#f0f6ff', fontSize: '0.68rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 4
                          }}
                        >
                          <Copy size={10} /> Copy to Clipboard
                        </button>
                      </div>
                    )}
                  </div>

                  {/* AI Explainability & Confidence Metrics */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: '0.78rem', color: '#00d4ff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Sparkles size={12} /> AI Extraction Confidence Ratings
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '0.75rem', color: '#8899bb' }}>
                      <div>Intent Category: <strong style={{ color: '#f0f6ff' }}>{Math.round((selectedItem.insights.categoryConfidence || 0.9) * 100)}%</strong></div>
                      <div>Action Tasks: <strong style={{ color: '#f0f6ff' }}>{Math.round((selectedItem.insights.taskConfidence || 0.9) * 100)}%</strong></div>
                      <div>Dates & Deadlines: <strong style={{ color: '#f0f6ff' }}>{Math.round((selectedItem.insights.deadlineConfidence || 0.9) * 100)}%</strong></div>
                      <div>Financials/Bills: <strong style={{ color: '#f0f6ff' }}>{Math.round((selectedItem.insights.financialsConfidence || 0.9) * 100)}%</strong></div>
                    </div>
                  </div>

                  {/* AI Explainability / Reasoning Box */}
                  {selectedItem.insights.reason && (
                    <div style={{ background: 'rgba(0, 212, 255, 0.02)', border: '1px solid rgba(0, 212, 255, 0.1)', borderRadius: 12, padding: 16 }}>
                      <div style={{ fontSize: '0.78rem', color: '#00d4ff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <Bot size={12} /> Why is this tracked? (AI Explanation)
                      </div>
                      <p style={{ fontSize: '0.82rem', color: '#8899bb', lineHeight: 1.5 }}>
                        {selectedItem.insights.reason}
                      </p>
                    </div>
                  )}

                  {/* Full Text Collapsed */}
                  <div style={{
                    background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 12, padding: 16,
                    maxHeight: 120, overflowY: 'auto', fontSize: '0.8rem', color: '#4a5a7a', lineHeight: 1.6, whiteSpace: 'pre-wrap'
                  }}>
                    {selectedItem.body}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}

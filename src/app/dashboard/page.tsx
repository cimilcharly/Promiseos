'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import ConsentOnboarding from '@/components/ConsentOnboarding';
import { useApp } from '@/contexts/AppContext';
import {
  Mail, Calendar, CheckSquare, ShieldAlert, CreditCard,
  Truck, Search, RefreshCw, AlertTriangle, CheckCircle,
  Eye, Clock, Sparkles, Filter, Trash2, ArrowUpRight,
  Send, Bot, User as UserIcon, Plus, X, BarChart3, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MockEmail } from '@/lib/mock_emails';
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

export default function DashboardPage() {
  const { user, showToast } = useApp();
  const [consents, setConsents] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [emails, setEmails] = useState<MockEmail[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Interactive States
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});
  
  // Chatbot Assistant States
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string }>>([
    { sender: 'bot', text: 'Hi! I am your PromiseOS Personal AI Assistant. Ask me anything about your tasks, bills, deliveries, or schedule.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load consents on mount
  useEffect(() => {
    const stored = localStorage.getItem('promiseos_email_consents');
    if (stored) {
      setConsents(JSON.parse(stored));
    }
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
        showToast(`📊 Synchronized and analyzed ${data.emails.length} emails.`, 'success');
      } else {
        throw new Error(data.error || 'Failed sync');
      }
    } catch (err) {
      console.error(err);
      showToast('⚠️ Sync failed. Loaded mock intelligence dashboard.', 'error');
    } finally {
      setLoading(false);
    }
  }, [consents, user, showToast]);

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

    // Simulate AI response based on synced email data
    setTimeout(() => {
      let botResponse = "I couldn't find specific info about that in your synced data. Try asking about 'bills', 'tasks', 'deliveries', or 'meetings'.";
      const query = userText.toLowerCase();

      if (query.includes('bill') || query.includes('invoice') || query.includes('money') || query.includes('pay')) {
        const bills = emails.filter(e => e.insights.financials?.alert);
        if (bills.length > 0) {
          botResponse = `You have ${bills.length} bills pending. The largest is for ${bills[0].insights.financials.biller} of ${bills[0].insights.financials.amount} due on ${bills[0].insights.financials.dueDate}.`;
        } else {
          botResponse = "No pending bills found in your synced emails.";
        }
      } else if (query.includes('task') || query.includes('todo') || query.includes('action')) {
        const tasks = emails.flatMap(e => e.insights.tasks || []).filter(t => !completedTasks[t.task]);
        if (tasks.length > 0) {
          botResponse = `Here are your pending tasks:\n` + tasks.map((t, idx) => `${idx + 1}. ${t.task} (due ${t.deadline})`).join('\n');
        } else {
          botResponse = "Excellent! You have no pending tasks extracted from your emails.";
        }
      } else if (query.includes('delivery') || query.includes('package') || query.includes('order') || query.includes('shipment')) {
        const trackings = emails.filter(e => e.insights.tracking?.trackingNumber);
        if (trackings.length > 0) {
          botResponse = `You have ${trackings.length} active delivery. Package from ${trackings[0].insights.tracking.provider} (Tracking: ${trackings[0].insights.tracking.trackingNumber}) is currently "${trackings[0].insights.tracking.status}".`;
        } else {
          botResponse = "No active order tracking found in your emails.";
        }
      } else if (query.includes('meeting') || query.includes('schedule') || query.includes('calendar')) {
        const meetings = emails.filter(e => e.insights.category === 'Meetings and calendar events');
        if (meetings.length > 0) {
          botResponse = `You have an upcoming meeting: "${meetings[0].subject}" scheduled for ${meetings[0].insights.dates?.[0]?.date || 'soon'}.`;
        } else {
          botResponse = "No upcoming meetings found in your emails.";
        }
      } else if (query.includes('hi') || query.includes('hello') || query.includes('hey')) {
        botResponse = "Hello! I am your personal tracking assistant. How can I help you navigate your commitments today?";
      }

      setChatMessages(prev => [...prev, { sender: 'bot', text: botResponse }]);
      setChatLoading(false);
    }, 1000);
  };

  // Aggregated Insight Metrics
  const tasksList = emails.flatMap(e => (e.insights.tasks || []).map(t => ({ ...t, emailSource: e })));
  const pendingTasksList = tasksList.filter(t => !completedTasks[t.task]);
  
  const datesList = emails.flatMap(e => (e.insights.dates || []).map(d => ({ ...d, emailSource: e })));
  const billsList = emails.filter(e => e.insights.financials?.alert).map(e => ({ ...e.insights.financials, emailSource: e }));
  const trackingList = emails.filter(e => e.insights.tracking?.trackingNumber).map(e => ({ ...e.insights.tracking, emailSource: e }));
  const meetingsList = emails.filter(e => e.insights.category === 'Meetings and calendar events').map(e => ({
    title: e.subject,
    date: e.insights.dates?.[0]?.date || 'TBD',
    summary: e.insights.summary,
    emailSource: e
  }));
  const subscriptionsList = emails.filter(e => e.insights.subscription?.name).map(e => ({ ...e.insights.subscription, emailSource: e }));

  // Search Filter across all items
  const matchesSearch = (text: string) => text.toLowerCase().includes(searchQuery.toLowerCase());
  
  const filteredTasks = pendingTasksList.filter(t => matchesSearch(t.task));
  const filteredDeadlines = datesList.filter(d => matchesSearch(d.label));
  const filteredBills = billsList.filter(b => matchesSearch(b.biller || ''));
  const filteredTrackings = trackingList.filter(t => matchesSearch(t.provider || '') || matchesSearch(t.trackingNumber || ''));

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
      <div>
        <Sidebar />
        <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '90vh' }}>
          <ConsentOnboarding onAccept={handleAcceptConsents} onCancel={() => showToast('Access denied.', 'error')} />
        </main>
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

        {/* Hero Section */}
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
          <div style={{ maxWidth: '70%' }}>
            <span style={{ fontSize: '0.72rem', background: 'rgba(0, 212, 255, 0.12)', color: '#00d4ff', padding: '3px 10px', borderRadius: 99, fontWeight: 700 }}>
              AI INTELLIGENCE REPORT
            </span>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.4rem', color: '#f0f6ff', marginTop: 10, marginBottom: 8 }}>
              Good Morning, Charlie.
            </h2>
            <p style={{ color: '#8899bb', fontSize: '0.88rem', lineHeight: 1.6 }}>
              You have <strong style={{ color: '#ec4899' }}>{pendingTasksList.length} pending tasks</strong>,              <strong style={{ color: '#ef4444' }}>{datesList.length} deadlines</strong> this week,{' '}
              and <strong style={{ color: '#10b981' }}>{trackingList.length} package delivery</strong> tomorrow.
            </p>
          </div>

          <div style={{ textAlign: 'center', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', padding: '16px 24px', borderRadius: 16 }}>
            <div style={{ fontSize: '0.72rem', color: '#8899bb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Productivity Score</div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#00d4ff', fontFamily: 'Outfit, sans-serif', margin: '4px 0' }}>85%</div>
            <div style={{ fontSize: '0.68rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
              <TrendingUp size={10} /> +4% from last week
            </div>
          </div>
        </motion.div>

        {/* Dashboard Grid */}
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

          {/* 2. AI Chatbot Assistant (Col Span: 4) */}
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

          {/* 3. Deadline Tracker (Col Span: 4) */}
          <div className="glass-card" style={{ gridColumn: 'span 4', padding: 20 }}>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#f0f6ff', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={16} color="#ef4444" /> Deadline Tracker
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredDeadlines.length > 0 ? (
                filteredDeadlines.slice(0, 4).map((d, idx) => (
                  <div key={idx} onClick={() => setSelectedItem(d.emailSource)} style={{
                    padding: 10, background: 'rgba(255,255,255,0.01)', borderLeft: '3px solid #ef4444', borderRadius: '0 8px 8px 0', cursor: 'pointer'
                  }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f0f6ff' }}>{d.label}</div>
                    <div style={{ fontSize: '0.7rem', color: '#8899bb', marginTop: 4 }}>Date: {d.date}</div>
                  </div>
                ))
              ) : (
                <div style={{ color: '#4a5a7a', fontSize: '0.78rem', textAlign: 'center' }}>No dates scheduled.</div>
              )}
            </div>
          </div>

          {/* 4. Orders & Shipment (Col Span: 4) */}
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

          {/* 5. Finance Center (Col Span: 4) */}
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

          {/* 6. Meetings & Schedule (Col Span: 4) */}
          <div className="glass-card" style={{ gridColumn: 'span 4', padding: 20 }}>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#f0f6ff', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={16} color="#7c3aed" /> Schedule & Agenda
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {meetingsList.length > 0 ? (
                meetingsList.slice(0, 3).map((meet, idx) => (
                  <div key={idx} onClick={() => setSelectedItem(meet.emailSource)} style={{
                    padding: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 10, cursor: 'pointer'
                  }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f0f6ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {meet.title}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#8899bb', marginTop: 4 }}>Date: {meet.date}</div>
                  </div>
                ))
              ) : (
                <div style={{ color: '#4a5a7a', fontSize: '0.78rem', textAlign: 'center' }}>No meetings scheduled.</div>
              )}
            </div>
          </div>

          {/* 7. Subscriptions Tracker (Col Span: 4) */}
          <div className="glass-card" style={{ gridColumn: 'span 4', padding: 20 }}>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#f0f6ff', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <RefreshCw size={16} color="#a855f7" /> Subscriptions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {subscriptionsList.length > 0 ? (
                subscriptionsList.slice(0, 3).map((sub, idx) => (
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
                ))
              ) : (
                <div style={{ color: '#4a5a7a', fontSize: '0.78rem', textAlign: 'center' }}>No subscriptions found.</div>
              )}
            </div>
          </div>

          {/* 8. Analytics & Trends (Col Span: 4) */}
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

        </div>

        {/* Premium Detail Overlay Modal */}
        <AnimatePresence>
          {selectedItem && (
            <div style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            }} onClick={() => setSelectedItem(null)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', damping: 25 }}
                className="glass-card"
                style={{ width: '100%', maxWidth: 640, padding: 32, margin: 16, border: '1px solid rgba(255,255,255,0.1)' }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 700, padding: '3px 8px', borderRadius: 99,
                      color: statusColors[selectedItem.insights.category] || '#8899bb',
                      background: `${statusColors[selectedItem.insights.category] || '#8899bb'}14`,
                      border: `1px solid ${statusColors[selectedItem.insights.category] || '#8899bb'}25`
                    }}>
                      {selectedItem.insights.category}
                    </span>
                    <h2 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 700, fontSize: '1.2rem', color: '#f0f6ff', marginTop: 10 }}>
                      {selectedItem.subject}
                    </h2>
                  </div>
                  <button onClick={() => setSelectedItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a5a7a' }}>
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

                  {/* Full Text Collapsed */}
                  <div style={{
                    background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 12, padding: 16,
                    maxHeight: 200, overflowY: 'auto', fontSize: '0.8rem', color: '#4a5a7a', lineHeight: 1.6, whiteSpace: 'pre-wrap'
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

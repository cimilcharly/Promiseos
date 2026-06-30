'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import ConsentOnboarding from '@/components/ConsentOnboarding';
import { useApp } from '@/contexts/AppContext';
import {
  Mail, Calendar, CheckSquare, ShieldAlert, CreditCard,
  Truck, Search, RefreshCw, AlertTriangle, CheckCircle,
  Eye, Clock, Sparkles, Filter, Trash2, ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MockEmail } from '@/lib/mock_emails';

const CATEGORY_COLORS: Record<string, string> = {
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

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Finance / bills': <CreditCard size={14} />,
  'Job and career': <ArrowUpRight size={14} />,
  'Meetings and calendar events': <Calendar size={14} />,
  'Purchases and orders': <Truck size={14} />,
  'Travel': <Calendar size={14} />,
  'Subscriptions': <CreditCard size={14} />,
  'Personal communication': <Mail size={14} />,
  'Promotions and spam': <Trash2 size={14} />,
  'Tasks and action items': <CheckSquare size={14} />,
  'Deadlines and reminders': <Clock size={14} />,
};

export default function InboxPage() {
  const { user, showToast } = useApp();
  const [consents, setConsents] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [emails, setEmails] = useState<MockEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<MockEmail | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

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
    showToast('🔒 Email preferences saved successfully.', 'success');
  };

  const handleResetConsents = () => {
    localStorage.removeItem('promiseos_email_consents');
    setConsents(null);
    setEmails([]);
    setSelectedEmail(null);
    showToast('🔒 Consent settings reset. Please onboard again.', 'info');
  };

  const syncEmails = useCallback(async () => {
    if (!consents) return;
    setLoading(true);
    try {
      // Simulate retrieving access token from Supabase or OAuth session
      const response = await fetch('/api/sync-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          googleAccessToken: null, // Bypassing for simulation / demo fallback
          consents,
        }),
      });

      const data = await response.json();
      if (data.success && data.emails) {
        setEmails(data.emails);
        if (data.emails.length > 0) {
          setSelectedEmail(data.emails[0]);
        }
        showToast(`📬 Successfully synchronized ${data.emails.length} emails.`, 'success');
      } else {
        throw new Error(data.error || 'Failed sync');
      }
    } catch (err) {
      console.error(err);
      showToast('⚠️ Sync failed. Using default mock inbox.', 'error');
    } finally {
      setLoading(false);
    }
  }, [consents, user, showToast]);

  useEffect(() => {
    if (consents) {
      syncEmails();
    }
  }, [consents, syncEmails]);

  // Filters
  const filteredEmails = emails.filter((email) => {
    const matchesSearch = email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.fromAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.snippet.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = activeCategory === 'All' || email.insights.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  const categoriesAvailable = ['All', ...Array.from(new Set(emails.map((e) => e.insights.category)))];

  // Aggregated Insight Metrics
  const totalTasks = emails.reduce((acc, curr) => acc + (curr.insights.tasks?.length || 0), 0);
  const totalDeadlines = emails.reduce((acc, curr) => acc + (curr.insights.dates?.length || 0), 0);
  const totalFinancialAlerts = emails.filter((e) => e.insights.financials?.alert).length;
  const totalSubscriptions = emails.filter((e) => e.insights.subscription?.name).length;

  if (!consents) {
    return (
      <div>
        <Sidebar />
        <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '90vh' }}>
          <ConsentOnboarding onAccept={handleAcceptConsents} onCancel={() => showToast('Permission rejected. Cannot fetch emails.', 'error')} />
        </main>
      </div>
    );
  }

  return (
    <div>
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.8rem', marginBottom: 4 }}>
              Email Intelligence
            </h1>
            <p style={{ color: '#8899bb', fontSize: '0.9rem' }}>
              Gemini AI-powered email parsing, automated task extraction & prioritization
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleResetConsents}
              className="btn-secondary"
              style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              Privacy Controls
            </button>
            <button
              onClick={syncEmails}
              disabled={loading}
              className="btn-primary"
              style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Analyzing...' : 'Sync Inbox'}
            </button>
          </div>
        </div>

        {/* AI Daily Insights Header widget */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.05) 0%, rgba(124, 58, 237, 0.05) 100%)',
            borderColor: 'rgba(0, 212, 255, 0.15)',
            padding: 20,
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div style={{
            width: 42, height: 42, borderRadius: 12, background: 'rgba(0, 212, 255, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00d4ff', flexShrink: 0
          }}>
            <Sparkles size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f0f6ff', display: 'flex', alignItems: 'center', gap: 6 }}>
              AI Daily Briefing
            </div>
            <div style={{ fontSize: '0.82rem', color: '#8899bb', marginTop: 4, lineHeight: 1.5 }}>
              {emails.length > 0 ? (
                <span>
                  We analyzed your inbox and found <strong style={{ color: '#00d4ff' }}>{totalTasks} pending tasks</strong>,{' '}
                  <strong style={{ color: '#7c3aed' }}>{totalDeadlines} deadlines</strong>, and{' '}
                  <strong style={{ color: '#f43f5e' }}>{totalFinancialAlerts} bills</strong> requiring your attention this week.
                </span>
              ) : (
                <span>No emails synced yet. Click "Sync Inbox" to retrieve insights from your Gmail.</span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Mini stats dashboard */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
          <div className="stat-card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ec4899', marginBottom: 8 }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>Extracted Tasks</span>
              <CheckSquare size={16} />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f0f6ff' }}>{totalTasks}</div>
          </div>
          <div className="stat-card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444', marginBottom: 8 }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>Important Dates</span>
              <Clock size={16} />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f0f6ff' }}>{totalDeadlines}</div>
          </div>
          <div className="stat-card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f43f5e', marginBottom: 8 }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>Bills & Payments</span>
              <CreditCard size={16} />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f0f6ff' }}>{totalFinancialAlerts}</div>
          </div>
          <div className="stat-card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#a855f7', marginBottom: 8 }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>Subscriptions</span>
              <RefreshCw size={16} />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f0f6ff' }}>{totalSubscriptions}</div>
          </div>
        </div>

        {/* Categories Carousel */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 16 }}>
          {categoriesAvailable.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                background: activeCategory === cat ? 'rgba(0, 212, 255, 0.1)' : 'rgba(255,255,255,0.02)',
                border: activeCategory === cat ? '1px solid #00d4ff' : '1px solid rgba(255,255,255,0.06)',
                color: activeCategory === cat ? '#00d4ff' : '#8899bb',
                borderRadius: 99,
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {cat !== 'All' && CATEGORY_ICONS[cat]}
              {cat}
            </button>
          ))}
        </div>

        {/* Dashboard Panels */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.9fr', gap: 20, alignItems: 'start' }}>
          {/* Left panel: Email List */}
          <div className="glass-card" style={{ padding: 16, height: 600, display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <Search size={14} color="#4a5a7a" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                className="input-field"
                type="text"
                placeholder="Search subject or sender..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 34, fontSize: '0.8rem' }}
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredEmails.length > 0 ? (
                filteredEmails.map((email) => {
                  const isSelected = selectedEmail?.id === email.id;
                  return (
                    <div
                      key={email.id}
                      onClick={() => setSelectedEmail(email)}
                      style={{
                        padding: 14,
                        background: isSelected ? 'rgba(0, 212, 255, 0.04)' : 'rgba(255,255,255,0.01)',
                        border: isSelected ? '1px solid #00d4ff' : '1px solid rgba(255,255,255,0.04)',
                        borderRadius: 12,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.78rem', color: '#8899bb', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                          {email.fromAddress.split('<')[0]}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: '#4a5a7a' }}>
                          {new Date(email.dateSent).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f0f6ff', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {email.subject}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#4a5a7a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 8 }}>
                        {email.snippet}
                      </div>
                      <span style={{
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        color: CATEGORY_COLORS[email.insights.category] || '#8899bb',
                        background: `${CATEGORY_COLORS[email.insights.category] || '#8899bb'}14`,
                        border: `1px solid ${CATEGORY_COLORS[email.insights.category] || '#8899bb'}25`,
                        borderRadius: 99,
                        padding: '2px 8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}>
                        {CATEGORY_ICONS[email.insights.category]}
                        {email.insights.category}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#4a5a7a', fontSize: '0.8rem' }}>
                  No matching emails found.
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Detail & Insights view */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {selectedEmail ? (
              <>
                {/* Email Body Detail */}
                <div className="glass-card" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#f0f6ff', marginBottom: 6 }}>
                        {selectedEmail.subject}
                      </h2>
                      <div style={{ fontSize: '0.78rem', color: '#8899bb' }}>
                        From: <strong>{selectedEmail.fromAddress}</strong>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#4a5a7a' }}>
                      {new Date(selectedEmail.dateSent).toLocaleString()}
                    </span>
                  </div>

                  {/* Summary box */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 16,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#00d4ff', fontWeight: 700, marginBottom: 6 }}>
                      <Sparkles size={12} /> AI Summary
                    </div>
                    <p style={{ fontSize: '0.82rem', color: '#8899bb', lineHeight: 1.5 }}>
                      {selectedEmail.insights.summary}
                    </p>
                  </div>

                  {/* Email body collapsed/scrollable */}
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#4a5a7a',
                    lineHeight: 1.6,
                    maxHeight: 150,
                    overflowY: 'auto',
                    borderTop: '1px solid rgba(255,255,255,0.04)',
                    paddingTop: 14,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {selectedEmail.body}
                  </div>
                </div>

                {/* AI Insights Layer widgets */}
                <div className="glass-card" style={{ padding: 24 }}>
                  <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: '#f0f6ff', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={14} color="#00d4ff" /> Extracted Intelligence
                  </h3>

                  {/* 1. Tasks Extracted */}
                  {selectedEmail.insights.tasks && selectedEmail.insights.tasks.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ec4899', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <CheckSquare size={13} /> Extracted Tasks
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {selectedEmail.insights.tasks.map((task, i) => (
                          <div key={i} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '10px 12px', background: 'rgba(236,72,153,0.04)',
                            border: '1px solid rgba(236,72,153,0.12)', borderRadius: 8,
                          }}>
                            <div style={{ fontSize: '0.8rem', color: '#f0f6ff' }}>{task.task}</div>
                            <button
                              onClick={() => {
                                showToast(`Task imported to tracking board: "${task.task.slice(0, 30)}..."`, 'success');
                              }}
                              className="btn-secondary"
                              style={{ fontSize: '0.68rem', padding: '3px 8px', color: '#ec4899', borderColor: 'rgba(236,72,153,0.3)' }}
                            >
                              Track Task
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. Important Dates */}
                  {selectedEmail.insights.dates && selectedEmail.insights.dates.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <Calendar size={13} /> Deadlines & Reminders
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {selectedEmail.insights.dates.map((date, i) => (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '8px 12px', background: 'rgba(239,68,68,0.04)',
                            border: '1px solid rgba(239,68,68,0.12)', borderRadius: 8,
                            fontSize: '0.78rem', color: '#f0f6ff',
                          }}>
                            <Clock size={12} color="#ef4444" />
                            <strong>{date.label}:</strong> {date.date}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. Shipment Tracking */}
                  {selectedEmail.insights.tracking?.trackingNumber && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <Truck size={13} /> Shipment Tracking
                      </div>
                      <div style={{
                        padding: 14, background: 'rgba(16,185,129,0.04)',
                        border: '1px solid rgba(16,185,129,0.12)', borderRadius: 10,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <div>
                          <div style={{ fontSize: '0.8rem', color: '#f0f6ff', fontWeight: 600 }}>
                            {selectedEmail.insights.tracking.provider} · {selectedEmail.insights.tracking.trackingNumber}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#8899bb', marginTop: 2 }}>
                            Status: <strong style={{ color: '#10b981' }}>{selectedEmail.insights.tracking.status}</strong>
                          </div>
                        </div>
                        {selectedEmail.insights.tracking.deliveryDate && (
                          <div style={{ textAlign: 'right', fontSize: '0.72rem', color: '#8899bb' }}>
                            Delivery est:<br />
                            <strong style={{ color: '#f0f6ff' }}>{selectedEmail.insights.tracking.deliveryDate}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 4. Financial Alert */}
                  {selectedEmail.insights.financials?.alert && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f43f5e', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <AlertTriangle size={13} /> Financial Alert
                      </div>
                      <div style={{
                        padding: 14, background: 'rgba(244,63,94,0.04)',
                        border: '1px solid rgba(244,63,94,0.12)', borderRadius: 10,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <div>
                          <div style={{ fontSize: '0.82rem', color: '#f0f6ff', fontWeight: 600 }}>
                            Bill due for {selectedEmail.insights.financials.biller}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#8899bb', marginTop: 2 }}>
                            Due date: {selectedEmail.insights.financials.dueDate}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f43f5e' }}>
                            {selectedEmail.insights.financials.amount}
                          </div>
                          <button
                            onClick={() => showToast(`Redirecting to secure bill payment for ${selectedEmail.insights.financials.amount}...`, 'info')}
                            className="btn-primary"
                            style={{ fontSize: '0.68rem', padding: '3px 8px', background: '#f43f5e', border: 'none', color: 'white', cursor: 'pointer', marginTop: 4 }}
                          >
                            Pay Bill
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 5. Subscription Info */}
                  {selectedEmail.insights.subscription?.name && (
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#a855f7', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <CreditCard size={13} /> Subscription Summary
                      </div>
                      <div style={{
                        padding: 14, background: 'rgba(168,85,247,0.04)',
                        border: '1px solid rgba(168,85,247,0.12)', borderRadius: 10,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <div>
                          <div style={{ fontSize: '0.8rem', color: '#f0f6ff', fontWeight: 600 }}>
                            {selectedEmail.insights.subscription.name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#8899bb', marginTop: 2 }}>
                            Cost: {selectedEmail.insights.subscription.cost} · Auto-renews
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '0.72rem', color: '#8899bb' }}>
                          Next renewal:<br />
                          <strong style={{ color: '#f0f6ff' }}>{selectedEmail.insights.subscription.renewalDate}</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: '#4a5a7a' }}>
                Select an email to view AI summaries and extracted insights.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

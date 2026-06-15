'use client';
// src/app/dashboard/page.tsx — Team Dashboard with Framer Motion

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { useApp } from '@/contexts/AppContext';
import {
  Activity, AlertTriangle, CheckCircle2, Clock, Zap, TrendingUp,
  Bell, Mail, ArrowUpRight, Calendar, Users, ChevronRight,
} from 'lucide-react';
import { RELIABILITY_TREND } from '@/lib/mockData';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

const statusColors: Record<string, string> = {
  'new': '#00d4ff',
  'in-progress': '#7c3aed',
  'due-soon': '#f59e0b',
  'completed': '#10b981',
  'overdue': '#f43f5e',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (h > 23) return `${Math.floor(h / 24)}d ago`;
  if (h > 0) return `${h}h ago`;
  return `${m}m ago`;
}

function NotifIcon({ type }: { type: string }) {
  if (type === 'reminder') return <Bell size={14} color="#f59e0b" />;
  if (type === 'escalation') return <AlertTriangle size={14} color="#f43f5e" />;
  return <CheckCircle2 size={14} color="#10b981" />;
}

export default function DashboardPage() {
  const { stats, commitments, notifications, meetings, members, sendSimulatedReminder } = useApp();
  const [activeTab, setActiveTab] = useState<'activity' | 'notifications'>('activity');

  const statCards = [
    {
      label: 'Active Commitments', value: stats.activeCommitments,
      icon: <Activity size={20} />, color: '#00d4ff',
      sub: 'across all meetings',
    },
    {
      label: 'Due Today', value: stats.dueToday,
      icon: <Clock size={20} />, color: '#f59e0b',
      sub: 'need attention now',
    },
    {
      label: 'Overdue', value: stats.overdue,
      icon: <AlertTriangle size={20} />, color: '#f43f5e',
      sub: 'require immediate action',
    },
    {
      label: 'Completed This Week', value: stats.completedThisWeek,
      icon: <CheckCircle2 size={20} />, color: '#10b981',
      sub: 'on-time deliveries',
    },
  ];

  // Recent commitments (last 6)
  const recentCommitments = [...commitments]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  // Overdue items
  const overdueItems = commitments.filter(c => c.status === 'overdue');

  return (
    <div>
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}
        >
          <div>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.8rem', marginBottom: 4 }}>
              Team Dashboard
            </h1>
            <p style={{ color: '#8899bb', fontSize: '0.9rem' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              &nbsp;·&nbsp;{stats.totalMeetings} meetings processed
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: 8, padding: '6px 12px', fontSize: '0.8rem', color: '#10b981',
            }}>
              <div className="dot-online" /> Live Tracking
            </div>
          </div>
        </motion.div>

        {/* Stat cards (Staggered Entry) */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08 } },
          }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}
        >
          {statCards.map((card) => (
            <motion.div
              key={card.label}
              variants={{
                hidden: { opacity: 0, scale: 0.95, y: 15 },
                show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 120 } },
              }}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="stat-card"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: `${card.color}18`, border: `1px solid ${card.color}25`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.color,
                }}>
                  {card.icon}
                </div>
                <ArrowUpRight size={14} color="#4a5a7a" />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', color: card.color, lineHeight: 1 }}>
                {card.value}
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f0f6ff', marginTop: 6 }}>{card.label}</div>
              <div style={{ fontSize: '0.75rem', color: '#4a5a7a', marginTop: 2 }}>{card.sub}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Charts row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 28 }}>
          {/* Reliability Trend */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="glass-card"
            style={{ padding: 24 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '1rem' }}>Team Reliability Trend</h3>
                <p style={{ color: '#8899bb', fontSize: '0.78rem', marginTop: 2 }}>Last 6 weeks</p>
              </div>
              <div style={{
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: 6, padding: '3px 10px', fontSize: '0.78rem', color: '#10b981', fontWeight: 600,
              }}>
                +7% ↑
              </div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={RELIABILITY_TREND}>
                <defs>
                  <linearGradient id="gradScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#8899bb' }} axisLine={false} tickLine={false} />
                <YAxis domain={[60, 100]} tick={{ fontSize: 11, fill: '#8899bb' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#0d1424', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#f0f6ff' }}
                />
                <Area type="monotone" dataKey="score" stroke="#00d4ff" strokeWidth={2} fill="url(#gradScore)" dot={{ fill: '#00d4ff', r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Weekly Commitments */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="glass-card"
            style={{ padding: 24 }}
          >
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '1rem' }}>Commitments Per Week</h3>
              <p style={{ color: '#8899bb', fontSize: '0.78rem', marginTop: 2 }}>Volume tracking</p>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={RELIABILITY_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#8899bb' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#8899bb' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#0d1424', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#f0f6ff' }}
                />
                <Bar dataKey="commitments" fill="url(#gradBar)" radius={[4, 4, 0, 0]}>
                  <defs>
                    <linearGradient id="gradBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Bottom row: Activity + Overdue + Notifications */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {/* Left: Recent + Overdue */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Recent Commitments */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="glass-card"
              style={{ padding: 24 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '1rem' }}>Recent Commitments</h3>
                <a href="/board" style={{ fontSize: '0.78rem', color: '#00d4ff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  View Board <ChevronRight size={12} />
                </a>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentCommitments.map(c => (
                  <motion.div
                    key={c.id}
                    layoutId={c.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                      background: 'rgba(255,255,255,0.02)', borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: statusColors[c.status] || '#8899bb',
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', color: '#f0f6ff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.task}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#8899bb', marginTop: 2 }}>
                        {c.owner} · {c.meetingTitle || 'Manual'} · due {c.deadline}
                      </div>
                    </div>
                    <span className={`badge badge-${c.status.replace('-', '')}`} style={{ flexShrink: 0, fontSize: '0.68rem' }}>
                      {c.status}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Overdue Alerts */}
            <AnimatePresence>
              {overdueItems.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'spring', duration: 0.4 }}
                  className="glass-card"
                  style={{ padding: 24, borderColor: 'rgba(244,63,94,0.15)', overflow: 'hidden' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <AlertTriangle size={16} color="#f43f5e" />
                    <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '1rem', color: '#f43f5e' }}>
                      Overdue — Needs Action
                    </h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {overdueItems.map(c => (
                      <motion.div
                        key={c.id}
                        layout
                        style={{
                          background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.15)',
                          borderRadius: 8, padding: '12px 14px',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#f0f6ff' }}>{c.task}</div>
                          <div style={{ fontSize: '0.72rem', color: '#8899bb', marginTop: 3 }}>
                            {c.owner} · was due {c.deadline}
                            {c.escalated && <span style={{ color: '#f43f5e', marginLeft: 6 }}>· Escalated</span>}
                          </div>
                        </div>
                        <button
                          className="btn-secondary"
                          style={{ fontSize: '0.72rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                          onClick={() => sendSimulatedReminder(c.id, c.owner)}
                        >
                          <Mail size={11} /> Remind
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Notifications + Team */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Notification Log */}
            <motion.div
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="glass-card"
              style={{ padding: 20 }}
            >
              <div style={{ display: 'flex', gap: 0, marginBottom: 16 }}>
                {(['activity', 'notifications'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    style={{
                      flex: 1, padding: '6px 0', fontSize: '0.78rem', fontWeight: 600,
                      background: activeTab === tab ? 'rgba(0,212,255,0.1)' : 'transparent',
                      color: activeTab === tab ? '#00d4ff' : '#8899bb',
                      border: 'none', borderRadius: 6, cursor: 'pointer', transition: 'all 0.2s',
                      textTransform: 'capitalize',
                    }}>
                    {tab === 'activity' ? '🔔 Notifications' : '📊 Meetings'}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {activeTab === 'activity' ? (
                  <motion.div
                    key="activity-log"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.2 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                  >
                    {notifications.slice(0, 5).map(n => (
                      <div key={n.id} style={{
                        padding: '10px 12px', background: 'rgba(255,255,255,0.02)',
                        borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{ marginTop: 2 }}><NotifIcon type={n.type} /></div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.78rem', color: '#f0f6ff', fontWeight: 500, lineHeight: 1.3 }}>{n.subject}</div>
                            <div style={{ fontSize: '0.7rem', color: '#4a5a7a', marginTop: 4 }}>
                              To: {n.recipient} · {timeAgo(n.sentAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="meetings-log"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.2 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                  >
                    {meetings.slice(0, 4).map(m => (
                      <div key={m.id} style={{
                        padding: '10px 12px', background: 'rgba(255,255,255,0.02)',
                        borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Calendar size={13} color="#7c3aed" />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.78rem', color: '#f0f6ff', fontWeight: 500 }}>{m.title}</div>
                            <div style={{ fontSize: '0.7rem', color: '#4a5a7a', marginTop: 2 }}>
                              {m.platform} · {m.commitmentCount} commitments
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Team Reliability Quick */}
            <motion.div
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="glass-card"
              style={{ padding: 20 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Users size={14} color="#7c3aed" /> Team Reliability
                </h3>
                <a href="/team" style={{ fontSize: '0.72rem', color: '#7c3aed', textDecoration: 'none' }}>View all →</a>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {members.slice(0, 4).map(m => (
                  <div key={m.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.78rem', color: '#f0f6ff' }}>{m.name}</span>
                      <span style={{
                        fontSize: '0.78rem', fontWeight: 700,
                        color: m.reliabilityScore >= 90 ? '#10b981' : m.reliabilityScore >= 75 ? '#f59e0b' : '#f43f5e',
                      }}>
                        {m.reliabilityScore}%
                      </span>
                    </div>
                    <div className="progress-bar">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${m.reliabilityScore}%` }}
                        transition={{ duration: 0.8, delay: 0.8, type: 'spring' }}
                        className="progress-fill"
                        style={{
                          background: m.reliabilityScore >= 90 ? '#10b981' : m.reliabilityScore >= 75 ? 'linear-gradient(90deg,#f59e0b,#ec4899)' : '#f43f5e',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}

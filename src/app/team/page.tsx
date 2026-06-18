'use client';
// src/app/team/page.tsx — Team Reliability Dashboard with Framer Motion

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { useApp } from '@/contexts/AppContext';
import { TeamMember } from '@/lib/types';
import { TrendingUp, TrendingDown, Award, AlertTriangle, CheckCircle2, Clock, ChevronDown, ChevronUp, Mail, Plus, X, Loader2, ArrowRight } from 'lucide-react';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

function ReliabilityRing({ score, size = 80 }: { score: number; size?: number }) {
  const color = score >= 90 ? '#10b981' : score >= 75 ? '#f59e0b' : '#f43f5e';
  const data = [{ value: score, fill: color }, { value: 100 - score, fill: 'rgba(255,255,255,0.04)' }];

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%" cy="50%"
          innerRadius="68%" outerRadius="100%"
          startAngle={90} endAngle={-270}
          data={data} barSize={8}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar dataKey="value" cornerRadius={4} background={false} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: size * 0.22, fontWeight: 800, color, fontFamily: 'Outfit, sans-serif', lineHeight: 1 }}>
          {score}
        </span>
        <span style={{ fontSize: size * 0.13, color: '#4a5a7a', lineHeight: 1 }}>%</span>
      </div>
    </div>
  );
}

function MemberCard({ member, commitments, onRemind }: {
  member: TeamMember;
  commitments: ReturnType<typeof useApp>['commitments'];
  onRemind: (id: string, owner: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const myCommitments = commitments.filter(c => c.owner === member.name);
  const active = myCommitments.filter(c => !['completed'].includes(c.status));
  const overdue = myCommitments.filter(c => c.status === 'overdue');

  const score = member.reliabilityScore;
  const color = score >= 90 ? '#10b981' : score >= 75 ? '#f59e0b' : '#f43f5e';
  const trend = score >= 85 ? 'up' : score >= 70 ? 'stable' : 'down';

  return (
    <motion.div
      layout
      className="glass-card"
      style={{ padding: 0, overflow: 'hidden' }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
    >
      {/* Top colored bar */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${color}, ${color}88)` }} />

      <div style={{ padding: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
          {/* Avatar */}
          <div style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            background: `linear-gradient(135deg, ${color}66, #7c3aed)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.9rem', fontWeight: 700, color: 'white',
          }}>
            {member.name.split(' ').map(n => n[0]).join('')}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#f0f6ff' }}>{member.name}</div>
                <div style={{ fontSize: '0.78rem', color: '#8899bb', marginTop: 2 }}>{member.role}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {trend === 'up' ? <TrendingUp size={13} color="#10b981" /> :
                 trend === 'down' ? <TrendingDown size={13} color="#f43f5e" /> :
                 <div style={{ width: 13, height: 2, background: '#8899bb', borderRadius: 1 }} />}
                <ReliabilityRing score={score} size={64} />
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Total', value: member.totalCommitments, icon: <Clock size={11} />, color: '#8899bb' },
            { label: 'On Time', value: member.completedOnTime, icon: <CheckCircle2 size={11} />, color: '#10b981' },
            { label: 'Overdue', value: member.overdue, icon: <AlertTriangle size={11} />, color: '#f43f5e' },
            { label: 'Avg Late', value: `${member.avgDaysLate}d`, icon: <TrendingDown size={11} />, color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} style={{
              textAlign: 'center', padding: '8px 4px',
              background: 'rgba(255,255,255,0.02)', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.04)',
            }}>
              <div style={{ color: s.color, display: 'flex', justifyContent: 'center', marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.65rem', color: '#4a5a7a' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#8899bb', marginBottom: 5 }}>
            <span>Reliability Score</span>
            <span style={{ color }}>{score}% — {score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : 'Needs Improvement'}</span>
          </div>
          <div className="progress-bar" style={{ height: 8 }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 0.8, type: 'spring' }}
              className="progress-fill"
              style={{ background: color }}
            />
          </div>
        </div>

        {/* Current commitments quick view */}
        {active.length > 0 && (
          <div style={{ fontSize: '0.72rem', color: '#8899bb', marginBottom: 10 }}>
            {active.length} active commitment{active.length > 1 ? 's' : ''}
            {overdue.length > 0 && <span style={{ color: '#f43f5e', marginLeft: 8 }}>· {overdue.length} overdue</span>}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setExpanded(!expanded)}
            className="btn-secondary"
            style={{ flex: 1, fontSize: '0.78rem', padding: '7px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? 'Hide' : 'Show'} Commitments
          </button>
          {overdue.length > 0 && (
            <button
              onClick={() => overdue.forEach(c => onRemind(c.id, member.name))}
              className="btn-secondary"
              style={{ fontSize: '0.78rem', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 4, borderColor: 'rgba(244,63,94,0.2)', color: '#f43f5e' }}
            >
              <Mail size={11} /> Remind
            </button>
          )}
        </div>

        {/* Expanded commitments details drawer */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: '0.72rem', color: '#4a5a7a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                  Current Commitments
                </div>
                {myCommitments.length === 0 ? (
                  <div style={{ fontSize: '0.78rem', color: '#4a5a7a', padding: '10px', textAlign: 'center' }}>No commitments yet</div>
                ) : myCommitments.map(c => (
                  <div key={c.id} style={{
                    padding: '8px 10px',
                    background: 'rgba(255,255,255,0.02)',
                    border: `1px solid ${c.status === 'overdue' ? 'rgba(244,63,94,0.15)' : 'rgba(255,255,255,0.04)'}`,
                    borderRadius: 6,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{ fontSize: '0.78rem', color: '#f0f6ff', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.task}
                    </span>
                    <span style={{
                      fontSize: '0.65rem', flexShrink: 0, padding: '2px 7px', borderRadius: 999, fontWeight: 600,
                      background: c.status === 'completed' ? 'rgba(16,185,129,0.1)' : c.status === 'overdue' ? 'rgba(244,63,94,0.1)' : 'rgba(245,158,11,0.1)',
                      color: c.status === 'completed' ? '#10b981' : c.status === 'overdue' ? '#f43f5e' : '#f59e0b',
                    }}>
                      {c.deadline}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function TeamPage() {
  const { members, commitments, sendSimulatedReminder, stats, showToast } = useApp();
  const [sort, setSort] = useState<'score' | 'name' | 'overdue'>('score');
  
  // Invitation states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteLoading, setInviteLoading] = useState(false);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    try {
      const res = await fetch('/api/invite/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send invite');
      }
      showToast(`📧 Invitation sent to ${inviteEmail}!`, 'success');
      setInviteEmail('');
      setShowInviteModal(false);
    } catch (err: any) {
      showToast(err.message || 'Invitation failed', 'error');
    } finally {
      setInviteLoading(false);
    }
  };

  const sorted = [...members].sort((a, b) => {
    if (sort === 'score') return b.reliabilityScore - a.reliabilityScore;
    if (sort === 'name') return a.name.localeCompare(b.name);
    return b.overdue - a.overdue;
  });

  const topPerformer = members.length > 0
    ? [...members].sort((a, b) => b.reliabilityScore - a.reliabilityScore)[0]
    : null;
  const mostRisk = members.length > 0
    ? [...members].sort((a, b) => b.overdue - a.overdue)[0]
    : null;

  return (
    <div>
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}
        >
          <div>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.8rem', marginBottom: 4 }}>
              Team Reliability
            </h1>
            <p style={{ color: '#8899bb', fontSize: '0.9rem' }}>
              {members.length} members · {stats.reliabilityAvg}% average reliability
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={() => setShowInviteModal(true)}
              className="btn-primary"
              style={{ padding: '6px 14px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={12} /> Invite Member
            </button>
            {(['score', 'name', 'overdue'] as const).map(s => (
              <button key={s} onClick={() => setSort(s)}
                style={{
                  padding: '6px 14px', fontSize: '0.78rem', fontWeight: 600,
                  borderRadius: 8, border: '1px solid',
                  borderColor: sort === s ? 'rgba(0,212,255,0.3)' : 'rgba(255,255,255,0.06)',
                  background: sort === s ? 'rgba(0,212,255,0.08)' : 'transparent',
                  color: sort === s ? '#00d4ff' : '#8899bb',
                  cursor: 'pointer', transition: 'all 0.2s', textTransform: 'capitalize',
                }}>
                {s === 'score' ? '↓ Score' : s === 'name' ? 'A-Z' : '⚠ Overdue'}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Summary spotlight cards */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08 } },
          }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 28 }}
        >
          <motion.div
            variants={{
              hidden: { opacity: 0, scale: 0.95, y: 15 },
              show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 120 } },
            }}
            className="glass-card"
            style={{ padding: 20, borderColor: 'rgba(16,185,129,0.15)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Award size={18} color="#10b981" />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Top Performer</span>
            </div>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: '#f0f6ff', marginBottom: 2 }}>
              {topPerformer ? topPerformer.name : 'N/A'}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#8899bb' }}>
              {topPerformer ? `${topPerformer.reliabilityScore}% reliability · ${topPerformer.role}` : 'No data loaded'}
            </div>
          </motion.div>

          <motion.div
            variants={{
              hidden: { opacity: 0, scale: 0.95, y: 15 },
              show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 120 } },
            }}
            className="glass-card"
            style={{ padding: 20, borderColor: 'rgba(244,63,94,0.15)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <AlertTriangle size={18} color="#f43f5e" />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f43f5e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Needs Attention</span>
            </div>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: '#f0f6ff', marginBottom: 2 }}>
              {mostRisk ? mostRisk.name : 'N/A'}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#8899bb' }}>
              {mostRisk ? `${mostRisk.overdue} overdue · ${mostRisk.reliabilityScore}% reliability` : 'No data loaded'}
            </div>
          </motion.div>

          <motion.div
            variants={{
              hidden: { opacity: 0, scale: 0.95, y: 15 },
              show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 120 } },
            }}
            className="glass-card"
            style={{ padding: 20 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <TrendingUp size={18} color="#7c3aed" />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Team Average</span>
            </div>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.8rem', color: '#f0f6ff', lineHeight: 1 }}>
              {stats.reliabilityAvg}%
            </div>
            <div style={{ fontSize: '0.8rem', color: '#8899bb', marginTop: 4 }}>Across {members.length} team members</div>
          </motion.div>
        </motion.div>

        {/* Member cards grid with layout transitions */}
        <motion.div
          layout
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}
        >
          <AnimatePresence>
            {sorted.map(m => (
              <MemberCard key={m.id} member={m} commitments={commitments} onRemind={sendSimulatedReminder} />
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Invite Modal */}
        <AnimatePresence>
          {showInviteModal && (
            <div style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            }} onClick={() => setShowInviteModal(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 15 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="glass-card"
                style={{ width: '100%', maxWidth: 400, padding: 32, margin: 16 }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <h2 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 700, fontSize: '1.2rem' }}>Invite Team Member</h2>
                  <button onClick={() => setShowInviteModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a5a7a' }}>
                    <X size={18} />
                  </button>
                </div>
                <form onSubmit={handleInviteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#8899bb', display: 'block', marginBottom: 6 }}>Email Address *</label>
                    <input
                      type="email"
                      required
                      className="input-field"
                      placeholder="colleague@company.com"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#8899bb', display: 'block', marginBottom: 6 }}>Role</label>
                    <select className="input-field" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                      <option value="member">Member</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                  <button className="btn-primary" type="submit" disabled={inviteLoading} style={{ width: '100%', padding: 12, marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    {inviteLoading ? <Loader2 size={14} className="animate-spin" /> : <>Send Invitation <ArrowRight size={14} /></>}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

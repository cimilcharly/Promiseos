'use client';
// src/app/board/page.tsx — Kanban Commitment Board with Framer Motion

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { useApp } from '@/contexts/AppContext';
import { STATUS_COLUMNS } from '@/lib/mockData';
import { CommitmentStatus, Commitment } from '@/lib/types';
import {
  Plus, X, Mail, Trash2, Calendar, User, Filter, Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function PriorityDot({ priority }: { priority: Commitment['priority'] }) {
  const color = priority === 'high' ? '#f43f5e' : priority === 'medium' ? '#f59e0b' : '#8899bb';
  return <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />;
}

function CommitmentCard({ c, onStatusChange, onDelete, onRemind }: {
  c: Commitment;
  onStatusChange: (id: string, s: CommitmentStatus) => void;
  onDelete: (id: string) => void;
  onRemind: (id: string, owner: string) => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const isOverdue = c.status === 'overdue';

  return (
    <motion.div
      layout
      layoutId={c.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className="commitment-card"
      style={{ borderColor: isOverdue ? 'rgba(244,63,94,0.2)' : undefined }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
        <PriorityDot priority={c.priority} />
        <div style={{ flex: 1, fontSize: '0.82rem', fontWeight: 500, color: '#f0f6ff', lineHeight: 1.4 }}>
          {c.task}
        </div>
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: '#8899bb' }}>
          <User size={10} />
          {c.owner}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: isOverdue ? '#f43f5e' : '#8899bb' }}>
          <Calendar size={10} />
          {c.deadline}
        </div>
        {c.meetingTitle && (
          <div style={{ fontSize: '0.65rem', color: '#4a5a7a', background: 'rgba(255,255,255,0.04)', borderRadius: 4, padding: '1px 6px' }}>
            {c.meetingTitle}
          </div>
        )}
      </div>

      {/* Extra info */}
      {c.notes && (
        <div style={{ fontSize: '0.72rem', color: '#4a5a7a', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 8, marginBottom: 8, lineHeight: 1.4 }}>
          {c.notes}
        </div>
      )}

      {/* Action bar */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ display: 'flex', gap: 4, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8, overflow: 'hidden' }}
          >
            {/* Quick status moves */}
            {c.status !== 'completed' && (
              <button
                onClick={() => onStatusChange(c.id, 'completed')}
                style={{
                  flex: 1, padding: '4px 0', fontSize: '0.68rem', fontWeight: 600,
                  background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                  color: '#10b981', borderRadius: 6, cursor: 'pointer',
                }}
              >
                ✓ Done
              </button>
            )}
            {c.status === 'new' && (
              <button
                onClick={() => onStatusChange(c.id, 'in-progress')}
                style={{
                  flex: 1, padding: '4px 0', fontSize: '0.68rem', fontWeight: 600,
                  background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)',
                  color: '#a855f7', borderRadius: 6, cursor: 'pointer',
                }}
              >
                Start
              </button>
            )}
            <button
              onClick={() => onRemind(c.id, c.owner)}
              style={{
                padding: '4px 8px', fontSize: '0.68rem',
                background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)',
                color: '#f59e0b', borderRadius: 6, cursor: 'pointer',
              }}
              title="Send reminder"
            >
              <Mail size={11} />
            </button>
            <button
              onClick={() => onDelete(c.id)}
              style={{
                padding: '4px 8px', fontSize: '0.68rem',
                background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.1)',
                color: '#f43f5e', borderRadius: 6, cursor: 'pointer',
              }}
              title="Delete"
            >
              <Trash2 size={11} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function BoardPage() {
  const { commitments, updateCommitmentStatus, deleteCommitment, sendSimulatedReminder, addCommitment, members } = useApp();
  const [search, setSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New commitment form
  const [newTask, setNewTask] = useState('');
  const [newOwner, setNewOwner] = useState(members[0]?.name || '');
  const [newDeadline, setNewDeadline] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const filtered = commitments.filter(c => {
    const matchSearch = !search || c.task.toLowerCase().includes(search.toLowerCase()) || c.owner.toLowerCase().includes(search.toLowerCase());
    const matchOwner = !ownerFilter || c.owner === ownerFilter;
    return matchSearch && matchOwner;
  });

  const byStatus = (status: CommitmentStatus) => filtered.filter(c => c.status === status);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    const deadlineDate = newDeadline ? new Date(newDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD';
    addCommitment({
      task: newTask.trim(),
      owner: newOwner,
      deadline: deadlineDate,
      deadlineIso: newDeadline || new Date().toISOString().split('T')[0],
      status: 'new',
      priority: newPriority,
    });
    setNewTask(''); setNewDeadline(''); setShowAddModal(false);
  };

  const ownerList = [...new Set(commitments.map(c => c.owner))];

  return (
    <div>
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}
        >
          <div>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.8rem', marginBottom: 4 }}>
              Commitment Board
            </h1>
            <p style={{ color: '#8899bb', fontSize: '0.9rem' }}>{commitments.length} total commitments tracked</p>
          </div>
          <button className="btn-primary" id="add-commitment-btn" onClick={() => setShowAddModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> Add Commitment
          </button>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}
        >
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#4a5a7a' }} />
            <input
              id="board-search"
              className="input-field"
              placeholder="Search tasks or owners..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 34 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={14} color="#8899bb" />
            <select
              id="owner-filter"
              className="input-field"
              value={ownerFilter}
              onChange={e => setOwnerFilter(e.target.value)}
              style={{ width: 'auto', paddingRight: 24 }}
            >
              <option value="">All Owners</option>
              {ownerList.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </motion.div>

        {/* Kanban */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
          }}
          style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 16 }}
        >
          {STATUS_COLUMNS.map(col => {
            const cards = byStatus(col.key);
            return (
              <motion.div
                key={col.key}
                variants={{
                  hidden: { opacity: 0, y: 15 },
                  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } },
                }}
                className="kanban-col"
                style={{ minWidth: 240 }}
              >
                {/* Column header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f0f6ff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {col.label}
                    </span>
                  </div>
                  <span style={{
                    background: `${col.color}18`, border: `1px solid ${col.color}30`,
                    color: col.color, borderRadius: 999, fontSize: '0.72rem', fontWeight: 700,
                    padding: '1px 8px',
                  }}>
                    {cards.length}
                  </span>
                </div>

                {/* Cards Container with layout animations */}
                <div style={{ minHeight: 400, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <AnimatePresence mode="popLayout">
                    {cards.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ textAlign: 'center', padding: '30px 16px', color: '#4a5a7a', fontSize: '0.78rem' }}
                      >
                        No commitments
                      </motion.div>
                    ) : (
                      cards.map(c => (
                        <CommitmentCard
                          key={c.id} c={c}
                          onStatusChange={updateCommitmentStatus}
                          onDelete={deleteCommitment}
                          onRemind={sendSimulatedReminder}
                        />
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Add Modal */}
        <AnimatePresence>
          {showAddModal && (
            <div style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            }} onClick={() => setShowAddModal(false)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 15 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="glass-card"
                style={{ width: '100%', maxWidth: 440, padding: 32, margin: 16 }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <h2 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 700, fontSize: '1.2rem' }}>Add Commitment</h2>
                  <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a5a7a' }}>
                    <X size={18} />
                  </button>
                </div>
                <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#8899bb', display: 'block', marginBottom: 6 }}>Task / Promise *</label>
                    <textarea
                      id="new-task-input"
                      className="input-field"
                      placeholder="e.g. Send campaign report to Acme Corp"
                      value={newTask}
                      onChange={e => setNewTask(e.target.value)}
                      rows={2}
                      required
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: '#8899bb', display: 'block', marginBottom: 6 }}>Owner</label>
                      <select id="new-owner-select" className="input-field" value={newOwner} onChange={e => setNewOwner(e.target.value)}>
                        {members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: '#8899bb', display: 'block', marginBottom: 6 }}>Priority</label>
                      <select id="new-priority-select" className="input-field" value={newPriority} onChange={e => setNewPriority(e.target.value as typeof newPriority)}>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#8899bb', display: 'block', marginBottom: 6 }}>Deadline</label>
                    <input id="new-deadline-input" type="date" className="input-field" value={newDeadline} onChange={e => setNewDeadline(e.target.value)} />
                  </div>
                  <button id="submit-commitment-btn" className="btn-primary" type="submit" style={{ width: '100%', padding: 12 }}>
                    Add to Board
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

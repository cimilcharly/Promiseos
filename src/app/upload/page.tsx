'use client';
// src/app/upload/page.tsx — Transcript Upload & AI Extraction

import React, { useState, useRef, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import { useApp } from '@/contexts/AppContext';
import { ExtractedCommitment } from '@/lib/types';
import {
  Upload, FileText, Zap, CheckCircle2, X, AlertCircle,
  ChevronRight, RotateCcw, Eye, User, Calendar, Cpu,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const SAMPLE_TRANSCRIPT = `[00:01:05] John Patel: Good morning everyone. Let's go through the updates.
[00:02:14] Sarah Chen: I'll complete the brand identity refresh for FutureMart and send it to the client by Friday.
[00:03:30] John Patel: Perfect. Dave, what about the backend API issues?
[00:04:02] Dave Kim: I'll fix the authentication bug and deploy to staging today. The whole thing should be live by tomorrow.
[00:05:44] Maya Rodriguez: I'll finish the UX audit report for HealthBridge by end of week. I just need the session recordings.
[00:07:11] Priya Nair: I'll follow up with the Zara Fashion account and schedule their onboarding call before Wednesday.
[00:08:33] John Patel: Great. I'll prepare the monthly progress report for all active clients and send it out by Monday.
[00:09:50] Alex Thompson: I'll draft the three blog posts for TechStart's content calendar within the next 3 days.
[00:11:02] Sarah Chen: Also, I'll review and approve all the social media creatives for next month before the end of today.`;

type ExtractionState = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

export default function UploadPage() {
  const { triggerSimulatedExtraction, importCommitments, addMeeting, meetings, showToast } = useApp();

  const [dragOver, setDragOver] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [platform, setPlatform] = useState<'zoom' | 'meet' | 'teams' | 'manual'>('zoom');
  const [state, setState] = useState<ExtractionState>('idle');
  const [progress, setProgress] = useState(0);
  const [extracted, setExtracted] = useState<ExtractedCommitment[]>([]);
  const [editedItems, setEditedItems] = useState<ExtractedCommitment[]>([]);
  const [removedIds, setRemovedIds] = useState<Set<number>>(new Set());
  const [showTranscript, setShowTranscript] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.name.match(/\.(txt|vtt|srt|doc|docx)$/i)) {
      showToast('Please upload a .txt, .vtt, or .srt file', 'error'); return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      setTranscript(e.target?.result as string || '');
      if (!meetingTitle) setMeetingTitle(file.name.replace(/\.[^.]+$/, ''));
      showToast(`📄 File loaded: ${file.name}`, 'success');
    };
    reader.readAsText(file);
  }, [meetingTitle, showToast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const loadSample = () => {
    setTranscript(SAMPLE_TRANSCRIPT);
    setMeetingTitle('Agency Weekly Standup');
    setPlatform('zoom');
    showToast('📋 Sample transcript loaded', 'info');
  };

  const handleExtract = async () => {
    if (!transcript.trim()) { showToast('Please add a transcript first', 'error'); return; }
    if (!meetingTitle.trim()) { showToast('Please enter a meeting title', 'error'); return; }

    setState('uploading');
    setProgress(20);

    // Simulate upload step
    await new Promise(r => setTimeout(r, 500));
    setProgress(45);
    setState('processing');

    // Simulate AI processing
    await new Promise(r => setTimeout(r, 800));
    setProgress(75);

    try {
      const results = await triggerSimulatedExtraction(transcript, meetingTitle);
      setProgress(100);
      setExtracted(results);
      setEditedItems(results.map(r => ({ ...r })));
      setRemovedIds(new Set());
      setState('done');

      // Save meeting record
      addMeeting({
        title: meetingTitle,
        platform,
        transcriptText: transcript,
        processedAt: new Date().toISOString().split('T')[0],
        commitmentCount: results.length,
        summary: `${results.length} commitments detected in this ${platform} meeting.`,
      });
    } catch {
      setState('error');
      showToast('Extraction failed. Please try again.', 'error');
    }
  };

  const handleImport = () => {
    const toImport = editedItems.filter((_, i) => !removedIds.has(i));
    const mtgId = `m-${Date.now()}`;
    importCommitments(toImport, mtgId, meetingTitle);
    setState('idle');
    setTranscript('');
    setExtracted([]);
    setEditedItems([]);
    setMeetingTitle('');
  };

  const toggleRemove = (i: number) => {
    setRemovedIds(prev => {
      const s = new Set(prev);
      s.has(i) ? s.delete(i) : s.add(i);
      return s;
    });
  };

  const updateItem = (i: number, field: keyof ExtractedCommitment, value: string) => {
    setEditedItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  };

  const activeCount = editedItems.filter((_, i) => !removedIds.has(i)).length;

  return (
    <div>
      <Sidebar />
      <main className="main-content">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}
        >
          <div>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.8rem', marginBottom: 4 }}>
              Upload Transcript
            </h1>
            <p style={{ color: '#8899bb', fontSize: '0.9rem' }}>
              {meetings.length} meetings processed · AI extracts commitments automatically
            </p>
          </div>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: state === 'done' ? '1fr 1fr' : '1fr', gap: 24 }}>
          {/* Left panel — upload form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Meeting meta */}
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '1rem', marginBottom: 16 }}>
                Meeting Details
              </h3>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', color: '#8899bb', display: 'block', marginBottom: 6 }}>Meeting Title</label>
                  <input
                    id="meeting-title-input"
                    className="input-field"
                    placeholder="e.g. Agency Weekly Standup"
                    value={meetingTitle}
                    onChange={e => setMeetingTitle(e.target.value)}
                    disabled={state === 'processing' || state === 'uploading'}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#8899bb', display: 'block', marginBottom: 6 }}>Platform</label>
                  <select
                    id="platform-select"
                    className="input-field"
                    value={platform}
                    onChange={e => setPlatform(e.target.value as typeof platform)}
                    style={{ width: 120 }}
                    disabled={state === 'processing' || state === 'uploading'}
                  >
                    <option value="zoom">Zoom</option>
                    <option value="meet">Google Meet</option>
                    <option value="teams">MS Teams</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Drop zone */}
            <AnimatePresence>
            {!transcript && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.3 }}
                className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                id="drop-zone"
              >
                <input ref={fileInputRef} type="file" accept=".txt,.vtt,.srt" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                  style={{ fontSize: '2.5rem', marginBottom: 12 }}
                >📂</motion.div>
                <p style={{ fontWeight: 600, color: '#f0f6ff', marginBottom: 6 }}>Drop transcript file here</p>
                <p style={{ fontSize: '0.82rem', color: '#8899bb', marginBottom: 16 }}>Supports .txt, .vtt, .srt — or paste text below</p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <button className="btn-primary" style={{ fontSize: '0.85rem', padding: '8px 18px' }} onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                    Choose File
                  </button>
                  <button className="btn-secondary" id="load-sample-btn" style={{ fontSize: '0.85rem', padding: '8px 18px' }}
                    onClick={e => { e.stopPropagation(); loadSample(); }}>
                    Load Sample
                  </button>
                </div>
              </motion.div>
            )}
            </AnimatePresence>

            {/* Text area */}
            {(transcript || state !== 'idle') && (
              <div className="glass-card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={14} color="#00d4ff" />
                    <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '0.95rem' }}>Transcript</h3>
                    <span style={{ fontSize: '0.72rem', color: '#4a5a7a' }}>
                      {transcript.split('\n').filter(Boolean).length} lines
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {state === 'done' && (
                      <button className="btn-ghost" style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                        onClick={() => setShowTranscript(!showTranscript)}>
                        <Eye size={11} /> {showTranscript ? 'Hide' : 'Show'}
                      </button>
                    )}
                    <button className="btn-ghost" style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                      onClick={() => { setTranscript(''); setState('idle'); setExtracted([]); }}>
                      <X size={11} /> Clear
                    </button>
                  </div>
                </div>
                {(state !== 'done' || showTranscript) && (
                  <textarea
                    id="transcript-input"
                    className="input-field"
                    placeholder="Paste your Zoom or Google Meet transcript here..."
                    value={transcript}
                    onChange={e => setTranscript(e.target.value)}
                    rows={12}
                    style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '0.78rem' }}
                    disabled={state === 'processing' || state === 'uploading'}
                  />
                )}
              </div>
            )}

            {/* Progress / Extract Button */}
            {transcript && state !== 'done' && (
              <div className="glass-card" style={{ padding: 24 }}>
                {(state === 'uploading' || state === 'processing') ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                      <Cpu size={16} color="#00d4ff" className="animate-spin" />
                      <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                        {state === 'uploading' ? 'Uploading transcript...' : 'AI extracting commitments...'}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#8899bb', marginTop: 8 }}>
                      Gemini is analyzing your transcript for commitments, owners, and deadlines...
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                      className="btn-primary"
                      id="extract-btn"
                      onClick={handleExtract}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem', padding: '12px 24px' }}
                    >
                      <Zap size={16} fill="white" />
                      Extract Commitments with AI
                    </button>
                    {state === 'error' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f43f5e', fontSize: '0.85rem' }}>
                        <AlertCircle size={14} /> Extraction failed — try again
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right panel — extracted commitments */}
          {state === 'done' && extracted.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Review header */}
              <div className="glass-card" style={{ padding: 20, borderColor: 'rgba(0,212,255,0.15)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={18} color="#10b981" />
                    <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1rem' }}>
                      {extracted.length} Commitments Detected
                    </h3>
                  </div>
                  <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                    onClick={() => { setState('idle'); setExtracted([]); }}>
                    <RotateCcw size={11} /> Re-extract
                  </button>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#8899bb' }}>
                  Review and edit the extracted commitments. Uncheck any to exclude them. Then click Import.
                </p>
              </div>

              {/* Extracted cards */}
              <motion.div
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
                style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '55vh', overflowY: 'auto' }}
              >
                {editedItems.map((item, i) => {
                  const removed = removedIds.has(i);
                  const conf = Math.round(item.confidence * 100);
                  return (
                    <motion.div
                      key={i}
                      variants={{ hidden: { opacity: 0, x: 15 }, show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 120 } } }}
                      style={{
                        background: removed ? 'rgba(255,255,255,0.01)' : 'rgba(0,212,255,0.04)',
                        border: `1px solid ${removed ? 'rgba(255,255,255,0.05)' : 'rgba(0,212,255,0.15)'}`,
                        borderRadius: 12, padding: 16, opacity: removed ? 0.4 : 1, transition: 'opacity 0.2s',
                      }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="checkbox"
                            id={`commit-check-${i}`}
                            checked={!removed}
                            onChange={() => toggleRemove(i)}
                            style={{ accentColor: '#00d4ff', width: 14, height: 14 }}
                          />
                          <span style={{
                            fontSize: '0.68rem', fontWeight: 700,
                            color: conf >= 90 ? '#10b981' : conf >= 75 ? '#f59e0b' : '#f43f5e',
                            background: conf >= 90 ? 'rgba(16,185,129,0.1)' : conf >= 75 ? 'rgba(245,158,11,0.1)' : 'rgba(244,63,94,0.1)',
                            padding: '2px 7px', borderRadius: 999,
                          }}>
                            {conf}% confidence
                          </span>
                        </div>
                        <span style={{ fontSize: '0.68rem', color: '#4a5a7a', fontStyle: 'italic', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          "{item.rawText.slice(0, 50)}..."
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div>
                          <label style={{ fontSize: '0.7rem', color: '#8899bb', display: 'block', marginBottom: 4 }}>Task</label>
                          <input
                            className="input-field"
                            value={item.task}
                            onChange={e => updateItem(i, 'task', e.target.value)}
                            style={{ fontSize: '0.82rem', padding: '7px 10px' }}
                            disabled={removed}
                          />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <div>
                            <label style={{ fontSize: '0.7rem', color: '#8899bb', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                              <User size={9} /> Owner
                            </label>
                            <input
                              className="input-field"
                              value={item.owner}
                              onChange={e => updateItem(i, 'owner', e.target.value)}
                              style={{ fontSize: '0.82rem', padding: '7px 10px' }}
                              disabled={removed}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.7rem', color: '#8899bb', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                              <Calendar size={9} /> Deadline
                            </label>
                            <input
                              className="input-field"
                              value={item.deadline}
                              onChange={e => updateItem(i, 'deadline', e.target.value)}
                              style={{ fontSize: '0.82rem', padding: '7px 10px' }}
                              disabled={removed}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>

              {/* Import button */}
              <button
                className="btn-primary"
                id="import-btn"
                onClick={handleImport}
                style={{ width: '100%', padding: 14, fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                Import {activeCount} Commitment{activeCount !== 1 ? 's' : ''} to Board
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {state === 'done' && extracted.length === 0 && (
            <div className="glass-card" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>🔍</div>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, marginBottom: 8 }}>No commitments found</h3>
              <p style={{ color: '#8899bb', fontSize: '0.85rem', marginBottom: 16 }}>
                The AI couldn't detect commitment patterns. Try a transcript with phrases like "I'll", "I will", "we'll complete"...
              </p>
              <button className="btn-secondary" onClick={() => { setState('idle'); setExtracted([]); }}>
                Try Another Transcript
              </button>
            </div>
          )}
        </div>

        {/* Past Meetings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="glass-card"
          style={{ padding: 24, marginTop: 28 }}
        >
          <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '1rem', marginBottom: 16 }}>
            Past Meetings
          </h3>
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}
          >
            {meetings.map(m => (
              <motion.div
                key={m.id}
                variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                whileHover={{ y: -2, transition: { duration: 0.15 } }}
                style={{
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 10, padding: '14px 16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f0f6ff' }}>{m.title}</span>
                  <span style={{
                    fontSize: '0.68rem', color: '#8899bb', background: 'rgba(255,255,255,0.05)',
                    borderRadius: 4, padding: '2px 6px', textTransform: 'capitalize',
                  }}>{m.platform}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#8899bb' }}>
                  {m.commitmentCount} commitments · {m.processedAt || m.uploadedAt}
                </div>
                {m.summary && <div style={{ fontSize: '0.72rem', color: '#4a5a7a', marginTop: 4 }}>{m.summary}</div>}
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}

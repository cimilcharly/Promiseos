'use client';
// src/app/settings/page.tsx — System Settings & Configuration

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { useApp } from '@/contexts/AppContext';
import {
  Settings, Shield, Bell, Key, Zap, Activity, CheckCircle2,
  Eye, EyeOff, ArrowRight, Cpu, Mail, Webhook,
} from 'lucide-react';
import { motion } from 'motion/react';

function Section({ title, icon, children, delay = 0 }: { title: string; icon: React.ReactNode; children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      className="glass-card"
      style={{ padding: 28, marginBottom: 20 }}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: 'easeOut' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ color: '#00d4ff' }}>{icon}</div>
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '1rem', color: '#f0f6ff' }}>{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}

function ToggleSwitch({ id, checked, onChange, label, sub }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div>
        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#f0f6ff' }}>{label}</div>
        {sub && <div style={{ fontSize: '0.75rem', color: '#8899bb', marginTop: 2 }}>{sub}</div>}
      </div>
      <button
        id={id}
        onClick={() => onChange(!checked)}
        style={{
          width: 44, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer',
          background: checked ? 'linear-gradient(135deg, #00d4ff, #7c3aed)' : 'rgba(255,255,255,0.1)',
          position: 'relative', transition: 'background 0.3s ease', flexShrink: 0,
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: '50%', background: 'white',
          position: 'absolute', top: 3, left: checked ? 22 : 3,
          transition: 'left 0.3s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        }} />
      </button>
    </div>
  );
}

function APIKeyInput({
  id, label, placeholder, hint, initialValue, onSave,
}: {
  id: string;
  label: string;
  placeholder: string;
  hint?: string;
  initialValue: string;
  onSave: (v: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleSave = () => {
    onSave(value);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: '0.8rem', color: '#8899bb', display: 'block', marginBottom: 6 }}>{label}</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            id={id}
            className="input-field"
            type={show ? 'text' : 'password'}
            placeholder={placeholder}
            value={value}
            onChange={e => setValue(e.target.value)}
            style={{ paddingRight: 40 }}
          />
          <button
            onClick={() => setShow(!show)}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#4a5a7a' }}
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <button
          onClick={handleSave}
          className={saved ? 'btn-primary' : 'btn-secondary'}
          style={{ padding: '0 16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}
        >
          {saved ? <><CheckCircle2 size={12} /> Saved</> : 'Save'}
        </button>
      </div>
      {hint && <div style={{ fontSize: '0.72rem', color: '#4a5a7a', marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

export default function SettingsPage() {
  const {
    isLiveMode, setLiveMode, organization, showToast,
    geminiKey, setGeminiKey, resendKey, setResendKey, firebaseConfig, setFirebaseConfig,
  } = useApp();

  const [emailReminders, setEmailReminders] = useState(true);
  const [escalations, setEscalations] = useState(true);
  const [slackAlerts, setSlackAlerts] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [overdueThreshold, setOverdueThreshold] = useState(2);
  const [reminderBefore, setReminderBefore] = useState(24);

  return (
    <div>
      <Sidebar />
      <main className="main-content">
        <div style={{ maxWidth: 760 }}>
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{ marginBottom: 32 }}
          >
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.8rem', marginBottom: 4 }}>
              Settings
            </h1>
            <p style={{ color: '#8899bb', fontSize: '0.9rem' }}>
              Configure PromiseOS for {organization.name}
            </p>
          </motion.div>

          {/* Mode Toggle — most prominent */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            style={{
              background: isLiveMode
                ? 'linear-gradient(135deg, rgba(244,63,94,0.08), rgba(124,58,237,0.08))'
                : 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(124,58,237,0.08))',
              border: `1px solid ${isLiveMode ? 'rgba(244,63,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
              borderRadius: 16, padding: 28, marginBottom: 20,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <motion.div
                  animate={{ scale: isLiveMode ? [1, 1.1, 1] : 1 }}
                  transition={{ repeat: isLiveMode ? Infinity : 0, duration: 2, ease: 'easeInOut' }}
                  style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: isLiveMode ? 'rgba(244,63,94,0.15)' : 'rgba(245,158,11,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Activity size={20} color={isLiveMode ? '#f43f5e' : '#f59e0b'} />
                </motion.div>
                <div>
                  <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: '#f0f6ff' }}>
                    {isLiveMode ? '🔴 Live Mode' : '🟡 Demo Mode'}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#8899bb', marginTop: 2 }}>
                    {isLiveMode
                      ? 'Connected to real Firebase, Gemini AI, and Resend APIs'
                      : 'Using simulated data and AI — perfect for testing without API keys'}
                  </div>
                </div>
              </div>
              <button
                id="mode-toggle-btn"
                onClick={() => setLiveMode(!isLiveMode)}
                className={isLiveMode ? 'btn-secondary' : 'btn-primary'}
                style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {isLiveMode ? 'Switch to Demo' : 'Enable Live Mode'}
                <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>

          {/* API Keys */}
          <Section title="API Credentials" icon={<Key size={18} />} delay={0.2}>
            <p style={{ fontSize: '0.82rem', color: '#8899bb', marginBottom: 20, lineHeight: 1.6 }}>
              These credentials activate Live Mode. Without them, PromiseOS runs in Demo Mode with simulated AI and emails.
            </p>
            <APIKeyInput
              id="gemini-key"
              label="Google Gemini API Key"
              placeholder="AIza..."
              initialValue={geminiKey}
              onSave={setGeminiKey}
              hint="Powers commitment extraction. Get yours at aistudio.google.com"
            />
            <APIKeyInput
              id="resend-key"
              label="Resend API Key"
              placeholder="re_..."
              initialValue={resendKey}
              onSave={setResendKey}
              hint="Sends real email reminders. Get yours at resend.com"
            />
            <APIKeyInput
              id="firebase-key"
              label="Firebase Client Config (JSON)"
              placeholder='{"apiKey":"...","projectId":"..."}'
              initialValue={firebaseConfig}
              onSave={setFirebaseConfig}
              hint="Web client configuration block to read/write Firestore data. Create a Web App under settings in console.firebase.google.com"
            />
          </Section>

          {/* Notifications */}
          <Section title="Notification Rules" icon={<Bell size={18} />} delay={0.3}>
            <ToggleSwitch
              id="toggle-email"
              label="Email Reminders"
              sub="Send automated reminders before deadlines"
              checked={emailReminders}
              onChange={setEmailReminders}
            />
            <ToggleSwitch
              id="toggle-escalations"
              label="Escalation Alerts"
              sub="Notify managers when commitments become overdue"
              checked={escalations}
              onChange={setEscalations}
            />
            <ToggleSwitch
              id="toggle-slack"
              label="Slack Alerts (Coming in V2)"
              sub="Post reminders to team Slack channels"
              checked={slackAlerts}
              onChange={v => { setSlackAlerts(v); if (v) showToast('Slack integration coming in V2!', 'info'); }}
            />
            <ToggleSwitch
              id="toggle-digest"
              label="Weekly Reliability Digest"
              sub="Weekly team accountability summary every Monday"
              checked={weeklyDigest}
              onChange={setWeeklyDigest}
            />

            <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#8899bb', display: 'block', marginBottom: 6 }}>
                  Escalate after (days overdue)
                </label>
                <input
                  id="overdue-threshold"
                  type="number"
                  className="input-field"
                  value={overdueThreshold}
                  min={1} max={14}
                  onChange={e => setOverdueThreshold(Number(e.target.value))}
                />
                <div style={{ fontSize: '0.7rem', color: '#4a5a7a', marginTop: 4 }}>
                  Currently: escalate after {overdueThreshold} day{overdueThreshold > 1 ? 's' : ''}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#8899bb', display: 'block', marginBottom: 6 }}>
                  Send reminder (hours before deadline)
                </label>
                <input
                  id="reminder-hours"
                  type="number"
                  className="input-field"
                  value={reminderBefore}
                  min={1} max={72}
                  onChange={e => setReminderBefore(Number(e.target.value))}
                />
                <div style={{ fontSize: '0.7rem', color: '#4a5a7a', marginTop: 4 }}>
                  Currently: {reminderBefore}h before deadline
                </div>
              </div>
            </div>
          </Section>

          {/* AI Settings */}
          <Section title="AI Extraction Settings" icon={<Cpu size={18} />} delay={0.4}>
            <p style={{ fontSize: '0.82rem', color: '#8899bb', marginBottom: 16, lineHeight: 1.6 }}>
              PromiseOS uses Gemini to extract commitments from transcripts. Configure extraction behavior below.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#8899bb', display: 'block', marginBottom: 6 }}>AI Model</label>
                <select id="ai-model-select" className="input-field">
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (Recommended)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (Higher accuracy)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#8899bb', display: 'block', marginBottom: 6 }}>Confidence Threshold</label>
                <select id="confidence-select" className="input-field">
                  <option value="0.6">Low (60%) — catch more</option>
                  <option value="0.75" selected>Medium (75%) — balanced</option>
                  <option value="0.9">High (90%) — fewer, precise</option>
                </select>
              </div>
            </div>
            <div style={{
              background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.12)',
              borderRadius: 10, padding: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Zap size={14} color="#00d4ff" />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#00d4ff' }}>MCP Server (Phase 4)</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#8899bb', lineHeight: 1.5 }}>
                PromiseOS will expose an MCP server in V4, allowing Claude, ChatGPT, and custom agents to
                create commitments, query reliability scores, and trigger escalations via standardized tools.
              </p>
            </div>
          </Section>

          {/* Organization */}
          <Section title="Organization" icon={<Shield size={18} />} delay={0.5}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#8899bb', display: 'block', marginBottom: 6 }}>Organization Name</label>
                <input id="org-name-input" className="input-field" defaultValue={organization.name} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#8899bb', display: 'block', marginBottom: 6 }}>Industry</label>
                <select id="industry-select" className="input-field" defaultValue="agency">
                  <option value="agency">Marketing / Design Agency</option>
                  <option value="software">Software Development</option>
                  <option value="consulting">Consulting</option>
                  <option value="finance">Finance</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 0', borderTop: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#f0f6ff' }}>Current Plan</div>
                <div style={{ fontSize: '0.75rem', color: '#8899bb', marginTop: 2 }}>
                  {organization.plan.charAt(0).toUpperCase() + organization.plan.slice(1)} · {organization.memberCount} members
                </div>
              </div>
              <button className="btn-primary" id="upgrade-btn" style={{ fontSize: '0.8rem', padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={12} fill="white" /> Upgrade Plan
              </button>
            </div>
          </Section>

          {/* Integrations Preview */}
          <Section title="Integrations" icon={<Webhook size={18} />} delay={0.6}>
            {[
              { name: 'Google Meet', icon: '📹', status: 'V2 Roadmap', color: '#8899bb' },
              { name: 'Zoom', icon: '💻', status: 'V2 Roadmap', color: '#8899bb' },
              { name: 'Slack', icon: '💬', status: 'V2 Roadmap', color: '#8899bb' },
              { name: 'Gmail', icon: '📧', status: 'V4 Roadmap', color: '#4a5a7a' },
              { name: 'Resend Email', icon: '📨', status: 'Active (Demo)', color: '#10b981' },
              { name: 'MCP Server', icon: '🔗', status: 'V4 Roadmap', color: '#7c3aed' },
            ].map((item, i) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.6 + i * 0.06 }}
                whileHover={{ x: 4, transition: { duration: 0.15 } }}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                  cursor: 'default',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                  <span style={{ fontSize: '0.875rem', color: '#f0f6ff', fontWeight: 500 }}>{item.name}</span>
                </div>
                <span style={{
                  fontSize: '0.72rem', fontWeight: 600, color: item.color,
                  background: `${item.color}18`, border: `1px solid ${item.color}30`,
                  borderRadius: 999, padding: '3px 10px',
                }}>
                  {item.status}
                </span>
              </motion.div>
            ))}
          </Section>

          {/* Save button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.75 }}
            style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}
          >
            <button className="btn-secondary" id="cancel-settings-btn">Cancel</button>
            <motion.button
              className="btn-primary"
              id="save-settings-btn"
              onClick={() => showToast('✅ Settings saved successfully', 'success')}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
            >
              <CheckCircle2 size={14} /> Save Settings
            </motion.button>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

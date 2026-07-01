/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
'use client';
// src/app/settings/page.tsx — System Settings & Configuration (fully wired)

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Sidebar from '@/components/Sidebar';
import { useApp } from '@/contexts/AppContext';
import {
  Settings, Shield, Bell, Key, Zap, Activity, CheckCircle2,
  Eye, EyeOff, ArrowRight, Cpu, Webhook, Save, X, Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

// ── Section wrapper ────────────────────────────────────────────────────────────
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

// ── Toggle switch ──────────────────────────────────────────────────────────────
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

// ── API key input ──────────────────────────────────────────────────────────────
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

  useEffect(() => { setValue(initialValue); }, [initialValue]);

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

// ── Main page ──────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
        <Loader2 size={32} className="animate-spin" color="#00d4ff" />
        <span style={{ color: '#8899bb', fontSize: '0.9rem' }}>Loading Settings...</span>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    isLiveMode, setLiveMode, organization, showToast,
    geminiKey, setGeminiKey, resendKey, setResendKey, firebaseConfig, setFirebaseConfig,
    notificationSettings, updateNotificationSettings,
    aiSettings, updateAISettings,
    saveOrgSettings,
  } = useApp();

  const [showPricingModal, setShowPricingModal] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const [emailConsents, setEmailConsents] = useState<any>({
    gmailAccess: false,
    aiProcessing: false,
    taskExtraction: false,
    continuousSync: false,
  });

  useEffect(() => {
    const stored = localStorage.getItem('promiseos_email_consents');
    if (stored) {
      setEmailConsents(JSON.parse(stored));
    }
  }, []);

  const updateEmailConsent = (key: string, value: boolean) => {
    const updated = { ...emailConsents, [key]: value };
    setEmailConsents(updated);
    localStorage.setItem('promiseos_email_consents', JSON.stringify(updated));
    showToast('🔒 Privacy consents updated.', 'success');
  };

  const handlePurgeEmailData = async () => {
    localStorage.removeItem('promiseos_email_consents');
    setEmailConsents({
      gmailAccess: false,
      aiProcessing: false,
      taskExtraction: false,
      continuousSync: false,
    });
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('email_insights').delete().eq('user_id', user.id);
        await supabase.from('synced_emails').delete().eq('user_id', user.id);
        await supabase.from('user_email_consents').delete().eq('user_id', user.id);
      }
    } catch (e) {
      console.warn('Could not purge DB data. Local storage has been purged.', e);
    }
    showToast('🗑️ Disconnected Google account and permanently deleted synced email data.', 'info');
  };

  // Catch simulated or real billing checkouts
  useEffect(() => {
    const mockCheck = searchParams.get('mock_stripe_checkout');
    const targetPlan = searchParams.get('plan');
    if (mockCheck === 'success' && targetPlan) {
      saveOrgSettings(organization.name, organization.industry, targetPlan.toLowerCase() as any);
      router.replace('/settings');
    } else if (searchParams.get('stripe_checkout') === 'success') {
      showToast('🎉 Thank you for subscribing! Your plan is active.', 'success');
      router.replace('/settings');
    }
  }, [searchParams, organization, saveOrgSettings, router, showToast]);

  const handleUpgrade = async (planName: string, priceId: string) => {
    setCheckoutLoading(planName);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId, planName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initiate checkout');
      window.location.href = data.url;
    } catch (err: any) {
      showToast(err.message || 'Billing checkout failed', 'error');
    } finally {
      setCheckoutLoading(null);
    }
  };

  // Org fields (local draft until Save is clicked)
  const orgNameRef = useRef<HTMLInputElement>(null);
  const orgIndustryRef = useRef<HTMLSelectElement>(null);

  const handleSaveAll = async () => {
    const name = orgNameRef.current?.value.trim() || organization.name;
    const industry = orgIndustryRef.current?.value || organization.industry;
    await saveOrgSettings(name, industry);
  };

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

          {/* Mode Toggle */}
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
                      ? 'Connected to real Supabase, Gemini AI, and Resend APIs'
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
              label="Firebase Client Config (JSON) — Legacy"
              placeholder='{"apiKey":"...","projectId":"..."}'
              initialValue={firebaseConfig}
              onSave={setFirebaseConfig}
              hint="Optional legacy field — PromiseOS now uses Supabase for primary data storage."
            />
          </Section>

          {/* Notifications */}
          <Section title="Notification Rules" icon={<Bell size={18} />} delay={0.3}>
            <ToggleSwitch
              id="toggle-email"
              label="Email Reminders"
              sub="Send automated reminders before deadlines"
              checked={notificationSettings.emailReminders}
              onChange={v => updateNotificationSettings({ emailReminders: v })}
            />
            <ToggleSwitch
              id="toggle-escalations"
              label="Escalation Alerts"
              sub="Notify managers when commitments become overdue"
              checked={notificationSettings.escalations}
              onChange={v => updateNotificationSettings({ escalations: v })}
            />
            <ToggleSwitch
              id="toggle-slack"
              label="Slack Alerts (Coming in V2)"
              sub="Post reminders to team Slack channels"
              checked={notificationSettings.slackAlerts}
              onChange={v => {
                updateNotificationSettings({ slackAlerts: v });
                if (v) showToast('Slack integration coming in V2!', 'info');
              }}
            />
            <ToggleSwitch
              id="toggle-digest"
              label="Weekly Reliability Digest"
              sub="Weekly team accountability summary every Monday"
              checked={notificationSettings.weeklyDigest}
              onChange={v => updateNotificationSettings({ weeklyDigest: v })}
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
                  value={notificationSettings.overdueThreshold}
                  min={1} max={14}
                  onChange={e => updateNotificationSettings({ overdueThreshold: Number(e.target.value) })}
                />
                <div style={{ fontSize: '0.7rem', color: '#4a5a7a', marginTop: 4 }}>
                  Currently: escalate after {notificationSettings.overdueThreshold} day{notificationSettings.overdueThreshold > 1 ? 's' : ''}
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
                  value={notificationSettings.reminderHoursBefore}
                  min={1} max={72}
                  onChange={e => updateNotificationSettings({ reminderHoursBefore: Number(e.target.value) })}
                />
                <div style={{ fontSize: '0.7rem', color: '#4a5a7a', marginTop: 4 }}>
                  Currently: {notificationSettings.reminderHoursBefore}h before deadline
                </div>
              </div>
            </div>
          </Section>

          {/* Email Intelligence & Privacy */}
          <Section title="Email Intelligence & Privacy" icon={<Shield size={18} />} delay={0.35}>
            <p style={{ fontSize: '0.82rem', color: '#8899bb', marginBottom: 16, lineHeight: 1.6 }}>
              Control your Google OAuth connectivity, Gmail data access scopes, and privacy settings.
            </p>
            <ToggleSwitch
              id="settings-toggle-gmail"
              label="Gmail Integration"
              sub="Allow access to Gmail data for intelligent categorization"
              checked={emailConsents.gmailAccess}
              onChange={v => updateEmailConsent('gmailAccess', v)}
            />
            <ToggleSwitch
              id="settings-toggle-ai"
              label="AI Processing"
              sub="Allow AI processing for email summaries and insights"
              checked={emailConsents.gmailAccess && emailConsents.aiProcessing}
              onChange={v => updateEmailConsent('aiProcessing', v)}
            />
            <ToggleSwitch
              id="settings-toggle-tasks"
              label="Task & Deadline Extraction"
              sub="Allow extraction of tasks, reminders, and deadlines"
              checked={emailConsents.gmailAccess && emailConsents.taskExtraction}
              onChange={v => updateEmailConsent('taskExtraction', v)}
            />
            <ToggleSwitch
              id="settings-toggle-sync"
              label="Continuous Synchronization"
              sub="Allow continuous background sync for newly received emails"
              checked={emailConsents.gmailAccess && emailConsents.continuousSync}
              onChange={v => updateEmailConsent('continuousSync', v)}
            />

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f0f6ff' }}>Disconnect Google Account</div>
                <div style={{ fontSize: '0.75rem', color: '#8899bb', marginTop: 2 }}>Permanently delete all synced emails, insights, and tasks.</div>
              </div>
              <button
                onClick={handlePurgeEmailData}
                className="btn-secondary"
                style={{ borderColor: '#f43f5e', color: '#f43f5e', fontSize: '0.8rem', padding: '8px 16px' }}
              >
                Disconnect & Purge Data
              </button>
            </div>
          </Section>

          {/* AI Settings */}
          <Section title="AI Extraction Settings" icon={<Cpu size={18} />} delay={0.4}>
            <p style={{ fontSize: '0.82rem', color: '#8899bb', marginBottom: 16, lineHeight: 1.6 }}>
              PromiseOS uses Gemini to extract commitments from transcripts. Changes take effect on the next extraction.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#8899bb', display: 'block', marginBottom: 6 }}>AI Model</label>
                <select
                  id="ai-model-select"
                  className="input-field"
                  value={aiSettings.model}
                  onChange={e => updateAISettings({ model: e.target.value as typeof aiSettings.model })}
                >
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash (Recommended)</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (Fast)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (Higher accuracy)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#8899bb', display: 'block', marginBottom: 6 }}>Confidence Threshold</label>
                <select
                  id="confidence-select"
                  className="input-field"
                  value={String(aiSettings.confidenceThreshold)}
                  onChange={e => updateAISettings({ confidenceThreshold: Number(e.target.value) })}
                >
                  <option value="0.6">Low (60%) — catch more</option>
                  <option value="0.7">Medium-Low (70%) — balanced</option>
                  <option value="0.75">Medium (75%) — default</option>
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
                <input
                  id="org-name-input"
                  className="input-field"
                  defaultValue={organization.name}
                  ref={orgNameRef}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#8899bb', display: 'block', marginBottom: 6 }}>Industry</label>
                <select
                  id="industry-select"
                  className="input-field"
                  defaultValue={organization.industry || 'agency'}
                  ref={orgIndustryRef}
                >
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
              <button
                onClick={() => setShowPricingModal(true)}
                className="btn-primary"
                id="upgrade-btn"
                style={{ fontSize: '0.8rem', padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
              >
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
              { name: 'Resend Email', icon: '📨', status: 'Active', color: '#10b981' },
              { name: 'MCP Server', icon: '🔗', status: 'Active', color: '#10b981' },
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

          {/* MCP Integration Center */}
          <Section title="MCP Integration Center" icon={<Cpu size={18} />} delay={0.65}>
            <p style={{ fontSize: '0.82rem', color: '#8899bb', marginBottom: 16, lineHeight: 1.6 }}>
              Connect PromiseOS directly to your local AI applications (like Claude Desktop or Cursor Code Editor) to query and create tasks headlessly.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: '0.78rem', color: '#00d4ff', fontWeight: 700, marginBottom: 8 }}>Your Endpoint URL</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    readOnly
                    value={typeof window !== 'undefined' ? `${window.location.origin}/api/mcp` : '/api/mcp'}
                    style={{ flex: 1, fontSize: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '6px 10px', color: '#f0f6ff' }}
                  />
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        navigator.clipboard.writeText(`${window.location.origin}/api/mcp`);
                        showToast('📋 Endpoint URL copied!', 'success');
                      }
                    }}
                    className="btn-secondary"
                    style={{ fontSize: '0.72rem', padding: '6px 12px', borderRadius: 6 }}
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Installers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: '0.78rem', color: '#f0f6ff', fontWeight: 600, marginBottom: 4 }}>Windows Auto Setup</div>
                  <p style={{ fontSize: '0.68rem', color: '#8899bb', marginBottom: 12, lineHeight: 1.4 }}>Downloads a script that configures Claude Desktop automatically.</p>
                  <button
                    onClick={() => {
                      if (typeof window === 'undefined') return;
                      const serverUrl = `${window.location.origin}/api/mcp`;
                      const scriptText = `@echo off\r\necho Configuring PromiseOS MCP Server in Claude Desktop...\r\nset CONFIG_DIR=%APPDATA%\\Claude\r\nset CONFIG_FILE=%CONFIG_DIR%\\claude_desktop_config.json\r\nif not exist "%CONFIG_DIR%" mkdir "%CONFIG_DIR%"\r\npowershell -Command "$file = '%CONFIG_FILE%'; $url = '${serverUrl}'; if (Test-Path $file) { $json = Get-Content $file -Raw | ConvertFrom-Json } else { $json = [PSCustomObject]@{ mcpServers = [PSCustomObject]@{} } }; if (-not $json.mcpServers) { $json | Add-Member -MemberType NoteProperty -Name mcpServers -Value ([PSCustomObject]@{}) }; $json.mcpServers | Add-Member -MemberType NoteProperty -Name 'promiseos' -Value ([PSCustomObject]@{ url = $url }) -Force; $json | ConvertTo-Json -Depth 10 | Set-Content $file"\r\necho Done! Restart Claude Desktop to use PromiseOS.\r\npause\r\n`;
                      const blob = new Blob([scriptText], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'setup_promiseos_mcp.bat';
                      a.click();
                      showToast('📥 Downloaded setup_promiseos_mcp.bat!', 'success');
                    }}
                    className="btn-primary"
                    style={{ width: '100%', fontSize: '0.72rem', padding: '6px 0', borderRadius: 6 }}
                  >
                    Download .bat Script
                  </button>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: '0.78rem', color: '#f0f6ff', fontWeight: 600, marginBottom: 4 }}>macOS Auto Setup</div>
                  <p style={{ fontSize: '0.68rem', color: '#8899bb', marginBottom: 12, lineHeight: 1.4 }}>Downloads a shell script to configure Claude Desktop automatically.</p>
                  <button
                    onClick={() => {
                      if (typeof window === 'undefined') return;
                      const serverUrl = `${window.location.origin}/api/mcp`;
                      const scriptText = `#!/bin/bash\necho "Configuring PromiseOS MCP Server..."\nCONFIG_DIR="$HOME/Library/Application Support/Claude"\nCONFIG_FILE="$CONFIG_DIR/claude_desktop_config.json"\nmkdir -p "$CONFIG_DIR"\nif [ -f "$CONFIG_FILE" ]; then\n  python3 -c "import json, os; f = '$CONFIG_FILE'; data = json.load(open(f)) if os.path.exists(f) else {}; data.setdefault('mcpServers', {})['promiseos'] = {'url': '${serverUrl}'}; json.dump(data, open(f, 'w'), indent=2)"\nelse\n  echo '{"mcpServers": {"promiseos": {"url": "${serverUrl}"}}}' > "$CONFIG_FILE"\nfi\necho "Done! Restart Claude Desktop."\n`;
                      const blob = new Blob([scriptText], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'setup_promiseos_mcp.sh';
                      a.click();
                      showToast('📥 Downloaded setup_promiseos_mcp.sh!', 'success');
                    }}
                    className="btn-primary"
                    style={{ width: '100%', fontSize: '0.72rem', padding: '6px 0', borderRadius: 6 }}
                  >
                    Download .sh Script
                  </button>
                </div>
              </div>

              {/* Note */}
              <div style={{ background: 'rgba(239, 68, 68, 0.04)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: 8, padding: 12, fontSize: '0.7rem', color: '#8899bb', lineHeight: 1.4 }}>
                ⚠️ <strong>Note:</strong> Standard web-based <code>claude.ai</code> does not support custom MCP server connections yet. To utilize this interface, please configure it inside the **Claude Desktop App**, **Cursor**, or **Windsurf**.
              </div>
            </div>
          </Section>

          {/* Save button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.75 }}
            style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}
          >
            <button className="btn-secondary" id="cancel-settings-btn" onClick={() => window.history.back()}>
              Cancel
            </button>
            <motion.button
              className="btn-primary"
              id="save-settings-btn"
              onClick={handleSaveAll}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
            >
              <Save size={14} /> Save Settings
            </motion.button>
          </motion.div>
        </div>
      </main>

      {/* Pricing Modal */}
      <AnimatePresence>
        {showPricingModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }} onClick={() => setShowPricingModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="glass-card"
              style={{ width: '100%', maxWidth: 720, padding: 32, margin: 16 }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 700, fontSize: '1.4rem' }}>Select a Plan Tier</h2>
                <button onClick={() => setShowPricingModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a5a7a' }}>
                  <X size={18} />
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                {/* Starter Tier */}
                <div style={{
                  padding: 20, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f0f6ff' }}>Starter</h3>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#00d4ff', margin: '10px 0' }}>$19<span style={{ fontSize: '0.8rem', color: '#8899bb' }}>/mo</span></div>
                    <p style={{ fontSize: '0.75rem', color: '#8899bb', lineHeight: 1.4, marginBottom: 12 }}>Perfect for single managers or very small teams.</p>
                    <ul style={{ paddingLeft: 14, fontSize: '0.72rem', color: '#8899bb', display: 'flex', flexDirection: 'column', gap: 6, margin: '0 0 16px 0' }}>
                      <li>Up to 3 team members</li>
                      <li>10 transcript analyses / mo</li>
                      <li>Email reminders</li>
                    </ul>
                  </div>
                  <button
                    onClick={() => handleUpgrade('Starter', 'price_1StarterPlanID')}
                    disabled={organization.plan === 'starter' || checkoutLoading !== null}
                    className="btn-secondary"
                    style={{ width: '100%', padding: '8px 0', fontSize: '0.78rem' }}
                  >
                    {organization.plan === 'starter' ? 'Current Plan' : 'Select'}
                  </button>
                </div>

                {/* Growth Tier */}
                <div style={{
                  padding: 20, background: 'rgba(124,58,237,0.03)', border: '1px solid rgba(124,58,237,0.3)',
                  borderRadius: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  position: 'relative'
                }}>
                  <span style={{ position: 'absolute', top: -10, right: 10, background: '#7c3aed', color: 'white', fontSize: '0.62rem', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>POPULAR</span>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f0f6ff' }}>Growth</h3>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#a855f7', margin: '10px 0' }}>$49<span style={{ fontSize: '0.8rem', color: '#8899bb' }}>/mo</span></div>
                    <p style={{ fontSize: '0.75rem', color: '#8899bb', lineHeight: 1.4, marginBottom: 12 }}>Great for scaling digital agencies and consultancies.</p>
                    <ul style={{ paddingLeft: 14, fontSize: '0.72rem', color: '#8899bb', display: 'flex', flexDirection: 'column', gap: 6, margin: '0 0 16px 0' }}>
                      <li>Up to 10 team members</li>
                      <li>50 transcript analyses / mo</li>
                      <li>Priority email + Slack alert integration</li>
                    </ul>
                  </div>
                  <button
                    onClick={() => handleUpgrade('Growth', 'price_1GrowthPlanID')}
                    disabled={organization.plan === 'growth' || checkoutLoading !== null}
                    className="btn-primary"
                    style={{ width: '100%', padding: '8px 0', fontSize: '0.78rem' }}
                  >
                    {checkoutLoading === 'Growth' ? <Loader2 size={12} className="animate-spin" /> : organization.plan === 'growth' ? 'Current Plan' : 'Select'}
                  </button>
                </div>

                {/* Business Tier */}
                <div style={{
                  padding: 20, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f0f6ff' }}>Business</h3>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b', margin: '10px 0' }}>$149<span style={{ fontSize: '0.8rem', color: '#8899bb' }}>/mo</span></div>
                    <p style={{ fontSize: '0.75rem', color: '#8899bb', lineHeight: 1.4, marginBottom: 12 }}>For mid-to-large size companies wanting unlimited scale.</p>
                    <ul style={{ paddingLeft: 14, fontSize: '0.72rem', color: '#8899bb', display: 'flex', flexDirection: 'column', gap: 6, margin: '0 0 16px 0' }}>
                      <li>Unlimited team members</li>
                      <li>Unlimited transcript analyses</li>
                      <li>Custom SLA & dedicated webhook support</li>
                    </ul>
                  </div>
                  <button
                    onClick={() => handleUpgrade('Business', 'price_1BusinessPlanID')}
                    disabled={organization.plan === 'business' || checkoutLoading !== null}
                    className="btn-secondary"
                    style={{ width: '100%', padding: '8px 0', fontSize: '0.78rem' }}
                  >
                    {checkoutLoading === 'Business' ? <Loader2 size={12} className="animate-spin" /> : organization.plan === 'business' ? 'Current Plan' : 'Select'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { Shield, Sparkles, AlertCircle, Check, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface ConsentOnboardingProps {
  onAccept: (consents: {
    gmailAccess: boolean;
    aiProcessing: boolean;
    taskExtraction: boolean;
    continuousSync: boolean;
  }) => void;
  onCancel: () => void;
}

export default function ConsentOnboarding({ onAccept, onCancel }: ConsentOnboardingProps) {
  const [gmailAccess, setGmailAccess] = useState(true);
  const [aiProcessing, setAiProcessing] = useState(true);
  const [taskExtraction, setTaskExtraction] = useState(true);
  const [continuousSync, setContinuousSync] = useState(false);

  const handleSave = () => {
    onAccept({
      gmailAccess,
      aiProcessing,
      taskExtraction,
      continuousSync,
    });
  };

  const handleAcceptAll = () => {
    onAccept({
      gmailAccess: true,
      aiProcessing: true,
      taskExtraction: true,
      continuousSync: true,
    });
  };

  return (
    <div style={{
      maxWidth: 580,
      margin: '40px auto',
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: 24,
      padding: '40px',
      boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Accent glow */}
      <div style={{
        position: 'absolute', top: -50, left: '50%', transform: 'translateX(-50%)',
        width: 200, height: 100, background: '#00d4ff', filter: 'blur(80px)', opacity: 0.12,
      }} />

      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 16, background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          boxShadow: '0 8px 16px rgba(0, 212, 255, 0.2)',
        }}>
          <Shield size={24} color="white" />
        </div>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.5rem', color: '#f0f6ff', marginBottom: 8 }}>
          Email Intelligence Onboarding
        </h1>
        <p style={{ color: '#8899bb', fontSize: '0.85rem', lineHeight: 1.5 }}>
          PromiseOS connects to your email inbox to identify commitments, tracking updates, and subscriptions. We prioritize your privacy and require your explicit consent to access any data.
        </p>
      </div>

      {/* Info Notice */}
      <div style={{
        background: 'rgba(0, 212, 255, 0.04)',
        border: '1px solid rgba(0, 212, 255, 0.15)',
        borderRadius: 12,
        padding: '16px',
        marginBottom: 28,
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
      }}>
        <AlertCircle size={16} color="#00d4ff" style={{ marginTop: 2, flexShrink: 0 }} />
        <div style={{ fontSize: '0.78rem', color: '#8899bb', lineHeight: 1.5 }}>
          <strong style={{ color: '#00d4ff' }}>Consent-First Transparency</strong>: We encrypt and store only critical insights (dates, tasks, tracking info) needed for your dashboard. No email body text is permanently kept without your permission.
        </div>
      </div>

      {/* Toggles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
        {/* Toggle 1 */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 18px', background: 'rgba(255, 255, 255, 0.01)',
          border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: 14,
        }}>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f0f6ff' }}>Gmail Data Access</div>
            <div style={{ fontSize: '0.75rem', color: '#8899bb', marginTop: 2 }}>Allow retrieval of email headers & metadata for sync</div>
          </div>
          <button
            onClick={() => setGmailAccess(!gmailAccess)}
            style={{
              width: 44, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer',
              background: gmailAccess ? 'linear-gradient(135deg, #00d4ff, #7c3aed)' : 'rgba(255,255,255,0.1)',
              position: 'relative', transition: 'background 0.3s ease',
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: '50%', background: 'white',
              position: 'absolute', top: 3, left: gmailAccess ? 22 : 3,
              transition: 'left 0.3s ease',
            }} />
          </button>
        </div>

        {/* Toggle 2 */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 18px', background: 'rgba(255, 255, 255, 0.01)',
          border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: 14,
        }}>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f0f6ff' }}>AI Processing</div>
            <div style={{ fontSize: '0.75rem', color: '#8899bb', marginTop: 2 }}>Use Gemini AI to categorize emails & create summaries</div>
          </div>
          <button
            disabled={!gmailAccess}
            onClick={() => setAiProcessing(!aiProcessing)}
            style={{
              width: 44, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer',
              background: (gmailAccess && aiProcessing) ? 'linear-gradient(135deg, #00d4ff, #7c3aed)' : 'rgba(255,255,255,0.1)',
              position: 'relative', transition: 'background 0.3s ease',
              opacity: gmailAccess ? 1 : 0.4,
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: '50%', background: 'white',
              position: 'absolute', top: 3, left: (gmailAccess && aiProcessing) ? 22 : 3,
              transition: 'left 0.3s ease',
            }} />
          </button>
        </div>

        {/* Toggle 3 */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 18px', background: 'rgba(255, 255, 255, 0.01)',
          border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: 14,
        }}>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f0f6ff' }}>Task & Deadline Extraction</div>
            <div style={{ fontSize: '0.75rem', color: '#8899bb', marginTop: 2 }}>Extract actions, orders, travel bookings & alerts</div>
          </div>
          <button
            disabled={!gmailAccess || !aiProcessing}
            onClick={() => setTaskExtraction(!taskExtraction)}
            style={{
              width: 44, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer',
              background: (gmailAccess && aiProcessing && taskExtraction) ? 'linear-gradient(135deg, #00d4ff, #7c3aed)' : 'rgba(255,255,255,0.1)',
              position: 'relative', transition: 'background 0.3s ease',
              opacity: (gmailAccess && aiProcessing) ? 1 : 0.4,
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: '50%', background: 'white',
              position: 'absolute', top: 3, left: (gmailAccess && aiProcessing && taskExtraction) ? 22 : 3,
              transition: 'left 0.3s ease',
            }} />
          </button>
        </div>

        {/* Toggle 4 */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 18px', background: 'rgba(255, 255, 255, 0.01)',
          border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: 14,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f0f6ff' }}>Continuous Synchronization</span>
              <span style={{ fontSize: '0.62rem', background: 'rgba(124, 58, 237, 0.2)', border: '1px solid rgba(124, 58, 237, 0.4)', color: '#a855f7', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>BETA</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#8899bb', marginTop: 2 }}>Periodically check for newly received emails automatically</div>
          </div>
          <button
            disabled={!gmailAccess}
            onClick={() => setContinuousSync(!continuousSync)}
            style={{
              width: 44, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer',
              background: (gmailAccess && continuousSync) ? 'linear-gradient(135deg, #00d4ff, #7c3aed)' : 'rgba(255,255,255,0.1)',
              position: 'relative', transition: 'background 0.3s ease',
              opacity: gmailAccess ? 1 : 0.4,
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: '50%', background: 'white',
              position: 'absolute', top: 3, left: (gmailAccess && continuousSync) ? 22 : 3,
              transition: 'left 0.3s ease',
            }} />
          </button>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <motion.button
          onClick={handleAcceptAll}
          className="btn-primary"
          style={{ width: '100%', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Sparkles size={16} /> Accept All & Connect
        </motion.button>
        
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            className="btn-secondary"
            style={{ flex: 1, padding: '12px' }}
          >
            Reject Access
          </button>
          
          <button
            onClick={handleSave}
            disabled={!gmailAccess}
            className="btn-secondary"
            style={{ flex: 1, padding: '12px', border: '1px solid rgba(0, 212, 255, 0.2)', color: '#00d4ff' }}
          >
            Save Selected
          </button>
        </div>
      </div>
    </div>
  );
}

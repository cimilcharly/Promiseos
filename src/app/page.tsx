'use client';
// src/app/page.tsx — Landing Page / Auth Gate with Framer Motion

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, ArrowRight, Shield, TrendingUp, Bell, BarChart3 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { motion, AnimatePresence } from 'motion/react';

const FLOW_STEPS = [
  { icon: '💬', label: 'Conversation', sub: 'Zoom · Meet · Slack' },
  { icon: '🤖', label: 'AI Detects', sub: 'Promises extracted' },
  { icon: '📋', label: 'Tracked', sub: 'Owner assigned' },
  { icon: '🔔', label: 'Reminded', sub: 'Auto reminders' },
  { icon: '✅', label: 'Delivered', sub: 'Reliability scored' },
];

const FEATURES = [
  { icon: <Shield size={20} />, title: 'Commitment Detection', desc: 'AI reads transcripts and extracts every promise made, with owner and deadline.', color: '#00d4ff' },
  { icon: <TrendingUp size={20} />, title: 'Reliability Scores', desc: "Track each team member's delivery rate. Know who to trust with critical tasks.", color: '#7c3aed' },
  { icon: <Bell size={20} />, title: 'Smart Reminders', desc: 'Automated reminders and escalations before deadlines slip past.', color: '#f59e0b' },
  { icon: <BarChart3 size={20} />, title: 'Team Analytics', desc: 'Spot bottlenecks, patterns, and which meetings produce the most broken promises.', color: '#10b981' },
];

export default function LandingPage() {
  const router = useRouter();
  const { showToast } = useApp();
  const handleEnterDemo = () => {
    showToast('👋 Welcome to PromiseOS Demo — Apex Digital Agency loaded!', 'success');
    router.push('/dashboard');
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      {/* Hero */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 32px 60px' }}>
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, type: 'spring' }}
          style={{ textAlign: 'center', marginBottom: 24 }}
        >
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)',
            borderRadius: 999, padding: '5px 14px', fontSize: '0.8rem', color: '#00d4ff', fontWeight: 500,
          }}>
            <Zap size={12} fill="#00d4ff" /> AI-Powered Commitment Intelligence · V1 MVP
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          style={{
            fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 'clamp(2.4rem, 6vw, 4rem)',
            textAlign: 'center', lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 24,
          }}
        >
          Every promise made in your{' '}
          <span className="gradient-text">meetings</span>
          <br />automatically becomes{' '}
          <span className="gradient-text-warm">accountable execution.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          style={{
            textAlign: 'center', color: '#8899bb', fontSize: '1.15rem', maxWidth: 580,
            margin: '0 auto 40px', lineHeight: 1.7,
          }}
        >
          PromiseOS detects commitments in Zoom, Meet & Slack transcripts,
          assigns ownership, sends reminders, and tracks reliability. No more forgotten deadlines.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 64 }}
        >
          <button className="btn-primary" id="enter-demo-btn" onClick={handleEnterDemo}
            style={{ fontSize: '1rem', padding: '13px 28px', display: 'flex', alignItems: 'center', gap: 8 }}>
            Enter Demo <ArrowRight size={16} />
          </button>
          <button className="btn-secondary" id="signup-btn" onClick={() => router.push('/login')}
            style={{ fontSize: '1rem', padding: '13px 28px' }}>
            Create Free Account
          </button>
        </motion.div>

        {/* Flow diagram (Staggered Entry) */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: {
              transition: { staggerChildren: 0.1, delayChildren: 0.4 },
            },
          }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, flexWrap: 'wrap', marginBottom: 80 }}
        >
          {FLOW_STEPS.map((step, i) => (
            <React.Fragment key={step.label}>
              <motion.div
                variants={{
                  hidden: { opacity: 0, scale: 0.85, y: 15 },
                  show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 100 } },
                }}
                whileHover={{ scale: 1.05, borderColor: 'rgba(0, 212, 255, 0.3)' }}
                style={{
                  textAlign: 'center', padding: '16px 20px',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 12, minWidth: 110, cursor: 'default',
                }}
              >
                <div style={{ fontSize: '1.6rem', marginBottom: 6 }}>{step.icon}</div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#f0f6ff' }}>{step.label}</div>
                <div style={{ fontSize: '0.7rem', color: '#4a5a7a', marginTop: 2 }}>{step.sub}</div>
              </motion.div>
              {i < FLOW_STEPS.length - 1 && (
                <motion.div
                  variants={{ hidden: { opacity: 0 }, show: { opacity: 0.4 } }}
                  style={{ color: '#4a5a7a', fontSize: '1.2rem', padding: '0 4px' }}
                >
                  →
                </motion.div>
              )}
            </React.Fragment>
          ))}
        </motion.div>

        {/* Features grid */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.8rem', marginBottom: 8 }}>
            Built for agencies that care about delivery
          </h2>
          <p style={{ color: '#8899bb', fontSize: '0.95rem' }}>Stop losing clients over forgotten promises</p>
        </div>

        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.15, delayChildren: 0.6 } },
          }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 80 }}
        >
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              variants={{
                hidden: { opacity: 0, y: 20 },
                show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
              }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="glass-card"
              style={{ padding: '24px' }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: `${f.color}18`, border: `1px solid ${f.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: f.color, marginBottom: 14,
              }}>{f.icon}</div>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '1rem', marginBottom: 8, color: '#f0f6ff' }}>{f.title}</h3>
              <p style={{ fontSize: '0.85rem', color: '#8899bb', lineHeight: 1.6 }}>{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          style={{ display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap' }}
        >
          {[
            { value: '94%', label: 'Avg team reliability gain' },
            { value: '3x', label: 'Fewer missed deadlines' },
            { value: '< 2min', label: 'To process a transcript' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div className="gradient-text" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '2rem' }}>{s.value}</div>
              <div style={{ fontSize: '0.8rem', color: '#8899bb' }}>{s.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
  );
}

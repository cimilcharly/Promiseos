'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { motion } from 'motion/react';
import { Shield, Users, ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

function InviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const supabase = createClient();
  const { showToast } = useApp();

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<{ orgName: string; email: string; role: string } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Missing invitation token');
      setLoading(false);
      return;
    }

    // Save token in session storage for registration flows
    sessionStorage.setItem('promiseos_invite_token', token);

    const checkInviteAndAuth = async () => {
      try {
        // 1. Get current user session
        const { data: { session } } = await supabase.auth.getSession();
        setIsLoggedIn(!!session?.user);

        // 2. Fetch invitation data using a public lookup (RPC or regular select since RLS allows select for matching email/token)
        // Note: In local/demo mode, we might mock. In live mode, we fetch from Supabase.
        const { data: invite, error: inviteError } = await supabase
          .from('invitations')
          .select('email, role, status, expires_at, organizations(name)')
          .eq('token', token)
          .maybeSingle();

        if (inviteError || !invite) {
          throw new Error('Invalid or expired invitation token');
        }

        if (invite.status !== 'pending') {
          throw new Error(`This invitation has already been ${invite.status}`);
        }

        if (new Date(invite.expires_at) < new Date()) {
          throw new Error('This invitation has expired');
        }

        setInviteData({
          orgName: (invite.organizations as any)?.name || 'their organization',
          email: invite.email,
          role: invite.role,
        });
      } catch (err: any) {
        setError(err.message || 'Failed to load invitation');
      } finally {
        setLoading(false);
      }
    };

    checkInviteAndAuth();
  }, [token, supabase]);

  const handleAcceptInvite = async () => {
    if (!token) return;
    setAccepting(true);
    setError(null);

    try {
      const res = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to accept invitation');
      }

      showToast(`🎉 Welcome to ${inviteData?.orgName || 'the workspace'}!`, 'success');
      // Clear token since it's used
      sessionStorage.removeItem('promiseos_invite_token');
      
      // Redirect to dashboard
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Could not join workspace');
    } finally {
      setAccepting(false);
    }
  };

  const handleRedirectToLogin = () => {
    router.push(`/login?invite_token=${token}`);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <Loader2 size={32} className="animate-spin" color="#00d4ff" />
        <span style={{ color: '#8899bb', fontSize: '0.9rem' }}>Validating invitation token...</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, type: 'spring', stiffness: 100 }}
      style={{
        width: '100%',
        maxWidth: 440,
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 24,
        padding: 40,
        boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Glow effect */}
      <div style={{
        position: 'absolute', top: -50, left: '50%', transform: 'translateX(-50%)',
        width: 200, height: 100, background: '#7c3aed', filter: 'blur(80px)', opacity: 0.15,
      }} />

      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 16, background: 'linear-gradient(135deg, #7c3aed, #00d4ff)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          boxShadow: '0 8px 16px rgba(124, 58, 237, 0.2)',
        }}>
          <Users size={24} color="white" />
        </div>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.6rem', color: '#f0f6ff', marginBottom: 8 }}>
          Workspace Invite
        </h1>
        <p style={{ color: '#8899bb', fontSize: '0.9rem' }}>
          {error ? 'Oops, something went wrong' : `You've been invited to join a workspace`}
        </p>
      </div>

      {error ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)',
            borderRadius: 12, padding: 16, marginBottom: 24,
            display: 'flex', alignItems: 'center', gap: 10, color: '#f43f5e', fontSize: '0.85rem',
            textAlign: 'left'
          }}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
          <button onClick={() => router.push('/')} className="btn-secondary" style={{ width: '100%', padding: '12px' }}>
            Go to Landing Page
          </button>
        </div>
      ) : (
        <div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255,255,255,0.04)',
            borderRadius: 16, padding: 20, marginBottom: 28, textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.8rem', color: '#4a5a7a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>INVITATION FOR</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f0f6ff', marginBottom: 16 }}>{inviteData?.email}</div>

            <div style={{ fontSize: '0.8rem', color: '#4a5a7a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>WORKSPACE TO JOIN</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#00d4ff', fontFamily: 'Outfit, sans-serif' }}>{inviteData?.orgName}</div>
            <div style={{ fontSize: '0.75rem', color: '#8899bb', marginTop: 4 }}>Role: {inviteData?.role}</div>
          </div>

          {isLoggedIn ? (
            <button
              onClick={handleAcceptInvite}
              disabled={accepting}
              className="btn-primary"
              style={{
                width: '100%', padding: '14px', fontSize: '0.95rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {accepting ? <Loader2 size={18} className="animate-spin" /> : <>Accept & Join Workspace <CheckCircle2 size={16} /></>}
            </button>
          ) : (
            <div>
              <button
                onClick={handleRedirectToLogin}
                className="btn-primary"
                style={{
                  width: '100%', padding: '14px', fontSize: '0.95rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  marginBottom: 16
                }}
              >
                Sign In to Accept <ArrowRight size={16} />
              </button>
              <p style={{ textAlign: 'center', fontSize: '0.78rem', color: '#4a5a7a' }}>
                Don't have an account? Storing your invite token; simply register after clicking.
              </p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default function InvitePage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'radial-gradient(circle at 50% -20%, #1a1b2e 0%, #0a0b10 100%)',
    }}>
      <Suspense fallback={
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <Loader2 size={32} className="animate-spin" color="#00d4ff" />
          <span style={{ color: '#8899bb', fontSize: '0.9rem' }}>Loading invite...</span>
        </div>
      }>
        <InviteContent />
      </Suspense>
    </div>
  );
}

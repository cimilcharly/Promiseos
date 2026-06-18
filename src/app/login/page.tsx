/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { motion } from 'motion/react';
import { Shield, Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const { showToast } = useApp();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        showToast('Successfully logged in!', 'success');
        
        const inviteToken = sessionStorage.getItem('promiseos_invite_token') || new URLSearchParams(window.location.search).get('invite_token');
        if (inviteToken) {
          router.push(`/invite?token=${inviteToken}`);
        } else {
          router.push('/dashboard');
        }
        router.refresh(); // Refresh to trigger middleware
      } else {
        const inviteToken = sessionStorage.getItem('promiseos_invite_token') || new URLSearchParams(window.location.search).get('invite_token');
        let signUpOptions: any = {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        };

        if (inviteToken) {
          // Verify token and fetch associated org_id
          const { data: invite } = await supabase
            .from('invitations')
            .select('org_id, role')
            .eq('token', inviteToken)
            .maybeSingle();

          if (invite) {
            signUpOptions.data = {
              org_id: invite.org_id,
              role: invite.role
            };
          }
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: signUpOptions,
        });
        if (error) throw error;
        
        if (inviteToken) {
          showToast('Registration successful! Use the sign in form to complete invitation accept.', 'success');
        } else {
          showToast('Registration successful! You can now log in.', 'success');
        }
        setIsLogin(true); // Switch to login after signup
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      // Store token from URL in sessionStorage before redirecting if it exists
      const inviteToken = new URLSearchParams(window.location.search).get('invite_token');
      if (inviteToken) {
        sessionStorage.setItem('promiseos_invite_token', inviteToken);
      }
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Google authentication failed');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'radial-gradient(circle at 50% -20%, #1a1b2e 0%, #0a0b10 100%)',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring', stiffness: 100 }}
        style={{
          width: '100%',
          maxWidth: 420,
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
          width: 200, height: 100, background: '#00d4ff', filter: 'blur(80px)', opacity: 0.15,
        }} />

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 16, background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            boxShadow: '0 8px 16px rgba(124, 58, 237, 0.2)',
          }}>
            <Shield size={24} color="white" />
          </div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.6rem', color: '#f0f6ff', marginBottom: 8 }}>
            {isLogin ? 'Welcome back' : 'Create an account'}
          </h1>
          <p style={{ color: '#8899bb', fontSize: '0.9rem' }}>
            {isLogin ? 'Enter your details to access your dashboard' : 'Join PromiseOS and start tracking commitments'}
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{
              background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)',
              borderRadius: 12, padding: 12, marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 8, color: '#f43f5e', fontSize: '0.85rem',
            }}
          >
            <AlertCircle size={16} />
            {error}
          </motion.div>
        )}

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: '100%', padding: '12px', marginBottom: 24,
            background: 'white', color: '#1a1b2e', fontWeight: 600, fontSize: '0.95rem',
            border: 'none', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ fontSize: '0.8rem', color: '#8899bb' }}>or continue with email</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
        </div>

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#8899bb', marginBottom: 6 }}>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="#8899bb" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email"
                required
                className="input-field"
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ paddingLeft: 42 }}
              />
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#8899bb', marginBottom: 6 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#8899bb" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="password"
                required
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingLeft: 42 }}
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{
              marginTop: 8, padding: '14px', fontSize: '0.95rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%',
            }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <>{isLogin ? 'Sign In' : 'Create Account'} <ArrowRight size={16} /></>}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: '0.85rem', color: '#8899bb' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
            style={{ background: 'none', border: 'none', color: '#00d4ff', fontWeight: 600, cursor: 'pointer' }}
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

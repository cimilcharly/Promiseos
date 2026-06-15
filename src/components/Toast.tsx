'use client';
// src/components/Toast.tsx

import React from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

export default function Toast() {
  const { toast, showToast } = useApp();

  if (!toast) return null;

  const icons = {
    success: <CheckCircle size={18} color="#10b981" />,
    error:   <AlertCircle size={18} color="#f43f5e" />,
    info:    <Info size={18} color="#00d4ff" />,
  };

  const colors = {
    success: 'rgba(16,185,129,0.2)',
    error:   'rgba(244,63,94,0.2)',
    info:    'rgba(0,212,255,0.2)',
  };

  return (
    <div className="toast" style={{ borderLeftColor: colors[toast.type], borderLeftWidth: 3 }}>
      {icons[toast.type]}
      <span style={{ fontSize: '0.875rem', color: '#f0f6ff', flex: 1 }}>{toast.message}</span>
      <button onClick={() => showToast('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a5a7a', padding: 0 }}>
        <X size={14} />
      </button>
    </div>
  );
}

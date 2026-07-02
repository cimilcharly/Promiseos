'use client';
// src/components/Sidebar.tsx

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Settings, Zap, Activity, ChevronRight, LogOut
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/settings',  label: 'Settings',      icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { organization, currentUser, isLiveMode, user, signOut } = useApp();

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <div style={{
            width: 36, height: 36,
            background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={18} color="white" fill="white" />
          </div>
          <div>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: '#f0f6ff' }}>
              PromiseOS
            </div>
          </div>
        </div>
        <div style={{ fontSize: '0.7rem', color: '#4a5a7a', paddingLeft: '46px' }}>
          Personal Intelligence Command
        </div>
      </div>

      {/* Organization */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10,
        padding: '10px 12px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f0f6ff' }}>{organization.name}</div>
          <div style={{ fontSize: '0.7rem', color: '#4a5a7a', marginTop: 2 }}>{organization.plan} plan</div>
        </div>
        <ChevronRight size={14} color="#4a5a7a" />
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link key={href} href={href} className={`sidebar-link ${active ? 'active' : ''}`}>
              <Icon size={16} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Mode indicator */}
      <div style={{
        background: isLiveMode ? 'rgba(244,63,94,0.08)' : 'rgba(245,158,11,0.08)',
        border: `1px solid ${isLiveMode ? 'rgba(244,63,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
        borderRadius: 8,
        padding: '8px 12px',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <Activity size={12} color={isLiveMode ? '#f43f5e' : '#f59e0b'} />
        <span style={{ fontSize: '0.7rem', color: isLiveMode ? '#f43f5e' : '#f59e0b', fontWeight: 600 }}>
          {isLiveMode ? 'Live Mode' : 'Demo Mode'}
        </span>
      </div>

      {/* User */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, #7c3aed, #00d4ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', fontWeight: 700, color: 'white', flexShrink: 0,
          }}>
            {user?.email?.charAt(0).toUpperCase() || currentUser.name.charAt(0)}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f0f6ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.email || currentUser.name}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#4a5a7a' }}>
              {user ? 'Authenticated User' : currentUser.role}
            </div>
          </div>
        </div>

        <button
          onClick={signOut}
          title="Sign Out"
          style={{
            background: 'rgba(244, 63, 94, 0.1)', border: 'none', borderRadius: 8,
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#f43f5e', flexShrink: 0,
          }}
        >
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  );
}

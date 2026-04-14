import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import SettingsModal from './SettingsModal';

export default function SidebarBottomSection() {
  const { logout } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <div style={{ marginTop: 24 }}>
        {/* Help & Support row with settings gear in corner */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 6 }}>
          <a href="https://www.vony-lending.com/help" target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 9, textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9B9A98" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#9B9A98' }}>Help & Support</span>
          </a>

          {/* Settings gear icon */}
          <button
            onClick={() => setSettingsOpen(true)}
            title="Settings"
            style={{
              width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9B9A98" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>

        {/* Log Out */}
        <button onClick={() => logout?.()} style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 9,
          border: 'none', cursor: 'pointer', background: 'transparent',
          fontFamily: "'DM Sans', sans-serif", width: '100%', boxSizing: 'border-box',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,114,110,0.06)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span style={{ fontSize: 12, fontWeight: 500, color: '#E8726E' }}>Log Out</span>
        </button>
      </div>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}

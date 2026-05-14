import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import SettingsModal from './SettingsModal';
import UserAvatar from './ui/UserAvatar';
import { useNotificationCount } from './utils/notificationCount';

const SIDEBAR_W = 220;

const isActive = (location, to) => {
  if (to === '/') return location.pathname === '/';
  const segment = to.split('?')[0].replace(/^\//, '');
  return location.pathname.includes(segment);
};

const glassPill = {
  display: 'inline-flex', alignItems: 'center', gap: 2,
  background: 'rgba(255,255,255,0.82)',
  backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
  border: '1px solid rgba(255,255,255,0.72)',
  boxShadow: '0 2px 12px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)',
  borderRadius: 30, padding: 4,
  pointerEvents: 'auto',
};

const Pill = ({ children }) => <div style={glassPill}>{children}</div>;

const BellIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const NavBtn = ({ children, onClick, active }) => {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        padding: '7px 11px', borderRadius: 24, cursor: 'pointer', border: 'none',
        background: active ? 'rgba(0,0,0,0.08)' : hovered ? 'rgba(0,0,0,0.05)' : 'transparent',
        color: active ? '#1A1918' : hovered ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.5)',
        fontWeight: active ? 600 : 500,
        fontSize: 13, fontFamily: "'DM Sans', sans-serif",
        transition: 'background 0.15s, color 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
};

export default function DesktopTopNav() {
  const location = useLocation();
  const { userProfile, user: authUser } = useAuth();
  const user = userProfile ? { ...userProfile, id: authUser?.id } : null;
  const notifCount = useNotificationCount(user?.id);
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <div
        className="desktop-top-nav"
        style={{
          position: 'fixed',
          top: 16,
          left: SIDEBAR_W,
          right: 0,
          zIndex: 300,
          display: 'flex',
          alignItems: 'flex-start',
          padding: '0 32px',
          gap: 12,
          background: 'none',
          pointerEvents: 'none',
        }}
      >
        {/* Search bar */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start', pointerEvents: 'auto' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.82)',
            backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
            border: '1px solid rgba(255,255,255,0.72)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)',
            borderRadius: 30, padding: '4px 16px 4px 12px',
            width: '100%', maxWidth: 480,
            transition: 'box-shadow 0.15s',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search"
              style={{
                flex: 1, border: 'none', outline: 'none', background: 'transparent',
                fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                color: '#1A1918', fontWeight: 400, padding: '7px 0',
              }}
              onFocus={e => e.currentTarget.parentElement.style.boxShadow = '0 2px 16px rgba(0,0,0,0.11), 0 0 0 2px rgba(3,172,234,0.14)'}
              onBlur={e => e.currentTarget.parentElement.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)'}
            />
          </div>
        </div>

        {/* Right pill — Bell (Notifications) + Profile */}
        <div style={{ pointerEvents: 'auto' }}>
          <Pill>
            {/* Bell */}
            <div style={{ position: 'relative' }}>
              <NavBtn
                onClick={() => navigate(createPageUrl('Notifications'))}
                active={isActive(location, createPageUrl('Notifications'))}
              >
                <BellIcon />
              </NavBtn>
              {notifCount > 0 && (
                <span style={{
                  position: 'absolute', top: 2, right: 2,
                  minWidth: 15, height: 15, borderRadius: 8,
                  background: '#14324D', color: '#fff',
                  fontSize: 8, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 3px', lineHeight: 1,
                  border: '1.5px solid rgba(255,255,255,0.95)',
                  pointerEvents: 'none',
                }}>
                  {notifCount > 99 ? '99+' : notifCount}
                </span>
              )}
            </div>

            {/* Profile */}
            <NavBtn
              onClick={() => navigate(createPageUrl('Profile'))}
              active={isActive(location, createPageUrl('Profile'))}
            >
              {user ? (
                <UserAvatar
                  name={user.full_name || user.username}
                  src={user.avatar_url || user.profile_picture_url}
                  size={22}
                  radius={11}
                />
              ) : <UserIcon />}
            </NavBtn>
          </Pill>
        </div>
      </div>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}

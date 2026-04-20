import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import SettingsModal from './SettingsModal';
import NotificationsPopup from './NotificationsPopup';
import FriendsPopup from './FriendsPopup';

const isActive = (location, to) => {
  if (to === '/') return location.pathname === '/';
  const segment = to.split('?')[0].replace(/^\//, '');
  return location.pathname.includes(segment);
};

const NavBtn = ({ to, children, onClick, active }) => {
  const [hovered, setHovered] = React.useState(false);
  const style = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '7px 11px', borderRadius: 24, cursor: 'pointer', border: 'none',
    background: active
      ? 'rgba(255,255,255,0.12)'
      : hovered ? 'rgba(255,255,255,0.07)' : 'transparent',
    color: active
      ? '#ffffff'
      : hovered ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)',
    fontWeight: active ? 600 : 500,
    fontSize: 13,
    fontFamily: "'DM Sans', sans-serif",
    textDecoration: 'none',
    transition: 'background 0.15s, color 0.15s',
    whiteSpace: 'nowrap',
  };

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={style}
      >
        {children}
      </button>
    );
  }

  return (
    <Link
      to={to}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={style}
    >
      {children}
    </Link>
  );
};

const HouseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const BellIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

const UsersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

const BookIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>
);

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const MenuIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

const Pill = ({ children }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 2,
    background: '#2A2928', borderRadius: 30, padding: 4,
  }}>
    {children}
  </div>
);

export default function DesktopTopNav() {
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);

  return (
    <>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 300,
        height: 54, background: '#1A1918',
        display: 'flex', alignItems: 'center',
        padding: '0 20px', gap: 12,
      }}>
        {/* Logo */}
        <Link to="/" style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: 'italic', fontWeight: 600, fontSize: '1.5rem',
          color: '#ffffff', textDecoration: 'none', lineHeight: 1,
          letterSpacing: '-0.02em', marginRight: 8, flexShrink: 0,
        }}>
          Vony
        </Link>

        {/* Left pill: Home, Upcoming, Lending & Borrowing */}
        <Pill>
          <NavBtn to="/" active={isActive(location, '/')}>
            <HouseIcon />
          </NavBtn>
          <NavBtn to={createPageUrl('Upcoming')} active={isActive(location, createPageUrl('Upcoming'))}>
            <CalendarIcon />
          </NavBtn>
          <NavBtn to={createPageUrl('LendingBorrowing')} active={isActive(location, createPageUrl('LendingBorrowing'))}>
            Lending &amp; Borrowing
          </NavBtn>
        </Pill>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Notifications bubble */}
        <div style={{ display: 'inline-flex', alignItems: 'center', background: '#2A2928', borderRadius: 30, padding: '6px 10px' }}>
          <NavBtn onClick={() => setNotifOpen(v => !v)} active={notifOpen}>
            <BellIcon />
          </NavBtn>
        </div>

        {/* Right pill: Friends, Recent Activity, Learn, Records, Profile, Menu */}
        <Pill>
          <NavBtn onClick={() => setFriendsOpen(v => !v)} active={friendsOpen}>
            <UsersIcon />
          </NavBtn>
          <NavBtn to={createPageUrl('RecentActivity')} active={isActive(location, createPageUrl('RecentActivity'))}>
            <ClockIcon />
          </NavBtn>
          <NavBtn to={createPageUrl('ComingSoon')} active={isActive(location, createPageUrl('ComingSoon'))}>
            <BookIcon />
          </NavBtn>
          <NavBtn to={createPageUrl('LoanAgreements')} active={isActive(location, createPageUrl('LoanAgreements'))}>
            Records
          </NavBtn>
          <NavBtn to={createPageUrl('Profile')} active={isActive(location, createPageUrl('Profile'))}>
            <UserIcon />
          </NavBtn>
          <NavBtn onClick={() => setSettingsOpen(true)}>
            <MenuIcon />
          </NavBtn>
        </Pill>
      </div>

      {settingsOpen && (
        <SettingsModal onClose={() => setSettingsOpen(false)} />
      )}
      {notifOpen && (
        <NotificationsPopup onClose={() => setNotifOpen(false)} />
      )}
      {friendsOpen && (
        <FriendsPopup onClose={() => setFriendsOpen(false)} />
      )}
    </>
  );
}

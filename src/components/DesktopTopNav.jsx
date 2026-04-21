import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import SettingsModal from './SettingsModal';
import NotificationsPopup from './NotificationsPopup';
import FriendsPopup from './FriendsPopup';
import AppMenuDropdown from './AppMenuDropdown';
import UserAvatar from './ui/UserAvatar';

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
    background: active ? 'rgba(0,0,0,0.08)' : hovered ? 'rgba(0,0,0,0.05)' : 'transparent',
    color: active ? '#1A1918' : hovered ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.5)',
    fontWeight: active ? 600 : 500,
    fontSize: 13,
    fontFamily: "'DM Sans', sans-serif",
    textDecoration: 'none',
    transition: 'background 0.15s, color 0.15s',
    whiteSpace: 'nowrap',
  };
  if (onClick) {
    return (
      <button type="button" onClick={onClick}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        style={style}>{children}</button>
    );
  }
  return (
    <Link to={to} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={style}>
      {children}
    </Link>
  );
};

const glassPill = {
  display: 'inline-flex', alignItems: 'center', gap: 2,
  background: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.55)',
  boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
  borderRadius: 30, padding: 4,
  pointerEvents: 'auto',
};

const Pill = ({ children }) => (
  <div style={glassPill}>
    {children}
  </div>
);

/* ── Icons ── */
const HouseIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const CalendarIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const BellIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
const UsersIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const UserIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const MenuIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
export default function DesktopTopNav() {
  const location = useLocation();
  const { userProfile, user: authUser } = useAuth();
  const user = userProfile ? { ...userProfile, id: authUser?.id } : null;

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [friendsInitialTab, setFriendsInitialTab] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <>
      {/* desktop-top-nav class is hidden on mobile via index.css */}
      <div className="desktop-top-nav" style={{
        position: 'fixed', top: 18, left: 0, right: 0, zIndex: 300,
        display: 'flex', alignItems: 'center',
        padding: '0 56px', gap: 12,
        background: 'none',
        pointerEvents: 'none',  // let clicks pass through gaps between bubbles
      }}>
        {/* Logo — plain, no bubble */}
        <Link to="/" style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: 'italic', fontWeight: 600, fontSize: '1.5rem',
          color: '#1A1918', textDecoration: 'none', lineHeight: 1,
          letterSpacing: '-0.02em', flexShrink: 0,
          pointerEvents: 'auto', marginRight: 8,
        }}>Vony</Link>

        {/* Left pill */}
        <Pill>
          <NavBtn to="/" active={isActive(location, '/')}><HouseIcon /></NavBtn>
          <NavBtn to={createPageUrl('Upcoming')} active={isActive(location, createPageUrl('Upcoming'))}><CalendarIcon /></NavBtn>
          <NavBtn to={createPageUrl('LendingBorrowing')} active={isActive(location, createPageUrl('LendingBorrowing'))}>
            Lending &amp; Borrowing
          </NavBtn>
        </Pill>

        <div style={{ flex: 1 }} />

        {/* Notifications */}
        <div style={{ ...glassPill, padding: '4px 6px' }}>
          <NavBtn onClick={() => { setNotifOpen(v => !v); setFriendsOpen(false); setMenuOpen(false); }} active={notifOpen}>
            <BellIcon />
          </NavBtn>
        </div>

        {/* Right pill */}
        <Pill>
          <NavBtn onClick={() => { setFriendsOpen(v => !v); setNotifOpen(false); setMenuOpen(false); }} active={friendsOpen}>
            <UsersIcon />
          </NavBtn>
          <NavBtn to={createPageUrl('LoanAgreements')} active={isActive(location, createPageUrl('LoanAgreements'))}>
            Records
          </NavBtn>
          <NavBtn to={createPageUrl('Profile')} active={isActive(location, createPageUrl('Profile'))}>
            {user ? (
              <UserAvatar name={user.full_name || user.username} src={user.avatar_url || user.profile_picture_url} size={22} radius={11} />
            ) : <UserIcon />}
          </NavBtn>

          {/* ≡ Menu button + dropdown */}
          <div ref={menuRef} style={{ position: 'relative', pointerEvents: 'auto' }}>
            <NavBtn onClick={() => { setMenuOpen(v => !v); setNotifOpen(false); setFriendsOpen(false); }} active={menuOpen}>
              <MenuIcon />
            </NavBtn>

            {menuOpen && (
              <AppMenuDropdown
                style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, zIndex: 400 }}
                onClose={() => setMenuOpen(false)}
                onInviteFriend={() => { setFriendsInitialTab('Invite'); setFriendsOpen(true); }}
                onOpenSettings={() => setSettingsOpen(true)}
              />
            )}
          </div>
        </Pill>
      </div>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {notifOpen && <NotificationsPopup onClose={() => setNotifOpen(false)} />}
      {friendsOpen && <FriendsPopup onClose={() => { setFriendsOpen(false); setFriendsInitialTab(null); }} initialTab={friendsInitialTab} />}
    </>
  );
}

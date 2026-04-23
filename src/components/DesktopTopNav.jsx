import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import SettingsModal from './SettingsModal';
import NotificationsPopup from './NotificationsPopup';
import FriendsPopup from './FriendsPopup';
import PendingRequestsPopup from './PendingRequestsPopup';
import AppMenuDropdown from './AppMenuDropdown';
import UserAvatar from './ui/UserAvatar';
import DemoModeToggle from './DemoModeToggle';
import ProfilePopup from './ProfilePopup';
import { useNotificationCount } from './utils/notificationCount';

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
  background: 'rgba(255,255,255,0.38)',
  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.28)',
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
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
  const notifCount = useNotificationCount(user?.id);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [friendsInitialTab, setFriendsInitialTab] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const [friendsInitialRequestsOpen, setFriendsInitialRequestsOpen] = useState(false);

  // Global open-friends-popup event — lets any component open the friends dropdown
  useEffect(() => {
    const handler = (e) => {
      setFriendsOpen(true);
      setNotifOpen(false);
      setMenuOpen(false);
      if (e?.detail?.initialTab) setFriendsInitialTab(e.detail.initialTab);
      if (e?.detail?.initialRequestsOpen) setFriendsInitialRequestsOpen(true);
    };
    window.addEventListener('open-friends-popup', handler);
    return () => window.removeEventListener('open-friends-popup', handler);
  }, []);

  return (
    <>
      {/* desktop-top-nav class is hidden on mobile via index.css */}
      <div className="desktop-top-nav" style={{
        position: 'fixed', top: 34, left: 0, right: 0, zIndex: 300,
        display: 'flex', alignItems: 'flex-start',
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
        <div style={{ ...glassPill, padding: '4px 6px', position: 'relative' }}>
          <NavBtn onClick={() => { setNotifOpen(v => !v); setFriendsOpen(false); setMenuOpen(false); }} active={notifOpen}>
            <BellIcon />
          </NavBtn>
          {notifCount > 0 && (
            <span style={{
              position: 'absolute', top: -2, right: -2,
              minWidth: 17, height: 17, borderRadius: 9,
              background: '#14324D', color: '#fff',
              fontSize: 9, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 4px', lineHeight: 1,
              border: '1.5px solid rgba(255,255,255,0.95)',
              boxShadow: '0 1px 4px rgba(20,50,77,0.35)',
              pointerEvents: 'none',
            }}>
              {notifCount > 99 ? '99+' : notifCount}
            </span>
          )}
        </div>

        {/* Right pill — stacked with a Demo Mode toggle underneath */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, pointerEvents: 'auto' }}>
        <Pill>
          <NavBtn onClick={() => { setFriendsOpen(v => !v); setNotifOpen(false); setMenuOpen(false); }} active={friendsOpen}>
            <UsersIcon />
          </NavBtn>
          <NavBtn to={createPageUrl('LoanAgreements')} active={isActive(location, createPageUrl('LoanAgreements'))}>
            Records
          </NavBtn>
          <NavBtn onClick={() => { setProfileOpen(v => !v); setNotifOpen(false); setFriendsOpen(false); setMenuOpen(false); }} active={profileOpen}>
            {user ? (
              <UserAvatar name={user.full_name || user.username} src={user.avatar_url || user.profile_picture_url} size={22} radius={11} />
            ) : <UserIcon />}
          </NavBtn>

          {/* ≡ Menu button + dropdown */}
          <div ref={menuRef} style={{ position: 'relative', pointerEvents: 'auto', zIndex: 1 }}>
            <NavBtn onClick={() => { setMenuOpen(v => !v); setNotifOpen(false); setFriendsOpen(false); }} active={menuOpen}>
              <MenuIcon />
            </NavBtn>

            {menuOpen && (
              <AppMenuDropdown
                style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, zIndex: 400 }}
                onClose={() => setMenuOpen(false)}
                onInviteFriend={() => { setFriendsInitialTab('Invite'); setFriendsOpen(true); }}
                onOpenSettings={() => setSettingsOpen(true)}
                onOpenPendingRequests={() => { setPendingOpen(true); setNotifOpen(false); setFriendsOpen(false); }}
                onOpenProfile={() => { setMenuOpen(false); setProfileOpen(true); }}
              />
            )}
          </div>
        </Pill>
        <DemoModeToggle variant="desktop" />
        </div>
      </div>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {profileOpen && <ProfilePopup onClose={() => setProfileOpen(false)} />}
      {pendingOpen && (
        <PendingRequestsPopup onClose={() => setPendingOpen(false)} />
      )}
      {notifOpen && (
        <NotificationsPopup
          onClose={() => setNotifOpen(false)}
          onOpenFriends={() => { setNotifOpen(false); setFriendsOpen(true); }}
        />
      )}
      {friendsOpen && <FriendsPopup onClose={() => { setFriendsOpen(false); setFriendsInitialTab(null); setFriendsInitialRequestsOpen(false); }} initialTab={friendsInitialTab} initialRequestsOpen={friendsInitialRequestsOpen} />}
    </>
  );
}

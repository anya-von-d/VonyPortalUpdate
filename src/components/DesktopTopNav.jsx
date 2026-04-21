import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import SettingsModal from './SettingsModal';
import NotificationsPopup from './NotificationsPopup';
import FriendsPopup from './FriendsPopup';
import UserAvatar from './ui/UserAvatar';

const PORTAL_URL = 'https://www.vony-lending.com';

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
const ChevronRight = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;

/* ── Menu item base styles ── */
const menuItemStyle = (hovered, danger) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  gap: 10, padding: '9px 14px', width: '100%',
  background: hovered ? (danger ? 'rgba(232,114,110,0.07)' : 'rgba(0,0,0,0.04)') : 'transparent',
  border: 'none', cursor: 'pointer',
  fontSize: 13, fontWeight: 500,
  color: danger ? '#E8726E' : '#1A1918',
  fontFamily: "'DM Sans', sans-serif",
  textAlign: 'left', textDecoration: 'none',
  transition: 'background 0.12s',
  borderRadius: 8,
});

/* ── MenuItem component ── */
function MenuItem({ label, icon, onClick, to, danger, hasArrow, children }) {
  const [hovered, setHovered] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const subRef = useRef(null);

  if (hasArrow) {
    return (
      <div style={{ position: 'relative' }}
        onMouseEnter={() => { setHovered(true); setSubOpen(true); }}
        onMouseLeave={() => { setHovered(false); setSubOpen(false); }}
      >
        <button style={menuItemStyle(hovered, danger)}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            {icon && <span style={{ opacity: 0.5, flexShrink: 0 }}>{icon}</span>}
            {label}
          </span>
          <ChevronRight />
        </button>
        {subOpen && (
          <div style={{
            position: 'absolute', top: 0, right: 'calc(100% + 6px)',
            background: '#ffffff', borderRadius: 12,
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 8px 28px rgba(0,0,0,0.12)',
            minWidth: 180, padding: '6px',
            zIndex: 500,
          }}>
            {children}
          </div>
        )}
      </div>
    );
  }

  if (to) {
    return (
      <Link to={to} style={menuItemStyle(hovered, danger)}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          {icon && <span style={{ opacity: 0.5, flexShrink: 0 }}>{icon}</span>}
          {label}
        </span>
      </Link>
    );
  }

  return (
    <button style={menuItemStyle(hovered, danger)} onClick={onClick}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        {icon && <span style={{ opacity: 0.5, flexShrink: 0 }}>{icon}</span>}
        {label}
      </span>
    </button>
  );
}

export default function DesktopTopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userProfile, user: authUser, logout } = useAuth();
  const user = userProfile ? { ...userProfile, id: authUser?.id } : null;

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [friendsInitialTab, setFriendsInitialTab] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(PORTAL_URL).then(() => {
      setLinkCopied(true);
      setTimeout(() => { setLinkCopied(false); setMenuOpen(false); }, 1500);
    });
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
  };

  /* ── Invite sub-items ── */
  const InviteItems = () => (
    <>
      <a href={`sms:?body=Hey! Join me on Vony — an easy way to manage loans with friends. Sign up here: ${PORTAL_URL}`}
        onClick={() => setMenuOpen(false)}
        style={{ ...menuItemStyle(false, false), display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        Message
      </a>
      <a href={`mailto:?subject=Join me on Vony&body=Hey!%0A%0AJoin me on Vony to manage loans together.%0A%0A${PORTAL_URL}`}
        onClick={() => setMenuOpen(false)}
        style={{ ...menuItemStyle(false, false), display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        Email
      </a>
      <button onClick={handleCopyLink}
        style={{ ...menuItemStyle(false, false), color: linkCopied ? '#16A34A' : '#1A1918' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          {linkCopied
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          }
          {linkCopied ? 'Copied!' : 'Copy Link'}
        </span>
      </button>
    </>
  );

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
              <div style={{
                position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                background: '#ffffff', borderRadius: 14,
                border: '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
                minWidth: 210, padding: '6px',
                zIndex: 400,
              }}>
                {/* Learn */}
                <MenuItem
                  label="Learn"
                  to={createPageUrl('LoanHelp')}
                  icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>}
                />

                {/* Invite a Friend → opens Friends popup on Invite tab */}
                <MenuItem
                  label="Invite a Friend"
                  onClick={() => { setMenuOpen(false); setFriendsInitialTab('Invite'); setFriendsOpen(true); }}
                  icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>}
                />

                {/* Contact Us */}
                <MenuItem
                  label="Contact Us"
                  onClick={() => { setMenuOpen(false); window.open('mailto:hello@vony-lending.com', '_blank'); }}
                  icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
                />

                {/* Help & Support */}
                <MenuItem
                  label="Help & Support"
                  to={createPageUrl('LoanHelp')}
                  icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
                />

                {/* Divider */}
                <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', margin: '6px 8px' }} />

                {/* Settings */}
                <MenuItem
                  label="Settings"
                  onClick={() => { setMenuOpen(false); setSettingsOpen(true); }}
                  icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>}
                />

                {/* Logout */}
                <MenuItem
                  label="Log out"
                  onClick={handleLogout}
                  danger
                  icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>}
                />
              </div>
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

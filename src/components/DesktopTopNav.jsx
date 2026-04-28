import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import SettingsModal from './SettingsModal';
import NotificationsPopup from './NotificationsPopup';
import FriendsPopup from './FriendsPopup';
import AppMenuDropdown from './AppMenuDropdown';
import UserAvatar from './ui/UserAvatar';
import DemoModeToggle from './DemoModeToggle';
import { useNotificationCount } from './utils/notificationCount';

const isActive = (location, to) => {
  if (to === '/') return location.pathname === '/';
  const segment = to.split('?')[0].replace(/^\//, '');
  return location.pathname.includes(segment);
};

/* ── Popup item (link or button) ── */
function NavPopupItem({ label, to, icon, onClick }) {
  const [hovered, setHovered] = useState(false);
  const style = {
    display: 'flex', alignItems: 'center', gap: 9, padding: '9px 14px',
    borderRadius: 8, background: hovered ? 'rgba(0,0,0,0.04)' : 'transparent',
    color: '#1A1918', textDecoration: 'none', fontSize: 13, fontWeight: 500,
    fontFamily: "'DM Sans', sans-serif", transition: 'background 0.12s',
    border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
  };
  const ico = icon && <span style={{ opacity: 0.45, flexShrink: 0 }}>{icon}</span>;
  if (onClick) return (
    <button style={style} onClick={onClick}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {ico}{label}
    </button>
  );
  return (
    <Link to={to} style={style}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {ico}{label}
    </Link>
  );
}

/* ── Popup card ── */
function NavPopupCard({ title, items, style }) {
  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 10px)', left: '50%', transform: 'translateX(-50%)',
      background: '#fff', borderRadius: 14,
      border: '1px solid rgba(0,0,0,0.08)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.06)',
      padding: 6, minWidth: 200, zIndex: 500,
      fontFamily: "'DM Sans', sans-serif",
      ...style,
    }}>
      {title && (
        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(0,0,0,0.35)',
          padding: '5px 12px 3px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {title}
        </div>
      )}
      {items.map((item, i) => <NavPopupItem key={i} {...item} />)}
    </div>
  );
}

/* ── NavBtn with optional popup ── */
const NavBtn = ({ to, children, onClick, active, popupDef }) => {
  const [hovered, setHovered] = React.useState(false);
  const [popupOpen, setPopupOpen] = React.useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!popupOpen) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setPopupOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [popupOpen]);

  const style = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '7px 11px', borderRadius: 24, cursor: 'pointer', border: 'none',
    background: active || popupOpen ? 'rgba(0,0,0,0.08)' : hovered ? 'rgba(0,0,0,0.05)' : 'transparent',
    color: active || popupOpen ? '#1A1918' : hovered ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.5)',
    fontWeight: active ? 600 : 500,
    fontSize: 13, fontFamily: "'DM Sans', sans-serif",
    textDecoration: 'none', transition: 'background 0.15s, color 0.15s',
    whiteSpace: 'nowrap', position: 'relative',
  };

  const handleClick = (e) => {
    if (popupDef) {
      e.preventDefault();
      setPopupOpen(v => !v);
    } else if (onClick) {
      onClick(e);
    }
  };

  const content = (
    <>
      {children}
      {popupOpen && popupDef && (
        <NavPopupCard title={popupDef.title} items={popupDef.items} />
      )}
    </>
  );

  if (onClick || popupDef) {
    return (
      <div ref={ref} style={{ position: 'relative' }}>
        <button type="button"
          onClick={popupDef ? handleClick : onClick}
          onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
          style={style}>
          {children}
        </button>
        {popupOpen && popupDef && (
          <NavPopupCard title={popupDef.title} items={popupDef.items} />
        )}
      </div>
    );
  }
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <Link to={to}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        style={style}>
        {children}
      </Link>
    </div>
  );
};

/* ── NavBtnPopup: a nav button that ALWAYS opens a popup (no direct navigation) ── */
const NavBtnPopup = ({ children, active, popupDef }) => {
  const [hovered, setHovered] = React.useState(false);
  const [popupOpen, setPopupOpen] = React.useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!popupOpen) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setPopupOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [popupOpen]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button"
        onClick={() => setPopupOpen(v => !v)}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          padding: '7px 11px', borderRadius: 24, cursor: 'pointer', border: 'none',
          background: active || popupOpen ? 'rgba(0,0,0,0.08)' : hovered ? 'rgba(0,0,0,0.05)' : 'transparent',
          color: active || popupOpen ? '#1A1918' : hovered ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.5)',
          fontWeight: active ? 600 : 500,
          fontSize: 13, fontFamily: "'DM Sans', sans-serif",
          transition: 'background 0.15s, color 0.15s',
          whiteSpace: 'nowrap',
        }}>
        {children}
      </button>
      {popupOpen && popupDef && (
        <NavPopupCard title={popupDef.title} items={popupDef.items} style={{ left: 0, transform: 'none' }} />
      )}
    </div>
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

const Pill = ({ children }) => <div style={glassPill}>{children}</div>;

/* ── Icons ── */
const HouseIcon    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const CalendarIcon = () => {
  const day = new Date().getDate();
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
      <text x="12" y="19.5" textAnchor="middle" fontSize="8" fontWeight="bold" fill="currentColor" stroke="none" fontFamily="system-ui, sans-serif">{day}</text>
    </svg>
  );
};
const BellIcon     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
const UsersIcon    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const UserIcon     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const MenuIcon     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
const IcoDocs      = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
const IcoActivity  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const IcoCal       = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IcoLend      = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 16V4m0 0L3 8m4-4l4 4"/><path d="M17 8v12m0 0l4-4m-4 4l-4-4"/></svg>;
const IcoLoans     = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>;
const IcoCreate    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcoUp        = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="16 12 12 8 8 12"/><line x1="12" y1="16" x2="12" y2="8"/></svg>;
const IcoHome      = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const IcoProfile   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;

export default function DesktopTopNav() {
  const location = useLocation();
  const { userProfile, user: authUser } = useAuth();
  const user = userProfile ? { ...userProfile, id: authUser?.id } : null;
  const notifCount = useNotificationCount(user?.id);

  const navigate = useNavigate();
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

  const [friendsInitialRequestsOpen, setFriendsInitialRequestsOpen] = useState(false);

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

  // Popup definitions
  const homePopup = {
    title: 'Home',
    items: [
      { label: 'Dashboard', to: '/', icon: <IcoHome /> },
      { label: 'Upcoming Payments', to: createPageUrl('Upcoming'), icon: <IcoCal /> },
      { label: 'Loan Agreements', to: createPageUrl('LoanAgreements'), icon: <IcoDocs /> },
      { label: 'Recent Activity', to: createPageUrl('RecentActivity'), icon: <IcoActivity /> },
      { label: 'Profile', to: createPageUrl('Profile'), icon: <IcoProfile /> },
    ],
  };

  const upcomingPopup = {
    title: 'Upcoming',
    items: [
      { label: 'All Upcoming', to: createPageUrl('Upcoming'), icon: <IcoCal /> },
      { label: 'Lending & Borrowing', to: createPageUrl('LendingBorrowing'), icon: <IcoLend /> },
      { label: 'Your Loans', to: createPageUrl('YourLoans'), icon: <IcoLoans /> },
    ],
  };

  const lendingPopup = {
    title: 'Lending & Borrowing',
    items: [
      { label: 'Overview', to: createPageUrl('LendingBorrowing'), icon: <IcoLend /> },
      { label: 'Loan Agreements', to: createPageUrl('LoanAgreements'), icon: <IcoDocs /> },
      { label: 'Your Loans', to: createPageUrl('YourLoans'), icon: <IcoLoans /> },
      { label: 'Recent Activity', to: createPageUrl('RecentActivity'), icon: <IcoActivity /> },
    ],
  };

  const logPopup = {
    title: 'Log',
    items: [
      { label: 'Record a Payment', to: createPageUrl('RecordPayment'), icon: <IcoUp /> },
      { label: 'Create a Loan', to: createPageUrl('CreateOffer'), icon: <IcoCreate /> },
      { label: 'Recent Activity', to: createPageUrl('RecentActivity'), icon: <IcoActivity /> },
    ],
  };

  const recordsPopup = {
    title: 'Records',
    items: [
      { label: 'Loan Agreements', to: createPageUrl('LoanAgreements'), icon: <IcoDocs /> },
      { label: 'Recent Activity', to: createPageUrl('RecentActivity'), icon: <IcoActivity /> },
      { label: 'Your Loans', to: createPageUrl('YourLoans'), icon: <IcoLoans /> },
    ],
  };

  return (
    <>
      <div className="desktop-top-nav" style={{
        position: 'fixed', top: 34, left: 0, right: 0, zIndex: 300,
        display: 'flex', alignItems: 'flex-start',
        padding: '0 56px', gap: 12,
        background: 'none',
        pointerEvents: 'none',
      }}>
        {/* Logo */}
        <Link to="/" style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: 'italic', fontWeight: 600, fontSize: '1.5rem',
          color: '#1A1918', textDecoration: 'none', lineHeight: 1,
          letterSpacing: '-0.02em', flexShrink: 0,
          pointerEvents: 'auto', marginRight: 8,
        }}>Vony</Link>

        {/* Left pill — all items now have popups */}
        <Pill>
          <NavBtnPopup active={isActive(location, '/')} popupDef={homePopup}>
            <HouseIcon />
          </NavBtnPopup>
          <NavBtnPopup active={isActive(location, createPageUrl('Upcoming'))} popupDef={upcomingPopup}>
            <CalendarIcon />
          </NavBtnPopup>
          <NavBtnPopup
            active={isActive(location, createPageUrl('LendingBorrowing'))}
            popupDef={lendingPopup}>
            Lending &amp; Borrowing
          </NavBtnPopup>
          <NavBtnPopup active={isActive(location, createPageUrl('RecordPayment'))} popupDef={logPopup}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
          </NavBtnPopup>
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

        {/* Right pill */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, pointerEvents: 'auto' }}>
          <Pill>
            <NavBtn onClick={() => { setFriendsOpen(v => !v); setNotifOpen(false); setMenuOpen(false); }} active={friendsOpen}>
              <UsersIcon />
            </NavBtn>
            <NavBtnPopup active={isActive(location, createPageUrl('LoanAgreements'))} popupDef={recordsPopup}>
              Records
            </NavBtnPopup>
            <NavBtn
              onClick={() => { navigate(createPageUrl('Profile')); setNotifOpen(false); setFriendsOpen(false); setMenuOpen(false); }}
              active={isActive(location, createPageUrl('Profile'))}>
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
                  onOpenPendingRequests={() => { setNotifOpen(true); setFriendsOpen(false); setMenuOpen(false); }}
                  onOpenProfile={() => { setMenuOpen(false); navigate(createPageUrl('Profile')); }}
                />
              )}
            </div>
          </Pill>
          <DemoModeToggle variant="desktop" />
        </div>
      </div>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {notifOpen && (
        <NotificationsPopup
          onClose={() => setNotifOpen(false)}
          onOpenFriends={() => { setNotifOpen(false); setFriendsOpen(true); }}
        />
      )}
      {friendsOpen && (
        <FriendsPopup
          onClose={() => { setFriendsOpen(false); setFriendsInitialTab(null); setFriendsInitialRequestsOpen(false); }}
          initialTab={friendsInitialTab}
          initialRequestsOpen={friendsInitialRequestsOpen}
        />
      )}
    </>
  );
}

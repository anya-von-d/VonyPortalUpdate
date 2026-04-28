import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import SettingsModal from './SettingsModal';
import NotificationsPopup from './NotificationsPopup';
import UserAvatar from './ui/UserAvatar';
import { useNotificationCount } from './utils/notificationCount';

const isActive = (location, to) => {
  if (to === '/') return location.pathname === '/';
  const segment = to.split('?')[0].replace(/^\//, '');
  return location.pathname.includes(segment);
};

/* ── Popup item ── */
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

/* ── Popup card (no title) ── */
function NavPopupCard({ items, style }) {
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
      {items.map((item, i) => <NavPopupItem key={i} {...item} />)}
    </div>
  );
}

/* ── Plain nav button ── */
const NavBtn = ({ to, children, onClick, active }) => {
  const [hovered, setHovered] = React.useState(false);
  const style = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '7px 11px', borderRadius: 24, cursor: 'pointer', border: 'none',
    background: active ? 'rgba(0,0,0,0.08)' : hovered ? 'rgba(0,0,0,0.05)' : 'transparent',
    color: active ? '#1A1918' : hovered ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.5)',
    fontWeight: active ? 600 : 500,
    fontSize: 13, fontFamily: "'DM Sans', sans-serif",
    textDecoration: 'none', transition: 'background 0.15s, color 0.15s',
    whiteSpace: 'nowrap',
  };
  if (onClick) return (
    <button type="button" onClick={onClick} style={style}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {children}
    </button>
  );
  return (
    <Link to={to} style={style}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {children}
    </Link>
  );
};

/* ── Nav button that opens a popup ── */
const NavBtnPopup = ({ children, active, popupDef, popupLeft }) => {
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
        <NavPopupCard items={popupDef.items} style={popupLeft ? { left: 0, transform: 'none' } : {}} />
      )}
    </div>
  );
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
const IcoLend      = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>;
const IcoBorrow    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>;
const IcoCreate    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcoUp        = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="16 12 12 8 8 12"/><line x1="12" y1="16" x2="12" y2="8"/></svg>;
const IcoLoans     = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>;

export default function DesktopTopNav() {
  const location = useLocation();
  const { userProfile, user: authUser } = useAuth();
  const user = userProfile ? { ...userProfile, id: authUser?.id } : null;
  const notifCount = useNotificationCount(user?.id);

  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  useEffect(() => {
    const handler = (e) => {
      setNotifOpen(false);
      const tab = e?.detail?.initialTab;
      navigate(createPageUrl('Friends') + (tab ? `?tab=${tab}` : ''));
    };
    window.addEventListener('open-friends-popup', handler);
    return () => window.removeEventListener('open-friends-popup', handler);
  }, [navigate]);

  // Lending & Borrowing popup (no title)
  const lendingPopup = {
    items: [
      { label: 'Lending',     to: createPageUrl('Lending'),       icon: <IcoLend /> },
      { label: 'Borrowing',   to: createPageUrl('Borrowing'),     icon: <IcoBorrow /> },
      { label: 'Log Payment', to: createPageUrl('RecordPayment'), icon: <IcoUp /> },
      { label: 'Create Loan', to: createPageUrl('CreateOffer'),   icon: <IcoCreate /> },
    ],
  };

  // Records popup (no title)
  const recordsPopup = {
    items: [
      { label: 'Lending & Borrowing Records', to: createPageUrl('LoanAgreements'), icon: <IcoDocs /> },
      { label: 'Recent Activity',  to: createPageUrl('RecentActivity'), icon: <IcoActivity /> },
      { label: 'Your Loans',       to: createPageUrl('YourLoans'),      icon: <IcoLoans /> },
    ],
  };

  const isLendingActive = isActive(location, createPageUrl('LendingBorrowing'))
    || isActive(location, createPageUrl('Lending'))
    || isActive(location, createPageUrl('Borrowing'));

  return (
    <>
      <div className="desktop-top-nav" style={{
        position: 'fixed', top: 16, left: 0, right: 0, zIndex: 300,
        display: 'flex', alignItems: 'flex-start',
        padding: '0 56px', gap: 12,
        background: 'none',
        pointerEvents: 'none',
      }}>
        {/* V bubble logo */}
        <Link to="/" style={{
          pointerEvents: 'auto', marginRight: 8, flexShrink: 0,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 38, height: 38, borderRadius: '50%',
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
          border: '1px solid rgba(255,255,255,0.72)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)',
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: 'italic', fontWeight: 600, fontSize: '1.25rem',
          color: '#1A1918', textDecoration: 'none', lineHeight: 1,
          letterSpacing: '-0.02em',
        }}>V</Link>

        {/* Left pill — Home (plain), Calendar (plain), Lending & Borrowing (popup) */}
        <Pill>
          <NavBtn to="/" active={isActive(location, '/')}>
            <HouseIcon />
          </NavBtn>
          <NavBtn to={createPageUrl('Upcoming')} active={isActive(location, createPageUrl('Upcoming'))}>
            <CalendarIcon />
          </NavBtn>
          <NavBtnPopup active={isLendingActive} popupDef={lendingPopup}>
            Lending &amp; Borrowing
          </NavBtnPopup>
        </Pill>

        {/* ── Centre search bar — matches glassPill style exactly ── */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', pointerEvents: 'auto' }}>
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
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
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

        {/* Right pill — Friends, Bell, Records, Profile, Menu */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, pointerEvents: 'auto' }}>
          <Pill>
            {/* Friends */}
            <NavBtn onClick={() => { navigate(createPageUrl('Friends')); setNotifOpen(false); setMenuOpen(false); }} active={isActive(location, createPageUrl('Friends'))}>

              <UsersIcon />
            </NavBtn>

            {/* Bell — no standalone bubble, just a NavBtn inside the pill */}
            <div style={{ position: 'relative' }}>
              <NavBtn onClick={() => { setNotifOpen(v => !v); setMenuOpen(false); }} active={notifOpen}>
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

            {/* Records popup */}
            <NavBtnPopup active={isActive(location, createPageUrl('LoanAgreements'))} popupDef={recordsPopup} popupLeft>
              Records
            </NavBtnPopup>

            {/* Profile */}
            <NavBtn
              onClick={() => { navigate(createPageUrl('Profile')); setNotifOpen(false); }}
              active={isActive(location, createPageUrl('Profile'))}>
              {user ? (
                <UserAvatar name={user.full_name || user.username} src={user.avatar_url || user.profile_picture_url} size={22} radius={11} />
              ) : <UserIcon />}
            </NavBtn>

          </Pill>
        </div>
      </div>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {notifOpen && (
        <NotificationsPopup
          onClose={() => setNotifOpen(false)}
          onOpenFriends={() => { setNotifOpen(false); navigate(createPageUrl('Friends')); }}
        />
      )}
    </>
  );
}

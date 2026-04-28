import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import SettingsModal from "@/components/SettingsModal";
import FriendsPopup from "@/components/FriendsPopup";
import DemoModeToggle from "@/components/DemoModeToggle";
import { useNotificationCount } from "@/components/utils/notificationCount";

/* ── Small icons for popup items ── */
const IcoLend   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>;
const IcoBorrow = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>;
const IcoCreate = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcoUp     = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="16 12 12 8 8 12"/><line x1="12" y1="16" x2="12" y2="8"/></svg>;

/* ── Popup item ── */
function PopupItem({ label, to, icon, onClick }) {
  const [hovered, setHovered] = useState(false);
  const base = {
    display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px',
    borderRadius: 8, background: hovered ? 'rgba(0,0,0,0.04)' : 'transparent',
    color: '#1A1918', fontSize: 13, fontWeight: 500,
    fontFamily: "'DM Sans', sans-serif", transition: 'background 0.12s',
  };
  if (onClick) return (
    <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ ...base, border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
      {icon && <span style={{ opacity: 0.45, flexShrink: 0 }}>{icon}</span>}
      {label}
    </button>
  );
  return (
    <Link to={to} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ ...base, textDecoration: 'none', display: 'flex' }}>
      {icon && <span style={{ opacity: 0.45, flexShrink: 0 }}>{icon}</span>}
      {label}
    </Link>
  );
}

/* ── Popup card (no title) ── */
function NavPopupCard({ items, style }) {
  return (
    <div style={{
      position: 'absolute', bottom: 'calc(100% + 12px)', left: '50%', transform: 'translateX(-50%)',
      background: '#fff', borderRadius: 14,
      border: '1px solid rgba(0,0,0,0.08)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.06)',
      padding: 6, minWidth: 200, zIndex: 500,
      fontFamily: "'DM Sans', sans-serif",
      ...style,
    }}>
      {items.map((item, i) => <PopupItem key={i} {...item} />)}
    </div>
  );
}

/* ── Bottom nav item ── */
function BottomNavItem({ label, icon, active, popupOpen, onTap, popupDef }) {
  return (
    <div style={{ position: 'relative', minWidth: 58 }}>
      {popupOpen && popupDef && <NavPopupCard items={popupDef.items} />}
      <button
        onClick={onTap}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 4, padding: '2px 6px', background: 'none', border: 'none',
          cursor: 'pointer', width: '100%' }}
      >
        <div style={{
          width: 50, height: 32, borderRadius: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: active || popupOpen ? 'rgba(0,0,0,0.08)' : 'transparent',
          color: active || popupOpen ? '#1A1918' : 'rgba(0,0,0,0.45)',
          transition: 'background 0.15s, color 0.15s',
        }}>
          {icon}
        </div>
        <span style={{
          fontSize: 10, fontWeight: active || popupOpen ? 600 : 400,
          color: active || popupOpen ? '#1A1918' : 'rgba(0,0,0,0.45)',
          letterSpacing: '-0.01em', lineHeight: 1,
          fontFamily: "'DM Sans', sans-serif", transition: 'color 0.15s',
        }}>
          {label}
        </span>
      </button>
    </div>
  );
}

export default function MeshMobileNav({ user, activePage }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [friendsInitialTab, setFriendsInitialTab] = useState(null);
  const [friendsInitialRequestsOpen, setFriendsInitialRequestsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const bottomNavRef = useRef(null);
  const notifCount = useNotificationCount(user?.id);
  const [bottomPopup, setBottomPopup] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close popup on outside click
  useEffect(() => {
    if (!bottomPopup) return;
    const handler = (e) => {
      if (bottomNavRef.current && !bottomNavRef.current.contains(e.target)) setBottomPopup(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [bottomPopup]);

  // Listen for friends popup event
  useEffect(() => {
    const handler = (e) => {
      setFriendsOpen(true);
      setBottomPopup(null);
      if (e?.detail?.initialTab) setFriendsInitialTab(e.detail.initialTab);
      if (e?.detail?.initialRequestsOpen) setFriendsInitialRequestsOpen(true);
    };
    window.addEventListener('open-friends-popup', handler);
    return () => window.removeEventListener('open-friends-popup', handler);
  }, []);

  const isActivePage = (page) => {
    if (page === 'Home') return location.pathname === '/' || location.pathname === '';
    const url = createPageUrl(page);
    return location.pathname.includes(url.replace(/^\//, ''));
  };

  const isLendingActive = isActivePage('LendingBorrowing') || isActivePage('Lending') || isActivePage('Borrowing');

  if (!isMobile) return (
    <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
  );

  const handleBottomTap = (key) => {
    if (key === 'home')     { setBottomPopup(null); navigate('/'); }
    else if (key === 'upcoming') { setBottomPopup(null); navigate(createPageUrl('Upcoming')); }
    else if (key === 'friends')  { setBottomPopup(null); setFriendsOpen(true); }
    else if (key === 'profile')  { setBottomPopup(null); navigate(createPageUrl('Profile')); }
    else if (key === 'lending')  { setBottomPopup(prev => prev === 'lending' ? null : 'lending'); }
  };

  const lendingPopupDef = {
    items: [
      { label: 'Lending',      to: createPageUrl('Lending'),       icon: <IcoLend /> },
      { label: 'Borrowing',    to: createPageUrl('Borrowing'),     icon: <IcoBorrow /> },
      { label: 'Log Payment',  to: createPageUrl('RecordPayment'), icon: <IcoUp /> },
      { label: 'Create Loan',  to: createPageUrl('CreateOffer'),   icon: <IcoCreate /> },
    ],
  };

  const navItems = [
    {
      key: 'home', label: 'Home', active: isActivePage('Home'),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
    },
    {
      key: 'upcoming', label: 'Calendar', active: isActivePage('Upcoming'),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
          <text x="12" y="19.5" textAnchor="middle" fontSize="8" fontWeight="bold" fill="currentColor" stroke="none" fontFamily="system-ui, sans-serif">{new Date().getDate()}</text>
        </svg>
      ),
    },
    {
      key: 'lending', label: 'Lending', active: isLendingActive, popupDef: lendingPopupDef,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 16V4m0 0L3 8m4-4l4 4"/>
          <path d="M17 8v12m0 0l4-4m-4 4l-4-4"/>
        </svg>
      ),
    },
    {
      key: 'friends', label: 'Friends', active: false,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
    },
    {
      key: 'profile', label: 'Profile', active: isActivePage('Profile'),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* ── Top row ── */}
      <div style={{
        position: 'absolute', top: 34, left: 0, right: 0, zIndex: 200,
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        fontFamily: "'DM Sans', sans-serif",
        pointerEvents: 'none',
      }}>
        <Link to="/" style={{
          pointerEvents: 'auto',
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontWeight: 600, fontStyle: 'italic', fontSize: '1.5rem',
          color: '#1A1918', lineHeight: 1, letterSpacing: '-0.02em',
          textDecoration: 'none',
        }}>Vony</Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'auto' }}>
          <DemoModeToggle variant="mobile" />

          {/* Bell — plain, no bubble */}
          <button
            onClick={() => navigate(createPageUrl('Notifications'))}
            style={{
              position: 'relative', background: 'none', border: 'none',
              cursor: 'pointer', padding: '4px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(0,0,0,0.55)',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {notifCount > 0 && (
              <span style={{
                position: 'absolute', top: 0, right: 0,
                minWidth: 16, height: 16, borderRadius: 8,
                background: '#14324D', color: '#fff',
                fontSize: 9, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 3px', lineHeight: 1,
                border: '1.5px solid white',
              }}>
                {notifCount > 99 ? '99+' : notifCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Floating bottom pill nav ── */}
      <div
        ref={bottomNavRef}
        style={{
          position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          zIndex: 200,
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(0,0,0,0.10)',
          borderRadius: 40,
          padding: '8px 6px 10px',
          display: 'flex', alignItems: 'flex-end', gap: 0,
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {navItems.map((item) => (
          <BottomNavItem
            key={item.key}
            label={item.label}
            icon={item.icon}
            active={item.active}
            popupOpen={bottomPopup === item.key}
            onTap={() => handleBottomTap(item.key)}
            popupDef={item.popupDef}
          />
        ))}
      </div>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {friendsOpen && (
        <FriendsPopup
          onClose={() => { setFriendsOpen(false); setFriendsInitialTab(null); setFriendsInitialRequestsOpen(false); }}
          initialTab={friendsInitialTab}
          initialRequestsOpen={friendsInitialRequestsOpen}
          positionOverride={{ top: 92, left: 12, right: 12, width: 'auto' }}
        />
      )}
    </>
  );
}

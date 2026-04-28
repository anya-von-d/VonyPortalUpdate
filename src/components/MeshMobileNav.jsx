import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import SettingsModal from "@/components/SettingsModal";
import FriendsPopup from "@/components/FriendsPopup";
import NotificationsPopup from "@/components/NotificationsPopup";
import PendingRequestsPopup from "@/components/PendingRequestsPopup";
import AppMenuDropdown from "@/components/AppMenuDropdown";
import DemoModeToggle from "@/components/DemoModeToggle";
import { useNotificationCount } from "@/components/utils/notificationCount";

/* ── Small icons for popup items ── */
const IcoHome      = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const IcoCal       = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IcoLend      = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 16V4m0 0L3 8m4-4l4 4"/><path d="M17 8v12m0 0l4-4m-4 4l-4-4"/></svg>;
const IcoDocs      = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
const IcoActivity  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const IcoProfile   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IcoCreate    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcoLoans     = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>;
const IcoUp        = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="16 12 12 8 8 12"/><line x1="12" y1="16" x2="12" y2="8"/></svg>;

/* ── Popup item ── */
function PopupItem({ label, to, icon, onClick }) {
  const [hovered, setHovered] = useState(false);
  if (onClick) {
    return (
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', width: '100%',
          borderRadius: 8, background: hovered ? 'rgba(0,0,0,0.04)' : 'transparent',
          border: 'none', cursor: 'pointer', color: '#1A1918', fontSize: 13, fontWeight: 500,
          fontFamily: "'DM Sans', sans-serif", textAlign: 'left', transition: 'background 0.12s' }}>
        {icon && <span style={{ opacity: 0.45, flexShrink: 0 }}>{icon}</span>}
        {label}
      </button>
    );
  }
  return (
    <Link
      to={to}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px',
        borderRadius: 8, background: hovered ? 'rgba(0,0,0,0.04)' : 'transparent',
        color: '#1A1918', textDecoration: 'none', fontSize: 13, fontWeight: 500,
        fontFamily: "'DM Sans', sans-serif", transition: 'background 0.12s' }}>
      {icon && <span style={{ opacity: 0.45, flexShrink: 0 }}>{icon}</span>}
      {label}
    </Link>
  );
}

/* ── Popup card ── */
function NavPopupCard({ title, items, style }) {
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
      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(0,0,0,0.35)',
        padding: '5px 12px 3px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {title}
      </div>
      {items.map((item, i) => <PopupItem key={i} {...item} />)}
    </div>
  );
}

/* ── Bottom nav item with optional popup ── */
function BottomNavItem({ label, icon, active, popupOpen, onTap, popupDef }) {
  return (
    <div style={{ position: 'relative', minWidth: 58 }}>
      {popupOpen && popupDef && (
        <NavPopupCard title={popupDef.title} items={popupDef.items} />
      )}
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
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const menuRef = useRef(null);
  const bottomNavRef = useRef(null);
  const notifCount = useNotificationCount(user?.id);
  const [bottomPopup, setBottomPopup] = useState(null); // 'home'|'upcoming'|'lending'|'create'|'log'

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // Close bottom popup on outside click
  useEffect(() => {
    if (!bottomPopup) return;
    const handler = (e) => {
      if (bottomNavRef.current && !bottomNavRef.current.contains(e.target)) setBottomPopup(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [bottomPopup]);

  const [friendsInitialRequestsOpen, setFriendsInitialRequestsOpen] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      setFriendsOpen(true);
      setNotifOpen(false);
      setPendingOpen(false);
      setMenuOpen(false);
      if (e?.detail?.initialTab) setFriendsInitialTab(e.detail.initialTab);
      if (e?.detail?.initialRequestsOpen) setFriendsInitialRequestsOpen(true);
    };
    window.addEventListener('open-friends-popup', handler);
    return () => window.removeEventListener('open-friends-popup', handler);
  }, []);

  useEffect(() => {
    const handler = () => {
      setPendingOpen(true);
      setFriendsOpen(false);
      setNotifOpen(false);
      setMenuOpen(false);
    };
    window.addEventListener('open-pending-requests-popup', handler);
    return () => window.removeEventListener('open-pending-requests-popup', handler);
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

  const glassBubble = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 44, height: 44, borderRadius: 999, textDecoration: 'none', flexShrink: 0,
    background: 'rgba(255,255,255,0.82)',
    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(0,0,0,0.10)',
    boxShadow: '0 2px 12px rgba(0,0,0,0.13)',
  };

  const innerBtnBase = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 36, height: 36, borderRadius: 24,
    background: 'transparent', border: 'none', cursor: 'pointer',
    color: 'rgba(0,0,0,0.6)', textDecoration: 'none', flexShrink: 0,
    transition: 'background 0.15s, color 0.15s',
  };

  const handleBottomTap = (key, defaultTo) => {
    if (bottomPopup === key) { setBottomPopup(null); }
    else { setBottomPopup(key); }
  };

  const closePopupAndNav = (to) => { setBottomPopup(null); navigate(to); };

  // Popup definitions for each bottom nav item
  const popupDefs = {
    home: {
      title: 'Home',
      items: [
        { label: 'Dashboard', to: '/', icon: <IcoHome /> },
        { label: 'Upcoming Payments', to: createPageUrl('Upcoming'), icon: <IcoCal /> },
        { label: 'Loan Agreements', to: createPageUrl('LoanAgreements'), icon: <IcoDocs /> },
        { label: 'Recent Activity', to: createPageUrl('RecentActivity'), icon: <IcoActivity /> },
        { label: 'Profile', to: createPageUrl('Profile'), icon: <IcoProfile /> },
      ],
    },
    upcoming: {
      title: 'Upcoming',
      items: [
        { label: 'All Upcoming', to: createPageUrl('Upcoming'), icon: <IcoCal /> },
        { label: 'Lending & Borrowing', to: createPageUrl('LendingBorrowing'), icon: <IcoLend /> },
        { label: 'Your Loans', to: createPageUrl('YourLoans'), icon: <IcoLoans /> },
      ],
    },
    lending: {
      title: 'Lending & Borrowing',
      items: [
        { label: 'Overview', to: createPageUrl('LendingBorrowing'), icon: <IcoLend /> },
        { label: 'Loan Agreements', to: createPageUrl('LoanAgreements'), icon: <IcoDocs /> },
        { label: 'Your Loans', to: createPageUrl('YourLoans'), icon: <IcoLoans /> },
        { label: 'Recent Activity', to: createPageUrl('RecentActivity'), icon: <IcoActivity /> },
      ],
    },
    create: {
      title: 'Create',
      items: [
        { label: 'Create a Loan', to: createPageUrl('CreateOffer'), icon: <IcoCreate /> },
        { label: 'Record a Payment', to: createPageUrl('RecordPayment'), icon: <IcoUp /> },
      ],
    },
    log: {
      title: 'Log',
      items: [
        { label: 'Record a Payment', to: createPageUrl('RecordPayment'), icon: <IcoUp /> },
        { label: 'Recent Activity', to: createPageUrl('RecentActivity'), icon: <IcoActivity /> },
        { label: 'Your Loans', to: createPageUrl('YourLoans'), icon: <IcoLoans /> },
      ],
    },
  };

  const navItems = [
    {
      key: 'home', active: isActivePage('Home'), label: 'Home',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
    },
    {
      key: 'upcoming', active: isActivePage('Upcoming'), label: 'Upcoming',
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
      key: 'lending', active: isLendingActive, label: 'Lending',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 16V4m0 0L3 8m4-4l4 4"/>
          <path d="M17 8v12m0 0l4-4m-4 4l-4-4"/>
        </svg>
      ),
    },
    {
      key: 'create', active: isActivePage('CreateOffer'), label: 'Create',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/>
          <line x1="9" y1="15" x2="15" y2="15"/>
        </svg>
      ),
    },
    {
      key: 'log', active: isActivePage('RecordPayment'), label: 'Log',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="16 12 12 8 8 12"/>
          <line x1="12" y1="16" x2="12" y2="8"/>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'auto' }}>
          <DemoModeToggle variant="mobile" />

          <button
            onClick={() => { setNotifOpen(v => !v); setFriendsOpen(false); setMenuOpen(false); setBottomPopup(null); }}
            style={{
              ...glassBubble, position: 'relative', cursor: 'pointer',
              background: notifOpen ? 'rgba(0,0,0,0.08)' : glassBubble.background,
            }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={notifOpen ? '#1A1918' : 'rgba(0,0,0,0.6)'} strokeWidth="1.8" strokeLinecap="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {notifCount > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: 2,
                minWidth: 17, height: 17, borderRadius: 9,
                background: '#14324D', color: '#fff',
                fontSize: 9, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 3px', lineHeight: 1,
                border: '1.5px solid rgba(255,255,255,0.9)',
                boxShadow: '0 1px 4px rgba(20,50,77,0.35)',
              }}>
                {notifCount > 99 ? '99+' : notifCount}
              </span>
            )}
          </button>

          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { setMenuOpen(v => !v); setNotifOpen(false); setFriendsOpen(false); setBottomPopup(null); }}
              style={{
                ...innerBtnBase,
                width: 36, height: 36,
                color: menuOpen ? '#1A1918' : 'rgba(0,0,0,0.6)',
                background: 'none', cursor: 'pointer',
              }}
              aria-label="Menu"
            >
              <svg width="17" height="13" viewBox="0 0 17 13" fill="none">
                <line x1="0" y1="1"   x2="17" y2="1"   stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.9"/>
                <line x1="0" y1="6.5" x2="17" y2="6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.9"/>
                <line x1="0" y1="12"  x2="17" y2="12"  stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.9"/>
              </svg>
            </button>
            {menuOpen && (
              <AppMenuDropdown
                style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 400 }}
                onClose={() => setMenuOpen(false)}
                onInviteFriend={() => { setFriendsInitialTab('Invite'); setFriendsOpen(true); }}
                onOpenSettings={() => setSettingsOpen(true)}
                onOpenFriends={() => setFriendsOpen(true)}
                onOpenPendingRequests={() => { setMenuOpen(false); setPendingOpen(true); setFriendsOpen(false); setNotifOpen(false); }}
                onOpenProfile={() => { setMenuOpen(false); navigate(createPageUrl('Profile')); }}
                showProfileAndFriends
              />
            )}
          </div>
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
            popupDef={popupDefs[item.key]}
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
      {notifOpen && (
        <NotificationsPopup
          onClose={() => setNotifOpen(false)}
          positionOverride={{ top: 92, left: 12, right: 12, width: 'auto' }}
        />
      )}
      {pendingOpen && (
        <PendingRequestsPopup
          onClose={() => setPendingOpen(false)}
          positionOverride={{ top: 92, left: 12, right: 12, width: 'auto' }}
        />
      )}
    </>
  );
}

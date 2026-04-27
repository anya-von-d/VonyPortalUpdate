import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import SettingsModal from "@/components/SettingsModal";
import FriendsPopup from "@/components/FriendsPopup";
import NotificationsPopup from "@/components/NotificationsPopup";
import PendingRequestsPopup from "@/components/PendingRequestsPopup";
import AppMenuDropdown from "@/components/AppMenuDropdown";
import DemoModeToggle from "@/components/DemoModeToggle";
import ProfilePopup from "@/components/ProfilePopup";
import { useNotificationCount } from "@/components/utils/notificationCount";

export default function MeshMobileNav({ user, activePage }) {
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [friendsInitialTab, setFriendsInitialTab] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const menuRef = useRef(null);
  const notifCount = useNotificationCount(user?.id);

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

  const [friendsInitialRequestsOpen, setFriendsInitialRequestsOpen] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Global open-friends-popup event
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

  // Global open-pending-requests-popup event — used by post-its, etc.
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

  // ── Desktop: handled by DesktopTopNav, nothing to render here
  if (!isMobile) return (
    <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
  );

  // ── Mobile only ──
  // Glassmorphism style shared by all icon bubbles — matches desktop `glassPill`
  const glassBubble = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 44, height: 44, borderRadius: 999, textDecoration: 'none', flexShrink: 0,
    background: 'rgba(255,255,255,0.82)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(0,0,0,0.10)',
    boxShadow: '0 2px 12px rgba(0,0,0,0.13)',
  };

  // Inner icon button style — pill-shaped like desktop NavBtn, shaded when active
  const innerBtnBase = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 36, height: 36, borderRadius: 24,
    background: 'transparent', border: 'none', cursor: 'pointer',
    color: 'rgba(0,0,0,0.6)', textDecoration: 'none', flexShrink: 0,
    transition: 'background 0.15s, color 0.15s',
  };
  const innerBtn = (active) => ({
    ...innerBtnBase,
    background: active ? 'rgba(0,0,0,0.08)' : 'transparent',
    color: active ? '#1A1918' : 'rgba(0,0,0,0.6)',
  });

  return (
    <>
      {/* ── Top row — absolute so it stays at page top and scrolls away ── */}
      <div style={{
        position: 'absolute', top: 34, left: 0, right: 0, zIndex: 200,
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        fontFamily: "'DM Sans', sans-serif",
        pointerEvents: 'none',
      }}>
        {/* Logo — plain text, no bubble */}
        <Link to="/" style={{
          pointerEvents: 'auto',
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontWeight: 600, fontStyle: 'italic', fontSize: '1.5rem',
          color: '#1A1918', lineHeight: 1, letterSpacing: '-0.02em',
          textDecoration: 'none',
        }}>Vony</Link>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'auto' }}>

          {/* Demo Mode — left of the bell */}
          <DemoModeToggle variant="mobile" />

          {/* Notifications — standalone glass bubble */}
          <button
            onClick={() => { setNotifOpen(v => !v); setFriendsOpen(false); setMenuOpen(false); }}
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

          {/* Hamburger / App menu — bare, no bubble */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { setMenuOpen(v => !v); setNotifOpen(false); setFriendsOpen(false); }}
              style={{
                ...innerBtnBase,
                width: 36, height: 36,
                color: menuOpen ? '#1A1918' : 'rgba(0,0,0,0.6)',
                background: 'none',
                cursor: 'pointer',
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
                onOpenProfile={() => { setMenuOpen(false); setProfileOpen(true); }}
                showProfileAndFriends
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Floating bottom pill nav — glass like notification bubble ── */}
      <div style={{
        position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        zIndex: 200,
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(0,0,0,0.10)',
        borderRadius: 40,
        padding: '6px 8px',
        display: 'flex', alignItems: 'center', gap: 2,
        boxShadow: '0 2px 12px rgba(0,0,0,0.13)',
        fontFamily: "'DM Sans', sans-serif",
        whiteSpace: 'nowrap',
      }}>
        {/* Home */}
        <BottomNavItem
          to="/"
          active={isActivePage('Home')}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          }
        />

        {/* Upcoming */}
        <BottomNavItem
          to={createPageUrl('Upcoming')}
          active={isActivePage('Upcoming')}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
              <text x="12" y="19.5" textAnchor="middle" fontSize="8" fontWeight="bold" fill="currentColor" stroke="none" fontFamily="system-ui, sans-serif">{new Date().getDate()}</text>
            </svg>
          }
        />

        {/* Lending & Borrowing — text label */}
        <Link
          to={createPageUrl('LendingBorrowing')}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: '8px 16px', borderRadius: 30, cursor: 'pointer', textDecoration: 'none',
            background: isLendingActive ? 'rgba(0,0,0,0.08)' : 'transparent',
            color: isLendingActive ? '#1A1918' : 'rgba(0,0,0,0.6)',
            fontSize: 13, fontWeight: isLendingActive ? 700 : 500,
            letterSpacing: '-0.01em',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          Lending &amp; Borrowing
        </Link>

        {/* Records */}
        <BottomNavItem
          to={createPageUrl('LoanAgreements')}
          active={isActivePage('LoanAgreements')}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          }
        />

        {/* Log Payment */}
        <BottomNavItem
          to={createPageUrl('RecordPayment')}
          active={isActivePage('RecordPayment')}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="16 12 12 8 8 12"/>
              <line x1="12" y1="16" x2="12" y2="8"/>
            </svg>
          }
        />
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
      {profileOpen && <ProfilePopup onClose={() => setProfileOpen(false)} />}
    </>
  );
}

function BottomNavItem({ to, active, icon }) {
  return (
    <Link
      to={to}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 40, height: 40, borderRadius: 30, textDecoration: 'none',
        background: active ? 'rgba(0,0,0,0.08)' : 'transparent',
        color: active ? '#1A1918' : 'rgba(0,0,0,0.6)',
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      {icon}
    </Link>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import UserAvatar from "@/components/ui/UserAvatar";
import SettingsModal from "@/components/SettingsModal";
import FriendsPopup from "@/components/FriendsPopup";
import NotificationsPopup from "@/components/NotificationsPopup";
import AppMenuDropdown from "@/components/AppMenuDropdown";
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

  // Global open-friends-popup event — lets any component open the friends dropdown
  useEffect(() => {
    const handler = (e) => {
      setFriendsOpen(true);
      setNotifOpen(false);
      setMenuOpen(false);
      if (e?.detail?.initialTab) setFriendsInitialTab(e.detail.initialTab);
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

  // ── Desktop: handled by DesktopTopNav, nothing to render here
  if (!isMobile) return (
    <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
  );

  // ── Mobile only ──
  // Glassmorphism style shared by all icon bubbles — matches desktop `glassPill`
  const glassBubble = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 44, height: 44, borderRadius: 999, textDecoration: 'none', flexShrink: 0,
    background: 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.55)',
    boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
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
      {/* ── Floating top row ── */}
      <div style={{
        position: 'fixed', top: 18, left: 0, right: 0, zIndex: 200,
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

          {/* Notifications — standalone glassmorphism bubble */}
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

          {/* Combined bubble: Friends + Records + Profile + Menu */}
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            background: 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.55)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
            borderRadius: 999, padding: 4, gap: 2,
          }}>
            {/* Friends — opens dropdown */}
            <button
              onClick={() => { setFriendsOpen(v => !v); setNotifOpen(false); setMenuOpen(false); }}
              style={innerBtn(friendsOpen)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </button>

            {/* Records */}
            <Link
              to={createPageUrl("LoanAgreements")}
              style={{
                ...innerBtn(isActivePage('LoanAgreements')), width: 'auto', padding: '0 10px',
                fontSize: 13, fontWeight: isActivePage('LoanAgreements') ? 600 : 500, letterSpacing: '-0.01em',
              }}
            >Records</Link>

            {/* Profile */}
            <Link to={createPageUrl("Profile")} style={innerBtn(isActivePage('Profile'))}>
              <UserAvatar
                name={user?.full_name || user?.username}
                src={user?.avatar_url || user?.profile_picture_url}
                size={26}
                radius={13}
              />
            </Link>

            {/* Hamburger / App menu */}
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => { setMenuOpen(v => !v); setNotifOpen(false); setFriendsOpen(false); }}
                style={innerBtn(menuOpen)}
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
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Floating bottom pill nav ── */}
      <div style={{
        position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        zIndex: 200,
        background: '#1A1918',
        borderRadius: 40,
        padding: '6px 8px',
        display: 'flex', alignItems: 'center', gap: 2,
        boxShadow: '0 4px 24px rgba(0,0,0,0.28), 0 1px 6px rgba(0,0,0,0.18)',
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
            </svg>
          }
        />

        {/* Lending & Borrowing — text label */}
        <Link
          to={createPageUrl('LendingBorrowing')}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: '8px 16px', borderRadius: 30, cursor: 'pointer', textDecoration: 'none',
            background: isLendingActive ? 'rgba(255,255,255,0.15)' : 'transparent',
            color: isLendingActive ? '#ffffff' : 'rgba(255,255,255,0.5)',
            fontSize: 13, fontWeight: isLendingActive ? 700 : 500,
            letterSpacing: '-0.01em',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          Lending &amp; Borrowing
        </Link>
      </div>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {friendsOpen && (
        <FriendsPopup
          onClose={() => { setFriendsOpen(false); setFriendsInitialTab(null); }}
          initialTab={friendsInitialTab}
          positionOverride={{ top: 76, left: 12, right: 12, width: 'auto' }}
        />
      )}
      {notifOpen && (
        <NotificationsPopup
          onClose={() => setNotifOpen(false)}
          positionOverride={{ top: 76, left: 12, right: 12, width: 'auto' }}
        />
      )}
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
        background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
        color: active ? '#ffffff' : 'rgba(255,255,255,0.5)',
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      {icon}
    </Link>
  );
}

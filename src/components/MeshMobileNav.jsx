import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Payment, Loan, Friendship } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";
import UserAvatar from "@/components/ui/UserAvatar";
import SettingsModal from "@/components/SettingsModal";

export default function MeshMobileNav({ user, activePage }) {
  const { logout } = useAuth();
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const fetchCounts = async () => {
      try {
        const [payments, loans, friendships] = await Promise.all([
          Payment.list('-created_at').catch(() => []),
          Loan.list().catch(() => []),
          Friendship.list().catch(() => []),
        ]);
        const userLoans = loans.filter(l => l.lender_id === user.id || l.borrower_id === user.id);
        const userLoanIds = userLoans.map(l => l.id);
        const toConfirm = payments.filter(p =>
          p.status === 'pending_confirmation' && userLoanIds.includes(p.loan_id) && p.recorded_by !== user.id
        );
        const offers = loans.filter(l => l.borrower_id === user.id && l.status === 'pending');
        const friendReqs = friendships.filter(f => f.friend_id === user.id && f.status === 'pending');
        // Reminders = overdue active loans
        const now = new Date();
        const overdueReminders = userLoans.filter(l =>
          l.status === 'active' && l.next_payment_date && new Date(l.next_payment_date) < now
        );
        setNotifCount(toConfirm.length + offers.length + friendReqs.length + overdueReminders.length);
      } catch {}
    };
    fetchCounts();
  }, [user?.id]);

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
  // Glassmorphism style shared by all icon bubbles
  const glassBubble = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 44, height: 44, borderRadius: 14, textDecoration: 'none', flexShrink: 0,
    background: 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.55)',
    boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
  };

  return (
    <>
      {/* ── Floating top row — no bar, just logo + icon bubbles ── */}
      <div style={{
        position: 'fixed', top: 18, left: 0, right: 0, zIndex: 200,
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        fontFamily: "'DM Sans', sans-serif",
        pointerEvents: 'none',   // let taps pass through the gap between elements
      }}>
        {/* Logo bubble */}
        <Link to="/" style={{
          ...glassBubble,
          pointerEvents: 'auto',
          width: 'auto', padding: '0 14px',
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontWeight: 600, fontStyle: 'italic', fontSize: '1.35rem',
          color: '#1A1918', lineHeight: 1, letterSpacing: '-0.02em',
        }}>Vony</Link>

        {/* Right icon bubbles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'auto' }}>

          {/* Notifications bell */}
          <Link to={createPageUrl("Requests")} style={{ ...glassBubble, position: 'relative' }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="1.8" strokeLinecap="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {notifCount > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                minWidth: 17, height: 17, borderRadius: 9,
                background: '#E8726E', color: '#fff',
                fontSize: 9, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 3px', lineHeight: 1,
                border: '1.5px solid rgba(255,255,255,0.9)',
                boxShadow: '0 1px 4px rgba(232,114,110,0.4)',
              }}>
                {notifCount > 99 ? '99+' : notifCount}
              </span>
            )}
          </Link>

          {/* Friends */}
          <Link to={createPageUrl("Friends")} style={glassBubble}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </Link>

          {/* Records */}
          <Link to={createPageUrl("LoanAgreements")} style={{
            ...glassBubble,
            width: 'auto', padding: '0 12px',
            fontSize: 13, fontWeight: 600, color: 'rgba(0,0,0,0.6)',
            letterSpacing: '-0.01em',
          }}>Records</Link>

          {/* Profile avatar */}
          <Link to={createPageUrl("Profile")} style={glassBubble}>
            <UserAvatar
              name={user?.full_name || user?.username}
              src={user?.avatar_url || user?.profile_picture_url}
              size={28}
              radius={14}
            />
          </Link>

          {/* Settings */}
          <button
            onClick={() => setSettingsOpen(true)}
            style={{
              ...glassBubble,
              border: 'none', cursor: 'pointer',
              background: 'rgba(255,255,255,0.72)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
            }}
            aria-label="Settings"
          >
            <svg width="19" height="14" viewBox="0 0 19 14" fill="none">
              <line x1="0" y1="1"  x2="19" y2="1"  stroke="rgba(0,0,0,0.55)" strokeWidth="1.6" strokeLinecap="round"/>
              <line x1="0" y1="7"  x2="19" y2="7"  stroke="rgba(0,0,0,0.55)" strokeWidth="1.6" strokeLinecap="round"/>
              <line x1="0" y1="13" x2="19" y2="13" stroke="rgba(0,0,0,0.55)" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
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

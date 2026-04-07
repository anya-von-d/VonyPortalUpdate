import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loan, Payment, Friendship } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";

const PAGE_TITLES = {
  Dashboard: null,
  CreateOffer: 'Create Loan',
  RecordPayment: 'Record Payment',
  Upcoming: 'Upcoming',
  YourLoans: 'My Loans',
  Borrowing: 'My Loans',
  Lending: 'My Loans',
  Friends: 'Friends',
  RecentActivity: 'Activity',
  LoanAgreements: 'Documents',
  ComingSoon: 'Shop & Learn',
  Profile: 'Profile',
  Requests: 'Notifications',
};

const SIDEBAR_WIDTH = 220;

export default function DashboardSidebar({ activePage = "Dashboard", user, tabs, activeTab, onTabChange }) {
  const { logout } = useAuth();
  const firstName = user?.full_name?.split(' ')[0] || '';
  const [notifCount, setNotifCount] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef(null);

  useEffect(() => {
    document.body.style.paddingLeft = `${SIDEBAR_WIDTH}px`;
    return () => { document.body.style.paddingLeft = ''; };
  }, []);

  useEffect(() => { if (user?.id) fetchData(); }, [user?.id]);

  useEffect(() => {
    const handler = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setSettingsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchData = async () => {
    try {
      const [payments, loans, friendships] = await Promise.all([
        Payment.list('-created_at').catch(() => []),
        Loan.list().catch(() => []),
        Friendship.list().catch(() => []),
      ]);
      const userLoans = loans.filter(l => l.lender_id === user.id || l.borrower_id === user.id);
      const userLoanIds = userLoans.map(l => l.id);
      const paymentsToConfirm = payments.filter(p =>
        p.status === 'pending_confirmation' && userLoanIds.includes(p.loan_id) && p.recorded_by !== user.id
      );
      const offersReceived = loans.filter(l => l.borrower_id === user.id && l.status === 'pending');
      const friendRequests = friendships.filter(f => f.friend_id === user.id && f.status === 'pending');
      setNotifCount(paymentsToConfirm.length + offersReceived.length + friendRequests.length);
    } catch (e) { console.error("Sidebar data error:", e); }
  };

  const active = (...pages) => pages.includes(activePage);

  const navItemStyle = (...pages) => ({
    display: 'flex', alignItems: 'center', gap: 9,
    padding: '8px 12px', borderRadius: 8, textDecoration: 'none',
    fontSize: 13.5, fontFamily: "'DM Sans', sans-serif",
    color: active(...pages) ? '#1A1918' : '#787776',
    fontWeight: active(...pages) ? 600 : 400,
    background: active(...pages) ? '#F1EADE' : 'transparent',
    transition: 'all 0.15s',
  });

  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good night';

  const comingSoonBadge = {
    fontSize: 9, fontWeight: 700, color: '#7C3AED', background: 'rgba(124,58,237,0.1)',
    borderRadius: 4, padding: '2px 5px', letterSpacing: '0.04em', textTransform: 'uppercase',
    marginLeft: 'auto', flexShrink: 0,
  };

  const dropdownItemStyle = {
    display: 'flex', alignItems: 'center', gap: 9, width: '100%',
    padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 13.5, fontFamily: "'DM Sans', sans-serif", fontWeight: 400,
    color: '#787776', textAlign: 'left', textDecoration: 'none',
    borderRadius: 8, transition: 'background 0.12s',
  };

  return createPortal(
    <>
      {/* LEFT SIDEBAR */}
      <div style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, width: SIDEBAR_WIDTH,
        background: 'white',
        borderRight: '1px solid rgba(0,0,0,0.07)',
        display: 'flex', flexDirection: 'column',
        zIndex: 100, overflowY: 'auto', overflowX: 'hidden',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {/* Logo */}
        <div style={{ padding: '28px 18px 16px' }}>
          <Link to="/" style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontWeight: 400, fontStyle: 'italic', fontSize: '1.5rem',
            letterSpacing: '-0.02em', color: '#1A1918', textDecoration: 'none',
          }}>Vony</Link>
        </div>

        {/* Nav links */}
        <nav style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
          <Link to="/" style={navItemStyle('Dashboard')}>Home</Link>
          <Link to={createPageUrl("CreateOffer")} style={navItemStyle('CreateOffer')}>Create</Link>
          <Link to={createPageUrl("RecordPayment")} style={navItemStyle('RecordPayment')}>Record</Link>
          <Link to={createPageUrl("Upcoming")} style={navItemStyle('Upcoming')}>Upcoming</Link>
          <Link to={createPageUrl("YourLoans")} style={navItemStyle('YourLoans', 'Borrowing', 'Lending')}>My Loans</Link>
          <Link to={createPageUrl("Friends")} style={navItemStyle('Friends')}>Friends</Link>

          <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '8px 4px' }} />

          <Link to={createPageUrl("RecentActivity")} style={navItemStyle('RecentActivity')}>Activity</Link>
          <Link to={createPageUrl("LoanAgreements")} style={navItemStyle('LoanAgreements')}>Documents</Link>

          {/* Notifications with badge */}
          <Link to={createPageUrl("Requests")} style={{ ...navItemStyle('Requests'), justifyContent: 'space-between' }}>
            <span>Notifications</span>
            {notifCount > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, color: 'white', background: '#E8726E', borderRadius: 10, padding: '1px 6px', minWidth: 16, textAlign: 'center' }}>
                {notifCount > 99 ? '99+' : notifCount}
              </span>
            )}
          </Link>
        </nav>

        {/* Bottom: settings + profile */}
        <div style={{ padding: '8px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          {/* Settings dropdown */}
          <div ref={settingsRef} style={{ position: 'relative', marginBottom: 2 }}>
            <button
              onClick={() => setSettingsOpen(o => !o)}
              style={{ ...dropdownItemStyle, width: '100%' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              Settings
            </button>
            {settingsOpen && (
              <div style={{ position: 'absolute', bottom: 'calc(100% + 4px)', left: 0, right: 0, background: 'white', borderRadius: 12, padding: 6, boxShadow: '0 -4px 24px rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.06)', zIndex: 200 }}>
                <button style={{ ...dropdownItemStyle, color: '#9B9A98', cursor: 'default' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                  Learn <span style={comingSoonBadge}>Soon</span>
                </button>
                <button style={{ ...dropdownItemStyle, color: '#9B9A98', cursor: 'default' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  Loan Help <span style={comingSoonBadge}>Soon</span>
                </button>
                <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '4px 4px' }} />
                <button style={{ ...dropdownItemStyle, color: '#787776', cursor: 'default' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  Help & Support
                </button>
                <button onClick={() => { setSettingsOpen(false); logout(); }} style={{ ...dropdownItemStyle, color: '#E8726E' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Log Out
                </button>
              </div>
            )}
          </div>

          {/* Profile */}
          <Link to={createPageUrl("Profile")} style={navItemStyle('Profile')}>
            {user?.profile_picture_url ? (
              <div style={{ width: 26, height: 26, borderRadius: 7, overflow: 'hidden', flexShrink: 0, border: '1.5px solid rgba(0,0,0,0.08)' }}>
                <img src={user.profile_picture_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ) : (
              <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg, #03ACEA, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
            )}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{firstName || 'Profile'}</span>
          </Link>
        </div>
      </div>

      {/* PAGE TITLE ROW */}
      <div style={{ position: 'fixed', top: 24, left: SIDEBAR_WIDTH + 20, right: 24, zIndex: 99, pointerEvents: 'none' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 48, pointerEvents: 'auto' }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 34, fontWeight: 600, color: '#1A1918', margin: 0, letterSpacing: '-0.01em', lineHeight: 1 }}>
            {activePage === 'Dashboard' ? (
              firstName ? (
                <><span style={{ fontStyle: 'normal' }}>{timeGreeting}, </span><span style={{ fontStyle: 'italic' }}>{firstName}</span></>
              ) : (
                <span style={{ fontStyle: 'italic' }}>{timeGreeting}</span>
              )
            ) : (
              <span style={{ fontStyle: 'italic' }}>{PAGE_TITLES[activePage] || activePage}</span>
            )}
          </h1>

          {activePage === 'Dashboard' ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <Link to={createPageUrl("CreateOffer")} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', borderRadius: 10, textDecoration: 'none',
                fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                background: '#1A1918', color: 'white',
              }}>Create Loan</Link>
              <Link to={createPageUrl("RecordPayment")} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', borderRadius: 10, textDecoration: 'none',
                fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                background: '#03ACEA', color: 'white',
              }}>Record Payment</Link>
            </div>
          ) : tabs && tabs.length > 0 && onTabChange && (
            <div style={{ display: 'inline-flex', gap: 2, background: 'rgba(0,0,0,0.05)', borderRadius: 10, padding: 3 }}>
              {tabs.map(tab => (
                <button key={tab.key} onClick={() => onTabChange(tab.key)} style={{
                  padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                  fontWeight: activeTab === tab.key ? 600 : 500,
                  color: activeTab === tab.key ? '#1A1918' : '#787776',
                  background: activeTab === tab.key ? 'white' : 'transparent',
                  boxShadow: activeTab === tab.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s', whiteSpace: 'nowrap',
                }}>{tab.label}</button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

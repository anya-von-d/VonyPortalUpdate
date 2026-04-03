import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loan, Payment, Friendship } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";

/* ── Main component ──────────────────────────────────────────── */
export default function DashboardSidebar({ activePage = "Dashboard", user, tabs, activeTab, onTabChange }) {
  const avatarInitial = (user?.full_name || 'U').charAt(0).toUpperCase();
  const { logout } = useAuth();
  const firstName = user?.full_name?.split(' ')[0] || '';

  const [notifCount, setNotifCount] = useState(0);
  const navRef = useRef(null);

  useEffect(() => { if (user?.id) fetchData(); }, [user?.id]);

  const fetchData = async () => {
    try {
      const [payments, loans, friendships] = await Promise.all([
        Payment.list().catch(() => []),
        Loan.list().catch(() => []),
        Friendship.list().catch(() => []),
      ]);
      const userLoans   = loans.filter(l => l.lender_id === user.id || l.borrower_id === user.id);
      const userLoanIds = userLoans.map(l => l.id);
      const paymentsToConfirm = payments.filter(p =>
        p.status === 'pending_confirmation' && userLoanIds.includes(p.loan_id) && p.recorded_by !== user.id
      );
      const offersReceived = loans.filter(l => l.borrower_id === user.id && l.status === 'pending');
      const friendRequests = friendships.filter(f => f.friend_id === user.id && f.status === 'pending');
      setNotifCount(paymentsToConfirm.length + offersReceived.length + friendRequests.length);
    } catch (e) { console.error("Sidebar data error:", e); }
  };

  const handleLogout = () => logout();
  const active = (...pages) => pages.includes(activePage);

  /* ── Nav link style ── */
  const navLinkStyle = (...pages) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 16px', borderRadius: 10, textDecoration: 'none',
    fontSize: 13, fontFamily: "'DM Sans', sans-serif",
    whiteSpace: 'nowrap', transition: 'background 0.15s',
    color: active(...pages) ? '#1A1918' : '#5C5B5A',
    fontWeight: active(...pages) ? 600 : 500,
    background: active(...pages) ? 'rgba(0,0,0,0.06)' : 'transparent',
  });

  /* ── Bottom item style (same shade as nav links) ── */
  const bottomItemStyle = (...pages) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 16px', borderRadius: 10, textDecoration: 'none',
    fontSize: 13, fontFamily: "'DM Sans', sans-serif",
    whiteSpace: 'nowrap', transition: 'background 0.15s', width: '100%',
    color: active(...pages) ? '#1A1918' : '#5C5B5A',
    fontWeight: active(...pages) ? 600 : 500,
    background: active(...pages) ? 'rgba(0,0,0,0.06)' : 'transparent',
    border: 'none', cursor: 'pointer',
  });

  const PAGE_TITLES = {
    Dashboard: 'Home',
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
    Requests: 'Requests',
  };

  /* ── Nav icons (14px) ── */
  const icons = {
    home:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    create:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
    record:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    upcoming: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    loans:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    friends:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    activity: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    docs:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>,
    settings: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    help:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    logout:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  };

  return (
    <>
      <style>{`
        @media (min-width: 900px) { .mobile-tab-bar { display: none !important; } }
      `}</style>

      {/* ══════ FLOATING TOP BAR ══════ */}
      <div style={{ position: 'fixed', top: 12, left: 208, right: 0, paddingRight: 24, zIndex: 100, pointerEvents: 'none' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', height: 52, pointerEvents: 'auto' }}>
          <div style={{
            width: '100%', height: '100%',
            background: 'rgba(255,255,255,0.93)',
            backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
            borderRadius: 16, border: '1px solid rgba(255,255,255,0.80)',
            boxShadow: '0 4px 28px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
            display: 'flex', alignItems: 'center', padding: '0 18px',
            fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box',
          }}>
            {/* Vony logo — far left */}
            <Link to="/" style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 400, fontStyle: 'italic', fontSize: '1.25rem',
              letterSpacing: '-0.02em', color: '#1A1918', textDecoration: 'none', flexShrink: 0,
            }}>Vony</Link>

            <div style={{ flex: 1 }} />

            {/* Bell — light yellow circle, darker yellow icon */}
            <Link to={createPageUrl("Requests")} style={{ textDecoration: 'none', display: 'inline-flex', position: 'relative', marginRight: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: '#FEF3C7',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#D97706">
                  <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                </svg>
              </div>
              {notifCount > 0 && (
                <div style={{
                  position: 'absolute', top: 0, right: 0,
                  background: '#E8726E', color: 'white', fontSize: 8, fontWeight: 700,
                  minWidth: 14, height: 14, borderRadius: 7,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
                }}>{notifCount > 99 ? '99+' : notifCount}</div>
              )}
            </Link>

            {/* Profile — blue rounded rectangle with light-blue icon + name */}
            <Link to={createPageUrl("Profile")} style={{ textDecoration: 'none', flexShrink: 0 }}>
              {user?.profile_picture_url ? (
                /* Has photo — show photo + name in blue pill */
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: '#03ACEA', borderRadius: 10, padding: '5px 12px 5px 5px',
                  outline: active('Profile') ? '2px solid #82F0B9' : 'none', outlineOffset: 2,
                }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, overflow: 'hidden', flexShrink: 0 }}>
                    <img src={user.profile_picture_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'white', whiteSpace: 'nowrap' }}>{firstName || 'Profile'}</span>
                </div>
              ) : (
                /* Default avatar — blue pill with light-blue person icon + name */
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: '#03ACEA', borderRadius: 10, padding: '5px 12px 5px 8px',
                  outline: active('Profile') ? '2px solid #82F0B9' : 'none', outlineOffset: 2,
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'white', whiteSpace: 'nowrap' }}>{firstName || 'Profile'}</span>
                </div>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* ══════ PAGE TITLE ROW ══════ */}
      <div style={{ position: 'fixed', top: 76, left: 208, right: 0, paddingRight: 24, zIndex: 99, pointerEvents: 'none' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', paddingLeft: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 48, pointerEvents: 'auto' }}>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 30, fontWeight: 400, fontStyle: 'italic',
            color: '#1A1918', margin: 0, letterSpacing: '-0.01em', lineHeight: 1,
          }}>
            {PAGE_TITLES[activePage] || activePage}
          </h1>
          {tabs && tabs.length > 0 && onTabChange && (
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

      {/* ══════ LEFT NAV SIDEBAR ══════ */}
      <nav ref={navRef} style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, width: 200,
        background: 'white', zIndex: 90,
        display: 'flex', flexDirection: 'column',
        fontFamily: "'DM Sans', sans-serif",
        overflowY: 'auto', overflowX: 'hidden',
      }}>

        {/* Top padding where logo used to be — replaced by just space */}
        <div style={{ height: 24, flexShrink: 0 }} />

        {/* Nav links */}
        <div style={{ flex: 1, padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Link to="/" style={navLinkStyle('Dashboard')}>{icons.home} Home</Link>
          <Link to={createPageUrl("CreateOffer")} style={navLinkStyle('CreateOffer')}>{icons.create} Create Loan</Link>
          <Link to={createPageUrl("RecordPayment")} style={navLinkStyle('RecordPayment')}>{icons.record} Record Payment</Link>
          <Link to={createPageUrl("Upcoming")} style={navLinkStyle('Upcoming')}>{icons.upcoming} Upcoming</Link>
          <Link to={createPageUrl("YourLoans")} style={navLinkStyle('YourLoans', 'Borrowing', 'Lending')}>{icons.loans} My Loans</Link>
          <Link to={createPageUrl("Friends")} style={navLinkStyle('Friends')}>{icons.friends} Friends</Link>
          <Link to={createPageUrl("RecentActivity")} style={navLinkStyle('RecentActivity')}>{icons.activity} Activity</Link>
          <Link to={createPageUrl("LoanAgreements")} style={navLinkStyle('LoanAgreements')}>{icons.docs} Documents</Link>
        </div>

        {/* Bottom section: Help & Support, Settings, Log Out */}
        <div style={{ padding: '0 8px 16px', flexShrink: 0 }}>
          <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '0 8px 6px' }} />

          {/* Help & Support — no link */}
          <div style={{ ...bottomItemStyle(), cursor: 'default', color: '#9B9A98' }}>
            {icons.help} Help & Support
          </div>

          {/* Settings */}
          <Link to={createPageUrl("ComingSoon")} style={bottomItemStyle('ComingSoon')}>
            {icons.settings} Settings
          </Link>

          {/* Log Out — same shade as Settings */}
          <button onClick={handleLogout} style={{ ...bottomItemStyle(), cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            {icons.logout} Log Out
          </button>
        </div>
      </nav>
    </>
  );
}

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loan, Payment, Friendship, PublicProfile } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";
import { daysUntil } from "@/components/utils/dateUtils";
import { format } from "date-fns";

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

const RIGHT_SIDEBAR_WIDTH = 260;

export default function DashboardSidebar({ activePage = "Dashboard", user, tabs, activeTab, onTabChange }) {
  const { logout } = useAuth();
  const firstName = user?.full_name?.split(' ')[0] || '';
  const [notifCount, setNotifCount] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const settingsRef = useRef(null);
  const moreRef = useRef(null);

  // Right sidebar data
  const [notifications, setNotifications] = useState([]);
  const [upcomingPayments, setUpcomingPayments] = useState([]);

  // Reserve right sidebar space so pages center correctly
  useEffect(() => {
    document.body.style.paddingRight = `${RIGHT_SIDEBAR_WIDTH}px`;
    return () => { document.body.style.paddingRight = ''; };
  }, []);

  useEffect(() => { if (user?.id) fetchData(); }, [user?.id]);

  useEffect(() => {
    const handler = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setSettingsOpen(false);
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchData = async () => {
    try {
      const [payments, loans, friendships, profiles] = await Promise.all([
        Payment.list('-created_at').catch(() => []),
        Loan.list().catch(() => []),
        Friendship.list().catch(() => []),
        PublicProfile.list().catch(() => []),
      ]);

      const userLoans   = loans.filter(l => l.lender_id === user.id || l.borrower_id === user.id);
      const userLoanIds = userLoans.map(l => l.id);

      const paymentsToConfirm = payments.filter(p =>
        p.status === 'pending_confirmation' && userLoanIds.includes(p.loan_id) && p.recorded_by !== user.id
      );
      const offersReceived = loans.filter(l => l.borrower_id === user.id && l.status === 'pending');
      const friendRequests = friendships.filter(f => f.friend_id === user.id && f.status === 'pending');

      setNotifCount(paymentsToConfirm.length + offersReceived.length + friendRequests.length);

      // Build notifications list
      const notifs = [];
      paymentsToConfirm.slice(0, 3).forEach(p => {
        const loan = userLoans.find(l => l.id === p.loan_id);
        const otherUserId = loan ? (loan.lender_id === user.id ? loan.borrower_id : loan.lender_id) : null;
        const profile = profiles.find(pr => pr.user_id === otherUserId);
        const name = profile?.full_name?.split(' ')[0] || profile?.username || 'Someone';
        notifs.push({ type: 'payment', text: `${name} recorded $${(p.amount || 0).toFixed(0)} payment`, link: createPageUrl("Requests"), color: '#82F0B9' });
      });
      friendRequests.slice(0, 2).forEach(f => {
        const profile = profiles.find(pr => pr.user_id === f.user_id);
        const name = profile?.full_name?.split(' ')[0] || profile?.username || 'Someone';
        notifs.push({ type: 'friend', text: `${name} wants to be friends`, link: createPageUrl("Friends"), color: '#03ACEA' });
      });
      offersReceived.slice(0, 2).forEach(l => {
        const profile = profiles.find(pr => pr.user_id === l.lender_id);
        const name = profile?.full_name?.split(' ')[0] || profile?.username || 'Someone';
        notifs.push({ type: 'offer', text: `${name} sent you a $${(l.amount || 0).toLocaleString()} loan offer`, link: createPageUrl("Requests"), color: '#7C3AED' });
      });
      setNotifications(notifs);

      // Build upcoming payments
      const today = new Date();
      const upcoming = userLoans
        .filter(l => l.status === 'active' && l.next_payment_date)
        .map(l => {
          const isLender = l.lender_id === user.id;
          const otherUserId = isLender ? l.borrower_id : l.lender_id;
          const profile = profiles.find(pr => pr.user_id === otherUserId);
          const name = profile?.full_name?.split(' ')[0] || profile?.username || 'user';
          const days = daysUntil(l.next_payment_date);
          const date = new Date(l.next_payment_date + 'T12:00:00');
          return { days, date, name, amount: l.payment_amount || 0, isLender, isOverdue: days < 0 };
        })
        .sort((a, b) => a.days - b.days)
        .slice(0, 5);
      setUpcomingPayments(upcoming);

    } catch (e) { console.error("Sidebar data error:", e); }
  };

  const active = (...pages) => pages.includes(activePage);

  const navStyle = (...pages) => ({
    display: 'flex', alignItems: 'center',
    padding: '5px 11px', borderRadius: 8, textDecoration: 'none',
    fontSize: 13, fontFamily: "'DM Sans', sans-serif",
    whiteSpace: 'nowrap', transition: 'all 0.15s',
    color: active(...pages) ? '#1A1918' : 'rgba(255,255,255,0.88)',
    fontWeight: active(...pages) ? 600 : 400,
    background: active(...pages) ? 'rgba(255,255,255,0.88)' : 'transparent',
    boxShadow: active(...pages) ? '0 1px 6px rgba(0,0,0,0.08)' : 'none',
  });

  const dropdownItemStyle = {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
    padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
    color: '#1A1918', textAlign: 'left', textDecoration: 'none',
    borderRadius: 8, transition: 'background 0.12s',
  };

  const comingSoonBadge = {
    fontSize: 9, fontWeight: 700, color: '#7C3AED', background: 'rgba(124,58,237,0.1)',
    borderRadius: 4, padding: '2px 5px', letterSpacing: '0.04em', textTransform: 'uppercase',
    marginLeft: 'auto', flexShrink: 0,
  };

  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good night';

  // Notification icon by type
  const notifIcon = (type) => {
    if (type === 'payment') return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
    if (type === 'friend') return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
  };

  return (
    <>
      {createPortal(
        <>
          {/* FLOATING TOP BAR */}
          <div style={{ position: 'fixed', top: 18, left: 8, right: 8, zIndex: 100, pointerEvents: 'none' }}>
            <div style={{ height: 52, pointerEvents: 'auto' }}>
              <div style={{
                width: '100%', height: '100%',
                background: 'rgba(255,255,255,0.18)',
                backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                borderRadius: 16, border: '1px solid rgba(255,255,255,0.4)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.5)',
                display: 'flex', alignItems: 'center', padding: '0 18px',
                fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', overflow: 'visible',
              }}>
                {/* Logo */}
                <Link to="/" style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontWeight: 400, fontStyle: 'italic', fontSize: '1.25rem',
                  letterSpacing: '-0.02em', color: 'white', textDecoration: 'none', flexShrink: 0,
                }}>Vony</Link>

                {/* Nav links — centered */}
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
                  <Link to="/" style={navStyle('Dashboard')}>Home</Link>
                  <Link to={createPageUrl("CreateOffer")} style={navStyle('CreateOffer')}>Create</Link>
                  <Link to={createPageUrl("RecordPayment")} style={navStyle('RecordPayment')}>Record</Link>
                  <Link to={createPageUrl("Upcoming")} style={navStyle('Upcoming')}>Upcoming</Link>
                  <Link to={createPageUrl("YourLoans")} style={navStyle('YourLoans', 'Borrowing', 'Lending')}>My Loans</Link>
                  <Link to={createPageUrl("Friends")} style={navStyle('Friends')}>Friends</Link>

                  {/* More dropdown */}
                  <div ref={moreRef} style={{ position: 'relative' }}>
                    <button
                      onClick={() => { setMoreOpen(o => !o); setSettingsOpen(false); }}
                      style={{ ...navStyle('RecentActivity', 'LoanAgreements'), border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      More
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    {moreOpen && (
                      <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', background: 'white', borderRadius: 12, padding: 6, minWidth: 160, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', border: '1px solid rgba(0,0,0,0.06)', zIndex: 200 }}>
                        <Link to={createPageUrl("RecentActivity")} onClick={() => setMoreOpen(false)} style={{ ...dropdownItemStyle, color: active('RecentActivity') ? '#03ACEA' : '#1A1918' }}>Activity</Link>
                        <Link to={createPageUrl("LoanAgreements")} onClick={() => setMoreOpen(false)} style={{ ...dropdownItemStyle, color: active('LoanAgreements') ? '#03ACEA' : '#1A1918' }}>Documents</Link>
                      </div>
                    )}
                  </div>
                </div>

                {/* Settings gear */}
                <div ref={settingsRef} style={{ position: 'relative', marginRight: 10 }}>
                  <button
                    onClick={() => { setSettingsOpen(o => !o); setMoreOpen(false); }}
                    style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: 'pointer', background: settingsOpen ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                    </svg>
                  </button>
                  {settingsOpen && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: 'white', borderRadius: 12, padding: 6, minWidth: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', border: '1px solid rgba(0,0,0,0.06)', zIndex: 200 }}>
                      <button style={{ ...dropdownItemStyle, color: '#9B9A98', cursor: 'default' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                        Learn
                        <span style={comingSoonBadge}>Soon</span>
                      </button>
                      <button style={{ ...dropdownItemStyle, color: '#9B9A98', cursor: 'default' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        Loan Help
                        <span style={comingSoonBadge}>Soon</span>
                      </button>
                      <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '4px 6px' }} />
                      <button style={{ ...dropdownItemStyle, color: '#787776', cursor: 'default' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        Help & Support
                      </button>
                      <button onClick={() => { setSettingsOpen(false); logout(); }} style={{ ...dropdownItemStyle, color: '#E8726E' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                        Log Out
                      </button>
                    </div>
                  )}
                </div>

                {/* Bell */}
                <Link to={createPageUrl("Requests")} style={{ textDecoration: 'none', display: 'inline-flex', position: 'relative', marginRight: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#C4EEFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#03ACEA">
                      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                    </svg>
                  </div>
                  {notifCount > 0 && (
                    <div style={{ position: 'absolute', top: 0, right: 0, background: '#E8726E', color: 'white', fontSize: 8, fontWeight: 700, minWidth: 14, height: 14, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                      {notifCount > 99 ? '99+' : notifCount}
                    </div>
                  )}
                </Link>

                {/* Profile */}
                <Link to={createPageUrl("Profile")} style={{ textDecoration: 'none', flexShrink: 0 }}>
                  {user?.profile_picture_url ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #03ACEA 0%, #7C3AED 100%)', borderRadius: 10, padding: '5px 12px 5px 5px', boxShadow: '0 2px 8px rgba(3,172,234,0.25)', outline: active('Profile') ? '2px solid rgba(3,172,234,0.5)' : 'none', outlineOffset: 2 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 7, overflow: 'hidden', flexShrink: 0 }}>
                        <img src={user.profile_picture_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'white', whiteSpace: 'nowrap' }}>{firstName || 'Profile'}</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #03ACEA 0%, #7C3AED 100%)', borderRadius: 10, padding: '5px 12px 5px 8px', boxShadow: '0 2px 8px rgba(3,172,234,0.25)', outline: active('Profile') ? '2px solid rgba(3,172,234,0.5)' : 'none', outlineOffset: 2 }}>
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

          {/* PAGE TITLE ROW */}
          <div style={{ position: 'fixed', top: 76, left: 8, right: RIGHT_SIDEBAR_WIDTH, zIndex: 99, pointerEvents: 'none' }}>
            <div style={{ maxWidth: 1080, margin: '0 auto', paddingLeft: 40, paddingRight: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 48, pointerEvents: 'auto' }}>
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

          {/* RIGHT SIDEBAR — continuous strip */}
          <div style={{
            position: 'fixed', top: 76, right: 0, bottom: 0, width: RIGHT_SIDEBAR_WIDTH,
            zIndex: 98, overflowY: 'auto', overflowX: 'hidden',
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            borderLeft: '1px solid rgba(0,0,0,0.07)',
            fontFamily: "'DM Sans', sans-serif",
          }}>

            {/* Profile */}
            <div style={{ padding: '20px 18px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {user?.profile_picture_url ? (
                  <div style={{ width: 46, height: 46, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '2px solid rgba(0,0,0,0.06)' }}>
                    <img src={user.profile_picture_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #03ACEA 0%, #7C3AED 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.01em', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.full_name || firstName || 'User'}
                  </div>
                  {user?.username && (
                    <div style={{ fontSize: 11, color: '#9B9A98', marginTop: 2 }}>@{user.username}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', margin: '0' }} />

            {/* Notifications section */}
            <div style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#B0AFAD', letterSpacing: '0.09em', textTransform: 'uppercase' }}>Notifications</span>
                {notifCount > 0 && (
                  <Link to={createPageUrl("Requests")} style={{ fontSize: 11, fontWeight: 500, color: '#2563EB', textDecoration: 'none' }}>View all</Link>
                )}
              </div>
              <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', marginBottom: 10 }} />
              {notifications.length === 0 ? (
                <div style={{ padding: '8px 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>✅</span>
                  <span style={{ fontSize: 12, color: '#9B9A98' }}>All caught up!</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {notifications.map((n, i) => (
                    <Link key={i} to={n.link} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '7px 6px', borderRadius: 8, textDecoration: 'none', transition: 'background 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: `${n.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: n.color, marginTop: 1 }}>
                        {notifIcon(n.type)}
                      </div>
                      <span style={{ fontSize: 11.5, color: '#1A1918', lineHeight: 1.4, fontWeight: 500 }}>{n.text}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(0,0,0,0.07)' }} />

            {/* Upcoming section */}
            <div style={{ padding: '16px 18px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#B0AFAD', letterSpacing: '0.09em', textTransform: 'uppercase' }}>Upcoming</span>
                <Link to={createPageUrl("Upcoming")} style={{ fontSize: 11, fontWeight: 500, color: '#2563EB', textDecoration: 'none' }}>See all</Link>
              </div>
              <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', marginBottom: 10 }} />
              {upcomingPayments.length === 0 ? (
                <div style={{ padding: '8px 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>✨</span>
                  <span style={{ fontSize: 12, color: '#9B9A98' }}>Nothing coming up</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {upcomingPayments.map((p, i) => {
                    const daysLabel = p.isOverdue ? `${Math.abs(p.days)}d late` : p.days === 0 ? 'Today' : `${p.days}d`;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: i < upcomingPayments.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.isLender ? `From ${p.name}` : `To ${p.name}`}
                          </div>
                          <div style={{ fontSize: 10, color: '#9B9A98', marginTop: 2 }}>{format(p.date, 'MMM d')}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: p.isOverdue ? '#E8726E' : p.isLender ? '#35B276' : '#2563EB' }}>
                            {p.isLender ? '+' : '-'}${(p.amount || 0).toLocaleString()}
                          </div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: p.isOverdue ? '#E8726E' : '#9B9A98', background: p.isOverdue ? 'rgba(232,114,110,0.1)' : 'rgba(0,0,0,0.05)', borderRadius: 4, padding: '1px 5px', marginTop: 3, display: 'inline-block' }}>
                            {daysLabel}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </>,
        document.body
      )}
    </>
  );
}

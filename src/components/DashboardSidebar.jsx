import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loan, Payment, Friendship, PublicProfile } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";
import { format, differenceInDays } from "date-fns";

/* ── Timeline section — title + thin line ─────────────────── */
function TimelineSection({ title, children }) {
  return (
    <div style={{ padding: '14px 20px 16px' }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif", marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', marginBottom: 14 }} />
      {children}
    </div>
  );
}

/* ── Tiny icon square ────────────────────────────────────────── */
function TinyIcon({ color, children }) {
  return (
    <div style={{
      width: 16, height: 16, borderRadius: 4, background: color,
      flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
    }}>
      {children}
    </div>
  );
}

/* ── Shared text styles ──────────────────────────────────────── */
const itemText = { fontSize: 12.5, fontWeight: 500, color: '#1A1918', margin: 0, lineHeight: 1.45 };
const itemSub  = { fontSize: 9.5, fontWeight: 500, color: '#9B9A98', margin: '3px 0 0', lineHeight: 1.2, textTransform: 'uppercase', letterSpacing: '0.02em' };

/* ── Main component ──────────────────────────────────────────── */
export default function DashboardSidebar({ activePage = "Dashboard", user }) {
  const avatarInitial = (user?.full_name || 'U').charAt(0).toUpperCase();
  const { logout } = useAuth();
  const firstName = user?.full_name?.split(' ')[0] || '';

  const [notifCount, setNotifCount]     = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [upcomingPayments, setUpcomingPayments] = useState([]);
  const [pendingItems, setPendingItems]  = useState([]);

  const [openDropdown, setOpenDropdown] = useState(null);
  const navRef = useRef(null);

  useEffect(() => { if (user?.id) fetchData(); }, [user?.id]);

  const fetchData = async () => {
    try {
      const [payments, loans, friendships, profiles] = await Promise.all([
        Payment.list().catch(() => []),
        Loan.list().catch(() => []),
        Friendship.list().catch(() => []),
        PublicProfile.list().catch(() => []),
      ]);

      const userLoans   = loans.filter(l => l.lender_id === user.id || l.borrower_id === user.id);
      const userLoanIds = userLoans.map(l => l.id);
      const today       = new Date();

      const getProfile = (uid) => profiles.find(pr => pr.user_id === uid);
      const getName    = (uid) => getProfile(uid)?.full_name?.split(' ')[0] || 'Someone';

      /* ── Notifications ── */
      const paymentsToConfirm = payments.filter(p =>
        p.status === 'pending_confirmation' && userLoanIds.includes(p.loan_id) && p.recorded_by !== user.id
      );
      const termChanges   = loans.filter(l =>
        userLoanIds.includes(l.id) && l.status === 'pending_borrower_approval' && l.borrower_id === user.id
      );
      const offersReceived  = loans.filter(l => l.borrower_id === user.id && l.status === 'pending');
      const friendRequests  = friendships.filter(f => f.friend_id === user.id && f.status === 'pending');

      const notifItems = [
        ...offersReceived.map(l => ({
          id: l.id, date: l.created_at, type: 'loan_offer',
          text: `${getName(l.lender_id)} sent you a loan offer`,
        })),
        ...paymentsToConfirm.map(p => ({
          id: p.id, date: p.created_at, type: 'payment',
          text: `Confirm payment from ${getName(p.recorded_by)}`,
        })),
        ...friendRequests.map(f => ({
          id: f.id, date: f.created_at, type: 'friend',
          text: `${getName(f.user_id)} sent you a friend request`,
        })),
        ...termChanges.map(l => ({
          id: l.id, date: l.updated_at, type: 'term_change',
          text: `${getName(l.lender_id)} updated loan terms`,
        })),
      ];
      setNotifCount(notifItems.length);
      setNotifications(notifItems.slice(0, 6));

      /* ── Upcoming ── */
      const upcoming = userLoans
        .filter(l => l.status === 'active' && l.next_payment_date)
        .sort((a, b) => new Date(a.next_payment_date) - new Date(b.next_payment_date))
        .slice(0, 5)
        .map(l => {
          const dueDate  = new Date(l.next_payment_date);
          const daysLeft = differenceInDays(dueDate, today);
          return {
            id: l.id, amount: l.payment_amount || 0,
            date: l.next_payment_date, daysLeft,
            name: getName(l.lender_id === user.id ? l.borrower_id : l.lender_id),
            isLender: l.lender_id === user.id,
          };
        });
      setUpcomingPayments(upcoming);

      /* ── Pending (waiting for others) ── */
      const myRecordedPending = payments.filter(p =>
        p.recorded_by === user.id && p.status === 'pending_confirmation'
      );
      const myOffersOut = loans.filter(l => l.lender_id === user.id && l.status === 'pending');

      setPendingItems([
        ...myRecordedPending.map(p => {
          const loan    = userLoans.find(l => l.id === p.loan_id);
          const otherId = loan ? (loan.lender_id === user.id ? loan.borrower_id : loan.lender_id) : null;
          return {
            id: p.id, date: p.created_at, type: 'payment',
            text: `Waiting for ${otherId ? getName(otherId) : 'them'} to confirm payment`,
          };
        }),
        ...myOffersOut.map(l => ({
          id: l.id, date: l.created_at, type: 'loan_offer',
          text: `Waiting for ${getName(l.borrower_id)} to confirm loan offer`,
        })),
      ].slice(0, 8));

    } catch (e) { console.error("Sidebar data error:", e); }
  };

  /* ── Close nav dropdown on outside click ── */
  useEffect(() => {
    const h = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setOpenDropdown(null);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleLogout = () => { setOpenDropdown(null); logout(); };
  const active = (...pages) => pages.includes(activePage);

  const fmtDate = (d) => { try { return format(new Date(d), 'MMM d, yyyy').toUpperCase(); } catch { return ''; } };

  /* ── Icon color + SVG per notification type ── */
  const notifIcon = (type) => {
    switch (type) {
      case 'loan_offer': return { color: '#E8956E', svg: <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> };
      case 'payment': return { color: '#9B7FDB', svg: <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> };
      case 'friend': return { color: '#82F0B9', svg: <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> };
      case 'term_change': return { color: '#03ACEA', svg: <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> };
      default: return { color: '#9B9A98', svg: <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> };
    }
  };

  /* ── Left nav link style ── */
  const navLinkStyle = (...pages) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 16px', borderRadius: 10, textDecoration: 'none',
    fontSize: 13, fontFamily: "'DM Sans', sans-serif",
    whiteSpace: 'nowrap', transition: 'background 0.15s',
    color: active(...pages) ? '#1A1918' : '#5C5B5A',
    fontWeight: active(...pages) ? 600 : 500,
    background: active(...pages) ? 'rgba(0,0,0,0.06)' : 'transparent',
  });

  const subLinkStyle = (page) => ({
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '7px 16px 7px 42px', borderRadius: 8, textDecoration: 'none',
    fontSize: 12.5, fontFamily: "'DM Sans', sans-serif",
    color: activePage === page ? '#1A1918' : '#9B9A98',
    fontWeight: activePage === page ? 600 : 500,
    background: activePage === page ? 'rgba(0,0,0,0.04)' : 'transparent',
    transition: 'background 0.12s',
  });

  const toggleDropdown = (key) => setOpenDropdown(openDropdown === key ? null : key);

  const navBtnStyle = (key, ...pages) => ({
    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
    padding: '9px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
    fontSize: 13, fontFamily: "'DM Sans', sans-serif",
    whiteSpace: 'nowrap', transition: 'background 0.15s',
    color: (active(...pages) || openDropdown === key) ? '#1A1918' : '#5C5B5A',
    fontWeight: (active(...pages) || openDropdown === key) ? 600 : 500,
    background: active(...pages) ? 'rgba(0,0,0,0.06)' : 'transparent',
    justifyContent: 'space-between',
  });

  const chevron = (isOpen) => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round"
      style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', opacity: 0.4, flexShrink: 0 }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );

  /* ── Nav icons (14px) ── */
  const icons = {
    home: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    create: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
    record: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    upcoming: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    loans: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    friends: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    activity: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    docs: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>,
    settings: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    logout: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E8726E" strokeWidth="1.8" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  };

  const pageTitles = {
    Dashboard: 'Home', CreateOffer: 'Create Loan', RecordPayment: 'Record Payment',
    Upcoming: 'Upcoming', YourLoans: 'My Loans', Borrowing: 'Borrowing',
    Lending: 'Lending', Friends: 'Friends', RecentActivity: 'Activity',
    LoanAgreements: 'Documents', ComingSoon: 'Settings', Profile: 'Profile',
    Requests: 'Requests',
  };
  const pageTitle = pageTitles[activePage] || activePage;

  const TOP_BAR_H = 52;

  return (
    <>
      <style>{`
        @media (min-width: 900px) { .mobile-tab-bar { display: none !important; } }
      `}</style>

      {/* ══════ BLUE TOP BAR ══════ */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: TOP_BAR_H,
        background: '#03ACEA', zIndex: 110,
        display: 'flex', alignItems: 'center', padding: '0 28px',
      }}>
        <span style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 18, fontWeight: 700, color: 'white', letterSpacing: '-0.01em',
        }}>{pageTitle}</span>
      </div>

      {/* ══════ LEFT NAV SIDEBAR ══════ */}
      <nav ref={navRef} style={{
        position: 'fixed', left: 0, top: TOP_BAR_H, bottom: 0, width: 200,
        background: 'white', zIndex: 100,
        display: 'flex', flexDirection: 'column',
        fontFamily: "'DM Sans', sans-serif",
        overflowY: 'auto', overflowX: 'hidden',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px' }}>
          <Link to="/" style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontWeight: 400, fontStyle: 'italic', fontSize: '1.35rem',
            letterSpacing: '-0.02em', color: '#1A1918', textDecoration: 'none',
          }}>Vony</Link>
        </div>

        {/* Nav links */}
        <div style={{ flex: 1, padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Link to="/" style={navLinkStyle('Dashboard')}>{icons.home} Home</Link>
          <Link to={createPageUrl("CreateOffer")} style={navLinkStyle('CreateOffer')}>{icons.create} Create Loan</Link>
          <Link to={createPageUrl("RecordPayment")} style={navLinkStyle('RecordPayment')}>{icons.record} Record Payment</Link>

          {/* Upcoming dropdown */}
          <div>
            <button style={navBtnStyle('upcoming', 'Upcoming')} onClick={() => toggleDropdown('upcoming')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{icons.upcoming} Upcoming</span>
              {chevron(openDropdown === 'upcoming')}
            </button>
            {openDropdown === 'upcoming' && (
              <div style={{ padding: '2px 0 4px' }}>
                <Link to={{ pathname: createPageUrl("Upcoming"), search: '?tab=summary' }} onClick={() => setOpenDropdown(null)} style={subLinkStyle('Upcoming')}>Summary</Link>
                <Link to={{ pathname: createPageUrl("Upcoming"), search: '?tab=calendar' }} onClick={() => setOpenDropdown(null)} style={subLinkStyle('Upcoming')}>Calendar</Link>
              </div>
            )}
          </div>

          {/* My Loans dropdown */}
          <div>
            <button style={navBtnStyle('loans', 'YourLoans', 'Borrowing', 'Lending')} onClick={() => toggleDropdown('loans')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{icons.loans} My Loans</span>
              {chevron(openDropdown === 'loans')}
            </button>
            {openDropdown === 'loans' && (
              <div style={{ padding: '2px 0 4px' }}>
                <Link to={{ pathname: createPageUrl("YourLoans"), search: '?tab=lending' }} onClick={() => setOpenDropdown(null)} style={subLinkStyle('YourLoans')}>Lending</Link>
                <Link to={{ pathname: createPageUrl("YourLoans"), search: '?tab=borrowing' }} onClick={() => setOpenDropdown(null)} style={subLinkStyle('YourLoans')}>Borrowing</Link>
                <Link to={{ pathname: createPageUrl("YourLoans"), search: '?tab=details' }} onClick={() => setOpenDropdown(null)} style={subLinkStyle('YourLoans')}>Loan Details</Link>
              </div>
            )}
          </div>

          <Link to={createPageUrl("Friends")} style={navLinkStyle('Friends')}>{icons.friends} Friends</Link>
          <Link to={createPageUrl("RecentActivity")} style={navLinkStyle('RecentActivity')}>{icons.activity} Activity</Link>
          <Link to={createPageUrl("LoanAgreements")} style={navLinkStyle('LoanAgreements')}>{icons.docs} Documents</Link>
          <Link to={createPageUrl("ComingSoon")} style={navLinkStyle('ComingSoon')}>{icons.settings} Settings</Link>

          <div style={{ flex: 1 }} />

          {/* Profile compact */}
          <div style={{ padding: '0 8px 6px' }}>
            <Link to={createPageUrl("Profile")} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 8px', borderRadius: 10, textDecoration: 'none',
              background: active('Profile') ? 'rgba(0,0,0,0.06)' : 'transparent',
              transition: 'background 0.15s',
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', background: '#03ACEA',
                overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {user?.profile_picture_url
                  ? <img src={user.profile_picture_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>{avatarInitial}</span>
                }
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {firstName || 'Profile'}
              </span>
            </Link>
          </div>

          {/* Logout */}
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 16px', margin: '0 0 16px', borderRadius: 10, border: 'none',
            background: 'transparent', cursor: 'pointer', fontSize: 13,
            fontFamily: "'DM Sans', sans-serif", color: '#E8726E', fontWeight: 500,
            transition: 'background 0.12s', width: '100%',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,114,110,0.06)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            {icons.logout} Log Out
          </button>
        </div>
      </nav>

      {/* ══════ RIGHT INFO SIDEBAR ══════ */}
      <aside style={{
        position: 'fixed', right: 0, top: TOP_BAR_H, bottom: 0, width: 260,
        background: 'white', zIndex: 80,
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto', overflowX: 'hidden',
        fontFamily: "'DM Sans', sans-serif",
      }}>

        {/* Bell icon — top right */}
        <div style={{ padding: '18px 20px 0', display: 'flex', justifyContent: 'flex-end' }}>
          <Link to={createPageUrl("Requests")} style={{ textDecoration: 'none', display: 'inline-flex', position: 'relative' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill={active('Requests') ? '#1A1918' : '#9B9A98'}>
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
            </svg>
            {notifCount > 0 && (
              <div style={{
                position: 'absolute', top: -4, right: -6,
                background: '#E8726E', color: 'white', fontSize: 8, fontWeight: 700,
                minWidth: 14, height: 14, borderRadius: 7,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
              }}>{notifCount > 99 ? '99+' : notifCount}</div>
            )}
          </Link>
        </div>

        {/* ── Notifications ── */}
        <TimelineSection title="Notifications">
          {notifications.length === 0
            ? <p style={{ ...itemText, color: '#C7C6C4' }}>No new notifications</p>
            : <>
                {notifications.map((n, i) => {
                  const icon = notifIcon(n.type);
                  return (
                    <Link key={n.id || i} to={createPageUrl("Requests")} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      textDecoration: 'none',
                      marginBottom: i < notifications.length - 1 ? 16 : 0,
                    }}>
                      <TinyIcon color={icon.color}>{icon.svg}</TinyIcon>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={itemText}>{n.text}</p>
                        {n.date && <p style={itemSub}>{fmtDate(n.date)}</p>}
                      </div>
                    </Link>
                  );
                })}
                {notifCount > 0 && (
                  <Link to={createPageUrl("Requests")} style={{ fontSize: 10, color: '#03ACEA', textDecoration: 'none', fontWeight: 600, display: 'block', marginTop: 10 }}>See all</Link>
                )}
              </>
          }
        </TimelineSection>

        {/* ── Upcoming ── */}
        <TimelineSection title="Upcoming">
          {upcomingPayments.length === 0
            ? <p style={{ ...itemText, color: '#C7C6C4' }}>No upcoming payments</p>
            : upcomingPayments.map((p, i) => {
              const overdue = p.daysLeft < 0;
              const soon    = !overdue && p.daysLeft <= 3;
              const iconColor = overdue ? '#E8726E' : soon ? '#F5A623' : '#2DBD75';
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  marginBottom: i < upcomingPayments.length - 1 ? 16 : 0,
                }}>
                  <TinyIcon color={iconColor}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </TinyIcon>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={itemText}>
                      {p.isLender ? `${p.name} pays you $${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `Pay ${p.name} $${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </p>
                    {p.date && <p style={itemSub}>{fmtDate(p.date)}</p>}
                  </div>
                </div>
              );
            })
          }
        </TimelineSection>

        {/* ── Pending ── */}
        <TimelineSection title="Pending">
          {pendingItems.length === 0
            ? <p style={{ ...itemText, color: '#C7C6C4' }}>Nothing pending right now</p>
            : pendingItems.map((item, i) => (
              <div key={item.id || i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                marginBottom: i < pendingItems.length - 1 ? 16 : 0,
              }}>
                <TinyIcon color={'#9B9A98'}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                </TinyIcon>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={itemText}>{item.text}</p>
                  {item.date && <p style={itemSub}>{fmtDate(item.date)}</p>}
                </div>
              </div>
            ))
          }
        </TimelineSection>

      </aside>
    </>
  );
}

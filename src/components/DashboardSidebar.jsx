import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loan, Payment, Friendship } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";

export default function DashboardSidebar({ activePage = "Dashboard", user }) {
  const avatarInitial = (user?.full_name || 'U').charAt(0).toUpperCase();
  const { logout } = useAuth();

  const [notifCount, setNotifCount] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);

  useEffect(() => {
    if (user?.id) fetchNotifCount();
  }, [user?.id]);

  const fetchNotifCount = async () => {
    try {
      const [payments, loans, friendships] = await Promise.all([
        Payment.list().catch(() => []),
        Loan.list().catch(() => []),
        Friendship.list().catch(() => [])
      ]);
      const userLoans = loans.filter(l => l.lender_id === user.id || l.borrower_id === user.id);
      const userLoanIds = userLoans.map(l => l.id);
      const paymentsToConfirm = payments.filter(p =>
        p.status === 'pending_confirmation' && userLoanIds.includes(p.loan_id) && p.recorded_by !== user.id
      );
      const termChanges = loans.filter(l =>
        userLoanIds.includes(l.id) && l.status === 'pending_borrower_approval' && l.borrower_id === user.id
      );
      const extensions = loans.filter(l =>
        userLoanIds.includes(l.id) && l.extension_requested && l.extension_requested_by !== user.id
      );
      const offersReceived = loans.filter(l =>
        l.borrower_id === user.id && l.status === 'pending'
      );
      const friendRequests = friendships.filter(f =>
        f.friend_id === user.id && f.status === 'pending'
      );
      setNotifCount(
        paymentsToConfirm.length + termChanges.length + extensions.length +
        offersReceived.length + friendRequests.length
      );
    } catch (e) {
      console.error("Error fetching notification count:", e);
    }
  };

  // Close More dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    setMoreOpen(false);
    logout();
  };

  const isActive = (...pages) => pages.includes(activePage);

  const navItem = (page, label, pages) => {
    const active = pages ? isActive(...pages) : isActive(page);
    return {
      display: 'flex', alignItems: 'center',
      padding: '7px 13px', borderRadius: 9,
      textDecoration: 'none', fontSize: 13,
      fontFamily: "'DM Sans', sans-serif",
      whiteSpace: 'nowrap', transition: 'background 0.15s',
      color: active ? '#1A1918' : '#5C5B5A',
      fontWeight: active ? 600 : 500,
      background: active ? 'rgba(0,0,0,0.07)' : 'transparent',
    };
  };

  const moreActive = isActive('RecentActivity', 'LoanAgreements', 'ComingSoon');

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 60,
        background: 'rgba(255,255,255,0.90)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        boxShadow: '0 1px 24px rgba(0,0,0,0.05)',
        zIndex: 100,
        display: 'flex', alignItems: 'center',
        padding: '0 20px',
        gap: 2,
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {/* ── Vony logo ── */}
        <Link to="/" style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontWeight: 400, fontStyle: 'italic',
          fontSize: '1.45rem', letterSpacing: '-0.02em',
          color: '#1A1918', textDecoration: 'none',
          marginRight: 12, flexShrink: 0,
        }}>Vony</Link>

        {/* ── Primary nav ── */}
        <Link to="/" style={navItem('Dashboard', 'Home')}>Home</Link>
        <Link to={createPageUrl("CreateOffer")} style={navItem('CreateOffer', 'Create Loan')}>Create Loan</Link>
        <Link to={createPageUrl("RecordPayment")} style={navItem('RecordPayment', 'Record Payment')}>Record Payment</Link>
        <Link to={createPageUrl("Upcoming")} style={navItem('Upcoming', 'Upcoming')}>Upcoming</Link>
        <Link
          to={createPageUrl("YourLoans")}
          style={navItem(null, 'Lending & Borrowing', ['YourLoans', 'Borrowing', 'Lending'])}
        >Lending & Borrowing</Link>
        <Link to={createPageUrl("Friends")} style={navItem('Friends', 'Friends')}>Friends</Link>

        {/* ── More dropdown ── */}
        <div ref={moreRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 13px', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontSize: 13, fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
              transition: 'background 0.15s',
              color: moreActive || moreOpen ? '#1A1918' : '#5C5B5A',
              fontWeight: moreActive || moreOpen ? 600 : 500,
              background: moreActive ? 'rgba(0,0,0,0.07)' : moreOpen ? 'rgba(0,0,0,0.05)' : 'transparent',
            }}
          >
            More
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: moreOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', opacity: 0.6 }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {moreOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', left: 0,
              minWidth: 200, background: 'white',
              borderRadius: 14, border: '1px solid rgba(0,0,0,0.07)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
              padding: 6, zIndex: 200,
            }}>
              <Link
                to={createPageUrl("RecentActivity")}
                onClick={() => setMoreOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 9, textDecoration: 'none',
                  fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                  color: activePage === 'RecentActivity' ? '#1A1918' : '#5C5B5A',
                  fontWeight: activePage === 'RecentActivity' ? 600 : 500,
                  background: activePage === 'RecentActivity' ? 'rgba(0,0,0,0.05)' : 'transparent',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { if (activePage !== 'RecentActivity') e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                onMouseLeave={e => { if (activePage !== 'RecentActivity') e.currentTarget.style.background = 'transparent'; }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="#9B9A98"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>
                Recent Activity
              </Link>
              <Link
                to={createPageUrl("LoanAgreements")}
                onClick={() => setMoreOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 9, textDecoration: 'none',
                  fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                  color: activePage === 'LoanAgreements' ? '#1A1918' : '#5C5B5A',
                  fontWeight: activePage === 'LoanAgreements' ? 600 : 500,
                  background: activePage === 'LoanAgreements' ? 'rgba(0,0,0,0.05)' : 'transparent',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { if (activePage !== 'LoanAgreements') e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                onMouseLeave={e => { if (activePage !== 'LoanAgreements') e.currentTarget.style.background = 'transparent'; }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="#9B9A98"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                Loan Documents
              </Link>

              <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '4px 6px' }} />

              <Link
                to={createPageUrl("ComingSoon")}
                onClick={() => setMoreOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 9, textDecoration: 'none',
                  fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                  color: activePage === 'ComingSoon' ? '#1A1918' : '#5C5B5A',
                  fontWeight: activePage === 'ComingSoon' ? 600 : 500,
                  background: activePage === 'ComingSoon' ? 'rgba(0,0,0,0.05)' : 'transparent',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { if (activePage !== 'ComingSoon') e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                onMouseLeave={e => { if (activePage !== 'ComingSoon') e.currentTarget.style.background = 'transparent'; }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9B9A98" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Settings
              </Link>

              <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '4px 6px' }} />

              <button
                onClick={handleLogout}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 9, width: '100%',
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                  color: '#E8726E', fontWeight: 500, textAlign: 'left',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,114,110,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E8726E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Log Out
              </button>
            </div>
          )}
        </div>

        {/* ── Spacer ── */}
        <div style={{ flex: 1 }} />

        {/* ── Notifications ── */}
        <Link
          to={createPageUrl("Requests")}
          style={{
            position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 10,
            background: activePage === 'Requests' ? 'rgba(0,0,0,0.07)' : 'rgba(0,0,0,0.03)',
            textDecoration: 'none', flexShrink: 0, marginRight: 6,
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill={activePage === 'Requests' ? '#1A1918' : '#787776'}>
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
          </svg>
          {notifCount > 0 && (
            <div style={{
              position: 'absolute', top: -3, right: -3,
              background: '#E8726E', color: 'white',
              fontSize: 9, fontWeight: 700,
              minWidth: 15, height: 15, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 3px', lineHeight: 1,
            }}>
              {notifCount > 99 ? '99+' : notifCount}
            </div>
          )}
        </Link>

        {/* ── Profile avatar ── */}
        <Link
          to={createPageUrl("Profile")}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 34, height: 34, borderRadius: '50%',
            background: '#1A1918',
            textDecoration: 'none', flexShrink: 0, overflow: 'hidden',
            outline: activePage === 'Profile' ? '2px solid #82F0B9' : 'none',
            outlineOffset: 2,
          }}
        >
          {user?.profile_picture_url ? (
            <img src={user.profile_picture_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700, color: 'white' }}>
              {avatarInitial}
            </span>
          )}
        </Link>
      </nav>
    </>
  );
}

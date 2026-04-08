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

export default function DashboardSidebar({ activePage = "Dashboard", user, tabs, activeTab, onTabChange }) {
  const { logout } = useAuth();
  const firstName = user?.full_name?.split(' ')[0] || '';
  const [notifCount, setNotifCount] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);

  useEffect(() => {
    document.body.style.paddingLeft = '';
    return () => { document.body.style.paddingLeft = ''; };
  }, []);

  useEffect(() => { if (user?.id) fetchData(); }, [user?.id]);

  useEffect(() => {
    const handler = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
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
    } catch (e) { console.error("Nav data error:", e); }
  };

  const active = (...pages) => pages.includes(activePage);
  const moreActive = active('RecentActivity', 'LoanAgreements');

  const linkStyle = (...pages) => ({
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '5px 11px', borderRadius: 20, textDecoration: 'none',
    fontSize: 13, fontFamily: "'DM Sans', sans-serif",
    color: '#1A1918',
    fontWeight: active(...pages) ? 600 : 400,
    background: active(...pages) ? 'rgba(255,255,255,0.55)' : 'transparent',
    transition: 'background 0.13s',
    whiteSpace: 'nowrap',
  });

  const comingSoonBadge = {
    fontSize: 9, fontWeight: 700, color: '#7C3AED', background: 'rgba(124,58,237,0.1)',
    borderRadius: 4, padding: '2px 5px', letterSpacing: '0.04em', textTransform: 'uppercase',
    marginLeft: 6, flexShrink: 0,
  };

  const dropdownItemStyle = {
    display: 'flex', alignItems: 'center', gap: 9, width: '100%',
    padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 13.5, fontFamily: "'DM Sans', sans-serif", fontWeight: 400,
    color: '#1A1918', textAlign: 'left', textDecoration: 'none',
    borderRadius: 8, transition: 'background 0.12s',
  };

  return createPortal(
    <>
      {/* ── Floating top nav bar ── */}
      <div style={{
        position: 'fixed', top: 20, left: 0, right: 0,
        zIndex: 100, padding: '0 40px', pointerEvents: 'none',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', pointerEvents: 'auto' }}>
          <div style={{
            display: 'flex', alignItems: 'center', height: 50,
            background: 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(22px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(22px) saturate(1.6)',
            borderRadius: 100,
            padding: '0 20px',
            boxShadow: '0 2px 20px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)',
            border: '1px solid rgba(255,255,255,0.55)',
          }}>

            {/* Logo */}
            <Link to="/" style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 400, fontStyle: 'italic', fontSize: '1.3rem',
              letterSpacing: '-0.02em', color: '#1A1918', textDecoration: 'none',
              flexShrink: 0, marginRight: 14,
            }}>Vony</Link>

            {/* Nav links */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, justifyContent: 'center' }}>
              <Link to="/" style={linkStyle('Dashboard')}>Home</Link>
              <Link to={createPageUrl("CreateOffer")} style={linkStyle('CreateOffer')}>Create Loan</Link>
              <Link to={createPageUrl("RecordPayment")} style={linkStyle('RecordPayment')}>Record Payment</Link>
              <Link to={createPageUrl("Upcoming")} style={linkStyle('Upcoming')}>Upcoming</Link>
              <Link to={createPageUrl("YourLoans")} style={linkStyle('YourLoans', 'Borrowing', 'Lending')}>My Loans</Link>
              <Link to={createPageUrl("Friends")} style={linkStyle('Friends')}>Friends</Link>

              {/* More dropdown */}
              <div ref={moreRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setMoreOpen(o => !o)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '5px 11px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                    color: '#1A1918',
                    fontWeight: moreActive ? 600 : 400,
                    background: moreActive ? 'rgba(255,255,255,0.55)' : 'transparent',
                    transition: 'background 0.13s',
                  }}
                >
                  More
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 1, opacity: 0.5 }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {moreOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
                    width: 200, background: 'rgba(255,255,255,0.9)',
                    backdropFilter: 'blur(20px) saturate(1.5)',
                    WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
                    borderRadius: 14, padding: 6,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: '1px solid rgba(255,255,255,0.6)', zIndex: 200,
                  }}>
                    <Link to={createPageUrl("RecentActivity")} onClick={() => setMoreOpen(false)}
                      style={{ ...dropdownItemStyle, fontWeight: active('RecentActivity') ? 600 : 400 }}>
                      Activity
                    </Link>
                    <Link to={createPageUrl("LoanAgreements")} onClick={() => setMoreOpen(false)}
                      style={{ ...dropdownItemStyle, fontWeight: active('LoanAgreements') ? 600 : 400 }}>
                      Documents
                    </Link>

                    <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '4px 4px' }} />

                    <button style={{ ...dropdownItemStyle, color: '#9B9A98', cursor: 'default' }}>
                      Learn <span style={comingSoonBadge}>Soon</span>
                    </button>
                    <button style={{ ...dropdownItemStyle, color: '#9B9A98', cursor: 'default' }}>
                      Loan Help <span style={comingSoonBadge}>Soon</span>
                    </button>

                    <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '4px 4px' }} />

                    <a href="https://www.vony-lending.com/help" target="_blank" rel="noopener noreferrer" style={{ ...dropdownItemStyle, color: '#787776' }}>
                      Help & Support
                    </a>
                    <button onClick={() => { setMoreOpen(false); logout(); }} style={{ ...dropdownItemStyle, color: '#E8726E' }}>
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            </nav>

            {/* Right: Bell + Round Profile */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>

              {/* Notifications bell */}
              <Link to={createPageUrl("Requests")} style={{
                position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 34, height: 34, borderRadius: 20, textDecoration: 'none',
                color: active('Requests') ? '#1A1918' : '#787776',
                background: active('Requests') ? 'rgba(255,255,255,0.55)' : 'transparent',
                transition: 'background 0.13s',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {notifCount > 0 && (
                  <span style={{
                    position: 'absolute', top: 3, right: 3,
                    fontSize: 9, fontWeight: 700, color: 'white', background: '#E8726E',
                    borderRadius: 10, padding: '1px 4px', minWidth: 14, textAlign: 'center', lineHeight: 1.5,
                  }}>
                    {notifCount > 99 ? '99+' : notifCount}
                  </span>
                )}
              </Link>

              {/* Profile — round avatar */}
              <Link to={createPageUrl("Profile")} style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', borderRadius: '50%' }}>
                {user?.profile_picture_url ? (
                  <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '2px solid rgba(255,255,255,0.8)', boxShadow: '0 0 0 1.5px rgba(0,0,0,0.08)' }}>
                    <img src={user.profile_picture_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#54A6CF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '2px solid rgba(255,255,255,0.8)', boxShadow: '0 0 0 1.5px rgba(0,0,0,0.08)' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'white', fontFamily: "'DM Sans', sans-serif" }}>
                      {(user?.full_name || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </Link>

            </div>
          </div>
        </div>
      </div>

      {/* Tab bar row — non-dashboard pages with tabs */}
      {activePage !== 'Dashboard' && tabs && tabs.length > 0 && onTabChange && (
        <div style={{
          position: 'fixed', top: 82, left: 0, right: 0,
          zIndex: 99, padding: '0 52px', pointerEvents: 'none',
        }}>
          <div style={{
            maxWidth: 1080, margin: '0 auto',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            height: 48, pointerEvents: 'auto',
          }}>
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
          </div>
        </div>
      )}

      {/* ── Decorative side icons ── */}
      {(() => {
        const icons = [
          { color: '#7A9EB5', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
          { color: '#8B82B5', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> },
          { color: '#6A9E88', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
          { color: '#A8956A', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
          { color: '#7A9EB5', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
          { color: '#B58A8A', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
          { color: '#8B82B5', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
          { color: '#6A9E9E', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
        ];
        const spacing = 120;
        const startY = 140;
        return (
          <div className="side-icons-container" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
            {icons.map(({ color, svg }, i) => {
              const y = startY + i * spacing;
              const boxStyle = (rotation) => ({
                position: 'absolute', top: y,
                width: 34, height: 34,
                borderRadius: 8,
                background: `${color}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transform: `rotate(${rotation}deg)`,
                color: `${color}CC`,
              });
              return (
                <div key={`side-icons-${i}`}>
                  <div style={{ ...boxStyle(-15), left: 14 }}><div style={{ width: 18, height: 18 }}>{svg}</div></div>
                  <div style={{ ...boxStyle(15), right: 14 }}><div style={{ width: 18, height: 18 }}>{svg}</div></div>
                </div>
              );
            })}
          </div>
        );
      })()}
    </>,
    document.body
  );
}

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loan, Payment, Friendship } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";

const PAGE_TITLES = {
  Dashboard: null,
  Upcoming: 'Upcoming',
  YourLoans: 'My Loans',
  Borrowing: 'My Loans',
  Lending: 'My Loans',
  Friends: 'Friends',
  RecentActivity: 'Recent Activity',
  LoanAgreements: 'Documents',
  ComingSoon: 'Shop & Learn',
  Profile: 'Profile',
  Requests: 'Notifications',
};

export default function DashboardSidebar({ activePage = "Dashboard", user, tabs, activeTab, onTabChange }) {
  const { logout } = useAuth();
  const [notifCount, setNotifCount] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
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

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

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
  const moreActive = active('RecentActivity', 'LoanAgreements', 'RecordPayment', 'ComingSoon');

  const linkStyle = (...pages) => ({
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '6px 16px', borderRadius: 10, textDecoration: 'none',
    fontSize: 14, fontFamily: "'DM Sans', sans-serif",
    color: '#1A1918',
    fontWeight: active(...pages) ? 600 : 500,
    background: active(...pages) ? 'rgba(0,0,0,0.06)' : 'transparent',
    transition: 'background 0.2s',
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

  // Glass nav style matching VonyHomePage
  const glassNavStyle = {
    display: 'flex', alignItems: 'center', height: 50,
    backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 7%, rgba(255,255,255,0) 86%)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    backdropFilter: 'blur(16px) saturate(1.5)',
    WebkitBackdropFilter: 'blur(16px) saturate(1.5)',
    borderRadius: 16,
    padding: '0 20px',
    boxShadow: 'inset 0 -5px 6px 0 rgba(255,255,255,0.5), inset 0 -8px 24px 0 rgba(255,255,255,0.12), 0 2px 4px -2px rgba(0,0,0,0.08), 0 8px 16px -8px rgba(0,0,0,0.03)',
    border: '1px solid rgba(255,255,255,0.4)',
  };

  return createPortal(
    <>
      {/* ── Floating top nav bar ── */}
      <div style={{
        position: 'fixed', top: 20, left: 0, right: 0,
        zIndex: 100, padding: isMobile ? '0 16px' : '0 40px', pointerEvents: 'none',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', pointerEvents: 'auto' }}>
          <div style={glassNavStyle}>

            {/* Logo */}
            <Link to="/" style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 400, fontStyle: 'italic', fontSize: '1.3rem',
              letterSpacing: '-0.02em', color: '#1A1918', textDecoration: 'none',
              flexShrink: 0, marginRight: 14,
            }}>Vony</Link>

            {/* Desktop: Nav links */}
            {!isMobile && (
              <nav style={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, justifyContent: 'center' }}>
                <Link to="/" style={linkStyle('Dashboard')}>Home</Link>
                <Link to={createPageUrl("Upcoming")} style={linkStyle('Upcoming')}>Upcoming</Link>
                <Link to={createPageUrl("YourLoans")} style={linkStyle('YourLoans', 'Borrowing', 'Lending')}>My Loans</Link>
                <Link to={createPageUrl("Friends")} style={linkStyle('Friends')}>Friends</Link>

                {/* More dropdown */}
                <div ref={moreRef} style={{ position: 'relative' }}>
                  <button
                    onClick={() => setMoreOpen(o => !o)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '6px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                      fontSize: 14, fontFamily: "'DM Sans', sans-serif",
                      color: '#1A1918',
                      fontWeight: moreActive ? 600 : 500,
                      background: moreActive ? 'rgba(0,0,0,0.06)' : 'transparent',
                      transition: 'background 0.2s',
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
                        Recent Activity
                      </Link>
                      <Link to={createPageUrl("LoanAgreements")} onClick={() => setMoreOpen(false)}
                        style={{ ...dropdownItemStyle, fontWeight: active('LoanAgreements') ? 600 : 400 }}>
                        Documents
                      </Link>
                      <Link to={createPageUrl("RecordPayment")} onClick={() => setMoreOpen(false)}
                        style={{ ...dropdownItemStyle, fontWeight: active('RecordPayment') ? 600 : 400 }}>
                        Record Payment
                      </Link>

                      <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '4px 4px' }} />

                      <Link to={createPageUrl("ComingSoon")} onClick={() => setMoreOpen(false)}
                        style={{ ...dropdownItemStyle, fontWeight: active('ComingSoon') ? 600 : 400 }}>
                        Learn
                      </Link>
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
            )}

            {isMobile && <div style={{ flex: 1 }} />}

            {/* Right side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>

              {/* Notifications bell */}
              <Link to={createPageUrl("Requests")} style={{
                position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 34, height: 34, borderRadius: 10, textDecoration: 'none',
                color: active('Requests') ? '#1A1918' : '#787776',
                background: active('Requests') ? 'rgba(0,0,0,0.06)' : 'transparent',
                transition: 'background 0.2s',
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

              {/* Desktop: Profile avatar */}
              {!isMobile && (
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
              )}

              {/* Mobile: Hamburger button */}
              {isMobile && (
                <button
                  onClick={() => setMobileMenuOpen(o => !o)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 44, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: mobileMenuOpen ? '#ECEAE6' : 'rgba(255,255,255,0.06)',
                    backgroundImage: mobileMenuOpen ? 'none' : 'linear-gradient(179deg, rgba(255,255,255,0.8) 7%, rgba(255,255,255,0) 92%)',
                    boxShadow: mobileMenuOpen ? 'none' : 'inset 0 -2px 3px 0 rgba(255,255,255,0.1), inset 0 -4px 12px 0 rgba(255,255,255,0.06), 0 2px 4px -2px rgba(0,0,0,0.08), 0 8px 16px -8px rgba(0,0,0,0.03)',
                    backdropFilter: 'blur(18px) saturate(1.5)',
                    WebkitBackdropFilter: 'blur(18px) saturate(1.5)',
                    flexShrink: 0,
                  }}
                  aria-label="Menu"
                >
                  {mobileMenuOpen ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1f1f1f" strokeWidth="2" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  ) : (
                    <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
                      <line x1="0" y1="1" x2="20" y2="1" stroke="#1f1f1f" strokeWidth="1.4" strokeLinecap="round"/>
                      <line x1="0" y1="7" x2="20" y2="7" stroke="#1f1f1f" strokeWidth="1.4" strokeLinecap="round"/>
                      <line x1="0" y1="13" x2="20" y2="13" stroke="#1f1f1f" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile full-screen menu overlay */}
      {isMobile && mobileMenuOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 99,
          backgroundColor: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(18px) saturate(1.5)',
          WebkitBackdropFilter: 'blur(18px) saturate(1.5)',
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
        }}>
          <nav style={{
            flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
            padding: '80px 32px 32px',
          }}>
            {[
              { label: 'Home',          to: '/',                              pages: ['Dashboard'] },
              { label: 'Upcoming',      to: createPageUrl("Upcoming"),        pages: ['Upcoming'] },
              { label: 'My Loans',      to: createPageUrl("YourLoans"),       pages: ['YourLoans', 'Borrowing', 'Lending'] },
              { label: 'Friends',       to: createPageUrl("Friends"),         pages: ['Friends'] },
              { label: 'Recent Activity', to: createPageUrl("RecentActivity"),  pages: ['RecentActivity'] },
              { label: 'Documents',       to: createPageUrl("LoanAgreements"),  pages: ['LoanAgreements'] },
              { label: 'Record Payment',  to: createPageUrl("RecordPayment"),   pages: ['RecordPayment'] },
              { label: 'Learn',           to: createPageUrl("ComingSoon"),       pages: ['ComingSoon'] },
              { label: 'Notifications',   to: createPageUrl("Requests"),        pages: ['Requests'] },
              { label: 'Profile',       to: createPageUrl("Profile"),         pages: ['Profile'] },
            ].map(({ label, to, pages }) => (
              <div key={label} style={{ borderBottom: '0.5px solid rgba(31,31,31,0.06)' }}>
                <Link
                  to={to}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: 'block', padding: '18px 0',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
                    color: '#1f1f1f', textDecoration: 'none',
                    opacity: active(...pages) ? 1 : 0.6,
                  }}
                >
                  {label}
                </Link>
              </div>
            ))}
            <div style={{ marginTop: 16 }}>
              <button
                onClick={() => { setMobileMenuOpen(false); logout(); }}
                style={{
                  display: 'block', width: '100%', padding: '18px 0',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
                  color: '#E8726E', background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                Log Out
              </button>
            </div>
          </nav>

          <div style={{ padding: '24px', textAlign: 'center' }}>
            <p style={{
              fontFamily: 'monospace', fontSize: 10, textTransform: 'uppercase',
              letterSpacing: '0.15em', color: 'rgba(31,31,31,0.4)', margin: 0,
            }}>
              Vony · Lending Made Simple
            </p>
          </div>
        </div>
      )}

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
          { color: '#54A6CF', label: 'Home',      page: 'Dashboard',      svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
          { color: '#D97706', label: 'Upcoming',  page: 'Upcoming',       svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
          { color: '#2563EB', label: 'My loans',  page: 'YourLoans',      svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
          { color: '#DC2626', label: 'Friends',   page: 'Friends',        svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
          { color: '#7C3AED', label: 'Recent Activity', page: 'RecentActivity', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
          { color: '#0891B2', label: 'Documents', page: 'LoanAgreements', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
        ];
        const leftRots  = [-13, -9, -15, -8, -14, -10];
        const rightRots = [ 11, 15,   9, 14,  10,  16];
        const spacing = 120;
        const startY = 140;
        const badgeStyle = (color, rotation) => ({
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 10px 5px 8px',
          borderRadius: 8,
          background: '#E5E2DF',
          color: '#1A1918',
          transform: `rotate(${rotation}deg)`,
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 11, fontWeight: 500,
          whiteSpace: 'nowrap',
          textDecoration: 'none',
          pointerEvents: 'auto',
        });
        return (
          <div className="side-icons-container" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
            {icons.map(({ color, label, page }, i) => {
              const y = startY + i * spacing;
              const to = createPageUrl(page);
              const dot = <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />;
              return (
                <div key={`side-icons-${i}`}>
                  <Link to={to} style={{ position: 'absolute', top: y, left: 10, ...badgeStyle(color, leftRots[i]) }}>
                    {dot}
                    <span>{label}</span>
                  </Link>
                  <Link to={to} style={{ position: 'absolute', top: y, right: 10, ...badgeStyle(color, rightRots[i]) }}>
                    {dot}
                    <span>{label}</span>
                  </Link>
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

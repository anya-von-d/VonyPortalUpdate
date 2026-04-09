import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loan, Payment, Friendship } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";

export default function DashboardSidebar({ activePage = "Dashboard", user, tabs, activeTab, onTabChange }) {
  const { logout } = useAuth();
  const [notifCount, setNotifCount] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
  const closeTimerRef = useRef(null);

  useEffect(() => { if (user?.id) fetchData(); }, [user?.id]);

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
  const moreActive = active('RecentActivity', 'LoanAgreements', 'RecordPayment', 'ComingSoon', 'LoanHelp');

  const linkStyle = (...pages) => ({
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '6px 16px', borderRadius: 10, textDecoration: 'none',
    fontSize: 14, fontFamily: "'DM Sans', sans-serif",
    color: '#1A1918',
    fontWeight: active(...pages) ? 600 : 500,
    background: 'transparent',
    transition: 'background 0.2s',
    whiteSpace: 'nowrap',
  });

  const comingSoonBadge = {
    fontSize: 9, fontWeight: 700, color: '#7C3AED', background: 'rgba(124,58,237,0.1)',
    borderRadius: 4, padding: '2px 5px', letterSpacing: '0.04em', textTransform: 'uppercase',
    marginLeft: 6, flexShrink: 0,
  };

  const glassNavStyle = {
    display: 'flex', alignItems: 'center', gap: 4, height: 48,
    backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 7%, rgba(255,255,255,0) 86%)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    backdropFilter: 'blur(16px) saturate(1.5)',
    WebkitBackdropFilter: 'blur(16px) saturate(1.5)',
    borderRadius: 16,
    padding: '6px 24px',
    boxShadow: 'rgba(0,0,0,0.08) 0px 2px 4px -2px, rgba(0,0,0,0.03) 0px 8px 16px -8px, rgba(255,255,255,0.5) 0px -5px 6px 0px inset, rgba(255,255,255,0.12) 0px -8px 24px 0px inset',
  };

  return createPortal(
    <>
      {/* ── Floating top nav bar ── */}
      <div style={{
        position: 'fixed', top: 20, left: 0, right: 0,
        zIndex: 100, padding: isMobile ? '0 16px' : '0 40px', pointerEvents: 'none',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {/* Three-section layout: Logo | Glass Nav | Icons */}
        <div style={{ maxWidth: 1000, margin: '0 auto', pointerEvents: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Left: Vony wordmark — outside the glass pill */}
          <Link to="/" style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontWeight: 600, fontStyle: 'italic', fontSize: '1.75rem',
            letterSpacing: '-0.01em', color: '#1A1918', textDecoration: 'none',
            flexShrink: 0, lineHeight: 1,
          }}>Vony</Link>

          {/* Center: Glass nav pill — desktop only */}
          {!isMobile && (
            <div style={glassNavStyle}>
              <nav style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Link to="/" style={linkStyle('Dashboard')} onMouseEnter={() => setPanelOpen(false)}>Home</Link>
                <Link to={createPageUrl("Upcoming")} style={linkStyle('Upcoming')} onMouseEnter={() => setPanelOpen(false)}>Upcoming</Link>
                <Link to={createPageUrl("YourLoans")} style={linkStyle('YourLoans', 'Borrowing', 'Lending')} onMouseEnter={() => setPanelOpen(false)}>My Loans</Link>
                <Link to={createPageUrl("Friends")} style={linkStyle('Friends')} onMouseEnter={() => setPanelOpen(false)}>Friends</Link>

                {/* More dropdown — hover-activated panel matching VonyHomePage */}
                <div
                  style={{ position: 'relative' }}
                  onMouseEnter={() => {
                    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
                    setPanelOpen(true);
                  }}
                  onMouseLeave={() => {
                    closeTimerRef.current = setTimeout(() => setPanelOpen(false), 120);
                  }}
                >
                  <button
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '6px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                      fontSize: 14, fontFamily: "'DM Sans', sans-serif",
                      color: '#1A1918',
                      fontWeight: moreActive ? 600 : 500,
                      background: 'transparent',
                      transition: 'background 0.2s',
                    }}
                  >
                    More
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 1, opacity: 0.5 }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {panelOpen && (
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
                      background: 'linear-gradient(rgba(255,255,255,0.92) 7%, rgba(255,255,255,0.85) 86%) rgba(255,255,255,0.45)',
                      backdropFilter: 'blur(16px) saturate(1.5)',
                      WebkitBackdropFilter: 'blur(16px) saturate(1.5)',
                      borderRadius: 16, padding: '16px 20px',
                      boxShadow: 'rgba(0,0,0,0.1) 0px 4px 12px -2px, rgba(0,0,0,0.05) 0px 12px 24px -8px, rgba(255,255,255,0.6) 0px -5px 6px 0px inset, rgba(255,255,255,0.2) 0px -8px 24px 0px inset',
                      zIndex: 200, whiteSpace: 'nowrap',
                    }}>
                      <div style={{ display: 'flex', gap: 20, alignItems: 'stretch' }}>
                        {/* Left: SVG image */}
                        <div style={{ width: 160, flexShrink: 0, borderRadius: 12, overflow: 'hidden' }}>
                          <svg width="100%" height="100%" viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="160" height="120" rx="12" fill="#54A6CF"/>
                            <text x="80" y="56" textAnchor="middle" fontFamily="'Cormorant Garamond', Georgia, serif" fontSize="28" fontWeight="600" fontStyle="italic" fill="#fff">Vony</text>
                            <path d="M100 68L100 84L105 80L109 88L112 87L108 79L114 78Z" fill="#fff" opacity="0.9"/>
                          </svg>
                        </div>
                        {/* Right: links column */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {[
                            { label: 'Recent Activity', desc: 'Your payment history', to: createPageUrl("RecentActivity"), pages: ['RecentActivity'] },
                            { label: 'Documents', desc: 'Loan agreements and records', to: createPageUrl("LoanAgreements"), pages: ['LoanAgreements'] },
                            { label: 'Record Payment', desc: 'Log a payment on a loan', to: createPageUrl("RecordPayment"), pages: ['RecordPayment'] },
                            { label: 'Learn', desc: 'Guides and loan tips', to: createPageUrl("ComingSoon"), pages: ['ComingSoon'], soon: true },
                            { label: 'Loan Help', desc: 'Get help with your loans', to: createPageUrl("LoanHelp"), pages: ['LoanHelp'], soon: true },
                          ].map(({ label, desc, to, pages, soon }) => (
                            <Link
                              key={label}
                              to={to}
                              onClick={() => setPanelOpen(false)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '8px 14px', borderRadius: 10, textDecoration: 'none',
                                color: '#1A1918', transition: 'background 0.15s',
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: active(...pages) ? 700 : 600, color: '#1A1918', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {label}
                                  {soon && <span style={comingSoonBadge}>Soon</span>}
                                </span>
                                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 400, color: '#787776', lineHeight: 1.3 }}>{desc}</span>
                              </div>
                            </Link>
                          ))}
                          <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '4px 14px' }} />
                          <a
                            href="https://www.vony-lending.com/help"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', borderRadius: 10, textDecoration: 'none', color: '#1A1918', transition: 'background 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#1A1918' }}>Help & Support</span>
                              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 400, color: '#787776', lineHeight: 1.3 }}>Get in touch with our team</span>
                            </div>
                          </a>
                          <button
                            onClick={() => { setPanelOpen(false); logout(); }}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'transparent', transition: 'background 0.15s', textAlign: 'left', width: '100%' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#E8726E' }}>Log Out</span>
                              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 400, color: '#787776', lineHeight: 1.3 }}>Sign out of your account</span>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </nav>
            </div>
          )}

          {/* Right: Bell + Profile — outside the glass pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>

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
              { label: 'Loan Help',       to: createPageUrl("LoanHelp"),         pages: ['LoanHelp'] },
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

    </>,
    document.body
  );
}

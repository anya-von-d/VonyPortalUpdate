import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loan, Payment, Friendship } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";

export default function DashboardSidebar({ activePage = "Dashboard", user }) {
  const avatarInitial = (user?.full_name || 'U').charAt(0).toUpperCase();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [notifCount, setNotifCount] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const settingsRef = useRef(null);

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

  // Close settings dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    setSettingsOpen(false);
    setMobileMenuOpen(false);
    logout();
  };

  const isActive = (page) => activePage === page;
  const linkStyle = (page) => ({
    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10,
    textDecoration: 'none', fontSize: 14, transition: 'background 0.15s, color 0.15s',
    color: isActive(page) ? '#678AFB' : '#5C5B5A',
    background: isActive(page) ? 'rgba(103,138,251,0.08)' : 'transparent',
    fontWeight: isActive(page) ? 600 : 500,
  });
  const ic = (page) => isActive(page) ? '#678AFB' : '#5C5B5A';
  const ib = (page) => ({
    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
    background: isActive(page) ? 'rgba(103,138,251,0.14)' : 'rgba(0,0,0,0.07)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  });

  const bellIcon = (color) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );

  const gearIcon = (color) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );

  const navLinks = (
    <>
      {/* Dashboard — filled grid */}
      <Link to="/" onClick={() => setMobileMenuOpen(false)} style={linkStyle('Dashboard')}>
        <div style={ib('Dashboard')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill={ic('Dashboard')}><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/></svg>
        </div>
        Dashboard
      </Link>
      {/* Create Loan — filled circle + white plus */}
      <Link to={createPageUrl("CreateOffer")} onClick={() => setMobileMenuOpen(false)} style={linkStyle('CreateOffer')}>
        <div style={ib('CreateOffer')}>
          <svg width="13" height="13" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill={ic('CreateOffer')}/><path d="M12 7v10M7 12h10" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>
        </div>
        Create Loan
      </Link>
      {/* Record Payment — filled card */}
      <Link to={createPageUrl("RecordPayment")} onClick={() => setMobileMenuOpen(false)} style={linkStyle('RecordPayment')}>
        <div style={ib('RecordPayment')}>
          <svg width="13" height="13" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2.5" fill={ic('RecordPayment')}/><rect x="2" y="9" width="20" height="4" fill="rgba(0,0,0,0.22)"/><rect x="5" y="15.5" width="5" height="1.5" rx="0.75" fill="rgba(255,255,255,0.65)"/></svg>
        </div>
        Record Payment
      </Link>
      {/* Upcoming — filled calendar */}
      <Link to={createPageUrl("Upcoming")} onClick={() => setMobileMenuOpen(false)} style={linkStyle('Upcoming')}>
        <div style={ib('Upcoming')}>
          <svg width="13" height="13" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="16" rx="2.5" fill={ic('Upcoming')}/><rect x="3" y="6" width="18" height="6.5" rx="2.5" fill="rgba(0,0,0,0.2)"/><rect x="8" y="2.5" width="2" height="5" rx="1" fill={ic('Upcoming')}/><rect x="14" y="2.5" width="2" height="5" rx="1" fill={ic('Upcoming')}/><rect x="7" y="15" width="2.5" height="2.5" rx="0.5" fill="rgba(255,255,255,0.8)"/><rect x="11.5" y="15" width="2.5" height="2.5" rx="0.5" fill="rgba(255,255,255,0.8)"/><rect x="16" y="15" width="2.5" height="2.5" rx="0.5" fill="rgba(255,255,255,0.5)"/></svg>
        </div>
        Upcoming
      </Link>
      {/* Lending & Borrowing — filled bar chart */}
      <Link to={createPageUrl("YourLoans")} onClick={() => setMobileMenuOpen(false)} style={linkStyle('YourLoans')}>
        <div style={ib('YourLoans')}>
          <svg width="13" height="13" viewBox="0 0 24 24"><rect x="2" y="13" width="5" height="9" rx="1.5" fill={ic('YourLoans')} opacity="0.45"/><rect x="9.5" y="8" width="5" height="14" rx="1.5" fill={ic('YourLoans')} opacity="0.7"/><rect x="17" y="3" width="5" height="19" rx="1.5" fill={ic('YourLoans')}/></svg>
        </div>
        Lending & Borrowing
      </Link>
      {/* Friends — opens FriendsPopup (no Friends page) */}
      <button
        type="button"
        onClick={() => { setMobileMenuOpen(false); window.dispatchEvent(new CustomEvent('open-friends-popup')); }}
        style={{ ...linkStyle('Friends'), background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
      >
        <div style={ib('Friends')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill={ic('Friends')}><circle cx="8.5" cy="6.5" r="4"/><path d="M0 21c0-5 3.8-8 8.5-8s8.5 3 8.5 8H0z"/><circle cx="19" cy="7.5" r="3" opacity="0.55"/><path d="M14.5 21c0-3.5 2-5.5 4.5-5.5S24 17.5 24 21h-9.5" opacity="0.55"/></svg>
        </div>
        Friends
      </button>
      {/* Recent Activity — filled clock */}
      <Link to={createPageUrl("RecentActivity")} onClick={() => setMobileMenuOpen(false)} style={linkStyle('RecentActivity')}>
        <div style={ib('RecentActivity')}>
          <svg width="13" height="13" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill={ic('RecentActivity')}/><path d="M12 6.5v5.5l3.5 2.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
        </div>
        Recent Activity
      </Link>
      {/* Loan Documents — filled document */}
      <Link to={createPageUrl("LoanAgreements")} onClick={() => setMobileMenuOpen(false)} style={linkStyle('LoanAgreements')}>
        <div style={ib('LoanAgreements')}>
          <svg width="13" height="13" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill={ic('LoanAgreements')}/><path d="M14 2v6h6" fill="rgba(0,0,0,0.2)"/><line x1="8" y1="13" x2="16" y2="13" stroke="white" strokeWidth="1.6" strokeLinecap="round"/><line x1="8" y1="17" x2="16" y2="17" stroke="white" strokeWidth="1.6" strokeLinecap="round"/><line x1="8" y1="9" x2="11" y2="9" stroke="white" strokeWidth="1.6" strokeLinecap="round"/></svg>
        </div>
        Loan Documents
      </Link>
    </>
  );

  const settingsDropdown = (
    <div style={{
      position: 'absolute', top: '100%', right: 0, marginTop: 6,
      background: 'white', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
      border: '1px solid rgba(0,0,0,0.06)', minWidth: 160, overflow: 'hidden', zIndex: 100,
    }}>
      <Link
        to={createPageUrl("Profile")}
        onClick={() => { setSettingsOpen(false); setMobileMenuOpen(false); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          textDecoration: 'none', fontSize: 13, color: '#1A1918', fontWeight: 500,
          transition: 'background 0.12s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5C5B5A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        Profile
      </Link>
      <Link
        to={createPageUrl("ComingSoon")}
        onClick={() => { setSettingsOpen(false); setMobileMenuOpen(false); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          textDecoration: 'none', fontSize: 13, color: '#1A1918', fontWeight: 500,
          transition: 'background 0.12s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5C5B5A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        Coming Soon
      </Link>
      <div style={{ height: 1, background: 'rgba(0,0,0,0.06)' }} />
      <button
        onClick={handleLogout}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          width: '100%', border: 'none', background: 'transparent', cursor: 'pointer',
          fontSize: 13, color: '#E8726E', fontWeight: 500, fontFamily: "'DM Sans', sans-serif",
          transition: 'background 0.12s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8726E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        Log Out
      </button>
    </div>
  );

  return (
    <>
      {/* ── Mobile top bar ── */}
      <div className="mobile-header" style={{
        display: 'none', /* shown via CSS at <=900px */
        position: 'fixed', top: 0, left: 0, right: 0, height: 56,
        background: '#EDECE8', zIndex: 53,
        alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {/* Hamburger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', background: mobileMenuOpen ? 'rgba(103,138,251,0.1)' : 'transparent' }}
        >
          {mobileMenuOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5C5B5A" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5C5B5A" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          )}
        </button>

        {/* Vony logo */}
        <Link to="/" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 400, fontStyle: 'italic', fontSize: '1.35rem', letterSpacing: '-0.02em', color: '#1A1918', textDecoration: 'none' }}>Vony</Link>

        {/* Right icons: bell + settings */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Link to={createPageUrl("Home")} onClick={() => setMobileMenuOpen(false)} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, background: 'transparent', textDecoration: 'none' }}>
            {bellIcon('#5C5B5A')}
            {notifCount > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                background: '#E8726E', color: 'white',
                fontSize: 8, fontWeight: 700,
                minWidth: 14, height: 14, borderRadius: 7,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 3px', lineHeight: 1,
              }}>
                {notifCount > 99 ? '99+' : notifCount}
              </span>
            )}
          </Link>
          <div ref={settingsRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', background: settingsOpen ? 'rgba(103,138,251,0.1)' : 'transparent' }}
            >
              {gearIcon(settingsOpen ? '#678AFB' : '#5C5B5A')}
            </button>
            {settingsOpen && settingsDropdown}
          </div>
        </div>
      </div>

      {/* ── Mobile slide-out menu overlay ── */}
      {mobileMenuOpen && (
        <div
          className="mobile-menu-overlay"
          style={{ position: 'fixed', inset: 0, zIndex: 52, display: 'flex' }}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }} onClick={() => setMobileMenuOpen(false)} />
          <div style={{
            position: 'relative', width: 260, background: '#EDECE8',
            paddingTop: 64, display: 'flex', flexDirection: 'column',
            overflowY: 'auto', boxShadow: '4px 0 20px rgba(0,0,0,0.1)',
          }}>
            <nav style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {navLinks}
            </nav>
            <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <Link to={createPageUrl("Profile")} onClick={() => setMobileMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#678AFB', color: 'white', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {avatarInitial}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.full_name || 'User'}</div>
                  <div style={{ fontSize: 11, color: '#787776' }}>View profile</div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Desktop sidebar ── */}
      <aside className="home-sidebar" style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, width: 240,
        background: '#1A1918',
        zIndex: 52, display: 'flex', flexDirection: 'column',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{ padding: '22px 24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <Link to="/" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 400, fontStyle: 'italic', fontSize: '1.5rem', letterSpacing: '-0.02em', color: 'white', textDecoration: 'none' }}>Vony</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link to={createPageUrl("Home")} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'transparent', transition: 'background 0.15s', textDecoration: 'none' }}>
              {bellIcon('rgba(255,255,255,0.7)')}
              {notifCount > 0 && (
                <span style={{
                  position: 'absolute', top: 2, right: 2,
                  background: '#E8726E', color: 'white',
                  fontSize: 9, fontWeight: 700,
                  minWidth: 16, height: 16, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px', lineHeight: 1,
                }}>
                  {notifCount > 99 ? '99+' : notifCount}
                </span>
              )}
            </Link>
            <div ref={settingsRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: 'transparent',
                  transition: 'background 0.15s',
                }}
              >
                {gearIcon('rgba(255,255,255,0.7)')}
              </button>
              {settingsOpen && settingsDropdown}
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 3, background: '#EDECE8', overflowY: 'auto' }}>
          {navLinks}
        </nav>
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(0,0,0,0.06)', background: '#EDECE8' }}>
          <Link to={createPageUrl("Profile")} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#678AFB', color: 'white', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {avatarInitial}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.full_name || 'User'}</div>
              <div style={{ fontSize: 11, color: '#787776' }}>View profile</div>
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
}

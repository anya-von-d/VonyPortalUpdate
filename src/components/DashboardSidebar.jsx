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
    display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10,
    textDecoration: 'none', fontSize: 14, transition: 'background 0.15s, color 0.15s',
    color: isActive(page) ? '#678AFB' : '#5C5B5A',
    background: isActive(page) ? 'rgba(103,138,251,0.08)' : 'transparent',
    fontWeight: isActive(page) ? 600 : 500,
  });
  const ic = (page) => isActive(page) ? '#678AFB' : '#5C5B5A';

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
      <Link to="/" onClick={() => setMobileMenuOpen(false)} style={linkStyle('Dashboard')}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ic('Dashboard')} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
        Dashboard
      </Link>
      <Link to={createPageUrl("CreateOffer")} onClick={() => setMobileMenuOpen(false)} style={linkStyle('CreateOffer')}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ic('CreateOffer')} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
        Create Loan
      </Link>
      <Link to={createPageUrl("RecordPayment")} onClick={() => setMobileMenuOpen(false)} style={linkStyle('RecordPayment')}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ic('RecordPayment')} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /><polyline points="7 17 12 22 17 17" /></svg>
        Record Payment
      </Link>
      <Link to={createPageUrl("Upcoming")} onClick={() => setMobileMenuOpen(false)} style={linkStyle('Upcoming')}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ic('Upcoming')} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
        Upcoming
      </Link>
      <Link to={createPageUrl("YourLoans")} onClick={() => setMobileMenuOpen(false)} style={linkStyle('YourLoans')}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ic('YourLoans')} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
        Lending & Borrowing
      </Link>
      <Link to={createPageUrl("Friends")} onClick={() => setMobileMenuOpen(false)} style={linkStyle('Friends')}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ic('Friends')} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
        Friends
      </Link>
      <Link to={createPageUrl("RecentActivity")} onClick={() => setMobileMenuOpen(false)} style={linkStyle('RecentActivity')}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ic('RecentActivity')} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
        Recent Activity
      </Link>
      <Link to={createPageUrl("LoanAgreements")} onClick={() => setMobileMenuOpen(false)} style={linkStyle('LoanAgreements')}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ic('LoanAgreements')} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
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
        background: '#F5F4F0', zIndex: 53,
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
          <Link to={createPageUrl("Requests")} onClick={() => setMobileMenuOpen(false)} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, background: 'transparent', textDecoration: 'none' }}>
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
            position: 'relative', width: 260, background: '#F5F4F0',
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
        background: '#F5F4F0',
        zIndex: 52, display: 'flex', flexDirection: 'column',
        fontFamily: "'DM Sans', sans-serif", overflowY: 'auto',
      }}>
        <div style={{ padding: '22px 24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 400, fontStyle: 'italic', fontSize: '1.5rem', letterSpacing: '-0.02em', color: '#1A1918', textDecoration: 'none' }}>Vony</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link to={createPageUrl("Requests")} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: activePage === 'Requests' ? 'rgba(103,138,251,0.1)' : 'transparent', transition: 'background 0.15s', textDecoration: 'none' }}>
              {bellIcon(activePage === 'Requests' ? '#678AFB' : '#5C5B5A')}
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
                  background: settingsOpen ? 'rgba(103,138,251,0.1)' : 'transparent',
                  transition: 'background 0.15s',
                }}
              >
                {gearIcon(settingsOpen ? '#678AFB' : '#5C5B5A')}
              </button>
              {settingsOpen && settingsDropdown}
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {navLinks}
        </nav>
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
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

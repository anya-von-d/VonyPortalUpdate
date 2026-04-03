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
    display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px', borderRadius: 10,
    textDecoration: 'none', fontSize: 13, transition: 'background 0.15s',
    color: 'white',
    background: isActive(page) ? 'rgba(0,0,0,0.15)' : 'transparent',
    fontWeight: isActive(page) ? 600 : 450,
  });
  const ic = 'white';

  // Compact rounded icon box — white tint on blue sidebar
  const iconBox = (svg) => (
    <div style={{
      width: 24, height: 24, borderRadius: 6,
      background: 'rgba(255,255,255,0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {svg}
    </div>
  );

  const navLinks = (
    <>
      {/* Dashboard — 4 filled squares */}
      <Link to="/" onClick={() => setMobileMenuOpen(false)} style={linkStyle('Dashboard')}>
        {iconBox(<svg width="13" height="13" viewBox="0 0 24 24" fill={ic}><path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z"/></svg>)}
        Dashboard
      </Link>
      {/* Create Loan — filled plus circle */}
      <Link to={createPageUrl("CreateOffer")} onClick={() => setMobileMenuOpen(false)} style={linkStyle('CreateOffer')}>
        {iconBox(<svg width="13" height="13" viewBox="0 0 24 24" fill={ic}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>)}
        Create Loan
      </Link>
      {/* Record Payment — filled coin with dollar */}
      <Link to={createPageUrl("RecordPayment")} onClick={() => setMobileMenuOpen(false)} style={linkStyle('RecordPayment')}>
        {iconBox(<svg width="13" height="13" viewBox="0 0 24 24" fill={ic}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.93V18h-2v-1.07C9.09 16.57 7.5 15.18 7.5 13h2c0 1.1.9 2 2.5 2 1.1 0 2-.9 2-2 0-1.21-.86-1.75-2.71-2.29C9.13 10.05 7.5 9.25 7.5 7c0-1.93 1.59-3.17 3.5-3.41V2h0v1.59c1.91.24 3.5 1.48 3.5 3.41h-2c0-1.1-.9-2-2.5-2C10.9 5 10 5.9 10 7c0 1.21.86 1.75 2.71 2.29 2.16.63 3.79 1.43 3.79 3.71 0 1.93-1.59 3.17-3.5 3.41z"/></svg>)}
        Record Payment
      </Link>
      {/* Upcoming — filled calendar */}
      <Link to={createPageUrl("Upcoming")} onClick={() => setMobileMenuOpen(false)} style={linkStyle('Upcoming')}>
        {iconBox(<svg width="13" height="13" viewBox="0 0 24 24" fill={ic}><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5C3.89 3 3.01 3.9 3.01 5L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/></svg>)}
        Upcoming
      </Link>
      {/* Lending & Borrowing — filled trending up */}
      <Link to={createPageUrl("YourLoans")} onClick={() => setMobileMenuOpen(false)} style={linkStyle('YourLoans')}>
        {iconBox(<svg width="13" height="13" viewBox="0 0 24 24" fill={ic}><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>)}
        Lending & Borrowing
      </Link>
      {/* Friends — filled people */}
      <Link to={createPageUrl("Friends")} onClick={() => setMobileMenuOpen(false)} style={linkStyle('Friends')}>
        {iconBox(<svg width="13" height="13" viewBox="0 0 24 24" fill={ic}><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>)}
        Friends
      </Link>
      {/* Recent Activity — filled clock */}
      <Link to={createPageUrl("RecentActivity")} onClick={() => setMobileMenuOpen(false)} style={linkStyle('RecentActivity')}>
        {iconBox(<svg width="13" height="13" viewBox="0 0 24 24" fill={ic}><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>)}
        Recent Activity
      </Link>
      {/* Loan Documents — filled document */}
      <Link to={createPageUrl("LoanAgreements")} onClick={() => setMobileMenuOpen(false)} style={linkStyle('LoanAgreements')}>
        {iconBox(<svg width="13" height="13" viewBox="0 0 24 24" fill={ic}><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>)}
        Loan Documents
      </Link>
    </>
  );

  // Settings dropdown — opens upward from sidebar footer
  const settingsDropdown = (
    <div style={{
      position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 6,
      background: 'white', borderRadius: 10, boxShadow: '0 -4px 20px rgba(0,0,0,0.10)',
      border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden', zIndex: 100,
    }}>
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
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5C5B5A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E8726E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        Log Out
      </button>
    </div>
  );

  // Footer items rendered inside the sidebar (Settings → Notifications → Profile, top→bottom)
  const sidebarFooter = (
    <div style={{ padding: '8px 12px 12px', borderTop: '1px solid rgba(255,255,255,0.2)', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Settings */}
      <div ref={settingsRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          style={{
            ...linkStyle('Settings'),
            width: '100%', border: 'none', cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif", textAlign: 'left',
            background: settingsOpen ? 'rgba(0,0,0,0.15)' : 'transparent',
          }}
        >
          {iconBox(<svg width="13" height="13" viewBox="0 0 24 24" fill={ic}><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>)}
          Settings
        </button>
        {settingsOpen && settingsDropdown}
      </div>

      {/* Notifications */}
      <Link to={createPageUrl("Requests")} onClick={() => setMobileMenuOpen(false)} style={{ ...linkStyle('Requests'), position: 'relative' }}>
        {iconBox(<svg width="13" height="13" viewBox="0 0 24 24" fill={ic}><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>)}
        Notifications
        {notifCount > 0 && (
          <span style={{ marginLeft: 'auto', background: '#E8726E', color: 'white', fontSize: 10, fontWeight: 700, minWidth: 18, height: 18, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', lineHeight: 1 }}>
            {notifCount > 99 ? '99+' : notifCount}
          </span>
        )}
      </Link>

      {/* Profile */}
      <Link to={createPageUrl("Profile")} onClick={() => setMobileMenuOpen(false)} style={linkStyle('Profile')}>
        {iconBox(<svg width="13" height="13" viewBox="0 0 24 24" fill={ic}><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>)}
        Profile
      </Link>
    </div>
  );

  return (
    <>
      {/* Desktop top bar — empty spacer so content shifts correctly */}
      <div className="home-sidebar" style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 56,
        background: 'transparent', zIndex: 60,
        pointerEvents: 'none',
      }} />

      {/* ── Mobile top bar ── */}
      <div className="mobile-header" style={{
        display: 'none', /* shown via CSS at <=900px */
        position: 'fixed', top: 0, left: 0, right: 0, height: 56,
        background: '#05ACEC', zIndex: 53,
        alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {/* Hamburger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', background: mobileMenuOpen ? 'rgba(0,0,0,0.06)' : 'transparent' }}
        >
          {mobileMenuOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5C5B5A" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5C5B5A" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          )}
        </button>

        {/* Vony logo */}
        <Link to="/" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 400, fontStyle: 'italic', fontSize: '1.35rem', letterSpacing: '-0.02em', color: '#1A1918', textDecoration: 'none' }}>Vony</Link>

        {/* Right: avatar */}
        <Link to={createPageUrl("Profile")} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', background: '#678AFB', color: 'white', fontWeight: 700, fontSize: 12, textDecoration: 'none', flexShrink: 0 }}>
          {avatarInitial}
        </Link>
      </div>

      {/* ── Mobile slide-out menu overlay ── */}
      {mobileMenuOpen && (
        <div
          className="mobile-menu-overlay"
          style={{ position: 'fixed', inset: 0, zIndex: 52, display: 'flex' }}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }} onClick={() => setMobileMenuOpen(false)} />
          <div style={{
            position: 'relative', width: 260, background: '#05ACEC',
            paddingTop: 64, display: 'flex', flexDirection: 'column',
            overflowY: 'auto', boxShadow: '4px 0 20px rgba(0,0,0,0.1)',
          }}>
            <nav style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {navLinks}
            </nav>
            {sidebarFooter}
          </div>
        </div>
      )}

      {/* ── Desktop sidebar ── */}
      <aside className="home-sidebar" style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, width: 220,
        background: '#05ACEC',
        zIndex: 52, display: 'flex', flexDirection: 'column',
        fontFamily: "'DM Sans', sans-serif", overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{ padding: '18px 16px 10px', flexShrink: 0 }}>
          <Link to="/" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 400, fontStyle: 'italic', fontSize: '1.5rem', letterSpacing: '-0.02em', color: 'white', textDecoration: 'none' }}>Vony</Link>
        </div>
        <nav style={{ flex: 1, padding: '4px 12px 4px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navLinks}
        </nav>
        {sidebarFooter}
      </aside>
    </>
  );
}

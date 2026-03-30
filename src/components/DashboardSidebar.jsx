import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function DashboardSidebar({ activePage = "Dashboard", user }) {
  const avatarInitial = (user?.full_name || 'U').charAt(0).toUpperCase();

  const isActive = (page) => activePage === page;
  const linkStyle = (page) => ({
    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10,
    textDecoration: 'none', fontSize: 13, transition: 'background 0.15s, color 0.15s',
    color: isActive(page) ? '#678AFB' : '#5C5B5A',
    background: isActive(page) ? 'rgba(103,138,251,0.08)' : 'transparent',
    fontWeight: isActive(page) ? 600 : 500,
  });
  const ic = (page) => isActive(page) ? '#678AFB' : '#5C5B5A';

  return (
    <aside className="home-sidebar" style={{
      position: 'fixed', left: 0, top: 0, bottom: 0, width: 240,
      background: 'rgba(255,255,255,0.97)',
      borderRight: '1px solid rgba(0,0,0,0.06)',
      zIndex: 52, display: 'flex', flexDirection: 'column',
      fontFamily: "'DM Sans', sans-serif", overflowY: 'auto',
    }}>
      <div style={{ padding: '22px 24px 32px' }}>
        <Link to="/" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 400, fontStyle: 'italic', fontSize: '1.5rem', letterSpacing: '-0.02em', color: '#1A1918', textDecoration: 'none' }}>Vony</Link>
      </div>
      <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Dashboard */}
        <Link to="/" style={linkStyle('Dashboard')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ic('Dashboard')} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
          Dashboard
        </Link>
        {/* Create Loan */}
        <Link to={createPageUrl("CreateOffer")} style={linkStyle('CreateOffer')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ic('CreateOffer')} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
          Create Loan
        </Link>
        {/* Record Payment */}
        <Link to={createPageUrl("RecordPayment")} style={linkStyle('RecordPayment')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ic('RecordPayment')} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /><polyline points="7 17 12 22 17 17" /></svg>
          Record Payment
        </Link>
        {/* Upcoming */}
        <Link to={createPageUrl("Upcoming")} style={linkStyle('Upcoming')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ic('Upcoming')} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          Upcoming
        </Link>
        {/* Your Loans */}
        <Link to={createPageUrl("YourLoans")} style={linkStyle('YourLoans')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ic('YourLoans')} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
          Your Loans
        </Link>
        <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '8px 14px' }} />
        {/* Friends */}
        <Link to={createPageUrl("Friends")} style={linkStyle('Friends')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ic('Friends')} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          Friends
        </Link>
        {/* Recent Activity */}
        <Link to={createPageUrl("RecentActivity")} style={linkStyle('RecentActivity')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ic('RecentActivity')} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          Recent Activity
        </Link>
        {/* Loan Documents */}
        <Link to={createPageUrl("LoanAgreements")} style={linkStyle('LoanAgreements')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ic('LoanAgreements')} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
          Loan Documents
        </Link>
        {/* Notifications */}
        <Link to={createPageUrl("Requests")} style={linkStyle('Requests')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ic('Requests')} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
          Notifications
        </Link>
      </nav>
      {/* User profile at bottom */}
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
  );
}

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Payment, Loan, Friendship } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";
import UserAvatar from "@/components/ui/UserAvatar";

const NAV_ITEMS = [
  { label: 'Home',            to: '/' },
  { label: 'Upcoming',        to: createPageUrl("Upcoming") },
  { label: 'Create Loan',     to: createPageUrl("CreateOffer") },
  { label: 'Record Payment',  to: createPageUrl("RecordPayment") },
  { label: 'My Loans',        to: createPageUrl("YourLoans") },
  { label: 'Friends',         to: createPageUrl("Friends") },
  { label: 'Recent Activity', to: createPageUrl("RecentActivity") },
  { label: 'Documents',       to: createPageUrl("LoanAgreements") },
];

const SOON_ITEMS = [
  { label: 'Learn',     to: createPageUrl("ComingSoon") },
  { label: 'Loan Help', to: createPageUrl("LoanHelp") },
];

export default function MeshMobileNav({ user, activePage }) {
  const { logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  useEffect(() => {
    if (!user?.id) return;
    const fetchCounts = async () => {
      try {
        const [payments, loans, friendships] = await Promise.all([
          Payment.list('-created_at').catch(() => []),
          Loan.list().catch(() => []),
          Friendship.list().catch(() => []),
        ]);
        const userLoans = loans.filter(l => l.lender_id === user.id || l.borrower_id === user.id);
        const userLoanIds = userLoans.map(l => l.id);
        const toConfirm = payments.filter(p =>
          p.status === 'pending_confirmation' && userLoanIds.includes(p.loan_id) && p.recorded_by !== user.id
        );
        const offers = loans.filter(l => l.borrower_id === user.id && l.status === 'pending');
        const friendReqs = friendships.filter(f => f.friend_id === user.id && f.status === 'pending');
        setNotifCount(toConfirm.length + offers.length + friendReqs.length);
      } catch {}
    };
    fetchCounts();
  }, [user?.id]);

  if (!isMobile) return null;

  return (
    <>
      {/* Fixed top bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        height: 56, display: 'flex', alignItems: 'center',
        padding: '0 16px',
        background: '#03ACEA',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {/* Left: Hamburger */}
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'transparent', flexShrink: 0,
          }}
          aria-label="Menu"
        >
          {menuOpen ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
              <line x1="0" y1="1" x2="20" y2="1" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
              <line x1="0" y1="7" x2="20" y2="7" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
              <line x1="0" y1="13" x2="20" y2="13" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          )}
        </button>

        {/* Center: Vony logo */}
        <Link to="/" onClick={() => setMenuOpen(false)} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontWeight: 600, fontStyle: 'italic', fontSize: '1.4rem',
          color: 'white', textDecoration: 'none', lineHeight: 1,
          letterSpacing: '-0.02em',
        }}>Vony</Link>

        {/* Right: bell + profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {/* Bell */}
          <Link to={createPageUrl("Requests")} onClick={() => setMenuOpen(false)} style={{
            position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 10, textDecoration: 'none',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {notifCount > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                width: 8, height: 8, borderRadius: '50%',
                background: 'white', border: '1.5px solid #03ACEA',
              }} />
            )}
          </Link>

          {/* Profile */}
          <Link to={createPageUrl("Profile")} onClick={() => setMenuOpen(false)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 10, textDecoration: 'none',
          }}>
            <UserAvatar name={user?.full_name || user?.username} src={user?.avatar_url || user?.profile_picture_url} size={28} />
          </Link>
        </div>
      </div>

      {/* Full-screen menu overlay */}
      {menuOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 199,
          background: 'rgba(250,250,250,0.96)',
          backdropFilter: 'blur(18px) saturate(1.5)',
          WebkitBackdropFilter: 'blur(18px) saturate(1.5)',
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          <nav style={{
            flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
            padding: '80px 32px 32px',
          }}>
            {NAV_ITEMS.map(({ label, to }) => (
              <div key={label} style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
                <Link
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: 'block', padding: '16px 0',
                    fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
                    color: '#1A1918', textDecoration: 'none',
                    opacity: activePage === label ? 1 : 0.55,
                  }}
                >{label}</Link>
              </div>
            ))}

            {SOON_ITEMS.map(({ label, to }) => (
              <div key={label} style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
                <Link
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 0',
                    fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
                    color: '#1A1918', textDecoration: 'none', opacity: 0.55,
                  }}
                >
                  {label}
                  <span style={{ fontSize: 8, fontWeight: 700, color: '#9B9A98', background: 'rgba(0,0,0,0.05)', borderRadius: 4, padding: '2px 6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>SOON</span>
                </Link>
              </div>
            ))}

            {/* Help & Log Out */}
            <div style={{ marginTop: 20 }}>
              <a
                href="https://www.vony-lending.com/help"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '14px 0',
                  borderBottom: '0.5px solid rgba(0,0,0,0.06)',
                  fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
                  color: '#787776', textDecoration: 'none',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9B9A98" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Help & Support
              </a>
              <button
                onClick={() => { setMenuOpen(false); logout?.(); }}
                style={{
                  display: 'block', width: '100%', padding: '14px 0',
                  fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
                  color: '#E8726E', background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'left',
                }}
              >Log Out</button>
            </div>
          </nav>

          <div style={{ padding: '24px', textAlign: 'center' }}>
            <p style={{ fontFamily: 'monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(0,0,0,0.3)', margin: 0 }}>
              Vony · Lending Made Simple
            </p>
          </div>
        </div>
      )}
    </>
  );
}

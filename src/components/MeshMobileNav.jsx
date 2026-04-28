import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import SettingsModal from "@/components/SettingsModal";
import UserAvatar from "@/components/ui/UserAvatar";
import { useNotificationCount } from "@/components/utils/notificationCount";

/* ── Small icons for radial popup items ── */
const IcoLend   = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>;
const IcoBorrow = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>;
const IcoCreate = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcoUp      = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="16 12 12 8 8 12"/><line x1="12" y1="16" x2="12" y2="8"/></svg>;
const IcoRecords = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>;

/* ── Radial popup items that fly out from the center button ── */
const RADIAL_ITEMS = [
  {
    label: 'Lending',
    to: 'Lending',
    icon: <IcoLend />,
    // offsets from button center (px): x = horiz, yAbove = how far above nav pill top
    x: -85, yAbove: 20,
  },
  {
    label: 'Borrowing',
    to: 'Borrowing',
    icon: <IcoBorrow />,
    x: 85, yAbove: 20,
  },
  {
    label: 'Log Payment',
    to: 'RecordPayment',
    icon: <IcoUp />,
    x: -30, yAbove: 90,
  },
  {
    label: 'Create Loan',
    to: 'CreateOffer',
    icon: <IcoCreate />,
    x: 30, yAbove: 90,
  },
];

/* ── Single bottom nav button (no label) ── */
function NavBtn({ icon, text, active, isOpen, onTap }) {
  return (
    <button
      onClick={onTap}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 0, padding: '4px 6px',
        background: 'none', border: 'none', cursor: 'pointer',
        minWidth: text ? 'auto' : 50,
      }}
    >
      <div style={{
        minWidth: 44, height: 36, borderRadius: 20, padding: text ? '0 10px' : '0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active || isOpen ? 'rgba(0,0,0,0.08)' : 'transparent',
        color: active || isOpen ? '#1A1918' : 'rgba(0,0,0,0.45)',
        transition: 'background 0.15s, color 0.15s',
        fontSize: 11, fontWeight: active || isOpen ? 700 : 600,
        fontFamily: "'DM Sans', sans-serif",
        letterSpacing: '-0.02em', whiteSpace: 'nowrap',
      }}>
        {icon || text}
      </div>
    </button>
  );
}

export default function MeshMobileNav({ user, activePage }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const navRef = useRef(null);
  const notifCount = useNotificationCount(user?.id);
  const [lbOpen, setLbOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close radial menu on outside tap
  useEffect(() => {
    if (!lbOpen) return;
    const handler = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setLbOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [lbOpen]);

  // Listen for friends navigation event (legacy — now navigates to Friends page)
  useEffect(() => {
    const handler = (e) => {
      setLbOpen(false);
      const tab = e?.detail?.initialTab;
      navigate(createPageUrl('Friends') + (tab ? `?tab=${tab}` : ''));
    };
    window.addEventListener('open-friends-popup', handler);
    return () => window.removeEventListener('open-friends-popup', handler);
  }, [navigate]);

  const isActivePage = (page) => {
    if (page === 'Home') return location.pathname === '/' || location.pathname === '';
    const url = createPageUrl(page);
    return location.pathname.includes(url.replace(/^\//, ''));
  };

  const isLendingActive = isActivePage('LendingBorrowing') || isActivePage('Lending') || isActivePage('Borrowing');

  if (!isMobile) return (
    <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
  );

  const handleRadialTap = (to) => {
    setLbOpen(false);
    navigate(createPageUrl(to));
  };

  return (
    <>
      {/* ── Top row: Vony logo + bell ── */}
      <div style={{
        position: 'absolute', top: 16, left: 0, right: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
        fontFamily: "'DM Sans', sans-serif",
        pointerEvents: 'none',
      }}>
        <Link to="/" style={{
          pointerEvents: 'auto',
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontWeight: 600, fontStyle: 'italic', fontSize: '1.5rem',
          color: '#1A1918', lineHeight: 1, letterSpacing: '-0.02em',
          textDecoration: 'none',
        }}>Vony</Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'auto' }}>
          {/* Search icon */}
          <button
            onClick={() => {/* future: open search */}}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(0,0,0,0.55)',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>

          {/* Bell */}
          <button
            onClick={() => navigate(createPageUrl('Notifications'))}
            style={{
              position: 'relative', background: 'none', border: 'none',
              cursor: 'pointer', padding: '4px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(0,0,0,0.55)',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {notifCount > 0 && (
              <span style={{
                position: 'absolute', top: 0, right: 0,
                minWidth: 16, height: 16, borderRadius: 8,
                background: '#14324D', color: '#fff',
                fontSize: 9, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 3px', lineHeight: 1,
                border: '1.5px solid white',
              }}>
                {notifCount > 99 ? '99+' : notifCount}
              </span>
            )}
          </button>

          {/* Profile avatar */}
          <button
            onClick={() => navigate(createPageUrl('Profile'))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', border: '1.5px solid rgba(0,0,0,0.10)' }}>
              <UserAvatar
                name={user?.full_name || user?.username || ''}
                src={user?.profile_picture_url || user?.avatar_url}
                size={28}
                radius={14}
              />
            </div>
          </button>
        </div>
      </div>

      {/* ── Keyframes for radial pop ── */}
      <style>{`
        @keyframes radialPop {
          0%   { opacity: 0; transform: translateX(-50%) scale(0.25); }
          70%  { transform: translateX(-50%) scale(1.08); }
          100% { opacity: 1; transform: translateX(-50%) scale(1); }
        }
        @keyframes radialFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      {/* ── Backdrop when L&B menu is open ── */}
      {lbOpen && (
        <div
          onClick={() => setLbOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 195,
            background: 'rgba(0,0,0,0.18)',
            backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)',
            animation: 'radialFadeIn 0.15s ease both',
          }}
        />
      )}

      {/* ── Floating bottom pill nav ── */}
      <div
        ref={navRef}
        style={{
          position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          zIndex: 200,
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
          border: '1px solid rgba(255,255,255,0.72)',
          borderRadius: 40,
          padding: '6px 4px 8px',
          display: 'flex', alignItems: 'center', gap: 0,
          boxShadow: '0 2px 16px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.05)',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* Home */}
        <NavBtn
          active={isActivePage('Home')}
          onTap={() => navigate('/')}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          }
        />

        {/* Calendar */}
        <NavBtn
          active={isActivePage('Upcoming')}
          onTap={() => navigate(createPageUrl('Upcoming'))}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
              <text x="12" y="19.5" textAnchor="middle" fontSize="8" fontWeight="bold" fill="currentColor" stroke="none" fontFamily="system-ui, sans-serif">{new Date().getDate()}</text>
            </svg>
          }
        />

        {/* Lending & Borrowing — text button with radial menu */}
        <div style={{ position: 'relative' }}>
          {/* Radial items */}
          {lbOpen && RADIAL_ITEMS.map((item, i) => (
            <div
              key={item.to}
              onClick={() => handleRadialTap(item.to)}
              style={{
                position: 'absolute',
                bottom: `calc(100% + ${item.yAbove}px)`,
                left: `calc(50% + ${item.x}px)`,
                transform: 'translateX(-50%)',
                zIndex: 210,
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                animation: `radialPop 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.055}s both`,
              }}
            >
              <div style={{
                width: 54, height: 54, borderRadius: 27,
                background: 'white',
                boxShadow: '0 6px 22px rgba(0,0,0,0.16), 0 1px 6px rgba(0,0,0,0.08)',
                border: '1px solid rgba(0,0,0,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#1A1918',
              }}>
                {item.icon}
              </div>
              <span style={{
                fontSize: 10, fontWeight: 600, color: '#1A1918',
                fontFamily: "'DM Sans', sans-serif",
                whiteSpace: 'nowrap',
                textShadow: '0 1px 4px rgba(255,255,255,0.9)',
              }}>
                {item.label}
              </span>
            </div>
          ))}

          {/* The center text button */}
          <NavBtn
            text="Lending & Borrowing"
            active={isLendingActive}
            isOpen={lbOpen}
            onTap={() => setLbOpen(v => !v)}
          />
        </div>

        {/* Friends */}
        <NavBtn
          active={isActivePage('Friends')}
          onTap={() => navigate(createPageUrl('Friends'))}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          }
        />

        {/* Records */}
        <NavBtn
          active={isActivePage('RecentActivity') || isActivePage('LoanAgreements') || isActivePage('YourLoans')}
          onTap={() => navigate(createPageUrl('RecentActivity'))}
          icon={<IcoRecords />}
        />
      </div>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}

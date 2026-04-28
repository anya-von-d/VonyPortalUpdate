import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const isActive = (location, to) => {
  if (to === '/') return location.pathname === '/';
  const segment = to.split('?')[0].replace(/^\//, '');
  return location.pathname.includes(segment);
};

const isLendingActive = (location) => {
  return ['LendingBorrowing', 'Lending', 'Borrowing'].some(p => {
    const url = createPageUrl(p);
    return location.pathname.includes(url.replace(/^\//, ''));
  });
};

function SideNavItem({ to, icon, label, active, onClick }) {
  const inner = (
    <>
      {/* Icon pill */}
      <div style={{
        width: 52, height: 34, borderRadius: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'rgba(0,0,0,0.08)' : 'transparent',
        color: active ? '#1A1918' : 'rgba(0,0,0,0.45)',
        transition: 'background 0.15s, color 0.15s',
      }}>
        {icon}
      </div>
      {/* Label */}
      <span style={{
        fontSize: 10, fontWeight: active ? 600 : 400,
        color: active ? '#1A1918' : 'rgba(0,0,0,0.45)',
        letterSpacing: '-0.01em', lineHeight: 1,
        fontFamily: "'DM Sans', sans-serif",
        transition: 'color 0.15s',
      }}>
        {label}
      </span>
    </>
  );

  const sharedStyle = {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 4, padding: '4px 6px', textDecoration: 'none',
    background: 'none', border: 'none', cursor: 'pointer',
    width: '100%',
  };

  if (onClick) {
    return <button type="button" onClick={onClick} style={sharedStyle}>{inner}</button>;
  }
  return <Link to={to} style={sharedStyle}>{inner}</Link>;
}

export default function DesktopSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    {
      to: '/',
      label: 'Home',
      active: isActive(location, '/'),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
    },
    {
      to: createPageUrl('Upcoming'),
      label: 'Upcoming',
      active: isActive(location, createPageUrl('Upcoming')),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
          <text x="12" y="19.5" textAnchor="middle" fontSize="8" fontWeight="bold" fill="currentColor" stroke="none" fontFamily="system-ui, sans-serif">{new Date().getDate()}</text>
        </svg>
      ),
    },
    {
      to: createPageUrl('LendingBorrowing'),
      label: 'Lending',
      active: isLendingActive(location),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 16V4m0 0L3 8m4-4l4 4"/>
          <path d="M17 8v12m0 0l4-4m-4 4l-4-4"/>
        </svg>
      ),
    },
    {
      to: createPageUrl('CreateOffer'),
      label: 'Create',
      active: isActive(location, createPageUrl('CreateOffer')),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/>
          <line x1="9" y1="15" x2="15" y2="15"/>
        </svg>
      ),
    },
    {
      to: createPageUrl('RecordPayment'),
      label: 'Log',
      active: isActive(location, createPageUrl('RecordPayment')),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="16 12 12 8 8 12"/>
          <line x1="12" y1="16" x2="12" y2="8"/>
        </svg>
      ),
    },
    {
      to: createPageUrl('LoanAgreements'),
      label: 'Records',
      active: isActive(location, createPageUrl('LoanAgreements')),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="desktop-sidebar" style={{
      position: 'fixed', top: 0, left: 0, bottom: 0, width: 80,
      zIndex: 150,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      paddingTop: 100, paddingBottom: 24, gap: 2,
      background: 'rgba(255,255,255,0.82)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRight: '1px solid rgba(0,0,0,0.07)',
    }}>
      {/* Logo */}
      <Link to="/" style={{
        position: 'absolute', top: 40,
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontStyle: 'italic', fontWeight: 600, fontSize: '1.3rem',
        color: '#1A1918', textDecoration: 'none', lineHeight: 1,
        letterSpacing: '-0.02em',
      }}>V</Link>

      {/* Nav items */}
      {navItems.map((item) => (
        <SideNavItem
          key={item.to}
          to={item.to}
          label={item.label}
          active={item.active}
          icon={item.icon}
        />
      ))}
    </div>
  );
}

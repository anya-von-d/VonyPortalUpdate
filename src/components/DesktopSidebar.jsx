import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import SidebarBottomSection from './SidebarBottomSection';

const NAV_ICONS = {
  'Home': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  'Upcoming': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  'Create Loan': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  'Log Payment': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  'Lending': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  'Borrowing': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
  'Friends': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  'Recent Activity': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  'Records': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  'Learn': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
};

const MAIN_ITEMS = [
  { label: 'Home', to: '/' },
  { label: 'Upcoming', to: createPageUrl('Upcoming') },
  { label: 'Create Loan', to: createPageUrl('CreateOffer') },
  { label: 'Log Payment', to: createPageUrl('RecordPayment') },
  { label: 'Lending', to: createPageUrl('Lending') },
  { label: 'Borrowing', to: createPageUrl('Borrowing') },
  { label: 'Friends', to: createPageUrl('Friends') },
];

const DOC_ITEMS = [
  { label: 'Records', to: createPageUrl('LoanAgreements') },
  { label: 'Recent Activity', to: createPageUrl('RecentActivity') },
  { label: 'Learn', to: createPageUrl('ComingSoon') },
];

export default function DesktopSidebar() {
  const currentPath = window.location.pathname;

  const renderItem = ({ label, to }) => {
    const isActive = to === '/' ? currentPath === '/' : currentPath.includes(to.split('?')[0].replace('/app/', ''));
    return (
      <Link key={label} to={to} style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', borderRadius: 9, textDecoration: 'none',
        fontSize: 13, fontWeight: isActive ? 700 : 500,
        color: isActive ? '#03ACEA' : '#787776',
        background: isActive ? '#D9EAF4' : 'transparent',
        fontFamily: "'DM Sans', sans-serif", width: '100%', boxSizing: 'border-box',
      }}>
        <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: isActive ? '#03ACEA' : '#9B9A98' }}>{NAV_ICONS[label]}</span>
        {label}
      </Link>
    );
  };

  return (
    <div className="mesh-left" style={{ background: 'transparent', borderRight: '1px solid rgba(0,0,0,0.06)', fontFamily: "'DM Sans', system-ui, sans-serif", color: '#1A1918', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>
      <div style={{ position: 'sticky', top: 0, height: '100vh', padding: '14px 8px 16px', display: 'flex', flexDirection: 'column' }}>
        <Link to="/" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontStyle: 'italic', fontSize: '1.6rem', color: '#1A1918', textDecoration: 'none', display: 'block', marginBottom: 16, lineHeight: 1, letterSpacing: '-0.02em', paddingLeft: 6 }}>Vony</Link>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ paddingLeft: 12, marginBottom: 4 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#787776', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>Main</span>
          </div>
          {MAIN_ITEMS.map(renderItem)}
        </nav>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ paddingLeft: 12, marginBottom: 4 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#787776', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>Document Center</span>
            </div>
            {DOC_ITEMS.map(renderItem)}
          </nav>
        </div>
        <SidebarBottomSection />
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import DesktopTopNav from './DesktopTopNav';
import {
  Home, Calendar, ArrowUpRight, ArrowDownLeft, Users,
  FileText, Activity, Plus, CreditCard,
} from 'lucide-react';

const SIDEBAR_W = 220;

const navItems = [
  { label: 'Home',            icon: Home,          to: '/' },
  { label: 'Upcoming',        icon: Calendar,      to: createPageUrl('Upcoming') },
  { label: 'Create a Loan',   icon: Plus,          to: createPageUrl('CreateOffer') },
  { label: 'Log Payment',     icon: CreditCard,    to: createPageUrl('RecordPayment') },
  { label: 'Lending',         icon: ArrowUpRight,  to: createPageUrl('Lending') },
  { label: 'Borrowing',       icon: ArrowDownLeft, to: createPageUrl('Borrowing') },
  { label: 'Friends',         icon: Users,         to: createPageUrl('Friends') },
  { label: 'Records',         icon: FileText,      to: createPageUrl('YourLoans') },
  { label: 'Recent Activity', icon: Activity,      to: createPageUrl('RecentActivity') },
];

const isItemActive = (location, item) => {
  if (item.to === '/') return location.pathname === '/';
  const segment = item.to.split('?')[0].replace(/^\//, '');
  return location.pathname.toLowerCase().includes(segment.toLowerCase());
};

function SidebarItem({ item, active }) {
  const [hovered, setHovered] = useState(false);
  const { icon: Icon, label, to } = item;

  return (
    <Link
      to={to}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 12px', borderRadius: 9,
        background: active
          ? 'rgba(26,95,191,0.09)'
          : hovered ? 'rgba(0,0,0,0.05)' : 'transparent',
        color: active ? '#1A5FBF' : '#1A1918',
        textDecoration: 'none',
        fontSize: 13.5,
        fontWeight: active ? 600 : 450,
        fontFamily: "'DM Sans', sans-serif",
        transition: 'background 0.12s, color 0.12s',
        whiteSpace: 'nowrap',
        letterSpacing: '-0.1px',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Icon
        size={15}
        strokeWidth={active ? 2.3 : 1.9}
        style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }}
      />
      {label}
    </Link>
  );
}

export default function DesktopSidebar() {
  const location = useLocation();

  return (
    <>
      {/* Floating search + profile + notifications bar */}
      <DesktopTopNav />

      {/* Sticky left sidebar — desktop only */}
      <div
        className="desktop-sidebar-panel"
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          width: SIDEBAR_W,
          background: '#FCFCFC',
          borderRight: '1px solid rgba(0,0,0,0.07)',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 10px 32px',
          zIndex: 200,
          overflowY: 'auto',
          overflowX: 'hidden',
          flexShrink: 0,
        }}
      >
        {/* Logo + wordmark */}
        <Link
          to="/"
          style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '6px 12px 0',
            marginBottom: 24,
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          <img
            src="/logos/blackLogo.png"
            alt="Vony"
            style={{ width: 22, height: 22, objectFit: 'contain', flexShrink: 0 }}
          />
          <span style={{
            fontSize: 16, fontWeight: 700, color: '#1A1918',
            fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.4px',
          }}>
            Vony
          </span>
        </Link>

        {/* Nav items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {navItems.map(item => (
            <SidebarItem
              key={item.label}
              item={item}
              active={isItemActive(location, item)}
            />
          ))}
        </nav>
      </div>
    </>
  );
}

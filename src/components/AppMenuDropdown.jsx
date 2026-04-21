import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';

/* ── Icons ── */
const LearnIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>;
const InviteIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>;
const ContactIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
const HelpIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const SettingsIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const LogoutIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;

const itemStyle = (hovered, danger) => ({
  display: 'flex', alignItems: 'center',
  gap: 10, padding: '9px 14px', width: '100%',
  background: hovered ? (danger ? 'rgba(232,114,110,0.07)' : 'rgba(0,0,0,0.04)') : 'transparent',
  border: 'none', cursor: 'pointer',
  fontSize: 13, fontWeight: 500,
  color: danger ? '#E8726E' : '#1A1918',
  fontFamily: "'DM Sans', sans-serif",
  textAlign: 'left', textDecoration: 'none',
  transition: 'background 0.12s',
  borderRadius: 8,
});

function Item({ label, icon, onClick, to, danger }) {
  const [hovered, setHovered] = useState(false);
  const common = {
    style: itemStyle(hovered, danger),
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  };
  const content = (
    <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      {icon && <span style={{ opacity: 0.5, flexShrink: 0 }}>{icon}</span>}
      {label}
    </span>
  );
  if (to) return <Link to={to} onClick={onClick} {...common}>{content}</Link>;
  return <button type="button" onClick={onClick} {...common}>{content}</button>;
}

/**
 * Shared hamburger dropdown used by both desktop top nav and mobile nav.
 * Props:
 *   style            — extra styles for the dropdown panel (position, etc.)
 *   onClose          — called after any item is clicked
 *   onInviteFriend   — open FriendsPopup on Invite tab
 *   onOpenSettings   — open SettingsModal
 */
export default function AppMenuDropdown({ style, onClose, onInviteFriend, onOpenSettings }) {
  const { logout } = useAuth();

  const close = () => { if (onClose) onClose(); };

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: 14,
      border: '1px solid rgba(0,0,0,0.08)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
      minWidth: 210, padding: 6,
      fontFamily: "'DM Sans', sans-serif",
      ...style,
    }}>
      <Item label="Learn"           to={createPageUrl('LoanHelp')} onClick={close} icon={<LearnIcon />} />
      <Item label="Invite a Friend" onClick={() => { close(); onInviteFriend && onInviteFriend(); }} icon={<InviteIcon />} />
      <Item label="Contact Us"      onClick={() => { close(); window.open('mailto:hello@vony-lending.com', '_blank'); }} icon={<ContactIcon />} />
      <Item label="Help & Support"  to={createPageUrl('LoanHelp')} onClick={close} icon={<HelpIcon />} />

      <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', margin: '6px 8px' }} />

      <Item label="Settings" onClick={() => { close(); onOpenSettings && onOpenSettings(); }} icon={<SettingsIcon />} />
      <Item label="Log out"  onClick={async () => { close(); await logout?.(); }} danger icon={<LogoutIcon />} />
    </div>
  );
}

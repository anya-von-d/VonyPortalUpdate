import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/lib/AuthContext';
import { X, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import UserAvatar from './ui/UserAvatar';

const PORTAL_URL = 'https://www.vony-lending.com';
const INVITE_MSG = `I think you'll get a lot of value from Vony and wanted to invite you to sign up. Here's the link to get started 🙂 ${PORTAL_URL}`;
const EMAIL_SUBJECT = 'Join me on Vony';
const EMAIL_BODY = `Hi,\n\nI think you'll get a lot of value from Vony — it's a great way to manage and track loans with friends.\n\nHere's the link to get started: ${PORTAL_URL}\n\nSee you there!`;

/* ── Icons ────────────────────────────────────────────────── */
const S = { width: '100%', height: '100%' }; // SVGs fill their container
const Icons = {
  general: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={S}>
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  notifications: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={S}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  invite: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={S}>
      <polyline points="20 12 20 22 4 22 4 12"/>
      <rect x="2" y="7" width="20" height="5"/>
      <line x1="12" y1="22" x2="12" y2="7"/>
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
    </svg>
  ),
  about: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={S}>
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  guide: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={S}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  ),
  contact: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={S}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  help: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={S}>
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  legal: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={S}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  file: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={S}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={S}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  userOff: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={S}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <line x1="17" y1="8" x2="23" y2="14"/>
      <line x1="23" y1="8" x2="17" y2="14"/>
    </svg>
  ),
};

/* ── Nav config ───────────────────────────────────────────── */
const NAV_GROUPS = [
  [
    { id: 'general',       label: 'General',         icon: Icons.general },
    { id: 'notifications', label: 'Notifications',   icon: Icons.notifications },
    { id: 'invite',        label: 'Invite a Friend', icon: Icons.invite },
  ],
  [
    { id: 'helpsupport',   label: 'Help & Support',  icon: Icons.help },
    { id: 'contactus',     label: 'Contact Us',      icon: Icons.contact },
    { id: 'guide',         label: 'Guide',           icon: Icons.guide },
  ],
  [
    { id: 'about',         label: 'About',           icon: Icons.about },
    { id: 'legal',         label: 'Legal',           icon: Icons.legal },
  ],
];
// Flat list for lookups
const NAV_ITEMS = NAV_GROUPS.flat();

/* ── Shared helpers ───────────────────────────────────────── */
function Row({ label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function Field({ value }) {
  return (
    <div style={{ padding: '9px 12px', borderRadius: 9, border: '1px solid rgba(0,0,0,0.08)', background: '#fafafa', fontSize: 13, color: '#1A1918', fontFamily: "'DM Sans', sans-serif" }}>
      {value || '—'}
    </div>
  );
}

function Toggle({ checked, onChange, label, sublabel }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1918' }}>{label}</div>
        {sublabel && <div style={{ fontSize: 11, color: '#9B9A98', marginTop: 2 }}>{sublabel}</div>}
      </div>
      <div
        onClick={() => onChange(!checked)}
        style={{ width: 38, height: 22, borderRadius: 11, position: 'relative', cursor: 'pointer', flexShrink: 0, background: checked ? '#03ACEA' : 'rgba(0,0,0,0.12)', transition: 'background 0.2s' }}
      >
        <div style={{ position: 'absolute', top: 3, left: checked ? 19 : 3, width: 16, height: 16, borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
      </div>
    </div>
  );
}

/* ── Tabs ─────────────────────────────────────────────────── */
function GeneralTab({ user }) {
  const nameParts = (user?.full_name || '').trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 9,
    border: '1px solid rgba(0,0,0,0.08)', background: '#fafafa',
    fontSize: 13, color: '#1A1918', fontFamily: "'DM Sans', sans-serif",
    outline: 'none', boxSizing: 'border-box',
  };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>First Name</div>
          <input type="text" defaultValue={firstName} readOnly style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Last Name</div>
          <input type="text" defaultValue={lastName} readOnly style={inputStyle} />
        </div>
      </div>
      <Row label="Email"><Field value={user?.email} /></Row>
      <div style={{ marginTop: 4 }}>
        <Link to={createPageUrl('Profile')} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9,
          background: '#1A1918', color: 'white', fontSize: 12, fontWeight: 600, textDecoration: 'none',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          Edit Profile →
        </Link>
      </div>
    </>
  );
}

function NotificationsTab() {
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [paymentReminders, setPaymentReminders] = useState(true);
  const [loanUpdates, setLoanUpdates] = useState(true);
  return (
    <>
      <Toggle checked={emailNotifs} onChange={setEmailNotifs} label="Email Notifications" sublabel="Receive updates via email" />
      <Toggle checked={paymentReminders} onChange={setPaymentReminders} label="Payment Reminders" sublabel="Get reminded before payments are due" />
      <Toggle checked={loanUpdates} onChange={setLoanUpdates} label="Loan Activity" sublabel="Be notified when loans are updated" />
      <p style={{ marginTop: 16, fontSize: 11, color: '#C5C3C0' }}>Notification preferences sync across your account.</p>
    </>
  );
}

function InviteTab() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(PORTAL_URL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const options = [
    {
      id: 'email',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      ),
      label: 'Email',
      sublabel: 'Send an invite via email',
      action: () => { window.location.href = `mailto:?subject=${encodeURIComponent(EMAIL_SUBJECT)}&body=${encodeURIComponent(EMAIL_BODY)}`; },
    },
    {
      id: 'message',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      ),
      label: 'Message',
      sublabel: 'Send an invite via iMessage or SMS',
      action: () => { window.location.href = `sms:?body=${encodeURIComponent(INVITE_MSG)}`; },
    },
    {
      id: 'copy',
      icon: copied
        ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
      label: copied ? 'Copied!' : 'Copy Link',
      sublabel: PORTAL_URL,
      action: handleCopy,
    },
  ];

  return (
    <>
      <p style={{ fontSize: 13, color: '#787776', marginBottom: 18, lineHeight: 1.5 }}>
        Invite your friends to Vony and start lending or borrowing together.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {options.map(({ id, icon, label, sublabel, action }) => (
          <button
            key={id}
            onClick={action}
            style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px',
              borderRadius: 11, border: '1px solid rgba(0,0,0,0.08)',
              background: id === 'copy' && copied ? 'rgba(22,163,74,0.05)' : 'white',
              cursor: 'pointer', textAlign: 'left', width: '100%',
              fontFamily: "'DM Sans', sans-serif", transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!(id === 'copy' && copied)) e.currentTarget.style.background = '#fafafa'; }}
            onMouseLeave={e => { e.currentTarget.style.background = id === 'copy' && copied ? 'rgba(22,163,74,0.05)' : 'white'; }}
          >
            <span style={{ color: id === 'copy' && copied ? '#16A34A' : '#787776', flexShrink: 0 }}>{icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: id === 'copy' && copied ? '#16A34A' : '#1A1918', marginBottom: 1 }}>{label}</div>
              <div style={{ fontSize: 11, color: '#9B9A98' }}>{sublabel}</div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

/* ── Clickable link card — same style as InviteTab options ── */
function LinkCard({ icon, title, sublabel, href }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px',
        borderRadius: 11, border: '1px solid rgba(0,0,0,0.08)',
        background: 'white', textDecoration: 'none', marginBottom: 8,
        fontFamily: "'DM Sans', sans-serif", transition: 'background 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
      onMouseLeave={e => e.currentTarget.style.background = 'white'}
    >
      <span style={{ width: 18, height: 18, flexShrink: 0, color: '#787776', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1918', marginBottom: 1 }}>{title}</div>
        <div style={{ fontSize: 11, color: '#9B9A98' }}>{sublabel}</div>
      </div>
    </a>
  );
}

function HelpSupportTab() {
  return <LinkCard icon={Icons.help} title="Help & Support" sublabel="Find answers to common questions and get help." href="https://www.vony-lending.com/help" />;
}

function ContactUsTab() {
  return <LinkCard icon={Icons.contact} title="Contact Us" sublabel="Send us a message and we'll get back to you." href="https://www.vony-lending.com/contact" />;
}

function GuideTab() {
  return <LinkCard icon={Icons.guide} title="Vony Guide" sublabel="Your introduction to Vony. Learn how it all works." href="https://www.vony-lending.com/guide" />;
}

function AboutTab() {
  return (
    <>
      <Row label="App">
        <div style={{ fontSize: 13, color: '#787776' }}>Vony · Version 1.0</div>
      </Row>
      <Row label="Danger Zone">
        <button
          style={{ padding: '8px 14px', borderRadius: 9, border: '1px solid rgba(232,114,110,0.3)', background: 'rgba(232,114,110,0.06)', color: '#E8726E', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
          onClick={() => window.confirm('Are you sure you want to delete your account? This cannot be undone.')}
        >
          Delete Account
        </button>
      </Row>
    </>
  );
}

function LegalTab() {
  return (
    <>
      <LinkCard icon={Icons.lock}    title="Privacy Policy"    sublabel="How we collect and use your data."       href="https://www.vony-lending.com/privacy" />
      <LinkCard icon={Icons.file}    title="Terms of Service"  sublabel="The rules and terms for using Vony."     href="https://www.vony-lending.com/terms" />
      <LinkCard icon={Icons.userOff} title="Do Not Sell or Share My Personal Information" sublabel="Manage your data sharing preferences." href="https://www.vony-lending.com/do-not-sell" />
    </>
  );
}

/* ── Modal ────────────────────────────────────────────────── */
export default function SettingsModal({ isOpen, onClose, initialTab = 'general' }) {
  const { user: authUser, userProfile, logout } = useAuth();
  const user = userProfile
    ? { ...userProfile, id: authUser?.id, email: authUser?.email }
    : authUser;
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync activeTab if initialTab changes (e.g. opened from different entry points)
  useEffect(() => { if (isOpen) setActiveTab(initialTab); }, [isOpen, initialTab]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 560);
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 560);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  const firstName = (user?.full_name || user?.username || '').trim().split(/\s+/)[0] || '';
  const activeLabel = NAV_ITEMS.find(t => t.type === 'tab' && t.id === activeTab)?.label || '';

  // Mobile: no icons, flush left, minimum width to fit "Invite a Friend" at 13px
  const sidebarWidth = isMobile ? 132 : 180;
  const sidebarPadH = isMobile ? 0 : 10;
  const sidebarPadV = isMobile ? 14 : 18;

  const navItemStyle = (id) => ({
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 10px',
    borderRadius: 8, border: 'none', cursor: 'pointer',
    background: activeTab === id ? 'rgba(0,0,0,0.07)' : 'transparent',
    fontSize: 13, fontWeight: activeTab === id ? 600 : 500,
    color: activeTab === id ? '#1A1918' : '#787776',
    textAlign: 'left', width: '100%',
    fontFamily: "'DM Sans', sans-serif",
    marginBottom: 1, textDecoration: 'none',
    whiteSpace: 'nowrap',
  });


  return createPortal(
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.12)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div style={{ background: 'white', borderRadius: 16, width: 580, maxWidth: '92vw', height: 420, display: 'flex', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.16), 0 4px 16px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.07)', fontFamily: "'DM Sans', sans-serif" }}>

        {/* ── Left nav ── */}
        <div style={{ width: sidebarWidth, flexShrink: 0, background: '#F7F6F3', borderRight: '1px solid rgba(0,0,0,0.06)', padding: `${sidebarPadV}px 10px ${sidebarPadV - 2}px`, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

          {/* User header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 2px 14px', borderBottom: '1px solid rgba(0,0,0,0.07)', marginBottom: 10, minWidth: 0 }}>
            <UserAvatar name={user?.full_name || user?.username} src={user?.profile_picture_url} size={30} />
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
              {firstName}
            </div>
          </div>

          {/* Nav items — grouped with small gaps */}
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} style={{ marginBottom: gi < NAV_GROUPS.length - 1 ? 10 : 0 }}>
              {group.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  style={navItemStyle(item.id)}
                  onMouseEnter={e => { if (activeTab !== item.id) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = activeTab === item.id ? 'rgba(0,0,0,0.07)' : 'transparent'; }}
                >
                  {!isMobile && (
                    <span style={{ width: 22, height: 22, borderRadius: 6, background: activeTab === item.id ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.05)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ width: 13, height: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</span>
                    </span>
                  )}
                  {item.label}
                </button>
              ))}
            </div>
          ))}

          {/* Log Out */}
          <div style={{ marginTop: 'auto', paddingTop: 10 }}>
            <button
              onClick={() => { onClose(); logout?.(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 10px',
                borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent',
                fontSize: 13, fontWeight: 500, color: '#E8726E',
                textAlign: 'left', width: '100%', fontFamily: "'DM Sans', sans-serif",
                transition: 'background 0.15s', whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,114,110,0.07)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {!isMobile && (
                <span style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(232,114,110,0.08)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <LogOut size={13} strokeWidth={2} style={{ color: '#E8726E' }} />
                </span>
              )}
              Log Out
            </button>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Panel header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1918' }}>{activeLabel}</span>
            <button
              onClick={onClose}
              style={{ width: 27, height: 27, borderRadius: 8, background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.09)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
            >
              <X size={13} strokeWidth={2.5} style={{ color: '#787776' }} />
            </button>
          </div>

          {/* Panel body */}
          <div style={{ flex: 1, padding: '18px 20px', overflowY: 'auto' }}>
            {activeTab === 'general'       && <GeneralTab user={user} />}
            {activeTab === 'notifications' && <NotificationsTab />}
            {activeTab === 'invite'        && <InviteTab />}
            {activeTab === 'helpsupport'   && <HelpSupportTab />}
            {activeTab === 'contactus'     && <ContactUsTab />}
            {activeTab === 'guide'         && <GuideTab />}
            {activeTab === 'about'         && <AboutTab />}
            {activeTab === 'legal'         && <LegalTab />}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

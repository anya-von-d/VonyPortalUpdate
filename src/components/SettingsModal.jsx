import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/lib/AuthContext';
import { X, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import UserAvatar from './ui/UserAvatar';

const TABS = [
  { id: 'general',       label: 'General' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'invite',        label: 'Invite a Friend' },
  { id: 'about',         label: 'About' },
];

const PORTAL_URL = 'https://www.vony-lending.com';
const INVITE_MSG = `I think you'll get a lot of value from Vony and wanted to invite you to sign up. Here's the link to get started 🙂 ${PORTAL_URL}`;
const EMAIL_SUBJECT = 'Join me on Vony';
const EMAIL_BODY = `Hi,\n\nI think you'll get a lot of value from Vony — it's a great way to manage and track loans with friends.\n\nHere's the link to get started: ${PORTAL_URL}\n\nSee you there!`;

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
  return (
    <>
      <Row label="Full Name">
        <input
          type="text"
          defaultValue={user?.full_name || ''}
          readOnly
          style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid rgba(0,0,0,0.08)', background: '#fafafa', fontSize: 13, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' }}
        />
      </Row>
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
      action: () => {
        window.location.href = `mailto:?subject=${encodeURIComponent(EMAIL_SUBJECT)}&body=${encodeURIComponent(EMAIL_BODY)}`;
      },
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
      action: () => {
        window.location.href = `sms:?body=${encodeURIComponent(INVITE_MSG)}`;
      },
    },
    {
      id: 'copy',
      icon: copied
        ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        )
        : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        ),
      label: copied ? 'Copied!' : 'Copy Link',
      sublabel: `${PORTAL_URL}`,
      action: handleCopy,
    },
  ];

  return (
    <>
      <p style={{ fontSize: 13, color: '#787776', marginBottom: 18, lineHeight: 1.5 }}>
        Invite your friends to Vony — track loans and payments together.
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

function AboutTab() {
  const links = [
    { label: 'Guide',          href: 'https://www.vony-lending.com/guide' },
    { label: 'Contact Us',     href: 'https://www.vony-lending.com/contact' },
    { label: 'Help & Support', href: 'https://www.vony-lending.com/help' },
  ];
  const legal = [
    { label: 'Privacy Policy',   href: 'https://www.vony-lending.com/privacy' },
    { label: 'Terms of Service', href: 'https://www.vony-lending.com/terms' },
  ];
  const LinkItem = ({ label, href }) => (
    <a key={label} href={href} target="_blank" rel="noopener noreferrer"
      style={{ fontSize: 13, color: '#03ACEA', textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}
      onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
      onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
    >{label} ↗</a>
  );
  return (
    <>
      <Row label="App">
        <div style={{ fontSize: 13, color: '#787776' }}>Vony · Version 1.0</div>
      </Row>
      <Row label="About">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {links.map(l => <LinkItem key={l.label} {...l} />)}
        </div>
      </Row>
      <Row label="Legal">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {legal.map(l => <LinkItem key={l.label} {...l} />)}
        </div>
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

/* ── Modal ────────────────────────────────────────────────── */
export default function SettingsModal({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.12)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div style={{ background: 'white', borderRadius: 16, width: 580, maxWidth: '92vw', height: 420, display: 'flex', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.16), 0 4px 16px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.07)', fontFamily: "'DM Sans', sans-serif" }}>

        {/* ── Left nav ── */}
        <div style={{ width: 180, background: '#F7F6F3', borderRight: '1px solid rgba(0,0,0,0.06)', padding: '18px 10px 16px', display: 'flex', flexDirection: 'column' }}>
          {/* User header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 6px 14px', borderBottom: '1px solid rgba(0,0,0,0.07)', marginBottom: 10 }}>
            <UserAvatar name={user?.full_name || user?.username} src={user?.avatar_url || user?.profile_picture_url} size={30} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.full_name || user?.username}</div>
              <div style={{ fontSize: 10, color: '#9B9A98', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
            </div>
          </div>

          {/* Tab buttons */}
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              display: 'flex', alignItems: 'center', padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: activeTab === tab.id ? 'rgba(0,0,0,0.07)' : 'transparent',
              fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 500,
              color: activeTab === tab.id ? '#1A1918' : '#787776',
              textAlign: 'left', width: '100%', fontFamily: "'DM Sans', sans-serif", marginBottom: 2,
            }}>
              {tab.label}
            </button>
          ))}

          {/* Log Out at bottom */}
          <div style={{ marginTop: 'auto', paddingTop: 12 }}>
            <button
              onClick={() => { onClose(); logout?.(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px',
                borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent',
                fontSize: 13, fontWeight: 500, color: '#E8726E',
                textAlign: 'left', width: '100%', fontFamily: "'DM Sans', sans-serif",
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,114,110,0.07)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <LogOut size={13} strokeWidth={2} />
              Log Out
            </button>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Panel header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1918' }}>{TABS.find(t => t.id === activeTab)?.label}</span>
            <button onClick={onClose} style={{ width: 27, height: 27, borderRadius: 8, background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
            {activeTab === 'about'         && <AboutTab />}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

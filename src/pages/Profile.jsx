import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { User, PublicProfile, Friendship, Loan, Payment } from "@/entities/all";
import { UploadFile } from "@/integrations/Core";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import MeshMobileNav from "@/components/MeshMobileNav";
import DemoModeToggle from "@/components/DemoModeToggle";
import UserAvatar from "@/components/ui/UserAvatar";
import DesktopSidebar from '../components/DesktopSidebar';
import { Camera, Image as ImageIcon, Trash2, LogOut, Smile, X } from "lucide-react";
import { PROFILE_ICON_IMAGES } from "@/lib/profileIconImages";

const AVATAR_PICKER_COLORS = [
  '#F794E9', '#A5ED9A', '#87C6ED', '#F9E784', '#FF8FAD',
  '#B5DEFF', '#FFB3C6', '#C8F5E0', '#B8B8FF', '#FFD6A5',
  '#A8DADC', '#FFD3B6', '#D4A5F5', '#CAFFBF', '#FDFFB6',
  '#F0B8D9', '#C9F0D3', '#FFDAB9',
];
import { motion } from "framer-motion";

/* ── Public profile sync ─────────────────────────────────── */
const syncPublicProfile = async (userData) => {
  if (!userData || !userData.id || !userData.username || !userData.full_name) return;
  try {
    const existingProfiles = await PublicProfile.filter({ user_id: { eq: userData.id } });
    const defaultAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent((userData.full_name || 'User').charAt(0))}&background=678AFB&color=fff&size=128`;
    const publicProfileData = {
      user_id: userData.id, username: userData.username, full_name: userData.full_name,
      profile_picture_url: userData.profile_picture_url || defaultAvatarUrl
    };
    if (existingProfiles && existingProfiles.length > 0) {
      const existing = existingProfiles[0];
      if (existing.username !== publicProfileData.username || existing.full_name !== publicProfileData.full_name || existing.profile_picture_url !== publicProfileData.profile_picture_url) {
        await PublicProfile.update(existing.id, publicProfileData);
      }
    } else {
      await PublicProfile.create(publicProfileData);
    }
  } catch (err) {
    console.error("Failed to sync public profile:", err);
  }
};

/* ── Timezone helpers ────────────────────────────────────── */
function detectTimezone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; }
}
function getTimezoneList() {
  try {
    if (typeof Intl.supportedValuesOf === 'function') {
      const list = Intl.supportedValuesOf('timeZone');
      if (Array.isArray(list) && list.length) return list;
    }
  } catch {}
  return [
    'UTC','Africa/Cairo','Africa/Johannesburg','Africa/Lagos','Africa/Nairobi',
    'America/Anchorage','America/Bogota','America/Buenos_Aires','America/Chicago',
    'America/Denver','America/Halifax','America/Lima','America/Los_Angeles',
    'America/Mexico_City','America/New_York','America/Phoenix','America/Sao_Paulo',
    'America/Toronto','America/Vancouver','Asia/Bangkok','Asia/Dubai','Asia/Hong_Kong',
    'Asia/Jakarta','Asia/Jerusalem','Asia/Karachi','Asia/Kolkata','Asia/Kuala_Lumpur',
    'Asia/Manila','Asia/Seoul','Asia/Shanghai','Asia/Singapore','Asia/Taipei',
    'Asia/Tehran','Asia/Tokyo','Atlantic/Reykjavik','Australia/Adelaide','Australia/Brisbane',
    'Australia/Melbourne','Australia/Perth','Australia/Sydney','Europe/Amsterdam',
    'Europe/Athens','Europe/Berlin','Europe/Brussels','Europe/Bucharest','Europe/Dublin',
    'Europe/Helsinki','Europe/Istanbul','Europe/Lisbon','Europe/London','Europe/Madrid',
    'Europe/Moscow','Europe/Oslo','Europe/Paris','Europe/Prague','Europe/Rome',
    'Europe/Stockholm','Europe/Vienna','Europe/Warsaw','Europe/Zurich',
    'Pacific/Auckland','Pacific/Fiji','Pacific/Honolulu',
  ];
}

/* ── Currencies ──────────────────────────────────────────── */
const CURRENCIES = [
  { code: 'USD', symbol: '$',   name: 'US Dollar',          flag: '🇺🇸' },
  { code: 'EUR', symbol: '€',   name: 'Euro',               flag: '🇪🇺' },
  { code: 'GBP', symbol: '£',   name: 'British Pound',      flag: '🇬🇧' },
  { code: 'AUD', symbol: 'A$',  name: 'Australian Dollar',  flag: '🇦🇺' },
  { code: 'CAD', symbol: 'C$',  name: 'Canadian Dollar',    flag: '🇨🇦' },
  { code: 'CHF', symbol: 'Fr',  name: 'Swiss Franc',        flag: '🇨🇭' },
  { code: 'JPY', symbol: '¥',   name: 'Japanese Yen',       flag: '🇯🇵' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', flag: '🇳🇿' },
  { code: 'SEK', symbol: 'kr',  name: 'Swedish Krona',      flag: '🇸🇪' },
  { code: 'NOK', symbol: 'kr',  name: 'Norwegian Krone',    flag: '🇳🇴' },
  { code: 'ZAR', symbol: 'R',   name: 'South African Rand', flag: '🇿🇦' },
  { code: 'INR', symbol: '₹',   name: 'Indian Rupee',       flag: '🇮🇳' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso',       flag: '🇲🇽' },
  { code: 'BRL', symbol: 'R$',  name: 'Brazilian Real',     flag: '🇧🇷' },
  { code: 'SGD', symbol: 'S$',  name: 'Singapore Dollar',   flag: '🇸🇬' },
];

/* ── Shared UI primitives ────────────────────────────────── */
const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C4C3C1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const BackButton = ({ onClick }) => (
  <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 24px', color: '#1A1918', fontFamily: "'DM Sans', sans-serif", fontSize: 20, lineHeight: 1 }}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  </button>
);

const SectionTitle = ({ children, first }) => (
  <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1A1918', margin: first ? '0 0 4px' : '28px 0 4px', fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.02em' }}>
    {children}
  </h2>
);

const ListRow = ({ icon, label, sub, onClick, href, right }) => {
  const inner = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid rgba(0,0,0,0.06)', cursor: (onClick || href) ? 'pointer' : 'default' }}>
      <div style={{ color: '#1A1918', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.01em' }}>{label}</div>
        {sub && <div style={{ fontSize: 13, color: '#787776', fontFamily: "'DM Sans', sans-serif", marginTop: 1 }}>{sub}</div>}
      </div>
      {right !== undefined ? right : ((onClick || href) ? <ChevronRight /> : null)}
    </div>
  );
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block' }}>{inner}</a>;
  if (onClick) return <div onClick={onClick}>{inner}</div>;
  return inner;
};

const Toggle = ({ checked, onChange, label, sublabel }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
    <div>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1918', fontFamily: "'DM Sans', sans-serif" }}>{label}</div>
      {sublabel && <div style={{ fontSize: 13, color: '#787776', fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>{sublabel}</div>}
    </div>
    <div
      onClick={() => onChange(!checked)}
      style={{ width: 44, height: 26, borderRadius: 13, position: 'relative', cursor: 'pointer', flexShrink: 0, marginLeft: 16, background: checked ? '#03ACEA' : 'rgba(0,0,0,0.14)', transition: 'background 0.2s' }}
    >
      <div style={{ position: 'absolute', top: 3, left: checked ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.25)', transition: 'left 0.2s' }} />
    </div>
  </div>
);

const SubPageShell = ({ title, subtitle, onBack, children, maxWidth = 600 }) => (
  <div className="mesh-center" style={{ background: 'transparent', borderRight: '1px solid rgba(0,0,0,0.06)', padding: '24px 32px 80px', maxWidth }}>
    <BackButton onClick={onBack} />
    <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1A1918', margin: '0 0 4px', fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.03em' }}>
      {title}
    </h1>
    {subtitle && <p style={{ fontSize: 14, color: '#787776', margin: '0 0 28px', fontFamily: "'DM Sans', sans-serif" }}>{subtitle}</p>}
    {!subtitle && <div style={{ height: 24 }} />}
    {children}
  </div>
);

/* ── Sub-page: Notifications ─────────────────────────────── */
function NotificationsPage({ onBack }) {
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [paymentReminders, setPaymentReminders] = useState(true);
  const [loanUpdates, setLoanUpdates] = useState(true);
  return (
    <SubPageShell title="Notifications" subtitle="Choose what you want to be notified about" onBack={onBack}>
      <Toggle checked={emailNotifs} onChange={setEmailNotifs} label="Email Notifications" sublabel="Receive updates via email" />
      <Toggle checked={paymentReminders} onChange={setPaymentReminders} label="Payment Reminders" sublabel="Get reminded before payments are due" />
      <Toggle checked={loanUpdates} onChange={setLoanUpdates} label="Loan Activity" sublabel="Be notified when loans are updated" />
      <p style={{ marginTop: 20, fontSize: 12, color: '#C5C3C0', fontFamily: "'DM Sans', sans-serif" }}>
        Notification preferences sync across your account.
      </p>
    </SubPageShell>
  );
}

/* ── Sub-page: Timezone ──────────────────────────────────── */
function TimezonePage({ onBack }) {
  const autoZone = detectTimezone();
  const [tzAuto, setTzAuto] = useState(() => {
    try { const r = localStorage.getItem('vony.tz.auto'); return r === null ? true : r === 'true'; } catch { return true; }
  });
  const [tzValue, setTzValue] = useState(() => {
    try { return localStorage.getItem('vony.tz.value') || autoZone; } catch { return autoZone; }
  });
  const displayedTz = tzAuto ? autoZone : tzValue;
  const timezones = getTimezoneList();
  const selectOptions = timezones.includes(displayedTz) ? timezones : [displayedTz, ...timezones];

  useEffect(() => {
    try { localStorage.setItem('vony.tz.auto', String(tzAuto)); } catch {}
    if (tzAuto) { try { localStorage.setItem('vony.tz.value', autoZone); } catch {} setTzValue(autoZone); }
  }, [tzAuto]);
  useEffect(() => {
    if (!tzAuto) { try { localStorage.setItem('vony.tz.value', tzValue); } catch {} }
  }, [tzValue, tzAuto]);

  return (
    <SubPageShell title="Timezone" subtitle="Set your local timezone for accurate scheduling" onBack={onBack}>
      {/* Dropdown */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>
          Timezone
        </div>
        <div style={{ position: 'relative' }}>
          <select
            disabled={tzAuto}
            value={displayedTz}
            onChange={e => setTzValue(e.target.value)}
            style={{
              width: '100%', padding: '12px 36px 12px 14px', borderRadius: 12,
              border: '1.5px solid rgba(0,0,0,0.10)',
              background: tzAuto ? '#F4F4F5' : '#ffffff',
              color: tzAuto ? '#9B9A98' : '#1A1918',
              fontSize: 14, fontFamily: "'DM Sans', sans-serif",
              appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
              outline: 'none', boxSizing: 'border-box',
              cursor: tzAuto ? 'not-allowed' : 'pointer',
              pointerEvents: tzAuto ? 'none' : 'auto',
            }}
          >
            {selectOptions.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={tzAuto ? '#C5C3C0' : '#787776'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

      {/* Set automatically toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1918', fontFamily: "'DM Sans', sans-serif" }}>Set automatically</div>
          <div style={{ fontSize: 13, color: '#787776', fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>Use your device's timezone</div>
        </div>
        <div
          onClick={() => setTzAuto(v => !v)}
          style={{ width: 44, height: 26, borderRadius: 13, position: 'relative', cursor: 'pointer', flexShrink: 0, marginLeft: 16, background: tzAuto ? '#03ACEA' : 'rgba(0,0,0,0.14)', transition: 'background 0.2s' }}
        >
          <div style={{ position: 'absolute', top: 3, left: tzAuto ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.25)', transition: 'left 0.2s' }} />
        </div>
      </div>
    </SubPageShell>
  );
}

/* ── Sub-page: About ─────────────────────────────────────── */
function AboutPage({ onBack }) {
  const { deleteAccount } = useAuth();
  const [step, setStep] = useState(null);

  const handleDelete = async () => {
    setStep('deleting');
    try { await deleteAccount(); } catch (e) { console.error(e); setStep(null); }
  };

  return (
    <SubPageShell title="About" subtitle="App information and account management" onBack={onBack}>
      <div style={{ padding: '14px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>App</div>
        <div style={{ fontSize: 15, color: '#1A1918', fontFamily: "'DM Sans', sans-serif" }}>Vony · Version 1.0</div>
      </div>

      <div style={{ marginTop: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 12, fontFamily: "'DM Sans', sans-serif" }}>Danger Zone</div>
        <button
          onClick={() => setStep('confirm')}
          style={{ padding: '10px 18px', borderRadius: 10, border: '1.5px solid rgba(232,114,110,0.35)', background: 'rgba(232,114,110,0.06)', color: '#E8726E', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
        >
          Delete Account
        </button>
      </div>

      {step === 'confirm' && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#ffffff', borderRadius: 16, maxWidth: 380, width: '100%', padding: '28px 28px 24px', boxShadow: '0 24px 64px rgba(0,0,0,0.18)', fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#1A1918', marginBottom: 10 }}>Delete your account?</div>
            <div style={{ fontSize: 13, color: '#787776', lineHeight: 1.6, marginBottom: 22 }}>
              This will permanently delete your account. Your loans and transactions with other people will remain intact on their end. <strong style={{ color: '#1A1918' }}>This cannot be undone.</strong>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(null)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid rgba(0,0,0,0.10)', background: 'white', fontSize: 13, fontWeight: 600, color: '#1A1918', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
              <button onClick={handleDelete} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: '#E8726E', fontSize: 13, fontWeight: 600, color: 'white', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Yes, delete it</button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {step === 'deleting' && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#ffffff', borderRadius: 16, padding: '32px 40px', textAlign: 'center', fontFamily: "'DM Sans', sans-serif", boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
            <div style={{ width: 32, height: 32, border: '2px solid #E8726E', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 14px' }} className="animate-spin" />
            <div style={{ fontSize: 13, color: '#787776' }}>Deleting your account…</div>
          </div>
        </div>,
        document.body
      )}
    </SubPageShell>
  );
}

/* ── Sub-page: Legal ─────────────────────────────────────── */
function LegalPage({ onBack }) {
  const links = [
    { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>, title: 'Privacy Policy', sub: 'How we collect and use your data', href: 'https://www.vony-lending.com/privacy' },
    { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>, title: 'Terms of Service', sub: 'The rules and terms for using Vony', href: 'https://www.vony-lending.com/terms' },
    { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" y1="8" x2="23" y2="14"/><line x1="23" y1="8" x2="17" y2="14"/></svg>, title: 'Do Not Sell My Personal Information', sub: 'Manage your data sharing preferences', href: 'https://www.vony-lending.com/do-not-sell' },
  ];
  return (
    <SubPageShell title="Legal" subtitle="Privacy and terms information" onBack={onBack}>
      {links.map((l, i) => (
        <a key={i} href={l.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: i < links.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none', cursor: 'pointer' }}>
          <div style={{ color: '#787776', flexShrink: 0, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{l.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1918', fontFamily: "'DM Sans', sans-serif" }}>{l.title}</div>
            <div style={{ fontSize: 13, color: '#787776', fontFamily: "'DM Sans', sans-serif", marginTop: 1 }}>{l.sub}</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C4C3C1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </a>
      ))}
    </SubPageShell>
  );
}

/* ── Sub-page: Coming Soon ───────────────────────────────── */
function ComingSoonPage({ onBack }) {
  const features = [
    { icon: '🏦', title: 'Bank Connections', sub: 'Link your bank account via Plaid for direct transfers' },
    { icon: '📊', title: 'Advanced Analytics', sub: 'Detailed insights into your lending and borrowing history' },
    { icon: '🔔', title: 'Push Notifications', sub: 'Real-time alerts for payments and loan updates' },
    { icon: '🤝', title: 'Group Loans', sub: 'Split loans across multiple people with ease' },
    { icon: '📄', title: 'Loan Contracts', sub: 'Generate and sign digital loan agreements' },
  ];
  return (
    <SubPageShell title="Coming Soon" subtitle="Features we're working on for you" onBack={onBack}>
      {features.map((f, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: i < features.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
          <span style={{ fontSize: 24, flexShrink: 0, width: 36, textAlign: 'center' }}>{f.icon}</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1918', fontFamily: "'DM Sans', sans-serif" }}>{f.title}</div>
            <div style={{ fontSize: 13, color: '#787776', fontFamily: "'DM Sans', sans-serif", marginTop: 1 }}>{f.sub}</div>
          </div>
        </div>
      ))}
    </SubPageShell>
  );
}

/* ── Sub-page: Account Info ──────────────────────────────── */
function AccountInfoPage({ user, formData, setFormData, setUser, onBack }) {
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveField = async (field, value) => {
    setIsSaving(true);
    try {
      await User.updateMyUserData({ [field]: value });
      setFormData(prev => ({ ...prev, [field]: value }));
      setUser(prev => ({ ...prev, [field]: value }));
      if (['full_name', 'username', 'profile_picture_url'].includes(field)) {
        await syncPublicProfile({ ...user, [field]: value });
      }
    } catch (err) { console.error(err); }
    setIsSaving(false);
    setEditingField(null);
  };

  const accountRows = [
    { field: 'full_name', label: formData.full_name || '—', sub: formData.username ? `Preferred name: ${formData.full_name?.split(' ')[0] || ''}` : '', canEdit: true,
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
    { field: 'username', label: formData.username ? `@${formData.username}` : '—', canEdit: true,
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32"/></svg> },
    { field: 'password', label: 'Update password', canEdit: false, isPassword: true,
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
  ];
  const homeRows = [
    { field: 'email', label: user?.email || '—', canEdit: false,
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> },
    { field: 'phone', label: formData.phone || '—', canEdit: true,
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.47a2 2 0 0 1 1.98-2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg> },
    { field: 'location', label: formData.location || '—', canEdit: true,
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  ];

  const renderRow = (row, i, arr, sectionLabel) => {
    const isEditing = editingField === row.field;
    return (
      <div key={row.field} style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
        {i === 0 && sectionLabel && (
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1A1918', margin: sectionLabel === 'main' ? '0 0 4px' : '24px 0 4px', fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.02em', paddingTop: sectionLabel === 'Home' ? 0 : 0 }}>
            {sectionLabel !== 'main' ? sectionLabel : ''}
          </div>
        )}
        {isEditing ? (
          <div style={{ padding: '14px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ color: '#1A1918', flexShrink: 0, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{row.icon}</div>
            <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center' }}>
              <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)}
                style={{ flex: 1, border: '1.5px solid #03ACEA', borderRadius: 8, padding: '8px 12px', fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: '#1A1918', outline: 'none' }} />
              <button onClick={() => handleSaveField(row.field, editValue)} disabled={isSaving}
                style={{ background: '#03ACEA', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
                {isSaving ? '…' : 'Save'}
              </button>
              <button onClick={() => setEditingField(null)}
                style={{ background: 'none', color: '#787776', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0' }}>
            <div style={{ color: '#787776', flexShrink: 0, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{row.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, color: '#1A1918', fontFamily: "'DM Sans', sans-serif" }}>{row.label}</div>
              {row.sub && <div style={{ fontSize: 12, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif", marginTop: 1 }}>{row.sub}</div>}
            </div>
            {row.canEdit && (
              <button onClick={() => { setEditingField(row.field); setEditValue(formData[row.field] || ''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#03ACEA', fontFamily: "'DM Sans', sans-serif", padding: 0, whiteSpace: 'nowrap' }}>
                Edit
              </button>
            )}
            {row.isPassword && (
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#03ACEA', fontFamily: "'DM Sans', sans-serif", padding: 0, whiteSpace: 'nowrap' }}>
                Update
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mesh-center" style={{ background: 'transparent', borderRight: '1px solid rgba(0,0,0,0.06)', padding: '24px 32px 80px', maxWidth: 600 }}>
      <BackButton onClick={onBack} />
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1A1918', margin: '0 0 28px', fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.03em' }}>
        Personal Info
      </h1>
      <div>{accountRows.map((r, i) => renderRow(r, i, accountRows, 'main'))}</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1A1918', margin: '28px 0 4px', fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.02em' }}>Home</h2>
      <div>{homeRows.map((r, i) => renderRow(r, i, homeRows, null))}</div>
    </div>
  );
}

/* ── Sub-page: Currency ──────────────────────────────────── */
function CurrencyPage({ formData, onBack, onSave }) {
  return (
    <SubPageShell title="Currency" subtitle="Choose your preferred display currency" onBack={onBack}>
      {CURRENCIES.map((c, i) => {
        const isSelected = (formData.currency || 'USD') === c.code;
        return (
          <div key={c.code} onClick={() => onSave(c.code)}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: i < CURRENCIES.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none', cursor: 'pointer' }}>
            <span style={{ fontSize: 24, flexShrink: 0, width: 36, textAlign: 'center' }}>{c.flag}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1918', fontFamily: "'DM Sans', sans-serif" }}>{c.name}</div>
              <div style={{ fontSize: 13, color: '#787776', fontFamily: "'DM Sans', sans-serif" }}>{c.code} · {c.symbol}</div>
            </div>
            {isSelected && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#03ACEA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        );
      })}
    </SubPageShell>
  );
}

/* ── Sub-page: History ───────────────────────────────────── */
function HistoryPage({ user, onBack }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      try {
        const [lentLoans, borrowedLoans, payments] = await Promise.all([
          Loan.filter({ lender_id: { eq: user.id } }),
          Loan.filter({ borrower_id: { eq: user.id } }),
          Payment.filter({ payer_id: { eq: user.id } }),
        ]);
        const totalLent = lentLoans.reduce((s, l) => s + (Number(l.amount) || Number(l.total_amount) || 0), 0);
        const totalBorrowed = borrowedLoans.reduce((s, l) => s + (Number(l.amount) || Number(l.total_amount) || 0), 0);
        const loanCount = lentLoans.length + borrowedLoans.length;
        const paymentCount = payments.length;
        const amountRepaid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
        setStats({ totalLent, totalBorrowed, loanCount, paymentCount, amountRepaid });
      } catch (e) {
        console.error(e);
        setStats({ totalLent: 0, totalBorrowed: 0, loanCount: 0, paymentCount: 0, amountRepaid: 0 });
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const fmt = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const statCards = stats ? [
    { emoji: '💸', label: 'Total lent', value: `$${fmt(stats.totalLent)}`, sub: 'across all loans you created' },
    { emoji: '🤝', label: 'Total borrowed', value: `$${fmt(stats.totalBorrowed)}`, sub: 'across all loans you received' },
    { emoji: '📋', label: 'Loans', value: stats.loanCount, sub: stats.loanCount === 1 ? 'loan in total' : 'loans in total' },
    { emoji: '💳', label: 'Payments made', value: stats.paymentCount, sub: stats.paymentCount === 1 ? 'payment recorded' : 'payments recorded' },
    { emoji: '✅', label: 'Amount repaid', value: `$${fmt(stats.amountRepaid)}`, sub: 'total paid back by you' },
  ] : [];

  return (
    <SubPageShell title="History" onBack={onBack}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}>
          <div style={{ width: 28, height: 28, border: '2px solid #03ACEA', borderTopColor: 'transparent', borderRadius: '50%' }} className="animate-spin" />
        </div>
      ) : (
        <>
          {/* ── Hero celebratory banner ── */}
          <div style={{
            background: 'linear-gradient(135deg, #1A1918 0%, #2d2c2b 100%)',
            borderRadius: 20,
            padding: '28px 24px 24px',
            marginBottom: 24,
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* decorative blobs */}
            <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(3,172,234,0.12)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -10, left: -10, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
            <div style={{ fontSize: 36, marginBottom: 10 }}>🏆</div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', fontFamily: "'DM Sans', sans-serif", marginBottom: 6 }}>
              Your lending history
            </div>
            <div style={{ fontSize: 42, fontWeight: 800, color: 'white', letterSpacing: '-0.04em', fontFamily: "'DM Sans', sans-serif", lineHeight: 1 }}>
              ${fmt((stats?.totalLent || 0) + (stats?.totalBorrowed || 0))}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.40)', fontFamily: "'DM Sans', sans-serif", marginTop: 6 }}>
              total across {stats?.loanCount || 0} {stats?.loanCount === 1 ? 'loan' : 'loans'} 🎉
            </div>
          </div>

          {/* ── Stat rows ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {statCards.map((card, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '16px 0',
                borderBottom: i < statCards.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 14,
                  background: '#F4F4F5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, flexShrink: 0,
                }}>
                  {card.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: '#787776', fontFamily: "'DM Sans', sans-serif", marginBottom: 2 }}>{card.label}</div>
                  <div style={{ fontSize: 12, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif" }}>{card.sub}</div>
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>
                  {card.value}
                </div>
              </div>
            ))}
          </div>

          {/* ── Footer note ── */}
          {stats?.loanCount === 0 && (
            <div style={{ textAlign: 'center', paddingTop: 32 }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>📣</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", marginBottom: 4 }}>
                No loans yet
              </div>
              <div style={{ fontSize: 13, color: '#787776', fontFamily: "'DM Sans', sans-serif" }}>
                Your history will appear here once you create or receive a loan.
              </div>
            </div>
          )}
        </>
      )}
    </SubPageShell>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PROFILE PAGE
═══════════════════════════════════════════════════════════ */
export default function Profile() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subPage, setSubPage] = useState(null);
  const [formData, setFormData] = useState({ full_name: '', username: '', phone: '', location: '', profile_picture_url: '', currency: 'USD' });
  const [isSaving, setIsSaving] = useState(false);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const photoMenuRef = useRef(null);

  useEffect(() => { loadUserData(); }, []);
  useEffect(() => {
    const fn = (e) => { if (photoMenuRef.current && !photoMenuRef.current.contains(e.target)) setShowPhotoMenu(false); };
    if (showPhotoMenu) document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [showPhotoMenu]);

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      const userData = await User.me();
      setUser(userData);
      setFormData({ full_name: userData?.full_name || '', username: userData?.username || '', phone: userData?.phone || '', location: userData?.location || '', profile_picture_url: userData?.profile_picture_url || '', currency: userData?.currency || 'USD' });
      await syncPublicProfile(userData);
    } catch (err) { console.error(err); }
    setIsLoading(false);
  };

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsSaving(true);
    setShowPhotoMenu(false);
    try {
      const { file_url } = await UploadFile({ file, userId: user?.id });
      setFormData(prev => ({ ...prev, profile_picture_url: file_url }));
      setUser(prev => ({ ...prev, profile_picture_url: file_url }));
      await User.updateMyUserData({ profile_picture_url: file_url });
      await syncPublicProfile({ ...user, profile_picture_url: file_url });
    } catch (err) { console.error(err); }
    setIsSaving(false);
  };

  const handleSelectMemoji = async (memojiUrl) => {
    setShowAvatarPicker(false);
    setIsSaving(true);
    try {
      setFormData(prev => ({ ...prev, profile_picture_url: memojiUrl }));
      setUser(prev => ({ ...prev, profile_picture_url: memojiUrl }));
      await User.updateMyUserData({ profile_picture_url: memojiUrl });
      await syncPublicProfile({ ...user, profile_picture_url: memojiUrl });
    } catch (err) { console.error(err); }
    setIsSaving(false);
  };

  const handleRemovePhoto = async () => {
    setIsSaving(true);
    setShowPhotoMenu(false);
    try {
      setFormData(prev => ({ ...prev, profile_picture_url: '' }));
      setUser(prev => ({ ...prev, profile_picture_url: '' }));
      await User.updateMyUserData({ profile_picture_url: '' });
      await syncPublicProfile({ ...user, profile_picture_url: '' });
    } catch (err) { console.error(err); }
    setIsSaving(false);
  };

  const handleSaveCurrency = async (code) => {
    setIsSaving(true);
    try {
      await User.updateMyUserData({ currency: code });
      setFormData(prev => ({ ...prev, currency: code }));
      setUser(prev => ({ ...prev, currency: code }));
    } catch (err) { console.error(err); }
    setIsSaving(false);
    setSubPage(null);
  };

  const handleLogout = async () => {
    try { await User.logout(); } catch (_) {}
    if (logout) logout();
    navigate(createPageUrl("Home"));
  };

  if (isLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '2px solid #03ACEA', borderTopColor: 'transparent', borderRadius: '50%' }} className="animate-spin" />
    </div>
  );
  if (!user) return null;

  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '';
  const nameParts = (formData.full_name || '').trim().split(' ').filter(Boolean);
  const displayName = nameParts.length > 1 ? nameParts[0] + ' ' + nameParts[nameParts.length - 1].charAt(0) + '.' : nameParts[0] || 'User';
  const selectedCurrency = CURRENCIES.find(c => c.code === (formData.currency || 'USD')) || CURRENCIES[0];

  const renderSubPage = () => {
    if (subPage === 'account') return <AccountInfoPage user={user} formData={formData} setFormData={setFormData} setUser={setUser} onBack={() => setSubPage(null)} />;
    if (subPage === 'history') return <HistoryPage user={user} onBack={() => setSubPage(null)} />;
    if (subPage === 'currency') return <CurrencyPage formData={formData} onBack={() => setSubPage(null)} onSave={handleSaveCurrency} />;
    if (subPage === 'notifications') return <NotificationsPage onBack={() => setSubPage(null)} />;
    if (subPage === 'timezone') return <TimezonePage onBack={() => setSubPage(null)} />;
    if (subPage === 'about') return <AboutPage onBack={() => setSubPage(null)} />;
    if (subPage === 'legal') return <LegalPage onBack={() => setSubPage(null)} />;
    if (subPage === 'comingsoon') return <ComingSoonPage onBack={() => setSubPage(null)} />;
    return null;
  };

  const subContent = renderSubPage();

  return (
    <div style={{ minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", background: 'transparent' }}>
      <MeshMobileNav user={user} activePage="Profile" />

      <div className="mesh-layout" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 0, minHeight: '100vh' }}>
        <DesktopSidebar />

        {subContent ? subContent : (
          <div className="mesh-center" style={{ background: 'transparent', display: 'flex', justifyContent: 'center', padding: '24px 24px 80px' }}>
          <div style={{ width: '100%', maxWidth: 600 }}>

            {/* ── Avatar + Name ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36 }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1A1918', margin: '0 0 4px', fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.03em' }}>
                  {displayName}
                </h1>
                {joinedDate && <p style={{ fontSize: 14, color: '#787776', margin: '0 0 10px', fontFamily: "'DM Sans', sans-serif" }}>Joined {joinedDate}</p>}
                <DemoModeToggle variant="profile" />
              </div>
              <div style={{ position: 'relative', flexShrink: 0, display: 'inline-flex' }}>
                <UserAvatar name={formData.full_name || user.username} src={formData.profile_picture_url} size={78} />
                <button onClick={() => setShowPhotoMenu(!showPhotoMenu)} disabled={isSaving}
                  style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: '50%', background: 'white', border: '1.5px solid rgba(0,0,0,0.10)', boxShadow: '0 2px 8px rgba(0,0,0,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Camera size={11} style={{ color: '#1A1918' }} />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleProfilePictureChange} style={{ display: 'none' }} accept="image/*" />
                <input type="file" ref={cameraInputRef} onChange={handleProfilePictureChange} style={{ display: 'none' }} accept="image/*" capture="environment" />
                {showPhotoMenu && (
                  <motion.div ref={photoMenuRef} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: 'white', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden', zIndex: 10, minWidth: 200 }}>
                    {[
                      { label: 'Choose Avatar', icon: <Smile size={15} style={{ color: '#787776' }} />, onClick: () => { setShowPhotoMenu(false); setShowAvatarPicker(true); } },
                      { label: 'Choose from Library', icon: <ImageIcon size={15} style={{ color: '#787776' }} />, onClick: () => fileInputRef.current?.click() },
                      { label: 'Take Photo', icon: <Camera size={15} style={{ color: '#787776' }} />, onClick: () => cameraInputRef.current?.click() },
                      ...(formData.profile_picture_url ? [{ label: 'Remove Photo', icon: <Trash2 size={15} style={{ color: '#E8726E' }} />, onClick: handleRemovePhoto, danger: true }] : []),
                    ].map((item, i) => (
                      <button key={i} onClick={item.onClick}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: item.danger ? '#E8726E' : '#1A1918', fontFamily: "'DM Sans', sans-serif", textAlign: 'left', borderTop: i > 0 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}
                        onMouseEnter={e => e.currentTarget.style.background = item.danger ? 'rgba(232,114,110,0.06)' : 'rgba(0,0,0,0.03)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                        {item.icon} {item.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>
            </div>

            {/* ── Avatar picker modal ── */}
            {showAvatarPicker && createPortal(
              <div
                onClick={() => setShowAvatarPicker(false)}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
              >
                <div
                  onClick={e => e.stopPropagation()}
                  style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 540, padding: '20px 20px 36px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <span style={{ fontSize: 16, fontWeight: 600, color: '#1A1918', fontFamily: "'DM Sans', sans-serif" }}>Choose Avatar</span>
                    <button onClick={() => setShowAvatarPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#787776', padding: 4 }}>
                      <X size={20} />
                    </button>
                  </div>
                  <div style={{ overflowY: 'auto', flex: 1 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: 10 }}>
                      {PROFILE_ICON_IMAGES.map((imgUrl, idx) => {
                        const isSelected = formData.profile_picture_url === imgUrl;
                        const bg = AVATAR_PICKER_COLORS[idx % AVATAR_PICKER_COLORS.length];
                        return (
                          <button key={imgUrl} type="button" onClick={() => handleSelectMemoji(imgUrl)}
                            style={{ width: 60, height: 60, borderRadius: '50%', border: isSelected ? '3px solid #1A1918' : '3px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: bg, padding: 0, overflow: 'hidden', transition: 'transform 0.12s', transform: isSelected ? 'scale(1.1)' : 'scale(1)' }}
                          >
                            <img src={imgUrl} alt="avatar" style={{ width: '92%', height: '92%', objectFit: 'contain', objectPosition: 'center 8%', pointerEvents: 'none' }} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>,
              document.body
            )}

            {/* ── Refer a Friend ── */}
            <SectionTitle first>Refer a Friend</SectionTitle>
            <div>
              <ListRow
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>}
                label="Invite a friend"
                sub="Share Vony with someone you trust"
                onClick={() => { const msg = encodeURIComponent("Hey! I've been using Vony to manage loans with friends — it's really handy. Check it out: https://www.vony-lending.com"); window.open(`sms:&body=${msg}`, '_blank'); }}
              />
            </div>

            {/* ── Account ── */}
            <SectionTitle>Account</SectionTitle>
            <div>
              <ListRow
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
                label="Account info"
                sub="Update your name, username, phone and more"
                onClick={() => setSubPage('account')}
              />
              <ListRow
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
                label="History"
                sub="Total lent, borrowed, and loans over time"
                onClick={() => setSubPage('history')}
              />
            </div>

            {/* ── Preferences ── */}
            <SectionTitle>Preferences</SectionTitle>
            <div>
              <ListRow
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M1 12h22"/><path d="M12 1a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>}
                label="Currency"
                sub={`${selectedCurrency.code} · ${selectedCurrency.name}`}
                onClick={() => setSubPage('currency')}
              />
              <ListRow
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>}
                label="Notifications"
                sub="Email, reminders and loan activity"
                onClick={() => setSubPage('notifications')}
              />
              <ListRow
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                label="Timezone"
                sub={detectTimezone()}
                onClick={() => setSubPage('timezone')}
              />
            </div>

            {/* ── Document Center ── */}
            <SectionTitle>Document Center</SectionTitle>
            <div>
              <ListRow
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>}
                label="Lending & Borrowing Records"
                sub="Signed loan agreements, promissory notes and schedules"
                onClick={() => navigate(createPageUrl('LoanAgreements'))}
              />
              <ListRow
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
                label="Transactions & Activity"
                sub="Payment history and all loan activity"
                onClick={() => navigate(createPageUrl('RecentActivity'))}
              />
            </div>

            {/* ── Help Center ── */}
            <SectionTitle>Help Center</SectionTitle>
            <div>
              <ListRow
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
                label="Help and Support"
                sub="Find answers to common questions"
                href="https://www.vony-lending.com/help"
              />
              <ListRow
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
                label="Contact Us"
                sub="Send us a message and we'll get back to you"
                href="https://www.vony-lending.com/contact"
              />
              <ListRow
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>}
                label="Guide"
                sub="Your introduction to Vony — learn how it works"
                href="https://www.vony-lending.com/guide"
              />
            </div>

            {/* ── Other ── */}
            <SectionTitle>Other</SectionTitle>
            <div>
              <ListRow
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
                label="About"
                sub="App version and account management"
                onClick={() => setSubPage('about')}
              />
              <ListRow
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
                label="Legal"
                sub="Privacy policy, terms and data preferences"
                onClick={() => setSubPage('legal')}
              />
              <ListRow
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                label="Coming Soon"
                sub="Features we're building for you"
                onClick={() => setSubPage('comingsoon')}
              />
            </div>

            {/* ── Log out ── */}
            <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <button onClick={handleLogout}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#787776', fontSize: 14, fontFamily: "'DM Sans', sans-serif", padding: 0 }}
                onMouseEnter={e => e.currentTarget.style.color = '#E8726E'}
                onMouseLeave={e => e.currentTarget.style.color = '#787776'}>
                <LogOut size={16} />
                Log out
              </button>
            </div>

            {/* Footer */}
            <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#787776' }}>2026 Vony, Inc. All rights reserved.</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <a href="https://www.vony-lending.com/terms" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#787776', textDecoration: 'none' }}>Terms</a>
                <a href="https://www.vony-lending.com/privacy" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#787776', textDecoration: 'none' }}>Privacy</a>
              </div>
            </div>
          </div>
          </div>
        )}
      </div>
    </div>
  );
}

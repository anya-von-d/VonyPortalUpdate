import { useState, useEffect, useRef } from "react";
import { User, PublicProfile } from "@/entities/all";
import { UploadFile } from "@/integrations/Core";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import MeshMobileNav from "@/components/MeshMobileNav";
import UserAvatar from "@/components/ui/UserAvatar";
import DesktopSidebar from '../components/DesktopSidebar';
import { Camera, Image as ImageIcon, Trash2, LogOut } from "lucide-react";
import { motion } from "framer-motion";

const syncPublicProfile = async (userData) => {
  if (!userData || !userData.id || !userData.username || !userData.full_name) return;
  try {
    const existingProfiles = await PublicProfile.filter({ user_id: { eq: userData.id } });
    const defaultAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent((userData.full_name || 'User').charAt(0))}&background=678AFB&color=fff&size=128`;
    const publicProfileData = {
      user_id: userData.id,
      username: userData.username,
      full_name: userData.full_name,
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
  } catch (error) {
    console.error("Failed to sync public profile:", error);
  }
};

const CURRENCIES = [
  { code: 'USD', symbol: '$',   name: 'US Dollar',            flag: '🇺🇸' },
  { code: 'EUR', symbol: '€',   name: 'Euro',                 flag: '🇪🇺' },
  { code: 'GBP', symbol: '£',   name: 'British Pound',        flag: '🇬🇧' },
  { code: 'AUD', symbol: 'A$',  name: 'Australian Dollar',    flag: '🇦🇺' },
  { code: 'CAD', symbol: 'C$',  name: 'Canadian Dollar',      flag: '🇨🇦' },
  { code: 'CHF', symbol: 'Fr',  name: 'Swiss Franc',          flag: '🇨🇭' },
  { code: 'JPY', symbol: '¥',   name: 'Japanese Yen',         flag: '🇯🇵' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar',   flag: '🇳🇿' },
  { code: 'SEK', symbol: 'kr',  name: 'Swedish Krona',        flag: '🇸🇪' },
  { code: 'NOK', symbol: 'kr',  name: 'Norwegian Krone',      flag: '🇳🇴' },
  { code: 'ZAR', symbol: 'R',   name: 'South African Rand',   flag: '🇿🇦' },
  { code: 'INR', symbol: '₹',   name: 'Indian Rupee',         flag: '🇮🇳' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso',         flag: '🇲🇽' },
  { code: 'BRL', symbol: 'R$',  name: 'Brazilian Real',       flag: '🇧🇷' },
  { code: 'SGD', symbol: 'S$',  name: 'Singapore Dollar',     flag: '🇸🇬' },
];

const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C4C3C1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const BackButton = ({ onClick }) => (
  <button
    onClick={onClick}
    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 20px', color: '#1A1918', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500 }}
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
    Back
  </button>
);

const SectionTitle = ({ children }) => (
  <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1A1918', margin: '28px 0 4px', fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.02em' }}>
    {children}
  </h2>
);

const ListRow = ({ icon, label, sub, onClick, right }) => (
  <div
    onClick={onClick}
    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid rgba(0,0,0,0.06)', cursor: onClick ? 'pointer' : 'default' }}
  >
    <div style={{ color: '#1A1918', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36 }}>
      {icon}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.01em' }}>{label}</div>
      {sub && <div style={{ fontSize: 13, color: '#787776', fontFamily: "'DM Sans', sans-serif", marginTop: 1 }}>{sub}</div>}
    </div>
    {right !== undefined ? right : (onClick ? <ChevronRight /> : null)}
  </div>
);

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subPage, setSubPage] = useState(null); // null | 'account' | 'currency'
  const [formData, setFormData] = useState({
    full_name: '', username: '', phone: '', location: '',
    profile_picture_url: '', currency: 'USD',
  });
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const photoMenuRef = useRef(null);

  useEffect(() => { loadUserData(); }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (photoMenuRef.current && !photoMenuRef.current.contains(e.target)) setShowPhotoMenu(false);
    };
    if (showPhotoMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPhotoMenu]);

  const loadUserData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const userData = await User.me();
      setUser(userData);
      setFormData({
        full_name: userData?.full_name || '',
        username: userData?.username || '',
        phone: userData?.phone || '',
        location: userData?.location || '',
        profile_picture_url: userData?.profile_picture_url || '',
        currency: userData?.currency || 'USD',
      });
      await syncPublicProfile(userData);
    } catch (err) {
      console.error("Error loading user data:", err);
      setError("Failed to load profile data.");
    }
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
    } catch (err) {
      console.error("Error uploading photo:", err);
    }
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
    } catch (err) {
      console.error("Error removing photo:", err);
    }
    setIsSaving(false);
  };

  const handleSaveField = async (field, value) => {
    setIsSaving(true);
    try {
      await User.updateMyUserData({ [field]: value });
      setFormData(prev => ({ ...prev, [field]: value }));
      setUser(prev => ({ ...prev, [field]: value }));
      if (['full_name', 'username', 'profile_picture_url'].includes(field)) {
        await syncPublicProfile({ ...user, [field]: value });
      }
    } catch (err) {
      console.error("Error saving field:", err);
    }
    setIsSaving(false);
    setEditingField(null);
  };

  const handleLogout = async () => {
    try { await User.logout(); } catch (_) {}
    navigate(createPageUrl("Home"));
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid #03ACEA', borderTopColor: 'transparent', borderRadius: '50%' }} className="animate-spin" />
      </div>
    );
  }
  if (!user) return null;

  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '';

  const nameParts = (formData.full_name || '').trim().split(' ').filter(Boolean);
  const displayName = nameParts.length > 1
    ? nameParts[0] + ' ' + nameParts[nameParts.length - 1].charAt(0) + '.'
    : nameParts[0] || 'User';

  const selectedCurrency = CURRENCIES.find(c => c.code === (formData.currency || 'USD')) || CURRENCIES[0];

  // ─── ACCOUNT INFO SUB-PAGE ─────────────────────────────────────────────────
  const renderAccountPage = () => {
    const accountRows = [
      {
        field: 'full_name',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
        ),
        label: formData.full_name || '—',
        sub: formData.username ? `@${formData.username}` : '',
        canEdit: true,
      },
      {
        field: 'email',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
          </svg>
        ),
        label: user.email || '—',
        canEdit: false,
      },
      {
        field: 'username',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32"/>
          </svg>
        ),
        label: formData.username ? `@${formData.username}` : '—',
        canEdit: true,
      },
      {
        field: 'phone',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.47a2 2 0 0 1 1.98-2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
        ),
        label: formData.phone || '—',
        canEdit: true,
      },
      {
        field: 'location',
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        ),
        label: formData.location || '—',
        canEdit: true,
      },
    ];

    return (
      <div className="mesh-center" style={{ background: 'transparent', borderRight: '1px solid rgba(0,0,0,0.06)', padding: '24px 32px 80px', maxWidth: 640 }}>
        <BackButton onClick={() => { setSubPage(null); setEditingField(null); }} />
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1A1918', margin: '0 0 4px', fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.03em' }}>
          Account info
        </h1>
        <p style={{ fontSize: 14, color: '#787776', margin: '0 0 24px', fontFamily: "'DM Sans', sans-serif" }}>
          Manage your personal information
        </p>

        <div>
          {accountRows.map((row, i) => (
            <div key={row.field} style={{ borderBottom: i < accountRows.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
              {editingField === row.field ? (
                <div style={{ padding: '14px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ color: '#1A1918', flexShrink: 0, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {row.icon}
                  </div>
                  <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      autoFocus
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      style={{ flex: 1, border: '1.5px solid #03ACEA', borderRadius: 8, padding: '8px 12px', fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: '#1A1918', outline: 'none' }}
                    />
                    <button
                      onClick={() => handleSaveField(row.field, editValue)}
                      disabled={isSaving}
                      style={{ background: '#03ACEA', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}
                    >
                      {isSaving ? '…' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditingField(null)}
                      style={{ background: 'none', color: '#787776', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0' }}>
                  <div style={{ color: '#787776', flexShrink: 0, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {row.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, color: '#1A1918', fontFamily: "'DM Sans', sans-serif" }}>{row.label}</div>
                    {row.sub && <div style={{ fontSize: 12, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif", marginTop: 1 }}>{row.sub}</div>}
                  </div>
                  {row.canEdit && (
                    <button
                      onClick={() => { setEditingField(row.field); setEditValue(formData[row.field] || ''); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#03ACEA', fontFamily: "'DM Sans', sans-serif", padding: 0 }}
                    >
                      Edit
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── CURRENCY SUB-PAGE ─────────────────────────────────────────────────────
  const renderCurrencyPage = () => (
    <div className="mesh-center" style={{ background: 'transparent', borderRight: '1px solid rgba(0,0,0,0.06)', padding: '24px 32px 80px', maxWidth: 640 }}>
      <BackButton onClick={() => setSubPage(null)} />
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1A1918', margin: '0 0 4px', fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.03em' }}>
        Currency
      </h1>
      <p style={{ fontSize: 14, color: '#787776', margin: '0 0 24px', fontFamily: "'DM Sans', sans-serif" }}>
        Choose your preferred display currency
      </p>

      <div>
        {CURRENCIES.map((c, i) => {
          const isSelected = (formData.currency || 'USD') === c.code;
          return (
            <div
              key={c.code}
              onClick={() => handleSaveField('currency', c.code)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0',
                borderBottom: i < CURRENCIES.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 24, flexShrink: 0, width: 36, textAlign: 'center' }}>{c.flag}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1918', fontFamily: "'DM Sans', sans-serif" }}>
                  {c.name}
                </div>
                <div style={{ fontSize: 13, color: '#787776', fontFamily: "'DM Sans', sans-serif" }}>
                  {c.code} · {c.symbol}
                </div>
              </div>
              {isSelected && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#03ACEA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ─── MAIN PROFILE PAGE ─────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", background: 'transparent' }}>
      <MeshMobileNav user={user} activePage="Profile" />

      <div className="mesh-layout" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 0, minHeight: '100vh' }}>
        <DesktopSidebar />

        {subPage === 'account' ? renderAccountPage() :
         subPage === 'currency' ? renderCurrencyPage() : (

          <div className="mesh-center" style={{ background: 'transparent', borderRight: '1px solid rgba(0,0,0,0.06)', padding: '24px 32px 80px', maxWidth: 640 }}>

            {/* ── Avatar + Name + Joined ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1A1918', margin: '0 0 4px', fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.03em' }}>
                  {displayName}
                </h1>
                {joinedDate && (
                  <p style={{ fontSize: 14, color: '#787776', margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
                    Joined {joinedDate}
                  </p>
                )}
              </div>

              {/* Avatar with ring + camera */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', padding: 3, background: 'linear-gradient(135deg, #03ACEA, #1D5B94)', display: 'inline-flex' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#F4F4F5' }}>
                    <UserAvatar
                      name={formData.full_name || user.username}
                      src={formData.profile_picture_url}
                      size={66}
                      style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                </div>
                <button
                  onClick={() => setShowPhotoMenu(!showPhotoMenu)}
                  disabled={isSaving}
                  style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: '50%', background: 'white', border: '1.5px solid rgba(0,0,0,0.10)', boxShadow: '0 2px 8px rgba(0,0,0,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <Camera size={11} style={{ color: '#1A1918' }} />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleProfilePictureChange} style={{ display: 'none' }} accept="image/*" />
                <input type="file" ref={cameraInputRef} onChange={handleProfilePictureChange} style={{ display: 'none' }} accept="image/*" capture="environment" />

                {showPhotoMenu && (
                  <motion.div
                    ref={photoMenuRef}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: 'white', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden', zIndex: 10, minWidth: 200 }}
                  >
                    {[
                      { label: 'Choose from Library', icon: <ImageIcon size={15} style={{ color: '#787776' }} />, onClick: () => fileInputRef.current?.click() },
                      { label: 'Take Photo', icon: <Camera size={15} style={{ color: '#787776' }} />, onClick: () => cameraInputRef.current?.click() },
                      ...(formData.profile_picture_url ? [{ label: 'Remove Photo', icon: <Trash2 size={15} style={{ color: '#E8726E' }} />, onClick: handleRemovePhoto, danger: true }] : []),
                    ].map((item, i) => (
                      <button
                        key={i}
                        onClick={item.onClick}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: item.danger ? '#E8726E' : '#1A1918', fontFamily: "'DM Sans', sans-serif", textAlign: 'left', borderTop: i > 0 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}
                        onMouseEnter={e => e.currentTarget.style.background = item.danger ? 'rgba(232,114,110,0.06)' : 'rgba(0,0,0,0.03)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        {item.icon} {item.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>
            </div>

            {/* ── Refer a Friend ── */}
            <SectionTitle>Refer a Friend</SectionTitle>
            <div>
              <ListRow
                icon={
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                }
                label="Invite a friend"
                sub="Share Vony with someone you trust"
                onClick={() => {
                  const msg = encodeURIComponent("Hey! I've been using Vony to manage loans with friends — it's really handy. Check it out: https://www.vony-lending.com");
                  window.open(`sms:&body=${msg}`, '_blank');
                }}
              />
            </div>

            {/* ── Account ── */}
            <SectionTitle>Account</SectionTitle>
            <div>
              <ListRow
                icon={
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                }
                label="Account info"
                sub="Update your name, username, phone and more"
                onClick={() => setSubPage('account')}
              />
            </div>

            {/* ── Preferences ── */}
            <SectionTitle>Preferences</SectionTitle>
            <div>
              <ListRow
                icon={
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M1 12h22"/><path d="M12 1a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  </svg>
                }
                label="Currency"
                sub={`${selectedCurrency.code} · ${selectedCurrency.name}`}
                onClick={() => setSubPage('currency')}
              />
            </div>

            {/* ── Log out ── */}
            <div style={{ marginTop: 40 }}>
              <button
                onClick={handleLogout}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#787776', fontSize: 14, fontFamily: "'DM Sans', sans-serif", padding: 0 }}
                onMouseEnter={e => e.currentTarget.style.color = '#E8726E'}
                onMouseLeave={e => e.currentTarget.style.color = '#787776'}
              >
                <LogOut size={16} />
                Log out
              </button>
            </div>

            {/* Footer */}
            <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#787776' }}>2026 Vony, Inc. All rights reserved.</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <a href="https://www.vony-lending.com/terms" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#787776', textDecoration: 'none' }}>Terms</a>
                <a href="https://www.vony-lending.com/privacy" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#787776', textDecoration: 'none' }}>Privacy</a>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

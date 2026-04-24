import { useState, useEffect, useRef } from 'react';
import { User, PublicProfile } from '@/entities/all';
import { supabase } from '@/lib/supabaseClient';
import { UploadFile } from '@/integrations/Core';
import { CheckCircle, Loader2, ChevronDown, Pencil, Landmark, Image, X } from 'lucide-react';
import UserAvatar from '@/components/ui/UserAvatar';
import { useAuth } from '@/lib/AuthContext';
import { ICON_OPTIONS, generateIconUrl as sharedGenerateIconUrl, iconInnerSvg } from '@/lib/profileIcons';

const CURRENCIES = [
  { code: 'USD', label: 'USD — US Dollar ($)' },
  { code: 'EUR', label: 'EUR — Euro (€)' },
  { code: 'GBP', label: 'GBP — British Pound (£)' },
  { code: 'AUD', label: 'AUD — Australian Dollar (A$)' },
  { code: 'CAD', label: 'CAD — Canadian Dollar (C$)' },
  { code: 'CHF', label: 'CHF — Swiss Franc (Fr)' },
  { code: 'JPY', label: 'JPY — Japanese Yen (¥)' },
  { code: 'CNY', label: 'CNY — Chinese Yuan (¥)' },
  { code: 'INR', label: 'INR — Indian Rupee (₹)' },
  { code: 'BRL', label: 'BRL — Brazilian Real (R$)' },
  { code: 'MXN', label: 'MXN — Mexican Peso (MX$)' },
  { code: 'KRW', label: 'KRW — South Korean Won (₩)' },
  { code: 'SGD', label: 'SGD — Singapore Dollar (S$)' },
  { code: 'HKD', label: 'HKD — Hong Kong Dollar (HK$)' },
  { code: 'NOK', label: 'NOK — Norwegian Krone (kr)' },
  { code: 'SEK', label: 'SEK — Swedish Krona (kr)' },
  { code: 'DKK', label: 'DKK — Danish Krone (kr)' },
  { code: 'NZD', label: 'NZD — New Zealand Dollar (NZ$)' },
  { code: 'ZAR', label: 'ZAR — South African Rand (R)' },
  { code: 'AED', label: 'AED — UAE Dirham (د.إ)' },
  { code: 'SAR', label: 'SAR — Saudi Riyal (﷼)' },
  { code: 'ILS', label: 'ILS — Israeli Shekel (₪)' },
  { code: 'TRY', label: 'TRY — Turkish Lira (₺)' },
  { code: 'RUB', label: 'RUB — Russian Ruble (₽)' },
  { code: 'PLN', label: 'PLN — Polish Zloty (zł)' },
  { code: 'CZK', label: 'CZK — Czech Koruna (Kč)' },
  { code: 'HUF', label: 'HUF — Hungarian Forint (Ft)' },
  { code: 'PHP', label: 'PHP — Philippine Peso (₱)' },
  { code: 'THB', label: 'THB — Thai Baht (฿)' },
  { code: 'MYR', label: 'MYR — Malaysian Ringgit (RM)' },
  { code: 'NGN', label: 'NGN — Nigerian Naira (₦)' },
  { code: 'GHS', label: 'GHS — Ghanaian Cedi (₵)' },
  { code: 'KES', label: 'KES — Kenyan Shilling (KSh)' },
];

const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Andorra','Angola','Argentina','Armenia',
  'Australia','Austria','Azerbaijan','Bahamas','Bahrain','Bangladesh',
  'Belarus','Belgium','Belize','Bolivia','Bosnia and Herzegovina','Botswana',
  'Brazil','Brunei','Bulgaria','Cambodia','Cameroon','Canada','Chile',
  'China','Colombia','Costa Rica','Croatia','Cuba','Cyprus','Czech Republic',
  'Denmark','Dominican Republic','Ecuador','Egypt','El Salvador','Estonia',
  'Ethiopia','Fiji','Finland','France','Georgia','Germany','Ghana','Greece',
  'Guatemala','Honduras','Hungary','Iceland','India','Indonesia','Iran','Iraq',
  'Ireland','Israel','Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya',
  'Kuwait','Kyrgyzstan','Latvia','Lebanon','Libya','Liechtenstein','Lithuania',
  'Luxembourg','Madagascar','Malaysia','Maldives','Malta','Mauritius','Mexico',
  'Moldova','Monaco','Mongolia','Morocco','Mozambique','Myanmar','Namibia',
  'Nepal','Netherlands','New Zealand','Nicaragua','Nigeria','North Macedonia',
  'Norway','Oman','Pakistan','Panama','Paraguay','Peru','Philippines','Poland',
  'Portugal','Qatar','Romania','Russia','Rwanda','Saudi Arabia','Senegal',
  'Serbia','Singapore','Slovakia','Slovenia','South Africa','South Korea',
  'Spain','Sri Lanka','Sudan','Sweden','Switzerland','Taiwan','Tanzania',
  'Thailand','Tunisia','Turkey','Uganda','Ukraine','United Arab Emirates',
  'United Kingdom','United States','Uruguay','Uzbekistan','Venezuela',
  'Vietnam','Yemen','Zambia','Zimbabwe',
];

const generateIconUrl = sharedGenerateIconUrl;

const syncPublicProfile = async (userData) => {
  if (!userData?.id || !userData?.username || !userData?.full_name) return;
  try {
    const existing = await PublicProfile.filter({ user_id: { eq: userData.id } });
    const payload = {
      user_id: userData.id,
      username: userData.username,
      full_name: userData.full_name,
      profile_picture_url: userData.profile_picture_url || '',
    };
    if (existing?.length > 0) {
      await PublicProfile.update(existing[0].id, payload);
    } else {
      await PublicProfile.create(payload);
    }
  } catch (e) { console.error('syncPublicProfile:', e); }
};

export default function ProfilePopup({ onClose }) {
  const { logout } = useAuth();
  const [userData, setUserData]   = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setSaving]     = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const fileInputRef = useRef(null);
  const pickerRef    = useRef(null);

  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    phone: '',
    location: '',
    currency: 'USD',
    profile_picture_url: '',
  });

  useEffect(() => { loadUser(); }, []);

  // Close icon picker when clicking outside
  useEffect(() => {
    if (!showIconPicker) return;
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowIconPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showIconPicker]);

  const loadUser = async () => {
    setIsLoading(true);
    try {
      const u = await User.me();
      const { data: authData } = await supabase.auth.getUser();
      const meta = authData?.user?.user_metadata || {};
      setUserData(u);
      setFormData({
        full_name: u.full_name || '',
        username: u.username || '',
        phone: u.phone || '',
        location: u.location || meta.location || '',
        currency: meta.currency || 'USD',
        profile_picture_url: u.profile_picture_url || '',
      });
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const checkUsernameAvailability = async (username) => {
    if (!username || username === userData?.username) { setUsernameError(null); return true; }
    if (username.length < 3) { setUsernameError("Must be at least 3 characters"); return false; }
    if (!/^[a-zA-Z0-9_.]+$/.test(username)) { setUsernameError("Letters, numbers, _ and . only"); return false; }
    setIsCheckingUsername(true);
    try {
      const profiles = await PublicProfile.filter({ username: { eq: username } });
      const taken = profiles?.some(p => p.user_id !== userData?.id);
      if (taken) { setUsernameError("This username is already taken"); setIsCheckingUsername(false); return false; }
      setUsernameError(null); setIsCheckingUsername(false); return true;
    } catch { setUsernameError(null); setIsCheckingUsername(false); return true; }
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'username') {
      if (handleFieldChange._t) clearTimeout(handleFieldChange._t);
      handleFieldChange._t = setTimeout(() => checkUsernameAvailability(value), 500);
    }
  };

  const handleIconSelect = async (icon) => {
    const url = generateIconUrl(icon);
    setFormData(prev => ({ ...prev, profile_picture_url: url }));
    setShowIconPicker(false);
    // Immediately save the avatar
    setSaving(true);
    try {
      await User.updateMyUserData({ profile_picture_url: url });
      await syncPublicProfile({ ...userData, profile_picture_url: url });
      window.dispatchEvent(new Event('profileUpdated'));
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSaving(true);
    setShowIconPicker(false);
    try {
      const { file_url } = await UploadFile({ file, userId: userData?.id });
      setFormData(prev => ({ ...prev, profile_picture_url: file_url }));
      await User.updateMyUserData({ profile_picture_url: file_url });
      await syncPublicProfile({ ...userData, profile_picture_url: file_url });
      window.dispatchEvent(new Event('profileUpdated'));
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleSave = async () => {
    const ok = await checkUsernameAvailability(formData.username);
    if (!ok && formData.username !== userData?.username) return;
    setSaving(true);
    try {
      await User.updateMyUserData({
        username: formData.username,
        phone: formData.phone,
        location: formData.location,
        profile_picture_url: formData.profile_picture_url,
      });
      await supabase.auth.updateUser({ data: { location: formData.location, currency: formData.currency } });
      await syncPublicProfile({ ...userData, ...formData });
      window.dispatchEvent(new Event('profileUpdated'));
      await loadUser();
      setIsEditing(false);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setUsernameError(null);
    if (userData) {
      setFormData({
        full_name: userData.full_name || '',
        username: userData.username || '',
        phone: userData.phone || '',
        location: userData.location || '',
        currency: 'USD',
        profile_picture_url: userData.profile_picture_url || '',
      });
    }
  };

  /* ── Shared field styles (match onboarding) ── */
  const labelStyle = {
    display: 'block', fontSize: 13, fontWeight: 600, color: '#1A1918',
    marginBottom: 6, fontFamily: "'DM Sans', sans-serif",
  };
  const inputBase = {
    width: '100%', padding: '10px 13px', fontSize: 14,
    fontFamily: "'DM Sans', sans-serif", color: '#1A1918',
    border: '1px solid #D4D2CF', borderRadius: 8,
    outline: 'none', transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  };
  const inputActive = { ...inputBase, background: '#ffffff' };
  const inputDisabled = { ...inputBase, background: '#F0EFEC', color: '#9B9A98', cursor: 'default', border: '1px solid #E0DEDB' };
  const selectStyle = { ...inputActive, appearance: 'none', WebkitAppearance: 'none', paddingRight: 36, cursor: isEditing ? 'pointer' : 'default' };
  const selectDisabledStyle = { ...inputDisabled, appearance: 'none', WebkitAppearance: 'none', paddingRight: 36 };

  const SelectField = ({ value, onChange, children, disabled }) => (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        style={disabled ? selectDisabledStyle : selectStyle}
        onFocus={e => { if (!disabled) e.target.style.borderColor = '#1A1918'; }}
        onBlur={e => { if (!disabled) e.target.style.borderColor = '#D4D2CF'; }}
      >
        {children}
      </select>
      <ChevronDown size={14} style={{
        position: 'absolute', right: 12, top: '50%',
        transform: 'translateY(-50%)', pointerEvents: 'none',
        color: disabled ? '#B0AEA8' : '#787776',
      }} />
    </div>
  );

  if (isLoading) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.18)' }}>
      <Loader2 size={24} style={{ color: '#54A6CF', animation: 'spin 1s linear infinite' }} />
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 490, background: 'rgba(0,0,0,0.18)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 491,
        background: '#FEFEFE',
        borderRadius: 4,
        boxShadow: '5px 4px 18px rgba(0,0,0,0.14), -1px 0 0 rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.06), 0 12px 40px rgba(0,0,0,0.12)',
        width: '100%', maxWidth: 500,
        maxHeight: '88vh', overflowY: 'auto',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 14,
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2,
          }}
        >
          <X size={14} style={{ color: '#787776' }} />
        </button>

        {/* ── Profile hero ── */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 10, padding: '36px 28px 24px',
          borderBottom: '1px solid rgba(0,0,0,0.07)',
        }}>
          {/* Avatar + pencil badge */}
          <div style={{ position: 'relative', display: 'inline-block' }} ref={pickerRef}>
            <UserAvatar
              name={formData.full_name || userData?.username}
              src={formData.profile_picture_url}
              size={88}
              style={{ border: '3px solid white', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', display: 'block' }}
            />
            {/* Pencil badge */}
            <button
              onClick={() => setShowIconPicker(v => !v)}
              disabled={isSaving}
              style={{
                position: 'absolute', bottom: 2, right: 2,
                width: 28, height: 28, borderRadius: '50%',
                background: 'white',
                border: '1.5px solid rgba(0,0,0,0.10)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.14)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              {isSaving
                ? <Loader2 size={12} style={{ color: '#787776', animation: 'spin 1s linear infinite' }} />
                : <Pencil size={12} style={{ color: '#1A1918' }} />
              }
            </button>

            {/* Icon picker dropdown */}
            {showIconPicker && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 10px)', left: '50%',
                transform: 'translateX(-50%)',
                background: '#FEFEFE',
                borderRadius: 10,
                boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)',
                border: '1px solid rgba(0,0,0,0.07)',
                padding: 12,
                zIndex: 10,
                width: 260,
              }}>
                {/* Upload option */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '8px 10px', borderRadius: 6,
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 12, color: '#1A1918', fontFamily: "'DM Sans', sans-serif",
                    marginBottom: 8, borderBottom: '1px solid rgba(0,0,0,0.07)',
                    paddingBottom: 10,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <Image size={13} style={{ color: '#787776' }} /> Upload a photo
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" style={{ display: 'none' }} />

                {/* Icon grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  gap: 6,
                  maxHeight: 180, overflowY: 'auto',
                }}>
                  {ICON_OPTIONS.map(icon => (
                    <button
                      key={icon.id}
                      type="button"
                      onClick={() => handleIconSelect(icon)}
                      title={icon.id}
                      style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: icon.bg,
                        border: '2px solid transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'transform 0.1s',
                        padding: 0,
                        overflow: 'hidden',
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <div
                        style={{ width: '100%', height: '100%', display: 'flex', pointerEvents: 'none' }}
                        dangerouslySetInnerHTML={{ __html: iconInnerSvg(icon) }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.02em' }}>
              {formData.full_name || userData?.username}
            </div>
            <div style={{ fontSize: 12, color: '#9B9A98', marginTop: 2 }}>
              @{formData.username || '—'}
            </div>
          </div>
        </div>

        {/* ── Form section ── */}
        <div style={{ padding: '22px 28px 0' }}>

          {/* Edit / Save row */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18, gap: 8 }}>
            {isEditing ? (
              <>
                <button onClick={handleCancel} style={{
                  padding: '7px 14px', borderRadius: 8, border: '1px solid #D4D2CF',
                  background: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  color: '#787776', fontFamily: "'DM Sans', sans-serif",
                }}>Cancel</button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || isCheckingUsername || !!usernameError}
                  style={{
                    padding: '7px 16px', borderRadius: 8, border: 'none',
                    background: (isSaving || isCheckingUsername || usernameError) ? '#C8C6C2' : '#1A1918',
                    color: 'white', fontSize: 12, fontWeight: 600,
                    cursor: (isSaving || isCheckingUsername || usernameError) ? 'not-allowed' : 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {isSaving && <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />}
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} style={{
                padding: '7px 16px', borderRadius: 8, border: '1px solid #D4D2CF',
                background: 'white', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', color: '#1A1918', fontFamily: "'DM Sans', sans-serif",
              }}>Edit</button>
            )}
          </div>

          {/* Fields grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Full Name */}
            <div>
              <label style={labelStyle}>Full Name</label>
              <input value={formData.full_name} readOnly tabIndex={-1} style={inputDisabled} />
            </div>

            {/* Email */}
            <div>
              <label style={labelStyle}>Email Address</label>
              <input value={userData?.email || ''} readOnly tabIndex={-1} style={inputDisabled} />
            </div>

            {/* Username | Currency — side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Username</label>
                <input
                  value={formData.username}
                  onChange={e => handleFieldChange('username', e.target.value.toLowerCase())}
                  disabled={!isEditing}
                  style={{
                    ...(isEditing ? inputActive : inputDisabled),
                    borderColor: usernameError ? '#E8726E' : (isEditing ? '#D4D2CF' : '#E0DEDB'),
                  }}
                  onFocus={e => { if (isEditing) e.target.style.borderColor = usernameError ? '#E8726E' : '#1A1918'; }}
                  onBlur={e => { if (isEditing) e.target.style.borderColor = usernameError ? '#E8726E' : '#D4D2CF'; }}
                />
                {isCheckingUsername && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <Loader2 size={10} style={{ color: '#787776', animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: 10, color: '#787776' }}>Checking...</span>
                  </div>
                )}
                {usernameError && <p style={{ fontSize: 10, color: '#E8726E', margin: '4px 0 0' }}>{usernameError}</p>}
                {isEditing && !usernameError && formData.username && formData.username.length >= 3 && !isCheckingUsername && formData.username !== userData?.username && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <CheckCircle size={10} style={{ color: '#16A34A' }} />
                    <span style={{ fontSize: 10, color: '#16A34A' }}>Available</span>
                  </div>
                )}
              </div>

              <div>
                <label style={labelStyle}>Currency</label>
                <SelectField value={formData.currency} onChange={v => handleFieldChange('currency', v)} disabled={!isEditing}>
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                </SelectField>
              </div>
            </div>

            {/* Phone */}
            <div>
              <label style={labelStyle}>Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => handleFieldChange('phone', e.target.value)}
                disabled={!isEditing}
                placeholder="Enter your phone number"
                style={isEditing ? inputActive : inputDisabled}
                onFocus={e => { if (isEditing) e.target.style.borderColor = '#1A1918'; }}
                onBlur={e => { if (isEditing) e.target.style.borderColor = '#D4D2CF'; }}
              />
            </div>

            {/* Location */}
            <div>
              <label style={labelStyle}>Location</label>
              <SelectField value={formData.location} onChange={v => handleFieldChange('location', v)} disabled={!isEditing}>
                <option value="">Select country</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </SelectField>
            </div>

          </div>

          {/* ── Bank Account box ── */}
          <div style={{
            marginTop: 24,
            background: '#FEFEFE',
            borderRadius: 4,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.06)',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '13px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Landmark size={13} style={{ color: '#787776' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1918', fontFamily: "'DM Sans', sans-serif" }}>Bank Account</span>
            </div>
            <div style={{ padding: '14px 16px' }}>
              <p style={{ fontSize: 12, color: '#787776', margin: '0 0 12px', lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>
                Securely connect your bank to enable direct transfers. Powered by Plaid and Dwolla.
              </p>
              <button
                onClick={() => setShowBankModal(true)}
                style={{
                  width: '100%', padding: '10px 0', borderRadius: 8, border: 'none',
                  background: '#54A6CF', color: 'white',
                  fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Landmark size={14} />
                Connect Bank Account
              </button>
            </div>
          </div>

          {/* Log out + footer */}
          <div style={{ padding: '20px 0 24px', textAlign: 'center' }}>
            <button
              onClick={async () => { onClose(); await logout?.(); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif",
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#E8726E'}
              onMouseLeave={e => e.currentTarget.style.color = '#9B9A98'}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Log out
            </button>
          </div>

          {/* Legal footer */}
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.07)', padding: '14px 0 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Terms of Service', href: 'https://www.vony-lending.com/terms' },
              { label: 'Privacy Center', href: 'https://www.vony-lending.com/privacy' },
            ].map(l => (
              <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11, color: '#9B9A98', textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}
                onMouseEnter={e => e.target.style.color = '#1A1918'}
                onMouseLeave={e => e.target.style.color = '#9B9A98'}
              >{l.label}</a>
            ))}
          </div>
        </div>
      </div>

      {/* Bank Account "Coming Soon" modal */}
      {showBankModal && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,0.25)' }} onClick={() => setShowBankModal(false)} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            zIndex: 601, background: '#FEFEFE', borderRadius: 4,
            boxShadow: '5px 4px 18px rgba(0,0,0,0.14), 0 12px 40px rgba(0,0,0,0.12)',
            maxWidth: 380, width: '100%', padding: '32px 28px',
            textAlign: 'center', fontFamily: "'DM Sans', sans-serif",
          }}>
            <div style={{ width: 48, height: 48, borderRadius: 10, background: 'rgba(84,166,207,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Landmark size={24} style={{ color: '#54A6CF' }} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A1918', margin: '0 0 8px', letterSpacing: '-0.02em' }}>Coming Soon</h3>
            <p style={{ fontSize: 13, color: '#787776', margin: '0 0 6px', lineHeight: 1.6 }}>
              Bank connections via Plaid and Dwolla are coming soon to enable secure bank transfers directly through Vony.
            </p>
            <p style={{ fontSize: 12, color: '#9B9A98', margin: '0 0 24px', lineHeight: 1.6 }}>
              In the meantime, use Venmo, Cash App, PayPal, or Zelle for payments.
            </p>
            <button onClick={() => setShowBankModal(false)} style={{
              width: '100%', padding: '12px 0', borderRadius: 8, border: 'none',
              background: '#54A6CF', color: 'white',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            }}>Got it</button>
          </div>
        </>
      )}
    </>
  );
}

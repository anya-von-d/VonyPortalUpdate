import React, { useState, useEffect } from "react";
import { User, PublicProfile } from "@/entities/all";
import { supabase } from "@/lib/supabaseClient";
import { CheckCircle, Loader2, ChevronDown } from "lucide-react";

// Grain overlays — match Layout.jsx portal texture
const GRAIN_FINE = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>')}")`;
const GRAIN_FIBRE = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><filter id="f"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.96  0 0 0 0 0.94  0 0 0 0 0.90  0 0 0 0.35 0"/></filter><rect width="100%" height="100%" filter="url(#f)"/></svg>')}")`;

const CARD_WIDTH = 420;

// ── Profile icon palette ───────────────────────────────────────────────────
const ICON_OPTIONS = [
  { id: 'bear',      emoji: '🐻', bg: '#E8A87C' },
  { id: 'fox',       emoji: '🦊', bg: '#F4A261' },
  { id: 'lion',      emoji: '🦁', bg: '#E9C46A' },
  { id: 'tiger',     emoji: '🐯', bg: '#F4965C' },
  { id: 'wolf',      emoji: '🐺', bg: '#8FA8C8' },
  { id: 'cat',       emoji: '🐱', bg: '#C38D9E' },
  { id: 'dog',       emoji: '🐶', bg: '#D4A373' },
  { id: 'koala',     emoji: '🐨', bg: '#A5B4C3' },
  { id: 'panda',     emoji: '🐼', bg: '#9EC5AB' },
  { id: 'rabbit',    emoji: '🐰', bg: '#B084CC' },
  { id: 'frog',      emoji: '🐸', bg: '#85B79D' },
  { id: 'owl',       emoji: '🦉', bg: '#6C8EBF' },
  { id: 'penguin',   emoji: '🐧', bg: '#7EC1EC' },
  { id: 'flamingo',  emoji: '🦩', bg: '#F4A8B7' },
  { id: 'eagle',     emoji: '🦅', bg: '#C9A84C' },
  { id: 'unicorn',   emoji: '🦄', bg: '#D4AEDD' },
  { id: 'dolphin',   emoji: '🐬', bg: '#54A6CF' },
  { id: 'butterfly', emoji: '🦋', bg: '#B9A0D4' },
  { id: 'moon',      emoji: '🌙', bg: '#6C8EBF' },
  { id: 'star',      emoji: '⭐', bg: '#F4B942' },
  { id: 'wave',      emoji: '🌊', bg: '#3A9BDC' },
  { id: 'fire',      emoji: '🔥', bg: '#E8726E' },
  { id: 'plant',     emoji: '🌿', bg: '#5CB87A' },
  { id: 'rose',      emoji: '🌹', bg: '#D97C8A' },
  { id: 'gem',       emoji: '💎', bg: '#5BA4CF' },
  { id: 'rocket',    emoji: '🚀', bg: '#4A5568' },
  { id: 'music',     emoji: '🎵', bg: '#9B7FCA' },
  { id: 'art',       emoji: '🎨', bg: '#E67E22' },
  { id: 'target',    emoji: '🎯', bg: '#E85555' },
  { id: 'coffee',    emoji: '☕', bg: '#9B7651' },
];

// ── Country list ─────────────────────────────────────────────────────────────
const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda',
  'Argentina','Armenia','Australia','Austria','Azerbaijan','Bahamas','Bahrain',
  'Bangladesh','Barbados','Belarus','Belgium','Belize','Benin','Bhutan',
  'Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria',
  'Burkina Faso','Burundi','Cambodia','Cameroon','Canada','Cape Verde',
  'Central African Republic','Chad','Chile','China','Colombia','Comoros',
  'Congo','Costa Rica','Croatia','Cuba','Cyprus','Czech Republic','Denmark',
  'Djibouti','Dominica','Dominican Republic','Ecuador','Egypt',
  'El Salvador','Equatorial Guinea','Eritrea','Estonia','Eswatini','Ethiopia',
  'Fiji','Finland','France','Gabon','Gambia','Georgia','Germany','Ghana',
  'Greece','Grenada','Guatemala','Guinea','Guinea-Bissau','Guyana','Haiti',
  'Honduras','Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland',
  'Israel','Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kuwait',
  'Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho','Liberia','Libya',
  'Liechtenstein','Lithuania','Luxembourg','Madagascar','Malawi','Malaysia',
  'Maldives','Mali','Malta','Marshall Islands','Mauritania','Mauritius',
  'Mexico','Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique',
  'Myanmar','Namibia','Nepal','Netherlands','New Zealand','Nicaragua',
  'Niger','Nigeria','North Korea','North Macedonia','Norway','Oman',
  'Pakistan','Panama','Papua New Guinea','Paraguay','Peru','Philippines',
  'Poland','Portugal','Qatar','Romania','Russia','Rwanda',
  'Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines',
  'Samoa','San Marino','Saudi Arabia','Senegal','Serbia','Seychelles',
  'Sierra Leone','Singapore','Slovakia','Slovenia','Solomon Islands','Somalia',
  'South Africa','South Korea','South Sudan','Spain','Sri Lanka','Sudan',
  'Suriname','Sweden','Switzerland','Syria','Taiwan','Tajikistan','Tanzania',
  'Thailand','Timor-Leste','Togo','Tonga','Trinidad and Tobago','Tunisia',
  'Turkey','Turkmenistan','Tuvalu','Uganda','Ukraine','United Arab Emirates',
  'United Kingdom','United States','Uruguay','Uzbekistan','Vanuatu',
  'Vatican City','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe',
];

// ── Currency list ─────────────────────────────────────────────────────────────
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
  { code: 'IDR', label: 'IDR — Indonesian Rupiah (Rp)' },
  { code: 'NGN', label: 'NGN — Nigerian Naira (₦)' },
  { code: 'GHS', label: 'GHS — Ghanaian Cedi (₵)' },
  { code: 'KES', label: 'KES — Kenyan Shilling (KSh)' },
];

// ── Terms of service items ────────────────────────────────────────────────────
const TERMS = [
  "I understand that I am responsible for reviewing and agreeing to the terms of any loan I create or accept on Vony.",
  "I understand that using Vony for any illegal or fraudulent activity is strictly prohibited.",
  "I understand that Vony is not a bank or financial institution, and does not guarantee repayment of any loan.",
  "I understand that Vony provides tools for agreements and tracking, but is not liable for disputes between users.",
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const generateIconUrl = (icon) => {
  if (!icon) return null;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><circle cx="64" cy="64" r="64" fill="${icon.bg}"/><text x="64" y="75" dominant-baseline="middle" text-anchor="middle" font-size="60" font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif">${icon.emoji}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function OnboardingModal({ user, onComplete }) {
  const [step, setStep] = useState(1);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 600);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState(null);

  // Step 3 terms state — which are checked, and whether to show validation errors
  const [termsChecked, setTermsChecked] = useState(TERMS.map(() => false));
  const [termsErrorShown, setTermsErrorShown] = useState(false);

  const [formData, setFormData] = useState({
    full_name: user?.user_metadata?.full_name || '',
    email: user?.email || '',
    phone: '',
    location: '',
    username: '',
    currency: 'USD',
    selectedIcon: null,
  });

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 600);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const checkUsernameAvailability = async (username) => {
    if (!username || username.length < 3) {
      setUsernameError(username ? "Username must be at least 3 characters" : null);
      return false;
    }
    if (!/^[a-zA-Z0-9_.]+$/.test(username)) {
      setUsernameError("Only letters, numbers, underscores and dots");
      return false;
    }
    setIsCheckingUsername(true);
    try {
      const profiles = await PublicProfile.filter({ username: { eq: username } });
      if (profiles && profiles.length > 0) {
        setUsernameError("This username is already taken");
        setIsCheckingUsername(false);
        return false;
      }
      setUsernameError(null);
      setIsCheckingUsername(false);
      return true;
    } catch {
      setUsernameError(null);
      setIsCheckingUsername(false);
      return true;
    }
  };

  const handleUsernameChange = (value) => {
    set('username', value.toLowerCase());
    if (handleUsernameChange._t) clearTimeout(handleUsernameChange._t);
    handleUsernameChange._t = setTimeout(() => checkUsernameAvailability(value.toLowerCase()), 500);
  };

  // ── Step handlers ────────────────────────────────────────────────────────────
  const handleStep1Continue = (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) { alert("Please enter your full name"); return; }
    if (!formData.phone.trim()) { alert("Please enter your phone number"); return; }
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStep2Continue = async (e) => {
    e.preventDefault();
    if (!formData.username.trim()) { alert("Please choose a username"); return; }
    // Final username check if not yet verified
    if (isCheckingUsername) return;
    if (usernameError) return;
    if (formData.username.length < 3) { setUsernameError("Username must be at least 3 characters"); return; }
    const ok = await checkUsernameAvailability(formData.username);
    if (!ok) return;
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStep3Submit = async (e) => {
    e.preventDefault();
    // Validate all terms checked
    const allChecked = termsChecked.every(Boolean);
    if (!allChecked) {
      setTermsErrorShown(true);
      return;
    }
    setIsSubmitting(true);
    try {
      await User.updateMyUserData({
        full_name: formData.full_name.trim(),
        username: formData.username.trim().toLowerCase(),
        phone: formData.phone.trim(),
      });
      await supabase.auth.updateUser({
        data: {
          location: formData.location,
          currency: formData.currency,
        }
      });
      const avatarUrl = formData.selectedIcon
        ? generateIconUrl(formData.selectedIcon)
        : (user?.user_metadata?.avatar_url ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.full_name.trim())}&background=54A6CF&color=fff&size=128`);
      const publicProfileData = {
        user_id: user.id,
        username: formData.username.trim().toLowerCase(),
        full_name: formData.full_name.trim(),
        profile_picture_url: avatarUrl,
      };
      const existing = await PublicProfile.filter({ user_id: { eq: user.id } });
      if (existing && existing.length > 0) {
        await PublicProfile.update(existing[0].id, publicProfileData);
      } else {
        await PublicProfile.create(publicProfileData);
      }
      onComplete();
    } catch (error) {
      console.error("Error saving profile:", error);
      alert(`Failed to save profile: ${error.message || 'Please try again.'}`);
    }
    setIsSubmitting(false);
  };

  const toggleTerm = (idx) => {
    setTermsChecked(prev => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
    // Clear error highlight once user starts checking
    if (termsErrorShown) setTermsErrorShown(false);
  };

  /* ── Shared styles ─────────────────────────────────────────────────────────── */
  const labelStyle = {
    display: 'block',
    fontSize: 13, fontWeight: 600, color: '#1A1918',
    marginBottom: 6, fontFamily: "'DM Sans', sans-serif",
  };
  const inputStyle = {
    width: '100%', padding: '10px 13px',
    fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: '#1A1918',
    background: '#ffffff', border: '1px solid #D4D2CF', borderRadius: 8,
    outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box',
  };
  const disabledInputStyle = {
    ...inputStyle, background: '#F0EFEC', color: '#9B9A98',
    cursor: 'not-allowed', border: '1px solid #E0DEDB',
  };
  const selectStyle = {
    ...inputStyle,
    appearance: 'none', WebkitAppearance: 'none',
    paddingRight: 36, cursor: 'pointer',
  };

  /* ── Sub-components ─────────────────────────────────────────────────────────── */
  const SelectField = ({ value, onChange, children, placeholder }) => (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={selectStyle}
        onFocus={e => e.target.style.borderColor = '#1A1918'}
        onBlur={e => e.target.style.borderColor = '#D4D2CF'}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {children}
      </select>
      <ChevronDown size={14} style={{
        position: 'absolute', right: 12, top: '50%',
        transform: 'translateY(-50%)', pointerEvents: 'none', color: '#787776',
      }} />
    </div>
  );

  /* Post-it — same on all 3 steps */
  const PostIt = () => (
    <div style={{
      position: 'relative', width: '100%', maxWidth: CARD_WIDTH,
      filter: 'drop-shadow(3px 5px 10px rgba(0,0,0,0.18))',
      transform: 'rotate(-1deg)',
    }}>
      <svg viewBox="0 0 420 96" preserveAspectRatio="none"
        style={{ display: 'block', width: '100%', height: 96 }}>
        <defs>
          <linearGradient id="postitGrad2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#7EC1EC" />
            <stop offset="100%" stopColor="#54A6CF" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="420" height="96" fill="url(#postitGrad2)" />
        <rect x="0" y="0" width="420" height="4" fill="rgba(255,255,255,0.35)" />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 28, fontWeight: 600, color: '#1A1918',
          margin: 0, letterSpacing: '-0.01em', lineHeight: 1.15, textAlign: 'center',
        }}>Welcome to Vony</h1>
      </div>
    </div>
  );

  /* Dark Continue button (steps 1 & 2) */
  const ContinueBtn = ({ form, disabled }) => (
    <button
      type="submit"
      form={form}
      disabled={disabled}
      style={{
        width: '100%', maxWidth: CARD_WIDTH,
        padding: '14px 0', borderRadius: 10, border: 'none',
        fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
        background: disabled ? '#C8C6C2' : '#1A1918',
        color: 'white', cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.15s',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
      }}
    >
      Continue
    </button>
  );

  /* Blue Create Account button (step 3) */
  const CreateAccountBtn = ({ form, disabled, loading }) => (
    <button
      type="submit"
      form={form}
      disabled={disabled}
      style={{
        width: '100%', maxWidth: CARD_WIDTH,
        padding: '14px 0', borderRadius: 10, border: 'none',
        fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
        background: disabled ? '#A8CBDF' : '#54A6CF',
        color: 'white', cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.15s',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        boxShadow: '0 4px 18px rgba(84,166,207,0.35)',
      }}
    >
      {loading ? (
        <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Creating account...</>
      ) : 'Create Account'}
    </button>
  );

  /* Shared card wrapper */
  const Card = ({ children }) => (
    <div style={{
      width: '100%', maxWidth: CARD_WIDTH,
      background: '#FEFEFE', borderRadius: 4,
      boxShadow: '5px 4px 18px rgba(0,0,0,0.14), -1px 0 0 rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.06), 0 12px 40px rgba(0,0,0,0.12)',
    }}>
      {children}
    </div>
  );

  /* Card header */
  const CardHeader = ({ title, subtitle }) => (
    <div style={{ padding: '28px 28px 8px', textAlign: 'center' }}>
      <h2 style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: 28, fontWeight: 600, color: '#1A1918',
        margin: 0, letterSpacing: '-0.01em', lineHeight: 1.15,
      }}>{title}</h2>
      <p style={{ fontSize: 13, color: '#787776', margin: '6px 0 0', fontFamily: "'DM Sans', sans-serif" }}>
        {subtitle}
      </p>
    </div>
  );

  /* ── Render ─────────────────────────────────────────────────────────────────── */
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      overflowY: 'auto', fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Portal-matching background */}
      <div style={{ position: 'fixed', inset: 0, background: '#F5F4F0', zIndex: 0 }} />
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1,
        backgroundImage: GRAIN_FINE, backgroundSize: '180px 180px',
        mixBlendMode: 'multiply', opacity: 0.10,
      }} />
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1,
        backgroundImage: GRAIN_FIBRE, backgroundSize: '600px 600px',
        mixBlendMode: 'multiply', opacity: 0.20,
      }} />

      {/* Centered column */}
      <div style={{
        position: 'relative', zIndex: 2, minHeight: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '40px 16px', gap: 18,
      }}>

        <PostIt />

        {/* ════════════════════════ STEP 1 ════════════════════════ */}
        {step === 1 && (
          <>
            <Card>
              <CardHeader title="Create Your Account" subtitle="Let's get your profile set up" />
              <form id="step1-form" onSubmit={handleStep1Continue}
                style={{ padding: '14px 28px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

                <div>
                  <label style={labelStyle}>Full Name</label>
                  <input value={formData.full_name} onChange={e => set('full_name', e.target.value)}
                    placeholder="Enter your full name" required style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#1A1918'}
                    onBlur={e => e.target.style.borderColor = '#D4D2CF'} />
                </div>

                <div>
                  <label style={labelStyle}>Email Address</label>
                  <input value={formData.email} readOnly tabIndex={-1} style={disabledInputStyle} />
                </div>

                <div>
                  <label style={labelStyle}>Location</label>
                  <SelectField value={formData.location} onChange={v => set('location', v)} placeholder="Select your country">
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </SelectField>
                </div>

                <div>
                  <label style={labelStyle}>Phone Number</label>
                  <input type="tel" value={formData.phone} onChange={e => set('phone', e.target.value)}
                    placeholder="Enter your phone number" required style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#1A1918'}
                    onBlur={e => e.target.style.borderColor = '#D4D2CF'} />
                </div>
              </form>
            </Card>
            <ContinueBtn form="step1-form" disabled={false} />
          </>
        )}

        {/* ════════════════════════ STEP 2 ════════════════════════ */}
        {step === 2 && (
          <>
            <Card>
              <CardHeader title="Customize Your Account" subtitle="Make it feel like yours" />
              <form id="step2-form" onSubmit={handleStep2Continue}
                style={{ padding: '14px 28px 28px', display: 'flex', flexDirection: 'column', gap: 22 }}>

                {/* Profile icon picker */}
                <div>
                  <label style={labelStyle}>Pick your profile icon</label>
                  <div style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'center' : 'flex-start',
                    gap: 14,
                  }}>
                    {/* Preview circle */}
                    <div style={{
                      width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
                      background: formData.selectedIcon ? formData.selectedIcon.bg : '#D4D2CF',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 38, lineHeight: 1,
                      border: '2px solid rgba(0,0,0,0.08)',
                      transition: 'background 0.2s',
                    }}>
                      {formData.selectedIcon ? formData.selectedIcon.emoji : ''}
                    </div>

                    {/* Scrollable icon grid */}
                    <div style={{
                      flex: 1, width: isMobile ? '100%' : undefined,
                      border: '1px solid #D4D2CF', borderRadius: 8, background: '#FAFAF9',
                      padding: 10, maxHeight: 160, overflowY: 'auto', overflowX: 'hidden',
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(42px, 1fr))', gap: 6 }}>
                        {ICON_OPTIONS.map(icon => {
                          const isSelected = formData.selectedIcon?.id === icon.id;
                          return (
                            <button key={icon.id} type="button"
                              onClick={() => set('selectedIcon', isSelected ? null : icon)}
                              title={icon.id}
                              style={{
                                width: 42, height: 42, borderRadius: '50%',
                                background: icon.bg,
                                border: isSelected ? '2.5px solid #1A1918' : '2.5px solid transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 22, lineHeight: 1, cursor: 'pointer',
                                transition: 'border-color 0.12s, transform 0.12s',
                                transform: isSelected ? 'scale(1.12)' : 'scale(1)',
                                boxSizing: 'border-box',
                              }}
                            >
                              {icon.emoji}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label style={labelStyle}>Username</label>
                  <input value={formData.username} onChange={e => handleUsernameChange(e.target.value)}
                    placeholder="Choose a unique username" required
                    style={{ ...inputStyle, borderColor: usernameError ? '#E8726E' : '#D4D2CF' }}
                    onFocus={e => e.target.style.borderColor = usernameError ? '#E8726E' : '#1A1918'}
                    onBlur={e => e.target.style.borderColor = usernameError ? '#E8726E' : '#D4D2CF'} />
                  {isCheckingUsername && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5 }}>
                      <Loader2 size={11} style={{ color: '#787776', animation: 'spin 1s linear infinite' }} />
                      <span style={{ fontSize: 11, color: '#787776' }}>Checking availability...</span>
                    </div>
                  )}
                  {usernameError && (
                    <p style={{ fontSize: 11, color: '#E8726E', margin: '5px 0 0' }}>{usernameError}</p>
                  )}
                  {!usernameError && formData.username && formData.username.length >= 3 && !isCheckingUsername && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5 }}>
                      <CheckCircle size={11} style={{ color: '#16A34A' }} />
                      <span style={{ fontSize: 11, color: '#16A34A' }}>Username is available</span>
                    </div>
                  )}
                </div>

                {/* Currency */}
                <div>
                  <label style={labelStyle}>Currency</label>
                  <SelectField value={formData.currency} onChange={v => set('currency', v)}>
                    {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </SelectField>
                </div>
              </form>
            </Card>
            <ContinueBtn form="step2-form" disabled={isCheckingUsername || !!usernameError} />
          </>
        )}

        {/* ════════════════════════ STEP 3 ════════════════════════ */}
        {step === 3 && (
          <>
            <Card>
              <CardHeader
                title="Accept Terms"
                subtitle="Please read and agree to the following terms before you continue"
              />

              <form id="step3-form" onSubmit={handleStep3Submit}
                style={{ padding: '14px 28px 0', display: 'flex', flexDirection: 'column', gap: 0 }}>

                {/* Terms checkboxes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 24 }}>
                  {TERMS.map((term, idx) => {
                    const checked = termsChecked[idx];
                    // Show red only on unchecked items after a failed submit attempt
                    const showError = termsErrorShown && !checked;
                    const circleColor = showError ? '#E8726E' : '#54A6CF';

                    return (
                      <div
                        key={idx}
                        onClick={() => toggleTerm(idx)}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 12,
                          cursor: 'pointer',
                          padding: '10px 12px',
                          borderRadius: 8,
                          background: showError
                            ? 'rgba(232,114,110,0.06)'
                            : checked ? 'rgba(84,166,207,0.06)' : 'rgba(0,0,0,0.02)',
                          border: `1px solid ${showError ? 'rgba(232,114,110,0.3)' : checked ? 'rgba(84,166,207,0.25)' : 'rgba(0,0,0,0.07)'}`,
                          transition: 'background 0.15s, border-color 0.15s',
                        }}
                      >
                        {/* Circle checkbox */}
                        <div style={{
                          flexShrink: 0,
                          width: 18, height: 18,
                          borderRadius: '50%',
                          marginTop: 1,
                          background: checked ? circleColor : `${circleColor}18`,
                          border: `1.5px solid ${circleColor}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'background 0.15s, border-color 0.15s',
                        }}>
                          {checked && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                              stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>

                        {/* Term text */}
                        <span style={{
                          fontSize: 13, lineHeight: 1.55,
                          fontFamily: "'DM Sans', sans-serif",
                          color: checked ? '#9B9A98' : '#1A1918',
                          transition: 'color 0.15s',
                        }}>
                          {term}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Terms of Service link — bottom of card, centered */}
                <div style={{
                  borderTop: '1px solid rgba(0,0,0,0.07)',
                  padding: '14px 0',
                  textAlign: 'center',
                }}>
                  <a
                    href="https://www.vony-lending.com/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{
                      fontSize: 11,
                      color: '#9B9A98',
                      fontFamily: "'DM Sans', sans-serif",
                      textDecoration: 'none',
                      transition: 'color 0.15s',
                      letterSpacing: '0.01em',
                    }}
                    onMouseEnter={e => e.target.style.color = '#1A1918'}
                    onMouseLeave={e => e.target.style.color = '#9B9A98'}
                  >
                    Terms of Service
                  </a>
                </div>
              </form>
            </Card>

            <CreateAccountBtn
              form="step3-form"
              disabled={isSubmitting}
              loading={isSubmitting}
            />
          </>
        )}

      </div>
    </div>
  );
}

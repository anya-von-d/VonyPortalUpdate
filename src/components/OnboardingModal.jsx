import React, { useState } from "react";
import { User, PublicProfile } from "@/entities/all";
import { CheckCircle, Loader2 } from "lucide-react";

export default function OnboardingModal({ user, onComplete }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState(null);
  const [formData, setFormData] = useState({
    full_name: user?.user_metadata?.full_name || '',
    email: user?.email || '',
    username: '',
    phone: ''
  });

  const checkUsernameAvailability = async (username) => {
    if (!username || username.length < 3) {
      setUsernameError(username ? "Username must be at least 3 characters" : null);
      return false;
    }
    if (!/^[a-zA-Z0-9_.]+$/.test(username)) {
      setUsernameError("Username can only contain letters, numbers, underscores, and dots");
      return false;
    }
    setIsCheckingUsername(true);
    try {
      const profiles = await PublicProfile.filter({ username: { eq: username } });
      if (profiles && profiles.length > 0) {
        setUsernameError("This username is already taken");
        setIsCheckingUsername(false);
        return false;
      } else {
        setUsernameError(null);
        setIsCheckingUsername(false);
        return true;
      }
    } catch (error) {
      console.error("Error checking username:", error);
      setUsernameError(null);
      setIsCheckingUsername(false);
      return true;
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'username') {
      if (handleInputChange.usernameCheckTimeout) clearTimeout(handleInputChange.usernameCheckTimeout);
      handleInputChange.usernameCheckTimeout = setTimeout(() => checkUsernameAvailability(value), 500);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) { alert("Please enter your full name"); return; }
    if (!formData.username.trim()) { alert("Please choose a username"); return; }
    if (!formData.phone.trim()) { alert("Please enter your phone number"); return; }
    const isUsernameAvailable = await checkUsernameAvailability(formData.username);
    if (!isUsernameAvailable) return;
    setIsSubmitting(true);
    try {
      await User.updateMyUserData({
        full_name: formData.full_name.trim(),
        username: formData.username.trim().toLowerCase(),
        phone: formData.phone.trim()
      });
      const publicProfileData = {
        user_id: user.id,
        username: formData.username.trim().toLowerCase(),
        full_name: formData.full_name.trim(),
        profile_picture_url: user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.full_name.trim())}&background=54A6CF&color=fff&size=128`
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

  /* ── Styles ── */
  const labelStyle = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#1A1918',
    marginBottom: 6,
    fontFamily: "'DM Sans', sans-serif",
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 13px',
    fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    color: '#1A1918',
    background: '#ffffff',
    border: '1px solid #D4D2CF',
    borderRadius: 8,
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  };

  const disabledInputStyle = {
    ...inputStyle,
    background: '#F0EFEC',
    color: '#9B9A98',
    cursor: 'not-allowed',
    border: '1px solid #E0DEDB',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Blurred VonyHomePage-style background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: '#F5F4F0',
        backgroundImage: "url('/images/tile.png.jpeg')",
        backgroundSize: '50px 50px',
        backgroundRepeat: 'repeat',
        filter: 'blur(2px)',
        transform: 'scale(1.04)',
      }} />
      {/* Subtle dark tint over the blur */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.18)' }} />

      {/* Modal — paper card style */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: '#FEFEFE',
        borderRadius: 4,
        boxShadow: '5px 4px 18px rgba(0,0,0,0.14), -1px 0 0 rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.06), 0 12px 40px rgba(0,0,0,0.12)',
        maxWidth: 420, width: '100%',
        maxHeight: '90vh', overflowY: 'auto',
      }}>

        {/* Header */}
        <div style={{ padding: '28px 28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
          <img
            src="/favicon.png"
            alt="Vony"
            style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover' }}
          />
          <div style={{ textAlign: 'center' }}>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 28, fontWeight: 600, color: '#1A1918',
              margin: 0, letterSpacing: '-0.01em', lineHeight: 1.15,
            }}>
              Welcome to Vony
            </h1>
            <p style={{ fontSize: 13, color: '#787776', margin: '5px 0 0', fontFamily: "'DM Sans', sans-serif" }}>
              Let's finish setting up your account
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '22px 28px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Full Name */}
          <div>
            <label style={labelStyle}>Full Name</label>
            <input
              value={formData.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              placeholder="Enter your full name"
              required
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#1A1918'}
              onBlur={e => e.target.style.borderColor = '#D4D2CF'}
            />
          </div>

          {/* Email — locked */}
          <div>
            <label style={labelStyle}>Email Address</label>
            <input
              value={formData.email}
              readOnly
              tabIndex={-1}
              style={disabledInputStyle}
            />
          </div>

          {/* Username */}
          <div>
            <label style={labelStyle}>Username</label>
            <input
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value.toLowerCase())}
              placeholder="Choose a unique username"
              required
              style={{
                ...inputStyle,
                borderColor: usernameError ? '#E8726E' : '#D4D2CF',
              }}
              onFocus={e => e.target.style.borderColor = usernameError ? '#E8726E' : '#1A1918'}
              onBlur={e => e.target.style.borderColor = usernameError ? '#E8726E' : '#D4D2CF'}
            />
            {isCheckingUsername && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5 }}>
                <Loader2 size={11} style={{ color: '#787776', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 11, color: '#787776', fontFamily: "'DM Sans', sans-serif" }}>Checking availability...</span>
              </div>
            )}
            {usernameError && (
              <p style={{ fontSize: 11, color: '#E8726E', marginTop: 5, fontFamily: "'DM Sans', sans-serif" }}>{usernameError}</p>
            )}
            {!usernameError && formData.username && formData.username.length >= 3 && !isCheckingUsername && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5 }}>
                <CheckCircle size={11} style={{ color: '#16A34A' }} />
                <span style={{ fontSize: 11, color: '#16A34A', fontFamily: "'DM Sans', sans-serif" }}>Username is available</span>
              </div>
            )}
          </div>

          {/* Phone — required */}
          <div>
            <label style={labelStyle}>Phone Number</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="Enter your phone number"
              required
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#1A1918'}
              onBlur={e => e.target.style.borderColor = '#D4D2CF'}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || isCheckingUsername || !!usernameError}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 8, border: 'none',
              fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
              background: (isSubmitting || isCheckingUsername || usernameError)
                ? '#C8C6C2'
                : '#1A1918',
              color: 'white',
              cursor: (isSubmitting || isCheckingUsername || usernameError) ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              marginTop: 4,
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                Creating account...
              </>
            ) : 'Create Your Account'}
          </button>

        </form>
      </div>
    </div>
  );
}

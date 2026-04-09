import React, { useState } from "react";
import { User, PublicProfile } from "@/entities/all";
import { User as UserIcon, Mail, Phone, AtSign, CheckCircle, Loader2 } from "lucide-react";

const SHADOW = '0px 50px 40px rgba(0,0,0,0.02), 0px 50px 40px rgba(0,0,0,0.04), 0px 20px 40px rgba(0,0,0,0.08), 0px 3px 10px rgba(0,0,0,0.12)';

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
    const isUsernameAvailable = await checkUsernameAvailability(formData.username);
    if (!isUsernameAvailable) return;
    setIsSubmitting(true);
    try {
      await User.updateMyUserData({
        full_name: formData.full_name.trim(),
        username: formData.username.trim().toLowerCase(),
        phone: formData.phone.trim() || null
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

  const inputStyle = {
    width: '100%', padding: '10px 14px', fontSize: 14,
    fontFamily: "'DM Sans', sans-serif", color: '#1A1918',
    background: '#F4F4F5', border: '1.5px solid rgba(0,0,0,0.08)',
    borderRadius: 10, outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 12, fontWeight: 600, color: '#787776',
    letterSpacing: '0.06em', textTransform: 'uppercase',
    marginBottom: 6, fontFamily: "'DM Sans', sans-serif",
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{
        background: '#F4F4F5', borderRadius: 20, maxWidth: 440, width: '100%',
        maxHeight: '90vh', overflowY: 'auto', boxShadow: SHADOW,
      }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <img
            src="/favicon.png"
            alt="Vony"
            style={{ width: 52, height: 52, borderRadius: 14, objectFit: 'cover' }}
          />
          <div style={{ textAlign: 'center' }}>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 32, fontWeight: 600, color: '#1A1918',
              margin: 0, letterSpacing: '-0.01em', lineHeight: 1.1,
            }}>
              Welcome to Vony
            </h1>
            <p style={{ fontSize: 13, color: '#787776', margin: '6px 0 0', fontFamily: "'DM Sans', sans-serif" }}>
              Let's finish setting up your account
            </p>
          </div>
        </div>

        {/* Form */}
        <div style={{ background: '#ffffff', margin: '16px 5px 5px', borderRadius: 14, padding: '20px 22px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Full Name */}
            <div>
              <div style={labelStyle}>
                <UserIcon size={12} color="#03ACEA" />
                Full Name
              </div>
              <input
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                placeholder="Enter your full name"
                required
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#03ACEA'}
                onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.08)'}
              />
            </div>

            {/* Email (read-only) */}
            <div>
              <div style={labelStyle}>
                <Mail size={12} color="#9B9A98" />
                Email Address
              </div>
              <input
                value={formData.email}
                disabled
                style={{ ...inputStyle, background: '#ECEAE6', color: '#9B9A98', cursor: 'not-allowed' }}
              />
            </div>

            {/* Username */}
            <div>
              <div style={labelStyle}>
                <AtSign size={12} color="#03ACEA" />
                Username
              </div>
              <input
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value.toLowerCase())}
                placeholder="Choose a unique username"
                required
                style={{
                  ...inputStyle,
                  borderColor: usernameError ? '#E8726E' : 'rgba(0,0,0,0.08)',
                }}
                onFocus={e => e.target.style.borderColor = usernameError ? '#E8726E' : '#03ACEA'}
                onBlur={e => e.target.style.borderColor = usernameError ? '#E8726E' : 'rgba(0,0,0,0.08)'}
              />
              {isCheckingUsername && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <Loader2 size={11} style={{ color: '#03ACEA', animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 11, color: '#03ACEA' }}>Checking availability...</span>
                </div>
              )}
              {usernameError && (
                <p style={{ fontSize: 11, color: '#E8726E', marginTop: 4 }}>{usernameError}</p>
              )}
              {!usernameError && formData.username && formData.username.length >= 3 && !isCheckingUsername && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <CheckCircle size={11} style={{ color: '#03ACEA' }} />
                  <span style={{ fontSize: 11, color: '#03ACEA' }}>Username is available!</span>
                </div>
              )}
            </div>

            {/* Phone */}
            <div>
              <div style={labelStyle}>
                <Phone size={12} color="#9B9A98" />
                Phone Number
                <span style={{ fontSize: 11, color: '#B8B7B5', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </div>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter your phone number"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#03ACEA'}
                onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.08)'}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || isCheckingUsername || !!usernameError}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
                fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                background: (isSubmitting || isCheckingUsername || usernameError)
                  ? 'rgba(3,172,234,0.4)'
                  : 'linear-gradient(135deg, #03ACEA 0%, #7C3AED 100%)',
                color: 'white',
                cursor: (isSubmitting || isCheckingUsername || usernameError) ? 'not-allowed' : 'pointer',
                boxShadow: (isSubmitting || isCheckingUsername || usernameError) ? 'none' : '0 4px 14px rgba(3,172,234,0.3)',
                transition: 'opacity 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginTop: 4,
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Creating account...
                </>
              ) : 'Create Your Account'}
            </button>

          </form>
        </div>

        {/* Bottom padding */}
        <div style={{ height: 5 }} />
      </div>
    </div>
  );
}

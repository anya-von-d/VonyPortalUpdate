import { useState, useEffect, useRef } from "react";
import { User, PublicProfile } from "@/entities/all";
import { UploadFile } from "@/integrations/Core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle,
  XCircle,
  Camera,
  LogOut,
  Image,
  Trash2,
  Landmark,
  Clock
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import MeshMobileNav from "@/components/MeshMobileNav";
import UserAvatar from "@/components/ui/UserAvatar";
import DesktopSidebar from '../components/DesktopSidebar';

const SHADOW = '0px 50px 40px rgba(0,0,0,0.02), 0px 50px 40px rgba(0,0,0,0.04), 0px 20px 40px rgba(0,0,0,0.08), 0px 3px 10px rgba(0,0,0,0.12)';

// Helper function to sync public profile, moved here to adhere to file structure rules
const syncPublicProfile = async (userData) => {
  if (!userData || !userData.id || !userData.username || !userData.full_name) {
    console.log("syncPublicProfile: Not enough data to sync.", userData);
    return;
  }
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

export default function Profile() {
  const { logout } = useAuth();
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState(null);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const photoMenuRef = useRef(null);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    phone: '',
    location: '',
    profile_picture_url: '',
    theme_preference: 'morning'
  });

  useEffect(() => {
    loadUserData();
  }, []);

  // Close photo menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (photoMenuRef.current && !photoMenuRef.current.contains(event.target)) {
        setShowPhotoMenu(false);
      }
    };
    if (showPhotoMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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
        theme_preference: userData?.theme_preference || 'morning'
      });

      await syncPublicProfile(userData);
    } catch (error) {
      console.error("Error loading user data:", error);
      setError("Failed to load profile data. Please try refreshing the page.");
      if (error.message?.includes("401") || error.message?.includes("unauthorized")) {
        navigate(createPageUrl("Dashboard"));
      }
    }
    setIsLoading(false);
  };

  const checkUsernameAvailability = async (username) => {
    if (!username || username === user?.username) {
      setUsernameError(null);
      return true;
    }

    setIsCheckingUsername(true);
    try {
      const users = await User.list() || [];
      const existingUser = users.find(u => u.username === username && u.id !== user?.id);
      if (existingUser) {
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
      setUsernameError("Could not verify username availability");
      setIsCheckingUsername(false);
      return false;
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (field === 'username') {
      if (handleInputChange.usernameCheckTimeout) {
        clearTimeout(handleInputChange.usernameCheckTimeout);
      }
      handleInputChange.usernameCheckTimeout = setTimeout(() => {
        checkUsernameAvailability(value);
      }, 500);
    }
  };

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setSaving(true);
      setError(null);
      setShowPhotoMenu(false);
      try {
        const { file_url } = await UploadFile({ file, userId: user?.id });
        setFormData(prev => ({...prev, profile_picture_url: file_url }));
        setUser(prev => ({...prev, profile_picture_url: file_url }));

        await User.updateMyUserData({ profile_picture_url: file_url });
        await syncPublicProfile({ ...user, profile_picture_url: file_url });
      } catch (error) {
        console.error("Error uploading profile picture", error);
        setError("Failed to upload profile picture. Please try again.");
      }
      setSaving(false);
    }
  };

  const handleRemovePhoto = async () => {
    setSaving(true);
    setError(null);
    setShowPhotoMenu(false);
    try {
      setFormData(prev => ({...prev, profile_picture_url: '' }));
      setUser(prev => ({...prev, profile_picture_url: '' }));

      await User.updateMyUserData({ profile_picture_url: '' });
      await syncPublicProfile({ ...user, profile_picture_url: '' });
    } catch (error) {
      console.error("Error removing profile picture", error);
      setError("Failed to remove profile picture. Please try again.");
    }
    setSaving(false);
  };

  const handleSave = async () => {
    const isUsernameAvailable = await checkUsernameAvailability(formData.username);
    if (!isUsernameAvailable && formData.username !== user?.username) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updateData = {
        username: formData.username,
        phone: formData.phone,
        location: formData.location,
        profile_picture_url: formData.profile_picture_url,
        theme_preference: formData.theme_preference
      };

      const updatedUser = await User.updateMyUserData(updateData);
      await syncPublicProfile({ ...user, ...updatedUser, ...updateData });
      await loadUserData();
      window.dispatchEvent(new Event('profileUpdated'));
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      setError("Failed to save profile changes. Please try again.");
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    try {
      await User.logout();
      navigate(createPageUrl("Home"));
    } catch (error) {
      console.error("Error during logout:", error);
      navigate(createPageUrl("Home"));
    }
  };

  const PageCard = ({ title, headerRight, children, style }) => (
    <div style={{ marginBottom: 24, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 5, marginBottom: 2 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif" }}>{title}</div>
        {headerRight && <div style={{ flexShrink: 0 }}>{headerRight}</div>}
      </div>
      <div style={{ overflow: 'visible' }}>{children}</div>
    </div>
  );

  // Loading state
  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '2px solid #03ACEA', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px' }} className="animate-spin" />
          <p style={{ fontSize: 12, color: '#787776', fontFamily: "'DM Sans', sans-serif" }}>Loading profile...</p>
        </div>
      </div>
    );
  }

  // Error state for initial load failure
  if (error && !user) {
    return (
      <div style={{ minHeight: '100vh', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'white', borderRadius: 10, border: '1px solid rgba(0,0,0,0.06)', padding: 32, maxWidth: 400 }}>
          <div style={{ textAlign: 'center' }}>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: '#0D0D0C', marginBottom: 8 }}>Connection Error</h3>
            <p style={{ color: '#787776', marginBottom: 16 }}>{error}</p>
            <Button onClick={loadUserData} className="text-white hover:opacity-90" style={{ background: '#03ACEA' }}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={{ minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", background: 'transparent' }}>
      <MeshMobileNav user={user} activePage="Profile" />

      {/* Bank Account Coming Soon Modal */}
      {showComingSoonModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowComingSoonModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            style={{ background: '#ffffff', borderRadius: 20, maxWidth: 440, width: '100%', boxShadow: '0px 50px 40px rgba(0,0,0,0.02), 0px 50px 40px rgba(0,0,0,0.04), 0px 20px 40px rgba(0,0,0,0.08), 0px 3px 10px rgba(0,0,0,0.12)', overflow: 'hidden' }}
          >
            <div style={{ padding: '6px 14px 5px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={12} style={{ color: '#9B9A98' }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>Bank Account</span>
            </div>
            <div style={{ background: '#ffffff', margin: '0 5px 5px', borderRadius: 10, padding: '28px 28px 24px' }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, margin: '0 auto 20px', background: 'rgba(3,172,234,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Landmark size={24} style={{ color: '#03ACEA' }} />
              </div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1A1918', margin: '0 0 10px', textAlign: 'center', fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: '-0.02em' }}>
                Coming Soon
              </h3>
              <p style={{ fontSize: 13, color: '#787776', margin: '0 0 8px', textAlign: 'center', lineHeight: 1.6 }}>
                Bank account connections via Plaid & Dwolla are coming soon! This feature will enable secure bank transfers directly through Vony.
              </p>
              <p style={{ fontSize: 12, color: '#9B9A98', margin: '0 0 24px', textAlign: 'center', lineHeight: 1.6 }}>
                In the meantime, you can use Venmo, Cash App, PayPal, or Zelle for payments.
              </p>
              <button
                onClick={() => setShowComingSoonModal(false)}
                style={{ width: '100%', padding: '12px 0', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #03ACEA 0%, #7C3AED 100%)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
              >
                Got it!
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="mesh-layout" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 0, minHeight: '100vh' }}>

        {/* COL 1 - left nav */}
        <DesktopSidebar />

        {/* COL 2 - main content */}
        <div className="mesh-center" style={{ background: 'transparent', borderRight: '1px solid rgba(0,0,0,0.06)', padding: '24px 32px 80px' }}>

          {/* Mobile-only page title (desktop shows it in top bar) */}
          <div className="mobile-page-title">
            <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.02em', marginBottom: 12 }}>Profile</div>
          </div>

          {/* Error Alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ marginBottom: 20, background: 'rgba(232,114,110,0.08)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <XCircle size={18} style={{ color: '#E8726E', flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: '#E8726E', margin: 0 }}>{error}</p>
            </motion.div>
          )}

          {/* Profile Hero — photo, name, member-since */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 32 }}>
            {/* Photo + camera badge */}
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <UserAvatar name={user.full_name || user.username} src={formData.profile_picture_url} size={100} style={{ border: '3px solid white', boxShadow: '0 4px 20px rgba(0,0,0,0.14)', display: 'block' }} />
              {/* Always-visible camera badge */}
              <button
                onClick={() => setShowPhotoMenu(!showPhotoMenu)}
                disabled={isSaving}
                style={{ position: 'absolute', bottom: 2, right: 2, width: 28, height: 28, borderRadius: '50%', background: 'white', border: '1.5px solid rgba(0,0,0,0.10)', boxShadow: '0 2px 8px rgba(0,0,0,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <Camera size={13} style={{ color: '#1A1918' }} />
              </button>
              <input type="file" ref={fileInputRef} onChange={handleProfilePictureChange} style={{ display: 'none' }} accept="image/*" />
              <input type="file" ref={cameraInputRef} onChange={handleProfilePictureChange} style={{ display: 'none' }} accept="image/*" capture="environment" />

              {showPhotoMenu && (
                <motion.div
                  ref={photoMenuRef}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{ position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', background: 'white', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden', zIndex: 10, minWidth: 200 }}
                >
                  <button onClick={() => fileInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", textAlign: 'left' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <Image size={16} style={{ color: '#787776' }} /> Choose from Library
                  </button>
                  <button onClick={() => cameraInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", textAlign: 'left', borderTop: '1px solid rgba(0,0,0,0.06)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <Camera size={16} style={{ color: '#787776' }} /> Take Photo
                  </button>
                  {formData.profile_picture_url && (
                    <button onClick={handleRemovePhoto} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#E8726E', fontFamily: "'DM Sans', sans-serif", textAlign: 'left', borderTop: '1px solid rgba(0,0,0,0.06)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,114,110,0.06)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <Trash2 size={16} style={{ color: '#E8726E' }} /> Remove Profile Photo
                    </button>
                  )}
                </motion.div>
              )}
            </div>

            <h2 style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 13, fontWeight: 700, color: '#1A1918', margin: 0, lineHeight: 1, letterSpacing: '-0.02em' }}>
              {formData.full_name || user.full_name}
            </h2>

            <p style={{ fontSize: 13, color: '#9B9A98', margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
              Member since {user.created_at ? new Date(user.created_at).getFullYear() : new Date().getFullYear()}
            </p>
          </div>

          {/* Page Content */}
          <div style={{ paddingBottom: 40 }}>
            {/* Personal Information — full width */}
            <div style={{ position: 'relative', marginBottom: 20 }}>
              <div className="home-aura-glow" style={{ position: 'absolute', inset: -3, background: '#CFDCE7', borderRadius: 12, filter: 'blur(4px)', opacity: 0.5, zIndex: 0, pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1, background: 'white', borderRadius: 10, border: 'none', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ padding: '14px 18px 7px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif" }}>Personal Information</span>
                {isEditing ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setFormData({
                          full_name: user?.full_name || '',
                          username: user?.username || '',
                          phone: user?.phone || '',
                          location: user?.location || '',
                          profile_picture_url: user?.profile_picture_url || '',
                          theme_preference: user?.theme_preference || 'morning'
                        });
                        setUsernameError(null);
                      }}
                      className="bg-white hover:bg-slate-50"
                      style={{ fontSize: 12, padding: '4px 12px', height: 'auto' }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={isSaving || usernameError || isCheckingUsername}
                      className="text-white font-semibold hover:opacity-90"
                      style={{ background: '#03ACEA', fontSize: 12, padding: '4px 12px', height: 'auto' }}
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="text-white font-semibold hover:opacity-90"
                    style={{ background: '#03ACEA', fontSize: 12, padding: '4px 12px', height: 'auto' }}
                  >
                    Edit
                  </Button>
                )}
              </div>
              {/* Body */}
              <div style={{ padding: '16px 18px' }}>
                <div className="space-y-4" style={{ background: 'rgba(3,172,234,0.06)', borderRadius: 12, padding: 16 }}>
                  <div className="grid md:grid-cols-2 gap-3 md:gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="full_name" className="text-xs font-medium" style={{ color: '#787776' }}>
                        Full Name
                      </Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        disabled
                        placeholder="Enter your full name"
                        style={{ background: 'transparent' }}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium" style={{ color: '#787776' }}>
                        Email
                      </Label>
                      <Input
                        value={user.email || 'Not provided'}
                        disabled
                        style={{ background: 'transparent' }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="username" className="text-xs font-medium" style={{ color: '#787776' }}>
                      Username
                    </Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      disabled={!isEditing || isSaving}
                      placeholder="Choose a unique username"
                      className={usernameError ? 'border-red-300' : ''}
                      style={!isEditing ? { background: 'transparent' } : {}}
                      required
                    />
                    {isCheckingUsername && (
                      <p className="text-xs text-blue-600">Checking availability...</p>
                    )}
                    {usernameError && (
                      <p className="text-xs text-red-600">{usernameError}</p>
                    )}
                    {isEditing && !usernameError && formData.username && formData.username !== user.username && !isCheckingUsername && (
                      <p className="text-xs text-green-600">Username is available!</p>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-3 md:gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="phone" className="text-xs font-medium" style={{ color: '#787776' }}>
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        disabled={!isEditing || isSaving}
                        placeholder="Enter your phone number"
                        style={!isEditing ? { background: 'transparent' } : {}}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="location" className="text-xs font-medium" style={{ color: '#787776' }}>
                        Location
                      </Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        disabled={!isEditing || isSaving}
                        placeholder="City, State"
                        style={!isEditing ? { background: 'transparent' } : {}}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>

            {/* Bank + Verification — 2 columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Bank Account */}
              <div style={{ position: 'relative', marginBottom: 20 }}>
                <div className="home-aura-glow" style={{ position: 'absolute', inset: -3, background: '#CFDCE7', borderRadius: 12, filter: 'blur(4px)', opacity: 0.5, zIndex: 0, pointerEvents: 'none' }} />
              <div style={{ position: 'relative', zIndex: 1, background: 'white', borderRadius: 10, border: 'none', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ padding: '14px 18px 7px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif" }}>Bank Account</span>
                </div>
                {/* Body */}
                <div style={{ padding: '16px 18px' }}>
                  <div className="space-y-4">
                    <p className="text-sm" style={{ color: '#787776' }}>
                      Securely connect your bank account using Plaid & Dwolla to enable bank transfers.
                    </p>
                    <Button
                      className="w-full text-white hover:opacity-90"
                      style={{ background: '#03ACEA' }}
                      onClick={() => setShowComingSoonModal(true)}
                    >
                      <Landmark className="w-4 h-4 mr-2" />
                      Connect Bank Account
                    </Button>
                    <p className="text-xs text-center" style={{ color: '#787776' }}>
                      Powered by Plaid & Dwolla - Bank grade security
                    </p>
                  </div>
                </div>
              </div>
              </div>

              {/* Verification Status */}
              <div style={{ position: 'relative', marginBottom: 20 }}>
                <div className="home-aura-glow" style={{ position: 'absolute', inset: -3, background: '#CFDCE7', borderRadius: 12, filter: 'blur(4px)', opacity: 0.5, zIndex: 0, pointerEvents: 'none' }} />
              <div style={{ position: 'relative', zIndex: 1, background: 'white', borderRadius: 10, border: 'none', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ padding: '14px 18px 7px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif" }}>Verification</span>
                </div>
                {/* Body */}
                <div style={{ padding: '16px 18px' }}>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Email Verified</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: 'rgba(22,163,74,0.12)', color: '#16A34A', border: '1px solid rgba(22,163,74,0.2)', fontFamily: "'DM Sans', sans-serif" }}>
                        <CheckCircle size={12} />
                        Verified
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Phone Verified</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: 'transparent', color: '#787776', border: '1px solid rgba(0,0,0,0.1)', fontFamily: "'DM Sans', sans-serif" }}>
                        <XCircle size={12} />
                        Not Verified
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Profile Complete</span>
                      {user.full_name && user.username ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: 'rgba(22,163,74,0.12)', color: '#16A34A', border: '1px solid rgba(22,163,74,0.2)', fontFamily: "'DM Sans', sans-serif" }}>
                          <CheckCircle size={12} />
                          Complete
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: 'transparent', color: '#787776', border: '1px solid rgba(0,0,0,0.1)', fontFamily: "'DM Sans', sans-serif" }}>
                          <XCircle size={12} />
                          Incomplete
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', paddingBottom: 24 }}>
            <Button variant="ghost" onClick={handleLogout} className="hover:text-red-500" style={{ color: '#787776' }}>
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </Button>
          </div>

          <div style={{ paddingTop: 24, borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: '#787776' }}>2026 Vony, Inc. All rights reserved.</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <a href="https://www.vony-lending.com/terms" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#787776', textDecoration: 'none' }}>Terms of Service</a>
              <a href="https://www.vony-lending.com/privacy" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#787776', textDecoration: 'none' }}>Privacy Center</a>
              <a href="https://www.vony-lending.com/do-not-sell" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#787776', textDecoration: 'none' }}>Do not sell or share my personal information</a>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}

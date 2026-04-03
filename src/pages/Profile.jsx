import React, { useState, useEffect, useRef } from "react";
import { User, PublicProfile } from "@/entities/all";
import { UploadFile } from "@/integrations/Core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  XCircle,
  Camera,
  LogOut,
  Image,
  Trash2,
  Landmark,
  Clock,
  User as UserIcon
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import DashboardSidebar from "@/components/DashboardSidebar";

const STAR_CIRCLES = [
  {cx:82,cy:45,o:0.7},{cx:195,cy:112,o:0.5},{cx:310,cy:28,o:0.8},{cx:420,cy:198,o:0.4},
  {cx:530,cy:67,o:0.65},{cx:640,cy:245,o:0.55},{cx:755,cy:88,o:0.75},{cx:860,cy:156,o:0.45},
  {cx:970,cy:34,o:0.7},{cx:1085,cy:201,o:0.6},{cx:1190,cy:78,o:0.5},{cx:1300,cy:267,o:0.7},
  {cx:1410,cy:45,o:0.55},{cx:1520,cy:134,o:0.65},{cx:48,cy:189,o:0.4},{cx:158,cy:278,o:0.6},
  {cx:268,cy:156,o:0.5},{cx:378,cy:89,o:0.7},{cx:488,cy:234,o:0.45},{cx:598,cy:145,o:0.6},
  {cx:708,cy:312,o:0.35},{cx:818,cy:56,o:0.75},{cx:928,cy:223,o:0.5},{cx:1038,cy:98,o:0.65},
  {cx:1148,cy:289,o:0.4},{cx:1258,cy:167,o:0.7},{cx:1368,cy:234,o:0.55},{cx:1478,cy:78,o:0.6},
  {cx:1560,cy:256,o:0.45},{cx:125,cy:312,o:0.5},{cx:345,cy:267,o:0.6},{cx:565,cy:34,o:0.75},
];

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

      // Sync Public Profile using the utility function
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

    // Check username availability when username changes
    if (field === 'username') {
      // Clear previous timeout if any
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

        // Save the profile picture to the database immediately
        await User.updateMyUserData({ profile_picture_url: file_url });

        // Sync to public profile
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

      // Save to database
      await User.updateMyUserData({ profile_picture_url: '' });

      // Sync to public profile
      await syncPublicProfile({ ...user, profile_picture_url: '' });
    } catch (error) {
      console.error("Error removing profile picture", error);
      setError("Failed to remove profile picture. Please try again.");
    }
    setSaving(false);
  };

  const handleSave = async () => {
    // Check username availability one more time before saving
    const isUsernameAvailable = await checkUsernameAvailability(formData.username);
    if (!isUsernameAvailable && formData.username !== user?.username) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      // Only include fields that exist in the database schema (full_name is not editable)
      const updateData = {
        username: formData.username,
        phone: formData.phone,
        location: formData.location,
        profile_picture_url: formData.profile_picture_url,
        theme_preference: formData.theme_preference
      };

      const updatedUser = await User.updateMyUserData(updateData);
      // Sync public profile with all latest data including updatedUser and updateData
      await syncPublicProfile({ ...user, ...updatedUser, ...updateData });
      await loadUserData();
      // Notify other components (Layout/AuthContext) that the profile was updated
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

  // Loading state
  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F4F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '2px solid #82F0B9', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px' }} className="animate-spin" />
          <p style={{ fontSize: 14, color: '#787776', fontFamily: "'DM Sans', sans-serif" }}>Loading profile...</p>
        </div>
      </div>
    );
  }

  // Error state for initial load failure
  if (error && !user) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F4F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass-card" style={{ padding: 32, maxWidth: 400 }}>
          <div style={{ textAlign: 'center' }}>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: '#0D0D0C', marginBottom: 8 }}>Connection Error</h3>
            <p style={{ color: '#787776', marginBottom: 16 }}>{error}</p>
            <Button onClick={loadUserData} className="text-white hover:opacity-90" style={{ background: '#82F0B9' }}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="home-with-sidebar" style={{ minHeight: '100vh', position: 'relative', fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif", fontSize: 14, lineHeight: 1.5, color: '#1A1918', WebkitFontSmoothing: 'antialiased', paddingLeft: 240, paddingTop: 68, background: '#F5F4F0' }}>
      <DashboardSidebar activePage="Profile" user={user} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 900, margin: '0 auto', padding: '0 28px' }}>
          {/* Hero - Profile Photo + Name */}
          <div style={{ paddingTop: 80, paddingBottom: 30, textAlign: 'center' }}>
            {/* Error Alert */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 rounded-lg p-4"
                style={{ marginBottom: 20, textAlign: 'left' }}
              >
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <p className="text-red-800">{error}</p>
                </div>
              </motion.div>
            )}

            <div className="relative inline-block group">
              <img
                src={formData.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent((user.full_name || 'User').charAt(0))}&background=678AFB&color=fff&size=128`}
                alt="Profile"
                className="w-24 h-24 md:w-32 md:h-32 rounded-full mx-auto object-cover border-4 border-white/80 shadow-lg"
              />
              <button
                onClick={() => setShowPhotoMenu(!showPhotoMenu)}
                className="absolute inset-0 w-full h-full bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={isSaving}
              >
                <Camera className="w-8 h-8"/>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleProfilePictureChange}
                className="hidden"
                accept="image/*"
              />
              <input
                type="file"
                ref={cameraInputRef}
                onChange={handleProfilePictureChange}
                className="hidden"
                accept="image/*"
                capture="environment"
              />

              {showPhotoMenu && (
                <motion.div
                  ref={photoMenuRef}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden z-10"
                >
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-3 px-4 py-3 w-full hover:bg-slate-50 transition-colors text-left"
                  >
                    <Image className="w-5 h-5 text-slate-600" />
                    <span className="text-sm font-medium text-slate-700">Choose from Library</span>
                  </button>
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center gap-3 px-4 py-3 w-full hover:bg-slate-50 transition-colors text-left border-t border-slate-100"
                  >
                    <Camera className="w-5 h-5 text-slate-600" />
                    <span className="text-sm font-medium text-slate-700">Take Photo</span>
                  </button>
                  {formData.profile_picture_url && (
                    <button
                      onClick={handleRemovePhoto}
                      className="flex items-center gap-3 px-4 py-3 w-full hover:bg-red-50 transition-colors text-left border-t border-slate-100"
                    >
                      <Trash2 className="w-5 h-5 text-red-600" />
                      <span className="text-sm font-medium text-red-600">Remove Profile Photo</span>
                    </button>
                  )}
                </motion.div>
              )}
            </div>
            <h1 style={{ color: '#1A1918', fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '2.4rem', fontWeight: 600, marginTop: 16 }}>
              {formData.full_name || user.full_name}
            </h1>
            <p style={{ color: '#787776', fontSize: 13 }}>
              Member since {user.created_at ? new Date(user.created_at).getFullYear() : new Date().getFullYear()}
            </p>
            <button
              onClick={() => setShowPhotoMenu(!showPhotoMenu)}
              disabled={isSaving}
              style={{ background: 'rgba(0,0,0,0.05)', backdropFilter: 'blur(10px)', color: '#1A1918', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 16 }}
            >
              Edit Profile Photo
            </button>
          </div>

          {/* Coming Soon Modal */}
          <Dialog open={showComingSoonModal} onOpenChange={setShowComingSoonModal}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <Clock className="w-6 h-6" style={{ color: '#82F0B9' }} />
                  Feature Coming Soon
                </DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p style={{ color: '#787776' }}>
                  Bank account connections via Plaid & Dwolla are coming soon! This feature will enable secure bank transfers directly through Vony.
                </p>
                <p className="text-sm mt-3" style={{ color: '#787776' }}>
                  In the meantime, you can use Venmo, Cash App, PayPal, or Zelle for payments.
                </p>
              </div>
              <Button
                onClick={() => setShowComingSoonModal(false)}
                className="w-full text-white hover:opacity-90"
                style={{ background: '#82F0B9' }}
              >
                Got it!
              </Button>
            </DialogContent>
          </Dialog>

          {/* Page Content */}
          <div className="grid lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 w-full" style={{ paddingBottom: 40 }}>
            {/* Profile Info */}
            <div className="lg:col-span-2 space-y-4 md:space-y-6 min-w-0 w-full">
              {/* Personal Information - First */}
              <div className="glass-card" style={{ padding: '16px 16px' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#9B9A98', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 16 }}>
                  Personal Information
                </p>

                {/* Inner box with fields */}
                <div className="space-y-4" style={{ background: 'rgba(130,240,185,0.06)', borderRadius: 12, padding: 16 }}>
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
                        style={{ background: 'rgba(0,0,0,0.03)' }}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium" style={{ color: '#787776' }}>
                        Email
                      </Label>
                      <Input
                        value={user.email || 'Not provided'}
                        disabled
                        style={{ background: 'rgba(0,0,0,0.03)' }}
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
                      style={!isEditing ? { background: 'rgba(0,0,0,0.03)' } : {}}
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
                        style={!isEditing ? { background: 'rgba(0,0,0,0.03)' } : {}}
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
                        style={!isEditing ? { background: 'rgba(0,0,0,0.03)' } : {}}
                      />
                    </div>
                  </div>
                </div>

                {/* Edit button below inner box, right-aligned */}
                <div className="flex justify-end mt-4">
                  {isEditing ? (
                    <div className="flex gap-3">
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
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={isSaving || usernameError || isCheckingUsername}
                        className="text-white font-semibold hover:opacity-90"
                        style={{ background: '#82F0B9' }}
                      >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setIsEditing(true)}
                      className="text-white font-semibold hover:opacity-90"
                      style={{ background: '#82F0B9' }}
                    >
                      Edit Personal Information
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Stats & Verification */}
            <div className="space-y-4 md:space-y-6 min-w-0 w-full">
              {/* Bank Account Connection */}
              <div className="glass-card" style={{ padding: '16px 16px' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#9B9A98', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 16 }}>
                  Bank Account
                </p>
                <div className="space-y-4">
                  <p className="text-sm" style={{ color: '#787776' }}>
                    Securely connect your bank account using Plaid & Dwolla to enable bank transfers.
                  </p>
                  <Button
                    className="w-full text-white hover:opacity-90"
                    style={{ background: '#82F0B9' }}
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

              {/* Verification Status */}
              <div className="glass-card" style={{ padding: '16px 16px' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#9B9A98', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 16 }}>
                  Verification
                </p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Email Verified</span>
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Phone Verified</span>
                    <Badge className="bg-gray-100 text-gray-800 border-gray-200">
                      <XCircle className="w-3 h-3 mr-1" />
                      Not Verified
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Profile Complete</span>
                    <Badge className={user.full_name && user.username ?
                      "bg-green-100 text-green-800 border-green-200" :
                      "bg-gray-100 text-gray-800 border-gray-200"
                    }>
                      {user.full_name && user.username ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Complete
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 mr-1" />
                          Incomplete
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center', paddingBottom: 40 }}>
            <Button variant="ghost" onClick={handleLogout} className="hover:text-red-500" style={{ color: '#787776' }}>
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </Button>
          </div>

        </div>
      <div style={{ padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: '#787776' }}>2026 Vony, Inc. All rights reserved.</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span style={{ fontSize: 11, color: '#787776' }}>Terms of Service</span>
          <span style={{ fontSize: 11, color: '#787776' }}>Privacy Center</span>
          <span style={{ fontSize: 11, color: '#787776' }}>Do not sell or share my personal information</span>
        </div>
      </div>
    </div>
  );
}

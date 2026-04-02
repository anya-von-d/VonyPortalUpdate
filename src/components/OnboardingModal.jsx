import React, { useState, useEffect } from "react";
import { User, PublicProfile } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User as UserIcon,
  Mail,
  Phone,
  AtSign,
  CheckCircle,
  Loader2
} from "lucide-react";

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

    // Check for valid characters (alphanumeric, underscores, dots)
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
      setUsernameError(null); // Allow submission if check fails
      setIsCheckingUsername(false);
      return true;
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.full_name.trim()) {
      alert("Please enter your full name");
      return;
    }

    if (!formData.username.trim()) {
      alert("Please choose a username");
      return;
    }

    const isUsernameAvailable = await checkUsernameAvailability(formData.username);
    if (!isUsernameAvailable) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Update the user profile (only fields that exist in the schema)
      const profileData = {
        full_name: formData.full_name.trim(),
        username: formData.username.trim().toLowerCase(),
        phone: formData.phone.trim() || null
      };

      await User.updateMyUserData(profileData);

      // Create or update public profile
      const publicProfileData = {
        user_id: user.id,
        username: formData.username.trim().toLowerCase(),
        full_name: formData.full_name.trim(),
        profile_picture_url: user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.full_name.trim())}&background=678AFB&color=fff&size=128`
      };

      // Check if public profile exists
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-8 text-center">
          <h1 className="text-4xl font-bold text-slate-800 mb-3 tracking-tight whitespace-nowrap">
            Welcome to Vony!
          </h1>
          <p className="text-lg text-[#35B276]">
            Let's set up your profile
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="full_name" className="flex items-center gap-2 text-slate-700">
              <UserIcon className="w-4 h-4 text-[#35B276]" />
              Full Name
            </Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              placeholder="Enter your full name"
              required
              className="border-slate-200 focus:border-[#35B276] focus:ring-[#35B276]"
            />
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2 text-slate-700">
              <Mail className="w-4 h-4 text-slate-400" />
              Email Address
            </Label>
            <Input
              id="email"
              value={formData.email}
              disabled
              className="bg-slate-50 text-slate-500"
            />
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username" className="flex items-center gap-2 text-slate-700">
              <AtSign className="w-4 h-4 text-[#35B276]" />
              Username
            </Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value.toLowerCase())}
              placeholder="Choose a unique username"
              required
              className={`border-slate-200 focus:border-[#35B276] focus:ring-[#35B276] ${usernameError ? 'border-red-300' : ''}`}
            />
            {isCheckingUsername && (
              <p className="text-xs text-blue-600 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Checking availability...
              </p>
            )}
            {usernameError && (
              <p className="text-xs text-red-600">{usernameError}</p>
            )}
            {!usernameError && formData.username && formData.username.length >= 3 && !isCheckingUsername && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Username is available!
              </p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2 text-slate-700">
              <Phone className="w-4 h-4 text-[#35B276]" />
              Phone Number
              <span className="text-slate-400 text-xs">(optional)</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="Enter your phone number"
              className="border-slate-200 focus:border-[#35B276] focus:ring-[#35B276]"
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || isCheckingUsername || usernameError}
            className="w-full bg-[#35B276] hover:bg-[#2d9561] text-white py-3 text-lg font-semibold"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating account...
              </span>
            ) : (
              "Create Your Account"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { Friendship, PublicProfile, User } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  UserPlus,
  Star,
  Search,
  X,
  Send,
  Clock,
  Pencil,
  Check,
  Trash2,
  CheckCircle,
  XCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Friends() {
  const { user: authUser, userProfile } = useAuth();
  const user = userProfile ? { ...userProfile, id: authUser?.id } : null;
  const [searchParams] = useSearchParams();

  // Check URL for tab parameter
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl === 'add' ? 'add' : 'friends');
  const [friends, setFriends] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    if (user?.id) {
      loadFriendsData();
    }
  }, [user?.id]);

  useEffect(() => {
    if (searchQuery.trim() && activeTab === 'add') {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, sentRequests, friends]);

  const loadFriendsData = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const [allFriendships, allProfiles] = await Promise.all([
        Friendship.list().catch(() => []),
        PublicProfile.list().catch(() => [])
      ]);

      setProfiles(allProfiles);

      const acceptedFriends = allFriendships.filter(f =>
        f.status === 'accepted' &&
        (f.user_id === user.id || f.friend_id === user.id)
      );
      setFriends(acceptedFriends);

      const pending = allFriendships.filter(f =>
        f.status === 'pending' && f.user_id === user.id
      );
      setSentRequests(pending);

      const received = allFriendships.filter(f =>
        f.status === 'pending' && f.friend_id === user.id
      );
      setReceivedRequests(received);

    } catch (error) {
      console.error("Error loading friends data:", error);
    }
    setIsLoading(false);
  };

  const searchUsers = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = profiles.filter(profile => {
      if (profile.user_id === user?.id) return false;

      const isFriend = friends.some(f =>
        f.user_id === profile.user_id || f.friend_id === profile.user_id
      );
      if (isFriend) return false;

      const requestSent = sentRequests.some(r => r.friend_id === profile.user_id);
      if (requestSent) return false;

      const usernameMatch = profile.username?.toLowerCase().includes(query);
      const nameMatch = profile.full_name?.toLowerCase().includes(query);
      return usernameMatch || nameMatch;
    });

    setSearchResults(results);
  };

  const getReceivedRequestFrom = (userId) => {
    return receivedRequests.find(r => r.user_id === userId);
  };

  const handleAcceptRequestFromSearch = async (friendshipId) => {
    if (processingId) return;
    setProcessingId(friendshipId);

    try {
      await Friendship.update(friendshipId, { status: 'accepted' });
      await loadFriendsData();
      setSearchQuery('');
    } catch (error) {
      console.error("Error accepting friend request:", error);
    }
    setProcessingId(null);
  };

  const getFriendProfile = (friendship) => {
    const friendId = friendship.user_id === user?.id ? friendship.friend_id : friendship.user_id;
    return profiles.find(p => p.user_id === friendId);
  };

  const getProfileById = (userId) => {
    return profiles.find(p => p.user_id === userId);
  };

  const sentRequestsRef = React.useRef(null);

  const handleSendRequest = async (friendUserId) => {
    if (!user?.id || processingId) return;
    setProcessingId(friendUserId);

    try {
      await Friendship.create({
        user_id: user.id,
        friend_id: friendUserId,
        status: 'pending',
        is_starred: false
      });
      await loadFriendsData();
      setTimeout(() => {
        sentRequestsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    } catch (error) {
      console.error("Error sending friend request:", error);
    }
    setProcessingId(null);
  };

  const handleCancelRequest = async (friendshipId) => {
    if (processingId) return;
    setProcessingId(friendshipId);

    try {
      await Friendship.delete(friendshipId);
      await loadFriendsData();
    } catch (error) {
      console.error("Error canceling request:", error);
    }
    setProcessingId(null);
  };

  const handleRemoveFriend = async (friendshipId) => {
    if (processingId) return;
    setProcessingId(friendshipId);

    try {
      await Friendship.delete(friendshipId);
      await loadFriendsData();
    } catch (error) {
      console.error("Error removing friend:", error);
    }
    setProcessingId(null);
  };

  const handleToggleStar = async (friendship) => {
    if (processingId) return;
    setProcessingId(friendship.id);

    try {
      await Friendship.update(friendship.id, {
        is_starred: !friendship.is_starred
      });
      await loadFriendsData();
    } catch (error) {
      console.error("Error toggling star:", error);
    }
    setProcessingId(null);
  };

  // Sort friends: starred first, then alphabetically
  const sortedFriends = [...friends].sort((a, b) => {
    const aStarred = a.is_starred && (a.user_id === user?.id || a.friend_id === user?.id);
    const bStarred = b.is_starred && (b.user_id === user?.id || b.friend_id === user?.id);

    if (aStarred && !bStarred) return -1;
    if (!aStarred && bStarred) return 1;

    const aProfile = getFriendProfile(a);
    const bProfile = getFriendProfile(b);
    return (aProfile?.full_name || aProfile?.username || '').localeCompare(
      bProfile?.full_name || bProfile?.username || ''
    );
  });

  const tabs = [
    { id: 'friends', label: 'Your Friends' },
    { id: 'add', label: 'Add Friends' },
  ];

  return (
    <div className="min-h-screen" style={{backgroundColor: '#CDE7F8'}}>
      <div className="px-4 pt-8 pb-8 sm:px-8 md:px-24 md:pt-12 lg:px-36">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#213B75] tracking-tight font-sans">
              Friends
            </h1>
          </motion.div>

          {/* Tab Navigation */}
          <div className="flex gap-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setEditMode(false);
                  setSearchQuery('');
                }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold font-sans transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#213B75] text-white shadow-sm'
                    : 'bg-white text-[#4C7FC4] hover:bg-white/80 shadow-sm'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content Sections */}
          <AnimatePresence mode="wait">
            {/* Your Friends Tab */}
            {activeTab === 'friends' && (
              <motion.div
                key="friends"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="rounded-xl px-4 py-4 shadow-sm bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-[#213B75] tracking-tight font-sans">
                      Your Friends
                    </p>
                    {sortedFriends.length > 0 && (
                      <button
                        onClick={() => setEditMode(!editMode)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-sans transition-all ${
                          editMode
                            ? 'bg-[#213B75] text-white'
                            : 'bg-[#CDE7F8] text-[#4C7FC4] hover:bg-[#b8daf3]'
                        }`}
                      >
                        {editMode ? 'Done' : 'Edit'}
                      </button>
                    )}
                  </div>

                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-2 border-[#4C7FC4] border-t-transparent rounded-full animate-spin mx-auto" />
                    </div>
                  ) : sortedFriends.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 mx-auto mb-3 text-[#CDE7F8]" />
                      <p className="text-[#4C7FC4] font-sans">No friends yet</p>
                      <button
                        onClick={() => setActiveTab('add')}
                        className="mt-3 text-[#213B75] font-semibold text-sm hover:underline font-sans"
                      >
                        Add your first friend
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sortedFriends.map((friendship, index) => {
                        const friendProfile = getFriendProfile(friendship);
                        if (!friendProfile) return null;

                        const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent((friendProfile?.full_name || 'U').charAt(0))}&background=4C7FC4&color=fff&size=128`;

                        return (
                          <motion.div
                            key={friendship.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="p-3 rounded-lg bg-[#CDE7F8]"
                          >
                            <div className="flex items-center gap-3">
                              {/* Profile Photo */}
                              <img
                                src={friendProfile.profile_picture_url || friendProfile.avatar_url || defaultAvatar}
                                alt={friendProfile.full_name || 'Friend'}
                                className="w-10 h-10 rounded-full object-cover flex-shrink-0 bg-white"
                              />

                              {/* Name and Username */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-[#213B75] truncate font-sans">
                                  {friendProfile.full_name || friendProfile.username}
                                </p>
                                <p className="text-xs text-[#4C7FC4] truncate font-sans">
                                  @{friendProfile.username}
                                </p>
                              </div>

                              {/* Star Button */}
                              <button
                                onClick={() => handleToggleStar(friendship)}
                                disabled={processingId === friendship.id}
                                className={`p-2 rounded-lg transition-all ${
                                  friendship.is_starred
                                    ? 'text-yellow-500'
                                    : 'text-[#4C7FC4]/40 hover:text-yellow-400'
                                }`}
                              >
                                <Star
                                  className="w-5 h-5"
                                  fill={friendship.is_starred ? 'currentColor' : 'none'}
                                />
                              </button>

                              {/* Remove Button (Edit Mode) */}
                              {editMode && (
                                <button
                                  onClick={() => handleRemoveFriend(friendship.id)}
                                  disabled={processingId === friendship.id}
                                  className="p-2 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                >
                                  {processingId === friendship.id ? (
                                    <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Trash2 className="w-5 h-5" />
                                  )}
                                </button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Add Friends Tab */}
            {activeTab === 'add' && (
              <motion.div
                key="add"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                {/* Search Box */}
                <div className="rounded-xl px-4 py-4 shadow-sm bg-white">
                  <p className="text-sm font-bold text-[#213B75] mb-3 tracking-tight font-sans">
                    Search for Friends
                  </p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4C7FC4]/50" />
                    <Input
                      type="text"
                      placeholder="Search by username..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-[#CDE7F8] border-0 text-[#213B75] placeholder:text-[#4C7FC4]/50 font-sans"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4C7FC4] hover:text-[#213B75]"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Search Results */}
                {searchQuery.trim() && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="rounded-xl px-4 py-4 shadow-sm bg-white">
                      <p className="text-sm font-bold text-[#213B75] mb-3 tracking-tight font-sans">
                        Results
                      </p>

                      {searchResults.length === 0 ? (
                        <div className="text-center py-6">
                          <p className="text-[#4C7FC4] font-sans text-sm">No users found matching "{searchQuery}"</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {searchResults.map((profile, index) => {
                            const receivedRequest = getReceivedRequestFrom(profile.user_id);
                            const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent((profile?.full_name || 'U').charAt(0))}&background=4C7FC4&color=fff&size=128`;

                            return (
                              <motion.div
                                key={profile.user_id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="p-3 rounded-lg bg-[#CDE7F8]"
                              >
                                <div className="flex items-center gap-3">
                                  {/* Profile Photo */}
                                  <img
                                    src={profile.profile_picture_url || profile.avatar_url || defaultAvatar}
                                    alt={profile.full_name || 'User'}
                                    className="w-10 h-10 rounded-full object-cover flex-shrink-0 bg-white"
                                  />

                                  {/* Name and Username */}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-[#213B75] truncate font-sans">
                                      {profile.full_name || profile.username}
                                    </p>
                                    <p className="text-xs text-[#4C7FC4] truncate font-sans">
                                      @{profile.username}
                                    </p>
                                  </div>

                                  {/* Accept or Send Request Button */}
                                  {receivedRequest ? (
                                    <button
                                      onClick={() => handleAcceptRequestFromSearch(receivedRequest.id)}
                                      disabled={processingId === receivedRequest.id}
                                      className="bg-[#213B75] rounded-lg px-3 py-1.5 flex items-center gap-1.5 hover:bg-[#1a3060] transition-colors disabled:opacity-50"
                                    >
                                      {processingId === receivedRequest.id ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                      ) : (
                                        <>
                                          <CheckCircle className="w-3.5 h-3.5 text-white" />
                                          <span className="text-xs font-semibold text-white font-sans">Accept</span>
                                        </>
                                      )}
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleSendRequest(profile.user_id)}
                                      disabled={processingId === profile.user_id}
                                      className="bg-white rounded-lg px-3 py-1.5 flex items-center gap-1.5 hover:bg-white/80 transition-colors disabled:opacity-50"
                                    >
                                      {processingId === profile.user_id ? (
                                        <div className="w-4 h-4 border-2 border-[#4C7FC4] border-t-transparent rounded-full animate-spin" />
                                      ) : (
                                        <>
                                          <Send className="w-3.5 h-3.5 text-[#4C7FC4]" />
                                          <span className="text-xs font-semibold text-[#213B75] font-sans">Send Request</span>
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Your Friend Requests (Sent) */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div ref={sentRequestsRef} className="rounded-xl px-4 py-4 shadow-sm bg-white">
                    <p className="text-sm font-bold text-[#213B75] mb-3 tracking-tight font-sans">
                      Your Friend Requests
                    </p>

                    {sentRequests.length === 0 ? (
                      <div className="text-center py-6">
                        <Clock className="w-10 h-10 mx-auto mb-2 text-[#CDE7F8]" />
                        <p className="text-[#4C7FC4] text-sm font-sans">No pending requests</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {sentRequests.map((request, index) => {
                          const profile = getProfileById(request.friend_id);
                          if (!profile) return null;

                          const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent((profile?.full_name || 'U').charAt(0))}&background=4C7FC4&color=fff&size=128`;

                          return (
                            <motion.div
                              key={request.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="p-3 rounded-lg bg-[#CDE7F8]"
                            >
                              <div className="flex items-center gap-3">
                                {/* Profile Photo */}
                                <img
                                  src={profile.profile_picture_url || profile.avatar_url || defaultAvatar}
                                  alt={profile.full_name || 'User'}
                                  className="w-10 h-10 rounded-full object-cover flex-shrink-0 bg-white"
                                />

                                {/* Name and Username */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-[#213B75] truncate font-sans">
                                    {profile.full_name || profile.username}
                                  </p>
                                  <p className="text-xs text-[#4C7FC4] truncate font-sans">
                                    @{profile.username}
                                  </p>
                                </div>

                                {/* Pending Badge + Cancel */}
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-semibold text-[#4C7FC4] bg-white rounded-md px-2 py-0.5 font-sans">
                                    Pending
                                  </span>
                                  <button
                                    onClick={() => handleCancelRequest(request.id)}
                                    disabled={processingId === request.id}
                                    className="p-1.5 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                  >
                                    {processingId === request.id ? (
                                      <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <X className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

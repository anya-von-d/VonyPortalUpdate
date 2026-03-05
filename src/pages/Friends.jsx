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
  XCircle,
  UserMinus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Friends() {
  const { user: authUser, userProfile } = useAuth();
  const user = userProfile ? { ...userProfile, id: authUser?.id } : null;

  const [friends, setFriends] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    if (user?.id) {
      loadFriendsData();
    }
  }, [user?.id]);

  useEffect(() => {
    if (searchQuery.trim()) {
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

      const usernameMatch = profile.username?.toLowerCase().includes(query);
      const nameMatch = profile.full_name?.toLowerCase().includes(query);
      return usernameMatch || nameMatch;
    });

    setSearchResults(results);
  };

  const getReceivedRequestFrom = (userId) => {
    return receivedRequests.find(r => r.user_id === userId);
  };

  const getSentRequestTo = (userId) => {
    return sentRequests.find(r => r.friend_id === userId);
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

  // Include sent-request users in search results so they show "Unsend Friend Request"
  const getSearchResultsWithPending = () => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    const results = profiles.filter(profile => {
      if (profile.user_id === user?.id) return false;

      // Exclude existing friends
      const isFriend = friends.some(f =>
        f.user_id === profile.user_id || f.friend_id === profile.user_id
      );
      if (isFriend) return false;

      const usernameMatch = profile.username?.toLowerCase().includes(query);
      const nameMatch = profile.full_name?.toLowerCase().includes(query);
      return usernameMatch || nameMatch;
    });

    return results;
  };

  const allSearchResults = getSearchResultsWithPending();

  return (
    <div className="min-h-screen" style={{backgroundColor: '#0F2B1F'}}>
      <div className="px-4 pt-14 pb-8 sm:px-8 md:px-24 md:pt-20 lg:px-36">
        <div className="max-w-6xl mx-auto space-y-5">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#C2FFDC] tracking-tight font-serif">
              Friends
            </h1>
          </motion.div>

          {/* Two-Column Layout: Friends Left, Search + Requests Right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
            {/* Left Column: Your Friends */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <div className="rounded-xl px-4 py-4 shadow-sm bg-[#1C4332]">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-[#C2FFDC] tracking-tight font-serif">
                    Your Friends
                  </p>
                </div>

                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-[#00A86B] border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : sortedFriends.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto mb-3 text-[#00A86B]/30" />
                    <p className="text-[#00A86B] font-sans text-sm">No friends yet</p>
                    <p className="text-[#00A86B]/60 font-sans text-xs mt-1">Search for friends to get started</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sortedFriends.map((friendship, index) => {
                      const friendProfile = getFriendProfile(friendship);
                      if (!friendProfile) return null;

                      const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent((friendProfile?.full_name || 'U').charAt(0))}&background=00A86B&color=fff&size=128`;

                      return (
                        <motion.div
                          key={friendship.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="p-3 rounded-lg bg-[#0F2B1F]"
                        >
                          <div className="flex items-center gap-3">
                            {/* Profile Photo */}
                            <img
                              src={friendProfile.profile_picture_url || friendProfile.avatar_url || defaultAvatar}
                              alt={friendProfile.full_name || 'Friend'}
                              className="w-10 h-10 rounded-full object-cover flex-shrink-0 bg-[#1C4332]"
                            />

                            {/* Name and Username */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-[#C2FFDC] truncate font-sans">
                                {friendProfile.full_name || friendProfile.username}
                              </p>
                              <p className="text-xs text-[#00A86B] truncate font-sans">
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
                                  : 'text-[#00A86B]/40 hover:text-yellow-400'
                              }`}
                            >
                              <Star
                                className="w-5 h-5"
                                fill={friendship.is_starred ? 'currentColor' : 'none'}
                              />
                            </button>

                            {/* Unfriend Button */}
                            <button
                              onClick={() => handleRemoveFriend(friendship.id)}
                              disabled={processingId === friendship.id}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all font-sans cursor-pointer"
                            >
                              {processingId === friendship.id ? (
                                <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                'Unfriend'
                              )}
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Right Column: Search + Friend Requests */}
            <div className="flex flex-col gap-4 md:gap-5">
              {/* Search for Friends */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="rounded-xl px-4 py-4 shadow-sm bg-[#1C4332]">
                  <p className="text-sm font-bold text-[#C2FFDC] mb-3 tracking-tight font-serif">
                    Search for Friends
                  </p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#00A86B]/50" />
                    <Input
                      type="text"
                      placeholder="Search by username..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-[#0F2B1F] border-0 text-[#C2FFDC] placeholder:text-[#00A86B]/50 font-sans"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#00A86B] hover:text-[#C2FFDC]"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Search Results inline */}
                  {searchQuery.trim() && (
                    <div className="mt-3">
                      {allSearchResults.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-[#00A86B] font-sans text-sm">No users found matching "{searchQuery}"</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {allSearchResults.map((profile, index) => {
                            const receivedRequest = getReceivedRequestFrom(profile.user_id);
                            const sentRequest = getSentRequestTo(profile.user_id);
                            const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent((profile?.full_name || 'U').charAt(0))}&background=00A86B&color=fff&size=128`;

                            return (
                              <motion.div
                                key={profile.user_id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="p-3 rounded-lg bg-[#0F2B1F]"
                              >
                                <div className="flex items-center gap-3">
                                  {/* Profile Photo */}
                                  <img
                                    src={profile.profile_picture_url || profile.avatar_url || defaultAvatar}
                                    alt={profile.full_name || 'User'}
                                    className="w-10 h-10 rounded-full object-cover flex-shrink-0 bg-[#1C4332]"
                                  />

                                  {/* Name and Username */}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-[#C2FFDC] truncate font-sans">
                                      {profile.full_name || profile.username}
                                    </p>
                                    <p className="text-xs text-[#00A86B] truncate font-sans">
                                      @{profile.username}
                                    </p>
                                  </div>

                                  {/* Action Button: Accept / Unsend / Send */}
                                  {receivedRequest ? (
                                    <button
                                      onClick={() => handleAcceptRequestFromSearch(receivedRequest.id)}
                                      disabled={processingId === receivedRequest.id}
                                      className="bg-[#00A86B] rounded-lg px-3 py-1.5 flex items-center gap-1.5 hover:bg-[#00A86B]/90 transition-colors disabled:opacity-50 cursor-pointer"
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
                                  ) : sentRequest ? (
                                    <button
                                      onClick={() => handleCancelRequest(sentRequest.id)}
                                      disabled={processingId === sentRequest.id}
                                      className="bg-red-500/10 rounded-lg px-3 py-1.5 flex items-center gap-1.5 hover:bg-red-500/20 transition-colors disabled:opacity-50 cursor-pointer"
                                    >
                                      {processingId === sentRequest.id ? (
                                        <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                      ) : (
                                        <>
                                          <UserMinus className="w-3.5 h-3.5 text-red-400" />
                                          <span className="text-xs font-semibold text-red-400 font-sans">Unsend Friend Request</span>
                                        </>
                                      )}
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleSendRequest(profile.user_id)}
                                      disabled={processingId === profile.user_id}
                                      className="bg-[#6AD478] rounded-lg px-3 py-1.5 flex items-center gap-1.5 hover:bg-[#6AD478]/90 transition-colors disabled:opacity-50 cursor-pointer"
                                    >
                                      {processingId === profile.user_id ? (
                                        <div className="w-4 h-4 border-2 border-[#1C4332] border-t-transparent rounded-full animate-spin" />
                                      ) : (
                                        <>
                                          <Send className="w-3.5 h-3.5 text-[#1C4332]" />
                                          <span className="text-xs font-semibold text-[#1C4332] font-sans">Send Request</span>
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
                  )}
                </div>
              </motion.div>

              {/* Friend Requests (Received) */}
              {receivedRequests.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <div className="rounded-xl px-4 py-4 shadow-sm bg-[#1C4332]">
                    <p className="text-sm font-bold text-[#C2FFDC] mb-3 tracking-tight font-serif">
                      Friend Requests
                    </p>
                    <div className="space-y-2">
                      {receivedRequests.map((request, index) => {
                        const profile = getProfileById(request.user_id);
                        if (!profile) return null;
                        const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent((profile?.full_name || 'U').charAt(0))}&background=00A86B&color=fff&size=128`;

                        return (
                          <motion.div
                            key={request.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="p-3 rounded-lg bg-[#0F2B1F]"
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={profile.profile_picture_url || profile.avatar_url || defaultAvatar}
                                alt={profile.full_name || 'User'}
                                className="w-10 h-10 rounded-full object-cover flex-shrink-0 bg-[#1C4332]"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-[#C2FFDC] truncate font-sans">
                                  {profile.full_name || profile.username}
                                </p>
                                <p className="text-xs text-[#00A86B] truncate font-sans">
                                  @{profile.username}
                                </p>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <button
                                  onClick={() => handleAcceptRequestFromSearch(request.id)}
                                  disabled={processingId === request.id}
                                  className="bg-[#00A86B] rounded-lg px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#00A86B]/90 transition-colors disabled:opacity-50 font-sans cursor-pointer"
                                >
                                  {processingId === request.id ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  ) : 'Confirm'}
                                </button>
                                <button
                                  onClick={() => handleCancelRequest(request.id)}
                                  disabled={processingId === request.id}
                                  className="bg-red-500/10 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50 font-sans cursor-pointer"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

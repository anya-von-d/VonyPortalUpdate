import React, { useState, useEffect } from "react";
import { Friendship, PublicProfile, User } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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

      // Get accepted friendships where user is either user_id or friend_id
      const acceptedFriends = allFriendships.filter(f =>
        f.status === 'accepted' &&
        (f.user_id === user.id || f.friend_id === user.id)
      );
      setFriends(acceptedFriends);

      // Get pending requests sent by the user
      const pending = allFriendships.filter(f =>
        f.status === 'pending' && f.user_id === user.id
      );
      setSentRequests(pending);

      // Get pending requests received by the user
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

      // Check if already friends
      const isFriend = friends.some(f =>
        f.user_id === profile.user_id || f.friend_id === profile.user_id
      );
      if (isFriend) return false;

      // Check if request already sent by current user (exclude from results - they're in sent requests)
      const requestSent = sentRequests.some(r => r.friend_id === profile.user_id);
      if (requestSent) return false;

      // Match username or full name containing search query
      // Note: Users who have sent requests TO current user ARE included (so user can accept)
      const usernameMatch = profile.username?.toLowerCase().includes(query);
      const nameMatch = profile.full_name?.toLowerCase().includes(query);
      return usernameMatch || nameMatch;
    });

    setSearchResults(results);
  };

  // Check if a user has sent a request to current user
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
      // Scroll to sent requests section so user sees the profile moved there
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
    // Get the star status for the current user
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

  const colors = ['#AAFFA3', '#30FFA8', '#96FFD0', '#74FF71', '#83F384', '#6EE8A2'];

  return (
    <div className="min-h-screen p-6" style={{background: `linear-gradient(to bottom right, rgb(var(--theme-bg-from)), rgb(var(--theme-bg-to)))`}}>
      <div className="max-w-4xl mx-auto space-y-7">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-5"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4 tracking-tight text-left">
            Friends
          </h1>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <Button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setEditMode(false);
                setSearchQuery('');
              }}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              className={`whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#00A86B] hover:bg-[#0D9B76] text-white'
                  : 'bg-white border-0 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </Button>
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
              <Card className="bg-[#DBFFEB] border-0 rounded-2xl">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] text-slate-600 uppercase tracking-[0.12em] font-medium" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                      Your Friends
                    </p>
                    {sortedFriends.length > 0 && (
                      <button
                        onClick={() => setEditMode(!editMode)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          editMode
                            ? 'bg-[#00A86B] text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {editMode ? 'Done' : 'Edit'}
                      </button>
                    )}
                  </div>

                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-2 border-[#00A86B] border-t-transparent rounded-full animate-spin mx-auto" />
                    </div>
                  ) : sortedFriends.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-slate-500">No friends yet</p>
                      <button
                        onClick={() => setActiveTab('add')}
                        className="mt-3 text-[#00A86B] font-medium text-sm hover:underline"
                      >
                        Add your first friend
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sortedFriends.map((friendship, index) => {
                        const friendProfile = getFriendProfile(friendship);
                        if (!friendProfile) return null;

                        return (
                          <motion.div
                            key={friendship.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="p-4 rounded-xl"
                            style={{ backgroundColor: colors[index % 6] }}
                          >
                            <div className="flex items-center gap-4">
                              {/* Profile Photo */}
                              <div className="w-12 h-12 rounded-full bg-[#DBFFEB] flex items-center justify-center flex-shrink-0">
                                {friendProfile.avatar_url ? (
                                  <img
                                    src={friendProfile.avatar_url}
                                    alt={friendProfile.full_name}
                                    className="w-full h-full rounded-full object-cover"
                                  />
                                ) : (
                                  <span className="text-lg font-semibold text-[#0A1A10]">
                                    {(friendProfile.full_name || friendProfile.username || '?').charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>

                              {/* Name and Username */}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-800 truncate">
                                  {friendProfile.full_name || friendProfile.username}
                                </p>
                                <p className="text-sm text-slate-600 truncate">
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
                                    : 'text-slate-400 hover:text-yellow-400'
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
                </CardContent>
              </Card>
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
              <Card className="bg-[#DBFFEB] border-0 rounded-2xl">
                <CardContent className="p-5">
                  <p className="text-[10px] text-slate-600 uppercase tracking-[0.12em] font-medium mb-4" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                    Search for Friends
                  </p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Search by username..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-white"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Search Results */}
              {searchQuery.trim() && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="bg-[#DBFFEB] border-0 rounded-2xl">
                    <CardContent className="p-5">
                      <p className="text-[10px] text-slate-600 uppercase tracking-[0.12em] font-medium mb-4" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                        Results
                      </p>

                      {searchResults.length === 0 ? (
                        <div className="text-center py-6">
                          <p className="text-slate-500">No users found matching "{searchQuery}"</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {searchResults.map((profile, index) => {
                            const receivedRequest = getReceivedRequestFrom(profile.user_id);

                            return (
                              <motion.div
                                key={profile.user_id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="p-4 rounded-xl"
                                style={{ backgroundColor: colors[index % 6] }}
                              >
                                <div className="flex items-center gap-4">
                                  {/* Profile Photo */}
                                  <div className="w-12 h-12 rounded-full bg-[#DBFFEB] flex items-center justify-center flex-shrink-0">
                                    {profile.avatar_url ? (
                                      <img
                                        src={profile.avatar_url}
                                        alt={profile.full_name}
                                        className="w-full h-full rounded-full object-cover"
                                      />
                                    ) : (
                                      <span className="text-lg font-semibold text-[#0A1A10]">
                                        {(profile.full_name || profile.username || '?').charAt(0).toUpperCase()}
                                      </span>
                                    )}
                                  </div>

                                  {/* Name and Username */}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-800 truncate">
                                      {profile.full_name || profile.username}
                                    </p>
                                    <p className="text-sm text-slate-600 truncate">
                                      @{profile.username}
                                    </p>
                                  </div>

                                  {/* Accept or Send Request Button */}
                                  {receivedRequest ? (
                                    <Button
                                      size="sm"
                                      onClick={() => handleAcceptRequestFromSearch(receivedRequest.id)}
                                      disabled={processingId === receivedRequest.id}
                                      className="bg-[#00A86B] hover:bg-[#0D9B76] text-white"
                                    >
                                      {processingId === receivedRequest.id ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                      ) : (
                                        <>
                                          <CheckCircle className="w-4 h-4 mr-1" />
                                          Accept
                                        </>
                                      )}
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={() => handleSendRequest(profile.user_id)}
                                      disabled={processingId === profile.user_id}
                                      className="bg-[#00A86B] hover:bg-[#0D9B76] text-white"
                                    >
                                      {processingId === profile.user_id ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                      ) : (
                                        <>
                                          <Send className="w-4 h-4 mr-1" />
                                          Send Request
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Sent Friend Requests */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card ref={sentRequestsRef} className="bg-[#DBFFEB] border-0 rounded-2xl">
                  <CardContent className="p-5">
                    <p className="text-[10px] text-slate-600 uppercase tracking-[0.12em] font-medium mb-4" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                      Sent Friend Requests
                    </p>

                    {sentRequests.length === 0 ? (
                      <div className="text-center py-6">
                        <Clock className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                        <p className="text-slate-500">No pending requests</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {sentRequests.map((request, index) => {
                          const profile = getProfileById(request.friend_id);
                          if (!profile) return null;

                          return (
                            <motion.div
                              key={request.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="p-4 rounded-xl"
                              style={{ backgroundColor: colors[index % 6] }}
                            >
                              <div className="flex items-center gap-4">
                                {/* Profile Photo */}
                                <div className="w-12 h-12 rounded-full bg-[#DBFFEB] flex items-center justify-center flex-shrink-0">
                                  {profile.avatar_url ? (
                                    <img
                                      src={profile.avatar_url}
                                      alt={profile.full_name}
                                      className="w-full h-full rounded-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-lg font-semibold text-[#0A1A10]">
                                      {(profile.full_name || profile.username || '?').charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                </div>

                                {/* Name and Username */}
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-slate-800 truncate">
                                    {profile.full_name || profile.username}
                                  </p>
                                  <p className="text-sm text-slate-600 truncate">
                                    @{profile.username}
                                  </p>
                                </div>

                                {/* Cancel Request Button */}
                                <button
                                  onClick={() => handleCancelRequest(request.id)}
                                  disabled={processingId === request.id}
                                  className="bg-[#6EE8A2] rounded-xl px-4 py-2 flex items-center gap-1.5 hover:bg-red-50 transition-colors disabled:opacity-50"
                                >
                                  {processingId === request.id ? (
                                    <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <>
                                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                                      <span className="text-sm font-medium text-red-500">Cancel</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

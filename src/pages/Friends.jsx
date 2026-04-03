import React, { useState, useEffect } from "react";
import { Friendship, PublicProfile, User } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";
import { useSearchParams } from "react-router-dom";
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

  const defaultAvatarUrl = (name) =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent((name || 'U').charAt(0))}&background=678AFB&color=fff&size=128`;

  /* ── Loading state ──────────────────────────────────────────── */
  if (isLoading && !user) {
    return (
      <div className="home-with-sidebar" style={{ minHeight: '100vh', position: 'relative', fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif", fontSize: 14, lineHeight: 1.5, color: '#1A1918', WebkitFontSmoothing: 'antialiased', paddingLeft: 240, paddingTop: 90, background: '#F5F4F0' }}>
        <DashboardSidebar activePage="Friends" user={user} />
          <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 28px 64px', position: 'relative', zIndex: 2 }}>
            <div className="glass-card" style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 32, height: 32, border: '2px solid #82F0B9', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 12 }} />
              <p style={{ fontSize: 13, color: '#787776' }}>Loading friends...</p>
            </div>
          </div>
        </div>
    );
  }

  /* ══════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════ */
  return (
    <div className="home-with-sidebar" style={{ minHeight: '100vh', position: 'relative', fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif", fontSize: 14, lineHeight: 1.5, color: '#1A1918', WebkitFontSmoothing: 'antialiased', paddingLeft: 240, paddingTop: 90, background: '#F5F4F0' }}>
      <DashboardSidebar activePage="Friends" user={user} />

      {/* ── Content box with galaxy background ── */}

        {/* Background */}

      <div style={{ background: 'transparent', position: 'relative', zIndex: 2 }}>

        {/* Page content */}
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 28px 64px' }}>

          {/* Two-Column Layout: Friends Left, Search + Requests Right */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* Left Column: Your Friends */}
            <div className="glass-card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px 0' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#9B9A98', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Your Friends</span>
              </div>
              <div style={{ padding: '10px 16px 16px' }}>
                {isLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
                    <div style={{ width: 32, height: 32, border: '2px solid #82F0B9', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  </div>
                ) : sortedFriends.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', color: '#C7C6C4' }}>
                    <Users size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
                    <p style={{ fontSize: 13, color: '#787776', margin: 0 }}>No friends yet</p>
                    <p style={{ fontSize: 12, color: '#C7C6C4', margin: '4px 0 0' }}>Search for friends to get started</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {sortedFriends.map((friendship, index) => {
                      const friendProfile = getFriendProfile(friendship);
                      if (!friendProfile) return null;

                      return (
                        <div
                          key={friendship.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0',
                            borderBottom: index < sortedFriends.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                          }}
                        >
                          {/* Avatar */}
                          <img
                            src={friendProfile.profile_picture_url || friendProfile.avatar_url || defaultAvatarUrl(friendProfile.full_name)}
                            alt={friendProfile.full_name || 'Friend'}
                            style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, background: 'rgba(130,240,185,0.1)' }}
                          />

                          {/* Name */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 500, color: '#1A1918', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {friendProfile.full_name || friendProfile.username}
                            </p>
                            <p style={{ fontSize: 11, color: '#787776', margin: '2px 0 0' }}>
                              @{friendProfile.username}
                            </p>
                          </div>

                          {/* Star Button */}
                          <button
                            onClick={() => handleToggleStar(friendship)}
                            disabled={processingId === friendship.id}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer', padding: 6,
                              color: friendship.is_starred ? '#F5A623' : '#C7C6C4',
                              transition: 'color 0.15s',
                            }}
                          >
                            <Star
                              size={18}
                              fill={friendship.is_starred ? 'currentColor' : 'none'}
                            />
                          </button>

                          {/* Unfriend Button */}
                          <button
                            onClick={() => handleRemoveFriend(friendship.id)}
                            disabled={processingId === friendship.id}
                            style={{
                              padding: '6px 12px', borderRadius: 10, border: 'none',
                              background: 'rgba(232,114,110,0.08)', fontSize: 11, fontWeight: 600,
                              color: '#E8726E', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                              transition: 'background 0.15s', whiteSpace: 'nowrap',
                            }}
                          >
                            {processingId === friendship.id ? (
                              <div style={{ width: 16, height: 16, border: '2px solid #E8726E', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                            ) : (
                              'Unfriend'
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Search + Friend Requests */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Search for Friends */}
              <div className="glass-card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px 0' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#9B9A98', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Search for Friends</span>
                </div>
                <div style={{ padding: '10px 16px 16px' }}>
                  {/* Search Input */}
                  <div style={{ position: 'relative', marginBottom: searchQuery.trim() ? 14 : 0 }}>
                    <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#C7C6C4' }} />
                    <input
                      type="text"
                      placeholder="Search by username..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        width: '100%', padding: '10px 36px 10px 38px', borderRadius: 12,
                        border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.03)',
                        fontSize: 13, color: '#1A1918', fontFamily: "'DM Sans', sans-serif",
                        outline: 'none', transition: 'border-color 0.15s',
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'rgba(130,240,185,0.4)'}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(0,0,0,0.08)'}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#787776', padding: 2 }}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  {/* Search Results */}
                  {searchQuery.trim() && (
                    <div>
                      {allSearchResults.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '16px 0' }}>
                          <p style={{ fontSize: 13, color: '#787776', margin: 0 }}>No users found</p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {allSearchResults.map((profile) => {
                            const receivedRequest = getReceivedRequestFrom(profile.user_id);
                            const sentRequest = getSentRequestTo(profile.user_id);

                            return (
                              <div
                                key={profile.user_id}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0',
                                  borderBottom: '1px solid rgba(0,0,0,0.05)',
                                }}
                              >
                                <img
                                  src={profile.profile_picture_url || profile.avatar_url || defaultAvatarUrl(profile.full_name)}
                                  alt={profile.full_name || 'User'}
                                  style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, background: 'rgba(130,240,185,0.1)' }}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ fontSize: 13, fontWeight: 500, color: '#1A1918', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {profile.full_name || profile.username}
                                  </p>
                                  <p style={{ fontSize: 11, color: '#787776', margin: '2px 0 0' }}>@{profile.username}</p>
                                </div>

                                {/* Action Button */}
                                {receivedRequest ? (
                                  <button
                                    onClick={() => handleAcceptRequestFromSearch(receivedRequest.id)}
                                    disabled={processingId === receivedRequest.id}
                                    style={{
                                      padding: '6px 12px', borderRadius: 10, border: 'none',
                                      background: '#82F0B9', fontSize: 11, fontWeight: 600,
                                      color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                                      fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
                                      opacity: processingId === receivedRequest.id ? 0.5 : 1,
                                    }}
                                  >
                                    {processingId === receivedRequest.id ? (
                                      <div style={{ width: 14, height: 14, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                    ) : (
                                      <>
                                        <CheckCircle size={14} />
                                        Accept
                                      </>
                                    )}
                                  </button>
                                ) : sentRequest ? (
                                  <button
                                    onClick={() => handleCancelRequest(sentRequest.id)}
                                    disabled={processingId === sentRequest.id}
                                    style={{
                                      padding: '6px 12px', borderRadius: 10, border: 'none',
                                      background: 'rgba(232,114,110,0.08)', fontSize: 11, fontWeight: 600,
                                      color: '#E8726E', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                                      fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
                                      opacity: processingId === sentRequest.id ? 0.5 : 1,
                                    }}
                                  >
                                    {processingId === sentRequest.id ? (
                                      <div style={{ width: 14, height: 14, border: '2px solid #E8726E', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                    ) : (
                                      <>
                                        <UserMinus size={14} />
                                        Unsend Request
                                      </>
                                    )}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleSendRequest(profile.user_id)}
                                    disabled={processingId === profile.user_id}
                                    style={{
                                      padding: '6px 12px', borderRadius: 10, border: 'none',
                                      background: '#82F0B9', fontSize: 11, fontWeight: 600,
                                      color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                                      fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
                                      opacity: processingId === profile.user_id ? 0.5 : 1,
                                    }}
                                  >
                                    {processingId === profile.user_id ? (
                                      <div style={{ width: 14, height: 14, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                    ) : (
                                      <>
                                        <Send size={14} />
                                        Send Request
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Friend Requests (Received) */}
              {receivedRequests.length > 0 && (
                <div className="glass-card" style={{ overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#9B9A98', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Friend Requests</span>
                      <span style={{ fontSize: 12, color: '#787776' }}>
                        {receivedRequests.length} pending
                      </span>
                    </div>
                  </div>
                  <div style={{ padding: '10px 16px 16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {receivedRequests.map((request) => {
                        const profile = getProfileById(request.user_id);
                        if (!profile) return null;

                        return (
                          <div
                            key={request.id}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0',
                              borderBottom: '1px solid rgba(0,0,0,0.05)',
                            }}
                          >
                            <img
                              src={profile.profile_picture_url || profile.avatar_url || defaultAvatarUrl(profile.full_name)}
                              alt={profile.full_name || 'User'}
                              style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, background: 'rgba(130,240,185,0.1)' }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 500, color: '#1A1918', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {profile.full_name || profile.username}
                              </p>
                              <p style={{ fontSize: 11, color: '#787776', margin: '2px 0 0' }}>@{profile.username}</p>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                              <button
                                onClick={() => handleAcceptRequestFromSearch(request.id)}
                                disabled={processingId === request.id}
                                style={{
                                  padding: '6px 12px', borderRadius: 10, border: 'none',
                                  background: '#82F0B9', fontSize: 11, fontWeight: 600,
                                  color: 'white', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                                  opacity: processingId === request.id ? 0.5 : 1,
                                }}
                              >
                                {processingId === request.id ? (
                                  <div style={{ width: 14, height: 14, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                ) : 'Confirm'}
                              </button>
                              <button
                                onClick={() => handleCancelRequest(request.id)}
                                disabled={processingId === request.id}
                                style={{
                                  padding: '6px 12px', borderRadius: 10, border: 'none',
                                  background: 'rgba(232,114,110,0.08)', fontSize: 11, fontWeight: 600,
                                  color: '#E8726E', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                                  opacity: processingId === request.id ? 0.5 : 1,
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>


      {/* ── Footer ── */}
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

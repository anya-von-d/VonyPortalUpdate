import React, { useState, useEffect, useRef } from "react";
import { Friendship, PublicProfile, User } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";
import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
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
import confetti from "canvas-confetti";

const SHADOW = '0px 50px 40px rgba(0,0,0,0.02), 0px 50px 40px rgba(0,0,0,0.04), 0px 20px 40px rgba(0,0,0,0.08), 0px 3px 10px rgba(0,0,0,0.12)';

export default function Friends() {
  const { user: authUser, userProfile, logout } = useAuth();
  const user = userProfile ? { ...userProfile, id: authUser?.id } : null;
  const [moreNavOpen, setMoreNavOpen] = useState(false);
  const moreNavCloseTimerRef = useRef(null);

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
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.5 },
        colors: ['#03ACEA', '#7C3AED', '#82F0B9', '#ffffff'],
        zIndex: 9999,
      });
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

  const PageCard = ({ title, headerRight, children, style, className }) => (
    <div className={className} style={{ background: '#F4F4F5', borderRadius: 14, overflow: 'hidden', boxShadow: SHADOW, display: 'flex', flexDirection: 'column', ...style }}>
      <div style={{ padding: '6px 14px 5px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>{title}</span>
        {headerRight && <div style={{ flexShrink: 0 }}>{headerRight}</div>}
      </div>
      <div style={{ background: '#ffffff', margin: '0 5px 5px', borderRadius: 10, overflow: 'hidden', flex: 1 }}>
        {children}
      </div>
    </div>
  );

  const RightSection = ({ title, children }) => (
    <div style={{ marginBottom: 40 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 9 }}>{title}</div>
      <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', marginBottom: 14 }} />
      {children}
    </div>
  );

  return (
    <div className="mesh-layout" style={{ display: 'grid', gridTemplateColumns: '180px 1fr 300px', gap: 0, minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14, lineHeight: 1.5, color: '#1A1918', WebkitFontSmoothing: 'antialiased' }}>

      {/* Col 1: left nav */}
      <div className="mesh-left" style={{ background: '#F5F4F0', borderRight: '1px solid rgba(0,0,0,0.08)' }}>
        <div style={{ position: 'sticky', top: 0, padding: '32px 20px 0' }}>
          <Link to="/" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontStyle: 'italic', fontSize: '1.75rem', color: '#1A1918', textDecoration: 'none', display: 'block', marginBottom: 24, lineHeight: 1, letterSpacing: '-0.02em' }}>Vony</Link>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[
              { label: 'Home', to: '/', active: false },
              { label: 'Upcoming', to: createPageUrl("Upcoming"), active: false },
              { label: 'Create Loan', to: createPageUrl("CreateOffer"), active: false },
              { label: 'Record Payment', to: createPageUrl("RecordPayment"), active: false },
              { label: 'My Loans', to: createPageUrl("YourLoans"), active: false },
              { label: 'Friends', to: createPageUrl("Friends"), active: true },
            ].map(({ label, to, active: isActive }) => (
              <Link key={label} to={to} style={{ display: 'block', padding: '8px 10px', borderRadius: 9, textDecoration: 'none', fontSize: 14, fontWeight: isActive ? 600 : 500, color: isActive ? '#1A1918' : '#787776', background: isActive ? 'rgba(0,0,0,0.05)' : 'transparent', fontFamily: "'DM Sans', sans-serif", width: '100%', boxSizing: 'border-box' }}>{label}</Link>
            ))}
            <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '8px 0' }} />
            {[
              { label: 'Recent Activity', to: createPageUrl("RecentActivity") },
              { label: 'Documents', to: createPageUrl("LoanAgreements") },
            ].map(({ label, to }) => (
              <Link key={label} to={to} style={{ display: 'block', padding: '7px 10px 7px 4px', borderRadius: 9, textDecoration: 'none', fontSize: 13, fontWeight: 500, color: '#9B9A98', background: 'transparent', fontFamily: "'DM Sans', sans-serif", width: '100%', boxSizing: 'border-box' }}>{label}</Link>
            ))}
            <div style={{ position: 'relative' }} onMouseEnter={() => { if (moreNavCloseTimerRef.current) { clearTimeout(moreNavCloseTimerRef.current); moreNavCloseTimerRef.current = null; } setMoreNavOpen(true); }} onMouseLeave={() => { moreNavCloseTimerRef.current = setTimeout(() => setMoreNavOpen(false), 150); }}>
              <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px 7px 4px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#9B9A98', background: 'transparent', fontFamily: "'DM Sans', sans-serif", width: '100%', boxSizing: 'border-box' }}>
                More <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>
              </button>
              {moreNavOpen && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'white', borderRadius: 10, padding: '4px 0', boxShadow: '0 4px 16px rgba(0,0,0,0.10)', zIndex: 50 }}>
                  {[{ label: 'Learn', to: createPageUrl("ComingSoon") }, { label: 'Loan Help', to: createPageUrl("LoanHelp") }].map(({ label, to }) => (
                    <Link key={label} to={to} onClick={() => setMoreNavOpen(false)} style={{ display: 'block', padding: '8px 14px', fontSize: 13, fontWeight: 500, color: '#1A1918', textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{label}</Link>
                  ))}
                  <a href="https://www.vony-lending.com/help" target="_blank" rel="noopener noreferrer" style={{ display: 'block', padding: '8px 14px', fontSize: 13, fontWeight: 500, color: '#1A1918', textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Help & Support</a>
                  <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '4px 14px' }} />
                  <button onClick={() => { setMoreNavOpen(false); logout?.(); }} style={{ display: 'block', width: '100%', padding: '8px 14px', fontSize: 13, fontWeight: 500, color: '#E8726E', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: "'DM Sans', sans-serif" }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,114,110,0.06)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Log Out</button>
                </div>
              )}
            </div>
          </nav>
        </div>
      </div>

      {/* ── CENTER: Search for Friends + Friend Requests ── */}
      <div className="mesh-center" style={{ background: 'white', borderRight: '1px solid rgba(0,0,0,0.08)', padding: '40px 40px 60px' }}>

        {/* Search for Friends */}
        <PageCard title="Search for Friends" style={{ marginBottom: 16 }}>
          <div style={{ padding: '10px 16px 16px' }}>
            <div style={{ position: 'relative', marginBottom: searchQuery.trim() ? 14 : 0 }}>
              <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#C7C6C4' }} />
              <input type="text" placeholder="Search by username..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '10px 36px 10px 38px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.03)', fontSize: 13, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(130,240,185,0.4)'} onBlur={(e) => e.target.style.borderColor = 'rgba(0,0,0,0.08)'} />
              {searchQuery && <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#787776', padding: 2 }}><X size={16} /></button>}
            </div>
            {searchQuery.trim() && (
              <div>
                {allSearchResults.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px 0' }}><p style={{ fontSize: 13, color: '#787776', margin: 0 }}>No users found</p></div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {allSearchResults.map((profile) => {
                      const receivedRequest = getReceivedRequestFrom(profile.user_id);
                      const sentRequest = getSentRequestTo(profile.user_id);
                      return (
                        <div key={profile.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                          <img src={profile.profile_picture_url || profile.avatar_url || defaultAvatarUrl(profile.full_name)} alt={profile.full_name || 'User'} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 500, color: '#1A1918', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.full_name || profile.username}</p>
                            <p style={{ fontSize: 11, color: '#787776', margin: '2px 0 0' }}>@{profile.username}</p>
                          </div>
                          {receivedRequest ? (
                            <button onClick={() => handleAcceptRequestFromSearch(receivedRequest.id)} disabled={processingId === receivedRequest.id} style={{ padding: '6px 12px', borderRadius: 10, border: 'none', background: '#82F0B9', fontSize: 11, fontWeight: 600, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'DM Sans', sans-serif", opacity: processingId === receivedRequest.id ? 0.5 : 1 }}>
                              <CheckCircle size={14} /> Accept
                            </button>
                          ) : sentRequest ? (
                            <button onClick={() => handleCancelRequest(sentRequest.id)} disabled={processingId === sentRequest.id} style={{ padding: '6px 12px', borderRadius: 10, border: 'none', background: 'rgba(232,114,110,0.08)', fontSize: 11, fontWeight: 600, color: '#E8726E', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'DM Sans', sans-serif", opacity: processingId === sentRequest.id ? 0.5 : 1 }}>
                              <UserMinus size={14} /> Unsend Request
                            </button>
                          ) : (
                            <button onClick={() => handleSendRequest(profile.user_id)} disabled={processingId === profile.user_id} style={{ padding: '6px 12px', borderRadius: 10, border: 'none', background: '#82F0B9', fontSize: 11, fontWeight: 600, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'DM Sans', sans-serif", opacity: processingId === profile.user_id ? 0.5 : 1 }}>
                              <Send size={14} /> Send Request
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
        </PageCard>

        {/* Friend Requests (Received) */}
        {receivedRequests.length > 0 && (
          <PageCard title="Friend Requests" headerRight={<span style={{ fontSize: 12, color: '#787776' }}>{receivedRequests.length} pending</span>}>
            <div style={{ padding: '10px 16px 16px' }}>
              {receivedRequests.map((request) => {
                const profile = getProfileById(request.user_id);
                if (!profile) return null;
                return (
                  <div key={request.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <img src={profile.profile_picture_url || profile.avatar_url || defaultAvatarUrl(profile.full_name)} alt={profile.full_name || 'User'} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#1A1918', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.full_name || profile.username}</p>
                      <p style={{ fontSize: 11, color: '#787776', margin: '2px 0 0' }}>@{profile.username}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button onClick={() => handleAcceptRequestFromSearch(request.id)} disabled={processingId === request.id} style={{ padding: '6px 12px', borderRadius: 10, border: 'none', background: '#82F0B9', fontSize: 11, fontWeight: 600, color: 'white', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: processingId === request.id ? 0.5 : 1 }}>Confirm</button>
                      <button onClick={() => handleCancelRequest(request.id)} disabled={processingId === request.id} style={{ padding: '6px 12px', borderRadius: 10, border: 'none', background: 'rgba(232,114,110,0.08)', fontSize: 11, fontWeight: 600, color: '#E8726E', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: processingId === request.id ? 0.5 : 1 }}>Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </PageCard>
        )}
      </div>

      {/* ── RIGHT: Your Friends ── */}
      <div className="mesh-right" style={{ background: '#F5F4F0' }}>
        <div style={{ position: 'sticky', top: 0, padding: '28px 28px 0' }}>
          {/* Bell + Profile icons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginBottom: 24 }}>
            <Link to={createPageUrl("Requests")} style={{ position: 'relative', textDecoration: 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#787776" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </div>
            </Link>
            <Link to={createPageUrl("Profile")} style={{ textDecoration: 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(3,172,234,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#03ACEA" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              </div>
            </Link>
          </div>
        <RightSection title="Your Friends">
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
              <div style={{ width: 24, height: 24, border: '2px solid #82F0B9', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : sortedFriends.length === 0 ? (
            <div style={{ fontSize: 12, color: '#9B9A98', textAlign: 'center', padding: '12px 0' }}>No friends yet</div>
          ) : sortedFriends.map((friendship) => {
            const friendProfile = getFriendProfile(friendship);
            if (!friendProfile) return null;
            return (
              <div key={friendship.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(130,240,185,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                  {friendProfile.profile_picture_url || friendProfile.avatar_url
                    ? <img src={friendProfile.profile_picture_url || friendProfile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 11, fontWeight: 600, color: '#52B788' }}>{(friendProfile.full_name || friendProfile.username || '?').charAt(0)}</span>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{friendProfile.full_name || friendProfile.username}</div>
                  <div style={{ fontSize: 11, color: '#9B9A98' }}>@{friendProfile.username}</div>
                </div>
                <button onClick={() => handleToggleStar(friendship)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: friendship.is_starred ? '#F5A623' : '#C7C6C4', flexShrink: 0 }}>
                  <Star size={14} fill={friendship.is_starred ? 'currentColor' : 'none'} />
                </button>
              </div>
            );
          })}
        </RightSection>
        </div>
      </div>

    </div>
  );
}

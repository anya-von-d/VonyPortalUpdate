import React, { useState, useEffect } from "react";
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
import MeshMobileNav from "@/components/MeshMobileNav";

export default function Friends() {
  const { user: authUser, userProfile, logout } = useAuth();
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
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.5 },
        colors: ['#03ACEA', '#7C3AED', '#03ACEA', '#ffffff'],
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

  const RightSection = ({ title, children }) => (
    <div style={{ marginBottom: 40 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 9 }}>{title}</div>
      <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', marginBottom: 14 }} />
      {children}
    </div>
  );

  return (
    <div>
      <MeshMobileNav user={user} activePage="Friends" />
      <div className="mesh-layout" style={{ display: 'grid', gridTemplateColumns: '180px 1fr 300px', gap: 0, minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14, lineHeight: 1.5, color: '#1A1918', WebkitFontSmoothing: 'antialiased' }}>

      {/* Col 1: left nav */}
      <div className="mesh-left" style={{ background: '#fafafa', borderRight: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ position: 'sticky', top: 0, padding: '24px 8px 0' }}>
          <Link to="/" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontStyle: 'italic', fontSize: '1.3rem', color: '#1A1918', textDecoration: 'none', display: 'block', marginBottom: 16, paddingLeft: 6, lineHeight: 1, letterSpacing: '-0.02em' }}>Vony</Link>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              { label: 'Home', to: '/' },
              { label: 'Upcoming', to: createPageUrl("Upcoming") },
              { label: 'Create Loan', to: createPageUrl("CreateOffer") },
              { label: 'Record Payment', to: createPageUrl("RecordPayment") },
              { label: 'My Loans', to: createPageUrl("YourLoans") },
              { label: 'Friends', to: createPageUrl("Friends") },
              { label: 'Recent Activity', to: createPageUrl("RecentActivity") },
              { label: 'Documents', to: createPageUrl("LoanAgreements") },
            ].map(({ label, to }) => {
              const currentPath = window.location.pathname;
              const isActive = to === '/' ? currentPath === '/' : currentPath.includes(to.split('?')[0].replace('/app/', ''));
              const navIcons = {
                'Home': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
                'Upcoming': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
                'Create Loan': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
                'Record Payment': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
                'My Loans': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
                'Friends': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
                'Recent Activity': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
                'Documents': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
              };
              return (
                <Link key={label} to={to} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 9, textDecoration: 'none',
                  fontSize: 13, fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#1A1918' : '#787776',
                  background: isActive ? 'rgba(0,0,0,0.05)' : 'transparent',
                  fontFamily: "'DM Sans', sans-serif", width: '100%', boxSizing: 'border-box',
                }}>
                  <span style={{ flexShrink: 0, opacity: isActive ? 1 : 0.6 }}>{navIcons[label]}</span>
                  {label}
                </Link>
              );
            })}
            {/* Coming Soon section */}
            <div style={{ marginTop: 16, marginBottom: 4, paddingLeft: 12 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Coming Soon</span>
            </div>
            {[
              { label: 'Learn', to: createPageUrl("ComingSoon") },
              { label: 'Loan Help', to: createPageUrl("LoanHelp") },
            ].map(({ label, to }) => {
              const soonIcons = {
                'Learn': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
                'Loan Help': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
              };
              return (
                <Link key={label} to={to} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 12px', borderRadius: 9, textDecoration: 'none',
                  fontSize: 13, fontWeight: 500, color: '#787776',
                  background: 'transparent', fontFamily: "'DM Sans', sans-serif",
                  width: '100%', boxSizing: 'border-box',
                }}>
                  <span style={{ flexShrink: 0, opacity: 0.5 }}>{soonIcons[label]}</span>
                  <span style={{ flex: 1 }}>{label}</span>
                  <span style={{ fontSize: 8, fontWeight: 700, color: '#9B9A98', background: 'rgba(0,0,0,0.05)', borderRadius: 4, padding: '2px 6px', letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1.2, flexShrink: 0 }}>SOON</span>
                </Link>
              );
            })}
          </nav>
          {/* Help & Support + Log Out at bottom */}
          <div style={{ marginTop: 24 }}>
            <a href="https://www.vony-lending.com/help" target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 9, textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9B9A98" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#9B9A98' }}>Help & Support</span>
            </a>
            <button onClick={() => logout?.()} style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 9,
              border: 'none', cursor: 'pointer', background: 'transparent',
              fontFamily: "'DM Sans', sans-serif", width: '100%', boxSizing: 'border-box',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,114,110,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize: 12, fontWeight: 500, color: '#E8726E' }}>Log Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── CENTER: Search for Friends + Friend Requests ── */}
      <div className="mesh-center" style={{ background: 'white', borderRight: '1px solid rgba(0,0,0,0.06)', padding: '28px 48px 80px' }}>

        {/* Page title */}
        <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14, fontWeight: 600, color: '#1A1918', marginBottom: 12, letterSpacing: '-0.02em' }}>People</div>
        <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', marginBottom: 20 }} />

        {/* Search for Friends */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ position: 'relative', marginBottom: searchQuery.trim() ? 14 : 0 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#C7C6C4' }} />
            <input type="text" placeholder="Search by name or username..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '10px 36px 10px 36px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.06)', background: 'rgba(0,0,0,0.02)', fontSize: 13, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(3,172,234,0.3)'} onBlur={(e) => e.target.style.borderColor = 'rgba(0,0,0,0.06)'} />
            {searchQuery && <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#C7C6C4', padding: 2 }}><X size={14} /></button>}
          </div>
          {searchQuery.trim() && (
            <div>
              {allSearchResults.length === 0 ? (
                <div style={{ padding: '20px 0', color: '#9B9A98', fontSize: 13 }}>No users found</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {allSearchResults.map((profile) => {
                    const receivedRequest = getReceivedRequestFrom(profile.user_id);
                    const sentRequest = getSentRequestTo(profile.user_id);
                    return (
                      <div key={profile.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'rgba(3,172,234,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {profile.profile_picture_url || profile.avatar_url
                            ? <img src={profile.profile_picture_url || profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ fontSize: 13, fontWeight: 600, color: '#03ACEA' }}>{(profile.full_name || profile.username || '?').charAt(0).toUpperCase()}</span>
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: '#1A1918', margin: 0 }}>{profile.full_name || profile.username}</p>
                          <p style={{ fontSize: 11, color: '#9B9A98', margin: '1px 0 0' }}>@{profile.username}</p>
                        </div>
                        {receivedRequest ? (
                          <button onClick={() => handleAcceptRequestFromSearch(receivedRequest.id)} disabled={processingId === receivedRequest.id} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'rgba(3,172,234,0.12)', fontSize: 11, fontWeight: 600, color: '#03ACEA', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'DM Sans', sans-serif", opacity: processingId === receivedRequest.id ? 0.5 : 1 }}>
                            <CheckCircle size={13} /> Accept
                          </button>
                        ) : sentRequest ? (
                          <button onClick={() => handleCancelRequest(sentRequest.id)} disabled={processingId === sentRequest.id} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'rgba(232,114,110,0.08)', fontSize: 11, fontWeight: 600, color: '#E8726E', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'DM Sans', sans-serif", opacity: processingId === sentRequest.id ? 0.5 : 1 }}>
                            <UserMinus size={13} /> Unsend
                          </button>
                        ) : (
                          <button onClick={() => handleSendRequest(profile.user_id)} disabled={processingId === profile.user_id} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'rgba(3,172,234,0.08)', fontSize: 11, fontWeight: 600, color: '#03ACEA', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'DM Sans', sans-serif", opacity: processingId === profile.user_id ? 0.5 : 1 }}>
                            <Send size={13} /> Add
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

        {/* Friend Requests (Received) */}
        {receivedRequests.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Friend Requests</div>
              <span style={{ fontSize: 11, color: '#9B9A98' }}>{receivedRequests.length} pending</span>
            </div>
            <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', marginBottom: 14 }} />
            {receivedRequests.map((request) => {
              const profile = getProfileById(request.user_id);
              if (!profile) return null;
              return (
                <div key={request.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'rgba(3,172,234,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {profile.profile_picture_url || profile.avatar_url
                      ? <img src={profile.profile_picture_url || profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 13, fontWeight: 600, color: '#03ACEA' }}>{(profile.full_name || profile.username || '?').charAt(0).toUpperCase()}</span>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#1A1918', margin: 0 }}>{profile.full_name || profile.username}</p>
                    <p style={{ fontSize: 11, color: '#9B9A98', margin: '1px 0 0' }}>@{profile.username}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => handleAcceptRequestFromSearch(request.id)} disabled={processingId === request.id} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'rgba(3,172,234,0.12)', fontSize: 11, fontWeight: 600, color: '#03ACEA', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: processingId === request.id ? 0.5 : 1 }}>Confirm</button>
                    <button onClick={() => handleCancelRequest(request.id)} disabled={processingId === request.id} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'rgba(232,114,110,0.08)', fontSize: 11, fontWeight: 600, color: '#E8726E', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: processingId === request.id ? 0.5 : 1 }}>Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── RIGHT: Your Friends ── */}
      <div className="mesh-right" style={{ background: '#fafafa' }}>
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
              <div style={{ width: 24, height: 24, border: '2px solid #03ACEA', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : sortedFriends.length === 0 ? (
            <div style={{ fontSize: 12, color: '#9B9A98', textAlign: 'center', padding: '12px 0' }}>No friends yet</div>
          ) : sortedFriends.map((friendship) => {
            const friendProfile = getFriendProfile(friendship);
            if (!friendProfile) return null;
            return (
              <div key={friendship.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(3,172,234,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                  {friendProfile.profile_picture_url || friendProfile.avatar_url
                    ? <img src={friendProfile.profile_picture_url || friendProfile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 11, fontWeight: 600, color: '#03ACEA' }}>{(friendProfile.full_name || friendProfile.username || '?').charAt(0)}</span>
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
    </div>
  );
}

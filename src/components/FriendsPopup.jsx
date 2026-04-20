import React, { useState, useEffect, useRef } from 'react';
import { Friendship, PublicProfile } from '@/entities/all';
import { useAuth } from '@/lib/AuthContext';
import { Star, Search, X, Send, CheckCircle, UserMinus } from 'lucide-react';
import UserAvatar from '@/components/ui/UserAvatar';
import confetti from 'canvas-confetti';

const TABS = ['Your Friends', 'Find Your Friends', 'Invite'];

export default function FriendsPopup({ onClose }) {
  const { user: authUser, userProfile } = useAuth();
  const user = userProfile ? { ...userProfile, id: authUser?.id } : null;

  const [activeTab, setActiveTab] = useState('Your Friends');
  const [friends, setFriends] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);

  const popupRef = useRef(null);

  // Click outside to close
  useEffect(() => {
    const handler = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  useEffect(() => {
    if (user?.id) loadFriendsData();
  }, [user?.id]);

  const loadFriendsData = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const [allFriendships, allProfiles] = await Promise.all([
        Friendship.list().catch(() => []),
        PublicProfile.list().catch(() => []),
      ]);
      setProfiles(allProfiles);
      const acceptedFriends = allFriendships.filter(f =>
        f.status === 'accepted' && (f.user_id === user.id || f.friend_id === user.id)
      );
      setFriends(acceptedFriends);
      const pending = allFriendships.filter(f => f.status === 'pending' && f.user_id === user.id);
      setSentRequests(pending);
      const received = allFriendships.filter(f => f.status === 'pending' && f.friend_id === user.id);
      setReceivedRequests(received);
    } catch (error) {
      console.error('Error loading friends data:', error);
    }
    setIsLoading(false);
  };

  const getFriendProfile = (friendship) => {
    const friendId = friendship.user_id === user?.id ? friendship.friend_id : friendship.user_id;
    return profiles.find(p => p.user_id === friendId);
  };

  const getReceivedRequestFrom = (userId) => receivedRequests.find(r => r.user_id === userId);
  const getSentRequestTo = (userId) => sentRequests.find(r => r.friend_id === userId);

  const sortedFriends = [...friends].sort((a, b) => {
    const aStarred = a.is_starred && (a.user_id === user?.id || a.friend_id === user?.id);
    const bStarred = b.is_starred && (b.user_id === user?.id || b.friend_id === user?.id);
    if (aStarred && !bStarred) return -1;
    if (!aStarred && bStarred) return 1;
    const aProfile = getFriendProfile(a);
    const bProfile = getFriendProfile(b);
    return (aProfile?.full_name || aProfile?.username || '').localeCompare(bProfile?.full_name || bProfile?.username || '');
  });

  const getSearchResultsWithPending = () => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return profiles.filter(profile => {
      if (profile.user_id === user?.id) return false;
      const isFriend = friends.some(f => f.user_id === profile.user_id || f.friend_id === profile.user_id);
      if (isFriend) return false;
      const usernameMatch = profile.username?.toLowerCase().includes(query);
      const nameMatch = profile.full_name?.toLowerCase().includes(query);
      return usernameMatch || nameMatch;
    });
  };

  const allSearchResults = getSearchResultsWithPending();

  const handleToggleStar = async (friendship) => {
    if (processingId) return;
    setProcessingId(friendship.id);
    try {
      await Friendship.update(friendship.id, { is_starred: !friendship.is_starred });
      await loadFriendsData();
    } catch (error) {
      console.error('Error toggling star:', error);
    }
    setProcessingId(null);
  };

  const handleSendRequest = async (friendUserId) => {
    if (!user?.id || processingId) return;
    setProcessingId(friendUserId);
    try {
      await Friendship.create({ user_id: user.id, friend_id: friendUserId, status: 'pending', is_starred: false });
      await loadFriendsData();
    } catch (error) {
      console.error('Error sending friend request:', error);
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
      console.error('Error canceling request:', error);
    }
    setProcessingId(null);
  };

  const handleAcceptRequestFromSearch = async (friendshipId) => {
    if (processingId) return;
    setProcessingId(friendshipId);
    try {
      await Friendship.update(friendshipId, { status: 'accepted' });
      await loadFriendsData();
      setSearchQuery('');
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.5 }, colors: ['#03ACEA', '#7C3AED', '#03ACEA', '#ffffff'], zIndex: 9999 });
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
    setProcessingId(null);
  };

  const tabStyle = (tab) => ({
    flex: 1,
    padding: '8px 4px',
    background: 'none',
    border: 'none',
    borderBottom: activeTab === tab ? '2px solid #1A1918' : '2px solid transparent',
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: activeTab === tab ? 700 : 500,
    color: activeTab === tab ? '#1A1918' : '#9B9A98',
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: '-0.01em',
    transition: 'color 0.15s',
    whiteSpace: 'nowrap',
  });

  return (
    <div
      ref={popupRef}
      style={{
        position: 'fixed',
        top: 58,
        right: 20,
        zIndex: 400,
        width: 380,
        maxHeight: 520,
        background: 'white',
        borderRadius: 14,
        boxShadow: '0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
        fontFamily: "'DM Sans', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.01em' }}>Friends</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#9B9A98', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={16} />
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.07)', padding: '0 12px' }}>
        {TABS.map(tab => (
          <button key={tab} style={tabStyle(tab)} onClick={() => setActiveTab(tab)}>{tab}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px 16px' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
            <div style={{ width: 24, height: 24, border: '2px solid #03ACEA', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : activeTab === 'Your Friends' ? (
          sortedFriends.length === 0 ? (
            <div style={{ fontSize: 12, color: '#9B9A98', textAlign: 'center', padding: '20px 0' }}>No friends yet — invite some!</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {sortedFriends.map(friendship => {
                const friendProfile = getFriendProfile(friendship);
                if (!friendProfile) return null;
                return (
                  <div key={friendship.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <UserAvatar name={friendProfile.full_name || friendProfile.username} src={friendProfile.profile_picture_url || friendProfile.avatar_url} size={30} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{friendProfile.full_name || friendProfile.username}</div>
                      <div style={{ fontSize: 11, color: '#9B9A98' }}>@{friendProfile.username}</div>
                    </div>
                    <button onClick={() => handleToggleStar(friendship)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: friendship.is_starred ? '#F5A623' : '#C7C6C4', flexShrink: 0 }}>
                      <Star size={14} fill={friendship.is_starred ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                );
              })}
            </div>
          )
        ) : activeTab === 'Find Your Friends' ? (
          <div>
            {/* Search input */}
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#C7C6C4' }} />
              <input
                type="text"
                placeholder="Search by name or username..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '9px 32px 9px 32px', borderRadius: 9, border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.02)', fontSize: 12, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = 'rgba(3,172,234,0.3)'}
                onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.08)'}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#C7C6C4', padding: 2 }}>
                  <X size={13} />
                </button>
              )}
            </div>

            {searchQuery.trim() ? (
              allSearchResults.length === 0 ? (
                <div style={{ padding: '8px 0', color: '#9B9A98', fontSize: 13 }}>No users found</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {allSearchResults.map(profile => {
                    const receivedRequest = getReceivedRequestFrom(profile.user_id);
                    const sentRequest = getSentRequestTo(profile.user_id);
                    return (
                      <div key={profile.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                        <UserAvatar name={profile.full_name || profile.username} src={profile.profile_picture_url || profile.avatar_url} size={30} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: '#1A1918', margin: 0 }}>{profile.full_name || profile.username}</p>
                          <p style={{ fontSize: 11, color: '#9B9A98', margin: '1px 0 0' }}>@{profile.username}</p>
                        </div>
                        {receivedRequest ? (
                          <button onClick={() => handleAcceptRequestFromSearch(receivedRequest.id)} disabled={processingId === receivedRequest.id} style={{ padding: '5px 12px', borderRadius: 7, border: 'none', background: 'rgba(3,172,234,0.12)', fontSize: 11, fontWeight: 600, color: '#03ACEA', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'DM Sans', sans-serif", opacity: processingId === receivedRequest.id ? 0.5 : 1 }}>
                            <CheckCircle size={12} /> Accept
                          </button>
                        ) : sentRequest ? (
                          <button onClick={() => handleCancelRequest(sentRequest.id)} disabled={processingId === sentRequest.id} style={{ padding: '5px 12px', borderRadius: 7, border: 'none', background: 'rgba(232,114,110,0.08)', fontSize: 11, fontWeight: 600, color: '#E8726E', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'DM Sans', sans-serif", opacity: processingId === sentRequest.id ? 0.5 : 1 }}>
                            <UserMinus size={12} /> Unsend
                          </button>
                        ) : (
                          <button onClick={() => handleSendRequest(profile.user_id)} disabled={processingId === profile.user_id} style={{ padding: '5px 12px', borderRadius: 7, border: 'none', background: 'rgba(3,172,234,0.08)', fontSize: 11, fontWeight: 600, color: '#03ACEA', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'DM Sans', sans-serif", opacity: processingId === profile.user_id ? 0.5 : 1 }}>
                            <Send size={12} /> Add
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : receivedRequests.length > 0 ? (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#9B9A98', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 10 }}>Friend Requests</div>
                {receivedRequests.map(request => {
                  const profile = profiles.find(p => p.user_id === request.user_id);
                  if (!profile) return null;
                  return (
                    <div key={request.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                      <UserAvatar name={profile.full_name || profile.username} src={profile.profile_picture_url || profile.avatar_url} size={30} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: '#1A1918', margin: 0 }}>{profile.full_name || profile.username}</p>
                        <p style={{ fontSize: 11, color: '#9B9A98', margin: '1px 0 0' }}>@{profile.username}</p>
                      </div>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button onClick={() => handleAcceptRequestFromSearch(request.id)} disabled={processingId === request.id} style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: 'rgba(3,172,234,0.12)', fontSize: 11, fontWeight: 600, color: '#03ACEA', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: processingId === request.id ? 0.5 : 1 }}>Confirm</button>
                        <button onClick={() => handleCancelRequest(request.id)} disabled={processingId === request.id} style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: 'rgba(232,114,110,0.08)', fontSize: 11, fontWeight: 600, color: '#E8726E', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: processingId === request.id ? 0.5 : 1 }}>Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#9B9A98', textAlign: 'center', padding: '16px 0' }}>Search for friends by name or username</div>
            )}
          </div>
        ) : (
          /* Invite tab */
          <div>
            <p style={{ fontSize: 12, color: '#787776', marginBottom: 16, marginTop: 4 }}>Don't see your friends on Vony? Invite them to join you.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a
                href="sms:?body=Hey! Join me on Vony — an easy way to manage loans with friends. Sign up here: https://www.vony-lending.com"
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10, background: '#F8F8F8', fontSize: 13, color: '#1A1918', textDecoration: 'none', fontWeight: 500 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#787776" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                Send via SMS
              </a>
              <a
                href="mailto:?subject=Join me on Vony&body=Hey!%0A%0AI've been using Vony to manage loans with friends and wanted to invite you.%0A%0ASign up here: https://www.vony-lending.com"
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10, background: '#F8F8F8', fontSize: 13, color: '#1A1918', textDecoration: 'none', fontWeight: 500 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#787776" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                Send via Email
              </a>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText('https://www.vony-lending.com').then(() => {
                    setInviteLinkCopied(true);
                    setTimeout(() => setInviteLinkCopied(false), 2000);
                  });
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10, background: inviteLinkCopied ? 'rgba(22,163,74,0.08)' : '#F8F8F8', fontSize: 13, color: inviteLinkCopied ? '#16A34A' : '#1A1918', fontWeight: 500, border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', fontFamily: "'DM Sans', sans-serif" }}
              >
                {inviteLinkCopied
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#787776" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                }
                {inviteLinkCopied ? 'Link copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

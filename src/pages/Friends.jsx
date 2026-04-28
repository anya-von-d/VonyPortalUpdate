import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Friendship, PublicProfile } from '@/entities/all';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import { Star, Search, X, Send, CheckCircle, UserMinus, ChevronDown } from 'lucide-react';
import UserAvatar from '@/components/ui/UserAvatar';
import confetti from 'canvas-confetti';
import MoreMenu from '@/components/MoreMenu';
import BlockConfirmModal from '@/components/BlockConfirmModal';
import MeshMobileNav from '@/components/MeshMobileNav';
import DesktopSidebar from '@/components/DesktopSidebar';

const TABS = ['Friends', 'Add', 'Invite'];

export default function Friends() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user: authUser, userProfile } = useAuth();
  const user = userProfile ? { ...userProfile, id: authUser?.id } : null;

  const initialTab = searchParams.get('tab') || 'Friends';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [friends, setFriends] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [allFriendshipsRaw, setAllFriendshipsRaw] = useState([]);
  const [blockedIds, setBlockedIds] = useState(new Set());
  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(searchParams.get('requests') === '1');
  const [blockTarget, setBlockTarget] = useState(null);

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
      setAllFriendshipsRaw(allFriendships);
      setProfiles(allProfiles);

      const blocked = allFriendships.filter(f =>
        f.status === 'blocked' && (f.user_id === user.id || f.friend_id === user.id)
      );
      const bids = new Set(blocked.map(r => r.user_id === user.id ? r.friend_id : r.user_id));
      setBlockedIds(bids);

      setFriends(allFriendships.filter(f =>
        f.status === 'accepted' && (f.user_id === user.id || f.friend_id === user.id)
      ).filter(f => !bids.has(f.user_id === user.id ? f.friend_id : f.user_id)));

      setSentRequests(allFriendships.filter(f => f.status === 'pending' && f.user_id === user.id && !bids.has(f.friend_id)));
      setReceivedRequests(allFriendships.filter(f => f.status === 'pending' && f.friend_id === user.id && !bids.has(f.user_id)));
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const performBlock = async (targetUserId) => {
    if (!user?.id) return;
    const existing = allFriendshipsRaw.filter(f =>
      (f.user_id === user.id && f.friend_id === targetUserId) ||
      (f.user_id === targetUserId && f.friend_id === user.id)
    );
    try {
      for (const row of existing) { try { await Friendship.delete(row.id); } catch (_) {} }
      await Friendship.create({ user_id: user.id, friend_id: targetUserId, status: 'blocked', is_starred: false });
      await loadFriendsData();
    } catch (e) { console.error(e); }
  };

  const getFriendProfile = (friendship) => {
    const friendId = friendship.user_id === user?.id ? friendship.friend_id : friendship.user_id;
    return profiles.find(p => p.user_id === friendId);
  };

  const getReceivedRequestFrom = (userId) => receivedRequests.find(r => r.user_id === userId);
  const getSentRequestTo = (userId) => sentRequests.find(r => r.friend_id === userId);

  const sortedFriends = [...friends].sort((a, b) => {
    if (a.is_starred && !b.is_starred) return -1;
    if (!a.is_starred && b.is_starred) return 1;
    const ap = getFriendProfile(a); const bp = getFriendProfile(b);
    return (ap?.full_name || ap?.username || '').localeCompare(bp?.full_name || bp?.username || '');
  });

  const searchResults = searchQuery.trim()
    ? profiles.filter(p => {
        if (p.user_id === user?.id || blockedIds.has(p.user_id)) return false;
        if (friends.some(f => f.user_id === p.user_id || f.friend_id === p.user_id)) return false;
        const q = searchQuery.toLowerCase();
        return p.username?.toLowerCase().includes(q) || p.full_name?.toLowerCase().includes(q);
      })
    : [];

  const handleToggleStar = async (friendship) => {
    if (processingId) return;
    setProcessingId(friendship.id);
    try { await Friendship.update(friendship.id, { is_starred: !friendship.is_starred }); await loadFriendsData(); } catch (e) {}
    setProcessingId(null);
  };

  const handleSendRequest = async (friendUserId) => {
    if (!user?.id || processingId) return;
    setProcessingId(friendUserId);
    try { await Friendship.create({ user_id: user.id, friend_id: friendUserId, status: 'pending', is_starred: false }); await loadFriendsData(); } catch (e) {}
    setProcessingId(null);
  };

  const handleCancelRequest = async (friendshipId) => {
    if (processingId) return;
    setProcessingId(friendshipId);
    try { await Friendship.delete(friendshipId); await loadFriendsData(); } catch (e) {}
    setProcessingId(null);
  };

  const handleAccept = async (friendshipId) => {
    if (processingId) return;
    setProcessingId(friendshipId);
    try {
      await Friendship.update(friendshipId, { status: 'accepted' });
      await loadFriendsData();
      setSearchQuery('');
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.5 }, colors: ['#03ACEA', '#7C3AED', '#ffffff'], zIndex: 9999 });
    } catch (e) {}
    setProcessingId(null);
  };

  if (!user) return null;

  return (
    <div style={{ minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", background: 'transparent' }}>
      <MeshMobileNav user={user} activePage="Friends" />
      <div className="mesh-layout" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 0, minHeight: '100vh' }}>
        <DesktopSidebar />

        <div className="mesh-center" style={{ background: 'transparent', padding: '24px 40px 80px', maxWidth: 680, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

          {/* Page title */}
          <div className="desktop-page-title" style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1A1918', margin: 0, letterSpacing: '-0.03em', fontFamily: "'DM Sans', sans-serif" }}>Friends</h1>
          </div>
          <div className="mobile-page-title">
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1918', margin: '0 0 16px', letterSpacing: '-0.03em', fontFamily: "'DM Sans', sans-serif" }}>Friends</h1>
          </div>

          {/* Tab selector */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.05)', borderRadius: 12, padding: 3, gap: 2, marginBottom: 28 }}>
            {TABS.map(tab => {
              const active = activeTab === tab;
              const badge = tab === 'Friends' && receivedRequests.length > 0 ? receivedRequests.length : null;
              return (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  flex: 1, padding: '8px 12px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  background: active ? '#fff' : 'transparent',
                  color: active ? '#1A1918' : '#787776',
                  fontSize: 13, fontWeight: active ? 600 : 500,
                  fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.01em',
                  boxShadow: active ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  {tab}
                  {badge && (
                    <span style={{ minWidth: 18, height: 18, borderRadius: 9, background: '#03ACEA', color: '#fff', fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
              <div style={{ width: 28, height: 28, border: '2px solid #03ACEA', borderTopColor: 'transparent', borderRadius: '50%' }} className="animate-spin" />
            </div>
          ) : activeTab === 'Friends' ? (
            <FriendsTab
              sortedFriends={sortedFriends}
              receivedRequests={receivedRequests}
              profiles={profiles}
              user={user}
              processingId={processingId}
              requestsOpen={requestsOpen}
              setRequestsOpen={setRequestsOpen}
              getFriendProfile={getFriendProfile}
              handleToggleStar={handleToggleStar}
              handleAccept={handleAccept}
              handleCancelRequest={handleCancelRequest}
              setBlockTarget={setBlockTarget}
            />
          ) : activeTab === 'Add' ? (
            <AddTab
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchResults={searchResults}
              receivedRequests={receivedRequests}
              profiles={profiles}
              processingId={processingId}
              getReceivedRequestFrom={getReceivedRequestFrom}
              getSentRequestTo={getSentRequestTo}
              handleSendRequest={handleSendRequest}
              handleCancelRequest={handleCancelRequest}
              handleAccept={handleAccept}
              setBlockTarget={setBlockTarget}
              user={user}
            />
          ) : (
            <InviteTab inviteLinkCopied={inviteLinkCopied} setInviteLinkCopied={setInviteLinkCopied} />
          )}
        </div>
      </div>

      <BlockConfirmModal
        open={!!blockTarget}
        name={blockTarget?.name}
        isWorking={processingId === 'block'}
        onBack={() => setBlockTarget(null)}
        onConfirm={async () => {
          if (!blockTarget) return;
          setProcessingId('block');
          await performBlock(blockTarget.userId);
          setProcessingId(null);
          setBlockTarget(null);
        }}
      />
    </div>
  );
}

/* ── Friends tab ── */
function FriendsTab({ sortedFriends, receivedRequests, profiles, user, processingId, requestsOpen, setRequestsOpen, getFriendProfile, handleToggleStar, handleAccept, handleCancelRequest, setBlockTarget }) {
  return (
    <div>
      {/* Pending requests card */}
      {receivedRequests.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: 20, overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => setRequestsOpen(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', padding: '14px 18px', border: 'none', background: 'transparent', cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(3,172,234,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#03ACEA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
                </svg>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1918', fontFamily: "'DM Sans', sans-serif" }}>
                  Friend Request{receivedRequests.length > 1 ? 's' : ''}
                </div>
                <div style={{ fontSize: 12, color: '#787776', fontFamily: "'DM Sans', sans-serif" }}>
                  {receivedRequests.length} pending
                </div>
              </div>
            </div>
            <ChevronDown size={16} style={{ color: '#9B9A98', transition: 'transform 0.15s', transform: requestsOpen ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }} />
          </button>

          {requestsOpen && (
            <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', padding: '4px 0 8px' }}>
              {receivedRequests.map(request => {
                const profile = profiles.find(p => p.user_id === request.user_id);
                if (!profile) return null;
                const displayName = profile.full_name || profile.username;
                return (
                  <div key={request.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px' }}>
                    <UserAvatar name={displayName} src={profile.profile_picture_url || profile.avatar_url} size={42} radius={21} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif" }}>{displayName}</div>
                      <div style={{ fontSize: 12, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif" }}>@{profile.username}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => handleAccept(request.id)} disabled={processingId === request.id}
                        style={{ padding: '7px 14px', borderRadius: 10, border: 'none', background: '#03ACEA', fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: processingId === request.id ? 0.5 : 1 }}>
                        Accept
                      </button>
                      <button onClick={() => handleCancelRequest(request.id)} disabled={processingId === request.id}
                        style={{ padding: '7px 14px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.09)', background: 'transparent', fontSize: 12, fontWeight: 600, color: '#787776', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: processingId === request.id ? 0.5 : 1 }}>
                        Decline
                      </button>
                    </div>
                    <MoreMenu items={[{ label: 'Block', danger: true, onClick: () => setBlockTarget({ userId: profile.user_id, name: displayName, requestId: request.id }) }]} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Friends list */}
      {sortedFriends.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#1A1918', margin: '0 0 6px', fontFamily: "'DM Sans', sans-serif" }}>No friends yet</p>
          <p style={{ fontSize: 13, color: '#9B9A98', margin: 0, fontFamily: "'DM Sans', sans-serif" }}>Search for people to connect with</p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          {sortedFriends.map((friendship, idx) => {
            const friendProfile = getFriendProfile(friendship);
            if (!friendProfile) return null;
            const displayName = friendProfile.full_name || friendProfile.username;
            const isLast = idx === sortedFriends.length - 1;
            return (
              <div key={friendship.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', borderBottom: isLast ? 'none' : '1px solid rgba(0,0,0,0.05)' }}>
                <UserAvatar name={displayName} src={friendProfile.profile_picture_url || friendProfile.avatar_url} size={42} radius={21} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif" }}>{displayName}</div>
                  <div style={{ fontSize: 12, color: '#9B9A98', marginTop: 1, fontFamily: "'DM Sans', sans-serif" }}>@{friendProfile.username}</div>
                </div>
                <button onClick={() => handleToggleStar(friendship)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: friendship.is_starred ? '#F5A623' : '#D1D0CE', flexShrink: 0 }}>
                  <Star size={16} fill={friendship.is_starred ? 'currentColor' : 'none'} />
                </button>
                <MoreMenu items={[
                  { label: 'Unfriend', onClick: () => handleCancelRequest(friendship.id) },
                  { label: 'Block', danger: true, onClick: () => setBlockTarget({ userId: friendProfile.user_id, name: displayName }) },
                ]} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Add tab ── */
function AddTab({ searchQuery, setSearchQuery, searchResults, receivedRequests, profiles, processingId, getReceivedRequestFrom, getSentRequestTo, handleSendRequest, handleCancelRequest, handleAccept, setBlockTarget, user }) {
  return (
    <div>
      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#B0AEA8', pointerEvents: 'none' }} />
        <input
          type="text"
          placeholder="Search by name or username…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          autoFocus
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '12px 40px 12px 42px',
            borderRadius: 14, border: '1px solid rgba(0,0,0,0.08)',
            background: '#fff', fontSize: 14,
            color: '#1A1918', fontFamily: "'DM Sans', sans-serif",
            outline: 'none', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          }}
          onFocus={e => e.target.style.borderColor = 'rgba(3,172,234,0.4)'}
          onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.08)'}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.07)', border: 'none', cursor: 'pointer', color: '#787776', padding: 0, width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={12} />
          </button>
        )}
      </div>

      {searchQuery.trim() ? (
        searchResults.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#9B9A98', fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>No users found for "{searchQuery}"</div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            {searchResults.map((profile, idx) => {
              const receivedRequest = getReceivedRequestFrom(profile.user_id);
              const sentRequest = getSentRequestTo(profile.user_id);
              const displayName = profile.full_name || profile.username;
              const isLast = idx === searchResults.length - 1;
              return (
                <div key={profile.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', borderBottom: isLast ? 'none' : '1px solid rgba(0,0,0,0.05)' }}>
                  <UserAvatar name={displayName} src={profile.profile_picture_url || profile.avatar_url} size={42} radius={21} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif" }}>{displayName}</div>
                    <div style={{ fontSize: 12, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif" }}>@{profile.username}</div>
                  </div>
                  {receivedRequest ? (
                    <button onClick={() => handleAccept(receivedRequest.id)} disabled={processingId === receivedRequest.id}
                      style={{ padding: '7px 14px', borderRadius: 10, border: 'none', background: '#03ACEA', fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: processingId === receivedRequest.id ? 0.5 : 1, whiteSpace: 'nowrap' }}>
                      Accept
                    </button>
                  ) : sentRequest ? (
                    <button onClick={() => handleCancelRequest(sentRequest.id)} disabled={processingId === sentRequest.id}
                      style={{ padding: '7px 14px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.09)', background: 'transparent', fontSize: 12, fontWeight: 600, color: '#787776', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: processingId === sentRequest.id ? 0.5 : 1, whiteSpace: 'nowrap' }}>
                      Requested
                    </button>
                  ) : (
                    <button onClick={() => handleSendRequest(profile.user_id)} disabled={processingId === profile.user_id}
                      style={{ padding: '7px 14px', borderRadius: 10, border: 'none', background: '#03ACEA', fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: processingId === profile.user_id ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                      <Send size={12} /> Add
                    </button>
                  )}
                  <MoreMenu items={[{ label: 'Block', danger: true, onClick: () => setBlockTarget({ userId: profile.user_id, name: displayName }) }]} />
                </div>
              );
            })}
          </div>
        )
      ) : receivedRequests.length > 0 ? (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12, fontFamily: "'DM Sans', sans-serif" }}>Pending requests</div>
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            {receivedRequests.map((request, idx) => {
              const profile = profiles.find(p => p.user_id === request.user_id);
              if (!profile) return null;
              const displayName = profile.full_name || profile.username;
              const isLast = idx === receivedRequests.length - 1;
              return (
                <div key={request.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', borderBottom: isLast ? 'none' : '1px solid rgba(0,0,0,0.05)' }}>
                  <UserAvatar name={displayName} src={profile.profile_picture_url || profile.avatar_url} size={42} radius={21} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif" }}>{displayName}</div>
                    <div style={{ fontSize: 12, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif" }}>@{profile.username}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => handleAccept(request.id)} disabled={processingId === request.id}
                      style={{ padding: '7px 14px', borderRadius: 10, border: 'none', background: '#03ACEA', fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: processingId === request.id ? 0.5 : 1 }}>
                      Confirm
                    </button>
                    <button onClick={() => handleCancelRequest(request.id)} disabled={processingId === request.id}
                      style={{ padding: '7px 14px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.09)', background: 'transparent', fontSize: 12, fontWeight: 600, color: '#787776', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: processingId === request.id ? 0.5 : 1 }}>
                      Delete
                    </button>
                  </div>
                  <MoreMenu items={[{ label: 'Block', danger: true, onClick: () => setBlockTarget({ userId: profile.user_id, name: displayName, requestId: request.id }) }]} />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(3,172,234,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Search size={26} style={{ color: '#03ACEA', opacity: 0.6 }} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#1A1918', margin: '0 0 6px', fontFamily: "'DM Sans', sans-serif" }}>Find friends</p>
          <p style={{ fontSize: 13, color: '#9B9A98', margin: 0, fontFamily: "'DM Sans', sans-serif" }}>Search by name or username above</p>
        </div>
      )}
    </div>
  );
}

/* ── Invite tab ── */
function InviteTab({ inviteLinkCopied, setInviteLinkCopied }) {
  return (
    <div>
      <p style={{ fontSize: 14, color: '#787776', marginBottom: 24, marginTop: 0, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>
        Don't see your friends on Vony? Invite them to join you.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          {
            href: "sms:?body=Hey! Join me on Vony, an easy way to manage loans with friends. Sign up here: https://www.vony-lending.com",
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
            label: 'Send via SMS', color: '#22c55e',
          },
          {
            href: "mailto:?subject=Join me on Vony&body=Hey!%0A%0AI've been using Vony to manage loans with friends and wanted to invite you.%0A%0ASign up here: https://www.vony-lending.com",
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
            label: 'Send via Email', color: '#03ACEA',
          },
        ].map(({ href, icon, label, color }) => (
          <a key={label} href={href} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 16, background: '#fff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', fontSize: 14, color: '#1A1918', textDecoration: 'none', fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
              {icon}
            </div>
            {label}
          </a>
        ))}

        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText('https://www.vony-lending.com').then(() => {
              setInviteLinkCopied(true);
              setTimeout(() => setInviteLinkCopied(false), 2000);
            });
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 16, background: inviteLinkCopied ? 'rgba(22,163,74,0.06)' : '#fff', border: `1px solid ${inviteLinkCopied ? 'rgba(22,163,74,0.2)' : 'rgba(0,0,0,0.06)'}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', fontSize: 14, color: inviteLinkCopied ? '#16A34A' : '#1A1918', fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s' }}
        >
          <div style={{ width: 38, height: 38, borderRadius: 10, background: inviteLinkCopied ? 'rgba(22,163,74,0.1)' : 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: inviteLinkCopied ? '#16A34A' : '#787776', flexShrink: 0 }}>
            {inviteLinkCopied
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            }
          </div>
          {inviteLinkCopied ? 'Link copied!' : 'Copy invite link'}
        </button>
      </div>
    </div>
  );
}

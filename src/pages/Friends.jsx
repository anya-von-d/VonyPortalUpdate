import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Friendship, PublicProfile } from '@/entities/all';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import { Star, Search, X, Send, ChevronDown, ArrowLeft } from 'lucide-react';
import UserAvatar from '@/components/ui/UserAvatar';
import confetti from 'canvas-confetti';
import MoreMenu from '@/components/MoreMenu';
import BlockConfirmModal from '@/components/BlockConfirmModal';
import MeshMobileNav from '@/components/MeshMobileNav';
import DesktopSidebar from '@/components/DesktopSidebar';

export default function Friends() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user: authUser, userProfile } = useAuth();
  const user = userProfile ? { ...userProfile, id: authUser?.id } : null;

  const [friends, setFriends] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [allFriendshipsRaw, setAllFriendshipsRaw] = useState([]);
  const [blockedIds, setBlockedIds] = useState(new Set());
  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [requestsOpen, setRequestsOpen] = useState(searchParams.get('requests') === '1');
  const [blockTarget, setBlockTarget] = useState(null);
  // Mobile: show the add-friends sub-view
  const [mobileAddOpen, setMobileAddOpen] = useState(searchParams.get('tab') === 'Add');

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

  // Shared props for add section
  const addProps = {
    searchQuery, setSearchQuery, searchResults,
    profiles, processingId,
    getSentRequestTo,
    handleSendRequest, handleCancelRequest,
    setBlockTarget, user,
  };

  // Shared props for friends list
  const friendsProps = {
    sortedFriends, receivedRequests, profiles, user, processingId,
    requestsOpen, setRequestsOpen,
    getFriendProfile, handleToggleStar, handleAccept, handleCancelRequest,
    setBlockTarget,
    onAddFriends: () => setMobileAddOpen(true),
  };

  return (
    <div style={{ minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", background: 'transparent' }}>
      <MeshMobileNav user={user} activePage="Friends" />

      {/* ── MOBILE add-friends sub-view ── */}
      {mobileAddOpen && (
        <div className="mobile-only" style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: '#FCFCFC',
          overflowY: 'auto',
          paddingBottom: 120,
        }}>
          {/* Back bar */}
          <div style={{
            position: 'sticky', top: 0, zIndex: 10,
            background: 'rgba(252,252,252,0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            padding: '56px 20px 12px',
            borderBottom: '1px solid rgba(0,0,0,0.05)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => { setMobileAddOpen(false); setSearchQuery(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', display: 'flex', alignItems: 'center', color: '#1A1918' }}
              >
                <ArrowLeft size={22} strokeWidth={2} />
              </button>
              <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.025em', color: '#1A1918', fontFamily: "'DM Sans', sans-serif" }}>
                Add Friends
              </span>
            </div>
          </div>

          {/* Add content */}
          <div style={{ padding: '20px 20px 0' }}>
            <AddSection {...addProps} />
          </div>
        </div>
      )}

      {/* ── Main layout ── */}
      <div className="mesh-layout" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 0, minHeight: '100vh' }}>
        <DesktopSidebar />

        <div className="mesh-center" style={{ background: 'transparent', padding: '24px 40px 80px', boxSizing: 'border-box' }}>

          {/* Desktop page title */}
          <div className="desktop-page-title" style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1A1918', margin: 0, letterSpacing: '-0.03em', fontFamily: "'DM Sans', sans-serif" }}>Friends</h1>
          </div>

          {/* Mobile-only Add Friends button — title already in top bar */}
          <div className="mobile-only" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button
              onClick={() => setMobileAddOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 999,
                background: '#03ACEA', color: '#fff',
                border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                letterSpacing: '-0.01em',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Friends
            </button>
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
              <div style={{ width: 28, height: 28, border: '2px solid #03ACEA', borderTopColor: 'transparent', borderRadius: '50%' }} className="animate-spin" />
            </div>
          ) : (
            <>
              {/* Desktop two-column, mobile single-column */}
              <div className="friends-layout">
                {/* Left / main: friends list + invite box */}
                <div className="friends-main">
                  <FriendsList {...friendsProps} />
                  <InviteBox />
                </div>

                {/* Right: add friends (desktop only) */}
                <div className="friends-add-col desktop-only">
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 14, fontFamily: "'DM Sans', sans-serif" }}>
                    Add Friends
                  </div>
                  <AddSection {...addProps} />
                </div>
              </div>
            </>
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

      <style>{`
        .mobile-only { display: block; }
        .desktop-only { display: none; }
        .friends-layout { display: flex; flex-direction: column; gap: 28px; }
        .friends-main { flex: 1; min-width: 0; }
        .friends-add-col { width: 320px; flex-shrink: 0; }

        @media (min-width: 900px) {
          .mobile-only { display: none !important; }
          .desktop-only { display: block !important; }
          .friends-layout { flex-direction: row; align-items: flex-start; gap: 32px; }
        }

        @keyframes placeholderTicker {
          0%,  17% { transform: translateY(0);       }
          21%, 42% { transform: translateY(-1.5em);  }
          46%, 67% { transform: translateY(-3em);    }
          71%, 92% { transform: translateY(-4.5em);  }
          96%, 100%{ transform: translateY(-6em);    }
        }
      `}</style>
    </div>
  );
}

/* ── Friends list with pending requests card ── */
function FriendsList({ sortedFriends, receivedRequests, profiles, user, processingId, requestsOpen, setRequestsOpen, getFriendProfile, handleToggleStar, handleAccept, handleCancelRequest, setBlockTarget }) {
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
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#1A1918', margin: '0 0 5px', fontFamily: "'DM Sans', sans-serif" }}>No friends yet</p>
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

/* ── Invite box ── */
function InviteBox() {
  const inviteUrl = 'https://www.vony-lending.com';
  const smsBody = encodeURIComponent(`Hey! Join me on Vony, an easy way to manage loans with friends. Sign up here: ${inviteUrl}`);
  const smsHref = `sms:?body=${smsBody}`;

  return (
    <div style={{
      marginTop: 20,
      background: '#fff',
      borderRadius: 20,
      border: '1px solid rgba(0,0,0,0.06)',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      padding: '28px 24px 24px',
      textAlign: 'center',
    }}>
      {/* Floating avatars decoration */}
      <div style={{ position: 'relative', height: 64, marginBottom: 20 }}>
        {[
          { x: '10%',  y: 6,  size: 38, bg: '#E8D5F5', memoji: 5  },
          { x: '27%',  y: 18, size: 30, bg: '#FDE68A', memoji: 14 },
          { x: '43%',  y: 0,  size: 48, bg: '#BFDBFE', memoji: 22 },
          { x: '61%',  y: 14, size: 32, bg: '#BBF7D0', memoji: 37 },
          { x: '77%',  y: 6,  size: 36, bg: '#FECACA', memoji: 51 },
        ].map(({ x, y, size, bg, memoji }) => (
          <div key={memoji} style={{
            position: 'absolute', left: x, top: y,
            borderRadius: '50%',
            padding: 3,
            background: 'white',
            boxShadow: '0 4px 16px rgba(0,0,0,0.13)',
          }}>
            <div style={{
              width: size, height: size, borderRadius: '50%',
              background: bg, overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <img
                src={`https://raw.githubusercontent.com/Wimell/Tapback-Memojis/main/src/public/images/avatars/v1/${memoji}.png`}
                alt=""
                style={{ width: '92%', height: '92%', objectFit: 'contain', objectPosition: 'center 8%', pointerEvents: 'none' }}
              />
            </div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 16, fontWeight: 700, color: '#1A1918', margin: '0 0 6px', letterSpacing: '-0.02em', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.3 }}>
        Don't see your friends on Vony?
      </p>
      <p style={{ fontSize: 13, color: '#787776', margin: '0 0 20px', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>
        Invite them to join you.
      </p>

      <a
        href={smsHref}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '12px 28px', borderRadius: 999,
          background: '#1A1918', color: '#fff',
          fontSize: 14, fontWeight: 700,
          fontFamily: "'DM Sans', sans-serif",
          textDecoration: 'none', letterSpacing: '-0.01em',
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        Invite
      </a>
    </div>
  );
}

/* ── Add friends section (shared between desktop right panel and mobile overlay) ── */
function AddSection({ searchQuery, setSearchQuery, searchResults, profiles, processingId, getSentRequestTo, handleSendRequest, handleCancelRequest, setBlockTarget, user }) {
  const TICKER_LINE_H = '1.5em';
  const tickerWords = ['name', 'phone number', 'username', 'email', 'name']; // last = duplicate for seamless loop

  return (
    <div>
      {/* Search bar — white bg lives on the container so the overlay is visible through the transparent input */}
      <div style={{
        position: 'relative', marginBottom: 20,
        background: '#fff', borderRadius: 14,
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        transition: 'border-color 0.15s',
      }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#B0AEA8', pointerEvents: 'none' }} />

        {/* Animated placeholder — only when input is empty */}
        {!searchQuery && (
          <div style={{
            position: 'absolute', left: 42, top: '50%', transform: 'translateY(-50%)',
            display: 'flex', alignItems: 'center',
            pointerEvents: 'none', userSelect: 'none',
            fontSize: 14, fontFamily: "'DM Sans', sans-serif",
            color: '#B5B3AD', lineHeight: TICKER_LINE_H,
            overflow: 'hidden', height: TICKER_LINE_H,
            whiteSpace: 'nowrap',
          }}>
            <span>Search by&nbsp;</span>
            {/* Clipping window — one line tall, words scroll up through it */}
            <span style={{ display: 'inline-block', overflow: 'hidden', height: TICKER_LINE_H, verticalAlign: 'top' }}>
              <span style={{
                display: 'inline-flex', flexDirection: 'column',
                animation: `placeholderTicker 9s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
              }}>
                {tickerWords.map((word, i) => (
                  <span key={i} style={{ display: 'block', height: TICKER_LINE_H, lineHeight: TICKER_LINE_H }}>
                    {word}
                  </span>
                ))}
              </span>
            </span>
          </div>
        )}

        {/* Input is transparent so the overlay below shows through */}
        <input
          type="text"
          placeholder=""
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          autoFocus
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '12px 40px 12px 42px',
            borderRadius: 14, border: 'none',
            background: 'transparent', fontSize: 14,
            color: '#1A1918', fontFamily: "'DM Sans', sans-serif",
            outline: 'none', display: 'block',
          }}
          onFocus={e => e.target.parentElement.style.borderColor = 'rgba(3,172,234,0.4)'}
          onBlur={e => e.target.parentElement.style.borderColor = 'rgba(0,0,0,0.08)'}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.07)', border: 'none', cursor: 'pointer', color: '#787776', padding: 0, width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={12} />
          </button>
        )}
      </div>

      {searchQuery.trim() ? (
        searchResults.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#9B9A98', fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>
            No users found for "{searchQuery}"
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            {searchResults.map((profile, idx) => {
              const sentRequest = getSentRequestTo(profile.user_id);
              const displayName = profile.full_name || profile.username;
              const isLast = idx === searchResults.length - 1;
              return (
                <div key={profile.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: isLast ? 'none' : '1px solid rgba(0,0,0,0.05)' }}>
                  <UserAvatar name={displayName} src={profile.profile_picture_url || profile.avatar_url} size={40} radius={20} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif" }}>{displayName}</div>
                    <div style={{ fontSize: 12, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif" }}>@{profile.username}</div>
                  </div>
                  {sentRequest ? (
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
      ) : (
        <div style={{ textAlign: 'center', padding: '48px 16px' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(3,172,234,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Search size={22} style={{ color: '#03ACEA', opacity: 0.6 }} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#1A1918', margin: '0 0 5px', fontFamily: "'DM Sans', sans-serif" }}>Find friends</p>
          <p style={{ fontSize: 13, color: '#9B9A98', margin: 0, fontFamily: "'DM Sans', sans-serif" }}>Search by name or username</p>
        </div>
      )}
    </div>
  );
}

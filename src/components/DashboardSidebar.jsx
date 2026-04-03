import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loan, Payment, Friendship, PublicProfile } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";
import { format, differenceInDays } from "date-fns";

/* ── Accordion — no border lines ───────────────────────────── */
function AccordionSection({ title, open, onToggle, badge, children }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <button
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '10px 16px 6px', border: 'none', background: 'transparent',
          cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
          fontSize: 11, fontWeight: 600, color: '#9B9A98',
          letterSpacing: '0.07em', textTransform: 'uppercase',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {title}
          {badge > 0 && (
            <span style={{
              background: '#E8726E', color: 'white', fontSize: 9, fontWeight: 700,
              minWidth: 16, height: 16, borderRadius: 8,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
            }}>{badge}</span>
          )}
        </span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#C7C6C4"
          strokeWidth="2.5" strokeLinecap="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div style={{ padding: '2px 16px 14px' }}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ── Mini avatar ─────────────────────────────────────────────── */
function MiniAvatar({ photoUrl, name, size = 26 }) {
  const initial = (name || 'U').charAt(0).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: '#E8E7E4',
      flexShrink: 0, overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {photoUrl
        ? <img src={photoUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: size * 0.42, fontWeight: 600, color: '#787776' }}>{initial}</span>
      }
    </div>
  );
}

/* ── Shared text styles ──────────────────────────────────────── */
const itemText = { fontSize: 12, fontWeight: 500, color: '#1A1918', margin: 0, lineHeight: 1.4 };
const itemSub  = { fontSize: 10, fontWeight: 400, color: '#9B9A98', margin: '2px 0 0', lineHeight: 1.3 };

/* ── Main component ──────────────────────────────────────────── */
export default function DashboardSidebar({ activePage = "Dashboard", user }) {
  const avatarInitial = (user?.full_name || 'U').charAt(0).toUpperCase();
  const { logout } = useAuth();
  const firstName = user?.full_name?.split(' ')[0] || '';

  const [notifCount, setNotifCount]     = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [upcomingPayments, setUpcomingPayments] = useState([]);
  const [friends, setFriends]           = useState([]);
  const [pendingItems, setPendingItems]  = useState([]);

  const [openDropdown, setOpenDropdown] = useState(null);
  const [upcomingOpen, setUpcomingOpen] = useState(true);
  const [friendsOpen, setFriendsOpen]   = useState(true);
  const [pendingOpen, setPendingOpen]   = useState(true);

  const dropdownWrapRef = useRef(null);

  useEffect(() => { if (user?.id) fetchData(); }, [user?.id]);

  const fetchData = async () => {
    try {
      const [payments, loans, friendships, profiles] = await Promise.all([
        Payment.list().catch(() => []),
        Loan.list().catch(() => []),
        Friendship.list().catch(() => []),
        PublicProfile.list().catch(() => []),
      ]);

      const userLoans   = loans.filter(l => l.lender_id === user.id || l.borrower_id === user.id);
      const userLoanIds = userLoans.map(l => l.id);
      const today       = new Date();

      const getProfile = (uid) => profiles.find(pr => pr.user_id === uid);
      const getName    = (uid) => getProfile(uid)?.full_name?.split(' ')[0] || 'Someone';
      const getPhoto   = (uid) => getProfile(uid)?.profile_picture_url || null;

      /* ── Notifications ── */
      const paymentsToConfirm = payments.filter(p =>
        p.status === 'pending_confirmation' && userLoanIds.includes(p.loan_id) && p.recorded_by !== user.id
      );
      const termChanges   = loans.filter(l =>
        userLoanIds.includes(l.id) && l.status === 'pending_borrower_approval' && l.borrower_id === user.id
      );
      const offersReceived  = loans.filter(l => l.borrower_id === user.id && l.status === 'pending');
      const friendRequests  = friendships.filter(f => f.friend_id === user.id && f.status === 'pending');

      const notifItems = [
        ...offersReceived.map(l => ({
          id: l.id, date: l.created_at,
          text: `${getName(l.lender_id)} sent you a loan offer`,
          senderPhoto: getPhoto(l.lender_id), senderName: getName(l.lender_id),
        })),
        ...paymentsToConfirm.map(p => ({
          id: p.id, date: p.created_at,
          text: `Confirm payment from ${getName(p.recorded_by)}`,
          senderPhoto: getPhoto(p.recorded_by), senderName: getName(p.recorded_by),
        })),
        ...friendRequests.map(f => ({
          id: f.id, date: f.created_at,
          text: `${getName(f.user_id)} sent you a friend request`,
          senderPhoto: getPhoto(f.user_id), senderName: getName(f.user_id),
        })),
        ...termChanges.map(l => ({
          id: l.id, date: l.updated_at,
          text: `${getName(l.lender_id)} updated loan terms`,
          senderPhoto: getPhoto(l.lender_id), senderName: getName(l.lender_id),
        })),
      ];
      setNotifCount(notifItems.length);
      setNotifications(notifItems.slice(0, 6));

      /* ── Upcoming ── */
      const upcoming = userLoans
        .filter(l => l.status === 'active' && l.next_payment_date)
        .sort((a, b) => new Date(a.next_payment_date) - new Date(b.next_payment_date))
        .slice(0, 5)
        .map(l => {
          const dueDate  = new Date(l.next_payment_date);
          const daysLeft = differenceInDays(dueDate, today);
          return {
            id: l.id, amount: l.payment_amount || 0,
            date: l.next_payment_date, daysLeft,
            name: getName(l.lender_id === user.id ? l.borrower_id : l.lender_id),
            isLender: l.lender_id === user.id,
          };
        });
      setUpcomingPayments(upcoming);

      /* ── Friends ── */
      const accepted = friendships.filter(f =>
        f.status === 'accepted' && (f.user_id === user.id || f.friend_id === user.id)
      );
      setFriends(
        accepted
          .map(f => {
            const otherId = f.user_id === user.id ? f.friend_id : f.user_id;
            return profiles.find(p => p.user_id === otherId);
          })
          .filter(Boolean)
      );

      /* ── Pending (waiting for others) ── */
      const myRecordedPending = payments.filter(p =>
        p.recorded_by === user.id && p.status === 'pending_confirmation'
      );
      const myOffersOut = loans.filter(l => l.lender_id === user.id && l.status === 'pending');

      setPendingItems([
        ...myRecordedPending.map(p => {
          const loan    = userLoans.find(l => l.id === p.loan_id);
          const otherId = loan ? (loan.lender_id === user.id ? loan.borrower_id : loan.lender_id) : null;
          return {
            id: p.id, date: p.created_at,
            text: `Waiting for ${otherId ? getName(otherId) : 'them'} to confirm payment`,
            senderPhoto: otherId ? getPhoto(otherId) : null,
            senderName:  otherId ? getName(otherId) : null,
          };
        }),
        ...myOffersOut.map(l => ({
          id: l.id, date: l.created_at,
          text: `Waiting for ${getName(l.borrower_id)} to confirm loan offer`,
          senderPhoto: getPhoto(l.borrower_id),
          senderName:  getName(l.borrower_id),
        })),
      ].slice(0, 8));

    } catch (e) { console.error("Sidebar data error:", e); }
  };

  /* ── Close nav dropdown on outside click ── */
  useEffect(() => {
    const h = (e) => {
      if (dropdownWrapRef.current && !dropdownWrapRef.current.contains(e.target)) setOpenDropdown(null);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleLogout = () => { setOpenDropdown(null); logout(); };
  const active = (...pages) => pages.includes(activePage);

  const navLinkStyle = (...pages) => ({
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '6px 12px', borderRadius: 8, textDecoration: 'none',
    fontSize: 13, fontFamily: "'DM Sans', sans-serif",
    whiteSpace: 'nowrap', transition: 'background 0.15s', flexShrink: 0,
    color: active(...pages) ? '#1A1918' : '#5C5B5A',
    fontWeight: active(...pages) ? 600 : 500,
    background: active(...pages) ? 'rgba(0,0,0,0.07)' : 'transparent',
  });

  const dropdownBtnStyle = (key, ...pages) => ({
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontSize: 13, fontFamily: "'DM Sans', sans-serif",
    whiteSpace: 'nowrap', transition: 'background 0.15s', flexShrink: 0,
    color: (active(...pages) || openDropdown === key) ? '#1A1918' : '#5C5B5A',
    fontWeight: (active(...pages) || openDropdown === key) ? 600 : 500,
    background: active(...pages) ? 'rgba(0,0,0,0.07)' : openDropdown === key ? 'rgba(0,0,0,0.04)' : 'transparent',
  });

  const chevronDown = (isOpen) => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round"
      style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', opacity: 0.5, flexShrink: 0 }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );

  const dropdownPanel = (alignRight = false) => ({
    position: 'absolute', top: 'calc(100% + 6px)',
    left: alignRight ? 'auto' : 0, right: alignRight ? 0 : 'auto',
    minWidth: 180, background: 'white', borderRadius: 12,
    border: '1px solid rgba(0,0,0,0.07)',
    boxShadow: '0 8px 28px rgba(0,0,0,0.10)', padding: 5, zIndex: 200,
  });

  const DropdownItem = ({ page, label, search = '' }) => (
    <Link
      to={search ? { pathname: createPageUrl(page), search } : createPageUrl(page)}
      onClick={() => setOpenDropdown(null)}
      style={{
        display: 'flex', alignItems: 'center', padding: '8px 12px', borderRadius: 8,
        textDecoration: 'none', fontSize: 13, fontFamily: "'DM Sans', sans-serif",
        color: activePage === page ? '#1A1918' : '#5C5B5A',
        fontWeight: activePage === page ? 600 : 500,
        background: activePage === page ? 'rgba(0,0,0,0.05)' : 'transparent',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => { if (activePage !== page) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
      onMouseLeave={e => { if (activePage !== page) e.currentTarget.style.background = activePage === page ? 'rgba(0,0,0,0.05)' : 'transparent'; }}
    >{label}</Link>
  );

  const fmtDate = (d) => { try { return format(new Date(d), 'MMM d'); } catch { return ''; } };

  return (
    <>
      <style>{`
        @media (min-width: 900px) { .mobile-tab-bar { display: none !important; } }
      `}</style>

      {/* ══════ NAV PILL ══════ */}
      <div ref={dropdownWrapRef} style={{ position: 'fixed', top: 8, left: 268, right: 8, height: 52, zIndex: 100 }}>
        <nav style={{
          width: '100%', height: '100%',
          background: 'rgba(255,255,255,0.90)',
          backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
          borderRadius: 16, border: '1px solid rgba(255,255,255,0.80)',
          boxShadow: '0 4px 28px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.05)',
          display: 'flex', alignItems: 'center', padding: '0 16px', gap: 2,
          fontFamily: "'DM Sans', sans-serif", overflow: 'visible', boxSizing: 'border-box',
        }}>
          <Link to="/" style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontWeight: 400, fontStyle: 'italic', fontSize: '1.25rem',
            letterSpacing: '-0.02em', color: '#1A1918', textDecoration: 'none', flexShrink: 0,
          }}>Vony</Link>

          <div style={{ flex: 1 }} />
          <Link to="/" style={navLinkStyle('Dashboard')}>Home</Link>
          <div style={{ flex: 1 }} />
          <Link to={createPageUrl("CreateOffer")} style={navLinkStyle('CreateOffer')}>Create Loan</Link>
          <div style={{ flex: 1 }} />
          <Link to={createPageUrl("RecordPayment")} style={navLinkStyle('RecordPayment')}>Record Payment</Link>
          <div style={{ flex: 1 }} />

          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button style={dropdownBtnStyle('upcoming', 'Upcoming')} onClick={() => setOpenDropdown(openDropdown === 'upcoming' ? null : 'upcoming')}>
              Upcoming {chevronDown(openDropdown === 'upcoming')}
            </button>
            {openDropdown === 'upcoming' && (
              <div style={dropdownPanel()}>
                <DropdownItem page="Upcoming" search="?tab=summary" label="Summary" />
                <DropdownItem page="Upcoming" search="?tab=calendar" label="Calendar" />
              </div>
            )}
          </div>

          <div style={{ flex: 1 }} />

          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button style={dropdownBtnStyle('loans', 'YourLoans', 'Borrowing', 'Lending')} onClick={() => setOpenDropdown(openDropdown === 'loans' ? null : 'loans')}>
              My Loans {chevronDown(openDropdown === 'loans')}
            </button>
            {openDropdown === 'loans' && (
              <div style={dropdownPanel()}>
                <DropdownItem page="YourLoans" search="?tab=lending" label="Lending" />
                <DropdownItem page="YourLoans" search="?tab=borrowing" label="Borrowing" />
                <DropdownItem page="YourLoans" search="?tab=details" label="Individual Loan Details" />
              </div>
            )}
          </div>

          <div style={{ flex: 1 }} />
          <Link to={createPageUrl("Friends")} style={navLinkStyle('Friends')}>Friends</Link>
          <div style={{ flex: 1 }} />

          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button style={dropdownBtnStyle('more', 'RecentActivity', 'LoanAgreements', 'ComingSoon')} onClick={() => setOpenDropdown(openDropdown === 'more' ? null : 'more')}>
              More {chevronDown(openDropdown === 'more')}
            </button>
            {openDropdown === 'more' && (
              <div style={{ ...dropdownPanel(true), minWidth: 200 }}>
                <DropdownItem page="RecentActivity" label="Recent Activity" />
                <DropdownItem page="LoanAgreements" label="Loan Documents" />
                <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '4px 5px' }} />
                <DropdownItem page="ComingSoon" label="Settings" />
                <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '4px 5px' }} />
                <button onClick={handleLogout} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 8, width: '100%', border: 'none',
                  background: 'transparent', cursor: 'pointer', fontSize: 13,
                  fontFamily: "'DM Sans', sans-serif", color: '#E8726E', fontWeight: 500, textAlign: 'left',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,114,110,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E8726E" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Log Out
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* ══════ WHITE SIDEBAR ══════ */}
      <aside style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, width: 260,
        background: 'white', zIndex: 80,
        boxShadow: '4px 0 24px rgba(0,0,0,0.04)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto', overflowX: 'hidden',
        fontFamily: "'DM Sans', sans-serif",
      }}>

        {/* ── Header ── */}
        <div style={{ padding: '16px 16px 14px', flexShrink: 0 }}>

          {/* Bell icon — top right, own row */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <Link to={createPageUrl("Requests")} style={{ textDecoration: 'none', display: 'inline-flex', position: 'relative' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill={active('Requests') ? '#1A1918' : '#9B9A98'}>
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
              </svg>
              {notifCount > 0 && (
                <div style={{
                  position: 'absolute', top: -4, right: -6,
                  background: '#E8726E', color: 'white', fontSize: 8, fontWeight: 700,
                  minWidth: 14, height: 14, borderRadius: 7,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
                }}>{notifCount > 99 ? '99+' : notifCount}</div>
              )}
            </Link>
          </div>

          {/* Photo (left) + name & My Profile button (right) — compact single row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <Link to={createPageUrl("Profile")} style={{ textDecoration: 'none', flexShrink: 0 }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', background: '#1A1918',
                overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                outline: active('Profile') ? '2px solid #82F0B9' : 'none', outlineOffset: 2,
              }}>
                {user?.profile_picture_url
                  ? <img src={user.profile_picture_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 19, fontWeight: 700, color: 'white' }}>{avatarInitial}</span>
                }
              </div>
            </Link>

            {/* Name + My Profile stacked to the right */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1918', margin: '0 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {firstName || 'there'}
              </p>
              <Link to={createPageUrl("Profile")} style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                padding: '4px 10px', borderRadius: 7,
                background: active('Profile') ? '#1A1918' : 'rgba(0,0,0,0.06)',
                textDecoration: 'none', fontSize: 11, fontWeight: 600,
                color: active('Profile') ? 'white' : '#5C5B5A',
                transition: 'background 0.15s', whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { if (!active('Profile')) e.currentTarget.style.background = 'rgba(0,0,0,0.10)'; }}
              onMouseLeave={e => { if (!active('Profile')) e.currentTarget.style.background = active('Profile') ? '#1A1918' : 'rgba(0,0,0,0.06)'; }}
              >
                My Profile
              </Link>
            </div>
          </div>
        </div>

        {/* ── Notifications ── */}
        <div style={{ padding: '16px 16px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#9B9A98', letterSpacing: '0.07em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 7 }}>
              Notifications
              {notifCount > 0 && (
                <span style={{ background: '#E8726E', color: 'white', fontSize: 9, fontWeight: 700, minWidth: 16, height: 16, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{notifCount}</span>
              )}
            </span>
            {notifCount > 0 && (
              <Link to={createPageUrl("Requests")} style={{ fontSize: 10, color: '#03ACEA', textDecoration: 'none', fontWeight: 600 }}>See all</Link>
            )}
          </div>

          {notifications.length === 0
            ? <p style={{ ...itemText, color: '#C7C6C4' }}>No new notifications</p>
            : notifications.map((n, i) => (
              <Link key={n.id || i} to={createPageUrl("Requests")} style={{
                display: 'flex', alignItems: 'flex-start', gap: 9,
                textDecoration: 'none',
                marginBottom: i < notifications.length - 1 ? 12 : 0,
              }}>
                {/* Sender photo — LEFT */}
                <MiniAvatar photoUrl={n.senderPhoto} name={n.senderName} size={26} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={itemText}>{n.text}</p>
                  {n.date && <p style={itemSub}>{fmtDate(n.date)}</p>}
                </div>
              </Link>
            ))
          }
        </div>

        {/* ── Upcoming ── */}
        <AccordionSection title="Upcoming" open={upcomingOpen} onToggle={() => setUpcomingOpen(v => !v)} badge={upcomingPayments.length}>
          {upcomingPayments.length === 0
            ? <p style={{ ...itemText, color: '#C7C6C4' }}>No upcoming payments</p>
            : upcomingPayments.map((p, i) => {
              const overdue   = p.daysLeft < 0;
              const soon      = !overdue && p.daysLeft <= 3;
              const daysColor = overdue ? '#E8726E' : soon ? '#F5A623' : '#2DBD75';
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  marginBottom: i < upcomingPayments.length - 1 ? 12 : 0,
                }}>
                  {/* Days remaining — no + sign, negative when overdue */}
                  <div style={{ minWidth: 28, textAlign: 'center', flexShrink: 0, paddingTop: 1 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: daysColor, fontFamily: "'IBM Plex Mono', monospace", display: 'block' }}>
                      {p.daysLeft}
                    </span>
                    <span style={{ fontSize: 9, color: '#C7C6C4', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      {Math.abs(p.daysLeft) === 1 ? 'day' : 'days'}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={itemText}>
                      ${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · {p.isLender ? `from ${p.name}` : `to ${p.name}`}
                    </p>
                    {p.date && <p style={itemSub}>{fmtDate(p.date)}</p>}
                  </div>
                </div>
              );
            })
          }
        </AccordionSection>

        {/* ── Friends ── */}
        <AccordionSection title="Friends" open={friendsOpen} onToggle={() => setFriendsOpen(v => !v)} badge={0}>
          {friends.length === 0
            ? <p style={{ ...itemText, color: '#C7C6C4', marginBottom: 10 }}>No friends added yet</p>
            : (
              <div style={{ marginBottom: 10 }}>
                {friends.map((friend, i) => (
                  <div key={friend.user_id || i} style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    marginBottom: i < friends.length - 1 ? 12 : 0,
                  }}>
                    <MiniAvatar photoUrl={friend.profile_picture_url} name={friend.full_name} size={22} />
                    <span style={itemText}>{friend.full_name}</span>
                  </div>
                ))}
              </div>
            )
          }

          <div style={{ display: 'flex', gap: 6, marginTop: friends.length ? 0 : 4 }}>
            <Link to={createPageUrl("Friends")} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '7px 6px', borderRadius: 9, textDecoration: 'none',
              background: 'rgba(3,172,234,0.08)', border: '1px solid rgba(3,172,234,0.14)',
              fontSize: 11, fontWeight: 600, color: '#03ACEA', transition: 'background 0.12s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(3,172,234,0.14)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(3,172,234,0.08)'}
            >Find More Friends</Link>
            <button style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '7px 6px', borderRadius: 9, border: '1px solid rgba(0,0,0,0.08)',
              background: 'rgba(0,0,0,0.03)', cursor: 'pointer',
              fontSize: 11, fontWeight: 600, color: '#5C5B5A',
              fontFamily: "'DM Sans', sans-serif", transition: 'background 0.12s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.07)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
            >Invite Friends</button>
          </div>
        </AccordionSection>

        {/* ── Pending ── */}
        <AccordionSection title="Pending" open={pendingOpen} onToggle={() => setPendingOpen(v => !v)} badge={pendingItems.length}>
          {pendingItems.length === 0
            ? <p style={{ ...itemText, color: '#C7C6C4' }}>Nothing pending right now</p>
            : pendingItems.map((item, i) => (
              <div key={item.id || i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 9,
                marginBottom: i < pendingItems.length - 1 ? 12 : 0,
              }}>
                {/* Person waiting on — photo LEFT */}
                <MiniAvatar photoUrl={item.senderPhoto} name={item.senderName} size={26} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={itemText}>{item.text}</p>
                  {item.date && <p style={itemSub}>{fmtDate(item.date)}</p>}
                </div>
              </div>
            ))
          }
        </AccordionSection>

      </aside>
    </>
  );
}

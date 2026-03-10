import React, { useState, useEffect, useRef } from "react";
import { Loan, Payment, User, PublicProfile, Friendship } from "@/entities/all";
import { Activity, ArrowUpRight, ArrowDownRight, Send, Check, X, Ban, ChevronDown, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format, subDays, subMonths, subYears } from "date-fns";
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

const STATUS_ICON_MAP = {
  pending: { icon: Clock, color: '#787776' },
  active: { icon: CheckCircle, color: '#678AFB' },
  completed: { icon: CheckCircle, color: '#678AFB' },
  defaulted: { icon: AlertCircle, color: '#E8726E' },
  cancelled: { icon: XCircle, color: '#E8726E' },
  declined: { icon: XCircle, color: '#E8726E' },
};

const CATEGORY_OPTIONS = [
  { id: 'sent_offer', label: 'Sent Loan Offer' },
  { id: 'received_offer', label: 'Received Loan Offer' },
  { id: 'loan_accepted', label: 'Loan Accepted' },
  { id: 'loan_declined', label: 'Loan Declined' },
  { id: 'loan_cancelled', label: 'Loan Cancelled' },
  { id: 'loan_completed', label: 'Loan Completed' },
  { id: 'loan_defaulted', label: 'Loan Defaulted' },
  { id: 'payment_sent', label: 'Payment Sent' },
  { id: 'payment_received', label: 'Payment Received' },
];

const DATE_OPTIONS = [
  { id: 'all', label: 'All Dates' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: '3m', label: 'Last 3 Months' },
  { id: '6m', label: 'Last 6 Months' },
  { id: '1y', label: 'Last Year' },
  { id: 'older', label: 'Older' },
];

/* ── Multi-select dropdown ─────────────────────────────────── */
function MultiSelectDropdown({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (id) => {
    if (selected.includes(id)) onChange(selected.filter(s => s !== id));
    else onChange([...selected, id]);
  };

  const displayLabel = selected.length === 0
    ? label
    : selected.length === 1
      ? options.find(o => o.id === selected[0])?.label || label
      : `${selected.length} selected`;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
          border: '1px solid rgba(0,0,0,0.08)', background: selected.length > 0 ? 'rgba(103,138,251,0.08)' : 'white',
          fontSize: 13, fontWeight: 500, color: '#1A1918', cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', transition: 'background 0.15s',
        }}
      >
        {displayLabel}
        <ChevronDown size={14} style={{ opacity: 0.5, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: 220,
          background: 'white', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)', zIndex: 50, padding: 6, maxHeight: 280, overflowY: 'auto',
        }}>
          {options.map(opt => (
            <label
              key={opt.id}
              onClick={() => toggle(opt.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8,
                cursor: 'pointer', fontSize: 13, color: '#1A1918', transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: 18, height: 18, borderRadius: 5, border: selected.includes(opt.id) ? 'none' : '1.5px solid rgba(0,0,0,0.2)',
                background: selected.includes(opt.id) ? '#678AFB' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s', flexShrink: 0,
              }}>
                {selected.includes(opt.id) && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                )}
              </div>
              {opt.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Single-select dropdown ────────────────────────────────── */
function SingleSelectDropdown({ options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = options.find(o => o.id === selected) || options[0];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
          border: '1px solid rgba(0,0,0,0.08)', background: selected !== 'all' ? 'rgba(103,138,251,0.08)' : 'white',
          fontSize: 13, fontWeight: 500, color: '#1A1918', cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', transition: 'background 0.15s',
        }}
      >
        {current.label}
        <ChevronDown size={14} style={{ opacity: 0.5, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: 200,
          background: 'white', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)', zIndex: 50, padding: 6,
        }}>
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => { onChange(opt.id); setOpen(false); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8,
                border: 'none', cursor: 'pointer', fontSize: 13, color: '#1A1918',
                background: selected === opt.id ? 'rgba(103,138,251,0.08)' : 'transparent',
                fontWeight: selected === opt.id ? 600 : 400, fontFamily: "'DM Sans', sans-serif",
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (selected !== opt.id) e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
              onMouseLeave={e => { if (selected !== opt.id) e.currentTarget.style.background = 'transparent'; }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */
export default function RecentActivityPage() {
  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [user, setUser] = useState(null);
  const [publicProfiles, setPublicProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [dateFilter, setDateFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState([]);
  const [friendFilter, setFriendFilter] = useState([]);

  useEffect(() => { loadData(); }, []);

  const safeEntityCall = async (entityCall, fallback = []) => {
    try {
      const result = await entityCall();
      return Array.isArray(result) ? result : (result ? [result] : fallback);
    } catch (error) {
      console.error("Entity call failed:", error);
      return fallback;
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      const [allLoans, allPayments, allProfiles] = await Promise.all([
        safeEntityCall(() => Loan.list('-created_at')),
        safeEntityCall(() => Payment.list('-created_at')),
        safeEntityCall(() => PublicProfile.list()),
      ]);

      setLoans(allLoans);
      setPayments(allPayments);
      setPublicProfiles(allProfiles);
    } catch (error) {
      console.error("User not authenticated or data load error:", error);
      setUser(null);
    }
    setIsLoading(false);
  };

  const getUserById = (userId) => {
    const found = publicProfiles.find(u => u && u.user_id === userId);
    if (found) return found;
    return { id: userId, username: 'user', full_name: 'Unknown User', profile_picture_url: null };
  };

  /* ── Loading / unauthenticated states ─────────────────────── */
  if (isLoading || !user) {
    return (
      <div className="home-with-sidebar" style={{ minHeight: '100vh', background: '#F7F7F7', paddingLeft: 240, fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif", fontSize: 14, lineHeight: 1.5 }}>
        <DashboardSidebar activePage="RecentActivity" user={user} />
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 520, background: 'linear-gradient(180deg, #527DFF 0%, #5580FF 5%, #678AFB 13%, #7792F4 22%, #8C9BEE 32%, #A19EEB 42%, #A79DEA 50%, #BB98E8 58%, #C89CE6 65%, #D4A0E4 72%, #DDA5E2 76%, #F0D8EA 80%, #F7F7F7 84%)', zIndex: 0 }} />
          <div style={{ position: 'relative', zIndex: 10, maxWidth: 1080, margin: '0 auto', padding: '0 28px' }}>
            <div style={{ paddingTop: 80, paddingBottom: 20, textAlign: 'center' }}>
              <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '3.2rem', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1, color: 'white', margin: 0 }}>Recent Activity</h1>
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 28px 64px' }}>
          <div className="glass-card" style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 32, height: 32, border: '2px solid #678AFB', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 12 }} />
            <p style={{ fontSize: 13, color: '#787776' }}>{isLoading ? 'Loading activity...' : 'Please log in to view activity'}</p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Build activity list ──────────────────────────────────── */
  const safeLoans = Array.isArray(loans) ? loans : [];
  const safePayments = Array.isArray(payments) ? payments : [];

  const myLoans = safeLoans.filter(loan => loan && (loan.lender_id === user.id || loan.borrower_id === user.id));
  const myLoanIds = myLoans.map(l => l && l.id).filter(Boolean);
  const myPayments = safePayments.filter(p => p && myLoanIds.includes(p.loan_id));

  /* ── Determine category for each activity ─────────────────── */
  const categoriseActivity = (activity) => {
    if (activity.type === 'loan') {
      const isLender = activity.lender_id === user.id;
      if (activity.status === 'pending' || !activity.status) return isLender ? 'sent_offer' : 'received_offer';
      if (activity.status === 'active') return 'loan_accepted';
      if (activity.status === 'declined') return 'loan_declined';
      if (activity.status === 'cancelled') return 'loan_cancelled';
      if (activity.status === 'completed') return 'loan_completed';
      if (activity.status === 'defaulted') return 'loan_defaulted';
      return 'sent_offer';
    }
    if (activity.type === 'payment') {
      const associatedLoan = safeLoans.find(l => l && l.id === activity.loan_id);
      if (!associatedLoan) return 'payment_sent';
      return associatedLoan.borrower_id === user.id ? 'payment_sent' : 'payment_received';
    }
    return 'sent_offer';
  };

  /* ── Determine which friend is the "other party" ──────────── */
  const getOtherPartyId = (activity) => {
    if (activity.type === 'loan') {
      return activity.lender_id === user.id ? activity.borrower_id : activity.lender_id;
    }
    if (activity.type === 'payment') {
      const associatedLoan = safeLoans.find(l => l && l.id === activity.loan_id);
      if (!associatedLoan) return null;
      return associatedLoan.borrower_id === user.id ? associatedLoan.lender_id : associatedLoan.borrower_id;
    }
    return null;
  };

  const loanActivities = myLoans.map(loan => ({ type: 'loan', ...loan, date: loan.created_at }));
  const paymentActivities = myPayments.map(payment => ({ type: 'payment', ...payment, date: payment.payment_date || payment.created_at }));

  let allActivities = [...loanActivities, ...paymentActivities]
    .filter(a => a && a.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  // Enrich each activity with category + other party
  allActivities = allActivities.map(a => ({
    ...a,
    _category: categoriseActivity(a),
    _otherPartyId: getOtherPartyId(a),
  }));

  /* ── Build friend options from activities ──────────────────── */
  const friendUserIds = [...new Set(allActivities.map(a => a._otherPartyId).filter(Boolean))];
  const friendOptions = friendUserIds.map(uid => {
    const p = getUserById(uid);
    return { id: uid, label: `@${p.username || 'user'}` };
  }).sort((a, b) => a.label.localeCompare(b.label));

  /* ── Apply filters ────────────────────────────────────────── */
  let filtered = allActivities;

  // Date filter
  if (dateFilter !== 'all') {
    const now = new Date();
    if (dateFilter === '7d') filtered = filtered.filter(a => new Date(a.date) >= subDays(now, 7));
    else if (dateFilter === '30d') filtered = filtered.filter(a => new Date(a.date) >= subDays(now, 30));
    else if (dateFilter === '3m') filtered = filtered.filter(a => new Date(a.date) >= subMonths(now, 3));
    else if (dateFilter === '6m') filtered = filtered.filter(a => new Date(a.date) >= subMonths(now, 6));
    else if (dateFilter === '1y') filtered = filtered.filter(a => new Date(a.date) >= subYears(now, 1));
    else if (dateFilter === 'older') filtered = filtered.filter(a => new Date(a.date) < subYears(now, 1));
  }

  // Category filter (multi-select — union)
  if (categoryFilter.length > 0) {
    filtered = filtered.filter(a => categoryFilter.includes(a._category));
  }

  // Friend filter (multi-select — union)
  if (friendFilter.length > 0) {
    filtered = filtered.filter(a => a._otherPartyId && friendFilter.includes(a._otherPartyId));
  }

  const hasAnyFilter = dateFilter !== 'all' || categoryFilter.length > 0 || friendFilter.length > 0;
  const clearFilters = () => { setDateFilter('all'); setCategoryFilter([]); setFriendFilter([]); };

  /* ── Get display info for an activity ─────────────────────── */
  const getActivityInfo = (activity) => {
    if (!activity) return { title: 'Activity', description: '', icon: Activity, status: null };

    let title = 'Activity';
    let icon = Activity;
    let status = activity.status;

    if (activity.type === 'loan') {
      const isLender = activity.lender_id === user.id;
      const otherParty = getUserById(isLender ? activity.borrower_id : activity.lender_id);
      const amount = `$${activity.amount?.toLocaleString() || '0'}`;
      const username = `@${otherParty?.username || 'user'}`;
      const reason = activity.purpose || 'Reason';

      if (activity.status === 'pending' || !activity.status) {
        title = isLender ? `Sent ${amount} loan offer to ${username} for ${reason}` : `Received ${amount} loan offer from ${username} for ${reason}`;
        icon = isLender ? Send : ArrowDownRight;
      } else if (activity.status === 'active') {
        title = isLender ? `${username} accepted your ${amount} loan for ${reason}` : `You accepted ${amount} loan from ${username} for ${reason}`;
        icon = Check;
      } else if (activity.status === 'declined') {
        title = isLender ? `${username} declined your ${amount} loan for ${reason}` : `You declined ${amount} loan from ${username} for ${reason}`;
        icon = X;
      } else if (activity.status === 'cancelled') {
        title = isLender ? `You cancelled ${amount} loan offer to ${username} for ${reason}` : `${username} cancelled their ${amount} loan offer for ${reason}`;
        icon = Ban;
      } else if (activity.status === 'completed') {
        title = isLender ? `${username} fully repaid your ${amount} loan for ${reason}` : `You fully repaid ${amount} loan to ${username} for ${reason}`;
        icon = Check;
      } else {
        title = isLender ? `${amount} loan to ${username}` : `${amount} loan from ${username}`;
      }
    }

    if (activity.type === 'payment') {
      const associatedLoan = safeLoans.find(l => l && l.id === activity.loan_id);
      if (associatedLoan) {
        const isBorrower = associatedLoan.borrower_id === user.id;
        const otherParty = getUserById(isBorrower ? associatedLoan.lender_id : associatedLoan.borrower_id);
        const amount = `$${activity.amount?.toLocaleString() || '0'}`;
        const username = `@${otherParty?.username || 'user'}`;
        title = isBorrower ? `You made a ${amount} payment to ${username}` : `Received ${amount} payment from ${username}`;
        icon = isBorrower ? ArrowUpRight : ArrowDownRight;
        status = activity.status || 'completed';
      }
    }

    const description = activity.date ? format(new Date(activity.date), 'MMM d, yyyy \u00B7 h:mm a') : '';
    return { title, description, icon, status };
  };

  /* ══════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════ */
  return (
    <>
      <div className="home-with-sidebar" style={{ minHeight: '100vh', background: '#F7F7F7', paddingLeft: 240, fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif", fontSize: 14, lineHeight: 1.5 }}>
        <DashboardSidebar activePage="RecentActivity" user={user} />

        {/* Galaxy gradient background — covers full page */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', bottom: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 520, background: 'linear-gradient(180deg, #527DFF 0%, #5580FF 5%, #678AFB 13%, #7792F4 22%, #8C9BEE 32%, #A19EEB 42%, #A79DEA 50%, #BB98E8 58%, #C89CE6 65%, #D4A0E4 72%, #DDA5E2 76%, #F0D8EA 80%, #F7F7F7 84%)' }} />
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 320, opacity: 0.6 }} viewBox="0 0 1617 329" fill="none">
            <defs><radialGradient id="raStarGlow"><stop offset="0%" stopColor="#EAF9F3"/><stop offset="100%" stopColor="#9FEBFB"/></radialGradient></defs>
            {STAR_CIRCLES.map((s, i) => <circle key={i} cx={s.cx} cy={s.cy} r="1.75" fill="url(#raStarGlow)" opacity={s.o}/>)}
          </svg>
          <div className="twinkle-star" /><div className="twinkle-star" /><div className="twinkle-star" /><div className="twinkle-star" /><div className="twinkle-star" />
        </div>

        {/* Hero title */}
        <div style={{ position: 'relative', zIndex: 10, maxWidth: 1080, margin: '0 auto', padding: '0 28px' }}>
          <div style={{ paddingTop: 80, paddingBottom: 20, textAlign: 'center' }}>
            <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '3.2rem', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1, color: 'white', margin: 0 }}>
              Recent Activity
            </h1>
          </div>
        </div>

        {/* Page content */}
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 28px 64px', position: 'relative', zIndex: 10 }}>

          {/* ── Filter Bar ─────────────────────────────────────── */}
          <div className="glass-card" style={{ padding: '16px 22px', marginBottom: 20, overflow: 'visible' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <SingleSelectDropdown options={DATE_OPTIONS} selected={dateFilter} onChange={setDateFilter} />
              <MultiSelectDropdown label="All Categories" options={CATEGORY_OPTIONS} selected={categoryFilter} onChange={setCategoryFilter} />
              {friendOptions.length > 0 && (
                <MultiSelectDropdown label="All Friends" options={friendOptions} selected={friendFilter} onChange={setFriendFilter} />
              )}
              <button
                onClick={clearFilters}
                style={{
                  marginLeft: 'auto',
                  padding: '8px 14px', borderRadius: 10,
                  border: hasAnyFilter ? '1px solid rgba(232,114,110,0.3)' : '1px solid rgba(0,0,0,0.08)',
                  background: hasAnyFilter ? 'rgba(232,114,110,0.06)' : 'transparent',
                  fontSize: 13, fontWeight: 500,
                  color: hasAnyFilter ? '#E8726E' : '#787776',
                  cursor: hasAnyFilter ? 'pointer' : 'default',
                  opacity: hasAnyFilter ? 1 : 0.5,
                  fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
                  transition: 'background 0.15s, opacity 0.15s',
                }}
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* ── Activity List ──────────────────────────────────── */}
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '20px 26px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#0D0D0C', letterSpacing: '-0.02em' }}>All Activity</span>
                <span style={{ fontSize: 12, color: '#787776' }}>
                  {filtered.length} {filtered.length === 1 ? 'activity' : 'activities'}
                </span>
              </div>
            </div>
            <div style={{ padding: '14px 26px 26px' }}>
              {filtered.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', color: '#C7C6C4' }}>
                  <Activity size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
                  <p style={{ fontSize: 13, color: '#787776', margin: 0 }}>No activity found</p>
                  {hasAnyFilter && <p style={{ fontSize: 12, color: '#C7C6C4', margin: '4px 0 0' }}>Try adjusting your filters</p>}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {filtered.map((activity, index) => {
                    const { title, description, icon: Icon, status } = getActivityInfo(activity);
                    const statusCfg = status && STATUS_ICON_MAP[status];
                    const StatusIcon = statusCfg?.icon;

                    return (
                      <div
                        key={`${activity.type}-${activity.id}-${index}`}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                          borderRadius: 12, background: 'rgba(0,0,0,0.03)', transition: 'background 0.15s',
                        }}
                      >
                        {/* Icon */}
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%', background: 'rgba(103,138,251,0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <Icon size={16} style={{ color: '#678AFB' }} />
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: '#1A1918', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {title}
                          </p>
                          <p style={{ fontSize: 11, color: '#787776', margin: '2px 0 0' }}>
                            {description}
                          </p>
                        </div>

                        {/* Status badge */}
                        {statusCfg && StatusIcon && (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
                            borderRadius: 10, background: 'white', flexShrink: 0,
                            border: '1px solid rgba(0,0,0,0.06)',
                          }}>
                            <StatusIcon size={13} style={{ color: statusCfg.color }} />
                            <span style={{ fontSize: 11, fontWeight: 600, color: statusCfg.color, textTransform: 'capitalize' }}>{status}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

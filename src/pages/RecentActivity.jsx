import React, { useState, useEffect, useRef } from "react";
import { Loan, Payment, User, PublicProfile, Friendship } from "@/entities/all";
import { Activity, ArrowUpRight, ArrowDownRight, Send, Check, X, Ban, ChevronDown, ChevronLeft, ChevronRight, Search, Download } from "lucide-react";
import { format, subDays, subMonths, subYears } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import BorrowerSignatureModal from "@/components/loans/BorrowerSignatureModal";
import MeshMobileNav from "@/components/MeshMobileNav";
import DesktopSidebar from '../components/DesktopSidebar';


const CATEGORY_OPTIONS = [
  { id: 'sent_offer', label: 'You sent a loan offer to' },
  { id: 'received_offer', label: 'You received a loan offer from' },
  { id: 'loan_accepted', label: 'You accepted a loan offer from' },
  { id: 'loan_declined', label: 'Your loan offer was declined by' },
  { id: 'loan_cancelled', label: 'Loan cancelled with' },
  { id: 'loan_completed', label: 'Loan fully repaid with' },
  { id: 'loan_defaulted', label: 'Loan defaulted with' },
  { id: 'payment_sent', label: 'You sent a payment to' },
  { id: 'payment_received', label: 'You received a payment from' },
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

const SORT_OPTIONS = [
  { id: 'date_desc', label: 'Date (Newest)' },
  { id: 'date_asc', label: 'Date (Oldest)' },
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
          border: '1px solid rgba(0,0,0,0.06)', background: selected.length > 0 ? 'rgba(3,172,234,0.08)' : 'white',
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
          background: 'white', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)',
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
                background: selected.includes(opt.id) ? '#03ACEA' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
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
          border: '1px solid rgba(0,0,0,0.06)', background: selected !== 'all' ? 'rgba(3,172,234,0.08)' : 'white',
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
          background: 'white', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)', zIndex: 50, padding: 6,
        }}>
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => { onChange(opt.id); setOpen(false); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8,
                border: 'none', cursor: 'pointer', fontSize: 13, color: '#1A1918',
                background: selected === opt.id ? 'rgba(3,172,234,0.08)' : 'transparent',
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

/* ── Sort dropdown ─────────────────────────────────────────── */
function SortDropdown({ sortBy, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = SORT_OPTIONS.find(o => o.id === sortBy) || SORT_OPTIONS[0];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 22,
          border: '1px solid rgba(0,0,0,0.06)', background: 'white',
          fontSize: 13, fontWeight: 500, color: '#1A1918', cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
        }}
      >
        {current.label}
        <ChevronDown size={14} style={{ opacity: 0.5, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: 190,
          background: 'white', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)', zIndex: 50, padding: 6,
        }}>
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => { onChange(opt.id); setOpen(false); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8,
                border: 'none', cursor: 'pointer', fontSize: 13, color: '#1A1918',
                background: sortBy === opt.id ? 'rgba(3,172,234,0.08)' : 'transparent',
                fontWeight: sortBy === opt.id ? 600 : 400, fontFamily: "'DM Sans', sans-serif",
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (sortBy !== opt.id) e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
              onMouseLeave={e => { if (sortBy !== opt.id) e.currentTarget.style.background = 'transparent'; }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Export CSV dropdown ────────────────────────────────────── */
function ExportDropdown({ filteredCount, totalCount, hasAnyFilter, onExport }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 40, height: 40, borderRadius: 22, border: '1px solid rgba(0,0,0,0.06)',
          background: 'white', cursor: 'pointer', flexShrink: 0,
        }}
      >
        <Download size={16} style={{ color: '#5C5B5A' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: 300,
          background: 'white', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)', zIndex: 50, padding: 20,
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A1918', margin: '0 0 8px', fontFamily: "'DM Sans', sans-serif" }}>Download Activity</h3>
          {hasAnyFilter ? (
            <p style={{ fontSize: 13, color: '#787776', margin: '0 0 16px', lineHeight: 1.5 }}>
              Your filters match <span style={{ fontWeight: 700, color: '#8B3A3A' }}>{filteredCount} {filteredCount === 1 ? 'transaction' : 'transactions'}</span> out of {totalCount} total.
            </p>
          ) : (
            <p style={{ fontSize: 13, color: '#787776', margin: '0 0 16px', lineHeight: 1.5 }}>
              To download specific transactions, apply your filters first. Without filters, all activity will be included.
            </p>
          )}
          <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '0 0 16px' }} />
          <button
            onClick={() => { onExport(); setOpen(false); }}
            style={{
              width: '100%', padding: '12px 20px', borderRadius: 22, border: 'none', cursor: 'pointer',
              background: '#1A1918', color: 'white', fontSize: 13, fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {hasAnyFilter ? `Download ${filteredCount} ${filteredCount === 1 ? 'transaction' : 'transactions'}` : 'Download all activity'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */
export default function RecentActivity({ embeddedMode }) {
  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [user, setUser] = useState(null);
  const [publicProfiles, setPublicProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [dateFilter, setDateFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState([]);
  const [friendFilter, setFriendFilter] = useState([]);

  // Search & sort
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');

  // Mobile filter panel state
  const [mobileSortOpen, setMobileSortOpen] = useState(false);
  const [mobileDateOpen, setMobileDateOpen] = useState(false);

  // Loan offer view modal
  const [viewingLoanOffer, setViewingLoanOffer] = useState(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [raPage, setRaPage] = useState(0);

  const { logout } = useAuth();

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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid #82F0B9', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
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
    return { id: uid, label: p.full_name || p.username || 'User' };
  }).sort((a, b) => a.label.localeCompare(b.label));

  const totalCount = allActivities.length;

  /* ── Category display config ──────────────────────────────── */
  const CATEGORY_DISPLAY = {
    sent_offer: { label: 'You sent a loan offer to' },
    received_offer: { label: 'You received a loan offer from' },
    loan_accepted: { label: 'You accepted a loan offer from' },
    loan_declined: { label: 'Your loan offer was declined by' },
    loan_cancelled: { label: 'Loan cancelled with' },
    loan_completed: { label: 'Loan fully repaid with' },
    loan_defaulted: { label: 'Loan defaulted with' },
    payment_sent: { label: 'You sent a payment to' },
    payment_received: { label: 'You received a payment from' },
  };

  /* ── Get display info for an activity ─────────────────────── */
  const getActivityInfo = (activity) => {
    if (!activity) return { title: 'Activity', description: '', icon: Activity, status: null, friendName: '', amount: '', category: 'sent_offer' };

    let title = 'Activity';
    let icon = Activity;
    let status = activity.status;
    let friendName = '';
    let amount = '';
    const category = activity._category;

    if (activity.type === 'loan') {
      const isLender = activity.lender_id === user.id;
      const otherParty = getUserById(isLender ? activity.borrower_id : activity.lender_id);
      amount = `$${activity.amount?.toLocaleString() || '0'}`;
      const username = otherParty?.full_name || otherParty?.username || 'User';
      friendName = otherParty?.full_name || otherParty?.username || 'Unknown';

      if (activity.status === 'pending' || !activity.status) {
        title = isLender ? `Sent ${amount} loan offer to ${username}` : `Received ${amount} loan offer from ${username}`;
        icon = isLender ? Send : ArrowDownRight;
      } else if (activity.status === 'active') {
        title = isLender ? `${username} accepted your ${amount} loan` : `You accepted ${amount} loan from ${username}`;
        icon = Check;
      } else if (activity.status === 'declined') {
        title = isLender ? `${username} declined your ${amount} loan` : `You declined ${amount} loan from ${username}`;
        icon = X;
      } else if (activity.status === 'cancelled') {
        title = isLender ? `You cancelled ${amount} loan offer to ${username}` : `${username} cancelled their ${amount} loan offer`;
        icon = Ban;
      } else if (activity.status === 'completed') {
        title = isLender ? `${username} fully repaid your ${amount} loan` : `You fully repaid ${amount} loan to ${username}`;
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
        amount = `$${activity.amount?.toLocaleString() || '0'}`;
        const username = otherParty?.full_name || otherParty?.username || 'User';
        friendName = otherParty?.full_name || otherParty?.username || 'Unknown';
        title = isBorrower ? `You made a ${amount} payment to ${username}` : `Received ${amount} payment from ${username}`;
        icon = isBorrower ? ArrowUpRight : ArrowDownRight;
        status = activity.status || 'completed';
      }
    }

    const description = activity.date ? format(new Date(activity.date), 'MMM d, yyyy \u00B7 h:mm a') : '';
    return { title, description, icon, status, friendName, amount, category };
  };

  const getIconStyle = (IconComp) => {
    if (IconComp === Send)           return { bg: 'rgba(84,166,207,0.14)',   color: '#54A6CF' };
    if (IconComp === ArrowDownRight) return { bg: 'rgba(126,192,234,0.16)',  color: '#7EC0EA' };
    if (IconComp === ArrowUpRight)   return { bg: 'rgba(139,92,246,0.13)',   color: '#8B5CF6' };
    if (IconComp === Check)          return { bg: 'rgba(34,197,94,0.13)',    color: '#22C55E' };
    if (IconComp === X)              return { bg: 'rgba(232,114,110,0.14)',  color: '#E8726E' };
    if (IconComp === Ban)            return { bg: 'rgba(245,158,11,0.14)',   color: '#F59E0B' };
    return                                  { bg: 'rgba(155,154,152,0.13)', color: '#9B9A98' };
  };

  /* ── Apply filters ────────────────────────────────────────── */
  let filtered = allActivities;

  // Search
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    filtered = filtered.filter(a => {
      const info = getActivityInfo(a);
      const catLabel = (CATEGORY_DISPLAY[info.category]?.label || '').toLowerCase();
      return info.title.toLowerCase().includes(q) || info.friendName.toLowerCase().includes(q) || catLabel.includes(q);
    });
  }

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

  // Friend filter (multi-select — union)
  if (friendFilter.length > 0) {
    filtered = filtered.filter(a => a._otherPartyId && friendFilter.includes(a._otherPartyId));
  }

  // Category filter (multi-select — union)
  if (categoryFilter.length > 0) {
    filtered = filtered.filter(a => categoryFilter.includes(a._category));
  }

  // Sort
  if (sortBy === 'date_desc') filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  else if (sortBy === 'date_asc') filtered.sort((a, b) => new Date(a.date) - new Date(b.date));

  const hasAnyFilter = dateFilter !== 'all' || categoryFilter.length > 0 || friendFilter.length > 0 || searchQuery.trim() !== '';
  const clearFilters = () => {
    setDateFilter('all'); setCategoryFilter([]); setFriendFilter([]);
    setSearchQuery('');
  };

  /* ── Export CSV ──────────────────────────────────────────── */
  const handleExportCSV = () => {
    const headers = ['Date', 'Friend', 'Category', 'Status', 'Description'];
    const rows = filtered.map(activity => {
      const info = getActivityInfo(activity);
      const catDisplay = CATEGORY_DISPLAY[info.category] || CATEGORY_DISPLAY.sent_offer;
      return [
        activity.date ? format(new Date(activity.date), 'yyyy-MM-dd') : '',
        info.friendName,
        catDisplay.label,
        info.status || '',
        `"${info.title.replace(/"/g, '""')}"`,
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vony-activity-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Pending confirmations for right panel ───────────────── */
  const pendingToConfirm = safePayments.filter(p => {
    const loan = safeLoans.find(l => l.id === p.loan_id);
    return loan && loan.lender_id === user?.id && p.status === 'pending_confirmation';
  });

  /* ── RightSection component ──────────────────────────────── */
  const RightSection = ({ title, children }) => (
    <div style={{ marginBottom: 40 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif", paddingBottom: 5, marginBottom: 2 }}>{title}</div>
      {children}
    </div>
  );


  /* ── Status badge renderer ───────────────────────────────── */
  const renderStatusBadge = (activity, status) => {
    // Pending payment confirmation
    if (activity.type === 'payment' && status === 'pending_confirmation') {
      return (
        <div style={{
          display: 'inline-flex', alignItems: 'center',
          padding: '3px 10px', borderRadius: 8,
          background: 'rgba(139,92,246,0.15)', color: '#8B5CF6',
          border: '1px solid rgba(139,92,246,0.3)',
          fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          Pending payment confirmation
        </div>
      );
    }

    // Pending loan offer received (user is borrower)
    if (activity.type === 'loan' && status === 'pending' && activity.lender_id !== user.id) {
      return (
        <button
          onClick={() => setViewingLoanOffer(activity)}
          style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '4px 14px', borderRadius: 8,
            background: 'white', border: '1px solid rgba(0,0,0,0.12)',
            color: '#1A1918', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          View
        </button>
      );
    }

    // Pending loan offer sent (user is lender)
    if (activity.type === 'loan' && status === 'pending' && activity.lender_id === user.id) {
      return (
        <div style={{
          display: 'inline-flex', alignItems: 'center',
          padding: '3px 10px', borderRadius: 8,
          background: 'rgba(84,166,207,0.15)', color: '#54A6CF',
          border: '1px solid rgba(84,166,207,0.3)',
          fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          Awaiting Borrower's Signature
        </div>
      );
    }

    return null;
  };

  const RA_PAGE_SIZE = 20;
  const raTotalPages = Math.max(1, Math.ceil(filtered.length / RA_PAGE_SIZE));
  const raSafePage = Math.min(raPage, raTotalPages - 1);
  const raPageItems = filtered.slice(raSafePage * RA_PAGE_SIZE, (raSafePage + 1) * RA_PAGE_SIZE);

  /* ══════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════ */

  if (embeddedMode) {
    return (
      <>
        {/* Filters */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', background: 'transparent', borderRadius: 18, border: '1px solid rgba(0,0,0,0.06)', height: 36 }}>
              <Search size={14} style={{ color: '#787776', flexShrink: 0 }} />
              <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: '#1A1918', background: 'transparent' }} />
            </div>
          </div>
          <div className="filter-row-scroll" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, position: 'relative', zIndex: 20 }}>
            <SortDropdown sortBy={sortBy} onChange={setSortBy} />
            <SingleSelectDropdown options={DATE_OPTIONS} selected={dateFilter} onChange={setDateFilter} />
            <MultiSelectDropdown label="All Categories" options={CATEGORY_OPTIONS} selected={categoryFilter} onChange={setCategoryFilter} />
            {friendOptions.length > 0 && (
              <MultiSelectDropdown label="All Friends" options={friendOptions} selected={friendFilter} onChange={setFriendFilter} />
            )}
            <ExportDropdown filteredCount={filtered.length} totalCount={totalCount} hasAnyFilter={hasAnyFilter} onExport={handleExportCSV} />
            <button onClick={clearFilters} style={{ padding: '6px 10px', borderRadius: 8, border: hasAnyFilter ? '1px solid rgba(232,114,110,0.3)' : '1px solid rgba(0,0,0,0.08)', background: hasAnyFilter ? 'rgba(232,114,110,0.06)' : 'transparent', fontSize: 12, fontWeight: 500, color: hasAnyFilter ? '#E8726E' : '#787776', cursor: hasAnyFilter ? 'pointer' : 'default', opacity: hasAnyFilter ? 1 : 0.5, fontFamily: "'DM Sans', sans-serif" }}>Clear</button>
          </div>
        </div>

        {/* Activity List */}
        <div style={{ position: 'relative' }}>
          <div className="home-aura-glow" style={{ position: 'absolute', inset: -3, background: '#CFDCE7', borderRadius: 12, filter: 'blur(4px)', opacity: 0.5, zIndex: 0, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, background: '#ffffff', borderRadius: 10, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, padding: '10px 16px' }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: '#787776', marginRight: 4 }}>Page {raSafePage + 1} of {raTotalPages}</span>
            <button onClick={() => setRaPage(Math.max(0, raSafePage - 1))} disabled={raSafePage === 0} style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid rgba(0,0,0,0.09)', background: 'white', cursor: raSafePage === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: raSafePage === 0 ? 0.3 : 1, flexShrink: 0 }}>
              <ChevronLeft size={13} style={{ color: '#787776' }} />
            </button>
            <button onClick={() => setRaPage(Math.min(raTotalPages - 1, raSafePage + 1))} disabled={raSafePage >= raTotalPages - 1} style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid rgba(0,0,0,0.09)', background: 'white', cursor: raSafePage >= raTotalPages - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: raSafePage >= raTotalPages - 1 ? 0.3 : 1, flexShrink: 0 }}>
              <ChevronRight size={13} style={{ color: '#787776' }} />
            </button>
          </div>
          <div style={{ padding: '0 16px' }}>
          {filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
              <p style={{ fontSize: 13, color: '#787776', margin: 0, textAlign: 'center' }}>Nothing to show here yet ✨</p>
              {hasAnyFilter && <p style={{ fontSize: 12, color: '#C7C6C4', margin: '4px 0 0' }}>Try adjusting your filters</p>}
            </div>
          ) : (
            <>
              {/* Table header */}
              <div className="ra-table-header" style={{
                display: 'grid',
                gridTemplateColumns: '120px 1fr 200px',
                alignItems: 'center',
                padding: '0 0 12px',
                borderBottom: '1px solid rgba(0,0,0,0.06)',
                marginBottom: 8,
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#787776', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#787776', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>Category</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#787776', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>Status</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {raPageItems.map((activity, index) => {
                  const { title, description, icon: Icon, status, friendName, amount, category } = getActivityInfo(activity);
                  const { bg: iconBg, color: iconColor } = getIconStyle(Icon);
                  const dateDisplay = activity.date ? format(new Date(activity.date), 'MMM d, yyyy') : '';

                  return (
                    <div
                      key={`${activity.type}-${activity.id}-${index}`}
                      className="ra-table-row"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '120px 1fr 200px',
                        alignItems: 'center',
                        padding: '9px 0',
                        borderBottom: 'none',
                      }}
                    >
                      {/* Col 1: Date */}
                      <span className="ra-col-date" style={{ fontSize: 12, color: '#787776', fontWeight: 500 }}>
                        {dateDisplay}
                      </span>

                      {/* Col 2: Category — icon + title */}
                      <div className="ra-col-main" style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: 20, height: 20, borderRadius: 6, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 8 }}>
                          <Icon size={13} style={{ color: iconColor }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {title}
                        </span>
                      </div>

                      {/* Col 3: Status badge */}
                      <div className="ra-col-status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {renderStatusBadge(activity, status)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          </div>
        </div>
        </div>

        {/* Loan Offer View Modal */}
        {viewingLoanOffer && (
          <div
            onClick={() => setViewingLoanOffer(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 50,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: 'white', borderRadius: 12, padding: 24,
                maxWidth: 420, width: '90%',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1A1918', margin: '0 0 16px' }}>
                Loan Offer from {getUserById(viewingLoanOffer.lender_id)?.full_name || 'Lender'}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div style={{ background: '#ffffff', borderRadius: 10, padding: '12px 14px' }}>
                  <p style={{ fontSize: 11, color: '#787776', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Amount</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#1A1918', margin: 0 }}>${viewingLoanOffer.amount?.toLocaleString() || '0'}</p>
                </div>
                <div style={{ background: '#ffffff', borderRadius: 10, padding: '12px 14px' }}>
                  <p style={{ fontSize: 11, color: '#787776', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Interest Rate</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#1A1918', margin: 0 }}>{viewingLoanOffer.interest_rate ?? '0'}%</p>
                </div>
                <div style={{ background: '#ffffff', borderRadius: 10, padding: '12px 14px' }}>
                  <p style={{ fontSize: 11, color: '#787776', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Repayment Period</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#1A1918', margin: 0 }}>{viewingLoanOffer.repayment_period_months ?? viewingLoanOffer.duration_months ?? '—'} mo</p>
                </div>
                <div style={{ background: '#ffffff', borderRadius: 10, padding: '12px 14px' }}>
                  <p style={{ fontSize: 11, color: '#787776', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Purpose</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#1A1918', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{viewingLoanOffer.purpose || '—'}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => {
                    setShowSignModal(true);
                  }}
                  style={{
                    flex: 1, padding: '12px 20px', borderRadius: 22, border: 'none', cursor: 'pointer',
                    background: '#1A1918', color: 'white', fontSize: 13, fontWeight: 600,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Sign & Accept
                </button>
                <button
                  onClick={() => setViewingLoanOffer(null)}
                  style={{
                    padding: '12px 20px', borderRadius: 22,
                    border: '1px solid rgba(0,0,0,0.12)', cursor: 'pointer',
                    background: 'white', color: '#1A1918', fontSize: 13, fontWeight: 600,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Borrower Signature Modal */}
        {showSignModal && viewingLoanOffer && (
          <BorrowerSignatureModal
            isOpen={showSignModal}
            onClose={() => {
              setShowSignModal(false);
              setViewingLoanOffer(null);
            }}
            onSign={async (signature) => {
              try {
                await Loan.update(viewingLoanOffer.id, { status: 'active', borrower_signature: signature });
                setShowSignModal(false);
                setViewingLoanOffer(null);
                loadData();
              } catch (e) {
                console.error('Failed to sign loan:', e);
              }
            }}
            loanDetails={viewingLoanOffer}
            userFullName={user?.full_name || ''}
            lenderName={getUserById(viewingLoanOffer.lender_id)?.full_name || 'Lender'}
          />
        )}
      </>
    );
  }

  return (
    <>
      <MeshMobileNav user={user} activePage="Recent Activity" />
      <div className="mesh-layout" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 0, minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14, lineHeight: 1.5, color: '#1A1918', WebkitFontSmoothing: 'antialiased' }}>

        {/* Col 1: left nav */}
        <DesktopSidebar />

        {/* Col 2: center content */}
        <div className="mesh-center" style={{ background: 'transparent', padding: '24px 32px 80px' }}>

          {/* Mobile-only page title (desktop shows it in top bar) */}
          <div className="mobile-page-title">
            <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.02em', marginBottom: 12 }}>Recent Activity</div>
          </div>

          {/* Filters */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', background: 'transparent', borderRadius: 18, border: '1px solid rgba(0,0,0,0.06)', height: 36 }}>
                <Search size={14} style={{ color: '#787776', flexShrink: 0 }} />
                <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: '#1A1918', background: 'transparent' }} />
              </div>
            </div>
            <div className="filter-row-scroll" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, position: 'relative', zIndex: 20 }}>
              <SortDropdown sortBy={sortBy} onChange={setSortBy} />
              <SingleSelectDropdown options={DATE_OPTIONS} selected={dateFilter} onChange={setDateFilter} />
              <MultiSelectDropdown label="All Categories" options={CATEGORY_OPTIONS} selected={categoryFilter} onChange={setCategoryFilter} />
              {friendOptions.length > 0 && (
                <MultiSelectDropdown label="All Friends" options={friendOptions} selected={friendFilter} onChange={setFriendFilter} />
              )}
              <ExportDropdown filteredCount={filtered.length} totalCount={totalCount} hasAnyFilter={hasAnyFilter} onExport={handleExportCSV} />
              <button onClick={clearFilters} style={{ padding: '6px 10px', borderRadius: 8, border: hasAnyFilter ? '1px solid rgba(232,114,110,0.3)' : '1px solid rgba(0,0,0,0.08)', background: hasAnyFilter ? 'rgba(232,114,110,0.06)' : 'transparent', fontSize: 12, fontWeight: 500, color: hasAnyFilter ? '#E8726E' : '#787776', cursor: hasAnyFilter ? 'pointer' : 'default', opacity: hasAnyFilter ? 1 : 0.5, fontFamily: "'DM Sans', sans-serif" }}>Clear</button>
            </div>
          </div>

          {/* ── Activity List ──────────────────────────────────── */}
          <div style={{ position: 'relative' }}>
            <div className="home-aura-glow" style={{ position: 'absolute', inset: -3, background: '#CFDCE7', borderRadius: 12, filter: 'blur(4px)', opacity: 0.5, zIndex: 0, pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1, background: '#ffffff', borderRadius: 10, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, padding: '10px 16px' }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: '#787776', marginRight: 4 }}>Page {raSafePage + 1} of {raTotalPages}</span>
              <button onClick={() => setRaPage(Math.max(0, raSafePage - 1))} disabled={raSafePage === 0} style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid rgba(0,0,0,0.09)', background: 'white', cursor: raSafePage === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: raSafePage === 0 ? 0.3 : 1, flexShrink: 0 }}>
                <ChevronLeft size={13} style={{ color: '#787776' }} />
              </button>
              <button onClick={() => setRaPage(Math.min(raTotalPages - 1, raSafePage + 1))} disabled={raSafePage >= raTotalPages - 1} style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid rgba(0,0,0,0.09)', background: 'white', cursor: raSafePage >= raTotalPages - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: raSafePage >= raTotalPages - 1 ? 0.3 : 1, flexShrink: 0 }}>
                <ChevronRight size={13} style={{ color: '#787776' }} />
              </button>
            </div>
            <div style={{ padding: '0 16px' }}>
            {filtered.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
                <p style={{ fontSize: 13, color: '#787776', margin: 0, textAlign: 'center' }}>Nothing to show here yet ✨</p>
                {hasAnyFilter && <p style={{ fontSize: 12, color: '#C7C6C4', margin: '4px 0 0' }}>Try adjusting your filters</p>}
              </div>
            ) : (
              <>
                {/* Table header */}
                <div className="ra-table-header" style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 1fr 200px',
                  alignItems: 'center',
                  padding: '0 0 12px',
                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                  marginBottom: 8,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#787776', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#787776', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>Category</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#787776', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>Status</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {raPageItems.map((activity, index) => {
                    const { title, description, icon: Icon, status, friendName, amount, category } = getActivityInfo(activity);
                    const { bg: iconBg, color: iconColor } = getIconStyle(Icon);
                    const dateDisplay = activity.date ? format(new Date(activity.date), 'MMM d, yyyy') : '';

                    return (
                      <div
                        key={`${activity.type}-${activity.id}-${index}`}
                        className="ra-table-row"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '120px 1fr 200px',
                          alignItems: 'center',
                          padding: '9px 0',
                          borderBottom: 'none',
                        }}
                      >
                        {/* Col 1: Date */}
                        <span className="ra-col-date" style={{ fontSize: 12, color: '#787776', fontWeight: 500 }}>
                          {dateDisplay}
                        </span>

                        {/* Col 2: Category — icon + title */}
                        <div className="ra-col-main" style={{ display: 'flex', alignItems: 'center' }}>
                          <div style={{ width: 20, height: 20, borderRadius: 6, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 8 }}>
                            <Icon size={13} style={{ color: iconColor }} />
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 500, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {title}
                          </span>
                        </div>

                        {/* Col 3: Status badge */}
                        <div className="ra-col-status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {renderStatusBadge(activity, status)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            </div>
          </div>
          </div>{/* end activity-list aurora wrapper */}

        </div>


      </div>

      {/* ── Loan Offer View Modal ─────────────────────────────── */}
      {viewingLoanOffer && (
        <div
          onClick={() => setViewingLoanOffer(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: 12, padding: 24,
              maxWidth: 420, width: '90%',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1A1918', margin: '0 0 16px' }}>
              Loan Offer from {getUserById(viewingLoanOffer.lender_id)?.full_name || 'Lender'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div style={{ background: '#ffffff', borderRadius: 10, padding: '12px 14px' }}>
                <p style={{ fontSize: 11, color: '#787776', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Amount</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#1A1918', margin: 0 }}>${viewingLoanOffer.amount?.toLocaleString() || '0'}</p>
              </div>
              <div style={{ background: '#ffffff', borderRadius: 10, padding: '12px 14px' }}>
                <p style={{ fontSize: 11, color: '#787776', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Interest Rate</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#1A1918', margin: 0 }}>{viewingLoanOffer.interest_rate ?? '0'}%</p>
              </div>
              <div style={{ background: '#ffffff', borderRadius: 10, padding: '12px 14px' }}>
                <p style={{ fontSize: 11, color: '#787776', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Repayment Period</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#1A1918', margin: 0 }}>{viewingLoanOffer.repayment_period_months ?? viewingLoanOffer.duration_months ?? '—'} mo</p>
              </div>
              <div style={{ background: '#ffffff', borderRadius: 10, padding: '12px 14px' }}>
                <p style={{ fontSize: 11, color: '#787776', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Purpose</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#1A1918', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{viewingLoanOffer.purpose || '—'}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => {
                  setShowSignModal(true);
                }}
                style={{
                  flex: 1, padding: '12px 20px', borderRadius: 22, border: 'none', cursor: 'pointer',
                  background: '#1A1918', color: 'white', fontSize: 13, fontWeight: 600,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Sign & Accept
              </button>
              <button
                onClick={() => setViewingLoanOffer(null)}
                style={{
                  padding: '12px 20px', borderRadius: 22,
                  border: '1px solid rgba(0,0,0,0.12)', cursor: 'pointer',
                  background: 'white', color: '#1A1918', fontSize: 13, fontWeight: 600,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Borrower Signature Modal ──────────────────────────── */}
      {showSignModal && viewingLoanOffer && (
        <BorrowerSignatureModal
          isOpen={showSignModal}
          onClose={() => {
            setShowSignModal(false);
            setViewingLoanOffer(null);
          }}
          onSign={async (signature) => {
            try {
              await Loan.update(viewingLoanOffer.id, { status: 'active', borrower_signature: signature });
              setShowSignModal(false);
              setViewingLoanOffer(null);
              loadData();
            } catch (e) {
              console.error('Failed to sign loan:', e);
            }
          }}
          loanDetails={viewingLoanOffer}
          userFullName={user?.full_name || ''}
          lenderName={getUserById(viewingLoanOffer.lender_id)?.full_name || 'Lender'}
        />
      )}
    </>
  );
}

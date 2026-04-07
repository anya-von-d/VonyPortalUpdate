import React, { useState, useEffect, useRef } from "react";
import { Loan, Payment, User, PublicProfile, Friendship } from "@/entities/all";
import { Activity, ArrowUpRight, ArrowDownRight, Send, Check, X, Ban, ChevronDown, Clock, Search, Download } from "lucide-react";
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


const AMOUNT_MODES = [
  { id: 'all', label: 'All amounts' },
  { id: 'exactly', label: 'Exactly' },
  { id: 'between', label: 'Between' },
  { id: 'greater', label: 'Greater than' },
  { id: 'less', label: 'Less than' },
];

const SORT_OPTIONS = [
  { id: 'date_desc', label: 'Date (Newest)' },
  { id: 'date_asc', label: 'Date (Oldest)' },
  { id: 'amount_desc', label: 'Amount (High to Low)' },
  { id: 'amount_asc', label: 'Amount (Low to High)' },
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
          border: '1px solid rgba(0,0,0,0.08)', background: selected.length > 0 ? 'rgba(130,240,185,0.08)' : 'white',
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
                background: selected.includes(opt.id) ? '#82F0B9' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
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
          border: '1px solid rgba(0,0,0,0.08)', background: selected !== 'all' ? 'rgba(130,240,185,0.08)' : 'white',
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
                background: selected === opt.id ? 'rgba(130,240,185,0.08)' : 'transparent',
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

/* ── Amount filter dropdown ────────────────────────────────── */
function AmountFilterDropdown({ amountMode, setAmountMode, amountVal1, setAmountVal1, amountVal2, setAmountVal2, onApply }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isFiltered = amountMode !== 'all';
  const displayLabel = amountMode === 'all' ? 'All Amounts'
    : amountMode === 'exactly' ? (amountVal1 ? `Exactly $${amountVal1}` : 'Exactly')
    : amountMode === 'between' ? (amountVal1 && amountVal2 ? `$${amountVal1} – $${amountVal2}` : 'Between')
    : amountMode === 'greater' ? (amountVal1 ? `> $${amountVal1}` : 'Greater than')
    : amountMode === 'less' ? (amountVal1 ? `< $${amountVal1}` : 'Less than')
    : 'All Amounts';

  const modeDescriptions = {
    all: '',
    exactly: 'Search for an exact transaction amount.',
    between: 'Search for transactions between two number amounts.',
    greater: 'Search for transactions above a certain amount.',
    less: 'Search for transactions below a certain amount.',
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
          border: '1px solid rgba(0,0,0,0.08)', background: isFiltered ? 'rgba(130,240,185,0.08)' : 'white',
          fontSize: 13, fontWeight: 500, color: '#1A1918', cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', transition: 'background 0.15s',
        }}
      >
        {displayLabel}
        <ChevronDown size={14} style={{ opacity: 0.5, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: 380,
          background: 'white', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)', zIndex: 50, display: 'flex', overflow: 'hidden',
        }}>
          {/* Left: mode list */}
          <div style={{ borderRight: '1px solid rgba(0,0,0,0.06)', padding: '8px 0', minWidth: 140 }}>
            {AMOUNT_MODES.map(mode => (
              <button
                key={mode.id}
                onClick={() => { setAmountMode(mode.id); if (mode.id === 'all') { setAmountVal1(''); setAmountVal2(''); } }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: '#1A1918', fontFamily: "'DM Sans', sans-serif",
                  background: amountMode === mode.id ? 'rgba(0,0,0,0.03)' : 'transparent',
                  fontWeight: amountMode === mode.id ? 600 : 400,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
                onMouseLeave={e => { if (amountMode !== mode.id) e.currentTarget.style.background = 'transparent'; }}
              >
                {mode.label}
                {amountMode === mode.id && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1A1918" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                )}
              </button>
            ))}
          </div>
          {/* Right: inputs */}
          <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {amountMode === 'all' ? (
              <p style={{ fontSize: 13, color: '#787776', margin: 0 }}>Showing transactions of any amount.</p>
            ) : (
              <>
                <p style={{ fontSize: 13, color: '#787776', margin: 0 }}>{modeDescriptions[amountMode]}</p>
                {amountMode === 'between' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 14, color: '#787776', fontWeight: 500 }}>$</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={amountVal1}
                        onChange={e => setAmountVal1(e.target.value)}
                        style={{
                          width: 70, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)',
                          fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: 'none',
                        }}
                        onFocus={e => e.target.style.borderColor = '#82F0B9'}
                        onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.1)'}
                      />
                    </div>
                    <span style={{ fontSize: 13, color: '#787776' }}>›</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 14, color: '#787776', fontWeight: 500 }}>$</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={amountVal2}
                        onChange={e => setAmountVal2(e.target.value)}
                        style={{
                          width: 70, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)',
                          fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: 'none',
                        }}
                        onFocus={e => e.target.style.borderColor = '#82F0B9'}
                        onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.1)'}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 14, color: '#787776', fontWeight: 500 }}>$</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={amountVal1}
                      onChange={e => setAmountVal1(e.target.value)}
                      style={{
                        width: 100, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)',
                        fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: 'none',
                      }}
                      onFocus={e => e.target.style.borderColor = '#82F0B9'}
                      onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.1)'}
                    />
                  </div>
                )}
                <button
                  onClick={() => { onApply(); setOpen(false); }}
                  style={{
                    padding: '8px 18px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    background: '#1A1918', color: 'white', fontSize: 13, fontWeight: 600,
                    fontFamily: "'DM Sans', sans-serif", alignSelf: 'flex-start',
                  }}
                >
                  Set Amount
                </button>
              </>
            )}
          </div>
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
          border: '1px solid rgba(0,0,0,0.08)', background: 'white',
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
          background: 'white', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)', zIndex: 50, padding: 6,
        }}>
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => { onChange(opt.id); setOpen(false); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8,
                border: 'none', cursor: 'pointer', fontSize: 13, color: '#1A1918',
                background: sortBy === opt.id ? 'rgba(130,240,185,0.08)' : 'transparent',
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

  const activeFilterCount = hasAnyFilter
    ? [true].length // we'll pass the actual count
    : 0;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 40, height: 40, borderRadius: 22, border: '1px solid rgba(0,0,0,0.08)',
          background: 'white', cursor: 'pointer', flexShrink: 0,
        }}
      >
        <Download size={16} style={{ color: '#5C5B5A' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: 300,
          background: 'white', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)',
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
              background: '#1A1918', color: 'white', fontSize: 14, fontWeight: 600,
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
  const [amountMode, setAmountMode] = useState('all');
  const [amountVal1, setAmountVal1] = useState('');
  const [amountVal2, setAmountVal2] = useState('');
  const [amountApplied, setAmountApplied] = useState(false);

  // Search & sort
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');

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
      <div className="home-with-sidebar" style={{ minHeight: '100vh', fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif", fontSize: 14, lineHeight: 1.5, color: '#1A1918', WebkitFontSmoothing: 'antialiased', paddingTop: 88, background: 'transparent' }}>
        <DashboardSidebar activePage="RecentActivity" user={user} />
          <div style={{ maxWidth: 1080, margin: '0 auto', paddingRight: 24, maxWidth: 1080, margin: '0 auto', padding: '24px 40px 64px', position: 'relative', zIndex: 2 }}>
            <div className="glass-card" style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 32, height: 32, border: '2px solid #82F0B9', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 12 }} />
              <p style={{ fontSize: 13, color: '#787776' }}>{isLoading ? 'Loading activity...' : 'Please log in to view activity'}</p>
            </div>
          <div style={{ padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: '#787776' }}>2026 Vony, Inc. All rights reserved.</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <span style={{ fontSize: 11, color: '#787776' }}>Terms of Service</span>
              <span style={{ fontSize: 11, color: '#787776' }}>Privacy Center</span>
              <span style={{ fontSize: 11, color: '#787776' }}>Do not sell or share my personal information</span>
            </div>
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
    return { id: uid, label: p.full_name || p.username || 'User' };
  }).sort((a, b) => a.label.localeCompare(b.label));

  const totalCount = allActivities.length;

  /* ── Apply filters ────────────────────────────────────────── */
  let filtered = allActivities;

  // Search
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    filtered = filtered.filter(a => {
      const info = getActivityInfo(a);
      const catLabel = (CATEGORY_DISPLAY[info.category]?.label || '').toLowerCase();
      return info.title.toLowerCase().includes(q) || info.friendName.toLowerCase().includes(q) || info.amount.toLowerCase().includes(q) || catLabel.includes(q);
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

  // Amount filter
  if (amountMode !== 'all' && amountApplied) {
    const v1 = parseFloat(amountVal1) || 0;
    const v2 = parseFloat(amountVal2) || 0;
    filtered = filtered.filter(a => {
      const amt = a.amount || 0;
      if (amountMode === 'exactly') return amt === v1;
      if (amountMode === 'between') return amt >= Math.min(v1, v2) && amt <= Math.max(v1, v2);
      if (amountMode === 'greater') return amt > v1;
      if (amountMode === 'less') return amt < v1;
      return true;
    });
  }

  // Sort
  if (sortBy === 'date_desc') filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  else if (sortBy === 'date_asc') filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
  else if (sortBy === 'amount_desc') filtered.sort((a, b) => (b.amount || 0) - (a.amount || 0));
  else if (sortBy === 'amount_asc') filtered.sort((a, b) => (a.amount || 0) - (b.amount || 0));

  const hasAnyFilter = dateFilter !== 'all' || categoryFilter.length > 0 || friendFilter.length > 0 || (amountMode !== 'all' && amountApplied) || searchQuery.trim() !== '';
  const clearFilters = () => {
    setDateFilter('all'); setCategoryFilter([]); setFriendFilter([]);
    setAmountMode('all'); setAmountVal1(''); setAmountVal2('');
    setAmountApplied(false); setSearchQuery('');
  };

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

  /* ── Format date for table display ──────────────────────────── */
  const formatActivityDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const thisYear = now.getFullYear();
    const activityYear = d.getFullYear();
    if (activityYear < thisYear) {
      return format(d, 'M/d/yyyy');
    }
    return format(d, 'M/dd');
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

  /* ── Export CSV ──────────────────────────────────────────── */
  const handleExportCSV = () => {
    const headers = ['Date', 'Friend', 'Category', 'Status', 'Amount', 'Description'];
    const rows = filtered.map(activity => {
      const info = getActivityInfo(activity);
      const catDisplay = CATEGORY_DISPLAY[info.category] || CATEGORY_DISPLAY.sent_offer;
      return [
        activity.date ? format(new Date(activity.date), 'yyyy-MM-dd') : '',
        info.friendName,
        catDisplay.label,
        info.status || '',
        info.amount,
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

  /* ══════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════ */
  return (
    <>
      <div className="home-with-sidebar" style={{ minHeight: '100vh', fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif", fontSize: 14, lineHeight: 1.5, color: '#1A1918', WebkitFontSmoothing: 'antialiased', paddingTop: 88, background: 'transparent' }}>
        <DashboardSidebar activePage="RecentActivity" user={user} />

          {/* Gradient background */}


          {/* Page content */}
          <div style={{ maxWidth: 1080, margin: '0 auto', paddingRight: 24, maxWidth: 1080, margin: '0 auto', padding: '24px 40px 64px', position: 'relative', zIndex: 2 }}>

          {/* ── Search Bar + Sort + Export ───────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 10,
              padding: '0 16px', background: 'white', borderRadius: 22,
              border: '1px solid rgba(0,0,0,0.08)', height: 42,
            }}>
              <Search size={16} style={{ color: '#787776', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  flex: 1, border: 'none', outline: 'none', fontSize: 14,
                  fontFamily: "'DM Sans', sans-serif", color: '#1A1918', background: 'transparent',
                }}
              />
            </div>
            <SortDropdown sortBy={sortBy} onChange={setSortBy} />
            <ExportDropdown
              filteredCount={filtered.length}
              totalCount={totalCount}
              hasAnyFilter={hasAnyFilter}
              onExport={handleExportCSV}
            />
          </div>

          {/* ── Filter Bar ─────────────────────────────────────── */}
          <div className="glass-card" style={{ padding: '16px 22px', marginBottom: 20, overflow: 'visible', position: 'relative', zIndex: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <SingleSelectDropdown options={DATE_OPTIONS} selected={dateFilter} onChange={setDateFilter} />
              <MultiSelectDropdown label="All Categories" options={CATEGORY_OPTIONS} selected={categoryFilter} onChange={setCategoryFilter} />
              {friendOptions.length > 0 && (
                <MultiSelectDropdown label="All Friends" options={friendOptions} selected={friendFilter} onChange={setFriendFilter} />
              )}
              <AmountFilterDropdown
                amountMode={amountMode}
                setAmountMode={setAmountMode}
                amountVal1={amountVal1}
                setAmountVal1={setAmountVal1}
                amountVal2={amountVal2}
                setAmountVal2={setAmountVal2}
                onApply={() => setAmountApplied(true)}
              />
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
            <div style={{ padding: '14px 16px 16px' }}>
              {filtered.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', color: '#C7C6C4' }}>
                  <Activity size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
                  <p style={{ fontSize: 13, color: '#787776', margin: 0 }}>No activity found</p>
                  {hasAnyFilter && <p style={{ fontSize: 12, color: '#C7C6C4', margin: '4px 0 0' }}>Try adjusting your filters</p>}
                </div>
              ) : (
                <>
                  {/* Desktop table header — aligned to row columns */}
                  <div className="activity-table-header" style={{
                    display: 'none', alignItems: 'center', padding: '0 14px 12px',
                    borderBottom: '1px solid rgba(0,0,0,0.06)', marginBottom: 8,
                  }}>
                    <span style={{ width: 80, fontSize: 11, fontWeight: 600, color: '#787776', textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>Date</span>
                    <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: '#787776', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: 0, paddingLeft: 4 }}>Category</span>
                    <span style={{ width: 180, fontSize: 11, fontWeight: 600, color: '#787776', textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0, paddingLeft: 12 }}>Status</span>
                    <span style={{ width: 100, fontSize: 11, fontWeight: 600, color: '#787776', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right', flexShrink: 0 }}>Amount</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {filtered.map((activity, index) => {
                      const { title, description, icon: Icon, status, friendName, amount, category } = getActivityInfo(activity);
                      const catDisplay = CATEGORY_DISPLAY[category] || CATEGORY_DISPLAY.sent_offer;
                      const dateDisplay = formatActivityDate(activity.date);

                      return (
                        <div
                          key={`${activity.type}-${activity.id}-${index}`}
                          className="activity-row"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
                            borderBottom: index < filtered.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                          }}
                        >
                          {/* Mobile layout — shown on small screens */}
                          <div className="activity-mobile-content" style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 500, color: '#1A1918', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {title}
                            </p>
                            <p style={{ fontSize: 11, color: '#787776', margin: '2px 0 0' }}>
                              {description}
                            </p>
                          </div>
                          <div className="activity-mobile-status">
                            {(status === 'pending_confirmation' && activity.type === 'payment') && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, background: 'white', flexShrink: 0, border: '1px solid rgba(0,0,0,0.06)' }}>
                                <Clock size={12} style={{ color: '#787776' }} />
                                <span style={{ fontSize: 11, fontWeight: 600, color: '#787776', whiteSpace: 'nowrap' }}>Pending confirmation</span>
                              </div>
                            )}
                            {(status === 'pending' && activity.type === 'loan' && (activity.status === 'pending' || activity.status === 'pending_borrower_approval')) && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, background: 'white', flexShrink: 0, border: '1px solid rgba(0,0,0,0.06)' }}>
                                <Clock size={12} style={{ color: '#787776' }} />
                                <span style={{ fontSize: 11, fontWeight: 600, color: '#787776', whiteSpace: 'nowrap' }}>Pending approval</span>
                              </div>
                            )}
                          </div>

                          {/* Desktop layout — shown on large screens */}
                          <span className="activity-desktop-date" style={{ display: 'none', width: 80, fontSize: 12, fontWeight: 500, color: '#787776', flexShrink: 0 }}>
                            {dateDisplay}
                          </span>
                          <div className="activity-desktop-category" style={{ display: 'none', maxWidth: 1080, margin: '0 auto', alignItems: 'center', paddingLeft: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
                          </div>
                          <div className="activity-desktop-status" style={{ display: 'none', width: 180, flexShrink: 0, alignItems: 'center', paddingLeft: 12 }}>
                            {(status === 'pending_confirmation' && activity.type === 'payment') && (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, background: 'white', border: '1px solid rgba(0,0,0,0.06)' }}>
                                <Clock size={11} style={{ color: '#787776' }} />
                                <span style={{ fontSize: 10, fontWeight: 600, color: '#787776', whiteSpace: 'nowrap' }}>Pending confirmation</span>
                              </div>
                            )}
                            {(status === 'pending' && activity.type === 'loan' && (activity.status === 'pending' || activity.status === 'pending_borrower_approval')) && (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, background: 'white', border: '1px solid rgba(0,0,0,0.06)' }}>
                                <Clock size={11} style={{ color: '#787776' }} />
                                <span style={{ fontSize: 10, fontWeight: 600, color: '#787776', whiteSpace: 'nowrap' }}>Pending approval</span>
                              </div>
                            )}
                          </div>
                          <span className="activity-desktop-amount" style={{ display: 'none', width: 100, fontSize: 13, fontWeight: 600, color: '#1A1918', textAlign: 'right', flexShrink: 0 }}>
                            {amount}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Desktop table responsive styles */}
          <style>{`
            @media (min-width: 900px) {
              .activity-table-header { display: flex !important; }
              .activity-row { gap: 0 !important; }

              .activity-mobile-content { display: none !important; }
              .activity-mobile-status { display: none !important; }
              .activity-desktop-date { display: block !important; }
              .activity-desktop-category { display: flex !important; }
              .activity-desktop-status { display: flex !important; }
              .activity-desktop-amount { display: block !important; }
            }
          `}</style>


        <div style={{ padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: '#787776' }}>2026 Vony, Inc. All rights reserved.</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <span style={{ fontSize: 11, color: '#787776' }}>Terms of Service</span>
            <span style={{ fontSize: 11, color: '#787776' }}>Privacy Center</span>
            <span style={{ fontSize: 11, color: '#787776' }}>Do not sell or share my personal information</span>
          </div>
        </div>
          </div>
      </div>
    </>
  );
}

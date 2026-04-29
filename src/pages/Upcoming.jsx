import React, { useState, useEffect, useRef, useCallback } from "react";
import { Loan, Payment, PublicProfile } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";
import { useDemoMode } from "@/lib/DemoModeContext";
import RecordPaymentModal from "@/components/loans/RecordPaymentModal";
import {
  format, addDays, addWeeks, addMonths,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  isSameMonth, isSameDay,
} from "date-fns";
import { formatMoney } from "@/components/utils/formatMoney";
import { toLocalDate, daysUntil as daysUntilDate } from "@/components/utils/dateUtils";
import { todayInTZ } from "@/components/utils/timezone";
import MeshMobileNav from "@/components/MeshMobileNav";
import DesktopSidebar from '../components/DesktopSidebar';

const WK = { weekStartsOn: 1 }; // Monday-start week

export default function Upcoming() {
  const { user: authUser, userProfile, isLoadingAuth, navigateToLogin } = useAuth();
  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [publicProfiles, setPublicProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resolveModal, setResolveModal] = useState(null);
  const [selectedDay, setSelectedDay] = useState(() => todayInTZ());

  // Calendar view state
  const [calView, setCalView] = useState('month');
  const [currentViewDate, setCurrentViewDate] = useState(() => todayInTZ());

  // Desktop split/snap state
  const [splitPct, setSplitPct] = useState(34);
  const [isCalFull, setIsCalFull] = useState(false);
  const containerRef = useRef(null);
  const isDragging = useRef(false);
  const calPanelRef = useRef(null);

  const { isDemoMode } = useDemoMode();
  const user = userProfile ? { ...userProfile, id: authUser?.id, email: authUser?.email } : null;

  const safeEntityCall = async (entityCall, fallback = []) => {
    try {
      const result = await entityCall();
      return Array.isArray(result) ? result : (result ? [result] : fallback);
    } catch { return fallback; }
  };

  const loadData = async () => {
    if (!authUser) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const [allLoans, allPayments, allProfiles] = await Promise.all([
        safeEntityCall(() => Loan.list('-created_at')),
        safeEntityCall(() => Payment.list('-created_at', 500)),
        safeEntityCall(() => PublicProfile.list()),
      ]);
      setLoans(allLoans);
      setPayments(allPayments);
      setPublicProfiles(allProfiles);
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  useEffect(() => {
    if (!isLoadingAuth && authUser) loadData();
    else if (!isLoadingAuth && !authUser) setIsLoading(false);
  }, [isLoadingAuth]);

  // ── Drag-to-resize divider ──────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      if (pct < 12) {
        setIsCalFull(true);
        isDragging.current = false;
      } else {
        setIsCalFull(false);
        setSplitPct(Math.max(18, Math.min(58, pct)));
      }
    };
    const onUp = () => { isDragging.current = false; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, []);

  // ── Wheel → navigate calendar ───────────────────────────────────────────
  useEffect(() => {
    const el = calPanelRef.current;
    if (!el) return;
    const handler = (e) => {
      e.preventDefault();
      const dir = e.deltaY > 0 ? 1 : -1;
      setCurrentViewDate(d => calView === 'month' ? addMonths(d, dir) : addWeeks(d, dir));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [calView]);

  // ── Loading / auth guards ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '2px solid #54A6CF', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px' }} className="animate-spin" />
          <p style={{ fontSize: 12, color: '#787776', fontFamily: "'DM Sans', sans-serif" }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: 'white', borderRadius: 12, padding: 32, textAlign: 'center', maxWidth: 400, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1A1918', marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>Sign in to view upcoming</h1>
          <button onClick={navigateToLogin} style={{ width: '100%', padding: '12px 24px', fontSize: 15, fontWeight: 600, background: '#54A6CF', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Sign In</button>
        </div>
      </div>
    );
  }

  // ── Data ────────────────────────────────────────────────────────────────
  const today = todayInTZ();
  const safeLoans = Array.isArray(loans) ? loans : [];
  const safeProfiles = Array.isArray(publicProfiles) ? publicProfiles : [];
  const safePayments = Array.isArray(payments) ? payments : [];

  const myLoans = safeLoans.filter(l => l && (l.lender_id === user.id || l.borrower_id === user.id));
  const activeLoans = myLoans.filter(l => l && l.status === 'active' && l.next_payment_date);

  const getProfile = (userId) => safeProfiles.find(p => p.user_id === userId);

  // ── Upcoming payment events (Next 7 Days / Coming Later) ───────────────
  const allPaymentEvents = activeLoans.map(loan => {
    const isLender = loan.lender_id === user.id;
    const otherUserId = isLender ? loan.borrower_id : loan.lender_id;
    const otherProfile = getProfile(otherUserId);
    const days = daysUntilDate(loan.next_payment_date);
    const nextPayDate = toLocalDate(loan.next_payment_date);
    const loanPayments = safePayments.filter(p => p && p.loan_id === loan.id);
    const originalAmount = loan.payment_amount || 0;

    const confirmedPayments = loanPayments
      .filter(p => p.status === 'completed' || p.status === 'confirmed')
      .sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date));
    const totalConfirmed = confirmedPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const fullPeriodsPaid = originalAmount > 0 ? Math.floor(totalConfirmed / originalAmount) : 0;
    const creditToCurrentPeriod = totalConfirmed - fullPeriodsPaid * originalAmount;
    const pendingPayments = loanPayments
      .filter(p => p.status === 'pending_confirmation')
      .reduce((s, p) => s + (p.amount || 0), 0);
    const remainingAmount = Math.max(0, originalAmount - creditToCurrentPeriod - pendingPayments);

    return {
      loan, date: nextPayDate, days, amount: remainingAmount, originalAmount, isLender,
      username: otherProfile?.username || 'user',
      fullName: otherProfile?.full_name || 'Unknown',
      firstName: (otherProfile?.full_name || otherProfile?.username || 'User').split(' ')[0],
      reason: loan.reason || loan.purpose || '',
      loanId: loan.id,
    };
  }).filter(e => e.amount > 0).sort((a, b) => a.date - b.date);

  const overdue     = allPaymentEvents.filter(e => e.days < 0);
  const next7Days   = allPaymentEvents.filter(e => e.days >= 0 && e.days <= 7);
  const comingLater = allPaymentEvents.filter(e => e.days > 7 && e.days <= 30);

  const sevenDays = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  // ── Calendar events (sliding ±2-month window) ──────────────────────────
  const eventsWindowStart = startOfMonth(addMonths(currentViewDate, -2));
  const eventsWindowEnd   = endOfMonth(addMonths(currentViewDate, 2));

  const calendarEvents = {};
  const addCalEvent = (date, event) => {
    const key = format(date, 'yyyy-MM-dd');
    if (!calendarEvents[key]) calendarEvents[key] = [];
    calendarEvents[key].push(event);
  };

  activeLoans.forEach(loan => {
    const isLender = loan.lender_id === user.id;
    const otherUserId = isLender ? loan.borrower_id : loan.lender_id;
    const otherProfile = getProfile(otherUserId);
    const freq = loan.payment_frequency || 'monthly';
    const nextPay = toLocalDate(loan.next_payment_date);
    const amount = loan.payment_amount || 0;
    const firstName = (otherProfile?.full_name || otherProfile?.username || 'User').split(' ')[0];
    const eventData = { amount, isLender, firstName, purpose: loan.purpose || '', loanId: loan.id };

    if (freq === 'weekly' || freq === 'bi-weekly') {
      const step = freq === 'weekly' ? 7 : 14;
      let d = new Date(nextPay);
      while (d > eventsWindowStart) d = addDays(d, -step);
      while (d <= eventsWindowEnd) {
        if (d >= eventsWindowStart) addCalEvent(new Date(d), eventData);
        d = addDays(d, step);
      }
    } else {
      const dayOfMonth = nextPay.getDate();
      let m = new Date(eventsWindowStart);
      while (m <= eventsWindowEnd) {
        const projDate = new Date(m.getFullYear(), m.getMonth(), dayOfMonth);
        if (projDate >= eventsWindowStart && projDate <= eventsWindowEnd) addCalEvent(projDate, eventData);
        m = addMonths(m, 1);
      }
    }
  });

  safePayments.forEach(payment => {
    if (payment.status !== 'completed') return;
    const pDate = new Date(payment.payment_date || payment.created_at);
    if (pDate < eventsWindowStart || pDate > eventsWindowEnd) return;
    const loan = myLoans.find(l => l.id === payment.loan_id);
    if (!loan) return;
    const isLender = loan.lender_id === user.id;
    const otherProfile = getProfile(isLender ? loan.borrower_id : loan.lender_id);
    const firstName = (otherProfile?.full_name || otherProfile?.username || 'User').split(' ')[0];
    addCalEvent(pDate, { amount: payment.amount || 0, isLender, firstName, purpose: loan.purpose || '', isCompleted: true });
  });

  // ── Month grid ──────────────────────────────────────────────────────────
  const calMonthStart = startOfMonth(currentViewDate);
  const calMonthEnd   = endOfMonth(currentViewDate);
  const calGridStart  = startOfWeek(calMonthStart, WK);
  const calGridEnd    = endOfWeek(calMonthEnd, WK);
  const monthDays = [];
  let cd = calGridStart;
  while (cd <= calGridEnd) { monthDays.push(new Date(cd)); cd = addDays(cd, 1); }

  // ── Week grid ───────────────────────────────────────────────────────────
  const weekViewStart = startOfWeek(currentViewDate, WK);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekViewStart, i));

  // ── Navigation helpers ──────────────────────────────────────────────────
  const goBack    = () => setCurrentViewDate(d => calView === 'month' ? addMonths(d, -1) : addWeeks(d, -1));
  const goForward = () => setCurrentViewDate(d => calView === 'month' ? addMonths(d, 1)  : addWeeks(d, 1));
  const goToday   = () => { setCurrentViewDate(todayInTZ()); setSelectedDay(todayInTZ()); };

  // ── Shared styles ───────────────────────────────────────────────────────
  const fontBase = { fontFamily: "'DM Sans', system-ui, sans-serif" };

  // ── Flip-board tile primitives ─────────────────────────────────────────
  const FTile = ({ ch, dim }) => (
    <div style={{
      width: 16, height: 21, flexShrink: 0,
      background: dim
        ? 'linear-gradient(180deg,#272624 0%,#272624 49%,#1A1918 51%,#1A1918 100%)'
        : 'linear-gradient(180deg,#2F2D2B 0%,#2F2D2B 49%,#1F1E1C 51%,#1F1E1C 100%)',
      borderRadius: 3,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
      boxShadow: '0 1px 3px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)',
    }}>
      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(0,0,0,0.75)' }} />
      <span style={{
        fontSize: 10, fontWeight: 700, lineHeight: 1,
        color: dim ? '#5A5856' : '#ECE9E2',
        fontFamily: "'DM Sans', system-ui",
        position: 'relative', zIndex: 1, letterSpacing: 0,
      }}>{ch}</span>
    </div>
  );

  const FlipLine = ({ text, dim = false }) => (
    <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', rowGap: 2 }}>
      {String(text).toUpperCase().split('').map((ch, i) =>
        ch === ' '
          ? <div key={i} style={{ width: 7, flexShrink: 0 }} />
          : <FTile key={i} ch={ch} dim={dim} />
      )}
    </div>
  );

  // ── Left panel: Flip board ──────────────────────────────────────────────
  const ListPanel = () => {
    // Build rows: overdue → next 7 → coming later
    const rows = [
      ...overdue.map(ev => ({
        date: 'OVERDUE',
        text: ev.isLender
          ? `EXPECT ${formatMoney(ev.amount)} ${ev.firstName}`
          : `PAY ${formatMoney(ev.amount)} ${ev.firstName}`,
        dim: false, isOverdue: true,
        onClick: () => setResolveModal({ loan: ev.loan, loans: overdue.map(e => e.loan) }),
      })),
      ...next7Days.map(ev => ({
        date: ev.days === 0 ? 'TODAY' : format(ev.date, 'EEE MMM d').toUpperCase(),
        text: ev.isLender
          ? `EXPECT ${formatMoney(ev.amount)} ${ev.firstName}`
          : `PAY ${formatMoney(ev.amount)} ${ev.firstName}`,
        dim: false, isOverdue: false,
      })),
      ...comingLater.map(ev => ({
        date: format(ev.date, 'EEE MMM d').toUpperCase(),
        text: ev.isLender
          ? `EXPECT ${formatMoney(ev.amount)} ${ev.firstName}`
          : `PAY ${formatMoney(ev.amount)} ${ev.firstName}`,
        dim: true, isOverdue: false,
      })),
    ];

    return (
    <div style={{ ...fontBase, display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* ── Flip board ── */}
      <div style={{
        background: '#181715',
        borderRadius: 14,
        padding: '22px 18px',
        display: 'flex', flexDirection: 'column', gap: 0,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}>
        {rows.length === 0 ? (
          <FlipLine text="ALL CLEAR" dim />
        ) : (
          rows.map((row, i) => (
            <div
              key={i}
              onClick={row.onClick}
              style={{
                cursor: row.onClick ? 'pointer' : 'default',
                padding: '13px 0',
                borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                borderLeft: row.isOverdue ? '2px solid #7A3530' : '2px solid transparent',
                paddingLeft: row.isOverdue ? 10 : 0,
              }}
            >
              {/* Date / status line — smaller, dimmer */}
              <div style={{ marginBottom: 5 }}>
                <FlipLine text={row.date} dim />
              </div>
              {/* Main event line */}
              <FlipLine text={row.text} dim={row.dim} />
            </div>
          ))
        )}
      </div>

    </div>
    );
  };

  // ── Calendar panel ──────────────────────────────────────────────────────
  const CalPanel = () => {
    const selectedKey = format(selectedDay, 'yyyy-MM-dd');
    const selectedEvents = calendarEvents[selectedKey] || [];

    return (
      <div style={{ ...fontBase }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>

          {/* Left: nav arrows + title + Today */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={goBack} style={{ width: 26, height: 26, borderRadius: '50%', border: '1.5px solid rgba(0,0,0,0.09)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#787776" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.02em', minWidth: 120 }}>
              {calView === 'month'
                ? format(currentViewDate, 'MMMM yyyy')
                : `${format(weekViewStart, 'MMM d')} – ${format(addDays(weekViewStart, 6), 'MMM d, yyyy')}`}
            </span>
            <button onClick={goForward} style={{ width: 26, height: 26, borderRadius: '50%', border: '1.5px solid rgba(0,0,0,0.09)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#787776" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
            <button onClick={goToday} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, border: '1.5px solid rgba(0,0,0,0.1)', background: 'transparent', cursor: 'pointer', color: '#787776', fontFamily: "'DM Sans', sans-serif", marginLeft: 2 }}>Today</button>
          </div>

          {/* Right: Month / Week toggle */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.05)', borderRadius: 8, padding: 2, gap: 1 }}>
            {['month', 'week'].map(v => (
              <button
                key={v}
                onClick={() => setCalView(v)}
                style={{
                  padding: '4px 13px', borderRadius: 6, border: 'none',
                  background: calView === v ? 'white' : 'transparent',
                  color: calView === v ? '#1A1918' : '#9B9A98',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  boxShadow: calView === v ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* ── MONTH VIEW ── */}
        {calView === 'month' && (
          <div>
            {/* Day-of-week headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 0 }}>
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#9B9A98', letterSpacing: '0.04em', paddingBottom: 6, textTransform: 'uppercase' }}>{d}</div>
              ))}
            </div>

            {/* macOS-style calendar grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, overflow: 'hidden' }}>
              {monthDays.map((day, i) => {
                const inMonth    = isSameMonth(day, currentViewDate);
                const isToday    = isSameDay(day, today);
                const isSelected = isSameDay(day, selectedDay);
                const key        = format(day, 'yyyy-MM-dd');
                const dayEvs     = calendarEvents[key] || [];
                const shown      = dayEvs.slice(0, 3);
                const moreCount  = dayEvs.length - shown.length;
                const isLastRow  = i >= monthDays.length - 7;
                const isLastCol  = (i + 1) % 7 === 0;

                return (
                  <div
                    key={i}
                    className="cal-cell"
                    onClick={() => setSelectedDay(day)}
                    style={{
                      minHeight: 76,
                      borderRight:  !isLastCol  ? '1px solid rgba(0,0,0,0.07)' : 'none',
                      borderBottom: !isLastRow  ? '1px solid rgba(0,0,0,0.07)' : 'none',
                      padding: '4px 3px 4px',
                      background: isSelected && !isToday
                        ? 'rgba(3,172,234,0.05)'
                        : inMonth ? 'white' : '#F9F8F6',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      boxSizing: 'border-box',
                    }}
                  >
                    {/* Day number — centred, circle for today */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 2 }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: '50%',
                        fontSize: 11, fontWeight: isToday ? 700 : 400,
                        color: isToday ? 'white' : inMonth ? '#1A1918' : '#C7C6C4',
                        background: isToday ? '#03ACEA' : 'transparent',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {format(day, 'd')}
                      </span>
                    </div>

                    {/* Event pills */}
                    {shown.map((ev, ei) => {
                      const bg    = ev.isCompleted ? '#dcfce7' : ev.isLender ? '#e0f2fe' : '#dbeafe';
                      const fg    = ev.isCompleted ? '#15803d' : ev.isLender ? '#0369a1' : '#1e40af';
                      return (
                        <div
                          key={ei}
                          className="cal-cell-pill"
                          style={{
                            background: bg,
                            borderRadius: 3,
                            padding: '1px 4px',
                            fontSize: 9,
                            fontWeight: 600,
                            color: fg,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            lineHeight: 1.5,
                            fontFamily: "'DM Sans', sans-serif",
                          }}
                        >
                          {formatMoney(ev.amount)} {ev.firstName}
                        </div>
                      );
                    })}
                    {moreCount > 0 && (
                      <div style={{ fontSize: 9, color: '#9B9A98', paddingLeft: 3, fontFamily: "'DM Sans', sans-serif" }}>
                        +{moreCount} more
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selected day detail */}
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(0,0,0,0.07)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#787776', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 10 }}>
                {format(selectedDay, 'EEEE, MMMM d')}
              </div>
              {selectedEvents.length === 0 ? (
                <div style={{ fontSize: 12, color: '#9B9A98' }}>Nothing due</div>
              ) : (
                selectedEvents.map((ev, idx) => {
                  const barColor = ev.isCompleted ? '#22c55e' : ev.isLender ? '#03ACEA' : '#1D5B94';
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: idx < selectedEvents.length - 1 ? 8 : 0 }}>
                      <div style={{ width: 3, borderRadius: 2, background: barColor, flexShrink: 0, alignSelf: 'stretch', minHeight: 18 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1918' }}>
                          {ev.isLender
                            ? `Expect ${formatMoney(ev.amount)} from ${ev.firstName}`
                            : `${formatMoney(ev.amount)} due to ${ev.firstName}`}
                          {ev.isCompleted && <span style={{ color: '#22c55e', marginLeft: 6, fontSize: 11 }}>✓ Paid</span>}
                        </div>
                        {ev.purpose && (
                          <div style={{ fontSize: 11, color: '#9B9A98', marginTop: 1 }}>{ev.purpose}</div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ── WEEK VIEW ── */}
        {calView === 'week' && (
          <div>
            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 0 }}>
              {weekDays.map((day, i) => {
                const isToday    = isSameDay(day, today);
                const isSelected = isSameDay(day, selectedDay);
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDay(day)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      padding: '8px 4px 10px', borderRadius: 10, border: 'none',
                      background: isSelected && !isToday ? 'rgba(0,0,0,0.04)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: 10, fontWeight: 500, color: isToday ? '#03ACEA' : '#9B9A98' }}>
                      {format(day, 'EEE')}
                    </span>
                    <span style={{
                      width: 30, height: 30, borderRadius: '50%', fontSize: 13,
                      fontWeight: isToday ? 700 : 500,
                      color: isToday ? 'white' : '#1A1918',
                      background: isToday ? '#03ACEA' : 'transparent',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {format(day, 'd')}
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', marginBottom: 10 }} />

            {/* Event columns */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0, alignItems: 'start', minHeight: 80 }}>
              {weekDays.map((day, i) => {
                const key = format(day, 'yyyy-MM-dd');
                const dayEvs = calendarEvents[key] || [];
                return (
                  <div
                    key={i}
                    onClick={() => setSelectedDay(day)}
                    style={{
                      borderLeft: i > 0 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                      padding: i > 0 ? '0 0 0 4px' : '0 4px 0 0',
                      minHeight: 60, cursor: 'pointer',
                    }}
                  >
                    {dayEvs.map((ev, ei) => {
                      const bg    = ev.isCompleted ? 'rgba(34,197,94,0.12)' : ev.isLender ? 'rgba(3,172,234,0.12)' : 'rgba(29,91,148,0.12)';
                      const color = ev.isCompleted ? '#16a34a' : ev.isLender ? '#0284c7' : '#1D5B94';
                      return (
                        <div key={ei} style={{ background: bg, borderLeft: `2.5px solid ${color}`, borderRadius: '0 5px 5px 0', padding: '3px 5px', marginBottom: 3 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color, lineHeight: 1.2 }}>{formatMoney(ev.amount)}</div>
                          <div style={{ fontSize: 9, color: '#1A1918', lineHeight: 1.3, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.firstName}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Selected day detail */}
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(0,0,0,0.07)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#787776', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 10 }}>
                {format(selectedDay, 'EEEE, MMMM d')}
              </div>
              {selectedEvents.length === 0 ? (
                <div style={{ fontSize: 12, color: '#9B9A98' }}>Nothing due</div>
              ) : (
                selectedEvents.map((ev, idx) => {
                  const barColor = ev.isCompleted ? '#22c55e' : ev.isLender ? '#03ACEA' : '#1D5B94';
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: idx < selectedEvents.length - 1 ? 8 : 0 }}>
                      <div style={{ width: 3, borderRadius: 2, background: barColor, flexShrink: 0, alignSelf: 'stretch', minHeight: 18 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1918' }}>
                          {ev.isLender
                            ? `Expect ${formatMoney(ev.amount)} from ${ev.firstName}`
                            : `${formatMoney(ev.amount)} due to ${ev.firstName}`}
                          {ev.isCompleted && <span style={{ color: '#22c55e', marginLeft: 6, fontSize: 11 }}>✓ Paid</span>}
                        </div>
                        {ev.purpose && <div style={{ fontSize: 11, color: '#9B9A98', marginTop: 1 }}>{ev.purpose}</div>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Legend */}
        <div style={{ display: 'flex', gap: 14, marginTop: 18, flexWrap: 'wrap' }}>
          {[
            { color: '#03ACEA', label: 'Incoming' },
            { color: '#1D5B94', label: 'Outgoing' },
            { color: '#22c55e', label: 'Completed' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />
              <span style={{ fontSize: 10, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14, lineHeight: 1.5, color: '#1A1918', WebkitFontSmoothing: 'antialiased' }}>
      <MeshMobileNav user={user} activePage="Upcoming" />

      <style>{`
        @media (max-width: 900px) {
          .upcoming-panels  { flex-direction: column !important; }
          .up-list-panel    { order: 1; padding: 24px 20px 8px !important; width: 100% !important; }
          .up-cal-panel     { order: 2; padding: 0 20px 40px !important; }
          .up-divider       { display: none !important; }
          .desktop-page-title { display: none !important; }
          .up-restore-btn   { display: none !important; }
          .cal-cell         { min-height: 52px !important; }
          .cal-cell-pill    { font-size: 8px !important; }
        }
        @media (min-width: 901px) {
          .mobile-page-title { display: none !important; }
        }
        .up-divider:hover { background: rgba(0,0,0,0.14) !important; }
        .up-divider:hover .up-divider-dots div { background: rgba(0,0,0,0.35) !important; }
      `}</style>

      <div className="mesh-layout" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 0, minHeight: '100vh' }}>
        <DesktopSidebar />

        <div className="mesh-center" style={{ background: 'transparent', display: 'flex', flexDirection: 'column' }}>

          {/* Desktop title */}
          <div className="desktop-page-title" style={{ padding: '24px 56px 20px' }}>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: '#1A1918', fontFamily: "'DM Sans', sans-serif" }}>Upcoming</div>
          </div>

          {/* Mobile title */}
          <div className="mobile-page-title" style={{ padding: '16px 20px 4px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.02em', fontFamily: "'DM Sans', sans-serif" }}>Upcoming</div>
          </div>

          {/* Two-panel flex row */}
          <div
            ref={containerRef}
            className="upcoming-panels"
            style={{ display: 'flex', flexDirection: 'row', flex: 1, alignItems: 'stretch' }}
          >

            {/* LEFT: list panel */}
            {!isCalFull && (
              <div
                className="up-list-panel"
                style={{
                  width: `${splitPct}%`,
                  flexShrink: 0,
                  padding: '0 20px 60px 56px',
                  overflowY: 'auto',
                  boxSizing: 'border-box',
                }}
              >
                <ListPanel />
              </div>
            )}

            {/* DIVIDER (desktop only) */}
            {!isCalFull ? (
              <div
                className="up-divider"
                onMouseDown={(e) => { isDragging.current = true; e.preventDefault(); }}
                style={{
                  width: 5, flexShrink: 0,
                  background: 'rgba(0,0,0,0.06)',
                  cursor: 'col-resize',
                  transition: 'background 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <div className="up-divider-dots" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(0,0,0,0.2)', transition: 'background 0.15s' }} />
                  ))}
                </div>
              </div>
            ) : (
              /* Restore button when cal is snapped full */
              <button
                className="up-restore-btn"
                onClick={() => setIsCalFull(false)}
                style={{
                  position: 'absolute', left: 208, top: '50%', transform: 'translateY(-50%)',
                  background: 'white', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8,
                  padding: '8px 6px', cursor: 'pointer', zIndex: 10,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#787776" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}

            {/* RIGHT: calendar panel */}
            <div
              ref={calPanelRef}
              className="up-cal-panel"
              style={{
                flex: 1,
                padding: isCalFull ? '0 56px 60px' : '0 56px 60px 28px',
                overflowY: 'hidden',
                boxSizing: 'border-box',
                minWidth: 0,
                userSelect: 'none',
              }}
            >
              <CalPanel />
            </div>

          </div>{/* end panels */}
        </div>
      </div>

      {/* Footer */}
      <div className="dashboard-footer" style={{ maxWidth: 1200, margin: '0 auto', padding: '12px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <span style={{ fontSize: 11, color: '#787776' }}>2026 Vony, Inc. All rights reserved.</span>
        <div className="dashboard-footer-links" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <a href="https://www.vony-lending.com/terms" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#787776', textDecoration: 'none' }}>Terms of Service</a>
          <a href="https://www.vony-lending.com/privacy" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#787776', textDecoration: 'none' }}>Privacy Center</a>
          <a href="https://www.vony-lending.com/do-not-sell" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#787776', textDecoration: 'none' }}>Do not sell or share my personal information</a>
        </div>
      </div>

      {/* Record Payment modal */}
      {resolveModal && (
        <RecordPaymentModal
          loan={resolveModal.loan}
          candidateLoans={resolveModal.loans}
          currentUserId={user?.id}
          isLender={resolveModal.loan?.borrower_id === user?.id}
          onClose={() => setResolveModal(null)}
          onPaymentComplete={() => { setResolveModal(null); loadData(); }}
        />
      )}
    </div>
  );
}

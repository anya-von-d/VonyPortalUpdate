import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loan, Payment, PublicProfile } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";
import {
  format, startOfMonth, endOfMonth, addMonths, addDays,
  startOfWeek, endOfWeek, isSameMonth, isSameDay,
} from "date-fns";
import { formatMoney } from "@/components/utils/formatMoney";
import { daysUntil as daysUntilDate } from "@/components/utils/dateUtils";

export default function Upcoming() {
  const { user: authUser, userProfile, isLoadingAuth, navigateToLogin, logout } = useAuth();
  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [publicProfiles, setPublicProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const activeLoansRef = useRef(null);
  const [activeAnimKey, setActiveAnimKey] = useState(0);
  const activeWasOut = useRef(true);

  const user = userProfile ? { ...userProfile, id: authUser?.id, email: authUser?.email } : null;

  useEffect(() => {
    const el = activeLoansRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && activeWasOut.current) {
        activeWasOut.current = false;
        setActiveAnimKey(k => k + 1);
      } else if (!e.isIntersecting) {
        activeWasOut.current = true;
      }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const safeEntityCall = async (entityCall, fallback = []) => {
    try {
      const result = await entityCall();
      return Array.isArray(result) ? result : (result ? [result] : fallback);
    } catch (error) {
      return fallback;
    }
  };

  const loadData = async () => {
    if (!authUser) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const [allLoans, allPayments, allProfiles] = await Promise.all([
        safeEntityCall(() => Loan.list('-created_at')),
        safeEntityCall(() => Payment.list('-created_at', 50)),
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

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '2px solid #54A6CF', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px' }} className="animate-spin" />
          <p style={{ fontSize: 14, color: '#787776', fontFamily: "'DM Sans', sans-serif" }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: 'white', borderRadius: 16, padding: 32, textAlign: 'center', maxWidth: 400, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1A1918', marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>Sign in to view upcoming</h1>
          <button onClick={navigateToLogin} style={{ width: '100%', padding: '12px 24px', fontSize: 15, fontWeight: 600, background: '#54A6CF', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Sign In</button>
        </div>
      </div>
    );
  }

  // ── Data ──
  const today = new Date();
  const safeLoans = Array.isArray(loans) ? loans : [];
  const safeProfiles = Array.isArray(publicProfiles) ? publicProfiles : [];
  const safePayments = Array.isArray(payments) ? payments : [];

  const myLoans = safeLoans.filter(l => l && (l.lender_id === user.id || l.borrower_id === user.id));
  const activeLoans = myLoans.filter(l => l && l.status === 'active' && l.next_payment_date);
  const lentLoans = myLoans.filter(l => l && l.lender_id === user.id && l.status === 'active');
  const borrowedLoans = myLoans.filter(l => l && l.borrower_id === user.id && l.status === 'active');

  const getProfile = (userId) => safeProfiles.find(p => p.user_id === userId);

  // Upcoming payment events
  const allPaymentEvents = activeLoans.map(loan => {
    const isLender = loan.lender_id === user.id;
    const otherUserId = isLender ? loan.borrower_id : loan.lender_id;
    const otherProfile = getProfile(otherUserId);
    const days = daysUntilDate(loan.next_payment_date);
    const nextPayDate = new Date(loan.next_payment_date);
    const loanPayments = safePayments.filter(p => p && p.loan_id === loan.id);
    let periodStart = new Date(nextPayDate);
    const freq = loan.payment_frequency || 'monthly';
    if (freq === 'weekly') periodStart.setDate(periodStart.getDate() - 7);
    else if (freq === 'bi-weekly') periodStart.setDate(periodStart.getDate() - 14);
    else periodStart.setMonth(periodStart.getMonth() - 1);
    const paidThisPeriod = loanPayments
      .filter(p => { const pDate = new Date(p.payment_date || p.created_at); return pDate >= periodStart && pDate <= today && p.status === 'completed'; })
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const originalAmount = loan.payment_amount || 0;
    const remainingAmount = Math.max(0, originalAmount - paidThisPeriod);
    return {
      loan, date: nextPayDate, days, amount: remainingAmount, originalAmount, isLender, frequency: freq,
      username: otherProfile?.username || 'user',
      fullName: otherProfile?.full_name || 'Unknown',
      firstName: (otherProfile?.full_name || otherProfile?.username || 'User').split(' ')[0],
      initial: (otherProfile?.full_name || 'U').charAt(0).toUpperCase(),
      purpose: loan.purpose || '',
      loanId: loan.id,
    };
  }).filter(e => e.amount > 0).sort((a, b) => a.date - b.date);

  const overdue = allPaymentEvents.filter(e => e.days < 0);
  const next7Days = allPaymentEvents.filter(e => e.days >= 0 && e.days <= 7);
  const comingLater = allPaymentEvents.filter(e => e.days > 7 && e.days <= 30);

  // Monthly stats for right panel
  const currentMonth = startOfMonth(today);
  const currentMonthEnd = endOfMonth(today);
  const monthlyReceived = safePayments.filter(p => {
    if (!p || p.status !== 'completed') return false;
    const loan = myLoans.find(l => l.id === p.loan_id);
    if (!loan || loan.lender_id !== user.id) return false;
    const pDate = new Date(p.payment_date || p.created_at);
    return pDate >= currentMonth && pDate <= currentMonthEnd;
  }).reduce((s, p) => s + (p.amount || 0), 0);

  const monthlyPaidOut = safePayments.filter(p => {
    if (!p || p.status !== 'completed') return false;
    const loan = myLoans.find(l => l.id === p.loan_id);
    if (!loan || loan.borrower_id !== user.id) return false;
    const pDate = new Date(p.payment_date || p.created_at);
    return pDate >= currentMonth && pDate <= currentMonthEnd;
  }).reduce((s, p) => s + (p.amount || 0), 0);

  const monthlyExpectedReceive = lentLoans.reduce((s, l) => s + (l.payment_amount || 0), 0);
  const monthlyExpectedPay = borrowedLoans.reduce((s, l) => s + (l.payment_amount || 0), 0);

  // Calendar data
  const calMonthStart = startOfMonth(calendarMonth);
  const calMonthEnd = endOfMonth(calendarMonth);
  const calWeekStart = startOfWeek(calMonthStart);
  const calWeekEnd = endOfWeek(calMonthEnd);
  const calendarDays = [];
  let cd = calWeekStart;
  while (cd <= calWeekEnd) { calendarDays.push(new Date(cd)); cd = addDays(cd, 1); }

  const calendarEvents = {};
  activeLoans.forEach(loan => {
    const isLender = loan.lender_id === user.id;
    const otherUserId = isLender ? loan.borrower_id : loan.lender_id;
    const otherProfile = getProfile(otherUserId);
    const freq = loan.payment_frequency || 'monthly';
    const nextPay = new Date(loan.next_payment_date);
    const amount = loan.payment_amount || 0;
    const projected = [];
    if (freq === 'weekly' || freq === 'bi-weekly') {
      const step = freq === 'weekly' ? 7 : 14;
      let d = new Date(nextPay);
      while (d > calMonthStart) d = addDays(d, -step);
      while (d <= calMonthEnd) {
        if (d >= calMonthStart) projected.push(new Date(d));
        d = addDays(d, step);
      }
    } else {
      const dayOfMonth = nextPay.getDate();
      const projDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), dayOfMonth);
      if (projDate >= calMonthStart && projDate <= calMonthEnd) projected.push(projDate);
    }
    projected.forEach(date => {
      const key = format(date, 'yyyy-MM-dd');
      if (!calendarEvents[key]) calendarEvents[key] = [];
      calendarEvents[key].push({ amount, isLender, initial: (otherProfile?.full_name || 'U').charAt(0).toUpperCase(), purpose: loan.purpose || '' });
    });
  });

  // ── PaymentRow component ──
  const PaymentRow = ({ event }) => {
    const isOverdueItem = event.days < 0;
    const daysLabel = isOverdueItem ? `${Math.abs(event.days)}d late` : event.days === 0 ? 'today' : `${event.days}d`;
    const badgeColor = isOverdueItem ? '#E8726E' : event.days <= 3 ? '#F59E0B' : '#9B9A98';
    const badgeBg = isOverdueItem ? 'rgba(232,114,110,0.08)' : event.days <= 3 ? 'rgba(245,158,11,0.08)' : 'rgba(0,0,0,0.04)';
    const amtColor = event.isLender ? '#03ACEA' : '#1A1918';
    const amtSign = event.isLender ? '+' : '-';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: 'none' }}>
        <div style={{ minWidth: 50, flexShrink: 0, fontSize: 10, fontWeight: 700, color: badgeColor, background: badgeBg, borderRadius: 6, padding: '3px 7px', textAlign: 'center' }}>{daysLabel}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {event.isLender ? <><strong>{event.firstName}</strong> pays you</> : <>Pay <strong>{event.firstName}</strong></>}
            {event.purpose && <span style={{ color: '#9B9A98', fontWeight: 400 }}> · {event.purpose}</span>}
          </div>
          <div style={{ fontSize: 11, color: '#9B9A98', marginTop: 1 }}>{format(event.date, 'MMM d')}</div>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0, color: amtColor, letterSpacing: '-0.01em' }}>{amtSign}{formatMoney(event.amount)}</span>
      </div>
    );
  };

  // ── Section heading ──
  const SectionHead = ({ label, count, total }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, marginBottom: 4, borderBottom: '1px solid rgba(0,0,0,0.07)', marginTop: 28 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
      {count > 0 && <span style={{ fontSize: 11, color: '#9B9A98' }}>{count} · {formatMoney(total)}</span>}
    </div>
  );

  // ── Right panel section heading ──
  const RightSection = ({ title, children }) => (
    <div style={{ marginBottom: 40 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 9 }}>{title}</div>
      <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', marginBottom: 14 }} />
      {children}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14, lineHeight: 1.5, color: '#1A1918', WebkitFontSmoothing: 'antialiased' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 300px', gap: 0, minHeight: '100vh' }}>

        {/* ── LEFT: Sidebar nav ── */}
        <div className="mesh-left" style={{ background: '#fafafa', borderRight: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ position: 'sticky', top: 0, padding: '24px 8px 0' }}>
            <Link to="/" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontStyle: 'italic', fontSize: '1.3rem', color: '#1A1918', textDecoration: 'none', display: 'block', marginBottom: 16, paddingLeft: 6, lineHeight: 1, letterSpacing: '-0.02em' }}>Vony</Link>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { label: 'Home', to: '/', active: false },
                { label: 'Upcoming', to: createPageUrl("Upcoming"), active: true },
                { label: 'Create Loan', to: createPageUrl("CreateOffer"), active: false },
                { label: 'Record Payment', to: createPageUrl("RecordPayment"), active: false },
                { label: 'My Loans', to: createPageUrl("YourLoans"), active: false },
                { label: 'Friends', to: createPageUrl("Friends"), active: false },
                { label: 'Recent Activity', to: createPageUrl("RecentActivity"), active: false },
                { label: 'Documents', to: createPageUrl("LoanAgreements"), active: false },
              ].map(({ label, to, active: isActive }) => (
                <Link key={label} to={to} style={{
                  display: 'block', padding: '6px 12px', borderRadius: 9, textDecoration: 'none',
                  fontSize: 13, fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#1A1918' : '#787776',
                  background: isActive ? 'rgba(0,0,0,0.05)' : 'transparent',
                  fontFamily: "'DM Sans', sans-serif", width: '100%', boxSizing: 'border-box',
                }}>{label}</Link>
              ))}
              {/* Coming Soon section */}
              <div style={{ marginTop: 16, marginBottom: 4, paddingLeft: 12 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Coming Soon</span>
              </div>
              {[
                { label: 'Learn', to: createPageUrl("ComingSoon") },
                { label: 'Loan Help', to: createPageUrl("LoanHelp") },
              ].map(({ label, to }) => (
                <Link key={label} to={to} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 12px', borderRadius: 9, textDecoration: 'none',
                  fontSize: 13, fontWeight: 500, color: '#787776',
                  background: 'transparent', fontFamily: "'DM Sans', sans-serif",
                  width: '100%', boxSizing: 'border-box',
                }}>
                  {label}
                  <span style={{ fontSize: 8, fontWeight: 700, color: '#9B9A98', background: 'rgba(0,0,0,0.05)', borderRadius: 4, padding: '2px 6px', letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1.2 }}>SOON</span>
                </Link>
              ))}
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

        {/* ── CENTER ── */}
        <div className="mesh-center" style={{ background: 'white', borderRight: '1px solid rgba(0,0,0,0.06)', padding: '28px 48px 80px' }}>

          {/* Title */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1, color: '#1A1918' }}>Upcoming</div>
          </div>
          <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', marginBottom: 20 }} />

          {/* Glass tab selector */}
          <div style={{ display: 'inline-flex', gap: 2, background: 'rgba(255,255,255,0.6)', borderRadius: 12, padding: 3, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', marginBottom: 8, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
            {[{ key: 'summary', label: 'Summary' }, { key: 'calendar', label: 'Calendar' }].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                padding: '7px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                fontWeight: activeTab === tab.key ? 600 : 500,
                color: activeTab === tab.key ? '#1A1918' : '#787776',
                background: activeTab === tab.key ? 'white' : 'transparent',
                boxShadow: activeTab === tab.key ? '0 1px 6px rgba(0,0,0,0.10)' : 'none',
                transition: 'all 0.15s',
              }}>{tab.label}</button>
            ))}
          </div>

          {activeTab === 'summary' ? (
            /* ── SUMMARY VIEW ── */
            <div>
              {overdue.length > 0 ? (
                <>
                  <SectionHead label="Overdue" count={overdue.length} total={overdue.reduce((s, e) => s + e.amount, 0)} />
                  {overdue.map((event, idx) => <PaymentRow key={event.loanId + '-ov'} event={event} isLast={idx === overdue.length - 1} />)}
                </>
              ) : null}

              <SectionHead label="Next 7 Days" count={next7Days.length} total={next7Days.reduce((s, e) => s + e.amount, 0)} />
              {next7Days.length === 0 ? (
                <div style={{ padding: '12px 0', fontSize: 13, color: '#9B9A98' }}>No payments in the next 7 days.</div>
              ) : next7Days.map((event, idx) => <PaymentRow key={event.loanId + '-7'} event={event} isLast={idx === next7Days.length - 1} />)}

              <SectionHead label="Coming Later" count={comingLater.length} total={comingLater.reduce((s, e) => s + e.amount, 0)} />
              {comingLater.length === 0 ? (
                <div style={{ padding: '12px 0', fontSize: 13, color: '#9B9A98' }}>Nothing coming up after 7 days.</div>
              ) : comingLater.map((event, idx) => <PaymentRow key={event.loanId + '-later'} event={event} isLast={idx === comingLater.length - 1} />)}
            </div>
          ) : (
            /* ── CALENDAR VIEW ── */
            <div style={{ marginTop: 16 }}>
              {/* Month nav */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <button onClick={() => setCalendarMonth(addMonths(calendarMonth, -1))} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(0,0,0,0.09)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#787776" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.01em' }}>{format(calendarMonth, 'MMMM yyyy')}</span>
                <button onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(0,0,0,0.09)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#787776" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
              </div>

              {/* Day headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid rgba(0,0,0,0.07)', marginBottom: 4 }}>
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#787776', padding: '8px 0' }}>{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
                {calendarDays.map((day, i) => {
                  const inMonth = isSameMonth(day, calendarMonth);
                  const isToday = isSameDay(day, new Date());
                  const key = format(day, 'yyyy-MM-dd');
                  const dayEvents = calendarEvents[key] || [];
                  const hasIncoming = dayEvents.some(e => e.isLender);
                  const hasOutgoing = dayEvents.some(e => !e.isLender);
                  return (
                    <div key={i} style={{
                      minHeight: 84, padding: '7px 8px', borderRadius: 9,
                      background: inMonth ? (hasIncoming ? 'rgba(3,172,234,0.06)' : hasOutgoing ? 'rgba(29,91,148,0.07)' : 'transparent') : 'transparent',
                      opacity: inMonth ? 1 : 0.3,
                      border: isToday ? '1.5px solid #03ACEA' : '1px solid transparent',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: isToday ? 22 : 'auto', height: isToday ? 22 : 'auto',
                          borderRadius: '50%', fontSize: 12, fontWeight: isToday ? 700 : 500,
                          color: isToday ? 'white' : inMonth ? '#1A1918' : '#C7C6C4',
                          background: isToday ? '#03ACEA' : 'transparent',
                        }}>{format(day, 'd')}</span>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                          {hasIncoming && <span style={{ fontSize: 10, fontWeight: 600, color: '#03ACEA' }}>+{formatMoney(dayEvents.filter(e => e.isLender).reduce((s, e) => s + e.amount, 0))}</span>}
                          {hasOutgoing && <span style={{ fontSize: 10, fontWeight: 600, color: '#1D5B94' }}>{formatMoney(dayEvents.filter(e => !e.isLender).reduce((s, e) => s + e.amount, 0))}</span>}
                        </div>
                      </div>
                      {dayEvents.length > 0 && (
                        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                          {dayEvents.slice(0, 3).map((ev, j) => (
                            <div key={j} style={{ width: 20, height: 20, borderRadius: '50%', fontSize: 9, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: ev.isLender ? '#03ACEA' : '#1D5B94', color: 'white' }}>{ev.initial}</div>
                          ))}
                          {dayEvents.length > 3 && <div style={{ width: 20, height: 20, borderRadius: '50%', fontSize: 9, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.06)', color: '#787776' }}>+{dayEvents.length - 3}</div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', gap: 20, marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#787776' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#03ACEA' }} /> Owed to you</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#787776' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D5B94' }} /> You owe</div>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="mesh-right" style={{ background: '#fafafa' }}>
          <div style={{ position: 'sticky', top: 0, padding: '28px 28px 0' }}>

            {/* Bell + Profile icons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginBottom: 28 }}>
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

          <RightSection title={`How ${format(today, 'MMMM')} is going`}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: '#787776' }}>Received</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#03ACEA', letterSpacing: '-0.01em' }}>{formatMoney(monthlyReceived)}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'rgba(3,172,234,0.1)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 3, background: '#03ACEA', width: `${monthlyExpectedReceive > 0 ? Math.min((monthlyReceived / monthlyExpectedReceive) * 100, 100) : 0}%`, transition: 'width 0.8s ease-out' }} />
              </div>
              <div style={{ fontSize: 11, color: '#787776', marginTop: 3 }}>of {formatMoney(monthlyExpectedReceive)} expected</div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: '#787776' }}>Paid out</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1D5B94', letterSpacing: '-0.01em' }}>{formatMoney(monthlyPaidOut)}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'rgba(29,91,148,0.1)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 3, background: '#1D5B94', width: `${monthlyExpectedPay > 0 ? Math.min((monthlyPaidOut / monthlyExpectedPay) * 100, 100) : 0}%`, transition: 'width 0.8s ease-out' }} />
              </div>
              <div style={{ fontSize: 11, color: '#787776', marginTop: 3 }}>of {formatMoney(monthlyExpectedPay)} expected</div>
            </div>
          </RightSection>

          {myLoans.filter(l => l && l.status === 'active').length > 0 && (
            <RightSection title="Active Loans">
              <div ref={activeLoansRef} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {myLoans.filter(l => l && l.status === 'active').slice(0, 5).map((loan, idx) => {
                  const isLender = loan.lender_id === user.id;
                  const otherProfile = safeProfiles.find(p => p.user_id === (isLender ? loan.borrower_id : loan.lender_id));
                  const totalAmt = loan.total_amount || loan.amount || 0;
                  const paidAmt = loan.amount_paid || 0;
                  const pct = totalAmt > 0 ? Math.round((paidAmt / totalAmt) * 100) : 0;
                  const name = otherProfile?.full_name?.split(' ')[0] || otherProfile?.username || 'User';
                  const purpose = loan.purpose ? ` for ${loan.purpose}` : '';
                  const headerText = isLender ? `You lent ${name} ${formatMoney(totalAmt)}${purpose}` : `${name} lent you ${formatMoney(totalAmt)}${purpose}`;
                  return (
                    <div key={loan.id}>
                      <div style={{ fontSize: 12, color: '#1A1918', fontWeight: 500, marginBottom: 4, lineHeight: 1.4 }}>{headerText}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: isLender ? 'rgba(3,172,234,0.1)' : 'rgba(29,91,148,0.1)', overflow: 'hidden' }}>
                          <div key={`al-${idx}-${activeAnimKey}`} style={{ height: '100%', borderRadius: 3, background: isLender ? '#03ACEA' : '#1D5B94', width: `${pct}%`, animation: `barGrowRight 0.8s ease-out ${idx * 0.08}s both` }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#9B9A98', flexShrink: 0 }}>{pct}%</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#787776', marginTop: 3 }}>{formatMoney(paidAmt)} of {formatMoney(totalAmt)} {isLender ? 'paid back' : 'repaid'}</div>
                    </div>
                  );
                })}
              </div>
            </RightSection>
          )}
          </div>
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

    </div>
  );
}

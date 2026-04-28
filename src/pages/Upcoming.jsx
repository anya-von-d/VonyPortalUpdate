import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Loan, Payment, PublicProfile } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";
import { useDemoMode } from "@/lib/DemoModeContext";
import RecordPaymentModal from "@/components/loans/RecordPaymentModal";
import {
  format, addDays,
  startOfWeek, endOfWeek, isSameMonth, isSameDay,
  startOfMonth, endOfMonth,
} from "date-fns";
import { formatMoney } from "@/components/utils/formatMoney";
import { toLocalDate, daysUntil as daysUntilDate } from "@/components/utils/dateUtils";
import { todayInTZ } from "@/components/utils/timezone";
import MeshMobileNav from "@/components/MeshMobileNav";
import DesktopSidebar from '../components/DesktopSidebar';

export default function Upcoming() {
  const navigate = useNavigate();
  const { user: authUser, userProfile, isLoadingAuth, navigateToLogin, logout } = useAuth();
  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [publicProfiles, setPublicProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [calendarMonth, setCalendarMonth] = useState(() => todayInTZ());
  const [selectedDay, setSelectedDay] = useState(() => todayInTZ());
  const [resolveModal, setResolveModal] = useState(null); // { loan, loans[] }
  const activeLoansRef = useRef(null);
  const [activeAnimKey, setActiveAnimKey] = useState(0);
  const activeWasOut = useRef(true);

  const { isDemoMode } = useDemoMode();

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

  // ── Data ──
  const today = todayInTZ();
  const safeLoans = Array.isArray(loans) ? loans : [];
  const safeProfiles = Array.isArray(publicProfiles) ? publicProfiles : [];
  const safePayments = Array.isArray(payments) ? payments : [];

  const myLoans = safeLoans.filter(l => l && (l.lender_id === user.id || l.borrower_id === user.id));
  const activeLoans = myLoans.filter(l => l && l.status === 'active' && l.next_payment_date);
  const lentLoans = myLoans.filter(l => l && l.lender_id === user.id && l.status === 'active');
  const borrowedLoans = myLoans.filter(l => l && l.borrower_id === user.id && l.status === 'active');

  const getProfile = (userId) => safeProfiles.find(p => p.user_id === userId);

  // Upcoming payment events
  // A period is "covered" when confirmed+pending_confirmation payments in that period >= payment_amount.
  // We use sequential allocation (same logic as YourLoans.analyzeLoanPayments) so payments fill
  // the earliest unpaid period first.
  const allPaymentEvents = activeLoans.map(loan => {
    const isLender = loan.lender_id === user.id;
    const otherUserId = isLender ? loan.borrower_id : loan.lender_id;
    const otherProfile = getProfile(otherUserId);
    const days = daysUntilDate(loan.next_payment_date);
    const nextPayDate = toLocalDate(loan.next_payment_date);
    const loanPayments = safePayments.filter(p => p && p.loan_id === loan.id);
    const freq = loan.payment_frequency || 'monthly';
    const originalAmount = loan.payment_amount || 0;

    // Count ONLY completed/confirmed payments for sequential allocation
    const confirmedPayments = loanPayments
      .filter(p => p.status === 'completed' || p.status === 'confirmed')
      .sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date));
    const totalConfirmed = confirmedPayments.reduce((s, p) => s + (p.amount || 0), 0);

    // How many full periods have been sequentially filled?
    const fullPeriodsPaid = originalAmount > 0 ? Math.floor(totalConfirmed / originalAmount) : 0;
    // Overpayment credit within the current (next) period
    const creditToCurrentPeriod = totalConfirmed - fullPeriodsPaid * originalAmount;

    // Also count any pending_confirmation payments dated after the last fully-paid period
    const pendingPayments = loanPayments
      .filter(p => p.status === 'pending_confirmation')
      .reduce((s, p) => s + (p.amount || 0), 0);

    const remainingAmount = Math.max(0, originalAmount - creditToCurrentPeriod - pendingPayments);

    return {
      loan, date: nextPayDate, days, amount: remainingAmount, originalAmount, isLender, frequency: freq,
      username: otherProfile?.username || 'user',
      fullName: otherProfile?.full_name || 'Unknown',
      firstName: (otherProfile?.full_name || otherProfile?.username || 'User').split(' ')[0],
      initial: (otherProfile?.full_name || 'U').charAt(0).toUpperCase(),
      reason: loan.reason || loan.purpose || '',
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
    const nextPay = toLocalDate(loan.next_payment_date);
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
      const firstName = (otherProfile?.full_name || otherProfile?.username || 'User').split(' ')[0];
      calendarEvents[key].push({ amount, isLender, initial: (otherProfile?.full_name || 'U').charAt(0).toUpperCase(), firstName, purpose: loan.purpose || '' });
    });
  });

  // Add completed payments as green dots on the calendar
  safePayments.forEach(payment => {
    if (payment.status !== 'completed') return;
    const pDate = new Date(payment.payment_date || payment.created_at);
    const key = format(pDate, 'yyyy-MM-dd');
    if (!calendarEvents[key]) calendarEvents[key] = [];
    const loan = myLoans.find(l => l.id === payment.loan_id);
    if (!loan) return;
    const isLender = loan.lender_id === user.id;
    const otherUserId = isLender ? loan.borrower_id : loan.lender_id;
    const otherProfile = getProfile(otherUserId);
    const firstName = (otherProfile?.full_name || otherProfile?.username || 'User').split(' ')[0];
    calendarEvents[key].push({
      amount: payment.amount || 0, isLender,
      initial: (otherProfile?.full_name || 'U').charAt(0).toUpperCase(),
      firstName, purpose: loan.purpose || '', isCompleted: true,
    });
  });

  return (
    <div style={{ minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14, lineHeight: 1.5, color: '#1A1918', WebkitFontSmoothing: 'antialiased' }}>
      <MeshMobileNav user={user} activePage="Upcoming" />
      <div className="mesh-layout" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 0, minHeight: '100vh' }}>

        {/* ── LEFT: Sidebar nav ── */}
        <DesktopSidebar />

        {/* ── CENTER ── */}
        <div className="mesh-center" style={{ background: 'transparent', padding: '24px 56px 80px' }}>

          {/* Desktop page title */}
          <div className="desktop-page-title" style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.2, color: '#1A1918' }}>
              Upcoming
            </div>
          </div>

          {/* Mobile-only page title */}
          <div className="mobile-page-title">
            <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.02em', marginBottom: 12 }}>Upcoming</div>
          </div>

          {/* Mobile ordering style */}
          <style>{`
            @media (max-width: 768px) {
              .upcoming-three-col { grid-template-columns: 1fr !important; }
              .upcoming-col-1 { order: 1; }
              .upcoming-col-2 { order: 2; }
              .upcoming-col-3 { order: 3; }
            }
          `}</style>

          {/* Two-column: [next 7 days + coming later] | [calendar] */}
          <div className="upcoming-three-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

            {/* Col 1: Next 7 Days + Coming Later */}
            <div className="upcoming-col-1" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* Next 7 Days */}
              {(() => {
                const sevenDays = Array.from({ length: 7 }, (_, i) => addDays(today, i));
                const next7Total = next7Days.reduce((s, e) => s + e.amount, 0);
                return (
                  <div>

                      {/* Section header — above the bar */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif" }}>Next 7 Days</div>
                        {next7Days.length > 0 && <span style={{ fontSize: 11, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif" }}>{next7Days.length} · {formatMoney(next7Total)}</span>}
                      </div>

                      {/* ── Date bar — calendar style ── */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 16, borderBottom: '1px solid rgba(0,0,0,0.07)', paddingBottom: 10 }}>
                        {sevenDays.map((day, i) => {
                          const isToday = i === 0;
                          const dayHasEvents = next7Days.some(e => isSameDay(e.date, day)) || (i === 0 && overdue.length > 0);
                          return (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontSize: 10, fontWeight: 500, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif" }}>
                                {format(day, 'EEE')}
                              </span>
                              <div style={{
                                width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: isToday ? '#03ACEA' : 'transparent',
                              }}>
                                <span style={{ fontSize: 12, fontWeight: isToday ? 700 : 400, color: isToday ? '#fff' : '#1A1918', fontFamily: "'DM Sans', sans-serif" }}>
                                  {format(day, 'd')}
                                </span>
                              </div>
                              {dayHasEvents
                                ? <span style={{ width: 4, height: 4, borderRadius: '50%', background: isToday ? '#E8726E' : '#03ACEA', display: 'block' }} />
                                : <span style={{ width: 4, height: 4, display: 'block' }} />
                              }
                            </div>
                          );
                        })}
                      </div>

                      {next7Days.length === 0 && overdue.length === 0 && (
                        <div style={{ fontSize: 12, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif", padding: '4px 0' }}>All clear this week 🎉</div>
                      )}

                      {/* 7-day rows — Home style: day/date column + colored bar + label */}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {sevenDays.map((day, i) => {
                          const dayEvents = next7Days.filter(e => isSameDay(e.date, day));
                          const isToday = i === 0;
                          const dayName = isToday ? 'Today' : format(day, 'EEE');
                          const dateLabel = format(day, 'MMM d');

                          // Today row: prepend overdue "Resolve" entries before any same-day events
                          const overdueRows = isToday ? overdue : [];

                          if (dayEvents.length === 0 && overdueRows.length === 0) {
                            return (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0' }}>
                                <div style={{ width: 52, flexShrink: 0, fontFamily: "'DM Sans', sans-serif" }}>
                                  <div style={{ fontSize: 10, fontWeight: 500, color: isToday ? '#03ACEA' : '#9B9A98', letterSpacing: '-0.01em' }}>{dayName}</div>
                                  <div style={{ fontSize: 12, fontWeight: 500, color: '#1A1918' }}>{dateLabel}</div>
                                </div>
                                <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: 'rgba(0,0,0,0.06)', flexShrink: 0 }} />
                                <span style={{ fontSize: 11, color: '#D4D2D0', fontFamily: "'DM Sans', sans-serif" }}>—</span>
                              </div>
                            );
                          }

                          // Build combined row list: overdue first (as resolve items), then today's events
                          const allRows = [
                            ...overdueRows.map(e => ({ ...e, _isOverdue: true })),
                            ...dayEvents.map(e => ({ ...e, _isOverdue: false })),
                          ];

                          return allRows.map((event, ei) => {
                            const isOverdueRow = event._isOverdue;
                            const barColor = isOverdueRow ? '#E8726E' : event.isLender ? '#03ACEA' : '#1D5B94';

                            // Label and second line
                            let label, subLabel;
                            if (isOverdueRow) {
                              if (overdue.length === 1) {
                                const amt = formatMoney(event.amount);
                                label = event.isLender
                                  ? `Resolve ${amt} overdue payment from ${event.firstName}`
                                  : `Resolve ${amt} overdue payment to ${event.firstName}`;
                                subLabel = event.reason || null;
                              } else {
                                // Group all overdues into one row (only render for ei=0 among overdue rows)
                                if (overdueRows.indexOf(event) > 0) return null;
                                const names = [...new Set(overdueRows.map(e => e.firstName))];
                                const nameStr = names.length <= 3
                                  ? names.join(', ')
                                  : names.slice(0, 2).join(', ') + ` and ${names.length - 2} more`;
                                label = `Resolve your ${overdue.length} overdue payments`;
                                subLabel = `Due to ${nameStr}`;
                              }
                            } else {
                              label = event.isLender
                                ? `Expect ${formatMoney(event.amount)} from ${event.firstName}`
                                : `${formatMoney(event.amount)} due to ${event.firstName}`;
                              subLabel = event.reason || null;
                            }

                            return (
                              <div key={`${i}-${ei}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0' }}>
                                {/* Date column — only show for first row of the day */}
                                <div style={{ width: 52, flexShrink: 0, fontFamily: "'DM Sans', sans-serif", opacity: ei === 0 ? 1 : 0 }}>
                                  <div style={{ fontSize: 10, fontWeight: 500, color: isToday ? '#03ACEA' : '#9B9A98', letterSpacing: '-0.01em' }}>{dayName}</div>
                                  <div style={{ fontSize: 12, fontWeight: 500, color: '#1A1918' }}>{dateLabel}</div>
                                </div>
                                {/* Colored bar */}
                                <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: barColor, flexShrink: 0 }} />
                                {/* Label block */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{
                                    fontSize: 12, fontWeight: isOverdueRow ? 600 : 500,
                                    color: isOverdueRow ? '#E8726E' : '#1A1918',
                                    fontFamily: "'DM Sans', sans-serif",
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  }}>
                                    {label}
                                  </div>
                                  {subLabel && (
                                    <div style={{ fontSize: 10, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif", marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subLabel}</div>
                                  )}
                                </div>
                                {/* Resolve arrow → opens payment modal */}
                                {isOverdueRow && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const overdueLoans = overdue.map(e => e.loan);
                                      setResolveModal({ loan: overdue[0].loan, loans: overdueLoans });
                                    }}
                                    style={{
                                      flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
                                      color: '#E8726E', padding: '2px 4px', display: 'flex', alignItems: 'center',
                                    }}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                                    </svg>
                                  </button>
                                )}
                              </div>
                            );
                          });
                        })}
                      </div>

                  </div>
                );
              })()}

              {/* Coming Later — same column as Next 7 Days */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif" }}>Coming Later</span>
                  {comingLater.length > 0 && <span style={{ fontSize: 11, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif" }}>{comingLater.length} · {formatMoney(comingLater.reduce((s, e) => s + e.amount, 0))}</span>}
                </div>
                {comingLater.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif", padding: '4px 0' }}>Nothing coming up ✨</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {comingLater.map((event) => {
                      const barColor = event.isLender ? '#03ACEA' : '#1D5B94';
                      const label = event.isLender
                        ? `Expect ${formatMoney(event.amount)} from ${event.firstName}`
                        : `${formatMoney(event.amount)} due to ${event.firstName}`;
                      const subLabel = event.reason || null;
                      return (
                        <div key={event.loanId + '-later'} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0' }}>
                          <div style={{ width: 52, flexShrink: 0, fontFamily: "'DM Sans', sans-serif" }}>
                            <div style={{ fontSize: 10, fontWeight: 500, color: '#9B9A98', letterSpacing: '-0.01em' }}>{format(event.date, 'EEE')}</div>
                            <div style={{ fontSize: 12, fontWeight: 500, color: '#1A1918' }}>{format(event.date, 'MMM d')}</div>
                          </div>
                          <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: barColor, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {label}
                            </div>
                            {subLabel && <div style={{ fontSize: 10, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif", marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subLabel}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>{/* end col 1 */}

            {/* Col 2: Calendar */}
            <div className="upcoming-col-3" style={{ position: 'relative' }}>
            <div style={{ position: 'relative', zIndex: 1 }}>

              {/* Month nav */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <button onClick={() => setCalendarMonth(addMonths(calendarMonth, -1))} style={{ width: 24, height: 24, borderRadius: '50%', border: '1.5px solid rgba(0,0,0,0.09)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#787776" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif" }}>{format(calendarMonth, 'MMMM yyyy')}</span>
                <button onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))} style={{ width: 24, height: 24, borderRadius: '50%', border: '1.5px solid rgba(0,0,0,0.09)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#787776" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
              </div>

              {/* Day-of-week headers — styled like Home week strip */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 500, color: '#9B9A98', letterSpacing: '-0.01em', paddingBottom: 4 }}>{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                {calendarDays.map((day, i) => {
                  const inMonth = isSameMonth(day, calendarMonth);
                  const isToday = isSameDay(day, today);
                  const isSelected = isSameDay(day, selectedDay);
                  const key = format(day, 'yyyy-MM-dd');
                  const dayEvents = calendarEvents[key] || [];
                  const hasIncoming = dayEvents.some(e => !e.isCompleted && e.isLender);
                  const hasOutgoing = dayEvents.some(e => !e.isCompleted && !e.isLender);
                  const hasCompleted = dayEvents.some(e => e.isCompleted);
                  return (
                    <button
                      key={i}
                      onClick={() => { setSelectedDay(day); }}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                        padding: '5px 2px 6px', borderRadius: 8, border: 'none',
                        background: isSelected && !isToday ? 'rgba(0,0,0,0.04)' : 'transparent',
                        cursor: 'pointer', opacity: inMonth ? 1 : 0.28,
                      }}
                    >
                      {/* Day number — same style as Home week strip */}
                      <span style={{
                        fontSize: 11, fontWeight: isToday ? 700 : 500,
                        color: isToday ? '#03ACEA' : '#1A1918',
                        width: 22, height: 22, borderRadius: '50%',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        background: isToday ? '#EBF4FA' : 'transparent',
                        border: isToday ? '1.5px solid #03ACEA' : isSelected ? '1.5px solid rgba(0,0,0,0.15)' : '1.5px solid transparent',
                        fontFamily: "'DM Sans', sans-serif",
                      }}>
                        {format(day, 'd')}
                      </span>
                      {/* Dots for payments */}
                      {(hasIncoming || hasOutgoing || hasCompleted) && (
                        <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                          {hasOutgoing && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#1D5B94', flexShrink: 0 }} />}
                          {hasIncoming && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#03ACEA', flexShrink: 0 }} />}
                          {hasCompleted && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Selected day details */}
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                {/* Color key */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#03ACEA', flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ fontSize: 10, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif" }}>Incoming</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1D5B94', flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ fontSize: 10, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif" }}>Outgoing</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 2, background: '#E8726E', flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ fontSize: 10, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif" }}>Overdue</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ fontSize: 10, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif" }}>Complete</span>
                  </div>
                </div>
                {/* Date label */}
                <div style={{
                  fontSize: 9, fontWeight: 700, color: '#787776',
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  fontFamily: "'DM Sans', sans-serif", marginBottom: 8,
                }}>
                  {format(selectedDay, 'EEEE, MMMM d')}
                </div>

                {/* Payment rows for selected day */}
                {(() => {
                  const key = format(selectedDay, 'yyyy-MM-dd');
                  const dayEvents = calendarEvents[key] || [];
                  if (dayEvents.length === 0) {
                    return <div style={{ fontSize: 12, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif" }}>Nothing due</div>;
                  }
                  return dayEvents.map((ev, idx) => {
                    const barColor = ev.isCompleted ? '#22c55e' : ev.isLender ? '#03ACEA' : '#1D5B94';
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'stretch', gap: 10, marginBottom: idx < dayEvents.length - 1 ? 8 : 0 }}>
                        <div style={{ width: 3, borderRadius: 2, background: barColor, flexShrink: 0, minHeight: 18 }} />
                        <div>
                          <div style={{ fontSize: 12, color: '#1A1918', fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
                            {ev.isLender
                              ? <>{formatMoney(ev.amount)} expected from {ev.firstName}</>
                              : <>Send {ev.firstName} {formatMoney(ev.amount)}</>
                            }
                          </div>
                          {ev.purpose && (
                            <div style={{ fontSize: 11, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif", marginTop: 1 }}>
                              {ev.purpose}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

            </div>
            </div>{/* end calendar card */}

          </div>{/* end schedule grid */}
        </div>


      </div>

      {/* Record Payment modal — opened by "Resolve" arrow on overdue items */}
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

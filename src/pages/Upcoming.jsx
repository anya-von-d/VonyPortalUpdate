import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loan, Payment, PublicProfile } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";
import { format, startOfMonth, endOfMonth, addMonths, addDays, startOfWeek, endOfWeek, isSameMonth, isSameDay } from "date-fns";
import { formatMoney } from "@/components/utils/formatMoney";
import { daysUntil as daysUntilDate } from "@/components/utils/dateUtils";
import DashboardSidebar from "@/components/DashboardSidebar";

const SHADOW = '0px 50px 40px rgba(0,0,0,0.02), 0px 50px 40px rgba(0,0,0,0.04), 0px 20px 40px rgba(0,0,0,0.08), 0px 3px 10px rgba(0,0,0,0.12)';

// ── Mini calendar widget for Summary view ──
function MiniCalendar({ today, paymentDates }) {
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = [];
  let d = calStart;
  while (d <= calEnd) { days.push(new Date(d)); d = addDays(d, 1); }

  const hasPayment = (day) => paymentDates.some(pd => isSameDay(pd.date, day));
  const getPaymentType = (day) => {
    const match = paymentDates.find(pd => isSameDay(pd.date, day));
    return match ? match.type : null;
  };

  return (
    <div>
      {/* Month at top */}
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.01em' }}>
          {format(today, 'MMMM yyyy')}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0, marginBottom: 6 }}>
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#787776', padding: '8px 0' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {days.map((day, i) => {
          const inMonth = isSameMonth(day, today);
          const isToday = isSameDay(day, new Date());
          const hasPmt = hasPayment(day);
          const pmtType = getPaymentType(day);
          return (
            <div key={i} style={{
              textAlign: 'center', padding: '6px 2px', borderRadius: 8, fontSize: 12, position: 'relative',
              color: !inMonth ? '#C7C6C4' : isToday ? 'white' : '#1A1918',
              fontWeight: isToday ? 700 : 400,
              background: isToday ? '#82F0B9' : hasPmt && pmtType === 'incoming' ? 'rgba(106,212,120,0.12)' : hasPmt ? 'rgba(130,240,185,0.08)' : 'transparent',
            }}>
              {format(day, 'd')}
              {hasPmt && !isToday && (
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: pmtType === 'incoming' ? '#4CAF50' : '#82F0B9', margin: '2px auto 0' }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Key at bottom */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#787776' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4CAF50' }} /> Owed to you
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#787776' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#82F0B9' }} /> You owe
        </div>
      </div>
    </div>
  );
}

export default function Upcoming() {
  const { user: authUser, userProfile, isLoadingAuth, navigateToLogin } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'summary');
  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [publicProfiles, setPublicProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const user = userProfile ? { ...userProfile, id: authUser?.id, email: authUser?.email } : null;

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
    } catch (error) {
      console.error("Data load error:", error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (!isLoadingAuth && authUser) loadData();
    else if (!isLoadingAuth && !authUser) setIsLoading(false);
  }, [isLoadingAuth]);

  // Loading
  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '2px solid #82F0B9', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px' }} className="animate-spin" />
          <p style={{ fontSize: 14, color: '#787776', fontFamily: "'DM Sans', sans-serif" }}>Loading upcoming...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: '#F4F4F5', borderRadius: 14, overflow: 'hidden', boxShadow: SHADOW, padding: 32, textAlign: 'center', maxWidth: 400 }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1A1918', marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>
            Sign in to view upcoming
          </h1>
          <p style={{ color: '#787776', marginBottom: 24, fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>
            See your scheduled payments and repayments.
          </p>
          <button onClick={navigateToLogin} style={{
            width: '100%', padding: '12px 24px', fontSize: 16, fontWeight: 600,
            background: '#82F0B9', color: 'white', border: 'none', borderRadius: 12,
            cursor: 'pointer', fontFamily: "'DM Sans', sans-serif"
          }}>Sign In</button>
        </div>
      </div>
    );
  }

  // ── Data computations ──
  const today = new Date();
  const safeLoans = Array.isArray(loans) ? loans : [];
  const safeProfiles = Array.isArray(publicProfiles) ? publicProfiles : [];
  const safePayments = Array.isArray(payments) ? payments : [];

  const myLoans = safeLoans.filter(l => l && (l.lender_id === user.id || l.borrower_id === user.id));
  const activeLoans = myLoans.filter(l => l && l.status === 'active' && l.next_payment_date);

  const getProfile = (userId) => safeProfiles.find(p => p.user_id === userId);

  // Build upcoming payment events
  const allPaymentEvents = activeLoans.map(loan => {
    const isLender = loan.lender_id === user.id;
    const otherUserId = isLender ? loan.borrower_id : loan.lender_id;
    const otherProfile = getProfile(otherUserId);
    const days = daysUntilDate(loan.next_payment_date);
    const nextPayDate = new Date(loan.next_payment_date);

    // Calculate remaining amount for this period
    const loanPayments = safePayments.filter(p => p && p.loan_id === loan.id);
    let periodStart = new Date(nextPayDate);
    const freq = loan.payment_frequency || 'monthly';
    if (freq === 'weekly') periodStart.setDate(periodStart.getDate() - 7);
    else if (freq === 'bi-weekly') periodStart.setDate(periodStart.getDate() - 14);
    else periodStart.setMonth(periodStart.getMonth() - 1);

    const paidThisPeriod = loanPayments
      .filter(p => {
        const pDate = new Date(p.payment_date || p.created_at);
        return pDate >= periodStart && pDate <= today && p.status === 'completed';
      })
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const originalAmount = loan.payment_amount || 0;
    const remainingAmount = Math.max(0, originalAmount - paidThisPeriod);

    return {
      loan,
      date: nextPayDate,
      days,
      amount: remainingAmount,
      originalAmount,
      isLender,
      username: otherProfile?.username || 'user',
      fullName: otherProfile?.full_name || 'Unknown',
      initial: (otherProfile?.full_name || 'U').charAt(0).toUpperCase(),
      purpose: loan.purpose || '',
      loanId: loan.id,
      frequency: freq,
    };
  }).filter(e => e.amount > 0).sort((a, b) => a.date - b.date);

  // Split into next 7 days vs coming later (8-30 days)
  const next7Days = allPaymentEvents.filter(e => e.days >= 0 && e.days <= 7);
  const comingLater = allPaymentEvents.filter(e => e.days > 7 && e.days <= 30);
  const overdue = allPaymentEvents.filter(e => e.days < 0);

  const next7Total = next7Days.reduce((s, e) => s + e.amount, 0);
  const next7Count = next7Days.length;
  const laterTotal = comingLater.reduce((s, e) => s + e.amount, 0);
  const laterCount = comingLater.length;

  // Calendar data
  const calMonthStart = startOfMonth(calendarMonth);
  const calMonthEnd = endOfMonth(calendarMonth);
  const calWeekStart = startOfWeek(calMonthStart);
  const calWeekEnd = endOfWeek(calMonthEnd);
  const calendarDays = [];
  let cd = calWeekStart;
  while (cd <= calWeekEnd) { calendarDays.push(new Date(cd)); cd = addDays(cd, 1); }

  // Project payment dates for the calendar month
  const calendarEvents = {};
  activeLoans.forEach(loan => {
    const isLender = loan.lender_id === user.id;
    const otherUserId = isLender ? loan.borrower_id : loan.lender_id;
    const otherProfile = getProfile(otherUserId);
    const freq = loan.payment_frequency || 'monthly';
    const nextPay = new Date(loan.next_payment_date);
    const amount = loan.payment_amount || 0;

    // Project dates into the displayed month
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
      // Monthly: same day-of-month
      const dayOfMonth = nextPay.getDate();
      const projDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), dayOfMonth);
      if (projDate >= calMonthStart && projDate <= calMonthEnd) projected.push(projDate);
    }

    projected.forEach(date => {
      const key = format(date, 'yyyy-MM-dd');
      if (!calendarEvents[key]) calendarEvents[key] = [];
      calendarEvents[key].push({
        amount,
        isLender,
        username: otherProfile?.username || 'user',
        initial: (otherProfile?.full_name || 'U').charAt(0).toUpperCase(),
        purpose: loan.purpose || '',
      });
    });
  });

  // Mini-calendar payment dates for summary view
  const miniCalPaymentDates = allPaymentEvents.map(e => ({
    date: e.date,
    type: e.isLender ? 'incoming' : 'outgoing',
  }));

  const avatarInitial = (user.full_name || 'U').charAt(0).toUpperCase();

  // Format due date for display
  const formatDueDate = (date) => {
    return format(date, "do MMMM 'at' h:mmaaa");
  };

  // ── Payment list item component ──
  const PaymentRow = ({ event, showBorder = true }) => {
    const isOverdue = event.days < 0;
    const daysAbs = Math.abs(event.days);
    const daysLabel = isOverdue ? `${daysAbs}d late` : event.days === 0 ? 'today' : `${event.days}d`;
    const firstName = (event.fullName || event.username || 'User').split(' ')[0];
    const purpose = event.purpose || '';

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0' }}>
        {/* Days label */}
        <div style={{
          fontSize: 10, fontWeight: 600, color: isOverdue ? '#E8726E' : '#787776',
          letterSpacing: '0.02em', flexShrink: 0, minWidth: 46, textAlign: 'center',
        }}>
          {daysLabel}
        </div>
        {/* Main info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1918' }}>
            {event.isLender
              ? `${firstName} pays you${purpose ? ` for ${purpose}` : ''}`
              : `Pay ${firstName}${purpose ? ` for ${purpose}` : ''}`}
          </div>
          <div style={{ fontSize: 11, color: '#787776', marginTop: 2 }}>
            due {format(event.date, 'do MMM')}
          </div>
        </div>
        {/* Amount */}
        <div style={{ fontSize: 14, fontWeight: 600, flexShrink: 0, color: '#1A1918' }}>
          {event.isLender ? '+' : '-'}{formatMoney(event.amount)}
        </div>
      </div>
    );
  };

  const PageCard = ({ title, headerRight, children, style }) => (
    <div style={{ background: '#F4F4F5', borderRadius: 14, overflow: 'hidden', boxShadow: SHADOW, ...style }}>
      <div style={{ padding: '6px 14px 5px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>{title}</span>
        {headerRight && <div style={{ flexShrink: 0 }}>{headerRight}</div>}
      </div>
      <div style={{ background: '#ffffff', margin: '0 5px 5px', borderRadius: 10, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );

  return (
    <div className="home-with-sidebar" style={{ minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14, lineHeight: 1.5, color: '#1A1918', WebkitFontSmoothing: 'antialiased', paddingTop: 0, background: 'transparent' }}>

      <DashboardSidebar activePage="Upcoming" user={user} tabs={[{key:'summary',label:'Summary'},{key:'calendar',label:'Calendar'}]} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Hero */}
      <div style={{ margin: '8px 10px 0', height: 168, background: '#54A6CF', borderRadius: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 24, overflow: 'hidden', position: 'relative', boxShadow: '0px 50px 40px rgba(0,0,0,0.01), 0px 50px 40px rgba(0,0,0,0.02), 0px 20px 40px rgba(0,0,0,0.05), 0px 3px 10px rgba(0,0,0,0.08)' }}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15, pointerEvents: 'none', zIndex: 0 }} viewBox="0 0 1200 168" preserveAspectRatio="xMidYMid slice">
          {[{cx:80,cy:40},{cx:200,cy:110},{cx:320,cy:25},{cx:430,cy:160},{cx:540,cy:70},{cx:660,cy:130},{cx:770,cy:35},{cx:890,cy:175},{cx:1000,cy:80},{cx:1100,cy:140},{cx:150,cy:185},{cx:480,cy:100},{cx:720,cy:180},{cx:950,cy:55},{cx:280,cy:195},{cx:620,cy:48},{cx:1050,cy:195}].map((s, i) => (
            <circle key={i} cx={s.cx} cy={s.cy} r={i % 3 === 0 ? 2.5 : 1.5} fill="white" />
          ))}
        </svg>
        <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 38, fontWeight: 600, color: '#1A1918', margin: 0, letterSpacing: '-0.01em', lineHeight: 1, textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <span style={{ fontStyle: 'normal' }}>Upcoming</span>
        </h1>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '20px 40px 64px', position: 'relative', zIndex: 1 }}>

        {activeTab === 'summary' ? (
          /* ════════ SUMMARY VIEW ════════ */
          <div className="upcoming-summary-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>

            {/* Left column: Payment lists */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Overdue section */}
              {overdue.length > 0 && (
                <PageCard
                  title="Overdue"
                  headerRight={
                    <span style={{ fontSize: 11, color: '#E8726E', fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
                      {overdue.length} payment{overdue.length !== 1 ? 's' : ''} · {formatMoney(overdue.reduce((s, e) => s + e.amount, 0))}
                    </span>
                  }
                >
                  <div style={{ padding: '6px 16px 14px' }}>
                    {overdue.map((event, idx) => (
                      <PaymentRow key={event.loanId + '-ov'} event={event} showBorder={idx < overdue.length - 1} />
                    ))}
                  </div>
                </PageCard>
              )}

              {/* Next 7 Days */}
              <PageCard
                title="Next 7 Days"
                headerRight={
                  <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
                    {next7Count} payment{next7Count !== 1 ? 's' : ''} · {formatMoney(next7Total)}
                  </span>
                }
              >
                <div style={{ padding: '6px 16px 14px' }}>
                  {next7Days.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: '#787776', fontSize: 13 }}>No payments in the next 7 days</div>
                  ) : (
                    next7Days.map((event, idx) => (
                      <PaymentRow key={event.loanId + '-7'} event={event} showBorder={idx < next7Days.length - 1} />
                    ))
                  )}
                </div>
              </PageCard>

              {/* Coming Later */}
              <PageCard
                title="Coming Later"
                headerRight={
                  <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
                    {laterCount} payment{laterCount !== 1 ? 's' : ''} · {formatMoney(laterTotal)}
                  </span>
                }
              >
                <div style={{ padding: '6px 16px 14px' }}>
                  {comingLater.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: '#787776', fontSize: 13 }}>No payments coming up</div>
                  ) : (
                    comingLater.map((event, idx) => (
                      <PaymentRow key={event.loanId + '-later'} event={event} showBorder={idx < comingLater.length - 1} />
                    ))
                  )}
                </div>
              </PageCard>
            </div>

            {/* Right column: Mini calendar */}
            <div>
              <PageCard title="This Month">
                <div style={{ padding: '14px 16px' }}>
                  <MiniCalendar today={today} paymentDates={miniCalPaymentDates} />
                </div>
              </PageCard>
            </div>
          </div>
        ) : (
          /* ════════ CALENDAR VIEW ════════ */
          <PageCard title={format(calendarMonth, 'MMMM yyyy')}>
            <div style={{ padding: '28px 32px' }}>
              {/* Month header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
                <button onClick={() => setCalendarMonth(addMonths(calendarMonth, -1))} style={{
                  width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(0,0,0,0.08)',
                  background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#787776" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 600, color: '#1A1918', letterSpacing: '-0.02em', fontFamily: "'DM Sans', sans-serif" }}>
                  {format(calendarMonth, 'MMMM yyyy')}
                </h2>
                <button onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))} style={{
                  width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(0,0,0,0.08)',
                  background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#787776" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
              </div>

              {/* Day of week headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid rgba(0,0,0,0.06)', marginBottom: 4 }}>
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#787776', padding: '10px 0' }}>{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {calendarDays.map((day, i) => {
                  const inMonth = isSameMonth(day, calendarMonth);
                  const isToday = isSameDay(day, new Date());
                  const key = format(day, 'yyyy-MM-dd');
                  const dayEvents = calendarEvents[key] || [];
                  const hasIncoming = dayEvents.some(e => e.isLender);
                  const hasOutgoing = dayEvents.some(e => !e.isLender);

                  let cellBg = 'transparent';
                  if (hasIncoming && hasOutgoing) cellBg = 'rgba(130,240,185,0.06)';
                  else if (hasIncoming) cellBg = 'rgba(106,212,120,0.08)';
                  else if (hasOutgoing) cellBg = 'rgba(130,240,185,0.06)';

                  return (
                    <div key={i} style={{
                      minHeight: 100, padding: '8px 10px', borderRadius: 10,
                      background: inMonth ? cellBg : 'transparent',
                      opacity: inMonth ? 1 : 0.3,
                      border: isToday ? '2px solid #82F0B9' : '1px solid transparent',
                    }}>
                      {/* Date number */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: isToday ? 26 : 'auto', height: isToday ? 26 : 'auto',
                          borderRadius: '50%', fontSize: 12, fontWeight: isToday ? 700 : 500,
                          color: isToday ? 'white' : inMonth ? '#1A1918' : '#C7C6C4',
                          background: isToday ? '#82F0B9' : 'transparent',
                        }}>
                          {format(day, 'd')}
                        </span>
                        {/* Show amounts */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                          {dayEvents.filter(e => e.isLender).length > 0 && (
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#4CAF50' }}>
                              +{formatMoney(dayEvents.filter(e => e.isLender).reduce((s, e) => s + e.amount, 0))}
                            </span>
                          )}
                          {dayEvents.filter(e => !e.isLender).length > 0 && (
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#82F0B9' }}>
                              {formatMoney(dayEvents.filter(e => !e.isLender).reduce((s, e) => s + e.amount, 0))}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Avatar circles */}
                      {dayEvents.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, marginTop: 'auto', paddingTop: 8 }}>
                          {dayEvents.slice(0, 3).map((ev, j) => (
                            <div key={j} style={{
                              width: 24, height: 24, borderRadius: '50%', fontSize: 10, fontWeight: 600,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: ev.isLender ? '#4CAF50' : '#82F0B9', color: 'white',
                            }}>
                              {ev.initial}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div style={{
                              width: 24, height: 24, borderRadius: '50%', fontSize: 9, fontWeight: 600,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: 'rgba(0,0,0,0.06)', color: '#787776',
                            }}>+{dayEvents.length - 3}</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#787776' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4CAF50' }} /> Owed to you
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#787776' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#82F0B9' }} /> You owe
                </div>
              </div>
            </div>
          </PageCard>
        )}

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

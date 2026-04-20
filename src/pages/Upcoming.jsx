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
import MeshMobileNav from "@/components/MeshMobileNav";
import DesktopSidebar from '../components/DesktopSidebar';

export default function Upcoming() {
  const { user: authUser, userProfile, isLoadingAuth, navigateToLogin, logout } = useAuth();
  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [publicProfiles, setPublicProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
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
      const firstName = (otherProfile?.full_name || otherProfile?.username || 'User').split(' ')[0];
      calendarEvents[key].push({ amount, isLender, initial: (otherProfile?.full_name || 'U').charAt(0).toUpperCase(), firstName, purpose: loan.purpose || '' });
    });
  });

  // ── PaymentRow component ──
  // Matches the Home "Upcoming" card styling: countdown badge on the left,
  // primary line (e.g. "$1.02 due to Natalie"), purpose as secondary line.
  const PaymentRow = ({ event }) => {
    const isOverdueItem = event.days < 0;
    const daysLabel = isOverdueItem ? format(event.date, 'MMM d') : format(event.date, 'MMM d');
    const amountStr = formatMoney(event.amount);
    let primaryLine;
    if (isOverdueItem) {
      primaryLine = event.isLender
        ? <>{amountStr} from {event.firstName} is overdue</>
        : <>{amountStr} to {event.firstName} is overdue</>;
    } else {
      primaryLine = event.isLender
        ? <>Due to receive {amountStr} from {event.firstName}</>
        : <>{amountStr} due to {event.firstName}</>;
    }
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0' }}>
        <div style={{
          flexShrink: 0,
          fontSize: 10, fontWeight: 700, lineHeight: 1.2,
          color: isOverdueItem ? '#E8726E' : event.days <= 3 ? '#F59E0B' : '#9B9A98',
          background: isOverdueItem ? 'rgba(232,114,110,0.08)' : event.days <= 3 ? 'rgba(245,158,11,0.08)' : 'rgba(0,0,0,0.04)',
          borderRadius: 5, padding: '2px 5px',
        }}>
          {daysLabel}
        </div>
        <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: '#1A1918', overflow: 'hidden' }}>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {primaryLine}
          </div>
          {event.purpose && (
            <div style={{ fontSize: 11, color: '#9B9A98', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
              {event.purpose}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Section heading ──
  const SectionHead = ({ label, count, total }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 5, marginBottom: 2, marginTop: 28 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
      {count > 0 && <span style={{ fontSize: 11, color: '#9B9A98' }}>{count} · {formatMoney(total)}</span>}
    </div>
  );


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

          {/* Three-column: overdue+7days | coming later+cashflow+so far | calendar */}
          <div className="upcoming-three-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, alignItems: 'start' }}>

            {/* Col 1: Overdue + Next 7 Days */}
            <div className="upcoming-col-1" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Overdue */}
              {overdue.length > 0 && (
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 'calc(100% + 10px)', height: 'calc(100% + 10px)',
                    background: 'linear-gradient(135deg, rgb(232,114,110) 0%, rgb(239,68,68) 30%, rgb(251,146,60) 60%, rgb(232,114,110) 100%)',
                    filter: 'blur(5px) saturate(1.2)', opacity: 0.35,
                    borderRadius: 18, zIndex: 0, pointerEvents: 'none',
                  }} />
                  <div style={{
                    position: 'relative', zIndex: 1, flex: 1,
                    background: 'linear-gradient(to right, rgba(232,114,110,0) 0%, #E8726E 67%, #E8726E 100%)',
                    padding: 1, borderRadius: 11, display: 'flex', flexDirection: 'column',
                  }}>
                  <div style={{ flex: 1, padding: '14px 18px', borderRadius: 10, background: '#ffffff', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 5, marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#E8726E', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif" }}>Overdue</span>
                      <span style={{ fontSize: 11, color: '#9B9A98' }}>{overdue.length} · {formatMoney(overdue.reduce((s, e) => s + e.amount, 0))}</span>
                    </div>
                    {overdue.map(event => {
                      const daysAgo = Math.abs(event.days);
                      const primaryText = event.isLender
                        ? <>{event.firstName}'s <span style={{ fontWeight: 700 }}>{formatMoney(event.amount)}</span> payment is {daysAgo} day{daysAgo !== 1 ? 's' : ''} overdue</>
                        : <>Your payment of <span style={{ fontWeight: 700 }}>{formatMoney(event.amount)}</span> to {event.firstName} is {daysAgo} day{daysAgo !== 1 ? 's' : ''} overdue</>;
                      return (
                        <div key={event.loanId + '-ov'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '7px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                          <div style={{ fontSize: 12, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", flex: 1, minWidth: 0 }}>
                            {primaryText}
                          </div>
                          <Link
                            to={createPageUrl('RecordPayment')}
                            style={{ fontSize: 11, fontWeight: 600, color: '#E8726E', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: "'DM Sans', sans-serif" }}
                          >
                            Record Payment →
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                  </div>
                </div>
              )}

              {/* Next 7 Days — vertical date strip */}
              {(() => {
                const sevenDays = Array.from({ length: 7 }, (_, i) => addDays(today, i));
                const next7Total = next7Days.reduce((s, e) => s + e.amount, 0);
                return (
                  <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                    <div style={{
                      position: 'absolute', top: '50%', left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 'calc(100% + 10px)', height: 'calc(100% + 10px)',
                      background: 'linear-gradient(135deg, rgb(3,172,234) 0%, rgb(6,182,212) 30%, rgb(20,184,166) 60%, rgb(3,172,234) 100%)',
                      filter: 'blur(5px) saturate(1.2)', opacity: 0.35,
                      borderRadius: 18, zIndex: 0, pointerEvents: 'none',
                    }} />
                    <div style={{
                      position: 'relative', zIndex: 1, flex: 1,
                      background: 'linear-gradient(to right, rgba(3,172,234,0) 0%, #03ACEA 67%, #03ACEA 100%)',
                      padding: 1, borderRadius: 11, display: 'flex', flexDirection: 'column',
                    }}>
                    <div style={{ flex: 1, padding: '14px 18px', borderRadius: 10, background: '#ffffff', display: 'flex', flexDirection: 'column' }}>

                      {/* Card header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif" }}>Next 7 Days</span>
                        {next7Days.length > 0 && <span style={{ fontSize: 11, color: '#9B9A98' }}>{next7Days.length} · {formatMoney(next7Total)}</span>}
                      </div>

                      {/* Insight line */}
                      <div style={{ fontSize: 12, color: '#787776', marginBottom: 14, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.45 }}>
                        {next7Days.length > 0
                          ? <>You have <span style={{ fontWeight: 600, color: '#1A1918' }}>{next7Days.length} payment{next7Days.length !== 1 ? 's' : ''}</span> due within the next 7 days for <span style={{ fontWeight: 600, color: '#1A1918' }}>{formatMoney(next7Total)}</span>.</>
                          : <>You're all caught up this week! 🎉</>
                        }
                      </div>

                      {/* 7-day rows */}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {sevenDays.map((day, i) => {
                          const dayEvents = next7Days.filter(e => isSameDay(e.date, day));
                          const isToday = i === 0;
                          const dayName = isToday ? 'Today' : format(day, 'EEE');
                          const dateNum = format(day, 'd');
                          return (
                            <div key={i} style={{
                              display: 'flex', alignItems: 'center',
                              minHeight: 44,
                              borderBottom: i < 6 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                              gap: 0,
                            }}>
                              {/* Date box */}
                              <div style={{ width: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingRight: 0 }}>
                                <div style={{
                                  width: 36, height: 36, borderRadius: 9,
                                  display: 'flex', flexDirection: 'column',
                                  alignItems: 'center', justifyContent: 'center',
                                  background: isToday ? '#1A1918' : 'rgba(0,0,0,0.03)',
                                  flexShrink: 0,
                                }}>
                                  <span style={{
                                    fontSize: 7, fontWeight: 700,
                                    color: isToday ? 'rgba(255,255,255,0.6)' : '#9B9A98',
                                    lineHeight: 1, textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    fontFamily: "'DM Sans', sans-serif",
                                  }}>{dayName}</span>
                                  <span style={{
                                    fontSize: 14, fontWeight: 700,
                                    color: isToday ? '#ffffff' : '#1A1918',
                                    lineHeight: 1, marginTop: 1,
                                    fontFamily: "'DM Sans', sans-serif",
                                  }}>{dateNum}</span>
                                </div>
                              </div>

                              {/* Divider */}
                              <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(0,0,0,0.06)', marginRight: 12, marginTop: 6, marginBottom: 6 }} />

                              {/* Events */}
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 0 }}>
                                {dayEvents.length === 0 ? (
                                  <span style={{ fontSize: 11, color: '#D4D2D0', fontFamily: "'DM Sans', sans-serif" }}>—</span>
                                ) : dayEvents.map((event, ei) => (
                                  <div key={ei} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <span style={{
                                        fontSize: 12, fontWeight: 500, color: '#1A1918',
                                        fontFamily: "'DM Sans', sans-serif",
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        display: 'block',
                                      }}>
                                        {event.isLender ? `from ${event.firstName}` : `to ${event.firstName}`}
                                      </span>
                                      {event.purpose && (
                                        <span style={{ fontSize: 10, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif", display: 'block' }}>
                                          {event.purpose}
                                        </span>
                                      )}
                                    </div>
                                    <span style={{
                                      fontSize: 11, fontWeight: 700,
                                      color: event.isLender ? '#03ACEA' : '#1D5B94',
                                      background: event.isLender ? 'rgba(3,172,234,0.09)' : 'rgba(29,91,148,0.09)',
                                      borderRadius: 5, padding: '2px 7px',
                                      flexShrink: 0, fontFamily: "'DM Sans', sans-serif",
                                    }}>
                                      {formatMoney(event.amount)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                    </div>
                    </div>
                  </div>
                );
              })()}

            </div>{/* end col 1 */}

            {/* Col 2: Coming Later + Cashflow + So Far This Month */}
            <div className="upcoming-col-2" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Coming Later */}
              <div style={{ position: 'relative' }}>
                <div className="home-aura-glow" style={{ position: 'absolute', inset: -3, background: '#CFDCE7', borderRadius: 12, filter: 'blur(4px)', opacity: 0.5, zIndex: 0, pointerEvents: 'none' }} />
                <div style={{ position: 'relative', zIndex: 1, background: '#ffffff', borderRadius: 10, border: 'none', padding: '14px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif" }}>Coming Later</span>
                    {comingLater.length > 0 && <span style={{ fontSize: 11, color: '#9B9A98' }}>{comingLater.length} · {formatMoney(comingLater.reduce((s, e) => s + e.amount, 0))}</span>}
                  </div>
                  {/* Insight line */}
                  <div style={{ fontSize: 12, color: '#787776', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.45, marginBottom: comingLater.length > 0 ? 10 : 0 }}>
                    {comingLater.length > 0
                      ? <>You have <span style={{ fontWeight: 600, color: '#1A1918' }}>{comingLater.length} payment{comingLater.length !== 1 ? 's' : ''}</span> coming up for <span style={{ fontWeight: 600, color: '#1A1918' }}>{formatMoney(comingLater.reduce((s, e) => s + e.amount, 0))}</span>.</>
                      : <>Clear skies ahead ✨</>
                    }
                  </div>
                  {comingLater.map(event => <PaymentRow key={event.loanId + '-later'} event={event} />)}
                </div>
              </div>

              {/* Cashflow */}
              <div style={{ position: 'relative' }}>
                <div className="home-aura-glow" style={{ position: 'absolute', inset: -3, background: '#CFDCE7', borderRadius: 12, filter: 'blur(4px)', opacity: 0.5, zIndex: 0, pointerEvents: 'none' }} />
                <div style={{ position: 'relative', zIndex: 1, background: '#ffffff', borderRadius: 10, border: 'none', padding: '14px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 5, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif" }}>Cashflow</span>
                    <span style={{ fontSize: 10, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif" }}>{format(today, 'MMMM')}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 12, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", textAlign: 'center' }}>
                      Expected to receive <span style={{ fontWeight: 700, color: '#03ACEA' }}>{formatMoney(monthlyExpectedReceive)}</span> this month
                    </div>
                    <div style={{ fontSize: 12, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", textAlign: 'center' }}>
                      Due to pay out <span style={{ fontWeight: 700, color: '#1D5B94' }}>{formatMoney(monthlyExpectedPay)}</span> this month
                    </div>
                  </div>
                </div>
              </div>

              {/* So Far This Month */}
              <div style={{ position: 'relative' }}>
                <div className="home-aura-glow" style={{ position: 'absolute', inset: -3, background: '#CFDCE7', borderRadius: 12, filter: 'blur(4px)', opacity: 0.5, zIndex: 0, pointerEvents: 'none' }} />
                <div style={{ position: 'relative', zIndex: 1, background: '#ffffff', borderRadius: 10, border: 'none', padding: '14px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 5, marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif" }}>So far this month</span>
                  </div>
                  {/* Received */}
                  {(() => {
                    const pct = monthlyExpectedReceive > 0 ? Math.min(100, Math.round((monthlyReceived / monthlyExpectedReceive) * 100)) : 0;
                    return (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 12, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", marginBottom: 5 }}>
                          Received <span style={{ fontWeight: 800, color: '#03ACEA', letterSpacing: '-0.02em' }}>{formatMoney(monthlyReceived)}</span>
                        </div>
                        <div style={{ width: '100%', height: 5, borderRadius: 3, background: 'rgba(3,172,234,0.15)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 3, background: '#03ACEA', width: `${pct}%`, transition: 'width 1s cubic-bezier(0.4,0,0.2,1)' }} />
                        </div>
                        <div style={{ fontSize: 12, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif", marginTop: 4 }}>
                          monthly payment has been {pct}% received
                        </div>
                      </div>
                    );
                  })()}
                  {/* Paid out */}
                  {(() => {
                    const pct = monthlyExpectedPay > 0 ? Math.min(100, Math.round((monthlyPaidOut / monthlyExpectedPay) * 100)) : 0;
                    return (
                      <div>
                        <div style={{ fontSize: 12, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", marginBottom: 5 }}>
                          Paid out <span style={{ fontWeight: 800, color: '#1D5B94', letterSpacing: '-0.02em' }}>{formatMoney(monthlyPaidOut)}</span>
                        </div>
                        <div style={{ width: '100%', height: 5, borderRadius: 3, background: 'rgba(29,91,148,0.15)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 3, background: '#1D5B94', width: `${pct}%`, transition: 'width 1s cubic-bezier(0.4,0,0.2,1)' }} />
                        </div>
                        <div style={{ fontSize: 12, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif", marginTop: 4 }}>
                          monthly payment has been {pct}% paid back
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>{/* end col 2 */}

            {/* Col 3: Calendar */}
            <div className="upcoming-col-3" style={{ position: 'relative' }}>
              <div className="home-aura-glow" style={{ position: 'absolute', inset: -3, background: '#CFDCE7', borderRadius: 12, filter: 'blur(4px)', opacity: 0.5, zIndex: 0, pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1, background: '#ffffff', borderRadius: 10, border: 'none', padding: '14px 18px' }}>

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
                  const isToday = isSameDay(day, new Date());
                  const isSelected = isSameDay(day, selectedDay);
                  const key = format(day, 'yyyy-MM-dd');
                  const dayEvents = calendarEvents[key] || [];
                  const hasIncoming = dayEvents.some(e => e.isLender);
                  const hasOutgoing = dayEvents.some(e => !e.isLender);
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
                      {(hasIncoming || hasOutgoing) && (
                        <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                          {hasOutgoing && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#1D5B94', flexShrink: 0 }} />}
                          {hasIncoming && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#03ACEA', flexShrink: 0 }} />}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Selected day details */}
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                {/* Color key */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 10, justifyContent: 'center' }}>
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
                  return dayEvents.map((ev, idx) => (
                    <div key={idx} style={{ marginBottom: idx < dayEvents.length - 1 ? 8 : 0 }}>
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
                  ));
                })()}
              </div>

            </div>
            </div>{/* end calendar card */}

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

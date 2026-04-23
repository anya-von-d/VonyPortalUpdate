import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loan, Payment, PublicProfile } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";
import {
  format, startOfMonth, endOfMonth, addMonths, addDays,
  startOfWeek, endOfWeek, isSameMonth, isSameDay,
} from "date-fns";
import { formatMoney } from "@/components/utils/formatMoney";
import { daysUntil as daysUntilDate, toLocalDate } from "@/components/utils/dateUtils";
import MeshMobileNav from "@/components/MeshMobileNav";
import DesktopSidebar from '../components/DesktopSidebar';

export default function Upcoming() {
  const navigate = useNavigate();
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
  const [customExpenses, setCustomExpenses] = useState(() => {
    try { const raw = localStorage.getItem('vony.plan-expenses'); return raw ? JSON.parse(raw) : []; } catch { return []; }
  });
  const [addingExpense, setAddingExpense] = useState(false);
  const [hoveredPostitOverdue, setHoveredPostitOverdue] = useState(null);
  const [newExpenseLabel, setNewExpenseLabel] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseDate, setNewExpenseDate] = useState('');
  const [newExpenseDir, setNewExpenseDir] = useState('out');
  const addCustomExpense = (label, amount, date, dir) => {
    if (!label.trim() || !amount) return;
    const signed = dir === 'in' ? Math.abs(parseFloat(amount)) : -Math.abs(parseFloat(amount));
    const exp = { id: `exp-${Date.now()}`, label: label.trim(), amount: signed, date: date || null, status: 'custom' };
    setCustomExpenses(prev => { const next = [...prev, exp]; try { localStorage.setItem('vony.plan-expenses', JSON.stringify(next)); } catch {} return next; });
  };

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
    // Count completed AND pending_confirmation payments — a pending payment means the period is covered
    const paidThisPeriod = loanPayments
      .filter(p => { const pDate = new Date(p.payment_date || p.created_at); return pDate >= periodStart && pDate <= today && (p.status === 'completed' || p.status === 'pending_confirmation'); })
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

  // ── PaymentRow component (Coming Later) ──
  // Badge color: incoming = light blue, outgoing = dark blue
  const PaymentRow = ({ event }) => {
    const isOverdueItem = event.days < 0;
    const daysLabel = format(event.date, 'MMM d');
    const amountStr = formatMoney(event.amount);
    const badgeColor = event.isLender ? '#03ACEA' : '#1D5B94';
    const badgeBg = event.isLender ? 'rgba(3,172,234,0.09)' : 'rgba(29,91,148,0.09)';
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
          color: badgeColor,
          background: badgeBg,
          borderRadius: 5, padding: '2px 5px',
          fontFamily: "'DM Sans', sans-serif",
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
              {/* Status post-its — png blue notes, always shown */}
              {(() => {
                const noteConfigs = [
                  { img: '/images/postits/1.png', rotate: '-3.5deg', ty: '7px', zIndex: 1, textColor: '#002A40' },
                  { img: '/images/postits/2.png', rotate: '1.8deg',  ty: '0px',  zIndex: 2, textColor: '#003A52' },
                  { img: '/images/postits/3.png', rotate: '-1deg',   ty: '5px',  zIndex: 3, textColor: '#001F30' },
                ];

                // Pending payments: submitted by borrower, awaiting lender confirmation
                const pendingPayments = safePayments
                  .filter(p => p?.status === 'pending_confirmation')
                  .map(p => {
                    const loan = myLoans.find(l => l.id === p.loan_id);
                    if (!loan) return null;
                    const otherUserId = loan.lender_id === user.id ? loan.borrower_id : loan.lender_id;
                    const otherProfile = getProfile(otherUserId);
                    const firstName = (otherProfile?.full_name || otherProfile?.username || 'User').split(' ')[0];
                    return { amount: p.amount || 0, firstName, loanId: loan.id };
                  })
                  .filter(Boolean);

                const hasOverdue = overdue.length > 0;
                const hasPending = pendingPayments.length > 0;

                const openPending = () => window.dispatchEvent(
                  new CustomEvent('open-friends-popup', { detail: { initialRequestsOpen: true } })
                );

                const overdueText = (e) => {
                  const daysAgo = Math.abs(e.days);
                  return e.isLender
                    ? `${e.firstName}'s payment of ${formatMoney(e.amount)} is ${daysAgo} day${daysAgo !== 1 ? 's' : ''} overdue`
                    : `Your payment of ${formatMoney(e.amount)} to ${e.firstName} is ${daysAgo} day${daysAgo !== 1 ? 's' : ''} overdue`;
                };

                const pendingText = () => {
                  const names = [...new Set(pendingPayments.map(p => p.firstName))];
                  if (pendingPayments.length === 1)
                    return `Your ${formatMoney(pendingPayments[0].amount)} payment to ${pendingPayments[0].firstName} has not been confirmed by them yet`;
                  return names.length === 1
                    ? `You have ${pendingPayments.length} payments that ${names[0]} has not confirmed yet`
                    : `You have ${pendingPayments.length} payments that your friends have not confirmed yet`;
                };

                let postitItems = [];

                if (!hasOverdue && !hasPending) {
                  postitItems = [
                    { text: '', action: null },
                    { text: "Everything's looking good 🎆", action: null },
                    { text: '', action: null },
                  ];
                } else if (hasOverdue && hasPending) {
                  postitItems = [
                    { text: overdueText(overdue[0]), action: null },
                    { text: overdue.length > 1 ? `You have ${overdue.length} overdue payments` : overdueText(overdue[0]), action: null },
                    { text: pendingText(), action: openPending, isPending: true },
                  ];
                } else if (hasOverdue) {
                  if (overdue.length === 1) {
                    postitItems = [{ text: overdueText(overdue[0]), action: null }];
                  } else if (overdue.length === 2) {
                    postitItems = [
                      { text: overdueText(overdue[0]), action: null },
                      { text: overdueText(overdue[1]), action: null },
                    ];
                  } else {
                    const remaining = overdue.length - 2;
                    postitItems = [
                      { text: overdueText(overdue[0]), action: null },
                      { text: overdueText(overdue[1]), action: null },
                      { text: `You have ${remaining} other overdue payment${remaining !== 1 ? 's' : ''}`, action: null },
                    ];
                  }
                } else {
                  // pending only — single post-it
                  postitItems = [{ text: pendingText(), action: openPending, isPending: true }];
                }

                return (
                  <div className="home-card-attention" style={{ display: 'flex', paddingBottom: 10, overflow: 'visible', justifyContent: postitItems.length < 3 ? 'center' : 'flex-start' }}>
                    {postitItems.map((item, i) => {
                      const nc = noteConfigs[i];
                      return (
                        <div
                          key={i}
                          onClick={item.action || undefined}
                          onMouseEnter={() => setHoveredPostitOverdue(i)}
                          onMouseLeave={() => setHoveredPostitOverdue(null)}
                          style={{
                            flex: postitItems.length === 3 ? 1 : '0 0 auto',
                            width: postitItems.length === 3 ? 'auto' : '34%',
                            minHeight: 110,
                            marginRight: i < postitItems.length - 1 ? -22 : 0,
                            transform: hoveredPostitOverdue === i
                              ? `rotate(${nc.rotate}) translateY(calc(${nc.ty} - 10px))`
                              : `rotate(${nc.rotate}) translateY(${nc.ty})`,
                            zIndex: hoveredPostitOverdue === i ? 10 : nc.zIndex,
                            position: 'relative',
                            filter: hoveredPostitOverdue === i
                              ? 'drop-shadow(4px 10px 14px rgba(0,0,0,0.26)) drop-shadow(0 2px 5px rgba(0,0,0,0.16))'
                              : 'drop-shadow(2px 5px 9px rgba(0,0,0,0.22)) drop-shadow(0 1px 2px rgba(0,0,0,0.12))',
                            cursor: item.action ? 'pointer' : 'default',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'transform 0.18s ease, filter 0.18s ease',
                          }}
                        >
                          <img
                            src={nc.img}
                            alt=""
                            draggable={false}
                            style={{
                              position: 'absolute', inset: 0,
                              width: '100%', height: '100%',
                              objectFit: 'fill',
                              pointerEvents: 'none', userSelect: 'none',
                              zIndex: 0,
                            }}
                          />
                          {item.text ? (
                            <p style={{
                              position: 'relative', zIndex: 1,
                              margin: 0, padding: '0 14px',
                              textAlign: 'center',
                              fontSize: 11, fontWeight: 600,
                              color: nc.textColor,
                              fontFamily: "'DM Sans', sans-serif",
                              lineHeight: 1.45,
                              textShadow: '0 1px 0 rgba(255,255,255,0.25)',
                            }}>
                              {item.text}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Next 7 Days — Home-style card */}
              {(() => {
                const sevenDays = Array.from({ length: 7 }, (_, i) => addDays(today, i));
                const next7Total = next7Days.reduce((s, e) => s + e.amount, 0);
                return (
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'relative', zIndex: 1, background: '#FEFEFE', borderRadius: 2, border: 'none', boxShadow: '5px 4px 18px rgba(0,0,0,0.09), -1px 0 0 rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.06)', padding: '14px 18px' }}>

                      {/* Card header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif" }}>Next 7 Days</div>
                        {next7Days.length > 0 && <span style={{ fontSize: 11, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif" }}>{next7Days.length} · {formatMoney(next7Total)}</span>}
                      </div>

                      {/* Insight — summary or sticky note when all clear */}
                      {next7Days.length > 0 ? (
                        <div style={{ fontSize: 11, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif", marginBottom: 10, lineHeight: 1.4 }}>
                          {next7Days.length} payment{next7Days.length !== 1 ? 's' : ''} due · <span style={{ fontWeight: 600, color: '#787776' }}>{formatMoney(next7Total)} total</span>
                        </div>
                      ) : (
                        <div style={{
                          position: 'relative',
                          background: 'linear-gradient(170deg, #FAF7F0 0%, #F3EFE4 100%)',
                          borderRadius: '2px 2px 3px 3px',
                          padding: '12px 10px 10px',
                          marginBottom: 10,
                          boxShadow: '1px 3px 10px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)',
                          fontFamily: "'DM Sans', sans-serif",
                          textAlign: 'center',
                        }}>
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, background: 'rgba(0,0,0,0.07)', borderRadius: '2px 2px 0 0' }} />
                          <p style={{ margin: 0, marginTop: 2, fontSize: 11, fontWeight: 600, color: '#5C4A2A', lineHeight: 1.45 }}>
                            You're all caught up this week 🎉
                          </p>
                        </div>
                      )}

                      {/* 7-day rows — Home style: day/date column + colored bar + label */}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {sevenDays.map((day, i) => {
                          const dayEvents = next7Days.filter(e => isSameDay(e.date, day));
                          const isToday = i === 0;
                          const dayName = isToday ? 'Today' : format(day, 'EEE');
                          const dateLabel = format(day, 'MMM d');
                          if (dayEvents.length === 0) {
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
                          return dayEvents.map((event, ei) => {
                            const barColor = event.isLender ? '#03ACEA' : '#1D5B94';
                            const label = event.isLender
                              ? `Expect ${formatMoney(event.amount)} from ${event.firstName}`
                              : `${formatMoney(event.amount)} due to ${event.firstName}`;
                            return (
                              <div key={`${i}-${ei}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0' }}>
                                {/* Date column — only show for first event of the day */}
                                <div style={{ width: 52, flexShrink: 0, fontFamily: "'DM Sans', sans-serif", opacity: ei === 0 ? 1 : 0 }}>
                                  <div style={{ fontSize: 10, fontWeight: 500, color: isToday ? '#03ACEA' : '#9B9A98', letterSpacing: '-0.01em' }}>{dayName}</div>
                                  <div style={{ fontSize: 12, fontWeight: 500, color: '#1A1918' }}>{dateLabel}</div>
                                </div>
                                {/* Colored bar */}
                                <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: barColor, flexShrink: 0 }} />
                                {/* Event label */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 12, fontWeight: 500, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {label}
                                  </div>
                                  {event.purpose && (
                                    <div style={{ fontSize: 10, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif", marginTop: 1 }}>{event.purpose}</div>
                                  )}
                                </div>
                              </div>
                            );
                          });
                        })}
                      </div>

                    </div>
                  </div>
                );
              })()}

            </div>{/* end col 1 */}

            {/* Col 2: Coming Later + Cashflow + So Far This Month */}
            <div className="upcoming-col-2" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Coming Later — paper card */}
              <div style={{ position: 'relative' }}>
                <div style={{
                  background: '#FEFEFE', borderRadius: 2, border: 'none',
                  boxShadow: '5px 4px 18px rgba(0,0,0,0.09), -1px 0 0 rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.06)',
                  padding: '14px 18px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif" }}>Coming Later</span>
                    {comingLater.length > 0 && <span style={{ fontSize: 11, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif" }}>{comingLater.length} · {formatMoney(comingLater.reduce((s, e) => s + e.amount, 0))}</span>}
                  </div>
                  {/* Beige sticky note — summary or empty state */}
                  <div style={{
                    position: 'relative',
                    background: 'linear-gradient(170deg, #FAF7F0 0%, #F3EFE4 100%)',
                    borderRadius: '2px 2px 3px 3px',
                    padding: '12px 10px 10px',
                    marginBottom: comingLater.length > 0 ? 10 : 0,
                    boxShadow: '1px 3px 10px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)',
                    fontFamily: "'DM Sans', sans-serif",
                    textAlign: comingLater.length === 0 ? 'center' : 'left',
                  }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, background: 'rgba(0,0,0,0.07)', borderRadius: '2px 2px 0 0' }} />
                    <p style={{ margin: 0, marginTop: 2, fontSize: 11, fontWeight: 600, color: '#5C4A2A', lineHeight: 1.45 }}>
                      {comingLater.length > 0
                        ? <>You have <b style={{ color: '#1A1918' }}>{comingLater.length} payment{comingLater.length !== 1 ? 's' : ''}</b> coming up for <b style={{ color: '#1A1918' }}>{formatMoney(comingLater.reduce((s, e) => s + e.amount, 0))}</b>.</>
                        : <>Clear skies ahead ✨</>
                      }
                    </p>
                  </div>
                  {comingLater.map(event => <PaymentRow key={event.loanId + '-later'} event={event} />)}
                </div>
              </div>



            </div>{/* end col 2 */}

            {/* Col 3: Calendar */}
            <div className="upcoming-col-3" style={{ position: 'relative' }}>
            <div style={{ position: 'relative', zIndex: 1, background: '#FEFEFE', borderRadius: 2, border: 'none', boxShadow: '5px 4px 18px rgba(0,0,0,0.09), -1px 0 0 rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.06)', padding: '14px 18px' }}>

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

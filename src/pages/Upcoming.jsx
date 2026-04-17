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
import SidebarBottomSection from '../components/SidebarBottomSection';
import MeshMobileNav from "@/components/MeshMobileNav";

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
      <span style={{ fontSize: 9, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
      {count > 0 && <span style={{ fontSize: 11, color: '#9B9A98' }}>{count} · {formatMoney(total)}</span>}
    </div>
  );


  return (
    <div style={{ minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14, lineHeight: 1.5, color: '#1A1918', WebkitFontSmoothing: 'antialiased' }}>
      <MeshMobileNav user={user} activePage="Upcoming" />
      <div className="mesh-layout" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 0, minHeight: '100vh' }}>

        {/* ── LEFT: Sidebar nav ── */}
        <div className="mesh-left" style={{ background: 'transparent', borderRight: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ position: 'sticky', top: 0, padding: '24px 8px 0' }}>
            <Link to="/" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontStyle: 'italic', fontSize: '1.3rem', color: '#1A1918', textDecoration: 'none', display: 'block', marginBottom: 16, paddingLeft: 6, lineHeight: 1, letterSpacing: '-0.02em' }}>Vony</Link>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[
                { label: 'Home', to: '/' },
                { label: 'Upcoming', to: createPageUrl("Upcoming") },
                { label: 'Create Loan', to: createPageUrl("CreateOffer") },
                { label: 'Record Payment', to: createPageUrl("RecordPayment") },
                { label: 'My Loans', to: createPageUrl("YourLoans") },
                { label: 'Friends', to: createPageUrl("Friends") },
                { label: 'Recent Activity', to: createPageUrl("RecentActivity") },
                { label: 'Documents', to: createPageUrl("LoanAgreements") },
              ].map(({ label, to }) => {
                const currentPath = window.location.pathname;
                const isActive = to === '/' ? currentPath === '/' : currentPath.includes(to.split('?')[0].replace('/app/', ''));
                const navIcons = {
                  'Home': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
                  'Upcoming': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
                  'Create Loan': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
                  'Record Payment': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
                  'My Loans': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
                  'Friends': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
                  'Recent Activity': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
                  'Documents': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
                  };
                return (
                  <Link key={label} to={to} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 9, textDecoration: 'none',
                    fontSize: 13, fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#1A1918' : '#787776',
                    background: isActive ? 'rgba(0,0,0,0.05)' : 'transparent',
                    fontFamily: "'DM Sans', sans-serif", width: '100%', boxSizing: 'border-box',
                  }}>
                    <span style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 7, background: isActive ? 'rgba(0,0,0,0.07)' : 'rgba(0,0,0,0.04)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{navIcons[label]}</span>
                    {label}
                  </Link>
                );
              })}
            </nav>
            <SidebarBottomSection />
          </div>
        </div>

        {/* ── CENTER ── */}
        <div className="mesh-center" style={{ background: 'transparent', padding: '24px 32px 80px' }}>

          {/* Mobile-only page title (desktop shows it in top bar) */}
          <div className="mobile-page-title">
            <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 17, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.02em', marginBottom: 12 }}>Upcoming</div>
            <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', marginLeft: -32, marginRight: -32, marginBottom: 20 }} />
          </div>

          {/* Two-column: section boxes left, calendar right */}
          <div className="upcoming-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

            {/* Left: Overdue + Next 7 Days + Coming Later */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Overdue */}
              {overdue.length > 0 && (
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                  {/* Aurora glow — red/orange palette */}
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 'calc(100% + 10px)', height: 'calc(100% + 10px)',
                    background: 'linear-gradient(135deg, rgb(232,114,110) 0%, rgb(239,68,68) 30%, rgb(251,146,60) 60%, rgb(232,114,110) 100%)',
                    filter: 'blur(5px) saturate(1.2)', opacity: 0.35,
                    borderRadius: 18, zIndex: 0, pointerEvents: 'none',
                  }} />
                  {/* Gradient border wrapper */}
                  <div style={{
                    position: 'relative', zIndex: 1, flex: 1,
                    background: 'linear-gradient(to right, rgba(232,114,110,0) 0%, #E8726E 67%, #E8726E 100%)',
                    padding: 1, borderRadius: 11, display: 'flex', flexDirection: 'column',
                  }}>
                  <div style={{ flex: 1, padding: '14px 18px', borderRadius: 10, background: '#ffffff', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, marginBottom: 4, borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#E8726E', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Overdue</span>
                      <span style={{ fontSize: 11, color: '#9B9A98' }}>{overdue.length} · {formatMoney(overdue.reduce((s, e) => s + e.amount, 0))}</span>
                    </div>
                    {overdue.map(event => <PaymentRow key={event.loanId + '-ov'} event={event} />)}
                  </div>
                  </div>
                </div>
              )}

              {/* Next 7 Days */}
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                {/* Aurora glow — cyan/teal palette */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 'calc(100% + 10px)', height: 'calc(100% + 10px)',
                  background: 'linear-gradient(135deg, rgb(3,172,234) 0%, rgb(6,182,212) 30%, rgb(20,184,166) 60%, rgb(3,172,234) 100%)',
                  filter: 'blur(5px) saturate(1.2)', opacity: 0.35,
                  borderRadius: 18, zIndex: 0, pointerEvents: 'none',
                }} />
                {/* Gradient border wrapper */}
                <div style={{
                  position: 'relative', zIndex: 1, flex: 1,
                  background: 'linear-gradient(to right, rgba(3,172,234,0) 0%, #03ACEA 67%, #03ACEA 100%)',
                  padding: 1, borderRadius: 11, display: 'flex', flexDirection: 'column',
                }}>
                <div style={{ flex: 1, padding: '14px 18px', borderRadius: 10, background: '#ffffff', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, marginBottom: 4, borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Next 7 Days</span>
                    {next7Days.length > 0 && <span style={{ fontSize: 11, color: '#9B9A98' }}>{next7Days.length} · {formatMoney(next7Days.reduce((s, e) => s + e.amount, 0))}</span>}
                  </div>
                  {next7Days.length === 0 ? (
                    <div style={{ padding: '8px 0', fontSize: 13, color: '#9B9A98', textAlign: 'center' }}>You're all caught up this week! 🎉</div>
                  ) : next7Days.map(event => <PaymentRow key={event.loanId + '-7'} event={event} />)}
                </div>
                </div>
              </div>

              {/* Coming Later */}
              <div style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px) saturate(1.4)', WebkitBackdropFilter: 'blur(12px) saturate(1.4)', borderRadius: 10, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '14px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, marginBottom: 4, borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Coming Later</span>
                  {comingLater.length > 0 && <span style={{ fontSize: 11, color: '#9B9A98' }}>{comingLater.length} · {formatMoney(comingLater.reduce((s, e) => s + e.amount, 0))}</span>}
                </div>
                {comingLater.length === 0 ? (
                  <div style={{ padding: '8px 0', fontSize: 13, color: '#9B9A98', textAlign: 'center' }}>Clear skies ahead ✨</div>
                ) : comingLater.map(event => <PaymentRow key={event.loanId + '-later'} event={event} />)}
              </div>
            </div>

            {/* Right: Calendar */}
            <div style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px) saturate(1.4)', WebkitBackdropFilter: 'blur(12px) saturate(1.4)', borderRadius: 10, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '14px 18px' }}>
              {/* Month nav */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <button onClick={() => setCalendarMonth(addMonths(calendarMonth, -1))} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(0,0,0,0.09)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#787776" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.01em' }}>{format(calendarMonth, 'MMMM yyyy')}</span>
                <button onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(0,0,0,0.09)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#787776" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
              </div>
              {/* Day headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid rgba(0,0,0,0.07)', marginBottom: 4 }}>
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#787776', padding: '6px 0' }}>{d}</div>
                ))}
              </div>
              {/* Calendar grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                {calendarDays.map((day, i) => {
                  const inMonth = isSameMonth(day, calendarMonth);
                  const isToday = isSameDay(day, new Date());
                  const key = format(day, 'yyyy-MM-dd');
                  const dayEvents = calendarEvents[key] || [];
                  const hasIncoming = dayEvents.some(e => e.isLender);
                  const hasOutgoing = dayEvents.some(e => !e.isLender);
                  return (
                    <div key={i} style={{
                      minHeight: 62, padding: '5px 6px', borderRadius: 7,
                      background: inMonth ? (hasIncoming ? 'rgba(3,172,234,0.06)' : hasOutgoing ? 'rgba(29,91,148,0.07)' : 'transparent') : 'transparent',
                      opacity: inMonth ? 1 : 0.3,
                      border: isToday ? '1.5px solid #03ACEA' : '1px solid transparent',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: isToday ? 18 : 'auto', height: isToday ? 18 : 'auto', borderRadius: '50%', fontSize: 11, fontWeight: isToday ? 700 : 500, color: isToday ? 'white' : inMonth ? '#1A1918' : '#C7C6C4', background: isToday ? '#03ACEA' : 'transparent' }}>{format(day, 'd')}</span>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                          {hasIncoming && <span style={{ fontSize: 8, fontWeight: 600, color: '#03ACEA' }}>+{formatMoney(dayEvents.filter(e => e.isLender).reduce((s, e) => s + e.amount, 0))}</span>}
                          {hasOutgoing && <span style={{ fontSize: 8, fontWeight: 600, color: '#1D5B94' }}>{formatMoney(dayEvents.filter(e => !e.isLender).reduce((s, e) => s + e.amount, 0))}</span>}
                        </div>
                      </div>
                      {dayEvents.length > 0 && (
                        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                          {dayEvents.slice(0, 2).map((ev, j) => (
                            <div key={j} style={{ width: 16, height: 16, borderRadius: '50%', fontSize: 8, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: ev.isLender ? '#03ACEA' : '#1D5B94', color: 'white' }}>{ev.initial}</div>
                          ))}
                          {dayEvents.length > 2 && <div style={{ width: 16, height: 16, borderRadius: '50%', fontSize: 8, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.06)', color: '#787776' }}>+{dayEvents.length - 2}</div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Legend */}
              <div style={{ display: 'flex', gap: 16, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#787776' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#03ACEA' }} /> Owed to you</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#787776' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D5B94' }} /> You owe</div>
              </div>
            </div>

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

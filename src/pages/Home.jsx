import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loan, Payment, PublicProfile, Friendship } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";


import { motion, AnimatePresence } from "framer-motion";
import { format, startOfMonth, endOfMonth, addMonths, addDays, isBefore, isAfter, differenceInDays } from "date-fns";
import { formatMoney } from "@/components/utils/formatMoney";
import { toLocalDate, getLocalToday, daysUntil as daysUntilDate } from "@/components/utils/dateUtils";

import DashboardSidebar from "@/components/DashboardSidebar";

// SVG star field data — exact positions from mockup
const STAR_CIRCLES = [
  {cx:82,cy:45,o:0.7},{cx:195,cy:112,o:0.5},{cx:310,cy:28,o:0.8},{cx:420,cy:198,o:0.4},
  {cx:530,cy:67,o:0.65},{cx:640,cy:245,o:0.55},{cx:755,cy:88,o:0.75},{cx:860,cy:156,o:0.45},
  {cx:970,cy:34,o:0.7},{cx:1085,cy:201,o:0.6},{cx:1190,cy:78,o:0.5},{cx:1300,cy:267,o:0.7},
  {cx:1410,cy:45,o:0.55},{cx:1520,cy:134,o:0.65},{cx:48,cy:189,o:0.4},{cx:158,cy:278,o:0.6},
  {cx:268,cy:156,o:0.5},{cx:378,cy:89,o:0.7},{cx:488,cy:234,o:0.45},{cx:598,cy:145,o:0.6},
  {cx:708,cy:312,o:0.35},{cx:818,cy:56,o:0.75},{cx:928,cy:223,o:0.5},{cx:1038,cy:98,o:0.65},
  {cx:1148,cy:289,o:0.4},{cx:1258,cy:167,o:0.7},{cx:1368,cy:234,o:0.55},{cx:1478,cy:78,o:0.6},
  {cx:1560,cy:256,o:0.45},{cx:125,cy:312,o:0.5},{cx:345,cy:267,o:0.6},{cx:565,cy:34,o:0.75},
  {cx:685,cy:178,o:0.4},{cx:905,cy:289,o:0.55},{cx:1125,cy:45,o:0.7},{cx:1345,cy:145,o:0.5},
  {cx:225,cy:67,o:0.6},{cx:445,cy:312,o:0.45},{cx:665,cy:112,o:0.65},{cx:885,cy:198,o:0.5},
  {cx:1105,cy:156,o:0.55},{cx:1325,cy:89,o:0.7},{cx:1545,cy:201,o:0.4},{cx:72,cy:134,o:0.6},
  {cx:292,cy:223,o:0.5},{cx:512,cy:156,o:0.65},{cx:732,cy:45,o:0.55},{cx:952,cy:134,o:0.7},
  {cx:1172,cy:234,o:0.4},{cx:1392,cy:312,o:0.5},{cx:160,cy:34,o:0.75},{cx:380,cy:178,o:0.45},
  {cx:600,cy:289,o:0.6},{cx:820,cy:267,o:0.5},{cx:1040,cy:56,o:0.7},{cx:1260,cy:112,o:0.55},
  {cx:1480,cy:245,o:0.6},{cx:100,cy:256,o:0.45},{cx:450,cy:145,o:0.65},{cx:750,cy:234,o:0.5},
  {cx:1050,cy:278,o:0.55},{cx:1350,cy:67,o:0.7},{cx:200,cy:198,o:0.4},{cx:500,cy:98,o:0.6},
  {cx:800,cy:312,o:0.45},{cx:1100,cy:189,o:0.65},{cx:1400,cy:156,o:0.5},{cx:1600,cy:88,o:0.6},
];

// Loan Carousel component for bottom section
function LoanCarousel({ notifications, onRecordPayment }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = notifications.length;

  useEffect(() => {
    if (totalSlides <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % totalSlides);
    }, 8000);
    return () => clearInterval(timer);
  }, [totalSlides]);

  const goTo = (index) => {
    if (index < 0) index = totalSlides - 1;
    if (index >= totalSlides) index = 0;
    setCurrentSlide(index);
  };

  if (totalSlides === 0) return null;

  return (
    <div className="glass-carousel-frame" style={{ marginTop: 36 }}>
      <div className="galaxy-slide" style={{ position: 'relative', overflow: 'hidden', borderRadius: 20 }}>
        <div style={{ display: 'flex', transition: 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)', transform: `translateX(-${currentSlide * 100}%)` }}>
          {notifications.map((notif, i) => (
            <div key={i} style={{ minWidth: '100%', padding: '40px 60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: 'white', marginBottom: 6, letterSpacing: '-0.02em' }}>
                  {notif.title}
                </h3>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                  {notif.description}
                </p>
              </div>
              {notif.action && (
                <button
                  onClick={notif.action.onClick}
                  style={{
                    padding: '11px 24px', borderRadius: 20, background: 'white', color: '#1A1918',
                    fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif", boxShadow: '0 4px 0 rgba(0,0,0,0.1)',
                    flexShrink: 0, whiteSpace: 'nowrap', transition: 'background 0.15s, transform 0.1s, box-shadow 0.1s'
                  }}
                >
                  {notif.action.label}
                </button>
              )}
            </div>
          ))}
        </div>
        {/* Arrows */}
        {totalSlides > 1 && (
          <>
            <button onClick={() => goTo(currentSlide - 1)} style={{
              position: 'absolute', top: '50%', left: 12, transform: 'translateY(-50%)',
              width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'white',
              boxShadow: '0 1px 6px rgba(0,0,0,0.08), 0 2px 12px rgba(0,0,0,0.04)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 2, opacity: 0.7
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7792F4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <button onClick={() => goTo(currentSlide + 1)} style={{
              position: 'absolute', top: '50%', right: 12, transform: 'translateY(-50%)',
              width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'white',
              boxShadow: '0 1px 6px rgba(0,0,0,0.08), 0 2px 12px rgba(0,0,0,0.04)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 2, opacity: 0.7
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7792F4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </>
        )}
        {/* Dots */}
        {totalSlides > 1 && (
          <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, zIndex: 2 }}>
            {notifications.map((_, i) => (
              <button key={i} onClick={() => setCurrentSlide(i)} style={{
                width: i === currentSlide ? 22 : 7, height: 7, borderRadius: i === currentSlide ? 10 : '50%',
                background: i === currentSlide ? 'white' : 'rgba(255,255,255,0.4)',
                border: 'none', padding: 0, cursor: 'pointer',
                boxShadow: i === currentSlide ? '0 0 8px rgba(255,255,255,0.4)' : 'none',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
              }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to sync public profile
const syncPublicProfile = async (userData) => {
  if (!userData || !userData.id || !userData.username || !userData.full_name) return;
  try {
    const existingProfiles = await PublicProfile.filter({ user_id: { eq: userData.id } });
    const defaultAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent((userData.full_name || 'User').charAt(0))}&background=22c55e&color=fff&size=128`;
    const publicProfileData = {
      user_id: userData.id,
      username: userData.username,
      full_name: userData.full_name,
      profile_picture_url: userData.profile_picture_url || defaultAvatarUrl
    };
    if (existingProfiles && existingProfiles.length > 0) {
      const existing = existingProfiles[0];
      if (existing.username !== publicProfileData.username || existing.full_name !== publicProfileData.full_name || existing.profile_picture_url !== publicProfileData.profile_picture_url) {
        await PublicProfile.update(existing.id, publicProfileData);
      }
    } else {
      await PublicProfile.create(publicProfileData);
    }
  } catch (error) {
    console.error("Failed to sync public profile:", error);
  }
};

export default function Home() {
  const { user: authUser, userProfile, isLoadingAuth, navigateToLogin } = useAuth();
  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [publicProfiles, setPublicProfiles] = useState([]);
  const [friendships, setFriendships] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [alertSlide, setAlertSlide] = useState(0);
  const overdueCountRef = useRef(0);

  // Scroll state for top bar behavior
  const [topBarHidden, setTopBarHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setTopBarHidden(currentScrollY > 60);
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Alert carousel auto-advance timer
  useEffect(() => {
    const interval = setInterval(() => {
      setAlertSlide(prev => {
        const count = overdueCountRef.current;
        if (count <= 1) return 0;
        return (prev + 1) % count;
      });
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Use profile from context
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
      const [allLoans, recentPayments, allProfiles, allFriendships] = await Promise.all([
        safeEntityCall(() => Loan.list('-created_at')),
        safeEntityCall(() => Payment.list('-created_at', 10)),
        safeEntityCall(() => PublicProfile.list()),
        safeEntityCall(() => Friendship.list()),
      ]);
      setLoans(allLoans);
      setPayments(recentPayments);
      setPublicProfiles(allProfiles);
      setFriendships(allFriendships);
      setDataLoaded(true);
      if (userProfile) syncPublicProfile({ ...userProfile, id: authUser.id });
    } catch (error) {
      console.error("Data load error:", error);
      setLoans([]); setPayments([]); setPublicProfiles([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (!isLoadingAuth && !dataLoaded && authUser) loadData();
    else if (!isLoadingAuth && !authUser) setIsLoading(false);
  }, [isLoadingAuth]);

  const handleLogin = async () => {
    setIsAuthenticating(true);
    try { await navigateToLogin(); }
    catch (error) { console.error("Login failed:", error); }
    finally { setTimeout(() => setIsAuthenticating(false), 3000); }
  };

  // Loading state
  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F7F7F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '2px solid #678AFB', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px' }} className="animate-spin" />
          <p style={{ fontSize: 14, color: '#787776', fontFamily: "'DM Sans', sans-serif" }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Not logged in state
  if (!user && !isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F7F7F7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} style={{ maxWidth: 400, width: '100%' }}>
          <div className="glass-card" style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ width: 96, height: 96, margin: '0 auto 24px', borderRadius: '50%', overflow: 'hidden', background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/e492d87a7_Logo.png" alt="Vony Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1A1918', marginBottom: 8, letterSpacing: '-0.02em', fontFamily: "'DM Sans', sans-serif" }}>
              Welcome to <span style={{ color: '#678AFB' }}>Vony</span>
            </h1>
            <p style={{ color: '#787776', marginBottom: 24, fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>
              Lending money to friends made simple.
            </p>
            <button onClick={handleLogin} disabled={isAuthenticating} style={{
              width: '100%', padding: '12px 24px', fontSize: 16, fontWeight: 600,
              background: '#678AFB', color: 'white', border: 'none', borderRadius: 12,
              cursor: isAuthenticating ? 'not-allowed' : 'pointer', opacity: isAuthenticating ? 0.7 : 1,
              fontFamily: "'DM Sans', sans-serif", transition: 'background 0.15s'
            }}>
              {isAuthenticating ? 'Signing you in...' : 'Sign In to Get Started'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user) return null;

  // ── Data computations ──
  const safeLoans = Array.isArray(loans) ? loans : [];
  const safeAllProfiles = Array.isArray(publicProfiles) ? publicProfiles : [];
  const safePayments = Array.isArray(payments) ? payments : [];

  const myLoans = safeLoans.filter(loan => loan && (loan.lender_id === user.id || loan.borrower_id === user.id));
  const pendingOffers = safeLoans.filter(loan => loan && loan.borrower_id === user.id && loan.status === 'pending');

  const lentLoans = myLoans.filter(l => l && l.lender_id === user.id && l.status === 'active');
  const borrowedLoans = myLoans.filter(l => l && l.borrower_id === user.id && l.status === 'active');
  const activeLoanCount = myLoans.filter(l => l && l.status === 'active').length;

  const totalLentAmount = lentLoans.reduce((sum, loan) => sum + (loan.total_amount || loan.amount || 0), 0);
  const totalRepaid = lentLoans.reduce((sum, loan) => sum + (loan.amount_paid || 0), 0);
  const percentRepaid = totalLentAmount > 0 ? Math.round((totalRepaid / totalLentAmount) * 100) : 0;
  const lentRemaining = totalLentAmount - totalRepaid;

  const totalBorrowedAmount = borrowedLoans.reduce((sum, loan) => sum + (loan.total_amount || loan.amount || 0), 0);
  const totalPaidBack = borrowedLoans.reduce((sum, loan) => sum + (loan.amount_paid || 0), 0);
  const percentPaid = totalBorrowedAmount > 0 ? Math.round((totalPaidBack / totalBorrowedAmount) * 100) : 0;
  const borrowedRemaining = totalBorrowedAmount - totalPaidBack;

  // Pie chart math (circumference = 2*PI*29 ≈ 182.21)
  const PIE_C = 182.21;
  const lentPieOffset = PIE_C - (PIE_C * percentRepaid / 100);
  const borrowedPieOffset = PIE_C - (PIE_C * percentPaid / 100);

  // Next payment (borrower)
  const nextBorrowerPayment = myLoans
    .filter(loan => loan && loan.borrower_id === user.id && loan.status === 'active' && loan.next_payment_date)
    .map(loan => {
      const otherUser = safeAllProfiles.find(p => p.user_id === loan.lender_id);
      return { ...loan, date: new Date(loan.next_payment_date), username: otherUser?.username || 'user' };
    })
    .sort((a, b) => a.date - b.date)[0];

  const nextLenderPayment = myLoans
    .filter(loan => loan && loan.lender_id === user.id && loan.status === 'active' && loan.next_payment_date)
    .map(loan => {
      const otherUser = safeAllProfiles.find(p => p.user_id === loan.borrower_id);
      return { ...loan, date: new Date(loan.next_payment_date), username: otherUser?.username || 'user' };
    })
    .sort((a, b) => a.date - b.date)[0];

  // Friends & loans booleans
  const acceptedFriendships = friendships.filter(f => f && f.status === 'accepted');
  const hasFriends = acceptedFriendships.length > 0;
  const hasLoans = activeLoanCount > 0;
  const hasLendingLoans = lentLoans.length > 0;
  const hasBorrowingLoans = borrowedLoans.length > 0;

  // Time-based greeting
  const hour = new Date().getHours();
  const greeting = hour >= 5 && hour < 12 ? 'Good morning' : hour >= 12 && hour < 18 ? 'Good afternoon' : 'Good night';
  const firstName = user.full_name?.split(' ')[0] || 'User';

  // Overdue payments (for hero alert)
  const today = new Date();
  const overdueYouOwe = myLoans.filter(l =>
    l && l.borrower_id === user.id && l.status === 'active' && l.next_payment_date && new Date(l.next_payment_date) < today
  );

  // Upcoming/overdue payment events
  const activeLoansForPayments = myLoans.filter(l => l && l.status === 'active' && l.next_payment_date);
  const allPaymentEvents = activeLoansForPayments
    .map(loan => {
      const isLender = loan.lender_id === user.id;
      const otherUserId = isLender ? loan.borrower_id : loan.lender_id;
      const otherProfile = safeAllProfiles.find(p => p.user_id === otherUserId);
      const days = daysUntilDate(loan.next_payment_date);
      const loanPayments = safePayments.filter(p => p && p.loan_id === loan.id);
      const nextPayDate = new Date(loan.next_payment_date);
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
      return { loan, date: nextPayDate, days, originalAmount, remainingAmount, username: otherProfile?.username || 'user', isLender, loanId: loan.id, purpose: loan.purpose || '' };
    })
    .filter(e => e.remainingAmount > 0)
    .sort((a, b) => a.date - b.date);

  const overdueEvents = allPaymentEvents.filter(e => e.days < 0);
  const upcomingEvents = allPaymentEvents.filter(e => e.days >= 0).slice(0, 5);
  const combinedPaymentEvents = [...overdueEvents, ...upcomingEvents];

  // Monthly stats
  const currentMonth = startOfMonth(today);
  const currentMonthEnd = endOfMonth(today);
  const monthlyReceived = safePayments
    .filter(p => {
      if (!p || p.status !== 'completed') return false;
      const loan = myLoans.find(l => l.id === p.loan_id);
      if (!loan || loan.lender_id !== user.id) return false;
      const pDate = new Date(p.payment_date || p.created_at);
      return pDate >= currentMonth && pDate <= currentMonthEnd;
    })
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const monthlyPaidOut = safePayments
    .filter(p => {
      if (!p || p.status !== 'completed') return false;
      const loan = myLoans.find(l => l.id === p.loan_id);
      if (!loan || loan.borrower_id !== user.id) return false;
      const pDate = new Date(p.payment_date || p.created_at);
      return pDate >= currentMonth && pDate <= currentMonthEnd;
    })
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  // Expected monthly amounts
  const monthlyExpectedReceive = lentLoans.reduce((sum, l) => sum + (l.payment_amount || 0), 0);
  const monthlyExpectedPay = borrowedLoans.reduce((sum, l) => sum + (l.payment_amount || 0), 0);

  // Overdue count for tags
  const overdueFromBorrowers = myLoans.filter(l =>
    l && l.lender_id === user.id && l.status === 'active' && l.next_payment_date && new Date(l.next_payment_date) < today
  ).length;
  const lentOnTrack = lentLoans.length - overdueFromBorrowers;
  const borrowingOverdue = overdueYouOwe.length;
  const borrowingOnTrack = borrowedLoans.length - borrowingOverdue;

  // Bar chart data
  const chartData = (() => {
    const allRelevantLoans = myLoans.filter(l => l && (l.status === 'active' || l.status === 'completed'));
    if (allRelevantLoans.length === 0) return null;
    const loanDates = allRelevantLoans.map(l => new Date(l.created_at)).filter(d => !isNaN(d.getTime()));
    if (loanDates.length === 0) return null;
    const earliestDate = loanDates.reduce((min, d) => d < min ? d : min, loanDates[0]);
    const chartStartMonth = startOfMonth(earliestDate);
    const now = new Date();
    const curMonth = startOfMonth(now);
    const isCurrentMonthFn = (m) => m.getFullYear() === curMonth.getFullYear() && m.getMonth() === curMonth.getMonth();
    const months = [];
    for (let i = 0; i < 6; i++) months.push(addMonths(chartStartMonth, i));

    const data = months.map(monthDate => {
      const monthEndDate = endOfMonth(monthDate);
      const isCurrent = isCurrentMonthFn(monthDate);
      const isFuture = isAfter(monthDate, curMonth);
      const snapshotDate = isCurrent ? now : (isFuture ? now : monthEndDate);
      let owedToYou = 0, youOwe = 0;
      allRelevantLoans.forEach(loan => {
        const loanCreated = new Date(loan.created_at);
        if (isAfter(loanCreated, snapshotDate)) return;
        const totalAmount = loan.total_amount || loan.amount || 0;
        const isLender = loan.lender_id === user.id;
        const loanPayments = safePayments.filter(p =>
          p && p.loan_id === loan.id && (p.status === 'completed' || p.status === 'pending_confirmation') &&
          !isAfter(new Date(p.payment_date || p.created_at), snapshotDate)
        );
        const totalPaid = loanPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const effectivePaid = isCurrent ? (loan.amount_paid || 0) : totalPaid;
        const remaining = Math.max(0, totalAmount - effectivePaid);
        if (isFuture) {
          const currentRemaining = Math.max(0, totalAmount - (loan.amount_paid || 0));
          if (isLender) owedToYou += currentRemaining; else youOwe += currentRemaining;
          return;
        }
        if (isLender) owedToYou += remaining; else youOwe += remaining;
      });
      return { month: monthDate, owedToYou, youOwe, label: format(monthDate, 'MMM'), isCurrent, isFuture };
    });

    const maxVal = Math.max(...data.map(d => d.owedToYou), ...data.map(d => d.youOwe), 1);
    return { data, maxVal };
  })();

  // Recent activity
  const recentActivity = (() => {
    const items = [];
    safePayments.filter(p => p && myLoans.some(l => l.id === p.loan_id)).forEach(p => {
      const loan = myLoans.find(l => l.id === p.loan_id);
      if (!loan) return;
      const isBorrower = loan.borrower_id === user.id;
      const otherUserId = isBorrower ? loan.lender_id : loan.borrower_id;
      const otherProfile = safeAllProfiles.find(pr => pr.user_id === otherUserId);
      const amount = `$${(p.amount || 0).toLocaleString()}`;
      const username = `@${otherProfile?.username || 'user'}`;
      items.push({
        type: 'payment', isIncoming: !isBorrower, date: new Date(p.payment_date || p.created_at),
        description: isBorrower ? `You paid ${username}` : `${username} paid you`,
        detail: format(new Date(p.payment_date || p.created_at), 'MMM d') + (loan.purpose ? ` · ${loan.purpose}` : ''),
        amount: isBorrower ? `-${amount}` : `+${amount}`
      });
    });
    return items.sort((a, b) => b.date - a.date).slice(0, 4);
  })();

  // Carousel notifications
  const carouselNotifications = (() => {
    const notifs = [];
    const nextWeek = addDays(today, 7);

    // Upcoming payments from borrowers
    myLoans.filter(l => l && l.lender_id === user.id && l.status === 'active' && l.next_payment_date).forEach(loan => {
      const d = new Date(loan.next_payment_date);
      const days = daysUntilDate(d);
      const borrowerProfile = safeAllProfiles.find(p => p.user_id === loan.borrower_id);
      const uname = borrowerProfile?.username || 'user';
      if (days >= 0 && days <= 7) {
        notifs.push({
          title: `@${uname}'s next payment is in ${days} day${days !== 1 ? 's' : ''}`,
          description: `They've repaid ${formatMoney(loan.amount_paid || 0)} of ${formatMoney(loan.total_amount || loan.amount || 0)} so far. We've sent both of you a notification as a reminder.`
        });
      }
    });

    // Overdue payments you owe
    overdueYouOwe.forEach(loan => {
      const lenderProfile = safeAllProfiles.find(p => p.user_id === loan.lender_id);
      const uname = lenderProfile?.username || 'user';
      const days = Math.abs(daysUntilDate(loan.next_payment_date));
      notifs.push({
        title: `You have a payment due to @${uname}`,
        description: `This one was due ${days} day${days !== 1 ? 's' : ''} ago. If you've already paid, make sure to record the payment so it's up to date.`,
        action: { label: 'Record Payment', onClick: () => { window.location.href = createPageUrl("RecordPayment"); } }
      });
    });

    // Overdue from borrowers
    myLoans.filter(l => l && l.lender_id === user.id && l.status === 'active' && l.next_payment_date && new Date(l.next_payment_date) < today).forEach(loan => {
      const borrowerProfile = safeAllProfiles.find(p => p.user_id === loan.borrower_id);
      const uname = borrowerProfile?.username || 'user';
      const days = Math.abs(daysUntilDate(loan.next_payment_date));
      notifs.push({
        title: `@${uname}'s payment is overdue`,
        description: `Their payment of ${formatMoney(loan.payment_amount || 0)} was due ${days} day${days !== 1 ? 's' : ''} ago. If they've paid, make sure to record it.`,
        action: { label: 'Record Payment', onClick: () => { window.location.href = createPageUrl("RecordPayment"); } }
      });
    });

    // Fallback slides
    if (hasBorrowingLoans) {
      notifs.push({
        title: 'Stay on top of your loans',
        description: 'Check in on your payment progress and keep track of upcoming due dates.',
        action: { label: 'Track Progress', onClick: () => window.location.href = createPageUrl("Borrowing") }
      });
    }
    if (hasLendingLoans) {
      notifs.push({
        title: 'Review your loan agreements',
        description: 'View and download your loan documents anytime to stay informed.',
        action: { label: 'My Documents', onClick: () => window.location.href = createPageUrl("LoanAgreements") }
      });
    }

    return notifs.length > 0 ? notifs.slice(0, 4) : [{
      title: 'Welcome to Vony',
      description: 'Create a loan or add friends to get started with lending between friends.'
    }];
  })();

  // User avatar initial
  const avatarInitial = (user.full_name || 'U').charAt(0).toUpperCase();

  // All overdue reminders for hero alert carousel
  const overdueReminders = overdueYouOwe.map(loan => {
    const lenderProfile = safeAllProfiles.find(p => p.user_id === loan.lender_id);
    const days = Math.abs(daysUntilDate(loan.next_payment_date));
    return { loan, days, username: lenderProfile?.username || 'user', amount: loan.payment_amount || 0 };
  }).sort((a, b) => b.days - a.days);

  const alertTotal = overdueReminders.length;
  overdueCountRef.current = alertTotal;

  return (
    <div className="home-with-sidebar" style={{ minHeight: '100vh', position: 'relative', fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif", fontSize: 14, lineHeight: 1.5, color: '#1A1918', WebkitFontSmoothing: 'antialiased', paddingLeft: 240 }}>

      <DashboardSidebar activePage="Dashboard" user={user} />

      {/* ── Galaxy gradient background ── */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', bottom: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: 0, left: '-10%', width: '120%', height: '100%', zIndex: 0,
          background: 'linear-gradient(180deg, #527DFF 0%, #5580FF 5%, #678AFB 13%, #7792F4 22%, #8C9BEE 32%, #A19EEB 42%, #A79DEA 50%, #BB98E8 58%, #C89CE6 65%, #D4A0E4 72%, #DDA5E2 76%, #F0D8EA 80%, #F7F7F7 84%)'
        }} />
        {/* Static star field */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 420, zIndex: 1, overflow: 'hidden' }}>
          <svg width="100%" height="100%" viewBox="0 0 1617 329" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="starGlow">
                <stop offset="0%" stopColor="#EAF9F3"/>
                <stop offset="100%" stopColor="#9FEBFB"/>
              </radialGradient>
            </defs>
            {STAR_CIRCLES.map((s, i) => (
              <circle key={i} cx={s.cx} cy={s.cy} r="1.75" fill="url(#starGlow)" opacity={s.o}/>
            ))}
          </svg>
        </div>
        {/* Twinkling stars */}
        <div className="twinkle-star" />
        <div className="twinkle-star" />
        <div className="twinkle-star" />
        <div className="twinkle-star" />
        <div className="twinkle-star" />
      </div>

      {/* ── Top bar ── */}
      <div className="home-top-bar" style={{
        position: 'fixed', top: 0, left: 240, right: 0, zIndex: 51,
        transition: 'transform 0.35s ease', background: 'transparent',
        transform: topBarHidden ? 'translateY(-100%)' : 'translateY(0)'
      }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 400, fontStyle: 'italic', fontSize: '1.4rem', letterSpacing: '-0.02em', color: 'white', textDecoration: 'none' }}>Vony</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Link to={createPageUrl("RecentActivity")} className="top-bar-link-home" style={{ padding: '7px 14px', borderRadius: 50, fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.7)', textDecoration: 'none', transition: 'color 0.15s' }}>Recent Activity</Link>
            <Link to={createPageUrl("LoanAgreements")} className="top-bar-link-home" style={{ padding: '7px 14px', borderRadius: 50, fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.7)', textDecoration: 'none', transition: 'color 0.15s' }}>Loan Documents</Link>
            {/* Notification bell */}
            <Link to={createPageUrl("Requests")} style={{ width: 32, height: 32, borderRadius: '50%', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginLeft: 4 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
              {pendingOffers.length > 0 && <span style={{ position: 'absolute', top: 0, right: 0, width: 7, height: 7, borderRadius: '50%', background: 'white', border: '1.5px solid rgba(249,248,246,1)' }} />}
            </Link>
            {/* Avatar */}
            <Link to={createPageUrl("Profile")} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 4, textDecoration: 'none' }}>
              {avatarInitial}
            </Link>
          </div>
        </div>
      </div>

      {/* ── Hero ── */}
      <div style={{ background: 'transparent', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '160px 28px 56px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', textAlign: 'center' }}>
          <div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '3.8rem', fontWeight: 600, color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {greeting}, <em style={{ fontStyle: 'italic', fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{firstName}</em>
            </h1>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', marginTop: 14, fontWeight: 400, letterSpacing: '-0.01em' }}>
              Here's how your loans are looking today
            </p>
          </div>
        </div>

        {/* Hero alert (overdue) — carousel if multiple */}
        {overdueReminders.length > 0 && (
          <div className="glass-hero-alert" style={{ maxWidth: 1080, margin: '0 auto', overflow: 'hidden', position: 'relative' }}>
            <div style={{ display: 'flex', transition: 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)', transform: `translateX(-${alertSlide * 100}%)` }}>
              {overdueReminders.map((item, i) => (
                <div key={i} style={{ minWidth: '100%', padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#E8726E', flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 13, color: '#787776', lineHeight: 1.5 }}>
                    <strong style={{ color: '#1A1918', fontWeight: 600 }}>Just a reminder</strong> you have a {formatMoney(item.amount)} payment to @{item.username} that was due {item.days} day{item.days !== 1 ? 's' : ''} ago. If you've already paid, make sure to record the payment so it's up to date.
                  </div>
                  <Link to={createPageUrl("RecordPayment")} style={{
                    padding: '7px 18px', borderRadius: 20, background: '#678AFB', color: 'white',
                    fontSize: 12, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap',
                    fontFamily: "'DM Sans', sans-serif", transition: 'background 0.15s'
                  }}>Record Payment</Link>
                </div>
              ))}
            </div>
            {alertTotal > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, paddingBottom: 10 }}>
                {overdueReminders.map((_, i) => (
                  <button key={i} onClick={() => setAlertSlide(i)} style={{
                    width: i === alertSlide ? 18 : 6, height: 6, borderRadius: i === alertSlide ? 8 : '50%',
                    background: i === alertSlide ? '#678AFB' : 'rgba(0,0,0,0.12)',
                    border: 'none', padding: 0, cursor: 'pointer',
                    transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
                  }} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Main page content ── */}
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 28px 64px', position: 'relative', zIndex: 1 }}>

        {/* Top row grid: quick actions + snapshot cards */}
        <div style={{ marginTop: 36 }}>
          <div className="home-top-row" style={{ display: 'grid', gridTemplateColumns: '0.75fr 1fr 1fr', columnGap: 16, rowGap: 16, alignItems: 'start' }}>

            {/* Left column: Quick Actions + Next Repayment + Monthly Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, gridRow: '1 / 5' }}>
              {/* Quick Actions */}
              <div className="glass-quick-actions" style={{ position: 'relative', background: 'transparent', border: 'none', borderRadius: 16, display: 'flex', flexDirection: 'column', padding: 6, gap: 2 }}>
                <Link to={createPageUrl("Lending")} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, textDecoration: 'none', color: '#0D0D0C', transition: 'background 0.15s' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5C5B5A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Lending</div>
                </Link>
                <Link to={createPageUrl("LoanAgreements")} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, textDecoration: 'none', color: '#0D0D0C', transition: 'background 0.15s' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5C5B5A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Documents</div>
                </Link>
                <Link to={createPageUrl("Friends")} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, textDecoration: 'none', color: '#0D0D0C', transition: 'background 0.15s' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5C5B5A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Friends</div>
                </Link>
                <Link to={createPageUrl("RecentActivity")} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, textDecoration: 'none', color: '#0D0D0C', transition: 'background 0.15s' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5C5B5A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Recent Activity</div>
                </Link>
              </div>

              {/* Next Repayment card */}
              <div className="glass-card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '22px 26px 0' }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#0D0D0C', letterSpacing: '-0.02em', fontFamily: "'DM Sans', sans-serif" }}>Next repayment</div>
                </div>
                <div style={{ padding: '14px 26px 18px' }}>
                  {nextBorrowerPayment ? (
                    <>
                      <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1A1918', letterSpacing: '-0.02em', lineHeight: 1 }}>
                        {format(nextBorrowerPayment.date, 'MMM d')}
                      </div>
                      <div style={{ fontSize: 12, color: '#787776', marginTop: 6 }}>
                        You owe @{nextBorrowerPayment.username} {formatMoney(nextBorrowerPayment.payment_amount || 0)}
                      </div>
                      {overdueYouOwe.length > 0 && (
                        <div style={{ fontSize: 11, color: '#E8726E', marginTop: 10 }}>
                          &amp; {overdueYouOwe.length} overdue repayment{overdueYouOwe.length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ fontSize: 13, color: '#787776' }}>No upcoming repayments</div>
                  )}
                </div>
              </div>

              {/* Monthly stats card */}
              <div className="glass-card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '22px 26px 0' }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#0D0D0C', letterSpacing: '-0.02em', fontFamily: "'DM Sans', sans-serif" }}>How {format(today, 'MMMM')} is going</div>
                </div>
                <div style={{ padding: '14px 26px 20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                    <div style={{ textAlign: 'center', padding: '0 12px' }}>
                      <div style={{ fontSize: 11, color: '#787776', marginBottom: 4 }}>Received</div>
                      <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: '#678AFB' }}>{formatMoney(monthlyReceived)}</div>
                      <div style={{ width: '100%', height: 4, borderRadius: 2, marginTop: 8, background: 'rgba(103,138,251,0.15)' }}>
                        <div style={{ height: '100%', borderRadius: 2, background: '#678AFB', width: `${monthlyExpectedReceive > 0 ? Math.min((monthlyReceived / monthlyExpectedReceive) * 100, 100) : 0}%`, transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                      </div>
                      <div style={{ fontSize: 10, color: '#787776', marginTop: 4 }}>{formatMoney(monthlyReceived)} of {formatMoney(monthlyExpectedReceive)} received</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '0 12px' }}>
                      <div style={{ fontSize: 11, color: '#787776', marginBottom: 4 }}>Paid out</div>
                      <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: '#A79DEA' }}>{formatMoney(monthlyPaidOut)}</div>
                      <div style={{ width: '100%', height: 4, borderRadius: 2, marginTop: 8, background: 'rgba(167,157,234,0.15)' }}>
                        <div style={{ height: '100%', borderRadius: 2, background: '#A79DEA', width: `${monthlyExpectedPay > 0 ? Math.min((monthlyPaidOut / monthlyExpectedPay) * 100, 100) : 0}%`, transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                      </div>
                      <div style={{ fontSize: 10, color: '#787776', marginTop: 4 }}>{formatMoney(monthlyPaidOut)} of {formatMoney(monthlyExpectedPay)} paid out</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle column: Lending snapshot */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="glass-card" style={{ padding: '20px 22px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#0D0D0C', fontFamily: "'DM Sans', sans-serif" }}>You've lent</div>
                  <Link to={createPageUrl("Lending")} style={{ fontSize: 11, fontWeight: 500, color: '#A79DEA', textDecoration: 'none' }}>Details</Link>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 4 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#1A1918', lineHeight: 1, marginBottom: 2 }}>{formatMoney(totalLentAmount)}</div>
                    <div style={{ fontSize: 11, color: '#787776', marginBottom: 12 }}>across all loans</div>
                    {lentLoans.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        {lentOnTrack > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: 'rgba(103,138,251,0.15)', color: '#678AFB' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#678AFB' }} />{lentOnTrack} on track</span>}
                        {overdueFromBorrowers > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: 'rgba(232,114,110,0.12)', color: '#E8726E', marginLeft: lentOnTrack > 0 ? 8 : 0 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E8726E' }} />{overdueFromBorrowers} late</span>}
                      </div>
                    )}
                  </div>
                  <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
                    <svg viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)', width: 72, height: 72 }}>
                      <circle cx="36" cy="36" r="29" fill="none" stroke="rgba(103,138,251,0.15)" strokeWidth="7" />
                      <circle cx="36" cy="36" r="29" fill="none" stroke="#678AFB" strokeWidth="7" strokeLinecap="round" strokeDasharray={PIE_C} strokeDashoffset={lentPieOffset} style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#292827', letterSpacing: '-0.03em' }}>{percentRepaid}%</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column: Borrowing snapshot */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="glass-card" style={{ padding: '20px 22px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#0D0D0C', fontFamily: "'DM Sans', sans-serif" }}>You've borrowed</div>
                  <Link to={createPageUrl("Borrowing")} style={{ fontSize: 11, fontWeight: 500, color: '#A79DEA', textDecoration: 'none' }}>Details</Link>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 4 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#1A1918', lineHeight: 1, marginBottom: 2 }}>{formatMoney(totalBorrowedAmount)}</div>
                    <div style={{ fontSize: 11, color: '#787776', marginBottom: 12 }}>across all loans</div>
                    {borrowedLoans.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        {borrowingOnTrack > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: 'rgba(103,138,251,0.15)', color: '#678AFB' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#678AFB' }} />{borrowingOnTrack} on track</span>}
                        {borrowingOverdue > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: 'rgba(232,114,110,0.12)', color: '#E8726E', marginLeft: borrowingOnTrack > 0 ? 8 : 0 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E8726E' }} />{borrowingOverdue} late</span>}
                      </div>
                    )}
                  </div>
                  <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
                    <svg viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)', width: 72, height: 72 }}>
                      <circle cx="36" cy="36" r="29" fill="none" stroke="rgba(167,157,234,0.15)" strokeWidth="7" />
                      <circle cx="36" cy="36" r="29" fill="none" stroke="#A79DEA" strokeWidth="7" strokeLinecap="round" strokeDasharray={PIE_C} strokeDashoffset={borrowedPieOffset} style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#292827', letterSpacing: '-0.03em' }}>{percentPaid}%</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming Payments */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="glass-card" style={{ overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 26px 0' }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#0D0D0C', letterSpacing: '-0.02em', fontFamily: "'DM Sans', sans-serif" }}>Upcoming payments</div>
                  <Link to={createPageUrl("Borrowing")} style={{ fontSize: 12, fontWeight: 500, color: '#A79DEA', textDecoration: 'none' }}>Full schedule</Link>
                </div>
                <div style={{ padding: '18px 26px 26px' }}>
                  {combinedPaymentEvents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: '#787776', fontSize: 13 }}>No upcoming payments</div>
                  ) : (
                    <div>
                      {combinedPaymentEvents.slice(0, 4).map((event, idx) => {
                        const isOverdue = event.days < 0;
                        return (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: idx < combinedPaymentEvents.slice(0, 4).length - 1 ? 'none' : 'none' }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: isOverdue ? '#E8726E' : '#787776', minWidth: 44, flexShrink: 0 }}>
                              {isOverdue ? `${Math.abs(event.days)}d late` : format(event.date, 'MMM d')}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1918' }}>
                                {event.isLender ? `@${event.username} pays you` : `Pay @${event.username}`}
                              </div>
                              {event.purpose && <div style={{ fontSize: 11, color: '#787776', marginTop: 1 }}>{event.purpose}</div>}
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 600, flexShrink: 0, color: event.isLender ? '#678AFB' : '#1A1918' }}>
                              {event.isLender ? '+' : '-'}{formatMoney(event.remainingAmount)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Loans Over Time chart */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="glass-card" style={{ overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 26px 0' }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#0D0D0C', letterSpacing: '-0.02em', fontFamily: "'DM Sans', sans-serif" }}>Loans over time</div>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#A79DEA' }}>6 months</span>
                </div>
                <div style={{ padding: '18px 26px 26px' }}>
                  {chartData ? (() => {
                    const { data, maxVal } = chartData;
                    const chartHeight = 110;
                    const formatYLabel = (v) => v >= 1000 ? `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `$${Math.round(v)}`;
                    return (
                      <>
                        <div style={{ display: 'flex', gap: 12 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: chartHeight }}>
                            <span style={{ fontSize: 10, color: '#787776', textAlign: 'right', minWidth: 24 }}>{formatYLabel(maxVal)}</span>
                            <span style={{ fontSize: 10, color: '#787776', textAlign: 'right', minWidth: 24 }}>{formatYLabel(maxVal / 2)}</span>
                            <span style={{ fontSize: 10, color: '#787776', textAlign: 'right', minWidth: 24 }}>$0</span>
                          </div>
                          <div style={{ flex: 1, position: 'relative' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: chartHeight, position: 'relative', zIndex: 1 }}>
                              {data.map((d, i) => {
                                const owedH = maxVal > 0 ? (d.owedToYou / maxVal) * chartHeight : 0;
                                const oweH = maxVal > 0 ? (d.youOwe / maxVal) * chartHeight : 0;
                                return (
                                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: chartHeight }}>
                                      <div style={{ width: 14, borderRadius: '4px 4px 0 0', height: Math.max(owedH, owedH > 0 ? 2 : 0), background: '#678AFB', opacity: d.isFuture ? 0.45 : 1, transition: 'height 0.3s' }} />
                                      <div style={{ width: 14, borderRadius: '4px 4px 0 0', height: Math.max(oweH, oweH > 0 ? 2 : 0), background: '#A79DEA', opacity: d.isFuture ? 0.45 : 1, transition: 'height 0.3s' }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 10, paddingLeft: 36 }}>
                          {data.map((d, i) => (
                            <span key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, fontWeight: d.isCurrent ? 600 : 500, color: d.isCurrent ? '#A79DEA' : '#787776' }}>{d.label}</span>
                          ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 14, paddingTop: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: '#787776' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#678AFB' }} /> Owed to you</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: '#787776' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#A79DEA' }} /> You owe</div>
                        </div>
                      </>
                    );
                  })() : (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: '#787776', fontSize: 13 }}>No loan data yet</div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── Loans + Recent Payments grid ── */}
        <div style={{ marginTop: 16 }}>
          <div className="home-loans-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
            {/* Your Loans */}
            <div className="glass-card" style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0, padding: '20px 26px 0' }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#0D0D0C', letterSpacing: '-0.02em', fontFamily: "'DM Sans', sans-serif" }}>Your loans</div>
                <Link to={createPageUrl("Lending")} style={{ fontSize: 12, fontWeight: 500, color: '#A79DEA', textDecoration: 'none' }}>Manage</Link>
              </div>
              {myLoans.filter(l => l && l.status === 'active').length === 0 ? (
                <div style={{ padding: '20px 26px', textAlign: 'center', color: '#787776', fontSize: 13 }}>No active loans</div>
              ) : (
                myLoans.filter(l => l && l.status === 'active').slice(0, 4).map((loan, idx) => {
                  const isLender = loan.lender_id === user.id;
                  const otherUserId = isLender ? loan.borrower_id : loan.lender_id;
                  const otherProfile = safeAllProfiles.find(p => p.user_id === otherUserId);
                  const totalAmt = loan.total_amount || loan.amount || 0;
                  const amountPaid = loan.amount_paid || 0;
                  const remaining = totalAmt - amountPaid;
                  const pct = totalAmt > 0 ? Math.round((amountPaid / totalAmt) * 100) : 0;
                  return (
                    <div key={loan.id} style={{ padding: '13px 26px', display: 'flex', alignItems: 'flex-start', gap: 16, paddingTop: idx === 0 ? 18 : 13 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1918', marginBottom: 8 }}>
                          {isLender ? `You lent @${otherProfile?.username || 'user'} ${formatMoney(totalAmt)}` : `@${otherProfile?.username || 'user'} lent you ${formatMoney(totalAmt)}`}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ flex: 1, height: 6, borderRadius: 3, overflow: 'hidden', background: isLender ? 'rgba(103,138,251,0.15)' : 'rgba(167,157,234,0.15)' }}>
                            <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: isLender ? '#678AFB' : '#A79DEA' }} />
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 500, color: '#787776', flexShrink: 0 }}>{formatMoney(amountPaid)} repaid &amp; {formatMoney(remaining)} remaining</div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Recent Payments */}
            <div className="glass-card" style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 26px 0' }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#0D0D0C', letterSpacing: '-0.02em', fontFamily: "'DM Sans', sans-serif" }}>Recent payments</div>
                <Link to={createPageUrl("RecentActivity")} style={{ fontSize: 12, fontWeight: 500, color: '#A79DEA', textDecoration: 'none' }}>View all</Link>
              </div>
              <div style={{ padding: '18px 26px 26px' }}>
                {recentActivity.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: '#787776', fontSize: 13 }}>No recent payments</div>
                ) : (
                  recentActivity.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0', paddingTop: idx === 0 ? 0 : 13, paddingBottom: idx === recentActivity.length - 1 ? 0 : 13 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: item.isIncoming ? 'rgba(103,138,251,0.15)' : 'rgba(167,157,234,0.15)' }}>
                        {item.isIncoming ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#678AFB" strokeWidth="2" strokeLinecap="round"><polyline points="17 11 12 6 7 11"></polyline><line x1="12" y1="6" x2="12" y2="18"></line></svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A79DEA" strokeWidth="2" strokeLinecap="round"><polyline points="7 13 12 18 17 13"></polyline><line x1="12" y1="18" x2="12" y2="6"></line></svg>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1918' }}>{item.description}</div>
                        <div style={{ fontSize: 11, color: '#787776', marginTop: 2 }}>{item.detail}</div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, flexShrink: 0, color: item.isIncoming ? '#678AFB' : '#1A1918' }}>{item.amount}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Carousel ── */}
        <LoanCarousel notifications={carouselNotifications} />

      </div>

      {/* ── Footer ── */}
      <div style={{ background: 'transparent', marginTop: 36, position: 'relative', zIndex: 1 }}>
        <div className="home-footer-grid" style={{ maxWidth: 1080, margin: '0 auto', padding: '52px 28px', display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: 40 }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 400, fontStyle: 'italic', fontSize: '1.4rem', color: '#1A1918', marginBottom: 10 }}>Vony</div>
            <div style={{ fontSize: 12, color: '#5C5B5A', lineHeight: 1.5, marginBottom: 20 }}>Lending between friends, without the weird part.</div>
            <button onClick={() => {
              if (navigator.share) { navigator.share({ title: 'Join me on Vony', text: 'Lending made simple — join me on Vony!', url: 'https://lend-with-vony.com' }); }
              else { navigator.clipboard.writeText('https://lend-with-vony.com'); }
            }} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 20,
              background: '#678AFB', color: 'white', fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
              border: 'none', cursor: 'pointer', transition: 'background 0.15s', textDecoration: 'none'
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
              Invite Friends
            </button>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1918', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Product</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 13, color: '#3D3C3B' }}>How it works</span>
              <span style={{ fontSize: 13, color: '#3D3C3B' }}>FAQ</span>
              <span style={{ fontSize: 13, color: '#3D3C3B' }}>Learn</span>
              <span style={{ fontSize: 13, color: '#3D3C3B' }}>Financial products</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1918', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Company</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 13, color: '#3D3C3B' }}>About</span>
              <span style={{ fontSize: 13, color: '#3D3C3B' }}>Blog</span>
              <span style={{ fontSize: 13, color: '#3D3C3B' }}>Careers</span>
              <span style={{ fontSize: 13, color: '#3D3C3B' }}>Contact</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1918', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Legal</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 13, color: '#3D3C3B' }}>Terms of Service</span>
              <span style={{ fontSize: 13, color: '#3D3C3B' }}>Privacy Policy</span>
              <span style={{ fontSize: 13, color: '#3D3C3B' }}>Cookie Policy</span>
              <span style={{ fontSize: 13, color: '#3D3C3B' }}>Licenses</span>
            </div>
          </div>
        </div>
        <div className="home-footer-bottom" style={{ maxWidth: 1080, margin: '0 auto', padding: '20px 28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #EBEBEA' }}>
          <div style={{ fontSize: 11, color: '#5C5B5A' }}>2026 Vony, Inc. All rights reserved.</div>
          <div style={{ fontSize: 11, color: '#5C5B5A', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#C7C6C4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
            English (US)
          </div>
        </div>
      </div>

    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loan, Payment, PublicProfile, Friendship } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";


import { motion, AnimatePresence } from "framer-motion";
import { format, startOfMonth, endOfMonth, addMonths, addDays, isBefore, isAfter, isSameDay, differenceInDays } from "date-fns";
import { formatMoney } from "@/components/utils/formatMoney";
import { toLocalDate, getLocalToday, daysUntil as daysUntilDate } from "@/components/utils/dateUtils";

import DashboardSidebar from "@/components/DashboardSidebar";
import { CardEntrance, CountUp } from "@/components/ui/animations";

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
    const defaultAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent((userData.full_name || 'User').charAt(0))}&background=678AFB&color=fff&size=128`;
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

function WeekStrip({ allPaymentEvents, today, formatMoney }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const touchStartX = useRef(null);

  const weekStart = addDays(today, weekOffset * 7);
  const strip = [];
  for (let i = 0; i < 7; i++) strip.push(addDays(weekStart, i));

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 40) {
      setWeekOffset(prev => diff > 0 ? prev - 1 : prev + 1);
    }
    touchStartX.current = null;
  };

  const showingCurrentWeek = weekOffset === 0;
  const monthLabel = format(strip[0], 'MMM yyyy') === format(strip[6], 'MMM yyyy')
    ? format(strip[0], 'MMMM yyyy')
    : `${format(strip[0], 'MMM')} – ${format(strip[6], 'MMM yyyy')}`;

  return (
    <div className="glass-card" style={{ overflow: 'hidden', userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 0' }}>
        <button onClick={() => setWeekOffset(w => w - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#787776', display: 'flex', alignItems: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#0D0D0C', letterSpacing: '-0.01em' }}>
          {monthLabel}
          {!showingCurrentWeek && (
            <button onClick={() => setWeekOffset(0)} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: '#82F0B9', fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>Today</button>
          )}
        </div>
        <button onClick={() => setWeekOffset(w => w + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#787776', display: 'flex', alignItems: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>
      <div
        style={{ padding: '8px 16px 0' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0 }}>
          {strip.map((day, i) => {
            const isToday = isSameDay(day, new Date());
            const dayPayments = allPaymentEvents.filter(e => isSameDay(e.date, day));
            const hasPayment = dayPayments.length > 0;
            const totalAmt = dayPayments.reduce((s, e) => s + e.remainingAmount, 0);
            const isIncoming = dayPayments.length > 0 && dayPayments.every(e => e.isLender);
            const isOutgoing = dayPayments.length > 0 && dayPayments.every(e => !e.isLender);
            const dotColor = isIncoming ? '#82F0B9' : isOutgoing ? '#2563EB' : '#82F0B9';
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '2px 0', borderLeft: i > 0 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                <div style={{ fontSize: 9, fontWeight: 500, color: isToday ? '#E8726E' : '#787776' }}>
                  {isToday ? 'Today' : format(day, 'EEE')}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: isToday ? '#E8726E' : '#1A1918', lineHeight: 1.2 }}>
                  {format(day, 'd')}
                </div>
                {hasPayment ? (
                  <div style={{ fontSize: 9, fontWeight: 600, color: dotColor, background: `${dotColor}10`, padding: '1px 5px', borderRadius: 3, marginTop: 1 }}>
                    {formatMoney(totalAmt)}
                  </div>
                ) : (
                  <div style={{ height: 15 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 14, padding: '6px 16px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, color: '#787776' }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: '#82F0B9' }} /> Owed to you</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, color: '#787776' }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563EB' }} /> You owe</div>
      </div>
    </div>
  );
}

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
  const loansChartRef = useRef(null);
  const activeLoansRef = useRef(null);
  const [loansAnimKey, setLoansAnimKey] = useState(0);
  const [activeAnimKey, setActiveAnimKey] = useState(0);
  const loansWasOut = useRef(true);
  const activeWasOut = useRef(true);

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

  // Bar chart viewport tracking — only fires on out→in transitions to avoid
  // infinite loops (remounting bars changes container size, re-triggering observer).
  useEffect(() => {
    const el = loansChartRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && loansWasOut.current) {
        loansWasOut.current = false;
        setLoansAnimKey(k => k + 1);
      } else if (!e.isIntersecting) {
        loansWasOut.current = true;
      }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

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
      <div style={{ minHeight: '100vh', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '2px solid #82F0B9', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px' }} className="animate-spin" />
          <p style={{ fontSize: 14, color: '#787776', fontFamily: "'DM Sans', sans-serif" }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Not logged in state
  if (!user && !isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} style={{ maxWidth: 400, width: '100%' }}>
          <div className="glass-card" style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ width: 96, height: 96, margin: '0 auto 24px', borderRadius: '50%', overflow: 'hidden', background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/e492d87a7_Logo.png" alt="Vony Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1A1918', marginBottom: 8, letterSpacing: '-0.02em', fontFamily: "'DM Sans', sans-serif" }}>
              Welcome to <span style={{ color: '#82F0B9' }}>Vony</span>
            </h1>
            <p style={{ color: '#787776', marginBottom: 24, fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>
              Lending money to friends made simple.
            </p>
            <button onClick={handleLogin} disabled={isAuthenticating} style={{
              width: '100%', padding: '12px 24px', fontSize: 16, fontWeight: 600,
              background: isAuthenticating ? 'rgba(3,172,234,0.5)' : 'linear-gradient(135deg, #03ACEA 0%, #7C3AED 100%)',
              color: 'white', border: 'none', borderRadius: 12,
              cursor: isAuthenticating ? 'not-allowed' : 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: isAuthenticating ? 'none' : '0 4px 16px rgba(3,172,234,0.3)',
              transition: 'opacity 0.15s, transform 0.15s',
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

  // Next payment (borrower)
  const nextBorrowerPayment = myLoans
    .filter(loan => loan && loan.borrower_id === user.id && loan.status === 'active' && loan.next_payment_date)
    .map(loan => {
      const otherUser = safeAllProfiles.find(p => p.user_id === loan.lender_id);
      return { ...loan, date: new Date(loan.next_payment_date), username: otherUser?.username || 'user', firstName: otherUser?.full_name?.split(' ')[0] || otherUser?.username || 'user' };
    })
    .sort((a, b) => a.date - b.date)[0];

  const nextLenderPayment = myLoans
    .filter(loan => loan && loan.lender_id === user.id && loan.status === 'active' && loan.next_payment_date)
    .map(loan => {
      const otherUser = safeAllProfiles.find(p => p.user_id === loan.borrower_id);
      return { ...loan, date: new Date(loan.next_payment_date), username: otherUser?.username || 'user', firstName: otherUser?.full_name?.split(' ')[0] || otherUser?.username || 'user' };
    })
    .sort((a, b) => a.date - b.date)[0];

  // Friends & loans booleans
  const acceptedFriendships = friendships.filter(f => f && f.status === 'accepted');
  const hasFriends = acceptedFriendships.length > 0;
  const hasLoans = activeLoanCount > 0;
  const hasLendingLoans = lentLoans.length > 0;
  const hasBorrowingLoans = borrowedLoans.length > 0;

  // Inbox / notification count
  const myLoanIds = myLoans.map(l => l.id);
  const paymentsToConfirm = safePayments.filter(p =>
    p && p.status === 'pending_confirmation' && myLoanIds.includes(p.loan_id) && p.recorded_by !== user.id
  );
  const termChanges = safeLoans.filter(l =>
    l && myLoanIds.includes(l.id) && l.status === 'pending_borrower_approval' && l.borrower_id === user.id
  );
  const extensionRequests = safeLoans.filter(l =>
    l && myLoanIds.includes(l.id) && l.extension_requested && l.extension_requested_by !== user.id
  );
  const friendRequestsInbox = friendships.filter(f => f && f.friend_id === user.id && f.status === 'pending');
  const notifCount = paymentsToConfirm.length + termChanges.length + extensionRequests.length + pendingOffers.length + friendRequestsInbox.length;

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
      return { loan, date: nextPayDate, days, originalAmount, remainingAmount, username: otherProfile?.username || 'user', firstName: otherProfile?.full_name?.split(' ')[0] || otherProfile?.username || 'user', isLender, loanId: loan.id, purpose: loan.purpose || '', profilePic: otherProfile?.profile_picture_url || null, initial: (otherProfile?.full_name || 'U').charAt(0).toUpperCase() };
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
          const monthsDiff = (monthDate.getFullYear() - curMonth.getFullYear()) * 12 + (monthDate.getMonth() - curMonth.getMonth());
          const freq = loan.payment_frequency || 'monthly';
          const paymentsPerMonth = freq === 'weekly' ? 4 : freq === 'bi-weekly' ? 2 : 1;
          const expectedPaid = monthsDiff * (loan.payment_amount || 0) * paymentsPerMonth;
          const predicted = Math.max(0, currentRemaining - expectedPaid);
          if (isLender) owedToYou += predicted; else youOwe += predicted;
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

    // Loan events
    myLoans.forEach(loan => {
      if (!loan || !loan.created_at) return;
      const isLender = loan.lender_id === user.id;
      const otherUserId = isLender ? loan.borrower_id : loan.lender_id;
      const otherProfile = safeAllProfiles.find(pr => pr.user_id === otherUserId);
      const name = otherProfile?.full_name?.split(' ')[0] || otherProfile?.username || 'user';
      const amount = `$${(loan.amount || 0).toLocaleString()}`;
      let description = '';
      let icon = 'loan';
      let color = '#7EC0EA';

      if (loan.status === 'pending' || !loan.status) {
        description = isLender ? `Sent ${amount} loan offer to ${name}` : `Received ${amount} loan offer from ${name}`;
        icon = isLender ? 'send' : 'receive';
        color = isLender ? '#B0F1FF' : '#7EC0EA';
      } else if (loan.status === 'active') {
        description = isLender ? `${name} accepted your ${amount} loan` : `You accepted ${amount} loan from ${name}`;
        icon = 'check'; color = '#7EC0EA';
      } else if (loan.status === 'declined') {
        description = isLender ? `${name} declined your ${amount} loan` : `You declined ${amount} loan from ${name}`;
        icon = 'x'; color = '#E8726E';
      } else if (loan.status === 'cancelled') {
        description = isLender ? `You cancelled ${amount} loan offer to ${name}` : `${name} cancelled their ${amount} loan offer`;
        icon = 'x'; color = '#E8726E';
      } else if (loan.status === 'completed') {
        description = isLender ? `${name} fully repaid your ${amount} loan` : `You fully repaid ${amount} loan to ${name}`;
        icon = 'check'; color = '#7EC0EA';
      } else {
        description = isLender ? `${amount} loan to ${name}` : `${amount} loan from ${name}`;
      }

      items.push({
        type: 'loan', date: new Date(loan.created_at), description,
        detail: format(new Date(loan.created_at), 'MMM d'),
        icon, color, amount: null
      });
    });

    // Payment events
    safePayments.filter(p => p && myLoans.some(l => l.id === p.loan_id)).forEach(p => {
      const loan = myLoans.find(l => l.id === p.loan_id);
      if (!loan) return;
      const isBorrower = loan.borrower_id === user.id;
      const otherUserId = isBorrower ? loan.lender_id : loan.borrower_id;
      const otherProfile = safeAllProfiles.find(pr => pr.user_id === otherUserId);
      const amount = `$${(p.amount || 0).toLocaleString()}`;
      const name = otherProfile?.full_name?.split(' ')[0] || otherProfile?.username || 'user';
      items.push({
        type: 'payment', date: new Date(p.payment_date || p.created_at),
        description: isBorrower ? `You made a ${amount} payment to ${name}` : `Received ${amount} payment from ${name}`,
        detail: format(new Date(p.payment_date || p.created_at), 'MMM d'),
        icon: isBorrower ? 'send' : 'receive',
        color: isBorrower ? '#B0F1FF' : '#7EC0EA',
        amount: isBorrower ? `-${amount}` : `+${amount}`
      });
    });

    return items.sort((a, b) => b.date - a.date).slice(0, 5);
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
      const bName = borrowerProfile?.full_name?.split(' ')[0] || borrowerProfile?.username || 'user';
      if (days >= 0 && days <= 7) {
        notifs.push({
          title: `${bName}'s next payment is coming up`,
          description: `We've sent both of you a reminder. Make sure to record the payment when it's made.`
        });
      }
    });

    // Overdue payments you owe
    overdueYouOwe.forEach(loan => {
      const lenderProfile = safeAllProfiles.find(p => p.user_id === loan.lender_id);
      const lName = lenderProfile?.full_name?.split(' ')[0] || lenderProfile?.username || 'user';
      const days = Math.abs(daysUntilDate(loan.next_payment_date));
      notifs.push({
        title: `You have a payment to ${lName} that is overdue`,
        description: `If you've already paid, make sure to record the payment so it's up to date.`,
        action: { label: 'Record Payment', onClick: () => { window.location.href = createPageUrl("RecordPayment"); } }
      });
    });

    // Overdue from borrowers
    myLoans.filter(l => l && l.lender_id === user.id && l.status === 'active' && l.next_payment_date && new Date(l.next_payment_date) < today).forEach(loan => {
      const borrowerProfile = safeAllProfiles.find(p => p.user_id === loan.borrower_id);
      const bName = borrowerProfile?.full_name?.split(' ')[0] || borrowerProfile?.username || 'user';
      const days = Math.abs(daysUntilDate(loan.next_payment_date));
      notifs.push({
        title: `${bName}'s payment is overdue`,
        description: `If they've already paid, make sure to record it so your dashboard stays up to date.`,
        action: { label: 'Record Payment', onClick: () => { window.location.href = createPageUrl("RecordPayment"); } }
      });
    });

    // Fallback slides
    if (hasBorrowingLoans) {
      notifs.push({
        title: 'Stay on top of your loans',
        description: 'Check in on your payment progress and keep track of upcoming due dates.',
        action: { label: 'Track Progress', onClick: () => window.location.href = createPageUrl("YourLoans") }
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
    return { loan, days, username: lenderProfile?.username || 'user', firstName: lenderProfile?.full_name?.split(' ')[0] || lenderProfile?.username || 'user', amount: loan.payment_amount || 0 };
  }).sort((a, b) => b.days - a.days);

  const alertTotal = overdueReminders.length;
  overdueCountRef.current = alertTotal;

  const SHADOW = '0px 50px 40px rgba(0,0,0,0.02), 0px 50px 40px rgba(0,0,0,0.04), 0px 20px 40px rgba(0,0,0,0.08), 0px 3px 10px rgba(0,0,0,0.12)';
  const DashboardCard = ({ title, headerRight, children, style, highlight }) => {
    const outerBg = highlight ? '#54A6CF' : '#F4F4F5';
    const titleColor = highlight ? 'rgba(255,255,255,0.85)' : '#9B9A98';
    return (
      <div style={{ background: outerBg, borderRadius: 14, overflow: 'hidden', boxShadow: SHADOW, ...style }}>
        <div style={{ padding: '6px 14px 5px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: titleColor, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>{title}</span>
          {headerRight && <div style={{ flexShrink: 0 }}>{headerRight}</div>}
        </div>
        <div style={{ background: '#ffffff', margin: '0 5px 5px', borderRadius: 10, overflow: 'hidden' }}>
          {children}
        </div>
      </div>
    );
  };

  return (
    <div className="home-with-sidebar" style={{ minHeight: '100vh', fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif", fontSize: 14, lineHeight: 1.5, color: '#1A1918', WebkitFontSmoothing: 'antialiased', paddingTop: 0, background: 'transparent' }}>

      <DashboardSidebar activePage="Dashboard" user={user} />

      {/* ── Hero banner ── */}
      <div style={{
        margin: '8px 10px 0',
        height: 168,
        background: '#54A6CF',
        borderRadius: 18,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: 24,
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0px 50px 40px rgba(0,0,0,0.01), 0px 50px 40px rgba(0,0,0,0.02), 0px 20px 40px rgba(0,0,0,0.05), 0px 3px 10px rgba(0,0,0,0.08)',
      }}>
        {/* Paper texture overlay */}
        {/* Subtle star field */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15, pointerEvents: 'none', zIndex: 0 }} viewBox="0 0 1200 168" preserveAspectRatio="xMidYMid slice">
          {[{cx:80,cy:40},{cx:200,cy:110},{cx:320,cy:25},{cx:430,cy:160},{cx:540,cy:70},{cx:660,cy:130},{cx:770,cy:35},{cx:890,cy:175},{cx:1000,cy:80},{cx:1100,cy:140},{cx:150,cy:185},{cx:480,cy:100},{cx:720,cy:180},{cx:950,cy:55},{cx:280,cy:195},{cx:620,cy:48},{cx:1050,cy:195}].map((s, i) => (
            <circle key={i} cx={s.cx} cy={s.cy} r={i % 3 === 0 ? 2.5 : 1.5} fill="white" />
          ))}
        </svg>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 38, fontWeight: 600, color: '#1A1918',
          margin: 0, letterSpacing: '-0.01em', lineHeight: 1,
          textAlign: 'center', position: 'relative', zIndex: 1,
        }}>
          {firstName ? (
            <><span style={{ fontStyle: 'normal' }}>{greeting}, </span><span style={{ fontStyle: 'italic' }}>{firstName}</span></>
          ) : (
            <span style={{ fontStyle: 'italic' }}>{greeting}</span>
          )}
        </h1>
      </div>

      {/* ── Main page content ── */}
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '20px 40px 64px', position: 'relative', zIndex: 1 }}>

        {/* Top row grid: quick actions + snapshot cards */}
        <div style={{ marginTop: 0 }}>
          <div className="home-top-row" style={{ display: 'grid', gridTemplateColumns: '2fr 0.82fr', columnGap: 20, rowGap: 20, alignItems: 'start' }}>

            {/* LEFT SECTION: sub-grid for left two columns */}
            <div className="dash-left-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

            {/* Inbox — spans both sub-columns */}
            <div className="dash-inbox" style={{ gridColumn: '1 / 3' }}>
              <CardEntrance delay={0}>
              <DashboardCard title="Inbox" headerRight={notifCount > 0 ? <Link to={createPageUrl("Requests")} style={{ fontSize: 12, fontWeight: 500, color: '#9B9A98', textDecoration: 'none' }}>View all</Link> : null}>
                <div style={{ padding: '10px 16px 12px' }}>
                  {notifCount === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#C4EEFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="#03ACEA">
                          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                        </svg>
                      </div>
                      <span style={{ fontSize: 13, color: '#787776' }}>You're all caught up</span>
                    </div>
                  ) : (
                    <Link to={createPageUrl("Requests")} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#C4EEFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="#03ACEA">
                          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                        </svg>
                      </div>
                      <span style={{ fontSize: 13, color: '#1A1918', fontWeight: 500 }}>You have new notifications</span>
                    </Link>
                  )}
                </div>
              </DashboardCard>
              </CardEntrance>
            </div>

            {/* Next Payment Due + Incoming — paired row */}
            <div className="dash-next-pair" style={{ gridColumn: '1 / 3', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* Left sub-col: Next Payment Due */}
            <div className="glow-wrapper glow-blue">
            <DashboardCard title="Next payment due" highlight>
              <div style={{ padding: '16px 16px 20px', position: 'relative', display: 'flex', alignItems: 'center', minHeight: 48 }}>
                {nextBorrowerPayment ? (() => {
                  const days = Math.ceil((nextBorrowerPayment.date.getTime() - Date.now()) / 86400000);
                  const isLate = days < 0;
                  const label = isLate ? `${Math.abs(days)}d late` : days === 0 ? 'today' : `${days}d`;
                  return (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1A1918', letterSpacing: '-0.03em', lineHeight: 1, fontFamily: "'DM Sans', sans-serif" }}>
                          {format(nextBorrowerPayment.date, 'MMM d')}
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: isLate ? '#E8726E' : '#5C5B5A', background: isLate ? 'rgba(232,114,110,0.1)' : 'rgba(0,0,0,0.05)', borderRadius: 6, padding: '2px 7px', whiteSpace: 'nowrap' }}>
                          {label}
                        </span>
                      </div>
                      <div style={{ position: 'absolute', bottom: 6, right: 16, fontSize: 12, color: '#9B9A98' }}>
                        {formatMoney(nextBorrowerPayment.payment_amount || 0)} to {nextBorrowerPayment.firstName}
                      </div>
                    </>
                  );
                })() : (
                  <div>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>🎉</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1918' }}>Nothing due right now</div>
                  </div>
                )}
              </div>
            </DashboardCard>

            </div>{/* /glow-blue */}

            {/* Right sub-col: Next Payment Incoming (moved) */}
            <div className="glow-wrapper glow-purple">
            <DashboardCard title="Next payment incoming" highlight>
              <div style={{ padding: '16px 16px 20px', position: 'relative', display: 'flex', alignItems: 'center', minHeight: 48 }}>
                {nextLenderPayment ? (() => {
                  const days = Math.ceil((nextLenderPayment.date.getTime() - Date.now()) / 86400000);
                  const isLate = days < 0;
                  const label = isLate ? `${Math.abs(days)}d late` : days === 0 ? 'today' : `${days}d`;
                  return (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1A1918', letterSpacing: '-0.03em', lineHeight: 1, fontFamily: "'DM Sans', sans-serif" }}>
                          {format(nextLenderPayment.date, 'MMM d')}
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: isLate ? '#E8726E' : '#5C5B5A', background: isLate ? 'rgba(232,114,110,0.1)' : 'rgba(0,0,0,0.05)', borderRadius: 6, padding: '2px 7px', whiteSpace: 'nowrap' }}>
                          {label}
                        </span>
                      </div>
                      <div style={{ position: 'absolute', bottom: 6, right: 16, fontSize: 12, color: '#9B9A98' }}>
                        {formatMoney(nextLenderPayment.payment_amount || 0)} from {nextLenderPayment.firstName}
                      </div>
                    </>
                  );
                })() : (
                  <div>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>💸</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1918' }}>No payments heading your way</div>
                  </div>
                )}
              </div>
            </DashboardCard>
            </div>{/* /glow-purple */}

            </div>{/* /dash-next-pair */}

            {/* Left sub-col: Upcoming Payments (moved from right sub-col) */}
            <CardEntrance delay={0.05} className="dash-upcoming">
            <DashboardCard title="Upcoming payments" headerRight={<Link to={createPageUrl("YourLoans")} style={{ fontSize: 12, fontWeight: 500, color: '#9B9A98', textDecoration: 'none' }}>Full schedule</Link>}>
              <div style={{ padding: '12px 16px 16px', minHeight: 200 }}>
                {combinedPaymentEvents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>✨</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1918', marginBottom: 4 }}>You're all clear!</div>
                    <div style={{ fontSize: 12, color: '#787776' }}>No payments coming up.</div>
                  </div>
                ) : (
                  <div>
                    {combinedPaymentEvents.slice(0, 5).map((event, idx) => {
                      const isOverdue = event.days < 0;
                      const daysLabel = isOverdue ? `${Math.abs(event.days)}d late` : `${event.days}d`;
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
                          <div style={{ flexShrink: 0, width: 52, textAlign: 'center' }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: isOverdue ? '#E8726E' : '#5C5B5A', background: isOverdue ? 'rgba(232,114,110,0.1)' : 'rgba(0,0,0,0.05)', borderRadius: 6, padding: '2px 7px', whiteSpace: 'nowrap', letterSpacing: '0.02em' }}>
                              {daysLabel}
                            </span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {event.isLender
                                ? `${event.firstName} pays you`
                                : `Pay ${event.firstName}`}
                            </div>
                            <div style={{ fontSize: 11, color: '#9B9A98', marginTop: 1 }}>
                              {event.purpose ? `for ${event.purpose}` : format(event.date, 'MMM d')}
                            </div>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700, flexShrink: 0, color: event.isLender ? '#54A6CF' : '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif" }}>
                            {event.isLender ? '+' : '-'}{formatMoney(event.remainingAmount)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </DashboardCard>
            </CardEntrance>

            {/* Right sub-col: Loans Over Time (swapped from right main col) */}
            <CardEntrance delay={0.17} className="dash-loans-time">
            <DashboardCard title="Loans over time" headerRight={<span style={{ fontSize: 12, fontWeight: 500, color: '#787776' }}>6 months</span>}>
              <div ref={loansChartRef} style={{ padding: '12px 16px 16px' }}>
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
                                    <div key={`owed-${i}-${loansAnimKey}`} style={{ width: 14, borderRadius: '4px 4px 0 0', background: '#54A6CF', opacity: d.isFuture ? 0.45 : 1, height: Math.max(owedH, owedH > 0 ? 2 : 0), transformOrigin: 'bottom', animation: `barGrowUp 0.5s ease-out ${i * 0.05}s both` }} />
                                    <div key={`owe-${i}-${loansAnimKey}`} style={{ width: 14, borderRadius: '4px 4px 0 0', background: '#7EC0EA', opacity: d.isFuture ? 0.45 : 1, height: Math.max(oweH, oweH > 0 ? 2 : 0), transformOrigin: 'bottom', animation: `barGrowUp 0.5s ease-out ${i * 0.05 + 0.04}s both` }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 10, paddingLeft: 36 }}>
                        {data.map((d, i) => (
                          <span key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, fontWeight: d.isCurrent ? 600 : 500, color: d.isCurrent ? '#5C5B5A' : '#787776' }}>{d.label}</span>
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 14, paddingTop: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: '#787776' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#54A6CF' }} /> Owed to you</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: '#787776' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7EC0EA' }} /> You owe</div>
                      </div>
                    </>
                  );
                })() : (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>📊</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1918', marginBottom: 2 }}>No data yet</div>
                    <div style={{ fontSize: 11, color: '#787776' }}>Your loan history will appear here.</div>
                  </div>
                )}
              </div>
            </DashboardCard>
            </CardEntrance>

            {/* Your Active Loans — spans both sub-columns */}
            <motion.div
              className="dash-active-loans"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.19, ease: 'easeOut' }}
              style={{ gridColumn: '1 / 3' }}
            >
            <DashboardCard title="Your active loans" headerRight={<Link to={createPageUrl("YourLoans")} style={{ fontSize: 12, fontWeight: 500, color: '#9B9A98', textDecoration: 'none' }}>Manage</Link>}>
              {myLoans.filter(l => l && l.status === 'active').length === 0 ? (
                <div style={{ padding: '20px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>🤝</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1918', marginBottom: 2 }}>No active loans yet</div>
                  <div style={{ fontSize: 11, color: '#787776' }}>Create an offer to get started.</div>
                </div>
              ) : (
                <div ref={activeLoansRef} style={{ padding: '10px 16px 14px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {myLoans.filter(l => l && l.status === 'active').slice(0, 4).map((loan, idx) => {
                    const isLender = loan.lender_id === user.id;
                    const otherUserId = isLender ? loan.borrower_id : loan.lender_id;
                    const otherProfile = safeAllProfiles.find(p => p.user_id === otherUserId);
                    const totalAmt = loan.total_amount || loan.amount || 0;
                    const amountPaid = loan.amount_paid || 0;
                    const remaining = totalAmt - amountPaid;
                    const pct = totalAmt > 0 ? Math.round((amountPaid / totalAmt) * 100) : 0;
                    const firstName = otherProfile?.full_name?.split(' ')[0] || otherProfile?.username || 'user';
                    return (
                      <div key={loan.id}>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1918' }}>
                            {isLender ? `You lent ${firstName} ${formatMoney(totalAmt)}` : `${firstName} lent you ${formatMoney(totalAmt)}`}
                          </div>
                          <div style={{ fontSize: 12, color: '#787776', flexShrink: 0, marginLeft: 8 }}>{pct}%</div>
                        </div>
                        <div style={{ width: '100%', height: 8, borderRadius: 4, background: isLender ? 'rgba(84,166,207,0.18)' : 'rgba(126,192,234,0.22)', overflow: 'hidden' }}>
                          <div key={`active-${idx}-${activeAnimKey}`} style={{ height: '100%', borderRadius: 4, background: isLender ? '#54A6CF' : '#7EC0EA', width: `${pct}%`, transformOrigin: 'left', animation: `barGrowRight 0.8s ease-out ${idx * 0.1}s both` }} />
                        </div>
                        <div style={{ fontSize: 11, color: '#787776', marginTop: 6 }}>{formatMoney(amountPaid)} of {formatMoney(totalAmt)} {isLender ? 'repaid' : 'paid back'}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </DashboardCard>
            </motion.div>

            </div>{/* end LEFT SECTION sub-grid */}

            {/* Right column: Loan Progress + How [Month] is Going + Recent Activity */}
            <div className="dash-right-col" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Owed to You + You Owe — paired row */}
              <div className="dash-balance-pair" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Owed to You */}
              <CardEntrance delay={0.1}>
              <DashboardCard title="Owed to You">
                <div style={{ padding: '16px 16px 20px', position: 'relative', display: 'flex', alignItems: 'center', minHeight: 48 }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#54A6CF', letterSpacing: '-0.03em', lineHeight: 1, fontFamily: "'DM Sans', sans-serif" }}>{formatMoney(lentRemaining)}</div>
                  <div style={{ position: 'absolute', bottom: 6, right: 16, fontSize: 12, color: '#9B9A98' }}>between {lentLoans.length} loan{lentLoans.length !== 1 ? 's' : ''}</div>
                </div>
              </DashboardCard>
              </CardEntrance>

              {/* You Owe */}
              <CardEntrance delay={0.13}>
              <DashboardCard title="You Owe">
                <div style={{ padding: '16px 16px 20px', position: 'relative', display: 'flex', alignItems: 'center', minHeight: 48 }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1A1918', letterSpacing: '-0.03em', lineHeight: 1, fontFamily: "'DM Sans', sans-serif" }}>{formatMoney(borrowedRemaining)}</div>
                  <div style={{ position: 'absolute', bottom: 6, right: 16, fontSize: 12, color: '#9B9A98' }}>between {borrowedLoans.length} loan{borrowedLoans.length !== 1 ? 's' : ''}</div>
                </div>
              </DashboardCard>
              </CardEntrance>

              </div>{/* /dash-balance-pair */}

              {/* How [Month] is Going (swapped from left section) */}
              <CardEntrance delay={0.12} className="dash-how-month">
              <DashboardCard title={`How ${format(today, 'MMMM')} is going`}>
                <div style={{ padding: '10px 16px 14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                    <div style={{ textAlign: 'center', padding: '0 10px 0 0', borderRight: '1px solid rgba(0,0,0,0.06)' }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#9B9A98', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Received</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, color: '#54A6CF', fontFamily: "'DM Sans', sans-serif" }}>{formatMoney(monthlyReceived)}</div>
                      <div style={{ width: '100%', height: 4, borderRadius: 2, marginTop: 10, background: 'rgba(84,166,207,0.15)' }}>
                        <div style={{ height: '100%', borderRadius: 2, background: '#54A6CF', width: `${monthlyExpectedReceive > 0 ? Math.min((monthlyReceived / monthlyExpectedReceive) * 100, 100) : 0}%` }} />
                      </div>
                      <div style={{ fontSize: 10, color: '#9B9A98', marginTop: 5 }}>of {formatMoney(monthlyExpectedReceive)} expected</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '0 0 0 10px' }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#9B9A98', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Paid out</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, color: '#1A1918', fontFamily: "'DM Sans', sans-serif" }}>{formatMoney(monthlyPaidOut)}</div>
                      <div style={{ width: '100%', height: 4, borderRadius: 2, marginTop: 10, background: 'rgba(126,192,234,0.2)' }}>
                        <div style={{ height: '100%', borderRadius: 2, background: '#7EC0EA', width: `${monthlyExpectedPay > 0 ? Math.min((monthlyPaidOut / monthlyExpectedPay) * 100, 100) : 0}%` }} />
                      </div>
                      <div style={{ fontSize: 10, color: '#9B9A98', marginTop: 5 }}>of {formatMoney(monthlyExpectedPay)} expected</div>
                    </div>
                  </div>
                </div>
              </DashboardCard>
              </CardEntrance>

              {/* Recent Activity */}
              <CardEntrance delay={0.24} className="dash-recent">
              <DashboardCard title="Recent activity" headerRight={<Link to={createPageUrl("RecentActivity")} style={{ fontSize: 12, fontWeight: 500, color: '#9B9A98', textDecoration: 'none' }}>View all</Link>}>
                <div style={{ padding: '12px 16px 16px' }}>
                  {recentActivity.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <div style={{ fontSize: 28, marginBottom: 6 }}>✨</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1918', marginBottom: 2 }}>Fresh start!</div>
                      <div style={{ fontSize: 11, color: '#787776' }}>Nothing to report yet.</div>
                    </div>
                  ) : (
                    recentActivity.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0', paddingTop: idx === 0 ? 0 : 13, paddingBottom: idx === recentActivity.length - 1 ? 0 : 13 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: `${item.color}20` }}>
                          {item.icon === 'send' ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="2" strokeLinecap="round"><polyline points="7 13 12 18 17 13"></polyline><line x1="12" y1="18" x2="12" y2="6"></line></svg>
                          ) : item.icon === 'receive' ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="2" strokeLinecap="round"><polyline points="17 11 12 6 7 11"></polyline><line x1="12" y1="6" x2="12" y2="18"></line></svg>
                          ) : item.icon === 'check' ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1918' }}>{item.description}</div>
                          <div style={{ fontSize: 11, color: '#787776', marginTop: 2 }}>{item.detail}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </DashboardCard>
              </CardEntrance>
            </div>

          </div>
        </div>

      {/* ── Footer ── */}
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

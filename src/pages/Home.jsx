import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loan, Payment, PublicProfile, Friendship } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";


import { motion, AnimatePresence } from "framer-motion";
import { format, startOfMonth, endOfMonth, addMonths, addDays, isBefore, isAfter, isSameDay, differenceInDays } from "date-fns";
import { formatMoney } from "@/components/utils/formatMoney";
import { toLocalDate, getLocalToday, daysUntil as daysUntilDate } from "@/components/utils/dateUtils";

import { CardEntrance, CountUp } from "@/components/ui/animations";
import SidebarBottomSection from '../components/SidebarBottomSection';
import MeshMobileNav from "@/components/MeshMobileNav";
import UserAvatar from "@/components/ui/UserAvatar";

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
  const { user: authUser, userProfile, isLoadingAuth, navigateToLogin, logout } = useAuth();
  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [publicProfiles, setPublicProfiles] = useState([]);
  const [friendships, setFriendships] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const overdueCountRef = useRef(0);
  const loansChartRef = useRef(null);
  const activeLoansRef = useRef(null);
  const [activeAnimKey, setActiveAnimKey] = useState(0);
  const loansWasOut = useRef(true);
  const activeWasOut = useRef(true);
  const [bigScreen, setBigScreen] = useState(window.innerWidth > 900);
  useEffect(() => {
    const handler = () => setBigScreen(window.innerWidth > 900);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Bar chart viewport tracking — only fires on out→in transitions to avoid
  // infinite loops (remounting bars changes container size, re-triggering observer).
  useEffect(() => {
    const el = loansChartRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && loansWasOut.current) {
        loansWasOut.current = false;
        // viewport re-entry detected
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
          <div style={{ width: 32, height: 32, border: '2px solid #03ACEA', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px' }} className="animate-spin" />
          <p style={{ fontSize: 14, color: '#787776', fontFamily: "'DM Sans', sans-serif" }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Not logged in state
  if (!user && !isLoading) {
    const floatShadow = 'drop-shadow(0 8px 24px rgba(0,0,0,0.12))';
    const floatAnim = (delay, rotate) => ({
      initial: { opacity: 0, y: 24, scale: 0.92, rotate },
      animate: { opacity: 1, y: 0, scale: 1, rotate },
      transition: { duration: 0.7, delay, ease: 'easeOut' },
    });
    return (
      <div style={{ position: 'relative', minHeight: '100vh', background: '#F5F4F0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflow: 'hidden' }}>

        {/* ── Floating hero items ── */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>

          {/* iMessage — top-left */}
          <motion.div {...floatAnim(0.2, -4)} style={{ position: 'absolute', top: '4%', left: bigScreen ? '2%' : '-1%', filter: floatShadow }}>
            <svg width="260" height="135" viewBox="0 0 260 135" fill="none"><rect width="260" height="135" rx="16" fill="#fff"/><rect width="260" height="30" fill="#F2F2F7" rx="16"/><rect y="16" width="260" height="14" fill="#F2F2F7"/><text x="130" y="21" textAnchor="middle" fontFamily="'DM Sans', sans-serif" fontSize="11" fontWeight="600" fill="#1C1C1E">Alex</text><rect x="12" y="40" width="210" height="42" rx="14" fill="#E9E9EB"/><text x="24" y="57" fontFamily="'DM Sans', sans-serif" fontSize="10.5" fill="#1C1C1E">Hey, just a reminder about</text><text x="24" y="73" fontFamily="'DM Sans', sans-serif" fontSize="10.5" fill="#1C1C1E">the $120 from last weekend</text><rect x="82" y="90" width="166" height="28" rx="14" fill="#007AFF"/><text x="96" y="108" fontFamily="'DM Sans', sans-serif" fontSize="10.5" fill="#fff">So sorry, I completely forgot</text></svg>
          </motion.div>

          {/* Post-it yellow — upper-left */}
          <motion.div {...floatAnim(0.35, 5)} style={{ position: 'absolute', top: '32%', left: bigScreen ? '13%' : '2%', filter: floatShadow }}>
            <svg width="180" height="88" viewBox="0 0 180 88" fill="none"><rect width="180" height="88" fill="#FFE082" rx="3"/><path d="M140 88L180 48V88Z" fill="#FFC107"/><text x="16" y="38" fontFamily="Georgia, serif" fontSize="15" fontStyle="italic" fill="#5D4037">Remember to pay</text><text x="16" y="60" fontFamily="Georgia, serif" fontSize="15" fontStyle="italic" fill="#5D4037">Oliver back for gas</text></svg>
          </motion.div>

          {/* Excel spreadsheet — mid-left */}
          <motion.div {...floatAnim(0.55, -3)} style={{ position: 'absolute', top: '58%', left: bigScreen ? '1%' : '-2%', filter: floatShadow }}>
            <svg width="280" height="174" viewBox="0 0 280 174" fill="none"><rect width="280" height="174" rx="8" fill="#fff" stroke="#D0D0D0" strokeWidth="1"/><rect width="280" height="28" fill="#217346" rx="8"/><rect y="14" width="280" height="14" fill="#217346"/><text x="14" y="19" fontFamily="'DM Sans', sans-serif" fontSize="10" fontWeight="600" fill="#fff">WhoOwesWhatFromLondonTrip.xlsx</text><rect x="0" y="28" width="280" height="22" fill="#E8F5E9"/><text x="14" y="43" fontFamily="'DM Sans', sans-serif" fontSize="10" fontWeight="600" fill="#333">Name</text><text x="90" y="43" fontFamily="'DM Sans', sans-serif" fontSize="10" fontWeight="600" fill="#333">Paid For</text><text x="170" y="43" fontFamily="'DM Sans', sans-serif" fontSize="10" fontWeight="600" fill="#333">Amount</text><text x="230" y="43" fontFamily="'DM Sans', sans-serif" fontSize="10" fontWeight="600" fill="#333">Settled?</text><line x1="82" y1="28" x2="82" y2="174" stroke="#E0E0E0" strokeWidth="0.5"/><line x1="162" y1="28" x2="162" y2="174" stroke="#E0E0E0" strokeWidth="0.5"/><line x1="222" y1="28" x2="222" y2="174" stroke="#E0E0E0" strokeWidth="0.5"/><line x1="0" y1="70" x2="280" y2="70" stroke="#E0E0E0" strokeWidth="0.5"/><text x="14" y="63" fontFamily="'DM Sans', sans-serif" fontSize="11" fill="#333">You</text><text x="90" y="63" fontFamily="'DM Sans', sans-serif" fontSize="11" fill="#333">Hotel</text><text x="170" y="63" fontFamily="'DM Sans', sans-serif" fontSize="11" fill="#333">$420</text><text x="230" y="63" fontFamily="'DM Sans', sans-serif" fontSize="11" fill="#EF6C00">Partial</text><line x1="0" y1="94" x2="280" y2="94" stroke="#E0E0E0" strokeWidth="0.5"/><text x="14" y="87" fontFamily="'DM Sans', sans-serif" fontSize="11" fill="#333">Henry</text><text x="90" y="87" fontFamily="'DM Sans', sans-serif" fontSize="11" fill="#333">Flights</text><text x="170" y="87" fontFamily="'DM Sans', sans-serif" fontSize="11" fill="#333">$310</text><text x="230" y="87" fontFamily="'DM Sans', sans-serif" fontSize="11" fill="#C62828">No</text><line x1="0" y1="118" x2="280" y2="118" stroke="#E0E0E0" strokeWidth="0.5"/><text x="14" y="111" fontFamily="'DM Sans', sans-serif" fontSize="11" fill="#333">Marcus</text><text x="90" y="111" fontFamily="'DM Sans', sans-serif" fontSize="11" fill="#333">Dinners</text><text x="170" y="111" fontFamily="'DM Sans', sans-serif" fontSize="11" fill="#333">$185</text><text x="230" y="111" fontFamily="'DM Sans', sans-serif" fontSize="11" fill="#C62828">No</text><line x1="0" y1="142" x2="280" y2="142" stroke="#E0E0E0" strokeWidth="0.5"/><text x="14" y="135" fontFamily="'DM Sans', sans-serif" fontSize="11" fill="#333">Priya</text><text x="90" y="135" fontFamily="'DM Sans', sans-serif" fontSize="11" fill="#333">Tickets</text><text x="170" y="135" fontFamily="'DM Sans', sans-serif" fontSize="11" fill="#333">$95</text><text x="230" y="135" fontFamily="'DM Sans', sans-serif" fontSize="11" fill="#2E7D32">Yes</text><text x="14" y="162" fontFamily="'DM Sans', sans-serif" fontSize="11" fontWeight="600" fill="#333">Total</text><text x="170" y="162" fontFamily="'DM Sans', sans-serif" fontSize="11" fontWeight="600" fill="#333">$1,010</text></svg>
          </motion.div>

          {/* Notes app — bottom-left */}
          <motion.div {...floatAnim(0.5, -2)} style={{ position: 'absolute', bottom: '2%', left: bigScreen ? '17%' : '-1%', filter: floatShadow }}>
            <svg width="190" height="150" viewBox="0 0 190 150" fill="none"><rect width="190" height="150" rx="12" fill="#fff"/><rect width="190" height="30" fill="#F5F5F5" rx="12"/><rect y="14" width="190" height="16" fill="#F5F5F5"/><circle cx="14" cy="14" r="5" fill="#FFCC02"/><text x="95" y="20" textAnchor="middle" fontFamily="'DM Sans', sans-serif" fontSize="10" fontWeight="600" fill="#1C1C1E">Notes</text><text x="16" y="50" fontFamily="'DM Sans', sans-serif" fontSize="14" fontWeight="700" fill="#1C1C1E">Need to repay:</text><circle cx="26" cy="72" r="4" fill="none" stroke="#FFCC02" strokeWidth="1.5"/><text x="38" y="76" fontFamily="'DM Sans', sans-serif" fontSize="12" fill="#444">Em (tickets)</text><circle cx="26" cy="96" r="4" fill="none" stroke="#FFCC02" strokeWidth="1.5"/><text x="38" y="100" fontFamily="'DM Sans', sans-serif" fontSize="12" fill="#444">Priyanka (rent)</text><circle cx="26" cy="120" r="4" fill="none" stroke="#FFCC02" strokeWidth="1.5"/><text x="38" y="124" fontFamily="'DM Sans', sans-serif" fontSize="12" fill="#444">Alex (dinner)</text></svg>
          </motion.div>

          {/* Reminder 1 (Edward) — top-right */}
          <motion.div {...floatAnim(0.6, -3)} style={{ position: 'absolute', top: '6%', right: bigScreen ? '10%' : '-1%', filter: floatShadow }}>
            <svg width="230" height="80" viewBox="0 0 230 80" fill="none"><rect width="230" height="80" rx="12" fill="#fff" stroke="#E5E5EA" strokeWidth="1"/><rect width="230" height="28" fill="#F8F8F8" rx="12"/><rect y="14" width="230" height="14" fill="#F8F8F8"/><circle cx="14" cy="14" r="5" fill="#007AFF"/><text x="95" y="20" textAnchor="middle" fontFamily="'DM Sans', sans-serif" fontSize="10" fontWeight="600" fill="#1C1C1E">Reminders</text><circle cx="22" cy="54" r="8" fill="none" stroke="#007AFF" strokeWidth="1.5"/><text x="38" y="52" fontFamily="'DM Sans', sans-serif" fontSize="11.5" fill="#1C1C1E">Ask Edward when he needs</text><text x="38" y="66" fontFamily="'DM Sans', sans-serif" fontSize="11.5" fill="#1C1C1E">the $40 by</text></svg>
          </motion.div>

          {/* Calculator — upper-right */}
          <motion.div {...floatAnim(0.7, 6)} style={{ position: 'absolute', top: '28%', right: bigScreen ? '3%' : '-1%', filter: floatShadow }}>
            <svg width="120" height="150" viewBox="0 0 120 150" fill="none"><rect width="120" height="150" rx="12" fill="#1C1C1E"/><rect x="8" y="8" width="104" height="38" rx="6" fill="#333"/><text x="104" y="28" textAnchor="end" fontFamily="'DM Sans', sans-serif" fontSize="18" fontWeight="300" fill="#fff">53.3333</text><text x="104" y="40" textAnchor="end" fontFamily="'DM Sans', sans-serif" fontSize="8" fill="#8E8E93">160 / 3</text><circle cx="24" cy="68" r="13" fill="#505050"/><circle cx="60" cy="68" r="13" fill="#505050"/><circle cx="96" cy="68" r="13" fill="#FF9500"/><circle cx="24" cy="100" r="13" fill="#505050"/><circle cx="60" cy="100" r="13" fill="#505050"/><circle cx="96" cy="100" r="13" fill="#FF9500"/><rect x="11" y="119" width="49" height="26" rx="13" fill="#505050"/><circle cx="96" cy="132" r="13" fill="#FF9500"/></svg>
          </motion.div>

          {/* Notification (Em) — mid-right */}
          <motion.div {...floatAnim(0.4, -2)} style={{ position: 'absolute', top: '52%', right: bigScreen ? '12%' : '-1%', filter: floatShadow }}>
            <svg width="260" height="72" viewBox="0 0 260 72" fill="none"><rect width="260" height="72" rx="16" fill="#fff" stroke="#E5E5EA" strokeWidth="1"/><rect x="12" y="18" width="36" height="36" rx="8" fill="#34C759"/><rect x="17" y="23" width="24" height="17" rx="5" fill="white"/><path d="M19 39 L14 46 L24 39 Z" fill="white"/><text x="56" y="30" fontFamily="'DM Sans', sans-serif" fontSize="10" fontWeight="600" fill="#1C1C1E">Em</text><text x="248" y="30" textAnchor="end" fontFamily="'DM Sans', sans-serif" fontSize="9" fill="#8E8E93">now</text><text x="56" y="46" fontFamily="'DM Sans', sans-serif" fontSize="10" fill="#333">How much do I still owe you from the</text><text x="56" y="60" fontFamily="'DM Sans', sans-serif" fontSize="10" fill="#333">Europe trip? Kind of lost track</text></svg>
          </motion.div>

          {/* Reminder 2 (Saoirse) — lower-right */}
          <motion.div {...floatAnim(0.65, 2)} style={{ position: 'absolute', top: '72%', right: bigScreen ? '4%' : '-1%', filter: floatShadow }}>
            <svg width="250" height="80" viewBox="0 0 250 80" fill="none"><rect width="250" height="80" rx="12" fill="#fff" stroke="#E5E5EA" strokeWidth="1"/><rect width="250" height="28" fill="#F8F8F8" rx="12"/><rect y="14" width="250" height="14" fill="#F8F8F8"/><circle cx="14" cy="14" r="5" fill="#FF9500"/><text x="105" y="20" textAnchor="middle" fontFamily="'DM Sans', sans-serif" fontSize="10" fontWeight="600" fill="#1C1C1E">Reminders</text><circle cx="22" cy="54" r="8" fill="none" stroke="#FF9500" strokeWidth="1.5"/><text x="38" y="52" fontFamily="'DM Sans', sans-serif" fontSize="11" fill="#1C1C1E">Remind Saoirse to repay concert</text><text x="38" y="66" fontFamily="'DM Sans', sans-serif" fontSize="11" fill="#1C1C1E">tickets (think it was $180?)</text></svg>
          </motion.div>

          {/* Post-it blue — bottom-right */}
          <motion.div {...floatAnim(0.58, -3)} style={{ position: 'absolute', bottom: '4%', right: bigScreen ? '19%' : '1%', filter: floatShadow }}>
            <svg width="180" height="88" viewBox="0 0 180 88" fill="none"><rect width="180" height="88" fill="#AECFF5" rx="3"/><path d="M140 88L180 48V88Z" fill="#7DB3EE"/><text x="16" y="34" fontFamily="Georgia, serif" fontSize="13" fontStyle="italic" fill="#1A3A5C">Remind Rohan about</text><text x="16" y="55" fontFamily="Georgia, serif" fontSize="13" fontStyle="italic" fill="#1A3A5C">the $40 he still owes</text></svg>
          </motion.div>

          {/* WhatsApp (Henry) — mid-center */}
          <motion.div {...floatAnim(0.3, 0)} style={{ position: 'absolute', top: '22%', right: '33%', filter: floatShadow }}>
            <svg width="250" height="190" viewBox="0 0 250 190" fill="none"><rect width="250" height="190" rx="16" fill="#ECE5DD"/><rect width="250" height="34" fill="#075E54" rx="16"/><rect y="16" width="250" height="18" fill="#075E54"/><text x="14" y="22" fontFamily="'DM Sans', sans-serif" fontSize="12" fontWeight="600" fill="#fff">Henry</text><rect x="12" y="44" width="180" height="24" rx="8" fill="#fff"/><text x="20" y="60" fontFamily="'DM Sans', sans-serif" fontSize="10" fill="#333">How much do I owe you again?</text><rect x="80" y="74" width="158" height="24" rx="8" fill="#DCF8C6"/><text x="90" y="90" fontFamily="'DM Sans', sans-serif" fontSize="10" fill="#333">I think $200</text><rect x="12" y="104" width="178" height="24" rx="8" fill="#fff"/><text x="20" y="120" fontFamily="'DM Sans', sans-serif" fontSize="10" fill="#333">Wait, I thought it was $180</text><rect x="50" y="134" width="188" height="40" rx="8" fill="#DCF8C6"/><text x="60" y="150" fontFamily="'DM Sans', sans-serif" fontSize="10" fill="#333">You're right, my bad forgot you</text><text x="60" y="164" fontFamily="'DM Sans', sans-serif" fontSize="10" fill="#333">gave me that $20</text></svg>
          </motion.div>

        </div>

        {/* ── Sign-in card ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} style={{ maxWidth: 400, width: '100%', position: 'relative', zIndex: 2 }}>
          <div className="glass-card" style={{ padding: 36, textAlign: 'center' }}>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: 'italic', fontWeight: 600, fontSize: '2.2rem', color: '#1A1918', letterSpacing: '-0.01em', lineHeight: 1, marginBottom: 20 }}>
              Vony
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1A1918', marginBottom: 6, letterSpacing: '-0.02em', fontFamily: "'DM Sans', sans-serif" }}>
              Welcome to Vony
            </h1>
            <p style={{ fontSize: 14, color: '#787776', marginBottom: 28, fontFamily: "'DM Sans', sans-serif" }}>
              Lending with friends{' '}
              <span style={{ background: 'linear-gradient(transparent 70%, rgba(3,172,234,0.28) 70%)' }}>made simple</span>.
            </p>
            <button onClick={handleLogin} disabled={isAuthenticating} style={{
              width: '100%', padding: '11px 20px', fontSize: 15, fontWeight: 500,
              background: 'white',
              color: isAuthenticating ? '#787776' : '#1A1918',
              border: '1px solid rgba(0,0,0,0.12)',
              borderRadius: 24,
              cursor: isAuthenticating ? 'not-allowed' : 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              transition: 'box-shadow 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}>
              {isAuthenticating ? 'Signing you in...' : (
                <>
                  <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    <path fill="none" d="M0 0h48v48H0z"/>
                  </svg>
                  Continue with Google
                </>
              )}
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
        color = isLender ? '#7C3AED' : '#03ACEA';
      } else if (loan.status === 'active') {
        description = isLender ? `${name} accepted your ${amount} loan` : `You accepted ${amount} loan from ${name}`;
        icon = 'check'; color = '#16A34A';
      } else if (loan.status === 'declined') {
        description = isLender ? `${name} declined your ${amount} loan` : `You declined ${amount} loan from ${name}`;
        icon = 'x'; color = '#DC2626';
      } else if (loan.status === 'cancelled') {
        description = isLender ? `You cancelled ${amount} loan offer to ${name}` : `${name} cancelled their ${amount} loan offer`;
        icon = 'x'; color = '#DC2626';
      } else if (loan.status === 'completed') {
        description = isLender ? `${name} fully repaid your ${amount} loan` : `You fully repaid ${amount} loan to ${name}`;
        icon = 'check'; color = '#16A34A';
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
        color: isBorrower ? '#7C3AED' : '#03ACEA',
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

  const SectionHeader = ({ title, linkTo, linkLabel }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, marginBottom: 4, borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{title}</span>
      {linkTo && <Link to={linkTo} style={{ fontSize: 11, fontWeight: 500, color: '#03ACEA', textDecoration: 'none' }}>{linkLabel}</Link>}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14, lineHeight: 1.5, color: '#1A1918', WebkitFontSmoothing: 'antialiased' }}>
      <MeshMobileNav user={user} activePage="Home" />

      {/* ── MESH THREE-COLUMN LAYOUT ── */}
      <div className="mesh-layout" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 0 }}>

        {/* ── LEFT: Sidebar nav ── */}
        <div className="mesh-left" style={{ background: 'transparent', borderRight: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ position: 'sticky', top: 0, padding: '24px 8px 0' }}>
            {/* Vony logo */}
            <Link to="/" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontStyle: 'italic', fontSize: '1.3rem', color: '#1A1918', textDecoration: 'none', display: 'block', marginBottom: 16, lineHeight: 1, letterSpacing: '-0.02em', paddingLeft: 6 }}>Vony</Link>
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
              {/* Coming Soon section */}
              <div style={{ marginTop: 16, marginBottom: 4, paddingLeft: 12 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Coming Soon</span>
              </div>
              {[
                { label: 'Learn', to: createPageUrl("ComingSoon") },
                { label: 'Loan Help', to: createPageUrl("LoanHelp") },
              ].map(({ label, to }) => {
                const soonIcons = {
                  'Learn': <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9B9A98" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
                  'Loan Help': <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9B9A98" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/><line x1="14.83" y1="9.17" x2="19.07" y2="4.93"/><line x1="4.93" y1="19.07" x2="9.17" y2="14.83"/></svg>,
                };
                return (
                  <Link key={label} to={to} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 12px', borderRadius: 9, textDecoration: 'none',
                    fontSize: 13, fontWeight: 500, color: '#787776',
                    background: 'transparent', fontFamily: "'DM Sans', sans-serif",
                    width: '100%', boxSizing: 'border-box',
                  }}>
                    <span style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 7, background: 'rgba(0,0,0,0.04)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{soonIcons[label]}</span>
                    <span style={{ flex: 1 }}>{label}</span>
                    <span style={{ fontSize: 8, fontWeight: 700, color: '#9B9A98', background: 'transparent', borderRadius: 4, padding: '2px 6px', letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1.2, flexShrink: 0 }}>SOON</span>
                  </Link>
                );
              })}
            </nav>
            <SidebarBottomSection />
          </div>
        </div>

        {/* ── CENTER ── */}
        <div className="mesh-center" style={{ background: 'transparent', padding: '24px 32px 80px' }}>

          {/* Greeting + icons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
            <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.2, color: '#1A1918' }}>
              {greeting}, {firstName}
            </div>
            <div className="home-greeting-icons" style={{ display: bigScreen ? 'none' : 'flex', alignItems: 'center', gap: 10 }}>
              <Link to={createPageUrl("Requests")} style={{ position: 'relative', textDecoration: 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#787776" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                </div>
                {notifCount > 0 && <div style={{ position: 'absolute', top: 2, right: 2, width: 7, height: 7, borderRadius: '50%', background: '#03ACEA', border: '1.5px solid #ffffff' }} />}
              </Link>
              <Link to={createPageUrl("Profile")} style={{ textDecoration: 'none' }}>
                <UserAvatar name={user.full_name || user.username} src={user.profile_picture_url} size={32} />
              </Link>
            </div>
          </div>

          {/* New user onboarding — below greeting */}
          {!hasLoans && (
            <div style={{
              marginBottom: 28, padding: '20px 22px', borderRadius: 10,
              background: 'white',
              border: '1px solid rgba(0,0,0,0.07)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.02em', marginBottom: 4, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                🎉 Welcome to Vony!
              </div>
              <div style={{ fontSize: 13, color: '#787776', lineHeight: 1.55, marginBottom: 16 }}>
                Lending money to friends has never been this easy. Start by adding a friend, then create your first loan together.
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <Link
                  to={createPageUrl('Friends')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 10,
                    background: '#03ACEA', color: 'white', textDecoration: 'none',
                    fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif",
                  }}
                >
                  Find Friends
                </Link>
                <Link
                  to={createPageUrl('CreateOffer')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 10,
                    background: 'white', color: '#1A1918', textDecoration: 'none',
                    fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif",
                    border: '1px solid rgba(0,0,0,0.10)',
                  }}
                >
                  Create a Loan
                </Link>
                <a
                  href="https://www.vony-lending.com/guide"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 10,
                    background: 'white', color: '#787776', textDecoration: 'none',
                    fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif",
                    border: '1px solid rgba(0,0,0,0.10)',
                  }}
                >
                  Guide
                </a>
              </div>
            </div>
          )}

          {/* Notification bar */}
          {notifCount > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 9,
              background: 'rgba(3,172,234,0.06)', border: '1px solid rgba(3,172,234,0.15)',
              marginBottom: 16,
            }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(3,172,234,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#03ACEA" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </div>
              <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#1A1918', fontFamily: "'DM Sans', sans-serif" }}>
                You have {notifCount} new notification{notifCount !== 1 ? 's' : ''}
              </span>
              <Link to={createPageUrl("Requests")} style={{
                fontSize: 11, fontWeight: 600, color: '#03ACEA', textDecoration: 'none',
                padding: '3px 10px', borderRadius: 6, background: 'white',
                border: '1px solid rgba(3,172,234,0.2)', flexShrink: 0,
                fontFamily: "'DM Sans', sans-serif",
              }}>View</Link>
            </div>
          )}

          {/* Three summary cards */}
          <div className="home-summary-cards" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginBottom: 24, alignItems: 'stretch' }}>
            {/* Next Payment Due */}
            {(() => {
              const days = nextBorrowerPayment ? Math.ceil((nextBorrowerPayment.date.getTime() - Date.now()) / 86400000) : null;
              const isLate = days !== null && days < 0;
              const daysLabel = days === null ? null : isLate ? `${Math.abs(days)}d late` : days === 0 ? 'today' : `${days}d`;
              const badgeColor = isLate ? '#E8726E' : days !== null && days <= 3 ? '#F59E0B' : '#9B9A98';
              const badgeBg = isLate ? 'rgba(232,114,110,0.08)' : days !== null && days <= 3 ? 'rgba(245,158,11,0.08)' : 'rgba(0,0,0,0.04)';
              return (
                <div className="home-blue-card" style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                  {/* Aurora glow */}
                  <div style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 'calc(100% + 10px)',
                    height: 'calc(100% + 10px)',
                    background: 'linear-gradient(135deg, rgb(3,172,234) 0%, rgb(99,102,241) 25%, rgb(139,92,246) 50%, rgb(124,58,237) 75%, rgb(29,91,148) 100%)',
                    filter: 'blur(5px) saturate(1.2)',
                    opacity: 0.35,
                    borderRadius: 18,
                    zIndex: 0,
                    pointerEvents: 'none',
                  }} />
                  {/* Card */}
                  <div style={{
                    position: 'relative', zIndex: 1, flex: 1,
                    padding: '12px 14px', borderRadius: 10,
                    background: '#ffffff',
                    border: '1.5px solid rgba(255,255,255,0.9)',
                    boxShadow: '0 2px 16px rgba(29,91,148,0.10), inset 0 1px 0 rgba(255,255,255,1), inset 0 -1px 0 rgba(200,220,240,0.3)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                      <div style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(29,91,148,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1D5B94" strokeWidth="2.5" strokeLinecap="round"><polyline points="7 13 12 18 17 13"/><line x1="12" y1="18" x2="12" y2="6"/></svg>
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Next Payment Due</span>
                    </div>
                    {nextBorrowerPayment ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap', overflow: 'hidden' }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: '#1A1918', letterSpacing: '-0.02em', flexShrink: 0 }}>{format(nextBorrowerPayment.date, 'MMM d')}</span>
                        {daysLabel && <span style={{ fontSize: 9, fontWeight: 700, color: badgeColor, background: badgeBg, borderRadius: 5, padding: '2px 6px', flexShrink: 0 }}>{daysLabel}</span>}
                        <span style={{ fontSize: 11, color: '#9B9A98', marginLeft: 'auto', flexShrink: 0, whiteSpace: 'nowrap' }}>{formatMoney(nextBorrowerPayment.payment_amount || 0)} to {nextBorrowerPayment.firstName}</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#C5C3C0' }}>—</span>
                        <span style={{ fontSize: 11, color: '#9B9A98' }}>Nothing due</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Next Payment Incoming */}
            {(() => {
              const days = nextLenderPayment ? Math.ceil((nextLenderPayment.date.getTime() - Date.now()) / 86400000) : null;
              const isLate = days !== null && days < 0;
              const daysLabel = days === null ? null : isLate ? `${Math.abs(days)}d late` : days === 0 ? 'today' : `${days}d`;
              const badgeColor = isLate ? '#E8726E' : '#03ACEA';
              const badgeBg = isLate ? 'rgba(232,114,110,0.08)' : 'rgba(3,172,234,0.10)';
              return (
                <div className="home-blue-card" style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                  {/* Aurora glow — cyan/teal palette */}
                  <div style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 'calc(100% + 10px)',
                    height: 'calc(100% + 10px)',
                    background: 'linear-gradient(135deg, rgb(3,172,234) 0%, rgb(6,182,212) 30%, rgb(20,184,166) 60%, rgb(3,172,234) 100%)',
                    filter: 'blur(5px) saturate(1.2)',
                    opacity: 0.35,
                    borderRadius: 18,
                    zIndex: 0,
                    pointerEvents: 'none',
                  }} />
                  {/* Gradient border wrapper — matches sidebar line: transparent → #03ACEA */}
                  <div style={{
                    position: 'relative', zIndex: 1, flex: 1,
                    background: 'linear-gradient(to right, rgba(3,172,234,0) 0%, #03ACEA 67%, #03ACEA 100%)',
                    padding: 1, borderRadius: 11,
                    display: 'flex', flexDirection: 'column',
                  }}>
                  {/* Card */}
                  <div style={{
                    flex: 1,
                    padding: '12px 14px', borderRadius: 10,
                    background: '#ffffff',
                    display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                      <div style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(3,172,234,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#03ACEA" strokeWidth="2.5" strokeLinecap="round"><polyline points="17 11 12 6 7 11"/><line x1="12" y1="6" x2="12" y2="18"/></svg>
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Next Payment Incoming</span>
                    </div>
                    {nextLenderPayment ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap', overflow: 'hidden' }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: '#1A1918', letterSpacing: '-0.02em', flexShrink: 0 }}>{format(nextLenderPayment.date, 'MMM d')}</span>
                        {daysLabel && <span style={{ fontSize: 9, fontWeight: 700, color: badgeColor, background: badgeBg, borderRadius: 5, padding: '2px 6px', flexShrink: 0 }}>{daysLabel}</span>}
                        <span style={{ fontSize: 11, color: '#9B9A98', marginLeft: 'auto', flexShrink: 0, whiteSpace: 'nowrap' }}>{formatMoney(nextLenderPayment.payment_amount || 0)} from {nextLenderPayment.firstName}</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#C5C3C0' }}>—</span>
                        <span style={{ fontSize: 11, color: '#9B9A98' }}>None incoming ✨</span>
                      </div>
                    )}
                  </div>
                  </div>
                </div>
              );
            })()}

            {/* Overview */}
            <div className="home-overview-card" style={{ padding: '12px 14px', borderRadius: 10, background: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.08), 0 6px 24px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                <div style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(3,172,234,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#03ACEA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Overview</span>
              </div>
              {/* One-line centered: Owed to you $x   You owe $y */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 11, color: '#787776' }}>Owed to you</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#03ACEA', letterSpacing: '-0.02em' }}>{formatMoney(lentRemaining)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 11, color: '#787776' }}>You owe</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#1A1918', letterSpacing: '-0.02em' }}>{formatMoney(borrowedRemaining)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Masonry two-column layout */}
          <div className="home-two-col-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Left column: Upcoming → Recent Activity → Active Lending */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Upcoming */}
              <div style={{ background: '#ffffff', borderRadius: 10, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 10px rgba(0,0,0,0.08), 0 6px 24px rgba(0,0,0,0.06)', padding: '14px 18px' }}>
                <SectionHeader title="Upcoming" linkTo={createPageUrl("Upcoming")} linkLabel="Full schedule →" />
                {combinedPaymentEvents.length === 0 ? (
                  <div style={{ padding: '8px 0', fontSize: 13, color: '#9B9A98', textAlign: 'center' }}>You're all caught up ✨</div>
                ) : combinedPaymentEvents.map((event, idx) => {
                  const isOverdue = event.days < 0;
                  const daysLabel = isOverdue ? `${Math.abs(event.days)}d late` : event.days === 0 ? 'today' : `${event.days}d`;
                  const amtSign = event.isLender ? '+' : '-';
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0' }}>
                      <div style={{
                        minWidth: 42, textAlign: 'center', flexShrink: 0,
                        fontSize: 10, fontWeight: 700, lineHeight: 1.2,
                        color: isOverdue ? '#E8726E' : event.days <= 3 ? '#F59E0B' : '#9B9A98',
                        background: isOverdue ? 'rgba(232,114,110,0.08)' : event.days <= 3 ? 'rgba(245,158,11,0.08)' : 'rgba(0,0,0,0.04)',
                        borderRadius: 6, padding: '3px 6px',
                      }}>
                        {daysLabel}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {event.isLender
                          ? <>{event.firstName} pays you</>
                          : <>Pay {event.firstName}</>}
                        {event.purpose && <span style={{ color: '#9B9A98' }}> · {event.purpose}</span>}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0, color: event.isLender ? '#03ACEA' : '#1A1918', letterSpacing: '-0.01em' }}>
                        {amtSign}{formatMoney(event.remainingAmount)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Recent Activity */}
              <div style={{ background: '#ffffff', borderRadius: 10, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 10px rgba(0,0,0,0.08), 0 6px 24px rgba(0,0,0,0.06)', padding: '14px 18px' }}>
                <SectionHeader title="Recent Activity" linkTo={createPageUrl("RecentActivity")} linkLabel="View all →" />
                {recentActivity.length === 0 ? (
                  <div style={{ padding: '8px 0', fontSize: 13, color: '#9B9A98', textAlign: 'center' }}>No activity just yet 🕊️</div>
                ) : recentActivity.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0' }}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, background: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {item.icon === 'send' ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="2.5" strokeLinecap="round"><polyline points="7 13 12 18 17 13"/><line x1="12" y1="18" x2="12" y2="6"/></svg>
                      ) : item.icon === 'receive' ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="2.5" strokeLinecap="round"><polyline points="17 11 12 6 7 11"/><line x1="12" y1="6" x2="12" y2="18"/></svg>
                      ) : item.icon === 'check' ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      ) : (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</div>
                    <span style={{ fontSize: 11, color: '#9B9A98', flexShrink: 0 }}>{item.detail}</span>
                  </div>
                ))}
              </div>

              {/* Active Lending */}
              <div style={{ background: '#ffffff', borderRadius: 10, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 10px rgba(0,0,0,0.08), 0 6px 24px rgba(0,0,0,0.06)', padding: '14px 18px' }}>
                <SectionHeader title="Active Lending" linkTo={createPageUrl("YourLoans")} linkLabel="View all →" />
                {lentLoans.length === 0 ? (
                  <div style={{ padding: '8px 0', fontSize: 13, color: '#9B9A98', textAlign: 'center' }}>Start a loan to see it here 🌱</div>
                ) : (
                  <div ref={activeLoansRef} style={{ display: 'flex', flexDirection: 'column' }}>
                    {lentLoans.slice(0, 5).map((loan, idx) => {
                      const otherProfile = safeAllProfiles.find(p => p.user_id === loan.borrower_id);
                      const totalAmt = loan.total_amount || loan.amount || 0;
                      const paidAmt = loan.amount_paid || 0;
                      const pct = totalAmt > 0 ? Math.round((paidAmt / totalAmt) * 100) : 0;
                      const name = otherProfile?.full_name?.split(' ')[0] || otherProfile?.username || 'User';
                      const purpose = loan.purpose ? ` for ${loan.purpose}` : '';
                      const initial = (otherProfile?.full_name || otherProfile?.username || 'U').charAt(0).toUpperCase();
                      return (
                        <div key={loan.id} style={{ padding: '9px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <UserAvatar name={otherProfile?.full_name || otherProfile?.username} src={otherProfile?.profile_picture_url} size={20} radius={5} />
                            <div style={{ fontSize: 13, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>You lent {name} {formatMoney(totalAmt)}{purpose}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(3,172,234,0.1)', overflow: 'hidden' }}>
                              <div key={`al-${idx}-${activeAnimKey}`} style={{ height: '100%', borderRadius: 3, background: '#03ACEA', width: `${pct}%`, animation: `barGrowRight 0.8s ease-out ${idx * 0.08}s both` }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#9B9A98', flexShrink: 0 }}>{pct}%</span>
                          </div>
                          <div style={{ fontSize: 11, color: '#9B9A98', marginTop: 3 }}>{formatMoney(paidAmt)} of {formatMoney(totalAmt)} paid back</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right column: How April → Your Loans Over Time → Active Borrowing */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* How month is going */}
              <div style={{ background: '#ffffff', borderRadius: 10, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 10px rgba(0,0,0,0.08), 0 6px 24px rgba(0,0,0,0.06)', padding: '14px 18px' }}>
                <SectionHeader title={`How ${format(today, 'MMMM')} is going`} />
                {/* Received */}
                <div style={{ padding: '9px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: '#1A1918' }}>Received</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#03ACEA', letterSpacing: '-0.01em' }}>{formatMoney(monthlyReceived)}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'rgba(3,172,234,0.1)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, background: '#03ACEA', width: `${monthlyExpectedReceive > 0 ? Math.min((monthlyReceived / monthlyExpectedReceive) * 100, 100) : 0}%`, transition: 'width 0.8s ease-out' }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#9B9A98', marginTop: 4 }}>of {formatMoney(monthlyExpectedReceive)} expected</div>
                </div>
                {/* Paid out */}
                <div style={{ padding: '9px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: '#1A1918' }}>Paid out</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1D5B94', letterSpacing: '-0.01em' }}>{formatMoney(monthlyPaidOut)}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'rgba(29,91,148,0.1)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, background: '#1D5B94', width: `${monthlyExpectedPay > 0 ? Math.min((monthlyPaidOut / monthlyExpectedPay) * 100, 100) : 0}%`, transition: 'width 0.8s ease-out' }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#9B9A98', marginTop: 4 }}>of {formatMoney(monthlyExpectedPay)} expected</div>
                </div>
              </div>

              {/* Your Loans Over Time */}
              <div style={{ background: '#ffffff', borderRadius: 10, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 10px rgba(0,0,0,0.08), 0 6px 24px rgba(0,0,0,0.06)', padding: '14px 18px' }} ref={loansChartRef}>
                <SectionHeader title="Your Loans Over Time" />
                {!chartData ? (
                  <div style={{ padding: '8px 0', fontSize: 13, color: '#9B9A98', textAlign: 'center' }}>Your loan history will appear here 📊</div>
                ) : (
                  <>
                    {/* Legend */}
                    <div style={{ display: 'flex', gap: 16, marginBottom: 16, marginTop: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#787776' }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: '#03ACEA' }} />
                        Lending
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#787776' }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: '#1D5B94' }} />
                        Borrowing
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#9B9A98' }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(3,172,234,0.25)' }} />
                        Predicted
                      </div>
                    </div>
                    {/* Chart */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 120 }}>
                      {chartData.data.map((d, i) => {
                        const lendPct = (d.owedToYou / chartData.maxVal) * 100;
                        const borPct = (d.youOwe / chartData.maxVal) * 100;
                        return (
                          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                            <div style={{ width: '100%', display: 'flex', gap: 3, alignItems: 'flex-end', height: '100%', justifyContent: 'center' }}>
                              <div style={{ width: 8, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', flexShrink: 0 }}>
                                <div style={{ width: '100%', height: `${Math.max(lendPct, 2)}%`, borderRadius: '3px 3px 0 0', background: d.isFuture ? 'rgba(3,172,234,0.25)' : '#03ACEA', transition: 'height 0.6s ease-out' }} />
                              </div>
                              <div style={{ width: 8, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', flexShrink: 0 }}>
                                <div style={{ width: '100%', height: `${Math.max(borPct, 2)}%`, borderRadius: '3px 3px 0 0', background: d.isFuture ? 'rgba(29,91,148,0.2)' : '#1D5B94', transition: 'height 0.6s ease-out' }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* X-axis labels */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      {chartData.data.map((d, i) => (
                        <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: d.isFuture ? '#C5C3C0' : d.isCurrent ? '#03ACEA' : '#9B9A98', fontWeight: d.isCurrent ? 700 : 500 }}>
                          {d.label}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Active Borrowing */}
              <div style={{ background: '#ffffff', borderRadius: 10, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 10px rgba(0,0,0,0.08), 0 6px 24px rgba(0,0,0,0.06)', padding: '14px 18px' }}>
                <SectionHeader title="Active Borrowing" linkTo={createPageUrl("YourLoans")} linkLabel="View all →" />
                {borrowedLoans.length === 0 ? (
                  <div style={{ padding: '8px 0', fontSize: 13, color: '#9B9A98', textAlign: 'center' }}>Nothing borrowed just yet 🤝</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {borrowedLoans.slice(0, 5).map((loan, idx) => {
                      const otherProfile = safeAllProfiles.find(p => p.user_id === loan.lender_id);
                      const totalAmt = loan.total_amount || loan.amount || 0;
                      const paidAmt = loan.amount_paid || 0;
                      const pct = totalAmt > 0 ? Math.round((paidAmt / totalAmt) * 100) : 0;
                      const name = otherProfile?.full_name?.split(' ')[0] || otherProfile?.username || 'User';
                      const purpose = loan.purpose ? ` for ${loan.purpose}` : '';
                      const initial = (otherProfile?.full_name || otherProfile?.username || 'U').charAt(0).toUpperCase();
                      return (
                        <div key={loan.id} style={{ padding: '9px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <UserAvatar name={otherProfile?.full_name || otherProfile?.username} src={otherProfile?.profile_picture_url} size={20} radius={5} />
                            <div style={{ fontSize: 13, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name} lent you {formatMoney(totalAmt)}{purpose}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(29,91,148,0.1)', overflow: 'hidden' }}>
                              <div key={`ab-${idx}-${activeAnimKey}`} style={{ height: '100%', borderRadius: 3, background: '#1D5B94', width: `${pct}%`, animation: `barGrowRight 0.8s ease-out ${idx * 0.08}s both` }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#9B9A98', flexShrink: 0 }}>{pct}%</span>
                          </div>
                          <div style={{ fontSize: 11, color: '#9B9A98', marginTop: 3 }}>{formatMoney(paidAmt)} of {formatMoney(totalAmt)} repaid</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="dashboard-footer" style={{ padding: '12px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
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

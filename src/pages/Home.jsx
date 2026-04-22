import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loan, Payment, PublicProfile, Friendship, LoanAgreement } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";


import { motion, AnimatePresence } from "framer-motion";
import { format, startOfMonth, endOfMonth, addMonths, addDays, isBefore, isAfter, isSameDay, differenceInDays } from "date-fns";
import { formatMoney } from "@/components/utils/formatMoney";
import { toLocalDate, getLocalToday, daysUntil as daysUntilDate } from "@/components/utils/dateUtils";
import { countNotifications } from "@/components/utils/notificationCount";
import LoanTimeline from "@/components/LoanTimeline";

import { CardEntrance, CountUp } from "@/components/ui/animations";
import DesktopSidebar from '../components/DesktopSidebar';
import MeshMobileNav from "@/components/MeshMobileNav";
import UserAvatar from "@/components/ui/UserAvatar";
import FriendsPopup from "@/components/FriendsPopup";
import BorrowerSignatureModal from "@/components/loans/BorrowerSignatureModal";
import { createPortal } from 'react-dom';

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

// ─── Upcoming Payment Stack ────────────────────────────────────────────────
function UpcomingPaymentStack({ events }) {
  const navigate = useNavigate();
  const [idx, setIdx] = React.useState(0);
  const displayEvents = events.slice(0, 3);
  const total = displayEvents.length;
  if (total === 0) return null;

  const goTo = (i) => setIdx(((i % total) + total) % total);
  const evt = displayEvents[idx];
  const isOverdue = evt.days < 0;
  const daysText = isOverdue
    ? `${Math.abs(evt.days)}d late`
    : evt.days === 0 ? 'Today'
    : `${evt.days}d`;
  const badgeColor = isOverdue ? '#E8726E' : evt.days <= 3 ? '#D97706' : '#03ACEA';

  const ArrowBtn = ({ onClick, children }) => (
    <button
      onClick={onClick}
      style={{
        width: 30, height: 30, borderRadius: '50%',
        background: '#F5F4F2', border: '1px solid #ECEAE8',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: total > 1 ? 'pointer' : 'default',
        opacity: total > 1 ? 1 : 0.3,
        flexShrink: 0, padding: 0,
      }}
    >
      {children}
    </button>
  );

  // SVG arrow helpers
  const ChevLeft  = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1A1918" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
  const ChevRight = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1A1918" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
  const ChevUp    = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1A1918" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>;
  const ChevDown  = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1A1918" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;

  const CardFace = ({ narrow }) => (
    <div style={{
      background: '#ffffff',
      borderRadius: 14,
      border: '1px solid #ECEAE8',
      boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
      padding: '18px 16px 14px',
      fontFamily: "'DM Sans', sans-serif",
      flex: narrow ? 1 : undefined,
      minWidth: 0,
    }}>
      {/* Avatar */}
      <UserAvatar name={evt.firstName} src={evt.profilePic} size={52} radius={26} />
      {/* Name */}
      <div style={{
        fontWeight: 700, fontSize: 17, color: '#1A1918',
        marginTop: 10, marginBottom: 10, letterSpacing: '-0.02em',
        fontFamily: "'DM Sans', sans-serif",
      }}>{evt.firstName}</div>
      {/* Divider */}
      <div style={{ height: 1, background: '#F0EFEE', marginBottom: 10 }} />
      {/* Info rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif" }}>Amount due</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.02em', fontFamily: "'DM Sans', sans-serif" }}>{formatMoney(evt.remainingAmount)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif" }}>Due</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif" }}>{format(evt.date, 'MMM d')}</span>
        </div>
      </div>
      {/* Record payment */}
      <button
        onClick={() => navigate(createPageUrl('RecordPayment') + `?loanId=${evt.loanId}`)}
        style={{
          width: '100%', padding: '9px 0', borderRadius: 20,
          background: '#1A1918', color: '#ffffff',
          fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.01em',
        }}
      >
        Record payment
      </button>
    </div>
  );

  return (
    /* Outer wrapper: gives space for the floating badge at top-right */
    <div style={{ position: 'relative', paddingTop: 16 }}>
      {/* Days badge — floats outside top-right corner of the card */}
      <div style={{
        position: 'absolute', top: 0, right: 0, zIndex: 30,
        background: badgeColor, color: '#ffffff',
        borderRadius: 12, padding: '3px 10px',
        fontSize: 11, fontWeight: 700,
        fontFamily: "'DM Sans', sans-serif",
        boxShadow: '0 2px 6px rgba(0,0,0,0.14)',
        pointerEvents: 'none',
      }}>{daysText}</div>

      {/* ── DESKTOP: stacked card effect ── */}
      <div className="upcoming-stack-desktop">
        <div style={{ position: 'relative', paddingRight: total >= 2 ? 10 : 0, paddingBottom: total >= 2 ? 10 : 0 }}>
          {total >= 3 && (
            <div style={{ position: 'absolute', inset: 0, transform: 'translate(10px,10px)', background: '#EFEEEC', borderRadius: 14, border: '1px solid #E4E2DF', zIndex: 0 }} />
          )}
          {total >= 2 && (
            <div style={{ position: 'absolute', inset: 0, transform: 'translate(5px,5px)', background: '#F5F4F2', borderRadius: 14, border: '1px solid #ECEAE8', zIndex: 1 }} />
          )}
          <div style={{ position: 'relative', zIndex: 2 }}>
            <CardFace />
          </div>
        </div>
        {/* Navigation dots */}
        {total > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 12 }}>
            {displayEvents.map((_, i) => (
              <div
                key={i}
                onClick={() => goTo(i)}
                style={{
                  width: i === idx ? 18 : 6, height: 6, borderRadius: 3,
                  background: i === idx ? '#1A1918' : '#D9D8D6',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── MOBILE: ← card ↑↓ ── */}
      <div className="upcoming-stack-mobile" style={{ display: 'none', alignItems: 'stretch', gap: 7 }}>
        {/* Left arrow */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ArrowBtn onClick={() => goTo(idx - 1)}><ChevLeft /></ArrowBtn>
        </div>
        {/* Card (narrows to flex:1) */}
        <CardFace narrow />
        {/* Right column: up + down */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <ArrowBtn onClick={() => goTo(idx - 1)}><ChevUp /></ArrowBtn>
          <ArrowBtn onClick={() => goTo(idx + 1)}><ChevDown /></ArrowBtn>
        </div>
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

// (LoanTimeline imported from @/components/LoanTimeline — stub below is dead code)
function _noop() { // eslint-disable-line no-unused-vars
  const [hoveredPt, setHoveredPt] = useState(null);
  const [range,     setRange]     = useState('6m');
  const scrollRef = useRef(null);
  const cardRef   = useRef(null);

  const LEND_COLOR  = '#03ACEA';
  const BORR_COLOR  = '#1D5B94';
  const LEND_FUTURE = '#9FD8F0';
  const BORR_FUTURE = '#7BA3C0';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMonthStart = startOfMonth(today);
  const MAX_FUTURE = addMonths(today, 120);

  const advDate = (d, freq) =>
    freq === 'weekly'    ? addDays(d, 7)  :
    freq === 'bi-weekly' ? addDays(d, 14) :
    addMonths(d, 1);

  // ── Build raw events: { date, delta } — no labels, just cashflows ─────────
  const buildRawEvents = (isLending) => {
    const events = [];
    myLoans
      .filter(l => l && (isLending ? l.lender_id : l.borrower_id) === userId &&
        (l.status === 'active' || l.status === 'completed'))
      .forEach(loan => {
        const total = loan.total_amount || loan.amount || 0;
        const freq  = loan.payment_frequency || 'monthly';
        if (loan.created_at) {
          events.push({ date: new Date(loan.created_at), delta: +total });
        }
        safePayments.filter(p => p && p.loan_id === loan.id && p.status === 'completed').forEach(p => {
          events.push({ date: new Date(p.payment_date || p.created_at), delta: -(p.amount || 0) });
        });
        if (loan.status === 'active' && loan.next_payment_date && (loan.payment_amount || 0) > 0) {
          let rem = Math.max(0, total - (loan.amount_paid || 0));
          let d   = new Date(loan.next_payment_date);
          while (rem > 0.01 && d <= MAX_FUTURE) {
            if (d > today) {
              const pay = Math.min(loan.payment_amount, rem);
              events.push({ date: new Date(d), delta: -pay });
              rem -= pay;
            }
            d = advDate(d, freq);
          }
        }
      });
    return events.sort((a, b) => a.date - b.date);
  };

  const lendingRaw  = buildRawEvents(true);
  const borrowingRaw = buildRawEvents(false);
  const allRaw = [...lendingRaw, ...borrowingRaw];
  if (allRaw.length === 0) return null;

  // Balance at a given date = sum of all deltas up to and including that date
  const balAt = (events, date) => {
    let b = 0;
    events.forEach(e => { if (e.date <= date) b += e.delta; });
    return Math.max(0, b);
  };

  // ── X range ───────────────────────────────────────────────────────────────
  const rangeStart = (() => {
    if (range === 'all') {
      const past = allRaw.filter(e => e.date <= today).map(e => e.date);
      return startOfMonth(past.length > 0 ? new Date(Math.min(...past)) : today);
    }
    const m = range === '1m' ? 1 : range === '3m' ? 3 : range === '6m' ? 6 : 12;
    return startOfMonth(addMonths(today, -m));
  })();

  const xViewEnd   = addMonths(today, 1);
  const futureDates = allRaw.filter(e => e.date > today).map(e => e.date);
  const xEnd = futureDates.length > 0
    ? addMonths(startOfMonth(new Date(Math.max(...futureDates))), 1)
    : addMonths(today, 2);

  // ── Month ticks ───────────────────────────────────────────────────────────
  const monthTicks = [];
  let mc = new Date(rangeStart);
  while (mc <= xEnd) { monthTicks.push(new Date(mc)); mc = addMonths(mc, 1); }

  // ── Monthly snapshot dots — ONE dot per month per line ───────────────────
  // Balance is snapped to: today for current month, end-of-month for all others
  const makeMonthlyDots = (events, line) =>
    monthTicks.map(m => {
      const isCurrent    = m.getFullYear() === today.getFullYear() && m.getMonth() === today.getMonth();
      const isFutureMonth = startOfMonth(m) > todayMonthStart;
      const snapDate     = isCurrent ? today : endOfMonth(m);
      const balance      = balAt(events, snapDate);
      return {
        month: m,
        balance,
        isFuture: isFutureMonth,
        label: line === 'lending'
          ? `Owed to you: ${formatMoney(balance)}`
          : `You owe: ${formatMoney(balance)}`,
      };
    });

  const lendingDots  = makeMonthlyDots(lendingRaw,  'lending');
  const borrowingDots = makeMonthlyDots(borrowingRaw, 'borrowing');

  const hasLending   = lendingDots.some(d => d.balance > 0);
  const hasBorrowing = borrowingDots.some(d => d.balance > 0);
  if (!hasLending && !hasBorrowing) return null;

  // ── SVG layout ────────────────────────────────────────────────────────────
  const PX_PER_MONTH = 80;
  const SH = 148, PL = 6, PR = 16, PT = 14, PB = 26;
  const plotH = SH - PT - PB;
  const SW    = Math.max(monthTicks.length * PX_PER_MONTH, 320);
  const plotW = SW - PL - PR;
  const span  = Math.max(xEnd - rangeStart, 1);

  const maxBal = Math.max(
    ...[...lendingDots, ...borrowingDots].map(d => d.balance),
    1
  );

  const xOf = d  => PL + ((d - rangeStart) / span) * plotW;
  const yOf = b  => PT + plotH - (b / maxBal) * plotH;

  // Polyline: connect all monthly dot positions in order
  const dotsPolyStr = (dots) =>
    dots.map(d => `${xOf(d.month).toFixed(1)},${yOf(d.balance).toFixed(1)}`).join(' ');

  // ── Auto-scroll so today+1m is at right edge of viewport ─────────────────
  useEffect(() => {
    if (!scrollRef.current) return;
    const cw = scrollRef.current.clientWidth || 380;
    const xViewEndPx = PL + ((xViewEnd - rangeStart) / span) * plotW;
    scrollRef.current.scrollLeft = Math.max(0, xViewEndPx - cw + PR + 20);
  }, [range]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Circle click: screen coords relative to card ──────────────────────────
  const handleCircleClick = (e, dot, k) => {
    e.stopPropagation();
    if (hoveredPt?.key === k) { setHoveredPt(null); return; }
    const cardRect = cardRef.current?.getBoundingClientRect();
    if (!cardRect) return;
    const cr = e.target.getBoundingClientRect();
    setHoveredPt({
      ...dot, key: k,
      tipX: cr.left + cr.width / 2 - cardRect.left,
      tipY: cr.top - cardRect.top,
    });
  };

  return (
    <div ref={cardRef} style={{ position: 'relative', minWidth: 0 }} onClick={() => setHoveredPt(null)}>      <div style={{ position: 'relative', zIndex: 1, background: '#ffffff', borderRadius: 10, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '14px 18px' }}>

        {/* ── Header row ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif" }}>
            Balance History
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {hasLending && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#787776', fontFamily: "'DM Sans', sans-serif" }}>
                <div style={{ width: 14, height: 2, borderRadius: 1, background: LEND_COLOR }} /> Lending
              </div>
            )}
            {hasBorrowing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#787776', fontFamily: "'DM Sans', sans-serif" }}>
                <div style={{ width: 14, height: 2, borderRadius: 1, background: BORR_COLOR }} /> Borrowing
              </div>
            )}
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
              <select
                value={range}
                onChange={e => { setRange(e.target.value); setHoveredPt(null); }}
                style={{
                  fontSize: 11, fontWeight: 500, color: '#03ACEA',
                  background: 'transparent', border: 'none', outline: 'none',
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                  appearance: 'none', WebkitAppearance: 'none',
                  paddingRight: 13, lineHeight: 1,
                }}
              >
                {RANGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <svg style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                width="8" height="8" viewBox="0 0 24 24" fill="none"
                stroke="#03ACEA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>
        </div>

        {/* ── Scrollable chart ── */}
        <div
          ref={scrollRef}
          style={{ overflowX: 'auto', position: 'relative', userSelect: 'none', width: '100%',
            scrollbarWidth: 'thin', scrollbarColor: '#E0DFDD transparent' }}
        >
          <svg width={SW} height={SH} viewBox={`0 0 ${SW} ${SH}`} style={{ display: 'block', overflow: 'visible' }}>
            {/* Grid lines */}
            {[0.33, 0.67, 1].map((f, i) => (
              <line key={i} x1={PL} y1={yOf(maxBal * f)} x2={SW - PR} y2={yOf(maxBal * f)} stroke="#F0EFEE" strokeWidth="1" />
            ))}
            {/* Baseline */}
            <line x1={PL} y1={PT + plotH} x2={SW - PR} y2={PT + plotH} stroke="#ECEAE8" strokeWidth="1" />
            {/* Today dashed vertical */}
            {xOf(today) >= PL && xOf(today) <= SW - PR && (
              <line x1={xOf(today)} y1={PT} x2={xOf(today)} y2={PT + plotH} stroke="#D9D8D6" strokeWidth="1" strokeDasharray="3,3" />
            )}
            {/* Month labels */}
            {monthTicks.map((m, i) => (
              <text key={i} x={xOf(m)} y={SH - 5} fontSize="8" fill="#C5C3C0" textAnchor="middle" fontFamily="DM Sans,sans-serif">
                {format(m, 'MMM')}
              </text>
            ))}
            {/* ── Lending line ── */}
            {hasLending && (
              <polyline points={dotsPolyStr(lendingDots)} fill="none" stroke={LEND_COLOR} strokeWidth="1.5" strokeLinejoin="round" />
            )}
            {/* ── Borrowing line ── */}
            {hasBorrowing && (
              <polyline points={dotsPolyStr(borrowingDots)} fill="none" stroke={BORR_COLOR} strokeWidth="1.5" strokeLinejoin="round" />
            )}
            {/* ── Lending monthly dots ── */}
            {hasLending && lendingDots.map((d, i) => {
              const k = `l${i}`;
              const isHov = hoveredPt?.key === k;
              return (
                <circle key={k}
                  cx={xOf(d.month)} cy={yOf(d.balance)}
                  r={isHov ? 5.5 : 4}
                  fill={d.isFuture ? LEND_FUTURE : LEND_COLOR}
                  stroke="white" strokeWidth="1.5"
                  style={{ cursor: 'pointer' }}
                  onClick={e => handleCircleClick(e, d, k)}
                />
              );
            })}
            {/* ── Borrowing monthly dots ── */}
            {hasBorrowing && borrowingDots.map((d, i) => {
              const k = `b${i}`;
              const isHov = hoveredPt?.key === k;
              return (
                <circle key={k}
                  cx={xOf(d.month)} cy={yOf(d.balance)}
                  r={isHov ? 5.5 : 4}
                  fill={d.isFuture ? BORR_FUTURE : BORR_COLOR}
                  stroke="white" strokeWidth="1.5"
                  style={{ cursor: 'pointer' }}
                  onClick={e => handleCircleClick(e, d, k)}
                />
              );
            })}
          </svg>
        </div>

        {/* ── Tooltip ── */}
        {hoveredPt && (() => {
          const TW   = 170;
          const cardW = cardRef.current?.getBoundingClientRect().width || 320;
          const tipX  = Math.max(8, Math.min(hoveredPt.tipX - TW / 2, cardW - TW - 8));
          const tipY  = hoveredPt.tipY - 54;
          return (
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position: 'absolute', left: tipX,
                top: tipY < 10 ? hoveredPt.tipY + 10 : tipY,
                background: '#1A1918', color: 'white',
                borderRadius: 7, padding: '6px 10px',
                fontSize: 11, fontFamily: "'DM Sans', sans-serif",
                zIndex: 30, whiteSpace: 'nowrap',
                boxShadow: '0 3px 12px rgba(0,0,0,0.22)',
                pointerEvents: 'none', lineHeight: 1.35,
              }}
            >
              <div style={{ fontWeight: 600 }}>{hoveredPt.label}</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', marginTop: 2, fontSize: 10 }}>
                {format(hoveredPt.month, 'MMM yyyy')}
              </div>
            </div>
          );
        })()}
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
  const [progressTab, setProgressTab] = useState('lending'); // 'lending' | 'borrowing'
  const [confirmPaymentTarget, setConfirmPaymentTarget] = useState(null); // { payment, loan, profile }
  const [confirmWorking, setConfirmWorking] = useState(false);
  const [viewLoanTarget, setViewLoanTarget] = useState(null);    // { loan, borrowerProfile }
  const [viewPaymentTarget, setViewPaymentTarget] = useState(null); // { payment, loan, lenderProfile }
  const [reviewOfferTarget, setReviewOfferTarget] = useState(null); // { loan, lenderProf }
  const [pendingDetailTarget, setPendingDetailTarget] = useState(null); // { type, loan?, payment?, profile?, loanForPayment? }
  const navigate = useNavigate();
  // Tasks-for-the-Week: checked IDs keyed by ISO date of week start (Monday).
  const weekStartKey = (() => {
    const d = new Date();
    const day = d.getDay(); // 0=Sun..6=Sat
    const diff = day === 0 ? -6 : 1 - day; // shift to Monday
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  })();
  const [checkedTasks, setCheckedTasks] = useState(() => {
    try {
      const raw = localStorage.getItem(`vony.tasks.${weekStartKey}`);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
  });
  const toggleTask = (id) => {
    setCheckedTasks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem(`vony.tasks.${weekStartKey}`, JSON.stringify([...next])); } catch {}
      return next;
    });
  };
  const [customTasks, setCustomTasks] = useState(() => {
    try {
      const raw = localStorage.getItem(`vony.custom-tasks.${weekStartKey}`);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const addCustomTask = (label) => {
    if (!label.trim()) return;
    const task = { id: `custom-${Date.now()}`, label: label.trim() };
    setCustomTasks(prev => {
      const next = [...prev, task];
      try { localStorage.setItem(`vony.custom-tasks.${weekStartKey}`, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [lbTab, setLbTab] = useState('lending'); // 'lending' | 'borrowing'
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
        safeEntityCall(() => Payment.list('-created_at')),
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

  // Reload when a loan status changes externally (e.g. declined from notifications popup)
  useEffect(() => {
    const handler = () => { if (authUser) loadData(); };
    window.addEventListener('loan-status-changed', handler);
    return () => window.removeEventListener('loan-status-changed', handler);
  }, [authUser]);

  const handleLogin = async () => {
    setIsAuthenticating(true);
    try { await navigateToLogin(); }
    catch (error) { console.error("Login failed:", error); }
    finally { setTimeout(() => setIsAuthenticating(false), 3000); }
  };

  const handleConfirmPayment = async () => {
    if (!confirmPaymentTarget || confirmWorking) return;
    setConfirmWorking(true);
    try {
      const { payment, loan } = confirmPaymentTarget;
      await Payment.update(payment.id, { status: 'completed' });
      if (loan) {
        const newPaid = (loan.amount_paid || 0) + (payment.amount || 0);
        const remaining = (loan.total_amount || loan.amount || 0) - newPaid;
        const loanUpdate = { amount_paid: newPaid };
        if (remaining <= 0) {
          loanUpdate.status = 'completed';
          loanUpdate.next_payment_date = null;
        } else {
          loanUpdate.next_payment_date = format(addMonths(new Date(), 1), 'yyyy-MM-dd');
        }
        await Loan.update(loan.id, loanUpdate);
      }
      setConfirmPaymentTarget(null);
      await loadData();
    } catch (e) {
      console.error('Error confirming payment:', e);
    }
    setConfirmWorking(false);
  };

  const handleRejectPayment = async () => {
    if (!confirmPaymentTarget || confirmWorking) return;
    setConfirmWorking(true);
    try {
      await Payment.update(confirmPaymentTarget.payment.id, { status: 'denied' });
      setConfirmPaymentTarget(null);
      await loadData();
    } catch (e) {
      console.error('Error rejecting payment:', e);
    }
    setConfirmWorking(false);
  };

  const handleAcceptLoanOffer = async (signature) => {
    if (!reviewOfferTarget) return;
    try {
      await Loan.update(reviewOfferTarget.loan.id, { status: 'active' });
      const agreements = await LoanAgreement.list();
      const agreement = agreements.find(a => a.loan_id === reviewOfferTarget.loan.id);
      if (agreement) {
        await LoanAgreement.update(agreement.id, {
          borrower_name: signature,
          borrower_signed_date: new Date().toISOString(),
          is_fully_signed: true,
        });
      }
      setReviewOfferTarget(null);
      await loadData();
    } catch (e) {
      console.error('Error accepting loan offer:', e);
    }
  };

  const handleDeclineLoanOffer = async () => {
    if (!reviewOfferTarget) return;
    try {
      await Loan.update(reviewOfferTarget.loan.id, { status: 'declined' });
      setReviewOfferTarget(null);
      await loadData();
    } catch (e) {
      console.error('Error declining loan offer:', e);
    }
  };

  const handleUnsendLoanOffer = async (loan) => {
    try {
      const agreements = await LoanAgreement.list();
      const agreement = agreements.find(a => a.loan_id === loan.id);
      if (agreement) await LoanAgreement.delete(agreement.id);
      await Loan.delete(loan.id);
      setPendingDetailTarget(null);
      await loadData();
    } catch (e) {
      console.error('Error unsending loan offer:', e);
    }
  };

  const handleDeletePayment = async (payment) => {
    try {
      await Payment.delete(payment.id);
      setPendingDetailTarget(null);
      await loadData();
    } catch (e) {
      console.error('Error deleting payment:', e);
    }
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
      <div style={{ position: 'relative', minHeight: '100vh', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflow: 'hidden' }}>

        {/* ── Floating hero items ── */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>

          {/* iMessage — top-left */}
          <motion.div {...floatAnim(0.2, -4)} style={{ position: 'absolute', top: '4%', left: bigScreen ? '2%' : '-1%', filter: floatShadow }}>
            <svg width="260" height="135" viewBox="0 0 260 135" fill="none"><rect width="260" height="135" rx="16" fill="#fff"/><rect width="260" height="30" fill="#F2F2F7" rx="16"/><rect y="16" width="260" height="14" fill="#F2F2F7"/><text x="130" y="21" textAnchor="middle" fontFamily="'DM Sans', sans-serif" fontSize="11" fontWeight="600" fill="#1C1C1E">Alex</text><rect x="12" y="40" width="210" height="42" rx="14" fill="#E9E9EB"/><text x="24" y="57" fontFamily="'DM Sans', sans-serif" fontSize="10.5" fill="#1C1C1E">Hey, just a reminder about</text><text x="24" y="73" fontFamily="'DM Sans', sans-serif" fontSize="10.5" fill="#1C1C1E">the $120 from last weekend</text><rect x="82" y="90" width="166" height="28" rx="14" fill="#007AFF"/><text x="96" y="108" fontFamily="'DM Sans', sans-serif" fontSize="10.5" fill="#fff">So sorry, I completely forgot</text></svg>
          </motion.div>

          {/* Post-it yellow — upper-left */}
          <motion.div {...floatAnim(0.35, 5)} style={{ position: 'absolute', top: '32%', left: bigScreen ? '13%' : '2%', filter: floatShadow }}>
            <svg width="180" height="88" viewBox="0 0 180 88" fill="none"><rect width="180" height="88" fill="#FFE082" rx="3"/><path d="M140 88L180 48V88Z" fill="#FFC107"/><text x="16" y="38" fontFamily="'DM Sans', sans-serif" fontSize="15" fontStyle="italic" fill="#5D4037">Remember to pay</text><text x="16" y="60" fontFamily="'DM Sans', sans-serif" fontSize="15" fontStyle="italic" fill="#5D4037">Oliver back for gas</text></svg>
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
            <svg width="180" height="88" viewBox="0 0 180 88" fill="none"><rect width="180" height="88" fill="#AECFF5" rx="3"/><path d="M140 88L180 48V88Z" fill="#7DB3EE"/><text x="16" y="34" fontFamily="'DM Sans', sans-serif" fontSize="13" fontStyle="italic" fill="#1A3A5C">Remind Rohan about</text><text x="16" y="55" fontFamily="'DM Sans', sans-serif" fontSize="13" fontStyle="italic" fill="#1A3A5C">the $40 he still owes</text></svg>
          </motion.div>

          {/* WhatsApp (Henry) — mid-center */}
          <motion.div {...floatAnim(0.3, 0)} style={{ position: 'absolute', top: '22%', right: '33%', filter: floatShadow }}>
            <svg width="250" height="190" viewBox="0 0 250 190" fill="none"><rect width="250" height="190" rx="16" fill="#ECE5DD"/><rect width="250" height="34" fill="#075E54" rx="16"/><rect y="16" width="250" height="18" fill="#075E54"/><text x="14" y="22" fontFamily="'DM Sans', sans-serif" fontSize="12" fontWeight="600" fill="#fff">Henry</text><rect x="12" y="44" width="180" height="24" rx="8" fill="#fff"/><text x="20" y="60" fontFamily="'DM Sans', sans-serif" fontSize="10" fill="#333">How much do I owe you again?</text><rect x="80" y="74" width="158" height="24" rx="8" fill="#DCF8C6"/><text x="90" y="90" fontFamily="'DM Sans', sans-serif" fontSize="10" fill="#333">I think $200</text><rect x="12" y="104" width="178" height="24" rx="8" fill="#fff"/><text x="20" y="120" fontFamily="'DM Sans', sans-serif" fontSize="10" fill="#333">Wait, I thought it was $180</text><rect x="50" y="134" width="188" height="40" rx="8" fill="#DCF8C6"/><text x="60" y="150" fontFamily="'DM Sans', sans-serif" fontSize="10" fill="#333">You're right, my bad forgot you</text><text x="60" y="164" fontFamily="'DM Sans', sans-serif" fontSize="10" fill="#333">gave me that $20</text></svg>
          </motion.div>

        </div>

        {/* ── Sign-in card ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} style={{ maxWidth: 400, width: '100%', position: 'relative', zIndex: 2 }}>
          <div className="glass-card" style={{ padding: 36, textAlign: 'center' }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '2.2rem', color: '#1A1918', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 20 }}>
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
  // Loans YOU sent as lender, still awaiting borrower signature
  const pendingLoanOffersSent = safeLoans.filter(loan => loan && loan.lender_id === user.id && loan.status === 'pending');
  // Payments YOU recorded that the other person hasn't confirmed yet
  const pendingPaymentsSentByMe = safePayments.filter(p => p && p.recorded_by === user.id && p.status === 'pending_confirmation');

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
  // Shared count — matches the bell bubble & NotificationsPopup
  const notifCount = countNotifications({
    userId: user.id,
    loans: safeLoans,
    payments: safePayments,
    friendships: Array.isArray(friendships) ? friendships : [],
  });

  // Time-based greeting
  const hour = new Date().getHours();
  const greeting = hour >= 5 && hour < 12 ? 'Good morning' : hour >= 12 && hour < 18 ? 'Good afternoon' : 'Good night';
  const firstName = user.full_name?.split(' ')[0] || 'User';

  // Overdue payments (for hero alert) — exclude loans that have a pending_confirmation payment
  const today = new Date();
  const overdueYouOwe = myLoans.filter(l => {
    if (!l || l.borrower_id !== user.id || l.status !== 'active' || !l.next_payment_date) return false;
    if (new Date(l.next_payment_date) >= today) return false;
    return !safePayments.some(p => p && p.loan_id === l.id && p.status === 'pending_confirmation');
  });
  const overdueOwedToYou = myLoans.filter(l => {
    if (!l || l.lender_id !== user.id || l.status !== 'active' || !l.next_payment_date) return false;
    if (new Date(l.next_payment_date) >= today) return false;
    return !safePayments.some(p => p && p.loan_id === l.id && p.status === 'pending_confirmation');
  });

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
      // Count completed AND pending_confirmation — pending means the period is covered
      const paidThisPeriod = loanPayments
        .filter(p => { const pDate = new Date(p.payment_date || p.created_at); return pDate >= periodStart && pDate <= today && (p.status === 'completed' || p.status === 'pending_confirmation'); })
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

  // Monthly scheduled-payment counts (outgoing = borrower side)
  const outCompletedCount = safePayments.filter(p => {
    if (!p || p.status !== 'completed') return false;
    const loan = myLoans.find(l => l.id === p.loan_id);
    if (!loan || loan.borrower_id !== user.id) return false;
    const pDate = new Date(p.payment_date || p.created_at);
    return pDate >= currentMonth && pDate <= currentMonthEnd;
  }).length;
  const outPendingCount = borrowedLoans.filter(l =>
    l && l.next_payment_date &&
    new Date(l.next_payment_date) >= currentMonth &&
    new Date(l.next_payment_date) <= currentMonthEnd
  ).length;
  const outScheduledTotal = outCompletedCount + outPendingCount;
  const leftToPay = Math.max(0, monthlyExpectedPay - monthlyPaidOut);

  // Incoming = lender side
  const inCompletedCount = safePayments.filter(p => {
    if (!p || p.status !== 'completed') return false;
    const loan = myLoans.find(l => l.id === p.loan_id);
    if (!loan || loan.lender_id !== user.id) return false;
    const pDate = new Date(p.payment_date || p.created_at);
    return pDate >= currentMonth && pDate <= currentMonthEnd;
  }).length;
  const inPendingCount = lentLoans.filter(l =>
    l && l.next_payment_date &&
    new Date(l.next_payment_date) >= currentMonth &&
    new Date(l.next_payment_date) <= currentMonthEnd
  ).length;
  const inScheduledTotal = inCompletedCount + inPendingCount;
  const leftToReceive = Math.max(0, monthlyExpectedReceive - monthlyReceived);

  // Helper message for "How {month} is going" card — prioritized status line.
  // Overdue cases win; otherwise we pick one of several positive variants
  // based on whichever condition is true.
  const howMonthMessage = (() => {
    if (myLoans.length === 0) {
      return { text: "No loans yet, create one when you're ready", emoji: '' };
    }
    const overdueOwedCount = overdueYouOwe.length;
    if (overdueOwedCount > 1) {
      return { text: `${overdueOwedCount} payments need your attention`, emoji: '' };
    }
    if (overdueOwedCount === 1) {
      return { text: "One quick payment and you're back on track", emoji: '' };
    }

    const EMOJIS = ['💫', '🏆', '🎉', '⚡', '🚀', '🎯', '🥇'];
    // Stable per-day pick so the emoji doesn't reshuffle on every render
    const dayKey = today.getDate() + today.getMonth() * 31;
    const pickEmoji = () => EMOJIS[dayKey % EMOJIS.length];

    // Outgoing ahead of schedule: paid out exceeds what was expected this month
    if (monthlyExpectedPay > 0 && monthlyPaidOut > monthlyExpectedPay) {
      return { text: 'Your outgoing payments are ahead of schedule', emoji: pickEmoji() };
    }

    // Paid back more than newly borrowed this month
    const borrowedThisMonth = myLoans
      .filter(l => l && l.borrower_id === user.id && l.created_at && new Date(l.created_at) >= currentMonth && new Date(l.created_at) <= currentMonthEnd)
      .reduce((sum, l) => sum + (l.amount || 0), 0);
    if (borrowedThisMonth > 0 && monthlyPaidOut > borrowedThisMonth) {
      return { text: "You've paid back more than you've borrowed this month", emoji: pickEmoji() };
    }

    // Only 1 or 2 payments left this month
    const paymentsLeftThisMonth = myLoans.filter(l =>
      l && l.borrower_id === user.id && l.status === 'active' && l.next_payment_date &&
      new Date(l.next_payment_date) >= today && new Date(l.next_payment_date) <= currentMonthEnd
    ).length;
    if (paymentsLeftThisMonth === 1 || paymentsLeftThisMonth === 2) {
      return {
        text: `Only ${paymentsLeftThisMonth} payment${paymentsLeftThisMonth === 1 ? '' : 's'} left to make this month`,
        emoji: pickEmoji(),
      };
    }

    // Any completed payments this month with no overdue → all on time
    const hasPaymentsThisMonth = safePayments.some(p => {
      if (!p || p.status !== 'completed') return false;
      const loan = myLoans.find(l => l.id === p.loan_id);
      if (!loan || loan.borrower_id !== user.id) return false;
      const pDate = new Date(p.payment_date || p.created_at);
      return pDate >= currentMonth && pDate <= currentMonthEnd;
    });
    if (hasPaymentsThisMonth) {
      return { text: 'All your payments this month have been on time', emoji: pickEmoji() };
    }

    // Default positive fallback — alternates based on day for subtle variety
    const DEFAULTS = [
      "You're on track with your payments this month",
      'Nice work, everything is on track',
    ];
    return { text: DEFAULTS[dayKey % DEFAULTS.length], emoji: pickEmoji() };
  })();

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

    const rawMax = Math.max(...data.map(d => d.owedToYou), ...data.map(d => d.youOwe), 1);
    // Round the y-axis max up to the nearest 100 so the ticks (max + half) are clean numbers
    const maxVal = Math.max(100, Math.ceil(rawMax / 100) * 100);
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
        color = isLender ? '#4F46E5' : '#03ACEA';
      } else if (loan.status === 'active') {
        description = isLender ? `${name} accepted your ${amount} loan` : `You accepted ${amount} loan from ${name}`;
        icon = 'check'; color = '#06B6D4';
      } else if (loan.status === 'declined') {
        description = isLender ? `${name} declined your ${amount} loan` : `You declined ${amount} loan from ${name}`;
        icon = 'x'; color = '#DC2626';
      } else if (loan.status === 'cancelled') {
        description = isLender ? `You cancelled ${amount} loan offer to ${name}` : `${name} cancelled their ${amount} loan offer`;
        icon = 'x'; color = '#DC2626';
      } else if (loan.status === 'completed') {
        description = isLender ? `${name} fully repaid your ${amount} loan` : `You fully repaid ${amount} loan to ${name}`;
        icon = 'check'; color = '#06B6D4';
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
        color: isBorrower ? '#4F46E5' : '#03ACEA',
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

  const SectionHeader = ({ title, linkTo, linkLabel, titleColor }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 5, marginBottom: 2 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: titleColor || '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif" }}>{title}</span>
      {linkTo && <Link to={linkTo} style={{ fontSize: 11, fontWeight: 500, color: '#03ACEA', textDecoration: 'none' }}>{linkLabel}</Link>}
    </div>
  );

  return (
    <>
    <div style={{ minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14, lineHeight: 1.5, color: '#1A1918', WebkitFontSmoothing: 'antialiased' }}>
      <MeshMobileNav user={user} activePage="Home" />

      {/* ── MESH THREE-COLUMN LAYOUT ── */}
      <div className="mesh-layout home-mesh" style={{ display: 'grid', gridTemplateColumns: '176px 1fr', gap: 0 }}>

        {/* ── LEFT: Sidebar nav ── */}
        <DesktopSidebar />

        {/* ── CENTER ── */}
        <div className="mesh-center" style={{ background: 'transparent', padding: '24px 56px 80px' }}>

          {/* Desktop page title */}
          <div className="desktop-page-title" style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.2, color: '#1A1918' }}>
              {greeting}, {firstName} 👋
            </div>
          </div>

          {/* Mobile-only page title */}
          <div className="mobile-page-title">
            <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, color: '#1A1918', marginBottom: 12 }}>
              {greeting}, {firstName} 👋
            </div>
          </div>


          {/* New user onboarding — below greeting */}
          {!hasLoans && (
            <div style={{
              marginBottom: 28, padding: '20px 22px', borderRadius: 0,
              background: 'white',
              border: '1px solid rgba(0,0,0,0.07)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.02em', marginBottom: 4, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                🎉 Welcome to Vony!
              </div>
              <div style={{ fontSize: 13, color: '#787776', lineHeight: 1.55, marginBottom: 16 }}>
                Lending money to friends has never been this easy. Start by adding a friend, then create your first loan together.
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('open-friends-popup'))}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 0,
                    background: '#03ACEA', color: 'white', textDecoration: 'none',
                    fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif",
                    border: 'none', cursor: 'pointer',
                  }}
                >
                  Find Friends
                </button>
                <Link
                  to={createPageUrl('CreateOffer')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 0,
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
                    padding: '8px 14px', borderRadius: 0,
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


          {/* Three summary cards — removed */}
          <div className="home-summary-cards" style={{ display: 'none' }}>
            {/* Next Payment Due */}
            {(() => {
              const days = nextBorrowerPayment ? Math.ceil((nextBorrowerPayment.date.getTime() - Date.now()) / 86400000) : null;
              const isLate = days !== null && days < 0;
              const daysLabel = days === null ? null : isLate ? `${Math.abs(days)}d late` : days === 0 ? 'today' : `${days}d`;
              const badgeColor = isLate ? '#E8726E' : days !== null && days <= 3 ? '#F59E0B' : '#9B9A98';
              const badgeBg = isLate ? 'rgba(232,114,110,0.08)' : days !== null && days <= 3 ? 'rgba(245,158,11,0.08)' : 'rgba(0,0,0,0.04)';
              return (
                <div className="home-blue-card home-card-npd" style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                  {/* Aurora glow — blue/purple palette */}
                  <div style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 'calc(100% + 10px)',
                    height: 'calc(100% + 10px)',
                    background: 'linear-gradient(135deg, rgb(30,58,138) 0%, rgb(29,78,216) 10%, rgb(37,99,235) 20%, rgb(59,130,246) 30%, rgb(96,165,250) 40%, rgb(56,189,248) 50%, rgb(59,130,246) 60%, rgb(37,99,235) 70%, rgb(29,78,216) 80%, rgb(30,64,175) 90%, rgb(37,99,235) 100%)',
                    filter: 'blur(5px) saturate(1.2)',
                    opacity: 0.45,
                    borderRadius: 18,
                    zIndex: 0,
                    pointerEvents: 'none',
                  }} />
                  {/* Card */}
                  <div style={{
                    position: 'relative', zIndex: 1, flex: 1,
                    padding: '12px 14px', borderRadius: 0,
                    background: '#ffffff',
                    border: '1px solid rgba(50,138,182,0.65)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  }}>
                    {daysLabel && nextBorrowerPayment && (
                      <span style={{ position: 'absolute', top: 10, right: 12, fontSize: 9, fontWeight: 700, color: badgeColor, background: badgeBg, borderRadius: 4, padding: '2px 5px', lineHeight: 1.2 }}>{daysLabel}</span>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingBottom: 5, marginBottom: 2 }}>
                      <span style={{ width: 20, height: 20, borderRadius: 6, background: '#EBF4FA', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#03ACEA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 19V5"/>
                          <polyline points="5 12 12 5 19 12"/>
                        </svg>
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif" }}>Next Payment Due</span>
                    </div>
                    {nextBorrowerPayment ? (
                      <>
                        <div style={{ textAlign: 'center', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: '#03ACEA', letterSpacing: '-0.02em', marginRight: 6, background: '#EBF4FA', padding: '2px 7px', borderRadius: 5, display: 'inline-block' }}>
                            {formatMoney(nextBorrowerPayment.payment_amount || 0)}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 400, color: '#1A1918' }}>to {nextBorrowerPayment.firstName}</span>
                        </div>
                        <div style={{ textAlign: 'left', marginTop: 6, fontSize: 8, fontWeight: 700, color: '#03ACEA', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>
                          Send before {format(nextBorrowerPayment.date, 'MMMM do')}
                        </div>
                      </>
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
                <div className="home-blue-card home-card-npi" style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
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
                  {/* Card */}
                  <div style={{
                    position: 'relative', zIndex: 1, flex: 1,
                    padding: '12px 14px', borderRadius: 0,
                    background: '#ffffff',
                    border: '1px solid rgba(50,138,182,0.65)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  }}>
                    {daysLabel && nextLenderPayment && (
                      <span style={{ position: 'absolute', top: 10, right: 12, fontSize: 9, fontWeight: 700, color: badgeColor, background: badgeBg, borderRadius: 4, padding: '2px 5px', lineHeight: 1.2 }}>{daysLabel}</span>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingBottom: 5, marginBottom: 2 }}>
                      <span style={{ width: 20, height: 20, borderRadius: 6, background: '#EBF4FA', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#03ACEA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 5v14"/>
                          <polyline points="19 12 12 19 5 12"/>
                        </svg>
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif" }}>Next Payment Incoming</span>
                    </div>
                    {nextLenderPayment ? (
                      <>
                        <div style={{ textAlign: 'center', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: '#1A1918', letterSpacing: '-0.02em', marginRight: 4 }}>
                            {formatMoney(nextLenderPayment.payment_amount || 0)}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 400, color: '#1A1918' }}>from {nextLenderPayment.firstName}</span>
                        </div>
                        <div style={{ textAlign: 'left', marginTop: 6, fontSize: 8, fontWeight: 700, color: '#03ACEA', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>
                          Expect before {format(nextLenderPayment.date, 'MMMM do')}
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#C5C3C0' }}>—</span>
                        <span style={{ fontSize: 11, color: '#9B9A98' }}>None incoming ✨</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Inbox card */}
            {(() => {
              const keyRemindersCount = overdueYouOwe.length + overdueOwedToYou.length + pendingOffers.length;
              return (
                <div className="home-card-inbox" style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                  {/* Rainbow aurora — matches notification bar */}
                  <div style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 'calc(100% + 14px)',
                    height: 'calc(100% + 14px)',
                    background: 'linear-gradient(225deg, rgb(129,140,248) 0%, rgb(99,102,241) 12%, rgb(79,70,229) 24%, rgb(67,56,202) 36%, rgb(37,99,235) 50%, rgb(59,130,246) 64%, rgb(96,165,250) 76%, rgb(56,189,248) 88%, rgb(14,165,233) 100%)',
                    filter: 'blur(8px) saturate(1.2)',
                    opacity: 0.6,
                    borderRadius: 18, zIndex: 0, pointerEvents: 'none',
                  }} />
                  {/* Card body — dark blue */}
                  <div style={{
                    position: 'relative', zIndex: 1, flex: 1,
                    padding: '12px 14px', borderRadius: 0,
                    background: '#14324D',
                    border: '1px solid rgba(99,102,241,0.4)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'center',
                    overflow: 'hidden',
                  }}>
                    {/* Subtle inner glow */}
                    <div style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, borderRadius: '50%', background: 'rgba(99,102,241,0.25)', filter: 'blur(18px)', pointerEvents: 'none' }} />
                    {/* Header row: title + View → */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 5, marginBottom: 2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(255,255,255,0.12)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#ffffff', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif" }}>Inbox</span>
                      </div>
                      <Link to={createPageUrl("Home")} style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)', textDecoration: 'none', letterSpacing: '0.01em' }}>
                        View →
                      </Link>
                    </div>
                    {/* Key reminders */}
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 5 }}>
                      {keyRemindersCount} key reminder{keyRemindersCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>

          {/* Masonry three-column layout */}
          <div className="home-two-col-row" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', gap: 24 }}>
            {/* Col 1: Coming Up This Week */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* ── Overview ── two equal-width mini-boxes */}
              {(() => {
                const borrowOwed = Math.max(0, totalBorrowedAmount - totalPaidBack);
                const lentOwed = Math.max(0, totalLentAmount - totalRepaid);
                const hasOwing = borrowedLoans.length > 0 && borrowOwed > 0;
                const hasOwed = lentLoans.length > 0 && lentOwed > 0;
                if (!hasOwing && !hasOwed) return (
                  <div style={{ position: 'relative' }}>                    <div style={{ position: 'relative', zIndex: 1, background: '#ffffff', borderRadius: 10, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '14px 18px' }}>
                      <p style={{ fontSize: 12, color: '#9B9A98', margin: 0, fontFamily: "'DM Sans', sans-serif", textAlign: 'center' }}>You have no active loans yet 🌱</p>
                    </div>
                  </div>
                );
                return (
                  <div style={{ display: 'flex', gap: 12 }}>
                    {/* Box 1 — You Owe */}
                    <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>                      <div style={{ position: 'relative', zIndex: 1, background: '#ffffff', borderRadius: 10, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '14px 14px' }}>
                        <div style={{ marginBottom: 10 }}>
                          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                            <circle cx="14" cy="14" r="13" stroke="#1D5B94" strokeWidth="1.5"/>
                            <path d="M14 19 L14 11 M10.5 14.5 L14 11 L17.5 14.5" stroke="#1D5B94" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: '#1A1918', fontFamily: "'DM Sans', sans-serif" }}>
                          You owe <span style={{ color: '#1D5B94' }}>{formatMoney(borrowOwed)}</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#9B9A98', marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>
                          across {borrowedLoans.length} loan{borrowedLoans.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    {/* Box 2 — You Are Owed */}
                    <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>                      <div style={{ position: 'relative', zIndex: 1, background: '#ffffff', borderRadius: 10, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '14px 14px' }}>
                        <div style={{ marginBottom: 10 }}>
                          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                            <circle cx="14" cy="14" r="13" stroke="#03ACEA" strokeWidth="1.5"/>
                            <path d="M14 10 L14 18 M10.5 13.5 L14 18 L17.5 13.5" stroke="#03ACEA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: '#1A1918', fontFamily: "'DM Sans', sans-serif" }}>
                          You are owed <span style={{ color: '#03ACEA' }}>{formatMoney(lentOwed)}</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#9B9A98', marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>
                          across {lentLoans.length} loan{lentLoans.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ── Upcoming Payments (row of up to 3 cards) ── */}
              {(() => {
                const now = new Date();
                const incoming = lentLoans
                  .filter(l => l.next_payment_date && new Date(l.next_payment_date) >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
                  .map(l => {
                    const p = safeAllProfiles.find(pp => pp.user_id === l.borrower_id);
                    const name = p?.full_name?.split(' ')[0] || p?.username || 'User';
                    return { id: l.id, direction: 'in', name, avatar: p?.avatar_url || p?.profile_picture_url, amount: l.payment_amount || 0, date: new Date(l.next_payment_date) };
                  });
                const outgoing = borrowedLoans
                  .filter(l => l.next_payment_date && new Date(l.next_payment_date) >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
                  .map(l => {
                    const p = safeAllProfiles.find(pp => pp.user_id === l.lender_id);
                    const name = p?.full_name?.split(' ')[0] || p?.username || 'User';
                    return { id: l.id, direction: 'out', name, avatar: p?.avatar_url || p?.profile_picture_url, amount: l.payment_amount || 0, date: new Date(l.next_payment_date) };
                  });
                const upcoming = [...incoming, ...outgoing]
                  .sort((a, b) => a.date - b.date)
                  .slice(0, 3);

                if (upcoming.length === 0) return null;

                const firstDaysAway = differenceInDays(upcoming[0].date, now);
                const nextLabel = firstDaysAway === 0 ? 'Today' : firstDaysAway === 1 ? 'Tomorrow' : `In ${firstDaysAway} days`;

                return (
                  <div className="home-card-upcoming-payments" style={{ position: 'relative' }}>                    <div style={{ position: 'relative', zIndex: 1, background: '#ffffff', borderRadius: 10, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '14px 18px' }}>
                      {/* Header row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif" }}>Upcoming Payments</div>
                        <Link
                          to={createPageUrl('Upcoming')}
                          style={{ fontSize: 11, fontWeight: 500, color: '#03ACEA', textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}
                        >
                          View full schedule →
                        </Link>
                      </div>
                      {/* Next payment subtitle */}
                      <div style={{ fontSize: 11, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif", marginBottom: 10 }}>
                        Next payment {nextLabel.toLowerCase()}
                      </div>

                      {/* Event rows */}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {upcoming.map(item => {
                          const isIncoming = item.direction === 'in';
                          const barColor = isIncoming ? '#03ACEA' : '#1D5B94';
                          const dayOfWeek = format(item.date, 'EEE');
                          const dateNum = format(item.date, 'MMM d');
                          const label = isIncoming
                            ? `Expect ${formatMoney(item.amount)} from ${item.name}`
                            : `${formatMoney(item.amount)} due to ${item.name}`;
                          return (
                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0' }}>
                              {/* Date column — day + date stacked */}
                              <div style={{ width: 52, flexShrink: 0, fontFamily: "'DM Sans', sans-serif" }}>
                                <div style={{ fontSize: 10, fontWeight: 500, color: '#9B9A98', letterSpacing: '-0.01em' }}>{dayOfWeek}</div>
                                <div style={{ fontSize: 12, fontWeight: 500, color: '#1A1918' }}>{dateNum}</div>
                              </div>
                              {/* Colored bar */}
                              <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: barColor, flexShrink: 0 }} />
                              {/* Event label */}
                              <div style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 500, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {label}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ── Insights ── */}
              {(lentLoans.length > 0 || borrowedLoans.length > 0) && (() => {
                const allActive = [...lentLoans, ...borrowedLoans];
                const overdueCount = overdueYouOwe.length + overdueOwedToYou.length;
                const onTimeCount = allActive.length - overdueCount;
                const avgInterest = allActive.length > 0
                  ? (allActive.reduce((s, l) => s + (l.interest_rate || 0), 0) / allActive.length).toFixed(1)
                  : null;
                const highestLoan = allActive.length > 0
                  ? allActive.reduce((mx, l) => ((l.total_amount || l.amount || 0) > (mx.total_amount || mx.amount || 0) ? l : mx), allActive[0])
                  : null;
                const highestProfile = highestLoan
                  ? safeAllProfiles.find(p => p.user_id === (highestLoan.lender_id === user.id ? highestLoan.borrower_id : highestLoan.lender_id))
                  : null;
                const highestName = highestProfile?.full_name?.split(' ')[0] || highestProfile?.username || null;
                const insights = [];
                if (overdueCount > 0) {
                  insights.push({ icon: '⚠️', text: `${overdueCount} payment${overdueCount !== 1 ? 's are' : ' is'} overdue`, color: '#E8726E' });
                }
                if (overdueCount === 0 && allActive.length > 0) {
                  insights.push({ icon: '✓', text: 'All loans are on track', color: '#22C55E' });
                } else if (onTimeCount > 0 && overdueCount > 0) {
                  insights.push({ icon: '✓', text: `${onTimeCount} of ${allActive.length} loans on track`, color: '#03ACEA' });
                }
                if (avgInterest !== null && parseFloat(avgInterest) > 0) {
                  insights.push({ icon: '%', text: `Avg. interest rate ${avgInterest}%`, color: '#03ACEA' });
                }
                if (highestLoan && highestName) {
                  insights.push({ icon: '↑', text: `Largest loan: ${formatMoney(highestLoan.total_amount || highestLoan.amount || 0)} with ${highestName}`, color: '#787776' });
                }
                // Prepend howMonthMessage as first insight
                const monthInsight = howMonthMessage?.text
                  ? [{ icon: howMonthMessage.emoji || '💡', text: howMonthMessage.text, color: '#03ACEA', isMonth: true }]
                  : [];
                const allInsights = [...monthInsight, ...insights];
                if (allInsights.length === 0) return null;
                return (
                  <div style={{ background: '#ffffff', borderRadius: 10, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '14px 18px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {allInsights.map((ins, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${ins.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: 11, color: ins.color, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", lineHeight: 1 }}>{ins.icon}</span>
                          </div>
                          {ins.isMonth ? (
                            <span style={{ fontSize: 12, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.4 }}>
                              <span style={{ background: '#EBF4FA', color: '#03ACEA', borderRadius: 3, padding: '1px 5px', fontWeight: 500 }}>{ins.text}</span>
                            </span>
                          ) : (
                            <span style={{ fontSize: 12, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.4 }}>{ins.text}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}


            </div>

            {/* Col 2: April at a Glance + What needs your attention + Pending */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* What needs your attention */}
              {(() => {
                const attentionItems = [];
                if (overdueYouOwe.length === 1) {
                  attentionItems.push({ type: 'overdue', text: 'You have an overdue payment' });
                } else if (overdueYouOwe.length > 1) {
                  attentionItems.push({ type: 'overdue', text: `You have ${overdueYouOwe.length} overdue payments` });
                }
                overdueOwedToYou.forEach(loan => {
                  const prof = safeAllProfiles.find(p => p.user_id === loan.borrower_id);
                  const name = prof?.full_name?.split(' ')[0] || 'Someone';
                  attentionItems.push({ type: 'overdue_incoming', text: `${name}'s payment to you is overdue` });
                });
                if (upcomingEvents.length > 0) {
                  const s = upcomingEvents[0];
                  const dText = s.days === 0 ? 'today' : `in ${s.days} day${s.days === 1 ? '' : 's'}`;
                  attentionItems.push({ type: 'due', text: `You have a payment due ${dText}` });
                }
                // Pending loan offers (lender sent you an offer)
                pendingOffers.forEach(loan => {
                  const lenderProf = safeAllProfiles.find(p => p.user_id === loan.lender_id);
                  const lName = lenderProf?.full_name?.split(' ')[0] || lenderProf?.username || 'Someone';
                  attentionItems.push({ type: 'loan_offer', text: `${lName} sent a loan offer`, loan, lenderProf });
                });
                // Friend requests
                friendRequestsInbox.forEach(req => {
                  const prof = safeAllProfiles.find(p => p.user_id === req.user_id);
                  const fName = prof?.full_name?.split(' ')[0] || prof?.username || 'Someone';
                  attentionItems.push({ type: 'friend_request', text: `${fName} sent a friend request` });
                });
                // Payments waiting for your confirmation
                paymentsToConfirm.forEach(payment => {
                  const loan = myLoans.find(l => l.id === payment.loan_id);
                  const recordedByProf = safeAllProfiles.find(p => p.user_id === payment.recorded_by);
                  const rName = recordedByProf?.full_name?.split(' ')[0] || recordedByProf?.username || 'Someone';
                  attentionItems.push({ type: 'payment_confirm', text: `Confirm ${rName}'s payment`, payment, loan, profile: recordedByProf });
                });
                const items = attentionItems.slice(0, 6);

                const AIcon = ({ type }) => {
                  const red = '#E8726E', blue = '#03ACEA', green = '#16A34A', amber = '#D97706';
                  if (type === 'overdue') return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={red} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:2}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
                  if (type === 'overdue_incoming') return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={amber} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:2}}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
                  if (type === 'due') return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={blue} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:2}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
                  if (type === 'loan_offer') return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={blue} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:2}}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
                  if (type === 'friend_request') return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={blue} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:2}}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
                  if (type === 'payment_confirm') return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:2}}><polyline points="20 6 9 17 4 12"/></svg>;
                  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={blue} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:2}}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>;
                };

                return (
                  <div className="home-card-attention" style={{ position: 'relative' }}>                    <div style={{ position: 'relative', zIndex: 1, background: '#ffffff', borderRadius: 10, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '14px 18px' }}>
                      <SectionHeader title="What needs your attention" />
                      {items.length === 0 ? (
                        <p style={{ fontSize: 12, color: '#C5C3C0', margin: 0, lineHeight: 1.45 }}>All clear, your inbox is empty 🎉</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          {items.map((item, i) => {
                            const arrowAction = (() => {
                              if (item.type === 'overdue' || item.type === 'due') return () => navigate(createPageUrl('RecordPayment'));
                              if (item.type === 'loan_offer') return () => setReviewOfferTarget({ loan: item.loan, lenderProf: item.lenderProf });
                              if (item.type === 'friend_request') return () => window.dispatchEvent(new CustomEvent('open-friends-popup', { detail: { initialRequestsOpen: true } }));
                              if (item.type === 'payment_confirm') return () => setConfirmPaymentTarget({ payment: item.payment, loan: item.loan, profile: item.profile });
                              return null;
                            })();
                            return (
                              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '3px 0' }}>
                                <AIcon type={item.type} />
                                <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.4 }}>{item.text}</span>
                                {arrowAction && (
                                  <button
                                    type="button"
                                    onClick={arrowAction}
                                    aria-label="Open"
                                    style={{
                                      flexShrink: 0, background: 'transparent', border: 'none', padding: 0,
                                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
                                      color: '#9B9A98', marginTop: 1,
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.color = '#03ACEA'}
                                    onMouseLeave={e => e.currentTarget.style.color = '#9B9A98'}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="9 18 15 12 9 6" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Monthly received / paid boxes */}
              {(monthlyExpectedReceive > 0 || monthlyExpectedPay > 0) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {/* You've received */}
                  {monthlyExpectedReceive > 0 && (
                    <div style={{ background: '#ffffff', borderRadius: 10, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '12px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#03ACEA', fontFamily: "'DM Sans', sans-serif", marginBottom: 4 }}>
                        {formatMoney(monthlyReceived)}
                      </div>
                      <div style={{ fontSize: 11, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.4 }}>
                        You've received this month
                      </div>
                      <div style={{ fontSize: 11, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif", marginTop: 3 }}>
                        of {formatMoney(monthlyExpectedReceive)} expected for {format(today, 'MMMM')}
                      </div>
                    </div>
                  )}
                  {/* You've paid */}
                  {monthlyExpectedPay > 0 && (
                    <div style={{ background: '#ffffff', borderRadius: 10, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '12px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1D5B94', fontFamily: "'DM Sans', sans-serif", marginBottom: 4 }}>
                        {formatMoney(monthlyPaidOut)}
                      </div>
                      <div style={{ fontSize: 11, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.4 }}>
                        You've paid this month
                      </div>
                      <div style={{ fontSize: 11, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif", marginTop: 3 }}>
                        of {formatMoney(monthlyExpectedPay)} due in {format(today, 'MMMM')}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>{/* end col 2 */}

            {/* Col 3: To Do This Week + combined Lending/Borrowing card */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* To Do This Week */}
              {(() => {
                const now = new Date();
                const todayDow = now.getDay();
                const mondayOffset = todayDow === 0 ? -6 : 1 - todayDow;
                const weekMonday = new Date(now);
                weekMonday.setDate(now.getDate() + mondayOffset);
                weekMonday.setHours(0, 0, 0, 0);
                const weekEnd = new Date(weekMonday);
                weekEnd.setDate(weekMonday.getDate() + 6);
                weekEnd.setHours(23, 59, 59, 999);
                const days = Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(weekMonday);
                  d.setDate(weekMonday.getDate() + i);
                  return d;
                });
                const dayLabels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
                const tasks = [];
                borrowedLoans.forEach(loan => {
                  if (!loan.next_payment_date) return;
                  const due = new Date(loan.next_payment_date);
                  if (due > weekEnd) return;
                  const otherProfile = safeAllProfiles.find(p => p.user_id === loan.lender_id);
                  const name = otherProfile?.full_name?.split(' ')[0] || otherProfile?.username || 'them';
                  const amt = formatMoney(loan.payment_amount || loan.next_payment_amount || 0);
                  tasks.push({ id: `pay-${loan.id}`, label: `Send ${amt} to ${name}`, onCheck: () => navigate(createPageUrl('RecordPayment') + `?loanId=${loan.id}`) });
                });
                borrowedLoans.forEach(loan => {
                  if (!loan.next_payment_date) return;
                  const daysAway = differenceInDays(new Date(loan.next_payment_date), now);
                  if (daysAway < 7 || daysAway > 14) return;
                  const otherProfile = safeAllProfiles.find(p => p.user_id === loan.lender_id);
                  const name = otherProfile?.full_name?.split(' ')[0] || otherProfile?.username || 'them';
                  const amt = formatMoney(loan.payment_amount || loan.next_payment_amount || 0);
                  tasks.push({ id: `plan-${loan.id}`, label: `Plan next week's ${amt} payment to ${name}` });
                });
                const isNewUser = !hasFriends && !hasLoans && pendingOffers.length === 0;
                if (isNewUser) {
                  tasks.push({ id: 'new-connect', label: 'Connect with friends', onCheck: () => window.dispatchEvent(new CustomEvent('open-friends-popup')) });
                  tasks.push({ id: 'new-loan', label: 'Create your first loan', onCheck: () => navigate(createPageUrl('CreateOffer')) });
                }
                const allTasks = [...tasks, ...customTasks];
                const sortedTasks = [...allTasks].sort((a, b) => Number(checkedTasks.has(a.id)) - Number(checkedTasks.has(b.id)));
                return (
                  <div className="home-card-tasks" style={{ position: 'relative' }}>                    <div style={{ position: 'relative', zIndex: 1, background: '#ffffff', borderRadius: 10, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '14px 18px' }}>
                      <SectionHeader title="To Do This Week" />
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginTop: 2, marginBottom: 10 }}>
                        {days.map((d, i) => {
                          const isToday = isSameDay(d, now);
                          return (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                              <span style={{ fontSize: 10, fontWeight: 500, color: isToday ? '#03ACEA' : '#9B9A98', letterSpacing: '-0.01em' }}>{dayLabels[i]}</span>
                              <span style={{ fontSize: 11, fontWeight: isToday ? 700 : 500, color: isToday ? '#03ACEA' : '#1A1918', width: 22, height: 22, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: isToday ? '#EBF4FA' : 'transparent', border: isToday ? '1.5px solid #03ACEA' : '1.5px solid transparent' }}>{d.getDate()}</span>
                            </div>
                          );
                        })}
                      </div>
                      {sortedTasks.length === 0 ? (
                        <div style={{ padding: '8px 0', fontSize: 12, color: '#9B9A98', textAlign: 'center' }}>Nothing on the list right now 🌿</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {sortedTasks.map(task => {
                            const checked = checkedTasks.has(task.id);
                            return (
                              <button key={task.id} type="button" onClick={() => { if (!checked && task.onCheck) { task.onCheck(); return; } toggleTask(task.id); }}
                                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: "'DM Sans', sans-serif", width: '100%' }}>
                                <span style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, border: checked ? '1.5px solid #03ACEA' : '1.5px solid #D9D8D6', background: checked ? '#03ACEA' : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}>
                                  {checked && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                                </span>
                                <span style={{ fontSize: 12, color: checked ? '#9B9A98' : '#1A1918', textDecoration: checked ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {addingTask && (
                        <form onSubmit={e => { e.preventDefault(); addCustomTask(newTaskText); setNewTaskText(''); setAddingTask(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 6 }}>
                          <input autoFocus value={newTaskText} onChange={e => setNewTaskText(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') { setAddingTask(false); setNewTaskText(''); } }} placeholder="Add a to-do…" style={{ flex: 1, fontSize: 12, fontFamily: "'DM Sans', sans-serif", border: 'none', borderBottom: '1.5px solid #03ACEA', outline: 'none', background: 'transparent', color: '#1A1918', padding: '2px 0' }} />
                          <button type="submit" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#03ACEA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></button>
                        </form>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                        <button type="button" onClick={() => { setAddingTask(v => !v); setNewTaskText(''); }} style={{ width: 26, height: 26, borderRadius: '50%', background: addingTask ? '#EBF4FA' : '#F4F3F1', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Add to-do">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={addingTask ? '#03ACEA' : '#787776'} strokeWidth="2.8" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Your Loans — lending + borrowing merged into one card */}
              {(() => {
                const allLoans = [
                  ...lentLoans.map(l => ({ ...l, _isLending: true })),
                  ...borrowedLoans.map(l => ({ ...l, _isLending: false })),
                ];
                return (
                  <div style={{ position: 'relative' }}>
                    <style>{`
                      @keyframes lbStatusA {
                        0%, 44% { opacity: 1; }
                        52%, 94% { opacity: 0; }
                        100% { opacity: 1; }
                      }
                      @keyframes lbStatusB {
                        0%, 44% { opacity: 0; }
                        52%, 94% { opacity: 1; }
                        100% { opacity: 0; }
                      }
                    `}</style>
                    <div className="home-card-lending-loans" style={{ position: 'relative' }}>                      <div style={{ position: 'relative', zIndex: 1, background: '#ffffff', borderRadius: 10, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '14px 18px' }}>
                        <SectionHeader title="Your Loans" linkTo={createPageUrl('LendingBorrowing') + '?tab=lending'} linkLabel="View all →" />
                        {allLoans.length === 0 ? (
                          <div style={{ padding: '8px 0', fontSize: 12, color: '#9B9A98', textAlign: 'center' }}>No active loans yet 🌱</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {allLoans.map(loan => {
                              const isLending = loan._isLending;
                              const circleColor = isLending ? '#03ACEA' : '#1D5B94';
                              const otherId = isLending ? loan.borrower_id : loan.lender_id;
                              const otherProfile = safeAllProfiles.find(p => p.user_id === otherId);
                              const name = otherProfile?.full_name?.split(' ')[0] || otherProfile?.username || 'User';
                              const total = loan.total_amount || loan.amount || 0;
                              const nextDue = loan.next_payment_date ? new Date(loan.next_payment_date) : null;
                              const hasPending = safePayments.some(p => p && p.loan_id === loan.id && p.status === 'pending_confirmation');
                              const isBehind = nextDue && nextDue < today && !hasPending;
                              const behindAmt = isBehind ? (loan.payment_amount || 0) : 0;
                              const statusLabel = isBehind ? `${formatMoney(behindAmt)} ${isLending ? 'behind' : 'overdue'}` : 'On track';
                              const statusColor = isBehind ? '#E8726E' : '#03ACEA';
                              const statusBg = isBehind ? 'rgba(232,114,110,0.08)' : 'rgba(3,172,234,0.10)';
                              const pctRepaid = total > 0 ? Math.round(((loan.amount_paid || 0) / total) * 100) : 0;
                              const subLine = isLending
                                ? `Borrowed ${formatMoney(total)} from you${loan.purpose ? ` for ${loan.purpose}` : ''}`
                                : `Lent you ${formatMoney(total)}${loan.purpose ? ` for ${loan.purpose}` : ''}`;
                              return (
                                <div key={loan.id} style={{ padding: '9px 0', display: 'flex', alignItems: 'center', gap: 9 }}>
                                  {/* Direction circle */}
                                  <div style={{ flexShrink: 0 }}>
                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                      <circle cx="5" cy="5" r="4.25" stroke={circleColor} strokeWidth="1.5"/>
                                    </svg>
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                                      <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                                      {/* Cycling badge: status ↔ % repaid */}
                                      <span style={{ flexShrink: 0, position: 'relative', display: 'inline-block', width: 96, height: 18 }}>
                                        <span style={{ position: 'absolute', inset: 0, fontSize: 10, fontWeight: 700, color: statusColor, background: statusBg, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'lbStatusA 8s ease-in-out infinite', lineHeight: 1, whiteSpace: 'nowrap' }}>{statusLabel}</span>
                                        <span style={{ position: 'absolute', inset: 0, fontSize: 10, fontWeight: 700, color: '#9B9A98', background: 'rgba(0,0,0,0.04)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'lbStatusB 8s ease-in-out infinite', lineHeight: 1, whiteSpace: 'nowrap' }}>{pctRepaid}% repaid</span>
                                      </span>
                                    </div>
                                    <div style={{ fontSize: 11, color: '#9B9A98', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subLine}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

            </div>{/* end col 3 */}
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

    {/* Loan offer accept/decline modal — opened from Inbox "loan offer" row */}
    {reviewOfferTarget && (
      <BorrowerSignatureModal
        isOpen={!!reviewOfferTarget}
        onClose={() => setReviewOfferTarget(null)}
        onSign={handleAcceptLoanOffer}
        onDecline={handleDeclineLoanOffer}
        loanDetails={reviewOfferTarget.loan}
        lenderName={reviewOfferTarget.lenderProf?.full_name || reviewOfferTarget.lenderProf?.username || 'Lender'}
        borrowerFullName={user?.full_name || user?.username || ''}
      />
    )}

    {/* Payment confirm modal */}
    {confirmPaymentTarget && createPortal(
      <div
        onClick={() => { if (!confirmWorking) setConfirmPaymentTarget(null); }}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.28)',
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20, fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: 'white', borderRadius: 16, maxWidth: 400, width: '100%',
            boxShadow: '0 24px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)',
            padding: '24px 24px 20px', position: 'relative',
          }}
        >
          {/* Close */}
          <button
            onClick={() => { if (!confirmWorking) setConfirmPaymentTarget(null); }}
            style={{
              position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: 8,
              background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#787776',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <UserAvatar
              name={confirmPaymentTarget.profile?.full_name || confirmPaymentTarget.profile?.username}
              src={confirmPaymentTarget.profile?.profile_picture_url || confirmPaymentTarget.profile?.avatar_url}
              size={40}
            />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.01em' }}>
                {confirmPaymentTarget.profile?.full_name || confirmPaymentTarget.profile?.username || 'Someone'}'s Payment
              </div>
              <div style={{ fontSize: 11, color: '#9B9A98' }}>Waiting for your confirmation</div>
            </div>
          </div>

          {/* Details */}
          <div style={{ background: '#fafafa', borderRadius: 0, border: '1px solid rgba(0,0,0,0.07)', padding: '12px 14px', marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500 }}>Amount</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.02em' }}>{formatMoney(confirmPaymentTarget.payment?.amount || 0)}</span>
            </div>
            {confirmPaymentTarget.loan && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500 }}>Loan</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918' }}>
                  {formatMoney(confirmPaymentTarget.loan.amount || 0)}{confirmPaymentTarget.loan.purpose ? ` · ${confirmPaymentTarget.loan.purpose}` : ''}
                </span>
              </div>
            )}
            {confirmPaymentTarget.payment?.payment_date && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500 }}>Date</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918' }}>
                  {format(new Date(confirmPaymentTarget.payment.payment_date), 'MMM d, yyyy')}
                </span>
              </div>
            )}
            {confirmPaymentTarget.payment?.payment_method && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500 }}>Method</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918', textTransform: 'capitalize' }}>{confirmPaymentTarget.payment.payment_method}</span>
              </div>
            )}
            {confirmPaymentTarget.payment?.notes && (
              <div>
                <div style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500, marginBottom: 3 }}>Notes</div>
                <div style={{ fontSize: 12, color: '#787776', lineHeight: 1.45 }}>{confirmPaymentTarget.payment.notes}</div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={handleRejectPayment}
              disabled={confirmWorking}
              style={{
                padding: '8px 16px', borderRadius: 9, border: '1px solid rgba(0,0,0,0.10)',
                background: 'white', fontSize: 12, fontWeight: 600, color: '#E8726E',
                cursor: confirmWorking ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif",
                opacity: confirmWorking ? 0.6 : 1,
              }}
            >
              Reject
            </button>
            <button
              onClick={handleConfirmPayment}
              disabled={confirmWorking}
              style={{
                padding: '8px 16px', borderRadius: 9, border: 'none',
                background: '#16A34A', fontSize: 12, fontWeight: 600, color: 'white',
                cursor: confirmWorking ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif",
                opacity: confirmWorking ? 0.6 : 1,
              }}
            >
              {confirmWorking ? 'Confirming…' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}

    {/* ── Pending request detail modal (loan offer or payment you sent) ── */}
    {pendingDetailTarget && createPortal(
      <div
        onClick={() => setPendingDetailTarget(null)}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.32)',
          backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)',
          zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20, fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: '#ffffff', borderRadius: 18, maxWidth: 420, width: '100%',
            boxShadow: '0 28px 72px rgba(0,0,0,0.20), 0 4px 16px rgba(0,0,0,0.08)',
            padding: '24px 24px 20px', position: 'relative',
          }}
        >
          {/* Close */}
          <button
            onClick={() => setPendingDetailTarget(null)}
            style={{
              position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: 8,
              background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#787776',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <UserAvatar
              name={pendingDetailTarget.profile?.full_name || pendingDetailTarget.profile?.username}
              src={pendingDetailTarget.profile?.profile_picture_url || pendingDetailTarget.profile?.avatar_url}
              size={42}
            />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.01em' }}>
                {pendingDetailTarget.type === 'loan'
                  ? `Loan Offer to ${pendingDetailTarget.profile?.full_name?.split(' ')[0] || pendingDetailTarget.profile?.username || 'Borrower'}`
                  : `Your ${formatMoney(pendingDetailTarget.payment?.amount || 0)} Payment`}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: pendingDetailTarget.type === 'loan' ? '#D97706' : '#9B9A98', marginTop: 2 }}>
                {pendingDetailTarget.type === 'loan' ? '⏳ Awaiting their signature' : `⏳ Waiting for ${pendingDetailTarget.profile?.full_name?.split(' ')[0] || 'them'} to confirm`}
              </div>
            </div>
          </div>

          {/* Details */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid rgba(0,0,0,0.07)', padding: '12px 14px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 9 }}>
            {pendingDetailTarget.type === 'loan' ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500 }}>Amount</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.02em' }}>{formatMoney(pendingDetailTarget.loan?.amount || pendingDetailTarget.loan?.total_amount || 0)}</span>
                </div>
                {pendingDetailTarget.loan?.interest_rate && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500 }}>Interest rate</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918' }}>{pendingDetailTarget.loan.interest_rate}% / year</span>
                  </div>
                )}
                {pendingDetailTarget.loan?.payment_frequency && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500 }}>Repayment</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918', textTransform: 'capitalize' }}>{pendingDetailTarget.loan.payment_frequency}</span>
                  </div>
                )}
                {pendingDetailTarget.loan?.repayment_period && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500 }}>Duration</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918' }}>{pendingDetailTarget.loan.repayment_period} payments</span>
                  </div>
                )}
                {pendingDetailTarget.loan?.first_payment_date && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500 }}>First payment</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918' }}>{format(new Date(pendingDetailTarget.loan.first_payment_date), 'MMM d, yyyy')}</span>
                  </div>
                )}
                {pendingDetailTarget.loan?.lender_send_funds_date && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500 }}>Funds sent by</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918' }}>{format(new Date(pendingDetailTarget.loan.lender_send_funds_date), 'MMM d, yyyy')}</span>
                  </div>
                )}
                {pendingDetailTarget.loan?.purpose && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500 }}>Purpose</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918', textAlign: 'right', maxWidth: '60%' }}>{pendingDetailTarget.loan.purpose}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500 }}>Amount</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.02em' }}>{formatMoney(pendingDetailTarget.payment?.amount || 0)}</span>
                </div>
                {pendingDetailTarget.loan && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500 }}>For loan</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918', textAlign: 'right', maxWidth: '60%' }}>
                      {formatMoney(pendingDetailTarget.loan.amount || pendingDetailTarget.loan.total_amount || 0)}{pendingDetailTarget.loan.purpose ? ` · ${pendingDetailTarget.loan.purpose}` : ''}
                    </span>
                  </div>
                )}
                {pendingDetailTarget.payment?.payment_date && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500 }}>Date recorded</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918' }}>{format(new Date(pendingDetailTarget.payment.payment_date), 'MMM d, yyyy')}</span>
                  </div>
                )}
                {pendingDetailTarget.payment?.payment_method && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500 }}>Method</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918', textTransform: 'capitalize' }}>{pendingDetailTarget.payment.payment_method}</span>
                  </div>
                )}
                {pendingDetailTarget.payment?.notes && (
                  <div>
                    <div style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500, marginBottom: 3 }}>Notes</div>
                    <div style={{ fontSize: 12, color: '#787776', lineHeight: 1.5 }}>{pendingDetailTarget.payment.notes}</div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', marginBottom: 14 }} />

          {/* Action note */}
          <div style={{ fontSize: 11, color: '#9B9A98', marginBottom: 12, lineHeight: 1.5 }}>
            {pendingDetailTarget.type === 'loan'
              ? 'Unsending will permanently remove this offer. The recipient will no longer see it in their inbox or notifications.'
              : 'Deleting will permanently remove this payment record. The recipient will no longer see it in their inbox or notifications.'}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setPendingDetailTarget(null)}
              style={{
                flex: 1, padding: '9px', borderRadius: 9, border: 'none',
                background: '#F4F3F1', fontSize: 12, fontWeight: 600, color: '#787776',
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Keep
            </button>
            <button
              onClick={() => pendingDetailTarget.type === 'loan'
                ? handleUnsendLoanOffer(pendingDetailTarget.loan)
                : handleDeletePayment(pendingDetailTarget.payment)}
              style={{
                flex: 1, padding: '9px', borderRadius: 9, border: 'none',
                background: '#E8726E', fontSize: 12, fontWeight: 600, color: 'white',
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#d45f5b'}
              onMouseLeave={e => e.currentTarget.style.background = '#E8726E'}
            >
              {pendingDetailTarget.type === 'loan' ? 'Unsend Loan Offer' : 'Delete Payment'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  );
}

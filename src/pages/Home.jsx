import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loan, Payment, PublicProfile, Friendship, LoanAgreement } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";


import { motion } from "framer-motion";
import { format, startOfMonth, endOfMonth, addMonths, addDays, isAfter, differenceInDays } from "date-fns";
import { formatMoney } from "@/components/utils/formatMoney";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toLocalDate, daysUntil as daysUntilDate } from "@/components/utils/dateUtils";
import { todayInTZ, formatTZ } from "@/components/utils/timezone";
import { countNotifications } from "@/components/utils/notificationCount";

import { Plus, CreditCard, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import DesktopSidebar from '../components/DesktopSidebar';
import MeshMobileNav from "@/components/MeshMobileNav";
import UserAvatar from "@/components/ui/UserAvatar";
import { FeatureCard } from "@/components/ui/feature-card";
import { ActivityDropdown } from "@/components/ui/activity-dropdown";
import BorrowerSignatureModal from "@/components/loans/BorrowerSignatureModal";
import { createPortal } from 'react-dom';

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

export default function Home() {
  const { user: authUser, userProfile, isLoadingAuth, navigateToLogin } = useAuth();
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
  const [, setActiveAnimKey] = useState(0);
  const [confirmPaymentTarget, setConfirmPaymentTarget] = useState(null); // { payment, loan, profile }
  const [confirmWorking, setConfirmWorking] = useState(false);
  const [reviewOfferTarget, setReviewOfferTarget] = useState(null); // { loan, lenderProf }
  const [pendingDetailTarget, setPendingDetailTarget] = useState(null); // { type, loan?, payment?, profile?, loanForPayment? }
  const navigate = useNavigate();
  const [lbTab, setLbTab] = useState('lending'); // 'lending' | 'borrowing'
  const [rankingFilterLending, setRankingFilterLending] = useState('status');
  const [rankingFilterBorrowing, setRankingFilterBorrowing] = useState('status');
  const [friendPopup, setFriendPopup] = useState(null); // { friendId, profile, x, y }
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
          loanUpdate.next_payment_date = format(addMonths(todayInTZ(), 1), 'yyyy-MM-dd');
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
  const lentLoans = myLoans.filter(l => l && l.lender_id === user.id && l.status === 'active');
  const borrowedLoans = myLoans.filter(l => l && l.borrower_id === user.id && l.status === 'active');
  const activeLoanCount = myLoans.filter(l => l && l.status === 'active').length;

  const totalLentAmount = lentLoans.reduce((sum, loan) => sum + (loan.total_amount || loan.amount || 0), 0);
  const totalRepaid = lentLoans.reduce((sum, loan) => sum + (loan.amount_paid || 0), 0);

  const totalBorrowedAmount = borrowedLoans.reduce((sum, loan) => sum + (loan.total_amount || loan.amount || 0), 0);
  const totalPaidBack = borrowedLoans.reduce((sum, loan) => sum + (loan.amount_paid || 0), 0);

  // Next payment (borrower)
  const nextBorrowerPayment = myLoans
    .filter(loan => loan && loan.borrower_id === user.id && loan.status === 'active' && loan.next_payment_date)
    .map(loan => {
      const otherUser = safeAllProfiles.find(p => p.user_id === loan.lender_id);
      return { ...loan, date: toLocalDate(loan.next_payment_date), username: otherUser?.username || 'user', firstName: otherUser?.full_name?.split(' ')[0] || otherUser?.username || 'user' };
    })
    .sort((a, b) => a.date - b.date)[0];

  const nextLenderPayment = myLoans
    .filter(loan => loan && loan.lender_id === user.id && loan.status === 'active' && loan.next_payment_date)
    .map(loan => {
      const otherUser = safeAllProfiles.find(p => p.user_id === loan.borrower_id);
      return { ...loan, date: toLocalDate(loan.next_payment_date), username: otherUser?.username || 'user', firstName: otherUser?.full_name?.split(' ')[0] || otherUser?.username || 'user' };
    })
    .sort((a, b) => a.date - b.date)[0];

  // Friends & loans booleans
  const hasLoans = activeLoanCount > 0;

  // Shared count — matches the bell bubble & NotificationsPopup
  const notifCount = countNotifications({
    userId: user.id,
    loans: safeLoans,
    payments: safePayments,
    friendships: Array.isArray(friendships) ? friendships : [],
  });

  const firstName = user.full_name?.split(' ')[0] || 'User';

  // Overdue payments (for hero alert) — exclude loans that have a pending_confirmation payment
  const today = todayInTZ();
  const overdueYouOwe = myLoans.filter(l => {
    if (!l || l.borrower_id !== user.id || l.status !== 'active' || !l.next_payment_date) return false;
    if (toLocalDate(l.next_payment_date) >= today) return false;
    return !safePayments.some(p => p && p.loan_id === l.id && p.status === 'pending_confirmation');
  });
  const overdueOwedToYou = myLoans.filter(l => {
    if (!l || l.lender_id !== user.id || l.status !== 'active' || !l.next_payment_date) return false;
    if (toLocalDate(l.next_payment_date) >= today) return false;
    return !safePayments.some(p => p && p.loan_id === l.id && p.status === 'pending_confirmation');
  });

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


  // All overdue reminders for hero alert carousel
  const overdueReminders = overdueYouOwe.map(loan => {
    const lenderProfile = safeAllProfiles.find(p => p.user_id === loan.lender_id);
    const days = Math.abs(daysUntilDate(loan.next_payment_date));
    return { loan, days, username: lenderProfile?.username || 'user', firstName: lenderProfile?.full_name?.split(' ')[0] || lenderProfile?.username || 'user', amount: loan.payment_amount || 0 };
  }).sort((a, b) => b.days - a.days);

  const alertTotal = overdueReminders.length;
  overdueCountRef.current = alertTotal;

  return (
    <>
    <div style={{ minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14, lineHeight: 1.5, color: '#1A1918', WebkitFontSmoothing: 'antialiased' }}>
      <MeshMobileNav user={user} activePage="Home" />

      {/* ── MESH THREE-COLUMN LAYOUT ── */}
      <div className="mesh-layout home-mesh" style={{ display: 'grid', gridTemplateColumns: '176px 1fr', gap: 0 }}>

        {/* ── LEFT: Sidebar nav ── */}
        <DesktopSidebar />

        {/* ── CENTER ── */}
        <div className="mesh-center" style={{ background: 'transparent', padding: '36px 72px 80px' }}>

          {/* Desktop page title */}
          <div className="desktop-page-title" style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.3, color: '#1A1918' }}>
              <div style={{ fontSize: 28 }}>Welcome back, {firstName} 👋</div>
            </div>
          </div>

          {/* Mobile-only greeting */}
          <div className="mobile-home-greeting">
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.3, color: '#1A1918', marginBottom: 12 }}>
              <div style={{ fontSize: 22 }}>Welcome back, {firstName} 👋</div>
            </div>
          </div>


          {/* New user onboarding — below greeting */}
          {!hasLoans && (
            <div style={{
              marginBottom: 28, padding: '20px 22px', borderRadius: 0,
              background: '#FEFEFE',
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
                  onClick={() => navigate(createPageUrl('Friends'))}
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
                    background: '#FEFEFE',
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
                    background: '#FEFEFE',
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

          {/* ── You are owed / You owe — one connected box with centre divider ── */}
          {(lentLoans.length > 0 || borrowedLoans.length > 0) && (() => {
            const lentOwed = Math.max(0, totalLentAmount - totalRepaid);
            const borrowOwed = Math.max(0, totalBorrowedAmount - totalPaidBack);
            const lendingPct = totalLentAmount > 0 ? Math.min(100, (totalRepaid / totalLentAmount) * 100) : 0;
            const borrowingPct = totalBorrowedAmount > 0 ? Math.min(100, (totalPaidBack / totalBorrowedAmount) * 100) : 0;

            return (
              <div style={{ display: 'flex', background: '#ffffff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: 28 }}>

                {/* Left: You are owed */}
                {lentLoans.length > 0 && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '16px 20px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#1A1918', letterSpacing: '0.04em', fontFamily: "'DM Sans', sans-serif" }}>
                        You are owed
                      </span>
                      <span style={{ fontSize: 24, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.03em', fontFamily: "'DM Sans', sans-serif", lineHeight: 1 }}>
                        {formatMoney(lentOwed)}
                      </span>
                      <div style={{ height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                        <div style={{ width: `${lendingPct}%`, height: '100%', borderRadius: 2, background: '#03ACEA' }} />
                      </div>
                      <div style={{ fontSize: 11, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif" }}>
                        {formatMoney(totalRepaid)} repaid / {formatMoney(totalLentAmount)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Vertical divider */}
                {lentLoans.length > 0 && borrowedLoans.length > 0 && (
                  <div style={{ width: 1, background: 'rgba(0,0,0,0.07)', flexShrink: 0, margin: '16px 0' }} />
                )}

                {/* Right: You owe */}
                {borrowedLoans.length > 0 && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '16px 20px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#1A1918', letterSpacing: '0.04em', fontFamily: "'DM Sans', sans-serif" }}>
                        You owe
                      </span>
                      <span style={{ fontSize: 24, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.03em', fontFamily: "'DM Sans', sans-serif", lineHeight: 1 }}>
                        {formatMoney(borrowOwed)}
                      </span>
                      <div style={{ height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                        <div style={{ width: `${borrowingPct}%`, height: '100%', borderRadius: 2, background: '#1D5B94' }} />
                      </div>
                      <div style={{ fontSize: 11, color: '#9B9A98', fontFamily: "'DM Sans', sans-serif" }}>
                        {formatMoney(totalPaidBack)} repaid / {formatMoney(totalBorrowedAmount)}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            );
          })()}



          {/* ── Activity + Lending side by side ── */}
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 280px', minWidth: 0 }}>
              <ActivityDropdown />
            </div>
            {lentLoans.length > 0 && (
              <div style={{ flex: '1 1 280px', minWidth: 0 }}>
          {/* ── Lending feature card ── */}
            <FeatureCard
              title={
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#03ACEA', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
                    </svg>
                  </span>
                  Lending
                </span>
              }
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', marginTop: -8 }}>
                {lentLoans.map(loan => {
                  const borrowerProfile = safeAllProfiles.find(p => p.user_id === loan.borrower_id);
                  const name = borrowerProfile?.full_name?.split(' ')[0] || borrowerProfile?.username || 'User';
                  const total = loan.total_amount || loan.amount || 0;
                  const paid = loan.amount_paid || 0;
                  const pct = total > 0 ? Math.min(1, paid / total) : 0;
                  const pctLabel = `${Math.round(pct * 100)}%`;
                  const nextDue = loan.next_payment_date ? toLocalDate(loan.next_payment_date) : null;
                  const isBehind = nextDue && nextDue < todayInTZ();
                  return (
                    <div key={loan.id} onClick={() => navigate(createPageUrl('LoanDetail') + '?id=' + loan.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', cursor: 'pointer', borderBottom: '1px solid rgba(0,0,0,0.05)' }}
                    >
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <UserAvatar name={borrowerProfile?.full_name || name} src={borrowerProfile?.profile_picture_url} size={38} />
                        <div style={{ position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: '50%', background: '#03ACEA', border: '1.5px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
                          </svg>
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name} borrowed {formatMoney(total)}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: isBehind ? '#E8726E' : '#03ACEA', flexShrink: 0, marginLeft: 8 }}>{pctLabel}</span>
                        </div>
                        <div style={{ height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.07)', overflow: 'hidden', marginBottom: 4 }}>
                          <div style={{ height: '100%', width: `${Math.round(pct * 100)}%`, borderRadius: 2, background: isBehind ? '#E8726E' : '#03ACEA', transition: 'width 0.3s' }} />
                        </div>
                        <div style={{ fontSize: 11, color: isBehind ? '#E8726E' : '#9B9A98' }}>
                          {formatMoney(paid)} repaid
                        </div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C4C3C1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                  );
                })}
              </div>
            </FeatureCard>
              </div>
            )}
          </div>{/* end activity + lending row */}

          {/* Two-column: left = loans, right = upcoming + summary + friends */}
          <div className="home-main-two-col" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* ── LEFT: Combined loans box ── */}
            {(lentLoans.length > 0 || borrowedLoans.length > 0) && (() => {
              const sortLoans = (loansArr, filter) => [...loansArr].sort((a, b) => {
                if (filter === 'status') { const now = todayInTZ(); const aOv = a.next_payment_date && toLocalDate(a.next_payment_date) < now; const bOv = b.next_payment_date && toLocalDate(b.next_payment_date) < now; if (aOv && !bOv) return -1; if (!aOv && bOv) return 1; const dA = a.next_payment_date ? toLocalDate(a.next_payment_date) : new Date('2099-01-01'); const dB = b.next_payment_date ? toLocalDate(b.next_payment_date) : new Date('2099-01-01'); return dA - dB; }
                if (filter === 'highest_interest') return (b.interest_rate || 0) - (a.interest_rate || 0);
                if (filter === 'lowest_interest') return (a.interest_rate || 0) - (b.interest_rate || 0);
                if (filter === 'highest_payment') return (b.payment_amount || 0) - (a.payment_amount || 0);
                if (filter === 'lowest_payment') return (a.payment_amount || 0) - (b.payment_amount || 0);
                if (filter === 'soonest_deadline') { const dA = a.next_payment_date ? toLocalDate(a.next_payment_date) : new Date('2099-01-01'); const dB = b.next_payment_date ? toLocalDate(b.next_payment_date) : new Date('2099-01-01'); return dA - dB; }
                if (filter === 'largest_amount') return (b.total_amount || b.amount || 0) - (a.total_amount || a.amount || 0);
                if (filter === 'smallest_amount') return (a.total_amount || a.amount || 0) - (b.total_amount || b.amount || 0);
                if (filter === 'most_repaid') { const pA = (a.total_amount||a.amount||0)>0?(a.amount_paid||0)/(a.total_amount||a.amount||1):0; const pB = (b.total_amount||b.amount||0)>0?(b.amount_paid||0)/(b.total_amount||b.amount||1):0; return pB-pA; }
                if (filter === 'least_repaid') { const pA = (a.total_amount||a.amount||0)>0?(a.amount_paid||0)/(a.total_amount||a.amount||1):0; const pB = (b.total_amount||b.amount||0)>0?(b.amount_paid||0)/(b.total_amount||b.amount||1):0; return pA-pB; }
                if (filter === 'most_recent') return new Date(b.created_at) - new Date(a.created_at);
                return 0;
              });

              const renderLoanRow = (loan, isLending) => {
                const accentCol = isLending ? '#03ACEA' : '#1D5B94';
                const otherId = isLending ? loan.borrower_id : loan.lender_id;
                const otherProfile = safeAllProfiles.find(p => p.user_id === otherId);
                const name = otherProfile?.full_name?.split(' ')[0] || otherProfile?.username || 'User';
                const total = loan.total_amount || loan.amount || 0;
                const amountPaid = loan.amount_paid || 0;
                const pct = total > 0 ? Math.min(1, amountPaid / total) : 0;
                const nextDue = loan.next_payment_date ? toLocalDate(loan.next_payment_date) : null;
                const hasPending = safePayments.some(p => p && p.loan_id === loan.id && p.status === 'pending_confirmation');
                const isBehind = nextDue && nextDue < today && !hasPending;
                const titleLine = isLending
                  ? `${name} borrowed ${formatMoney(total)}`
                  : `${name} lent you ${formatMoney(total)}`;
                return (
                  <div onClick={() => navigate(createPageUrl('LoanDetail') + '?id=' + loan.id)} style={{ padding: '10px 0', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
                    {/* Avatar with icon badge */}
                    <div style={{ position: 'relative', flexShrink: 0, width: 36, height: 36 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 18, background: '#F4F4F5', overflow: 'hidden' }}>
                        <UserAvatar
                          name={name}
                          src={otherProfile?.profile_picture_url}
                          size={36}
                          radius={18}
                        />
                      </div>
                      {/* Badge */}
                      <div style={{
                        position: 'absolute', bottom: -2, right: -2,
                        width: 16, height: 16, borderRadius: '50%',
                        background: isLending ? '#03ACEA' : '#1D5B94',
                        border: '1.5px solid white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isLending ? (
                          /* arrow up-right = lent out */
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
                          </svg>
                        ) : (
                          /* arrow down-left = borrowed/received */
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="17" y1="7" x2="7" y2="17"/><polyline points="17 17 7 17 7 7"/>
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* Name line + repaid subtitle + bar */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                          {titleLine}
                        </span>
                      </div>
                      {/* Repaid subtitle */}
                      <div style={{ fontSize: 12, color: isBehind ? '#E8726E' : '#787776', fontFamily: "'DM Sans', sans-serif", marginBottom: 5 }}>
                        {formatMoney(amountPaid)} repaid of {formatMoney(total)}
                      </div>
                      {/* Progress bar */}
                      <div style={{ height: 5, borderRadius: 3, background: 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.round(pct * 100)}%`, borderRadius: 3, background: isBehind ? '#E8726E' : accentCol, transition: 'width 0.3s' }} />
                      </div>
                    </div>

                    {/* Arrow */}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C4C3C1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                );
              };

              const isLendingTab = lbTab === 'lending';
              const activeFilter = isLendingTab ? rankingFilterLending : rankingFilterBorrowing;
              const setActiveFilter = isLendingTab ? setRankingFilterLending : setRankingFilterBorrowing;
              const activeLoans = isLendingTab ? sortLoans(lentLoans, rankingFilterLending) : sortLoans(borrowedLoans, rankingFilterBorrowing);

              const SortDropdown = ({ value, onChange }) => (
                <Select value={value} onValueChange={onChange}>
                  <SelectTrigger className="w-auto border-0 p-0 shadow-none focus:ring-0" style={{ background: 'transparent', color: '#03ACEA', fontSize: 11, fontWeight: 500, fontFamily: "'DM Sans', sans-serif", height: 'auto', gap: 3 }}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="highest_interest">Highest Interest Rate</SelectItem>
                    <SelectItem value="lowest_interest">Lowest Interest Rate</SelectItem>
                    <SelectItem value="highest_payment">Highest Payment</SelectItem>
                    <SelectItem value="lowest_payment">Lowest Payment</SelectItem>
                    <SelectItem value="soonest_deadline">Soonest Deadline</SelectItem>
                    <SelectItem value="largest_amount">Largest Amount</SelectItem>
                    <SelectItem value="smallest_amount">Smallest Amount</SelectItem>
                    <SelectItem value="most_repaid">Most Repaid</SelectItem>
                    <SelectItem value="least_repaid">Least Repaid</SelectItem>
                    <SelectItem value="most_recent">Most Recently Created</SelectItem>
                  </SelectContent>
                </Select>
              );

              return (
                <div>
                  {/* Section title + sort */}
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {['lending', 'borrowing'].map(tab => (
                        <button key={tab} onClick={() => setLbTab(tab)} style={{
                          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                          fontSize: 22, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
                          letterSpacing: '-0.02em',
                          color: lbTab === tab ? '#1A1918' : '#C4C3C1',
                          transition: 'color 0.15s',
                        }}>
                          {tab === 'lending' ? 'Lending' : 'Borrowing'}
                        </button>
                      ))}
                    </div>
                    <div style={{ flex: 1 }} />
                    <SortDropdown value={activeFilter} onChange={setActiveFilter} />
                  </div>
                  {/* Loan rows */}
                  {activeLoans.length === 0
                    ? <div style={{ fontSize: 13, color: '#9B9A98', padding: '8px 0' }}>No active {lbTab} 🌱</div>
                    : activeLoans.map((l, idx) => (
                        <div key={l.id}>
                          {renderLoanRow(l, isLendingTab, idx, activeFilter)}
                        </div>
                      ))
                  }
                </div>
              );
            })()}

            {/* ── RIGHT: Upcoming + Monthly Summary + Friends ── */}
            <div className="home-right-col" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* Upcoming Payments — no box */}
              {(() => {
                const now = todayInTZ();
                const incoming = lentLoans
                  .filter(l => l.next_payment_date && toLocalDate(l.next_payment_date) >= now)
                  .map(l => {
                    const p = safeAllProfiles.find(pp => pp.user_id === l.borrower_id);
                    const name = p?.full_name?.split(' ')[0] || p?.username || 'User';
                    return { id: l.id, direction: 'in', name, amount: l.payment_amount || 0, date: toLocalDate(l.next_payment_date), reason: l.purpose || null };
                  });
                const outgoing = borrowedLoans
                  .filter(l => l.next_payment_date && toLocalDate(l.next_payment_date) >= now)
                  .map(l => {
                    const p = safeAllProfiles.find(pp => pp.user_id === l.lender_id);
                    const name = p?.full_name?.split(' ')[0] || p?.username || 'User';
                    return { id: l.id, direction: 'out', name, amount: l.payment_amount || 0, date: toLocalDate(l.next_payment_date), reason: l.purpose || null };
                  });
                const upcoming = [...incoming, ...outgoing].sort((a, b) => a.date - b.date).slice(0, 3);
                if (upcoming.length === 0) return null;
                const firstDaysAway = differenceInDays(upcoming[0].date, now);
                const nextLabel = firstDaysAway === 0 ? 'Today' : firstDaysAway === 1 ? 'Tomorrow' : `In ${firstDaysAway} days`;
                return (
                  <div className="home-card-upcoming-payments">
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
                      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1A1918', margin: 0, fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.02em' }}>Upcoming Payments</h2>
                      <Link to={createPageUrl('Upcoming')} style={{ fontSize: 13, fontWeight: 500, color: '#03ACEA', textDecoration: 'none', fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>
                        View all →
                      </Link>
                    </div>
                    <div style={{ fontSize: 13, color: '#787776', fontFamily: "'DM Sans', sans-serif", marginBottom: 12 }}>
                      Next payment {nextLabel.toLowerCase()}
                    </div>
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
                          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                            <div style={{ width: 52, flexShrink: 0, fontFamily: "'DM Sans', sans-serif" }}>
                              <div style={{ fontSize: 11, fontWeight: 500, color: '#9B9A98', letterSpacing: '-0.01em' }}>{dayOfWeek}</div>
                              <div style={{ fontSize: 13, fontWeight: 500, color: '#787776' }}>{dateNum}</div>
                            </div>
                            <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: barColor, flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span style={{ fontSize: 15, fontWeight: 600, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                              {item.reason && <span style={{ fontSize: 13, color: '#787776', fontFamily: "'DM Sans', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.reason}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}



            </div>{/* end right col */}

          </div>{/* end two-column layout */}

          {/* Quick Links section */}
          {(() => {
            const quickLinks = [
              {
                label: 'Create a Loan',
                sub: 'Set up a new lending or borrowing agreement',
                href: createPageUrl('CreateOffer'),
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
                  </svg>
                ),
              },
              {
                label: 'Log a Payment',
                sub: 'Record a payment made or received',
                href: createPageUrl('RecordPayment'),
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/><path d="M9 11l2 2 4-4" strokeWidth="1.9"/>
                  </svg>
                ),
              },
              {
                label: 'Plan Your Month',
                sub: 'View upcoming payments and schedule',
                href: createPageUrl('PlanYourMonth'),
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                ),
              },
              {
                label: 'Lending & Borrowing Records',
                sub: 'Signed loan agreements, promissory notes and schedules',
                href: createPageUrl('LoanAgreements'),
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                  </svg>
                ),
              },
              {
                label: 'Transactions & Activity',
                sub: 'Payment history and all loan activity',
                href: createPageUrl('RecentActivity'),
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                ),
              },
              {
                label: 'Learn',
                sub: 'Guides, tips, and help resources',
                href: createPageUrl('Learn'),
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                  </svg>
                ),
              },
              {
                label: 'Loan Help',
                sub: 'Understand loan types, terms and FAQs',
                href: createPageUrl('LoanHelp'),
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                ),
              },
            ];
            return (
              <div style={{ marginTop: 32 }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1A1918', margin: '0 0 16px', fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.02em' }}>
                  Quick actions
                </h2>
                <div style={{ background: '#ffffff', borderRadius: 14, overflow: 'hidden' }}>
                  {quickLinks.map((item, i) => (
                    <div
                      key={i}
                      onClick={() => navigate(item.href)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '14px 4px',
                        borderBottom: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ color: '#1A1918', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36 }}>
                        {item.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.01em' }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: 13, color: '#787776', fontFamily: "'DM Sans', sans-serif", marginTop: 1 }}>
                          {item.sub}
                        </div>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C4C3C1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
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

    {/* Friend action popup */}
    {friendPopup && createPortal(
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9000 }}
        onClick={() => setFriendPopup(null)}
      >
        <div
          style={{
            position: 'fixed',
            top: friendPopup.y,
            left: Math.min(friendPopup.x - 80, (typeof window !== 'undefined' ? window.innerWidth : 800) - 180),
            background: '#fff',
            borderRadius: 8,
            boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
            padding: '6px 0',
            minWidth: 160,
            zIndex: 9001,
            fontFamily: "'DM Sans', sans-serif",
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: '#787776', padding: '4px 12px 8px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            @{friendPopup.profile?.username || '?'}
          </div>
          <button
            type="button"
            onClick={() => { setFriendPopup(null); navigate(createPageUrl('CreateOffer')); }}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 12, fontWeight: 500, color: '#1A1918', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Create a Loan
          </button>
          {myLoans.some(l => l.status === 'active' && (l.lender_id === friendPopup.friendId || l.borrower_id === friendPopup.friendId)) && (
            <button
              type="button"
              onClick={() => { setFriendPopup(null); navigate(createPageUrl('RecordPayment')); }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 12, fontWeight: 500, color: '#1A1918', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Log a Payment
            </button>
          )}
        </div>
      </div>,
      document.body
    )}

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
                  {format(toLocalDate(confirmPaymentTarget.payment.payment_date), 'MMM d, yyyy')}
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
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918' }}>{format(toLocalDate(pendingDetailTarget.loan.first_payment_date), 'MMM d, yyyy')}</span>
                  </div>
                )}
                {pendingDetailTarget.loan?.lender_send_funds_date && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500 }}>Funds sent by</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918' }}>{format(toLocalDate(pendingDetailTarget.loan.lender_send_funds_date), 'MMM d, yyyy')}</span>
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
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918' }}>{format(toLocalDate(pendingDetailTarget.payment.payment_date), 'MMM d, yyyy')}</span>
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


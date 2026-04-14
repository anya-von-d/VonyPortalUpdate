import React, { useState, useEffect, useRef } from "react";
import { Payment, Loan, User, PublicProfile } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  DollarSign, CheckCircle, CreditCard, Banknote, Smartphone, ChevronDown,
  AlertCircle, ArrowRight, ArrowLeft, X, Clock, FileText
} from "lucide-react";
import { format, addMonths } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { AnimatedCheckmark } from "@/components/ui/animations";
import SidebarBottomSection from '../components/SidebarBottomSection';
import MeshMobileNav from "@/components/MeshMobileNav";
import UserAvatar from "@/components/ui/UserAvatar";

const SHADOW = '0px 50px 40px rgba(0,0,0,0.02), 0px 50px 40px rgba(0,0,0,0.04), 0px 20px 40px rgba(0,0,0,0.06), 0px 3px 10px rgba(0,0,0,0.12)';

const PAYMENT_METHODS = [
  { id: 'venmo', label: 'Venmo', icon: Smartphone, color: '#3b82f6' },
  { id: 'zelle', label: 'Zelle', icon: Smartphone, color: '#8b5cf6' },
  { id: 'cashapp', label: 'Cash App', icon: DollarSign, color: '#22c55e' },
  { id: 'paypal', label: 'PayPal', icon: CreditCard, color: '#2563eb' },
  { id: 'cash', label: 'Cash', icon: Banknote, color: '#10b981' },
  { id: 'other', label: 'Other', icon: DollarSign, color: '#787776' },
];

const ROLE_OPTIONS = [
  { id: 'all', label: 'All Roles' },
  { id: 'lender', label: 'You are the Lender' },
  { id: 'borrower', label: 'You are the Borrower' },
];

const generateTransactionId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `VNY-${timestamp}-${random}`.toUpperCase();
};

/* ── SingleSelectDropdown ────────────────────────────────── */
function SingleSelectDropdown({ options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const current = options.find(o => o.id === selected) || options[0];
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
        border: '1px solid rgba(0,0,0,0.06)', background: selected !== 'all' ? 'rgba(3,172,234,0.08)' : 'white',
        fontSize: 13, fontWeight: 500, color: '#1A1918', cursor: 'pointer',
        fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', transition: 'background 0.15s',
      }}>
        {current.label}
        <ChevronDown size={14} style={{ opacity: 0.5, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: 220,
          background: 'white', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.06)', zIndex: 50, padding: 6,
        }}>
          {options.map(opt => (
            <button key={opt.id} onClick={() => { onChange(opt.id); setOpen(false); }} style={{
              display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8,
              border: 'none', cursor: 'pointer', fontSize: 13, color: '#1A1918',
              background: selected === opt.id ? 'rgba(3,172,234,0.08)' : 'transparent',
              fontWeight: selected === opt.id ? 600 : 400, fontFamily: "'DM Sans', sans-serif",
            }}
              onMouseEnter={e => { if (selected !== opt.id) e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
              onMouseLeave={e => { if (selected !== opt.id) e.currentTarget.style.background = 'transparent'; }}
            >{opt.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */
export default function RecordPayment() {
  const { user: authUser, userProfile, logout } = useAuth();
  const user = userProfile ? { ...userProfile, id: authUser?.id } : null;
  const navigate = useNavigate();

  // Data
  const [loans, setLoans] = useState([]);
  const [allLoans, setAllLoans] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Wizard
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedLoan, setSelectedLoan] = useState(null);

  // Payment form
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [error, setError] = useState('');

  // Filters
  const [roleFilter, setRoleFilter] = useState('all');
  const [friendFilter, setFriendFilter] = useState('all');

  // Approval
  const [processingId, setProcessingId] = useState(null);
  const [confirmingDeny, setConfirmingDeny] = useState(null);






  useEffect(() => { if (user?.id) loadData(); }, [user?.id]);

  // Confetti when payment is successfully recorded
  useEffect(() => {
    if (isSuccess) {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.55 },
        colors: ['#03ACEA', '#7C3AED', '#60C4F8', '#ffffff', '#A78BFA'],
        zIndex: 9999,
      });
      setTimeout(() => {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { x: 0.2, y: 0.6 },
          colors: ['#03ACEA', '#7C3AED'],
          zIndex: 9999,
        });
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { x: 0.8, y: 0.6 },
          colors: ['#03ACEA', '#7C3AED'],
          zIndex: 9999,
        });
      }, 250);
    }
  }, [isSuccess]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedLoans, fetchedProfiles, fetchedPayments] = await Promise.all([
        Loan.list('-created_at').catch(() => []),
        PublicProfile.list().catch(() => []),
        Payment.list('-created_at').catch(() => []),
      ]);

      setAllLoans(fetchedLoans);
      setProfiles(fetchedProfiles);
      setAllPayments(fetchedPayments);

      const userActiveLoans = fetchedLoans.filter(l =>
        (l.lender_id === user.id || l.borrower_id === user.id) && l.status === 'active'
      );
      setLoans(userActiveLoans);

      const userLoanIds = fetchedLoans
        .filter(l => l.lender_id === user.id || l.borrower_id === user.id)
        .map(l => l.id);
      const pending = fetchedPayments.filter(p =>
        p.status === 'pending_confirmation' && userLoanIds.includes(p.loan_id)
      );
      setPendingPayments(pending);
    } catch (err) {
      console.error("Error loading data:", err);
    }
    setIsLoading(false);
  };

  const getUserById = (userId) => {
    const p = profiles.find(pr => pr.user_id === userId);
    return p || { username: 'user', full_name: 'Unknown User', profile_picture_url: null };
  };

  const getOtherParty = (loan) => {
    const otherId = loan.lender_id === user?.id ? loan.borrower_id : loan.lender_id;
    return getUserById(otherId);
  };

  const getRemainingBalance = (loan) => {
    return (loan.total_amount || loan.amount || 0) - (loan.amount_paid || 0);
  };

  const getSuggestedPayment = (loan) => {
    const remaining = getRemainingBalance(loan);
    return Math.min(loan.payment_amount || 0, remaining);
  };

  const isUserLender = (loan) => loan.lender_id === user?.id;

  /* ── Filters ────────────────────────────────────────────── */
  const friendOptions = (() => {
    const ids = [...new Set(loans.map(l => l.lender_id === user?.id ? l.borrower_id : l.lender_id))];
    return [{ id: 'all', label: 'All Friends' }, ...ids.map(id => {
      const p = getUserById(id);
      return { id, label: p.full_name || p.username };
    }).sort((a, b) => a.label.localeCompare(b.label))];
  })();

  const filteredLoans = loans.filter(loan => {
    if (roleFilter === 'lender' && loan.lender_id !== user?.id) return false;
    if (roleFilter === 'borrower' && loan.borrower_id !== user?.id) return false;
    if (friendFilter !== 'all') {
      const otherId = loan.lender_id === user?.id ? loan.borrower_id : loan.lender_id;
      if (otherId !== friendFilter) return false;
    }
    return true;
  });

  const hasAnyFilter = roleFilter !== 'all' || friendFilter !== 'all';
  const clearFilters = () => { setRoleFilter('all'); setFriendFilter('all'); };

  /* ── Loan selection ──────────────────────────────────────── */
  const handleSelectLoan = (loan) => {
    setSelectedLoan(loan);
    setAmount('');
    setPaymentMethod('');
    setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
    setError('');
    setCurrentStep(1);
    setIsSuccess(false);
    setTransactionId('');
  };

  /* ── Validation + submission ────────────────────────────── */
  const handleContinue = () => {
    let valid = true;
    if (!amount || parseFloat(amount) <= 0) { setError('Enter a valid amount'); valid = false; }
    else if (selectedLoan && parseFloat(amount) > getRemainingBalance(selectedLoan)) { setError('Amount exceeds remaining balance'); valid = false; }
    if (!paymentMethod) { setError('Select a payment method'); valid = false; }
    if (valid) { setError(''); setCurrentStep(2); }
  };

  const handleConfirmPayment = async () => {
    if (!selectedLoan || isProcessing) return;
    setIsProcessing(true);
    setError('');
    try {
      const resolvedUser = await User.me();
      const txnId = generateTransactionId();
      const methodLabel = PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label || paymentMethod;
      await Payment.create({
        loan_id: selectedLoan.id,
        amount: parseFloat(amount),
        payment_date: paymentDate,
        payment_method: paymentMethod,
        recorded_by: resolvedUser.id,
        status: 'pending_confirmation',
        notes: `${methodLabel} payment of $${parseFloat(amount).toFixed(2)} via ${methodLabel} [Ref: ${txnId}]`,
      });
      setTransactionId(txnId);
      setIsSuccess(true);
      setCurrentStep(3);

      // Fire confetti
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#03ACEA', '#7C3AED', '#60C4F8', '#A78BFA'] });
      setTimeout(() => confetti({ particleCount: 50, spread: 100, origin: { y: 0.5 }, colors: ['#03ACEA', '#7C3AED'] }), 300);

      setTimeout(() => loadData(), 2000);
    } catch (err) {
      console.error("Error recording payment:", err);
      setError('Failed to record payment. Please try again.');
      setCurrentStep(1);
    }
    setIsProcessing(false);
  };

  /* ── Payment approval handlers ──────────────────────────── */
  const handleApprovePayment = async (payment) => {
    setProcessingId(payment.id);
    try {
      await Payment.update(payment.id, { status: 'completed' });
      const loan = allLoans.find(l => l.id === payment.loan_id);
      if (loan) {
        const newPaid = (loan.amount_paid || 0) + payment.amount;
        const remaining = (loan.total_amount || 0) - newPaid;
        const loanUpdate = { amount_paid: newPaid };
        if (remaining <= 0.01) {
          loanUpdate.status = 'completed';
          loanUpdate.next_payment_date = null;
        } else {
          loanUpdate.next_payment_date = format(addMonths(new Date(), 1), 'yyyy-MM-dd');
        }
        await Loan.update(loan.id, loanUpdate);
      }
      loadData();
    } catch (err) { console.error("Error confirming payment:", err); }
    setProcessingId(null);
  };

  const handleDenyPayment = async () => {
    if (!confirmingDeny) return;
    setProcessingId(confirmingDeny.id);
    setConfirmingDeny(null);
    try {
      await Payment.update(confirmingDeny.id, { status: 'denied' });
      loadData();
    } catch (err) { console.error("Error denying payment:", err); }
    setProcessingId(null);
  };

  /* ── Pending payment categorization ─────────────────────── */
  const paymentsToConfirm = pendingPayments.filter(p => p.recorded_by !== user?.id);
  const paymentsYouRecorded = pendingPayments.filter(p => p.recorded_by === user?.id);

  const getPaymentLoan = (payment) => allLoans.find(l => l.id === payment.loan_id);

  /* ── Helpers ────────────────────────────────────────────── */
  const nameOrYou = (userId) => {
    if (userId === user?.id) return 'you';
    const p = getUserById(userId);
    return p.full_name || p.username;
  };

  const nameOrYouCapitalized = (userId) => {
    if (userId === user?.id) return 'You';
    const p = getUserById(userId);
    return p.full_name || p.username;
  };

  /* ── Upcoming payments for right panel ──────────────────── */
  const upcomingPayments = allLoans
    .filter(l => l.status === 'active' && l.next_payment_date)
    .map(l => {
      const isLender = l.lender_id === user?.id;
      const otherId = isLender ? l.borrower_id : l.lender_id;
      const otherProfile = profiles.find(p => p.user_id === otherId);
      const days = Math.ceil((new Date(l.next_payment_date) - new Date()) / 86400000);
      return { ...l, isLender, otherName: otherProfile?.full_name?.split(' ')[0] || 'User', days };
    })
    .sort((a, b) => new Date(a.next_payment_date) - new Date(b.next_payment_date))
    .slice(0, 6);

  /* ── RightSection component ──────────────────────────────── */
  const RightSection = ({ title, children }) => (
    <div style={{ marginBottom: 40 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 9 }}>{title}</div>
      <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', marginBottom: 14 }} />
      {children}
    </div>
  );

  /* ── PageCard component ──────────────────────────────────── */
  const PageCard = ({ title, headerRight, children, style, highlight }) => (
    <div style={{ marginBottom: 24, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: highlight ? '#03ACEA' : '#9B9A98', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{title}</div>
        {headerRight && <div style={{ flexShrink: 0 }}>{headerRight}</div>}
      </div>
      <div style={{ height: 1, background: highlight ? 'rgba(3,172,234,0.2)' : 'rgba(0,0,0,0.06)', marginBottom: 14 }} />
      <div style={{ overflow: 'visible' }}>{children}</div>
    </div>
  );

  /* ── Loading state ──────────────────────────────────────── */
  if (isLoading && !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid #03ACEA', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════ */
  return (
    <>
      {/* Deny confirmation modal */}
      <AnimatePresence>
        {confirmingDeny && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={() => setConfirmingDeny(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ background: 'white', borderRadius: 20, maxWidth: 420, width: '100%', padding: 32, boxShadow: '0 24px 48px rgba(0,0,0,0.12)' }}
            >
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(232,114,110,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <AlertCircle size={24} style={{ color: '#E8726E' }} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1A1918', textAlign: 'center', margin: '0 0 8px' }}>Deny Payment?</h3>
              <p style={{ fontSize: 13, color: '#787776', textAlign: 'center', margin: '0 0 24px', lineHeight: 1.6 }}>
                Are you sure you didn't receive this payment? If so click deny to let {nameOrYou(confirmingDeny.recorded_by) === 'you' ? 'them' : `${getUserById(confirmingDeny.recorded_by).full_name || getUserById(confirmingDeny.recorded_by).username}`} know
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setConfirmingDeny(null)} style={{
                  flex: 1, padding: '10px 0', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)',
                  background: 'white', fontSize: 13, fontWeight: 600, color: '#787776', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                }}>Cancel</button>
                <button onClick={handleDenyPayment} style={{
                  flex: 1, padding: '10px 0', borderRadius: 12, border: 'none',
                  background: '#E8726E', fontSize: 13, fontWeight: 600, color: 'white', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                }}>Deny Payment</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <MeshMobileNav user={user} activePage="Record Payment" />
      <div className="mesh-layout" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 0, minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14, lineHeight: 1.5, color: '#1A1918', WebkitFontSmoothing: 'antialiased' }}>

        {/* Col 1: left nav */}
        <div className="mesh-left" style={{ background: '#fafafa', borderRight: '1px solid rgba(0,0,0,0.06)' }}>
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
              {/* Coming Soon section */}
              <div style={{ marginTop: 16, marginBottom: 4, paddingLeft: 12 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Coming Soon</span>
              </div>
              {[
                { label: 'Learn', to: createPageUrl("ComingSoon") },
                { label: 'Loan Help', to: createPageUrl("LoanHelp") },
              ].map(({ label, to }) => {
                const soonIcons = {
                  'Learn': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
                  'Loan Help': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
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
                    <span style={{ fontSize: 8, fontWeight: 700, color: '#9B9A98', background: 'rgba(0,0,0,0.05)', borderRadius: 4, padding: '2px 6px', letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1.2, flexShrink: 0 }}>SOON</span>
                  </Link>
                );
              })}
            </nav>
            <SidebarBottomSection />
          </div>
        </div>

        {/* Col 2: center content */}
        <div className="mesh-center" style={{ background: 'white', padding: '28px 48px 80px' }}>

          {/* Page title */}
          <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.02em', marginBottom: 12 }}>Record Payment</div>
          <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', marginBottom: 20 }} />

          {/* ── No loans onboarding banner ── */}
          {!isLoading && loans.length === 0 && (
            <div style={{
              marginBottom: 28, padding: '20px 22px', borderRadius: 14,
              background: 'white', border: '1px solid rgba(0,0,0,0.07)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)', textAlign: 'center',
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.02em', marginBottom: 4, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                💸 Nothing to record just yet!
              </div>
              <div style={{ fontSize: 13, color: '#787776', lineHeight: 1.55, marginBottom: 16 }}>
                Add some friends and create a loan first, then you can come back here to record payments.
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link
                  to={createPageUrl('Friends')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: '#03ACEA', color: 'white', textDecoration: 'none', fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif" }}
                >
                  Find Friends
                </Link>
                <Link
                  to={createPageUrl('CreateOffer')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'white', color: '#1A1918', textDecoration: 'none', fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif", border: '1px solid rgba(0,0,0,0.10)' }}
                >
                  Create a Loan
                </Link>
              </div>
            </div>
          )}

          {/* ── Two-col: Select Your Loan | Payment Form ── */}
          <div className="rp-two-col" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>

            {/* Left: Select Your Loan */}
            <div style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px) saturate(1.4)', WebkitBackdropFilter: 'blur(12px) saturate(1.4)', borderRadius: 14, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '14px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, marginBottom: 12, borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Select Your Loan</span>
                <button onClick={clearFilters} style={{
                  padding: '2px 8px', borderRadius: 6, border: 'none', background: 'transparent',
                  fontSize: 11, fontWeight: 500, color: hasAnyFilter ? '#E8726E' : '#C7C6C4',
                  cursor: hasAnyFilter ? 'pointer' : 'default', fontFamily: "'DM Sans', sans-serif",
                }}>Clear</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10, overflow: 'visible', position: 'relative', zIndex: 20 }}>
                <SingleSelectDropdown options={ROLE_OPTIONS} selected={roleFilter} onChange={setRoleFilter} />
                <SingleSelectDropdown options={friendOptions} selected={friendFilter} onChange={setFriendFilter} />
              </div>
              <div>
                {filteredLoans.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0' }}>
                    <p style={{ fontSize: 12, color: '#787776', margin: 0, textAlign: 'center' }}>No active loans yet 🌱</p>
                  </div>
                ) : (
                  <div className="rp-loan-list" style={{ display: 'flex', flexDirection: 'column' }}>
                    {filteredLoans.map(loan => {
                      const other = getOtherParty(loan);
                      const remaining = getRemainingBalance(loan);
                      const isSelected = selectedLoan?.id === loan.id;
                      const isLender = isUserLender(loan);
                      const firstName = other.full_name?.split(' ')[0] || other.username;
                      const loanAmt = (loan.amount || 0).toLocaleString();
                      const createdDate = loan.created_at ? format(new Date(loan.created_at), 'MMMM do yyyy') : '—';
                      return (
                        <button key={loan.id} onClick={() => handleSelectLoan(loan)} style={{
                          display: 'block', width: '100%', textAlign: 'left', padding: '10px 0',
                          background: 'transparent', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                          border: 'none',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <UserAvatar name={other.full_name || other.username} src={other.profile_picture_url} size={26} style={{ outline: isSelected ? '2px solid #03ACEA' : 'none', outlineOffset: 1, flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 12, fontWeight: isSelected ? 600 : 500, color: isSelected ? '#1A1918' : '#3A3938', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {isLender ? `You lent ${firstName} $${loanAmt}${loan.purpose ? ` for ${loan.purpose}` : ''}` : `${firstName} lent you $${loanAmt}${loan.purpose ? ` for ${loan.purpose}` : ''}`}
                              </p>
                              <p style={{ fontSize: 11, color: '#9B9A98', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                Loan created: {createdDate} · ${loanAmt} · ${remaining.toFixed(2)} left
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Payment Form */}
            <div style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px) saturate(1.4)', WebkitBackdropFilter: 'blur(12px) saturate(1.4)', borderRadius: 14, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '14px 18px' }}>
              <div style={{ paddingBottom: 10, marginBottom: 12, borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {currentStep === 0 ? 'Select a Loan to Get Started' : currentStep === 1 ? 'Payment Details' : currentStep === 2 ? 'Confirm Payment' : 'Payment Recorded'}
                </span>
              </div>
              <div style={{ overflow: 'visible' }}>
                  {currentStep === 0 && !selectedLoan && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: '#C7C6C4' }}>
                      <p style={{ fontSize: 15, fontWeight: 500, color: '#787776', margin: 0 }}>Select a loan to get started</p>
                      <p style={{ fontSize: 12, color: '#C7C6C4', margin: '4px 0 0' }}>Choose from your active loans on the left</p>
                    </div>
                  )}

                  {currentStep === 1 && selectedLoan && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {/* Loan sentence */}
                      <div style={{ background: 'rgba(3,172,234,0.08)', borderRadius: 14, padding: 16 }}>
                        <p style={{ fontSize: 15, fontWeight: 500, color: '#1A1918', margin: 0, lineHeight: 1.6 }}>
                          {nameOrYouCapitalized(isUserLender(selectedLoan) ? selectedLoan.borrower_id : user?.id)} paid {nameOrYou(isUserLender(selectedLoan) ? user?.id : selectedLoan.lender_id)}{' '}
                          {amount && parseFloat(amount) > 0
                            ? <strong>${parseFloat(amount).toFixed(2)}</strong>
                            : <span style={{ color: '#03ACEA', borderBottom: '2px solid #03ACEA', paddingBottom: 1, fontWeight: 600, letterSpacing: '0.04em' }}>$__</span>
                          }{' '}for {selectedLoan.purpose || 'this loan'}
                        </p>
                      </div>

                      {/* Amount */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#787776', marginBottom: 6, display: 'block' }}>Payment Amount</label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, fontWeight: 600, color: '#1A1918' }}>$</span>
                          <input
                            type="number" step="0.01" min="0" value={amount}
                            onChange={e => { setAmount(e.target.value); setError(''); }}
                            style={{
                              width: '100%', padding: '12px 14px 12px 28px', borderRadius: 12,
                              border: '1px solid rgba(0,0,0,0.06)', background: 'white',
                              fontSize: 15, fontWeight: 500, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", outline: 'none',
                            }}
                            onFocus={e => e.target.style.borderColor = 'rgba(3,172,234,0.4)'}
                            onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.06)'}
                          />
                        </div>
                        {selectedLoan && (
                          <p style={{ fontSize: 11, color: '#787776', margin: '6px 0 0' }}>Remaining balance: ${getRemainingBalance(selectedLoan).toFixed(2)}</p>
                        )}
                      </div>

                      {/* Payment Method */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#787776', marginBottom: 8, display: 'block' }}>Payment Method</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                          {PAYMENT_METHODS.map(method => {
                            const Icon = method.icon;
                            const isSelected = paymentMethod === method.id;
                            return (
                              <motion.button
                                key={method.id}
                                onClick={() => { setPaymentMethod(method.id); setError(''); }}
                                whileHover={{ scale: 1.03, y: -1 }}
                                whileTap={{ scale: 0.94 }}
                                animate={isSelected ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                                transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 12,
                                  border: isSelected ? '2px solid #03ACEA' : '1px solid rgba(0,0,0,0.06)',
                                  background: isSelected ? 'rgba(3,172,234,0.1)' : 'white',
                                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500, color: '#1A1918',
                                  boxShadow: isSelected ? '0 0 0 3px rgba(3,172,234,0.2)' : 'none',
                                }}
                              >
                                <Icon size={16} style={{ color: isSelected ? '#03ACEA' : method.color }} />
                                {method.label}
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Payment Date */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#787776', marginBottom: 6, display: 'block' }}>Payment Date</label>
                        <input
                          type="date" value={paymentDate} max={format(new Date(), 'yyyy-MM-dd')}
                          onChange={e => setPaymentDate(e.target.value)}
                          style={{
                            width: '100%', padding: '10px 14px', borderRadius: 12,
                            border: '1px solid rgba(0,0,0,0.06)', background: 'white',
                            fontSize: 13, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", outline: 'none',
                          }}
                        />
                      </div>

                      {error && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(232,114,110,0.08)' }}>
                          <AlertCircle size={14} style={{ color: '#E8726E', flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: '#E8726E' }}>{error}</span>
                        </div>
                      )}

                      <button onClick={handleContinue} style={{
                        width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
                        background: '#03ACEA', color: 'white', fontSize: 14, fontWeight: 600,
                        cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      }}>
                        Continue <ArrowRight size={16} />
                      </button>
                    </div>
                  )}

                  {currentStep === 2 && selectedLoan && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div style={{ background: 'rgba(3,172,234,0.08)', borderRadius: 12, padding: 14 }}>
                          <p style={{ fontSize: 11, color: '#787776', margin: 0 }}>Amount</p>
                          <p style={{ fontSize: 20, fontWeight: 700, color: '#1A1918', margin: '4px 0 0' }}>${parseFloat(amount).toFixed(2)}</p>
                        </div>
                        <div style={{ background: 'rgba(3,172,234,0.08)', borderRadius: 12, padding: 14 }}>
                          <p style={{ fontSize: 11, color: '#787776', margin: 0 }}>Method</p>
                          <p style={{ fontSize: 15, fontWeight: 600, color: '#1A1918', margin: '4px 0 0' }}>{PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label}</p>
                        </div>
                        <div style={{ background: 'rgba(3,172,234,0.08)', borderRadius: 12, padding: 14 }}>
                          <p style={{ fontSize: 11, color: '#787776', margin: 0 }}>Date</p>
                          <p style={{ fontSize: 13, fontWeight: 500, color: '#1A1918', margin: '4px 0 0' }}>{format(new Date(paymentDate + 'T12:00:00'), 'MMM d, yyyy')}</p>
                        </div>
                        <div style={{ background: 'rgba(3,172,234,0.08)', borderRadius: 12, padding: 14 }}>
                          <p style={{ fontSize: 11, color: '#787776', margin: 0 }}>To</p>
                          <p style={{ fontSize: 13, fontWeight: 500, color: '#1A1918', margin: '4px 0 0' }}>
                            {nameOrYouCapitalized(isUserLender(selectedLoan) ? selectedLoan.borrower_id : selectedLoan.lender_id)}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(3,172,234,0.08)' }}>
                        <Clock size={14} style={{ color: '#03ACEA', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: '#03ACEA' }}>
                          {getOtherParty(selectedLoan).full_name || getOtherParty(selectedLoan).username} will need to confirm this payment
                        </span>
                      </div>

                      {error && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(232,114,110,0.08)' }}>
                          <AlertCircle size={14} style={{ color: '#E8726E', flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: '#E8726E' }}>{error}</span>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 12 }}>
                        <button onClick={() => setCurrentStep(1)} style={{
                          flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)',
                          background: 'white', fontSize: 13, fontWeight: 600, color: '#787776', cursor: 'pointer',
                          fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}>
                          <ArrowLeft size={14} /> Back
                        </button>
                        <button onClick={handleConfirmPayment} disabled={isProcessing} style={{
                          flex: 2, padding: '12px 0', borderRadius: 12, border: 'none',
                          background: isProcessing ? 'rgba(3,172,234,0.5)' : '#03ACEA', color: 'white', fontSize: 14, fontWeight: 600,
                          cursor: isProcessing ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif",
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        }}>
                          {isProcessing ? (
                            <div style={{ width: 18, height: 18, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                          ) : (
                            <><CheckCircle size={16} /> Confirm Payment</>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {currentStep === 3 && isSuccess && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: 16 }}
                    >
                      <AnimatedCheckmark size="xl" delay={0.1} />
                      <motion.h3
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        style={{ fontSize: 22, fontWeight: 700, color: '#1A1918', margin: 0 }}
                      >
                        Payment Recorded! 🎉
                      </motion.h3>
                      <motion.p
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 }}
                        style={{ fontSize: 13, color: '#787776', margin: 0, textAlign: 'center' }}
                      >
                        Your payment of ${parseFloat(amount).toFixed(2)} has been sent for confirmation
                      </motion.p>
                      {transactionId && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.55 }}
                          style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 10, padding: '8px 16px' }}
                        >
                          <span style={{ fontSize: 11, color: '#787776' }}>Ref: </span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#1A1918', fontFamily: 'monospace' }}>{transactionId}</span>
                        </motion.div>
                      )}
                      <motion.button
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => { setSelectedLoan(null); setCurrentStep(0); setAmount(''); setPaymentMethod(''); setIsSuccess(false); setTransactionId(''); }} style={{
                        marginTop: 8, padding: '10px 24px', borderRadius: 12, border: 'none',
                        background: 'linear-gradient(135deg, #03ACEA, #7C3AED)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                      }}>
                        Record Another Payment
                      </motion.button>
                    </motion.div>
                  )}
              </div>
            </div>

          </div>{/* end rp-two-col */}

        </div>


      </div>
    </>
  );
}

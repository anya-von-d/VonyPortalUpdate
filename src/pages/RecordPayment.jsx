import React, { useState, useEffect, useRef } from "react";
import { Payment, Loan, User, PublicProfile } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  DollarSign, CheckCircle, CreditCard, Banknote, Smartphone, ChevronDown,
  AlertCircle, ArrowRight, ArrowLeft, X, Clock, FileText
} from "lucide-react";
import { format, addMonths } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { AnimatedCheckmark } from "@/components/ui/animations";
import MeshMobileNav from "@/components/MeshMobileNav";
import UserAvatar from "@/components/ui/UserAvatar";
import DesktopSidebar from '../components/DesktopSidebar';

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

/* ── FormPillSelect ─────────────────────────────────────── */
// A Records-filter-style dropdown for form fields (currency, method, etc.)
function FormPillSelect({ options, value, onChange, placeholder = 'Select…', width }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const current = options.find(o => o.id === value);
  return (
    <div ref={ref} style={{ position: 'relative', width: width || '100%' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, width: '100%',
          padding: '10px 12px', borderRadius: 12,
          border: `1px solid ${value ? 'rgba(3,172,234,0.35)' : 'rgba(0,0,0,0.06)'}`,
          background: value ? 'rgba(3,172,234,0.06)' : 'white',
          fontSize: 12, fontWeight: value ? 600 : 400,
          color: value ? '#1A1918' : '#9B9A98',
          cursor: 'pointer', textAlign: 'left', fontFamily: "'DM Sans', sans-serif",
          transition: 'border-color 0.15s, background 0.15s', boxSizing: 'border-box',
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {current ? current.label : placeholder}
        </span>
        <ChevronDown size={13} style={{ flexShrink: 0, opacity: 0.45, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0,
          minWidth: '100%', zIndex: 200,
          background: 'white', borderRadius: 12,
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.10)', padding: 6,
        }}>
          {options.map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => { onChange(opt.id); setOpen(false); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 10px', borderRadius: 8, border: 'none',
                cursor: 'pointer', fontSize: 12,
                color: '#1A1918',
                background: value === opt.id ? 'rgba(3,172,234,0.08)' : 'transparent',
                fontWeight: value === opt.id ? 600 : 400,
                fontFamily: "'DM Sans', sans-serif", transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (value !== opt.id) e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
              onMouseLeave={e => { if (value !== opt.id) e.currentTarget.style.background = 'transparent'; }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
        fontSize: 12, fontWeight: 500, color: '#1A1918', cursor: 'pointer',
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
              border: 'none', cursor: 'pointer', fontSize: 12, color: '#1A1918',
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
  const location = useLocation();

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
  const [currency, setCurrency] = useState('USD');
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

  // Pre-select a loan if ?loanId=... is in the URL (e.g. coming from the
  // Next Payment Due / Incoming cards on Home). Waits for loans to be loaded,
  // and only fires once so the user can still navigate back to the picker.
  const didPreselectRef = useRef(false);
  useEffect(() => {
    if (didPreselectRef.current) return;
    if (!loans.length) return;
    const params = new URLSearchParams(location.search);
    const loanId = params.get('loanId');
    if (!loanId) return;
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;
    didPreselectRef.current = true;
    handleSelectLoan(loan);
  }, [loans, location.search]);

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

  // Compute days-until-due for a loan (negative = overdue)
  const getLoanDueDays = (loan) => {
    if (!loan.next_payment_date) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const due = new Date(loan.next_payment_date); due.setHours(0,0,0,0);
    return Math.ceil((due - today) / 86400000);
  };

  const filteredLoans = loans.filter(loan => {
    if (roleFilter === 'lender' && loan.lender_id !== user?.id) return false;
    if (roleFilter === 'borrower' && loan.borrower_id !== user?.id) return false;
    if (friendFilter !== 'all') {
      const otherId = loan.lender_id === user?.id ? loan.borrower_id : loan.lender_id;
      if (otherId !== friendFilter) return false;
    }
    return true;
  }).sort((a, b) => {
    // Overdue first (most overdue at top), then soonest-due, then no-date loans
    const da = getLoanDueDays(a);
    const db = getLoanDueDays(b);
    if (da === null && db === null) return 0;
    if (da === null) return 1;
    if (db === null) return -1;
    return da - db;
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
      <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif", paddingBottom: 5, marginBottom: 2 }}>{title}</div>
      {children}
    </div>
  );

  /* ── PageCard component ──────────────────────────────────── */
  const PageCard = ({ title, headerRight, children, style, highlight }) => (
    <div style={{ position: 'relative', marginBottom: 24 }}>
      <div className="home-aura-glow" style={{ position: 'absolute', inset: -3, background: '#CFDCE7', borderRadius: 12, filter: 'blur(4px)', opacity: 0.5, zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, background: '#ffffff', borderRadius: 10, border: highlight ? '1px solid rgba(3,172,234,0.25)' : 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '14px 18px', ...style }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 5, marginBottom: 2 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: highlight ? '#03ACEA' : '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif" }}>{title}</div>
          {headerRight && <div style={{ flexShrink: 0 }}>{headerRight}</div>}
        </div>
        <div style={{ overflow: 'visible' }}>{children}</div>
      </div>
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
              <h3 style={{ fontSize: 12, fontWeight: 600, color: '#1A1918', textAlign: 'center', margin: '0 0 8px', fontFamily: "'DM Sans', sans-serif" }}>Deny Payment?</h3>
              <p style={{ fontSize: 12, color: '#787776', textAlign: 'center', margin: '0 0 24px', lineHeight: 1.6 }}>
                Are you sure you didn't receive this payment? If so click deny to let {nameOrYou(confirmingDeny.recorded_by) === 'you' ? 'them' : `${getUserById(confirmingDeny.recorded_by).full_name || getUserById(confirmingDeny.recorded_by).username}`} know
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setConfirmingDeny(null)} style={{
                  flex: 1, padding: '10px 0', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)',
                  background: 'white', fontSize: 12, fontWeight: 600, color: '#787776', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                }}>Cancel</button>
                <button onClick={handleDenyPayment} style={{
                  flex: 1, padding: '10px 0', borderRadius: 12, border: 'none',
                  background: '#E8726E', fontSize: 12, fontWeight: 600, color: 'white', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                }}>Deny Payment</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Popup modal overlay ── */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(20,30,50,0.45)',
          backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: '40px 20px', overflowY: 'auto',
          fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 12, lineHeight: 1.5, color: '#1A1918', WebkitFontSmoothing: 'antialiased',
        }}
        onClick={() => { try { navigate(-1); } catch { navigate('/'); } }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 1000,
            background: '#ffffff', borderRadius: 20,
            boxShadow: '0 24px 80px rgba(0,0,0,0.28), 0 4px 16px rgba(0,0,0,0.08)',
            position: 'relative',
            padding: '28px 32px 40px',
          }}
        >
          {/* Close button */}
          <button
            onClick={() => { try { navigate(-1); } catch { navigate('/'); } }}
            aria-label="Close"
            style={{
              position: 'absolute', top: 14, right: 14, zIndex: 10,
              width: 34, height: 34, borderRadius: 17,
              background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#1A1918',
            }}
          >
            <X size={17} />
          </button>

          {/* Modal header title */}
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.02em', marginBottom: 18, fontFamily: "'DM Sans', sans-serif" }}>
            Log Payment
          </div>

        <div style={{ background: 'transparent' }}>

          {/* ── No loans onboarding banner ── */}
          {!isLoading && loans.length === 0 && (
            <div style={{
              marginBottom: 28, padding: '16px 22px', borderRadius: 10,
              background: 'white', border: '1px solid rgba(0,0,0,0.07)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap',
            }}>
              <div style={{ fontSize: 12, color: '#787776', fontFamily: "'DM Sans', sans-serif" }}>
                💸 Nothing to record just yet! Create a loan first.
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                <Link
                  to={createPageUrl('CreateOffer')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 9, background: '#03ACEA', color: 'white', textDecoration: 'none', fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif" }}
                >
                  Create a Loan
                </Link>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('open-friends-popup'))}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 9, background: 'white', color: '#1A1918', textDecoration: 'none', fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif", border: '1px solid rgba(0,0,0,0.10)', cursor: 'pointer' }}
                >
                  Add Friends
                </button>
              </div>
            </div>
          )}

          {/* ── Two-col: Select Your Loan | Payment Form ── */}
          <div className="rp-two-col" style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, alignItems: 'start' }}>

            {/* Left: Select Your Loan — hidden on confirm/success steps */}
            <div style={{ position: 'relative', display: currentStep >= 2 ? 'none' : 'block' }}>
              <div className="home-aura-glow" style={{ position: 'absolute', inset: -3, background: '#CFDCE7', borderRadius: 12, filter: 'blur(4px)', opacity: 0.5, zIndex: 0, pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1, background: '#ffffff', borderRadius: 10, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '14px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 5, marginBottom: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif" }}>Select Your Loan</span>
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
                  <div className="rp-loan-list" style={{ display: 'flex', flexDirection: 'column', maxHeight: 138, overflowY: 'auto' }}>
                    {filteredLoans.map(loan => {
                      const other = getOtherParty(loan);
                      const remaining = getRemainingBalance(loan);
                      const isSelected = selectedLoan?.id === loan.id;
                      const isLender = isUserLender(loan);
                      const firstName = other.full_name?.split(' ')[0] || other.username;
                      const loanAmt = (loan.amount || 0).toLocaleString();

                      // Status badge — matches Home "Your Lending/Borrowing" style
                      const days = getLoanDueDays(loan);
                      let statusLabel = null, statusColor = '#03ACEA', statusBg = 'rgba(3,172,234,0.10)';
                      if (days !== null) {
                        if (days < 0) {
                          statusLabel = `Overdue`;
                          statusColor = '#E8726E';
                          statusBg = 'rgba(232,114,110,0.08)';
                        } else if (days === 0) {
                          statusLabel = 'Due today';
                        } else {
                          statusLabel = `Due in ${days} day${days === 1 ? '' : 's'}`;
                        }
                      }

                      return (
                        <button key={loan.id} onClick={() => handleSelectLoan(loan)} style={{
                          display: 'block', width: '100%', textAlign: 'left', padding: '10px 0',
                          background: 'transparent', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                          border: 'none', borderBottom: '1px solid rgba(0,0,0,0.04)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {other.profile_picture_url ? (
                              <img
                                src={other.profile_picture_url}
                                alt={other.full_name || other.username}
                                style={{
                                  width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
                                  outline: isSelected ? '2px solid #03ACEA' : 'none', outlineOffset: 1,
                                }}
                              />
                            ) : (
                              <div style={{
                                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                                background: '#EBF4FA', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 10, fontWeight: 700, color: '#03ACEA', fontFamily: "'DM Sans', sans-serif",
                                outline: isSelected ? '2px solid #03ACEA' : 'none', outlineOffset: 1,
                              }}>
                                {(other.full_name || other.username || '?').slice(0, 1).toUpperCase()}
                              </div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 12, fontWeight: isSelected ? 600 : 500, color: isSelected ? '#1A1918' : '#3A3938', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {isLender ? `You lent ${firstName} $${loanAmt}` : `${firstName} lent you $${loanAmt}`}
                              </p>
                            </div>
                            {statusLabel && (
                              <span style={{
                                flexShrink: 0, fontSize: 10, fontWeight: 700,
                                color: statusColor, background: statusBg,
                                borderRadius: 5, padding: '2px 6px', lineHeight: 1.2,
                                fontFamily: "'DM Sans', sans-serif",
                              }}>{statusLabel}</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            </div>

            {/* Right: Payment Form */}
            <div style={{ position: 'relative' }}>
              <div className="home-aura-glow" style={{ position: 'absolute', inset: -3, background: '#CFDCE7', borderRadius: 12, filter: 'blur(4px)', opacity: 0.5, zIndex: 0, pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1, background: '#ffffff', borderRadius: 10, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '14px 18px' }}>
              <div style={{ paddingBottom: 5, marginBottom: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.01em', fontFamily: "'DM Sans', sans-serif" }}>
                  {currentStep === 0 ? 'Payment Details' : currentStep === 1 ? 'Payment Details' : currentStep === 2 ? 'Confirm Payment' : 'Payment Recorded'}
                </span>
              </div>
              <div style={{ overflow: 'visible' }}>
                  {currentStep === 0 && !selectedLoan && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: '#C7C6C4' }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: '#787776', margin: 0, fontFamily: "'DM Sans', sans-serif" }}>Select a loan to get started</p>
                      <p style={{ fontSize: 12, color: '#C7C6C4', margin: '4px 0 0', fontFamily: "'DM Sans', sans-serif" }}>Choose from your active loans above</p>
                    </div>
                  )}

                  {currentStep === 1 && selectedLoan && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {/* Loan sentence */}
                      <div style={{ background: 'rgba(3,172,234,0.08)', borderRadius: 10, padding: 16 }}>
                        <p style={{ fontSize: 12, fontWeight: 500, color: '#1A1918', margin: 0, lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>
                          {nameOrYouCapitalized(isUserLender(selectedLoan) ? selectedLoan.borrower_id : user?.id)} paid {nameOrYou(isUserLender(selectedLoan) ? user?.id : selectedLoan.lender_id)}{' '}
                          {amount && parseFloat(amount) > 0
                            ? <strong>${parseFloat(amount).toFixed(2)}</strong>
                            : <span style={{ color: '#03ACEA', borderBottom: '2px solid #03ACEA', paddingBottom: 1, fontWeight: 600, letterSpacing: '0.04em' }}>{'$\u00A0\u00A0'}</span>
                          }{' '}for {selectedLoan.purpose || 'this loan'}
                        </p>
                      </div>

                      {/* Row 1: Payment Amount (full width, currency + number) */}
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#787776', marginBottom: 6, display: 'block', fontFamily: "'DM Sans', sans-serif" }}>Payment Amount</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {/* Currency dropdown */}
                          <div style={{ flexShrink: 0, width: 110 }}>
                            <FormPillSelect
                              value={currency}
                              onChange={setCurrency}
                              options={[
                                { id: 'USD', label: '$ USD' },
                                { id: 'EUR', label: '€ EUR' },
                                { id: 'GBP', label: '£ GBP' },
                                { id: 'CAD', label: 'C$ CAD' },
                                { id: 'AUD', label: 'A$ AUD' },
                                { id: 'JPY', label: '¥ JPY' },
                                { id: 'CHF', label: 'Fr CHF' },
                              ]}
                            />
                          </div>
                          {/* Amount input */}
                          <input
                            type="number" step="0.01" min="0" value={amount}
                            onChange={e => { setAmount(e.target.value); setError(''); }}
                            placeholder="0.00"
                            style={{
                              flex: 1, padding: '10px 14px', borderRadius: 12,
                              border: '1px solid rgba(0,0,0,0.06)', background: 'white',
                              fontSize: 12, fontWeight: 500, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", outline: 'none',
                            }}
                            onFocus={e => e.target.style.borderColor = 'rgba(3,172,234,0.4)'}
                            onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.06)'}
                          />
                        </div>
                        {selectedLoan && (() => {
                          const payAmt = selectedLoan.payment_amount || selectedLoan.next_payment_amount || getRemainingBalance(selectedLoan);
                          const payAmtStr = `$${Number(payAmt).toFixed(2)}`;
                          if (selectedLoan.next_payment_date) {
                            const due = new Date(selectedLoan.next_payment_date);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const days = Math.ceil((due - today) / 86400000);
                            if (days < 0) {
                              const n = Math.abs(days);
                              return <p style={{ fontSize: 11, color: '#E8726E', margin: '6px 0 0', fontFamily: "'DM Sans', sans-serif" }}>{payAmtStr} overdue by {n} day{n === 1 ? '' : 's'}</p>;
                            }
                            if (days === 0) return <p style={{ fontSize: 11, color: '#787776', margin: '6px 0 0', fontFamily: "'DM Sans', sans-serif" }}>{payAmtStr} due today</p>;
                            return <p style={{ fontSize: 11, color: '#787776', margin: '6px 0 0', fontFamily: "'DM Sans', sans-serif" }}>{payAmtStr} due in {days} day{days === 1 ? '' : 's'}</p>;
                          }
                          return null;
                        })()}
                      </div>

                      {/* Row 2: Payment Date + Payment Method side by side */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 600, color: '#787776', marginBottom: 6, display: 'block', fontFamily: "'DM Sans', sans-serif" }}>Payment Date</label>
                          <input
                            type="date" value={paymentDate} max={format(new Date(), 'yyyy-MM-dd')}
                            onChange={e => setPaymentDate(e.target.value)}
                            style={{
                              width: '100%', padding: '10px 14px', borderRadius: 12,
                              border: '1px solid rgba(0,0,0,0.06)', background: 'white',
                              fontSize: 12, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", outline: 'none',
                            }}
                            onFocus={e => e.target.style.borderColor = 'rgba(3,172,234,0.4)'}
                            onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.06)'}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 600, color: '#787776', marginBottom: 6, display: 'block', fontFamily: "'DM Sans', sans-serif" }}>Payment Method</label>
                          <FormPillSelect
                            value={paymentMethod}
                            onChange={v => { setPaymentMethod(v); setError(''); }}
                            placeholder="Select method…"
                            options={PAYMENT_METHODS.map(m => ({ id: m.id, label: m.label }))}
                          />
                        </div>
                      </div>

                      {error && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(232,114,110,0.08)' }}>
                          <AlertCircle size={14} style={{ color: '#E8726E', flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: '#E8726E' }}>{error}</span>
                        </div>
                      )}

                      {/* Continue — styled like Home notification bar (rainbow aura + dark blue pill) */}
                      <div style={{ position: 'relative', paddingTop: 8 }}>
                        <div style={{
                          position: 'absolute', top: 0, left: '50%',
                          transform: 'translateX(-50%)',
                          width: 'calc(100% + 36px)', height: '100%',
                          background: 'linear-gradient(225deg, rgb(129,140,248) 0%, rgb(99,102,241) 12%, rgb(79,70,229) 24%, rgb(67,56,202) 36%, rgb(37,99,235) 50%, rgb(59,130,246) 64%, rgb(96,165,250) 76%, rgb(56,189,248) 88%, rgb(14,165,233) 100%)',
                          filter: 'blur(12px) saturate(1.18)',
                          opacity: 0.55,
                          borderRadius: 16, zIndex: 0, pointerEvents: 'none',
                        }} />
                        <button onClick={handleContinue} style={{
                          position: 'relative', zIndex: 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          width: '100%', padding: '10px 12px', borderRadius: 9,
                          background: '#14324D', border: 'none', cursor: 'pointer',
                          fontSize: 12, fontWeight: 600, color: 'white', fontFamily: "'DM Sans', sans-serif",
                        }}>
                          Continue <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {currentStep === 2 && selectedLoan && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div style={{ background: 'rgba(3,172,234,0.08)', borderRadius: 12, padding: 14 }}>
                          <p style={{ fontSize: 11, color: '#787776', margin: 0, fontFamily: "'DM Sans', sans-serif" }}>Amount</p>
                          <p style={{ fontSize: 12, fontWeight: 700, color: '#1A1918', margin: '4px 0 0', fontFamily: "'DM Sans', sans-serif" }}>${parseFloat(amount).toFixed(2)}</p>
                        </div>
                        <div style={{ background: 'rgba(3,172,234,0.08)', borderRadius: 12, padding: 14 }}>
                          <p style={{ fontSize: 11, color: '#787776', margin: 0, fontFamily: "'DM Sans', sans-serif" }}>Method</p>
                          <p style={{ fontSize: 12, fontWeight: 600, color: '#1A1918', margin: '4px 0 0', fontFamily: "'DM Sans', sans-serif" }}>{PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label}</p>
                        </div>
                        <div style={{ background: 'rgba(3,172,234,0.08)', borderRadius: 12, padding: 14 }}>
                          <p style={{ fontSize: 11, color: '#787776', margin: 0, fontFamily: "'DM Sans', sans-serif" }}>Date</p>
                          <p style={{ fontSize: 12, fontWeight: 500, color: '#1A1918', margin: '4px 0 0', fontFamily: "'DM Sans', sans-serif" }}>{format(new Date(paymentDate + 'T12:00:00'), 'MMM d, yyyy')}</p>
                        </div>
                        <div style={{ background: 'rgba(3,172,234,0.08)', borderRadius: 12, padding: 14 }}>
                          <p style={{ fontSize: 11, color: '#787776', margin: 0, fontFamily: "'DM Sans', sans-serif" }}>To</p>
                          <p style={{ fontSize: 12, fontWeight: 500, color: '#1A1918', margin: '4px 0 0', fontFamily: "'DM Sans', sans-serif" }}>
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
                          flex: 1, padding: '10px 0', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)',
                          background: 'white', fontSize: 12, fontWeight: 600, color: '#787776', cursor: 'pointer',
                          fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}>
                          <ArrowLeft size={14} /> Back
                        </button>
                        {/* Confirm — same notification-bar styling as Continue */}
                        <div style={{ flex: 2, position: 'relative', paddingTop: 8 }}>
                          <div style={{
                            position: 'absolute', top: 0, left: '50%',
                            transform: 'translateX(-50%)',
                            width: 'calc(100% + 36px)', height: '100%',
                            background: 'linear-gradient(225deg, rgb(129,140,248) 0%, rgb(99,102,241) 12%, rgb(79,70,229) 24%, rgb(67,56,202) 36%, rgb(37,99,235) 50%, rgb(59,130,246) 64%, rgb(96,165,250) 76%, rgb(56,189,248) 88%, rgb(14,165,233) 100%)',
                            filter: 'blur(12px) saturate(1.18)',
                            opacity: isProcessing ? 0.28 : 0.55,
                            borderRadius: 16, zIndex: 0, pointerEvents: 'none',
                          }} />
                          <button onClick={handleConfirmPayment} disabled={isProcessing} style={{
                            position: 'relative', zIndex: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            width: '100%', padding: '10px 12px', borderRadius: 9,
                            background: isProcessing ? 'rgba(20,50,77,0.6)' : '#14324D', border: 'none',
                            cursor: isProcessing ? 'default' : 'pointer',
                            fontSize: 12, fontWeight: 600, color: 'white', fontFamily: "'DM Sans', sans-serif",
                          }}>
                            {isProcessing ? (
                              <div style={{ width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                            ) : (
                              <><CheckCircle size={14} /> Confirm Payment</>
                            )}
                          </button>
                        </div>
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
                        style={{ fontSize: 12, fontWeight: 700, color: '#1A1918', margin: 0, fontFamily: "'DM Sans', sans-serif" }}
                      >
                        Payment Recorded! 🎉
                      </motion.h3>
                      <motion.p
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 }}
                        style={{ fontSize: 12, color: '#787776', margin: 0, textAlign: 'center', fontFamily: "'DM Sans', sans-serif" }}
                      >
                        Your payment of ${parseFloat(amount).toFixed(2)} has been sent for confirmation
                      </motion.p>
                      {transactionId && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.55 }}
                          style={{ background: 'transparent', borderRadius: 10, padding: '8px 16px' }}
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
                        background: 'linear-gradient(135deg, #03ACEA, #7C3AED)', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                      }}>
                        Record Another Payment
                      </motion.button>
                    </motion.div>
                  )}
              </div>
            </div>
            </div>

          </div>{/* end rp-two-col */}

        </div>{/* end content wrapper */}

        </div>{/* end modal panel */}
      </div>{/* end modal overlay */}
    </>
  );
}

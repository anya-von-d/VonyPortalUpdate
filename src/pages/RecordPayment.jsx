import React, { useState, useEffect, useRef } from "react";
import { Payment, Loan, User, PublicProfile, Friendship } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  DollarSign, CheckCircle, CreditCard, Banknote, Smartphone, ChevronDown,
  AlertCircle, ArrowRight, ArrowLeft, X, Clock, FileText
} from "lucide-react";
import { format, addMonths } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import DashboardSidebar from "@/components/DashboardSidebar";
import confetti from "canvas-confetti";
import { AnimatedCheckmark } from "@/components/ui/animations";

const SHADOW = '0px 50px 40px rgba(0,0,0,0.02), 0px 50px 40px rgba(0,0,0,0.04), 0px 20px 40px rgba(0,0,0,0.08), 0px 3px 10px rgba(0,0,0,0.12)';

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
        border: '1px solid rgba(0,0,0,0.08)', background: selected !== 'all' ? 'rgba(130,240,185,0.08)' : 'white',
        fontSize: 13, fontWeight: 500, color: '#1A1918', cursor: 'pointer',
        fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', transition: 'background 0.15s',
      }}>
        {current.label}
        <ChevronDown size={14} style={{ opacity: 0.5, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: 220,
          background: 'white', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)', zIndex: 50, padding: 6,
        }}>
          {options.map(opt => (
            <button key={opt.id} onClick={() => { onChange(opt.id); setOpen(false); }} style={{
              display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8,
              border: 'none', cursor: 'pointer', fontSize: 13, color: '#1A1918',
              background: selected === opt.id ? 'rgba(130,240,185,0.08)' : 'transparent',
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
  const { user: authUser, userProfile } = useAuth();
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
        colors: ['#03ACEA', '#7C3AED', '#82F0B9', '#ffffff', '#35B276'],
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
          colors: ['#82F0B9', '#35B276'],
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
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#82F0B9', '#2563EB', '#7792F4', '#BB98E8'] });
      setTimeout(() => confetti({ particleCount: 50, spread: 100, origin: { y: 0.5 }, colors: ['#82F0B9', '#2563EB'] }), 300);

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

  /* ── PageCard component ──────────────────────────────────── */
  const PageCard = ({ title, headerRight, children, style, highlight }) => (
    <div style={{ background: highlight ? '#54A6CF' : '#F4F4F5', borderRadius: 14, overflow: 'hidden', boxShadow: SHADOW, ...style }}>
      <div style={{ padding: '6px 14px 5px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: highlight ? 'rgba(255,255,255,0.85)' : '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>{title}</span>
        {headerRight && <div style={{ flexShrink: 0 }}>{headerRight}</div>}
      </div>
      <div style={{ background: '#ffffff', margin: '0 5px 5px', borderRadius: 10, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );

  /* ── Loading state ──────────────────────────────────────── */
  if (isLoading && !user) {
    return (
      <div className="home-with-sidebar" style={{ minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14, lineHeight: 1.5, color: '#1A1918', WebkitFontSmoothing: 'antialiased', paddingTop: 0, background: 'transparent' }}>
        <DashboardSidebar activePage="RecordPayment" user={user} />
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '20px 40px 0', position: 'relative', zIndex: 1 }}>
          <div style={{ background: '#F4F4F5', borderRadius: 14, overflow: 'hidden', boxShadow: SHADOW, padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 32, height: 32, border: '2px solid #82F0B9', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 12 }} />
            <p style={{ fontSize: 13, color: '#787776' }}>Loading...</p>
          </div>
          <div style={{ padding: '20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
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
                  flex: 1, padding: '10px 0', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)',
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

      <div className="home-with-sidebar" style={{ minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14, lineHeight: 1.5, color: '#1A1918', WebkitFontSmoothing: 'antialiased', paddingTop: 0, background: 'transparent' }}>
        <DashboardSidebar activePage="RecordPayment" user={user} />

        {/* Hero */}
        <div style={{ margin: '8px 10px 0', height: 168, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 24, position: 'relative' }}>
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15, pointerEvents: 'none', zIndex: 0 }} viewBox="0 0 1200 168" preserveAspectRatio="xMidYMid slice">
            {[{cx:80,cy:40},{cx:200,cy:110},{cx:320,cy:25},{cx:430,cy:160},{cx:540,cy:70},{cx:660,cy:130},{cx:770,cy:35},{cx:890,cy:175},{cx:1000,cy:80},{cx:1100,cy:140},{cx:150,cy:185},{cx:480,cy:100},{cx:720,cy:180},{cx:950,cy:55},{cx:280,cy:195},{cx:620,cy:48},{cx:1050,cy:195}].map((s, i) => (
              <circle key={i} cx={s.cx} cy={s.cy} r={i % 3 === 0 ? 2.5 : 1.5} fill="white" />
            ))}
          </svg>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 40, fontWeight: 600, color: '#1A1918', margin: 0, letterSpacing: '-0.01em', lineHeight: 1, textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <span style={{ fontStyle: 'normal' }}>Record Payment</span>
          </h1>
        </div>

        {/* Page content */}
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '20px 40px 0', position: 'relative', zIndex: 1 }}>
          <div style={{ background: '#EDECEA', borderRadius: 18, padding: 20 }}>

          {/* Two-column layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, alignItems: 'start' }}>

            {/* ── Left Column (form — visually right after swap) ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, order: 2 }}>

              {/* Record Payment Form */}
              <PageCard title={
                currentStep === 0 ? 'Payment Details' :
                currentStep === 1 ? 'Payment Details' :
                currentStep === 2 ? 'Confirm Payment' :
                'Payment Recorded'
              } highlight>
                <div style={{ padding: '16px', overflow: 'visible' }}>
                  {currentStep === 0 && !selectedLoan && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: '#C7C6C4' }}>
                      <p style={{ fontSize: 15, fontWeight: 500, color: '#787776', margin: 0 }}>Select a loan to get started</p>
                      <p style={{ fontSize: 12, color: '#C7C6C4', margin: '4px 0 0' }}>Choose from your active loans on the left</p>
                    </div>
                  )}

                  {currentStep === 1 && selectedLoan && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {/* Loan sentence */}
                      <div style={{ background: '#DBEDFE', borderRadius: 14, padding: 16 }}>
                        <p style={{ fontSize: 15, fontWeight: 500, color: '#1A1918', margin: 0, lineHeight: 1.6 }}>
                          {nameOrYouCapitalized(isUserLender(selectedLoan) ? selectedLoan.borrower_id : user?.id)} paid {nameOrYou(isUserLender(selectedLoan) ? user?.id : selectedLoan.lender_id)}{' '}
                          {amount && parseFloat(amount) > 0
                            ? <strong>${parseFloat(amount).toFixed(2)}</strong>
                            : <span style={{ color: '#2563EB', borderBottom: '2px solid #2563EB', paddingBottom: 1, fontWeight: 600, letterSpacing: '0.04em' }}>$__</span>
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
                              border: '1px solid rgba(0,0,0,0.08)', background: 'white',
                              fontSize: 15, fontWeight: 500, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", outline: 'none',
                            }}
                            onFocus={e => e.target.style.borderColor = 'rgba(84,166,207,0.4)'}
                            onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.08)'}
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
                                  border: isSelected ? '2px solid #54A6CF' : '1px solid rgba(0,0,0,0.08)',
                                  background: isSelected ? 'rgba(84,166,207,0.1)' : 'white',
                                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500, color: '#1A1918',
                                  boxShadow: isSelected ? '0 0 0 3px rgba(84,166,207,0.2)' : 'none',
                                }}
                              >
                                <Icon size={16} style={{ color: isSelected ? '#54A6CF' : method.color }} />
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
                            border: '1px solid rgba(0,0,0,0.08)', background: 'white',
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
                        background: '#54A6CF', color: 'white', fontSize: 14, fontWeight: 600,
                        cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      }}>
                        Continue <ArrowRight size={16} />
                      </button>
                    </div>
                  )}

                  {currentStep === 2 && selectedLoan && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div style={{ background: '#DBEDFE', borderRadius: 12, padding: 14 }}>
                          <p style={{ fontSize: 11, color: '#787776', margin: 0 }}>Amount</p>
                          <p style={{ fontSize: 20, fontWeight: 700, color: '#1A1918', margin: '4px 0 0' }}>${parseFloat(amount).toFixed(2)}</p>
                        </div>
                        <div style={{ background: 'rgba(37,99,235,0.08)', borderRadius: 12, padding: 14 }}>
                          <p style={{ fontSize: 11, color: '#787776', margin: 0 }}>Method</p>
                          <p style={{ fontSize: 15, fontWeight: 600, color: '#1A1918', margin: '4px 0 0' }}>{PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label}</p>
                        </div>
                        <div style={{ background: '#DBEDFE', borderRadius: 12, padding: 14 }}>
                          <p style={{ fontSize: 11, color: '#787776', margin: 0 }}>Date</p>
                          <p style={{ fontSize: 13, fontWeight: 500, color: '#1A1918', margin: '4px 0 0' }}>{format(new Date(paymentDate + 'T12:00:00'), 'MMM d, yyyy')}</p>
                        </div>
                        <div style={{ background: 'rgba(37,99,235,0.08)', borderRadius: 12, padding: 14 }}>
                          <p style={{ fontSize: 11, color: '#787776', margin: 0 }}>To</p>
                          <p style={{ fontSize: 13, fontWeight: 500, color: '#1A1918', margin: '4px 0 0' }}>
                            {nameOrYouCapitalized(isUserLender(selectedLoan) ? selectedLoan.borrower_id : selectedLoan.lender_id)}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(84,166,207,0.08)' }}>
                        <Clock size={14} style={{ color: '#54A6CF', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: '#54A6CF' }}>
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
                          flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)',
                          background: 'white', fontSize: 13, fontWeight: 600, color: '#787776', cursor: 'pointer',
                          fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}>
                          <ArrowLeft size={14} /> Back
                        </button>
                        <button onClick={handleConfirmPayment} disabled={isProcessing} style={{
                          flex: 2, padding: '12px 0', borderRadius: 12, border: 'none',
                          background: isProcessing ? '#a0b8f8' : '#54A6CF', color: 'white', fontSize: 14, fontWeight: 600,
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
              </PageCard>

            </div>

            {/* ── Right Column: Select Your Loan (visually left after swap) ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, order: 1 }}>

              {/* Select Loan card */}
              <PageCard
                title="Select Your Loan"
                headerRight={
                  <button onClick={clearFilters} style={{
                    padding: '4px 10px', borderRadius: 8, border: 'none',
                    background: 'transparent', fontSize: 11, fontWeight: 500,
                    color: hasAnyFilter ? '#E8726E' : '#C7C6C4',
                    cursor: hasAnyFilter ? 'pointer' : 'default',
                    fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
                  }}>Clear Filters</button>
                }
                style={{ overflow: 'visible' }}
              >
                {/* Filters */}
                <div style={{ padding: '10px 9px 0', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', overflow: 'visible', position: 'relative', zIndex: 20 }}>
                  <SingleSelectDropdown options={ROLE_OPTIONS} selected={roleFilter} onChange={setRoleFilter} />
                  <SingleSelectDropdown options={friendOptions} selected={friendFilter} onChange={setFriendFilter} />
                </div>

                {/* Loan List */}
                <div style={{ padding: '12px 9px 9px', maxHeight: 310, overflowY: 'auto' }}>
                  {filteredLoans.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', color: '#C7C6C4' }}>
                      <FileText size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
                      <p style={{ fontSize: 12, color: '#787776', margin: 0 }}>No active loans found</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {filteredLoans.map(loan => {
                        const other = getOtherParty(loan);
                        const remaining = getRemainingBalance(loan);
                        const isSelected = selectedLoan?.id === loan.id;
                        return (
                          <button key={loan.id} onClick={() => handleSelectLoan(loan)} style={{
                            display: 'block', width: '100%', textAlign: 'left', padding: '13px 0',
                            background: isSelected ? 'rgba(1,173,233,0.05)' : 'transparent',
                            cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s',
                            border: 'none',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 28, height: 28, borderRadius: '50%', background: 'rgba(130,240,185,0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden',
                              }}>
                                {other.profile_picture_url ? (
                                  <img src={other.profile_picture_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                ) : (
                                  <span style={{ fontSize: 12, fontWeight: 600, color: '#54A6CF' }}>{(other.full_name || '?').charAt(0).toUpperCase()}</span>
                                )}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 13, fontWeight: 500, color: '#1A1918', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  ${(loan.amount || 0).toLocaleString()} loan {isUserLender(loan) ? 'to' : 'from'} {other.full_name || other.username}
                                </p>
                                <p style={{ fontSize: 11, color: '#787776', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {loan.purpose || 'No reason'} · ${remaining.toFixed(2)} remaining
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </PageCard>

              {/* Recommended Payment */}
              {selectedLoan && currentStep <= 1 && (
                <PageCard title="Recommended Payment">
                  <div style={{ padding: '12px 9px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: 22, fontWeight: 700, color: '#54A6CF', margin: 0 }}>${getSuggestedPayment(selectedLoan).toFixed(2)}</p>
                      {selectedLoan.next_payment_date && (
                        <p style={{ fontSize: 11, color: '#787776', margin: '4px 0 0' }}>Due {format(new Date(selectedLoan.next_payment_date + 'T12:00:00'), 'MMM d, yyyy')}</p>
                      )}
                    </div>
                    <button onClick={() => { setAmount(getSuggestedPayment(selectedLoan).toFixed(2)); }} style={{
                      padding: '8px 16px', borderRadius: 10, border: 'none',
                      background: 'rgba(84,166,207,0.08)', fontSize: 12, fontWeight: 600,
                      color: '#54A6CF', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                    }}>
                      Use Recommended
                    </button>
                  </div>
                </PageCard>
              )}

            </div>
          </div>

          {/* Payments Waiting for Approval */}
          {(paymentsToConfirm.length > 0 || paymentsYouRecorded.length > 0) && (
            <PageCard
              title="Payments Waiting for Approval"
              headerRight={
                <span style={{ fontSize: 12, color: '#787776' }}>{pendingPayments.length} pending</span>
              }
              style={{ marginTop: 16 }}
            >
              <div style={{ padding: '10px 9px 9px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {/* Payments needing your response */}
                  {paymentsToConfirm.map(payment => {
                    const loan = getPaymentLoan(payment);
                    if (!loan) return null;
                    const recorder = getUserById(payment.recorded_by);
                    const otherId = loan.lender_id === payment.recorded_by ? loan.borrower_id : loan.lender_id;
                    const recorderPic = recorder.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent((recorder.full_name || recorder.username || 'U').charAt(0))}&background=678AFB&color=fff&size=64`;
                    const methodLabel = PAYMENT_METHODS.find(m => m.id === payment.payment_method)?.label || payment.payment_method || '';
                    return (
                      <div key={payment.id} style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0',
                      }}>
                        <img src={recorderPic} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, background: 'rgba(103,138,251,0.1)' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: '#1A1918', margin: 0 }}>
                            {nameOrYouCapitalized(payment.recorded_by)} paid {nameOrYou(otherId)} ${payment.amount?.toFixed(2)} for {loan.purpose || 'this loan'}{methodLabel ? ` using ${methodLabel}` : ''}
                          </p>
                          <p style={{ fontSize: 11, color: '#787776', margin: '2px 0 0' }}>
                            {payment.payment_date ? format(new Date(payment.payment_date + 'T12:00:00'), 'MMM d') : 'No date'}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          <button
                            onClick={() => handleApprovePayment(payment)}
                            disabled={processingId === payment.id}
                            style={{
                              padding: '6px 14px', borderRadius: 10, border: 'none',
                              background: '#54A6CF', fontSize: 11, fontWeight: 600, color: 'white',
                              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                              opacity: processingId === payment.id ? 0.5 : 1,
                            }}
                          >
                            {processingId === payment.id ? 'Confirming...' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => setConfirmingDeny(payment)}
                            disabled={processingId === payment.id}
                            style={{
                              padding: '6px 14px', borderRadius: 10, border: 'none',
                              background: 'rgba(232,114,110,0.08)', fontSize: 11, fontWeight: 600, color: '#E8726E',
                              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Payments you recorded (pending) */}
                  {paymentsYouRecorded.map(payment => {
                    const loan = getPaymentLoan(payment);
                    if (!loan) return null;
                    const otherId = loan.lender_id === user?.id ? loan.borrower_id : loan.lender_id;
                    const otherParty = getUserById(otherId);
                    const otherPic = otherParty.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent((otherParty.full_name || otherParty.username || 'U').charAt(0))}&background=678AFB&color=fff&size=64`;
                    const methodLabel = PAYMENT_METHODS.find(m => m.id === payment.payment_method)?.label || payment.payment_method || '';
                    return (
                      <div key={payment.id} style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0',
                      }}>
                        <img src={otherPic} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, background: 'rgba(103,138,251,0.1)' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: '#1A1918', margin: 0 }}>
                            {nameOrYouCapitalized(user?.id)} paid {nameOrYou(otherId)} ${payment.amount?.toFixed(2)} for {loan.purpose || 'this loan'}{methodLabel ? ` using ${methodLabel}` : ''}
                          </p>
                          <p style={{ fontSize: 11, color: '#787776', margin: '2px 0 0' }}>
                            {payment.payment_date ? format(new Date(payment.payment_date + 'T12:00:00'), 'MMM d') : 'No date'}
                          </p>
                        </div>
                        <span style={{
                          padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                          background: 'rgba(120,119,118,0.08)', color: '#787776',
                        }}>
                          Pending
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </PageCard>
          )}

          </div>
          <div style={{ padding: '20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: '#787776' }}>2026 Vony, Inc. All rights reserved.</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <span style={{ fontSize: 11, color: '#787776' }}>Terms of Service</span>
              <span style={{ fontSize: 11, color: '#787776' }}>Privacy Center</span>
              <span style={{ fontSize: 11, color: '#787776' }}>Do not sell or share my personal information</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

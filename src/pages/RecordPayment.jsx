import React, { useState, useEffect, useRef } from "react";
import { Payment, Loan, User, PublicProfile, Friendship } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  DollarSign, CheckCircle, CreditCard, Banknote, Smartphone, ChevronDown,
  AlertCircle, ArrowRight, ArrowLeft, Check, X, Clock, FileText
} from "lucide-react";
import { format, addMonths } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import DashboardSidebar from "@/components/DashboardSidebar";
import confetti from "canvas-confetti";

const STAR_CIRCLES = [
  {cx:82,cy:45,o:0.7},{cx:195,cy:112,o:0.5},{cx:310,cy:28,o:0.8},{cx:420,cy:198,o:0.4},
  {cx:530,cy:67,o:0.65},{cx:640,cy:245,o:0.55},{cx:755,cy:88,o:0.75},{cx:860,cy:156,o:0.45},
  {cx:970,cy:34,o:0.7},{cx:1085,cy:201,o:0.6},{cx:1190,cy:78,o:0.5},{cx:1300,cy:267,o:0.7},
  {cx:1410,cy:45,o:0.55},{cx:1520,cy:134,o:0.65},{cx:48,cy:189,o:0.4},{cx:158,cy:278,o:0.6},
  {cx:268,cy:156,o:0.5},{cx:378,cy:89,o:0.7},{cx:488,cy:234,o:0.45},{cx:598,cy:145,o:0.6},
  {cx:708,cy:312,o:0.35},{cx:818,cy:56,o:0.75},{cx:928,cy:223,o:0.5},{cx:1038,cy:98,o:0.65},
  {cx:1148,cy:289,o:0.4},{cx:1258,cy:167,o:0.7},{cx:1368,cy:234,o:0.55},{cx:1478,cy:78,o:0.6},
  {cx:1560,cy:256,o:0.45},{cx:125,cy:312,o:0.5},{cx:345,cy:267,o:0.6},{cx:565,cy:34,o:0.75},
];

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
        border: '1px solid rgba(0,0,0,0.08)', background: selected !== 'all' ? 'rgba(103,138,251,0.08)' : 'white',
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
              background: selected === opt.id ? 'rgba(103,138,251,0.08)' : 'transparent',
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
    const suggested = getSuggestedPayment(loan);
    setAmount(suggested > 0 ? suggested.toFixed(2) : '');
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
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#678AFB', '#A79DEA', '#7792F4', '#BB98E8'] });
      setTimeout(() => confetti({ particleCount: 50, spread: 100, origin: { y: 0.5 }, colors: ['#678AFB', '#A79DEA'] }), 300);

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

  /* ── Loading state ──────────────────────────────────────── */
  if (isLoading && !user) {
    return (
      <div style={{ minHeight: '100vh', position: 'relative', fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif", fontSize: 14, lineHeight: 1.5, color: '#1A1918', WebkitFontSmoothing: 'antialiased', paddingLeft: 240, background: '#F5F4F0' }}>
        <DashboardSidebar activePage="RecordPayment" user={user} />
        <div className="content-box-glow" style={{ position: 'relative', margin: '20px 12px 12px 12px', borderRadius: 24, minHeight: 'calc(100vh - 32px)', border: '12px solid rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', boxShadow: 'rgba(0,0,0,0.03) 0px 0.6px 2.3px -0.42px, rgba(0,0,0,0.04) 0px 2.3px 8.7px -0.83px, rgba(0,0,0,0.08) 0px 10px 38px -1.25px' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', bottom: 0, overflow: 'hidden', borderRadius: 12, zIndex: 0, pointerEvents: 'none' }}>
            <div style={{
              position: 'absolute', top: 0, left: '-10%', width: '120%', height: '100%', zIndex: 0,
              background: '#6587F9'
            }} />
          </div>
          <div style={{ position: 'relative', zIndex: 2, maxWidth: 1080, margin: '0 auto', padding: '0 28px' }}>
            <div style={{ paddingTop: 80, paddingBottom: 20, textAlign: 'center' }}>
              <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '3.2rem', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1, color: '#1A1918', margin: 0 }}>Record Payment</h1>
            </div>
          </div>
          <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 28px 64px', position: 'relative', zIndex: 2 }}>
            <div className="glass-card" style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 32, height: 32, border: '2px solid #678AFB', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 12 }} />
              <p style={{ fontSize: 13, color: '#787776' }}>Loading...</p>
            </div>
          </div>
        </div>
        <div style={{ padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: '#787776' }}>2026 Vony, Inc. All rights reserved.</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <span style={{ fontSize: 11, color: '#787776' }}>Terms of Service</span>
            <span style={{ fontSize: 11, color: '#787776' }}>Privacy Center</span>
            <span style={{ fontSize: 11, color: '#787776' }}>Do not sell or share my personal information</span>
          </div>
        </div>
      </div>
    );
  }

  const stepLabels = ['Select Loan', 'Enter Details', 'Confirm Payment'];

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

      <div style={{ minHeight: '100vh', position: 'relative', fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif", fontSize: 14, lineHeight: 1.5, color: '#1A1918', WebkitFontSmoothing: 'antialiased', paddingLeft: 240, background: '#F5F4F0' }}>
        <DashboardSidebar activePage="RecordPayment" user={user} />

        <div className="content-box-glow" style={{ position: 'relative', margin: '20px 12px 12px 12px', borderRadius: 24, minHeight: 'calc(100vh - 32px)', border: '12px solid rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', boxShadow: 'rgba(0,0,0,0.03) 0px 0.6px 2.3px -0.42px, rgba(0,0,0,0.04) 0px 2.3px 8.7px -0.83px, rgba(0,0,0,0.08) 0px 10px 38px -1.25px' }}>
          {/* Gradient background */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', bottom: 0, overflow: 'hidden', borderRadius: 12, zIndex: 0, pointerEvents: 'none' }}>
            <div style={{
              position: 'absolute', top: 0, left: '-10%', width: '120%', height: '100%', zIndex: 0,
              background: '#6587F9'
            }} />
          </div>

          {/* Hero */}
          <div style={{ position: 'relative', zIndex: 2, maxWidth: 1080, margin: '0 auto', padding: '0 28px' }}>
            <div style={{ paddingTop: 80, paddingBottom: 20, textAlign: 'center' }}>
              <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '3.2rem', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1, color: '#1A1918', margin: 0 }}>Record Payment</h1>
            </div>
          </div>

          {/* Page content */}
          <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 28px 64px', position: 'relative', zIndex: 2 }}>

          {/* Two-column layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, alignItems: 'start' }}>

            {/* ── Left Column ──────────────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Progress Bar */}
              <div className="glass-card" style={{ padding: '16px 26px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
                  {stepLabels.map((label, i) => (
                    <React.Fragment key={i}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: currentStep > i ? '#678AFB' : currentStep === i ? '#678AFB' : 'rgba(0,0,0,0.08)',
                          color: currentStep >= i ? 'white' : '#787776', fontSize: 12, fontWeight: 600, transition: 'all 0.3s',
                        }}>
                          {currentStep > i ? <Check size={14} /> : i + 1}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: currentStep === i ? 600 : 400, color: currentStep >= i ? '#1A1918' : '#787776', whiteSpace: 'nowrap' }}>{label}</span>
                      </div>
                      {i < stepLabels.length - 1 && (
                        <div style={{ width: 40, height: 2, background: currentStep > i ? '#678AFB' : 'rgba(0,0,0,0.08)', margin: '0 12px', transition: 'background 0.3s' }} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Record Payment Form */}
              <div className="glass-card" style={{ padding: '26px', overflow: 'visible' }}>
                {currentStep === 0 && !selectedLoan && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', color: '#C7C6C4' }}>
                    <DollarSign size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
                    <p style={{ fontSize: 15, fontWeight: 500, color: '#787776', margin: 0 }}>Select a loan to get started</p>
                    <p style={{ fontSize: 12, color: '#C7C6C4', margin: '4px 0 0' }}>Choose from your active loans on the right</p>
                  </div>
                )}

                {currentStep === 1 && selectedLoan && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Loan sentence */}
                    <div style={{ background: 'rgba(103,138,251,0.06)', borderRadius: 14, padding: 16 }}>
                      <p style={{ fontSize: 15, fontWeight: 500, color: '#1A1918', margin: 0 }}>
                        {nameOrYouCapitalized(isUserLender(selectedLoan) ? selectedLoan.borrower_id : user?.id)} paid {nameOrYou(isUserLender(selectedLoan) ? user?.id : selectedLoan.lender_id)} <strong>${amount || '___'}</strong> for {selectedLoan.purpose || 'this loan'}
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
                          onFocus={e => e.target.style.borderColor = 'rgba(103,138,251,0.4)'}
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
                            <button key={method.id} onClick={() => { setPaymentMethod(method.id); setError(''); }} style={{
                              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 12,
                              border: isSelected ? '2px solid #678AFB' : '1px solid rgba(0,0,0,0.08)',
                              background: isSelected ? 'rgba(103,138,251,0.06)' : 'white',
                              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500, color: '#1A1918',
                              transition: 'all 0.15s',
                            }}>
                              <Icon size={16} style={{ color: isSelected ? '#678AFB' : method.color }} />
                              {method.label}
                            </button>
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
                      background: '#678AFB', color: 'white', fontSize: 14, fontWeight: 600,
                      cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}>
                      Continue <ArrowRight size={16} />
                    </button>
                  </div>
                )}

                {currentStep === 2 && selectedLoan && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ textAlign: 'center', paddingBottom: 16, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                      <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1A1918', margin: 0 }}>Confirm Payment</h3>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div style={{ background: 'rgba(103,138,251,0.06)', borderRadius: 12, padding: 14 }}>
                        <p style={{ fontSize: 11, color: '#787776', margin: 0 }}>Amount</p>
                        <p style={{ fontSize: 20, fontWeight: 700, color: '#1A1918', margin: '4px 0 0' }}>${parseFloat(amount).toFixed(2)}</p>
                      </div>
                      <div style={{ background: 'rgba(167,157,234,0.08)', borderRadius: 12, padding: 14 }}>
                        <p style={{ fontSize: 11, color: '#787776', margin: 0 }}>Method</p>
                        <p style={{ fontSize: 15, fontWeight: 600, color: '#1A1918', margin: '4px 0 0' }}>{PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label}</p>
                      </div>
                      <div style={{ background: 'rgba(103,138,251,0.06)', borderRadius: 12, padding: 14 }}>
                        <p style={{ fontSize: 11, color: '#787776', margin: 0 }}>Date</p>
                        <p style={{ fontSize: 13, fontWeight: 500, color: '#1A1918', margin: '4px 0 0' }}>{format(new Date(paymentDate + 'T12:00:00'), 'MMM d, yyyy')}</p>
                      </div>
                      <div style={{ background: 'rgba(167,157,234,0.08)', borderRadius: 12, padding: 14 }}>
                        <p style={{ fontSize: 11, color: '#787776', margin: 0 }}>To</p>
                        <p style={{ fontSize: 13, fontWeight: 500, color: '#1A1918', margin: '4px 0 0' }}>
                          {nameOrYouCapitalized(isUserLender(selectedLoan) ? selectedLoan.borrower_id : selectedLoan.lender_id)}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(103,138,251,0.06)' }}>
                      <Clock size={14} style={{ color: '#678AFB', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: '#678AFB' }}>
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
                        background: isProcessing ? '#a0b8f8' : '#678AFB', color: 'white', fontSize: 14, fontWeight: 600,
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
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: 16 }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(103,138,251,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle size={32} style={{ color: '#678AFB' }} />
                    </div>
                    <h3 style={{ fontSize: 20, fontWeight: 600, color: '#1A1918', margin: 0 }}>Payment Recorded!</h3>
                    <p style={{ fontSize: 13, color: '#787776', margin: 0, textAlign: 'center' }}>
                      Your payment of ${parseFloat(amount).toFixed(2)} has been sent for confirmation
                    </p>
                    {transactionId && (
                      <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 10, padding: '8px 16px' }}>
                        <span style={{ fontSize: 11, color: '#787776' }}>Ref: </span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#1A1918', fontFamily: 'monospace' }}>{transactionId}</span>
                      </div>
                    )}
                    <button onClick={() => { setSelectedLoan(null); setCurrentStep(0); setAmount(''); setPaymentMethod(''); setIsSuccess(false); setTransactionId(''); }} style={{
                      marginTop: 8, padding: '10px 24px', borderRadius: 12, border: 'none',
                      background: '#678AFB', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                    }}>
                      Record Another Payment
                    </button>
                  </div>
                )}
              </div>

              {/* Recommended Payment */}
              {selectedLoan && currentStep <= 1 && (
                <div className="glass-card" style={{ padding: '20px 26px' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0D0D0C', letterSpacing: '-0.02em' }}>Recommended Payment</span>
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: 22, fontWeight: 700, color: '#678AFB', margin: 0 }}>${getSuggestedPayment(selectedLoan).toFixed(2)}</p>
                      {selectedLoan.next_payment_date && (
                        <p style={{ fontSize: 11, color: '#787776', margin: '4px 0 0' }}>Due {format(new Date(selectedLoan.next_payment_date + 'T12:00:00'), 'MMM d, yyyy')}</p>
                      )}
                    </div>
                    <button onClick={() => { setAmount(getSuggestedPayment(selectedLoan).toFixed(2)); }} style={{
                      padding: '8px 16px', borderRadius: 10, border: 'none',
                      background: 'rgba(103,138,251,0.08)', fontSize: 12, fontWeight: 600,
                      color: '#678AFB', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                    }}>
                      Use Recommended
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Right Column: Select Your Loan ────────────── */}
            <div className="glass-card" style={{ overflow: 'visible' }}>
              <div style={{ padding: '20px 22px 0' }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#0D0D0C', letterSpacing: '-0.02em' }}>Select Your Loan</span>
              </div>

              {/* Filters */}
              <div style={{ padding: '12px 22px 0', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', overflow: 'visible', position: 'relative', zIndex: 20 }}>
                <SingleSelectDropdown options={ROLE_OPTIONS} selected={roleFilter} onChange={setRoleFilter} />
                <SingleSelectDropdown options={friendOptions} selected={friendFilter} onChange={setFriendFilter} />
                <button onClick={clearFilters} style={{
                  marginLeft: 'auto', padding: '6px 10px', borderRadius: 8, border: 'none',
                  background: 'transparent', fontSize: 11, fontWeight: 500,
                  color: hasAnyFilter ? '#E8726E' : '#C7C6C4',
                  cursor: hasAnyFilter ? 'pointer' : 'default',
                  fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
                }}>Clear Filters</button>
              </div>

              {/* Loan List */}
              <div style={{ padding: '12px 22px 22px', maxHeight: 420, overflowY: 'auto' }}>
                {filteredLoans.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', color: '#C7C6C4' }}>
                    <FileText size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <p style={{ fontSize: 12, color: '#787776', margin: 0 }}>No active loans found</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {filteredLoans.map(loan => {
                      const other = getOtherParty(loan);
                      const remaining = getRemainingBalance(loan);
                      const isSelected = selectedLoan?.id === loan.id;
                      return (
                        <button key={loan.id} onClick={() => handleSelectLoan(loan)} style={{
                          display: 'block', width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 12,
                          border: isSelected ? '2px solid #678AFB' : '1px solid rgba(0,0,0,0.06)',
                          background: isSelected ? 'rgba(103,138,251,0.06)' : 'rgba(0,0,0,0.02)',
                          cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: '50%', background: 'rgba(103,138,251,0.1)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden',
                            }}>
                              {other.profile_picture_url ? (
                                <img src={other.profile_picture_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                              ) : (
                                <span style={{ fontSize: 14, fontWeight: 600, color: '#678AFB' }}>{(other.full_name || '?').charAt(0).toUpperCase()}</span>
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
            </div>
          </div>

          {/* ── Payments Waiting for Approval ──────────────── */}
          {(paymentsToConfirm.length > 0 || paymentsYouRecorded.length > 0) && (
            <div className="glass-card" style={{ marginTop: 16, overflow: 'hidden' }}>
              <div style={{ padding: '20px 26px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#0D0D0C', letterSpacing: '-0.02em' }}>Payments Waiting for Approval</span>
                  <span style={{ fontSize: 12, color: '#787776' }}>{pendingPayments.length} pending</span>
                </div>
              </div>
              <div style={{ padding: '14px 26px 26px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {/* Payments needing your response */}
                  {paymentsToConfirm.map(payment => {
                    const loan = getPaymentLoan(payment);
                    if (!loan) return null;
                    const recorder = getUserById(payment.recorded_by);
                    const otherId = loan.lender_id === payment.recorded_by ? loan.borrower_id : loan.lender_id;
                    return (
                      <div key={payment.id} style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                        borderRadius: 12, background: 'rgba(0,0,0,0.03)',
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: '#1A1918', margin: 0 }}>
                            {nameOrYouCapitalized(payment.recorded_by)} paid {nameOrYou(otherId)} ${payment.amount?.toFixed(2)}
                          </p>
                          <p style={{ fontSize: 11, color: '#787776', margin: '2px 0 0' }}>
                            {payment.payment_date ? format(new Date(payment.payment_date + 'T12:00:00'), 'MMM d, yyyy') : 'No date'}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          <button
                            onClick={() => handleApprovePayment(payment)}
                            disabled={processingId === payment.id}
                            style={{
                              padding: '6px 14px', borderRadius: 10, border: 'none',
                              background: '#678AFB', fontSize: 11, fontWeight: 600, color: 'white',
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
                    return (
                      <div key={payment.id} style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                        borderRadius: 12, background: 'rgba(0,0,0,0.03)',
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: '#1A1918', margin: 0 }}>
                            {nameOrYouCapitalized(user?.id)} paid {nameOrYou(otherId)} ${payment.amount?.toFixed(2)}
                          </p>
                          <p style={{ fontSize: 11, color: '#787776', margin: '2px 0 0' }}>
                            {payment.payment_date ? format(new Date(payment.payment_date + 'T12:00:00'), 'MMM d, yyyy') : 'No date'}
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
            </div>
          )}
        </div>
        </div>{/* end content box */}
        <div style={{ padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: '#787776' }}>2026 Vony, Inc. All rights reserved.</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <span style={{ fontSize: 11, color: '#787776' }}>Terms of Service</span>
            <span style={{ fontSize: 11, color: '#787776' }}>Privacy Center</span>
            <span style={{ fontSize: 11, color: '#787776' }}>Do not sell or share my personal information</span>
          </div>
        </div>
      </div>
    </>
  );
}

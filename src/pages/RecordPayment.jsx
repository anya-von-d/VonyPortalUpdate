import { useState, useEffect, useRef } from "react";
import { Payment, Loan, User, PublicProfile } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  DollarSign, CheckCircle, CreditCard, Banknote, Smartphone, ChevronDown,
  AlertCircle, ArrowRight, ArrowLeft, X, Clock, ArrowUpDown
} from "lucide-react";
import { format, addMonths } from "date-fns";
import { toLocalDate } from "@/components/utils/dateUtils";
import { todayInTZ, currentDateStringTZ, formatTZ } from "@/components/utils/timezone";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { AnimatedCheckmark } from "@/components/ui/animations";
import MeshMobileNav from "@/components/MeshMobileNav";
import DesktopSidebar from "@/components/DesktopSidebar";
import { formatMoney } from "@/components/utils/formatMoney";

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
function FormPillSelect({ options, value, onChange, placeholder = 'Select…', width, flat }) {
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
          padding: flat ? '10px 14px' : '10px 12px', borderRadius: flat ? 12 : 12,
          border: flat ? 'none' : `1px solid ${value ? 'rgba(3,172,234,0.35)' : 'rgba(0,0,0,0.06)'}`,
          background: flat ? 'transparent' : (value ? 'rgba(3,172,234,0.06)' : 'white'),
          fontSize: 13, fontWeight: value ? 600 : 400,
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
          minWidth: '100%', zIndex: 300,
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
                cursor: 'pointer', fontSize: 13,
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

/* ── PersonPill ─────────────────────────────────────────── */
function PersonPill({ person, dim }) {
  const name = person?.full_name?.split(' ')[0] || person?.username || '—';
  const initial = name.slice(0, 1).toUpperCase();
  const bg = dim ? '#E8E7E5' : '#1A1918';
  const textColor = dim ? '#9B9A98' : 'white';
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: bg, borderRadius: 30, padding: '5px 12px 5px 5px' }}>
      {person?.profile_picture_url ? (
        <img src={person.profile_picture_url} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} />
      ) : (
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: dim ? '#D0CFCD' : 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: dim ? '#9B9A98' : 'white' }}>
          {person ? initial : '?'}
        </div>
      )}
      <span style={{ fontSize: 14, fontWeight: 600, color: textColor, fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
        {person ? name : 'Select loan'}
      </span>
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
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => currentDateStringTZ());
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

  // Tab
  const [activePaymentTab, setActivePaymentTab] = useState('payments');

  useEffect(() => { if (user?.id) loadData(); }, [user?.id]);

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

  useEffect(() => {
    if (isSuccess) {
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.55 }, colors: ['#03ACEA', '#7C3AED', '#60C4F8', '#ffffff', '#A78BFA'], zIndex: 9999 });
      setTimeout(() => {
        confetti({ particleCount: 50, spread: 60, origin: { x: 0.2, y: 0.6 }, colors: ['#03ACEA', '#7C3AED'], zIndex: 9999 });
        confetti({ particleCount: 50, spread: 60, origin: { x: 0.8, y: 0.6 }, colors: ['#03ACEA', '#7C3AED'], zIndex: 9999 });
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
    } catch (err) { console.error("Error loading data:", err); }
    setIsLoading(false);
  };

  const getUserById = (userId) => {
    const p = profiles.find(pr => pr.user_id === userId);
    return p || { username: 'user', full_name: 'Unknown User', profile_picture_url: null };
  };

  const getSelfProfile = () => ({
    full_name: user?.full_name || 'You',
    username: user?.username || 'you',
    profile_picture_url: user?.profile_picture_url || null,
  });

  const getOtherParty = (loan) => {
    const otherId = loan.lender_id === user?.id ? loan.borrower_id : loan.lender_id;
    return getUserById(otherId);
  };

  const getRemainingBalance = (loan) => (loan.total_amount || loan.amount || 0) - (loan.amount_paid || 0);
  const isUserLender = (loan) => loan.lender_id === user?.id;

  const friendOptions = (() => {
    const ids = [...new Set(loans.map(l => l.lender_id === user?.id ? l.borrower_id : l.lender_id))];
    return [{ id: 'all', label: 'All Friends' }, ...ids.map(id => {
      const p = getUserById(id);
      return { id, label: p.full_name || p.username };
    }).sort((a, b) => a.label.localeCompare(b.label))];
  })();

  const getLoanDueDays = (loan) => {
    if (!loan.next_payment_date) return null;
    const today = todayInTZ();
    const due = toLocalDate(loan.next_payment_date);
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
    const da = getLoanDueDays(a);
    const db = getLoanDueDays(b);
    if (da === null && db === null) return 0;
    if (da === null) return 1;
    if (db === null) return -1;
    return da - db;
  });

  // Derived: payer/receiver for the FROM/TO swap UI
  const payerProfile = selectedLoan
    ? (isUserLender(selectedLoan) ? getOtherParty(selectedLoan) : getSelfProfile())
    : null;
  const receiverProfile = selectedLoan
    ? (isUserLender(selectedLoan) ? getSelfProfile() : getOtherParty(selectedLoan))
    : null;

  // Payments for tab section
  const userLoanIds = allLoans
    .filter(l => l.lender_id === user?.id || l.borrower_id === user?.id)
    .map(l => l.id);
  const allUserPayments = allPayments
    .filter(p => userLoanIds.includes(p.loan_id))
    .sort((a, b) => new Date(b.payment_date || b.created_at) - new Date(a.payment_date || a.created_at));

  // Loan dropdown options
  const loanOptions = filteredLoans.map(loan => {
    const other = getOtherParty(loan);
    const firstName = other.full_name?.split(' ')[0] || other.username;
    const isLender = isUserLender(loan);
    const remaining = getRemainingBalance(loan);
    return {
      id: loan.id,
      label: isLender
        ? `${firstName} → You · ${formatMoney(remaining)} remaining`
        : `You → ${firstName} · ${formatMoney(remaining)} remaining`,
    };
  });

  const handleSelectLoan = (loan) => {
    setSelectedLoan(loan);
    setAmount('');
    setPaymentMethod('');
    setPaymentDate(currentDateStringTZ());
    setError('');
    setCurrentStep(1);
    setIsSuccess(false);
    setTransactionId('');
  };

  const handleContinue = () => {
    if (!selectedLoan) { setError('Select a loan first'); return; }
    let valid = true;
    if (!amount || parseFloat(amount) <= 0) { setError('Enter a valid amount'); valid = false; }
    else if (parseFloat(amount) > getRemainingBalance(selectedLoan)) { setError('Amount exceeds remaining balance'); valid = false; }
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
          loanUpdate.next_payment_date = format(addMonths(todayInTZ(), 1), 'yyyy-MM-dd');
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

  const paymentsToConfirm = pendingPayments.filter(p => p.recorded_by !== user?.id);
  const paymentsYouRecorded = pendingPayments.filter(p => p.recorded_by === user?.id);
  const getPaymentLoan = (payment) => allLoans.find(l => l.id === payment.loan_id);

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

  /* ══════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════ */
  return (
    <div style={{ minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", background: 'transparent', color: '#1A1918' }}>
      <MeshMobileNav activePage="RecordPayment" />

      {/* Deny confirmation modal */}
      <AnimatePresence>
        {confirmingDeny && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
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
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A1918', textAlign: 'center', margin: '0 0 8px', fontFamily: "'DM Sans', sans-serif" }}>Deny Payment?</h3>
              <p style={{ fontSize: 13, color: '#787776', textAlign: 'center', margin: '0 0 24px', lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>
                Are you sure you didn't receive this payment?
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setConfirmingDeny(null)} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)', background: 'white', fontSize: 13, fontWeight: 600, color: '#787776', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
                <button onClick={handleDenyPayment} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', background: '#E8726E', fontSize: 13, fontWeight: 600, color: 'white', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Deny</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mesh-layout" style={{ display: 'grid', gridTemplateColumns: '176px 1fr', gap: 0 }}>
        <DesktopSidebar />

        <div className="mesh-center" style={{ padding: '24px 56px 80px', width: '100%' }}>

          {/* Desktop title */}
          <div className="desktop-page-title" style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.2, color: '#1A1918' }}>
              Log Payment
            </div>
          </div>

          {/* Mobile title */}
          <div className="mobile-page-title">
            <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.02em', marginBottom: 12 }}>Log Payment</div>
          </div>

          {/* No loans banner */}
          {!isLoading && loans.length === 0 && (
            <div style={{ marginBottom: 28, padding: '16px 22px', borderRadius: 10, background: 'white', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 13, color: '#787776', fontFamily: "'DM Sans', sans-serif" }}>💸 Nothing to record just yet! Create a loan first.</div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <Link to={createPageUrl('CreateOffer')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 9, background: '#03ACEA', color: 'white', textDecoration: 'none', fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>Create a Loan</Link>
              </div>
            </div>
          )}

          {/* ── Main grid: form left, history right ── */}
          <div className="rp-page-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'start' }}>

            {/* ── LEFT: Swap-style payment form ── */}
            <div style={{ maxWidth: 460 }}>

              {/* ── Step 0/1: The swap form ── */}
              {currentStep <= 1 && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>

                  {/* Loan selector */}
                  <div style={{ marginBottom: 20 }}>
                    <FormPillSelect
                      options={loanOptions.length ? loanOptions : [{ id: '', label: 'No active loans' }]}
                      value={selectedLoan?.id || ''}
                      onChange={(id) => {
                        const loan = filteredLoans.find(l => l.id === id);
                        if (loan) handleSelectLoan(loan);
                      }}
                      placeholder="Select a loan…"
                    />
                  </div>

                  {/* FROM */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.09em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>From</span>
                      {selectedLoan && <span style={{ fontSize: 11, color: '#787776', fontFamily: "'DM Sans', sans-serif" }}>Remaining: {formatMoney(getRemainingBalance(selectedLoan))}</span>}
                    </div>
                    <div style={{ background: '#F5F4F2', borderRadius: 18, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <PersonPill person={payerProfile} dim={!payerProfile} />
                      </div>
                      <input
                        type="number" step="0.01" min="0"
                        value={amount}
                        onChange={e => { setAmount(e.target.value); setError(''); }}
                        placeholder="0.00"
                        disabled={!selectedLoan}
                        style={{
                          width: 120, textAlign: 'right',
                          fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em',
                          border: 'none', background: 'transparent', outline: 'none',
                          color: amount ? '#1A1918' : '#D0CFCD',
                          fontFamily: "'DM Sans', sans-serif",
                          cursor: selectedLoan ? 'text' : 'default',
                        }}
                      />
                    </div>
                  </div>

                  {/* Connector + swap button */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 40, position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: '#E8E7E5', transform: 'translateX(-50%)' }} />
                    <div style={{
                      position: 'relative', zIndex: 1,
                      width: 34, height: 34, borderRadius: 17,
                      background: '#1A1918', border: '3px solid white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
                    }}>
                      <ArrowUpDown size={14} style={{ color: 'white' }} />
                    </div>
                  </div>

                  {/* TO */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.09em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>To</span>
                      {selectedLoan && <span style={{ fontSize: 11, color: '#787776', fontFamily: "'DM Sans', sans-serif" }}>Received: {formatMoney(selectedLoan.amount_paid || 0)}</span>}
                    </div>
                    <div style={{ background: '#F5F4F2', borderRadius: 18, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <PersonPill person={receiverProfile} dim={!receiverProfile} />
                      </div>
                      <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em', color: (amount && parseFloat(amount) > 0) ? '#1A1918' : '#D0CFCD', fontFamily: "'DM Sans', sans-serif" }}>
                        {(amount && parseFloat(amount) > 0) ? parseFloat(amount).toFixed(2) : '0.00'}
                      </span>
                    </div>
                  </div>

                  {/* VIA row */}
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.09em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>Via</span>
                      {selectedLoan && (() => {
                        const days = getLoanDueDays(selectedLoan);
                        if (days === null) return null;
                        const color = days < 0 ? '#E8726E' : '#787776';
                        const txt = days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `Due in ${days}d`;
                        return <span style={{ fontSize: 11, color, fontFamily: "'DM Sans', sans-serif" }}>{txt}</span>;
                      })()}
                    </div>
                    <div style={{ background: '#F5F4F2', borderRadius: 18, padding: '6px', display: 'flex', gap: 6 }}>
                      <div style={{ flex: 1 }}>
                        <FormPillSelect
                          flat
                          value={paymentMethod}
                          onChange={v => { setPaymentMethod(v); setError(''); }}
                          options={PAYMENT_METHODS.map(m => ({ id: m.id, label: m.label }))}
                          placeholder="Payment method…"
                        />
                      </div>
                      <input
                        type="date" value={paymentDate} max={currentDateStringTZ()}
                        onChange={e => setPaymentDate(e.target.value)}
                        style={{
                          flexShrink: 0, padding: '10px 12px', borderRadius: 12,
                          border: 'none', background: 'white',
                          fontSize: 12, color: '#1A1918', fontFamily: "'DM Sans', sans-serif", outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  {error && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: 'rgba(232,114,110,0.08)', marginTop: 10 }}>
                      <AlertCircle size={14} style={{ color: '#E8726E', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: '#E8726E', fontFamily: "'DM Sans', sans-serif" }}>{error}</span>
                    </div>
                  )}

                  {/* Review button */}
                  <div style={{ position: 'relative', paddingTop: 14 }}>
                    <div style={{
                      position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                      width: 'calc(100% + 36px)', height: '100%',
                      background: 'linear-gradient(225deg, rgb(129,140,248) 0%, rgb(99,102,241) 12%, rgb(79,70,229) 24%, rgb(67,56,202) 36%, rgb(37,99,235) 50%, rgb(59,130,246) 64%, rgb(96,165,250) 76%, rgb(56,189,248) 88%, rgb(14,165,233) 100%)',
                      filter: 'blur(12px) saturate(1.18)', opacity: selectedLoan ? 0.55 : 0.15,
                      borderRadius: 16, zIndex: 0, pointerEvents: 'none',
                    }} />
                    <button
                      onClick={handleContinue}
                      style={{
                        position: 'relative', zIndex: 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        width: '100%', padding: '13px', borderRadius: 12,
                        background: '#14324D', border: 'none', cursor: 'pointer',
                        fontSize: 13, fontWeight: 600, color: 'white', fontFamily: "'DM Sans', sans-serif",
                        opacity: selectedLoan ? 1 : 0.5,
                      }}
                    >
                      Review Payment <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 2: Confirm ── */}
              {currentStep === 2 && selectedLoan && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { label: 'Amount', value: formatMoney(parseFloat(amount)) },
                      { label: 'Method', value: PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label || '—' },
                      { label: 'Date', value: format(toLocalDate(paymentDate), 'MMM d, yyyy') },
                      { label: 'To', value: nameOrYouCapitalized(isUserLender(selectedLoan) ? user?.id : selectedLoan.lender_id) },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ background: '#F5F4F2', borderRadius: 14, padding: '14px 16px' }}>
                        <p style={{ fontSize: 11, color: '#787776', margin: 0, fontFamily: "'DM Sans', sans-serif" }}>{label}</p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1918', margin: '4px 0 0', fontFamily: "'DM Sans', sans-serif" }}>{value}</p>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: 'rgba(3,172,234,0.08)' }}>
                    <Clock size={14} style={{ color: '#03ACEA', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#03ACEA', fontFamily: "'DM Sans', sans-serif" }}>
                      {getOtherParty(selectedLoan).full_name || getOtherParty(selectedLoan).username} will need to confirm this payment
                    </span>
                  </div>

                  {error && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: 'rgba(232,114,110,0.08)' }}>
                      <AlertCircle size={14} style={{ color: '#E8726E', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: '#E8726E', fontFamily: "'DM Sans', sans-serif" }}>{error}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={() => setCurrentStep(1)} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)', background: 'white', fontSize: 13, fontWeight: 600, color: '#787776', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <ArrowLeft size={14} /> Back
                    </button>
                    <div style={{ flex: 2, position: 'relative', paddingTop: 8 }}>
                      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 'calc(100% + 36px)', height: '100%', background: 'linear-gradient(225deg, rgb(129,140,248) 0%, rgb(99,102,241) 12%, rgb(79,70,229) 24%, rgb(67,56,202) 36%, rgb(37,99,235) 50%, rgb(59,130,246) 64%, rgb(96,165,250) 76%, rgb(56,189,248) 88%, rgb(14,165,233) 100%)', filter: 'blur(12px) saturate(1.18)', opacity: isProcessing ? 0.28 : 0.55, borderRadius: 16, zIndex: 0, pointerEvents: 'none' }} />
                      <button onClick={handleConfirmPayment} disabled={isProcessing} style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '12px', borderRadius: 12, background: isProcessing ? 'rgba(20,50,77,0.6)' : '#14324D', border: 'none', cursor: isProcessing ? 'default' : 'pointer', fontSize: 13, fontWeight: 600, color: 'white', fontFamily: "'DM Sans', sans-serif" }}>
                        {isProcessing ? <div style={{ width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : <><CheckCircle size={14} /> Confirm Payment</>}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 3: Success ── */}
              {currentStep === 3 && isSuccess && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: 16 }}
                >
                  <AnimatedCheckmark size="xl" delay={0.1} />
                  <motion.h3 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} style={{ fontSize: 18, fontWeight: 700, color: '#1A1918', margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
                    Payment Recorded! 🎉
                  </motion.h3>
                  <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} style={{ fontSize: 13, color: '#787776', margin: 0, textAlign: 'center', fontFamily: "'DM Sans', sans-serif" }}>
                    {formatMoney(parseFloat(amount))} sent for confirmation
                  </motion.p>
                  {transactionId && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }} style={{ background: '#F5F4F2', borderRadius: 10, padding: '8px 16px' }}>
                      <span style={{ fontSize: 11, color: '#787776', fontFamily: "'DM Sans', sans-serif" }}>Ref: </span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#1A1918', fontFamily: 'monospace' }}>{transactionId}</span>
                    </motion.div>
                  )}
                  <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                    onClick={() => { setSelectedLoan(null); setCurrentStep(0); setAmount(''); setPaymentMethod(''); setIsSuccess(false); setTransactionId(''); }}
                    style={{ marginTop: 8, padding: '12px 28px', borderRadius: 12, border: 'none', background: '#14324D', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    Record Another
                  </motion.button>
                </motion.div>
              )}
            </div>

            {/* ── RIGHT: Payment history tabs ── */}
            <div>
              {/* Pill tab nav */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'inline-flex', background: '#F0F0EE', borderRadius: 12, padding: 3, gap: 2 }}>
                  {[
                    { key: 'payments', label: 'Payments' },
                    { key: 'pending', label: 'Pending Payments' },
                  ].map(({ key, label }) => {
                    const active = activePaymentTab === key;
                    return (
                      <button key={key} onClick={() => setActivePaymentTab(key)} style={{
                        padding: '7px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
                        background: active ? 'white' : 'transparent',
                        color: active ? '#1A1918' : '#787776',
                        fontSize: 13, fontWeight: active ? 600 : 500,
                        fontFamily: "'DM Sans', sans-serif",
                        letterSpacing: '-0.01em',
                        boxShadow: active ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                        transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        {label}
                        {key === 'pending' && pendingPayments.length > 0 && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 17, height: 17, borderRadius: 9, background: active ? '#14324D' : '#9B9A98', color: 'white', fontSize: 9, fontWeight: 800, padding: '0 4px' }}>
                            {pendingPayments.length}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Payments tab */}
              {activePaymentTab === 'payments' && (
                <div>
                  {allUserPayments.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
                      <p style={{ fontSize: 13, color: '#787776', margin: 0, fontFamily: "'DM Sans', sans-serif" }}>No payments recorded yet ✨</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {allUserPayments.map((payment) => {
                        const loan = allLoans.find(l => l.id === payment.loan_id);
                        if (!loan) return null;
                        const isLender = loan.lender_id === user?.id;
                        const otherId = isLender ? loan.borrower_id : loan.lender_id;
                        const other = getUserById(otherId);
                        const firstName = other.full_name?.split(' ')[0] || other.username;
                        const dateStr = payment.payment_date ? formatTZ(payment.payment_date, 'MMM d, yyyy') : '';
                        const method = PAYMENT_METHODS.find(m => m.id === payment.payment_method)?.label || payment.payment_method || '';
                        const statusMap = {
                          completed: { label: 'Confirmed', bg: 'rgba(3,172,234,0.10)', color: '#03ACEA' },
                          denied: { label: 'Denied', bg: 'rgba(232,114,110,0.08)', color: '#E8726E' },
                          pending_confirmation: { label: 'Pending', bg: 'rgba(240,180,0,0.10)', color: '#B08000' },
                        };
                        const st = statusMap[payment.status] || statusMap.pending_confirmation;
                        return (
                          <div key={payment.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
                            <div style={{ width: 38, height: 38, borderRadius: '50%', background: isLender ? 'rgba(3,172,234,0.12)' : 'rgba(29,91,148,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <DollarSign size={17} style={{ color: isLender ? '#03ACEA' : '#1D5B94' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif" }}>
                                {isLender ? `${firstName} paid you` : `You paid ${firstName}`} · {formatMoney(payment.amount)}
                              </div>
                              <div style={{ fontSize: 11, color: '#787776', marginTop: 2, fontFamily: "'DM Sans', sans-serif" }}>
                                {[dateStr, method].filter(Boolean).join(' · ')}
                              </div>
                            </div>
                            <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: st.color, background: st.bg, borderRadius: 6, padding: '2px 8px', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
                              {st.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Pending Payments tab */}
              {activePaymentTab === 'pending' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {pendingPayments.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
                      <p style={{ fontSize: 13, color: '#787776', margin: 0, fontFamily: "'DM Sans', sans-serif" }}>No pending payments ✨</p>
                    </div>
                  ) : (
                    <>
                      {paymentsToConfirm.length > 0 && (
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}>
                            Awaiting Your Confirmation
                          </div>
                          {paymentsToConfirm.map(payment => {
                            const loan = getPaymentLoan(payment);
                            if (!loan) return null;
                            const isProcessingThis = processingId === payment.id;
                            const method = PAYMENT_METHODS.find(m => m.id === payment.payment_method)?.label || payment.payment_method || '';
                            return (
                              <div key={payment.id} style={{ background: '#F5F4F2', borderRadius: 14, padding: '14px 16px', marginBottom: 10 }}>
                                <div style={{ marginBottom: 12 }}>
                                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1918', fontFamily: "'DM Sans', sans-serif" }}>
                                    {nameOrYouCapitalized(payment.recorded_by)} recorded {formatMoney(payment.amount)}
                                  </div>
                                  <div style={{ fontSize: 11, color: '#787776', marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>
                                    {[payment.payment_date ? formatTZ(payment.payment_date, 'MMM d, yyyy') : '', method].filter(Boolean).join(' · ')}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <button onClick={() => setConfirmingDeny(payment)} disabled={isProcessingThis} style={{ flex: 1, padding: '9px 0', borderRadius: 9, border: '1px solid rgba(232,114,110,0.25)', background: 'rgba(232,114,110,0.06)', fontSize: 12, fontWeight: 600, color: '#E8726E', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                                    Deny
                                  </button>
                                  <button onClick={() => handleApprovePayment(payment)} disabled={isProcessingThis} style={{ flex: 2, padding: '9px 0', borderRadius: 9, border: 'none', background: '#14324D', fontSize: 12, fontWeight: 600, color: 'white', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                    {isProcessingThis ? <div style={{ width: 14, height: 14, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : <><CheckCircle size={13} /> Confirm</>}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {paymentsYouRecorded.length > 0 && (
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}>
                            Awaiting Their Confirmation
                          </div>
                          {paymentsYouRecorded.map(payment => {
                            const loan = getPaymentLoan(payment);
                            if (!loan) return null;
                            const other = getOtherParty(loan);
                            const firstName = other.full_name?.split(' ')[0] || other.username;
                            return (
                              <div key={payment.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
                                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(240,180,0,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <Clock size={17} style={{ color: '#B08000' }} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif" }}>
                                    {formatMoney(payment.amount)} awaiting {firstName}'s confirmation
                                  </div>
                                  <div style={{ fontSize: 11, color: '#787776', marginTop: 2, fontFamily: "'DM Sans', sans-serif" }}>
                                    {payment.payment_date ? formatTZ(payment.payment_date, 'MMM d, yyyy') : ''}
                                  </div>
                                </div>
                                <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: '#B08000', background: 'rgba(240,180,0,0.10)', borderRadius: 6, padding: '2px 8px', fontFamily: "'DM Sans', sans-serif" }}>
                                  Pending
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

          </div>{/* end rp-page-grid */}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .rp-page-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
        }
      `}</style>
    </div>
  );
}

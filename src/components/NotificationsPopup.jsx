import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Payment, Loan, PublicProfile, LoanAgreement, Friendship } from '@/entities/all';
import { useAuth } from '@/lib/AuthContext';
import { CheckCircle, X } from 'lucide-react';
import { format, addMonths, parseISO } from 'date-fns';
import { toLocalDate, daysUntil as daysUntilDate } from '@/components/utils/dateUtils';
import BorrowerSignatureModal from '@/components/loans/BorrowerSignatureModal';
import confetti from 'canvas-confetti';

export default function NotificationsPopup({ onClose, positionOverride, onOpenFriends }) {
  const { user: authUser, userProfile } = useAuth();
  const user = userProfile ? { ...userProfile, id: authUser?.id } : null;
  const navigate = useNavigate();

  const [paymentsToConfirm, setPaymentsToConfirm] = useState([]);
  const [termChangeRequests, setTermChangeRequests] = useState([]);
  const [loanOffersReceived, setLoanOffersReceived] = useState([]);
  const [friendRequestsReceived, setFriendRequestsReceived] = useState([]);
  const [loans, setLoans] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [confirmingDeny, setConfirmingDeny] = useState(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);

  const popupRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  useEffect(() => {
    if (user?.id) loadRequests();
  }, [user?.id]);

  const loadRequests = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const [fetchedPayments, allLoans, allProfiles, allAgreements, allFriendships] = await Promise.all([
        Payment.list().catch(() => []),
        Loan.list().catch(() => []),
        PublicProfile.list().catch(() => []),
        LoanAgreement.list().catch(() => []),
        Friendship.list().catch(() => []),
      ]);

      setAllPayments(fetchedPayments);

      const userLoans = allLoans.filter(l => l.lender_id === user.id || l.borrower_id === user.id);
      const userLoanIds = userLoans.map(l => l.id);

      const pendingPayments = fetchedPayments.filter(p => p.status === 'pending_confirmation');

      const toConfirm = pendingPayments.filter(payment => {
        if (!userLoanIds.includes(payment.loan_id)) return false;
        const loan = userLoans.find(l => l.id === payment.loan_id);
        if (!loan) return false;
        return payment.recorded_by !== user.id;
      });

      const termChanges = allLoans.filter(loan =>
        userLoanIds.includes(loan.id) &&
        loan.status === 'pending_borrower_approval' &&
        loan.borrower_id === user.id
      );

      const offersReceived = allLoans.filter(loan =>
        loan.borrower_id === user.id && loan.status === 'pending'
      );

      const friendRequests = allFriendships.filter(f =>
        f.friend_id === user.id && f.status === 'pending'
      );

      setPaymentsToConfirm(toConfirm);
      setTermChangeRequests(termChanges);
      setLoanOffersReceived(offersReceived);
      setFriendRequestsReceived(friendRequests);
      setLoans(allLoans);
      setProfiles(allProfiles);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
    setIsLoading(false);
  };

  const buildReminders = () => {
    if (!user?.id) return [];
    const reminders = [];
    const activeLoans = loans.filter(l =>
      l.status === 'active' &&
      (l.lender_id === user.id || l.borrower_id === user.id) &&
      l.next_payment_date
    );
    activeLoans.forEach(loan => {
      const daysUntil = daysUntilDate(loan.next_payment_date);
      if (daysUntil > 5) return;
      // If there's a pending_confirmation payment, don't treat this loan as overdue
      const hasPendingPayment = allPayments.some(p => p.loan_id === loan.id && p.status === 'pending_confirmation');
      if (daysUntil < 0 && hasPendingPayment) return;
      const isBorrower = loan.borrower_id === user.id;
      const otherUserId = isBorrower ? loan.lender_id : loan.borrower_id;
      const otherProfile = profiles.find(p => p.user_id === otherUserId);
      const otherName = otherProfile?.full_name || otherProfile?.username || 'Unknown';
      const completedPayments = allPayments.filter(p => p.loan_id === loan.id && p.status === 'completed');
      const totalPaid = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const remainingAmount = (loan.total_amount || loan.amount || 0) - totalPaid;
      const paymentAmount = Math.min(loan.payment_amount || 0, remainingAmount);
      if (paymentAmount <= 0) return;
      if (isBorrower) {
        if (daysUntil < 0) {
          reminders.push({ id: `reminder-owe-${loan.id}`, type: 'overdue_owe', loan, title: `Your payment to ${otherName} is overdue`, daysUntil, paymentAmount, otherName });
        } else if (daysUntil === 0) {
          reminders.push({ id: `reminder-owe-${loan.id}`, type: 'due_today_owe', loan, title: `You have a payment due today to ${otherName}`, daysUntil, paymentAmount, otherName });
        } else {
          reminders.push({ id: `reminder-owe-${loan.id}`, type: 'upcoming_owe', loan, title: `You have an upcoming payment to ${otherName}`, daysUntil, paymentAmount, otherName });
        }
      } else {
        if (daysUntil < 0) {
          reminders.push({ id: `reminder-receive-${loan.id}`, type: 'overdue_receive', loan, title: `${otherName}'s payment to you is overdue`, daysUntil, paymentAmount, otherName });
        } else if (daysUntil === 0) {
          reminders.push({ id: `reminder-receive-${loan.id}`, type: 'due_today_receive', loan, title: `You are due to receive a payment from ${otherName} today`, daysUntil, paymentAmount, otherName });
        } else {
          reminders.push({ id: `reminder-receive-${loan.id}`, type: 'upcoming_receive', loan, title: `You are due to receive a payment from ${otherName}`, daysUntil, paymentAmount, otherName });
        }
      }
    });
    reminders.sort((a, b) => a.daysUntil - b.daysUntil);
    return reminders;
  };

  const reminders = buildReminders();
  const getUserById = (userId) => profiles.find(p => p.user_id === userId) || { full_name: 'Unknown', username: 'unknown' };
  const getLoanOtherParty = (loan) => {
    const otherUserId = loan.lender_id === user?.id ? loan.borrower_id : loan.lender_id;
    const profile = profiles.find(p => p.user_id === otherUserId);
    return profile?.full_name || profile?.username || 'Unknown';
  };

  const handleConfirmPayment = async (payment) => {
    setProcessingId(payment.id);
    try {
      await Payment.update(payment.id, { status: 'completed' });
      setPaymentsToConfirm(prev => prev.filter(p => p.id !== payment.id));
      confetti({ particleCount: 80, spread: 65, origin: { y: 0.5 }, colors: ['#35B276', '#03ACEA', '#ffffff'], zIndex: 9999 });
      const loan = loans.find(l => l.id === payment.loan_id);
      if (loan) {
        const newAmountPaid = (loan.amount_paid || 0) + payment.amount;
        const newRemainingBalance = (loan.total_amount || 0) - newAmountPaid;
        const loanUpdate = { amount_paid: newAmountPaid };
        if (newRemainingBalance <= 0.01) { loanUpdate.status = 'completed'; loanUpdate.next_payment_date = null; }
        else { loanUpdate.next_payment_date = format(addMonths(new Date(), 1), 'yyyy-MM-dd'); }
        await Loan.update(loan.id, loanUpdate);
      }
      loadRequests();
    } catch (error) { console.error('Error confirming payment:', error); }
    setProcessingId(null);
  };

  const handleDenyPayment = async () => {
    if (!confirmingDeny) return;
    const payment = confirmingDeny;
    setProcessingId(payment.id);
    setConfirmingDeny(null);
    try {
      await Payment.update(payment.id, { status: 'denied' });
      setPaymentsToConfirm(prev => prev.filter(p => p.id !== payment.id));
      loadRequests();
    } catch (error) { console.error('Error denying payment:', error); }
    setProcessingId(null);
  };

  const handleSignOffer = async (signature) => {
    if (!selectedOffer) return;
    setProcessingId(selectedOffer.id);
    try {
      await Loan.update(selectedOffer.id, { status: 'active' });
      const agreements = await LoanAgreement.list();
      const agreement = agreements.find(a => a.loan_id === selectedOffer.id);
      if (agreement) {
        await LoanAgreement.update(agreement.id, {
          borrower_name: signature,
          borrower_signed_date: new Date().toISOString(),
          is_fully_signed: true,
        });
      }
      setShowSignatureModal(false);
      setSelectedOffer(null);
      loadRequests();
    } catch (error) { console.error('Error signing loan offer:', error); }
    setProcessingId(null);
  };

  const handleDeclineOffer = async () => {
    if (!selectedOffer) return;
    setProcessingId(selectedOffer.id);
    try {
      await Loan.update(selectedOffer.id, { status: 'declined' });
      setShowSignatureModal(false);
      setSelectedOffer(null);
      loadRequests();
      // Tell other pages (Home, etc.) to refresh their loan data
      window.dispatchEvent(new CustomEvent('loan-status-changed'));
    } catch (error) { console.error('Error declining loan offer:', error); }
    setProcessingId(null);
  };

  // ── Icon map — plain symbols, no background ──────────────────
  const TypeIcon = ({ type }) => {
    const isOverdue = type.startsWith('overdue');
    if (type === 'overdue_owe' || type === 'due_today_owe' || type === 'upcoming_owe') {
      return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isOverdue ? '#E8726E' : '#03ACEA'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
    }
    if (type === 'overdue_receive' || type === 'due_today_receive' || type === 'upcoming_receive') {
      return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isOverdue ? '#D97706' : '#03ACEA'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
    }
    if (type === 'friend') return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
    if (type === 'offer_received') return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>;
    if (type === 'payment_confirm') return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}}><polyline points="20 6 9 17 4 12"/></svg>;
    if (type === 'term_change') return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
    return null;
  };

  // ── Action button — plain text link style ────────────────────
  const ActionBtn = ({ label, color = '#03ACEA', onClick, disabled }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'none', border: 'none', padding: 0, cursor: disabled ? 'default' : 'pointer',
        fontSize: 12, fontWeight: 600, color: disabled ? '#C7C6C4' : color,
        fontFamily: "'DM Sans', sans-serif", flexShrink: 0, whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );

  // ── Arrow chevron button ──────────────────────────────────────
  const ArrowBtn = ({ onClick, disabled }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'none', border: 'none', padding: '2px 0 2px 4px',
        cursor: disabled ? 'default' : 'pointer',
        color: disabled ? '#C7C6C4' : 'rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'center', flexShrink: 0,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );

  // ── Build allItems ───────────────────────────────────────────
  const allItems = [];
  friendRequestsReceived.forEach(request => {
    const senderProfile = profiles.find(p => p.user_id === request.user_id);
    const name = senderProfile?.full_name || senderProfile?.username || 'Unknown';
    allItems.push({ type: 'friend', id: `friend-${request.id}`, timestamp: new Date(request.created_at || 0), data: request, name });
  });
  loanOffersReceived.forEach(offer => {
    const lender = getUserById(offer.lender_id);
    const name = lender?.full_name || lender?.username || 'Unknown';
    allItems.push({ type: 'offer_received', id: `offer-recv-${offer.id}`, timestamp: new Date(offer.created_at || 0), data: offer, name, purpose: offer.purpose, lenderName: name });
  });
  paymentsToConfirm.forEach(payment => {
    const recorderProfile = profiles.find(p => p.user_id === payment.recorded_by);
    const name = recorderProfile?.full_name || recorderProfile?.username || 'Unknown';
    const pmtLoan = loans.find(l => l.id === payment.loan_id);
    allItems.push({ type: 'payment_confirm', id: `pmt-confirm-${payment.id}`, timestamp: new Date(payment.created_at || payment.payment_date || 0), data: payment, name, purpose: pmtLoan?.purpose || null, amount: payment.amount, paymentMethod: payment.payment_method || null, paymentDate: payment.payment_date || null });
  });
  termChangeRequests.forEach(loan => {
    const otherProfile = profiles.find(p => p.user_id === (loan.lender_id === user?.id ? loan.borrower_id : loan.lender_id));
    const name = otherProfile?.full_name || otherProfile?.username || getLoanOtherParty(loan);
    allItems.push({ type: 'term_change', id: `term-${loan.id}`, timestamp: new Date(loan.updated_at || loan.created_at || 0), data: loan, name });
  });
  allItems.sort((a, b) => b.timestamp - a.timestamp);

  const isEmpty = reminders.length === 0 && allItems.length === 0;

  return (
    <>
      <div
        ref={popupRef}
        style={{
          position: 'fixed',
          top: 58, right: 20,
          zIndex: 400,
          width: 360,
          maxHeight: 520,
          background: 'white',
          borderRadius: 14,
          boxShadow: '0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
          fontFamily: "'DM Sans', sans-serif",
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          ...positionOverride,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px', flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.01em' }}>Notifications</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#9B9A98', display: 'flex', alignItems: 'center' }}>
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px 14px' }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
              <div style={{ width: 22, height: 22, border: '2px solid #03ACEA', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : isEmpty ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0' }}>
              <CheckCircle size={12} style={{ color: '#03ACEA', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#787776' }}>You're all caught up!</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Payment reminders */}
              {reminders.map(reminder => {
                const isOverdue = reminder.type.startsWith('overdue');
                return (
                  <div key={reminder.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0' }}>
                    <TypeIcon type={reminder.type} />
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: '#1A1918', lineHeight: 1.4 }}>
                      {reminder.title}
                    </span>
                    {isOverdue ? (
                      <Link
                        to={createPageUrl('RecordPayment')}
                        onClick={onClose}
                        style={{ fontSize: 12, fontWeight: 600, color: '#E8726E', textDecoration: 'none', flexShrink: 0 }}
                      >
                        Record
                      </Link>
                    ) : (
                      <ArrowBtn onClick={() => { onClose(); navigate(createPageUrl('Upcoming')); }} />
                    )}
                  </div>
                );
              })}

              {/* Action items */}
              {allItems.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0' }}>
                  <TypeIcon type={item.type} />
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: '#1A1918', lineHeight: 1.4 }}>
                    {item.type === 'friend' && `${item.name} sent you a friend request`}
                    {item.type === 'offer_received' && `${item.name} sent you a loan offer`}
                    {item.type === 'payment_confirm' && `${item.name} paid you $${item.amount?.toFixed(2)}${item.paymentMethod ? ` via ${item.paymentMethod}` : ''}`}
                    {item.type === 'term_change' && `${item.name} sent you a loan change request`}
                  </span>
                  <div style={{ display: 'flex', flexShrink: 0, alignItems: 'center' }}>
                    {item.type === 'friend' && (
                      <ArrowBtn onClick={() => { onClose(); onOpenFriends?.(); }} />
                    )}
                    {item.type === 'offer_received' && (
                      <ArrowBtn
                        disabled={processingId === item.data.id}
                        onClick={() => { setSelectedOffer(item.data); setShowSignatureModal(true); }}
                      />
                    )}
                    {item.type === 'payment_confirm' && (
                      <ArrowBtn
                        disabled={processingId === item.data.id}
                        onClick={() => { onClose(); navigate(createPageUrl('RecordPayment')); }}
                      />
                    )}
                    {item.type === 'term_change' && (
                      <ArrowBtn onClick={() => { onClose(); navigate(createPageUrl('LendingBorrowing')); }} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Deny confirmation */}
      {confirmingDeny && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setConfirmingDeny(null)}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, maxWidth: 320, width: '100%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight: 600, fontSize: 14, color: '#1A1918', marginBottom: 8, marginTop: 0 }}>Reject Payment?</h3>
            <p style={{ fontSize: 13, color: '#787776', marginBottom: 20 }}>Are you sure you didn't receive this payment of ${confirmingDeny.amount?.toFixed(2)}?</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmingDeny(null)} style={{ flex: 1, padding: '8px 16px', borderRadius: 8, background: 'transparent', color: '#1A1918', fontSize: 13, fontWeight: 600, border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Cancel</button>
              <button onClick={handleDenyPayment} style={{ flex: 1, padding: '8px 16px', borderRadius: 8, background: '#E8726E', color: 'white', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Reject</button>
            </div>
          </div>
        </div>
      )}

      {showSignatureModal && selectedOffer && (
        <BorrowerSignatureModal
          isOpen={showSignatureModal}
          onClose={() => { setShowSignatureModal(false); setSelectedOffer(null); }}
          onSign={handleSignOffer}
          onDecline={handleDeclineOffer}
          loanDetails={selectedOffer}
          lenderName={getUserById(selectedOffer.lender_id)?.full_name || 'Lender'}
          borrowerFullName={user?.full_name || ''}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Payment, Loan, PublicProfile, LoanAgreement, Friendship } from '@/entities/all';
import { useAuth } from '@/lib/AuthContext';
import { CheckCircle, Clock, X } from 'lucide-react';
import { format, addMonths, parseISO } from 'date-fns';
import { toLocalDate, daysUntil as daysUntilDate } from '@/components/utils/dateUtils';
import BorrowerSignatureModal from '@/components/loans/BorrowerSignatureModal';
import confetti from 'canvas-confetti';

export default function NotificationsPopup({ onClose }) {
  const { user: authUser, userProfile } = useAuth();
  const user = userProfile ? { ...userProfile, id: authUser?.id } : null;

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

  // Click outside to close
  useEffect(() => {
    const handler = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        onClose();
      }
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

      const userLoans = allLoans.filter(
        loan => loan.lender_id === user.id || loan.borrower_id === user.id
      );
      const userLoanIds = userLoans.map(l => l.id);

      const pendingPayments = fetchedPayments.filter(p => p.status === 'pending_confirmation');

      const toConfirm = pendingPayments.filter(payment => {
        if (!userLoanIds.includes(payment.loan_id)) return false;
        const loan = userLoans.find(l => l.id === payment.loan_id);
        if (!loan) return false;
        if (payment.recorded_by === user.id) return false;
        return true;
      });

      const termChanges = allLoans.filter(loan => {
        if (!userLoanIds.includes(loan.id)) return false;
        return loan.status === 'pending_borrower_approval' && loan.borrower_id === user.id;
      });

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
          reminders.push({ id: `reminder-owe-${loan.id}`, type: 'overdue_owe', loan, title: `Your payment to ${otherName} is overdue`, subtitle: `If you've already paid, make sure to record it.`, daysUntil, paymentAmount, otherName });
        } else if (daysUntil === 0) {
          reminders.push({ id: `reminder-owe-${loan.id}`, type: 'due_today_owe', loan, title: `You have a payment due today to ${otherName}`, subtitle: `Make sure to record the payment once it's made.`, daysUntil, paymentAmount, otherName });
        } else {
          reminders.push({ id: `reminder-owe-${loan.id}`, type: 'upcoming_owe', loan, title: `You have an upcoming payment to ${otherName}`, subtitle: `Make sure to record the payment once it's made.`, daysUntil, paymentAmount, otherName });
        }
      } else {
        if (daysUntil < 0) {
          reminders.push({ id: `reminder-receive-${loan.id}`, type: 'overdue_receive', loan, title: `${otherName}'s payment to you is overdue`, subtitle: `If they've already paid, make sure to record it.`, daysUntil, paymentAmount, otherName });
        } else if (daysUntil === 0) {
          reminders.push({ id: `reminder-receive-${loan.id}`, type: 'due_today_receive', loan, title: `You are due to receive a payment from ${otherName} today`, subtitle: `Make sure to record the payment once it's received.`, daysUntil, paymentAmount, otherName });
        } else {
          reminders.push({ id: `reminder-receive-${loan.id}`, type: 'upcoming_receive', loan, title: `You are due to receive a payment from ${otherName}`, subtitle: `Make sure to record the payment once it's received.`, daysUntil, paymentAmount, otherName });
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
      confetti({ particleCount: 80, spread: 65, origin: { y: 0.5 }, colors: ['#35B276', '#03ACEA', '#03ACEA', '#ffffff'], zIndex: 9999 });
      try {
        const loan = loans.find(l => l.id === payment.loan_id);
        if (loan) {
          const newAmountPaid = (loan.amount_paid || 0) + payment.amount;
          const newRemainingBalance = (loan.total_amount || 0) - newAmountPaid;
          const loanUpdate = { amount_paid: newAmountPaid };
          if (newRemainingBalance <= 0.01) {
            loanUpdate.status = 'completed';
            loanUpdate.next_payment_date = null;
          } else {
            loanUpdate.next_payment_date = format(addMonths(new Date(), 1), 'yyyy-MM-dd');
          }
          await Loan.update(loan.id, loanUpdate);
        }
      } catch (loanError) {
        console.error('Error updating loan after payment confirmation:', loanError);
      }
      loadRequests();
    } catch (error) {
      console.error('Error confirming payment:', error);
    }
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
    } catch (error) {
      console.error('Error denying payment:', error);
    }
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
    } catch (error) {
      console.error('Error signing loan offer:', error);
    }
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
    } catch (error) {
      console.error('Error declining loan offer:', error);
    }
    setProcessingId(null);
  };

  const typeIconMap = {
    friend:          { color: '#7C3AED', bg: 'rgba(124,58,237,0.12)', svg: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    offer_received:  { color: '#2563EB', bg: 'rgba(37,99,235,0.12)',  svg: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
    payment_confirm: { color: '#16A34A', bg: 'rgba(22,163,74,0.12)',  svg: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
    term_change:     { color: '#D97706', bg: 'rgba(217,119,6,0.12)',  svg: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
  };

  const rowStyle = { background: '#F8F8F8', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 14, padding: '9px 16px' };

  // Build allItems
  const allItems = [];
  friendRequestsReceived.forEach(request => {
    const senderProfile = profiles.find(p => p.user_id === request.user_id);
    const name = senderProfile?.full_name || senderProfile?.username || 'Unknown';
    allItems.push({ type: 'friend', id: `friend-${request.id}`, timestamp: new Date(request.created_at || 0), data: request, name, purpose: null, amount: null });
  });
  loanOffersReceived.forEach(offer => {
    const lender = getUserById(offer.lender_id);
    const name = lender?.full_name || lender?.username || 'Unknown';
    allItems.push({ type: 'offer_received', id: `offer-recv-${offer.id}`, timestamp: new Date(offer.created_at || 0), data: offer, name, purpose: offer.purpose, amount: null });
  });
  paymentsToConfirm.forEach(payment => {
    const recorderProfile = profiles.find(p => p.user_id === payment.recorded_by);
    const name = recorderProfile?.full_name || recorderProfile?.username || 'Unknown';
    const pmtLoan = loans.find(l => l.id === payment.loan_id);
    allItems.push({ type: 'payment_confirm', id: `pmt-confirm-${payment.id}`, timestamp: new Date(payment.created_at || payment.payment_date || 0), data: payment, name, purpose: pmtLoan?.purpose || null, amount: payment.amount, paymentMethod: payment.payment_method || null, paymentDate: payment.payment_date || null });
  });
  termChangeRequests.forEach(loan => {
    const otherUserId = loan.lender_id === user?.id ? loan.borrower_id : loan.lender_id;
    const otherProfile = profiles.find(p => p.user_id === otherUserId);
    const name = otherProfile?.full_name || otherProfile?.username || getLoanOtherParty(loan);
    allItems.push({ type: 'term_change', id: `term-${loan.id}`, timestamp: new Date(loan.updated_at || loan.created_at || 0), data: loan, name, purpose: null, amount: null });
  });
  allItems.sort((a, b) => b.timestamp - a.timestamp);

  return (
    <>
      <div
        ref={popupRef}
        style={{
          position: 'fixed',
          top: 58,
          right: 20,
          zIndex: 400,
          width: 360,
          maxHeight: 480,
          overflowY: 'auto',
          background: 'white',
          borderRadius: 14,
          boxShadow: '0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px', borderBottom: '1px solid rgba(0,0,0,0.07)', position: 'sticky', top: 0, background: 'white', zIndex: 1, borderRadius: '14px 14px 0 0' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.01em' }}>Notifications</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#9B9A98', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '12px 12px 16px' }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
              <div style={{ width: 24, height: 24, border: '2px solid #03ACEA', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : reminders.length === 0 && allItems.length === 0 ? (
            <div style={rowStyle}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(3,172,234,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#03ACEA' }}>
                <CheckCircle style={{ width: 11, height: 11 }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#1A1918', margin: '0 0 2px' }}>All caught up!</p>
                <p style={{ fontSize: 12, color: '#787776', margin: 0 }}>You have no notifications.</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {reminders.map(reminder => {
                const isOverdue = reminder.type.startsWith('overdue');
                return (
                  <div key={reminder.id} style={rowStyle}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: isOverdue ? 'rgba(232,114,110,0.12)' : 'rgba(3,172,234,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: isOverdue ? '#E8726E' : '#03ACEA' }}>
                      <Clock style={{ width: 11, height: 11 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#1A1918', lineHeight: 1.4, margin: '0 0 2px' }}>{reminder.title}</p>
                      <p style={{ fontSize: 11, color: '#787776', lineHeight: 1.4, margin: 0 }}>{reminder.subtitle}</p>
                    </div>
                    <Link to={createPageUrl('RecordPayment')} onClick={onClose} style={{ display: 'inline-flex', padding: '5px 10px', borderRadius: 20, background: isOverdue ? '#E8726E' : '#03ACEA', color: 'white', fontSize: 10, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      Record
                    </Link>
                  </div>
                );
              })}

              {allItems.map(item => {
                const ti = typeIconMap[item.type] || { color: '#9B9A98', bg: 'rgba(155,154,152,0.12)', svg: null };
                return (
                  <div key={item.id} style={rowStyle}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: ti.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: ti.color }}>
                      {ti.svg}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#1A1918', lineHeight: 1.4, margin: '0 0 2px' }}>
                        {item.type === 'friend' && `${item.name} sent you a friend request`}
                        {item.type === 'offer_received' && `${item.name} sent you a loan offer${item.purpose ? ` for ${item.purpose}` : ''}`}
                        {item.type === 'payment_confirm' && `${item.name} paid you $${item.amount?.toFixed(2)}${item.paymentMethod ? ` via ${item.paymentMethod}` : ''}`}
                        {item.type === 'term_change' && `${item.name} sent you a loan change request`}
                      </p>
                      {item.type === 'payment_confirm' && item.paymentDate && (
                        <p style={{ fontSize: 10, color: '#9B9A98', margin: '0 0 1px', fontWeight: 400 }}>
                          {format(parseISO(item.paymentDate), 'do MMMM')}
                        </p>
                      )}
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      {item.type === 'friend' && (
                        <Link to={createPageUrl('Friends')} onClick={onClose} style={{ fontSize: 11, fontWeight: 600, color: '#03ACEA', textDecoration: 'none' }}>View</Link>
                      )}
                      {item.type === 'offer_received' && (
                        <button
                          onClick={() => { setSelectedOffer(item.data); setShowSignatureModal(true); }}
                          disabled={processingId === item.data.id}
                          style={{ fontSize: 11, fontWeight: 600, color: '#03ACEA', background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: processingId === item.data.id ? 0.5 : 1 }}
                        >
                          View offer
                        </button>
                      )}
                      {item.type === 'payment_confirm' && (
                        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                          <button
                            onClick={() => handleConfirmPayment(item.data)}
                            disabled={processingId === item.data.id}
                            style={{ fontSize: 10, fontWeight: 600, color: 'white', background: '#03ACEA', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', opacity: processingId === item.data.id ? 0.5 : 1, whiteSpace: 'nowrap' }}
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmingDeny(item.data)}
                            disabled={processingId === item.data.id}
                            style={{ fontSize: 10, fontWeight: 600, color: '#E8726E', background: 'rgba(232,114,110,0.1)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', opacity: processingId === item.data.id ? 0.5 : 1, whiteSpace: 'nowrap' }}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {item.type === 'term_change' && (
                        <Link to={createPageUrl('Requests')} onClick={onClose} style={{ fontSize: 11, fontWeight: 600, color: '#03ACEA', textDecoration: 'none' }}>View</Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Deny confirmation inline */}
      {confirmingDeny && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setConfirmingDeny(null)}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, maxWidth: 320, width: '100%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight: 600, fontSize: 14, color: '#1A1918', marginBottom: 8, marginTop: 0 }}>Deny Payment?</h3>
            <p style={{ fontSize: 13, color: '#787776', marginBottom: 20 }}>Are you sure you want to deny this payment of ${confirmingDeny.amount?.toFixed(2)}?</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmingDeny(null)} style={{ flex: 1, padding: '8px 16px', borderRadius: 8, background: 'transparent', color: '#1A1918', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDenyPayment} style={{ flex: 1, padding: '8px 16px', borderRadius: 8, background: '#dc2626', color: 'white', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Deny</button>
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

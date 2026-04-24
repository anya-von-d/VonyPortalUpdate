import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Loan, Payment, PublicProfile, LoanAgreement } from '@/entities/all';
import { useAuth } from '@/lib/AuthContext';
import { X, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { formatMoney } from '@/components/utils/formatMoney';
import { toLocalDate } from '@/components/utils/dateUtils';
import UserAvatar from '@/components/ui/UserAvatar';

export default function PendingRequestsPopup({ onClose, positionOverride }) {
  const { user: authUser, userProfile } = useAuth();
  const user = userProfile ? { ...userProfile, id: authUser?.id } : null;
  const navigate = useNavigate();

  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRow, setSelectedRow] = useState(null);
  const [working, setWorking] = useState(false);

  const popupRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allLoans, allPayments, allProfiles] = await Promise.all([
        Loan.list().catch(() => []),
        Payment.list().catch(() => []),
        PublicProfile.list().catch(() => []),
      ]);
      setLoans(allLoans);
      setPayments(allPayments);
      setProfiles(allProfiles);
    } catch (err) {
      console.error('PendingRequestsPopup load error:', err);
    }
    setIsLoading(false);
  };

  const handleUnsendLoanOffer = async (loan) => {
    setWorking(true);
    try {
      const agreements = await LoanAgreement.list().catch(() => []);
      const agreement = agreements.find(a => a.loan_id === loan.id);
      if (agreement) await LoanAgreement.delete(agreement.id);
      await Loan.delete(loan.id);
      setSelectedRow(null);
      await loadData();
    } catch (e) { console.error('Error unsending loan offer:', e); }
    setWorking(false);
  };

  const handleDeletePayment = async (payment) => {
    setWorking(true);
    try {
      await Payment.delete(payment.id);
      setSelectedRow(null);
      await loadData();
    } catch (e) { console.error('Error deleting payment:', e); }
    setWorking(false);
  };

  if (!user) return null;

  const pendingLoanOffersSent = loans.filter(l => l && l.lender_id === user.id && l.status === 'pending');
  const pendingPaymentsSentByMe = payments.filter(p => p && p.recorded_by === user.id && p.status === 'pending_confirmation');

  const rows = [];

  pendingLoanOffersSent.forEach(loan => {
    const borrowerProfile = profiles.find(p => p.user_id === loan.borrower_id);
    const firstName = borrowerProfile?.full_name?.split(' ')[0] || borrowerProfile?.username || 'them';
    rows.push({
      key: `loan-${loan.id}`,
      type: 'loan',
      loan,
      profile: borrowerProfile,
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
      text: `Waiting for ${firstName} to review your loan offer`,
    });
  });

  pendingPaymentsSentByMe.forEach(payment => {
    const loanForPay = loans.find(l => l && l.id === payment.loan_id);
    const otherUserId = loanForPay
      ? (loanForPay.lender_id === user.id ? loanForPay.borrower_id : loanForPay.lender_id)
      : null;
    const otherProfile = otherUserId ? profiles.find(p => p.user_id === otherUserId) : null;
    const firstName = otherProfile?.full_name?.split(' ')[0] || otherProfile?.username || 'them';
    rows.push({
      key: `pay-${payment.id}`,
      type: 'payment',
      payment,
      loan: loanForPay,
      profile: otherProfile,
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9B9A98" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
      text: `${firstName} has not confirmed your ${formatMoney(payment.amount || 0)} payment yet`,
    });
  });

  const isEmpty = rows.length === 0;

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
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.01em' }}>Pending Requests</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#9B9A98', display: 'flex', alignItems: 'center' }}
          >
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
              <span style={{ fontSize: 12, color: '#787776' }}>No pending requests right now.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {rows.map(row => (
                <div key={row.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0' }}>
                  {row.icon}
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: '#1A1918', lineHeight: 1.4 }}>
                    {row.text}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedRow(row)}
                    aria-label="View details"
                    style={{
                      flexShrink: 0, background: 'transparent', border: 'none', padding: 0,
                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
                      color: '#9B9A98', marginTop: 1, transition: 'color 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#03ACEA'}
                    onMouseLeave={e => e.currentTarget.style.color = '#9B9A98'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>

      {/* Detail modal — portal so it escapes the popup's overflow:hidden */}
      {selectedRow && createPortal(
        <div
          onClick={() => setSelectedRow(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.32)',
            backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)',
            zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20, fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#FAFAF8', borderRadius: 16, maxWidth: 400, width: '100%',
              boxShadow: '0 24px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)',
              padding: '24px 24px 20px', position: 'relative',
            }}
          >
            {/* Close */}
            <button
              onClick={() => setSelectedRow(null)}
              style={{
                position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: 8,
                background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#787776',
              }}
            >
              <X size={14} />
            </button>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <UserAvatar
                name={selectedRow.profile?.full_name || selectedRow.profile?.username}
                src={selectedRow.profile?.profile_picture_url || selectedRow.profile?.avatar_url}
                size={42}
              />
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.01em' }}>
                  {selectedRow.type === 'loan'
                    ? `Loan Offer to ${selectedRow.profile?.full_name?.split(' ')[0] || selectedRow.profile?.username || 'Borrower'}`
                    : `Your ${formatMoney(selectedRow.payment?.amount || 0)} Payment`}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: selectedRow.type === 'loan' ? '#D97706' : '#9B9A98', marginTop: 2 }}>
                  {selectedRow.type === 'loan'
                    ? '⏳ Awaiting their signature'
                    : `⏳ Waiting for ${selectedRow.profile?.full_name?.split(' ')[0] || 'them'} to confirm`}
                </div>
              </div>
            </div>

            {/* Details */}
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid rgba(0,0,0,0.07)', padding: '12px 14px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 9 }}>
              {selectedRow.type === 'loan' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500 }}>Amount</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.02em' }}>{formatMoney(selectedRow.loan?.amount || selectedRow.loan?.total_amount || 0)}</span>
                  </div>
                  {selectedRow.loan?.interest_rate && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500 }}>Interest rate</span>
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918' }}>{selectedRow.loan.interest_rate}% / year</span>
                    </div>
                  )}
                  {selectedRow.loan?.payment_frequency && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500 }}>Repayment</span>
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918', textTransform: 'capitalize' }}>{selectedRow.loan.payment_frequency}</span>
                    </div>
                  )}
                  {selectedRow.loan?.repayment_period && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500 }}>Duration</span>
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918' }}>{selectedRow.loan.repayment_period} payments</span>
                    </div>
                  )}
                  {selectedRow.loan?.first_payment_date && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500 }}>First payment</span>
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918' }}>{format(toLocalDate(selectedRow.loan.first_payment_date), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  {selectedRow.loan?.lender_send_funds_date && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500 }}>Funds sent by</span>
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918' }}>{format(toLocalDate(selectedRow.loan.lender_send_funds_date), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  {selectedRow.loan?.purpose && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500 }}>Purpose</span>
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918', textAlign: 'right', maxWidth: '60%' }}>{selectedRow.loan.purpose}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500 }}>Amount</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.02em' }}>{formatMoney(selectedRow.payment?.amount || 0)}</span>
                  </div>
                  {selectedRow.loan && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500 }}>For loan</span>
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918', textAlign: 'right', maxWidth: '60%' }}>
                        {formatMoney(selectedRow.loan.amount || selectedRow.loan.total_amount || 0)}{selectedRow.loan.purpose ? ` · ${selectedRow.loan.purpose}` : ''}
                      </span>
                    </div>
                  )}
                  {selectedRow.payment?.payment_date && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500 }}>Date recorded</span>
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918' }}>{format(toLocalDate(selectedRow.payment.payment_date), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  {selectedRow.payment?.payment_method && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500 }}>Method</span>
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918', textTransform: 'capitalize' }}>{selectedRow.payment.payment_method}</span>
                    </div>
                  )}
                  {selectedRow.payment?.notes && (
                    <div>
                      <div style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500, marginBottom: 3 }}>Notes</div>
                      <div style={{ fontSize: 12, color: '#787776', lineHeight: 1.5 }}>{selectedRow.payment.notes}</div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Action note */}
            <div style={{ fontSize: 11, color: '#9B9A98', marginBottom: 12, lineHeight: 1.5 }}>
              {selectedRow.type === 'loan'
                ? 'Unsending will permanently remove this offer. The recipient will no longer see it in their inbox or notifications.'
                : 'Deleting will permanently remove this payment record. The recipient will no longer see it in their inbox or notifications.'}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setSelectedRow(null)}
                style={{
                  flex: 1, padding: '9px', borderRadius: 9, border: 'none',
                  background: '#F4F3F1', fontSize: 12, fontWeight: 600, color: '#787776',
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Keep
              </button>
              <button
                onClick={() => selectedRow.type === 'loan'
                  ? handleUnsendLoanOffer(selectedRow.loan)
                  : handleDeletePayment(selectedRow.payment)}
                disabled={working}
                style={{
                  flex: 1, padding: '9px', borderRadius: 9, border: 'none',
                  background: working ? '#C7C6C4' : '#E8726E',
                  fontSize: 12, fontWeight: 600, color: 'white',
                  cursor: working ? 'default' : 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!working) e.currentTarget.style.background = '#d45f5b'; }}
                onMouseLeave={e => { if (!working) e.currentTarget.style.background = '#E8726E'; }}
              >
                {selectedRow.type === 'loan' ? 'Unsend Loan Offer' : 'Delete Payment'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Loan, Payment, PublicProfile } from '@/entities/all';
import { useAuth } from '@/lib/AuthContext';
import { X, CheckCircle } from 'lucide-react';
import { formatMoney } from '@/components/utils/formatMoney';

export default function PendingRequestsPopup({ onClose, positionOverride }) {
  const { user: authUser, userProfile } = useAuth();
  const user = userProfile ? { ...userProfile, id: authUser?.id } : null;

  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();
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

  if (!user) return null;

  const pendingLoanOffersSent = loans.filter(l => l && l.lender_id === user.id && l.status === 'pending');
  const pendingPaymentsSentByMe = payments.filter(p => p && p.recorded_by === user.id && p.status === 'pending_confirmation');

  const rows = [];

  pendingLoanOffersSent.forEach(loan => {
    const borrowerProfile = profiles.find(p => p.user_id === loan.borrower_id);
    const firstName = borrowerProfile?.full_name?.split(' ')[0] || borrowerProfile?.username || 'them';
    rows.push({
      key: `loan-${loan.id}`,
      arrowTo: createPageUrl('LendingBorrowing') + '?tab=lending',
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
      arrowTo: createPageUrl('RecordPayment'),
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
                {row.arrowTo && (
                  <button
                    type="button"
                    onClick={() => { onClose(); navigate(row.arrowTo); }}
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
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

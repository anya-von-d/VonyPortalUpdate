import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Payment, Loan, PublicProfile, LoanAgreement, Friendship } from '@/entities/all';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { daysUntil as daysUntilDate, toLocalDate } from '@/components/utils/dateUtils';
import { formatMoney } from '@/components/utils/formatMoney';
import BorrowerSignatureModal from '@/components/loans/BorrowerSignatureModal';
import UserAvatar from '@/components/ui/UserAvatar';
import MeshMobileNav from '@/components/MeshMobileNav';
import DesktopSidebar from '@/components/DesktopSidebar';
import { createPortal } from 'react-dom';

// ── Tab config ───────────────────────────────────────────────────────────────
const TABS = [
  { key: 'all',       label: 'All' },
  { key: 'attention', label: 'Requires your confirmation' },
  { key: 'pending',   label: 'Pending' },
  { key: 'offers',    label: 'Offers' },
  { key: 'reminders', label: 'Payment reminders' },
];

// ── Notification type icons (small SVGs for the badge) ───────────────────────
function NotifIcon({ type, iconColor }) {
  const stroke = iconColor || '#1A1918';
  const w = 11, h = 11;
  if (type === 'friend') return (
    <svg width={w} height={h} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  );
  if (type === 'offer_received') return (
    <svg width={w} height={h} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
    </svg>
  );
  if (type === 'payment_confirm') return (
    <svg width={w} height={h} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
  if (type === 'term_change') return (
    <svg width={w} height={h} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
  if (type === 'loan_sent' || type === 'payment_sent') return (
    <svg width={w} height={h} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
  // reminders
  if (type.includes('overdue')) return (
    <svg width={w} height={h} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
  return (
    <svg width={w} height={h} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}

// ── Avatar with icon badge in the bottom-right corner ───────────────────────
function AvatarWithBadge({ profile, type, iconColor, badgeBg }) {
  const name = profile?.full_name || profile?.username || '?';
  const src  = profile?.profile_picture_url || profile?.avatar_url;
  return (
    <div style={{ position: 'relative', flexShrink: 0, width: 46, height: 46 }}>
      <UserAvatar name={name} src={src} size={46} radius={23} />
      {/* badge */}
      <div style={{
        position: 'absolute', bottom: -2, right: -2,
        width: 20, height: 20, borderRadius: '50%',
        background: badgeBg || 'rgba(0,0,0,0.08)',
        border: '2px solid white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <NotifIcon type={type} iconColor={iconColor} />
      </div>
    </div>
  );
}

// ── Chevron icon ─────────────────────────────────────────────────────────────
function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.3)"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// ── Detail sheet for pending items ───────────────────────────────────────────
function PendingDetailSheet({ row, onClose, onUnsend, onDelete, working }) {
  if (!row) return null;
  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.32)',
        backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)',
        zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center',
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
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: 8,
            background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#787776',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <UserAvatar
            name={row.profile?.full_name || row.profile?.username}
            src={row.profile?.profile_picture_url || row.profile?.avatar_url}
            size={42}
          />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.01em' }}>
              {row.type === 'loan_sent'
                ? `Loan Offer to ${row.profile?.full_name?.split(' ')[0] || row.profile?.username || 'Borrower'}`
                : `Your ${formatMoney(row.payment?.amount || 0)} Payment`}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: row.type === 'loan_sent' ? '#D97706' : '#9B9A98', marginTop: 2 }}>
              {row.type === 'loan_sent'
                ? '⏳ Awaiting their signature'
                : `⏳ Waiting for ${row.profile?.full_name?.split(' ')[0] || 'them'} to confirm`}
            </div>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: 12, border: '1px solid rgba(0,0,0,0.07)', padding: '12px 14px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 9 }}>
          {row.type === 'loan_sent' ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500 }}>Amount</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.02em' }}>{formatMoney(row.loan?.amount || row.loan?.total_amount || 0)}</span>
              </div>
              {row.loan?.interest_rate ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500 }}>Interest rate</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918' }}>{row.loan.interest_rate}% / year</span>
                </div>
              ) : null}
              {row.loan?.payment_frequency ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500 }}>Repayment</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918', textTransform: 'capitalize' }}>{row.loan.payment_frequency}</span>
                </div>
              ) : null}
              {row.loan?.repayment_period ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500 }}>Duration</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918' }}>{row.loan.repayment_period} payments</span>
                </div>
              ) : null}
              {row.loan?.first_payment_date ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500 }}>First payment</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918' }}>{format(toLocalDate(row.loan.first_payment_date), 'MMM d, yyyy')}</span>
                </div>
              ) : null}
              {row.loan?.purpose ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500 }}>Purpose</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918', textAlign: 'right', maxWidth: '60%' }}>{row.loan.purpose}</span>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500 }}>Amount</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.02em' }}>{formatMoney(row.payment?.amount || 0)}</span>
              </div>
              {row.loan ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500 }}>For loan</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918', textAlign: 'right', maxWidth: '60%' }}>
                    {formatMoney(row.loan.amount || row.loan.total_amount || 0)}{row.loan.purpose ? ` · ${row.loan.purpose}` : ''}
                  </span>
                </div>
              ) : null}
              {row.payment?.payment_date ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500 }}>Date recorded</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918' }}>{format(toLocalDate(row.payment.payment_date), 'MMM d, yyyy')}</span>
                </div>
              ) : null}
              {row.payment?.payment_method ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500 }}>Method</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1918', textTransform: 'capitalize' }}>{row.payment.payment_method}</span>
                </div>
              ) : null}
              {row.payment?.notes ? (
                <div>
                  <div style={{ fontSize: 11, color: '#9B9A98', fontWeight: 500, marginBottom: 3 }}>Notes</div>
                  <div style={{ fontSize: 12, color: '#787776', lineHeight: 1.5 }}>{row.payment.notes}</div>
                </div>
              ) : null}
            </>
          )}
        </div>

        <div style={{ fontSize: 11, color: '#9B9A98', marginBottom: 12, lineHeight: 1.5 }}>
          {row.type === 'loan_sent'
            ? 'Unsending will permanently remove this offer. The recipient will no longer see it in their inbox or notifications.'
            : 'Deleting will permanently remove this payment record. The recipient will no longer see it in their inbox or notifications.'}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', background: '#F4F3F1', fontSize: 12, fontWeight: 600, color: '#787776', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
          >
            Keep
          </button>
          <button
            onClick={() => row.type === 'loan_sent' ? onUnsend(row.loan) : onDelete(row.payment)}
            disabled={working}
            style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', background: working ? '#C7C6C4' : '#E8726E', fontSize: 12, fontWeight: 600, color: 'white', cursor: working ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'background 0.15s' }}
          >
            {row.type === 'loan_sent' ? 'Unsend Loan Offer' : 'Delete Payment'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Notifications() {
  const { user: authUser, userProfile } = useAuth();
  const user = userProfile ? { ...userProfile, id: authUser?.id } : null;
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('all');

  // Data
  const [paymentsToConfirm, setPaymentsToConfirm]       = useState([]);
  const [loanOffersReceived, setLoanOffersReceived]       = useState([]);
  const [friendRequestsReceived, setFriendRequestsReceived] = useState([]);
  const [termChangeRequests, setTermChangeRequests]       = useState([]);
  const [pendingLoanOffersSent, setPendingLoanOffersSent] = useState([]);
  const [pendingPaymentsSentByMe, setPendingPaymentsSentByMe] = useState([]);
  const [loans, setLoans]         = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [profiles, setProfiles]   = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // UI state
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [selectedOffer, setSelectedOffer]           = useState(null);
  const [processingId, setProcessingId]             = useState(null);
  const [selectedPendingRow, setSelectedPendingRow] = useState(null);
  const [working, setWorking]                       = useState(false);

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const [fetchedPayments, allLoans, allProfiles, allFriendships] = await Promise.all([
        Payment.list().catch(() => []),
        Loan.list().catch(() => []),
        PublicProfile.list().catch(() => []),
        Friendship.list().catch(() => []),
      ]);

      const userLoans    = allLoans.filter(l => l.lender_id === user.id || l.borrower_id === user.id);
      const userLoanIds  = userLoans.map(l => l.id);
      const pendingPmts  = fetchedPayments.filter(p => p.status === 'pending_confirmation');

      const toConfirm = pendingPmts.filter(payment => {
        if (!userLoanIds.includes(payment.loan_id)) return false;
        const loan = userLoans.find(l => l.id === payment.loan_id);
        return loan && payment.recorded_by !== user.id;
      });

      const termChanges    = allLoans.filter(l => userLoanIds.includes(l.id) && l.status === 'pending_borrower_approval' && l.borrower_id === user.id);
      const offersReceived = allLoans.filter(l => l.borrower_id === user.id && l.status === 'pending');
      const friendReqs     = allFriendships.filter(f => f.friend_id === user.id && f.status === 'pending');
      const loanOffersSent = allLoans.filter(l => l.lender_id === user.id && l.status === 'pending');
      const pmtsSentByMe   = fetchedPayments.filter(p => p.recorded_by === user.id && p.status === 'pending_confirmation');

      setPaymentsToConfirm(toConfirm);
      setTermChangeRequests(termChanges);
      setLoanOffersReceived(offersReceived);
      setFriendRequestsReceived(friendReqs);
      setPendingLoanOffersSent(loanOffersSent);
      setPendingPaymentsSentByMe(pmtsSentByMe);
      setLoans(allLoans);
      setAllPayments(fetchedPayments);
      setProfiles(allProfiles);
    } catch (err) {
      console.error('Notifications page load error:', err);
    }
    setIsLoading(false);
  };

  // ── Reminders (payment reminders tab) ────────────────────────────────────
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
      const hasPendingPmt = allPayments.some(p => p.loan_id === loan.id && p.status === 'pending_confirmation');
      if (daysUntil < 0 && hasPendingPmt) return;
      const isBorrower   = loan.borrower_id === user.id;
      const otherUserId  = isBorrower ? loan.lender_id : loan.borrower_id;
      const otherProfile = profiles.find(p => p.user_id === otherUserId);
      const otherName    = otherProfile?.full_name || otherProfile?.username || 'Unknown';
      const completedPmts = allPayments.filter(p => p.loan_id === loan.id && p.status === 'completed');
      const totalPaid    = completedPmts.reduce((s, p) => s + (p.amount || 0), 0);
      const remaining    = (loan.total_amount || loan.amount || 0) - totalPaid;
      const paymentAmt   = Math.min(loan.payment_amount || 0, remaining);
      if (paymentAmt <= 0) return;

      const isOverdue = daysUntil < 0;
      const isToday   = daysUntil === 0;
      let type, title;
      if (isBorrower) {
        if (isOverdue)    { type = 'overdue_owe';      title = `Your payment to ${otherName} is overdue`; }
        else if (isToday) { type = 'due_today_owe';    title = `You have a payment due today to ${otherName}`; }
        else              { type = 'upcoming_owe';     title = `You have an upcoming payment to ${otherName}`; }
      } else {
        if (isOverdue)    { type = 'overdue_receive';  title = `${otherName}'s payment to you is overdue`; }
        else if (isToday) { type = 'due_today_receive';title = `You are due to receive a payment from ${otherName} today`; }
        else              { type = 'upcoming_receive'; title = `You are due to receive a payment from ${otherName}`; }
      }
      reminders.push({ id: `reminder-${loan.id}`, type, loan, title, daysUntil, paymentAmount: paymentAmt, otherName, otherProfile, isOverdue });
    });
    reminders.sort((a, b) => a.daysUntil - b.daysUntil);
    return reminders;
  };

  const reminders = buildReminders();
  const getUserById = (id) => profiles.find(p => p.user_id === id) || null;

  // ── Build full item list ──────────────────────────────────────────────────
  const buildAllItems = () => {
    const items = [];

    friendRequestsReceived.forEach(req => {
      const senderProfile = profiles.find(p => p.user_id === req.user_id);
      const name = senderProfile?.full_name || senderProfile?.username || 'Unknown';
      items.push({
        id: `friend-${req.id}`, type: 'friend', category: 'attention',
        timestamp: new Date(req.created_at || 0),
        data: req, profile: senderProfile,
        title: `${name} sent you a friend request`,
        subtitle: 'Tap to respond',
        badgeBg: '#EDE9FE', iconColor: '#7C3AED',
      });
    });

    loanOffersReceived.forEach(offer => {
      const lenderProfile = getUserById(offer.lender_id);
      const name = lenderProfile?.full_name || lenderProfile?.username || 'Unknown';
      items.push({
        id: `offer-recv-${offer.id}`, type: 'offer_received', category: 'offers',
        timestamp: new Date(offer.created_at || 0),
        data: offer, profile: lenderProfile,
        title: `${name} sent you a loan offer`,
        subtitle: offer.amount ? formatMoney(offer.amount || offer.total_amount || 0) : 'Tap to review',
        badgeBg: '#DBEAFE', iconColor: '#2563EB',
      });
    });

    paymentsToConfirm.forEach(payment => {
      const recorderProfile = profiles.find(p => p.user_id === payment.recorded_by);
      const name = recorderProfile?.full_name || recorderProfile?.username || 'Unknown';
      const pmtLoan = loans.find(l => l.id === payment.loan_id);
      items.push({
        id: `pmt-confirm-${payment.id}`, type: 'payment_confirm', category: 'attention',
        timestamp: new Date(payment.created_at || payment.payment_date || 0),
        data: payment, profile: recorderProfile,
        title: `${name} recorded a payment`,
        subtitle: `${formatMoney(payment.amount || 0)}${payment.payment_method ? ` via ${payment.payment_method}` : ''}`,
        badgeBg: '#DCFCE7', iconColor: '#16A34A',
        pmtLoan,
      });
    });

    termChangeRequests.forEach(loan => {
      const otherUserId   = loan.lender_id === user?.id ? loan.borrower_id : loan.lender_id;
      const otherProfile  = profiles.find(p => p.user_id === otherUserId);
      const name = otherProfile?.full_name || otherProfile?.username || 'Unknown';
      items.push({
        id: `term-${loan.id}`, type: 'term_change', category: 'attention',
        timestamp: new Date(loan.updated_at || loan.created_at || 0),
        data: loan, profile: otherProfile,
        title: `${name} sent you a loan change request`,
        subtitle: 'Review the new terms',
        badgeBg: '#FEF3C7', iconColor: '#D97706',
      });
    });

    pendingLoanOffersSent.forEach(loan => {
      const borrowerProfile = getUserById(loan.borrower_id);
      const firstName = borrowerProfile?.full_name?.split(' ')[0] || borrowerProfile?.username || 'them';
      items.push({
        id: `loan-sent-${loan.id}`, type: 'loan_sent', category: 'pending',
        timestamp: new Date(loan.created_at || 0),
        data: loan, loan, profile: borrowerProfile,
        title: `Waiting for ${firstName} to review your loan offer`,
        subtitle: formatMoney(loan.amount || loan.total_amount || 0),
        badgeBg: '#FEF3C7', iconColor: '#D97706',
      });
    });

    pendingPaymentsSentByMe.forEach(payment => {
      const loanForPay  = loans.find(l => l.id === payment.loan_id);
      const otherUserId = loanForPay
        ? (loanForPay.lender_id === user?.id ? loanForPay.borrower_id : loanForPay.lender_id)
        : null;
      const otherProfile = otherUserId ? profiles.find(p => p.user_id === otherUserId) : null;
      const firstName = otherProfile?.full_name?.split(' ')[0] || otherProfile?.username || 'them';
      items.push({
        id: `pay-sent-${payment.id}`, type: 'payment_sent', category: 'pending',
        timestamp: new Date(payment.created_at || payment.payment_date || 0),
        data: payment, payment, loan: loanForPay, profile: otherProfile,
        title: `${firstName} has not confirmed your payment yet`,
        subtitle: formatMoney(payment.amount || 0),
        badgeBg: 'rgba(0,0,0,0.10)', iconColor: '#9B9A98',
      });
    });

    reminders.forEach(reminder => {
      items.push({
        id: reminder.id, type: reminder.type, category: 'reminders',
        timestamp: new Date(),
        data: reminder, reminder, profile: reminder.otherProfile,
        title: reminder.title,
        subtitle: `${formatMoney(reminder.paymentAmount)}${Math.abs(reminder.daysUntil) > 0
          ? ` · ${Math.abs(reminder.daysUntil)} day${Math.abs(reminder.daysUntil) !== 1 ? 's' : ''} ${reminder.isOverdue ? 'overdue' : 'away'}`
          : ''}`,
        badgeBg: reminder.isOverdue ? '#FEE2E2' : '#DBEAFE',
        iconColor: reminder.isOverdue ? '#E8726E' : '#03ACEA',
        isOverdue: reminder.isOverdue,
      });
    });

    items.sort((a, b) => b.timestamp - a.timestamp);
    return items;
  };

  const allItems = buildAllItems();

  // ── Tab filtering ─────────────────────────────────────────────────────────
  const getTabItems = (tab) => {
    if (tab === 'all')       return allItems;
    if (tab === 'attention') return allItems.filter(i => i.category === 'attention');
    if (tab === 'pending')   return allItems.filter(i => i.category === 'pending');
    if (tab === 'offers')    return allItems.filter(i => i.type === 'offer_received' || i.type === 'loan_sent');
    if (tab === 'reminders') return allItems.filter(i => i.category === 'reminders');
    return allItems;
  };

  const tabItems = getTabItems(activeTab);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSignOffer = async (signature) => {
    if (!selectedOffer) return;
    setProcessingId(selectedOffer.id);
    try {
      await Loan.update(selectedOffer.id, { status: 'active' });
      const agreements = await LoanAgreement.list();
      const agreement  = agreements.find(a => a.loan_id === selectedOffer.id);
      if (agreement) {
        await LoanAgreement.update(agreement.id, {
          borrower_name: signature,
          borrower_signed_date: new Date().toISOString(),
          is_fully_signed: true,
        });
      }
      setShowSignatureModal(false);
      setSelectedOffer(null);
      loadData();
    } catch (err) { console.error('Error signing loan offer:', err); }
    setProcessingId(null);
  };

  const handleDeclineOffer = async () => {
    if (!selectedOffer) return;
    setProcessingId(selectedOffer.id);
    try {
      await Loan.update(selectedOffer.id, { status: 'declined' });
      setShowSignatureModal(false);
      setSelectedOffer(null);
      window.dispatchEvent(new CustomEvent('loan-status-changed'));
      loadData();
    } catch (err) { console.error('Error declining offer:', err); }
    setProcessingId(null);
  };

  const handleUnsendLoanOffer = async (loan) => {
    setWorking(true);
    try {
      const agreements = await LoanAgreement.list().catch(() => []);
      const agreement  = agreements.find(a => a.loan_id === loan.id);
      if (agreement) await LoanAgreement.delete(agreement.id);
      await Loan.delete(loan.id);
      setSelectedPendingRow(null);
      await loadData();
    } catch (e) { console.error('Error unsending loan offer:', e); }
    setWorking(false);
  };

  const handleDeletePayment = async (payment) => {
    setWorking(true);
    try {
      await Payment.delete(payment.id);
      setSelectedPendingRow(null);
      await loadData();
    } catch (e) { console.error('Error deleting payment:', e); }
    setWorking(false);
  };

  const handleItemTap = (item) => {
    if (item.type === 'friend')          { window.dispatchEvent(new CustomEvent('open-friends-popup', { detail: { initialRequestsOpen: true } })); }
    else if (item.type === 'offer_received') { setSelectedOffer(item.data); setShowSignatureModal(true); }
    else if (item.type === 'payment_confirm'){ navigate(createPageUrl('RecordPayment')); }
    else if (item.type === 'term_change')    { navigate(createPageUrl('LendingBorrowing')); }
    else if (item.type === 'loan_sent')      { setSelectedPendingRow({ type: 'loan_sent',    loan: item.loan,    profile: item.profile }); }
    else if (item.type === 'payment_sent')   { setSelectedPendingRow({ type: 'payment_sent', payment: item.payment, loan: item.loan, profile: item.profile }); }
    else if (item.isOverdue)                 { navigate(createPageUrl('RecordPayment')); }
    else                                     { navigate(createPageUrl('Upcoming')); }
  };

  return (
    <div style={{ minHeight: '100vh', fontFamily: "'DM Sans', sans-serif", background: 'transparent' }}>
      <MeshMobileNav user={user} />
      <div className="mesh-layout" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 0, minHeight: '100vh' }}>
        <DesktopSidebar />
        <div style={{ padding: '80px 20px 120px' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 36, height: 36, borderRadius: 18, color: 'rgba(0,0,0,0.55)',
              }}
              aria-label="Go back"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.02em', lineHeight: 1 }}>Inbox</h1>
          </div>

          {/* Scrollable tabs */}
          <div style={{
            display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2, marginBottom: 20,
            scrollbarWidth: 'none', msOverflowStyle: 'none',
          }}>
            {TABS.map(tab => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    flexShrink: 0, padding: '7px 14px', borderRadius: 999,
                    border: isActive ? 'none' : '1.5px solid rgba(0,0,0,0.18)',
                    background: isActive ? '#1A1918' : 'transparent',
                    color: isActive ? '#fff' : '#1A1918',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    whiteSpace: 'nowrap',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Content */}
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
              <div style={{ width: 28, height: 28, border: '2.5px solid #03ACEA', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : tabItems.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 12 }}>
              <span style={{ fontSize: 40 }}>📣</span>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1A1918', textAlign: 'center' }}>Stay tuned for new messages</p>
              <p style={{ margin: 0, fontSize: 13, color: '#787776', textAlign: 'center' }}>You're all caught up. New notifications will appear here.</p>
              <button
                onClick={loadData}
                style={{
                  marginTop: 8, padding: '8px 20px', borderRadius: 999,
                  border: '1.5px solid rgba(0,0,0,0.18)', background: 'transparent',
                  fontSize: 13, fontWeight: 600, color: '#1A1918', cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Refresh
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {tabItems.map((item, idx) => (
                <div
                  key={item.id}
                  onClick={() => handleItemTap(item)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px',
                    borderBottom: idx < tabItems.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                    cursor: 'pointer',
                    borderRadius: 12,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.025)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Avatar + icon badge */}
                  <AvatarWithBadge
                    profile={item.profile}
                    type={item.type}
                    iconColor={item.iconColor}
                    badgeBg={item.badgeBg}
                  />

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1918', lineHeight: 1.35, marginBottom: 2 }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: 12, color: '#787776', lineHeight: 1.3 }}>
                      {item.subtitle}
                    </div>
                  </div>

                  <Chevron />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
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

      <PendingDetailSheet
        row={selectedPendingRow}
        onClose={() => setSelectedPendingRow(null)}
        onUnsend={handleUnsendLoanOffer}
        onDelete={handleDeletePayment}
        working={working}
      />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        div[style*="overflow-x: auto"]::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

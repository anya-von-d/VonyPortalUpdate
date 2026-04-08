import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Payment, Loan, PublicProfile, LoanAgreement, Friendship } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DashboardSidebar from "@/components/DashboardSidebar";
import {
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Smartphone,
  Banknote,
  CreditCard,
  AlertCircle,
  AlertTriangle,
  Edit3,
  Eye,
  Bell
} from "lucide-react";
import { format, addMonths, differenceInDays, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { toLocalDate, daysUntil as daysUntilDate } from "@/components/utils/dateUtils";
import BorrowerSignatureModal from "@/components/loans/BorrowerSignatureModal";
import RecordPaymentModal from "@/components/loans/RecordPaymentModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PAYMENT_METHOD_ICONS = {
  venmo: { icon: Smartphone, color: 'text-blue-500', label: 'Venmo' },
  zelle: { icon: Smartphone, color: 'text-purple-500', label: 'Zelle' },
  cashapp: { icon: DollarSign, color: 'text-green-500', label: 'Cash App' },
  paypal: { icon: CreditCard, color: 'text-blue-600', label: 'PayPal' },
  cash: { icon: Banknote, color: 'text-emerald-500', label: 'Cash' },
  bank: { icon: CreditCard, color: 'text-slate-500', label: 'Bank Transfer' },
  other: { icon: DollarSign, color: 'text-gray-500', label: 'Other' },
};

const SHADOW = '0px 50px 40px rgba(0,0,0,0.02), 0px 50px 40px rgba(0,0,0,0.04), 0px 20px 40px rgba(0,0,0,0.08), 0px 3px 10px rgba(0,0,0,0.12)';

export default function Requests() {
  const { user: authUser, userProfile } = useAuth();
  const user = userProfile ? { ...userProfile, id: authUser?.id } : null;

  const [paymentsToConfirm, setPaymentsToConfirm] = useState([]);
  const [paymentsAwaitingConfirmation, setPaymentsAwaitingConfirmation] = useState([]);
  const [termChangeRequests, setTermChangeRequests] = useState([]);
  const [extensionRequests, setExtensionRequests] = useState([]);
  const [loanOffersReceived, setLoanOffersReceived] = useState([]);
  const [loanOffersSent, setLoanOffersSent] = useState([]);
  const [friendRequestsReceived, setFriendRequestsReceived] = useState([]);
  const [loans, setLoans] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [confirmingDeny, setConfirmingDeny] = useState(null);
  const [confirmingCancel, setConfirmingCancel] = useState(null);
  const [confirmingDeleteOffer, setConfirmingDeleteOffer] = useState(null);

  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState(null);
  const [viewingPayment, setViewingPayment] = useState(null);

  useEffect(() => {
    if (user?.id) {
      loadRequests();
    }
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
        Friendship.list().catch(() => [])
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
        // You can't confirm your own payment — confirmation goes to the other party
        if (payment.recorded_by === user.id) return false;
        return true;
      });

      const awaitingConfirmation = pendingPayments.filter(payment => {
        if (!userLoanIds.includes(payment.loan_id)) return false;
        if (payment.recorded_by !== user.id) return false;
        return true;
      });

      const termChanges = allLoans.filter(loan => {
        if (!userLoanIds.includes(loan.id)) return false;
        return loan.status === 'pending_borrower_approval' && loan.borrower_id === user.id;
      });

      const extensions = allLoans.filter(loan => {
        if (!userLoanIds.includes(loan.id)) return false;
        return loan.extension_requested && loan.extension_requested_by !== user.id;
      });

      const offersReceived = allLoans.filter(loan =>
        loan.borrower_id === user.id && loan.status === 'pending'
      );

      const offersSent = allLoans.filter(loan =>
        loan.lender_id === user.id && loan.status === 'pending'
      );

      const friendRequests = allFriendships.filter(f =>
        f.friend_id === user.id && f.status === 'pending'
      );

      setPaymentsToConfirm(toConfirm);
      setPaymentsAwaitingConfirmation(awaitingConfirmation);
      setTermChangeRequests(termChanges);
      setExtensionRequests(extensions);
      setLoanOffersReceived(offersReceived);
      setLoanOffersSent(offersSent);
      setFriendRequestsReceived(friendRequests);
      setLoans(allLoans);
      setProfiles(allProfiles);
    } catch (error) {
      console.error("Error loading requests:", error);
    }
    setIsLoading(false);
  };

  // Build reminders from active loans with upcoming/overdue payments
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

      // Only show reminders for payments within 5 days or overdue
      if (daysUntil > 5) return;

      const isBorrower = loan.borrower_id === user.id;
      const otherUserId = isBorrower ? loan.lender_id : loan.borrower_id;
      const otherProfile = profiles.find(p => p.user_id === otherUserId);
      const otherName = otherProfile?.full_name || otherProfile?.username || 'Unknown';
      const paymentDate = toLocalDate(loan.next_payment_date);

      // Calculate remaining amount considering completed payments
      const completedPayments = allPayments.filter(p =>
        p.loan_id === loan.id && p.status === 'completed'
      );
      const totalPaid = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const remainingAmount = (loan.total_amount || loan.amount || 0) - totalPaid;
      const paymentAmount = Math.min(loan.payment_amount || 0, remainingAmount);

      if (paymentAmount <= 0) return;

      if (isBorrower) {
        // User owes a payment
        if (daysUntil < 0) {
          // Overdue
          reminders.push({
            id: `reminder-owe-${loan.id}`,
            type: 'overdue_owe',
            loan,
            title: `Your payment to ${otherName} is overdue`,
            subtitle: `If you've already paid, make sure to record it.`,
            daysUntil,
            paymentAmount,
            otherName,
          });
        } else if (daysUntil === 0) {
          reminders.push({
            id: `reminder-owe-${loan.id}`,
            type: 'due_today_owe',
            loan,
            title: `You have a payment due today to ${otherName}`,
            subtitle: `Make sure to record the payment once it's made.`,
            daysUntil,
            paymentAmount,
            otherName,
          });
        } else {
          reminders.push({
            id: `reminder-owe-${loan.id}`,
            type: 'upcoming_owe',
            loan,
            title: `You have an upcoming payment to ${otherName}`,
            subtitle: `Make sure to record the payment once it's made.`,
            daysUntil,
            paymentAmount,
            otherName,
          });
        }
      } else {
        // User is due to receive a payment
        if (daysUntil < 0) {
          reminders.push({
            id: `reminder-receive-${loan.id}`,
            type: 'overdue_receive',
            loan,
            title: `${otherName}'s payment to you is overdue`,
            subtitle: `If they've already paid, make sure to record it.`,
            daysUntil,
            paymentAmount,
            otherName,
          });
        } else if (daysUntil === 0) {
          reminders.push({
            id: `reminder-receive-${loan.id}`,
            type: 'due_today_receive',
            loan,
            title: `You are due to receive a payment from ${otherName} today`,
            subtitle: `Make sure to record the payment once it's received.`,
            daysUntil,
            paymentAmount,
            otherName,
          });
        } else {
          reminders.push({
            id: `reminder-receive-${loan.id}`,
            type: 'upcoming_receive',
            loan,
            title: `You are due to receive a payment from ${otherName}`,
            subtitle: `Make sure to record the payment once it's received.`,
            daysUntil,
            paymentAmount,
            otherName,
          });
        }
      }
    });

    // Sort: overdue first, then by days until
    reminders.sort((a, b) => a.daysUntil - b.daysUntil);
    return reminders;
  };

  const reminders = buildReminders();

  // All existing handlers preserved
  const handleConfirmPayment = async (payment) => {
    setProcessingId(payment.id);
    try {
      await Payment.update(payment.id, { status: 'completed' });

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

      setPaymentsToConfirm(prev => prev.filter(p => p.id !== payment.id));
      loadRequests();
      // Celebrate the confirmed payment!
      confetti({
        particleCount: 80,
        spread: 65,
        origin: { y: 0.5 },
        colors: ['#35B276', '#82F0B9', '#03ACEA', '#ffffff'],
        zIndex: 9999,
      });
    } catch (error) {
      console.error("Error confirming payment:", error);
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
      console.error("Error denying payment:", error);
    }
    setProcessingId(null);
  };

  const handleCancelPayment = async () => {
    if (!confirmingCancel) return;
    const payment = confirmingCancel;
    setProcessingId(payment.id);
    setConfirmingCancel(null);
    try {
      await Payment.delete(payment.id);
      setPaymentsAwaitingConfirmation(prev => prev.filter(p => p.id !== payment.id));
      loadRequests();
    } catch (error) {
      console.error("Error cancelling payment:", error);
    }
    setProcessingId(null);
  };

  const handleApproveTermChange = async (loan) => {
    setProcessingId(loan.id);
    try {
      await Loan.update(loan.id, { status: 'active' });
      setTermChangeRequests(prev => prev.filter(l => l.id !== loan.id));
      loadRequests();
    } catch (error) {
      console.error("Error approving term change:", error);
    }
    setProcessingId(null);
  };

  const handleRejectTermChange = async (loan) => {
    setProcessingId(loan.id);
    try {
      await Loan.update(loan.id, {
        status: 'active',
        contract_modified: false,
        contract_modification_notes: 'Changes rejected by borrower'
      });
      setTermChangeRequests(prev => prev.filter(l => l.id !== loan.id));
      loadRequests();
    } catch (error) {
      console.error("Error rejecting term change:", error);
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
          is_fully_signed: true
        });
      }

      setShowSignatureModal(false);
      setSelectedOffer(null);
      loadRequests();
    } catch (error) {
      console.error("Error signing loan offer:", error);
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
      console.error("Error declining loan offer:", error);
    }
    setProcessingId(null);
  };

  const handleDeleteOffer = async () => {
    if (!confirmingDeleteOffer) return;
    setProcessingId(confirmingDeleteOffer.id);
    try {
      await Loan.delete(confirmingDeleteOffer.id);
      setConfirmingDeleteOffer(null);
      loadRequests();
    } catch (error) {
      console.error("Error deleting loan offer:", error);
    }
    setProcessingId(null);
  };

  const getUserById = (userId) => {
    return profiles.find(p => p.user_id === userId) || { full_name: 'Unknown', username: 'unknown' };
  };

  const getOtherPartyName = (payment, isRecordedByUser = false) => {
    const loan = loans.find(l => l.id === payment.loan_id);
    if (!loan) return 'Unknown';

    let otherUserId;
    if (isRecordedByUser) {
      otherUserId = loan.lender_id === user.id ? loan.borrower_id : loan.lender_id;
    } else {
      otherUserId = payment.recorded_by || (loan.lender_id === user.id ? loan.borrower_id : loan.lender_id);
    }
    const profile = profiles.find(p => p.user_id === otherUserId);
    return profile?.full_name || profile?.username || 'Unknown';
  };

  const getLoanOtherParty = (loan) => {
    const otherUserId = loan.lender_id === user.id ? loan.borrower_id : loan.lender_id;
    const profile = profiles.find(p => p.user_id === otherUserId);
    return profile?.full_name || profile?.username || 'Unknown';
  };

  const getPaymentMethodInfo = (method) => {
    return PAYMENT_METHOD_ICONS[method] || PAYMENT_METHOD_ICONS.other;
  };

  const handleAcceptFriendRequest = async (friendship) => {
    setProcessingId(friendship.id);
    try {
      await Friendship.update(friendship.id, { status: 'accepted' });
      await loadRequests();
    } catch (error) {
      console.error("Error accepting friend request:", error);
    }
    setProcessingId(null);
  };

  const handleDeclineFriendRequest = async (friendship) => {
    setProcessingId(friendship.id);
    try {
      await Friendship.delete(friendship.id);
      await loadRequests();
    } catch (error) {
      console.error("Error declining friend request:", error);
    }
    setProcessingId(null);
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '2px solid #82F0B9', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px' }} className="animate-spin" />
          <p style={{ fontSize: 14, color: '#787776', fontFamily: "'DM Sans', sans-serif" }}>Loading notifications...</p>
        </div>
      </div>
    );
  }

  const PageCard = ({ title, headerRight, children, style }) => (
    <div style={{ background: '#F4F4F5', borderRadius: 14, overflow: 'hidden', boxShadow: SHADOW, ...style }}>
      <div style={{ padding: '6px 14px 5px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>{title}</span>
        {headerRight && <div style={{ flexShrink: 0 }}>{headerRight}</div>}
      </div>
      <div style={{ background: '#ffffff', margin: '0 5px 5px', borderRadius: 10, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );

  return (
    <div className="home-with-sidebar" style={{ minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14, lineHeight: 1.5, color: '#1A1918', WebkitFontSmoothing: 'antialiased', paddingTop: 0, background: 'transparent' }}>
      <DashboardSidebar activePage="Requests" user={user} />

      {/* Hero */}
      <div style={{ margin: '8px 10px 0', height: 168, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 24, position: 'relative' }}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15, pointerEvents: 'none', zIndex: 0 }} viewBox="0 0 1200 168" preserveAspectRatio="xMidYMid slice">
          {[{cx:80,cy:40},{cx:200,cy:110},{cx:320,cy:25},{cx:430,cy:160},{cx:540,cy:70},{cx:660,cy:130},{cx:770,cy:35},{cx:890,cy:175},{cx:1000,cy:80},{cx:1100,cy:140},{cx:150,cy:185},{cx:480,cy:100},{cx:720,cy:180},{cx:950,cy:55},{cx:280,cy:195},{cx:620,cy:48},{cx:1050,cy:195}].map((s, i) => (
            <circle key={i} cx={s.cx} cy={s.cy} r={i % 3 === 0 ? 2.5 : 1.5} fill="white" />
          ))}
        </svg>
        <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 40, fontWeight: 600, color: '#1A1918', margin: 0, letterSpacing: '-0.01em', lineHeight: 1, textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <span style={{ fontStyle: 'normal' }}>Requests</span>
        </h1>
      </div>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '20px 40px 0', position: 'relative', zIndex: 1 }}>
        <div style={{ background: '#EDECEA', borderRadius: 18, padding: 20 }}>

        {/* Reminders */}
        {reminders.length > 0 && (
          <PageCard title="Reminders" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {reminders.map((reminder, index) => {
                const isOverdue = reminder.type.startsWith('overdue');
                return (
                  <div key={reminder.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderBottom: index < reminders.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: isOverdue ? 'rgba(232,114,110,0.1)' : 'rgba(130,240,185,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Clock style={{ width: 16, height: 16, color: isOverdue ? '#E8726E' : '#82F0B9' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#1A1918', lineHeight: 1.5, margin: '0 0 2px' }}>{reminder.title}</p>
                      <p style={{ fontSize: 12, color: '#787776', lineHeight: 1.5, margin: 0 }}>{reminder.subtitle}</p>
                    </div>
                    <Link to={createPageUrl("RecordPayment")} style={{ display: 'inline-flex', padding: '7px 14px', borderRadius: 20, background: isOverdue ? '#E8726E' : '#82F0B9', color: 'white', fontSize: 11, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      Record Payment
                    </Link>
                  </div>
                );
              })}
            </div>
          </PageCard>
        )}

        {/* Notifications */}
        {(() => {
          const allItems = [];

          // Friend Requests
          friendRequestsReceived.forEach(request => {
            const senderProfile = profiles.find(p => p.user_id === request.user_id);
            const name = senderProfile?.full_name || senderProfile?.username || 'Unknown';
            allItems.push({
              type: 'friend',
              id: `friend-${request.id}`,
              timestamp: new Date(request.created_at || 0),
              data: request,
              name,
              photoUrl: senderProfile?.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=678AFB&color=fff&size=64`,
            });
          });

          // Loan Offers Received
          loanOffersReceived.forEach(offer => {
            const lender = getUserById(offer.lender_id);
            const name = lender?.full_name || lender?.username || 'Unknown';
            allItems.push({
              type: 'offer_received',
              id: `offer-recv-${offer.id}`,
              timestamp: new Date(offer.created_at || 0),
              data: offer,
              name,
              photoUrl: lender?.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=678AFB&color=fff&size=64`,
              purpose: offer.purpose,
            });
          });

          // Payment Confirmations
          paymentsToConfirm.forEach(payment => {
            const recorderProfile = profiles.find(p => p.user_id === payment.recorded_by);
            const name = recorderProfile?.full_name || recorderProfile?.username || 'Unknown';
            allItems.push({
              type: 'payment_confirm',
              id: `pmt-confirm-${payment.id}`,
              timestamp: new Date(payment.created_at || payment.payment_date || 0),
              data: payment,
              name,
              photoUrl: recorderProfile?.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=678AFB&color=fff&size=64`,
              amount: payment.amount,
            });
          });

          // Term Changes
          termChangeRequests.forEach(loan => {
            const otherUserId = loan.lender_id === user.id ? loan.borrower_id : loan.lender_id;
            const otherProfile = profiles.find(p => p.user_id === otherUserId);
            const name = otherProfile?.full_name || otherProfile?.username || getLoanOtherParty(loan);
            allItems.push({
              type: 'term_change',
              id: `term-${loan.id}`,
              timestamp: new Date(loan.updated_at || loan.created_at || 0),
              data: loan,
              name,
              photoUrl: otherProfile?.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=678AFB&color=fff&size=64`,
            });
          });

          // Sort by most recent
          allItems.sort((a, b) => b.timestamp - a.timestamp);

          if (allItems.length === 0 && reminders.length === 0) {
            return (
              <PageCard title="Notifications">
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <CheckCircle style={{ width: 40, height: 40, margin: '0 auto 8px', color: '#C7C6C4' }} />
                  <p style={{ color: '#1A1918', fontWeight: 600, marginBottom: 4 }}>All caught up!</p>
                  <p style={{ color: '#787776', fontSize: 14 }}>You have no notifications.</p>
                </div>
              </PageCard>
            );
          }

          if (allItems.length === 0) return null;

          return (
            <PageCard title="Notifications">
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {allItems.map((item, index) => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: index < allItems.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                    {/* Profile photo */}
                    <img src={item.photoUrl} alt={item.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />

                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#1A1918', lineHeight: 1.4 }}>
                        {item.type === 'friend' && `${item.name} sent you a friend request`}
                        {item.type === 'offer_received' && `${item.name} sent you a loan offer${item.purpose ? ` for ${item.purpose}` : ''}`}
                        {item.type === 'payment_confirm' && `${item.name} recorded a payment of $${item.amount?.toFixed(2)}`}
                        {item.type === 'term_change' && `${item.name} sent you a loan change request`}
                      </div>
                      <div style={{ fontSize: 11, color: '#787776', marginTop: 3 }}>
                        {item.timestamp && item.timestamp.getTime() > 0 ? format(item.timestamp, 'MMM d') : ''}
                      </div>
                    </div>

                    {/* Action */}
                    <div style={{ flexShrink: 0 }}>
                      {item.type === 'friend' && (
                        <Link to={createPageUrl("Friends")} style={{ fontSize: 12, fontWeight: 600, color: '#678AFB', textDecoration: 'none' }}>
                          View friend request
                        </Link>
                      )}
                      {item.type === 'offer_received' && (
                        <button
                          onClick={() => { setSelectedOffer(item.data); setShowSignatureModal(true); }}
                          disabled={processingId === item.data.id}
                          style={{ fontSize: 12, fontWeight: 600, color: '#678AFB', background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: processingId === item.data.id ? 0.5 : 1 }}
                        >
                          View offer
                        </button>
                      )}
                      {item.type === 'payment_confirm' && (
                        <button
                          onClick={() => setViewingPayment({ payment: item.data, direction: 'confirm' })}
                          disabled={processingId === item.data.id}
                          style={{ fontSize: 12, fontWeight: 600, color: '#678AFB', background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: processingId === item.data.id ? 0.5 : 1 }}
                        >
                          Confirm payment
                        </button>
                      )}
                      {item.type === 'term_change' && (
                        <button
                          onClick={() => setViewingPayment({ termChange: item.data, direction: 'term' })}
                          disabled={processingId === item.data.id}
                          style={{ fontSize: 12, fontWeight: 600, color: '#678AFB', background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: processingId === item.data.id ? 0.5 : 1 }}
                        >
                          View request
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </PageCard>
          );
        })()}

        </div>
        <div style={{ padding: '20px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: '#787776' }}>2026 Vony, Inc. All rights reserved.</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <a href="https://www.vony-lending.com/terms" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#787776', textDecoration: 'none' }}>Terms of Service</a>
            <a href="https://www.vony-lending.com/privacy" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#787776', textDecoration: 'none' }}>Privacy Center</a>
            <a href="https://www.vony-lending.com/do-not-sell" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#787776', textDecoration: 'none' }}>Do not sell or share my personal information</a>
          </div>
        </div>
      </div>

      {/* Warning Dialogs */}
      <AnimatePresence>
        {confirmingDeny && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setConfirmingDeny(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <h3 style={{ fontWeight: 600, fontSize: 18, color: '#1A1918' }}>Deny Payment?</h3>
              </div>
              <p style={{ fontSize: 14, color: '#787776', marginBottom: 24 }}>
                Are you sure you want to deny this payment of ${confirmingDeny.amount?.toFixed(2)}? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmingDeny(null)} style={{ flex: 1, padding: '8px 16px', borderRadius: 8, background: 'rgba(0,0,0,0.05)', color: '#1A1918', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={handleDenyPayment} style={{ flex: 1, padding: '8px 16px', borderRadius: 8, background: '#dc2626', color: 'white', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                  Deny Payment
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmingCancel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setConfirmingCancel(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-100 rounded-full">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <h3 style={{ fontWeight: 600, fontSize: 18, color: '#1A1918' }}>Cancel Payment?</h3>
              </div>
              <p style={{ fontSize: 14, color: '#787776', marginBottom: 24 }}>
                Are you sure you want to cancel this payment of ${confirmingCancel.amount?.toFixed(2)}? This will remove the payment record.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmingCancel(null)} style={{ flex: 1, padding: '8px 16px', borderRadius: 8, background: 'rgba(0,0,0,0.05)', color: '#1A1918', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                  Keep
                </button>
                <button onClick={handleCancelPayment} style={{ flex: 1, padding: '8px 16px', borderRadius: 8, background: '#d97706', color: 'white', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                  Cancel Payment
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Offer Confirmation Dialog */}
      <AlertDialog open={!!confirmingDeleteOffer} onOpenChange={() => setConfirmingDeleteOffer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Cancel Loan Offer?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this loan offer of ${confirmingDeleteOffer?.amount?.toLocaleString()}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Offer</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOffer}
              className="bg-red-600 hover:bg-red-700"
            >
              Cancel Offer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Payment / View Term Change Popup */}
      <AnimatePresence>
        {viewingPayment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setViewingPayment(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Payment Confirm Popup */}
              {viewingPayment.direction === 'confirm' && (() => {
                const payment = viewingPayment.payment;
                const methodInfo = getPaymentMethodInfo(payment.payment_method);
                const otherName = getOtherPartyName(payment);
                return (
                  <>
                    <h3 style={{ fontWeight: 600, fontSize: 18, color: '#1A1918', marginBottom: 4 }}>Confirm Payment</h3>
                    <p style={{ fontSize: 14, color: '#787776', marginBottom: 16 }}>
                      @{otherName} recorded a payment of <span style={{ fontWeight: 700, color: '#1A1918' }}>${payment.amount?.toFixed(2)}</span> via {methodInfo.label} on {format(new Date(payment.payment_date), 'MMM d, yyyy')}.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setConfirmingDeny(payment);
                          setViewingPayment(null);
                        }}
                        style={{ flex: 1, padding: '8px 16px', borderRadius: 8, background: 'rgba(0,0,0,0.05)', color: '#E8726E', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}
                      >
                        Deny
                      </button>
                      <button
                        onClick={() => {
                          handleConfirmPayment(payment);
                          setViewingPayment(null);
                        }}
                        disabled={processingId === payment.id}
                        style={{ flex: 1, padding: '8px 16px', borderRadius: 8, background: '#82F0B9', color: 'white', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', opacity: processingId === payment.id ? 0.5 : 1 }}
                      >
                        Confirm
                      </button>
                    </div>
                  </>
                );
              })()}

              {/* Payment Awaiting Popup */}
              {viewingPayment.direction === 'awaiting' && (() => {
                const payment = viewingPayment.payment;
                const methodInfo = getPaymentMethodInfo(payment.payment_method);
                const otherName = getOtherPartyName(payment, true);
                return (
                  <>
                    <h3 style={{ fontWeight: 600, fontSize: 18, color: '#1A1918', marginBottom: 4 }}>Payment Details</h3>
                    <p style={{ fontSize: 14, color: '#787776', marginBottom: 8 }}>
                      You recorded a payment of <span style={{ fontWeight: 700, color: '#1A1918' }}>${payment.amount?.toFixed(2)}</span> to @{otherName} via {methodInfo.label}.
                    </p>
                    <p style={{ fontSize: 12, color: '#787776', marginBottom: 16 }}>Waiting for @{otherName} to confirm.</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setConfirmingCancel(payment);
                          setViewingPayment(null);
                        }}
                        style={{ flex: 1, padding: '8px 16px', borderRadius: 8, background: 'rgba(0,0,0,0.05)', color: '#E8726E', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}
                      >
                        Cancel Payment
                      </button>
                      <button
                        onClick={() => setViewingPayment(null)}
                        style={{ flex: 1, padding: '8px 16px', borderRadius: 8, background: '#82F0B9', color: 'white', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}
                      >
                        Close
                      </button>
                    </div>
                  </>
                );
              })()}

              {/* Term Change Popup */}
              {viewingPayment.direction === 'term' && (() => {
                const loan = viewingPayment.termChange;
                const otherName = getLoanOtherParty(loan);
                return (
                  <>
                    <h3 style={{ fontWeight: 600, fontSize: 18, color: '#1A1918', marginBottom: 4 }}>Loan Change Request</h3>
                    <p style={{ fontSize: 14, color: '#787776', marginBottom: 8 }}>
                      @{otherName} wants to modify the terms of your ${loan.amount?.toLocaleString()} loan{loan.purpose ? ` for ${loan.purpose}` : ''}.
                    </p>
                    {loan.contract_modification_notes && (
                      <div style={{ background: 'rgba(130,240,185,0.08)', borderRadius: 8, padding: 10, marginBottom: 16 }}>
                        <p style={{ fontSize: 12, fontWeight: 500, color: '#787776', marginBottom: 2 }}>Proposed changes:</p>
                        <p style={{ fontSize: 14, color: '#1A1918' }}>{loan.contract_modification_notes}</p>
                      </div>
                    )}
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          handleRejectTermChange(loan);
                          setViewingPayment(null);
                        }}
                        disabled={processingId === loan.id}
                        style={{ flex: 1, padding: '8px 16px', borderRadius: 8, background: 'rgba(0,0,0,0.05)', color: '#E8726E', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', opacity: processingId === loan.id ? 0.5 : 1 }}
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => {
                          handleApproveTermChange(loan);
                          setViewingPayment(null);
                        }}
                        disabled={processingId === loan.id}
                        style={{ flex: 1, padding: '8px 16px', borderRadius: 8, background: '#82F0B9', color: 'white', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', opacity: processingId === loan.id ? 0.5 : 1 }}
                      >
                        Approve
                      </button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Borrower Signature Modal */}
      {showSignatureModal && selectedOffer && (
        <BorrowerSignatureModal
          isOpen={showSignatureModal}
          onClose={() => {
            setShowSignatureModal(false);
            setSelectedOffer(null);
          }}
          onSign={handleSignOffer}
          onDecline={handleDeclineOffer}
          loanDetails={selectedOffer}
          lenderName={getUserById(selectedOffer.lender_id)?.full_name || 'Lender'}
          borrowerFullName={user?.full_name || ''}
        />
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && selectedLoanForPayment && (
        <RecordPaymentModal
          loan={selectedLoanForPayment}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedLoanForPayment(null);
          }}
          onPaymentComplete={() => {
            setShowPaymentModal(false);
            setSelectedLoanForPayment(null);
            loadRequests();
          }}
          isLender={selectedLoanForPayment.lender_id === user.id}
        />
      )}
    </div>
  );
}

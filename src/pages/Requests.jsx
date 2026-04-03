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
      <div style={{ minHeight: '100vh', background: '#F5F4F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '2px solid #678AFB', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px' }} className="animate-spin" />
          <p style={{ fontSize: 14, color: '#787776', fontFamily: "'DM Sans', sans-serif" }}>Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative', fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif", fontSize: 14, lineHeight: 1.5, color: '#1A1918', WebkitFontSmoothing: 'antialiased', paddingLeft: 240, background: '#F5F4F0' }}>
      <DashboardSidebar activePage="Requests" user={user} />
      <div className="content-box-glow" style={{ position: 'relative', margin: '20px 12px 12px 0', borderRadius: 24, overflow: 'hidden', minHeight: 'calc(100vh - 32px)', border: '12px solid rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', boxShadow: 'rgba(0,0,0,0.03) 0px 0.6px 2.3px -0.42px, rgba(0,0,0,0.04) 0px 2.3px 8.7px -0.83px, rgba(0,0,0,0.08) 0px 10px 38px -1.25px' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', bottom: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
          <div style={{
            position: 'absolute', top: 0, left: '-10%', width: '120%', height: '100%', zIndex: 0,
            background: '#6587F9'
          }} />
        </div>

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 1080, margin: '0 auto', padding: '0 28px' }}>
          {/* Hero */}
          <div style={{ paddingTop: 80, paddingBottom: 20, textAlign: 'center' }}>
            <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '3.2rem', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1, color: '#1A1918', margin: 0 }}>Notifications</h1>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 60 }}>
            {/* All Notifications */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <div className="glass-card" style={{ padding: '20px 24px' }}>
                {(() => {
                  // Build unified list - reminders first, then requests
                  const allItems = [];

                  // Add reminders first (always at top)
                  reminders.forEach((reminder, index) => {
                    allItems.push({
                      type: 'reminder',
                      id: reminder.id,
                      timestamp: new Date(0), // Ensure reminders sort to top
                      sortOrder: -1000 + index,
                      data: reminder,
                    });
                  });

                  // Friend Requests
                  friendRequestsReceived.forEach(request => {
                    const senderProfile = profiles.find(p => p.user_id === request.user_id);
                    allItems.push({
                      type: 'friend',
                      id: `friend-${request.id}`,
                      timestamp: new Date(request.created_at || 0),
                      sortOrder: 0,
                      data: request,
                      senderProfile,
                    });
                  });

                  // Loan Offers Received
                  loanOffersReceived.forEach(offer => {
                    const lender = getUserById(offer.lender_id);
                    allItems.push({
                      type: 'offer_received',
                      id: `offer-recv-${offer.id}`,
                      timestamp: new Date(offer.created_at || 0),
                      sortOrder: 0,
                      data: offer,
                      otherProfile: lender,
                    });
                  });

                  // Payment Confirmations
                  paymentsToConfirm.forEach(payment => {
                    const methodInfo = getPaymentMethodInfo(payment.payment_method);
                    const otherName = getOtherPartyName(payment);
                    allItems.push({
                      type: 'payment_confirm',
                      id: `pmt-confirm-${payment.id}`,
                      timestamp: new Date(payment.created_at || payment.payment_date || 0),
                      sortOrder: 0,
                      data: payment,
                      methodInfo,
                      otherName,
                    });
                  });

                  // Term Changes
                  termChangeRequests.forEach(loan => {
                    allItems.push({
                      type: 'term_change',
                      id: `term-${loan.id}`,
                      timestamp: new Date(loan.updated_at || loan.created_at || 0),
                      sortOrder: 0,
                      data: loan,
                      otherName: getLoanOtherParty(loan),
                    });
                  });

                  // Sort: reminders first (sortOrder -1000), then requests by most recent first
                  allItems.sort((a, b) => {
                    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
                    return b.timestamp - a.timestamp;
                  });

                  if (allItems.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: '32px 0' }}>
                        <CheckCircle style={{ width: 40, height: 40, margin: '0 auto 8px', color: '#C7C6C4' }} />
                        <p style={{ color: '#1A1918', fontWeight: 600, marginBottom: 4 }}>All caught up!</p>
                        <p style={{ color: '#787776', fontSize: 14 }}>You have no notifications.</p>
                      </div>
                    );
                  }

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {allItems.map((item, index) => {
                        // Reminder items
                        if (item.type === 'reminder') {
                          const reminder = item.data;
                          const isOverdue = reminder.type.startsWith('overdue');
                          return (
                            <motion.div
                              key={item.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.03 }}
                              style={{ padding: 12, borderRadius: 8, background: isOverdue ? 'rgba(232,114,110,0.06)' : 'rgba(103,138,251,0.06)' }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ fontSize: 14, fontWeight: 600, color: isOverdue ? '#E8726E' : '#1A1918' }}>
                                    {reminder.title}
                                  </p>
                                  <p style={{ fontSize: 12, marginTop: 2, color: isOverdue ? '#E8726E' : '#787776' }}>
                                    {reminder.subtitle}
                                  </p>
                                </div>
                                <button
                                  onClick={() => {
                                    setSelectedLoanForPayment(reminder.loan);
                                    setShowPaymentModal(true);
                                  }}
                                  style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', background: isOverdue ? '#E8726E' : '#678AFB', color: 'white' }}
                                >
                                  Record Payment
                                </button>
                              </div>
                            </motion.div>
                          );
                        }

                        // Request items
                        return (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            style={{ padding: 12, borderRadius: 8, background: 'rgba(0,0,0,0.03)' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                {/* Friend Request */}
                                {item.type === 'friend' && (
                                  <>
                                    <p style={{ fontSize: 14, fontWeight: 600, color: '#1A1918' }}>
                                      {item.senderProfile?.full_name || item.senderProfile?.username || 'Unknown'} sent you a friend request
                                    </p>
                                    <p style={{ fontSize: 11, color: '#787776', marginTop: 2 }}>
                                      {item.timestamp ? format(item.timestamp, 'MMM d, yyyy') : ''}
                                    </p>
                                  </>
                                )}

                                {/* Loan Offer Received */}
                                {item.type === 'offer_received' && (
                                  <>
                                    <p style={{ fontSize: 14, fontWeight: 600, color: '#1A1918' }}>
                                      {item.otherProfile?.full_name || item.otherProfile?.username || 'Unknown'} sent you a loan offer{item.data.purpose ? ` for ${item.data.purpose}` : ''}
                                    </p>
                                    <p style={{ fontSize: 11, color: '#787776', marginTop: 2 }}>
                                      {item.timestamp ? format(item.timestamp, 'MMM d, yyyy') : ''}
                                    </p>
                                  </>
                                )}

                                {/* Payment Confirmation */}
                                {item.type === 'payment_confirm' && (
                                  <>
                                    <p style={{ fontSize: 14, fontWeight: 600, color: '#1A1918' }}>
                                      Confirm payment from {item.otherName}
                                    </p>
                                    <p style={{ fontSize: 11, color: '#787776', marginTop: 2 }}>
                                      {item.timestamp ? format(item.timestamp, 'MMM d, yyyy') : ''}
                                    </p>
                                  </>
                                )}

                                {/* Term Change */}
                                {item.type === 'term_change' && (
                                  <>
                                    <p style={{ fontSize: 14, fontWeight: 600, color: '#1A1918' }}>
                                      {item.otherName} sent you a loan change request
                                    </p>
                                    <p style={{ fontSize: 11, color: '#787776', marginTop: 2 }}>
                                      {item.timestamp ? format(item.timestamp, 'MMM d, yyyy') : ''}
                                    </p>
                                  </>
                                )}
                              </div>

                              {/* Action Buttons */}
                              <div style={{ flexShrink: 0 }}>
                                {item.type === 'friend' && (
                                  <Link
                                    to={createPageUrl("Friends")}
                                    style={{ background: '#678AFB', color: 'white', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}
                                  >
                                    View Friends
                                  </Link>
                                )}
                                {item.type === 'offer_received' && (
                                  <button
                                    onClick={() => { setSelectedOffer(item.data); setShowSignatureModal(true); }}
                                    disabled={processingId === item.data.id}
                                    style={{ background: '#678AFB', color: 'white', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', opacity: processingId === item.data.id ? 0.5 : 1 }}
                                  >
                                    View Offer
                                  </button>
                                )}
                                {item.type === 'payment_confirm' && (
                                  <button
                                    onClick={() => setViewingPayment({ payment: item.data, direction: 'confirm' })}
                                    disabled={processingId === item.data.id}
                                    style={{ background: '#678AFB', color: 'white', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', opacity: processingId === item.data.id ? 0.5 : 1 }}
                                  >
                                    View Payment
                                  </button>
                                )}
                                {item.type === 'term_change' && (
                                  <button
                                    onClick={() => { setViewingPayment({ termChange: item.data, direction: 'term' }); }}
                                    disabled={processingId === item.data.id}
                                    style={{ background: '#678AFB', color: 'white', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', opacity: processingId === item.data.id ? 0.5 : 1 }}
                                  >
                                    View Request
                                  </button>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </div>
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
                        style={{ flex: 1, padding: '8px 16px', borderRadius: 8, background: '#678AFB', color: 'white', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', opacity: processingId === payment.id ? 0.5 : 1 }}
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
                        style={{ flex: 1, padding: '8px 16px', borderRadius: 8, background: '#678AFB', color: 'white', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}
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
                      <div style={{ background: 'rgba(103,138,251,0.08)', borderRadius: 8, padding: 10, marginBottom: 16 }}>
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
                        style={{ flex: 1, padding: '8px 16px', borderRadius: 8, background: '#678AFB', color: 'white', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', opacity: processingId === loan.id ? 0.5 : 1 }}
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

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Payment, Loan, PublicProfile, LoanAgreement, Friendship } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  const [activeTab, setActiveTab] = useState('all');
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState(null);

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
        if (!loan || loan.lender_id !== user.id) return false;
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeLoans = loans.filter(l =>
      l.status === 'active' &&
      (l.lender_id === user.id || l.borrower_id === user.id) &&
      l.next_payment_date
    );

    activeLoans.forEach(loan => {
      const paymentDate = parseISO(loan.next_payment_date);
      paymentDate.setHours(0, 0, 0, 0);
      const daysUntil = differenceInDays(paymentDate, today);

      // Only show reminders for payments within 5 days or overdue
      if (daysUntil > 5) return;

      const isBorrower = loan.borrower_id === user.id;
      const otherUserId = isBorrower ? loan.lender_id : loan.borrower_id;
      const otherProfile = profiles.find(p => p.user_id === otherUserId);
      const otherUsername = otherProfile?.username || 'unknown';

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
            title: `Your payment to @${otherUsername} is ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} late`,
            subtitle: `Payment of $${paymentAmount.toFixed(2)} to @${otherUsername} was due on ${format(paymentDate, 'MMM d, yyyy')}`,
            daysUntil,
            paymentAmount,
            otherUsername,
          });
        } else if (daysUntil === 0) {
          reminders.push({
            id: `reminder-owe-${loan.id}`,
            type: 'due_today_owe',
            loan,
            title: `You have a payment due today`,
            subtitle: `Payment of $${paymentAmount.toFixed(2)} to @${otherUsername} due on ${format(paymentDate, 'MMM d, yyyy')}`,
            daysUntil,
            paymentAmount,
            otherUsername,
          });
        } else {
          reminders.push({
            id: `reminder-owe-${loan.id}`,
            type: 'upcoming_owe',
            loan,
            title: `You have a payment due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
            subtitle: `Payment of $${paymentAmount.toFixed(2)} to @${otherUsername} due on ${format(paymentDate, 'MMM d, yyyy')}`,
            daysUntil,
            paymentAmount,
            otherUsername,
          });
        }
      } else {
        // User is due to receive a payment
        if (daysUntil < 0) {
          reminders.push({
            id: `reminder-receive-${loan.id}`,
            type: 'overdue_receive',
            loan,
            title: `Your payment from @${otherUsername} is ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} late`,
            subtitle: `Payment of $${paymentAmount.toFixed(2)} from @${otherUsername} was due on ${format(paymentDate, 'MMM d, yyyy')}`,
            daysUntil,
            paymentAmount,
            otherUsername,
          });
        } else if (daysUntil === 0) {
          reminders.push({
            id: `reminder-receive-${loan.id}`,
            type: 'due_today_receive',
            loan,
            title: `You are due to receive a payment today`,
            subtitle: `Payment of $${paymentAmount.toFixed(2)} from @${otherUsername} due on ${format(paymentDate, 'MMM d, yyyy')}`,
            daysUntil,
            paymentAmount,
            otherUsername,
          });
        } else {
          reminders.push({
            id: `reminder-receive-${loan.id}`,
            type: 'upcoming_receive',
            loan,
            title: `You are due to receive a payment in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
            subtitle: `Payment of $${paymentAmount.toFixed(2)} from @${otherUsername} due on ${format(paymentDate, 'MMM d, yyyy')}`,
            daysUntil,
            paymentAmount,
            otherUsername,
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
    return profile?.username || profile?.full_name || 'Unknown';
  };

  const getLoanOtherParty = (loan) => {
    const otherUserId = loan.lender_id === user.id ? loan.borrower_id : loan.lender_id;
    const profile = profiles.find(p => p.user_id === otherUserId);
    return profile?.username || profile?.full_name || 'Unknown';
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

  const totalLoanOffers = loanOffersReceived.length + loanOffersSent.length;
  const totalRequests = paymentsToConfirm.length + paymentsAwaitingConfirmation.length + termChangeRequests.length + totalLoanOffers + friendRequestsReceived.length;

  const tabs = [
    { id: 'all', label: 'All', count: totalRequests },
    { id: 'friends', label: 'Friend Requests', count: friendRequestsReceived.length },
    { id: 'offers', label: 'Loan Offers', count: totalLoanOffers },
    { id: 'payments', label: 'Payments', count: paymentsToConfirm.length + paymentsAwaitingConfirmation.length },
    { id: 'terms', label: 'Loan Changes', count: termChangeRequests.length },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#CDE7F8' }}>
        <div className="px-4 pt-8 pb-8 sm:px-8 md:px-24 md:pt-12 lg:px-36">
          <div className="max-w-4xl mx-auto flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#4C7FC4] border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#CDE7F8' }}>
      <div className="px-4 pt-8 pb-8 sm:px-8 md:px-24 md:pt-12 lg:px-36">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#213B75] tracking-tight font-sans">
              Notifications
            </h1>
          </motion.div>

          {/* Reminders Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <div className="rounded-xl px-4 py-4 shadow-sm bg-white">
              <p className="text-sm font-bold text-[#213B75] mb-3 tracking-tight font-sans">
                Reminders
              </p>

              {reminders.length === 0 ? (
                <div className="text-center py-6">
                  <Bell className="w-10 h-10 mx-auto mb-2 text-[#CDE7F8]" />
                  <p className="text-[#4C7FC4] text-sm font-sans">No reminders right now</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {reminders.map((reminder, index) => {
                    const isOverdue = reminder.type.startsWith('overdue');
                    return (
                      <motion.div
                        key={reminder.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`p-3 rounded-lg ${isOverdue ? 'bg-red-50' : 'bg-[#CDE7F8]'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold font-sans ${isOverdue ? 'text-red-700' : 'text-[#213B75]'}`}>
                              {reminder.title}
                            </p>
                            <p className={`text-xs font-sans mt-0.5 ${isOverdue ? 'text-red-500' : 'text-[#4C7FC4]'}`}>
                              {reminder.subtitle}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedLoanForPayment(reminder.loan);
                              setShowPaymentModal(true);
                            }}
                            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold font-sans transition-colors whitespace-nowrap ${
                              isOverdue
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'bg-[#213B75] text-white hover:bg-[#1a3060]'
                            }`}
                          >
                            Record Payment
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>

          {/* Requests Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="rounded-xl px-4 py-4 shadow-sm bg-white">
              <p className="text-sm font-bold text-[#213B75] mb-3 tracking-tight font-sans">
                Requests
              </p>

              {/* Tab Navigation */}
              <div className="flex gap-2 overflow-x-auto pb-3 mb-3">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-sans transition-all whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-[#213B75] text-white'
                        : 'bg-[#CDE7F8] text-[#4C7FC4] hover:bg-[#b8daf3]'
                    }`}
                  >
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                    {tab.count > 0 && (
                      <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                        activeTab === tab.id ? 'bg-white/20' : 'bg-white'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* No Requests State */}
              {totalRequests === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="w-10 h-10 mx-auto mb-2 text-[#CDE7F8]" />
                  <p className="text-[#213B75] font-semibold font-sans mb-1">All caught up!</p>
                  <p className="text-[#4C7FC4] text-sm font-sans">You have no pending requests to review.</p>
                </div>
              )}

              <div className="space-y-4">
                {/* Loan Offers Received */}
                {(activeTab === 'all' || activeTab === 'offers') && loanOffersReceived.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-[#4C7FC4] uppercase tracking-widest mb-2 font-sans">
                      Loan Offers For You
                    </p>
                    <div className="space-y-2">
                      {loanOffersReceived.map((offer, index) => {
                        const lender = getUserById(offer.lender_id);
                        return (
                          <motion.div
                            key={offer.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="p-3 rounded-lg bg-[#CDE7F8]"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-[#213B75] font-sans">
                                  @{lender?.username || 'unknown'} wants to lend you ${offer.amount?.toLocaleString()} for {offer.purpose || 'Reason'}
                                </p>
                                <p className="text-xs text-[#4C7FC4] font-sans">
                                  {offer.interest_rate}% APR · {offer.repayment_period} months · ${offer.payment_amount?.toFixed(2)}/{offer.payment_frequency || 'monthly'}
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  setSelectedOffer(offer);
                                  setShowSignatureModal(true);
                                }}
                                disabled={processingId === offer.id}
                                className="bg-white rounded-lg px-3 py-1.5 flex items-center gap-1.5 hover:bg-white/80 transition-colors disabled:opacity-50 flex-shrink-0"
                              >
                                <Eye className="w-3.5 h-3.5 text-[#4C7FC4]" />
                                <span className="text-xs font-semibold text-[#213B75] font-sans">View Details</span>
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Loan Offers Sent */}
                {(activeTab === 'all' || activeTab === 'offers') && loanOffersSent.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-[#4C7FC4] uppercase tracking-widest mb-2 font-sans">
                      Loan Offers You Sent
                    </p>
                    <div className="space-y-2">
                      {loanOffersSent.map((offer, index) => {
                        const borrower = getUserById(offer.borrower_id);
                        return (
                          <motion.div
                            key={offer.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="p-3 rounded-lg bg-[#CDE7F8]"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-[#213B75] font-sans">
                                  ${offer.amount?.toLocaleString()} to @{borrower?.username || 'unknown'} for {offer.purpose || 'Reason'}
                                </p>
                                <p className="text-xs text-[#4C7FC4] font-sans">
                                  {offer.interest_rate}% APR · Awaiting acceptance
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-[10px] font-semibold text-[#4C7FC4] bg-white rounded-md px-2 py-0.5 font-sans">Pending</span>
                                <button
                                  onClick={() => setConfirmingDeleteOffer(offer)}
                                  disabled={processingId === offer.id}
                                  className="bg-white rounded-lg px-3 py-1.5 flex items-center gap-1.5 hover:bg-red-50 transition-colors disabled:opacity-50"
                                >
                                  <XCircle className="w-3.5 h-3.5 text-red-500" />
                                  <span className="text-xs font-semibold text-red-500 font-sans">Cancel</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedOffer(offer);
                                    setShowSignatureModal(true);
                                  }}
                                  className="bg-white rounded-lg px-3 py-1.5 flex items-center gap-1.5 hover:bg-white/80 transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5 text-[#4C7FC4]" />
                                  <span className="text-xs font-semibold text-[#213B75] font-sans">View</span>
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Friend Requests */}
                {(activeTab === 'all' || activeTab === 'friends') && friendRequestsReceived.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-[#4C7FC4] uppercase tracking-widest mb-2 font-sans">
                      Friend Requests
                    </p>
                    <div className="space-y-2">
                      {friendRequestsReceived.map((request, index) => {
                        const senderProfile = profiles.find(p => p.user_id === request.user_id);
                        const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent((senderProfile?.full_name || 'U').charAt(0))}&background=4C7FC4&color=fff&size=128`;

                        return (
                          <motion.div
                            key={request.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="p-3 rounded-lg bg-[#CDE7F8]"
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={senderProfile?.profile_picture_url || senderProfile?.avatar_url || defaultAvatar}
                                alt={senderProfile?.full_name || 'User'}
                                className="w-10 h-10 rounded-full object-cover flex-shrink-0 bg-white"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-[#213B75] truncate font-sans">
                                  {senderProfile?.full_name || senderProfile?.username}
                                </p>
                                <p className="text-xs text-[#4C7FC4] truncate font-sans">
                                  @{senderProfile?.username} wants to be your friend
                                </p>
                              </div>
                              <Link
                                to={createPageUrl("Friends")}
                                className="flex-shrink-0 bg-[#213B75] rounded-lg px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1a3060] transition-colors font-sans"
                              >
                                View Request
                              </Link>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Payment Confirmations Needed */}
                {(activeTab === 'all' || activeTab === 'payments') && paymentsToConfirm.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-[#4C7FC4] uppercase tracking-widest mb-2 font-sans">
                      Payments Awaiting Your Confirmation
                    </p>
                    <div className="space-y-2">
                      {paymentsToConfirm.map((payment, index) => {
                        const methodInfo = getPaymentMethodInfo(payment.payment_method);
                        return (
                          <motion.div
                            key={payment.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="p-3 rounded-lg bg-[#CDE7F8]"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-[#213B75] font-sans">
                                  ${payment.amount?.toFixed(2)} from @{getOtherPartyName(payment)}
                                </p>
                                <p className="text-xs text-[#4C7FC4] font-sans">
                                  via {methodInfo.label} · {format(new Date(payment.payment_date), 'MMM d, yyyy')}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  onClick={() => setConfirmingDeny(payment)}
                                  disabled={processingId === payment.id}
                                  className="bg-white rounded-lg px-3 py-1.5 flex items-center gap-1.5 hover:bg-red-50 transition-colors disabled:opacity-50"
                                >
                                  <XCircle className="w-3.5 h-3.5 text-red-500" />
                                  <span className="text-xs font-semibold text-red-500 font-sans">Deny</span>
                                </button>
                                <button
                                  onClick={() => handleConfirmPayment(payment)}
                                  disabled={processingId === payment.id}
                                  className="bg-[#213B75] rounded-lg px-3 py-1.5 flex items-center gap-1.5 hover:bg-[#1a3060] transition-colors disabled:opacity-50"
                                >
                                  <CheckCircle className="w-3.5 h-3.5 text-white" />
                                  <span className="text-xs font-semibold text-white font-sans">Confirm</span>
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Payments Awaiting Confirmation from Others */}
                {(activeTab === 'all' || activeTab === 'payments') && paymentsAwaitingConfirmation.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-[#4C7FC4] uppercase tracking-widest mb-2 font-sans">
                      Your Payments Awaiting Confirmation
                    </p>
                    <div className="space-y-2">
                      {paymentsAwaitingConfirmation.map((payment, index) => {
                        const methodInfo = getPaymentMethodInfo(payment.payment_method);
                        return (
                          <motion.div
                            key={payment.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="p-3 rounded-lg bg-[#CDE7F8]"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-[#213B75] font-sans">
                                  ${payment.amount?.toFixed(2)} to @{getOtherPartyName(payment, true)}
                                </p>
                                <p className="text-xs text-[#4C7FC4] font-sans">
                                  via {methodInfo.label} · Waiting for confirmation
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-[10px] font-semibold text-[#4C7FC4] bg-white rounded-md px-2 py-0.5 font-sans">Pending</span>
                                <button
                                  onClick={() => handleConfirmPayment(payment)}
                                  disabled={processingId === payment.id}
                                  className="bg-[#213B75] rounded-lg px-3 py-1.5 flex items-center gap-1.5 hover:bg-[#1a3060] transition-colors disabled:opacity-50"
                                >
                                  <CheckCircle className="w-3.5 h-3.5 text-white" />
                                  <span className="text-xs font-semibold text-white font-sans">Confirm</span>
                                </button>
                                <button
                                  onClick={() => setConfirmingCancel(payment)}
                                  disabled={processingId === payment.id}
                                  className="bg-white rounded-lg px-3 py-1.5 flex items-center gap-1.5 hover:bg-red-50 transition-colors disabled:opacity-50"
                                >
                                  <XCircle className="w-3.5 h-3.5 text-red-500" />
                                  <span className="text-xs font-semibold text-red-500 font-sans">Cancel</span>
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Term Change Requests */}
                {(activeTab === 'all' || activeTab === 'terms') && termChangeRequests.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-[#4C7FC4] uppercase tracking-widest mb-2 font-sans">
                      Term Change Requests
                    </p>
                    <div className="space-y-2">
                      {termChangeRequests.map((loan, index) => (
                        <motion.div
                          key={loan.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="p-3 rounded-lg bg-[#CDE7F8]"
                        >
                          <div className="flex flex-col gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[#213B75] font-sans">
                                @{getLoanOtherParty(loan)} wants to modify loan terms
                              </p>
                              <p className="text-xs text-[#4C7FC4] font-sans">
                                Loan: ${loan.amount?.toLocaleString()} · {loan.purpose || 'No purpose specified'}
                              </p>
                            </div>

                            {loan.contract_modification_notes && (
                              <div className="bg-white rounded-lg p-2.5">
                                <p className="text-xs font-medium text-[#4C7FC4] mb-0.5 font-sans">Changes:</p>
                                <p className="text-sm text-[#213B75] font-sans">{loan.contract_modification_notes}</p>
                              </div>
                            )}

                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleRejectTermChange(loan)}
                                disabled={processingId === loan.id}
                                className="bg-white rounded-lg px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 font-sans"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleApproveTermChange(loan)}
                                disabled={processingId === loan.id}
                                className="bg-[#213B75] rounded-lg px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1a3060] transition-colors disabled:opacity-50 font-sans"
                              >
                                Approve
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Info Note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <p className="text-xs text-[#4C7FC4] flex items-center justify-center gap-1.5 font-sans">
              <AlertCircle className="w-4 h-4" />
              Requests require action from both parties to take effect
            </p>
          </motion.div>
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
                <h3 className="font-semibold text-lg text-[#213B75] font-sans">Deny Payment?</h3>
              </div>
              <p className="text-sm text-[#4C7FC4] mb-6 font-sans">
                Are you sure you want to deny this payment of ${confirmingDeny.amount?.toFixed(2)}? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmingDeny(null)} className="flex-1 px-4 py-2 rounded-lg bg-[#CDE7F8] text-[#213B75] text-sm font-semibold font-sans">
                  Cancel
                </button>
                <button onClick={handleDenyPayment} className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold font-sans hover:bg-red-700">
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
                <h3 className="font-semibold text-lg text-[#213B75] font-sans">Cancel Payment?</h3>
              </div>
              <p className="text-sm text-[#4C7FC4] mb-6 font-sans">
                Are you sure you want to cancel this payment of ${confirmingCancel.amount?.toFixed(2)}? This will remove the payment record.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmingCancel(null)} className="flex-1 px-4 py-2 rounded-lg bg-[#CDE7F8] text-[#213B75] text-sm font-semibold font-sans">
                  Keep
                </button>
                <button onClick={handleCancelPayment} className="flex-1 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold font-sans hover:bg-amber-700">
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

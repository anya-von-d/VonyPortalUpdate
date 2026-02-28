import React, { useState, useEffect } from "react";
import { Payment, Loan, PublicProfile, LoanAgreement, Friendship } from "@/entities/all";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Smartphone,
  Banknote,
  CreditCard,
  AlertCircle,
  Calendar,
  FileText,
  Edit3,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  Send,
  Percent,
  Trash2,
  UserPlus,
  Users
} from "lucide-react";
import { format, addMonths } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import BorrowerSignatureModal from "@/components/loans/BorrowerSignatureModal";
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
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [confirmingDeny, setConfirmingDeny] = useState(null);
  const [confirmingCancel, setConfirmingCancel] = useState(null);
  const [confirmingDeleteOffer, setConfirmingDeleteOffer] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);

  useEffect(() => {
    if (user?.id) {
      loadRequests();
    }
  }, [user?.id]);

  const loadRequests = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const [allPayments, allLoans, allProfiles, allAgreements, allFriendships] = await Promise.all([
        Payment.filter({ status: 'pending_confirmation' }).catch(() => []),
        Loan.list().catch(() => []),
        PublicProfile.list().catch(() => []),
        LoanAgreement.list().catch(() => []),
        Friendship.list().catch(() => [])
      ]);

      // Get user's loans
      const userLoans = allLoans.filter(
        loan => loan.lender_id === user.id || loan.borrower_id === user.id
      );
      const userLoanIds = userLoans.map(l => l.id);

      // Filter payments where the current user needs to confirm (as lender)
      const toConfirm = allPayments.filter(payment => {
        if (!userLoanIds.includes(payment.loan_id)) return false;
        const loan = userLoans.find(l => l.id === payment.loan_id);
        if (!loan || loan.lender_id !== user.id) return false;
        if (payment.recorded_by === user.id) return false;
        return true;
      });

      // Filter payments that the user recorded and are awaiting confirmation
      const awaitingConfirmation = allPayments.filter(payment => {
        if (!userLoanIds.includes(payment.loan_id)) return false;
        if (payment.recorded_by !== user.id) return false;
        return true;
      });

      // Filter loans with pending term changes (status: pending_borrower_approval)
      const termChanges = allLoans.filter(loan => {
        if (!userLoanIds.includes(loan.id)) return false;
        return loan.status === 'pending_borrower_approval' && loan.borrower_id === user.id;
      });

      // Filter loans with extension requests (you could track this with a field like extension_requested)
      // For now, we'll check if there's a field or modification note about extension
      const extensions = allLoans.filter(loan => {
        if (!userLoanIds.includes(loan.id)) return false;
        return loan.extension_requested && loan.extension_requested_by !== user.id;
      });

      // Loan offers received (user is borrower, status is pending)
      const offersReceived = allLoans.filter(loan =>
        loan.borrower_id === user.id && loan.status === 'pending'
      );

      // Loan offers sent (user is lender, status is pending)
      const offersSent = allLoans.filter(loan =>
        loan.lender_id === user.id && loan.status === 'pending'
      );

      // Friend requests received (user is friend_id, status is pending)
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
      // Revert to active without the changes (or mark as rejected)
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

  // Loan offer handlers
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

  const colors = ['#D0ED6F', '#83F384', '#6EE8B5'];

  if (isLoading) {
    return (
      <div className="min-h-screen p-6" style={{background: `linear-gradient(to bottom right, rgb(var(--theme-bg-from)), rgb(var(--theme-bg-to)))`}}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#00A86B] border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{background: `linear-gradient(to bottom right, rgb(var(--theme-bg-from)), rgb(var(--theme-bg-to)))`}}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-5"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4 tracking-tight text-left">
            Requests
          </h1>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <Button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              className={`whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#00A86B] hover:bg-[#0D9B76] text-white'
                  : 'bg-[#EEFFF5] border-0 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              {tab.count > 0 && (
                <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-white/20' : 'bg-slate-200'
                }`}>
                  {tab.count}
                </span>
              )}
            </Button>
          ))}
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
                  <h3 className="font-semibold text-lg text-slate-800">Deny Payment?</h3>
                </div>
                <p className="text-sm text-slate-600 mb-6">
                  Are you sure you want to deny this payment of ${confirmingDeny.amount?.toFixed(2)}? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setConfirmingDeny(null)}>
                    Cancel
                  </Button>
                  <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={handleDenyPayment}>
                    Deny Payment
                  </Button>
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
                  <h3 className="font-semibold text-lg text-slate-800">Cancel Payment?</h3>
                </div>
                <p className="text-sm text-slate-600 mb-6">
                  Are you sure you want to cancel this payment of ${confirmingCancel.amount?.toFixed(2)}? This will remove the payment record.
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setConfirmingCancel(null)}>
                    Keep
                  </Button>
                  <Button className="flex-1 bg-amber-600 hover:bg-amber-700 text-white" onClick={handleCancelPayment}>
                    Cancel Payment
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* No Requests State */}
        {totalRequests === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-[#DBFFEB] border-0 rounded-2xl">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-[#00A86B]" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">All caught up!</h3>
                <p className="text-slate-600">You have no pending requests to review.</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Loan Offers Received (User is Borrower) */}
        {(activeTab === 'all' || activeTab === 'offers') && loanOffersReceived.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-[#DBFFEB] border-0 rounded-2xl">
              <CardContent className="p-5">
                <p className="text-[10px] text-slate-600 uppercase tracking-[0.12em] font-medium mb-4" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                  Loan Offers For You
                </p>
                <div className="space-y-3">
                  {loanOffersReceived.map((offer, index) => {
                    const lender = getUserById(offer.lender_id);
                    return (
                      <motion.div
                        key={offer.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 rounded-xl"
                        style={{ backgroundColor: colors[index % 3] }}
                      >
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#DBFFEB] flex items-center justify-center flex-shrink-0">
                              <Send className="w-5 h-5 text-[#00A86B]" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-slate-800">
                                @{lender?.username || 'unknown'} wants to lend you ${offer.amount?.toLocaleString()} for {offer.purpose || 'Reason'}
                              </p>
                              <p className="text-xs text-slate-600">
                                {offer.interest_rate}% APR · {offer.repayment_period} months · ${offer.payment_amount?.toFixed(2)}/{offer.payment_frequency || 'monthly'}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedOffer(offer);
                                setShowSignatureModal(true);
                              }}
                              disabled={processingId === offer.id}
                              className="bg-[#00A86B] hover:bg-[#0D9B76] text-white"
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Loan Offers Sent (User is Lender) */}
        {(activeTab === 'all' || activeTab === 'offers') && loanOffersSent.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-[#DBFFEB] border-0 rounded-2xl">
              <CardContent className="p-5">
                <p className="text-[10px] text-slate-600 uppercase tracking-[0.12em] font-medium mb-4" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                  Loan Offers You Sent
                </p>
                <div className="space-y-3">
                  {loanOffersSent.map((offer, index) => {
                    const borrower = getUserById(offer.borrower_id);
                    return (
                      <motion.div
                        key={offer.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 rounded-xl"
                        style={{ backgroundColor: colors[index % 3] }}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#DBFFEB] flex items-center justify-center flex-shrink-0">
                              <ArrowUpRight className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">
                                ${offer.amount?.toLocaleString()} to @{borrower?.username || 'unknown'} for {offer.purpose || 'Reason'}
                              </p>
                              <p className="text-xs text-slate-600">
                                {offer.interest_rate}% APR · Awaiting acceptance
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="bg-[#DBFFEB] rounded-xl px-4 py-2 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              <span className="text-sm font-medium text-slate-600">Pending</span>
                            </div>
                            <button
                              onClick={() => setConfirmingDeleteOffer(offer)}
                              disabled={processingId === offer.id}
                              className="bg-[#DBFFEB] rounded-xl px-4 py-2 flex items-center gap-1.5 hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5 text-red-500" />
                              <span className="text-sm font-medium text-red-500">Cancel</span>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Friend Requests */}
        {(activeTab === 'all' || activeTab === 'friends') && friendRequestsReceived.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-[#DBFFEB] border-0 rounded-2xl">
              <CardContent className="p-5">
                <p className="text-[10px] text-slate-600 uppercase tracking-[0.12em] font-medium mb-4" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                  Friend Requests
                </p>
                <div className="space-y-3">
                  {friendRequestsReceived.map((request, index) => {
                    const senderProfile = profiles.find(p => p.user_id === request.user_id);
                    return (
                      <motion.div
                        key={request.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 rounded-xl"
                        style={{ backgroundColor: colors[index % 3] }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-[#83F384] flex items-center justify-center flex-shrink-0">
                            {senderProfile?.avatar_url ? (
                              <img
                                src={senderProfile.avatar_url}
                                alt={senderProfile.full_name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-lg font-semibold text-[#0A1A10]">
                                {(senderProfile?.full_name || senderProfile?.username || '?').charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-800 truncate">
                              {senderProfile?.full_name || senderProfile?.username}
                            </p>
                            <p className="text-sm text-slate-600 truncate">
                              @{senderProfile?.username} wants to be your friend
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleAcceptFriendRequest(request)}
                              disabled={processingId === request.id}
                              className="bg-[#00A86B] hover:bg-[#0D9B76] text-white"
                            >
                              {processingId === request.id ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Accept
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeclineFriendRequest(request)}
                              disabled={processingId === request.id}
                              className="border-red-300 text-red-600 hover:bg-red-50 bg-white"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Decline
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Payment Confirmations Needed */}
        {(activeTab === 'all' || activeTab === 'payments') && paymentsToConfirm.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-[#DBFFEB] border-0 rounded-2xl">
              <CardContent className="p-5">
                <p className="text-[10px] text-slate-600 uppercase tracking-[0.12em] font-medium mb-4" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                  Payments Awaiting Your Confirmation
                </p>
                <div className="space-y-3">
                  {paymentsToConfirm.map((payment, index) => {
                    const methodInfo = getPaymentMethodInfo(payment.payment_method);
                    const MethodIcon = methodInfo.icon;

                    return (
                      <motion.div
                        key={payment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 rounded-xl"
                        style={{ backgroundColor: colors[index % 3] }}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#DBFFEB] flex items-center justify-center flex-shrink-0">
                              <ArrowDownLeft className="w-5 h-5 text-[#00A86B]" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">
                                ${payment.amount?.toFixed(2)} from @{getOtherPartyName(payment)}
                              </p>
                              <p className="text-xs text-slate-600">
                                via {methodInfo.label} · {format(new Date(payment.payment_date), 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setConfirmingDeny(payment)}
                              disabled={processingId === payment.id}
                              className="border-red-300 text-red-600 hover:bg-red-50 bg-white"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Deny
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleConfirmPayment(payment)}
                              disabled={processingId === payment.id}
                              className="bg-[#00A86B] hover:bg-[#0D9B76] text-white"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Confirm
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Payments Awaiting Confirmation from Others */}
        {(activeTab === 'all' || activeTab === 'payments') && paymentsAwaitingConfirmation.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-[#DBFFEB] border-0 rounded-2xl">
              <CardContent className="p-5">
                <p className="text-[10px] text-slate-600 uppercase tracking-[0.12em] font-medium mb-4" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                  Your Payments Awaiting Confirmation
                </p>
                <div className="space-y-3">
                  {paymentsAwaitingConfirmation.map((payment, index) => {
                    const methodInfo = getPaymentMethodInfo(payment.payment_method);

                    return (
                      <motion.div
                        key={payment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 rounded-xl"
                        style={{ backgroundColor: colors[index % 3] }}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#DBFFEB] flex items-center justify-center flex-shrink-0">
                              <ArrowUpRight className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">
                                ${payment.amount?.toFixed(2)} to @{getOtherPartyName(payment, true)}
                              </p>
                              <p className="text-xs text-slate-600">
                                via {methodInfo.label} · Waiting for confirmation
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="bg-[#DBFFEB] rounded-xl px-4 py-2 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              <span className="text-sm font-medium text-slate-600">Pending</span>
                            </div>
                            <button
                              onClick={() => handleConfirmPayment(payment)}
                              disabled={processingId === payment.id}
                              className="bg-[#DBFFEB] rounded-xl px-4 py-2 flex items-center gap-1.5 hover:bg-[#c8f5d8] transition-colors disabled:opacity-50"
                            >
                              <CheckCircle className="w-3.5 h-3.5 text-[#00A86B]" />
                              <span className="text-sm font-medium text-[#00A86B]">Confirm</span>
                            </button>
                            <button
                              onClick={() => setConfirmingCancel(payment)}
                              disabled={processingId === payment.id}
                              className="bg-[#DBFFEB] rounded-xl px-4 py-2 flex items-center gap-1.5 hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5 text-red-500" />
                              <span className="text-sm font-medium text-red-500">Cancel</span>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Term Change Requests */}
        {(activeTab === 'all' || activeTab === 'terms') && termChangeRequests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-[#DBFFEB] border-0 rounded-2xl">
              <CardContent className="p-5">
                <p className="text-[10px] text-slate-600 uppercase tracking-[0.12em] font-medium mb-4" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                  Term Change Requests
                </p>
                <div className="space-y-3">
                  {termChangeRequests.map((loan, index) => (
                    <motion.div
                      key={loan.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 rounded-xl"
                      style={{ backgroundColor: colors[index % 3] }}
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#DBFFEB] flex items-center justify-center flex-shrink-0">
                            <Edit3 className="w-5 h-5 text-amber-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-slate-800">
                              @{getLoanOtherParty(loan)} wants to modify loan terms
                            </p>
                            <p className="text-xs text-slate-600">
                              Loan: ${loan.amount?.toLocaleString()} · {loan.purpose || 'No purpose specified'}
                            </p>
                          </div>
                        </div>

                        {loan.contract_modification_notes && (
                          <div className="bg-[#EEFFF5]/50 rounded-lg p-3">
                            <p className="text-xs font-medium text-slate-600 mb-1">Changes:</p>
                            <p className="text-sm text-slate-800">{loan.contract_modification_notes}</p>
                          </div>
                        )}

                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectTermChange(loan)}
                            disabled={processingId === loan.id}
                            className="border-red-300 text-red-600 hover:bg-red-50 bg-white"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApproveTermChange(loan)}
                            disabled={processingId === loan.id}
                            className="bg-[#00A86B] hover:bg-[#0D9B76] text-white"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Info Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            Requests require action from both parties to take effect
          </p>
        </motion.div>
      </div>

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
    </div>
  );
}

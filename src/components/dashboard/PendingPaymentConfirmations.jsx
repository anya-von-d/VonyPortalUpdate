import React, { useState, useEffect } from "react";
import { Payment, Loan, PublicProfile } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Hourglass,
  AlertTriangle
} from "lucide-react";
import { format, addMonths } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { SkeletonShimmer } from "@/components/ui/animations";

const PAYMENT_METHOD_ICONS = {
  venmo: { icon: Smartphone, color: 'text-blue-500', label: 'Venmo' },
  zelle: { icon: Smartphone, color: 'text-purple-500', label: 'Zelle' },
  cashapp: { icon: DollarSign, color: 'text-green-500', label: 'Cash App' },
  paypal: { icon: CreditCard, color: 'text-blue-600', label: 'PayPal' },
  cash: { icon: Banknote, color: 'text-emerald-500', label: 'Cash' },
  bank: { icon: CreditCard, color: 'text-slate-500', label: 'Bank Transfer' },
  other: { icon: DollarSign, color: 'text-gray-500', label: 'Other' },
};

export default function PendingPaymentConfirmations({ userId, onUpdate }) {
  const [paymentsToConfirm, setPaymentsToConfirm] = useState([]);
  const [paymentsAwaitingConfirmation, setPaymentsAwaitingConfirmation] = useState([]);
  const [loans, setLoans] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [confirmingDeny, setConfirmingDeny] = useState(null); // For warning before deny
  const [confirmingCancel, setConfirmingCancel] = useState(null); // For warning before cancel

  useEffect(() => {
    loadPendingPayments();
  }, [userId]);

  const loadPendingPayments = async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const [allPayments, allLoans, allProfiles] = await Promise.all([
        Payment.filter({ status: 'pending_confirmation' }),
        Loan.list(),
        PublicProfile.list()
      ]);

      // Get user's loans
      const userLoans = allLoans.filter(
        loan => loan.lender_id === userId || loan.borrower_id === userId
      );
      const userLoanIds = userLoans.map(l => l.id);

      // Filter payments where the current user needs to confirm
      // You can't confirm your own payment — confirmation goes to the other party
      const toConfirm = allPayments.filter(payment => {
        if (!userLoanIds.includes(payment.loan_id)) return false;
        // Must not be the person who recorded it
        if (payment.recorded_by === userId) return false;
        // Must be on a loan the user is part of
        const loan = userLoans.find(l => l.id === payment.loan_id);
        if (!loan) return false;
        return true;
      });

      // Filter payments that the user recorded and are awaiting confirmation
      const awaitingConfirmation = allPayments.filter(payment => {
        if (!userLoanIds.includes(payment.loan_id)) return false;
        if (payment.recorded_by !== userId) return false;
        return true;
      });

      setPaymentsToConfirm(toConfirm);
      setPaymentsAwaitingConfirmation(awaitingConfirmation);
      setLoans(allLoans);
      setProfiles(allProfiles);
    } catch (error) {
      console.error("Error loading pending payments:", error);
    }
    setIsLoading(false);
  };

  const handleConfirm = async (payment) => {
    setProcessingId(payment.id);
    try {
      // Update payment status to completed
      // Only update status - other fields may not exist in the database
      await Payment.update(payment.id, {
        status: 'completed'
      });

      // Update the loan balance
      const loan = loans.find(l => l.id === payment.loan_id);
      if (loan) {
        const newAmountPaid = (loan.amount_paid || 0) + payment.amount;
        const newRemainingBalance = (loan.total_amount || 0) - newAmountPaid;

        const loanUpdate = {
          amount_paid: newAmountPaid,
        };

        if (newRemainingBalance <= 0.01) {
          loanUpdate.status = 'completed';
          loanUpdate.next_payment_date = null;
        } else {
          loanUpdate.next_payment_date = format(addMonths(new Date(), 1), 'yyyy-MM-dd');
        }

        await Loan.update(loan.id, loanUpdate);
      }

      // Remove from local state
      setPaymentsToConfirm(prev => prev.filter(p => p.id !== payment.id));

      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error confirming payment:", error);
    }
    setProcessingId(null);
  };

  const handleDenyClick = (payment) => {
    setConfirmingDeny(payment);
  };

  const handleDenyConfirm = async () => {
    if (!confirmingDeny) return;
    const payment = confirmingDeny;
    setProcessingId(payment.id);
    setConfirmingDeny(null);
    try {
      // Update payment status to denied
      // Only update status - other fields may not exist in the database
      await Payment.update(payment.id, {
        status: 'denied'
      });

      // Remove from local state
      setPaymentsToConfirm(prev => prev.filter(p => p.id !== payment.id));

      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error denying payment:", error);
    }
    setProcessingId(null);
  };

  const handleCancelClick = (payment) => {
    setConfirmingCancel(payment);
  };

  const handleCancelConfirm = async () => {
    if (!confirmingCancel) return;
    const payment = confirmingCancel;
    setProcessingId(payment.id);
    setConfirmingCancel(null);
    try {
      // Delete the payment
      await Payment.delete(payment.id);

      // Remove from local state
      setPaymentsAwaitingConfirmation(prev => prev.filter(p => p.id !== payment.id));

      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error cancelling payment:", error);
    }
    setProcessingId(null);
  };

  const getOtherPartyName = (payment, isRecordedByUser = false) => {
    const loan = loans.find(l => l.id === payment.loan_id);
    if (!loan) return 'Unknown';

    // If the user recorded this, get the other party's name
    // If the user didn't record this, get the recorder's name
    let otherUserId;
    if (isRecordedByUser) {
      // User recorded this payment, get the other party
      otherUserId = loan.lender_id === userId ? loan.borrower_id : loan.lender_id;
    } else {
      // User needs to confirm this payment, get who recorded it
      // If recorded_by is set, use it; otherwise infer from the loan
      otherUserId = payment.recorded_by || (loan.lender_id === userId ? loan.borrower_id : loan.lender_id);
    }
    const profile = profiles.find(p => p.user_id === otherUserId);
    return profile?.full_name || profile?.username || 'Unknown';
  };

  const getPaymentMethodLabel = (payment) => {
    // First try to get from payment_method field
    if (payment.payment_method) {
      const methodInfo = PAYMENT_METHOD_ICONS[payment.payment_method];
      if (methodInfo) return methodInfo.label;
    }
    // Fallback: try to extract from notes
    if (payment.notes) {
      for (const [key, info] of Object.entries(PAYMENT_METHOD_ICONS)) {
        if (payment.notes.toLowerCase().includes(info.label.toLowerCase())) {
          return info.label;
        }
      }
    }
    return 'Other';
  };

  const getPaymentMethodInfo = (method) => {
    return PAYMENT_METHOD_ICONS[method] || PAYMENT_METHOD_ICONS.other;
  };

  if (isLoading) {
    return (
      <Card className="bg-amber-50/50 border-amber-200/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <SkeletonShimmer className="w-10 h-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <SkeletonShimmer className="h-4 w-48" />
              <SkeletonShimmer className="h-3 w-32" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (paymentsToConfirm.length === 0 && paymentsAwaitingConfirmation.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Warning Dialog for Deny */}
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
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setConfirmingDeny(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleDenyConfirm}
                >
                  Deny Payment
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Warning Dialog for Cancel */}
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
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setConfirmingCancel(null)}
                >
                  Keep
                </Button>
                <Button
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={handleCancelConfirm}
                >
                  Cancel Payment
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payments needing user's confirmation */}
      {paymentsToConfirm.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="bg-amber-50 border-amber-200 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-amber-800">
                <Clock className="w-5 h-5" />
                Payments Awaiting Your Confirmation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AnimatePresence>
                {paymentsToConfirm.map((payment) => {
                  const methodInfo = getPaymentMethodInfo(payment.payment_method);
                  const MethodIcon = methodInfo.icon;
                  const loan = loans.find(l => l.id === payment.loan_id);
                  const isLender = loan?.lender_id === userId;
                  const methodLabel = getPaymentMethodLabel(payment);

                  return (
                    <motion.div
                      key={payment.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-white rounded-lg border border-amber-200 p-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-full bg-slate-100`}>
                            <MethodIcon className={`w-5 h-5 ${methodInfo.color}`} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">
                              ${payment.amount.toFixed(2)} via {methodLabel}
                            </p>
                            <p className="text-sm text-slate-600">
                              {isLender
                                ? `Recorded by Borrower: ${getOtherPartyName(payment)}`
                                : `Recorded by Lender: ${getOtherPartyName(payment)}`
                              }
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              Payment date: {format(new Date(payment.payment_date), 'MMM d, yyyy')}
                            </p>
                            {payment.notes && (
                              <p className="text-xs text-slate-500 mt-1 italic">
                                "{payment.notes}"
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 sm:flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDenyClick(payment)}
                            disabled={processingId === payment.id}
                            className="border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Deny
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleConfirm(payment)}
                            disabled={processingId === payment.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            {processingId === payment.id ? 'Confirming...' : 'Confirm'}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              <p className="text-xs text-amber-700 flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                Confirming a payment will update the loan balance. Only confirm if you've received/made this payment.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Payments user recorded that are awaiting confirmation */}
      {paymentsAwaitingConfirmation.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="bg-blue-50 border-blue-200 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Hourglass className="w-5 h-5" />
                Your Payments Awaiting Confirmation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AnimatePresence>
                {paymentsAwaitingConfirmation.map((payment) => {
                  const methodInfo = getPaymentMethodInfo(payment.payment_method);
                  const MethodIcon = methodInfo.icon;
                  const loan = loans.find(l => l.id === payment.loan_id);
                  const isLender = loan?.lender_id === userId;
                  const methodLabel = getPaymentMethodLabel(payment);

                  return (
                    <motion.div
                      key={payment.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-white rounded-lg border border-blue-200 p-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-full bg-slate-100`}>
                            <MethodIcon className={`w-5 h-5 ${methodInfo.color}`} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">
                              ${payment.amount.toFixed(2)} via {methodLabel}
                            </p>
                            <p className="text-sm text-slate-600">
                              Waiting for {getOtherPartyName(payment, true)} to confirm
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              Payment date: {format(new Date(payment.payment_date), 'MMM d, yyyy')}
                            </p>
                            {payment.notes && (
                              <p className="text-xs text-slate-500 mt-1 italic">
                                "{payment.notes}"
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 sm:flex-shrink-0">
                          <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancelClick(payment)}
                            disabled={processingId === payment.id}
                            className="border-slate-200 text-slate-600 hover:bg-slate-50"
                          >
                            {processingId === payment.id ? 'Cancelling...' : 'Cancel'}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              <p className="text-xs text-blue-700 flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                These payments will update the loan balance once the other party confirms.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

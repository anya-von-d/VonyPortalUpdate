import { useState, useEffect } from "react";
import { Payment, User, PublicProfile } from "@/entities/all";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DollarSign,
  AlertCircle,
  CreditCard,
  Banknote,
  Smartphone,
  Check,
  ArrowRight,
  ArrowLeft,
  Shield
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { toLocalDate } from "@/components/utils/dateUtils";
import { currentDateStringTZ } from "@/components/utils/timezone";
import { SuccessAnimation, TransactionId } from "@/components/ui/animations";

const PAYMENT_METHODS = [
  { id: 'venmo', label: 'Venmo', icon: Smartphone, color: 'text-blue-500', bgColor: 'bg-blue-500' },
  { id: 'zelle', label: 'Zelle', icon: Smartphone, color: 'text-purple-500', bgColor: 'bg-purple-500' },
  { id: 'cashapp', label: 'Cash App', icon: DollarSign, color: 'text-green-500', bgColor: 'bg-green-500' },
  { id: 'paypal', label: 'PayPal', icon: CreditCard, color: 'text-blue-600', bgColor: 'bg-blue-600' },
  { id: 'cash', label: 'Cash', icon: Banknote, color: 'text-emerald-500', bgColor: 'bg-emerald-500' },
  { id: 'other', label: 'Other', icon: DollarSign, color: 'text-gray-500', bgColor: 'bg-gray-500' },
];

// Generate a unique transaction ID
const generateTransactionId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `VNY-${timestamp}-${random}`.toUpperCase();
};

export default function RecordPaymentModal({ loan: initialLoan, candidateLoans = [], onClose, onPaymentComplete, isLender: isLenderProp = false, currentUserId = null }) {
  const [activeLoan, setActiveLoan] = useState(initialLoan);
  const loan = activeLoan;
  const [currentUserIdState, setCurrentUserIdState] = useState(currentUserId);
  const [amount, setAmount] = useState(initialLoan._prefillAmount || initialLoan.payment_amount?.toFixed(2) || "");
  const [paymentMethod, setPaymentMethod] = useState(initialLoan._prefillMethod || "");
  const [paymentDate, setPaymentDate] = useState(() => currentDateStringTZ());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [recipientInfo, setRecipientInfo] = useState(null);
  const [allProfiles, setAllProfiles] = useState([]);

  // Dynamically determine isLender based on active loan and current user
  const [resolvedUserId, setResolvedUserId] = useState(null);
  const isLender = resolvedUserId ? loan.lender_id === resolvedUserId : isLenderProp;

  // Fetch current user ID for dynamic isLender detection
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const me = await User.me();
        setResolvedUserId(me?.id);
        setCurrentUserIdState(me?.id);
      } catch {
        // Fall back to prop
      }
    };
    fetchUser();
  }, []);

  // Multi-step flow: 0 = loan selection (if candidates), 1 = details, 2 = confirm, 3 = success
  const hasMultipleCandidates = candidateLoans.length > 1;
  const [step, setStep] = useState(hasMultipleCandidates ? 0 : 1);
  const [transactionId, setTransactionId] = useState("");

  const remainingBalance = (loan.total_amount || 0) - (loan.amount_paid || 0);
  const suggestedPayment = Math.min(loan.payment_amount || 0, remainingBalance);

  // Inline validation
  const [amountError, setAmountError] = useState("");
  const [methodError, setMethodError] = useState("");

  // Validate amount in real-time
  useEffect(() => {
    const paymentAmount = parseFloat(amount);
    if (amount && paymentAmount <= 0) {
      setAmountError("Amount must be greater than $0");
    } else if (amount && paymentAmount > remainingBalance + 0.01) {
      setAmountError(`Cannot exceed remaining balance of $${remainingBalance.toFixed(2)}`);
    } else {
      setAmountError("");
    }
  }, [amount, remainingBalance]);

  // Fetch recipient's profile
  useEffect(() => {
    const fetchRecipientInfo = async () => {
      try {
        const recipientId = isLender ? loan.borrower_id : loan.lender_id;
        const profiles = await PublicProfile.list();
        setAllProfiles(profiles || []);
        const recipientProfile = profiles.find(p => p.user_id === recipientId);
        setRecipientInfo(recipientProfile);
      } catch (error) {
        console.error("Error fetching recipient info:", error);
      }
    };

    fetchRecipientInfo();
  }, [loan, isLender]);

  // Proceed to confirmation step
  const handleProceedToConfirm = () => {
    setError("");
    setMethodError("");

    const paymentAmount = parseFloat(amount);

    if (paymentAmount <= 0) {
      setAmountError("Please enter a valid amount");
      return;
    }

    if (paymentAmount > remainingBalance + 0.01) {
      setAmountError(`Payment amount cannot exceed remaining balance of $${remainingBalance.toFixed(2)}`);
      return;
    }

    if (!paymentMethod) {
      setMethodError("Please select a payment method");
      return;
    }

    setStep(2);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setError("");

    const paymentAmount = parseFloat(amount);

    setIsProcessing(true);

    try {
      const recordedById = resolvedUserId || currentUserIdState;

      const txnId = generateTransactionId();
      setTransactionId(txnId);

      const methodLabel = PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label || paymentMethod;
      await Payment.create({
        loan_id: loan.id,
        amount: paymentAmount,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        recorded_by: recordedById,
        status: 'pending_confirmation',
        notes: `${methodLabel} payment of $${paymentAmount.toFixed(2)} via ${methodLabel} [Ref: ${txnId}]`
      });

      setStep(3);
      setIsSuccess(true);
      setTimeout(() => {
        onPaymentComplete();
      }, 3000);
    } catch (error) {
      console.error("Error recording payment:", error);
      setError(error.message || "Failed to record payment");
      setStep(1);
    }
    setIsProcessing(false);
  };

  const otherPersonUsername = recipientInfo?.username || 'user';
  const loanDirection = isLender ? 'from' : 'to';
  const loanPurpose = loan.purpose || 'Personal loan';
  const loanAmount = loan.total_amount || loan.amount || 0;
  const nextPaymentAmount = loan.payment_amount || 0;
  const nextPaymentDate = loan.next_payment_date ? format(toLocalDate(loan.next_payment_date), 'MMM d, yyyy') : 'N/A';

  // Step 0: Loan Selection (when multiple candidates)
  if (step === 0 && hasMultipleCandidates) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-0 border-0 bg-[#DBEEE3] rounded-2xl">
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-full bg-[#DBFFEB] flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-[#00A86B]" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Select Loan</h3>
                <p className="text-xs text-slate-500">Multiple loans match — which one is this payment for?</p>
              </div>
            </div>

            <div className="space-y-2">
              {candidateLoans.map((cl) => {
                const clIsLender = resolvedUserId ? cl.lender_id === resolvedUserId : isLenderProp;
                const otherUserId = clIsLender ? cl.borrower_id : cl.lender_id;
                const otherProfile = allProfiles.find(p => p.user_id === otherUserId);
                const otherUsername = otherProfile?.username || 'user';
                const clDirection = clIsLender ? 'from' : 'to';
                const clAmount = cl.total_amount || cl.amount || 0;

                return (
                  <motion.button
                    key={cl.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => {
                      setActiveLoan({ ...cl, _prefillAmount: initialLoan._prefillAmount, _prefillMethod: initialLoan._prefillMethod });
                      setStep(1);
                    }}
                    className="w-full text-left bg-[#DBFFEB] rounded-xl p-4 hover:bg-[#AAFFA3] transition-colors"
                  >
                    <p className="text-sm font-semibold text-slate-800">
                      ${clAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} loan {clDirection} @{otherUsername}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {cl.purpose || 'Personal loan'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Remaining: ${((cl.total_amount || 0) - (cl.amount_paid || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </motion.button>
                );
              })}
            </div>

            <Button
              onClick={onClose}
              className="w-full bg-white hover:bg-white/80 text-slate-700 border-0 rounded-xl"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Step 3: Success
  if (step === 3 && isSuccess) {
    return (
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md p-0 border-0 bg-[#DBEEE3] rounded-2xl overflow-hidden">
          <div className="relative p-6">
            <SuccessAnimation
              show={true}
              title="Payment Recorded!"
              subtitle={`Sent to @${otherPersonUsername} for confirmation`}
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col items-center gap-4 mt-4"
            >
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-800">
                  ${parseFloat(amount).toFixed(2)}
                </p>
                <p className="text-sm text-slate-500">
                  via {PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label}
                </p>
              </div>
              {transactionId && (
                <TransactionId id={transactionId} />
              )}
              <p className="text-xs text-slate-400 text-center max-w-xs">
                The loan balance will update once @{otherPersonUsername} confirms this payment.
              </p>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Step 2: Confirmation
  if (step === 2) {
    const methodInfo = PAYMENT_METHODS.find(m => m.id === paymentMethod);
    const MethodIcon = methodInfo?.icon || DollarSign;

    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md p-0 border-0 bg-[#DBEEE3] rounded-2xl overflow-hidden">
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-full bg-[#DBFFEB] flex items-center justify-center">
                <Shield className="w-4 h-4 text-[#00A86B]" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Confirm Payment</h3>
                <p className="text-xs text-slate-500">Review and confirm the details</p>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Payment Summary Card */}
              <div className="bg-[#DBFFEB] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">Amount</span>
                  <span className="text-2xl font-bold text-slate-800">${parseFloat(amount).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">Method</span>
                  <div className="flex items-center gap-2">
                    <MethodIcon className={`w-4 h-4 ${methodInfo?.color}`} />
                    <span className="font-medium text-slate-800">{methodInfo?.label}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">Date</span>
                  <span className="font-medium text-slate-800">
                    {format(toLocalDate(paymentDate), 'MMM d, yyyy')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">{isLender ? 'From' : 'To'}</span>
                  <span className="font-medium text-slate-800">@{otherPersonUsername}</span>
                </div>
                <div className="pt-3 border-t border-white/40">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">For</span>
                  <p className="text-sm text-slate-800 mt-1">{loanPurpose}</p>
                </div>
              </div>

              {/* Warning Notice */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-[#DBFFEB] rounded-xl p-3 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600">
                  @{otherPersonUsername} will need to confirm this payment before it impacts the loan balance.
                </p>
              </motion.div>

              {error && (
                <div className="bg-red-50 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-1">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-xl border-0 bg-white hover:bg-white/80"
                  disabled={isProcessing}
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
                <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={handleRecordPayment}
                    disabled={isProcessing}
                    className="w-full bg-[#00A86B] hover:bg-[#0D9B76] text-white rounded-xl"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Recording...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Confirm Payment
                      </>
                    )}
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Step 1: Enter Details
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-0 border-0 bg-[#DBEEE3] rounded-2xl">
        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-[#DBFFEB] flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-[#00A86B]" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Record Payment</h3>
              <p className="text-xs text-slate-500">
                {isLender ? "Record a payment received from the borrower" : "Record a payment you made to the lender"}
              </p>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 py-1">
            <div className="flex items-center gap-1">
              <div className="w-7 h-7 rounded-full bg-[#00A86B] text-white flex items-center justify-center text-xs font-medium">1</div>
              <span className="text-xs text-slate-600 hidden sm:inline">Details</span>
            </div>
            <div className="w-8 h-0.5 bg-white/60" />
            <div className="flex items-center gap-1">
              <div className="w-7 h-7 rounded-full bg-white/60 text-slate-400 flex items-center justify-center text-xs font-medium">2</div>
              <span className="text-xs text-slate-400 hidden sm:inline">Confirm</span>
            </div>
            <div className="w-8 h-0.5 bg-white/60" />
            <div className="flex items-center gap-1">
              <div className="w-7 h-7 rounded-full bg-white/60 text-slate-400 flex items-center justify-center text-xs font-medium">3</div>
              <span className="text-xs text-slate-400 hidden sm:inline">Done</span>
            </div>
          </div>

          {/* Loan Information */}
          <div className="bg-[#DBFFEB] rounded-2xl p-4 space-y-1.5">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-2">Loan Information</p>
            <p className="text-sm font-semibold text-slate-800">
              ${loanAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} loan {loanDirection} @{otherPersonUsername}
            </p>
            <p className="text-xs text-slate-600">
              for {loanPurpose}
            </p>
            <p className="text-xs text-slate-600 pt-1.5 border-t border-white/40 mt-1.5">
              Next payment of <span className="font-semibold text-slate-800">${nextPaymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> due {nextPaymentDate}
            </p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleProceedToConfirm(); }} className="space-y-4">
            {error && (
              <div className="bg-red-50 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            {/* Payment Method */}
            <div className="space-y-2">
              <p className={`text-[10px] font-mono uppercase tracking-[0.2em] ${methodError ? 'text-red-600' : 'text-slate-500'}`}>Payment Method</p>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon;
                  return (
                    <motion.button
                      key={method.id}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setPaymentMethod(method.id);
                        setMethodError("");
                      }}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                        paymentMethod === method.id
                          ? 'bg-[#AAFFA3] shadow-sm'
                          : methodError
                          ? 'bg-red-50 hover:bg-red-100'
                          : 'bg-white hover:bg-[#DBFFEB]'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${method.color}`} />
                      <span className="text-xs font-medium text-slate-700">{method.label}</span>
                    </motion.button>
                  );
                })}
              </div>
              {methodError && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-600 flex items-center gap-1"
                >
                  <AlertCircle className="w-3 h-3" />
                  {methodError}
                </motion.p>
              )}
            </div>

            {/* Payment Amount - inline */}
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <p className={`text-[10px] font-mono uppercase tracking-[0.2em] flex-shrink-0 ${amountError ? 'text-red-600' : 'text-slate-500'}`}>Payment Amount</p>
                <div className="relative flex-1">
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={remainingBalance}
                    placeholder={suggestedPayment.toFixed(2)}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className={`rounded-xl bg-white border-0 transition-all ${
                      amountError
                        ? 'ring-1 ring-red-300'
                        : amount && !amountError
                        ? 'ring-1 ring-[#00A86B]/30'
                        : ''
                    }`}
                  />
                  {amount && !amountError && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <Check className="w-5 h-5 text-[#00A86B]" />
                    </motion.div>
                  )}
                </div>
              </div>
              {amountError && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-600 flex items-center gap-1 pl-0"
                >
                  <AlertCircle className="w-3 h-3" />
                  {amountError}
                </motion.p>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setAmount(suggestedPayment.toFixed(2))}
                  className="text-xs bg-white hover:bg-[#DBFFEB] text-slate-700 border-0 rounded-lg"
                >
                  Suggested: ${suggestedPayment.toFixed(2)}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setAmount(remainingBalance.toFixed(2))}
                  className="text-xs bg-white hover:bg-[#DBFFEB] text-slate-700 border-0 rounded-lg"
                >
                  Pay Full: ${remainingBalance.toFixed(2)}
                </Button>
              </div>
            </div>

            {/* Payment Date - inline */}
            <div className="flex items-center gap-3">
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 flex-shrink-0">Date</p>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                max={currentDateStringTZ()}
                required
                className="rounded-xl bg-white border-0 flex-1"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                onClick={onClose}
                className="flex-1 bg-white hover:bg-white/80 text-slate-700 border-0 rounded-xl"
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="submit"
                  disabled={isProcessing || !amount || !paymentMethod || !!amountError}
                  className="w-full bg-[#00A86B] hover:bg-[#0D9B76] text-white rounded-xl transition-all"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </motion.div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

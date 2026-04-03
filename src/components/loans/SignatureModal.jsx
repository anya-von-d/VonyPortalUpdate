import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, AlertCircle, CheckCircle, PenLine } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatMoney } from "@/components/utils/formatMoney";
import { AnimatedCheckmark, SuccessAnimation, ConfettiBurst } from "@/components/ui/animations";

// Trust checklist items for Lender
const LENDER_CHECKLIST = [
  { id: 1, text: "I confirm the terms above are correct, including the loan amount, interest rate, and payment schedule" },
  { id: 2, text: "I agree to lend the Borrower the amount shown above" },
  { id: 3, text: "I am comfortable lending to the Borrower, and understand that lending money can involve some risk" },
];

// Trust checklist items for Borrower (fallback)
const BORROWER_CHECKLIST = [
  { id: 1, text: "I understand the loan amount and interest rate" },
  { id: 2, text: "I agree to the repayment schedule" },
  { id: 3, text: "I have reviewed all terms carefully" },
];

export default function SignatureModal({ isOpen, onClose, onSign, loanDetails, userFullName, signingAs }) {
  const [signature, setSignature] = useState("");
  const [error, setError] = useState("");
  const [isSigning, setIsSigning] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [checkedItems, setCheckedItems] = useState([]);
  const [showChecklistError, setShowChecklistError] = useState(false);

  // Use lender checklist for lenders, borrower checklist for borrowers
  const AGREEMENT_CHECKLIST = signingAs === 'Lender' ? LENDER_CHECKLIST : BORROWER_CHECKLIST;

  const handleCheckItem = (id) => {
    setCheckedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
    setShowChecklistError(false);
  };

  const allItemsChecked = AGREEMENT_CHECKLIST.every(item => checkedItems.includes(item.id));

  const handleSign = async () => {
    if (!allItemsChecked) {
      setShowChecklistError(true);
      setError("Please confirm all items in the checklist");
      return;
    }
    if (!signature.trim()) {
      setError("Please type your full name to sign");
      return;
    }
    if (signature.trim().toLowerCase() !== userFullName.toLowerCase()) {
      setError("Signature must match your full name");
      return;
    }

    setIsSigning(true);
    try {
      await onSign(signature.trim());
      setIsSuccess(true);
      setTimeout(() => {
        setSignature("");
        setError("");
        setCheckedItems([]);
        setIsSuccess(false);
      }, 2500);
    } catch (error) {
      console.error("Error signing:", error);
      setError("Failed to sign agreement. Please try again.");
    } finally {
      setIsSigning(false);
    }
  };

  const isSignatureValid = signature.trim().toLowerCase() === userFullName?.toLowerCase();

  // Success state
  if (isSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="max-w-lg p-0 gap-0 border-0 bg-white rounded-2xl overflow-hidden">
          <div className="relative p-6">
            <SuccessAnimation
              show={true}
              title="Agreement Signed!"
              subtitle={`You have successfully signed as ${signingAs}`}
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0 border-0 bg-white rounded-2xl">
        <div className="p-6 space-y-5">
          {/* Header — promissory note style */}
          <div className="text-center pb-3">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400 mb-1">Agreement</p>
            <h2 className="text-2xl font-bold text-slate-800">Loan Agreement</h2>
            <p className="text-xs text-slate-400 mt-1">
              Review the terms and sign to {signingAs === 'Lender' ? 'create this loan offer' : 'accept this loan'}
            </p>
          </div>

          {/* Principal Amount */}
          <div className="bg-[#2563EB]/10 rounded-2xl p-5 text-center">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-1">Principal Amount</p>
            <p className="text-3xl font-bold text-slate-800">{formatMoney(loanDetails.amount)}</p>
          </div>

          {/* Loan paragraph */}
          <div className="glass-card rounded-2xl p-4">
            <p className="text-sm text-slate-700 leading-relaxed">
              <span className="font-semibold">{loanDetails.lenderName || 'Lender'}</span> agrees to lend <span className="font-semibold">{loanDetails.borrowerName || 'Borrower'}</span> <span className="font-semibold">{formatMoney(loanDetails.amount)}</span>{loanDetails.purpose ? <> for <span className="font-semibold">{loanDetails.purpose}</span></> : ''}, with <span className="font-semibold">{loanDetails.interest_rate}%</span> interest. <span className="font-semibold">{loanDetails.borrowerName || 'Borrower'}</span> agrees to pay back <span className="font-semibold">{formatMoney(loanDetails.total_amount)}</span> in <span className="font-semibold">{loanDetails.payment_frequency}</span> payments of <span className="font-semibold">{formatMoney(loanDetails.payment_amount)}</span> over <span className="font-semibold">{loanDetails.repayment_period} {loanDetails.repayment_unit || 'months'}</span>.
            </p>
          </div>

          {/* Terms of Repayment */}
          <div className="glass-card rounded-2xl p-4 space-y-3">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">Terms of Repayment</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-[#82F0B9]/8 rounded-xl p-3">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-0.5">Total Due</p>
                <p className="font-bold text-slate-800">{formatMoney(loanDetails.total_amount)}</p>
              </div>
              <div className="bg-[#82F0B9]/12 rounded-xl p-3">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-0.5">Interest</p>
                <p className="font-bold text-slate-800">{loanDetails.interest_rate}%</p>
              </div>
              <div className="bg-[#2563EB]/8 rounded-xl p-3">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-0.5">Payment</p>
                <p className="font-bold text-slate-800">{formatMoney(loanDetails.payment_amount)}</p>
                <p className="text-xs text-slate-500 capitalize">{loanDetails.payment_frequency}</p>
              </div>
              <div className="bg-[#82F0B9]/8 rounded-xl p-3">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-0.5">Term</p>
                <p className="font-bold text-slate-800">{loanDetails.repayment_period} {loanDetails.repayment_unit || 'months'}</p>
              </div>
            </div>
          </div>

          {/* What You're Agreeing To - Checklist */}
          <div
            className={`glass-card rounded-2xl p-4 space-y-3 transition-colors ${
              showChecklistError && !allItemsChecked
                ? 'ring-2 ring-red-400'
                : ''
            }`}
          >
            <p className={`text-[10px] font-mono uppercase tracking-[0.2em] flex items-center gap-2 ${
              showChecklistError && !allItemsChecked ? 'text-red-600' : 'text-slate-500'
            }`}>
              <CheckCircle className={`w-3.5 h-3.5 ${showChecklistError && !allItemsChecked ? 'text-red-500' : 'text-[#82F0B9]'}`} />
              What you're agreeing to
            </p>
            <div className="space-y-2">
              {AGREEMENT_CHECKLIST.map((item, index) => (
                <label
                  key={item.id}
                  className="flex items-start gap-3 p-2 rounded-xl hover:bg-[#82F0B9]/5 cursor-pointer transition-colors group"
                >
                  <div
                    onClick={() => handleCheckItem(item.id)}
                    className={`w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer flex-shrink-0 mt-0.5 ${
                      checkedItems.includes(item.id)
                        ? 'bg-[#82F0B9]'
                        : showChecklistError && !checkedItems.includes(item.id)
                        ? 'bg-red-100'
                        : 'bg-[#82F0B9]/10 group-hover:bg-[#82F0B9]/20'
                    }`}
                  >
                    <AnimatePresence>
                      {checkedItems.includes(item.id) && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                        >
                          <CheckCircle className="w-3 h-3 text-white" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <span className={`text-sm leading-snug ${
                    checkedItems.includes(item.id)
                      ? 'text-slate-800'
                      : showChecklistError && !checkedItems.includes(item.id)
                      ? 'text-red-600'
                      : 'text-slate-600'
                  }`}>
                    {item.text}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* By signing below */}
          <div className="glass-card rounded-2xl p-4">
            <p className="text-sm text-slate-700 leading-relaxed">
              By signing below, you acknowledge and agree to the loan terms stated above as the{' '}
              <span className="font-semibold text-[#82F0B9]">{signingAs}</span>.
              You commit to fulfilling all obligations outlined in this agreement.
            </p>
          </div>

          {/* Signature Section */}
          <div className="space-y-3">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
              <PenLine className="w-3.5 h-3.5 text-[#82F0B9]" />
              Type your full name to sign
            </p>
            <div className="relative">
              <Input
                id="signature"
                value={signature}
                onChange={(e) => {
                  setSignature(e.target.value);
                  setError("");
                }}
                placeholder={userFullName}
                className={`text-lg h-14 font-serif italic rounded-xl bg-white transition-all ${
                  signature && isSignatureValid
                    ? 'ring-2 ring-[#82F0B9]/40 bg-[#82F0B9]/5'
                    : signature && !isSignatureValid
                    ? 'ring-1 ring-amber-300'
                    : ''
                }`}
              />
              {signature && isSignatureValid && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <CheckCircle className="w-6 h-6 text-[#82F0B9]" />
                </motion.div>
              )}
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <span className="text-slate-400">Please type:</span>
              <span className="font-medium text-slate-700">{userFullName}</span>
            </p>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-2 rounded-xl"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-1">
            <Button
              onClick={onClose}
              className="flex-1 h-12 text-base bg-slate-100 hover:bg-slate-200 text-slate-700 border-0 rounded-xl"
              disabled={isSigning}
            >
              Cancel
            </Button>
            <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleSign}
                className="w-full h-12 text-base bg-[#82F0B9] hover:bg-[#5a7be6] text-white rounded-xl transition-all"
                disabled={isSigning || !isSignatureValid || !allItemsChecked}
              >
                {isSigning ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Signing...
                  </>
                ) : (
                  <>
                    <PenLine className="w-5 h-5 mr-2" />
                    Sign Agreement
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

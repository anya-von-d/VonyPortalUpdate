import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, X, PenLine } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatMoney } from "@/components/utils/formatMoney";
import { SuccessAnimation } from "@/components/ui/animations";

// Trust checklist items for borrower
const BORROWER_CHECKLIST = [
  { id: 1, text: "I confirm the terms above are correct, including the loan amount, interest rate, and payment schedule" },
  { id: 2, text: "I understand that, depending on the terms outlined above, this loan may include interest" },
  { id: 3, text: "I agree to repay the amount shown above to the Lender according to the terms above" },
];

export default function BorrowerSignatureModal({
  isOpen,
  onClose,
  onSign,
  onDecline,
  loanDetails,
  lenderName,
  borrowerFullName
}) {
  const [error, setError] = useState("");
  const [isSigning, setIsSigning] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [checkedItems, setCheckedItems] = useState([]);
  const [showChecklistError, setShowChecklistError] = useState(false);

  // Canvas signature state
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureSaved, setSignatureSaved] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        if (rect.width > 0) { canvas.width = rect.width; canvas.height = 140; }
      }
    }, 80);
    return () => clearTimeout(t);
  }, [isOpen]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getPos(e, canvas);
    ctx.beginPath(); ctx.moveTo(x, y);
    setIsDrawing(true); setSignatureSaved(false);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#1A1918'; ctx.lineWidth = 2;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false); setSignatureSaved(false);
  };

  const handleCheckItem = (id) => {
    setCheckedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
    setShowChecklistError(false);
  };

  const allItemsChecked = BORROWER_CHECKLIST.every(item => checkedItems.includes(item.id));

  const handleSign = async () => {
    if (!allItemsChecked) {
      setShowChecklistError(true);
      setError("Please confirm all items in the checklist");
      return;
    }
    if (!signatureSaved) {
      setError("Please draw and save your signature above");
      return;
    }
    if (!agreedToTerms) {
      setError("Please confirm that you agree to the terms");
      return;
    }

    setIsSigning(true);
    try {
      await onSign(borrowerFullName || "Signed");
      setIsSuccess(true);
      setTimeout(() => {
        clearCanvas();
        setError("");
        setCheckedItems([]);
        setAgreedToTerms(false);
        setSignatureSaved(false);
        setIsSuccess(false);
      }, 2500);
    } catch (error) {
      console.error("Error signing:", error);
      setError("Failed to sign agreement. Please try again.");
    } finally {
      setIsSigning(false);
    }
  };

  const handleDecline = async () => {
    setIsDeclining(true);
    try {
      await onDecline();
    } catch (error) {
      console.error("Error declining:", error);
      setError("Failed to decline offer. Please try again.");
    } finally {
      setIsDeclining(false);
    }
  };

  // Success state
  if (isSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="max-w-lg p-0 gap-0 border-0 bg-white rounded-2xl overflow-hidden">
          <div className="relative p-6">
            <SuccessAnimation
              show={true}
              title="Loan Accepted!"
              subtitle={`You have accepted the loan from ${lenderName}`}
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
            <p className="text-xs text-slate-400 mt-1">Review the loan terms carefully before signing</p>
          </div>

          {/* Principal Amount */}
          <div className="bg-[#2563EB]/10 rounded-2xl p-5 text-center">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-1">Principal Amount</p>
            <p className="text-3xl font-bold text-slate-800">{formatMoney(loanDetails.amount)}</p>
          </div>

          {/* Loan paragraph */}
          <div className="glass-card rounded-2xl p-4">
            <p className="text-sm text-slate-700 leading-relaxed">
              <span className="font-semibold">{lenderName}</span> agrees to lend <span className="font-semibold">{borrowerFullName}</span> <span className="font-semibold">{formatMoney(loanDetails.amount)}</span>{loanDetails.purpose ? <> for <span className="font-semibold">{loanDetails.purpose}</span></> : ''}, with <span className="font-semibold">{loanDetails.interest_rate}%</span> interest. <span className="font-semibold">{borrowerFullName}</span> agrees to pay back <span className="font-semibold">{formatMoney(loanDetails.total_amount)}</span> in <span className="font-semibold">{loanDetails.payment_frequency}</span> payments of <span className="font-semibold">{formatMoney(loanDetails.payment_amount)}</span> over <span className="font-semibold">{loanDetails.repayment_period} {loanDetails.repayment_unit || 'months'}</span>.
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
                <p className="text-xs text-slate-500 capitalize">{loanDetails.payment_frequency || 'Monthly'}</p>
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
              {BORROWER_CHECKLIST.map((item) => (
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
              <span className="font-semibold text-[#82F0B9]">Borrower</span>.
              You commit to fulfilling all obligations outlined in this agreement.
            </p>
          </div>

          {/* Signature Section */}
          <div className="space-y-3">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
              <PenLine className="w-3.5 h-3.5 text-[#82F0B9]" />
              Draw your signature
            </p>

            {/* Canvas drawing area */}
            <div style={{ position: 'relative', border: '1.5px solid #E2E8F0', borderRadius: 12, background: '#F8FAFC', overflow: 'hidden' }}>
              <canvas
                ref={canvasRef}
                width={500}
                height={140}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                style={{ display: 'block', width: '100%', height: 140, cursor: 'crosshair', touchAction: 'none' }}
              />
              {!hasSignature && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <span style={{ fontFamily: 'serif', fontStyle: 'italic', fontSize: 20, color: '#CBD5E1' }}>Sign here…</span>
                </div>
              )}
              {signatureSaved && (
                <div style={{ position: 'absolute', top: 8, right: 8, background: '#82F0B9', borderRadius: 20, padding: '2px 10px', fontSize: 10, fontWeight: 700, color: '#fff', letterSpacing: '0.04em' }}>
                  ✓ Saved
                </div>
              )}
            </div>

            {/* Canvas controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={clearCanvas}
                style={{ padding: '6px 14px', fontSize: 12, fontWeight: 500, color: '#64748B', background: '#F1F5F9', border: 'none', borderRadius: 8, cursor: 'pointer' }}
              >
                Clear
              </button>
              <button
                onClick={() => { if (hasSignature) { setSignatureSaved(true); setError(''); } }}
                disabled={!hasSignature}
                style={{
                  padding: '6px 18px', fontSize: 12, fontWeight: 600,
                  color: hasSignature ? '#fff' : '#94A3B8',
                  background: hasSignature ? '#82F0B9' : '#E2E8F0',
                  border: 'none', borderRadius: 8,
                  cursor: hasSignature ? 'pointer' : 'default',
                  transition: 'background 0.15s',
                }}
              >
                Save signature
              </button>
            </div>

            {/* Disclaimer */}
            <p style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.5 }}>
              By drawing your signature, you confirm your identity and intent to sign this document electronically in accordance with applicable e-signature laws.
            </p>

            {/* Toggle — agree to terms */}
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: agreedToTerms ? 'rgba(130,240,185,0.08)' : '#F8FAFC', borderRadius: 10, border: `1px solid ${agreedToTerms ? 'rgba(130,240,185,0.35)' : '#E2E8F0'}`, cursor: 'pointer' }}
              onClick={() => { setAgreedToTerms(v => !v); setError(''); }}
            >
              <div style={{ width: 44, height: 24, borderRadius: 12, background: agreedToTerms ? '#82F0B9' : '#E2E8F0', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', top: 2, left: agreedToTerms ? 22 : 2, width: 20, height: 20, borderRadius: 10, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
              </div>
              <span style={{ fontSize: 12, color: '#475569', lineHeight: 1.4 }}>
                I confirm that I agree to all the terms and conditions of this agreement
              </span>
            </div>

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
              variant="outline"
              onClick={handleDecline}
              className="flex-1 h-12 text-base border-red-200 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              disabled={isSigning || isDeclining}
            >
              <X className="w-4 h-4 mr-1" />
              {isDeclining ? 'Declining...' : 'Decline Offer'}
            </Button>
            <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleSign}
                className="w-full h-12 text-base bg-[#82F0B9] hover:bg-[#5a7be6] text-white rounded-xl transition-all"
                disabled={isSigning || isDeclining || !signatureSaved || !agreedToTerms || !allItemsChecked}
              >
                {isSigning ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Signing...
                  </>
                ) : (
                  <>
                    <PenLine className="w-5 h-5 mr-2" />
                    Sign the contract
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

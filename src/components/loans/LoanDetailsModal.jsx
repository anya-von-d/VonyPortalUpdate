import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { PublicProfile, LoanAgreement } from "@/entities/all";
import { Calendar, Percent, Clock, UserIcon, Pencil } from "lucide-react";
import { format } from "date-fns";
import { toLocalDate } from "@/components/utils/dateUtils";
import SignatureModal from "./SignatureModal";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  active: "bg-green-100 text-green-800 border-green-200",
  completed: "bg-blue-100 text-blue-800 border-blue-200",
  defaulted: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-gray-100 text-gray-800 border-gray-200",
  declined: "bg-gray-100 text-gray-800 border-gray-200"
};

export default function LoanDetailsModal({ loan, type, isOpen, onClose, user, onCancel }) {
  const [otherUser, setOtherUser] = useState(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [agreement, setAgreement] = useState(null);
  const modalContentRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    
    const fetchData = async () => {
      try {
        const otherUserId = type === 'borrowed' ? loan.lender_id : loan.borrower_id;
        const [profiles, agreements] = await Promise.all([
          PublicProfile.list(),
          LoanAgreement.list()
        ]);
        const profile = profiles.find(p => p.user_id === otherUserId);
        setOtherUser(profile);
        
        const loanAgreement = agreements.find(a => a.loan_id === loan.id);
        setAgreement(loanAgreement);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [isOpen, loan.id, type, loan.lender_id, loan.borrower_id]);

  if (!loan) return null;

  const progressPercentage = loan.total_amount > 0 
    ? ((loan.amount_paid || 0) / loan.total_amount) * 100 
    : 0;

  const handleSign = async (signatureName, screenshotUrl) => {
    try {
      const isLender = loan.lender_id === user?.id;
      const updateData = isLender 
        ? {
            lender_name: signatureName,
            lender_signed_date: new Date().toISOString(),
            lender_screenshot_url: screenshotUrl
          }
        : {
            borrower_name: signatureName,
            borrower_signed_date: new Date().toISOString(),
            borrower_screenshot_url: screenshotUrl
          };

      if (agreement) {
        await LoanAgreement.update(agreement.id, updateData);
      }

      setShowSignModal(false);
      onClose();
    } catch (error) {
      console.error("Error saving signature:", error);
    }
  };

  const needsSignature = agreement && (
    (type === 'lent' && !agreement.lender_signed_date) ||
    (type === 'borrowed' && !agreement.borrower_signed_date)
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <div ref={modalContentRef}>
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Loan Details</span>
                <DialogClose />
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
          {/* User Info */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <UserIcon className="w-5 h-5 text-slate-600" />
              <div>
                <p className="text-sm text-slate-600">
                  {type === 'borrowed' ? 'Lender' : 'Borrower'}
                </p>
                <p className="font-semibold text-slate-900">
                  {otherUser?.full_name || 'Loading...'} (@{otherUser?.username})
                </p>
              </div>
            </div>
          </div>

          {/* Loan Amount & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-sm text-slate-600 mb-1">Loan Amount</p>
              <p className="text-2xl font-bold text-slate-900">
                ${loan.amount?.toLocaleString()}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-sm text-slate-600 mb-1">Status</p>
              <Badge className={`${statusColors[loan.status]} border font-medium`}>
                {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
              </Badge>
            </div>
          </div>

          {/* Loan Terms */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Percent className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-slate-600">Interest Rate</p>
                <p className="font-semibold text-slate-900">{loan.interest_rate}%</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-slate-600">Repayment Period</p>
                <p className="font-semibold text-slate-900">{loan.repayment_period} {loan.repayment_unit || 'months'}</p>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-sm text-slate-600 mb-1">Payment Amount</p>
              <p className="font-bold text-slate-900">
                ${loan.payment_amount?.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 capitalize">{loan.payment_frequency}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-sm text-slate-600 mb-1">Total Amount Due</p>
              <p className="font-bold text-slate-900">
                ${loan.total_amount?.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Repayment Progress */}
          {loan.status === 'active' && (
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="flex justify-between mb-2">
                <p className="text-sm font-medium text-slate-700">Repayment Progress</p>
                <p className="text-sm font-semibold text-slate-900">
                  {progressPercentage.toFixed(1)}%
                </p>
              </div>
              <Progress value={progressPercentage} className="h-3" />
              <p className="text-xs text-slate-600 mt-2">
                ${(loan.amount_paid || 0).toLocaleString()} / ${loan.total_amount?.toLocaleString()}
              </p>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            {loan.next_payment_date && (
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-sm text-slate-600">Next Payment</p>
                  <p className="font-semibold text-slate-900">
                    {format(toLocalDate(loan.next_payment_date), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            )}
            {loan.due_date && (
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-slate-600" />
                <div>
                  <p className="text-sm text-slate-600">Due Date</p>
                  <p className="font-semibold text-slate-900">
                    {format(toLocalDate(loan.due_date), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sign Agreement Button */}
          {needsSignature && loan.status === 'active' && (
            <div className="flex justify-center">
              <Button
                onClick={() => setShowSignModal(true)}
                className="bg-green-600 hover:bg-green-700 gap-2"
              >
                <Pencil className="w-4 h-4" />
                Sign Agreement
              </Button>
            </div>
          )}

          {/* Cancel Loan Button */}
          {type === 'lent' && loan.status === 'active' && user?.id === loan.lender_id && onCancel && (
            <div className="flex justify-end">
              <Button
                onClick={onCancel}
                variant="destructive"
                size="sm"
              >
                Cancel Loan
              </Button>
            </div>
          )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showSignModal && (
        <SignatureModal
          isOpen={showSignModal}
          onClose={() => setShowSignModal(false)}
          onSign={handleSign}
          loanDetails={loan}
          userFullName={user?.full_name}
          signingAs={type === 'lent' ? 'Lender' : 'Borrower'}
        />
      )}
    </>
  );
}
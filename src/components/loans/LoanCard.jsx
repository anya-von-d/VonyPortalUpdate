import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, DollarSign, Percent, Clock, Send, CircleDollarSign } from "lucide-react";
import { PublicProfile } from "@/entities/all";
import { format } from "date-fns";
import { daysUntil as daysUntilDate } from "@/components/utils/dateUtils";
import UserAvatar from "@/components/ui/UserAvatar";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  active: "bg-green-100 text-green-800 border-green-200",
  completed: "bg-blue-100 text-blue-800 border-blue-200",
  defaulted: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-gray-100 text-gray-800 border-gray-200",
  declined: "bg-gray-100 text-gray-800 border-gray-200"
};

const getStatusLabel = (loan) => {
  if (loan.status === 'declined') {
    if (loan.declined_by === 'borrower') {
      return 'Inactive Loan: Denied by Borrower';
    } else if (loan.declined_by === 'lender') {
      return 'Inactive Loan: Denied by Lender';
    }
    return 'Declined';
  }
  return loan.status.charAt(0).toUpperCase() + loan.status.slice(1);
};

export default function LoanCard({ loan, type, onMakePayment, onDetails }) {
  const [otherUser, setOtherUser] = useState(null);
  
  useEffect(() => {
    const fetchOtherUser = async () => {
      try {
        const otherUserId = type === 'borrowed' ? loan.lender_id : loan.borrower_id;
        const profiles = await PublicProfile.list();
        const profile = profiles.find(p => p.user_id === otherUserId);
        setOtherUser(profile);
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };
    
    fetchOtherUser();
  }, [loan.id, type, loan.lender_id, loan.borrower_id]);
  const progressPercentage = loan.total_amount > 0 
    ? ((loan.amount_paid || 0) / loan.total_amount) * 100 
    : 0;

  const daysUntil = loan.next_payment_date ? daysUntilDate(loan.next_payment_date) : null;
  const isOverdue = daysUntil !== null && daysUntil < 0;

  return (
    <Card className="bg-white border-slate-200/60 hover:shadow-md transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex flex-col gap-4">
          {/* Header with user info and amount */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserAvatar name={otherUser?.full_name || otherUser?.username} src={otherUser?.profile_picture_url} size={40} />
              <div className="flex flex-col">
                <h3 className="font-semibold text-slate-800">
                  {otherUser?.full_name || 'Loading...'}
                </h3>
                <p className="text-xs text-slate-500">
                  {type === 'borrowed' ? 'Lender' : 'Borrower'}: @{otherUser?.username}
                </p>
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-800">
              ${loan.amount?.toLocaleString()}
            </p>
          </div>

          {/* Repayment Progress for active loans */}
          {loan.status === 'active' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Repayment Progress</span>
                <span className="font-medium">
                  ${(loan.amount_paid || 0).toLocaleString()} / ${loan.total_amount?.toLocaleString()}
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          )}

          {/* Next Payment Date */}
          {loan.status === 'active' && loan.next_payment_date && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className={`w-4 h-4 ${isOverdue ? 'text-red-600' : 'text-orange-600'}`} />
              <span className={`text-slate-700 ${isOverdue ? 'text-red-600 font-semibold' : ''}`}>
                {isOverdue
                  ? `Overdue by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''}`
                  : `Payment due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`
                }
              </span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={onDetails}
              variant="outline"
              className="flex-1"
            >
              Details
            </Button>
            {loan.status === 'active' && onMakePayment && (
              <Button
                onClick={onMakePayment}
                className="flex-1 bg-green-600 hover:bg-green-700 font-semibold"
              >
                <CircleDollarSign className="w-4 h-4 mr-2" />
                Record Payment
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
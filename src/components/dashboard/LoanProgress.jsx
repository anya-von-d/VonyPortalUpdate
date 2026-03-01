import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { formatMoney } from "@/components/utils/formatMoney";

export default function LoanProgress({ loans, userId }) {
  const lentLoans = loans.filter(l => l.lender_id === userId && l.status === 'active');
  const borrowedLoans = loans.filter(l => l.borrower_id === userId && l.status === 'active');

  const totalLent = lentLoans.reduce((sum, loan) => sum + (loan.total_amount || 0), 0);
  const lentPaid = lentLoans.reduce((sum, loan) => sum + (loan.amount_paid || 0), 0);
  const lentProgress = totalLent > 0 ? (lentPaid / totalLent) * 100 : 0;

  const totalBorrowed = borrowedLoans.reduce((sum, loan) => sum + (loan.total_amount || 0), 0);
  const borrowedPaid = borrowedLoans.reduce((sum, loan) => sum + (loan.amount_paid || 0), 0);
  const borrowedProgress = totalBorrowed > 0 ? (borrowedPaid / totalBorrowed) * 100 : 0;

  return (
    <Card className="bg-[#DBFFEB] backdrop-blur-sm border-0 h-full">
      <CardHeader className="pb-4 pt-4 px-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-green-600" />
          </div>
          Loan Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-2 px-4 pb-6">
        {/* Lending Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-green-600" />
              <span className="font-medium text-slate-700 text-sm">Total You Have Lent</span>
            </div>
            <span className="text-xs text-slate-600">
              {formatMoney(lentPaid)} / {formatMoney(totalLent)}
            </span>
          </div>
          <div className="w-full h-2 bg-white rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
              style={{ width: `${lentProgress}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 text-right">
            {lentProgress.toFixed(1)}% repaid
          </p>
        </div>

        {/* Borrowing Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-3 h-3" style={{color: '#347571'}} />
              <span className="font-medium text-slate-700 text-sm">Total You Have Borrowed</span>
            </div>
            <span className="text-xs text-slate-600">
              {formatMoney(borrowedPaid)} / {formatMoney(totalBorrowed)}
            </span>
          </div>
          <div className="w-full h-2 bg-white rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r transition-all duration-500"
              style={{ width: `${borrowedProgress}%`, backgroundImage: 'linear-gradient(to right, #347571, #2d6360)' }}
            />
          </div>
          <p className="text-xs text-slate-500 text-right">
            {borrowedProgress.toFixed(1)}% repaid
          </p>
        </div>
      </CardContent>
    </Card>
  );
}